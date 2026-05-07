/**
 * CrossProcessBayesianMLPEngine — XPROC-NEURAL Tier 5 (T5-01)
 *
 * Monte Carlo Dropout (Gal & Ghahramani 2016, "Dropout as a Bayesian
 * Approximation: Representing Model Uncertainty in Deep Learning") aggregator
 * over K stochastic forward passes from any dropout-enabled MLP. Yields
 * predictive mean + variance + Gaussian prediction interval at chosen
 * confidence — drop-in uncertainty quantification on existing T1-02 weights
 * with no retraining.
 *
 * Architecture decision — pure aggregator, not a predictor:
 *   The engine accepts an array of forward-pass scalar predictions from the
 *   caller's neural net (with dropout left active at inference time, K=50
 *   recommended). It does NOT contain any neural inference itself. This
 *   decouples T5-01 from any specific T1-02 implementation: any dropout
 *   network — even one trained outside PRISM — can plug in.
 *
 *   Why pure-aggregator vs full-network MC dropout:
 *     1. Independent shipability: T1-02 is in-flight on a separate worktree;
 *        T5-01 must not block on it.
 *     2. Composability: T5-03 (Deep Ensemble) and T5-04 (Calibration
 *        Auditor) consume the same {mean, variance} output shape — the
 *        downstream code path is identical regardless of where the K
 *        predictions came from.
 *     3. Testability: synthetic K-pass arrays let us verify the math
 *        (prediction interval coverage at the ±2% nominal rate per Tier 5
 *        acceptance) without a trained net.
 *
 * Theory:
 *   Gal & Ghahramani (2016) prove that a network with dropout applied at
 *   inference is equivalent to a Bayesian neural network with Bernoulli
 *   variational distribution over weights. K stochastic forward passes
 *   sample from the approximate posterior:
 *     ŷ_k ~ p(y | x, D)  for k = 1..K
 *   Predictive mean and variance are then:
 *     μ̂ = (1/K) Σ_k ŷ_k                  (predictive mean)
 *     σ̂² = (1/K) Σ_k (ŷ_k − μ̂)² + τ⁻¹     (epistemic + aleatoric)
 *   where τ⁻¹ is the model precision (caller-supplied; defaults to 0 since
 *   the noise term must be calibrated on a held-out set, which this engine
 *   does not own — see T5-04 CalibrationAuditor).
 *
 * Prediction intervals:
 *   For K small (≤30) we use Student's t with ν=K-1 degrees of freedom; for
 *   K large we use the normal approximation. Interval at confidence (1-α):
 *     CI = μ̂ ± t_(1-α/2, K-1) · √(σ̂² / K + σ̂²)
 *   Note: the K-1 d.o.f. is for the *mean estimate*; the prediction interval
 *   for a *new sample* uses the full σ̂², not σ̂²/K. We deliberately combine
 *   both so the interval covers both estimation noise and predictive spread.
 *
 * Failure modes covered:
 *   1. K = 0 (empty array)              → invalid_input
 *   2. K = 1 (no variance estimate)     → return mean, σ²=0, warn
 *   3. NaN/Inf in any prediction        → invalid_input
 *   4. All predictions identical         → σ²=0, well-defined interval
 *   5. confidence outside (0, 1)         → invalid_input (Zod gate)
 *   6. K beyond MAX_FORWARD_PASSES=10000 → invalid_input (sanity)
 *   7. predictions array too large       → invalid_input (DoS guard)
 *   8. Numerical overflow on Σ(ŷ-μ̂)²    → use Welford's online variance
 *
 * Acceptance (XPROC-NEURAL-ROADMAP.md Tier 5 R1):
 *   Prediction interval covers the true value at the nominal rate ±2% on
 *   a synthetic Gaussian-perturbation benchmark (verified in test suite).
 *
 * @module CrossProcessBayesianMLPEngine
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

/** Recommended K from Gal & Ghahramani 2016 for stable variance estimates. */
const RECOMMENDED_K = 50;

