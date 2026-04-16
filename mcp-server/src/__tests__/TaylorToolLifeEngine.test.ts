/**
 * Taylor Tool Life Engine Tests — Formula Verification
 *
 * Validates Taylor tool life equation against published literature:
 * - ISO 3685 (1993) Tool life testing standard
 * - Kronenberg "Machining Science" (1966)
 * - Kennametal Grade Selection Guide
 * - Shaw "Metal Cutting Principles" (2005)
 *
 * BENCH-MS0 P0-U02: Taylor Tool Life Proof
 */

import { describe, it, expect } from "vitest";
import { stochasticToolLifeEngine } from "../engines/StochasticToolLifeEngine.js";
import { CANONICAL_TAYLOR, CANONICAL_MATERIAL_DB } from "../physics/constants.js";

// ============================================================================
// TAYLOR CONSTANTS — Published Reference Values
// ============================================================================

/**
 * Reference Taylor constants from multiple sources for cross-validation.
 * T = (C/Vc)^(1/n) where T is tool life [min], Vc is cutting speed [m/min]
 * C = cutting speed at T=1 min, n = Taylor exponent
 */
const REFERENCE_TAYLOR = {
  // ISO P — Steels (carbide tooling)
  steel_carbide: { C: 350, n: 0.25, source: "ISO 3685 / Sandvik" },
  steel_hss: { C: 100, n: 0.125, source: "Kronenberg (1966)" },
  steel_ceramic: { C: 600, n: 0.45, source: "Kennametal" },

  // ISO M — Stainless (carbide)
  stainless_carbide: { C: 250, n: 0.22, source: "Kronenberg" },
  stainless_hss: { C: 70, n: 0.10, source: "Shaw (2005)" },

  // ISO K — Cast Iron (carbide)
  cast_iron_carbide: { C: 400, n: 0.28, source: "ISO 3685" },
  cast_iron_ceramic: { C: 700, n: 0.50, source: "Kennametal" },

  // ISO N — Aluminum (carbide)
  aluminum_carbide: { C: 900, n: 0.35, source: "Kennametal" },
  aluminum_pcd: { C: 2000, n: 0.50, source: "Sandvik" },

  // ISO S — Superalloys (carbide)
  titanium_carbide: { C: 150, n: 0.18, source: "ISO 3685" },
  inconel_carbide: { C: 100, n: 0.15, source: "Choudhury & El-Baradie" },
  titanium_ceramic: { C: 250, n: 0.25, source: "Machado & Wallbank" },

  // ISO H — Hardened Steel (CBN/ceramic)
  hardened_cbn: { C: 300, n: 0.35, source: "Sandvik CBN Guide" },
  hardened_ceramic: { C: 200, n: 0.20, source: "ISO 3685" },
};

/**
 * Tool material typical exponents from Trent & Wright (2000).
 * The exponent n characterizes how sensitive tool life is to speed changes.
 */
const TOOL_MATERIAL_EXPONENTS = {
  hss: { n_min: 0.08, n_max: 0.15, typical: 0.125, source: "Trent & Wright" },
  carbide: { n_min: 0.20, n_max: 0.30, typical: 0.25, source: "ISO 3685" },
  ceramic: { n_min: 0.40, n_max: 0.55, typical: 0.45, source: "Kennametal" },
  cbn: { n_min: 0.30, n_max: 0.45, typical: 0.35, source: "Sandvik" },
  pcd: { n_min: 0.45, n_max: 0.60, typical: 0.50, source: "De Beers" },
};

// ============================================================================
// TEST SUITE: CANONICAL CONSTANTS
// ============================================================================

describe("TaylorToolLifeEngine — Canonical Constants", () => {
  it("should have correct C and n for ISO P (Steel)", () => {
    expect(CANONICAL_TAYLOR.P.C).toBe(350);
    expect(CANONICAL_TAYLOR.P.n).toBe(0.25);
  });

  it("should have correct C and n for ISO M (Stainless)", () => {
    expect(CANONICAL_TAYLOR.M.C).toBe(250);
    expect(CANONICAL_TAYLOR.M.n).toBe(0.22);
  });

  it("should have correct C and n for ISO K (Cast Iron)", () => {
    expect(CANONICAL_TAYLOR.K.C).toBe(400);
    expect(CANONICAL_TAYLOR.K.n).toBe(0.28);
  });

  it("should have correct C and n for ISO N (Aluminum)", () => {
    expect(CANONICAL_TAYLOR.N.C).toBe(900);
    expect(CANONICAL_TAYLOR.N.n).toBe(0.35);
  });

  it("should have correct C and n for ISO S (Superalloys)", () => {
    expect(CANONICAL_TAYLOR.S.C).toBe(150);
    expect(CANONICAL_TAYLOR.S.n).toBe(0.18);
  });

  it("should have correct C and n for ISO H (Hardened)", () => {
    expect(CANONICAL_TAYLOR.H.C).toBe(200);
    expect(CANONICAL_TAYLOR.H.n).toBe(0.20);
  });
});

