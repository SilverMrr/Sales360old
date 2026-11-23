// Base de données muscles + exercices.
// Repères de volume hebdo (séries effectives/semaine) inspirés des "volume landmarks"
// (MEV = volume minimum efficace, MRV = volume maximum récupérable). Ce sont des ordres
// de grandeur moyens, à ajuster à l'individu.

export const MUSCLES = {
  pecs:       { name: 'Pectoraux',            group: 'Poitrine', size: 'L', mev: 8,  mrv: 22, latin: 'Pectoralis major / minor' },
  delt_ant:   { name: 'Deltoïde antérieur',   group: 'Épaules',  size: 'S', mev: 2,  mrv: 12, latin: 'Deltoideus pars clavicularis' },
  delt_lat:   { name: 'Deltoïde latéral',     group: 'Épaules',  size: 'S', mev: 8,  mrv: 26, latin: 'Deltoideus pars acromialis' },
  delt_post:  { name: 'Deltoïde postérieur',  group: 'Épaules',  size: 'S', mev: 6,  mrv: 24, latin: 'Deltoideus pars spinalis' },
  biceps:     { name: 'Biceps',               group: 'Bras',     size: 'S', mev: 8,  mrv: 26, latin: 'Biceps brachii / brachialis' },
  triceps:    { name: 'Triceps',              group: 'Bras',     size: 'S', mev: 6,  mrv: 18, latin: 'Triceps brachii' },
  forearms:   { name: 'Avant-bras',           group: 'Bras',     size: 'S', mev: 2,  mrv: 25, latin: 'Fléchisseurs / extenseurs, brachioradial' },
  traps:      { name: 'Trapèzes',             group: 'Dos',      size: 'M', mev: 4,  mrv: 26, latin: 'Trapezius' },
  rhomboids:  { name: 'Rhomboïdes / milieu du dos', group: 'Dos', size: 'M', mev: 6, mrv: 22, latin: 'Rhomboideus, teres major' },
  lats:       { name: 'Grand dorsal',         group: 'Dos',      size: 'L', mev: 10, mrv: 25, latin: 'Latissimus dorsi' },
  lowerback:  { name: 'Lombaires',            group: 'Dos',      size: 'M', mev: 2,  mrv: 12, latin: 'Erector spinae' },
  abs:        { name: 'Abdominaux',           group: 'Tronc',    size: 'M', mev: 6,  mrv: 25, latin: 'Rectus abdominis' },
  obliques:   { name: 'Obliques',             group: 'Tronc',    size: 'M', mev: 2,  mrv: 16, latin: 'Obliquus externus / internus' },
  glutes:     { name: 'Fessiers',             group: 'Jambes',   size: 'L', mev: 4,  mrv: 16, latin: 'Gluteus maximus' },
  abductors:  { name: 'Abducteurs',           group: 'Jambes',   size: 'S', mev: 2,  mrv: 16, latin: 'Gluteus medius / minimus, TFL' },
  adductors:  { name: 'Adducteurs',           group: 'Jambes',   size: 'M', mev: 2,  mrv: 16, latin: 'Adductor magnus / longus / brevis' },
  quads:      { name: 'Quadriceps',           group: 'Jambes',   size: 'L', mev: 8,  mrv: 20, latin: 'Quadriceps femoris' },
  hamstrings: { name: 'Ischio-jambiers',      group: 'Jambes',   size: 'L', mev: 6,  mrv: 20, latin: 'Biceps femoris, semi-tendineux, semi-membraneux' },
  calves:     { name: 'Mollets',              group: 'Jambes',   size: 'S', mev: 8,  mrv: 20, latin: 'Gastrocnemius / soleus' },
  tibialis:   { name: 'Tibial antérieur',     group: 'Jambes',   size: 'S', mev: 0,  mrv: 12, latin: 'Tibialis anterior' },
  neck:       { name: 'Cou',                  group: 'Tronc',    size: 'S', mev: 0,  mrv: 12, latin: 'Sterno-cléido-mastoïdien, splenius' },
};

export const EQUIPMENT = ['Barre', 'Haltères', 'Machine', 'Poulie', 'Smith', 'Poids du corps', 'Kettlebell', 'Élastique'];

