// Ce que la fonction serveur terminer-lecon reprend du jeu (assemblé dans un seul fichier par scripts/fonctions.mjs) :
// la même correction que dans le navigateur, les garde-fous, et la série recalculée à partir des scores enregistrés.
export { corrigerLecon, partieCredible, type ReponseBrute } from './correction';
export { jourParis, joursEntre } from './serie';
export { regles } from './regles';
import { joursEntre } from './serie';

/**
 * Série de jours d'après les jours où le joueur a terminé une leçon (AAAA-MM-JJ, heure de Paris).
 * Elle compte les jours consécutifs jusqu'à hier ou aujourd'hui (le serveur ignore les gels de série).
 */
export function serieDepuisJours(jours: string[], aujourdhui: string): number {
  const tries = [...new Set(jours)].sort().reverse();
  if (!tries.length || joursEntre(tries[0], aujourdhui) > 1) return 0;
  let n = 1;
  for (let i = 1; i < tries.length && joursEntre(tries[i], tries[i - 1]) === 1; i++) n++;
  return n;
}
