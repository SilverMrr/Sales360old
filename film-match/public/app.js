import { FILMS, FILM_BY_ID, PLATFORMS, GENRES } from "./films.js";

/* ═══════════════════════ Utilitaires ═══════════════════════ */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const randomId = () => [...crypto.getRandomValues(new Uint8Array(12))].map((b) => (b % 36).toString(36)).join("");
const fmtDuration = (m) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
/* ——— Données enrichies (TMDB si configuré côté serveur) ——— */
let CAT = { enabled: false, films: {} };
const T = (f) => (CAT.films[f.id]?.found ? CAT.films[f.id] : null);
const cdn = (u, w) => `/.netlify/images?url=${encodeURIComponent(u)}&w=${w}&q=82`;
const posterUrl = (f, w = 500) => (T(f)?.poster ? cdn(T(f).poster, w) : `/api/poster?t=${encodeURIComponent(f.wiki)}&w=${w}`);
const backdropUrl = (f) => (T(f)?.backdrop ? cdn(T(f).backdrop, 1280) : null);
const hires = (f) => Boolean(T(f)?.poster);
const platformsOf = (f) => (T(f)?.providers?.length ? T(f).providers : f.platforms);
const verified = (f) => Boolean(T(f)?.providers?.length);
const durationOf = (f) => T(f)?.runtime || f.duration;
const synopsisOf = (f) => T(f)?.overview || f.pitch;
async function loadCatalog(attempt = 0) {
  try {
    const r = await fetch("/api/catalog");
    const data = await r.json();
    if (!data.enabled) return;
    CAT = data;
    document.documentElement.classList.add("tmdb");
    if (screen === "create") renderCreate();
    if (!data.complete && attempt < 4) setTimeout(() => loadCatalog(attempt + 1), 1500);
  } catch {}
}
// Appelé par les <img> d'affiche : passe la carte en plein cadre si l'image est assez nette
window.fmArt = (img) => {
  img.classList.add("ok");
  const host = img.closest("[data-media]");
  if (host && img.naturalWidth >= 560) host.classList.replace("framed", "full");
};
window.fmNoArt = (img) => { const p = img.closest(".poster,[data-media]"); if (p) p.classList.add("noimg"); img.remove(); };
const q = (s) => encodeURIComponent(s);
const LINKS = {
  justwatch: (f) => `https://www.justwatch.com/fr/recherche?q=${q(f.title)}`,
  trailer: (f) => `https://www.youtube.com/results?search_query=${q(`${f.title} ${f.year} bande annonce`)}`,
  netflix: (f) => `https://www.netflix.com/search?q=${q(f.title)}`,
  prime: (f) => `https://www.primevideo.com/search/?phrase=${q(f.title)}`,
  apple: (f) => `https://tv.apple.com/fr/search?term=${q(f.title)}`,
};
const PLAT_MARK = { netflix: "N", prime: "P", disney: "D+", max: "M", apple: "tv", canal: "C+", paramount: "P+" };
const AVATAR_COLORS = ["#ff4d6d", "#5ab8ff", "#34d399", "#ff8f5a", "#b48cff", "#f3c77a", "#ff6fcf", "#3fe0d0"];
// Couleur stable et distincte : rang de l'id parmi les joueurs (même ordre sur tous les téléphones)
const avatarColor = (id) => {
  const ids = S ? [...new Set([me.id, ...(S.players || []).map((p) => p.id)])].sort() : [];
  const i = ids.indexOf(id);
  return AVATAR_COLORS[(i >= 0 ? i : hash(id)) % AVATAR_COLORS.length];
};
const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };
const ICON = {
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  ban: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M6 6l12 12" stroke="currentColor" stroke-width="2.6"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  tv: '<svg viewBox="0 0 24 24"><path d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm4 15h8v-1.5H8z"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
};

function fbStyle(f) {
  const h = hash(f.id) % 360;
  return `background:radial-gradient(120% 90% at 20% 0%,hsl(${h} 55% 34%),transparent 60%),linear-gradient(160deg,hsl(${h} 45% 20%),hsl(${(h + 50) % 360} 55% 8%))`;
}
// Vignette simple (listes, finale…)
function posterHTML(f, { eager = false, w = 300 } = {}) {
  return `<div class="poster"><div class="fb" style="${fbStyle(f)}">${esc(f.title)}</div><img src="${posterUrl(f, w)}" alt="" ${eager ? "" : 'loading="lazy"'} decoding="async" onload="this.classList.add('ok')" onerror="fmNoArt(this)"></div>`;
}
// Média principal (carte, héros) : plein cadre si HD, sinon affiche cadrée sur fond flouté
function mediaHTML(f, w = 780) {
  const src = posterUrl(f, w);
  return `<div class="media ${hires(f) ? "full" : "framed"}" data-media>
    <img class="media-bg" src="${posterUrl(f, 200)}" alt="" draggable="false" decoding="async" onerror="this.remove()">
    <div class="media-frame">
      <div class="fb" style="${fbStyle(f)}">${esc(f.title)}</div>
      <img class="media-art" src="${src}" alt="" draggable="false" decoding="async" onload="fmArt(this)" onerror="fmNoArt(this)">
    </div>
  </div>`;
}
const platHTML = (p) => `<span class="plat"><i style="background:${PLATFORMS[p].color}"></i>${PLATFORMS[p].label}</span>`;
const platsHTML = (f) => platformsOf(f).map(platHTML).join("");
const ratingHTML = (f) => (T(f)?.rating ? `<span class="rating">${ICON.star}${String(T(f).rating).replace(".", ",")}</span>` : "");
const avatarHTML = (p, cls = "") => `<span class="avatar ${cls}" style="background:${avatarColor(p.id)}">${esc((p.name || "?").slice(0, 1).toUpperCase())}</span>`;

// Ne remplace le contenu que s'il a changé (évite clignotements et animations rejouées au polling)
function setHTML(el, html) {
  if (!el || el._html === html) return false;
  el.innerHTML = html; el._html = html; return true;
}

let toastTimer;
function toast(msg, ms = 2400) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  t.style.animation = "none"; void t.offsetWidth; t.style.animation = "";
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), ms);
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

