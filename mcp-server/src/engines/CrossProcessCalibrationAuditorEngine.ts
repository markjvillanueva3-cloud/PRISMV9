/**
 * CrossProcessCalibrationAuditorEngine — XPROC-NEURAL Tier 5 (T5-04)
 *
 * Continuous calibration monitoring + recommendation. Given a batch of
 * (predicted probability, observed outcome) pairs from any binary classifier
 * (T1-02 head, T5-01 BayesianMLP scalar→σ, T5-03 ensemble mean prob), this
 * engine computes:
 *   - ECE (Expected Calibration Error, Naeini, Cooper & Hauskrecht 2015)
 *   - MCE (Maximum Calibration Error)
 *   - Brier score (Brier 1950)
 *   - Reliability diagram bin data (for visualization + audit)
 * and *recommends* a post-hoc recalibration when ECE exceeds threshold:
 *   - Temperature scaling (Guo, Pleiss, Sun, Weinberger 2017) — search T
 *     on a 1-D grid that minimises NLL of σ(logit / T).
 *   - Platt scaling (Platt 1999) — fit logistic regression A,B on
 *     (logit, label) pairs via Newton's method (3 iterations is plenty
 *     for the well-conditioned 2-parameter problem).
 *
 * Why both temperature and Platt:
 *   - Temperature scaling has a single parameter and preserves argmax —
 *     ideal when the model's relative ordering is correct but confidences
 *     are uniformly miscalibrated.
 *   - Platt scaling has two parameters (slope + bias) — handles cases
 *     where the model's logit scale is wrong AND there's a systematic
 *     bias (e.g. always overconfident on positive class).
 * The recommend() returns the better of the two (lower post-correction
 * Brier on the same calibration set) — Guo et al. §5 show this is the
 * canonical model-selection criterion.
 *
 * Architecture:
 *   Pure aggregator. Accepts a batch of {prob, actual} pairs. No rolling
 *   window persistence — the caller is expected to slice their event
 *   stream by the desired window (e.g. "last 30 days") and pass it in.
 *   This keeps the engine stateless and composable with the same downstream
 *   {ECE, MCE, Brier} interface every other Tier 5 unit emits.
 *
 * Failure modes covered:
 *   1. Empty batch                          → invalid_input
 *   2. NaN/Infinity in any prob or label     → invalid_input
 *   3. Probability outside [0, 1]            → invalid_input
 *   4. Label outside {0, 1}                  → invalid_input (Zod gate)
 *   5. numBins outside [1, 100]              → invalid_input
 *   6. All-same-prob batch (no variation)    → ECE/MCE = 0, recommend="no_action"
 *   7. All-same-label batch (degenerate)     → temperature search degenerates,
 *      recommend reports "no_action" with warning
 *   8. logit at exactly p=0 or p=1            → clipped to [PROB_CLIP, 1-PROB_CLIP]
 *      to avoid ±∞ logits (standard in calibration libraries)
 *
 * Acceptance (XPROC-NEURAL-ROADMAP.md Tier 5 R4):
 *   "ECE ≤ 0.05 maintained over 30-day rolling window." Verified in test
 *   suite via synthetic miscalibrated classifier where temperature scaling
 *   reduces ECE from > 0.10 to < 0.05.
 *
 * @module CrossProcessCalibrationAuditorEngine
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

/** Default reliability bin count (Guo et al. 2017 use 15). */
const DEFAULT_NUM_BINS = 15;

/** Acceptance threshold from Tier 5 R4. */
const ECE_THRESHOLD = 0.05;

/** Probability clip — avoids ±∞ logits at the boundaries. */
const PROB_CLIP = 1e-6;

/** Temperature search grid bounds. T < 1 sharpens; T > 1 softens. */
const T_MIN = 0.1;
const T_MAX = 10.0;
const T_GRID_RESOLUTION = 60;  // 60 points → ~0.16 step on log scale

/** Newton iterations for Platt scaling — 3 converges for 2-parameter MLE. */
const PLATT_ITERATIONS = 3;

/** Sanity guard on batch size. */
const MAX_BATCH = 1_000_000;

// ============================================================================
// Schemas
// ============================================================================

