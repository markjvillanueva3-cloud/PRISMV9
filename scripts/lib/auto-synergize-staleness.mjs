#!/usr/bin/env node
/**
 * auto-synergize-staleness.mjs -- AUTO-SYNERGIZE-MS0 (slot:india)
 *
 * Pure staleness decision for the "automatic system synergizing" loop. The
 * operator's vision: generated/extracted data (memories, wiki, cross-substrate
 * edges) must AUTOMATICALLY flow into the searchable system-viz graph so
 * "everything communicates" without a human running `regen-viz` by hand.
 *
 * THE GAP THIS FILLS (verified not a dup of detect-system-viz-drift.mjs):
 *   `detect-system-viz-drift.mjs` classifies the FS-NAMESPACE walk axis -- has the
 *   graph's per-namespace file-tree walk aged past its `lastWalkedAt`. It does NOT
 *   track "how many NEW memories/wiki notes landed since the graph was last
 *   regenerated", and it does not DECIDE whether to fire a fold. This module owns
 *   the orthogonal axis: change-accumulation since last synergize -> fold-or-not.
 *
 * It is the DECISION half only -- pure, deterministic, dependency-injected, no I/O
 * of its own (the runner `scripts/auto-synergize-loop.mjs` does the fs walk +
 * spawns `regen-viz.mjs`). regen-viz default mode already (a) re-runs
 * `generate-cross-substrate-edges.mjs` (FAST[] :199), (b) folds it via
 * `merge-augmentations.mjs` (:276), (c) rebuilds the find-cache/index, (d) holds
 * the graph write-lock. So the loop never re-implements the merge machinery -- it
 * only decides WHEN to fire it.
 *
 * Pure-export contract (for tests):
 *   computeSynergyFingerprint({ sources, sinceMs, walk }) -> fingerprint
 *   decideSynergyAction({ fingerprint, lastState, nowMs, thresholds, force }) -> decision
 *   summarizeDecision(decision) -> one-line string
 *   DEFAULT_SOURCES, DEFAULT_THRESHOLDS
 */

/** Change-source roots (relative to repo root). A new/edited .md under any of
 * these means the searchable graph is behind reality. memories + wiki are the
 * dominant, cheap signal; regen-viz regenerates ALL augmentations regardless, so
 * this set only needs to be a faithful CHANGE DETECTOR, not exhaustive. */
export const DEFAULT_SOURCES = Object.freeze([
  Object.freeze({ key: "memories", root: "knowledge/memories" }),
  Object.freeze({ key: "wiki", root: "knowledge/wiki" }),
]);

export const DEFAULT_THRESHOLDS = Object.freeze({
  minFilesForRegen: 20,      // >= this many changed .md since last synergize -> fold
  maxHoursBeforeRegen: 12,   // OR this long since last synergize -> fold (time floor)
  debounceMinutes: 90,       // never fire two folds closer than this (unless force)
});

const HOUR_MS = 3_600_000;
const MIN_MS = 60_000;

