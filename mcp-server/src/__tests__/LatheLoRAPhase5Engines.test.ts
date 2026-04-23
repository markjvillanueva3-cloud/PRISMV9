/**
 * LatheLoRA Phase 5 Engines Tests
 * LATHE-LORA-MS0 U-LLR17, U-LLR18, U-LLR19, U-LLR20
 * Model Merging & Optimization
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAMergeStrategyEngine } from "../engines/LatheLoRAMergeStrategyEngine.js";
import { latheLoRAQuantizationOptimizerEngine } from "../engines/LatheLoRAQuantizationOptimizerEngine.js";
import { latheLoRAModelRegistryEngine } from "../engines/LatheLoRAModelRegistryEngine.js";
import { latheLoRAModelOptimizerEngine } from "../engines/LatheLoRAModelOptimizerEngine.js";

// ============================================================================
// U-LLR17: LatheLoRAMergeStrategyEngine
// ============================================================================

describe("LatheLoRAMergeStrategyEngine (U-LLR17)", () => {
  beforeEach(() => {
    latheLoRAMergeStrategyEngine.reset();
  });

  describe("registerAdapter", () => {
    it("registers adapter", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "adapter-1",
        name: "Test Adapter",
        base_model: "mistral-7b",
        rank: 16,
        alpha: 32,
        target_modules: ["q_proj", "v_proj"],
        training_steps: 1000,
        loss: 0.5,
      });
      const adapter = latheLoRAMergeStrategyEngine.getAdapter("adapter-1");
      expect(adapter).toBeDefined();
      expect(adapter?.rank).toBe(16);
    });
  });

  describe("listAdapters", () => {
    it("returns all registered adapters", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "m1", rank: 8, alpha: 16,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "m1", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 200, loss: 0.2,
      });
      const adapters = latheLoRAMergeStrategyEngine.listAdapters();
      expect(adapters.length).toBe(2);
    });
  });

  describe("getStrategies", () => {
    it("returns available merge strategies", () => {
      const strategies = latheLoRAMergeStrategyEngine.getStrategies();
      expect(strategies.linear).toBeDefined();
      expect(strategies.ties).toBeDefined();
      expect(strategies.dare).toBeDefined();
    });
  });

  describe("recommendStrategy", () => {
    it("recommends strategy for registered adapters", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.25,
      });
      const rec = latheLoRAMergeStrategyEngine.recommendStrategy(["a1", "a2"]);
      expect(rec.strategy).toBeDefined();
      expect(rec.confidence).toBeGreaterThan(0);
    });
  });

  describe("checkCompatibility", () => {
    it("returns compatible for same-base adapters", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q", "v"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q", "v"], training_steps: 100, loss: 0.25,
      });
      const check = latheLoRAMergeStrategyEngine.checkCompatibility(["a1", "a2"]);
      expect(check.compatible).toBe(true);
    });

    it("returns incompatible for different bases", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "llama", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.25,
      });
      const check = latheLoRAMergeStrategyEngine.checkCompatibility(["a1", "a2"]);
      expect(check.compatible).toBe(false);
    });
  });

  describe("prepareMerge", () => {
    it("prepares merge config with normalized weights", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "m", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "m", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.25,
      });
      const prep = latheLoRAMergeStrategyEngine.prepareMerge(["a1", "a2"], {
        strategy: "linear",
        output_name: "merged",
      });
      expect(prep.valid).toBe(true);
      expect(prep.config.weights?.reduce((a, b) => a + b, 0)).toBeCloseTo(1.0);
    });
  });

  describe("executeMerge", () => {
    it("executes merge and registers result", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "m", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "m", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.25,
      });
      const result = latheLoRAMergeStrategyEngine.executeMerge(["a1", "a2"], {
        strategy: "linear",
        output_name: "merged-test",
        weights: [0.5, 0.5],
      });
      expect(result.success).toBe(true);
      expect(result.output_adapter).toBe("merged-test");
      expect(latheLoRAMergeStrategyEngine.getAdapter("merged-test")).toBeDefined();
    });
  });

  describe("calculateOptimalWeights", () => {
    it("calculates weights based on metrics", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "m", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
        metrics: { physics_score: 90, safety_score: 85, reasoning_score: 80 },
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "m", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.25,
        metrics: { physics_score: 70, safety_score: 75, reasoning_score: 80 },
      });
      const weights = latheLoRAMergeStrategyEngine.calculateOptimalWeights(["a1", "a2"], "physics");
      expect(weights[0]).toBeGreaterThan(weights[1]); // a1 has higher physics
    });
  });
});

// ============================================================================
// U-LLR18: LatheLoRAQuantizationOptimizerEngine
// ============================================================================

describe("LatheLoRAQuantizationOptimizerEngine (U-LLR18)", () => {
  beforeEach(() => {
    latheLoRAQuantizationOptimizerEngine.reset();
  });

  describe("registerModel", () => {
    it("registers model info", () => {
      latheLoRAQuantizationOptimizerEngine.registerModel({
        id: "test-7b",
        base_model: "mistral-7b",
        parameters_b: 7,
        hidden_size: 4096,
        num_layers: 32,
        vocab_size: 32000,
        original_size_gb: 14,
        has_lora: true,
        lora_rank: 16,
      });
      const model = latheLoRAQuantizationOptimizerEngine.getModel("test-7b");
      expect(model).toBeDefined();
      expect(model?.parameters_b).toBe(7);
    });
  });

  describe("getFormats", () => {
    it("returns available quantization formats", () => {
      const formats = latheLoRAQuantizationOptimizerEngine.getFormats();
      expect(formats.gguf).toBeDefined();
      expect(formats.gptq).toBeDefined();
      expect(formats.awq).toBeDefined();
    });
  });

  describe("getGGUFLevels", () => {
    it("returns GGUF quantization levels", () => {
      const levels = latheLoRAQuantizationOptimizerEngine.getGGUFLevels();
      expect(levels.Q4_K_M).toBeDefined();
      expect(levels.Q4_K_M.quality_estimate).toBeGreaterThan(80);
    });
  });

  describe("estimateSize", () => {
    it("estimates quantized size", () => {
      latheLoRAQuantizationOptimizerEngine.registerModel({
        id: "m7b", base_model: "m", parameters_b: 7, hidden_size: 4096,
        num_layers: 32, vocab_size: 32000, original_size_gb: 14, has_lora: false,
      });
      const estimate = latheLoRAQuantizationOptimizerEngine.estimateSize("m7b", {
        format: "gguf",
        gguf_level: "Q4_K_M",
      });
      expect(estimate.quantized_gb).toBeLessThan(estimate.original_gb);
      expect(estimate.compression_ratio).toBeGreaterThan(2);
    });
  });

  describe("recommendQuantization", () => {
    it("recommends GGUF for CPU-only", () => {
      const rec = latheLoRAQuantizationOptimizerEngine.recommendQuantization("model", {
        vram_gb: 0,
        ram_gb: 16,
        gpu_type: "cpu_only",
      });
      expect(rec.format).toBe("gguf");
    });

    it("recommends BNB for low VRAM", () => {
      const rec = latheLoRAQuantizationOptimizerEngine.recommendQuantization("model", {
        vram_gb: 6,
        ram_gb: 32,
        gpu_type: "nvidia",
        cuda_available: true,
      });
      expect(rec.format).toBe("bnb_4bit");
    });

    it("recommends FP16 for high VRAM", () => {
      const rec = latheLoRAQuantizationOptimizerEngine.recommendQuantization("model", {
        vram_gb: 24,
        ram_gb: 64,
        gpu_type: "nvidia",
        cuda_available: true,
      });
      expect(rec.format).toBe("fp16");
    });
  });

  describe("prepareQuantization", () => {
    it("returns quantization result with commands", () => {
      const result = latheLoRAQuantizationOptimizerEngine.prepareQuantization("model", {
        format: "gguf",
        gguf_level: "Q4_K_M",
      });
      expect(result.success).toBe(true);
      expect(result.commands.length).toBeGreaterThan(0);
      expect(result.quality_estimate).toBeGreaterThan(80);
    });
  });

  describe("compareQuantizations", () => {
    it("compares multiple formats", () => {
      const comparison = latheLoRAQuantizationOptimizerEngine.compareQuantizations("model", [
        "gguf", "gptq", "awq"
      ]);
      expect(comparison.length).toBe(3);
      expect(comparison[0].format).toBe("gguf");
    });
  });
});

// ============================================================================
// U-LLR19: LatheLoRAModelRegistryEngine
// ============================================================================

describe("LatheLoRAModelRegistryEngine (U-LLR19)", () => {
  beforeEach(() => {
    latheLoRAModelRegistryEngine.reset();
  });

  describe("register", () => {
    it("registers new model", () => {
      const model = latheLoRAModelRegistryEngine.register({
        id: "model-1",
        name: "Test Model",
        version: "1.0.0",
        base_model: "mistral-7b",
        status: "ready",
        type: "lora",
        tags: ["test"],
        description: "Test model",
        artifacts: {},
      });
      expect(model.id).toBe("model-1");
      expect(model.created_at).toBeGreaterThan(0);
    });
  });

  describe("get", () => {
    it("retrieves registered model", () => {
      latheLoRAModelRegistryEngine.register({
        id: "m1", name: "M1", version: "1.0", base_model: "m",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });
      const model = latheLoRAModelRegistryEngine.get("m1");
      expect(model?.name).toBe("M1");
    });
  });

  describe("updateStatus", () => {
    it("updates model status", () => {
      latheLoRAModelRegistryEngine.register({
        id: "m1", name: "M1", version: "1.0", base_model: "m",
        status: "training", type: "lora", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.updateStatus("m1", "ready");
      expect(latheLoRAModelRegistryEngine.get("m1")?.status).toBe("ready");
    });
  });

  describe("addBenchmarks", () => {
    it("adds benchmark scores", () => {
      latheLoRAModelRegistryEngine.register({
        id: "m1", name: "M1", version: "1.0", base_model: "m",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.addBenchmarks("m1", {
        physics_score: 85,
        safety_score: 90,
        reasoning_score: 80,
        benchmark_id: "bench-1",
      });
      const model = latheLoRAModelRegistryEngine.get("m1");
      expect(model?.benchmarks?.combined_score).toBeCloseTo(85, 0);
    });
  });

  describe("markDeployed", () => {
    it("marks model as deployed", () => {
      latheLoRAModelRegistryEngine.register({
        id: "m1", name: "M1", version: "1.0", base_model: "m",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.markDeployed("m1", "http://localhost:8000", "ollama");
      const model = latheLoRAModelRegistryEngine.get("m1");
      expect(model?.status).toBe("deployed");
      expect(model?.deployment?.active).toBe(true);
    });
  });

  describe("query", () => {
    it("filters by status", () => {
      latheLoRAModelRegistryEngine.register({
        id: "m1", name: "M1", version: "1.0", base_model: "m",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.register({
        id: "m2", name: "M2", version: "1.0", base_model: "m",
        status: "deployed", type: "lora", tags: [], description: "", artifacts: {},
      });
      const ready = latheLoRAModelRegistryEngine.query({ status: ["ready"] });
      expect(ready.length).toBe(1);
      expect(ready[0].id).toBe("m1");
    });

    it("sorts by score", () => {
      latheLoRAModelRegistryEngine.register({
        id: "m1", name: "M1", version: "1.0", base_model: "m",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.register({
        id: "m2", name: "M2", version: "1.0", base_model: "m",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.addBenchmarks("m1", {
        physics_score: 70, safety_score: 70, reasoning_score: 70, benchmark_id: "b1",
      });
      latheLoRAModelRegistryEngine.addBenchmarks("m2", {
        physics_score: 90, safety_score: 90, reasoning_score: 90, benchmark_id: "b2",
      });
      const sorted = latheLoRAModelRegistryEngine.query({
        sort_by: "combined_score",
        sort_order: "desc",
      });
      expect(sorted[0].id).toBe("m2");
    });
  });

  describe("getLineage", () => {
    it("returns model ancestors and descendants", () => {
      latheLoRAModelRegistryEngine.register({
        id: "base", name: "Base", version: "1.0", base_model: "m",
        status: "ready", type: "base", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.register({
        id: "child", name: "Child", version: "1.0", base_model: "m",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
        parent_id: "base",
      });
      const lineage = latheLoRAModelRegistryEngine.getLineage("child");
      expect(lineage?.ancestors.length).toBe(1);
      expect(lineage?.ancestors[0].id).toBe("base");
    });
  });

  describe("compareModels", () => {
    it("compares models and finds winner", () => {
      latheLoRAModelRegistryEngine.register({
        id: "m1", name: "M1", version: "1.0", base_model: "m",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.register({
        id: "m2", name: "M2", version: "1.0", base_model: "m",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.addBenchmarks("m1", {
        physics_score: 70, safety_score: 70, reasoning_score: 70, benchmark_id: "b",
      });
      latheLoRAModelRegistryEngine.addBenchmarks("m2", {
        physics_score: 90, safety_score: 85, reasoning_score: 88, benchmark_id: "b",
      });
      const comparison = latheLoRAModelRegistryEngine.compareModels(["m1", "m2"]);
      expect(comparison.winner).toBe("m2");
    });
  });

  describe("getStats", () => {
    it("returns registry statistics", () => {
      latheLoRAModelRegistryEngine.register({
        id: "m1", name: "M1", version: "1.0", base_model: "m",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });
      const stats = latheLoRAModelRegistryEngine.getStats();
      expect(stats.total_models).toBe(1);
      expect(stats.by_status.ready).toBe(1);
    });
  });

  describe("generateModelCard", () => {
    it("generates markdown model card", () => {
      latheLoRAModelRegistryEngine.register({
        id: "m1", name: "Test Model", version: "1.0", base_model: "mistral-7b",
        status: "ready", type: "lora", tags: ["lathe", "turning"],
        description: "A test model", artifacts: {},
      });
      const card = latheLoRAModelRegistryEngine.generateModelCard("m1");
      expect(card).toContain("# Test Model");
      expect(card).toContain("mistral-7b");
    });
  });
});

// ============================================================================
// U-LLR20: LatheLoRAModelOptimizerEngine
// ============================================================================

describe("LatheLoRAModelOptimizerEngine (U-LLR20)", () => {
  beforeEach(() => {
    latheLoRAModelOptimizerEngine.reset();
  });

  describe("getTechniques", () => {
    it("returns available optimization techniques", () => {
      const techniques = latheLoRAModelOptimizerEngine.getTechniques();
      expect(techniques.flash_attention).toBeDefined();
      expect(techniques.kv_cache).toBeDefined();
      expect(techniques.continuous_batching).toBeDefined();
    });
  });

  describe("getProfiles", () => {
    it("returns optimization profiles", () => {
      const profiles = latheLoRAModelOptimizerEngine.getProfiles();
      expect(profiles.length).toBeGreaterThan(0);
      expect(profiles.some(p => p.target === "latency")).toBe(true);
    });
  });

  describe("analyzeHardware", () => {
    it("identifies supported techniques for GPU", () => {
      const analysis = latheLoRAModelOptimizerEngine.analyzeHardware({
        gpu_type: "nvidia",
        vram_gb: 16,
        supports_flash_attention: true,
        supports_bf16: true,
        num_gpus: 1,
      });
      expect(analysis.supported).toContain("flash_attention");
      expect(analysis.supported).toContain("kv_cache");
    });

    it("excludes multi-GPU techniques for single GPU", () => {
      const analysis = latheLoRAModelOptimizerEngine.analyzeHardware({
        gpu_type: "nvidia",
        vram_gb: 16,
        supports_flash_attention: true,
        supports_bf16: true,
        num_gpus: 1,
      });
      expect(analysis.unsupported.some(u => u.technique === "tensor_parallelism")).toBe(true);
    });

    it("recommends memory_optimized for low VRAM", () => {
      const analysis = latheLoRAModelOptimizerEngine.analyzeHardware({
        gpu_type: "nvidia",
        vram_gb: 6,
        supports_flash_attention: false,
        supports_bf16: false,
        num_gpus: 1,
      });
      expect(analysis.recommended_profile).toBe("memory_optimized");
    });
  });

  describe("createConfig", () => {
    it("creates config from profile", () => {
      const config = latheLoRAModelOptimizerEngine.createConfig("balanced", {
        gpu_type: "nvidia",
        vram_gb: 16,
        supports_flash_attention: true,
        supports_bf16: true,
        num_gpus: 1,
      });
      expect(config.target).toBe("balanced");
      expect(config.techniques).toContain("flash_attention");
    });
  });

  describe("applyOptimizations", () => {
    it("applies optimizations and returns result", () => {
      const result = latheLoRAModelOptimizerEngine.applyOptimizations("model", {
        target: "balanced",
        techniques: ["flash_attention", "kv_cache"],
        use_bf16: true,
      });
      expect(result.success).toBe(true);
      expect(result.speedup_factor).toBeGreaterThan(1);
      expect(result.inference_code).toContain("flash_attention_2");
    });
  });

  describe("generateVLLMConfig", () => {
    it("generates vLLM launch command", () => {
      const command = latheLoRAModelOptimizerEngine.generateVLLMConfig("model", {
        target: "throughput",
        techniques: ["continuous_batching"],
        use_bf16: true,
        max_batch_size: 32,
        context_length: 4096,
      });
      expect(command).toContain("vllm");
      expect(command).toContain("bfloat16");
    });
  });

  describe("estimatePerformance", () => {
    it("estimates performance from config", () => {
      const estimate = latheLoRAModelOptimizerEngine.estimatePerformance({
        target: "throughput",
        techniques: ["flash_attention", "continuous_batching"],
        max_batch_size: 16,
      });
      expect(estimate.estimated_tps).toBeGreaterThan(0);
      expect(estimate.estimated_ttft_ms).toBeGreaterThan(0);
    });
  });

  describe("recordBenchmark", () => {
    it("records and retrieves benchmarks", () => {
      latheLoRAModelOptimizerEngine.recordBenchmark("model", {
        tokens_per_second: 50,
        time_to_first_token_ms: 80,
        latency_per_token_ms: 20,
        memory_peak_gb: 10,
        batch_size: 1,
        context_length: 2048,
      });
      const benchmarks = latheLoRAModelOptimizerEngine.getBenchmarks("model");
      expect(benchmarks.length).toBe(1);
      expect(benchmarks[0].tokens_per_second).toBe(50);
    });
  });

  describe("getSummary", () => {
    it("formats optimization summary", () => {
      const result = latheLoRAModelOptimizerEngine.applyOptimizations("model", {
        target: "balanced",
        techniques: ["flash_attention"],
      });
      const summary = latheLoRAModelOptimizerEngine.getSummary(result);
      expect(summary).toContain("flash_attention");
      expect(summary).toContain("Speedup");
    });
  });
});
