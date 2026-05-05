/**
 * CrossProcessAttentionExplainEngine — interpretability + calibration +
 * anomaly detection for the T1-02 MLP classifier.
 *
 * Milestone: INFRA-NEURAL-LEDGER-MS1 / U-XPROC-NEURAL-T1-04.
 *
 * Why this exists
 * ---------------
 * T1-02 produces a P(success/failure/operator_override) distribution but
 * is otherwise opaque. Three failure modes need to be addressable before
 * the model can drive shop-floor decisions:
 *
 *   1. "Why did the model say 0.85 success?" — feature attribution so
 *      operators can sanity-check that the prediction is grounded in
 *      the right inputs (e.g. material + spindle_rpm) rather than a
 *      hash-collision artifact in the categorical buckets.
 *   2. "Should we trust 0.85 or is the model overconfident?" —
 *      calibration (ECE) so we know whether 0.85 means roughly 85%
 *      empirical success or whether the model is systematically over-
 *      or under-confident.
 *   3. "Is this run shaped like our training data, or is it a
 *      first-of-its-kind we should treat with extra caution?" —
 *      anomaly detection vs. a baseline.
 *
 * This engine fuses the three concerns because they share the same
 * featurize() pipeline and same operator-mental-model: "explain the
 * prediction, check the confidence, flag the unusual."
 *
 * Three sub-systems
 * -----------------
 *   LIME (Local Interpretable Model-agnostic Explanations)
 *     For a given input x, perturb each of the 32 features (mask to 0,
 *     scale by sample-coefficient), evaluate the donor's prob output
 *     for each perturbation, fit a least-squares linear regression of
 *     "feature mask vector" → "prob[targetClass]". Per-feature weights
 *     are the explanation.
 *
 *   ECE (Expected Calibration Error)
 *     Hold-out batch → bin predictions by max-confidence into
 *     numBins bins. ECE = Σ_b (n_b/N) × |meanConf_b − accuracy_b|.
 *     Reliability diagram bins are returned for downstream charting.
 *
 *   L1 anomaly detection
 *     Running mean + std of featurized records form a "baseline".
 *     New records: L1 distance to mean → z-score (per-dim z averaged) →
 *     boolean isAnomaly when avgZ > threshold (default 3.0). Tiny n
 *     (cold-start) returns notReady=true without crashing.
 *
 * @module engines/CrossProcessAttentionExplainEngine
 */

import {
  CrossProcessNeuralLearningEngine,
  INPUT_DIM,
  OUTPUT_DIM,
  CLASS_SUCCESS,
  CLASS_FAILURE,
  CLASS_OVERRIDE,
} from "./CrossProcessNeuralLearningEngine.js";
import type { OutcomeRecord } from "./CrossProcessOutcomeStore.js";

// ============================================================================
// CONSTANTS
// ============================================================================

export const ATTENTION_SCHEMA_VERSION = "1.0.0";

const DEFAULT_LIME_SAMPLES = 64;
const DEFAULT_LIME_KEEP_RATE = 0.7;
const DEFAULT_LIME_TOP_K = 8;
const DEFAULT_LIME_SEED = 31;

const DEFAULT_ECE_BINS = 10;
const ECE_MIN_BINS = 2;
const ECE_MAX_BINS = 50;

const DEFAULT_ANOMALY_THRESHOLD_Z = 3.0;
const ANOMALY_MIN_BASELINE_N = 5;
const NUMERIC_EPSILON = 1e-9;
const RIDGE_REGULARIZATION = 1e-3;

export type ProbClass = "success" | "failure" | "operator_override";

// ============================================================================
// TYPES
// ============================================================================

export interface LimeOpts {
  /** Number of perturbed neighborhood samples. Default 64. */
  samples?: number;
  /** Probability of keeping each feature in a sample (1=keep, 0=mask). 0..1. Default 0.7. */
  keepRate?: number;
  /** Top-K most-influential features to surface. Default 8. */
  topK?: number;
  /** Seed for the perturbation PRNG. */
  seed?: number;
  /** Class to explain. Default = predicted class for the original input. */
  targetClass?: ProbClass;
}

export interface FeatureContribution {
  index: number;
  weight: number;
}

export interface LimeExplanation {
  schemaVersion: typeof ATTENTION_SCHEMA_VERSION;
  targetClass: ProbClass;
  /** Probability of targetClass for the original (unperturbed) input. */
  baselineProb: number;
  /**
   * 32-dim per-feature weights from the linear surrogate. Positive
   * weight = feature presence increases targetClass probability.
   */
  weights: number[];
  /** topK by |weight| descending. */
  top: FeatureContribution[];
  /**
   * Coefficient of determination (R²) of the linear surrogate vs.
   * actual donor probabilities. Higher = the linear approximation is
   * a good local explanation. Below ~0.3, treat the explanation with
   * suspicion.
   */
  r2: number;
  samples: number;
}

