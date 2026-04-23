/**
 * StrategyPerformanceTrackerEngine — Actual vs. Predicted Performance Tracker
 *
 * Records every strategy execution and computes prediction accuracy metrics
 * to feed the self-learning loop (CAMX-MS15/U01, E1131).
 *
 * Data recorded per execution:
 *   • Identity: strategy_id, feature_type, material_iso, tool_id, machine_id
 *   • Predicted: cycle_time, tool_life, Ra, Fc, power
 *   • Actual:    cycle_time, tool_life, Ra, Fc (if measured), power (if measured)
 *   • Delta:     (actual − predicted) / predicted × 100 per metric
 *   • Outcome:   success | failure | partial
 *
 * Accuracy statistics per metric:
 *   • MAPE  — Mean Absolute Percentage Error
 *   • Bias  — Mean signed error (positive = PRISM over-predicts)
 *   • R²    — Coefficient of determination
 *   • Wilson confidence interval on sample proportion (95%)
 *   • std_dev of percentage errors
 *
 * Persistence: in-memory + auto-persist to ~/.prism/strategy-performance.json
 *              every 10 records.
 *
 * @engine StrategyPerformanceTrackerEngine
 * @shortcode E1131
 * @dispatcher camDispatcher
 * @actions strategy_perf_record, strategy_perf_accuracy, strategy_perf_top, strategy_perf_stats
 * @milestone CAMX-MS15/U01
 */

import * as fs   from "fs";
import * as path from "path";
import * as os   from "os";

// ─── Types ────────────────────────────────────────────────────────────────────

/** ISO material group */
export type IsoGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Execution outcome */
export type ExecutionOutcome = "success" | "failure" | "partial";

/** Predicted values — all optional so callers can omit metrics not computed */
export interface PredictedMetrics {
  /** Predicted cycle time, min */
  cycle_time_min?: number;
  /** Predicted tool life, min */
  tool_life_min?: number;
  /** Predicted surface roughness Ra, µm */
  Ra_um?: number;
  /** Predicted cutting force Fc, N */
  Fc_N?: number;
  /** Predicted spindle power, kW */
  power_kW?: number;
}

/** Actual measured values — all optional (not always measurable on shop floor) */
export interface ActualMetrics {
  /** Measured cycle time, min */
  cycle_time_min?: number;
  /** Measured tool life, min */
  tool_life_min?: number;
  /** Measured surface roughness Ra, µm */
  Ra_um?: number;
  /** Measured cutting force Fc, N (requires dynamometer) */
  Fc_N?: number;
  /** Measured spindle power, kW (from spindle load) */
  power_kW?: number;
}

/** Per-metric delta record: (actual − predicted) / predicted × 100 */
export interface MetricDeltas {
  cycle_time_pct?: number;
  tool_life_pct?: number;
  Ra_pct?: number;
  Fc_pct?: number;
  power_pct?: number;
}

/** Full strategy execution record */
export interface StrategyExecution {
  /** Unique execution identifier (auto-generated if not provided) */
  execution_id: string;
  /** Strategy identifier, e.g. "hm_optimized_roughing" */
  strategy_id: string;
  /** Geometry feature type, e.g. "pocket", "contour", "slot" */
  feature_type: string;
  /** ISO material group */
  material_iso: IsoGroup;
  /** Tool identifier, e.g. "T01" or "Sandvik-R390" */
  tool_id?: string;
  /** Machine identifier, e.g. "DMG-DMU50" */
  machine_id?: string;
  /** PRISM-predicted performance values */
  predicted: PredictedMetrics;
  /** Actual measured performance values */
  actual: ActualMetrics;
  /** Computed deltas (auto-filled by record()) */
  deltas: MetricDeltas;
  /** Execution outcome */
  outcome: ExecutionOutcome;
  /** Epoch timestamp of recording */
  timestamp: number;
  /** Optional free-form notes */
  notes?: string;
}

/** Accuracy statistics for one metric */
export interface MetricAccuracy {
  /** Mean Absolute Percentage Error (MAPE), % */
  mape_pct: number;
  /** Mean signed percentage error — positive = over-predicts, negative = under-predicts */
  bias_pct: number;
  /** Population standard deviation of percentage errors */
  std_dev_pct: number;
  /** R² coefficient of determination (actual vs predicted) */
  r_squared: number;
  /** Sample count used for computation */
  sample_count: number;
  /** Wilson 95% CI on proportion of executions within ±10% error */
  within_10pct_ci95: { lower: number; upper: number; proportion: number };
}

