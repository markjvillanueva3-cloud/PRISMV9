/**
 * AdvancedRegressionEngine — Advanced Regression & ML Methods
 *
 * Implements Kernel Ridge Regression, Gaussian Mixture Model (EM),
 * Quantile Regression, Isotonic Regression (PAVA), Huber M-Estimators,
 * Stacking Ensemble, AdaBoost.R2, and Regularized Gradient Boosting.
 *
 * @module AdvancedRegressionEngine
 */
import { SVDEngine } from "./SVDEngine.js";
import { CholeskyEngine } from "./CholeskyEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface KernelRidgeInput {
  X_train: number[][];
  y_train: number[];
  X_test?: number[][];
  kernel?: 'rbf' | 'polynomial' | 'linear';
  alpha?: number;
  gamma?: number;
  degree?: number;
}

export interface KernelRidgeResult {
  predictions: number[];
  train_mse: number;
  alpha_coefficients: number[];
  support_size: number;
}

export interface GMMInput {
  data: number[][];
  n_components?: number;
  max_iter?: number;
  tol?: number;
  seed?: number;
}

export interface GMMResult {
  means: number[][];
  covariances: number[][][];
  weights: number[];
  labels: number[];
  log_likelihood: number;
  bic: number;
  aic: number;
  n_iterations: number;
  converged: boolean;
  responsibilities: number[][];
}

export interface GMMOptimalInput {
  data: number[][];
  max_components?: number;
  max_iter?: number;
  tol?: number;
  seed?: number;
}

export interface GMMOptimalResult {
  optimal_k: number;
  bic_values: number[];
  aic_values: number[];
}

export interface QuantileRegressionInput {
  X: number[][];
  y: number[];
  quantile?: number;
  quantiles?: number[];
}

export interface QuantileRegressionResult {
  coefficients: Record<number, number[]>;
  fitted_quantiles: Record<number, number[]>;
  prediction_interval: [number[], number[]];
}

export interface IsotonicInput {
  x: number[];
  y: number[];
  increasing?: boolean;
}

export interface IsotonicResult {
  fitted: number[];
  n_blocks: number;
  mse: number;
  r_squared: number;
}

export interface HuberInput {
  X: number[][];
  y: number[];
  delta?: number;
  max_iter?: number;
}

export interface HuberResult {
  coefficients: number[];
  intercept: number;
  residuals: number[];
  scale_estimate: number;
  outlier_flags: boolean[];
  n_outliers: number;
  comparison_ols: { coefficients: number[]; mse: number };
}

export interface StackingInput {
  X: number[][];
  y: number[];
  base_models: ('linear' | 'ridge' | 'polynomial' | 'kernel_ridge')[];
  meta_model?: 'linear' | 'ridge';
  n_folds?: number;
}

export interface StackingResult {
  predictions: number[];
  base_model_weights: number[];
  stacking_mse: number;
  best_single_model_mse: number;
  improvement_pct: number;
}

export interface AdaBoostInput {
  X_train: number[][];
  y_train: number[];
  X_test?: number[][];
  n_estimators?: number;
  learning_rate?: number;
  max_depth?: number;
}

export interface AdaBoostResult {
  predictions: number[];
  train_mse: number;
  estimator_weights: number[];
  feature_importance: number[];
}

export interface RegularizedBoostingInput {
  X_train: number[][];
  y_train: number[];
  X_test?: number[][];
  n_estimators?: number;
  learning_rate?: number;
  max_depth?: number;
  lambda?: number;
  alpha_l1?: number;
  min_child_weight?: number;
  subsample?: number;
  colsample?: number;
}

export interface RegularizedBoostingResult {
  predictions: number[];
  train_mse: number;
  feature_importance: number[];
  learning_curve: number[];
  best_iteration: number;
}

/** Recursive tree node for XGBoost-style gradient boosting */
interface XGBTreeNode {
  feature?: number;
  threshold?: number;
  left?: XGBTreeNode;
  right?: XGBTreeNode;
  value?: number;
}

// ============================================================================
// HELPERS — Linear Algebra
// ============================================================================

/** Simple seeded PRNG (Mulberry32) */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function matVecMul(A: number[][], v: number[]): number[] {
  return A.map(row => dot(row, v));
}

function transpose(A: number[][]): number[][] {
  const m = A.length, n = A[0].length;
  const T: number[][] = Array.from({ length: n }, () => new Array(m));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++) T[j][i] = A[i][j];
  return T;
}

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, p = B.length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++)
    for (let k = 0; k < p; k++)
      for (let j = 0; j < n; j++) C[i][j] += A[i][k] * B[k][j];
  return C;
}

