// Monte la scène du complot dans un bandeau : décor en parallax, feu, animaux, renard.
// Tout ce qu'elle montre vient de vueScene(état du joueur) : la scène ne garde aucun état de jeu.
import { manifesteEmbarque, type Manifeste } from '../lib/contenu/manifeste';
import { lireEtat, stockageNavigateur } from '../lib/stockage/local';
import { vueScene, type VueScene } from '../lib/scene/etat-scene';
import { creerMoteur } from './moteur';
import { calculerEchelle, type Echelle } from './echelle';
import { creerCouches, placerCouches, type Couche } from './parallax';
import { creerPerso, eclairer, animerPerso, placer, type Perso } from './animaux';
import { aller, avancer, type Marche } from './marche';
import { creerFeu, majFeu, animerFeu } from './feu';
import { Sprite } from './sprite';
import { creerTas, majTas } from './vies';
import { majGrade } from './grades';
import { gardeDoitPasser, creerGarde, avancerGarde, lancerGarde } from './garde';
import { CAMERA, MARCHE, SCENE, ANIMAUX, GARDE } from './reglages';

export type OptionsScene = { mode: 'accueil' | 'theme'; actif: string | null; /** ?essai=regne : voir le décor du règne sans rien enregistrer. */ essaiRegne?: boolean };

const CLE_INTRO = 'sinople-intro-vue';
const CLE_VUS = 'sinople-scene-vus';

function lire(stockage: Storage | null, cle: string): string | null {
  try {
    return stockage?.getItem(cle) ?? null;
  } catch {
    return null;
  }
}
function ecrire(stockage: Storage | null, cle: string, valeur: string): void {
  try {
    stockage?.setItem(cle, valeur);
  } catch {
    /* navigation privée : tant pis, l'animation se rejouera */
  }
}
const session = (): Storage | null => {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
};
const local = (): Storage | null => {
  try {
    return localStorage;
  } catch {
    return null;
  }
};

function decrire(vue: VueScene, m: Manifeste): string {
  const venus = vue.animaux.filter((a) => a.assis && a.role === 'conjure').map((a) => a.nom.toLowerCase());
  const eclaire = vue.animaux.find((a) => a.eclaire && a.role === 'conjure');
  const feu = vue.eteint ? 'Le feu est éteint' : `${vue.nomFeu}, ${vue.buches} bûche${vue.buches > 1 ? 's' : ''}`;
  const autour = venus.length ? `Autour du feu avec le renard : ${venus.join(', ')}.` : 'Le renard est seul près du feu.';
  return `${feu}. ${autour}${eclaire ? ` Le ${eclaire.nom.toLowerCase()} est dans la lumière.` : ''} Au loin, le château du ${m.animaux.find((a) => a.role === 'roi')?.nom.toLowerCase() ?? 'roi'}.`;
}

