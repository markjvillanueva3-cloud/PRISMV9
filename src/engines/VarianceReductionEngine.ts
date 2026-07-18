// @ts-nocheck
/**
 * VarianceReductionEngine — Variance reduction techniques for Monte Carlo simulation
 *
 * Methods:
 *   1. Antithetic Variates — Hammersley & Morton 1956
 *   2. Control Variates — Nelson 1990
 *   3. Importance Sampling — Kahn & Marshall 1953
 *   4. Stratified Sampling — Cochran 1977, Neyman 1934
 *   5. Compare Variance Reduction — multi-method benchmark
 *   6. Adaptive Monte Carlo UQ — auto-select best VR technique
 *
 * All methods use seeded PRNG (Park-Miller) for reproducibility.
 */

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface ParameterDistribution {
  mean: number;
  std: number;
}

export interface AntitheticInput {
  model_fn: (x: Record<string, number>) => number;
  parameter_distributions: Record<string, ParameterDistribution>;
  n_samples: number;
  seed?: number;
}

export interface AntitheticResult {
  estimate_mean: number;
  estimate_std: number;
  variance_reduction_factor: number;
  ci_95: [number, number];
  comparison_crude: {
    mean: number;
    std: number;
    n_samples_equivalent: number;
  };
}

export interface ControlVariateInput {
  model_fn: (x: Record<string, number>) => number;
  control_fn: (x: Record<string, number>) => number;
  control_mean: number;
  parameter_distributions: Record<string, ParameterDistribution>;
  n_samples: number;
  seed?: number;
}

export interface ControlVariateResult {
  estimate_mean: number;
  estimate_std: number;
  optimal_c: number;
  variance_reduction_factor: number;
  correlation_yx: number;
}

export interface ImportanceSamplingInput {
  model_fn: (x: number[]) => number;
  nominal_distribution: { mean: number[]; cov: number[][] };
  importance_distribution: { mean: number[]; cov: number[][] };
  n_samples: number;
  seed?: number;
}

export interface ImportanceSamplingResult {
  estimate_mean: number;
  estimate_std: number;
  effective_sample_size: number;
  max_weight_ratio: number;
  variance_reduction_factor: number;
}

export interface StratifiedInput {
  model_fn: (x: Record<string, number>) => number;
  parameter_distributions: Record<string, ParameterDistribution>;
  n_samples: number;
  n_strata_per_dim?: number;
  seed?: number;
}

export interface StratifiedResult {
  estimate_mean: number;
  estimate_std: number;
  stratum_means: number[];
  stratum_stds: number[];
  variance_reduction_factor: number;
}

export interface CompareResult {
  methods: {
    name: string;
    mean: number;
    std: number;
    variance_reduction: number;
    computation_time_ms: number;
  }[];
  best_method: string;
  overall_recommendation: string;
}

export interface AdaptiveMCInput {
  model_fn: (x: Record<string, number>) => number;
  parameter_distributions: Record<string, ParameterDistribution>;
  target_cv?: number;
  max_samples?: number;
  seed?: number;
}

export interface AdaptiveMCResult {
  method_selected: string;
  result: { mean: number; std: number };
  n_samples_used: number;
  cv_achieved: number;
  equivalent_crude_mc_samples: number;
}

// ─── Seeded PRNG (Park-Miller) ──────────────────────────────────────────────

class SeededRNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }
  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }
  nextGaussian(): number {
    const u1 = this.next();
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateSamples(
  rng: SeededRNG,
  dists: Record<string, ParameterDistribution>,
  n: number
): Record<string, number>[] {
  const keys = Object.keys(dists);
  const samples: Record<string, number>[] = [];
  for (let i = 0; i < n; i++) {
    const s: Record<string, number> = {};
    for (const k of keys) {
      s[k] = dists[k].mean + dists[k].std * rng.nextGaussian();
    }
    samples.push(s);
  }
  return samples;
}

function generateAntitheticSamples(
  rng: SeededRNG,
  dists: Record<string, ParameterDistribution>,
  n: number
): [Record<string, number>[], Record<string, number>[]] {
  const keys = Object.keys(dists);
  const samplesA: Record<string, number>[] = [];
  const samplesB: Record<string, number>[] = [];
  for (let i = 0; i < n; i++) {
    const a: Record<string, number> = {};
    const b: Record<string, number> = {};
    for (const k of keys) {
      const z = rng.nextGaussian();
      a[k] = dists[k].mean + dists[k].std * z;
      b[k] = dists[k].mean + dists[k].std * (-z);
    }
    samplesA.push(a);
    samplesB.push(b);
  }
  return [samplesA, samplesB];
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr: number[]): number {
  const m = mean(arr);
  return arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  return Math.sqrt(variance(arr));
}

function covariance(x: number[], y: number[]): number {
  const mx = mean(x);
  const my = mean(y);
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += (x[i] - mx) * (y[i] - my);
  }
  return sum / x.length;
}

// Cholesky decomposition for multivariate normal sampling
function cholesky(matrix: number[][]): number[][] {
  const n = matrix.length;
  const L: number[][] = Array.from({ length: n }, () =>
    new Array(n).fill(0)
  );
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        L[i][j] = Math.sqrt(Math.max(0, matrix[i][i] - sum));
      } else {
        L[i][j] = L[j][j] > 0
          ? (matrix[i][j] - sum) / L[j][j]
          : 0;
      }
    }
  }
  return L;
}

function mvnLogPdf(
  x: number[],
  mu: number[],
  covInv: number[][],
  logDetCov: number
): number {
  const d = x.length;
  const diff = x.map((v, i) => v - mu[i]);
  let quad = 0;
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      quad += diff[i] * covInv[i][j] * diff[j];
    }
  }
  return -0.5 * (d * Math.log(2 * Math.PI) + logDetCov + quad);
}

function invertMatrix(m: number[][]): number[][] {
  const n = m.length;
  const aug: number[][] = m.map((row, i) => {
    const r = [...row];
    for (let j = 0; j < n; j++) r.push(i === j ? 1 : 0);
    return r;
  });
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
    }
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
    const pivot = aug[i][i];
    if (Math.abs(pivot) < 1e-15) continue;
    for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const f = aug[k][i];
      for (let j = 0; j < 2 * n; j++) aug[k][j] -= f * aug[i][j];
    }
  }
  return aug.map(row => row.slice(n));
}

