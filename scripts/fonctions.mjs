// Assemble le code du jeu utilisé par les fonctions serveur Supabase (correction des leçons, garde-fous, série)
// dans supabase/functions/terminer-lecon/jeu.js, pour que le serveur corrige exactement comme le navigateur.
// À relancer après une modification des règles ou de la correction : npm run fonctions
import { build } from 'esbuild';

await build({
  entryPoints: ['src/lib/jeu/serveur.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  outfile: 'supabase/functions/terminer-lecon/jeu.js',
  banner: { js: '// Fichier généré par scripts/fonctions.mjs à partir de src/lib/jeu : ne pas modifier à la main.' },
  logLevel: 'info',
});
