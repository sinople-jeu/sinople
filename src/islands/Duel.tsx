// Le duel final contre le lion, puis la scène du trône.
// Vie illimitée : aucune bûche ne brûle, les 5 bûches sont mises de côté et retrouvées telles quelles après.
// Une mauvaise réponse : le lion se redresse et rugit, les animaux sursautent, la question revient à la fin.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { lireEtat, ecrireEtat, stockageNavigateur, couronner } from '../lib/stockage/local';
import { choisirQuestionsDuel, debutDuel, repondreDuel, duelFini, avanceeDuel, type QuestionDuel } from '../lib/jeu/duel';
import { pointsQcm } from '../lib/jeu/points';
import scene from '../data/scene.json';
import { manifesteEmbarque } from '../lib/contenu/manifeste';
import { duelOuvert } from '../lib/scene/etat-scene';

type Props = { base: string; questions: QuestionDuel[]; nombre: number };

/** Taille d'un pixel de la scène du duel, pour un agrandissement entier sans flou. */
function pixelCss(largeur: number): number {
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  const k = Math.max(1, Math.floor(Math.min((largeur * dpr) / 320, (innerHeight * 0.3 * dpr) / 120)));
  return k / dpr;
}

const conjures = scene.animaux.filter((a) => a.role === 'conjure');
const typo = (t: string) => t.replace(/\s+([?!:;])/g, ' $1');

function Scene({ base, avancee, rugit, fin }: { base: string; avancee: number; rugit: number; fin: boolean }) {
  const [px, setPx] = useState(2);
  useEffect(() => {
    const maj = () => setPx(pixelCss(Math.min(innerWidth, 640)));
    maj();
    addEventListener('resize', maj);
    return () => removeEventListener('resize', maj);
  }, []);
  const xRenard = fin ? 128 : Math.round(16 + avancee * 170);
  return (
    <div class="duel-cadre" style={{ height: `${120 * px}px` }} aria-hidden="true">
      <div class={`duel-scene${fin ? ' fin' : ''}`} style={{ transform: `scale(${px})` }}>
        <div class="a-dessiner fond" title="À dessiner : cour du château la nuit">
          <span>{fin ? 'salle du trône (à dessiner)' : 'cour du château, la nuit (à dessiner)'}</span>
        </div>
        {fin && <div class="a-dessiner trone" title="À dessiner : trône"><span>trône</span></div>}
        {fin && [60, 250].map((x) => <div key={x} class="a-dessiner banniere" style={{ transform: `translateX(${x}px)` }} title="À dessiner : bannière" />)}
        <div key={rugit} class={`lion${rugit && !fin ? ' redresse' : ''}${fin ? ' part' : ''}`}>
          <div class="a-dessiner corps-lion" title="À dessiner : le lion"><span>lion</span></div>
          {!fin && <div class="a-dessiner couronne" style={{ transform: `translateX(${Math.round(avancee * 10)}px) rotate(${Math.round(avancee * 20)}deg)` }} title="À dessiner : couronne" />}
          {fin && <div class="a-dessiner canne" title="À dessiner : canne à pêche" />}
          {rugit > 0 && !fin && <span class="rugissement">Grrr !</span>}
        </div>
        <div key={`a${rugit}`} class={`foule${rugit && !fin ? ' sursaut' : ''}`}>
          {conjures.map((a, i) => (
            <div key={a.id} class="a-dessiner petit" style={{ background: a.couleur, transform: `translateX(${4 + i * 13}px)` }} title={`À dessiner : ${a.nom.toLowerCase()}`} />
          ))}
        </div>
        <div class="renard" style={{ transform: `translate(${xRenard}px, ${fin ? 6 : 34}px)` }}>
          <div class="sprite-renard"><img src={`${base}/scene/renard/idle.png`} alt="" /></div>
          {fin && <div class="a-dessiner couronne-renard" title="À dessiner : couronne du renard" />}
        </div>
      </div>
    </div>
  );
}

