// TOKEN-AWARENESS-MS0 / U-TA08 — Stop advisory hook tests.

import { test } from "node:test";
import assert from "node:assert/strict";
import { decideAdvisory } from "../token-awareness-stop-advisory.mjs";

test("decideAdvisory — null state → no advisory", () => {
  assert.equal(decideAdvisory({ state: null, nowMs: 0 }), null);
});

test("decideAdvisory — GREEN → no advisory", () => {
  const r = decideAdvisory({
    state: { zone: "GREEN", worstSource: "ctx", worstPct: 0.1 },
    nowMs: 0,
  });
  assert.equal(r, null);
});

test("decideAdvisory — YELLOW → no advisory (only RED+)", () => {
  const r = decideAdvisory({
    state: { zone: "YELLOW", worstSource: "ctx", worstPct: 0.7 },
    nowMs: 0,
  });
  assert.equal(r, null);
});

test("decideAdvisory — RED → warning advisory", () => {
  const r = decideAdvisory({
    state: { zone: "RED", worstSource: "ctx", worstPct: 0.88, reasoning: "near hard limit" },
    nowMs: 0,
  });
  assert.ok(r);
  assert.equal(r.severity, "warning");
  assert.match(r.summary, /RED on exit/);
  assert.equal(r.worstSource, "ctx");
});

test("decideAdvisory — CRITICAL → critical advisory", () => {
  const r = decideAdvisory({
    state: { zone: "CRITICAL", worstSource: "5h", worstPct: 0.97 },
    nowMs: 0,
  });
  assert.equal(r.severity, "critical");
  assert.match(r.summary, /CRITICAL on exit/);
});

test("decideAdvisory — cooldown active → no advisory", () => {
  const nowMs = Date.parse("2026-05-20T12:00:00Z");
  const r = decideAdvisory({
    state: { zone: "RED", worstSource: "ctx", worstPct: 0.88 },
    cooldownEntry: { lastAdvisoryAt: new Date(nowMs - 5 * 60 * 1000).toISOString() }, // 5min ago
    nowMs,
    cooldownMs: 30 * 60 * 1000,
  });
  assert.equal(r, null);
});

test("decideAdvisory — cooldown expired → advisory emits", () => {
  const nowMs = Date.parse("2026-05-20T12:00:00Z");
  const r = decideAdvisory({
    state: { zone: "RED", worstSource: "ctx", worstPct: 0.88 },
    cooldownEntry: { lastAdvisoryAt: new Date(nowMs - 45 * 60 * 1000).toISOString() }, // 45min ago
    nowMs,
    cooldownMs: 30 * 60 * 1000,
  });
  assert.ok(r);
  assert.equal(r.severity, "warning");
});

test("decideAdvisory — adversarial: missing reasoning → fallback text", () => {
  const r = decideAdvisory({
    state: { zone: "RED", worstSource: "ctx", worstPct: 0.88 },
    nowMs: 0,
  });
  assert.ok(r.detail);
  assert.match(r.detail, /budget/);
});

test("decideAdvisory — adversarial: missing worstPct → 0", () => {
  const r = decideAdvisory({
    state: { zone: "RED", worstSource: "ctx" },
    nowMs: 0,
  });
  assert.equal(r.worstPct, 0);
});

test("regression: severity mapping must not invert (CRITICAL ≠ warning)", () => {
  const crit = decideAdvisory({
    state: { zone: "CRITICAL", worstSource: "ctx", worstPct: 0.97 },
    nowMs: 0,
  });
  const red = decideAdvisory({
    state: { zone: "RED", worstSource: "ctx", worstPct: 0.88 },
    nowMs: 0,
  });
  assert.equal(crit.severity, "critical");
  assert.equal(red.severity, "warning");
  assert.notEqual(crit.severity, red.severity);
});
