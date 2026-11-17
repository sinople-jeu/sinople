// Supprime le compte du joueur qui appelle, et donc toutes ses données (profil, progression, scores, ligues :
// les tables sont reliées au compte avec « on delete cascade »). RGPD : droit à l'effacement.
import { createClient } from 'npm:@supabase/supabase-js@2';

const entetes = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const reponse = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...entetes, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: entetes });
  if (req.method !== 'POST') return reponse({ erreur: 'méthode' }, 405);
  const jeton = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { data, error } = await admin.auth.getUser(jeton);
  if (error || !data.user) return reponse({ erreur: 'non connecté' }, 401);
  const r = await admin.auth.admin.deleteUser(data.user.id);
  if (r.error) return reponse({ erreur: r.error.message }, 500);
  return reponse({ supprime: true });
});
