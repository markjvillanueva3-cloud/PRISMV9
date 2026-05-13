/**
 * auto-learn-budget-guard — engine-direct tests (U-ALL11 verifies_via)
 *
 * Pure-function coverage of evaluateBudget, loadState, recordDispatch.
 * Spec § U-ALL11 ≥ 5 tests: under-cap, at-cap, over-cap, cost-cap,
 * counter reset at UTC midnight. Extended to 16 cases for
 * variability + adversarial coverage.
 *
 * Uses node:test (not vitest) — matches the convention used by
 * sibling hook tests like action-triple-sync.test.mjs.
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  evaluateBudget,
  loadState,
  recordDispatch,
  utcDayKey,
  DEFAULT_DAILY_DISPATCHES,
  DEFAULT_DAILY_COST_USD,
  SCHEMA_VERSION,
} from "../auto-learn-budget-guard.mjs";

const T0 = Date.UTC(2026, 4, 13, 12, 0, 0);

function state(dispatches = 0, cost_usd = 0, dayKey = utcDayKey(T0)) {
  return { schemaVersion: SCHEMA_VERSION, dayKey, dispatches, cost_usd };
}

test("evaluateBudget UNDER CAP: dispatches=5, cap=12 → allow remaining=7", () => {
  const r = evaluateBudget({ state: state(5, 0) });
  assert.equal(r.decision, "allow");
  assert.equal(r.remaining_dispatches, 7);
});

test("evaluateBudget AT CAP: dispatches=12, cap=12 → block (inclusive ceiling)", () => {
  const r = evaluateBudget({ state: state(12, 0) });
  assert.equal(r.decision, "block");
  assert.equal(r.reason, "dispatch_budget_exhausted");
});

test("evaluateBudget OVER CAP: dispatches=15, cap=12 → block", () => {
  const r = evaluateBudget({ state: state(15, 0) });
  assert.equal(r.decision, "block");
  assert.equal(r.reason, "dispatch_budget_exhausted");
});

test("evaluateBudget COST CAP: cost+estimated > $20 → block as cost_budget_exhausted", () => {
  const r = evaluateBudget({ state: state(3, 19), estimatedCostUsd: 2 });
  assert.equal(r.decision, "block");
  assert.equal(r.reason, "cost_budget_exhausted");
});

test("evaluateBudget COST WITHIN BUDGET: cost+estimated <= $20 → allow", () => {
  const r = evaluateBudget({ state: state(3, 15), estimatedCostUsd: 2 });
  assert.equal(r.decision, "allow");
  assert.equal(r.remaining_cost_usd, 5);
});

test("evaluateBudget custom caps: dispatchCap=3 overrides default", () => {
  const r = evaluateBudget({ state: state(5, 0), dispatchCap: 3 });
  assert.equal(r.decision, "block");
});

test("evaluateBudget variability 1/12/100 daily caps + cost caps", () => {
  assert.equal(evaluateBudget({ state: state(0, 0), dispatchCap: 1 }).decision, "allow");
  assert.equal(evaluateBudget({ state: state(1, 0), dispatchCap: 1 }).decision, "block");
  assert.equal(evaluateBudget({ state: state(50, 0), dispatchCap: 100 }).decision, "allow");
  assert.equal(evaluateBudget({ state: state(0, 4.99), dispatchCap: 12, costCap: 5 }).decision, "allow");
  assert.equal(evaluateBudget({ state: state(0, 5), dispatchCap: 12, costCap: 5, estimatedCostUsd: 0.01 }).decision, "block");
});

test("loadState RESET AT UTC MIDNIGHT: yesterday's state → fresh today", () => {
  const json = JSON.stringify({ schemaVersion: SCHEMA_VERSION, dayKey: "2026-05-12", dispatches: 12, cost_usd: 15 });
  const r = loadState(json, () => T0);
  assert.equal(r.dayKey, "2026-05-13");
  assert.equal(r.dispatches, 0);
  assert.equal(r.cost_usd, 0);
});

test("loadState same-day → preserved verbatim", () => {
  const json = JSON.stringify({ schemaVersion: SCHEMA_VERSION, dayKey: "2026-05-13", dispatches: 5, cost_usd: 7.5 });
  const r = loadState(json, () => T0);
  assert.equal(r.dispatches, 5);
  assert.equal(r.cost_usd, 7.5);
});

test("loadState corrupt JSON → fresh state", () => {
  const r = loadState("not-json{", () => T0);
  assert.equal(r.dispatches, 0);
});

test("loadState schemaVersion mismatch → fresh state (forward-compat refusal)", () => {
  const r = loadState(JSON.stringify({ schemaVersion: 999, dayKey: "2026-05-13", dispatches: 5, cost_usd: 5 }), () => T0);
  assert.equal(r.dispatches, 0);
});

test("loadState empty input → fresh state", () => {
  const r = loadState("", () => T0);
  assert.equal(r.dispatches, 0);
  assert.equal(r.dayKey, "2026-05-13");
});

test("recordDispatch increments dispatches by 1 + adds cost", () => {
  const s = state(3, 5);
  const r = recordDispatch(s, 2.5);
  assert.equal(r.dispatches, 4);
  assert.equal(r.cost_usd, 7.5);
});

test("recordDispatch non-numeric/negative cost clamps to 0", () => {
  const s = state(3, 5);
  assert.equal(recordDispatch(s, -1).cost_usd, 5);
  assert.equal(recordDispatch(s, "x").cost_usd, 5);
});

test("utcDayKey returns canonical YYYY-MM-DD in UTC", () => {
  assert.equal(utcDayKey(Date.UTC(2026, 0, 1, 0, 0, 0)), "2026-01-01");
  assert.equal(utcDayKey(Date.UTC(2026, 11, 31, 23, 59, 59)), "2026-12-31");
});

test("defaults match spec § U-ALL11 (12 dispatches/day, $20/day)", () => {
  assert.equal(DEFAULT_DAILY_DISPATCHES, 12);
  assert.equal(DEFAULT_DAILY_COST_USD, 20);
});
