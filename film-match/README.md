# FilmMatch

Tinder de films à plusieurs : chacun swipe sur son téléphone, le film le plus liké gagne.

- Créer une session (filtres : plateformes, genres, durée, nombre de films) → code à 4 lettres + QR code / lien.
- Les autres rejoignent avec le code. Même deck pour tout le monde.
- ♥ = 1 pt, ★ = 2 pts, ✕ = 0. Égalité départagée par le nombre de personnes qui ont liké.
- « C'est un match » quand tout le monde a liké le même film.
- L'hôte peut clore la session : le film en tête est retenu.

## Stack
- `public/` : front statique (HTML/CSS/JS vanilla), catalogue de 172 films dans `public/films.js`.
- `netlify/functions/api.mts` : API (`/api/*`), stockage dans Netlify Blobs. Chaque joueur écrit uniquement sa propre clé (pas de conflit d'écriture).
- Affiches : récupérées via l'API Wikipédia par `/api/poster`, mises en cache dans Blobs. Fallback dégradé si absente.

Disponibilité des plateformes = indicative pour la France ; chaque film a un lien JustWatch.

## Déployer
Netlify, base directory `film-match`. Pas de build.