function logDet(m: number[][]): number {
  const n = m.length;
  const a = m.map(r => [...r]);
  let ld = 0;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(a[k][i]) > Math.abs(a[maxRow][i])) maxRow = k;
    }
    if (maxRow !== i) {
      [a[i], a[maxRow]] = [a[maxRow], a[i]];
      ld += Math.log(-1); // sign flip — but for PD matrices won't happen
    }
    if (Math.abs(a[i][i]) < 1e-15) return -Infinity;
    ld += Math.log(Math.abs(a[i][i]));
    for (let k = i + 1; k < n; k++) {
      const f = a[k][i] / a[i][i];
      for (let j = i + 1; j < n; j++) a[k][j] -= f * a[i][j];
    }
  }
  return ld;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class VarianceReductionEngine {
  /**
   * Antithetic Variates — Hammersley & Morton 1956
   * For each sample z, create antithetic -z → negative correlation
   * reduces variance.
   */
  antitheticVariates(params: AntitheticInput): AntitheticResult {
    const { model_fn, parameter_distributions, n_samples, seed = 42 } = params;
    const rng = new SeededRNG(seed);

    // Generate antithetic pairs
    const [samplesA, samplesB] = generateAntitheticSamples(
      rng, parameter_distributions, n_samples
    );

    const yA = samplesA.map(model_fn);
    const yB = samplesB.map(model_fn);

    // Antithetic estimator: average of pairs
    const yPaired = yA.map((a, i) => (a + yB[i]) / 2);
    const estMean = mean(yPaired);
    const estStd = stdDev(yPaired) / Math.sqrt(n_samples);

    // Crude MC for comparison (use yA only)
    const crudeMean = mean(yA);
    const crudeStd = stdDev(yA) / Math.sqrt(n_samples);

    const crudeVar = variance(yA) / n_samples;
    const antiVar = variance(yPaired) / n_samples;
    const vrf = crudeVar > 0 ? crudeVar / Math.max(antiVar, 1e-30) : 1;

    // Equivalent samples: how many crude MC samples for same precision
    const equivN = Math.round(vrf * n_samples);

    return {
      estimate_mean: estMean,
      estimate_std: estStd,
      variance_reduction_factor: vrf,
      ci_95: [estMean - 1.96 * estStd, estMean + 1.96 * estStd],
      comparison_crude: {
        mean: crudeMean,
        std: crudeStd,
        n_samples_equivalent: equivN,
      },
    };
  }

  /**
   * Control Variates — Nelson 1990
   * Ŷ_cv = Ŷ - c*(X̄ - μ_X), c = -Cov(Y,X)/Var(X)
   */
  controlVariates(params: ControlVariateInput): ControlVariateResult {
    const {
      model_fn, control_fn, control_mean,
      parameter_distributions, n_samples, seed = 42,
    } = params;
    const rng = new SeededRNG(seed);

    const samples = generateSamples(rng, parameter_distributions, n_samples);
    const Y = samples.map(model_fn);
    const X = samples.map(control_fn);

    // Optimal coefficient c = -Cov(Y,X)/Var(X)
    const covYX = covariance(Y, X);
    const varX = variance(X);
    const optimal_c = varX > 0 ? -covYX / varX : 0;

    // Control variate estimator
    const xBar = mean(X);
    const yCV = Y.map((y, i) => y + optimal_c * (X[i] - control_mean));

    const estMean = mean(yCV);
    const estStd = stdDev(yCV) / Math.sqrt(n_samples);

    // Correlation
    const corrYX = varX > 0 && variance(Y) > 0
      ? covYX / (Math.sqrt(variance(Y)) * Math.sqrt(varX))
      : 0;

    // Variance reduction factor
    const crudeVar = variance(Y) / n_samples;
    const cvVar = variance(yCV) / n_samples;
    const vrf = cvVar > 0 ? crudeVar / cvVar : 1;

    return {
      estimate_mean: estMean,
      estimate_std: estStd,
      optimal_c,
      variance_reduction_factor: Math.max(1, vrf),
      correlation_yx: corrYX,
    };
  }

  /**
   * Importance Sampling — Kahn & Marshall 1953
   * Weight w(x) = f(x)/g(x), estimate = Σ w(xi)*h(xi) / n
   */
  importanceSampling(params: ImportanceSamplingInput): ImportanceSamplingResult {
    const {
      model_fn, nominal_distribution, importance_distribution,
      n_samples, seed = 42,
    } = params;
    const rng = new SeededRNG(seed);
    const d = nominal_distribution.mean.length;

    // Precompute inverse/logdet for both distributions
    const nomInv = invertMatrix(nominal_distribution.cov);
    const nomLogDet = logDet(nominal_distribution.cov);
    const impInv = invertMatrix(importance_distribution.cov);
    const impLogDet = logDet(importance_distribution.cov);

    // Cholesky of importance distribution for sampling
    const L = cholesky(importance_distribution.cov);

    // Generate samples from importance distribution
    const samples: number[][] = [];
    for (let i = 0; i < n_samples; i++) {
      const z = Array.from({ length: d }, () => rng.nextGaussian());
      const x = new Array(d);
      for (let j = 0; j < d; j++) {
        let sum = 0;
        for (let k = 0; k <= j; k++) sum += L[j][k] * z[k];
        x[j] = importance_distribution.mean[j] + sum;
      }
      samples.push(x);
    }

    // Compute weights w = f(x)/g(x)
    const weights: number[] = [];
    const values: number[] = [];
    for (const x of samples) {
      const logF = mvnLogPdf(
        x, nominal_distribution.mean, nomInv, nomLogDet
      );
      const logG = mvnLogPdf(
        x, importance_distribution.mean, impInv, impLogDet
      );
      weights.push(Math.exp(logF - logG));
      values.push(model_fn(x));
    }

    // Weighted estimate
    const wSum = weights.reduce((a, b) => a + b, 0);
    const estMean = weights.reduce(
      (a, w, i) => a + w * values[i], 0
    ) / wSum;

    // Weighted variance
    const wSqSum = weights.reduce((a, w) => a + w * w, 0);
    const estVar = weights.reduce(
      (a, w, i) => a + w * (values[i] - estMean) ** 2, 0
    ) / wSum;
    const estStd = Math.sqrt(estVar / n_samples);

    // Effective sample size
    const ess = (wSum * wSum) / wSqSum;

    // Max weight ratio
    const maxW = Math.max(...weights);
    const minW = Math.min(...weights.filter(w => w > 0));
    const maxWeightRatio = minW > 0 ? maxW / minW : maxW;

    // Crude MC variance for comparison (sample from nominal)
    const rng2 = new SeededRNG(seed + 1000);
    const L2 = cholesky(nominal_distribution.cov);
    const crudeVals: number[] = [];
    for (let i = 0; i < n_samples; i++) {
      const z = Array.from({ length: d }, () => rng2.nextGaussian());
      const x = new Array(d);
      for (let j = 0; j < d; j++) {
        let sum = 0;
        for (let k = 0; k <= j; k++) sum += L2[j][k] * z[k];
        x[j] = nominal_distribution.mean[j] + sum;
      }
      crudeVals.push(model_fn(x));
    }
    const crudeVar = variance(crudeVals) / n_samples;
    const isVar = estVar / n_samples;
    const vrf = isVar > 0 ? crudeVar / isVar : 1;

    return {
      estimate_mean: estMean,
      estimate_std: estStd,
      effective_sample_size: ess,
      max_weight_ratio: maxWeightRatio,
      variance_reduction_factor: Math.max(0.1, vrf),
    };
  }

  /**
   * Stratified Sampling — Cochran 1977, Neyman 1934
   * Divide domain into strata, allocate proportionally.
   */
  stratifiedSampling(params: StratifiedInput): StratifiedResult {
    const {
      model_fn, parameter_distributions,
      n_samples, n_strata_per_dim = 5, seed = 42,
    } = params;
    const rng = new SeededRNG(seed);
    const keys = Object.keys(parameter_distributions);

    // For simplicity: stratify on first dimension only,
    // sample others freely
    const primaryKey = keys[0];
    const primaryDist = parameter_distributions[primaryKey];

    // Create strata boundaries using quantiles of normal
    const nStrata = n_strata_per_dim;
    const boundaries: number[] = [];
    for (let i = 0; i <= nStrata; i++) {
      // Approximate normal quantile
      const p = i / nStrata;
      const z = this._normalQuantile(p);
      boundaries.push(primaryDist.mean + primaryDist.std * z);
    }

    // Allocate samples per stratum (equal for now, then
    // refine with pilot)
    const samplesPerStratum = Math.max(
      2, Math.floor(n_samples / nStrata)
    );

    const stratum_means: number[] = [];
    const stratum_stds: number[] = [];
    const allValues: number[] = [];

    for (let s = 0; s < nStrata; s++) {
      const lo = boundaries[s];
      const hi = boundaries[s + 1];
      const stratumVals: number[] = [];

      for (let i = 0; i < samplesPerStratum; i++) {
        // Uniform within stratum for primary variable
        const u = rng.next();
        const primaryVal = lo + u * (hi - lo);

        const sample: Record<string, number> = {};
        sample[primaryKey] = primaryVal;
        // Other dimensions: sample from their distributions
        for (const k of keys) {
          if (k === primaryKey) continue;
          const d = parameter_distributions[k];
          sample[k] = d.mean + d.std * rng.nextGaussian();
        }

        stratumVals.push(model_fn(sample));
      }

      stratum_means.push(mean(stratumVals));
      stratum_stds.push(stdDev(stratumVals));
      allValues.push(...stratumVals);
    }

    const estMean = mean(stratum_means);
    const estStd = Math.sqrt(
      stratum_stds.reduce((a, s) => a + s * s, 0) / (nStrata * nStrata)
    ) / Math.sqrt(samplesPerStratum);

    // Crude MC comparison
    const rng2 = new SeededRNG(seed + 2000);
    const crudeSamples = generateSamples(
      rng2, parameter_distributions, n_samples
    );
    const crudeVals = crudeSamples.map(model_fn);
    const crudeVar = variance(crudeVals) / n_samples;
    const stratVar = estStd * estStd;
    const vrf = stratVar > 0 ? crudeVar / stratVar : 1;

    return {
      estimate_mean: estMean,
      estimate_std: estStd,
      stratum_means,
      stratum_stds,
      variance_reduction_factor: Math.max(1, vrf),
    };
  }

  /**
   * Compare all variance reduction methods on same problem.
   */
  compareVarianceReduction(params: {
    model_fn: (x: Record<string, number>) => number;
    parameter_distributions: Record<string, ParameterDistribution>;
    n_samples: number;
    seed?: number;
  }): CompareResult {
    const {
      model_fn, parameter_distributions,
      n_samples, seed = 42,
    } = params;

    const methods: CompareResult['methods'] = [];

    // 1. Crude MC
    const t0 = Date.now();
    const rng = new SeededRNG(seed);
    const samples = generateSamples(
      rng, parameter_distributions, n_samples
    );
    const crudeVals = samples.map(model_fn);
    const crudeM = mean(crudeVals);
    const crudeS = stdDev(crudeVals) / Math.sqrt(n_samples);
    methods.push({
      name: 'crude_mc',
      mean: crudeM,
      std: crudeS,
      variance_reduction: 1,
      computation_time_ms: Date.now() - t0,
    });

    // 2. Antithetic
    const t1 = Date.now();
    const antiRes = this.antitheticVariates({
      model_fn, parameter_distributions, n_samples, seed,
    });
    methods.push({
      name: 'antithetic',
      mean: antiRes.estimate_mean,
      std: antiRes.estimate_std,
      variance_reduction: antiRes.variance_reduction_factor,
      computation_time_ms: Date.now() - t1,
    });

    // 3. Stratified
    const t3 = Date.now();
    const stratRes = this.stratifiedSampling({
      model_fn, parameter_distributions, n_samples, seed,
    });
    methods.push({
      name: 'stratified',
      mean: stratRes.estimate_mean,
      std: stratRes.estimate_std,
      variance_reduction: stratRes.variance_reduction_factor,
      computation_time_ms: Date.now() - t3,
    });

    // Find best
    const bestIdx = methods.reduce(
      (bi, m, i) => (m.std < methods[bi].std ? i : bi), 0
    );
    const bestMethod = methods[bestIdx].name;

    let recommendation = `${bestMethod} provides best variance reduction`;
    if (bestMethod === 'crude_mc') {
      recommendation = 'No significant variance reduction detected; ' +
        'problem may be low-variance already';
    }

    return {
      methods,
      best_method: bestMethod,
      overall_recommendation: recommendation,
    };
  }

  /**
   * Adaptive Monte Carlo UQ — auto-select best VR technique
   * Pilot run → measure characteristics → select method → full run
   */
  adaptiveMonteCarloUQ(params: AdaptiveMCInput): AdaptiveMCResult {
    const {
      model_fn, parameter_distributions,
      target_cv = 0.05, max_samples = 10000, seed = 42,
    } = params;

    // Pilot run with small n
    const pilotN = Math.min(100, Math.floor(max_samples / 10));

    // Try antithetic on pilot
    const antiPilot = this.antitheticVariates({
      model_fn, parameter_distributions, n_samples: pilotN, seed,
    });

    // Try stratified on pilot
    const stratPilot = this.stratifiedSampling({
      model_fn, parameter_distributions, n_samples: pilotN, seed,
    });

    // Select method with best VRF
    let bestMethod = 'antithetic';
    let bestVRF = antiPilot.variance_reduction_factor;

    if (stratPilot.variance_reduction_factor > bestVRF) {
      bestMethod = 'stratified';
      bestVRF = stratPilot.variance_reduction_factor;
    }

    // If VRF < 1.1, fall back to crude MC (no benefit)
    if (bestVRF < 1.1) {
      bestMethod = 'crude_mc';
      bestVRF = 1;
    }

    // Full run with selected method
    let resultMean: number;
    let resultStd: number;
    let nUsed = max_samples;

    if (bestMethod === 'antithetic') {
      const res = this.antitheticVariates({
        model_fn, parameter_distributions,
        n_samples: max_samples, seed: seed + 100,
      });
      resultMean = res.estimate_mean;
      resultStd = res.estimate_std;
    } else if (bestMethod === 'stratified') {
      const res = this.stratifiedSampling({
        model_fn, parameter_distributions,
        n_samples: max_samples, seed: seed + 100,
      });
      resultMean = res.estimate_mean;
      resultStd = res.estimate_std;
    } else {
      // Crude MC
      const rng = new SeededRNG(seed + 100);
      const samps = generateSamples(
        rng, parameter_distributions, max_samples
      );
      const vals = samps.map(model_fn);
      resultMean = mean(vals);
      resultStd = stdDev(vals) / Math.sqrt(max_samples);
    }

    const cvAchieved = Math.abs(resultMean) > 1e-15
      ? resultStd / Math.abs(resultMean)
      : resultStd;

    const equivCrude = Math.round(nUsed * bestVRF);

    return {
      method_selected: bestMethod,
      result: { mean: resultMean, std: resultStd },
      n_samples_used: nUsed,
      cv_achieved: cvAchieved,
      equivalent_crude_mc_samples: equivCrude,
    };
  }

  // ─── Internal helpers ───────────────────────────────────────────────

  /** Approximate normal quantile (Beasley-Springer-Moro) */
  private _normalQuantile(p: number): number {
    if (p <= 0) return -6;
    if (p >= 1) return 6;
    if (Math.abs(p - 0.5) < 1e-10) return 0;

    // Rational approximation
    const a = [
      -3.969683028665376e+01, 2.209460984245205e+02,
      -2.759285104469687e+02, 1.383577518672690e+02,
      -3.066479806614716e+01, 2.506628277459239e+00,
    ];
    const b = [
      -5.447609879822406e+01, 1.615858368580409e+02,
      -1.556989798598866e+02, 6.680131188771972e+01,
      -1.328068155288572e+01,
    ];
    const c = [
      -7.784894002430293e-03, -3.223964580411365e-01,
      -2.400758277161838e+00, -2.549732539343734e+00,
      4.374664141464968e+00, 2.938163982698783e+00,
    ];
    const d = [
      7.784695709041462e-03, 3.224671290700398e-01,
      2.445134137142996e+00, 3.754408661907416e+00,
    ];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;

    let q: number;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
             ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      const r = q * q;
      return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
             (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
              ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    }
  }
}

export const varianceReductionEngine = new VarianceReductionEngine();
