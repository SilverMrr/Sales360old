import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import { FILMS } from "../../public/films.js";

// Stockage :
//   sessions  : "<CODE>/meta"        -> { code, createdAt, hostId, deck: string[], filters, ended }
//               "<CODE>/p/<playerId>" -> { name, votes: { [filmId]: 1 | 2 | -1 }, done, updatedAt }
// Chaque joueur n'écrit que sa propre clé : pas de read-modify-write concurrent.
//   posters   : "<wikiTitle>" -> { url: string | null, at: number }

const SESSION_TTL_MS = 3 * 24 * 3600 * 1000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const ID_RE = /^[a-z0-9]{8,32}$/;
const CODE_RE = /^[A-Z]{4}$/;
const FILM_ID_RE = /^[a-z0-9-]{1,120}$/;

const sessions = () => getStore({ name: "sessions", consistency: "strong" });
const posters = () => getStore("posters-v2");

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const err = (message: string, status = 400) => json({ error: message }, status);

function randomCode() {
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return s;
}

function cleanName(v: unknown) {
  const n = String(v ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
  return n || "Anonyme";
}

async function readBody(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

async function getMeta(code: string) {
  const meta: any = await sessions().get(`${code}/meta`, { type: "json" });
  if (!meta) return null;
  if (Date.now() - meta.createdAt > SESSION_TTL_MS) return null;
  return meta;
}

async function getPlayers(code: string) {
  const store = sessions();
  const { blobs } = await store.list({ prefix: `${code}/p/` });
  const players = await Promise.all(
    blobs.map(async (b) => {
      const p: any = await store.get(b.key, { type: "json" });
      if (!p) return null;
      return { id: b.key.split("/").pop(), ...p };
    }),
  );
  return players.filter(Boolean);
}

// ——— Handlers ———

async function createSession(req: Request) {
  const body = await readBody(req);
  const deck = Array.isArray(body.deck) ? body.deck.filter((x: unknown) => typeof x === "string" && FILM_ID_RE.test(x)) : [];
  if (deck.length < 2) return err("Il faut au moins 2 films dans la sélection.");
  if (deck.length > 400) return err("Sélection trop grande.");
  const playerId = String(body.playerId ?? "");
  if (!ID_RE.test(playerId)) return err("playerId invalide.");

  const store = sessions();
  for (let i = 0; i < 8; i++) {
    const code = randomCode();
    const existing: any = await store.get(`${code}/meta`, { type: "json" });
    if (existing && Date.now() - existing.createdAt < SESSION_TTL_MS) continue;
    const meta = {
      code,
      createdAt: Date.now(),
      hostId: playerId,
      deck,
      filters: typeof body.filters === "object" && body.filters ? body.filters : {},
      phase: "swipe",
      finalDeck: [],
      ended: false,
    };
    await store.setJSON(`${code}/meta`, meta);
    // Nettoie d'éventuels joueurs d'une ancienne session expirée portant le même code
    if (existing) {
      const { blobs } = await store.list({ prefix: `${code}/p/` });
      await Promise.all(blobs.map((b) => store.delete(b.key)));
    }
    await store.setJSON(`${code}/p/${playerId}`, {
      name: cleanName(body.name), votes: {}, done: false, pick: null, updatedAt: Date.now(),
    });
    return json({ code });
  }
  return err("Impossible de générer un code, réessaie.", 500);
}

async function getSession(code: string) {
  const meta = await getMeta(code);
  if (!meta) return err("Session introuvable ou expirée.", 404);
  const players = await getPlayers(code);
  return json({ ...meta, players });
}

async function upsertPlayer(req: Request, code: string, playerId: string) {
  if (!ID_RE.test(playerId)) return err("playerId invalide.");
  const meta = await getMeta(code);
  if (!meta) return err("Session introuvable ou expirée.", 404);
  if (meta.ended) return err("La session est terminée : les votes sont verrouillés.", 409);
  const body = await readBody(req);
  const votes: Record<string, number> = {};
  if (body.votes && typeof body.votes === "object") {
    let vetoUsed = false;
    // Parcours dans l'ordre du deck pour un résultat déterministe (1 seul veto conservé)
    for (const id of meta.deck as string[]) {
      const v = body.votes[id];
      if (v === 1 || v === 2 || v === -1) votes[id] = v;
      else if (v === -2) {
        if (vetoUsed) votes[id] = -1;
        else { votes[id] = -2; vetoUsed = true; }
      }
    }
  }
  const finalDeck: string[] = Array.isArray(meta.finalDeck) ? meta.finalDeck : [];
  const pick = typeof body.pick === "string" && finalDeck.includes(body.pick) ? body.pick : null;
  const player = {
    name: cleanName(body.name),
    votes,
    done: Boolean(body.done),
    pick,
    updatedAt: Date.now(),
  };
  await sessions().setJSON(`${code}/p/${playerId}`, player);
  return json({ ok: true });
}

async function startFinal(req: Request, code: string) {
  const meta = await getMeta(code);
  if (!meta) return err("Session introuvable ou expirée.", 404);
  if (meta.ended) return err("La session est déjà terminée.", 409);
  const body = await readBody(req);
  if (body.playerId !== meta.hostId) return err("Seul l'hôte peut lancer la finale.", 403);
  const deckSet = new Set<string>(meta.deck);
  const finalDeck = Array.isArray(body.deck) ? [...new Set<string>(body.deck)].filter((id) => deckSet.has(id)) : [];
  if (finalDeck.length < 2 || finalDeck.length > 5) return err("La finale se joue entre 2 et 5 films.");
  meta.phase = "final";
  meta.finalDeck = finalDeck;
  meta.finalAt = Date.now();
  await sessions().setJSON(`${code}/meta`, meta);
  return json({ ok: true });
}

async function endSession(req: Request, code: string) {
  const meta = await getMeta(code);
  if (!meta) return err("Session introuvable ou expirée.", 404);
  const body = await readBody(req);
  if (body.playerId !== meta.hostId) return err("Seul l'hôte peut terminer la session.", 403);
  meta.ended = true;
  meta.endedAt = Date.now();
  await sessions().setJSON(`${code}/meta`, meta);
  return json({ ok: true });
}

async function fetchWikiPoster(title: string): Promise<{ src: string | null; definitive: boolean; raw?: unknown }> {
  const api = new URL("https://en.wikipedia.org/w/api.php");
  api.search = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", redirects: "1",
    prop: "pageimages", piprop: "thumbnail", pithumbsize: "500", pilicense: "any", titles: title,
  }).toString();
  const r = await fetch(api, { headers: { "User-Agent": "FilmMatch/1.0 (https://filmmatch-silvain.netlify.app)", "Api-User-Agent": "FilmMatch/1.0 (https://filmmatch-silvain.netlify.app)" } });
  const text = await r.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch {}
  const page = data?.query?.pages?.[0];
  const src = page?.thumbnail?.source ?? null;
  // "définitif" = Wikipédia a bien répondu sur la page (elle existe sans image, ou est absente)
  const definitive = Boolean(r.ok && page && !data?.error);
  return { src, definitive, raw: { status: r.status, body: text.slice(0, 400) } };
}