/* ═══════════════════════ Fond dynamique ═══════════════════════ */
let bdIndex = 0, bdCurrent = "";
function setBackdrop(url) {
  if (url === bdCurrent) return;
  bdCurrent = url;
  const layers = $$("#backdrop .bd");
  const next = layers[(bdIndex + 1) % 2], prev = layers[bdIndex % 2];
  if (!url) { layers.forEach((l) => l.classList.remove("on")); return; }
  const img = new Image();
  img.onload = () => {
    if (bdCurrent !== url) return;
    next.style.backgroundImage = `url("${url}")`;
    next.classList.add("on"); prev.classList.remove("on"); bdIndex++;
  };
  img.src = url;
}

/* ═══════════════════════ Confettis ═══════════════════════ */
function confetti() {
  const c = $("#confetti"), ctx = c.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.scale(dpr, dpr);
  const colors = ["#f3c77a", "#ff4d6d", "#ff8f5a", "#5ab8ff", "#34d399", "#ffffff"];
  const parts = Array.from({ length: 160 }, (_, i) => ({
    x: innerWidth / 2 + (Math.random() - .5) * 60, y: innerHeight * .35,
    vx: (Math.random() - .5) * 14, vy: -Math.random() * 15 - 4,
    w: 5 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - .5) * .35,
    c: colors[i % colors.length],
  }));
  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += .38; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, 1 - (t - t0) / 3200);
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); ctx.restore();
    }
    if (t - t0 < 3200) requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })(t0);
}

/* ═══════════════════════ État ═══════════════════════ */
const me = {
  id: store.get("fm:pid") || (() => { const id = randomId(); store.set("fm:pid", id); return id; })(),
  get name() { return store.get("fm:name", "") || "Anonyme"; },
};
let S = null;
let pollTimer = null, saveTimer = null;
let screen = "home";

const local = (code) => store.get(`fm:s:${code}`, {});
function saveLocal() {
  if (!S) return;
  store.set(`fm:s:${S.code}`, {
    votes: S.votes, index: S.index, pick: S.pick, started: S.started,
    seenMatches: S.seenMatches, celebrated: S.celebrated, seenFinal: S.seenFinal,
  });
}

const POLL = { lobby: 2500, swipe: 4000, final: 2000, results: 2500 };
function show(name) {
  screen = name;
  $$(".screen").forEach((s) => s.classList.toggle("active", s.id === `screen-${name}`));
  clearInterval(pollTimer);
  if (POLL[name]) pollTimer = setInterval(refresh, POLL[name]);
  if (S && name !== "home" && name !== "create") history.replaceState(null, "", `/?s=${S.code}`);
  if (name === "home" || name === "create") setBackdrop("");
}

/* ═══════════════════════ Accueil ═══════════════════════ */
function buildWall() {
  const pool = FILMS.filter((f) => f.wiki !== "Lost Bullet").sort(() => Math.random() - .5).slice(0, 30);
  const rows = [pool.slice(0, 10), pool.slice(10, 20), pool.slice(20, 30)];
  $("#wall").innerHTML = rows.map((r) => {
    const tiles = r.map((f) => `<div class="wall-tile"><div class="fb" style="${fbStyle(f)}">${esc(f.title)}</div><img src="${posterUrl(f, 240)}" alt="" decoding="async" onload="this.classList.add('ok')" onerror="this.remove()"></div>`).join("");
    return `<div class="wall-row">${tiles}${tiles}</div>`;
  }).join("");
}

function initHome() {
  buildWall();
  $("#name-input").value = store.get("fm:name", "");
  $("#name-input").addEventListener("input", (e) => store.set("fm:name", e.target.value.trim()));
  const code = (new URLSearchParams(location.search).get("s") || "").toUpperCase();
  if (code) $("#code-input").value = code;
  renderResume();

  $("#btn-go-create").addEventListener("click", () => { if (requireName()) { show("create"); renderCreate(); } });
  $("#btn-join").addEventListener("click", () => {
    if (!requireName()) return;
    const c = $("#code-input").value.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(c)) return homeError("Le code fait 4 lettres.");
    join(c);
  });
  $("#code-input").addEventListener("input", (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ""); });
  $("#code-input").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#btn-join").click(); });
  $("#name-input").addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); });
  $$("[data-back]").forEach((b) => b.addEventListener("click", () => show(b.dataset.back)));
  $$("[data-home]").forEach((b) => b.addEventListener("click", goHome));
}
function goHome() { history.replaceState(null, "", "/"); show("home"); renderResume(); }
function renderResume() {
  const last = store.get("fm:last"), box = $("#resume-box");
  if (!last) { box.hidden = true; return; }
  box.innerHTML = `<span class="pulse"></span>Reprendre la session <b>${esc(last)}</b>`;
  box.hidden = false;
  box.onclick = () => { if (requireName()) join(last); };
}
function requireName() {
  const n = $("#name-input").value.trim();
  if (!n) { homeError("Ton prénom d'abord : les autres verront qui a liké quoi."); $("#name-input").focus(); return false; }
  store.set("fm:name", n); $("#home-error").hidden = true; return true;
}
function homeError(msg) { const e = $("#home-error"); e.textContent = msg; e.hidden = false; vibrate(30); }

/* ═══════════════════════ Création ═══════════════════════ */
const filters = Object.assign(
  { platforms: Object.keys(PLATFORMS), genres: [], maxDuration: 0, size: 30 },
  store.get("fm:filters", {}),
);
const DURATIONS = [[0, "Libre"], [100, "1 h 40"], [120, "2 h"], [150, "2 h 30"]];
const SIZES = [[20, "20"], [30, "30"], [50, "50"], [0, "Tous"]];

