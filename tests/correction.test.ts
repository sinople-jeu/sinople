import { describe, expect, it } from 'vitest';
import { corrigerLecon, corrigerQuestion, partieCredible } from '../src/lib/jeu/correction';

const lecon = {
  questions: [
    { id: 'a', type: 'qcm' as const, juste: 2 },
    { id: 'b', type: 'saisie' as const, reponses: [['Paris']] },
    { id: 'c', type: 'saisie' as const, reponses: [['Atlantique'], ['Pacifique'], ['Indien']] },
    { id: 'd', type: 'molette' as const, juste: 1789 },
    { id: 'e', type: 'pastilles' as const, justes: [0, 2] },
    { id: 'f', type: 'registre' as const, juste: 'Lyon' },
  ],
};

describe('correction côté serveur', () => {
  it('recalcule le score à partir des réponses brutes', () => {
    const c = corrigerLecon(lecon, { a: 2, b: ['paris'], c: ['Atlantique', 'Pacifiqe', 'Indien'], d: 1789, e: [0, 2], f: 'Lyon' });
    expect(c.bilan).toMatchObject({ bonnes: 6, total: 6, reussie: true });
    expect(Object.values(c.reponses).every(Boolean)).toBe(true);
  });

  it('une réponse absente ou trafiquée compte fausse', () => {
    const c = corrigerLecon(lecon, { a: 2, b: ['Lyon'], d: '1789' as unknown as number, e: [0, 0, 2, 3] });
    expect(c.bilan.bonnes).toBe(1);
    expect(c.bilan.reussie).toBe(false);
    expect(corrigerQuestion({ id: 'x', type: 'qcm', juste: 1 }, null).points).toBe(0);
  });

  it('refuse une partie jouée trop vite', () => {
    expect(partieCredible(10, 3000)).toBe(false);
    expect(partieCredible(10, 60_000)).toBe(true);
  });
});

import { serieDepuisJours } from '../src/lib/jeu/serveur';

describe('série recalculée par le serveur', () => {
  it('compte les jours consécutifs jusqu’à hier ou aujourd’hui, comme le navigateur', () => {
    expect(serieDepuisJours([], '2026-11-17')).toBe(0);
    expect(serieDepuisJours(['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-16'], '2026-11-17')).toBe(3);
    expect(serieDepuisJours(['2026-11-15', '2026-11-16', '2026-11-17'], '2026-11-17')).toBe(3);
    expect(serieDepuisJours(['2026-11-10', '2026-11-11', '2026-11-15'], '2026-11-17')).toBe(0);
    expect(serieDepuisJours(['2026-11-12', '2026-11-16', '2026-11-17'], '2026-11-17')).toBe(2);
  });
});
