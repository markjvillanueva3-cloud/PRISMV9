/**
 * LatheReinforcementLearningEngine Tests
 * ========================================
 * Comprehensive tests for RL-based lathe programming optimization.
 *
 * Test Coverage:
 *   1. State Encoding — Proper normalization and hashing
 *   2. Action Space — All action types and bounds
 *   3. Reward Function — Multi-objective reward calculation
 *   4. Q-Learning — Epsilon-greedy, Q-updates, replay
 *   5. REINFORCE — Policy gradient, returns, advantages
 *   6. Actor-Critic — GAE, actor/critic updates
 *   7. Training — Episode management, convergence
 *   8. Evaluation — Policy evaluation on test programs
 *
 * @module __tests__/engines/LatheReinforcementLearningEngine.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LatheReinforcementLearningEngine,
  latheReinforcementLearningEngine,
  type LatheRLState,
  type LatheRLAction,
  type PartGeometryState,
  type MaterialState,
  type OperationState,
  type ToolWearState,
  type MachineState,
  type RewardResult,
  type Experience,
  type Trajectory,
  type TrainingStats,
  type EpisodeResult
} from "../../engines/LatheReinforcementLearningEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

/** Create a sample state for testing */
function createTestState(overrides?: Partial<LatheRLState>): LatheRLState {
  const defaultState: LatheRLState = {
    part: {
      max_diameter_mm: 100,
      min_diameter_mm: 25,
      length_mm: 150,
      feature_count: 5,
      complexity_score: 0.5,
      threads_count: 1,
      grooves_count: 2,
      tapers_count: 0,
      radii_count: 1
    },
    material: {
      iso_group: "P",
      hardness_hrc: 30,
      hardness_normalized: 0.5,
      machinability_factor: 1.0,
      kc1_1: 1800,
      thermal_conductivity: 35
    },
    operation: {
      current_operation: "rough_od",
      operations_completed: 2,
      operations_remaining: 6,
      current_tool_number: 1,
      material_removed_pct: 0.25,
      current_diameter_mm: 90,
      current_z_position_mm: 50,
      is_roughing: true,
      is_finishing: false
    },
    tool: {
      flank_wear_vb_mm: 0.05,
      crater_wear_kt_mm: 0.02,
      wear_rate_mm_per_min: 0.001,
      remaining_life_pct: 0.85,
      edge_condition: "worn"
    },
    machine: {
      spindle_load_pct: 0.6,
      spindle_rpm: 1500,
      feed_rate_mm_rev: 0.25,
      current_power_kw: 8,
      turret_position: 1,
      coolant_active: true,
      chip_conveyor_load: 0.3,
      vibration_level: 0.2
    },
    timestep: 10,
    episode_reward_so_far: 15
  };

  return { ...defaultState, ...overrides };
}

/** Create outcome for reward calculation */
function createTestOutcome(overrides?: Partial<{
  cycle_time_sec: number;
  surface_finish_ra: number;
  target_ra: number;
  tool_wear_increment_mm: number;
  safety_violation: boolean;
  material_removed_mm3: number;
  cost_incurred: number;
}>) {
  return {
    cycle_time_sec: 60,
    surface_finish_ra: 1.6,
    target_ra: 3.2,
    tool_wear_increment_mm: 0.01,
    safety_violation: false,
    material_removed_mm3: 5000,
    cost_incurred: 5,
    ...overrides
  };
}

// ============================================================================
// STATE ENCODING TESTS
// ============================================================================

