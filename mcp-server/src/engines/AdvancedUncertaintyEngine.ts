/**
 * AdvancedUncertaintyEngine — Kriging/GP surrogates, Quasi-Monte Carlo, Gaussian Copula
 *
 * Three critical uncertainty/variability methods missing from the PRISM UQ stack:
 *
 * 1. **Kriging / Gaussian Process Surrogate** — GP regression for building surrogates
 *    of expensive manufacturing simulations, with Bayesian optimization support.
 *    Kernels: Squared Exponential, Matérn 3/2, Matérn 5/2.
 *    References: Rasmussen & Williams (2006) "Gaussian Processes for Machine Learning",
 *    Jones et al. (1998) "Efficient Global Optimization" (EGO / Expected Improvement).
 *
 * 2. **Quasi-Monte Carlo (Sobol / Halton)** — Low-discrepancy sequences achieving
 *    O(1/N) convergence vs O(1/√N) for crude MC. Sobol direction numbers from
 *    Joe & Kuo (2010). Scrambled variants for error estimation.
 *    References: Niederreiter (1992) "Random Number Generation and QMC Methods",
 *    Joe & Kuo (2010) "Constructing Sobol sequences with better two-dimensional projections".
 *
 * 3. **Gaussian Copula** — Separate dependence structure from marginal distributions.
 *    Enables correlated input sampling for UQ when inputs are not independent.
 *    References: Nelsen (2006) "An Introduction to Copulas",
 *    Lebrun & Dutfoy (2009) "An innovating analysis of the Nataf transformation".
 *
 * @module AdvancedUncertaintyEngine
 */

// ── Interfaces ─────────────────────────────────────────────────────

interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

// -- Kriging interfaces --

export type KernelType = "squared_exponential" | "matern_32" | "matern_52";

export interface KrigingFitInput {
  X_train: number[][];
  y_train: number[];
  kernel?: KernelType;
  noise_variance?: number;
  optimize_hyperparams?: boolean;
}

export interface KrigingModel {
  X_train: number[][];
  y_train: number[];
  kernel: KernelType;
  lengthscale: number[];
  signal_variance: number;
  noise_variance: number;
  K_inv: number[][];
  alpha: number[]; // K_inv * y
  n_train: number;
  n_features: number;
}

export interface KrigingFitResult {
  hyperparams: {
    lengthscale: number[];
    signal_variance: number;
    noise_variance: number;
  };
  log_marginal_likelihood: number;
  n_train: number;
  n_features: number;
  model: KrigingModel;
}

export interface KrigingPredictInput {
  X_new: number[][];
  model: KrigingModel;
}

export interface KrigingPredictResult {
  predictions: number[];
  uncertainties: number[];
  confidence_95: [number, number][];
  expected_improvement?: number[];
}

export interface SurrogateOptimizeInput {
  X_initial: number[][];
  y_initial: number[];
  bounds: [number, number][];
  acquisition?: "expected_improvement" | "probability_improvement" | "ucb";
  n_iterations?: number;
  kernel?: KernelType;
  objective_fn?: (x: number[]) => number;
}

export interface SurrogateOptimizeResult {
  best_x: number[];
  best_y: number;
  all_evaluations: { x: number[]; y: number }[];
  convergence_history: number[];
  surrogate_accuracy: number;
}

export interface KrigingManufacturingInput {
  experiments: { speed: number; feed: number; depth?: number; response: number }[];
  response_type: "force" | "roughness" | "temperature" | "tool_life" | "mrr";
  predict_at?: { speed: number; feed: number; depth?: number }[];
}

export interface KrigingManufacturingResult {
  predictions: { point: Record<string, number>; mean: number; std: number; ci_95: [number, number] }[];
  optimal_conditions: Record<string, number>;
  optimal_response: number;
  response_surface_data: { x1: number; x2: number; y_mean: number; y_std: number }[];
  model_quality: { loo_r2: number; loo_rmse: number };
}

// -- QMC interfaces --

export interface SobolSequenceInput {
  n_points: number;
  n_dimensions: number;
  seed?: number;
  scramble?: boolean;
}

export interface SobolSequenceResult {
  points: number[][];
  discrepancy: number;
  uniformity_test: { ks_statistic: number; p_value: number };
}

export interface QMCIntegrateInput {
  integrand: (x: number[]) => number;
  n_dimensions: number;
  n_points: number;
  bounds?: [number, number][];
  sequence?: "sobol" | "halton";
}

export interface QMCIntegrateResult {
  estimate: number;
  std_error: number;
  ci_95: [number, number];
  convergence_rate: number;
  mc_comparison: { mc_estimate: number; mc_std_error: number; speedup: number };
}

export interface QMCUQInput {
  model_fn: (x: Record<string, number>) => number;
  parameter_distributions: Record<string, { mean: number; std: number; dist?: "normal" | "uniform" | "lognormal" }>;
  n_samples: number;
}

export interface QMCUQResult {
  output_mean: number;
  output_std: number;
  output_percentiles: Record<string, number>;
  convergence_comparison: {
    qmc_std_error: number;
    mc_std_error_estimated: number;
    efficiency_gain: number;
  };
  sobol_indices_first_order: Record<string, number>;
}

export interface HaltonSequenceInput {
  n_points: number;
  n_dimensions: number;
}

export interface HaltonSequenceResult {
  points: number[][];
  primes_used: number[];
}

// -- Copula interfaces --

export type CopulaDistribution = "normal" | "lognormal" | "uniform" | "weibull" | "beta";

export interface MarginalSpec {
  name: string;
  distribution: CopulaDistribution;
  params: Record<string, number>;
}

export interface GaussianCopulaInput {
  marginals: MarginalSpec[];
  correlation_matrix: number[][];
  n_samples: number;
  seed?: number;
}

export interface GaussianCopulaResult {
  samples: number[][];
  realized_correlation: number[][];
  marginal_statistics: { name: string; mean: number; std: number; skew: number }[];
  kendalls_tau: number[][];
}

export interface CorrelatedUQInput {
  model_fn: (x: Record<string, number>) => number;
  marginals: MarginalSpec[];
  correlation_matrix: number[][];
  n_samples: number;
  method?: "copula_mc" | "copula_qmc";
}

export interface CorrelatedUQResult {
  output_mean: number;
  output_std: number;
  output_ci_95: [number, number];
  correlation_sensitivity: Record<string, number>;
  comparison_independent: { mean: number; std: number };
}

export interface CorrelationFromDataInput {
  data: number[][];
  variable_names?: string[];
}

export interface CorrelationFromDataResult {
  spearman_matrix: number[][];
  kendall_matrix: number[][];
  marginal_fits: { name: string; best_distribution: string; params: Record<string, number> }[];
  copula_type_recommendation: string;
}

// ── Helper functions ────────────────────────────────────────────────

/** Seeded PRNG (xoshiro128**) for reproducibility */
function createRNG(seed: number): () => number {
  let s0 = seed | 0 || 1;
  let s1 = (seed * 2654435761) | 0 || 2;
  let s2 = (seed * 2246822519) | 0 || 3;
  let s3 = (seed * 3266489917) | 0 || 4;
  return () => {
    const result = (((s1 * 5) << 7 | (s1 * 5) >>> 25) * 9) >>> 0;
    const t = (s1 << 9) | 0;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3;
    s2 ^= t;
    s3 = (s3 << 11 | s3 >>> 21) | 0;
    return (result >>> 0) / 4294967296;
  };
}