// [id, nom, matériel, [primaires], [secondaires], 'poly'|'iso', machine / précision, conseil]
const RAW = [
  // ---------- PECTORAUX
  ['bench_bb', 'Développé couché', 'Barre', ['pecs'], ['delt_ant', 'triceps'], 'poly', 'Banc plat', 'Omoplates serrées, pieds ancrés, barre au bas des pecs.'],
  ['incline_bb', 'Développé incliné', 'Barre', ['pecs'], ['delt_ant', 'triceps'], 'poly', 'Banc incliné 30°', 'Inclinaison 25–35° pour cibler le faisceau claviculaire.'],
  ['decline_bb', 'Développé décliné', 'Barre', ['pecs'], ['triceps'], 'poly', 'Banc décliné', 'Amplitude plus courte, accent sur le faisceau sternal bas.'],
  ['bench_db', 'Développé couché haltères', 'Haltères', ['pecs'], ['delt_ant', 'triceps'], 'poly', 'Banc plat', 'Plus d’amplitude que la barre, descendre jusqu’à l’étirement.'],
  ['incline_db', 'Développé incliné haltères', 'Haltères', ['pecs'], ['delt_ant', 'triceps'], 'poly', 'Banc incliné 30°', 'Coudes ~45° du buste.'],
  ['fly_db', 'Écarté couché haltères', 'Haltères', ['pecs'], ['delt_ant'], 'iso', 'Banc plat', 'Coudes légèrement fléchis et fixes.'],
  ['incline_fly_db', 'Écarté incliné haltères', 'Haltères', ['pecs'], ['delt_ant'], 'iso', 'Banc incliné', ''],
  ['pec_deck', 'Pec deck (butterfly)', 'Machine', ['pecs'], [], 'iso', 'Machine Pec deck', 'Régler les poignées à hauteur de poitrine.'],
  ['chest_press', 'Chest press', 'Machine', ['pecs'], ['delt_ant', 'triceps'], 'poly', 'Chest press convergente', 'Siège réglé pour poignées à mi-pecs.'],
  ['incline_press_m', 'Développé incliné machine', 'Machine', ['pecs'], ['delt_ant', 'triceps'], 'poly', 'Hammer Strength / incline press', ''],
  ['cable_cross', 'Crossover poulie haute', 'Poulie', ['pecs'], ['delt_ant'], 'iso', 'Vis-à-vis de poulies', 'Ramener les mains vers le bas et le centre.'],
  ['cable_fly_low', 'Écarté poulie basse', 'Poulie', ['pecs'], ['delt_ant'], 'iso', 'Vis-à-vis de poulies', 'Trajectoire bas → haut, cible le haut des pecs.'],
  ['smith_bench', 'Développé couché Smith', 'Smith', ['pecs'], ['delt_ant', 'triceps'], 'poly', 'Smith machine', ''],
  ['smith_incline', 'Développé incliné Smith', 'Smith', ['pecs'], ['delt_ant', 'triceps'], 'poly', 'Smith machine + banc incliné', ''],
  ['pushup', 'Pompes', 'Poids du corps', ['pecs'], ['delt_ant', 'triceps', 'abs'], 'poly', '', 'Gainage strict, poitrine au sol.'],
  ['dips_chest', 'Dips buste penché', 'Poids du corps', ['pecs'], ['triceps', 'delt_ant'], 'poly', 'Barres parallèles', 'Buste penché en avant, coudes ouverts.'],
  ['pullover_db', 'Pull-over haltère', 'Haltères', ['pecs', 'lats'], ['triceps'], 'iso', 'Banc plat', ''],
  // ---------- DELTOÏDE ANTÉRIEUR
  ['ohp_bb', 'Développé militaire', 'Barre', ['delt_ant'], ['delt_lat', 'triceps', 'traps'], 'poly', 'Debout', 'Fessiers serrés, barre passe devant le visage.'],
  ['ohp_db', 'Développé épaules haltères', 'Haltères', ['delt_ant'], ['delt_lat', 'triceps'], 'poly', 'Banc à dossier 80–90°', ''],
  ['arnold', 'Arnold press', 'Haltères', ['delt_ant'], ['delt_lat', 'triceps'], 'poly', 'Banc à dossier', ''],
  ['shoulder_press_m', 'Shoulder press', 'Machine', ['delt_ant'], ['delt_lat', 'triceps'], 'poly', 'Machine développé épaules', ''],
  ['smith_ohp', 'Développé militaire Smith', 'Smith', ['delt_ant'], ['delt_lat', 'triceps'], 'poly', 'Smith machine', ''],
  ['front_raise_db', 'Élévations frontales', 'Haltères', ['delt_ant'], [], 'iso', '', ''],
  ['front_raise_cable', 'Élévations frontales poulie', 'Poulie', ['delt_ant'], [], 'iso', 'Poulie basse', ''],
  ['landmine_press', 'Landmine press', 'Barre', ['delt_ant'], ['pecs', 'triceps'], 'poly', 'Landmine', 'Bonne option si épaules sensibles.'],
  // ---------- DELTOÏDE LATÉRAL
  ['lat_raise_db', 'Élévations latérales', 'Haltères', ['delt_lat'], [], 'iso', '', 'Monter dans le plan de l’omoplate, pas au-dessus des épaules.'],
  ['lat_raise_cable', 'Élévations latérales poulie', 'Poulie', ['delt_lat'], [], 'iso', 'Poulie basse, unilatéral', 'Tension maximale en bas d’amplitude.'],
  ['lat_raise_m', 'Élévations latérales machine', 'Machine', ['delt_lat'], [], 'iso', 'Machine lateral raise', ''],
  ['upright_row', 'Rowing menton', 'Barre', ['delt_lat'], ['traps', 'biceps'], 'poly', 'Barre droite ou EZ', 'Prise large, coudes au-dessus des mains.'],
  ['cable_y_raise', 'Y-raise poulie', 'Poulie', ['delt_lat'], ['delt_post', 'traps'], 'iso', 'Vis-à-vis de poulies', ''],
  // ---------- DELTOÏDE POSTÉRIEUR
  ['reverse_pec_deck', 'Reverse pec deck', 'Machine', ['delt_post'], ['rhomboids', 'traps'], 'iso', 'Machine Pec deck (sens inverse)', ''],
  ['rear_fly_db', 'Oiseau haltères', 'Haltères', ['delt_post'], ['rhomboids'], 'iso', 'Buste penché ou banc incliné', ''],
  ['face_pull', 'Face pull', 'Poulie', ['delt_post'], ['traps', 'rhomboids'], 'iso', 'Poulie haute + corde', 'Tirer vers le front, rotation externe en fin.'],
  ['cable_rear_fly', 'Oiseau poulies croisées', 'Poulie', ['delt_post'], ['rhomboids'], 'iso', 'Vis-à-vis de poulies', ''],
  // ---------- BICEPS
  ['curl_bb', 'Curl barre droite', 'Barre', ['biceps'], ['forearms'], 'iso', '', 'Coudes fixes, pas d’élan.'],
  ['curl_ez', 'Curl barre EZ', 'Barre', ['biceps'], ['forearms'], 'iso', 'Barre EZ', ''],
  ['curl_db', 'Curl haltères alterné', 'Haltères', ['biceps'], ['forearms'], 'iso', '', 'Supination complète en haut.'],
  ['hammer_curl', 'Curl marteau', 'Haltères', ['biceps', 'forearms'], [], 'iso', '', 'Cible brachial et brachioradial.'],
  ['incline_curl', 'Curl incliné haltères', 'Haltères', ['biceps'], [], 'iso', 'Banc incliné 45–60°', 'Étirement maximal du chef long.'],
  ['preacher_curl', 'Curl pupitre (Larry Scott)', 'Barre', ['biceps'], [], 'iso', 'Pupitre + barre EZ', ''],
  ['preacher_m', 'Curl pupitre machine', 'Machine', ['biceps'], [], 'iso', 'Machine biceps', ''],
  ['cable_curl', 'Curl poulie basse', 'Poulie', ['biceps'], ['forearms'], 'iso', 'Poulie basse', ''],
  ['bayesian_curl', 'Curl Bayesian', 'Poulie', ['biceps'], [], 'iso', 'Poulie basse, dos à la poulie', ''],
  ['concentration_curl', 'Curl concentré', 'Haltères', ['biceps'], [], 'iso', 'Assis, coude sur la cuisse', ''],
  // ---------- TRICEPS
  ['pushdown', 'Extension triceps poulie haute', 'Poulie', ['triceps'], [], 'iso', 'Poulie haute + barre', ''],
  ['rope_pushdown', 'Extension poulie corde', 'Poulie', ['triceps'], [], 'iso', 'Poulie haute + corde', 'Écarter la corde en bas.'],
  ['overhead_cable', 'Extension au-dessus de la tête poulie', 'Poulie', ['triceps'], [], 'iso', 'Poulie + corde', 'Étirement du chef long.'],
  ['skullcrusher', 'Barre au front', 'Barre', ['triceps'], [], 'iso', 'Barre EZ + banc plat', ''],
  ['overhead_db', 'Extension nuque haltère', 'Haltères', ['triceps'], [], 'iso', 'Assis', ''],
  ['close_bench', 'Développé couché prise serrée', 'Barre', ['triceps'], ['pecs', 'delt_ant'], 'poly', 'Banc plat', 'Mains largeur d’épaules.'],
  ['dips_tri', 'Dips buste droit', 'Poids du corps', ['triceps'], ['pecs', 'delt_ant'], 'poly', 'Barres parallèles', ''],
  ['dips_m', 'Dips machine', 'Machine', ['triceps'], ['pecs'], 'poly', 'Machine dips assise', ''],
  ['kickback', 'Kickback haltère', 'Haltères', ['triceps'], [], 'iso', '', ''],
  ['tri_ext_m', 'Extension triceps machine', 'Machine', ['triceps'], [], 'iso', 'Machine triceps', ''],
  // ---------- AVANT-BRAS
  ['wrist_curl', 'Curl poignets', 'Barre', ['forearms'], [], 'iso', 'Avant-bras sur banc', ''],
  ['rev_wrist_curl', 'Extension poignets', 'Barre', ['forearms'], [], 'iso', 'Avant-bras sur banc', ''],
  ['reverse_curl', 'Curl inversé', 'Barre', ['forearms'], ['biceps'], 'iso', 'Barre EZ, prise pronation', ''],
  ['farmer', 'Farmer walk', 'Haltères', ['forearms'], ['traps', 'abs', 'obliques'], 'poly', 'Haltères lourds / trap bar', ''],
  ['dead_hang', 'Suspension barre fixe', 'Poids du corps', ['forearms'], ['lats'], 'iso', 'Barre de traction', 'Se mesure en secondes (saisir le temps en reps).'],
  // ---------- TRAPÈZES
  ['shrug_bb', 'Shrug barre', 'Barre', ['traps'], ['forearms'], 'iso', '', 'Monter les épaules vers les oreilles, pause 1 s.'],
  ['shrug_db', 'Shrug haltères', 'Haltères', ['traps'], ['forearms'], 'iso', '', ''],
  ['shrug_m', 'Shrug machine', 'Machine', ['traps'], [], 'iso', 'Machine shrug / Smith', ''],
  ['rack_pull', 'Rack pull', 'Barre', ['traps', 'lowerback'], ['glutes', 'hamstrings', 'forearms'], 'poly', 'Cage, départ genoux', ''],
  // ---------- MILIEU DU DOS / RHOMBOÏDES
  ['row_bb', 'Rowing barre buste penché', 'Barre', ['rhomboids', 'lats'], ['delt_post', 'biceps', 'lowerback'], 'poly', '', 'Buste ~45°, tirer vers le nombril.'],
  ['pendlay', 'Pendlay row', 'Barre', ['rhomboids', 'lats'], ['delt_post', 'biceps', 'lowerback'], 'poly', 'Départ au sol chaque rep', ''],
  ['row_db', 'Rowing haltère unilatéral', 'Haltères', ['lats', 'rhomboids'], ['delt_post', 'biceps'], 'poly', 'Appui sur banc', ''],
  ['seal_row', 'Seal row', 'Barre', ['rhomboids', 'lats'], ['delt_post', 'biceps'], 'poly', 'Banc surélevé', 'Zéro triche possible, très précis.'],
  ['tbar_row', 'Rowing T-bar', 'Barre', ['rhomboids', 'lats'], ['delt_post', 'biceps', 'lowerback'], 'poly', 'T-bar / landmine', ''],
  ['seated_cable_row', 'Tirage horizontal poulie', 'Poulie', ['rhomboids', 'lats'], ['delt_post', 'biceps'], 'poly', 'Poulie basse assise, poignée triangle', ''],
  ['row_m', 'Rowing machine convergente', 'Machine', ['rhomboids', 'lats'], ['delt_post', 'biceps'], 'poly', 'Hammer Strength row', ''],
  ['chest_supported_row', 'Rowing poitrine appuyée', 'Machine', ['rhomboids'], ['lats', 'delt_post', 'biceps'], 'poly', 'Machine chest-supported row', ''],
  // ---------- GRAND DORSAL
  ['pullup', 'Tractions pronation', 'Poids du corps', ['lats'], ['biceps', 'rhomboids', 'forearms'], 'poly', 'Barre fixe', 'Lest possible : saisir la charge ajoutée.'],
  ['chinup', 'Tractions supination', 'Poids du corps', ['lats', 'biceps'], ['rhomboids'], 'poly', 'Barre fixe', ''],
  ['assisted_pullup', 'Tractions assistées', 'Machine', ['lats'], ['biceps', 'rhomboids'], 'poly', 'Machine traction/dips assistée', 'Saisir l’assistance en négatif si souhaité.'],
  ['lat_pulldown', 'Tirage vertical prise large', 'Poulie', ['lats'], ['biceps', 'rhomboids'], 'poly', 'Poulie haute / lat pulldown', 'Tirer les coudes vers les hanches.'],
  ['lat_pulldown_close', 'Tirage vertical prise serrée neutre', 'Poulie', ['lats'], ['biceps', 'rhomboids'], 'poly', 'Poulie haute + poignée V', ''],
  ['lat_pulldown_uni', 'Tirage vertical unilatéral', 'Poulie', ['lats'], ['biceps'], 'poly', 'Poulie haute, poignée simple', ''],
  ['lat_pulldown_m', 'Tirage vertical convergent', 'Machine', ['lats'], ['biceps', 'rhomboids'], 'poly', 'Hammer Strength pulldown', ''],
  ['straight_arm', 'Pull-over poulie bras tendus', 'Poulie', ['lats'], ['triceps'], 'iso', 'Poulie haute + corde/barre', ''],
  ['pullover_m', 'Pull-over machine', 'Machine', ['lats'], [], 'iso', 'Machine pull-over', ''],
  // ---------- LOMBAIRES
  ['deadlift', 'Soulevé de terre', 'Barre', ['lowerback', 'glutes', 'hamstrings'], ['quads', 'traps', 'forearms', 'lats'], 'poly', '', 'Barre collée aux tibias, dos neutre.'],
  ['back_ext', 'Extension lombaires 45°', 'Poids du corps', ['lowerback'], ['glutes', 'hamstrings'], 'iso', 'Banc à lombaires 45°', ''],
  ['back_ext_m', 'Machine lombaires', 'Machine', ['lowerback'], ['glutes'], 'iso', 'Machine extension lombaire', ''],
  ['good_morning', 'Good morning', 'Barre', ['hamstrings', 'lowerback'], ['glutes'], 'poly', '', ''],
  ['superman', 'Superman', 'Poids du corps', ['lowerback'], ['glutes'], 'iso', 'Au sol', ''],
  // ---------- ABDOMINAUX
  ['crunch', 'Crunch', 'Poids du corps', ['abs'], [], 'iso', 'Au sol', ''],
  ['cable_crunch', 'Crunch poulie haute', 'Poulie', ['abs'], [], 'iso', 'Poulie haute + corde, à genoux', 'Enrouler la colonne, hanches fixes.'],
  ['crunch_m', 'Crunch machine', 'Machine', ['abs'], [], 'iso', 'Machine abdominale', ''],
  ['leg_raise', 'Relevés de jambes suspendu', 'Poids du corps', ['abs'], ['obliques', 'forearms'], 'iso', 'Barre fixe', 'Enrouler le bassin.'],
  ['captain_chair', 'Relevés de jambes chaise romaine', 'Machine', ['abs'], ['obliques'], 'iso', 'Chaise romaine', ''],
  ['reverse_crunch', 'Crunch inversé', 'Poids du corps', ['abs'], [], 'iso', 'Banc ou sol', ''],
  ['ab_wheel', 'Roue abdominale', 'Poids du corps', ['abs'], ['lats', 'obliques'], 'poly', 'Roue', ''],
  ['plank', 'Gainage planche', 'Poids du corps', ['abs'], ['obliques'], 'iso', 'Au sol', 'Se mesure en secondes (saisir le temps en reps).'],
  // ---------- OBLIQUES
  ['side_plank', 'Gainage latéral', 'Poids du corps', ['obliques'], ['abductors'], 'iso', 'Au sol', 'Secondes en reps.'],
  ['woodchopper', 'Woodchopper', 'Poulie', ['obliques'], ['abs'], 'poly', 'Poulie haute ou basse', ''],
  ['russian_twist', 'Russian twist', 'Poids du corps', ['obliques'], ['abs'], 'iso', 'Disque ou médecine-ball', ''],
  ['pallof', 'Pallof press', 'Poulie', ['obliques'], ['abs'], 'iso', 'Poulie à hauteur de poitrine', 'Anti-rotation.'],
  ['side_bend', 'Flexion latérale haltère', 'Haltères', ['obliques'], [], 'iso', '', ''],
  // ---------- FESSIERS
  ['hip_thrust', 'Hip thrust', 'Barre', ['glutes'], ['hamstrings', 'quads'], 'poly', 'Banc + barre', 'Menton rentré, bassin en rétroversion en haut.'],
  ['hip_thrust_m', 'Hip thrust machine', 'Machine', ['glutes'], ['hamstrings'], 'poly', 'Machine hip thrust / glute drive', ''],
  ['glute_bridge', 'Pont fessier', 'Poids du corps', ['glutes'], ['hamstrings'], 'iso', 'Au sol', ''],
  ['cable_kickback', 'Kickback fessier poulie', 'Poulie', ['glutes'], ['hamstrings'], 'iso', 'Poulie basse + sangle cheville', ''],
  ['glute_kickback_m', 'Machine fessiers', 'Machine', ['glutes'], ['hamstrings'], 'iso', 'Glute kickback machine', ''],
  ['bulgarian', 'Fente bulgare', 'Haltères', ['quads', 'glutes'], ['adductors', 'hamstrings'], 'poly', 'Pied arrière sur banc', 'Buste penché = plus de fessiers.'],
  ['rdl', 'Soulevé de terre roumain', 'Barre', ['hamstrings', 'glutes'], ['lowerback', 'forearms'], 'poly', '', 'Hanches en arrière, genoux légèrement fléchis.'],
  ['sumo_dl', 'Soulevé de terre sumo', 'Barre', ['glutes', 'adductors', 'quads'], ['hamstrings', 'lowerback', 'traps'], 'poly', '', ''],
  // ---------- ABDUCTEURS
  ['abduction_m', 'Machine abducteurs', 'Machine', ['abductors'], ['glutes'], 'iso', 'Machine abduction', 'Buste penché en avant = plus de grand fessier.'],
  ['cable_abduction', 'Abduction poulie', 'Poulie', ['abductors'], [], 'iso', 'Poulie basse + sangle', ''],
  ['band_walk', 'Marche latérale élastique', 'Élastique', ['abductors'], ['glutes'], 'iso', 'Mini-band', ''],
  // ---------- ADDUCTEURS
  ['adduction_m', 'Machine adducteurs', 'Machine', ['adductors'], [], 'iso', 'Machine adduction', ''],
  ['copenhagen', 'Copenhagen plank', 'Poids du corps', ['adductors'], ['obliques'], 'iso', 'Banc', 'Secondes en reps.'],
  ['sumo_squat', 'Squat sumo haltère', 'Haltères', ['adductors', 'quads'], ['glutes'], 'poly', '', ''],
  // ---------- QUADRICEPS
  ['squat_bb', 'Squat', 'Barre', ['quads', 'glutes'], ['adductors', 'lowerback'], 'poly', 'Cage / rack', 'Genoux dans l’axe des pieds, profondeur sous la parallèle.'],
  ['front_squat', 'Front squat', 'Barre', ['quads'], ['glutes', 'abs'], 'poly', 'Cage / rack', ''],
  ['hack_squat', 'Hack squat', 'Machine', ['quads'], ['glutes', 'adductors'], 'poly', 'Machine hack squat', ''],
  ['pendulum', 'Pendulum squat', 'Machine', ['quads'], ['glutes'], 'poly', 'Pendulum squat', ''],
  ['leg_press', 'Presse à cuisses 45°', 'Machine', ['quads'], ['glutes', 'adductors'], 'poly', 'Presse inclinée 45°', 'Pieds bas = plus de quadriceps.'],
  ['leg_press_h', 'Presse horizontale', 'Machine', ['quads'], ['glutes'], 'poly', 'Presse assise horizontale', ''],
  ['belt_squat', 'Belt squat', 'Machine', ['quads', 'glutes'], ['adductors'], 'poly', 'Belt squat', 'Zéro charge axiale sur la colonne.'],
  ['leg_ext', 'Leg extension', 'Machine', ['quads'], [], 'iso', 'Machine leg extension', 'Pivot aligné avec le genou.'],
  ['smith_squat', 'Squat Smith', 'Smith', ['quads'], ['glutes', 'adductors'], 'poly', 'Smith machine', ''],
  ['goblet', 'Goblet squat', 'Kettlebell', ['quads'], ['glutes', 'abs'], 'poly', 'Kettlebell ou haltère', ''],
  ['lunges_db', 'Fentes marchées', 'Haltères', ['quads', 'glutes'], ['adductors', 'hamstrings'], 'poly', '', ''],
  ['step_up', 'Step-up', 'Haltères', ['quads', 'glutes'], [], 'poly', 'Banc / box', ''],
  ['sissy', 'Sissy squat', 'Poids du corps', ['quads'], [], 'iso', 'Support sissy', ''],
  // ---------- ISCHIO-JAMBIERS
  ['lying_curl', 'Leg curl allongé', 'Machine', ['hamstrings'], ['calves'], 'iso', 'Machine leg curl allongé', ''],
  ['seated_curl', 'Leg curl assis', 'Machine', ['hamstrings'], [], 'iso', 'Machine leg curl assis', 'Meilleur étirement → souvent supérieur en hypertrophie.'],
  ['standing_curl', 'Leg curl debout unilatéral', 'Machine', ['hamstrings'], [], 'iso', 'Machine leg curl debout', ''],
  ['nordic', 'Nordic curl', 'Poids du corps', ['hamstrings'], [], 'iso', 'Ancrage chevilles', ''],
  ['glute_ham', 'Glute-ham raise', 'Machine', ['hamstrings'], ['glutes', 'calves'], 'poly', 'GHD', ''],
  ['rdl_db', 'Soulevé de terre roumain haltères', 'Haltères', ['hamstrings', 'glutes'], ['lowerback'], 'poly', '', ''],
  ['kb_swing', 'Kettlebell swing', 'Kettlebell', ['glutes', 'hamstrings'], ['lowerback', 'abs'], 'poly', '', ''],
  // ---------- MOLLETS
  ['calf_standing', 'Mollets debout', 'Machine', ['calves'], [], 'iso', 'Machine mollets debout', 'Pause 1–2 s en étirement.'],
  ['calf_seated', 'Mollets assis', 'Machine', ['calves'], [], 'iso', 'Machine mollets assis (soléaire)', ''],
  ['calf_leg_press', 'Mollets à la presse', 'Machine', ['calves'], [], 'iso', 'Presse à cuisses', ''],
  ['calf_smith', 'Mollets debout Smith', 'Smith', ['calves'], [], 'iso', 'Smith + step', ''],
  ['calf_single', 'Mollets unilatéral', 'Haltères', ['calves'], [], 'iso', 'Sur marche', ''],
  ['donkey', 'Donkey calf raise', 'Machine', ['calves'], [], 'iso', 'Machine donkey', ''],
  // ---------- TIBIAL
  ['tib_raise', 'Tibialis raise', 'Poids du corps', ['tibialis'], [], 'iso', 'Dos au mur', ''],
  ['tib_bar', 'Tib bar curl', 'Machine', ['tibialis'], [], 'iso', 'Tib bar / machine tibial', ''],
  // ---------- COU
  ['neck_flex', 'Flexion du cou', 'Poids du corps', ['neck'], [], 'iso', 'Disque sur le front, allongé', ''],
  ['neck_ext', 'Extension du cou harnais', 'Poids du corps', ['neck'], ['traps'], 'iso', 'Harnais de cou', ''],
  ['neck_m', 'Machine cou 4 directions', 'Machine', ['neck'], ['traps'], 'iso', 'Machine 4-way neck', ''],
];

export const EXERCISES = Object.fromEntries(
  RAW.map(([id, name, equip, primary, secondary, mech, machine, tip]) => [
    id, { id, name, equip, primary, secondary, mech, machine, tip },
  ])
);

export function exercisesForMuscle(muscleId) {
  const list = Object.values(EXERCISES);
  return {
    primary: list.filter(e => e.primary.includes(muscleId)),
    secondary: list.filter(e => !e.primary.includes(muscleId) && e.secondary.includes(muscleId)),
  };
}

// Classification pour ratios d'équilibre
export const PUSH = ['pecs', 'delt_ant', 'delt_lat', 'triceps'];
export const PULL = ['lats', 'rhomboids', 'delt_post', 'biceps', 'traps'];
