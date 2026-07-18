// scripts/lib/master-index-hit-counter.mjs
//
// Pure-core counter for master-index injector telemetry.
// Mirrors the wiki-recall-counts.json schema/pattern (same shape, same
// firstSeen/lastSeen semantics) so the existing /wiki-morning + digest
// tools can later consume both surfaces uniformly.
//
// Sister to: mcp-server/data/state/wiki-recall-counts.json
// Counter file: mcp-server/data/state/master-index-hit-counts.json
//
// Schema v1.0.0
// {
//   schemaVersion: "1.0.0",
//   totalInjections: <prompts that emitted >=1 hit>,
//   totalHits: <sum of node-hit emissions across all events>,
//   queryCount, nodeCount: cardinality of queries/nodes maps,
//   updatedAtIso: <last write>,
//   queries: { <token>: { token, count, firstSeenIso, lastSeenIso } },
//   nodes:   { <label>: { label, layer, status, count, firstSeenIso, lastSeenIso } },
// }
//
// Design invariants (R12 fail-loud):
//  - applyHitDelta NEVER throws; bad inputs are no-ops (returns input state).
//  - pruneOverflow only trims by lastSeenIso ASC (least-recently-seen first).
//  - All Iso strings are produced by the caller (injectable `now`) — the lib
//    is timer-free / pure / deterministic for testing.

export const SCHEMA_VERSION = "1.0.0";

export const DEFAULT_MAX_QUERIES = 2000;
export const DEFAULT_MAX_NODES = 5000;

/** Returns a fresh, empty counter state. */
export function mkEmptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    totalInjections: 0,
    totalHits: 0,
    queryCount: 0,
    nodeCount: 0,
    updatedAtIso: null,
    queries: {},
    nodes: {},
  };
}

/**
 * applyHitDelta — pure increment of a counter state.
 *
 * @param {object} state    — current state (mkEmptyState() shape). NOT mutated.
 * @param {string[]} queryTokens — tokens from this prompt event (deduped here).
 * @param {Array<{label:string, layer?:string, status?:string}>} hits
 *                          — hits emitted to the model this event.
 * @param {string} nowIso   — caller-supplied ISO timestamp (testable).
 * @returns {object}        — new state object (shallow-cloned maps).
 *
 * Edge cases handled:
 *  - state missing/wrong shape → cloned from mkEmptyState() first.
 *  - queryTokens / hits not arrays → coerced to [].
 *  - duplicate tokens within one event → counted once (matches per-event semantics).
 *  - hit.label missing/empty → that hit is skipped (NEVER throws).
 */
export function applyHitDelta(state, queryTokens, hits, nowIso) {
  const next = cloneOrInit(state);
  const tokens = uniqueNonEmptyStrings(queryTokens);
  const hitArr = Array.isArray(hits) ? hits : [];

  // totalInjections increments ONLY when we have at least one hit to count
  // (matches the hook's emit-then-track guarantee).
  let validHitCount = 0;
  for (const h of hitArr) {
    if (h && typeof h.label === "string" && h.label.length > 0) validHitCount++;
  }
  if (validHitCount === 0 && tokens.length === 0) {
    // Nothing observable this event — no-op.
    return next;
  }
  if (validHitCount > 0) {
    next.totalInjections = (next.totalInjections | 0) + 1;
    next.totalHits = (next.totalHits | 0) + validHitCount;
  }

  for (const t of tokens) {
    const cur = next.queries[t];
    if (cur) {
      cur.count = (cur.count | 0) + 1;
      cur.lastSeenIso = nowIso;
    } else {
      next.queries[t] = {
        token: t,
        count: 1,
        firstSeenIso: nowIso,
        lastSeenIso: nowIso,
      };
    }
  }

  for (const h of hitArr) {
    if (!h || typeof h.label !== "string" || h.label.length === 0) continue;
    const label = h.label;
    const cur = next.nodes[label];
    if (cur) {
      cur.count = (cur.count | 0) + 1;
      cur.lastSeenIso = nowIso;
      // Refresh layer/status if newer hit carries them (graph evolves)
      if (typeof h.layer === "string" && h.layer.length > 0) cur.layer = h.layer;
      if (typeof h.status === "string" && h.status.length > 0) cur.status = h.status;
    } else {
      next.nodes[label] = {
        label,
        layer: typeof h.layer === "string" ? h.layer : null,
        status: typeof h.status === "string" ? h.status : null,
        count: 1,
        firstSeenIso: nowIso,
        lastSeenIso: nowIso,
      };
    }
  }

  next.queryCount = Object.keys(next.queries).length;
  next.nodeCount = Object.keys(next.nodes).length;
  next.updatedAtIso = nowIso;
  return next;
}

