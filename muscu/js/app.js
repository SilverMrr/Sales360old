import { MUSCLES, EXERCISES, EQUIPMENT, exercisesForMuscle } from './data.js';
import { store } from './store.js';
import * as S from './stats.js';
import { lineChart, barChart, calendarHeatmap } from './charts.js';

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kg = v => (v >= 10000 ? (v / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' t' : Math.round(v).toLocaleString('fr-FR') + ' kg');
const n1 = v => (Math.round(v * 10) / 10).toLocaleString('fr-FR');
const fmtDate = t => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' });
const ago = t => {
  if (!t) return '—';
  const h = (Date.now() - new Date(t).getTime()) / 36e5;
  if (h < 1) return 'à l’instant'; if (h < 24) return `il y a ${Math.round(h)} h`;
  const d = Math.round(h / 24); return d === 1 ? 'hier' : `il y a ${d} j`;
};
const WEEK = 7 * S.DAY;

const state = { tab: 'body', muscle: null, mode: 'anatomy', equipFilter: null };
let body = null;

// ============================================================ NAVIGATION
function setTab(tab) {
  state.tab = tab;
  $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.tab').forEach(s => s.classList.toggle('active', s.id === 'tab-' + tab));
  render();
  if (tab === 'body') body?.resize();
}
$$('#tabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

function render() {
  $('#activeDot').hidden = !store.active;
  if (state.tab === 'body') { renderPanel(); applyMode(); }
  if (state.tab === 'workout') renderWorkout();
  if (state.tab === 'stats') renderStats();
  if (state.tab === 'history') renderHistory();
}

// ============================================================ CORPS 3D
async function initBody() {
  try {
    const { Body3D } = await import('./body.js');
    const tip = $('#tooltip');
    body = new Body3D($('#viewer'), {
      onSelect: id => { selectMuscle(id); },
      onHover: (id, e) => {
        if (!id || !e) { tip.hidden = true; return; }
        const r = $('#viewer').getBoundingClientRect();
        tip.hidden = false; tip.style.left = e.clientX - r.left + 'px'; tip.style.top = e.clientY - r.top + 'px';
        tip.innerHTML = esc(MUSCLES[id].name) + tooltipExtra(id);
      },
    });
    applyMode();
  } catch (err) {
    console.error(err);
    $('#glError').hidden = false;
  }
}
function tooltipExtra(id) {
  if (state.mode === 'volume') return ` · <b>${n1(S.muscleVolume(Date.now() - WEEK)[id].sets)}</b> séries`;
  if (state.mode === 'recovery') return ` · <b>${S.recovery(id).pct} %</b>`;
  return '';
}

function selectMuscle(id) {
  state.muscle = id; state.equipFilter = null;
  body?.select(id);
  renderPanel();
  if (id && window.matchMedia('(max-width: 900px)').matches) $('#musclePanel').scrollIntoView({ behavior: 'smooth' });
}

$$('#modeSeg button').forEach(b => b.addEventListener('click', () => {
  state.mode = b.dataset.mode;
  $$('#modeSeg button').forEach(x => x.classList.toggle('active', x === b));
  applyMode();
}));
$$('.views button[data-view]').forEach(b => b.addEventListener('click', () => body?.view(b.dataset.view)));
$('#autoRot').addEventListener('click', e => { const on = !e.currentTarget.classList.contains('on'); e.currentTarget.classList.toggle('on', on); body?.setAutoRotate(on); });

function volumeStatus(id, sets) {
  const m = MUSCLES[id]; const mid = (m.mev + m.mrv) / 2;
  if (sets <= 0) return { cls: 'st-none', label: 'Non travaillé', color: '#555b68' };
  if (sets < m.mev) return { cls: 'st-low', label: 'Sous MEV', color: '#3b82f6' };
  if (sets <= mid) return { cls: 'st-ok', label: 'Productif', color: '#22c55e' };
  if (sets <= m.mrv) return { cls: 'st-high', label: 'Élevé', color: '#eab308' };
  return { cls: 'st-over', label: 'Au-delà du MRV', color: '#ef4444' };
}
function recoveryColor(p) { return p >= 100 ? '#22c55e' : p >= 80 ? '#a3e635' : p >= 50 ? '#eab308' : '#ef4444'; }

function applyMode() {
  const lg = $('#legend'); $('#hint').hidden = state.mode !== 'anatomy';
  if (state.mode === 'anatomy') {
    lg.hidden = true; body?.setColorFn(null); return;
  }
  if (state.mode === 'volume') {
    const v = S.muscleVolume(Date.now() - WEEK);
    body?.setColorFn(id => volumeStatus(id, v[id].sets).color);
    lg.innerHTML = '<b>Séries effectives / 7 j</b>' + [['#555b68', '0'], ['#3b82f6', '< MEV'], ['#22c55e', 'Productif'], ['#eab308', 'Élevé'], ['#ef4444', '> MRV']].map(([c, l]) => `<div><i style="background:${c}"></i>${l}</div>`).join('');
  } else {
    body?.setColorFn(id => recoveryColor(S.recovery(id).pct));
    lg.innerHTML = '<b>Récupération estimée</b>' + [['#ef4444', '< 50 %'], ['#eab308', '50–80 %'], ['#a3e635', '80–99 %'], ['#22c55e', 'Récupéré']].map(([c, l]) => `<div><i style="background:${c}"></i>${l}</div>`).join('');
  }
  lg.hidden = false;
}

// ============================================================ PANNEAU MUSCLE
function renderPanel() {
  const el = $('#musclePanel');
  const id = state.muscle;
  if (!id) {
    const groups = {};
    for (const [mid, m] of Object.entries(MUSCLES)) (groups[m.group] ||= []).push([mid, m]);
    const v = S.muscleVolume(Date.now() - WEEK);
    el.innerHTML = `
      <h2>Choisis un muscle</h2>
      <p class="muted">Clique un muscle sur le corps 3D (ou dans la liste) pour voir tous les exercices et machines qui le ciblent, et tes statistiques dessus.</p>
      <div class="kpis">
        <div class="kpi"><div class="l">Muscles</div><div class="v">${Object.keys(MUSCLES).length}</div></div>
        <div class="kpi"><div class="l">Exercices</div><div class="v">${Object.keys(EXERCISES).length}</div><div class="s">${Object.values(EXERCISES).filter(e => e.equip === 'Machine').length} sur machine</div></div>
      </div>
      <div class="muscle-groups">
        ${Object.entries(groups).map(([g, list]) => `<div><h4>${esc(g)}</h4><div class="chips">${list.map(([mid, m]) => `<button class="chip" data-m="${mid}">${esc(m.name)} <span class="muted">· ${n1(v[mid].sets)}</span></button>`).join('')}</div></div>`).join('')}
      </div>
      <p class="muted small" style="margin-top:16px">Le chiffre après chaque muscle = séries effectives des 7 derniers jours (série directe = 1, muscle secondaire = 0,5).</p>`;
    $$('[data-m]', el).forEach(b => b.addEventListener('click', () => selectMuscle(b.dataset.m)));
    return;
  }

  const m = MUSCLES[id];
  const v7 = S.muscleVolume(Date.now() - WEEK)[id];
  const v28 = S.muscleVolume(Date.now() - 4 * WEEK)[id];
  const rec = S.recovery(id);
  const st = volumeStatus(id, v7.sets);
  const { primary, secondary } = exercisesForMuscle(id);
  const equipIn = [...new Set([...primary, ...secondary].map(e => e.equip))];
  const fil = e => !state.equipFilter || e.equip === state.equipFilter;
  const scale = Math.max(m.mrv * 1.15, v7.sets);

  el.innerHTML = `
    <div class="crumbs"><button class="btn sm" id="backAll">← Tous les muscles</button><span class="tag">${esc(m.group)}</span></div>
    <h2>${esc(m.name)}</h2>
    <div class="latin">${esc(m.latin)}</div>
    <div class="kpis">
      <div class="kpi"><div class="l">Séries 7 j</div><div class="v">${n1(v7.sets)} <span class="status ${st.cls}">${st.label}</span></div>
        <div class="meter"><div class="fill" style="width:${Math.min(100, v7.sets / scale * 100)}%;background:${st.color}"></div>
        <div class="mark" style="left:${m.mev / scale * 100}%"></div><div class="mark" style="left:${m.mrv / scale * 100}%"></div></div>
        <div class="s">MEV ${m.mev} · MRV ${m.mrv} séries/sem.</div></div>
      <div class="kpi"><div class="l">Récupération</div><div class="v" style="color:${recoveryColor(rec.pct)}">${rec.pct} %</div><div class="s">Dernière : ${ago(v28.last || S.lastTrained(id)?.start)}</div></div>
      <div class="kpi"><div class="l">Moy. 4 sem.</div><div class="v">${n1(v28.sets / 4)}</div><div class="s">séries / semaine</div></div>
      <div class="kpi"><div class="l">Tonnage 7 j</div><div class="v">${kg(v7.tonnage)}</div><div class="s">${v7.directSets} séries directes</div></div>
    </div>
    <div class="card"><h3>Séries / semaine <span class="muted small">12 sem.</span></h3><div id="muscleChart"></div></div>
    <div class="section-title">Exercices & machines (${primary.length + secondary.length})</div>
    <div class="chips" id="equipChips">
      <button class="chip ${!state.equipFilter ? 'on' : ''}" data-eq="">Tout</button>
      ${EQUIPMENT.filter(e => equipIn.includes(e)).map(e => `<button class="chip ${state.equipFilter === e ? 'on' : ''}" data-eq="${esc(e)}">${esc(e)}</button>`).join('')}
    </div>
    <div class="section-title">Ciblage principal</div>
    <div class="ex-list">${primary.filter(fil).map(exCard).join('') || '<p class="muted">Aucun exercice avec ce filtre.</p>'}</div>
    ${secondary.filter(fil).length ? `<div class="section-title">Sollicité en secondaire</div><div class="ex-list">${secondary.filter(fil).map(exCard).join('')}</div>` : ''}
  `;
  $('#backAll').addEventListener('click', () => selectMuscle(null));
  $$('#equipChips [data-eq]').forEach(b => b.addEventListener('click', () => { state.equipFilter = b.dataset.eq || null; renderPanel(); }));
  bindExCards(el);
  const w = S.weeklyMuscle(id, 12);
  barChart($('#muscleChart'), w.map(x => ({ label: new Date(x.t).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), v: x.sets, color: volumeStatus(id, x.sets).color })),
    { height: 170, fmt: v => n1(v), refLines: [{ v: m.mev, label: 'MEV', color: '#3b82f6' }, { v: m.mrv, label: 'MRV', color: '#ef4444' }] });
}

function exCard(e) {
  const sum = S.exerciseSummary(e.id);
  const isMachine = ['Machine', 'Smith', 'Poulie'].includes(e.equip);
  return `<div class="ex" data-ex="${e.id}">
    <div><div class="n">${esc(e.name)}</div>
      <div class="m"><span class="tag ${isMachine ? 'machine' : ''}">${esc(e.equip)}</span><span class="tag ${e.mech}">${e.mech === 'poly' ? 'Polyarticulaire' : 'Isolation'}</span>${e.machine ? esc(e.machine) : ''}</div></div>
    <div class="row">
      ${sum ? `<div class="pr">${S.TIMED.has(e.id) ? sum.bestSet.r + ' s' : 'e1RM ' + n1(sum.bestE1rm) + ' kg'}<div class="muted">${sum.count} séances</div></div>` : ''}
      <button class="btn sm icon" data-add="${e.id}" title="Ajouter à la séance">＋</button>
    </div></div>`;
}
function bindExCards(el) {
  $$('[data-ex]', el).forEach(c => c.addEventListener('click', ev => {
    if (ev.target.closest('[data-add]')) return;
    openExercise(c.dataset.ex);
  }));
  $$('[data-add]', el).forEach(b => b.addEventListener('click', () => { store.addExercise(b.dataset.add); toast(`« ${EXERCISES[b.dataset.add].name} » ajouté à la séance`); render(); }));
}

// ============================================================ MODALE EXERCICE
function openModal(html, onMount) {
  $('#modalBody').innerHTML = html; $('#modal').hidden = false; onMount?.($('#modalBody'));
}
function closeModal() { $('#modal').hidden = true; $('#modalBody').innerHTML = ''; }
$('#modalClose').addEventListener('click', closeModal);
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function openExercise(exId) {
  const e = EXERCISES[exId];
  const sum = S.exerciseSummary(exId);
  const timed = S.TIMED.has(exId);
  const chip = (m, sec) => `<button class="chip ${sec ? 'sec' : 'p'}" data-goto="${m}">${esc(MUSCLES[m].name)}</button>`;
  let statsHtml = '<div class="notice">Aucune donnée encore. Ajoute cet exercice à une séance pour suivre ta progression.</div>';
  if (sum) {
    const last = sum.last;
    const repRows = Object.entries(sum.repPR).map(([r, p]) => [Number(r), p]).filter(([r]) => r <= 20).sort((a, b) => a[0] - b[0]);
    statsHtml = `
      <div class="kpis wide">
        ${timed ? `<div class="kpi"><div class="l">Meilleur temps</div><div class="v">${sum.bestSet.r} s</div></div>` : `
        <div class="kpi"><div class="l">e1RM record</div><div class="v">${n1(sum.bestE1rm)} kg</div><div class="s">${n1(sum.bestSet.load)} kg × ${sum.bestSet.r}${sum.bestSet.rpe ? ' @' + sum.bestSet.rpe : ''} · ${fmtDate(sum.bestDate)}</div></div>
        <div class="kpi"><div class="l">Charge max</div><div class="v">${n1(sum.maxLoad)} kg</div></div>
        <div class="kpi"><div class="l">Progression e1RM</div><div class="v" style="color:${sum.progression >= 0 ? 'var(--good)' : 'var(--bad)'}">${sum.progression >= 0 ? '+' : ''}${n1(sum.progression * 100)} %</div><div class="s">${sum.slope >= 0 ? '+' : ''}${n1(sum.slope)} kg / semaine (régression)</div></div>
        <div class="kpi"><div class="l">Tonnage cumulé</div><div class="v">${kg(sum.totalTonnage)}</div></div>`}
        <div class="kpi"><div class="l">Séances</div><div class="v">${sum.count}</div><div class="s">${sum.totalSets} séries · ${sum.totalReps} reps</div></div>
        <div class="kpi"><div class="l">Dernière fois</div><div class="v" style="font-size:16px">${fmtDate(last.t)}</div><div class="s">${last.sets.map(x => (timed ? x.r + ' s' : `${n1(S.effLoad(exId, x.w))}×${x.r}`)).join(' · ')}</div></div>
      </div>
      ${timed ? '' : `<div class="grid2">
        <div class="card"><h3>e1RM par séance <span class="muted small">Epley corrigé RPE</span></h3><div id="chE1"></div></div>
        <div class="card"><h3>Tonnage par séance</h3><div id="chTon"></div></div>
      </div>
      <div class="card" style="margin-top:14px"><h3>Records par nombre de reps</h3><div class="tbl-scroll"><table>
        <tr><th>Reps</th>${repRows.map(([r]) => `<th class="r">${r}</th>`).join('')}</tr>
        <tr><td class="muted">Charge</td>${repRows.map(([, p]) => `<td class="r">${n1(p.load)}</td>`).join('')}</tr>
        <tr><td class="muted">e1RM</td>${repRows.map(([r, p]) => `<td class="r muted">${n1(S.e1rm(p.load, r))}</td>`).join('')}</tr>
      </table></div></div>`}
      <div class="card" style="margin-top:14px"><h3>Historique</h3><div class="tbl-scroll"><table>
        <tr><th>Date</th><th>Séries</th><th class="r">Meilleure</th><th class="r">${timed ? '' : 'e1RM'}</th><th class="r">RPE moy.</th></tr>
        ${sum.history.slice().reverse().slice(0, 15).map(r => `<tr><td>${fmtDate(r.t)}</td><td class="muted small">${r.sets.map(x => timed ? x.r + 's' : `${n1(S.effLoad(exId, x.w))}×${x.r}`).join(', ')}</td>
          <td class="r">${timed ? r.best.r + ' s' : n1(r.best.load) + '×' + r.best.r}</td><td class="r">${timed ? '' : n1(r.best.e1rm)}</td><td class="r">${r.avgRpe ? n1(r.avgRpe) : '—'}</td></tr>`).join('')}
      </table></div></div>`;
  }
  openModal(`
    <div class="spread" style="padding-right:40px"><div><h2>${esc(e.name)}</h2>
      <div class="m muted" style="margin-top:6px"><span class="tag">${esc(e.equip)}</span><span class="tag ${e.mech}">${e.mech === 'poly' ? 'Polyarticulaire' : 'Isolation'}</span>${esc(e.machine)}</div></div>
      <button class="btn primary" id="mAdd">＋ Ajouter à la séance</button></div>
    ${e.tip ? `<p class="muted" style="margin:12px 0 0">💡 ${esc(e.tip)}</p>` : ''}
    <div class="section-title">Muscles</div>
    <div class="chips">${e.primary.map(m => chip(m)).join('')}${e.secondary.map(m => chip(m, true)).join('')}</div>
    <p class="muted small">Plein = principal · pointillé = secondaire (compté 0,5 série)</p>
    <div class="section-title">Mes stats</div>
    ${statsHtml}`, root => {
    $('#mAdd', root).addEventListener('click', () => { store.addExercise(exId); closeModal(); toast(`« ${e.name} » ajouté à la séance`); render(); });
    $$('[data-goto]', root).forEach(b => b.addEventListener('click', () => { closeModal(); setTab('body'); selectMuscle(b.dataset.goto); }));
    if (sum && !timed) {
      lineChart($('#chE1', root), sum.history.map(r => ({ t: r.t, v: r.best.e1rm, label: `${n1(r.best.e1rm)} kg (${n1(r.best.load)}×${r.best.r})` })), { fmt: v => Math.round(v) + '' });
      lineChart($('#chTon', root), sum.history.map(r => ({ t: r.t, v: r.tonnage })), { fmt: v => (v >= 1000 ? n1(v / 1000) + 't' : Math.round(v) + ''), color: '#a78bfa' });
    }
  });
}

// ============================================================ SÉANCE
let timerInt = null;
function renderWorkout() {
  const el = $('#workoutView');
  clearInterval(timerInt);
  const s = store.active;
  if (!s) {
    const recent = store.sessions.slice(-3).reverse();
    el.innerHTML = `<div class="empty"><h2>Pas de séance en cours</h2><p class="muted">Démarre une séance vide, ou ajoute des exercices depuis le corps 3D (bouton ＋).</p>
      <div class="row" style="justify-content:center;margin-top:16px"><button class="btn primary" id="wStart">▶ Démarrer une séance</button></div></div>
      ${recent.length ? `<div class="section-title">Répéter une séance récente</div><div class="ex-list">${recent.map(r => `<div class="ex" data-repeat="${r.id}"><div><div class="n">${esc(r.name)}</div><div class="m">${fmtDate(r.start)} · ${r.exercises.map(e => esc(EXERCISES[e.exId]?.name)).join(', ')}</div></div><button class="btn sm">Répéter</button></div>`).join('')}</div>` : ''}`;
    $('#wStart').addEventListener('click', () => { store.startSession(); renderWorkout(); render(); });
    $$('[data-repeat]', el).forEach(c => c.addEventListener('click', () => {
      const r = store.sessions.find(x => x.id === c.dataset.repeat);
      store.startSession(r.name);
      r.exercises.forEach(e => store.addExercise(e.exId));
      render();
    }));
    return;
  }
  const prevFor = exId => {
    for (let i = store.sessions.length - 1; i >= 0; i--) { const e = store.sessions[i].exercises.find(x => x.exId === exId); if (e) return e.sets; }
    return [];
  };
  const doneSets = s.exercises.reduce((a, e) => a + e.sets.filter(x => x.done && !x.warmup).length, 0);
  const ton = s.exercises.reduce((a, e) => a + e.sets.filter(x => x.done && !x.warmup && !S.TIMED.has(e.exId)).reduce((b, x) => b + S.effLoad(e.exId, x.w) * x.r, 0), 0);
  el.innerHTML = `
    <div class="wk-head">
      <div style="flex:1;min-width:0"><input id="wName" value="${esc(s.name)}" aria-label="Nom de la séance"><div class="muted small">Débutée ${new Date(s.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · ${doneSets} séries validées · ${kg(ton)}</div></div>
      <div class="timer" id="wTimer">00:00</div>
      <div class="row"><button class="btn danger" id="wCancel">Annuler</button><button class="btn primary" id="wFinish">Terminer</button></div>
    </div>
    ${s.exercises.map((e, i) => {
      const ex = EXERCISES[e.exId]; const prev = prevFor(e.exId); const timed = S.TIMED.has(e.exId);
      const bwNote = S.effLoad(e.exId, 0) ? ` · charge = ${e.exId === 'assisted_pullup' ? 'PDC − assistance' : 'PDC + lest'}` : '';
      return `<div class="card wk-ex">
        <div class="spread"><div><h3 style="margin:0"><a href="#" data-open="${e.exId}" style="color:inherit;text-decoration:none">${esc(ex.name)}</a></h3>
          <div class="muted small">${ex.primary.map(m => MUSCLES[m].name).join(', ')} · ${esc(ex.equip)}${bwNote}</div></div>
          <button class="btn sm danger" data-rmex="${i}">Retirer</button></div>
        <div class="tbl-scroll"><table class="sets">
          <tr><th>#</th><th>Type</th><th class="hide-sm">Précédent</th><th>${timed ? '—' : e.exId === 'assisted_pullup' ? 'Assist.' : S.effLoad(e.exId, 0) ? 'Lest' : 'kg'}</th><th>${timed ? 'Sec.' : 'Reps'}</th><th>RPE</th><th class="hide-sm">e1RM</th><th></th><th></th></tr>
          ${e.sets.map((x, j) => {
            const p = prev[j];
            const est = timed ? 0 : S.e1rm(S.effLoad(e.exId, x.w), x.r, x.rpe);
            return `<tr class="${x.done ? 'done' : ''}">
              <td class="muted">${j + 1}</td>
              <td><button class="typ ${x.warmup ? 'w' : ''}" data-typ="${i}:${j}" title="Échauffement / travail">${x.warmup ? 'É' : 'T'}</button></td>
              <td class="prev hide-sm">${p ? (timed ? p.r + ' s' : `${n1(p.w)}×${p.r}${p.rpe ? ' @' + p.rpe : ''}`) : '—'}</td>
              <td><input type="number" inputmode="decimal" step="0.5" min="0" value="${x.w}" data-f="w" data-ij="${i}:${j}" ${timed ? 'disabled' : ''}></td>
              <td><input type="number" inputmode="numeric" min="0" value="${x.r}" data-f="r" data-ij="${i}:${j}"></td>
              <td><input class="rpe" type="number" inputmode="decimal" step="0.5" min="5" max="10" placeholder="–" value="${x.rpe ?? ''}" data-f="rpe" data-ij="${i}:${j}"></td>
              <td class="e1 hide-sm">${est ? n1(est) : ''}</td>
              <td><button class="chk" data-done="${i}:${j}">✓</button></td>
              <td><button class="btn sm icon" data-rmset="${i}:${j}" title="Supprimer la série">✕</button></td></tr>`;
          }).join('')}
        </table></div>
        <button class="btn sm" data-addset="${i}" style="margin-top:8px">＋ Série</button>
      </div>`;
    }).join('')}
    <div class="row" style="margin-top:14px"><button class="btn primary" id="wAddEx">＋ Ajouter un exercice</button></div>
    <p class="muted small" style="margin-top:14px">RPE = effort perçu (10 = échec, 9 = 1 rep en réserve…). Il affine l’e1RM. Seules les séries cochées ✓ sont enregistrées. « É » = échauffement (exclu des stats de volume).</p>`;

  const tick = () => { const sec = Math.floor((Date.now() - new Date(s.start)) / 1000); const t = $('#wTimer'); if (t) t.textContent = `${Math.floor(sec / 3600) ? Math.floor(sec / 3600) + ':' : ''}${String(Math.floor(sec / 60) % 60).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; };
  tick(); timerInt = setInterval(tick, 1000);

  $('#wName').addEventListener('change', e => { s.name = e.target.value; store.save(); });
  $('#wCancel').addEventListener('click', () => { if (confirm('Abandonner la séance en cours ? Rien ne sera enregistré.')) { store.cancelSession(); render(); } });
  $('#wFinish').addEventListener('click', () => {
    const done = store.finishSession(); stopRest();
    if (done?.exercises.length) { const sm = S.sessionSummary(done); toast(`Séance enregistrée : ${sm.sets} séries · ${kg(sm.tonnage)}`); setTab('history'); }
    else { toast('Séance vide : rien enregistré'); render(); }
  });
  $('#wAddEx').addEventListener('click', openPicker);
  $$('[data-open]', el).forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); openExercise(a.dataset.open); }));
  $$('[data-rmex]', el).forEach(b => b.addEventListener('click', () => { store.removeExercise(+b.dataset.rmex); renderWorkout(); }));
  $$('[data-addset]', el).forEach(b => b.addEventListener('click', () => { store.addSet(+b.dataset.addset); renderWorkout(); }));
  const ij = s => s.split(':').map(Number);
  $$('[data-rmset]', el).forEach(b => b.addEventListener('click', () => { const [i, j] = ij(b.dataset.rmset); store.removeSet(i, j); renderWorkout(); }));
  $$('[data-typ]', el).forEach(b => b.addEventListener('click', () => { const [i, j] = ij(b.dataset.typ); store.updateSet(i, j, { warmup: !s.exercises[i].sets[j].warmup }); renderWorkout(); }));
  $$('[data-f]', el).forEach(inp => inp.addEventListener('change', () => {
    const [i, j] = ij(inp.dataset.ij); const f = inp.dataset.f;
    const val = inp.value === '' ? null : Number(inp.value);
    store.updateSet(i, j, { [f]: f === 'rpe' ? (val ? Math.min(10, Math.max(5, val)) : null) : Math.max(0, val || 0) });
    renderWorkout();
  }));
  $$('[data-done]', el).forEach(b => b.addEventListener('click', () => {
    const [i, j] = ij(b.dataset.done); const set = s.exercises[i].sets[j];
    store.updateSet(i, j, { done: !set.done });
    if (set.done) startRest(EXERCISES[s.exercises[i].exId].mech === 'poly' ? 150 : 90);
    renderWorkout(); $('#activeDot').hidden = false;
  }));
}

function openPicker() {
  const st = { q: '', m: '', eq: '' };
  openModal(`<h2>Ajouter un exercice</h2>
    <div class="row" style="margin-top:12px"><input id="pQ" placeholder="Rechercher…" style="flex:1;min-width:180px" autofocus>
      <select id="pM"><option value="">Tous les muscles</option>${Object.entries(MUSCLES).map(([id, m]) => `<option value="${id}">${esc(m.name)}</option>`).join('')}</select>
      <select id="pE"><option value="">Tout matériel</option>${EQUIPMENT.map(e => `<option>${esc(e)}</option>`).join('')}</select></div>
    <div class="picker-list" id="pList"></div>`, root => {
    const norm = x => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const draw = () => {
      const list = Object.values(EXERCISES).filter(e => (!st.m || e.primary.includes(st.m) || e.secondary.includes(st.m)) && (!st.eq || e.equip === st.eq) && (!st.q || norm(e.name + ' ' + e.machine).includes(norm(st.q))))
        .sort((a, b) => (st.m ? (b.primary.includes(st.m) - a.primary.includes(st.m)) : 0) || a.name.localeCompare(b.name));
      $('#pList', root).innerHTML = list.map(e => `<div class="ex" data-pick="${e.id}"><div><div class="n">${esc(e.name)}</div><div class="m"><span class="tag">${esc(e.equip)}</span>${e.primary.map(m => MUSCLES[m].name).join(', ')}</div></div><button class="btn sm">＋</button></div>`).join('') || '<p class="muted">Aucun résultat.</p>';
      $$('[data-pick]', root).forEach(c => c.addEventListener('click', () => { store.addExercise(c.dataset.pick); closeModal(); renderWorkout(); }));
    };
    $('#pQ', root).addEventListener('input', e => { st.q = e.target.value; draw(); });
    $('#pM', root).addEventListener('change', e => { st.m = e.target.value; draw(); });
    $('#pE', root).addEventListener('change', e => { st.eq = e.target.value; draw(); });
    draw();
  });
}

// Minuteur de repos
let restEnd = 0, restInt = null;
function startRest(sec) {
  restEnd = Date.now() + sec * 1000; clearInterval(restInt);
  const el = $('#rest'); el.hidden = false;
  const draw = () => {
    const left = Math.max(0, Math.round((restEnd - Date.now()) / 1000));
    el.innerHTML = `<span class="muted small">Repos</span><span class="t">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span>
      <button class="btn sm" data-r="-15">−15</button><button class="btn sm" data-r="15">+15</button><button class="btn sm" data-r="x">✕</button>`;
    $$('[data-r]', el).forEach(b => b.onclick = () => { if (b.dataset.r === 'x') return stopRest(); restEnd += Number(b.dataset.r) * 1000; draw(); });
    if (left === 0) { stopRest(); navigator.vibrate?.([200, 100, 200]); toast('Repos terminé'); }
  };
  draw(); restInt = setInterval(draw, 1000);
}
function stopRest() { clearInterval(restInt); $('#rest').hidden = true; }

// ============================================================ STATS
function renderStats() {
  const el = $('#statsView');
  const g = S.globalStats();
  if (!g.sessions) {
    el.innerHTML = `<div class="empty"><h2>Pas encore de statistiques</h2><p class="muted">Enregistre ta première séance, ou charge des données de démonstration pour explorer les stats.</p>
      <div class="row" style="justify-content:center;margin-top:16px"><button class="btn primary" id="sDemo">Charger 12 semaines de démo</button><button class="btn" id="sGo">Démarrer une séance</button></div></div>`;
    $('#sDemo').addEventListener('click', () => { store.generateDemo(); toast('Données de démo générées'); render(); });
    $('#sGo').addEventListener('click', () => setTab('workout'));
    return;
  }
  const hasDemo = store.sessions.some(s => s.demo);
  const v7 = S.muscleVolume(Date.now() - WEEK);
  const v28 = S.muscleVolume(Date.now() - 4 * WEEK);
  const weekly = S.weeklyGlobal(12);
  const prs = S.recentPRs(10);
  const bal = S.balance(Date.now() - 4 * WEEK);
  const totalRB = Object.values(g.repBuckets).reduce((a, b) => a + b, 0) || 1;
  const totalRPE = Object.values(g.rpeBuckets).reduce((a, b) => a + b, 0) || 1;
  const tonIn = (a, b) => store.sessions.filter(s => { const t = new Date(s.start).getTime(); return t >= a && t < b; }).reduce((x, s) => x + S.sessionSummary(s).tonnage, 0);
  const thisWeek = { tonnage: tonIn(Date.now() - WEEK, Date.now() + 1) }, prevWeek = { tonnage: tonIn(Date.now() - 2 * WEEK, Date.now() - WEEK) };
  const delta = (a, b) => (b ? `${a >= b ? '+' : ''}${n1((a - b) / b * 100)} % vs 7 j préc.` : '');

  el.innerHTML = `
    ${hasDemo ? '<div class="notice" style="margin-bottom:14px">Données de démonstration affichées. Supprime-les dans Historique → Réglages.</div>' : ''}
    <div class="spread"><h2>Statistiques</h2><span class="muted small">${g.sessions} séances depuis le ${fmtDate(store.sessions[0].start)}</span></div>
    <div class="kpis wide">
      <div class="kpi"><div class="l">Séances / sem.</div><div class="v">${n1(g.perWeek4)}</div><div class="s">4 dernières sem. · moy. globale ${n1(g.perWeek)}</div></div>
      <div class="kpi"><div class="l">Série en cours</div><div class="v">${g.streak} sem.</div><div class="s">semaines consécutives</div></div>
      <div class="kpi"><div class="l">Durée moyenne</div><div class="v">${g.avgDuration ? Math.round(g.avgDuration) + ' min' : '—'}</div><div class="s">densité ${g.density ? Math.round(g.density) + ' kg/min' : '—'}</div></div>
      <div class="kpi"><div class="l">Tonnage 7 j</div><div class="v">${kg(thisWeek.tonnage)}</div><div class="s">${delta(thisWeek.tonnage, prevWeek.tonnage)}</div></div>
      <div class="kpi"><div class="l">Tonnage total</div><div class="v">${kg(g.tonnage)}</div><div class="s">${g.reps.toLocaleString('fr-FR')} reps</div></div>
      <div class="kpi"><div class="l">Séries effectives</div><div class="v">${g.sets.toLocaleString('fr-FR')}</div><div class="s">+ ${g.warmupSets} d’échauffement</div></div>
      <div class="kpi"><div class="l">RPE moyen</div><div class="v">${g.avgRpe ? n1(g.avgRpe) : '—'}</div><div class="s">renseigné sur ${Math.round(g.rpeCoverage * 100)} % des séries</div></div>
      <div class="kpi"><div class="l">Records (e1RM)</div><div class="v">${prs.length}</div><div class="s">${prs[0] ? 'dernier ' + ago(prs[0].t) : ''}</div></div>
    </div>

    <div class="card"><h3>Régularité <span class="muted small">26 semaines · séries par jour</span></h3><div id="cal"></div></div>
    <div class="grid2" style="margin-top:14px">
      <div class="card"><h3>Tonnage hebdomadaire</h3><div id="chWT"></div></div>
      <div class="card"><h3>Séries effectives / semaine</h3><div id="chWS"></div></div>
    </div>

    <div class="card" style="margin-top:14px"><h3>Volume par muscle <span class="muted small">séries effectives (direct = 1 · secondaire = 0,5)</span></h3>
      <div class="tbl-scroll"><table>
        <tr><th>Muscle</th><th class="r">7 j</th><th class="r">Moy. 4 sem.</th><th class="r">MEV–MRV</th><th>Statut 7 j</th><th class="r">Tonnage 7 j</th><th class="r">Récup.</th><th class="r">Dernière</th></tr>
        ${Object.entries(MUSCLES).sort((a, b) => v7[b[0]].sets - v7[a[0]].sets).map(([id, m]) => {
          const st = volumeStatus(id, v7[id].sets); const rc = S.recovery(id);
          return `<tr data-gm="${id}" style="cursor:pointer"><td>${esc(m.name)}</td><td class="r">${n1(v7[id].sets)}</td><td class="r">${n1(v28[id].sets / 4)}</td><td class="r muted">${m.mev}–${m.mrv}</td><td><span class="status ${st.cls}">${st.label}</span></td><td class="r">${kg(v7[id].tonnage)}</td><td class="r" style="color:${recoveryColor(rc.pct)}">${rc.pct} %</td><td class="r muted">${ago(v28[id].last || S.lastTrained(id)?.start)}</td></tr>`;
        }).join('')}
      </table></div></div>

    <div class="grid3" style="margin-top:14px">
      <div class="card"><h3>Équilibres <span class="muted small">4 sem.</span></h3>
        ${bal.map(b => `<div style="margin:8px 0"><div class="spread"><span>${b.label}</span><b class="num" style="color:${b.ratio == null ? 'var(--muted)' : b.ok(b.ratio) ? 'var(--good)' : 'var(--warn)'}">${b.ratio == null ? '—' : n1(b.ratio)}</b></div><div class="muted small">${n1(b.a)} vs ${n1(b.b)} séries · cible ${b.target}</div></div>`).join('')}
      </div>
      <div class="card"><h3>Plages de répétitions</h3>
        ${Object.entries(g.repBuckets).map(([k, v]) => `<div class="hbar"><span>${k} reps</span><div class="b"><i style="width:${v / totalRB * 100}%"></i></div><span class="num r">${Math.round(v / totalRB * 100)} %</span></div>`).join('')}
        <h3 style="margin-top:16px">Intensité (RPE)</h3>
        ${Object.entries(g.rpeBuckets).map(([k, v]) => `<div class="hbar"><span>RPE ${k}</span><div class="b"><i style="width:${v / totalRPE * 100}%;background:#a78bfa"></i></div><span class="num r">${Math.round(v / totalRPE * 100)} %</span></div>`).join('')}
      </div>
      <div class="card"><h3>Exercices les plus fréquents</h3>
        ${g.topExercises.map(([id, c]) => `<div class="hbar" style="cursor:pointer" data-oe="${id}"><span title="${esc(EXERCISES[id]?.name)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(EXERCISES[id]?.name)}</span><div class="b"><i style="width:${c / g.topExercises[0][1] * 100}%;background:#22c55e"></i></div><span class="num r">${c}</span></div>`).join('')}
      </div>
    </div>

    <div class="card" style="margin-top:14px"><h3>Records récents <span class="muted small">nouvelle meilleure e1RM</span></h3>
      ${prs.length ? `<div class="tbl-scroll"><table><tr><th>Date</th><th>Exercice</th><th class="r">Série</th><th class="r">e1RM</th><th class="r">Gain</th></tr>
      ${prs.map(p => `<tr data-oe="${p.exId}" style="cursor:pointer"><td>${fmtDate(p.t)}</td><td>${esc(EXERCISES[p.exId].name)}</td><td class="r">${n1(S.effLoad(p.exId, p.set.w))}×${p.set.r}${p.set.rpe ? ' @' + p.set.rpe : ''}</td><td class="r">${n1(p.e1rm)} kg</td><td class="r" style="color:var(--good)">+${n1(p.e1rm - p.prev)} kg</td></tr>`).join('')}</table></div>` : '<p class="muted">Aucun record pour l’instant.</p>'}
    </div>

    <div class="card" style="margin-top:14px"><h3>Méthodologie</h3>
      <p class="muted small" style="margin:0;line-height:1.6">
        <b>e1RM</b> : formule d’Epley, charge × (1 + reps/30), où les reps incluent les reps en réserve déduites du RPE (RPE 8 → +2). Fiabilité réduite au-delà de ~12 reps.
        <b>Charge effective</b> des exercices au poids du corps : poids de corps × part déplacée (tractions/dips 100 %, pompes ≈ 64 %) + lest ; tractions assistées : PDC − assistance.
        <b>Séries effectives</b> : séries hors échauffement ; un muscle secondaire reçoit 0,5 série.
        <b>MEV / MRV</b> : repères moyens de volume hebdomadaire (minimum efficace / maximum récupérable), à individualiser.
        <b>Récupération</b> : estimation 36–60 h selon la taille du muscle, modulée par le volume de la dernière séance. Indicatif, pas une mesure physiologique.
      </p></div>`;

  calendarHeatmap($('#cal'), S.trainingDays());
  barChart($('#chWT'), weekly.map(w => ({ label: new Date(w.t).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), v: w.tonnage })), { fmt: v => (v >= 1000 ? n1(v / 1000) + 't' : Math.round(v)) });
  barChart($('#chWS'), weekly.map(w => ({ label: new Date(w.t).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), v: w.sets, color: '#a78bfa' })));
  $$('[data-gm]', el).forEach(r => r.addEventListener('click', () => { setTab('body'); selectMuscle(r.dataset.gm); }));
  $$('[data-oe]', el).forEach(r => r.addEventListener('click', () => openExercise(r.dataset.oe)));
}

// ============================================================ HISTORIQUE & RÉGLAGES
function renderHistory() {
  const el = $('#historyView');
  const list = store.sessions.slice().reverse();
  el.innerHTML = `
    <div class="spread"><h2>Historique</h2><span class="muted small">${list.length} séances</span></div>
    <div style="margin-top:14px">
    ${list.length ? list.slice(0, 200).map(s => {
      const sm = S.sessionSummary(s);
      const top = Object.entries(sm.muscles).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([m]) => MUSCLES[m].name);
      return `<div class="card hist-item" data-hs="${s.id}">
        <div class="spread"><div><b>${esc(s.name)}</b>${s.demo ? ' <span class="tag">démo</span>' : ''}<div class="muted small">${new Date(s.start).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${sm.duration ? ' · ' + Math.round(sm.duration) + ' min' : ''}</div></div>
        <div class="row"><span class="num">${sm.sets} séries</span><span class="muted">·</span><span class="num">${kg(sm.tonnage)}</span></div></div>
        <div class="muted small" style="margin-top:6px">${top.join(' · ')}</div>
        <div class="det">
          <table>${s.exercises.map(e => `<tr><td><a href="#" data-oe="${e.exId}" style="color:var(--accent2);text-decoration:none">${esc(EXERCISES[e.exId]?.name ?? e.exId)}</a></td><td class="muted small">${e.sets.map(x => `${x.warmup ? '<span style="color:var(--warn)">É</span> ' : ''}${S.TIMED.has(e.exId) ? x.r + ' s' : n1(x.w) + '×' + x.r}${x.rpe ? ' @' + x.rpe : ''}`).join(' · ')}</td></tr>`).join('')}</table>
          <div class="row" style="margin-top:10px"><button class="btn sm danger" data-del="${s.id}">Supprimer la séance</button></div>
        </div></div>`;
    }).join('') : '<p class="muted">Aucune séance enregistrée.</p>'}
    </div>

    <div class="section-title">Réglages & données</div>
    <div class="card">
      <div class="row"><label for="bw">Poids de corps (kg)</label><input id="bw" type="number" step="0.1" min="30" max="250" value="${store.data.settings.bodyweight}" style="width:100px">
        <span class="muted small">Sert à calculer la charge des tractions, dips, pompes…</span></div>
      <div class="row" style="margin-top:14px">
        <button class="btn" id="hExport">Exporter (JSON)</button>
        <label class="btn" style="display:inline-block">Importer (JSON)<input type="file" id="hImport" accept="application/json,.json" hidden></label>
        <button class="btn" id="hDemo">Générer des données de démo</button>
        <button class="btn" id="hClearDemo">Supprimer la démo</button>
        <button class="btn danger" id="hReset">Tout effacer</button>
      </div>
      <p class="muted small" style="margin-bottom:0">Données stockées uniquement dans ce navigateur (localStorage). Exporte régulièrement pour ne rien perdre.</p>
    </div>`;

  $$('[data-hs]', el).forEach(c => c.addEventListener('click', ev => { if (ev.target.closest('button,a')) return; c.classList.toggle('open'); }));
  $$('[data-oe]', el).forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); openExercise(a.dataset.oe); }));
  $$('[data-del]', el).forEach(b => b.addEventListener('click', () => { if (confirm('Supprimer cette séance ?')) { store.deleteSession(b.dataset.del); renderHistory(); } }));
  $('#bw').addEventListener('change', e => { const v = Number(e.target.value); if (v > 0) { store.setBodyweight(v); toast('Poids de corps enregistré'); } });
  $('#hExport').addEventListener('click', () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `muscu-atlas-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#hImport').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { store.importJSON(await f.text()); toast('Import réussi'); render(); } catch (err) { alert('Import impossible : ' + err.message); }
  });
  $('#hDemo').addEventListener('click', () => { store.generateDemo(); toast('12 semaines de démo générées'); render(); });
  $('#hClearDemo').addEventListener('click', () => { store.clearDemo(); toast('Données de démo supprimées'); render(); });
  $('#hReset').addEventListener('click', () => { if (confirm('Effacer TOUTES les données ? Action irréversible.')) { store.resetAll(); render(); } });
}

// ============================================================ UTILITAIRES
let toastT = null;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2600);
}

store.subscribe(() => { $('#activeDot').hidden = !store.active; });
render();
initBody();
