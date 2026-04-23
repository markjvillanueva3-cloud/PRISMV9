/**
 * CAMMLDriftMonitorEngine — U-CAM-ML-07
 * ======================================
 *
 * Continuous evaluation + drift detection for the ML training pipeline.
 *
 * Re-evaluates the baseline + LoRA models against the held-out test set
 * (emitted by U-CAM-ML-03 customer-disjoint split) and compares MAE to the
 * previous run. If MAE degrades more than a configurable threshold
 * (default 5%) week-over-week, emits a drift_alert.
 *
 * Writes append-only to `data/state/CAM_ML_DRIFT_LOG.jsonl` so a nightly
 * cron can run this and produce a time-series dashboard without needing
 * a database. Each line is one DriftReport entry.
 *
 * Why append-only JSONL vs. rewriting a single file: drift is a time-series
 * observation — we never want to lose history. A JSONL file lets `tail -n`
 * give the latest state and `wc -l` gives the run count, while the full file
 * feeds a Grafana-style plot.
 *
 * Authored 2026-04-21 — CAM-EXHAUST-MS0 PHASE-ML-TRAIN U-CAM-ML-07.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { FeatureVector } from "./CAMFeatureExtractorEngine.js";
import type { CAMMLSplitResult } from "./CAMMLSplitEngine.js";
import type {
  BayesianRidgeModel,
  TargetName,
} from "./CAMBaselineRegressorEngine.js";
import type {
  LoRAAdapter,
  Priority4CAM,
} from "./CAMLoRAAdapterTrainerEngine.js";

// ─── Types ──────────────────────────────────────────────────────────

export type AlertLevel = "ok" | "warn" | "degraded" | "critical";

export interface ModelEvalRecord {
  target: TargetName;
  model_kind: "bayesian" | "gradient_boost" | "lora";
  cam_slug?: Priority4CAM;
  n_samples: number;
  mae: number;
  rmse: number;
}

export interface DriftAlert {
  target: TargetName;
  model_kind: ModelEvalRecord["model_kind"];
  cam_slug?: Priority4CAM;
  previous_mae: number;
  current_mae: number;
  delta_pct: number;
  level: AlertLevel;
  message: string;
}

export interface DriftReport {
  schemaVersion: 1;
  run_id: string;
  run_at: string;
  test_set_size: number;
  test_set_customers: number;
  evals: ModelEvalRecord[];
  alerts: DriftAlert[];
  summary: {
    n_evals: number;
    n_alerts: number;
    max_delta_pct: number;
    worst_alert_level: AlertLevel;
  };
}

export interface DriftMonitorOptions {
  splitsPath?: string;
  baselinePath?: string;
  loraDir?: string;
  logPath?: string;
  /** Percent MAE increase that triggers a warn-level alert (default 5) */
  warn_threshold_pct?: number;
  /** Percent MAE increase that triggers a degraded-level alert (default 15) */
  degraded_threshold_pct?: number;
  /** Percent MAE increase that triggers a critical-level alert (default 30) */
  critical_threshold_pct?: number;
}

// ─── Engine ─────────────────────────────────────────────────────────

const ALERT_ORDER: AlertLevel[] = ["ok", "warn", "degraded", "critical"];

export class CAMMLDriftMonitorEngine {
  readonly name = "CAMMLDriftMonitorEngine";

