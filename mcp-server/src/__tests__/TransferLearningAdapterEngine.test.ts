/**
 * Tests for TransferLearningAdapterEngine (MILL-AGI Phase 0.4)
 *
 * Validates domain adaptation for transfer learning:
 *   - Domain registration
 *   - Task creation
 *   - Domain similarity computation
 *   - Adaptation methods (fine-tune, reweight, align, EWC)
 *   - Feature alignment
 *   - Instance reweighting
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  TransferLearningAdapterEngine,
  transferLearningAdapterEngine,
  type DomainDescriptor,
  type AdapterConfig,
} from "../engines/TransferLearningAdapterEngine.js";

describe("TransferLearningAdapterEngine (MILL-AGI P0.4)", () => {
  let engine: TransferLearningAdapterEngine;

  beforeEach(() => {
    engine = new TransferLearningAdapterEngine();
  });

  // ============================================================================
  // TEST DATA
  // ============================================================================

  const steelDomain: DomainDescriptor = {
    id: "steel-1045",
    name: "AISI 1045 Steel",
    type: "material",
    properties: {
      hardness_hrc: 25,
      thermal_conductivity: 50,
      tensile_strength: 585,
      machinability_rating: 65,
    },
    sample_count: 1000,
  };

  const titaniumDomain: DomainDescriptor = {
    id: "ti-6al4v",
    name: "Ti-6Al-4V",
    type: "material",
    properties: {
      hardness_hrc: 36,
      thermal_conductivity: 7,
      tensile_strength: 950,
      machinability_rating: 22,
    },
    sample_count: 200,
  };

  const aluminumDomain: DomainDescriptor = {
    id: "al-6061",
    name: "6061-T6 Aluminum",
    type: "material",
    properties: {
      hardness_hrc: 15,
      thermal_conductivity: 170,
      tensile_strength: 310,
      machinability_rating: 90,
    },
    sample_count: 800,
  };

  const machine3Axis: DomainDescriptor = {
    id: "3axis-vmc",
    name: "3-Axis VMC",
    type: "machine",
    properties: {
      axes: 3,
      spindle_speed_max: 12000,
      rapid_traverse: 30,
      work_envelope: 500,
    },
    sample_count: 5000,
  };

  const machine5Axis: DomainDescriptor = {
    id: "5axis-vmc",
    name: "5-Axis VMC",
    type: "machine",
    properties: {
      axes: 5,
      spindle_speed_max: 15000,
      rapid_traverse: 40,
      work_envelope: 400,
    },
    sample_count: 1000,
  };

  const sourceData = [
    { features: [0.5, 0.3, 0.8, 0.2], label: 500 },
    { features: [0.6, 0.4, 0.7, 0.3], label: 520 },
    { features: [0.4, 0.2, 0.9, 0.1], label: 480 },
    { features: [0.7, 0.5, 0.6, 0.4], label: 550 },
    { features: [0.3, 0.1, 0.8, 0.2], label: 460 },
  ];

  const targetData = [
    { features: [0.6, 0.4, 0.7, 0.3], label: 600 },
    { features: [0.5, 0.3, 0.8, 0.2] },
    { features: [0.7, 0.5, 0.6, 0.4] },
  ];

  // ============================================================================
  // DOMAIN REGISTRATION
  // ============================================================================

  describe("domain registration", () => {
    it("registers domains", () => {
      engine.registerDomain(steelDomain);
      engine.registerDomain(titaniumDomain);

      // Domains are stored internally
      const similarity = engine.computeDomainSimilarity("steel-1045", "ti-6al4v");
      expect(similarity.feasibility).not.toBe("infeasible");
    });
  });

  // ============================================================================
  // TASK CREATION
  // ============================================================================

  describe("task creation", () => {
    it("creates transfer task", () => {
      engine.registerDomain(steelDomain);
      engine.registerDomain(titaniumDomain);

      const task = engine.createTask("steel-1045", "ti-6al4v", "force");

      expect(task.id).toContain("steel-1045");
      expect(task.id).toContain("ti-6al4v");
      expect(task.status).toBe("pending");
    });

    it("throws for unknown domain", () => {
      engine.registerDomain(steelDomain);

      expect(() => engine.createTask("steel-1045", "unknown", "force")).toThrow(
        "Domain not found"
      );
    });

    it("allows custom adaptation method", () => {
      engine.registerDomain(steelDomain);
      engine.registerDomain(titaniumDomain);

      const task = engine.createTask("steel-1045", "ti-6al4v", "force", "fine_tune");

      expect(task.adaptation_method).toBe("fine_tune");
    });

    it("tracks all tasks", () => {
      engine.registerDomain(steelDomain);
      engine.registerDomain(titaniumDomain);
      engine.registerDomain(aluminumDomain);

      engine.createTask("steel-1045", "ti-6al4v", "force");
      engine.createTask("steel-1045", "al-6061", "thermal");

      const tasks = engine.getTasks();
      expect(tasks.length).toBe(2);
    });
  });

  // ============================================================================
  // DOMAIN SIMILARITY
  // ============================================================================

  describe("domain similarity", () => {
    it("computes similarity between domains", () => {
      engine.registerDomain(steelDomain);
      engine.registerDomain(titaniumDomain);

      const sim = engine.computeDomainSimilarity("steel-1045", "ti-6al4v");

      expect(sim.similarity).toBeGreaterThan(0);
      expect(sim.similarity).toBeLessThanOrEqual(1);
    });

    it("identifies shared properties", () => {
      engine.registerDomain(steelDomain);
      engine.registerDomain(titaniumDomain);

      const sim = engine.computeDomainSimilarity("steel-1045", "ti-6al4v");

      expect(sim.shared_properties).toContain("hardness_hrc");
      expect(sim.shared_properties).toContain("thermal_conductivity");
    });

    it("identifies divergent properties", () => {
      engine.registerDomain(steelDomain);
      engine.registerDomain(titaniumDomain);

      const sim = engine.computeDomainSimilarity("steel-1045", "ti-6al4v");

      // Properties with large differences
      expect(sim.divergent_properties.length).toBeGreaterThan(0);
    });

    it("categorizes transfer feasibility", () => {
      engine.registerDomain(steelDomain);
      engine.registerDomain(aluminumDomain);

      const sim = engine.computeDomainSimilarity("steel-1045", "al-6061");

      expect(["high", "medium", "low", "infeasible"]).toContain(sim.feasibility);
    });

    it("returns infeasible for unknown domains", () => {
      const sim = engine.computeDomainSimilarity("unknown1", "unknown2");

      expect(sim.feasibility).toBe("infeasible");
      expect(sim.similarity).toBe(0);
    });
  });

  // ============================================================================
  // ADAPTATION
  // ============================================================================

  describe("adaptation", () => {
    it("runs fine-tune adaptation", () => {
      const ftEngine = new TransferLearningAdapterEngine({ adaptation_method: "fine_tune" });
      ftEngine.registerDomain(steelDomain);
      ftEngine.registerDomain(titaniumDomain);

      const task = ftEngine.createTask("steel-1045", "ti-6al4v", "force", "fine_tune");
      const result = ftEngine.adapt(task.id, sourceData, targetData);

      expect(result.task_id).toBe(task.id);
      expect(result.transfer_gain).toBeDefined();
    });

    it("runs reweight adaptation", () => {
      const rwEngine = new TransferLearningAdapterEngine({ adaptation_method: "reweight" });
      rwEngine.registerDomain(steelDomain);
      rwEngine.registerDomain(titaniumDomain);

      const task = rwEngine.createTask("steel-1045", "ti-6al4v", "force", "reweight");
      const result = rwEngine.adapt(task.id, sourceData, targetData);

      expect(result.adaptation_epochs).toBe(1); // Reweighting is single-pass
    });

    it("runs alignment adaptation", () => {
      const alEngine = new TransferLearningAdapterEngine({ adaptation_method: "align" });
      alEngine.registerDomain(steelDomain);
      alEngine.registerDomain(titaniumDomain);

      const task = alEngine.createTask("steel-1045", "ti-6al4v", "force", "align");
      const result = alEngine.adapt(task.id, sourceData, targetData);

      expect(result.aligned_features).toBeDefined();
    });

    it("runs EWC adaptation", () => {
      engine.registerDomain(steelDomain);
      engine.registerDomain(titaniumDomain);

      const task = engine.createTask("steel-1045", "ti-6al4v", "force", "ewc");
      const result = engine.adapt(task.id, sourceData, targetData);

      expect(result.ewc_lambda).toBeDefined();
      expect(result.ewc_lambda).toBe(1000); // Default
    });

    it("updates task status", () => {
      engine.registerDomain(steelDomain);
      engine.registerDomain(titaniumDomain);

      const task = engine.createTask("steel-1045", "ti-6al4v", "force");
      engine.adapt(task.id, sourceData, targetData);

      const updatedTask = engine.getTasks().find((t) => t.id === task.id);
      expect(["completed", "failed"]).toContain(updatedTask!.status);
    });

    it("throws for unknown task", () => {
      expect(() => engine.adapt("unknown", sourceData, targetData)).toThrow(
        "Task not found"
      );
    });
  });

  // ============================================================================
  // FEATURE ALIGNMENT
  // ============================================================================

  describe("feature alignment", () => {
    it("maps matching feature names", () => {
      const alignment = engine.computeFeatureAlignment(
        ["cutting_speed", "feed_rate", "depth"],
        ["cutting_speed", "feed_rate", "axial_depth"]
      );

      expect(alignment.mapping.get("cutting_speed")).toBe("cutting_speed");
      expect(alignment.mapping.get("feed_rate")).toBe("feed_rate");
    });

    it("matches similar feature names", () => {
      const alignment = engine.computeFeatureAlignment(
        ["cutting_speed_mpm", "feed_per_tooth"],
        ["speed_mpm", "tooth_feed"]
      );

      // Should find partial matches
      expect(alignment.mapping.size).toBeGreaterThan(0);
    });

    it("computes alignment score", () => {
      const alignment = engine.computeFeatureAlignment(
        ["cutting_speed", "feed_rate"],
        ["cutting_speed", "feed_rate"]
      );

      expect(alignment.alignment_score).toBe(1);
    });

    it("handles no matches", () => {
      const alignment = engine.computeFeatureAlignment(
        ["alpha", "beta", "gamma"],
        ["one", "two", "three"]
      );

      expect(alignment.alignment_score).toBe(0);
    });
  });

  // ============================================================================
  // INSTANCE WEIGHTING
  // ============================================================================

  describe("instance weighting", () => {
    it("computes instance weights", () => {
      const weights = engine.computeInstanceWeights(sourceData, targetData);

      expect(weights.length).toBe(sourceData.length);
    });

    it("weights sum to sample count", () => {
      const weights = engine.computeInstanceWeights(sourceData, targetData);
      const sum = weights.reduce((a, b) => a + b, 0);

      expect(sum).toBeCloseTo(sourceData.length, 1);
    });

    it("higher weight for target-like samples", () => {
      // Source data with one point very similar to target
      const source = [
        { features: [0.6, 0.4, 0.7, 0.3] }, // Similar to target[0]
        { features: [0.1, 0.9, 0.2, 0.8] }, // Very different
      ];
      const target = [{ features: [0.6, 0.4, 0.7, 0.3] }];

      const weights = engine.computeInstanceWeights(source, target);

      expect(weights[0]).toBeGreaterThan(weights[1]);
    });

    it("returns empty for empty source", () => {
      const weights = engine.computeInstanceWeights([], targetData);

      expect(weights.length).toBe(0);
    });
  });

  // ============================================================================
  // RESULTS
  // ============================================================================

  describe("results", () => {
    it("stores adaptation results", () => {
      engine.registerDomain(steelDomain);
      engine.registerDomain(titaniumDomain);

      const task = engine.createTask("steel-1045", "ti-6al4v", "force");
      engine.adapt(task.id, sourceData, targetData);

      const result = engine.getResult(task.id);
      expect(result).not.toBeNull();
    });

    it("returns null for unknown task", () => {
      const result = engine.getResult("unknown");
      expect(result).toBeNull();
    });

    it("retrieves all results", () => {
      engine.registerDomain(steelDomain);
      engine.registerDomain(titaniumDomain);
      engine.registerDomain(aluminumDomain);

      const task1 = engine.createTask("steel-1045", "ti-6al4v", "force");
      const task2 = engine.createTask("steel-1045", "al-6061", "thermal");

      engine.adapt(task1.id, sourceData, targetData);
      engine.adapt(task2.id, sourceData, targetData);

      const results = engine.getAllResults();
      expect(results.length).toBe(2);
    });
  });

  // ============================================================================
  // STATISTICS
  // ============================================================================

  describe("statistics", () => {
    it("returns transfer statistics", () => {
      engine.registerDomain(steelDomain);
      engine.registerDomain(titaniumDomain);

      const task = engine.createTask("steel-1045", "ti-6al4v", "force");
      engine.adapt(task.id, sourceData, targetData);

      const stats = engine.getStatistics();

      expect(stats.total_tasks).toBe(1);
      expect(stats.completed + stats.failed).toBe(1);
      expect(stats.avg_transfer_gain).toBeDefined();
    });

    it("tracks negative transfer rate", () => {
      engine.registerDomain(steelDomain);
      engine.registerDomain(titaniumDomain);

      const task = engine.createTask("steel-1045", "ti-6al4v", "force");
      engine.adapt(task.id, sourceData, targetData);

      const stats = engine.getStatistics();

      expect(stats.negative_transfer_rate).toBeGreaterThanOrEqual(0);
      expect(stats.negative_transfer_rate).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // RESET
  // ============================================================================

  describe("reset", () => {
    it("clears tasks and results", () => {
      engine.registerDomain(steelDomain);
      engine.registerDomain(titaniumDomain);

      const task = engine.createTask("steel-1045", "ti-6al4v", "force");
      engine.adapt(task.id, sourceData, targetData);

      engine.reset();

      expect(engine.getTasks().length).toBe(0);
      expect(engine.getAllResults().length).toBe(0);
    });
  });

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  describe("configuration", () => {
    it("returns config", () => {
      const config = engine.getConfig();

      expect(config.adaptation_method).toBeDefined();
      expect(config.ewc_lambda).toBeDefined();
    });

    it("applies custom EWC lambda", () => {
      const customEngine = new TransferLearningAdapterEngine({ ewc_lambda: 500 });

      expect(customEngine.getConfig().ewc_lambda).toBe(500);
    });

    it("applies custom learning rate", () => {
      const customEngine = new TransferLearningAdapterEngine({ learning_rate: 0.01 });

      expect(customEngine.getConfig().learning_rate).toBe(0.01);
    });
  });

  // ============================================================================
  // SINGLETON
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(transferLearningAdapterEngine).toBeDefined();
      expect(transferLearningAdapterEngine).toBeInstanceOf(TransferLearningAdapterEngine);
    });
  });
});
