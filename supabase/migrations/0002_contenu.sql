-- Contenu distant : un seau de stockage public « contenu » (manifeste, leçons, images).
-- Tout le monde peut lire ; seule la clé secrète (script npm run publier-contenu) peut écrire.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contenu', 'contenu', true, 5242880, array['application/json', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
