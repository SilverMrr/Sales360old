import { MUSCLES, EQUIPMENT, EXERCISES, OBJECTIVES, RPE_HELP, DIFFICULTY, gym, availability, exercisesForMuscle } from './data.js';
import { generateSession, TEMPLATES } from './generator.js';
import { hasAnim, mountAnim, animInfo } from './anim.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const isWide = () => window.matchMedia('(min-width: 900px)').matches;

const ICON = {
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  chev: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  body: '<svg viewBox="0 0 24 24"><circle cx="12" cy="4.5" r="2.2"/><path d="M5 9l7 1.5L19 9M12 10.5V15M12 15l-3 6M12 15l3 6"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg>',
  swap: '<svg viewBox="0 0 24 24"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>',
};
const AV = { ok: ['ok', 'Courant en salle'], maybe: ['maybe', 'Si disponible'], no: ['no', 'Absent de ta salle'] };
const MECH = { poly: 'Polyarticulaire', iso: 'Isolation' };
// muscles visibles de dos : la caméra se place derrière quand on les choisit dans la liste
const BACK = new Set(['traps', 'rhomboids', 'lats', 'lowerback', 'glutes', 'hamstrings', 'delt_post', 'calves', 'triceps', 'rotator']);
const actColor = p => p >= 40 ? '#ff3b30' : p >= 25 ? '#ff7a45' : p >= 12 ? '#ffb347' : p > 0 ? '#ffe08a' : null;
const LEGEND = [['#ff3b30', '≥ 40 %'], ['#ff7a45', '25–39 %'], ['#ffb347', '12–24 %'], ['#ffe08a', '< 12 %']];

const state = { tab: 'body', muscle: null, highlight: null, objective: store.get('muscu.obj', 'masse'), lib: { q: '', m: '', eq: '', mech: '', mine: false, anim: false } };
let body = null;

// ============================================================ ONGLETS
function setTab(tab) {
  state.tab = tab;
  $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.tab').forEach(s => s.classList.toggle('active', s.id === 'tab-' + tab));
  if (tab === 'library') renderLibrary();
  if (tab === 'session') renderGenerator();
  if (tab === 'body') { renderSheet(); requestAnimationFrame(syncInset); }
}
$$('#tabs button').forEach(b => b.addEventListener('click', () => { closeAllPages(); setTab(b.dataset.tab); }));

// ============================================================ CORPS 3D
async function initBody() {
  try {
    const { Body3D } = await import('./body.js');
    const tip = $('#tooltip');
    body = new Body3D($('#viewer'), {
      clickable: Object.keys(MUSCLES),
      onSelect: id => {
        if (id) { if (state.highlight) { state.highlight = null; applyHighlight(); } selectMuscle(id, { fromBody: true }); }
        else if (state.muscle) selectMuscle(null);
      },
      onHover: (id, e) => {
        if (!id || !e) { tip.hidden = true; return; }
        const r = $('#viewer').getBoundingClientRect();
        tip.hidden = false; tip.style.left = e.clientX - r.left + 'px'; tip.style.top = e.clientY - r.top + 'px';
        const pct = state.highlight ? EXERCISES[state.highlight].act[id] : null;
        tip.innerHTML = esc(MUSCLES[id].name) + (pct ? ` · <b>${pct} %</b>` : '');
      },
      onProgress: p => { $('#loadBar').style.width = Math.round(p * 100) + '%'; },
    });
    syncInset();
    await body.ready;
    $('#loading').hidden = true;
    applyHighlight();
    if (state.muscle) { body.select(state.muscle); body.frame(state.muscle, BACK.has(state.muscle) ? 'back' : 'front'); }
  } catch (err) {
    console.error(err);
    $('#loading').hidden = true;
    $('#glError').hidden = false;
    setSheet('half');
  }
}
const curView = () => $('#viewSeg .on')?.dataset.view;
function setViewBtn(name) { $$('#viewSeg button').forEach(b => b.classList.toggle('on', b.dataset.view === name)); }
$$('#viewSeg button').forEach(b => b.addEventListener('click', () => { setViewBtn(b.dataset.view); body?.view(b.dataset.view); }));
$('#resetView').addEventListener('click', () => body?.reset(curView() || 'front'));
$('#autoRot').addEventListener('click', e => { const on = !e.currentTarget.classList.contains('on'); e.currentTarget.classList.toggle('on', on); body?.setAutoRotate(on); if (on) setViewBtn(null); });
$('#viewer').addEventListener('pointerdown', e => { if (e.target.tagName === 'CANVAS') setViewBtn(null); });

