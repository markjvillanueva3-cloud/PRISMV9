/**
 * CycleToControlEngine — Discrete cycle-to-cycle (CtC) feedback control
 * for manufacturing processes
 *
 * Models: Discrete-time process y_k = K_p * u_{k-1} + d_k
 * Controllers: Proportional, Integral
 * Analysis: Variance ratio, Cpk improvement, optimal gain, autocorrelation
 *
 * References: Hardt & Siu (MIT 2.830J), Box & Kramer (1990),
 *   Sachs et al. (1995 IEEE), Del Castillo & Hurwitz (1997)
 * Source: document:mit2830j — MIT OCW 2.830J/6.780J Spring 2008
 */

// ─── Types ─────────────────────────────────────────────────────────

export type ControllerType = "proportional" | "integral";
/** Disturbance Type type definition.
 */
export type DisturbanceType = "uncorrelated" | "correlated" | "unknown";

/** Atomic Value configuration/data structure.
 */
export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

/** Ct C Process Input configuration/data structure.
 */
export interface CtCProcessInput {
  process_gain_Kp: number;          // K_p: process gain (output/input units)
  controller_type: ControllerType;  // P or I controller
  controller_gain_Kc: number;       // K_c: controller gain
  disturbance_type: DisturbanceType;
  disturbance_variance: number;     // σ² of disturbance (open-loop)
  disturbance_mean?: number;        // μ of disturbance (mean shift)
  correlation_coefficient?: number; // p for AR(1) filter, 0 < p < 1
  target_value: number;             // T: target dimension/property
  upper_tolerance: number;          // T+
  lower_tolerance: number;          // T-
  num_cycles?: number;              // n: simulation cycles (default 100)
}

/** Ct C Result configuration/data structure.
 */
export interface CtCResult {
  loop_gain_K: AtomicValue;                   // K = K_c * K_p
  is_stable: boolean;
  stability_margin: AtomicValue;              // distance to instability
  steady_state_error: AtomicValue;            // e_ss for step disturbance
  variance_ratio: AtomicValue;               // σ²_CtC / σ²_open
  open_loop_sigma: AtomicValue;
  closed_loop_sigma: AtomicValue;
  cpk_open_loop: AtomicValue;
  cpk_closed_loop: AtomicValue;
  cpk_improvement_pct: AtomicValue;
  expected_quality_loss: AtomicValue;         // E[L] = σ² + (μ-T)²
  settling_time_cycles: AtomicValue;
  recommendations: string[];
  is_safe: boolean;
}

/** Ct C Optimal Gain Result configuration/data structure.
 */
export interface CtCOptimalGainResult {
  optimal_gain_Kc: AtomicValue;
  min_quality_loss: AtomicValue;
  variance_at_optimal: AtomicValue;
  cpk_at_optimal: AtomicValue;
  gain_range_stable: { min: number; max: number };
  recommendations: string[];
}

/** Autocorrelation Result configuration/data structure.
 */
export interface AutocorrelationResult {
  lag_values: number[];                       // autocorrelation at each lag
  disturbance_type: DisturbanceType;
  correlation_strength: AtomicValue;          // estimated p
  significant_lags: number[];                 // lags with |r| > threshold
  recommendation: string;
}

// ─── Constants ─────────────────────────────────────────────────────

/** Stability limits by controller type: max loop gain K = K_c * K_p */
const STABILITY_LIMITS: Record<ControllerType, number> = {
  proportional: 1.0,     // 0 ≤ K ≤ 1
  integral: 2.0,         // 0 ≤ K < 2
};

/** Minimum Cpk for acceptable process capability (industry standard) */
const CPK_MIN_ACCEPTABLE = 1.0;
const CPK_MIN_CAPABLE = 1.33;
const CPK_TARGET = 1.67;

const SOURCE = "CycleToControlEngine (MIT 2.830J — Hardt & Siu)";

// ─── Core Calculations ─────────────────────────────────────────────