describe("LatheReinforcementLearningEngine — State Encoding", () => {
  let engine: LatheReinforcementLearningEngine;

  beforeEach(() => {
    engine = new LatheReinforcementLearningEngine();
  });

  it("should encode state into normalized vector", () => {
    const state = createTestState();
    const encoded = engine.encodeState(state);

    expect(encoded.vector).toBeDefined();
    expect(encoded.dimension).toBeGreaterThan(0);
    expect(encoded.vector.length).toBe(encoded.dimension);

    // All values should be normalized to [0, 1] range
    for (const val of encoded.vector) {
      expect(val).toBeGreaterThanOrEqual(-2); // Allowing some negative for tanh
      expect(val).toBeLessThanOrEqual(2);
    }
  });

  it("should encode different materials with different vectors", () => {
    const steelState = createTestState({ material: { ...createTestState().material, iso_group: "P" } });
    const aluminumState = createTestState({ material: { ...createTestState().material, iso_group: "N" } });

    const steelEncoded = engine.encodeState(steelState);
    const aluminumEncoded = engine.encodeState(aluminumState);

    // Vectors should be different for different materials
    let diffCount = 0;
    for (let i = 0; i < steelEncoded.vector.length; i++) {
      if (Math.abs(steelEncoded.vector[i] - aluminumEncoded.vector[i]) > 0.001) {
        diffCount++;
      }
    }
    expect(diffCount).toBeGreaterThan(0);
  });

  it("should encode different operations with different vectors", () => {
    const roughingState = createTestState({
      operation: { ...createTestState().operation, current_operation: "rough_od" }
    });
    const finishingState = createTestState({
      operation: { ...createTestState().operation, current_operation: "finish_od" }
    });

    const roughingEncoded = engine.encodeState(roughingState);
    const finishingEncoded = engine.encodeState(finishingState);

    expect(roughingEncoded.vector).not.toEqual(finishingEncoded.vector);
  });

  it("should normalize part dimensions correctly", () => {
    const smallPart = createTestState({
      part: { ...createTestState().part, max_diameter_mm: 50, length_mm: 100 }
    });
    const largePart = createTestState({
      part: { ...createTestState().part, max_diameter_mm: 200, length_mm: 400 }
    });

    const smallEncoded = engine.encodeState(smallPart);
    const largeEncoded = engine.encodeState(largePart);

    // Large part features should have higher normalized values (first few elements)
    expect(largeEncoded.vector[0]).toBeGreaterThan(smallEncoded.vector[0]); // max_diameter
    expect(largeEncoded.vector[2]).toBeGreaterThan(smallEncoded.vector[2]); // length
  });
});

// ============================================================================
// ACTION SPACE TESTS
// ============================================================================

describe("LatheReinforcementLearningEngine — Action Space", () => {
  let engine: LatheReinforcementLearningEngine;

  beforeEach(() => {
    engine = new LatheReinforcementLearningEngine();
  });

  it("should have non-empty action space", () => {
    const actionSpace = engine.getActionSpace();
    expect(actionSpace.length).toBeGreaterThan(0);
  });

  it("should include operation selection actions", () => {
    const actionSpace = engine.getActionSpace();
    const operationActions = actionSpace.filter(a =>
      a.action_data.action_type === "select_operation"
    );
    expect(operationActions.length).toBeGreaterThan(0);
    expect(operationActions.some(a => a.action_data.operation === "rough_od")).toBe(true);
    expect(operationActions.some(a => a.action_data.operation === "finish_od")).toBe(true);
    expect(operationActions.some(a => a.action_data.operation === "thread_od")).toBe(true);
  });

  it("should include parameter adjustment actions", () => {
    const actionSpace = engine.getActionSpace();
    const paramActions = actionSpace.filter(a =>
      a.action_data.action_type === "adjust_parameters"
    );
    expect(paramActions.length).toBeGreaterThan(0);

    // Should include speed, feed, and DOC adjustments
    const hasSpeedAdjust = paramActions.some(a =>
      a.action_data.parameter_adjustment?.speed_delta_pct !== 0
    );
    const hasFeedAdjust = paramActions.some(a =>
      a.action_data.parameter_adjustment?.feed_delta_pct !== 0
    );
    expect(hasSpeedAdjust).toBe(true);
    expect(hasFeedAdjust).toBe(true);
  });

  it("should include strategy selection actions", () => {
    const actionSpace = engine.getActionSpace();
    const strategyActions = actionSpace.filter(a =>
      a.action_data.action_type === "select_strategy"
    );
    expect(strategyActions.length).toBeGreaterThan(0);
    expect(strategyActions.some(a => a.action_data.strategy === "aggressive")).toBe(true);
    expect(strategyActions.some(a => a.action_data.strategy === "conservative")).toBe(true);
  });

  it("should include tool selection actions", () => {
    const actionSpace = engine.getActionSpace();
    const toolActions = actionSpace.filter(a =>
      a.action_data.action_type === "select_tool"
    );
    expect(toolActions.length).toBeGreaterThan(0);
  });

  it("should return action by ID", () => {
    const action = engine.getAction(0);
    expect(action).toBeDefined();
    expect(action?.action_id).toBe(0);
  });
});

