// Agrandissement entier : chaque pixel de la scène devient un carré de k × k pixels réels de l'écran.
// On compte en pixels réels (devicePixelRatio) pour qu'il n'y ait aucun flou, même sur iPhone.
import { SCENE } from './reglages';

export type Echelle = {
  /** Pixels réels par pixel de scène (entier). */
  k: number;
  /** Taille CSS d'un pixel de scène. */
  pixelCss: number;
  /** Largeur visible, en pixels de scène. */
  vue: number;
  hauteurCss: number;
};

export function calculerEchelle(largeurCss: number, hauteurEcranCss: number, dpr = devicePixelRatio || 1): Echelle {
  const cible = Math.max(SCENE.hauteurMinCss, hauteurEcranCss * SCENE.partEcran) * dpr;
  const k = Math.max(1, Math.floor(cible / SCENE.hauteur));
  const pixelCss = k / dpr;
  return { k, pixelCss, vue: Math.ceil(largeurCss / pixelCss), hauteurCss: SCENE.hauteur * pixelCss };
}
