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
import { readGraphStreaming } from "./graph-io.mjs";
import * as v8 from "node:v8";
import { recordQuery } from "./master-index-query-log.mjs";

const DEFAULT_GRAPH_PATH = "H:/prism/state/shared/system-viz/system-graph.json";
// Architecture-only graph (~27 MB; ~20K L0-L10 nodes from generate-system-viz.mjs;
// excludes the L11/L12 filesystem-coverage layers that regen-viz --full merges in).
// Used as the LATENT-overflow fallback when the merged system-graph exceeds
// PRISM_GRAPH_MAX_BYTES — keeps master-index recall working (architecture-only,
// degraded but not blind) instead of returning null. Knob:
// PRISM_GRAPH_FALLBACK_DISABLE=1 forces the original null-on-overflow behavior.
const DEFAULT_FALLBACK_GRAPH_PATH = "H:/prism/state/shared/system-viz/architecture-graph.json";
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

// Sidecar schema version THIS loader understands. A sidecar carrying any
// other version is rejected and loadGraph silently falls through to the
// legacy path. Must equal build-graph-index.mjs SIDECAR_SCHEMA_VERSION — a
// mismatch is a SAFE degradation (legacy parse / architecture fallback still
// run), never a crash. See U-MASTER-INDEX-SIDECAR.
const SIDECAR_SCHEMA_VERSION = "1.0.0";

/**
 * Sidecar fast-path for loadGraph.
 *
 * The merged system-graph.json is ~372 MB; parsing + tokenizing it inline was
 * MEASURED at ~138 s — fatal in a per-prompt hook. `build-graph-index.mjs`
 * pre-builds a compact inverted-index sidecar offline (`system-graph-index.json`,
 * sibling of the graph). When that sidecar exists, matches this loader's
 * schema version, and was built from the current-or-newer graph, this rebuilds
 * the `{ nodes, inverted }` wrapper from it in seconds with FULL node coverage.
 *
 * The sidecar's `nodes[]` are stored in searchGraphHits' own consumed shape
 * (`knowledge.{wikiEntries,memoryEntries}`) so they are used verbatim — only
 * `inverted` is rebuilt (integer-index postings → `Map<token, Set<id>>`).
 *
 * Returns the wrapper on a fresh-sidecar hit, else null — the caller then
 * continues to the legacy parse / architecture fallback. Null is returned for:
 * knob-disabled (`PRISM_GRAPH_SIDECAR_DISABLE=1`), no sidecar file, a
 * non-system-graph path (architecture fallback, test fixtures), parse failure,
 * schema mismatch, malformed shape, or a STALE sidecar (built from a graph
 * older than the one on disk now). Never throws.
 *
 * @param {string} graphPath
 * @param {import("node:fs").Stats} graphStat  — stat of graphPath (mtime gate)
 * @returns {{ nodes: Array, inverted: Map<string, Set<string>> } | null}
 */
