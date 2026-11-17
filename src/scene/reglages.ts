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
  /** Halo derrière le feu : il oscille de ± cette part de son intensité, à cette vitesse (par seconde). */
  haloFeu: { oscillation: 0.1, vitesse: 8 },
  /** Intro : le feu s'allume taille après taille (braises, étincelles, puis flammes) pendant que le renard arrive. */
  allumage: { attente: 0.6, parTaille: 0.7 },
};

export const GARDE = {
  /** Vitesse du garde, en pixels par seconde (il traverse toute la scène). */
  vitesse: 60,
  /** Ligne de ses pieds, au fond de la clairière. */
  y: 128,
  /** Délai avant son arrivée, à l'ouverture (après l'intro du renard s'il y en a une). */
  attente: 2.5,
  /** Temps pour se cacher et pour revenir (fondu). */
  fondu: 0.4,
};