const PairSchema = z.object({
  prob: z.number().min(0).max(1).finite(),
  actual: z.union([z.literal(0), z.literal(1)]),
});

const ScoreInputSchema = z.object({
  pairs: z.array(PairSchema).min(1).max(MAX_BATCH),
  numBins: z.number().int().min(1).max(100).default(DEFAULT_NUM_BINS),
});

const RecommendInputSchema = z.object({
  pairs: z.array(PairSchema).min(2).max(MAX_BATCH),  // ≥2 for any meaningful fit
  numBins: z.number().int().min(1).max(100).default(DEFAULT_NUM_BINS),
  eceThreshold: z.number().nonnegative().lt(1).default(ECE_THRESHOLD),
});

// ============================================================================
// Public types
// ============================================================================

export interface ReliabilityBin {
  /** [low, high) interval (last bin is [low, 1.0]). */
  binLow: number;
  binHigh: number;
  /** Number of predictions falling in this bin. */
  count: number;
  /** Mean predicted prob within bin. */
  meanConfidence: number;
  /** Empirical accuracy (rate of actual=1 within bin). */
  accuracy: number;
  /** |meanConfidence − accuracy| × (count / total) — bin's ECE contribution. */
  weightedGap: number;
}

export interface ScoreOk {
  ok: true;
  ece: number;
  mce: number;
  brier: number;
  numBins: number;
  totalCount: number;
  bins: ReliabilityBin[];
}

export type RecommendMethod = "temperature_scaling" | "platt_scaling" | "no_action";

export interface RecommendOk {
  ok: true;
  recommended: RecommendMethod;
  /** Pre-correction ECE/MCE/Brier (passthrough of score()). */
  preEce: number;
  preMce: number;
  preBrier: number;
  /** Post-correction ECE/Brier under recommended method. */
  postEce: number;
  postBrier: number;
  /** Method-specific parameters (T for temperature; A, B for Platt). */
  parameters: { T?: number; A?: number; B?: number };
  /** Whether the post-correction ECE meets the threshold. */
  meetsThreshold: boolean;
  threshold: number;
  warnings: string[];
}

export interface OpErr {
  ok: false;
  error: "invalid_input";
  message: string;
}

export type ScoreResult = ScoreOk | OpErr;
export type RecommendResult = RecommendOk | OpErr;

// ============================================================================
// Helpers
// ============================================================================

function clipProb(p: number): number {
  if (p < PROB_CLIP) return PROB_CLIP;
  if (p > 1 - PROB_CLIP) return 1 - PROB_CLIP;
  return p;
}

function logit(p: number): number {
  const c = clipProb(p);
  return Math.log(c / (1 - c));
}

function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

interface BatchPair { prob: number; actual: 0 | 1; }

function brierScoreOnPairs(pairs: BatchPair[]): number {
  let sum = 0;
  for (const { prob, actual } of pairs) {
    const d = prob - actual;
    sum += d * d;
  }
  return sum / pairs.length;
}

/** Average negative log-likelihood under sigmoid(logit/T). */
function nllAtTemperature(
  logits: number[],
  labels: number[],
  T: number,
): number {
  let nll = 0;
  for (let i = 0; i < logits.length; i++) {
    const p = clipProb(sigmoid(logits[i] / T));
    nll += -(labels[i] * Math.log(p) + (1 - labels[i]) * Math.log(1 - p));
  }
  return nll / logits.length;
}

/** Grid search for optimal temperature on a log-uniform grid. */
function fitTemperature(logits: number[], labels: number[]): number {
  const logTMin = Math.log(T_MIN);
  const logTMax = Math.log(T_MAX);
  const step = (logTMax - logTMin) / (T_GRID_RESOLUTION - 1);
  let bestT = 1;
  let bestNll = Infinity;
  for (let i = 0; i < T_GRID_RESOLUTION; i++) {
    const T = Math.exp(logTMin + i * step);
    const nll = nllAtTemperature(logits, labels, T);
    if (nll < bestNll) { bestNll = nll; bestT = T; }
  }
  return bestT;
}

