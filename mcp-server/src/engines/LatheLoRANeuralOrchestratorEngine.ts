/**
 * LatheLoRANeuralOrchestratorEngine — LATHE-LORA-MS0 U-LLR36
 * ===========================================================
 *
 * Coordinates neural operations across LatheLoRA subsystems.
 * Orchestrates bridge, attention analyzer, and embedding cache.
 *
 * Features:
 *   - Unified neural pipeline
 *   - Performance optimization
 *   - Resource scheduling
 *   - Cross-system coordination
 *
 * @module engines/LatheLoRANeuralOrchestratorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Neural pipeline stage */
export type PipelineStage =
  | "tokenize"
  | "embed"
  | "cache_lookup"
  | "attention_compute"
  | "inference"
  | "physics_validate"
  | "fusion"
  | "post_process";

/** Pipeline execution context */
export interface PipelineContext {
  id: string;
  input: string;
  stages_completed: PipelineStage[];
  stage_timings: Record<string, number>;
  cache_hit: boolean;
  attention_analyzed: boolean;
  physics_validated: boolean;
  output?: string;
  metadata: Record<string, unknown>;
}

/** Resource budget */
export interface ResourceBudget {
  max_latency_ms: number;
  max_memory_mb: number;
  enable_caching: boolean;
  enable_attention: boolean;
  enable_physics_validation: boolean;
}

