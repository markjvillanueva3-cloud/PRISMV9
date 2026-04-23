/**
 * CAMLoRAAdapterTrainerEngine — U-CAM-ML-05
 * ===========================================
 *
 * Per-CAM LoRA (Low-Rank Adaptation) adapters that correct the U-CAM-ML-04
 * baseline Bayesian regressor with CAM-specific deltas.
 *
 * Architecture:
 *   y_hat = baseline_pred(x) + (B · A · x_std) · (alpha / rank)
 *
 * Where:
 *   - baseline_pred(x): frozen Bayesian ridge prediction from U-CAM-ML-04
 *   - A: r × d matrix (low-rank down-projection), initialized N(0, 0.01)
 *   - B: 1 × r matrix (up-projection to scalar target), initialized 0
 *   - r = rank (default 4 per roadmap convention)
 *   - alpha = scaling (default 8 → alpha/rank = 2)
 *
 * Training: batched gradient descent on per-CAM residuals:
 *   r_i = y_i - baseline_pred(x_i)
 *   loss = (1/N) Σ (r_i - Δ(x_i))^2
 *
 * Because B starts at zero, Δ(x)=0 at the start — the adapter cannot make
 * predictions worse than baseline until it learns something useful.
 *
 * This trains FOUR priority-4 CAM adapters (mastercam, hypermill, fusion360,
 * inventor-hsm). SolidCAM is deferred (post-final-phase per CAM-EXHAUST
 * roadmap U-CAM-FINAL-10).
 *
 * Authored 2026-04-21 — CAM-EXHAUST-MS0 PHASE-ML-TRAIN U-CAM-ML-05.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { FeatureVector } from "./CAMFeatureExtractorEngine.js";
import type { CAMMLSplitResult } from "./CAMMLSplitEngine.js";
import {
  CAMBaselineRegressorEngine,
  camBaselineRegressorEngine,
  type BayesianRidgeModel,
  type TargetName,
} from "./CAMBaselineRegressorEngine.js";

// ─── Types ──────────────────────────────────────────────────────────

export type Priority4CAM = "mastercam" | "hypermill" | "fusion360" | "inventor-hsm";

export interface LoRAConfig {
  rank: number;        // r
  alpha: number;       // scaling
  learning_rate: number;
  n_epochs: number;
  batch_size: number;
  weight_decay: number; // L2 on A and B
  seed: number;
}

export const DEFAULT_LORA_CONFIG: LoRAConfig = {
  rank: 4,
  alpha: 8,
  learning_rate: 0.005,
  n_epochs: 200,
  batch_size: 16,
  weight_decay: 0.001,
  seed: 42,
};

export interface LoRAAdapter {
  cam_slug: Priority4CAM;
  target: TargetName;
  config: LoRAConfig;
  /** A: rank × d_in */
  A: number[][];
  /** B: 1 × rank (transposed to keep JSON compact) */
  B: number[];
  d_in: number;
  trained_on: number;       // count of train samples
  final_train_loss: number;
  improvement_over_baseline_mae_pct: number;
  trained_at: string;
}

export interface AdapterEvalMetrics {
  cam_slug: Priority4CAM;
  target: TargetName;
  n_val: number;
  baseline_mae: number;
  adapter_mae: number;
  improvement_pct: number;
  notes: string;
}

export interface TrainAllResult {
  adapters: Record<Priority4CAM, Record<TargetName, LoRAAdapter | null>>;
  eval: Record<Priority4CAM, Record<TargetName, AdapterEvalMetrics | null>>;
  trained_at: string;
  skipped: Array<{ cam: Priority4CAM; target: TargetName; reason: string }>;
}

// ─── Engine ─────────────────────────────────────────────────────────

const PRIORITY_4: ReadonlyArray<Priority4CAM> = [
  "mastercam", "hypermill", "fusion360", "inventor-hsm",
];

