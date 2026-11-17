// Le feu : 6 dessins (0 = braises, 1 à 5 = tailles du feu), son halo, les pierres du foyer à 3 animaux, les bannières à 6.
// Braises quand il n'y a plus de bûches ou quand le garde passe. À l'intro, il s'allume taille après taille.
import type { Manifeste } from '../lib/contenu/manifeste';
import type { VueScene } from '../lib/scene/etat-scene';
import { Sprite } from './sprite';
import { SCENE, FEU } from './reglages';

export type Feu = {
  el: HTMLElement;
  /** Un sprite par taille, de 0 (braises) à 5. */
  tailles: Sprite[];
  halos: Sprite[];
  intensites: number[];
  pierres: HTMLElement;
  bannieres: HTMLElement[];
  /** Taille montrée en ce moment. */
  taille: number;
};

function poser(el: HTMLElement, x: number, y: number, z: number): HTMLElement {
  el.style.position = 'absolute';
  el.style.left = '0';
  el.style.top = '0';
  el.style.transform = `translate(${x}px, ${y}px)`;
  el.style.zIndex = String(z);
  return el;
}

export function creerFeu(m: Manifeste): Feu {
  const el = document.createElement('div');
  el.className = 'feu-de-camp';
  const tailles: Sprite[] = [];
  const halos: Sprite[] = [];
  for (let n = 0; n <= 5; n++) {
    const halo = new Sprite(m.assets[`halo-feu-${n}`] ?? { largeur: 1, hauteur: 1, images: 1, ips: 1, boucle: true }, 'halo');
    const [hx, hy] = halo.ancre;
    poser(halo.el, SCENE.feuX - hx, SCENE.feuY - 20 - hy, 2);
    halo.el.classList.add('halo-feu');
    halo.el.hidden = true;
    const s = new Sprite(m.assets[`feu-${n}`] ?? { largeur: 60, hauteur: 66, images: 1, ips: 1, boucle: true, a_dessiner: `feu taille ${n}` }, `feu ${n}`, '#7a3b1a');
    const [ax, ay] = s.ancre;
    poser(s.el, SCENE.feuX - ax, SCENE.feuY - ay, SCENE.feuY);
    s.el.classList.add('flammes');
    s.el.hidden = true;
    tailles.push(s);
    halos.push(halo);
  }
  const p = m.assets.pierres;
  const pierres = poser(new Sprite(p, 'pierres', '#6b6478').el, SCENE.feuX - p.largeur / 2, SCENE.feuY - p.hauteur + 6, SCENE.feuY + 1);
  if (SCENE.foyerPeint) pierres.dataset.peint = '';
  const ba = m.assets.banniere;
  const bannieres = [SCENE.feuX - 120, SCENE.feuX + 120].map((x) =>
    poser(new Sprite(ba, 'bannière', '#2f7d4a').el, x - ba.largeur / 2, SCENE.feuY - 30 - ba.hauteur, SCENE.feuY - 30),
  );
  el.append(...halos.map((h) => h.el), ...tailles.map((t) => t.el), pierres, ...bannieres);
  return { el, tailles, halos, intensites: m.feu.halo_intensite, pierres, bannieres, taille: -1 };
}

/** La taille à montrer : braises (0) sans bûches, sinon la taille gagnée par la progression (1 à 5). */
export function tailleDuFeu(vue: VueScene): number {
  return vue.eteint ? 0 : vue.niveauFeu;
}

export function montrerTaille(feu: Feu, n: number): void {
  if (n === feu.taille) return;
  feu.tailles.forEach((s, i) => (s.el.hidden = i !== n));
  feu.halos.forEach((h, i) => (h.el.hidden = i !== n));
  feu.taille = n;
}

export function majFeu(feu: Feu, vue: VueScene): void {
  montrerTaille(feu, tailleDuFeu(vue));
  feu.pierres.hidden = !vue.pierres || "peint" in feu.pierres.dataset;
  feu.bannieres.forEach((b) => (b.hidden = !vue.bannieres));
}

/**
 * Allumage de l'intro : braises, étincelles, puis les flammes grandissent jusqu'à la taille gagnée.
 * Renvoie la taille à montrer `t` secondes après le début de l'intro.
 */
export function tailleAllumage(t: number, cible: number): number {
  if (cible <= 0) return 0;
  const n = Math.floor(Math.max(0, t - FEU.allumage.attente) / FEU.allumage.parTaille);
  return Math.min(cible, n);
}

export function animerFeu(feu: Feu, t: number): void {
  const s = feu.tailles[feu.taille];
  if (s) s.animer(t);
  const h = feu.halos[feu.taille];
  if (h) {
    const base = feu.intensites[feu.taille] ?? 1;
    h.el.style.opacity = String(base * (1 + FEU.haloFeu.oscillation * Math.sin(t * FEU.haloFeu.vitesse * Math.PI * 2)));
  }
}
