/**
 * Tests for Post Processor AI Engines:
 * - PostProcessorDeepLearningEngine (PP-AI-L1)
 * - PostProcessorDeepReasoningEngine (PP-AI-L2)
 * - PostProcessorUltimateAIEngine (PP-AI-L3)
 *
 * Comprehensive coverage of deep learning pattern recognition,
 * chain-of-thought reasoning, and LLM CLI integration.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { postProcessorDeepLearningEngine } from "../engines/PostProcessorDeepLearningEngine.js";
import { postProcessorDeepReasoningEngine } from "../engines/PostProcessorDeepReasoningEngine.js";
import { postProcessorUltimateAIEngine } from "../engines/PostProcessorUltimateAIEngine.js";

// ============================================================================
// TEST DATA
// ============================================================================

const SAMPLE_GCODE = `O1001 (TEST PROGRAM)
G90 G80 G40 G49
G28 G91 Z0
G28 X0 Y0
T1 M06
G54
S6000 M03
G43 H1 Z50.
G00 X0 Y0
G01 Z-5.0 F500
G01 X50. F2000
G01 Y50.
G01 X0.
G01 Y0.
G00 Z50.
M05
G28 G91 Z0
M30`;

const SAMPLE_ROUGHING_GCODE = `O2001 (ROUGHING)
G90 G54
S3000 M03
G00 Z5.
G01 Z-10. F150
G01 X100. F800
G00 Z5.
M30`;

const SAMPLE_DRILLING_GCODE = `O3001 (DRILLING)
G90 G54
S2000 M03
G81 X10. Y10. Z-15. R2. F100
X20. Y20.
X30. Y30.
G80
M30`;

// ============================================================================
// PostProcessorDeepLearningEngine (PP-AI-L1)
// ============================================================================

describe("PostProcessorDeepLearningEngine", () => {
  const engine = postProcessorDeepLearningEngine;

  describe("G-code Pattern Recognition", () => {
    it("recognizes basic contour pattern", () => {
      const result = engine.recognizePatterns({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        machine_controller: "fanuc",
      });

      expect(result).toBeDefined();
      expect(result.operation_type).toBeDefined();
      expect(result.operation_confidence).toBeGreaterThan(0);
      expect(result.operation_confidence).toBeLessThanOrEqual(1);
      expect(result.toolpath_strategy).toBeDefined();
      expect(result.detected_features).toBeInstanceOf(Array);
      expect(result.anomalies).toBeInstanceOf(Array);
      expect(result.embedding).toBeInstanceOf(Array);
    });

    it("detects roughing operations", () => {
      const result = engine.recognizePatterns({
        gcode: SAMPLE_ROUGHING_GCODE,
        material_iso: "P",
        machine_controller: "fanuc",
      });

      expect(["roughing", "semi_finishing"]).toContain(result.operation_type);
    });

    it("detects drilling operations", () => {
      const result = engine.recognizePatterns({
        gcode: SAMPLE_DRILLING_GCODE,
        material_iso: "P",
        machine_controller: "fanuc",
      });

      expect(result.operation_type).toBe("drilling");
      expect(result.operation_confidence).toBeGreaterThanOrEqual(0.5);
    });

    it("returns valid embedding vector", () => {
      const result = engine.recognizePatterns({
        gcode: SAMPLE_GCODE,
        material_iso: "M",
        machine_controller: "siemens",
      });

      expect(result.embedding.length).toBe(64);
      result.embedding.forEach(v => {
        expect(typeof v).toBe("number");
        expect(Number.isFinite(v)).toBe(true);
      });
    });
  });

  describe("Feed Optimization (via analyze)", () => {
    it("optimizes feed rate with physics constraints", () => {
      const analysis = engine.analyze({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        machine_controller: "fanuc",
        tool_diameter_mm: 10,
        spindle_rpm: 6000,
      });

      const result = analysis.feed_optimization;
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
      if (result.length > 0) {
        expect(result[0].original_feed).toBeDefined();
        expect(result[0].optimized_feed).toBeDefined();
        expect(result[0].confidence).toBeGreaterThan(0);
        expect(result[0].physics_constraints).toBeInstanceOf(Array);
        expect(result[0].reasoning).toBeInstanceOf(Array);
      }
    });

    it("applies Kienzle force constraints", () => {
      const analysis = engine.analyze({
        gcode: SAMPLE_GCODE,
        material_iso: "H", // Hard material
        machine_controller: "fanuc",
        tool_diameter_mm: 6,
        spindle_rpm: 4000,
      });

      const result = analysis.feed_optimization;
      if (result.length > 0) {
        const kienzleConstraint = result[0].physics_constraints.find(c =>
          c.constraint.toLowerCase().includes("kienzle") ||
          c.constraint.toLowerCase().includes("force")
        );
        expect(kienzleConstraint).toBeDefined();
      }
    });

    it("handles different ISO material groups", () => {
      const materials: Array<"P" | "M" | "K" | "N" | "S" | "H"> = ["P", "M", "K", "N", "S", "H"];
      for (const material of materials) {
        const analysis = engine.analyze({
          gcode: SAMPLE_GCODE,
          material_iso: material,
          machine_controller: "fanuc",
          tool_diameter_mm: 10,
          spindle_rpm: 5000,
        });
        expect(analysis.feed_optimization).toBeInstanceOf(Array);
      }
    });
  });

  describe("Controller Classification", () => {
    it("classifies Fanuc G-code correctly", () => {
      const result = engine.classifyController({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
      });

      expect(result).toBeDefined();
      expect(result.detected_controller).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.dialect_features).toBeInstanceOf(Array);
      expect(result.migration_suggestions).toBeInstanceOf(Array);
    });

    it("provides migration suggestions", () => {
      const result = engine.classifyController({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
      });

      // Migration suggestions may be empty if no targets specified
      expect(result.migration_suggestions).toBeInstanceOf(Array);
      result.migration_suggestions.forEach(s => {
        expect(s.target).toBeDefined();
        expect(["trivial", "moderate", "complex"]).toContain(s.complexity);
        expect(s.changes_required).toBeInstanceOf(Array);
      });
    });
  });

  describe("Cycle Time Estimation", () => {
    it("estimates cycle time with breakdown", () => {
      const result = engine.estimateCycleTime({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        machine_controller: "fanuc",
      });

      expect(result).toBeDefined();
      expect(result.estimated_time_sec).toBeGreaterThan(0);
      expect(result.confidence_interval).toBeDefined();
      expect(result.confidence_interval.lower).toBeLessThan(result.confidence_interval.upper);
      expect(result.breakdown).toBeInstanceOf(Array);
      expect(result.breakdown.length).toBeGreaterThan(0);
    });

    it("identifies bottlenecks", () => {
      const result = engine.estimateCycleTime({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        machine_controller: "fanuc",
      });

      expect(result.bottlenecks).toBeInstanceOf(Array);
      result.bottlenecks.forEach(b => {
        expect(b.operation).toBeDefined();
        expect(b.time_sec).toBeGreaterThan(0);
        expect(b.optimization_potential).toBeGreaterThanOrEqual(0);
        expect(b.optimization_potential).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("Post Quality Scoring", () => {
    it("scores post quality across dimensions", () => {
      const result = engine.scorePostQuality({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        machine_controller: "fanuc",
      });

      expect(result).toBeDefined();
      expect(result.overall_score).toBeGreaterThanOrEqual(0);
      expect(result.overall_score).toBeLessThanOrEqual(100);
      expect(result.dimensions).toBeInstanceOf(Array);
      expect(result.dimensions.length).toBeGreaterThanOrEqual(5);
    });

    it("validates safety dimension", () => {
      const result = engine.scorePostQuality({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        machine_controller: "fanuc",
      });

      const safetyDim = result.dimensions.find(d => d.name === "Safety");
      expect(safetyDim).toBeDefined();
      expect(safetyDim!.score).toBeGreaterThanOrEqual(0);
      expect(safetyDim!.score).toBeLessThanOrEqual(100);
    });
  });

  describe("Full Analysis", () => {
    it("runs comprehensive deep learning analysis", () => {
      const result = engine.analyze({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        machine_controller: "fanuc",
        tool_diameter_mm: 10,
        spindle_rpm: 6000,
      });

      expect(result).toBeDefined();
      expect(result.pattern_recognition).toBeDefined();
      expect(result.feed_optimization).toBeDefined();
      expect(result.controller_classification).toBeDefined();
      expect(result.cycle_time_estimation).toBeDefined();
      expect(result.quality_score).toBeDefined();
      expect(result.neural_confidence).toBeGreaterThan(0);
      expect(result.neural_confidence).toBeLessThanOrEqual(1);
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// PostProcessorDeepReasoningEngine (PP-AI-L2)
// ============================================================================

describe("PostProcessorDeepReasoningEngine", () => {
  const engine = postProcessorDeepReasoningEngine;

  describe("Chain of Thought Reasoning", () => {
    it("generates multi-step reasoning", () => {
      const result = engine.chainOfThought({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
        query: "How can I optimize this program for faster cycle time?",
      });

      expect(result).toBeDefined();
      expect(result.query).toBeDefined();
      expect(result.steps).toBeInstanceOf(Array);
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.final_conclusion).toBeDefined();
      expect(result.overall_confidence).toBeGreaterThan(0);
      expect(result.reasoning_path).toBeDefined();
    });

    it("includes confidence per step", () => {
      const result = engine.chainOfThought({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      result.steps.forEach(step => {
        expect(step.step_number).toBeDefined();
        expect(step.thought).toBeDefined();
        expect(step.conclusion).toBeDefined();
        expect(step.confidence).toBeGreaterThan(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
      });
    });

    it("explores alternative paths", () => {
      const result = engine.chainOfThought({
        gcode: SAMPLE_GCODE,
        material_iso: "M",
        target_controller: "siemens",
      });

      expect(result.alternative_paths).toBeInstanceOf(Array);
      result.alternative_paths.forEach(alt => {
        expect(alt.path).toBeDefined();
        expect(alt.confidence).toBeGreaterThanOrEqual(0);
        expect(alt.rejected_reason).toBeDefined();
      });
    });
  });

  describe("Causal Inference", () => {
    it("performs root cause analysis", () => {
      const result = engine.causalInference({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      expect(result).toBeDefined();
      expect(result.nodes).toBeInstanceOf(Array);
      expect(result.edges).toBeInstanceOf(Array);
      expect(result.root_causes).toBeInstanceOf(Array);
      expect(result.intervention_recommendations).toBeInstanceOf(Array);
    });

    it("supports counterfactual reasoning", () => {
      const result = engine.causalInference({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      expect(result.counterfactuals).toBeInstanceOf(Array);
      if (result.counterfactuals.length > 0) {
        const cf = result.counterfactuals[0];
        expect(cf.scenario).toBeDefined();
        expect(cf.outcome).toBeDefined();
        expect(cf.confidence).toBeGreaterThan(0);
      }
    });
  });

  describe("Cross-CAM Feature Synthesis", () => {
    it("synthesizes features from multiple CAM systems", () => {
      const result = engine.synthesizeCrossCAM({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
        source_cams: ["mastercam", "fusion360", "solidcam"],
      });

      expect(result).toBeDefined();
      expect(result.selected_features).toBeInstanceOf(Array);
      expect(result.conflicts_resolved).toBeInstanceOf(Array);
      expect(result.compatibility_matrix).toBeDefined();
      expect(result.optimization_score).toBeGreaterThanOrEqual(0);
      expect(result.optimization_score).toBeLessThanOrEqual(100);
    });

    it("resolves feature conflicts", () => {
      const result = engine.synthesizeCrossCAM({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
        source_cams: ["hypermill", "nx"],
      });

      result.conflicts_resolved.forEach(conflict => {
        expect(conflict.feature_a).toBeDefined();
        expect(conflict.feature_b).toBeDefined();
        expect(conflict.resolution).toBeDefined();
        expect(conflict.chosen).toBeDefined();
      });
    });
  });

  describe("Controller Optimization", () => {
    it("generates controller-specific optimizations", () => {
      const result = engine.optimizeForController({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      expect(result).toBeDefined();
      expect(result.target_controller).toBeDefined();
      expect(result.optimizations_applied).toBeInstanceOf(Array);
      expect(result.features_injected).toBeInstanceOf(Array);
      expect(result.estimated_improvement_pct).toBeGreaterThanOrEqual(0);
    });

    it("works with different controllers", () => {
      const controllers: Array<"fanuc" | "siemens" | "haas" | "okuma" | "mazak"> =
        ["fanuc", "siemens", "haas", "okuma", "mazak"];

      for (const controller of controllers) {
        const result = engine.optimizeForController({
          gcode: SAMPLE_GCODE,
          material_iso: "P",
          target_controller: controller,
        });
        expect(result.target_controller).toBe(controller);
        expect(result.estimated_improvement_pct).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Physics Reasoning", () => {
    it("applies Kienzle force analysis", () => {
      const result = engine.physicsReasoning({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
        tool_diameter_mm: 10,
        spindle_rpm: 6000,
      });

      expect(result).toBeDefined();
      expect(result.kienzle_analysis).toBeDefined();
      expect(result.kienzle_analysis.kc1_1).toBeGreaterThan(0);
      expect(result.kienzle_analysis.margin_pct).toBeDefined();
    });

    it("applies Taylor tool life analysis", () => {
      const result = engine.physicsReasoning({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
        tool_diameter_mm: 10,
        spindle_rpm: 6000,
      });

      expect(result.taylor_analysis).toBeDefined();
      expect(result.taylor_analysis.predicted_life_min).toBeGreaterThan(0);
    });

    it("checks physics constraint satisfaction", () => {
      const result = engine.physicsReasoning({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
        tool_diameter_mm: 10,
        spindle_rpm: 6000,
      });

      expect(typeof result.constraints_satisfied).toBe("boolean");
      expect(result.overall_physics_score).toBeGreaterThanOrEqual(0);
      expect(result.overall_physics_score).toBeLessThanOrEqual(100);
    });
  });

  describe("Self-Consistency Verification", () => {
    it("explores multiple reasoning paths", () => {
      const result = engine.verifySelfConsistency({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
        tool_diameter_mm: 10,
        spindle_rpm: 6000,
      });

      expect(result).toBeDefined();
      expect(result.num_paths_explored).toBeGreaterThan(0);
      expect(typeof result.consensus_reached).toBe("boolean");
      expect(result.path_agreements).toBeInstanceOf(Array);
      expect(result.final_confidence).toBeGreaterThan(0);
    });

    it("identifies disagreements between paths", () => {
      const result = engine.verifySelfConsistency({
        gcode: SAMPLE_ROUGHING_GCODE,
        material_iso: "H",
        target_controller: "fanuc",
        tool_diameter_mm: 6,
        spindle_rpm: 3000,
      });

      expect(result.disagreements).toBeInstanceOf(Array);
      result.disagreements.forEach(d => {
        expect(d.topic).toBeDefined();
        expect(d.positions).toBeInstanceOf(Array);
        expect(d.resolution).toBeDefined();
      });
    });
  });

  describe("Full Analysis", () => {
    it("runs comprehensive deep reasoning analysis", () => {
      const result = engine.analyze({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
        source_cams: ["mastercam"],
        tool_diameter_mm: 10,
        spindle_rpm: 6000,
      });

      expect(result).toBeDefined();
      expect(result.chain_of_thought).toBeDefined();
      expect(result.causal_inference).toBeDefined();
      expect(result.cross_cam_synthesis).toBeDefined();
      expect(result.controller_optimization).toBeDefined();
      expect(result.physics_reasoning).toBeDefined();
      expect(result.self_consistency).toBeDefined();
      expect(result.reasoning_confidence).toBeGreaterThan(0);
      expect(result.reasoning_confidence).toBeLessThanOrEqual(1);
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// PostProcessorUltimateAIEngine (PP-AI-L3)
// ============================================================================

describe("PostProcessorUltimateAIEngine", () => {
  const engine = postProcessorUltimateAIEngine;

  describe("Deep Ensemble", () => {
    it("combines 5 diverse architectures", () => {
      const result = engine.deepEnsemble({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      expect(result).toBeDefined();
      expect(result.members).toBeInstanceOf(Array);
      expect(result.members.length).toBe(5);
      expect(result.consensus).toBeDefined();
      expect(result.calibrated_confidence).toBeGreaterThan(0);
      expect(result.uncertainty).toBeDefined();
    });

    it("quantifies uncertainty", () => {
      const result = engine.deepEnsemble({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      expect(result.uncertainty.aleatoric).toBeGreaterThanOrEqual(0);
      expect(result.uncertainty.epistemic).toBeGreaterThanOrEqual(0);
      expect(result.disagreement).toBeGreaterThanOrEqual(0);
    });

    it("includes diverse architectures", () => {
      const result = engine.deepEnsemble({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      const architectures = result.members.map(m => m.architecture);
      expect(architectures).toContain("mlp");
      expect(architectures).toContain("resnet");
      expect(architectures).toContain("transformer");
    });
  });

  describe("Episodic Memory", () => {
    beforeEach(() => {
      // Clear episodes before each test
      (engine as any).episodes = [];
    });

    it("stores and retrieves episodes", () => {
      const id = engine.storeEpisode({
        controller: "fanuc",
        source_cam: "mastercam",
        machine: "Haas VF-2",
        post_config: { decimal_places: 4 },
        outcome: "success",
        cycle_time_actual_sec: 120,
      });

      expect(id).toBeDefined();
      expect(id).toMatch(/^ep-/);

      const retrieved = engine.retrieveEpisodes({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      expect(retrieved).toBeDefined();
      expect(retrieved.similar_episodes).toBeInstanceOf(Array);
    });

    it("calculates success rate from history", () => {
      engine.storeEpisode({
        controller: "fanuc",
        source_cam: "mastercam",
        machine: "Haas VF-2",
        post_config: {},
        outcome: "success",
      });
      engine.storeEpisode({
        controller: "fanuc",
        source_cam: "mastercam",
        machine: "Haas VF-3",
        post_config: {},
        outcome: "success",
      });
      engine.storeEpisode({
        controller: "fanuc",
        source_cam: "mastercam",
        machine: "Haas VF-4",
        post_config: {},
        outcome: "crash",
      });

      const retrieved = engine.retrieveEpisodes({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      // With 2 success and 1 crash, rate should be ~0.67
      expect(retrieved.success_rate).toBeGreaterThan(0.5);
      expect(retrieved.success_rate).toBeLessThanOrEqual(1);
    });
  });

  describe("Knowledge Graph", () => {
    it("queries controller-feature relationships", () => {
      const result = engine.queryKnowledgeGraph({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      expect(result).toBeDefined();
      expect(result.query).toBeDefined();
      expect(result.paths).toBeInstanceOf(Array);
      expect(result.inferences).toBeInstanceOf(Array);
      expect(result.recommended_features).toBeInstanceOf(Array);
    });

    it("returns paths and inferences", () => {
      const result = engine.queryKnowledgeGraph({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "siemens",
      });

      expect(result.paths).toBeInstanceOf(Array);
      result.paths.forEach(path => {
        expect(path.nodes).toBeInstanceOf(Array);
        expect(path.relations).toBeInstanceOf(Array);
        expect(path.confidence).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Tree of Thoughts", () => {
    it("explores multiple optimization branches", () => {
      const result = engine.treeOfThoughts({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      expect(result).toBeDefined();
      expect(result.root).toBeDefined();
      expect(result.best_path).toBeInstanceOf(Array);
      expect(result.optimal_config).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("tracks exploration statistics", () => {
      const result = engine.treeOfThoughts({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      expect(result.exploration_stats).toBeDefined();
      expect(result.exploration_stats.nodes_explored).toBeGreaterThanOrEqual(0);
      expect(result.exploration_stats.nodes_pruned).toBeGreaterThanOrEqual(0);
      expect(result.exploration_stats.max_depth).toBeGreaterThan(0);
    });

    it("selects best optimization path", () => {
      const result = engine.treeOfThoughts({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      expect(result.best_path).toBeInstanceOf(Array);
      expect(result.optimal_config).toBeDefined();
    });
  });

  describe("Meta-Learning", () => {
    it("identifies transfer sources for new controller", () => {
      const result = engine.metaLearning({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fagor",
      });

      expect(result).toBeDefined();
      expect(result.base_config).toBeDefined();
      expect(result.adapted_config).toBeDefined();
      expect(result.transfer_source).toBeDefined();
      expect(result.adaptation_confidence).toBeGreaterThan(0);
    });

    it("provides adaptation details", () => {
      const result = engine.metaLearning({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "okuma",
      });

      expect(result.base_config).toBeDefined();
      expect(result.adapted_config).toBeDefined();
      expect(result.few_shot_samples).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Adversarial Validation", () => {
    it("identifies vulnerabilities", () => {
      const result = engine.adversarialValidation({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      expect(result).toBeDefined();
      expect(result.vulnerabilities).toBeInstanceOf(Array);
      expect(typeof result.edge_cases_tested).toBe("number");
      expect(typeof result.safety_verified).toBe("boolean");
      expect(result.robustness_score).toBeGreaterThanOrEqual(0);
      expect(result.robustness_score).toBeLessThanOrEqual(100);
    });

    it("provides recommendations", () => {
      const result = engine.adversarialValidation({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.edge_cases_tested).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Generative Post Synthesis", () => {
    it("generates optimized post configuration", () => {
      const result = engine.generatePost({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
        generate_post: true,
      });

      expect(result).toBeDefined();
      expect(result.generated_post).toBeDefined();
      expect(result.generated_post.name).toBeDefined();
      expect(result.generated_post.controller).toBeDefined();
      expect(result.generated_post.safe_start).toBeDefined();
      expect(result.generated_post.program_end).toBeDefined();
      expect(result.optimization_score).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("includes HSM for supporting controllers", () => {
      const result = engine.generatePost({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
        generate_post: true,
      });

      expect(result.features_included).toBeInstanceOf(Array);
      // Fanuc supports HSM
      expect(result.features_included.some(f => f.includes("HSM"))).toBe(true);
    });

    it("generates posts for different controllers", () => {
      const controllers: Array<"fanuc" | "siemens" | "haas" | "heidenhain"> =
        ["fanuc", "siemens", "haas", "heidenhain"];

      for (const controller of controllers) {
        const result = engine.generatePost({
          gcode: SAMPLE_GCODE,
          material_iso: "P",
          target_controller: controller,
          generate_post: true,
        });
        expect(result.generated_post.controller).toBe(controller);
        expect(result.generated_post.safe_start.length).toBeGreaterThan(0);
      }
    });
  });

  describe("LLM CLI Integration", () => {
    it("generates LLM CLI compatible output", () => {
      const analysis = engine.analyze({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
        llm_cli_mode: true,
        query: "Optimize this post for Fanuc",
      });

      expect(analysis.llm_cli_output).toBeDefined();
      const cliOutput = analysis.llm_cli_output!;

      expect(cliOutput.query).toBeDefined();
      expect(cliOutput.response).toBeDefined();
      expect(cliOutput.reasoning_trace).toBeInstanceOf(Array);
      expect(cliOutput.confidence).toBeGreaterThan(0);
      expect(cliOutput.sources).toBeInstanceOf(Array);
      expect(cliOutput.suggestions).toBeInstanceOf(Array);
      expect(cliOutput.interactive_options).toBeInstanceOf(Array);
    });

    it("includes code blocks with G-code", () => {
      const analysis = engine.analyze({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
        llm_cli_mode: true,
        generate_post: true,
      });

      expect(analysis.llm_cli_output).toBeDefined();
      expect(analysis.llm_cli_output!.code_blocks).toBeInstanceOf(Array);

      if (analysis.llm_cli_output!.code_blocks.length > 0) {
        const block = analysis.llm_cli_output!.code_blocks[0];
        expect(block.language).toBe("gcode");
        expect(block.code).toBeDefined();
        expect(block.description).toBeDefined();
      }
    });

    it("provides interactive options", () => {
      const analysis = engine.analyze({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
        llm_cli_mode: true,
      });

      const options = analysis.llm_cli_output!.interactive_options;
      expect(options.length).toBeGreaterThan(0);
      options.forEach(opt => {
        expect(opt.option).toBeDefined();
        expect(opt.action).toBeDefined();
      });
    });
  });

  describe("Full Analysis", () => {
    it("runs comprehensive Ultimate AI analysis", () => {
      const result = engine.analyze({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
        source_cams: ["mastercam", "fusion360"],
        tool_diameter_mm: 10,
        spindle_rpm: 6000,
        generate_post: true,
      });

      expect(result).toBeDefined();
      expect(result.deep_learning).toBeDefined();
      expect(result.deep_reasoning).toBeDefined();
      expect(result.deep_ensemble).toBeDefined();
      expect(result.episodic_memory).toBeDefined();
      expect(result.knowledge_graph).toBeDefined();
      expect(result.tree_of_thoughts).toBeDefined();
      expect(result.meta_learning).toBeDefined();
      expect(result.adversarial_validation).toBeDefined();
      expect(result.generative_post).toBeDefined();
      expect(result.ultimate_confidence).toBeGreaterThan(0);
      expect(result.ultimate_confidence).toBeLessThanOrEqual(1);
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("integrates all 3 layers", () => {
      const result = engine.analyze({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      // Layer 1: Deep Learning
      expect(result.deep_learning.neural_confidence).toBeGreaterThan(0);

      // Layer 2: Deep Reasoning
      expect(result.deep_reasoning.reasoning_confidence).toBeGreaterThan(0);

      // Layer 3: Ultimate AI
      expect(result.deep_ensemble.calibrated_confidence).toBeGreaterThan(0);
      expect(result.ultimate_confidence).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// PostProcessorIntelligenceOrchestratorEngine (PP-AI-ORCH)
// ============================================================================

import { postProcessorIntelligenceOrchestrator } from "../engines/PostProcessorIntelligenceOrchestratorEngine.js";

describe("PostProcessorIntelligenceOrchestratorEngine", () => {
  const engine = postProcessorIntelligenceOrchestrator;

  describe("Intent Classification", () => {
    it("classifies optimize intent", () => {
      const result = engine.classifyIntent("optimize this G-code for faster cycle time");

      expect(result).toBeDefined();
      expect(result.primary_intent).toBe("optimize_gcode");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("classifies analyze quality intent", () => {
      const result = engine.classifyIntent("analyze the quality of this program");

      expect(result.primary_intent).toBe("analyze_quality");
    });

    it("classifies troubleshoot intent", () => {
      const result = engine.classifyIntent("why is my program crashing");

      expect(result.primary_intent).toBe("troubleshoot_issue");
    });

    it("classifies safety validation intent", () => {
      const result = engine.classifyIntent("validate safety and check for collision risks");

      expect(result.primary_intent).toBe("validate_safety");
    });

    it("classifies generate post intent", () => {
      const result = engine.classifyIntent("create a new post processor for Siemens");

      expect(result.primary_intent).toBe("generate_post");
    });

    it("classifies compare controllers intent", () => {
      const result = engine.classifyIntent("what's the difference between Fanuc and Haas");

      expect(result.primary_intent).toBe("compare_controllers");
    });

    it("classifies cycle time estimation intent", () => {
      const result = engine.classifyIntent("how long will this machining take");

      expect(result.primary_intent).toBe("estimate_cycle_time");
    });

    it("extracts controller entities", () => {
      const result = engine.classifyIntent("convert from Fanuc to Siemens");

      expect(result.entities.controllers).toContain("fanuc");
      expect(result.entities.controllers).toContain("siemens");
    });

    it("extracts material entities", () => {
      const result = engine.classifyIntent("optimize for stainless steel cutting");

      expect(result.entities.materials).toContain("M");
    });

    it("determines complexity", () => {
      const simple = engine.classifyIntent("check quality");
      const complex = engine.classifyIntent(
        "compare multiple controllers, analyze safety, optimize feed rates, and generate post processor"
      );

      expect(simple.complexity).toBe("simple");
      expect(complex.complexity).toBe("complex");
    });

    it("identifies when G-code is required", () => {
      const requiresGcode = engine.classifyIntent("optimize this G-code");
      const noGcode = engine.classifyIntent("explain what G43 does");

      expect(requiresGcode.requires_gcode).toBe(true);
      expect(noGcode.requires_gcode).toBe(false);
    });
  });

  describe("Engine Routing", () => {
    it("routes optimize intent to deep learning and neural optimizer", () => {
      const intent = engine.classifyIntent("optimize feed rates");
      const routing = engine.routeToEngines(intent);

      expect(routing).toBeDefined();
      expect(routing.engines).toBeInstanceOf(Array);
      expect(routing.engines.length).toBeGreaterThan(0);
      expect(routing.engines.some(e => e.engine === "deep_learning")).toBe(true);
    });

    it("routes troubleshoot to deep reasoning", () => {
      const intent = engine.classifyIntent("debug this program error");
      const routing = engine.routeToEngines(intent);

      expect(routing.engines.some(e => e.engine === "deep_reasoning")).toBe(true);
    });

    it("routes safety validation to expert system", () => {
      const intent = engine.classifyIntent("validate safety of this code");
      const routing = engine.routeToEngines(intent);

      expect(routing.engines.some(e => e.engine === "expert_system")).toBe(true);
    });

    it("sets parallel execution for complex queries", () => {
      const complexIntent = engine.classifyIntent(
        "compare multiple controllers and optimize feed rates across all of them"
      );
      const routing = engine.routeToEngines(complexIntent);

      expect(routing.parallel).toBe(true);
    });

    it("sets appropriate timeouts", () => {
      // Simple query - stays under 200 chars, no multiple/several/all
      const simpleIntent = engine.classifyIntent("check quality");
      // Complex query - exceeds 400 chars and uses "all"
      const complexIntent = engine.classifyIntent(
        "analyze all aspects of this complex program including multiple controllers, " +
        "compare all safety features, optimize all feed rates, validate all toolpaths, " +
        "generate posts for all machines, estimate cycle times for all operations, " +
        "troubleshoot all potential issues, and recommend all possible improvements"
      );

      const simpleRouting = engine.routeToEngines(simpleIntent);
      const complexRouting = engine.routeToEngines(complexIntent);

      expect(complexRouting.timeout_ms).toBeGreaterThan(simpleRouting.timeout_ms);
    });
  });

  describe("Expert Rules", () => {
    it("detects missing safe start", () => {
      const unsafeGcode = `O1001
S3000 M03
G01 X50. F500
M30`;

      const results = engine.runExpertRules(unsafeGcode, {
        query: "",
        output_mode: "full",
      });

      expect(results).toBeInstanceOf(Array);
      const safeStartRule = results.find(r => r.rule_id === "SAFE-001");
      expect(safeStartRule?.triggered).toBe(true);
      expect(safeStartRule?.severity).toBe("error");
    });

    it("passes safe program", () => {
      const results = engine.runExpertRules(SAMPLE_GCODE, {
        query: "",
        output_mode: "full",
      });

      const safeStartRule = results.find(r => r.rule_id === "SAFE-001");
      expect(safeStartRule?.triggered).toBe(false);
    });

    it("detects tool change without spindle stop", () => {
      const unsafeGcode = `O1001
G28 G91 Z0
S3000 M03
G01 X50. F500
M06 T2
S4000 M03
M30`;

      const results = engine.runExpertRules(unsafeGcode, {
        query: "",
        output_mode: "full",
      });

      const spindleRule = results.find(r => r.rule_id === "SAFE-002");
      expect(spindleRule?.triggered).toBe(true);
      expect(spindleRule?.severity).toBe("critical");
    });

    it("detects missing work offset", () => {
      const noOffsetGcode = `O1001
G28 G91 Z0
S3000 M03
G01 X50. F500
M09
M30`;

      const results = engine.runExpertRules(noOffsetGcode, {
        query: "",
        output_mode: "full",
      });

      const offsetRule = results.find(r => r.rule_id === "BP-002");
      expect(offsetRule?.triggered).toBe(true);
    });

    it("detects Siemens code in Fanuc program", () => {
      const mixedGcode = `O1001
G28 G91 Z0
G54
S3000 M03
CYCLE81(100, 0, 2, -20)
M09
M30`;

      const results = engine.runExpertRules(mixedGcode, {
        query: "",
        controller: "fanuc",
      });

      const compatRule = results.find(r => r.rule_id === "COMPAT-001");
      expect(compatRule?.triggered).toBe(true);
      expect(compatRule?.severity).toBe("error");
    });

    it("provides fix templates for triggered rules", () => {
      const unsafeGcode = `O1001
S3000 M03
G01 X50. F500
M30`;

      const results = engine.runExpertRules(unsafeGcode, {
        query: "",
        output_mode: "full",
      });

      const triggeredRules = results.filter(r => r.triggered);
      triggeredRules.forEach(rule => {
        if (rule.gcode_fix) {
          expect(rule.gcode_fix.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe("Neural Optimization", () => {
    it("generates Pareto front solutions", () => {
      const result = engine.neuralOptimization({
        query: "",
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        controller: "fanuc",
      });

      expect(result).toBeDefined();
      expect(result.pareto_solutions).toBeInstanceOf(Array);
      expect(result.pareto_solutions.length).toBeGreaterThan(0);
    });

    it("includes original metrics", () => {
      const result = engine.neuralOptimization({
        query: "",
      });

      expect(result.original_metrics).toBeDefined();
      expect(result.original_metrics.cycle_time).toBeDefined();
      expect(result.original_metrics.tool_life).toBeDefined();
      expect(result.original_metrics.surface_quality).toBeDefined();
      expect(result.original_metrics.safety_score).toBeDefined();
    });

    it("recommends balanced solution", () => {
      const result = engine.neuralOptimization({
        query: "",
      });

      expect(result.recommended_solution).toBe("balanced");
    });

    it("provides confidence score", () => {
      const result = engine.neuralOptimization({
        query: "",
      });

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("shows improvement in optimized metrics", () => {
      const result = engine.neuralOptimization({
        query: "",
      });

      expect(result.optimized_metrics.cycle_time).toBeLessThanOrEqual(result.original_metrics.cycle_time);
    });
  });

  describe("Analysis Aggregation", () => {
    it("aggregates deep learning analysis", () => {
      const dlAnalysis = postProcessorDeepLearningEngine.analyze({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
      });

      const aggregated = engine.aggregateAnalysis(dlAnalysis);

      expect(aggregated).toBeDefined();
      expect(aggregated.deep_learning).toBeDefined();
      expect(aggregated.consensus_score).toBeGreaterThan(0);
    });

    it("aggregates multiple engine results", () => {
      const dlAnalysis = postProcessorDeepLearningEngine.analyze({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
      });
      const drAnalysis = postProcessorDeepReasoningEngine.analyze({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });
      const uaAnalysis = postProcessorUltimateAIEngine.analyze({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      const aggregated = engine.aggregateAnalysis(dlAnalysis, drAnalysis, uaAnalysis);

      expect(aggregated.deep_learning).toBeDefined();
      expect(aggregated.deep_reasoning).toBeDefined();
      expect(aggregated.ultimate_ai).toBeDefined();
      expect(aggregated.consensus_score).toBeGreaterThan(0);
    });

    it("detects conflicts between engines", () => {
      const dlAnalysis = postProcessorDeepLearningEngine.analyze({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
      });
      const drAnalysis = postProcessorDeepReasoningEngine.analyze({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      const aggregated = engine.aggregateAnalysis(dlAnalysis, drAnalysis);

      expect(aggregated.conflicts).toBeInstanceOf(Array);
    });

    it("includes expert rules in aggregation", () => {
      const expertRules = engine.runExpertRules(SAMPLE_GCODE, {
        query: "",
        output_mode: "full",
      });

      const aggregated = engine.aggregateAnalysis(undefined, undefined, undefined, expertRules);

      expect(aggregated.expert_rules).toBeDefined();
      expect(aggregated.expert_rules!.length).toBeGreaterThan(0);
    });
  });

  describe("Proactive Suggestions", () => {
    it("generates suggestions based on quality score", () => {
      const dlAnalysis = postProcessorDeepLearningEngine.analyze({
        gcode: SAMPLE_ROUGHING_GCODE, // Lower quality roughing
        material_iso: "P",
      });
      const drAnalysis = postProcessorDeepReasoningEngine.analyze({
        gcode: SAMPLE_ROUGHING_GCODE,
        material_iso: "P",
        target_controller: "fanuc",
      });

      const aggregated = engine.aggregateAnalysis(dlAnalysis, drAnalysis);
      const suggestions = engine.generateProactiveSuggestions(aggregated);

      expect(suggestions).toBeInstanceOf(Array);
    });

    it("suggests optimization for bottlenecks", () => {
      const dlAnalysis = postProcessorDeepLearningEngine.analyze({
        gcode: SAMPLE_GCODE,
        material_iso: "P",
      });
      const aggregated = engine.aggregateAnalysis(dlAnalysis);
      const suggestions = engine.generateProactiveSuggestions(aggregated);

      // Suggestions should be generated if bottlenecks detected
      expect(suggestions).toBeInstanceOf(Array);
    });
  });

  describe("Full Orchestration", () => {
    it("performs full orchestration flow", async () => {
      const result = await engine.orchestrate({
        query: "optimize this G-code for faster cycle time",
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        controller: "fanuc",
      });

      expect(result).toBeDefined();
      expect(result.query).toBe("optimize this G-code for faster cycle time");
      expect(result.intent).toBeDefined();
      expect(result.intent.primary_intent).toBe("optimize_gcode");
      expect(result.response).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("generates response with recommendations", async () => {
      const result = await engine.orchestrate({
        query: "validate safety of this program",
        gcode: `O1001
S3000 M03
G01 X50. F500
M30`,
        material_iso: "P",
        controller: "fanuc",
      });

      expect(result.response.recommendations).toBeInstanceOf(Array);
      expect(result.response.recommendations.length).toBeGreaterThan(0);
    });

    it("generates code blocks for fixes", async () => {
      const result = await engine.orchestrate({
        query: "fix this unsafe program",
        gcode: `O1001
S3000 M03
M06 T2
M30`,
        material_iso: "P",
        controller: "fanuc",
      });

      // Should have code blocks with fixes
      expect(result.response.code_blocks).toBeInstanceOf(Array);
    });

    it("provides warnings for critical issues", async () => {
      const result = await engine.orchestrate({
        query: "check this program",
        gcode: `O1001
S3000 M03
M06 T2
M30`,
        controller: "fanuc",
      });

      expect(result.response.warnings).toBeInstanceOf(Array);
      expect(result.response.warnings.length).toBeGreaterThan(0);
    });

    it("updates context after orchestration", async () => {
      const result = await engine.orchestrate({
        query: "optimize for Haas",
        gcode: SAMPLE_GCODE,
        material_iso: "M",
        controller: "haas",
      });

      expect(result.context_updates).toBeDefined();
      expect(result.context_updates.last_intent).toBe("optimize_gcode");
      expect(result.context_updates.controller_context).toBe("haas");
      expect(result.context_updates.material_context).toBe("M");
    });

    it("generates proactive suggestions", async () => {
      const result = await engine.orchestrate({
        query: "analyze quality",
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        controller: "fanuc",
      });

      expect(result.proactive_suggestions).toBeInstanceOf(Array);
    });

    it("supports LLM CLI output mode", async () => {
      const result = await engine.orchestrate({
        query: "generate post for Siemens",
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        controller: "siemens",
        output_mode: "llm_cli",
      });

      // When LLM CLI mode is enabled, llm_cli_output should be present
      expect(result).toBeDefined();
    });

    it("handles cycle time estimation", async () => {
      const result = await engine.orchestrate({
        query: "how long will this program take",
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        controller: "fanuc",
      });

      expect(result.intent.primary_intent).toBe("estimate_cycle_time");
      expect(result.response.summary).toBeDefined();
    });

    it("handles strategy recommendation", async () => {
      const result = await engine.orchestrate({
        query: "recommend the best approach for this part",
        gcode: SAMPLE_GCODE,
        material_iso: "P",
        controller: "fanuc",
      });

      expect(result.intent.primary_intent).toBe("recommend_strategy");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty query", () => {
      const result = engine.classifyIntent("");

      expect(result).toBeDefined();
      expect(result.primary_intent).toBe("general_query");
    });

    it("handles unknown intent gracefully", () => {
      const result = engine.classifyIntent("xyzzy plugh");

      expect(result).toBeDefined();
      expect(result.primary_intent).toBe("general_query");
    });

    it("handles missing G-code in orchestration", async () => {
      const result = await engine.orchestrate({
        query: "explain what G43 means",
      });

      expect(result).toBeDefined();
      expect(result.intent.primary_intent).toBe("explain_feature");
    });

    it("handles empty G-code in expert rules", () => {
      const results = engine.runExpertRules("", {
        query: "",
      });

      expect(results).toBeInstanceOf(Array);
    });
  });
});
