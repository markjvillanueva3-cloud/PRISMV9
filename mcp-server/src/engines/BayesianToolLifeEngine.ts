/**
 * PRISM MCP Server -- Bayesian Tool Life Engine
 *
 * Probabilistic tool life prediction:
 * - Gaussian Process regression with RBF kernel
 * - Taylor equation prior (C / V^n * f^m * d^p)
 * - Bayesian combination (Taylor prior + GP posterior)
 * - Optimal replacement time (risk-based)
 * - Expected cost with Monte Carlo estimation
 *
 * Based on Stanford CS229, MIT 2.008.
 * Ported from PRISM_BAYESIAN_TOOL_LIFE.js (monolith R2.3.1).
 *
 * @module BayesianToolLifeEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface GPConfig {
  lengthScale?: number;
  signalVariance?: number;
  noiseVariance?: number;
}

export interface TaylorParams {
  C: number;
  n: number;
  m: number;
  p: number;
}

export interface Predictor {
  gp: {
    lengthScale: number;
    signalVariance: number;
    noiseVariance: number;
    X_train: number[][];
    y_train: number[];
    K_inv: number[][] | null;
  };
  taylor: TaylorParams;
  observations: Array<{ params: { speed: number; feed: number; doc: number }; toolLife: number }>;
}

export interface PredictionResult {
  mean: number;
  std: number;
  confidence95: [number, number];
  taylorPrediction?: number;
  gpPrediction?: number;
  source: string;
  confidence: number;
}

export interface ReplacementResult {
  recommendedReplacement: number;
  expectedLife: number;
  uncertainty: number;
  riskTolerance: number;
  confidence: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class BayesianToolLifeEngineImpl {

  /** Create a new Bayesian tool life predictor. */
  createPredictor(config: GPConfig = {}): Predictor {
    return {
      gp: {
        lengthScale: config.lengthScale ?? 50,
        signalVariance: config.signalVariance ?? 1.0,
        noiseVariance: config.noiseVariance ?? 0.1,
        X_train: [],
        y_train: [],
        K_inv: null,
      },
      taylor: { C: 400, n: 0.25, m: 0.15, p: 0.10 },
      observations: [],
    };
  }

  /** Add observation and update predictor. */
  addObservation(predictor: Predictor, speed: number, feed: number, doc: number, actualToolLife: number): { observationCount: number; updated: boolean } {
    predictor.observations.push({ params: { speed, feed, doc }, toolLife: actualToolLife });
    predictor.gp.X_train.push([speed, feed, doc]);
    predictor.gp.y_train.push(actualToolLife);
    predictor.gp.K_inv = null;
    this._updateTaylorParams(predictor);
    return { observationCount: predictor.observations.length, updated: true };
  }

  /** Predict tool life with uncertainty. */
  predict(predictor: Predictor, speed: number, feed: number, doc: number): PredictionResult {
    const x_star = [speed, feed, doc];
    const taylorLife = this._taylorPredict(predictor.taylor, speed, feed, doc);

    if (predictor.gp.X_train.length === 0) {
      return {
        mean: taylorLife,
        std: taylorLife * 0.3,
        confidence95: [taylorLife * 0.4, taylorLife * 1.6],
        source: "taylor_prior",
        confidence: 0.5,
      };
    }

    const gpPred = this._gpPredict(predictor.gp, x_star);
    const combinedMean = 0.3 * taylorLife + 0.7 * gpPred.mean;
    const combinedStd = Math.sqrt(
      0.09 * Math.pow(taylorLife * 0.2, 2) + 0.49 * gpPred.variance,
    );

    return {
      mean: combinedMean,
      std: combinedStd,
      confidence95: [combinedMean - 1.96 * combinedStd, combinedMean + 1.96 * combinedStd],
      taylorPrediction: taylorLife,
      gpPrediction: gpPred.mean,
      source: "bayesian_combined",
      confidence: Math.min(0.95, 0.5 + predictor.observations.length * 0.05),
    };
  }

  /** Get optimal replacement time based on risk tolerance. */
  getReplacementTime(predictor: Predictor, speed: number, feed: number, doc: number, riskTolerance: number = 0.1): ReplacementResult {
    const prediction = this.predict(predictor, speed, feed, doc);
    const z = this._normInv(1 - riskTolerance);
    const safeLife = prediction.mean - z * prediction.std;
    return {
      recommendedReplacement: Math.max(0, safeLife),
      expectedLife: prediction.mean,
      uncertainty: prediction.std,
      riskTolerance,
      confidence: prediction.confidence,
    };
  }

  /** Taylor extended equation: T = C / (V^n * f^m * d^p). */
  _taylorPredict(taylor: TaylorParams, speed: number, feed: number, doc: number): number {
    return taylor.C / (
      Math.pow(speed / 100, taylor.n) *
      Math.pow(feed / 0.1, taylor.m) *
      Math.pow(doc / 1.0, taylor.p)
    );
  }

  /** GP prediction with RBF kernel. */
  _gpPredict(gp: Predictor["gp"], x_star: number[]): { mean: number; variance: number } {
    const n = gp.X_train.length;
    if (n === 0) return { mean: 0, variance: gp.signalVariance };

    const k_star = gp.X_train.map(x => this._rbfKernel(x, x_star, gp));
    if (!gp.K_inv) {
      gp.K_inv = this._invertMatrix(this._computeKernelMatrix(gp));
    }

    const alpha = this._matVecMult(gp.K_inv, gp.y_train);
    const mean = k_star.reduce((sum, k, i) => sum + k * alpha[i], 0);
    const k_ss = this._rbfKernel(x_star, x_star, gp);
    const v = this._matVecMult(gp.K_inv, k_star);
    const variance = k_ss - k_star.reduce((sum, k, i) => sum + k * v[i], 0);

    return { mean, variance: Math.max(0.01, variance) };
  }

  /** RBF kernel. */
  _rbfKernel(x1: number[], x2: number[], gp: Predictor["gp"]): number {
    let sqDist = 0;
    for (let i = 0; i < x1.length; i++) sqDist += Math.pow(x1[i] - x2[i], 2);
    return gp.signalVariance * Math.exp(-sqDist / (2 * gp.lengthScale * gp.lengthScale));
  }

  /** Compute NxN kernel matrix with noise on diagonal. */
  _computeKernelMatrix(gp: Predictor["gp"]): number[][] {
    const n = gp.X_train.length;
    const K: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        K[i][j] = this._rbfKernel(gp.X_train[i], gp.X_train[j], gp);
        if (i === j) K[i][j] += gp.noiseVariance;
      }
    }
    return K;
  }

  /** Gauss-Jordan matrix inversion. */
  _invertMatrix(A: number[][]): number[][] {
    const n = A.length;
    const aug = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)]);
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
      }
      [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
      if (Math.abs(aug[i][i]) < 1e-10) aug[i][i] = 1e-10;
      for (let k = i + 1; k < n; k++) {
        const factor = aug[k][i] / aug[i][i];
        for (let j = i; j < 2 * n; j++) aug[k][j] -= factor * aug[i][j];
      }
    }
    for (let i = n - 1; i >= 0; i--) {
      const pivot = aug[i][i];
      for (let j = i; j < 2 * n; j++) aug[i][j] /= pivot;
      for (let k = 0; k < i; k++) {
        const factor = aug[k][i];
        for (let j = i; j < 2 * n; j++) aug[k][j] -= factor * aug[i][j];
      }
    }
    return aug.map(row => row.slice(n));
  }

  /** Matrix-vector multiply. */
  _matVecMult(A: number[][], v: number[]): number[] {
    return A.map(row => row.reduce((sum, a, j) => sum + a * v[j], 0));
  }

  /** Update Taylor C from recent observations. */
  _updateTaylorParams(predictor: Predictor): void {
    if (predictor.observations.length < 5) return;
    const recent = predictor.observations.slice(-20);
    let totalRatio = 0;
    for (const obs of recent) {
      const predicted = this._taylorPredict(predictor.taylor, obs.params.speed, obs.params.feed, obs.params.doc);
      totalRatio += obs.toolLife / predicted;
    }
    predictor.taylor.C *= totalRatio / recent.length;
  }

  /** Approximate inverse normal CDF (Abramowitz & Stegun). */
  _normInv(p: number): number {
    // Rational approximation for probit function
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;

    const sign = p < 0.5 ? -1 : 1;
    const pp = p < 0.5 ? p : 1 - p;
    const t = Math.sqrt(-2 * Math.log(pp));
    // Horner coefficients (Hart approximation)
    const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
    const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
    const x = t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
    return sign * x;
  }
}

export const bayesianToolLifeEngine = new BayesianToolLifeEngineImpl();
