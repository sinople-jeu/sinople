// Fin d'une leçon, validée par le serveur : il relit la leçon, corrige lui-même les réponses brutes du joueur
// (même code que le navigateur, voir jeu.js), applique les garde-fous, enregistre le score et ajoute les points
// à la ligue de la semaine. Le navigateur n'envoie jamais de score, seulement ses réponses.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corrigerLecon, partieCredible, serieDepuisJours, jourParis, regles } from './jeu.js';

/** Où lire les leçons : le contenu distant d'abord (manifeste), sinon le site. */
const SITE = Deno.env.get('SINOPLE_SITE') ?? 'https://sinople-jeu.github.io/sinople';
const entetes = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const reponse = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...entetes, 'content-type': 'application/json' } });

type Lecon = { id: string; theme: string; epreuve?: boolean; questions: { id: string; type: string }[] };

async function lireLecon(url: string, id: string): Promise<Lecon | null> {
  const contenu = `${url}/storage/v1/object/public/contenu/`;
  try {
    const m = await fetch(`${contenu}manifest.json`);
    if (m.ok) {
      const l = ((await m.json()).lecons ?? []).find((x: { id: string }) => x.id === id);
      if (l?.src) {
        const r = await fetch(contenu + l.src);
        if (r.ok) return await r.json();
      }
    }
  } catch { /* on essaie le site */ }
  try {
    const r = await fetch(`${SITE}/lecons/${encodeURIComponent(id)}.json`);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: entetes });
  if (req.method !== 'POST') return reponse({ erreur: 'méthode' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  const jeton = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: qui } = await admin.auth.getUser(jeton);
  if (!qui.user) return reponse({ erreur: 'non connecté' }, 401);
  const joueur = qui.user.id;

  const corps = await req.json().catch(() => null);
  const id = typeof corps?.lecon === 'string' ? corps.lecon : '';
  const duree = Number(corps?.duree_ms);
  const brutes = corps?.brutes && typeof corps.brutes === 'object' && !Array.isArray(corps.brutes) ? corps.brutes : null;
  if (!/^[a-z0-9-]{1,80}$/.test(id) || !Number.isFinite(duree) || duree < 0 || !brutes) return reponse({ erreur: 'requête invalide' }, 400);
  if (JSON.stringify(brutes).length > 20000) return reponse({ erreur: 'trop long' }, 413);

  const lecon = await lireLecon(url, id);
  if (!lecon || !Array.isArray(lecon.questions)) return reponse({ erreur: 'leçon inconnue' }, 404);
  const nb = lecon.questions.filter((q) => q.type !== 'carte').length;
  if (!nb) return reponse({ erreur: 'leçon vide' }, 400);

  // Garde-fous : partie trop rapide pour avoir été lue, ou trop de parties en une heure. Le score n'est pas compté.
  if (!partieCredible(nb, duree)) return reponse({ compte: false, raison: 'trop rapide' });
  const uneHeure = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin.from('scores').select('id', { count: 'exact', head: true }).eq('joueur', joueur).gte('cree_le', uneHeure);
  if ((count ?? 0) >= regles.garde_fous.parties_max_par_heure) return reponse({ compte: false, raison: 'trop de parties' });

  // Série : recalculée d'après les jours où le joueur a déjà terminé une leçon (60 derniers jours).
  const depuis = new Date(Date.now() - 60 * 86400_000).toISOString();
  const { data: anciens } = await admin.from('scores').select('cree_le').eq('joueur', joueur).gte('cree_le', depuis);
  const aujourdhui = jourParis(Date.now());
  const jours = (anciens ?? []).map((s: { cree_le: string }) => jourParis(new Date(s.cree_le)));
  const joursSerie = serieDepuisJours(jours, aujourdhui);

  const { bilan } = corrigerLecon(lecon as Parameters<typeof corrigerLecon>[0], brutes, joursSerie);
  const ins = await admin.from('scores').insert({
    joueur, lecon: id, theme: String(lecon.theme).slice(0, 40), bonnes: bilan.bonnes, total: bilan.total,
    points: bilan.totalPoints, reussie: bilan.reussie, duree_ms: Math.min(Math.round(duree), 2_000_000_000),
  });
  if (ins.error) return reponse({ erreur: ins.error.message }, 500);
  const ligue = await admin.rpc('ajouter_points_ligue', { j: joueur, pts: bilan.totalPoints });
  return reponse({ compte: true, bilan, joursSerie, groupe: ligue.data ?? null });
});
