/**
 * LatheLoRAHyperparameterOptimizerEngine Tests
 * LATHE-LORA-MS0 U-LLR09: Hyperparameter optimization for LatheLoRA
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAHyperparameterOptimizerEngine } from "../engines/LatheLoRAHyperparameterOptimizerEngine.js";

describe("LatheLoRAHyperparameterOptimizerEngine", () => {
  beforeEach(() => {
    latheLoRAHyperparameterOptimizerEngine.reset();
  });

  describe("getPreset", () => {
    it("returns fast preset with correct values", () => {
      const preset = latheLoRAHyperparameterOptimizerEngine.getPreset("fast");
      expect(preset.learning_rate).toBe(2e-4);
      expect(preset.lora_rank).toBe(8);
      expect(preset.epochs).toBe(1);
      expect(preset.optimizer).toBe("adamw_8bit");
    });

    it("returns balanced preset", () => {
      const preset = latheLoRAHyperparameterOptimizerEngine.getPreset("balanced");
      expect(preset.lora_rank).toBe(16);
      expect(preset.epochs).toBe(3);
      expect(preset.scheduler).toBe("cosine");
    });

    it("returns quality preset with highest rank", () => {
      const preset = latheLoRAHyperparameterOptimizerEngine.getPreset("quality");
      expect(preset.lora_rank).toBe(32);
      expect(preset.epochs).toBe(5);
      expect(preset.max_seq_length).toBe(4096);
    });

    it("returns memory_efficient preset", () => {
      const preset = latheLoRAHyperparameterOptimizerEngine.getPreset("memory_efficient");
      expect(preset.lora_rank).toBe(4);
      expect(preset.batch_size).toBe(1);
      expect(preset.optimizer).toBe("paged_adamw_8bit");
    });

    it("returns high_rank preset", () => {
      const preset = latheLoRAHyperparameterOptimizerEngine.getPreset("high_rank");
      expect(preset.lora_rank).toBe(64);
      expect(preset.lora_alpha).toBe(128);
    });
  });

  describe("listPresets", () => {
    it("returns all 5 presets", () => {
      const presets = latheLoRAHyperparameterOptimizerEngine.listPresets();
      expect(presets.length).toBe(5);
    });

    it("includes VRAM estimates", () => {
      const presets = latheLoRAHyperparameterOptimizerEngine.listPresets();
      presets.forEach(p => {
        expect(typeof p.vram_estimate_gb).toBe("number");
        expect(p.vram_estimate_gb).toBeGreaterThan(0);
      });
    });
  });

  describe("estimateVRAM", () => {
    it("estimates VRAM for fast preset", () => {
      const config = latheLoRAHyperparameterOptimizerEngine.getPreset("fast");
      const vram = latheLoRAHyperparameterOptimizerEngine.estimateVRAM(config);
      expect(vram).toBeGreaterThan(0);
      expect(vram).toBeLessThan(20);
    });

    it("higher rank requires more VRAM", () => {
      const fast = latheLoRAHyperparameterOptimizerEngine.getPreset("fast");
      const highRank = latheLoRAHyperparameterOptimizerEngine.getPreset("high_rank");
      expect(latheLoRAHyperparameterOptimizerEngine.estimateVRAM(highRank)).toBeGreaterThan(
        latheLoRAHyperparameterOptimizerEngine.estimateVRAM(fast)
      );
    });
  });

  describe("generateGridSearch", () => {
    it("generates multiple configurations", () => {
      const configs = latheLoRAHyperparameterOptimizerEngine.generateGridSearch();
      expect(configs.length).toBeGreaterThan(0);
      expect(configs.length).toBeLessThanOrEqual(48);
    });

    it("all configs have required fields", () => {
      const configs = latheLoRAHyperparameterOptimizerEngine.generateGridSearch();
      configs.forEach(config => {
        expect(config.learning_rate).toBeGreaterThan(0);
        expect(config.lora_rank).toBeGreaterThan(0);
      });
    });
  });

  describe("generateRandomSearch", () => {
    it("generates specified number of samples", () => {
      const configs = latheLoRAHyperparameterOptimizerEngine.generateRandomSearch(undefined, 5);
      expect(configs.length).toBe(5);
    });

    it("learning rates are within bounds", () => {
      const configs = latheLoRAHyperparameterOptimizerEngine.generateRandomSearch(undefined, 10);
      configs.forEach(config => {
        expect(config.learning_rate).toBeGreaterThanOrEqual(1e-5);
        expect(config.learning_rate).toBeLessThanOrEqual(5e-4);
      });
    });
  });

  describe("recordTrial", () => {
    it("records trial and updates count", () => {
      latheLoRAHyperparameterOptimizerEngine.recordTrial({
        trial_id: "trial-1",
        config: latheLoRAHyperparameterOptimizerEngine.getPreset("fast"),
        metrics: { train_loss: 0.5, eval_loss: 0.6, perplexity: 1.8 },
        duration_seconds: 120, vram_peak_gb: 8, status: "completed",
      });
      expect(latheLoRAHyperparameterOptimizerEngine.getTrialCount()).toBe(1);
    });

    it("tracks best config by eval_loss", () => {
      latheLoRAHyperparameterOptimizerEngine.recordTrial({
        trial_id: "t1", config: latheLoRAHyperparameterOptimizerEngine.getPreset("fast"),
        metrics: { train_loss: 0.5, eval_loss: 0.6, perplexity: 1.8 },
        duration_seconds: 120, vram_peak_gb: 8, status: "completed",
      });
      latheLoRAHyperparameterOptimizerEngine.recordTrial({
        trial_id: "t2", config: latheLoRAHyperparameterOptimizerEngine.getPreset("quality"),
        metrics: { train_loss: 0.3, eval_loss: 0.4, perplexity: 1.5 },
        duration_seconds: 300, vram_peak_gb: 16, status: "completed",
      });
      expect(latheLoRAHyperparameterOptimizerEngine.getResult("random").best_metrics.eval_loss).toBe(0.4);
    });
  });

  describe("getResult", () => {
    it("returns default preset when no trials", () => {
      const result = latheLoRAHyperparameterOptimizerEngine.getResult("grid");
      expect(result.best_config.lora_rank).toBe(16);
      expect(result.total_trials).toBe(0);
    });

    it("includes recommendations", () => {
      const result = latheLoRAHyperparameterOptimizerEngine.getResult("bayesian");
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("reset", () => {
    it("clears all trials", () => {
      latheLoRAHyperparameterOptimizerEngine.recordTrial({
        trial_id: "t1", config: latheLoRAHyperparameterOptimizerEngine.getPreset("fast"),
        metrics: { train_loss: 0.5, eval_loss: 0.6, perplexity: 1.8 },
        duration_seconds: 100, vram_peak_gb: 8, status: "completed",
      });
      latheLoRAHyperparameterOptimizerEngine.reset();
      expect(latheLoRAHyperparameterOptimizerEngine.getTrialCount()).toBe(0);
    });
  });

  describe("toUnslothConfig", () => {
    it("generates valid Unsloth configuration", () => {
      const config = latheLoRAHyperparameterOptimizerEngine.getPreset("balanced");
      const unsloth = latheLoRAHyperparameterOptimizerEngine.toUnslothConfig(config);
      expect(unsloth.model_name).toBe("unsloth/mistral-7b-v0.3-bnb-4bit");
      expect(unsloth.load_in_4bit).toBe(true);
    });

    it("maps LoRA config correctly", () => {
      const config = latheLoRAHyperparameterOptimizerEngine.getPreset("high_rank");
      const unsloth = latheLoRAHyperparameterOptimizerEngine.toUnslothConfig(config);
      expect((unsloth.lora_config as any).r).toBe(64);
      expect((unsloth.lora_config as any).lora_alpha).toBe(128);
    });
  });
});