function applyHighlight() {
  const bar = $('#hlBar');
  if (!state.highlight) { body?.setColorFn(null); bar.hidden = true; return; }
  const ex = EXERCISES[state.highlight];
  body?.setColorFn(id => actColor(ex.act[id] || 0));
  bar.hidden = false;
  bar.innerHTML = LEGEND.map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join('');
}
function clearHighlight() { state.highlight = null; applyHighlight(); renderSheet(); setSheet('peek'); body?.reset(curView() || 'front'); }
function showOnBody(exId) {
  const ex = EXERCISES[exId];
  closeAllPages();
  state.highlight = exId; state.muscle = null; body?.select(null);
  setTab('body'); applyHighlight(); renderSheet(); setSheet('half');
  const side = BACK.has(ex.primary[0]) ? 'back' : 'front';
  setViewBtn(side);
  const main = Object.keys(ex.act).filter(m => ex.act[m] >= 12);
  requestAnimationFrame(() => body?.frame(main.length ? main : ex.primary, side));
}

function selectMuscle(id, { fromBody = false } = {}) {
  state.muscle = id;
  body?.select(id);
  renderSheet();
  if (id) {
    if (sheet.dataset.state === 'peek') setSheet('half');
    $('#sheetBody').scrollTop = 0;
    const side = fromBody ? undefined : (BACK.has(id) ? 'back' : 'front');
    if (side) setViewBtn(side); else setViewBtn(null);
    body?.frame(id, side);
  } else {
    setSheet('peek');
    body?.reset(curView());
  }
}

// ============================================================ FEUILLE (panneau muscle)
const sheet = $('#sheet');
const ORDER = ['peek', 'half', 'full'];
function setSheet(s) { sheet.dataset.state = s; syncInset(); }
function syncInset() {
  if (!body) return;
  if (isWide()) { body.setInset(0); return; }
  const H = $('#viewer').clientHeight, st = sheet.dataset.state;
  body.setInset(st === 'peek' ? 70 : st === 'half' ? H * 0.5 : 0);
}
window.addEventListener('resize', syncInset);
(() => {
  // glisser l'en-tête vers le haut / le bas ; un simple appui fait monter d'un cran
  const head = $('#sheetHead');
  let y0 = null, moved = false;
  head.addEventListener('pointerdown', e => { if (isWide() || e.target.closest('button')) return; y0 = e.clientY; moved = false; try { head.setPointerCapture(e.pointerId); } catch {} });
  head.addEventListener('pointermove', e => { if (y0 != null && Math.abs(e.clientY - y0) > 8) moved = true; });
  head.addEventListener('pointerup', e => {
    if (y0 == null) return;
    const dy = e.clientY - y0, i = ORDER.indexOf(sheet.dataset.state); y0 = null;
    if (!moved) setSheet(i === 2 ? 'half' : ORDER[i + 1]);
    else if (dy < -30) setSheet(ORDER[Math.min(2, i + 1)]);
    else if (dy > 30) setSheet(ORDER[Math.max(0, i - 1)]);
  });
  head.addEventListener('pointercancel', () => { y0 = null; });
})();

