/**
 * LatheLoRATrainingScriptEngine Tests
 *
 * U-LTH70: Training script generator for LoRA fine-tuning
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRATrainingScriptEngine } from "../engines/LatheLoRATrainingScriptEngine.js";

describe("LatheLoRATrainingScriptEngine", () => {
  beforeEach(() => {
    latheLoRATrainingScriptEngine.setConfig({
      base_model: "unsloth/llama-3-8b-bnb-4bit",
      dataset_path: "data/training/lathe-lora-train.jsonl",
      output_dir: "models/lathe-lora",
      lora_r: 16,
      lora_alpha: 32,
      num_epochs: 3,
    });
  });

  describe("Configuration", () => {
    it("sets and gets config", () => {
      latheLoRATrainingScriptEngine.setConfig({
        lora_r: 32,
        lora_alpha: 64,
      });

      const config = latheLoRATrainingScriptEngine.getConfig();

      expect(config.lora_r).toBe(32);
      expect(config.lora_alpha).toBe(64);
    });

    it("preserves unmodified config values", () => {
      latheLoRATrainingScriptEngine.setConfig({
        lora_r: 8,
      });

      const config = latheLoRATrainingScriptEngine.getConfig();

      expect(config.lora_r).toBe(8);
      expect(config.num_epochs).toBe(3); // unchanged
    });

    it("has sensible defaults", () => {
      const config = latheLoRATrainingScriptEngine.getConfig();

      expect(config.use_4bit).toBe(true);
      expect(config.use_gradient_checkpointing).toBe(true);
      expect(config.bf16).toBe(true);
    });
  });

  describe("Script Generation", () => {
    it("generates training script", () => {
      const output = latheLoRATrainingScriptEngine.generateScript();

      expect(output.script).toContain("#!/usr/bin/env python3");
      expect(output.script).toContain("from unsloth import FastLanguageModel");
      expect(output.script).toContain("SFTTrainer");
    });

    it("includes config in script", () => {
      latheLoRATrainingScriptEngine.setConfig({
        base_model: "unsloth/mistral-7b-bnb-4bit",
        lora_r: 24,
      });

      const output = latheLoRATrainingScriptEngine.generateScript();

      expect(output.script).toContain("unsloth/mistral-7b-bnb-4bit");
      expect(output.script).toContain('"lora_r": 24');
    });

    it("generates proper filename", () => {
      const output = latheLoRATrainingScriptEngine.generateScript();

      expect(output.filename).toBe("train_lathe_lora.py");
    });

    it("includes config JSON", () => {
      const output = latheLoRATrainingScriptEngine.generateScript();

      const config = JSON.parse(output.config_json);

      expect(config.base_model).toBeDefined();
      expect(config.lora_r).toBeDefined();
    });
  });

  describe("Requirements Generation", () => {
    it("includes core dependencies", () => {
      const output = latheLoRATrainingScriptEngine.generateScript();

      expect(output.requirements).toContain("torch");
      expect(output.requirements).toContain("transformers");
      expect(output.requirements).toContain("peft");
    });

    it("includes unsloth", () => {
      const output = latheLoRATrainingScriptEngine.generateScript();

      expect(output.requirements).toContain("unsloth");
    });

    it("includes evaluation dependencies", () => {
      const output = latheLoRATrainingScriptEngine.generateScript();

      expect(output.requirements).toContain("evaluate");
      expect(output.requirements).toContain("rouge-score");
    });
  });

  describe("VRAM Estimation", () => {
    it("estimates VRAM for default config", () => {
      const vram = latheLoRATrainingScriptEngine.estimateVRAM();

      expect(vram).toBeGreaterThan(0);
      expect(vram).toBeLessThan(50);
    });

    it("estimates higher VRAM for larger lora_r", () => {
      latheLoRATrainingScriptEngine.setConfig({ lora_r: 16 });
      const vramSmall = latheLoRATrainingScriptEngine.estimateVRAM();

      latheLoRATrainingScriptEngine.setConfig({ lora_r: 64 });
      const vramLarge = latheLoRATrainingScriptEngine.estimateVRAM();

      expect(vramLarge).toBeGreaterThan(vramSmall);
    });

    it("estimates higher VRAM without 4bit", () => {
      latheLoRATrainingScriptEngine.setConfig({ use_4bit: true });
      const vram4bit = latheLoRATrainingScriptEngine.estimateVRAM();

      latheLoRATrainingScriptEngine.setConfig({ use_4bit: false });
      const vramFull = latheLoRATrainingScriptEngine.estimateVRAM();

      expect(vramFull).toBeGreaterThan(vram4bit);
    });
  });

  describe("Time Estimation", () => {
    it("estimates training time", () => {
      const time = latheLoRATrainingScriptEngine.estimateTime();

      expect(time).toBeGreaterThan(0);
    });

    it("includes in output", () => {
      const output = latheLoRATrainingScriptEngine.generateScript();

      expect(output.estimated_time_hours).toBeGreaterThan(0);
      expect(output.estimated_vram_gb).toBeGreaterThan(0);
    });
  });

  describe("Presets", () => {
    it("has fast preset", () => {
      const preset = latheLoRATrainingScriptEngine.getPreset("fast");

      expect(preset.lora_r).toBe(8);
      expect(preset.num_epochs).toBe(1);
      expect(preset.learning_rate).toBeGreaterThan(2e-4);
    });

    it("has balanced preset", () => {
      const preset = latheLoRATrainingScriptEngine.getPreset("balanced");

      expect(preset.lora_r).toBe(16);
      expect(preset.num_epochs).toBe(3);
    });

    it("has quality preset", () => {
      const preset = latheLoRATrainingScriptEngine.getPreset("quality");

      expect(preset.lora_r).toBe(32);
      expect(preset.num_epochs).toBe(5);
    });

    it("applies preset to config", () => {
      latheLoRATrainingScriptEngine.applyPreset("fast");
      const config = latheLoRATrainingScriptEngine.getConfig();

      expect(config.lora_r).toBe(8);
      expect(config.num_epochs).toBe(1);
    });
  });

  describe("Validation", () => {
    it("validates valid config", () => {
      const result = latheLoRATrainingScriptEngine.validateConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects invalid lora_r", () => {
      latheLoRATrainingScriptEngine.setConfig({ lora_r: 200 });
      const result = latheLoRATrainingScriptEngine.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("lora_r"))).toBe(true);
    });

    it("warns on low lora_alpha", () => {
      latheLoRATrainingScriptEngine.setConfig({
        lora_r: 32,
        lora_alpha: 16,
      });
      const result = latheLoRATrainingScriptEngine.validateConfig();

      expect(result.warnings.some(w => w.includes("lora_alpha"))).toBe(true);
    });

    it("warns on high learning rate", () => {
      latheLoRATrainingScriptEngine.setConfig({ learning_rate: 5e-3 });
      const result = latheLoRATrainingScriptEngine.validateConfig();

      expect(result.warnings.some(w => w.includes("Learning rate"))).toBe(true);
    });

    it("rejects too short max_seq_length", () => {
      latheLoRATrainingScriptEngine.setConfig({ max_seq_length: 256 });
      const result = latheLoRATrainingScriptEngine.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("max_seq_length"))).toBe(true);
    });
  });

  describe("Prompt Template", () => {
    it("includes instruction template in script", () => {
      const output = latheLoRATrainingScriptEngine.generateScript();

      expect(output.script).toContain("### Instruction:");
      expect(output.script).toContain("### Input:");
      expect(output.script).toContain("### Response:");
    });

    it("includes format_prompts function", () => {
      const output = latheLoRATrainingScriptEngine.generateScript();

      expect(output.script).toContain("def format_prompts(examples):");
    });
  });

  describe("Target Modules", () => {
    it("includes all attention modules by default", () => {
      const config = latheLoRATrainingScriptEngine.getConfig();

      expect(config.target_modules).toContain("q_proj");
      expect(config.target_modules).toContain("k_proj");
      expect(config.target_modules).toContain("v_proj");
      expect(config.target_modules).toContain("o_proj");
    });

    it("includes MLP modules", () => {
      const config = latheLoRATrainingScriptEngine.getConfig();

      expect(config.target_modules).toContain("gate_proj");
      expect(config.target_modules).toContain("up_proj");
      expect(config.target_modules).toContain("down_proj");
    });
  });

  describe("Inference Script", () => {
    it("generates inference script", () => {
      const script = latheLoRATrainingScriptEngine.generateInferenceScript();

      expect(script).toContain("def load_model");
      expect(script).toContain("def generate");
    });

    it("uses correct model path", () => {
      latheLoRATrainingScriptEngine.setConfig({ output_dir: "custom/path" });
      const script = latheLoRATrainingScriptEngine.generateInferenceScript();

      expect(script).toContain("custom/path/final");
    });

    it("includes example usage", () => {
      const script = latheLoRATrainingScriptEngine.generateInferenceScript();

      expect(script).toContain('if __name__ == "__main__"');
      expect(script).toContain("ALCOA");
    });
  });

  describe("Script CLI", () => {
    it("includes argparse for resume", () => {
      const output = latheLoRATrainingScriptEngine.generateScript();

      expect(output.script).toContain("argparse");
      expect(output.script).toContain("--resume");
    });

    it("supports checkpoint resumption", () => {
      const output = latheLoRATrainingScriptEngine.generateScript();

      expect(output.script).toContain("resume_from_checkpoint");
    });
  });

  describe("Training Stats", () => {
    it("saves training stats in script", () => {
      const output = latheLoRATrainingScriptEngine.generateScript();

      expect(output.script).toContain("training_stats.json");
      expect(output.script).toContain("completed_at");
    });
  });
});
