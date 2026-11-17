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
  /** Vitesse du garde sur le chemin, en pixels par seconde (lente : il est loin). */
  vitesse: 18,
  /** Le chemin peint dans la forêt (points des pieds) : il sort des arbres au fond et descend en lacets jusqu'à l'herbe de la clairière. */
  chemin: [[322, 264], [330, 269], [326, 274], [314, 278], [296, 282], [279, 287], [277, 292], [290, 296], [304, 300], [306, 307]] as [number, number][],
  /** Délai avant son arrivée, à l'ouverture (après l'intro du renard s'il y en a une). */
  attente: 2.5,
  /** Temps pour se cacher et pour revenir (fondu). */
  fondu: 0.4,
  /** Pas par seconde (le corps se soulève à chaque pas). */
  pasParSeconde: 1.6,
  /** Hauteur du soulèvement, en pixels. */
  levee: 3,
  /** Oscillation de la lanterne, en degrés de chaque côté. */
  balancement: 9,
  /** Perspective : ligne où il serait minuscule (l'horizon), et ligne où il a sa taille réelle (celle du renard, 88 px). */
  horizon: 204,
  yTailleReelle: 368,
  /** Ses tailles dessinées (une image chacune dans garde.png et lanterne.png) : échelle, coin de la lanterne et son anneau, rayon de la lueur. */
  tailles: [
    { echelle: 0.36, lanterne: [19, 73], pivot: [2, 0], lueur: 16 },
    { echelle: 0.42, lanterne: [17, 71], pivot: [2, 0], lueur: 19 },
    { echelle: 0.48, lanterne: [16, 68], pivot: [3, 0], lueur: 22 },
    { echelle: 0.55, lanterne: [14, 66], pivot: [4, 0], lueur: 25 },
    { echelle: 0.62, lanterne: [11, 62], pivot: [4, 0], lueur: 28 },
    { echelle: 0.7, lanterne: [8, 59], pivot: [4, 0], lueur: 32 },
  ] as { echelle: number; lanterne: [number, number]; pivot: [number, number]; lueur: number }[],
};
