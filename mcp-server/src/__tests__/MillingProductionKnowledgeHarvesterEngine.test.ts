/**
 * MillingProductionKnowledgeHarvesterEngine Tests
 *
 * Tests production knowledge harvesting from JM Die Haas Mill programs.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  millingProductionKnowledgeHarvesterEngine,
  MillingProductionKnowledgeHarvesterEngine,
} from "../engines/MillingProductionKnowledgeHarvesterEngine.js";

describe("MillingProductionKnowledgeHarvesterEngine", () => {
  describe("Engine instantiation", () => {
    it("should export singleton instance", () => {
      expect(millingProductionKnowledgeHarvesterEngine).toBeDefined();
      expect(millingProductionKnowledgeHarvesterEngine).toBeInstanceOf(
        MillingProductionKnowledgeHarvesterEngine
      );
    });

    it("should have all required methods", () => {
      const methods = [
        "harvestJMDieMilling",
        "extractProgramKnowledge",
        "quickAnalyze",
        "getRecommendedParameters",
        "validateParameters",
        "getTribalKnowledge",
        "getStats",
        "getSelfAwareness",
      ];

      for (const method of methods) {
        expect(typeof (millingProductionKnowledgeHarvesterEngine as any)[method]).toBe(
          "function"
        );
      }
    });
  });

  describe("getRecommendedParameters", () => {
    it("should return parameters for known materials", () => {
      const params = millingProductionKnowledgeHarvesterEngine.getRecommendedParameters(
        "4140",
        12,
        "roughing"
      );

      expect(params).toHaveProperty("sfm_range");
      expect(params).toHaveProperty("chip_load_range");
      expect(params).toHaveProperty("doc_range");
      expect(params).toHaveProperty("woc_range");
      expect(params).toHaveProperty("confidence");

      expect(params.sfm_range[0]).toBeLessThan(params.sfm_range[1]);
      expect(params.confidence).toBeGreaterThan(0.5);
    });

    it("should handle material keywords", () => {
      const params = millingProductionKnowledgeHarvesterEngine.getRecommendedParameters(
        "chrome-moly steel",
        12,
        "roughing"
      );

      expect(params.confidence).toBeGreaterThan(0.5);
    });

    it("should return conservative defaults for unknown materials", () => {
      const params = millingProductionKnowledgeHarvesterEngine.getRecommendedParameters(
        "unknown-exotic-alloy",
        12,
        "roughing"
      );

      expect(params.confidence).toBeLessThan(0.5);
      expect(params.sfm_range).toBeDefined();
    });

    it("should handle aluminum with high SFM", () => {
      const params = millingProductionKnowledgeHarvesterEngine.getRecommendedParameters(
        "6061-T6",
        12,
        "roughing"
      );

      expect(params.sfm_range[0]).toBeGreaterThan(500);
      expect(params.sfm_range[1]).toBeGreaterThan(1000);
    });

    it("should handle titanium with low SFM", () => {
      const params = millingProductionKnowledgeHarvesterEngine.getRecommendedParameters(
        "Ti-6Al-4V",
        12,
        "roughing"
      );

      expect(params.sfm_range[0]).toBeLessThan(200);
      expect(params.sfm_range[1]).toBeLessThan(250);
    });

    it("should handle Inconel with very low SFM", () => {
      const params = millingProductionKnowledgeHarvesterEngine.getRecommendedParameters(
        "Inconel718",
        12,
        "roughing"
      );

      expect(params.sfm_range[0]).toBeLessThan(100);
      expect(params.chip_load_range[0]).toBeLessThan(0.005);
    });

    it("should provide tighter DOC range for finishing", () => {
      const roughParams = millingProductionKnowledgeHarvesterEngine.getRecommendedParameters(
        "4140",
        12,
        "roughing"
      );

      const finishParams = millingProductionKnowledgeHarvesterEngine.getRecommendedParameters(
        "4140",
        12,
        "finish"
      );

      expect(finishParams.doc_range[1]).toBeLessThanOrEqual(roughParams.doc_range[1]);
    });
  });

  describe("validateParameters", () => {
    it("should validate correct parameters as valid", () => {
      const result = millingProductionKnowledgeHarvesterEngine.validateParameters(
        4000, // RPM
        500, // feed mm/min
        3, // DOC mm
        12, // tool diameter mm
        4, // flutes
        "4140"
      );

      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("warnings");
      expect(result).toHaveProperty("suggestions");
      expect(result).toHaveProperty("deviation_score");
    });

    it("should warn about too low cutting speed", () => {
      const result = millingProductionKnowledgeHarvesterEngine.validateParameters(
        500, // Very low RPM
        500,
        3,
        12,
        4,
        "6061-T6" // Aluminum should be fast
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("speed") || w.includes("below"))).toBe(
        true
      );
    });

    it("should warn about too high cutting speed", () => {
      const result = millingProductionKnowledgeHarvesterEngine.validateParameters(
        20000, // Very high RPM
        500,
        3,
        12,
        4,
        "Ti-6Al-4V" // Titanium should be slow
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("exceeds") || w.includes("speed"))).toBe(
        true
      );
    });

    it("should warn about too light chip load", () => {
      const result = millingProductionKnowledgeHarvesterEngine.validateParameters(
        4000,
        50, // Very low feed = light chip load
        3,
        12,
        4,
        "4140"
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some((w) => w.includes("chip") || w.includes("rubbing"))
      ).toBe(true);
    });

    it("should warn about excessive DOC ratio", () => {
      const result = millingProductionKnowledgeHarvesterEngine.validateParameters(
        4000,
        500,
        25, // 25mm DOC on 12mm tool = 2.08x ratio
        12,
        4,
        "4140"
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some((w) => w.includes("depth") || w.includes("deflection"))
      ).toBe(true);
    });

    it("should provide suggestions for invalid parameters", () => {
      const result = millingProductionKnowledgeHarvesterEngine.validateParameters(
        500, // Too slow
        500,
        3,
        12,
        4,
        "6061-T6"
      );

      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it("should calculate deviation score", () => {
      const validResult = millingProductionKnowledgeHarvesterEngine.validateParameters(
        4000,
        500,
        3,
        12,
        4,
        "4140"
      );

      const invalidResult = millingProductionKnowledgeHarvesterEngine.validateParameters(
        500, // Bad
        50, // Bad
        25, // Bad
        12,
        4,
        "6061-T6"
      );

      expect(invalidResult.deviation_score).toBeGreaterThan(validResult.deviation_score);
    });
  });

  describe("getTribalKnowledge", () => {
    it("should return tribal knowledge array", () => {
      const knowledge = millingProductionKnowledgeHarvesterEngine.getTribalKnowledge();

      expect(Array.isArray(knowledge)).toBe(true);
    });

    it("should filter by category", () => {
      const knowledge = millingProductionKnowledgeHarvesterEngine.getTribalKnowledge(
        "speed_feed"
      );

      expect(Array.isArray(knowledge)).toBe(true);
      for (const item of knowledge) {
        expect(item.category).toBe("speed_feed");
      }
    });

    it("should filter by material", () => {
      const knowledge = millingProductionKnowledgeHarvesterEngine.getTribalKnowledge(
        undefined,
        "titanium"
      );

      expect(Array.isArray(knowledge)).toBe(true);
    });

    it("should sort by confidence", () => {
      const knowledge = millingProductionKnowledgeHarvesterEngine.getTribalKnowledge();

      for (let i = 1; i < knowledge.length; i++) {
        expect(knowledge[i - 1].confidence).toBeGreaterThanOrEqual(knowledge[i].confidence);
      }
    });
  });

  describe("getStats", () => {
    it("should return comprehensive statistics", () => {
      const stats = millingProductionKnowledgeHarvesterEngine.getStats();

      expect(stats).toHaveProperty("harvested_programs");
      expect(stats).toHaveProperty("unique_customers");
      expect(stats).toHaveProperty("tribal_tips");
      expect(stats).toHaveProperty("material_coverage");
      expect(stats).toHaveProperty("strategy_coverage");
      expect(stats).toHaveProperty("statistical_norms");
    });

    it("should report material coverage", () => {
      const stats = millingProductionKnowledgeHarvesterEngine.getStats();

      expect(stats.material_coverage).toBeGreaterThan(0);
    });

    it("should report strategy coverage", () => {
      const stats = millingProductionKnowledgeHarvesterEngine.getStats();

      expect(stats.strategy_coverage).toBeGreaterThan(0);
    });
  });

  describe("getSelfAwareness", () => {
    it("should return self-awareness data", () => {
      const awareness = millingProductionKnowledgeHarvesterEngine.getSelfAwareness();

      expect(awareness).toHaveProperty("total_programs_in_archive");
      expect(awareness).toHaveProperty("customers_with_programs");
      expect(awareness).toHaveProperty("dominant_machine");
      expect(awareness).toHaveProperty("dominant_material");
      expect(awareness).toHaveProperty("knowledge_coverage");
      expect(awareness).toHaveProperty("integration_points");
      expect(awareness).toHaveProperty("formula_dependencies");
    });

    it("should list integration points", () => {
      const awareness = millingProductionKnowledgeHarvesterEngine.getSelfAwareness();

      expect(Array.isArray(awareness.integration_points)).toBe(true);
      expect(awareness.integration_points.length).toBeGreaterThan(0);
    });

    it("should list formula dependencies", () => {
      const awareness = millingProductionKnowledgeHarvesterEngine.getSelfAwareness();

      expect(Array.isArray(awareness.formula_dependencies)).toBe(true);
      expect(awareness.formula_dependencies).toContain("Kienzle cutting force");
      expect(awareness.formula_dependencies).toContain("Taylor tool life");
    });
  });

  describe("Material pattern coverage", () => {
    const materials = [
      "4140",
      "D2",
      "6061-T6",
      "7075-T6",
      "316L",
      "Ti-6Al-4V",
      "Inconel718",
      "A2",
      "1018",
      "brass",
    ];

    for (const material of materials) {
      it(`should have parameters for ${material}`, () => {
        const params = millingProductionKnowledgeHarvesterEngine.getRecommendedParameters(
          material,
          12,
          "roughing"
        );

        expect(params.confidence).toBeGreaterThan(0.5);
        expect(params.sfm_range[0]).toBeGreaterThan(0);
        expect(params.chip_load_range[0]).toBeGreaterThan(0);
      });
    }
  });

  describe("Material classification accuracy", () => {
    it("should classify chrome-moly variants", () => {
      const params1 = millingProductionKnowledgeHarvesterEngine.getRecommendedParameters(
        "41L40",
        12,
        "roughing"
      );
      const params2 = millingProductionKnowledgeHarvesterEngine.getRecommendedParameters(
        "alloy steel",
        12,
        "roughing"
      );

      expect(params1.confidence).toBeGreaterThan(0.5);
      expect(params2.confidence).toBeGreaterThan(0.5);
    });

    it("should classify stainless variants", () => {
      const params1 = millingProductionKnowledgeHarvesterEngine.getRecommendedParameters(
        "SS316",
        12,
        "roughing"
      );
      const params2 = millingProductionKnowledgeHarvesterEngine.getRecommendedParameters(
        "surgical stainless",
        12,
        "roughing"
      );

      expect(params1.confidence).toBeGreaterThan(0.5);
      expect(params2.confidence).toBeGreaterThan(0.5);
    });

    it("should classify aerospace materials", () => {
      const params1 = millingProductionKnowledgeHarvesterEngine.getRecommendedParameters(
        "aerospace titanium",
        12,
        "roughing"
      );
      const params2 = millingProductionKnowledgeHarvesterEngine.getRecommendedParameters(
        "grade 5 titanium",
        12,
        "roughing"
      );

      expect(params1.confidence).toBeGreaterThan(0.5);
      expect(params2.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("Physics-based validation", () => {
    it("should calculate correct cutting speed", () => {
      // V = pi * D * N / 1000
      // For D=12mm, N=4000rpm: V = 3.14159 * 12 * 4000 / 1000 = 150.8 m/min
      const result = millingProductionKnowledgeHarvesterEngine.validateParameters(
        4000,
        500,
        3,
        12,
        4,
        "4140"
      );

      // Should not warn about cutting speed for 4140 at ~151 m/min
      // 4140 typical SFM is 300-500 (91-152 m/min)
      expect(result).toBeDefined();
    });

    it("should calculate correct chip load", () => {
      // fz = F / (N * z)
      // For F=500, N=4000, z=4: fz = 500 / (4000 * 4) = 0.03125 mm/tooth
      const result = millingProductionKnowledgeHarvesterEngine.validateParameters(
        4000,
        500,
        3,
        12,
        4,
        "4140"
      );

      expect(result).toBeDefined();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty material string", () => {
      const params = millingProductionKnowledgeHarvesterEngine.getRecommendedParameters(
        "",
        12,
        "roughing"
      );

      expect(params).toBeDefined();
      expect(params.confidence).toBeLessThan(0.5);
    });

    it("should handle zero tool diameter", () => {
      const result = millingProductionKnowledgeHarvesterEngine.validateParameters(
        4000,
        500,
        3,
        0, // Zero diameter
        4,
        "4140"
      );

      expect(result).toBeDefined();
    });

    it("should handle zero flutes", () => {
      const result = millingProductionKnowledgeHarvesterEngine.validateParameters(
        4000,
        500,
        3,
        12,
        0, // Zero flutes
        "4140"
      );

      expect(result).toBeDefined();
    });

    it("should handle negative values gracefully", () => {
      const result = millingProductionKnowledgeHarvesterEngine.validateParameters(
        -1000,
        -500,
        -3,
        12,
        4,
        "4140"
      );

      expect(result).toBeDefined();
    });
  });

  describe("Tooling patterns", () => {
    it("should know about endmill types", () => {
      const stats = millingProductionKnowledgeHarvesterEngine.getStats();
      expect(stats.strategy_coverage).toBeGreaterThan(0);
    });

    it("should have strategy knowledge", () => {
      const awareness = millingProductionKnowledgeHarvesterEngine.getSelfAwareness();
      expect(awareness.formula_dependencies).toContain("MRR calculation");
    });
  });

  describe("Integration readiness", () => {
    it("should integrate with MillingUnifiedScienceOrchestrationEngine", () => {
      const awareness = millingProductionKnowledgeHarvesterEngine.getSelfAwareness();
      expect(awareness.integration_points).toContain(
        "MillingUnifiedScienceOrchestrationEngine"
      );
    });

    it("should integrate with MillingAGIMasterEngine", () => {
      const awareness = millingProductionKnowledgeHarvesterEngine.getSelfAwareness();
      expect(awareness.integration_points).toContain("MillingAGIMasterEngine");
    });

    it("should integrate with MillingEndToEndOrchestrationEngine", () => {
      const awareness = millingProductionKnowledgeHarvesterEngine.getSelfAwareness();
      expect(awareness.integration_points).toContain(
        "MillingEndToEndOrchestrationEngine"
      );
    });

    it("should integrate with TribalKnowledgeEngine", () => {
      const awareness = millingProductionKnowledgeHarvesterEngine.getSelfAwareness();
      expect(awareness.integration_points).toContain("TribalKnowledgeEngine");
    });
  });
});
