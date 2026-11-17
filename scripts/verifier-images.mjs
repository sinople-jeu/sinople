// Vérifie que chaque image de question (un tableau…) répond bien : lancé en CI, car il faut Internet.
// Usage : node scripts/verifier-images.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dossier = 'src/content/questions';
const images = readdirSync(dossier, { recursive: true })
  .filter((f) => String(f).endsWith('.json'))
  .flatMap((f) => (JSON.parse(readFileSync(join(dossier, String(f)), 'utf8')).questions ?? [])
    .filter((q) => q.image?.src?.startsWith('https://'))
    .map((q) => ({ fichier: String(f), id: q.id, src: q.image.src })));

const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));
// Wikimedia limite le débit (HTTP 429) : on attend ce qu'il demande (Retry-After), puis on réessaie, 4 fois au plus.
async function demander(src) {
  for (let essai = 0; ; essai++) {
    const r = await fetch(src, { redirect: 'follow', headers: { 'User-Agent': 'SinopleQuiz/1.0 (verification des images)' } });
    if (r.status !== 429 || essai >= 4) return r;
    await r.body?.cancel();
    const attente = Number(r.headers.get('retry-after'));
    await pause(Number.isFinite(attente) && attente > 0 ? Math.min(attente, 30) * 1000 : 2000 * 2 ** essai);
  }
}

let erreurs = 0;
let limitees = 0;
for (const { fichier, id, src } of images) {
  let message = '';
  try {
    const r = await demander(src);
    const type = r.headers.get('content-type') ?? '';
    if (r.status === 429) {
      // Toujours limité après les essais : le serveur répond, l'image existe ; on le signale sans faire échouer la vérification.
      limitees++;
      console.warn(`⚠ ${fichier} › ${id} : débit limité par le serveur (HTTP 429), non vérifiée\n  ${src}`);
      await r.body?.cancel();
      await pause(300);
      continue;
    }
    if (!r.ok) message = `HTTP ${r.status}`;
    else if (!type.startsWith('image/')) message = `ce n'est pas une image (${type})`;
    await r.body?.cancel();
  } catch (e) {
    message = String(e);
  }
  if (message) {
    erreurs++;
    console.error(`✗ ${fichier} › ${id} : ${message}\n  ${src}`);
  } else console.log(`✓ ${fichier} › ${id}`);
  await pause(300); // une demande à la fois, sans presser le serveur
}
console.log(`${images.length} image(s), ${erreurs} en erreur, ${limitees} non vérifiée(s) (débit limité).`);
process.exit(erreurs ? 1 : 0);
