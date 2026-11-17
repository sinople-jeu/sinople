// Ce que la scène doit montrer, déduit de l'état du joueur (la seule source de vérité) et du manifeste.
// La scène ne garde rien elle-même : elle appelle cette fonction et dessine le résultat.
import type { Etat } from '../stockage/local';
import type { Manifeste } from '../contenu/manifeste';
import { viesActuelles } from '../jeu/vies';
import { GRADE_DE_DEPART } from '../jeu/grades';
import { regles } from '../jeu/regles';

export type AnimalEnScene = {
  id: string;
  nom: string;
  theme: string | null;
  role: 'joueur' | 'conjure' | 'roi';
  /** Assis au feu (le renard l'est toujours ; le roi jamais avant la fin du complot). */
  assis: boolean;
  /** Visible dans la scène : assis, ou animal du thème ouvert (il attend à l'orée du bois avant sa première leçon réussie). */
  present: boolean;
  /** Éclairé par le feu ; sinon dans l'ombre, on ne voit que ses yeux jaunes. */
  eclaire: boolean;
  /** Grade de 1 à 6 (0 s'il n'est pas encore venu au feu, ou pour le roi). */
  grade: number;
  nomGrade: string | null;
};

export type VueScene = {
  animaux: AnimalEnScene[];
  /** Niveau du feu, de 1 (braise) à 5 (grand feu). Ne dépend que de la progression : il ne baisse jamais. */
  niveauFeu: number;
  nomFeu: string;
  /** Bûches = vies restantes (0 à 5). */
  buches: number;
  /** Plus de vies : le feu est éteint, tous les animaux sont dans l'ombre autour des braises. */
  eteint: boolean;
  pierres: boolean;
  bannieres: boolean;
  /** Une leçon peut commencer (le quiz du jour, la révision et le duel ne sont jamais bloqués). */
  leconPossible: boolean;
  duelOuvert: boolean;
  regne: null | { grade: number; nomGrade: string };
};

/** Somme des grades gagnés au-delà du premier, par les animaux assis : de 0 à 5 par animal. */
export function progressionDuFeu(etat: Etat, m: Manifeste): number {
  return m.animaux.reduce((s, a) => {
    if (!a.theme || !assisAuFeu(etat, a)) return s;
    return s + Math.max(0, (etat.grades[a.theme] ?? GRADE_DE_DEPART) - GRADE_DE_DEPART);
  }, 0);
}

export function niveauDuFeu(progression: number, seuils: number[]): number {
  let n = 1;
  seuils.forEach((s, i) => {
    if (progression >= s) n = i + 1;
  });
  return n;
}

function assisAuFeu(etat: Etat, a: Manifeste['animaux'][number]): boolean {
  if (a.role === 'joueur') return true;
  if (a.role === 'roi') return false;
  return a.theme !== null && etat.conjures.includes(a.theme);
}

/** Le duel s'ouvre quand chaque animal du complot (le roi excepté) a son dernier grade. */
export function duelOuvert(etat: Etat, m: Manifeste): boolean {
  const themes = m.animaux.filter((a) => a.phase === 'complot' && a.theme).map((a) => a.theme!);
  return themes.length > 0 && themes.every((t) => (etat.grades[t] ?? 0) >= regles.grades.max);
}

export function gradeDuRegne(etat: Etat, m: Manifeste): VueScene['regne'] {
  if (!etat.regne) return null;
  const gagnes = Math.max(0, etat.profil.points - etat.regne.pointsAuSacre);
  let i = 0;
  m.regne.grades.forEach((g, k) => {
    if (gagnes >= g.points) i = k;
  });
  return { grade: i + 1, nomGrade: m.regne.grades[i].nom };
}

/**
 * `actif` : thème de l'écran affiché (null sur l'accueil). Sur un écran de thème, seul son animal est éclairé ;
 * sur l'accueil, tous les animaux assis le sont. Feu éteint : personne.
 */
export function vueScene(etat: Etat, m: Manifeste, maintenant: number, actif: string | null = null): VueScene {
  const buches = viesActuelles(etat.profil.vies, maintenant).vies;
  const eteint = buches === 0;
  const themes = new Map(m.themes.map((t) => [t.id, t]));
  const animaux = m.animaux.map((a): AnimalEnScene => {
    const assis = assisAuFeu(etat, a);
    const grade = a.theme && assis ? (etat.grades[a.theme] ?? GRADE_DE_DEPART) : 0;
    const noms = a.theme ? themes.get(a.theme)?.grades : undefined;
    const present = assis || (actif !== null && a.theme === actif);
    const eclaire = !eteint && present && (actif === null || a.theme === actif);
    return { id: a.id, nom: a.nom, theme: a.theme, role: a.role, assis, present, eclaire, grade, nomGrade: grade && noms ? noms[grade - 1] : null };
  });
  const venus = animaux.filter((a) => a.assis && a.role === 'conjure').length;
  const niveauFeu = niveauDuFeu(progressionDuFeu(etat, m), m.feu.seuils);
  return {
    animaux,
    niveauFeu,
    nomFeu: m.feu.noms[niveauFeu - 1],
    buches,
    eteint,
    pierres: venus >= m.feu.pierres_a,
    bannieres: venus >= m.feu.bannieres_a,
    leconPossible: !eteint,
    duelOuvert: duelOuvert(etat, m),
    regne: gradeDuRegne(etat, m),
  };
}
