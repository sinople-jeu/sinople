-- Comptes des joueurs : profil (pseudo, ligue) et progression synchronisée entre appareils.
-- Données minimales (RGPD) : un pseudo, l'e-mail seulement si le joueur lie son compte (géré par Supabase Auth),
-- la progression du jeu. Supprimer le compte efface tout (on delete cascade).

create table if not exists public.profils (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text not null unique
    check (char_length(pseudo) between 3 and 20 and pseudo ~ '^[[:alnum:]À-ÿ _-]+$'),
  ligue smallint not null default 1 check (ligue between 1 and 7),
  cree_le timestamptz not null default now()
);

create table if not exists public.progressions (
  joueur uuid primary key references auth.users (id) on delete cascade,
  etat jsonb not null check (pg_column_size(etat) < 300000),
  maj timestamptz not null default now()
);

alter table public.profils enable row level security;
alter table public.progressions enable row level security;

-- Chacun ne voit et ne modifie que ses propres lignes. Le pseudo est le seul champ modifiable du profil.
drop policy if exists "profil : lire le sien" on public.profils;
create policy "profil : lire le sien" on public.profils for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profil : changer son pseudo" on public.profils;
create policy "profil : changer son pseudo" on public.profils for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke insert, update, delete on public.profils from anon, authenticated;
grant select on public.profils to authenticated;
grant update (pseudo) on public.profils to authenticated;

drop policy if exists "progression : la sienne" on public.progressions;
create policy "progression : la sienne" on public.progressions for all to authenticated
  using ((select auth.uid()) = joueur) with check ((select auth.uid()) = joueur);
grant select, insert, update on public.progressions to authenticated;

-- Un profil est créé avec chaque compte (anonyme compris), avec un pseudo provisoire.
create or replace function public.creer_profil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profils (id, pseudo)
  values (new.id, 'Goupil-' || substr(replace(new.id::text, '-', ''), 1, 6))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists creer_profil on auth.users;
create trigger creer_profil after insert on auth.users for each row execute function public.creer_profil();
revoke execute on function public.creer_profil() from public, anon, authenticated;

-- La suppression du compte passe par la fonction serveur supabase/functions/supprimer-compte
-- (elle efface l'utilisateur, donc profil, progression, scores et ligues, grâce aux « on delete cascade »).