function filteredFilms() {
  return FILMS.filter((f) =>
    platformsOf(f).some((p) => filters.platforms.includes(p)) &&
    (filters.genres.length === 0 || f.genres.some((g) => filters.genres.includes(g))) &&
    (!filters.maxDuration || durationOf(f) <= filters.maxDuration));
}
function renderCreate() {
  const counts = Object.fromEntries(Object.keys(PLATFORMS).map((k) => [k, FILMS.filter((f) => platformsOf(f).includes(k)).length]));
  $("#platform-chips").innerHTML = Object.entries(PLATFORMS).map(([k, p]) => `
    <button class="plat-tile ${filters.platforms.includes(k) ? "on" : ""}" data-plat="${k}" aria-pressed="${filters.platforms.includes(k)}">
      <span class="plat-logo" style="background:${p.color}">${PLAT_MARK[k]}</span>
      <span>${p.label}<small>${counts[k]} films</small></span>
      <span class="check">${ICON.check}</span>
    </button>`).join("");
  $("#genre-chips").innerHTML = GENRES.map((g) => `<button class="chip ${filters.genres.includes(g) ? "on" : ""}" data-genre="${g}">${g}</button>`).join("");
  $("#duration-chips").innerHTML = DURATIONS.map(([v, l]) => `<button class="seg ${filters.maxDuration === v ? "on" : ""}" data-dur="${v}">${l}</button>`).join("");
  $("#size-chips").innerHTML = SIZES.map(([v, l]) => `<button class="seg ${filters.size === v ? "on" : ""}" data-size="${v}">${l}</button>`).join("");
  $("#genre-clear").style.visibility = filters.genres.length ? "visible" : "hidden";
  $("#plat-toggle-all").textContent = filters.platforms.length === Object.keys(PLATFORMS).length ? "Aucune" : "Toutes";
  const n = filteredFilms().length, used = filters.size ? Math.min(filters.size, n) : n;
  $("#create-count").innerHTML = n < 2
    ? "Pas assez de films avec ces filtres"
    : `<strong>${n}</strong> films disponibles · <strong>${used}</strong> à swiper`;
  $("#btn-create").disabled = n < 2;
  store.set("fm:filters", filters);
}
function initCreate() {
  $("#screen-create").addEventListener("click", (e) => {
    const c = e.target.closest("[data-plat],[data-genre],[data-dur],[data-size]"); if (!c) return;
    const toggle = (arr, v) => { const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v); };
    if (c.dataset.plat) toggle(filters.platforms, c.dataset.plat);
    if (c.dataset.genre) toggle(filters.genres, c.dataset.genre);
    if (c.dataset.dur) filters.maxDuration = Number(c.dataset.dur);
    if (c.dataset.size) filters.size = Number(c.dataset.size);
    vibrate(6); renderCreate();
  });
  $("#plat-toggle-all").addEventListener("click", () => {
    filters.platforms = filters.platforms.length === Object.keys(PLATFORMS).length ? [] : Object.keys(PLATFORMS);
    renderCreate();
  });
  $("#genre-clear").addEventListener("click", () => { filters.genres = []; renderCreate(); });
  $("#btn-create").addEventListener("click", createSession);
}

// Mélange en alternant les plateformes pour éviter les séries de films du même service
function buildDeck() {
  const pool = filteredFilms().sort(() => Math.random() - .5);
  const byPlat = {};
  for (const f of pool) (byPlat[platformsOf(f)[0]] ||= []).push(f);
  const queues = Object.values(byPlat).sort(() => Math.random() - .5);
  const out = [];
  while (queues.some((qq) => qq.length)) for (const qq of queues) if (qq.length) out.push(qq.shift().id);
  return filters.size ? out.slice(0, filters.size) : out;
}
async function createSession() {
  const btn = $("#btn-create"); btn.disabled = true; $("#create-error").hidden = true;
  try {
    const { code } = await api("session", { method: "POST", body: { deck: buildDeck(), filters, name: me.name, playerId: me.id } });
    await join(code);
  } catch (e) {
    const el = $("#create-error"); el.textContent = e.message; el.hidden = false;
  } finally { btn.disabled = false; }
}

/* ═══════════════════════ Session / synchro ═══════════════════════ */
async function join(code) {
  try {
    const data = await api(`session/${code}`);
    const l = local(code);
    S = {
      ...data,
      votes: l.votes || {}, index: Math.min(l.index || 0, data.deck.length), pick: l.pick || null,
      started: !!l.started, seenMatches: l.seenMatches || [], celebrated: !!l.celebrated, seenFinal: !!l.seenFinal,
    };
    const remote = data.players.find((p) => p.id === me.id);
    if (remote && Object.keys(remote.votes).length > Object.keys(S.votes).length) {
      S.votes = remote.votes;
      S.index = S.deck.findIndex((id) => !(id in S.votes)); if (S.index < 0) S.index = S.deck.length;
      S.started = true;
    }
    if (remote && remote.pick && !S.pick) S.pick = remote.pick;
    store.set("fm:last", code);
    saveLocal();
    if (!S.ended) await pushVotes();
    route();
  } catch (e) {
    if (e.status === 404) store.del("fm:last");
    show("home"); renderResume();
    homeError(e.status === 404 ? "Session introuvable ou expirée." : e.message);
  }
}

function route() {
  if (S.ended) { show("results"); renderResults(); return; }
  if (S.phase === "final") { S.seenFinal = true; saveLocal(); show("final"); renderFinal(); return; }
  if (!S.started) { show("lobby"); renderLobby(); return; }
  show("swipe"); renderDeck(); renderAvatars();
}

const isDone = () => S.index >= S.deck.length;
async function pushVotes() {
  if (!S || S.ended) return;
  try {
    await api(`session/${S.code}/player/${me.id}`, { method: "PUT", body: { name: me.name, votes: S.votes, done: isDone(), pick: S.pick } });
  } catch (e) {
    if (e.status === 409) { S.ended = true; route(); return; }
    toast("Connexion instable, nouvel essai…"); scheduleSave(3000);
  }
}
function scheduleSave(delay = 450) { clearTimeout(saveTimer); saveTimer = setTimeout(pushVotes, delay); }

