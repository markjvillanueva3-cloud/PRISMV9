/**
 * PRISM MCP Server — Monte Carlo Simulation Engine
 *
 * Probabilistic analysis for manufacturing: random distributions,
 * Monte Carlo simulation, statistical analysis, tool life prediction,
 * and tolerance stack-up analysis.
 *
 * Ported from PRISM_MONTE_CARLO_ENGINE.js (monolith R2.3.1).
 *
 * @module MonteCarloEngine
 * @milestone SCIMATH-WIRE-MS0
 * @unit P6-U03
 */

import { CholeskyEngine } from "./CholeskyEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface SimulationResult {
  sample_count: number;
  mean: number;
  median: number;
  std_dev: number;
  variance: number;
  cv: number;
  min: number;
  max: number;
  percentiles: {
    p5: number; p10: number; p25: number; p50: number;
    p75: number; p90: number; p95: number; p99: number;
  };
  confidence_intervals: {
    ci90: { lower: number; upper: number };
    ci95: { lower: number; upper: number };
    ci99: { lower: number; upper: number };
  };
  execution_time_ms: number;
}

export interface HistogramResult {
  bins: number[];
  bin_edges: number[];
  bin_width: number;
  frequencies: number[];
}

export interface ToolLifePrediction extends SimulationResult {
  prediction: {
    expected_min: number;
    median_min: number;
    ci95_lower: number;
    ci95_upper: number;
  };
  risk: {
    prob_less_than_10min: number;
    prob_less_than_20min: number;
    prob_less_than_30min: number;
    safe_change_interval_min: number;
  };
}

export interface ToleranceStackResult extends SimulationResult {
  nominal: number;
  contributions: Array<{
    name: string;
    nominal: number;
    tolerance: number;
    sensitivity: number;
  }>;
  yield_estimate: number;
}

// ============================================================================
// CONFIG
// ============================================================================

const CONFIG = {
  DEFAULT_SAMPLES: 10000,
  MIN_SAMPLES: 100,
  MAX_SAMPLES: 1_000_000,
  TAYLOR_C_CV: 0.15,
  TAYLOR_N_CV: 0.08,
  CUTTING_SPEED_CV: 0.02,
  MATERIAL_HARDNESS_CV: 0.05,
  TOOL_QUALITY_CV: 0.10,
  SETUP_VARIATION_CV: 0.03,
};

// ============================================================================
// RANDOM DISTRIBUTIONS
// ============================================================================

function uniformRandom(min = 0, max = 1): number {
  return min + Math.random() * (max - min);
}

/** Box-Muller normal distribution */
function normalRandom(mean = 0, stdDev = 1): number {
  let u1: number;
  let u2: number;
  do { u1 = Math.random(); u2 = Math.random(); } while (u1 === 0);
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z * stdDev;
}

function lognormalRandom(mu: number, sigma: number): number {
  return Math.exp(normalRandom(mu, sigma));
}

/** Log-normal from intuitive mean + coefficient of variation */
function lognormalFromMeanCV(mean: number, cv: number): number {
  const sigma2 = Math.log(1 + cv * cv);
  const mu = Math.log(mean) - sigma2 / 2;
  return lognormalRandom(mu, Math.sqrt(sigma2));
}

/** Weibull distribution for reliability modeling */
function weibullRandom(scale: number, shape: number): number {
  const u = Math.random();
  return scale * Math.pow(-Math.log(1 - u), 1 / shape);
}

function exponentialRandom(rate: number): number {
  return -Math.log(Math.random()) / rate;
}

