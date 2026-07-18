/**
 * TSNEAlgorithm — t-Distributed Stochastic Neighbor Embedding.
 *
 * U-EXTRACT-TSNE (slot:golf 2026-05-24 iter19): extracted from
 * extracted_modules/ai_ml_engines/PRISM_CLUSTERING_ENHANCED.js (t-SNE portion;
 * sibling to U-EXTRACT-DBSCAN + U-EXTRACT-KMEDOIDS). Closes the cluster trio.
 *
 * Reference: van der Maaten & Hinton (2008) "Visualizing Data using t-SNE",
 * Journal of Machine Learning Research 9: 2579-2605.
 *
 * Algorithm:
 *   1. Compute pairwise Euclidean distances D in high-D space
 *   2. For each i, binary-search precision beta_i s.t. H(P_i) = log(perplexity)
 *   3. Symmetrize: P_ij = (P_j|i + P_i|j) / (2n)
 *   4. Initialize Y in low-D randomly (small Gaussian-ish)
 *   5. Repeat:
 *      - Compute Q from Y using t-distribution (df=1): q_ij ∝ 1/(1+|y_i-y_j|²)
 *      - Compute gradient ∂C/∂y_i = 4·Σ_j (p_ij - q_ij)·(y_i - y_j)/(1+|y_i-y_j|²)
 *      - Update Y with momentum (0.5 < iter250, 0.8 after) + adaptive gains
 *      - Recenter Y at origin
 *
 * Pure function (deterministic given an RNG). Distance: Euclidean (L2).
 * Complexity: O(n² · maxIter) — fine for n<500. For larger n prefer Barnes-Hut
 * t-SNE (future U-EXTRACT-TSNE-BARNES-HUT).
 */

export interface TSNEResult {
  /** Low-D embedding: array of n points, each `dims` long. */
  Y: number[][];
  /** Number of gradient-descent iterations actually executed. */
  iterations: number;
}

export interface TSNEOptions {
  /** Target embedding dimensionality (typically 2 or 3). Default 2. */
  dims?: number;
  /** Effective neighborhood size (target entropy = log(perplexity)). Default 30. */
  perplexity?: number;
  /** Number of gradient-descent iterations. Default 500. */
  maxIter?: number;
  /** Gradient-descent learning rate. Default 100. */
  learningRate?: number;
  /** RNG for initialization (defaults to Math.random). Pass seeded RNG for determinism. */
  rng?: () => number;
}

const MOMENTUM_SWITCH_ITER = 250;
const MOMENTUM_EARLY = 0.5;
const MOMENTUM_LATE = 0.8;
const GAIN_FLOOR = 0.01;
const GAIN_STEP = 0.2;
const Q_FLOOR = 1e-12;
const P_FLOOR = 1e-10;
const BETA_SEARCH_TOL = 1e-5;
const BETA_SEARCH_MAX_ITER = 50;
const INIT_SCALE = 1e-4;

export class TSNEAlgorithm {
  /**
   * Embed high-D points X into low-D via t-SNE. `rng` defaults to Math.random;
   * pass a seeded RNG for deterministic tests.
   */
  static embed(X: number[][], opts: TSNEOptions = {}): TSNEResult {
    if (!Array.isArray(X)) {
      throw new TypeError("TSNEAlgorithm.embed: X must be an array");
    }
    const n = X.length;
    if (n < 2) {
      throw new RangeError(`TSNEAlgorithm.embed: need ≥2 points, got ${n}`);
    }
    const inputDim = X[0]?.length ?? 0;
    if (inputDim === 0) {
      throw new RangeError("TSNEAlgorithm.embed: points must have ≥1 dimension");
    }
    for (const p of X) {
      if (!Array.isArray(p) || p.length !== inputDim) {
        throw new RangeError("TSNEAlgorithm.embed: ragged dimensions detected");
      }
      for (const v of p) {
        if (!Number.isFinite(v)) {
          throw new RangeError("TSNEAlgorithm.embed: non-finite coordinate");
        }
      }
    }
    const dims = Number.isInteger(opts.dims) && opts.dims! >= 1 ? opts.dims! : 2;
    const perplexity = Number.isFinite(opts.perplexity) && opts.perplexity! > 0 ? opts.perplexity! : 30;
    if (perplexity >= n) {
      throw new RangeError(
        `TSNEAlgorithm.embed: perplexity (${perplexity}) must be < n (${n})`,
      );
    }
    const maxIter = Number.isInteger(opts.maxIter) && opts.maxIter! > 0 ? opts.maxIter! : 500;
    const learningRate = Number.isFinite(opts.learningRate) && opts.learningRate! > 0 ? opts.learningRate! : 100;
    const rng = typeof opts.rng === "function" ? opts.rng : Math.random;

    const D = TSNEAlgorithm._pairwiseDistances(X);
    const P = TSNEAlgorithm._computeP(D, perplexity);

    const Y: number[][] = Array.from({ length: n }, () =>
      Array.from({ length: dims }, () => (rng() - 0.5) * INIT_SCALE),
    );
    const gains: number[][] = Array.from({ length: n }, () => new Array<number>(dims).fill(1));
    const momentum: number[][] = Array.from({ length: n }, () => new Array<number>(dims).fill(0));

    let iterations = 0;
    for (let iter = 0; iter < maxIter; iter++) {
      iterations++;
      const Q = TSNEAlgorithm._computeQ(Y);
      const gradients = TSNEAlgorithm._computeGradients(P, Q, Y);
      const alpha = iter < MOMENTUM_SWITCH_ITER ? MOMENTUM_EARLY : MOMENTUM_LATE;

      for (let i = 0; i < n; i++) {
        for (let d = 0; d < dims; d++) {
          // Adaptive gain: amplify (gain += step) when grad and prior momentum
          // disagree in sign (oscillating → take bigger step); shrink otherwise.
          const sameSign = Math.sign(gradients[i][d]) === Math.sign(momentum[i][d]);
          const adjustment = sameSign ? -GAIN_STEP : GAIN_STEP;
          gains[i][d] = Math.max(GAIN_FLOOR, gains[i][d] + adjustment);
          momentum[i][d] = alpha * momentum[i][d] - learningRate * gains[i][d] * gradients[i][d];
          Y[i][d] += momentum[i][d];
        }
      }

      const center = new Array<number>(dims).fill(0);
      for (let i = 0; i < n; i++) {
        for (let d = 0; d < dims; d++) center[d] += Y[i][d];
      }
      for (let d = 0; d < dims; d++) center[d] /= n;
      for (let i = 0; i < n; i++) {
        for (let d = 0; d < dims; d++) Y[i][d] -= center[d];
      }
    }

    return { Y, iterations };
  }