async function refresh() {
  if (!S) return;
  try {
    const data = await api(`session/${S.code}`);
    const wasEnded = S.ended, wasPhase = S.phase;
    Object.assign(S, { players: data.players, ended: data.ended, hostId: data.hostId, phase: data.phase || "swipe", finalDeck: data.finalDeck || [] });
    if (S.ended && !wasEnded && screen !== "results") { show("results"); renderResults(); return; }
    if (S.phase === "final" && wasPhase !== "final" && !S.ended) {
      S.seenFinal = true; saveLocal(); $("#match-modal").hidden = true;
      show("final"); renderFinal(); toast("La finale commence"); vibrate([40, 30, 40]); return;
    }
    if (screen === "lobby") renderLobby();
    if (screen === "swipe") { renderAvatars(); checkMatches(); }
    if (screen === "final") { renderFinal(); if (outcome().decided) { show("results"); renderResults(); } }
    if (screen === "results") renderResults();
  } catch {}
}

function allPlayers() {
  const others = (S.players || []).filter((p) => p.id !== me.id);
  return [{ id: me.id, name: me.name, votes: S.votes, done: isDone(), pick: S.pick }, ...others];
}

/* ═══════════════════════ Calcul du classement ═══════════════════════ */
function ranking() {
  const players = allPlayers();
  const rows = S.deck.map((id, order) => {
    const r = { film: FILM_BY_ID[id], id, order, score: 0, likers: [], nopes: 0, vetoers: [] };
    for (const p of players) {
      const v = p.votes[id];
      if (v > 0) { r.score += v; r.likers.push({ p, s: v === 2 }); }
      else if (v === -1) r.nopes++;
      else if (v === -2) r.vetoers.push(p);
    }
    return r;
  }).filter((r) => r.film && (r.score > 0 || r.vetoers.length));
  rows.sort((a, b) =>
    (a.vetoers.length > 0) - (b.vetoers.length > 0) || b.score - a.score || b.likers.length - a.likers.length ||
    a.nopes - b.nopes || a.order - b.order);
  return rows;
}
const eligible = () => ranking().filter((r) => !r.vetoers.length && r.score > 0);

function outcome() {
  const players = allPlayers();
  if (S.phase === "final" && S.finalDeck?.length) {
    const tally = S.finalDeck.map((id, i) => ({ id, i, votes: players.filter((p) => p.pick === id).length }));
    tally.sort((a, b) => b.votes - a.votes || a.i - b.i);
    const voted = players.filter((p) => p.pick).length;
    return { winnerId: tally[0].id, final: true, tally, voted, decided: S.ended || (players.length >= 2 && voted === players.length) };
  }
  const el = eligible();
  const tie = el.length >= 2 && el[0].score === el[1].score && el[0].likers.length === el[1].likers.length;
  const allDone = players.length >= 2 && players.every((p) => p.done);
  return {
    winnerId: el[0]?.id || null, final: false, row: el[0], tie: tie && allDone && !S.ended,
    decided: S.ended || (allDone && !tie),
  };
}

function checkMatches() {
  const players = allPlayers();
  if (players.length < 2 || S.phase === "final") return;
  for (const id of S.deck) {
    if (S.seenMatches.includes(id)) continue;
    if (players.every((p) => p.votes[id] > 0)) {
      S.seenMatches.push(id); saveLocal();
      const f = FILM_BY_ID[id];
      $("#match-film").innerHTML = `<div class="match-poster">${posterHTML(f, { eager: true, w: 500 })}</div><h3>${esc(f.title)}</h3>`;
      vibrate([60, 40, 60, 40, 120]);
      $("#match-modal").hidden = false;
      confetti();
      return;
    }
  }
}

/* ═══════════════════════ Salle d'attente ═══════════════════════ */
function renderLobby() {
  $("#lobby-code").textContent = S.code;
  renderQR($("#lobby-qr"));
  setHTML($("#lobby-players"), allPlayers().map((p) =>
    `<div class="lobby-player">${avatarHTML(p)}${esc(p.name)}${p.id === me.id ? " <small>toi</small>" : ""}${p.id === S.hostId ? " <small>· hôte</small>" : ""}</div>`).join(""));
  const plats = (S.filters?.platforms || []).map((k) => PLATFORMS[k]?.label).filter(Boolean);
  $("#lobby-deck-info").textContent = `${S.deck.length} films à swiper${plats.length && plats.length < 7 ? ` · ${plats.join(", ")}` : ""}`;
  const f = FILM_BY_ID[S.deck[0]]; if (f) setBackdrop(backdropUrl(f) || posterUrl(f, 300));
}
function renderQR(el) {
  const url = shareUrl();
  if (el.dataset.url === url || typeof window.qrcode !== "function") return;
  const qr = window.qrcode(0, "M");
  qr.addData(url); qr.make();
  el.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
  el.dataset.url = url;
}

/* ═══════════════════════ Swipe ═══════════════════════ */
function renderAvatars() {
  const ps = allPlayers().slice(0, 5);
  const ring = (p) => {
    const n = Object.keys(p.votes).length, pct = Math.min(1, n / S.deck.length), c = 2 * Math.PI * 14.5;
    return `<span class="ring"><svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14.5" stroke="rgba(255,255,255,.12)"/><circle cx="16" cy="16" r="14.5" stroke="${avatarColor(p.id)}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" stroke-linecap="round"/></svg>${avatarHTML(p)}</span>`;
  };
  setHTML($("#swipe-avatars"), `<span class="stack">${ps.map(ring).join("")}</span><span class="code"><small>Code</small>${S.code}</span>`);
}

function cardHTML(f) {
  return `
    ${mediaHTML(f)}
    <div class="shade"></div><div class="tint"></div><div class="glare"></div>
    <div class="top-tags">${ratingHTML(f)}</div>
    <button class="card-info-btn" data-details="${f.id}" aria-label="Synopsis et bande-annonce">${ICON.info}</button>
    <div class="stamp like">${ICON.heart}J'aime</div>
    <div class="stamp nope">${ICON.x}Bof</div>
    <div class="stamp super">${ICON.star}Coup de cœur</div>
    <div class="stamp veto">${ICON.ban}Veto</div>
    <div class="info">
      <div class="genres">${f.genres.slice(0, 2).join(" · ")}</div>
      <h2>${esc(f.title)}</h2>
      <div class="meta">${f.year}<span class="dot"></span>${fmtDuration(durationOf(f))}${T(f)?.director ? `<span class="dot"></span>${esc(T(f).director)}` : ""}</div>
      <div class="plats">${platsHTML(f)}</div>
      <p class="pitch">${esc(f.pitch)}</p>
    </div>`;
}