export function monterScene(racine: HTMLElement, options: OptionsScene, m: Manifeste = manifesteEmbarque()): void {
  const moteur = creerMoteur();
  const etat = lireEtat(stockageNavigateur());
  const vue = vueScene(etat, m, Date.now(), options.actif);

  const monde = document.createElement('div');
  monde.className = 'monde';
  // Après la prise du trône, le décor change : l'aube, le château aux couleurs du renard.
  const regne = vue.regne ?? (options.essaiRegne ? { grade: 1, nomGrade: m.regne.grades[0].nom } : null);
  const couches = creerCouches(m, regne && m.decors.regne ? 'regne' : 'nuit');
  if (regne) racine.classList.add('regne');
  // La couche de la clairière (feu et animaux) avance avec la caméra ; le premier plan passe devant.
  const clairiere = document.createElement('div');
  clairiere.className = 'couche couche-clairiere';
  clairiere.style.width = `${SCENE.largeur}px`;
  clairiere.style.height = `${SCENE.hauteur}px`;
  const coucheClairiere: Couche = { el: clairiere, vitesse: 1, largeur: SCENE.largeur, hauteur: SCENE.hauteur };
  const iPremierPlan = couches.findIndex((c) => c.vitesse > 1);
  couches.splice(iPremierPlan < 0 ? couches.length : iPremierPlan, 0, coucheClairiere);
  monde.append(...couches.map((c) => c.el));

  const feu = creerFeu(m);
  const tas = creerTas(m);
  clairiere.append(feu.el, tas.el);
  majFeu(feu, vue, m);
  majTas(tas, vue.buches);

  // Les animaux présents (le roi reste au château).
  const persos = new Map<string, Perso>();
  let rang = 0;
  for (const a of m.animaux) {
    if (a.role === 'roi') continue;
    const va = vue.animaux.find((x) => x.id === a.id)!;
    const p = creerPerso(a, m, a.place ? 0 : rang++);
    if (!va.present) continue;
    eclairer(p, va);
    majGrade(p, regne && va.role === 'joueur' ? { ...va, nomGrade: regne.nomGrade } : va, va.assis);
    persos.set(a.id, p);
    clairiere.append(p.el);
  }
  if (regne && m.assets['trone-rondins']) {
    // Le trône de rondins, derrière la place du renard.
    const r = persos.get(m.animaux.find((a) => a.role === 'joueur')!.id)!;
    const t = new Sprite(m.assets['trone-rondins'], 'trône', '#7a3b2e').el;
    t.style.position = 'absolute';
    t.style.transform = `translate(${r.x - 15}px, ${r.y - 34}px)`;
    t.style.zIndex = String(r.y - 1);
    clairiere.append(t);
  }
  const marches = new Map<string, Marche>();
  const renard = [...persos.values()].find((p) => m.animaux.find((a) => a.id === p.id)?.role === 'joueur')!;
  const placeRenard = renard.x;

  // Mises en scène de départ.
  if (!moteur.reduit) {
    const marcheRenard: Marche = { cible: null, vitesse: MARCHE.vitesse };
    marches.set(renard.id, marcheRenard);
    if (options.mode === 'accueil' && !(MARCHE.introUneFoisParVisite && lire(session(), CLE_INTRO))) {
      // Intro : le renard traverse la forêt et arrive au feu.
      renard.x = MARCHE.departIntro;
      placer(renard);
      setTimeout(() => aller(renard, marcheRenard, placeRenard, () => ecrire(session(), CLE_INTRO, '1')), MARCHE.attenteDepart * 1000);
    }
    const animalActif = options.actif ? vue.animaux.find((a) => a.theme === options.actif && a.role === 'conjure') : undefined;
    const cible = animalActif && persos.get(animalActif.id);
    if (options.mode === 'theme' && cible) {
      // Le renard va voir l'animal du thème choisi, puis se tourne vers lui.
      const cote = cible.x > renard.x ? -1 : 1;
      setTimeout(() => aller(renard, marcheRenard, cible.x + cote * MARCHE.distanceAnimal, () => {
        renard.sens = cote === -1 ? 1 : -1;
        placer(renard);
      }), MARCHE.attenteDepart * 1000);
    }
    // Les animaux nouvellement venus arrivent de l'orée du bois.
    if (options.mode === 'accueil') {
      const vus = new Set<string>(JSON.parse(lire(local(), CLE_VUS) ?? '[]'));
      for (const va of vue.animaux) {
        const p = persos.get(va.id);
        if (!p || !va.assis || va.role !== 'conjure' || vus.has(va.id)) continue;
        const place = p.x;
        p.x = place < SCENE.feuX ? -30 : SCENE.largeur + 30;
        placer(p);
        const mch: Marche = { cible: null, vitesse: Math.abs(place - p.x) / ANIMAUX.dureeArrivee };
        marches.set(p.id, mch);
        aller(p, mch, place, () => {
          p.sens = place > SCENE.feuX ? -1 : 1;
          placer(p);
        });
        vus.add(va.id);
      }
      ecrire(local(), CLE_VUS, JSON.stringify([...vus]));
    }
  } else if (options.mode === 'theme' && options.actif) {
    // Mouvement réduit : le renard est déjà près de l'animal du thème.
    const va = vue.animaux.find((a) => a.theme === options.actif && a.role === 'conjure');
    const cible = va && persos.get(va.id);
    if (cible) {
      const cote = cible.x > renard.x ? -1 : 1;
      renard.x = cible.x + cote * MARCHE.distanceAnimal;
      renard.sens = cote === -1 ? 1 : -1;
      placer(renard);
    }
  }

  // Le garde : il passe au fond, tout le monde se cache et le feu baisse, puis tout revient.
  const garde = creerGarde(m);
  clairiere.append(garde.el);
  if (!moteur.reduit && gardeDoitPasser(m, vue.buches, Date.now(), local(), session())) {
    // Il attend que le renard ait fini de marcher.
    const attendre = (): unknown => ((marches.get(renard.id)?.cible ?? null) !== null ? setTimeout(attendre, 500) : lancerGarde(garde));
    setTimeout(attendre, GARDE.attente * 1000);
  }

  // Taille entière et caméra.
  let echelle: Echelle;
  let camera = 0;
  const viser = () => {
    if (echelle.vue >= SCENE.largeur) return (SCENE.largeur - echelle.vue) / 2;
    return Math.min(SCENE.largeur - echelle.vue, Math.max(0, renard.x - echelle.vue / 2));
  };
  const redimensionner = () => {
    echelle = calculerEchelle(racine.clientWidth || innerWidth, innerHeight);
    racine.style.height = `${echelle.hauteurCss}px`;
    monde.style.width = `${echelle.vue}px`;
    monde.style.transform = `scale(${echelle.pixelCss})`;
    camera = viser();
    placerCouches(couches, Math.round(camera), echelle.vue);
  };
  redimensionner();
  addEventListener('resize', redimensionner);

  racine.setAttribute('role', 'img');
  racine.setAttribute('aria-label', decrire(vue, m));
  racine.replaceChildren(monde);
  racine.classList.add('prete');

  moteur.ajouter((t, dt) => {
    for (const [id, mch] of marches) {
      const p = persos.get(id);
      if (p) avancer(p, mch, dt);
    }
    for (const p of persos.values()) animerPerso(p, t, dt);
    const phase = avancerGarde(garde, dt);
    const cache = phase === 'passe';
    if (racine.classList.contains('garde-passe') !== cache) {
      racine.classList.toggle('garde-passe', cache);
      feu.flammes.el.hidden = cache || vue.eteint;
      feu.braises.hidden = !(cache || vue.eteint);
    }
    animerFeu(feu, t);
    const cible = viser();
    camera += (cible - camera) * Math.min(1, dt * CAMERA.suivi);
    if (moteur.reduit) camera = cible;
    placerCouches(couches, Math.round(camera), echelle.vue);
  });
}
