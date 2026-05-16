/**
 * system-viz-graph — load-once + in-process-cache lib for the system-viz graph.
 *
 * Extracted from scripts/system-viz-query.mjs so a single process can load
 * the ~24 MB graph ONCE and query it many times without re-parsing per call.
 *
 * P1 / U-CACHE-LIB (SYSTEM-VIZ-UPGRADES-MS0): loadGraph() now keeps a
 * module-scope cache keyed on the graph file's mtime + size. A second
 * same-process call with an unchanged file returns the cached object
 * (no 24 MB re-parse). Invalidation is conservative — stat is taken
 * BEFORE the read so a concurrent rewrite can only ever cause a *false
 * miss* (an extra re-parse), never a *false hit* (serving stale bytes).
 *
 * SCOPE — who actually benefits (be honest, per /forge-audit-v2 reviewer):
 * the cache is IN-PROCESS only. PRISM hooks and the system-viz-query.mjs
 * CLI are spawned as fresh `node` processes per invocation — they call
 * loadGraph() exactly once then exit, so they get NO cache benefit (the
 * cold-parse path is unchanged for them). The real beneficiary is any
 * single long-lived process that calls loadGraph() >= 2x: batch/pipeline
 * scripts that issue multiple graph queries in one run, or a future
 * long-lived server importing this lib. Cross-process caching is out of
 * scope (would need a daemon or memory-mapped store).
 *
 * Exports:
 *   loadGraph(opts?)          — parse graph from disk (cached). opts.fresh
 *                               forces a re-parse and does NOT poison the
 *                               shared cache. Zero-arg call is unchanged
 *                               (backward compatible with all callers).
 *   findInGraph(G, q, opts)   — case-insensitive node search.
 *   __test                    — white-box seam for the test suite only.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/lib/ → scripts/ → project root
const ROOT = path.resolve(__dirname, "..", "..");
const GRAPH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");

// TTL belt: even when mtime+size are unchanged, re-read after this window so
// a same-mtime same-size rewrite (rare: regen writing within the same second
// to an identically-sized file) cannot be served stale indefinitely. mtime+size
// is the primary invalidation; this is defense-in-depth, not the main signal.
const DEFAULT_TTL_MS = 60_000;

// Returns the reuse TTL in ms, or 0 to mean "do not cache at all".
// TTL=0 is treated as a full disable (route through bypass) rather than the
// worst-of-both "populate 24 MB but never serve" footgun. Non-numeric or
// negative env → 60s default.
function ttlMs() {
  const raw = process.env.PRISM_VIZ_GRAPH_CACHE_TTL_MS;
  if (raw === undefined || raw === "") return DEFAULT_TTL_MS;
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 0) return DEFAULT_TTL_MS;
  return v; // may be 0 → caller treats as disable
}

// Env knob is read at CALL time (not module load) so tests / callers can
// toggle it per-invocation. PRISM_VIZ_GRAPH_NO_CACHE=1 → always re-parse.
function cacheDisabled() {
  return process.env.PRISM_VIZ_GRAPH_NO_CACHE === "1";
}

/** Module-scope cache: { mtimeMs, size, loadedAt, graph } | null */
let _cache = null;

function descriptiveError(absPath, e, verb) {
  return new Error(
    `Cannot ${verb} graph at ${absPath}.\n  ${e.message}\n  Run: node scripts/generate-system-viz.mjs`
  );
}

/**
 * Read + JSON.parse an arbitrary graph path. No caching. Throws a descriptive
 * Error (read failure vs parse failure are distinguished) on any failure.
 * Exposed via __test for hermetic throw-path coverage.
 */
function readAndParse(absPath) {
  let raw;
  try {
    raw = fs.readFileSync(absPath, "utf8");
  } catch (e) {
    throw descriptiveError(absPath, e, "read");
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw descriptiveError(absPath, e, "parse");
  }
}

/**
 * Load the system-viz graph from disk and return the parsed object.
 *
 * Cached across calls in the same process keyed on the file's mtime + size.
 * Callers should treat the returned object as READ-ONLY — the cached instance
 * is shared across all non-fresh callers in the process. A caller that needs
 * to mutate the graph must pass { fresh: true } to get an isolated parse.
 *
 * @param {object}  [opts]
 * @param {boolean} [opts.fresh=false] - bypass + do not populate the cache.
 * @returns {object} parsed graph
 * @throws {Error} descriptive message if the file cannot be read or parsed.
 */
export function loadGraph({ fresh = false } = {}) {
  // TTL=0 → full disable (no populate, no stat-compare): avoids retaining
  // 24 MB that can never be served. Same effect as PRISM_VIZ_GRAPH_NO_CACHE=1.
  const bypass = fresh || cacheDisabled() || ttlMs() === 0;

  if (!bypass && _cache) {
    let st = null;
    try {
      st = fs.statSync(GRAPH);
    } catch {
      st = null; // file vanished — fall through to readAndParse (canonical throw)
    }
    if (
      st &&
      st.mtimeMs === _cache.mtimeMs &&
      st.size === _cache.size &&
      Date.now() - _cache.loadedAt < ttlMs()
    ) {
      return _cache.graph;
    }
  }

  // stat BEFORE read so the cached (mtime,size) can never be NEWER than the
  // bytes actually parsed → a racing rewrite yields a false miss, not a
  // false hit. If stat fails here, readAndParse() throws the canonical error.
  let st = null;
  try {
    st = fs.statSync(GRAPH);
  } catch {
    st = null;
  }

  const graph = readAndParse(GRAPH);

  if (!bypass && st) {
    _cache = { mtimeMs: st.mtimeMs, size: st.size, loadedAt: Date.now(), graph };
  }
  return graph;
}

/**
 * Search graph nodes for a query string.
 *
 * Matches against: label + id + info + subgroup (case-insensitive).
 * Verbatim from the `find` command in system-viz-query.mjs.
 *
 * @param {object} G      - Parsed graph object (from loadGraph()).
 * @param {string} terms  - Query string (space-separated terms joined if array).
 * @param {object} opts
 * @param {number} opts.limit - Maximum hits to return (default 30).
 * @returns {Array} Matching node objects.
 */
export function findInGraph(G, terms, { limit = 30 } = {}) {
  const q = (Array.isArray(terms) ? terms.join(" ") : terms).toLowerCase();
  return G.nodes
    .filter(n =>
      (n.label + " " + n.id + " " + (n.info ?? "") + " " + (n.subgroup ?? ""))
        .toLowerCase()
        .includes(q)
    )
    .slice(0, limit);
}

/** Test-only white-box seam. NOT part of the public contract. */
export const __test = {
  readAndParse,
  graphPath: () => GRAPH,
  resetCache: () => { _cache = null; },
  peekCache: () => (_cache ? { ..._cache, graph: undefined } : null),
};
