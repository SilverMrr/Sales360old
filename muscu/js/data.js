// Référentiel : muscles, équipement (profil Basic-Fit générique), paramètres d'entraînement.
import { EXERCISE_LIST } from './exercises.js';

// mev / mrv : repères de volume hebdomadaire (séries) pour l'hypertrophie, valeurs moyennes à individualiser.
export const MUSCLES = {
  pecs:      { name: 'Pectoraux', group: 'Poitrine', latin: 'Pectoralis major (faisceaux claviculaire, sterno-costal, abdominal), pectoralis minor', mev: 8, mrv: 22,
    fn: 'Adduction horizontale du bras (ramener le bras devant soi), rotation interne, flexion de l’épaule (faisceau claviculaire).',
    tips: 'Haut des pectoraux : inclinaison 15–30° ou trajectoire bas → haut. Bas : déclinaison ou dips. Le plein étirement (haltères, écartés, machines convergentes) est le facteur le plus utile en hypertrophie.' },
  delt_ant:  { name: 'Deltoïde antérieur', group: 'Épaules', latin: 'Deltoideus, pars clavicularis', mev: 0, mrv: 12,
    fn: 'Flexion de l’épaule (lever le bras devant), rotation interne, aide à l’adduction horizontale.',
    tips: 'Déjà très sollicité par tous les développés (pecs et épaules). Un travail direct est rarement nécessaire si tu fais du développé.' },
  delt_lat:  { name: 'Deltoïde latéral', group: 'Épaules', latin: 'Deltoideus, pars acromialis', mev: 8, mrv: 26,
    fn: 'Abduction du bras (écarter le bras sur le côté), surtout entre 15° et 90°.',
    tips: 'Donne la largeur d’épaules. Peu sollicité par les développés : il faut des élévations latérales. Les poulies et machines gardent la tension en bas d’amplitude.' },
  delt_post: { name: 'Deltoïde postérieur', group: 'Épaules', latin: 'Deltoideus, pars spinalis', mev: 6, mrv: 24,
    fn: 'Extension et abduction horizontale du bras (tirer le bras vers l’arrière), rotation externe.',
    tips: 'Travaillé partiellement par les tirages ; un travail direct (oiseau, reverse pec deck, face pull) améliore l’équilibre de l’épaule et la posture.' },
  rotator:   { name: 'Coiffe des rotateurs', group: 'Épaules', latin: 'Supraspinatus, infraspinatus, teres minor, subscapularis', mev: 0, mrv: 12,
    fn: 'Stabilise la tête de l’humérus dans l’articulation ; rotations interne et externe ; initie l’abduction.',
    tips: 'Rôle surtout préventif. 2–4 séries/semaine de rotations externes ou de face pulls suffisent en complément.' },
  biceps:    { name: 'Biceps / brachial', group: 'Bras', latin: 'Biceps brachii (chefs long et court), brachialis, coracobrachialis', mev: 8, mrv: 26,
    fn: 'Flexion du coude, supination de l’avant-bras (biceps), flexion de l’épaule (chef long).',
    tips: 'Chef long étiré bras en arrière (curl incliné, curl Bayesian). Chef court : bras devant (curl pupitre). Brachial : prise neutre ou pronation (curl marteau, curl inversé).' },
  triceps:   { name: 'Triceps', group: 'Bras', latin: 'Triceps brachii (chefs long, latéral, médial), anconeus', mev: 6, mrv: 18,
    fn: 'Extension du coude ; le chef long participe aussi à l’extension de l’épaule.',
    tips: 'Le chef long (≈ la moitié du volume du muscle) n’est pleinement étiré que bras au-dessus de la tête : inclure une extension overhead.' },
  forearms:  { name: 'Avant-bras', group: 'Bras', latin: 'Brachioradialis, fléchisseurs et extenseurs du poignet et des doigts, pronateurs, supinateur', mev: 2, mrv: 25,
    fn: 'Flexion/extension du poignet et des doigts (préhension), pronation/supination ; le brachioradial fléchit le coude.',
    tips: 'La préhension est déjà travaillée par les tirages et soulevés lourds. Travail direct : curl poignets, curl inversé, farmer walk, suspension.' },
  traps:     { name: 'Trapèzes', group: 'Dos', latin: 'Trapezius (parties descendante, transverse, ascendante)', mev: 4, mrv: 26,
    fn: 'Haut : élévation de l’omoplate (hausser les épaules). Milieu : rapprochement des omoplates. Bas : abaissement et rotation vers le haut.',
    tips: 'Haut : shrugs. Milieu et bas : rowings coudes écartés, face pull, Y-raise.' },
  rhomboids: { name: 'Milieu du dos', group: 'Dos', latin: 'Rhomboideus major/minor, teres major', mev: 6, mrv: 22,
    fn: 'Rapprochement et abaissement des omoplates ; le grand rond aide à l’extension et à la rotation interne du bras.',
    tips: 'Rowings horizontaux en fin de mouvement omoplates serrées, coudes plus écartés que pour cibler le grand dorsal.' },
  lats:      { name: 'Grand dorsal', group: 'Dos', latin: 'Latissimus dorsi', mev: 10, mrv: 25,
    fn: 'Extension, adduction et rotation interne du bras (ramener le bras vers la hanche).',
    tips: 'Tirages verticaux et rowings coudes près du corps vers la hanche. Le pull-over poulie isole le grand dorsal sans les biceps.' },
  lowerback: { name: 'Lombaires', group: 'Dos', latin: 'Erector spinae (iliocostal, longissimus, épineux), multifidus, quadratus lumborum', mev: 2, mrv: 12,
    fn: 'Extension et stabilisation de la colonne ; maintien du dos neutre sous charge.',
    tips: 'Très sollicités de façon isométrique par squat, soulevé de terre et rowings. Travail direct : extensions 45°, à charge modérée.' },
  abs:       { name: 'Abdominaux', group: 'Tronc', latin: 'Rectus abdominis, pyramidalis', mev: 6, mrv: 25,
    fn: 'Flexion du tronc (enrouler la colonne), rétroversion du bassin, gainage antérieur.',
    tips: 'Enrouler réellement la colonne (crunch poulie, crunch machine). Les relevés de jambes travaillent surtout les fléchisseurs de hanche si le bassin ne s’enroule pas.' },
  obliques:  { name: 'Obliques', group: 'Tronc', latin: 'Obliquus externus / internus abdominis', mev: 2, mrv: 16,
    fn: 'Rotation et inclinaison latérale du tronc, anti-rotation, compression abdominale.',
    tips: 'Woodchopper, Pallof press, gainage latéral, relevés de jambes avec rotation.' },
  serratus:  { name: 'Dentelé antérieur', group: 'Tronc', latin: 'Serratus anterior', mev: 0, mrv: 12,
    fn: 'Abduction (protraction) et rotation vers le haut de l’omoplate ; plaque l’omoplate contre la cage thoracique.',
    tips: 'Sollicité en fin de pompes (pousser le sol), développés au-dessus de la tête et pull-over. Utile pour la santé de l’épaule.' },
  glutes:    { name: 'Fessiers', group: 'Jambes', latin: 'Gluteus maximus', mev: 4, mrv: 16,
    fn: 'Extension de la hanche, rotation externe, rétroversion du bassin.',
    tips: 'Hip thrust (contraction maximale), squat profond et fente (étirement maximal), soulevé de terre roumain.' },
  abductors: { name: 'Abducteurs', group: 'Jambes', latin: 'Gluteus medius / minimus, tensor fasciae latae', mev: 2, mrv: 16,
    fn: 'Écarter la jambe sur le côté, stabiliser le bassin en appui sur une jambe.',
    tips: 'Machine abducteurs (buste penché en avant = plus de fessier). Très sollicités en unilatéral (fentes, step-up).' },
  adductors: { name: 'Adducteurs', group: 'Jambes', latin: 'Adductor magnus / longus / brevis, gracilis, pectineus', mev: 2, mrv: 16,
    fn: 'Ramener la jambe vers l’intérieur ; le grand adducteur est aussi un puissant extenseur de hanche.',
    tips: 'Le grand adducteur travaille fortement au squat profond et au soulevé de terre. Machine adducteurs en complément.' },
  quads:     { name: 'Quadriceps', group: 'Jambes', latin: 'Rectus femoris, vastus lateralis / medialis / intermedius', mev: 8, mrv: 20,
    fn: 'Extension du genou ; le droit fémoral fléchit aussi la hanche.',
    tips: 'Squats/presses avec genoux qui avancent au-delà des orteils. Leg extension pour le droit fémoral (inclinaison du dossier vers l’arrière = plus d’étirement).' },
  hamstrings:{ name: 'Ischio-jambiers', group: 'Jambes', latin: 'Biceps femoris, semitendinosus, semimembranosus', mev: 6, mrv: 20,
    fn: 'Flexion du genou et extension de la hanche.',
    tips: 'Combiner un mouvement de hanche (soulevé de terre roumain) et un mouvement de genou (leg curl). Le leg curl assis, plus étiré, est en général supérieur au leg curl allongé.' },
  hipflex:   { name: 'Fléchisseurs de hanche', group: 'Jambes', latin: 'Psoas major, iliacus, sartorius', mev: 0, mrv: 10,
    fn: 'Flexion de la hanche (monter le genou), stabilisation lombo-pelvienne.',
    tips: 'Travaillés par les relevés de jambes et la chaise romaine. Rarement besoin de travail direct en musculation.' },
  calves:    { name: 'Mollets', group: 'Jambes', latin: 'Gastrocnemius (jumeaux), soleus, plantaris', mev: 8, mrv: 20,
    fn: 'Extension de la cheville (monter sur la pointe des pieds). Jumeaux : genou tendu. Soléaire : genou fléchi.',
    tips: 'Pause 1–2 s en position étirée, amplitude complète. Genoux tendus pour les jumeaux, fléchis (mollets assis) pour le soléaire.' },
  tibialis:  { name: 'Tibial antérieur', group: 'Jambes', latin: 'Tibialis anterior', mev: 0, mrv: 12,
    fn: 'Flexion dorsale de la cheville (relever la pointe du pied).',
    tips: 'Travail facultatif, utile pour l’équilibre avec les mollets et la prévention en course.' },
  neck:      { name: 'Cou', group: 'Tronc', latin: 'Sternocleidomastoideus, splenius, scalènes, levator scapulae', mev: 0, mrv: 12,
    fn: 'Flexion, extension, inclinaison et rotation de la tête.',
    tips: 'Travail direct facultatif (sports de contact). Charges légères, mouvements lents.' },
};