function renderDeck() {
  const deckEl = $("#deck");
  deckEl.innerHTML = "";
  const done = isDone();
  $("#deck-done").hidden = !done;
  deckEl.hidden = done;
  $$("#actions .act:not(.act-undo)").forEach((b) => (b.style.visibility = done ? "hidden" : "visible"));
  $("#actions").style.display = done ? "none" : "";
  $("#act-undo").disabled = S.index === 0;
  const vetoUsed = Object.values(S.votes).includes(-2);
  $("#act-veto").disabled = vetoUsed;
  $("#veto-count").textContent = vetoUsed ? "0" : "1";
  $("#progress-bar").style.width = `${(S.index / S.deck.length) * 100}%`;
  $("#progress-text").textContent = `${Math.min(S.index + 1, S.deck.length)} / ${S.deck.length}`;

  if (done) {
    setBackdrop("");
    const others = allPlayers().filter((p) => p.id !== me.id);
    const waiting = others.filter((p) => !p.done).length;
    $("#done-sub").textContent = others.length === 0 ? "Invite d'autres personnes pour comparer vos goûts."
      : waiting ? `On attend ${waiting} personne${waiting > 1 ? "s" : ""}…` : "Tout le monde a fini !";
    return;
  }
  for (let k = Math.min(S.index + 2, S.deck.length - 1); k >= S.index; k--) {
    const f = FILM_BY_ID[S.deck[k]]; if (!f) continue;
    const el = document.createElement("div");
    const depth = k - S.index;
    el.className = `card${depth ? ` depth-${depth}` : ""}`;
    el.innerHTML = cardHTML(f);
    deckEl.appendChild(el);
    if (depth === 0) attachDrag(el, f);
  }
  const cur = FILM_BY_ID[S.deck[S.index]];
  if (cur) setBackdrop(backdropUrl(cur) || posterUrl(cur, 300));
  for (let k = S.index + 3; k < Math.min(S.index + 6, S.deck.length); k++) {
    const f = FILM_BY_ID[S.deck[k]]; if (f) { new Image().src = posterUrl(f, 780); new Image().src = posterUrl(f, 200); }
  }
}

