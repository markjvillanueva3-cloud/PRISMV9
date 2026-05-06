/**
 * CrossProcessDeepEnsembleEngine — XPROC-NEURAL Tier 5 (T5-03)
 *
 * Deep Ensembles (Lakshminarayanan, Pritzel, Blundell 2017, "Simple and
 * Scalable Predictive Uncertainty Estimation using Deep Ensembles" NeurIPS).
 * Aggregates M independently trained model outputs (different random
 * inits, ideally different shuffles) into a predictive distribution
 * with epistemic uncertainty derived from cross-model disagreement.
 *
 * Why Deep Ensembles vs MC Dropout (T5-01):
 *   - MC Dropout samples one network's posterior approximation. It captures
 *     uncertainty *within* that network's hypothesis class.
 *   - Deep Ensembles sample multiple independently-fit networks. Different
 *     local minima → genuinely different hypotheses → multi-modal
 *     uncertainty that MC Dropout cannot express. Lakshminarayanan et al.
 *     show ensembles consistently beat MC Dropout on calibration metrics.
 *   - Cost: M× single-model compute. Recommended M = 5 per the paper.
 *
 * Architecture decision — pure aggregator (mirrors T5-01):
 *   The engine accepts M caller-supplied predictions for the same input,
 *   one per ensemble member. It does NOT train or hold any networks.
 *   This decouples T5-03 from any specific T1-02 implementation and lets
 *   T5-04 CalibrationAuditor consume the same {mean, variance} shape that
 *   T5-01 emits — uniform downstream interface.
 *
 * Algorithm:
 *   Given member predictions {ŷ_1, ..., ŷ_M}:
 *     μ̂ = (1/M) Σ_m ŷ_m                       (ensemble mean)
 *     σ̂²_epistemic = (1/M) Σ_m (ŷ_m − μ̂)²   (cross-model variance)
 *   For Brier/proper scoring rules at decision time, callers also supply
 *   per-member predicted probability vectors via `disagreementBrier`,
 *   which computes the average pairwise Brier divergence used as the
 *   ensemble disagreement diagnostic in Lakshminarayanan §3.
 *
 * Acceptance criterion (XPROC-NEURAL-ROADMAP.md Tier 5 R3):
 *   "ensemble Brier score < single-model Brier score" — this engine
 *   exposes both raw outputs (so the caller can compute Brier on
 *   ensemble-mean probabilities and on each member's probabilities) and
 *   the disagreement diagnostic. The acceptance test demonstrates the
 *   inequality on a synthetic calibration-deficient classifier.
 *
 * Failure modes covered:
 *   1. M = 0 (no members)              → invalid_input
 *   2. NaN/Infinity in any prediction  → invalid_input
 *   3. Member arrays of different shape → invalid_input (probability vectors)
 *   4. Probability vectors don't sum to ~1 → invalid_input (within tol)
 *   5. M beyond MAX_ENSEMBLE_MEMBERS=128 → invalid_input (DoS guard)
 *   6. Disagreement requested with M=1 → returns 0 + warning (degenerate)
 *
 * @module CrossProcessDeepEnsembleEngine
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

/** Lakshminarayanan et al. recommended M. */
const RECOMMENDED_M = 5;

/** Sanity cap on ensemble size. */
const MAX_ENSEMBLE_MEMBERS = 128;

/** Tolerance for probability-vector sum-to-one check. */
const PROB_SUM_TOL = 1e-6;

// ============================================================================
// Schemas
// ============================================================================

const PredictRegressionInputSchema = z.object({
  /** One scalar prediction per ensemble member. */
  memberPredictions: z.array(z.number().finite()).min(1).max(MAX_ENSEMBLE_MEMBERS),
});

const ProbabilityVectorSchema = z
  .array(z.number().min(0).max(1).finite())
  .min(2);

const DisagreementInputSchema = z.object({
  /** One probability vector (over K classes) per ensemble member.
   *  All members must use the same K. */
  memberProbabilities: z
    .array(ProbabilityVectorSchema)
    .min(1)
    .max(MAX_ENSEMBLE_MEMBERS),
});

// ============================================================================
// Public types
// ============================================================================

export interface PredictRegressionOk {
  ok: true;
  /** Ensemble predictive mean μ̂. */
  mean: number;
  /** Cross-model (epistemic) variance σ̂². */
  variance: number;
  stdDev: number;
  m: number;
  range: number;
  /** Disagreement metric: σ̂ / |μ̂| (Inf when μ̂ = 0). */
  coefficientOfVariation: number;
  warnings: string[];
}

export interface DisagreementOk {
  ok: true;
  m: number;
  k: number;
  /** Ensemble-mean probability vector (length K). */
  meanProbabilities: number[];
  /** Average pairwise Brier divergence Σ_(i<j) ||p_i − p_j||² / C(M,2). */
  meanPairwiseBrier: number;
  /** Predictive entropy (nats) of mean probabilities — −Σ p log p. */
  predictiveEntropyNats: number;
  /** Mutual information / BALD score: H(mean) − mean(H(member)). */
  baldNats: number;
  warnings: string[];
}

export interface OpErr {
  ok: false;
  error: "invalid_input";
  message: string;
}

export type PredictRegressionResult = PredictRegressionOk | OpErr;
export type DisagreementResult = DisagreementOk | OpErr;

// ============================================================================
// Helpers
// ============================================================================

