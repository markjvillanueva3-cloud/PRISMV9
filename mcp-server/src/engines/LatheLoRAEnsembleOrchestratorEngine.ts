/**
 * LatheLoRAEnsembleOrchestratorEngine — LATHE-LORA-MS0 U-LLR44
 * =============================================================
 *
 * Orchestrates end-to-end ensemble inference across LoRA adapters.
 * Coordinates model selection, parallel inference, voting, and combination.
 *
 * Features:
 *   - Unified ensemble pipeline
 *   - Parallel/sequential execution modes
 *   - Fallback handling
 *   - Performance tracking
 *
 * @module engines/LatheLoRAEnsembleOrchestratorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Execution mode */
export type ExecutionMode = "parallel" | "sequential" | "cascade";

/** Ensemble run status */
export type RunStatus = "pending" | "running" | "completed" | "failed" | "partial";

/** Single model execution result */
export interface ModelExecution {
  model_id: string;
  status: "success" | "failure" | "timeout";
  prediction?: string;
  numeric_value?: number;
  confidence: number;
  latency_ms: number;
  error?: string;
}

/** Ensemble run */
export interface EnsembleRun {
  id: string;
  input: string;
  mode: ExecutionMode;
  status: RunStatus;
  models_requested: string[];
  executions: ModelExecution[];
  consensus_reached: boolean;
  final_prediction?: string;
  final_value?: number;
  final_confidence: number;
  total_latency_ms: number;
  started_at: number;
  completed_at?: number;
}