function tryLoadSidecar(graphPath, graphStat) {
  if (process.env.PRISM_GRAPH_SIDECAR_DISABLE === "1") return null;
  // The sidecar is a sibling of the merged system-graph only. For any other
  // graph path (the architecture-graph fallback, or unit-test fixtures with a
  // different basename) the replace is a no-op → no sidecar.
  const sidecarPath = graphPath.replace(/system-graph\.json$/, "system-graph-index.json");
  if (sidecarPath === graphPath) return null;
  if (!existsSync(sidecarPath)) return null;

  // From here the sidecar FILE exists — any rejection means the fleet runs on
  // the slow legacy path (138 s parse / architecture fallback) DESPITE a
  // sidecar being present. R12: warn to stderr (once per loadGraph cache-miss
  // — in practice once per short-lived hook process, mirroring the size-cap
  // fallback's stderr line) so the degradation is visible — an operator should
  // rerun build-graph-index.mjs. The common no-sidecar-file case above is
  // silent (not a degradation worth a per-prompt line).
  const rejected = (reason) => {
    try {
      process.stderr.write(
        `[master-index-search-lib] sidecar present but ${reason} — using legacy path; `
        + "rerun build-graph-index.mjs\n",
      );
    } catch { /* stderr unavailable — non-fatal */ }
    return null;
  };

  // Heap guard (MASTER-INDEX-OOM-FIX, 2026-06-09): the sidecar is ~200 MB and
  // JSON.parse of it needs ~3-4x its size in transient heap. The fleet runs
  // every hook at a 384 MB heap cap (portable-node MCP-FLEET-CAPACITY-MS0 commit
  // reservation guard) -- parsing a 200 MB sidecar in 384 MB OOM-kills the hook
  // on EVERY prompt the moment PRISM_MASTER_INDEX_INJECT=1. If the sidecar
  // exceeds a safe fraction of this process's actual old-space limit, reject it
  // so the caller falls through to the 59 MB architecture-graph (which fits).
  // Tunable: PRISM_SIDECAR_MAX_BYTES (default = 35% of the live heap_size_limit).
  // NOTE v8.getHeapStatistics().heap_size_limit is LARGER than the
  // --max-old-space-size flag (it includes young-gen + overhead): a 384 MB
  // --max-old-space-size reports ~432 MB here, so the default ceiling is
  // ~151 MB -- the ~200 MB sidecar is skipped, but a hook that opts into a
  // larger NODE_OPTIONS heap still gets full sidecar coverage.
  // The override is validated finite-and-positive: a non-numeric / 0 / negative
  // value falls back to the default rather than (a) silently applying the
  // default for "0" the operator meant as "no ceiling" or (b) being truthy at
  // -1 and rejecting EVERY sidecar (Number("-1")||x === -1, then size > -1 is
  // always true). To truly disable the guard, set PRISM_GRAPH_SIDECAR_DISABLE=1
  // (handled above) or a very large PRISM_SIDECAR_MAX_BYTES.
  try {
    const heapLimitBytes = v8.getHeapStatistics().heap_size_limit;
    const rawMax = Number(process.env.PRISM_SIDECAR_MAX_BYTES);
    const sidecarMaxBytes = (Number.isFinite(rawMax) && rawMax > 0)
      ? rawMax
      : Math.floor(heapLimitBytes * 0.35);
    const scStat = statSync(sidecarPath);
    if (scStat.size > sidecarMaxBytes) {
      return rejected(
        `${(scStat.size / 1024 / 1024).toFixed(0)}MB exceeds the safe parse ceiling `
        + `${(sidecarMaxBytes / 1024 / 1024).toFixed(0)}MB for this ${(heapLimitBytes / 1024 / 1024).toFixed(0)}MB heap`,
      );
    }
  } catch { /* v8/stat unavailable -- fall through to the parse (legacy behavior) */ }

  let sc;
  try { sc = JSON.parse(readFileSync(sidecarPath, "utf8")); }
  catch { return rejected("unparseable"); }
  if (!sc || sc.schemaVersion !== SIDECAR_SCHEMA_VERSION) return rejected("schema mismatch");
  if (!Array.isArray(sc.nodes) || !sc.inverted || typeof sc.inverted !== "object") {
    return rejected("malformed");
  }
  // Staleness gate: the sidecar must have been built from a graph at least as
  // new as the one on disk. Older (or a missing/NaN mtime) → ignore it.
  if (!(Number(sc.sourceMtimeMs) >= graphStat.mtimeMs)) return rejected("stale (older than the graph)");

  // Rebuild Map<token, Set<nodeId>> from the integer-index postings. Object
  // keys are read with Object.entries — a token literally named "__proto__"
  // round-trips as a normal own key (build-graph-index uses a null-proto map).
  const nodes = sc.nodes;
  const inverted = new Map();
  for (const [tok, idxs] of Object.entries(sc.inverted)) {
    if (!Array.isArray(idxs)) continue;
    const bucket = new Set();
    for (const i of idxs) {
      const node = nodes[i];
      if (node && typeof node.id === "string") bucket.add(node.id);
    }
    // Match loadGraph's legacy index: only non-empty buckets are recorded.
    if (bucket.size > 0) inverted.set(tok, bucket);
  }
  return { nodes, inverted };
}