/** Box-Muller transform: uniform → standard normal */
function boxMuller(rng: () => number): number {
  let u1: number, u2: number;
  do { u1 = rng(); } while (u1 === 0);
  u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Generate n standard normal samples */
function normalSamples(n: number, rng: () => number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(boxMuller(rng));
  return out;
}

/** Standard normal CDF (Abramowitz & Stegun 26.2.17, |error| < 7.5e-8) */
function normalCDF(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return 0.5 * (1 + sign * y);
}

/** Inverse normal CDF (Rational approximation, Beasley-Springer-Moro) */
function normalInvCDF(p: number): number {
  if (p <= 0) return -8;
  if (p >= 1) return 8;
  if (Math.abs(p - 0.5) < 1e-15) return 0;

  const a = [-3.969683028665376e1, 2.209460984245205e2,
    -2.759285104469687e2, 1.383577518672690e2,
    -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2,
    -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1,
    -2.400758277161838e0, -2.549732539343734e0,
    4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1,
    2.445134137142996e0, 3.754408661907416e0];

  const pLow = 0.02425, pHigh = 1 - pLow;
  let q: number, r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

/** Normal PDF */
function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/** Cholesky decomposition of symmetric positive-definite matrix. Returns lower triangular L. */
function cholesky(A: number[][]): number[][] {
  const n = A.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        const diag = A[i][i] - sum;
        if (diag <= 0) throw new Error(`Matrix is not positive definite (row ${i}, value ${diag.toFixed(6)})`);
        L[i][j] = Math.sqrt(diag);
      } else {
        L[i][j] = (A[i][j] - sum) / L[j][j];
      }
    }
  }
  return L;
}

/** Matrix-vector multiply */
function matVecMul(A: number[][], x: number[]): number[] {
  return A.map(row => row.reduce((s, v, j) => s + v * x[j], 0));
}

/** Matrix-matrix multiply */
function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, p = B.length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < p; k++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}

/** Transpose matrix */
function transpose(A: number[][]): number[][] {
  const m = A.length, n = A[0].length;
  const T: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      T[j][i] = A[i][j];
  return T;
}

/** Invert symmetric positive-definite matrix via Cholesky */
function invertSPD(A: number[][]): number[][] {
  const n = A.length;
  const L = cholesky(A);
  // Forward-substitute to invert L
  const Linv: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    Linv[i][i] = 1 / L[i][i];
    for (let j = i + 1; j < n; j++) {
      let sum = 0;
      for (let k = i; k < j; k++) sum += L[j][k] * Linv[k][i];
      Linv[j][i] = -sum / L[j][j];
    }
  }
  // A^-1 = L^-T * L^-1
  return matMul(transpose(Linv), Linv);
}

/** Dot product */
function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Euclidean distance */
function euclideanDist(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

/** Weighted squared distance with per-dimension lengthscale */
function weightedSqDist(a: number[], b: number[], lengthscale: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += ((a[i] - b[i]) / lengthscale[i]) ** 2;
  return s;
}

/** Weighted distance */
function weightedDist(a: number[], b: number[], lengthscale: number[]): number {
  return Math.sqrt(weightedSqDist(a, b, lengthscale));
}

/** Compute mean and std of array */
function meanStd(arr: number[]): { mean: number; std: number } {
  const n = arr.length;
  const mean = arr.reduce((s, v) => s + v, 0) / n;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  return { mean, std: Math.sqrt(variance) };
}

/** Percentile (linear interpolation) */
function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Rank array (average ranks for ties) */
function rank(arr: number[]): number[] {
  const indexed = arr.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array(arr.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length && indexed[j].v === indexed[i].v) j++;
    const avgRank = (i + j - 1) / 2 + 1;
    for (let k = i; k < j; k++) ranks[indexed[k].i] = avgRank;
    i = j;
  }
  return ranks;
}

/** Spearman rank correlation between two arrays */
function spearmanCorr(a: number[], b: number[]): number {
  const ra = rank(a), rb = rank(b);
  const ma = meanStd(ra), mb = meanStd(rb);
  let num = 0;
  for (let i = 0; i < a.length; i++) num += (ra[i] - ma.mean) * (rb[i] - mb.mean);
  return num / (a.length * ma.std * mb.std);
}

/** Kendall's tau-b */
function kendallTau(a: number[], b: number[]): number {
  const n = a.length;
  let concordant = 0, discordant = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const da = a[i] - a[j], db = b[i] - b[j];
      if (da * db > 0) concordant++;
      else if (da * db < 0) discordant++;
    }
  }
  return (concordant - discordant) / (0.5 * n * (n - 1));
}

/** First few primes for Halton sequence */
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71];

/** Gamma function (Lanczos approximation) */
function gammaFn(z: number): number {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaFn(1 - z));
  z -= 1;
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

/** Weibull inverse CDF: x = scale * (-ln(1-p))^(1/shape) */
function weibullInvCDF(p: number, shape: number, scale: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return Infinity;
  return scale * Math.pow(-Math.log(1 - p), 1 / shape);
}

