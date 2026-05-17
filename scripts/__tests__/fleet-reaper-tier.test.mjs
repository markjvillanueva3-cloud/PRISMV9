/**
 * fleet-reaper-tier.test.mjs — FLEET-REAPER-MS1 / U-FR-TIER1-AGGRESSIVE-THRESHOLDS.
 *
 * Verifies the pure `tierFromPressure()` graduated memory-pressure gate that
 * replaced the prior binary `underPressure ? min(killAfter,1) : killAfter`.
 *
 * Coverage floor:
 *   - all three bands (normal / warn / critical) at production defaults
 *   - exact band boundaries (just-below / at / just-above warn and critical)
 *   - >= 3 failure modes (non-finite usedPct, negative usedPct, non-finite killAfter)
 *   - >= 2 adversarial inputs (criticalPct < warnPct misconfig, float killAfter)
 *   - the load-bearing monotonicity invariant: effectiveKillAfter is
 *     non-increasing as usedPct rises (more pressure never relaxes the gate)
 *   - byte-compatible behaviour vs the pre-MS1 binary gate below criticalPct
 *
 * Real reference values — no truthy-only stubs. Run: node --test <thisfile>
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tierFromPressure,
  DEFAULT_MEM_PRESSURE_PCT,
  DEFAULT_MEM_CRITICAL_PCT,
} from "../fleet-reaper-sweep.mjs";

const WARN = DEFAULT_MEM_PRESSURE_PCT; // 90
const CRIT = DEFAULT_MEM_CRITICAL_PCT; // 95

test("defaults are the documented 90 / 95", () => {
  assert.equal(WARN, 90);
  assert.equal(CRIT, 95);
});

test("normal band: usedPct below warn → full killAfter", () => {
  for (const used of [0, 10, 50, 89, 89.9]) {
    const r = tierFromPressure(used, WARN, CRIT, 2);
    assert.equal(r.tier, "normal", `used=${used}`);
    assert.equal(r.effectiveKillAfter, 2, `used=${used}`);
  }
});

test("warn band: [warn, critical) → killAfter capped to 1", () => {
  for (const used of [90, 90.0001, 92, 94, 94.999]) {
    const r = tierFromPressure(used, WARN, CRIT, 2);
    assert.equal(r.tier, "warn", `used=${used}`);
    assert.equal(r.effectiveKillAfter, 1, `used=${used}`);
  }
});

test("critical band: usedPct >= critical → reap this tick (0)", () => {
  for (const used of [95, 95.0001, 97, 100, 1000]) {
    const r = tierFromPressure(used, WARN, CRIT, 2);
    assert.equal(r.tier, "critical", `used=${used}`);
    assert.equal(r.effectiveKillAfter, 0, `used=${used}`);
  }
});

test("exact warn boundary is inclusive (>= warn enters warn band)", () => {
  assert.deepEqual(tierFromPressure(89.999, WARN, CRIT, 3),
    { tier: "normal", effectiveKillAfter: 3 });
  assert.deepEqual(tierFromPressure(90, WARN, CRIT, 3),
    { tier: "warn", effectiveKillAfter: 1 });
});

test("exact critical boundary is inclusive (>= critical enters critical band)", () => {
  assert.deepEqual(tierFromPressure(94.999, WARN, CRIT, 5),
    { tier: "warn", effectiveKillAfter: 1 });
  assert.deepEqual(tierFromPressure(95, WARN, CRIT, 5),
    { tier: "critical", effectiveKillAfter: 0 });
});

test("custom 80/95 banding from the original Tier-1 plan", () => {
  assert.equal(tierFromPressure(79.9, 80, 95, 2).tier, "normal");
  assert.equal(tierFromPressure(80, 80, 95, 2).tier, "warn");
  assert.equal(tierFromPressure(89, 80, 95, 2).tier, "warn");
  assert.equal(tierFromPressure(94.9, 80, 95, 2).tier, "warn");
  assert.equal(tierFromPressure(95, 80, 95, 2).tier, "critical");
  assert.equal(tierFromPressure(100, 80, 95, 2).tier, "critical");
});

test("FAILURE MODE: non-finite usedPct is fail-safe (no escalation)", () => {
  for (const used of [NaN, Infinity, -Infinity, null, undefined, "97"]) {
    const r = tierFromPressure(used, WARN, CRIT, 4);
    assert.equal(r.tier, "normal", `used=${String(used)}`);
    assert.equal(r.effectiveKillAfter, 4, `used=${String(used)}`);
  }
});

test("FAILURE MODE: negative usedPct treated as no-signal", () => {
  assert.deepEqual(tierFromPressure(-1, WARN, CRIT, 2),
    { tier: "normal", effectiveKillAfter: 2 });
  assert.deepEqual(tierFromPressure(-99999, WARN, CRIT, 2),
    { tier: "normal", effectiveKillAfter: 2 });
});

test("FAILURE MODE: non-finite killAfter floors to 0", () => {
  assert.equal(tierFromPressure(50, WARN, CRIT, NaN).effectiveKillAfter, 0);
  assert.equal(tierFromPressure(50, WARN, CRIT, Infinity).effectiveKillAfter, 0);
  assert.equal(tierFromPressure(50, WARN, CRIT, null).effectiveKillAfter, 0);
  assert.equal(tierFromPressure(50, WARN, CRIT, undefined).effectiveKillAfter, 0);
});

test("killAfter is floored at 0 and truncated toward zero", () => {
  assert.equal(tierFromPressure(10, WARN, CRIT, -5).effectiveKillAfter, 0);
  assert.equal(tierFromPressure(10, WARN, CRIT, 3.9).effectiveKillAfter, 3);
  // warn band with killAfter already <= 1 stays at killAfter (min(ka,1))
  assert.equal(tierFromPressure(92, WARN, CRIT, 1).effectiveKillAfter, 1);
  assert.equal(tierFromPressure(92, WARN, CRIT, 0).effectiveKillAfter, 0);
});

test("ADVERSARIAL: criticalPct < warnPct → critical floored up to warn (collapse, never invert)", () => {
  // crit (70) below warn (90): the warn band has zero width; >= warn is critical.
  const r1 = tierFromPressure(85, 90, 70, 2);
  assert.equal(r1.tier, "normal", "85 < warn(90) still normal");
  assert.equal(r1.effectiveKillAfter, 2);
  const r2 = tierFromPressure(90, 90, 70, 2);
  assert.equal(r2.tier, "critical", "at warn=90, with crit collapsed to 90, → critical");
  assert.equal(r2.effectiveKillAfter, 0);
  const r3 = tierFromPressure(99, 90, 70, 2);
  assert.equal(r3.tier, "critical");
  assert.equal(r3.effectiveKillAfter, 0);
});

test("EDGE: criticalPct === warnPct (degenerate equal bands) → empty warn band", () => {
  // No `<` → `<=` regression on the clamp guard: at crit==warn the warn band
  // has zero width, so >= warn is immediately critical.
  assert.deepEqual(tierFromPressure(89.999, 90, 90, 2),
    { tier: "normal", effectiveKillAfter: 2 });
  assert.deepEqual(tierFromPressure(90, 90, 90, 2),
    { tier: "critical", effectiveKillAfter: 0 });
});

test("ADVERSARIAL: non-finite warn/critical fall back to documented defaults", () => {
  // warn=NaN → 90, crit=NaN → 95
  assert.equal(tierFromPressure(89, NaN, NaN, 2).tier, "normal");
  assert.equal(tierFromPressure(90, NaN, NaN, 2).tier, "warn");
  assert.equal(tierFromPressure(95, NaN, NaN, 2).tier, "critical");
});

test("INVARIANT: effectiveKillAfter is non-increasing as usedPct rises", () => {
  // More memory pressure must never relax the reap gate (monotone non-increasing).
  let prev = Infinity;
  for (let used = 0; used <= 100; used += 0.5) {
    const { effectiveKillAfter } = tierFromPressure(used, WARN, CRIT, 7);
    assert.ok(
      effectiveKillAfter <= prev,
      `monotonicity broken at used=${used}: ${effectiveKillAfter} > ${prev}`,
    );
    prev = effectiveKillAfter;
  }
  assert.equal(prev, 0, "highest pressure must end at the critical floor (0)");
});

test("BACKWARD COMPAT: below criticalPct the gate is byte-identical to the pre-MS1 binary", () => {
  // Pre-MS1: effectiveKillAfter = (usedPct >= memPressurePct) ? min(killAfter,1) : killAfter
  const legacy = (used, warn, ka) =>
    Number.isFinite(used) && used >= warn ? Math.min(ka, 1) : ka;
  for (const used of [0, 50, 89.9, 90, 92, 94.99]) {
    const ms1 = tierFromPressure(used, WARN, CRIT, 2).effectiveKillAfter;
    assert.equal(ms1, legacy(used, WARN, 2), `parity break at used=${used}`);
  }
  // Only the new >= critical band diverges (legacy would give 1, MS1 gives 0).
  assert.equal(tierFromPressure(96, WARN, CRIT, 2).effectiveKillAfter, 0);
  assert.equal(legacy(96, WARN, 2), 1);
});
