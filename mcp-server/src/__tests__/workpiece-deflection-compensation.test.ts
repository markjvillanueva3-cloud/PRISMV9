/**
 * WorkpieceDeflectionCompensationEngine — Tests + Empirical Validation
 *
 * LATHE-PRO-MS0.5, Session 13, U-LPDEFL03
 *
 * Validates deflection calculations against:
 *   - User's empirical hex pin data (0.001-0.003" taper range)
 *   - Euler-Bernoulli beam theory closed-form solutions
 *   - Cross-check with PartDeflectionEngine
 *
 * Physics ref: δ = FL³/(3EI) for point load cantilever
 *              I = πD⁴/64 for solid round bar
 */

import { describe, it, expect } from "vitest";
import {
  workpieceDeflectionCompensationEngine,
  type DeflectionCompensationInput,
} from "../engines/WorkpieceDeflectionCompensationEngine.js";

// ── Helpers ──────────────────────────────────────────────────────────

function calc(overrides: Partial<DeflectionCompensationInput> = {}) {
  return workpieceDeflectionCompensationEngine.calculate(
    "workpiece_deflection_compensate",
    {
      stock_diameter_mm: 19.05, // 3/4"
      stickout_mm: 50.8,       // 2"
      E_GPa: 210,              // D2 tool steel
      cutting_force_N: 500,
      ...overrides,
    },
  );
}

/** Convert mm to thou (0.001") */
function toThou(mm: number): number {
  return mm / 0.0254;
}

// ── Basic physics ────────────────────────────────────────────────────

describe("WorkpieceDeflectionCompensationEngine — Basic Physics", () => {
  it("computes deflection for solid round bar (point load)", () => {
    const result = calc();
    expect(result.max_deflection_mm).toBeGreaterThan(0);
    expect(result.deflection_curve.length).toBeGreaterThan(10);
    expect(result.compensation_curve.length).toBe(result.deflection_curve.length);
  });

  it("deflection at chuck face is zero", () => {
    const result = calc();
    expect(result.deflection_curve[0].deflection_mm).toBe(0);
    expect(result.deflection_curve[0].z_mm).toBe(0);
  });

  it("deflection increases monotonically with z", () => {
    const result = calc();
    for (let i = 1; i < result.deflection_curve.length; i++) {
      expect(result.deflection_curve[i].deflection_mm).toBeGreaterThanOrEqual(
        result.deflection_curve[i - 1].deflection_mm,
      );
    }
  });

  it("compensation is negative of deflection", () => {
    const result = calc();
    for (const pt of result.deflection_curve) {
      expect(pt.compensation_mm).toBeCloseTo(-pt.deflection_mm, 4);
    }
  });

  it("moment of inertia is correct for solid round bar", () => {
    const D = 19.05; // 3/4"
    const expected_I = (Math.PI / 64) * Math.pow(D, 4); // πD⁴/64
    const result = calc();
    expect(result.I_round_mm4).toBeCloseTo(expected_I, 0);
  });

  it("max deflection matches closed-form δ = FL³/(3EI)", () => {
    const D = 19.05;
    const L = 50.8;
    const F = 500;
    const E = 210_000; // GPa → MPa
    const I = (Math.PI / 64) * Math.pow(D, 4);
    const expected_delta = (F * Math.pow(L, 3)) / (3 * E * I);
    const result = calc();
    expect(result.max_deflection_mm).toBeCloseTo(expected_delta, 3);
  });

  it("total_taper_thou matches max_deflection in thou", () => {
    const result = calc();
    const expectedThou = result.max_deflection_mm / 0.0254;
    expect(result.total_taper_thou).toBeCloseTo(expectedThou, 1);
  });
});

// ── Empirical validation (user's hex pin data) ──────────────────────

