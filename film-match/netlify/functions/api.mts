import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";

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
      ended: false,
    };
    await store.setJSON(`${code}/meta`, meta);
    // Nettoie d'éventuels joueurs d'une ancienne session expirée portant le même code
    if (existing) {
      const { blobs } = await store.list({ prefix: `${code}/p/` });
      await Promise.all(blobs.map((b) => store.delete(b.key)));
    }
    await store.setJSON(`${code}/p/${playerId}`, {
      name: cleanName(body.name), votes: {}, done: false, updatedAt: Date.now(),
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
  const body = await readBody(req);
  const deckSet = new Set<string>(meta.deck);
  const votes: Record<string, number> = {};
  if (body.votes && typeof body.votes === "object") {
    for (const [k, v] of Object.entries(body.votes)) {
      if (deckSet.has(k) && (v === 1 || v === 2 || v === -1)) votes[k] = v as number;
    }
  }
  const player = {
    name: cleanName(body.name),
    votes,
    done: Boolean(body.done),
    updatedAt: Date.now(),
  };
  await sessions().setJSON(`${code}/p/${playerId}`, player);
  return json({ ok: true });
}

async function endSession(req: Request, code: string) {
  const meta = await getMeta(code);
  if (!meta) return err("Session introuvable ou expirée.", 404);
  const body = await readBody(req);
  if (body.playerId !== meta.hostId) return err("Seul l'hôte peut terminer la session.", 403);
  meta.ended = true;
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
  return new Response(null, {
    status: 302,
    headers: {
      Location: src,
      "Cache-Control": "public, max-age=86400",
      "Netlify-CDN-Cache-Control": "public, durable, max-age=604800",
    },
  });
}

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);

  try {
    if (parts[0] === "poster" && req.method === "GET") return await poster(url);

    if (parts[0] === "session") {
      if (parts.length === 1 && req.method === "POST") return await createSession(req);
      const code = (parts[1] ?? "").toUpperCase();
      if (!CODE_RE.test(code)) return err("Code invalide.", 400);
      if (parts.length === 2 && req.method === "GET") return await getSession(code);
      if (parts.length === 4 && parts[2] === "player" && req.method === "PUT") return await upsertPlayer(req, code, parts[3]);
      if (parts.length === 3 && parts[2] === "end" && req.method === "POST") return await endSession(req, code);
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