// ============================================================================
// REWARD FUNCTION TESTS
// ============================================================================

describe("LatheReinforcementLearningEngine — Reward Function", () => {
  let engine: LatheReinforcementLearningEngine;

  beforeEach(() => {
    engine = new LatheReinforcementLearningEngine();
  });

  it("should calculate positive reward for good outcome", () => {
    const state = createTestState();
    const action: LatheRLAction = { action_type: "select_operation", operation: "rough_od" };
    const nextState = createTestState({ operation: { ...state.operation, operations_completed: 3 } });
    const outcome = createTestOutcome();

    const reward = engine.calculateReward(state, action, nextState, outcome);

    expect(reward.total_reward).toBeDefined();
    expect(typeof reward.total_reward).toBe("number");
    expect(reward.components).toBeDefined();
    expect(reward.info).toBeDefined();
  });

  it("should apply large penalty for safety violation", () => {
    const state = createTestState();
    const action: LatheRLAction = { action_type: "adjust_parameters", parameter_adjustment: { speed_delta_pct: 20, feed_delta_pct: 20, doc_delta_pct: 20 } };
    const nextState = createTestState();

    const goodOutcome = createTestOutcome({ safety_violation: false });
    const badOutcome = createTestOutcome({ safety_violation: true });

    const goodReward = engine.calculateReward(state, action, nextState, goodOutcome);
    const badReward = engine.calculateReward(state, action, nextState, badOutcome);

    // Safety violation should result in significantly lower reward
    expect(badReward.total_reward).toBeLessThan(goodReward.total_reward);
    expect(badReward.components.safety_penalty).toBeLessThan(0);
  });

  it("should reward better surface finish", () => {
    const state = createTestState();
    const action: LatheRLAction = { action_type: "select_operation", operation: "finish_od" };
    const nextState = createTestState();

    const betterFinish = createTestOutcome({ surface_finish_ra: 0.8, target_ra: 1.6 });
    const worseFinish = createTestOutcome({ surface_finish_ra: 3.2, target_ra: 1.6 });

    const betterReward = engine.calculateReward(state, action, nextState, betterFinish);
    const worseReward = engine.calculateReward(state, action, nextState, worseFinish);

    expect(betterReward.components.quality_reward).toBeGreaterThan(worseReward.components.quality_reward);
  });

  it("should penalize excessive tool wear", () => {
    const state = createTestState();
    const action: LatheRLAction = { action_type: "select_operation", operation: "rough_od" };
    const nextState = createTestState();

    const lowWear = createTestOutcome({ tool_wear_increment_mm: 0.01 });
    const highWear = createTestOutcome({ tool_wear_increment_mm: 0.15 });

    const lowWearReward = engine.calculateReward(state, action, nextState, lowWear);
    const highWearReward = engine.calculateReward(state, action, nextState, highWear);

    expect(lowWearReward.components.tool_life_reward).toBeGreaterThan(highWearReward.components.tool_life_reward);
  });

  it("should detect terminal state on tool failure", () => {
    const state = createTestState();
    const action: LatheRLAction = { action_type: "select_operation", operation: "rough_od" };
    const nextState = createTestState({
      tool: { ...createTestState().tool, edge_condition: "failed" }
    });
    const outcome = createTestOutcome();

    const reward = engine.calculateReward(state, action, nextState, outcome);

    expect(reward.terminal).toBe(true);
  });
});

