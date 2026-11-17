// Parallax : chaque couche du décor glisse à sa propre vitesse quand la caméra bouge.
// Une couche est centrée sur l'écran quand la caméra regarde le milieu du monde ; elle s'en écarte de (vitesse × déplacement).
import type { Manifeste } from '../lib/contenu/manifeste';
import { Sprite } from './sprite';
import { SCENE } from './reglages';

export type Couche = { el: HTMLElement; vitesse: number; largeur: number; hauteur: number };

/** Position gauche d'une couche, en pixels entiers, pour une caméra donnée (bord gauche de la vue, en x du monde). */
export function gaucheCouche(camera: number, vue: number, vitesse: number, largeur: number): number {
  const centre = camera + vue / 2 - SCENE.largeur / 2;
  return Math.round(-centre * vitesse + vue / 2 - largeur / 2);
}

export function creerCouches(m: Manifeste, decor: string): Couche[] {
  return (m.decors[decor] ?? []).map((c) => {
    const asset = m.assets[c.asset];
    const sprite = new Sprite(asset, c.id);
    const el = document.createElement('div');
    el.className = `couche couche-${c.id}`;
    el.style.top = `${(c.bas ?? SCENE.hauteur) - asset.hauteur}px`;
    el.append(sprite.el);
    return { el, vitesse: c.vitesse, largeur: asset.largeur, hauteur: asset.hauteur };
  });
}

export function placerCouches(couches: Couche[], camera: number, vue: number): void {
  for (const c of couches) c.el.style.transform = `translateX(${gaucheCouche(camera, vue, c.vitesse, c.largeur)}px)`;
}
