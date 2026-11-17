// Les migrations Supabase (comptes, scores, ligues) jouées dans un Postgres local (PGlite), sans toucher au vrai projet.
import { describe, expect, it, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
const id = (i: number) => '00000000-0000-0000-0000-' + String(i).padStart(12, '0');
const rows = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows;
async function enTantQue(i: number) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${id(i)}"}', false);`);
}

beforeAll(async () => {
  // Ce que Supabase fournit d'office : le schéma auth, les rôles, auth.uid().
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid $$;
    grant usage on schema auth, public to authenticated, anon;
  `);
  for (const f of ['0003_comptes.sql', '0004_ligues.sql']) await db.exec(readFileSync(`supabase/migrations/${f}`, 'utf8'));
  for (let i = 1; i <= 40; i++) await db.query('insert into auth.users (id) values ($1)', [id(i)]);
  for (let i = 1; i <= 40; i++) await db.query('select public.ajouter_points_ligue($1, $2)', [id(i), i * 10]);
}, 60_000);

describe('comptes et ligues (SQL)', () => {
  it('chaque compte a un profil, même quand le pseudo provisoire est déjà pris', async () => {
    const p = await rows<{ pseudo: string }>('select pseudo from public.profils order by pseudo');
    expect(p).toHaveLength(40);
    expect(new Set(p.map((x) => x.pseudo)).size).toBe(40);
  });

  it('les groupes ne dépassent pas 30 joueurs', async () => {
    const g = await rows<{ n: number }>('select count(*)::int n from public.membres group by groupe order by 1 desc');
    expect(g.map((x) => x.n)).toEqual([30, 10]);
  });

  it('le classement ne montre que son groupe ; impossible de tricher depuis le navigateur', async () => {
    await enTantQue(3);
    const cl = await rows<{ rang: number; moi: boolean; points: number }>('select * from public.classement()');
    expect(cl).toHaveLength(30);
    expect(cl[0].points).toBe(300);
    expect(cl.find((x) => x.moi)?.rang).toBe(28);
    await expect(db.query('select public.ajouter_points_ligue($1, 9999)', [id(3)])).rejects.toThrow(/permission/);
    await expect(db.query('update public.profils set ligue = 7')).rejects.toThrow(/permission/);
    expect(await rows('select * from public.profils')).toHaveLength(1);
    expect(await rows('select * from public.progressions')).toHaveLength(0);
    await db.exec('reset role');
  });

  it('en fin de semaine, les 7 premiers montent ; la clôture ne se fait qu’une fois', async () => {
    await db.exec('update public.groupes set semaine = semaine - 7');
    expect((await rows<{ n: number }>('select public.cloturer_ligues() n'))[0].n).toBe(2);
    expect((await rows<{ n: number }>('select public.cloturer_ligues() n'))[0].n).toBe(0);
    const l2 = await rows<{ j: number }>(`select right(id::text, 2)::int j from public.profils where ligue = 2 order by 1`);
    expect(l2.map((x) => x.j)).toEqual([24, 25, 26, 27, 28, 29, 30, 34, 35, 36, 37, 38, 39, 40]);
  });

  it('les 5 derniers descendent', async () => {
    // Semaine suivante : les 14 joueurs de ligue 2 jouent, le groupe est clos.
    for (const [k, i] of [24, 25, 26, 27, 28, 29, 30, 34, 35, 36, 37, 38, 39, 40].entries()) await db.query('select public.ajouter_points_ligue($1, $2)', [id(i), 100 + k]);
    await db.exec('update public.groupes set semaine = semaine - 7 where not cloture');
    await db.query('select public.cloturer_ligues()');
    const parLigue = await rows<{ ligue: number; n: number }>('select ligue, count(*)::int n from public.profils group by ligue order by ligue');
    expect(parLigue).toEqual([{ ligue: 1, n: 26 + 5 }, { ligue: 2, n: 2 }, { ligue: 3, n: 7 }]);
  });

  it('supprimer le compte efface profil, scores et ligues', async () => {
    await db.query('delete from auth.users where id = $1', [id(40)]);
    const r = await rows<{ p: number; m: number }>('select (select count(*) from public.profils where id = $1)::int p, (select count(*) from public.membres where joueur = $1)::int m', [id(40)]);
    expect(r[0]).toEqual({ p: 0, m: 0 });
  });
});