function attachDrag(card, film) {
  let x0 = 0, y0 = 0, dx = 0, dy = 0, t0 = 0, dragging = false, moved = false, grabY = 0.5;
  const st = { like: $(".stamp.like", card), nope: $(".stamp.nope", card), super: $(".stamp.super", card) };
  const tint = $(".tint", card);
  const behind = () => $("#deck .card.depth-1");
  const btn = { like: $("#act-like"), nope: $("#act-nope"), super: $("#act-super") };
  const hot = (k) => Object.entries(btn).forEach(([n, b]) => b.classList.toggle("hot", n === k));

  card.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".card-info-btn")) return;
    dragging = true; moved = false; x0 = e.clientX; y0 = e.clientY; t0 = performance.now(); dx = dy = 0;
    const r = card.getBoundingClientRect(); grabY = (e.clientY - r.top) / r.height;
    card.setPointerCapture(e.pointerId); card.classList.remove("settle");
  });
  card.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    dx = e.clientX - x0; dy = e.clientY - y0;
    if (Math.hypot(dx, dy) > 6) moved = true;
    const rot = (dx / 16) * (grabY < .5 ? 1 : -1);
    card.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${rot}deg)`;
    card.style.setProperty("--gx", `${50 - dx / 6}%`); card.style.setProperty("--gy", `${grabY * 100 - dy / 8}%`);
    card.style.setProperty("--ga", Math.min(.5, Math.hypot(dx, dy) / 400));
    const up = -dy > Math.abs(dx) && -dy > 30;
    const pr = Math.min(1, Math.max(0, dx / 110)), pl = Math.min(1, Math.max(0, -dx / 110)), pu = up ? Math.min(1, -dy / 130) : 0;
    st.like.style.opacity = up ? 0 : pr; st.nope.style.opacity = up ? 0 : pl; st.super.style.opacity = pu;
    tint.style.opacity = Math.max(pr, pl, pu) * .9;
    tint.style.background = up ? "var(--super)" : dx > 0 ? "var(--like)" : "var(--nope)";
    hot(up && pu > .6 ? "super" : pr > .6 && !up ? "like" : pl > .6 && !up ? "nope" : null);
    const b = behind();
    if (b) { const p = Math.min(1, Math.hypot(dx, dy) / 160); b.style.transform = `translateY(${14 - 14 * p}px) scale(${.94 + .06 * p})`; }
  });
  const end = () => {
    if (!dragging) return; dragging = false; hot(null);
    const dt = Math.max(1, performance.now() - t0), vx = dx / dt, vy = dy / dt;
    if (!moved && dt < 350) { openDetails(film, true); return; }
    if ((-dy > 120 && -dy > Math.abs(dx)) || (vy < -.8 && -dy > 50 && -dy > Math.abs(dx))) return vote(2, { vx, vy });
    if (dx > 110 || (vx > .55 && dx > 40)) return vote(1, { vx, vy });
    if (dx < -110 || (vx < -.55 && dx < -40)) return vote(-1, { vx, vy });
    card.classList.add("settle"); card.style.transform = ""; card.style.setProperty("--ga", 0);
    Object.values(st).forEach((s) => (s.style.opacity = 0)); tint.style.opacity = 0;
    const b = behind(); if (b) { b.classList.add("promote"); b.style.transform = ""; }
  };
  card.addEventListener("pointerup", end);
  card.addEventListener("pointercancel", end);
}

let animating = false, animTimer = null;
function finishAnimation() {
  if (!animating) return;
  clearTimeout(animTimer); animating = false; renderDeck();
}
function vote(v, { vx = 0 } = {}) {
  if (!S) return;
  finishAnimation(); // un tap rapide n'est jamais perdu : on termine la carte précédente
  if (isDone()) return;
  const card = $("#deck .card:last-child");
  const id = S.deck[S.index];
  S.votes[id] = v; S.index++; S.started = true;
  saveLocal(); scheduleSave(); checkMatches();
  vibrate(v === 2 ? [15, 30, 25] : v === -2 ? [40, 20, 40] : 10);
  if (!card) return renderDeck();
  animating = true;
  const stampKey = { 1: "like", "-1": "nope", 2: "super", "-2": "veto" }[v];
  $$(".stamp", card).forEach((s) => (s.style.opacity = 0));
  $(`.stamp.${stampKey}`, card).style.opacity = 1;
  card.classList.remove("settle"); card.classList.add("fly");
  const W = innerWidth * 1.5;
  if (v === 2) card.style.transform = `translate3d(0, ${-innerHeight}px, 0) rotate(0deg)`;
  else if (v === -2) { card.style.transform = "translate3d(0, 0, 0) scale(.6)"; card.style.opacity = 0; }
  else card.style.transform = `translate3d(${v === 1 ? W : -W}px, ${80 + Math.abs(vx) * 40}px, 0) rotate(${v === 1 ? 28 : -28}deg)`;
  const b = $("#deck .card.depth-1");
  if (b) { b.classList.add("promote"); b.style.transform = "translateY(0) scale(1)"; b.classList.remove("depth-1"); }
  animTimer = setTimeout(() => { animating = false; renderDeck(); if (isDone()) pushVotes(); }, 330);
}
function undo() {
  if (!S || S.index === 0) return;
  finishAnimation();
  S.index--; delete S.votes[S.deck[S.index]];
  saveLocal(); scheduleSave(); renderDeck(); vibrate(8);
}
let vetoArmed = 0;
function veto() {
  if (Object.values(S.votes).includes(-2)) return toast("Tu as déjà utilisé ton veto.");
  if (Date.now() - vetoArmed > 2500) {
    vetoArmed = Date.now();
    toast("Veto = film éliminé pour tout le monde. Touche encore pour confirmer.", 2500);
    vibrate(20); return;
  }
  vetoArmed = 0; vote(-2);
}

function initSwipe() {
  $("#act-like").addEventListener("click", () => vote(1));
  $("#act-nope").addEventListener("click", () => vote(-1));
  $("#act-super").addEventListener("click", () => vote(2));
  $("#act-veto").addEventListener("click", veto);
  $("#act-undo").addEventListener("click", undo);
  $("#btn-done-undo").addEventListener("click", undo);
  const toResults = () => { show("results"); renderResults(); refresh(); };
  $("#btn-to-results").addEventListener("click", toResults);
  $("#btn-done-results").addEventListener("click", toResults);
  $("#swipe-avatars").addEventListener("click", openShare);
  $("#deck").addEventListener("click", (e) => {
    const b = e.target.closest("[data-details]"); if (b) openDetails(FILM_BY_ID[b.dataset.details], true);
  });
  $("#btn-start").addEventListener("click", () => { S.started = true; saveLocal(); show("swipe"); renderDeck(); renderAvatars(); });
  document.addEventListener("keydown", (e) => {
    if (screen !== "swipe" || !$("#details-modal").hidden || e.target.tagName === "INPUT") return;
    if (e.key === "ArrowRight") vote(1);
    if (e.key === "ArrowLeft") vote(-1);
    if (e.key === "ArrowUp") vote(2);
    if (e.key === "Backspace") undo();
  });
}

/* ═══════════════════════ Fiche détaillée ═══════════════════════ */
function openDetails(f, canVote = false) {
  const t = T(f), watch = platformsOf(f).filter((p) => LINKS[p]);
  const bd = backdropUrl(f);
  const head = bd
    ? `<div class="d-hero" style="background-image:url('${bd}')">${t.trailer ? `<button class="d-play" data-trailer="${t.trailer}" aria-label="Lire la bande-annonce">${ICON.play}</button>` : ""}</div>`
    : `<div class="d-hero d-hero-poster">${mediaHTML(f, 500)}${t?.trailer ? `<button class="d-play" data-trailer="${t.trailer}" aria-label="Lire la bande-annonce">${ICON.play}</button>` : ""}</div>`;
  const facts = [
    t?.rating ? `<div><b>${String(t.rating).replace(".", ",")}</b><span>note TMDB</span></div>` : "",
    `<div><b>${fmtDuration(durationOf(f))}</b><span>durée</span></div>`,
    `<div><b>${f.year}</b><span>sortie</span></div>`,
  ].join("");
  $("#details-body").innerHTML = `
    ${head}
    <div class="d-body">
      <div class="d-genres">${f.genres.join(" · ")}</div>
      <h2>${esc(f.title)}</h2>
      ${t?.tagline ? `<p class="d-tagline">${esc(t.tagline)}</p>` : ""}
      <div class="d-facts">${facts}</div>
      <p class="pitch">${esc(synopsisOf(f))}</p>
      ${t?.director || t?.cast?.length ? `<dl class="d-credits">
        ${t.director ? `<dt>Réalisation</dt><dd>${esc(t.director)}</dd>` : ""}
        ${t.cast?.length ? `<dt>Avec</dt><dd>${t.cast.map(esc).join(", ")}</dd>` : ""}
      </dl>` : ""}
      <div class="d-where">
        <span class="eyebrow">${verified(f) ? "Disponible en France" : "Disponibilité indicative"}</span>
        <div class="plats">${platsHTML(f)}</div>
      </div>
      <div class="d-actions">
        <a class="btn btn-glass" href="${t?.trailer ? `https://www.youtube.com/watch?v=${t.trailer}` : LINKS.trailer(f)}" target="_blank" rel="noopener">${ICON.play}Bande-annonce</a>
        <a class="btn btn-glass" href="${watch.length ? LINKS[watch[0]](f) : LINKS.justwatch(f)}" target="_blank" rel="noopener">${ICON.tv}${watch.length ? PLATFORMS[watch[0]].label : "Où regarder"}</a>
      </div>
      ${canVote && FILM_BY_ID[S?.deck?.[S.index]] === f ? `
      <div class="d-vote">
        <button class="dv dv-nope" data-dv="-1">${ICON.x}<span>Bof</span></button>
        <button class="dv dv-super" data-dv="2">${ICON.star}<span>Coup de cœur</span></button>
        <button class="dv dv-like" data-dv="1">${ICON.heart}<span>J'aime</span></button>
      </div>` : ""}
    </div>`;
  $("#details-modal").hidden = false;
  $("#details-modal .sheet").scrollTop = 0;
}

/* ═══════════════════════ Finale ═══════════════════════ */
function renderFinal() {
  const o = outcome(), players = allPlayers();
  const rows = Object.fromEntries(ranking().map((r) => [r.id, r]));
  const reveal = o.decided;
  setHTML($("#final-choices"), S.finalDeck.map((id) => {
    const f = FILM_BY_ID[id]; if (!f) return "";
    const r = rows[id], t = o.tally.find((x) => x.id === id);
    return `<button class="final-choice ${S.pick === id ? "picked" : ""}" data-pick="${id}">
      <div class="thumb">${posterHTML(f, { eager: true })}</div>
      <div>
        <h3>${esc(f.title)}</h3>
        <div class="sub">${f.year} · ${fmtDuration(durationOf(f))} · ${platformsOf(f).map((p) => PLATFORMS[p].label).join(", ")}</div>
        <div class="pts">${r ? `<span class="tag">${r.score} pt${r.score > 1 ? "s" : ""} au 1er tour</span>` : ""}</div>
        ${reveal ? `<div class="votes">${t.votes} voix</div>` : ""}
      </div>
    </button>`;
  }).join(""));
  $("#final-status").textContent = S.pick
    ? `${o.voted}/${players.length} ont voté${o.voted < players.length ? " · tu peux encore changer d'avis" : ""}`
    : `${o.voted}/${players.length} ont voté · fais ton choix`;
  const f = FILM_BY_ID[S.pick || S.finalDeck[0]]; if (f) setBackdrop(backdropUrl(f) || posterUrl(f, 300));
}
function initFinal() {
  $("#final-choices").addEventListener("click", (e) => {
    const b = e.target.closest("[data-pick]"); if (!b || S.ended) return;
    S.pick = b.dataset.pick; saveLocal(); vibrate(15); renderFinal(); pushVotes().then(refresh);
  });
  $("#btn-final-results").addEventListener("click", () => { show("results"); renderResults(); });
}

/* ═══════════════════════ Résultats ═══════════════════════ */
function renderResults() {
  if (!S) return;
  const players = allPlayers(), rows = ranking(), o = outcome();
  const f = o.winnerId && FILM_BY_ID[o.winnerId];
  $("#results-title").textContent = o.decided ? "Résultat" : "Classement";
  $("#results-live").hidden = o.decided;
  $("#btn-back-swipe").style.visibility = S.ended ? "hidden" : "visible";

  if (!f) {
    setHTML($("#winner"), `<div class="empty"><div class="big">Pas encore de favori</div>Les likes apparaîtront ici en direct.</div>`);
    setBackdrop("");
  } else {
    const row = rows.find((r) => r.id === f.id);
    const label = o.decided ? "Le film de ce soir" : o.final ? "Finale en cours" : o.tie ? "Égalité en tête" : "En tête pour l'instant";
    const scoreBadge = o.final
      ? `<b>${o.tally[0].votes}</b><small>voix</small>`
      : `<b>${row?.score ?? 0}</b><small>pts</small>`;
    const watch = platformsOf(f).filter((p) => LINKS[p]);
    setHTML($("#winner"), `
      <div class="hero ${o.decided ? "decided" : ""}">
        ${mediaHTML(f)}
        <div class="shade"></div>
        <div class="score">${scoreBadge}</div>
        <div class="body">
          <span class="label">${o.decided ? "🍿 " : ""}${label}</span>
          <h2>${esc(f.title)}</h2>
          <div class="meta">${f.year} · ${fmtDuration(durationOf(f))} · ${row ? `${row.likers.length}/${players.length} ont liké` : ""}</div>
          <div class="plats">${platsHTML(f)}${ratingHTML(f)}</div>
        </div>
      </div>
      <div class="watch-row">
        <a class="btn btn-glass" href="${T(f)?.trailer ? `https://www.youtube.com/watch?v=${T(f).trailer}` : LINKS.trailer(f)}" target="_blank" rel="noopener">${ICON.play}Bande-annonce</a>
        <a class="btn ${o.decided ? "btn-gold" : "btn-glass"}" href="${watch.length ? LINKS[watch[0]](f) : LINKS.justwatch(f)}" target="_blank" rel="noopener">${ICON.tv}${watch.length ? PLATFORMS[watch[0]].label : "Où regarder"}</a>
      </div>`);
    setBackdrop(backdropUrl(f) || posterUrl(f, 300));
    if (o.decided && !S.celebrated) { S.celebrated = true; saveLocal(); setTimeout(confetti, 300); vibrate([30, 40, 30, 40, 200]); }
  }

  // Actions de l'hôte
  const isHost = S.hostId === me.id;
  let host = "";
  if (isHost && !S.ended) {
    const el = eligible();
    if (S.phase !== "final" && el.length >= 2) {
      const n = Math.min(3, el.length);
      host += `<button class="btn btn-gold" id="btn-final">Lancer la finale entre les ${n} premiers</button>`;
    }
    host += `<button class="btn btn-glass" id="btn-end">${S.phase === "final" ? "Clore la finale maintenant" : "Terminer et garder ce film"}</button>`;
    host += `<p class="host-note">${o.tie ? "Égalité : la finale permet de départager. " : ""}Tu es l'hôte : ces actions s'appliquent à tout le monde.</p>`;
  } else if (o.tie) {
    host = `<p class="host-note">Égalité en tête : l'hôte peut lancer une finale.</p>`;
  }
  setHTML($("#host-actions"), host);

  setHTML($("#ranking"), rows.slice(0, 20).map((r, i) => `
    <li class="rank-item ${r.vetoers.length ? "vetoed" : ""}" style="animation-delay:${i * 30}ms" data-details="${r.id}">
      <div class="rank-pos">${r.vetoers.length ? "—" : i + 1}</div>
      <div class="rank-thumb">${posterHTML(r.film)}</div>
      <div>
        <div class="rank-title">${esc(r.film.title)}</div>
        <div class="rank-sub">${r.film.year} · ${fmtDuration(durationOf(r.film))} · ${platformsOf(r.film).map((p) => PLATFORMS[p].label).join(", ")}</div>
        <div class="rank-who">
          ${r.likers.map((l) => `<span class="who ${l.s ? "s" : ""}">${avatarHTML(l.p)}${l.s ? "★" : "♥"} ${esc(l.p.name)}</span>`).join("")}
          ${r.vetoers.map((p) => `<span class="who v">${avatarHTML(p)}⛔ ${esc(p.name)}</span>`).join("")}
        </div>
      </div>
      <div class="rank-score">${r.score}<small>pts</small></div>
    </li>`).join("") || `<li class="empty">Rien pour l'instant.</li>`);

  setHTML($("#players-list"), players.map((p) => {
    const n = Object.keys(p.votes).length, likes = Object.values(p.votes).filter((v) => v > 0).length;
    const status = S.phase === "final" ? (p.pick ? "a voté" : "réfléchit…") : p.done ? "a fini" : `${n}/${S.deck.length}`;
    return `<div class="player">
      ${avatarHTML(p, "lg")}
      <div><div class="pname">${esc(p.name)}${p.id === me.id ? " <small>· toi</small>" : ""}${p.id === S.hostId ? " <small>· hôte</small>" : ""}</div>
        <div class="pbar"><div style="width:${(n / S.deck.length) * 100}%"></div></div></div>
      <div class="pstat"><b>${status}</b>${likes} like${likes > 1 ? "s" : ""}</div>
    </div>`;
  }).join(""));
}

