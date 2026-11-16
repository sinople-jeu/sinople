import { describe, expect, it } from 'vitest';
import { manifesteEmbarque, validerManifeste, erreursManifeste } from '../src/lib/contenu/manifeste';
import { vueScene, niveauDuFeu } from '../src/lib/scene/etat-scene';
import { etatVide, couronner, type Etat } from '../src/lib/stockage/local';

const t0 = Date.UTC(2026, 10, 17, 9);
const m = manifesteEmbarque();

const avec = (modif: Partial<Etat>): Etat => ({ ...etatVide(t0), ...modif });

describe('manifeste', () => {
  it('le manifeste embarqué est valide : 9 thèmes, 10 animaux dont un joueur et un roi', () => {
    expect(m.themes).toHaveLength(9);
    expect(m.animaux).toHaveLength(10);
    expect(m.animaux.find((a) => a.role === 'joueur')?.id).toBe('renard');
    expect(m.animaux.find((a) => a.role === 'roi')?.id).toBe('lion');
    expect(m.themes.find((t) => t.id === 'religion')?.animal).toBe('belier');
  });

  it('refuse un manifeste mal formé sans planter', () => {
    expect(validerManifeste(null)).toBeNull();
    expect(validerManifeste({ ...m, schema: 2 })).toBeNull();
    const animalInconnu = { ...m, themes: [...m.themes, { ...m.themes[0], id: 'cuisine', animal: 'ours' }] };
    expect(validerManifeste(animalInconnu)).toBeNull();
    expect(erreursManifeste(animalInconnu).join()).toMatch(/animal inconnu : ours/);
  });

  it('accepte un animal et un thème ajoutés par les données seules', () => {
    const ours = { id: 'ours', nom: 'Ours', theme: 'cuisine', role: 'conjure', phase: 'regne' };
    const cuisine = { ...m.themes[0], id: 'cuisine', nom: 'Cuisine', animal: 'ours' };
    const plus = validerManifeste({ ...m, animaux: [...m.animaux, ours], themes: [...m.themes, cuisine] });
    expect(plus?.animaux.map((a) => a.id)).toContain('ours');
    // Une progression d'avant l'ajout reste valide : l'ours n'est simplement pas encore venu.
    const vue = vueScene(avec({ conjures: ['geographie'] }), plus!, t0);
    expect(vue.animaux.find((a) => a.id === 'ours')).toMatchObject({ assis: false, grade: 0 });
  });
});

describe('vue de la scène', () => {
  it('au départ : le renard seul, éclairé, 5 bûches, une braise', () => {
    const vue = vueScene(etatVide(t0), m, t0);
    expect(vue.animaux.filter((a) => a.assis).map((a) => a.id)).toEqual(['renard']);
    expect(vue.animaux.find((a) => a.id === 'renard')).toMatchObject({ eclaire: true, grade: 1, nomGrade: 'Gueux' });
    expect(vue).toMatchObject({ buches: 5, eteint: false, niveauFeu: 1, nomFeu: 'Braise', pierres: false, bannieres: false, leconPossible: true });
  });

  it('sur un écran de thème, seul son animal est éclairé', () => {
    const vue = vueScene(avec({ conjures: ['geographie', 'culture'] }), m, t0, 'geographie');
    const eclaires = vue.animaux.filter((a) => a.eclaire).map((a) => a.id);
    expect(eclaires).toEqual(['hibou']);
  });

  it('pierres à 3 animaux venus, bannières à 6', () => {
    expect(vueScene(avec({ conjures: ['geographie', 'culture'] }), m, t0).pierres).toBe(false);
    expect(vueScene(avec({ conjures: ['geographie', 'culture', 'religion'] }), m, t0).pierres).toBe(true);
    const six = vueScene(avec({ conjures: ['geographie', 'culture', 'religion', 'histoire', 'sport', 'politique'] }), m, t0);
    expect(six).toMatchObject({ pierres: true, bannieres: true });
  });

  it('le feu grandit avec les grades gagnés, en 5 niveaux', () => {
    expect([0, 2, 3, 9, 10, 19, 20, 32, 33, 45].map((p) => niveauDuFeu(p, m.feu.seuils))).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    const vue = vueScene(avec({ conjures: ['geographie'], grades: { geographie: 5, generale: 2 } }), m, t0);
    expect(vue.niveauFeu).toBe(2); // 4 + 1 grades gagnés
    expect(vue.animaux.find((a) => a.id === 'hibou')?.nomGrade).toBe('Navigateur');
  });

  it('à zéro vie : feu éteint, tout le monde dans l’ombre, leçon impossible, progression intacte', () => {
    const etat = avec({ conjures: ['geographie'], grades: { geographie: 4 } });
    etat.profil = { ...etat.profil, vies: { vies: 0, maj: t0 } };
    const vue = vueScene(etat, m, t0);
    expect(vue).toMatchObject({ buches: 0, eteint: true, leconPossible: false });
    expect(vue.animaux.some((a) => a.eclaire)).toBe(false);
    expect(vue.animaux.find((a) => a.id === 'hibou')).toMatchObject({ assis: true, grade: 4 });
    // Une bûche revient au bout de 30 minutes.
    expect(vueScene(etat, m, t0 + 30 * 60_000).buches).toBe(1);
  });

  it('le duel s’ouvre quand les 9 animaux ont leur 6e grade', () => {
    const themes = m.themes.map((t) => t.id);
    const presque = Object.fromEntries(themes.map((t) => [t, 6]));
    presque.sport = 5;
    expect(vueScene(avec({ conjures: themes, grades: presque }), m, t0).duelOuvert).toBe(false);
    expect(vueScene(avec({ conjures: themes, grades: { ...presque, sport: 6 } }), m, t0).duelOuvert).toBe(true);
  });

  it('après le sacre : grades du règne selon les points gagnés depuis', () => {
    let etat = avec({});
    etat.profil = { ...etat.profil, points: 5000 };
    expect(vueScene(etat, m, t0).regne).toBeNull();
    etat = couronner(etat, t0);
    expect(vueScene(etat, m, t0).regne).toEqual({ grade: 1, nomGrade: 'Roi' });
    etat.profil = { ...etat.profil, points: 5000 + 4500 };
    expect(vueScene(etat, m, t0).regne).toEqual({ grade: 3, nomGrade: 'Mage' });
    expect(couronner(etat, t0 + 1)).toBe(etat); // on ne se fait sacrer qu'une fois
  });
});
