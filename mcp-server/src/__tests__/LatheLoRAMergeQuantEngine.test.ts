/**
 * LatheLoRAMergeQuantEngine Tests
 *
 * U-LTH72: Merge and quantization engine for LoRA models
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAMergeQuantEngine } from "../engines/LatheLoRAMergeQuantEngine.js";

describe("LatheLoRAMergeQuantEngine", () => {
  beforeEach(() => {
    latheLoRAMergeQuantEngine.setConfig({
      base_model: "meta-llama/Meta-Llama-3-8B",
      adapter_path: "models/lathe-lora/final",
      output_dir: "models/lathe-merged",
      output_format: "gguf",
      gguf_quant: "Q4_K_M",
    });
  });

  describe("Configuration", () => {
    it("sets and gets config", () => {
      latheLoRAMergeQuantEngine.setConfig({
        output_format: "awq",
        awq_bits: 8,
      });

      const config = latheLoRAMergeQuantEngine.getConfig();

      expect(config.output_format).toBe("awq");
      expect(config.awq_bits).toBe(8);
    });

    it("has sensible defaults", () => {
      const config = latheLoRAMergeQuantEngine.getConfig();

      expect(config.gguf_quant).toBe("Q4_K_M");
      expect(config.calibration_samples).toBe(128);
      expect(config.push_to_hub).toBe(false);
    });
  });

  describe("Merge Script Generation", () => {
    it("generates merge script", () => {
      const script = latheLoRAMergeQuantEngine.generateMergeScript();

      expect(script).toContain("#!/usr/bin/env python3");
      expect(script).toContain("from transformers import AutoModelForCausalLM");
      expect(script).toContain("from peft import PeftModel");
    });

    it("includes config paths", () => {
      latheLoRAMergeQuantEngine.setConfig({
        base_model: "custom/model",
        adapter_path: "custom/adapter",
      });

      const script = latheLoRAMergeQuantEngine.generateMergeScript();

      expect(script).toContain("custom/model");
      expect(script).toContain("custom/adapter");
    });

    it("has merge_and_unload call", () => {
      const script = latheLoRAMergeQuantEngine.generateMergeScript();

      expect(script).toContain("merge_and_unload");
    });
  });

  describe("GGUF Quantization", () => {
    it("generates GGUF script", () => {
      latheLoRAMergeQuantEngine.setConfig({ output_format: "gguf" });
      const script = latheLoRAMergeQuantEngine.generateQuantScript();

      expect(script).toContain("llama.cpp/convert.py");
      expect(script).toContain("quantize");
    });

    it("uses configured quant type", () => {
      latheLoRAMergeQuantEngine.setConfig({
        output_format: "gguf",
        gguf_quant: "Q5_K_M",
      });

      const script = latheLoRAMergeQuantEngine.generateQuantScript();

      expect(script).toContain("Q5_K_M");
    });
  });

  describe("AWQ Quantization", () => {
    it("generates AWQ script", () => {
      latheLoRAMergeQuantEngine.setConfig({ output_format: "awq" });
      const script = latheLoRAMergeQuantEngine.generateQuantScript();

      expect(script).toContain("from awq import AutoAWQForCausalLM");
      expect(script).toContain("quantize");
    });

    it("uses configured bits", () => {
      latheLoRAMergeQuantEngine.setConfig({
        output_format: "awq",
        awq_bits: 8,
      });

      const script = latheLoRAMergeQuantEngine.generateQuantScript();

      expect(script).toContain("BITS = 8");
    });

    it("includes calibration data", () => {
      latheLoRAMergeQuantEngine.setConfig({ output_format: "awq" });
      const script = latheLoRAMergeQuantEngine.generateQuantScript();

      expect(script).toContain("calibration_data");
      expect(script).toContain("G28");
    });
  });

  describe("GPTQ Quantization", () => {
    it("generates GPTQ script", () => {
      latheLoRAMergeQuantEngine.setConfig({ output_format: "gptq" });
      const script = latheLoRAMergeQuantEngine.generateQuantScript();

      expect(script).toContain("GPTQConfig");
    });

    it("uses configured bits", () => {
      latheLoRAMergeQuantEngine.setConfig({
        output_format: "gptq",
        gptq_bits: 3,
      });

      const script = latheLoRAMergeQuantEngine.generateQuantScript();

      expect(script).toContain("BITS = 3");
    });
  });

  describe("FP16 Export", () => {
    it("generates FP16 script", () => {
      latheLoRAMergeQuantEngine.setConfig({ output_format: "fp16" });
      const script = latheLoRAMergeQuantEngine.generateQuantScript();

      expect(script).toContain("FP16");
      expect(script).toContain("No additional quantization");
    });
  });

  describe("Full Pipeline", () => {
    it("generates full pipeline script", () => {
      const script = latheLoRAMergeQuantEngine.generateFullPipeline();

      expect(script).toContain("run_step");
      expect(script).toContain("Merge LoRA");
      expect(script).toContain("Quantize");
    });
  });

  describe("Size Estimation", () => {
    it("estimates GGUF Q4_K_M size", () => {
      latheLoRAMergeQuantEngine.setConfig({
        output_format: "gguf",
        gguf_quant: "Q4_K_M",
      });

      const estimate = latheLoRAMergeQuantEngine.estimateSize("llama-3-8b");

      expect(estimate.fp16_size_gb).toBe(16);
      expect(estimate.estimated_size_gb).toBeLessThan(5);
      expect(estimate.compression_ratio).toBeGreaterThan(3);
    });

    it("estimates larger size for Q8", () => {
      latheLoRAMergeQuantEngine.setConfig({
        output_format: "gguf",
        gguf_quant: "Q4_K_M",
      });
      const q4 = latheLoRAMergeQuantEngine.estimateSize("llama-3-8b");

      latheLoRAMergeQuantEngine.setConfig({
        output_format: "gguf",
        gguf_quant: "Q8_0",
      });
      const q8 = latheLoRAMergeQuantEngine.estimateSize("llama-3-8b");

      expect(q8.estimated_size_gb).toBeGreaterThan(q4.estimated_size_gb);
    });

    it("estimates AWQ size", () => {
      latheLoRAMergeQuantEngine.setConfig({
        output_format: "awq",
        awq_bits: 4,
      });

      const estimate = latheLoRAMergeQuantEngine.estimateSize("llama-3-8b");

      expect(estimate.estimated_size_gb).toBeLessThan(estimate.fp16_size_gb);
    });
  });

  describe("Validation", () => {
    it("validates valid config", () => {
      const result = latheLoRAMergeQuantEngine.validateConfig();

      expect(result.valid).toBe(true);
    });

    it("requires base_model", () => {
      latheLoRAMergeQuantEngine.setConfig({ base_model: "" });
      const result = latheLoRAMergeQuantEngine.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("base_model"))).toBe(true);
    });

    it("requires adapter_path", () => {
      latheLoRAMergeQuantEngine.setConfig({ adapter_path: "" });
      const result = latheLoRAMergeQuantEngine.validateConfig();

      expect(result.valid).toBe(false);
    });

    it("warns on missing gguf_quant", () => {
      latheLoRAMergeQuantEngine.setConfig({
        output_format: "gguf",
        gguf_quant: undefined,
      });
      const result = latheLoRAMergeQuantEngine.validateConfig();

      expect(result.warnings.some(w => w.includes("gguf_quant"))).toBe(true);
    });

    it("requires hub_model_id when push_to_hub", () => {
      latheLoRAMergeQuantEngine.setConfig({
        push_to_hub: true,
        hub_model_id: undefined,
      });
      const result = latheLoRAMergeQuantEngine.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("hub_model_id"))).toBe(true);
    });
  });

  describe("Format Recommendations", () => {
    it("recommends GGUF for local", () => {
      const rec = latheLoRAMergeQuantEngine.recommendFormat("local");

      expect(rec.format).toBe("gguf");
      expect(rec.quant).toBe("Q4_K_M");
    });

    it("recommends AWQ for server", () => {
      const rec = latheLoRAMergeQuantEngine.recommendFormat("server");

      expect(rec.format).toBe("awq");
    });

    it("recommends GGUF Q4_K_S for edge", () => {
      const rec = latheLoRAMergeQuantEngine.recommendFormat("edge");

      expect(rec.format).toBe("gguf");
      expect(rec.quant).toBe("Q4_K_S");
    });

    it("includes reason", () => {
      const rec = latheLoRAMergeQuantEngine.recommendFormat("local");

      expect(rec.reason).toBeTruthy();
      expect(rec.reason.length).toBeGreaterThan(10);
    });
  });

  describe("Hub Push Script", () => {
    it("generates hub push script when enabled", () => {
      latheLoRAMergeQuantEngine.setConfig({
        push_to_hub: true,
        hub_model_id: "user/lathe-lora",
      });

      const script = latheLoRAMergeQuantEngine.generateHubPushScript();

      expect(script).toContain("huggingface_hub");
      expect(script).toContain("user/lathe-lora");
    });

    it("returns comment when disabled", () => {
      latheLoRAMergeQuantEngine.setConfig({ push_to_hub: false });

      const script = latheLoRAMergeQuantEngine.generateHubPushScript();

      expect(script).toContain("disabled");
    });
  });

  describe("Quant Types", () => {
    it("supports all GGUF quant types", () => {
      const quantTypes = ["Q4_K_M", "Q4_K_S", "Q5_K_M", "Q5_K_S", "Q6_K", "Q8_0", "F16"];

      for (const quant of quantTypes) {
        latheLoRAMergeQuantEngine.setConfig({
          output_format: "gguf",
          gguf_quant: quant as any,
        });

        const script = latheLoRAMergeQuantEngine.generateQuantScript();
        expect(script).toContain(quant);
      }
    });
  });
});
