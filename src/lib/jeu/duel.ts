// Le duel final contre le roi : des questions de tous les thèmes, sans vie à perdre.
// Une mauvaise réponse ne coûte rien : la question revient à la fin. Le duel ne peut donc pas être perdu.

export type QuestionDuel = { id: string; theme: string; q: string; choix: string[]; juste: number; explication: string; source: string };

/** Générateur pseudo-aléatoire reproductible (mulberry32), pour les tests. */
export function hasard(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Choisit `n` questions en tournant entre les thèmes, pour que tous soient représentés. */
export function choisirQuestionsDuel(toutes: QuestionDuel[], n: number, alea: () => number = Math.random): QuestionDuel[] {
  const parTheme = new Map<string, QuestionDuel[]>();
  for (const q of toutes) parTheme.set(q.theme, [...(parTheme.get(q.theme) ?? []), q]);
  for (const liste of parTheme.values()) {
    for (let i = liste.length - 1; i > 0; i--) {
      const j = Math.floor(alea() * (i + 1));
      [liste[i], liste[j]] = [liste[j], liste[i]];
    }
  }
  const themes = [...parTheme.keys()].sort(() => alea() - 0.5);
  const choisies: QuestionDuel[] = [];
  for (let tour = 0; choisies.length < n; tour++) {
    let ajout = false;
    for (const t of themes) {
      const q = parTheme.get(t)![tour];
      if (q && choisies.length < n) {
        choisies.push(q);
        ajout = true;
      }
    }
    if (!ajout) break;
  }
  return choisies;
}

export type EtatDuel = { file: string[]; gagnees: number; total: number; erreurs: number };

export function debutDuel(questions: QuestionDuel[]): EtatDuel {
  return { file: questions.map((q) => q.id), gagnees: 0, total: questions.length, erreurs: 0 };
}

/** Réponse à la question en tête : juste, elle est gagnée ; fausse, elle repart en fin de file. */
export function repondreDuel(e: EtatDuel, juste: boolean): EtatDuel {
  const [tete, ...reste] = e.file;
  if (tete === undefined) return e;
  return juste
    ? { ...e, file: reste, gagnees: e.gagnees + 1 }
    : { ...e, file: [...reste, tete], erreurs: e.erreurs + 1 };
}

export const duelFini = (e: EtatDuel) => e.file.length === 0;
/** Avancée du renard vers le trône, de 0 à 1. */
export const avanceeDuel = (e: EtatDuel) => (e.total ? e.gagnees / e.total : 1);
