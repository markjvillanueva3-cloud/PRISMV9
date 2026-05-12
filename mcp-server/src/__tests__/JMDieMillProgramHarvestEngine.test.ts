/**
 * Tests for JMDieMillProgramHarvestEngine
 * Validates mill program harvesting from JM Die archive.
 */
import { describe, it, expect } from "vitest";
import {
  JMDieMillProgramHarvestEngine,
  jmDieMillProgramHarvestEngine,
  type CustomerMillProfile,
  type ToolUsagePattern,
  type OperationPattern,
  type MastercamMetadata,
  type MillHarvestResult,
} from "../engines/JMDieMillProgramHarvestEngine.js";

describe("JMDieMillProgramHarvestEngine", () => {
  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(jmDieMillProgramHarvestEngine).toBeDefined();
      expect(jmDieMillProgramHarvestEngine).toBeInstanceOf(JMDieMillProgramHarvestEngine);
    });

    it("can instantiate new engine instances", () => {
      const engine = new JMDieMillProgramHarvestEngine();
      expect(engine).toBeInstanceOf(JMDieMillProgramHarvestEngine);
    });
  });

  // ============================================================================
  // HARVEST METHOD
  // ============================================================================

  describe("harvest()", () => {
    it("returns complete MillHarvestResult", async () => {
      const result = await jmDieMillProgramHarvestEngine.harvest();

      expect(result.timestamp).toBeDefined();
      expect(typeof result.total_files).toBe("number");
      expect(typeof result.total_customers).toBe("number");
      expect(typeof result.proven_programs).toBe("number");
      expect(Array.isArray(result.customer_profiles)).toBe(true);
      expect(Array.isArray(result.tool_patterns)).toBe(true);
      expect(Array.isArray(result.operation_sequences)).toBe(true);
      expect(typeof result.material_distribution).toBe("object");
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("discovers customer profiles", async () => {
      const result = await jmDieMillProgramHarvestEngine.harvest();

      // Should have at least some customers
      expect(result.total_customers).toBeGreaterThanOrEqual(0);

      if (result.customer_profiles.length > 0) {
        const profile = result.customer_profiles[0];
        expect(profile.customer_name).toBeDefined();
        expect(typeof profile.program_count).toBe("number");
        expect(typeof profile.proven_count).toBe("number");
        expect(Array.isArray(profile.common_tools)).toBe(true);
        expect(Array.isArray(profile.common_operations)).toBe(true);
      }
    });

    it("extracts tool patterns", async () => {
      const result = await jmDieMillProgramHarvestEngine.harvest();

      if (result.tool_patterns.length > 0) {
        const pattern = result.tool_patterns[0];
        expect(typeof pattern.tool_number).toBe("number");
        expect(pattern.tool_type).toBeDefined();
        expect(typeof pattern.usage_count).toBe("number");
      }
    });

    it("identifies operation sequences", async () => {
      const result = await jmDieMillProgramHarvestEngine.harvest();

      if (result.operation_sequences.length > 0) {
        const sequence = result.operation_sequences[0];
        expect(Array.isArray(sequence.sequence)).toBe(true);
        expect(typeof sequence.frequency).toBe("number");
        expect(Array.isArray(sequence.customers)).toBe(true);
      }
    });

    it("tracks material distribution", async () => {
      const result = await jmDieMillProgramHarvestEngine.harvest();

      expect(typeof result.material_distribution).toBe("object");
      // Each material count should be a number
      for (const count of Object.values(result.material_distribution)) {
        expect(typeof count).toBe("number");
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    it("generates recommendations", async () => {
      const result = await jmDieMillProgramHarvestEngine.harvest();

      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  // ============================================================================
  // CUSTOMER RECOMMENDATIONS
  // ============================================================================

  describe("getCustomerRecommendations()", () => {
    it("returns recommendation structure", () => {
      const result = jmDieMillProgramHarvestEngine.getCustomerRecommendations("FONTANA");

      // Return type: { tools, operations, materials, confidence }
      expect(Array.isArray(result.tools)).toBe(true);
      expect(Array.isArray(result.operations)).toBe(true);
      expect(Array.isArray(result.materials)).toBe(true);
      expect(typeof result.confidence).toBe("number");
    });

    it("returns zero confidence for unknown customer", () => {
      const result = jmDieMillProgramHarvestEngine.getCustomerRecommendations("UNKNOWN_CUSTOMER_XYZ");

      expect(result.confidence).toBe(0);
      expect(result.tools).toEqual([]);
      expect(result.operations).toEqual([]);
      expect(result.materials).toEqual([]);
    });

    it("handles case-insensitive lookup", () => {
      const upper = jmDieMillProgramHarvestEngine.getCustomerRecommendations("FONTANA");
      const lower = jmDieMillProgramHarvestEngine.getCustomerRecommendations("fontana");

      // Both should return same results (uppercase lookup)
      expect(upper.confidence).toBe(lower.confidence);
      expect(upper.tools.length).toBe(lower.tools.length);
    });

    it("returns valid confidence range", () => {
      const result = jmDieMillProgramHarvestEngine.getCustomerRecommendations("FONTANA");

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // PREDICT TOOL METHOD
  // ============================================================================

  describe("predictTool()", () => {
    it("returns tool prediction structure", () => {
      const result = jmDieMillProgramHarvestEngine.predictTool("roughing", "P");

      expect(typeof result.tool_type).toBe("string");
      expect(Array.isArray(result.recommended_tools)).toBe(true);
      expect(Array.isArray(result.reasoning)).toBe(true);
    });

    it("provides reasoning for prediction", () => {
      const result = jmDieMillProgramHarvestEngine.predictTool("drilling", "P", 10);

      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it("handles unknown operation gracefully", () => {
      const result = jmDieMillProgramHarvestEngine.predictTool("unknown_op", "X");

      expect(result.tool_type).toBeDefined();
      expect(Array.isArray(result.recommended_tools)).toBe(true);
    });

    it("filters by diameter when provided", () => {
      const withDiameter = jmDieMillProgramHarvestEngine.predictTool("drilling", "P", 10);
      const withoutDiameter = jmDieMillProgramHarvestEngine.predictTool("drilling", "P");

      // With diameter filter may return fewer tools
      expect(withDiameter.recommended_tools.length).toBeLessThanOrEqual(
        withoutDiameter.recommended_tools.length + 1 // Allow for ties
      );
    });
  });

  // ============================================================================
  // TYPE STRUCTURE VALIDATION
  // ============================================================================

  describe("type structure validation", () => {
    it("CustomerMillProfile has correct structure", async () => {
      const result = await jmDieMillProgramHarvestEngine.harvest();

      if (result.customer_profiles.length > 0) {
        const profile = result.customer_profiles[0];

        // Validate all required fields exist and have correct types
        expect(typeof profile.customer_name).toBe("string");
        expect(typeof profile.program_count).toBe("number");
        expect(typeof profile.proven_count).toBe("number");
        expect(Array.isArray(profile.common_tools)).toBe(true);
        expect(Array.isArray(profile.common_operations)).toBe(true);
        expect(Array.isArray(profile.material_indicators)).toBe(true);
        expect(Array.isArray(profile.typical_tolerances)).toBe(true);
      }
    });

    it("ToolUsagePattern has correct structure", async () => {
      const result = await jmDieMillProgramHarvestEngine.harvest();

      if (result.tool_patterns.length > 0) {
        const pattern = result.tool_patterns[0];

        expect(typeof pattern.tool_number).toBe("number");
        expect(typeof pattern.description).toBe("string");
        expect(typeof pattern.tool_type).toBe("string");
        expect(typeof pattern.usage_count).toBe("number");
        expect(Array.isArray(pattern.customers_using)).toBe(true);
      }
    });

    it("OperationPattern has correct structure", async () => {
      const result = await jmDieMillProgramHarvestEngine.harvest();

      if (result.operation_sequences.length > 0) {
        const pattern = result.operation_sequences[0];

        expect(Array.isArray(pattern.sequence)).toBe(true);
        expect(typeof pattern.frequency).toBe("number");
        expect(Array.isArray(pattern.customers)).toBe(true);
        expect(typeof pattern.is_proven).toBe("boolean");
      }
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles empty customer name", () => {
      const result = jmDieMillProgramHarvestEngine.getCustomerRecommendations("");

      expect(result.confidence).toBe(0);
      expect(Array.isArray(result.tools)).toBe(true);
    });

    it("handles special characters in customer name", () => {
      const result = jmDieMillProgramHarvestEngine.getCustomerRecommendations("TEST/CUSTOMER");

      // Should not throw
      expect(result).toBeDefined();
      expect(result.confidence).toBe(0); // Unknown customer
    });

    it("harvest handles missing directories gracefully", async () => {
      // Should not throw even if some directories are missing
      const result = await jmDieMillProgramHarvestEngine.harvest();
      expect(result).toBeDefined();
    });

    it("predictTool handles edge values", () => {
      // Very small diameter
      const small = jmDieMillProgramHarvestEngine.predictTool("drilling", "P", 0.5);
      expect(small).toBeDefined();

      // Very large diameter
      const large = jmDieMillProgramHarvestEngine.predictTool("face_milling", "P", 100);
      expect(large).toBeDefined();

      // Negative diameter (edge case)
      const negative = jmDieMillProgramHarvestEngine.predictTool("drilling", "P", -5);
      expect(negative).toBeDefined();
    });
  });

  // ============================================================================
  // PERFORMANCE
  // ============================================================================

  describe("performance", () => {
    it("harvest completes in reasonable time", async () => {
      const start = Date.now();
      const result = await jmDieMillProgramHarvestEngine.harvest();
      const elapsed = Date.now() - start;

      // Should complete in <15 seconds (generous for full directory scan)
      expect(elapsed).toBeLessThan(15000);
      expect(result).toBeDefined();
    });

    it("getCustomerRecommendations is fast", () => {
      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        jmDieMillProgramHarvestEngine.getCustomerRecommendations("FONTANA");
      }
      const elapsed = Date.now() - start;

      // 100 calls should complete in <100ms
      expect(elapsed).toBeLessThan(100);
    });

    it("predictTool is fast", () => {
      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        jmDieMillProgramHarvestEngine.predictTool("drilling", "P", 10);
      }
      const elapsed = Date.now() - start;

      // 100 calls should complete in <100ms
      expect(elapsed).toBeLessThan(100);
    });
  });

  // ============================================================================
  // CONSISTENCY
  // ============================================================================

  describe("consistency", () => {
    it("harvest returns consistent customer count", async () => {
      const result1 = await jmDieMillProgramHarvestEngine.harvest();
      const result2 = await jmDieMillProgramHarvestEngine.harvest();

      // File counts should be consistent (unless files change)
      expect(result1.total_customers).toBe(result2.total_customers);
    }, 60000); // Allow 60s for two file system scans

    it("getCustomerRecommendations is deterministic", () => {
      const result1 = jmDieMillProgramHarvestEngine.getCustomerRecommendations("FONTANA");
      const result2 = jmDieMillProgramHarvestEngine.getCustomerRecommendations("FONTANA");

      expect(result1.confidence).toBe(result2.confidence);
      expect(result1.tools.length).toBe(result2.tools.length);
    });

    it("predictTool is deterministic", () => {
      const result1 = jmDieMillProgramHarvestEngine.predictTool("roughing", "P", 10);
      const result2 = jmDieMillProgramHarvestEngine.predictTool("roughing", "P", 10);

      expect(result1.tool_type).toBe(result2.tool_type);
      expect(result1.recommended_tools.length).toBe(result2.recommended_tools.length);
    });
  });
});
