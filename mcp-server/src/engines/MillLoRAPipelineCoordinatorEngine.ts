/**
 * MillLoRAPipelineCoordinatorEngine — Training-Pipeline Coordinator (Mill parity)
 * =================================================================================
 *
 * Coordinates the full MillLoRA training + inference pipeline.
 * Manages stage transitions, dependencies, parallel execution,
 * and MILL-CANONICAL stage types layered on lathe-shared.
 *
 * Mill parity for LatheLoRAPipelineCoordinatorEngine (LATHE-LORA-MS0 U-LLR45)
 * with MILL-CANONICAL extensions:
 *
 *   - 4 MILL-CANONICAL stage types added to 9 lathe-shared:
 *       chatter_stability_calibration (Tlusty lobe diagram solve)
 *       tcpm_post_validation         (5-axis post-processor sim sweep)
 *       first_piece_audit            (AS9102 FAI gate, blocks deployment)
 *       thermal_warmup               (cell thermal-equilibrium pre-run)
 *   - Per-pipeline axis_mode tag — coordinator runs the same template at
 *     different cell types without cross-axis contamination
 *   - createMillStandardPipeline() one-shot builds the canonical 13-stage
 *     mill training pipeline with correct dependency wiring
 *
 * @module engines/MillLoRAPipelineCoordinatorEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-PIPELINE-COORDINATOR (iter99)
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

/** 9 lathe-shared + 4 MILL-CANONICAL stage types. */
export type MillPipelineStageType =
  // Lathe-shared
  | "data_collection"
  | "data_preprocessing"
  | "tokenization"
  | "training"
  | "validation"
  | "evaluation"
  | "deployment"
  | "inference"
  | "monitoring"
  // MILL-CANONICAL
  | "chatter_stability_calibration"
  | "tcpm_post_validation"
  | "first_piece_audit"
  | "thermal_warmup";

export const MILL_CANONICAL_STAGE_TYPES: MillPipelineStageType[] = [
  "chatter_stability_calibration",
  "tcpm_post_validation",
  "first_piece_audit",
  "thermal_warmup",
];

export type MillStageStatus = "pending" | "ready" | "running" | "completed" | "failed" | "skipped";

/** Per-axis training mode — matches MillLoRACadenceEngine taxonomy. */
export type MillAxisMode = "3_axis" | "4_axis_index" | "5_axis_simul" | "shared";

export interface MillPipelineStage {
  id: string;
  type: MillPipelineStageType;
  name: string;
  status: MillStageStatus;
  depends_on: string[];
  started_at?: number;
  completed_at?: number;
  duration_ms?: number;
  output?: Record<string, unknown>;
  error?: string;
}

export interface MillPipeline {
  id: string;
  name: string;
  stages: Map<string, MillPipelineStage>;
  created_at: number;
  started_at?: number;
  completed_at?: number;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  /** MILL-CANONICAL: which axis_mode this pipeline targets. */
  axis_mode: MillAxisMode;
}

export interface MillCoordinatorConfig {
  max_parallel_stages: number;
  stage_timeout_ms: number;
  fail_fast: boolean;
  enable_skip_on_failure: boolean;
}

