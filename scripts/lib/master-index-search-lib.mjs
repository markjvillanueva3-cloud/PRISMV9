/**
 * master-index-search-lib.mjs
 *
 * Shared keyword search over PRISM's two large knowledge corpora:
 *
 *   1. system-graph.json   — every engine/dispatcher/skill/hook/wiki node
 *      with pre-joined wiki + memory entry names. BM25-lite weighted scoring.
 *
 *   2. tribal-embed-index.json — every tribal-knowledge tip (title + text +
 *      domain). Keyword-only path (skips the Ollama nomic embedding so this
 *      stays sync + network-free). Use tribal-rerank.mjs CLI for the deeper
 *      cosine-rerank path.
 *
 * Why exists: master-index-precheck-inject.mjs (UserPromptSubmit) and
 * spawned-agent-context-lib.mjs (SubagentStart) both want the same search;
 * duplicating the BM25 in two files would drift. This lib is the single
 * implementation; both callers import `runMasterIndexSearch` / `runTribalSearch`.
 *
 * Imports MUST be I/O-free. Network calls forbidden. Failures return
 * empty hit lists, never throw.
 *
 * Process-lifetime caches: graph + tribal index keyed on mtime. Re-parses
 * automatically when the on-disk file changes. Concurrent callers in the
 * same process share the cache.
 *
 * @module master-index-search-lib
 */

import { readFileSync, statSync, existsSync } from "node:fs";

const DEFAULT_GRAPH_PATH = "H:/prism/state/shared/system-viz/system-graph.json";
const DEFAULT_TRIBAL_PATH = "H:/prism/state/shared/tribal-embed-index.json";
const DEFAULT_TOP_K = 5;
const DEFAULT_MAX_PROMPT_LEN = 4000;
const DEFAULT_MAX_QUERY_TOKENS = 8;
const MIN_TOKEN_LEN = 3;

// Match master-index-precheck-inject.mjs' STOPWORDS verbatim — keeps
// search behavior identical across the two callers.
export const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "have", "in", "is", "it", "its", "of", "on", "or", "the",
  "to", "was", "were", "with", "this", "that", "these", "those",
  "you", "your", "what", "where", "when", "how", "why", "which",
  "engine", "engines", "feature", "features", "system", "systems",
  "node", "label", "info", "wiki", "memory", "prism",
  "please", "would", "could", "should", "tell", "show", "find",
]);

// Master-index BM25-lite weights (matched to the in-hook constants
// 2026-05-15; do NOT diverge without updating both consumers' tests).
const W_LABEL = 3.0;
const W_ID = 2.0;
const W_INFO = 1.5;
const W_VAULT = 1.0;

// L11 = filesystem leaves; L9 = fs root. Both flood any keyword that appears
// in a filename — exclude to keep the digest semantically dense.
export const DEFAULT_EXCLUDED_LAYERS = new Set(["L9", "L11"]);

// -- process-lifetime cache (shared across callers in same process) -------

// Cache stores the SAME wrapper object returned to callers (reference-stable
// for repeated calls within one mtime window) plus the path+mtime keys.
// Allocations only happen on initial load / mtime invalidation.
let _graphCache = { path: "", mtimeMs: 0, wrapper: null };
let _tribalCache = { path: "", mtimeMs: 0, wrapper: null };

// -- helpers --------------------------------------------------------------

/**
 * Tokenize free text into a deduped, stopword-filtered list of lowercased
 * tokens. Pure function, no caching, no I/O.
 *
 * @param {string} text
 * @param {object} [opts]
 * @param {number} [opts.maxLen=4000]      — trim text past this length
 * @param {number} [opts.maxTokens=8]      — cap returned tokens
 * @returns {string[]}
 */
