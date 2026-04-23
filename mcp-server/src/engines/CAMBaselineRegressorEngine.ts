/**
 * CAMBaselineRegressorEngine — U-CAM-ML-04
 * ==========================================
 *
 * Baseline supervised regressors for the JM Die feature-vector corpus.
 * Trains Bayesian ridge regression (closed-form, analytical uncertainty)
 * + gradient-boosted decision-stump ensemble (accuracy), cross-validated
 * on the customer-disjoint val set emitted by U-CAM-ML-03.
 *
 * Targets predicted from FeatureVector features:
 *   - spindle_rpm_midpoint: mid of estimated_spindle_range_rpm
 *   - feed_mm_min_midpoint: mid of estimated_feed_range_mm_min
 *
 * Features (X matrix rows):
 *   - Numeric: lines_of_code, tool_count, tool_changes
 *   - Boolean: has_m98_subroutine, has_g41_g42_cutter_comp,
 *              has_g83_peck_drill, has_g71_g72_lathe_cycle
 *   - Ops counts (7): ops_by_strategy.{profile,pocket,drill,thread,face,bore,other}
 *   - Categorical one-hot: cam_system, machine_type, g_code_dialect_hint
 *     (fit on the train set's observed values)
 *
 * Why both regressors:
 *   - Bayesian ridge: closed-form, gives per-prediction uncertainty (90% CI).
 *     Fallback when LoRA adapter (U-CAM-ML-05) has not converged.
 *   - Gradient boost: depth-1 stumps ensembled greedily; better accuracy on
 *     nonlinear features but no uncertainty estimate.
 *
 * This is a BASELINE. Full-corpus training (U-CAM-ML-02 scaled to all 25,817
 * core programs) will dramatically improve MAE. 100-program sample here is a
 * proof-of-pipeline; accuracy is not yet production-grade.
 *
 * Authored 2026-04-21 — CAM-EXHAUST-MS0 PHASE-ML-TRAIN U-CAM-ML-04.
 */

import * as fs from "node:fs";
import type { FeatureVector } from "./CAMFeatureExtractorEngine.js";
import type { CAMMLSplitResult } from "./CAMMLSplitEngine.js";

// ─── Types ──────────────────────────────────────────────────────────

export type TargetName = "spindle_rpm_midpoint" | "feed_mm_min_midpoint";

export interface BayesianRidgeModel {
  kind: "bayesian_ridge";
  target: TargetName;
  /** Fitted weights — length = n_features + 1 (bias term at index 0) */
  weights: number[];
  /** Posterior variance per weight (for uncertainty propagation) */
  weight_variances: number[];
  /** Regularization strength (alpha / sigma_noise^2) */
  alpha: number;
  /** Observed noise variance from training residuals */
  sigma2_noise: number;
  feature_names: string[];
  feature_stats: { mean: number[]; std: number[] };
  categorical_vocab: {
    cam_system: string[];
    machine_type: string[];
    g_code_dialect_hint: string[];
  };
}

export interface GradientBoostStump {
  feature_idx: number;
  threshold: number;
  left_value: number;
  right_value: number;
}

export interface GradientBoostModel {
  kind: "gradient_boost";
  target: TargetName;
  initial_prediction: number;
  stumps: GradientBoostStump[];
  learning_rate: number;
  feature_names: string[];
  categorical_vocab: BayesianRidgeModel["categorical_vocab"];
}

export type BaselineModel = BayesianRidgeModel | GradientBoostModel;

export interface PredictionResult {
  value: number;
  /** 90% CI half-width (ridge only; null for gradient boost) */
  ci_half_width: number | null;
  model_kind: BaselineModel["kind"];
  target: TargetName;
}

export interface EvaluationMetrics {
  n_samples: number;
  n_nan_skipped: number;
  mae: number;
  rmse: number;
  r2: number;
  /** % of predictions within the 90% CI (ridge only) */
  coverage_pct: number | null;
  target: TargetName;
  model_kind: BaselineModel["kind"];
}

export interface TrainResult {
  bayesian: Record<TargetName, BayesianRidgeModel>;
  gradient_boost: Record<TargetName, GradientBoostModel>;
  train_metrics: Record<TargetName, { bayesian: EvaluationMetrics; gradient_boost: EvaluationMetrics }>;
  val_metrics: Record<TargetName, { bayesian: EvaluationMetrics; gradient_boost: EvaluationMetrics }>;
  n_train: number;
  n_val: number;
  trained_at: string;
}

// ─── Engine ─────────────────────────────────────────────────────────