function renderSheet() {
  const head = $('#sheetHead'), el = $('#sheetBody');
  // --- mode « voir sur le corps »
  if (state.highlight) {
    const ex = EXERCISES[state.highlight];
    head.innerHTML = `<div class="sh-row"><div class="t"><h2>${esc(ex.name)}</h2><div class="s">Muscles colorés selon leur part du travail</div></div><button class="x" id="shClose" title="Retirer la coloration">${ICON.x}</button></div>`;
    el.innerHTML = `<div class="label">Activation estimée</div>${actBars(ex)}
      <button class="btn primary block" id="hlOpen" style="margin-top:16px">Ouvrir la fiche de l’exercice</button>`;
    $('#shClose').onclick = clearHighlight;
    $('#hlOpen').onclick = () => openExercise(ex.id);
    bindMuscleLinks(el);
    return;
  }
  // --- aucun muscle : liste des muscles
  const id = state.muscle;
  if (!id) {
    const groups = {};
    for (const [mid, m] of Object.entries(MUSCLES)) (groups[m.group] ||= []).push([mid, m]);
    head.innerHTML = `<div class="sh-row"><div class="t"><h2>Choisis un muscle</h2><div class="s">${isWide() ? 'Clique-le sur le corps ou dans la liste' : 'Touche-le sur le corps, ou glisse vers le haut'}</div></div></div>`;
    el.innerHTML = `<div class="mgroups">${Object.entries(groups).map(([g, list]) => `<div><h4>${esc(g)}</h4><div class="chips">${list.map(([mid, m]) => `<button class="chip" data-m="${mid}">${esc(m.name)}</button>`).join('')}</div></div>`).join('')}</div>`;
    $$('[data-m]', el).forEach(b => b.addEventListener('click', () => selectMuscle(b.dataset.m)));
    return;
  }
  // --- muscle sélectionné
  const m = MUSCLES[id];
  const list = exercisesForMuscle(id);
  const sec = { ok: [], maybe: [], no: [] };
  for (const e of list) sec[availability(e)].push(e);
  head.innerHTML = `<div class="sh-row"><div class="t"><h2>${esc(m.name)}</h2><div class="s">${esc(m.group)} · ${sec.ok.length + sec.maybe.length} exercices</div></div><button class="x" id="shClose" title="Fermer">${ICON.x}</button></div>`;
  el.innerHTML = `
    <details class="fold"><summary>Rôle du muscle et conseils</summary><div class="in">
      <h4>Fonction</h4><p class="txt">${esc(m.fn)}</p>
      <h4>Comment le cibler</h4><p class="txt">${esc(m.tips)}</p>
      <h4>Volume conseillé (hypertrophie)</h4><p class="txt">${m.mev ? `À partir de <b>${m.mev}</b> séries/semaine` : 'Pas de minimum si les exercices de base le sollicitent déjà'} ; au-delà de <b>${m.mrv}</b> séries/semaine, la récupération devient difficile.</p>
      <p class="muted small" style="margin-top:10px"><i>${esc(m.latin)}</i></p>
    </div></details>
    ${sec.ok.length ? `<div class="label"><span>Dans ta salle</span><span>sollicitation</span></div><div class="ex-list">${sec.ok.map(e => exCard(e, { muscle: id })).join('')}</div>` : ''}
    ${sec.maybe.length ? `<div class="label"><span>Si disponible dans ton club</span></div><div class="ex-list">${sec.maybe.map(e => exCard(e, { muscle: id })).join('')}</div>` : ''}
    ${sec.no.length ? `<details class="fold" style="margin-top:18px"><summary>Matériel absent de ta salle (${sec.no.length})</summary><div class="in"><div class="ex-list dim">${sec.no.map(e => exCard(e, { muscle: id })).join('')}</div></div></details>` : ''}`;
  $('#shClose').onclick = () => selectMuscle(null);
  bindExCards(el);
}

