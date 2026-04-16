/**
 * SpeedFeedUltimateAIEngine Test Suite — SF-AI-L3
 *
 * Tests for deep ensemble, episodic memory, knowledge graph,
 * tree of thoughts, meta-learning, active learning, LLM CLI,
 * adversarial validation, and multi-modal fusion.
 *
 * @module __tests__/speed-feed-ultimate-ai
 */

import { describe, it, expect, beforeEach } from "vitest";
import { speedFeedUltimateAIEngine } from "../engines/SpeedFeedUltimateAIEngine.js";

describe("SpeedFeedUltimateAIEngine — SF-AI-L3", () => {
  // ============================================================================
  // DEEP ENSEMBLE
  // ============================================================================

  describe("getDeepEnsemblePrediction", () => {
    it("should return predictions from 5 architectures", () => {
      const result = speedFeedUltimateAIEngine.getDeepEnsemblePrediction(
        "4140",
        12,
        4,
        "milling",
        "roughing"
      );

      expect(result.members.length).toBe(5);
      const architectures = result.members.map(m => m.architecture);
      expect(architectures).toContain("mlp");
      expect(architectures).toContain("resnet");
      expect(architectures).toContain("transformer");
      expect(architectures).toContain("gru");
      expect(architectures).toContain("attention");
    });

    it("should calculate consensus from ensemble", () => {
      const result = speedFeedUltimateAIEngine.getDeepEnsemblePrediction(
        "6061",
        16,
        3,
        "milling",
        "finishing"
      );

      expect(result.consensus.speed_mpm).toBeGreaterThan(0);
      expect(result.consensus.feed_mm).toBeGreaterThan(0);
      expect(result.consensus.life_min).toBeGreaterThan(0);
    });

    it("should decompose uncertainty into aleatoric and epistemic", () => {
      const result = speedFeedUltimateAIEngine.getDeepEnsemblePrediction(
        "Ti-6Al-4V",
        10,
        4,
        "milling",
        "semi_finishing"
      );

      expect(result.uncertainty_decomposition.aleatoric).toBeGreaterThan(0);
      expect(result.uncertainty_decomposition.epistemic).toBeGreaterThanOrEqual(0);
      expect(result.calibrated_confidence).toBeGreaterThan(0);
      expect(result.calibrated_confidence).toBeLessThanOrEqual(1);
    });

    it("should calculate disagreement between members", () => {
      const result = speedFeedUltimateAIEngine.getDeepEnsemblePrediction(
        "316L",
        12,
        4,
        "milling",
        "roughing"
      );

      expect(result.disagreement).toBeGreaterThanOrEqual(0);
      expect(result.disagreement).toBeLessThan(1); // Should not be extreme
    });
  });

  // ============================================================================
  // EPISODIC MEMORY
  // ============================================================================

  describe("retrieveEpisodes", () => {
    it("should retrieve similar episodes", () => {
      const result = speedFeedUltimateAIEngine.retrieveEpisodes(
        "4140",
        "milling",
        "roughing",
        5
      );

      expect(result.query_context).toContain("4140");
      expect(result.similar_episodes).toBeInstanceOf(Array);
      expect(result.success_rate).toBeGreaterThanOrEqual(0);
      expect(result.success_rate).toBeLessThanOrEqual(1);
    });

    it("should identify common failure modes", () => {
      const result = speedFeedUltimateAIEngine.retrieveEpisodes(
        "Ti-6Al-4V",
        "milling",
        "roughing"
      );

      expect(result.common_failure_modes).toBeInstanceOf(Array);
    });

    it("should provide recommended adjustments", () => {
      const result = speedFeedUltimateAIEngine.retrieveEpisodes(
        "316L",
        "milling",
        "finishing"
      );

      expect(result.recommended_adjustments).toBeInstanceOf(Array);
    });
  });

  describe("storeEpisode", () => {
    it("should store a new episode", () => {
      const initialStats = speedFeedUltimateAIEngine.getEpisodicMemoryStats();

      speedFeedUltimateAIEngine.storeEpisode({
        id: `test-${Date.now()}`,
        timestamp: Date.now(),
        material: "4140",
        operation: "milling",
        cut_type: "roughing",
        parameters: { speed_mpm: 150, feed_mm: 0.1, depth_mm: 3 },
        outcome: "success",
        tool_life_achieved_min: 55,
      });

      const newStats = speedFeedUltimateAIEngine.getEpisodicMemoryStats();
      expect(newStats.total_episodes).toBe(initialStats.total_episodes + 1);
    });
  });

  describe("getEpisodicMemoryStats", () => {
    it("should return memory statistics", () => {
      const stats = speedFeedUltimateAIEngine.getEpisodicMemoryStats();

      expect(stats.total_episodes).toBeGreaterThan(0);
      expect(stats.success_rate).toBeGreaterThanOrEqual(0);
      expect(stats.materials_covered).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // KNOWLEDGE GRAPH
  // ============================================================================

  describe("queryKnowledgeGraph", () => {
    it("should find paths from starting node", () => {
      const result = speedFeedUltimateAIEngine.queryKnowledgeGraph("steel_P");

      expect(result.query).toBe("steel_P");
      expect(result.paths).toBeInstanceOf(Array);
    });

    it("should generate inferences from graph", () => {
      const result = speedFeedUltimateAIEngine.queryKnowledgeGraph("roughing", undefined, 3);

      expect(result.inferences).toBeInstanceOf(Array);
    });

    it("should discover constraints", () => {
      const result = speedFeedUltimateAIEngine.queryKnowledgeGraph("hardened_H");

      expect(result.constraints_discovered).toBeInstanceOf(Array);
    });
  });

  describe("getKnowledgeGraphStats", () => {
    it("should return graph statistics", () => {
      const stats = speedFeedUltimateAIEngine.getKnowledgeGraphStats();

      expect(stats.nodes).toBeGreaterThan(10);
      expect(stats.edges).toBeGreaterThan(10);
      expect(stats.node_types).toBeInstanceOf(Array);
      expect(stats.node_types.length).toBeGreaterThan(3);
    });
  });

  // ============================================================================
  // WORKING MEMORY
  // ============================================================================

  describe("getWorkingMemoryState", () => {
    it("should return current session state", () => {
      const state = speedFeedUltimateAIEngine.getWorkingMemoryState();

      expect(state.session_id).toBeTruthy();
      expect(state.recent_queries).toBeInstanceOf(Array);
      expect(state.current_context).toBeDefined();
      expect(state.refinement_history).toBeInstanceOf(Array);
    });
  });

  describe("updateWorkingMemoryContext", () => {
    it("should update context", () => {
      speedFeedUltimateAIEngine.updateWorkingMemoryContext({
        material: "4140",
        operation: "milling",
        tool_diameter_mm: 12,
      });

      const state = speedFeedUltimateAIEngine.getWorkingMemoryState();
      expect(state.current_context.material).toBe("4140");
      expect(state.current_context.operation).toBe("milling");
    });
  });

  describe("resetWorkingMemory", () => {
    it("should reset to clean state", () => {
      speedFeedUltimateAIEngine.updateWorkingMemoryContext({ material: "test" });
      speedFeedUltimateAIEngine.resetWorkingMemory();

      const state = speedFeedUltimateAIEngine.getWorkingMemoryState();
      expect(state.current_context.material).toBeUndefined();
    });
  });

  // ============================================================================
  // TREE OF THOUGHTS
  // ============================================================================

  describe("treeOfThoughtsOptimize", () => {
    it("should explore parameter space with tree search", () => {
      const result = speedFeedUltimateAIEngine.treeOfThoughtsOptimize(
        "4140",
        12,
        4,
        "milling",
        "roughing"
      );

      expect(result.root).toBeDefined();
      expect(result.best_path).toBeInstanceOf(Array);
      expect(result.best_path.length).toBeGreaterThan(0);
      expect(result.optimal_parameters.speed_mpm).toBeGreaterThan(0);
    });

    it("should track exploration statistics", () => {
      const result = speedFeedUltimateAIEngine.treeOfThoughtsOptimize(
        "6061",
        16,
        3,
        "milling",
        "finishing",
        3,
        3
      );

      expect(result.exploration_stats.nodes_explored).toBeGreaterThan(0);
      expect(result.exploration_stats.max_depth).toBe(3);
      expect(result.exploration_stats.branching_factor).toBe(3);
    });

    it("should prune low-scoring branches", () => {
      const result = speedFeedUltimateAIEngine.treeOfThoughtsOptimize(
        "Ti-6Al-4V",
        10,
        4,
        "milling",
        "semi_finishing",
        4,
        3
      );

      expect(result.exploration_stats.nodes_pruned).toBeGreaterThanOrEqual(0);
    });

    it("should have confidence score", () => {
      const result = speedFeedUltimateAIEngine.treeOfThoughtsOptimize(
        "316L",
        12,
        4,
        "milling",
        "roughing"
      );

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // META-LEARNING
  // ============================================================================

  describe("metaLearn", () => {
    it("should provide base and adapted parameters", () => {
      const result = speedFeedUltimateAIEngine.metaLearn(
        "4140",
        12,
        "milling",
        "roughing"
      );

      expect(result.base_parameters.speed_mpm).toBeGreaterThan(0);
      expect(result.adapted_parameters.speed_mpm).toBeGreaterThan(0);
      expect(result.transfer_source).toBeTruthy();
    });

    it("should adapt based on few-shot samples", () => {
      const withoutSamples = speedFeedUltimateAIEngine.metaLearn(
        "6061",
        16,
        "milling",
        "finishing"
      );

      const withSamples = speedFeedUltimateAIEngine.metaLearn(
        "6061",
        16,
        "milling",
        "finishing",
        [
          { material: "6061", speed_mpm: 450, feed_mm: 0.08 },
          { material: "7075", speed_mpm: 400, feed_mm: 0.07 },
        ]
      );

      expect(withSamples.few_shot_samples_used).toBe(2);
      expect(withSamples.adaptation_confidence).toBeGreaterThan(withoutSamples.adaptation_confidence);
    });

    it("should detect domain shift", () => {
      const result = speedFeedUltimateAIEngine.metaLearn(
        "Ti-6Al-4V",
        10,
        "milling",
        "roughing",
        [
          { material: "aluminum", speed_mpm: 400, feed_mm: 0.15 }, // Very different from titanium
        ]
      );

      // With a sample very different from titanium base, might detect shift
      expect(typeof result.domain_shift_detected).toBe("boolean");
    });
  });

  // ============================================================================
  // ACTIVE LEARNING
  // ============================================================================

  describe("suggestNextExperiment", () => {
    it("should suggest experiment parameters", () => {
      const result = speedFeedUltimateAIEngine.suggestNextExperiment(
        "4140",
        { min_speed: 100, max_speed: 250, min_feed: 0.05, max_feed: 0.15 }
      );

      expect(result.suggested_experiment.speed_mpm).toBeGreaterThanOrEqual(100);
      expect(result.suggested_experiment.speed_mpm).toBeLessThanOrEqual(250);
      expect(result.suggested_experiment.feed_mm).toBeGreaterThanOrEqual(0.05);
      expect(result.suggested_experiment.feed_mm).toBeLessThanOrEqual(0.15);
    });

    it("should estimate information gain", () => {
      const result = speedFeedUltimateAIEngine.suggestNextExperiment(
        "6061",
        { min_speed: 200, max_speed: 500, min_feed: 0.05, max_feed: 0.12 }
      );

      expect(result.expected_information_gain).toBeGreaterThanOrEqual(0);
      expect(result.expected_information_gain).toBeLessThanOrEqual(1);
      expect(result.uncertainty_reduction).toBeGreaterThan(0);
    });

    it("should balance exploration vs exploitation", () => {
      const explorative = speedFeedUltimateAIEngine.suggestNextExperiment(
        "316L",
        { min_speed: 50, max_speed: 150, min_feed: 0.05, max_feed: 0.12 },
        0.8 // High exploration
      );

      const exploitative = speedFeedUltimateAIEngine.suggestNextExperiment(
        "316L",
        { min_speed: 50, max_speed: 150, min_feed: 0.05, max_feed: 0.12 },
        0.2 // Low exploration
      );

      expect(explorative.exploration_score).toBeGreaterThan(exploitative.exploration_score);
    });

    it("should include rationale", () => {
      const result = speedFeedUltimateAIEngine.suggestNextExperiment(
        "Ti-6Al-4V",
        { min_speed: 30, max_speed: 80, min_feed: 0.04, max_feed: 0.10 }
      );

      expect(result.rationale).toBeTruthy();
    });
  });

  // ============================================================================
  // LLM CLI INTEGRATION
  // ============================================================================

  describe("generateLLMCLITrace", () => {
    it("should generate reasoning trace", () => {
      const result = speedFeedUltimateAIEngine.generateLLMCLITrace(
        "4140",
        12,
        4,
        "milling",
        "roughing"
      );

      expect(result.query).toBeTruthy();
      expect(result.reasoning_steps).toBeInstanceOf(Array);
      expect(result.reasoning_steps.length).toBeGreaterThanOrEqual(4);
      expect(result.final_answer).toBeTruthy();
    });

    it("should have structured reasoning steps", () => {
      const result = speedFeedUltimateAIEngine.generateLLMCLITrace(
        "6061",
        16,
        3,
        "milling",
        "finishing"
      );

      for (const step of result.reasoning_steps) {
        expect(step.step).toBeGreaterThan(0);
        expect(step.thought).toBeTruthy();
        expect(step.action).toBeTruthy();
        expect(step.observation).toBeTruthy();
        expect(step.confidence).toBeGreaterThan(0);
      }
    });

    it("should format for CLI display", () => {
      const result = speedFeedUltimateAIEngine.generateLLMCLITrace(
        "Ti-6Al-4V",
        10,
        4,
        "milling",
        "semi_finishing"
      );

      expect(result.cli_formatted).toContain("PRISM");
      expect(result.cli_formatted).toContain("Speed");
      expect(result.cli_formatted).toContain("Feed");
    });

    it("should include interactive prompts", () => {
      const result = speedFeedUltimateAIEngine.generateLLMCLITrace(
        "316L",
        12,
        4,
        "milling",
        "roughing"
      );

      expect(result.interactive_prompts).toBeInstanceOf(Array);
      expect(result.interactive_prompts.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // ADVERSARIAL VALIDATION
  // ============================================================================

  describe("validateRobustness", () => {
    it("should test multiple perturbations", () => {
      const result = speedFeedUltimateAIEngine.validateRobustness(
        "4140",
        12,
        4,
        "milling",
        "roughing",
        20
      );

      expect(result.perturbations_tested).toBe(20);
      expect(result.original_prediction.speed_mpm).toBeGreaterThan(0);
    });

    it("should calculate robustness score", () => {
      const result = speedFeedUltimateAIEngine.validateRobustness(
        "6061",
        16,
        3,
        "milling",
        "finishing"
      );

      expect(result.robustness_score).toBeGreaterThan(0);
      expect(result.robustness_score).toBeLessThanOrEqual(1);
    });

    it("should identify worst-case deviation", () => {
      const result = speedFeedUltimateAIEngine.validateRobustness(
        "Ti-6Al-4V",
        10,
        4,
        "milling",
        "semi_finishing"
      );

      expect(result.worst_case_deviation).toBeGreaterThanOrEqual(0);
    });

    it("should detect out-of-distribution inputs", () => {
      const normalResult = speedFeedUltimateAIEngine.validateRobustness(
        "4140",
        12,
        4,
        "milling",
        "roughing"
      );

      // Small diameter edge case
      const edgeResult = speedFeedUltimateAIEngine.validateRobustness(
        "exotic_material_xyz",
        0.5, // Very small
        2,
        "drilling",
        "finishing"
      );

      expect(normalResult.ood_detected).toBe(false);
      expect(edgeResult.ood_detected).toBe(true);
    });

    it("should recalibrate confidence", () => {
      const result = speedFeedUltimateAIEngine.validateRobustness(
        "316L",
        12,
        4,
        "milling",
        "roughing"
      );

      expect(result.recalibrated_confidence).toBeGreaterThan(0);
      expect(result.recalibrated_confidence).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // MULTI-MODAL FUSION
  // ============================================================================

  describe("fuseMultiModal", () => {
    it("should combine physics, empirical, and tribal sources", () => {
      const result = speedFeedUltimateAIEngine.fuseMultiModal(
        "4140",
        12,
        4,
        "milling",
        "roughing"
      );

      expect(result.sources.physics).toBeDefined();
      expect(result.sources.empirical).toBeDefined();
      expect(result.sources.tribal).toBeDefined();
    });

    it("should produce fused prediction", () => {
      const result = speedFeedUltimateAIEngine.fuseMultiModal(
        "6061",
        16,
        3,
        "milling",
        "finishing"
      );

      expect(result.fused_prediction.speed_mpm).toBeGreaterThan(0);
      expect(result.fused_prediction.feed_mm).toBeGreaterThan(0);
      expect(result.fused_prediction.life_min).toBeGreaterThan(0);
    });

    it("should detect conflicts between sources", () => {
      const result = speedFeedUltimateAIEngine.fuseMultiModal(
        "Ti-6Al-4V",
        10,
        4,
        "milling",
        "semi_finishing"
      );

      expect(typeof result.conflict_detected).toBe("boolean");
      expect(result.conflict_resolution).toBeTruthy();
    });

    it("should calculate fusion confidence", () => {
      const result = speedFeedUltimateAIEngine.fuseMultiModal(
        "316L",
        12,
        4,
        "milling",
        "roughing"
      );

      expect(result.fusion_confidence).toBeGreaterThan(0);
      expect(result.fusion_confidence).toBeLessThanOrEqual(1);
    });

    it("should have source weights summing to ~1", () => {
      const result = speedFeedUltimateAIEngine.fuseMultiModal(
        "4140",
        12,
        4,
        "milling",
        "finishing"
      );

      const totalWeight =
        result.sources.physics.weight +
        result.sources.empirical.weight +
        result.sources.tribal.weight;

      expect(totalWeight).toBeCloseTo(1.0, 1);
    });
  });

  // ============================================================================
  // ULTIMATE ANALYSIS
  // ============================================================================

  describe("ultimateAnalysis", () => {
    it("should consult all 10 AI systems", async () => {
      const result = await speedFeedUltimateAIEngine.ultimateAnalysis({
        material: "4140",
        tool_diameter_mm: 12,
        flutes: 4,
        operation: "milling",
        cut_type: "roughing",
      });

      expect(result.ai_systems_consulted).toBe(10);
      expect(result.deep_ensemble).toBeDefined();
      expect(result.episodic_memory).toBeDefined();
      expect(result.knowledge_graph).toBeDefined();
      expect(result.tree_of_thoughts).toBeDefined();
      expect(result.meta_learning).toBeDefined();
      expect(result.active_learning).toBeDefined();
      expect(result.llm_trace).toBeDefined();
      expect(result.adversarial).toBeDefined();
      expect(result.multi_modal).toBeDefined();
    });

    it("should produce final recommendation", async () => {
      const result = await speedFeedUltimateAIEngine.ultimateAnalysis({
        material: "6061",
        tool_diameter_mm: 16,
        flutes: 3,
        operation: "milling",
        cut_type: "finishing",
      });

      expect(result.final_recommendation.speed_mpm).toBeGreaterThan(0);
      expect(result.final_recommendation.feed_mm).toBeGreaterThan(0);
      expect(result.final_recommendation.depth_mm).toBeGreaterThan(0);
      expect(result.final_recommendation.tool_life_min).toBeGreaterThan(0);
      expect(result.final_recommendation.surface_finish_um).toBeGreaterThan(0);
    });

    it("should have overall confidence", async () => {
      const result = await speedFeedUltimateAIEngine.ultimateAnalysis({
        material: "Ti-6Al-4V",
        tool_diameter_mm: 10,
        flutes: 4,
        operation: "milling",
        cut_type: "semi_finishing",
      });

      expect(result.overall_confidence).toBeGreaterThan(0);
      expect(result.overall_confidence).toBeLessThanOrEqual(1);
    });

    it("should use few-shot samples when provided", async () => {
      const result = await speedFeedUltimateAIEngine.ultimateAnalysis({
        material: "316L",
        tool_diameter_mm: 12,
        flutes: 4,
        operation: "milling",
        cut_type: "roughing",
        few_shot_samples: [
          { material: "304", speed_mpm: 90, feed_mm: 0.08 },
        ],
      });

      expect(result.meta_learning.few_shot_samples_used).toBe(1);
    });
  });

  // ============================================================================
  // STATISTICS
  // ============================================================================

  describe("stats", () => {
    it("should return comprehensive statistics", () => {
      // Run some queries first
      speedFeedUltimateAIEngine.getDeepEnsemblePrediction("4140", 12, 4, "milling", "roughing");

      const stats = speedFeedUltimateAIEngine.stats();

      expect(stats.queries_processed).toBeGreaterThan(0);
      expect(stats.ai_systems).toBe(10);
      expect(stats.episodic_memory).toBeDefined();
      expect(stats.knowledge_graph).toBeDefined();
      expect(stats.working_memory).toBeDefined();
    });

    it("should track episodic memory stats", () => {
      const stats = speedFeedUltimateAIEngine.stats();

      expect(stats.episodic_memory.total_episodes).toBeGreaterThan(0);
      expect(stats.episodic_memory.success_rate).toBeGreaterThanOrEqual(0);
    });

    it("should track knowledge graph stats", () => {
      const stats = speedFeedUltimateAIEngine.stats();

      expect(stats.knowledge_graph.nodes).toBeGreaterThan(0);
      expect(stats.knowledge_graph.edges).toBeGreaterThan(0);
    });

    it("should include working memory context", () => {
      speedFeedUltimateAIEngine.updateWorkingMemoryContext({ material: "test_material" });

      const stats = speedFeedUltimateAIEngine.stats();

      expect(stats.working_memory.context).toBeTruthy();
    });
  });
});
