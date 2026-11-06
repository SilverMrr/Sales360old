import { FILMS, FILM_BY_ID, PLATFORMS, GENRES } from "./films.js";

// ——— Utilitaires ———
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const randomId = () => [...crypto.getRandomValues(new Uint8Array(12))].map((b) => (b % 36).toString(36)).join("");
const fmtDuration = (m) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
const hue = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const posterUrl = (f) => `/api/poster?t=${encodeURIComponent(f.wiki)}`;
const justWatch = (f) => `https://www.justwatch.com/fr/recherche?q=${encodeURIComponent(f.title)}`;

function fallbackStyle(f) {
  const h = hue(f.id);
  return `background:linear-gradient(160deg,hsl(${h} 60% 30%),hsl(${(h + 60) % 360} 70% 12%))`;
}
function posterHTML(f, cls = "") {
  return `<div class="fallback ${cls}" style="${fallbackStyle(f)}">${esc(f.title)}</div>
          <img src="${posterUrl(f)}" alt="" loading="lazy" decoding="async" onerror="this.remove()" />`;
}
function platsHTML(f) {
  return `<div class="plats">${f.platforms.map((p) => `<span class="plat" style="background:${PLATFORMS[p].color}">${PLATFORMS[p].label}</span>`).join("")}</div>`;
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2200);
}