function exCard(e, { muscle } = {}) {
  const pct = muscle ? e.act[muscle] : null;
  const av = availability(e);
  const sub = muscle ? `${e.equip} · ${MECH[e.mech]}` : `${e.equip} · ${e.primary.map(m => MUSCLES[m].name).join(', ')}`;
  const avTxt = !muscle && av !== 'ok' ? ` · <span style="color:${av === 'maybe' ? '#fde047' : '#fca5a5'}">${AV[av][1].toLowerCase()}</span>` : '';
  return `<button class="ex" data-ex="${e.id}">
    <div class="t"><div class="n">${esc(e.name)}</div>
      <div class="m">${hasAnim(e.id) ? '<span class="play">▶ Animé</span> · ' : ''}${esc(sub)}${avTxt}</div></div>
    ${pct != null ? `<div class="pct">${pct} %<div class="pbar"><i style="width:${pct}%;background:${actColor(pct)}"></i></div></div>` : `<span class="chev">${ICON.chev}</span>`}
  </button>`;
}
function bindExCards(el) { $$('[data-ex]', el).forEach(c => c.addEventListener('click', () => openExercise(c.dataset.ex))); }
function bindMuscleLinks(el) {
  $$('[data-goto]', el).forEach(b => b.addEventListener('click', () => {
    closeAllPages(); state.highlight = null; applyHighlight(); setTab('body'); selectMuscle(b.dataset.goto);
  }));
}
function actBars(ex) {
  return `<div class="acts">${Object.entries(ex.act).sort((a, b) => b[1] - a[1]).map(([m, p]) => `
    <button class="act" data-goto="${m}" title="Voir ce muscle"><span class="nm ${ex.primary.includes(m) ? 'p' : ''}">${esc(MUSCLES[m].name)}</span>
    <span class="b"><i style="width:${p}%;background:${actColor(p)}"></i></span><span class="num">${p} %</span></button>`).join('')}</div>`;
}

// ============================================================ PAGES (fiche exercice, ma salle) + bouton retour du téléphone
const page = $('#page');
let depth = 0;
function showPage(kind, arg, push = true) {
  if (push) { depth++; history.pushState({ page: kind, arg, depth }, ''); }
  page.hidden = false;
  if (kind === 'ex') renderExercise(arg);
  if (kind === 'gym') renderGym();
  $('#pageBody').scrollTop = 0;
}
function hidePage() { page.hidden = true; $('#pageBody').innerHTML = ''; }
function closeAllPages() { if (depth > 0) { const d = depth; depth = 0; history.go(-d); } hidePage(); }
window.addEventListener('popstate', e => {
  const s = e.state;
  depth = s?.depth || 0;
  if (s?.page) showPage(s.page, s.arg, false); else hidePage();
});
$('#pageBack').addEventListener('click', () => { if (depth > 0) history.back(); else hidePage(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !page.hidden) $('#pageBack').click(); });
$('#openGym').addEventListener('click', () => showPage('gym'));
const openExercise = id => showPage('ex', id);

