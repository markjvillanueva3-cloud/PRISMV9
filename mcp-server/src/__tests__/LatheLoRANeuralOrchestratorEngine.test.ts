/**
 * LatheLoRANeuralOrchestratorEngine Tests — LATHE-LORA-MS0 U-LLR36
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRANeuralOrchestratorEngine } from "../engines/LatheLoRANeuralOrchestratorEngine.js";

describe("LatheLoRANeuralOrchestratorEngine", () => {
  beforeEach(() => {
    latheLoRANeuralOrchestratorEngine.reset();
  });

  describe("configuration", () => {
    it("returns default config with budget", () => {
      const cfg = latheLoRANeuralOrchestratorEngine.getConfig();
      expect(cfg.default_budget.max_latency_ms).toBe(5000);
      expect(cfg.parallel_stages).toBe(false);
      expect(cfg.max_retries).toBe(2);
    });

    it("merges partial config", () => {
      latheLoRANeuralOrchestratorEngine.setConfig({ max_retries: 5 });
      expect(latheLoRANeuralOrchestratorEngine.getConfig().max_retries).toBe(5);
    });

    it("merges partial budget", () => {
      latheLoRANeuralOrchestratorEngine.setConfig({
        default_budget: { max_latency_ms: 100, max_memory_mb: 128, enable_caching: false, enable_attention: true, enable_physics_validation: true },
      });
      expect(latheLoRANeuralOrchestratorEngine.getConfig().default_budget.max_latency_ms).toBe(100);
      expect(latheLoRANeuralOrchestratorEngine.getConfig().default_budget.enable_caching).toBe(false);
    });
  });

  describe("pipeline lifecycle", () => {
    it("starts a pipeline with unique id", () => {
      const p = latheLoRANeuralOrchestratorEngine.startPipeline("test input");
      expect(p.id).toMatch(/^pipeline-/);
      expect(p.input).toBe("test input");
      expect(p.stages_completed).toHaveLength(0);
    });

    it("records stage completion", () => {
      const p = latheLoRANeuralOrchestratorEngine.startPipeline("hello");
      expect(latheLoRANeuralOrchestratorEngine.completeStage(p.id, "tokenize", 50)).toBe(true);
      const updated = latheLoRANeuralOrchestratorEngine.getPipeline(p.id);
      expect(updated?.stages_completed).toContain("tokenize");
      expect(updated?.stage_timings["tokenize"]).toBe(50);
    });

    it("flags cache_hit when metadata.hit is true", () => {
      const p = latheLoRANeuralOrchestratorEngine.startPipeline("x");
      latheLoRANeuralOrchestratorEngine.completeStage(p.id, "cache_lookup", 5, { hit: true });
      expect(latheLoRANeuralOrchestratorEngine.getPipeline(p.id)?.cache_hit).toBe(true);
    });

    it("flags attention_analyzed and physics_validated", () => {
      const p = latheLoRANeuralOrchestratorEngine.startPipeline("x");
      latheLoRANeuralOrchestratorEngine.completeStage(p.id, "attention_compute", 10);
      latheLoRANeuralOrchestratorEngine.completeStage(p.id, "physics_validate", 10);
      const ctx = latheLoRANeuralOrchestratorEngine.getPipeline(p.id);
      expect(ctx?.attention_analyzed).toBe(true);
      expect(ctx?.physics_validated).toBe(true);
    });

    it("returns false when completing stage for unknown pipeline", () => {
      expect(latheLoRANeuralOrchestratorEngine.completeStage("nope", "tokenize", 1)).toBe(false);
    });

    it("completes pipeline and archives context", () => {
      const p = latheLoRANeuralOrchestratorEngine.startPipeline("x");
      latheLoRANeuralOrchestratorEngine.completeStage(p.id, "tokenize", 10);
      const done = latheLoRANeuralOrchestratorEngine.completePipeline(p.id, "G01 X1");
      expect(done?.output).toBe("G01 X1");
      expect(latheLoRANeuralOrchestratorEngine.getActivePipelines()).toHaveLength(0);
      expect(latheLoRANeuralOrchestratorEngine.getCompletedPipelines()).toHaveLength(1);
    });

    it("returns null when completing unknown pipeline", () => {
      expect(latheLoRANeuralOrchestratorEngine.completePipeline("nope", "x")).toBeNull();
    });
  });

  describe("stage planning", () => {
    it("plans stages with full budget", () => {
      const stages = latheLoRANeuralOrchestratorEngine.planStages();
      expect(stages).toContain("tokenize");
      expect(stages).toContain("cache_lookup");
      expect(stages).toContain("attention_compute");
      expect(stages).toContain("physics_validate");
      expect(stages).toContain("post_process");
    });

    it("skips caching when disabled", () => {
      const stages = latheLoRANeuralOrchestratorEngine.planStages({ enable_caching: false });
      expect(stages).not.toContain("cache_lookup");
    });

    it("skips attention when disabled", () => {
      const stages = latheLoRANeuralOrchestratorEngine.planStages({ enable_attention: false });
      expect(stages).not.toContain("attention_compute");
    });

    it("skips physics when disabled", () => {
      const stages = latheLoRANeuralOrchestratorEngine.planStages({ enable_physics_validation: false });
      expect(stages).not.toContain("physics_validate");
      expect(stages).not.toContain("fusion");
    });
  });

  describe("efficiency", () => {
    it("computes total time and bottleneck", () => {
      const p = latheLoRANeuralOrchestratorEngine.startPipeline("x");
      latheLoRANeuralOrchestratorEngine.completeStage(p.id, "tokenize", 10);
      latheLoRANeuralOrchestratorEngine.completeStage(p.id, "inference", 200);
      latheLoRANeuralOrchestratorEngine.completeStage(p.id, "post_process", 5);
      const ctx = latheLoRANeuralOrchestratorEngine.getPipeline(p.id)!;
      const eff = latheLoRANeuralOrchestratorEngine.calculateEfficiency(ctx);
      expect(eff.total_time_ms).toBe(215);
      expect(eff.bottleneck_stage).toBe("inference");
      expect(eff.bottleneck_time_ms).toBe(200);
      expect(eff.stages_run).toBe(3);
    });

    it("sets cache_efficiency based on cache_hit flag", () => {
      const p = latheLoRANeuralOrchestratorEngine.startPipeline("x");
      latheLoRANeuralOrchestratorEngine.completeStage(p.id, "cache_lookup", 5, { hit: true });
      const ctx = latheLoRANeuralOrchestratorEngine.getPipeline(p.id)!;
      expect(latheLoRANeuralOrchestratorEngine.calculateEfficiency(ctx).cache_efficiency).toBe(1.0);
    });
  });

  describe("aggregate metrics", () => {
    it("returns empty metrics when nothing completed", () => {
      const m = latheLoRANeuralOrchestratorEngine.getAggregateMetrics();
      expect(m.total_pipelines).toBe(0);
      expect(m.avg_latency_ms).toBe(0);
    });

    it("computes avg and p95 latency", () => {
      for (let i = 0; i < 10; i++) {
        const p = latheLoRANeuralOrchestratorEngine.startPipeline(`x${i}`);
        latheLoRANeuralOrchestratorEngine.completeStage(p.id, "tokenize", (i + 1) * 10);
        latheLoRANeuralOrchestratorEngine.completePipeline(p.id, "out");
      }
      const m = latheLoRANeuralOrchestratorEngine.getAggregateMetrics();
      expect(m.total_pipelines).toBe(10);
      expect(m.avg_latency_ms).toBeGreaterThan(0);
      expect(m.p95_latency_ms).toBeGreaterThanOrEqual(m.avg_latency_ms);
    });

    it("computes cache hit rate", () => {
      const p1 = latheLoRANeuralOrchestratorEngine.startPipeline("a");
      latheLoRANeuralOrchestratorEngine.completeStage(p1.id, "cache_lookup", 1, { hit: true });
      latheLoRANeuralOrchestratorEngine.completePipeline(p1.id, "x");
      const p2 = latheLoRANeuralOrchestratorEngine.startPipeline("b");
      latheLoRANeuralOrchestratorEngine.completeStage(p2.id, "cache_lookup", 1, { hit: false });
      latheLoRANeuralOrchestratorEngine.completePipeline(p2.id, "x");
      expect(latheLoRANeuralOrchestratorEngine.getAggregateMetrics().cache_hit_rate).toBeCloseTo(0.5);
    });

    it("computes average stage timings", () => {
      for (let i = 0; i < 3; i++) {
        const p = latheLoRANeuralOrchestratorEngine.startPipeline(`x${i}`);
        latheLoRANeuralOrchestratorEngine.completeStage(p.id, "tokenize", 100);
        latheLoRANeuralOrchestratorEngine.completePipeline(p.id, "out");
      }
      const m = latheLoRANeuralOrchestratorEngine.getAggregateMetrics();
      expect(m.stage_avg_timings["tokenize"]).toBeCloseTo(100);
    });
  });

  describe("optimizations", () => {
    it("flags low cache hit rate", () => {
      for (let i = 0; i < 15; i++) {
        const p = latheLoRANeuralOrchestratorEngine.startPipeline(`x${i}`);
        latheLoRANeuralOrchestratorEngine.completeStage(p.id, "cache_lookup", 1, { hit: false });
        latheLoRANeuralOrchestratorEngine.completePipeline(p.id, "x");
      }
      const opts = latheLoRANeuralOrchestratorEngine.identifyOptimizations();
      expect(opts.some(o => o.optimization.includes("cache"))).toBe(true);
    });

    it("flags slow stages over 1s", () => {
      const p = latheLoRANeuralOrchestratorEngine.startPipeline("x");
      latheLoRANeuralOrchestratorEngine.completeStage(p.id, "inference", 2500);
      latheLoRANeuralOrchestratorEngine.completePipeline(p.id, "x");
      const opts = latheLoRANeuralOrchestratorEngine.identifyOptimizations();
      expect(opts.some(o => o.optimization.includes("inference"))).toBe(true);
    });

    it("flags p95 latency over budget", () => {
      latheLoRANeuralOrchestratorEngine.setConfig({
        default_budget: { max_latency_ms: 50, max_memory_mb: 100, enable_caching: true, enable_attention: true, enable_physics_validation: true },
      });
      for (let i = 0; i < 5; i++) {
        const p = latheLoRANeuralOrchestratorEngine.startPipeline(`x${i}`);
        latheLoRANeuralOrchestratorEngine.completeStage(p.id, "tokenize", 100);
        latheLoRANeuralOrchestratorEngine.completePipeline(p.id, "out");
      }
      const opts = latheLoRANeuralOrchestratorEngine.identifyOptimizations();
      expect(opts.some(o => o.optimization.includes("parallel") || o.optimization.includes("Reduce"))).toBe(true);
    });

    it("returns no optimizations when healthy", () => {
      const p = latheLoRANeuralOrchestratorEngine.startPipeline("x");
      latheLoRANeuralOrchestratorEngine.completeStage(p.id, "tokenize", 10, { hit: true });
      latheLoRANeuralOrchestratorEngine.completeStage(p.id, "cache_lookup", 5, { hit: true });
      latheLoRANeuralOrchestratorEngine.completePipeline(p.id, "out");
      const opts = latheLoRANeuralOrchestratorEngine.identifyOptimizations();
      expect(Array.isArray(opts)).toBe(true);
    });
  });

  describe("queries", () => {
    it("lists active and completed pipelines separately", () => {
      const a = latheLoRANeuralOrchestratorEngine.startPipeline("a");
      const b = latheLoRANeuralOrchestratorEngine.startPipeline("b");
      latheLoRANeuralOrchestratorEngine.completePipeline(a.id, "done");
      expect(latheLoRANeuralOrchestratorEngine.getActivePipelines()).toHaveLength(1);
      expect(latheLoRANeuralOrchestratorEngine.getActivePipelines()[0].id).toBe(b.id);
      expect(latheLoRANeuralOrchestratorEngine.getCompletedPipelines()).toHaveLength(1);
    });

    it("getPipeline finds active and completed", () => {
      const a = latheLoRANeuralOrchestratorEngine.startPipeline("a");
      expect(latheLoRANeuralOrchestratorEngine.getPipeline(a.id)).toBeDefined();
      latheLoRANeuralOrchestratorEngine.completePipeline(a.id, "done");
      expect(latheLoRANeuralOrchestratorEngine.getPipeline(a.id)).toBeDefined();
    });

    it("limits completed pipelines by supplied limit", () => {
      for (let i = 0; i < 5; i++) {
        const p = latheLoRANeuralOrchestratorEngine.startPipeline(`x${i}`);
        latheLoRANeuralOrchestratorEngine.completePipeline(p.id, "x");
      }
      expect(latheLoRANeuralOrchestratorEngine.getCompletedPipelines(2)).toHaveLength(2);
    });
  });

  describe("summary", () => {
    it("renders summary text", () => {
      const p = latheLoRANeuralOrchestratorEngine.startPipeline("x");
      latheLoRANeuralOrchestratorEngine.completeStage(p.id, "tokenize", 10);
      latheLoRANeuralOrchestratorEngine.completePipeline(p.id, "out");
      const s = latheLoRANeuralOrchestratorEngine.getSummary();
      expect(s).toContain("Neural Orchestrator Summary");
      expect(s).toContain("Performance");
    });
  });
});
