-- Scores validés par le serveur et ligues hebdomadaires.
-- Les scores ne sont écrits que par la fonction serveur terminer-lecon (clé de service) après correction.
-- Ligues : groupes de 30 joueurs de la même ligue, du lundi au dimanche (heure de Paris).
-- En fin de semaine, les 7 premiers montent, les 5 derniers descendent. La clôture se fait « à la demande »
-- (au premier score ou au premier classement de la semaine suivante) : pas besoin de tâche planifiée.
-- 1 Sable, 2 Gueules, 3 Azur, 4 Sinople, 5 Pourpre, 6 Argent, 7 Or.

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  joueur uuid not null references auth.users (id) on delete cascade,
  lecon text not null check (char_length(lecon) between 1 and 80),
  theme text not null check (char_length(theme) between 1 and 40),
  bonnes smallint not null check (bonnes >= 0),
  total smallint not null check (total > 0 and bonnes <= total),
  points integer not null check (points between 0 and 10000),
  reussie boolean not null,
  duree_ms integer not null check (duree_ms >= 0),
  cree_le timestamptz not null default now()
);
create index if not exists scores_joueur_date on public.scores (joueur, cree_le desc);

create table if not exists public.groupes (
  id bigint generated always as identity primary key,
  semaine date not null,
  ligue smallint not null check (ligue between 1 and 7),
  cloture boolean not null default false
);
create index if not exists groupes_semaine on public.groupes (semaine, ligue) where not cloture;

create table if not exists public.membres (
  groupe bigint not null references public.groupes (id) on delete cascade,
  joueur uuid not null references auth.users (id) on delete cascade,
  points integer not null default 0,
  maj timestamptz not null default now(),
  primary key (groupe, joueur)
);
create index if not exists membres_joueur on public.membres (joueur);

alter table public.scores enable row level security;
alter table public.groupes enable row level security;
alter table public.membres enable row level security;

-- Chacun lit ses scores et ses participations (pour « Télécharger mes données »). Personne n'écrit depuis le navigateur.
create policy "scores : les siens" on public.scores for select to authenticated using ((select auth.uid()) = joueur);
create policy "membres : les siens" on public.membres for select to authenticated using ((select auth.uid()) = joueur);
revoke insert, update, delete on public.scores, public.groupes, public.membres from anon, authenticated;
grant select on public.scores, public.membres to authenticated;

-- Lundi de la semaine en cours, à Paris.
create or replace function public.semaine_paris(t timestamptz default now()) returns date
language sql stable set search_path = '' as $$
  select date_trunc('week', (t at time zone 'Europe/Paris'))::date
$$;

-- Clôt les groupes des semaines passées : montées et descentes. Idempotent.
create or replace function public.cloturer_ligues() returns integer
language plpgsql security definer set search_path = '' as $$
declare g record; n integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('sinople-ligues'));
  for g in select id from public.groupes where not cloture and semaine < public.semaine_paris() loop
    with classes as (
      select joueur, points,
             row_number() over (order by points desc, maj asc) as rang,
             count(*) over () as nb
      from public.membres where groupe = g.id
    )
    update public.profils p
       set ligue = case
         when c.rang <= 7 and c.points > 0 then least(7, p.ligue + 1)
         when c.rang > greatest(7, c.nb - 5) then greatest(1, p.ligue - 1)
         else p.ligue end
      from classes c where c.joueur = p.id;
    update public.groupes set cloture = true where id = g.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Ajoute les points d'une leçon validée au groupe de la semaine du joueur (créé ou rejoint au besoin).
create or replace function public.ajouter_points_ligue(j uuid, pts integer) returns bigint
language plpgsql security definer set search_path = '' as $$
declare s date := public.semaine_paris(); l smallint; gid bigint;
begin
  perform public.cloturer_ligues();
  select ligue into l from public.profils where id = j;
  if l is null then
    insert into public.profils (id, pseudo) values (j, public.pseudo_provisoire(j)) on conflict do nothing;
    l := 1;
  end if;
  select m.groupe into gid from public.membres m join public.groupes g on g.id = m.groupe
   where m.joueur = j and g.semaine = s limit 1;
  if gid is null then
    select g.id into gid from public.groupes g
     where g.semaine = s and g.ligue = l and not g.cloture
       and (select count(*) from public.membres m where m.groupe = g.id) < 30
     order by g.id limit 1;
    if gid is null then
      insert into public.groupes (semaine, ligue) values (s, l) returning id into gid;
    end if;
    insert into public.membres (groupe, joueur) values (gid, j);
  end if;
  update public.membres set points = points + greatest(0, pts), maj = now() where groupe = gid and joueur = j;
  return gid;
end $$;

-- Le classement du groupe de la semaine du joueur connecté : pseudo et points seulement.
create or replace function public.classement()
returns table (rang integer, pseudo text, points integer, moi boolean, ligue smallint, semaine date)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  perform public.cloturer_ligues();
  return query
    select (row_number() over (order by m.points desc, m.maj asc))::integer, p.pseudo, m.points,
           m.joueur = auth.uid(), g.ligue, g.semaine
      from public.membres m
      join public.groupes g on g.id = m.groupe
      join public.profils p on p.id = m.joueur
     where m.groupe = (select m2.groupe from public.membres m2 join public.groupes g2 on g2.id = m2.groupe
                        where m2.joueur = auth.uid() and g2.semaine = public.semaine_paris() limit 1)
     order by 1;
end $$;

revoke execute on function public.cloturer_ligues() from public, anon, authenticated;
revoke execute on function public.ajouter_points_ligue(uuid, integer) from public, anon, authenticated;
revoke execute on function public.classement() from public, anon;
grant execute on function public.classement() to authenticated;
grant execute on function public.ajouter_points_ligue(uuid, integer) to service_role;