// Équipement. std = présent dans la quasi-totalité des clubs Basic-Fit ; maybe = selon le club (« si disponible »).
export const EQUIPMENT = {
  dumbbells:   { name: 'Haltères', std: true },
  fixed_bars:  { name: 'Barres fixes (droites / EZ pré-chargées)', std: true },
  bench:       { name: 'Banc réglable', std: true },
  smith:       { name: 'Smith machine (barre guidée)', std: true },
  cable:       { name: 'Poulies réglables / vis-à-vis', std: true },
  lat_pd:      { name: 'Tirage vertical (lat pulldown)', std: true },
  seated_row:  { name: 'Tirage horizontal poulie', std: true },
  chest_press: { name: 'Chest press', std: true },
  shoulder_press: { name: 'Shoulder press', std: true },
  pec_deck:    { name: 'Pec deck / reverse fly', std: true },
  leg_press:   { name: 'Presse à cuisses', std: true },
  leg_ext:     { name: 'Leg extension', std: true },
  leg_curl:    { name: 'Leg curl (assis ou allongé selon le club)', std: true },
  abductor:    { name: 'Machine abducteurs', std: true },
  adductor:    { name: 'Machine adducteurs', std: true },
  assist:      { name: 'Traction / dips assistés', std: true },
  pullup_bar:  { name: 'Barre de traction / chaise romaine / dips', std: true },
  back_ext:    { name: 'Banc à lombaires 45°', std: true },
  kettlebell:  { name: 'Kettlebells', std: true },
  mat:         { name: 'Tapis / zone fonctionnelle', std: true },
  // ---- selon le club
  barbell:     { name: 'Rack + barre olympique et disques', std: false },
  ab_crunch:   { name: 'Machine abdominaux (crunch)', std: false },
  hack_squat:  { name: 'Hack squat', std: false },
  pendulum:    { name: 'Pendulum squat', std: false },
  hip_thrust_m:{ name: 'Machine hip thrust', std: false },
  glute_m:     { name: 'Machine fessiers (kickback)', std: false },
  calf_standing:{ name: 'Machine mollets debout', std: false },
  calf_seated: { name: 'Machine mollets assis', std: false },
  tbar:        { name: 'Rowing T-bar / landmine', std: false },
  chest_row:   { name: 'Rowing poitrine appuyée / rowing convergent', std: false },
  incline_m:   { name: 'Développé incliné machine', std: false },
  lateral_m:   { name: 'Machine élévations latérales', std: false },
  biceps_m:    { name: 'Machine biceps (pupitre)', std: false },
  triceps_m:   { name: 'Machine triceps / dips assis', std: false },
  pullover_m:  { name: 'Machine pull-over', std: false },
  ghd:         { name: 'GHD (glute-ham)', std: false },
  bands:       { name: 'Élastiques / mini-bands', std: false },
  tib_bar:     { name: 'Tib bar', std: false },
};

