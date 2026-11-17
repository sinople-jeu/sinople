// Contenu distant : au lancement, on compare la version du manifeste en cache à celle publiée,
// on ne télécharge que les fichiers qui ont changé, puis on met tout en cache.
// Si quelque chose échoue (réseau, manifeste mal formé, image manquante), on garde le contenu précédent :
// rien ne plante, la progression n'est jamais touchée.
import { validerManifeste, type Manifeste } from './manifeste';

export const CLE_MANIFESTE = 'sinople-manifeste';
export const CACHE_CONTENU = 'sinople-contenu';
/** Pour essayer un autre manifeste sans redéployer (tests, préparation d'une mise à jour). */
export const CLE_URL_ESSAI = 'sinople-contenu-url';

export type Magasin = { lire: (cle: string) => string | null; ecrire: (cle: string, valeur: string) => void };
export type CacheFichiers = { a: (url: string) => Promise<boolean>; mettre: (url: string, reponse: Response) => Promise<void> };
export type Telecharger = (url: string, init?: RequestInit) => Promise<Response>;

export type Resultat = {
  manifeste: Manifeste;
  source: 'distant' | 'cache' | 'embarque';
  /** Fichiers téléchargés cette fois-ci. */
  telecharges: string[];
  erreur?: string;
};

/** Adresse complète d'un fichier du manifeste (les chemins relatifs partent du dossier du manifeste). */
export function resoudre(src: string, urlManifeste: string): string {
  if (/^https?:\/\//.test(src) || src.startsWith('/')) return src;
  return new URL(src, urlManifeste).href;
}

/** Le manifeste en cache s'il est valide, sinon celui embarqué dans le site. */
export function manifesteLocal(magasin: Magasin | null, embarque: Manifeste): { manifeste: Manifeste; source: 'cache' | 'embarque' } {
  try {
    const brut = magasin?.lire(CLE_MANIFESTE);
    const m = brut ? validerManifeste(JSON.parse(brut)) : null;
    if (m) return { manifeste: m, source: 'cache' };
  } catch {
    /* cache illisible : on repart du contenu embarqué */
  }
  return { manifeste: embarque, source: 'embarque' };
}

/** Les fichiers (images, leçons) d'un manifeste, avec leur empreinte. */
function fichiers(m: Manifeste, url: string): Map<string, string> {
  const f = new Map<string, string>();
  for (const a of Object.values(m.assets)) if (a.src && !a.src.startsWith('/')) f.set(resoudre(a.src, url), a.hash ?? a.src);
  for (const l of m.lecons) f.set(resoudre(l.src, url), l.hash ?? l.src);
  return f;
}

export async function synchroniserContenu(options: {
  urlManifeste: string;
  embarque: Manifeste;
  magasin: Magasin | null;
  cache: CacheFichiers | null;
  telecharger: Telecharger;
  delaiMs?: number;
}): Promise<Resultat> {
  const { urlManifeste, embarque, magasin, cache, telecharger } = options;
  const local = manifesteLocal(magasin, embarque);
  const garder = (erreur?: string): Resultat => ({ ...local, telecharges: [], erreur });
  if (!urlManifeste) return garder();

  let distant: Manifeste | null;
  try {
    const r = await avecDelai(telecharger(urlManifeste, { cache: 'no-cache' }), options.delaiMs ?? 6000);
    if (!r.ok) return garder(`manifeste : ${r.status}`);
    distant = validerManifeste(await r.json());
  } catch (e) {
    return garder(`manifeste injoignable (${(e as Error).message})`);
  }
  if (!distant) return garder('manifeste mal formé : contenu précédent gardé');
  if (local.source === 'cache' && distant.version === local.manifeste.version) return garder();

  // Seulement ce qui a changé depuis la version en cache.
  const avant = local.source === 'cache' ? fichiers(local.manifeste, urlManifeste) : new Map<string, string>();
  const telecharges: string[] = [];
  try {
    for (const [url, empreinte] of fichiers(distant, urlManifeste)) {
      if (avant.get(url) === empreinte && (!cache || (await cache.a(url)))) continue;
      const r = await avecDelai(telecharger(url), options.delaiMs ?? 6000);
      if (!r.ok) throw new Error(`${url} : ${r.status}`);
      await cache?.mettre(url, r);
      telecharges.push(url);
    }
  } catch (e) {
    // Un fichier manque : on ne passe pas à la nouvelle version, pour ne jamais montrer un contenu à moitié.
    return garder(`téléchargement interrompu (${(e as Error).message})`);
  }
  try {
    magasin?.ecrire(CLE_MANIFESTE, JSON.stringify(distant));
  } catch {
    /* stockage plein : la nouvelle version servira pour cette fois seulement */
  }
  return { manifeste: distant, source: 'distant', telecharges };
}

function avecDelai<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error('délai dépassé')), ms);
    p.then(
      (v) => (clearTimeout(t), ok(v)),
      (e) => (clearTimeout(t), ko(e)),
    );
  });
}
