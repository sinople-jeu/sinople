import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { manifesteEmbarque, validerManifeste, erreursManifeste, type Manifeste } from '../src/lib/contenu/manifeste';
import { synchroniserContenu, CLE_MANIFESTE, type Magasin, type CacheFichiers } from '../src/lib/contenu/distant';
import { fabriquerPaquet } from '../scripts/paquet-contenu.mjs';

const URL_M = 'https://exemple.test/contenu/manifest.json';
const embarque = manifesteEmbarque();

function memoire(): Magasin & { d: Map<string, string> } {
  const d = new Map<string, string>();
  return { d, lire: (k) => d.get(k) ?? null, ecrire: (k, v) => void d.set(k, v) };
}
function cacheMemoire(): CacheFichiers & { d: Set<string> } {
  const d = new Set<string>();
  return { d, a: async (u) => d.has(u), mettre: async (u) => void d.add(u) };
}
/** Un faux réseau : adresse → corps (objet = JSON) ; absent = 404 ; « panne » = exception. */
function reseau(fichiers: Record<string, unknown>, journal: string[] = []) {
  return async (url: string) => {
    journal.push(url);
    if (fichiers[url] === 'panne') throw new Error('hors ligne');
    if (!(url in fichiers)) return new Response('', { status: 404 });
    return new Response(JSON.stringify(fichiers[url]), { status: 200 });
  };
}

/** Le manifeste embarqué + un ours (thème Cuisine), publié à distance avec son image et une leçon. */
function avecOurs(version: string): Manifeste {
  return {
    ...embarque,
    version,
    animaux: [...embarque.animaux, { id: 'ours', nom: 'Ours', theme: 'cuisine', role: 'conjure', phase: 'regne', sprites: { idle: 'ours-idle' }, couleur: '#6b4a2a' }],
    themes: [...embarque.themes, { ...embarque.themes[0], id: 'cuisine', nom: 'Cuisine', animal: 'ours' }],
    assets: { ...embarque.assets, 'ours-idle': { src: 'assets/ours-idle-abc.png', largeur: 40, hauteur: 40, images: 4, ips: 6, boucle: true, hash: 'abc' } },
    lecons: [{ id: 'cuisine-1-1', theme: 'cuisine', etape: 1, lecon: 1, titre: 'Les sauces', epreuve: false, src: 'lecons/cuisine/1-1.json', hash: 'l1' }],
  };
}
const fichiersOurs = (version: string) => ({
  [URL_M]: avecOurs(version),
  'https://exemple.test/contenu/assets/ours-idle-abc.png': 'png',
  'https://exemple.test/contenu/lecons/cuisine/1-1.json': { id: 'cuisine-1-1' },
});

describe('contenu distant', () => {
  it('premier lancement hors ligne : le contenu embarqué', async () => {
    const r = await synchroniserContenu({ urlManifeste: URL_M, embarque, magasin: memoire(), cache: cacheMemoire(), telecharger: reseau({ [URL_M]: 'panne' }) });
    expect(r.source).toBe('embarque');
    expect(r.manifeste.version).toBe(embarque.version);
  });

  it('ajouter un animal par le contenu distant, sans toucher au code', async () => {
    const magasin = memoire();
    const cache = cacheMemoire();
    const r = await synchroniserContenu({ urlManifeste: URL_M, embarque, magasin, cache, telecharger: reseau(fichiersOurs('v2')) });
    expect(r.source).toBe('distant');
    expect(r.manifeste.animaux.map((a) => a.id)).toContain('ours');
    expect(r.telecharges).toHaveLength(2);
    expect(JSON.parse(magasin.d.get(CLE_MANIFESTE)!).version).toBe('v2');
    // Hors ligne ensuite : le dernier contenu en cache.
    const hors = await synchroniserContenu({ urlManifeste: URL_M, embarque, magasin, cache, telecharger: reseau({ [URL_M]: 'panne' }) });
    expect(hors).toMatchObject({ source: 'cache' });
    expect(hors.manifeste.version).toBe('v2');
  });

  it('ne retélécharge que ce qui a changé', async () => {
    const magasin = memoire();
    const cache = cacheMemoire();
    await synchroniserContenu({ urlManifeste: URL_M, embarque, magasin, cache, telecharger: reseau(fichiersOurs('v2')) });
    const v3 = avecOurs('v3');
    v3.lecons = [...v3.lecons, { id: 'cuisine-1-2', theme: 'cuisine', etape: 1, lecon: 2, titre: 'Les pains', epreuve: false, src: 'lecons/cuisine/1-2.json', hash: 'l2' }];
    const journal: string[] = [];
    const r = await synchroniserContenu({
      urlManifeste: URL_M, embarque, magasin, cache,
      telecharger: reseau({ ...fichiersOurs('v3'), [URL_M]: v3, 'https://exemple.test/contenu/lecons/cuisine/1-2.json': {} }, journal),
    });
    expect(r.telecharges).toEqual(['https://exemple.test/contenu/lecons/cuisine/1-2.json']);
    expect(journal).toHaveLength(2); // le manifeste et la nouvelle leçon
  });

  it('manifeste mal formé ou fichier manquant : on garde le contenu précédent', async () => {
    const magasin = memoire();
    const cache = cacheMemoire();
    await synchroniserContenu({ urlManifeste: URL_M, embarque, magasin, cache, telecharger: reseau(fichiersOurs('v2')) });
    const casse = await synchroniserContenu({ urlManifeste: URL_M, embarque, magasin, cache, telecharger: reseau({ [URL_M]: { version: 'v3', themes: 'oups' } }) });
    expect(casse).toMatchObject({ source: 'cache', erreur: expect.stringMatching(/mal formé/) });
    expect(casse.manifeste.version).toBe('v2');
    const v3 = avecOurs('v3');
    v3.assets['ours-idle'] = { ...v3.assets['ours-idle'], src: 'assets/ours-idle-def.png', hash: 'def' };
    const manque = await synchroniserContenu({ urlManifeste: URL_M, embarque, magasin, cache, telecharger: reseau({ [URL_M]: v3 }) });
    expect(manque.source).toBe('cache');
    expect(manque.manifeste.version).toBe('v2');
    expect(JSON.parse(magasin.d.get(CLE_MANIFESTE)!).version).toBe('v2');
  });

  it('le paquet fabriqué depuis le dépôt est un manifeste valide', () => {
    const dossier = mkdtempSync(join(tmpdir(), 'contenu-'));
    const m = fabriquerPaquet('.', relative('.', dossier));
    expect(erreursManifeste(m)).toEqual([]);
    const v = validerManifeste(JSON.parse(readFileSync(join(dossier, 'manifest.json'), 'utf8')))!;
    expect(v.lecons.length).toBeGreaterThan(10);
    expect(v.assets['renard-idle'].src).toMatch(/^assets\/idle-[0-9a-f]{12}\.png$/);
  });
});
