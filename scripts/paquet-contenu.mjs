// Fabrique le paquet de contenu distant dans le dossier contenu/ :
//   manifest.json (versionné), lecons/<thème>/<id>.json, assets/<nom>-<empreinte>.<ext>
// à partir de src/data/themes.json, src/data/scene.json, src/content/questions/ et des images de public/.
// Ajouter un thème, un animal ou un événement = modifier ces données, puis `npm run publier-contenu` :
// le site déjà en ligne le récupère au prochain lancement, sans redéploiement.
//
// Usage : node scripts/paquet-contenu.mjs [dossier de sortie]
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative, sep } from 'node:path';

const sortie = process.argv[2] ?? 'contenu';
const empreinte = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 12);
const sansAccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function fabriquerPaquet(racine = '.', dossier = sortie) {
  const themes = JSON.parse(readFileSync(join(racine, 'src/data/themes.json'), 'utf8'));
  const scene = JSON.parse(readFileSync(join(racine, 'src/data/scene.json'), 'utf8'));
  rmSync(join(racine, dossier), { recursive: true, force: true });
  mkdirSync(join(racine, dossier, 'assets'), { recursive: true });

  // Images : copiées avec leur empreinte dans le nom (un fichier modifié = une nouvelle adresse).
  const assets = {};
  for (const [id, a] of Object.entries(scene.assets)) {
    if (!a.src || !a.src.startsWith('/')) {
      assets[id] = a;
      continue;
    }
    const fichier = join(racine, 'public', a.src);
    const buf = readFileSync(fichier);
    const h = empreinte(buf);
    const nom = `${basename(a.src, extname(a.src))}-${h}${extname(a.src)}`;
    cpSync(fichier, join(racine, dossier, 'assets', nom));
    assets[id] = { ...a, src: `assets/${nom}`, hash: h, octets: buf.length };
  }

  // Leçons : une par fichier, avec son empreinte.
  const dossierQuestions = join(racine, 'src/content/questions');
  const lister = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? lister(join(d, e.name)) : e.name.endsWith('.json') ? [join(d, e.name)] : []));
  const lecons = lister(dossierQuestions).map((f) => {
    const buf = readFileSync(f);
    const l = JSON.parse(buf.toString('utf8'));
    const chemin = `lecons/${relative(dossierQuestions, f).split(sep).join('/')}`;
    mkdirSync(join(racine, dossier, chemin, '..'), { recursive: true });
    writeFileSync(join(racine, dossier, chemin), buf);
    return { id: l.id, theme: l.theme, etape: l.etape, lecon: l.lecon, titre: l.titre, epreuve: !!l.epreuve, src: chemin, hash: empreinte(buf) };
  }).sort((a, b) => a.id.localeCompare(b.id));

  const corps = { ...scene, themes: themes.map((t) => ({ ...t, animal: sansAccent(t.animal) })), assets, lecons };
  const version = `${new Date().toISOString().slice(0, 10)}.${empreinte(JSON.stringify({ ...corps, version: '' }))}`;
  const manifeste = { ...corps, version };
  writeFileSync(join(racine, dossier, 'manifest.json'), JSON.stringify(manifeste, null, 1));
  return manifeste;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = fabriquerPaquet();
  console.log(`Paquet prêt dans ${sortie}/ : version ${m.version}, ${m.lecons.length} leçons, ${Object.keys(m.assets).length} images.`);
}
