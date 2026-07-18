// @ts-nocheck
import { SystemIdentificationEngine } from "./SystemIdentificationEngine.js";

/**
 * PRISM MCP Server — Adaptive Calibration Engine
 *
 * Self-calibrating / self-improving physics formulas that update their
 * coefficients from live production data.  Six methods covering the
 * major calibration paradigms used in precision manufacturing:
 *
 *  1. bayesianKienzleUpdate   — Conjugate-normal Bayesian update of Kienzle kc1.1 / mc
 *  2. taylorCoefficientTracker — Kalman filter on Taylor tool-life coefficients
 *  3. surfaceFinishBiasCorrector — Bootstrap BCa bias correction for Ra prediction
 *  4. processDriftCompensator — CUSUM drift detection + linear compensation
 *  5. thermalModelCalibrator  — Gradient-descent calibration of multi-τ thermal model
 *  6. modelSelector           — AIC / BIC model comparison with Nelder-Mead fitting
 *
 * References:
 *  - Kienzle (1952) — Specific cutting force model
 *  - Taylor (1907)  — Tool-life equation V·T^n = C
 *  - Welford / Knuth online variance
 *  - Page (1954) — CUSUM procedure
 *  - Efron (1987) — BCa bootstrap confidence intervals
 *  - Akaike (1974) — AIC;  Schwarz (1978) — BIC
 *  - Nelder & Mead (1965) — Simplex optimisation
 *  - Kalman (1960) — Optimal linear filter
 *  - Abramowitz & Stegun (1964) — Rational approximation for Φ(x)
 *  - Park & Miller (1988) — Minimal standard PRNG (MINSTD)
 *
 * @module AdaptiveCalibrationEngine
 */

// ============================================================================
// INTERFACES
// ============================================================================

/** Single force measurement for Kienzle update */
export interface KienzleMeasurement {
  /** Measured cutting force in Newtons */
  force_N: number;
  /** Uncut chip thickness h = f·sin(κr) in mm */
  chipThickness_mm: number;
  /** Chip width b = ap/sin(κr) in mm */
  chipWidth_mm: number;
}

/** Input for bayesianKienzleUpdate */
export interface BayesKienzleInput {
  kc11Prior: number;
  kc11PriorStdDev: number;
  mcPrior: number;
  mcPriorStdDev: number;
  measurements: KienzleMeasurement[];
  measurementStdDev: number;
}

/** Output of bayesianKienzleUpdate */
export interface BayesKienzleResult {
  kc11Posterior: number;
  kc11PosteriorStdDev: number;
  mcPosterior: number;
  mcPosteriorStdDev: number;
  credibleInterval95: { kc11: [number, number]; mc: [number, number] };
  nObservations: number;
  posteriorImprovement: number;
}

/** Single tool-life observation */
export interface TaylorObservation {
  speed_mpm: number;
  toolLife_min: number;
}

/** Input for taylorCoefficientTracker */
export interface TaylorTrackerInput {
  priorC: number;
  priorN: number;
  observations: TaylorObservation[];
  processNoise?: number;
  measurementNoise?: number;
}

/** State snapshot of Taylor coefficients */
export interface TaylorState {
  C: number;
  n: number;
}

/** Output of taylorCoefficientTracker */
export interface TaylorTrackerResult {
  updatedC: number;
  updatedN: number;
  cStdDev: number;
  nStdDev: number;
  kalmanGains: number[];
  residuals: number[];
  stateHistory: TaylorState[];
  predictionAtSpeed: (v: number) => number;
}

/** Input for surfaceFinishBiasCorrector */
export interface BiasInput {
  predictions: number[];
  measurements: number[];
  confidenceLevel?: number;
  nBootstrap?: number;
  seed?: number;
}

/** Output of surfaceFinishBiasCorrector */
export interface BiasResult {
  meanBias: number;
  biasCI: [number, number];
  biasSignificant: boolean;
  correctionFactor: number;
  correctedPredictions: number[];
  rmseOriginal: number;
  rmseCorrected: number;
  improvementPercent: number;
}

/** Input for processDriftCompensator */
export interface DriftInput {
  measurements: number[];
  target: number;
  sigma: number;
  cusumK?: number;
  cusumH?: number;
}

/** Output of processDriftCompensator */
export interface DriftResult {
  driftDetected: boolean;
  driftOnsetIndex: number | null;
  driftRate_perPart: number;
  compensationOffsets: number[];
  projectedPartsUntilOOT: number;
  currentOffset: number;
}

/** Input for thermalModelCalibrator */
export interface ThermalCalInput {
  timePoints: number[];
  measuredDisplacements: number[];
  nTimeConstants?: number;
  learningRate?: number;
  maxIterations?: number;
}

/** Output of thermalModelCalibrator */
export interface ThermalCalResult {
  amplitudes: number[];
  timeConstants: number[];
  linearDrift: number;
  fittedValues: number[];
  residuals: number[];
  rmse: number;
  rSquared: number;
  predictAt: (t: number) => number;
}

/** Candidate model definition for modelSelector */
export interface CandidateModel {
  name: string;
  fn: (x: number, params: number[]) => number;
  nParams: number;
  initialParams: number[];
}

