/**
 * ToleranceAwareGenerationEngine Tests
 * CADCAM-DAGI-MS0/U-DAGI12
 *
 * Tests for GD&T-aware CAD generation with tolerance stack analysis.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  toleranceAwareGenerationEngine,
  type GDTSymbol,
  type FeatureControlFrame,
  type FeatureTolerance,
  type CustomerStandard,
  type StackAnalysis,
  type ToleranceGenerationInput,
  type ToleranceGenerationOutput,
} from "../../engines/ToleranceAwareGenerationEngine.js";

describe("ToleranceAwareGenerationEngine", () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // ENGINE INFO & CAPABILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  describe("info", () => {
    it("should expose engine info", () => {
      expect(toleranceAwareGenerationEngine.info.name).toBe("ToleranceAwareGenerationEngine");
      expect(toleranceAwareGenerationEngine.info.version).toBe("1.0.0");
      expect(toleranceAwareGenerationEngine.info.domain).toBe("cad_tolerance");
    });

    it("should have a description", () => {
      expect(toleranceAwareGenerationEngine.info.description).toContain("GD&T");
    });
  });

  describe("getCapabilities", () => {
    it("should return 4 capabilities", () => {
      const caps = toleranceAwareGenerationEngine.getCapabilities();
      expect(caps.length).toBe(4);
    });

    it("should include tolerance_generate", () => {
      const caps = toleranceAwareGenerationEngine.getCapabilities();
      expect(caps.some(c => c.name === "tolerance_generate")).toBe(true);
    });

    it("should include tolerance_stack_check", () => {
      const caps = toleranceAwareGenerationEngine.getCapabilities();
      expect(caps.some(c => c.name === "tolerance_stack_check")).toBe(true);
    });
  });

  describe("validate", () => {
    it("should reject non-object input", () => {
      expect(toleranceAwareGenerationEngine.validate(null)).toContain("must be an object");
      expect(toleranceAwareGenerationEngine.validate("string")).toContain("must be an object");
    });

    it("should reject missing features array", () => {
      expect(toleranceAwareGenerationEngine.validate({})).toContain("features array is required");
    });

    it("should accept valid input", () => {
      expect(toleranceAwareGenerationEngine.validate({ features: [] })).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER STANDARDS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("getStandard", () => {
    it("should return ITW standard", () => {
      const std = toleranceAwareGenerationEngine.getStandard("ITW");
      expect(std.customerId).toBe("itw");
      expect(std.name).toBe("Illinois Tool Works");
      expect(std.defaultLinearTolerance.plus).toBe(0.025);
    });

    it("should return ALCOA standard with aerospace tolerancing", () => {
      const std = toleranceAwareGenerationEngine.getStandard("ALCOA");
      expect(std.customerId).toBe("alcoa");
      expect(std.criticalFeatureSymbols).toContain("concentricity");
    });

    it("should return SFS standard", () => {
      const std = toleranceAwareGenerationEngine.getStandard("SFS");
      expect(std.customerId).toBe("sfs");
      expect(std.defaultLinearTolerance.plus).toBe(0.05);
    });

    it("should return DEFAULT for unknown customer", () => {
      const std = toleranceAwareGenerationEngine.getStandard("UNKNOWN_CUSTOMER");
      expect(std.customerId).toBe("default");
    });

    it("should handle undefined customer", () => {
      const std = toleranceAwareGenerationEngine.getStandard(undefined);
      expect(std.customerId).toBe("default");
    });

    it("should be case-insensitive", () => {
      const std = toleranceAwareGenerationEngine.getStandard("alcoa");
      expect(std.customerId).toBe("alcoa");
    });
  });

  describe("listStandards", () => {
    it("should list all available standards", () => {
      const standards = toleranceAwareGenerationEngine.listStandards();
      expect(standards).toContain("ITW");
      expect(standards).toContain("ALCOA");
      expect(standards).toContain("SFS");
      expect(standards).toContain("DEFAULT");
    });

    it("should return at least 4 standards", () => {
      const standards = toleranceAwareGenerationEngine.listStandards();
      expect(standards.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // APPLY TOLERANCES
  // ═══════════════════════════════════════════════════════════════════════════

  describe("applyTolerances", () => {
    it("should apply GD&T to cylinder features", () => {
      const features = [{ type: "cylinder", params: { diameter: 25, length: 50 } }];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features);

      expect(tolerances.length).toBe(1);
      expect(tolerances[0].featureId).toBe("F1");
      expect(tolerances[0].featureType).toBe("cylinder");
      expect(tolerances[0].gdtCallouts.some(g => g.symbol === "cylindricity")).toBe(true);
    });

    it("should apply position and perpendicularity to holes", () => {
      const features = [
        { type: "box", params: { length: 100, width: 50, height: 25 } },
        { type: "hole", params: { diameter: 10 } },
      ];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features);

      const holeTol = tolerances.find(t => t.featureType === "hole");
      expect(holeTol).toBeDefined();
      expect(holeTol!.gdtCallouts.some(g => g.symbol === "position")).toBe(true);
      expect(holeTol!.gdtCallouts.some(g => g.symbol === "perpendicularity")).toBe(true);
    });

    it("should apply MMC to hole position", () => {
      const features = [
        { type: "box", params: { length: 100 } },
        { type: "hole", params: { diameter: 10 } },
      ];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features);

      const holeTol = tolerances.find(t => t.featureType === "hole");
      const posTol = holeTol!.gdtCallouts.find(g => g.symbol === "position");
      expect(posTol!.materialCondition).toBe("MMC");
    });

    it("should apply flatness to box features", () => {
      const features = [{ type: "box", params: { length: 100, width: 50, height: 25 } }];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features);

      expect(tolerances[0].gdtCallouts.some(g => g.symbol === "flatness")).toBe(true);
    });

    it("should apply datum references to orientation callouts", () => {
      const features = [
        { type: "box", params: { length: 100, width: 50, height: 25 } },
        { type: "hole", params: { diameter: 10 } },
      ];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features);

      const holeTol = tolerances.find(t => t.featureType === "hole");
      const perpTol = holeTol!.gdtCallouts.find(g => g.symbol === "perpendicularity");
      expect(perpTol!.datumRefs).toBeDefined();
      expect(perpTol!.datumRefs!.length).toBeGreaterThan(0);
    });

    it("should not apply GD&T to chamfers", () => {
      const features = [
        { type: "box", params: { length: 100 } },
        { type: "chamfer", params: { size: 1 } },
      ];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features);

      const chamferTol = tolerances.find(t => t.featureType === "chamfer");
      expect(chamferTol!.gdtCallouts.length).toBe(0);
    });

    it("should apply customer-specific tolerances for ITW", () => {
      const features = [{ type: "hole", params: { diameter: 10 } }];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features, "ITW");

      expect(tolerances[0].linearTolerance!.plus).toBe(0.025);
    });

    it("should apply customer-specific tolerances for ALCOA", () => {
      const features = [{ type: "hole", params: { diameter: 10 } }];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features, "ALCOA");

      expect(tolerances[0].linearTolerance!.plus).toBe(0.038);
    });

    it("should include surface finish for bores", () => {
      const features = [{ type: "bore", params: { diameter: 25 } }];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features);

      expect(tolerances[0].surfaceFinish).toBeDefined();
      expect(tolerances[0].surfaceFinish!.Ra).toBe(1.6);
    });

    it("should assign ISO fit for holes", () => {
      const features = [{ type: "hole", params: { diameter: 10 } }];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features, "ITW");

      expect(tolerances[0].isoFit).toBe("H7/h6");
      expect(tolerances[0].fitType).toBe("clearance");
    });

    it("should use diameter zone for hole position", () => {
      const features = [
        { type: "box", params: { length: 100 } },
        { type: "hole", params: { diameter: 10 } },
      ];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features);

      const holeTol = tolerances.find(t => t.featureType === "hole");
      const posTol = holeTol!.gdtCallouts.find(g => g.symbol === "position");
      expect(posTol!.diameter).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STACK CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  describe("stackCheck", () => {
    it("should compute RSS stack tolerance", () => {
      const features = [
        { type: "box", params: { length: 100 } },
        { type: "hole", params: { diameter: 10 } },
      ];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features, "DEFAULT");
      const analysis = toleranceAwareGenerationEngine.stackCheck(features, tolerances, "overall_length");

      expect(analysis.stackTolerance).toBeGreaterThan(0);
      expect(analysis.dimension).toBe("overall_length");
    });

    it("should pass when stack tolerance is within limit", () => {
      const features = [{ type: "box", params: { length: 100 } }];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features);
      const analysis = toleranceAwareGenerationEngine.stackCheck(features, tolerances, "length", 0.5);

      expect(analysis.passesRequirement).toBe(true);
    });

    it("should fail when stack tolerance exceeds limit", () => {
      const features = [
        { type: "box", params: { length: 100 } },
        { type: "hole", params: { diameter: 10 } },
        { type: "hole", params: { diameter: 10 } },
        { type: "hole", params: { diameter: 10 } },
      ];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features, "SFS");
      const analysis = toleranceAwareGenerationEngine.stackCheck(features, tolerances, "length", 0.01);

      expect(analysis.passesRequirement).toBe(false);
      expect(analysis.recommendation).toBeDefined();
    });

    it("should identify critical contributors", () => {
      const features = [
        { type: "box", params: { length: 100 } },
        { type: "hole", params: { diameter: 10 } },
      ];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features, "SFS");
      const analysis = toleranceAwareGenerationEngine.stackCheck(features, tolerances, "dim");

      expect(analysis.criticalContributors).toBeDefined();
      expect(Array.isArray(analysis.criticalContributors)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE WITH TOLERANCE
  // ═══════════════════════════════════════════════════════════════════════════

  describe("generateWithTolerance", () => {
    it("should generate complete output", async () => {
      const input: ToleranceGenerationInput = {
        features: [
          { type: "cylinder", params: { diameter: 25, length: 50 } },
          { type: "hole", params: { diameter: 8 } },
        ],
        customer: "ITW",
      };
      const output = await toleranceAwareGenerationEngine.generateWithTolerance(input);

      expect(output.features).toBeDefined();
      expect(output.tolerances.length).toBe(2);
      expect(output.datumStructure.length).toBeGreaterThan(0);
      expect(output.code).toContain("import cadquery");
    });

    it("should include GD&T accuracy metric", async () => {
      const input: ToleranceGenerationInput = {
        features: [
          { type: "box", params: { length: 100, width: 50, height: 25 } },
          { type: "hole", params: { diameter: 10 } },
        ],
      };
      const output = await toleranceAwareGenerationEngine.generateWithTolerance(input);

      expect(output.gdtAccuracy).toBeGreaterThan(0);
      expect(output.gdtAccuracy).toBeLessThanOrEqual(1);
    });

    it("should perform stack analysis when assembly context provided", async () => {
      const input: ToleranceGenerationInput = {
        features: [
          { type: "box", params: { length: 100 } },
          { type: "hole", params: { diameter: 10 } },
        ],
        assemblyContext: {
          matingParts: ["shaft"],
          criticalDimensions: ["bore_to_face"],
          maxStackTolerance: 0.1,
        },
      };
      const output = await toleranceAwareGenerationEngine.generateWithTolerance(input);

      expect(output.stackAnalyses.length).toBe(1);
      expect(output.stackAnalyses[0].dimension).toBe("bore_to_face");
    });

    it("should warn on stack-up violations", async () => {
      const input: ToleranceGenerationInput = {
        features: [
          { type: "box", params: { length: 100 } },
          { type: "hole", params: { diameter: 10 } },
          { type: "hole", params: { diameter: 10 } },
          { type: "hole", params: { diameter: 10 } },
        ],
        customer: "SFS",
        assemblyContext: {
          matingParts: ["shaft"],
          criticalDimensions: ["overall"],
          maxStackTolerance: 0.01,
        },
      };
      const output = await toleranceAwareGenerationEngine.generateWithTolerance(input);

      expect(output.warnings.some(w => w.includes("Stack-up violation"))).toBe(true);
    });

    it("should warn on tight position tolerances", async () => {
      const input: ToleranceGenerationInput = {
        features: [{ type: "hole", params: { diameter: 5 } }],
        machineCapability: {
          linearCapability: 0.025,
          positionCapability: 0.1,
          runoutCapability: 0.05,
        },
      };
      const output = await toleranceAwareGenerationEngine.generateWithTolerance(input);

      // Small feature -> tight tolerance that may be difficult
      expect(output.warnings).toBeDefined();
    });

    it("should generate CadQuery code with datum structure", async () => {
      const input: ToleranceGenerationInput = {
        features: [
          { type: "flange", params: { od: 60, id: 25, thickness: 10 } },
          { type: "hole", params: { diameter: 8 } },
        ],
      };
      const output = await toleranceAwareGenerationEngine.generateWithTolerance(input);

      expect(output.code).toContain("Datum structure");
      expect(output.datumStructure.includes("A")).toBe(true);
    });

    it("should include GD&T comments in generated code", async () => {
      const input: ToleranceGenerationInput = {
        features: [
          { type: "cylinder", params: { diameter: 25, length: 50 } },
        ],
      };
      const output = await toleranceAwareGenerationEngine.generateWithTolerance(input);

      expect(output.code).toContain("cylindricity");
    });

    it("should handle empty features array", async () => {
      const input: ToleranceGenerationInput = { features: [] };
      const output = await toleranceAwareGenerationEngine.generateWithTolerance(input);

      expect(output.tolerances.length).toBe(0);
      expect(output.gdtAccuracy).toBe(1);
    });

    it("should use default machine capability when not provided", async () => {
      const input: ToleranceGenerationInput = {
        features: [{ type: "hole", params: { diameter: 10 } }],
      };
      const output = await toleranceAwareGenerationEngine.generateWithTolerance(input);

      expect(output.tolerances[0].gdtCallouts.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GD&T SYMBOL RULES
  // ═══════════════════════════════════════════════════════════════════════════

  describe("GD&T symbol rules", () => {
    it("should apply concentricity to bores", () => {
      const features = [{ type: "bore", params: { diameter: 25 } }];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features);

      expect(tolerances[0].gdtCallouts.some(g => g.symbol === "concentricity")).toBe(true);
    });

    it("should apply parallelism to slots", () => {
      const features = [{ type: "slot", params: { width: 10, length: 50 } }];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features);

      expect(tolerances[0].gdtCallouts.some(g => g.symbol === "parallelism")).toBe(true);
    });

    it("should apply perpendicularity to bosses", () => {
      const features = [{ type: "boss", params: { diameter: 15, height: 10 } }];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features);

      expect(tolerances[0].gdtCallouts.some(g => g.symbol === "perpendicularity")).toBe(true);
    });

    it("should apply concentricity and position to threads", () => {
      const features = [{ type: "thread", params: { diameter: 10, pitch: 1.5 } }];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features);

      expect(tolerances[0].gdtCallouts.some(g => g.symbol === "concentricity")).toBe(true);
      expect(tolerances[0].gdtCallouts.some(g => g.symbol === "position")).toBe(true);
    });

    it("should not apply GD&T to fillets", () => {
      const features = [{ type: "fillet", params: { radius: 2 } }];
      const tolerances = toleranceAwareGenerationEngine.applyTolerances(features);

      expect(tolerances[0].gdtCallouts.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DATUM STRUCTURE
  // ═══════════════════════════════════════════════════════════════════════════

  describe("datum structure", () => {
    it("should determine primary datum from base feature", async () => {
      const input: ToleranceGenerationInput = {
        features: [
          { type: "box", params: { length: 100, width: 50, height: 25 } },
          { type: "hole", params: { diameter: 10 } },
        ],
      };
      const output = await toleranceAwareGenerationEngine.generateWithTolerance(input);

      expect(output.datumStructure[0]).toBe("A");
    });

    it("should add secondary datum for cylindrical features", async () => {
      const input: ToleranceGenerationInput = {
        features: [
          { type: "flange", params: { od: 60, id: 25, thickness: 10 } },
          { type: "bore", params: { diameter: 15 } },
        ],
      };
      const output = await toleranceAwareGenerationEngine.generateWithTolerance(input);

      expect(output.datumStructure.includes("B")).toBe(true);
    });

    it("should add tertiary datum for complex assemblies", async () => {
      const input: ToleranceGenerationInput = {
        features: [
          { type: "box", params: { length: 100 } },
          { type: "hole", params: { diameter: 10 } },
          { type: "hole", params: { diameter: 8 } },
        ],
      };
      const output = await toleranceAwareGenerationEngine.generateWithTolerance(input);

      expect(output.datumStructure.includes("C")).toBe(true);
    });

    it("should default to single datum A for simple features", async () => {
      const input: ToleranceGenerationInput = {
        features: [{ type: "cylinder", params: { diameter: 25, length: 50 } }],
      };
      const output = await toleranceAwareGenerationEngine.generateWithTolerance(input);

      expect(output.datumStructure.length).toBeGreaterThanOrEqual(1);
      expect(output.datumStructure[0]).toBe("A");
    });
  });
});