/** Solve (A + αI)x = b via Cholesky (SPD) → SVD fallback → Gaussian elimination */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  // Primary: Cholesky for SPD normal equations (A^T*A + αI is always SPD)
  try {
    const L = CholeskyEngine.factorize(A).L;
    return CholeskyEngine.solve(L, b);
  } catch { /* not SPD */ }
  // Secondary: SVD least squares for rank-deficient or indefinite
  try {
    return SVDEngine.leastSquares(A, b).x;
  } catch { /* SVD failed */ }
  // Final fallback: Gaussian elimination with partial pivoting
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col, maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) { maxVal = Math.abs(aug[row][col]); maxRow = row; }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-14) continue;
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = aug[i][n];
    for (let j = i + 1; j < n; j++) s -= aug[i][j] * x[j];
    x[i] = Math.abs(aug[i][i]) < 1e-14 ? 0 : s / aug[i][i];
  }
  return x;
}

/** OLS via normal equations: β = (X^T X)^{-1} X^T y */
function olsFit(X: number[][], y: number[]): number[] {
  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  const Xty = matVecMul(Xt, y);
  return solveLinearSystem(XtX, Xty);
}

/** OLS with intercept: prepend column of 1s */
function olsFitWithIntercept(X: number[][], y: number[]): { coefficients: number[]; intercept: number } {
  const Xa = X.map(row => [1, ...row]);
  const beta = olsFit(Xa, y);
  return { intercept: beta[0], coefficients: beta.slice(1) };
}

function mse(y: number[], yhat: number[]): number {
  let s = 0;
  for (let i = 0; i < y.length; i++) s += (y[i] - yhat[i]) ** 2;
  return s / y.length;
}

function predict(X: number[][], coefficients: number[], intercept: number): number[] {
  return X.map(row => intercept + dot(row, coefficients));
}

/** Ridge regression: β = (X^T X + αI)^{-1} X^T y */
function ridgeFit(X: number[][], y: number[], alpha: number): { coefficients: number[]; intercept: number } {
  const Xa = X.map(row => [1, ...row]);
  const Xt = transpose(Xa);
  const XtX = matMul(Xt, Xa);
  const n = XtX.length;
  // Add alpha to diagonal (skip intercept term)
  for (let i = 1; i < n; i++) XtX[i][i] += alpha;
  const Xty = matVecMul(Xt, y);
  const beta = solveLinearSystem(XtX, Xty);
  return { intercept: beta[0], coefficients: beta.slice(1) };
}

/** Polynomial feature expansion */
function polyExpand(X: number[][], degree: number): number[][] {
  return X.map(row => {
    const expanded: number[] = [];
    for (let d = 1; d <= degree; d++) {
      for (const v of row) expanded.push(v ** d);
    }
    return expanded;
  });
}

// ============================================================================
// ENGINE
// ============================================================================

export class AdvancedRegressionEngine {
  readonly id = 'advanced-regression';
  readonly description = 'Advanced Regression & ML Methods: Kernel Ridge, GMM, Quantile, Isotonic, Huber, Ensemble, Boosting';

  // ==========================================================================
  // Method 1: Kernel Ridge Regression
  // ==========================================================================

  private computeKernel(X1: number[][], X2: number[][], kernel: string, gamma: number, degree: number): number[][] {
    const n1 = X1.length, n2 = X2.length;
    const K: number[][] = Array.from({ length: n1 }, () => new Array(n2).fill(0));
    for (let i = 0; i < n1; i++) {
      for (let j = 0; j < n2; j++) {
        if (kernel === 'linear') {
          K[i][j] = dot(X1[i], X2[j]);
        } else if (kernel === 'polynomial') {
          K[i][j] = (dot(X1[i], X2[j]) + 1) ** degree;
        } else {
          // RBF
          let sq = 0;
          for (let k = 0; k < X1[i].length; k++) sq += (X1[i][k] - X2[j][k]) ** 2;
          K[i][j] = Math.exp(-gamma * sq);
        }
      }
    }
    return K;
  }

  kernelRidgeRegression(params: KernelRidgeInput): KernelRidgeResult {
    const {
      X_train, y_train,
      kernel = 'rbf',
      alpha = 1.0,
      gamma: gammaIn,
      degree = 3,
    } = params;
    const X_test = params.X_test ?? X_train;
    const nFeatures = X_train[0].length;
    const gamma = gammaIn ?? 1 / nFeatures;
    const n = X_train.length;

    // Build kernel matrix K (n × n)
    const K = this.computeKernel(X_train, X_train, kernel, gamma, degree);
    // Regularize: K + αI
    for (let i = 0; i < n; i++) K[i][i] += alpha;
    // Solve (K + αI) α_coeff = y
    const alphaCoeffs = solveLinearSystem(K, y_train);

    // Predict on train
    const Ktrain = this.computeKernel(X_train, X_train, kernel, gamma, degree);
    const trainPred = matVecMul(Ktrain, alphaCoeffs);

    // Predict on test
    const Ktest = this.computeKernel(X_test, X_train, kernel, gamma, degree);
    const predictions = matVecMul(Ktest, alphaCoeffs);

    return {
      predictions,
      train_mse: mse(y_train, trainPred),
      alpha_coefficients: alphaCoeffs,
      support_size: n,
    };
  }

  // ==========================================================================
  // Method 2: Gaussian Mixture Model (EM)
  // ==========================================================================