/** Ranking entry in model selection output */
export interface ModelRanking {
  name: string;
  aic: number;
  bic: number;
  rSquared: number;
  params: number[];
  akaikeWeight: number;
}

/** Input for modelSelector */
export interface ModelSelectInput {
  x: number[];
  y: number[];
  candidateModels: CandidateModel[];
}

/** Output of modelSelector */
export interface ModelSelectResult {
  rankings: ModelRanking[];
  bestModel: string;
  bestParams: number[];
  predictions: number[];
}

// ============================================================================
// HELPERS — Numerical Utilities
// ============================================================================

/**
 * Park-Miller MINSTD PRNG (1988).
 * Returns values in (0, 1).  Period 2^31 − 2.
 */
class SeededRNG {
  private state: number;
  private static readonly A = 16807;
  private static readonly M = 2147483647; // 2^31 - 1

  constructor(seed: number) {
    this.state = ((seed % SeededRNG.M) + SeededRNG.M) % SeededRNG.M || 1;
  }

  next(): number {
    this.state = (this.state * SeededRNG.A) % SeededRNG.M;
    return this.state / SeededRNG.M;
  }
}

/**
 * Standard normal CDF Φ(x) via Abramowitz & Stegun 26.2.17
 * (rational approximation, |ε| < 7.5 × 10⁻⁸).
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 0.5 * (1.0 + sign * y);
}

/**
 * Inverse normal CDF (quantile function) via rational approximation.
 * Beasley-Springer-Moro algorithm.
 */
function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Rational approximation for central region
  const a = [
    -3.969683028665376e1, 2.209460984245205e2,
    -2.759285104469687e2, 1.383577518672690e2,
    -3.066479806614716e1, 2.506628277459239e0
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2,
    -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1,
    -2.400758277161838e0, -2.549732539343734e0,
    4.374664141464968e0, 2.938163982698783e0
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1,
    2.445134137142996e0, 3.754408661907416e0
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number;
  let r: number;

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

/**
 * Compute mean of an array.
 */
function mean(arr: number[]): number {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}

/**
 * Compute sum of squared residuals.
 */
function ssr(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return s;
}

/**
 * Root mean square error.
 */
function rmse(a: number[], b: number[]): number {
  return Math.sqrt(ssr(a, b) / a.length);
}

/**
 * Coefficient of determination R².
 */
function rSquared(observed: number[], predicted: number[]): number {
  const yMean = mean(observed);
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < observed.length; i++) {
    ssTot += (observed[i] - yMean) ** 2;
    ssRes += (observed[i] - predicted[i]) ** 2;
  }
  return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
}

/**
 * Simple linear regression y = a + b·x.
 * Returns { slope, intercept }.
 */
function linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
  const n = x.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += x[i];
    sy += y[i];
    sxx += x[i] * x[i];
    sxy += x[i] * y[i];
  }
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-30) return { slope: 0, intercept: sy / n };
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Adaptive Calibration Engine
 *
 * Implements self-calibrating physics formulas that update their coefficients
 * from production data using Bayesian inference, Kalman filtering, bootstrap
 * bias correction, CUSUM drift detection, gradient descent, and information-
 * theoretic model selection.
 *
 * Each method is stateless — all prior information is passed via the input
 * object so that callers can persist calibration state externally and replay
 * update sequences.
 */
export class AdaptiveCalibrationEngine {
  private calibrationCount = 0;

  // --------------------------------------------------------------------------
  // 1. bayesianKienzleUpdate
  // --------------------------------------------------------------------------

