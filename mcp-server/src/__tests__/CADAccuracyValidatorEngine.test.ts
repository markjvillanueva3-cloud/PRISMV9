/**
 * CADAccuracyValidatorEngine Tests
 * =================================
 * Tests for multi-layer CAD accuracy validation.
 *
 * @milestone CAD-UNIVERSAL-CONTROL-MS0 U-CUC60
 */
import { describe, it, expect } from "vitest";
import {
  cadAccuracyValidatorEngine,
  type ValidationInput,
  type DimensionalSpec,
} from "../engines/CADAccuracyValidatorEngine.js";

describe("CADAccuracyValidatorEngine", () => {
  describe("getCapabilities", () => {
    it("returns all 6 accuracy validation capabilities", () => {
      const caps = cadAccuracyValidatorEngine.getCapabilities();
      expect(caps.length).toBe(6);
      expect(caps.map(c => c.name)).toContain("accuracy_validate");
      expect(caps.map(c => c.name)).toContain("accuracy_dimensional");
      expect(caps.map(c => c.name)).toContain("accuracy_topology");
      expect(caps.map(c => c.name)).toContain("accuracy_dfm");
      expect(caps.map(c => c.name)).toContain("accuracy_tolerance");
      expect(caps.map(c => c.name)).toContain("accuracy_feature");
    });
  });

  describe("validate", () => {
    it("returns null for valid input with code", () => {
      const result = cadAccuracyValidatorEngine.validate({ code: "cq.Workplane('XY')" });
      expect(result).toBeNull();
    });

    it("returns error for null input", () => {
      const result = cadAccuracyValidatorEngine.validate(null);
      expect(result).toBe("Input must be an object");
    });

    it("returns error for missing code", () => {
      const result = cadAccuracyValidatorEngine.validate({});
      expect(result).toBe("code string is required");
    });

    it("returns error for non-string code", () => {
      const result = cadAccuracyValidatorEngine.validate({ code: 123 });
      expect(result).toBe("code string is required");
    });
  });

  describe("validateDimensional", () => {
    it("returns passed=true with score=1.0 when no specs provided", () => {
      const result = cadAccuracyValidatorEngine.validateDimensional(
        "cq.Workplane('XY').box(10, 20, 5)",
        []
      );
      expect(result.passed).toBe(true);
      expect(result.score).toBe(1.0);
      expect(result.details).toContain("No dimensional specs provided — skipped");
    });

    it("validates dimensions within tolerance", () => {
      const specs: DimensionalSpec[] = [
        { name: "length", nominal: 10, tolerance: { plus: 0.1, minus: 0.1 }, unit: "mm" },
      ];
      const result = cadAccuracyValidatorEngine.validateDimensional(
        "cq.Workplane('XY').box(10, 20, 5)",
        specs
      );
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0.95);
    });

    it("reports missing dimensions as warnings", () => {
      const specs: DimensionalSpec[] = [
        { name: "unknown_dim", nominal: 50, tolerance: { plus: 0.5, minus: 0.5 }, unit: "mm" },
      ];
      const result = cadAccuracyValidatorEngine.validateDimensional(
        "cq.Workplane('XY').box(10, 20, 5)",
        specs
      );
      expect(result.warnings.some(w => w.includes("not found"))).toBe(true);
    });
  });

  describe("validateTopology", () => {
    it("passes for valid CadQuery code with Workplane", () => {
      const result = cadAccuracyValidatorEngine.validateTopology(
        "result = cq.Workplane('XY').box(10, 20, 5)"
      );
      expect(result.passed).toBe(true);
      expect(result.details.some(d => d.includes("Workplane"))).toBe(true);
    });

    it("fails for code without Workplane", () => {
      const result = cadAccuracyValidatorEngine.validateTopology(
        "import cadquery as cq\nbox = something()"
      );
      expect(result.passed).toBe(false);
      expect(result.criticalIssues.some(i => i.includes("No Workplane"))).toBe(true);
    });

    it("detects extrusions with closed profiles", () => {
      const result = cadAccuracyValidatorEngine.validateTopology(
        "cq.Workplane('XY').circle(5).extrude(10)"
      );
      expect(result.passed).toBe(true);
      expect(result.details.some(d => d.includes("extrusion"))).toBe(true);
    });

    it("warns about extrude without closed profile", () => {
      const result = cadAccuracyValidatorEngine.validateTopology(
        "cq.Workplane('XY').lineTo(5, 5).extrude(10)"
      );
      expect(result.warnings.some(w => w.includes("closed profiles"))).toBe(true);
    });
  });

  describe("validateDFM", () => {
    it("passes basic DFM check for simple geometry", () => {
      const result = cadAccuracyValidatorEngine.validateDFM(
        "cq.Workplane('XY').box(50, 50, 10)"
      );
      expect(result.passed).toBe(true);
      expect(result.layer).toBe(3);
      expect(result.name).toBe("DFM");
    });

    it("detects and validates fillet radii", () => {
      const result = cadAccuracyValidatorEngine.validateDFM(
        "cq.Workplane('XY').box(50, 50, 10).fillet(2.0)"
      );
      expect(result.details.some(d => d.includes("Fillet radius") && d.includes("2"))).toBe(true);
    });

    it("warns about very small fillet radii", () => {
      const result = cadAccuracyValidatorEngine.validateDFM(
        "cq.Workplane('XY').box(50, 50, 10).fillet(0.15)"
      );
      expect(result.warnings.some(w => w.includes("very small") || w.includes("< 0.3mm"))).toBe(true);
    });

    it("checks hole L/D ratios", () => {
      const result = cadAccuracyValidatorEngine.validateDFM(
        "cq.Workplane('XY').box(50, 50, 50).hole(3, 40)"
      );
      expect(result.criticalIssues.some(i => i.includes("L/D ratio"))).toBe(true);
    });

    it("applies stricter rules for tool steel", () => {
      const result = cadAccuracyValidatorEngine.validateDFM(
        "cq.Workplane('XY').box(50, 50, 10).fillet(0.3)",
        "D2"
      );
      expect(result.details.some(d => d.includes("Tool steel detected"))).toBe(true);
    });
  });

  describe("validateTolerance", () => {
    it("skips when no specs provided", () => {
      const result = cadAccuracyValidatorEngine.validateTolerance(
        "cq.Workplane('XY').box(10, 20, 5)",
        []
      );
      expect(result.passed).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it("calculates RSS stack tolerance", () => {
      const specs: DimensionalSpec[] = [
        { name: "dim1", nominal: 10, tolerance: { plus: 0.05, minus: 0.05 }, unit: "mm" },
        { name: "dim2", nominal: 20, tolerance: { plus: 0.05, minus: 0.05 }, unit: "mm" },
      ];
      const result = cadAccuracyValidatorEngine.validateTolerance(
        "cq.Workplane('XY').box(10, 20, 5)",
        specs
      );
      expect(result.details.some(d => d.includes("RSS stack"))).toBe(true);
    });

    it("warns about extremely tight tolerances", () => {
      const specs: DimensionalSpec[] = [
        { name: "precision", nominal: 5, tolerance: { plus: 0.002, minus: 0.002 }, unit: "mm" },
      ];
      const result = cadAccuracyValidatorEngine.validateTolerance(
        "cq.Workplane('XY').box(5, 5, 5)",
        specs
      );
      expect(result.warnings.some(w => w.includes("extremely tight"))).toBe(true);
    });
  });

  describe("validateFeatures", () => {
    it("skips when no expected features provided", () => {
      const result = cadAccuracyValidatorEngine.validateFeatures(
        "cq.Workplane('XY').box(10, 20, 5)",
        []
      );
      expect(result.passed).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it("detects box feature in code", () => {
      const result = cadAccuracyValidatorEngine.validateFeatures(
        "cq.Workplane('XY').box(10, 20, 5)",
        [{ type: "box", params: { length: 10, width: 20, height: 5 } }]
      );
      expect(result.passed).toBe(true);
      expect(result.details.some(d => d.includes("Feature 'box' found"))).toBe(true);
    });

    it("detects cylinder feature in code", () => {
      const result = cadAccuracyValidatorEngine.validateFeatures(
        "cq.Workplane('XY').cylinder(20, 5)",
        [{ type: "cylinder", params: { length: 20, diameter: 10 } }]
      );
      expect(result.details.some(d => d.includes("Feature 'cylinder' found"))).toBe(true);
    });

    it("warns about missing expected features", () => {
      const result = cadAccuracyValidatorEngine.validateFeatures(
        "cq.Workplane('XY').box(10, 20, 5)",
        [{ type: "hole", params: { diameter: 5 } }]
      );
      expect(result.warnings.some(w => w.includes("not detected"))).toBe(true);
    });
  });

  describe("validateAccuracy (full pipeline)", () => {
    it("returns complete validation report structure", async () => {
      const input: ValidationInput = {
        code: "result = cq.Workplane('XY').box(50, 30, 10).fillet(2)",
        partId: "test-part-001",
      };
      const report = await cadAccuracyValidatorEngine.validateAccuracy(input);

      expect(report.partId).toBe("test-part-001");
      expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}/);
      expect(typeof report.overallPassed).toBe("boolean");
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(1);
      expect(report.layers.length).toBe(5);
      expect(report.validationTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("passes for well-formed code without specs", async () => {
      const input: ValidationInput = {
        code: "result = cq.Workplane('XY').box(50, 30, 10)",
      };
      const report = await cadAccuracyValidatorEngine.validateAccuracy(input);

      expect(report.overallPassed).toBe(true);
      expect(report.overallScore).toBeGreaterThan(0.8);
    });

    it("uses strict threshold when strictMode=true", async () => {
      const input: ValidationInput = {
        code: "result = cq.Workplane('XY').box(50, 30, 10)",
        strictMode: true,
      };
      const report = await cadAccuracyValidatorEngine.validateAccuracy(input);

      expect(report.layers.length).toBe(5);
    });

    it("generates recommendations for failed layers", async () => {
      const input: ValidationInput = {
        code: "import cadquery",
      };
      const report = await cadAccuracyValidatorEngine.validateAccuracy(input);

      expect(report.overallPassed).toBe(false);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it("accumulates critical issues from all layers", async () => {
      const input: ValidationInput = {
        code: "cq.Workplane('XY').box(50, 50, 50).hole(2, 30)",
        expectedDimensions: [
          { name: "length", nominal: 100, tolerance: { plus: 0.01, minus: 0.01 }, unit: "mm" },
        ],
      };
      const report = await cadAccuracyValidatorEngine.validateAccuracy(input);

      expect(report.criticalIssues.length).toBeGreaterThan(0);
    });
  });
});
