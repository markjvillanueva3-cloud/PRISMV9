// scripts/lib/memo-embed-lib.mjs
// -------------------------------
// CONTEXT-RETENTION/U-MEMO-SEMANTIC-RECALL (F3, slot:alpha, 2026-06-08)
//
// Shared, dependency-free helpers for semantic memory recall: the offline
// cache builder (build-memo-embedding-cache.mjs) and the hot-path recall hook
// (memory-relevance-inject.mjs) BOTH import from here, so the salient-slice
// extraction, embedding call, cache format, and cosine are single-sourced and
// can never drift between the two sides (R8).
//
// Pure where possible; the only I/O is embedText (Ollama HTTP) and
// loadEmbedCache (read). Both fail-soft (return null) so the hot-path caller
// degrades to lexical-only recall on any failure.

import { readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";

export const MEMORY_DIR =
  process.env.PRISM_MEMORY_DIR ||
  path.join(os.homedir(), ".claude", "projects", "H--prism", "memory");

export const EMBED_CACHE =
  process.env.PRISM_MEMO_EMBED_CACHE ||
  path.join(process.env.PRISM_ROOT || "H:/prism", "state", "shared", "memo-embedding-cache.jsonl");

export const EMBED_MODEL = process.env.PRISM_EMBED_MODEL || "nomic-embed-text";
export const EMBED_URL = process.env.PRISM_OLLAMA_URL || "http://127.0.0.1:11434";
export const EMBED_TIMEOUT_MS = Number(process.env.PRISM_EMBED_TIMEOUT_MS) || 1500;

const MAX_SALIENT_CHARS = 800;

/**
 * Pure: the salient slice of a memo — frontmatter `description:` + the first
 * markdown heading + the opening body paragraph, capped. This is the same
 * meaning-bearing text the recall hook surfaces, so query↔memo cosine compares
 * like with like. Returns "" when nothing usable.
 */
export function salientSlice(body) {
  if (typeof body !== "string" || !body) return "";
  let rest = body;
  let description = "";
  if (rest.startsWith("---\n")) {
    const close = rest.indexOf("\n---", 4);
    if (close !== -1) {
      const fm = rest.slice(4, close);
      const m = fm.match(/^description:\s*(.+)$/m);
      if (m) description = m[1].replace(/^["']|["']$/g, "").trim();
      rest = rest.slice(close + 4).replace(/^\n+/, "");
    }
  }
  let title = "";
  for (const ln of rest.split("\n")) {
    if (ln.startsWith("# ")) { title = ln.slice(2).trim(); break; }
  }
  const paras = rest
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith("# "));
  const opening = paras[0] || "";
  const joined = [description, title, opening].filter(Boolean).join(". ").replace(/\s+/g, " ").trim();
  return joined.slice(0, MAX_SALIENT_CHARS);
}

/**
 * Embed one text via Ollama /api/embeddings with a hard timeout. Returns the
 * vector (number[]) or null on any failure (timeout, non-200, parse, offline).
 * Never throws — the caller treats null as "no semantic signal".
 */
export async function embedText(text, opts = {}) {
  const url = opts.url || EMBED_URL;
  const model = opts.model || EMBED_MODEL;
  const timeoutMs = opts.timeoutMs || EMBED_TIMEOUT_MS;
  if (typeof text !== "string" || !text.trim()) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${url}/api/embeddings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt: text }),
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j?.embedding) && j.embedding.length ? j.embedding : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * HIGHVALUE-DISCOVERY #7 (2026-06-08, slot:alpha): batch-embed an ARRAY of texts
 * in ONE call via Ollama's `/api/embed` (array `input`) instead of N serial
 * `/api/embeddings` round-trips — ~N× fewer HTTP round-trips, big win on the
 * Blackwell where qwen/nomic stay resident. Returns number[][] aligned to the
 * input order (one vector per text), or null on ANY failure (timeout, non-200,
 * count mismatch, parse, offline) — the caller falls back to per-item embedText.
 * Never throws. Empty/whitespace-only entries get a null slot in the result.
 */