/** Orchestrator configuration */
export interface EnsembleOrchConfig {
  default_mode: ExecutionMode;
  max_models_per_run: number;
  per_model_timeout_ms: number;
  min_successful_for_consensus: number;
  cascade_early_stop_confidence: number;
  enable_fallback: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: EnsembleOrchConfig = {
  default_mode: "parallel",
  max_models_per_run: 5,
  per_model_timeout_ms: 10000,
  min_successful_for_consensus: 2,
  cascade_early_stop_confidence: 0.95,
  enable_fallback: true,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAEnsembleOrchestratorEngine {
  private config: EnsembleOrchConfig = DEFAULT_CONFIG;
  private runs: Map<string, EnsembleRun> = new Map();
  private completedRuns: EnsembleRun[] = [];

  /**
   * Set configuration
   */
  setConfig(config: Partial<EnsembleOrchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): EnsembleOrchConfig {
    return { ...this.config };
  }

  /**
   * Start a new ensemble run
   */
  startRun(input: string, modelIds: string[], mode?: ExecutionMode): EnsembleRun {
    if (modelIds.length === 0) throw new Error("Must specify at least one model");
    if (modelIds.length > this.config.max_models_per_run) {
      throw new Error(`Too many models: ${modelIds.length} > ${this.config.max_models_per_run}`);
    }

    const run: EnsembleRun = {
      id: `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      input,
      mode: mode || this.config.default_mode,
      status: "running",
      models_requested: modelIds,
      executions: [],
      consensus_reached: false,
      final_confidence: 0,
      total_latency_ms: 0,
      started_at: Date.now(),
    };

    this.runs.set(run.id, run);
    log.info(`Started ensemble run: ${run.id}`);

    return run;
  }

  /**
   * Record execution result from a model
   */
  recordExecution(runId: string, execution: ModelExecution): boolean {
    const run = this.runs.get(runId);
    if (!run) return false;

    run.executions.push(execution);

    // Update total latency (max for parallel, sum for sequential)
    if (run.mode === "parallel") {
      run.total_latency_ms = Math.max(run.total_latency_ms, execution.latency_ms);
    } else {
      run.total_latency_ms += execution.latency_ms;
    }

    return true;
  }

  /**
   * Check cascade early stop condition
   */
  shouldCascadeStop(runId: string): boolean {
    const run = this.runs.get(runId);
    if (!run || run.mode !== "cascade") return false;

    // Stop if latest execution exceeds confidence threshold
    const latest = run.executions[run.executions.length - 1];
    if (!latest || latest.status !== "success") return false;

    return latest.confidence >= this.config.cascade_early_stop_confidence;
  }

  /**
   * Complete an ensemble run with final result
   */
  completeRun(runId: string): EnsembleRun | null {
    const run = this.runs.get(runId);
    if (!run) return null;

    const successful = run.executions.filter(e => e.status === "success");
    const failed = run.executions.filter(e => e.status !== "success");

    // Determine status
    if (successful.length === 0) {
      run.status = "failed";
    } else if (failed.length > 0) {
      run.status = "partial";
    } else {
      run.status = "completed";
    }

    // Compute final prediction (most common)
    if (successful.length > 0) {
      const counts: Record<string, number> = {};
      for (const e of successful) {
        if (e.prediction) {
          counts[e.prediction] = (counts[e.prediction] || 0) + 1;
        }
      }

      let maxCount = 0;
      for (const [pred, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count;
          run.final_prediction = pred;
        }
      }

      // Check consensus
      run.consensus_reached = maxCount >= this.config.min_successful_for_consensus;

      // Compute final numeric value (weighted avg if available)
      const withValues = successful.filter(e => e.numeric_value !== undefined);
      if (withValues.length > 0) {
        const totalConf = withValues.reduce((s, e) => s + e.confidence, 0);
        if (totalConf > 0) {
          run.final_value = withValues.reduce(
            (s, e) => s + e.numeric_value! * (e.confidence / totalConf),
            0,
          );
        }
      }

      // Final confidence (avg of supporting executions)
      const supporters = successful.filter(e => e.prediction === run.final_prediction);
      if (supporters.length > 0) {
        run.final_confidence = supporters.reduce((s, e) => s + e.confidence, 0) / supporters.length;
      }
    }

    run.completed_at = Date.now();

    this.runs.delete(runId);
    this.completedRuns.push(run);

    if (this.completedRuns.length > 500) {
      this.completedRuns = this.completedRuns.slice(-250);
    }

    log.info(`Ensemble run ${runId} completed: ${run.status}, consensus=${run.consensus_reached}`);

    return run;
  }

  /**
   * Get run by ID
   */
  getRun(runId: string): EnsembleRun | undefined {
    return this.runs.get(runId) || this.completedRuns.find(r => r.id === runId);
  }

  /**
   * Get active runs
   */
  getActiveRuns(): EnsembleRun[] {
    return Array.from(this.runs.values());
  }

  /**
   * Get completed runs
   */
  getCompletedRuns(limit?: number): EnsembleRun[] {
    const list = [...this.completedRuns];
    return limit ? list.slice(-limit) : list;
  }

  /**
   * Get aggregate stats
   */
  getStats(): {
    total_runs: number;
    active_runs: number;
    completed_runs: number;
    failed_runs: number;
    partial_runs: number;
    consensus_rate: number;
    avg_latency_ms: number;
    avg_final_confidence: number;
    mode_distribution: Record<string, number>;
  } {
    const total = this.completedRuns.length;
    if (total === 0) {
      return {
        total_runs: 0,
        active_runs: this.runs.size,
        completed_runs: 0,
        failed_runs: 0,
        partial_runs: 0,
        consensus_rate: 0,
        avg_latency_ms: 0,
        avg_final_confidence: 0,
        mode_distribution: {},
      };
    }

    const completed = this.completedRuns.filter(r => r.status === "completed").length;
    const failed = this.completedRuns.filter(r => r.status === "failed").length;
    const partial = this.completedRuns.filter(r => r.status === "partial").length;
    const consensus = this.completedRuns.filter(r => r.consensus_reached).length;
    const avgLatency = this.completedRuns.reduce((s, r) => s + r.total_latency_ms, 0) / total;
    const avgConf = this.completedRuns.reduce((s, r) => s + r.final_confidence, 0) / total;

    const modeDist: Record<string, number> = {};
    for (const r of this.completedRuns) {
      modeDist[r.mode] = (modeDist[r.mode] || 0) + 1;
    }

    return {
      total_runs: total,
      active_runs: this.runs.size,
      completed_runs: completed,
      failed_runs: failed,
      partial_runs: partial,
      consensus_rate: consensus / total,
      avg_latency_ms: avgLatency,
      avg_final_confidence: avgConf,
      mode_distribution: modeDist,
    };
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const stats = this.getStats();
    return [
      "Ensemble Orchestrator Summary",
      "=============================",
      `Total Runs: ${stats.total_runs}`,
      `Active: ${stats.active_runs}`,
      `Completed: ${stats.completed_runs}`,
      `Partial: ${stats.partial_runs}`,
      `Failed: ${stats.failed_runs}`,
      `Consensus Rate: ${(stats.consensus_rate * 100).toFixed(1)}%`,
      `Avg Latency: ${stats.avg_latency_ms.toFixed(0)}ms`,
      `Avg Final Confidence: ${stats.avg_final_confidence.toFixed(3)}`,
    ].join("\n");
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.runs.clear();
    this.completedRuns = [];
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAEnsembleOrchestratorEngine = new LatheLoRAEnsembleOrchestratorEngine();
