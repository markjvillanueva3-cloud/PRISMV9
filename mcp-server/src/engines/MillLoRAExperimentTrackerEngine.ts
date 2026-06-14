/**
 * MillLoRAExperimentTrackerEngine — Training Experiment Tracker (Mill parity)
 * ============================================================================
 *
 * Tracks MillLoRA training experiments: hyperparameters, metrics, artifacts.
 * Supports per-axis_mode experiment scope, mill-canonical metric vocabulary,
 * and best-model selection.
 *
 * Mill parity for LatheLoRAExperimentTrackerEngine (LATHE-LORA-MS0 U-LLR47)
 * with MILL-CANONICAL extensions:
 *
 *   - Per-axis_mode experiment scope — every experiment is tagged to a
 *     mill axis mode (3_axis / 4_axis_index / 5_axis_simul / shared) so
 *     best-of selection picks the right model per mill cell
 *   - Mill-canonical metric vocabulary (registered semantic metric kinds
 *     with monotonic direction so getBestMetric can correctly pick the
 *     winning sample without an explicit goal override):
 *       chatter_violation_rate  (minimize, Tlusty regenerative breach %)
 *       fpa_pass_rate           (maximize, first-piece approval ship %)
 *       tcpm_solver_failure_rate (minimize, Heidenhain/Fanuc 5-axis fault %)
 *       surface_finish_ra_um    (minimize, Ra in micrometers)
 *       dimensional_pass_pct    (maximize, AS9102 FAI pass %)
 *   - Mill-canonical artifact kinds beyond lathe-shared:
 *       vericut_log         (Vericut / NCSimul / G-Wizard sim log)
 *       post_processor_dump (Mastercam / HSMWorks emitted G-code)
 *       op_time_breakdown   (12-bucket cycle decomp from iter86)
 *
 * @module engines/MillLoRAExperimentTrackerEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-EXPERIMENT-TRACKER (iter91)
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MillExperimentStatus = "running" | "completed" | "failed" | "archived";

/** Per-axis training mode — matches MillLoRACadenceEngine / MillLoRADeploymentEngine. */
export type MillAxisMode = "3_axis" | "4_axis_index" | "5_axis_simul" | "shared";

/** Mill-canonical metric direction lookup. */
export type MillMetricGoal = "minimize" | "maximize";

/** Mill-canonical metric vocabulary with hard-coded direction. */
export const MILL_CANONICAL_METRICS: Record<string, MillMetricGoal> = {
  chatter_violation_rate: "minimize",
  fpa_pass_rate: "maximize",
  tcpm_solver_failure_rate: "minimize",
  surface_finish_ra_um: "minimize",
  dimensional_pass_pct: "maximize",
};

export interface MillExperimentMetric {
  name: string;
  value: number;
  step: number;
  timestamp: number;
}

export type MillArtifactType =
  // Lathe-shared
  | "model"
  | "log"
  | "checkpoint"
  | "config"
  | "dataset"
  | "other"
  // MILL-CANONICAL
  | "vericut_log"
  | "post_processor_dump"
  | "op_time_breakdown";

export const MILL_CANONICAL_ARTIFACT_TYPES: MillArtifactType[] = [
  "vericut_log",
  "post_processor_dump",
  "op_time_breakdown",
];

export interface MillExperimentArtifact {
  name: string;
  path: string;
  size_bytes?: number;
  type: MillArtifactType;
}

export interface MillExperiment {
  id: string;
  name: string;
  description?: string;
  status: MillExperimentStatus;
  hyperparameters: Record<string, unknown>;
  metrics: MillExperimentMetric[];
  artifacts: MillExperimentArtifact[];
  tags: string[];
  created_at: number;
  started_at?: number;
  completed_at?: number;
  parent_id?: string;
  /** MILL-CANONICAL: axis mode this experiment targets. */
  axis_mode: MillAxisMode;
}

export interface MillTrackerConfig {
  max_metrics_per_experiment: number;
  auto_archive_days: number;
  primary_metric: string;
  metric_goal: MillMetricGoal;
}

