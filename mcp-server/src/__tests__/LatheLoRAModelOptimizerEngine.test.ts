/**
 * LatheLoRAModelOptimizerEngine Tests
 * LATHE-LORA-MS0 U-LLR20: Model optimization for inference
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAModelOptimizerEngine, type HardwareCapabilities, type OptimizationConfig, type OptimizationTechnique } from "../engines/LatheLoRAModelOptimizerEngine.js";

describe("LatheLoRAModelOptimizerEngine", () => {
  beforeEach(() => {
    latheLoRAModelOptimizerEngine.reset();
  });

  describe("getTechniques", () => {
    it("returns all optimization techniques", () => {
      const techniques = latheLoRAModelOptimizerEngine.getTechniques();
      expect(techniques.flash_attention).toBeDefined();
      expect(techniques.kv_cache).toBeDefined();
      expect(techniques.continuous_batching).toBeDefined();
      expect(techniques.speculative_decoding).toBeDefined();
      expect(techniques.tensor_parallelism).toBeDefined();
      expect(techniques.torch_compile).toBeDefined();
    });

    it("includes speed and memory impact", () => {
      const techniques = latheLoRAModelOptimizerEngine.getTechniques();
      expect(techniques.flash_attention.speed_impact).toBeGreaterThan(1);
      expect(techniques.flash_attention.memory_impact).toBeLessThan(0);
    });

    it("lists requirements", () => {
      const techniques = latheLoRAModelOptimizerEngine.getTechniques();
      expect(techniques.flash_attention.requirements).toContain("CUDA GPU");
      expect(techniques.tensor_parallelism.requirements).toContain("Multiple GPUs");
    });
  });

  describe("getProfiles", () => {
    it("returns default optimization profiles", () => {
      const profiles = latheLoRAModelOptimizerEngine.getProfiles();
      expect(profiles.length).toBeGreaterThan(0);

      const profileIds = profiles.map(p => p.id);
      expect(profileIds).toContain("low_latency");
      expect(profileIds).toContain("high_throughput");
      expect(profileIds).toContain("memory_optimized");
      expect(profileIds).toContain("balanced");
    });

    it("profiles have estimated speedup", () => {
      const profiles = latheLoRAModelOptimizerEngine.getProfiles();
      const highThroughput = profiles.find(p => p.id === "high_throughput");
      expect(highThroughput?.estimated_speedup).toBeGreaterThan(1);
    });
  });

  describe("getProfile", () => {
    it("retrieves profile by ID", () => {
      const profile = latheLoRAModelOptimizerEngine.getProfile("low_latency");
      expect(profile).toBeDefined();
      expect(profile?.name).toBe("Low Latency");
      expect(profile?.target).toBe("latency");
    });

    it("returns undefined for unknown profile", () => {
      expect(latheLoRAModelOptimizerEngine.getProfile("nonexistent")).toBeUndefined();
    });
  });

  describe("addProfile", () => {
    it("adds custom profile", () => {
      latheLoRAModelOptimizerEngine.addProfile({
        id: "custom",
        name: "Custom Profile",
        target: "balanced",
        techniques: ["flash_attention", "kv_cache"],
        parameters: { max_batch_size: 4 },
        estimated_speedup: 1.5,
        memory_reduction: 0.2,
      });

      const profile = latheLoRAModelOptimizerEngine.getProfile("custom");
      expect(profile).toBeDefined();
      expect(profile?.name).toBe("Custom Profile");
    });
  });

  describe("analyzeHardware", () => {
    it("identifies supported techniques for high-end GPU", () => {
      const hardware: HardwareCapabilities = {
        gpu_type: "RTX 4090",
        vram_gb: 24,
        compute_capability: 8.9,
        supports_flash_attention: true,
        supports_bf16: true,
        num_gpus: 1,
      };

      const analysis = latheLoRAModelOptimizerEngine.analyzeHardware(hardware);

      expect(analysis.supported).toContain("flash_attention");
      expect(analysis.supported).toContain("kv_cache");
      expect(analysis.supported).toContain("torch_compile");
    });

    it("excludes multi-GPU techniques for single GPU", () => {
      const hardware: HardwareCapabilities = {
        gpu_type: "RTX 3080",
        vram_gb: 10,
        supports_flash_attention: true,
        supports_bf16: true,
        num_gpus: 1,
      };

      const analysis = latheLoRAModelOptimizerEngine.analyzeHardware(hardware);

      expect(analysis.unsupported.find(u => u.technique === "tensor_parallelism")).toBeDefined();
      expect(analysis.unsupported.find(u => u.technique === "pipeline_parallelism")).toBeDefined();
    });

    it("excludes flash attention for non-Ampere GPU", () => {
      const hardware: HardwareCapabilities = {
        gpu_type: "GTX 1080",
        vram_gb: 8,
        compute_capability: 6.1,
        supports_flash_attention: false,
        supports_bf16: false,
        num_gpus: 1,
      };

      const analysis = latheLoRAModelOptimizerEngine.analyzeHardware(hardware);

      expect(analysis.unsupported.find(u => u.technique === "flash_attention")).toBeDefined();
    });

    it("recommends memory_optimized for low VRAM", () => {
      const hardware: HardwareCapabilities = {
        gpu_type: "RTX 3060",
        vram_gb: 6,
        supports_flash_attention: true,
        supports_bf16: true,
        num_gpus: 1,
      };

      const analysis = latheLoRAModelOptimizerEngine.analyzeHardware(hardware);
      expect(analysis.recommended_profile).toBe("memory_optimized");
    });

    it("recommends high_throughput for multi-GPU", () => {
      const hardware: HardwareCapabilities = {
        gpu_type: "A100",
        vram_gb: 40,
        supports_flash_attention: true,
        supports_bf16: true,
        num_gpus: 4,
      };

      const analysis = latheLoRAModelOptimizerEngine.analyzeHardware(hardware);
      expect(analysis.recommended_profile).toBe("high_throughput");
    });
  });

  describe("createConfig", () => {
    it("creates config from profile and hardware", () => {
      const hardware: HardwareCapabilities = {
        gpu_type: "RTX 4090",
        vram_gb: 24,
        supports_flash_attention: true,
        supports_bf16: true,
        num_gpus: 1,
      };

      const config = latheLoRAModelOptimizerEngine.createConfig("low_latency", hardware);

      expect(config.target).toBe("latency");
      expect(config.techniques).toContain("flash_attention");
      expect(config.use_bf16).toBe(true);
      expect(config.flash_attention_version).toBe(2);
    });

    it("filters unsupported techniques", () => {
      const hardware: HardwareCapabilities = {
        gpu_type: "GTX 1080",
        vram_gb: 8,
        supports_flash_attention: false,
        supports_bf16: false,
        num_gpus: 1,
      };

      const config = latheLoRAModelOptimizerEngine.createConfig("low_latency", hardware);

      expect(config.techniques).not.toContain("flash_attention");
    });

    it("applies overrides", () => {
      const hardware: HardwareCapabilities = {
        gpu_type: "RTX 4090",
        vram_gb: 24,
        supports_flash_attention: true,
        supports_bf16: true,
        num_gpus: 1,
      };

      const config = latheLoRAModelOptimizerEngine.createConfig("balanced", hardware, {
        max_batch_size: 32,
        context_length: 8192,
      });

      expect(config.max_batch_size).toBe(32);
      expect(config.context_length).toBe(8192);
    });

    it("sets tensor parallel size for multi-GPU", () => {
      const hardware: HardwareCapabilities = {
        gpu_type: "A100",
        vram_gb: 40,
        supports_flash_attention: true,
        supports_bf16: true,
        num_gpus: 4,
      };

      const config = latheLoRAModelOptimizerEngine.createConfig("high_throughput", hardware);
      expect(config.tensor_parallel_size).toBe(4);
    });
  });

  describe("applyOptimizations", () => {
    it("applies optimizations and estimates performance", () => {
      const config: OptimizationConfig = {
        target: "latency",
        techniques: ["flash_attention", "kv_cache", "torch_compile"],
        use_bf16: true,
        max_batch_size: 1,
        context_length: 4096,
      };

      const result = latheLoRAModelOptimizerEngine.applyOptimizations("lathe-lora-7b", config);

      expect(result.success).toBe(true);
      expect(result.applied_techniques).toEqual(["flash_attention", "kv_cache", "torch_compile"]);
      expect(result.speedup_factor).toBeGreaterThan(1);
      expect(result.estimated_latency_ms).toBeLessThan(50);
      expect(result.inference_code).toContain("AutoModelForCausalLM");
    });

    it("warns about missing draft model for speculative decoding", () => {
      const config: OptimizationConfig = {
        target: "throughput",
        techniques: ["speculative_decoding"],
        max_batch_size: 8,
      };

      const result = latheLoRAModelOptimizerEngine.applyOptimizations("model", config);

      expect(result.warnings.some(w => w.includes("draft model"))).toBe(true);
    });

    it("warns about high memory usage", () => {
      const config: OptimizationConfig = {
        target: "throughput",
        techniques: ["continuous_batching", "speculative_decoding"],
        max_batch_size: 64,
      };

      const result = latheLoRAModelOptimizerEngine.applyOptimizations("model", config);

      // High batch size + speculative decoding increases memory
      expect(result.memory_usage_gb).toBeGreaterThan(10);
    });

    it("generates config changes", () => {
      const config: OptimizationConfig = {
        target: "latency",
        techniques: ["flash_attention"],
        flash_attention_version: 2,
        use_bf16: true,
        kv_cache_size_gb: 4,
        enable_torch_compile: true,
      };

      const result = latheLoRAModelOptimizerEngine.applyOptimizations("model", config);

      expect(result.config_changes.attn_implementation).toBe("flash_attention_2");
      expect(result.config_changes.torch_dtype).toBe("bfloat16");
      expect(result.config_changes.compile_mode).toBe("reduce-overhead");
    });
  });

  describe("generateInferenceCode", () => {
    it("generates Python inference code", () => {
      const config: OptimizationConfig = {
        target: "latency",
        techniques: ["flash_attention", "kv_cache"],
        use_bf16: true,
      };

      const code = latheLoRAModelOptimizerEngine.generateInferenceCode("lathe-lora-7b", config);

      expect(code).toContain("import torch");
      expect(code).toContain("AutoModelForCausalLM.from_pretrained");
      expect(code).toContain("lathe-lora-7b");
      expect(code).toContain("flash_attention_2");
      expect(code).toContain("bfloat16");
      expect(code).toContain("use_cache=True");
    });

    it("includes torch.compile when enabled", () => {
      const config: OptimizationConfig = {
        target: "latency",
        techniques: ["torch_compile"],
        enable_torch_compile: true,
      };

      const code = latheLoRAModelOptimizerEngine.generateInferenceCode("model", config);
      expect(code).toContain("torch.compile");
      expect(code).toContain("reduce-overhead");
    });

    it("generates inference function", () => {
      const config: OptimizationConfig = {
        target: "throughput",
        techniques: [],
      };

      const code = latheLoRAModelOptimizerEngine.generateInferenceCode("model", config);
      expect(code).toContain("def generate(prompt: str");
      expect(code).toContain("model.generate");
      expect(code).toContain("Example usage");
    });
  });

  describe("generateVLLMConfig", () => {
    it("generates vLLM launch command", () => {
      const config: OptimizationConfig = {
        target: "throughput",
        techniques: ["flash_attention", "continuous_batching"],
        use_bf16: true,
        max_batch_size: 32,
        context_length: 4096,
      };

      const cmd = latheLoRAModelOptimizerEngine.generateVLLMConfig("lathe-lora-7b", config);

      expect(cmd).toContain("vllm.entrypoints.openai.api_server");
      expect(cmd).toContain("--model lathe-lora-7b");
      expect(cmd).toContain("--dtype bfloat16");
    });

    it("includes tensor parallelism", () => {
      const config: OptimizationConfig = {
        target: "throughput",
        techniques: ["tensor_parallelism"],
        tensor_parallel_size: 4,
      };

      const cmd = latheLoRAModelOptimizerEngine.generateVLLMConfig("model", config);
      expect(cmd).toContain("--tensor-parallel-size 4");
    });

    it("includes speculative decoding config", () => {
      const config: OptimizationConfig = {
        target: "throughput",
        techniques: ["speculative_decoding"],
        speculative_draft_model: "draft-model",
        num_speculative_tokens: 5,
      };

      const cmd = latheLoRAModelOptimizerEngine.generateVLLMConfig("model", config);
      expect(cmd).toContain("--speculative-model draft-model");
      expect(cmd).toContain("--num-speculative-tokens 5");
    });
  });

  describe("recordBenchmark / getBenchmarks", () => {
    it("records and retrieves benchmarks", () => {
      latheLoRAModelOptimizerEngine.recordBenchmark("model-1", {
        tokens_per_second: 150,
        time_to_first_token_ms: 25,
        latency_per_token_ms: 6.7,
        memory_peak_gb: 8.5,
        batch_size: 8,
        context_length: 4096,
      });

      const benchmarks = latheLoRAModelOptimizerEngine.getBenchmarks("model-1");
      expect(benchmarks.length).toBe(1);
      expect(benchmarks[0].tokens_per_second).toBe(150);
    });

    it("stores multiple benchmarks per model", () => {
      latheLoRAModelOptimizerEngine.recordBenchmark("model-1", {
        tokens_per_second: 100, time_to_first_token_ms: 30,
        latency_per_token_ms: 10, memory_peak_gb: 8,
        batch_size: 1, context_length: 4096,
      });
      latheLoRAModelOptimizerEngine.recordBenchmark("model-1", {
        tokens_per_second: 200, time_to_first_token_ms: 25,
        latency_per_token_ms: 5, memory_peak_gb: 10,
        batch_size: 16, context_length: 4096,
      });

      const benchmarks = latheLoRAModelOptimizerEngine.getBenchmarks("model-1");
      expect(benchmarks.length).toBe(2);
    });

    it("returns empty array for unknown model", () => {
      expect(latheLoRAModelOptimizerEngine.getBenchmarks("unknown")).toEqual([]);
    });
  });

  describe("estimatePerformance", () => {
    it("estimates performance from config", () => {
      const config: OptimizationConfig = {
        target: "throughput",
        techniques: ["flash_attention", "continuous_batching"],
        max_batch_size: 16,
      };

      const estimate = latheLoRAModelOptimizerEngine.estimatePerformance(config);

      expect(estimate.estimated_tps).toBeGreaterThan(30); // Base is 30
      expect(estimate.estimated_ttft_ms).toBeLessThan(100); // Base is 100
      expect(estimate.estimated_memory_gb).toBeGreaterThan(0);
    });

    it("accounts for memory-reducing techniques", () => {
      const configWithMemOpt: OptimizationConfig = {
        target: "memory",
        techniques: ["memory_efficient_attention", "gradient_checkpointing"],
        max_batch_size: 1,
      };

      const configBaseline: OptimizationConfig = {
        target: "latency",
        techniques: [],
        max_batch_size: 1,
      };

      const estWithOpt = latheLoRAModelOptimizerEngine.estimatePerformance(configWithMemOpt);
      const estBaseline = latheLoRAModelOptimizerEngine.estimatePerformance(configBaseline);

      expect(estWithOpt.estimated_memory_gb).toBeLessThan(estBaseline.estimated_memory_gb);
    });
  });

  describe("getSummary", () => {
    it("formats optimization summary", () => {
      const config: OptimizationConfig = {
        target: "latency",
        techniques: ["flash_attention", "kv_cache"],
      };

      const result = latheLoRAModelOptimizerEngine.applyOptimizations("model", config);
      const summary = latheLoRAModelOptimizerEngine.getSummary(result);

      expect(summary).toContain("flash_attention");
      expect(summary).toContain("Speedup:");
      expect(summary).toContain("Latency:");
      expect(summary).toContain("Throughput:");
      expect(summary).toContain("Memory:");
    });

    it("shows warning count when present", () => {
      const config: OptimizationConfig = {
        target: "throughput",
        techniques: ["speculative_decoding"],
        max_batch_size: 64,
      };

      const result = latheLoRAModelOptimizerEngine.applyOptimizations("model", config);
      const summary = latheLoRAModelOptimizerEngine.getSummary(result);

      if (result.warnings.length > 0) {
        expect(summary).toContain("Warnings:");
      }
    });
  });

  describe("reset", () => {
    it("clears benchmarks and reloads default profiles", () => {
      latheLoRAModelOptimizerEngine.recordBenchmark("model", {
        tokens_per_second: 100, time_to_first_token_ms: 30,
        latency_per_token_ms: 10, memory_peak_gb: 8,
        batch_size: 1, context_length: 4096,
      });
      latheLoRAModelOptimizerEngine.addProfile({
        id: "custom", name: "Custom", target: "balanced",
        techniques: [], parameters: {}, estimated_speedup: 1, memory_reduction: 0,
      });

      latheLoRAModelOptimizerEngine.reset();

      expect(latheLoRAModelOptimizerEngine.getBenchmarks("model")).toEqual([]);
      expect(latheLoRAModelOptimizerEngine.getProfile("custom")).toBeUndefined();
      expect(latheLoRAModelOptimizerEngine.getProfile("low_latency")).toBeDefined();
    });
  });
});