async function api(path, opts = {}) {
  const r = await fetch(`/api/${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || `Erreur ${r.status}`), { status: r.status });
  return data;
}

// ——— État ———
const me = {
  id: store.get("fm:pid") || (() => { const id = randomId(); store.set("fm:pid", id); return id; })(),
  get name() { return store.get("fm:name", "") || "Anonyme"; },
};
let S = null; // { code, deck, hostId, ended, players, votes, index }
let pollTimer = null;
let saveTimer = null;
let currentScreen = "home";

function local(code) { return store.get(`fm:s:${code}`, { votes: {}, index: 0, seenMatches: [] }); }
function saveLocal() { if (S) store.set(`fm:s:${S.code}`, { votes: S.votes, index: S.index, seenMatches: S.seenMatches }); }

function show(name) {
  currentScreen = name;
  $$(".screen").forEach((s) => s.classList.toggle("active", s.id === `screen-${name}`));
  clearInterval(pollTimer);
  if (name === "swipe") pollTimer = setInterval(refresh, 4000);
  if (name === "results") pollTimer = setInterval(refresh, 2500);
  if (S && (name === "swipe" || name === "results")) {
    history.replaceState(null, "", `/?s=${S.code}`);
  }
}

// ——— Accueil ———
function initHome() {
  $("#name-input").value = store.get("fm:name", "");
  $("#name-input").addEventListener("input", (e) => store.set("fm:name", e.target.value.trim()));
  const params = new URLSearchParams(location.search);
  const code = (params.get("s") || "").toUpperCase();
  if (code) $("#code-input").value = code;

  if (!code) initResume();

  $("#btn-go-create").addEventListener("click", () => {
    if (!requireName()) return;
    show("create");
  });
  $("#btn-join").addEventListener("click", () => {
    if (!requireName()) return;
    const c = $("#code-input").value.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(c)) return homeError("Le code fait 4 lettres.");
    join(c);
  });
  $("#code-input").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#btn-join").click(); });
  $$("[data-back]").forEach((b) => b.addEventListener("click", () => show(b.dataset.back)));
}
function requireName() {
  const n = $("#name-input").value.trim();
  if (!n) { homeError("Mets ton prénom pour que les autres sachent qui a liké quoi."); $("#name-input").focus(); return false; }
  store.set("fm:name", n); $("#home-error").hidden = true; return true;
}
function homeError(msg) { const e = $("#home-error"); e.textContent = msg; e.hidden = false; }

// ——— Création ———
const filters = store.get("fm:filters", {
  platforms: Object.keys(PLATFORMS), genres: [], maxDuration: 0, size: 40,
});
const DURATIONS = [[0, "Peu importe"], [100, "≤ 1h40"], [120, "≤ 2h"], [150, "≤ 2h30"]];
const SIZES = [[20, "20"], [40, "40"], [60, "60"], [0, "Tous"]];

function filteredFilms() {
  return FILMS.filter((f) =>
    f.platforms.some((p) => filters.platforms.includes(p)) &&
    (filters.genres.length === 0 || f.genres.some((g) => filters.genres.includes(g))) &&
    (!filters.maxDuration || f.duration <= filters.maxDuration));
}
function renderCreate() {
  $("#platform-chips").innerHTML = Object.entries(PLATFORMS).map(([k, p]) =>
    `<button class="chip ${filters.platforms.includes(k) ? "on" : ""}" data-plat="${k}"><span class="dot" style="background:${p.color}"></span>${p.label}</button>`).join("");
  $("#genre-chips").innerHTML = GENRES.map((g) =>
    `<button class="chip ${filters.genres.includes(g) ? "on" : ""}" data-genre="${g}">${g}</button>`).join("");
  $("#duration-chips").innerHTML = DURATIONS.map(([v, l]) =>
    `<button class="chip ${filters.maxDuration === v ? "on" : ""}" data-dur="${v}">${l}</button>`).join("");
  $("#size-chips").innerHTML = SIZES.map(([v, l]) =>
    `<button class="chip ${filters.size === v ? "on" : ""}" data-size="${v}">${l}</button>`).join("");
  const n = filteredFilms().length;
  const used = filters.size ? Math.min(filters.size, n) : n;
  $("#create-count").innerHTML = `<strong>${n}</strong> films correspondent · <strong>${used}</strong> à swiper`;
  $("#btn-create").disabled = n < 2;
  store.set("fm:filters", filters);
}
function initCreate() {
  $("#screen-create").addEventListener("click", (e) => {
    const c = e.target.closest(".chip"); if (!c) return;
    const toggle = (arr, v) => { const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v); };
    if (c.dataset.plat) toggle(filters.platforms, c.dataset.plat);
    if (c.dataset.genre) toggle(filters.genres, c.dataset.genre);
    if (c.dataset.dur) filters.maxDuration = Number(c.dataset.dur);
    if (c.dataset.size) filters.size = Number(c.dataset.size);
    renderCreate();
  });
  $("#btn-create").addEventListener("click", createSession);
  renderCreate();
}
async function createSession() {
  const btn = $("#btn-create"); btn.disabled = true; $("#create-error").hidden = true;
  try {
    const pool = filteredFilms().map((f) => f.id);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const deck = filters.size ? pool.slice(0, filters.size) : pool;
    const { code } = await api("session", { method: "POST", body: { deck, filters, name: me.name, playerId: me.id } });
    await join(code, { justCreated: true });
  } catch (e) {
    const el = $("#create-error"); el.textContent = e.message; el.hidden = false;
  } finally { btn.disabled = false; }
}

// ——— Rejoindre / sync ———
async function join(code, { justCreated = false } = {}) {
  try {
    const data = await api(`session/${code}`);
    const l = local(code);
    S = { ...data, votes: l.votes || {}, index: Math.min(l.index || 0, data.deck.length), seenMatches: l.seenMatches || [] };
    // Si on a des votes côté serveur (autre onglet/appareil perdu), on les récupère
    const remote = data.players.find((p) => p.id === me.id);
    if (remote && Object.keys(remote.votes).length > Object.keys(S.votes).length) {
      S.votes = remote.votes;
      S.index = S.deck.findIndex((id) => !(id in S.votes)); if (S.index < 0) S.index = S.deck.length;
    }
    store.set("fm:last", code);
    saveLocal();
    await pushVotes();
    $("#swipe-code").textContent = code;
    renderPlayersBadge();
    if (S.ended) { show("results"); renderResults(); return; }
    show("swipe"); renderDeck();
    if (justCreated) openShare();
  } catch (e) {
    store.del("fm:last");
    show("home");
    homeError(e.status === 404 ? "Session introuvable ou expirée." : e.message);
  }
}

async function pushVotes() {
  if (!S) return;
  const done = S.index >= S.deck.length;
  try {
    await api(`session/${S.code}/player/${me.id}`, { method: "PUT", body: { name: me.name, votes: S.votes, done } });
  } catch (e) { toast("Connexion instable, nouvel essai…"); scheduleSave(3000); }
}
function scheduleSave(delay = 500) { clearTimeout(saveTimer); saveTimer = setTimeout(pushVotes, delay); }

async function refresh() {
  if (!S) return;
  try {
    const data = await api(`session/${S.code}`);
    S.players = data.players; S.ended = data.ended; S.hostId = data.hostId;
    renderPlayersBadge();
    checkMatches();
    if (currentScreen === "results") renderResults();
    if (S.ended && currentScreen === "swipe") { show("results"); renderResults(); toast("L'hôte a terminé la session."); }
  } catch {}
}

// Votes du joueur courant fusionnés avec ce que le serveur connaît (pour un affichage instantané)
function allPlayers() {
  const others = (S.players || []).filter((p) => p.id !== me.id);
  const done = S.index >= S.deck.length;
  return [{ id: me.id, name: me.name, votes: S.votes, done }, ...others];
}

function ranking() {
  const players = allPlayers();
  const rows = S.deck.map((id) => {
    let score = 0, likers = [], nopes = 0;
    for (const p of players) {
      const v = p.votes[id];
      if (v > 0) { score += v; likers.push({ name: p.name, s: v === 2 }); }
      else if (v === -1) nopes++;
    }
    return { film: FILM_BY_ID[id], score, likers, nopes };
  }).filter((r) => r.film && r.score > 0);
  rows.sort((a, b) => b.score - a.score || b.likers.length - a.likers.length || a.nopes - b.nopes || a.film.duration - b.film.duration);
  return rows;
}

function checkMatches() {
  const players = allPlayers();
  if (players.length < 2) return;
  for (const id of S.deck) {
    if (S.seenMatches.includes(id)) continue;
    if (players.every((p) => p.votes[id] > 0)) {
      S.seenMatches.push(id); saveLocal();
      const f = FILM_BY_ID[id];
      $("#match-film").innerHTML = `<div class="match-poster">${posterHTML(f)}</div><h3>${esc(f.title)}</h3>${platsHTML(f).replace('class="plats"', 'class="plats" style="justify-content:center;margin-top:8px"')}`;
      if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
      $("#match-modal").hidden = false;
      return;
    }
  }
}

function renderPlayersBadge() {
  $("#players-badge").textContent = Math.max(1, (S.players || []).length);
}

// ——— Deck ———
function cardHTML(f) {
  return `
    ${posterHTML(f)}
    <div class="shade"></div>
    <div class="stamp like">LIKE</div><div class="stamp nope">NOPE</div><div class="stamp super">SUPER</div>
    <div class="info">
      <h2>${esc(f.title)}</h2>
      <div class="meta">${f.year} · ${fmtDuration(f.duration)}</div>
      ${platsHTML(f)}
      <p class="pitch">${esc(f.pitch)}</p>
      <div class="tags">${f.genres.map((g) => `<span class="tag">${g}</span>`).join("")}</div>
    </div>`;
}

function renderDeck() {
  const deckEl = $("#deck");
  deckEl.innerHTML = "";
  const done = S.index >= S.deck.length;
  $("#deck-done").hidden = !done;
  deckEl.hidden = done;
  $(".actions").style.visibility = done ? "hidden" : "visible";
  $("#act-undo").disabled = S.index === 0;
  $("#progress-bar").style.width = `${(S.index / S.deck.length) * 100}%`;
  if (done) { $(".actions").style.visibility = "visible"; $$(".act:not(.act-undo)").forEach((b) => (b.style.display = "none")); }
  else $$(".act").forEach((b) => (b.style.display = ""));

  // On empile les 3 prochaines cartes, la courante au-dessus
  for (let k = Math.min(S.index + 2, S.deck.length - 1); k >= S.index; k--) {
    const f = FILM_BY_ID[S.deck[k]];
    if (!f) continue;
    const el = document.createElement("div");
    el.className = "card";
    const depth = k - S.index;
    if (depth > 0) el.classList.add(`behind-${depth}`);
    el.innerHTML = cardHTML(f);
    deckEl.appendChild(el);
    if (depth === 0) attachDrag(el);
  }
  // Précharge les 2 affiches suivantes
  for (let k = S.index + 3; k < Math.min(S.index + 5, S.deck.length); k++) {
    const f = FILM_BY_ID[S.deck[k]]; if (f) new Image().src = posterUrl(f);
  }
}

function attachDrag(card) {
  let x0 = 0, y0 = 0, dx = 0, dy = 0, t0 = 0, dragging = false;
  const like = card.querySelector(".stamp.like"), nope = card.querySelector(".stamp.nope"), sup = card.querySelector(".stamp.super");
  card.addEventListener("pointerdown", (e) => {
    dragging = true; x0 = e.clientX; y0 = e.clientY; t0 = Date.now(); dx = dy = 0;
    card.setPointerCapture(e.pointerId); card.classList.remove("anim");
  });
  card.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    dx = e.clientX - x0; dy = e.clientY - y0;
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`;
    const up = -dy > Math.abs(dx) && -dy > 30;
    like.style.opacity = !up ? Math.max(0, Math.min(1, dx / 100)) : 0;
    nope.style.opacity = !up ? Math.max(0, Math.min(1, -dx / 100)) : 0;
    sup.style.opacity = up ? Math.min(1, -dy / 120) : 0;
  });
  const end = () => {
    if (!dragging) return; dragging = false;
    const dt = Math.max(1, Date.now() - t0);
    const vx = dx / dt, vy = dy / dt;
    if (-dy > 120 && -dy > Math.abs(dx) || (vy < -0.7 && -dy > 50)) return vote(2);
    if (dx > 110 || (vx > 0.6 && dx > 40)) return vote(1);
    if (dx < -110 || (vx < -0.6 && dx < -40)) return vote(-1);
    card.classList.add("anim"); card.style.transform = "";
    like.style.opacity = nope.style.opacity = sup.style.opacity = 0;
  };
  card.addEventListener("pointerup", end);
  card.addEventListener("pointercancel", end);
}