const DEFAULT_CONFIG: MillTrackerConfig = {
  max_metrics_per_experiment: 10000,
  auto_archive_days: 90,
  primary_metric: "val_loss",
  metric_goal: "minimize",
};

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillLoRAExperimentTrackerEngine {
  private config: MillTrackerConfig = { ...DEFAULT_CONFIG };
  private experiments: Map<string, MillExperiment> = new Map();

  setConfig(config: Partial<MillTrackerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MillTrackerConfig {
    return { ...this.config };
  }

  /**
   * Create an experiment. MILL-CANONICAL: axis_mode tag is required for
   * accurate best-of selection per axis.
   */
  createExperiment(
    name: string,
    hyperparameters: Record<string, unknown>,
    opts?: { tags?: string[]; axis_mode?: MillAxisMode; description?: string; parent_id?: string },
  ): MillExperiment {
    const exp: MillExperiment = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      name,
      description: opts?.description,
      status: "running",
      hyperparameters,
      metrics: [],
      artifacts: [],
      tags: opts?.tags ?? [],
      created_at: Date.now(),
      started_at: Date.now(),
      parent_id: opts?.parent_id,
      axis_mode: opts?.axis_mode ?? "shared",
    };
    this.experiments.set(exp.id, exp);
    return exp;
  }

  logMetric(experimentId: string, name: string, value: number, step: number): boolean {
    const exp = this.experiments.get(experimentId);
    if (!exp || exp.status !== "running") return false;

    if (exp.metrics.length >= this.config.max_metrics_per_experiment) {
      exp.metrics = exp.metrics.slice(-Math.floor(this.config.max_metrics_per_experiment / 2));
    }
    exp.metrics.push({ name, value, step, timestamp: Date.now() });
    return true;
  }

  logMetrics(experimentId: string, metrics: Record<string, number>, step: number): boolean {
    const exp = this.experiments.get(experimentId);
    if (!exp || exp.status !== "running") return false;
    for (const [name, value] of Object.entries(metrics)) {
      exp.metrics.push({ name, value, step, timestamp: Date.now() });
    }
    return true;
  }

  addArtifact(experimentId: string, artifact: MillExperimentArtifact): boolean {
    const exp = this.experiments.get(experimentId);
    if (!exp) return false;
    exp.artifacts.push(artifact);
    return true;
  }

  completeExperiment(experimentId: string, status: "completed" | "failed" = "completed"): boolean {
    const exp = this.experiments.get(experimentId);
    if (!exp || exp.status !== "running") return false;
    exp.status = status;
    exp.completed_at = Date.now();
    return true;
  }

  getMetricSeries(experimentId: string, metricName: string): MillExperimentMetric[] {
    const exp = this.experiments.get(experimentId);
    if (!exp) return [];
    return exp.metrics.filter((m) => m.name === metricName).sort((a, b) => a.step - b.step);
  }

  getLatestMetric(experimentId: string, metricName: string): number | undefined {
    const series = this.getMetricSeries(experimentId, metricName);
    return series.length > 0 ? series[series.length - 1].value : undefined;
  }

  /**
   * Get best (extremum) value for a metric. MILL-CANONICAL: if metric is
   * in MILL_CANONICAL_METRICS, the registered direction is used unless an
   * explicit goal arg is passed.
   */
  getBestMetric(experimentId: string, metricName: string, goal?: MillMetricGoal): number | undefined {
    const series = this.getMetricSeries(experimentId, metricName);
    if (series.length === 0) return undefined;
    const g = goal ?? MILL_CANONICAL_METRICS[metricName] ?? this.config.metric_goal;
    const values = series.map((m) => m.value);
    return g === "minimize" ? Math.min(...values) : Math.max(...values);
  }

  /**
   * Resolve the goal direction for a metric (mill-canonical lookup
   * wins; otherwise config default). Exposed for callers that want to
   * compare values themselves.
   */
  getMetricGoal(metricName: string): MillMetricGoal {
    return MILL_CANONICAL_METRICS[metricName] ?? this.config.metric_goal;
  }

  /**
   * Find best experiment by primary metric (or supplied metric).
   * MILL-CANONICAL: results can be filtered by axis_mode so a 5-axis
   * search doesn't pick a face-mill winner.
   */
  findBestExperiment(opts?: { tag?: string; axis_mode?: MillAxisMode; metric?: string }): MillExperiment | null {
    let candidates = Array.from(this.experiments.values()).filter((e) => e.status === "completed");
    if (opts?.tag) candidates = candidates.filter((e) => e.tags.includes(opts.tag as string));
    if (opts?.axis_mode) candidates = candidates.filter((e) => e.axis_mode === opts.axis_mode);
    if (candidates.length === 0) return null;

    const metric = opts?.metric ?? this.config.primary_metric;
    const goal = this.getMetricGoal(metric);

    let best: MillExperiment | null = null;
    let bestValue: number | undefined;
    for (const c of candidates) {
      const v = this.getBestMetric(c.id, metric, goal);
      if (v === undefined) continue;
      if (best === null || (goal === "minimize" ? v < (bestValue as number) : v > (bestValue as number))) {
        best = c;
        bestValue = v;
      }
    }
    return best;
  }

  /**
   * MILL-CANONICAL: per-axis_mode best-of map. Picks the best experiment
   * for each axis present in the corpus.
   */
  findBestPerAxis(metric?: string): Partial<Record<MillAxisMode, MillExperiment>> {
    const out: Partial<Record<MillAxisMode, MillExperiment>> = {};
    const axes: MillAxisMode[] = ["3_axis", "4_axis_index", "5_axis_simul", "shared"];
    for (const axis of axes) {
      const best = this.findBestExperiment({ axis_mode: axis, metric });
      if (best) out[axis] = best;
    }
    return out;
  }

  compareExperiments(expIdA: string, expIdB: string, metric: string): { winner: string | null; diff: number } {
    const valA = this.getLatestMetric(expIdA, metric);
    const valB = this.getLatestMetric(expIdB, metric);
    if (valA === undefined || valB === undefined) return { winner: null, diff: 0 };

    const goal = this.getMetricGoal(metric);
    const diff = valA - valB;
    let winner: string | null = null;
    if (goal === "minimize") {
      if (valA < valB) winner = expIdA;
      else if (valB < valA) winner = expIdB;
    } else {
      if (valA > valB) winner = expIdA;
      else if (valB > valA) winner = expIdB;
    }
    return { winner, diff };
  }

  getExperiment(id: string): MillExperiment | undefined {
    return this.experiments.get(id);
  }

  /** Filter experiments by status / tag / axis_mode. */
  getExperiments(filter?: { status?: MillExperimentStatus; tag?: string; axis_mode?: MillAxisMode }): MillExperiment[] {
    let list = Array.from(this.experiments.values());
    if (filter?.status) list = list.filter((e) => e.status === filter.status);
    if (filter?.tag) list = list.filter((e) => e.tags.includes(filter.tag as string));
    if (filter?.axis_mode) list = list.filter((e) => e.axis_mode === filter.axis_mode);
    return list;
  }

  archive(id: string): boolean {
    const exp = this.experiments.get(id);
    if (!exp) return false;
    exp.status = "archived";
    return true;
  }

  getStats(): {
    total_experiments: number;
    running: number;
    completed: number;
    failed: number;
    archived: number;
    total_metrics_logged: number;
    total_artifacts: number;
    experiments_by_axis: Record<string, number>;
    artifacts_by_type: Record<string, number>;
  } {
    const all = Array.from(this.experiments.values());
    const byAxis: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const e of all) {
      byAxis[e.axis_mode] = (byAxis[e.axis_mode] ?? 0) + 1;
      for (const a of e.artifacts) {
        byType[a.type] = (byType[a.type] ?? 0) + 1;
      }
    }
    return {
      total_experiments: all.length,
      running: all.filter((e) => e.status === "running").length,
      completed: all.filter((e) => e.status === "completed").length,
      failed: all.filter((e) => e.status === "failed").length,
      archived: all.filter((e) => e.status === "archived").length,
      total_metrics_logged: all.reduce((s, e) => s + e.metrics.length, 0),
      total_artifacts: all.reduce((s, e) => s + e.artifacts.length, 0),
      experiments_by_axis: byAxis,
      artifacts_by_type: byType,
    };
  }

  getSummary(): string {
    const stats = this.getStats();
    return [
      "Mill LoRA Experiment Tracker Summary",
      "====================================",
      `Total: ${stats.total_experiments}`,
      `Running: ${stats.running}`,
      `Completed: ${stats.completed}`,
      `Failed: ${stats.failed}`,
      `Metrics Logged: ${stats.total_metrics_logged}`,
      `Artifacts: ${stats.total_artifacts}`,
    ].join("\n");
  }

  reset(): void {
    this.experiments.clear();
    this.config = { ...DEFAULT_CONFIG };
  }
}

export const millLoRAExperimentTrackerEngine = new MillLoRAExperimentTrackerEngine();
export { MillLoRAExperimentTrackerEngine };