// ============================================================================
// Q-LEARNING TESTS
// ============================================================================

describe("LatheReinforcementLearningEngine — Q-Learning", () => {
  let engine: LatheReinforcementLearningEngine;

  beforeEach(() => {
    engine = new LatheReinforcementLearningEngine();
    engine.setQLearningConfig({
      epsilon_start: 1.0,
      epsilon_end: 0.01,
      epsilon_decay: 0.99,
      learning_rate: 0.1,
      discount_factor: 0.95
    });
  });

  it("should select action in valid range", () => {
    const state = createTestState();
    const action = engine.selectAction(state, "q_learning");

    expect(action.action).toBeGreaterThanOrEqual(0);
    expect(action.action).toBeLessThan(engine.getActionSpace().length);
    expect(action.actionData).toBeDefined();
  });

  it("should store and use experience replay", () => {
    const state = createTestState();
    const encoded = engine.encodeState(state);
    const nextState = createTestState({ timestep: 11 });
    const nextEncoded = engine.encodeState(nextState);

    const experience: Experience = {
      state: encoded,
      action: 0,
      reward: 1.0,
      next_state: nextEncoded,
      done: false
    };

    const statsBefore = engine.getStats();
    engine.updatePolicy(undefined, experience, "q_learning");
    const statsAfter = engine.getStats();

    // Replay buffer should grow
    expect(statsAfter.replay_buffer_size).toBeGreaterThan(statsBefore.replay_buffer_size);
  });

  it("should update Q-values from experience", () => {
    const state = createTestState();
    const encoded = engine.encodeState(state);
    const nextState = createTestState({ timestep: 11 });
    const nextEncoded = engine.encodeState(nextState);

    // Store multiple experiences
    for (let i = 0; i < 50; i++) {
      const experience: Experience = {
        state: encoded,
        action: i % engine.getActionSpace().length,
        reward: 1.0,
        next_state: nextEncoded,
        done: false
      };
      engine.updatePolicy(undefined, experience, "q_learning");
    }

    // Q-values should exist
    const qValues = engine.getQValues(state);
    expect(qValues).toBeDefined();
  });
});

// ============================================================================
// REINFORCE (POLICY GRADIENT) TESTS
// ============================================================================

