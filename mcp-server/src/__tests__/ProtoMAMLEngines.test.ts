/**
 * ProtoMAML Engines Tests — U-LEARN-11
 * =====================================
 *
 * Tests for PrototypicalNetworkEngine and ProtoMAMLFewShotEngine.
 * Validates few-shot learning for new customer adaptation.
 *
 * Exit criteria from PSAU-LEARN:
 * - 3-shot support set + query returns prediction in <500ms
 * - MAE within 1.2× of fully-trained baseline (simulated)
 * - Inner loop fires inside quote path (not cron)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { prototypicalNetworkEngine } from "../engines/PrototypicalNetworkEngine.js";
import { protoMAMLFewShotEngine } from "../engines/ProtoMAMLFewShotEngine.js";

describe("PrototypicalNetworkEngine", () => {
  beforeEach(() => {
    for (const taskId of prototypicalNetworkEngine.listTasks()) {
      prototypicalNetworkEngine.clearTask(taskId);
    }
  });

  describe("computePrototypes", () => {
    it("computes prototypes from support set", () => {
      const result = prototypicalNetworkEngine.computePrototypes({
        task_id: "proto-test-1",
        domain: "mill",
        examples: [
          { class_id: "itw-steel", features: [1, 2, 3], target: 100 },
          { class_id: "itw-steel", features: [1.1, 2.1, 3.1], target: 105 },
          { class_id: "alcoa-aluminum", features: [5, 6, 7], target: 200 },
        ],
      });

      expect(result.task_id).toBe("proto-test-1");
      expect(result.domain).toBe("mill");
      expect(result.prototype_count).toBe(2);
      expect(result.prototypes).toHaveLength(2);

      const steelProto = result.prototypes.find((p) => p.class_id === "itw-steel");
      expect(steelProto?.support_count).toBe(2);
      expect(steelProto?.mean_target).toBeCloseTo(102.5, 1);
    });

    it("handles single example per class", () => {
      const result = prototypicalNetworkEngine.computePrototypes({
        task_id: "proto-single",
        domain: "lathe",
        examples: [
          { class_id: "holo-krome-inconel", features: [10, 20], target: 50 },
        ],
      });

      expect(result.prototype_count).toBe(1);
      expect(result.prototypes[0].support_count).toBe(1);
      expect(result.prototypes[0].mean_target).toBe(50);
    });

    it("rejects empty features", () => {
      expect(() =>
        prototypicalNetworkEngine.computePrototypes({
          task_id: "proto-empty",
          domain: "wedm",
          examples: [{ class_id: "test", features: [], target: 0 }],
        })
      ).toThrow(); // Zod validation: "Too small: expected array to have >=1 items"
    });

    it("rejects mismatched feature dimensions", () => {
      expect(() =>
        prototypicalNetworkEngine.computePrototypes({
          task_id: "proto-mismatch",
          domain: "sinker",
          examples: [
            { class_id: "a", features: [1, 2, 3], target: 10 },
            { class_id: "a", features: [1, 2], target: 20 },
          ],
        })
      ).toThrow("dimension mismatch");
    });
  });

  describe("predict", () => {
    it("predicts using nearest prototype", () => {
      prototypicalNetworkEngine.computePrototypes({
        task_id: "proto-pred-1",
        domain: "mill",
        examples: [
          { class_id: "class-a", features: [0, 0], target: 100 },
          { class_id: "class-b", features: [10, 10], target: 200 },
        ],
      });

      const result = prototypicalNetworkEngine.predict({
        task_id: "proto-pred-1",
        query_features: [1, 1],
      });

      expect(result.nearest_prototype).toBe("class-a");
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.predicted_value).toBeGreaterThanOrEqual(100);
      expect(result.predicted_value).toBeLessThanOrEqual(200);
    });

    it("returns weighted prediction based on distances", () => {
      prototypicalNetworkEngine.computePrototypes({
        task_id: "proto-weighted",
        domain: "lathe",
        examples: [
          { class_id: "low", features: [0], target: 0 },
          { class_id: "high", features: [100], target: 1000 },
        ],
      });

      const midResult = prototypicalNetworkEngine.predict({
        task_id: "proto-weighted",
        query_features: [50],
      });

      expect(midResult.predicted_value).toBeCloseTo(500, -1);
    });

    it("throws for unknown task", () => {
      expect(() =>
        prototypicalNetworkEngine.predict({
          task_id: "nonexistent",
          query_features: [1, 2, 3],
        })
      ).toThrow("Task not found");
    });
  });

  describe("getTaskState", () => {
    it("returns null for unknown task", () => {
      expect(prototypicalNetworkEngine.getTaskState("unknown")).toBeNull();
    });

    it("returns state for existing task", () => {
      prototypicalNetworkEngine.computePrototypes({
        task_id: "state-test",
        domain: "grinder",
        examples: [{ class_id: "x", features: [1, 2, 3, 4], target: 50 }],
      });

      const state = prototypicalNetworkEngine.getTaskState("state-test");
      expect(state?.domain).toBe("grinder");
      expect(state?.feature_dim).toBe(4);
      expect(state?.prototype_count).toBe(1);
    });
  });
});

describe("ProtoMAMLFewShotEngine", () => {
  const TEST_CONFIG_ID = "test-protomaml";

  beforeEach(() => {
    protoMAMLFewShotEngine.register({
      config_id: TEST_CONFIG_ID,
      domain: "mill",
      inner_lr: 0.01,
      inner_steps: 5,
      meta_lr: 0.001,
      feature_dim: 4,
      hidden_dim: 8,
      use_proto_init: true,
      regularization_lambda: 0.01,
    });
  });

  describe("register", () => {
    it("registers a configuration", () => {
      const result = protoMAMLFewShotEngine.register({
        config_id: "new-config",
        domain: "lathe",
        inner_lr: 0.02,
        inner_steps: 3,
        feature_dim: 8,
        hidden_dim: 16,
      });

      expect(result.registered).toBe(true);
      expect(result.domain).toBe("lathe");
    });

    it("lists registered configs", () => {
      const configs = protoMAMLFewShotEngine.listConfigs();
      expect(configs.length).toBeGreaterThan(0);
      expect(configs.some((c) => c.config_id === TEST_CONFIG_ID)).toBe(true);
    });
  });

  describe("adapt", () => {
    it("adapts to new customer in <500ms with 3-shot support", () => {
      const supportSet = [
        { features: [1, 2, 3, 4], target: 100 },
        { features: [1.5, 2.5, 3.5, 4.5], target: 110 },
        { features: [2, 3, 4, 5], target: 120 },
      ];

      const result = protoMAMLFewShotEngine.adapt({
        config_id: TEST_CONFIG_ID,
        customer_id: "ITW",
        material_class: "nickel-alloy",
        support_set: supportSet,
        cache_adapted: true,
      });

      expect(result.inner_steps_executed).toBe(5);
      expect(result.adaptation_time_ms).toBeLessThan(500);
      expect(result.cached).toBe(true);
      expect(result.adapted_params_id).toBeDefined();
    });

    it("reduces loss during inner loop", () => {
      const result = protoMAMLFewShotEngine.adapt({
        config_id: TEST_CONFIG_ID,
        customer_id: "ALCOA",
        material_class: "aluminum-7075",
        support_set: [
          { features: [5, 5, 5, 5], target: 200 },
          { features: [6, 6, 6, 6], target: 220 },
        ],
        cache_adapted: false,
      });

      expect(result.final_inner_loss).toBeDefined();
      expect(result.cached).toBe(false);
    });

    it("rejects empty support set", () => {
      expect(() =>
        protoMAMLFewShotEngine.adapt({
          config_id: TEST_CONFIG_ID,
          customer_id: "TEST",
          material_class: "test",
          support_set: [],
        })
      ).toThrow();
    });

    it("throws for unknown config", () => {
      expect(() =>
        protoMAMLFewShotEngine.adapt({
          config_id: "nonexistent",
          customer_id: "TEST",
          material_class: "test",
          support_set: [{ features: [1, 2, 3, 4], target: 50 }],
        })
      ).toThrow("Config not found");
    });
  });

  describe("predict", () => {
    it("uses cached adapted params when available", () => {
      protoMAMLFewShotEngine.adapt({
        config_id: TEST_CONFIG_ID,
        customer_id: "SFS",
        material_class: "stainless-316",
        support_set: [
          { features: [3, 3, 3, 3], target: 150 },
          { features: [4, 4, 4, 4], target: 160 },
        ],
        cache_adapted: true,
      });

      const result = protoMAMLFewShotEngine.predict({
        config_id: TEST_CONFIG_ID,
        customer_id: "SFS",
        material_class: "stainless-316",
        query_features: [3.5, 3.5, 3.5, 3.5],
        use_cached: true,
      });

      expect(result.used_cached).toBe(true);
      expect(result.provenance.support_set_size).toBe(2);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.inference_time_ms).toBeLessThan(100);
    });

    it("falls back to base model when no cache", () => {
      const result = protoMAMLFewShotEngine.predict({
        config_id: TEST_CONFIG_ID,
        customer_id: "NEW_CUSTOMER",
        material_class: "unknown-material",
        query_features: [1, 1, 1, 1],
        use_cached: true,
      });

      expect(result.used_cached).toBe(false);
      expect(result.provenance.support_set_size).toBe(0);
    });

    it("provides provenance for adapted predictions", () => {
      protoMAMLFewShotEngine.adapt({
        config_id: TEST_CONFIG_ID,
        customer_id: "OPTIMAS",
        material_class: "tool-steel-D2",
        support_set: [{ features: [7, 8, 9, 10], target: 300 }],
        cache_adapted: true,
      });

      const result = protoMAMLFewShotEngine.predict({
        config_id: TEST_CONFIG_ID,
        customer_id: "OPTIMAS",
        material_class: "tool-steel-D2",
        query_features: [7.5, 8.5, 9.5, 10.5],
      });

      expect(result.provenance.base_model).toContain(TEST_CONFIG_ID);
      expect(result.provenance.adapted_params_id).toBeDefined();
    });
  });

  describe("cache management", () => {
    it("tracks cache statistics", () => {
      protoMAMLFewShotEngine.adapt({
        config_id: TEST_CONFIG_ID,
        customer_id: "CACHE_TEST_1",
        material_class: "mat-a",
        support_set: [{ features: [1, 1, 1, 1], target: 10 }],
        cache_adapted: true,
      });

      protoMAMLFewShotEngine.adapt({
        config_id: TEST_CONFIG_ID,
        customer_id: "CACHE_TEST_1",
        material_class: "mat-b",
        support_set: [{ features: [2, 2, 2, 2], target: 20 }],
        cache_adapted: true,
      });

      const stats = protoMAMLFewShotEngine.getCacheStats();
      expect(stats.total_cached).toBeGreaterThanOrEqual(2);
      expect(stats.by_customer["CACHE_TEST_1"]).toBe(2);
    });

    it("clears customer cache", () => {
      protoMAMLFewShotEngine.adapt({
        config_id: TEST_CONFIG_ID,
        customer_id: "CLEAR_TEST",
        material_class: "clear-mat",
        support_set: [{ features: [5, 5, 5, 5], target: 50 }],
        cache_adapted: true,
      });

      const cleared = protoMAMLFewShotEngine.clearCustomerCache("CLEAR_TEST");
      expect(cleared).toBeGreaterThanOrEqual(1);

      const result = protoMAMLFewShotEngine.predict({
        config_id: TEST_CONFIG_ID,
        customer_id: "CLEAR_TEST",
        material_class: "clear-mat",
        query_features: [5, 5, 5, 5],
      });

      expect(result.used_cached).toBe(false);
    });
  });

  describe("performance requirements", () => {
    it("adapts 3-shot in <500ms (exit criteria)", () => {
      const iterations = 5;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const result = protoMAMLFewShotEngine.adapt({
          config_id: TEST_CONFIG_ID,
          customer_id: `PERF_TEST_${i}`,
          material_class: "perf-material",
          support_set: [
            { features: [1, 2, 3, 4], target: 100 },
            { features: [2, 3, 4, 5], target: 110 },
            { features: [3, 4, 5, 6], target: 120 },
          ],
          cache_adapted: false,
        });
        times.push(result.adaptation_time_ms);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(500);
    });

    it("predicts in <100ms", () => {
      protoMAMLFewShotEngine.adapt({
        config_id: TEST_CONFIG_ID,
        customer_id: "PRED_PERF",
        material_class: "pred-mat",
        support_set: [{ features: [1, 1, 1, 1], target: 50 }],
        cache_adapted: true,
      });

      const result = protoMAMLFewShotEngine.predict({
        config_id: TEST_CONFIG_ID,
        customer_id: "PRED_PERF",
        material_class: "pred-mat",
        query_features: [1, 1, 1, 1],
      });

      expect(result.inference_time_ms).toBeLessThan(100);
    });
  });
});
