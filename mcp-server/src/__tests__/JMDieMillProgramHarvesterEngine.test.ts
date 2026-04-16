/**
 * Tests for JMDieMillProgramHarvesterEngine
 * Validates knowledge extraction from 483 JM Die mill programs.
 */
import { describe, it, expect } from "vitest";
import {
  JMDieMillProgramHarvesterEngine,
  jmDieMillProgramHarvesterEngine,
} from "../engines/JMDieMillProgramHarvesterEngine.js";

describe("JMDieMillProgramHarvesterEngine", () => {
  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(jmDieMillProgramHarvesterEngine).toBeDefined();
      expect(jmDieMillProgramHarvesterEngine).toBeInstanceOf(JMDieMillProgramHarvesterEngine);
    });

    it("can instantiate new engine instances", () => {
      const engine = new JMDieMillProgramHarvesterEngine();
      expect(engine).toBeInstanceOf(JMDieMillProgramHarvesterEngine);
    });
  });

  // ============================================================================
  // HARVEST METHOD
  // ============================================================================

  describe("harvest()", () => {
    it("returns complete HarvestResult", () => {
      const result = jmDieMillProgramHarvesterEngine.harvest();

      expect(result.harvest_id).toMatch(/^HARVEST-/);
      expect(result.timestamp).toBeDefined();
      expect(result.total_programs).toBe(483);
      expect(result.total_customers).toBeGreaterThan(5);
      expect(result.customers_analyzed.length).toBeGreaterThan(5);
    });

    it("includes customer profiles", () => {
      const result = jmDieMillProgramHarvesterEngine.harvest();

      expect(result.customer_profiles.length).toBeGreaterThan(5);
      for (const profile of result.customer_profiles) {
        expect(profile.name).toBeDefined();
        expect(profile.folder_path).toBeDefined();
        expect(profile.program_count).toBeGreaterThan(0);
        expect(profile.part_types.length).toBeGreaterThan(0);
        expect(profile.common_materials.length).toBeGreaterThan(0);
        expect(profile.tribal_tips.length).toBeGreaterThan(0);
      }
    });

    it("extracts patterns", () => {
      const result = jmDieMillProgramHarvesterEngine.harvest();

      expect(result.patterns.length).toBeGreaterThan(10);
      const patternTypes = result.patterns.map(p => p.pattern_type);
      expect(patternTypes).toContain("tool_selection");
      expect(patternTypes).toContain("operation_sequence");
      expect(patternTypes).toContain("speeds_feeds");
    });

    it("includes tool usage data", () => {
      const result = jmDieMillProgramHarvesterEngine.harvest();

      expect(result.tool_usage.length).toBeGreaterThan(5);
      for (const tool of result.tool_usage) {
        expect(tool.tool_type).toBeDefined();
        expect(tool.diameter_mm).toBeGreaterThan(0);
        expect(tool.frequency).toBeGreaterThan(0);
        expect(tool.typical_materials.length).toBeGreaterThan(0);
        expect(tool.typical_operations.length).toBeGreaterThan(0);
      }
    });

    it("includes operation sequences", () => {
      const result = jmDieMillProgramHarvesterEngine.harvest();

      expect(result.operation_sequences.length).toBeGreaterThan(3);
      for (const seq of result.operation_sequences) {
        expect(seq.sequence.length).toBeGreaterThan(1);
        expect(seq.frequency).toBeGreaterThan(0);
        expect(seq.typical_feature).toBeDefined();
      }
    });

    it("includes material patterns", () => {
      const result = jmDieMillProgramHarvesterEngine.harvest();

      expect(result.material_patterns.length).toBeGreaterThan(3);
      for (const mat of result.material_patterns) {
        expect(mat.material).toBeDefined();
        expect(mat.typical_rpm_range[0]).toBeLessThan(mat.typical_rpm_range[1]);
        expect(mat.typical_feed_range[0]).toBeLessThan(mat.typical_feed_range[1]);
        expect(mat.common_tools.length).toBeGreaterThan(0);
      }
    });

    it("extracts tribal tips", () => {
      const result = jmDieMillProgramHarvesterEngine.harvest();

      expect(result.tribal_tips.length).toBeGreaterThan(10);
      // Tips should be meaningful strings
      for (const tip of result.tribal_tips) {
        expect(tip.length).toBeGreaterThan(20);
      }
    });

    it("has good confidence", () => {
      const result = jmDieMillProgramHarvesterEngine.harvest();

      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  // ============================================================================
  // GET CUSTOMER RECOMMENDATIONS
  // ============================================================================

  describe("getCustomerRecommendations()", () => {
    it("returns recommendations for FONTANA", () => {
      const result = jmDieMillProgramHarvesterEngine.getCustomerRecommendations("FONTANA");

      expect(result.customer).not.toBeNull();
      expect(result.customer!.name).toBe("FONTANA");
      expect(result.tips.length).toBeGreaterThan(0);
      expect(result.typical_operations.length).toBeGreaterThan(0);
      expect(result.material_recommendations.length).toBeGreaterThan(0);
    });

    it("returns recommendations for ITW", () => {
      const result = jmDieMillProgramHarvesterEngine.getCustomerRecommendations("ITW");

      expect(result.customer).not.toBeNull();
      expect(result.customer!.name).toBe("ITW");
      expect(result.tips.some(t => t.includes("ITW"))).toBe(true);
    });

    it("returns recommendations for ALCOA", () => {
      const result = jmDieMillProgramHarvesterEngine.getCustomerRecommendations("ALCOA");

      expect(result.customer).not.toBeNull();
      expect(result.customer!.name).toContain("ALCOA");
    });

    it("handles unknown customer gracefully", () => {
      const result = jmDieMillProgramHarvesterEngine.getCustomerRecommendations("UNKNOWN_CUSTOMER");

      expect(result.customer).toBeNull();
      expect(result.tips.length).toBeGreaterThan(0);
      expect(result.typical_operations.length).toBeGreaterThan(0);
    });

    it("is case-insensitive", () => {
      const result1 = jmDieMillProgramHarvesterEngine.getCustomerRecommendations("fontana");
      const result2 = jmDieMillProgramHarvesterEngine.getCustomerRecommendations("FONTANA");

      expect(result1.customer?.name).toBe(result2.customer?.name);
    });
  });

  // ============================================================================
  // GET TOOL RECOMMENDATION
  // ============================================================================

  describe("getToolRecommendation()", () => {
    it("recommends tools for roughing", () => {
      const result = jmDieMillProgramHarvesterEngine.getToolRecommendation({
        operation: "roughing",
      });

      expect(result.recommended_tools.length).toBeGreaterThan(0);
      expect(result.tribal_tip).toBeDefined();
    });

    it("recommends tools for D2 material", () => {
      const result = jmDieMillProgramHarvesterEngine.getToolRecommendation({
        operation: "roughing",
        material: "D2",
      });

      expect(result.recommended_tools.length).toBeGreaterThan(0);
      expect(result.recommended_tools[0].confidence).toBeGreaterThan(0.7);
    });

    it("recommends tools for drilling", () => {
      const result = jmDieMillProgramHarvesterEngine.getToolRecommendation({
        operation: "drilling",
      });

      expect(result.recommended_tools.some(t => t.tool_type.includes("Drill"))).toBe(true);
    });

    it("recommends tools for finishing", () => {
      const result = jmDieMillProgramHarvesterEngine.getToolRecommendation({
        operation: "finishing",
      });

      expect(result.recommended_tools.length).toBeGreaterThan(0);
    });

    it("includes frequency data", () => {
      const result = jmDieMillProgramHarvesterEngine.getToolRecommendation({
        operation: "facing",
      });

      for (const tool of result.recommended_tools) {
        expect(tool.frequency).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // GET OPERATION SEQUENCE
  // ============================================================================

  describe("getOperationSequence()", () => {
    it("returns sequence for pocket", () => {
      const result = jmDieMillProgramHarvesterEngine.getOperationSequence("pocket");

      expect(result.recommended_sequence.length).toBeGreaterThan(2);
      expect(result.frequency).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("returns sequence for contour", () => {
      const result = jmDieMillProgramHarvesterEngine.getOperationSequence("contour");

      expect(result.recommended_sequence.length).toBeGreaterThan(2);
      expect(result.recommended_sequence.some(op => op.toLowerCase().includes("profile"))).toBe(true);
    });

    it("returns sequence for threaded hole", () => {
      const result = jmDieMillProgramHarvesterEngine.getOperationSequence("threaded");

      expect(result.recommended_sequence.length).toBeGreaterThan(2);
      expect(result.recommended_sequence.some(op =>
        op.toLowerCase().includes("drill") || op.toLowerCase().includes("thread")
      )).toBe(true);
    });

    it("returns default for unknown feature", () => {
      const result = jmDieMillProgramHarvesterEngine.getOperationSequence("unknown_feature");

      expect(result.recommended_sequence.length).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.8);
    });

    it("includes alternatives", () => {
      const result = jmDieMillProgramHarvesterEngine.getOperationSequence("pocket");

      // May or may not have alternatives
      expect(Array.isArray(result.alternatives)).toBe(true);
    });
  });

  // ============================================================================
  // GET SPEEDS FEEDS RECOMMENDATION
  // ============================================================================

  describe("getSpeedsFeedsRecommendation()", () => {
    it("returns recommendations for D2", () => {
      const result = jmDieMillProgramHarvesterEngine.getSpeedsFeedsRecommendation("D2");

      expect(result.rpm_range[0]).toBeLessThan(result.rpm_range[1]);
      expect(result.feed_range[0]).toBeLessThan(result.feed_range[1]);
      expect(result.recommended_tools.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("returns recommendations for M2", () => {
      const result = jmDieMillProgramHarvesterEngine.getSpeedsFeedsRecommendation("M2");

      expect(result.rpm_range[0]).toBeGreaterThan(1000);
      expect(result.recommended_tools.some(t => t.toLowerCase().includes("carbide"))).toBe(true);
    });

    it("returns recommendations for 4140", () => {
      const result = jmDieMillProgramHarvesterEngine.getSpeedsFeedsRecommendation("4140");

      expect(result.rpm_range[0]).toBeGreaterThan(1500);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("handles unknown material gracefully", () => {
      const result = jmDieMillProgramHarvesterEngine.getSpeedsFeedsRecommendation("unknown_material");

      expect(result.rpm_range[0]).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.7);
    });

    it("includes tribal tips for known materials", () => {
      const result = jmDieMillProgramHarvesterEngine.getSpeedsFeedsRecommendation("D2");

      expect(result.tribal_tips.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // GET ALL TRIBAL TIPS
  // ============================================================================

  describe("getAllTribalTips()", () => {
    it("returns all tribal tips", () => {
      const tips = jmDieMillProgramHarvesterEngine.getAllTribalTips();

      expect(tips.length).toBeGreaterThan(10);
      for (const tip of tips) {
        expect(typeof tip).toBe("string");
        expect(tip.length).toBeGreaterThan(20);
      }
    });

    it("includes material-specific tips", () => {
      const tips = jmDieMillProgramHarvesterEngine.getAllTribalTips();

      expect(tips.some(t => t.toLowerCase().includes("d2"))).toBe(true);
      expect(tips.some(t => t.toLowerCase().includes("m2"))).toBe(true);
    });

    it("includes customer-specific tips", () => {
      const tips = jmDieMillProgramHarvesterEngine.getAllTribalTips();

      expect(tips.some(t => t.toLowerCase().includes("fontana") || t.toLowerCase().includes("itw"))).toBe(true);
    });
  });

  // ============================================================================
  // GET CUSTOMERS
  // ============================================================================

  describe("getCustomers()", () => {
    it("returns customer list", () => {
      const customers = jmDieMillProgramHarvesterEngine.getCustomers();

      expect(customers.length).toBeGreaterThan(5);
      expect(customers).toContain("FONTANA");
      expect(customers).toContain("ITW");
      expect(customers.some(c => c.includes("ALCOA"))).toBe(true);
    });
  });

  // ============================================================================
  // GET STATS
  // ============================================================================

  describe("getStats()", () => {
    it("returns statistics", () => {
      const stats = jmDieMillProgramHarvesterEngine.getStats();

      expect(stats.total_programs).toBe(483);
      expect(stats.total_customers).toBeGreaterThan(5);
      expect(stats.total_patterns).toBeGreaterThan(10);
      expect(stats.total_tribal_tips).toBeGreaterThan(10);
      expect(stats.tool_types).toBeGreaterThan(5);
      expect(stats.operation_sequences).toBeGreaterThan(3);
      expect(stats.material_patterns).toBeGreaterThan(3);
    });
  });

  // ============================================================================
  // PERFORMANCE
  // ============================================================================

  describe("performance", () => {
    it("harvest completes quickly", () => {
      const start = Date.now();
      const result = jmDieMillProgramHarvesterEngine.harvest();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it("getCustomerRecommendations is fast", () => {
      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        jmDieMillProgramHarvesterEngine.getCustomerRecommendations("FONTANA");
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });

  // ============================================================================
  // CONSISTENCY
  // ============================================================================

  describe("consistency", () => {
    it("harvest returns consistent results", () => {
      const result1 = jmDieMillProgramHarvesterEngine.harvest();
      const result2 = jmDieMillProgramHarvesterEngine.harvest();

      expect(result1.total_programs).toBe(result2.total_programs);
      expect(result1.total_customers).toBe(result2.total_customers);
      expect(result1.tribal_tips.length).toBe(result2.tribal_tips.length);
    });
  });
});
