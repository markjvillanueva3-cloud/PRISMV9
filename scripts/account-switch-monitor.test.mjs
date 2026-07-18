/**
 * account-switch-monitor.test.mjs -- node:test suite for the pure exports.
 *
 * Run:
 *   node --test scripts/account-switch-monitor.test.mjs
 *
 * No I/O, no coordinator import -- tests only the two pure functions.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { applyEnabled, shapeRecord } from "./account-switch-monitor.mjs";

// ---------------------------------------------------------------------------
// applyEnabled
// ---------------------------------------------------------------------------

test('applyEnabled: "1" returns true', () => {
  assert.equal(applyEnabled({ PRISM_ACCT_SWITCH_AUTO_APPLY: "1" }), true);
});

test('applyEnabled: "0" returns false', () => {
  assert.equal(applyEnabled({ PRISM_ACCT_SWITCH_AUTO_APPLY: "0" }), false);
});

test('applyEnabled: empty string returns false', () => {
  assert.equal(applyEnabled({ PRISM_ACCT_SWITCH_AUTO_APPLY: "" }), false);
});

test('applyEnabled: undefined key returns false', () => {
  assert.equal(applyEnabled({}), false);
});

// ---------------------------------------------------------------------------
// shapeRecord -- switched
// ---------------------------------------------------------------------------

test("shapeRecord switched: status switched, fields populated", () => {
  const res = {
    switched: true,
    fiveHourPct: 0.93,
    threshold: 0.9,
    source: "sidecar",
    reason: "at-or-above-threshold",
    autoSwap: true,
    swap: { ok: true, mode: "actuated", to: "acctB" },
    restartPlan: ["alpha", "bravo"],
    advisory: null,
  };
  const rec = shapeRecord(res, { apply: true, at: "2026-06-15T00:00:00.000Z" });
  assert.equal(rec.status, "switched");
  assert.equal(rec.switched, true);
  assert.equal(rec.fiveHourPct, 0.93);
  assert.equal(rec.threshold, 0.9);
  assert.equal(rec.swap.to, "acctB");
  assert.equal(rec.swap.mode, "actuated");
  assert.equal(rec.swap.ok, true);
  assert.deepEqual(rec.restartPlan, ["alpha", "bravo"]);
  assert.equal(rec.apply, true);
  assert.equal(rec.at, "2026-06-15T00:00:00.000Z");
});

// ---------------------------------------------------------------------------
// shapeRecord -- below-threshold
// ---------------------------------------------------------------------------

test("shapeRecord below-threshold: status below-threshold", () => {
  const res = {
    switched: false,
    fiveHourPct: 0.45,
    threshold: 0.9,
    source: "sidecar",
    reason: "below-threshold",
    autoSwap: true,
    swap: null,
    restartPlan: [],
  };
  const rec = shapeRecord(res, { apply: false, at: "2026-06-15T01:00:00.000Z" });
  assert.equal(rec.status, "below-threshold");
  assert.equal(rec.switched, false);
  assert.equal(rec.fiveHourPct, 0.45);
  assert.equal(rec.swap, null);
  assert.deepEqual(rec.restartPlan, []);
});

// ---------------------------------------------------------------------------
// shapeRecord -- not-armed (FIVE_HOUR_SOURCE_UNAVAILABLE)
// ---------------------------------------------------------------------------

test("shapeRecord not-armed: FIVE_HOUR_SOURCE_UNAVAILABLE -> status not-armed, code preserved", () => {
  const err = new Error("no 5h source calibrated");
  err.code = "FIVE_HOUR_SOURCE_UNAVAILABLE";
  const rec = shapeRecord(null, { apply: false, at: "2026-06-15T02:00:00.000Z", error: err });
  assert.equal(rec.status, "not-armed");
  assert.equal(rec.code, "FIVE_HOUR_SOURCE_UNAVAILABLE");
  assert.equal(rec.apply, false);
  assert(rec.message.includes("no 5h source"));
});

// ---------------------------------------------------------------------------
// shapeRecord -- generic error
// ---------------------------------------------------------------------------

test("shapeRecord generic error: code BOOM -> status error", () => {
  const err = new Error("unexpected failure");
  err.code = "BOOM";
  const rec = shapeRecord(null, { apply: false, at: "2026-06-15T03:00:00.000Z", error: err });
  assert.equal(rec.status, "error");
  assert.equal(rec.code, "BOOM");
  assert.equal(rec.switched, undefined);
});

// ---------------------------------------------------------------------------
// shapeRecord -- message truncation
// ---------------------------------------------------------------------------

test("shapeRecord message truncation: >400 chars -> record.message.length <= 400", () => {
  const err = new Error("x".repeat(800));
  err.code = "LONG_ERROR";
  const rec = shapeRecord(null, { apply: false, at: "2026-06-15T04:00:00.000Z", error: err });
  assert.ok(rec.message.length <= 400, `message.length=${rec.message.length} should be <=400`);
});

// ---------------------------------------------------------------------------
// shapeRecord -- fiveHourPct null passthrough
// ---------------------------------------------------------------------------

test("shapeRecord: fiveHourPct null when res.fiveHourPct is undefined", () => {
  const res = {
    switched: false,
    // fiveHourPct intentionally omitted
    threshold: 0.9,
    source: "sidecar",
    reason: "below-threshold",
    autoSwap: false,
    swap: null,
    restartPlan: [],
  };
  const rec = shapeRecord(res, { apply: false, at: "2026-06-15T05:00:00.000Z" });
  assert.equal(rec.fiveHourPct, null);
});

// ---------------------------------------------------------------------------
// shapeRecord -- error without .code property
// ---------------------------------------------------------------------------

test("shapeRecord: error without .code -> code 'error', status 'error'", () => {
  const err = new Error("plain error");
  // no .code set
  const rec = shapeRecord(null, { apply: false, at: "2026-06-15T06:00:00.000Z", error: err });
  assert.equal(rec.code, "error");
  assert.equal(rec.status, "error");
});
