// Le contenu distant, côté navigateur : où lire le manifeste, où ranger les fichiers (Cache API),
// et comment retrouver une image ou une leçon hors ligne.
import config from '../../data/contenu-distant.json';
import { manifesteEmbarque, type Manifeste, type LeconDistante } from './manifeste';
import { lecon as schemaLecon } from './schema';
import { CACHE_CONTENU, CLE_URL_ESSAI, manifesteLocal, resoudre, synchroniserContenu, type CacheFichiers, type Magasin, type Resultat } from './distant';

export function magasinNavigateur(): Magasin | null {
  try {
    const s = localStorage;
    return { lire: (c) => s.getItem(c), ecrire: (c, v) => s.setItem(c, v) };
  } catch {
    return null;
  }
}

export function cacheNavigateur(): CacheFichiers | null {
  if (typeof caches === 'undefined') return null;
  return {
    a: async (url) => !!(await caches.match(url)),
    mettre: async (url, r) => (await caches.open(CACHE_CONTENU)).put(url, r),
  };
}

export function urlManifeste(): string {
  try {
    return localStorage.getItem(CLE_URL_ESSAI) || config.manifeste;
  } catch {
    return config.manifeste;
  }
}

/** Le contenu à utiliser tout de suite : le dernier téléchargé, sinon celui embarqué. */
export function contenuCourant(): Manifeste {
  return manifesteLocal(magasinNavigateur(), manifesteEmbarque()).manifeste;
}

let enCours: Promise<Resultat> | null = null;
/** Vérifie en arrière-plan s'il y a du nouveau contenu ; il servira au prochain affichage. Une fois par page. */
export function verifierContenu(): Promise<Resultat> {
  enCours ??= synchroniserContenu({
    urlManifeste: urlManifeste(),
    embarque: manifesteEmbarque(),
    magasin: magasinNavigateur(),
    cache: cacheNavigateur(),
    telecharger: (u, i) => fetch(u, i),
    delaiMs: config.delai_secondes * 1000,
  }).catch((e) => ({ manifeste: contenuCourant(), source: 'embarque' as const, telecharges: [], erreur: String(e) }));
  return enCours;
}

/** Adresse utilisable par une image : le fichier en cache (hors ligne), sinon l'adresse distante. */
async function urlFichier(src: string): Promise<string> {
  if (src.startsWith('/')) return src;
  const url = resoudre(src, urlManifeste());
  try {
    const r = typeof caches === 'undefined' ? undefined : await caches.match(url);
    if (r) return URL.createObjectURL(await r.blob());
  } catch {
    /* pas de cache : l'adresse distante */
  }
  return url;
}

/** Le manifeste, avec les images distantes remplacées par leur copie en cache. */
export async function avecFichiersLocaux(m: Manifeste): Promise<Manifeste> {
  const assets = Object.fromEntries(
    await Promise.all(Object.entries(m.assets).map(async ([id, a]) => [id, a.src ? { ...a, src: await urlFichier(a.src) } : a] as const)),
  );
  return { ...m, assets };
}

/** Une leçon publiée à distance : depuis le cache, sinon le réseau ; vérifiée avant d'être jouée. */
export async function lireLeconDistante(l: LeconDistante) {
  const url = resoudre(l.src, urlManifeste());
  let r: Response | undefined;
  try {
    r = typeof caches === 'undefined' ? undefined : await caches.match(url);
  } catch {
    r = undefined;
  }
  r ??= await fetch(url);
  const brut = await r.json();
  const ok = schemaLecon.safeParse(brut);
  if (!ok.success) throw new Error(`Leçon ${l.id} mal formée`);
  return ok.data;
}
