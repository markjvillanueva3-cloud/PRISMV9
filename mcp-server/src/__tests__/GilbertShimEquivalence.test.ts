/**
 * GilbertShimEquivalence — SF-PSN-WIRE-MS0/U-SFPSN-05 regression gate.
 *
 * Verifies that the new `gilbertOptimalSpeed` (which delegates to
 * `GilbertMRRModel.calculateOptimalSpeed()` via the behaviour-preserving
 * shim) returns outputs bit-equivalent to the OLD inline formula at every
 * realistic input combination the engine's public API would ever pass.
 *
 * The OLD inline formula is embedded below as `oldGilbertOptimalSpeed`,
 * taken verbatim from UltimateSpeedFeedEngine.ts lines 1615-1627 AS THEY
 * EXISTED PRE-U-SFPSN-05 (the inline body BEFORE the shim refactor — the
 * line range refers to the pre-refactor file; the post-refactor exported
 * shim lives in a similar location but the line numbers will have drifted).
 * DO NOT EDIT this function — it is the frozen regression baseline. Any future evolution of the shim
 * must keep `gilbertOptimalSpeed()`'s outputs identical to it (within
 * float ε).
 *
 * Pattern: identical to U-SFPSN-02A's KienzleShimEquivalence.test.ts.
 * Because U-SFPSN-05 is a verbatim formula relocation (the inline body
 * moved verbatim into GilbertMRRModel.calculateOptimalSpeed), bit-equivalent
 * agreement at 1e-12 relative tolerance is the *expected* outcome — any
 * divergence indicates a transcription error or accidental algebra change.
 *
 * Coverage: 100 fixtures = 5 Taylor-n × 4 Taylor-C × 5 economic-scenarios.
 * Plus 5 dedicated boundary/clamp tests.
 *
 * Tolerance: relative |new - old| / max(1, |old|) ≤ 1e-12 (bit-equivalent
 * modulo floating-point ordering — both paths compute identical expressions).
 */

import { describe, it, expect } from "vitest";
import { gilbertOptimalSpeed } from "../engines/UltimateSpeedFeedEngine.js";

// ─── Frozen baseline: OLD inline formula from pre-U-SFPSN-05 ────────────────
//
// FROZEN — do not edit. Engineering edits to the SHIM must keep this function's
// outputs identical (within float ε). If you change the FORMULA itself (not the
// composition), this baseline must change in lockstep AND U-SFPSN-05 spec must
// be revisited.
function oldGilbertOptimalSpeed(
  n: number, C: number, machineCostPerMin: number,
  toolCost: number, changeTime_min: number, cutTime_min: number,
): { V_min_cost: number; V_max_prod: number; T_min_cost: number; cost_per_part_optimal: number } {
  const T_opt = Math.max(1, ((1 / n) - 1) * (toolCost / Math.max(0.01, machineCostPerMin) + changeTime_min));
  const V_cost = C * Math.pow(T_opt, -n);
  const T_prod = Math.max(1, ((1 / n) - 1) * changeTime_min);
  const V_prod = C * Math.pow(T_prod, -n);
  const partsPerLife = Math.max(1, Math.floor(T_opt / Math.max(0.1, cutTime_min)));
  const costPerPart = machineCostPerMin * cutTime_min + toolCost / partsPerLife;
  return { V_min_cost: V_cost, V_max_prod: V_prod, T_min_cost: T_opt, cost_per_part_optimal: costPerPart };
}

// ─── Fixture generation ─────────────────────────────────────────────────────

interface Fixture {
  n: number; C: number;
  machineCostPerMin: number; toolCost: number;
  changeTime_min: number; cutTime_min: number;
  scenario: string;
}

// Realistic Taylor-n range: HSS≈0.10, uncoated carbide≈0.18, coated carbide≈0.25,
// cermet≈0.32, ceramic≈0.40. Boundary at n→0.5 covered in dedicated tests.
const TAYLOR_N = [0.10, 0.18, 0.25, 0.32, 0.40];

// Taylor C span (m/min): low-end aluminum/HSS-on-steel ~ 100; carbide-on-steel
// ~ 250; carbide-on-aluminum ~ 450; coated carbide on free-machining ~ 700.
const TAYLOR_C = [100, 250, 450, 700];