let animating = false;
function vote(v) {
  if (!S || animating || S.index >= S.deck.length) return;
  const card = $("#deck .card:last-child");
  const id = S.deck[S.index];
  S.votes[id] = v; S.index++;
  saveLocal(); scheduleSave(); checkMatches();
  if (navigator.vibrate) navigator.vibrate(v === 2 ? 30 : 12);
  if (card) {
    animating = true;
    card.classList.add("anim");
    const stamp = card.querySelector(v === 1 ? ".stamp.like" : v === -1 ? ".stamp.nope" : ".stamp.super");
    if (stamp) stamp.style.opacity = 1;
    const w = window.innerWidth * 1.4;
    card.style.transform = v === 2 ? `translate(0, -${window.innerHeight}px)` : `translate(${v === 1 ? w : -w}px, 40px) rotate(${v === 1 ? 25 : -25}deg)`;
    setTimeout(() => { animating = false; renderDeck(); if (S.index >= S.deck.length) pushVotes(); }, 260);
  } else renderDeck();
}
function undo() {
  if (!S || S.index === 0 || animating) return;
  S.index--; delete S.votes[S.deck[S.index]];
  saveLocal(); scheduleSave(); renderDeck();
}

function initSwipe() {
  $("#act-like").addEventListener("click", () => vote(1));
  $("#act-nope").addEventListener("click", () => vote(-1));
  $("#act-super").addEventListener("click", () => vote(2));
  $("#act-undo").addEventListener("click", undo);
  $("#btn-to-results").addEventListener("click", () => { show("results"); renderResults(); refresh(); });
  $("#btn-done-results").addEventListener("click", () => { show("results"); renderResults(); refresh(); });
  $("#btn-leave").addEventListener("click", () => { history.replaceState(null, "", "/"); show("home"); initResume(); });
  $("#btn-share").addEventListener("click", openShare);
  document.addEventListener("keydown", (e) => {
    if (currentScreen !== "swipe") return;
    if (e.key === "ArrowRight") vote(1);
    if (e.key === "ArrowLeft") vote(-1);
    if (e.key === "ArrowUp") vote(2);
    if (e.key === "Backspace") undo();
  });
}
function initResume() {
  const last = store.get("fm:last");
  const box = $("#resume-box");
  if (!last) { box.hidden = true; return; }
  box.innerHTML = `Session en cours : <a href="#" id="resume-link">reprendre ${esc(last)}</a>`;
  box.hidden = false;
  $("#resume-link").onclick = (e) => { e.preventDefault(); join(last); };
}

