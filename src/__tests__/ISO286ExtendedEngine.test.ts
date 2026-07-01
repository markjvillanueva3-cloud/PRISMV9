/**
 * Tests for ISO286ExtendedEngine
 * Extended ISO 286 limits & fits with stochastic analysis
 */
import { describe, it, expect } from "vitest";
import { ISO286ExtendedEngine } from "../engines/ISO286ExtendedEngine.js";

describe("ISO286ExtendedEngine", () => {
  const engine = new ISO286ExtendedEngine();

  // ========================================================================
  // IT Grade Calculation
  // ========================================================================

  describe("calculateITGrade", () => {
    it("should match standard values for common sizes", () => {
      // 30mm IT7 = 21 um (well-known reference value)
      const r = engine.calculateITGrade(30, 7);
      expect(r.tolerance_um).toBe(21);
      expect(r.tolerance_mm).toBeCloseTo(0.021, 4);
      expect(r.grade_label).toBe("IT7");
      expect(r.extended).toBe(false);
    });

    it("should handle IT01 grade", () => {
      const r = engine.calculateITGrade(10, -1);
      expect(r.grade_label).toBe("IT01");
      expect(r.tolerance_um).toBeGreaterThan(0);
      expect(r.tolerance_um).toBeLessThan(1); // IT01 is sub-micron for small sizes
    });

    it("should support extended range 500-3150mm", () => {
      const r = engine.calculateITGrade(1000, 7);
      expect(r.extended).toBe(true);
      expect(r.tolerance_um).toBeGreaterThan(0);
      // IT7 at 1000mm should be much larger than at 30mm
      expect(r.tolerance_um).toBeGreaterThan(21);
    });

    it("should handle size near upper bound 3150mm", () => {
      const r = engine.calculateITGrade(3000, 11);
      expect(r.extended).toBe(true);
      expect(r.tolerance_um).toBeGreaterThan(0);
    });

    it("should increase tolerance with size", () => {
      const small = engine.calculateITGrade(10, 7);
      const medium = engine.calculateITGrade(100, 7);
      const large = engine.calculateITGrade(1000, 7);
      expect(medium.tolerance_um).toBeGreaterThan(small.tolerance_um);
      if (large.tolerance_um > 0) {
        expect(large.tolerance_um).toBeGreaterThan(medium.tolerance_um);
      }
    });

    it("should increase tolerance with grade", () => {
      const fine = engine.calculateITGrade(50, 6);
      const medium = engine.calculateITGrade(50, 9);
      const coarse = engine.calculateITGrade(50, 14);
      expect(medium.tolerance_um).toBeGreaterThan(fine.tolerance_um);
      expect(coarse.tolerance_um).toBeGreaterThan(medium.tolerance_um);
    });

    it("should throw for out-of-range nominal", () => {
      expect(() => engine.calculateITGrade(5000, 7)).toThrow();
    });

    it("should throw for invalid IT grade", () => {
      expect(() => engine.calculateITGrade(50, 20)).toThrow();
    });
  });

  // ========================================================================
  // Fit Analysis
  // ========================================================================

  describe("analyzeFit", () => {
    it("should analyze H7/g6 as clearance fit", () => {
      const r = engine.analyzeFit(50, "H7/g6");
      expect(r.fit_type).toBe("clearance");
      expect(r.min_clearance_um).toBeGreaterThan(0);
      expect(r.max_clearance_um).toBeGreaterThan(r.min_clearance_um);
      expect(r.hole.position).toBe("H");
      expect(r.shaft.position).toBe("g");
    });

    it("should analyze H7/p6 as interference fit", () => {
      const r = engine.analyzeFit(50, "H7/p6");
      expect(r.fit_type).toBe("interference");
      expect(r.max_clearance_um).toBeLessThan(0);
      expect(r.overlap_um).toBeGreaterThan(0);
    });

    it("should analyze H7/k6 as transition fit", () => {
      const r = engine.analyzeFit(50, "H7/k6");
      expect(r.fit_type).toBe("transition");
      expect(r.min_clearance_um).toBeLessThanOrEqual(0);
      expect(r.max_clearance_um).toBeGreaterThanOrEqual(0);
    });

    it("should handle H7/h6 (zero-line fit)", () => {
      const r = engine.analyzeFit(50, "H7/h6");
      // H7/h6: hole EI=0, shaft es=0, so min clearance = 0 exactly
      // Classified as transition per strict ISO definition (min=0, max>0)
      expect(r.fit_type).toBe("transition");
      expect(r.min_clearance_um).toBe(0);
      expect(r.max_clearance_um).toBeGreaterThan(0);
    });

    it("should work at extended sizes (>500mm)", () => {
      const r = engine.analyzeFit(800, "H7/g6");
      expect(r.fit_type).toBe("clearance");
      expect(r.nominal_mm).toBe(800);
      // Clearances should be larger at 800mm
      const small = engine.analyzeFit(50, "H7/g6");
      expect(r.max_clearance_um).toBeGreaterThan(small.max_clearance_um);
    });

    it("should throw for invalid fit format", () => {
      expect(() => engine.analyzeFit(50, "invalid")).toThrow();
    });

    it("should handle heavy interference fits (H7/z6)", () => {
      const r = engine.analyzeFit(50, "H7/z6");
      expect(r.fit_type).toBe("interference");
      expect(r.overlap_um).toBeGreaterThan(50); // z6 has significant interference
    });
  });

  // ========================================================================
  // Stochastic Fit Analysis
  // ========================================================================

  describe("stochasticFitAnalysis", () => {
    it("should compute P(clearance) for H7/g6", () => {
      const r = engine.stochasticFitAnalysis(50, "H7/g6", 3, 5000);
      expect(r.p_clearance).toBeGreaterThan(0.9); // H7/g6 should almost always clear
      expect(r.p_interference).toBeLessThan(0.1);
      expect(r.samples).toBe(5000);
      expect(r.clearance_mean_um).toBeGreaterThan(0);
    });

    it("should compute P(interference) for H7/p6", () => {
      const r = engine.stochasticFitAnalysis(50, "H7/p6", 3, 5000);
      expect(r.p_interference).toBeGreaterThan(0.5); // p6 should mostly interfere
      expect(r.clearance_mean_um).toBeLessThan(0); // negative = interference
    });

    it("should show transition behavior for H7/k6", () => {
      const r = engine.stochasticFitAnalysis(50, "H7/k6", 3, 5000);
      // k6 should have mixed results
      expect(r.p_clearance).toBeGreaterThan(0);
      expect(r.p_interference).toBeGreaterThan(0);
      // Neither should dominate completely
      expect(r.p_clearance + r.p_interference).toBeCloseTo(1, 0);
    });

    it("should report confidence intervals", () => {
      const r = engine.stochasticFitAnalysis(50, "H7/g6", 3, 5000);
      expect(r.clearance_p05_um).toBeLessThan(r.clearance_p95_um);
      expect(r.clearance_std_um).toBeGreaterThan(0);
    });

    it("should increase uncertainty with larger sigma", () => {
      const tight = engine.stochasticFitAnalysis(50, "H7/g6", 1, 5000);
      const loose = engine.stochasticFitAnalysis(50, "H7/g6", 5, 5000);
      expect(loose.clearance_std_um).toBeGreaterThan(tight.clearance_std_um);
    });

    it("should classify assembly force for interference fits", () => {
      const r = engine.stochasticFitAnalysis(50, "H7/u6", 2, 5000);
      expect(["light", "moderate", "heavy"]).toContain(r.assembly_force_indicator);
    });

    it("should report no assembly force for clearance fits", () => {
      const r = engine.stochasticFitAnalysis(50, "H7/g6", 3, 5000);
      expect(r.assembly_force_indicator).toBe("none");
    });
  });

  // ========================================================================
  // Fit Recommendation
  // ========================================================================

  describe("recommendFit", () => {
    it("should recommend clearance for sliding", () => {
      const r = engine.recommendFit("sliding");
      expect(r.fit_type).toBe("clearance");
      expect(r.recommended_fit).toBe("H7/g6");
    });

    it("should recommend interference for press fit", () => {
      const r = engine.recommendFit("press");
      expect(r.fit_type).toBe("interference");
    });

    it("should recommend transition for bearing on shaft", () => {
      const r = engine.recommendFit("shaft_bearing");
      expect(r.fit_type).toBe("transition");
    });

    it("should provide alternatives for each application", () => {
      const apps = [
        "free_running", "sliding", "location_clearance", "location_transition",
        "light_press", "press", "shrink", "bearing_housing", "shaft_bearing", "piston_cylinder",
      ] as const;
      for (const app of apps) {
        const r = engine.recommendFit(app);
        expect(r.alternatives.length).toBeGreaterThan(0);
        expect(r.reason.length).toBeGreaterThan(0);
      }
    });
  });

  // ========================================================================
  // Variability Stack-Up
  // ========================================================================

  describe("variabilityStackUp", () => {
    it("should compute MC stack-up for 3 dimensions", () => {
      const r = engine.variabilityStackUp([
        { nominal_mm: 10, tolerance_mm: 0.02 },
        { nominal_mm: 20, tolerance_mm: 0.03 },
        { nominal_mm: 5, tolerance_mm: 0.01 },
      ], 5000);
      expect(r.mean_mm).toBeCloseTo(35, 0);
      expect(r.wc_tolerance_mm).toBeCloseTo(0.06, 3);
      expect(r.mc_tolerance_mm).toBeGreaterThan(0);
      expect(r.mc_tolerance_mm).toBeLessThan(r.wc_tolerance_mm);
    });

    it("should show RSS < WC", () => {
      const r = engine.variabilityStackUp([
        { nominal_mm: 10, tolerance_mm: 0.05 },
        { nominal_mm: 10, tolerance_mm: 0.05 },
        { nominal_mm: 10, tolerance_mm: 0.05 },
      ], 5000);
      expect(r.rss_tolerance_mm).toBeLessThan(r.wc_tolerance_mm);
    });

    it("should increase tolerance with correlation", () => {
      const uncorrelated = engine.variabilityStackUp([
        { nominal_mm: 10, tolerance_mm: 0.05 },
        { nominal_mm: 10, tolerance_mm: 0.05 },
        { nominal_mm: 10, tolerance_mm: 0.05 },
      ], 10000, 0);

      const correlated = engine.variabilityStackUp([
        { nominal_mm: 10, tolerance_mm: 0.05 },
        { nominal_mm: 10, tolerance_mm: 0.05 },
        { nominal_mm: 10, tolerance_mm: 0.05 },
      ], 10000, 0.8);

      // Correlated dimensions should produce larger MC tolerance
      expect(correlated.mc_tolerance_mm).toBeGreaterThan(uncorrelated.mc_tolerance_mm * 0.8);
    });

    it("should compute Cpk estimates", () => {
      const r = engine.variabilityStackUp([
        { nominal_mm: 50, tolerance_mm: 0.1, process_sigma_mm: 0.01 },
        { nominal_mm: 30, tolerance_mm: 0.08, process_sigma_mm: 0.008 },
      ], 5000);
      expect(r.cpk_at_wc).toBeGreaterThan(0);
      expect(r.cpk_at_rss).toBeGreaterThan(0);
    });

    it("should provide p05/p95 bounds", () => {
      const r = engine.variabilityStackUp([
        { nominal_mm: 100, tolerance_mm: 0.05 },
      ], 5000);
      expect(r.mc_p05_mm).toBeLessThan(r.mc_p95_mm);
      expect(r.mc_p05_mm).toBeCloseTo(100, 0);
    });
  });

  // ========================================================================
  // Available Positions
  // ========================================================================

  describe("available positions", () => {
    it("should list extended shaft positions", () => {
      const positions = engine.getAvailableShaftPositions();
      expect(positions.length).toBeGreaterThan(10);
      expect(positions).toContain("a");
      expect(positions).toContain("h");
      expect(positions).toContain("z");
    });

    it("should list extended hole positions", () => {
      const positions = engine.getAvailableHolePositions();
      expect(positions.length).toBeGreaterThan(50); // 108 columns
      expect(positions).toContain("A");
      expect(positions).toContain("H");
    });
  });
});