// Five realistic shop scenarios:
//   - small-shop: low rate, cheap HSS endmill, manual change, normal cycle
//   - production: medium rate, indexable insert, quick change, fast cycle
//   - aerospace: high rate, ceramic insert, slow setup, long cycle
//   - high-volume: medium rate, indexable, fast change, fast cycle
//   - boundary: triggers machineCostPerMin floor (0.005 → 0.01)
//                  AND cutTime_min floor (0.05 → 0.1)
const SCENARIOS = [
  { machineCostPerMin: 0.50, toolCost:  5, changeTime_min: 1,   cutTime_min: 5,    scenario: "small-shop" },
  { machineCostPerMin: 1.00, toolCost: 20, changeTime_min: 2,   cutTime_min: 1,    scenario: "production" },
  { machineCostPerMin: 1.50, toolCost: 50, changeTime_min: 5,   cutTime_min: 30,   scenario: "aerospace" },
  { machineCostPerMin: 0.75, toolCost: 10, changeTime_min: 1.5, cutTime_min: 0.5,  scenario: "high-volume" },
  { machineCostPerMin: 0.005, toolCost: 30, changeTime_min: 3,  cutTime_min: 0.05, scenario: "boundary-floors" },
];

const FIXTURES: Fixture[] = [];
for (const n of TAYLOR_N) {
  for (const C of TAYLOR_C) {
    for (const s of SCENARIOS) {
      FIXTURES.push({ n, C, ...s });
    }
  }
}

// ─── Equivalence assertion ──────────────────────────────────────────────────

const REL_TOLERANCE = 1e-12;  // bit-equivalent within float epsilon

function relDiff(a: number, b: number): number {
  return Math.abs(a - b) / Math.max(1, Math.abs(b));
}

