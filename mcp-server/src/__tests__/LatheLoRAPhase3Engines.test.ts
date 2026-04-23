/**
 * LatheLoRA Phase 3 Engines Tests
 * LATHE-LORA-MS0 U-LLR10, U-LLR11, U-LLR12
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRATransferStrategyEngine } from "../engines/LatheLoRATransferStrategyEngine.js";
import { latheLoRARewardShapingEngine } from "../engines/LatheLoRARewardShapingEngine.js";
import { latheLoRATrainingMonitorEngine } from "../engines/LatheLoRATrainingMonitorEngine.js";

describe("LatheLoRATransferStrategyEngine (U-LLR10)", () => {
  describe("listBaseModels", () => {
    it("returns all available base models", () => {
      const models = latheLoRATransferStrategyEngine.listBaseModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models[0]).toHaveProperty("name");
      expect(models[0]).toHaveProperty("family");
    });
  });

  describe("getBaseModel", () => {
    it("returns model by key", () => {
      const model = latheLoRATransferStrategyEngine.getBaseModel("mistral-7b-4bit");
      expect(model).toBeDefined();
      expect(model?.family).toBe("mistral");
    });

    it("returns undefined for unknown key", () => {
      const model = latheLoRATransferStrategyEngine.getBaseModel("nonexistent");
      expect(model).toBeUndefined();
    });
  });

  describe("recommendBaseModel", () => {
    it("recommends model within VRAM constraint", () => {
      const model = latheLoRATransferStrategyEngine.recommendBaseModel({ max_vram_gb: 8 });
      expect(model.vram_requirement_gb).toBeLessThanOrEqual(8);
    });

    it("prefers specified family", () => {
      const model = latheLoRATransferStrategyEngine.recommendBaseModel({ preferred_family: "llama" });
      expect(model.family).toBe("llama");
    });
  });

  describe("createStrategy", () => {
    it("creates LoRA strategy", () => {
      const strategy = latheLoRATransferStrategyEngine.createStrategy("mistral-7b-4bit", "lora", { rank: 16 });
      expect(strategy.type).toBe("lora");
      expect(strategy.adapter_config?.rank).toBe(16);
    });

    it("creates QLoRA strategy", () => {
      const strategy = latheLoRATransferStrategyEngine.createStrategy("llama3-8b-4bit", "qlora", {});
      expect(strategy.type).toBe("qlora");
    });
  });

  describe("recommendStrategy", () => {
    it("recommends strategy with confidence", () => {
      const rec = latheLoRATransferStrategyEngine.recommendStrategy({
        available_vram_gb: 12,
        dataset_size: 1000,
        domain_complexity: "medium",
      });
      expect(rec.strategy).toBeDefined();
      expect(rec.confidence).toBeGreaterThan(0);
    });
  });

  describe("getKnowledgeDomains", () => {
    it("returns lathe-specific knowledge domains", () => {
      const domains = latheLoRATransferStrategyEngine.getKnowledgeDomains();
      expect(domains.length).toBeGreaterThan(0);
      expect(domains.some(d => d.name === "g_code_syntax")).toBe(true);
    });
  });

  describe("validateStrategy", () => {
    it("validates valid strategy", () => {
      const strategy = latheLoRATransferStrategyEngine.createStrategy("mistral-7b-4bit", "lora", {});
      const result = latheLoRATransferStrategyEngine.validateStrategy(strategy);
      expect(result.valid).toBe(true);
    });
  });
});

describe("LatheLoRARewardShapingEngine (U-LLR11)", () => {
  describe("calculateReward", () => {
    it("calculates reward for valid G-code", () => {
      const reward = latheLoRARewardShapingEngine.calculateReward(
        "G00 X1.0 Z0.1\nG01 X0.5 Z0.0 F0.01",
        { instruction: "facing operation" }
      );
      expect(reward.total_reward).toBeGreaterThanOrEqual(-1);
      expect(reward.total_reward).toBeLessThanOrEqual(1);
    });

    it("returns lower reward for invalid output", () => {
      const goodReward = latheLoRARewardShapingEngine.calculateReward("G01 X1.0 Z0.0 F0.01");
      const badReward = latheLoRARewardShapingEngine.calculateReward("INVALID TEXT");
      expect(goodReward.total_reward).toBeGreaterThanOrEqual(badReward.total_reward);
    });
  });

  describe("getConfig", () => {
    it("returns reward configuration", () => {
      const config = latheLoRARewardShapingEngine.getConfig();
      expect(config).toBeDefined();
    });
  });

  describe("meetsThreshold", () => {
    it("checks reward against threshold", () => {
      const reward = latheLoRARewardShapingEngine.calculateReward("G01 X1.0 Z0.0 F0.01");
      const result = latheLoRARewardShapingEngine.meetsThreshold(reward, -100);
      expect(typeof result).toBe("boolean");
    });
  });
});

describe("LatheLoRATrainingMonitorEngine (U-LLR12)", () => {
  beforeEach(() => {
    latheLoRATrainingMonitorEngine.reset();
  });

  describe("initRun", () => {
    it("initializes training run", () => {
      latheLoRATrainingMonitorEngine.initRun({
        run_id: "test-run-1",
        total_steps: 100,
        config: { learning_rate: 1e-4, batch_size: 4 },
      });
      const state = latheLoRATrainingMonitorEngine.getState();
      expect(state).toBeDefined();
      expect(state?.run_id).toBe("test-run-1");
    });
  });

  describe("recordStep", () => {
    it("records training step", () => {
      latheLoRATrainingMonitorEngine.initRun({ run_id: "test-run-2", total_steps: 100, config: {} });
      latheLoRATrainingMonitorEngine.recordStep({ step: 1, train_loss: 2.5, learning_rate: 1e-4 });
      const state = latheLoRATrainingMonitorEngine.getState();
      expect(state?.current_step).toBe(1);
    });
  });

  describe("getProgress", () => {
    it("returns progress percentage", () => {
      latheLoRATrainingMonitorEngine.initRun({ run_id: "test-run-3", total_steps: 100, config: {} });
      latheLoRATrainingMonitorEngine.recordStep({ step: 50, train_loss: 1.5, learning_rate: 1e-4 });
      const progress = latheLoRATrainingMonitorEngine.getProgress();
      expect(progress.percent).toBe(50);
    });
  });

  describe("getLossHistory", () => {
    it("returns loss history", () => {
      latheLoRATrainingMonitorEngine.initRun({ run_id: "test-run-4", total_steps: 10, config: {} });
      latheLoRATrainingMonitorEngine.recordStep({ step: 1, train_loss: 2.5, learning_rate: 1e-4 });
      latheLoRATrainingMonitorEngine.recordStep({ step: 2, train_loss: 2.0, learning_rate: 1e-4 });
      const history = latheLoRATrainingMonitorEngine.getLossHistory();
      expect(history.steps.length).toBe(2);
    });
  });

  describe("reset", () => {
    it("clears state", () => {
      latheLoRATrainingMonitorEngine.initRun({ run_id: "test", total_steps: 10, config: {} });
      latheLoRATrainingMonitorEngine.reset();
      const state = latheLoRATrainingMonitorEngine.getState();
      expect(state).toBeNull();
    });
  });
});
