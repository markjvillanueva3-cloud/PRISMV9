/**
 * RobustRegressionEngine — Regularized & Robust Regression Methods
 *
 * Capabilities:
 *   - Ridge regression (L2 regularized, closed-form)
 *   - Lasso regression (L1 regularized, coordinate descent)
 *   - Elastic Net (combined L1 + L2, coordinate descent)
 *   - Huber regression (M-estimator via IRLS, outlier-robust)
 *   - RANSAC (Random Sample Consensus for geometric fitting)
 *   - OLS baseline for comparison
 *
 * Used by: Kienzle coefficient fitting from noisy force data, Taylor tool life
 *   regression with outliers, CMM geometric fitting, sensor calibration.
 *
 * References:
 *   - Tibshirani (1996), "Regression Shrinkage and Selection via the Lasso"
 *   - Hoerl & Kennard (1970), "Ridge Regression"
 *   - Zou & Hastie (2005), "Regularization and variable selection via the elastic net"
 *   - Huber (1964), "Robust Estimation of a Location Parameter"
 *   - Fischler & Bolles (1981), "Random Sample Consensus"
 *
 * @engine RobustRegressionEngine
 * @milestone SCIMATH-MS0
 * @unit P2-U02
 * @courses MIT 18.065, MIT 6.867
 */

// ============================================================================
// TYPES
// ============================================================================

/** Regression result */
export interface RegressionResult {
  /** Coefficient vector (p×1) */
  coefficients: number[];
  /** Intercept (if fitIntercept=true) */
  intercept: number;
  /** Residual sum of squares */
  rss: number;
  /** R² goodness of fit */
  r2: number;
  /** Method used */
  method: string;
}

/** Ridge/Lasso/ElasticNet options */
export interface RegularizedOptions {
  /** Regularization strength λ > 0 (default 1.0) */
  lambda?: number;
  /** Elastic net mixing: α=1 → Lasso, α=0 → Ridge (default 1.0 for Lasso, 0.0 for Ridge) */
  alpha?: number;
  /** Fit intercept (default true) */
  fitIntercept?: boolean;
  /** Max iterations for iterative methods (default 1000) */
  maxIter?: number;
  /** Convergence tolerance (default 1e-6) */
  tol?: number;
}

/** Huber options */
export interface HuberOptions {
  /** Huber threshold: residuals > delta use linear loss (default 1.345 for 95% efficiency) */
  delta?: number;
  /** Fit intercept (default true) */
  fitIntercept?: boolean;
  /** Max IRLS iterations (default 50) */
  maxIter?: number;
  /** Convergence tolerance (default 1e-6) */
  tol?: number;
}

/** RANSAC options */
export interface RANSACOptions {
  /** Minimum number of points for a model (default: p+1 for p features) */
  minSamples?: number;
  /** Inlier threshold: |residual| < threshold → inlier (default 3.0) */
  threshold?: number;
  /** Maximum iterations (default 100) */
  maxIter?: number;
  /** Stop if this fraction of points are inliers (default 0.9) */
  stopFraction?: number;
  /** Random seed for reproducibility */
  seed?: number;
}

