// Envoi d'une leçon terminée au serveur, qui la corrige lui-même (fonction terminer-lecon) et compte les points en ligue.
// Hors ligne, l'envoi attend dans une petite file sur l'appareil et repart au prochain lancement.
import { assurerCompte, client, synchroniser } from './client';
import type { ReponseBrute } from '../jeu/correction';

export type Envoi = { lecon: string; brutes: Record<string, ReponseBrute>; duree_ms: number; fini_le: number };

const CLE_FILE = 'sinople-scores-en-attente';
const FILE_MAX = 20;
/** Au-delà, le serveur ne compterait plus la partie dans la bonne semaine : on l'abandonne. */
const PEREMPTION_MS = 3 * 86400_000;

function lireFile(): Envoi[] {
  try {
    const f = JSON.parse(localStorage.getItem(CLE_FILE) ?? '[]');
    return Array.isArray(f) ? f : [];
  } catch {
    return [];
  }
}
function ecrireFile(f: Envoi[]) {
  try {
    if (f.length) localStorage.setItem(CLE_FILE, JSON.stringify(f.slice(-FILE_MAX)));
    else localStorage.removeItem(CLE_FILE);
  } catch { /* stockage indisponible */ }
}

async function envoyer(e: Envoi): Promise<boolean> {
  const { error } = await client().functions.invoke('terminer-lecon', { body: { lecon: e.lecon, brutes: e.brutes, duree_ms: e.duree_ms } });
  // Une erreur 4xx (leçon inconnue, requête refusée) ne se corrigera pas en réessayant.
  const statut = (error as { context?: Response } | null)?.context?.status ?? 0;
  return !error || (statut >= 400 && statut < 500);
}

/** Envoie les parties en attente, dans l'ordre. S'arrête à la première qui échoue (réseau). */
export async function viderFile(maintenant = Date.now()): Promise<void> {
  let file = lireFile().filter((e) => maintenant - e.fini_le < PEREMPTION_MS);
  if (!file.length) return ecrireFile(file);
  if (!(await assurerCompte())) return;
  while (file.length && (await envoyer(file[0]).catch(() => false))) {
    file = file.slice(1);
    ecrireFile(file);
  }
}

/** Une leçon vient de se terminer : on l'ajoute à la file, on l'envoie, puis on synchronise la progression. */
export async function envoyerFinDeLecon(e: Omit<Envoi, 'fini_le'>): Promise<void> {
  ecrireFile([...lireFile(), { ...e, fini_le: Date.now() }]);
  await viderFile();
  await synchroniser().catch(() => null);
}

export function aDesEnvois(): boolean {
  return lireFile().length > 0;
}
