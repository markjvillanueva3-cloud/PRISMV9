/**
 * MillLoRAEnsembleOrchestratorEngine — Ensemble Pipeline Orchestrator (Mill parity)
 * ===================================================================================
 *
 * Orchestrates end-to-end ensemble inference across MillLoRA adapters.
 * Coordinates model selection, parallel inference, voting, combination,
 * and MILL-CANONICAL physical-process abort signals.
 *
 * Mill parity for LatheLoRAEnsembleOrchestratorEngine (LATHE-LORA-MS0
 * U-LLR44) with MILL-CANONICAL extensions:
 *
 *   - Per-run axis_mode tag — every ensemble run is scoped to one axis
 *     (3_axis / 4_axis_index / 5_axis_simul / shared) so cross-axis
 *     model contributions don't pollute consensus
 *   - Per-execution mill signals — chatter_breach / fpa_pass /
 *     tcpm_solver_fault flags on each ModelExecution let the cascade
 *     mode early-stop on chatter (critical — tool damage risk)
 *   - 2 MILL-CANONICAL run statuses layered on lathe-shared:
 *       chatter_aborted (any chatter_breach during cascade — stop NOW)
 *       tcpm_aborted    (5-axis TCPM solver fault, sequential abort)
 *   - getStatsByAxis returns per-axis_mode consensus rate
 *
 * @module engines/MillLoRAEnsembleOrchestratorEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-ENSEMBLE-ORCHESTRATOR (iter96)
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MillEnsembleExecutionMode = "parallel" | "sequential" | "cascade";

/** 5 lathe-shared statuses + 2 MILL-CANONICAL. */
export type MillEnsembleRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "partial"
  | "chatter_aborted"
  | "tcpm_aborted";

export const MILL_CANONICAL_RUN_STATUSES: MillEnsembleRunStatus[] = ["chatter_aborted", "tcpm_aborted"];

/** Per-axis training mode — matches MillLoRACadenceEngine taxonomy. */
export type MillAxisMode = "3_axis" | "4_axis_index" | "5_axis_simul" | "shared";

export interface MillModelExecution {
  model_id: string;
  status: "success" | "failure" | "timeout";
  prediction?: string;
  numeric_value?: number;
  confidence: number;
  latency_ms: number;
  error?: string;
  /** MILL-CANONICAL: chatter event recorded against this execution. */
  chatter_breach?: boolean;
  /** MILL-CANONICAL: first-piece approval result. */
  fpa_pass?: boolean;
  /** MILL-CANONICAL: 5-axis TCPM transform failed. */
  tcpm_solver_fault?: boolean;
}

export interface MillEnsembleRun {
  id: string;
  input: string;
  mode: MillEnsembleExecutionMode;
  status: MillEnsembleRunStatus;
  models_requested: string[];
  executions: MillModelExecution[];
  consensus_reached: boolean;
  final_prediction?: string;
  final_value?: number;
  final_confidence: number;
  total_latency_ms: number;
  started_at: number;
  completed_at?: number;
  /** MILL-CANONICAL: which axis mode this run is scoped to. */
  axis_mode: MillAxisMode;
  /** MILL-CANONICAL: abort reason if status was *_aborted. */
  abort_reason?: "chatter_breach" | "tcpm_solver_fault";
}

export interface MillEnsembleOrchConfig {
  default_mode: MillEnsembleExecutionMode;
  max_models_per_run: number;
  per_model_timeout_ms: number;
  min_successful_for_consensus: number;
  cascade_early_stop_confidence: number;
  enable_fallback: boolean;
  /** MILL-CANONICAL: enable chatter_breach abort in cascade/sequential. */
  abort_on_chatter_breach: boolean;
  /** MILL-CANONICAL: enable tcpm_solver_fault abort in cascade/sequential. */
  abort_on_tcpm_fault: boolean;
}

