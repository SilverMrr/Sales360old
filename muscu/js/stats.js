// Moteur de statistiques. Toutes les fonctions sont pures et lisent store.data.
import { MUSCLES, EXERCISES, PUSH, PULL } from './data.js';
import { store } from './store.js';

const DAY = 864e5;
// Part du poids de corps déplacée (charge effective = bw*facteur + lest)
const BW_FACTOR = { pullup: 1, chinup: 1, dips_chest: 1, dips_tri: 1, pushup: 0.64, nordic: 0.6, sissy: 0.7, back_ext: 0.5, glute_bridge: 0.6, step_up: 1, lunges_db: 1, bulgarian: 1 };
const ASSISTED = { assisted_pullup: 1 };
// Exercices mesurés en secondes (pas de tonnage / e1RM)
export const TIMED = new Set(['plank', 'side_plank', 'copenhagen', 'dead_hang']);

export const SECONDARY_WEIGHT = 0.5; // une série compte 0,5 pour un muscle secondaire

export function effLoad(exId, w) {
  const bw = store.data.settings.bodyweight || 75;
  if (ASSISTED[exId]) return Math.max(0, bw - (w || 0));
  if (BW_FACTOR[exId]) return bw * BW_FACTOR[exId] + (w || 0);
  return w || 0;
}

// e1RM : Epley avec correction RPE (reps en réserve ajoutées). Validité réduite au-delà de 12 reps.
export function e1rm(load, reps, rpe) {
  if (!load || !reps) return 0;
  const rir = rpe ? Math.max(0, 10 - rpe) : 0;
  const r = reps + rir;
  return r <= 1 ? load : load * (1 + r / 30);
}
// Brzycki, pour comparaison
export function brzycki(load, reps) { return reps >= 37 ? 0 : load * 36 / (37 - reps); }

const workSets = e => e.sets.filter(s => !s.warmup);
export const sessions = () => store.data.sessions;
const inRange = (s, from, to) => { const t = new Date(s.start).getTime(); return t >= from && t < to; };

// --------- Agrégats par muscle sur une fenêtre de temps
export function muscleVolume(from, to = Date.now() + DAY) {
  const out = {};
  for (const id in MUSCLES) out[id] = { sets: 0, directSets: 0, tonnage: 0, reps: 0, sessions: 0, last: null };
  for (const s of sessions()) {
    if (!inRange(s, from, to)) continue;
    const touched = new Set();
    for (const e of s.exercises) {
      const ex = EXERCISES[e.exId]; if (!ex) continue;
      const ws = workSets(e);
      const ton = TIMED.has(e.exId) ? 0 : ws.reduce((a, x) => a + effLoad(e.exId, x.w) * x.r, 0);
      const reps = TIMED.has(e.exId) ? 0 : ws.reduce((a, x) => a + x.r, 0);
      for (const m of ex.primary) { add(out[m], ws.length, ton, reps, 1); out[m].directSets += ws.length; touched.add(m); }
      for (const m of ex.secondary) { add(out[m], ws.length * SECONDARY_WEIGHT, ton * SECONDARY_WEIGHT, reps * SECONDARY_WEIGHT); touched.add(m); }
    }
    for (const m of touched) { out[m].sessions++; if (!out[m].last || s.start > out[m].last) out[m].last = s.start; }
  }
  return out;
  function add(o, sets, ton, reps) { o.sets += sets; o.tonnage += ton; o.reps += reps; }
}

export function lastTrained(muscleId) {
  for (let i = sessions().length - 1; i >= 0; i--) {
    const s = sessions()[i];
    for (const e of s.exercises) {
      const ex = EXERCISES[e.exId];
      if (ex && (ex.primary.includes(muscleId) || ex.secondary.includes(muscleId))) return s;
    }
  }
  return null;
}

// Récupération estimée (modèle simple) : temps nécessaire = base selon taille du muscle,
// majoré par le volume de la dernière séance. Renvoie 0–100 %.
export function recovery(muscleId) {
  const s = lastTrained(muscleId);
  if (!s) return { pct: 100, hours: null, need: 0 };
  const day = new Date(s.start); const from = new Date(day); from.setHours(0, 0, 0, 0);
  const v = muscleVolume(from.getTime(), from.getTime() + DAY)[muscleId].sets;
  const base = { S: 36, M: 48, L: 60 }[MUSCLES[muscleId].size];
  const need = base * (0.6 + Math.min(v, 12) / 12 * 0.8);
  const hours = (Date.now() - new Date(s.end || s.start).getTime()) / 36e5;
  return { pct: Math.max(0, Math.min(100, Math.round(hours / need * 100))), hours, need, sets: v };
}

