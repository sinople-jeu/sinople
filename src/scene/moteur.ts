// Une seule boucle d'animation pour toute la scène. Elle s'arrête quand l'onglet est caché.
// Avec « mouvement réduit », elle dessine une seule image fixe et ne tourne pas.

export type Tache = (t: number, dt: number) => void;

export type Moteur = {
  ajouter: (tache: Tache) => () => void;
  /** Temps écoulé (secondes) depuis le démarrage, sans compter les pauses. */
  temps: () => number;
  reduit: boolean;
  /** Redessine une fois (utile en mouvement réduit après un changement d'état). */
  dessiner: () => void;
};

export function mouvementReduit(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function creerMoteur(reduit = mouvementReduit()): Moteur {
  const taches = new Set<Tache>();
  let t = 0;
  let dernier: number | null = null;
  let id = 0;

  const passe = (dt: number) => taches.forEach((f) => f(t, dt));
  const boucle = (maintenant: number) => {
    const dt = dernier === null ? 0 : Math.min(0.1, (maintenant - dernier) / 1000); // pas de saut après une pause
    dernier = maintenant;
    t += dt;
    passe(dt);
    id = requestAnimationFrame(boucle);
  };
  const demarrer = () => {
    if (reduit || id) return;
    dernier = null;
    id = requestAnimationFrame(boucle);
  };
  const arreter = () => {
    cancelAnimationFrame(id);
    id = 0;
  };
  document.addEventListener('visibilitychange', () => (document.hidden ? arreter() : demarrer()));
  if (!document.hidden) demarrer();

  return {
    ajouter(tache) {
      taches.add(tache);
      if (reduit) tache(t, 0);
      return () => taches.delete(tache);
    },
    temps: () => t,
    reduit,
    dessiner: () => passe(0),
  };
}
