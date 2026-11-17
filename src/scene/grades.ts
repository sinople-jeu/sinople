// Le grade de chaque animal, écrit sous ses pattes.
import type { Perso } from './animaux';
import type { AnimalEnScene } from '../lib/scene/etat-scene';

export function majGrade(p: Perso, a: AnimalEnScene, montrer: boolean): void {
  p.etiquette.textContent = montrer && a.nomGrade ? a.nomGrade : '';
}