/** Parse an ISO timestamp to ms, returning 0 for missing/invalid (= "never"). */
function parseTs(v) {
  if (!v) return 0;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Build a change fingerprint over the source roots.
 * @param {object} o
 * @param {Array<{key,root}>} o.sources
 * @param {number} o.sinceMs  count files changed strictly after this epoch-ms
 * @param {(root:string)=>{exists:boolean,count:number,mtimes:number[]}} o.walk
 *        Injected walker. Real impl: capped recursive *.md mtime collector.
 * @returns {{ perSource: object[], totalFiles:number, totalChangedSince:number,
 *             newestMtimeMs:number }}
 */
export function computeSynergyFingerprint({ sources = DEFAULT_SOURCES, sinceMs = 0, walk } = {}) {
  if (typeof walk !== "function") {
    throw new TypeError("computeSynergyFingerprint: `walk` dependency is required");
  }
  const perSource = [];
  let totalFiles = 0;
  let totalChangedSince = 0;
  let newestMtimeMs = 0;

  for (const src of sources) {
    let res;
    try {
      res = walk(src.root) || { exists: false, count: 0, mtimes: [] };
    } catch (err) {
      // Fail-soft: a missing/unreadable root contributes nothing, never throws.
      res = { exists: false, count: 0, mtimes: [], error: String(err?.message || err) };
    }
    const mtimes = Array.isArray(res.mtimes) ? res.mtimes : [];
    const count = Number.isFinite(res.count) ? res.count : mtimes.length;
    // Non-positive sinceMs (cold start) means "everything counts as changed".
    const changedSince = sinceMs > 0
      ? mtimes.reduce((n, m) => (m > sinceMs ? n + 1 : n), 0)
      : count;
    const srcNewest = mtimes.reduce((mx, m) => (m > mx ? m : mx), 0);

    perSource.push({
      key: src.key,
      root: src.root,
      exists: res.exists !== false,
      count,
      changedSince,
      newestMtimeMs: srcNewest,
      ...(res.error ? { error: res.error } : {}),
    });
    totalFiles += count;
    totalChangedSince += changedSince;
    if (srcNewest > newestMtimeMs) newestMtimeMs = srcNewest;
  }

  return { perSource, totalFiles, totalChangedSince, newestMtimeMs };
}

/**
 * Decide whether a synergize fold (regen-viz) is warranted.
 * @returns {{ action:"regen"|"none", severity:0|1|2|3, changedFiles:number,
 *             hoursSinceSynergize:number|null, minutesSinceApply:number|null,
 *             coldStart:boolean, debounced:boolean, reasons:string[],
 *             metrics:object }}
 */
export function decideSynergyAction({ fingerprint, lastState = {}, nowMs = Date.now(), thresholds = {}, force = false } = {}) {
  if (!fingerprint || typeof fingerprint !== "object") {
    throw new TypeError("decideSynergyAction: `fingerprint` is required");
  }
  const th = { ...DEFAULT_THRESHOLDS, ...thresholds };

  const lastSynergizeMs = parseTs(lastState.lastSynergizeAt);
  const lastApplyMs = parseTs(lastState.lastApplyAt);
  const coldStart = lastSynergizeMs === 0;

  const changedFiles = fingerprint.totalChangedSince ?? 0;
  // clamp deltas to >= 0 so a clock skew / future timestamp never reads as
  // "negative hours" (adversarial: a memory file stamped in the future).
  const hoursSinceSynergize = coldStart ? null : Math.max(nowMs - lastSynergizeMs, 0) / HOUR_MS;
  const minutesSinceApply = lastApplyMs === 0 ? null : Math.max(nowMs - lastApplyMs, 0) / MIN_MS;

  const reasons = [];
  const metrics = {
    changedFiles,
    totalFiles: fingerprint.totalFiles ?? 0,
    minFilesForRegen: th.minFilesForRegen,
    maxHoursBeforeRegen: th.maxHoursBeforeRegen,
    debounceMinutes: th.debounceMinutes,
    hoursSinceSynergize: hoursSinceSynergize === null ? null : +hoursSinceSynergize.toFixed(2),
    minutesSinceApply: minutesSinceApply === null ? null : +minutesSinceApply.toFixed(1),
  };

  // Debounce gate -- never fold twice inside the window unless forced.
  const debounced = !force && minutesSinceApply !== null && minutesSinceApply < th.debounceMinutes;

  // Determine the would-be trigger independent of debounce, so the advisory can
  // explain "stale but debounced".
  let triggered = false;
  let severity = 0;
  if (force) {
    triggered = true; severity = 3; reasons.push("forced");
  } else if (coldStart) {
    triggered = true; severity = 3; reasons.push("no prior synergize state (cold start)");
  } else {
    if (changedFiles >= th.minFilesForRegen) {
      triggered = true; severity = 2;
      reasons.push(`${changedFiles} changed file(s) >= ${th.minFilesForRegen}`);
    }
    if (hoursSinceSynergize !== null && hoursSinceSynergize >= th.maxHoursBeforeRegen) {
      triggered = true; severity = Math.max(severity, 2);
      reasons.push(`${hoursSinceSynergize.toFixed(1)}h since synergize >= ${th.maxHoursBeforeRegen}h`);
    }
    if (!triggered && changedFiles > 0) {
      severity = 1;
      reasons.push(`${changedFiles} changed file(s) accumulating (< ${th.minFilesForRegen} threshold)`);
    }
    if (!triggered && changedFiles === 0) {
      reasons.push("fresh -- no changes since last synergize");
    }
  }

  let action = triggered ? "regen" : "none";
  if (action === "regen" && debounced) {
    action = "none";
    reasons.push(`debounced -- folded ${minutesSinceApply.toFixed(0)}m ago (< ${th.debounceMinutes}m); deferring`);
  }

  return {
    action,
    severity,
    changedFiles,
    hoursSinceSynergize: metrics.hoursSinceSynergize,
    minutesSinceApply: metrics.minutesSinceApply,
    coldStart,
    debounced,
    triggered,
    reasons,
    metrics,
  };
}

/** One-line human/advisory summary of a decision. */
export function summarizeDecision(decision) {
  if (!decision) return "auto-synergize: no decision";
  const tag = decision.action === "regen" ? "STALE -> fold" : "fresh";
  const head = `auto-synergize: ${tag} (sev ${decision.severity})`;
  return `${head} -- ${decision.reasons.join("; ")}`;
}