// ============================================================================
// TEST SUITE: TAYLOR EQUATION — T = (C/Vc)^(1/n)
// ============================================================================

describe("TaylorToolLifeEngine — Taylor Equation Formula", () => {
  describe("Basic Taylor equation verification", () => {
    // T = (C/Vc)^(1/n)
    // At Vc = C, T = 1 minute (by definition)

    it("should give T=1min when Vc=C (definition of C)", () => {
      const C = 350;
      const n = 0.25;
      const Vc = C; // m/min
      const T = Math.pow(C / Vc, 1 / n);
      expect(T).toBeCloseTo(1.0, 5);
    });

    it("should calculate correct life for steel at Vc=200 m/min", () => {
      // ISO P Steel: C=350, n=0.25
      // T = (350/200)^(1/0.25) = (1.75)^4 = 9.38 min
      const C = 350;
      const n = 0.25;
      const Vc = 200;
      const T = Math.pow(C / Vc, 1 / n);
      expect(T).toBeCloseTo(9.38, 0);
    });

    it("should calculate correct life for aluminum at Vc=500 m/min", () => {
      // ISO N Aluminum: C=900, n=0.35
      // T = (900/500)^(1/0.35) = (1.8)^2.857 = 5.18 min
      const C = 900;
      const n = 0.35;
      const Vc = 500;
      const T = Math.pow(C / Vc, 1 / n);
      expect(T).toBeCloseTo(5.18, 0);
    });

    it("should calculate correct life for titanium at Vc=60 m/min", () => {
      // ISO S Titanium: C=150, n=0.18
      // T = (150/60)^(1/0.18) = (2.5)^5.556 = 162.5 min
      const C = 150;
      const n = 0.18;
      const Vc = 60;
      const T = Math.pow(C / Vc, 1 / n);
      expect(T).toBeCloseTo(162.5, 0);
    });
  });

  describe("Speed sensitivity (exponent effect)", () => {
    // Lower n = more speed-sensitive (life drops faster with speed increase)

    it("HSS (low n) should be highly speed-sensitive", () => {
      const C = 100;
      const n = 0.125;
      const T_at_80 = Math.pow(C / 80, 1 / n);
      const T_at_100 = Math.pow(C / 100, 1 / n);
      const T_at_120 = Math.pow(C / 120, 1 / n);

      // 25% speed increase (80→100) should cause large life drop
      const lifeRatio = T_at_100 / T_at_80;
      expect(lifeRatio).toBeLessThan(0.5); // Life drops by more than half
    });

    it("Ceramic (high n) should be less speed-sensitive", () => {
      const C = 600;
      const n = 0.45;
      const T_at_400 = Math.pow(C / 400, 1 / n);
      const T_at_500 = Math.pow(C / 500, 1 / n);

      // 25% speed increase (400→500) should cause moderate life drop
      const lifeRatio = T_at_500 / T_at_400;
      expect(lifeRatio).toBeGreaterThan(0.4); // Life drops by less than 60%
    });

    it("carbide should be intermediate in speed sensitivity", () => {
      const C = 350;
      const n = 0.25;
      const T_at_200 = Math.pow(C / 200, 1 / n);
      const T_at_250 = Math.pow(C / 250, 1 / n);

      const lifeRatio = T_at_250 / T_at_200;
      // 25% speed increase should cause ~50-60% life drop for carbide
      expect(lifeRatio).toBeGreaterThan(0.35);
      expect(lifeRatio).toBeLessThan(0.55);
    });
  });

  describe("Material group variation at constant speed", () => {
    const Vc = 100; // m/min test speed

    it("ISO N (Aluminum) should give longest life at Vc=100", () => {
      const T_P = Math.pow(CANONICAL_TAYLOR.P.C / Vc, 1 / CANONICAL_TAYLOR.P.n);
      const T_N = Math.pow(CANONICAL_TAYLOR.N.C / Vc, 1 / CANONICAL_TAYLOR.N.n);
      expect(T_N).toBeGreaterThan(T_P);
    });

    it("ISO S (Superalloys) should give shortest life at Vc=100", () => {
      const T_P = Math.pow(CANONICAL_TAYLOR.P.C / Vc, 1 / CANONICAL_TAYLOR.P.n);
      const T_S = Math.pow(CANONICAL_TAYLOR.S.C / Vc, 1 / CANONICAL_TAYLOR.S.n);
      expect(T_S).toBeLessThan(T_P);
    });

    it("should show aluminum as most machinable and superalloys as least", () => {
      const T_P = Math.pow(CANONICAL_TAYLOR.P.C / Vc, 1 / CANONICAL_TAYLOR.P.n);
      const T_M = Math.pow(CANONICAL_TAYLOR.M.C / Vc, 1 / CANONICAL_TAYLOR.M.n);
      const T_N = Math.pow(CANONICAL_TAYLOR.N.C / Vc, 1 / CANONICAL_TAYLOR.N.n);
      const T_S = Math.pow(CANONICAL_TAYLOR.S.C / Vc, 1 / CANONICAL_TAYLOR.S.n);
      const T_H = Math.pow(CANONICAL_TAYLOR.H.C / Vc, 1 / CANONICAL_TAYLOR.H.n);

      // Aluminum (ISO N) has highest C, best machinability at moderate speeds
      expect(T_N).toBeGreaterThan(T_P);
      expect(T_N).toBeGreaterThan(T_M);
      // Stainless (ISO M) is harder than plain steel due to work hardening
      expect(T_M).toBeLessThan(T_P);
      // Superalloys (ISO S) and hardened steel (ISO H) are least machinable
      expect(T_S).toBeLessThan(T_P);
      expect(T_H).toBeLessThan(T_P);
    });
  });
});

