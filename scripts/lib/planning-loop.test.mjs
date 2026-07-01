// Tests for planning-loop.mjs (U1). Real values; every assertion fails on a real
// decision regression (R9). The decision core is pure -- no mocks needed.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decidePlanningAction,
  RERANK_WINDOW,
  RERANK_TRIGGER,
  REPLAN_THRESHOLD,
  MAX_REPLANS,
} from "./planning-loop.mjs";

// ---- STOP-first dominance (the termination guarantee) ----
test("STOP: exhausted dominates everything (even a fail streak)", () => {
  const r = decidePlanningAction({ exhausted: true, consecutiveFails: 5, recentEvals: [0, 0, 0] });
  assert.equal(r.action, "stop");
  assert.match(r.reason, /exhausted/);
});
test("STOP: budgetRemaining<=0 dominates a would-be replan", () => {
  const r = decidePlanningAction({ budgetRemaining: 0, consecutiveFails: 9 });
  assert.equal(r.action, "stop");
  assert.match(r.reason, /budget/);
});
test("STOP: negative budget also stops", () => {
  assert.equal(decidePlanningAction({ budgetRemaining: -3 }).action, "stop");
});

// ---- REPLAN beats RERANK when both would fire ----
test("REPLAN: 2 consecutive fails triggers replan even with a low eval window", () => {
  // low mean would fire RERANK, but the fail streak wins
  const r = decidePlanningAction({ consecutiveFails: REPLAN_THRESHOLD, recentEvals: [0, 0, 0], budgetRemaining: 10 });
  assert.equal(r.action, "replan");
});
test("REPLAN: single transient fail does NOT replan (threshold is 2)", () => {
  const r = decidePlanningAction({ consecutiveFails: 1, recentEvals: [1, 1, 1], budgetRemaining: 10 });
  assert.equal(r.action, "continue");
});

// ---- max-replans demotion to stop (replan cannot loop forever) ----
test("STOP: replan streak at MAX_REPLANS demotes to stop", () => {
  const r = decidePlanningAction({ consecutiveFails: 4, replansSoFar: MAX_REPLANS, budgetRemaining: 10 });
  assert.equal(r.action, "stop");
  assert.match(r.reason, /max-replans/);
});
test("REPLAN: one below the cap still replans", () => {
  const r = decidePlanningAction({ consecutiveFails: 4, replansSoFar: MAX_REPLANS - 1, budgetRemaining: 10 });
  assert.equal(r.action, "replan");
});

// ---- RERANK window behavior ----
test("RERANK: full window below trigger re-ranks", () => {
  const r = decidePlanningAction({ recentEvals: [0, 0, 1], consecutiveFails: 0, budgetRemaining: 10 });
  // mean = 0.33 < 0.4
  assert.equal(r.action, "rerank");
});
test("RERANK: full window AT/above trigger continues (healthy enough)", () => {
  const r = decidePlanningAction({ recentEvals: [1, 0, 1], consecutiveFails: 0, budgetRemaining: 10 });
  // mean = 0.67 >= 0.4
  assert.equal(r.action, "continue");
});
test("RERANK: empty window -> continue (no single-sample oscillation)", () => {
  assert.equal(decidePlanningAction({ recentEvals: [], budgetRemaining: 10 }).action, "continue");
});
test("RERANK: partial window (< RERANK_WINDOW) -> continue", () => {
  const partial = Array(RERANK_WINDOW - 1).fill(0);
  assert.equal(decidePlanningAction({ recentEvals: partial, budgetRemaining: 10 }).action, "continue");
});

// ---- adversarial / robustness ----
test("null-filter: non-finite entries are ignored in the mean", () => {
  // [0,0,NaN,null,1] -> finite [0,0,1] -> mean 0.33 < 0.4 -> rerank
  const r = decidePlanningAction({ recentEvals: [0, 0, NaN, null, 1], budgetRemaining: 10 });
  assert.equal(r.action, "rerank");
});
test("all-null evals -> no finite window -> continue (never crashes)", () => {
  const r = decidePlanningAction({ recentEvals: [null, undefined, NaN], budgetRemaining: 10 });
  assert.equal(r.action, "continue");
});
test("degenerate empty input -> continue (defaults are safe)", () => {
  assert.equal(decidePlanningAction().action, "continue");
  assert.equal(decidePlanningAction({}).action, "continue");
});
test("non-finite consecutiveFails is treated as 0 (no spurious replan)", () => {
  const r = decidePlanningAction({ consecutiveFails: NaN, recentEvals: [1, 1, 1], budgetRemaining: 10 });
  assert.equal(r.action, "continue");
});
test("constants are the documented sound values (regression oracle)", () => {
  assert.equal(RERANK_WINDOW, 3);
  assert.equal(RERANK_TRIGGER, 0.4); // NOT 0.6 -- binary eval source
  assert.equal(REPLAN_THRESHOLD, 2);
  assert.equal(MAX_REPLANS, 3);
});
