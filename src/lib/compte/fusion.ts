// Fusion de deux progressions (celle de l'appareil et celle du compte) : on ne perd jamais rien de gagné.
// Grades, points et meilleurs scores : le plus haut. Animaux au feu : tous. Vies : les moins nombreuses
// (sinon changer d'appareil rendrait des bûches). Fiches de révision : la plus récente.
import { viesActuelles } from '../jeu/vies';
import { VERSION, type Etat, type LeconFaite } from '../stockage/local';
import type { EtatSerie } from '../jeu/serie';
import type { Fiche } from '../jeu/revision';

const max = (a = 0, b = 0) => Math.max(a, b);
const plusTard = (a: string | null | undefined, b: string | null | undefined) => ((a ?? '') >= (b ?? '') ? a : b) ?? null;

function fusionnerSerie(a: EtatSerie, b: EtatSerie): EtatSerie {
  // La série jouée le plus récemment est la bonne ; à égalité, la plus longue.
  if (a.dernierJour === b.dernierJour) return a.jours >= b.jours ? a : b;
  return plusTard(a.dernierJour, b.dernierJour) === a.dernierJour ? a : b;
}

function fusionnerLecons(a: Record<string, LeconFaite>, b: Record<string, LeconFaite>): Record<string, LeconFaite> {
  const r: Record<string, LeconFaite> = { ...a };
  for (const [id, l] of Object.entries(b)) {
    const x = r[id];
    r[id] = x
      ? { meilleurScore: max(x.meilleurScore, l.meilleurScore), nbParties: max(x.nbParties, l.nbParties), derniereFois: plusTard(x.derniereFois, l.derniereFois)! }
      : l;
  }
  return r;
}

function fusionnerFiches(a: Record<string, Fiche>, b: Record<string, Fiche>): Record<string, Fiche> {
  const r: Record<string, Fiche> = { ...a };
  for (const [id, f] of Object.entries(b)) {
    const x = r[id];
    // La fiche revue le plus récemment a la date de prochaine révision la plus tardive.
    r[id] = !x || f.aRevoirLe > x.aRevoirLe ? f : x;
  }
  return r;
}

export function fusionnerEtats(a: Etat, b: Etat, maintenant: number): Etat {
  const va = viesActuelles(a.profil.vies, maintenant);
  const vb = viesActuelles(b.profil.vies, maintenant);
  const grades: Record<string, number> = { ...a.grades };
  for (const [t, g] of Object.entries(b.grades)) grades[t] = max(grades[t], g);
  const regne = a.regne && b.regne ? (a.regne.depuis <= b.regne.depuis ? a.regne : b.regne) : a.regne ?? b.regne;
  return {
    version: VERSION,
    profil: {
      points: max(a.profil.points, b.profil.points),
      vies: va.vies <= vb.vies ? va : vb,
      serie: fusionnerSerie(a.profil.serie, b.profil.serie),
    },
    conjures: [...a.conjures, ...b.conjures.filter((t) => !a.conjures.includes(t))],
    grades,
    leconsFaites: fusionnerLecons(a.leconsFaites, b.leconsFaites),
    revision: fusionnerFiches(a.revision, b.revision),
    ...(regne ? { regne } : {}),
  };
}

/** Vrai si la fusion n'apporte rien de nouveau à `a` (inutile d'écrire). */
export function memeEtat(a: Etat, b: Etat): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