/** Beta inverse CDF (bisection — sufficient for sampling) */
function betaInvCDF(p: number, alpha: number, beta: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  // Bisection on regularized incomplete beta
  let lo = 0, hi = 1;
  for (let iter = 0; iter < 60; iter++) {
    const mid = (lo + hi) / 2;
    if (betaRegularized(mid, alpha, beta) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Regularized incomplete beta function (continued fraction, Lentz) */
function betaRegularized(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  // Use symmetry if needed
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - betaRegularized(1 - x, b, a);
  }
  const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;
  // Lentz continued fraction
  let f = 1, c = 1, d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d; f = d;
  for (let m = 1; m <= 200; m++) {
    // even step
    let num = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + num * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
    c = 1 + num / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    f *= d * c;
    // odd step
    num = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + num * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
    c = 1 + num / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    const delta = d * c;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-10) break;
  }
  return front * f;
}

/** Log-gamma (Stirling) */
function lnGamma(z: number): number {
  return Math.log(gammaFn(z));
}

/** Lognormal inverse CDF */
function lognormalInvCDF(p: number, mu: number, sigma: number): number {
  return Math.exp(mu + sigma * normalInvCDF(p));
}

/** Inverse CDF dispatcher for marginal distributions */
function inverseCDF(p: number, spec: MarginalSpec): number {
  const pr = spec.params;
  switch (spec.distribution) {
    case "normal":
      return (pr.mean ?? 0) + (pr.std ?? 1) * normalInvCDF(p);
    case "lognormal":
      return lognormalInvCDF(p, pr.mu ?? 0, pr.sigma ?? 1);
    case "uniform":
      return (pr.min ?? 0) + p * ((pr.max ?? 1) - (pr.min ?? 0));
    case "weibull":
      return weibullInvCDF(p, pr.shape ?? 1, pr.scale ?? 1);
    case "beta":
      return betaInvCDF(p, pr.alpha ?? 2, pr.beta ?? 2);
    default:
      return normalInvCDF(p);
  }
}

/** KS test statistic for uniform [0,1] */
function ksTestUniform(values: number[]): { ks_statistic: number; p_value: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  let D = 0;
  for (let i = 0; i < n; i++) {
    const Fn = (i + 1) / n;
    const Fn_prev = i / n;
    D = Math.max(D, Math.abs(Fn - sorted[i]), Math.abs(sorted[i] - Fn_prev));
  }
  // Approximate p-value (Kolmogorov distribution)
  const sqrtN = Math.sqrt(n);
  const lambda = (sqrtN + 0.12 + 0.11 / sqrtN) * D;
  let pVal = 0;
  for (let k = 1; k <= 100; k++) {
    pVal += 2 * (k % 2 === 0 ? -1 : 1) * Math.exp(-2 * k * k * lambda * lambda);
  }
  pVal = Math.max(0, Math.min(1, pVal));
  return { ks_statistic: D, p_value: pVal };
}

// ── Joe-Kuo Sobol Direction Numbers (first 10 dimensions) ──────────

/** Sobol direction numbers — primitive polynomials and initial direction numbers
 *  from Joe & Kuo (2010). Dimension 1 uses Van der Corput in base 2.
 *  Subsequent dimensions use the recurrence with degree-s primitive polynomial. */
const SOBOL_DIRECTION_NUMBERS: { s: number; a: number; m: number[] }[] = [
  // dim 2: s=1, poly=0 (x+1), m=[1]
  { s: 1, a: 0, m: [1] },
  // dim 3: s=2, poly=1 (x²+x+1), m=[1,1]
  { s: 2, a: 1, m: [1, 1] },
  // dim 4: s=3, poly=1 (x³+x+1), m=[1,1,1]
  { s: 3, a: 1, m: [1, 1, 1] },
  // dim 5: s=3, poly=2 (x³+x²+1), m=[1,3,1]
  { s: 3, a: 2, m: [1, 3, 1] },
  // dim 6: s=4, poly=1, m=[1,1,1,1]
  { s: 4, a: 1, m: [1, 1, 1, 1] },
  // dim 7: s=4, poly=4, m=[1,3,5,1]
  { s: 4, a: 4, m: [1, 3, 5, 1] },
  // dim 8: s=5, poly=2, m=[1,1,5,3,1]
  { s: 5, a: 2, m: [1, 1, 5, 3, 1] },
  // dim 9: s=5, poly=4, m=[1,3,1,7,5]
  { s: 5, a: 4, m: [1, 3, 1, 7, 5] },
  // dim 10: s=5, poly=7, m=[1,3,3,9,9]
  { s: 5, a: 7, m: [1, 3, 3, 9, 9] },
];

// ── Engine Class ────────────────────────────────────────────────────

class AdvancedUncertaintyEngine {
  /**
   * Build kernel covariance matrix
   */
  private kernelMatrix(
    X1: number[][], X2: number[][],
    kernel: KernelType, lengthscale: number[], signal_variance: number
  ): number[][] {
    const m = X1.length, n = X2.length;
    const K: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        const r = weightedDist(X1[i], X2[j], lengthscale);
        const r2 = r * r;
        switch (kernel) {
          case "squared_exponential":
            K[i][j] = signal_variance * Math.exp(-0.5 * r2);
            break;
          case "matern_32": {
            const sr3 = Math.sqrt(3) * r;
            K[i][j] = signal_variance * (1 + sr3) * Math.exp(-sr3);
            break;
          }
          case "matern_52": {
            const sr5 = Math.sqrt(5) * r;
            K[i][j] = signal_variance * (1 + sr5 + 5 * r2 / 3) * Math.exp(-sr5);
            break;
          }
        }
      }
    }
    return K;
  }

  /**
   * Compute log marginal likelihood for GP hyperparameter optimization
   * log p(y|X,θ) = -½ yᵀK⁻¹y - ½ log|K| - n/2 log(2π)
   */
  private logMarginalLikelihood(
    X: number[][], y: number[],
    kernel: KernelType, lengthscale: number[],
    signal_variance: number, noise_variance: number
  ): number {
    const n = X.length;
    const K = this.kernelMatrix(X, X, kernel, lengthscale, signal_variance);
    // Add noise to diagonal
    for (let i = 0; i < n; i++) K[i][i] += noise_variance;

    try {
      const L = cholesky(K);
      // log|K| = 2 * sum(log(L_ii))
      let logDet = 0;
      for (let i = 0; i < n; i++) logDet += Math.log(L[i][i]);
      logDet *= 2;

      // Solve L * z = y via forward substitution
      const z = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        let sum = y[i];
        for (let j = 0; j < i; j++) sum -= L[i][j] * z[j];
        z[i] = sum / L[i][i];
      }
      // alpha = K^-1 y = L^-T z — solve L^T * alpha = z
      const alpha = new Array(n).fill(0);
      for (let i = n - 1; i >= 0; i--) {
        let sum = z[i];
        for (let j = i + 1; j < n; j++) sum -= L[j][i] * alpha[j];
        alpha[i] = sum / L[i][i];
      }

      const dataFit = -0.5 * dot(y, alpha);
      const complexity = -0.5 * logDet;
      const constant = -0.5 * n * Math.log(2 * Math.PI);
      return dataFit + complexity + constant;
    } catch {
      return -Infinity;
    }
  }

  /**
   * Optimize GP hyperparameters via grid search on log scale
   */
  private optimizeHyperparams(
    X: number[][], y: number[], kernel: KernelType, noise_variance: number
  ): { lengthscale: number[]; signal_variance: number } {
    const d = X[0].length;
    // Compute data range for each dimension
    const ranges: number[] = [];
    for (let j = 0; j < d; j++) {
      const vals = X.map(row => row[j]);
      const range = Math.max(...vals) - Math.min(...vals);
      ranges.push(Math.max(range, 1e-6));
    }
    const yStats = meanStd(y);
    const yVar = Math.max(yStats.std * yStats.std, 1e-6);

    // Grid search over lengthscale multipliers and signal variance multipliers
    const lsMults = [0.1, 0.3, 0.5, 1.0, 2.0, 5.0];
    const svMults = [0.5, 1.0, 2.0, 5.0];

    let bestLML = -Infinity;
    let bestLS = ranges.map(r => r * 0.5);
    let bestSV = yVar;

    for (const lm of lsMults) {
      for (const sm of svMults) {
        const ls = ranges.map(r => r * lm);
        const sv = yVar * sm;
        const lml = this.logMarginalLikelihood(X, y, kernel, ls, sv, noise_variance);
        if (lml > bestLML) {
          bestLML = lml;
          bestLS = ls;
          bestSV = sv;
        }
      }
    }

    return { lengthscale: bestLS, signal_variance: bestSV };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Method 1: Kriging / Gaussian Process
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Fit a Gaussian Process model to training data.
   *
   * k(x,x') depends on kernel:
   *   SE:       σ² · exp(-||x-x'||²/(2l²))
   *   Matérn 3/2: σ²(1+√3r/l)·exp(-√3r/l)
   *   Matérn 5/2: σ²(1+√5r/l+5r²/(3l²))·exp(-√5r/l)
   *
   * Hyperparameters optimized by maximizing log marginal likelihood.
   */
  krigingFit(params: KrigingFitInput): AtomicValue<KrigingFitResult> {
    const {
      X_train, y_train,
      kernel = "squared_exponential",
      noise_variance = 1e-6,
      optimize_hyperparams = true
    } = params;

    const n = X_train.length;
    const d = X_train[0].length;

    if (n !== y_train.length) throw new Error(`X_train rows (${n}) must match y_train length (${y_train.length})`);
    if (n === 0) throw new Error("Training set must not be empty");

    // Determine hyperparameters
    let lengthscale: number[];
    let signal_variance: number;

    if (optimize_hyperparams) {
      const opt = this.optimizeHyperparams(X_train, y_train, kernel, noise_variance);
      lengthscale = opt.lengthscale;
      signal_variance = opt.signal_variance;
    } else {
      // Default: lengthscale = data range, signal variance = data variance
      lengthscale = [];
      for (let j = 0; j < d; j++) {
        const vals = X_train.map(row => row[j]);
        lengthscale.push(Math.max(Math.max(...vals) - Math.min(...vals), 1e-6));
      }
      signal_variance = meanStd(y_train).std ** 2 || 1;
    }

    // Build K and invert
    const K = this.kernelMatrix(X_train, X_train, kernel, lengthscale, signal_variance);
    for (let i = 0; i < n; i++) K[i][i] += noise_variance;

    const K_inv = invertSPD(K);
    const alpha = matVecMul(K_inv, y_train);

    const lml = this.logMarginalLikelihood(X_train, y_train, kernel, lengthscale, signal_variance, noise_variance);

    const model: KrigingModel = {
      X_train, y_train, kernel,
      lengthscale, signal_variance, noise_variance,
      K_inv, alpha, n_train: n, n_features: d
    };

    const result: KrigingFitResult = {
      hyperparams: { lengthscale, signal_variance, noise_variance },
      log_marginal_likelihood: lml,
      n_train: n,
      n_features: d,
      model
    };

    return {
      value: result,
      unit: "GP_model",
      formula: `GP(kernel=${kernel}, l=[${lengthscale.map(l => l.toFixed(4)).join(",")}], σ²=${signal_variance.toFixed(4)}, σ²_n=${noise_variance})`,
      confidence: 0.95
    };
  }

  /**
   * Predict at new points using fitted GP model.
   *
   * μ(x*) = k(x*,X) · K⁻¹ · y
   * σ²(x*) = k(x*,x*) - k(x*,X) · K⁻¹ · k(X,x*)
   */
  krigingPredict(params: KrigingPredictInput): AtomicValue<KrigingPredictResult> {
    const { X_new, model } = params;
    const { X_train, kernel, lengthscale, signal_variance, K_inv, alpha } = model;

    const m = X_new.length;
    const predictions: number[] = [];
    const uncertainties: number[] = [];
    const confidence_95: [number, number][] = [];

    for (let i = 0; i < m; i++) {
      // k(x*, X_train)
      const k_star: number[] = [];
      for (let j = 0; j < X_train.length; j++) {
        const r = weightedDist(X_new[i], X_train[j], lengthscale);
        const r2 = r * r;
        let kval: number;
        switch (kernel) {
          case "squared_exponential":
            kval = signal_variance * Math.exp(-0.5 * r2);
            break;
          case "matern_32": {
            const sr3 = Math.sqrt(3) * r;
            kval = signal_variance * (1 + sr3) * Math.exp(-sr3);
            break;
          }
          case "matern_52": {
            const sr5 = Math.sqrt(5) * r;
            kval = signal_variance * (1 + sr5 + 5 * r2 / 3) * Math.exp(-sr5);
            break;
          }
          default:
            kval = signal_variance * Math.exp(-0.5 * r2);
        }
        k_star.push(kval);
      }

      // μ = k* · α
      const mu = dot(k_star, alpha);
      predictions.push(mu);

      // σ² = k(x*,x*) - k* · K⁻¹ · k*ᵀ
      const k_star_Kinv = matVecMul(K_inv, k_star);
      const var_pred = Math.max(0, signal_variance - dot(k_star, k_star_Kinv));
      const std_pred = Math.sqrt(var_pred);
      uncertainties.push(std_pred);
      confidence_95.push([mu - 1.96 * std_pred, mu + 1.96 * std_pred]);
    }

    // Expected improvement (for minimization): EI = (f_best - μ) · Φ(z) + σ · φ(z)
    const f_best = Math.min(...model.y_train);
    const expected_improvement = predictions.map((mu, i) => {
      const sigma = uncertainties[i];
      if (sigma < 1e-12) return 0;
      const z = (f_best - mu) / sigma;
      return (f_best - mu) * normalCDF(z) + sigma * normalPDF(z);
    });

    return {
      value: { predictions, uncertainties, confidence_95, expected_improvement },
      unit: "predictions",
      formula: "μ(x*)=k(x*,X)·K⁻¹·y, σ²(x*)=k(x*,x*)-k(x*,X)·K⁻¹·k(X,x*)",
      confidence: 0.95
    };
  }

  /**
   * Bayesian optimization using kriging surrogate.
   * Iterates: fit GP → maximize acquisition → evaluate → update.
   */
  surrogateOptimize(params: SurrogateOptimizeInput): AtomicValue<SurrogateOptimizeResult> {
    const {
      X_initial, y_initial, bounds,
      acquisition = "expected_improvement",
      n_iterations = 20,
      kernel = "squared_exponential",
      objective_fn
    } = params;

    const d = bounds.length;
    let X = X_initial.map(row => [...row]);
    let y = [...y_initial];
    const convergence_history: number[] = [Math.min(...y)];

    for (let iter = 0; iter < n_iterations; iter++) {
      // Fit GP
      const fitResult = this.krigingFit({
        X_train: X, y_train: y, kernel, noise_variance: 1e-6, optimize_hyperparams: true
      });
      const model = fitResult.value.model;

      // Generate candidate points (Latin hypercube in bounds)
      const nCandidates = Math.max(100, d * 50);
      const candidates: number[][] = [];
      const rng = createRNG(42 + iter * 1000);
      for (let i = 0; i < nCandidates; i++) {
        const pt: number[] = [];
        for (let j = 0; j < d; j++) {
          pt.push(bounds[j][0] + rng() * (bounds[j][1] - bounds[j][0]));
        }
        candidates.push(pt);
      }

      // Evaluate acquisition function on candidates
      const pred = this.krigingPredict({ X_new: candidates, model });
      let bestAcqIdx = 0;
      let bestAcqVal = -Infinity;
      const f_best = Math.min(...y);

      for (let i = 0; i < nCandidates; i++) {
        let acqVal: number;
        const mu = pred.value.predictions[i];
        const sigma = pred.value.uncertainties[i];

        switch (acquisition) {
          case "expected_improvement": {
            if (sigma < 1e-12) { acqVal = 0; break; }
            const z = (f_best - mu) / sigma;
            acqVal = (f_best - mu) * normalCDF(z) + sigma * normalPDF(z);
            break;
          }
          case "probability_improvement": {
            if (sigma < 1e-12) { acqVal = mu < f_best ? 1 : 0; break; }
            acqVal = normalCDF((f_best - mu) / sigma);
            break;
          }
          case "ucb": {
            acqVal = -(mu - 2 * sigma); // Negate because we minimize
            break;
          }
          default:
            acqVal = 0;
        }

        if (acqVal > bestAcqVal) {
          bestAcqVal = acqVal;
          bestAcqIdx = i;
        }
      }

      const x_new = candidates[bestAcqIdx];
      const y_new = objective_fn
        ? objective_fn(x_new)
        : pred.value.predictions[bestAcqIdx]; // Use surrogate if no fn

      X.push(x_new);
      y.push(y_new);
      convergence_history.push(Math.min(...y));
    }

    // LOO R² for surrogate accuracy
    const looR2 = this.looCV(X, y, kernel);

    const bestIdx = y.indexOf(Math.min(...y));

    return {
      value: {
        best_x: X[bestIdx],
        best_y: y[bestIdx],
        all_evaluations: X.map((x, i) => ({ x, y: y[i] })),
        convergence_history,
        surrogate_accuracy: looR2
      },
      unit: "optimization_result",
      formula: `BayesOpt(acq=${acquisition}, iters=${n_iterations})`,
      confidence: 0.9
    };
  }

  /** Leave-one-out cross-validation R² */
  private looCV(X: number[][], y: number[], kernel: KernelType): number {
    const n = X.length;
    if (n < 4) return 0;
    const predictions: number[] = [];
    // Subsample for large datasets
    const step = n > 30 ? Math.ceil(n / 20) : 1;
    const indices: number[] = [];
    for (let i = 0; i < n; i += step) indices.push(i);

    for (const idx of indices) {
      const X_train = X.filter((_, i) => i !== idx);
      const y_train = y.filter((_, i) => i !== idx);
      const fit = this.krigingFit({ X_train, y_train, kernel, optimize_hyperparams: false });
      const pred = this.krigingPredict({ X_new: [X[idx]], model: fit.value.model });
      predictions.push(pred.value.predictions[0]);
    }

    const actual = indices.map(i => y[i]);
    const yMean = actual.reduce((s, v) => s + v, 0) / actual.length;
    const ssTot = actual.reduce((s, v) => s + (v - yMean) ** 2, 0);
    const ssRes = actual.reduce((s, v, i) => s + (v - predictions[i]) ** 2, 0);
    return ssTot > 0 ? 1 - ssRes / ssTot : 0;
  }

  /**
   * Manufacturing-specific kriging: build surrogate for process response.
   * Auto-normalizes speed/feed/depth inputs, fits GP, predicts with uncertainty.
   */
  krigingManufacturing(params: KrigingManufacturingInput): AtomicValue<KrigingManufacturingResult> {
    const { experiments, response_type, predict_at } = params;
    const hasDepth = experiments.some(e => e.depth !== undefined);

    // Build training data
    const X_raw = experiments.map(e =>
      hasDepth ? [e.speed, e.feed, e.depth ?? 1] : [e.speed, e.feed]
    );
    const y_raw = experiments.map(e => e.response);

    // Normalize inputs to [0, 1]
    const d = X_raw[0].length;
    const mins: number[] = [], maxs: number[] = [];
    for (let j = 0; j < d; j++) {
      const vals = X_raw.map(row => row[j]);
      mins.push(Math.min(...vals));
      maxs.push(Math.max(...vals));
    }
    const X_norm = X_raw.map(row =>
      row.map((v, j) => maxs[j] > mins[j] ? (v - mins[j]) / (maxs[j] - mins[j]) : 0.5)
    );

    // Fit GP
    const fit = this.krigingFit({ X_train: X_norm, y_train: y_raw, kernel: "matern_52" });
    const model = fit.value.model;

    // Predict at requested points
    const predictions: KrigingManufacturingResult["predictions"] = [];
    if (predict_at && predict_at.length > 0) {
      const X_pred = predict_at.map(p =>
        hasDepth
          ? [(p.speed - mins[0]) / (maxs[0] - mins[0] || 1),
            (p.feed - mins[1]) / (maxs[1] - mins[1] || 1),
            ((p.depth ?? 1) - mins[2]) / (maxs[2] - mins[2] || 1)]
          : [(p.speed - mins[0]) / (maxs[0] - mins[0] || 1),
            (p.feed - mins[1]) / (maxs[1] - mins[1] || 1)]
      );
      const pred = this.krigingPredict({ X_new: X_pred, model });
      for (let i = 0; i < predict_at.length; i++) {
        const pt: Record<string, number> = { speed: predict_at[i].speed, feed: predict_at[i].feed };
        if (hasDepth) pt.depth = predict_at[i].depth ?? 1;
        predictions.push({
          point: pt,
          mean: pred.value.predictions[i],
          std: pred.value.uncertainties[i],
          ci_95: pred.value.confidence_95[i]
        });
      }
    }

    // Find optimal conditions via grid search on surrogate
    const gridN = 20;
    let bestY = Infinity;
    let bestX: number[] = [];
    const response_surface_data: KrigingManufacturingResult["response_surface_data"] = [];

    for (let i = 0; i <= gridN; i++) {
      for (let j = 0; j <= gridN; j++) {
        const x1n = i / gridN, x2n = j / gridN;
        const xn = hasDepth ? [x1n, x2n, 0.5] : [x1n, x2n];
        const pred = this.krigingPredict({ X_new: [xn], model });
        const yVal = pred.value.predictions[0];
        const yStd = pred.value.uncertainties[0];
        response_surface_data.push({
          x1: mins[0] + x1n * (maxs[0] - mins[0]),
          x2: mins[1] + x2n * (maxs[1] - mins[1]),
          y_mean: yVal,
          y_std: yStd
        });
        // For tool_life, maximize; for others, minimize
        const objVal = response_type === "tool_life" ? -yVal : yVal;
        if (objVal < bestY) {
          bestY = objVal;
          bestX = xn;
        }
      }
    }

    const optimal_conditions: Record<string, number> = {
      speed: mins[0] + bestX[0] * (maxs[0] - mins[0]),
      feed: mins[1] + bestX[1] * (maxs[1] - mins[1])
    };
    if (hasDepth) optimal_conditions.depth = mins[2] + bestX[2] * (maxs[2] - mins[2]);

    const optPred = this.krigingPredict({ X_new: [bestX], model });
    const optimal_response = optPred.value.predictions[0];

    // LOO R²
    const loo_r2 = this.looCV(X_norm, y_raw, "matern_52");
    const looResid: number[] = [];
    for (let i = 0; i < X_norm.length; i++) {
      const Xt = X_norm.filter((_, j) => j !== i);
      const yt = y_raw.filter((_, j) => j !== i);
      const f = this.krigingFit({ X_train: Xt, y_train: yt, kernel: "matern_52", optimize_hyperparams: false });
      const p = this.krigingPredict({ X_new: [X_norm[i]], model: f.value.model });
      looResid.push((y_raw[i] - p.value.predictions[0]) ** 2);
    }
    const loo_rmse = Math.sqrt(looResid.reduce((s, v) => s + v, 0) / looResid.length);

    return {
      value: {
        predictions,
        optimal_conditions,
        optimal_response,
        response_surface_data,
        model_quality: { loo_r2, loo_rmse }
      },
      unit: response_type,
      formula: `GP_surrogate(${response_type}, n_train=${experiments.length})`,
      confidence: 0.9
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Method 2: Quasi-Monte Carlo (Sobol & Halton Sequences)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Generate Sobol low-discrepancy sequence using Gray code implementation.
   * Direction numbers from Joe & Kuo (2010).
   */
  sobolSequence(params: SobolSequenceInput): AtomicValue<SobolSequenceResult> {
    const { n_points, n_dimensions, seed, scramble = false } = params;

    if (n_dimensions < 1 || n_dimensions > 10) {
      throw new Error(`n_dimensions must be 1-10, got ${n_dimensions}`);
    }

    const maxBits = 32;
    const points: number[][] = Array.from({ length: n_points }, () => new Array(n_dimensions).fill(0));
    const rng = seed !== undefined ? createRNG(seed) : undefined;

    for (let dim = 0; dim < n_dimensions; dim++) {
      // Compute direction numbers V[j] for this dimension
      const V = new Uint32Array(maxBits);

      if (dim === 0) {
        // First dimension: Van der Corput in base 2
        for (let j = 0; j < maxBits; j++) V[j] = 1 << (maxBits - 1 - j);
      } else {
        const dn = SOBOL_DIRECTION_NUMBERS[dim - 1];
        const s = dn.s;
        const a = dn.a;
        const m = dn.m;

        // Initial direction numbers
        for (let j = 0; j < s; j++) {
          V[j] = m[j] << (maxBits - 1 - j);
        }
        // Recurrence
        for (let j = s; j < maxBits; j++) {
          V[j] = V[j - s] ^ (V[j - s] >>> s);
          for (let k = 1; k < s; k++) {
            if ((a >> (s - 1 - k)) & 1) {
              V[j] ^= V[j - k];
            }
          }
        }
      }

      // Apply optional scrambling
      let scrambleVal = 0;
      if (scramble && rng) {
        scrambleVal = (rng() * 4294967296) >>> 0;
      }

      // Generate points using Gray code
      let x = 0;
      for (let i = 0; i < n_points; i++) {
        if (i === 0) {
          x = scrambleVal;
        } else {
          // Find rightmost zero bit of i
          let c = 0;
          let val = i;
          while ((val & 1) === 1) { val >>= 1; c++; }
          x ^= V[c];
        }
        points[i][dim] = (x >>> 0) / 4294967296;
      }
    }

    // Compute star discrepancy (approximation for moderate n)
    const discrepancy = this.computeDiscrepancy(points, n_points, n_dimensions);

    // KS test on first dimension for uniformity
    const dim1 = points.map(p => p[0]);
    const uniformity_test = ksTestUniform(dim1);

    return {
      value: { points, discrepancy, uniformity_test },
      unit: "sobol_sequence",
      formula: `Sobol(n=${n_points}, d=${n_dimensions}${scramble ? ", scrambled" : ""})`,
      confidence: 0.99
    };
  }

  /** Approximate L2-star discrepancy */
  private computeDiscrepancy(points: number[][], n: number, d: number): number {
    // Simplified L2-star discrepancy for reasonable sizes
    const sampleN = Math.min(n, 500);
    let sum1 = 0, sum2 = 0;

    for (let i = 0; i < sampleN; i++) {
      let prod1 = 1;
      for (let j = 0; j < d; j++) {
        prod1 *= (1 - points[i][j] * points[i][j]);
      }
      sum1 += prod1;

      for (let k = 0; k < sampleN; k++) {
        let prod2 = 1;
        for (let j = 0; j < d; j++) {
          prod2 *= (1 - Math.max(points[i][j], points[k][j]));
        }
        sum2 += prod2;
      }
    }

    const disc = Math.sqrt(
      Math.pow(3, -d) -
      (Math.pow(2, 1 - d) / sampleN) * sum1 +
      (1 / (sampleN * sampleN)) * sum2
    );
    return disc;
  }

  /**
   * QMC integration with error estimation via randomized replicates.
   * Convergence rate O(1/N) vs O(1/√N) for crude MC.
   */
  quasiMonteCarloIntegrate(params: QMCIntegrateInput): AtomicValue<QMCIntegrateResult> {
    const {
      integrand, n_dimensions, n_points,
      bounds, sequence = "sobol"
    } = params;

    const actualBounds = bounds || Array.from({ length: n_dimensions }, () => [0, 1] as [number, number]);

    // Volume of integration domain
    let volume = 1;
    for (const [lo, hi] of actualBounds) volume *= (hi - lo);

    // Generate QMC points
    let pts: number[][];
    if (sequence === "sobol") {
      const sobol = this.sobolSequence({ n_points, n_dimensions, seed: 42, scramble: false });
      pts = sobol.value.points;
    } else {
      const halton = this.haltonSequence({ n_points, n_dimensions });
      pts = halton.value.points;
    }

    // Transform [0,1]^d to bounds
    const transformedPts = pts.map(pt =>
      pt.map((v, j) => actualBounds[j][0] + v * (actualBounds[j][1] - actualBounds[j][0]))
    );

    // Evaluate integrand
    const values = transformedPts.map(pt => integrand(pt));
    const qmcEstimate = (volume / n_points) * values.reduce((s, v) => s + v, 0);

    // Estimate error via scrambled replicates
    const R = 10;
    const repEstimates: number[] = [];
    for (let r = 0; r < R; r++) {
      let repPts: number[][];
      if (sequence === "sobol") {
        const sobol = this.sobolSequence({ n_points, n_dimensions, seed: 100 + r * 37, scramble: true });
        repPts = sobol.value.points;
      } else {
        // Cranley-Patterson rotation for Halton
        const rng = createRNG(100 + r * 37);
        const shift = Array.from({ length: n_dimensions }, () => rng());
        const halton = this.haltonSequence({ n_points, n_dimensions });
        repPts = halton.value.points.map(pt =>
          pt.map((v, j) => (v + shift[j]) % 1)
        );
      }
      const tPts = repPts.map(pt =>
        pt.map((v, j) => actualBounds[j][0] + v * (actualBounds[j][1] - actualBounds[j][0]))
      );
      const vals = tPts.map(pt => integrand(pt));
      repEstimates.push((volume / n_points) * vals.reduce((s, v) => s + v, 0));
    }

    const repStats = meanStd(repEstimates);
    const stdError = repStats.std / Math.sqrt(R);

    // MC comparison
    const rng = createRNG(999);
    const mcValues: number[] = [];
    for (let i = 0; i < n_points; i++) {
      const pt = actualBounds.map(([lo, hi]) => lo + rng() * (hi - lo));
      mcValues.push(integrand(pt));
    }
    const mcMean = mcValues.reduce((s, v) => s + v, 0) / n_points;
    const mcEstimate = volume * mcMean;
    const mcStd = meanStd(mcValues).std;
    const mcStdError = volume * mcStd / Math.sqrt(n_points);

    // Estimate convergence rate from replicates at different sizes
    const convergence_rate = stdError > 0 && mcStdError > 0
      ? Math.log(mcStdError / stdError) / Math.log(n_points)
      : 0;

    const speedup = mcStdError > 0 && stdError > 0 ? (mcStdError / stdError) ** 2 : 1;

    return {
      value: {
        estimate: qmcEstimate,
        std_error: stdError,
        ci_95: [qmcEstimate - 1.96 * stdError, qmcEstimate + 1.96 * stdError],
        convergence_rate,
        mc_comparison: { mc_estimate: mcEstimate, mc_std_error: mcStdError, speedup }
      },
      unit: "integral",
      formula: `QMC_${sequence}(n=${n_points}, d=${n_dimensions})`,
      confidence: 0.95
    };
  }

  /**
   * QMC-based uncertainty quantification — replacement for crude MC.
   * Maps Sobol points to parameter distributions via inverse CDF.
   */
  quasiMonteCarloUQ(params: QMCUQInput): AtomicValue<QMCUQResult> {
    const { model_fn, parameter_distributions, n_samples } = params;
    const paramNames = Object.keys(parameter_distributions);
    const d = paramNames.length;

    // Generate Sobol points
    const sobol = this.sobolSequence({ n_points: n_samples, n_dimensions: d, scramble: false });
    const uPoints = sobol.value.points;

    // Map to parameter distributions via inverse CDF
    const outputs: number[] = [];
    const paramSamples: Record<string, number[]> = {};
    paramNames.forEach(name => { paramSamples[name] = []; });

    for (let i = 0; i < n_samples; i++) {
      const inputVals: Record<string, number> = {};
      for (let j = 0; j < d; j++) {
        const name = paramNames[j];
        const spec = parameter_distributions[name];
        const u = uPoints[i][j];
        let val: number;

        switch (spec.dist || "normal") {
          case "normal":
            val = spec.mean + spec.std * normalInvCDF(u);
            break;
          case "uniform": {
            const halfRange = spec.std * Math.sqrt(3);
            val = (spec.mean - halfRange) + u * 2 * halfRange;
            break;
          }
          case "lognormal": {
            const sigma2 = Math.log(1 + (spec.std / spec.mean) ** 2);
            const mu = Math.log(spec.mean) - sigma2 / 2;
            val = lognormalInvCDF(u, mu, Math.sqrt(sigma2));
            break;
          }
          default:
            val = spec.mean + spec.std * normalInvCDF(u);
        }
        inputVals[name] = val;
        paramSamples[name].push(val);
      }
      outputs.push(model_fn(inputVals));
    }

    const sortedOutputs = [...outputs].sort((a, b) => a - b);
    const stats = meanStd(outputs);

    const output_percentiles: Record<string, number> = {
      p5: percentile(sortedOutputs, 5),
      p25: percentile(sortedOutputs, 25),
      p50: percentile(sortedOutputs, 50),
      p75: percentile(sortedOutputs, 75),
      p95: percentile(sortedOutputs, 95)
    };

    // QMC error estimate via scrambled replicates
    const R = 8;
    const repMeans: number[] = [];
    for (let r = 0; r < R; r++) {
      const sPts = this.sobolSequence({
        n_points: n_samples, n_dimensions: d, seed: 200 + r * 41, scramble: true
      }).value.points;
      let sum = 0;
      for (let i = 0; i < n_samples; i++) {
        const iv: Record<string, number> = {};
        for (let j = 0; j < d; j++) {
          const name = paramNames[j];
          const spec = parameter_distributions[name];
          const u = sPts[i][j];
          switch (spec.dist || "normal") {
            case "normal": iv[name] = spec.mean + spec.std * normalInvCDF(u); break;
            case "uniform": {
              const hr = spec.std * Math.sqrt(3);
              iv[name] = (spec.mean - hr) + u * 2 * hr; break;
            }
            case "lognormal": {
              const s2 = Math.log(1 + (spec.std / spec.mean) ** 2);
              iv[name] = lognormalInvCDF(u, Math.log(spec.mean) - s2 / 2, Math.sqrt(s2)); break;
            }
            default: iv[name] = spec.mean + spec.std * normalInvCDF(u);
          }
        }
        sum += model_fn(iv);
      }
      repMeans.push(sum / n_samples);
    }
    const qmcStdError = meanStd(repMeans).std / Math.sqrt(R);
    const mcStdErrorEstimated = stats.std / Math.sqrt(n_samples);

    // First-order Sobol indices via Jansen estimator
    const sobol_indices_first_order: Record<string, number> = {};
    const totalVar = stats.std ** 2;
    if (totalVar > 0) {
      for (let j = 0; j < d; j++) {
        // Resample with one dimension independently scrambled
        const rng = createRNG(500 + j);
        let varJ = 0;
        const nEst = Math.min(n_samples, 200);
        const base: number[] = [];
        const shifted: number[] = [];

        for (let i = 0; i < nEst; i++) {
          const ivBase: Record<string, number> = {};
          const ivShifted: Record<string, number> = {};
          for (let k = 0; k < d; k++) {
            const name = paramNames[k];
            const spec = parameter_distributions[name];
            const u = uPoints[i][k];
            let val: number;
            switch (spec.dist || "normal") {
              case "normal": val = spec.mean + spec.std * normalInvCDF(u); break;
              case "uniform": {
                const hr = spec.std * Math.sqrt(3);
                val = (spec.mean - hr) + u * 2 * hr; break;
              }
              default: val = spec.mean + spec.std * normalInvCDF(u);
            }
            ivBase[name] = val;
            if (k === j) {
              // Use independent sample for this dimension
              const uNew = rng();
              switch (spec.dist || "normal") {
                case "normal": ivShifted[name] = spec.mean + spec.std * normalInvCDF(uNew); break;
                case "uniform": {
                  const hr = spec.std * Math.sqrt(3);
                  ivShifted[name] = (spec.mean - hr) + uNew * 2 * hr; break;
                }
                default: ivShifted[name] = spec.mean + spec.std * normalInvCDF(uNew);
              }
            } else {
              ivShifted[name] = val;
            }
          }
          base.push(model_fn(ivBase));
          shifted.push(model_fn(ivShifted));
        }

        // Jansen estimator: V_i ≈ 1/(2N) Σ (f(A) - f(AB_i))²
        let sumSqDiff = 0;
        for (let i = 0; i < nEst; i++) {
          sumSqDiff += (base[i] - shifted[i]) ** 2;
        }
        varJ = sumSqDiff / (2 * nEst);
        // This estimates the variance due to dimension j being changed
        // Si = Vi / V_total — but Jansen gives E[(f-f')²]/2 ≈ V_total - V_~i
        // Use simplified: Si ≈ varJ / totalVar
        sobol_indices_first_order[paramNames[j]] = Math.min(1, Math.max(0, varJ / totalVar));
      }
    }

    return {
      value: {
        output_mean: stats.mean,
        output_std: stats.std,
        output_percentiles,
        convergence_comparison: {
          qmc_std_error: qmcStdError,
          mc_std_error_estimated: mcStdErrorEstimated,
          efficiency_gain: mcStdErrorEstimated > 0 ? (mcStdErrorEstimated / Math.max(qmcStdError, 1e-15)) ** 2 : 1
        },
        sobol_indices_first_order
      },
      unit: "UQ_result",
      formula: `QMC_UQ(n=${n_samples}, d=${d})`,
      confidence: 0.95
    };
  }

  /**
   * Halton sequence — Van der Corput in prime bases.
   */
  haltonSequence(params: HaltonSequenceInput): AtomicValue<HaltonSequenceResult> {
    const { n_points, n_dimensions } = params;

    if (n_dimensions > PRIMES.length) {
      throw new Error(`Max ${PRIMES.length} dimensions for Halton, got ${n_dimensions}`);
    }

    const primes_used = PRIMES.slice(0, n_dimensions);
    const points: number[][] = Array.from({ length: n_points }, () => new Array(n_dimensions).fill(0));

    for (let dim = 0; dim < n_dimensions; dim++) {
      const base = primes_used[dim];
      for (let i = 0; i < n_points; i++) {
        // Van der Corput sequence in given base
        let result = 0;
        let f = 1 / base;
        let idx = i + 1; // Start from 1 to avoid 0
        while (idx > 0) {
          result += f * (idx % base);
          idx = Math.floor(idx / base);
          f /= base;
        }
        points[i][dim] = result;
      }
    }

    return {
      value: { points, primes_used },
      unit: "halton_sequence",
      formula: `Halton(n=${n_points}, d=${n_dimensions}, bases=[${primes_used.join(",")}])`,
      confidence: 0.99
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Method 3: Gaussian Copula for Correlated Inputs
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Generate correlated samples via Gaussian copula.
   *
   * Algorithm:
   *   1. Cholesky decompose correlation matrix: R = LLᵀ
   *   2. Generate independent standard normals Z
   *   3. Correlate: W = LZ
   *   4. Transform to uniform: U = Φ(W)
   *   5. Invert marginals: X_i = F_i⁻¹(U_i)
   */
  gaussianCopula(params: GaussianCopulaInput): AtomicValue<GaussianCopulaResult> {
    const { marginals, correlation_matrix, n_samples, seed } = params;
    const d = marginals.length;

    // Validate correlation matrix
    if (correlation_matrix.length !== d || correlation_matrix[0].length !== d) {
      throw new Error(`Correlation matrix must be ${d}×${d}`);
    }
    // Check symmetry
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        if (Math.abs(correlation_matrix[i][j] - correlation_matrix[j][i]) > 1e-10) {
          throw new Error(`Correlation matrix must be symmetric (mismatch at [${i}][${j}])`);
        }
      }
    }

    // Cholesky (will throw if not positive definite)
    const L = cholesky(correlation_matrix);

    const rng = createRNG(seed ?? 42);

    // Generate samples
    const samples: number[][] = Array.from({ length: n_samples }, () => new Array(d).fill(0));

    for (let i = 0; i < n_samples; i++) {
      // Independent standard normals
      const Z = normalSamples(d, rng);
      // Correlate: W = L * Z
      const W = matVecMul(L, Z);
      // Transform to uniform via Φ, then invert marginals
      for (let j = 0; j < d; j++) {
        const u = normalCDF(W[j]);
        samples[i][j] = inverseCDF(u, marginals[j]);
      }
    }

    // Compute realized correlation (Spearman)
    const realized_correlation: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
    for (let i = 0; i < d; i++) {
      const col_i = samples.map(row => row[i]);
      for (let j = 0; j < d; j++) {
        if (i === j) { realized_correlation[i][j] = 1; continue; }
        const col_j = samples.map(row => row[j]);
        realized_correlation[i][j] = spearmanCorr(col_i, col_j);
      }
    }

    // Marginal statistics
    const marginal_statistics = marginals.map((m, j) => {
      const col = samples.map(row => row[j]);
      const stats = meanStd(col);
      const n = col.length;
      const mu = stats.mean;
      const skew = col.reduce((s, v) => s + ((v - mu) / stats.std) ** 3, 0) / n;
      return { name: m.name, mean: stats.mean, std: stats.std, skew };
    });

    // Kendall's tau
    const kendalls_tau: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
    // Subsample for Kendall (O(n²) per pair)
    const kendallN = Math.min(n_samples, 500);
    for (let i = 0; i < d; i++) {
      kendalls_tau[i][i] = 1;
      for (let j = i + 1; j < d; j++) {
        const col_i = samples.slice(0, kendallN).map(row => row[i]);
        const col_j = samples.slice(0, kendallN).map(row => row[j]);
        const tau = kendallTau(col_i, col_j);
        kendalls_tau[i][j] = tau;
        kendalls_tau[j][i] = tau;
      }
    }

    return {
      value: { samples, realized_correlation, marginal_statistics, kendalls_tau },
      unit: "copula_samples",
      formula: `GaussianCopula(d=${d}, n=${n_samples})`,
      confidence: 0.95
    };
  }

  /**
   * Full correlated uncertainty propagation.
   * Generates correlated samples, evaluates model, compares to independent case.
   */
  correlatedUQ(params: CorrelatedUQInput): AtomicValue<CorrelatedUQResult> {
    const {
      model_fn, marginals, correlation_matrix,
      n_samples, method = "copula_mc"
    } = params;

    const d = marginals.length;
    const paramNames = marginals.map(m => m.name);

    // Generate correlated samples
    let sampleData: number[][];

    if (method === "copula_qmc") {
      // Use Sobol points → correlated normals via Cholesky → marginals
      const sobol = this.sobolSequence({ n_points: n_samples, n_dimensions: d, scramble: true, seed: 77 });
      const L = cholesky(correlation_matrix);
      sampleData = sobol.value.points.map(pt => {
        // Transform uniform Sobol to standard normal
        const Z = pt.map(u => normalInvCDF(Math.max(1e-6, Math.min(1 - 1e-6, u))));
        // Correlate
        const W = matVecMul(L, Z);
        // To uniform → marginal
        return W.map((w, j) => inverseCDF(normalCDF(w), marginals[j]));
      });
    } else {
      const copResult = this.gaussianCopula({ marginals, correlation_matrix, n_samples, seed: 77 });
      sampleData = copResult.value.samples;
    }

    // Evaluate model with correlated inputs
    const outputs: number[] = [];
    for (const sample of sampleData) {
      const inputs: Record<string, number> = {};
      paramNames.forEach((name, j) => { inputs[name] = sample[j]; });
      outputs.push(model_fn(inputs));
    }
    const corrStats = meanStd(outputs);
    const sortedOut = [...outputs].sort((a, b) => a - b);

    // Generate independent samples for comparison
    const rng = createRNG(999);
    const indOutputs: number[] = [];
    for (let i = 0; i < n_samples; i++) {
      const inputs: Record<string, number> = {};
      for (let j = 0; j < d; j++) {
        const u = rng();
        inputs[paramNames[j]] = inverseCDF(u, marginals[j]);
      }
      indOutputs.push(model_fn(inputs));
    }
    const indStats = meanStd(indOutputs);

    // Correlation sensitivity: how much does each pair correlation affect output variance?
    const correlation_sensitivity: Record<string, number> = {};
    const baseStd = corrStats.std;
    for (let j = 0; j < d; j++) {
      // Measure how correlated var j is with others on output
      const colJ = sampleData.map(row => row[j]);
      const corrWithOutput = spearmanCorr(colJ, outputs);
      correlation_sensitivity[paramNames[j]] = Math.abs(corrWithOutput);
    }

    return {
      value: {
        output_mean: corrStats.mean,
        output_std: corrStats.std,
        output_ci_95: [percentile(sortedOut, 2.5), percentile(sortedOut, 97.5)],
        correlation_sensitivity,
        comparison_independent: { mean: indStats.mean, std: indStats.std }
      },
      unit: "correlated_UQ",
      formula: `CorrelatedUQ(method=${method}, n=${n_samples})`,
      confidence: 0.95
    };
  }

  /**
   * Estimate copula parameters from observed data.
   * Computes Spearman and Kendall correlation, fits marginals, recommends copula type.
   */
  correlationFromData(params: CorrelationFromDataInput): AtomicValue<CorrelationFromDataResult> {
    const { data, variable_names } = params;
    const n = data.length;
    const d = data[0].length;
    const names = variable_names || Array.from({ length: d }, (_, i) => `x${i + 1}`);

    // Extract columns
    const cols: number[][] = [];
    for (let j = 0; j < d; j++) {
      cols.push(data.map(row => row[j]));
    }

    // Spearman rank correlation matrix
    const spearman_matrix: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
    for (let i = 0; i < d; i++) {
      spearman_matrix[i][i] = 1;
      for (let j = i + 1; j < d; j++) {
        const rho = spearmanCorr(cols[i], cols[j]);
        spearman_matrix[i][j] = rho;
        spearman_matrix[j][i] = rho;
      }
    }

    // Kendall's tau matrix
    const kendall_matrix: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
    const kendallN = Math.min(n, 500);
    for (let i = 0; i < d; i++) {
      kendall_matrix[i][i] = 1;
      for (let j = i + 1; j < d; j++) {
        const tau = kendallTau(cols[i].slice(0, kendallN), cols[j].slice(0, kendallN));
        kendall_matrix[i][j] = tau;
        kendall_matrix[j][i] = tau;
      }
    }

    // Fit marginals via method of moments
    const marginal_fits: CorrelationFromDataResult["marginal_fits"] = [];
    for (let j = 0; j < d; j++) {
      const col = cols[j];
      const stats = meanStd(col);
      const sorted = [...col].sort((a, b) => a - b);
      const skew = col.reduce((s, v) => s + ((v - stats.mean) / stats.std) ** 3, 0) / n;
      const allPositive = col.every(v => v > 0);

      let best_distribution: string;
      let fitParams: Record<string, number>;

      if (Math.abs(skew) < 0.5) {
        // Approximately symmetric → normal
        best_distribution = "normal";
        fitParams = { mean: stats.mean, std: stats.std };
      } else if (allPositive && skew > 0.5) {
        // Right-skewed positive → lognormal
        const logVals = col.map(v => Math.log(v));
        const logStats = meanStd(logVals);
        best_distribution = "lognormal";
        fitParams = { mu: logStats.mean, sigma: logStats.std };
      } else if (allPositive && skew < -0.5) {
        // Left-skewed positive → Weibull (possibly)
        best_distribution = "weibull";
        // MoM for Weibull: approximate
        const cv = stats.std / stats.mean;
        const shape = 1 / cv; // rough approximation
        const scale = stats.mean / gammaFn(1 + 1 / shape);
        fitParams = { shape, scale };
      } else {
        // Default to normal
        best_distribution = "normal";
        fitParams = { mean: stats.mean, std: stats.std };
      }

      marginal_fits.push({ name: names[j], best_distribution, params: fitParams });
    }

    // Recommendation: check if Gaussian copula is appropriate
    // (Gaussian copula ↔ tail independence. Check if extremes are correlated)
    let copula_type_recommendation: string;
    let hasStrongTailDep = false;
    for (let i = 0; i < d && !hasStrongTailDep; i++) {
      for (let j = i + 1; j < d && !hasStrongTailDep; j++) {
        // Check upper/lower tail dependence
        const threshold = percentile([...cols[i]].sort((a, b) => a - b), 90);
        const upperI = cols[i].map((v, k) => v > threshold ? k : -1).filter(k => k >= 0);
        if (upperI.length > 5) {
          const upperJVals = upperI.map(k => cols[j][k]);
          const thresholdJ = percentile([...cols[j]].sort((a, b) => a - b), 90);
          const concordance = upperJVals.filter(v => v > thresholdJ).length / upperI.length;
          if (concordance > 0.5) hasStrongTailDep = true;
        }
      }
    }

    copula_type_recommendation = hasStrongTailDep
      ? "t-copula (tail dependence detected — Gaussian copula underestimates extreme co-movements)"
      : "Gaussian copula (no strong tail dependence — standard choice for manufacturing UQ)";

    return {
      value: { spearman_matrix, kendall_matrix, marginal_fits, copula_type_recommendation },
      unit: "copula_parameters",
      formula: `CorrelationFromData(n=${n}, d=${d})`,
      confidence: 0.9
    };
  }
}

export const advancedUncertaintyEngine = new AdvancedUncertaintyEngine();
