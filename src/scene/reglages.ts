// Tous les réglages de la scène du complot, en un seul endroit.
// Les durées sont en secondes, les distances en pixels de la scène (avant agrandissement).

export const SCENE = {
  /** Taille du monde dessiné, en pixels d'origine. */
  /** La forêt (Documents/Claude/Feu de camp/scene-foret) fait 344 × 192, affichée ×2 pour être à l'échelle du renard. */
  largeur: 688,
  hauteur: 384,
  /** Le bandeau prend au moins cette part de la hauteur de l'écran (un peu plus d'un quart)… */
  partEcran: 0.27,
  /** …et au plus celle-ci, pour laisser la place au reste de la page. */
  partEcranMax: 0.42,
  /** Le bandeau ne descend pas sous cette hauteur (en pixels CSS). */
  hauteurMinCss: 120,
  /** Base du feu (pieds du feu). */
  feuX: 474,
  feuY: 340,
  /** Le foyer de pierres est peint dans le décor : pas de pierres dessinées en plus. */
  foyerPeint: true,
};

export const CAMERA = {
  /** Vitesse à laquelle la caméra rattrape le renard (plus grand = plus sec). */
  suivi: 3,
};

export const MARCHE = {
  /** Vitesse de marche du renard, en pixels par seconde. */
  vitesse: 46,
  /** D'où part le renard à l'intro (hors champ, à gauche). */
  departIntro: 120,
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
  vitesse: 70,
  /** Ligne de ses pieds, au fond de la clairière. */
  y: 300,
  /** Délai avant son arrivée, à l'ouverture (après l'intro du renard s'il y en a une). */
  attente: 2.5,
  /** Temps pour se cacher et pour revenir (fondu). */
  fondu: 0.4,
  /** Pas par seconde (le corps se soulève à chaque pas). */
  pasParSeconde: 2.2,
  /** Hauteur du soulèvement, en pixels. */
  levee: 2,
  /** Oscillation de la lanterne, en degrés de chaque côté. */
  balancement: 9,
  /** Où pend la lanterne dans le dessin du garde (coin haut gauche de son image). */
  lanterne: { x: 0, y: 42 },
  /** Rayon de la lueur de la lanterne. */
  lueur: 34,
};
