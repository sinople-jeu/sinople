// Correction d'une leçon à partir des réponses brutes du joueur.
// Sert dans le navigateur ET dans la fonction serveur terminer-lecon : le serveur recalcule le score
// lui-même au lieu de croire celui envoyé par l'appareil.
import { pointsQcm, pointsSaisie, bilanLecon, type Bilan } from './points';
import { estAcceptee, trouverReponse, saisieJuste } from './reponses';
import { estimationJuste, pointsEstimation, pastillesJustes, pointsPastilles, ordreJuste } from './formats';
import { regles } from './regles';

/** Ce que le joueur a répondu : un numéro (QCM), une valeur (molette, jauge), des numéros (pastilles), un texte (registre), des textes (saisie). */
export type ReponseBrute = number | number[] | string | string[] | null;

type Q =
  | { id: string; type: 'qcm'; juste: number }
  | { id: string; type: 'registre'; juste: string }
  | { id: string; type: 'molette' | 'jauge'; juste: number; tolerance?: number }
  | { id: string; type: 'pastilles'; justes: number[] }
  | { id: string; type: 'ordre'; elements: string[] }
  | { id: string; type: 'saisie'; reponses: string[][] }
  | { id: string; type: 'carte' };

export function corrigerQuestion(q: Q, r: ReponseBrute): { juste: boolean; points: number } {
  switch (q.type) {
    case 'qcm': {
      const juste = r === q.juste;
      return { juste, points: pointsQcm(juste) };
    }
    case 'registre': {
      const juste = r === q.juste;
      return { juste, points: pointsQcm(juste) };
    }
    case 'molette':
    case 'jauge': {
      if (typeof r !== 'number') return { juste: false, points: 0 };
      const tol = q.tolerance ?? (q.type === 'jauge' ? 5 : 0);
      return { juste: estimationJuste(r, q.juste, tol), points: pointsEstimation(r, q.juste, tol) };
    }
    case 'pastilles': {
      const cochees = Array.isArray(r) ? [...new Set(r.filter((x): x is number => typeof x === 'number'))] : [];
      return { juste: pastillesJustes(cochees, q.justes), points: pointsPastilles(cochees, q.justes) };
    }
    case 'ordre': {
      const rangs = Array.isArray(r) ? r.filter((x): x is number => typeof x === 'number') : [];
      const juste = ordreJuste(rangs, q.elements.length);
      return { juste, points: pointsQcm(juste) };
    }
    case 'saisie': {
      const textes = Array.isArray(r) ? r.filter((x): x is string => typeof x === 'string').slice(0, 200) : [];
      let n = 0;
      if (q.reponses.length === 1) n = textes.some((t) => estAcceptee(t, q.reponses[0])) ? 1 : 0;
      else {
        const trouvees = new Set<number>();
        for (const t of textes) {
          const k = trouverReponse(t, q.reponses, trouvees);
          if (k >= 0) trouvees.add(k);
        }
        n = trouvees.size;
      }
      return { juste: saisieJuste(n, q.reponses.length), points: pointsSaisie(n, q.reponses.length) };
    }
    default:
      return { juste: false, points: 0 };
  }
}

export type Correction = { bilan: Bilan; reponses: Record<string, boolean> };

/** Corrige toute la leçon : les questions sans réponse comptent fausses. */
export function corrigerLecon(
  lecon: { epreuve?: boolean; questions: Q[] },
  brutes: Record<string, ReponseBrute>,
  joursSerie = 0,
): Correction {
  const reponses: Record<string, boolean> = {};
  const resultats = lecon.questions
    .filter((q) => q.type !== 'carte')
    .map((q) => {
      const c = corrigerQuestion(q, brutes[q.id] ?? null);
      reponses[q.id] = c.juste;
      return c;
    });
  return { bilan: bilanLecon(resultats, { epreuve: lecon.epreuve, joursSerie }), reponses };
}

/** Garde-fous : une leçon trop rapide pour avoir été lue ne compte pas. */
export function partieCredible(nbQuestions: number, dureeMs: number): boolean {
  return dureeMs >= nbQuestions * regles.garde_fous.secondes_min_par_question * 1000;
}