  gaussianMixtureEM(params: GMMInput): GMMResult {
    const {
      data,
      n_components = 3,
      max_iter = 100,
      tol = 1e-4,
      seed = 42,
    } = params;
    const n = data.length;
    const d = data[0].length;
    const K = n_components;
    const rng = mulberry32(seed);

    // Initialize means via random selection from data
    const indices: number[] = [];
    while (indices.length < K) {
      const idx = Math.floor(rng() * n);
      if (!indices.includes(idx)) indices.push(idx);
    }
    const means: number[][] = indices.map(i => [...data[i]]);

    // Initialize covariances as identity
    let covariances: number[][][] = Array.from({ length: K }, () => {
      const cov: number[][] = Array.from({ length: d }, (_, i) => {
        const row = new Array(d).fill(0);
        row[i] = 1.0;
        return row;
      });
      return cov;
    });

    // Initialize equal weights
    let weights = new Array(K).fill(1 / K);

    // Responsibilities matrix
    let resp: number[][] = Array.from({ length: n }, () => new Array(K).fill(0));
    let prevLL = -Infinity;
    let logLikelihood = -Infinity;
    let converged = false;
    let iteration = 0;

    for (iteration = 0; iteration < max_iter; iteration++) {
      // E-step: compute responsibilities
      for (let i = 0; i < n; i++) {
        const logProbs: number[] = [];
        for (let k = 0; k < K; k++) {
          const lp = this.logMvnPdf(data[i], means[k], covariances[k]);
          logProbs.push(Math.log(weights[k] + 1e-300) + lp);
        }
        const maxLP = Math.max(...logProbs);
        const expProbs = logProbs.map(lp => Math.exp(lp - maxLP));
        const sumExp = expProbs.reduce((a, b) => a + b, 0);
        for (let k = 0; k < K; k++) resp[i][k] = expProbs[k] / sumExp;
      }

      // M-step
      for (let k = 0; k < K; k++) {
        let Nk = 0;
        for (let i = 0; i < n; i++) Nk += resp[i][k];
        if (Nk < 1e-10) Nk = 1e-10;

        // Update weight
        weights[k] = Nk / n;

        // Update mean
        const newMean = new Array(d).fill(0);
        for (let i = 0; i < n; i++)
          for (let j = 0; j < d; j++) newMean[j] += resp[i][k] * data[i][j];
        for (let j = 0; j < d; j++) newMean[j] /= Nk;
        means[k] = newMean;

        // Update covariance
        const newCov: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
        for (let i = 0; i < n; i++) {
          const diff = data[i].map((v, j) => v - newMean[j]);
          for (let a = 0; a < d; a++)
            for (let b = 0; b < d; b++) newCov[a][b] += resp[i][k] * diff[a] * diff[b];
        }
        for (let a = 0; a < d; a++)
          for (let b = 0; b < d; b++) newCov[a][b] /= Nk;
        // Regularize covariance
        for (let a = 0; a < d; a++) newCov[a][a] += 1e-6;
        covariances[k] = newCov;
      }

      // Compute log-likelihood
      logLikelihood = 0;
      for (let i = 0; i < n; i++) {
        let s = 0;
        for (let k = 0; k < K; k++) {
          s += weights[k] * Math.exp(this.logMvnPdf(data[i], means[k], covariances[k]));
        }
        logLikelihood += Math.log(s + 1e-300);
      }

      if (Math.abs(logLikelihood - prevLL) < tol) {
        converged = true;
        iteration++;
        break;
      }
      prevLL = logLikelihood;
    }

    // Assign labels
    const labels = resp.map(r => {
      let maxK = 0, maxV = r[0];
      for (let k = 1; k < K; k++) if (r[k] > maxV) { maxV = r[k]; maxK = k; }
      return maxK;
    });

    // BIC and AIC
    const nParams = K * d + K * d * (d + 1) / 2 + (K - 1);
    const bic = -2 * logLikelihood + nParams * Math.log(n);
    const aic = -2 * logLikelihood + 2 * nParams;

    return {
      means, covariances, weights, labels,
      log_likelihood: logLikelihood,
      bic, aic,
      n_iterations: iteration,
      converged,
      responsibilities: resp,
    };
  }

  /** Log PDF of multivariate normal */
  private logMvnPdf(x: number[], mean: number[], cov: number[][]): number {
    const d = x.length;
    const diff = x.map((v, i) => v - mean[i]);
    // Invert covariance via Gaussian elimination
    const invCov = this.invertMatrix(cov);
    const det = this.determinant(cov);
    // Mahalanobis: diff^T Σ^{-1} diff
    const tmp = matVecMul(invCov, diff);
    const mahal = dot(diff, tmp);
    return -0.5 * (d * Math.log(2 * Math.PI) + Math.log(Math.abs(det) + 1e-300) + mahal);
  }