// --------- Séries temporelles hebdo
export function weekStart(t) { const d = new Date(t); const day = (d.getDay() + 6) % 7; d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - day); return d.getTime(); }
export function weeklyMuscle(muscleId, weeks = 12) {
  const w0 = weekStart(Date.now()) - (weeks - 1) * 7 * DAY;
  const out = [];
  for (let i = 0; i < weeks; i++) {
    const from = w0 + i * 7 * DAY;
    const v = muscleVolume(from, from + 7 * DAY)[muscleId];
    out.push({ t: from, sets: v.sets, tonnage: v.tonnage });
  }
  return out;
}
export function weeklyGlobal(weeks = 12) {
  const w0 = weekStart(Date.now()) - (weeks - 1) * 7 * DAY;
  const out = [];
  for (let i = 0; i < weeks; i++) {
    const from = w0 + i * 7 * DAY, to = from + 7 * DAY;
    const ss = sessions().filter(s => inRange(s, from, to));
    let sets = 0, ton = 0;
    for (const s of ss) for (const e of s.exercises) for (const x of workSets(e)) { sets++; if (!TIMED.has(e.exId)) ton += effLoad(e.exId, x.w) * x.r; }
    out.push({ t: from, sessions: ss.length, sets, tonnage: ton });
  }
  return out;
}

// --------- Par exercice
export function exerciseHistory(exId) {
  const rows = [];
  for (const s of sessions()) {
    for (const e of s.exercises) {
      if (e.exId !== exId) continue;
      const ws = workSets(e);
      if (!ws.length) continue;
      let best = null, ton = 0, reps = 0, maxW = 0, rpeSum = 0, rpeN = 0;
      for (const x of ws) {
        const L = effLoad(exId, x.w);
        const est = TIMED.has(exId) ? 0 : e1rm(L, x.r, x.rpe);
        if (!best || est > best.e1rm || (TIMED.has(exId) && x.r > best.r)) best = { ...x, load: L, e1rm: est };
        ton += L * x.r; reps += x.r; maxW = Math.max(maxW, L);
        if (x.rpe) { rpeSum += x.rpe; rpeN++; }
      }
      rows.push({ t: new Date(s.start).getTime(), sessionId: s.id, sets: ws, best, tonnage: TIMED.has(exId) ? 0 : ton, reps, maxLoad: maxW, avgRpe: rpeN ? rpeSum / rpeN : null });
    }
  }
  return rows;
}

export function exerciseSummary(exId) {
  const h = exerciseHistory(exId);
  if (!h.length) return null;
  const best = h.reduce((a, r) => (r.best.e1rm > a.best.e1rm ? r : a), h[0]);
  const maxLoad = Math.max(...h.map(r => r.maxLoad));
  const first = h[0], last = h[h.length - 1];
  // pente de progression e1RM en kg/semaine (régression linéaire)
  let slope = 0;
  if (h.length >= 3) {
    const xs = h.map(r => r.t / (7 * DAY)), ys = h.map(r => r.best.e1rm);
    const mx = avg(xs), my = avg(ys);
    const num = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
    const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    slope = den ? num / den : 0;
  }
  // records par nombre de reps (meilleure charge pour 1..15 reps)
  const repPR = {};
  for (const r of h) for (const x of r.sets) {
    const L = effLoad(exId, x.w);
    if (!repPR[x.r] || L > repPR[x.r].load) repPR[x.r] = { load: L, t: r.t };
  }
  return {
    count: h.length, history: h, bestE1rm: best.best.e1rm, bestSet: best.best, bestDate: best.t, maxLoad,
    totalTonnage: h.reduce((a, r) => a + r.tonnage, 0), totalSets: h.reduce((a, r) => a + r.sets.length, 0),
    totalReps: h.reduce((a, r) => a + r.reps, 0),
    progression: first.best.e1rm ? (last.best.e1rm - first.best.e1rm) / first.best.e1rm : 0,
    slope, last, repPR,
  };
}

// Records récents : nouvelle meilleure e1RM pour un exercice
export function recentPRs(limit = 12) {
  const bestSoFar = {}; const prs = [];
  for (const s of sessions()) {
    for (const e of s.exercises) {
      if (TIMED.has(e.exId)) continue;
      for (const x of workSets(e)) {
        const est = e1rm(effLoad(e.exId, x.w), x.r, x.rpe);
        if (est > (bestSoFar[e.exId] || 0) * 1.0001) {
          if (bestSoFar[e.exId]) prs.push({ exId: e.exId, t: new Date(s.start).getTime(), e1rm: est, prev: bestSoFar[e.exId], set: x });
          bestSoFar[e.exId] = est;
        }
      }
    }
  }
  // garder le meilleur PR par exercice et par séance
  const key = p => p.exId + p.t; const m = new Map();
  for (const p of prs) if (!m.has(key(p)) || m.get(key(p)).e1rm < p.e1rm) m.set(key(p), p);
  return [...m.values()].sort((a, b) => b.t - a.t).slice(0, limit);
}

