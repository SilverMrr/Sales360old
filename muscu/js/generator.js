// Générateur de séances : choisit des exercices disponibles selon un modèle de séance,
// la durée, l'objectif et le niveau, puis attribue les paramètres conseillés.
import { MUSCLES, EXERCISES, OBJECTIVES, availability } from './data.js';

const P = 'poly', I = 'iso';
const MAX_EX = 8;
// Créneaux par ordre de priorité (les premiers sont gardés si la séance est courte).
export const TEMPLATES = {
  push:   { name: 'Push (pecs, épaules, triceps)', slots: [['pecs', P], ['delt_ant', P], ['delt_lat', I], ['pecs', P], ['triceps', I], ['pecs', I], ['triceps', I], ['delt_lat', I]] },
  pull:   { name: 'Pull (dos, biceps)', slots: [['lats', P], ['rhomboids', P], ['biceps', I], ['delt_post', I], ['lats', I], ['biceps', I], ['traps', I], ['forearms', I]] },
  legs:   { name: 'Legs (jambes)', slots: [['quads', P], ['hamstrings', P], ['quads', I], ['hamstrings', I], ['glutes', P], ['calves', I], ['abductors', I], ['adductors', I]] },
  upper:  { name: 'Haut du corps', slots: [['pecs', P], ['lats', P], ['delt_ant', P], ['rhomboids', P], ['delt_lat', I], ['biceps', I], ['triceps', I], ['delt_post', I], ['pecs', I]] },
  lower:  { name: 'Bas du corps + abdos', slots: [['quads', P], ['hamstrings', P], ['glutes', P], ['hamstrings', I], ['quads', I], ['calves', I], ['abs', I], ['abductors', I]] },
  full:   { name: 'Full body', slots: [['quads', P], ['pecs', P], ['lats', P], ['hamstrings', P], ['delt_lat', I], ['rhomboids', P], ['biceps', I], ['triceps', I], ['abs', I], ['calves', I]] },
  custom: { name: 'Personnalisée', slots: [] },
};

const SIZE_ORDER = ['quads', 'hamstrings', 'glutes', 'lats', 'pecs', 'rhomboids', 'lowerback', 'adductors', 'traps', 'delt_ant', 'delt_lat', 'delt_post', 'triceps', 'biceps', 'calves', 'abductors', 'abs', 'obliques', 'forearms', 'rotator', 'serratus', 'hipflex', 'tibialis', 'neck'];
const num = s => { const [a, b] = String(s).split('–').map(x => parseFloat(x.replace(',', '.'))); return b ? (a + b) / 2 : a; };
const lowRest = s => { const v = parseFloat(String(s).replace(',', '.')); return /min/.test(s) ? v : v / 60; };
// durée d'un exercice : séries × (repos bas de fourchette + ~40 s d'effort) + 1 min d'installation
const setTime = p => num(p.sets) * (lowRest(p.rest) + 0.65) + 1;

// En force, seuls les 2 premiers polyarticulaires sont lourds ; le reste = travail d'assistance (paramètres masse).
function params(ex, objective, level, heavyLeft = 2) {
  const obj = objective === 'force' && (ex.mech === 'iso' || heavyLeft <= 0) ? 'masse' : objective;
  const p = { ...OBJECTIVES[obj][ex.mech] };
  if (obj !== objective) p.assist = true;
  if (level === 1) { p.sets = String(p.sets).split('–')[0]; p.rpe = '7–8'; }
  if (level === 3 && objective === 'masse' && ex.mech === 'iso') p.rpe = '9–10';
  return p;
}

const family = id => id.replace(/_(db|smith|bb|m|cable|uni|close|assist)$/, '');
function candidates(muscle, mech, opts, used) {
  const okAv = e => { const a = availability(e); return a === 'ok' || (opts.maybe && a === 'maybe'); };
  const okDiff = e => e.diff <= Math.max(opts.level, 1) || (opts.level === 1 && e.diff <= 1);
  let c = Object.values(EXERCISES).filter(e => e.primary.includes(muscle) && e.mech === mech && okAv(e) && okDiff(e) && !used.has(family(e.id)));
  if (!c.length) c = Object.values(EXERCISES).filter(e => e.primary.includes(muscle) && okAv(e) && okDiff(e) && !used.has(family(e.id)));
  return c;
}
function pick(c, muscle, level) {
  // tirage pondéré : forte sollicitation du muscle + bonus étirement
  const w = c.map(e => (e.act[muscle] || 1) ** 2 * (e.stretch ? 1.25 : 1) * (level >= 2 && e.equip === 'Poids du corps' && e.diff === 1 ? 0.35 : 1));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < c.length; i++) { r -= w[i]; if (r <= 0) return c[i]; }
  return c[c.length - 1];
}

export function generateSession(opts, { swap, prev } = {}) {
  let slots = TEMPLATES[opts.template].slots;
  if (opts.template === 'custom') {
    const ms = [...opts.muscles].sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
    slots = [...ms.map(m => [m, P]), ...ms.map(m => [m, I]), ...ms.map(m => [m, I])];
  }
  const budget = opts.duration - 8; // échauffement
  const used = new Set();
  let items = [];

  if (prev && swap != null) {
    // remplacer un seul exercice, garder les autres
    items = prev.items.map(it => ({ ...it }));
    prev.items.forEach(it => used.add(family(it.ex.id)));
    const it = items[swap];
    const c = candidates(it.slot[0], it.slot[1], opts, used);
    if (c.length) { const ex = pick(c, it.slot[0], opts.level); items[swap] = { ...it, ex, p: params(ex, opts.objective, opts.level, it.p.assist ? 0 : 2) }; }
  } else {
    let minutes = 0, heavy = 2;
    for (const slot of [...slots, ...slots]) {
      const c = candidates(slot[0], slot[1], opts, used);
      if (!c.length) continue;
      const ex = pick(c, slot[0], opts.level);
      const p = params(ex, opts.objective, opts.level, heavy);
      const t = setTime(p);
      if (items.length >= MAX_EX) break;
      if (minutes + t > budget) continue; // trop long : on tente un exercice plus court
      minutes += t; used.add(family(ex.id)); if (ex.mech === 'poly' && !p.assist) heavy--;
      items.push({ ex, p, slot });
    }
    // séance trop courte (plafond d'exercices atteint) : ajouter des séries jusqu'à approcher la durée
    let total = items.reduce((x, it) => x + setTime(it.p), 0);
    for (let round = 0; round < 3 && total < budget * 0.85; round++) {
      for (const it of items) {
        const cur = Math.ceil(num(it.p.sets));
        if (cur >= 5 || total >= budget * 0.95) continue;
        const before = setTime(it.p);
        it.p = { ...it.p, sets: String(cur + 1) };
        total += setTime(it.p) - before;
      }
    }
    // polyarticulaires d'abord, en conservant l'ordre des créneaux
    items = [...items.filter(i => i.ex.mech === 'poly'), ...items.filter(i => i.ex.mech !== 'poly')];
  }

  const minutes = Math.round(8 + items.reduce((a, it) => a + setTime(it.p), 0));
  const volume = {}; let totalSets = 0;
  for (const it of items) {
    const s = Math.round(num(it.p.sets)); totalSets += s;
    for (const m of it.ex.primary) volume[m] = (volume[m] || 0) + s;
    for (const m of it.ex.secondary) if (it.ex.act[m] >= 10) volume[m] = (volume[m] || 0) + s / 2;
  }
  for (const m in volume) if (!MUSCLES[m]) delete volume[m];
  return { items, minutes, totalSets, volume };
}
