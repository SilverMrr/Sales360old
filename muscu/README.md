# Muscu Atlas

Atlas de musculation documentaire : corps anatomique 3D rotatif avec 24 groupes musculaires cliquables, 116 fiches d'exercices détaillées, générateur de séances adapté au matériel de la salle (profil Basic-Fit générique). Aucun suivi d'entraînement.

- `index.html`, `styles.css` : interface (onglets Corps, Exercices, Séance, Ma salle)
- `js/body.js` : viewer Three.js du modèle anatomique (`models/body.glb`)
- `js/data.js` : muscles (fonction, conseils, volumes), équipement Basic-Fit (courant / si disponible), paramètres par objectif
- `js/exercises.js` : fiches exercices (activation estimée, fiche technique, exécution, erreurs, sécurité, alternatives)
- `js/generator.js` : générateur de séances
- `vendor/` : Three.js r170 + GLTFLoader + décodeur meshopt, embarqués

## Modèle 3D et licence
`models/body.glb` est dérivé de **Z-Anatomy** (https://github.com/Z-Anatomy/Models-of-human-anatomy), lui-même basé sur
**BodyParts3D, © The Database Center for Life Science** (CC BY-SA 2.1 Japan). Licence du modèle dérivé : **CC BY-SA 4.0**.
Transformation : extraction du système musculaire et du squelette, regroupement des muscles par groupe d'entraînement,
décimation (≈ 25 % des polygones pour les muscles, 8 % pour les os), compression meshopt.

Site statique sans build. En local : `python3 -m http.server` dans ce dossier.