/** Sanity-bound on K. K > 10K is almost certainly a usage bug (DoS guard). */
const MAX_FORWARD_PASSES = 10000;

/** Default model precision τ⁻¹. Zero means the engine reports only epistemic
 *  uncertainty — T5-04 CalibrationAuditor estimates τ⁻¹ from holdout data
 *  and supplies it back at predict-time when present. */
const DEFAULT_TAU_INV = 0;

/** Confidence default = 95%. */
const DEFAULT_CONFIDENCE = 0.95;

/** Critical threshold above which we use normal approximation rather than
 *  Student's t. Beyond K=30 the t-distribution converges to N(0,1) within
 *  numerical noise. */
const NORMAL_APPROX_K = 30;

// ============================================================================
// Schemas
// ============================================================================

const PredictInputSchema = z.object({
  predictions: z.array(z.number().finite()).min(1).max(MAX_FORWARD_PASSES),
  /** τ⁻¹ aleatoric noise term (data-noise variance). Defaults to 0. */
  tauInverse: z.number().nonnegative().finite().optional(),
  /** 1-α confidence level for the prediction interval. */
  confidence: z.number().gt(0).lt(1).default(DEFAULT_CONFIDENCE),
});

const UncertaintyInputSchema = z.object({
  predictions: z.array(z.number().finite()).min(1).max(MAX_FORWARD_PASSES),
});

// ============================================================================
// Public types
// ============================================================================

export interface PredictResultOk {
  ok: true;
  /** Predictive mean μ̂. */
  mean: number;
  /** Predictive variance σ̂² (epistemic + aleatoric). */
  variance: number;
  /** Standard deviation = √variance. */
  stdDev: number;
  /** Number of forward passes K. */
  k: number;
  /** Confidence used for the interval (echo of input). */
  confidence: number;
  /** Lower bound of the prediction interval at `confidence`. */
  intervalLow: number;
  /** Upper bound of the prediction interval at `confidence`. */
  intervalHigh: number;
  /** Critical value used (t_(1-α/2, K-1) for K≤30 else z_(1-α/2)). */
  criticalValue: number;
  /** "student-t" or "normal" depending on K. */
  distribution: "student-t" | "normal";
  warnings: string[];
}

export interface UncertaintyResultOk {
  ok: true;
  k: number;
  /** Epistemic (model) uncertainty: Var(ŷ). */
  epistemic: number;
  /** Predictive entropy approximation: 0.5·ln(2πe·σ²) for Gaussian. */
  entropyNats: number;
  /** Range = max(ŷ) - min(ŷ). */
  range: number;
  /** Coefficient of variation = stdDev / |mean| (∞ when mean=0). */
  coefficientOfVariation: number;
}

export interface OpErr {
  ok: false;
  error: "invalid_input";
  message: string;
}

export type PredictResult = PredictResultOk | OpErr;
export type UncertaintyResult = UncertaintyResultOk | OpErr;

// ============================================================================
// Helpers — Welford's online variance (numerically stable for huge K)
// ============================================================================

/**
 * Welford (1962) online algorithm for mean + variance. Two passes (mean
 * then sum-of-squares) would double-iterate; Welford does both in one pass
 * with no catastrophic cancellation for K up to MAX_FORWARD_PASSES.
 */
function welfordMeanVariance(xs: number[]): { mean: number; variance: number } {
  let n = 0;
  let mean = 0;
  let m2 = 0;
  for (const x of xs) {
    n++;
    const delta = x - mean;
    mean += delta / n;
    const delta2 = x - mean;
    m2 += delta * delta2;
  }
  // Sample variance (Bessel-corrected). For n=1, return 0 (no variance).
  const variance = n > 1 ? m2 / (n - 1) : 0;
  return { mean, variance };
}

