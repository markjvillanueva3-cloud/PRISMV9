/**
 * BayesianOptimizationEngine — Gaussian Process surrogate optimization
 *
 * Sample-efficient optimization for expensive black-box functions.
 * Uses a GP surrogate model with acquisition functions (EI, UCB, PI)
 * to guide exploration.
 *
 * Manufacturing use: optimizing cutting parameters when each trial
 * is expensive (real cuts, simulations), tool life optimization,
 * process parameter tuning.
 *
 * @module BayesianOptimizationEngine
 */
import { CholeskyEngine } from "./CholeskyEngine.js";
import { SVDEngine } from "./SVDEngine.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BOConfig {
  dimensions: number;
  bounds: { min: number; max: number }[];
  acquisitionFunction?: "EI" | "UCB" | "PI";  // Default "EI"
  ucbKappa?: number;                            // UCB exploration param. Default 2.0
  initialPoints?: number;                       // Latin hypercube samples. Default 5
  maxIterations?: number;                       // Default 50
  noiseVariance?: number;                       // Observation noise σ². Default 1e-6
  lengthScale?: number;                         // GP kernel length. Default auto
  seed?: number;
}

export interface BOObservation {
  x: number[];
  y: number;
}

export interface BOResult {
  bestX: number[];
  bestY: number;
  observations: BOObservation[];
  iterations: number;
  modelFit: { meanMSE: number; coverage: number };
}