/**
 * Load system-graph.json with mtime-based caching. Returns null on any error
 * (missing file, parse failure, malformed shape, file too large). Safe to
 * call repeatedly.
 *
 * Defensive: per-node try/continue + Array.isArray guards on knowledge.*
 * fields. A single malformed node (e.g., regen partial-write, schema drift)
 * does NOT crash the entire load — bad nodes are skipped silently.
 *
 * Size budget: refuses to load files larger than `MAX_GRAPH_BYTES` (default
 * 200 MB). The merged system-graph.json is ~372 MB / 243,687 nodes as of
 * 2026-05-18 — past the cap, so without a sidecar loadGraph degrades to the
 * architecture-graph fallback (below). Tunable via `PRISM_GRAPH_MAX_BYTES`.
 *
 * Note on perf: each subagent spawn is a fresh node subprocess, so the
 * mtime cache only helps WITHIN ONE invocation (e.g., when the spawned-
 * agent lib calls runMasterIndexSearch + runTribalSearch back-to-back).
 * Subsequent SubagentStart events re-pay the cold parse — UNLESS a fresh
 * pre-built sidecar exists: `tryLoadSidecar` (above) reconstructs the index
 * from `system-graph-index.json` in seconds with full node coverage, the
 * deeper fix for the ~138 s full-graph parse (U-MASTER-INDEX-SIDECAR).
 *
 * @param {string} [graphPath]
 * @returns {{ nodes: Array, inverted: Map<string, Set<string>> } | null}
 */