export function tokenize(text, opts = {}) {
  if (!text || typeof text !== "string") return [];
  const maxLen = opts.maxLen ?? DEFAULT_MAX_PROMPT_LEN;
  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_QUERY_TOKENS;
  const trimmed = text.length > maxLen
    ? text.slice(0, maxLen).replace(/\S+$/u, "")
    : text;
  const cleaned = trimmed.toLowerCase().replace(/[^\p{L}\p{N}_\s]/gu, " ");
  const seen = new Set();
  const out = [];
  for (const tok of cleaned.split(/\s+/)) {
    if (tok.length < MIN_TOKEN_LEN) continue;
    if (STOPWORDS.has(tok)) continue;
    if (seen.has(tok)) continue;
    seen.add(tok);
    out.push(tok);
    if (out.length >= maxTokens) break;
  }
  return out;
}

function entryName(entry) {
  try {
    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object") {
      if (typeof entry.name === "string") return entry.name;
      if (typeof entry.path === "string") return entry.path;
    }
  } catch { /* fall through */ }
  return "";
}

// -- system-graph load + search -------------------------------------------

/**
 * Load system-graph.json with mtime-based caching. Returns null on any error
 * (missing file, parse failure, malformed shape). Safe to call repeatedly.
 *
 * @param {string} [graphPath]
 * @returns {{ nodes: Array, inverted: Map<string, Set<string>> } | null}
 */
export function loadGraph(graphPath = DEFAULT_GRAPH_PATH) {
  if (!existsSync(graphPath)) return null;
  let stat;
  try { stat = statSync(graphPath); } catch { return null; }
  if (
    _graphCache.path === graphPath
    && _graphCache.mtimeMs === stat.mtimeMs
    && _graphCache.wrapper
  ) {
    return _graphCache.wrapper;
  }
  let raw;
  try { raw = JSON.parse(readFileSync(graphPath, "utf8")); }
  catch { return null; }
  if (!raw || !Array.isArray(raw.nodes)) return null;

  const nodes = raw.nodes;
  const inverted = new Map();
  for (const n of nodes) {
    if (!n || typeof n.id !== "string") continue;
    const wikiNames = (n.knowledge?.wikiEntries ?? []).map(entryName).join(" ");
    const memNames = (n.knowledge?.memoryEntries ?? []).map(entryName).join(" ");
    const blob = `${n.id} ${n.label ?? ""} ${n.info ?? ""} ${wikiNames} ${memNames}`;
    for (const tok of tokenize(blob, { maxTokens: Number.MAX_SAFE_INTEGER, maxLen: Number.MAX_SAFE_INTEGER })) {
      let bucket = inverted.get(tok);
      if (!bucket) { bucket = new Set(); inverted.set(tok, bucket); }
      bucket.add(n.id);
    }
  }
  const wrapper = { nodes, inverted };
  _graphCache = { path: graphPath, mtimeMs: stat.mtimeMs, wrapper };
  return wrapper;
}

/**
 * Search loaded graph for top-K nodes matching query tokens. BM25-lite:
 * partial-match against id/label/info/wiki/memory blobs with weighted
 * scoring + layer-blacklist filter + label dedup.
 *
 * @param {{nodes: Array, inverted: Map}} graph
 * @param {string[]} queryTokens
 * @param {object} [opts]
 * @param {number} [opts.topK=5]
 * @param {Set<string>} [opts.excludedLayers=DEFAULT_EXCLUDED_LAYERS]
 * @returns {Array<{id, score, layer, label, status, wiki, memory}>}
 */