export class CAMBaselineRegressorEngine {
  readonly name = "CAMBaselineRegressorEngine";

  /** Train + evaluate from a CAMMLSplitResult in memory. */
  trainFromSplit(
    split: CAMMLSplitResult,
    opts: {
      targets?: TargetName[];
      alpha?: number;
      n_stumps?: number;
      learning_rate?: number;
    } = {}
  ): TrainResult {
    const targets: TargetName[] = opts.targets ?? ["spindle_rpm_midpoint", "feed_mm_min_midpoint"];
    const alpha = opts.alpha ?? 1.0;
    const n_stumps = opts.n_stumps ?? 30;
    const learning_rate = opts.learning_rate ?? 0.1;

    const vocab = this.buildCategoricalVocab(split.train);
    const featureNames = this.featureNames(vocab);

    const bayesian: Record<string, BayesianRidgeModel> = {};
    const gradient_boost: Record<string, GradientBoostModel> = {};
    const train_metrics: Record<string, { bayesian: EvaluationMetrics; gradient_boost: EvaluationMetrics }> = {};
    const val_metrics: Record<string, { bayesian: EvaluationMetrics; gradient_boost: EvaluationMetrics }> = {};

    for (const target of targets) {
      const { X: Xtr, y: ytr } = this.featurize(split.train, target, vocab);
      const { X: Xval, y: yval } = this.featurize(split.val, target, vocab);

      if (Xtr.length === 0) {
        // No trainable examples for this target — emit degenerate models
        bayesian[target] = this.degenerateBayesian(target, featureNames, vocab);
        gradient_boost[target] = this.degenerateGradientBoost(target, featureNames, vocab);
        train_metrics[target] = {
          bayesian: this.degenerateMetrics(target, "bayesian_ridge"),
          gradient_boost: this.degenerateMetrics(target, "gradient_boost"),
        };
        val_metrics[target] = {
          bayesian: this.degenerateMetrics(target, "bayesian_ridge"),
          gradient_boost: this.degenerateMetrics(target, "gradient_boost"),
        };
        continue;
      }

      const bridge = this.fitBayesianRidge(Xtr, ytr, alpha, featureNames, vocab, target);
      const gb = this.fitGradientBoost(Xtr, ytr, n_stumps, learning_rate, featureNames, vocab, target);

      bayesian[target] = bridge;
      gradient_boost[target] = gb;

      train_metrics[target] = {
        bayesian: this.evaluateSet(bridge, Xtr, ytr),
        gradient_boost: this.evaluateSet(gb, Xtr, ytr),
      };
      val_metrics[target] = {
        bayesian: this.evaluateSet(bridge, Xval, yval),
        gradient_boost: this.evaluateSet(gb, Xval, yval),
      };
    }

    return {
      bayesian: bayesian as Record<TargetName, BayesianRidgeModel>,
      gradient_boost: gradient_boost as Record<TargetName, GradientBoostModel>,
      train_metrics: train_metrics as Record<TargetName, { bayesian: EvaluationMetrics; gradient_boost: EvaluationMetrics }>,
      val_metrics: val_metrics as Record<TargetName, { bayesian: EvaluationMetrics; gradient_boost: EvaluationMetrics }>,
      n_train: split.train.length,
      n_val: split.val.length,
      trained_at: new Date().toISOString(),
    };
  }

  /** Train from a splits JSON file on disk + optionally save models. */
  trainFromFiles(
    splitsPath: string = "H:/PRISM/mcp-server/data/state/JM_DIE_ML_SPLITS.json",
    outDir: string = "H:/PRISM/mcp-server/data/state/models/cam-baseline"
  ): TrainResult {
    const split: CAMMLSplitResult = JSON.parse(fs.readFileSync(splitsPath, "utf-8"));
    const result = this.trainFromSplit(split);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(`${outDir}/bayesian.json`, JSON.stringify(result.bayesian, null, 2));
    fs.writeFileSync(`${outDir}/gradient_boost.json`, JSON.stringify(result.gradient_boost, null, 2));
    fs.writeFileSync(`${outDir}/metrics.json`, JSON.stringify({
      train: result.train_metrics, val: result.val_metrics,
      n_train: result.n_train, n_val: result.n_val,
      trained_at: result.trained_at,
    }, null, 2));
    return result;
  }

