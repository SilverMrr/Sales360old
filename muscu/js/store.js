// Persistance locale (localStorage). Structure :
// { version, settings:{bodyweight}, sessions:[Session], active: Session|null }
// Session = { id, name, start, end, notes, demo?, exercises:[{ exId, sets:[{ w, r, rpe, warmup }] }] }
import { EXERCISES } from './data.js';

const KEY = 'muscu.v1';
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.sessions)) return d;
  } catch { /* stockage indisponible ou corrompu */ }
  return { version: 1, settings: { bodyweight: 75 }, sessions: [], active: null };
}

export const store = {
  data: load(),
  listeners: new Set(),
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* quota / navigation privée */ }
    this.listeners.forEach(fn => fn());
  },
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },

  get sessions() { return this.data.sessions; },
  get active() { return this.data.active; },

  startSession(name = '') {
    if (!this.data.active) {
      this.data.active = { id: uid(), name: name || defaultName(), start: new Date().toISOString(), end: null, notes: '', exercises: [] };
      this.save();
    }
    return this.data.active;
  },
  addExercise(exId) {
    const s = this.startSession();
    const last = lastSetsFor(exId);
    s.exercises.push({ exId, sets: last.length ? last.map(x => ({ ...x, done: false })) : [{ w: 0, r: 10, rpe: null, warmup: false, done: false }] });
    this.save();
  },
  removeExercise(i) { this.data.active.exercises.splice(i, 1); this.save(); },
  addSet(i) {
    const sets = this.data.active.exercises[i].sets;
    const prev = sets[sets.length - 1] || { w: 0, r: 10, rpe: null, warmup: false };
    sets.push({ ...prev, warmup: false, done: false }); this.save();
  },
  removeSet(i, j) { this.data.active.exercises[i].sets.splice(j, 1); this.save(); },
  updateSet(i, j, patch) { Object.assign(this.data.active.exercises[i].sets[j], patch); this.save(); },
  finishSession() {
    const s = this.data.active; if (!s) return;
    s.end = new Date().toISOString();
    s.exercises = s.exercises
      .map(e => ({ exId: e.exId, sets: e.sets.filter(x => x.done && x.r > 0).map(({ done, ...x }) => x) }))
      .filter(e => e.sets.length);
    if (s.exercises.length) this.data.sessions.push(s);
    this.data.sessions.sort((a, b) => a.start.localeCompare(b.start));
    this.data.active = null; this.save();
    return s;
  },
  cancelSession() { this.data.active = null; this.save(); },
  deleteSession(id) { this.data.sessions = this.data.sessions.filter(s => s.id !== id); this.save(); },
  setBodyweight(kg) { this.data.settings.bodyweight = kg; this.save(); },

  exportJSON() { return JSON.stringify(this.data, null, 2); },
  importJSON(text) {
    const d = JSON.parse(text);
    if (!d || !Array.isArray(d.sessions)) throw new Error('Format invalide');
    this.data = { version: 1, settings: d.settings || { bodyweight: 75 }, sessions: d.sessions, active: null };
    this.save();
  },
  clearDemo() { this.data.sessions = this.data.sessions.filter(s => !s.demo); this.save(); },
  resetAll() { this.data = { version: 1, settings: { bodyweight: 75 }, sessions: [], active: null }; this.save(); },

  // Génère ~12 semaines de données réalistes (Push/Pull/Legs, progression linéaire + bruit)
  generateDemo() {
    this.clearDemo();
    const plans = {
      Push: [['bench_bb', 80, 6], ['incline_db', 28, 10], ['shoulder_press_m', 50, 10], ['lat_raise_db', 10, 15], ['rope_pushdown', 25, 12], ['overhead_cable', 20, 12]],
      Pull: [['pullup', 0, 8], ['row_bb', 70, 8], ['lat_pulldown', 60, 10], ['face_pull', 20, 15], ['curl_ez', 30, 10], ['hammer_curl', 14, 12]],
      Legs: [['squat_bb', 100, 5], ['rdl', 90, 8], ['leg_press', 180, 10], ['seated_curl', 45, 12], ['leg_ext', 50, 12], ['calf_standing', 80, 12], ['cable_crunch', 40, 15]],
    };
    const order = ['Push', 'Pull', 'Legs'];
    const days = [1, 2, 4, 5, 6]; // lun mar jeu ven sam
    const now = new Date(); now.setHours(18, 0, 0, 0);
    const start = new Date(now); start.setDate(start.getDate() - 7 * 12);
    let k = 0, rnd = mulberry32(42);
    for (let d = new Date(start); d < now; d.setDate(d.getDate() + 1)) {
      if (!days.includes(d.getDay()) || rnd() < 0.1) continue;
      const weeks = (d - start) / (7 * 864e5);
      const type = order[k++ % 3];
      const st = new Date(d); st.setHours(17 + Math.floor(rnd() * 3), Math.floor(rnd() * 60));
      const dur = 55 + Math.floor(rnd() * 35);
      const session = { id: uid(), name: type, start: st.toISOString(), end: new Date(st.getTime() + dur * 6e4).toISOString(), notes: '', demo: true, exercises: [] };
      for (const [exId, w0, r] of plans[type]) {
        const ex = EXERCISES[exId];
        const prog = ex.mech === 'poly' ? 0.012 : 0.008;
        const wBase = w0 * (1 + prog * weeks * (0.85 + rnd() * 0.3));
        const sets = [];
        if (ex.mech === 'poly' && w0 >= 60) sets.push({ w: round25(wBase * 0.5), r: 8, rpe: null, warmup: true });
        const n = ex.mech === 'poly' ? 3 + (rnd() < 0.4 ? 1 : 0) : 3;
        for (let i = 0; i < n; i++) {
          const fatigue = i * (rnd() < 0.5 ? 1 : 0);
          sets.push({ w: w0 === 0 ? 0 : round25(wBase), r: Math.max(1, r - fatigue + (rnd() < 0.25 ? 1 : 0)), rpe: Math.min(10, 7 + Math.round(rnd() * 3) / 2 + i * 0.5), warmup: false });
        }
        session.exercises.push({ exId, sets });
      }
      this.data.sessions.push(session);
    }
    const bw = this.data.settings.bodyweight || 75;
    this.data.settings.bodyweight = bw;
    this.data.sessions.sort((a, b) => a.start.localeCompare(b.start));
    this.save();
  },
};

function round25(x) { return Math.round(x / 2.5) * 2.5; }
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function defaultName() {
  const d = new Date();
  return 'Séance du ' + d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
}
function lastSetsFor(exId) {
  const ss = store.data.sessions;
  for (let i = ss.length - 1; i >= 0; i--) {
    const e = ss[i].exercises.find(x => x.exId === exId);
    if (e) return e.sets.map(({ w, r, rpe, warmup }) => ({ w, r, rpe, warmup }));
  }
  return [];
}