export function searchGraphHits(graph, queryTokens, opts = {}) {
  if (!graph || queryTokens.length === 0) return [];
  const topK = opts.topK ?? DEFAULT_TOP_K;
  const excludedLayers = opts.excludedLayers ?? DEFAULT_EXCLUDED_LAYERS;
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const candidates = new Map();

  for (const tok of queryTokens) {
    const bucket = graph.inverted.get(tok);
    if (!bucket) continue;
    for (const nodeId of bucket) {
      const node = nodeById.get(nodeId);
      if (!node) continue;
      const idLower = node.id.toLowerCase();
      const labelLower = (node.label ?? "").toLowerCase();
      const infoLower = (node.info ?? "").toLowerCase();
      const wikiBlob = (node.knowledge?.wikiEntries ?? [])
        .map(entryName).join(" ").toLowerCase();
      const memBlob = (node.knowledge?.memoryEntries ?? [])
        .map(entryName).join(" ").toLowerCase();
      let s = 0;
      if (labelLower.includes(tok)) s += W_LABEL;
      if (idLower.includes(tok)) s += W_ID;
      if (infoLower.includes(tok)) s += W_INFO;
      if (wikiBlob.includes(tok) || memBlob.includes(tok)) s += W_VAULT;
      if (s > 0) candidates.set(nodeId, (candidates.get(nodeId) ?? 0) + s);
    }
  }

  const ranked = [...candidates.entries()]
    .map(([id, score]) => {
      const node = nodeById.get(id);
      return {
        id,
        score,
        layer: node.layer || "?",
        label: (node.label || id).split("\n")[0].slice(0, 80),
        status: node.status || "?",
        wiki: (node.knowledge?.wikiEntries ?? []).map(entryName).filter(Boolean).slice(0, 3),
        memory: (node.knowledge?.memoryEntries ?? []).map(entryName).filter(Boolean).slice(0, 2),
      };
    })
    .filter((h) => !excludedLayers.has(h.layer))
    .sort((a, b) => b.score - a.score);

  // Dedup by label — filesystem leaves often share filenames across dirs.
  const seenLabels = new Set();
  const deduped = [];
  for (const h of ranked) {
    const key = h.label.toLowerCase();
    if (seenLabels.has(key)) continue;
    seenLabels.add(key);
    deduped.push(h);
    if (deduped.length >= topK) break;
  }
  return deduped;
}

/**
 * Convenience wrapper: tokenize + load + search. Returns both the tokens
 * (so the caller can render "query tokens: ...") and hits.
 *
 * @param {string} query
 * @param {object} [opts]   — { graphPath, topK, excludedLayers, maxTokens, maxLen }
 * @returns {{ tokens: string[], hits: Array }}
 */
export function runMasterIndexSearch(query, opts = {}) {
  const tokens = tokenize(query, opts);
  if (tokens.length < 2) return { tokens, hits: [] };
  const graph = loadGraph(opts.graphPath);
  if (!graph) return { tokens, hits: [] };
  const hits = searchGraphHits(graph, tokens, opts);
  return { tokens, hits };
}

// -- tribal-embed-index load + search (keyword-only path) -----------------

/**
 * Load tribal-embed-index.json with mtime-based caching. Strips the
 * `embedding` arrays during the index build (we only need text + title +
 * domain for keyword search; embeddings are the bulk of the file but
 * irrelevant to this codepath). Returns null on any error.
 *
 * @param {string} [indexPath]
 * @returns {{ entries: Array, inverted: Map<string, Set<number>> } | null}
 */
export function loadTribalIndex(indexPath = DEFAULT_TRIBAL_PATH) {
  if (!existsSync(indexPath)) return null;
  let stat;
  try { stat = statSync(indexPath); } catch { return null; }
  if (
    _tribalCache.path === indexPath
    && _tribalCache.mtimeMs === stat.mtimeMs
    && _tribalCache.wrapper
  ) {
    return _tribalCache.wrapper;
  }
  let raw;
  try { raw = JSON.parse(readFileSync(indexPath, "utf8")); }
  catch { return null; }
  if (!raw || !Array.isArray(raw.entries)) return null;

  // Slim entries — drop embedding arrays we don't need on this path.
  const entries = raw.entries.map((e, idx) => ({
    idx,
    id: e.id || `tribal:${idx}`,
    source: e.source || "",
    domain: e.domain || "general",
    title: e.title || "",
    path: e.path || "",
    text: (e.text || "").slice(0, 2000),
  }));

  const inverted = new Map();
  for (const e of entries) {
    const blob = `${e.title} ${e.text} ${e.domain}`;
    for (const tok of tokenize(blob, { maxTokens: Number.MAX_SAFE_INTEGER, maxLen: Number.MAX_SAFE_INTEGER })) {
      let bucket = inverted.get(tok);
      if (!bucket) { bucket = new Set(); inverted.set(tok, bucket); }
      bucket.add(e.idx);
    }
  }

  const wrapper = { entries, inverted };
  _tribalCache = { path: indexPath, mtimeMs: stat.mtimeMs, wrapper };
  return wrapper;
}