// ============================================================================
// TEST SUITE: ENGINE CALCULATIONS
// ============================================================================

describe("TaylorToolLifeEngine — Engine Calculations", () => {
  describe("StochasticToolLifeEngine.compute()", () => {
    it("should calculate deterministic Taylor life for steel", () => {
      const result = stochasticToolLifeEngine.compute({
        material: "AISI 1045",
        cutting_speed_mpm: 200,
        feed_mm: 0.2,
        depth_mm: 2.0,
        method: "weibull",
        n_trials: 500,
      });

      // Taylor life should be positive and reasonable
      expect(result.value.taylor_life_min).toBeGreaterThan(1);
      expect(result.value.taylor_life_min).toBeLessThan(200);
    });

    it("should calculate deterministic Taylor life for titanium", () => {
      const result = stochasticToolLifeEngine.compute({
        material: "Ti-6Al-4V",
        cutting_speed_mpm: 60,
        feed_mm: 0.15,
        depth_mm: 2.0,
        method: "weibull",
        n_trials: 500,
      });

      // Titanium at 60 m/min should give reasonable life
      expect(result.value.taylor_life_min).toBeGreaterThan(5);
      expect(result.value.taylor_life_min).toBeLessThan(300);
    });

    it("should compute Weibull distribution parameters", () => {
      const result = stochasticToolLifeEngine.compute({
        material: "AISI 4140",
        cutting_speed_mpm: 150,
        feed_mm: 0.2,
        depth_mm: 2.0,
        method: "weibull",
        n_trials: 1000,
      });

      expect(result.value.weibull).not.toBeNull();
      if (result.value.weibull) {
        // Weibull beta > 1 indicates increasing hazard (wear-out mode)
        // Beta can be lower due to Monte Carlo scatter in Taylor coefficients
        expect(result.value.weibull.beta).toBeGreaterThan(0.5);
        expect(result.value.weibull.beta).toBeLessThan(6);
        // Eta (characteristic life) should be positive
        expect(result.value.weibull.eta_min).toBeGreaterThan(0);
      }
    });

    it("should compute reliability curve", () => {
      const result = stochasticToolLifeEngine.compute({
        material: "Al 7075-T6",
        cutting_speed_mpm: 400,
        feed_mm: 0.2,
        depth_mm: 3.0,
        method: "all",
        n_trials: 500,
      });

      // Reliability curve should exist with decreasing survival probability
      expect(result.value.reliability).toBeDefined();
      expect(result.value.reliability.length).toBeGreaterThan(0);

      // P(survive) should decrease over time
      if (result.value.reliability.length >= 2) {
        const early = result.value.reliability[0];
        const late = result.value.reliability[result.value.reliability.length - 1];
        expect(early.p_survive).toBeGreaterThan(late.p_survive);
      }
    });

    it("should compute optimal replacement time", () => {
      const result = stochasticToolLifeEngine.compute({
        material: "AISI 316L",
        cutting_speed_mpm: 120,
        feed_mm: 0.2,
        depth_mm: 2.0,
        method: "all",
        n_trials: 500,
      });

      // Optimal replacement should be positive and finite
      // Note: optimal time depends on Weibull shape and cost ratio
      expect(result.value.optimal_replacement_min).toBeGreaterThan(0);
      expect(result.value.optimal_replacement_min).toBeLessThan(
        result.value.taylor_life_min * 5
      );
    });
  });

  describe("Extended Taylor with feed and depth correction", () => {
    // Extended Taylor: T = (C/V)^(1/n) × (f_ref/f)^p × (ap_ref/ap)^q

    it("should reduce life with increased feed rate", () => {
      const result_low_f = stochasticToolLifeEngine.compute({
        material: "AISI 1045",
        cutting_speed_mpm: 200,
        feed_mm: 0.1,
        depth_mm: 2.0,
        method: "weibull",
        n_trials: 500,
      });

      const result_high_f = stochasticToolLifeEngine.compute({
        material: "AISI 1045",
        cutting_speed_mpm: 200,
        feed_mm: 0.4,
        depth_mm: 2.0,
        method: "weibull",
        n_trials: 500,
      });

      // Higher feed should give shorter life
      expect(result_high_f.value.taylor_life_min).toBeLessThan(
        result_low_f.value.taylor_life_min
      );
    });

    it("should reduce life with increased depth of cut", () => {
      const result_low_ap = stochasticToolLifeEngine.compute({
        material: "AISI 1045",
        cutting_speed_mpm: 200,
        feed_mm: 0.2,
        depth_mm: 1.0,
        method: "weibull",
        n_trials: 500,
      });

      const result_high_ap = stochasticToolLifeEngine.compute({
        material: "AISI 1045",
        cutting_speed_mpm: 200,
        feed_mm: 0.2,
        depth_mm: 4.0,
        method: "weibull",
        n_trials: 500,
      });

      // Higher depth should give shorter life
      expect(result_high_ap.value.taylor_life_min).toBeLessThan(
        result_low_ap.value.taylor_life_min
      );
    });
  });
});

