/**
 * Tests for enrichment engines:
 * - DimensionImputationEngine
 * - CrossCatalogValidationEngine
 * - FusionToolSyncEngine
 */
import { describe, it, expect, beforeEach } from "vitest";
import { DimensionImputationEngine } from "../engines/DimensionImputationEngine.js";
import { CrossCatalogValidationEngine } from "../engines/CrossCatalogValidationEngine.js";
import { FusionToolSyncEngine } from "../engines/FusionToolSyncEngine.js";

// ── Mock tool helpers ────────────────────────────────────────────────────────

function makeTool(overrides: Record<string, unknown> = {}) {
  return {
    id: overrides.id ?? "T1",
    manufacturer: overrides.manufacturer ?? "Kennametal",
    type: overrides.type ?? "end_mill",
    physical: {
      cutting_diameter_mm: (overrides as any).dc ?? 10,
      shank_diameter_mm: (overrides as any).shank ?? 10,
      overall_length_mm: (overrides as any).oal ?? 72,
      flute_length_mm: (overrides as any).loc ?? 22,
    },
    flute_count: (overrides as any).flutes ?? 4,
    cutting_data: (overrides as any).cutting_data ?? { P: { vc_min: 100, vc_max: 200, fz_min: 0.05, fz_max: 0.1 } },
  };
}

/** Make a ValidationToolRecord for CrossCatalogValidationEngine */
function makeValidationTool(overrides: Record<string, unknown> = {}) {
  return {
    id: (overrides.id ?? "V1") as string,
    manufacturer: (overrides.manufacturer ?? "Kennametal") as string,
    type: (overrides.type ?? "end_mill") as string,
    grade: overrides.grade as string | undefined,
    coating: overrides.coating as string | undefined,
    material: overrides.material as string | undefined,
    physical: {
      diameter_mm: (overrides as any).dc ?? 10,
      overall_length_mm: (overrides as any).oal ?? 72,
      shank_diameter_mm: (overrides as any).shank ?? 10,
      flute_length_mm: (overrides as any).loc ?? 22,
    },
    flute_count: (overrides as any).flutes as number | undefined,
    helix_angle_deg: (overrides as any).helix as number | undefined,
    point_angle_deg: (overrides as any).point_angle as number | undefined,
    ic_mm: (overrides as any).ic_mm as number | undefined,
    cutting_data: (overrides as any).cutting_data as Record<string, unknown> | undefined,
  };
}

/** Make a CatalogTool-like record for FusionToolSyncEngine */
function makeCatalogTool(overrides: Record<string, unknown> = {}) {
  return {
    id: (overrides.id ?? "C1") as string,
    manufacturer: (overrides.manufacturer ?? "Kennametal") as string,
    series: (overrides.series ?? "F40") as string,
    designation: (overrides.designation ?? "F40-10") as string,
    type: (overrides.type ?? "end_mill") as string,
    material: (overrides.material ?? "carbide") as string,
    coating: overrides.coating as string | undefined,
    physical: {
      cutting_diameter_mm: (overrides as any).dc ?? 10,
      shank_diameter_mm: (overrides as any).shank ?? 10,
      overall_length_mm: (overrides as any).oal ?? 72,
      flute_length_mm: (overrides as any).loc ?? 22,
    },
    flute_count: (overrides as any).flutes ?? 4,
    iso_groups: ((overrides as any).iso_groups ?? ["P"]) as string[],
    operations: ((overrides as any).operations ?? ["milling"]) as string[],
  } as any;
}

// ═════════════════════════════════════════════════════════════════════════════
// DimensionImputationEngine
// ═════════════════════════════════════════════════════════════════════════════

