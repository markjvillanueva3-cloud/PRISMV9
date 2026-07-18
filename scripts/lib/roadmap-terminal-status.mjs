/**
 * roadmap-terminal-status.mjs -- SYSTEM-VIZ-HYGIENE / U-SVH-DRIFT-SKIP-VOCAB
 *
 * Pure predicate: is a roadmap-index / milestone status TERMINAL (done or
 * deliberately resolved) and therefore NOT a drift candidate? A milestone already
 * marked terminal cannot "drift" -- re-counting its git commits only yields a
 * spurious delta (cry-wolf). The drift auditors must skip it.
 *
 * Root cause this fixes: `audit-roadmap-drift.mjs` hardcoded an EXACT set
 * {complete, superseded, consolidated, deprecated} that missed the canonical
 * synonyms the index actually carries -- "completed" (DEV-VELOCITY-AUTOTRIGGER-MS0,
 * FLEET-REAPER-MS1) and "shipped"/"shipped-research-only" -- so finished milestones
 * were re-audited and could emit false drift. Sibling of the build-milestone-progress
 * superseded/shipped-status fix (ENVELOPE_DONE + TERMINAL_RESOLVED).
 *
 * Pure + total + deterministic -> unit-testable without running the auditor.
 */

// Terminal statuses: a milestone in any of these is DONE or deliberately RESOLVED.
// DONE: complete/completed/done/shipped. RESOLVED-not-built: superseded/consolidated/
// deprecated. (Mirrors build-milestone-progress.mjs ENVELOPE_DONE u TERMINAL_RESOLVED,
// plus the roadmap-index-specific consolidated/deprecated terminal states.)
export const SKIP_STATUSES = new Set([
  "complete",
  "completed",
  "done",
  "shipped",
  "superseded",
  "consolidated",
  "deprecated",
]);

/**
 * True when a milestone status is terminal (done/resolved) -> exclude from drift
 * audit. Handles exact members plus "complete*"/"shipped*" variants (e.g.
 * "shipped-research-only"). NOTE: deliberately does NOT treat "in_progress",
 * "ready", "ready_for_merge", "not_started", or "deferred" as terminal -- those
 * are genuinely open and MUST stay auditable (no over-suppression).
 * @param {unknown} status
 * @returns {boolean}
 */
export function isSkippable(status) {
  const s = String(status == null ? "" : status).toLowerCase().trim();
  if (!s) return false;
  return SKIP_STATUSES.has(s) || s.startsWith("complete") || s.startsWith("shipped");
}

export default isSkippable;
