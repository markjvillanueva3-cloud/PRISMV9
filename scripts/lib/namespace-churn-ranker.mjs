#!/usr/bin/env node
/**
 * namespace-churn-ranker.mjs — SYSTEM-VIZ-FS-COVERAGE-MS1/U-MS1-CHURN-RANKER
 *
 * Pure helper for ranking system-viz namespaces by churn rate — how much
 * filesystem activity has happened since each namespace was last walked. The
 * cron re-walker reads the ranked list and picks top-N to refresh; namespaces
 * that haven't changed since their last walk are skipped (their graph snapshot
 * is still current).
 *
 * Inputs:
 *   graph.meta.fsCoverage[ns] = { walkRoot, lastWalkedAt, truncated, filesRepresented, coverageRatio }
 *   fsStat(absPath) → { mtimeMs }      (injectable for tests)
 *
 * Output (per namespace, sorted highest-churn first):
 *   {
 *     namespace,
 *     root,
 *     lastWalkedAt,        // ISO
 *     lastWalkAgeMs,       // now - lastWalkedAt
 *     dirMtime,            // ISO of the root dir's mtime
 *     dirMtimeMs,          // ms epoch
 *     deltaMs,             // dirMtimeMs - lastWalkedAtMs (>0 = activity since walk)
 *     truncated,           // boolean
 *     filesRepresented,    // number
 *     churnScore,          // 0..∞, higher = re-walk more urgently
 *     reason,              // one-line human-readable
 *     skipReason?,         // present only when rootMissing/etc
 *   }
 *
 * Scoring (pure function — exhaustively documented in computeChurnScore):
 *   1. rootMissing                  → score = -1, skipReason = "root missing"
 *   2. !lastWalkedAt                → score = Infinity (never walked — top priority)
 *   3. dirMtimeMs <= lastWalkedAtMs → score = 0 (no activity, walk is fresh)
 *   4. otherwise → base = deltaMs / max(lastWalkAgeMs, 1ms) (activity per age)
 *      + truncationBoost (default 0.5) if truncated === true (overdue retry)
 *      + cappedBoost     (default 0.3) if coverageRatio < 1.0
 *      + stalenessBoost  (default 1.0) if lastWalkAgeMs > maxStalenessMs (default 24h)
 *
 * Invariants:
 *   - Pure: same input → same output. No I/O except injected fsStat.
 *   - Idempotent: re-running with the same graph returns identical ranks.
 *   - Stable sort: ties broken by namespace string ASC (deterministic order).
 *
 * Edge cases handled:
 *   - lastWalkedAt missing/invalid → Infinity score (force re-walk)
 *   - dirMtime stat throws         → skipReason="stat-failed", score=-1
 *   - root path missing            → skipReason="root-missing", score=-1
 *   - dirMtimeMs in the future     → negative ageMs clamped to 1ms (handles clock skew)
 *   - filesRepresented = 0         → still ranked; coverageRatio fallback to 0
 *   - graph.meta.fsCoverage missing → loadNamespacesFromGraph returns []
 */
import fs from "node:fs";
import path from "node:path";
import { readGraphStreaming } from "./graph-io.mjs";

export const DEFAULT_MAX_STALENESS_MS = 24 * 60 * 60 * 1000; // 24h
export const DEFAULT_TRUNCATION_BOOST = 0.5;
export const DEFAULT_CAPPED_BOOST = 0.3;
export const DEFAULT_STALENESS_BOOST = 1.0;
export const DEFAULT_TOP_N = 5;
export const MIN_AGE_MS = 1;

/**
 * Compute churn score for a single namespace entry.
 * @param {object} params
 * @param {number} params.lastWalkedAtMs - ms epoch from graph; 0 or NaN treated as "never"
 * @param {number} params.dirMtimeMs - ms epoch from fsStat; NaN treated as 0
 * @param {boolean} params.truncated
 * @param {number} params.coverageRatio - 0..1
 * @param {number} params.nowMs
 * @param {object} [opts]
 * @returns {{score:number,reason:string}}
 */
