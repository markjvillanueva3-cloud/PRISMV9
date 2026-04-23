/**
 * LatheLoRAPipelineEngine — End-to-End Pipeline Orchestrator
 *
 * U-LLR02: Orchestrates the complete LatheLoRA workflow from dataset
 * building through training, evaluation, quantization, and deployment.
 *
 * Ported from prism-lathe-master for PRISM integration.
 *
 * @module engines/LatheLoRAPipelineEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type PipelineStage =
  | "dataset"
  | "training"
  | "evaluation"
  | "merge"
  | "quantize"
  | "deploy"
  | "verify";

export type StageStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface StageResult {
  stage: PipelineStage;
  status: StageStatus;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  outputs?: Record<string, string>;
  metrics?: Record<string, number>;
  error?: string;
}

export interface PipelineConfig {
  pipeline_id: string;
  archive_path: string;
  base_model: string;
  output_dir: string;
  stages: PipelineStage[];
  skip_stages: PipelineStage[];
  training_preset: "fast" | "balanced" | "quality";
  quant_format: "gguf" | "awq" | "gptq";
  deploy_target: "ollama" | "vllm" | "none";
  eval_threshold: number;
  auto_rollback: boolean;
}

export interface PipelineState {
  config: PipelineConfig;
  current_stage: PipelineStage | null;
  stage_results: StageResult[];
  started_at: string;
  completed_at?: string;
  status: "idle" | "running" | "completed" | "failed";
  error?: string;
}

export interface PipelineReport {
  pipeline_id: string;
  status: "success" | "failure" | "partial";
  total_duration_ms: number;
  stages_completed: number;
  stages_failed: number;
  stages_skipped: number;
  outputs: Record<string, string>;
  metrics: {
    dataset_size?: number;
    training_loss?: number;
    eval_score?: number;
    model_size_mb?: number;
    inference_speed?: number;
  };
  recommendations: string[];
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const ALL_STAGES: PipelineStage[] = [
  "dataset",
  "training",
  "evaluation",
  "merge",
  "quantize",
  "deploy",
  "verify",
];

const DEFAULT_CONFIG: PipelineConfig = {
  pipeline_id: `lathe-lora-${Date.now()}`,
  archive_path: "H:/PRISM/JM DIE/CNC LATHE",
  base_model: "unsloth/llama-3-8b-bnb-4bit",
  output_dir: "models/lathe-lora-pipeline",
  stages: ALL_STAGES,
  skip_stages: [],
  training_preset: "balanced",
  quant_format: "gguf",
  deploy_target: "ollama",
  eval_threshold: 70,
  auto_rollback: true,
};

// ============================================================================
// ENGINE
// ============================================================================

class LatheLoRAPipelineEngine {
  private config: PipelineConfig = { ...DEFAULT_CONFIG };
  private state: PipelineState | null = null;

  /**
   * Set pipeline configuration.
   * @param config Partial configuration to merge
   * @returns Updated configuration
   */
  setConfig(config: Partial<PipelineConfig>): PipelineConfig {
    this.config = { ...this.config, ...config };
    return this.config;
  }

  /**
   * Get current configuration.
   * @returns Current pipeline configuration
   */
  getConfig(): PipelineConfig {
    return { ...this.config };
  }

  /**
   * Reset to default configuration.
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.state = null;
  }

  /**
   * Get current pipeline state.
   * @returns Current state or null if not initialized
   */
  getState(): PipelineState | null {
    return this.state ? { ...this.state } : null;
  }

  /**
   * Initialize pipeline for execution.
   * @returns Initialized pipeline state
   */
  initializePipeline(): PipelineState {
    this.state = {
      config: { ...this.config },
      current_stage: null,
      stage_results: [],
      started_at: new Date().toISOString(),
      status: "idle",
    };
    return this.state;
  }

  /**
   * Start a pipeline stage.
   * @param stage Stage to start
   * @returns Stage result record
   */
  startStage(stage: PipelineStage): StageResult {
    if (!this.state) {
      throw new Error("Pipeline not initialized");
    }

    if (this.config.skip_stages.includes(stage)) {
      const result: StageResult = {
        stage,
        status: "skipped",
      };
      this.state.stage_results.push(result);
      return result;
    }

    this.state.current_stage = stage;
    this.state.status = "running";

    const result: StageResult = {
      stage,
      status: "running",
      started_at: new Date().toISOString(),
    };

    this.state.stage_results.push(result);
    return result;
  }

  /**
   * Complete a pipeline stage.
   * @param stage Stage to complete
   * @param outputs Output paths/values
   * @param metrics Stage metrics
   * @returns Updated stage result
   */
  completeStage(
    stage: PipelineStage,
    outputs?: Record<string, string>,
    metrics?: Record<string, number>
  ): StageResult {
    if (!this.state) {
      throw new Error("Pipeline not initialized");
    }

    const result = this.state.stage_results.find(
      (r) => r.stage === stage && r.status === "running"
    );

    if (!result) {
      throw new Error(`Stage ${stage} not found or not running`);
    }

    result.status = "completed";
    result.completed_at = new Date().toISOString();
    result.duration_ms = result.started_at
      ? Date.now() - new Date(result.started_at).getTime()
      : 0;
    result.outputs = outputs;
    result.metrics = metrics;

    this.state.current_stage = null;

    return result;
  }

  /**
   * Mark a stage as failed.
   * @param stage Stage that failed
   * @param error Error message
   * @returns Updated stage result
   */
  failStage(stage: PipelineStage, error: string): StageResult {
    if (!this.state) {
      throw new Error("Pipeline not initialized");
    }

    const result = this.state.stage_results.find(
      (r) => r.stage === stage && r.status === "running"
    );

    if (!result) {
      throw new Error(`Stage ${stage} not found or not running`);
    }

    result.status = "failed";
    result.completed_at = new Date().toISOString();
    result.error = error;

    this.state.current_stage = null;
    this.state.status = "failed";
    this.state.error = `Stage ${stage} failed: ${error}`;

    return result;
  }

  /**
   * Get command to execute a stage.
   * @param stage Stage to get command for
   * @returns Shell command string
   */
  getStageCommand(stage: PipelineStage): string {
    const dir = this.config.output_dir;

    switch (stage) {
      case "dataset":
        return `python ${dir}/build_dataset.py --archive "${this.config.archive_path}" --output "${dir}/data"`;

      case "training":
        return `python ${dir}/train_lathe_lora.py --preset ${this.config.training_preset}`;

      case "evaluation":
        return `python ${dir}/evaluate.py --model "${dir}/final" --dataset "${dir}/data/eval.jsonl"`;

      case "merge":
        return `python ${dir}/merge_lora.py --base "${this.config.base_model}" --adapter "${dir}/final"`;

      case "quantize":
        if (this.config.quant_format === "gguf") {
          return `python ${dir}/quantize_gguf.py --input "${dir}/merged" --output "${dir}/quantized"`;
        }
        return `python ${dir}/quantize_${this.config.quant_format}.py`;

      case "deploy":
        if (this.config.deploy_target === "ollama") {
          return `ollama create lathe-lora -f ${dir}/Modelfile`;
        }
        return `# Deploy to ${this.config.deploy_target}`;

      case "verify":
        return `python ${dir}/verify_deployment.py --model lathe-lora`;

      default:
        return `# Unknown stage: ${stage}`;
    }
  }

  /**
   * Generate complete pipeline bash script.
   * @returns Executable bash script
   */
  generatePipelineScript(): string {
    const lines: string[] = [
      "#!/usr/bin/env bash",
      "# LatheLoRA Pipeline Script",
      `# Pipeline ID: ${this.config.pipeline_id}`,
      "# Generated by LatheLoRAPipelineEngine (U-LLR02)",
      "",
      "set -e",
      "",
      `OUTPUT_DIR="${this.config.output_dir}"`,
      'LOG_FILE="$OUTPUT_DIR/pipeline.log"',
      "",
      "log() {",
      '  echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1" | tee -a "$LOG_FILE"',
      "}",
      "",
      'mkdir -p "$OUTPUT_DIR"',
      "",
    ];

    for (const stage of this.config.stages) {
      if (this.config.skip_stages.includes(stage)) {
        lines.push(`# Skipping stage: ${stage}`);
        continue;
      }

      lines.push(`log "Starting stage: ${stage}"`);
      lines.push(this.getStageCommand(stage));
      lines.push(`log "Completed stage: ${stage}"`);
      lines.push("");
    }

    lines.push('log "Pipeline complete!"');

    return lines.join("\n");
  }

  /**
   * Generate pipeline execution report.
   * @returns Pipeline report with metrics and recommendations
   */
  generateReport(): PipelineReport {
    if (!this.state) {
      return {
        pipeline_id: this.config.pipeline_id,
        status: "failure",
        total_duration_ms: 0,
        stages_completed: 0,
        stages_failed: 0,
        stages_skipped: 0,
        outputs: {},
        metrics: {},
        recommendations: ["Pipeline was not initialized"],
      };
    }

    const completed = this.state.stage_results.filter((r) => r.status === "completed");
    const failed = this.state.stage_results.filter((r) => r.status === "failed");
    const skipped = this.state.stage_results.filter((r) => r.status === "skipped");

    const totalDuration = this.state.stage_results.reduce(
      (sum, r) => sum + (r.duration_ms || 0),
      0
    );

    const outputs: Record<string, string> = {};
    const metrics: Record<string, number> = {};

    for (const result of completed) {
      if (result.outputs) {
        Object.assign(outputs, result.outputs);
      }
      if (result.metrics) {
        Object.assign(metrics, result.metrics);
      }
    }

    const recommendations: string[] = [];

    if (failed.length > 0) {
      recommendations.push(`Fix failed stages: ${failed.map((f) => f.stage).join(", ")}`);
    }

    if (metrics.eval_score && metrics.eval_score < this.config.eval_threshold) {
      recommendations.push(
        `Eval score ${metrics.eval_score} below threshold ${this.config.eval_threshold}. Consider more training data or epochs.`
      );
    }

    if (metrics.training_loss && metrics.training_loss > 1.0) {
      recommendations.push("High training loss. Consider lower learning rate.");
    }

    let status: "success" | "failure" | "partial" = "success";
    if (failed.length > 0) {
      status = completed.length > 0 ? "partial" : "failure";
    }

    return {
      pipeline_id: this.config.pipeline_id,
      status,
      total_duration_ms: totalDuration,
      stages_completed: completed.length,
      stages_failed: failed.length,
      stages_skipped: skipped.length,
      outputs,
      metrics: {
        dataset_size: metrics.dataset_size,
        training_loss: metrics.training_loss,
        eval_score: metrics.eval_score,
        model_size_mb: metrics.model_size_mb,
        inference_speed: metrics.inference_speed,
      },
      recommendations,
    };
  }

  /**
   * Validate pipeline configuration.
   * @returns Validation result with errors and warnings
   */
  validateConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.config.pipeline_id) {
      errors.push("pipeline_id is required");
    }

    if (!this.config.archive_path) {
      errors.push("archive_path is required");
    }

    if (!this.config.base_model) {
      errors.push("base_model is required");
    }

    if (this.config.stages.length === 0) {
      errors.push("At least one stage is required");
    }

    const invalidSkips = this.config.skip_stages.filter(
      (s) => !this.config.stages.includes(s)
    );
    if (invalidSkips.length > 0) {
      warnings.push(`Skip stages not in pipeline: ${invalidSkips.join(", ")}`);
    }

    if (
      this.config.skip_stages.includes("training") &&
      !this.config.skip_stages.includes("evaluation")
    ) {
      warnings.push("Skipping training but not evaluation may cause issues");
    }

    if (this.config.eval_threshold < 50) {
      warnings.push("eval_threshold < 50 may allow low-quality models");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Get dependencies for a stage.
   * @param stage Stage to check
   * @returns Array of prerequisite stages
   */
  getStageDependencies(stage: PipelineStage): PipelineStage[] {
    const deps: Record<PipelineStage, PipelineStage[]> = {
      dataset: [],
      training: ["dataset"],
      evaluation: ["training"],
      merge: ["training"],
      quantize: ["merge"],
      deploy: ["quantize"],
      verify: ["deploy"],
    };

    return deps[stage] || [];
  }

  /**
   * Check if a stage can be executed.
   * @param stage Stage to check
   * @returns Executability status with reason
   */
  canRunStage(stage: PipelineStage): { can: boolean; reason?: string } {
    if (!this.state) {
      return { can: false, reason: "Pipeline not initialized" };
    }

    if (this.config.skip_stages.includes(stage)) {
      return { can: false, reason: "Stage is in skip list" };
    }

    const deps = this.getStageDependencies(stage);
    for (const dep of deps) {
      if (this.config.skip_stages.includes(dep)) {
        continue;
      }

      const depResult = this.state.stage_results.find((r) => r.stage === dep);
      if (!depResult || depResult.status !== "completed") {
        return { can: false, reason: `Dependency ${dep} not completed` };
      }
    }

    return { can: true };
  }

  /**
   * Get stages to rollback on failure.
   * @param failedStage Stage that failed
   * @returns Stages to rollback (in reverse order)
   */
  getRollbackStages(failedStage: PipelineStage): PipelineStage[] {
    if (!this.config.auto_rollback) {
      return [];
    }

    const stageIndex = this.config.stages.indexOf(failedStage);
    if (stageIndex <= 0) {
      return [];
    }

    return this.config.stages.slice(0, stageIndex).reverse();
  }

  /**
   * Get estimated duration for pipeline.
   * @returns Duration estimates in minutes
   */
  getEstimatedDuration(): { total_minutes: number; by_stage: Record<PipelineStage, number> } {
    const estimates: Record<PipelineStage, number> = {
      dataset: 5,
      training: 120,
      evaluation: 15,
      merge: 10,
      quantize: 20,
      deploy: 2,
      verify: 1,
    };

    const byStage: Record<string, number> = {};
    let total = 0;

    for (const stage of this.config.stages) {
      if (!this.config.skip_stages.includes(stage)) {
        byStage[stage] = estimates[stage];
        total += estimates[stage];
      }
    }

    return {
      total_minutes: total,
      by_stage: byStage as Record<PipelineStage, number>,
    };
  }

  /**
   * Format duration for display.
   * @param ms Duration in milliseconds
   * @returns Human-readable duration string
   */
  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}

export const latheLoRAPipelineEngine = new LatheLoRAPipelineEngine();