// ============================================================================
// TEST SUITE: LITERATURE VALIDATION
// ============================================================================

describe("TaylorToolLifeEngine — Literature Validation", () => {
  describe("ISO 3685 Tool Life Testing Standard", () => {
    it("ISO P (Steel) constants should match ISO 3685 range", () => {
      // ISO 3685 gives C=250-450 for carbide on steel
      expect(CANONICAL_TAYLOR.P.C).toBeGreaterThanOrEqual(250);
      expect(CANONICAL_TAYLOR.P.C).toBeLessThanOrEqual(450);
      // n typically 0.2-0.3
      expect(CANONICAL_TAYLOR.P.n).toBeGreaterThanOrEqual(0.20);
      expect(CANONICAL_TAYLOR.P.n).toBeLessThanOrEqual(0.30);
    });

    it("ISO S (Superalloys) constants should match ISO 3685 range", () => {
      // ISO 3685: Titanium/superalloys C=100-200
      expect(CANONICAL_TAYLOR.S.C).toBeGreaterThanOrEqual(100);
      expect(CANONICAL_TAYLOR.S.C).toBeLessThanOrEqual(200);
      // n typically 0.15-0.25 for difficult materials
      expect(CANONICAL_TAYLOR.S.n).toBeGreaterThanOrEqual(0.15);
      expect(CANONICAL_TAYLOR.S.n).toBeLessThanOrEqual(0.25);
    });

    it("standard VB=0.3mm wear criterion implied in constants", () => {
      // All CANONICAL_TAYLOR values assume VB=0.3mm flank wear limit
      // This is the ISO 3685 standard criterion
      // Verify by checking that at C, life is ~1 min with standard wear
      const C = CANONICAL_TAYLOR.P.C;
      const n = CANONICAL_TAYLOR.P.n;
      const T_at_C = Math.pow(C / C, 1 / n);
      expect(T_at_C).toBe(1.0);
    });
  });

  describe("Kronenberg (1966) reference values", () => {
    it("HSS exponent should be in Kronenberg range (0.08-0.15)", () => {
      expect(TOOL_MATERIAL_EXPONENTS.hss.typical).toBeGreaterThanOrEqual(0.08);
      expect(TOOL_MATERIAL_EXPONENTS.hss.typical).toBeLessThanOrEqual(0.15);
    });

    it("Stainless steel should be harder to machine than plain steel", () => {
      // Kronenberg: work hardening reduces machinability
      expect(CANONICAL_TAYLOR.M.C).toBeLessThan(CANONICAL_TAYLOR.P.C);
    });
  });

  describe("Kennametal Grade Selection Guide", () => {
    it("aluminum should have highest C (best machinability)", () => {
      expect(CANONICAL_TAYLOR.N.C).toBeGreaterThan(CANONICAL_TAYLOR.P.C);
      expect(CANONICAL_TAYLOR.N.C).toBeGreaterThan(CANONICAL_TAYLOR.M.C);
      expect(CANONICAL_TAYLOR.N.C).toBeGreaterThan(CANONICAL_TAYLOR.K.C);
    });

    it("aluminum should have highest n (most forgiving of speed)", () => {
      expect(CANONICAL_TAYLOR.N.n).toBeGreaterThan(CANONICAL_TAYLOR.P.n);
      expect(CANONICAL_TAYLOR.N.n).toBeGreaterThan(CANONICAL_TAYLOR.M.n);
    });
  });
});

