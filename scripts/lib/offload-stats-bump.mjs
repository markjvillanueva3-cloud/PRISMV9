// scripts/lib/offload-stats-bump.mjs
// U-OFFLOAD-STATS-BUMP-DEDUP (2026-06-24, slot:alpha): ONE fail-safe atomic-RMW
// envelope for the canonical offload-stats file
// (mcp-server/data/state/ollama-offload-stats.json).
//
// Before this, FOUR call sites carried a byte-identical copy of the same fragile
// read-modify-write envelope (existsSync-guard -> parse-in-try/catch -> typeof-guard ->
// mutate-in-place -> lastUpdated -> pid+ts tmp + renameSync -> never-throw):
//   ask-hermes.mjs#recordUsage          (tallyUsage mutate -- the original)
//   verified-offload-tiered.mjs#recordTieredUsage (tallyUsage mutate)
//   ollama-file-digest.mjs#recordFileDigestOffload (byHook["ollama-file-digest"])
//   ollama-offload.mjs#recordLocalOffload (byHook["ollama-offload-cli"] + byMode)
//
// A drift in ANY copy silently mislabels utilization telemetry (the same class the
// ask-hermes ~46x under-count fix uncovered -- a recorder that quietly stops folding
// reads as "0 offloads" to gradeOllamaUtilization + the offload dashboard). This module
// is the single tested seam: the ENVELOPE is shared, each caller keeps its OWN mutate
// (bucket key / byMode / tallyUsage) -- R7 surface-don't-fork, R8 read-before-write,
// R11 clone-not-fork collapsed into one source.
//
// Telemetry contract (preserved byte-faithfully from all 4 originals):
//  - NEVER creates the stats file (annotates the canonical one only; existsSync-guard).
//    A missing file is "telemetry not initialized", never "spawn a parallel store".
//  - NEVER throws (a telemetry failure must not break the offload/CLI it instruments).
//  - Atomic: writes a `${path}.${pid}.${ts}.tmp` then renameSync, so a concurrent
//    reader never sees a torn half-written file.
import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";

/**
 * atomicOffloadStatsRMW -- the shared fail-safe envelope. Loads the stats JSON,
 * runs `mutate(stats)` IN PLACE (caller's bucket bump / tallyUsage), stamps
 * lastUpdated, and atomically writes it back.
 *
 * Faithful to every original: a `mutate` that throws is caught by the OUTER try, so
 * the in-place partial mutation is simply discarded (the file is never written) and
 * the call returns false -- identical to the originals where a throw inside the body
 * hit their own `catch { return false; }`.
 *
 * @param {string} statsPath  canonical offload-stats path (NOT created if absent)
 * @param {(stats:object)=>void} mutate  in-place mutation; runs after the guards pass
 * @returns {boolean} true iff the file was updated; false on bad-arg/absent/garbage/throw
 */
export function atomicOffloadStatsRMW(statsPath, mutate) {
  try {
    if (typeof mutate !== "function") return false; // misuse -> no I/O, no write
    if (!existsSync(statsPath)) return false;
    let stats;
    try { stats = JSON.parse(readFileSync(statsPath, "utf8")); } catch { return false; }
    if (!stats || typeof stats !== "object") return false;
    mutate(stats);
    stats.lastUpdated = new Date().toISOString();
    const tmp = `${statsPath}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, JSON.stringify(stats, null, 2));
    renameSync(tmp, statsPath);
    return true;
  } catch {
    return false; // best-effort telemetry; never break the caller
  }
}

/**
 * ensureOffloadBucket -- get-or-init stats.byHook[key] with the canonical offload
 * bucket shape {fired,offloaded,kept,suggested,tokensSaved}, optionally with byMode.
 * Consolidates the bucket-init boilerplate recordFileDigestOffload + recordLocalOffload
 * each duplicated. Falsy-only re-init (mirrors the originals' `if (!stats.byHook[key])`)
 * so an EXISTING bucket is never reset -- accumulation across calls is preserved.
 * Mutates `stats` in place; returns the bucket ref for the caller to bump.
 *
 * @param {object} stats   parsed offload-stats (mutated in place)
 * @param {string} key     byHook bucket key
 * @param {{withByMode?:boolean}} [opts]
 * @returns {{fired:number,offloaded:number,kept:number,suggested:number,tokensSaved:number,byMode?:object}}
 */
export function ensureOffloadBucket(stats, key, { withByMode = false } = {}) {
  if (!stats.byHook || typeof stats.byHook !== "object") stats.byHook = {};
  if (!stats.byHook[key]) stats.byHook[key] = { fired: 0, offloaded: 0, kept: 0, suggested: 0, tokensSaved: 0 };
  const h = stats.byHook[key];
  if (withByMode && (!h.byMode || typeof h.byMode !== "object")) h.byMode = {};
  return h;
}

/**
 * clampSaved -- floor a tokensSaved value to a non-negative integer (the SAME
 * `Math.max(0, Math.round(Number(x) || 0))` every recorder applied, so a NaN/negative
 * estimate can never push a bucket's tokensSaved below 0). Pure.
 * @param {*} tokensSaved
 * @returns {number} an integer >= 0
 */
export function clampSaved(tokensSaved) {
  return Math.max(0, Math.round(Number(tokensSaved) || 0));
}