function renderExercise(id) {
  const e = EXERCISES[id];
  const av = availability(e);
  const anim = hasAnim(id) ? animInfo(id) : null;
  $('#pageTitle').textContent = '';
  const params = o => { const p = OBJECTIVES[o][e.mech]; return `<div class="params"><div><b>${p.sets}</b><span>séries</span></div><div><b>${p.reps}</b><span>reps</span></div><div><b>${p.rest}</b><span>repos</span></div><div><b>${p.rpe}</b><span>RPE</span></div></div><p class="muted small" style="margin-top:10px">Tempo ${esc(p.tempo)} · ${esc(OBJECTIVES[o].note)}</p>`; };
  const el = $('#pageBody');
  el.innerHTML = `<div class="stack">
    <div class="ex-head"><h1>${esc(e.name)}</h1>
      <div class="row"><span class="tag">${esc(e.equip)}</span><span class="tag">${MECH[e.mech]}</span><span class="tag">${DIFFICULTY[e.diff]}</span><span class="tag ${AV[av][0]}">${AV[av][1]}</span></div></div>

    ${anim ? `<div class="card anim-card"><div class="anim" id="animBox"></div>
      <div class="anim-ctl"><span class="muted small">Vue de ${anim.view.toLowerCase()} · en couleur : ${esc(anim.muscles)}</span>
      <span class="row"><button class="btn sm" id="aPlay">Pause</button><button class="btn sm" id="aSlow">Ralenti</button></span></div></div>` : ''}

    <div class="card"><h3>Muscles travaillés</h3>${actBars(e)}
      <p class="muted small" style="margin-top:8px">Part estimée du travail · ${esc(e.focus)}</p>
      <button class="btn block" id="mBody" style="margin-top:12px">${ICON.body} Voir sur le corps 3D</button></div>

    <div class="card"><h3>Séries et répétitions</h3>
      <div class="seg2" id="objSeg">${Object.entries(OBJECTIVES).map(([k, o]) => `<button data-o="${k}" class="${k === state.objective ? 'on' : ''}">${esc(o.name)}</button>`).join('')}</div>
      <div id="objOut">${params(state.objective)}</div>
      <p class="muted small" style="margin-top:6px">${esc(RPE_HELP)}</p></div>

    <div class="card"><h3>Exécution</h3><ol class="steps">${e.steps.filter(Boolean).map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>

    <div class="card"><h3>Erreurs fréquentes</h3>${e.errors.length ? `<ul class="errs">${e.errors.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : '<p class="muted">—</p>'}
      <h3 style="margin-top:16px">Sécurité</h3><p class="txt">${esc(e.risk)}</p></div>

    <details class="fold"><summary>Réglages et fiche technique</summary><div class="in"><table class="kv">
      <tr><td>Réglages</td><td>${esc(e.setup)}</td></tr>
      <tr><td>Matériel</td><td>${e.needs.map(n => `${esc(EQUIPMENT[n].name)}${EQUIPMENT[n].std ? '' : ' <span class="muted">(selon le club)</span>'}`).join('<br>')}</td></tr>
      <tr><td>Amplitude</td><td>${esc(e.rom)}</td></tr>
      <tr><td>Profil de résistance</td><td>${esc(e.profile)}</td></tr>
      <tr><td>Charge en étirement</td><td>${e.stretch ? 'Oui (favorable à l’hypertrophie)' : 'Non / faible'}</td></tr>
      <tr><td>Type</td><td>${e.mech === 'poly' ? 'Polyarticulaire (plusieurs articulations)' : 'Isolation (une articulation)'}</td></tr>
    </table></div></details>

    ${e.alts.length ? `<div><div class="label">Alternatives</div><div class="ex-list">${e.alts.map(a => exCard(EXERCISES[a])).join('')}</div></div>` : ''}
  </div>`;
  $('#mBody', el).onclick = () => showOnBody(id);
  $$('#objSeg button', el).forEach(b => b.addEventListener('click', () => {
    state.objective = b.dataset.o; store.set('muscu.obj', state.objective);
    $$('#objSeg button', el).forEach(x => x.classList.toggle('on', x === b));
    $('#objOut', el).innerHTML = params(state.objective);
  }));
  if (anim) {
    const a = mountAnim($('#animBox', el), id);
    $('#aPlay', el).onclick = ev => { a.playing = !a.playing; ev.currentTarget.textContent = a.playing ? 'Pause' : 'Lecture'; };
    $('#aSlow', el).onclick = ev => { a.speed = a.speed === 1 ? 0.5 : 1; ev.currentTarget.classList.toggle('on', a.speed !== 1); };
  }
  bindMuscleLinks(el);
  bindExCards(el);
}

// ============================================================ BIBLIOTHÈQUE
function renderLibrary() {
  const el = $('#libraryView'), f = state.lib;
  if (!el.dataset.init) {
    el.dataset.init = 1;
    el.classList.remove('wrap');
    const equips = [...new Set(Object.values(EXERCISES).map(e => e.equip))].sort();
    el.innerHTML = `<div class="lib-top"><div>
        <div class="search">${ICON.search}<input id="lQ" type="search" placeholder="Rechercher un exercice, une machine…" autocomplete="off"></div>
        <div class="frow">
          <select id="lM"><option value="">Tous les muscles</option>${Object.entries(MUSCLES).map(([k, m]) => `<option value="${k}">${esc(m.name)}</option>`).join('')}</select>
          <select id="lE"><option value="">Tout matériel</option>${equips.map(e => `<option>${esc(e)}</option>`).join('')}</select>
        </div>
        <div class="chips" id="lChips">
          <button class="chip" data-f="mine">Dans ma salle</button>
          <button class="chip" data-f="anim">▶ Animés</button>
          <button class="chip" data-f="poly">Polyarticulaires</button>
          <button class="chip" data-f="iso">Isolation</button>
        </div></div></div>
      <div class="wrap" style="padding-top:12px"><div class="count" id="libCount"></div><div class="ex-list" id="libList"></div></div>`;
    $('#lQ', el).addEventListener('input', ev => { f.q = ev.target.value; renderLibrary(); });
    $('#lM', el).addEventListener('change', ev => { f.m = ev.target.value; renderLibrary(); });
    $('#lE', el).addEventListener('change', ev => { f.eq = ev.target.value; renderLibrary(); });
    $$('#lChips .chip', el).forEach(c => c.addEventListener('click', () => {
      const k = c.dataset.f;
      if (k === 'poly' || k === 'iso') f.mech = f.mech === k ? '' : k; else f[k] = !f[k];
      renderLibrary();
    }));
  }
  $$('#lChips .chip', el).forEach(c => { const k = c.dataset.f; c.classList.toggle('on', k === 'poly' || k === 'iso' ? f.mech === k : !!f[k]); });
  const q = norm(f.q.trim());
  const list = Object.values(EXERCISES).filter(e =>
    (!q || norm(e.name + ' ' + e.equip + ' ' + e.setup + ' ' + e.focus + ' ' + e.primary.map(m => MUSCLES[m].name).join(' ')).includes(q)) &&
    (!f.m || e.act[f.m]) && (!f.eq || e.equip === f.eq) && (!f.mech || e.mech === f.mech) &&
    (!f.mine || availability(e) === 'ok') && (!f.anim || hasAnim(e.id)))
    .sort((a, b) => (f.m ? b.act[f.m] - a.act[f.m] : a.name.localeCompare(b.name)));
  $('#libCount', el).textContent = `${list.length} exercice${list.length > 1 ? 's' : ''}${f.m ? ` · classés par sollicitation (${MUSCLES[f.m].name})` : ''}`;
  $('#libList', el).innerHTML = list.map(e => exCard(e, { muscle: f.m || null })).join('') || '<p class="muted">Aucun exercice ne correspond.</p>';
  bindExCards($('#libList', el));
}

// ============================================================ GÉNÉRATEUR DE SÉANCE
const gen = { template: 'push', duration: 60, objective: 'masse', level: 2, maybe: false, muscles: [], result: null };
function renderGenerator() {
  const el = $('#sessionView');
  const seg = (name, opts, cur) => `<div class="seg2" data-k="${name}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  el.innerHTML = `
    <h2>Générer une séance</h2>
    <p class="muted" style="margin-top:6px;line-height:1.5">Séance complète construite avec le matériel de ta salle (<button class="link" id="gGym">modifier</button>).</p>
    <div class="card" style="margin-top:14px">
      <div class="label">Type de séance</div>${seg('template', Object.entries(TEMPLATES).map(([k, t]) => [k, t.name]), gen.template)}
      ${gen.template === 'custom' ? `<div class="label">Muscles à travailler</div><div class="chips">${Object.entries(MUSCLES).map(([k, m]) => `<button class="chip ${gen.muscles.includes(k) ? 'on' : ''}" data-cm="${k}">${esc(m.name)}</button>`).join('')}</div>` : ''}
      <div class="label">Durée</div>${seg('duration', [[30, '30 min'], [45, '45 min'], [60, '1 h'], [75, '1 h 15'], [90, '1 h 30']], gen.duration)}
      <div class="label">Objectif</div>${seg('objective', Object.entries(OBJECTIVES).map(([k, o]) => [k, o.name]), gen.objective)}
      <div class="label">Niveau</div>${seg('level', [[1, 'Débutant'], [2, 'Intermédiaire'], [3, 'Avancé']], gen.level)}
      <label class="switch"><span>Inclure le matériel « si disponible »</span><input type="checkbox" id="gMaybe" ${gen.maybe ? 'checked' : ''}></label>
      <button class="btn primary block" id="gGo" style="margin-top:18px">Générer la séance</button>
    </div>
    <div id="gOut"></div>`;
  $$('.seg2', el).forEach(s => $$('button', s).forEach(b => b.addEventListener('click', () => {
    const k = s.dataset.k; gen[k] = ['duration', 'level'].includes(k) ? Number(b.dataset.v) : b.dataset.v; gen.result = null;
    const top = $('#tab-session').scrollTop; renderGenerator(); $('#tab-session').scrollTop = top;
  })));
  $$('[data-cm]', el).forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.cm; gen.muscles = gen.muscles.includes(k) ? gen.muscles.filter(x => x !== k) : [...gen.muscles, k]; gen.result = null;
    const top = $('#tab-session').scrollTop; renderGenerator(); $('#tab-session').scrollTop = top;
  }));
  $('#gGym').addEventListener('click', () => showPage('gym'));
  $('#gMaybe').addEventListener('change', e => { gen.maybe = e.target.checked; gen.result = null; $('#gOut').innerHTML = ''; });
  $('#gGo').addEventListener('click', () => {
    if (gen.template === 'custom' && !gen.muscles.length) { toast('Choisis au moins un muscle'); return; }
    gen.result = generateSession(gen); renderResult();
    $('#gOut').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  if (gen.result) renderResult();
}
function renderResult() {
  const r = gen.result, out = $('#gOut');
  if (!r.items.length) { out.innerHTML = '<div class="notice" style="margin-top:14px">Aucun exercice disponible avec ces critères. Coche plus de matériel dans « Ma salle » ou active le matériel « si disponible ».</div>'; return; }
  const o = OBJECTIVES[gen.objective];
  out.innerHTML = `
    <div class="card" style="margin-top:16px">
      <h3 style="margin:0">${esc(TEMPLATES[gen.template].name)}</h3>
      <p class="muted small" style="margin-top:4px">${esc(o.name)} · ≈ ${r.minutes} min · ${r.items.length} exercices · ${r.totalSets} séries</p>
      <div class="box"><b>Échauffement (≈ 8 min)</b> : 5 min de cardio léger, mobilité des articulations sollicitées, puis 2–3 séries progressives (≈ 40 %, 60 %, 80 % de la charge) sur le premier exercice.</div>
      <div class="sess">
        ${r.items.map((it, i) => `<div class="srow">
          <div class="sn">${i + 1}</div>
          <button class="sx" data-open="${it.ex.id}"><div class="nm">${esc(it.ex.name)}${hasAnim(it.ex.id) ? ' <span style="color:#9cc0ff;font-size:12px">▶</span>' : ''}</div>
            <div class="muted small">${it.ex.primary.map(m => MUSCLES[m].name).join(', ')} · ${esc(it.ex.equip)}${availability(it.ex) === 'maybe' ? ' · <span style="color:#fde047">si disponible</span>' : ''}${it.p.assist ? ' · assistance' : ''}</div>
            <div class="sp"><span><b>${it.p.sets} × ${it.p.reps}</b></span><span>repos ${it.p.rest}</span><span>RPE ${it.p.rpe}</span></div></button>
          <button class="ibtn" data-swap="${i}" title="Remplacer cet exercice">${ICON.swap}</button></div>`).join('')}
      </div>
      <div class="box"><b>Séries par muscle</b> (principal = 1, secondaire = ½) : ${Object.entries(r.volume).sort((a, b) => b[1] - a[1]).map(([m, v]) => `${esc(MUSCLES[m].name)} ${String(v).replace('.', ',')}`).join(' · ')}</div>
      <p class="muted small" style="margin-top:10px">${esc(o.note)} Touche un exercice pour ouvrir sa fiche, ⇄ pour le remplacer.</p>
      <div class="row" style="margin-top:12px"><button class="btn" id="gAgain">↻ Autre proposition</button><button class="btn" id="gCopy">Copier</button></div>
    </div>`;
  $$('[data-open]', out).forEach(a => a.addEventListener('click', () => openExercise(a.dataset.open)));
  $$('[data-swap]', out).forEach(b => b.addEventListener('click', () => { gen.result = generateSession(gen, { swap: +b.dataset.swap, prev: r }); renderResult(); toast('Exercice remplacé'); }));
  $('#gAgain').addEventListener('click', () => { gen.result = generateSession(gen); renderResult(); });
  $('#gCopy').addEventListener('click', async () => {
    const txt = `${TEMPLATES[gen.template].name} · ${o.name} (≈ ${r.minutes} min)\n` + r.items.map((it, i) => `${i + 1}. ${it.ex.name} : ${it.p.sets} × ${it.p.reps}, repos ${it.p.rest}, RPE ${it.p.rpe}`).join('\n');
    try { await navigator.clipboard.writeText(txt); toast('Séance copiée'); } catch { toast('Copie impossible sur ce navigateur'); }
  });
}

// ============================================================ MA SALLE (page)
function renderGym() {
  $('#pageTitle').textContent = '';
  const el = $('#pageBody');
  const row = ([k, eq]) => `<label class="eqrow"><input type="checkbox" data-eq="${k}" ${gym.has(k) ? 'checked' : ''}><span>${esc(eq.name)}</span>${gym.has(k) !== !!eq.std ? '<span class="tag">modifié</span>' : ''}</label>`;
  const std = Object.entries(EQUIPMENT).filter(([, e]) => e.std), maybe = Object.entries(EQUIPMENT).filter(([, e]) => !e.std);
  el.innerHTML = `<div class="stack">
    <div><h1 style="font-size:25px">Ma salle</h1>
    <p class="muted" style="margin-top:8px;line-height:1.5">Profil par défaut : <b>Basic-Fit (général)</b>. Coche le matériel présent dans tes clubs : les listes d’exercices et le générateur s’adaptent.</p></div>
    <div class="grid2">
      <div class="card"><h3>Courant chez Basic-Fit</h3>${std.map(row).join('')}</div>
      <div class="card"><h3>Selon le club</h3>${maybe.map(row).join('')}</div>
    </div>
    <button class="btn" id="gReset" ${gym.customized() ? '' : 'disabled'}>Revenir au profil par défaut</button>
    <details class="fold"><summary>Sources et méthodologie</summary><div class="in"><p class="txt small">
      <b>Modèle 3D</b> : Z-Anatomy, atlas 3D libre dérivé de BodyParts3D (© The Database Center for Life Science), licence CC BY-SA 4.0. Modèle simplifié, regroupé par muscle, tête remplacée par une forme neutre ; redistribué sous la même licence.<br><br>
      <b>Activation musculaire</b> : répartitions estimées à partir de la biomécanique (bras de levier, amplitude) et des tendances des études EMG publiées. Ordres de grandeur, pas des mesures individuelles.<br><br>
      <b>Paramètres et volumes</b> : recommandations générales issues de la littérature en entraînement de force, à adapter à ton niveau et à ta récupération.<br><br>
      <b>Disponibilité Basic-Fit</b> : estimation générale ; vérifie sur place.</p></div></details>
  </div>`;
  $$('[data-eq]', el).forEach(c => c.addEventListener('change', () => { gym.set(c.dataset.eq, c.checked); refreshAfterGym(); const top = $('#pageBody').scrollTop; renderGym(); $('#pageBody').scrollTop = top; }));
  $('#gReset', el).addEventListener('click', () => { gym.reset(); refreshAfterGym(); renderGym(); toast('Profil Basic-Fit rétabli'); });
}
function refreshAfterGym() { gen.result = null; renderSheet(); if ($('#libraryView').dataset.init) renderLibrary(); if (state.tab === 'session') renderGenerator(); }

// ============================================================ UTILITAIRES
let toastT = null;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2200); }

history.replaceState({ depth: 0 }, '');
renderSheet();
initBody();