export class CAMLoRAAdapterTrainerEngine {
  readonly name = "CAMLoRAAdapterTrainerEngine";

  constructor(
    private baselineEngine: CAMBaselineRegressorEngine = camBaselineRegressorEngine
  ) {}

  /** Train per-CAM adapters from in-memory split + baseline models. */
  trainAll(
    split: CAMMLSplitResult,
    baselineModels: Record<TargetName, BayesianRidgeModel>,
    config: LoRAConfig = DEFAULT_LORA_CONFIG
  ): TrainAllResult {
    const adapters: Record<string, Record<string, LoRAAdapter | null>> = {};
    const evalResults: Record<string, Record<string, AdapterEvalMetrics | null>> = {};
    const skipped: TrainAllResult["skipped"] = [];
    const targets: TargetName[] = ["spindle_rpm_midpoint", "feed_mm_min_midpoint"];

    for (const cam of PRIORITY_4) {
      adapters[cam] = {};
      evalResults[cam] = {};
      for (const target of targets) {
        const base = baselineModels[target];
        if (!base) {
          adapters[cam][target] = null;
          evalResults[cam][target] = null;
          skipped.push({ cam, target, reason: `no baseline model for ${target}` });
          continue;
        }
        const trainCam = split.train.filter((v) => v.cam_system === cam);
        const valCam = split.val.filter((v) => v.cam_system === cam);

        const { X: Xtr, y: ytr } = this.featurize(trainCam, target, base);
        const { X: Xval, y: yval } = this.featurize(valCam, target, base);

        if (Xtr.length < 3) {
          adapters[cam][target] = null;
          evalResults[cam][target] = null;
          skipped.push({
            cam, target,
            reason: `only ${Xtr.length} non-zero training samples for ${cam}/${target} — need ≥3`,
          });
          continue;
        }

        const adapter = this.fitAdapter(cam, target, Xtr, ytr, base, config);
        adapters[cam][target] = adapter;
        evalResults[cam][target] = this.evalAdapter(adapter, base, Xval, yval);
      }
    }

    return {
      adapters: adapters as TrainAllResult["adapters"],
      eval: evalResults as TrainAllResult["eval"],
      trained_at: new Date().toISOString(),
      skipped,
    };
  }

  /** Train + persist adapters from files. */
  trainFromFiles(
    splitsPath: string = "H:/PRISM/mcp-server/data/state/JM_DIE_ML_SPLITS.json",
    baselineBayesianPath: string = "H:/PRISM/mcp-server/data/state/models/cam-baseline/bayesian.json",
    outDir: string = "H:/PRISM/mcp-server/data/state/models/cam-lora",
    config: LoRAConfig = DEFAULT_LORA_CONFIG
  ): TrainAllResult {
    const split: CAMMLSplitResult = JSON.parse(fs.readFileSync(splitsPath, "utf-8"));
    const baseline: Record<TargetName, BayesianRidgeModel> = JSON.parse(
      fs.readFileSync(baselineBayesianPath, "utf-8")
    );
    const result = this.trainAll(split, baseline, config);
    for (const cam of PRIORITY_4) {
      const camDir = path.join(outDir, cam);
      fs.mkdirSync(camDir, { recursive: true });
      fs.writeFileSync(
        path.join(camDir, "adapter.json"),
        JSON.stringify(result.adapters[cam], null, 2)
      );
      fs.writeFileSync(
        path.join(camDir, "metrics.json"),
        JSON.stringify(result.eval[cam], null, 2)
      );
    }
    fs.writeFileSync(
      path.join(outDir, "summary.json"),
      JSON.stringify({
        trained_at: result.trained_at,
        skipped: result.skipped,
        config,
      }, null, 2)
    );
    return result;
  }