export interface CalibrationBin {
  /** Bin index in [0, numBins). */
  index: number;
  /** Lower edge of the bin's confidence range. */
  lower: number;
  /** Upper edge (exclusive, except for the final bin). */
  upper: number;
  count: number;
  meanConfidence: number;
  accuracy: number;
}

export interface CalibrationReport {
  schemaVersion: typeof ATTENTION_SCHEMA_VERSION;
  ece: number;
  numBins: number;
  totalSamples: number;
  bins: CalibrationBin[];
}

export interface BaselineStats {
  schemaVersion: typeof ATTENTION_SCHEMA_VERSION;
  n: number;
  /** Per-feature running mean (32 dims). */
  mean: number[];
  /** Per-feature running std (sample stddev with Bessel correction; 32 dims). */
  std: number[];
}

export interface AnomalyScore {
  schemaVersion: typeof ATTENTION_SCHEMA_VERSION;
  /** L1 distance between featurized record and baseline mean. */
  l1Distance: number;
  /** Mean per-feature absolute z-score. */
  avgAbsZ: number;
  /** Max per-feature absolute z-score. */
  maxAbsZ: number;
  isAnomaly: boolean;
  /** True when baseline has fewer than ANOMALY_MIN_BASELINE_N samples. */
  notReady: boolean;
  threshold: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class CrossProcessAttentionExplainEngine {
  private baselineN = 0;
  // Welford running sums; lazily allocated so we can reset cleanly.
  private mean: Float64Array | null = null;
  private m2: Float64Array | null = null;

  // ───── LIME ─────

  /**
   * Compute a LIME explanation: which of the 32 input features most
   * influence the donor's prediction for a given record. Pure (no
   * mutation of donor or this engine).
   */
  explainPrediction(
    donor: CrossProcessNeuralLearningEngine,
    record: OutcomeRecord,
    opts: LimeOpts = {},
  ): LimeExplanation {
    const samples = Math.max(8, opts.samples ?? DEFAULT_LIME_SAMPLES);
    const keepRate = clamp01(opts.keepRate ?? DEFAULT_LIME_KEEP_RATE);
    const topK = Math.max(1, opts.topK ?? DEFAULT_LIME_TOP_K);
    const seed = opts.seed ?? DEFAULT_LIME_SEED;
    const rng = mulberry32(seed);

    const baseInput = donor.featurize(record);
    const basePrediction = donor.predict(baseInput);

    const targetClass: ProbClass = opts.targetClass ?? basePrediction.predictedClass;
    const baselineProb = basePrediction.probs[targetClass];

    // Generate `samples` perturbed inputs. Each sample has a 32-dim mask
    // m_ij ∈ {0,1}; we feed (m * baseInput) into the donor and record the
    // output prob for targetClass.
    const masks: number[][] = new Array(samples);
    const targets: number[] = new Array(samples);
    for (let s = 0; s < samples; s++) {
      const mask = new Array<number>(INPUT_DIM);
      const perturbed = new Float64Array(INPUT_DIM);
      for (let i = 0; i < INPUT_DIM; i++) {
        const keep = rng() < keepRate ? 1 : 0;
        mask[i] = keep;
        perturbed[i] = keep === 1 ? baseInput[i] : 0;
      }
      const probs = donor.predict(perturbed).probs;
      targets[s] = probs[targetClass];
      masks[s] = mask;
    }

    // Solve a ridge-regularized least-squares for w in
    //   targets ≈ X · w + b      where X = masks (samples × 32).
    // For interpretability we let the regression learn its own intercept
    // by appending a column of 1s to X, then drop it from `weights`.
    const weights = ridgeLeastSquaresWithIntercept(masks, targets, RIDGE_REGULARIZATION);
    const r2 = computeR2(masks, targets, weights);

    const featureWeights = weights.slice(0, INPUT_DIM);

    const ranked: FeatureContribution[] = featureWeights
      .map((w, i) => ({ index: i, weight: w }))
      .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

    return {
      schemaVersion: ATTENTION_SCHEMA_VERSION,
      targetClass,
      baselineProb,
      weights: featureWeights,
      top: ranked.slice(0, topK),
      r2,
      samples,
    };
  }

  // ───── ECE ─────

  /**
   * Compute Expected Calibration Error over a held-out batch. Pending
   * records are skipped (no label).
   */
  computeECE(
    donor: CrossProcessNeuralLearningEngine,
    records: readonly OutcomeRecord[],
    numBinsArg?: number,
  ): CalibrationReport {
    const numBins = clampInt(numBinsArg ?? DEFAULT_ECE_BINS, ECE_MIN_BINS, ECE_MAX_BINS);
    const bins: Array<{ confSum: number; correctSum: number; count: number }> = [];
    for (let b = 0; b < numBins; b++) bins.push({ confSum: 0, correctSum: 0, count: 0 });

    let totalSamples = 0;
    for (const r of records) {
      const y = donor.recordToLabel(r);
      if (y === null) continue;
      const pred = donor.predictFromRecord(r);
      const conf = pred.confidence;
      const predIdx = labelIndex(pred.predictedClass);
      const correct = predIdx === y ? 1 : 0;
      // Bin by max-confidence. Final bin includes upper edge (1.0).
      let b = Math.floor(conf * numBins);
      if (b >= numBins) b = numBins - 1;
      if (b < 0) b = 0;
      bins[b].confSum += conf;
      bins[b].correctSum += correct;
      bins[b].count += 1;
      totalSamples += 1;
    }

    let ece = 0;
    const out: CalibrationBin[] = [];
    for (let b = 0; b < numBins; b++) {
      const lower = b / numBins;
      const upper = (b + 1) / numBins;
      const count = bins[b].count;
      const meanConfidence = count === 0 ? 0 : bins[b].confSum / count;
      const accuracy = count === 0 ? 0 : bins[b].correctSum / count;
      out.push({ index: b, lower, upper, count, meanConfidence, accuracy });
      if (totalSamples > 0 && count > 0) {
        ece += (count / totalSamples) * Math.abs(meanConfidence - accuracy);
      }
    }

    return {
      schemaVersion: ATTENTION_SCHEMA_VERSION,
      ece,
      numBins,
      totalSamples,
      bins: out,
    };
  }

  // ───── L1 anomaly ─────

  /**
   * Add a batch of records to the running baseline (Welford). Pending
   * records are included — anomaly detection is independent of label.
   */
  registerBaseline(
    donor: CrossProcessNeuralLearningEngine,
    records: readonly OutcomeRecord[],
  ): { added: number; baselineN: number } {
    let added = 0;
    for (const r of records) {
      const x = donor.featurize(r);
      this.welfordUpdate(x);
      added++;
    }
    return { added, baselineN: this.baselineN };
  }

  /** Score a record against the current baseline. */
  scoreAnomaly(
    donor: CrossProcessNeuralLearningEngine,
    record: OutcomeRecord,
    threshold: number = DEFAULT_ANOMALY_THRESHOLD_Z,
  ): AnomalyScore {
    const baseEmpty: AnomalyScore = {
      schemaVersion: ATTENTION_SCHEMA_VERSION,
      l1Distance: 0,
      avgAbsZ: 0,
      maxAbsZ: 0,
      isAnomaly: false,
      notReady: true,
      threshold,
    };
    if (
      this.baselineN < ANOMALY_MIN_BASELINE_N ||
      !this.mean ||
      !this.m2
    ) {
      return baseEmpty;
    }

    const x = donor.featurize(record);
    let l1 = 0;
    let zSum = 0;
    let zMax = 0;
    for (let i = 0; i < INPUT_DIM; i++) {
      const diff = x[i] - this.mean[i];
      l1 += Math.abs(diff);
      const variance = this.m2[i] / Math.max(1, this.baselineN - 1);
      const std = Math.sqrt(Math.max(NUMERIC_EPSILON, variance));
      const z = Math.abs(diff) / std;
      zSum += z;
      if (z > zMax) zMax = z;
    }
    const avgAbsZ = zSum / INPUT_DIM;

    return {
      schemaVersion: ATTENTION_SCHEMA_VERSION,
      l1Distance: l1,
      avgAbsZ,
      maxAbsZ: zMax,
      isAnomaly: avgAbsZ > threshold,
      notReady: false,
      threshold,
    };
  }

  /** Snapshot of the running baseline, suitable for persistence/export. */
  getBaseline(): BaselineStats {
    if (this.baselineN === 0 || !this.mean || !this.m2) {
      return {
        schemaVersion: ATTENTION_SCHEMA_VERSION,
        n: 0,
        mean: new Array<number>(INPUT_DIM).fill(0),
        std: new Array<number>(INPUT_DIM).fill(0),
      };
    }
    const std = new Array<number>(INPUT_DIM);
    for (let i = 0; i < INPUT_DIM; i++) {
      const variance = this.m2[i] / Math.max(1, this.baselineN - 1);
      std[i] = Math.sqrt(Math.max(0, variance));
    }
    return {
      schemaVersion: ATTENTION_SCHEMA_VERSION,
      n: this.baselineN,
      mean: Array.from(this.mean),
      std,
    };
  }

  resetBaseline(): void {
    this.baselineN = 0;
    this.mean = null;
    this.m2 = null;
  }

  // ───── PRIVATE ─────

  private welfordUpdate(x: Float64Array): void {
    if (!this.mean || !this.m2) {
      this.mean = new Float64Array(INPUT_DIM);
      this.m2 = new Float64Array(INPUT_DIM);
    }
    this.baselineN++;
    for (let i = 0; i < INPUT_DIM; i++) {
      const delta = x[i] - this.mean[i];
      this.mean[i] += delta / this.baselineN;
      const delta2 = x[i] - this.mean[i];
      this.m2[i] += delta * delta2;
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function labelIndex(c: ProbClass): number {
  if (c === "success") return CLASS_SUCCESS;
  if (c === "failure") return CLASS_FAILURE;
  return CLASS_OVERRIDE;
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0.5;
  return Math.max(0, Math.min(1, v));
}

function clampInt(v: number, lo: number, hi: number): number {
  const i = Math.round(v);
  return Math.max(lo, Math.min(hi, i));
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Solve (X^T X + λI) w = X^T y, with X augmented by a column of 1s
 * (intercept). Returns [w_features..., w_intercept]. Uses Gauss-Jordan
 * elimination — fine at our small dimension (33 unknowns).
 */
function ridgeLeastSquaresWithIntercept(
  masks: number[][],
  targets: number[],
  lambda: number,
): number[] {
  const n = masks.length;
  const d = INPUT_DIM + 1; // +1 for intercept

  // Build XtX (d × d) and Xty (d).
  const XtX: number[][] = Array.from({ length: d }, () => new Array<number>(d).fill(0));
  const Xty: number[] = new Array<number>(d).fill(0);

  for (let s = 0; s < n; s++) {
    const m = masks[s];
    const t = targets[s];
    // augmented x = [m_0, m_1, ..., m_31, 1]
    for (let i = 0; i < INPUT_DIM; i++) {
      Xty[i] += m[i] * t;
      for (let j = 0; j < INPUT_DIM; j++) {
        XtX[i][j] += m[i] * m[j];
      }
      XtX[i][INPUT_DIM] += m[i]; // intercept column
      XtX[INPUT_DIM][i] += m[i]; // symmetric row
    }
    Xty[INPUT_DIM] += t;
    XtX[INPUT_DIM][INPUT_DIM] += 1;
  }

  // Add ridge λI to feature dims (skip intercept regularization).
  for (let i = 0; i < INPUT_DIM; i++) XtX[i][i] += lambda;

  // Solve via Gauss-Jordan with partial pivoting. Augment [XtX | Xty].
  const aug: number[][] = new Array(d);
  for (let i = 0; i < d; i++) aug[i] = [...XtX[i], Xty[i]];

  for (let i = 0; i < d; i++) {
    // Pivot: find row with max |aug[r][i]| for r >= i.
    let maxRow = i;
    let maxVal = Math.abs(aug[i][i]);
    for (let r = i + 1; r < d; r++) {
      const v = Math.abs(aug[r][i]);
      if (v > maxVal) {
        maxRow = r;
        maxVal = v;
      }
    }
    if (maxVal < NUMERIC_EPSILON) continue; // singular column → leave as-is
    if (maxRow !== i) {
      const tmp = aug[i];
      aug[i] = aug[maxRow];
      aug[maxRow] = tmp;
    }
    const pivot = aug[i][i];
    for (let c = 0; c < d + 1; c++) aug[i][c] /= pivot;
    for (let r = 0; r < d; r++) {
      if (r === i) continue;
      const factor = aug[r][i];
      if (factor === 0) continue;
      for (let c = 0; c < d + 1; c++) aug[r][c] -= factor * aug[i][c];
    }
  }

  const sol = new Array<number>(d);
  for (let i = 0; i < d; i++) sol[i] = aug[i][d];
  return sol;
}

/**
 * R² between targets and the linear-surrogate predictions on the same
 * neighborhood. Range (-∞, 1]; clamp to [0,1] for reporting.
 */
function computeR2(masks: number[][], targets: number[], weights: number[]): number {
  if (masks.length === 0) return 0;
  let mean = 0;
  for (const t of targets) mean += t;
  mean /= targets.length;

  let ssTot = 0;
  let ssRes = 0;
  for (let s = 0; s < masks.length; s++) {
    let pred = weights[INPUT_DIM]; // intercept
    for (let i = 0; i < INPUT_DIM; i++) pred += weights[i] * masks[s][i];
    const t = targets[s];
    ssRes += (t - pred) ** 2;
    ssTot += (t - mean) ** 2;
  }
  if (ssTot < NUMERIC_EPSILON) return 1; // constant target → trivially perfect
  const r2 = 1 - ssRes / ssTot;
  return Math.max(0, Math.min(1, r2));
}

export const crossProcessAttentionExplainEngine = new CrossProcessAttentionExplainEngine();
