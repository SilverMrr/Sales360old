import { MUSCLES, EQUIPMENT, EXERCISES, OBJECTIVES, RPE_HELP, DIFFICULTY, gym, availability, exercisesForMuscle } from './data.js';
import { generateSession, TEMPLATES } from './generator.js';
import { hasAnim, mountAnim, animInfo } from './anim.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const AV_LABEL = { ok: 'Courant en salle', maybe: 'Si disponible', no: 'Absent de ta salle' };

const state = { tab: 'body', muscle: null, highlight: null, lib: { q: '', m: '', eq: '', mech: '', av: '' } };
let body = null;

// ============================================================ NAVIGATION
function setTab(tab) {
  state.tab = tab;
  $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.tab').forEach(s => s.classList.toggle('active', s.id === 'tab-' + tab));
  render();
  if (tab === 'body') body?.resize();
  window.scrollTo(0, 0);
}
$$('#tabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
function render() {
  if (state.tab === 'body') renderPanel();
  if (state.tab === 'library') renderLibrary();
  if (state.tab === 'session') renderGenerator();
  if (state.tab === 'gym') renderGym();
}

// ============================================================ CORPS 3D
async function initBody() {
  const prog = $('#loading');
  try {
    const { Body3D } = await import('./body.js');
    const tip = $('#tooltip');
    body = new Body3D($('#viewer'), {
      clickable: Object.keys(MUSCLES),
      onSelect: id => { if (id || !state.highlight) selectMuscle(id); },
      onHover: (id, e) => {
        if (!id || !e) { tip.hidden = true; return; }
        const r = $('#viewer').getBoundingClientRect();
        tip.hidden = false; tip.style.left = e.clientX - r.left + 'px'; tip.style.top = e.clientY - r.top + 'px';
        const pct = state.highlight ? EXERCISES[state.highlight].act[id] : null;
        tip.innerHTML = esc(MUSCLES[id].name) + (pct ? ` · <b>${pct} %</b>` : '');
      },
      onProgress: p => { $('#loadBar').style.width = Math.round(p * 100) + '%'; },
    });
    await body.ready;
    prog.hidden = true;
    applyHighlight();
  } catch (err) {
    console.error(err);
    prog.hidden = true;
    $('#glError').hidden = false;
  }
}
$$('.views button[data-view]').forEach(b => b.addEventListener('click', () => body?.view(b.dataset.view)));
$$('.views button[data-focus]').forEach(b => b.addEventListener('click', () => body?.focus(b.dataset.focus)));
$('#autoRot').addEventListener('click', e => { const on = !e.currentTarget.classList.contains('on'); e.currentTarget.classList.toggle('on', on); body?.setAutoRotate(on); });

function actColor(p) { return p >= 40 ? '#ff3b30' : p >= 25 ? '#ff7a45' : p >= 12 ? '#ffb347' : p > 0 ? '#ffe08a' : null; }
function applyHighlight() {
  const lg = $('#legend');
  $('.hint').hidden = !!state.highlight;
  if (!state.highlight) { body?.setColorFn(null); lg.hidden = true; return; }
  const ex = EXERCISES[state.highlight];
  body?.setColorFn(id => actColor(ex.act[id] || 0));
  lg.hidden = false;
  lg.innerHTML = `<div class="spread"><b>${esc(ex.name)}</b><button class="btn sm icon" id="clearHl" title="Retirer">✕</button></div>
    ${[['#ff3b30', '≥ 40 %'], ['#ff7a45', '25–39 %'], ['#ffb347', '12–24 %'], ['#ffe08a', '< 12 %']].map(([c, l]) => `<div><i style="background:${c}"></i>${l}</div>`).join('')}
    <div class="muted small">Part estimée du travail</div>`;
  $('#clearHl').onclick = () => { state.highlight = null; applyHighlight(); renderPanel(); };
}
function showOnBody(exId) {
  state.highlight = exId; state.muscle = null; body?.select(null);
  closeModal(); setTab('body'); applyHighlight();
  if (window.matchMedia('(max-width: 900px)').matches) $('#viewer').scrollIntoView({ behavior: 'smooth' });
}

function selectMuscle(id) {
  state.muscle = id; body?.select(id);
  renderPanel();
  if (id && window.matchMedia('(max-width: 900px)').matches) $('#musclePanel').scrollIntoView({ behavior: 'smooth' });
}

// ============================================================ PANNEAU MUSCLE
function renderPanel() {
  const el = $('#musclePanel');
  const id = state.muscle;
  if (state.highlight && !id) {
    const ex = EXERCISES[state.highlight];
    el.innerHTML = `<div class="crumbs"><button class="btn sm" id="hlBack">← Tous les muscles</button></div>
      <h2>${esc(ex.name)}</h2><p class="muted">Muscles colorés selon leur part estimée du travail.</p>
      ${actBars(ex)}
      <div class="row" style="margin-top:14px"><button class="btn primary" id="hlOpen">Ouvrir la fiche complète</button></div>`;
    $('#hlBack').onclick = () => { state.highlight = null; applyHighlight(); renderPanel(); };
    $('#hlOpen').onclick = () => openExercise(ex.id);
    bindMuscleLinks(el);
    return;
  }
  if (!id) {
    const groups = {};
    for (const [mid, m] of Object.entries(MUSCLES)) (groups[m.group] ||= []).push([mid, m]);
    el.innerHTML = `
      <h2>Choisis un muscle</h2>
      <p class="muted">Clique un muscle sur le corps 3D (ou dans la liste) pour voir son rôle et tous les exercices qui le ciblent, classés par niveau de sollicitation.</p>
      <input id="exSearch" placeholder="Rechercher un exercice ou une machine…" style="width:100%;margin-top:6px">
      <div class="ex-list" id="exResults" style="margin-top:8px"></div>
      <div class="muscle-groups">
        ${Object.entries(groups).map(([g, list]) => `<div><h4>${esc(g)}</h4><div class="chips">${list.map(([mid, m]) => `<button class="chip" data-m="${mid}">${esc(m.name)}</button>`).join('')}</div></div>`).join('')}
      </div>`;
    $$('[data-m]', el).forEach(b => b.addEventListener('click', () => selectMuscle(b.dataset.m)));
    $('#exSearch', el).addEventListener('input', e => {
      const q = norm(e.target.value.trim()); const box = $('#exResults', el);
      box.innerHTML = q.length < 2 ? '' : Object.values(EXERCISES).filter(x => norm(x.name + ' ' + x.equip + ' ' + x.setup).includes(q)).slice(0, 12).map(x => exCard(x)).join('') || '<p class="muted">Aucun résultat.</p>';
      bindExCards(box);
    });
    return;
  }

  const m = MUSCLES[id];
  const list = exercisesForMuscle(id);
  const sections = { ok: [], maybe: [], no: [] };
  for (const e of list) sections[availability(e)].push(e);
  el.innerHTML = `
    <div class="crumbs"><button class="btn sm" id="backAll">← Tous les muscles</button><span class="tag">${esc(m.group)}</span></div>
    <h2>${esc(m.name)}</h2>
    <div class="latin">${esc(m.latin)}</div>
    <div class="card" style="margin-top:14px">
      <h3>Fonction</h3><p class="txt">${esc(m.fn)}</p>
      <h3 style="margin-top:12px">Comment le cibler</h3><p class="txt">${esc(m.tips)}</p>
      <h3 style="margin-top:12px">Volume conseillé (hypertrophie)</h3>
      <p class="txt">${m.mev ? `À partir de <b>${m.mev}</b> séries/semaine` : 'Pas de minimum si les exercices de base le sollicitent déjà'} · au-delà de <b>${m.mrv}</b> séries/semaine, la récupération devient difficile pour la plupart des pratiquants.</p>
    </div>
    <div class="section-title">Exercices · ${list.length} <span class="muted">(classés par sollicitation estimée)</span></div>
    ${sections.ok.length ? `<h4 class="sub">✅ ${AV_LABEL.ok}</h4><div class="ex-list">${sections.ok.map(e => exCard(e, id)).join('')}</div>` : ''}
    ${sections.maybe.length ? `<h4 class="sub">❔ Si disponible dans ton club</h4><div class="ex-list">${sections.maybe.map(e => exCard(e, id)).join('')}</div>` : ''}
    ${sections.no.length ? `<h4 class="sub">⛔ Matériel absent de ta salle</h4><div class="ex-list dim">${sections.no.map(e => exCard(e, id)).join('')}</div>` : ''}`;
  $('#backAll').addEventListener('click', () => selectMuscle(null));
  bindExCards(el);
}

function exCard(e, muscleId) {
  const pct = muscleId ? e.act[muscleId] : null;
  return `<div class="ex" data-ex="${e.id}">
    <div style="min-width:0"><div class="n">${esc(e.name)}</div>
      <div class="m"><span class="tag ${['Machine', 'Smith', 'Poulie'].includes(e.equip) ? 'machine' : ''}">${esc(e.equip)}</span><span class="tag ${e.mech}">${e.mech === 'poly' ? 'Poly' : 'Isolation'}</span><span class="tag">${DIFFICULTY[e.diff]}</span>${e.stretch ? '<span class="tag st">Étirement</span>' : ''}${hasAnim(e.id) ? '<span class="tag anim-t">▶ Animé</span>' : ''}</div></div>
    ${pct != null ? `<div class="pct"><b>${pct} %</b><div class="pbar"><i style="width:${pct}%"></i></div></div>` : ''}
  </div>`;
}
function bindExCards(el) { $$('[data-ex]', el).forEach(c => c.addEventListener('click', () => openExercise(c.dataset.ex))); }
function bindMuscleLinks(el) { $$('[data-goto]', el).forEach(b => b.addEventListener('click', () => { closeModal(); state.highlight = null; applyHighlight(); setTab('body'); selectMuscle(b.dataset.goto); })); }

function actBars(ex) {
  return `<div class="acts">${Object.entries(ex.act).sort((a, b) => b[1] - a[1]).map(([m, p]) => `
    <button class="act" data-goto="${m}"><span class="${ex.primary.includes(m) ? 'p' : ''}">${esc(MUSCLES[m].name)}</span>
    <span class="b"><i style="width:${p}%;background:${actColor(p)}"></i></span><span class="num">${p} %</span></button>`).join('')}</div>`;
}

// ============================================================ FICHE EXERCICE
function openModal(html, onMount) { $('#modalBody').innerHTML = html; $('#modal').hidden = false; $('.modal-card').scrollTop = 0; onMount?.($('#modalBody')); }
function closeModal() { $('#modal').hidden = true; $('#modalBody').innerHTML = ''; }
$('#modalClose').addEventListener('click', closeModal);
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function openExercise(id) {
  const e = EXERCISES[id];
  const av = availability(e);
  const P = (o, k) => OBJECTIVES[o][e.mech][k];
  openModal(`
    <div style="padding-right:40px"><h2>${esc(e.name)}</h2>
      <div class="m" style="margin-top:8px"><span class="tag">${esc(e.equip)}</span><span class="tag ${e.mech}">${e.mech === 'poly' ? 'Polyarticulaire' : 'Isolation'}</span><span class="tag">${DIFFICULTY[e.diff]}</span><span class="tag av-${av}">${AV_LABEL[av]}</span></div></div>
    <div class="row" style="margin-top:12px"><button class="btn primary" id="mBody">◎ Voir sur le corps</button></div>
    ${hasAnim(id) ? `<div class="card anim-card"><div class="anim" id="animBox"></div>
      <div class="anim-ctl"><span class="muted small">Vue de ${animInfo(id).view.toLowerCase()} · en couleur : ${esc(animInfo(id).muscles)}</span>
      <span class="row"><button class="btn sm" id="aPlay">⏸ Pause</button><button class="btn sm" id="aSlow">Ralenti</button></span></div></div>` : ''}

    <div class="grid2" style="margin-top:16px">
      <div class="card"><h3>Activation musculaire <span class="muted small">estimée</span></h3>
        ${actBars(e)}
        <p class="muted small" style="margin:10px 0 0">Zone ciblée : ${esc(e.focus)}</p></div>
      <div class="card"><h3>Fiche technique</h3>
        <table class="kv">
          <tr><td>Type</td><td>${e.mech === 'poly' ? 'Polyarticulaire (plusieurs articulations)' : 'Isolation (une articulation)'}</td></tr>
          <tr><td>Difficulté</td><td>${DIFFICULTY[e.diff]}</td></tr>
          <tr><td>Amplitude</td><td>${esc(e.rom)}</td></tr>
          <tr><td>Profil de résistance</td><td>${esc(e.profile)}</td></tr>
          <tr><td>Charge en étirement</td><td>${e.stretch ? 'Oui — favorable à l’hypertrophie' : 'Non / faible'}</td></tr>
          <tr><td>Matériel</td><td>${e.needs.map(n => `${esc(EQUIPMENT[n].name)}${EQUIPMENT[n].std ? '' : ' <span class="muted">(selon le club)</span>'}`).join('<br>')}</td></tr>
          <tr><td>Réglages</td><td>${esc(e.setup)}</td></tr>
        </table></div>
    </div>

    <div class="card" style="margin-top:14px"><h3>Paramètres conseillés</h3>
      <div class="tbl-scroll"><table>
        <tr><th>Objectif</th><th>Séries</th><th>Reps</th><th>Repos</th><th>RPE</th><th>Tempo</th></tr>
        ${Object.keys(OBJECTIVES).map(o => `<tr><td>${OBJECTIVES[o].name}</td><td>${P(o, 'sets')}</td><td>${P(o, 'reps')}</td><td>${P(o, 'rest')}</td><td>${P(o, 'rpe')}</td><td>${P(o, 'tempo')}</td></tr>`).join('')}
      </table></div>
      <p class="muted small" style="margin:8px 0 0">${esc(RPE_HELP)}</p></div>

    <div class="grid2" style="margin-top:14px">
      <div class="card"><h3>Exécution</h3><ol class="steps">${e.steps.filter(Boolean).map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
      <div class="card"><h3>Erreurs fréquentes</h3>${e.errors.length ? `<ul class="errs">${e.errors.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : '<p class="muted">—</p>'}
        <h3 style="margin-top:12px">Sécurité</h3><p class="txt">${esc(e.risk)}</p></div>
    </div>

    ${e.alts.length ? `<div class="section-title">Alternatives</div><div class="ex-list">${e.alts.map(a => exCard(EXERCISES[a])).join('')}</div>` : ''}
  `, root => {
    $('#mBody', root).onclick = () => showOnBody(id);
    if (hasAnim(id)) {
      const a = mountAnim($('#animBox', root), id);
      $('#aPlay', root).onclick = ev => { a.playing = !a.playing; ev.currentTarget.textContent = a.playing ? '⏸ Pause' : '▶ Lecture'; };
      $('#aSlow', root).onclick = ev => { a.speed = a.speed === 1 ? 0.5 : 1; ev.currentTarget.classList.toggle('on', a.speed !== 1); };
    }
    bindMuscleLinks(root);
    bindExCards(root);
  });
}

// ============================================================ BIBLIOTHÈQUE
function renderLibrary() {
  const el = $('#libraryView'); const f = state.lib;
  const list = Object.values(EXERCISES).filter(e =>
    (!f.q || norm(e.name + ' ' + e.equip + ' ' + e.setup + ' ' + e.focus).includes(norm(f.q))) &&
    (!f.m || e.act[f.m]) && (!f.eq || e.equip === f.eq) && (!f.mech || e.mech === f.mech) && (!f.av || availability(e) === f.av))
    .sort((a, b) => (f.m ? b.act[f.m] - a.act[f.m] : a.name.localeCompare(b.name)));
  const equips = [...new Set(Object.values(EXERCISES).map(e => e.equip))];
  if (!el.dataset.init) {
    el.dataset.init = 1;
    el.innerHTML = `<div class="spread"><h2>Exercices</h2><span class="muted small" id="libCount"></span></div>
      <div class="filters">
        <input id="lQ" placeholder="Rechercher…">
        <select id="lM"><option value="">Tous les muscles</option>${Object.entries(MUSCLES).map(([k, m]) => `<option value="${k}">${esc(m.name)}</option>`).join('')}</select>
        <select id="lE"><option value="">Tout matériel</option>${equips.map(e => `<option>${esc(e)}</option>`).join('')}</select>
        <select id="lT"><option value="">Poly + isolation</option><option value="poly">Polyarticulaires</option><option value="iso">Isolation</option></select>
        <select id="lA"><option value="">Toute disponibilité</option><option value="ok">Courant en salle</option><option value="maybe">Si disponible</option><option value="no">Absent de ma salle</option></select>
      </div><div class="ex-list" id="libList" style="margin-top:12px"></div>`;
    const bind = (sel, key) => $(sel, el).addEventListener('input', ev => { f[key] = ev.target.value; renderLibrary(); });
    bind('#lQ', 'q'); bind('#lM', 'm'); bind('#lE', 'eq'); bind('#lT', 'mech'); bind('#lA', 'av');
  }
  $('#libCount', el).textContent = `${list.length} / ${Object.keys(EXERCISES).length}`;
  $('#libList', el).innerHTML = list.map(e => exCard(e, f.m || null)).join('') || '<p class="muted">Aucun exercice.</p>';
  bindExCards($('#libList', el));
}

// ============================================================ GÉNÉRATEUR DE SÉANCE
const gen = { template: 'push', duration: 60, objective: 'masse', level: 2, maybe: false, muscles: [], result: null };
function renderGenerator() {
  const el = $('#sessionView');
  const seg = (name, opts, cur) => `<div class="seg2" data-k="${name}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  el.innerHTML = `
    <h2>Générer une séance</h2>
    <p class="muted">Séance complète construite uniquement avec le matériel de ta salle (onglet « Ma salle »).</p>
    <div class="card gen-form">
      <label>Type de séance</label>${seg('template', Object.entries(TEMPLATES).map(([k, t]) => [k, t.name]), gen.template)}
      ${gen.template === 'custom' ? `<label>Muscles à travailler</label><div class="chips">${Object.entries(MUSCLES).map(([k, m]) => `<button class="chip ${gen.muscles.includes(k) ? 'on' : ''}" data-cm="${k}">${esc(m.name)}</button>`).join('')}</div>` : ''}
      <label>Durée</label>${seg('duration', [[30, '30 min'], [45, '45 min'], [60, '1 h'], [75, '1 h 15'], [90, '1 h 30']], gen.duration)}
      <label>Objectif</label>${seg('objective', Object.entries(OBJECTIVES).map(([k, o]) => [k, o.name]), gen.objective)}
      <label>Niveau</label>${seg('level', [[1, 'Débutant'], [2, 'Intermédiaire'], [3, 'Avancé']], gen.level)}
      <label class="check"><input type="checkbox" id="gMaybe" ${gen.maybe ? 'checked' : ''}> Inclure le matériel « si disponible »</label>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="gGo">Générer la séance</button></div>
    </div>
    <div id="gOut"></div>`;
  $$('.seg2', el).forEach(s => $$('button', s).forEach(b => b.addEventListener('click', () => {
    const k = s.dataset.k; gen[k] = ['duration', 'level'].includes(k) ? Number(b.dataset.v) : b.dataset.v; gen.result = null; renderGenerator();
  })));
  $$('[data-cm]', el).forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.cm; gen.muscles = gen.muscles.includes(k) ? gen.muscles.filter(x => x !== k) : [...gen.muscles, k]; renderGenerator();
  }));
  $('#gMaybe').addEventListener('change', e => { gen.maybe = e.target.checked; });
  $('#gGo').addEventListener('click', () => {
    if (gen.template === 'custom' && !gen.muscles.length) { toast('Choisis au moins un muscle'); return; }
    gen.result = generateSession(gen); renderResult();
    $('#gOut').scrollIntoView({ behavior: 'smooth' });
  });
  if (gen.result) renderResult();
}
function renderResult() {
  const r = gen.result; const out = $('#gOut');
  if (!r.items.length) { out.innerHTML = '<div class="notice" style="margin-top:14px">Aucun exercice disponible avec ces critères. Coche plus de matériel dans « Ma salle » ou inclus le matériel « si disponible ».</div>'; return; }
  const o = OBJECTIVES[gen.objective];
  out.innerHTML = `
    <div class="card" style="margin-top:16px">
      <div class="spread"><h3 style="margin:0">${esc(TEMPLATES[gen.template].name)} · ${esc(o.name)}</h3><span class="muted small">≈ ${r.minutes} min · ${r.items.length} exercices · ${r.totalSets} séries</span></div>
      <p class="muted small">${esc(o.note)}</p>
      <div class="warmup"><b>Échauffement (≈ 8 min)</b> : 5 min de cardio léger, mobilité des articulations sollicitées, puis 2–3 séries progressives (≈ 40 %, 60 %, 80 % de la charge de travail) sur le premier exercice.</div>
      <div class="sess">
        ${r.items.map((it, i) => `<div class="srow">
          <div class="sn">${i + 1}</div>
          <div class="sx"><a href="#" data-open="${it.ex.id}">${esc(it.ex.name)}</a>
            <div class="muted small">${it.ex.primary.map(m => MUSCLES[m].name).join(', ')} · ${esc(it.ex.equip)}${availability(it.ex) === 'maybe' ? ' · <span class="av-maybe-t">si disponible</span>' : ''}${it.p.assist ? ' · assistance' : ''}</div>
            <div class="sp"><span><b>${it.p.sets} × ${it.p.reps}</b></span><span>repos ${it.p.rest}</span><span>RPE ${it.p.rpe}</span><span>tempo ${it.p.tempo}</span></div></div>
          <button class="btn sm" data-swap="${i}" title="Remplacer par un autre exercice">⇄</button></div>`).join('')}
      </div>
      <div class="vol"><b>Séries par muscle</b> (principal = 1, secondaire = ½) : ${Object.entries(r.volume).sort((a, b) => b[1] - a[1]).map(([m, v]) => `${esc(MUSCLES[m].name)} ${String(v).replace('.', ',')}`).join(' · ')}</div>
      <div class="row" style="margin-top:12px"><button class="btn" id="gAgain">↻ Autre proposition</button><button class="btn" id="gCopy">Copier la séance</button></div>
    </div>`;
  $$('[data-open]', out).forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); openExercise(a.dataset.open); }));
  $$('[data-swap]', out).forEach(b => b.addEventListener('click', () => { gen.result = generateSession(gen, { swap: +b.dataset.swap, prev: r }); renderResult(); }));
  $('#gAgain').addEventListener('click', () => { gen.result = generateSession(gen); renderResult(); });
  $('#gCopy').addEventListener('click', async () => {
    const txt = `${TEMPLATES[gen.template].name} · ${o.name} (≈ ${r.minutes} min)\n` + r.items.map((it, i) => `${i + 1}. ${it.ex.name} — ${it.p.sets} × ${it.p.reps}, repos ${it.p.rest}, RPE ${it.p.rpe}`).join('\n');
    try { await navigator.clipboard.writeText(txt); toast('Séance copiée'); } catch { toast('Copie impossible sur ce navigateur'); }
  });
}

// ============================================================ MA SALLE
function renderGym() {
  const el = $('#gymView');
  const row = ([k, eq]) => `<label class="eqrow"><input type="checkbox" data-eq="${k}" ${gym.has(k) ? 'checked' : ''}><span>${esc(eq.name)}</span>${gym.has(k) !== !!eq.std ? '<span class="tag">modifié</span>' : ''}</label>`;
  const std = Object.entries(EQUIPMENT).filter(([, e]) => e.std), maybe = Object.entries(EQUIPMENT).filter(([, e]) => !e.std);
  el.innerHTML = `
    <h2>Ma salle</h2>
    <p class="muted">Profil par défaut : <b>Basic-Fit (général)</b>. L’équipement varie d’un club à l’autre : coche ce que tu trouves dans les clubs que tu fréquentes. Les exercices et le générateur s’adaptent.</p>
    <div class="grid2">
      <div class="card"><h3>Courant dans les clubs Basic-Fit</h3>${std.map(row).join('')}</div>
      <div class="card"><h3>Si disponible <span class="muted small">selon le club</span></h3>${maybe.map(row).join('')}</div>
    </div>
    <div class="row" style="margin-top:14px"><button class="btn" id="gReset" ${gym.customized() ? '' : 'disabled'}>Revenir au profil par défaut</button></div>
    <div class="card" style="margin-top:20px"><h3>Sources & méthodologie</h3>
      <p class="txt small">
        <b>Modèle 3D</b> : Z-Anatomy, l’atlas 3D libre d’anatomie, dérivé de BodyParts3D (© The Database Center for Life Science). Licence CC BY-SA 4.0. Modèle simplifié et regroupé par muscle pour cette app, redistribué sous la même licence.<br>
        <b>Activation musculaire</b> : répartitions estimées à partir de la biomécanique (bras de levier, amplitude) et des tendances des études EMG publiées. Ce sont des ordres de grandeur, pas des mesures individuelles.<br>
        <b>Paramètres et volumes</b> : recommandations générales issues de la littérature en entraînement de force ; à adapter à ton niveau, ta récupération et tes éventuelles douleurs.<br>
        <b>Disponibilité Basic-Fit</b> : estimation générale ; vérifie sur place.
      </p></div>`;
  $$('[data-eq]', el).forEach(c => c.addEventListener('change', () => { gym.set(c.dataset.eq, c.checked); renderGym(); }));
  $('#gReset').addEventListener('click', () => { gym.reset(); renderGym(); toast('Profil Basic-Fit par défaut rétabli'); });
}

// ============================================================ UTILITAIRES
let toastT = null;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2400); }

render();
initBody();