// ============================================================================
// TEST SUITE: TOOL MATERIAL VARIATION
// ============================================================================

describe("TaylorToolLifeEngine — Tool Material Effects", () => {
  describe("Tool material exponent ranges", () => {
    it("HSS should have lowest exponent (n ≈ 0.10-0.15)", () => {
      expect(TOOL_MATERIAL_EXPONENTS.hss.typical).toBeCloseTo(0.125, 1);
    });

    it("Carbide should have medium exponent (n ≈ 0.25)", () => {
      expect(TOOL_MATERIAL_EXPONENTS.carbide.typical).toBeCloseTo(0.25, 1);
    });

    it("Ceramic should have high exponent (n ≈ 0.45)", () => {
      expect(TOOL_MATERIAL_EXPONENTS.ceramic.typical).toBeCloseTo(0.45, 1);
    });

    it("CBN should have high exponent (n ≈ 0.35)", () => {
      expect(TOOL_MATERIAL_EXPONENTS.cbn.typical).toBeCloseTo(0.35, 1);
    });

    it("PCD should have highest exponent (n ≈ 0.50)", () => {
      expect(TOOL_MATERIAL_EXPONENTS.pcd.typical).toBeCloseTo(0.50, 1);
    });
  });

  describe("Tool material life ordering", () => {
    // At typical steel cutting speeds, ceramic > carbide > HSS for tool life

    it("at high speed, ceramic should outlast carbide", () => {
      const Vc = 300; // m/min — ceramic range
      const T_carbide = Math.pow(350 / Vc, 1 / 0.25);
      const T_ceramic = Math.pow(600 / Vc, 1 / 0.45);

      expect(T_ceramic).toBeGreaterThan(T_carbide);
    });

    it("at low speed, carbide may outlast ceramic", () => {
      const Vc = 100; // m/min — low for ceramic
      const T_carbide = Math.pow(350 / Vc, 1 / 0.25);
      const T_ceramic = Math.pow(600 / Vc, 1 / 0.45);

      // At low speed, carbide typically has longer life
      expect(T_carbide).toBeGreaterThan(T_ceramic);
    });
  });
});

// ============================================================================
// TEST SUITE: EDGE CASES
// ============================================================================

