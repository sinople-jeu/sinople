// Une leçon publiée à distance : on la lit (cache ou réseau), on la vérifie, puis on la joue avec le lecteur habituel.
import { useEffect, useState } from 'preact/hooks';
import LecteurLecon, { type QuestionJeu } from './LecteurLecon';
import { contenuCourant, lireLeconDistante } from '../lib/contenu/navigateur';

export default function LeconDistante({ base }: { base: string }) {
  const [etat, setEtat] = useState<{ erreur?: string; props?: Parameters<typeof LecteurLecon>[0] }>({});
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('id') ?? '';
    const m = contenuCourant();
    const l = m.lecons.find((x) => x.id === id);
    const t = l && m.themes.find((x) => x.id === l.theme);
    const a = t && m.animaux.find((x) => x.id === t.animal);
    if (!l || !t) return setEtat({ erreur: 'Cette leçon n’existe pas (ou plus).' });
    lireLeconDistante(l)
      .then((lecon) => {
        const ordre: Record<string, number> = { facile: 0, moyen: 1, difficile: 2 };
        const questions = lecon.questions.flatMap((q) => (q.type === 'carte' ? [] : [q as QuestionJeu])).sort((x, y) => ordre[x.niveau] - ordre[y.niveau]);
        setEtat({
          props: {
            base,
            nomTheme: t.nom,
            lecon: { id: l.id, theme: l.theme, etape: l.etape, titre: l.titre, epreuve: l.epreuve },
            questions,
            chemin: m.lecons.filter((x) => x.theme === t.id),
            animal: `le ${(a?.nom ?? t.animal).toLowerCase()}`,
            grades: t.grades,
            retourChemin: `${base}/chemin?id=${encodeURIComponent(t.id)}`,
          },
        });
      })
      .catch(() => setEtat({ erreur: 'Impossible de charger cette leçon. Vérifie ta connexion et réessaie.' }));
  }, []);
  if (etat.erreur)
    return (
      <section class="lecteur ecran-centre">
        <h1>{etat.erreur}</h1>
        <a class="bouton" href={`${base}/`}>Retour aux thèmes</a>
      </section>
    );
  return etat.props ? <LecteurLecon {...etat.props} /> : <p class="chargement">Chargement de la leçon…</p>;
}
