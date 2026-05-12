/**
 * PostProcessorProductionPatternEngine Tests
 * ==========================================
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorProductionPatternEngine,
  OPERATION_FREQUENCIES,
  CUSTOMER_PATTERNS,
  PRODUCTION_SFM_FPT,
  COMMON_SEQUENCES,
  MACRO_PATTERNS
} from "../engines/PostProcessorProductionPatternEngine.js";

describe("PostProcessorProductionPatternEngine", () => {
  describe("Statistics", () => {
    it("should return engine statistics", () => {
      const stats = postProcessorProductionPatternEngine.getStatistics();

      expect(stats.version).toBe("1.0.0");
      expect(stats.programsAnalyzed).toBe(24469);
      expect(stats.operationFrequencies).toBeGreaterThan(5);
      expect(stats.customerPatterns).toBeGreaterThan(5);
      expect(stats.materialParams).toBeGreaterThan(4);
    });

    it("should count total operations observed", () => {
      const stats = postProcessorProductionPatternEngine.getStatistics();
      expect(stats.totalOperationsObserved).toBeGreaterThan(20000);
    });
  });

  describe("Operation Frequencies", () => {
    it("should have G85 external boring", () => {
      const g85 = postProcessorProductionPatternEngine.getOperation("G85");
      expect(g85).toBeDefined();
      expect(g85?.count).toBe(10717);
    });

    it("should have G87 back boring", () => {
      const g87 = postProcessorProductionPatternEngine.getOperation("G87");
      expect(g87).toBeDefined();
      expect(g87?.count).toBe(10043);
    });

    it("should have G81 drilling", () => {
      const g81 = postProcessorProductionPatternEngine.getOperation("G81");
      expect(g81).toBeDefined();
    });

    it("should have G76 threading", () => {
      const g76 = postProcessorProductionPatternEngine.getOperation("G76");
      expect(g76).toBeDefined();
    });

    it("should get top operations sorted by frequency", () => {
      const top = postProcessorProductionPatternEngine.getTopOperations(3);
      expect(top.length).toBe(3);
      expect(top[0].count).toBeGreaterThanOrEqual(top[1].count);
      expect(top[1].count).toBeGreaterThanOrEqual(top[2].count);
    });

    it("should handle unknown operation", () => {
      expect(postProcessorProductionPatternEngine.getOperation("G999")).toBeUndefined();
    });
  });

  describe("Customer Patterns", () => {
    it("should have customer patterns", () => {
      expect(CUSTOMER_PATTERNS.length).toBeGreaterThan(5);
    });

    it("should have WIRE EDM/TOMEK as top customer", () => {
      const top = [...CUSTOMER_PATTERNS].sort((a, b) => b.programs - a.programs)[0];
      expect(top.name).toContain("TOMEK");
    });

    it("should find customer by name", () => {
      const alcoa = postProcessorProductionPatternEngine.getCustomer("ALCOA");
      expect(alcoa).toBeDefined();
    });

    it("should get customers by industry", () => {
      const fasteners = postProcessorProductionPatternEngine.getCustomersByIndustry("fasteners");
      expect(fasteners.length).toBeGreaterThan(2);
    });

    it("should have typical materials for each customer", () => {
      for (const c of CUSTOMER_PATTERNS) {
        expect(c.typicalMaterials.length).toBeGreaterThan(0);
        expect(c.typicalOperations.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Material Production Parameters", () => {
    it("should have M2 tool steel", () => {
      const m2 = postProcessorProductionPatternEngine.getMaterialParams("M2");
      expect(m2).toBeDefined();
      expect(m2?.hardness_HRC[0]).toBeGreaterThan(50);
    });

    it("should have D2 tool steel", () => {
      const d2 = postProcessorProductionPatternEngine.getMaterialParams("D2");
      expect(d2).toBeDefined();
    });

    it("should have S7 tool steel", () => {
      const s7 = postProcessorProductionPatternEngine.getMaterialParams("S7");
      expect(s7).toBeDefined();
    });

    it("should have H13", () => {
      const h13 = postProcessorProductionPatternEngine.getMaterialParams("H13");
      expect(h13).toBeDefined();
    });

    it("should have graphite electrodes", () => {
      const graphite = postProcessorProductionPatternEngine.getMaterialParams("Graphite");
      expect(graphite).toBeDefined();
      expect(graphite?.tribal.some(t => t.includes("DRY") || t.includes("diamond"))).toBe(true);
    });

    it("should have tungsten carbide", () => {
      const wc = postProcessorProductionPatternEngine.getMaterialParams("Tungsten carbide");
      expect(wc).toBeDefined();
      expect(wc?.tribal.some(t => t.includes("PCD") || t.includes("CBN"))).toBe(true);
    });

    it("should have complete data for each material", () => {
      for (const m of PRODUCTION_SFM_FPT) {
        expect(m.turning.sfm_rough.length).toBe(2);
        expect(m.milling.sfm.length).toBe(2);
        expect(m.drilling.sfm.length).toBe(2);
        expect(m.tribal.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Speeds/Feeds Recommendations", () => {
    it("should recommend for M2 turning rough", () => {
      const rec = postProcessorProductionPatternEngine.recommendSpeedsFeeds("M2", "turning-rough");
      expect(rec).toBeDefined();
      expect(rec?.sfm[0]).toBeGreaterThan(30);
      expect(rec?.feedUnit).toBe("IPR");
    });

    it("should recommend for H13 milling finish", () => {
      const rec = postProcessorProductionPatternEngine.recommendSpeedsFeeds("H13", "milling-finish");
      expect(rec).toBeDefined();
      expect(rec?.feedUnit).toBe("IPT");
    });

    it("should recommend for D2 drilling", () => {
      const rec = postProcessorProductionPatternEngine.recommendSpeedsFeeds("D2", "drilling");
      expect(rec).toBeDefined();
      expect(rec?.additional.peck_depth_diameters).toBeGreaterThan(0);
    });

    it("should recommend for graphite (high SFM)", () => {
      const rec = postProcessorProductionPatternEngine.recommendSpeedsFeeds("Graphite", "milling-rough");
      expect(rec?.sfm[0]).toBeGreaterThan(400);
    });

    it("should recommend for tungsten carbide (low SFM)", () => {
      const rec = postProcessorProductionPatternEngine.recommendSpeedsFeeds("Tungsten carbide", "milling-rough");
      expect(rec?.sfm[1]).toBeLessThan(50);
    });

    it("should return null for unknown material", () => {
      const rec = postProcessorProductionPatternEngine.recommendSpeedsFeeds("UNKNOWN_XYZ", "turning-rough");
      expect(rec).toBeNull();
    });

    it("should include tribal wisdom", () => {
      const rec = postProcessorProductionPatternEngine.recommendSpeedsFeeds("M2", "turning-rough");
      expect(rec?.tribal.length).toBeGreaterThan(0);
    });
  });

  describe("Operation Sequences", () => {
    it("should have common sequences", () => {
      expect(COMMON_SEQUENCES.length).toBeGreaterThan(5);
    });

    it("should have OD turning sequence", () => {
      const seq = postProcessorProductionPatternEngine.getSequence("od-turning-roughing-finishing");
      expect(seq).toBeDefined();
      expect(seq?.sequence.length).toBeGreaterThan(2);
    });

    it("should have deep ID boring sequence", () => {
      const seq = postProcessorProductionPatternEngine.getSequence("id-boring-deep");
      expect(seq).toBeDefined();
    });

    it("should have electrode profiling sequence", () => {
      const seq = postProcessorProductionPatternEngine.getSequence("electrode-profiling");
      expect(seq).toBeDefined();
      expect(seq?.customers).toContain("WIRE EDM/TOMEK");
    });

    it("should find sequences for customer", () => {
      const arconic = postProcessorProductionPatternEngine.findSequencesForCustomer("Arconic");
      expect(arconic.length).toBeGreaterThan(0);
    });

    it("should include 'All' customer sequences for any lookup", () => {
      const anyCust = postProcessorProductionPatternEngine.findSequencesForCustomer("SomeRandomCustomer");
      const hasAllSeqs = anyCust.some(s => s.customers.includes("All"));
      expect(hasAllSeqs).toBe(true);
    });
  });

  describe("Macro Patterns", () => {
    it("should have macro patterns", () => {
      expect(MACRO_PATTERNS.length).toBeGreaterThan(3);
    });

    it("should have hole pattern macro", () => {
      const macro = postProcessorProductionPatternEngine.getMacroPattern("hole-pattern-macro");
      expect(macro).toBeDefined();
      expect(macro?.parameters.length).toBeGreaterThan(2);
    });

    it("should have thread cycle macro", () => {
      const macro = postProcessorProductionPatternEngine.getMacroPattern("thread-cycle-macro");
      expect(macro).toBeDefined();
    });

    it("should get macros for controller", () => {
      const fanucMacros = postProcessorProductionPatternEngine.getMacrosForController("Fanuc");
      expect(fanucMacros.length).toBeGreaterThan(0);

      const okumaMacros = postProcessorProductionPatternEngine.getMacrosForController("Okuma");
      expect(okumaMacros.length).toBeGreaterThan(0);
    });
  });

  describe("Shop Focus Profile", () => {
    it("should profile JM Die shop", () => {
      const profile = postProcessorProductionPatternEngine.getShopFocusProfile();

      expect(profile.totalPrograms).toBe(24469);
      expect(profile.totalOperations).toBeGreaterThan(20000);
      expect(profile.holeMakingPercentage).toBeGreaterThan(50);
      expect(profile.isHighVolumeHoles).toBe(true);
    });

    it("should identify top operation", () => {
      const profile = postProcessorProductionPatternEngine.getShopFocusProfile();
      expect(profile.topOperation.code).toBe("G85");
      expect(profile.topOperation.count).toBe(10717);
    });

    it("should list dominant materials", () => {
      const profile = postProcessorProductionPatternEngine.getShopFocusProfile();
      expect(profile.dominantMaterials.length).toBeGreaterThan(2);
    });

    it("should list dominant industries", () => {
      const profile = postProcessorProductionPatternEngine.getShopFocusProfile();
      expect(profile.dominantIndustries.length).toBeGreaterThan(1);
    });
  });

  describe("Tribal Wisdom", () => {
    it("should get tribal wisdom for M2", () => {
      const wisdom = postProcessorProductionPatternEngine.getTribalWisdom("M2");
      expect(wisdom.length).toBeGreaterThan(0);
    });

    it("should get tribal wisdom for graphite", () => {
      const wisdom = postProcessorProductionPatternEngine.getTribalWisdom("Graphite");
      expect(wisdom.some(w => w.includes("dust") || w.includes("DRY"))).toBe(true);
    });

    it("should return empty for unknown material", () => {
      const wisdom = postProcessorProductionPatternEngine.getTribalWisdom("UNKNOWN");
      expect(wisdom).toEqual([]);
    });
  });

  describe("AI Context", () => {
    it("should generate AI context", () => {
      const context = postProcessorProductionPatternEngine.getContextForAI();

      expect(context).toContain("PRODUCTION PATTERN");
      expect(context).toContain("JM DIE");
      expect(context).toContain("G85");
      expect(context).toContain("API METHODS");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty customer search", () => {
      const c = postProcessorProductionPatternEngine.getCustomer("");
      expect(c).toBeDefined();
    });

    it("should handle case-insensitive material search", () => {
      const m2_upper = postProcessorProductionPatternEngine.getMaterialParams("M2");
      const m2_lower = postProcessorProductionPatternEngine.getMaterialParams("m2");
      expect(m2_upper?.material).toBe(m2_lower?.material);
    });

    it("should handle getTopOperations with large N", () => {
      const all = postProcessorProductionPatternEngine.getTopOperations(1000);
      expect(all.length).toBe(OPERATION_FREQUENCIES.length);
    });
  });
});
