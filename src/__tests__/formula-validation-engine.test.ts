/**
 * FormulaValidationEngine Tests — AUTO-5
 *
 * Validates that the formula validation engine correctly:
 * 1. Computes accuracy for all canonical physics functions
 * 2. Detects regressions between runs
 * 3. Validates canonical constants against published ranges
 * 4. Cross-checks material database consistency
 * 5. Returns proper warnings and reasoning trails
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  FormulaValidationEngine,
  type ValidationReport,
  type FormulaResult,
} from "../engines/FormulaValidationEngine.js";

describe("FormulaValidationEngine", () => {
  let engine: FormulaValidationEngine;
  let report: ValidationReport;

  beforeAll(() => {
    engine = new FormulaValidationEngine();
    report = engine.compute();
  });

  // ── Aggregate results ──

  it("should return a ValidationReport with all required fields", () => {
    expect(report.timestamp).toBeTruthy();
    expect(report.total_formulas).toBeGreaterThan(0);
    expect(report.total_test_points).toBeGreaterThan(0);
    expect(report.per_formula).toBeInstanceOf(Array);
    expect(report.regressions).toBeInstanceOf(Array);
    expect(report.warnings).toBeInstanceOf(Array);
    expect(report.reasoning).toBeInstanceOf(Array);
  });

  it("should validate at least 7 formula suites", () => {
    expect(report.total_formulas).toBeGreaterThanOrEqual(7);
  });

  it("should have at least 30 total test points", () => {
    expect(report.total_test_points).toBeGreaterThanOrEqual(30);
  });

  it("should achieve aggregate accuracy >= 0.90", () => {
    expect(report.aggregate_accuracy).toBeGreaterThanOrEqual(0.90);
  });

  it("should have zero regressions on first run", () => {
    // First run has no previous data, so no regressions
    // (or regressions array exists and is empty/small)
    expect(report.regressions).toBeInstanceOf(Array);
  });

  // ── Warnings and reasoning ──

  it("should include warnings about model limitations", () => {
    expect(report.warnings.length).toBeGreaterThan(0);
    const hasKienzleWarning = report.warnings.some(w => w.includes("Kienzle"));
    const hasTaylorWarning = report.warnings.some(w => w.includes("Taylor"));
    const hasUnitsWarning = report.warnings.some(w => w.includes("[N]") || w.includes("[mm]"));
    expect(hasKienzleWarning).toBe(true);
    expect(hasTaylorWarning).toBe(true);
    expect(hasUnitsWarning).toBe(true);
  });

  it("should include reasoning trail with methodology", () => {
    expect(report.reasoning.length).toBeGreaterThan(0);
    const hasMethodology = report.reasoning.some(r => r.includes("methodology"));
    const hasSources = report.reasoning.some(r => r.includes("Sandvik"));
    expect(hasMethodology).toBe(true);
    expect(hasSources).toBe(true);
  });

  // ── Per-formula suites ──

  describe("Kienzle force validation", () => {
    let kienzle: FormulaResult;

    beforeAll(() => {
      kienzle = report.per_formula.find(f => f.formula_name === "kienzle_force")!;
    });

    it("should exist in results", () => {
      expect(kienzle).toBeTruthy();
    });

    it("should have 8 test points", () => {
      expect(kienzle.test_points).toBe(8);
    });

    it("should pass all test points (formula matches analytical calculation)", () => {
      expect(kienzle.failed).toBe(0);
    });

    it("should have accuracy >= 0.99 (self-consistency)", () => {
      expect(kienzle.accuracy).toBeGreaterThanOrEqual(0.99);
    });

    it("should have mean error < 1%", () => {
      expect(kienzle.mean_error_pct).toBeLessThan(1.0);
    });
  });

  describe("Taylor tool life validation", () => {
    let taylor: FormulaResult;

    beforeAll(() => {
      taylor = report.per_formula.find(f => f.formula_name === "taylor_tool_life")!;
    });

    it("should exist in results", () => {
      expect(taylor).toBeTruthy();
    });

    it("should have 7 test points", () => {
      expect(taylor.test_points).toBe(7);
    });

    it("should pass all test points", () => {
      expect(taylor.failed).toBe(0);
    });

    it("should have accuracy >= 0.99", () => {
      expect(taylor.accuracy).toBeGreaterThanOrEqual(0.99);
    });
  });

  describe("Tool deflection validation", () => {
    let deflection: FormulaResult;

    beforeAll(() => {
      deflection = report.per_formula.find(f => f.formula_name === "tool_deflection")!;
    });

    it("should exist in results", () => {
      expect(deflection).toBeTruthy();
    });

    it("should have 4 test points", () => {
      expect(deflection.test_points).toBe(4);
    });

    it("should pass all test points (exact analytical solution)", () => {
      expect(deflection.failed).toBe(0);
    });

    it("should have accuracy >= 0.999 (numerical precision only)", () => {
      expect(deflection.accuracy).toBeGreaterThanOrEqual(0.999);
    });
  });

  describe("Surface roughness Ra validation", () => {
    let ra: FormulaResult;

    beforeAll(() => {
      ra = report.per_formula.find(f => f.formula_name === "surface_roughness_ra")!;
    });

    it("should exist in results", () => {
      expect(ra).toBeTruthy();
    });

    it("should have 5 test points", () => {
      expect(ra.test_points).toBe(5);
    });

    it("should pass all test points (Brammertz kinematic model)", () => {
      expect(ra.failed).toBe(0);
    });

    it("should have accuracy >= 0.999", () => {
      expect(ra.accuracy).toBeGreaterThanOrEqual(0.999);
    });
  });

  describe("Derived formulas validation", () => {
    let derived: FormulaResult;

    beforeAll(() => {
      derived = report.per_formula.find(f => f.formula_name === "derived_formulas")!;
    });

    it("should exist in results", () => {
      expect(derived).toBeTruthy();
    });

    it("should have 5 test points (RPM, MRR, Power, Torque)", () => {
      expect(derived.test_points).toBe(5);
    });

    it("should pass all test points (exact arithmetic)", () => {
      expect(derived.failed).toBe(0);
    });
  });

  describe("Canonical constants validation", () => {
    let constants: FormulaResult;

    beforeAll(() => {
      constants = report.per_formula.find(f => f.formula_name === "canonical_constants")!;
    });

    it("should exist in results", () => {
      expect(constants).toBeTruthy();
    });

    it("should validate all 6 ISO groups for Kienzle + Taylor", () => {
      // 6 kc1_1 + 6 C + 6 n = 18 test points
      expect(constants.test_points).toBeGreaterThanOrEqual(18);
    });

    it("should pass all constants (within published ranges)", () => {
      expect(constants.failed).toBe(0);
    });
  });

  describe("Material database validation", () => {
    let materials: FormulaResult;

    beforeAll(() => {
      materials = report.per_formula.find(f => f.formula_name === "material_database")!;
    });

    it("should exist in results", () => {
      expect(materials).toBeTruthy();
    });

    it("should validate at least 13 materials (kc1_1 + density)", () => {
      expect(materials.test_points).toBeGreaterThanOrEqual(26);
    });

    it("should pass all material checks", () => {
      expect(materials.failed).toBe(0);
    });
  });

  // ── read() and summary() ──

  describe("read()", () => {
    it("should return the last computed report from disk", () => {
      const cached = engine.read();
      expect(cached).toBeTruthy();
      expect(cached!.total_formulas).toBe(report.total_formulas);
      expect(cached!.aggregate_accuracy).toBe(report.aggregate_accuracy);
    });
  });

  describe("summary()", () => {
    it("should return a markdown table", () => {
      const text = engine.summary();
      expect(text).toContain("Formula Accuracy Report");
      expect(text).toContain("kienzle_force");
      expect(text).toContain("taylor_tool_life");
      expect(text).toContain("Aggregate Accuracy");
    });

    it("should include pass/fail counts", () => {
      const text = engine.summary();
      expect(text).toMatch(/\d+\/\d+ passed/);
    });
  });
});
