// SYSTEM-VIZ-HIGH-ROI-AUDIT-2026-05-20 G2: master-index query telemetry.
// Pure record + aggregate. Append fail-soft, never throws to callers.

import { appendFileSync, existsSync, readFileSync, renameSync, statSync } from "node:fs";

const DEFAULT_LOG_PATH = "H:/prism/state/shared/master-index-query-log.jsonl";
const DEFAULT_MAX_BYTES = 8 * 1024 * 1024; // 8 MB → rotate to .1
const SCHEMA_VERSION = "1.0.0";

/**
 * Build a single JSONL record for one query. Pure function, no I/O.
 *
 * @param {object} q
 * @param {string[]} q.terms        — tokenized query terms (after tokenize())
 * @param {number}   q.k            — requested topK
 * @param {number}   q.hitsReturned — actual hits returned (after dedup + topK clamp)
 * @param {number|null} q.topScore  — score of #1 hit (null if no hits)
 * @param {string}   q.source       — "graph" | "tribal"
 * @param {string}   [q.ts]         — ISO timestamp; defaults to now
 * @returns {string}                — single-line JSON + "\n"
 */
export function buildQueryRecord(q) {
  if (!q || typeof q !== "object") throw new Error("buildQueryRecord: q required");
  if (!Array.isArray(q.terms)) throw new Error("buildQueryRecord: terms[] required");
  if (typeof q.source !== "string" || !q.source) throw new Error("buildQueryRecord: source required");
  const rec = {
    ts: typeof q.ts === "string" ? q.ts : new Date().toISOString(),
    terms: q.terms.slice(0, 16),
    k: Number.isFinite(q.k) ? q.k : 0,
    hitsReturned: Number.isFinite(q.hitsReturned) ? q.hitsReturned : 0,
    topScore: q.topScore == null || !Number.isFinite(q.topScore) ? null : Number(q.topScore),
    source: q.source,
    v: SCHEMA_VERSION,
  };
  return JSON.stringify(rec) + "\n";
}

/**
 * Append one query record to the JSONL log. Best-effort: any I/O failure is
 * swallowed silently (returns false). NEVER throws — telemetry must never
 * break a search hot path.
 *
 * Rotation: when the log exceeds maxBytes, rename to `.1` and start fresh.
 * One rotation depth; older history is dropped.
 *
 * @param {object} q                — see buildQueryRecord
 * @param {object} [opts]
 * @param {string} [opts.logPath]
 * @param {number} [opts.maxBytes]
 * @returns {boolean}               — true on append, false on any failure
 */
export function recordQuery(q, opts = {}) {
  if (process.env.PRISM_MASTER_INDEX_QUERY_LOG_DISABLE === "1") return false;
  const logPath = opts.logPath || DEFAULT_LOG_PATH;
  const maxBytes = Number.isFinite(opts.maxBytes) ? opts.maxBytes : DEFAULT_MAX_BYTES;
  let line;
  try { line = buildQueryRecord(q); }
  catch { return false; }
  try {
    if (existsSync(logPath)) {
      try {
        const st = statSync(logPath);
        if (st.size > maxBytes) {
          try { renameSync(logPath, logPath + ".1"); }
          catch { /* rotation best-effort */ }
        }
      } catch { /* stat failure → just append */ }
    }
    appendFileSync(logPath, line, "utf8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Aggregate a list of JSONL lines into stats. Pure function, no I/O.
 *
 * @param {string[]} lines
 * @param {object} [opts]
 * @param {number} [opts.topQueriedN=50]
 * @param {number} [opts.topZeroHitN=50]
 * @param {number} [opts.topLowScoreN=50]
 * @param {number} [opts.lowScoreThreshold=5] — top-score below this counts as "low"
 * @returns {{totalQueries, validQueries, parseErrors, sourceCounts, topQueried, topZeroHit, topLowScore, oldestTs, newestTs}}
 */
export function aggregateQueryLog(lines, opts = {}) {
  const topQueriedN = opts.topQueriedN ?? 50;
  const topZeroHitN = opts.topZeroHitN ?? 50;
  const topLowScoreN = opts.topLowScoreN ?? 50;
  const lowScoreThreshold = opts.lowScoreThreshold ?? 5;

  const termCounts = new Map();
  const zeroHitCounts = new Map();
  const lowScoreCounts = new Map();
  const sourceCounts = Object.create(null);
  let validQueries = 0;
  let parseErrors = 0;
  let oldestTs = null;
  let newestTs = null;

  for (const line of lines) {
    if (!line || typeof line !== "string") continue;
    const trimmed = line.trim();
    if (!trimmed) continue;
    let rec;
    try { rec = JSON.parse(trimmed); }
    catch { parseErrors++; continue; }
    if (!rec || !Array.isArray(rec.terms)) { parseErrors++; continue; }

    validQueries++;
    const src = typeof rec.source === "string" ? rec.source : "unknown";
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;

    const ts = typeof rec.ts === "string" ? rec.ts : null;
    if (ts) {
      if (oldestTs === null || ts < oldestTs) oldestTs = ts;
      if (newestTs === null || ts > newestTs) newestTs = ts;
    }

    const queryKey = rec.terms.slice().sort().join(" ");
    if (queryKey) termCounts.set(queryKey, (termCounts.get(queryKey) || 0) + 1);

    if (rec.hitsReturned === 0) {
      if (queryKey) zeroHitCounts.set(queryKey, (zeroHitCounts.get(queryKey) || 0) + 1);
    } else if (
      typeof rec.topScore === "number"
      && rec.topScore < lowScoreThreshold
      && queryKey
    ) {
      const existing = lowScoreCounts.get(queryKey) || { count: 0, sumScore: 0 };
      existing.count++;
      existing.sumScore += rec.topScore;
      lowScoreCounts.set(queryKey, existing);
    }
  }

  const sortMap = (m, n) => [...m.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([query, count]) => ({ query, count }));

  const sortLowScore = (m, n) => [...m.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([query, v]) => ({
      query,
      count: v.count,
      avgTopScore: Number((v.sumScore / v.count).toFixed(3)),
    }));

  return {
    totalQueries: lines.filter((l) => l && typeof l === "string" && l.trim()).length,
    validQueries,
    parseErrors,
    sourceCounts,
    oldestTs,
    newestTs,
    topQueried: sortMap(termCounts, topQueriedN),
    topZeroHit: sortMap(zeroHitCounts, topZeroHitN),
    topLowScore: sortLowScore(lowScoreCounts, topLowScoreN),
  };
}

/**
 * Read a log file (current + optional `.1` rotation) and aggregate. Fail-soft:
 * returns { error } when nothing readable.
 *
 * @param {string} [logPath]
 * @param {object} [opts]
 * @param {boolean} [opts.includeRotation=true]
 * @returns {object}
 */
export function loadAndAggregate(logPath = DEFAULT_LOG_PATH, opts = {}) {
  const includeRotation = opts.includeRotation !== false;
  const sources = [logPath];
  if (includeRotation) sources.unshift(logPath + ".1"); // older first
  const lines = [];
  let anyRead = false;
  for (const p of sources) {
    if (!existsSync(p)) continue;
    try {
      const text = readFileSync(p, "utf8");
      for (const line of text.split("\n")) lines.push(line);
      anyRead = true;
    } catch { /* skip this source */ }
  }
  if (!anyRead) return { error: "no-log-files", logPath, lines: [] };
  const stats = aggregateQueryLog(lines, opts);
  return { logPath, sources: sources.filter((p) => existsSync(p)), ...stats };
}