  /** Predict a single target for a new feature vector. */
  predict(model: BaselineModel, vector: FeatureVector): PredictionResult {
    const x = this.vectorizeOne(vector, model.categorical_vocab);
    if (model.kind === "bayesian_ridge") {
      const { mean, ciHalf } = this.predictBayesian(model, x);
      return { value: mean, ci_half_width: ciHalf, model_kind: "bayesian_ridge", target: model.target };
    }
    const value = this.predictGradientBoost(model, x);
    return { value, ci_half_width: null, model_kind: "gradient_boost", target: model.target };
  }

  // ─── Featurization ────────────────────────────────────────────────

  private buildCategoricalVocab(vectors: FeatureVector[]): BayesianRidgeModel["categorical_vocab"] {
    const cam_system = new Set<string>();
    const machine_type = new Set<string>();
    const g_code_dialect_hint = new Set<string>();
    for (const v of vectors) {
      cam_system.add(v.cam_system);
      machine_type.add(v.machine_type);
      g_code_dialect_hint.add(v.g_code_dialect_hint);
    }
    return {
      cam_system: [...cam_system].sort(),
      machine_type: [...machine_type].sort(),
      g_code_dialect_hint: [...g_code_dialect_hint].sort(),
    };
  }

  private featureNames(vocab: BayesianRidgeModel["categorical_vocab"]): string[] {
    return [
      "bias",
      "lines_of_code", "tool_count", "tool_changes",
      "has_m98_subroutine", "has_g41_g42_cutter_comp", "has_g83_peck_drill", "has_g71_g72_lathe_cycle",
      "ops_profile", "ops_pocket", "ops_drill", "ops_thread", "ops_face", "ops_bore", "ops_other",
      ...vocab.cam_system.map((v) => `cam_system::${v}`),
      ...vocab.machine_type.map((v) => `machine_type::${v}`),
      ...vocab.g_code_dialect_hint.map((v) => `dialect::${v}`),
    ];
  }

  private vectorizeOne(v: FeatureVector, vocab: BayesianRidgeModel["categorical_vocab"]): number[] {
    const row: number[] = [1]; // bias
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

  private targetOf(v: FeatureVector, target: TargetName): number {
    if (target === "spindle_rpm_midpoint") {
      const [lo, hi] = v.estimated_spindle_range_rpm;
      return (lo + hi) / 2;
    }
    const [lo, hi] = v.estimated_feed_range_mm_min;
    return (lo + hi) / 2;
  }

  private featurize(
    vectors: FeatureVector[],
    target: TargetName,
    vocab: BayesianRidgeModel["categorical_vocab"]
  ): { X: number[][]; y: number[] } {
    const X: number[][] = [];
    const y: number[] = [];
    for (const v of vectors) {
      const t = this.targetOf(v, target);
      if (!Number.isFinite(t) || t <= 0) continue; // skip zero/invalid targets
      X.push(this.vectorizeOne(v, vocab));
      y.push(t);
    }
    return { X, y };
  }

  // ─── Bayesian ridge (closed-form) ─────────────────────────────────

  private fitBayesianRidge(
    X: number[][], y: number[],
    alpha: number,
    featureNames: string[],
    vocab: BayesianRidgeModel["categorical_vocab"],
    target: TargetName
  ): BayesianRidgeModel {
    // Ridge: w = (X^T X + alpha I)^-1 X^T y
    const n = X.length;
    const d = X[0].length;

    // Standardize numeric columns (first 14, excluding bias at 0)
    const { mean, std } = this.computeStats(X);
    const Xs = X.map((r) => this.standardize(r, mean, std));

    // Build XtX + alpha I and Xt y
    const XtX: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
    const Xty: number[] = new Array(d).fill(0);
    for (let i = 0; i < n; i++) {
      for (let a = 0; a < d; a++) {
        Xty[a] += Xs[i][a] * y[i];
        for (let b = 0; b < d; b++) XtX[a][b] += Xs[i][a] * Xs[i][b];
      }
    }
    for (let a = 0; a < d; a++) {
      if (a === 0) continue; // don't regularize bias
      XtX[a][a] += alpha;
    }

    // Solve via Gauss-Jordan (small d, fine for baseline)
    const Ainv = this.invert(XtX);
    const weights = this.matVec(Ainv, Xty);

    // Posterior: variances along diagonal of sigma^2 * Ainv
    const predictions = Xs.map((r) => this.dot(weights, r));
    const residuals = y.map((yi, i) => yi - predictions[i]);
    const sigma2 = residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, n - d);
    const weight_variances = new Array(d);
    for (let a = 0; a < d; a++) weight_variances[a] = sigma2 * Math.max(Ainv[a][a], 0);

    return {
      kind: "bayesian_ridge",
      target,
      weights,
      weight_variances,
      alpha,
      sigma2_noise: sigma2,
      feature_names: featureNames,
      feature_stats: { mean, std },
      categorical_vocab: vocab,
    };
  }

