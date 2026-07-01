// Tests for goal-loss-function-detect.mjs -- the deterministic unbounded-/goal
// detector. Real intent checks (R9): each asserts WHY the classification matters,
// not a hardcoded echo. Happy + >=3 failure modes + >=2 adversarial (R15).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectMissingLossFunction,
  extractGoalText,
  LOSS_FUNCTION_NUDGE,
} from "./goal-loss-function-detect.mjs";

// --- HAPPY: the exact session-be279b4f pathology must be caught ---
test("unbounded prose goal (the real session goal) fires the nudge", () => {
  const g = "improve ai systems, deep learning, nn, gnn, lora across all galaxies and ensure they're all synergized";
  const r = detectMissingLossFunction(g);
  assert.equal(r.unbounded, true, "open-ended verb + no check => unbounded");
  assert.equal(r.hasCheckSignal, false);
  assert.equal(r.hasOpenEndedVerb, true);
});

// --- BOUNDED: any measurable check suppresses the nudge ---
test("bounded by a runnable command is suppressed", () => {
  const r = detectMissingLossFunction("get vitest run green and tsc --noEmit clean");
  assert.equal(r.unbounded, false);
  assert.equal(r.hasCheckSignal, true, "vitest/tsc are runnable check signals");
});

test("bounded by a metric+threshold is suppressed", () => {
  const r = detectMissingLossFunction("improve the GNN until AUROC >= 0.78 on the holdout");
  assert.equal(r.unbounded, false, "a metric gate is a real loss function even with 'improve'");
  assert.equal(r.hasCheckSignal, true);
});

test("bounded by an explicit --check flag is suppressed", () => {
  const r = detectMissingLossFunction("improve coverage --check 'npm run test'");
  assert.equal(r.unbounded, false);
  assert.equal(r.hasCheckSignal, true);
});

// --- ADVERSARIAL ---
test("adversarial: open-ended verb but a percentage target is NOT unbounded", () => {
  // "improve coverage to 90%" -- has an open-ended verb but 90% IS a measurable gate.
  const r = detectMissingLossFunction("improve coverage to 90%");
  assert.equal(r.unbounded, false, "a numeric target is a loss function");
  assert.equal(r.hasCheckSignal, true);
});

test("adversarial: short concrete goal with no verb and no check is NOT nagged", () => {
  // The conservative branch -- we must not false-positive on every checkless goal.
  const r = detectMissingLossFunction("add a logout button to the navbar");
  assert.equal(r.unbounded, false, "no open-ended verb => not the pathology class");
  assert.equal(r.hasOpenEndedVerb, false);
});

test("adversarial: production-ready prose with no check fires", () => {
  const r = detectMissingLossFunction("make the quoting galaxy production-ready and comprehensive");
  assert.equal(r.unbounded, true);
});

test("adversarial: 'improve until the audit is 34/34' is bounded by the ratio", () => {
  const r = detectMissingLossFunction("improve until the audit is 34/34");
  assert.equal(r.unbounded, false, "34/34 ratio is a concrete terminal state");
  assert.equal(r.hasCheckSignal, true);
});

// --- BOUNDARY: ambiguous machining nouns (recall/precision/coverage/loss) ---
test("bare ambiguous metric WORDS do NOT suppress unbounded prose", () => {
  // These are everyday domain nouns here -- they count as a check ONLY with an
  // adjacent number. Bare => the goal is still unbounded and SHOULD be nudged.
  for (const g of [
    "improve recall of the search across all galaxies",
    "improve precision machining quotes for all galaxies",
    "improve coverage across every galaxy",
    "improve the loss-leader pricing across all galaxies",
  ]) {
    assert.equal(detectMissingLossFunction(g).unbounded, true, `bare metric word must NOT bound: ${g}`);
  }
});

test("the SAME metric words WITH a number/threshold ARE bounded", () => {
  for (const g of [
    "improve recall to >= 0.9 across galaxies",
    "improve coverage to 90% everywhere",
  ]) {
    assert.equal(detectMissingLossFunction(g).unbounded, false, `metric + number must bound: ${g}`);
  }
});

// --- EDGE CASES: empty / null / sub-command ---
test("empty / null / sub-command text never fires", () => {
  assert.equal(detectMissingLossFunction("").unbounded, false);
  assert.equal(detectMissingLossFunction(null).unbounded, false);
  assert.equal(detectMissingLossFunction(undefined).unbounded, false);
  assert.equal(detectMissingLossFunction("complete").unbounded, false);
  assert.equal(detectMissingLossFunction("status").unbounded, false);
});

test("return shape is stable (4 typed keys, never throws)", () => {
  const r = detectMissingLossFunction("synergize everything");
  assert.deepEqual(Object.keys(r).sort(), ["hasCheckSignal", "hasOpenEndedVerb", "reason", "unbounded"]);
  assert.equal(typeof r.unbounded, "boolean");
  assert.equal(typeof r.reason, "string");
});

// --- extractGoalText: slices the args after the LAST /goal ---
test("extractGoalText returns empty for a bare /goal resume (no inline goal)", () => {
  assert.equal(extractGoalText("/loop [10] /goal").trim(), "");
  assert.equal(extractGoalText("/checkin-tango /loop [10] /goal").trim(), "");
  assert.equal(extractGoalText("just some text with no goal token"), "");
});

test("extractGoalText returns the inline goal args", () => {
  const slice = extractGoalText("/goal improve everything across all galaxies");
  assert.match(slice, /improve everything across all galaxies/);
});

// --- INTEGRATION: prompt -> slice -> classify (the hook's real path) ---
test("integration: bare /goal resume does NOT fire (slice is empty)", () => {
  const r = detectMissingLossFunction(extractGoalText("/loop [10] /goal"));
  assert.equal(r.unbounded, false, "no inline goal text => nothing to nag");
});

test("integration: inline unbounded /goal fires", () => {
  const r = detectMissingLossFunction(extractGoalText("/goal improve ai systems across all galaxies and synergize everything"));
  assert.equal(r.unbounded, true);
});

// --- nudge content ---
test("LOSS_FUNCTION_NUDGE is ASCII, names the doctrine, and shows examples", () => {
  assert.match(LOSS_FUNCTION_NUDGE, /LOSS-FUNCTION CHECK/);
  assert.match(LOSS_FUNCTION_NUDGE, /feedback_goal_needs_loss_function/);
  assert.match(LOSS_FUNCTION_NUDGE, /vitest run/);
  // ASCII-only (no smart glyphs that break PS 5.1 / grep)
  assert.ok(/^[\x09\x0A\x20-\x7E]*$/.test(LOSS_FUNCTION_NUDGE), "nudge must be pure ASCII");
});
