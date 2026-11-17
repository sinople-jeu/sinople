// Envoie le dossier contenu/ dans le stockage Supabase (seau public « contenu »).
// Le manifeste part en dernier : un joueur ne voit jamais un manifeste qui pointe vers un fichier pas encore envoyé.
//
// Il faut deux variables d'environnement (jamais écrites dans le dépôt) :
//   SUPABASE_URL          ex. https://liufarqsfatjrqkhvzhn.supabase.co
//   SUPABASE_SECRET_KEY   la clé secrète (Supabase > Project Settings > API Keys), à garder pour soi
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

const url = process.env.SUPABASE_URL;
const cle = process.env.SUPABASE_SECRET_KEY;
if (!url || !cle) {
  console.error('Il manque SUPABASE_URL ou SUPABASE_SECRET_KEY (voir le haut de ce fichier).');
  process.exit(1);
}
const dossier = process.argv[2] ?? 'contenu';
const types = { '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
const lister = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? lister(join(d, e.name)) : [join(d, e.name)]));

async function envoyer(fichier) {
  const chemin = relative(dossier, fichier).split(sep).join('/');
  const manifeste = chemin === 'manifest.json';
  const r = await fetch(`${url}/storage/v1/object/contenu/${chemin}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${cle}`,
      apikey: cle,
      'content-type': types[extname(fichier)] ?? 'application/octet-stream',
      'x-upsert': 'true',
      // Le manifeste doit être relu à chaque lancement ; les fichiers à empreinte peuvent rester longtemps en cache.
      'cache-control': manifeste ? 'max-age=60' : 'max-age=31536000',
    },
    body: readFileSync(fichier),
  });
  if (!r.ok) throw new Error(`${chemin} : ${r.status} ${await r.text()}`);
  console.log(`envoyé : ${chemin}`);
}

const fichiers = lister(dossier);
for (const f of fichiers.filter((f) => !f.endsWith('manifest.json'))) await envoyer(f);
await envoyer(join(dossier, 'manifest.json'));
console.log('Contenu publié. Les joueurs le recevront à leur prochain lancement.');