  /** Run a single evaluation pass + emit a DriftReport appended to the log. */
  runOnce(opts: DriftMonitorOptions = {}): DriftReport {
    const splitsPath =
      opts.splitsPath ?? "H:/PRISM/mcp-server/data/state/JM_DIE_ML_SPLITS.json";
    const baselinePath =
      opts.baselinePath ??
      "H:/PRISM/mcp-server/data/state/models/cam-baseline/bayesian.json";
    const loraDir =
      opts.loraDir ?? "H:/PRISM/mcp-server/data/state/models/cam-lora";
    const logPath =
      opts.logPath ?? "H:/PRISM/mcp-server/data/state/CAM_ML_DRIFT_LOG.jsonl";
    const warnThresh = opts.warn_threshold_pct ?? 5;
    const degradedThresh = opts.degraded_threshold_pct ?? 15;
    const criticalThresh = opts.critical_threshold_pct ?? 30;

    const evals: ModelEvalRecord[] = [];

    // Load split + baseline (required); lora is optional per-CAM
    const split = this.safeLoadJson<CAMMLSplitResult>(splitsPath);
    const baselineModels = this.safeLoadJson<Record<TargetName, BayesianRidgeModel>>(baselinePath);

    const testSet = split?.test ?? [];
    const testCustomers = new Set(testSet.map((v) => v.customer)).size;

    if (split && baselineModels) {
      for (const target of ["spindle_rpm_midpoint", "feed_mm_min_midpoint"] as TargetName[]) {
        const base = baselineModels[target];
        if (!base) continue;

        // Baseline Bayesian MAE on full test set
        const baselineMetrics = this.evalBaseline(base, testSet, target);
        evals.push({ target, model_kind: "bayesian", ...baselineMetrics });

        // Per-CAM LoRA adapters
        for (const cam of ["mastercam", "hypermill", "fusion360", "inventor-hsm"] as Priority4CAM[]) {
          const adapterPath = path.join(loraDir, cam, "adapter.json");
          if (!fs.existsSync(adapterPath)) continue;
          try {
            const raw = fs.readFileSync(adapterPath, "utf-8");
            const parsed = JSON.parse(raw) as Record<string, LoRAAdapter | null>;
            const adapter = parsed?.[target];
            if (!adapter) continue;
            const camTest = testSet.filter((v) => v.cam_system === cam);
            if (camTest.length === 0) continue;
            const loraMetrics = this.evalLora(adapter, base, camTest, target);
            evals.push({ target, model_kind: "lora", cam_slug: cam, ...loraMetrics });
          } catch {
            // ignore malformed adapters; continue monitoring the rest
          }
        }
      }
    }

    // Compare each eval to the most recent matching entry in the log
    const previous = this.readPreviousLog(logPath);
    const alerts: DriftAlert[] = [];
    for (const e of evals) {
      const prev = this.findMostRecentMatch(previous, e);
      if (!prev || !Number.isFinite(prev.mae) || !Number.isFinite(e.mae) || prev.mae === 0) continue;
      const delta = ((e.mae - prev.mae) / prev.mae) * 100;
      if (delta <= warnThresh) continue;
      let level: AlertLevel = "warn";
      if (delta >= criticalThresh) level = "critical";
      else if (delta >= degradedThresh) level = "degraded";
      alerts.push({
        target: e.target,
        model_kind: e.model_kind,
        cam_slug: e.cam_slug,
        previous_mae: prev.mae,
        current_mae: e.mae,
        delta_pct: delta,
        level,
        message: `MAE increased ${delta.toFixed(1)}% for ${e.model_kind}${e.cam_slug ? `/${e.cam_slug}` : ""}/${e.target}`,
      });
    }

    const maxDelta = alerts.reduce((max, a) => (a.delta_pct > max ? a.delta_pct : max), 0);
    const worstLevel = alerts.reduce<AlertLevel>(
      (worst, a) => (ALERT_ORDER.indexOf(a.level) > ALERT_ORDER.indexOf(worst) ? a.level : worst),
      "ok"
    );

    const report: DriftReport = {
      schemaVersion: 1,
      run_id: this.generateRunId(),
      run_at: new Date().toISOString(),
      test_set_size: testSet.length,
      test_set_customers: testCustomers,
      evals,
      alerts,
      summary: {
        n_evals: evals.length,
        n_alerts: alerts.length,
        max_delta_pct: maxDelta,
        worst_alert_level: worstLevel,
      },
    };

    this.appendLog(logPath, report);
    return report;
  }

