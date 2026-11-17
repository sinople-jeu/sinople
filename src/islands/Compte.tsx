// Page « Mon compte » : pseudo, lier un e-mail, se connecter sur un autre appareil, télécharger ses données,
// supprimer son compte. Sans compte, on peut jouer quand même : la progression reste sur l'appareil.
import { useEffect, useState } from 'preact/hooks';
import type { User } from '@supabase/supabase-js';
import {
  utilisateur, assurerCompte, lireProfil, changerPseudo, lierEmail, connexionEmail,
  deconnexion, synchroniser, exporterDonnees, supprimerCompte, client, type Profil,
} from '../lib/compte/client';
import { ecrireEtat, etatVide, stockageNavigateur } from '../lib/stockage/local';

type Props = { base: string };

export default function Compte({ base }: Props) {
  const [u, setU] = useState<User | null | undefined>(undefined);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ texte: string; erreur?: boolean } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [effacerAppareil, setEffacerAppareil] = useState(false);

  async function recharger() {
    const x = await utilisateur().catch(() => null);
    setU(x);
    if (x) {
      const p = await lireProfil().catch(() => null);
      setProfil(p);
      setPseudo(p?.pseudo ?? '');
      await synchroniser().catch(() => null);
    }
  }

  useEffect(() => {
    recharger();
    // Retour d'un lien reçu par e-mail : la session arrive un peu après le chargement.
    const { data } = client().auth.onAuthStateChange((evt) => {
      if (evt === 'SIGNED_IN' || evt === 'USER_UPDATED') {
        if (location.hash.includes('access_token')) history.replaceState(null, '', location.pathname);
        recharger();
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function agir(f: () => Promise<string | null>, ok: string) {
    setOccupe(true);
    setMessage(null);
    const err = await f().catch((e) => String(e));
    setMessage(err ? { texte: err, erreur: true } : { texte: ok });
    setOccupe(false);
    await recharger();
  }

  async function telecharger() {
    const donnees = await exporterDonnees();
    const lien = document.createElement('a');
    lien.href = URL.createObjectURL(new Blob([JSON.stringify(donnees, null, 2)], { type: 'application/json' }));
    lien.download = 'sinople-mes-donnees.json';
    lien.click();
    URL.revokeObjectURL(lien.href);
  }

  if (u === undefined) return <p class="compte-attente">Un instant…</p>;

  const lie = !!u?.email;
  return (
    <div class="compte">
      <h1>Mon compte</h1>
      {message && <p class={message.erreur ? 'compte-msg erreur' : 'compte-msg'} role="status">{message.texte}</p>}

      {!u && (
        <section class="carte">
          <h2>Tu joues sans compte</h2>
          <p>Ta progression est gardée sur cet appareil. Un compte te donne un pseudo, une place en ligue, et ta progression sur tous tes appareils.</p>
          <button class="bouton" disabled={occupe} onClick={() => agir(async () => ((await assurerCompte()) ? null : 'Le serveur ne répond pas. Réessaie dans un moment.'), 'Compte créé. Choisis ton pseudo !')}>
            Créer mon compte
          </button>
          <h3>Tu as déjà un compte ?</h3>
          <FormEmail valeur={email} changer={setEmail} occupe={occupe} libelle="Recevoir un lien de connexion"
            envoyer={() => agir(() => connexionEmail(email), 'Regarde tes e-mails : le lien te connecte sur cet appareil.')} />
        </section>
      )}

      {u && (
        <>
          <section class="carte">
            <h2>Ton pseudo</h2>
            <form class="compte-ligne" onSubmit={(e) => { e.preventDefault(); agir(() => changerPseudo(pseudo), 'Pseudo enregistré.'); }}>
              <label class="invisible" for="pseudo">Pseudo</label>
              <input id="pseudo" value={pseudo} maxLength={20} minLength={3} required onInput={(e) => setPseudo((e.target as HTMLInputElement).value)} />
              <button class="bouton" disabled={occupe || pseudo.trim() === profil?.pseudo}>Changer</button>
            </form>
            <p class="compte-note">Il apparaît dans le classement de ta ligue. Évite ton vrai nom.</p>
          </section>

          <section class="carte">
            <h2>{lie ? 'Ton e-mail' : 'Garder ta progression partout'}</h2>
            {lie ? (
              <p>Ton compte est lié à <strong>{u.email}</strong>. Sur un autre appareil, ouvre « Mon compte » et demande un lien de connexion.</p>
            ) : (
              <>
                <p>Ajoute ton e-mail : tu pourras retrouver ta progression sur un autre appareil. Rien de ce que tu as gagné n'est perdu.</p>
                <FormEmail valeur={email} changer={setEmail} occupe={occupe} libelle="Lier mon e-mail"
                  envoyer={() => agir(() => lierEmail(email), 'Regarde tes e-mails et clique sur le lien pour confirmer.')} />
              </>
            )}
          </section>

          <section class="carte">
            <h2>Tes données</h2>
            <p>On garde le strict nécessaire : ton pseudo, ta progression, tes scores et, si tu l'as ajouté, ton e-mail. <a href={`${base}/confidentialite`}>En savoir plus</a></p>
            <div class="compte-boutons">
              <button class="bouton clair" onClick={telecharger}>Télécharger mes données</button>
              <button class="bouton clair" disabled={occupe} onClick={() => agir(async () => { await deconnexion(); return null; }, 'Tu es déconnecté. Ta progression reste sur cet appareil.')}>
                Me déconnecter
              </button>
            </div>
          </section>

          <section class="carte danger">
            <h2>Supprimer mon compte</h2>
            {!confirmer ? (
              <>
                <p>Ton pseudo, ta progression en ligne, tes scores et ta place en ligue seront effacés pour de bon.</p>
                <button class="bouton danger" onClick={() => setConfirmer(true)}>Supprimer mon compte…</button>
              </>
            ) : (
              <>
                <p><strong>Sûr ?</strong> On ne pourra pas revenir en arrière.</p>
                <label class="compte-case">
                  <input type="checkbox" checked={effacerAppareil} onChange={(e) => setEffacerAppareil((e.target as HTMLInputElement).checked)} />
                  Effacer aussi la progression de cet appareil
                </label>
                <div class="compte-boutons">
                  <button class="bouton danger" disabled={occupe} onClick={() => agir(async () => {
                    const err = await supprimerCompte();
                    if (!err && effacerAppareil) ecrireEtat(stockageNavigateur(), etatVide(Date.now()));
                    setConfirmer(false);
                    return err;
                  }, 'Ton compte est supprimé.')}>Oui, tout supprimer</button>
                  <button class="bouton clair" onClick={() => setConfirmer(false)}>Annuler</button>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function FormEmail(p: { valeur: string; changer: (v: string) => void; occupe: boolean; libelle: string; envoyer: () => void }) {
  return (
    <form class="compte-ligne" onSubmit={(e) => { e.preventDefault(); p.envoyer(); }}>
      <label class="invisible" for="email">E-mail</label>
      <input id="email" type="email" autoComplete="email" placeholder="ton@e-mail.fr" required value={p.valeur}
        onInput={(e) => p.changer((e.target as HTMLInputElement).value)} />
      <button class="bouton" disabled={p.occupe}>{p.libelle}</button>
    </form>
  );
}
