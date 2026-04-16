/**
 * LatheMetaLearningEngine Tests
 * ==============================
 * Comprehensive tests for meta-learning algorithms:
 *   - MAML training and adaptation
 *   - Prototypical networks
 *   - Metric learning (triplet loss)
 *   - Few-shot material adaptation
 *   - Task distribution creation
 *   - Controller dialect adaptation
 *   - Shop pattern transfer
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LatheMetaLearningEngine,
  latheMetaLearningEngine,
  type LatheExample,
  type MetaLearningTask,
  type PrototypicalEpisode,
  type NewMaterialSpec,
  type ControllerAdaptationRequest,
  type ShopPatternTransferRequest,
  type MAMLConfig,
  type PrototypicalConfig,
  type MetricLearningConfig,
} from "../../engines/LatheMetaLearningEngine.js";

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

function generateLatheExample(overrides: Partial<LatheExample> = {}): LatheExample {
  return {
    example_id: `ex_${Math.random().toString(36).slice(2, 8)}`,
    material_iso: "P",
    material_name: "1045 Carbon Steel",
    hardness_hrc: 25,
    kc1_1_N_mm2: 1800,
    machinability_factor: 1.0,
    operation_type: "rough_od",
    tool_type: "CNMG",
    tool_nose_radius_mm: 0.8,
    diameter_mm: 50,
    length_mm: 100,
    wall_thickness_mm: 10,
    cutting_speed_m_min: 180,
    feed_mm_rev: 0.25,
    depth_of_cut_mm: 2.0,
    surface_finish_ra: 3.2,
    tool_life_min: 45,
    cycle_time_sec: 120,
    quality_score: 0.85,
    quality_class: "good",
    strategy_class: "balanced",
    ...overrides,
  };
}

function generateExamplesForMaterial(
  material_iso: LatheExample["material_iso"],
  count: number
): LatheExample[] {
  const materialConfigs: Record<string, Partial<LatheExample>> = {
    P: { material_name: "1045 Steel", kc1_1_N_mm2: 1800, hardness_hrc: 25, cutting_speed_m_min: 180 },
    M: { material_name: "304 Stainless", kc1_1_N_mm2: 2100, hardness_hrc: 20, cutting_speed_m_min: 120 },
    K: { material_name: "Gray Cast Iron", kc1_1_N_mm2: 1100, hardness_hrc: 22, cutting_speed_m_min: 250 },
    N: { material_name: "6061 Aluminum", kc1_1_N_mm2: 700, hardness_hrc: 10, cutting_speed_m_min: 400 },
    S: { material_name: "Ti-6Al-4V", kc1_1_N_mm2: 2800, hardness_hrc: 36, cutting_speed_m_min: 50 },
    H: { material_name: "D2 Tool Steel", kc1_1_N_mm2: 3200, hardness_hrc: 58, cutting_speed_m_min: 80 },
  };

  const config = materialConfigs[material_iso] || {};
  return Array.from({ length: count }, (_, i) =>
    generateLatheExample({
      ...config,
      material_iso,
      example_id: `ex_${material_iso}_${i}`,
      cutting_speed_m_min: (config.cutting_speed_m_min || 180) * (0.9 + Math.random() * 0.2),
      feed_mm_rev: 0.2 + Math.random() * 0.1,
      depth_of_cut_mm: 1.5 + Math.random() * 1.0,
    })
  );
}

function generateMetaLearningTask(taskId: string): MetaLearningTask {
  const supportMaterials = ["P", "M"] as const;
  const supportSet: LatheExample[] = [];
  const querySet: LatheExample[] = [];

  for (const mat of supportMaterials) {
    supportSet.push(...generateExamplesForMaterial(mat, 3));
    querySet.push(...generateExamplesForMaterial(mat, 2));
  }

  return {
    task_id: taskId,
    task_type: "material_adaptation",
    support_set: supportSet,
    query_set: querySet,
    task_metadata: {
      source_domain: "P",
      target_domain: "M",
      n_support: supportSet.length,
      n_query: querySet.length,
      difficulty: "medium",
      similarity_to_base: 0.8,
    },
  };
}

function generatePrototypicalEpisode(episodeId: string): PrototypicalEpisode {
  const classLabels = ["P", "M", "K"];
  const supportSet: LatheExample[] = [];
  const querySet: LatheExample[] = [];

  for (const label of classLabels) {
    supportSet.push(...generateExamplesForMaterial(label as LatheExample["material_iso"], 5));
    querySet.push(...generateExamplesForMaterial(label as LatheExample["material_iso"], 3));
  }

  return {
    episode_id: episodeId,
    n_way: 3,
    k_shot: 5,
    q_query: 3,
    support_set: supportSet,
    query_set: querySet,
    class_labels: classLabels,
    task_type: "material_adaptation",
  };
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("LatheMetaLearningEngine", () => {
  let engine: LatheMetaLearningEngine;

  beforeEach(() => {
    engine = new LatheMetaLearningEngine();
  });

  // ========================================================================
  // INITIALIZATION TESTS
  // ========================================================================

  describe("Initialization", () => {
    it("should create engine with default configurations", () => {
      expect(engine).toBeDefined();
      const status = engine.getModelStatus();
      expect(status.maml_trained).toBe(false);
      expect(status.proto_trained).toBe(false);
      expect(status.metric_trained).toBe(false);
      expect(status.n_prototypes).toBe(0);
    });

    it("should update MAML configuration", () => {
      const customConfig: Partial<MAMLConfig> = {
        inner_lr: 0.02,
        outer_lr: 0.002,
        inner_steps: 10,
      };
      engine.setMAMLConfig(customConfig);
      // Config update should not throw
      expect(engine).toBeDefined();
    });

    it("should update Prototypical configuration", () => {
      const customConfig: Partial<PrototypicalConfig> = {
        embedding_dim: 128,
        distance_metric: "cosine",
      };
      engine.setPrototypicalConfig(customConfig);
      expect(engine).toBeDefined();
    });

    it("should update Metric Learning configuration", () => {
      const customConfig: Partial<MetricLearningConfig> = {
        margin: 0.3,
        mining_strategy: "hard",
      };
      engine.setMetricConfig(customConfig);
      expect(engine).toBeDefined();
    });

    it("should reset all trained models", () => {
      engine.reset();
      const status = engine.getModelStatus();
      expect(status.maml_trained).toBe(false);
      expect(status.proto_trained).toBe(false);
      expect(status.metric_trained).toBe(false);
    });
  });

  // ========================================================================
  // MAML TESTS
  // ========================================================================

  describe("MAML (Model-Agnostic Meta-Learning)", () => {
    it("should train MAML model on task distribution", () => {
      const tasks = Array.from({ length: 4 }, (_, i) =>
        generateMetaLearningTask(`task_${i}`)
      );

      const result = engine.mamlTrain(tasks, {
        meta_epochs: 2,  // Reduced for test speed
        inner_steps: 1,
        task_batch_size: 2,
        hidden_dims: [32, 16],  // Smaller network
      });

      expect(result.model_state).toBeDefined();
      expect(result.model_state.theta).toBeDefined();
      expect(result.model_state.theta.length).toBeGreaterThan(0);
      expect(result.meta_train_losses.length).toBe(2);
      expect(result.total_tasks_trained).toBeGreaterThan(0);
    });

    it("should compute convergence analysis", () => {
      const tasks = Array.from({ length: 4 }, (_, i) =>
        generateMetaLearningTask(`task_${i}`)
      );

      const result = engine.mamlTrain(tasks, {
        meta_epochs: 3,
        inner_steps: 1,
        hidden_dims: [32, 16],
      });

      expect(result.convergence_analysis).toBeDefined();
      expect(typeof result.convergence_analysis.converged).toBe("boolean");
      expect(typeof result.convergence_analysis.stability_score).toBe("number");
    });

    it("should compute average adaptation improvement", () => {
      const tasks = Array.from({ length: 3 }, (_, i) =>
        generateMetaLearningTask(`task_${i}`)
      );

      const result = engine.mamlTrain(tasks, {
        meta_epochs: 2,
        inner_steps: 1,
        hidden_dims: [32, 16],
      });

      expect(result.average_adaptation_improvement).toBeGreaterThanOrEqual(0);
      expect(result.average_adaptation_improvement).toBeLessThanOrEqual(1);
    });

    it("should support first-order approximation (FOMAML)", () => {
      const tasks = Array.from({ length: 3 }, (_, i) =>
        generateMetaLearningTask(`task_${i}`)
      );

      const result = engine.mamlTrain(tasks, {
        meta_epochs: 2,
        use_first_order: true,
        hidden_dims: [32, 16],
      });

      expect(result.model_state).toBeDefined();
      expect(result.meta_train_losses.length).toBe(2);
    });
  });

  // ========================================================================
  // MATERIAL ADAPTATION TESTS
  // ========================================================================

  describe("Material Adaptation", () => {
    beforeEach(() => {
      // Train MAML model first (minimal config for speed)
      const tasks = Array.from({ length: 3 }, (_, i) =>
        generateMetaLearningTask(`task_${i}`)
      );
      engine.mamlTrain(tasks, { meta_epochs: 2, inner_steps: 1, hidden_dims: [32, 16] });
    });

    it("should adapt to new material with 1-shot learning", () => {
      const newMaterial: NewMaterialSpec = {
        material_name: "Custom Alloy XYZ",
        material_code: "XYZ-001",
        iso_group: "M",
        measured_hardness_hrc: 28,
      };

      const examples = generateExamplesForMaterial("M", 1);
      const result = engine.adaptToMaterial(newMaterial, examples);

      expect(result.material_code).toBe("XYZ-001");
      expect(result.inferred_parameters).toBeDefined();
      expect(result.inferred_parameters.kc1_1_N_mm2).toBeGreaterThan(0);
      expect(result.operation_recommendations.length).toBeGreaterThan(0);
      expect(result.confidence_scores).toBeDefined();
    });

    it("should adapt to new material with 5-shot learning", () => {
      const newMaterial: NewMaterialSpec = {
        material_name: "Inconel 718",
        material_code: "IN718",
        iso_group: "S",
        measured_hardness_hrc: 40,
      };

      const examples = generateExamplesForMaterial("S", 5);
      const result = engine.adaptToMaterial(newMaterial, examples);

      expect(result.inferred_parameters.kc1_1_N_mm2).toBeGreaterThan(2000);
      expect(result.similar_material_used).toContain("Ti");
      expect(result.confidence_scores["cutting_speed"]).toBeGreaterThan(0.5);
    });

    it("should provide uncertainty estimates", () => {
      const newMaterial: NewMaterialSpec = {
        material_name: "Test Steel",
        material_code: "TS-001",
        iso_group: "P",
      };

      const examples = generateExamplesForMaterial("P", 5);
      const result = engine.adaptToMaterial(newMaterial, examples);

      expect(result.uncertainty_estimates.length).toBeGreaterThan(0);
      const kc1_1_estimate = result.uncertainty_estimates.find(u => u.parameter === "kc1_1");
      expect(kc1_1_estimate).toBeDefined();
      expect(kc1_1_estimate!.std_dev).toBeGreaterThanOrEqual(0);
      // Confidence interval should exist and be valid (lower bound <= mean <= upper bound)
      expect(kc1_1_estimate!.confidence_interval_95[0]).toBeLessThanOrEqual(kc1_1_estimate!.mean_value);
      expect(kc1_1_estimate!.confidence_interval_95[1]).toBeGreaterThanOrEqual(kc1_1_estimate!.mean_value);
    });

    it("should generate operation-specific recommendations", () => {
      const newMaterial: NewMaterialSpec = {
        material_name: "Test Steel",
        material_code: "TS-002",
        iso_group: "P",
      };

      const examples = generateExamplesForMaterial("P", 3);
      const result = engine.adaptToMaterial(newMaterial, examples);

      expect(result.operation_recommendations.length).toBe(5);

      const roughing = result.operation_recommendations.find(r => r.operation === "rough_od");
      const finishing = result.operation_recommendations.find(r => r.operation === "finish_od");

      expect(roughing).toBeDefined();
      expect(finishing).toBeDefined();
      expect(roughing!.cutting_speed_m_min).toBeLessThan(finishing!.cutting_speed_m_min);
      expect(roughing!.feed_mm_rev).toBeGreaterThan(finishing!.feed_mm_rev);
    });

    it("should throw error if MAML not trained", () => {
      const freshEngine = new LatheMetaLearningEngine();
      const newMaterial: NewMaterialSpec = {
        material_name: "Test",
        material_code: "TEST",
        iso_group: "P",
      };

      expect(() =>
        freshEngine.adaptToMaterial(newMaterial, [generateLatheExample()])
      ).toThrow("MAML model not trained");
    });
  });

  // ========================================================================
  // PROTOTYPICAL NETWORKS TESTS
  // ========================================================================

  describe("Prototypical Networks", () => {
    it("should train prototypical network on episodes", () => {
      const episodes = Array.from({ length: 3 }, (_, i) =>
        generatePrototypicalEpisode(`episode_${i}`)
      );

      const result = engine.trainPrototypicalNetwork(episodes, {
        embedding_dim: 16,
        encoder_dims: [32, 24],
      });

      expect(result.encoder_weights).toBeDefined();
      expect(result.encoder_weights.length).toBeGreaterThan(0);
      expect(result.training_accuracy.length).toBeGreaterThan(0);
      expect(result.best_accuracy).toBeGreaterThan(0);
    });

    it("should compute embedding quality metrics", () => {
      const episodes = Array.from({ length: 3 }, (_, i) =>
        generatePrototypicalEpisode(`episode_${i}`)
      );

      const result = engine.trainPrototypicalNetwork(episodes, {
        embedding_dim: 16,
        encoder_dims: [32, 24],
      });

      expect(result.embedding_quality).toBeDefined();
      expect(result.embedding_quality.silhouette_score).toBeDefined();
      expect(result.embedding_quality.intra_class_variance).toBeGreaterThanOrEqual(0);
      expect(result.embedding_quality.inter_class_distance).toBeGreaterThanOrEqual(0);
    });

    it("should perform few-shot prediction after training", () => {
      const episodes = Array.from({ length: 3 }, (_, i) =>
        generatePrototypicalEpisode(`episode_${i}`)
      );

      engine.trainPrototypicalNetwork(episodes, {
        embedding_dim: 16,
        encoder_dims: [32, 24],
      });

      const supportSet = [
        ...generateExamplesForMaterial("P", 3),
        ...generateExamplesForMaterial("M", 3),
      ];
      const query = generateLatheExample({ material_iso: "P" });

      const prediction = engine.fewShotPredict(query, supportSet);

      expect(prediction.predicted_class).toBeDefined();
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(prediction.class_probabilities.size).toBeGreaterThan(0);
      expect(prediction.nearest_support_examples.length).toBeGreaterThan(0);
    });

    it("should support different distance metrics", () => {
      const episodes = Array.from({ length: 2 }, (_, i) =>
        generatePrototypicalEpisode(`episode_${i}`)
      );

      // Test with Euclidean
      const resultEuclid = engine.trainPrototypicalNetwork(episodes, {
        distance_metric: "euclidean",
        embedding_dim: 16,
        encoder_dims: [32, 24],
      });
      expect(resultEuclid.encoder_weights).toBeDefined();

      // Test with cosine
      engine.reset();
      const resultCosine = engine.trainPrototypicalNetwork(episodes, {
        distance_metric: "cosine",
        embedding_dim: 16,
        encoder_dims: [32, 24],
      });
      expect(resultCosine.encoder_weights).toBeDefined();
    });

    it("should throw error if network not trained for prediction", () => {
      const freshEngine = new LatheMetaLearningEngine();
      const supportSet = generateExamplesForMaterial("P", 3);
      const query = generateLatheExample();

      expect(() =>
        freshEngine.fewShotPredict(query, supportSet)
      ).toThrow("Prototypical network not trained");
    });
  });

  // ========================================================================
  // METRIC LEARNING TESTS
  // ========================================================================

  describe("Metric Learning", () => {
    it("should learn embedding with triplet loss", () => {
      const data = [
        ...generateExamplesForMaterial("P", 5),
        ...generateExamplesForMaterial("M", 5),
        ...generateExamplesForMaterial("K", 5),
      ];

      const model = engine.learnEmbedding(data, {
        epochs: 3,
        batch_size: 8,
        margin: 0.2,
        embedding_dim: 32,
      });

      expect(model.encoder_weights).toBeDefined();
      expect(model.embedding_dim).toBe(32);
      expect(model.training_loss_history.length).toBe(3);
      expect(model.class_centers).toBeDefined();
      expect(model.class_centers!.size).toBeGreaterThan(0);
    });

    it("should compute similarity between examples", () => {
      const data = [
        ...generateExamplesForMaterial("P", 5),
        ...generateExamplesForMaterial("M", 5),
      ];

      engine.learnEmbedding(data, { epochs: 2, embedding_dim: 32 });

      const exampleA = generateLatheExample({ material_iso: "P" });
      const exampleB = generateLatheExample({ material_iso: "P" });

      const simAB = engine.computeSimilarity(exampleA, exampleB);

      expect(simAB.similarity).toBeGreaterThan(0);
      expect(simAB.similarity).toBeLessThanOrEqual(1);
      expect(simAB.interpretation).toBeDefined();
      expect(simAB.embedding_a.length).toBe(32);
      expect(simAB.embedding_b.length).toBe(32);
    });

    it("should support semi-hard negative mining", () => {
      const data = [
        ...generateExamplesForMaterial("P", 5),
        ...generateExamplesForMaterial("M", 5),
      ];

      const model = engine.learnEmbedding(data, {
        epochs: 2,
        mining_strategy: "semi_hard",
        embedding_dim: 32,
      });

      expect(model.training_loss_history.length).toBe(2);
    });

    it("should throw error if not trained for similarity", () => {
      const freshEngine = new LatheMetaLearningEngine();
      const exampleA = generateLatheExample();
      const exampleB = generateLatheExample();

      expect(() =>
        freshEngine.computeSimilarity(exampleA, exampleB)
      ).toThrow("Metric learning model not trained");
    });
  });

  // ========================================================================
  // TASK DISTRIBUTION TESTS
  // ========================================================================

  describe("Task Distribution", () => {
    it("should create material adaptation task distribution", () => {
      const examples = [
        ...generateExamplesForMaterial("P", 20),
        ...generateExamplesForMaterial("M", 20),
        ...generateExamplesForMaterial("K", 20),
      ];

      const distribution = engine.createTaskDistribution(
        examples,
        "material_adaptation",
        10
      );

      expect(distribution.distribution_id).toContain("material_adaptation");
      expect(distribution.n_tasks).toBe(10);
      expect(distribution.tasks.length).toBe(10);
      expect(distribution.statistics).toBeDefined();
      expect(distribution.statistics.mean_support_size).toBeGreaterThan(0);
    });

    it("should create operation learning task distribution", () => {
      const examples = [
        ...generateExamplesForMaterial("P", 15).map((e, i) => ({
          ...e,
          operation_type: i % 2 === 0 ? "rough_od" : "finish_od" as const,
        })),
        ...generateExamplesForMaterial("M", 15).map((e, i) => ({
          ...e,
          operation_type: i % 2 === 0 ? "threading_od" : "grooving" as const,
        })),
      ];

      const distribution = engine.createTaskDistribution(
        examples,
        "operation_learning",
        5
      );

      expect(distribution.task_type).toBe("operation_learning");
      expect(distribution.tasks.length).toBe(5);
    });

    it("should compute task statistics", () => {
      const examples = [
        ...generateExamplesForMaterial("P", 30),
        ...generateExamplesForMaterial("M", 30),
      ];

      const distribution = engine.createTaskDistribution(
        examples,
        "material_adaptation",
        8
      );

      const stats = distribution.statistics;
      expect(stats.class_balance).toBeGreaterThan(0);
      expect(stats.class_balance).toBeLessThanOrEqual(1);
      expect(stats.task_diversity).toBeGreaterThan(0);
      expect(stats.difficulty_distribution).toBeDefined();
    });
  });

  // ========================================================================
  // CONTROLLER DIALECT ADAPTATION TESTS
  // ========================================================================

  describe("Controller Dialect Adaptation", () => {
    it("should learn translation rules from examples", () => {
      const request: ControllerAdaptationRequest = {
        source_controller: "Fanuc",
        target_controller: "Okuma OSP",
        example_programs: [
          {
            source_gcode: "G96 S200 M3",
            target_gcode: "G96 S200 M03",
            operation_type: "rough_od",
          },
          {
            source_gcode: "G0 X50 Z5",
            target_gcode: "G00 X50. Z5.",
            operation_type: "rough_od",
          },
          {
            source_gcode: "G1 X30 F0.2",
            target_gcode: "G01 X30. F.2",
            operation_type: "finish_od",
          },
        ],
      };

      const result = engine.adaptControllerDialect(request);

      expect(result.translation_rules.length).toBeGreaterThanOrEqual(0);
      expect(result.learned_patterns.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.test_translations.length).toBe(3);
    });

    it("should incorporate dialect hints", () => {
      const request: ControllerAdaptationRequest = {
        source_controller: "Haas",
        target_controller: "Mazak",
        example_programs: [
          {
            source_gcode: "G71 P10 Q20 D0.1",
            target_gcode: "G71 U0.1 W0.05 P10 Q20",
            operation_type: "rough_od",
          },
        ],
        dialect_hints: [
          {
            feature: "rough_cycle",
            source_syntax: "G71 P Q D",
            target_syntax: "G71 U W P Q",
          },
        ],
      };

      const result = engine.adaptControllerDialect(request);

      expect(result.translation_rules.some(r => r.priority >= 10)).toBe(true);
    });
  });

  // ========================================================================
  // SHOP PATTERN TRANSFER TESTS
  // ========================================================================

  describe("Shop Pattern Transfer", () => {
    it("should transfer patterns between shops", () => {
      const request: ShopPatternTransferRequest = {
        source_shop_id: "shop_A",
        target_shop_id: "shop_B",
        part_families: ["bolts", "pins", "bushings"],
        n_examples_per_family: 5,
      };

      const result = engine.transferShopPatterns(request);

      expect(result.transferred_patterns.length).toBeGreaterThan(0);
      expect(result.compatibility_score).toBeGreaterThan(0);
      expect(result.compatibility_score).toBeLessThanOrEqual(1);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should identify adaptation requirements", () => {
      const request: ShopPatternTransferRequest = {
        source_shop_id: "large_shop",
        target_shop_id: "small_shop",
        part_families: ["precision_parts"],
        n_examples_per_family: 3,
      };

      const result = engine.transferShopPatterns(request);

      expect(result.adaptation_required.length).toBeGreaterThan(0);
      const machineLimit = result.adaptation_required.find(
        a => a.area === "machine_limits"
      );
      expect(machineLimit).toBeDefined();
      expect(machineLimit!.priority).toBe("high");
    });

    it("should transfer speed/feed and tool selection patterns", () => {
      const request: ShopPatternTransferRequest = {
        source_shop_id: "source",
        target_shop_id: "target",
        part_families: ["shafts"],
        n_examples_per_family: 5,
      };

      const result = engine.transferShopPatterns(request);

      const speedFeedPatterns = result.transferred_patterns.filter(
        p => p.pattern_type === "speed_feed"
      );
      const toolPatterns = result.transferred_patterns.filter(
        p => p.pattern_type === "tool_selection"
      );

      expect(speedFeedPatterns.length).toBeGreaterThan(0);
      expect(toolPatterns.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // INTEGRATION TESTS
  // ========================================================================

  describe("Integration", () => {
    it("should work with singleton export", () => {
      expect(latheMetaLearningEngine).toBeDefined();
      expect(latheMetaLearningEngine).toBeInstanceOf(LatheMetaLearningEngine);
    });

    it("should handle full meta-learning pipeline", () => {
      // 1. Create task distribution
      const examples = [
        ...generateExamplesForMaterial("P", 10),
        ...generateExamplesForMaterial("M", 10),
      ];

      const distribution = engine.createTaskDistribution(
        examples,
        "material_adaptation",
        4
      );

      // 2. Train MAML
      const mamlResult = engine.mamlTrain(distribution.tasks, {
        meta_epochs: 2,
        inner_steps: 1,
        hidden_dims: [32, 16],
      });

      expect(mamlResult.model_state).toBeDefined();

      // 3. Adapt to new material
      const newMaterial: NewMaterialSpec = {
        material_name: "New Alloy",
        material_code: "NA-001",
        iso_group: "M",
        measured_hardness_hrc: 32,
      };

      const adaptResult = engine.adaptToMaterial(
        newMaterial,
        generateExamplesForMaterial("M", 3)
      );

      expect(adaptResult.inferred_parameters).toBeDefined();
      expect(adaptResult.operation_recommendations.length).toBeGreaterThan(0);
    });

    it("should combine prototypical and metric learning", () => {
      // Train prototypical network
      const episodes = Array.from({ length: 2 }, (_, i) =>
        generatePrototypicalEpisode(`episode_${i}`)
      );
      engine.trainPrototypicalNetwork(episodes, { embedding_dim: 16, encoder_dims: [32, 24] });

      // Train metric learning
      const data = [
        ...generateExamplesForMaterial("P", 5),
        ...generateExamplesForMaterial("M", 5),
      ];
      engine.learnEmbedding(data, { epochs: 2, embedding_dim: 16 });

      const status = engine.getModelStatus();
      expect(status.proto_trained).toBe(true);
      expect(status.metric_trained).toBe(true);
    });
  });

  // ========================================================================
  // EDGE CASE TESTS
  // ========================================================================

  describe("Edge Cases", () => {
    it("should handle empty task batch", () => {
      const result = engine.mamlTrain([], { meta_epochs: 1, hidden_dims: [32, 16] });
      expect(result.total_tasks_trained).toBe(0);
    });

    it("should handle single example adaptation", () => {
      const tasks = Array.from({ length: 2 }, (_, i) =>
        generateMetaLearningTask(`task_${i}`)
      );
      engine.mamlTrain(tasks, { meta_epochs: 2, hidden_dims: [32, 16] });

      const newMaterial: NewMaterialSpec = {
        material_name: "Single Example Test",
        material_code: "SET-001",
        iso_group: "P",
      };

      const result = engine.adaptToMaterial(newMaterial, [generateLatheExample()]);
      expect(result.inferred_parameters).toBeDefined();
    });

    it("should handle materials with extreme hardness", () => {
      const tasks = Array.from({ length: 2 }, (_, i) =>
        generateMetaLearningTask(`task_${i}`)
      );
      engine.mamlTrain(tasks, { meta_epochs: 2, hidden_dims: [32, 16] });

      const hardMaterial: NewMaterialSpec = {
        material_name: "Extreme Hard Steel",
        material_code: "EHS-001",
        iso_group: "H",
        measured_hardness_hrc: 65,
      };

      const examples = generateExamplesForMaterial("H", 3).map(e => ({
        ...e,
        hardness_hrc: 65,
        cutting_speed_m_min: 50,
      }));

      const result = engine.adaptToMaterial(hardMaterial, examples);
      expect(result.inferred_parameters.recommended_vc_roughing).toBeLessThan(100);
    });

    it("should handle repeated reset cycles", () => {
      for (let i = 0; i < 2; i++) {
        const tasks = Array.from({ length: 2 }, (_, j) =>
          generateMetaLearningTask(`task_${j}`)
        );
        engine.mamlTrain(tasks, { meta_epochs: 1, hidden_dims: [32, 16] });
        engine.reset();
      }

      const status = engine.getModelStatus();
      expect(status.maml_trained).toBe(false);
    });
  });
});