  /**
   * Bayesian conjugate-normal update of Kienzle specific cutting-force model.
   *
   * The Kienzle model predicts main cutting force as:
   *   F_c = kc1.1 · b · h^(1 − mc)
   * where kc1.1 is the specific cutting force at h = b = 1 mm, mc is the
   * Kienzle exponent, h is uncut chip thickness, and b is chip width.
   *
   * Given a normal prior on kc1.1 and mc, and normal measurement likelihood,
   * the posterior is computed via the standard conjugate update:
   *   μ_post = (σ²_meas · μ_prior + σ²_prior · Σx_i) / (σ²_meas + n · σ²_prior)
   *   σ²_post = (σ²_prior · σ²_meas) / (σ²_meas + n · σ²_prior)
   *
   * For mc, we linearise around the prior via the implied kc1.1 from each
   * observation:  kc_obs = F / (b · h^(1−mc_prior)),
   * then update kc1.1 first, re-derive mc from the log-linear relationship.
   *
   * @param input — Prior parameters and force measurements
   * @returns Posterior parameters with 95 % credible intervals
   *
   * @see Kienzle, O. (1952). "Die Bestimmung von Kräften und Leistungen
   *      an spanenden Werkzeugen und Werkzeugmaschinen."
   */
  bayesianKienzleUpdate(input: BayesKienzleInput): BayesKienzleResult {
    this.calibrationCount++;

    const {
      kc11Prior, kc11PriorStdDev, mcPrior, mcPriorStdDev,
      measurements, measurementStdDev
    } = input;

    const n = measurements.length;
    if (n === 0) {
      return {
        kc11Posterior: kc11Prior,
        kc11PosteriorStdDev: kc11PriorStdDev,
        mcPosterior: mcPrior,
        mcPosteriorStdDev: mcPriorStdDev,
        credibleInterval95: {
          kc11: [kc11Prior - 1.96 * kc11PriorStdDev, kc11Prior + 1.96 * kc11PriorStdDev],
          mc: [mcPrior - 1.96 * mcPriorStdDev, mcPrior + 1.96 * mcPriorStdDev]
        },
        nObservations: 0,
        posteriorImprovement: 0
      };
    }

    // ---- kc1.1 update ----
    // For each measurement derive the implied kc1.1:
    //   kc_obs_i = F_i / (b_i · h_i^(1 - mc_prior))
    const kc11Observations: number[] = [];
    for (const m of measurements) {
      const hPow = Math.pow(m.chipThickness_mm, 1 - mcPrior);
      const kc_obs = m.force_N / (m.chipWidth_mm * hPow);
      kc11Observations.push(kc_obs);
    }

    // Propagated measurement std dev for kc1.1 observations
    // σ_kc ≈ σ_meas / (b_avg · h_avg^(1-mc))  — simplified
    const avgB = mean(measurements.map(m => m.chipWidth_mm));
    const avgHpow = mean(measurements.map(m => Math.pow(m.chipThickness_mm, 1 - mcPrior)));
    const sigmaKc = measurementStdDev / (avgB * avgHpow);

    const priorVar = kc11PriorStdDev * kc11PriorStdDev;
    const measVar = sigmaKc * sigmaKc;

    const sumKc = kc11Observations.reduce((a, b) => a + b, 0);
    const postVar = (priorVar * measVar) / (measVar + n * priorVar);
    const postMean = (measVar * kc11Prior + priorVar * sumKc) / (measVar + n * priorVar);
    const postStd = Math.sqrt(postVar);

    // ---- mc update ----
    // Use log-linear form: ln(F/(b·kc11)) = (1−mc)·ln(h)
    // Derive implied mc from each observation using updated kc1.1:
    //   1 − mc_obs = ln(F/(b·kc11_post)) / ln(h)
    const mcObservations: number[] = [];
    for (const m of measurements) {
      const lnH = Math.log(m.chipThickness_mm);
      if (Math.abs(lnH) < 1e-10) continue; // skip h ≈ 1 mm (no info on mc)
      const lnRatio = Math.log(m.force_N / (m.chipWidth_mm * postMean));
      const mc_obs = 1 - lnRatio / lnH;
      mcObservations.push(mc_obs);
    }

    let mcPostMean = mcPrior;
    let mcPostStd = mcPriorStdDev;
    const nMc = mcObservations.length;

    if (nMc > 0) {
      // Propagated measurement noise on mc observations
      const sigmaMc = measurementStdDev / (avgB * postMean * Math.abs(mean(
        measurements.map(m => Math.log(m.chipThickness_mm))
      )) || 1);
      const mcPriorVar = mcPriorStdDev * mcPriorStdDev;
      const mcMeasVar = sigmaMc * sigmaMc;
      const sumMc = mcObservations.reduce((a, b) => a + b, 0);
      const mcPV = (mcPriorVar * mcMeasVar) / (mcMeasVar + nMc * mcPriorVar);
      mcPostMean = (mcMeasVar * mcPrior + mcPriorVar * sumMc) / (mcMeasVar + nMc * mcPriorVar);
      mcPostStd = Math.sqrt(mcPV);
    }

    // Improvement metric: % reduction in std dev
    const kcImprove = (1 - postStd / kc11PriorStdDev) * 100;
    const mcImprove = (1 - mcPostStd / mcPriorStdDev) * 100;
    const avgImprove = (kcImprove + mcImprove) / 2;

    return {
      kc11Posterior: postMean,
      kc11PosteriorStdDev: postStd,
      mcPosterior: mcPostMean,
      mcPosteriorStdDev: mcPostStd,
      credibleInterval95: {
        kc11: [postMean - 1.96 * postStd, postMean + 1.96 * postStd],
        mc: [mcPostMean - 1.96 * mcPostStd, mcPostMean + 1.96 * mcPostStd]
      },
      nObservations: n,
      posteriorImprovement: Math.max(0, avgImprove)
    };
  }

  // --------------------------------------------------------------------------
  // 2. taylorCoefficientTracker
  // --------------------------------------------------------------------------