  /** Predict with baseline + adapter correction. */
  predictWithAdapter(
    adapter: LoRAAdapter,
    baseline: BayesianRidgeModel,
    vector: FeatureVector
  ): { baseline_value: number; adapter_delta: number; final_value: number } {
    const xRaw = this.baselineEngine["vectorizeOne"](vector, baseline.categorical_vocab);
    const xStd = this.standardize(xRaw, baseline.feature_stats.mean, baseline.feature_stats.std);
    const baselinePred = this.dot(baseline.weights, xStd);
    const delta = this.adapterDelta(adapter, xStd);
    return { baseline_value: baselinePred, adapter_delta: delta, final_value: baselinePred + delta };
  }

  // ─── Private: training ───────────────────────────────────────────

  private fitAdapter(
    cam: Priority4CAM,
    target: TargetName,
    X: number[][], y: number[],
    baseline: BayesianRidgeModel,
    config: LoRAConfig
  ): LoRAAdapter {
    const rng = this.mulberry32(config.seed);
    const d = X[0].length;
    const r = config.rank;

    // Pre-compute baseline predictions + residuals
    const baselinePreds = X.map((x) => this.dot(baseline.weights, x));
    const residuals = y.map((yi, i) => yi - baselinePreds[i]);

    // Initialize A ~ N(0, 0.01), B = 0
    const A: number[][] = Array.from({ length: r }, () =>
      Array.from({ length: d }, () => (rng() - 0.5) * 0.02)
    );
    const B: number[] = new Array(r).fill(0);
    const scale = config.alpha / config.rank;

    let finalLoss = 0;
    const n = X.length;
    const shuffle = this.makeShuffler(n, rng);

    for (let epoch = 0; epoch < config.n_epochs; epoch++) {
      const order = shuffle();
      let epochLoss = 0;

      for (let b = 0; b < n; b += config.batch_size) {
        const batch = order.slice(b, b + config.batch_size);
        // Gradient accumulator
        const gA: number[][] = Array.from({ length: r }, () => new Array(d).fill(0));
        const gB: number[] = new Array(r).fill(0);

        for (const idx of batch) {
          const x = X[idx];
          const Ax: number[] = new Array(r).fill(0);
          for (let i = 0; i < r; i++) {
            for (let j = 0; j < d; j++) Ax[i] += A[i][j] * x[j];
          }
          let delta = 0;
          for (let i = 0; i < r; i++) delta += B[i] * Ax[i];
          delta *= scale;

          const err = delta - residuals[idx]; // want delta ≈ residual
          epochLoss += err * err;

          // dL/dB_i = 2 * err * scale * Ax[i]
          for (let i = 0; i < r; i++) gB[i] += 2 * err * scale * Ax[i];
          // dL/dA_ij = 2 * err * scale * B_i * x_j
          for (let i = 0; i < r; i++) {
            for (let j = 0; j < d; j++) gA[i][j] += 2 * err * scale * B[i] * x[j];
          }
        }

        const bSize = batch.length;
        // Apply update with L2 decay
        for (let i = 0; i < r; i++) {
          B[i] -= config.learning_rate * (gB[i] / bSize + config.weight_decay * B[i]);
          for (let j = 0; j < d; j++) {
            A[i][j] -= config.learning_rate * (gA[i][j] / bSize + config.weight_decay * A[i][j]);
          }
        }
      }

      finalLoss = epochLoss / n;
    }

    // Compute improvement over baseline on training set
    const baselineMAE = this.mean(residuals.map((r) => Math.abs(r)));
    let adapterMAE = 0;
    for (let i = 0; i < n; i++) {
      const d = this.adapterDeltaRaw(A, B, X[i], scale);
      adapterMAE += Math.abs(y[i] - (baselinePreds[i] + d));
    }
    adapterMAE /= n;
    const improvementPct = baselineMAE > 0 ? ((baselineMAE - adapterMAE) / baselineMAE) * 100 : 0;

    return {
      cam_slug: cam, target, config,
      A, B, d_in: d,
      trained_on: n,
      final_train_loss: finalLoss,
      improvement_over_baseline_mae_pct: improvementPct,
      trained_at: new Date().toISOString(),
    };
  }

