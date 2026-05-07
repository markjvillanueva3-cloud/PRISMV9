/**
 * LatheLoRAQuantizationOptimizerEngine Tests
 * LATHE-LORA-MS0 U-LLR18: Model quantization optimization
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAQuantizationOptimizerEngine, type ModelInfo, type HardwareProfile, type QuantConfig } from "../engines/LatheLoRAQuantizationOptimizerEngine.js";

describe("LatheLoRAQuantizationOptimizerEngine", () => {
  beforeEach(() => {
    latheLoRAQuantizationOptimizerEngine.reset();
  });

  describe("registerModel / getModel", () => {
    it("registers and retrieves model info", () => {
      const model: ModelInfo = {
        id: "lathe-lora-7b",
        base_model: "mistral-7b",
        parameters_b: 7,
        hidden_size: 4096,
        num_layers: 32,
        vocab_size: 32000,
        original_size_gb: 14,
        has_lora: true,
        lora_rank: 16,
      };

      latheLoRAQuantizationOptimizerEngine.registerModel(model);
      const retrieved = latheLoRAQuantizationOptimizerEngine.getModel("lathe-lora-7b");

      expect(retrieved).toBeDefined();
      expect(retrieved?.parameters_b).toBe(7);
      expect(retrieved?.has_lora).toBe(true);
    });

    it("returns undefined for unknown model", () => {
      expect(latheLoRAQuantizationOptimizerEngine.getModel("nonexistent")).toBeUndefined();
    });
  });

  describe("getFormats", () => {
    it("returns all quantization formats", () => {
      const formats = latheLoRAQuantizationOptimizerEngine.getFormats();
      expect(formats.gguf).toBeDefined();
      expect(formats.gptq).toBeDefined();
      expect(formats.awq).toBeDefined();
      expect(formats.bnb_4bit).toBeDefined();
      expect(formats.bnb_8bit).toBeDefined();
      expect(formats.onnx).toBeDefined();
      expect(formats.fp16).toBeDefined();
    });

    it("includes inference speed info", () => {
      const formats = latheLoRAQuantizationOptimizerEngine.getFormats();
      expect(formats.gguf.inference_speed).toBe("fast");
      expect(formats.fp16.inference_speed).toBe("slow");
    });
  });

  describe("getGGUFLevels", () => {
    it("returns all GGUF quantization levels", () => {
      const levels = latheLoRAQuantizationOptimizerEngine.getGGUFLevels();
      expect(levels.Q2_K).toBeDefined();
      expect(levels.Q4_K_M).toBeDefined();
      expect(levels.Q8_0).toBeDefined();
      expect(levels.F16).toBeDefined();
    });

    it("includes quality estimates", () => {
      const levels = latheLoRAQuantizationOptimizerEngine.getGGUFLevels();
      expect(levels.Q2_K.quality_estimate).toBeLessThan(levels.Q4_K_M.quality_estimate);
      expect(levels.Q4_K_M.quality_estimate).toBeLessThan(levels.Q8_0.quality_estimate);
      expect(levels.Q8_0.quality_estimate).toBeLessThan(levels.F16.quality_estimate);
    });

    it("has bits per weight info", () => {
      const levels = latheLoRAQuantizationOptimizerEngine.getGGUFLevels();
      expect(levels.Q4_0.bits_per_weight).toBe(4);
      expect(levels.Q8_0.bits_per_weight).toBe(8);
      expect(levels.F16.bits_per_weight).toBe(16);
    });
  });

  describe("estimateSize", () => {
    it("estimates GGUF Q4_K_M size", () => {
      latheLoRAQuantizationOptimizerEngine.registerModel({
        id: "model-7b",
        base_model: "base",
        parameters_b: 7,
        hidden_size: 4096,
        num_layers: 32,
        vocab_size: 32000,
        original_size_gb: 14,
        has_lora: false,
      });

      const est = latheLoRAQuantizationOptimizerEngine.estimateSize("model-7b", {
        format: "gguf",
        gguf_level: "Q4_K_M",
      });

      expect(est.original_gb).toBe(14);
      expect(est.quantized_gb).toBeCloseTo(7 * 4.5 / 8, 1); // 7B * 4.5 bits / 8
      expect(est.compression_ratio).toBeGreaterThan(1);
    });

    it("estimates BNB 4-bit size", () => {
      latheLoRAQuantizationOptimizerEngine.registerModel({
        id: "model-7b",
        base_model: "base",
        parameters_b: 7,
        hidden_size: 4096,
        num_layers: 32,
        vocab_size: 32000,
        original_size_gb: 14,
        has_lora: false,
      });

      const est = latheLoRAQuantizationOptimizerEngine.estimateSize("model-7b", {
        format: "bnb_4bit",
      });

      expect(est.quantized_gb).toBeCloseTo(3.5, 1); // 7B * 4 bits / 8
    });

    it("estimates VRAM requirement", () => {
      latheLoRAQuantizationOptimizerEngine.registerModel({
        id: "model-7b",
        base_model: "base",
        parameters_b: 7,
        hidden_size: 4096,
        num_layers: 32,
        vocab_size: 32000,
        original_size_gb: 14,
        has_lora: false,
      });

      const est = latheLoRAQuantizationOptimizerEngine.estimateSize("model-7b", {
        format: "gguf",
        gguf_level: "Q4_K_M",
      });

      // VRAM should be quantized size + overhead
      expect(est.vram_required_gb).toBeGreaterThan(est.quantized_gb);
    });
  });

  describe("recommendQuantization", () => {
    it("recommends GGUF for CPU-only", () => {
      latheLoRAQuantizationOptimizerEngine.registerModel({
        id: "model-7b",
        base_model: "base",
        parameters_b: 7,
        hidden_size: 4096,
        num_layers: 32,
        vocab_size: 32000,
        original_size_gb: 14,
        has_lora: false,
      });

      const hardware: HardwareProfile = {
        vram_gb: 0,
        ram_gb: 32,
        gpu_type: "cpu_only",
        cuda_available: false,
      };

      const rec = latheLoRAQuantizationOptimizerEngine.recommendQuantization("model-7b", hardware);
      expect(rec.format).toBe("gguf");
      expect(rec.confidence).toBeGreaterThan(0.8);
    });

    it("recommends GGUF for Apple Silicon", () => {
      const hardware: HardwareProfile = {
        vram_gb: 16,
        ram_gb: 16,
        gpu_type: "apple",
        cuda_available: false,
      };

      const rec = latheLoRAQuantizationOptimizerEngine.recommendQuantization("model", hardware);
      expect(rec.format).toBe("gguf");
      // Apple without CUDA triggers CPU-only path which also recommends GGUF
      expect(rec.reasoning).toContain("GGUF");
    });

    it("recommends BNB for low VRAM NVIDIA", () => {
      latheLoRAQuantizationOptimizerEngine.registerModel({
        id: "model-7b",
        base_model: "base",
        parameters_b: 7,
        hidden_size: 4096,
        num_layers: 32,
        vocab_size: 32000,
        original_size_gb: 14,
        has_lora: false,
      });

      const hardware: HardwareProfile = {
        vram_gb: 6,
        ram_gb: 32,
        gpu_type: "nvidia",
        cuda_available: true,
      };

      const rec = latheLoRAQuantizationOptimizerEngine.recommendQuantization("model-7b", hardware);
      expect(rec.format).toBe("bnb_4bit");
    });

    it("recommends GPTQ for medium VRAM", () => {
      latheLoRAQuantizationOptimizerEngine.registerModel({
        id: "model-7b",
        base_model: "base",
        parameters_b: 7,
        hidden_size: 4096,
        num_layers: 32,
        vocab_size: 32000,
        original_size_gb: 14,
        has_lora: false,
      });

      const hardware: HardwareProfile = {
        vram_gb: 12,
        ram_gb: 32,
        gpu_type: "nvidia",
        cuda_available: true,
      };

      const rec = latheLoRAQuantizationOptimizerEngine.recommendQuantization("model-7b", hardware);
      expect(rec.format).toBe("gptq");
    });

    it("recommends FP16 for high VRAM", () => {
      const hardware: HardwareProfile = {
        vram_gb: 24,
        ram_gb: 64,
        gpu_type: "nvidia",
        cuda_available: true,
      };

      const rec = latheLoRAQuantizationOptimizerEngine.recommendQuantization("model", hardware);
      expect(rec.format).toBe("fp16");
      expect(rec.confidence).toBe(0.9);
    });
  });

  describe("generateQuantizationCommands", () => {
    it("generates GGUF commands", () => {
      const commands = latheLoRAQuantizationOptimizerEngine.generateQuantizationCommands(
        "model-7b",
        { format: "gguf", gguf_level: "Q4_K_M" },
        "./output"
      );

      expect(commands.some(c => c.includes("convert.py"))).toBe(true);
      expect(commands.some(c => c.includes("quantize"))).toBe(true);
      expect(commands.some(c => c.includes("Q4_K_M"))).toBe(true);
    });

    it("generates GPTQ commands", () => {
      const commands = latheLoRAQuantizationOptimizerEngine.generateQuantizationCommands(
        "model-7b",
        { format: "gptq", bits: 4, group_size: 128, calibration_samples: 512 },
        "./output"
      );

      expect(commands.some(c => c.includes("auto_gptq"))).toBe(true);
      expect(commands.some(c => c.includes("--bits 4"))).toBe(true);
      expect(commands.some(c => c.includes("--group_size 128"))).toBe(true);
    });

    it("generates AWQ Python code", () => {
      const commands = latheLoRAQuantizationOptimizerEngine.generateQuantizationCommands(
        "model-7b",
        { format: "awq", bits: 4, group_size: 128 },
        "./output"
      );

      expect(commands.some(c => c.includes("from awq import"))).toBe(true);
      expect(commands.some(c => c.includes("quantize"))).toBe(true);
    });

    it("generates BNB loading code", () => {
      const commands = latheLoRAQuantizationOptimizerEngine.generateQuantizationCommands(
        "model-7b",
        { format: "bnb_4bit", bits: 4, use_double_quant: true },
        "./output"
      );

      expect(commands.some(c => c.includes("BitsAndBytesConfig"))).toBe(true);
      expect(commands.some(c => c.includes("load_in_4bit=True"))).toBe(true);
      expect(commands.some(c => c.includes("double_quant"))).toBe(true);
    });

    it("generates ONNX export command", () => {
      const commands = latheLoRAQuantizationOptimizerEngine.generateQuantizationCommands(
        "model-7b",
        { format: "onnx" },
        "./output"
      );

      expect(commands.some(c => c.includes("transformers.onnx"))).toBe(true);
    });
  });

  describe("prepareQuantization", () => {
    it("prepares full quantization result", () => {
      latheLoRAQuantizationOptimizerEngine.registerModel({
        id: "model-7b",
        base_model: "base",
        parameters_b: 7,
        hidden_size: 4096,
        num_layers: 32,
        vocab_size: 32000,
        original_size_gb: 14,
        has_lora: false,
      });

      const result = latheLoRAQuantizationOptimizerEngine.prepareQuantization(
        "model-7b",
        { format: "gguf", gguf_level: "Q4_K_M" },
        "./quantized"
      );

      expect(result.success).toBe(true);
      expect(result.format).toBe("gguf");
      expect(result.compression_ratio).toBeGreaterThan(1);
      expect(result.quality_estimate).toBe(85); // Q4_K_M quality
      expect(result.commands.length).toBeGreaterThan(0);
    });

    it("warns about aggressive quantization", () => {
      const result = latheLoRAQuantizationOptimizerEngine.prepareQuantization(
        "model-7b",
        { format: "gguf", gguf_level: "Q2_K" }
      );

      expect(result.warnings.some(w => w.includes("quality"))).toBe(true);
    });

    it("warns about calibration for GPTQ/AWQ", () => {
      const result = latheLoRAQuantizationOptimizerEngine.prepareQuantization(
        "model-7b",
        { format: "gptq" }
      );

      expect(result.warnings.some(w => w.includes("calibration"))).toBe(true);
    });
  });

  describe("compareQuantizations", () => {
    it("compares multiple quantization options", () => {
      latheLoRAQuantizationOptimizerEngine.registerModel({
        id: "model-7b",
        base_model: "base",
        parameters_b: 7,
        hidden_size: 4096,
        num_layers: 32,
        vocab_size: 32000,
        original_size_gb: 14,
        has_lora: false,
      });

      const comparison = latheLoRAQuantizationOptimizerEngine.compareQuantizations(
        "model-7b",
        ["gguf", "gptq", "fp16"]
      );

      expect(comparison.length).toBe(3);
      expect(comparison.find(c => c.format === "gguf")).toBeDefined();
      expect(comparison.find(c => c.format === "fp16")?.quality).toBe(100);
    });

    it("shows GPU requirements", () => {
      const comparison = latheLoRAQuantizationOptimizerEngine.compareQuantizations(
        "model",
        ["gguf", "gptq"]
      );

      const gguf = comparison.find(c => c.format === "gguf");
      const gptq = comparison.find(c => c.format === "gptq");

      expect(gguf?.gpu_required).toBe(false);
      expect(gptq?.gpu_required).toBe(true);
    });
  });

  describe("getSummary", () => {
    it("formats quantization summary", () => {
      const result = latheLoRAQuantizationOptimizerEngine.prepareQuantization(
        "model",
        { format: "gguf", gguf_level: "Q4_K_M" }
      );

      const summary = latheLoRAQuantizationOptimizerEngine.getSummary(result);
      expect(summary).toContain("GGUF");
      expect(summary).toContain("Quality:");
      expect(summary).toContain("VRAM:");
    });
  });

  describe("reset", () => {
    it("clears registered models", () => {
      latheLoRAQuantizationOptimizerEngine.registerModel({
        id: "model-7b",
        base_model: "base",
        parameters_b: 7,
        hidden_size: 4096,
        num_layers: 32,
        vocab_size: 32000,
        original_size_gb: 14,
        has_lora: false,
      });

      latheLoRAQuantizationOptimizerEngine.reset();

      expect(latheLoRAQuantizationOptimizerEngine.getModel("model-7b")).toBeUndefined();
    });
  });
});