  /** Internal: symmetric pairwise Euclidean distance matrix. */
  static _pairwiseDistances(X: number[][]): number[][] {
    const n = X.length;
    const dim = X[0].length;
    const D: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < dim; k++) {
          const delta = X[i][k] - X[j][k];
          sum += delta * delta;
        }
        const d = Math.sqrt(sum);
        D[i][j] = d;
        D[j][i] = d;
      }
    }
    return D;
  }

  /**
   * Internal: compute symmetric joint probability matrix P from D.
   * Binary-searches per-row precision beta so each row's entropy matches
   * log(perplexity), then symmetrizes: P_ij = (P_j|i + P_i|j) / (2n).
   */
  static _computeP(D: number[][], perplexity: number): number[][] {
    const n = D.length;
    const P: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    const targetEntropy = Math.log(perplexity);

    for (let i = 0; i < n; i++) {
      let betaMin = -Infinity;
      let betaMax = Infinity;
      let beta = 1;

      for (let iter = 0; iter < BETA_SEARCH_MAX_ITER; iter++) {
        let sumP = 0;
        for (let j = 0; j < n; j++) {
          if (i === j) {
            P[i][j] = 0;
            continue;
          }
          P[i][j] = Math.exp(-D[i][j] * D[i][j] * beta);
          sumP += P[i][j];
        }
        if (sumP < P_FLOOR) sumP = P_FLOOR;

        let H = 0;
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          P[i][j] /= sumP;
          if (P[i][j] > P_FLOOR) {
            H -= P[i][j] * Math.log(P[i][j]);
          }
        }

        const diff = H - targetEntropy;
        if (Math.abs(diff) < BETA_SEARCH_TOL) break;
        if (diff > 0) {
          betaMin = beta;
          beta = betaMax === Infinity ? beta * 2 : (beta + betaMax) / 2;
        } else {
          betaMax = beta;
          beta = betaMin === -Infinity ? beta / 2 : (beta + betaMin) / 2;
        }
      }
    }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const pij = (P[i][j] + P[j][i]) / (2 * n);
        P[i][j] = pij;
        P[j][i] = pij;
      }
      P[i][i] = 0;
    }
    return P;
  }

  /** Internal: joint Q probabilities from low-D Y (t-distribution, df=1). */
  static _computeQ(Y: number[][]): number[][] {
    const n = Y.length;
    const dims = Y[0].length;
    const Q: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    let sumQ = 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dist = 0;
        for (let k = 0; k < dims; k++) {
          const delta = Y[i][k] - Y[j][k];
          dist += delta * delta;
        }
        const q = 1 / (1 + dist);
        Q[i][j] = q;
        Q[j][i] = q;
        sumQ += 2 * q;
      }
    }
    if (sumQ < Q_FLOOR) sumQ = Q_FLOOR;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        Q[i][j] = Math.max(Q[i][j] / sumQ, Q_FLOOR);
      }
    }
    return Q;
  }

  /** Internal: gradients ∂C/∂y_i for each point. */
  static _computeGradients(P: number[][], Q: number[][], Y: number[][]): number[][] {
    const n = Y.length;
    const dims = Y[0].length;
    const gradients: number[][] = Array.from({ length: n }, () => new Array<number>(dims).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        let dist = 0;
        for (let k = 0; k < dims; k++) {
          const delta = Y[i][k] - Y[j][k];
          dist += delta * delta;
        }
        const mult = 4 * (P[i][j] - Q[i][j]) / (1 + dist);
        for (let d = 0; d < dims; d++) {
          gradients[i][d] += mult * (Y[i][d] - Y[j][d]);
        }
      }
    }
    return gradients;
  }
}

/** Singleton export per PRISM convention. */
export const tsneAlgorithm = TSNEAlgorithm;
