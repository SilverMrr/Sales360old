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

## Fait (67)
Lot 1 : leg_ext, leg_curl, leg_press, chest_press, shoulder_press_m, seated_row, lat_pd, pushdown, curl_db, lat_raise_db

Lot 2 (23/11/2026) — consigne : « les exercices les plus efficaces pour chaque muscle ». Choix = pour chaque muscle sans animation, l'exercice au matériel courant avec la plus forte part `act` de ce muscle :
pec_deck (pectoraux), reverse_pec_deck (deltoïde postérieur, vue de dos), ext_rot_cable (coiffe), wrist_curl (avant-bras), shrug_db (trapèzes), straight_arm (grand dorsal), back_ext (lombaires), crunch (abdominaux), woodchopper (obliques), hip_thrust (fessiers), abduction_m, adduction_m, captain_chair (fléchisseurs de hanche), calf_leg_press (mollets), tib_raise (tibial), neck_flex (cou).
Tous les muscles ont maintenant au moins une animation, sauf le dentelé (aucun exercice ne le cible, ≤ 10 %).

Lot 3 (23/11/2026) — même consigne, rang suivant : pour chaque muscle, l'exercice non encore animé (matériel courant) avec la plus forte part `act`. Isométriques purs écartés (dead_hang → reverse_curl). 23 exercices :
cable_cross (pectoraux), ohp_db (deltoïde antérieur), overhead_cable (triceps), cable_crunch (abdominaux), lat_raise_cable (deltoïde latéral), shrug_smith (trapèzes), face_pull (coiffe), incline_curl (biceps), cable_rear_fly (deltoïde postérieur, vue de dos), row_smith (rhomboïdes), reverse_curl (avant-bras), lat_pd_uni (grand dorsal, à genoux, vue de face), pallof (obliques), cable_kickback (fessiers), calf_smith (mollets), trap_dl_db (lombaires), nordic (ischios), sissy (quadriceps), sumo_squat (adducteurs), hanging_leg_raise (fléchisseurs de hanche), cable_abduction (abducteurs), neck_ext (cou), ab_wheel (dentelé / abdominaux).
Nouveaux outils : `dumbbell(s, r)` → `(main, angle)` (haltère orienté), `frontArm(s)` → `(S, E, H)` (bras de face avec contour, à utiliser dès qu'un bras passe devant le tronc), `pulley(s, x, y)`, `STAND` (jambes debout de profil), `pecD(tp, x, shY)`.
Corrections moteur : `band()` décale d'un demi-pixel un trait parfaitement vertical/horizontal (sinon le dégradé `objectBoundingBox` ne s'affiche pas). Côtés corrigés : chest_press allumait le dos au lieu des pectoraux, seated_row la poitrine au lieu du dos.
Lot 4 (23/11/2026) — même consigne, 3e rang : pour chaque muscle, l'exercice non encore animé (matériel courant) avec la plus forte part `act` ; isométriques purs écartés (dead_hang, plank, side_plank, farmer) ; doublon → suivant. Sans nouvel exercice : coiffe (seul dead_hang), obliques (isométriques), fléchisseurs de hanche, tibial (tib_bar hors courant), cou. 18 exercices :
fly_db (pectoraux, vue depuis les pieds), arnold (deltoïde antérieur, face), overhead_db (triceps), ohp_smith (dentelé — 1er non isométrique), reverse_crunch (abdominaux), upright_row (deltoïde latéral, face), rear_fly_db (deltoïde postérieur + trapèzes, vue de dos buste penché), bayesian_curl (biceps), row_db (rhomboïdes), hammer_curl (avant-bras), lat_pd_close (grand dorsal), glute_bridge (fessiers), calf_db (mollets), rdl_db (lombaires), rdl_smith (ischios), smith_squat (quadriceps), goblet (adducteurs, de profil), step_up (abducteurs).
Nouveaux outils : `seatBench(s)` + `SEAT` (banc assis, jambes), `endOn(s)` (haltère vu de bout), famille `rdl(smith)`. Convention squats : k = 1 en bas (comme sumo_squat) ; soulevés de terre : k = 1 debout.
Vérification sans serveur : page de test autonome (anim.js inliné, `export` retirés, T lu dans le hash) capturée par Chrome headless `--screenshot` (`file://…#1.3`).
**Règle des côtés de `band(s, w, side)`** : normale écran = (−dy, dx) du segment a→b. Tronc hanche→épaule vers le haut : `+1` = avant (pecs, abdos), `−1` = dos. Segment vers le bas (bras, cuisse, tibia) : `+1` = arrière (triceps, ischios, mollets), `−1` = avant (biceps, quadriceps).

