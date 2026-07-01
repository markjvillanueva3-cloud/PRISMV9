// regression-lock-gate.mjs -- enforcement keystone for the regression-lock property.
// ---------------------------------------------------------------------------
// HRH-NEW-2 from state/shared/specs/SKILLS-HOOKS-AUDIT-2026-06-11.md. R8-verified novel
// 2026-06-11 (slot:golf): scripts/regression-lock-audit.mjs AUDITS the `## Recent regressions`
// ledger for the Opik-L3 lock property (does each documented fix ship a recurrence test?) but
// nothing ENFORCES it at write-time -- so unlocked entries accumulate (4 today).
//
// This keystone is the ENFORCEMENT verdict logic (golf-buildable, scripts/lib/). It REUSES
// parseRegressionEntries from regression-lock-audit.mjs (R8 -- do not re-derive the row regex).
// The thin Stop/PostToolUse hook .claude/hooks/regression-lock-gate.mjs that calls it is
// cross-worktree-firewall-gated for the golf slot -> shipped as a patch routed to the owner.
//
// Enforcement model (session-level lock proxy): if this session ADDED one or more
// `## Recent regressions` rows to a CLAUDE.md but the SAME change-set landed NO test file,
// the new entries are UNLOCKED -> advisory punch list (promotable to a hard block via
// PRISM_REGRESSION_LOCK_ENFORCE=1). This is intentionally conservative: any test file in the
// change-set locks the added rows (matches the audit's loose "fix commit shipped a test"
// semantics; the per-entry commit attribution the audit does is unavailable pre-commit).
//
// Pure-core (unit-testable): findNewlyAddedRegressions, evaluateRegressionLock. No IO.

import { parseRegressionEntries } from "./regression-lock-audit.mjs";

// Stable identity for a regression entry across before/after parses.
function keyOf(e) {
  return `${(e && e.sha) || "nosha"}|${((e && e.description) || "").trim().toLowerCase()}`;
}

// A change-set file path counts as a "test" if it is a test/spec file or lives under __tests__.
const TEST_FILE_RE = /(?:^|[\\/])__tests__[\\/]|\.(?:test|spec)\.[mc]?[jt]sx?$|\.test\.mjs$/i;
export function isTestFile(p) {
  return typeof p === "string" && TEST_FILE_RE.test(p);
}

/**
 * Pure-core: entries present in afterMd but not beforeMd (newly added this session).
 * Reuses parseRegressionEntries (R8). Fail-soft: non-string input -> [].
 * @param {string} beforeMd  CLAUDE.md at session start (e.g. HEAD:CLAUDE.md)
 * @param {string} afterMd   CLAUDE.md now (working tree)
 * @returns {Array<object>} newly-added regression entries
 */
export function findNewlyAddedRegressions(beforeMd, afterMd) {
  const before = new Set();
  try { for (const e of parseRegressionEntries(typeof beforeMd === "string" ? beforeMd : "")) before.add(keyOf(e)); } catch { /* fail-soft */ }
  let afterEntries = [];
  try { afterEntries = parseRegressionEntries(typeof afterMd === "string" ? afterMd : ""); } catch { afterEntries = []; }
  return afterEntries.filter((e) => !before.has(keyOf(e)));
}

/**
 * Pure-core: the enforcement verdict.
 * @param {{ newlyAdded?:Array<object>, changedFiles?:string[], enforce?:boolean }} args
 * @returns {{ addedCount:number, hasCompanionTest:boolean, unlocked:Array<object>,
 *            shouldWarn:boolean, shouldBlock:boolean, message:string }}
 */
export function evaluateRegressionLock({ newlyAdded = [], changedFiles = [], enforce = false } = {}) {
  const added = Array.isArray(newlyAdded) ? newlyAdded : [];
  const files = Array.isArray(changedFiles) ? changedFiles : [];
  const hasCompanionTest = files.some(isTestFile);
  const unlocked = hasCompanionTest ? [] : added;
  const shouldWarn = unlocked.length > 0;
  const shouldBlock = !!enforce && shouldWarn;

  let message = "";
  if (shouldWarn) {
    const head = `[regression-lock] ${unlocked.length} regression entr${unlocked.length === 1 ? "y" : "ies"} added this session with NO companion test in the change-set (recurrence risk -- Opik-L3 lock property):`;
    const rows = unlocked.map((e) => `  - ${e.date || "?"} \`${e.sha || "nosha"}\` -- ${(e.description || "").slice(0, 100)}`);
    const tail = shouldBlock
      ? "BLOCKED (PRISM_REGRESSION_LOCK_ENFORCE=1): land a test that fails without the fix, then retry."
      : "Advisory: write a test that fails without the fix. (Set PRISM_REGRESSION_LOCK_ENFORCE=1 to make this a hard gate.)";
    message = [head, ...rows, tail].join("\n");
  }
  return { addedCount: added.length, hasCompanionTest, unlocked, shouldWarn, shouldBlock, message };
}
