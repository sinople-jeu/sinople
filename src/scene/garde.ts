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

export type Garde = {
  el: HTMLElement;
  /** Le corps (balancement de la marche) et la lanterne (oscillation), dans un calque qu'on retourne selon le sens. */
  retourne: HTMLElement;
  corps: HTMLElement;
  lanterne: HTMLElement | null;
  lueur: HTMLElement | null;
  ancre: [number, number];
  /** Distance parcourue sur le chemin, en pixels. */
  d: number;
  /** 1 = du fond vers la clairière, -1 = de la clairière vers le fond. */
  sens: 1 | -1;
  actif: boolean;
  t: number;
};

/** Longueur du chemin du garde (somme de ses segments). */
const longueur = (c: readonly (readonly [number, number])[]) => c.slice(1).reduce((l, p, i) => l + Math.hypot(p[0] - c[i][0], p[1] - c[i][1]), 0);

/** Le point du chemin à la distance d, et la direction (1 = vers la droite) du segment. */
export function surLeChemin(c: readonly (readonly [number, number])[], d: number): { x: number; y: number; dx: number } {
  for (let i = 1; i < c.length; i++) {
    const [ax, ay] = c[i - 1];
    const [bx, by] = c[i];
    const l = Math.hypot(bx - ax, by - ay);
    if (d <= l || i === c.length - 1) {
      const u = l ? Math.min(1, Math.max(0, d / l)) : 0;
      return { x: ax + (bx - ax) * u, y: ay + (by - ay) * u, dx: Math.sign(bx - ax) };
    }
    d -= l;
  }
  return { x: c[0][0], y: c[0][1], dx: 0 };
}

export function creerGarde(m: Manifeste): Garde {
  const a = m.assets.garde;
  const s = new Sprite(a, 'garde', '#4a4a62');
  const el = document.createElement('div');
  el.className = 'garde';
  const retourne = document.createElement('div');
  retourne.className = 'garde-retourne';
  retourne.style.transformOrigin = `${Math.round(a.largeur / 2)}px 0`;
  const corps = document.createElement('div');
  corps.className = 'garde-corps';
  corps.append(s.el);
  let lanterne: HTMLElement | null = null;
  let lueur: HTMLElement | null = null;
  const al = m.assets['garde-lanterne'];
  if (a.src && al?.src) {
    // La lanterne pend à la main : elle oscille autour de son anneau (le haut de la chaîne).
    lanterne = new Sprite(al, 'lanterne').el;
    lanterne.classList.add('garde-lanterne');
    const [px, py] = al.ancre ?? [Math.round(al.largeur / 2), 0];
    lanterne.style.left = `${GARDE.lanterne.x}px`;
    lanterne.style.top = `${GARDE.lanterne.y}px`;
    lanterne.style.transformOrigin = `${px}px ${py}px`;
    // Sa lueur chaude, qui vacille.
    lueur = document.createElement('div');
    lueur.className = 'garde-lueur';
    const r = GARDE.lueur;
    lueur.style.width = lueur.style.height = `${r * 2}px`;
    lueur.style.left = `${GARDE.lanterne.x + Math.round(al.largeur / 2) - r}px`;
    lueur.style.top = `${GARDE.lanterne.y + Math.round(al.hauteur * 0.6) - r}px`;
    corps.append(lanterne);
  }
  retourne.append(corps);
  if (lueur) retourne.append(lueur);
  el.append(retourne);
  el.style.position = 'absolute';
  el.style.left = '0';
  el.style.top = '0';
  el.style.zIndex = '10';
  el.hidden = true;
  const ancre: [number, number] = a.ancre ?? [Math.round(a.largeur / 2), a.hauteur];
  return { el, retourne, corps, lanterne, lueur, ancre, d: 0, sens: 1, actif: false, t: 0 };
}

/** Avance le garde sur son chemin ; renvoie la phase pour que la scène cache les animaux et baisse le feu. */
export function avancerGarde(g: Garde, dt: number): 'absent' | 'passe' {
  if (!g.actif) return 'absent';
  const total = longueur(GARDE.chemin);
  g.t += dt;
  const parcouru = g.t * GARDE.vitesse;
  g.d = g.sens === 1 ? parcouru : total - parcouru;
  const p = surLeChemin(GARDE.chemin, g.d);
  // Son dessin regarde à gauche : on le retourne quand il va vers la droite.
  const versDroite = p.dx * g.sens > 0;
  g.retourne.style.transform = versDroite ? 'scaleX(-1)' : '';
  // Un pas : le corps se soulève d'un pixel, la lanterne balance à contretemps, la flamme vacille.
  const pas = g.t * GARDE.pasParSeconde * Math.PI;
  const levee = Math.round(Math.abs(Math.sin(pas)) * GARDE.levee);
  g.corps.style.transform = `translateY(${-levee}px)`;
  if (g.lanterne) g.lanterne.style.transform = `rotate(${(Math.sin(pas - 0.6) * GARDE.balancement).toFixed(1)}deg)`;
  if (g.lueur) {
    const v = 0.5 + 0.5 * Math.sin(g.t * 13) * Math.sin(g.t * 5.3 + 1);
    g.lueur.style.opacity = (0.55 + 0.35 * v).toFixed(2);
    g.lueur.style.transform = `translate(${Math.round(Math.sin(pas - 0.6) * 1.5)}px, ${-levee}px)`;
  }
  // Il sort des arbres et y rentre : fondu aux deux bouts du chemin.
  const bord = Math.min(parcouru, total - parcouru) / 14;
  g.el.style.opacity = String(Math.max(0, Math.min(1, bord)));
  g.el.style.transform = `translate(${Math.round(p.x - g.ancre[0])}px, ${Math.round(p.y - g.ancre[1])}px)`;
  if (parcouru >= total) {
    g.actif = false;
    g.el.hidden = true;
    return 'absent';
  }
  return 'passe';
}

/** Le garde suit le chemin de la forêt, dans un sens tiré au hasard. */
export function lancerGarde(g: Garde, sens: 1 | -1 = Math.random() < 0.5 ? 1 : -1): void {
  g.sens = sens;
  g.t = 0;
  g.actif = true;
  g.el.hidden = false;
  avancerGarde(g, 0);
}
