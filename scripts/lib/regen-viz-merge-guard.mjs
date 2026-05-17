/**
 * regen-viz-merge-guard.mjs — pure decision logic for regen-viz.mjs merge step.
 *
 * Why this exists (U-REGEN-VIZ-MERGE-FAILLOUD):
 *   Previously the orchestrator logged `[regen-viz] ✗ merge failed`, set
 *   failed++, and KEPT GOING through repair → dedup → reparent → parent-edges
 *   → obsidian-bridge → executive-briefing → wiki-debt → drift-gate. Those
 *   stages all read the STALE pre-merge system-graph.json, then publish
 *   downstream artifacts (EXECUTIVE-BRIEFING.md, WIKI-DEBT-WORKLIST.md,
 *   obsidian-augmentation.json) against that stale state. The drift-gate then
 *   falsely certifies "clean" because the stale graph IS structurally clean
 *   — just stale. Karpathy R12 violation: silent corruption.
 *
 * Decision contract:
 *   - merge subprocess exited non-zero → ABORT (code 2). Don't touch the
 *     post-merge stages; their inputs are now corrupted.
 *   - merge exited 0 but the graph file shrank or stayed flat while ≥1 MB of
 *     augmentation JSONs exist on disk → ABORT (code 3) as silent no-op.
 *   - otherwise → CONTINUE.
 *
 * Pure function (no I/O) so the orchestrator can stay imperative and the
 * test suite can hammer all edge cases in <100ms.
 */
import fs from "node:fs";
import path from "node:path";

export const EXIT_OK = 0;
export const EXIT_MERGE_FAILED = 2;
export const EXIT_MERGE_NO_OP = 3;

/** Threshold below which we don't bother checking for silent no-op. If you
 * have <1 MB of augmentations on disk, a 0-delta is plausible (FAST mode
 * with already-merged content). */
export const AUG_BYTE_THRESHOLD = 1024 * 1024;

/**
 * Decide whether the orchestrator should abort after the merge step.
 *
 * @param {object} o
 * @param {number} o.mergeStatus       spawn exit code (0 = clean, ≠0 = failed)
 * @param {string|null} o.mergeSignal  spawn signal (e.g. "SIGKILL") or null
 * @param {number} o.preMergeNodeCount system-graph.json node count BEFORE merge
 * @param {number} o.postMergeNodeCount system-graph.json node count AFTER merge
 * @param {number} o.augTotalBytes     sum of *-augmentation.json bytes on disk
 * @returns {{abort: boolean, exitCode: number, reason: string, message: string}}
 */
export function decideMergePostState({
  mergeStatus,
  mergeSignal = null,
  preMergeNodeCount = 0,
  postMergeNodeCount = 0,
  augTotalBytes = 0,
}) {
  if (mergeStatus !== 0) {
    const sig = mergeSignal ? ` signal=${mergeSignal}` : "";
    return {
      abort: true,
      exitCode: EXIT_MERGE_FAILED,
      reason: "merge-failed",
      message: `merge subprocess failed (exit=${mergeStatus}${sig}); post-merge stages would corrupt downstream artifacts by running against the stale pre-merge graph`,
    };
  }
  if (
    augTotalBytes >= AUG_BYTE_THRESHOLD
    && preMergeNodeCount > 0
    && postMergeNodeCount <= preMergeNodeCount
  ) {
    return {
      abort: true,
      exitCode: EXIT_MERGE_NO_OP,
      reason: "merge-no-op",
      message: `merge exited 0 but graph node count did not grow (pre=${preMergeNodeCount} post=${postMergeNodeCount}) despite ${(augTotalBytes / 1e6).toFixed(1)} MB of augmentations on disk — silent no-op merge`,
    };
  }
  return { abort: false, exitCode: EXIT_OK, reason: "ok", message: "" };
}

/**
 * Read system-graph.json node count cheaply via JSON.parse. Returns 0 on any
 * error (the orchestrator treats 0 as "couldn't verify" and falls through to
 * continue — we don't want a missing graph file to mask a real merge failure
 * with a spurious no-op abort).
 *
 * @param {string} graphPath  absolute path to system-graph.json
 * @returns {number}
 */
export function readGraphNodeCount(graphPath) {
  try {
    const g = JSON.parse(fs.readFileSync(graphPath, "utf8"));
    return Array.isArray(g.nodes) ? g.nodes.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Sum the bytes of every *-augmentation.json in a directory. Returns 0 on
 * any error (same fall-through rationale as readGraphNodeCount).
 *
 * @param {string} dir  absolute path to state/shared/system-viz/
 * @returns {number}
 */
export function readAugmentationByteTotal(dir) {
  try {
    let total = 0;
    for (const f of fs.readdirSync(dir)) {
      if (!/-augmentation\.json$/.test(f)) continue;
      try { total += fs.statSync(path.join(dir, f)).size; } catch {}
    }
    return total;
  } catch {
    return 0;
  }
}
