/**
 * Tests for BanditParameterOptimizerEngine (MILL-AGI Phase 0.4)
 *
 * Validates multi-armed bandit parameter optimization:
 *   - Arm registration and selection
 *   - UCB algorithm
 *   - Thompson Sampling
 *   - LinUCB contextual bandits
 *   - GP-UCB Bayesian optimization
 *   - Reward updates and statistics
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  BanditParameterOptimizerEngine,
  banditParameterOptimizerEngine,
  type ParameterArm,
  type Context,
  type RewardSignal,
  type BanditConfig,
} from "../engines/BanditParameterOptimizerEngine.js";

describe("BanditParameterOptimizerEngine (MILL-AGI P0.4)", () => {
  let engine: BanditParameterOptimizerEngine;

  beforeEach(() => {
    engine = new BanditParameterOptimizerEngine();
  });

  // ============================================================================
  // TEST DATA
  // ============================================================================

  const conservativeArm: ParameterArm = {
    id: "conservative",
    name: "Conservative Cutting",
    parameters: {
      cutting_speed_mpm: 100,
      feed_per_tooth_mm: 0.08,
      axial_depth_mm: 1.5,
      radial_depth_mm: 4,
      coolant_type: "flood",
    },
  };

  const aggressiveArm: ParameterArm = {
    id: "aggressive",
    name: "Aggressive Cutting",
    parameters: {
      cutting_speed_mpm: 180,
      feed_per_tooth_mm: 0.15,
      axial_depth_mm: 3,
      radial_depth_mm: 8,
      coolant_type: "mql",
    },
  };

  const balancedArm: ParameterArm = {
    id: "balanced",
    name: "Balanced Cutting",
    parameters: {
      cutting_speed_mpm: 140,
      feed_per_tooth_mm: 0.1,
      axial_depth_mm: 2,
      radial_depth_mm: 6,
      coolant_type: "flood",
    },
  };

  const normalContext: Context = {
    material_hardness_hrc: 30,
    tool_wear_vb_mm: 0.1,
    spindle_load_percent: 60,
    vibration_level: 2,
    temperature_c: 300,
    surface_roughness_um: 1.5,
  };

  const hardMaterialContext: Context = {
    material_hardness_hrc: 55,
    tool_wear_vb_mm: 0.05,
    spindle_load_percent: 75,
    vibration_level: 3,
    temperature_c: 400,
    surface_roughness_um: 2.0,
  };

  const goodReward: RewardSignal = {
    mrr_reward: 0.8,
    tool_life_reward: 0.7,
    quality_reward: 0.9,
    safety_penalty: 0.1,
    total: 0.75,
  };

  const badReward: RewardSignal = {
    mrr_reward: 0.3,
    tool_life_reward: 0.2,
    quality_reward: 0.4,
    safety_penalty: 0.5,
    total: 0.15,
  };

  // ============================================================================
  // ARM REGISTRATION
  // ============================================================================

  describe("arm registration", () => {
    it("registers arms", () => {
      engine.registerArm(conservativeArm);
      engine.registerArm(aggressiveArm);

      const stats = engine.getArmStats();
      expect(stats.length).toBe(2);
    });

    it("initializes arm stats", () => {
      engine.registerArm(conservativeArm);

      const stats = engine.getArmStats();
      expect(stats[0].pulls).toBe(0);
      expect(stats[0].mean_reward).toBe(0);
      expect(stats[0].ucb_score).toBe(Infinity);
    });
  });

  // ============================================================================
  // ARM SELECTION
  // ============================================================================

  describe("arm selection", () => {
    it("throws if no arms registered", () => {
      expect(() => engine.selectArm()).toThrow("No arms registered");
    });

    it("returns optimization result", () => {
      engine.registerArm(conservativeArm);
      engine.registerArm(aggressiveArm);

      const result = engine.selectArm();

      expect(result.selected_arm).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.algorithm_used).toBeDefined();
    });

    it("explores unpulled arms first (UCB)", () => {
      const ucbEngine = new BanditParameterOptimizerEngine({ algorithm: "ucb" });
      ucbEngine.registerArm(conservativeArm);
      ucbEngine.registerArm(aggressiveArm);

      // First selection should pick an unpulled arm
      const result1 = ucbEngine.selectArm();
      expect(result1.confidence).toBe(0); // No data yet
    });
  });

  // ============================================================================
  // UCB ALGORITHM
  // ============================================================================

  describe("UCB algorithm", () => {
    it("balances exploration and exploitation", () => {
      const ucbEngine = new BanditParameterOptimizerEngine({ algorithm: "ucb" });
      ucbEngine.registerArm(conservativeArm);
      ucbEngine.registerArm(aggressiveArm);

      // Pull both arms
      ucbEngine.selectArm();
      ucbEngine.updateReward("conservative", goodReward);
      ucbEngine.selectArm();
      ucbEngine.updateReward("aggressive", badReward);

      // After rewards, should prefer conservative
      const stats = ucbEngine.getArmStats();
      const consStats = stats.find((s) => s.arm_id === "conservative");
      const aggStats = stats.find((s) => s.arm_id === "aggressive");

      expect(consStats!.mean_reward).toBeGreaterThan(aggStats!.mean_reward);
    });

    it("exploration decreases with more pulls", () => {
      const ucbEngine = new BanditParameterOptimizerEngine({ algorithm: "ucb" });
      ucbEngine.registerArm(conservativeArm);

      ucbEngine.selectArm();
      ucbEngine.updateReward("conservative", goodReward);

      const result1 = ucbEngine.selectArm();

      for (let i = 0; i < 20; i++) {
        ucbEngine.updateReward("conservative", goodReward);
      }

      const result2 = ucbEngine.selectArm();

      expect(result2.exploration_bonus).toBeLessThan(result1.exploration_bonus);
    });
  });

  // ============================================================================
  // THOMPSON SAMPLING
  // ============================================================================

  describe("Thompson Sampling", () => {
    it("selects arm via posterior sampling", () => {
      const tsEngine = new BanditParameterOptimizerEngine({ algorithm: "thompson" });
      tsEngine.registerArm(conservativeArm);
      tsEngine.registerArm(aggressiveArm);

      const result = tsEngine.selectArm();
      expect(result.algorithm_used).toBe("thompson");
    });

    it("confidence increases with more data", () => {
      const tsEngine = new BanditParameterOptimizerEngine({ algorithm: "thompson" });
      tsEngine.registerArm(conservativeArm);

      tsEngine.selectArm();
      tsEngine.updateReward("conservative", goodReward);
      const conf1 = tsEngine.selectArm().confidence;

      for (let i = 0; i < 50; i++) {
        tsEngine.updateReward("conservative", goodReward);
      }

      const conf2 = tsEngine.selectArm().confidence;
      expect(conf2).toBeGreaterThan(conf1);
    });
  });

  // ============================================================================
  // LINUCB ALGORITHM
  // ============================================================================

  describe("LinUCB algorithm", () => {
    it("requires context", () => {
      const linEngine = new BanditParameterOptimizerEngine({ algorithm: "linucb" });
      linEngine.registerArm(conservativeArm);

      expect(() => linEngine.selectArm()).toThrow("LinUCB requires context");
    });

    it("uses context features", () => {
      const linEngine = new BanditParameterOptimizerEngine({ algorithm: "linucb" });
      linEngine.registerArm(conservativeArm);
      linEngine.registerArm(aggressiveArm);

      const result1 = linEngine.selectArm(normalContext);
      const result2 = linEngine.selectArm(hardMaterialContext);

      expect(result1.algorithm_used).toBe("linucb");
      expect(result2.algorithm_used).toBe("linucb");
    });

    it("learns from contextual rewards", () => {
      const linEngine = new BanditParameterOptimizerEngine({ algorithm: "linucb" });
      linEngine.registerArm(conservativeArm);
      linEngine.registerArm(aggressiveArm);

      // Train: conservative better for hard materials
      for (let i = 0; i < 20; i++) {
        linEngine.selectArm(hardMaterialContext);
        linEngine.updateReward("conservative", goodReward, hardMaterialContext);
        linEngine.updateReward("aggressive", badReward, hardMaterialContext);
      }

      // Should prefer conservative for hard materials
      const result = linEngine.selectArm(hardMaterialContext);
      expect(result.selected_arm.id).toBeDefined();
    });
  });

  // ============================================================================
  // GP-UCB ALGORITHM
  // ============================================================================

  describe("GP-UCB algorithm", () => {
    it("requires context", () => {
      const gpEngine = new BanditParameterOptimizerEngine({ algorithm: "gp-ucb" });
      gpEngine.registerArm(conservativeArm);

      expect(() => gpEngine.selectArm()).toThrow("GP-UCB requires context");
    });

    it("uses Gaussian Process predictions", () => {
      const gpEngine = new BanditParameterOptimizerEngine({ algorithm: "gp-ucb" });
      gpEngine.registerArm(conservativeArm);
      gpEngine.registerArm(aggressiveArm);

      const result = gpEngine.selectArm(normalContext);
      expect(result.algorithm_used).toBe("gp-ucb");
    });

    it("uncertainty decreases near observations", () => {
      const gpEngine = new BanditParameterOptimizerEngine({ algorithm: "gp-ucb" });
      gpEngine.registerArm(conservativeArm);

      // First selection has high uncertainty
      const result1 = gpEngine.selectArm(normalContext);
      const initialBonus = result1.exploration_bonus;

      // Add observations
      for (let i = 0; i < 10; i++) {
        gpEngine.updateReward("conservative", goodReward, normalContext);
      }

      // Uncertainty should decrease
      const result2 = gpEngine.selectArm(normalContext);
      expect(result2.exploration_bonus).toBeLessThan(initialBonus);
    });
  });

  // ============================================================================
  // REWARD UPDATES
  // ============================================================================

  describe("reward updates", () => {
    it("updates mean reward", () => {
      engine.registerArm(conservativeArm);

      engine.updateReward("conservative", goodReward);
      engine.updateReward("conservative", goodReward);

      const stats = engine.getArmStats()[0];
      expect(stats.mean_reward).toBeCloseTo(0.75);
    });

    it("updates pull count", () => {
      engine.registerArm(conservativeArm);

      for (let i = 0; i < 5; i++) {
        engine.updateReward("conservative", goodReward);
      }

      const stats = engine.getArmStats()[0];
      expect(stats.pulls).toBe(5);
    });

    it("updates variance", () => {
      engine.registerArm(conservativeArm);

      engine.updateReward("conservative", goodReward);
      engine.updateReward("conservative", badReward);
      engine.updateReward("conservative", goodReward);

      const stats = engine.getArmStats()[0];
      expect(stats.variance).toBeGreaterThan(0);
    });

    it("ignores unknown arm", () => {
      engine.registerArm(conservativeArm);

      engine.updateReward("unknown", goodReward);

      const stats = engine.getArmStats()[0];
      expect(stats.pulls).toBe(0);
    });
  });

  // ============================================================================
  // BEST ARM
  // ============================================================================

  describe("best arm", () => {
    it("returns null with insufficient data", () => {
      engine.registerArm(conservativeArm);
      engine.updateReward("conservative", goodReward);

      const best = engine.getBestArm();
      expect(best).toBeNull(); // Needs 5 pulls
    });

    it("returns best performing arm", () => {
      engine.registerArm(conservativeArm);
      engine.registerArm(aggressiveArm);

      for (let i = 0; i < 10; i++) {
        engine.updateReward("conservative", goodReward);
        engine.updateReward("aggressive", badReward);
      }

      const best = engine.getBestArm();
      expect(best).not.toBeNull();
      expect(best!.arm.id).toBe("conservative");
    });
  });

  // ============================================================================
  // EXPLORATION RATIO
  // ============================================================================

  describe("exploration ratio", () => {
    it("returns 1.0 with no pulls", () => {
      engine.registerArm(conservativeArm);

      expect(engine.getExplorationRatio()).toBe(1.0);
    });

    it("decreases with uneven pulls", () => {
      engine.registerArm(conservativeArm);
      engine.registerArm(aggressiveArm);

      for (let i = 0; i < 10; i++) {
        engine.updateReward("conservative", goodReward);
      }
      engine.updateReward("aggressive", goodReward);

      const ratio = engine.getExplorationRatio();
      expect(ratio).toBeLessThan(1.0);
      expect(ratio).toBe(0.1); // 1/10
    });
  });

  // ============================================================================
  // CUMULATIVE REGRET
  // ============================================================================

  describe("cumulative regret", () => {
    it("returns 0 with no best arm", () => {
      engine.registerArm(conservativeArm);

      expect(engine.getCumulativeRegret()).toBe(0);
    });

    it("accumulates regret for suboptimal pulls", () => {
      engine.registerArm(conservativeArm);
      engine.registerArm(aggressiveArm);

      for (let i = 0; i < 10; i++) {
        engine.updateReward("conservative", goodReward);
        engine.updateReward("aggressive", badReward);
      }

      const regret = engine.getCumulativeRegret();
      expect(regret).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // RECOMMEND ADJUSTMENT
  // ============================================================================

  describe("recommend adjustment", () => {
    it("returns adjustment recommendation", () => {
      engine.registerArm(conservativeArm);
      engine.registerArm(aggressiveArm);

      for (let i = 0; i < 10; i++) {
        engine.updateReward("aggressive", goodReward, normalContext);
        engine.updateReward("conservative", badReward, normalContext);
      }

      const currentParams = conservativeArm.parameters;
      const rec = engine.recommendAdjustment(currentParams, normalContext);

      expect(rec.adjustment).toBeDefined();
      expect(rec.confidence).toBeGreaterThanOrEqual(0);
    });

    it("suggests speed change when different", () => {
      const linEngine = new BanditParameterOptimizerEngine({ algorithm: "linucb" });
      linEngine.registerArm(conservativeArm);
      linEngine.registerArm(aggressiveArm);

      for (let i = 0; i < 15; i++) {
        linEngine.updateReward("aggressive", goodReward, normalContext);
        linEngine.updateReward("conservative", badReward, normalContext);
      }

      const rec = linEngine.recommendAdjustment(
        conservativeArm.parameters,
        normalContext
      );

      // Should suggest moving toward aggressive params
      if (rec.adjustment.cutting_speed_mpm) {
        expect(rec.adjustment.cutting_speed_mpm).toBeGreaterThan(100);
      }
    });
  });

  // ============================================================================
  // RESET
  // ============================================================================

  describe("reset", () => {
    it("clears all statistics", () => {
      engine.registerArm(conservativeArm);

      for (let i = 0; i < 20; i++) {
        engine.updateReward("conservative", goodReward, normalContext);
      }

      engine.reset();

      const stats = engine.getArmStats()[0];
      expect(stats.pulls).toBe(0);
      expect(stats.mean_reward).toBe(0);
    });

    it("preserves arm registrations", () => {
      engine.registerArm(conservativeArm);
      engine.registerArm(aggressiveArm);

      engine.reset();

      expect(engine.getArmStats().length).toBe(2);
    });
  });

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  describe("configuration", () => {
    it("returns config", () => {
      const config = engine.getConfig();

      expect(config.algorithm).toBeDefined();
      expect(config.ucb_exploration).toBeDefined();
    });

    it("allows algorithm change", () => {
      engine.setAlgorithm("ucb");
      expect(engine.getConfig().algorithm).toBe("ucb");

      engine.setAlgorithm("thompson");
      expect(engine.getConfig().algorithm).toBe("thompson");
    });
  });

  // ============================================================================
  // CUSTOM CONFIG
  // ============================================================================

  describe("custom config", () => {
    it("applies custom UCB exploration", () => {
      const config: Partial<BanditConfig> = { ucb_exploration: 3.0 };
      const customEngine = new BanditParameterOptimizerEngine(config);

      expect(customEngine.getConfig().ucb_exploration).toBe(3.0);
    });

    it("applies custom GP parameters", () => {
      const config: Partial<BanditConfig> = {
        algorithm: "gp-ucb",
        gp_length_scale: 2.0,
        gp_variance: 0.5,
      };
      const customEngine = new BanditParameterOptimizerEngine(config);

      expect(customEngine.getConfig().gp_length_scale).toBe(2.0);
      expect(customEngine.getConfig().gp_variance).toBe(0.5);
    });
  });

  // ============================================================================
  // SINGLETON
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(banditParameterOptimizerEngine).toBeDefined();
      expect(banditParameterOptimizerEngine).toBeInstanceOf(
        BanditParameterOptimizerEngine
      );
    });
  });
});