  /** Read the drift log as an array of reports (newest last). */
  readLog(logPath: string = "H:/PRISM/mcp-server/data/state/CAM_ML_DRIFT_LOG.jsonl"): DriftReport[] {
    if (!fs.existsSync(logPath)) return [];
    const raw = fs.readFileSync(logPath, "utf-8");
    const out: DriftReport[] = [];
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        out.push(JSON.parse(trimmed) as DriftReport);
      } catch {
        // skip malformed lines — drift monitor is robust to partial writes
      }
    }
    return out;
  }

  // ─── Private ─────────────────────────────────────────────────────

  private evalBaseline(
    model: BayesianRidgeModel,
    vectors: FeatureVector[],
    target: TargetName
  ): { n_samples: number; mae: number; rmse: number } {
    let absSum = 0, sqSum = 0, n = 0;
    for (const v of vectors) {
      const t = this.targetOf(v, target);
      if (!Number.isFinite(t) || t <= 0) continue;
      const x = this.vectorize(v, model);
      const xs = this.standardize(x, model.feature_stats.mean, model.feature_stats.std);
      const pred = this.dot(model.weights, xs);
      if (!Number.isFinite(pred)) continue;
      const err = t - pred;
      absSum += Math.abs(err);
      sqSum += err * err;
      n++;
    }
    return {
      n_samples: n,
      mae: n > 0 ? absSum / n : NaN,
      rmse: n > 0 ? Math.sqrt(sqSum / n) : NaN,
    };
  }

  private evalLora(
    adapter: LoRAAdapter,
    baseline: BayesianRidgeModel,
    vectors: FeatureVector[],
    target: TargetName
  ): { n_samples: number; mae: number; rmse: number } {
    const scale = adapter.config.alpha / adapter.config.rank;
    let absSum = 0, sqSum = 0, n = 0;
    for (const v of vectors) {
      const t = this.targetOf(v, target);
      if (!Number.isFinite(t) || t <= 0) continue;
      const x = this.vectorize(v, baseline);
      const xs = this.standardize(x, baseline.feature_stats.mean, baseline.feature_stats.std);
      const bp = this.dot(baseline.weights, xs);
      // Adapter delta — A·x then B·Ax scaled
      let delta = 0;
      for (let i = 0; i < adapter.A.length; i++) {
        let ax = 0;
        for (let j = 0; j < adapter.A[i].length; j++) ax += adapter.A[i][j] * xs[j];
        delta += adapter.B[i] * ax;
      }
      delta *= scale;
      const pred = bp + delta;
      if (!Number.isFinite(pred)) continue;
      const err = t - pred;
      absSum += Math.abs(err);
      sqSum += err * err;
      n++;
    }
    return {
      n_samples: n,
      mae: n > 0 ? absSum / n : NaN,
      rmse: n > 0 ? Math.sqrt(sqSum / n) : NaN,
    };
  }

  private targetOf(v: FeatureVector, target: TargetName): number {
    if (target === "spindle_rpm_midpoint") {
      const [lo, hi] = v.estimated_spindle_range_rpm;
      return (lo + hi) / 2;
    }
    const [lo, hi] = v.estimated_feed_range_mm_min;
    return (lo + hi) / 2;
  }

  private vectorize(v: FeatureVector, model: BayesianRidgeModel): number[] {
    const vocab = model.categorical_vocab;
    const row: number[] = [1];
    row.push(v.lines_of_code, v.tool_count, v.tool_changes);
    row.push(
      v.has_m98_subroutine ? 1 : 0,
      v.has_g41_g42_cutter_comp ? 1 : 0,
      v.has_g83_peck_drill ? 1 : 0,
      v.has_g71_g72_lathe_cycle ? 1 : 0
    );
    row.push(
      v.ops_by_strategy.profile, v.ops_by_strategy.pocket, v.ops_by_strategy.drill,
      v.ops_by_strategy.thread, v.ops_by_strategy.face, v.ops_by_strategy.bore,
      v.ops_by_strategy.other
    );
    for (const cat of vocab.cam_system) row.push(v.cam_system === cat ? 1 : 0);
    for (const cat of vocab.machine_type) row.push(v.machine_type === cat ? 1 : 0);
    for (const cat of vocab.g_code_dialect_hint) row.push(v.g_code_dialect_hint === cat ? 1 : 0);
    return row;
  }

  private standardize(row: number[], mean: number[], std: number[]): number[] {
    return row.map((v, i) => (v - mean[i]) / std[i]);
  }

  private dot(a: number[], b: number[]): number {
    let s = 0;
    for (let i = 0; i < a.length && i < b.length; i++) s += a[i] * b[i];
    return s;
  }

  private safeLoadJson<T>(p: string): T | null {
    try {
      return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
    } catch {
      return null;
    }
  }

  private readPreviousLog(logPath: string): ModelEvalRecord[] {
    const log = this.readLog(logPath);
    if (log.length === 0) return [];
    return log[log.length - 1].evals;
  }

  private findMostRecentMatch(prev: ModelEvalRecord[], e: ModelEvalRecord): ModelEvalRecord | null {
    return (
      prev.find(
        (p) => p.target === e.target && p.model_kind === e.model_kind && p.cam_slug === e.cam_slug
      ) ?? null
    );
  }

  private appendLog(logPath: string, report: DriftReport): void {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, JSON.stringify(report) + "\n");
  }

  private generateRunId(): string {
    return `drift-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }
}

export const camMLDriftMonitorEngine = new CAMMLDriftMonitorEngine();