  private predictBayesian(model: BayesianRidgeModel, xRaw: number[]): { mean: number; ciHalf: number } {
    const x = this.standardize(xRaw, model.feature_stats.mean, model.feature_stats.std);
    const mean = this.dot(model.weights, x);
    // Prediction variance ≈ x^T diag(weight_variances) x + sigma2_noise (diagonal approximation)
    let predVar = model.sigma2_noise;
    for (let i = 0; i < x.length; i++) predVar += x[i] * x[i] * model.weight_variances[i];
    const ciHalf = 1.645 * Math.sqrt(Math.max(predVar, 0)); // 90% CI
    return { mean, ciHalf };
  }

  // ─── Gradient-boosted stumps ──────────────────────────────────────

  private fitGradientBoost(
    X: number[][], y: number[],
    n_stumps: number, learning_rate: number,
    featureNames: string[],
    vocab: BayesianRidgeModel["categorical_vocab"],
    target: TargetName
  ): GradientBoostModel {
    const n = X.length;
    const d = X[0].length;
    const initial = y.reduce((s, v) => s + v, 0) / Math.max(1, n);
    const residuals = y.slice().map((v) => v - initial);
    const stumps: GradientBoostStump[] = [];

    for (let k = 0; k < n_stumps; k++) {
      // Find best stump (best feature + threshold)
      let best = { feature: 0, threshold: 0, gain: -Infinity, left: 0, right: 0 };
      for (let f = 1; f < d; f++) { // skip bias
        const values = X.map((r) => r[f]);
        const uniq = [...new Set(values)].sort((a, b) => a - b);
        if (uniq.length < 2) continue;
        for (let t = 0; t < uniq.length - 1; t++) {
          const threshold = (uniq[t] + uniq[t + 1]) / 2;
          let lSum = 0, rSum = 0, lCount = 0, rCount = 0;
          for (let i = 0; i < n; i++) {
            if (X[i][f] <= threshold) { lSum += residuals[i]; lCount++; }
            else { rSum += residuals[i]; rCount++; }
          }
          if (lCount === 0 || rCount === 0) continue;
          const lMean = lSum / lCount, rMean = rSum / rCount;
          const gain = (lSum * lSum) / lCount + (rSum * rSum) / rCount;
          if (gain > best.gain) {
            best = { feature: f, threshold, gain, left: lMean, right: rMean };
          }
        }
      }
      if (best.gain === -Infinity) break;

      stumps.push({
        feature_idx: best.feature, threshold: best.threshold,
        left_value: best.left, right_value: best.right,
      });

      // Update residuals
      for (let i = 0; i < n; i++) {
        const delta = (X[i][best.feature] <= best.threshold) ? best.left : best.right;
        residuals[i] -= learning_rate * delta;
      }
    }

    return {
      kind: "gradient_boost",
      target,
      initial_prediction: initial,
      stumps,
      learning_rate,
      feature_names: featureNames,
      categorical_vocab: vocab,
    };
  }

  private predictGradientBoost(model: GradientBoostModel, x: number[]): number {
    let pred = model.initial_prediction;
    for (const stump of model.stumps) {
      const v = x[stump.feature_idx];
      pred += model.learning_rate * (v <= stump.threshold ? stump.left_value : stump.right_value);
    }
    return pred;
  }

  // ─── Evaluation ───────────────────────────────────────────────────

  private evaluateSet(model: BaselineModel, X: number[][], y: number[]): EvaluationMetrics {
    if (X.length === 0) return this.degenerateMetrics(model.target, model.kind);
    const preds: number[] = [];
    const ciHalves: number[] = [];
    for (let i = 0; i < X.length; i++) {
      if (model.kind === "bayesian_ridge") {
        const { mean, ciHalf } = this.predictBayesian(model, X[i]);
        preds.push(mean);
        ciHalves.push(ciHalf);
      } else {
        preds.push(this.predictGradientBoost(model, X[i]));
      }
    }
    let absSum = 0, sqSum = 0, ySum = 0, ySqSum = 0, covered = 0, nanSkipped = 0;
    for (let i = 0; i < preds.length; i++) {
      if (!Number.isFinite(preds[i])) { nanSkipped++; continue; }
      const err = y[i] - preds[i];
      absSum += Math.abs(err);
      sqSum += err * err;
      ySum += y[i];
      ySqSum += y[i] * y[i];
      if (model.kind === "bayesian_ridge" && Math.abs(err) <= ciHalves[i]) covered++;
    }
    const n = preds.length - nanSkipped;
    const mae = n > 0 ? absSum / n : NaN;
    const rmse = n > 0 ? Math.sqrt(sqSum / n) : NaN;
    const yMean = n > 0 ? ySum / n : 0;
    const ssTot = n > 0 ? ySqSum - n * yMean * yMean : 0;
    const r2 = ssTot > 0 ? 1 - sqSum / ssTot : 0;
    const coverage = model.kind === "bayesian_ridge" && n > 0 ? (covered / n) * 100 : null;
    return {
      n_samples: n, n_nan_skipped: nanSkipped, mae, rmse, r2,
      coverage_pct: coverage, target: model.target, model_kind: model.kind,
    };
  }