  private evalAdapter(
    adapter: LoRAAdapter,
    baseline: BayesianRidgeModel,
    X: number[][], y: number[]
  ): AdapterEvalMetrics {
    if (X.length === 0) {
      return {
        cam_slug: adapter.cam_slug, target: adapter.target,
        n_val: 0, baseline_mae: NaN, adapter_mae: NaN, improvement_pct: 0,
        notes: "no val samples for this CAM",
      };
    }
    let baselineSum = 0, adapterSum = 0;
    const scale = adapter.config.alpha / adapter.config.rank;
    for (let i = 0; i < X.length; i++) {
      const bp = this.dot(baseline.weights, X[i]);
      const delta = this.adapterDeltaRaw(adapter.A, adapter.B, X[i], scale);
      baselineSum += Math.abs(y[i] - bp);
      adapterSum += Math.abs(y[i] - (bp + delta));
    }
    const baselineMAE = baselineSum / X.length;
    const adapterMAE = adapterSum / X.length;
    const improvement = baselineMAE > 0 ? ((baselineMAE - adapterMAE) / baselineMAE) * 100 : 0;
    return {
      cam_slug: adapter.cam_slug, target: adapter.target,
      n_val: X.length,
      baseline_mae: baselineMAE,
      adapter_mae: adapterMAE,
      improvement_pct: improvement,
      notes: improvement >= 0
        ? "adapter improves over baseline on val"
        : "adapter worse than baseline on val — insufficient per-CAM training data or overfitting",
    };
  }

  // ─── Feature / math helpers ───────────────────────────────────────

  private featurize(
    vectors: FeatureVector[],
    target: TargetName,
    baseline: BayesianRidgeModel
  ): { X: number[][]; y: number[] } {
    const X: number[][] = [];
    const y: number[] = [];
    for (const v of vectors) {
      const t = target === "spindle_rpm_midpoint"
        ? (v.estimated_spindle_range_rpm[0] + v.estimated_spindle_range_rpm[1]) / 2
        : (v.estimated_feed_range_mm_min[0] + v.estimated_feed_range_mm_min[1]) / 2;
      if (!Number.isFinite(t) || t <= 0) continue;
      const xRaw = this.baselineEngine["vectorizeOne"](v, baseline.categorical_vocab);
      const xStd = this.standardize(xRaw, baseline.feature_stats.mean, baseline.feature_stats.std);
      X.push(xStd);
      y.push(t);
    }
    return { X, y };
  }

  private adapterDelta(adapter: LoRAAdapter, xStd: number[]): number {
    return this.adapterDeltaRaw(adapter.A, adapter.B, xStd, adapter.config.alpha / adapter.config.rank);
  }

  private adapterDeltaRaw(A: number[][], B: number[], x: number[], scale: number): number {
    const r = A.length;
    let delta = 0;
    for (let i = 0; i < r; i++) {
      let ax = 0;
      for (let j = 0; j < x.length; j++) ax += A[i][j] * x[j];
      delta += B[i] * ax;
    }
    return delta * scale;
  }

  private standardize(row: number[], mean: number[], std: number[]): number[] {
    return row.map((v, i) => (v - mean[i]) / std[i]);
  }

  private dot(a: number[], b: number[]): number {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  private mean(xs: number[]): number {
    if (xs.length === 0) return 0;
    return xs.reduce((s, v) => s + v, 0) / xs.length;
  }

  private mulberry32(seed: number): () => number {
    let t = seed >>> 0;
    return () => {
      t = (t + 0x6d2b79f5) >>> 0;
      let r = t;
      r = Math.imul(r ^ (r >>> 15), r | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  private makeShuffler(n: number, rng: () => number): () => number[] {
    return () => {
      const a = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
  }
}

export const camLoRAAdapterTrainerEngine = new CAMLoRAAdapterTrainerEngine();