export async function embedTextBatch(texts, opts = {}) {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  const url = opts.url || EMBED_URL;
  const model = opts.model || EMBED_MODEL;
  // batch calls do more work per request → allow a longer ceiling than single
  const timeoutMs = opts.timeoutMs || Math.max(EMBED_TIMEOUT_MS, 30_000);
  // Only embed non-empty texts; remember their positions to re-expand to nulls.
  const idx = [];
  const input = [];
  for (let i = 0; i < texts.length; i++) {
    if (typeof texts[i] === "string" && texts[i].trim()) { idx.push(i); input.push(texts[i]); }
  }
  if (input.length === 0) return texts.map(() => null);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${url}/api/embed`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, input }),
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const j = await r.json();
    const embs = j?.embeddings;
    if (!Array.isArray(embs) || embs.length !== input.length) return null; // count mismatch → caller falls back
    const out = texts.map(() => null);
    for (let k = 0; k < idx.length; k++) {
      const v = embs[k];
      out[idx[k]] = Array.isArray(v) && v.length ? v : null;
    }
    return out;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Load the JSONL embedding cache → Map<name, {vec:number[], hash:string}>.
 * One JSON object per line: {name, vec, hash}. Malformed lines are skipped.
 * Returns null when the file is absent/unreadable (caller → lexical-only).
 */
export function loadEmbedCache(cachePath = EMBED_CACHE) {
  let raw;
  try { raw = readFileSync(cachePath, "utf8"); } catch { return null; }
  const map = new Map();
  for (const ln of raw.split("\n")) {
    const s = ln.trim();
    if (!s) continue;
    try {
      const o = JSON.parse(s);
      if (o && typeof o.name === "string" && Array.isArray(o.vec) && o.vec.length) {
        // CONTEXT-EXPANSION/U-OBS-GALAXY-BRAIN-RECALL: an entry MAY carry an
        // explicit `path` (galaxy MEMORY.md brains live OUTSIDE MEMORY_DIR, under
        // mcp-server/src/engines/<galaxy>/). Flat memos omit it → the consumer
        // falls back to MEMORY_DIR/name. Backward-compatible: old caches have no
        // `path` field, so existing entries are unchanged.
        const entry = { vec: o.vec, hash: typeof o.hash === "string" ? o.hash : "" };
        if (typeof o.path === "string" && o.path) entry.path = o.path;
        map.set(o.name, entry);
      }
    } catch { /* skip malformed line */ }
  }
  return map;
}

/**
 * Pure: cosine similarity of two equal-length numeric vectors. Returns 0 on
 * any mismatch / zero-norm (safe default — never NaN).
 */
export function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    dot += x * y; na += x * x; nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Pure: top-K {name, score} from a query vector against a loaded cache Map,
 * filtered by a minimum cosine. Excludes any name in `excludeNames`.
 */
export function semanticTopK(qvec, cacheMap, { k = 5, minScore = 0.5, excludeNames, nameFilter } = {}) {
  if (!Array.isArray(qvec) || !qvec.length || !cacheMap || cacheMap.size === 0) return [];
  const exclude = excludeNames instanceof Set ? excludeNames : new Set(excludeNames || []);
  const filterFn = typeof nameFilter === "function" ? nameFilter : null;
  const sims = [];
  for (const [name, entry] of cacheMap) {
    if (exclude.has(name)) continue;
    // U-OBS-GALAXY-BRAIN-RECALL: optional name predicate so a caller can run a
    // SEPARATE tier (e.g. galaxy brains at a lower floor) over the same cache
    // without a second Map. No filter → all entries (prior behavior).
    if (filterFn && !filterFn(name)) continue;
    const s = cosine(qvec, entry?.vec);
    if (s >= minScore) {
      // U-OBS-GALAXY-BRAIN-RECALL: carry the entry's explicit `path` through to
      // the consumer when present (galaxy brains); flat memos have none and the
      // consumer falls back to MEMORY_DIR/name.
      const hit = { name, score: s };
      if (entry?.path) hit.path = entry.path;
      sims.push(hit);
    }
  }
  sims.sort((a, b) => b.score - a.score);
  return sims.slice(0, k);
}
