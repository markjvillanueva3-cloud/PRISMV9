/**
 * Tests for injection-budget-snapshot-refresh.mjs -- pure decision-logic coverage.
 *
 * TOKEN-EFFICIENCY-INJECT/U-INJECTION-BUDGET-REFRESH (slot:bravo 2026-06-11).
 * Real concrete-value assertions; fs + clock injected (no spawning).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_INTERVAL_MS,
  DEFAULT_COOLDOWN_MS,
  intervalFromEnv,
  cooldownFromEnv,
  ageOfFile,
  decideRefresh,
} from "../injection-budget-snapshot-refresh.mjs";

describe("intervalFromEnv", () => {
  it("defaults to 12h", () => {
    assert.equal(intervalFromEnv({}), DEFAULT_INTERVAL_MS);
    assert.equal(DEFAULT_INTERVAL_MS, 12 * 60 * 60 * 1000);
  });
  it("honors a positive override", () => {
    assert.equal(intervalFromEnv({ PRISM_INJECTION_BUDGET_REFRESH_INTERVAL_MS: "1000" }), 1000);
  });
  it("ignores zero / non-numeric", () => {
    assert.equal(intervalFromEnv({ PRISM_INJECTION_BUDGET_REFRESH_INTERVAL_MS: "0" }), DEFAULT_INTERVAL_MS);
    assert.equal(intervalFromEnv({ PRISM_INJECTION_BUDGET_REFRESH_INTERVAL_MS: "x" }), DEFAULT_INTERVAL_MS);
  });
});

describe("cooldownFromEnv", () => {
  it("defaults to 30m", () => {
    assert.equal(cooldownFromEnv({}), DEFAULT_COOLDOWN_MS);
    assert.equal(DEFAULT_COOLDOWN_MS, 30 * 60 * 1000);
  });
  it("honors a positive override", () => {
    assert.equal(cooldownFromEnv({ PRISM_INJECTION_BUDGET_REFRESH_COOLDOWN_MS: "5000" }), 5000);
  });
});

describe("ageOfFile", () => {
  it("computes age from a numeric-ms field", () => {
    const fsImpl = { readFileSync: () => JSON.stringify({ lastAttemptMs: 1000 }) };
    assert.equal(ageOfFile("x", "lastAttemptMs", { fsImpl, nowMs: 5000 }), 4000);
  });
  it("computes age from an ISO-string field", () => {
    const fsImpl = { readFileSync: () => JSON.stringify({ measured_at: "2026-06-11T00:00:00.000Z" }) };
    assert.equal(ageOfFile("x", "measured_at", { fsImpl, nowMs: Date.parse("2026-06-11T01:00:00.000Z") }), 3600000);
  });
  it("Infinity when file unreadable", () => {
    assert.equal(ageOfFile("x", "f", { fsImpl: { readFileSync() { throw new Error("ENOENT"); } } }), Infinity);
  });
  it("Infinity when field absent", () => {
    assert.equal(ageOfFile("x", "f", { fsImpl: { readFileSync: () => JSON.stringify({ other: 1 }) } }), Infinity);
  });
  it("Infinity on unparseable JSON", () => {
    assert.equal(ageOfFile("x", "f", { fsImpl: { readFileSync: () => "{bad" } }), Infinity);
  });
});

describe("decideRefresh", () => {
  const base = { snapshotAgeMs: 99e9, lastAttemptAgeMs: 99e9, interval: DEFAULT_INTERVAL_MS, cooldown: DEFAULT_COOLDOWN_MS, disabled: false };

  it("refreshes when snapshot stale + no recent fleet attempt", () => {
    assert.equal(decideRefresh(base).refresh, true);
  });
  it("skips when disabled (even if stale)", () => {
    assert.equal(decideRefresh({ ...base, disabled: true }).refresh, false);
  });
  it("skips when snapshot fresh (age <= interval)", () => {
    assert.equal(decideRefresh({ ...base, snapshotAgeMs: 1000 }).refresh, false);
  });
  it("skips when another fleet attempt is within cooldown (storm guard)", () => {
    assert.equal(decideRefresh({ ...base, lastAttemptAgeMs: 1000 }).refresh, false);
  });
  it("refreshes just past the interval boundary", () => {
    assert.equal(decideRefresh({ ...base, snapshotAgeMs: DEFAULT_INTERVAL_MS + 1 }).refresh, true);
  });
  it("does NOT refresh exactly at the interval (<= is fresh)", () => {
    assert.equal(decideRefresh({ ...base, snapshotAgeMs: DEFAULT_INTERVAL_MS }).refresh, false);
  });
});
