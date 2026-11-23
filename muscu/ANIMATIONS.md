# Animations 2D des exercices — fichier de passation

À lire en début de session pour continuer les animations sans relire l'historique.
Consigne de l'utilisateur : **animations 2D simplifiées, cohérentes et claires, le plus épuré possible**. On ne cherche pas le « plus beau » mais la lisibilité.

## Contexte
- App : `muscu/` (site statique, pas de build). En ligne : https://muscu-atlas.netlify.app
- Branche git : `claude/clever-keller-m3mlxa` (dépôt SilverMrr/Sales360old). Committer + pousser après chaque lot.
- L'app est documentaire (pas de suivi). Les animations s'affichent en tête de la fiche exercice (modale), avec boutons Pause / Ralenti, et l'étiquette « ▶ Animé » sur les cartes.

## Moteur : `muscu/js/anim.js`
- Registre `A[exerciseId] = { view: 'Profil' | 'Face', muscles: 'texte affiché', build(s) }`.
  `build(s)` crée les éléments SVG une fois et **retourne `k => {...}`**, appelé à chaque image avec `k` ∈ [0,1] (0 = départ, 1 = contraction maximale).
- Rythme commun (`repPhase`) : montée 1,2 s · pause 0,3 s · descente 1,7 s · pause 0,4 s.
- Coordonnées « monde » en mètres : x vers l'avant (profil, regard vers la droite) ou vers la droite (face), y vers le haut, sol à y = 0.
- Cadrage : `SCALE` (par vue) ou `STANDING[id] = [échelle px/m, [origineX, origineY]]` pour ajuster un exercice (viewBox 400×400, sol à Y≈372–380).
- Longueurs `L` : tronc 0,46 · tête 0,22 · cuisse 0,44 · tibia 0,43 · pied 0,19 · bras 0,30 · avant-bras 0,27.
- Outils :
  - `torsoPts(hip, lean)` → épaule et tête (lean en rad, positif = penché en arrière, négatif = en avant).
  - `ik(S, T, L1, L2, pole)` → [coude/genou, main/cheville] (IK 2 segments ; `pole` = côté de pliage).
  - `polar(o, deg, len)` (0° = vers le bas, 90° = vers l'avant), `add`, `mul`, `lerp`.
  - `sideFigure(s, { farArm, farLeg })` → `update({hip, sh, head, knee, ank, toe, elb, hand, kneeF, ankF, toeF})`. Membres proches avec contour sombre ; membres opposés grisés derrière.
  - `sideFigure` accepte aussi `mid` (tronc en deux segments, pour le crunch).
  - Vue de face / de dos : `frontFigure(s, { seated, legs })` → `update(shY, hipY, { sl, sr, headY })` (jambes, tronc, tête ; bras dessinés par l'exercice, `sl`/`sr` = épaules pour un tronc en rotation). Vue `'Dos'` disponible (même cadrage que `'Face'`).
  - Surbrillance en forme libre : `hotPath(s)` + `lit(path, d, k)` (pectoraux, trapèzes, obliques).
  - Familles réutilisables : `deck(reverse)` (pec deck / reverse pec deck), `hipMachine(out)` (abducteurs / adducteurs).
  - `stack(s, x, y0, n, w)` → pile de charges ; appeler `st(lift)` (les 3 plaques du haut montent).
  - Surbrillance muscle : `band(s, épaisseur, côté ±1, auDessus=false)` le long d'un segment (`b(a, b, k, t0, t1)`) ; `dot(s, r)` pour un rond (deltoïdes, fessiers). Bandes de bras : `auDessus = true`.
  - Primitives : `s.rect(x, y, w, h, couleur, rayon)`, `s.ln(épaisseur, couleur)` + `s.setL(n, a, b)`, `s.circ(r, couleur)` + `s.at(n, p)`, `s.moveRect`.
- Couleurs `C` : peau `#ece6dc`, membres opposés `#a9a39a`, bâti `#3b4253`/`#4c566b`, rembourrage `#1c1f27`, acier `#aab3c2`, plaques `#343a47`, plaques actives `#ff5a3c`, câble `#8b94a7`. Dégradé muscle `url(#hot)` (orange → rouge).
- Épaisseurs (à 260 px/m) : tronc 46, cuisse 32, tibia 24, pied 15, bras 16, avant-bras 14.

## Conventions
- Une seule vue par exercice : profil par défaut ; face si le mouvement est dans le plan frontal (tirage vertical, élévations latérales, abduction…).
- Machine réduite à l'essentiel : bâti, siège/dossier, pièce mobile (levier, rouleau, poignée, câble), pile de charges si machine guidée.
- Seulement le(s) muscle(s) principal(aux) en couleur ; secondaire éventuel avec `k * 0.5–0.7`.
- Pas de visage, mains et pieds = bouts de segments.
- Champ `muscles` = ce qui est réellement coloré.

## Vérification (obligatoire pour chaque lot)
1. Serveur local : `cd muscu && python3 -m http.server 8765`.
2. Page de test temporaire (ne pas committer) qui monte toutes les animations via `mountAnim(div, id)` pour chaque id de `ANIM_IDS`, puis capture Playwright avec `apis.forEach(a => { a.playing = false; a.t = T })` à **T = 0** (départ) et **T = 1,3** (contraction). Contrôler : trajectoire juste, membres non disloqués, machine cohérente, muscle allumé.
3. Incrémenter le cache dans `sw.js` (`const C = 'muscu-vN'`).
4. Commit + push, puis déploiement Netlify : outil MCP `netlify-deploy-services-updater` (operation `deploy-site`, siteId `5b89e629-6c65-428f-ba81-abecfea1b601`), puis lancer la commande `npx @netlify/mcp …` renvoyée **depuis le dossier `muscu/`**.
5. Mettre à jour ce fichier (listes ci-dessous).

## Coût mesuré
Lot 1 (moteur + 10 exercices + intégration) : ~10–12k tokens de code, 2–3 passes de capture. Un exercice supplémentaire ≈ 5–8k tokens. Une variante (même geste, autre matériel) ≈ 1–3k tokens.

## Fait (49)
Lot 1 : leg_ext, leg_curl, leg_press, chest_press, shoulder_press_m, seated_row, lat_pd, pushdown, curl_db, lat_raise_db

Lot 2 (23/11/2026) — consigne : « les exercices les plus efficaces pour chaque muscle ». Choix = pour chaque muscle sans animation, l'exercice au matériel courant avec la plus forte part `act` de ce muscle :
pec_deck (pectoraux), reverse_pec_deck (deltoïde postérieur, vue de dos), ext_rot_cable (coiffe), wrist_curl (avant-bras), shrug_db (trapèzes), straight_arm (grand dorsal), back_ext (lombaires), crunch (abdominaux), woodchopper (obliques), hip_thrust (fessiers), abduction_m, adduction_m, captain_chair (fléchisseurs de hanche), calf_leg_press (mollets), tib_raise (tibial), neck_flex (cou).
Tous les muscles ont maintenant au moins une animation, sauf le dentelé (aucun exercice ne le cible, ≤ 10 %).

Lot 3 (23/11/2026) — même consigne, rang suivant : pour chaque muscle, l'exercice non encore animé (matériel courant) avec la plus forte part `act`. Isométriques purs écartés (dead_hang → reverse_curl). 23 exercices :
cable_cross (pectoraux), ohp_db (deltoïde antérieur), overhead_cable (triceps), cable_crunch (abdominaux), lat_raise_cable (deltoïde latéral), shrug_smith (trapèzes), face_pull (coiffe), incline_curl (biceps), cable_rear_fly (deltoïde postérieur, vue de dos), row_smith (rhomboïdes), reverse_curl (avant-bras), lat_pd_uni (grand dorsal, à genoux, vue de face), pallof (obliques), cable_kickback (fessiers), calf_smith (mollets), trap_dl_db (lombaires), nordic (ischios), sissy (quadriceps), sumo_squat (adducteurs), hanging_leg_raise (fléchisseurs de hanche), cable_abduction (abducteurs), neck_ext (cou), ab_wheel (dentelé / abdominaux).
Nouveaux outils : `dumbbell(s, r)` → `(main, angle)` (haltère orienté), `frontArm(s)` → `(S, E, H)` (bras de face avec contour, à utiliser dès qu'un bras passe devant le tronc), `pulley(s, x, y)`, `STAND` (jambes debout de profil), `pecD(tp, x, shY)`.
Corrections moteur : `band()` décale d'un demi-pixel un trait parfaitement vertical/horizontal (sinon le dégradé `objectBoundingBox` ne s'affiche pas). Côtés corrigés : chest_press allumait le dos au lieu des pectoraux, seated_row la poitrine au lieu du dos.
**Règle des côtés de `band(s, w, side)`** : normale écran = (−dy, dx) du segment a→b. Tronc hanche→épaule vers le haut : `+1` = avant (pecs, abdos), `−1` = dos. Segment vers le bas (bras, cuisse, tibia) : `+1` = arrière (triceps, ischios, mollets), `−1` = avant (biceps, quadriceps).

## À faire — priorisé (exercices « courants en salle »)
Les variantes indiquées « ≈ X » peuvent réutiliser la cinématique de X (changer matériel/poignée).

**Lot 4 — bases les plus utilisées**
1. bench_smith (développé couché, profil) · ≈ bench_db, close_bench_smith
2. incline_db (développé incliné) · ≈ incline_smith
3. fly_db, cable_fly_low (≈ cable_cross, fait)
4. ohp_smith, arnold (≈ ohp_db, fait)
5. smith_squat (profil) · ≈ goblet (≈ sumo_squat, fait)
6. rdl_db (soulevé de terre roumain) · ≈ rdl_smith (≈ trap_dl_db, fait)
7. glute_bridge (≈ hip_thrust, fait)
8. row_db (≈ row_smith, fait)
9. pullup_assist (face) · ≈ pullup, chinup, chinup_assist
10. lat_pd_close (profil)

**Lot 5 — bras, épaules**
rope_pushdown (≈ pushdown), overhead_db (≈ overhead_cable, fait), skullcrusher, kickback, curl_ez (≈ cable_curl, reverse_curl fait), hammer_curl (≈ rope_curl), bayesian_curl (≈ incline_curl, fait), preacher_db, rear_fly_db (≈ cable_rear_fly, fait), upright_row, calf_db (≈ calf_smith, fait)

**Lot 6 — tronc, jambes unilatérales, divers**
reverse_crunch (≈ crunch, fait), plank (≈ side_plank), bulgarian (≈ lunges, step_up), kb_swing, pushup, dips_chest (≈ dips_assist), farmer, dead_hang

Hors « courant » (matériel « si disponible ») : à faire seulement après — hack_squat, pendulum, hip_thrust_m, glute_m, calf_standing, calf_seated, tbar_row, chest_row, incline_m, lat_raise_m, preacher_m, triceps_m, pullover_m, ghr, tib_bar, crunch_m, squat_bb, deadlift, bench_bb, ohp_bb, row_bb, rdl.
