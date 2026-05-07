/**
 * LatheLoRAPipelineCoordinatorEngine — LATHE-LORA-MS0 U-LLR45
 * =============================================================
 *
 * Coordinates the full LatheLoRA training + inference pipeline stages.
 * Manages stage transitions, dependencies, and parallel execution.
 *
 * Features:
 *   - Stage graph management
 *   - Dependency resolution
 *   - Parallel stage scheduling
 *   - Progress tracking
 *
 * @module engines/LatheLoRAPipelineCoordinatorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Pipeline stage type */
export type PipelineStageType =
  | "data_collection"
  | "data_preprocessing"
  | "tokenization"
  | "training"
  | "validation"
  | "evaluation"
  | "deployment"
  | "inference"
  | "monitoring";

/** Stage status */
export type StageStatus = "pending" | "ready" | "running" | "completed" | "failed" | "skipped";

/** Pipeline stage */
export interface PipelineStage {
  id: string;
  type: PipelineStageType;
  name: string;
  status: StageStatus;
  depends_on: string[];
  started_at?: number;
  completed_at?: number;
  duration_ms?: number;
  output?: Record<string, unknown>;
  error?: string;
}

/** Pipeline */
export interface Pipeline {
  id: string;
  name: string;
  stages: Map<string, PipelineStage>;
  created_at: number;
  started_at?: number;
  completed_at?: number;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
}