describe("DimensionImputationEngine", () => {
  let engine: DimensionImputationEngine;

  beforeEach(() => {
    engine = new DimensionImputationEngine();
  });

  describe("buildModels", () => {
    it("should build regression models from tools with known (non-estimated) dimensions", () => {
      // Tools with non-round OAL/DC ratios (not 4,5,6,8) are treated as real
      const tools = [
        makeTool({ id: "R1", dc: 6,  oal: 50,  loc: 15, shank: 6 }),  // 50/6=8.33 → real
        makeTool({ id: "R2", dc: 8,  oal: 63,  loc: 19, shank: 8 }),  // 63/8=7.875 → real
        makeTool({ id: "R3", dc: 10, oal: 72,  loc: 22, shank: 10 }), // 72/10=7.2 → real
        makeTool({ id: "R4", dc: 12, oal: 83,  loc: 26, shank: 12 }), // 83/12=6.917 → real
        makeTool({ id: "R5", dc: 16, oal: 92,  loc: 35, shank: 16 }), // 92/16=5.75 → real
        makeTool({ id: "R6", dc: 20, oal: 104, loc: 38, shank: 20 }), // 104/20=5.2 → real
      ];

      const result = engine.buildModels(tools);
      expect(result.modelsBuilt).toBeGreaterThanOrEqual(1);
      expect(result.coverage["Kennametal_end_mill"]).toBeGreaterThanOrEqual(5);

      const models = engine.getModels();
      expect(models.length).toBeGreaterThanOrEqual(1);
      expect(models[0].oalCoeffs.r2).toBeGreaterThan(0.5);
    });

    it("should require minimum 5 tools per group to build a model", () => {
      // Only 3 tools — not enough
      const tools = [
        makeTool({ id: "R1", dc: 6,  oal: 50, loc: 15 }),
        makeTool({ id: "R2", dc: 8,  oal: 63, loc: 19 }),
        makeTool({ id: "R3", dc: 10, oal: 72, loc: 22 }),
      ];

      const result = engine.buildModels(tools);
      expect(result.modelsBuilt).toBe(0);
    });
  });

  describe("imputeDimensions", () => {
    it("should detect estimated dimensions (OAL=DC*6, LOC=DC*2)", () => {
      // First build models from real data
      const realTools = [
        makeTool({ id: "R1", dc: 6,  oal: 50,  loc: 15, shank: 6 }),
        makeTool({ id: "R2", dc: 8,  oal: 63,  loc: 19, shank: 8 }),
        makeTool({ id: "R3", dc: 10, oal: 72,  loc: 22, shank: 10 }),
        makeTool({ id: "R4", dc: 12, oal: 83,  loc: 26, shank: 12 }),
        makeTool({ id: "R5", dc: 16, oal: 92,  loc: 35, shank: 16 }),
        makeTool({ id: "R6", dc: 20, oal: 104, loc: 38, shank: 20 }),
      ];
      engine.buildModels(realTools);

      // Estimated tool: OAL=DC*6=60, LOC=DC*2=20 — classic estimated pattern
      const estimatedTools = [
        makeTool({ id: "EST1", dc: 10, oal: 60, loc: 20, shank: 10 }),
      ];

      const results = engine.imputeDimensions(estimatedTools);
      expect(results.length).toBe(1);
      expect(results[0].toolId).toBe("EST1");
      // The imputed OAL should differ from the estimated 60
      expect(results[0].imputed.oal).not.toBe(60);
      expect(results[0].method).toBe("regression");
    });

    it("should produce confidence scores > 0.5 when models exist", () => {
      const realTools = [
        makeTool({ id: "R1", dc: 6,  oal: 50,  loc: 15, shank: 6 }),
        makeTool({ id: "R2", dc: 8,  oal: 63,  loc: 19, shank: 8 }),
        makeTool({ id: "R3", dc: 10, oal: 72,  loc: 22, shank: 10 }),
        makeTool({ id: "R4", dc: 12, oal: 83,  loc: 26, shank: 12 }),
        makeTool({ id: "R5", dc: 16, oal: 92,  loc: 35, shank: 16 }),
        makeTool({ id: "R6", dc: 20, oal: 104, loc: 38, shank: 20 }),
      ];
      engine.buildModels(realTools);

      const estimated = [makeTool({ id: "EST1", dc: 10, oal: 60, loc: 20, shank: 10 })];
      const results = engine.imputeDimensions(estimated);

      expect(results.length).toBe(1);
      expect(results[0].confidence.oal).toBeGreaterThan(0.5);
    });
  });

  describe("getStats", () => {
    it("should count real vs estimated dimensions correctly", () => {
      const tools = [
        makeTool({ id: "REAL", dc: 10, oal: 72, loc: 22, shank: 12 }),   // real OAL (72/10=7.2)
        makeTool({ id: "EST",  dc: 10, oal: 60, loc: 20, shank: 10 }),   // estimated OAL (60/10=6)
        makeTool({ id: "EST2", dc: 8,  oal: 40, loc: 16, shank: 8 }),    // estimated OAL (40/8=5), LOC (16/8=2)
      ];

      const stats = engine.getStats(tools);
      expect(stats.totalTools).toBe(3);
      // Only the first tool has non-estimated OAL
      expect(stats.withRealOAL).toBe(1);
      // The second and third have LOC=DC*2 — estimated
      expect(stats.withRealLOC).toBeLessThanOrEqual(2);
    });
  });

  describe("detectOutliers", () => {
    it("should flag tools with z-score > 3", () => {
      // Create 12 tools with consistent OAL/DC ~7, then one extreme outlier
      const tools: ReturnType<typeof makeTool>[] = [];
      for (let i = 0; i < 12; i++) {
        tools.push(makeTool({
          id: `N${i}`,
          dc: 10,
          oal: 70 + Math.random() * 2, // ~70-72
          loc: 22,
        }));
      }
      // Add an extreme outlier
      tools.push(makeTool({ id: "OUTLIER", dc: 10, oal: 200, loc: 22 }));

      const outliers = engine.detectOutliers(tools);
      const outlierIds = outliers.map(o => o.toolId);
      expect(outlierIds).toContain("OUTLIER");
      // Check that the outlier has zScore > 3
      const outlierEntry = outliers.find(o => o.toolId === "OUTLIER");
      expect(outlierEntry).toBeDefined();
      expect(outlierEntry!.zScore).toBeGreaterThan(3);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CrossCatalogValidationEngine
// ═════════════════════════════════════════════════════════════════════════════

describe("CrossCatalogValidationEngine", () => {
  let engine: CrossCatalogValidationEngine;

  beforeEach(() => {
    engine = new CrossCatalogValidationEngine();
  });

  describe("validateDimensions", () => {
    it("should flag outlier OAL/DC ratios", () => {
      // 4 tools at DC=10 with consistent OAL, one with wild OAL
      const tools = [
        makeValidationTool({ id: "A1", manufacturer: "Kennametal", dc: 10, oal: 72, loc: 22, shank: 10 }),
        makeValidationTool({ id: "A2", manufacturer: "Sandvik",    dc: 10, oal: 73, loc: 22, shank: 10 }),
        makeValidationTool({ id: "A3", manufacturer: "Seco",       dc: 10, oal: 71, loc: 22, shank: 10 }),
        makeValidationTool({ id: "A4", manufacturer: "ISCAR",      dc: 10, oal: 200, loc: 22, shank: 10 }), // outlier
      ];

      const outliers = engine.validateDimensions(tools);
      // The outlier with OAL=200 should be flagged
      const flagged = outliers.filter(o => o.toolId === "A4");
      expect(flagged.length).toBeGreaterThan(0);
      expect(flagged[0].isOutlier).toBe(true);
    });
  });

  describe("standardizeGrades", () => {
    it("should map KC7325 to ISO K10-K20", () => {
      const tools = [
        makeValidationTool({ id: "G1", manufacturer: "Kennametal", grade: "KC7325" }),
      ];

      const mappings = engine.standardizeGrades(tools);
      expect(mappings.length).toBe(1);
      expect(mappings[0].grade).toBe("KC7325");
      expect(mappings[0].isoCategory).toBe("K10-K20");
      expect(mappings[0].substrate).toBe("carbide");
      expect(mappings[0].coating).toBe("CVD");
    });
  });

  describe("validateClassification", () => {
    it("should flag drill with 6 flutes", () => {
      const tools = [
        makeValidationTool({ id: "D1", manufacturer: "OSG", type: "drill", dc: 10, oal: 100, loc: 60, shank: 10, flutes: 6 }),
      ];

      const errors = engine.validateClassification(tools);
      const fluteError = errors.find(e => e.toolId === "D1" && e.field === "flute_count");
      expect(fluteError).toBeDefined();
      expect(fluteError!.issue).toContain("unexpected flute count");
      expect(fluteError!.value).toBe(6);
    });
  });

  describe("scoreCompleteness", () => {
    it("should score tools with all fields higher than tools with missing fields", () => {
      const completeTools = [
        makeValidationTool({
          id: "C1", manufacturer: "Complete", dc: 10, oal: 72, loc: 22, shank: 10,
          flutes: 4, helix: 30, coating: "TiAlN",
          cutting_data: { P: { vc: 200 } },
        }),
      ];
      const sparseTools = [
        makeValidationTool({
          id: "S1", manufacturer: "Sparse", dc: 10, oal: 0, loc: 0, shank: 0,
        }),
      ];

      const allTools = [...completeTools, ...sparseTools];
      const scores = engine.scoreCompleteness(allTools);

      const completeScore = scores.find(s => s.manufacturer === "Complete");
      const sparseScore = scores.find(s => s.manufacturer === "Sparse");

      expect(completeScore).toBeDefined();
      expect(sparseScore).toBeDefined();
      expect(completeScore!.overallScore).toBeGreaterThan(sparseScore!.overallScore);
    });
  });

  describe("findDuplicates", () => {
    it("should detect tools with matching dimensions across manufacturers", () => {
      const tools = [
        makeValidationTool({ id: "DUP1", manufacturer: "Kennametal", dc: 10, oal: 72, loc: 22, shank: 10, flutes: 4 }),
        makeValidationTool({ id: "DUP2", manufacturer: "Sandvik",    dc: 10, oal: 72, loc: 22, shank: 10, flutes: 4 }),
      ];

      const dupes = engine.findDuplicates(tools);
      expect(dupes.length).toBe(1);
      expect(dupes[0].toolA.id).toBe("DUP1");
      expect(dupes[0].toolB.id).toBe("DUP2");
      expect(dupes[0].matchingFields).toContain("DC");
      expect(dupes[0].matchingFields).toContain("OAL");
      expect(dupes[0].distance).toBe(0);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// FusionToolSyncEngine
// ═════════════════════════════════════════════════════════════════════════════

describe("FusionToolSyncEngine", () => {
  let engine: FusionToolSyncEngine;

  beforeEach(() => {
    engine = new FusionToolSyncEngine();
  });

  describe("partitionForExport", () => {
    it("should group by manufacturer+type", () => {
      const tools = [
        makeCatalogTool({ id: "K1", manufacturer: "Kennametal", type: "end_mill" }),
        makeCatalogTool({ id: "K2", manufacturer: "Kennametal", type: "end_mill" }),
        makeCatalogTool({ id: "S1", manufacturer: "Sandvik",    type: "drill" }),
      ];

      const partitions = engine.partitionForExport(tools);
      expect(partitions.size).toBe(2);
      expect(partitions.has("PRISM_Kennametal_EndMills")).toBe(true);
      expect(partitions.has("PRISM_Sandvik_Drills")).toBe(true);
      expect(partitions.get("PRISM_Kennametal_EndMills")!.length).toBe(2);
      expect(partitions.get("PRISM_Sandvik_Drills")!.length).toBe(1);
    });

    it("should split groups >500 into parts", () => {
      // Create 600 tools from same manufacturer+type
      const tools = Array.from({ length: 600 }, (_, i) =>
        makeCatalogTool({ id: `T${i}`, manufacturer: "Kennametal", type: "end_mill" })
      );

      const partitions = engine.partitionForExport(tools, 500);
      // Should produce 2 parts
      expect(partitions.size).toBe(2);
      expect(partitions.has("PRISM_Kennametal_EndMills_Part1")).toBe(true);
      expect(partitions.has("PRISM_Kennametal_EndMills_Part2")).toBe(true);
      expect(partitions.get("PRISM_Kennametal_EndMills_Part1")!.length).toBe(500);
      expect(partitions.get("PRISM_Kennametal_EndMills_Part2")!.length).toBe(100);
    });
  });

  describe("exportJobTools", () => {
    it("should extract specific tool IDs from the catalog", () => {
      const allTools = [
        makeCatalogTool({ id: "T1" }),
        makeCatalogTool({ id: "T2" }),
        makeCatalogTool({ id: "T3" }),
        makeCatalogTool({ id: "T4" }),
      ];

      const result = engine.exportJobTools(["T2", "T4"], allTools);
      expect(result.tools.length).toBe(2);
      expect(result.tools.map((t: any) => t.id)).toEqual(["T2", "T4"]);
      expect(result.libraryName).toMatch(/^PRISM_Job_/);
    });
  });
});