## À faire — OBJECTIF : 100 % des exercices animés (89 restants au 23/11/2026)

**Consigne de l'utilisateur : animer TOUS les exercices qui n'ont pas encore d'animation, sans exception** (courants, « si disponible », isométriques compris). On ne s'arrête que quand la liste des manquants est vide.

**Où écrire (important)**
- Les animations s'écrivent **uniquement dans `muscu/js/anim.js`** (registre `A[id] = { view, muscles, build }`, l'id doit être exactement celui de l'exercice). Mettre à jour ce fichier-ci (`ANIMATIONS.md`) à chaque lot.
- Les exercices sont définis dans **deux fichiers** : `muscu/js/exercises.js` (116 d'origine) **et `muscu/js/exercises2.js`** (40 ajoutés le 23/11/2026). Les lire pour les ids, le matériel et les muscles `act`. **Ne pas les modifier** (ni `app.js`, `body.js`, `data.js`, `styles.css`, `index.html`) : une autre session y travaille. Seule exception : le numéro de cache dans `sw.js` (prendre le plus grand numéro existant + 1 ; en cas de conflit git, garder le plus grand + 1).
- Avant de pousser : `git fetch origin claude/clever-keller-m3mlxa && git merge --no-edit FETCH_HEAD`.

**Lister les manquants** (à relancer en début et fin de lot) :
```bash
cd muscu && node -e "globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};(async()=>{const d=await import('./js/data.js');const {ANIM_IDS}=await import('./js/anim.js');const s=new Set(ANIM_IDS);const m=Object.keys(d.EXERCISES).filter(i=>!s.has(i));console.log(m.length,m.join(', '))})()"
```

**Isométriques** (planche, gainage, suspension, hollow, farmer…) : animer une légère respiration / oscillation (k de 0 à 1 = mise en tension), muscle allumé en continu. Ne plus les écarter.

**Liste restante, groupée par cinématique** (« ≈ » = réutiliser la même cinématique en changeant matériel/poignée) :
- Développés couchés : bench_smith ≈ bench_bb, bench_db, close_bench_smith, floor_press_db, decline_db ; incline_db ≈ incline_smith, incline_bb, incline_m
- Pompes / dips : pushup ≈ pushup_incline, pushup_decline, diamond_pushup ; dips_chest ≈ dips_assist, bench_dips, triceps_m
- Pecs poulies : cable_fly_low, cable_press
- Épaules : ohp_bb ; lat_raise_m ≈ lean_lat_raise ; front_raise_db ≈ front_raise_cable ; y_raise ; rear_delt_row ≈ high_row_cable
- Biceps : curl_ez ≈ curl_bb, cable_curl, rope_curl ; preacher_db ≈ preacher_m, spider_curl, concentration_curl
- Triceps : rope_pushdown ≈ pushdown_uni ; skullcrusher ; kickback
- Avant-bras : reverse_wrist_curl (≈ wrist_curl) ; farmer ; dead_hang
- Tractions : pullup_assist ≈ pullup, chinup, chinup_assist ; lat_pd_supine (≈ lat_pd)
- Rowings : row_bb ≈ tbar_row, chest_row, inverted_row ; row_cable_uni (≈ row_db) ; pullover_db ≈ pullover_m
- Charnière : deadlift ; rdl ≈ good_morning_smith, sl_rdl ; kb_swing ≈ pull_through ; ghr
- Squats / fentes : squat_bb ≈ hack_squat, pendulum, bw_squat ; bulgarian ≈ split_squat_smith, lunges, reverse_lunge ; leg_press_uni (≈ leg_press)
- Fessiers / adducteurs : hip_thrust_m ≈ hip_thrust_smith ; glute_m ; cable_adduction ; copenhagen
- Mollets / tibial : calf_standing ≈ calf_bw ; calf_seated ; tib_bar
- Tronc : crunch_m ; plank ≈ side_plank, hollow ; dead_bug ; russian_twist ; leg_raise_floor ≈ bicycle_crunch ; mountain_climber

Vérification inchangée (captures T = 0 et T = 1,3 pour chaque nouvel id, contrôle des côtés de `band`), puis commit, push, déploiement Netlify depuis `muscu/`.