/**
 * Calculate loop gain and check stability
 */
function checkStability(
  Kp: number,
  Kc: number,
  controllerType: ControllerType
): { K: number; stable: boolean; margin: number } {
  const K = Kc * Kp;
  const limit = STABILITY_LIMITS[controllerType];
  return {
    K,
    stable: K >= 0 && K < limit,
    margin: limit - K,
  };
}

/**
 * Steady-state error for step disturbance
 * P-control: e_ss = d / (1 + K)
 * I-control: e_ss = 0 (always)
 */
function steadyStateError(
  K: number,
  controllerType: ControllerType,
  disturbanceMean: number
): number {
  if (controllerType === "integral") return 0;
  return disturbanceMean / (1 + K);
}

/**
 * Variance ratio σ²_CtC / σ²_open for uncorrelated (NIDI) disturbance
 *
 * P-control: σ²_y/σ² = 1 / (1 - K²) → always > 1 (variance amplification)
 * I-control: σ²_y/σ² = (1 + K*(2-K)) — Siu (2001) Eqn 8
 *   simplified steady-state: (2-K)/(K*(2-K)) is complex; use direct formula
 */
function varianceRatioUncorrelated(
  K: number,
  controllerType: ControllerType
): number {
  if (controllerType === "proportional") {
    // Eqn 7 steady-state: σ²_y/σ² = 1/(1 - K²)
    if (K >= 1) return Infinity;
    return 1 / (1 - K * K);
  }
  // Integral controller — Eqn 8 steady-state
  // σ²_y/σ² = 1 + K*(2-K) from Siu analysis
  // For K=1: ratio = 2.0; for K=0.5: ratio ≈ 1.75
  if (K >= 2) return Infinity;
  const ratio = 1 + K * (2 - K);
  return Math.max(ratio, 1);
}

/**
 * Variance ratio for correlated disturbance (AR(1) model with parameter p)
 * Simulated via MATLAB — approximation based on Hardt & Siu Fig. 4, 6
 *
 * For P-control with correlated noise:
 *   variance decreases as correlation increases
 *   minimum around K = p (correlation parameter)
 *
 * For I-control with correlated noise:
 *   significant variance reduction possible
 *   optimal K ≈ 1.0 typically
 */
function varianceRatioCorrelated(
  K: number,
  controllerType: ControllerType,
  p: number
): number {
  if (p <= 0 || p >= 1) return varianceRatioUncorrelated(K, controllerType);

  if (controllerType === "proportional") {
    // Approximate from Fig. 4: minimum at K ≈ p
    // Quadratic model: ratio ≈ (1-p²) + (K-p)²/(1-p²)
    // At K=0: ratio = 1 (open loop)
    // At K=p: ratio ≈ (1-p²) (minimum)
    const baseline = 1 - p * p;
    const deviation = (K - p) / (1 - p);
    return baseline + deviation * deviation * (1 - baseline);
  }

  // I-control with correlated disturbance (Fig. 6)
  // Significant reduction possible
  // Approximate: ratio ≈ (1-p)² + (K-1)² * (1+p)/(2-p)
  const optK = 1.0;
  const minRatio = (1 - p) * (1 - p);
  const penalty = (K - optK) * (K - optK) * (1 + p) / (2 - p);
  return Math.max(minRatio + penalty, 0.05);
}

/**
 * Calculate Cpk from process mean, sigma, and tolerance
 * Cpk = min((T+ - μ)/(3σ), (μ - T-)/(3σ))
 */
function calculateCpk(
  mean: number,
  sigma: number,
  upperTol: number,
  lowerTol: number
): number {
  if (sigma <= 0) return Infinity;
  const cpupper = (upperTol - mean) / (3 * sigma);
  const cplower = (mean - lowerTol) / (3 * sigma);
  return Math.min(cpupper, cplower);
}

/**
 * Taguchi Quality Loss: E[L] = σ² + (μ - T)²
 */
