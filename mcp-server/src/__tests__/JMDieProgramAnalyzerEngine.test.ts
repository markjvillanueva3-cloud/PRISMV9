/**
 * Tests for JMDieProgramAnalyzerEngine
 *
 * Tests the deep analysis of JM DIE production programs including:
 * - Material parameter extraction
 * - Tool pattern recognition
 * - G-code cycle detection
 * - Customer profile handling
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  JMDieProgramAnalyzerEngine,
  jmDieProgramAnalyzerEngine,
} from "../engines/JMDieProgramAnalyzerEngine.js";

describe("JMDieProgramAnalyzerEngine", () => {
  let engine: JMDieProgramAnalyzerEngine;

  beforeEach(() => {
    engine = new JMDieProgramAnalyzerEngine();
  });

  describe("getMaterialParameters", () => {
    it("should return parameters for D2 tool steel", () => {
      const params = engine.getMaterialParameters("D2");

      expect(params).not.toBeNull();
      expect(params!.material).toContain("D2");
      expect(params!.iso_group).toBe("H");
      expect(params!.speed_ranges.roughing.min).toBeGreaterThan(0);
      expect(params!.speed_ranges.roughing.max).toBeGreaterThan(params!.speed_ranges.roughing.min);
      expect(params!.feed_ranges.roughing.typical).toBeGreaterThan(0);
      expect(params!.doc_ranges.finishing.typical).toBeGreaterThan(0);
    });

    it("should return parameters for M2 high speed steel", () => {
      const params = engine.getMaterialParameters("M2");

      expect(params).not.toBeNull();
      expect(params!.material).toContain("M2");
      expect(params!.speed_ranges.roughing.min).toBeLessThan(params!.speed_ranges.roughing.max);
    });

    it("should return parameters for tungsten carbide", () => {
      const params = engine.getMaterialParameters("TUNGSTEN");

      expect(params).not.toBeNull();
      expect(params!.material).toContain("Tungsten");
      // Carbide is harder to machine - lower speeds
      expect(params!.speed_ranges.roughing.typical).toBeLessThan(100);
    });

    it("should return parameters for 303 stainless", () => {
      const params = engine.getMaterialParameters("303");

      expect(params).not.toBeNull();
      expect(params!.material).toContain("303");
      expect(params!.iso_group).toBe("M");
      // 303 is free-machining stainless
      expect(params!.speed_ranges.roughing.typical).toBeGreaterThan(150);
    });

    it("should return null for unknown material", () => {
      const params = engine.getMaterialParameters("UNKNOWN_MATERIAL_XYZ");
      expect(params).toBeNull();
    });

    it("should handle case-insensitive material lookup", () => {
      const params1 = engine.getMaterialParameters("d2");
      const params2 = engine.getMaterialParameters("D2");

      expect(params1).not.toBeNull();
      expect(params2).not.toBeNull();
      expect(params1!.material).toBe(params2!.material);
    });
  });

  describe("getAllMaterialPatterns", () => {
    it("should return list of all material patterns", () => {
      const materials = engine.getAllMaterialPatterns();

      expect(materials.length).toBeGreaterThan(5);
      expect(materials.some(m => m.material.includes("D2"))).toBe(true);
      expect(materials.some(m => m.material.includes("M2"))).toBe(true);
    });

    it("should have valid speed ranges for all materials", () => {
      const materials = engine.getAllMaterialPatterns();

      for (const mat of materials) {
        // SFM must be positive
        expect(mat.speed_ranges.roughing.min).toBeGreaterThan(0);
        expect(mat.speed_ranges.roughing.max).toBeGreaterThan(0);
        // Min <= Typical <= Max
        expect(mat.speed_ranges.roughing.min).toBeLessThanOrEqual(mat.speed_ranges.roughing.typical);
        expect(mat.speed_ranges.roughing.typical).toBeLessThanOrEqual(mat.speed_ranges.roughing.max);
      }
    });

    it("should have valid feed ranges for all materials", () => {
      const materials = engine.getAllMaterialPatterns();

      for (const mat of materials) {
        // Feed IPR must be positive and reasonable (< 0.1 IPR typically)
        expect(mat.feed_ranges.roughing.min).toBeGreaterThan(0);
        expect(mat.feed_ranges.roughing.max).toBeLessThan(0.100);
      }
    });

    it("should have valid DOC ranges for all materials", () => {
      const materials = engine.getAllMaterialPatterns();

      for (const mat of materials) {
        // DOC must be positive
        expect(mat.doc_ranges.roughing.min).toBeGreaterThan(0);
        expect(mat.doc_ranges.roughing.max).toBeGreaterThan(mat.doc_ranges.roughing.min);
      }
    });
  });

  describe("getRecommendedSpeedFeed", () => {
    it("should recommend parameters for D2 roughing", () => {
      const rec = engine.getRecommendedSpeedFeed("D2", "roughing");

      expect(rec).not.toBeNull();
      expect(rec!.sfm.typical).toBeGreaterThan(0);
      expect(rec!.feed_ipr.typical).toBeGreaterThan(0);
      expect(rec!.doc.typical).toBeGreaterThan(0);
      expect(rec!.confidence).toBeGreaterThanOrEqual(0);
      expect(rec!.confidence).toBeLessThanOrEqual(1);
    });

    it("should recommend parameters for M2 finishing", () => {
      const rec = engine.getRecommendedSpeedFeed("M2", "finishing");

      expect(rec).not.toBeNull();
      // Finishing typically has lower DOC
      expect(rec!.doc.typical).toBeLessThan(0.100);
    });

    it("should have higher SFM for finishing than roughing on same material", () => {
      const roughing = engine.getRecommendedSpeedFeed("1018", "roughing");
      const finishing = engine.getRecommendedSpeedFeed("1018", "finishing");

      expect(roughing).not.toBeNull();
      expect(finishing).not.toBeNull();
      // Finishing typically higher SFM, lower feed
      expect(finishing!.sfm.typical).toBeGreaterThanOrEqual(roughing!.sfm.typical);
    });

    it("should return null for unknown material", () => {
      const rec = engine.getRecommendedSpeedFeed("UNOBTANIUM", "roughing");
      expect(rec).toBeNull();
    });
  });

  describe("getCustomerProfile", () => {
    it("should return profile for known customer ACME", () => {
      const profile = engine.getCustomerProfile("ACME");

      expect(profile).not.toBeNull();
      expect(profile!.customer_name).toBe("ACME");
      expect(profile!.typical_materials.length).toBeGreaterThan(0);
    });

    it("should return profile for ATF customer", () => {
      const profile = engine.getCustomerProfile("ATF");

      expect(profile).not.toBeNull();
      expect(profile!.customer_name).toBe("ATF");
    });

    it("should return null for unknown customer", () => {
      const profile = engine.getCustomerProfile("NONEXISTENT_CUSTOMER_123");
      expect(profile).toBeNull();
    });
  });

  describe("getAllCustomers", () => {
    it("should return list of all known customers", () => {
      const customers = engine.getAllCustomers();

      expect(customers.length).toBeGreaterThan(5);
      expect(customers).toContain("ACME");
      expect(customers).toContain("ATF");
      expect(customers).toContain("ALCOA");
    });
  });

  describe("getSummary", () => {
    it("should return comprehensive corpus statistics", () => {
      const stats = engine.getSummary();

      expect(stats).toBeDefined();
      expect(stats.total_programs).toBeGreaterThan(0);
      expect(stats.customers.length).toBeGreaterThan(0);
      expect(stats.material_patterns.length).toBeGreaterThan(0);
      expect(stats.common_cycles.length).toBeGreaterThan(0);
      expect(stats.tool_inventory.length).toBeGreaterThan(0);
    });

    it("should have valid cycle usage entries", () => {
      const stats = engine.getSummary();

      for (const cycle of stats.common_cycles) {
        expect(cycle.code).toMatch(/^G\d+$/);
        expect(cycle.count).toBeGreaterThan(0);
        expect(cycle.description).toBeDefined();
      }
    });
  });

  describe("getTrainingContext", () => {
    it("should return training context string", () => {
      const context = engine.getTrainingContext();

      expect(context).toContain("JM DIE");
      expect(context).toContain("Okuma");
      expect(context).toContain("Material");
    });
  });
});

describe("jmDieProgramAnalyzerEngine singleton", () => {
  it("should be defined", () => {
    expect(jmDieProgramAnalyzerEngine).toBeDefined();
    expect(jmDieProgramAnalyzerEngine).toBeInstanceOf(JMDieProgramAnalyzerEngine);
  });

  it("should return same data as fresh instance", () => {
    const singleton = jmDieProgramAnalyzerEngine.getMaterialParameters("D2");
    const fresh = new JMDieProgramAnalyzerEngine().getMaterialParameters("D2");

    expect(singleton).toEqual(fresh);
  });
});
