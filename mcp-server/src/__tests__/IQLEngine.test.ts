/**
 * IQL Engine Tests — U-LEARN-08
 * ==============================
 *
 * Tests for Implicit Q-Learning engine covering:
 * - Policy creation and configuration
 * - Training on batches of transitions
 * - Inference for action selection
 * - Expectile loss computation
 * - Edge cases and error handling
 *
 * @module __tests__/IQLEngine.test
 * @milestone PSAU P2.5-LEARN U-LEARN-08
 */

import { describe, it, expect, beforeEach } from "vitest";
import { iqlEngine } from "../engines/IQLEngine.js";

describe("IQLEngine", () => {
  beforeEach(() => {
    iqlEngine.clear();
  });

  it("creates a policy with valid configuration", () => {
    const result = iqlEngine.createPolicy({
      policy_id: "test_policy",
      state_dim: 8,
      action_dim: 4,
      hidden_dims: [256, 256],
      expectile: 0.7,
      temperature: 3.0,
      discount: 0.99,
      learning_rate: 3e-4,
      soft_target_tau: 0.005,
    });

    expect(result.policy_id).toBe("test_policy");
    expect(result.state_dim).toBe(8);
    expect(result.action_dim).toBe(4);
  });

  it("trains on a batch and returns loss metrics", () => {
    iqlEngine.createPolicy({
      policy_id: "train_test",
      state_dim: 4,
      action_dim: 2,
      hidden_dims: [64],
      expectile: 0.7,
      temperature: 3.0,
      discount: 0.99,
      learning_rate: 1e-3,
      soft_target_tau: 0.01,
    });

    const batch = {
      states: [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]],
      actions: [[0.5, 0.5], [0.3, 0.7], [0.8, 0.2]],
      rewards: [1.0, 0.5, -0.5],
      next_states: [[2, 3, 4, 5], [3, 4, 5, 6], [4, 5, 6, 7]],
      dones: [false, false, true],
    };

    const result = iqlEngine.train("train_test", batch);

    expect(result.policy_id).toBe("train_test");
    expect(result.step).toBe(1);
    expect(typeof result.v_loss).toBe("number");
    expect(typeof result.q_loss).toBe("number");
    expect(typeof result.policy_loss).toBe("number");
    expect(result.training_time_ms).toBeGreaterThan(0);
  });

  it("performs inference and returns action with Q-values", () => {
    iqlEngine.createPolicy({
      policy_id: "infer_test",
      state_dim: 4,
      action_dim: 2,
      hidden_dims: [32],
      expectile: 0.7,
      temperature: 3.0,
      discount: 0.99,
      learning_rate: 1e-3,
      soft_target_tau: 0.01,
    });

    const result = iqlEngine.infer({
      policy_id: "infer_test",
      state: [1.0, 2.0, 3.0, 4.0],
      return_distribution: false,
    });

    expect(result.policy_id).toBe("infer_test");
    expect(result.action).toHaveLength(2);
    expect(typeof result.q_value).toBe("number");
    expect(typeof result.v_value).toBe("number");
    expect(typeof result.advantage).toBe("number");
    expect(result.advantage).toBeCloseTo(result.q_value - result.v_value, 5);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("returns action distribution when requested", () => {
    iqlEngine.createPolicy({
      policy_id: "dist_test",
      state_dim: 3,
      action_dim: 2,
      hidden_dims: [32],
      expectile: 0.7,
      temperature: 3.0,
      discount: 0.99,
      learning_rate: 1e-3,
      soft_target_tau: 0.01,
    });

    const result = iqlEngine.infer({
      policy_id: "dist_test",
      state: [1.0, 2.0, 3.0],
      return_distribution: true,
    });

    expect(result.distribution).toBeDefined();
    expect(result.distribution!["action_0"]).toBeDefined();
    expect(result.distribution!["action_0_std"]).toBeDefined();
  });

  it("throws error for unknown policy during training", () => {
    expect(() => {
      iqlEngine.train("nonexistent", {
        states: [[1, 2]],
        actions: [[0.5]],
        rewards: [1.0],
        next_states: [[2, 3]],
        dones: [false],
      });
    }).toThrow("Policy not found: nonexistent");
  });

  it("throws error for unknown policy during inference", () => {
    expect(() => {
      iqlEngine.infer({
        policy_id: "nonexistent",
        state: [1, 2, 3],
        return_distribution: false,
      });
    }).toThrow("Policy not found: nonexistent");
  });

  it("accumulates training steps correctly", () => {
    iqlEngine.createPolicy({
      policy_id: "step_test",
      state_dim: 2,
      action_dim: 1,
      hidden_dims: [16],
      expectile: 0.7,
      temperature: 3.0,
      discount: 0.99,
      learning_rate: 1e-3,
      soft_target_tau: 0.01,
    });

    const batch = {
      states: [[1, 2]],
      actions: [[0.5]],
      rewards: [1.0],
      next_states: [[2, 3]],
      dones: [false],
    };

    iqlEngine.train("step_test", batch);
    iqlEngine.train("step_test", batch);
    const result = iqlEngine.train("step_test", batch);

    expect(result.step).toBe(3);
  });

  it("handles terminal states correctly in Q-target", () => {
    iqlEngine.createPolicy({
      policy_id: "terminal_test",
      state_dim: 2,
      action_dim: 1,
      hidden_dims: [16],
      expectile: 0.7,
      temperature: 3.0,
      discount: 0.99,
      learning_rate: 1e-3,
      soft_target_tau: 0.01,
    });

    const batch = {
      states: [[1, 2], [3, 4]],
      actions: [[0.5], [0.8]],
      rewards: [1.0, 10.0],
      next_states: [[2, 3], [4, 5]],
      dones: [false, true],
    };

    const result = iqlEngine.train("terminal_test", batch);
    expect(result.q_loss).toBeDefined();
    expect(Number.isFinite(result.q_loss)).toBe(true);
  });

  it("lists policies and deletes correctly", () => {
    iqlEngine.createPolicy({
      policy_id: "policy_a",
      state_dim: 2,
      action_dim: 1,
      hidden_dims: [16],
      expectile: 0.7,
      temperature: 3.0,
      discount: 0.99,
      learning_rate: 1e-3,
      soft_target_tau: 0.01,
    });
    iqlEngine.createPolicy({
      policy_id: "policy_b",
      state_dim: 2,
      action_dim: 1,
      hidden_dims: [16],
      expectile: 0.7,
      temperature: 3.0,
      discount: 0.99,
      learning_rate: 1e-3,
      soft_target_tau: 0.01,
    });

    expect(iqlEngine.listPolicies()).toHaveLength(2);
    expect(iqlEngine.listPolicies()).toContain("policy_a");

    iqlEngine.deletePolicy("policy_a");
    expect(iqlEngine.listPolicies()).toHaveLength(1);
    expect(iqlEngine.listPolicies()).not.toContain("policy_a");
  });

  it("returns stats for a policy", () => {
    iqlEngine.createPolicy({
      policy_id: "stats_test",
      state_dim: 4,
      action_dim: 2,
      hidden_dims: [32, 32],
      expectile: 0.8,
      temperature: 2.0,
      discount: 0.95,
      learning_rate: 1e-4,
      soft_target_tau: 0.01,
    });

    const stats = iqlEngine.getStats("stats_test");

    expect(stats).not.toBeNull();
    expect(stats!.policy_id).toBe("stats_test");
    expect(stats!.step).toBe(0);
    expect(stats!.config.expectile).toBe(0.8);
    expect(stats!.config.temperature).toBe(2.0);
  });

  it("actions are bounded by tanh activation", () => {
    iqlEngine.createPolicy({
      policy_id: "bound_test",
      state_dim: 4,
      action_dim: 3,
      hidden_dims: [64],
      expectile: 0.7,
      temperature: 3.0,
      discount: 0.99,
      learning_rate: 1e-3,
      soft_target_tau: 0.01,
    });

    const result = iqlEngine.infer({
      policy_id: "bound_test",
      state: [100, -100, 50, -50],
      return_distribution: false,
    });

    for (const a of result.action) {
      expect(a).toBeGreaterThanOrEqual(-1);
      expect(a).toBeLessThanOrEqual(1);
    }
  });
});