/** Full prediction accuracy result */
export interface PredictionAccuracy {
  /** Filters applied */
  filters: { strategy_id?: string; material_iso?: IsoGroup; feature_type?: string };
  /** Number of matching executions */
  sample_count: number;
  /** Accuracy per metric (only metrics with ≥2 data points included) */
  metrics: {
    cycle_time?: MetricAccuracy;
    tool_life?: MetricAccuracy;
    Ra?: MetricAccuracy;
    Fc?: MetricAccuracy;
    power?: MetricAccuracy;
  };
  /** Overall MAPE across all metrics (equal-weight average) */
  overall_mape_pct: number;
  /** Success rate among matched executions */
  success_rate: number;
}

/** Top performer entry */
export interface TopPerformer {
  strategy_id: string;
  execution_count: number;
  /** Mean actual cycle time (min), if measured */
  mean_actual_cycle_time_min?: number;
  /** Mean actual tool life (min), if measured */
  mean_actual_tool_life_min?: number;
  /** Mean actual Ra (µm), if measured */
  mean_actual_Ra_um?: number;
  /** Success rate 0-1 */
  success_rate: number;
  /** Composite performance score 0-100 (lower CT+Ra, higher TL = better) */
  composite_score: number;
}

/** Overall tracking statistics */
export interface TrackerStats {
  total_executions: number;
  unique_strategies: number;
  unique_features: number;
  unique_materials: string[];
  success_rate: number;
  partial_rate: number;
  failure_rate: number;
  overall_mape_pct: number;
  most_tracked_strategy: string | null;
  oldest_record_ts: number | null;
  newest_record_ts: number | null;
  persist_path: string;
}

