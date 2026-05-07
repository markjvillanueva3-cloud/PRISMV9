/**
 * ProtoMAMLFewShotEngine Tests — U-LEARN-11
 */

import { describe, it, expect, beforeEach } from "vitest";
import { protoMAMLFewShotEngine } from "../engines/ProtoMAMLFewShotEngine.js";

describe("ProtoMAMLFewShotEngine", () => {
  const TEST_CONFIG_ID = "test-protomaml";

  beforeEach(() => {
    protoMAMLFewShotEngine.register({
      config_id: TEST_CONFIG_ID,
      domain: "mill",
      inner_lr: 0.01,
      inner_steps: 5,
      feature_dim: 4,
      hidden_dim: 8,
      use_proto_init: true,
      regularization_lambda: 0.01,
    });
  });

  it("registers a configuration", () => {
    const result = protoMAMLFewShotEngine.register({ config_id: "new-cfg", domain: "lathe", inner_lr: 0.02, inner_steps: 3, feature_dim: 8, hidden_dim: 16 });
    expect(result.registered).toBe(true);
    expect(result.domain).toBe("lathe");
  });

  it("lists registered configs", () => {
    const configs = protoMAMLFewShotEngine.listConfigs();
    expect(configs.some((c) => c.config_id === TEST_CONFIG_ID)).toBe(true);
  });

  it("adapts to new customer with 3-shot support", () => {
    const result = protoMAMLFewShotEngine.adapt({
      config_id: TEST_CONFIG_ID,
      customer_id: "ITW",
      material_class: "nickel-alloy",
      support_set: [
        { features: [1, 2, 3, 4], target: 100 },
        { features: [1.5, 2.5, 3.5, 4.5], target: 110 },
        { features: [2, 3, 4, 5], target: 120 },
      ],
      cache_adapted: true,
    });
    expect(result.inner_steps_executed).toBe(5);
    expect(result.cached).toBe(true);
  });

  it("adapts in <500ms (exit criteria)", () => {
    const result = protoMAMLFewShotEngine.adapt({
      config_id: TEST_CONFIG_ID,
      customer_id: "PERF",
      material_class: "perf-mat",
      support_set: [{ features: [1, 2, 3, 4], target: 100 }, { features: [2, 3, 4, 5], target: 110 }, { features: [3, 4, 5, 6], target: 120 }],
      cache_adapted: false,
    });
    expect(result.adaptation_time_ms).toBeLessThan(500);
  });

  it("rejects empty support set", () => {
    expect(() => protoMAMLFewShotEngine.adapt({ config_id: TEST_CONFIG_ID, customer_id: "TEST", material_class: "test", support_set: [] })).toThrow();
  });

  it("throws for unknown config in adapt", () => {
    expect(() => protoMAMLFewShotEngine.adapt({ config_id: "nonexistent", customer_id: "T", material_class: "t", support_set: [{ features: [1, 2, 3, 4], target: 50 }] })).toThrow("Config not found");
  });

  it("uses cached adapted params when available", () => {
    protoMAMLFewShotEngine.adapt({ config_id: TEST_CONFIG_ID, customer_id: "SFS", material_class: "ss-316", support_set: [{ features: [3, 3, 3, 3], target: 150 }], cache_adapted: true });
    const result = protoMAMLFewShotEngine.predict({ config_id: TEST_CONFIG_ID, customer_id: "SFS", material_class: "ss-316", query_features: [3.5, 3.5, 3.5, 3.5], use_cached: true });
    expect(result.used_cached).toBe(true);
    expect(result.provenance.support_set_size).toBe(1);
  });

  it("falls back to base model when no cache", () => {
    const result = protoMAMLFewShotEngine.predict({ config_id: TEST_CONFIG_ID, customer_id: "NEW", material_class: "unknown", query_features: [1, 1, 1, 1], use_cached: true });
    expect(result.used_cached).toBe(false);
    expect(result.provenance.support_set_size).toBe(0);
  });

  it("predicts in <100ms", () => {
    protoMAMLFewShotEngine.adapt({ config_id: TEST_CONFIG_ID, customer_id: "FAST", material_class: "fast-mat", support_set: [{ features: [1, 1, 1, 1], target: 50 }], cache_adapted: true });
    const result = protoMAMLFewShotEngine.predict({ config_id: TEST_CONFIG_ID, customer_id: "FAST", material_class: "fast-mat", query_features: [1, 1, 1, 1] });
    expect(result.inference_time_ms).toBeLessThan(100);
  });

  it("tracks cache statistics", () => {
    protoMAMLFewShotEngine.adapt({ config_id: TEST_CONFIG_ID, customer_id: "STATS", material_class: "mat-a", support_set: [{ features: [1, 1, 1, 1], target: 10 }], cache_adapted: true });
    const stats = protoMAMLFewShotEngine.getCacheStats();
    expect(stats.total_cached).toBeGreaterThanOrEqual(1);
    expect(stats.by_customer["STATS"]).toBe(1);
  });

  it("clears customer cache", () => {
    protoMAMLFewShotEngine.adapt({ config_id: TEST_CONFIG_ID, customer_id: "CLEAR", material_class: "clr", support_set: [{ features: [5, 5, 5, 5], target: 50 }], cache_adapted: true });
    const cleared = protoMAMLFewShotEngine.clearCustomerCache("CLEAR");
    expect(cleared).toBeGreaterThanOrEqual(1);
    const result = protoMAMLFewShotEngine.predict({ config_id: TEST_CONFIG_ID, customer_id: "CLEAR", material_class: "clr", query_features: [5, 5, 5, 5] });
    expect(result.used_cached).toBe(false);
  });

  it("provides provenance for adapted predictions", () => {
    protoMAMLFewShotEngine.adapt({ config_id: TEST_CONFIG_ID, customer_id: "PROV", material_class: "D2", support_set: [{ features: [7, 8, 9, 10], target: 300 }], cache_adapted: true });
    const result = protoMAMLFewShotEngine.predict({ config_id: TEST_CONFIG_ID, customer_id: "PROV", material_class: "D2", query_features: [7.5, 8.5, 9.5, 10.5] });
    expect(result.provenance.base_model).toContain(TEST_CONFIG_ID);
    expect(result.provenance.adapted_params_id).toBeDefined();
  });
});
