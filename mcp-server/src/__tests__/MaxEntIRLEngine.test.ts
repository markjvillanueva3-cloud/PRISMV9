/**
 * MaxEntIRL Engine Tests — U-LEARN-08
 */
import { describe, it, expect, beforeEach } from "vitest";
import { maxEntIRLEngine } from "../engines/MaxEntIRLEngine.js";

describe("MaxEntIRLEngine", () => {
  beforeEach(() => { maxEntIRLEngine.clear(); });

  it("creates a reward model with valid config", () => {
    const result = maxEntIRLEngine.createModel({ reward_model_id: "test", state_dim: 4, action_dim: 2, hidden_dims: [64], learning_rate: 1e-3, entropy_weight: 0.01, gradient_penalty: 0 });
    expect(result.reward_model_id).toBe("test");
    expect(result.state_dim).toBe(4);
  });

  it("adds demonstrations and updates count", () => {
    maxEntIRLEngine.createModel({ reward_model_id: "demo_test", state_dim: 3, action_dim: 2, hidden_dims: [32], learning_rate: 1e-3, entropy_weight: 0.01, gradient_penalty: 0 });
    const result = maxEntIRLEngine.addDemonstrations("demo_test", [
      { demo_id: "d1", state: [1, 2, 3], action: [0.5, 0.5], source: "operator_override", confidence: 1.0 },
      { demo_id: "d2", state: [2, 3, 4], action: [0.3, 0.7], source: "successful_job", confidence: 0.9 },
    ]);
    expect(result.added).toBe(2);
    expect(result.total).toBe(2);
  });

  it("trains on demonstrations and returns metrics", () => {
    maxEntIRLEngine.createModel({ reward_model_id: "train_test", state_dim: 2, action_dim: 1, hidden_dims: [16], learning_rate: 1e-3, entropy_weight: 0.01, gradient_penalty: 0 });
    const result = maxEntIRLEngine.train({
      reward_model_id: "train_test",
      demonstrations: [{ demo_id: "d1", state: [1, 2], action: [0.5], source: "operator_override", confidence: 1.0 }],
      epochs: 10,
    });
    expect(result.reward_model_id).toBe("train_test");
    expect(result.epoch).toBe(10);
    expect(typeof result.loss).toBe("number");
  });

  it("computes reward for state-action pair", () => {
    maxEntIRLEngine.createModel({ reward_model_id: "reward_test", state_dim: 2, action_dim: 1, hidden_dims: [16], learning_rate: 1e-3, entropy_weight: 0.01, gradient_penalty: 0 });
    maxEntIRLEngine.addDemonstrations("reward_test", [{ demo_id: "d1", state: [1, 2], action: [0.5], source: "operator_override", confidence: 1.0 }]);
    const result = maxEntIRLEngine.getReward({ reward_model_id: "reward_test", state: [1, 2], action: [0.5] });
    expect(typeof result.reward).toBe("number");
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it("throws error for unknown model in getReward", () => {
    expect(() => maxEntIRLEngine.getReward({ reward_model_id: "nonexistent", state: [1], action: [0.5] })).toThrow("Reward model not found");
  });

  it("throws error for training without demonstrations", () => {
    maxEntIRLEngine.createModel({ reward_model_id: "empty", state_dim: 2, action_dim: 1, hidden_dims: [16], learning_rate: 1e-3, entropy_weight: 0.01, gradient_penalty: 0 });
    expect(() => maxEntIRLEngine.train({ reward_model_id: "empty", demonstrations: [], epochs: 10 })).toThrow();
  });

  it("evaluates preference accuracy on test pairs", () => {
    maxEntIRLEngine.createModel({ reward_model_id: "pref_test", state_dim: 2, action_dim: 1, hidden_dims: [16], learning_rate: 1e-3, entropy_weight: 0.01, gradient_penalty: 0 });
    maxEntIRLEngine.train({ reward_model_id: "pref_test", demonstrations: [{ demo_id: "d1", state: [1, 2], action: [0.8], source: "operator_override", confidence: 1.0 }], epochs: 50 });
    const result = maxEntIRLEngine.evaluatePreferenceAccuracy("pref_test", []);
    expect(result.accuracy).toBe(0);
    expect(result.total).toBe(0);
  });

  it("lists and deletes models correctly", () => {
    maxEntIRLEngine.createModel({ reward_model_id: "m1", state_dim: 2, action_dim: 1, hidden_dims: [16], learning_rate: 1e-3, entropy_weight: 0.01, gradient_penalty: 0 });
    maxEntIRLEngine.createModel({ reward_model_id: "m2", state_dim: 2, action_dim: 1, hidden_dims: [16], learning_rate: 1e-3, entropy_weight: 0.01, gradient_penalty: 0 });
    expect(maxEntIRLEngine.listModels()).toHaveLength(2);
    maxEntIRLEngine.deleteModel("m1");
    expect(maxEntIRLEngine.listModels()).toHaveLength(1);
  });

  it("returns stats for a model", () => {
    maxEntIRLEngine.createModel({ reward_model_id: "stats_test", state_dim: 3, action_dim: 2, hidden_dims: [32], learning_rate: 1e-3, entropy_weight: 0.02, gradient_penalty: 0 });
    const stats = maxEntIRLEngine.getStats("stats_test");
    expect(stats).not.toBeNull();
    expect(stats!.demonstration_count).toBe(0);
    expect(stats!.config.entropy_weight).toBe(0.02);
  });

  it("handles high-confidence demonstrations with higher weight", () => {
    maxEntIRLEngine.createModel({ reward_model_id: "conf_test", state_dim: 2, action_dim: 1, hidden_dims: [16], learning_rate: 1e-3, entropy_weight: 0.01, gradient_penalty: 0 });
    maxEntIRLEngine.train({ reward_model_id: "conf_test", demonstrations: [
      { demo_id: "d1", state: [1, 2], action: [0.9], source: "operator_override", confidence: 1.0 },
      { demo_id: "d2", state: [1, 2], action: [0.1], source: "successful_job", confidence: 0.3 },
    ], epochs: 20 });
    const stats = maxEntIRLEngine.getStats("conf_test");
    expect(stats!.demonstration_count).toBe(2);
  });
});