/** Serialisable store format */
export interface StrategyPerfData {
  version: number;
  exported_at: number;
  executions: StrategyExecution[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PERSIST_DIR  = path.join(os.homedir(), ".prism");
const PERSIST_FILE = path.join(PERSIST_DIR, "strategy-performance.json");
const DATA_VERSION = 1;
const PERSIST_EVERY = 10;

/** z-score for 95% Wilson CI */
const Z_95 = 1.96;

// ─── Math helpers ─────────────────────────────────────────────────────────────

/** Signed percentage error: (actual − predicted) / |predicted| × 100 */
function signedPct(actual: number, predicted: number): number {
  if (Math.abs(predicted) < 1e-9) return 0;
  return ((actual - predicted) / Math.abs(predicted)) * 100;
}

/**
 * Compute R² from paired (actual, predicted) arrays.
 * R² = 1 − SS_res / SS_tot
 * SS_tot computed from mean of actuals.
 */
function computeR2(actuals: number[], preds: number[]): number {
  const n = actuals.length;
  if (n < 2) return 0;
  const meanA = actuals.reduce((s, v) => s + v, 0) / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    ssTot += (actuals[i] - meanA) ** 2;
    ssRes += (actuals[i] - preds[i]) ** 2;
  }
  if (ssTot < 1e-12) return 1; // all actuals identical — perfect explanation
  return Math.max(-1, 1 - ssRes / ssTot);
}

/**
 * Wilson score 95% CI on a proportion p̂ = k/n.
 * Returns { lower, upper, proportion }.
 */
function wilsonCI95(k: number, n: number): { lower: number; upper: number; proportion: number } {
  if (n === 0) return { lower: 0, upper: 0, proportion: 0 };
  const p = k / n;
  const z = Z_95;
  const z2n = z * z / n;
  const centre = (p + z2n / 2) / (1 + z2n);
  const spread  = (z / (1 + z2n)) * Math.sqrt(p * (1 - p) / n + z2n / (4 * n));
  return {
    proportion: parseFloat(p.toFixed(4)),
    lower: parseFloat(Math.max(0, centre - spread).toFixed(4)),
    upper: parseFloat(Math.min(1, centre + spread).toFixed(4)),
  };
}

/**
 * Compute full MetricAccuracy from paired samples.
 * @param errors - signed % errors (actual − predicted) / |predicted| × 100
 * @param actuals - actual measured values
 * @param preds   - predicted values (corresponding)
 */
function computeMetricAccuracy(
  errors: number[],
  actuals: number[],
  preds: number[],
): MetricAccuracy {
  const n = errors.length;
  const mape = errors.reduce((s, e) => s + Math.abs(e), 0) / n;
  const bias  = errors.reduce((s, e) => s + e, 0) / n;
  const variance = errors.reduce((s, e) => s + (e - bias) ** 2, 0) / (n > 1 ? n - 1 : 1);
  const std_dev = Math.sqrt(Math.max(variance, 0));
  const r2 = computeR2(actuals, preds);
  const within10 = errors.filter(e => Math.abs(e) <= 10).length;
  const ci = wilsonCI95(within10, n);

  return {
    mape_pct:   parseFloat(mape.toFixed(3)),
    bias_pct:   parseFloat(bias.toFixed(3)),
    std_dev_pct: parseFloat(std_dev.toFixed(3)),
    r_squared:  parseFloat(r2.toFixed(4)),
    sample_count: n,
    within_10pct_ci95: ci,
  };
}

/** Generate a simple unique ID */
function genId(): string {
  return `exec_${Date.now()}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class StrategyPerformanceTrackerEngine {
  private executions: StrategyExecution[] = [];
  private recordCount = 0;

  constructor() {
    this.loadFromDisk();
  }

  // ── record ──────────────────────────────────────────────────────────────────

  /**
   * Record a strategy execution with predicted vs actual metrics.
   * Computes deltas automatically. Auto-persists every 10 records.
   */
  record(execution: Omit<StrategyExecution, "execution_id" | "deltas" | "timestamp"> & {
    execution_id?: string;
    timestamp?: number;
    deltas?: MetricDeltas;
  }): StrategyExecution {
    const deltas: MetricDeltas = {};
    const p = execution.predicted;
    const a = execution.actual;

    if (p.cycle_time_min != null && a.cycle_time_min != null)
      deltas.cycle_time_pct = parseFloat(signedPct(a.cycle_time_min, p.cycle_time_min).toFixed(3));
    if (p.tool_life_min != null && a.tool_life_min != null)
      deltas.tool_life_pct = parseFloat(signedPct(a.tool_life_min, p.tool_life_min).toFixed(3));
    if (p.Ra_um != null && a.Ra_um != null)
      deltas.Ra_pct = parseFloat(signedPct(a.Ra_um, p.Ra_um).toFixed(3));
    if (p.Fc_N != null && a.Fc_N != null)
      deltas.Fc_pct = parseFloat(signedPct(a.Fc_N, p.Fc_N).toFixed(3));
    if (p.power_kW != null && a.power_kW != null)
      deltas.power_pct = parseFloat(signedPct(a.power_kW, p.power_kW).toFixed(3));

    const record: StrategyExecution = {
      execution_id: execution.execution_id ?? genId(),
      strategy_id:  execution.strategy_id,
      feature_type: execution.feature_type,
      material_iso: execution.material_iso,
      tool_id:      execution.tool_id,
      machine_id:   execution.machine_id,
      predicted:    execution.predicted,
      actual:       execution.actual,
      deltas,
      outcome:      execution.outcome,
      timestamp:    execution.timestamp ?? Date.now(),
      notes:        execution.notes,
    };

    this.executions.push(record);
    this.recordCount += 1;

    if (this.recordCount % PERSIST_EVERY === 0) {
      this.saveToDisk();
    }

    return record;
  }

  // ── getAccuracy ──────────────────────────────────────────────────────────────

  /**
   * Compute prediction accuracy statistics for matched executions.
   *
   * Accuracy is computed only where both predicted and actual values exist.
   * Metrics with fewer than 2 data points are omitted from results.
   *
   * @returns PredictionAccuracy with MAPE, bias, R², std_dev, Wilson CI per metric
   */
  getAccuracy(
    strategy_id?: string,
    material_iso?: IsoGroup,
    feature_type?: string,
  ): PredictionAccuracy {
    const matched = this.filter({ strategy_id, material_iso, feature_type });

    // Collect paired samples per metric
    const ct: { err: number; act: number; pred: number }[] = [];
    const tl: { err: number; act: number; pred: number }[] = [];
    const ra: { err: number; act: number; pred: number }[] = [];
    const fc: { err: number; act: number; pred: number }[] = [];
    const pw: { err: number; act: number; pred: number }[] = [];

    for (const ex of matched) {
      const p = ex.predicted;
      const a = ex.actual;

      if (p.cycle_time_min != null && a.cycle_time_min != null)
        ct.push({ err: signedPct(a.cycle_time_min, p.cycle_time_min), act: a.cycle_time_min, pred: p.cycle_time_min });
      if (p.tool_life_min != null && a.tool_life_min != null)
        tl.push({ err: signedPct(a.tool_life_min, p.tool_life_min), act: a.tool_life_min, pred: p.tool_life_min });
      if (p.Ra_um != null && a.Ra_um != null)
        ra.push({ err: signedPct(a.Ra_um, p.Ra_um), act: a.Ra_um, pred: p.Ra_um });
      if (p.Fc_N != null && a.Fc_N != null)
        fc.push({ err: signedPct(a.Fc_N, p.Fc_N), act: a.Fc_N, pred: p.Fc_N });
      if (p.power_kW != null && a.power_kW != null)
        pw.push({ err: signedPct(a.power_kW, p.power_kW), act: a.power_kW, pred: p.power_kW });
    }

    const toAcc = (arr: { err: number; act: number; pred: number }[]) =>
      arr.length >= 2
        ? computeMetricAccuracy(arr.map(x => x.err), arr.map(x => x.act), arr.map(x => x.pred))
        : undefined;

    const metrics: PredictionAccuracy["metrics"] = {
      cycle_time: toAcc(ct),
      tool_life:  toAcc(tl),
      Ra:         toAcc(ra),
      Fc:         toAcc(fc),
      power:      toAcc(pw),
    };

    // Overall MAPE: mean of available metric MAPEs
    const mapes = [metrics.cycle_time, metrics.tool_life, metrics.Ra, metrics.Fc, metrics.power]
      .filter((m): m is MetricAccuracy => m !== undefined)
      .map(m => m.mape_pct);

    const overall_mape_pct = mapes.length > 0
      ? parseFloat((mapes.reduce((s, v) => s + v, 0) / mapes.length).toFixed(3))
      : 0;

    const successes = matched.filter(e => e.outcome === "success").length;

    return {
      filters: { strategy_id, material_iso, feature_type },
      sample_count: matched.length,
      metrics,
      overall_mape_pct,
      success_rate: matched.length > 0
        ? parseFloat((successes / matched.length).toFixed(4))
        : 0,
    };
  }

  // ── getHistory ───────────────────────────────────────────────────────────────

  /**
   * Return matching executions in reverse chronological order (newest first).
   * @param limit - Max records to return (default 100)
   */
  getHistory(
    filters?: {
      strategy_id?: string;
      material_iso?: IsoGroup;
      feature_type?: string;
      outcome?: ExecutionOutcome;
      tool_id?: string;
      machine_id?: string;
    },
    limit = 100,
  ): StrategyExecution[] {
    let results = filters ? this.filter(filters) : [...this.executions];
    if (filters?.outcome) {
      results = results.filter(e => e.outcome === filters.outcome);
    }
    if (filters?.tool_id) {
      results = results.filter(e => e.tool_id === filters.tool_id);
    }
    if (filters?.machine_id) {
      results = results.filter(e => e.machine_id === filters.machine_id);
    }
    // Newest first
    results.sort((a, b) => b.timestamp - a.timestamp);
    return results.slice(0, limit);
  }

  // ── getTopPerformers ──────────────────────────────────────────────────────────

  /**
   * Return strategies ranked by composite actual performance for a given
   * feature_type + material_iso combination.
   *
   * Composite score 0-100: lower cycle_time and Ra are better, higher tool_life better.
   * Uses reciprocal normalisation relative to the dataset mean.
   */
  getTopPerformers(feature_type: string, material_iso: IsoGroup, limit = 10): TopPerformer[] {
    const matched = this.executions.filter(
      e => e.feature_type === feature_type && e.material_iso === material_iso,
    );
    if (matched.length === 0) return [];

    // Aggregate per strategy
    const map = new Map<string, {
      cycles: number[]; tools: number[]; ras: number[];
      successes: number; total: number;
    }>();

    for (const ex of matched) {
      let agg = map.get(ex.strategy_id);
      if (!agg) { agg = { cycles: [], tools: [], ras: [], successes: 0, total: 0 }; map.set(ex.strategy_id, agg); }
      if (ex.actual.cycle_time_min != null) agg.cycles.push(ex.actual.cycle_time_min);
      if (ex.actual.tool_life_min  != null) agg.tools.push(ex.actual.tool_life_min);
      if (ex.actual.Ra_um          != null) agg.ras.push(ex.actual.Ra_um);
      if (ex.outcome === "success") agg.successes += 1;
      agg.total += 1;
    }

    const mean = (arr: number[]) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : NaN;

    // Compute normalisation bounds across all strategies
    const allCT  = [...map.values()].map(a => mean(a.cycles)).filter(v => !isNaN(v));
    const allTL  = [...map.values()].map(a => mean(a.tools)).filter(v => !isNaN(v));
    const allRa  = [...map.values()].map(a => mean(a.ras)).filter(v => !isNaN(v));
    const maxCT  = allCT.length > 0 ? Math.max(...allCT) : 1;
    const maxTL  = allTL.length > 0 ? Math.max(...allTL) : 1;
    const maxRa  = allRa.length > 0 ? Math.max(...allRa) : 1;

    const performers: TopPerformer[] = [];
    for (const [strategy_id, agg] of map.entries()) {
      const mCT = mean(agg.cycles);
      const mTL = mean(agg.tools);
      const mRa = mean(agg.ras);

      // Score components: 0-1 each (1 = best)
      const sCT = !isNaN(mCT) && maxCT > 0 ? Math.max(0, 1 - mCT / maxCT) : 0.5;
      const sTL = !isNaN(mTL) && maxTL > 0 ? Math.min(1, mTL / maxTL) : 0.5;
      const sRa = !isNaN(mRa) && maxRa > 0 ? Math.max(0, 1 - mRa / maxRa) : 0.5;
      // Weights: CT 35%, TL 35%, Ra 30%
      const composite = parseFloat((sCT * 35 + sTL * 35 + sRa * 30).toFixed(2));

      performers.push({
        strategy_id,
        execution_count: agg.total,
        mean_actual_cycle_time_min: !isNaN(mCT) ? parseFloat(mCT.toFixed(4)) : undefined,
        mean_actual_tool_life_min:  !isNaN(mTL) ? parseFloat(mTL.toFixed(4)) : undefined,
        mean_actual_Ra_um:          !isNaN(mRa) ? parseFloat(mRa.toFixed(4)) : undefined,
        success_rate: parseFloat((agg.successes / agg.total).toFixed(4)),
        composite_score: composite,
      });
    }

    performers.sort((a, b) => b.composite_score - a.composite_score);
    return performers.slice(0, limit);
  }

  // ── getWorstPredictions ───────────────────────────────────────────────────────

  /**
   * Return strategies where prediction accuracy is lowest (highest MAPE).
   * Useful for targeting which physics models need recalibration.
   *
   * @param limit - Max strategies to return (default 10)
   * @param min_samples - Minimum execution count to consider (default 3)
   */
  getWorstPredictions(limit = 10, min_samples = 3): Array<{
    strategy_id: string;
    overall_mape_pct: number;
    sample_count: number;
    worst_metric: string;
    worst_metric_mape_pct: number;
  }> {
    // Group executions by strategy
    const stratMap = new Map<string, StrategyExecution[]>();
    for (const ex of this.executions) {
      let arr = stratMap.get(ex.strategy_id);
      if (!arr) { arr = []; stratMap.set(ex.strategy_id, arr); }
      arr.push(ex);
    }

    const results: ReturnType<typeof this.getWorstPredictions> = [];

    for (const [strategy_id, execs] of stratMap.entries()) {
      if (execs.length < min_samples) continue;

      const acc = this.getAccuracy(strategy_id);
      if (acc.overall_mape_pct === 0 && acc.sample_count === 0) continue;

      // Find worst single metric
      const metricEntries = Object.entries(acc.metrics)
        .filter((kv): kv is [string, MetricAccuracy] => kv[1] !== undefined);

      let worst_metric = "none";
      let worst_metric_mape_pct = 0;
      for (const [name, m] of metricEntries) {
        if (m.mape_pct > worst_metric_mape_pct) {
          worst_metric_mape_pct = m.mape_pct;
          worst_metric = name;
        }
      }

      results.push({
        strategy_id,
        overall_mape_pct: acc.overall_mape_pct,
        sample_count: execs.length,
        worst_metric,
        worst_metric_mape_pct: parseFloat(worst_metric_mape_pct.toFixed(3)),
      });
    }

    results.sort((a, b) => b.overall_mape_pct - a.overall_mape_pct);
    return results.slice(0, limit);
  }

  // ── exportData ────────────────────────────────────────────────────────────────

  /**
   * Export all execution data as JSON for fleet sharing.
   * Use importData() on another machine to merge.
   */
  exportData(): StrategyPerfData {
    return {
      version: DATA_VERSION,
      exported_at: Date.now(),
      executions: [...this.executions],
    };
  }

  // ── importData ────────────────────────────────────────────────────────────────

  /**
   * Merge fleet data into local store.
   * Deduplicates by execution_id — existing records are not overwritten.
   *
   * @returns Summary of what was imported
   */
  importData(data: StrategyPerfData): {
    imported: number;
    skipped_duplicates: number;
    total_after: number;
  } {
    if (data.version !== DATA_VERSION) {
      return { imported: 0, skipped_duplicates: 0, total_after: this.executions.length };
    }

    const existingIds = new Set(this.executions.map(e => e.execution_id));
    let imported = 0;
    let skipped_duplicates = 0;

    for (const ex of data.executions) {
      if (existingIds.has(ex.execution_id)) {
        skipped_duplicates += 1;
      } else {
        this.executions.push(ex);
        existingIds.add(ex.execution_id);
        imported += 1;
      }
    }

    if (imported > 0) {
      this.saveToDisk();
    }

    return { imported, skipped_duplicates, total_after: this.executions.length };
  }

  // ── getStats ──────────────────────────────────────────────────────────────────

  /**
   * Return overall tracking statistics.
   */
  getStats(): TrackerStats {
    const total = this.executions.length;
    const successes = this.executions.filter(e => e.outcome === "success").length;
    const partials  = this.executions.filter(e => e.outcome === "partial").length;
    const failures  = this.executions.filter(e => e.outcome === "failure").length;

    const strategies = new Set(this.executions.map(e => e.strategy_id));
    const features   = new Set(this.executions.map(e => e.feature_type));
    const materials  = new Set(this.executions.map(e => e.material_iso));

    // Find most-tracked strategy
    const stratCount = new Map<string, number>();
    for (const ex of this.executions) {
      stratCount.set(ex.strategy_id, (stratCount.get(ex.strategy_id) ?? 0) + 1);
    }
    let mostTracked: string | null = null;
    let maxCount = 0;
    for (const [s, c] of stratCount.entries()) {
      if (c > maxCount) { maxCount = c; mostTracked = s; }
    }

    const timestamps = this.executions.map(e => e.timestamp);
    const acc = this.getAccuracy();

    return {
      total_executions: total,
      unique_strategies: strategies.size,
      unique_features: features.size,
      unique_materials: [...materials].sort(),
      success_rate: total > 0 ? parseFloat((successes / total).toFixed(4)) : 0,
      partial_rate: total > 0 ? parseFloat((partials  / total).toFixed(4)) : 0,
      failure_rate: total > 0 ? parseFloat((failures  / total).toFixed(4)) : 0,
      overall_mape_pct: acc.overall_mape_pct,
      most_tracked_strategy: mostTracked,
      oldest_record_ts: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newest_record_ts: timestamps.length > 0 ? Math.max(...timestamps) : null,
      persist_path: PERSIST_FILE,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  /** Filter executions matching all provided criteria */
  private filter(criteria: {
    strategy_id?: string;
    material_iso?: IsoGroup;
    feature_type?: string;
  }): StrategyExecution[] {
    return this.executions.filter(e => {
      if (criteria.strategy_id  && e.strategy_id  !== criteria.strategy_id)  return false;
      if (criteria.material_iso && e.material_iso  !== criteria.material_iso) return false;
      if (criteria.feature_type && e.feature_type  !== criteria.feature_type) return false;
      return true;
    });
  }

  /** Persist execution store to ~/.prism/strategy-performance.json */
  private saveToDisk(): void {
    try {
      if (!fs.existsSync(PERSIST_DIR)) {
        fs.mkdirSync(PERSIST_DIR, { recursive: true });
      }
      fs.writeFileSync(PERSIST_FILE, JSON.stringify(this.exportData(), null, 2), "utf-8");
    } catch {
      // Best-effort persistence — never throw
    }
  }

  /** Load persisted data on engine construction */
  private loadFromDisk(): void {
    try {
      if (fs.existsSync(PERSIST_FILE)) {
        const raw  = fs.readFileSync(PERSIST_FILE, "utf-8");
        const data = JSON.parse(raw) as StrategyPerfData;
        if (data.version === DATA_VERSION && Array.isArray(data.executions)) {
          this.executions  = data.executions;
          this.recordCount = data.executions.length;
        }
      }
    } catch {
      // Start fresh on corrupted file
    }
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const strategyPerformanceTrackerEngine = new StrategyPerformanceTrackerEngine();
export { StrategyPerformanceTrackerEngine };