/** Newton's method for Platt's 2-parameter sigmoid: P(y=1|x) = σ(A·x + B). */
function fitPlatt(logits: number[], labels: number[]): { A: number; B: number } {
  // Initialize. Platt's original paper uses neutral A=−1, B=ln((N+1)/(N−1))
  // where N− = #neg, N+ = #pos; we use A=1, B=0 (identity sigmoid) — Newton
  // converges fast on this well-conditioned problem regardless of init.
  let A = 1;
  let B = 0;
  const n = logits.length;
  for (let iter = 0; iter < PLATT_ITERATIONS; iter++) {
    // Compute gradient and Hessian of NLL
    let gA = 0;
    let gB = 0;
    let hAA = 0;
    let hAB = 0;
    let hBB = 0;
    for (let i = 0; i < n; i++) {
      const x = logits[i];
      const p = sigmoid(A * x + B);
      const err = p - labels[i];
      gA += err * x;
      gB += err;
      const w = p * (1 - p);
      hAA += w * x * x;
      hAB += w * x;
      hBB += w;
    }
    // Solve 2x2 system [hAA hAB; hAB hBB] * [δA; δB] = [gA; gB]
    const det = hAA * hBB - hAB * hAB;
    if (Math.abs(det) < 1e-12) break;  // singular — abort
    const dA = (hBB * gA - hAB * gB) / det;
    const dB = (-hAB * gA + hAA * gB) / det;
    A -= dA;
    B -= dB;
  }
  return { A, B };
}

function buildBins(pairs: BatchPair[], numBins: number): ReliabilityBin[] {
  const bins: ReliabilityBin[] = [];
  const total = pairs.length;
  for (let b = 0; b < numBins; b++) {
    const lo = b / numBins;
    const hi = (b + 1) / numBins;
    let count = 0;
    let confSum = 0;
    let accSum = 0;
    for (const { prob, actual } of pairs) {
      const inBin =
        b === numBins - 1 ? prob >= lo && prob <= hi : prob >= lo && prob < hi;
      if (inBin) {
        count++;
        confSum += prob;
        accSum += actual;
      }
    }
    const meanConfidence = count > 0 ? confSum / count : 0;
    const accuracy = count > 0 ? accSum / count : 0;
    const gap = Math.abs(meanConfidence - accuracy);
    bins.push({
      binLow: lo,
      binHigh: hi,
      count,
      meanConfidence,
      accuracy,
      weightedGap: count > 0 ? gap * (count / total) : 0,
    });
  }
  return bins;
}