// --------- Global
export function globalStats() {
  const ss = sessions();
  let sets = 0, reps = 0, ton = 0, warm = 0, rpeSum = 0, rpeN = 0, dur = 0, durN = 0;
  const repBuckets = { '1–5': 0, '6–10': 0, '11–15': 0, '16–20': 0, '21+': 0 };
  const rpeBuckets = { '≤6': 0, '6.5–7.5': 0, '8–8.5': 0, '9–9.5': 0, '10': 0 };
  const exCount = {};
  for (const s of ss) {
    if (s.end) { dur += (new Date(s.end) - new Date(s.start)) / 6e4; durN++; }
    for (const e of s.exercises) {
      exCount[e.exId] = (exCount[e.exId] || 0) + 1;
      for (const x of e.sets) {
        if (x.warmup) { warm++; continue; }
        sets++;
        if (TIMED.has(e.exId)) continue;
        reps += x.r; ton += effLoad(e.exId, x.w) * x.r;
        const b = x.r <= 5 ? '1–5' : x.r <= 10 ? '6–10' : x.r <= 15 ? '11–15' : x.r <= 20 ? '16–20' : '21+';
        repBuckets[b]++;
        if (x.rpe) {
          rpeSum += x.rpe; rpeN++;
          const k = x.rpe <= 6 ? '≤6' : x.rpe <= 7.5 ? '6.5–7.5' : x.rpe <= 8.5 ? '8–8.5' : x.rpe < 10 ? '9–9.5' : '10';
          rpeBuckets[k]++;
        }
      }
    }
  }
  const first = ss[0] ? new Date(ss[0].start).getTime() : Date.now();
  const weeksSpan = Math.max(1, (Date.now() - first) / (7 * DAY));
  const last28 = ss.filter(s => new Date(s.start).getTime() > Date.now() - 28 * DAY).length;
  return {
    sessions: ss.length, sets, warmupSets: warm, reps, tonnage: ton,
    avgRpe: rpeN ? rpeSum / rpeN : null, rpeCoverage: sets ? rpeN / sets : 0,
    avgDuration: durN ? dur / durN : null,
    perWeek: ss.length / weeksSpan, perWeek4: last28 / 4,
    repBuckets, rpeBuckets, streak: weekStreak(),
    topExercises: Object.entries(exCount).sort((a, b) => b[1] - a[1]).slice(0, 8),
    density: durN ? ton / dur * 1 : null, // kg / min
  };
}

function weekStreak() {
  let w = weekStart(Date.now()), n = 0;
  const has = from => sessions().some(s => inRange(s, from, from + 7 * DAY));
  if (!has(w)) w -= 7 * DAY; // semaine en cours pas encore entamée
  while (has(w)) { n++; w -= 7 * DAY; }
  return n;
}

export function balance(from) {
  const v = muscleVolume(from);
  const sum = ids => ids.reduce((a, id) => a + v[id].sets, 0);
  const r = (a, b) => (b ? a / b : null);
  return [
    { label: 'Poussée / Tirage', a: sum(PUSH), b: sum(PULL), ratio: r(sum(PUSH), sum(PULL)), target: '≈ 1 (ou < 1)', ok: x => x <= 1.15 },
    { label: 'Quadriceps / Ischios', a: v.quads.sets, b: v.hamstrings.sets, ratio: r(v.quads.sets, v.hamstrings.sets), target: '1 – 1,5', ok: x => x >= 0.8 && x <= 1.6 },
    { label: 'Delt. antérieur / postérieur', a: v.delt_ant.sets, b: v.delt_post.sets, ratio: r(v.delt_ant.sets, v.delt_post.sets), target: '≤ 1,5', ok: x => x <= 1.5 },
    { label: 'Pectoraux / Milieu du dos', a: v.pecs.sets, b: v.rhomboids.sets, ratio: r(v.pecs.sets, v.rhomboids.sets), target: '≤ 1,2', ok: x => x <= 1.2 },
    { label: 'Biceps / Triceps', a: v.biceps.sets, b: v.triceps.sets, ratio: r(v.biceps.sets, v.triceps.sets), target: '0,8 – 1,3', ok: x => x >= 0.7 && x <= 1.4 },
  ];
}

export function trainingDays(days = 182) {
  const map = {};
  for (const s of sessions()) {
    const d = new Date(s.start); d.setHours(0, 0, 0, 0);
    const k = d.getTime();
    let sets = 0; for (const e of s.exercises) sets += workSets(e).length;
    map[k] = (map[k] || 0) + sets;
  }
  return map;
}

export function sessionSummary(s) {
  let sets = 0, ton = 0, reps = 0; const muscles = {};
  for (const e of s.exercises) {
    const ex = EXERCISES[e.exId];
    for (const x of workSets(e)) {
      sets++;
      if (!TIMED.has(e.exId)) { ton += effLoad(e.exId, x.w) * x.r; reps += x.r; }
      if (ex) { for (const m of ex.primary) muscles[m] = (muscles[m] || 0) + 1; for (const m of ex.secondary) muscles[m] = (muscles[m] || 0) + SECONDARY_WEIGHT; }
    }
  }
  const dur = s.end ? (new Date(s.end) - new Date(s.start)) / 6e4 : null;
  return { sets, tonnage: ton, reps, duration: dur, muscles };
}

const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
export { DAY };