// ——— Résultats ———
const COLORS = ["#ff3d6e", "#3db8ff", "#2fd47a", "#ff8a3d", "#a26bff", "#ffd23d", "#ff5ad1", "#3dffd8"];
function renderResults() {
  if (!S) return;
  const players = allPlayers();
  const rows = ranking();
  const allDone = players.length > 0 && players.every((p) => p.done);
  const final = S.ended || (allDone && players.length >= 2);

  const top = rows[0];
  if (!top) {
    $("#winner").innerHTML = `<div class="empty">Pas encore de like. Allez swiper !</div>`;
  } else {
    const f = top.film;
    const label = final ? "🍿 Le film de ce soir" : "En tête pour l'instant";
    $("#winner").innerHTML = `
      <div class="winner">
        ${posterHTML(f)}
        <div class="w-body">
          <span class="w-label">${label}</span>
          <h2>${esc(f.title)}</h2>
          <div class="meta">${f.year} · ${fmtDuration(f.duration)} · ${top.score} pt${top.score > 1 ? "s" : ""} · ${top.likers.length}/${players.length} like${top.likers.length > 1 ? "s" : ""}</div>
          ${platsHTML(f)}
          <a class="jw" href="${justWatch(f)}" target="_blank" rel="noopener">Où le regarder (JustWatch) →</a>
        </div>
      </div>`;
    // L'image du gagnant est en flux normal : on retire le fallback si elle charge
    const img = $("#winner img"), fb = $("#winner .fallback");
    if (img) { img.loading = "eager"; img.onload = () => fb && fb.remove(); }
  }

  $("#players-list").innerHTML = players.map((p, i) => {
    const n = Object.keys(p.votes).length;
    const likes = Object.values(p.votes).filter((v) => v > 0).length;
    return `<div class="player">
      <div class="avatar" style="background:${COLORS[i % COLORS.length]}">${esc(p.name.slice(0, 1).toUpperCase())}</div>
      <div><div class="pname">${esc(p.name)} ${p.id === me.id ? "<small>(toi)</small>" : ""}${p.id === S.hostId ? " <small>· hôte</small>" : ""}</div>
        <div class="pbar"><div style="width:${(n / S.deck.length) * 100}%"></div></div></div>
      <div class="pstat">${p.done ? "✓ fini" : `${n}/${S.deck.length}`} · ${likes}♥</div>
    </div>`;
  }).join("");

  $("#ranking").innerHTML = rows.slice(0, 15).map((r, i) => `
    <li class="rank-item">
      <div class="rank-pos">${i + 1}</div>
      <div class="rank-thumb">${posterHTML(r.film)}</div>
      <div>
        <div class="rank-title">${esc(r.film.title)}</div>
        <div class="rank-sub">${r.film.year} · ${fmtDuration(r.film.duration)} · ${r.film.platforms.map((p) => PLATFORMS[p].label).join(", ")}</div>
        <div class="rank-who">${r.likers.map((l) => `<span class="${l.s ? "s" : ""}">${l.s ? "★" : "♥"} ${esc(l.name)}</span>`).join("")}</div>
      </div>
      <div class="rank-score">${r.score}<small>pts</small></div>
    </li>`).join("") || `<li class="empty">Rien pour l'instant.</li>`;

  $("#btn-end").hidden = !(S.hostId === me.id && !S.ended);
  $("#btn-back-swipe").style.visibility = S.ended ? "hidden" : "visible";
}