/** RANSAC result extends RegressionResult */
export interface RANSACResult extends RegressionResult {
  /** Inlier indices */
  inlierIndices: number[];
  /** Number of inliers */
  numInliers: number;
  /** Number of RANSAC iterations performed */
  iterations: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class RobustRegressionEngine {

  /**
   * Ordinary Least Squares: β = (X^T X)^{-1} X^T y.
   * Baseline for comparison with regularized methods.
   */
  static ols(X: number[][], y: number[], fitIntercept = true): RegressionResult {
    const { Xa, ya } = augment(X, y, fitIntercept);
    const m = Xa.length;
    const p = Xa[0].length;

    // Normal equations: (X^T X) β = X^T y
    const XtX = matMul(transpose(Xa), Xa);
    const Xty = matVec(transpose(Xa), ya);
    const beta = solveSymmetric(XtX, Xty);

    return buildResult(beta, Xa, ya, fitIntercept, "ols");
  }

  /**
   * Ridge regression: β = (X^T X + λI)^{-1} X^T y.
   * L2 penalty shrinks all coefficients toward zero, stabilizes ill-conditioned problems.
   *
   * Reference: Hoerl & Kennard (1970).
   */
  static ridge(X: number[][], y: number[], options: RegularizedOptions = {}): RegressionResult {
    const { lambda = 1.0, fitIntercept = true } = options;
    if (lambda < 0) throw new Error("Ridge: lambda must be >= 0");

    const { Xa, ya } = augment(X, y, fitIntercept);
    const p = Xa[0].length;

    const XtX = matMul(transpose(Xa), Xa);
    // Add λI to non-intercept terms
    const startIdx = fitIntercept ? 1 : 0;
    for (let i = startIdx; i < p; i++) XtX[i][i] += lambda;

    const Xty = matVec(transpose(Xa), ya);
    const beta = solveSymmetric(XtX, Xty);

    return buildResult(beta, Xa, ya, fitIntercept, "ridge");
  }

  /**
   * Lasso regression via coordinate descent.
   * L1 penalty produces sparse solutions (feature selection).
   *
   * Reference: Tibshirani (1996); Friedman et al. (2010) coordinate descent.
   */
  static lasso(X: number[][], y: number[], options: RegularizedOptions = {}): RegressionResult {
    return RobustRegressionEngine.elasticNet(X, y, { ...options, alpha: 1.0 });
  }

  /**
   * Elastic Net via coordinate descent: minimize ||y - Xβ||² + λ(α||β||₁ + (1-α)||β||²/2).
   * α=1 → Lasso, α=0 → Ridge.
   *
   * Reference: Zou & Hastie (2005); Friedman et al. (2010).
   */
  static elasticNet(X: number[][], y: number[], options: RegularizedOptions = {}): RegressionResult {
    const { lambda = 1.0, alpha = 0.5, fitIntercept = true, maxIter = 1000, tol = 1e-6 } = options;
    if (lambda < 0) throw new Error("ElasticNet: lambda must be >= 0");

    const { Xa, ya } = augment(X, y, fitIntercept);
    const m = Xa.length;
    const p = Xa[0].length;

    // Precompute column norms
    const colNorms = new Array(p).fill(0);
    for (let j = 0; j < p; j++)
      for (let i = 0; i < m; i++) colNorms[j] += Xa[i][j] * Xa[i][j];

    const beta = new Array(p).fill(0);
    const residual = ya.slice();

    for (let iter = 0; iter < maxIter; iter++) {
      let maxChange = 0;

      for (let j = 0; j < p; j++) {
        const oldBeta = beta[j];

        // Add back contribution of j-th feature to residual
        if (oldBeta !== 0) {
          for (let i = 0; i < m; i++) residual[i] += Xa[i][j] * oldBeta;
        }

        // Compute partial residual correlation
        let rho = 0;
        for (let i = 0; i < m; i++) rho += Xa[i][j] * residual[i];

        // Coordinate descent update with soft thresholding
        const isIntercept = fitIntercept && j === 0;
        if (isIntercept) {
          // Don't penalize intercept
          beta[j] = rho / colNorms[j];
        } else {
          const lambdaAlpha = lambda * alpha;
          const lambdaOneMinusAlpha = lambda * (1 - alpha);
          beta[j] = softThreshold(rho, lambdaAlpha) / (colNorms[j] + lambdaOneMinusAlpha);
        }

        // Update residual
        if (beta[j] !== 0) {
          for (let i = 0; i < m; i++) residual[i] -= Xa[i][j] * beta[j];
        }

        maxChange = Math.max(maxChange, Math.abs(beta[j] - oldBeta));
      }

      if (maxChange < tol) break;
    }

    return buildResult(beta, Xa, ya, fitIntercept, alpha >= 1 ? "lasso" : alpha <= 0 ? "ridge-cd" : "elastic-net");
  }

  /**
   * Huber robust regression via Iteratively Reweighted Least Squares (IRLS).
   * Uses Huber loss: L(r) = r²/2 for |r|≤δ, δ(|r|-δ/2) for |r|>δ.
   * δ=1.345 gives 95% asymptotic efficiency for normal errors.
   *
   * Reference: Huber (1964); Holland & Welsch (1977) for IRLS.
   */
  static huber(X: number[][], y: number[], options: HuberOptions = {}): RegressionResult {
    const { delta = 1.345, fitIntercept = true, maxIter = 50, tol = 1e-6 } = options;
    if (delta <= 0) throw new Error("Huber: delta must be > 0");

    const { Xa, ya } = augment(X, y, fitIntercept);
    const m = Xa.length;
    const p = Xa[0].length;

    // Start with OLS
    let beta = solveSymmetric(
      matMul(transpose(Xa), Xa),
      matVec(transpose(Xa), ya)
    );

    for (let iter = 0; iter < maxIter; iter++) {
      // Compute residuals
      const r = new Array(m);
      for (let i = 0; i < m; i++) {
        let pred = 0;
        for (let j = 0; j < p; j++) pred += Xa[i][j] * beta[j];
        r[i] = ya[i] - pred;
      }

      // Compute MAD for scale estimation: σ = MAD / 0.6745
      const absR = r.map(Math.abs);
      absR.sort((a, b) => a - b);
      const mad = absR[Math.floor(absR.length / 2)];
      const sigma = Math.max(mad / 0.6745, 1e-10);

      // Huber weights: w(r) = 1 for |r/σ| ≤ δ, δ/(|r/σ|) for |r/σ| > δ
      const w = new Array(m);
      for (let i = 0; i < m; i++) {
        const scaled = Math.abs(r[i]) / sigma;
        w[i] = scaled <= delta ? 1.0 : delta / scaled;
      }

      // Weighted least squares: (X^T W X) β = X^T W y
      const WXa: number[][] = Xa.map((row, i) => row.map(v => v * w[i]));
      const XtWX = matMul(transpose(Xa), WXa);
      const XtWy = matVec(transpose(WXa), ya);
      const betaNew = solveSymmetric(XtWX, XtWy);

      // Check convergence
      let maxChange = 0;
      for (let j = 0; j < p; j++) maxChange = Math.max(maxChange, Math.abs(betaNew[j] - beta[j]));
      beta = betaNew;

      if (maxChange < tol) break;
    }

    return buildResult(beta, Xa, ya, fitIntercept, "huber");
  }

  /**
   * RANSAC: Random Sample Consensus for fitting with gross outliers.
   * Randomly selects minimal subsets, fits OLS, counts inliers, keeps best model.
   *
   * Reference: Fischler & Bolles (1981).
   *
   * @param X Feature matrix (m×p)
   * @param y Target vector (m×1)
   * @param options RANSAC configuration
   */
  static ransac(X: number[][], y: number[], options: RANSACOptions = {}): RANSACResult {
    const m = X.length;
    const p = X[0]?.length ?? 0;
    const {
      minSamples = p + 1,
      threshold = 3.0,
      maxIter = 100,
      stopFraction = 0.9,
      seed = 42,
    } = options;

    if (minSamples > m) throw new Error("RANSAC: minSamples exceeds data size");

    let rng = mulberry32(seed);

    let bestInliers: number[] = [];
    let bestResult: RegressionResult | null = null;
    let iterations = 0;

    for (let iter = 0; iter < maxIter; iter++) {
      iterations++;

      // Random sample
      const indices = randomSample(m, minSamples, rng);
      const Xs = indices.map(i => X[i]);
      const ys = indices.map(i => y[i]);

      // Fit model on sample
      let result: RegressionResult;
      try {
        result = RobustRegressionEngine.ols(Xs, ys);
      } catch {
        continue; // Singular sample, skip
      }

      // Count inliers
      const inliers: number[] = [];
      for (let i = 0; i < m; i++) {
        let pred = result.intercept;
        for (let j = 0; j < p; j++) pred += X[i][j] * result.coefficients[j];
        if (Math.abs(y[i] - pred) < threshold) inliers.push(i);
      }

      if (inliers.length > bestInliers.length) {
        bestInliers = inliers;
        bestResult = result;

        if (inliers.length >= m * stopFraction) break;
      }
    }

    // Refit on all inliers
    if (bestInliers.length >= minSamples) {
      const Xin = bestInliers.map(i => X[i]);
      const yin = bestInliers.map(i => y[i]);
      try {
        bestResult = RobustRegressionEngine.ols(Xin, yin);
      } catch {
        // Keep the sample-based fit
      }
    }

    if (!bestResult) {
      throw new Error("RANSAC: failed to find any valid model");
    }

    return {
      ...bestResult,
      method: "ransac",
      inlierIndices: bestInliers,
      numInliers: bestInliers.length,
      iterations,
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/** Add intercept column and center if needed */
function augment(X: number[][], y: number[], fitIntercept: boolean): { Xa: number[][]; ya: number[] } {
  if (fitIntercept) {
    return {
      Xa: X.map(row => [1, ...row]),
      ya: y.slice(),
    };
  }
  return { Xa: X.map(row => row.slice()), ya: y.slice() };
}

/** Soft thresholding: S(z, λ) = sign(z) * max(|z| - λ, 0) */
function softThreshold(z: number, lambda: number): number {
  if (z > lambda) return z - lambda;
  if (z < -lambda) return z + lambda;
  return 0;
}

/** Build result from coefficient vector */
function buildResult(
  beta: number[], Xa: number[][], ya: number[],
  fitIntercept: boolean, method: string
): RegressionResult {
  const m = Xa.length;
  const intercept = fitIntercept ? beta[0] : 0;
  const coefficients = fitIntercept ? beta.slice(1) : beta.slice();

  // RSS and R²
  let rss = 0;
  let tss = 0;
  let yMean = 0;
  for (let i = 0; i < m; i++) yMean += ya[i];
  yMean /= m;

  for (let i = 0; i < m; i++) {
    let pred = 0;
    for (let j = 0; j < Xa[0].length; j++) pred += Xa[i][j] * beta[j];
    rss += (ya[i] - pred) ** 2;
    tss += (ya[i] - yMean) ** 2;
  }

  return {
    coefficients,
    intercept,
    rss,
    r2: tss > 0 ? 1 - rss / tss : 1,
    method,
  };
}

/** Transpose matrix */
function transpose(A: number[][]): number[][] {
  const m = A.length, n = A[0].length;
  const T: number[][] = Array.from({ length: n }, () => new Array(m));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++) T[j][i] = A[i][j];
  return T;
}

/** Matrix multiply A (m×k) * B (k×n) → C (m×n) */
function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, k = A[0].length, n = B[0].length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      for (let l = 0; l < k; l++) C[i][j] += A[i][l] * B[l][j];
  return C;
}

/** Matrix-vector multiply A (m×n) * v (n) → w (m) */
function matVec(A: number[][], v: number[]): number[] {
  const m = A.length, n = A[0].length;
  const w = new Array(m).fill(0);
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++) w[i] += A[i][j] * v[j];
  return w;
}

/** Solve symmetric positive-definite system A*x = b via Cholesky */
function solveSymmetric(A: number[][], b: number[]): number[] {
  const n = A.length;
  // Cholesky: A = L * L^T
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        const diag = A[i][i] - sum;
        if (diag <= 0) {
          // Fall back to regularized solve
          return solveGaussJordan(A, b);
        }
        L[i][j] = Math.sqrt(diag);
      } else {
        L[i][j] = (A[i][j] - sum) / L[j][j];
      }
    }
  }

  // Forward: L * z = b
  const z = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < i; j++) sum += L[i][j] * z[j];
    z[i] = (b[i] - sum) / L[i][i];
  }

  // Backward: L^T * x = z
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) sum += L[j][i] * x[j];
    x[i] = (z[i] - sum) / L[i][i];
  }

  return x;
}

