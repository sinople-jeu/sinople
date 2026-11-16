import { describe, expect, it } from 'vitest';
import { choisirQuestionsDuel, debutDuel, repondreDuel, duelFini, avanceeDuel, hasard, type QuestionDuel } from '../src/lib/jeu/duel';

const q = (theme: string, i: number): QuestionDuel => ({ id: `${theme}-${i}`, theme, q: '?', choix: ['a', 'b', 'c', 'd'], juste: 0, explication: '', source: '' });
const toutes = ['geo', 'culture', 'mythes'].flatMap((t) => Array.from({ length: 10 }, (_, i) => q(t, i)));

describe('duel final', () => {
  it('mélange tous les thèmes', () => {
    const choisies = choisirQuestionsDuel(toutes, 20, hasard(1));
    expect(choisies).toHaveLength(20);
    expect(new Set(choisies.map((c) => c.theme)).size).toBe(3);
    expect(new Set(choisies.map((c) => c.id)).size).toBe(20);
  });

  it('une mauvaise réponse renvoie la question à la fin, sans jamais faire perdre', () => {
    let e = debutDuel(choisirQuestionsDuel(toutes, 3, hasard(2)));
    const premiere = e.file[0];
    e = repondreDuel(e, false);
    expect(e.file.at(-1)).toBe(premiere);
    expect(e).toMatchObject({ gagnees: 0, erreurs: 1 });
    e = repondreDuel(repondreDuel(repondreDuel(e, true), true), true);
    expect(duelFini(e)).toBe(true);
    expect(avanceeDuel(e)).toBe(1);
  });
});
