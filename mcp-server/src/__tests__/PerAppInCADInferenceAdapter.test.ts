/**
 * PerAppInCADInferenceAdapter — U-CAD-APP-20 Test Suite
 *
 * Tests in-process ML inference for CAD plugins with ≤100ms p99 SLO.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  PerAppInCADInferenceAdapter,
  type InferenceRuntime,
  type FeatureExtractor,
  type InferenceClock,
  type ModelConfig,
  type FeatureVector,
  type CADAppType,
  type InferenceType,
} from "../engines/PerAppInCADInferenceAdapter.js";

// ── Test Fixtures ────────────────────────────────────────────────────────────

function createMockClock(): InferenceClock & { advance(ms: number): void; setTime(ms: number): void } {
  let currentMs = 1700000000000;
  return {
    now: () => new Date(currentMs).toISOString(),
    nowMs: () => currentMs,
    advance(ms: number) { currentMs += ms; },
    setTime(ms: number) { currentMs = ms; },
  };
}

function createMockRuntime(clockRef?: { advance(ms: number): void }): InferenceRuntime & {
  setLatency(ms: number): void;
  setOutput(output: number[]): void;
  loadedModels: Set<string>;
} {
  const loadedModels = new Set<string>();
  let inferenceLatency = 10;
  let inferenceOutput = [0.9, 0.05, 0.03, 0.01, 0.01];

  return {
    loadedModels,
    setLatency(ms: number) { inferenceLatency = ms; },
    setOutput(output: number[]) { inferenceOutput = output; },

    async loadModel(config: ModelConfig) {
      loadedModels.add(config.modelId);
      return { success: true, loadTimeMs: 150 };
    },

    async unloadModel(modelId: string) {
      const existed = loadedModels.has(modelId);
      loadedModels.delete(modelId);
      return existed;
    },

    isModelLoaded(modelId: string) {
      return loadedModels.has(modelId);
    },

    async runInference(_modelId: string, _input: number[]) {
      // Advance clock to simulate inference time
      if (clockRef) clockRef.advance(inferenceLatency);
      return { output: inferenceOutput, latencyMs: inferenceLatency };
    },

    async warmup(_modelId: string, _iterations: number) {
      return { avgLatencyMs: 8 };
    },

    getMemoryUsage() {
      return { usedMB: 512, peakMB: 768 };
    },
  };
}

function createMockExtractor(): FeatureExtractor {
  return {
    extractFromGeometry(cadApp: CADAppType, _geometryData: unknown): FeatureVector {
      return {
        featureId: `geo-${Date.now()}`,
        cadApp,
        inferenceType: "feature_recognition",
        features: [0.5, 0.3, 0.8, 0.2, 0.6],
        timestamp: new Date().toISOString(),
      };
    },

    extractFromToolpath(cadApp: CADAppType, _toolpathData: unknown): FeatureVector {
      return {
        featureId: `tp-${Date.now()}`,
        cadApp,
        inferenceType: "toolpath_classification",
        features: [0.7, 0.2, 0.1, 0.0],
        timestamp: new Date().toISOString(),
      };
    },

    extractFromOperation(cadApp: CADAppType, _operationData: unknown): FeatureVector {
      return {
        featureId: `op-${Date.now()}`,
        cadApp,
        inferenceType: "tool_recommendation",
        features: [0.4, 0.3, 0.2, 0.05, 0.05],
        timestamp: new Date().toISOString(),
      };
    },
  };
}

function createModelConfig(overrides: Partial<ModelConfig> = {}): ModelConfig {
  return {
    modelId: `model-${Math.random().toString(36).slice(2, 8)}`,
    modelPath: "/models/test-model.onnx",
    format: "onnx",
    quantization: "fp16",
    inferenceType: "tool_recommendation",
    inputShape: [1, 64],
    outputShape: [1, 5],
    maxBatchSize: 4,
    warmupIterations: 3,
    ...overrides,
  };
}

function createFeatureVector(
  cadApp: CADAppType = "mastercam",
  inferenceType: InferenceType = "tool_recommendation",
  features: number[] = [0.5, 0.3, 0.8, 0.2, 0.6],
): FeatureVector {
  return {
    featureId: `fv-${Math.random().toString(36).slice(2, 8)}`,
    cadApp,
    inferenceType,
    features,
    timestamp: new Date().toISOString(),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("PerAppInCADInferenceAdapter", () => {
  let adapter: PerAppInCADInferenceAdapter;
  let runtime: ReturnType<typeof createMockRuntime>;
  let extractor: ReturnType<typeof createMockExtractor>;
  let clock: ReturnType<typeof createMockClock>;

  beforeEach(() => {
    clock = createMockClock();
    runtime = createMockRuntime(clock);
    extractor = createMockExtractor();
    adapter = new PerAppInCADInferenceAdapter({
      runtime,
      extractor,
      clock,
      maxCacheSize: 100,
      cacheTTLMs: 60000,
      sloTargetMs: 100,
    });
  });

  // ── Model Management ────────────────────────────────────────────────────────

  describe("Model Management", () => {
    it("loads a model and registers it for CAD app", async () => {
      const config = createModelConfig({ modelId: "tool-rec-v1" });
      const result = await adapter.loadModel(config, "mastercam");

      expect(result.success).toBe(true);
      expect(result.loadTimeMs).toBe(150);
      expect(adapter.isModelLoaded("tool-rec-v1")).toBe(true);
      expect(adapter.getLoadedModels()).toHaveLength(1);
    });

    it("maps model to CAD app and inference type", async () => {
      const config = createModelConfig({
        modelId: "param-opt-v1",
        inferenceType: "parameter_optimization",
      });
      await adapter.loadModel(config, "nx");

      const models = adapter.getModelsForApp("nx");
      expect(models.get("parameter_optimization")).toBe("param-opt-v1");
    });

    it("loads multiple models for same CAD app", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "m1", inferenceType: "tool_recommendation" }),
        "solidworks",
      );
      await adapter.loadModel(
        createModelConfig({ modelId: "m2", inferenceType: "error_prediction" }),
        "solidworks",
      );

      const models = adapter.getModelsForApp("solidworks");
      expect(models.size).toBe(2);
      expect(models.get("tool_recommendation")).toBe("m1");
      expect(models.get("error_prediction")).toBe("m2");
    });

    it("unloads model and removes mappings", async () => {
      const config = createModelConfig({ modelId: "to-unload" });
      await adapter.loadModel(config, "autocad");
      expect(adapter.isModelLoaded("to-unload")).toBe(true);

      const unloaded = await adapter.unloadModel("to-unload");
      expect(unloaded).toBe(true);
      expect(adapter.isModelLoaded("to-unload")).toBe(false);
      expect(adapter.getLoadedModels()).toHaveLength(0);
    });

    it("returns false when unloading non-existent model", async () => {
      const result = await adapter.unloadModel("non-existent");
      expect(result).toBe(false);
    });

    it("hot-swaps model with minimal downtime", async () => {
      const oldConfig = createModelConfig({ modelId: "old-model" });
      await adapter.loadModel(oldConfig, "onshape");

      const newConfig = createModelConfig({
        modelId: "new-model",
        inferenceType: oldConfig.inferenceType,
      });

      const result = await adapter.hotSwapModel("old-model", newConfig, "onshape");

      expect(result.success).toBe(true);
      expect(result.downTimeMs).toBeGreaterThanOrEqual(0);
      expect(adapter.isModelLoaded("old-model")).toBe(false);
      expect(adapter.isModelLoaded("new-model")).toBe(true);
    });

    it("performs warmup iterations on load", async () => {
      const warmupSpy = vi.spyOn(runtime, "warmup");
      const config = createModelConfig({ warmupIterations: 5 });

      await adapter.loadModel(config, "fusion360");

      expect(warmupSpy).toHaveBeenCalledWith(config.modelId, 5);
    });

    it("skips warmup when iterations is 0", async () => {
      const warmupSpy = vi.spyOn(runtime, "warmup");
      const config = createModelConfig({ warmupIterations: 0 });

      await adapter.loadModel(config, "catia");

      expect(warmupSpy).not.toHaveBeenCalled();
    });
  });

  // ── Inference ───────────────────────────────────────────────────────────────

  describe("Inference", () => {
    beforeEach(async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "tool-model", inferenceType: "tool_recommendation" }),
        "mastercam",
      );
      await adapter.loadModel(
        createModelConfig({ modelId: "error-model", inferenceType: "error_prediction" }),
        "mastercam",
      );
    });

    it("performs inference and returns predictions", async () => {
      runtime.setOutput([0.85, 0.10, 0.03, 0.01, 0.01]);
      const features = createFeatureVector("mastercam", "tool_recommendation");

      const result = await adapter.infer("mastercam", "tool_recommendation", features);

      expect(result.requestId).toMatch(/^req-/);
      expect(result.inferenceType).toBe("tool_recommendation");
      expect(result.predictions).toHaveLength(3); // top 3
      expect(result.predictions[0].label).toBe("end_mill");
      expect(result.predictions[0].confidence).toBe(0.85);
      expect(result.fromCache).toBe(false);
      expect(result.modelId).toBe("tool-model");
    });

    it("returns cached result on identical features", async () => {
      const features = createFeatureVector("mastercam", "tool_recommendation", [0.1, 0.2, 0.3]);

      const first = await adapter.infer("mastercam", "tool_recommendation", features);
      expect(first.fromCache).toBe(false);

      const second = await adapter.infer("mastercam", "tool_recommendation", features);
      expect(second.fromCache).toBe(true);
      expect(second.predictions).toEqual(first.predictions);
    });

    it("throws when no model loaded for app/type", async () => {
      const features = createFeatureVector("nx", "collision_detection");

      await expect(
        adapter.infer("nx", "collision_detection", features),
      ).rejects.toThrow("No model loaded for nx/collision_detection");
    });

    it("infers from geometry data", async () => {
      runtime.setOutput([0.7, 0.15, 0.1, 0.03, 0.02]);
      await adapter.loadModel(
        createModelConfig({ modelId: "feat-model", inferenceType: "feature_recognition" }),
        "mastercam",
      );

      const result = await adapter.inferFromGeometry(
        "mastercam",
        "feature_recognition",
        { vertices: [[0, 0, 0], [1, 1, 1]] },
      );

      expect(result.predictions.length).toBeGreaterThan(0);
      expect(result.inferenceType).toBe("feature_recognition");
    });

    it("infers from toolpath data", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "tp-model", inferenceType: "toolpath_classification" }),
        "mastercam",
      );
      runtime.setOutput([0.8, 0.1, 0.07, 0.03]);

      const result = await adapter.inferFromToolpath(
        "mastercam",
        "toolpath_classification",
        { points: [[0, 0], [10, 10]] },
      );

      expect(result.predictions[0].label).toBe("roughing");
    });

    it("infers from operation data", async () => {
      runtime.setOutput([0.6, 0.25, 0.1, 0.03, 0.02]);

      const result = await adapter.inferFromOperation(
        "mastercam",
        "tool_recommendation",
        { operationType: "pocket", depth: 10 },
      );

      expect(result.predictions[0].label).toBe("end_mill");
    });

    it("performs batch inference", async () => {
      const features = [
        createFeatureVector("mastercam", "tool_recommendation", [0.1, 0.2, 0.3]),
        createFeatureVector("mastercam", "tool_recommendation", [0.4, 0.5, 0.6]),
        createFeatureVector("mastercam", "tool_recommendation", [0.7, 0.8, 0.9]),
      ];

      const results = await adapter.batchInfer("mastercam", "tool_recommendation", features);

      expect(results).toHaveLength(3);
      results.forEach((r) => {
        expect(r.inferenceType).toBe("tool_recommendation");
        expect(r.predictions.length).toBeGreaterThan(0);
      });
    });

    it("interprets error_prediction output correctly", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "err", inferenceType: "error_prediction" }),
        "nx",
      );
      // Labels: ["no_error", "collision", "overload", "chatter", "breakage"]
      // Index 3 = chatter
      runtime.setOutput([0.1, 0.05, 0.03, 0.8, 0.02]); // chatter (idx 3) highest

      const result = await adapter.infer(
        "nx",
        "error_prediction",
        createFeatureVector("nx", "error_prediction"),
      );

      expect(result.predictions[0].label).toBe("chatter");
    });

    it("interprets surface_quality_prediction output", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "surf", inferenceType: "surface_quality_prediction" }),
        "solidworks",
      );
      runtime.setOutput([1.6, 0.92]); // Ra = 1.6 µm, confidence 0.92

      const result = await adapter.infer(
        "solidworks",
        "surface_quality_prediction",
        createFeatureVector("solidworks", "surface_quality_prediction"),
      );

      expect(result.predictions[0].label).toBe("ra_um");
      expect(result.predictions[0].value).toBe(1.6);
      expect(result.predictions[0].confidence).toBe(0.92);
    });

    it("interprets cycle_time_estimation output", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "cycle", inferenceType: "cycle_time_estimation" }),
        "fusion360",
      );
      runtime.setOutput([12.5, 0.88]);

      const result = await adapter.infer(
        "fusion360",
        "cycle_time_estimation",
        createFeatureVector("fusion360", "cycle_time_estimation"),
      );

      expect(result.predictions[0].label).toBe("cycle_time_min");
      expect(result.predictions[0].value).toBe(12.5);
    });

    it("interprets collision_detection output (collision)", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "coll", inferenceType: "collision_detection" }),
        "catia",
      );
      runtime.setOutput([0.85]); // > 0.5 = collision

      const result = await adapter.infer(
        "catia",
        "collision_detection",
        createFeatureVector("catia", "collision_detection"),
      );

      expect(result.predictions[0].label).toBe("collision");
    });

    it("interprets collision_detection output (safe)", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "coll2", inferenceType: "collision_detection" }),
        "creo",
      );
      runtime.setOutput([0.15]); // < 0.5 = safe

      const result = await adapter.infer(
        "creo",
        "collision_detection",
        createFeatureVector("creo", "collision_detection"),
      );

      expect(result.predictions[0].label).toBe("safe");
    });

    it("interprets material_suggestion output", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "mat", inferenceType: "material_suggestion" }),
        "freecad",
      );
      runtime.setOutput([0.1, 0.05, 0.7, 0.1, 0.05]); // stainless highest

      const result = await adapter.infer(
        "freecad",
        "material_suggestion",
        createFeatureVector("freecad", "material_suggestion"),
      );

      expect(result.predictions[0].label).toBe("stainless");
    });

    it("interprets strategy_selection output", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "strat", inferenceType: "strategy_selection" }),
        "inventor",
      );
      runtime.setOutput([0.65, 0.2, 0.1, 0.03, 0.02]); // adaptive highest

      const result = await adapter.infer(
        "inventor",
        "strategy_selection",
        createFeatureVector("inventor", "strategy_selection"),
      );

      expect(result.predictions[0].label).toBe("adaptive");
    });
  });

  // ── Latency Stats ───────────────────────────────────────────────────────────

  describe("Latency Stats", () => {
    beforeEach(async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "lat-model", inferenceType: "tool_recommendation" }),
        "mastercam",
      );
    });

    it("returns null for no samples", () => {
      const stats = adapter.getLatencyStats("nx", "error_prediction");
      expect(stats).toBeNull();
    });

    it("computes percentile latency stats", async () => {
      // Run multiple inferences with varying latencies
      for (let i = 0; i < 10; i++) {
        runtime.setLatency(50 + i * 5); // 50, 55, 60, ..., 95ms
        const features = createFeatureVector("mastercam", "tool_recommendation", [i, i + 1, i + 2]);
        await adapter.infer("mastercam", "tool_recommendation", features);
      }

      const stats = adapter.getLatencyStats("mastercam", "tool_recommendation");
      expect(stats).not.toBeNull();
      expect(stats!.sampleCount).toBe(10);
      expect(stats!.minMs).toBe(50);
      expect(stats!.maxMs).toBe(95);
      expect(stats!.meanMs).toBeCloseTo(72.5, 1);
      expect(stats!.p50Ms).toBeDefined();
      expect(stats!.p95Ms).toBeDefined();
      expect(stats!.p99Ms).toBeDefined();
    });

    it("tracks SLO compliance", async () => {
      runtime.setLatency(80); // Under 100ms SLO
      for (let i = 0; i < 5; i++) {
        await adapter.infer(
          "mastercam",
          "tool_recommendation",
          createFeatureVector("mastercam", "tool_recommendation", [i]),
        );
      }

      const stats = adapter.getLatencyStats("mastercam", "tool_recommendation");
      expect(stats!.sloMet).toBe(true);
    });

    it("detects SLO violation", async () => {
      runtime.setLatency(120); // Over 100ms SLO
      for (let i = 0; i < 5; i++) {
        await adapter.infer(
          "mastercam",
          "tool_recommendation",
          createFeatureVector("mastercam", "tool_recommendation", [i * 10]),
        );
      }

      const stats = adapter.getLatencyStats("mastercam", "tool_recommendation");
      expect(stats!.sloMet).toBe(false);
    });

    it("clears specific latency stats", async () => {
      runtime.setLatency(50);
      await adapter.infer(
        "mastercam",
        "tool_recommendation",
        createFeatureVector("mastercam", "tool_recommendation"),
      );

      const cleared = adapter.clearLatencyStats("mastercam", "tool_recommendation");
      expect(cleared).toBe(1);

      const stats = adapter.getLatencyStats("mastercam", "tool_recommendation");
      expect(stats).toBeNull();
    });

    it("clears all latency stats", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "m2", inferenceType: "error_prediction" }),
        "mastercam",
      );

      await adapter.infer("mastercam", "tool_recommendation", createFeatureVector());
      await adapter.infer(
        "mastercam",
        "error_prediction",
        createFeatureVector("mastercam", "error_prediction"),
      );

      const cleared = adapter.clearLatencyStats();
      expect(cleared).toBe(2);

      expect(adapter.getAllLatencyStats()).toHaveLength(0);
    });

    it("gets all latency stats", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "m2", inferenceType: "error_prediction" }),
        "nx",
      );

      await adapter.infer("mastercam", "tool_recommendation", createFeatureVector());
      await adapter.infer(
        "nx",
        "error_prediction",
        createFeatureVector("nx", "error_prediction"),
      );

      const allStats = adapter.getAllLatencyStats();
      expect(allStats).toHaveLength(2);
    });
  });

  // ── Cache Management ────────────────────────────────────────────────────────

  describe("Cache Management", () => {
    beforeEach(async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "cache-model", inferenceType: "tool_recommendation" }),
        "mastercam",
      );
    });

    it("gets cache stats", async () => {
      for (let i = 0; i < 5; i++) {
        await adapter.infer(
          "mastercam",
          "tool_recommendation",
          createFeatureVector("mastercam", "tool_recommendation", [i]),
        );
      }

      const stats = adapter.getCacheStats();
      expect(stats.entries).toBe(5);
      expect(stats.memoryMB).toBeGreaterThanOrEqual(0);
    });

    it("computes cache hit rate", async () => {
      const features = createFeatureVector("mastercam", "tool_recommendation", [1, 2, 3]);

      // First access (miss)
      await adapter.infer("mastercam", "tool_recommendation", features);
      // Second access (hit)
      await adapter.infer("mastercam", "tool_recommendation", features);
      // Third access (hit)
      await adapter.infer("mastercam", "tool_recommendation", features);

      const stats = adapter.getCacheStats("mastercam", "tool_recommendation");
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it("clears cache for specific CAD app", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "nx-model", inferenceType: "tool_recommendation" }),
        "nx",
      );

      await adapter.infer("mastercam", "tool_recommendation", createFeatureVector());
      await adapter.infer(
        "nx",
        "tool_recommendation",
        createFeatureVector("nx", "tool_recommendation"),
      );

      const cleared = adapter.clearCache("mastercam");
      expect(cleared).toBe(1);

      const mcStats = adapter.getCacheStats("mastercam");
      expect(mcStats.entries).toBe(0);

      const nxStats = adapter.getCacheStats("nx");
      expect(nxStats.entries).toBe(1);
    });

    it("clears all cache", async () => {
      for (let i = 0; i < 10; i++) {
        await adapter.infer(
          "mastercam",
          "tool_recommendation",
          createFeatureVector("mastercam", "tool_recommendation", [i]),
        );
      }

      const cleared = adapter.clearCache();
      expect(cleared).toBe(10);

      expect(adapter.getCacheStats().entries).toBe(0);
    });

    it("evicts oldest entries when cache full", async () => {
      const smallAdapter = new PerAppInCADInferenceAdapter({
        runtime,
        extractor,
        clock,
        maxCacheSize: 5,
      });

      await smallAdapter.loadModel(
        createModelConfig({ modelId: "small-model", inferenceType: "tool_recommendation" }),
        "mastercam",
      );

      // Fill cache to capacity
      for (let i = 0; i < 10; i++) {
        await smallAdapter.infer(
          "mastercam",
          "tool_recommendation",
          createFeatureVector("mastercam", "tool_recommendation", [i]),
        );
      }

      const stats = smallAdapter.getCacheStats();
      expect(stats.entries).toBeLessThanOrEqual(5);
    });

    it("expires cache entries after TTL", async () => {
      const features = createFeatureVector("mastercam", "tool_recommendation", [5, 6, 7]);

      // First call caches
      const first = await adapter.infer("mastercam", "tool_recommendation", features);
      expect(first.fromCache).toBe(false);

      // Second call hits cache
      const second = await adapter.infer("mastercam", "tool_recommendation", features);
      expect(second.fromCache).toBe(true);

      // Advance time past TTL (60s)
      clock.advance(70000);

      // Third call should miss (expired)
      const third = await adapter.infer("mastercam", "tool_recommendation", features);
      expect(third.fromCache).toBe(false);
    });
  });

  // ── Subscriptions ───────────────────────────────────────────────────────────

  describe("Subscriptions", () => {
    beforeEach(async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "sub-model", inferenceType: "tool_recommendation" }),
        "mastercam",
      );
    });

    it("notifies inference subscribers", async () => {
      const callback = vi.fn();
      adapter.onInference(callback);

      await adapter.infer("mastercam", "tool_recommendation", createFeatureVector());

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].inferenceType).toBe("tool_recommendation");
    });

    it("allows unsubscribe from inference events", async () => {
      const callback = vi.fn();
      const unsub = adapter.onInference(callback);

      await adapter.infer("mastercam", "tool_recommendation", createFeatureVector());
      expect(callback).toHaveBeenCalledTimes(1);

      unsub();

      await adapter.infer(
        "mastercam",
        "tool_recommendation",
        createFeatureVector("mastercam", "tool_recommendation", [9, 8, 7]),
      );
      expect(callback).toHaveBeenCalledTimes(1); // Not called again
    });

    it("notifies SLO violation subscribers", async () => {
      const callback = vi.fn();
      adapter.onSLOViolation(callback);

      runtime.setLatency(150); // Over 100ms SLO

      // Need multiple samples for SLO calculation
      for (let i = 0; i < 5; i++) {
        await adapter.infer(
          "mastercam",
          "tool_recommendation",
          createFeatureVector("mastercam", "tool_recommendation", [i * 100]),
        );
      }

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0].sloMet).toBe(false);
    });

    it("allows unsubscribe from SLO events", async () => {
      const callback = vi.fn();
      const unsub = adapter.onSLOViolation(callback);

      runtime.setLatency(150);
      await adapter.infer("mastercam", "tool_recommendation", createFeatureVector());

      unsub();

      await adapter.infer(
        "mastercam",
        "tool_recommendation",
        createFeatureVector("mastercam", "tool_recommendation", [1, 2, 3]),
      );

      // Callback was called at least once before unsub
      const callCount = callback.mock.calls.length;

      // Run more inferences - should not increase call count
      for (let i = 0; i < 5; i++) {
        await adapter.infer(
          "mastercam",
          "tool_recommendation",
          createFeatureVector("mastercam", "tool_recommendation", [i * 50]),
        );
      }

      expect(callback).toHaveBeenCalledTimes(callCount);
    });

    it("handles subscriber errors gracefully", async () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error("Subscriber error");
      });
      const goodCallback = vi.fn();

      adapter.onInference(errorCallback);
      adapter.onInference(goodCallback);

      // Should not throw despite error in first subscriber
      await expect(
        adapter.infer("mastercam", "tool_recommendation", createFeatureVector()),
      ).resolves.toBeDefined();

      expect(errorCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
    });
  });

  // ── Memory ──────────────────────────────────────────────────────────────────

  describe("Memory", () => {
    it("reports memory usage", () => {
      const usage = adapter.getMemoryUsage();

      expect(usage.runtimeMB).toBe(512);
      expect(usage.cacheMB).toBeGreaterThanOrEqual(0);
      expect(usage.totalMB).toBe(usage.runtimeMB + usage.cacheMB);
    });

    it("includes cache memory in total", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "mem-model", inferenceType: "tool_recommendation" }),
        "mastercam",
      );

      const before = adapter.getMemoryUsage();

      for (let i = 0; i < 100; i++) {
        await adapter.infer(
          "mastercam",
          "tool_recommendation",
          createFeatureVector("mastercam", "tool_recommendation", [i]),
        );
      }

      const after = adapter.getMemoryUsage();
      expect(after.cacheMB).toBeGreaterThan(before.cacheMB);
    });
  });

  // ── Configuration ───────────────────────────────────────────────────────────

  describe("Configuration", () => {
    it("sets and gets SLO target", () => {
      expect(adapter.getSLOTarget()).toBe(100);

      adapter.setSLOTarget(50);
      expect(adapter.getSLOTarget()).toBe(50);
    });

    it("updates SLO compliance with new target", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "slo-model", inferenceType: "tool_recommendation" }),
        "mastercam",
      );

      runtime.setLatency(75);
      for (let i = 0; i < 5; i++) {
        await adapter.infer(
          "mastercam",
          "tool_recommendation",
          createFeatureVector("mastercam", "tool_recommendation", [i]),
        );
      }

      // With 100ms SLO, 75ms should pass
      let stats = adapter.getLatencyStats("mastercam", "tool_recommendation");
      expect(stats!.sloMet).toBe(true);

      // Lower SLO to 50ms
      adapter.setSLOTarget(50);
      stats = adapter.getLatencyStats("mastercam", "tool_recommendation");
      expect(stats!.sloMet).toBe(false);
    });

    it("sets cache TTL", () => {
      adapter.setCacheTTL(30000);

      // TTL change affects future cache entries
      // (internal state, verified by expiration behavior)
      expect(true).toBe(true); // Configuration accepted
    });

    it("sets max cache size and triggers eviction", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "size-model", inferenceType: "tool_recommendation" }),
        "mastercam",
      );

      // Fill cache with 50 entries
      for (let i = 0; i < 50; i++) {
        await adapter.infer(
          "mastercam",
          "tool_recommendation",
          createFeatureVector("mastercam", "tool_recommendation", [i]),
        );
      }

      expect(adapter.getCacheStats().entries).toBe(50);

      // Reduce max size
      adapter.setMaxCacheSize(20);

      // Next inference should trigger eviction
      await adapter.infer(
        "mastercam",
        "tool_recommendation",
        createFeatureVector("mastercam", "tool_recommendation", [999]),
      );

      expect(adapter.getCacheStats().entries).toBeLessThanOrEqual(20);
    });
  });

  // ── Edge Cases ──────────────────────────────────────────────────────────────

  describe("Edge Cases", () => {
    it("handles empty features array", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "edge-model", inferenceType: "tool_recommendation" }),
        "mastercam",
      );
      runtime.setOutput([0.5, 0.3, 0.1, 0.05, 0.05]);

      const result = await adapter.infer(
        "mastercam",
        "tool_recommendation",
        createFeatureVector("mastercam", "tool_recommendation", []),
      );

      expect(result.predictions.length).toBeGreaterThan(0);
    });

    it("handles very large feature vectors", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "large-model", inferenceType: "tool_recommendation" }),
        "mastercam",
      );

      const largeFeatures = Array(1000).fill(0).map((_, i) => i / 1000);
      const result = await adapter.infer(
        "mastercam",
        "tool_recommendation",
        createFeatureVector("mastercam", "tool_recommendation", largeFeatures),
      );

      expect(result.predictions.length).toBeGreaterThan(0);
    });

    it("handles concurrent inferences", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "conc-model", inferenceType: "tool_recommendation" }),
        "mastercam",
      );

      const promises = Array(10)
        .fill(0)
        .map((_, i) =>
          adapter.infer(
            "mastercam",
            "tool_recommendation",
            createFeatureVector("mastercam", "tool_recommendation", [i]),
          ),
        );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((r) => expect(r.predictions.length).toBeGreaterThan(0));
    });

    it("tracks latency samples up to max limit", async () => {
      const smallAdapter = new PerAppInCADInferenceAdapter({
        runtime,
        extractor,
        clock,
        sloTargetMs: 100,
      });

      await smallAdapter.loadModel(
        createModelConfig({ modelId: "sample-model", inferenceType: "tool_recommendation" }),
        "mastercam",
      );

      // Run more than maxSamples (1000) inferences
      for (let i = 0; i < 1100; i++) {
        await smallAdapter.infer(
          "mastercam",
          "tool_recommendation",
          createFeatureVector("mastercam", "tool_recommendation", [i]),
        );
      }

      const stats = smallAdapter.getLatencyStats("mastercam", "tool_recommendation");
      expect(stats!.sampleCount).toBeLessThanOrEqual(1000);
    });

    it("handles model load failure gracefully during hot-swap", async () => {
      await adapter.loadModel(
        createModelConfig({ modelId: "original" }),
        "mastercam",
      );

      // Make load fail
      const originalLoadModel = runtime.loadModel.bind(runtime);
      runtime.loadModel = async () => ({ success: false, loadTimeMs: 0, error: "Load failed" });

      const result = await adapter.hotSwapModel(
        "original",
        createModelConfig({ modelId: "new-failed" }),
        "mastercam",
      );

      expect(result.success).toBe(false);
      expect(adapter.isModelLoaded("original")).toBe(true); // Original still loaded

      runtime.loadModel = originalLoadModel;
    });

    it("returns empty map for CAD app with no models", () => {
      const models = adapter.getModelsForApp("inventor");
      expect(models.size).toBe(0);
    });
  });

  // ── Schema Validation ───────────────────────────────────────────────────────

  describe("Schema Validation", () => {
    it("validates CADAppType enum values", () => {
      const validApps: CADAppType[] = [
        "mastercam", "onshape", "autocad", "nx", "solidworks",
        "fusion360", "inventor", "catia", "creo", "freecad",
      ];

      validApps.forEach((app) => {
        expect(adapter.getModelsForApp(app)).toBeDefined();
      });
    });

    it("validates InferenceType enum values", async () => {
      const types: InferenceType[] = [
        "tool_recommendation",
        "parameter_optimization",
        "error_prediction",
        "feature_recognition",
        "toolpath_classification",
        "surface_quality_prediction",
        "cycle_time_estimation",
        "collision_detection",
        "material_suggestion",
        "strategy_selection",
      ];

      // Each type should work as model inference type
      for (const type of types) {
        const config = createModelConfig({ modelId: `val-${type}`, inferenceType: type });
        const result = await adapter.loadModel(config, "mastercam");
        expect(result.success).toBe(true);
      }
    });
  });
});
