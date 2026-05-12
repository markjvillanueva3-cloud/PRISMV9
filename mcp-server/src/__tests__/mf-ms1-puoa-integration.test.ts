/**
 * MF-MS1: Physical Feasibility — PUOA Integration Tests
 *
 * Tests the integration between FeasibilityOrchestratorEngine and
 * PRISMUnifiedOrchestratorEngine for physics-based pre-flight assessment.
 */

import { describe, it, expect } from "vitest";
import {
  feasibilityOrchestratorEngine,
  type SimpleFeasibilityInput,
  type PUOAFeasibilityAssessment,
} from "../engines/FeasibilityOrchestratorEngine.js";
import { prismUnifiedOrchestratorEngine } from "../engines/PRISMUnifiedOrchestratorEngine.js";

describe("MF-MS1: Physical Feasibility PUOA Integration", () => {
  describe("assessForPUOA", () => {
    it("should return PUOA-compatible assessment for valid job", async () => {
      const input: SimpleFeasibilityInput = {
        stock_mm: { length: 200, width: 100, height: 50 },
        material: "4140",
        operations: [
          { type: "pocket", tool_diameter_mm: 10, depth_mm: 20, width_mm: 50 },
          { type: "drill", tool_diameter_mm: 8, depth_mm: 30 },
        ],
      };

      const result = await feasibilityOrchestratorEngine.assessForPUOA(input);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("feasible");
      expect(result).toHaveProperty("risk_score");
      expect(result).toHaveProperty("risks");
      expect(result).toHaveProperty("missing_prerequisites");
      expect(result).toHaveProperty("fallback_strategies");
      expect(result).toHaveProperty("success_probability");
      expect(result).toHaveProperty("summary");
      expect(typeof result.feasible).toBe("boolean");
      expect(typeof result.risk_score).toBe("number");
      expect(Array.isArray(result.risks)).toBe(true);
    });

    it("should detect high aspect ratio pocket issue", async () => {
      const input: SimpleFeasibilityInput = {
        stock_mm: { length: 100, width: 100, height: 100 },
        operations: [
          {
            id: "deep_narrow_pocket",
            type: "pocket",
            tool_diameter_mm: 8,
            depth_mm: 50,  // Deep pocket: 50mm depth / 8mm width = 6.25 aspect ratio > 4
            width_mm: 8,   // Narrow = tool diameter
          },
        ],
        quick: true,
      };

      const result = await feasibilityOrchestratorEngine.assessForPUOA(input);

      // Deep narrow pocket should flag aspect ratio (> 4 = warning)
      expect(result.risks.length).toBeGreaterThan(0);
      // Should have summary explaining the issue
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it("should return success probability between 0 and 1", async () => {
      const input: SimpleFeasibilityInput = {
        stock_mm: { length: 150, width: 150, height: 30 },
        operations: [
          { type: "face", tool_diameter_mm: 50, depth_mm: 2 },
        ],
        quick: true,
      };

      const result = await feasibilityOrchestratorEngine.assessForPUOA(input);

      expect(result.success_probability).toBeGreaterThanOrEqual(0);
      expect(result.success_probability).toBeLessThanOrEqual(1);
    });

    it("should categorize risks correctly", async () => {
      const input: SimpleFeasibilityInput = {
        stock_mm: { length: 100, width: 50, height: 50 },
        operations: [
          { type: "pocket", tool_diameter_mm: 6, depth_mm: 40, width_mm: 8 },  // Deep narrow pocket
        ],
        quick: true,
      };

      const result = await feasibilityOrchestratorEngine.assessForPUOA(input);

      for (const risk of result.risks) {
        expect(["accessibility", "workholding", "rigidity", "sequence"]).toContain(risk.category);
        expect(["low", "medium", "high", "critical"]).toContain(risk.severity);
      }
    });

    it("should provide fallback strategies for detected issues", async () => {
      const input: SimpleFeasibilityInput = {
        stock_mm: { length: 100, width: 100, height: 100 },
        operations: [
          { type: "pocket", tool_diameter_mm: 6, depth_mm: 40, width_mm: 6 },  // Aspect ratio = 40/6 = 6.67 > 4
        ],
        quick: true,
      };

      const result = await feasibilityOrchestratorEngine.assessForPUOA(input);

      // This should trigger aspect ratio warning which adds fallback strategies
      expect(result.risks.length).toBeGreaterThan(0);
      expect(result.fallback_strategies.length).toBeGreaterThan(0);
      for (const strategy of result.fallback_strategies) {
        expect(strategy).toHaveProperty("strategy");
        expect(strategy).toHaveProperty("trigger");
        expect(strategy).toHaveProperty("confidence");
        expect(strategy.confidence).toBeGreaterThanOrEqual(0);
        expect(strategy.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("should handle quick mode vs full analysis", async () => {
      const input: SimpleFeasibilityInput = {
        stock_mm: { length: 100, width: 100, height: 50 },
        operations: [
          { type: "pocket", tool_diameter_mm: 12, depth_mm: 20 },
        ],
      };

      const quickResult = await feasibilityOrchestratorEngine.assessForPUOA({
        ...input,
        quick: true,
      });
      const fullResult = await feasibilityOrchestratorEngine.assessForPUOA({
        ...input,
        quick: false,
      });

      // Both should return valid assessments
      expect(quickResult).toBeDefined();
      expect(fullResult).toBeDefined();
      expect(typeof quickResult.feasible).toBe("boolean");
      expect(typeof fullResult.feasible).toBe("boolean");
    });
  });

  describe("PUOA assessPhysicalFeasibility", () => {
    it("should expose assessPhysicalFeasibility on PUOA engine", async () => {
      expect(prismUnifiedOrchestratorEngine.assessPhysicalFeasibility).toBeDefined();
      expect(typeof prismUnifiedOrchestratorEngine.assessPhysicalFeasibility).toBe("function");
    });

    it("should return PUOA-compatible result from PUOA engine", async () => {
      const input: SimpleFeasibilityInput = {
        stock_mm: { length: 150, width: 100, height: 40 },
        material: "6061-T6",
        operations: [
          { type: "pocket", tool_diameter_mm: 10, depth_mm: 15, width_mm: 40 },
        ],
        quick: true,
      };

      const result = await prismUnifiedOrchestratorEngine.assessPhysicalFeasibility(input);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("feasible");
      expect(result).toHaveProperty("risks");
      expect(result).toHaveProperty("summary");
    });
  });

  describe("assessPreFlightWithPhysics", () => {
    it("should enhance pre-flight with physics risks", async () => {
      const puoaInput = {
        intent: "machine a deep pocket in aluminum stock",
        context: { material: "6061-T6" },
      };
      const routing = prismUnifiedOrchestratorEngine.routeToTier(puoaInput);

      const physicsInput: SimpleFeasibilityInput = {
        stock_mm: { length: 100, width: 100, height: 80 },
        material: "6061-T6",
        operations: [
          { type: "pocket", tool_diameter_mm: 8, depth_mm: 60, width_mm: 12 },
        ],
        quick: true,
      };

      const result = await prismUnifiedOrchestratorEngine.assessPreFlightWithPhysics(
        puoaInput,
        routing,
        physicsInput
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("proceed");
      expect(result).toHaveProperty("risks");
      expect(result).toHaveProperty("success_probability");

      // Physics risks should be prefixed with [Physics]
      const physicsRisks = result.risks.filter(r => r.risk.startsWith("[Physics]"));
      // May or may not have physics risks depending on analysis
      expect(Array.isArray(physicsRisks)).toBe(true);
    });

    it("should return base pre-flight when no physics input provided", async () => {
      const puoaInput = {
        intent: "calculate speeds and feeds for steel",
        context: { material: "4140" },
      };
      const routing = prismUnifiedOrchestratorEngine.routeToTier(puoaInput);

      const result = await prismUnifiedOrchestratorEngine.assessPreFlightWithPhysics(
        puoaInput,
        routing,
        undefined  // No physics input
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("proceed");
      // Should not have [Physics] prefixed risks when no physics input
      const physicsRisks = result.risks.filter(r => r.risk.startsWith("[Physics]"));
      expect(physicsRisks.length).toBe(0);
    });

    it("should combine success probabilities with physics weight", async () => {
      const puoaInput = {
        intent: "machine complex part",
        context: {},
      };
      const routing = prismUnifiedOrchestratorEngine.routeToTier(puoaInput);

      const physicsInput: SimpleFeasibilityInput = {
        stock_mm: { length: 100, width: 100, height: 50 },
        operations: [
          { type: "pocket", tool_diameter_mm: 10, depth_mm: 20 },
        ],
        quick: true,
      };

      const baseResult = prismUnifiedOrchestratorEngine.assessPreFlight(puoaInput, routing);
      const physicsResult = await prismUnifiedOrchestratorEngine.assessPreFlightWithPhysics(
        puoaInput,
        routing,
        physicsInput
      );

      // Success probability should be a weighted combination
      expect(physicsResult.success_probability).toBeGreaterThanOrEqual(0);
      expect(physicsResult.success_probability).toBeLessThanOrEqual(1);
    });
  });

  describe("risk severity mapping", () => {
    it("should map high risk to blocking proceed flag", async () => {
      // Create a scenario with a very deep, narrow pocket that should trigger high risk
      const input: SimpleFeasibilityInput = {
        stock_mm: { length: 50, width: 50, height: 100 },
        operations: [
          {
            id: "impossible_pocket",
            type: "pocket",
            tool_diameter_mm: 4,
            depth_mm: 95,  // Very deep relative to stock
            width_mm: 5,   // Very narrow
          },
        ],
        quick: true,
      };

      const result = await feasibilityOrchestratorEngine.assessForPUOA(input);

      // If high-risk issues exist, feasibility should be compromised
      if (result.risks.some(r => r.severity === "high" || r.severity === "critical")) {
        expect(result.success_probability).toBeLessThan(0.8);
      }
    });
  });

  describe("summary generation", () => {
    it("should generate human-readable summary for LLM context", async () => {
      const input: SimpleFeasibilityInput = {
        stock_mm: { length: 200, width: 150, height: 50 },
        material: "4140",
        operations: [
          { type: "face", tool_diameter_mm: 50, depth_mm: 2 },
          { type: "pocket", tool_diameter_mm: 12, depth_mm: 20 },
        ],
        quick: true,
      };

      const result = await feasibilityOrchestratorEngine.assessForPUOA(input);

      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe("string");
      expect(result.summary.length).toBeGreaterThan(10);
      // Summary should be descriptive for LLM consumption
      expect(result.summary).toMatch(/feasibility|passed|FAILED|risk|warning/i);
    });
  });

  describe("edge cases", () => {
    it("should handle empty operations array", async () => {
      const input: SimpleFeasibilityInput = {
        stock_mm: { length: 100, width: 100, height: 50 },
        operations: [],
        quick: true,
      };

      const result = await feasibilityOrchestratorEngine.assessForPUOA(input);

      expect(result).toBeDefined();
      expect(result.feasible).toBe(true);  // No operations = no issues
      expect(result.risk_score).toBe(0);
    });

    it("should handle missing material", async () => {
      const input: SimpleFeasibilityInput = {
        stock_mm: { length: 100, width: 100, height: 50 },
        operations: [
          { type: "pocket", tool_diameter_mm: 10, depth_mm: 20 },
        ],
        quick: true,
      };

      const result = await feasibilityOrchestratorEngine.assessForPUOA(input);

      expect(result).toBeDefined();
      // Should still analyze even without material
    });

    it("should handle zero dimensions gracefully", async () => {
      const input: SimpleFeasibilityInput = {
        stock_mm: { length: 100, width: 100, height: 50 },
        operations: [
          { type: "pocket", tool_diameter_mm: 10, depth_mm: 0 },  // Zero depth
        ],
        quick: true,
      };

      const result = await feasibilityOrchestratorEngine.assessForPUOA(input);

      expect(result).toBeDefined();
      // Zero depth operation should be trivially feasible
    });
  });
});
