// Le feu : sa taille (5 niveaux), les pierres du foyer à 3 animaux, les bannières à 6, et les braises quand il est éteint.
import type { Manifeste } from '../lib/contenu/manifeste';
import type { VueScene } from '../lib/scene/etat-scene';
import { Sprite, placeholder } from './sprite';
import { SCENE } from './reglages';

export type Feu = { el: HTMLElement; flammes: Sprite; braises: HTMLElement; pierres: HTMLElement; bannieres: HTMLElement[]; niveau: HTMLElement };

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
  const flammes = new Sprite(m.assets.feu, 'feu');
  const [ax, ay] = flammes.ancre;
  poser(flammes.el, SCENE.feuX - ax, SCENE.feuY - ay, SCENE.feuY);
  flammes.el.classList.add('flammes');
  const b = m.assets.braises;
  const braises = poser(placeholder(b.a_dessiner ?? 'braises', b.largeur, b.hauteur, '#5a2a1a'), SCENE.feuX - b.largeur / 2, SCENE.feuY - b.hauteur, SCENE.feuY);
  braises.classList.add('braises');
  const p = m.assets.pierres;
  const pierres = poser(new Sprite(p, 'pierres', '#6b6478').el, SCENE.feuX - p.largeur / 2, SCENE.feuY - p.hauteur + 6, SCENE.feuY + 1);
  const ba = m.assets.banniere;
  const bannieres = [SCENE.feuX - 120, SCENE.feuX + 120].map((x) =>
    poser(new Sprite(ba, 'bannière', '#2f7d4a').el, x - ba.largeur / 2, 132 - ba.hauteur, 120),
  );
  // Tant que les 5 tailles du feu ne sont pas dessinées, on écrit le niveau au-dessus du feu.
  const niveau = poser(document.createElement('div'), SCENE.feuX - 40, SCENE.feuY - 96, 200);
  niveau.className = 'niveau-feu a-dessiner-texte';
  el.append(flammes.el, braises, pierres, ...bannieres, niveau);
  return { el, flammes, braises, pierres, bannieres, niveau };
}

export function majFeu(feu: Feu, vue: VueScene, m: Manifeste): void {
  feu.flammes.el.hidden = vue.eteint;
  feu.braises.hidden = !vue.eteint;
  feu.pierres.hidden = !vue.pierres;
  feu.bannieres.forEach((b) => (b.hidden = !vue.bannieres));
  feu.niveau.textContent = m.assets['feu-niveaux']?.src ? '' : `${vue.eteint ? 'Feu éteint' : vue.nomFeu} (taille ${vue.niveauFeu}/5 à dessiner)`;
}

export function animerFeu(feu: Feu, t: number): void {
  if (!feu.flammes.el.hidden) feu.flammes.animer(t);
}