function initResults() {
  $("#btn-back-swipe").addEventListener("click", () => {
    if (S.phase === "final") { show("final"); renderFinal(); } else { show("swipe"); renderDeck(); renderAvatars(); }
  });
  $("#host-actions").addEventListener("click", async (e) => {
    if (e.target.id === "btn-final") {
      const deck = eligible().slice(0, 3).map((r) => r.id);
      try { await api(`session/${S.code}/final`, { method: "POST", body: { playerId: me.id, deck } }); await refresh(); }
      catch (err) { toast(err.message); }
    }
    if (e.target.id === "btn-end") {
      if (!confirm("Terminer la session pour tout le monde ? Les votes seront verrouillés.")) return;
      try { await api(`session/${S.code}/end`, { method: "POST", body: { playerId: me.id } }); S.ended = true; renderResults(); }
      catch (err) { toast(err.message); }
    }
  });
  $("#ranking").addEventListener("click", (e) => {
    const li = e.target.closest("[data-details]"); if (li) openDetails(FILM_BY_ID[li.dataset.details]);
  });
  $("#winner").addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    const o = outcome(); if (o.winnerId) openDetails(FILM_BY_ID[o.winnerId]);
  });
  $("#btn-new").addEventListener("click", () => { store.del("fm:last"); S = null; history.replaceState(null, "", "/"); show("create"); renderCreate(); });
}