export default function Duel({ base, questions, nombre }: Props) {
  // Ouvert quand les 9 animaux ont leur 6e grade (et pas encore de roi renard) ; ?essai=1 pour l'essayer sans rien enregistrer.
  const [{ ouvert, essai }] = useState(() => {
    const etat = lireEtat(stockageNavigateur());
    return { ouvert: duelOuvert(etat, manifesteEmbarque()) && !etat.regne, essai: new URLSearchParams(location.search).has('essai') };
  });
  const choisies = useMemo(() => choisirQuestionsDuel(questions, nombre), []);
  const parId = useMemo(() => new Map(choisies.map((q) => [q.id, q])), [choisies]);
  const [etat, setEtat] = useState(() => debutDuel(choisies));
  const [choisi, setChoisi] = useState(-1);
  const [rugit, setRugit] = useState(0);
  const [points, setPoints] = useState(0);
  const [dejaRatees] = useState(() => new Set<string>());
  const [fin, setFin] = useState(false);

  if (!ouvert && !essai) {
    return (
      <section class="duel ecran-centre">
        <h1>Le roi est encore trop fort</h1>
        <p>Le duel s'ouvre quand les neuf animaux ont atteint leur sixième grade.</p>
        <a class="bouton" href={`${base}/`}>Retour au feu</a>
      </section>
    );
  }

  const q = parId.get(etat.file[0]);
  const corrige = choisi >= 0;

  function valider(i: number) {
    if (corrige || !q) return;
    setChoisi(i);
    const juste = i === q.juste;
    if (!juste) {
      dejaRatees.add(q.id);
      setRugit((n) => n + 1);
    } else if (!dejaRatees.has(q.id)) setPoints((p) => p + pointsQcm(true));
  }

  function suivante() {
    if (!q) return;
    const e = repondreDuel(etat, choisi === q.juste);
    setEtat(e);
    setChoisi(-1);
    if (duelFini(e)) {
      if (!essai) {
        // Le renard prend le trône. Les vies, grades et animaux ne bougent pas.
        const stockage = stockageNavigateur();
        const avant = lireEtat(stockage);
        ecrireEtat(stockage, couronner({ ...avant, profil: { ...avant.profil, points: avant.profil.points + points } }, Date.now()));
      }
      setFin(true);
    }
  }

  if (fin) {
    return (
      <section class="duel">
        <Scene base={base} avancee={1} rugit={0} fin />
        <div class="duel-texte">
          <h1 tabIndex={-1} ref={(h) => h?.focus()}>Le renard prend le trône !</h1>
          <p>Le lion ramasse sa canne à pêche et s'en va en bougonnant. Les conjurés lèvent leurs bannières.</p>
          <p class="titre-roi">Te voilà <strong>Roi</strong>. Le règne commence.</p>
          {essai && <p class="essai">Mode essai : rien n'a été enregistré.</p>}
          <a class="bouton" href={`${base}/${essai ? '?essai=regne' : ''}`}>Retour au feu</a>
        </div>
      </section>
    );
  }

  return (
    <section class="duel">
      <Scene base={base} avancee={avanceeDuel(etat)} rugit={rugit} fin={false} />
      <div class="duel-texte">
        <p class="avancee">
          Duel contre le roi · {etat.gagnees}/{etat.total} · <span class="sans-buche">bûches à l'abri, rien à perdre</span>
          {essai && ' · essai'}
        </p>
        {q && (
          <>
            <h1 class="question">{typo(q.q)}</h1>
            <div class="choix" role="group" aria-label="Réponses">
              {q.choix.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  class={`reponse${corrige && i === q.juste ? ' juste' : ''}${corrige && i === choisi && i !== q.juste ? ' faux' : ''}`}
                  disabled={corrige}
                  onClick={() => valider(i)}
                >
                  {typo(c)}
                </button>
              ))}
            </div>
            {corrige && (
              <p class="explication">
                {choisi !== q.juste && 'Le lion se redresse… La question reviendra. '}
                {typo(q.explication)}
              </p>
            )}
          </>
        )}
      </div>
      {corrige && (
        <div class="pied">
          <button type="button" class="bouton" onClick={suivante} ref={(b) => b?.focus()}>
            Question suivante
          </button>
        </div>
      )}
    </section>
  );
}