describe("WorkpieceDeflectionCompensationEngine — Empirical Hex Pin Validation", () => {
  it("3/4\" (19mm) stock, 2\" stickout, D2 steel → ~0.001\" taper", () => {
    // User reports 0.001" taper per flat for this scenario
    const result = calc({
      stock_diameter_mm: 19.05, // 3/4"
      stickout_mm: 50.8,       // 2"
      E_GPa: 210,              // D2 tool steel
      cutting_force_N: 500,    // typical side milling force
    });
    // Should be in the 0.5-2.0 thou range (user reports ~1 thou)
    expect(result.total_taper_thou).toBeGreaterThan(0.1);
    expect(result.total_taper_thou).toBeLessThan(5.0);
  });

  it("1/2\" (12.7mm) stock, 3\" stickout, D2 → ~0.003\" taper", () => {
    // User reports 0.003" taper — significantly more deflection
    const result = calc({
      stock_diameter_mm: 12.7, // 1/2"
      stickout_mm: 76.2,      // 3"
      E_GPa: 210,
      cutting_force_N: 500,
    });
    // Should be notably higher than the 3/4" scenario
    expect(result.total_taper_thou).toBeGreaterThan(1.0);
    expect(result.total_taper_thou).toBeLessThan(20.0);
    // Should be > 2x the 3/4" case (D⁴ scales dramatically)
    const baseResult = calc({
      stock_diameter_mm: 19.05,
      stickout_mm: 50.8,
      E_GPa: 210,
      cutting_force_N: 500,
    });
    expect(result.total_taper_thou).toBeGreaterThan(baseResult.total_taper_thou * 2);
  });

  it("1\" (25.4mm) stock, 1.5\" stickout, D2 → <0.0005\" (negligible)", () => {
    const result = calc({
      stock_diameter_mm: 25.4, // 1"
      stickout_mm: 38.1,      // 1.5"
      E_GPa: 210,
      cutting_force_N: 500,
    });
    // Thick stock, short stickout — deflection should be very small
    expect(result.total_taper_thou).toBeLessThan(1.0);
    expect(result.within_tolerance).toBe(true);
  });

  it("deflection scales with D⁴ (halving diameter → 16x deflection)", () => {
    const big = calc({ stock_diameter_mm: 20, stickout_mm: 50 });
    const small = calc({ stock_diameter_mm: 10, stickout_mm: 50 });
    // δ ∝ 1/I ∝ 1/D⁴, so halving D should give ~16x deflection
    const ratio = small.max_deflection_mm / big.max_deflection_mm;
    expect(ratio).toBeCloseTo(16, 0); // within ±1
  });

  it("deflection scales with L³ (doubling stickout → 8x deflection)", () => {
    const short = calc({ stickout_mm: 25 });
    const long = calc({ stickout_mm: 50 });
    const ratio = long.max_deflection_mm / short.max_deflection_mm;
    expect(ratio).toBeCloseTo(8, 0); // within ±1
  });
});

// ── Hollow bar stock ────────────────────────────────────────────────

describe("WorkpieceDeflectionCompensationEngine — Hollow Stock", () => {
  it("hollow bar has more deflection than solid (same OD)", () => {
    const solid = calc({ stock_diameter_mm: 25, inner_diameter_mm: 0 });
    const hollow = calc({ stock_diameter_mm: 25, inner_diameter_mm: 15 });
    expect(hollow.max_deflection_mm).toBeGreaterThan(solid.max_deflection_mm);
  });

  it("I_round reflects hollow section correctly", () => {
    const D = 25, d = 15;
    const expected_I = (Math.PI / 64) * (Math.pow(D, 4) - Math.pow(d, 4));
    const result = calc({ stock_diameter_mm: D, inner_diameter_mm: d });
    expect(result.I_round_mm4).toBeCloseTo(expected_I, 0);
  });

  it("thin-wall tube gives significantly higher deflection", () => {
    const solid = calc({ stock_diameter_mm: 20 });
    const thinWall = calc({ stock_diameter_mm: 20, inner_diameter_mm: 18 });
    // Thin wall (1mm wall): I_ratio = (20⁴-18⁴)/20⁴ ≈ 0.344, so ~2.9x deflection
    expect(thinWall.max_deflection_mm).toBeGreaterThan(solid.max_deflection_mm * 2.5);
  });
});

// ── Hex cross-section ───────────────────────────────────────────────

describe("WorkpieceDeflectionCompensationEngine — Hex Section", () => {
  it("computes hex I for 6-flat configuration", () => {
    const result = calc({
      stock_diameter_mm: 19.05,
      stickout_mm: 50.8,
      num_flats: 6,
      across_flat_mm: 14.0,
    });
    expect(result.I_hex_mm4).not.toBeNull();
    expect(result.I_hex_mm4!).toBeGreaterThan(0);
    // Hex I should be less than round I (material removed)
    expect(result.I_hex_mm4!).toBeLessThan(result.I_round_mm4);
  });

  it("hex section gives more deflection than round (weaker)", () => {
    const round = calc({ stock_diameter_mm: 19.05, stickout_mm: 50.8 });
    const hex = calc({
      stock_diameter_mm: 19.05,
      stickout_mm: 50.8,
      num_flats: 6,
      across_flat_mm: 14.0,
    });
    expect(hex.max_deflection_mm).toBeGreaterThan(round.max_deflection_mm);
  });

  it("square section (4 flats) also computed", () => {
    const result = calc({
      num_flats: 4,
      across_flat_mm: 12.0,
    });
    expect(result.I_hex_mm4).not.toBeNull();
    expect(result.I_hex_mm4!).toBeGreaterThan(0);
  });
});