const DEFAULT_CONFIG: MillCoordinatorConfig = {
  max_parallel_stages: 3,
  stage_timeout_ms: 600000,
  fail_fast: true,
  enable_skip_on_failure: false,
};

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillLoRAPipelineCoordinatorEngine {
  private config: MillCoordinatorConfig = { ...DEFAULT_CONFIG };
  private pipelines: Map<string, MillPipeline> = new Map();
  private completed: MillPipeline[] = [];

  setConfig(config: Partial<MillCoordinatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MillCoordinatorConfig {
    return { ...this.config };
  }

  createPipeline(
    name: string,
    stages: Omit<MillPipelineStage, "status">[],
    opts?: { axis_mode?: MillAxisMode },
  ): MillPipeline {
    const pipeline: MillPipeline = {
      id: `pipeline-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      name,
      stages: new Map(),
      created_at: Date.now(),
      status: "pending",
      axis_mode: opts?.axis_mode ?? "shared",
    };
    for (const stage of stages) {
      pipeline.stages.set(stage.id, { ...stage, status: "pending" });
    }
    this.pipelines.set(pipeline.id, pipeline);
    return pipeline;
  }

  /**
   * MILL-CANONICAL: build the canonical 13-stage mill training pipeline.
   * Stages are wired with their natural dependencies and the FAI gate
   * (first_piece_audit) sits between evaluation and deployment.
   */
  createMillStandardPipeline(axis_mode: MillAxisMode = "shared", namePrefix = "mill-standard"): MillPipeline {
    const stages: Omit<MillPipelineStage, "status">[] = [
      { id: "s-data", type: "data_collection", name: "Collect JM-Die corpus", depends_on: [] },
      { id: "s-prep", type: "data_preprocessing", name: "Preprocess + clean", depends_on: ["s-data"] },
      { id: "s-tok", type: "tokenization", name: "Tokenize for LoRA", depends_on: ["s-prep"] },
      { id: "s-chatter", type: "chatter_stability_calibration", name: "Solve Tlusty stability lobes", depends_on: ["s-prep"] },
      { id: "s-train", type: "training", name: "LoRA fine-tune", depends_on: ["s-tok", "s-chatter"] },
      { id: "s-val", type: "validation", name: "Held-out validation", depends_on: ["s-train"] },
      { id: "s-eval", type: "evaluation", name: "Eval suite + benchmarks", depends_on: ["s-val"] },
      { id: "s-tcpm", type: "tcpm_post_validation", name: "TCPM post-processor sim sweep", depends_on: ["s-eval"] },
      { id: "s-fpa", type: "first_piece_audit", name: "AS9102 FAI gate", depends_on: ["s-eval", "s-tcpm"] },
      { id: "s-warmup", type: "thermal_warmup", name: "Cell thermal equilibrium", depends_on: ["s-fpa"] },
      { id: "s-deploy", type: "deployment", name: "Deploy to cell", depends_on: ["s-fpa", "s-warmup"] },
      { id: "s-inf", type: "inference", name: "Live inference", depends_on: ["s-deploy"] },
      { id: "s-mon", type: "monitoring", name: "Monitor chatter/fpa/tcpm signals", depends_on: ["s-deploy"] },
    ];
    return this.createPipeline(`${namePrefix}-${axis_mode}`, stages, { axis_mode });
  }

  getReadyStages(pipelineId: string): MillPipelineStage[] {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return [];
    const ready: MillPipelineStage[] = [];
    for (const stage of pipeline.stages.values()) {
      if (stage.status !== "pending") continue;
      const depsReady = stage.depends_on.every((depId) => {
        const dep = pipeline.stages.get(depId);
        return dep?.status === "completed";
      });
      if (depsReady) ready.push(stage);
    }
    return ready;
  }

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

  completeStage(pipelineId: string, stageId: string, output?: Record<string, unknown>): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return false;
    const stage = pipeline.stages.get(stageId);
    if (!stage || stage.status !== "running") return false;
    stage.status = "completed";
    stage.completed_at = Date.now();
    stage.duration_ms = stage.completed_at - (stage.started_at ?? stage.completed_at);
    if (output) stage.output = output;
    this.checkPipelineCompletion(pipeline);
    return true;
  }

  failStage(pipelineId: string, stageId: string, error: string): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return false;
    const stage = pipeline.stages.get(stageId);
    if (!stage) return false;
    stage.status = "failed";
    stage.error = error;
    stage.completed_at = Date.now();
    stage.duration_ms = stage.completed_at - (stage.started_at ?? stage.completed_at);
    if (this.config.fail_fast) {
      pipeline.status = "failed";
      pipeline.completed_at = Date.now();
      this.archivePipeline(pipelineId);
    } else if (this.config.enable_skip_on_failure) {
      this.skipDependents(pipeline, stageId);
    }
    return true;
  }

  private skipDependents(pipeline: MillPipeline, failedStageId: string): void {
    // Recursive: dependents of skipped/failed nodes also get skipped
    let changed = true;
    while (changed) {
      changed = false;
      for (const stage of pipeline.stages.values()) {
        if (stage.status !== "pending") continue;
        const anyFailedOrSkipped = stage.depends_on.some((depId) => {
          const dep = pipeline.stages.get(depId);
          return dep?.status === "failed" || dep?.status === "skipped";
        });
        if (anyFailedOrSkipped && stage.depends_on.includes(failedStageId)) {
          stage.status = "skipped";
          changed = true;
        } else if (anyFailedOrSkipped) {
          // upstream cascade — any failed/skipped dep transitively
          stage.status = "skipped";
          changed = true;
        }
      }
    }
  }

  private checkPipelineCompletion(pipeline: MillPipeline): void {
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

  private archivePipeline(pipelineId: string): void {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return;
    this.pipelines.delete(pipelineId);
    this.completed.push(pipeline);
    if (this.completed.length > 100) {
      this.completed = this.completed.slice(-50);
    }
  }

  getPipeline(pipelineId: string): MillPipeline | undefined {
    return this.pipelines.get(pipelineId) ?? this.completed.find((p) => p.id === pipelineId);
  }

  getActivePipelines(): MillPipeline[] {
    return Array.from(this.pipelines.values());
  }

  /** MILL-CANONICAL: filter completed-archive pipelines by axis_mode. */
  getCompletedByAxis(axis_mode: MillAxisMode): MillPipeline[] {
    return this.completed.filter((p) => p.axis_mode === axis_mode);
  }

  getProgress(pipelineId: string): number {
    const pipeline = this.getPipeline(pipelineId);
    if (!pipeline) return 0;
    const total = pipeline.stages.size;
    if (total === 0) return 0;
    const done = Array.from(pipeline.stages.values()).filter(
      (s) => s.status === "completed" || s.status === "skipped",
    ).length;
    return done / total;
  }

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

  getStats(): {
    total_pipelines: number;
    active_pipelines: number;
    completed_pipelines: number;
    failed_pipelines: number;
    cancelled_pipelines: number;
    avg_duration_ms: number;
    pipelines_by_axis: Record<string, number>;
    mill_canonical_stages_completed: number;
  } {
    const total = this.completed.length;
    const byAxis: Record<string, number> = {};
    if (total === 0) {
      return {
        total_pipelines: 0,
        active_pipelines: this.pipelines.size,
        completed_pipelines: 0,
        failed_pipelines: 0,
        cancelled_pipelines: 0,
        avg_duration_ms: 0,
        pipelines_by_axis: byAxis,
        mill_canonical_stages_completed: 0,
      };
    }
    const completed = this.completed.filter((p) => p.status === "completed").length;
    const failed = this.completed.filter((p) => p.status === "failed").length;
    const cancelled = this.completed.filter((p) => p.status === "cancelled").length;
    const durations = this.completed
      .filter((p) => typeof p.started_at === "number" && typeof p.completed_at === "number")
      .map((p) => (p.completed_at as number) - (p.started_at as number));
    const avgDur = durations.length > 0 ? durations.reduce((s, d) => s + d, 0) / durations.length : 0;
    let canonicalCompleted = 0;
    for (const p of this.completed) {
      byAxis[p.axis_mode] = (byAxis[p.axis_mode] ?? 0) + 1;
      for (const stage of p.stages.values()) {
        if (
          stage.status === "completed" &&
          (MILL_CANONICAL_STAGE_TYPES as readonly string[]).includes(stage.type)
        ) {
          canonicalCompleted++;
        }
      }
    }
    return {
      total_pipelines: total,
      active_pipelines: this.pipelines.size,
      completed_pipelines: completed,
      failed_pipelines: failed,
      cancelled_pipelines: cancelled,
      avg_duration_ms: avgDur,
      pipelines_by_axis: byAxis,
      mill_canonical_stages_completed: canonicalCompleted,
    };
  }

  getSummary(): string {
    const stats = this.getStats();
    return [
      "Mill LoRA Pipeline Coordinator Summary",
      "======================================",
      `Active: ${stats.active_pipelines}`,
      `Completed: ${stats.completed_pipelines}`,
      `Failed: ${stats.failed_pipelines}`,
      `Cancelled: ${stats.cancelled_pipelines}`,
      `Avg Duration: ${(stats.avg_duration_ms / 1000).toFixed(1)}s`,
      `Mill-Canonical Stages Completed: ${stats.mill_canonical_stages_completed}`,
    ].join("\n");
  }

  reset(): void {
    this.pipelines.clear();
    this.completed = [];
    this.config = { ...DEFAULT_CONFIG };
  }
}

export const millLoRAPipelineCoordinatorEngine = new MillLoRAPipelineCoordinatorEngine();
export { MillLoRAPipelineCoordinatorEngine };