  /**
   * Kalman filter tracker for Taylor tool-life equation coefficients.
   *
   * State vector x = [ln(C), n]ᵀ.
   * Measurement model (linearised):  z = ln(T) = ln(C) − n·ln(V) = H·x
   *   where H = [1, −ln(V)].
   *
   * Full predict–update cycle with 2×2 state covariance matrix P:
   *   Predict:  x̂⁻ = x̂⁺(prev),  P⁻ = P⁺(prev) + Q
   *   Update :  K = P⁻·Hᵀ·(H·P⁻·Hᵀ + R)⁻¹
   *             x̂⁺ = x̂⁻ + K·(z − H·x̂⁻)
   *             P⁺ = (I − K·H)·P⁻
   *
   * @param input — Prior C/n, observations, noise parameters
   * @returns Updated coefficients with uncertainty and full state history
   *
   * @see Taylor, F.W. (1907). "On the Art of Cutting Metals."
   * @see Kalman, R.E. (1960). "A New Approach to Linear Filtering
   *      and Prediction Problems."
   */
  taylorCoefficientTracker(input: TaylorTrackerInput): TaylorTrackerResult {
    this.calibrationCount++;

    const {
      priorC, priorN, observations,
      processNoise = 0.01,
      measurementNoise = 0.1
    } = input;

    if (observations.length === 0) {
      return {
        updatedC: priorC, updatedN: priorN,
        cStdDev: 0, nStdDev: 0,
        kalmanGains: [], residuals: [],
        stateHistory: [{ C: priorC, n: priorN }],
        predictionAtSpeed: (v: number) => Math.pow(priorC / Math.max(v, 1), 1 / priorN)
      };
    }

    // Map processNoise → RLS forgetting factor λ:
    //   Higher processNoise → lower λ → more forgetting (faster adaptation)
    //   processNoise=0 → λ=1.0 (no forgetting), processNoise=0.1 → λ≈0.91
    const lambda = Math.max(0.9, 1.0 / (1.0 + processNoise));

    // Initialize RLS estimator for 2 parameters: θ = [ln(C), n]
    // Model: ln(T) = ln(C) − n·ln(V) → y = φᵀθ where φ = [1, −ln(V)]
    const rlsState = SystemIdentificationEngine.rlsInit(2, {
      lambda,
      delta: 1.0, // Initial covariance scale matching Kalman P00=1
    });

    // Set prior: θ₀ = [ln(priorC), priorN]
    rlsState.theta[0] = Math.log(priorC);
    rlsState.theta[1] = priorN;
    // Match Kalman's asymmetric initial uncertainty: P(n,n) = 0.1 (n drifts less)
    rlsState.P[1][1] = 0.1;

    const kalmanGains: number[] = [];
    const residuals: number[] = [];
    const stateHistory: TaylorState[] = [{ C: priorC, n: priorN }];

    for (const obs of observations) {
      const lnV = Math.log(obs.speed_mpm);
      const phi = [1.0, -lnV];
      const y = Math.log(obs.toolLife_min);

      // Pre-update: compute prediction error (innovation) for backward-compat residuals
      const yPred = phi[0] * rlsState.theta[0] + phi[1] * rlsState.theta[1];
      residuals.push(y - yPred);

      // Pre-update: compute RLS gain magnitude for backward-compat kalmanGains
      // K = P·φ / (λ + φᵀ·P·φ)
      const Pphi0 = rlsState.P[0][0] * phi[0] + rlsState.P[0][1] * phi[1];
      const Pphi1 = rlsState.P[1][0] * phi[0] + rlsState.P[1][1] * phi[1];
      const denom = rlsState.lambda + phi[0] * Pphi0 + phi[1] * Pphi1;
      const K0 = Pphi0 / denom;
      const K1 = Pphi1 / denom;
      kalmanGains.push(Math.sqrt(K0 * K0 + K1 * K1));

      // RLS update (modifies rlsState in place)
      SystemIdentificationEngine.rlsUpdate(rlsState, phi, y);

      stateHistory.push({ C: Math.exp(rlsState.theta[0]), n: rlsState.theta[1] });
    }

    // TLS verification: errors-in-variables fit (both speed and life have noise)
    // Provides a robust cross-check against the online RLS estimate
    if (observations.length >= 3) {
      try {
        const Phi = observations.map(o => [1.0, -Math.log(o.speed_mpm)]);
        const yVec = observations.map(o => Math.log(o.toolLife_min));
        const tls = SystemIdentificationEngine.totalLeastSquares(Phi, yVec);
        // If TLS and RLS diverge significantly, the data may have high leverage outliers
        // (diagnostic info — does not override RLS result, which handles forgetting)
        const tlsC = Math.exp(tls.x[0]);
        const tlsN = tls.x[1];
        const rlsC = Math.exp(rlsState.theta[0]);
        const rlsN = rlsState.theta[1];
        // Log divergence for convergence monitoring (>50% relative difference flags concern)
        if (Math.abs(rlsC - tlsC) / Math.max(rlsC, tlsC) > 0.5 ||
            Math.abs(rlsN - tlsN) / Math.max(Math.abs(rlsN), Math.abs(tlsN)) > 0.5) {
          // Significant divergence — RLS may need more data or different forgetting
          // (future: surface this as a diagnostic in result)
        }
      } catch { /* TLS may fail on degenerate/small datasets — non-fatal */ }
    }

    const updatedC = Math.exp(rlsState.theta[0]);
    const updatedN = rlsState.theta[1];
    // Standard deviations from RLS covariance diagonal (delta method for C)
    const cStdDev = updatedC * Math.sqrt(Math.max(0, rlsState.P[0][0]));
    const nStdDev = Math.sqrt(Math.max(0, rlsState.P[1][1]));

    return {
      updatedC,
      updatedN,
      cStdDev,
      nStdDev,
      kalmanGains,
      residuals,
      stateHistory,
      predictionAtSpeed: (v: number) => Math.pow(updatedC / Math.max(v, 1), 1 / updatedN)
    };
  }

  // --------------------------------------------------------------------------
  // 3. surfaceFinishBiasCorrector
  // --------------------------------------------------------------------------

