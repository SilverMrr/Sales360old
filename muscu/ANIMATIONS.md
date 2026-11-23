# Animations 2D des exercices — fichier de passation

À lire en début de session pour continuer les animations sans relire l'historique.
Consigne de l'utilisateur : **animations 2D simplifiées, cohérentes et claires, le plus épuré possible**. On ne cherche pas le « plus beau » mais la lisibilité.

## Contexte
- App : `muscu/` (site statique, pas de build). En ligne : https://muscu-atlas.netlify.app
- Branche git : `claude/clever-keller-m3mlxa` (dépôt SilverMrr/Sales360old). Committer + pousser après chaque lot.
- L'app est documentaire (pas de suivi). Les animations s’affichent en tête de la fiche exercice (page plein écran sur mobile, fenêtre sur ordinateur), avec boutons Pause / Ralenti, et l'étiquette « ▶ Animé » sur les cartes.

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
  - Vue de face : pas de helper, dessin manuel (voir `lat_pd`, `lat_raise_db`).
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

## Fait (10)
leg_ext, leg_curl, leg_press, chest_press, shoulder_press_m, seated_row, lat_pd, pushdown, curl_db, lat_raise_db

## À faire — priorisé (exercices « courants en salle »)
Les variantes indiquées « ≈ X » peuvent réutiliser la cinématique de X (changer matériel/poignée).

**Lot 2 — bases les plus utilisées**
1. bench_smith (développé couché, profil) · ≈ bench_db, close_bench_smith
2. incline_db (développé incliné) · ≈ incline_smith
3. pec_deck (vue de dessus ou face) · ≈ reverse_pec_deck (sens inverse)
4. cable_cross (face) · ≈ cable_fly_low, fly_db
5. ohp_db (développé épaules) · ≈ ohp_smith, arnold
6. smith_squat (profil) · ≈ goblet, sumo_squat
7. rdl_db (soulevé de terre roumain) · ≈ rdl_smith, trap_dl_db
8. hip_thrust · ≈ glute_bridge
9. row_db (rowing unilatéral) · ≈ row_smith
10. pullup_assist (face) · ≈ pullup, chinup, chinup_assist
11. lat_pd_close (profil) · ≈ lat_pd_uni
12. abduction_m (face) · adduction_m (face)

**Lot 3 — bras, épaules, mollets**
rope_pushdown (≈ pushdown), overhead_cable (≈ overhead_db), skullcrusher, kickback, curl_ez (≈ cable_curl, reverse_curl), hammer_curl (≈ rope_curl), incline_curl (≈ bayesian_curl), preacher_db, face_pull, rear_fly_db (≈ cable_rear_fly), lat_raise_cable, upright_row, shrug_db (≈ shrug_smith), calf_leg_press (≈ calf_smith, calf_db)

**Lot 4 — tronc, jambes unilatérales, divers**
cable_crunch, crunch (≈ reverse_crunch), captain_chair (≈ hanging_leg_raise), plank (≈ side_plank), ab_wheel, woodchopper, pallof, bulgarian (≈ lunges, step_up), back_ext, kb_swing, cable_kickback, cable_abduction, straight_arm, pushup, dips_chest (≈ dips_assist), nordic, sissy

**Lot 5 — rares**
ext_rot_cable, wrist_curl, farmer, dead_hang, tib_raise, neck_flex, neck_ext

Hors « courant » (matériel « si disponible ») : à faire seulement après — hack_squat, pendulum, hip_thrust_m, glute_m, calf_standing, calf_seated, tbar_row, chest_row, incline_m, lat_raise_m, preacher_m, triceps_m, pullover_m, ghr, tib_bar, crunch_m, squat_bb, deadlift, bench_bb, ohp_bb, row_bb, rdl.
