/**
 * Dedicated tests for MetrologyBudgetEngine
 * Methods: expandedUncertainty, thermalCompensation, conformanceProbability, guardBand
 */
import { describe, it, expect } from "vitest";
import { metrologyBudgetEngine } from "../engines/MetrologyBudgetEngine.js";

describe("MetrologyBudgetEngine", () => {
  describe("expandedUncertainty", () => {
    it("should compute combined and expanded uncertainty with Welch-Satterthwaite", () => {
      const r = metrologyBudgetEngine.expandedUncertainty({
        sources: [
          { name: "repeatability", u: 0.005, dof: 9 },
          { name: "resolution", u: 0.003, dof: Infinity },
          { name: "calibration", u: 0.004, dof: 50 },
        ],
        confidence: 0.95,
      });
      // uc = sqrt(0.005^2 + 0.003^2 + 0.004^2) ~ 0.00707
      expect(r.combined_uc).toBeCloseTo(0.00707, 3);
      expect(r.expanded_U).toBeGreaterThan(r.combined_uc);
      expect(r.coverage_factor_k).toBeGreaterThanOrEqual(1.96);
      expect(r.contributions).toHaveLength(3);
      const totalPct = r.contributions.reduce((s, c) => s + c.pct, 0);
      expect(totalPct).toBeCloseTo(100, 0);
    });

    it("should increase coverage factor for low effective DOF", () => {
      const rLow = metrologyBudgetEngine.expandedUncertainty({
        sources: [{ name: "single", u: 0.01, dof: 3 }],
        confidence: 0.95,
      });
      const rHigh = metrologyBudgetEngine.expandedUncertainty({
        sources: [{ name: "single", u: 0.01, dof: 100 }],
        confidence: 0.95,
      });
      expect(rLow.coverage_factor_k).toBeGreaterThan(rHigh.coverage_factor_k);
    });
  });

  describe("thermalCompensation", () => {
    it("should compute thermal expansion correction for steel", () => {
      const r = metrologyBudgetEngine.thermalCompensation({
        nominal_mm: 100,
        cte: 11.7e-6,
        delta_T: 3,
      });
      // dL = 11.7e-6 * 100 * 3 = 0.00351 mm
      expect(r.thermal_error_mm).toBeCloseTo(0.00351, 4);
      expect(r.compensated_dim_mm).toBeCloseTo(100.00351, 4);
    });

    it("should handle negative temperature deviations", () => {
      const r = metrologyBudgetEngine.thermalCompensation({
        nominal_mm: 200,
        cte: 23e-6,
        delta_T: -5,
      });
      expect(r.compensated_dim_mm).toBeLessThan(200);
      expect(r.thermal_error_mm).toBeLessThan(0);
    });
  });

  describe("conformanceProbability", () => {
    it("should compute high conformance for centered process", () => {
      const r = metrologyBudgetEngine.conformanceProbability({
        mu: 50,
        sigma: 0.01,
        lsl: 49.9,
        usl: 50.1,
      });
      expect(r.probability_conforming).toBeGreaterThan(0.99);
    });

    it("should compute lower conformance near spec limit", () => {
      const r = metrologyBudgetEngine.conformanceProbability({
        mu: 50.09,
        sigma: 0.02,
        lsl: 49.9,
        usl: 50.1,
      });
      expect(r.probability_conforming).toBeLessThan(0.99);
      expect(r.probability_conforming).toBeGreaterThan(0);
    });
  });

  describe("guardBand", () => {
    it("should shrink acceptance zone per ISO 14253", () => {
      const r = metrologyBudgetEngine.guardBand({
        usl: 50.05,
        lsl: 49.95,
        expanded_uncertainty_U: 0.01,
      });
      // tolerance = 0.1, guard_band = U = 0.01
      expect(r.tolerance).toBeCloseTo(0.1, 3);
      expect(r.acceptance_zone_width).toBeLessThan(r.tolerance);
      expect(r.guard_band).toBeCloseTo(0.01, 3);
    });

    it("should warn when uncertainty is large relative to tolerance", () => {
      const r = metrologyBudgetEngine.guardBand({
        usl: 50.05,
        lsl: 49.95,
        expanded_uncertainty_U: 0.04,
      });
      expect(r.acceptance_zone_width).toBeLessThan(0.03);
      expect(r.warnings.length).toBeGreaterThan(0);
    });
  });
});
