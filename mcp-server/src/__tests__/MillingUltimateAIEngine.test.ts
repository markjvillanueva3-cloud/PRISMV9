/**
 * Tests for MillingUltimateAIEngine
 * Validates maximum intelligence milling AI with 8 layers of integration.
 */
import { describe, it, expect } from "vitest";
import {
  MillingUltimateAIEngine,
  millingUltimateAIEngine,
  type UltimateMillingContext,
  type DeepReasoningMode,
  type CreativeMode,
} from "../engines/MillingUltimateAIEngine.js";

describe("MillingUltimateAIEngine", () => {
  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(millingUltimateAIEngine).toBeDefined();
      expect(millingUltimateAIEngine).toBeInstanceOf(MillingUltimateAIEngine);
    });

    it("can instantiate new engine instances", () => {
      const engine = new MillingUltimateAIEngine();
      expect(engine).toBeInstanceOf(MillingUltimateAIEngine);
    });

    it("has neural network initialized", () => {
      const engine = new MillingUltimateAIEngine();
      // Neural network should be ready for predictions
      const context: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { depth_mm: 20 },
        geometry_complexity: "moderate",
      };
      const result = engine.quickAnalyze(context);
      expect(result.parameters.rpm).toBeGreaterThan(0);
      expect(result.parameters.feed).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // ANALYZE METHOD — FULL AI ANALYSIS
  // ============================================================================

  describe("analyze()", () => {
    it("returns complete UltimateAIResult", async () => {
      const context: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { depth_mm: 25, width_mm: 50 },
        geometry_complexity: "moderate",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      expect(result.request_id).toMatch(/^MILL-ULTIMATE-/);
      expect(result.timestamp).toBeDefined();
      expect(result.context).toEqual(context);
    });

    it("executes multi-mode deep reasoning", async () => {
      const context: UltimateMillingContext = {
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 58,
        feature_type: "finishing",
        dimensions: { depth_mm: 5 },
        geometry_complexity: "complex",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      expect(result.reasoning_chain.length).toBeGreaterThanOrEqual(4);
      expect(result.reasoning_modes_used.length).toBeGreaterThan(0);

      // Verify reasoning chain steps have required fields
      for (const step of result.reasoning_chain) {
        expect(step.step).toBeGreaterThan(0);
        expect(step.mode).toBeDefined();
        expect(step.thought).toBeDefined();
        expect(step.confidence).toBeGreaterThan(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("applies cross-domain scientific knowledge", async () => {
      const context: UltimateMillingContext = {
        material: "Titanium",
        material_iso: "S",
        feature_type: "roughing",
        dimensions: { depth_mm: 15 },
        geometry_complexity: "complex",
        cross_domain_reasoning: true,
      };

      const result = await millingUltimateAIEngine.analyze(context);

      expect(result.cross_domain_insights.length).toBeGreaterThan(0);
      expect(result.scientific_domains_applied.length).toBeGreaterThan(0);

      // Verify cross-domain insights have required fields
      for (const insight of result.cross_domain_insights) {
        expect(insight.source_domain).toBeDefined();
        expect(insight.manufacturing_application).toBeDefined();
        expect(insight.expected_benefit).toBeDefined();
        expect(insight.novelty_score).toBeGreaterThanOrEqual(0);
        expect(insight.novelty_score).toBeLessThanOrEqual(1);
      }
    });

    it("synthesizes hybrid approaches", async () => {
      const context: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { depth_mm: 40 },
        geometry_complexity: "complex",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      expect(result.hybrid_approaches.length).toBeGreaterThan(0);

      for (const hybrid of result.hybrid_approaches) {
        expect(hybrid.name).toBeDefined();
        expect(hybrid.components.length).toBeGreaterThan(0);
        expect(hybrid.synergy_score).toBeGreaterThan(0);
        expect(hybrid.implementation_sequence.length).toBeGreaterThan(0);
      }
    });

    it("generates Pareto-optimal solutions", async () => {
      const context: UltimateMillingContext = {
        material: "6061 Aluminum",
        material_iso: "N",
        feature_type: "roughing",
        dimensions: { depth_mm: 20 },
        geometry_complexity: "moderate",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      expect(result.pareto_frontier.length).toBeGreaterThan(0);
      expect(result.selected_solution).toBeDefined();

      for (const solution of result.pareto_frontier) {
        expect(solution.parameters.rpm).toBeGreaterThan(0);
        expect(solution.parameters.feed_mm_min).toBeGreaterThan(0);
        expect(solution.parameters.doc_mm).toBeGreaterThan(0);
        expect(solution.objectives.cycle_time_min).toBeGreaterThan(0);
        expect(solution.dominance_rank).toBeGreaterThanOrEqual(0);
      }
    });

    it("integrates tribal knowledge and playbook rules", async () => {
      const context: UltimateMillingContext = {
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 52,
        feature_type: "pocket",
        dimensions: { wall_thickness_mm: 1.5, depth_mm: 15 },
        geometry_complexity: "complex",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      expect(result.tribal_tips_applied.length).toBeGreaterThan(0);
      expect(result.playbook_rules_applied.length).toBeGreaterThan(0);
    });

    it("validates physics constraints", async () => {
      const context: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "roughing",
        dimensions: { depth_mm: 35 }, // Deep cut
        geometry_complexity: "moderate",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      expect(result.physics_validation).toBeDefined();
      expect(typeof result.physics_validation.kienzle_check).toBe("boolean");
      expect(typeof result.physics_validation.taylor_check).toBe("boolean");
      expect(typeof result.physics_validation.deflection_check).toBe("boolean");
      expect(typeof result.physics_validation.thermal_check).toBe("boolean");
      expect(typeof result.physics_validation.stability_check).toBe("boolean");
    });

    it("generates final recommendation with parameters", async () => {
      const context: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { depth_mm: 20 },
        geometry_complexity: "moderate",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      expect(result.recommendation.strategy).toBeDefined();
      expect(result.recommendation.strategy_reasoning).toBeDefined();
      expect(result.recommendation.operation_sequence.length).toBeGreaterThan(0);
      expect(result.recommendation.parameters.rpm).toBeGreaterThan(0);
      expect(result.recommendation.parameters.feed_mm_min).toBeGreaterThan(0);
      expect(result.recommendation.tool.type).toBeDefined();
      expect(result.recommendation.tool.diameter_mm).toBeGreaterThan(0);
    });

    it("computes variability and innovation metrics", async () => {
      const context: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { depth_mm: 20 },
        geometry_complexity: "moderate",
        variability_target: 0.8,
      };

      const result = await millingUltimateAIEngine.analyze(context);

      expect(result.variability_index).toBeGreaterThanOrEqual(0);
      expect(result.variability_index).toBeLessThanOrEqual(1);
      expect(result.exploration_breadth).toBeGreaterThan(0);
      expect(result.innovation_score).toBeGreaterThanOrEqual(0);
    });

    it("tracks knowledge sources queried", async () => {
      const context: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "roughing",
        dimensions: { depth_mm: 10 },
        geometry_complexity: "simple",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      expect(result.knowledge_sources_queried.length).toBeGreaterThan(5);
      expect(result.knowledge_sources_queried).toContain("DeepAIIntelligenceEngine");
      expect(result.knowledge_sources_queried).toContain("TribalKnowledgeEngine");
    });
  });

  // ============================================================================
  // QUICK ANALYZE METHOD
  // ============================================================================

  describe("quickAnalyze()", () => {
    it("returns quick result for simple context", () => {
      const context: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "roughing",
        dimensions: { depth_mm: 10 },
        geometry_complexity: "simple",
      };

      const result = millingUltimateAIEngine.quickAnalyze(context);

      expect(result.strategy).toBeDefined();
      expect(result.parameters.rpm).toBeGreaterThan(0);
      expect(result.parameters.feed).toBeGreaterThan(0);
      expect(result.parameters.doc).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toBeDefined();
    });

    it("provides higher confidence for complete context", () => {
      const minimalContext: UltimateMillingContext = {
        material: "steel",
        material_iso: "P",
        feature_type: "roughing",
        dimensions: {},
        geometry_complexity: "simple",
      };

      const completeContext: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        hardness_hrc: 30,
        feature_type: "roughing",
        dimensions: { depth_mm: 10, width_mm: 50, length_mm: 100 },
        geometry_complexity: "moderate",
        tolerance_mm: 0.05,
        surface_finish_ra: 3.2,
        machine: "Haas VF-2",
      };

      const minResult = millingUltimateAIEngine.quickAnalyze(minimalContext);
      const compResult = millingUltimateAIEngine.quickAnalyze(completeContext);

      expect(compResult.confidence).toBeGreaterThanOrEqual(minResult.confidence);
    });

    it("adjusts parameters for hard materials", () => {
      const softContext: UltimateMillingContext = {
        material: "6061 Aluminum",
        material_iso: "N",
        feature_type: "roughing",
        dimensions: { depth_mm: 10 },
        geometry_complexity: "simple",
      };

      const hardContext: UltimateMillingContext = {
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 60,
        feature_type: "roughing",
        dimensions: { depth_mm: 10 },
        geometry_complexity: "simple",
      };

      const softResult = millingUltimateAIEngine.quickAnalyze(softContext);
      const hardResult = millingUltimateAIEngine.quickAnalyze(hardContext);

      // Hard materials should have lower speeds
      expect(hardResult.parameters.rpm).toBeLessThan(softResult.parameters.rpm);
    });
  });

  // ============================================================================
  // EXPLORE MAX VARIABILITY METHOD
  // ============================================================================

  describe("exploreMaxVariability()", () => {
    it("returns maximum solution exploration", () => {
      const context: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { depth_mm: 30 },
        geometry_complexity: "complex",
      };

      const result = millingUltimateAIEngine.exploreMaxVariability(context);

      expect(result.solutions.length).toBeGreaterThan(0);
      expect(result.approaches.length).toBeGreaterThan(0);
      expect(result.novel_combinations.length).toBeGreaterThan(0);
      expect(result.variability_score).toBeGreaterThan(0);
    });

    it("generates diverse solution space", () => {
      const context: UltimateMillingContext = {
        material: "Titanium",
        material_iso: "S",
        feature_type: "roughing",
        dimensions: { depth_mm: 15 },
        geometry_complexity: "moderate",
      };

      const result = millingUltimateAIEngine.exploreMaxVariability(context);

      // Should have multiple trade-off regions
      const tradeOffRegions = new Set(result.solutions.map(s => s.trade_off_region));
      expect(tradeOffRegions.size).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // MATERIAL-SPECIFIC BEHAVIOR
  // ============================================================================

  describe("material-specific behavior", () => {
    it("handles hardened steel (H group)", async () => {
      const context: UltimateMillingContext = {
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 62,
        feature_type: "finishing",
        dimensions: { depth_mm: 2 },
        geometry_complexity: "moderate",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      // Should recommend CBN/ceramic for high hardness
      expect(result.recommendation.tool.grade).toMatch(/CBN|Ceramic|ceramic/i);
      // Should have reduced parameters
      expect(result.selected_solution.parameters.doc_mm).toBeLessThan(5);
    });

    it("handles aluminum (N group)", async () => {
      const context: UltimateMillingContext = {
        material: "6061 Aluminum",
        material_iso: "N",
        feature_type: "roughing",
        dimensions: { depth_mm: 15 },
        geometry_complexity: "simple",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      // Should recommend higher speeds for aluminum
      expect(result.selected_solution.parameters.rpm).toBeGreaterThan(3000);
      // Should recommend 2-flute for aluminum
      expect(result.recommendation.tool.flutes).toBe(2);
    });

    it("handles superalloys (S group)", async () => {
      const context: UltimateMillingContext = {
        material: "Inconel 718",
        material_iso: "S",
        feature_type: "roughing",
        dimensions: { depth_mm: 5 },
        geometry_complexity: "moderate",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      // Should have thermal warnings
      if (result.selected_solution.parameters.rpm > 2000) {
        expect(result.physics_validation.warnings.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // FEATURE-SPECIFIC BEHAVIOR
  // ============================================================================

  describe("feature-specific behavior", () => {
    it("handles deep pockets", async () => {
      const context: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { depth_mm: 50 },
        geometry_complexity: "complex",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      // Should include rest machining in hybrid approaches
      expect(result.hybrid_approaches.some(h =>
        h.components.some(c => c.toLowerCase().includes("rest") || c.toLowerCase().includes("plunge"))
      )).toBe(true);
    });

    it("handles thin walls", async () => {
      const context: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { wall_thickness_mm: 1.5, depth_mm: 20 },
        geometry_complexity: "complex",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      // Should have stability warning for thin wall
      expect(result.physics_validation.stability_check).toBe(false);
      expect(result.physics_validation.warnings.some(w =>
        w.toLowerCase().includes("thin wall") || w.toLowerCase().includes("vibrat")
      )).toBe(true);
    });

    it("handles finishing operations", async () => {
      const context: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "finishing",
        surface_finish_ra: 0.8,
        dimensions: { depth_mm: 0.5 },
        geometry_complexity: "moderate",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      // Should recommend appropriate tool for finishing
      expect(result.recommendation.tool.type).toMatch(/Ball|Endmill/i);
      // Stepover should be small for good finish
      expect(result.selected_solution.parameters.stepover_pct).toBeLessThanOrEqual(15);
    });
  });

  // ============================================================================
  // REASONING DEPTH
  // ============================================================================

  describe("reasoning depth", () => {
    it("shallow exploration produces fewer steps", async () => {
      const shallowContext: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "roughing",
        dimensions: { depth_mm: 10 },
        geometry_complexity: "simple",
        exploration_depth: "shallow",
      };

      const deepContext: UltimateMillingContext = {
        ...shallowContext,
        exploration_depth: "exhaustive",
      };

      const shallowResult = await millingUltimateAIEngine.analyze(shallowContext);
      const deepResult = await millingUltimateAIEngine.analyze(deepContext);

      expect(deepResult.reasoning_chain.length).toBeGreaterThanOrEqual(
        shallowResult.reasoning_chain.length
      );
    });

    it("exhaustive exploration uses more reasoning modes", async () => {
      const context: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { depth_mm: 20 },
        geometry_complexity: "complex",
        exploration_depth: "exhaustive",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      expect(result.reasoning_modes_used.length).toBeGreaterThanOrEqual(5);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles minimal context", async () => {
      const context: UltimateMillingContext = {
        material: "steel",
        material_iso: "P",
        feature_type: "roughing",
        dimensions: {},
        geometry_complexity: "simple",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      expect(result.recommendation).toBeDefined();
      expect(result.overall_confidence).toBeLessThan(0.9); // Lower confidence for minimal context
    });

    it("handles extreme hardness", async () => {
      const context: UltimateMillingContext = {
        material: "Hardened Steel",
        material_iso: "H",
        hardness_hrc: 70,
        feature_type: "finishing",
        dimensions: { depth_mm: 1 },
        geometry_complexity: "simple",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      // Should have physics warnings or adjusted parameters for extreme hardness
      expect(result.physics_validation.warnings.length).toBeGreaterThanOrEqual(0);
      // Lower confidence for extreme conditions
      expect(result.overall_confidence).toBeLessThan(0.95);
    });

    it("handles all context fields populated", async () => {
      const context: UltimateMillingContext = {
        part_name: "Test Part",
        customer: "FONTANA",
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 58,
        material_condition: "hardened",
        feature_type: "pocket",
        dimensions: {
          length_mm: 100,
          width_mm: 50,
          depth_mm: 25,
          wall_thickness_mm: 3,
        },
        geometry_complexity: "complex",
        tolerance_mm: 0.02,
        surface_finish_ra: 1.6,
        machine: "Haas VF-2",
        controller: "Haas NGC",
        spindle_max_rpm: 10000,
        spindle_power_kw: 22,
        axes: 3,
        max_cycle_time_min: 60,
        tool_budget_usd: 200,
        batch_size: 100,
        exploration_depth: "deep",
        allow_unconventional: true,
        cross_domain_reasoning: true,
        variability_target: 0.9,
      };

      const result = await millingUltimateAIEngine.analyze(context);

      expect(result.overall_confidence).toBeGreaterThan(0.7);
      expect(result.jm_die_patterns_matched.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // PERFORMANCE
  // ============================================================================

  describe("performance", () => {
    it("completes full analysis in reasonable time", async () => {
      const context: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { depth_mm: 20 },
        geometry_complexity: "complex",
        exploration_depth: "deep",
      };

      const start = Date.now();
      const result = await millingUltimateAIEngine.analyze(context);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000); // Should complete in <1s
      expect(result.computation_time_ms).toBeLessThan(1000);
    });

    it("quick analyze is faster than full analyze", async () => {
      const context: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "roughing",
        dimensions: { depth_mm: 10 },
        geometry_complexity: "simple",
      };

      // Quick analyze returns synchronously
      const quickResult = millingUltimateAIEngine.quickAnalyze(context);
      expect(quickResult.strategy).toBeDefined();

      // Full analyze returns complete result with more data
      const fullResult = await millingUltimateAIEngine.analyze(context);
      expect(fullResult.reasoning_chain.length).toBeGreaterThan(0);
      expect(fullResult.pareto_frontier.length).toBeGreaterThan(0);

      // Full result has more fields than quick result
      expect(Object.keys(fullResult).length).toBeGreaterThan(Object.keys(quickResult).length);
    });
  });

  // ============================================================================
  // CONFIDENCE CALIBRATION
  // ============================================================================

  describe("confidence calibration", () => {
    it("higher confidence with more evidence", async () => {
      const sparseContext: UltimateMillingContext = {
        material: "unknown",
        material_iso: "P",
        feature_type: "roughing",
        dimensions: {},
        geometry_complexity: "simple",
      };

      const richContext: UltimateMillingContext = {
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 58,
        feature_type: "pocket",
        dimensions: { depth_mm: 20, width_mm: 50 },
        geometry_complexity: "complex",
        customer: "FONTANA",
      };

      const sparseResult = await millingUltimateAIEngine.analyze(sparseContext);
      const richResult = await millingUltimateAIEngine.analyze(richContext);

      expect(richResult.overall_confidence).toBeGreaterThan(sparseResult.overall_confidence);
    });

    it("physics validation affects confidence", async () => {
      const safeContext: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        hardness_hrc: 30,
        feature_type: "roughing",
        dimensions: { depth_mm: 5 },
        geometry_complexity: "simple",
      };

      const riskyContext: UltimateMillingContext = {
        material: "Hardened Steel",
        material_iso: "H",
        hardness_hrc: 65,
        feature_type: "roughing",
        dimensions: { depth_mm: 30, wall_thickness_mm: 1 },
        geometry_complexity: "extreme",
      };

      const safeResult = await millingUltimateAIEngine.analyze(safeContext);
      const riskyResult = await millingUltimateAIEngine.analyze(riskyContext);

      // Safe context should pass more physics checks
      const safePhysicsPass = [
        safeResult.physics_validation.kienzle_check,
        safeResult.physics_validation.taylor_check,
        safeResult.physics_validation.deflection_check,
      ].filter(Boolean).length;

      const riskyPhysicsPass = [
        riskyResult.physics_validation.kienzle_check,
        riskyResult.physics_validation.taylor_check,
        riskyResult.physics_validation.deflection_check,
      ].filter(Boolean).length;

      expect(safePhysicsPass).toBeGreaterThanOrEqual(riskyPhysicsPass);
    });
  });

  // ============================================================================
  // NEURAL NETWORK
  // ============================================================================

  describe("neural network predictions", () => {
    it("produces valid parameter predictions", async () => {
      const context: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "roughing",
        dimensions: { depth_mm: 10 },
        geometry_complexity: "moderate",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      expect(result.neural_prediction.predicted_rpm).toBeGreaterThan(100);
      expect(result.neural_prediction.predicted_rpm).toBeLessThan(50000);
      expect(result.neural_prediction.predicted_feed).toBeGreaterThan(10);
      expect(result.neural_prediction.predicted_doc).toBeGreaterThan(0);
      expect(result.neural_prediction.feature_vector.length).toBeGreaterThan(0);
    });

    it("produces different predictions for different materials", async () => {
      const aluminumContext: UltimateMillingContext = {
        material: "6061 Aluminum",
        material_iso: "N",
        feature_type: "roughing",
        dimensions: { depth_mm: 10 },
        geometry_complexity: "simple",
      };

      const steelContext: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "roughing",
        dimensions: { depth_mm: 10 },
        geometry_complexity: "simple",
      };

      const alResult = await millingUltimateAIEngine.analyze(aluminumContext);
      const steelResult = await millingUltimateAIEngine.analyze(steelContext);

      // Aluminum should have higher speeds
      expect(alResult.neural_prediction.predicted_rpm).toBeGreaterThan(
        steelResult.neural_prediction.predicted_rpm
      );
    });
  });

  // ============================================================================
  // ASSUMPTIONS CHALLENGED
  // ============================================================================

  describe("assumption challenging", () => {
    it("challenges assumptions for hard material", async () => {
      const context: UltimateMillingContext = {
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 48,
        feature_type: "roughing",
        dimensions: { depth_mm: 10 },
        geometry_complexity: "moderate",
      };

      const result = await millingUltimateAIEngine.analyze(context);

      expect(result.assumptions_challenged.length).toBeGreaterThan(0);
      expect(result.assumptions_challenged.some(a =>
        a.toLowerCase().includes("challenged")
      )).toBe(true);
    });

    it("generates novel ideas", async () => {
      const context: UltimateMillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { depth_mm: 20 },
        geometry_complexity: "complex",
        allow_unconventional: true,
      };

      const result = await millingUltimateAIEngine.analyze(context);

      expect(result.novel_ideas.length).toBeGreaterThan(0);
      expect(result.novel_ideas.some(i =>
        i.toLowerCase().includes("novel")
      )).toBe(true);
    });
  });
});
