// Le garde du roi passe au fond de la scène. Tout le monde se cache, le feu se réduit en braises,
// puis tout revient quand il est parti. Il ne touche jamais aux vies ni à la progression.
import type { Manifeste } from '../lib/contenu/manifeste';
import { Sprite } from './sprite';
import { GARDE, SCENE } from './reglages';

const CLE_DERNIER = 'sinople-garde-dernier';
const CLE_BUCHES = 'sinople-scene-buches';

type Stock = Pick<Storage, 'getItem' | 'setItem'> | null;
const lire = (s: Stock, k: string) => {
  try {
    return s?.getItem(k) ?? null;
  } catch {
    return null;
  }
};
const ecrire = (s: Stock, k: string, v: string) => {
  try {
    s?.setItem(k, v);
  } catch {
    /* rien */
  }
};

/**
 * Le garde doit-il passer ? À l'ouverture (avec une probabilité), ou au retour d'une leçon où une bûche a brûlé,
 * et jamais deux fois en moins de `intervalle_min_minutes`. Retient aussi le nombre de bûches vues.
 */
export function gardeDoitPasser(
  m: Manifeste,
  buches: number,
  maintenant: number,
  stockage: Stock,
  session: Stock,
  hasard = Math.random(),
): boolean {
  const avant = lire(session, CLE_BUCHES);
  ecrire(session, CLE_BUCHES, String(buches));
  const dernier = Number(lire(stockage, CLE_DERNIER) ?? 0);
  if (maintenant - dernier < m.garde.intervalle_min_minutes * 60_000) return false;
  const bucheBrulee = m.garde.apres_buche_brulee && avant !== null && buches < Number(avant);
  const ouverture = avant === null && hasard < m.garde.a_l_ouverture;
  if (!bucheBrulee && !ouverture) return false;
  ecrire(stockage, CLE_DERNIER, String(maintenant));
  return true;
}

export type Garde = { el: HTMLElement; x: number; actif: boolean; fin: number };

export function creerGarde(m: Manifeste): Garde {
  const s = new Sprite(m.assets.garde, 'garde', '#4a4a62');
  const el = document.createElement('div');
  el.className = 'garde';
  el.append(s.el);
  el.style.position = 'absolute';
  el.style.left = '0';
  el.style.top = `${GARDE.y - m.assets.garde.hauteur}px`;
  el.style.zIndex = '10';
  el.hidden = true;
  return { el, x: -40, actif: false, fin: SCENE.largeur + 40 };
}

/** Avance le garde ; renvoie la phase pour que la scène cache les animaux et baisse le feu. */
export function avancerGarde(g: Garde, dt: number): 'absent' | 'passe' {
  if (!g.actif) return 'absent';
  g.x += GARDE.vitesse * dt;
  g.el.style.transform = `translateX(${Math.round(g.x)}px)`;
  if (g.x > g.fin) {
    g.actif = false;
    g.el.hidden = true;
    return 'absent';
  }
  return 'passe';
}

export function lancerGarde(g: Garde): void {
  g.x = -40;
  g.actif = true;
  g.el.hidden = false;
}
