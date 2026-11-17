// Parallax : chaque couche du décor glisse à sa propre vitesse quand la caméra bouge.
// Une couche est centrée sur l'écran quand la caméra regarde le milieu du monde ; elle s'en écarte de (vitesse × déplacement).
// Les éléments du décor qui ont un « pied » (arbres, buissons, bûches) sont posés dans la clairière, triés avec les personnages :
// un personnage dont les pieds sont plus haut que le pied de l'élément passe derrière lui.
import type { Manifeste } from '../lib/contenu/manifeste';
import { Sprite } from './sprite';
import { SCENE } from './reglages';

/** `x` : position dans le monde (prolongements du décor sur les côtés) ; sans `x`, la couche est centrée. */
export type Couche = { el: HTMLElement; vitesse: number; largeur: number; hauteur: number; x?: number; sprite?: Sprite };

/** Position gauche d'une couche, en pixels entiers, pour une caméra donnée (bord gauche de la vue, en x du monde). */
export function gaucheCouche(camera: number, vue: number, vitesse: number, largeur: number): number {
  const centre = camera + vue / 2 - SCENE.largeur / 2;
  return Math.round(-centre * vitesse + vue / 2 - largeur / 2);
}

export type Decor = { couches: Couche[]; /** Éléments à poser dans la clairière (déjà placés, z-index = pied). */ avant: HTMLElement[]; sprites: Sprite[] };

export function creerDecor(m: Manifeste, decor: string): Decor {
  const couches: Couche[] = [];
  const avant: HTMLElement[] = [];
  const sprites: Sprite[] = [];
  for (const c of m.decors[decor] ?? []) {
    const asset = m.assets[c.asset];
    const sprite = new Sprite(asset, c.id);
    const l = asset.largeur * asset.zoom;
    const h = asset.hauteur * asset.zoom;
    const el = document.createElement('div');
    el.className = `couche couche-${c.id}`;
    el.append(sprite.el);
    if (asset.images > 1) sprites.push(sprite);
    if (c.pied !== undefined) {
      el.style.transform = `translate(${c.x}px, ${(c.bas ?? SCENE.hauteur) - h}px)`;
      el.style.zIndex = String(c.pied);
      avant.push(el);
    } else {
      el.style.top = `${(c.bas ?? SCENE.hauteur) - h}px`;
      couches.push({ el, vitesse: c.vitesse, largeur: l, hauteur: h, x: c.x || undefined, sprite });
    }
  }
  return { couches, avant, sprites };
}

export function placerCouches(couches: Couche[], camera: number, vue: number): void {
  for (const c of couches) {
    const gauche = c.x === undefined ? gaucheCouche(camera, vue, c.vitesse, c.largeur) : gaucheCouche(camera, vue, c.vitesse, SCENE.largeur) + c.x;
    c.el.style.transform = `translateX(${gauche}px)`;
  }
}

/** Le décor animé (feuillage au vent, feuilles qui tombent) : toutes les planches jouent au même rythme. */
export function animerDecor(d: Decor, t: number): void {
  for (const s of d.sprites) s.animer(t);
}
