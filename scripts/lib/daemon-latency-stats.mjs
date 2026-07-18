// scripts/lib/daemon-latency-stats.mjs
// SUBSTRATE-UTIL Gap 1 follow-up (2026-06-29 slot:sierra): make the master-index daemon's
// per-search latency MEASURABLE so the DEFERRED concurrency decision (a worker-thread refactor
// of the single-event-loop daemon) is DATA-DRIVEN -- the same measure-first discipline applied to
// Gap 7 -- instead of theoretical. The daemon serves search synchronously, so a single search
// >= the client's ~400ms timeout (or two serialized) silently degrades clients to the in-process
// fallback. Exposing maxSearchMs + slowSearchCount in /health reveals whether that ceiling is
// ACTUALLY biting in production, which is the prerequisite for deciding the refactor is worth it.
//
// Pure -- NO side effects, NO imports -- so it is unit-testable WITHOUT starting the daemon's
// HTTP server (the daemon module calls server.listen() at load, so it cannot be imported in a test).

// A search at or above this many ms risks the ~400ms master-index-precheck client timeout (Gap 1).
export const DEFAULT_SLOW_MS = 350;

/** Fresh, zeroed latency stats. */
export function emptyLatencyStats() {
  return { count: 0, lastMs: null, maxMs: 0, slowCount: 0 };
}

/**
 * Fold one search-latency sample into the running stats. PURE -- returns a NEW object, never
 * mutates the input. A non-finite or negative sample is ignored (fail-soft: prior counters kept,
 * never NaN'd).
 * @param {{count:number,lastMs:number|null,maxMs:number,slowCount:number}} stats
 * @param {number} ms - the search's wall-clock duration in ms
 * @param {number} [slowMs=DEFAULT_SLOW_MS] - threshold (inclusive) above which a search is "slow"
 * @returns {{count:number,lastMs:number|null,maxMs:number,slowCount:number}}
 */
export function recordSearchLatency(stats, ms, slowMs = DEFAULT_SLOW_MS) {
  const s = (stats && typeof stats === "object") ? stats : emptyLatencyStats();
  const prior = {
    count: Number(s.count) || 0,
    lastMs: (typeof s.lastMs === "number") ? s.lastMs : null,
    maxMs: Number(s.maxMs) || 0,
    slowCount: Number(s.slowCount) || 0,
  };
  const v = Number(ms);
  if (!Number.isFinite(v) || v < 0) return prior; // ignore a bad sample, keep prior stats
  const thr = Number.isFinite(slowMs) ? slowMs : DEFAULT_SLOW_MS;
  return {
    count: prior.count + 1,
    lastMs: v,
    maxMs: Math.max(prior.maxMs, v),
    slowCount: prior.slowCount + (v >= thr ? 1 : 0),
  };
}
