import { describe, expect, it } from 'vitest';
import { fusionnerEtats } from '../src/lib/compte/fusion';
import { etatVide, type Etat } from '../src/lib/stockage/local';

const T = Date.parse('2026-11-17T10:00:00Z');

function etat(p: Partial<Etat> & { points?: number; vies?: number; jours?: number; dernierJour?: string | null }): Etat {
  const { points = 0, vies = 5, jours = 0, dernierJour = null, ...reste } = p;
  return {
    ...etatVide(T),
    ...reste,
    profil: { points, vies: { vies, maj: T }, serie: { jours, dernierJour, gels: 0 } },
  };
}

describe('fusion de deux progressions', () => {
  it('ne perd rien de gagné', () => {
    const tel = etat({ points: 300, conjures: ['generale', 'histoire'], grades: { generale: 3, histoire: 1 }, leconsFaites: { a: { meilleurScore: 60, nbParties: 2, derniereFois: '2026-11-10' } } });
    const pc = etat({ points: 500, conjures: ['sport', 'generale'], grades: { generale: 2, sport: 2 }, leconsFaites: { a: { meilleurScore: 100, nbParties: 1, derniereFois: '2026-11-15' }, b: { meilleurScore: 100, nbParties: 1, derniereFois: '2026-11-16' } } });
    const f = fusionnerEtats(tel, pc, T);
    expect(f.profil.points).toBe(500);
    expect(f.conjures).toEqual(['generale', 'histoire', 'sport']);
    expect(f.grades).toEqual({ generale: 3, histoire: 1, sport: 2 });
    expect(f.leconsFaites.a).toEqual({ meilleurScore: 100, nbParties: 2, derniereFois: '2026-11-15' });
    expect(Object.keys(f.leconsFaites)).toEqual(['a', 'b']);
  });

  it('garde le moins de bûches (changer d’appareil ne rend pas de vies)', () => {
    expect(fusionnerEtats(etat({ vies: 1 }), etat({ vies: 5 }), T).profil.vies.vies).toBe(1);
    expect(fusionnerEtats(etat({ vies: 5 }), etat({ vies: 2 }), T).profil.vies.vies).toBe(2);
  });

  it('garde la série jouée le plus récemment, la fiche de révision la plus avancée, le sacre', () => {
    const a = etat({ jours: 9, dernierJour: '2026-11-10', revision: { q1: { boite: 1, aRevoirLe: '2026-11-18' } } });
    const b = etat({ jours: 2, dernierJour: '2026-11-17', revision: { q1: { boite: 3, aRevoirLe: '2026-11-21' }, q2: { boite: 1, aRevoirLe: '2026-11-18' } }, regne: { depuis: '2026-11-16', pointsAuSacre: 9000 } });
    const f = fusionnerEtats(a, b, T);
    expect(f.profil.serie.jours).toBe(2);
    expect(f.revision).toEqual({ q1: { boite: 3, aRevoirLe: '2026-11-21' }, q2: { boite: 1, aRevoirLe: '2026-11-18' } });
    expect(f.regne?.depuis).toBe('2026-11-16');
    expect(fusionnerEtats(b, a, T)).toEqual(fusionnerEtats(b, a, T));
  });

  it('fusionner avec soi-même ne change rien', () => {
    const a = etat({ points: 120, conjures: ['generale'], grades: { generale: 2 } });
    expect(fusionnerEtats(a, a, T)).toEqual(a);
  });
});