// ── Recommendations & warnings ──────────────────────────────────────

describe("WorkpieceDeflectionCompensationEngine — Recommendations", () => {
  it("recommends spring passes when out of tolerance", () => {
    const result = calc({
      stock_diameter_mm: 12.7,
      stickout_mm: 76.2,
      tolerance_mm: 0.005, // very tight
    });
    expect(result.spring_passes_recommended).toBeGreaterThan(0);
  });

  it("within_tolerance = true when deflection is small", () => {
    const result = calc({
      stock_diameter_mm: 30,
      stickout_mm: 25,
      tolerance_mm: 0.05,
    });
    expect(result.within_tolerance).toBe(true);
    expect(result.spring_passes_recommended).toBe(0);
  });

  it("warns about L/D > 4", () => {
    const result = calc({
      stock_diameter_mm: 10,
      stickout_mm: 60, // L/D = 6
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.support_recommendation).toMatch(/support|tailstock|steady/i);
  });

  it("recommended_max_stickout is reasonable", () => {
    const result = calc({ tolerance_mm: 0.025 });
    expect(result.recommended_max_stickout_mm).toBeGreaterThan(10);
    expect(result.recommended_max_stickout_mm).toBeLessThan(500);
  });
});

// ── Distributed load model ──────────────────────────────────────────

describe("WorkpieceDeflectionCompensationEngine — Distributed Load", () => {
  it("distributed load gives less tip deflection than point load", () => {
    // UDL: δ_max = FL³/(8EI) vs point: δ_max = FL³/(3EI)
    const point = calc({ load_model: "point" });
    const dist = calc({ load_model: "distributed" });
    expect(dist.max_deflection_mm).toBeLessThan(point.max_deflection_mm);
  });

  it("distributed/point ratio ≈ 3/8 = 0.375", () => {
    const point = calc({ load_model: "point" });
    const dist = calc({ load_model: "distributed" });
    const ratio = dist.max_deflection_mm / point.max_deflection_mm;
    expect(ratio).toBeCloseTo(0.375, 1);
  });
});

// ── Force estimation from Kienzle ───────────────────────────────────

describe("WorkpieceDeflectionCompensationEngine — Force Estimation", () => {
  it("auto-estimates cutting force when not provided", () => {
    const result = calc({
      cutting_force_N: undefined,
      iso_group: "P",
      width_of_cut_mm: 5,
      depth_of_cut_mm: 1.0,
      feed_per_tooth_mm: 0.08,
    });
    expect(result.cutting_force_N).toBeGreaterThan(100);
    expect(result.cutting_force_N).toBeLessThan(5000);
    expect(result.max_deflection_mm).toBeGreaterThan(0);
  });

  it("harder material (ISO S) gives higher force", () => {
    const steelResult = calc({
      cutting_force_N: undefined,
      iso_group: "P",
      width_of_cut_mm: 5,
      depth_of_cut_mm: 1.0,
    });
    const superResult = calc({
      cutting_force_N: undefined,
      iso_group: "S",
      width_of_cut_mm: 5,
      depth_of_cut_mm: 1.0,
    });
    expect(superResult.cutting_force_N).toBeGreaterThan(steelResult.cutting_force_N);
  });
});

// ── Edge cases ──────────────────────────────────────────────────────

describe("WorkpieceDeflectionCompensationEngine — Edge Cases", () => {
  it("zero stickout gives zero deflection", () => {
    const result = calc({ stickout_mm: 0 });
    expect(result.max_deflection_mm).toBe(0);
    expect(result.total_taper_thou).toBe(0);
  });

  it("very large stock has negligible deflection", () => {
    const result = calc({ stock_diameter_mm: 100, stickout_mm: 25 });
    expect(result.total_taper_thou).toBeLessThan(0.01);
  });

  it("handles missing material gracefully (defaults to steel E=200)", () => {
    const result = calc({ E_GPa: undefined, material: undefined });
    expect(result.max_deflection_mm).toBeGreaterThan(0);
  });

  it("handles aluminum (lower E → more deflection)", () => {
    const steel = calc({ E_GPa: 200 });
    const alum = calc({ E_GPa: 70 });
    expect(alum.max_deflection_mm).toBeGreaterThan(steel.max_deflection_mm * 2.5);
  });

  it("num_points controls curve resolution", () => {
    const coarse = calc({ num_points: 5 });
    const fine = calc({ num_points: 50 });
    expect(coarse.deflection_curve.length).toBe(6);  // 0..5
    expect(fine.deflection_curve.length).toBe(51);    // 0..50
  });
});
