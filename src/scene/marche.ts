// La marche : un personnage va vers un point en x, avec son cycle de marche, puis repasse en idle.
import { changerMode, placer, type Perso } from './animaux';

export type Marche = { cible: number | null; vitesse: number; arrivee?: () => void };

export function aller(p: Perso, marche: Marche, x: number, arrivee?: () => void): void {
  marche.cible = x;
  marche.arrivee = arrivee;
}

/** Avance d'un pas. Renvoie vrai tant que le personnage marche. */
export function avancer(p: Perso, marche: Marche, dt: number): boolean {
  if (marche.cible === null) return false;
  const dx = marche.cible - p.x;
  const pas = marche.vitesse * dt;
  if (Math.abs(dx) <= pas) {
    p.x = marche.cible;
    marche.cible = null;
    changerMode(p, 'idle');
    placer(p);
    const fin = marche.arrivee;
    marche.arrivee = undefined;
    fin?.();
    return false;
  }
  p.sens = dx > 0 ? 1 : -1;
  p.x += Math.sign(dx) * pas;
  changerMode(p, 'marche');
  placer(p);
  return true;
}
