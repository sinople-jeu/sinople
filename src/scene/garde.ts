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
  x: number;
  /** 1 = vers la droite, -1 = vers la gauche. */
  sens: 1 | -1;
  actif: boolean;
  fin: number;
  t: number;
};

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
  el.style.top = `${GARDE.y - a.hauteur}px`;
  el.style.zIndex = '10';
  el.hidden = true;
  return { el, retourne, corps, lanterne, lueur, x: -60, sens: 1, actif: false, fin: SCENE.largeur + 60, t: 0 };
}

/** Avance le garde ; renvoie la phase pour que la scène cache les animaux et baisse le feu. */
export function avancerGarde(g: Garde, dt: number): 'absent' | 'passe' {
  if (!g.actif) return 'absent';
  g.t += dt;
  g.x += GARDE.vitesse * dt * g.sens;
  // Un pas : le corps se soulève d'un ou deux pixels, la lanterne balance à contretemps, la flamme vacille.
  const pas = g.t * GARDE.pasParSeconde * Math.PI;
  const levee = Math.round(Math.abs(Math.sin(pas)) * GARDE.levee);
  g.corps.style.transform = `translateY(${-levee}px)`;
  if (g.lanterne) g.lanterne.style.transform = `rotate(${(Math.sin(pas - 0.6) * GARDE.balancement).toFixed(1)}deg)`;
  if (g.lueur) {
    const v = 0.5 + 0.5 * Math.sin(g.t * 13) * Math.sin(g.t * 5.3 + 1);
    g.lueur.style.opacity = (0.55 + 0.35 * v).toFixed(2);
    g.lueur.style.transform = `translate(${Math.round(Math.sin(pas - 0.6) * 2)}px, ${-levee}px)`;
  }
  g.el.style.transform = `translateX(${Math.round(g.x)}px)`;
  if ((g.sens === 1 && g.x > g.fin) || (g.sens === -1 && g.x < g.fin)) {
    g.actif = false;
    g.el.hidden = true;
    return 'absent';
  }
  return 'passe';
}

/**
 * Le garde traverse ce que l'écran montre, d'un bord à l'autre (gauche et droite en x du monde),
 * dans un sens tiré au hasard. Son dessin regarde à gauche : on le retourne pour aller à droite.
 */
export function lancerGarde(g: Garde, gauche = 0, droite = SCENE.largeur, sens: 1 | -1 = Math.random() < 0.5 ? 1 : -1): void {
  const l = g.el.offsetWidth || 60;
  g.sens = sens;
  g.x = sens === 1 ? gauche - l - 10 : droite + 10;
  g.fin = sens === 1 ? droite + 10 : gauche - l - 10;
  g.t = 0;
  g.retourne.style.transform = sens === 1 ? 'scaleX(-1)' : '';
  g.actif = true;
  g.el.hidden = false;
}