function qualityLoss(sigma: number, mean: number, target: number): number {
  return sigma * sigma + (mean - target) * (mean - target);
}

/**
 * Settling time approximation (cycles to reach 2% of final value)
 */
function settlingTime(K: number, controllerType: ControllerType): number {
  if (controllerType === "proportional") {
    if (K >= 1) return Infinity;
    // Exponential decay with rate |K|
    return Math.ceil(-4 / Math.log(Math.abs(K) + 0.001));
  }
  // Integral: closed-loop pole at (1 - K)
  const pole = Math.abs(1 - K);
  if (pole >= 1) return Infinity;
  if (pole < 0.01) return 1; // deadbeat at K=1
  return Math.ceil(-4 / Math.log(pole));
}

/**
 * Estimate autocorrelation from a data sequence
 */
function computeAutocorrelation(data: number[], maxLag: number): number[] {
  const n = data.length;
  const mean = data.reduce((s, x) => s + x, 0) / n;
  const variance = data.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
  if (variance === 0) return new Array(maxLag + 1).fill(0);

  const result: number[] = [];
  for (let lag = 0; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) {
      sum += (data[i] - mean) * (data[i + lag] - mean);
    }
    result.push(sum / (n * variance));
  }
  return result;
}

// ─── Exported Functions ─────────────────────────────────────────────

/**
 * Main CtC analysis: predict performance of a cycle-to-cycle controller
  * @param input - input data
  * @returns ct c result
 */
