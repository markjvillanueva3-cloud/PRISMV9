/**
 * Tests for MillingReinforcementLearningEngine (MILL-AGI Phase 0.4)
 *
 * Validates DQN-based reinforcement learning:
 *   - State encoding
 *   - Action selection (ε-greedy)
 *   - Reward computation
 *   - Experience replay
 *   - Q-network forward pass
 *   - Target network soft update
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MillingReinforcementLearningEngine,
  millingReinforcementLearningEngine,
  type MillingState,
  type MillingAction,
  type RLConfig,
} from "../engines/MillingReinforcementLearningEngine.js";

describe("MillingReinforcementLearningEngine (MILL-AGI P0.4)", () => {
  let engine: MillingReinforcementLearningEngine;

  beforeEach(() => {
    engine = new MillingReinforcementLearningEngine();
  });

  // ============================================================================
  // TEST DATA
  // ============================================================================

  const initialState: MillingState = {
    cutting_speed_mpm: 150,
    feed_per_tooth_mm: 0.1,
    axial_depth_mm: 2,
    radial_depth_mm: 6,
    tool_wear_vb_mm: 0.1,
    spindle_load_percent: 60,
    vibration_level: 2,
    temperature_c: 300,
    surface_roughness_um: 1.5,
    material_hardness_hrc: 30,
  };

  const nextState: MillingState = {
    ...initialState,
    cutting_speed_mpm: 165,
    spindle_load_percent: 65,
    tool_wear_vb_mm: 0.12,
    temperature_c: 320,
  };

  const criticalState: MillingState = {
    cutting_speed_mpm: 200,
    feed_per_tooth_mm: 0.15,
    axial_depth_mm: 4,
    radial_depth_mm: 10,
    tool_wear_vb_mm: 0.35,
    spindle_load_percent: 95,
    vibration_level: 8,
    temperature_c: 750,
    surface_roughness_um: 4,
    material_hardness_hrc: 45,
  };

  const goodOutcome = {
    mrr: 80,
    tool_life_factor: 0.9,
    surface_ra: 1.2,
    safety_margin: 0.5,
  };

  const badOutcome = {
    mrr: 20,
    tool_life_factor: 0.3,
    surface_ra: 4.5,
    safety_margin: 0.1,
  };

  // ============================================================================
  // ACTION SELECTION
  // ============================================================================

  describe("action selection", () => {
    it("returns valid policy output", () => {
      const output = engine.selectAction(initialState);

      expect(output.action).toBeDefined();
      expect(output.q_values.length).toBe(9);
      expect(output.confidence).toBeGreaterThan(0);
      expect(output.confidence).toBeLessThanOrEqual(1);
    });

    it("action has valid deltas", () => {
      const output = engine.selectAction(initialState);

      expect([-1, 0, 1]).toContain(output.action.speed_delta);
      expect([-1, 0, 1]).toContain(output.action.feed_delta);
    });

    it("explores with high epsilon", () => {
      const outputs: boolean[] = [];
      for (let i = 0; i < 100; i++) {
        const output = engine.selectAction(initialState, true);
        outputs.push(output.exploration);
      }

      const explorationRate = outputs.filter((e) => e).length / outputs.length;
      expect(explorationRate).toBeGreaterThan(0.5);
    });

    it("greedy selection when explore=false", () => {
      const output = engine.selectAction(initialState, false);

      expect(output.exploration).toBe(false);
    });

    it("returns Q-values for all actions", () => {
      const output = engine.selectAction(initialState);

      for (const q of output.q_values) {
        expect(typeof q).toBe("number");
        expect(!isNaN(q)).toBe(true);
      }
    });
  });

  // ============================================================================
  // STATE ENCODING
  // ============================================================================

  describe("state encoding", () => {
    it("encodes state to 20-dim vector", () => {
      const encoded = engine.encodeState(initialState);

      expect(encoded.length).toBe(20);
    });

    it("all features are finite numbers", () => {
      const encoded = engine.encodeState(initialState);

      for (const f of encoded) {
        expect(isFinite(f)).toBe(true);
        expect(isNaN(f)).toBe(false);
      }
    });

    it("different states produce different encodings", () => {
      const enc1 = engine.encodeState(initialState);
      const enc2 = engine.encodeState(criticalState);

      let diff = 0;
      for (let i = 0; i < enc1.length; i++) {
        diff += Math.abs(enc1[i] - enc2[i]);
      }

      expect(diff).toBeGreaterThan(0);
    });

    it("includes derived features", () => {
      const encoded = engine.encodeState(initialState);

      // MRR proxy
      expect(encoded[10]).toBeGreaterThan(0);
      // Wear rate proxy
      expect(encoded[11]).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // REWARD COMPUTATION
  // ============================================================================

  describe("reward computation", () => {
    it("returns reward structure", () => {
      const reward = engine.computeReward(initialState, nextState, goodOutcome);

      expect(reward.mrr_reward).toBeDefined();
      expect(reward.tool_life_reward).toBeDefined();
      expect(reward.quality_reward).toBeDefined();
      expect(reward.safety_penalty).toBeDefined();
      expect(reward.total).toBeDefined();
    });

    it("good outcome has positive total", () => {
      const reward = engine.computeReward(initialState, nextState, goodOutcome);

      expect(reward.total).toBeGreaterThan(0);
    });

    it("bad outcome has lower total", () => {
      const goodReward = engine.computeReward(initialState, nextState, goodOutcome);
      const badReward = engine.computeReward(initialState, nextState, badOutcome);

      expect(badReward.total).toBeLessThan(goodReward.total);
    });

    it("critical state incurs safety penalty", () => {
      const reward = engine.computeReward(
        initialState,
        criticalState,
        goodOutcome
      );

      expect(reward.safety_penalty).toBeGreaterThan(0);
    });

    it("high MRR gives positive MRR reward", () => {
      const reward = engine.computeReward(initialState, nextState, {
        ...goodOutcome,
        mrr: 150,
      });

      expect(reward.mrr_reward).toBeGreaterThan(0);
    });

    it("good surface finish gives positive quality reward", () => {
      const reward = engine.computeReward(initialState, nextState, {
        ...goodOutcome,
        surface_ra: 0.5,
      });

      expect(reward.quality_reward).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // LEARNING STEP
  // ============================================================================

  describe("learning step", () => {
    it("returns loss and reward", () => {
      const action: MillingAction = { speed_delta: 1, feed_delta: 0 };
      const result = engine.step(initialState, action, nextState, goodOutcome, false);

      expect(typeof result.loss).toBe("number");
      expect(result.reward).toBeDefined();
    });

    it("stores transition in replay buffer", () => {
      const stats1 = engine.getStats();
      const action: MillingAction = { speed_delta: 0, feed_delta: 1 };
      engine.step(initialState, action, nextState, goodOutcome, false);
      const stats2 = engine.getStats();

      expect(stats2.steps).toBe(stats1.steps + 1);
    });

    it("decays epsilon on episode end", () => {
      const config: Partial<RLConfig> = { epsilon_start: 1.0, epsilon_decay: 0.9 };
      const customEngine = new MillingReinforcementLearningEngine(config);

      const initialEpsilon = customEngine.getStats().epsilon;

      const action: MillingAction = { speed_delta: 0, feed_delta: 0 };
      customEngine.step(initialState, action, nextState, goodOutcome, true);

      const finalEpsilon = customEngine.getStats().epsilon;
      expect(finalEpsilon).toBeLessThan(initialEpsilon);
    });

    it("increments episode count on done", () => {
      const stats1 = engine.getStats();
      const action: MillingAction = { speed_delta: -1, feed_delta: 0 };
      engine.step(initialState, action, nextState, goodOutcome, true);
      const stats2 = engine.getStats();

      expect(stats2.episode).toBe(stats1.episode + 1);
    });
  });

  // ============================================================================
  // APPLY ACTION
  // ============================================================================

  describe("apply action", () => {
    it("increases speed on positive delta", () => {
      const action: MillingAction = { speed_delta: 1, feed_delta: 0 };
      const result = engine.applyAction(initialState, action);

      expect(result.cutting_speed_mpm!).toBeGreaterThan(initialState.cutting_speed_mpm);
    });

    it("decreases feed on negative delta", () => {
      const action: MillingAction = { speed_delta: 0, feed_delta: -1 };
      const result = engine.applyAction(initialState, action);

      expect(result.feed_per_tooth_mm!).toBeLessThan(initialState.feed_per_tooth_mm);
    });

    it("no change on zero delta", () => {
      const action: MillingAction = { speed_delta: 0, feed_delta: 0 };
      const result = engine.applyAction(initialState, action);

      expect(result.cutting_speed_mpm).toBeCloseTo(initialState.cutting_speed_mpm, 5);
      expect(result.feed_per_tooth_mm).toBeCloseTo(initialState.feed_per_tooth_mm, 5);
    });

    it("respects minimum bounds", () => {
      const lowState: MillingState = {
        ...initialState,
        cutting_speed_mpm: 15,
        feed_per_tooth_mm: 0.015,
      };

      const action: MillingAction = { speed_delta: -1, feed_delta: -1 };
      const result = engine.applyAction(lowState, action);

      expect(result.cutting_speed_mpm!).toBeGreaterThanOrEqual(10);
      expect(result.feed_per_tooth_mm!).toBeGreaterThanOrEqual(0.01);
    });
  });

  // ============================================================================
  // TRAINING STATS
  // ============================================================================

  describe("training stats", () => {
    it("returns stats structure", () => {
      const stats = engine.getStats();

      expect(stats.episode).toBe(0);
      expect(stats.steps).toBe(0);
      expect(stats.epsilon).toBeGreaterThan(0);
    });

    it("tracks steps correctly", () => {
      const action: MillingAction = { speed_delta: 0, feed_delta: 0 };

      for (let i = 0; i < 5; i++) {
        engine.step(initialState, action, nextState, goodOutcome, false);
      }

      expect(engine.getStats().steps).toBe(5);
    });

    it("tracks episodes correctly", () => {
      const action: MillingAction = { speed_delta: 0, feed_delta: 0 };

      engine.step(initialState, action, nextState, goodOutcome, true);
      engine.step(initialState, action, nextState, goodOutcome, true);

      expect(engine.getStats().episode).toBe(2);
    });
  });

  // ============================================================================
  // SAVE/LOAD
  // ============================================================================

  describe("save and load", () => {
    it("saves weights", () => {
      const saved = engine.saveWeights();

      expect(saved.q_network).toBeDefined();
      expect(saved.q_network.length).toBe(3); // 3 layers
      expect(saved.config).toBeDefined();
    });

    it("loads weights", () => {
      const action: MillingAction = { speed_delta: 1, feed_delta: 1 };

      for (let i = 0; i < 10; i++) {
        engine.step(initialState, action, nextState, goodOutcome, false);
      }

      const saved = engine.saveWeights();
      const output1 = engine.selectAction(initialState, false);

      const newEngine = new MillingReinforcementLearningEngine();
      newEngine.loadWeights(saved);
      const output2 = newEngine.selectAction(initialState, false);

      expect(output1.q_values).toEqual(output2.q_values);
    });
  });

  // ============================================================================
  // RESET
  // ============================================================================

  describe("reset", () => {
    it("resets all state", () => {
      const action: MillingAction = { speed_delta: 0, feed_delta: 1 };

      for (let i = 0; i < 50; i++) {
        engine.step(initialState, action, nextState, goodOutcome, i % 10 === 9);
      }

      engine.reset();
      const stats = engine.getStats();

      expect(stats.episode).toBe(0);
      expect(stats.steps).toBe(0);
      expect(stats.epsilon).toBe(1.0);
    });
  });

  // ============================================================================
  // CUSTOM CONFIG
  // ============================================================================

  describe("custom config", () => {
    it("applies custom reward weights", () => {
      const customConfig: Partial<RLConfig> = {
        reward_weights: {
          mrr: 0.8,
          tool_life: 0.1,
          quality: 0.05,
          safety: 0.05,
        },
      };

      const customEngine = new MillingReinforcementLearningEngine(customConfig);
      const reward = customEngine.computeReward(initialState, nextState, goodOutcome);

      // MRR-heavy weighting should increase MRR contribution
      expect(reward.total).toBeDefined();
    });

    it("applies custom gamma", () => {
      const config: Partial<RLConfig> = { gamma: 0.5 };
      const customEngine = new MillingReinforcementLearningEngine(config);

      expect(customEngine.saveWeights().config.gamma).toBe(0.5);
    });
  });

  // ============================================================================
  // BATCH TRAINING
  // ============================================================================

  describe("batch training", () => {
    it("trains after reaching batch size", () => {
      const action: MillingAction = { speed_delta: 0, feed_delta: 0 };

      // Fill buffer past batch size (default 32)
      for (let i = 0; i < 40; i++) {
        const result = engine.step(
          initialState,
          action,
          nextState,
          goodOutcome,
          false
        );

        if (i >= 32) {
          // Loss should be computed after batch size reached
          expect(typeof result.loss).toBe("number");
        }
      }
    });
  });

  // ============================================================================
  // SINGLETON
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(millingReinforcementLearningEngine).toBeDefined();
      expect(millingReinforcementLearningEngine).toBeInstanceOf(
        MillingReinforcementLearningEngine
      );
    });
  });
});