/** Gauss-Jordan fallback for non-SPD systems */
function solveGaussJordan(A: number[][], b: number[]): number[] {
  const n = A.length;
  const aug = A.map((row, i) => [...row, b[i]]);

  for (let k = 0; k < n; k++) {
    let maxVal = Math.abs(aug[k][k]), maxRow = k;
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(aug[i][k]) > maxVal) { maxVal = Math.abs(aug[i][k]); maxRow = i; }
    }
    if (maxVal < 1e-15) continue;
    if (maxRow !== k) [aug[k], aug[maxRow]] = [aug[maxRow], aug[k]];

    const pivot = aug[k][k];
    for (let j = k; j <= n; j++) aug[k][j] /= pivot;

    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const factor = aug[i][k];
      for (let j = k; j <= n; j++) aug[i][j] -= factor * aug[k][j];
    }
  }

  return aug.map(row => row[n]);
}

/** Mulberry32 PRNG for reproducible RANSAC */
function mulberry32(seed: number): () => number {
  let t = seed | 0;
  return () => {
    t = (t + 0x6D2B79F5) | 0;
    let v = t;
    v = Math.imul(v ^ (v >>> 15), v | 1);
    v ^= v + Math.imul(v ^ (v >>> 7), v | 61);
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random sample of k indices from [0, n) without replacement */
function randomSample(n: number, k: number, rng: () => number): number[] {
  const pool = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > n - k - 1 && i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(n - k);
}

export const robustRegressionEngine = new RobustRegressionEngine();