function initResults() {
  $("#btn-back-swipe").addEventListener("click", () => { show("swipe"); renderDeck(); });
  $("#btn-share-2").addEventListener("click", openShare);
  $("#btn-end").addEventListener("click", async () => {
    if (!confirm("Terminer la session ? Le film en tête sera retenu pour tout le monde.")) return;
    try { await api(`session/${S.code}/end`, { method: "POST", body: { playerId: me.id } }); S.ended = true; renderResults(); }
    catch (e) { toast(e.message); }
  });
  $("#btn-new").addEventListener("click", () => { store.del("fm:last"); S = null; history.replaceState(null, "", "/"); show("create"); renderCreate(); });
}

// ——— Partage ———
function shareUrl() { return `${location.origin}/?s=${S.code}`; }
function openShare() {
  if (!S) return;
  $("#share-code").textContent = S.code;
  const qr = $("#qr"); qr.innerHTML = "";
  if (window.QRCode) new window.QRCode(qr, { text: shareUrl(), width: 180, height: 180, correctLevel: window.QRCode.CorrectLevel.M });
  $("#btn-native-share").hidden = !navigator.share;
  $("#share-modal").hidden = false;
}
function initModals() {
  $$(".modal").forEach((m) => {
    m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-close]")) m.hidden = true; });
  });
  $("#btn-native-share").addEventListener("click", async () => {
    try { await navigator.share({ title: "FilmMatch", text: `Rejoins ma session FilmMatch (code ${S.code}) pour choisir le film de ce soir`, url: shareUrl() }); } catch {}
  });
  $("#btn-copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(shareUrl()); toast("Lien copié"); } catch { toast(shareUrl()); }
  });
  $("#btn-match-results").addEventListener("click", () => { $("#match-modal").hidden = true; show("results"); renderResults(); });
}

// ——— Boot ———
initHome(); initCreate(); initSwipe(); initResults(); initModals();
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
const autoCode = (new URLSearchParams(location.search).get("s") || "").toUpperCase();
if (/^[A-Z]{4}$/.test(autoCode) && store.get("fm:name") && store.get(`fm:s:${autoCode}`)) join(autoCode);
