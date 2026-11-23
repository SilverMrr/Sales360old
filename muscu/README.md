# Muscu Atlas

App web de musculation : corps humain 3D rotatif (Three.js) avec 21 muscles cliquables, 143 exercices / machines, suivi de séances et statistiques.

- `index.html`, `styles.css` : interface
- `js/body.js` : corps 3D procédural (un mesh par muscle, raycasting)
- `js/data.js` : muscles (repères MEV/MRV) et base d'exercices
- `js/store.js` : séances en localStorage, export/import JSON, données de démo
- `js/stats.js` : e1RM (Epley corrigé RPE), volume par muscle, récupération, records, équilibres
- `js/charts.js` : graphiques SVG
- `vendor/` : Three.js r170 embarqué (aucun CDN)

Site statique sans build. En local : `python3 -m http.server` dans ce dossier.
Netlify : dossier de base `muscu`, publication `.`.