export interface GPPrediction {
  mean: number;
  variance: number;
  stdDev: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class BayesianOptimizationEngineImpl {

  /**
   * Minimize an expensive objective function using Bayesian optimization.
   */
  minimize(
    objective: (x: number[]) => number,
    config: BOConfig
  ): BOResult {
    const {
      dimensions, bounds,
      acquisitionFunction = "EI",
      ucbKappa = 2.0,
      initialPoints = Math.max(5, dimensions * 2),
      maxIterations = 50,
      noiseVariance = 1e-6,
      lengthScale,
      seed,
    } = config;

    const rng = seed != null ? this._seededRng(seed) : Math.random;
    const observations: BOObservation[] = [];

    // Phase 1: Latin Hypercube initial sampling
    const initX = this._latinHypercube(dimensions, bounds, initialPoints, rng);
    for (const x of initX) {
      observations.push({ x, y: objective(x) });
    }

    // Phase 2: Sequential optimization
    for (let iter = 0; iter < maxIterations; iter++) {
      const ls = lengthScale ?? this._autoLengthScale(bounds);

      // Fit GP model
      const gp = this._fitGP(observations, ls, noiseVariance);

      // Find next point by optimizing acquisition function
      const nextX = this._optimizeAcquisition(
        gp, bounds, dimensions, acquisitionFunction,
        ucbKappa, observations, rng
      );

      // Evaluate objective
      const y = objective(nextX);
      observations.push({ x: nextX, y });
    }

    // Find best
    let bestIdx = 0;
    for (let i = 1; i < observations.length; i++) {
      if (observations[i].y < observations[bestIdx].y) bestIdx = i;
    }

    return {
      bestX: observations[bestIdx].x,
      bestY: observations[bestIdx].y,
      observations,
      iterations: maxIterations,
      modelFit: this._assessModelFit(observations),
    };
  }

  /**
   * Predict at a point using a fitted GP from existing observations.
   */
  predict(
    observations: BOObservation[],
    queryPoint: number[],
    lengthScale: number,
    noiseVariance = 1e-6
  ): GPPrediction {
    const gp = this._fitGP(observations, lengthScale, noiseVariance);
    return this._gpPredict(gp, queryPoint);
  }

  /**
   * Suggest next point to evaluate given existing observations.
   */
  suggestNext(
    observations: BOObservation[],
    config: BOConfig
  ): number[] {
    const ls = config.lengthScale ?? this._autoLengthScale(config.bounds);
    const rng = config.seed != null ? this._seededRng(config.seed) : Math.random;
    const gp = this._fitGP(observations, ls, config.noiseVariance ?? 1e-6);

    return this._optimizeAcquisition(
      gp, config.bounds, config.dimensions,
      config.acquisitionFunction ?? "EI",
      config.ucbKappa ?? 2.0, observations, rng
    );
  }

  // -------------------------------------------------------------------------
  // GP Implementation (squared exponential kernel)
  // -------------------------------------------------------------------------

  private _fitGP(obs: BOObservation[], ls: number, noise: number) {
    const n = obs.length;
    const X = obs.map(o => o.x);
    const Y = obs.map(o => o.y);

    // Kernel matrix K + σ²I
    const K: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) =>
        this._sqExpKernel(X[i], X[j], ls) + (i === j ? noise : 0)
      )
    );

    // Cholesky decomposition for SPD kernel matrix (K + σ²I is SPD by construction)
    let choleskyL: number[][] | null = null;
    let Kinv: number[][] | null = null;
    let alpha: number[];
    try {
      // Condition number check
      const kappa = SVDEngine.conditionNumber(K).conditionNumber;
      if (kappa > 1e12) {
        // Ill-conditioned: add stronger regularization
        for (let i = 0; i < n; i++) K[i][i] += 1e-6;
      }
      choleskyL = CholeskyEngine.factorize(K).L;
      alpha = CholeskyEngine.solve(choleskyL, Y);
    } catch {
      // Fallback to Gauss-Jordan for non-SPD kernels
      Kinv = this._invertMatrix(K);
      alpha = Kinv.map(row => row.reduce((s, v, j) => s + v * Y[j], 0));
    }

    return { X, Y, choleskyL, Kinv, alpha, ls, noise };
  }

  private _gpPredict(
    gp: { X: number[][]; choleskyL: number[][] | null; Kinv: number[][] | null; alpha: number[]; ls: number; noise: number },
    x: number[]
  ): GPPrediction {
    const kStar = gp.X.map(xi => this._sqExpKernel(x, xi, gp.ls));
    const mean = kStar.reduce((s, k, i) => s + k * gp.alpha[i], 0);

    // Variance = k(x,x) - k*^T K^(-1) k*
    const kxx = 1.0; // k(x,x) = 1 for SE kernel with unit variance
    let variance: number;
    if (gp.choleskyL) {
      // Solve L*v = k* (forward substitution), then variance = kxx - v·v
      const v = CholeskyEngine.solve(gp.choleskyL, kStar);
      variance = Math.max(0, kxx - kStar.reduce((s, k, i) => s + k * v[i], 0));
    } else if (gp.Kinv) {
      const v = kStar.map((_, i) =>
        kStar.reduce((s, kj, j) => s + gp.Kinv![i][j] * kj, 0)
      );
      variance = Math.max(0, kxx - kStar.reduce((s, k, i) => s + k * v[i], 0));
    } else {
      variance = kxx;
    }

    return { mean, variance, stdDev: Math.sqrt(variance) };
  }

  private _sqExpKernel(x1: number[], x2: number[], ls: number): number {
    let dist2 = 0;
    for (let i = 0; i < x1.length; i++) {
      dist2 += ((x1[i] - x2[i]) / ls) ** 2;
    }
    return Math.exp(-0.5 * dist2);
  }

  // -------------------------------------------------------------------------
  // Acquisition functions
  // -------------------------------------------------------------------------

  private _optimizeAcquisition(
    gp: ReturnType<typeof this._fitGP>,
    bounds: { min: number; max: number }[],
    dims: number,
    acqType: string,
    kappa: number,
    obs: BOObservation[],
    rng: () => number
  ): number[] {
    const bestY = Math.min(...obs.map(o => o.y));
    const candidates = 200;
    let bestX: number[] = bounds.map(b => (b.min + b.max) / 2);
    let bestAcq = -Infinity;

    // Random search over candidates
    for (let c = 0; c < candidates; c++) {
      const x = bounds.map(b => b.min + rng() * (b.max - b.min));
      const pred = this._gpPredict(gp, x);
      let acqValue: number;

      switch (acqType) {
        case "EI": {
          if (pred.stdDev < 1e-10) { acqValue = 0; break; }
          const z = (bestY - pred.mean) / pred.stdDev;
          acqValue = (bestY - pred.mean) * this._normalCDF(z)
                   + pred.stdDev * this._normalPDF(z);
          break;
        }
        case "UCB":
          acqValue = -(pred.mean - kappa * pred.stdDev); // Minimize → negate
          break;
        case "PI": {
          if (pred.stdDev < 1e-10) { acqValue = 0; break; }
          const z2 = (bestY - pred.mean) / pred.stdDev;
          acqValue = this._normalCDF(z2);
          break;
        }
        default:
          acqValue = 0;
      }

      if (acqValue > bestAcq) {
        bestAcq = acqValue;
        bestX = x;
      }
    }

    return bestX;
  }

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

  private _latinHypercube(
    dims: number, bounds: { min: number; max: number }[],
    n: number, rng: () => number
  ): number[][] {
    const result: number[][] = [];
    for (let d = 0; d < dims; d++) {
      const perm = this._shuffle([...Array(n).keys()], rng);
      for (let i = 0; i < n; i++) {
        if (!result[i]) result[i] = [];
        const low = perm[i] / n;
        const high = (perm[i] + 1) / n;
        const u = low + rng() * (high - low);
        result[i][d] = bounds[d].min + u * (bounds[d].max - bounds[d].min);
      }
    }
    return result;
  }

  private _shuffle(arr: number[], rng: () => number): number[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private _normalPDF(z: number): number {
    return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  }

  private _normalCDF(z: number): number {
    // Horner approximation
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = z < 0 ? -1 : 1;
    const x = Math.abs(z) / Math.sqrt(2);
    const t = 1 / (1 + p * x);
    const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * y);
  }

  private _invertMatrix(M: number[][]): number[][] {
    const n = M.length;
    // Augmented matrix [M | I]
    const aug: number[][] = M.map((row, i) => [
      ...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
    ]);

    // Gauss-Jordan elimination
    for (let col = 0; col < n; col++) {
      // Partial pivoting
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
      }
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

      const pivot = aug[col][col];
      if (Math.abs(pivot) < 1e-12) continue; // Singular

      for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;

      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = aug[row][col];
        for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
      }
    }

    return aug.map(row => row.slice(n));
  }

  private _autoLengthScale(bounds: { min: number; max: number }[]): number {
    const ranges = bounds.map(b => b.max - b.min);
    return Math.sqrt(ranges.reduce((s, r) => s + r * r, 0) / ranges.length) * 0.2;
  }

  private _assessModelFit(obs: BOObservation[]): { meanMSE: number; coverage: number } {
    if (obs.length < 5) return { meanMSE: 0, coverage: 0 };

    // Leave-one-out cross-validation (simplified)
    let totalErr = 0;
    let withinBounds = 0;
    const n = Math.min(obs.length, 20); // Cap for performance

    for (let i = 0; i < n; i++) {
      const train = obs.filter((_, j) => j !== i);
      const ls = this._autoLengthScale(
        obs[0].x.map((_, d) => ({
          min: Math.min(...obs.map(o => o.x[d])),
          max: Math.max(...obs.map(o => o.x[d])),
        }))
      );
      const gp = this._fitGP(train, ls, 1e-6);
      const pred = this._gpPredict(gp, obs[i].x);
      totalErr += (pred.mean - obs[i].y) ** 2;
      if (Math.abs(pred.mean - obs[i].y) < 2 * pred.stdDev) withinBounds++;
    }

    return { meanMSE: totalErr / n, coverage: withinBounds / n };
  }

  private _seededRng(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }
}

export const bayesianOptimizationEngine = new BayesianOptimizationEngineImpl();