  // ─── Math helpers ─────────────────────────────────────────────────

  private computeStats(X: number[][]): { mean: number[]; std: number[] } {
    const d = X[0].length;
    const mean = new Array(d).fill(0);
    const std = new Array(d).fill(1);
    if (X.length === 0) return { mean, std };
    for (const row of X) for (let i = 0; i < d; i++) mean[i] += row[i];
    for (let i = 0; i < d; i++) mean[i] /= X.length;
    for (const row of X) for (let i = 0; i < d; i++) std[i] += (row[i] - mean[i]) ** 2;
    for (let i = 0; i < d; i++) {
      std[i] = Math.sqrt(std[i] / Math.max(1, X.length - 1));
      if (!Number.isFinite(std[i]) || std[i] === 0) std[i] = 1; // avoid div-by-zero
    }
    // Don't standardize bias (column 0)
    mean[0] = 0; std[0] = 1;
    return { mean, std };
  }

  private standardize(row: number[], mean: number[], std: number[]): number[] {
    return row.map((v, i) => (v - mean[i]) / std[i]);
  }

  private dot(a: number[], b: number[]): number {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  private matVec(A: number[][], x: number[]): number[] {
    return A.map((row) => this.dot(row, x));
  }

  private invert(A: number[][]): number[][] {
    const n = A.length;
    const M = A.map((row, i) => [...row, ...new Array(n).fill(0).map((_, j) => (i === j ? 1 : 0))]);
    for (let col = 0; col < n; col++) {
      // Pivot
      let pivot = col;
      for (let r = col + 1; r < n; r++) {
        if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
      }
      if (Math.abs(M[pivot][col]) < 1e-12) {
        // Singular — add tiny regularization and continue
        M[col][col] += 1e-8;
        pivot = col;
      }
      [M[col], M[pivot]] = [M[pivot], M[col]];
      const p = M[col][col];
      for (let c = 0; c < 2 * n; c++) M[col][c] /= p;
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const factor = M[r][col];
        if (factor === 0) continue;
        for (let c = 0; c < 2 * n; c++) M[r][c] -= factor * M[col][c];
      }
    }
    return M.map((row) => row.slice(n));
  }

  // ─── Degenerate fallbacks (empty training set) ────────────────────

  private degenerateBayesian(
    target: TargetName, featureNames: string[], vocab: BayesianRidgeModel["categorical_vocab"]
  ): BayesianRidgeModel {
    const d = featureNames.length;
    return {
      kind: "bayesian_ridge", target,
      weights: new Array(d).fill(0),
      weight_variances: new Array(d).fill(0),
      alpha: 1, sigma2_noise: 0,
      feature_names: featureNames,
      feature_stats: { mean: new Array(d).fill(0), std: new Array(d).fill(1) },
      categorical_vocab: vocab,
    };
  }

  private degenerateGradientBoost(
    target: TargetName, featureNames: string[], vocab: BayesianRidgeModel["categorical_vocab"]
  ): GradientBoostModel {
    return {
      kind: "gradient_boost", target,
      initial_prediction: 0, stumps: [], learning_rate: 0.1,
      feature_names: featureNames, categorical_vocab: vocab,
    };
  }

  private degenerateMetrics(target: TargetName, kind: BaselineModel["kind"]): EvaluationMetrics {
    return {
      n_samples: 0, n_nan_skipped: 0, mae: NaN, rmse: NaN, r2: 0,
      coverage_pct: kind === "bayesian_ridge" ? null : null,
      target, model_kind: kind,
    };
  }
}

export const camBaselineRegressorEngine = new CAMBaselineRegressorEngine();
