/**
 * wedm-program-test-gates.mjs — Phase C: the CLOSED-LOOP TEST runner.
 *
 * Per WEDM-PRINT-TO-PROGRAM-PIPELINE-2026-05-31.md §4: every generated wire-EDM
 * program runs the full gate stack before it is accepted; results feed the
 * outcome ledger -> retrain trigger. This is the "fully closed loop testing" core.
 *
 * The 6 gates (numbered per the spec):
 *   1. cascade_correctness — H-offset strictly-decreasing / taper-zero / oracle-match
 *      (run HERE via the Regimen #3 harness — the load-bearing, code-checkable gate).
 *   2. feasibility        — vs the FA-10S envelope (validateAgainstEnvelope) [INJECTED]
 *   3. inventory          — can JM cut today? (checkStockForJob)              [INJECTED]
 *   4. discharge_safety   — S(x) >= 0.98 (WEDMLoRASafetyEvaluatorEngine)       [INJECTED]
 *   5. dimensional        — emitted contour vs print feature card             [INJECTED]
 *   6. post_lint          — dialect lint on emitted .cps (post-nc-dialect-lint) [INJECTED]
 *
 * Pure-core + injected reader: gate 1 (cascade) is run here (imports the harness);
 * gates 2-6 are computed by the .ts pipeline caller (they need TS engines / the
 * registry / stock seed) and passed in as gate results. The composer is pure +
 * fully node:test-able. No ${...} template literals (scripts/ security hook).
 *
 * @module scripts/lib/wedm-program-test-gates
 */
import { checkCascade } from "./wedm-cascade-correctness.mjs";

/** Normalize one gate to { gate, pass, blockers }. */
function gate(name, pass, blockers) {
  return { gate: name, pass: Boolean(pass), blockers: Array.isArray(blockers) ? blockers : (blockers ? [String(blockers)] : []) };
}

/** Gate 1 — cascade correctness, run here via the Regimen #3 harness. */
export function runCascadeGate(scheduleTextOrPasses, opts = {}) {
  const r = checkCascade(scheduleTextOrPasses, opts);
  return gate("cascade_correctness", r.valid, r.violations.map((v) => v.rule + "@pass" + v.pass));
}

/** Adapter — wrap a validateAgainstEnvelope() result into a gate. */
export function envelopeGate(envResult) {
  return gate("feasibility", envResult && envResult.feasible, envResult && envResult.blockers);
}

/** Adapter — wrap a checkStockForJob() result into a gate. */
export function inventoryGate(stockResult) {
  return gate("inventory", stockResult && stockResult.can_cut, stockResult && stockResult.blockers);
}

/** Min fraction of non-empty lines that must be cascade pass-lines for the
 *  emitted program to count as "well-formed" (not noise around a valid subseq). */
export const MIN_CASCADE_COHERENCE = 0.5;

/**
 * Gate — the emitted text must be PREDOMINANTLY a cascade: >= 2 pass-lines AND
 * at least MIN_CASCADE_COHERENCE of the non-empty lines are pass-lines. This
 * rejects garbled model output that merely CONTAINS a valid monotonic cascade
 * subsequence amid noise (R12 hardening — the cascade gate alone is too lenient
 * for grading raw model generations). Pure; runs on the schedule text.
 */
export function wellFormedGate(scheduleText) {
  const text = typeof scheduleText === "string" ? scheduleText : "";
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return gate("well_formed", false, ["empty output"]);
  const passLines = lines.filter((l) => /pass\s+\d+/i.test(l) && /offset/i.test(l));
  if (passLines.length < 2) return gate("well_formed", false, ["fewer than 2 cascade pass-lines (" + passLines.length + ")"]);
  const coherence = passLines.length / lines.length;
  if (coherence < MIN_CASCADE_COHERENCE) return gate("well_formed", false, ["mostly non-cascade noise (coherence " + coherence.toFixed(2) + " < " + MIN_CASCADE_COHERENCE + ")"]);
  return gate("well_formed", true, []);
}

/**
 * Compose any set of gate results into one closed-loop verdict. A program is
 * ACCEPTED only when EVERY present gate passes (per spec: single AP003 = FAIL).
 * `gates` is an array of { gate, pass, blockers }. Returns the outcome record.
 */
export function composeProgramTestGates(gates) {
  const list = (Array.isArray(gates) ? gates : []).filter(Boolean);
  if (list.length === 0) return { pass: false, total: 0, passed: 0, failed_gates: ["no_gates_run"], blockers: ["no gates were run"], gates: [] };
  const failed = list.filter((g) => !g.pass);
  const blockers = [];
  for (const g of failed) for (const b of g.blockers) blockers.push(g.gate + ": " + b);
  return {
    pass: failed.length === 0,
    total: list.length,
    passed: list.length - failed.length,
    failed_gates: failed.map((g) => g.gate),
    blockers,
    gates: list,
  };
}

/**
 * Convenience: run the full closed-loop test for a wire-EDM program. Gate 1
 * (cascade) is computed here; gates 2-6 are passed as already-computed results
 * (the pipeline caller wires the TS engines). Any omitted gate is skipped, not failed.
 */
export function runClosedLoopTest(input = {}) {
  const gates = [];
  if (input.scheduleText != null || input.passes != null) {
    gates.push(runCascadeGate(input.scheduleText ?? input.passes, { taper: input.taper, expected: input.expected }));
    // well-formed coherence check only applies to raw text (not pre-parsed passes).
    if (typeof input.scheduleText === "string") gates.push(wellFormedGate(input.scheduleText));
  }
  if (input.envelopeResult) gates.push(envelopeGate(input.envelopeResult));
  if (input.inventoryResult) gates.push(inventoryGate(input.inventoryResult));
  if (input.safetyResult) gates.push(gate("discharge_safety", input.safetyResult.pass, input.safetyResult.blockers));
  if (input.dimensionalResult) gates.push(gate("dimensional", input.dimensionalResult.pass, input.dimensionalResult.blockers));
  if (input.postLintResult) gates.push(gate("post_lint", input.postLintResult.pass, input.postLintResult.blockers));
  return composeProgramTestGates(gates);
}
