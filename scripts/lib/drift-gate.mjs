/**
 * drift-gate — pure verdict for the system-viz drift hard-fail gate.
 *
 * W4 / U-DRIFT-HARD-FAIL (SYSTEM-VIZ-UPGRADES-MS0): regen-viz used to build
 * the graph and exit 0 even when the freshly-built graph had TRUNCATED or
 * ROOT-MISSING namespaces (fsCoverage incomplete / a walk root deleted).
 * DRIFT_REPORT.json recorded it but the only consumer was a throttled,
 * non-blocking Stop advisory — corruption surfaced (if at all) up to 12h
 * later. This gate makes those two categories a HARD non-zero exit at
 * regen time. `stale-time` / `stale-churn` / `never-walked` are NOT hard
 * failures (they are normal between cron re-walks) — only data-integrity
 * categories (truncated, root-missing) block.
 *
 * Pure + side-effect-free so it is exhaustively unit-testable; the I/O
 * (running detect-system-viz-drift, reading the report, process.exit) lives
 * in regen-viz.mjs which imports this.
 */

/** Categories that mean the graph is structurally incomplete → hard fail. */
export const HARD_FAIL_CATEGORIES = ["truncated", "root-missing"];

/**
 * Decide whether a DRIFT_REPORT.json payload should hard-fail the regen.
 *
 * @param {object|null} report  parsed DRIFT_REPORT.json (or null if absent/unreadable)
 * @returns {{fail:boolean, code:0|1, reasons:string[], summary:string}}
 */
export function driftGateVerdict(report) {
  if (!report || typeof report !== "object") {
    // No report ≠ corruption. Absence is a soft condition (the detector may
    // not have run yet); fail-loud would block every fresh checkout. Pass
    // with an explicit note so the caller can log it.
    return {
      fail: false,
      code: 0,
      reasons: [],
      summary: "drift-gate: no DRIFT_REPORT.json (detector not run yet) — not treated as corruption",
    };
  }

  const byCat = report.byCategory && typeof report.byCategory === "object" ? report.byCategory : {};
  const reasons = [];
  for (const cat of HARD_FAIL_CATEGORIES) {
    const n = Number(byCat[cat]) || 0;
    if (n > 0) {
      reasons.push(`${n} ${cat} namespace${n === 1 ? "" : "s"}`);
    }
  }

  if (reasons.length === 0) {
    const total = Number(report.total) || 0;
    const fresh = Number(byCat.fresh) || 0;
    return {
      fail: false,
      code: 0,
      reasons: [],
      summary: `drift-gate: clean (no truncated/root-missing; ${fresh}/${total} fresh)`,
    };
  }

  return {
    fail: true,
    code: 1,
    reasons,
    summary: `drift-gate FAIL: ${reasons.join(" · ")} — the built graph is structurally incomplete. ` +
             `Re-walk the affected namespaces (node scripts/cron-revwalk.mjs) then regenerate. ` +
             `Bypass (NOT recommended): PRISM_REGEN_VIZ_IGNORE_DRIFT=1.`,
  };
}