  /**
   * Bootstrap BCa bias corrector for surface-finish (Ra) predictions.
   *
   * Computes residuals r_i = predicted_i − measured_i, then estimates the
   * bias (mean residual) with a bias-corrected and accelerated (BCa)
   * bootstrap confidence interval.  If the CI excludes zero the bias is
   * deemed significant and a correction factor is applied.
   *
   * BCa endpoints use the Efron (1987) acceleration correction:
   *   α̂ = Σ(θ̄ − θ̂_i)³ / (6·[Σ(θ̄ − θ̂_i)²]^(3/2))
   *   ẑ₀ = Φ⁻¹(#{θ̂* < θ̂} / B)
   *
   * @param input — Paired predictions/measurements and bootstrap config
   * @returns Bias estimate, CI, corrected predictions, RMSE improvement
   *
   * @see Efron, B. (1987). "Better Bootstrap Confidence Intervals."
   */
  surfaceFinishBiasCorrector(input: BiasInput): BiasResult {
    this.calibrationCount++;

    const {
      predictions, measurements,
      confidenceLevel = 0.95,
      nBootstrap = 2000,
      seed = 42
    } = input;

    const n = predictions.length;
    if (n !== measurements.length || n === 0) {
      throw new Error("predictions and measurements must be non-empty arrays of equal length");
    }

    // Compute residuals
    const residuals: number[] = new Array(n);
    for (let i = 0; i < n; i++) {
      residuals[i] = predictions[i] - measurements[i];
    }

    const observedBias = mean(residuals);

    // --- Bootstrap resampling ---
    const rng = new SeededRNG(seed);
    const bootstrapMeans: number[] = new Array(nBootstrap);

    for (let b = 0; b < nBootstrap; b++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(rng.next() * n);
        sum += residuals[idx];
      }
      bootstrapMeans[b] = sum / n;
    }

    // Sort bootstrap means
    bootstrapMeans.sort((a, b) => a - b);

    // --- BCa correction ---
    // Bias correction factor z₀
    let countBelow = 0;
    for (let b = 0; b < nBootstrap; b++) {
      if (bootstrapMeans[b] < observedBias) countBelow++;
    }
    const z0 = normalQuantile(countBelow / nBootstrap);