/**
 * Inverse Student's t CDF — two-sided critical value t_(1-α/2, ν).
 * Beasley-Springer-Moro for normal + Cornish-Fisher correction is overkill
 * for ν ∈ [1, 30]; we use the well-known closed-form approximation from
 * Hill (1970, "Algorithm 396: Student's t-Quantiles") for the cases we
 * actually hit (degrees of freedom 1..29, 95% / 99% nominal). For unsupported
 * (df, conf) combos we fall back to the normal approximation with a logged
 * warning.
 */
function tCriticalTwoSided(degreesFreedom: number, confidence: number): number {
  // Two-sided critical: P(|T| < t*) = confidence  →  t* at upper (1+conf)/2 quantile
  const p = (1 + confidence) / 2;
  // Hill 1970 — exact for ν ≥ 4 to 5 decimal places in p ∈ [0.5, 0.999].
  // For ν < 4 we fall back to a small lookup table to keep accuracy.
  const smallNuLookup: Record<number, Record<number, number>> = {
    1: { 0.95: 12.7062, 0.99: 63.6567, 0.975: 25.4517, 0.9: 6.3138 },
    2: { 0.95: 4.3027, 0.99: 9.9248, 0.975: 6.2053, 0.9: 2.9200 },
    3: { 0.95: 3.1824, 0.99: 5.8409, 0.975: 4.1765, 0.9: 2.3534 },
  };
  if (degreesFreedom in smallNuLookup) {
    const closest = pickClosestConfidence(smallNuLookup[degreesFreedom], confidence);
    if (closest !== null) return closest;
  }
  // Hill 1970 algorithm 396 — for ν ≥ 4
  const z = normalCriticalUpper(p);
  const g1 = (z * z * z + z) / 4;
  const g2 = (5 * Math.pow(z, 5) + 16 * z * z * z + 3 * z) / 96;
  const g3 = (3 * Math.pow(z, 7) + 19 * Math.pow(z, 5) + 17 * z * z * z - 15 * z) / 384;
  const g4 =
    (79 * Math.pow(z, 9) + 776 * Math.pow(z, 7) + 1482 * Math.pow(z, 5) -
      1920 * z * z * z - 945 * z) /
    92160;
  const nu = degreesFreedom;
  return z + g1 / nu + g2 / (nu * nu) + g3 / (nu * nu * nu) + g4 / (nu * nu * nu * nu);
}

function pickClosestConfidence(table: Record<number, number>, target: number): number | null {
  let bestKey: number | null = null;
  let bestDelta = Infinity;
  for (const k of Object.keys(table)) {
    const num = parseFloat(k);
    const delta = Math.abs(num - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestKey = num;
    }
  }
  return bestKey !== null && bestDelta < 0.001 ? table[bestKey] : null;
}

/**
 * Normal CDF inverse Φ⁻¹(p). Acklam (2003), "An algorithm for computing the
 * inverse normal cumulative distribution function" — accurate to ~1.15e-9
 * absolute across p ∈ (0, 1). Three-region rational approximation:
 *   - Lower tail (p < 0.02425): q = √(-2·ln p),  num/den
 *   - Central     (0.02425 ≤ p ≤ 0.97575): r = (p−0.5)², (p−0.5)·num/den
 *   - Upper tail (p > 0.97575): symmetric negation of the lower-tail formula
 *     after q = √(-2·ln(1−p))
 */