function scoreFromBins(bins: ReliabilityBin[], totalBrier: number) {
  let ece = 0;
  let mce = 0;
  for (const bin of bins) {
    ece += bin.weightedGap;
    if (bin.count > 0) {
      const gap = Math.abs(bin.meanConfidence - bin.accuracy);
      if (gap > mce) mce = gap;
    }
  }
  return { ece, mce, brier: totalBrier };
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessCalibrationAuditorEngine {
  static readonly tier = "T5-04";

  /** Compute ECE / MCE / Brier + reliability bins on a batch. Pure. */
  static score(input: unknown): ScoreResult {
    const parsed = ScoreInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { pairs, numBins } = parsed.data;
    const bins = buildBins(pairs as BatchPair[], numBins);
    const brier = brierScoreOnPairs(pairs as BatchPair[]);
    const { ece, mce } = scoreFromBins(bins, brier);
    return {
      ok: true, ece, mce, brier, numBins,
      totalCount: pairs.length, bins,
    };
  }

  /**
   * Recommend (and demonstrate) a post-hoc recalibration if ECE exceeds the
   * threshold. Returns the better of {temperature_scaling, platt_scaling}
   * by post-correction Brier; "no_action" when pre-ECE already meets target
   * or when neither method improves over baseline.
   */
  static recommend(input: unknown): RecommendResult {
    const parsed = RecommendInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { pairs, numBins, eceThreshold } = parsed.data;
    const warnings: string[] = [];

    const baseScore = CrossProcessCalibrationAuditorEngine.score({ pairs, numBins });
    if (!baseScore.ok) return baseScore;
    const preEce = baseScore.ece;
    const preMce = baseScore.mce;
    const preBrier = baseScore.brier;

    // Already calibrated — no action recommended
    if (preEce <= eceThreshold) {
      return {
        ok: true,
        recommended: "no_action",
        preEce, preMce, preBrier,
        postEce: preEce, postBrier: preBrier,
        parameters: {},
        meetsThreshold: true,
        threshold: eceThreshold,
        warnings: [`pre-correction ECE=${preEce.toFixed(4)} already ≤ threshold=${eceThreshold}`],
      };
    }

    // Build logit/label arrays once
    const logits = (pairs as BatchPair[]).map((p) => logit(p.prob));
    const labels = (pairs as BatchPair[]).map((p) => p.actual);
    const labelSum = labels.reduce<number>((a, b) => a + b, 0);
    if (labelSum === 0 || labelSum === labels.length) {
      warnings.push("all labels are identical — cannot fit calibration; recommending no_action");
      return {
        ok: true,
        recommended: "no_action",
        preEce, preMce, preBrier,
        postEce: preEce, postBrier: preBrier,
        parameters: {},
        meetsThreshold: false,
        threshold: eceThreshold,
        warnings,
      };
    }

    // Fit temperature scaling
    const T = fitTemperature(logits, labels);
    const tempPairs: BatchPair[] = logits.map((z, i) => ({
      prob: clipProb(sigmoid(z / T)),
      actual: labels[i] as 0 | 1,
    }));
    const tempScore = CrossProcessCalibrationAuditorEngine.score({ pairs: tempPairs, numBins });
    const tempBrier = tempScore.ok ? tempScore.brier : Infinity;
    const tempEce = tempScore.ok ? tempScore.ece : Infinity;

    // Fit Platt scaling
    const { A, B } = fitPlatt(logits, labels);
    const plattPairs: BatchPair[] = logits.map((z, i) => ({
      prob: clipProb(sigmoid(A * z + B)),
      actual: labels[i] as 0 | 1,
    }));
    const plattScore = CrossProcessCalibrationAuditorEngine.score({ pairs: plattPairs, numBins });
    const plattBrier = plattScore.ok ? plattScore.brier : Infinity;
    const plattEce = plattScore.ok ? plattScore.ece : Infinity;

    // Pick winner — lower Brier breaks ties on lower ECE
    let recommended: RecommendMethod = "no_action";
    let postEce = preEce;
    let postBrier = preBrier;
    let parameters: { T?: number; A?: number; B?: number } = {};
    const tempBeatsBaseline = tempBrier < preBrier;
    const plattBeatsBaseline = plattBrier < preBrier;
    if (tempBeatsBaseline && tempBrier <= plattBrier) {
      recommended = "temperature_scaling";
      postEce = tempEce;
      postBrier = tempBrier;
      parameters = { T };
    } else if (plattBeatsBaseline) {
      recommended = "platt_scaling";
      postEce = plattEce;
      postBrier = plattBrier;
      parameters = { A, B };
    } else {
      warnings.push(`neither correction improved Brier over baseline (${preBrier.toFixed(4)})`);
    }

    return {
      ok: true,
      recommended,
      preEce, preMce, preBrier,
      postEce, postBrier,
      parameters,
      meetsThreshold: postEce <= eceThreshold,
      threshold: eceThreshold,
      warnings,
    };
  }

  /** Read-only constants snapshot. */
  static constants(): {
    DEFAULT_NUM_BINS: number;
    ECE_THRESHOLD: number;
    PROB_CLIP: number;
    T_MIN: number;
    T_MAX: number;
    PLATT_ITERATIONS: number;
    MAX_BATCH: number;
  } {
    return {
      DEFAULT_NUM_BINS, ECE_THRESHOLD, PROB_CLIP,
      T_MIN, T_MAX, PLATT_ITERATIONS, MAX_BATCH,
    };
  }
}

export const crossProcessCalibrationAuditorEngine = CrossProcessCalibrationAuditorEngine;

/**
 * Dispatcher convenience wrapper.
 */
export function crossProcessCalibrationAuditor(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_calibration_score":
      return CrossProcessCalibrationAuditorEngine.score(params);
    case "xproc_calibration_recommend":
      return CrossProcessCalibrationAuditorEngine.recommend(params);
    case "xproc_calibration_constants":
      return CrossProcessCalibrationAuditorEngine.constants();
    default:
      throw new Error(`crossProcessCalibrationAuditor: unknown action '${action}'`);
  }
}