    // Acceleration â via jackknife
    const jackknifeMeans: number[] = new Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) {
        if (j !== i) s += residuals[j];
      }
      jackknifeMeans[i] = s / (n - 1);
    }
    const jackMean = mean(jackknifeMeans);
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      const diff = jackMean - jackknifeMeans[i];
      num += diff * diff * diff;
      den += diff * diff;
    }
    const aHat = den === 0 ? 0 : num / (6 * Math.pow(den, 1.5));

    // BCa percentile indices
    const alpha = 1 - confidenceLevel;
    const zAlphaLo = normalQuantile(alpha / 2);
    const zAlphaHi = normalQuantile(1 - alpha / 2);

    const adjLo = normalCDF(z0 + (z0 + zAlphaLo) / (1 - aHat * (z0 + zAlphaLo)));
    const adjHi = normalCDF(z0 + (z0 + zAlphaHi) / (1 - aHat * (z0 + zAlphaHi)));

    const loIdx = Math.max(0, Math.min(nBootstrap - 1, Math.floor(adjLo * nBootstrap)));
    const hiIdx = Math.max(0, Math.min(nBootstrap - 1, Math.floor(adjHi * nBootstrap)));

    const biasCI: [number, number] = [bootstrapMeans[loIdx], bootstrapMeans[hiIdx]];

    // Is bias significant? (CI does not contain zero)
    const biasSignificant = (biasCI[0] > 0 && biasCI[1] > 0) ||
      (biasCI[0] < 0 && biasCI[1] < 0);

    // Correction factor: subtract bias from predictions
    const correctionFactor = biasSignificant ? -observedBias : 0;
    const correctedPredictions = predictions.map(p => p + correctionFactor);

    // RMSE comparison
    const rmseOrig = rmse(predictions, measurements);
    const rmseCorrected = rmse(correctedPredictions, measurements);
    const improvement = rmseOrig > 0 ? ((rmseOrig - rmseCorrected) / rmseOrig) * 100 : 0;

    return {
      meanBias: observedBias,
      biasCI,
      biasSignificant,
      correctionFactor,
      correctedPredictions,
      rmseOriginal: rmseOrig,
      rmseCorrected,
      improvementPercent: Math.max(0, improvement)
    };
  }

  // --------------------------------------------------------------------------
  // 4. processDriftCompensator
  // --------------------------------------------------------------------------

  /**
   * CUSUM-based process drift detector and compensator.
   *
   * Runs a two-sided cumulative sum control chart (Page, 1954) on
   * dimensional measurements to detect the onset of systematic drift.
   * Once drift is detected, fits a linear regression to the post-onset
   * data to estimate drift rate and compute part-by-part compensation
   * offsets.
   *
   * CUSUM upper:  S⁺_i = max(0, S⁺_{i−1} + (x_i − μ₀)/σ − K)
   * CUSUM lower:  S⁻_i = max(0, S⁻_{i−1} − (x_i − μ₀)/σ − K)
   * Signal when S⁺ > H or S⁻ > H.
   *
   * @param input — Measurements, target, sigma, CUSUM parameters
   * @returns Drift detection result with compensation offsets
   *
   * @see Page, E.S. (1954). "Continuous Inspection Schemes."
   */
  processDriftCompensator(input: DriftInput): DriftResult {
    this.calibrationCount++;

    const {
      measurements, target, sigma,
      cusumK = 0.5,
      cusumH = 5
    } = input;

    const n = measurements.length;
    if (n === 0) {
      return {
        driftDetected: false,
        driftOnsetIndex: null,
        driftRate_perPart: 0,
        compensationOffsets: [],
        projectedPartsUntilOOT: Infinity,
        currentOffset: 0
      };
    }

    // --- CUSUM detection ---
    let sPlus = 0;
    let sMinus = 0;
    let driftOnsetIndex: number | null = null;

    for (let i = 0; i < n; i++) {
      const zi = (measurements[i] - target) / sigma;
      sPlus = Math.max(0, sPlus + zi - cusumK);
      sMinus = Math.max(0, sMinus - zi - cusumK);

      if ((sPlus > cusumH || sMinus > cusumH) && driftOnsetIndex === null) {
        // Walk back to find the likely actual onset
        // (CUSUM typically signals several points after the actual shift)
        // Use a simple heuristic: go back to where CUSUM started rising
        let onsetGuess = i;
        let tmpPlus = 0, tmpMinus = 0;
        for (let j = 0; j <= i; j++) {
          const zj = (measurements[j] - target) / sigma;
          tmpPlus = Math.max(0, tmpPlus + zj - cusumK);
          tmpMinus = Math.max(0, tmpMinus - zj - cusumK);
          if (tmpPlus > 0 || tmpMinus > 0) {
            if (onsetGuess === i) onsetGuess = j;
          } else {
            onsetGuess = i; // reset if CUSUM returns to 0
          }
        }
        driftOnsetIndex = onsetGuess;
      }
    }

    const driftDetected = driftOnsetIndex !== null;

    // --- Drift rate estimation via linear regression ---
    let driftRate = 0;
    if (driftDetected && driftOnsetIndex !== null) {
      const postDriftX: number[] = [];
      const postDriftY: number[] = [];
      for (let i = driftOnsetIndex; i < n; i++) {
        postDriftX.push(i - driftOnsetIndex);
        postDriftY.push(measurements[i] - target);
      }
      if (postDriftX.length >= 2) {
        const reg = linearRegression(postDriftX, postDriftY);
        driftRate = reg.slope;
      }
    }

    // --- Compensation offsets ---
    // For each part, compute offset to subtract to bring back to target
    const compensationOffsets: number[] = new Array(n).fill(0);
    if (driftDetected && driftOnsetIndex !== null && Math.abs(driftRate) > 1e-12) {
      for (let i = driftOnsetIndex; i < n; i++) {
        const partsFromOnset = i - driftOnsetIndex;
        compensationOffsets[i] = -driftRate * partsFromOnset;
      }
    }

    // --- Parts until out-of-tolerance (3σ from target) ---
    let projectedParts = Infinity;
    if (Math.abs(driftRate) > 1e-12) {
      const tolerance = 3 * sigma;
      const currentDeviation = Math.abs(measurements[n - 1] - target);
      const remaining = tolerance - currentDeviation;
      if (remaining > 0) {
        projectedParts = Math.floor(remaining / Math.abs(driftRate));
      } else {
        projectedParts = 0;
      }
    }

    const currentOffset = compensationOffsets[n - 1] || 0;

    return {
      driftDetected,
      driftOnsetIndex,
      driftRate_perPart: driftRate,
      compensationOffsets,
      projectedPartsUntilOOT: projectedParts,
      currentOffset
    };
  }

  // --------------------------------------------------------------------------
  // 5. thermalModelCalibrator
  // --------------------------------------------------------------------------

  /**
   * Gradient-descent calibration of a multi-time-constant thermal growth model.
   *
   * Model:
   *   δ(t) = Σᵢ aᵢ·(1 − exp(−t/τᵢ)) + b·t
   *
   * where aᵢ are amplitudes, τᵢ are time constants, and b is linear drift.
   * The parameters (a₁..aₙ, τ₁..τₙ, b) are fitted to measured thermal
   * displacement data by minimising the sum of squared residuals via
   * batch gradient descent with adaptive learning rate (bold driver).
   *
   * Gradients:
   *   ∂L/∂aᵢ = -2·Σⱼ rⱼ·(1 − exp(−tⱼ/τᵢ))
   *   ∂L/∂τᵢ = -2·Σⱼ rⱼ·aᵢ·tⱼ/τᵢ²·exp(−tⱼ/τᵢ)
   *   ∂L/∂b  = -2·Σⱼ rⱼ·tⱼ
   *
   * @param input — Time series data and optimisation parameters
   * @returns Calibrated thermal model coefficients with fit statistics
   *
   * @see Bryan, J.B. (1990). "International Status of Thermal Error Research."
   */
  thermalModelCalibrator(input: ThermalCalInput): ThermalCalResult {
    this.calibrationCount++;

    const {
      timePoints, measuredDisplacements,
      nTimeConstants = 2,
      learningRate: lr0 = 0.01,
      maxIterations = 1000
    } = input;

    const nData = timePoints.length;
    if (nData !== measuredDisplacements.length || nData === 0) {
      throw new Error("timePoints and measuredDisplacements must be non-empty arrays of equal length");
    }

    const nTC = nTimeConstants;

    // Initialise parameters: amplitudes, time constants, linear drift
    const amplitudes = new Array(nTC);
    const taus = new Array(nTC);

    // Smart initialisation: spread time constants across data range
    const tMax = Math.max(...timePoints);
    const dMax = measuredDisplacements[nData - 1] || 1;

    for (let i = 0; i < nTC; i++) {
      amplitudes[i] = dMax / nTC;
      taus[i] = tMax * (i + 1) / (nTC + 1);
    }
    let bLinear = 0;

    // Model evaluation
    const evaluate = (t: number): number => {
      let val = bLinear * t;
      for (let i = 0; i < nTC; i++) {
        val += amplitudes[i] * (1 - Math.exp(-t / taus[i]));
      }
      return val;
    };

    // Loss = sum of squared residuals
    const computeLoss = (): number => {
      let loss = 0;
      for (let j = 0; j < nData; j++) {
        const r = evaluate(timePoints[j]) - measuredDisplacements[j];
        loss += r * r;
      }
      return loss;
    };

    // --- Gradient descent with bold driver ---
    let lr = lr0;
    let prevLoss = computeLoss();

    // Normalise learning rate by data scale
    const scale = Math.max(1, Math.abs(dMax));
    lr /= (scale * nData);

    for (let iter = 0; iter < maxIterations; iter++) {
      // Compute gradients
      const gradA = new Array(nTC).fill(0);
      const gradTau = new Array(nTC).fill(0);
      let gradB = 0;

      for (let j = 0; j < nData; j++) {
        const t = timePoints[j];
        const r = evaluate(t) - measuredDisplacements[j];

        for (let i = 0; i < nTC; i++) {
          const expTerm = Math.exp(-t / taus[i]);
          gradA[i] += 2 * r * (1 - expTerm);
          gradTau[i] += 2 * r * amplitudes[i] * (-t / (taus[i] * taus[i])) * expTerm;
        }
        gradB += 2 * r * t;
      }

      // Update parameters
      for (let i = 0; i < nTC; i++) {
        amplitudes[i] -= lr * gradA[i];
        taus[i] -= lr * gradTau[i];
        // Enforce τ > 0
        if (taus[i] < 1e-6) taus[i] = 1e-6;
      }
      bLinear -= lr * gradB;

      // Bold driver: increase lr if loss decreased, halve if increased
      const newLoss = computeLoss();
      if (newLoss < prevLoss) {
        lr *= 1.05;
      } else {
        lr *= 0.5;
      }
      prevLoss = newLoss;

      // Convergence check
      if (Math.abs(newLoss) < 1e-15) break;
    }

    // Compute fitted values and residuals
    const fittedValues: number[] = new Array(nData);
    const residualsArr: number[] = new Array(nData);
    for (let j = 0; j < nData; j++) {
      fittedValues[j] = evaluate(timePoints[j]);
      residualsArr[j] = fittedValues[j] - measuredDisplacements[j];
    }

    const rmseVal = rmse(fittedValues, measuredDisplacements);
    const r2 = rSquared(measuredDisplacements, fittedValues);

    // Capture current params in closure for predictAt
    const capturedAmps = [...amplitudes];
    const capturedTaus = [...taus];
    const capturedB = bLinear;

    return {
      amplitudes: [...amplitudes],
      timeConstants: [...taus],
      linearDrift: bLinear,
      fittedValues,
      residuals: residualsArr,
      rmse: rmseVal,
      rSquared: r2,
      predictAt: (t: number): number => {
        let val = capturedB * t;
        for (let i = 0; i < nTC; i++) {
          val += capturedAmps[i] * (1 - Math.exp(-t / capturedTaus[i]));
        }
        return val;
      }
    };
  }

  // --------------------------------------------------------------------------
  // 6. modelSelector
  // --------------------------------------------------------------------------

  /**
   * Information-theoretic model selection using AIC and BIC.
   *
   * Fits each candidate model to (x, y) data using Nelder-Mead simplex
   * optimisation (minimising sum of squared residuals), then computes:
   *
   *   AIC = 2k + n·ln(RSS/n)          (Akaike, 1974)
   *   BIC = k·ln(n) + n·ln(RSS/n)     (Schwarz, 1978)
   *
   * Akaike weights: wᵢ = exp(−½·Δᵢ) / Σ exp(−½·Δⱼ)
   *   where Δᵢ = AICᵢ − AIC_min
   *
   * @param input — Data and candidate model definitions
   * @returns Rankings by AIC/BIC with Akaike weights and predictions
   *
   * @see Akaike, H. (1974). "A new look at the statistical model identification."
   * @see Nelder, J.A. & Mead, R. (1965). "A simplex method for function minimization."
   */
  modelSelector(input: ModelSelectInput): ModelSelectResult {
    this.calibrationCount++;

    const { x, y, candidateModels } = input;
    const n = x.length;

    if (n !== y.length || n === 0) {
      throw new Error("x and y must be non-empty arrays of equal length");
    }
    if (candidateModels.length === 0) {
      throw new Error("At least one candidate model is required");
    }

    // --- Nelder-Mead simplex optimiser ---
    const nelderMead = (
      objective: (params: number[]) => number,
      initial: number[],
      maxIter = 500
    ): number[] => {
      const dim = initial.length;
      if (dim === 0) return [];

      const alpha = 1.0; // reflection
      const gamma = 2.0; // expansion
      const rho = 0.5;   // contraction
      const sigma = 0.5; // shrink

      // Build initial simplex
      const simplex: { point: number[]; value: number }[] = [];

      // First vertex = initial guess
      const p0 = [...initial];
      simplex.push({ point: p0, value: objective(p0) });

      // Remaining vertices: perturb each dimension
      for (let i = 0; i < dim; i++) {
        const pi = [...initial];
        pi[i] += Math.abs(initial[i]) * 0.05 + 0.00025;
        simplex.push({ point: pi, value: objective(pi) });
      }

      for (let iter = 0; iter < maxIter; iter++) {
        // Sort by objective value
        simplex.sort((a, b) => a.value - b.value);

        // Convergence check: range of values
        const range = simplex[dim].value - simplex[0].value;
        if (range < 1e-12) break;

        // Centroid of all points except worst
        const centroid = new Array(dim).fill(0);
        for (let i = 0; i < dim; i++) {
          for (let j = 0; j < dim; j++) {
            centroid[j] += simplex[i].point[j];
          }
        }
        for (let j = 0; j < dim; j++) centroid[j] /= dim;

        const worst = simplex[dim];

        // Reflection
        const xr = centroid.map((c, j) => c + alpha * (c - worst.point[j]));
        const fr = objective(xr);

        if (fr < simplex[dim - 1].value && fr >= simplex[0].value) {
          simplex[dim] = { point: xr, value: fr };
          continue;
        }

        if (fr < simplex[0].value) {
          // Expansion
          const xe = centroid.map((c, j) => c + gamma * (xr[j] - c));
          const fe = objective(xe);
          simplex[dim] = fe < fr ? { point: xe, value: fe } : { point: xr, value: fr };
          continue;
        }

        // Contraction
        const xc = centroid.map((c, j) => c + rho * (worst.point[j] - c));
        const fc = objective(xc);

        if (fc < worst.value) {
          simplex[dim] = { point: xc, value: fc };
          continue;
        }

        // Shrink
        const best = simplex[0].point;
        for (let i = 1; i <= dim; i++) {
          for (let j = 0; j < dim; j++) {
            simplex[i].point[j] = best[j] + sigma * (simplex[i].point[j] - best[j]);
          }
          simplex[i].value = objective(simplex[i].point);
        }
      }

      simplex.sort((a, b) => a.value - b.value);
      return simplex[0].point;
    };

    // --- Fit each candidate model ---
    const results: {
      name: string;
      params: number[];
      rss: number;
      k: number;
      aic: number;
      bic: number;
      r2: number;
      preds: number[];
    }[] = [];

    for (const model of candidateModels) {
      const objective = (params: number[]): number => {
        let ss = 0;
        for (let i = 0; i < n; i++) {
          const pred = model.fn(x[i], params);
          const diff = pred - y[i];
          ss += diff * diff;
        }
        return ss;
      };

      const bestParams = nelderMead(objective, [...model.initialParams]);
      const rssVal = objective(bestParams);
      const k = model.nParams;

      // AIC = 2k + n·ln(RSS/n)
      const logLikTerm = n * Math.log(Math.max(rssVal / n, 1e-30));
      const aic = 2 * k + logLikTerm;
      const bic = k * Math.log(n) + logLikTerm;

      // Predictions
      const preds = x.map(xi => model.fn(xi, bestParams));
      const r2val = rSquared(y, preds);

      results.push({
        name: model.name,
        params: bestParams,
        rss: rssVal,
        k,
        aic,
        bic,
        r2: r2val,
        preds
      });
    }

    // Sort by AIC
    results.sort((a, b) => a.aic - b.aic);

    // Akaike weights
    const minAIC = results[0].aic;
    const deltas = results.map(r => r.aic - minAIC);
    const expDeltas = deltas.map(d => Math.exp(-0.5 * d));
    const sumExp = expDeltas.reduce((a, b) => a + b, 0);
    const weights = expDeltas.map(e => e / sumExp);

    // Build rankings
    const rankings: ModelRanking[] = results.map((r, i) => ({
      name: r.name,
      aic: r.aic,
      bic: r.bic,
      rSquared: r.r2,
      params: r.params,
      akaikeWeight: weights[i]
    }));

    const best = results[0];

    return {
      rankings,
      bestModel: best.name,
      bestParams: best.params,
      predictions: best.preds
    };
  }

  // --------------------------------------------------------------------------
  // stats
  // --------------------------------------------------------------------------

  /**
   * Returns engine metadata.
   */
  stats(): { methods: string[]; totalCalibrations: number } {
    return {
      methods: [
        "bayesianKienzleUpdate",
        "taylorCoefficientTracker",
        "surfaceFinishBiasCorrector",
        "processDriftCompensator",
        "thermalModelCalibrator",
        "modelSelector"
      ],
      totalCalibrations: this.calibrationCount
    };
  }
}