function callOld(fx: Fixture) {
  return oldGilbertOptimalSpeed(fx.n, fx.C, fx.machineCostPerMin, fx.toolCost, fx.changeTime_min, fx.cutTime_min);
}
function callNew(fx: Fixture) {
  return gilbertOptimalSpeed(fx.n, fx.C, fx.machineCostPerMin, fx.toolCost, fx.changeTime_min, fx.cutTime_min);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("U-SFPSN-05 — GilbertMRRModel shim bit-equivalence to inline baseline", () => {
  it("generated 100 fixtures across 5 Taylor-n × 4 Taylor-C × 5 scenarios", () => {
    expect(FIXTURES.length).toBe(100);
    expect(FIXTURES.every(f => f.n > 0 && f.n < 0.5)).toBe(true);
    expect(FIXTURES.every(f => f.C > 0)).toBe(true);
    expect(new Set(FIXTURES.map(f => f.scenario)).size).toBe(5);
  });

  it("V_min_cost matches inline baseline to ≤1e-12 relative on every fixture", () => {
    const failures: Array<{ fx: Fixture; old: number; neu: number; rel: number }> = [];
    for (const fx of FIXTURES) {
      const oldR = callOld(fx);
      const neuR = callNew(fx);
      const rel = relDiff(neuR.V_min_cost, oldR.V_min_cost);
      if (rel > REL_TOLERANCE) failures.push({ fx, old: oldR.V_min_cost, neu: neuR.V_min_cost, rel });
    }
    if (failures.length > 0) {
      const sample = failures.slice(0, 5).map(f =>
        `[${f.fx.scenario} n=${f.fx.n} C=${f.fx.C}] old=${f.old.toFixed(6)} new=${f.neu.toFixed(6)} rel=${f.rel.toExponential(3)}`,
      ).join("\n  ");
      throw new Error(`${failures.length}/${FIXTURES.length} V_min_cost fixtures exceed ${REL_TOLERANCE} relative tolerance. First 5:\n  ${sample}`);
    }
    expect(failures.length).toBe(0);
  });

  it("V_max_prod matches inline baseline to ≤1e-12 relative on every fixture", () => {
    const failures: number[] = [];
    for (const fx of FIXTURES) {
      const oldR = callOld(fx);
      const neuR = callNew(fx);
      if (relDiff(neuR.V_max_prod, oldR.V_max_prod) > REL_TOLERANCE) failures.push(FIXTURES.indexOf(fx));
    }
    expect(failures).toEqual([]);
  });

  it("T_min_cost matches inline baseline to ≤1e-12 relative on every fixture", () => {
    const failures: number[] = [];
    for (const fx of FIXTURES) {
      const oldR = callOld(fx);
      const neuR = callNew(fx);
      if (relDiff(neuR.T_min_cost, oldR.T_min_cost) > REL_TOLERANCE) failures.push(FIXTURES.indexOf(fx));
    }
    expect(failures).toEqual([]);
  });

  it("cost_per_part_optimal matches inline baseline to ≤1e-12 relative on every fixture", () => {
    const failures: number[] = [];
    for (const fx of FIXTURES) {
      const oldR = callOld(fx);
      const neuR = callNew(fx);
      if (relDiff(neuR.cost_per_part_optimal, oldR.cost_per_part_optimal) > REL_TOLERANCE) failures.push(FIXTURES.indexOf(fx));
    }
    expect(failures).toEqual([]);
  });

  // ─── Clamp boundary tests ──────────────────────────────────────────────

  it("T_opt floor (1 min) engages bit-identically when (1/n - 1) × cost_ratio < 1", () => {
    // At n=0.49, the Taylor multiplier (1/n - 1) ≈ 1.0408. To force T_opt < 1
    // we drive the cost_ratio below ~0.96: toolCost/machine + changeTime → small.
    // (0.05/1 + 0.5 = 0.55) × 1.0408 ≈ 0.572 — well below the 1-min floor.
    // Both shim and baseline must clamp to 1 (otherwise V_cost = C × 1^(-n) = C).
    const fx: Fixture = { n: 0.49, C: 200, machineCostPerMin: 1.0, toolCost: 0.05, changeTime_min: 0.5, cutTime_min: 5, scenario: "T_opt-clamp" };
    const oldR = oldGilbertOptimalSpeed(fx.n, fx.C, fx.machineCostPerMin, fx.toolCost, fx.changeTime_min, fx.cutTime_min);
    const neuR = gilbertOptimalSpeed(fx.n, fx.C, fx.machineCostPerMin, fx.toolCost, fx.changeTime_min, fx.cutTime_min);
    // Verify the clamp actually fired (unclamped expression < 1).
    const unclamped = ((1 / fx.n) - 1) * (fx.toolCost / Math.max(0.01, fx.machineCostPerMin) + fx.changeTime_min);
    expect(unclamped).toBeLessThan(1);
    // Both implementations clamp at 1.
    expect(oldR.T_min_cost).toBe(1);
    expect(neuR.T_min_cost).toBe(1);
    // Bit-equivalence on all 4 outputs.
    expect(relDiff(neuR.V_min_cost, oldR.V_min_cost)).toBeLessThan(REL_TOLERANCE);
    expect(relDiff(neuR.V_max_prod, oldR.V_max_prod)).toBeLessThan(REL_TOLERANCE);
    expect(relDiff(neuR.cost_per_part_optimal, oldR.cost_per_part_optimal)).toBeLessThan(REL_TOLERANCE);
  });

  it("machineCostPerMin floor (0.01) engages bit-identically when input < 0.01", () => {
    // machineCostPerMin = 0.005 → floor at 0.01. Both implementations must use
    // the same effective denominator in the cost-ratio.
    const fx: Fixture = { n: 0.25, C: 300, machineCostPerMin: 0.005, toolCost: 20, changeTime_min: 2, cutTime_min: 5, scenario: "machine-floor" };
    const oldR = callOld(fx);
    const neuR = callNew(fx);
    expect(relDiff(neuR.V_min_cost, oldR.V_min_cost)).toBeLessThan(REL_TOLERANCE);
    expect(relDiff(neuR.T_min_cost, oldR.T_min_cost)).toBeLessThan(REL_TOLERANCE);
    // Verify the floor changed the math: with effective 0.01, the cost_ratio
    // is (toolCost/0.01 + changeTime) = 2002, dramatically lifting T_opt.
    const T_opt_effective = ((1 / fx.n) - 1) * (fx.toolCost / 0.01 + fx.changeTime_min);
    expect(neuR.T_min_cost).toBeCloseTo(T_opt_effective, 6);
  });

  it("cutTime_min floor (0.1) engages bit-identically when input < 0.1", () => {
    // cutTime_min = 0.05 → floor at 0.1 inside the partsPerLife computation.
    // The cost_per_part_optimal also uses cutTime_min DIRECTLY (no floor) —
    // both implementations must preserve this asymmetry.
    const fx: Fixture = { n: 0.30, C: 400, machineCostPerMin: 1.0, toolCost: 15, changeTime_min: 2, cutTime_min: 0.05, scenario: "cut-floor" };
    const oldR = callOld(fx);
    const neuR = callNew(fx);
    expect(relDiff(neuR.cost_per_part_optimal, oldR.cost_per_part_optimal)).toBeLessThan(REL_TOLERANCE);
    // Document the asymmetry in cost_per_part_optimal:
    //   parts = floor(T_opt / max(0.1, cutTime)) = floor(T_opt / 0.1)
    //   cost  = machineCost × cutTime + toolCost / parts  ← cutTime NOT floored
    // So cost_per_part_optimal reflects the literal 0.05 cutTime, not 0.1.
    const parts = Math.max(1, Math.floor(oldR.T_min_cost / 0.1));
    const expectedCost = fx.machineCostPerMin * fx.cutTime_min + fx.toolCost / parts;
    expect(relDiff(neuR.cost_per_part_optimal, expectedCost)).toBeLessThan(REL_TOLERANCE);
  });

  it("partsPerLife floor (1) engages bit-identically when T_opt < cutTime_min", () => {
    // Same parameter set as the T_opt-clamp test: T_opt clamped to 1, cutTime_min = 5
    // → floor(max(1, 5⁻¹)) = floor(0.2) = 0 → max(1, 0) = 1 (partsPerLife floor fires).
    // Both implementations must keep cost_per_part = machineCost×cutTime + toolCost/1.
    const fx: Fixture = { n: 0.49, C: 200, machineCostPerMin: 1.0, toolCost: 0.05, changeTime_min: 0.5, cutTime_min: 5, scenario: "parts-floor" };
    const oldR = callOld(fx);
    const neuR = callNew(fx);
    expect(oldR.T_min_cost).toBe(1);  // confirms T_opt clamp fired
    // With parts=1: cost = machineCost × cutTime + toolCost = 1×5 + 0.05 = 5.05.
    expect(oldR.cost_per_part_optimal).toBeCloseTo(5.05, 9);
    expect(relDiff(neuR.cost_per_part_optimal, oldR.cost_per_part_optimal)).toBeLessThan(REL_TOLERANCE);
  });

  it("V_max_prod independence from toolCost: changing toolCost changes V_min_cost but not V_max_prod", () => {
    // V_max_prod = C × T_prod^(-n), and T_prod = max(1, (1/n-1) × changeTime) — no toolCost.
    // This is a structural property of the formula; both implementations must preserve.
    const base: Fixture = { n: 0.25, C: 300, machineCostPerMin: 1.0, toolCost: 20, changeTime_min: 2, cutTime_min: 5, scenario: "Vprod-invariant" };
    const variant: Fixture = { ...base, toolCost: 50 };
    const oldB = callOld(base), oldV = callOld(variant);
    const neuB = callNew(base), neuV = callNew(variant);
    // V_min_cost SHOULD change with toolCost.
    expect(oldB.V_min_cost).not.toBeCloseTo(oldV.V_min_cost, 4);
    expect(neuB.V_min_cost).not.toBeCloseTo(neuV.V_min_cost, 4);
    // V_max_prod must NOT change with toolCost.
    expect(oldB.V_max_prod).toBeCloseTo(oldV.V_max_prod, 12);
    expect(neuB.V_max_prod).toBeCloseTo(neuV.V_max_prod, 12);
    // Shim agrees with baseline on both.
    expect(relDiff(neuB.V_max_prod, oldB.V_max_prod)).toBeLessThan(REL_TOLERANCE);
  });

  // ─── Envelope condition ────────────────────────────────────────────────

  it("milestone exit condition: 50+ fixtures × all 4 output channels within 1e-6 (envelope target)", () => {
    // Restates the milestone's exit_condition #2 ("50+ fixtures all within 1e-6")
    // and verifies satisfaction simultaneously across all 4 output channels.
    expect(FIXTURES.length).toBeGreaterThanOrEqual(50);
    const envTol = 1e-6;
    for (const fx of FIXTURES) {
      const oldR = callOld(fx);
      const neuR = callNew(fx);
      expect(relDiff(neuR.V_min_cost,            oldR.V_min_cost))            .toBeLessThan(envTol);
      expect(relDiff(neuR.V_max_prod,            oldR.V_max_prod))            .toBeLessThan(envTol);
      expect(relDiff(neuR.T_min_cost,            oldR.T_min_cost))            .toBeLessThan(envTol);
      expect(relDiff(neuR.cost_per_part_optimal, oldR.cost_per_part_optimal)) .toBeLessThan(envTol);
    }
  });
});