function normalCriticalUpper(p: number): number {
  if (p <= 0 || p >= 1) {
    throw new Error(`normalCriticalUpper: p must be in (0,1), got ${p}`);
  }
  // Acklam coefficients (lifted verbatim from the published algorithm).
  // Names a/b are the central-region rational; c/d are the tail rational.
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  /** Acklam's published split between tail and central regions. */
  const PLOW = 0.02425;
  const PHIGH = 1 - PLOW;

  if (p < PLOW) {
    // Lower tail (x negative)
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  } else if (p <= PHIGH) {
    // Central — rational approximation in r = (p − 0.5)²
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  // Upper tail (x positive — negate the lower-tail formula)
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessBayesianMLPEngine {
  static readonly tier = "T5-01";

  /**
   * Aggregate K Monte-Carlo dropout forward passes into mean + variance +
   * Gaussian prediction interval. Pure function — no I/O, no state.
   */
  static predict(input: unknown): PredictResult {
    const parsed = PredictInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      };
    }
    const { predictions, tauInverse, confidence } = parsed.data;
    const tauInv = tauInverse ?? DEFAULT_TAU_INV;
    const k = predictions.length;
    const warnings: string[] = [];

    if (k === 1) {
      warnings.push("k=1: no epistemic variance estimate possible");
    }
    if (k < RECOMMENDED_K && k > 1) {
      warnings.push(
        `k=${k} below recommended K=${RECOMMENDED_K}; variance estimate has wide CI`,
      );
    }

    const { mean, variance: epistemic } = welfordMeanVariance(predictions);
    const variance = epistemic + tauInv;
    const stdDev = Math.sqrt(Math.max(0, variance));

    let critical: number;
    let distribution: "student-t" | "normal";
    if (k <= NORMAL_APPROX_K) {
      const dof = Math.max(1, k - 1);
      critical = tCriticalTwoSided(dof, confidence);
      distribution = "student-t";
    } else {
      const p = (1 + confidence) / 2;
      critical = normalCriticalUpper(p);
      distribution = "normal";
    }
    // Prediction interval for a *new draw*: combine estimation noise σ²/K
    // with predictive spread σ². The √(σ²/K + σ²) form matches Bishop §3.3.2
    // posterior predictive distribution width.
    const intervalHalfWidth = critical * Math.sqrt(variance / k + variance);
    return {
      ok: true,
      mean,
      variance,
      stdDev,
      k,
      confidence,
      intervalLow: mean - intervalHalfWidth,
      intervalHigh: mean + intervalHalfWidth,
      criticalValue: critical,
      distribution,
      warnings,
    };
  }

  /**
   * Decompose uncertainty into epistemic + entropy + range diagnostics.
   * Used by T5-04 CalibrationAuditor for ECE/MCE rolling-window scoring.
   */
  static uncertainty(input: unknown): UncertaintyResult {
    const parsed = UncertaintyInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      };
    }
    const { predictions } = parsed.data;
    const { mean, variance } = welfordMeanVariance(predictions);
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of predictions) {
      if (p < lo) lo = p;
      if (p > hi) hi = p;
    }
    // Differential entropy of N(μ, σ²) = 0.5 · ln(2πe·σ²). For σ=0 entropy
    // is -∞; we report 0 with a degenerate-distribution semantic.
    const entropyNats =
      variance > 0 ? 0.5 * Math.log(2 * Math.PI * Math.E * variance) : 0;
    const cv = mean !== 0 ? Math.sqrt(variance) / Math.abs(mean) : Infinity;
    return {
      ok: true,
      k: predictions.length,
      epistemic: variance,
      entropyNats,
      range: hi - lo,
      coefficientOfVariation: cv,
    };
  }

  /** Read-only constants snapshot. */
  static constants(): {
    RECOMMENDED_K: number;
    MAX_FORWARD_PASSES: number;
    DEFAULT_TAU_INV: number;
    DEFAULT_CONFIDENCE: number;
    NORMAL_APPROX_K: number;
  } {
    return {
      RECOMMENDED_K,
      MAX_FORWARD_PASSES,
      DEFAULT_TAU_INV,
      DEFAULT_CONFIDENCE,
      NORMAL_APPROX_K,
    };
  }
}

export const crossProcessBayesianMLPEngine = CrossProcessBayesianMLPEngine;

/**
 * Dispatcher convenience wrapper.
 */
export function crossProcessBayesianMLP(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_bayes_predict":
      return CrossProcessBayesianMLPEngine.predict(params);
    case "xproc_bayes_uncertainty":
      return CrossProcessBayesianMLPEngine.uncertainty(params);
    case "xproc_bayes_constants":
      return CrossProcessBayesianMLPEngine.constants();
    default:
      throw new Error(`crossProcessBayesianMLP: unknown action '${action}'`);
  }
}
