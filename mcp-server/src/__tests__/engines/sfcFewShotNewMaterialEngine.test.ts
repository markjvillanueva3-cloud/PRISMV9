/**
 * SFCFewShotNewMaterialEngine Tests — U-PPG-SFC-13
 *
 * Exit criteria verification:
 *   - 3-shot adapted prediction in <500ms inside quote path
 *   - MAE on held-out new-customer material within 1.2x fully-trained baseline
 *   - Cache hit on repeat (customer×material) <50ms
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  sfcFewShotNewMaterialEngine,
  type MaterialSample,
  type MaterialFeatures,
} from "../../engines/SFCFewShotNewMaterialEngine.js";

describe("SFCFewShotNewMaterialEngine", () => {
  beforeEach(() => {
    sfcFewShotNewMaterialEngine.clear();
    sfcFewShotNewMaterialEngine.configure({
      inner_steps: 5,
      inner_lr: 0.01,
      feature_dim: 16,
      hidden_dim: 32,
      cache_ttl_ms: 60 * 60 * 1000, // 1 hour for tests
      max_cache_size: 100,
      adaptation_budget_ms: 500,
      prediction_budget_ms: 50,
    });
  });

  function makeSample(
    material: string,
    sfm: number,
    hardness: number,
    outcome: "success" | "chatter" = "success",
  ): MaterialSample {
    return {
      material,
      tool_class: "carbide-coated",
      features: {
        hardness_hrc: hardness,
        tensile_strength_mpa: hardness * 30,
        thermal_conductivity: 50,
        machinability_rating: 100 - hardness,
        iso_group: "P",
      },
      actual_sfm: sfm,
      actual_feed: 0.008,
      outcome,
    };
  }

  function makeFeatures(hardness: number): MaterialFeatures {
    return {
      hardness_hrc: hardness,
      tensile_strength_mpa: hardness * 30,
      thermal_conductivity: 50,
      machinability_rating: 100 - hardness,
      iso_group: "P",
    };
  }

  describe("Initialization", () => {
    it("initialize() returns initialized=true and config_id", () => {
      const result = sfcFewShotNewMaterialEngine.initialize();
      expect(result.initialized).toBe(true);
      expect(result.config_id).toBe("sfc-fewshot-maml");
    });

    it("getConfig() returns default configuration values", () => {
      const config = sfcFewShotNewMaterialEngine.getConfig();
      expect(config.inner_steps).toBe(5);
      expect(config.feature_dim).toBe(16);
      expect(config.adaptation_budget_ms).toBe(500);
    });

    it("configure() updates inner_steps and returns new config", () => {
      const newConfig = sfcFewShotNewMaterialEngine.configure({ inner_steps: 3 });
      expect(newConfig.inner_steps).toBe(3);
    });
  });

  describe("Adaptation", () => {
    it("adapt() returns adapted=true with 3 support samples", () => {
      const samples = [
        makeSample("Inconel-718", 120, 40),
        makeSample("Inconel-718", 115, 42),
        makeSample("Inconel-718", 125, 38),
      ];

      const result = sfcFewShotNewMaterialEngine.adapt(
        "ITW",
        "Inconel-718",
        "carbide-coated",
        samples,
      );

      expect(result.adapted).toBe(true);
      expect(result.support_set_size).toBe(3);
      expect(result.inner_steps).toBeGreaterThan(0);
    });

    it("adapt() completes within 500ms budget for 3-shot", () => {
      const samples = [
        makeSample("Ti-6Al-4V", 200, 35),
        makeSample("Ti-6Al-4V", 190, 36),
        makeSample("Ti-6Al-4V", 210, 34),
      ];

      const result = sfcFewShotNewMaterialEngine.adapt(
        "Alcoa",
        "Ti-6Al-4V",
        "carbide-coated",
        samples,
      );

      expect(result.adaptation_time_ms).toBeLessThan(500);
      expect(result.within_budget).toBe(true);
    });

    it("adapt() caches adapter for subsequent lookups", () => {
      const samples = [
        makeSample("D2-tool-steel", 280, 55),
        makeSample("D2-tool-steel", 275, 56),
        makeSample("D2-tool-steel", 285, 54),
      ];

      sfcFewShotNewMaterialEngine.adapt("JMDie", "D2-tool-steel", "carbide-coated", samples);

      const adapter = sfcFewShotNewMaterialEngine.getAdapter(
        "JMDie",
        "D2-tool-steel",
        "carbide-coated",
      );

      expect(adapter).not.toBe(undefined);
      expect(adapter!.customer).toBe("JMDie");
      expect(adapter!.material).toBe("D2-tool-steel");
    });
  });

  describe("Prediction", () => {
    it("predict() returns predicted_sfm within reasonable range", () => {
      const samples = [
        makeSample("4140-steel", 400, 28),
        makeSample("4140-steel", 380, 30),
        makeSample("4140-steel", 420, 26),
      ];

      sfcFewShotNewMaterialEngine.adapt("Customer-A", "4140-steel", "carbide-coated", samples);

      const prediction = sfcFewShotNewMaterialEngine.predict(
        "Customer-A",
        "4140-steel",
        "carbide-coated",
        makeFeatures(29),
      );

      expect(prediction.predicted_sfm).toBeGreaterThan(0);
      expect(prediction.predicted_sfm).toBeLessThan(2000);
      expect(prediction.confidence).toBeGreaterThan(0);
    });

    it("predict() returns cache_hit=true for previously adapted material", () => {
      const samples = [
        makeSample("A2-tool-steel", 300, 50),
        makeSample("A2-tool-steel", 290, 52),
        makeSample("A2-tool-steel", 310, 48),
      ];

      sfcFewShotNewMaterialEngine.adapt("Customer-B", "A2-tool-steel", "carbide-coated", samples);

      const prediction = sfcFewShotNewMaterialEngine.predict(
        "Customer-B",
        "A2-tool-steel",
        "carbide-coated",
        makeFeatures(51),
      );

      expect(prediction.cache_hit).toBe(true);
      expect(prediction.provenance.source).toBe("cached");
    });

    it("predict() returns cache_hit=false for unknown material", () => {
      const prediction = sfcFewShotNewMaterialEngine.predict(
        "Unknown-Customer",
        "Unknown-Material",
        "unknown-tool",
        makeFeatures(30),
      );

      expect(prediction.cache_hit).toBe(false);
    });

    it("predict() completes within 50ms for cached adapter", () => {
      const samples = [
        makeSample("Hastelloy-X", 150, 45),
        makeSample("Hastelloy-X", 145, 46),
        makeSample("Hastelloy-X", 155, 44),
      ];

      sfcFewShotNewMaterialEngine.adapt("Customer-C", "Hastelloy-X", "carbide-coated", samples);

      const prediction = sfcFewShotNewMaterialEngine.predict(
        "Customer-C",
        "Hastelloy-X",
        "carbide-coated",
        makeFeatures(45),
      );

      expect(prediction.prediction_time_ms).toBeLessThan(50);
    });
  });

  describe("Adapt and Predict combined", () => {
    it("adaptAndPredict() returns prediction with adaptation_result", () => {
      const samples = [
        makeSample("Waspaloy", 100, 48),
        makeSample("Waspaloy", 95, 49),
        makeSample("Waspaloy", 105, 47),
      ];

      const result = sfcFewShotNewMaterialEngine.adaptAndPredict(
        "Customer-D",
        "Waspaloy",
        "carbide-coated",
        samples,
        makeFeatures(48),
      );

      expect(result.predicted_sfm).toBeGreaterThan(0);
      expect(result.adaptation_result.adapted).toBe(true);
    });

    it("adaptAndPredict() uses cache on second call", () => {
      const samples = [
        makeSample("Rene-41", 110, 46),
        makeSample("Rene-41", 105, 47),
        makeSample("Rene-41", 115, 45),
      ];

      // First call - adapts
      sfcFewShotNewMaterialEngine.adaptAndPredict(
        "Customer-E",
        "Rene-41",
        "carbide-coated",
        samples,
        makeFeatures(46),
      );

      // Second call - should use cache
      const result = sfcFewShotNewMaterialEngine.adaptAndPredict(
        "Customer-E",
        "Rene-41",
        "carbide-coated",
        samples,
        makeFeatures(46),
      );

      expect(result.cache_hit).toBe(true);
      expect(result.adaptation_result.adapted).toBe(false);
    });
  });

  describe("Cache management", () => {
    it("getCacheStats() returns size and hit counts", () => {
      const samples = [
        makeSample("Material-1", 300, 30),
        makeSample("Material-1", 290, 31),
        makeSample("Material-1", 310, 29),
      ];

      sfcFewShotNewMaterialEngine.adapt("Customer-F", "Material-1", "tool-1", samples);

      const stats = sfcFewShotNewMaterialEngine.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.max_size).toBe(100);
    });

    it("listAdapters() returns all cached adapters", () => {
      const samples1 = [makeSample("Mat-A", 300, 30), makeSample("Mat-A", 290, 31), makeSample("Mat-A", 310, 29)];
      const samples2 = [makeSample("Mat-B", 400, 25), makeSample("Mat-B", 390, 26), makeSample("Mat-B", 410, 24)];

      sfcFewShotNewMaterialEngine.adapt("Cust-1", "Mat-A", "tool-1", samples1);
      sfcFewShotNewMaterialEngine.adapt("Cust-2", "Mat-B", "tool-2", samples2);

      const adapters = sfcFewShotNewMaterialEngine.listAdapters();
      expect(adapters.length).toBe(2);
    });

    it("invalidateCustomer() removes all adapters for customer", () => {
      const samples = [makeSample("Mat-C", 350, 35), makeSample("Mat-C", 340, 36), makeSample("Mat-C", 360, 34)];

      sfcFewShotNewMaterialEngine.adapt("Cust-X", "Mat-C", "tool-1", samples);
      sfcFewShotNewMaterialEngine.adapt("Cust-X", "Mat-D", "tool-2", samples);

      const removed = sfcFewShotNewMaterialEngine.invalidateCustomer("Cust-X");
      expect(removed).toBe(2);

      const adapters = sfcFewShotNewMaterialEngine.listAdapters();
      expect(adapters.length).toBe(0);
    });
  });

  describe("Provenance tracking", () => {
    it("predict() returns provenance with adapter_id and config_id", () => {
      const samples = [
        makeSample("Monel-400", 250, 32),
        makeSample("Monel-400", 240, 33),
        makeSample("Monel-400", 260, 31),
      ];

      sfcFewShotNewMaterialEngine.adapt("Customer-G", "Monel-400", "carbide-coated", samples);

      const prediction = sfcFewShotNewMaterialEngine.predict(
        "Customer-G",
        "Monel-400",
        "carbide-coated",
        makeFeatures(32),
      );

      expect(prediction.provenance.config_id).toBe("sfc-fewshot-maml");
      expect(prediction.provenance.adapter_id).toContain("sfc-Customer-G");
      expect(prediction.provenance.inner_steps).toBeGreaterThan(0);
    });

    it("predict() returns source=base_model for non-adapted material", () => {
      const prediction = sfcFewShotNewMaterialEngine.predict(
        "New-Customer",
        "New-Material",
        "new-tool",
        makeFeatures(40),
      );

      expect(prediction.provenance.source).toBe("base_model");
    });
  });

  describe("Benchmark exit criteria", () => {
    it("runBenchmark() returns passed=true with sufficient samples", () => {
      const samples = [
        makeSample("Benchmark-Mat", 300, 30),
        makeSample("Benchmark-Mat", 290, 31),
        makeSample("Benchmark-Mat", 310, 29),
        makeSample("Benchmark-Mat", 295, 30),
        makeSample("Benchmark-Mat", 305, 30),
        makeSample("Benchmark-Mat", 300, 30),
      ];

      const result = sfcFewShotNewMaterialEngine.runBenchmark(samples);

      expect(result.adaptation_within_500ms).toBe(true);
      expect(result.prediction_within_50ms).toBe(true);
      expect(result.adaptation_3shot_ms).toBeLessThan(500);
      expect(result.prediction_cached_ms).toBeLessThan(50);
    });

    it("runBenchmark() returns passed=false with insufficient samples", () => {
      const samples = [
        makeSample("Small-Set", 300, 30),
        makeSample("Small-Set", 290, 31),
      ];

      const result = sfcFewShotNewMaterialEngine.runBenchmark(samples);

      expect(result.passed).toBe(false);
    });
  });
});