// Paramètres conseillés par objectif et type d'exercice (recommandations générales).
export const OBJECTIVES = {
  force:     { name: 'Force', poly: { sets: '4–5', reps: '3–6', rest: '3–5 min', rpe: '8–9', tempo: '2-1-X' }, iso: { sets: '3', reps: '6–10', rest: '2 min', rpe: '8–9', tempo: '2-0-1' },
    note: 'Charges lourdes (≈ 80–90 % du 1RM), repos longs pour récupérer entre les séries.' },
  masse:     { name: 'Masse (hypertrophie)', poly: { sets: '3–4', reps: '6–12', rest: '2–3 min', rpe: '7–9', tempo: '3-0-1' }, iso: { sets: '3–4', reps: '10–15', rest: '1–2 min', rpe: '8–10', tempo: '2-1-1' },
    note: 'Séries menées proches de l’échec (0–3 reps en réserve). Le volume hebdomadaire par muscle compte plus que la plage de reps.' },
  endurance: { name: 'Endurance musculaire', poly: { sets: '2–3', reps: '12–20', rest: '60–90 s', rpe: '7–8', tempo: '2-0-1' }, iso: { sets: '2–3', reps: '15–25', rest: '45–60 s', rpe: '7–9', tempo: '2-0-1' },
    note: 'Charges légères à modérées, repos courts. Utile en reprise ou en circuit.' },
};
export const RPE_HELP = 'RPE = effort perçu sur 10 (10 = échec ; 9 = 1 rep en réserve ; 8 = 2 reps en réserve). Tempo = descente-pause-montée en secondes (X = explosif).';
export const DIFFICULTY = ['', 'Débutant', 'Intermédiaire', 'Avancé'];