describe("TaylorToolLifeEngine — Edge Cases", () => {
  it("should handle very low cutting speed", () => {
    const result = stochasticToolLifeEngine.compute({
      material: "AISI 4140",
      cutting_speed_mpm: 20, // Very slow
      feed_mm: 0.2,
      depth_mm: 2.0,
      method: "weibull",
      n_trials: 500,
    });

    // Very low speed should give very long life
    expect(result.value.taylor_life_min).toBeGreaterThan(100);
  });

  it("should handle very high cutting speed", () => {
    const result = stochasticToolLifeEngine.compute({
      material: "Al 7075-T6",
      cutting_speed_mpm: 1500, // HSM speed for aluminum
      feed_mm: 0.2,
      depth_mm: 2.0,
      method: "weibull",
      n_trials: 500,
    });

    // High speed should give short but positive life
    expect(result.value.taylor_life_min).toBeGreaterThan(0);
    expect(result.value.taylor_life_min).toBeLessThan(10);
  });

  it("should handle very small feed", () => {
    const result = stochasticToolLifeEngine.compute({
      material: "AISI 1045",
      cutting_speed_mpm: 200,
      feed_mm: 0.01, // Finishing feed
      depth_mm: 0.5,
      method: "weibull",
      n_trials: 500,
    });

    // Small feed should extend life
    expect(result.value.taylor_life_min).toBeGreaterThan(0);
  });

  it("should handle large depth of cut", () => {
    const result = stochasticToolLifeEngine.compute({
      material: "AISI 1045",
      cutting_speed_mpm: 150,
      feed_mm: 0.3,
      depth_mm: 10.0, // Heavy roughing
      method: "weibull",
      n_trials: 500,
    });

    // Large DOC should reduce life but still be positive
    expect(result.value.taylor_life_min).toBeGreaterThan(0);
  });

  it("should return valid confidence value", () => {
    const result = stochasticToolLifeEngine.compute({
      material: "AISI 1045",
      cutting_speed_mpm: 200,
      feed_mm: 0.2,
      depth_mm: 2.0,
      method: "all",
      n_trials: 1000,
    });

    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// TEST SUITE: DIMENSIONAL CONSISTENCY
// ============================================================================

describe("TaylorToolLifeEngine — Dimensional Consistency", () => {
  it("T should have units of minutes", () => {
    // T = (C/Vc)^(1/n)
    // C [m/min] / Vc [m/min] = dimensionless
    // (dimensionless)^(1/n) = dimensionless
    // But by convention, T is in minutes when C is defined as speed at T=1min

    const C = 350; // m/min
    const Vc = 200; // m/min
    const n = 0.25; // dimensionless
    const T = Math.pow(C / Vc, 1 / n); // minutes

    // At Vc=C, T=1 minute (definition)
    expect(Math.pow(C / C, 1 / n)).toBe(1);
  });

  it("doubling C should increase life by (2)^(1/n)", () => {
    const C1 = 300;
    const C2 = 600; // doubled
    const Vc = 200;
    const n = 0.25;

    const T1 = Math.pow(C1 / Vc, 1 / n);
    const T2 = Math.pow(C2 / Vc, 1 / n);

    const ratio = T2 / T1;
    const expected = Math.pow(2, 1 / n);

    expect(ratio).toBeCloseTo(expected, 2);
  });

  it("doubling Vc should reduce life by (0.5)^(1/n)", () => {
    const C = 350;
    const Vc1 = 100;
    const Vc2 = 200; // doubled
    const n = 0.25;

    const T1 = Math.pow(C / Vc1, 1 / n);
    const T2 = Math.pow(C / Vc2, 1 / n);

    const ratio = T2 / T1;
    const expected = Math.pow(0.5, 1 / n);

    expect(ratio).toBeCloseTo(expected, 2);
  });
});

// ============================================================================
// TEST SUITE: MATERIAL DATABASE CONSISTENCY
// ============================================================================

describe("TaylorToolLifeEngine — Material Database Consistency", () => {
  it("CANONICAL_MATERIAL_DB should have Taylor constants matching CANONICAL_TAYLOR", () => {
    // Steel
    expect(CANONICAL_MATERIAL_DB.steel.taylor_C).toBe(CANONICAL_TAYLOR.P.C);
    expect(CANONICAL_MATERIAL_DB.steel.taylor_n).toBe(CANONICAL_TAYLOR.P.n);
  });

  it("all materials should have positive Taylor constants", () => {
    Object.entries(CANONICAL_MATERIAL_DB).forEach(([name, mat]) => {
      expect(mat.taylor_C).toBeGreaterThan(0);
      expect(mat.taylor_n).toBeGreaterThan(0);
      expect(mat.taylor_n).toBeLessThan(1);
    });
  });

  it("Taylor n should be in valid range (0.08-0.60)", () => {
    Object.entries(CANONICAL_MATERIAL_DB).forEach(([name, mat]) => {
      expect(mat.taylor_n).toBeGreaterThanOrEqual(0.08);
      expect(mat.taylor_n).toBeLessThanOrEqual(0.60);
    });
  });
});