/** Triangular distribution (min, mode, max) */
function triangularRandom(min: number, mode: number, max: number): number {
  const u = Math.random();
  const f = (mode - min) / (max - min);
  if (u < f) return min + Math.sqrt(u * (max - min) * (mode - min));
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

/** Gamma distribution (Marsaglia & Tsang method) */
function gammaRandom(shape: number, scale: number): number {
  if (shape < 1) {
    return gammaRandom(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  const MAX_ITER = 10_000;
  for (let _iter = 0; _iter < MAX_ITER; _iter++) {
    let x: number, v: number;
    do { x = normalRandom(0, 1); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v * scale;
    }
  }
  return d * scale; // fallback after MAX_ITER
}

/** Beta distribution */
function betaRandom(alpha: number, beta: number): number {
  const g1 = gammaRandom(alpha, 1);
  const g2 = gammaRandom(beta, 1);
  return g1 / (g1 + g2);
}

// ============================================================================
// ENGINE
// ============================================================================

class MonteCarloEngineImpl {

  /**
   * Run Monte Carlo simulation with arbitrary model function
   */
  simulate(
    model: () => number,
    samples: number = CONFIG.DEFAULT_SAMPLES,
  ): SimulationResult {
    const n = Math.max(
      CONFIG.MIN_SAMPLES,
      Math.min(samples, CONFIG.MAX_SAMPLES),
    );
    const results: number[] = [];
    const start = performance.now();
    for (let i = 0; i < n; i++) results.push(model());
    const elapsed = performance.now() - start;
    return this.analyzeResults(results, elapsed);
  }

  /**
   * Analyze an array of samples — statistics + percentiles + CIs
   */
  analyzeResults(samples: number[], executionTimeMs = 0): SimulationResult {
    const n = samples.length;
    if (n === 0) {
      return this._emptyResult();
    }
    const sorted = [...samples].sort((a, b) => a - b);
    const sum = samples.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const variance = samples.reduce((s, x) => s + (x - mean) ** 2, 0)
      / Math.max(n - 1, 1);
    const stdDev = Math.sqrt(variance);

    const pct = (p: number) => sorted[
      Math.max(0, Math.min(n - 1, Math.ceil(p * n) - 1))
    ];

    return {
      sample_count: n,
      mean: round4(mean),
      median: round4(pct(0.5)),
      std_dev: round4(stdDev),
      variance: round4(variance),
      cv: mean !== 0 ? round4(stdDev / mean) : 0,
      min: sorted[0],
      max: sorted[n - 1],
      percentiles: {
        p5: round4(pct(0.05)), p10: round4(pct(0.10)),
        p25: round4(pct(0.25)), p50: round4(pct(0.50)),
        p75: round4(pct(0.75)), p90: round4(pct(0.90)),
        p95: round4(pct(0.95)), p99: round4(pct(0.99)),
      },
      confidence_intervals: {
        ci90: { lower: round4(pct(0.05)), upper: round4(pct(0.95)) },
        ci95: { lower: round4(pct(0.025)), upper: round4(pct(0.975)) },
        ci99: { lower: round4(pct(0.005)), upper: round4(pct(0.995)) },
      },
      execution_time_ms: Math.round(executionTimeMs * 100) / 100,
    };
  }

  /**
   * Generate histogram bins
   */
  histogram(samples: number[], binCount = 20): HistogramResult {
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const width = (max - min) / binCount || 1;
    const bins = new Array(binCount).fill(0);
    const edges: number[] = [];

    for (let i = 0; i <= binCount; i++) edges.push(min + i * width);
    for (const s of samples) {
      const idx = Math.min(Math.floor((s - min) / width), binCount - 1);
      bins[idx]++;
    }
    return {
      bins,
      bin_edges: edges,
      bin_width: round4(width),
      frequencies: bins.map(b => round4(b / samples.length)),
    };
  }

  /**
   * Probabilistic tool life prediction (Taylor + uncertainty)
   */
  predictToolLife(params: {
    cutting_speed?: number;
    feedrate?: number;
    depth_of_cut?: number;
    taylor_C?: number;
    taylor_n?: number;
    samples?: number;
    C_cv?: number;
    n_cv?: number;
    v_cv?: number;
    tool_quality_cv?: number;
  }): ToolLifePrediction {
    const v = params.cutting_speed ?? 100;
    const f = params.feedrate ?? 0.2;
    const ap = params.depth_of_cut ?? 2;
    const C_mean = params.taylor_C ?? 200;
    const n_mean = params.taylor_n ?? 0.25;
    const C_cv = params.C_cv ?? CONFIG.TAYLOR_C_CV;
    const n_cv = params.n_cv ?? CONFIG.TAYLOR_N_CV;
    const v_cv = params.v_cv ?? CONFIG.CUTTING_SPEED_CV;
    const tq_cv = params.tool_quality_cv ?? CONFIG.TOOL_QUALITY_CV;
    const nSamples = params.samples ?? CONFIG.DEFAULT_SAMPLES;

    const model = () => {
      const C = lognormalFromMeanCV(C_mean, C_cv);
      const n = normalRandom(n_mean, n_mean * n_cv);
      const vSample = normalRandom(v, v * v_cv);
      const toolFactor = lognormalFromMeanCV(1.0, tq_cv);
      const life = Math.pow(C * toolFactor / Math.max(vSample, 1), 1 / Math.max(n, 0.1))
          / (Math.pow(f, 0.2) * Math.pow(ap, 0.1));
      return Math.max(0.1, life);
    };

    const base = this.simulate(model, nSamples);
    const sorted = Array.from({ length: nSamples }, model).sort((a, b) => a - b);

    const probLess = (threshold: number) =>
      round4(sorted.filter(s => s < threshold).length / sorted.length);

    return {
      ...base,
      prediction: {
        expected_min: round4(base.mean),
        median_min: round4(base.median),
        ci95_lower: base.confidence_intervals.ci95.lower,
        ci95_upper: base.confidence_intervals.ci95.upper,
      },
      risk: {
        prob_less_than_10min: probLess(10),
        prob_less_than_20min: probLess(20),
        prob_less_than_30min: probLess(30),
        safe_change_interval_min: round4(base.percentiles.p5),
      },
    };
  }

  /**
   * Tolerance stack-up analysis (RSS + Monte Carlo)
   */
  toleranceStackUp(params: {
    dimensions: Array<{
      name: string;
      nominal: number;
      tolerance: number;
      distribution?: "normal" | "uniform" | "triangular";
    }>;
    target_tolerance?: number;
    samples?: number;
  }): ToleranceStackResult {
    const dims = params.dimensions;
    const nSamples = params.samples ?? CONFIG.DEFAULT_SAMPLES;
    const nominal = dims.reduce((s, d) => s + d.nominal, 0);

    const model = () => {
      let total = 0;
      for (const d of dims) {
        const half = d.tolerance / 2;
        switch (d.distribution ?? "normal") {
          case "uniform":
            total += uniformRandom(d.nominal - half, d.nominal + half);
            break;
          case "triangular":
            total += triangularRandom(
              d.nominal - half, d.nominal, d.nominal + half,
            );
            break;
          default:
            total += normalRandom(d.nominal, half / 3);
        }
      }
      return total;
    };

    const base = this.simulate(model, nSamples);
    const targetTol = params.target_tolerance
      ?? dims.reduce((s, d) => s + d.tolerance, 0) / 2;
    const halfTarget = targetTol / 2;
    const samples = Array.from({ length: nSamples }, model);
    const inSpec = samples.filter(
      s => Math.abs(s - nominal) <= halfTarget,
    ).length;

    return {
      ...base,
      nominal: round4(nominal),
      contributions: dims.map(d => ({
        name: d.name,
        nominal: d.nominal,
        tolerance: d.tolerance,
        sensitivity: round4(d.tolerance / targetTol),
      })),
      yield_estimate: round4(inSpec / nSamples),
    };
  }

  /** Expose random distributions for external use */
  random = {
    uniform: uniformRandom,
    normal: normalRandom,
    lognormal: lognormalRandom,
    lognormalFromMeanCV,
    weibull: weibullRandom,
    exponential: exponentialRandom,
    triangular: triangularRandom,
    gamma: gammaRandom,
    beta: betaRandom,
  };

  private _emptyResult(): SimulationResult {
    const z = { lower: 0, upper: 0 };
    return {
      sample_count: 0, mean: 0, median: 0, std_dev: 0,
      variance: 0, cv: 0, min: 0, max: 0,
      percentiles: {
        p5: 0, p10: 0, p25: 0, p50: 0,
        p75: 0, p90: 0, p95: 0, p99: 0,
      },
      confidence_intervals: { ci90: z, ci95: z, ci99: z },
      execution_time_ms: 0,
    };
  }

  /**
   * Generate correlated multivariate normal samples via Cholesky decomposition.
   *
   * Instead of scalar Box-Muller for each parameter independently, this method
   * samples from N(mu, Sigma) preserving the covariance structure. Critical for
   * manufacturing physics where parameters are correlated (e.g., kc1.1 and mc
   * in Kienzle model, or feed rate and chip thickness).
   *
   * @param mu Mean vector (n parameters)
   * @param covarianceMatrix Covariance matrix (n×n, SPD)
   * @param numSamples Number of samples to generate
   * @returns Array of correlated sample vectors
   * @milestone SCIMATH-WIRE-MS0 P6-U03
   */
  sampleCorrelatedNormal(
    mu: number[],
    covarianceMatrix: number[][],
    numSamples: number,
  ): number[][] {
    const n = mu.length;
    const result = CholeskyEngine.factorize(covarianceMatrix);

    const samples: number[][] = [];
    for (let s = 0; s < numSamples; s++) {
      // Generate n independent standard normal samples via Box-Muller
      const z: number[] = [];
      for (let i = 0; i < n; i++) {
        z.push(normalRandom(0, 1));
      }
      // Transform: x = mu + L * z
      samples.push(CholeskyEngine.sampleMultivariateNormal(mu, result.L, z));
    }
    return samples;
  }
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

export const monteCarloEngine = new MonteCarloEngineImpl();