async function poster(url: URL) {
  const title = (url.searchParams.get("t") ?? "").slice(0, 200);
  if (!title) return new Response("missing t", { status: 400 });
  if (url.searchParams.get("debug") === "1") return json(await fetchWikiPoster(title));

  const store = posters();
  const cached: any = await store.get(title, { type: "json" });
  const fresh = cached && (cached.url || Date.now() - cached.at < 6 * 3600 * 1000);
  let src: string | null = fresh ? cached.url : null;

  if (!fresh) {
    try {
      const res = await fetchWikiPoster(title);
      src = res.src;
      if (src || res.definitive) await store.setJSON(title, { url: src, at: Date.now() });
    } catch {
      src = null;
    }
  }

  if (!src) return new Response("no poster", { status: 404, headers: { "Cache-Control": "no-store" } });
  const w = Math.min(800, Math.max(80, Number(url.searchParams.get("w")) || 500));
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/.netlify/images?url=${encodeURIComponent(src)}&w=${w}&q=82`,
      "Cache-Control": "public, max-age=86400",
      "Netlify-CDN-Cache-Control": "public, durable, max-age=604800",
    },
  });
}


// ——— TMDB (optionnel) : activé si TMDB_API_KEY (clé v3) ou TMDB_READ_TOKEN (jeton v4) est défini ———
const TMDB_IMG = "https://image.tmdb.org/t/p/";
const PLATFORM_MATCHERS: [string, RegExp][] = [
  ["netflix", /netflix/i], ["prime", /amazon prime|prime video/i], ["disney", /disney/i],
  ["max", /^max\b|hbo/i], ["apple", /apple tv/i], ["canal", /canal/i], ["paramount", /paramount/i],
];

function tmdbAuth() {
  const token = Netlify.env.get("TMDB_READ_TOKEN");
  const key = Netlify.env.get("TMDB_API_KEY");
  if (token) return { headers: { Authorization: `Bearer ${token}` }, params: {} as Record<string, string> };
  if (key && key.startsWith("eyJ")) return { headers: { Authorization: `Bearer ${key}` }, params: {} as Record<string, string> };
  if (key) return { headers: {}, params: { api_key: key } };
  return null;
}

async function tmdbGet(path: string, params: Record<string, string>) {
  const auth = tmdbAuth()!;
  const u = new URL(`https://api.themoviedb.org/3${path}`);
  u.search = new URLSearchParams({ ...params, ...auth.params }).toString();
  const r = await fetch(u, { headers: { accept: "application/json", ...auth.headers } });
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
}

