// Tous les réglages de la scène du complot, en un seul endroit.
// Les durées sont en secondes, les distances en pixels de la scène (avant agrandissement).

export const SCENE = {
  /** Taille du monde dessiné, en pixels d'origine. */
  largeur: 720,
  hauteur: 180,
  /** Part de la hauteur de l'écran prise par le bandeau. */
  partEcran: 0.25,
  /** Le bandeau ne descend pas sous cette hauteur (en pixels CSS). */
  hauteurMinCss: 120,
  /** Base du feu (pieds du feu). */
  feuX: 360,
  feuY: 152,
};

export const CAMERA = {
  /** Vitesse à laquelle la caméra rattrape le renard (plus grand = plus sec). */
  suivi: 3,
};

export const MARCHE = {
  /** Vitesse de marche du renard, en pixels par seconde. */
  vitesse: 46,
  /** D'où part le renard à l'intro (hors champ, à gauche). */
  departIntro: -50,
  /** Pause avant de partir, à l'arrivée sur la page. */
  attenteDepart: 0.4,
  /** Distance à laquelle il s'arrête devant l'animal du thème. */
  distanceAnimal: 44,
  /** L'intro ne se joue qu'une fois par visite (onglet). */
  introUneFoisParVisite: true,
};

export const ANIMAUX = {
  /** Clignement des yeux jaunes dans l'ombre : intervalle moyen et durée. */
  clignementToutesLes: 3.5,
  dureeClignement: 0.14,
  /** Arrivée d'un nouvel animal au feu : il vient de l'orée du bois en glissant. */
  dureeArrivee: 2.2,
  /** Hauteur du texte du grade sous l'animal. */
  tailleEtiquette: 6,
};

export const FEU = {
  /** Vacillement de la lumière sur l'animal éclairé : amplitude d'opacité et vitesse. */
  halo: { min: 0.7, max: 1, vitesse: 5 },
  /** Écart entre deux bûches du tas. */
  ecartBuches: 12,
};