const DEFAULT_CONFIG: MillEnsembleOrchConfig = {
  default_mode: "parallel",
  max_models_per_run: 5,
  per_model_timeout_ms: 10000,
  min_successful_for_consensus: 2,
  cascade_early_stop_confidence: 0.95,
  enable_fallback: true,
  abort_on_chatter_breach: true,
  abort_on_tcpm_fault: true,
};

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillLoRAEnsembleOrchestratorEngine {
  private config: MillEnsembleOrchConfig = { ...DEFAULT_CONFIG };
  private runs: Map<string, MillEnsembleRun> = new Map();
  private completedRuns: MillEnsembleRun[] = [];

  setConfig(config: Partial<MillEnsembleOrchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MillEnsembleOrchConfig {
    return { ...this.config };
  }

  startRun(
    input: string,
    modelIds: string[],
    opts?: { mode?: MillEnsembleExecutionMode; axis_mode?: MillAxisMode },
  ): MillEnsembleRun {
    if (modelIds.length === 0) throw new Error("Must specify at least one model");
    if (modelIds.length > this.config.max_models_per_run) {
      throw new Error(`Too many models: ${modelIds.length} > ${this.config.max_models_per_run}`);
    }
    const run: MillEnsembleRun = {
      id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      input,
      mode: opts?.mode ?? this.config.default_mode,
      status: "running",
      models_requested: modelIds,
      executions: [],
      consensus_reached: false,
      final_confidence: 0,
      total_latency_ms: 0,
      started_at: Date.now(),
      axis_mode: opts?.axis_mode ?? "shared",
    };
    this.runs.set(run.id, run);
    return run;
  }

  recordExecution(runId: string, execution: MillModelExecution): boolean {
    const run = this.runs.get(runId);
    if (!run) return false;
    run.executions.push(execution);
    if (run.mode === "parallel") {
      run.total_latency_ms = Math.max(run.total_latency_ms, execution.latency_ms);
    } else {
      run.total_latency_ms += execution.latency_ms;
    }
    return true;
  }

  /**
   * MILL-CANONICAL: should the cascade early-stop?
   * Early-stop conditions:
   *   - latest execution confidence >= cascade_early_stop_confidence (lathe-shared)
   *   - latest execution chatter_breach=true AND abort_on_chatter_breach (critical)
   *   - latest execution tcpm_solver_fault=true AND abort_on_tcpm_fault (5-axis critical)
   */
  shouldCascadeStop(runId: string): { stop: boolean; reason?: "confidence" | "chatter" | "tcpm" } {
    const run = this.runs.get(runId);
    if (!run || run.mode !== "cascade") return { stop: false };
    const latest = run.executions[run.executions.length - 1];
    if (!latest) return { stop: false };

    // MILL-CANONICAL: chatter is highest priority abort
    if (latest.chatter_breach === true && this.config.abort_on_chatter_breach) {
      return { stop: true, reason: "chatter" };
    }
    if (latest.tcpm_solver_fault === true && this.config.abort_on_tcpm_fault) {
      return { stop: true, reason: "tcpm" };
    }
    if (latest.status === "success" && latest.confidence >= this.config.cascade_early_stop_confidence) {
      return { stop: true, reason: "confidence" };
    }
    return { stop: false };
  }

  completeRun(runId: string): MillEnsembleRun | null {
    const run = this.runs.get(runId);
    if (!run) return null;

    const successful = run.executions.filter((e) => e.status === "success");
    const failed = run.executions.filter((e) => e.status !== "success");

    // MILL-CANONICAL: check for abort signals first — they override consensus
    const chatterEvent = run.executions.find((e) => e.chatter_breach === true);
    const tcpmEvent = run.executions.find((e) => e.tcpm_solver_fault === true);

    if (chatterEvent && this.config.abort_on_chatter_breach) {
      run.status = "chatter_aborted";
      run.abort_reason = "chatter_breach";
    } else if (tcpmEvent && this.config.abort_on_tcpm_fault) {
      run.status = "tcpm_aborted";
      run.abort_reason = "tcpm_solver_fault";
    } else if (successful.length === 0) {
      run.status = "failed";
    } else if (failed.length > 0) {
      run.status = "partial";
    } else {
      run.status = "completed";
    }

    // Only compute consensus if NOT aborted by mill-canonical signal
    if (run.status !== "chatter_aborted" && run.status !== "tcpm_aborted" && successful.length > 0) {
      const counts: Record<string, number> = {};
      for (const e of successful) {
        if (e.prediction) counts[e.prediction] = (counts[e.prediction] ?? 0) + 1;
      }
      let maxCount = 0;
      for (const [pred, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count;
          run.final_prediction = pred;
        }
      }
      run.consensus_reached = maxCount >= this.config.min_successful_for_consensus;

      const withValues = successful.filter((e) => typeof e.numeric_value === "number");
      if (withValues.length > 0) {
        const totalConf = withValues.reduce((s, e) => s + e.confidence, 0);
        if (totalConf > 0) {
          run.final_value = withValues.reduce(
            (s, e) => s + (e.numeric_value as number) * (e.confidence / totalConf),
            0,
          );
        }
      }
      const supporters = successful.filter((e) => e.prediction === run.final_prediction);
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
    return run;
  }

  getRun(runId: string): MillEnsembleRun | undefined {
    return this.runs.get(runId) ?? this.completedRuns.find((r) => r.id === runId);
  }

  getActiveRuns(): MillEnsembleRun[] {
    return Array.from(this.runs.values());
  }

  getCompletedRuns(limit?: number): MillEnsembleRun[] {
    const list = [...this.completedRuns];
    return typeof limit === "number" ? list.slice(-limit) : list;
  }

  getStats(): {
    total_runs: number;
    active_runs: number;
    completed_runs: number;
    failed_runs: number;
    partial_runs: number;
    chatter_aborted_runs: number;
    tcpm_aborted_runs: number;
    consensus_rate: number;
    avg_latency_ms: number;
    avg_final_confidence: number;
    mode_distribution: Record<string, number>;
    runs_by_axis: Record<string, number>;
  } {
    const total = this.completedRuns.length;
    const byAxis: Record<string, number> = {};
    if (total === 0) {
      return {
        total_runs: 0,
        active_runs: this.runs.size,
        completed_runs: 0,
        failed_runs: 0,
        partial_runs: 0,
        chatter_aborted_runs: 0,
        tcpm_aborted_runs: 0,
        consensus_rate: 0,
        avg_latency_ms: 0,
        avg_final_confidence: 0,
        mode_distribution: {},
        runs_by_axis: byAxis,
      };
    }
    const completed = this.completedRuns.filter((r) => r.status === "completed").length;
    const failed = this.completedRuns.filter((r) => r.status === "failed").length;
    const partial = this.completedRuns.filter((r) => r.status === "partial").length;
    const chatterAborted = this.completedRuns.filter((r) => r.status === "chatter_aborted").length;
    const tcpmAborted = this.completedRuns.filter((r) => r.status === "tcpm_aborted").length;
    const consensus = this.completedRuns.filter((r) => r.consensus_reached).length;
    const avgLatency = this.completedRuns.reduce((s, r) => s + r.total_latency_ms, 0) / total;
    const avgConf = this.completedRuns.reduce((s, r) => s + r.final_confidence, 0) / total;
    const modeDist: Record<string, number> = {};
    for (const r of this.completedRuns) {
      modeDist[r.mode] = (modeDist[r.mode] ?? 0) + 1;
      byAxis[r.axis_mode] = (byAxis[r.axis_mode] ?? 0) + 1;
    }
    return {
      total_runs: total,
      active_runs: this.runs.size,
      completed_runs: completed,
      failed_runs: failed,
      partial_runs: partial,
      chatter_aborted_runs: chatterAborted,
      tcpm_aborted_runs: tcpmAborted,
      consensus_rate: consensus / total,
      avg_latency_ms: avgLatency,
      avg_final_confidence: avgConf,
      mode_distribution: modeDist,
      runs_by_axis: byAxis,
    };
  }

  /** MILL-CANONICAL: per-axis_mode consensus rate breakdown. */
  getStatsByAxis(): Record<string, { runs: number; consensus_rate: number; chatter_aborted: number; tcpm_aborted: number }> {
    const out: Record<string, { runs: number; consensus_rate: number; chatter_aborted: number; tcpm_aborted: number }> = {};
    const buckets: Record<string, MillEnsembleRun[]> = {};
    for (const r of this.completedRuns) {
      if (!buckets[r.axis_mode]) buckets[r.axis_mode] = [];
      buckets[r.axis_mode].push(r);
    }
    for (const [axis, list] of Object.entries(buckets)) {
      const cons = list.filter((r) => r.consensus_reached).length;
      out[axis] = {
        runs: list.length,
        consensus_rate: list.length > 0 ? cons / list.length : 0,
        chatter_aborted: list.filter((r) => r.status === "chatter_aborted").length,
        tcpm_aborted: list.filter((r) => r.status === "tcpm_aborted").length,
      };
    }
    return out;
  }

  getSummary(): string {
    const stats = this.getStats();
    return [
      "Mill LoRA Ensemble Orchestrator Summary",
      "=======================================",
      `Total Runs: ${stats.total_runs}`,
      `Active: ${stats.active_runs}`,
      `Completed: ${stats.completed_runs}`,
      `Partial: ${stats.partial_runs}`,
      `Failed: ${stats.failed_runs}`,
      `Chatter Aborted: ${stats.chatter_aborted_runs}`,
      `TCPM Aborted: ${stats.tcpm_aborted_runs}`,
      `Consensus Rate: ${(stats.consensus_rate * 100).toFixed(1)}%`,
      `Avg Latency: ${stats.avg_latency_ms.toFixed(0)}ms`,
    ].join("\n");
  }

  reset(): void {
    this.runs.clear();
    this.completedRuns = [];
    this.config = { ...DEFAULT_CONFIG };
  }
}

export const millLoRAEnsembleOrchestratorEngine = new MillLoRAEnsembleOrchestratorEngine();
export { MillLoRAEnsembleOrchestratorEngine };