export function analyzeCtCControl(input: CtCProcessInput): CtCResult {
  const { Kp, Kc, controllerType } = {
    Kp: input.process_gain_Kp,
    Kc: input.controller_gain_Kc,
    controllerType: input.controller_type,
  };
  const stability = checkStability(Kp, Kc, controllerType);
  const K = stability.K;

  const recommendations: string[] = [];

  // Stability check
  if (!stability.stable) {
    recommendations.push(
      `UNSTABLE: Loop gain K=${K.toFixed(3)} exceeds limit ${STABILITY_LIMITS[controllerType]} for ${controllerType} control. Reduce Kc.`
    );
  }

  // Variance ratio
  let varRatio: number;
  const p = input.correlation_coefficient ?? 0;
  if (input.disturbance_type === "correlated" && p > 0) {
    varRatio = varianceRatioCorrelated(K, controllerType, p);
  } else {
    varRatio = varianceRatioUncorrelated(K, controllerType);
  }

  // Open and closed loop sigma
  const sigmaOpen = Math.sqrt(input.disturbance_variance);
  const sigmaClosed = sigmaOpen * Math.sqrt(Math.max(varRatio, 0));

  // Steady-state error
  const ess = steadyStateError(K, controllerType, input.disturbance_mean ?? 0);

  // Cpk calculations
  const meanOpen = input.target_value + (input.disturbance_mean ?? 0);
  const meanClosed =
    controllerType === "integral"
      ? input.target_value
      : input.target_value + ess;

  const cpkOpen = calculateCpk(meanOpen, sigmaOpen, input.upper_tolerance, input.lower_tolerance);
  const cpkClosed = calculateCpk(meanClosed, sigmaClosed, input.upper_tolerance, input.lower_tolerance);
  const cpkImprovement = cpkOpen > 0 ? ((cpkClosed - cpkOpen) / cpkOpen) * 100 : 0;

  // Quality loss
  const lossOpen = qualityLoss(sigmaOpen, meanOpen, input.target_value);
  const lossClosed = qualityLoss(sigmaClosed, meanClosed, input.target_value);

  // Settling time
  const ts = stability.stable ? settlingTime(K, controllerType) : Infinity;

  // Recommendations
  if (varRatio > 1.5 && input.disturbance_type !== "correlated") {
    recommendations.push(
      "Variance amplification >50%. For uncorrelated noise, CtC feedback increases variance. Consider using I-control with low gain."
    );
  }
  if (varRatio < 1 && input.disturbance_type === "correlated") {
    recommendations.push(
      `Variance reduction to ${(varRatio * 100).toFixed(1)}% of open-loop. Correlated disturbances benefit significantly from CtC control.`
    );
  }
  if (cpkClosed < CPK_MIN_ACCEPTABLE) {
    recommendations.push(
      `Cpk=${cpkClosed.toFixed(2)} is below 1.0 minimum. Tighten tolerances or reduce process variation.`
    );
  }
  if (controllerType === "proportional" && ess > 0) {
    recommendations.push(
      `P-control has finite steady-state error (${ess.toFixed(4)}). Switch to I-control for zero steady-state error.`
    );
  }
  if (K > 0.8 * STABILITY_LIMITS[controllerType]) {
    recommendations.push(
      `Loop gain K=${K.toFixed(3)} is within 20% of stability limit. Risk of oscillatory behavior.`
    );
  }

  return {
    loop_gain_K: { value: K, unit: "dimensionless", uncertainty: 0, source: SOURCE },
    is_stable: stability.stable,
    stability_margin: {
      value: stability.margin,
      unit: "dimensionless",
      uncertainty: 0,
      source: SOURCE,
    },
    steady_state_error: {
      value: ess,
      unit: "process_units",
      uncertainty: 0.01 * Math.abs(ess),
      source: SOURCE,
    },
    variance_ratio: {
      value: varRatio,
      unit: "dimensionless",
      uncertainty: 0.05 * varRatio,
      source: SOURCE + " (Siu 2001, Eqns 7-8)",
    },
    open_loop_sigma: { value: sigmaOpen, unit: "process_units", uncertainty: 0, source: SOURCE },
    closed_loop_sigma: {
      value: sigmaClosed,
      unit: "process_units",
      uncertainty: 0.05 * sigmaClosed,
      source: SOURCE,
    },
    cpk_open_loop: { value: cpkOpen, unit: "dimensionless", uncertainty: 0, source: SOURCE },
    cpk_closed_loop: {
      value: cpkClosed,
      unit: "dimensionless",
      uncertainty: 0.1,
      source: SOURCE,
    },
    cpk_improvement_pct: {
      value: cpkImprovement,
      unit: "%",
      uncertainty: 5,
      source: SOURCE,
    },
    expected_quality_loss: {
      value: lossClosed,
      unit: "cost_units",
      uncertainty: 0.1 * lossClosed,
      source: SOURCE + " (Taguchi QLF)",
    },
    settling_time_cycles: {
      value: ts,
      unit: "cycles",
      uncertainty: 1,
      source: SOURCE,
    },
    recommendations,
    is_safe: stability.stable,
  };
}

/**
 * Find optimal controller gain that minimizes expected quality loss
 * Searches over stable gain range with 0.01 resolution
  * @param input - input data
  * @returns ct c optimal gain result
 */