// ----- Exercices
export const EXERCISES = Object.fromEntries(EXERCISE_LIST.map(e => {
  const total = Object.values(e.act).reduce((a, b) => a + b, 0);
  const act = Object.fromEntries(Object.entries(e.act).map(([k, v]) => [k, Math.round(v / total * 100)]));
  const max = Math.max(...Object.values(act));
  const primary = Object.keys(act).filter(k => act[k] >= 25 || act[k] === max);
  const secondary = Object.keys(act).filter(k => !primary.includes(k));
  return [e.id, { ...e, act, primary, secondary }];
}));

// ----- Salle (profil Basic-Fit + ajustements de l'utilisateur, stockés localement)
const GYM_KEY = 'muscu.gym.v1';
let overrides = {};
try { overrides = JSON.parse(localStorage.getItem(GYM_KEY)) || {}; } catch { overrides = {}; }
export const gym = {
  has(eq) { return eq in overrides ? overrides[eq] : !!EQUIPMENT[eq]?.std; },
  set(eq, v) {
    if (v === !!EQUIPMENT[eq].std) delete overrides[eq]; else overrides[eq] = v;
    try { localStorage.setItem(GYM_KEY, JSON.stringify(overrides)); } catch { /* stockage indisponible */ }
  },
  reset() { overrides = {}; try { localStorage.removeItem(GYM_KEY); } catch { /* idem */ } },
  customized() { return Object.keys(overrides).length > 0; },
};
// 'ok' = tout le matériel est coché ; 'maybe' = matériel « selon le club » non coché ; 'no' = décoché par l'utilisateur
export function availability(ex) {
  if (ex.needs.every(n => gym.has(n))) return 'ok';
  if (ex.needs.some(n => !gym.has(n) && (EQUIPMENT[n]?.std || n in overridesView()))) return 'no';
  return 'maybe';
}
function overridesView() { return overrides; }

export function exercisesForMuscle(m) {
  return Object.values(EXERCISES)
    .filter(e => e.act[m])
    .sort((a, b) => b.act[m] - a.act[m]);
}