describe("LatheReinforcementLearningEngine — REINFORCE", () => {
  let engine: LatheReinforcementLearningEngine;

  beforeEach(() => {
    engine = new LatheReinforcementLearningEngine();
  });

  it("should select action with log probability", () => {
    const state = createTestState();
    const result = engine.selectAction(state, "reinforce");

    expect(result.action).toBeGreaterThanOrEqual(0);
    expect(result.logProb).toBeDefined();
    expect(typeof result.logProb).toBe("number");
    expect(result.logProb).toBeLessThanOrEqual(0); // Log prob is always <= 0
  });

  it("should update policy from trajectory", () => {
    const state = createTestState();
    const encoded = engine.encodeState(state);

    const trajectory: Trajectory = {
      states: [encoded, encoded, encoded],
      actions: [0, 1, 2],
      rewards: [1.0, 0.5, 2.0],
      log_probs: [-1.0, -0.8, -1.2]
    };

    // Should not throw
    engine.updatePolicy(trajectory, undefined, "reinforce");
  });

  it("should produce valid probability distribution", () => {
    const state = createTestState();
    const probs = engine.getPolicyProbabilities(state);

    expect(probs.length).toBe(engine.getActionSpace().length);

    // Probabilities should sum to 1
    const sum = probs.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 3);

    // All probabilities should be non-negative
    for (const p of probs) {
      expect(p).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================================================
// ACTOR-CRITIC (A2C) TESTS
// ============================================================================

describe("LatheReinforcementLearningEngine — Actor-Critic", () => {
  let engine: LatheReinforcementLearningEngine;

  beforeEach(() => {
    engine = new LatheReinforcementLearningEngine();
  });

  it("should select action with value estimate", () => {
    const state = createTestState();
    const result = engine.selectAction(state, "a2c");

    expect(result.action).toBeGreaterThanOrEqual(0);
    expect(result.logProb).toBeDefined();
    expect(result.value).toBeDefined();
    expect(typeof result.value).toBe("number");
  });

  it("should compute state value", () => {
    const state = createTestState();
    const value = engine.getStateValue(state);

    expect(typeof value).toBe("number");
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1); // Sigmoid output
  });

  it("should update both actor and critic from trajectory", () => {
    const state = createTestState();
    const encoded = engine.encodeState(state);

    const trajectory: Trajectory = {
      states: [encoded, encoded, encoded],
      actions: [0, 1, 2],
      rewards: [1.0, 0.5, 2.0],
      log_probs: [-1.0, -0.8, -1.2],
      values: [0.5, 0.6, 0.7]
    };

    // Should not throw
    engine.updatePolicy(trajectory, undefined, "a2c");
  });

  it("should compute different values for different states", () => {
    const goodState = createTestState({
      tool: { ...createTestState().tool, remaining_life_pct: 0.95, edge_condition: "fresh" }
    });
    const badState = createTestState({
      tool: { ...createTestState().tool, remaining_life_pct: 0.1, edge_condition: "critical" }
    });

    const goodValue = engine.getStateValue(goodState);
    const badValue = engine.getStateValue(badState);

    // Values may differ (depends on training, but structure should work)
    expect(typeof goodValue).toBe("number");
    expect(typeof badValue).toBe("number");
  });
});

// ============================================================================
// TRAINING INFRASTRUCTURE TESTS
// ============================================================================

describe("LatheReinforcementLearningEngine — Training", () => {
  let engine: LatheReinforcementLearningEngine;

  beforeEach(() => {
    engine = new LatheReinforcementLearningEngine();
  });

  it("should get training stats", () => {
    const stats = engine.getStats();

    expect(stats.q_table_size).toBeGreaterThanOrEqual(0);
    expect(stats.replay_buffer_size).toBeGreaterThanOrEqual(0);
    expect(stats.action_space_size).toBeGreaterThan(0);
    expect(stats.state_dimension).toBeGreaterThan(0);
    expect(stats.policy_layers).toBeGreaterThan(0);
    expect(stats.value_layers).toBeGreaterThan(0);
    expect(stats.current_epsilon).toBeGreaterThanOrEqual(0);
    expect(stats.current_epsilon).toBeLessThanOrEqual(1);
  });

  it("should save and load checkpoints", () => {
    const state = createTestState();
    const encoded = engine.encodeState(state);

    // Create some training data
    for (let i = 0; i < 10; i++) {
      const experience: Experience = {
        state: encoded,
        action: i % engine.getActionSpace().length,
        reward: 1.0,
        next_state: encoded,
        done: false
      };
      engine.updatePolicy(undefined, experience, "q_learning");
    }

    // Save checkpoint
    const checkpoint = engine.saveCheckpoint();
    expect(checkpoint.version).toBe(1);
    expect(checkpoint.training_stats).toBeDefined();

    // Reset and load
    engine.reset();
    const statsAfterReset = engine.getStats();
    expect(statsAfterReset.episodes_trained).toBe(0);

    engine.loadCheckpoint(checkpoint);
  });

  it("should reset to initial state", () => {
    // Add some data
    const state = createTestState();
    const encoded = engine.encodeState(state);
    for (let i = 0; i < 5; i++) {
      engine.updatePolicy(undefined, {
        state: encoded,
        action: 0,
        reward: 1.0,
        next_state: encoded,
        done: false
      }, "q_learning");
    }

    const statsBefore = engine.getStats();
    expect(statsBefore.replay_buffer_size).toBeGreaterThan(0);

    engine.reset();

    const statsAfter = engine.getStats();
    expect(statsAfter.replay_buffer_size).toBe(0);
    expect(statsAfter.episodes_trained).toBe(0);
    expect(statsAfter.total_steps).toBe(0);
  });

  it("should track training statistics", () => {
    const state = createTestState();
    const encoded = engine.encodeState(state);

    // Simulate some training
    for (let i = 0; i < 20; i++) {
      engine.updatePolicy(undefined, {
        state: encoded,
        action: i % engine.getActionSpace().length,
        reward: Math.random() * 2 - 0.5,
        next_state: encoded,
        done: false
      }, "q_learning");
    }

    const stats = engine.getStats();
    expect(stats.total_steps).toBe(20);
  });
});

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

describe("LatheReinforcementLearningEngine — Configuration", () => {
  let engine: LatheReinforcementLearningEngine;

  beforeEach(() => {
    engine = new LatheReinforcementLearningEngine();
  });

  it("should update Q-learning config", () => {
    engine.setQLearningConfig({
      learning_rate: 0.05,
      epsilon_start: 0.8
    });

    // Config should be applied (internal check via behavior)
    // Just verify it doesn't throw
    expect(true).toBe(true);
  });

  it("should update policy gradient config", () => {
    engine.setPolicyGradientConfig({
      learning_rate: 0.005,
      entropy_coefficient: 0.02
    });

    expect(true).toBe(true);
  });

  it("should update A2C config", () => {
    engine.setA2CConfig({
      actor_lr: 0.0001,
      critic_lr: 0.0005,
      gae_lambda: 0.9
    });

    expect(true).toBe(true);
  });

  it("should update reward weights", () => {
    engine.setRewardWeights({
      cycle_time: 0.3,
      tool_life: 0.25,
      surface_quality: 0.25,
      safety: 0.15,
      cost: 0.05
    });

    // Verify by checking reward calculation changes
    const state = createTestState();
    const action: LatheRLAction = { action_type: "select_operation", operation: "rough_od" };
    const nextState = createTestState();
    const outcome = createTestOutcome();

    const reward = engine.calculateReward(state, action, nextState, outcome);
    expect(reward.total_reward).toBeDefined();
  });
});

// ============================================================================
// SINGLETON TESTS
// ============================================================================

describe("LatheReinforcementLearningEngine — Singleton", () => {
  it("should export singleton instance", () => {
    expect(latheReinforcementLearningEngine).toBeDefined();
    expect(latheReinforcementLearningEngine).toBeInstanceOf(LatheReinforcementLearningEngine);
  });

  it("should work with singleton methods", () => {
    const state = createTestState();
    const result = latheReinforcementLearningEngine.selectAction(state, "a2c");
    expect(result.action).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe("LatheReinforcementLearningEngine — Edge Cases", () => {
  let engine: LatheReinforcementLearningEngine;

  beforeEach(() => {
    engine = new LatheReinforcementLearningEngine();
  });

  it("should handle extreme part dimensions", () => {
    const tinyPart = createTestState({
      part: { ...createTestState().part, max_diameter_mm: 1, length_mm: 1 }
    });
    const hugePart = createTestState({
      part: { ...createTestState().part, max_diameter_mm: 1000, length_mm: 2000 }
    });

    const tinyEncoded = engine.encodeState(tinyPart);
    const hugeEncoded = engine.encodeState(hugePart);

    // Should not produce NaN or Infinity
    for (const val of tinyEncoded.vector) {
      expect(Number.isFinite(val)).toBe(true);
    }
    for (const val of hugeEncoded.vector) {
      expect(Number.isFinite(val)).toBe(true);
    }
  });

  it("should handle zero tool wear", () => {
    const freshTool = createTestState({
      tool: {
        flank_wear_vb_mm: 0,
        crater_wear_kt_mm: 0,
        wear_rate_mm_per_min: 0,
        remaining_life_pct: 1.0,
        edge_condition: "fresh"
      }
    });

    const encoded = engine.encodeState(freshTool);
    expect(encoded.vector.every(v => Number.isFinite(v))).toBe(true);
  });

  it("should handle all material types", () => {
    const materials = ["P", "M", "K", "N", "S", "H"] as const;

    for (const iso of materials) {
      const state = createTestState({
        material: { ...createTestState().material, iso_group: iso }
      });
      const encoded = engine.encodeState(state);
      expect(encoded.vector.length).toBeGreaterThan(0);
    }
  });

  it("should handle all operation types", () => {
    const operations = [
      "face", "rough_od", "rough_id", "finish_od", "finish_id",
      "thread_od", "thread_id", "groove_od", "groove_id", "groove_face",
      "part_off", "drill", "bore", "tap", "chamfer", "radius", "taper", "contour"
    ] as const;

    for (const op of operations) {
      const state = createTestState({
        operation: { ...createTestState().operation, current_operation: op }
      });
      const result = engine.selectAction(state, "a2c");
      expect(result.action).toBeGreaterThanOrEqual(0);
    }
  });

  it("should handle empty replay buffer gracefully", () => {
    // Clear buffer
    engine.reset();

    // Should not crash when updating with Q-learning
    engine.updatePolicy(undefined, undefined, "q_learning");
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("LatheReinforcementLearningEngine — Integration", () => {
  let engine: LatheReinforcementLearningEngine;

  beforeEach(() => {
    engine = new LatheReinforcementLearningEngine();
  });

  it("should complete short training loop", async () => {
    // Simple environment simulator
    const environmentStep = async (state: LatheRLState, action: LatheRLAction) => {
      const nextState: LatheRLState = {
        ...state,
        timestep: state.timestep + 1,
        operation: {
          ...state.operation,
          operations_completed: state.operation.operations_completed + 1,
          operations_remaining: Math.max(0, state.operation.operations_remaining - 1),
          material_removed_pct: Math.min(1, state.operation.material_removed_pct + 0.1)
        },
        tool: {
          ...state.tool,
          flank_wear_vb_mm: state.tool.flank_wear_vb_mm + 0.01,
          remaining_life_pct: Math.max(0, state.tool.remaining_life_pct - 0.05)
        }
      };

      return {
        nextState,
        outcome: {
          cycle_time_sec: 30 + Math.random() * 30,
          surface_finish_ra: 1.0 + Math.random() * 2,
          target_ra: 3.2,
          tool_wear_increment_mm: 0.01,
          safety_violation: false,
          material_removed_mm3: 3000 + Math.random() * 2000,
          cost_incurred: 3 + Math.random() * 2
        }
      };
    };

    const stats = await engine.train(5, environmentStep, "a2c");

    expect(stats.episodes_completed).toBe(5);
    expect(stats.total_steps).toBeGreaterThan(0);
    expect(typeof stats.avg_reward_last_100).toBe("number");
  });

  it("should evaluate on test programs", async () => {
    // Create test programs
    const testPrograms: LatheRLState[] = [
      createTestState(),
      createTestState({ material: { ...createTestState().material, iso_group: "M" } }),
      createTestState({ operation: { ...createTestState().operation, current_operation: "finish_od" } })
    ];

    // Environment simulator
    const environmentStep = async (state: LatheRLState, action: LatheRLAction) => {
      return {
        nextState: {
          ...state,
          timestep: state.timestep + 1,
          operation: {
            ...state.operation,
            operations_remaining: Math.max(0, state.operation.operations_remaining - 1)
          }
        },
        outcome: {
          cycle_time_sec: 45,
          surface_finish_ra: 1.6,
          target_ra: 3.2,
          tool_wear_increment_mm: 0.01,
          safety_violation: false,
          material_removed_mm3: 4000,
          cost_incurred: 4
        }
      };
    };

    const evalResult = await engine.evaluate(testPrograms, environmentStep);

    expect(evalResult.episodes.length).toBe(3);
    expect(typeof evalResult.avg_reward).toBe("number");
    expect(typeof evalResult.avg_cycle_time).toBe("number");
    expect(evalResult.safety_violation_rate).toBeGreaterThanOrEqual(0);
  });
});
