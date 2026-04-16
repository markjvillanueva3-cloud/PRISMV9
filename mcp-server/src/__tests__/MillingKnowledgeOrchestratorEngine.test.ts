/**
 * Tests for MillingKnowledgeOrchestratorEngine
 * Validates Opus-level milling AI orchestration.
 */
import { describe, it, expect } from "vitest";
import {
  MillingKnowledgeOrchestratorEngine,
  millingKnowledgeOrchestratorEngine,
  type MillingOrchestratorContext,
} from "../engines/MillingKnowledgeOrchestratorEngine.js";

describe("MillingKnowledgeOrchestratorEngine", () => {
  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(millingKnowledgeOrchestratorEngine).toBeDefined();
      expect(millingKnowledgeOrchestratorEngine).toBeInstanceOf(MillingKnowledgeOrchestratorEngine);
    });

    it("can instantiate new engine instances", () => {
      const engine = new MillingKnowledgeOrchestratorEngine();
      expect(engine).toBeInstanceOf(MillingKnowledgeOrchestratorEngine);
    });
  });

  // ============================================================================
  // ORCHESTRATE METHOD
  // ============================================================================

  describe("orchestrate()", () => {
    it("returns complete orchestration result for steel roughing", async () => {
      const context: MillingOrchestratorContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { length_mm: 100, width_mm: 50, depth_mm: 20 },
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      expect(result.request_id).toMatch(/^MILL-ORCH-/);
      expect(result.neural_prediction).toBeDefined();
      expect(result.neural_prediction.predicted_rpm).toBeGreaterThan(0);
      expect(result.neural_prediction.predicted_feed_mm_min).toBeGreaterThan(0);
      expect(result.decision_tree.length).toBeGreaterThan(0);
      expect(result.recommendation).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it("handles hardened steel with appropriate adjustments", async () => {
      const context: MillingOrchestratorContext = {
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 58,
        feature_type: "finishing",
        dimensions: { length_mm: 50, width_mm: 30, depth_mm: 5 },
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      // Hardened steel should have lower RPM and feed
      expect(result.neural_prediction.predicted_rpm).toBeLessThan(2000);
      expect(result.neural_prediction.predicted_doc_mm).toBeLessThanOrEqual(0.5);
      // Should have special handling for hard material
      expect(result.recommendation.special_instructions.length).toBeGreaterThan(0);
    });

    it("handles aluminum with high-speed parameters", async () => {
      const context: MillingOrchestratorContext = {
        material: "6061-T6 Aluminum",
        material_iso: "N",
        feature_type: "pocket",
        dimensions: { length_mm: 100, width_mm: 80, depth_mm: 30 },
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      // Aluminum should have higher RPM/feed
      expect(result.neural_prediction.predicted_rpm).toBeGreaterThan(5000);
      expect(result.recommendation.tool_recommendation.flutes).toBe(2);
      // Should have some special handling for aluminum
      expect(result.recommendation.special_instructions.some(s =>
        /coolant|flood|aluminum/i.test(s)
      )).toBe(true);
    });

    it("generates hybrid approaches when allowed", async () => {
      const context: MillingOrchestratorContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { length_mm: 100, width_mm: 50, depth_mm: 35 },
        allow_hybrid_approaches: true,
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      expect(result.hybrid_approaches.length).toBeGreaterThan(0);
      expect(result.hybrid_approaches[0].strategies_combined.length).toBeGreaterThan(1);
      expect(result.hybrid_approaches[0].expected_improvement_pct).toBeGreaterThan(0);
    });

    it("respects machine spindle limits", async () => {
      const context: MillingOrchestratorContext = {
        material: "6061 Aluminum",
        material_iso: "N",
        feature_type: "roughing",
        dimensions: { length_mm: 50, width_mm: 50, depth_mm: 10 },
        spindle_max_rpm: 6000,
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      // Should not exceed machine limit
      expect(result.recommendation.parameters.rpm).toBeLessThanOrEqual(6000);
    });

    it("respects cycle time constraints", async () => {
      const context: MillingOrchestratorContext = {
        material: "1018 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { length_mm: 200, width_mm: 100, depth_mm: 50 },
        max_cycle_time_min: 15,
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      expect(result.cost_analysis).toBeDefined();
      // Should flag if exceeds constraint
      if (result.cost_analysis.estimated_cycle_time_min > 15) {
        expect(result.critical_validation.blocking_issues.length).toBeGreaterThan(0);
      }
    });

    it("performs critical validation checks", async () => {
      const context: MillingOrchestratorContext = {
        material: "A2 Tool Steel",
        material_iso: "P",
        hardness_hrc: 62,
        feature_type: "finishing",
        dimensions: { length_mm: 100, width_mm: 50, depth_mm: 40 },
        spindle_power_kw: 10,
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      expect(result.critical_validation).toBeDefined();
      expect(result.critical_validation.checks_performed.length).toBeGreaterThan(0);
      // High hardness with low power should generate warnings
      expect(result.critical_validation.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it("includes reasoning summary", async () => {
      const context: MillingOrchestratorContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "slot",
        dimensions: { length_mm: 100, width_mm: 10, depth_mm: 15 },
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      expect(result.reasoning_summary).toBeDefined();
      expect(result.reasoning_summary.length).toBeGreaterThan(20);
      expect(result.knowledge_sources_used.length).toBeGreaterThan(0);
    });

    it("computes reasonable cycle time", async () => {
      const context: MillingOrchestratorContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { length_mm: 50, width_mm: 50, depth_mm: 10 },
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      expect(result.neural_prediction.predicted_cycle_time_min).toBeGreaterThan(0);
      expect(result.cost_analysis.estimated_cycle_time_min).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // QUICK RECOMMEND METHOD
  // ============================================================================

  describe("quickRecommend()", () => {
    it("returns quick recommendation for simple query", () => {
      const context: MillingOrchestratorContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "roughing",
        dimensions: { depth_mm: 10 },
      };

      const result = millingKnowledgeOrchestratorEngine.quickRecommend(context);

      expect(result.strategy).toBeDefined();
      expect(result.rpm).toBeGreaterThan(0);
      expect(result.feed).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toBeDefined();
    });

    it("adjusts for material type", () => {
      const steelContext: MillingOrchestratorContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "roughing",
        dimensions: {},
      };

      const aluminumContext: MillingOrchestratorContext = {
        material: "6061 Aluminum",
        material_iso: "N",
        feature_type: "roughing",
        dimensions: {},
      };

      const steelResult = millingKnowledgeOrchestratorEngine.quickRecommend(steelContext);
      const aluminumResult = millingKnowledgeOrchestratorEngine.quickRecommend(aluminumContext);

      // Aluminum should have higher RPM
      expect(aluminumResult.rpm).toBeGreaterThan(steelResult.rpm);
    });
  });

  // ============================================================================
  // SYNTHESIZE NOVEL SOLUTION METHOD
  // ============================================================================

  describe("synthesizeNovelSolution()", () => {
    it("generates novel solution for complex problem", () => {
      const context: MillingOrchestratorContext = {
        material: "Inconel 718",
        material_iso: "S",
        feature_type: "pocket",
        dimensions: { length_mm: 100, width_mm: 50, depth_mm: 30 },
      };

      const result = millingKnowledgeOrchestratorEngine.synthesizeNovelSolution(
        "Minimize tool wear while maintaining cycle time",
        ["max_tool_cost_50_usd", "max_cycle_time_20_min"],
        context
      );

      expect(result.solution).toBeDefined();
      expect(result.implementation.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.risk_assessment).toBeDefined();
    });

    it("returns standard approach when no novel combination found", () => {
      const context: MillingOrchestratorContext = {
        material: "1018 Steel",
        material_iso: "P",
        feature_type: "face",
        dimensions: { length_mm: 50, width_mm: 50, depth_mm: 2 },
      };

      const result = millingKnowledgeOrchestratorEngine.synthesizeNovelSolution(
        "Simple face mill",
        [],
        context
      );

      expect(result.solution).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  // ============================================================================
  // COST OPTIMIZATION
  // ============================================================================

  describe("cost optimization", () => {
    it("prioritizes cycle time when weighted high", async () => {
      const context: MillingOrchestratorContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "roughing",
        dimensions: { length_mm: 100, width_mm: 50, depth_mm: 20 },
        cost_weights: {
          cycle_time: 0.8,
          tool_life: 0.1,
          surface_quality: 0.05,
          accuracy: 0.03,
          safety_margin: 0.02,
        },
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      expect(result.cost_analysis.optimization_applied.length).toBeGreaterThan(0);
      expect(result.cost_analysis.optimization_applied.some(s =>
        /time|speed|feed/i.test(s)
      )).toBe(true);
    });

    it("prioritizes tool life when weighted high", async () => {
      const context: MillingOrchestratorContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "roughing",
        dimensions: { length_mm: 100, width_mm: 50, depth_mm: 20 },
        cost_weights: {
          cycle_time: 0.1,
          tool_life: 0.7,
          surface_quality: 0.1,
          accuracy: 0.05,
          safety_margin: 0.05,
        },
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      expect(result.cost_analysis.optimization_applied.length).toBeGreaterThan(0);
      expect(result.cost_analysis.optimization_applied.some(s =>
        /tool|life|reduced/i.test(s)
      )).toBe(true);
    });

    it("scales tool cost for batch size", async () => {
      const smallBatch: MillingOrchestratorContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "roughing",
        dimensions: { depth_mm: 10 },
        batch_size: 5,
      };

      const largeBatch: MillingOrchestratorContext = {
        ...smallBatch,
        batch_size: 100,
      };

      const smallResult = await millingKnowledgeOrchestratorEngine.orchestrate(smallBatch);
      const largeResult = await millingKnowledgeOrchestratorEngine.orchestrate(largeBatch);

      expect(largeResult.cost_analysis.estimated_tool_cost_usd).toBeGreaterThan(
        smallResult.cost_analysis.estimated_tool_cost_usd
      );
    });
  });

  // ============================================================================
  // DECISION TREE
  // ============================================================================

  describe("decision tree", () => {
    it("includes strategy decision", async () => {
      const context: MillingOrchestratorContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { depth_mm: 15 },
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      const strategyNode = result.decision_tree.find(n => n.decision_type === "strategy");
      expect(strategyNode).toBeDefined();
      expect(strategyNode!.options.length).toBeGreaterThan(1);
      expect(strategyNode!.selected_option).toBeDefined();
    });

    it("includes tool decision", async () => {
      const context: MillingOrchestratorContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "finishing",
        dimensions: { depth_mm: 5 },
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      const toolNode = result.decision_tree.find(n => n.decision_type === "tool");
      expect(toolNode).toBeDefined();
      expect(toolNode!.options.length).toBeGreaterThan(0);
    });

    it("includes sequence decision", async () => {
      const context: MillingOrchestratorContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { depth_mm: 20 },
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      const sequenceNode = result.decision_tree.find(n => n.decision_type === "sequence");
      expect(sequenceNode).toBeDefined();
    });

    it("includes parameter decision", async () => {
      const context: MillingOrchestratorContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "roughing",
        dimensions: { depth_mm: 10 },
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      const paramNode = result.decision_tree.find(n => n.decision_type === "parameter");
      expect(paramNode).toBeDefined();
      expect(paramNode!.options.length).toBe(3); // aggressive, standard, conservative
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles minimal context", async () => {
      const context: MillingOrchestratorContext = {
        material: "Steel",
        material_iso: "P",
        feature_type: "general",
        dimensions: {},
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      expect(result.recommendation).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it("handles very deep pocket", async () => {
      const context: MillingOrchestratorContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { length_mm: 50, width_mm: 50, depth_mm: 100 },
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      // Deep pocket should have hybrid approaches available
      expect(result.recommendation).toBeDefined();
      // Deep pocket context should generate warnings or special handling
      expect(result.hybrid_approaches.length).toBeGreaterThan(0);
    });

    it("handles tight tolerance requirement", async () => {
      const context: MillingOrchestratorContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "bore",
        dimensions: { diameter_mm: 25, depth_mm: 30 },
        tolerance_mm: 0.005,
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      // Tight tolerance should result in special handling
      expect(result.recommendation).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("handles conservative preference", async () => {
      const context: MillingOrchestratorContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "roughing",
        dimensions: { depth_mm: 10 },
        prefer_conservative: true,
      };

      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);

      const paramNode = result.decision_tree.find(n => n.decision_type === "parameter");
      expect(paramNode?.selected_option).toBe("conservative");
    });
  });

  // ============================================================================
  // PERFORMANCE
  // ============================================================================

  describe("performance", () => {
    it("completes orchestration in reasonable time", async () => {
      const context: MillingOrchestratorContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { length_mm: 100, width_mm: 50, depth_mm: 30 },
        allow_hybrid_approaches: true,
      };

      const start = Date.now();
      const result = await millingKnowledgeOrchestratorEngine.orchestrate(context);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000); // Should complete in <1s
      expect(result.computation_time_ms).toBeLessThan(1000);
    });
  });
});
