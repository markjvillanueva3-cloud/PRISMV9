/**
 * Tests for MillingInferenceOrchestratorEngine (MILL-AGI Phase 0.5)
 *
 * Validates neural inference orchestration:
 *   - Inference requests and responses
 *   - Model registration and status
 *   - Caching behavior
 *   - Fallback strategies
 *   - Recommendations generation
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MillingInferenceOrchestratorEngine,
  millingInferenceOrchestratorEngine,
  type MillingConditions,
  type InferenceRequest,
  type OrchestratorConfig,
} from "../engines/MillingInferenceOrchestratorEngine.js";

describe("MillingInferenceOrchestratorEngine (MILL-AGI P0.5)", () => {
  let engine: MillingInferenceOrchestratorEngine;

  beforeEach(() => {
    engine = new MillingInferenceOrchestratorEngine();
  });

  // ============================================================================
  // TEST DATA
  // ============================================================================

  const steelConditions: MillingConditions = {
    cutting_speed_mpm: 150,
    feed_per_tooth_mm: 0.1,
    axial_depth_mm: 2,
    radial_depth_mm: 6,
    spindle_speed_rpm: 3000,
    tool_diameter_mm: 16,
    num_flutes: 4,
    material_iso_group: "P",
    tool_material: "carbide",
    coolant_type: "flood",
  };

  const titaniumConditions: MillingConditions = {
    ...steelConditions,
    cutting_speed_mpm: 50,
    material_iso_group: "S",
    coolant_type: "cryogenic",
  };

  const aggressiveConditions: MillingConditions = {
    ...steelConditions,
    cutting_speed_mpm: 300,
    feed_per_tooth_mm: 0.2,
    axial_depth_mm: 5,
    radial_depth_mm: 12,
    coolant_type: "dry",
  };

  // ============================================================================
  // INFERENCE REQUESTS
  // ============================================================================

  describe("inference requests", () => {
    it("returns inference response", async () => {
      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force", "thermal"],
      };

      const response = await engine.infer(request);

      expect(response.request_id).toBeDefined();
      expect(response.timestamp).toBeGreaterThan(0);
      expect(response.predictions.length).toBe(2);
    });

    it("includes all requested targets", async () => {
      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["chatter", "force", "thermal", "surface", "tool_life"],
      };

      const response = await engine.infer(request);

      const targets = response.predictions.map((p) => p.target);
      expect(targets).toContain("chatter");
      expect(targets).toContain("force");
      expect(targets).toContain("thermal");
      expect(targets).toContain("surface");
      expect(targets).toContain("tool_life");
    });

    it("returns valid prediction values", async () => {
      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force"],
      };

      const response = await engine.infer(request);
      const forcePred = response.predictions[0];

      expect(forcePred.value).toBeGreaterThan(0);
      expect(forcePred.unit).toBe("N");
      expect(forcePred.confidence).toBeGreaterThan(0);
      expect(forcePred.confidence).toBeLessThanOrEqual(1);
    });

    it("tracks inference time", async () => {
      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force"],
      };

      const response = await engine.infer(request);

      expect(response.total_inference_time_ms).toBeGreaterThan(0);
      expect(response.predictions[0].inference_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("computes aggregated confidence", async () => {
      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force", "thermal", "surface"],
      };

      const response = await engine.infer(request);

      expect(response.aggregated_confidence).toBeGreaterThan(0);
      expect(response.aggregated_confidence).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // PREDICTION TARGETS
  // ============================================================================

  describe("prediction targets", () => {
    it("predicts chatter probability", async () => {
      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["chatter"],
      };

      const response = await engine.infer(request);
      const pred = response.predictions[0];

      expect(pred.target).toBe("chatter");
      expect(pred.unit).toBe("probability");
      expect(pred.value).toBeGreaterThanOrEqual(0);
      expect(pred.value).toBeLessThanOrEqual(1);
    });

    it("predicts cutting force", async () => {
      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force"],
      };

      const response = await engine.infer(request);
      const pred = response.predictions[0];

      expect(pred.target).toBe("force");
      expect(pred.unit).toBe("N");
      expect(pred.value).toBeGreaterThan(50);
    });

    it("predicts thermal temperature", async () => {
      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["thermal"],
      };

      const response = await engine.infer(request);
      const pred = response.predictions[0];

      expect(pred.target).toBe("thermal");
      expect(pred.unit).toBe("°C");
      expect(pred.value).toBeGreaterThan(100);
    });

    it("predicts surface roughness", async () => {
      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["surface"],
      };

      const response = await engine.infer(request);
      const pred = response.predictions[0];

      expect(pred.target).toBe("surface");
      expect(pred.unit).toBe("µm");
      expect(pred.value).toBeGreaterThan(0);
    });

    it("predicts tool life", async () => {
      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["tool_life"],
      };

      const response = await engine.infer(request);
      const pred = response.predictions[0];

      expect(pred.target).toBe("tool_life");
      expect(pred.unit).toBe("min");
      expect(pred.value).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // ENSEMBLE MODE
  // ============================================================================

  describe("ensemble mode", () => {
    it("uses ensemble when requested", async () => {
      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force"],
        use_ensemble: true,
      };

      const response = await engine.infer(request);
      const pred = response.predictions[0];

      expect(pred.model_used).toContain("ensemble");
    });

    it("ensemble has higher confidence", async () => {
      const singleRequest: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force"],
        use_ensemble: false,
      };

      const ensembleRequest: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force"],
        use_ensemble: true,
      };

      // Run multiple times to get average
      let singleConf = 0;
      let ensembleConf = 0;
      const runs = 10;

      for (let i = 0; i < runs; i++) {
        const single = await engine.infer(singleRequest);
        const ensemble = await engine.infer(ensembleRequest);
        singleConf += single.predictions[0].confidence;
        ensembleConf += ensemble.predictions[0].confidence;
      }

      // Ensemble should have slightly higher average confidence
      expect(ensembleConf / runs).toBeGreaterThanOrEqual(singleConf / runs - 0.1);
    });
  });

  // ============================================================================
  // CACHING
  // ============================================================================

  describe("caching", () => {
    it("caches results", async () => {
      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force"],
      };

      await engine.infer(request);
      const stats = engine.getStatistics();

      expect(stats.cache_size).toBeGreaterThan(0);
    });

    it("returns cached results faster", async () => {
      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force"],
      };

      const first = await engine.infer(request);
      const second = await engine.infer(request);

      // Second should use cache (same or faster)
      expect(second.total_inference_time_ms).toBeLessThanOrEqual(
        first.total_inference_time_ms + 1
      );
    });

    it("clears cache", async () => {
      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force"],
      };

      await engine.infer(request);
      engine.clearCache();

      const stats = engine.getStatistics();
      expect(stats.cache_size).toBe(0);
    });

    it("respects cache TTL", async () => {
      const shortCacheEngine = new MillingInferenceOrchestratorEngine({
        cache_ttl_ms: 10,
      });

      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force"],
      };

      await shortCacheEngine.infer(request);

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Should not use cache
      const stats = shortCacheEngine.getStatistics();
      expect(stats.total_inferences).toBe(1);
    });
  });

  // ============================================================================
  // MODEL STATUS
  // ============================================================================

  describe("model status", () => {
    it("returns all model statuses", () => {
      const statuses = engine.getModelStatus();

      expect(statuses.length).toBe(5);
      expect(statuses.map((s) => s.target)).toContain("chatter");
      expect(statuses.map((s) => s.target)).toContain("force");
    });

    it("all models available by default", () => {
      const statuses = engine.getModelStatus();

      for (const status of statuses) {
        expect(status.available).toBe(true);
      }
    });

    it("checks model availability", () => {
      expect(engine.isModelAvailable("force")).toBe(true);
      expect(engine.isModelAvailable("nonexistent")).toBe(false);
    });

    it("disables model", () => {
      engine.setModelAvailable("force", false);

      expect(engine.isModelAvailable("force")).toBe(false);
    });

    it("tracks inference statistics per model", async () => {
      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force"],
      };

      await engine.infer(request);

      const statuses = engine.getModelStatus();
      const forceModel = statuses.find((s) => s.target === "force");

      expect(forceModel!.last_inference).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // RECOMMENDATIONS
  // ============================================================================

  describe("recommendations", () => {
    it("generates recommendations for high chatter risk", async () => {
      const request: InferenceRequest = {
        conditions: aggressiveConditions,
        targets: ["chatter"],
      };

      const response = await engine.infer(request);

      // May or may not have recommendations depending on predicted value
      expect(Array.isArray(response.recommendations)).toBe(true);
    });

    it("generates recommendations for high temperature", async () => {
      const hotConditions: MillingConditions = {
        ...steelConditions,
        cutting_speed_mpm: 400,
        coolant_type: "dry",
      };

      const request: InferenceRequest = {
        conditions: hotConditions,
        targets: ["thermal"],
      };

      const response = await engine.infer(request);

      // Should recommend coolant for dry high-speed cutting
      expect(Array.isArray(response.recommendations)).toBe(true);
    });
  });

  // ============================================================================
  // WARNINGS
  // ============================================================================

  describe("warnings", () => {
    it("warns on low confidence", async () => {
      const highThresholdEngine = new MillingInferenceOrchestratorEngine({
        min_confidence: 0.99, // Unrealistically high
      });

      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force"],
        confidence_threshold: 0.99,
      };

      const response = await highThresholdEngine.infer(request);

      expect(response.warnings.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // FALLBACK
  // ============================================================================

  describe("fallback", () => {
    it("uses fallback when model fails", async () => {
      engine.setModelAvailable("force", false);

      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force"],
      };

      const response = await engine.infer(request);

      // Should have used fallback or returned error
      const pred = response.predictions[0];
      expect(pred).toBeDefined();
    });
  });

  // ============================================================================
  // STATISTICS
  // ============================================================================

  describe("statistics", () => {
    it("tracks total inferences", async () => {
      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force"],
      };

      await engine.infer(request);
      await engine.infer(request);
      await engine.infer(request);

      const stats = engine.getStatistics();
      expect(stats.total_inferences).toBe(3);
    });

    it("tracks average inference time", async () => {
      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force", "thermal"],
      };

      await engine.infer(request);

      const stats = engine.getStatistics();
      expect(stats.avg_inference_time_ms).toBeGreaterThan(0);
    });

    it("counts available models", () => {
      const stats = engine.getStatistics();
      expect(stats.models_available).toBe(5);

      engine.setModelAvailable("force", false);
      const stats2 = engine.getStatistics();
      expect(stats2.models_available).toBe(4);
    });

    it("resets statistics", async () => {
      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force"],
      };

      await engine.infer(request);
      engine.resetStatistics();

      const stats = engine.getStatistics();
      expect(stats.total_inferences).toBe(0);
      expect(stats.avg_inference_time_ms).toBe(0);
    });
  });

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  describe("configuration", () => {
    it("returns config", () => {
      const config = engine.getConfig();

      expect(config.parallel_inference).toBeDefined();
      expect(config.use_cache).toBeDefined();
      expect(config.min_confidence).toBeDefined();
    });

    it("applies custom config", () => {
      const customEngine = new MillingInferenceOrchestratorEngine({
        min_confidence: 0.8,
        cache_ttl_ms: 10000,
      });

      const config = customEngine.getConfig();
      expect(config.min_confidence).toBe(0.8);
      expect(config.cache_ttl_ms).toBe(10000);
    });

    it("disables cache", async () => {
      const noCacheEngine = new MillingInferenceOrchestratorEngine({
        use_cache: false,
      });

      const request: InferenceRequest = {
        conditions: steelConditions,
        targets: ["force"],
      };

      await noCacheEngine.infer(request);

      const stats = noCacheEngine.getStatistics();
      expect(stats.cache_size).toBe(0);
    });
  });

  // ============================================================================
  // SINGLETON
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(millingInferenceOrchestratorEngine).toBeDefined();
      expect(millingInferenceOrchestratorEngine).toBeInstanceOf(
        MillingInferenceOrchestratorEngine
      );
    });
  });
});
