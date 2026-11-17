// Les personnages autour du feu : leur dessin (ou placeholder), leur place, l'ombre avec les yeux jaunes,
// et la lumière du feu qui ne tombe que sur l'animal concerné.
import type { Manifeste } from '../lib/contenu/manifeste';
import type { AnimalEnScene } from '../lib/scene/etat-scene';
import { Sprite, placeholder } from './sprite';
import { ANIMAUX, FEU } from './reglages';

export type Mode = 'idle' | 'marche';

export type Perso = {
  id: string;
  el: HTMLElement;
  retourne: HTMLElement;
  halo: HTMLElement;
  etiquette: HTMLElement;
  x: number;
  y: number;
  ancre: [number, number];
  sprites: Partial<Record<Mode, Sprite>>;
  mode: Mode;
  /** 1 = regarde à droite, -1 = à gauche. */
  sens: 1 | -1;
  /** Temps passé dans le mode actuel (pour l'animation). */
  tMode: number;
  eclaire: boolean;
};

type Animal = Manifeste['animaux'][number];

/** Place par défaut d'un animal ajouté sans place (contenu distant) : rangé à droite, en bord de clairière. */
export function placeParDefaut(rang: number): NonNullable<Animal['place']> {
  return { x: 630 + (rang % 3) * 26, y: 150 + (rang % 2) * 8, l: 24, h: 30 };
}

export function creerPerso(a: Animal, m: Manifeste, rang: number): Perso {
  const place = a.place ?? placeParDefaut(rang);
  const el = document.createElement('div');
  el.className = `perso perso-${a.id}`;
  el.dataset.animal = a.id;
  const halo = document.createElement('div');
  halo.className = 'halo';
  const retourne = document.createElement('div');
  retourne.className = 'retourne';
  const corps = document.createElement('div');
  corps.className = 'corps';
  const sprites: Perso['sprites'] = {};
  let ancre: [number, number];
  let l = place.l;
  let h = place.h;
  if (a.sprites.idle) {
    for (const mode of ['idle', 'marche'] as const) {
      const id = a.sprites[mode];
      if (!id) continue;
      const s = new Sprite(m.assets[id]);
      s.el.hidden = mode !== 'idle';
      sprites[mode] = s;
      corps.append(s.el);
    }
    const s = sprites.idle!;
    ancre = s.ancre;
    l = s.asset.largeur;
    h = s.asset.hauteur;
  } else {
    corps.append(placeholder(a.nom.toLowerCase(), place.l, place.h, a.couleur));
    ancre = [Math.round(place.l / 2), place.h];
  }
  // Les yeux jaunes, visibles seulement dans l'ombre.
  const yeux = document.createElement('div');
  yeux.className = 'yeux';
  yeux.style.left = `${Math.round(l * 0.62)}px`;
  yeux.style.top = `${Math.round(h * (a.sprites.idle ? 0.19 : 0.18))}px`;
  corps.append(yeux);
  retourne.style.transformOrigin = `${ancre[0]}px 0`;
  // Un placeholder ne se retourne pas : son texte resterait à l'envers.
  if (!a.sprites.idle) retourne.dataset.fixe = '';
  retourne.append(corps);
  halo.style.left = `${ancre[0] - 40}px`;
  halo.style.top = `${ancre[1] - h - 10}px`;
  halo.style.height = `${h + 20}px`;
  const etiquette = document.createElement('div');
  etiquette.className = 'etiquette';
  etiquette.style.top = `${ancre[1] + 1}px`;
  etiquette.style.left = `${ancre[0]}px`;
  etiquette.style.fontSize = `${ANIMAUX.tailleEtiquette}px`;
  el.append(halo, retourne, etiquette);
  const p: Perso = { id: a.id, el, retourne, halo, etiquette, x: place.x, y: place.y, ancre, sprites, mode: 'idle', sens: place.x > 360 ? -1 : 1, tMode: 0, eclaire: false };
  placer(p);
  return p;
}

export function placer(p: Perso): void {
  p.el.style.transform = `translate(${Math.round(p.x - p.ancre[0])}px, ${Math.round(p.y - p.ancre[1])}px)`;
  p.el.style.zIndex = String(p.y);
  p.retourne.style.transform = p.sens === 1 || 'fixe' in p.retourne.dataset ? '' : 'scaleX(-1)';
}

export function changerMode(p: Perso, mode: Mode): void {
  if (p.mode === mode) return;
  p.mode = mode;
  p.tMode = 0;
  if (!p.sprites.idle) return;
  for (const [k, s] of Object.entries(p.sprites)) s.el.hidden = k !== (p.sprites[mode] ? mode : 'idle');
}

/** Lumière ou ombre, d'après la vue de la scène. */
export function eclairer(p: Perso, a: AnimalEnScene): void {
  p.eclaire = a.eclaire;
  p.el.classList.toggle('ombre', !a.eclaire);
  p.el.classList.toggle('eclaire', a.eclaire);
}

/** Animation de chaque image : sprite, vacillement de la lumière, clignement des yeux dans l'ombre. */
export function animerPerso(p: Perso, t: number, dt: number): void {
  p.tMode += dt;
  (p.sprites[p.mode] ?? p.sprites.idle)?.animer(p.tMode);
  if (p.eclaire) {
    const v = 0.5 + 0.5 * Math.sin(t * FEU.halo.vitesse + p.x) * Math.sin(t * FEU.halo.vitesse * 0.37);
    p.halo.style.opacity = String(FEU.halo.min + (FEU.halo.max - FEU.halo.min) * v);
  } else {
    // Chaque animal cligne à son rythme (décalé par sa position).
    const cycle = (t + p.x * 0.013) % ANIMAUX.clignementToutesLes;
    p.el.classList.toggle('cligne', cycle < ANIMAUX.dureeClignement);
  }
}
