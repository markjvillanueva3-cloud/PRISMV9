// RGS-PLANNING-LOOP-BRIDGE-MS0/U1 (2026-06-11, slot:tango)
// The pure decision core of the closed planning+execution loop. Given the recent
// eval signal + fail streak + budget, decide the next loop action. NO IO -- every
// input is passed in, so this is fully table-testable and the SINGLE termination
// authority (U5 folds cmdNext's roll-cap into a `stop` before calling this; see
// U-SPEC-V2 fix-P0 "two termination authorities").
//
// Decision order (STOP-first dominance is load-bearing for the termination proof):
//   1. STOP   -- exhausted OR budget gone (unconditional, checked first)
//   2. REPLAN -- consecutiveFails >= REPLAN_THRESHOLD; demotes to STOP at MAX_REPLANS
//   3. RERANK -- full eval window AND mean < RERANK_TRIGGER AND not in a replan streak
//   4. CONTINUE -- default
//
// Soundness (U-SPEC-V2 section 3): eval source is run-verification-channel exit
// (binary 0.0/1.0), so RERANK_TRIGGER is 0.4 -- a 0.6 threshold would be a dead
// branch under a binary source (fires only at mean<=0.33). Re-rank is a within-
// class tiebreaker (U4), it cannot oscillate the dominant pick. The loop halts
// within min(target, MAX_ROLLS) x (1 + MAX_REPLANS) iterations.

/** Window size for the RERANK mean -- full window required (no single-sample oscillation). */
export const RERANK_WINDOW = 3;
/** Mean-eval below which a multi-unit class is re-ranked. 0.4, NOT 0.6 -- binary eval source. */
export const RERANK_TRIGGER = 0.4;
/** A unit failing this many times in a row triggers replan (avoids replan on one transient fail). */
export const REPLAN_THRESHOLD = 2;
/** Hard cap on replans per session -- past this, replan demotes to stop (termination guarantee). */
export const MAX_REPLANS = 3;
/** A single eval at-or-below this counts as a fail for streak purposes (the score=0.5 boundary). */
export const EVAL_PASS_THRESHOLD = 0.5;

/** Mean of the finite-only entries of an array, or null when none are finite. PURE. */
function finiteMean(arr) {
  if (!Array.isArray(arr)) return null;
  const xs = arr.filter((v) => Number.isFinite(v));
  if (xs.length === 0) return null;
  return { mean: xs.reduce((a, b) => a + b, 0) / xs.length, n: xs.length };
}

/**
 * Decide the next loop action. PURE -- no IO, no Date, no randomness.
 * @param {object} input
 * @param {number[]} input.recentEvals  last-N numeric eval scores (0..1); non-finite entries ignored
 * @param {number}   input.consecutiveFails  count of consecutive failing iterations
 * @param {number}   input.budgetRemaining  iterations left (target - iter); <=0 means out of budget
 * @param {boolean}  input.exhausted  true when no next unit is resolvable from any source
 * @param {number}  [input.replansSoFar=0]  replans already performed this session
 * @param {number}  [input.maxReplans=MAX_REPLANS]  replan cap before demote-to-stop
 * @returns {{action:'continue'|'rerank'|'replan'|'stop', reason:string}}
 */
export function decidePlanningAction({
  recentEvals = [],
  consecutiveFails = 0,
  budgetRemaining = Infinity,
  exhausted = false,
  replansSoFar = 0,
  maxReplans = MAX_REPLANS,
} = {}) {
  // 1. STOP first -- unconditional. This is the primary termination guarantee.
  if (exhausted) return { action: "stop", reason: "exhausted: no next unit from any source" };
  if (Number.isFinite(budgetRemaining) && budgetRemaining <= 0) {
    return { action: "stop", reason: "budget: iterations exhausted (budgetRemaining<=0)" };
  }

  const fails = Number.isFinite(consecutiveFails) ? consecutiveFails : 0;

  // 2. REPLAN -- a persistent fail streak. Beats RERANK when both would fire.
  if (fails >= REPLAN_THRESHOLD) {
    if ((Number.isFinite(replansSoFar) ? replansSoFar : 0) >= (Number.isFinite(maxReplans) ? maxReplans : MAX_REPLANS)) {
      return { action: "stop", reason: `max-replans: ${replansSoFar} replans reached cap ${maxReplans}` };
    }
    return { action: "replan", reason: `replan: ${fails} consecutive fails >= ${REPLAN_THRESHOLD}` };
  }

  // 3. RERANK -- full eval window with a low mean, but NOT during a (sub-threshold) fail run.
  const m = finiteMean(recentEvals);
  if (m && m.n >= RERANK_WINDOW && m.mean < RERANK_TRIGGER) {
    return { action: "rerank", reason: `rerank: mean ${m.mean.toFixed(2)} < ${RERANK_TRIGGER} over ${m.n} evals` };
  }

  // 4. CONTINUE -- default (empty/partial window, healthy mean, no fail streak).
  return { action: "continue", reason: "continue: no stop/replan/rerank condition met" };
}