export function computeChurnScore({ lastWalkedAtMs, dirMtimeMs, truncated, coverageRatio, nowMs }, opts = {}) {
  const maxStalenessMs = opts.maxStalenessMs ?? DEFAULT_MAX_STALENESS_MS;
  const truncationBoost = opts.truncationBoost ?? DEFAULT_TRUNCATION_BOOST;
  const cappedBoost = opts.cappedBoost ?? DEFAULT_CAPPED_BOOST;
  const stalenessBoost = opts.stalenessBoost ?? DEFAULT_STALENESS_BOOST;

  if (!Number.isFinite(lastWalkedAtMs) || lastWalkedAtMs <= 0) {
    return { score: Number.POSITIVE_INFINITY, reason: "never walked" };
  }
  const lastWalkAgeMs = Math.max(nowMs - lastWalkedAtMs, MIN_AGE_MS);
  const safeMtime = Number.isFinite(dirMtimeMs) ? dirMtimeMs : 0;
  const deltaMs = safeMtime - lastWalkedAtMs;

  if (deltaMs <= 0 && !truncated && (coverageRatio ?? 0) >= 1.0 && lastWalkAgeMs <= maxStalenessMs) {
    return { score: 0, reason: "fresh — no activity since walk" };
  }

  let score = Math.max(deltaMs, 0) / lastWalkAgeMs;
  const reasonParts = [];
  if (deltaMs > 0) reasonParts.push(`activity Δ=${formatMs(deltaMs)}`);
  if (truncated === true) { score += truncationBoost; reasonParts.push(`truncated (+${truncationBoost})`); }
  if ((coverageRatio ?? 0) < 1.0) { score += cappedBoost; reasonParts.push(`coverage<1 (+${cappedBoost})`); }
  if (lastWalkAgeMs > maxStalenessMs) { score += stalenessBoost; reasonParts.push(`stale ${formatMs(lastWalkAgeMs)} (+${stalenessBoost})`); }
  if (reasonParts.length === 0) reasonParts.push("fresh");
  return { score, reason: reasonParts.join(" · ") };
}

/**
 * Rank an array of namespace entries by churn score.
 * @param {Array<{namespace,root,lastWalkedAt,truncated,coverageRatio,filesRepresented}>} entries
 * @param {object} deps
 * @param {(absPath:string)=>{mtimeMs:number}|null} deps.fsStat - injectable
 * @param {number} [deps.nowMs] - defaults to Date.now()
 * @param {object} [opts] - score weights
 * @returns {Array} ranked descending by churnScore, ties broken by namespace ASC
 */
export function rankNamespacesByChurn(entries, deps, opts = {}) {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  const fsStat = deps?.fsStat;
  if (typeof fsStat !== "function") throw new TypeError("rankNamespacesByChurn: deps.fsStat required");
  const nowMs = deps?.nowMs ?? Date.now();

  const ranked = entries.map((e) => {
    let dirMtimeMs = 0;
    let skipReason = null;
    try {
      const st = fsStat(e.root);
      if (!st) skipReason = "root-missing";
      else dirMtimeMs = Number(st.mtimeMs) || 0;
    } catch (err) {
      skipReason = `stat-failed: ${err?.message || String(err)}`;
    }
    const lastWalkedAtMs = e.lastWalkedAt ? Date.parse(e.lastWalkedAt) : 0;
    const lastWalkAgeMs = lastWalkedAtMs > 0 ? Math.max(nowMs - lastWalkedAtMs, MIN_AGE_MS) : 0;

    if (skipReason) {
      return {
        namespace: e.namespace,
        root: e.root,
        lastWalkedAt: e.lastWalkedAt ?? null,
        lastWalkAgeMs,
        dirMtime: null,
        dirMtimeMs: 0,
        deltaMs: 0,
        truncated: !!e.truncated,
        filesRepresented: Number(e.filesRepresented) || 0,
        churnScore: -1,
        reason: skipReason,
        skipReason,
      };
    }

    const { score, reason } = computeChurnScore({
      lastWalkedAtMs,
      dirMtimeMs,
      truncated: e.truncated === true,
      coverageRatio: Number.isFinite(e.coverageRatio) ? e.coverageRatio : (e.filesRepresented > 0 ? 1 : 0),
      nowMs,
    }, opts);

    return {
      namespace: e.namespace,
      root: e.root,
      lastWalkedAt: e.lastWalkedAt ?? null,
      lastWalkAgeMs,
      dirMtime: dirMtimeMs > 0 ? new Date(dirMtimeMs).toISOString() : null,
      dirMtimeMs,
      deltaMs: lastWalkedAtMs > 0 ? dirMtimeMs - lastWalkedAtMs : 0,
      truncated: !!e.truncated,
      filesRepresented: Number(e.filesRepresented) || 0,
      churnScore: score,
      reason,
    };
  });

  // Sort: highest score first; ties broken by namespace ASC for determinism.
  ranked.sort((a, b) => {
    if (a.churnScore !== b.churnScore) {
      if (a.churnScore === Number.POSITIVE_INFINITY) return -1;
      if (b.churnScore === Number.POSITIVE_INFINITY) return 1;
      return b.churnScore - a.churnScore;
    }
    return String(a.namespace).localeCompare(String(b.namespace));
  });
  return ranked;
}

