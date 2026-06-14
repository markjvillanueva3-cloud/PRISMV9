/**
 * galaxy-cag-cache.mjs -- Cache-Augmented Generation (CAG) layer for the galaxy
 * reasoning bridge (AI-SYNERGY-AUDIT-MS0/U-AISYN-CAG, slot:charlie).
 *
 * The RAG upgrade (galaxy-context-retrieval.mjs) made the bridge retrieve per-question
 * context; CAG is the complementary hybrid arm: cache the GROUNDED ANSWER keyed by
 * (galaxy, model, normalized-question) AND fingerprinted by the galaxy's doctrine corpus,
 * so a repeated question returns instantly with ZERO Ollama call -- but a doctrine edit
 * (new CLAUDE/MEMORY/AWARENESS/synthesis content) changes the fingerprint and INVALIDATES
 * the entry, so the cache is never stale (R12: correctness over speed). Build-once: serves
 * every galaxy through the one bridge.
 *
 * The key/fingerprint/freshness/prune logic is PURE (no fs/clock/random -- timestamps are
 * passed in) so it is reference-value testable (R9). Fail-soft load/save I/O is isolated.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const CAG_SCHEMA_VERSION = "1.0.0";
const DEFAULT_MAX_ENTRIES = 500;

function sha(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 16);
}

/** Normalize a question so trivially-different phrasings share a cache slot. PURE. */
export function normalizeQuery(query) {
  return String(query == null ? "" : query)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Cache key = galaxy + model + hashed normalized query. PURE, deterministic. */
export function cagKey(galaxy, model, query) {
  return `${String(galaxy)}::${String(model)}::${sha(normalizeQuery(query))}`;
}

/**
 * Fingerprint a galaxy's gathered doctrine corpus so any content edit invalidates cached
 * answers. docs = [{source, text}]. Order-independent (sorted by source). PURE.
 */
export function corpusFingerprint(docs) {
  const arr = Array.isArray(docs) ? docs.filter((d) => d && typeof d.text === "string") : [];
  if (!arr.length) return sha("empty-corpus");
  const parts = arr
    .map((d) => `${d.source}:${sha(d.text)}`)
    .sort();
  return sha(parts.join("|"));
}

/** An entry is fresh iff its corpusHash matches the CURRENT corpus fingerprint. PURE. */
export function isFresh(entry, fingerprint) {
  return !!entry && typeof entry.corpusHash === "string" && entry.corpusHash === fingerprint;
}

/**
 * Look up a fresh cached answer. Returns the entry or null. PURE.
 * A hit requires both the key AND a matching corpus fingerprint (content-invalidated).
 */
export function getCached(cache, key, fingerprint) {
  const entries = (cache && cache.entries) || {};
  const e = entries[key];
  return isFresh(e, fingerprint) ? e : null;
}

/**
 * Insert/replace an entry and prune to maxEntries (drop oldest by `ts`). PURE -- returns a
 * NEW cache object; the caller persists it. `now` is injected (no clock) for testability.
 */
export function putCached(cache, key, entry, opts = {}) {
  const maxEntries = opts.maxEntries || DEFAULT_MAX_ENTRIES;
  const base = cache && typeof cache === "object" ? cache : {};
  const entries = { ...(base.entries || {}) };
  entries[key] = entry;
  const pruned = pruneEntries(entries, maxEntries);
  return { schemaVersion: CAG_SCHEMA_VERSION, entries: pruned };
}

/** Drop oldest entries (by `ts`) until at most maxEntries remain. PURE. */
export function pruneEntries(entries, maxEntries) {
  const keys = Object.keys(entries || {});
  if (keys.length <= maxEntries) return { ...entries };
  const sorted = keys.sort((a, b) => (entries[a].ts || 0) - (entries[b].ts || 0)); // oldest first
  const keep = sorted.slice(keys.length - maxEntries);
  const out = {};
  for (const k of keep) out[k] = entries[k];
  return out;
}

/** Load the cache file. Fail-soft: any error -> a fresh empty cache (never throws). */
export function loadCache(file) {
  try {
    const txt = fs.readFileSync(file, "utf8");
    const j = JSON.parse(txt);
    if (j && typeof j === "object" && j.entries && typeof j.entries === "object") return j;
  } catch {
    /* absent / corrupt -> empty */
  }
  return { schemaVersion: CAG_SCHEMA_VERSION, entries: {} };
}

/** Persist the cache (atomic-ish: tmp + rename). Fail-soft: never throws. */
export function saveCache(file, cache) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(cache));
    fs.renameSync(tmp, file);
    return true;
  } catch {
    return false;
  }
}