export function loadGraph(graphPath = DEFAULT_GRAPH_PATH) {
  if (!existsSync(graphPath)) return null;
  let stat;
  try { stat = statSync(graphPath); } catch { return null; }

  // Process-lifetime cache — keyed on graphPath + the GRAPH's mtime, so it
  // covers all resolution paths (sidecar / legacy parse / fallback) uniformly:
  // the same graph mtime always yields the same wrapper. The key does NOT
  // observe the sidecar's own mtime — a sidecar regenerated standalone against
  // an UNCHANGED graph is not re-read until the process exits. Acceptable:
  // hook processes are short-lived and regen-viz rewrites graph + sidecar
  // together (a graph change bumps this key and invalidates the entry).
  if (
    _graphCache.path === graphPath
    && _graphCache.mtimeMs === stat.mtimeMs
    && _graphCache.wrapper
  ) {
    return _graphCache.wrapper;
  }

  // Sidecar fast-path — pre-built inverted index, skips the ~138 s full-graph
  // parse with FULL node coverage. Returns null (→ legacy path below) when the
  // sidecar is absent / stale / schema-mismatched / knob-disabled.
  const sidecar = tryLoadSidecar(graphPath, stat);
  if (sidecar) {
    _graphCache = { path: graphPath, mtimeMs: stat.mtimeMs, wrapper: sidecar };
    return sidecar;
  }

  const maxBytes = Number(process.env.PRISM_GRAPH_MAX_BYTES) || (200 * 1024 * 1024);
  if (stat.size > maxBytes) {
    // JULIETT F1 latent-bug fix (2026-05-18): when the merged graph exceeds
    // the byte cap, fall back to the architecture-only graph (degraded but
    // not blind) instead of returning null. R12 fail-loud — write the
    // degradation to stderr so it's not silent. Knob:
    // PRISM_GRAPH_FALLBACK_DISABLE=1 restores the original null-on-overflow.
    // Fallback fires when (a) NOT disabled, (b) the primary is the system-graph
    // (by basename — production AND tmpdir-test friendly), and (c) a sibling
    // architecture-graph.json exists and fits the cap. PRISM_GRAPH_FALLBACK_PATH
    // overrides the sibling lookup for unit tests.
    const baseName = graphPath.replace(/\\/g, "/").split("/").pop() || "";
    const fallbackEligible = process.env.PRISM_GRAPH_FALLBACK_DISABLE !== "1"
      && baseName === "system-graph.json";
    if (fallbackEligible) {
      try {
        const fallbackPath = process.env.PRISM_GRAPH_FALLBACK_PATH
          || graphPath.replace(/system-graph\.json$/, "architecture-graph.json");
        if (fallbackPath !== graphPath && existsSync(fallbackPath)) {
          const fbStat = statSync(fallbackPath);
          if (fbStat.size <= maxBytes) {
            try {
              process.stderr.write(
                `[master-index-search-lib] system-graph ${(stat.size / 1024 / 1024).toFixed(1)}MB > cap ${(maxBytes / 1024 / 1024).toFixed(0)}MB — falling back to architecture-graph (${(fbStat.size / 1024 / 1024).toFixed(1)}MB)\n`,
              );
            } catch { /* stderr unavailable — non-fatal */ }
            return loadGraph(fallbackPath); // recurse once; fallback file has different basename → won't loop
          }
        }
      } catch { /* fall-through to null */ }
    }
    return null;
  }
  let raw;
  try { raw = readGraphStreaming(graphPath); }  // off-heap: JSON.parse(readFileSync utf8) throws at >512MiB -> search would silently fall back to base graph (U-VIZ-READER-CAPSAFE 2026-06-10)
  catch { return null; }
  if (!raw || !Array.isArray(raw.nodes)) return null;

  const nodes = raw.nodes;
  const inverted = new Map();
  for (const n of nodes) {
    if (!n || typeof n.id !== "string") continue;
    try {
      // Defensive: knowledge.* MUST be arrays. Schema drift / partial-write
      // bugs upstream have produced object or null values here — without
      // the Array.isArray guard, .map() throws and the entire 92K-node
      // load aborts (Reviewer C P0 finding).
      const wikiArr = Array.isArray(n.knowledge?.wikiEntries) ? n.knowledge.wikiEntries : [];
      const memArr = Array.isArray(n.knowledge?.memoryEntries) ? n.knowledge.memoryEntries : [];
      const wikiNames = wikiArr.map(entryName).join(" ");
      const memNames = memArr.map(entryName).join(" ");
      const blob = `${n.id} ${n.label ?? ""} ${n.info ?? ""} ${wikiNames} ${memNames}`;
      for (const tok of tokenize(blob, { maxTokens: Number.MAX_SAFE_INTEGER, maxLen: Number.MAX_SAFE_INTEGER })) {
        let bucket = inverted.get(tok);
        if (!bucket) { bucket = new Set(); inverted.set(tok, bucket); }
        bucket.add(n.id);
      }
    } catch {
      // Per-node failure — skip and continue. Total-load semantics: a
      // few skipped nodes is acceptable degradation; aborting the whole
      // load on one bad row is not (Reviewer C P0 finding).
      continue;
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
 * @returns {Array<{id, score, layer, label, status, noteCount, wiki, memory}>}
 *   noteCount = full wiki+memory edge total (always present; structural
 *   brain-coverage count, distinct from the truncated wiki/memory arrays).
 */
// HMEMV02 explainable retrieval (master-index surface): WHY a graph node surfaced --
// which query tokens matched and which scored fields they hit (label/id/info/vault,
// the same fields W_LABEL/W_ID/W_INFO/W_VAULT score). Pure; fail-soft (bad node /
// empty tokens -> empty). Mirrors the memory-recall surface's matchedTokens.
export function explainNodeMatch(node, queryTokens) {
  const out = { matchedTokens: [], fields: [] };
  if (!node || !Array.isArray(queryTokens) || queryTokens.length === 0) return out;
  const idL = (node.id ?? "").toLowerCase();
  const labelL = (node.label ?? "").toLowerCase();
  const infoL = (node.info ?? "").toLowerCase();
  const wikiL = (Array.isArray(node.knowledge?.wikiEntries) ? node.knowledge.wikiEntries : [])
    .map(entryName).join(" ").toLowerCase();
  const memL = (Array.isArray(node.knowledge?.memoryEntries) ? node.knowledge.memoryEntries : [])
    .map(entryName).join(" ").toLowerCase();
  const fieldHit = { label: false, id: false, info: false, vault: false };
  const matched = new Set();
  for (const tok of queryTokens) {
    if (labelL.includes(tok)) { matched.add(tok); fieldHit.label = true; }
    if (idL.includes(tok)) { matched.add(tok); fieldHit.id = true; }
    if (infoL.includes(tok)) { matched.add(tok); fieldHit.info = true; }
    if (wikiL.includes(tok) || memL.includes(tok)) { matched.add(tok); fieldHit.vault = true; }
  }
  out.matchedTokens = [...matched];
  out.fields = Object.keys(fieldHit).filter((k) => fieldHit[k]);
  return out;
}

export function searchGraphHits(graph, queryTokens, opts = {}) {
  if (!graph || queryTokens.length === 0) return [];
  const topK = opts.topK ?? DEFAULT_TOP_K;
  const excludedLayers = opts.excludedLayers ?? DEFAULT_EXCLUDED_LAYERS;
  // Defensive: graph.nodes can carry null / id-less / non-object elements —
  // loadGraph's legacy path keeps them in wrapper.nodes, and a partial-written
  // sidecar could too. Filter before building the id map so a malformed node
  // can never throw here (the lib's contract: search returns [], never throws).
  const nodeById = new Map(
    graph.nodes
      .filter((n) => n && typeof n.id === "string")
      .map((n) => [n.id, n]),
  );
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
      // Array.isArray guard parity with loadGraph — closes the
      // "fragile incidental safety" finding (Reviewer C P5 note).
      // searchGraphHits previously trusted that loadGraph's malformed-
      // node skip meant no bad knowledge fields could reach here; but
      // the malformed nodes ARE preserved in `graph.nodes` (only
      // skipped from `inverted`). If a future caller iterates nodes
      // directly OR adds a token-less candidate path, the unguarded
      // `.map()` would throw. Cheap defense.
      const wikiBlob = (Array.isArray(node.knowledge?.wikiEntries) ? node.knowledge.wikiEntries : [])
        .map(entryName).join(" ").toLowerCase();
      const memBlob = (Array.isArray(node.knowledge?.memoryEntries) ? node.knowledge.memoryEntries : [])
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
        // noteCount = TRUE brain-coverage: the FULL wiki+memory edge totals (NOT the
        // truncated wiki/memory name arrays below, which cap at 3+2). A structural
        // count for context-retention routing — surfaced by find-path consumers as
        // ` (N docs)`. Same ARITHMETIC as the find-cache projectForFind noteCount, but
        // this substrate ALWAYS emits the field (including 0), where the sparse
        // find-cache OMITS it when 0 (sidecar-bloat avoidance). Additive: consumers ignore it.
        noteCount: (Array.isArray(node.knowledge?.wikiEntries) ? node.knowledge.wikiEntries.length : 0)
                 + (Array.isArray(node.knowledge?.memoryEntries) ? node.knowledge.memoryEntries.length : 0),
        wiki: (node.knowledge?.wikiEntries ?? []).map(entryName).filter(Boolean).slice(0, 3),
        memory: (node.knowledge?.memoryEntries ?? []).map(entryName).filter(Boolean).slice(0, 2),
        // HMEMV02 explainable retrieval: WHY this node surfaced (matched tokens +
        // which scored fields they hit + corpus/layer). Additive, like noteCount above.
        explanation: { ...explainNodeMatch(node, queryTokens), corpus: node.layer || "?", score },
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
  // SYSTEM-VIZ-HIGH-ROI G2: best-effort telemetry — fail-soft.
  recordQuery({
    terms: tokens,
    k: opts.topK ?? DEFAULT_TOP_K,
    hitsReturned: hits.length,
    topScore: hits[0]?.score ?? null,
    source: "graph",
  });
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
  // Size budget — tribal-embed-index sits at ~5.8 MB as of 2026-05-15
  // and grows; the same `PRISM_GRAPH_MAX_BYTES` knob caps it.
  const maxBytes = Number(process.env.PRISM_GRAPH_MAX_BYTES) || (200 * 1024 * 1024);
  if (stat.size > maxBytes) return null;
  let raw;
  try { raw = JSON.parse(readFileSync(indexPath, "utf8")); }
  catch { return null; }
  if (!raw || !Array.isArray(raw.entries)) return null;

  // Slim entries — drop embedding arrays we don't need on this path.
  // Per-entry try/catch: a single bad entry doesn't abort the whole load
  // (defensive against schema drift / partial-write — Reviewer C P0 class).
  const entries = [];
  for (let idx = 0; idx < raw.entries.length; idx++) {
    const e = raw.entries[idx];
    if (!e || typeof e !== "object") continue;
    try {
      entries.push({
        idx,
        id: String(e.id || `tribal:${idx}`),
        source: String(e.source || ""),
        domain: String(e.domain || "general"),
        title: String(e.title || ""),
        path: String(e.path || ""),
        text: String(e.text || "").slice(0, 2000),
      });
    } catch { continue; }
  }

  const inverted = new Map();
  for (const e of entries) {
    try {
      const blob = `${e.title} ${e.text} ${e.domain}`;
      for (const tok of tokenize(blob, { maxTokens: Number.MAX_SAFE_INTEGER, maxLen: Number.MAX_SAFE_INTEGER })) {
        let bucket = inverted.get(tok);
        if (!bucket) { bucket = new Set(); inverted.set(tok, bucket); }
        bucket.add(e.idx);
      }
    } catch { continue; }
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
  recordQuery({
    terms: tokens,
    k: opts.topK ?? DEFAULT_TOP_K,
    hitsReturned: hits.length,
    topScore: hits[0]?.score ?? null,
    source: "tribal",
  });
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