/**
 * Select top-N namespaces for re-walk. Skips entries with negative scores (errors)
 * AND entries with score === 0 (fresh — no need to re-walk).
 */
export function selectTopNForRewalk(ranked, n = DEFAULT_TOP_N) {
  if (!Array.isArray(ranked)) return [];
  const validN = Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_TOP_N;
  return ranked.filter((r) => r.churnScore > 0).slice(0, validN);
}

/**
 * Read fsCoverage entries from the system-viz graph file.
 * Returns [] if graph missing/corrupt/no fsCoverage; never throws.
 */
export function loadNamespacesFromGraph(graphPath) {
  if (!graphPath || typeof graphPath !== "string") return [];
  let g;
  try { g = readGraphStreaming(graphPath); }  // off-heap: JSON.parse(readFileSync utf8) throws at >512MiB (U-VIZ-READER-CAPSAFE 2026-06-10)
  catch { return []; }
  const cov = g?.meta?.fsCoverage;
  if (!cov || typeof cov !== "object") return [];
  return Object.entries(cov).map(([key, v]) => ({
    namespace: key,
    root: v?.walkRoot || extractRootFromKey(key),
    lastWalkedAt: v?.lastWalkedAt || null,
    truncated: v?.truncated === true,
    coverageRatio: Number.isFinite(v?.coverageRatio) ? v.coverageRatio : null,
    filesRepresented: Number(v?.filesRepresented) || 0,
  }));
}

/**
 * Namespace keys are formatted "<short-name>::<absolute-path>". This pulls the path.
 */
export function extractRootFromKey(key) {
  if (typeof key !== "string") return null;
  const idx = key.indexOf("::");
  return idx >= 0 ? key.slice(idx + 2) : key;
}

/** Default fsStat using node:fs.statSync; returns null on ENOENT. */
export function defaultFsStat(absPath) {
  try {
    const st = fs.statSync(absPath);
    return { mtimeMs: st.mtimeMs };
  } catch (err) {
    if (err && (err.code === "ENOENT" || err.code === "ENOTDIR")) return null;
    throw err;
  }
}

function formatMs(ms) {
  if (!Number.isFinite(ms)) return "?";
  const abs = Math.abs(ms);
  if (abs < 1000) return `${ms}ms`;
  if (abs < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (abs < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
  if (abs < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}

// CLI: report current ranking to stdout (read-only, never walks)
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  const args = process.argv.slice(2);
  const graphPath = args.find((a) => !a.startsWith("--")) ||
    path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../../state/shared/system-viz/system-graph.json");
  const topN = Number(args.find((a) => a.startsWith("--top="))?.slice(6)) || DEFAULT_TOP_N;
  const jsonOut = args.includes("--json");

  const entries = loadNamespacesFromGraph(graphPath);
  if (entries.length === 0) {
    const msg = `No namespaces found in ${graphPath}`;
    if (jsonOut) console.log(JSON.stringify({ ok: false, error: msg, ranked: [] }));
    else console.error(msg);
    process.exit(2);
  }
  const ranked = rankNamespacesByChurn(entries, { fsStat: defaultFsStat });
  const selected = selectTopNForRewalk(ranked, topN);
  if (jsonOut) {
    console.log(JSON.stringify({ ok: true, total: entries.length, ranked, selected }, null, 2));
  } else {
    console.log(`Namespace Churn — top ${selected.length}/${entries.length} for re-walk\n`);
    console.log("rank  score    truncated  files     namespace");
    console.log("-".repeat(80));
    selected.forEach((r, i) => {
      const score = r.churnScore === Number.POSITIVE_INFINITY ? "∞" : r.churnScore.toFixed(3);
      console.log(`#${(i + 1).toString().padEnd(4)} ${score.padEnd(8)} ${(r.truncated ? "Y" : "-").padEnd(10)} ${r.filesRepresented.toString().padEnd(9)} ${r.namespace}`);
      console.log(`      └─ ${r.reason}`);
    });
    if (selected.length === 0) console.log("(no namespaces need re-walk — all fresh)");
  }
}
