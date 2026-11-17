import { describe, expect, it } from 'vitest';
import { calculerEchelle } from '../src/scene/echelle';

describe('hauteur du bandeau', () => {
  it('prend plus d’un quart de l’écran sur téléphone, sans flou', () => {
    for (const [l, h, dpr] of [[390, 844, 3], [375, 667, 2], [360, 780, 3], [412, 915, 2.625], [430, 932, 3]]) {
      const e = calculerEchelle(l, h, dpr);
      expect(Number.isInteger(e.k)).toBe(true);
      expect(e.hauteurCss / h).toBeGreaterThan(0.25);
      expect(e.hauteurCss / h).toBeLessThanOrEqual(0.42);
    }
  });
});
