// Un sprite : une planche d'images vue par une fenêtre. Changer d'image = déplacer la planche (transform seulement).
// Sans dessin (`a_dessiner`), on affiche un placeholder signalé : un bloc et son nom.
import type { Manifeste } from '../lib/contenu/manifeste';

type Asset = Omit<Manifeste['assets'][string], 'zoom'> & { zoom?: number };

const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
export const adresse = (src: string) => (src.startsWith('/') ? base + src : src);

export function placeholder(texte: string, l: number, h: number, couleur = '#5b5470'): HTMLElement {
  const el = document.createElement('div');
  el.className = 'a-dessiner';
  el.style.width = `${l}px`;
  el.style.height = `${h}px`;
  el.style.setProperty('--couleur', couleur);
  el.title = `À dessiner : ${texte}`;
  const span = document.createElement('span');
  span.textContent = texte;
  if (l >= 20 && h >= 8) el.append(span); // trop petit pour un texte : le nom reste dans l'infobulle
  return el;
}

export class Sprite {
  readonly el: HTMLElement;
  private planche: HTMLElement | null = null;
  private image = -1;
  constructor(readonly asset: Asset, texteSiManquant = 'image', couleur?: string) {
    if (!asset.src) {
      this.el = placeholder(asset.a_dessiner ?? texteSiManquant, asset.largeur, asset.hauteur, couleur);
      return;
    }
    this.el = document.createElement('div');
    this.el.className = 'sprite';
    const zoom = asset.zoom ?? 1;
    this.el.style.width = `${asset.largeur * zoom}px`;
    this.el.style.height = `${asset.hauteur * zoom}px`;
    const img = document.createElement('img');
    if (zoom !== 1) {
      // Planche agrandie à l'affichage : on fixe sa taille, le navigateur garde les pixels nets (pixelated).
      const col = asset.colonnes ?? asset.images;
      img.style.width = `${asset.largeur * col * zoom}px`;
      img.style.height = `${asset.hauteur * Math.ceil(asset.images / col) * zoom}px`;
      img.style.maxWidth = 'none';
    }
    img.src = adresse(asset.src);
    img.alt = '';
    img.draggable = false;
    img.decoding = 'async';
    this.planche = img;
    this.el.append(img);
    this.montrer(0);
  }
  /** Ancre (les pieds) : par défaut le milieu du bas. */
  get ancre(): [number, number] {
    const z = this.asset.zoom ?? 1;
    const [x, y] = this.asset.ancre ?? [Math.round(this.asset.largeur / 2), this.asset.hauteur];
    return [x * z, y * z];
  }
  montrer(n: number): void {
    if (!this.planche || n === this.image) return;
    this.image = n;
    const col = this.asset.colonnes ?? this.asset.images;
    const z = this.asset.zoom ?? 1;
    const x = (n % col) * this.asset.largeur * z;
    const y = Math.floor(n / col) * this.asset.hauteur * z;
    this.planche.style.transform = `translate(${-x}px, ${-y}px)`;
  }
  /** Image à montrer au temps t (secondes depuis le début de l'animation). */
  animer(t: number): void {
    const n = Math.floor(t * this.asset.ips);
    this.montrer(this.asset.boucle ? n % this.asset.images : Math.min(n, this.asset.images - 1));
  }
}