/** Orchestrator configuration */
export interface OrchestratorConfig {
  default_budget: ResourceBudget;
  parallel_stages: boolean;
  retry_on_failure: boolean;
  max_retries: number;
  log_slow_stages_ms: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_BUDGET: ResourceBudget = {
  max_latency_ms: 5000,
  max_memory_mb: 512,
  enable_caching: true,
  enable_attention: true,
  enable_physics_validation: true,
};

const DEFAULT_CONFIG: OrchestratorConfig = {
  default_budget: DEFAULT_BUDGET,
  parallel_stages: false,
  retry_on_failure: true,
  max_retries: 2,
  log_slow_stages_ms: 1000,
};

/** Pipeline stage order */
const PIPELINE_ORDER: PipelineStage[] = [
  "tokenize",
  "embed",
  "cache_lookup",
  "attention_compute",
  "inference",
  "physics_validate",
  "fusion",
  "post_process",
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRANeuralOrchestratorEngine {
  private config: OrchestratorConfig = DEFAULT_CONFIG;
  private pipelines: Map<string, PipelineContext> = new Map();
  private completedPipelines: PipelineContext[] = [];

  /**
   * Set configuration
   */
  setConfig(config: Partial<OrchestratorConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      default_budget: { ...this.config.default_budget, ...config.default_budget },
    };
  }

  /**
   * Get configuration
   */
  getConfig(): OrchestratorConfig {
    return {
      ...this.config,
      default_budget: { ...this.config.default_budget },
    };
  }

  /**
   * Start a pipeline
   */
  startPipeline(input: string, metadata?: Record<string, unknown>): PipelineContext {
    const context: PipelineContext = {
      id: `pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      input,
      stages_completed: [],
      stage_timings: {},
      cache_hit: false,
      attention_analyzed: false,
      physics_validated: false,
      metadata: metadata || {},
    };

    this.pipelines.set(context.id, context);
    log.info(`Started neural pipeline: ${context.id}`);

    return context;
  }

  /**
   * Record stage completion
   */
  completeStage(
    pipelineId: string,
    stage: PipelineStage,
    durationMs: number,
    metadata?: Record<string, unknown>
  ): boolean {
    const context = this.pipelines.get(pipelineId);
    if (!context) return false;

    context.stages_completed.push(stage);
    context.stage_timings[stage] = durationMs;

    // Update flags based on stage
    if (stage === "cache_lookup" && metadata?.hit === true) {
      context.cache_hit = true;
    }
    if (stage === "attention_compute") {
      context.attention_analyzed = true;
    }
    if (stage === "physics_validate") {
      context.physics_validated = true;
    }

    // Log slow stages
    if (durationMs > this.config.log_slow_stages_ms) {
      log.warn(`Slow stage in ${pipelineId}: ${stage} took ${durationMs}ms`);
    }

    return true;
  }

  /**
   * Complete pipeline
   */
  completePipeline(pipelineId: string, output: string): PipelineContext | null {
    const context = this.pipelines.get(pipelineId);
    if (!context) return null;

    context.output = output;
    this.pipelines.delete(pipelineId);
    this.completedPipelines.push(context);

    // Trim history
    if (this.completedPipelines.length > 500) {
      this.completedPipelines = this.completedPipelines.slice(-250);
    }

    const totalTime = Object.values(context.stage_timings).reduce((a, b) => a + b, 0);
    log.info(`Completed pipeline ${pipelineId} in ${totalTime}ms`);

    return context;
  }

  /**
   * Get pipeline status
   */
  getPipeline(pipelineId: string): PipelineContext | undefined {
    return this.pipelines.get(pipelineId) || this.completedPipelines.find(p => p.id === pipelineId);
  }

  /**
   * Get active pipelines
   */
  getActivePipelines(): PipelineContext[] {
    return Array.from(this.pipelines.values());
  }

  /**
   * Get completed pipelines
   */
  getCompletedPipelines(limit?: number): PipelineContext[] {
    const list = [...this.completedPipelines];
    return limit ? list.slice(-limit) : list;
  }

  /**
   * Determine which stages to run given budget
   */
  planStages(budget?: Partial<ResourceBudget>): PipelineStage[] {
    const b = { ...this.config.default_budget, ...budget };
    const stages: PipelineStage[] = ["tokenize", "embed"];

    if (b.enable_caching) {
      stages.push("cache_lookup");
    }

    if (b.enable_attention) {
      stages.push("attention_compute");
    }

    stages.push("inference");

    if (b.enable_physics_validation) {
      stages.push("physics_validate");
      stages.push("fusion");
    }

    stages.push("post_process");

    return stages;
  }

  /**
   * Calculate pipeline efficiency
   */
  calculateEfficiency(context: PipelineContext): {
    total_time_ms: number;
    stages_run: number;
    stages_skipped: number;
    cache_efficiency: number;
    bottleneck_stage?: PipelineStage;
    bottleneck_time_ms?: number;
  } {
    const totalTime = Object.values(context.stage_timings).reduce((a, b) => a + b, 0);
    const stagesRun = context.stages_completed.length;
    const stagesSkipped = PIPELINE_ORDER.length - stagesRun;

    // Find bottleneck
    let bottleneckStage: PipelineStage | undefined;
    let bottleneckTime = 0;
    for (const [stage, time] of Object.entries(context.stage_timings)) {
      if (time > bottleneckTime) {
        bottleneckTime = time;
        bottleneckStage = stage as PipelineStage;
      }
    }

    return {
      total_time_ms: totalTime,
      stages_run: stagesRun,
      stages_skipped: stagesSkipped,
      cache_efficiency: context.cache_hit ? 1.0 : 0.0,
      bottleneck_stage: bottleneckStage,
      bottleneck_time_ms: bottleneckTime,
    };
  }

  /**
   * Get aggregate metrics
   */
  getAggregateMetrics(): {
    total_pipelines: number;
    active_pipelines: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
    cache_hit_rate: number;
    physics_validation_rate: number;
    stage_avg_timings: Record<string, number>;
  } {
    const completed = this.completedPipelines;
    const total = completed.length;

    if (total === 0) {
      return {
        total_pipelines: 0,
        active_pipelines: this.pipelines.size,
        avg_latency_ms: 0,
        p95_latency_ms: 0,
        cache_hit_rate: 0,
        physics_validation_rate: 0,
        stage_avg_timings: {},
      };
    }

    const latencies = completed.map(c =>
      Object.values(c.stage_timings).reduce((a, b) => a + b, 0)
    );

    latencies.sort((a, b) => a - b);

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95Latency = latencies[p95Index] || 0;

    const cacheHits = completed.filter(c => c.cache_hit).length;
    const physicsValidated = completed.filter(c => c.physics_validated).length;

    // Average timing per stage
    const stageTimingsSum: Record<string, number> = {};
    const stageTimingsCounts: Record<string, number> = {};
    for (const ctx of completed) {
      for (const [stage, time] of Object.entries(ctx.stage_timings)) {
        stageTimingsSum[stage] = (stageTimingsSum[stage] || 0) + time;
        stageTimingsCounts[stage] = (stageTimingsCounts[stage] || 0) + 1;
      }
    }

    const stageAvgTimings: Record<string, number> = {};
    for (const stage of Object.keys(stageTimingsSum)) {
      stageAvgTimings[stage] = stageTimingsSum[stage] / stageTimingsCounts[stage];
    }

    return {
      total_pipelines: total,
      active_pipelines: this.pipelines.size,
      avg_latency_ms: avgLatency,
      p95_latency_ms: p95Latency,
      cache_hit_rate: cacheHits / total,
      physics_validation_rate: physicsValidated / total,
      stage_avg_timings: stageAvgTimings,
    };
  }

  /**
   * Identify optimization opportunities
   */
  identifyOptimizations(): Array<{
    optimization: string;
    impact: "high" | "medium" | "low";
    rationale: string;
  }> {
    const metrics = this.getAggregateMetrics();
    const opts: Array<{ optimization: string; impact: "high" | "medium" | "low"; rationale: string }> = [];

    // Low cache hit rate
    if (metrics.cache_hit_rate < 0.3 && metrics.total_pipelines > 10) {
      opts.push({
        optimization: "Increase embedding cache size or similarity threshold",
        impact: "high",
        rationale: `Cache hit rate only ${(metrics.cache_hit_rate * 100).toFixed(1)}%`,
      });
    }

    // Slow stages
    for (const [stage, avgTime] of Object.entries(metrics.stage_avg_timings)) {
      if (avgTime > 1000) {
        opts.push({
          optimization: `Optimize ${stage} stage (avg ${avgTime.toFixed(0)}ms)`,
          impact: avgTime > 2000 ? "high" : "medium",
          rationale: `Stage is bottleneck candidate`,
        });
      }
    }

    // High p95 latency
    if (metrics.p95_latency_ms > this.config.default_budget.max_latency_ms) {
      opts.push({
        optimization: "Reduce pipeline stages or enable parallel execution",
        impact: "high",
        rationale: `P95 latency ${metrics.p95_latency_ms.toFixed(0)}ms exceeds budget ${this.config.default_budget.max_latency_ms}ms`,
      });
    }

    return opts;
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const metrics = this.getAggregateMetrics();
    const opts = this.identifyOptimizations();

    const lines = [
      "Neural Orchestrator Summary",
      "===========================",
      `Active Pipelines: ${metrics.active_pipelines}`,
      `Completed: ${metrics.total_pipelines}`,
      ``,
      `Performance:`,
      `  Avg Latency: ${metrics.avg_latency_ms.toFixed(0)}ms`,
      `  P95 Latency: ${metrics.p95_latency_ms.toFixed(0)}ms`,
      `  Cache Hit Rate: ${(metrics.cache_hit_rate * 100).toFixed(1)}%`,
      `  Physics Validation: ${(metrics.physics_validation_rate * 100).toFixed(1)}%`,
    ];

    if (opts.length > 0) {
      lines.push(``, `Optimization Opportunities:`);
      for (const opt of opts) {
        lines.push(`  [${opt.impact.toUpperCase()}] ${opt.optimization}`);
        lines.push(`    → ${opt.rationale}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.pipelines.clear();
    this.completedPipelines = [];
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRANeuralOrchestratorEngine = new LatheLoRANeuralOrchestratorEngine();
