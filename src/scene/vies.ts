// Les vies, montrées comme un tas de bûches devant le feu. Une bûche brûlée s'efface doucement.
import type { Manifeste } from '../lib/contenu/manifeste';
import { Sprite } from './sprite';
import { FEU, SCENE } from './reglages';
import { regles } from '../lib/jeu/regles';

export type Tas = { el: HTMLElement; buches: HTMLElement[] };

export function creerTas(m: Manifeste): Tas {
  const el = document.createElement('div');
  el.className = 'tas-de-buches';
  const asset = m.assets.buche;
  const buches: HTMLElement[] = [];
  const max = regles.vies.max;
  const largeur = (max - 1) * FEU.ecartBuches + asset.largeur;
  for (let i = 0; i < max; i++) {
    const b = new Sprite(asset, 'bûche', '#7a4a2a').el;
    b.classList.add('buche');
    b.style.position = 'absolute';
    b.style.left = `${i * FEU.ecartBuches}px`;
    buches.push(b);
    el.append(b);
  }
  el.style.transform = `translate(${SCENE.feuX - Math.round(largeur / 2)}px, ${SCENE.feuY + 2}px)`;
  el.style.zIndex = String(SCENE.feuY + 20);
  return { el, buches };
}

export function majTas(tas: Tas, vies: number): void {
  tas.buches.forEach((b, i) => b.classList.toggle('brulee', i >= vies));
}
