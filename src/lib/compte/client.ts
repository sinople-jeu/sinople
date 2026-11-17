// Le compte du joueur, côté navigateur (Supabase Auth).
// On joue d'abord sans compte. Un compte anonyme est créé à la première leçon terminée (pour les ligues) ;
// le joueur peut ensuite y lier son e-mail : même identifiant, rien n'est perdu, et il retrouve sa
// progression sur un autre appareil en se connectant avec le lien reçu par e-mail.
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import config from '../../data/supabase.json';
import { lireEtat, ecrireEtat, stockageNavigateur, migrer, type Etat } from '../stockage/local';
import { fusionnerEtats, memeEtat } from './fusion';

let instance: SupabaseClient | null = null;

export function client(): SupabaseClient {
  instance ??= createClient(config.url, config.cle, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'sinople-compte' },
  });
  return instance;
}

/** Vrai si un compte existe sur cet appareil (sans appel réseau). */
export function aUnCompte(): boolean {
  try {
    return !!localStorage.getItem('sinople-compte');
  } catch {
    return false;
  }
}

export async function utilisateur(): Promise<User | null> {
  if (!aUnCompte() && !location.hash.includes('access_token') && !location.search.includes('code=')) return null;
  const { data } = await client().auth.getSession();
  return data.session?.user ?? null;
}

/** Le compte de ce joueur, créé (anonyme) s'il n'existe pas encore. null si le réseau ou le serveur refuse. */
export async function assurerCompte(): Promise<User | null> {
  const u = await utilisateur().catch(() => null);
  if (u) return u;
  const { data, error } = await client().auth.signInAnonymously();
  return error ? null : data.user;
}

/** Adresse de retour des liens envoyés par e-mail : la page « Mon compte » de ce site. */
function retour(): string {
  return `${location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/compte`;
}

/** Lie un e-mail au compte (anonyme) actuel : Supabase envoie un lien de confirmation. */
export async function lierEmail(email: string): Promise<string | null> {
  const u = await assurerCompte();
  if (!u) return 'Le serveur ne répond pas. Réessaie dans un moment.';
  const { error } = await client().auth.updateUser({ email }, { emailRedirectTo: retour() });
  return error ? error.message : null;
}

/** Se connecter sur un autre appareil : un lien de connexion est envoyé à l'e-mail du compte. */
export async function connexionEmail(email: string): Promise<string | null> {
  const { error } = await client().auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: retour() } });
  return error ? error.message : null;
}

export async function deconnexion(): Promise<void> {
  await client().auth.signOut();
}

export type Profil = { pseudo: string; ligue: number };

export async function lireProfil(): Promise<Profil | null> {
  const u = await utilisateur();
  if (!u) return null;
  const { data } = await client().from('profils').select('pseudo, ligue').eq('id', u.id).maybeSingle();
  return data;
}

export async function changerPseudo(pseudo: string): Promise<string | null> {
  const u = await utilisateur();
  if (!u) return 'Pas de compte sur cet appareil.';
  const { error } = await client().from('profils').update({ pseudo: pseudo.trim() }).eq('id', u.id);
  if (!error) return null;
  if (error.code === '23505') return 'Ce pseudo est déjà pris.';
  if (error.code === '23514') return 'De 3 à 20 lettres, chiffres, espaces, - ou _.';
  return error.message;
}

/**
 * Synchronise la progression : celle du compte et celle de l'appareil sont fusionnées,
 * puis écrites des deux côtés. Sans compte, ne fait rien (et n'appelle pas le réseau).
 */
export async function synchroniser(maintenant = Date.now()): Promise<Etat | null> {
  const u = await utilisateur().catch(() => null);
  if (!u) return null;
  const stockage = stockageNavigateur();
  const local = lireEtat(stockage, maintenant);
  const { data, error } = await client().from('progressions').select('etat').eq('joueur', u.id).maybeSingle();
  if (error) return null;
  const distant = data ? migrer(data.etat) : null;
  const fusion = distant ? fusionnerEtats(local, distant, maintenant) : local;
  if (!memeEtat(fusion, local)) ecrireEtat(stockage, fusion);
  if (!distant || !memeEtat(fusion, distant)) {
    await client().from('progressions').upsert({ joueur: u.id, etat: fusion, maj: new Date(maintenant).toISOString() });
  }
  return fusion;
}

/** Toutes les données du compte, pour les télécharger (RGPD : droit d'accès et de portabilité). */
export async function exporterDonnees(): Promise<Record<string, unknown>> {
  const u = await utilisateur();
  const appareil = lireEtat(stockageNavigateur());
  if (!u) return { appareil };
  const c = client();
  const [profil, progression, scores, ligues] = await Promise.all([
    c.from('profils').select('*').eq('id', u.id).maybeSingle(),
    c.from('progressions').select('*').eq('joueur', u.id).maybeSingle(),
    c.from('scores').select('*').eq('joueur', u.id),
    c.from('membres').select('*').eq('joueur', u.id),
  ]);
  return {
    compte: { id: u.id, email: u.email ?? null, cree_le: u.created_at, anonyme: u.is_anonymous ?? !u.email },
    profil: profil.data,
    progression: progression.data,
    scores: scores.data ?? [],
    ligues: ligues.data ?? [],
    appareil,
  };
}

/** Supprime le compte et toutes ses données sur le serveur (fonction supprimer-compte). */
export async function supprimerCompte(): Promise<string | null> {
  const { error } = await client().functions.invoke('supprimer-compte', { method: 'POST' });
  if (error) return 'La suppression a échoué. Réessaie, ou écris-nous.';
  await client().auth.signOut({ scope: 'local' });
  return null;
}
