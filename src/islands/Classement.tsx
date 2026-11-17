// Classement de la ligue de la semaine : les joueurs du groupe (30 au plus), leurs points depuis lundi.
// Les 7 premiers montent dans la ligue suivante dimanche soir, les 5 derniers descendent.
import { useEffect, useState } from 'preact/hooks';
import { regles } from '../lib/jeu/regles';

type Ligne = { rang: number; pseudo: string; points: number; moi: boolean; ligue: number; semaine: string };
type Props = { base: string };

const L = regles.ligues;

/** Jours avant la fin de la semaine (dimanche minuit, heure de Paris). */
function joursRestants(maintenant = new Date()): number {
  const jour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'short' }).format(maintenant);
  const i = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(jour);
  return 7 - i;
}

export default function Classement({ base }: Props) {
  const [etat, setEtat] = useState<{ lignes?: Ligne[]; sansCompte?: boolean; erreur?: boolean; ligue?: number }>({});

  useEffect(() => {
    (async () => {
      const c = await import('../lib/compte/client');
      const u = await c.utilisateur().catch(() => null);
      if (!u) return setEtat({ sansCompte: true });
      const [{ data, error }, profil] = await Promise.all([c.client().rpc('classement'), c.lireProfil().catch(() => null)]);
      if (error) return setEtat({ erreur: true });
      setEtat({ lignes: data ?? [], ligue: profil?.ligue ?? data?.[0]?.ligue ?? 1 });
    })().catch(() => setEtat({ erreur: true }));
  }, []);

  if (etat.sansCompte) {
    return (
      <section class="cl-vide">
        <h1>Les ligues</h1>
        <p>Chaque semaine, affronte jusqu'à 29 autres joueurs. Les {L.montent} premiers montent d'une ligue, les {L.descendent} derniers descendent.</p>
        <Echelle ligue={0} />
        <p>Termine une leçon pour entrer dans la ligue de {L.noms[0]}.</p>
        <a class="bouton" href={`${base}/`}>Jouer une leçon</a>
      </section>
    );
  }
  if (etat.erreur) return <p class="cl-vide">Le classement ne répond pas. Vérifie ta connexion et réessaie.</p>;
  if (!etat.lignes) return <p class="cl-vide">Chargement du classement…</p>;

  const ligue = etat.ligue ?? 1;
  const n = etat.lignes.length;
  const reste = joursRestants();
  return (
    <section class="cl">
      <header class="cl-tete" style={{ '--blason': L.couleurs[ligue - 1] }}>
        <span class="cl-blason" aria-hidden="true" />
        <div>
          <h1>Ligue de {L.noms[ligue - 1]}</h1>
          <p>{reste > 1 ? `Encore ${reste} jours` : 'Dernier jour'} · les {L.montent} premiers montent</p>
        </div>
      </header>
      {n === 0 ? (
        <div class="cl-vide">
          <p>Personne n'a encore joué cette semaine dans ta ligue. Termine une leçon pour ouvrir le classement.</p>
          <a class="bouton" href={`${base}/`}>Jouer une leçon</a>
        </div>
      ) : (
        <ol class="cl-liste">
          {etat.lignes.map((l) => {
            const monte = l.rang <= L.montent && l.points > 0 && ligue < L.noms.length;
            const descend = l.rang > Math.max(L.montent, n - L.descendent) && ligue > 1;
            return (
              <li class={['cl-ligne', l.moi && 'moi', monte && 'monte', descend && 'descend'].filter(Boolean).join(' ')} key={l.rang}>
                <span class="cl-rang">{l.rang}</span>
                <span class="cl-pseudo">{l.pseudo}{l.moi && ' (toi)'}</span>
                <span class="cl-points">{l.points} pts</span>
              </li>
            );
          })}
        </ol>
      )}
      <Echelle ligue={ligue} />
      <p class="cl-compte"><a href={`${base}/compte`}>Mon compte et mon pseudo</a></p>
    </section>
  );
}

function Echelle({ ligue }: { ligue: number }) {
  return (
    <ol class="cl-echelle" aria-label="Les ligues, de la plus basse à la plus haute">
      {L.noms.map((nom, i) => (
        <li class={i + 1 === ligue ? 'ici' : ''} style={{ '--blason': L.couleurs[i] }} aria-current={i + 1 === ligue ? 'true' : undefined}>
          <span class="cl-blason" aria-hidden="true" />
          <span>{nom}</span>
        </li>
      ))}
    </ol>
  );
}
