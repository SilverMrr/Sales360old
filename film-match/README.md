# FilmMatch

Tinder de films à plusieurs : chacun swipe sur son téléphone, le film le plus liké gagne.
En ligne : https://filmmatch-silvain.netlify.app

## Fonctionnement
- Créer une session (abonnements, genres, durée, nombre de films) → code 4 lettres + QR code.
- Salle d'attente en direct, puis chacun swipe à son rythme (même deck pour tous).
- ♥ 1 pt · ★ 2 pts · ✕ 0 · ⛔ veto (1 par joueur, élimine le film).
- « C'est un match » quand tout le monde a liké le même film.
- Égalité en tête → l'hôte lance une finale (top 3, un vote chacun).
- L'hôte peut clore la session : votes verrouillés côté serveur.

## Stack
- `public/` : front statique (HTML/CSS/JS vanilla), catalogue de 433 films dans `public/films.js` + `public/films-extra.js`.
- `netlify/functions/api.mts` : API `/api/*`, état des sessions dans Netlify Blobs
  (chaque joueur écrit uniquement sa propre clé : pas de conflit d'écriture).
- Images servies par Netlify Image CDN (`/.netlify/images`, AVIF/WebP).

## Affiches HD, synopsis et vraie disponibilité (optionnel, recommandé)
Sans configuration, les affiches viennent de Wikipédia (basse définition → affichage « cadré »).
Avec une clé TMDB gratuite, l'app passe automatiquement en :
affiches HD plein écran, images de fond, synopsis FR, note, réalisateur, casting,
bande-annonce intégrée, et **disponibilité réelle en France** (données JustWatch via TMDB),
utilisée aussi pour filtrer les films par abonnement.

1. Créer un compte sur https://www.themoviedb.org/signup puis demander une clé API
   (Paramètres → API, usage personnel).
2. Netlify → projet `filmmatch-silvain` → Project configuration → Environment variables →
   ajouter `TMDB_READ_TOKEN` (jeton « API Read Access Token ») ou `TMDB_API_KEY` (clé v3),
   portée « Functions ».
3. Redéployer. Le premier chargement remplit le cache (≈ 3 appels pour 172 films).

## Déployer
Netlify, base directory `film-match`, pas de build.