export function findOptimalGain(input: CtCProcessInput): CtCOptimalGainResult {
  const Kp = input.process_gain_Kp;
  const controllerType = input.controller_type;
  const limit = STABILITY_LIMITS[controllerType];
  const p = input.correlation_coefficient ?? 0;

  const sigmaOpen = Math.sqrt(input.disturbance_variance);
  const distMean = input.disturbance_mean ?? 0;

  let bestKc = 0;
  let bestLoss = qualityLoss(sigmaOpen, input.target_value + distMean, input.target_value);
  let bestVarRatio = 1;

  const step = 0.01;
  const maxKc = (limit * 0.99) / Math.max(Kp, 0.001);

  for (let Kc = step; Kc <= maxKc; Kc += step) {
    const K = Kc * Kp;
    if (K >= limit) break;

    let vr: number;
    if (input.disturbance_type === "correlated" && p > 0) {
      vr = varianceRatioCorrelated(K, controllerType, p);
    } else {
      vr = varianceRatioUncorrelated(K, controllerType);
    }

    const sigma = sigmaOpen * Math.sqrt(Math.max(vr, 0));
    const ess = steadyStateError(K, controllerType, distMean);
    const mean = controllerType === "integral" ? input.target_value : input.target_value + ess;
    const loss = qualityLoss(sigma, mean, input.target_value);

    if (loss < bestLoss) {
      bestLoss = loss;
      bestKc = Kc;
      bestVarRatio = vr;
    }
  }

  const bestK = bestKc * Kp;
  const bestSigma = sigmaOpen * Math.sqrt(Math.max(bestVarRatio, 0));
  const ess = steadyStateError(bestK, controllerType, distMean);
  const bestMean = controllerType === "integral" ? input.target_value : input.target_value + ess;
  const bestCpk = calculateCpk(bestMean, bestSigma, input.upper_tolerance, input.lower_tolerance);

  const recommendations: string[] = [];
  if (bestKc === 0) {
    recommendations.push("Open-loop is optimal. Disturbances are uncorrelated — feedback would increase variance.");
  } else {
    recommendations.push(
      `Optimal gain Kc=${bestKc.toFixed(3)} (K=${bestK.toFixed(3)}) minimizes quality loss.`
    );
  }
  if (bestVarRatio < 1) {
    recommendations.push(
      `Variance reduction of ${((1 - bestVarRatio) * 100).toFixed(1)}% achievable at optimal gain.`
    );
  }

  return {
    optimal_gain_Kc: { value: bestKc, unit: "dimensionless", uncertainty: 0.01, source: SOURCE },
    min_quality_loss: { value: bestLoss, unit: "cost_units", uncertainty: 0.05 * bestLoss, source: SOURCE },
    variance_at_optimal: { value: bestVarRatio, unit: "dimensionless", uncertainty: 0.05, source: SOURCE },
    cpk_at_optimal: { value: bestCpk, unit: "dimensionless", uncertainty: 0.1, source: SOURCE },
    gain_range_stable: { min: 0, max: limit / Math.max(Kp, 0.001) },
    recommendations,
  };
}

/**
 * Analyze output data autocorrelation to determine disturbance type
  * @param data - input data
  * @param maxLag - max lag value
  * @returns autocorrelation result
 */
export function analyzeAutocorrelation(
  data: number[],
  maxLag?: number
): AutocorrelationResult {
  const n = data.length;
  const lag = maxLag ?? Math.min(20, Math.floor(n / 4));
  const acf = computeAutocorrelation(data, lag);

  // Significance threshold: ±2/√n (95% confidence)
  const threshold = 2 / Math.sqrt(n);
  const significantLags = acf
    .map((v, i) => (i > 0 && Math.abs(v) > threshold ? i : -1))
    .filter((i) => i > 0);

  // Estimate correlation parameter p from lag-1 (absolute value captures negative correlation too)
  const pEstimate = acf.length > 1 ? Math.abs(acf[1]) : 0;

  let disturbanceType: DisturbanceType;
  let recommendation: string;

  if (pEstimate > 0.3) {
    disturbanceType = "correlated";
    recommendation = `Data shows significant correlation (p≈${pEstimate.toFixed(2)}). CtC feedback can reduce both mean error and variance. Use I-control with K≈1.0.`;
  } else if (pEstimate <= 0.3 && significantLags.length <= 1) {
    disturbanceType = "uncorrelated";
    recommendation =
      "Data appears uncorrelated (NIDI). CtC feedback will increase variance but can center process on target. Use I-control with low gain.";
  } else {
    disturbanceType = "unknown";
    recommendation =
      "Weak correlation detected. Run more samples or test CtC at low gain to observe variance change.";
  }

  return {
    lag_values: acf,
    disturbance_type: disturbanceType,
    correlation_strength: {
      value: pEstimate,
      unit: "dimensionless",
      uncertainty: threshold,
      source: SOURCE,
    },
    significant_lags: significantLags,
    recommendation,
  };
}