const stripParen = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, "").trim();

async function tmdbFilm(f: any) {
  const queries = [stripParen(f.wiki), f.title];
  let hit: any = null;
  for (const query of queries) {
    for (const year of [String(f.year), String(f.year - 1), String(f.year + 1)]) {
      const res: any = await tmdbGet("/search/movie", { query, year, language: "fr-FR", include_adult: "false" });
      if (res.results?.length) { hit = res.results[0]; break; }
    }
    if (hit) break;
  }
  if (!hit) return { id: f.id, found: false, at: Date.now() };
  const d: any = await tmdbGet(`/movie/${hit.id}`, { language: "fr-FR", append_to_response: "videos,credits,watch/providers", include_video_language: "fr,en,null" });
  const vids = (d.videos?.results ?? []).filter((v: any) => v.site === "YouTube" && /Trailer|Teaser/.test(v.type));
  vids.sort((a: any, b: any) => (b.iso_639_1 === "fr" ? 1 : 0) - (a.iso_639_1 === "fr" ? 1 : 0) || (b.type === "Trailer" ? 1 : 0) - (a.type === "Trailer" ? 1 : 0));
  const fr = d["watch/providers"]?.results?.FR ?? {};
  const flat = [...(fr.flatrate ?? []), ...(fr.ads ?? []), ...(fr.free ?? [])];
  const providers = [...new Set(flat.map((p: any) => PLATFORM_MATCHERS.find(([, re]) => re.test(p.provider_name))?.[0]).filter(Boolean))];
  return {
    id: f.id, found: true, at: Date.now(), tmdbId: d.id,
    poster: d.poster_path ? `${TMDB_IMG}w780${d.poster_path}` : null,
    backdrop: d.backdrop_path ? `${TMDB_IMG}w1280${d.backdrop_path}` : null,
    overview: d.overview || null, tagline: d.tagline || null,
    rating: d.vote_count > 50 ? Math.round(d.vote_average * 10) / 10 : null,
    runtime: d.runtime || null,
    director: (d.credits?.crew ?? []).find((c: any) => c.job === "Director")?.name ?? null,
    cast: (d.credits?.cast ?? []).slice(0, 4).map((c: any) => c.name),
    trailer: vids[0]?.key ?? null,
    providers, providerNames: flat.map((p: any) => p.provider_name).slice(0, 6),
    link: fr.link ?? null,
  };
}

async function catalog() {
  if (!tmdbAuth()) return json({ enabled: false });
  const store = getStore("tmdb-v1");
  const WEEK = 7 * 24 * 3600 * 1000;
  const entries: Record<string, any> = {};
  const missing: any[] = [];
  await Promise.all((FILMS as any[]).map(async (f) => {
    const e: any = await store.get(f.id, { type: "json" });
    if (e && Date.now() - e.at < WEEK) entries[f.id] = e; else missing.push(f);
  }));
  // Complète au plus 60 films par appel (limite de temps de la fonction) ; le reste au prochain appel
  const batch = missing.slice(0, 60);
  let i = 0, errors = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (i < batch.length) {
      const f = batch[i++];
      try { const e = await tmdbFilm(f); entries[f.id] = e; await store.setJSON(f.id, e); }
      catch { errors++; }
    }
  }));
  const complete = missing.length <= batch.length && errors === 0;
  return Response.json({ enabled: true, complete, films: entries }, {
    headers: { "Cache-Control": "public, max-age=300", "Netlify-CDN-Cache-Control": complete ? "public, durable, max-age=3600, stale-while-revalidate=86400" : "no-store" },
  });
}

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);

  try {
    if (parts[0] === "poster" && req.method === "GET") return await poster(url);
    if (parts[0] === "catalog" && req.method === "GET") return await catalog();

    if (parts[0] === "session") {
      if (parts.length === 1 && req.method === "POST") return await createSession(req);
      const code = (parts[1] ?? "").toUpperCase();
      if (!CODE_RE.test(code)) return err("Code invalide.", 400);
      if (parts.length === 2 && req.method === "GET") return await getSession(code);
      if (parts.length === 4 && parts[2] === "player" && req.method === "PUT") return await upsertPlayer(req, code, parts[3]);
      if (parts.length === 3 && parts[2] === "end" && req.method === "POST") return await endSession(req, code);
      if (parts.length === 3 && parts[2] === "final" && req.method === "POST") return await startFinal(req, code);
    }
    return err("Route inconnue.", 404);
  } catch (e) {
    console.error(e);
    return err("Erreur serveur.", 500);
  }
};

export const config: Config = {
  path: "/api/*",
};
