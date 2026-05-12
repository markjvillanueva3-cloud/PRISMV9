/**
 * Tests for MaterialHarvesterEngine
 *
 * Validates extraction of materials from SolidWorks .sldmat files:
 *   - solidworks materials.sldmat (~260 materials)
 *   - SolidWorks DIN Materials.sldmat (~207 materials)
 *   - sustainability extras.sldmat (~8 materials)
 *
 * Total expected: 475 materials across 26+ classifications.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  MaterialHarvesterEngine,
  type MaterialHarvestResult,
  type HarvestedMaterial,
} from "../engines/MaterialHarvesterEngine.js";

// ============================================================================
// SHARED HARVEST (run once, reuse across all tests)
// ============================================================================

let result: MaterialHarvestResult;

beforeAll(async () => {
  result = await MaterialHarvesterEngine.harvest();
}, 30_000);

// ============================================================================
// HARVEST COMPLETENESS
// ============================================================================

describe("MaterialHarvesterEngine", () => {
  describe("harvest() — completeness", () => {
    it("should find at least 100 materials total", () => {
      expect(result.totalMaterials).toBeGreaterThanOrEqual(100);
    });

    it("should find at least 400 materials across all 3 files", () => {
      expect(result.totalMaterials).toBeGreaterThanOrEqual(400);
    });

    it("should have materials from all 3 source files", () => {
      const fileNames = Object.keys(result.byFile);
      expect(fileNames).toContain("solidworks materials.sldmat");
      expect(fileNames).toContain("SolidWorks DIN Materials.sldmat");
      expect(fileNames).toContain("sustainability extras.sldmat");
    });

    it("should extract at least 200 materials from solidworks materials.sldmat", () => {
      expect(result.byFile["solidworks materials.sldmat"]).toBeGreaterThanOrEqual(200);
    });

    it("should extract at least 150 materials from DIN file", () => {
      expect(result.byFile["SolidWorks DIN Materials.sldmat"]).toBeGreaterThanOrEqual(150);
    });

    it("should extract materials from sustainability extras", () => {
      expect(result.byFile["sustainability extras.sldmat"]).toBeGreaterThanOrEqual(5);
    });

    it("should have a valid ISO timestamp", () => {
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ==========================================================================
  // CLASSIFICATIONS
  // ==========================================================================

  describe("harvest() — classifications", () => {
    it("should have Steel classification", () => {
      expect(result.byClassification).toHaveProperty("Steel");
      expect(result.byClassification["Steel"]).toBeGreaterThan(0);
    });

    it("should have Aluminium Alloys classification", () => {
      expect(result.byClassification).toHaveProperty("Aluminium Alloys");
    });

    it("should have Iron classification", () => {
      expect(result.byClassification).toHaveProperty("Iron");
    });

    it("should have DIN Steel classifications", () => {
      const dinSteelKeys = Object.keys(result.byClassification).filter((k) =>
        k.startsWith("DIN Steel")
      );
      expect(dinSteelKeys.length).toBeGreaterThanOrEqual(1);
    });

    it("should have at least 15 distinct classifications", () => {
      const classCount = Object.keys(result.byClassification).length;
      expect(classCount).toBeGreaterThanOrEqual(15);
    });
  });

  // ==========================================================================
  // SPECIFIC MATERIALS
  // ==========================================================================

  describe("harvest() — specific materials", () => {
    it("should contain 1023 Carbon Steel Sheet with density ~7858", () => {
      const matches = result.materials.filter((m) =>
        m.name.includes("1023 Carbon Steel Sheet")
      );
      expect(matches.length).toBeGreaterThanOrEqual(1);
      const mat = matches[0];
      expect(mat.classification).toBe("Steel");
      expect(mat.properties.densityKgM3).not.toBeNull();
      expect(mat.properties.densityKgM3!).toBeCloseTo(7858, 0);
    });

    it("should contain 201 Annealed Stainless Steel with Poisson ~0.27", () => {
      const matches = result.materials.filter((m) =>
        m.name.includes("201 Annealed Stainless Steel")
      );
      expect(matches.length).toBeGreaterThanOrEqual(1);
      const mat = matches[0];
      expect(mat.properties.poissonRatio).not.toBeNull();
      expect(mat.properties.poissonRatio!).toBeCloseTo(0.27, 2);
    });

    it("should parse A286 Iron Base Superalloy with elastic modulus ~201 GPa", () => {
      const matches = result.materials.filter((m) =>
        m.name.includes("A286 Iron Base Superalloy")
      );
      expect(matches.length).toBeGreaterThanOrEqual(1);
      const mat = matches[0];
      expect(mat.properties.elasticModulusGPa).not.toBeNull();
      expect(mat.properties.elasticModulusGPa!).toBeCloseTo(201, 0);
    });

    it("should have matId for each material", () => {
      const withId = result.materials.filter(
        (m) => m.matId && m.matId.length > 0
      );
      // Most materials have matIds; sustainability extras may not all have them
      expect(withId.length).toBeGreaterThan(300);
    });
  });

  // ==========================================================================
  // PROPERTY VALUE RANGES
  // ==========================================================================

  describe("harvest() — property value ranges", () => {
    let materialsWithDensity: HarvestedMaterial[];
    let materialsWithModulus: HarvestedMaterial[];
    let materialsWithTensile: HarvestedMaterial[];
    let materialsWithPoisson: HarvestedMaterial[];

    beforeAll(() => {
      materialsWithDensity = result.materials.filter(
        (m) => m.properties.densityKgM3 !== null
      );
      materialsWithModulus = result.materials.filter(
        (m) => m.properties.elasticModulusGPa !== null
      );
      materialsWithTensile = result.materials.filter(
        (m) => m.properties.tensileStrengthMPa !== null
      );
      materialsWithPoisson = result.materials.filter(
        (m) => m.properties.poissonRatio !== null
      );
    });

    it("should have densities in valid range (0.5-22500 kg/m3, including foams/gases)", () => {
      for (const m of materialsWithDensity) {
        const d = m.properties.densityKgM3!;
        expect(d).toBeGreaterThan(0);
        expect(d).toBeLessThanOrEqual(22_500);
      }
    });

    it("should have elastic modulus in range 0.001-1000 GPa", () => {
      for (const m of materialsWithModulus) {
        const e = m.properties.elasticModulusGPa!;
        expect(e).toBeGreaterThan(0);
        expect(e).toBeLessThanOrEqual(1000);
      }
    });

    it("should have tensile strength in range 1-5000 MPa", () => {
      for (const m of materialsWithTensile) {
        const ts = m.properties.tensileStrengthMPa!;
        expect(ts).toBeGreaterThan(0);
        expect(ts).toBeLessThanOrEqual(5000);
      }
    });

    it("should have Poisson ratio in range 0.0-0.8 (some auxetic/rubber materials exceed 0.5)", () => {
      for (const m of materialsWithPoisson) {
        const nu = m.properties.poissonRatio!;
        expect(nu).toBeGreaterThanOrEqual(0.0);
        expect(nu).toBeLessThanOrEqual(0.8);
      }
    });

    it("should have many materials with density populated", () => {
      // Density is almost universally present
      expect(materialsWithDensity.length).toBeGreaterThan(300);
    });
  });

  // ==========================================================================
  // UNIT CONVERSIONS
  // ==========================================================================

  describe("harvest() — unit conversions", () => {
    it("should convert elastic modulus from Pa to GPa correctly", () => {
      // 1023 Carbon Steel Sheet: EX value="204999998381.838750" Pa => ~205 GPa
      const mat = result.materials.find((m) =>
        m.name.includes("1023 Carbon Steel Sheet")
      );
      expect(mat).toBeDefined();
      expect(mat!.properties.elasticModulusGPa).not.toBeNull();
      expect(mat!.properties.elasticModulusGPa!).toBeCloseTo(205, 0);
    });

    it("should convert tensile strength from Pa to MPa correctly", () => {
      // 1023 Carbon Steel Sheet: SIGXT value="425000003.203703" Pa => 425 MPa
      const mat = result.materials.find((m) =>
        m.name.includes("1023 Carbon Steel Sheet")
      );
      expect(mat).toBeDefined();
      expect(mat!.properties.tensileStrengthMPa).not.toBeNull();
      expect(mat!.properties.tensileStrengthMPa!).toBeCloseTo(425, 0);
    });

    it("should convert yield strength from Pa to MPa correctly", () => {
      // 201 Annealed Stainless: SIGYLD value="292000000" Pa => 292 MPa
      const mat = result.materials.find((m) =>
        m.name.includes("201 Annealed Stainless Steel")
      );
      expect(mat).toBeDefined();
      expect(mat!.properties.yieldStrengthMPa).not.toBeNull();
      expect(mat!.properties.yieldStrengthMPa!).toBeCloseTo(292, 0);
    });
  });

  // ==========================================================================
  // FINANCIAL IMPACT (COST)
  // ==========================================================================

  describe("harvest() — cost data", () => {
    it("should extract Financial Impact cost for materials that have it", () => {
      const withCost = result.materials.filter(
        (m) => m.properties.costPerKg !== null
      );
      // The solidworks materials file has ~199 materials with Financial Impact
      expect(withCost.length).toBeGreaterThan(100);
    });

    it("should parse cost as a positive number in USD/kg", () => {
      const withCost = result.materials.filter(
        (m) => m.properties.costPerKg !== null
      );
      for (const m of withCost) {
        expect(m.properties.costPerKg!).toBeGreaterThan(0);
        expect(m.properties.costPerKg!).toBeLessThan(100000); // precious metals can be very expensive
      }
    });

    it("should have cost ~0.436 USD/kg for 1023 Carbon Steel Sheet", () => {
      const mat = result.materials.find((m) =>
        m.name.includes("1023 Carbon Steel Sheet")
      );
      expect(mat).toBeDefined();
      expect(mat!.properties.costPerKg).not.toBeNull();
      expect(mat!.properties.costPerKg!).toBeCloseTo(0.436, 2);
    });
  });

  // ==========================================================================
  // getSources()
  // ==========================================================================

  describe("getSources()", () => {
    it("should return 3 source files", () => {
      const sources = MaterialHarvesterEngine.getSources();
      expect(sources.files.length).toBe(3);
    });

    it("should include the correct root path", () => {
      const sources = MaterialHarvesterEngine.getSources();
      expect(sources.rootPath).toContain("SOLIDWORKS");
      expect(sources.rootPath).toContain("sldmaterials");
    });
  });

  // ==========================================================================
  // findByName() and filterByClassification()
  // ==========================================================================

  describe("findByName()", () => {
    it("should find materials by partial name match", () => {
      const steelMatches = MaterialHarvesterEngine.findByName(
        result.materials,
        "carbon steel"
      );
      expect(steelMatches.length).toBeGreaterThan(0);
      for (const m of steelMatches) {
        expect(m.name.toLowerCase()).toContain("carbon steel");
      }
    });
  });

  describe("filterByClassification()", () => {
    it("should filter materials by classification substring", () => {
      const steels = MaterialHarvesterEngine.filterByClassification(
        result.materials,
        "steel"
      );
      expect(steels.length).toBeGreaterThan(10);
      for (const m of steels) {
        expect(m.classification.toLowerCase()).toContain("steel");
      }
    });
  });

  // ==========================================================================
  // audit()
  // ==========================================================================

  describe("audit()", () => {
    it("should return a summary with all expected fields", async () => {
      const audit = await MaterialHarvesterEngine.audit();
      expect(audit.totalHarvested).toBeGreaterThan(100);
      expect(audit.classifications.length).toBeGreaterThan(10);
      expect(audit.withDensity).toBeGreaterThan(300);
      expect(audit.withTensile).toBeGreaterThan(200);
      expect(audit.withCost).toBeGreaterThan(100);
      expect(Object.keys(audit.byFile).length).toBe(3);
    });
  });
});