/** Coordinator configuration */
export interface CoordinatorConfig {
  max_parallel_stages: number;
  stage_timeout_ms: number;
  fail_fast: boolean;
  enable_skip_on_failure: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: CoordinatorConfig = {
  max_parallel_stages: 3,
  stage_timeout_ms: 600000, // 10 minutes
  fail_fast: true,
  enable_skip_on_failure: false,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAPipelineCoordinatorEngine {
  private config: CoordinatorConfig = DEFAULT_CONFIG;
  private pipelines: Map<string, Pipeline> = new Map();
  private completed: Pipeline[] = [];

  setConfig(config: Partial<CoordinatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): CoordinatorConfig {
    return { ...this.config };
  }

  /**
   * Create a new pipeline
   */
  createPipeline(name: string, stages: Omit<PipelineStage, "status">[]): Pipeline {
    const pipeline: Pipeline = {
      id: `pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      stages: new Map(),
      created_at: Date.now(),
      status: "pending",
    };

    for (const stage of stages) {
      pipeline.stages.set(stage.id, { ...stage, status: "pending" });
    }

    this.pipelines.set(pipeline.id, pipeline);
    return pipeline;
  }

  /**
   * Get ready stages (dependencies complete)
   */
  getReadyStages(pipelineId: string): PipelineStage[] {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return [];

    const ready: PipelineStage[] = [];
    for (const stage of pipeline.stages.values()) {
      if (stage.status !== "pending") continue;

      // All deps must be completed
      const depsReady = stage.depends_on.every(depId => {
        const dep = pipeline.stages.get(depId);
        return dep?.status === "completed";
      });

      if (depsReady) ready.push(stage);
    }
    return ready;
  }

  /**
   * Start a stage
   */
  startStage(pipelineId: string, stageId: string): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return false;
    const stage = pipeline.stages.get(stageId);
    if (!stage || stage.status !== "pending") return false;

    stage.status = "running";
    stage.started_at = Date.now();

    if (pipeline.status === "pending") {
      pipeline.status = "running";
      pipeline.started_at = Date.now();
    }

    return true;
  }

  /**
   * Complete a stage
   */
  completeStage(pipelineId: string, stageId: string, output?: Record<string, unknown>): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return false;
    const stage = pipeline.stages.get(stageId);
    if (!stage || stage.status !== "running") return false;

    stage.status = "completed";
    stage.completed_at = Date.now();
    stage.duration_ms = stage.completed_at - (stage.started_at || stage.completed_at);
    if (output) stage.output = output;

    this.checkPipelineCompletion(pipeline);
    return true;
  }

  /**
   * Fail a stage
   */
  failStage(pipelineId: string, stageId: string, error: string): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return false;
    const stage = pipeline.stages.get(stageId);
    if (!stage) return false;

    stage.status = "failed";
    stage.error = error;
    stage.completed_at = Date.now();
    stage.duration_ms = stage.completed_at - (stage.started_at || stage.completed_at);

    if (this.config.fail_fast) {
      pipeline.status = "failed";
      pipeline.completed_at = Date.now();
      this.archivePipeline(pipelineId);
    } else if (this.config.enable_skip_on_failure) {
      this.skipDependents(pipeline, stageId);
    }

    return true;
  }

  /**
   * Skip dependent stages
   */
  private skipDependents(pipeline: Pipeline, failedStageId: string): void {
    for (const stage of pipeline.stages.values()) {
      if (stage.depends_on.includes(failedStageId) && stage.status === "pending") {
        stage.status = "skipped";
      }
    }
  }

  /**
   * Check if pipeline is fully completed
   */
  private checkPipelineCompletion(pipeline: Pipeline): void {
    let hasRunning = false;
    let hasPending = false;
    let hasFailed = false;

    for (const stage of pipeline.stages.values()) {
      if (stage.status === "running") hasRunning = true;
      if (stage.status === "pending" || stage.status === "ready") hasPending = true;
      if (stage.status === "failed") hasFailed = true;
    }

    if (!hasRunning && !hasPending) {
      pipeline.status = hasFailed ? "failed" : "completed";
      pipeline.completed_at = Date.now();
      this.archivePipeline(pipeline.id);
    }
  }

  /**
   * Archive a completed pipeline
   */
  private archivePipeline(pipelineId: string): void {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return;
    this.pipelines.delete(pipelineId);
    this.completed.push(pipeline);
    if (this.completed.length > 100) {
      this.completed = this.completed.slice(-50);
    }
  }

  /**
   * Get pipeline
   */
  getPipeline(pipelineId: string): Pipeline | undefined {
    return this.pipelines.get(pipelineId) || this.completed.find(p => p.id === pipelineId);
  }

  /**
   * Get active pipelines
   */
  getActivePipelines(): Pipeline[] {
    return Array.from(this.pipelines.values());
  }

  /**
   * Get completion progress (0-1)
   */
  getProgress(pipelineId: string): number {
    const pipeline = this.getPipeline(pipelineId);
    if (!pipeline) return 0;
    const total = pipeline.stages.size;
    if (total === 0) return 0;
    const done = Array.from(pipeline.stages.values()).filter(
      s => s.status === "completed" || s.status === "skipped",
    ).length;
    return done / total;
  }

  /**
   * Cancel a pipeline
   */
  cancel(pipelineId: string): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return false;
    pipeline.status = "cancelled";
    pipeline.completed_at = Date.now();
    for (const stage of pipeline.stages.values()) {
      if (stage.status === "pending" || stage.status === "running") {
        stage.status = "skipped";
      }
    }
    this.archivePipeline(pipelineId);
    return true;
  }

  /**
   * Get stats
   */
  getStats(): {
    total_pipelines: number;
    active_pipelines: number;
    completed_pipelines: number;
    failed_pipelines: number;
    cancelled_pipelines: number;
    avg_duration_ms: number;
  } {
    const total = this.completed.length;
    if (total === 0) {
      return {
        total_pipelines: 0,
        active_pipelines: this.pipelines.size,
        completed_pipelines: 0,
        failed_pipelines: 0,
        cancelled_pipelines: 0,
        avg_duration_ms: 0,
      };
    }

    const completed = this.completed.filter(p => p.status === "completed").length;
    const failed = this.completed.filter(p => p.status === "failed").length;
    const cancelled = this.completed.filter(p => p.status === "cancelled").length;
    const durations = this.completed
      .filter(p => p.started_at && p.completed_at)
      .map(p => p.completed_at! - p.started_at!);
    const avgDur = durations.length > 0 ? durations.reduce((s, d) => s + d, 0) / durations.length : 0;

    return {
      total_pipelines: total,
      active_pipelines: this.pipelines.size,
      completed_pipelines: completed,
      failed_pipelines: failed,
      cancelled_pipelines: cancelled,
      avg_duration_ms: avgDur,
    };
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const stats = this.getStats();
    return [
      "Pipeline Coordinator Summary",
      "============================",
      `Active: ${stats.active_pipelines}`,
      `Completed: ${stats.completed_pipelines}`,
      `Failed: ${stats.failed_pipelines}`,
      `Cancelled: ${stats.cancelled_pipelines}`,
      `Avg Duration: ${(stats.avg_duration_ms / 1000).toFixed(1)}s`,
    ].join("\n");
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.pipelines.clear();
    this.completed = [];
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAPipelineCoordinatorEngine = new LatheLoRAPipelineCoordinatorEngine();