/**
 * pruneOverflow — LRU-trim to caps, dropping least-recently-seen entries.
 *
 * @param {object} state
 * @param {number} maxQueries
 * @param {number} maxNodes
 * @returns {object} new state (always cloned).
 */
export function pruneOverflow(state, maxQueries = DEFAULT_MAX_QUERIES, maxNodes = DEFAULT_MAX_NODES) {
  const next = cloneOrInit(state);
  next.queries = trimMapLruByLastSeen(next.queries, Math.max(0, maxQueries | 0));
  next.nodes = trimMapLruByLastSeen(next.nodes, Math.max(0, maxNodes | 0));
  next.queryCount = Object.keys(next.queries).length;
  next.nodeCount = Object.keys(next.nodes).length;
  return next;
}

/**
 * summarizeState — derive a read-only digest (top-K by count) for surfacing.
 * Used by /master-index --hot or build-wiki-recall-digest sibling.
 */
export function summarizeState(state, opts = {}) {
  const safe = cloneOrInit(state);
  const topQueries = opts.topQueries | 0 || 10;
  const topNodes = opts.topNodes | 0 || 10;
  const queries = Object.values(safe.queries)
    .sort(compareCountDescThenLastSeen)
    .slice(0, topQueries)
    .map((e) => ({ token: e.token, count: e.count, lastSeenIso: e.lastSeenIso }));
  const nodes = Object.values(safe.nodes)
    .sort(compareCountDescThenLastSeen)
    .slice(0, topNodes)
    .map((e) => ({ label: e.label, layer: e.layer, status: e.status, count: e.count, lastSeenIso: e.lastSeenIso }));
  return {
    schemaVersion: safe.schemaVersion,
    totalInjections: safe.totalInjections,
    totalHits: safe.totalHits,
    queryCount: safe.queryCount,
    nodeCount: safe.nodeCount,
    updatedAtIso: safe.updatedAtIso,
    topQueries: queries,
    topNodes: nodes,
  };
}

// --------------------------------------------------------------------------
// Internals
// --------------------------------------------------------------------------

function cloneOrInit(state) {
  if (!state || typeof state !== "object") return mkEmptyState();
  return {
    schemaVersion: SCHEMA_VERSION,
    totalInjections: Number.isFinite(state.totalInjections) ? state.totalInjections : 0,
    totalHits: Number.isFinite(state.totalHits) ? state.totalHits : 0,
    queryCount: Number.isFinite(state.queryCount) ? state.queryCount : 0,
    nodeCount: Number.isFinite(state.nodeCount) ? state.nodeCount : 0,
    updatedAtIso: typeof state.updatedAtIso === "string" ? state.updatedAtIso : null,
    queries: state.queries && typeof state.queries === "object" ? { ...state.queries } : {},
    nodes: state.nodes && typeof state.nodes === "object" ? { ...state.nodes } : {},
  };
}

function uniqueNonEmptyStrings(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  for (const x of arr) {
    if (typeof x !== "string") continue;
    const trimmed = x.trim();
    if (trimmed.length === 0) continue;
    seen.add(trimmed);
  }
  return Array.from(seen);
}

function trimMapLruByLastSeen(map, cap) {
  const keys = Object.keys(map);
  if (keys.length <= cap) return map;
  const entries = keys.map((k) => [k, map[k]]);
  // Sort ASC by lastSeenIso (oldest first), missing dates pushed to front for eviction.
  entries.sort((a, b) => {
    const la = a[1] && typeof a[1].lastSeenIso === "string" ? a[1].lastSeenIso : "";
    const lb = b[1] && typeof b[1].lastSeenIso === "string" ? b[1].lastSeenIso : "";
    return la < lb ? -1 : la > lb ? 1 : 0;
  });
  const keep = entries.slice(entries.length - cap);
  const trimmed = {};
  for (const [k, v] of keep) trimmed[k] = v;
  return trimmed;
}

function compareCountDescThenLastSeen(a, b) {
  // P1 (Arm A) — defensive coerce: hostile/legacy state may carry a non-finite
  // `count` (string "5", NaN, undefined). `cb - ca` would produce NaN and the
  // sort becomes nondeterministic, silently corrupting summarizeState output.
  const ca = Number.isFinite(a?.count) ? a.count : 0;
  const cb = Number.isFinite(b?.count) ? b.count : 0;
  if (cb !== ca) return cb - ca;
  const la = typeof a?.lastSeenIso === "string" ? a.lastSeenIso : "";
  const lb = typeof b?.lastSeenIso === "string" ? b.lastSeenIso : "";
  if (la > lb) return -1;
  if (la < lb) return 1;
  return 0;
}
