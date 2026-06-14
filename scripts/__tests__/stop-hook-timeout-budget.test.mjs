import { test } from "node:test";
import assert from "node:assert/strict";
import { newBudget, shouldRunHook, recordHookRun, reportBudget, DEFAULT_TOTAL_BUDGET_MS } from "../lib/stop-hook-timeout-budget.mjs";

test("newBudget: defaults applied", () => {
  const b = newBudget();
  assert.equal(b.totalBudgetMs, DEFAULT_TOTAL_BUDGET_MS);
  assert.deepEqual(b.hooksFired, []);
});
test("shouldRunHook: fresh budget allows", () => {
  const b = newBudget(5000, 800, 1000);
  assert.equal(shouldRunHook(b, "h1", 1500).allow, true);
});
test("shouldRunHook: budget exhausted denies", () => {
  const b = newBudget(5000, 800, 1000);
  const r = shouldRunHook(b, "h1", 7000);
  assert.equal(r.allow, false);
  assert.ok(r.reason.includes("total-budget"));
});
test("shouldRunHook: re-fire denies", () => {
  let b = newBudget(5000, 800, 1000);
  b = recordHookRun(b, "h1", 200, 1500);
  const r = shouldRunHook(b, "h1", 2000);
  assert.equal(r.allow, false);
  assert.ok(r.reason.includes("already fired"));
});
test("shouldRunHook: different hook allowed even after one ran", () => {
  let b = newBudget(5000, 800, 1000);
  b = recordHookRun(b, "h1", 200, 1500);
  assert.equal(shouldRunHook(b, "h2", 2000).allow, true);
});
test("shouldRunHook: null budget → allow with no-budget reason", () => {
  assert.equal(shouldRunHook(null, "h1").allow, true);
});

test("recordHookRun: appends to hooksFired", () => {
  let b = newBudget(5000, 800, 1000);
  b = recordHookRun(b, "h1", 250, 1300);
  assert.equal(b.hooksFired.length, 1);
  assert.equal(b.hooksFired[0].name, "h1");
  assert.equal(b.hooksFired[0].elapsedMs, 250);
});
test("recordHookRun: null budget creates new one", () => {
  const b = recordHookRun(null, "h1", 100);
  assert.ok(b.hooksFired.length === 1);
});

test("reportBudget: aggregates elapsed", () => {
  let b = newBudget(5000, 800, 1000);
  b = recordHookRun(b, "h1", 200, 1500);
  b = recordHookRun(b, "h2", 300, 2000);
  const r = reportBudget(b, 2500);
  assert.equal(r.hooksFiredCount, 2);
  assert.equal(r.sumHookElapsedMs, 500);
  assert.equal(r.totalElapsedMs, 1500);
  assert.equal(r.overBudget, false);
});
test("reportBudget: detects over-budget", () => {
  const b = newBudget(1000, 200, 0);
  const r = reportBudget(b, 1500);
  assert.equal(r.overBudget, true);
});
test("reportBudget: null budget → null", () => {
  assert.equal(reportBudget(null), null);
});