const W_TRIBAL_TITLE = 3.0;
const W_TRIBAL_TEXT = 1.5;
const W_TRIBAL_DOMAIN_HIT = 0.5;

/**
 * Search loaded tribal index for top-K hits matching query tokens. Weighted:
 * title matches strongest, then text, then domain-name token match. Optional
 * `prefDomain` doubles the score for in-domain entries (matches
 * tribal-rerank.mjs IN_DOMAIN_WEIGHT=2.0 convention).
 *
 * @param {{entries: Array, inverted: Map}} index
 * @param {string[]} queryTokens
 * @param {object} [opts]
 * @param {number} [opts.topK=5]
 * @param {string} [opts.prefDomain]    — e.g. "mill" | "lathe" | "wedm" | "cad" | "cam"
 * @returns {Array<{id, source, domain, title, path, score}>}
 */
export function searchTribalHits(index, queryTokens, opts = {}) {
  if (!index || queryTokens.length === 0) return [];
  const topK = opts.topK ?? DEFAULT_TOP_K;
  const prefDomain = opts.prefDomain ? String(opts.prefDomain).toLowerCase() : null;
  const candidates = new Map();

  for (const tok of queryTokens) {
    const bucket = index.inverted.get(tok);
    if (!bucket) continue;
    for (const idx of bucket) {
      const e = index.entries[idx];
      if (!e) continue;
      const titleLower = e.title.toLowerCase();
      const textLower = e.text.toLowerCase();
      const domainLower = e.domain.toLowerCase();
      let s = 0;
      if (titleLower.includes(tok)) s += W_TRIBAL_TITLE;
      if (textLower.includes(tok)) s += W_TRIBAL_TEXT;
      if (domainLower === tok) s += W_TRIBAL_DOMAIN_HIT;
      if (s > 0) candidates.set(idx, (candidates.get(idx) ?? 0) + s);
    }
  }

  const ranked = [...candidates.entries()]
    .map(([idx, score]) => {
      const e = index.entries[idx];
      const domainBoost = prefDomain && e.domain.toLowerCase() === prefDomain ? 2.0 : 1.0;
      return {
        id: e.id,
        source: e.source,
        domain: e.domain,
        title: (e.title || "").slice(0, 100),
        path: e.path,
        score: score * domainBoost,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return ranked;
}

/**
 * Convenience wrapper for tribal keyword search.
 *
 * @param {string} query
 * @param {object} [opts]   — { indexPath, topK, prefDomain, maxTokens, maxLen }
 * @returns {{ tokens: string[], hits: Array }}
 */
export function runTribalSearch(query, opts = {}) {
  const tokens = tokenize(query, opts);
  if (tokens.length < 2) return { tokens, hits: [] };
  const index = loadTribalIndex(opts.indexPath);
  if (!index) return { tokens, hits: [] };
  const hits = searchTribalHits(index, tokens, opts);
  return { tokens, hits };
}

// -- test helpers (used only by tests; safe to ignore in prod) ------------

/**
 * Drop both caches. Used by tests to force a fresh load after stub data.
 * Not exported from the public API surface — call via `import * as` if
 * you need it.
 */
export function _resetCachesForTests() {
  _graphCache = { path: "", mtimeMs: 0, wrapper: null };
  _tribalCache = { path: "", mtimeMs: 0, wrapper: null };
}
