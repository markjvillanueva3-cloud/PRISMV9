/**
 * LatheLoRATransferStrategyEngine Tests
 * LATHE-LORA-MS0 U-LLR10: Transfer learning strategy management
 */

import { describe, it, expect } from "vitest";
import { latheLoRATransferStrategyEngine } from "../engines/LatheLoRATransferStrategyEngine.js";

describe("LatheLoRATransferStrategyEngine", () => {
  describe("listBaseModels", () => {
    it("returns all available base models", () => {
      const models = latheLoRATransferStrategyEngine.listBaseModels();
      expect(models.length).toBe(5);
      expect(models.map(m => m.family)).toContain("mistral");
      expect(models.map(m => m.family)).toContain("llama");
    });

    it("all models have required fields", () => {
      const models = latheLoRATransferStrategyEngine.listBaseModels();
      models.forEach(m => {
        expect(m.name).toBeTruthy();
        expect(m.size_b).toBeGreaterThan(0);
        expect(m.context_length).toBeGreaterThan(0);
        expect(m.vram_requirement_gb).toBeGreaterThan(0);
      });
    });
  });

  describe("getBaseModel", () => {
    it("returns mistral-7b-4bit model", () => {
      const model = latheLoRATransferStrategyEngine.getBaseModel("mistral-7b-4bit");
      expect(model).toBeDefined();
      expect(model?.family).toBe("mistral");
      expect(model?.size_b).toBe(7);
    });

    it("returns undefined for unknown model", () => {
      const model = latheLoRATransferStrategyEngine.getBaseModel("unknown-model");
      expect(model).toBeUndefined();
    });
  });

  describe("recommendBaseModel", () => {
    it("recommends model within VRAM constraints", () => {
      const model = latheLoRATransferStrategyEngine.recommendBaseModel({ max_vram_gb: 6 });
      expect(model.vram_requirement_gb).toBeLessThanOrEqual(6);
    });

    it("recommends model with minimum context length", () => {
      const model = latheLoRATransferStrategyEngine.recommendBaseModel({ min_context_length: 32000 });
      expect(model.context_length).toBeGreaterThanOrEqual(32000);
    });

    it("prefers specified family when available", () => {
      const model = latheLoRATransferStrategyEngine.recommendBaseModel({
        preferred_family: "qwen",
        max_vram_gb: 16
      });
      expect(model.family).toBe("qwen");
    });

    it("falls back to phi3-mini when constraints too tight", () => {
      const model = latheLoRATransferStrategyEngine.recommendBaseModel({ max_vram_gb: 2 });
      expect(model.name).toContain("Phi-3");
    });
  });

  describe("createStrategy", () => {
    it("creates lora strategy with correct config", () => {
      const strategy = latheLoRATransferStrategyEngine.createStrategy("mistral-7b-4bit", "lora");
      expect(strategy.type).toBe("lora");
      expect(strategy.adapter_config).toBeDefined();
      expect(strategy.adapter_config?.rank).toBe(16);
      expect(strategy.adapter_config?.target_modules.length).toBeGreaterThan(0);
    });

    it("creates qlora strategy with dropout", () => {
      const strategy = latheLoRATransferStrategyEngine.createStrategy("mistral-7b-4bit", "qlora");
      expect(strategy.type).toBe("qlora");
      expect(strategy.adapter_config?.dropout).toBe(0.05);
    });

    it("creates progressive strategy with frozen layers", () => {
      const strategy = latheLoRATransferStrategyEngine.createStrategy("llama3-8b-4bit", "progressive");
      expect(strategy.type).toBe("progressive");
      expect(strategy.frozen_layers.length).toBeGreaterThan(0);
      expect(strategy.initialization).toBe("pretrained");
    });

    it("creates domain_init strategy with higher rank", () => {
      const strategy = latheLoRATransferStrategyEngine.createStrategy("mistral-7b-4bit", "domain_init", { rank: 16 });
      expect(strategy.type).toBe("domain_init");
      expect(strategy.adapter_config?.rank).toBe(32); // 2x the input rank
    });

    it("creates full fine-tuning strategy", () => {
      const strategy = latheLoRATransferStrategyEngine.createStrategy("phi3-mini-4bit", "full");
      expect(strategy.type).toBe("full");
      expect(strategy.trainable_modules).toContain("all");
      expect(strategy.adapter_config).toBeUndefined();
    });

    it("accepts custom rank and alpha", () => {
      const strategy = latheLoRATransferStrategyEngine.createStrategy("mistral-7b-4bit", "lora", {
        rank: 32,
        alpha: 64,
      });
      expect(strategy.adapter_config?.rank).toBe(32);
      expect(strategy.adapter_config?.alpha).toBe(64);
    });
  });

  describe("recommendStrategy", () => {
    it("recommends qlora for small dataset", () => {
      const rec = latheLoRATransferStrategyEngine.recommendStrategy({
        dataset_size: 500,
        max_vram_gb: 16,
        training_hours: 2,
        task_complexity: "simple",
      });
      expect(rec.strategy.type).toBe("qlora");
      expect(rec.strategy.adapter_config?.rank).toBe(8);
    });

    it("recommends lora for medium dataset", () => {
      const rec = latheLoRATransferStrategyEngine.recommendStrategy({
        dataset_size: 3000,
        max_vram_gb: 16,
        training_hours: 8,
        task_complexity: "moderate",
      });
      expect(rec.strategy.type).toBe("lora");
    });

    it("recommends domain_init for complex task with large dataset", () => {
      const rec = latheLoRATransferStrategyEngine.recommendStrategy({
        dataset_size: 10000,
        max_vram_gb: 24,
        training_hours: 24,
        task_complexity: "complex",
      });
      expect(rec.strategy.type).toBe("domain_init");
    });

    it("reduces rank for low VRAM", () => {
      const rec = latheLoRATransferStrategyEngine.recommendStrategy({
        dataset_size: 5000,
        max_vram_gb: 6,
        training_hours: 4,
        task_complexity: "moderate",
      });
      expect(rec.strategy.adapter_config?.rank).toBeLessThanOrEqual(8);
      expect(rec.strategy.type).toBe("qlora");
    });

    it("includes rationale and risks", () => {
      const rec = latheLoRATransferStrategyEngine.recommendStrategy({
        dataset_size: 200,
        max_vram_gb: 8,
        training_hours: 1,
        task_complexity: "simple",
      });
      expect(rec.rationale.length).toBeGreaterThan(0);
      expect(rec.risks).toContain("Small dataset may lead to overfitting");
    });

    it("estimates VRAM and training time", () => {
      const rec = latheLoRATransferStrategyEngine.recommendStrategy({
        dataset_size: 5000,
        max_vram_gb: 16,
        training_hours: 10,
        task_complexity: "moderate",
      });
      expect(rec.estimated_vram_gb).toBeGreaterThan(0);
      expect(rec.estimated_training_hours).toBeGreaterThan(0);
    });
  });

  describe("getKnowledgeDomains", () => {
    it("returns all knowledge domains", () => {
      const domains = latheLoRATransferStrategyEngine.getKnowledgeDomains();
      expect(domains.length).toBe(4);
      expect(domains.map(d => d.name)).toContain("g_code_syntax");
      expect(domains.map(d => d.name)).toContain("physics_reasoning");
    });

    it("domains have transfer difficulty", () => {
      const domains = latheLoRATransferStrategyEngine.getKnowledgeDomains();
      domains.forEach(d => {
        expect(["easy", "medium", "hard"]).toContain(d.transfer_difficulty);
      });
    });
  });

  describe("matchDomains", () => {
    it("matches g_code_syntax domain", () => {
      const matches = latheLoRATransferStrategyEngine.matchDomains("G00 G01 syntax command");
      expect(matches[0].domain).toBe("g_code_syntax");
      expect(matches[0].score).toBeGreaterThan(0);
    });

    it("matches physics_reasoning domain", () => {
      const matches = latheLoRATransferStrategyEngine.matchDomains("kienzle force power thermal");
      expect(matches[0].domain).toBe("physics_reasoning");
    });

    it("matches cutting_parameters domain", () => {
      const matches = latheLoRATransferStrategyEngine.matchDomains("speed feed rpm cutting");
      expect(matches[0].domain).toBe("cutting_parameters");
    });

    it("returns empty for unrelated content", () => {
      const matches = latheLoRATransferStrategyEngine.matchDomains("hello world");
      expect(matches.length).toBe(0);
    });
  });

  describe("validateStrategy", () => {
    it("validates correct strategy", () => {
      const strategy = latheLoRATransferStrategyEngine.createStrategy("mistral-7b-4bit", "lora");
      const result = latheLoRATransferStrategyEngine.validateStrategy(strategy);
      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it("rejects strategy without base_model", () => {
      const strategy = {
        name: "invalid",
        type: "lora" as const,
        base_model: "",
        frozen_layers: [],
        trainable_modules: ["q_proj"],
        initialization: "random" as const,
        adapter_config: { rank: 16, alpha: 32, dropout: 0, target_modules: ["q_proj"] },
      };
      const result = latheLoRATransferStrategyEngine.validateStrategy(strategy);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Missing base_model");
    });

    it("rejects invalid rank", () => {
      const strategy = latheLoRATransferStrategyEngine.createStrategy("mistral-7b-4bit", "lora");
      strategy.adapter_config!.rank = 300;
      const result = latheLoRATransferStrategyEngine.validateStrategy(strategy);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes("Invalid rank"))).toBe(true);
    });

    it("warns progressive without frozen layers", () => {
      const strategy = latheLoRATransferStrategyEngine.createStrategy("mistral-7b-4bit", "lora");
      strategy.type = "progressive";
      strategy.frozen_layers = [];
      const result = latheLoRATransferStrategyEngine.validateStrategy(strategy);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Progressive strategy should have frozen layers");
    });
  });

  describe("generateModelLoadCode", () => {
    it("generates valid Python code for lora strategy", () => {
      const strategy = latheLoRATransferStrategyEngine.createStrategy("mistral-7b-4bit", "lora");
      const code = latheLoRATransferStrategyEngine.generateModelLoadCode(strategy);
      expect(code).toContain("from unsloth import FastLanguageModel");
      expect(code).toContain("model_name=");
      expect(code).toContain("get_peft_model");
      expect(code).toContain("r=16");
    });

    it("includes target modules in code", () => {
      const strategy = latheLoRATransferStrategyEngine.createStrategy("mistral-7b-4bit", "lora");
      const code = latheLoRATransferStrategyEngine.generateModelLoadCode(strategy);
      expect(code).toContain("target_modules=");
      expect(code).toContain("q_proj");
    });

    it("skips peft config for full strategy", () => {
      const strategy = latheLoRATransferStrategyEngine.createStrategy("mistral-7b-4bit", "full");
      const code = latheLoRATransferStrategyEngine.generateModelLoadCode(strategy);
      expect(code).toContain("FastLanguageModel.from_pretrained");
      expect(code).not.toContain("get_peft_model");
    });
  });
});
