/**
 * CadPartLibraryEngine — Tests
 * RES-MS10 U-PART01: Validates CAD part library indexing and classification
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  CadPartLibraryEngine,
  type CadPartLibraryResult,
  type CadPart,
} from "../engines/CadPartLibraryEngine.js";

let result: CadPartLibraryResult;

beforeAll(async () => {
  result = await CadPartLibraryEngine.harvest();
}, 30_000);

describe("CadPartLibraryEngine", () => {
  // ==========================================================================
  // SOURCE INFO
  // ==========================================================================
  describe("getSources()", () => {
    it("returns correct batch 1 path", () => {
      expect(CadPartLibraryEngine.getSources().batch1Path).toContain("BATCH 1");
    });

    it("returns correct CAD files path", () => {
      expect(CadPartLibraryEngine.getSources().cadFilesPath).toContain("CAD FILES");
    });

    it("expects ~71 parts", () => {
      expect(CadPartLibraryEngine.getSources().expectedParts).toBe(71);
    });
  });

  // ==========================================================================
  // HARVEST — COMPLETENESS
  // ==========================================================================
  describe("harvest() — completeness", () => {
    it("finds at least 60 parts total", () => {
      expect(result.totalParts).toBeGreaterThanOrEqual(60);
    });

    it("finds close to 71 parts", () => {
      expect(result.totalParts).toBeGreaterThanOrEqual(65);
      expect(result.totalParts).toBeLessThanOrEqual(85);
    });

    it("has valid ISO timestamp", () => {
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("all parts have non-zero file size", () => {
      for (const p of result.parts) {
        expect(p.fileSize).toBeGreaterThan(0);
      }
    });

    it("all parts have valid extensions", () => {
      for (const p of result.parts) {
        expect([".step", ".stp"]).toContain(p.extension);
      }
    });

    it("all file paths use forward slashes", () => {
      for (const p of result.parts) {
        expect(p.filePath).not.toContain("\\");
      }
    });
  });

  // ==========================================================================
  // SOURCE BREAKDOWN
  // ==========================================================================
  describe("harvest() — by source", () => {
    it("has 30 JM Die production parts", () => {
      expect(result.bySource["jm_die_production"]).toBe(30);
    });

    it("has 35+ CAD reference parts", () => {
      expect(result.bySource["cad_reference"]).toBeGreaterThanOrEqual(35);
    });

    it("has 2 training parts", () => {
      expect(result.bySource["training"]).toBe(2);
    });

    it("production + reference + training = total", () => {
      const sum = Object.values(result.bySource).reduce((a, b) => a + b, 0);
      expect(sum).toBe(result.totalParts);
    });
  });

  // ==========================================================================
  // COMPLEXITY CLASSIFICATION
  // ==========================================================================
  describe("harvest() — complexity", () => {
    it("has all four complexity levels", () => {
      expect(result.byComplexity["simple"]).toBeGreaterThan(0);
      expect(result.byComplexity["medium"]).toBeGreaterThan(0);
      expect(result.byComplexity["complex"]).toBeGreaterThan(0);
      expect(result.byComplexity["extreme"]).toBeGreaterThan(0);
    });

    it("assembly of jet is extreme complexity", () => {
      const jet = result.parts.find((p) => p.filename.includes("assembly of jet"));
      expect(jet).toBeDefined();
      expect(jet!.complexity).toBe("extreme");
    });

    it("impeller is complex", () => {
      const impeller = result.parts.find((p) =>
        p.filename.toLowerCase().includes("impeller")
      );
      expect(impeller).toBeDefined();
      expect(impeller!.complexity).toBe("complex");
    });

    it("small JM Die parts are simple or medium", () => {
      const small = result.parts.filter(
        (p) => p.source === "jm_die_production" && p.fileSize < 20_000
      );
      expect(small.length).toBeGreaterThan(0);
      for (const p of small) {
        expect(["simple", "medium"]).toContain(p.complexity);
      }
    });
  });

  // ==========================================================================
  // OPERATION CLASSIFICATION
  // ==========================================================================
  describe("harvest() — operations", () => {
    it("has turning operations (lathe-first shop)", () => {
      expect(result.byOperation["turning"]).toBeGreaterThan(10);
    });

    it("has 3axis_milling operations", () => {
      expect(result.byOperation["3axis_milling"]).toBeGreaterThan(0);
    });

    it("has mill_turn operations (MULTUS parts)", () => {
      expect(result.byOperation["mill_turn"]).toBeGreaterThan(0);
    });

    it("has workholding tagged parts (vise, clamp, jaw)", () => {
      expect(result.byOperation["workholding"]).toBeGreaterThan(0);
    });

    it("HURCO parts are classified as 3axis_milling", () => {
      const hurco = result.parts.filter((p) => p.machineHint === "HURCO");
      expect(hurco.length).toBeGreaterThan(0);
      for (const p of hurco) {
        expect(p.operations).toContain("3axis_milling");
      }
    });

    it("MULTUS parts are classified as mill_turn", () => {
      const multus = result.parts.filter((p) => p.machineHint === "MULTUS");
      expect(multus.length).toBeGreaterThan(0);
      for (const p of multus) {
        expect(p.operations).toContain("mill_turn");
      }
    });
  });

  // ==========================================================================
  // MACHINE HINTS
  // ==========================================================================
  describe("harvest() — machine hints", () => {
    it("extracts MACHINE 5 from JM Die parts", () => {
      const m5 = result.parts.filter((p) => p.machineHint === "MACHINE 5");
      expect(m5.length).toBeGreaterThan(0);
    });

    it("extracts MACHINE 4 from JM Die parts", () => {
      const m4 = result.parts.filter((p) => p.machineHint === "MACHINE 4");
      expect(m4.length).toBeGreaterThan(0);
    });

    it("extracts HURCO from JM Die parts", () => {
      const hurco = result.parts.filter((p) => p.machineHint === "HURCO");
      expect(hurco.length).toBeGreaterThanOrEqual(2);
    });

    it("reference parts mostly have no machine hint", () => {
      const refs = result.parts.filter((p) => p.source === "cad_reference");
      const noHint = refs.filter((p) => p.machineHint === null);
      expect(noHint.length).toBeGreaterThan(refs.length * 0.8);
    });
  });

  // ==========================================================================
  // FEATURE TAGS
  // ==========================================================================
  describe("harvest() — feature tags", () => {
    it("has multiple unique feature tags", () => {
      expect(result.allFeatureTags.length).toBeGreaterThanOrEqual(8);
    });

    it("includes groove tag", () => {
      expect(result.allFeatureTags).toContain("groove");
    });

    it("includes die tag", () => {
      expect(result.allFeatureTags).toContain("die");
    });

    it("includes casing tag", () => {
      expect(result.allFeatureTags).toContain("casing");
    });

    it("B0762-87-01 GROOVE has groove feature tag", () => {
      const groove = result.parts.find((p) => p.filename.includes("GROOVE"));
      expect(groove).toBeDefined();
      expect(groove!.featureTags).toContain("groove");
    });
  });

  // ==========================================================================
  // SPECIFIC PARTS
  // ==========================================================================
  describe("specific parts", () => {
    it("Kurt HD690 Vise has workholding operation", () => {
      const vise = result.parts.find((p) =>
        p.filename.toLowerCase().includes("vise")
      );
      expect(vise).toBeDefined();
      expect(vise!.operations).toContain("workholding");
    });

    it("blisk has 5axis_milling operation", () => {
      const blisk = result.parts.find((p) =>
        p.filename.toLowerCase().includes("blisk")
      );
      expect(blisk).toBeDefined();
      expect(blisk!.operations).toContain("5axis_milling");
    });

    it("ROTOR SHAFT has turning operation", () => {
      const rotor = result.parts.find((p) =>
        p.filename.toUpperCase().includes("ROTOR SHAFT")
      );
      expect(rotor).toBeDefined();
      expect(rotor!.operations).toContain("turning");
    });
  });

  // ==========================================================================
  // FILTER METHODS
  // ==========================================================================
  describe("filterBySource()", () => {
    it("returns only JM Die production parts", () => {
      const prod = CadPartLibraryEngine.filterBySource(result.parts, "jm_die_production");
      expect(prod.length).toBe(30);
      for (const p of prod) {
        expect(p.source).toBe("jm_die_production");
        expect(p.isProduction).toBe(true);
      }
    });
  });

  describe("filterByComplexity()", () => {
    it("returns only simple parts", () => {
      const simple = CadPartLibraryEngine.filterByComplexity(result.parts, "simple");
      expect(simple.length).toBeGreaterThan(0);
      for (const p of simple) {
        expect(p.complexity).toBe("simple");
      }
    });
  });

  describe("filterByOperation()", () => {
    it("returns parts needing turning", () => {
      const turning = CadPartLibraryEngine.filterByOperation(result.parts, "turning");
      expect(turning.length).toBeGreaterThan(10);
    });
  });

  describe("findByName()", () => {
    it("finds casing parts by name", () => {
      const casings = CadPartLibraryEngine.findByName(result.parts, "casing");
      expect(casings.length).toBeGreaterThanOrEqual(1);
    });

    it("case-insensitive search", () => {
      const results = CadPartLibraryEngine.findByName(result.parts, "VALVE");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("filterByFeature()", () => {
    it("finds groove-tagged parts", () => {
      const grooves = CadPartLibraryEngine.filterByFeature(result.parts, "groove");
      expect(grooves.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // AUDIT
  // ==========================================================================
  describe("audit()", () => {
    it("returns valid summary", async () => {
      const audit = await CadPartLibraryEngine.audit();
      expect(audit.totalParts).toBeGreaterThan(60);
      expect(audit.productionParts).toBe(30);
      expect(audit.referenceParts).toBeGreaterThan(35);
      expect(audit.featureTagCount).toBeGreaterThanOrEqual(8);
    });
  });
});