/* ═══════════════════════ Partage & modales ═══════════════════════ */
const shareUrl = () => `${location.origin}/?s=${S.code}`;
function openShare() {
  if (!S) return;
  $("#share-code").textContent = S.code;
  renderQR($("#share-qr"));
  $("#share-modal").hidden = false;
}
async function doShare() {
  if (navigator.share) {
    try { await navigator.share({ title: "FilmMatch", text: `On choisit le film de ce soir ? Rejoins ma session FilmMatch (code ${S.code})`, url: shareUrl() }); } catch {}
  } else doCopy();
}
async function doCopy() {
  try { await navigator.clipboard.writeText(shareUrl()); toast("Lien copié"); } catch { toast(shareUrl(), 4000); }
}
function initModals() {
  $$(".modal").forEach((m) => m.addEventListener("click", (e) => {
    if (e.target === m || e.target.closest("[data-close]")) { m.hidden = true; if (m.id === "details-modal") $("#details-body").innerHTML = ""; }
  }));
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-share]")) doShare();
    if (e.target.closest("[data-copy]")) doCopy();
    if (e.target.closest("[data-open-share]")) openShare();
    const tr = e.target.closest("[data-trailer]");
    if (tr) {
      const hero = tr.closest(".d-hero");
      hero.classList.add("playing");
      hero.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(tr.dataset.trailer)}?autoplay=1&playsinline=1&rel=0&modestbranding=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="Bande-annonce"></iframe>`;
    }
    const dv = e.target.closest("[data-dv]");
    if (dv) { $("#details-modal").hidden = true; setTimeout(() => vote(Number(dv.dataset.dv)), 200); }
  });
  $("#btn-match-results").addEventListener("click", () => { $("#match-modal").hidden = true; show("results"); renderResults(); });
  // Glisser vers le bas pour fermer les sheets
  $$(".sheet").forEach((sh) => {
    let y0 = null;
    sh.addEventListener("touchstart", (e) => { if (sh.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
    sh.addEventListener("touchmove", (e) => {
      if (y0 === null) return; const d = e.touches[0].clientY - y0;
      if (d > 0) sh.style.transform = `translateY(${d}px)`;
    }, { passive: true });
    sh.addEventListener("touchend", (e) => {
      if (y0 === null) return; const d = e.changedTouches[0].clientY - y0; y0 = null;
      sh.style.transition = "transform .3s var(--ease)";
      if (d > 110) { sh.closest(".modal").hidden = true; }
      sh.style.transform = ""; setTimeout(() => (sh.style.transition = ""), 300);
    });
  });
}

/* ═══════════════════════ Démarrage ═══════════════════════ */
loadCatalog();
initHome(); initCreate(); initSwipe(); initFinal(); initResults(); initModals();
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
const autoCode = (new URLSearchParams(location.search).get("s") || "").toUpperCase();
if (/^[A-Z]{4}$/.test(autoCode) && store.get("fm:name")) join(autoCode);