function meanVarianceBiased(xs: number[]): { mean: number; variance: number } {
  // Biased variance (1/M, not 1/(M-1)) — matches Lakshminarayanan §2 form
  // for the ensemble disagreement estimator.
  const M = xs.length;
  let sum = 0;
  for (const x of xs) sum += x;
  const mean = sum / M;
  let m2 = 0;
  for (const x of xs) m2 += (x - mean) * (x - mean);
  const variance = M > 0 ? m2 / M : 0;
  return { mean, variance };
}

function ensureSameLength(probs: number[][]): boolean {
  if (probs.length === 0) return true;
  const k = probs[0].length;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i].length !== k) return false;
  }
  return true;
}

function sumsApproxToOne(p: number[]): boolean {
  let s = 0;
  for (const v of p) s += v;
  return Math.abs(s - 1) < PROB_SUM_TOL;
}

function entropyNats(p: number[]): number {
  let h = 0;
  for (const v of p) {
    if (v > 0) h -= v * Math.log(v);
  }
  return h;
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessDeepEnsembleEngine {
  static readonly tier = "T5-03";

  /**
   * Aggregate scalar regression outputs from M ensemble members. Returns
   * mean, variance, range, and CV diagnostic. Pure function.
   */
  static predictRegression(input: unknown): PredictRegressionResult {
    const parsed = PredictRegressionInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { memberPredictions } = parsed.data;
    const M = memberPredictions.length;
    const warnings: string[] = [];
    if (M === 1) warnings.push("M=1: epistemic variance is 0 (degenerate ensemble)");
    if (M < RECOMMENDED_M && M > 1) {
      warnings.push(`M=${M} below recommended ${RECOMMENDED_M}; uncertainty estimate has wide CI`);
    }
    const { mean, variance } = meanVarianceBiased(memberPredictions);
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of memberPredictions) {
      if (p < lo) lo = p;
      if (p > hi) hi = p;
    }
    const stdDev = Math.sqrt(Math.max(0, variance));
    const cv = mean !== 0 ? stdDev / Math.abs(mean) : Infinity;
    return {
      ok: true, mean, variance, stdDev, m: M, range: hi - lo,
      coefficientOfVariation: cv, warnings,
    };
  }

  /**
   * Disagreement diagnostics for *classification* ensembles. Computes
   * mean probabilities, pairwise Brier, predictive entropy, and the BALD
   * (Bayesian Active Learning by Disagreement) mutual-information score.
   * BALD is the canonical active-learning signal in Houlsby et al. 2011.
   */
  static disagreement(input: unknown): DisagreementResult {
    const parsed = DisagreementInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { memberProbabilities } = parsed.data;
    if (!ensureSameLength(memberProbabilities)) {
      return { ok: false, error: "invalid_input", message: "all member probability vectors must have the same length" };
    }
    for (let i = 0; i < memberProbabilities.length; i++) {
      if (!sumsApproxToOne(memberProbabilities[i])) {
        return {
          ok: false, error: "invalid_input",
          message: `member ${i} probability vector does not sum to 1 (tol=${PROB_SUM_TOL})`,
        };
      }
    }
    const M = memberProbabilities.length;
    const K = memberProbabilities[0].length;
    const warnings: string[] = [];

    // Mean probability vector (length K)
    const mean: number[] = new Array(K).fill(0);
    for (const p of memberProbabilities) {
      for (let k = 0; k < K; k++) mean[k] += p[k];
    }
    for (let k = 0; k < K; k++) mean[k] /= M;

    // Pairwise Brier divergence (squared L2 between probability vectors)
    let pairBrierSum = 0;
    let pairs = 0;
    for (let i = 0; i < M; i++) {
      for (let j = i + 1; j < M; j++) {
        let d = 0;
        for (let k = 0; k < K; k++) {
          const diff = memberProbabilities[i][k] - memberProbabilities[j][k];
          d += diff * diff;
        }
        pairBrierSum += d;
        pairs++;
      }
    }
    const meanPairwiseBrier = pairs > 0 ? pairBrierSum / pairs : 0;
    if (M === 1) warnings.push("M=1: no pairwise disagreement available");

    // Predictive entropy of the mean
    const predEntropy = entropyNats(mean);

    // BALD = H(mean) - mean(H(member))
    let memberEntropySum = 0;
    for (const p of memberProbabilities) memberEntropySum += entropyNats(p);
    const meanMemberEntropy = memberEntropySum / M;
    const bald = predEntropy - meanMemberEntropy;

    return {
      ok: true, m: M, k: K,
      meanProbabilities: mean,
      meanPairwiseBrier,
      predictiveEntropyNats: predEntropy,
      baldNats: Math.max(0, bald),  // BALD is non-negative; clip tiny float drift
      warnings,
    };
  }

  /** Read-only constants snapshot. */
  static constants(): {
    RECOMMENDED_M: number;
    MAX_ENSEMBLE_MEMBERS: number;
    PROB_SUM_TOL: number;
  } {
    return { RECOMMENDED_M, MAX_ENSEMBLE_MEMBERS, PROB_SUM_TOL };
  }
}

export const crossProcessDeepEnsembleEngine = CrossProcessDeepEnsembleEngine;

/**
 * Dispatcher convenience wrapper.
 */
export function crossProcessDeepEnsemble(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_ensemble_predict":
      return CrossProcessDeepEnsembleEngine.predictRegression(params);
    case "xproc_ensemble_disagreement":
      return CrossProcessDeepEnsembleEngine.disagreement(params);
    case "xproc_ensemble_constants":
      return CrossProcessDeepEnsembleEngine.constants();
    default:
      throw new Error(`crossProcessDeepEnsemble: unknown action '${action}'`);
  }
}