  private invertMatrix(A: number[][]): number[][] {
    const n = A.length;
    // Augment with identity
    const aug: number[][] = A.map((row, i) => {
      const ext = new Array(n).fill(0);
      ext[i] = 1;
      return [...row, ...ext];
    });
    // Forward elimination
    for (let col = 0; col < n; col++) {
      let maxRow = col, maxVal = Math.abs(aug[col][col]);
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > maxVal) { maxVal = Math.abs(aug[row][col]); maxRow = row; }
      }
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
      const pivot = aug[col][col];
      if (Math.abs(pivot) < 1e-14) continue;
      for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = aug[row][col];
        for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
      }
    }
    return aug.map(row => row.slice(n));
  }

  private determinant(A: number[][]): number {
    const n = A.length;
    if (n === 1) return A[0][0];
    if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];
    // LU-based
    const M = A.map(r => [...r]);
    let det = 1;
    for (let col = 0; col < n; col++) {
      let maxRow = col, maxVal = Math.abs(M[col][col]);
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(M[row][col]) > maxVal) { maxVal = Math.abs(M[row][col]); maxRow = row; }
      }
      if (maxRow !== col) { [M[col], M[maxRow]] = [M[maxRow], M[col]]; det *= -1; }
      if (Math.abs(M[col][col]) < 1e-14) return 0;
      det *= M[col][col];
      for (let row = col + 1; row < n; row++) {
        const factor = M[row][col] / M[col][col];
        for (let j = col; j < n; j++) M[row][j] -= factor * M[col][j];
      }
    }
    return det;
  }

  gmmOptimalComponents(params: GMMOptimalInput): GMMOptimalResult {
    const { data, max_components = 10, max_iter, tol, seed } = params;
    const maxK = Math.min(max_components, data.length);
    const bicValues: number[] = [];
    const aicValues: number[] = [];

    for (let k = 1; k <= maxK; k++) {
      const result = this.gaussianMixtureEM({
        data, n_components: k, max_iter: max_iter ?? 100, tol: tol ?? 1e-4, seed: seed ?? 42,
      });
      bicValues.push(result.bic);
      aicValues.push(result.aic);
    }

    let optK = 1, minBIC = bicValues[0];
    for (let k = 1; k < bicValues.length; k++) {
      if (bicValues[k] < minBIC) { minBIC = bicValues[k]; optK = k + 1; }
    }

    return { optimal_k: optK, bic_values: bicValues, aic_values: aicValues };
  }

  // ==========================================================================
  // Method 3: Quantile Regression (IRLS)
  // ==========================================================================

  quantileRegression(params: QuantileRegressionInput): QuantileRegressionResult {
    const { X, y, quantile = 0.5 } = params;
    const quantiles = params.quantiles ?? [quantile];
    const n = X.length;
    const p = X[0].length;

    const coefficients: Record<number, number[]> = {};
    const fitted_quantiles: Record<number, number[]> = {};

    for (const tau of quantiles) {
      // IRLS for quantile regression
      // Prepend intercept
      const Xa = X.map(row => [1, ...row]);
      // Initialize with OLS
      let beta = olsFit(Xa, y);

      for (let iter = 0; iter < 50; iter++) {
        const pred = matVecMul(Xa, beta);
        const residuals = y.map((yi, i) => yi - pred[i]);

        // Compute weights for IRLS
        const eps = 1e-6;
        const weights = residuals.map(r => {
          const absR = Math.max(Math.abs(r), eps);
          return r >= 0 ? tau / absR : (1 - tau) / absR;
        });

        // Weighted least squares: (X^T W X) β = X^T W y
        const XtW: number[][] = transpose(Xa).map((row, i) =>
          row.map((v, j) => v * weights[j])
        );
        const XtWX = matMul(XtW, Xa);
        const XtWy = matVecMul(XtW, y);
        const newBeta = solveLinearSystem(XtWX, XtWy);

        // Convergence check
        let diff = 0;
        for (let j = 0; j < newBeta.length; j++) diff += (newBeta[j] - beta[j]) ** 2;
        beta = newBeta;
        if (Math.sqrt(diff) < 1e-8) break;
      }

      coefficients[tau] = beta;
      fitted_quantiles[tau] = matVecMul(Xa, beta);
    }

    // Prediction interval from min/max quantiles
    const sortedTaus = [...quantiles].sort((a, b) => a - b);
    const loTau = sortedTaus[0];
    const hiTau = sortedTaus[sortedTaus.length - 1];
    const lower = fitted_quantiles[loTau] ?? fitted_quantiles[quantiles[0]];
    const upper = fitted_quantiles[hiTau] ?? fitted_quantiles[quantiles[quantiles.length - 1]];

    return {
      coefficients,
      fitted_quantiles,
      prediction_interval: [lower, upper],
    };
  }

  // ==========================================================================
  // Method 4: Isotonic Regression (PAVA)
  // ==========================================================================

  isotonicRegression(params: IsotonicInput): IsotonicResult {
    const { x, y, increasing = true } = params;
    const n = x.length;

    // Sort by x
    const idxs = Array.from({ length: n }, (_, i) => i).sort((a, b) => x[a] - x[b]);
    const sortedY = idxs.map(i => y[i]);

    // Pool Adjacent Violators Algorithm
    interface Block { sum: number; count: number; }
    const blocks: Block[] = sortedY.map(v => ({ sum: v, count: 1 }));

    if (increasing) {
      let i = 0;
      while (i < blocks.length - 1) {
        const meanCur = blocks[i].sum / blocks[i].count;
        const meanNext = blocks[i + 1].sum / blocks[i + 1].count;
        if (meanCur > meanNext) {
          // Pool
          blocks[i].sum += blocks[i + 1].sum;
          blocks[i].count += blocks[i + 1].count;
          blocks.splice(i + 1, 1);
          if (i > 0) i--;
        } else {
          i++;
        }
      }
    } else {
      let i = 0;
      while (i < blocks.length - 1) {
        const meanCur = blocks[i].sum / blocks[i].count;
        const meanNext = blocks[i + 1].sum / blocks[i + 1].count;
        if (meanCur < meanNext) {
          blocks[i].sum += blocks[i + 1].sum;
          blocks[i].count += blocks[i + 1].count;
          blocks.splice(i + 1, 1);
          if (i > 0) i--;
        } else {
          i++;
        }
      }
    }

    // Expand blocks back to fitted values (in sorted order)
    const fittedSorted: number[] = [];
    for (const b of blocks) {
      const mean = b.sum / b.count;
      for (let j = 0; j < b.count; j++) fittedSorted.push(mean);
    }

    // Map back to original order
    const fitted = new Array(n);
    for (let i = 0; i < n; i++) fitted[idxs[i]] = fittedSorted[i];

    // MSE and R²
    const yMean = y.reduce((a, b) => a + b, 0) / n;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; i++) {
      ssRes += (y[i] - fitted[i]) ** 2;
      ssTot += (y[i] - yMean) ** 2;
    }
    const r_squared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

    return {
      fitted,
      n_blocks: blocks.length,
      mse: ssRes / n,
      r_squared,
    };
  }

  // ==========================================================================
  // Method 5: Huber Regression (M-Estimator)
  // ==========================================================================

  huberRegression(params: HuberInput): HuberResult {
    const { X, y, delta = 1.345, max_iter = 50 } = params; // 1.345 = canonical Huber (1964) for 95% efficiency
    const n = X.length;
    const p = X[0].length;

    // OLS for comparison
    const olsResult = olsFitWithIntercept(X, y);
    const olsPred = predict(X, olsResult.coefficients, olsResult.intercept);
    const olsMSE = mse(y, olsPred);

    // Prepend intercept column
    const Xa = X.map(row => [1, ...row]);

    // Initialize with OLS
    let beta = olsFit(Xa, y);

    for (let iter = 0; iter < max_iter; iter++) {
      const pred = matVecMul(Xa, beta);
      const residuals = y.map((yi, i) => yi - pred[i]);

      // Estimate scale (MAD)
      const absRes = residuals.map(Math.abs);
      absRes.sort((a, b) => a - b);
      const mad = absRes[Math.floor(absRes.length / 2)] / 0.6745;
      const scale = Math.max(mad, 1e-6);

      // Scaled residuals
      const scaledRes = residuals.map(r => r / scale);

      // Huber weights
      const weights = scaledRes.map(r => {
        const ar = Math.abs(r);
        return ar <= delta ? 1.0 : delta / ar;
      });

      // Weighted least squares
      const XtW: number[][] = transpose(Xa).map(row =>
        row.map((v, j) => v * weights[j])
      );
      const XtWX = matMul(XtW, Xa);
      const XtWy = matVecMul(XtW, y);
      const newBeta = solveLinearSystem(XtWX, XtWy);

      let diff = 0;
      for (let j = 0; j < newBeta.length; j++) diff += (newBeta[j] - beta[j]) ** 2;
      beta = newBeta;
      if (Math.sqrt(diff) < 1e-8) break;
    }

    const finalPred = matVecMul(Xa, beta);
    const residuals = y.map((yi, i) => yi - finalPred[i]);

    // Scale estimate (MAD)
    const absRes = residuals.map(Math.abs);
    absRes.sort((a, b) => a - b);
    const scaleEst = absRes[Math.floor(absRes.length / 2)] / 0.6745;

    // Outlier flags: |r| > delta * scale
    const outlierFlags = residuals.map(r => Math.abs(r) > delta * Math.max(scaleEst, 1e-6));
    const nOutliers = outlierFlags.filter(Boolean).length;

    return {
      coefficients: beta.slice(1),
      intercept: beta[0],
      residuals,
      scale_estimate: scaleEst,
      outlier_flags: outlierFlags,
      n_outliers: nOutliers,
      comparison_ols: { coefficients: olsResult.coefficients, mse: olsMSE },
    };
  }

  // ==========================================================================
  // Method 6: Stacking Ensemble
  // ==========================================================================

  stackingEnsemble(params: StackingInput): StackingResult {
    const {
      X, y,
      base_models,
      meta_model = 'ridge',
      n_folds = 5,
    } = params;
    const n = X.length;
    const nModels = base_models.length;

    // Generate fold indices
    const foldSize = Math.floor(n / n_folds);
    const foldIdx: number[][] = [];
    for (let f = 0; f < n_folds; f++) {
      const start = f * foldSize;
      const end = f === n_folds - 1 ? n : start + foldSize;
      foldIdx.push(Array.from({ length: end - start }, (_, i) => start + i));
    }

    // Level 0: cross-validated OOF predictions
    const oofPredictions: number[][] = Array.from({ length: n }, () => new Array(nModels).fill(0));
    const singleModelMSEs: number[] = new Array(nModels).fill(0);

    for (let m = 0; m < nModels; m++) {
      for (let f = 0; f < n_folds; f++) {
        const testIdx = foldIdx[f];
        const trainIdx: number[] = [];
        for (let ff = 0; ff < n_folds; ff++) if (ff !== f) trainIdx.push(...foldIdx[ff]);

        const Xtrain = trainIdx.map(i => X[i]);
        const ytrain = trainIdx.map(i => y[i]);
        const Xtest = testIdx.map(i => X[i]);

        const model = this.fitBaseModel(base_models[m], Xtrain, ytrain);
        const preds = this.predictBaseModel(model, Xtest);
        for (let i = 0; i < testIdx.length; i++) oofPredictions[testIdx[i]][m] = preds[i];
      }
      // Single model MSE
      const singlePred = oofPredictions.map(row => row[m]);
      singleModelMSEs[m] = mse(y, singlePred);
    }

    // Level 1: train meta-model on OOF predictions
    const metaResult = meta_model === 'ridge'
      ? ridgeFit(oofPredictions, y, 1.0)
      : olsFitWithIntercept(oofPredictions, y);

    const stackedPred = predict(oofPredictions, metaResult.coefficients, metaResult.intercept);
    const stackingMSE = mse(y, stackedPred);
    const bestSingleMSE = Math.min(...singleModelMSEs);
    const improvement = bestSingleMSE > 0 ? ((bestSingleMSE - stackingMSE) / bestSingleMSE) * 100 : 0;

    return {
      predictions: stackedPred,
      base_model_weights: metaResult.coefficients,
      stacking_mse: stackingMSE,
      best_single_model_mse: bestSingleMSE,
      improvement_pct: improvement,
    };
  }

  private fitBaseModel(
    type: string,
    X: number[][],
    y: number[],
  ): { type: string; coefficients: number[]; intercept: number; Xtrain?: number[][] } {
    switch (type) {
      case 'ridge': {
        const r = ridgeFit(X, y, 1.0);
        return { type, ...r };
      }
      case 'polynomial': {
        const Xp = polyExpand(X, 2);
        const r = olsFitWithIntercept(Xp, y);
        return { type, ...r };
      }
      case 'kernel_ridge': {
        // Fit KRR internally (store training data for prediction)
        const result = this.kernelRidgeRegression({ X_train: X, y_train: y, alpha: 1.0 });
        return { type, coefficients: result.alpha_coefficients, intercept: 0, Xtrain: X };
      }
      default: {
        const r = olsFitWithIntercept(X, y);
        return { type, ...r };
      }
    }
  }

  private predictBaseModel(
    model: { type: string; coefficients: number[]; intercept: number; Xtrain?: number[][] },
    X: number[][],
  ): number[] {
    switch (model.type) {
      case 'polynomial': {
        const Xp = polyExpand(X, 2);
        return predict(Xp, model.coefficients, model.intercept);
      }
      case 'kernel_ridge': {
        if (!model.Xtrain) return predict(X, model.coefficients, model.intercept);
        const K = this.computeKernel(X, model.Xtrain, 'rbf', 1 / model.Xtrain[0].length, 3);
        return matVecMul(K, model.coefficients);
      }
      default:
        return predict(X, model.coefficients, model.intercept);
    }
  }

  // ==========================================================================
  // Method 6b: AdaBoost.R2
  // ==========================================================================

  adaBoostRegress(params: AdaBoostInput): AdaBoostResult {
    const {
      X_train, y_train,
      n_estimators = 50,
      learning_rate = 1.0,
      max_depth = 3,
    } = params;
    const X_test = params.X_test ?? X_train;
    const n = X_train.length;
    const p = X_train[0].length;

    // Initialize weights
    let sampleWeights = new Array(n).fill(1 / n);
    const estimators: { feature: number; threshold: number; left_val: number; right_val: number }[] = [];
    const estimatorWeights: number[] = [];
    const featureImportance = new Array(p).fill(0);

    for (let t = 0; t < n_estimators; t++) {
      // Fit simple decision stump (depth-1 tree)
      const stump = this.fitDecisionStump(X_train, y_train, sampleWeights, max_depth);
      estimators.push(stump);

      // Compute predictions
      const pred = X_train.map(row =>
        row[stump.feature] <= stump.threshold ? stump.left_val : stump.right_val
      );

      // Compute errors
      const errors = y_train.map((yi, i) => Math.abs(yi - pred[i]));
      const maxError = Math.max(...errors, 1e-10);
      const normalizedErrors = errors.map(e => e / maxError);

      // Weighted error
      let weightedError = 0;
      for (let i = 0; i < n; i++) weightedError += sampleWeights[i] * normalizedErrors[i];
      weightedError = Math.min(weightedError, 0.9999);

      // Estimator weight
      const beta = weightedError / (1 - weightedError + 1e-10);
      const estWeight = learning_rate * Math.log(1 / (beta + 1e-10));
      estimatorWeights.push(estWeight);

      // Update sample weights
      for (let i = 0; i < n; i++) {
        sampleWeights[i] *= Math.pow(beta, (1 - normalizedErrors[i]) * learning_rate);
      }
      // Normalize
      const wSum = sampleWeights.reduce((a, b) => a + b, 0);
      sampleWeights = sampleWeights.map(w => w / wSum);

      // Feature importance
      featureImportance[stump.feature] += estWeight;
    }

    // Normalize feature importance
    const fiSum = featureImportance.reduce((a, b) => a + b, 0) || 1;
    const normFI = featureImportance.map(v => v / fiSum);

    // Predictions: weighted median (simplified to weighted mean)
    const testPred = X_test.map(row => {
      let wSum = 0, wPred = 0;
      for (let t = 0; t < estimators.length; t++) {
        const s = estimators[t];
        const p = row[s.feature] <= s.threshold ? s.left_val : s.right_val;
        wPred += estimatorWeights[t] * p;
        wSum += estimatorWeights[t];
      }
      return wPred / (wSum || 1);
    });

    const trainPred = X_train.map(row => {
      let wSum = 0, wPred = 0;
      for (let t = 0; t < estimators.length; t++) {
        const s = estimators[t];
        const p = row[s.feature] <= s.threshold ? s.left_val : s.right_val;
        wPred += estimatorWeights[t] * p;
        wSum += estimatorWeights[t];
      }
      return wPred / (wSum || 1);
    });

    return {
      predictions: testPred,
      train_mse: mse(y_train, trainPred),
      estimator_weights: estimatorWeights,
      feature_importance: normFI,
    };
  }

  private fitDecisionStump(
    X: number[][], y: number[], weights: number[], maxDepth: number
  ): { feature: number; threshold: number; left_val: number; right_val: number } {
    const n = X.length, p = X[0].length;
    let bestFeature = 0, bestThreshold = 0, bestLoss = Infinity;
    let bestLeftVal = 0, bestRightVal = 0;

    for (let f = 0; f < p; f++) {
      // Get unique sorted thresholds
      const vals = X.map(row => row[f]);
      const sorted = [...new Set(vals)].sort((a, b) => a - b);
      const thresholds = sorted.slice(0, -1).map((v, i) => (v + sorted[i + 1]) / 2);

      for (const th of thresholds) {
        let leftSum = 0, leftW = 0, rightSum = 0, rightW = 0;
        for (let i = 0; i < n; i++) {
          if (X[i][f] <= th) { leftSum += weights[i] * y[i]; leftW += weights[i]; }
          else { rightSum += weights[i] * y[i]; rightW += weights[i]; }
        }
        const lv = leftW > 0 ? leftSum / leftW : 0;
        const rv = rightW > 0 ? rightSum / rightW : 0;

        let loss = 0;
        for (let i = 0; i < n; i++) {
          const pred = X[i][f] <= th ? lv : rv;
          loss += weights[i] * (y[i] - pred) ** 2;
        }

        if (loss < bestLoss) {
          bestLoss = loss;
          bestFeature = f;
          bestThreshold = th;
          bestLeftVal = lv;
          bestRightVal = rv;
        }
      }
    }

    return { feature: bestFeature, threshold: bestThreshold, left_val: bestLeftVal, right_val: bestRightVal };
  }

  // ==========================================================================
  // Method 7: Regularized Gradient Boosting (XGBoost-style)
  // ==========================================================================

  regularizedBoosting(params: RegularizedBoostingInput): RegularizedBoostingResult {
    const {
      X_train, y_train,
      n_estimators = 100,
      learning_rate = 0.3,
      max_depth = 6,
      lambda: lambdaReg = 1.0,
      alpha_l1 = 0,
      min_child_weight = 1,
      subsample = 1.0,
      colsample = 1.0,
    } = params;
    const X_test = params.X_test ?? X_train;
    const n = X_train.length;
    const p = X_train[0].length;

    // Initialize predictions with mean
    const yMean = y_train.reduce((a, b) => a + b, 0) / n;
    let trainPred = new Array(n).fill(yMean);
    let testPred = new Array(X_test.length).fill(yMean);

    const featureImportance = new Array(p).fill(0);
    const learningCurve: number[] = [];

    const trees: XGBTreeNode[] = [];
    let bestIteration = 0;
    let bestMSE = Infinity;

    for (let t = 0; t < n_estimators; t++) {
      // Compute gradients and hessians (MSE loss)
      const gradients = y_train.map((yi, i) => trainPred[i] - yi); // g = pred - y
      const hessians = new Array(n).fill(1.0); // h = 1 for MSE

      // Subsample
      let sampleMask: boolean[];
      if (subsample < 1.0) {
        sampleMask = y_train.map(() => Math.random() < subsample);
      } else {
        sampleMask = new Array(n).fill(true);
      }

      // Column sample
      let colMask: boolean[];
      if (colsample < 1.0) {
        colMask = Array.from({ length: p }, () => Math.random() < colsample);
        // Ensure at least one feature
        if (!colMask.some(Boolean)) colMask[0] = true;
      } else {
        colMask = new Array(p).fill(true);
      }

      // Build tree
      const indices = Array.from({ length: n }, (_, i) => i).filter(i => sampleMask[i]);
      const tree = this.buildXGBTree(
        X_train, gradients, hessians, indices, colMask,
        0, Math.min(max_depth, 6), lambdaReg, alpha_l1, min_child_weight, featureImportance
      );
      trees.push(tree);

      // Update predictions
      for (let i = 0; i < n; i++) {
        trainPred[i] += learning_rate * this.predictXGBTree(tree, X_train[i]);
      }
      for (let i = 0; i < X_test.length; i++) {
        testPred[i] += learning_rate * this.predictXGBTree(tree, X_test[i]);
      }

      const curMSE = mse(y_train, trainPred);
      learningCurve.push(curMSE);
      if (curMSE < bestMSE) { bestMSE = curMSE; bestIteration = t; }
    }

    // Normalize feature importance
    const fiSum = featureImportance.reduce((a, b) => a + b, 0) || 1;
    const normFI = featureImportance.map(v => v / fiSum);

    return {
      predictions: testPred,
      train_mse: mse(y_train, trainPred),
      feature_importance: normFI,
      learning_curve: learningCurve,
      best_iteration: bestIteration,
    };
  }

  private buildXGBTree(
    X: number[][], gradients: number[], hessians: number[],
    indices: number[], colMask: boolean[],
    depth: number, maxDepth: number,
    lambda: number, alphaL1: number, minChildWeight: number,
    featureImportance: number[]
  ): XGBTreeNode {
    // Compute leaf value: -G/(H+λ) with L1 threshold
    const G = indices.reduce((s, i) => s + gradients[i], 0);
    const H = indices.reduce((s, i) => s + hessians[i], 0);
    const leafValue = -this.softThreshold(G, alphaL1) / (H + lambda);

    if (depth >= maxDepth || indices.length < 2 * minChildWeight) {
      return { value: leafValue };
    }

    const p = X[0].length;
    let bestGain = 0, bestFeature = -1, bestThreshold = 0;

    for (let f = 0; f < p; f++) {
      if (!colMask[f]) continue;
      const vals = indices.map(i => X[i][f]);
      const sorted = [...new Set(vals)].sort((a, b) => a - b);
      if (sorted.length < 2) continue;

      for (let s = 0; s < sorted.length - 1; s++) {
        const th = (sorted[s] + sorted[s + 1]) / 2;
        let GL = 0, HL = 0, GR = 0, HR = 0;
        for (const i of indices) {
          if (X[i][f] <= th) { GL += gradients[i]; HL += hessians[i]; }
          else { GR += gradients[i]; HR += hessians[i]; }
        }

        if (HL < minChildWeight || HR < minChildWeight) continue;

        const gain = 0.5 * (
          (this.softThreshold(GL, alphaL1) ** 2) / (HL + lambda) +
          (this.softThreshold(GR, alphaL1) ** 2) / (HR + lambda) -
          (this.softThreshold(GL + GR, alphaL1) ** 2) / (HL + HR + lambda)
        );

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = th;
        }
      }
    }

    if (bestFeature < 0) return { value: leafValue };

    featureImportance[bestFeature] += bestGain;

    const leftIdx = indices.filter(i => X[i][bestFeature] <= bestThreshold);
    const rightIdx = indices.filter(i => X[i][bestFeature] > bestThreshold);

    return {
      feature: bestFeature,
      threshold: bestThreshold,
      left: this.buildXGBTree(X, gradients, hessians, leftIdx, colMask, depth + 1, maxDepth, lambda, alphaL1, minChildWeight, featureImportance),
      right: this.buildXGBTree(X, gradients, hessians, rightIdx, colMask, depth + 1, maxDepth, lambda, alphaL1, minChildWeight, featureImportance),
    };
  }

  private predictXGBTree(node: XGBTreeNode, x: number[]): number {
    if (node.value !== undefined && node.feature === undefined) return node.value;
    // After the guard above, feature/threshold/left/right are guaranteed present
    // for internal (non-leaf) nodes produced by buildXGBTree
    if (node.feature === undefined || node.threshold === undefined) return node.value ?? 0;
    if (x[node.feature] <= node.threshold) return this.predictXGBTree(node.left!, x);
    return this.predictXGBTree(node.right!, x);
  }

  private softThreshold(g: number, alpha: number): number {
    if (g > alpha) return g - alpha;
    if (g < -alpha) return g + alpha;
    return 0;
  }
}

export const advancedRegressionEngine = new AdvancedRegressionEngine();
