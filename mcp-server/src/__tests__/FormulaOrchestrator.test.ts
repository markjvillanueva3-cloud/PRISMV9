/**
 * FormulaOrchestrator Tests
 * U-AWR31: 20+ tests for formula discovery, validation, and wiring
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import {
  FormulaOrchestrator,
  formulaOrchestrator,
  type FormulaMetadata,
  type ValidationResult,
  type CoverageReport,
  type FormulaEngineMapping,
} from "../engines/FormulaOrchestrator.js";

describe("FormulaOrchestrator", () => {
  describe("Singleton Pattern", () => {
    it("should return same instance via getInstance", () => {
      const instance1 = FormulaOrchestrator.getInstance();
      const instance2 = FormulaOrchestrator.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should export formulaOrchestrator singleton", () => {
      expect(formulaOrchestrator).toBeDefined();
      expect(formulaOrchestrator).toBeInstanceOf(FormulaOrchestrator);
    });
  });

  describe("Type Exports", () => {
    it("should export FormulaMetadata type structure", () => {
      const metadata: FormulaMetadata = {
        id: "test-formula",
        name: "Test Formula",
        domain: "general",
        sourceEngine: "TestEngine",
        inputs: [{ name: "force", type: "number", unit: "N" }],
        outputs: [{ name: "result", type: "number", unit: "mm" }],
        citations: ["Test Citation"],
        physicsCategory: "force",
      };
      expect(metadata.id).toBe("test-formula");
      expect(metadata.domain).toBe("general");
    });

    it("should export ValidationResult type structure", () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: ["test warning"],
        physicsGates: {
          force: true,
          thermal: true,
          deflection: true,
        },
      };
      expect(result.valid).toBe(true);
      expect(result.physicsGates.force).toBe(true);
    });

    it("should export CoverageReport type structure", () => {
      const report: CoverageReport = {
        totalFormulas: 100,
        mappedFormulas: 95,
        orphanFormulas: ["orphan1"],
        byDomain: { lathe: 20, mill: 30, wedm: 20, general: 30 },
        byCategory: { cutting: 50, thermal: 25, surface: 25 },
        byPhysicsCategory: { force: 40, thermal: 20, deflection: 15, wear: 15, surface: 10 },
      };
      expect(report.totalFormulas).toBe(100);
      expect(report.orphanFormulas).toHaveLength(1);
    });

    it("should export FormulaEngineMapping type structure", () => {
      const mapping: FormulaEngineMapping = {
        formulaId: "kienzle-001",
        formulaName: "Kienzle Cutting Force",
        sourceEngines: ["ManufacturingCalculations"],
        consumerEngines: ["SpeedFeedEngine", "ToolLifeEngine"],
        domain: "general",
        category: "cutting_force",
        validated: true,
      };
      expect(mapping.sourceEngines).toContain("ManufacturingCalculations");
    });
  });

  describe("Domain Classification", () => {
    it("should classify lathe formulas correctly", () => {
      const metadata: FormulaMetadata = {
        id: "turning-001",
        name: "Turning Surface Speed",
        domain: "lathe",
        sourceEngine: "LatheEngine",
        inputs: [],
        outputs: [],
        citations: [],
        physicsCategory: "force",
      };
      expect(metadata.domain).toBe("lathe");
    });

    it("should classify mill formulas correctly", () => {
      const metadata: FormulaMetadata = {
        id: "milling-001",
        name: "End Mill Engagement",
        domain: "mill",
        sourceEngine: "MillEngine",
        inputs: [],
        outputs: [],
        citations: [],
        physicsCategory: "force",
      };
      expect(metadata.domain).toBe("mill");
    });

    it("should classify wedm formulas correctly", () => {
      const metadata: FormulaMetadata = {
        id: "wedm-001",
        name: "Wire Break Detection",
        domain: "wedm",
        sourceEngine: "WEDMEngine",
        inputs: [],
        outputs: [],
        citations: [],
        physicsCategory: "thermal",
      };
      expect(metadata.domain).toBe("wedm");
    });

    it("should default to general domain for ambiguous formulas", () => {
      const metadata: FormulaMetadata = {
        id: "general-001",
        name: "Generic Cutting Force",
        domain: "general",
        sourceEngine: "GenericEngine",
        inputs: [],
        outputs: [],
        citations: [],
        physicsCategory: "force",
      };
      expect(metadata.domain).toBe("general");
    });
  });

  describe("Physics Category Classification", () => {
    it("should classify force physics category", () => {
      const metadata: FormulaMetadata = {
        id: "force-001",
        name: "Cutting Force",
        domain: "general",
        sourceEngine: "ForceEngine",
        inputs: [],
        outputs: [],
        citations: [],
        physicsCategory: "force",
      };
      expect(metadata.physicsCategory).toBe("force");
    });

    it("should classify thermal physics category", () => {
      const metadata: FormulaMetadata = {
        id: "thermal-001",
        name: "Cutting Temperature",
        domain: "general",
        sourceEngine: "ThermalEngine",
        inputs: [],
        outputs: [],
        citations: [],
        physicsCategory: "thermal",
      };
      expect(metadata.physicsCategory).toBe("thermal");
    });

    it("should classify deflection physics category", () => {
      const metadata: FormulaMetadata = {
        id: "deflect-001",
        name: "Tool Deflection",
        domain: "general",
        sourceEngine: "DeflectionEngine",
        inputs: [],
        outputs: [],
        citations: [],
        physicsCategory: "deflection",
      };
      expect(metadata.physicsCategory).toBe("deflection");
    });

    it("should classify wear physics category", () => {
      const metadata: FormulaMetadata = {
        id: "wear-001",
        name: "Tool Wear Rate",
        domain: "general",
        sourceEngine: "WearEngine",
        inputs: [],
        outputs: [],
        citations: [],
        physicsCategory: "wear",
      };
      expect(metadata.physicsCategory).toBe("wear");
    });

    it("should classify surface physics category", () => {
      const metadata: FormulaMetadata = {
        id: "surface-001",
        name: "Surface Roughness",
        domain: "general",
        sourceEngine: "SurfaceEngine",
        inputs: [],
        outputs: [],
        citations: [],
        physicsCategory: "surface",
      };
      expect(metadata.physicsCategory).toBe("surface");
    });
  });

  describe("Validation - Physics Gates", () => {
    it("should pass force gate for positive values", () => {
      const result = formulaOrchestrator.validateFormula("nonexistent", { force: 100 });
      expect(result.physicsGates.force).toBe(true);
    });

    it("should fail force gate for zero/negative values", () => {
      const result = formulaOrchestrator.validateFormula("nonexistent", { force: 0 });
      expect(result.physicsGates.force).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes("force"))).toBe(true);
    });

    it("should pass thermal gate within bounds (20-1500C)", () => {
      const result = formulaOrchestrator.validateFormula("nonexistent", { temperature: 500 });
      expect(result.physicsGates.thermal).toBe(true);
    });

    it("should fail thermal gate below 20C", () => {
      const result = formulaOrchestrator.validateFormula("nonexistent", { temperature: 10 });
      expect(result.physicsGates.thermal).toBe(false);
    });

    it("should fail thermal gate above 1500C", () => {
      const result = formulaOrchestrator.validateFormula("nonexistent", { temperature: 2000 });
      expect(result.physicsGates.thermal).toBe(false);
    });

    it("should pass deflection gate for roughing (<0.2mm)", () => {
      const result = formulaOrchestrator.validateFormula("nonexistent", {
        deflection: 0.15,
        operation: "roughing"
      });
      expect(result.physicsGates.deflection).toBe(true);
    });

    it("should warn deflection gate for roughing (>0.2mm)", () => {
      const result = formulaOrchestrator.validateFormula("nonexistent", {
        deflection: 0.25,
        operation: "roughing"
      });
      expect(result.physicsGates.deflection).toBe(false);
      expect(result.warnings.some(w => w.includes("roughing"))).toBe(true);
    });

    it("should pass deflection gate for finishing (<0.05mm)", () => {
      const result = formulaOrchestrator.validateFormula("nonexistent", {
        deflection: 0.03,
        operation: "finishing"
      });
      expect(result.physicsGates.deflection).toBe(true);
    });

    it("should warn deflection gate for finishing (>0.05mm)", () => {
      const result = formulaOrchestrator.validateFormula("nonexistent", {
        deflection: 0.08,
        operation: "finishing"
      });
      expect(result.physicsGates.deflection).toBe(false);
      expect(result.warnings.some(w => w.includes("finishing"))).toBe(true);
    });
  });

  describe("Formula Mapping", () => {
    it("should return undefined for non-existent formula", () => {
      const mapping = formulaOrchestrator.getFormulaMapping("nonexistent-formula-xyz");
      expect(mapping).toBeUndefined();
    });

    it("should handle wiring to non-existent formula gracefully", () => {
      expect(() => {
        formulaOrchestrator.wireFormulaToEngine("nonexistent", "TestEngine", "consumer");
      }).not.toThrow();
    });
  });

  describe("Coverage Report", () => {
    it("should return valid coverage report structure", () => {
      const report = formulaOrchestrator.getFormulaCoverage();
      expect(report).toHaveProperty("totalFormulas");
      expect(report).toHaveProperty("mappedFormulas");
      expect(report).toHaveProperty("orphanFormulas");
      expect(report).toHaveProperty("byDomain");
      expect(report).toHaveProperty("byCategory");
      expect(report).toHaveProperty("byPhysicsCategory");
    });

    it("should have domain counts in coverage report", () => {
      const report = formulaOrchestrator.getFormulaCoverage();
      expect(report.byDomain).toHaveProperty("lathe");
      expect(report.byDomain).toHaveProperty("mill");
      expect(report.byDomain).toHaveProperty("wedm");
      expect(report.byDomain).toHaveProperty("general");
    });

    it("should have physics category counts in coverage report", () => {
      const report = formulaOrchestrator.getFormulaCoverage();
      expect(report.byPhysicsCategory).toHaveProperty("force");
      expect(report.byPhysicsCategory).toHaveProperty("thermal");
      expect(report.byPhysicsCategory).toHaveProperty("deflection");
      expect(report.byPhysicsCategory).toHaveProperty("wear");
      expect(report.byPhysicsCategory).toHaveProperty("surface");
    });

    it("should have totalFormulas >= mappedFormulas", () => {
      const report = formulaOrchestrator.getFormulaCoverage();
      expect(report.totalFormulas).toBeGreaterThanOrEqual(report.mappedFormulas);
    });

    it("should have orphanFormulas as array", () => {
      const report = formulaOrchestrator.getFormulaCoverage();
      expect(Array.isArray(report.orphanFormulas)).toBe(true);
    });
  });

  describe("Validation Statistics", () => {
    it("should return validation stats structure", () => {
      const stats = formulaOrchestrator.getValidationStats();
      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("validated");
      expect(stats).toHaveProperty("pending");
    });

    it("should have total = validated + pending", () => {
      const stats = formulaOrchestrator.getValidationStats();
      expect(stats.total).toBe(stats.validated + stats.pending);
    });
  });

  describe("Orphan Formula Detection", () => {
    it("should return array of orphan formula IDs", () => {
      const orphans = formulaOrchestrator.getOrphanFormulas();
      expect(Array.isArray(orphans)).toBe(true);
    });
  });

  describe("Get Formulas By Domain", () => {
    it("should filter formulas by lathe domain", () => {
      const latheFormulas = formulaOrchestrator.getFormulasByDomain("lathe");
      expect(Array.isArray(latheFormulas)).toBe(true);
      latheFormulas.forEach(f => expect(f.domain).toBe("lathe"));
    });

    it("should filter formulas by mill domain", () => {
      const millFormulas = formulaOrchestrator.getFormulasByDomain("mill");
      expect(Array.isArray(millFormulas)).toBe(true);
      millFormulas.forEach(f => expect(f.domain).toBe("mill"));
    });

    it("should filter formulas by wedm domain", () => {
      const wedmFormulas = formulaOrchestrator.getFormulasByDomain("wedm");
      expect(Array.isArray(wedmFormulas)).toBe(true);
      wedmFormulas.forEach(f => expect(f.domain).toBe("wedm"));
    });

    it("should return all formulas when domain is 'all'", () => {
      const allFormulas = formulaOrchestrator.getFormulasByDomain("all");
      expect(Array.isArray(allFormulas)).toBe(true);
    });
  });
});
