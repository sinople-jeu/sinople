// Le manifeste du contenu : thèmes, animaux, grades, feu, règne, garde, duel et assets, décrits en données.
// Aujourd'hui il est embarqué dans le site (src/data/themes.json + src/data/scene.json) ;
// à l'étape 7 il sera aussi chargé à distance, et validé par le même schéma avant d'être utilisé.
// Ajouter un animal ou un thème = ajouter des données ici, pas du code.
import { z } from 'astro/zod';
import themesJson from '../../data/themes.json';
import sceneJson from '../../data/scene.json';
import { regles } from '../jeu/regles';

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "un id s'écrit en minuscules et tirets, sans accent");
const texte = z.string().trim().min(1);

/** Une image ou planche de sprites. `a_dessiner` : placeholder signalé, le dessin manque encore. */
export const asset = z.object({
  src: z.string().optional(),
  largeur: z.number().int().positive(),
  hauteur: z.number().int().positive(),
  images: z.number().int().positive().default(1),
  ips: z.number().positive().default(8),
  boucle: z.boolean().default(true),
  a_dessiner: z.string().optional(),
});

export const theme = z.object({
  id,
  nom: texte,
  matieres: texte,
  animal: id,
  carriere: texte,
  pret: z.boolean().default(false),
  grades: z.array(texte).length(regles.grades.max, `un thème a exactement ${regles.grades.max} grades`),
  pictos: z.array(z.string()).length(regles.grades.max),
});

export const animal = z.object({
  id,
  nom: texte,
  /** Thème de l'animal ; null pour le roi. */
  theme: id.nullable(),
  role: z.enum(['joueur', 'conjure', 'roi']),
  /** « complot » : compte pour faire tomber le roi. « regne » : arrivé après le couronnement, ne rebloque pas le duel. */
  phase: z.enum(['complot', 'regne']).default('complot'),
});

const croissant = (t: number[]) => t.every((v, i) => i === 0 || v > t[i - 1]);

export const manifeste = z
  .object({
    schema: z.literal(1),
    version: texte,
    themes: z.array(theme).min(1),
    animaux: z.array(animal).min(1),
    feu: z.object({
      noms: z.array(texte).length(5),
      seuils: z.array(z.number().int().min(0)).length(5).refine(croissant, 'les seuils du feu doivent croître'),
      pierres_a: z.number().int().positive(),
      bannieres_a: z.number().int().positive(),
    }),
    regne: z.object({
      grades: z
        .array(z.object({ nom: texte, points: z.number().int().min(0) }))
        .min(1)
        .refine((g) => croissant(g.map((x) => x.points)), 'les seuils du règne doivent croître'),
    }),
    garde: z.object({
      a_l_ouverture: z.number().min(0).max(1),
      apres_buche_brulee: z.boolean(),
      intervalle_min_minutes: z.number().min(0),
    }),
    duel: z.object({ questions: z.number().int().positive() }),
    assets: z.record(z.string(), asset).default({}),
  })
  .superRefine((m, ctx) => {
    const animaux = new Set(m.animaux.map((a) => a.id));
    const themes = new Set(m.themes.map((t) => t.id));
    if (animaux.size !== m.animaux.length) ctx.addIssue({ code: 'custom', message: 'deux animaux ont le même id' });
    if (themes.size !== m.themes.length) ctx.addIssue({ code: 'custom', message: 'deux thèmes ont le même id' });
    for (const t of m.themes)
      if (!animaux.has(t.animal)) ctx.addIssue({ code: 'custom', message: `le thème ${t.id} a un animal inconnu : ${t.animal}` });
    for (const a of m.animaux)
      if (a.theme && !themes.has(a.theme)) ctx.addIssue({ code: 'custom', message: `l'animal ${a.id} a un thème inconnu : ${a.theme}` });
    if (m.animaux.filter((a) => a.role === 'joueur').length !== 1) ctx.addIssue({ code: 'custom', message: 'il faut exactement un animal joueur' });
  });

export type Manifeste = z.output<typeof manifeste>;
export type Theme = z.output<typeof theme>;
export type Animal = z.output<typeof animal>;

/** Les anciens fichiers écrivent l'animal avec accent (« bélier ») : l'id n'en a pas. */
export const idAnimal = (nom: string) => nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Valide un manifeste reçu. Renvoie null (sans jeter d'erreur) s'il est mal formé : on garde alors le précédent. */
export function validerManifeste(brut: unknown): Manifeste | null {
  const r = manifeste.safeParse(brut);
  return r.success ? r.data : null;
}

/** Les raisons du refus, pour les tests et la commande de publication. */
export function erreursManifeste(brut: unknown): string[] {
  const r = manifeste.safeParse(brut);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.') || '(manifeste)'} : ${i.message}`);
}

/** Le manifeste embarqué dans le site, assemblé à partir des fichiers de données. */
export function manifesteEmbarque(): Manifeste {
  const brut = {
    ...sceneJson,
    themes: themesJson.map((t) => ({ ...t, animal: idAnimal(t.animal) })),
  };
  const m = validerManifeste(brut);
  if (!m) throw new Error(`Manifeste embarqué invalide :\n${erreursManifeste(brut).join('\n')}`);
  return m;
}
