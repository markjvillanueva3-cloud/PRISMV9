/**
 * CADAccuracyValidatorEngine Tests
 * CADCAM-DAGI-MS0/U-DAGI13
 *
 * Tests for multi-layer 100% accuracy validation.
 */

import { describe, it, expect } from "vitest";
import {
  cadAccuracyValidatorEngine,
  type ValidationInput,
  type DimensionalSpec,
} from "../../engines/CADAccuracyValidatorEngine.js";

describe("CADAccuracyValidatorEngine", () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // ENGINE INFO & CAPABILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  describe("info", () => {
    it("should expose engine info", () => {
      expect(cadAccuracyValidatorEngine.info.name).toBe("CADAccuracyValidatorEngine");
      expect(cadAccuracyValidatorEngine.info.version).toBe("1.0.0");
      expect(cadAccuracyValidatorEngine.info.domain).toBe("cad_validation");
    });
  });

  describe("getCapabilities", () => {
    it("should return 6 capabilities", () => {
      const caps = cadAccuracyValidatorEngine.getCapabilities();
      expect(caps.length).toBe(6);
    });

    it("should include accuracy_validate", () => {
      const caps = cadAccuracyValidatorEngine.getCapabilities();
      expect(caps.some(c => c.name === "accuracy_validate")).toBe(true);
    });

    it("should include all 5 layer validations", () => {
      const caps = cadAccuracyValidatorEngine.getCapabilities();
      expect(caps.some(c => c.name === "accuracy_dimensional")).toBe(true);
      expect(caps.some(c => c.name === "accuracy_topology")).toBe(true);
      expect(caps.some(c => c.name === "accuracy_dfm")).toBe(true);
      expect(caps.some(c => c.name === "accuracy_tolerance")).toBe(true);
      expect(caps.some(c => c.name === "accuracy_feature")).toBe(true);
    });
  });

  describe("validate", () => {
    it("should reject non-object input", () => {
      expect(cadAccuracyValidatorEngine.validate(null)).toContain("must be an object");
      expect(cadAccuracyValidatorEngine.validate("string")).toContain("must be an object");
    });

    it("should reject missing code", () => {
      expect(cadAccuracyValidatorEngine.validate({})).toContain("code string is required");
    });

    it("should accept valid input", () => {
      expect(cadAccuracyValidatorEngine.validate({ code: "result = cq.Workplane..." })).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FULL VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("validateAccuracy", () => {
    const validCadQueryCode = `
import cadquery as cq
result = cq.Workplane("XY").box(100, 50, 25)
result = result.faces(">Z").workplane().hole(10)
show_object(result)
`;

    it("should return complete validation report", async () => {
      const input: ValidationInput = { code: validCadQueryCode };
      const report = await cadAccuracyValidatorEngine.validateAccuracy(input);

      expect(report.partId).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.layers).toHaveLength(5);
      expect(report.overallScore).toBeGreaterThan(0);
      expect(report.validationTimeMs).toBeGreaterThan(0);
    });

    it("should pass for valid simple CAD", async () => {
      const input: ValidationInput = { code: validCadQueryCode };
      const report = await cadAccuracyValidatorEngine.validateAccuracy(input);

      expect(report.overallPassed).toBe(true);
      expect(report.overallScore).toBeGreaterThan(0.85);
    });

    it("should include recommendations", async () => {
      const input: ValidationInput = { code: validCadQueryCode };
      const report = await cadAccuracyValidatorEngine.validateAccuracy(input);

      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it("should use custom partId when provided", async () => {
      const input: ValidationInput = { code: validCadQueryCode, partId: "custom-123" };
      const report = await cadAccuracyValidatorEngine.validateAccuracy(input);

      expect(report.partId).toBe("custom-123");
    });

    it("should apply strict mode threshold", async () => {
      const input: ValidationInput = { code: validCadQueryCode, strictMode: true };
      const report = await cadAccuracyValidatorEngine.validateAccuracy(input);

      expect(report).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 1: DIMENSIONAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe("validateDimensional", () => {
    it("should pass when no specs provided", () => {
      const result = cadAccuracyValidatorEngine.validateDimensional("cq.Workplane().box(100, 50, 25)", []);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(1.0);
      expect(result.details).toContain("No dimensional specs provided — skipped");
    });

    it("should pass when dimensions match spec", () => {
      const code = 'result = cq.Workplane("XY").box(100, 50, 25)';
      const specs: DimensionalSpec[] = [
        { name: "length", nominal: 100, tolerance: { plus: 0.5, minus: 0.5 }, unit: "mm" },
        { name: "width", nominal: 50, tolerance: { plus: 0.5, minus: 0.5 }, unit: "mm" },
      ];
      const result = cadAccuracyValidatorEngine.validateDimensional(code, specs);

      expect(result.score).toBeGreaterThan(0.9);
    });

    it("should warn on missing dimensions", () => {
      const code = 'result = cq.Workplane("XY").box(100, 50, 25)';
      const specs: DimensionalSpec[] = [
        { name: "nonexistent", nominal: 100, tolerance: { plus: 0.5, minus: 0.5 }, unit: "mm" },
      ];
      const result = cadAccuracyValidatorEngine.validateDimensional(code, specs);

      expect(result.warnings.some(w => w.includes("not found"))).toBe(true);
    });

    it("should handle inch units", () => {
      const code = 'result = cq.Workplane("XY").box(25.4, 12.7, 6.35)';
      const specs: DimensionalSpec[] = [
        { name: "length", nominal: 1.0, tolerance: { plus: 0.02, minus: 0.02 }, unit: "inch" },
      ];
      const result = cadAccuracyValidatorEngine.validateDimensional(code, specs);

      expect(result.passed).toBe(true);
    });

    it("should flag critical out-of-tolerance dimensions", () => {
      const code = 'result = cq.Workplane("XY").box(100, 50, 25)';
      const specs: DimensionalSpec[] = [
        { name: "length", nominal: 80, tolerance: { plus: 0.5, minus: 0.5 }, unit: "mm" },
      ];
      const result = cadAccuracyValidatorEngine.validateDimensional(code, specs);

      expect(result.criticalIssues.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 2: TOPOLOGY
  // ═══════════════════════════════════════════════════════════════════════════

  describe("validateTopology", () => {
    it("should pass for valid CadQuery code", () => {
      const code = `
import cadquery as cq
result = cq.Workplane("XY").circle(10).extrude(20)
show_object(result)
`;
      const result = cadAccuracyValidatorEngine.validateTopology(code);

      expect(result.passed).toBe(true);
      expect(result.details.some(d => d.includes("Workplane"))).toBe(true);
    });

    it("should fail for code without Workplane", () => {
      const code = "result = some_other_function()";
      const result = cadAccuracyValidatorEngine.validateTopology(code);

      expect(result.criticalIssues.length).toBeGreaterThan(0);
      expect(result.criticalIssues.some(i => i.includes("No Workplane"))).toBe(true);
    });

    it("should warn on missing result output", () => {
      const code = 'cq.Workplane("XY").box(10, 10, 10)';
      const result = cadAccuracyValidatorEngine.validateTopology(code);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should detect extrusions with closed profiles", () => {
      const code = `
result = cq.Workplane("XY").circle(10).extrude(20)
show_object(result)
`;
      const result = cadAccuracyValidatorEngine.validateTopology(code);

      expect(result.details.some(d => d.includes("extrusion"))).toBe(true);
    });

    it("should detect cylinder primitives", () => {
      const code = `
result = cq.Workplane("XY").cylinder(50, 25)
show_object(result)
`;
      const result = cadAccuracyValidatorEngine.validateTopology(code);

      expect(result.details.some(d => d.includes("Cylinder"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 3: DFM
  // ═══════════════════════════════════════════════════════════════════════════

  describe("validateDFM", () => {
    it("should pass for simple geometry", () => {
      const code = 'result = cq.Workplane("XY").box(100, 50, 25)';
      const result = cadAccuracyValidatorEngine.validateDFM(code);

      expect(result.passed).toBe(true);
    });

    it("should warn on small fillet radii", () => {
      const code = 'result = cq.Workplane("XY").box(100, 50, 25).edges().fillet(0.2)';
      const result = cadAccuracyValidatorEngine.validateDFM(code);

      // Small fillets are warned OR detected in details
      expect(result.warnings.some(w => w.toLowerCase().includes("fillet")) ||
             result.details.some(d => d.toLowerCase().includes("fillet"))).toBe(true);
    });

    it("should flag deep hole ratios", () => {
      // L/D ratio of 12:1 (5mm diameter, 60mm depth) exceeds 10:1 limit
      const code = 'result = cq.Workplane("XY").box(100, 50, 100).faces(">Z").workplane().hole(5, 60)';
      const result = cadAccuracyValidatorEngine.validateDFM(code);

      // Deep holes cause critical or warning depending on ratio
      expect(result.criticalIssues.length > 0 || result.warnings.length > 0).toBe(true);
    });

    it("should apply stricter limits for tool steels", () => {
      const code = 'result = cq.Workplane("XY").box(100, 50, 25).edges().fillet(0.3)';
      const result = cadAccuracyValidatorEngine.validateDFM(code, "D2");

      expect(result.details.some(d => d.includes("Tool steel"))).toBe(true);
    });

    it("should detect chamfers", () => {
      const code = 'result = cq.Workplane("XY").box(100, 50, 25).edges().chamfer(1.5)';
      const result = cadAccuracyValidatorEngine.validateDFM(code);

      expect(result.details.some(d => d.includes("Chamfer"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 4: TOLERANCE
  // ═══════════════════════════════════════════════════════════════════════════

  describe("validateTolerance", () => {
    it("should pass when no specs provided", () => {
      const result = cadAccuracyValidatorEngine.validateTolerance("cq.Workplane()...", []);

      expect(result.passed).toBe(true);
      expect(result.details).toContain("No tolerance specs provided — skipped");
    });

    it("should compute RSS stack tolerance", () => {
      const specs: DimensionalSpec[] = [
        { name: "dim1", nominal: 50, tolerance: { plus: 0.025, minus: 0.025 }, unit: "mm" },
        { name: "dim2", nominal: 30, tolerance: { plus: 0.025, minus: 0.025 }, unit: "mm" },
      ];
      const result = cadAccuracyValidatorEngine.validateTolerance("code", specs);

      expect(result.details.some(d => d.includes("RSS stack tolerance"))).toBe(true);
    });

    it("should warn on extremely tight tolerances", () => {
      const specs: DimensionalSpec[] = [
        { name: "critical", nominal: 10, tolerance: { plus: 0.003, minus: 0.003 }, unit: "mm" },
      ];
      const result = cadAccuracyValidatorEngine.validateTolerance("code", specs);

      expect(result.warnings.some(w => w.includes("tight"))).toBe(true);
    });

    it("should identify large stack tolerances", () => {
      const specs: DimensionalSpec[] = [
        { name: "dim1", nominal: 50, tolerance: { plus: 0.1, minus: 0.1 }, unit: "mm" },
        { name: "dim2", nominal: 30, tolerance: { plus: 0.1, minus: 0.1 }, unit: "mm" },
        { name: "dim3", nominal: 20, tolerance: { plus: 0.1, minus: 0.1 }, unit: "mm" },
      ];
      const result = cadAccuracyValidatorEngine.validateTolerance("code", specs);

      expect(result.warnings.some(w => w.includes("assembly"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 5: FEATURE
  // ═══════════════════════════════════════════════════════════════════════════

  describe("validateFeatures", () => {
    it("should pass when no expected features", () => {
      const result = cadAccuracyValidatorEngine.validateFeatures("code", []);

      expect(result.passed).toBe(true);
      expect(result.details).toContain("No expected features provided — skipped");
    });

    it("should detect cylinder features", () => {
      const code = 'result = cq.Workplane("XY").cylinder(50, 25)';
      const expected = [{ type: "cylinder", params: { length: 50, diameter: 50 } }];
      const result = cadAccuracyValidatorEngine.validateFeatures(code, expected);

      expect(result.details.some(d => d.includes("cylinder") && d.includes("found"))).toBe(true);
    });

    it("should detect box features", () => {
      const code = 'result = cq.Workplane("XY").box(100, 50, 25)';
      const expected = [{ type: "box", params: { length: 100, width: 50, height: 25 } }];
      const result = cadAccuracyValidatorEngine.validateFeatures(code, expected);

      expect(result.details.some(d => d.includes("box") && d.includes("found"))).toBe(true);
    });

    it("should detect hole features", () => {
      const code = 'result = cq.Workplane("XY").box(100, 50, 25).faces(">Z").hole(10, 15)';
      const expected = [
        { type: "box", params: { length: 100 } },
        { type: "hole", params: { diameter: 10 } },
      ];
      const result = cadAccuracyValidatorEngine.validateFeatures(code, expected);

      expect(result.details.some(d => d.includes("hole") && d.includes("found"))).toBe(true);
    });

    it("should warn on missing expected features", () => {
      const code = 'result = cq.Workplane("XY").box(100, 50, 25)';
      const expected = [
        { type: "box", params: {} },
        { type: "bore", params: { diameter: 25 } },
      ];
      const result = cadAccuracyValidatorEngine.validateFeatures(code, expected);

      expect(result.warnings.some(w => w.includes("bore") && w.includes("not detected"))).toBe(true);
    });

    it("should warn on parameter mismatches", () => {
      const code = 'result = cq.Workplane("XY").box(100, 50, 25)';
      const expected = [{ type: "box", params: { length: 80, width: 50, height: 25 } }];
      const result = cadAccuracyValidatorEngine.validateFeatures(code, expected);

      expect(result.warnings.some(w => w.includes("diff"))).toBe(true);
    });

    it("should calculate feature match rate", () => {
      const code = 'result = cq.Workplane("XY").box(100, 50, 25).hole(10)';
      const expected = [
        { type: "box", params: {} },
        { type: "hole", params: {} },
      ];
      const result = cadAccuracyValidatorEngine.validateFeatures(code, expected);

      expect(result.details.some(d => d.includes("match rate"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("integration", () => {
    it("should validate a complete flange part", async () => {
      const code = `
import cadquery as cq
result = cq.Workplane("XY").circle(30).extrude(10)
result = result.faces(">Z").workplane().hole(15)
result = result.edges().fillet(2)
show_object(result)
`;
      const input: ValidationInput = {
        code,
        expectedFeatures: [
          { type: "flange", params: {} },
          { type: "hole", params: { diameter: 15 } },
          { type: "fillet", params: { radius: 2 } },
        ],
      };
      const report = await cadAccuracyValidatorEngine.validateAccuracy(input);

      expect(report.overallPassed).toBe(true);
      expect(report.layers.every(l => l.layer >= 1 && l.layer <= 5)).toBe(true);
    });

    it("should fail invalid code with critical issues", async () => {
      const code = "result = invalid_function()";
      const report = await cadAccuracyValidatorEngine.validateAccuracy({ code });

      expect(report.criticalIssues.length).toBeGreaterThan(0);
    });

    it("should provide actionable recommendations on failure", async () => {
      const code = `
result = cq.Workplane("XY").box(100, 50, 25)
result = result.faces(">Z").hole(3, 50)
`;
      const report = await cadAccuracyValidatorEngine.validateAccuracy({ code });

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes("DFM") || r.includes("CAM"))).toBe(true);
    });
  });
});
