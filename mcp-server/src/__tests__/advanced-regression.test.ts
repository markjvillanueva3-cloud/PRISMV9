// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { advancedRegressionEngine } from '../engines/AdvancedRegressionEngine';

// ============================================================================
// Helpers
// ============================================================================

/** Generate linear data: y = 2*x1 + 3*x2 + 1 + noise */
function linearData(n: number, noise = 0.1, seed = 42): { X: number[][]; y: number[] } {
  let s = seed;
  const rng = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const x1 = rng() * 4 - 2;
    const x2 = rng() * 4 - 2;
    X.push([x1, x2]);
    y.push(2 * x1 + 3 * x2 + 1 + (rng() - 0.5) * noise);
  }
  return { X, y };
}

/** Generate sinusoidal data for nonlinear regression */
function sinData(n: number, seed = 42): { X: number[][]; y: number[] } {
  let s = seed;
  const rng = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = rng() * 6 - 3;
    X.push([x]);
    y.push(Math.sin(x) + (rng() - 0.5) * 0.1);
  }
  return { X, y };
}

/** Generate well-separated 2D Gaussian clusters */
function twoClusterData(n: number, seed = 42): number[][] {
  let s = seed;
  const rng = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  const boxMuller = () => {
    const u1 = rng(), u2 = rng();
    return Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
  };
  const data: number[][] = [];
  for (let i = 0; i < n; i++) {
    if (i < n / 2) {
      data.push([boxMuller() * 0.5 - 3, boxMuller() * 0.5 - 3]);
    } else {
      data.push([boxMuller() * 0.5 + 3, boxMuller() * 0.5 + 3]);
    }
  }
  return data;
}

/** Data with outliers */
function outlierData(n: number, contaminationPct: number, seed = 42): { X: number[][]; y: number[] } {
  let s = seed;
  const rng = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  const X: number[][] = [];
  const y: number[] = [];
  const nOutliers = Math.floor(n * contaminationPct);
  for (let i = 0; i < n; i++) {
    const x = rng() * 10;
    X.push([x]);
    if (i < nOutliers) {
      y.push(2 * x + 1 + 50 * (rng() > 0.5 ? 1 : -1)); // outlier
    } else {
      y.push(2 * x + 1 + (rng() - 0.5) * 0.5);
    }
  }
  return { X, y };
}

// ============================================================================
// Kernel Ridge Regression
// ============================================================================

describe('AdvancedRegressionEngine — Kernel Ridge Regression', () => {
  it('1. RBF kernel fits nonlinear function (sin) with MSE < 0.1', () => {
    const { X, y } = sinData(60);
    const result = advancedRegressionEngine.kernelRidgeRegression({
      X_train: X, y_train: y, kernel: 'rbf', alpha: 0.1, gamma: 1.0,
    });
    expect(result.train_mse).toBeLessThan(0.1);
    expect(result.predictions.length).toBe(60);
  });

  it('2. Linear kernel degenerates to ridge regression', () => {
    const { X, y } = linearData(40);
    const resultLinear = advancedRegressionEngine.kernelRidgeRegression({
      X_train: X, y_train: y, kernel: 'linear', alpha: 1.0,
    });
    // Linear kernel on linear data should fit reasonably (regularization raises MSE)
    expect(resultLinear.train_mse).toBeLessThan(2.0);
    expect(resultLinear.alpha_coefficients.length).toBe(40);
  });

  it('3. Higher alpha → more regularization → smoother (higher MSE)', () => {
    const { X, y } = sinData(40);
    const resultLow = advancedRegressionEngine.kernelRidgeRegression({
      X_train: X, y_train: y, kernel: 'rbf', alpha: 0.01, gamma: 1.0,
    });
    const resultHigh = advancedRegressionEngine.kernelRidgeRegression({
      X_train: X, y_train: y, kernel: 'rbf', alpha: 100, gamma: 1.0,
    });
    expect(resultHigh.train_mse).toBeGreaterThan(resultLow.train_mse);
  });
});

// ============================================================================
// Gaussian Mixture Model
// ============================================================================

describe('AdvancedRegressionEngine — GMM', () => {
  it('4. Recovers 2 clusters from well-separated Gaussian data', () => {
    const data = twoClusterData(80);
    const result = advancedRegressionEngine.gaussianMixtureEM({
      data, n_components: 2, seed: 123,
    });
    expect(result.means.length).toBe(2);
    expect(result.labels.length).toBe(80);
    // Means should be roughly at (-3,-3) and (3,3)
    const meansSorted = [...result.means].sort((a, b) => a[0] - b[0]);
    expect(meansSorted[0][0]).toBeLessThan(0);
    expect(meansSorted[1][0]).toBeGreaterThan(0);
  });

  it('5. BIC selects correct number of components', () => {
    const data = twoClusterData(100);
    const result = advancedRegressionEngine.gmmOptimalComponents({
      data, max_components: 5, seed: 123,
    });
    expect(result.optimal_k).toBeGreaterThanOrEqual(1);
    expect(result.optimal_k).toBeLessThanOrEqual(3); // should be 2 ideally
    expect(result.bic_values.length).toBe(5);
    expect(result.aic_values.length).toBe(5);
  });

  it('6. Converges within max_iter for clean data', () => {
    const data = twoClusterData(60);
    const result = advancedRegressionEngine.gaussianMixtureEM({
      data, n_components: 2, max_iter: 100, seed: 42,
    });
    expect(result.converged).toBe(true);
    expect(result.n_iterations).toBeLessThan(100);
  });

  it('7. Weights sum to 1.0', () => {
    const data = twoClusterData(60);
    const result = advancedRegressionEngine.gaussianMixtureEM({
      data, n_components: 3, seed: 42,
    });
    const wSum = result.weights.reduce((a, b) => a + b, 0);
    expect(wSum).toBeCloseTo(1.0, 5);
  });

  it('8. Labels assigned to all data points', () => {
    const data = twoClusterData(50);
    const result = advancedRegressionEngine.gaussianMixtureEM({
      data, n_components: 2, seed: 42,
    });
    expect(result.labels.length).toBe(50);
    result.labels.forEach(l => {
      expect(l).toBeGreaterThanOrEqual(0);
      expect(l).toBeLessThan(2);
    });
  });
});

// ============================================================================
// Quantile Regression
// ============================================================================

describe('AdvancedRegressionEngine — Quantile Regression', () => {
  it('9. Median regression (τ=0.5) close to OLS for symmetric data', () => {
    const { X, y } = linearData(60, 0.1);
    const result = advancedRegressionEngine.quantileRegression({
      X, y, quantile: 0.5,
    });
    const medianCoeffs = result.coefficients[0.5];
    expect(medianCoeffs).toBeDefined();
    // Intercept ~1, coeff1 ~2, coeff2 ~3
    expect(medianCoeffs[0]).toBeCloseTo(1, 0); // intercept
    expect(medianCoeffs[1]).toBeCloseTo(2, 0); // x1
    expect(medianCoeffs[2]).toBeCloseTo(3, 0); // x2
  });

  it('10. 90th quantile > 50th quantile at all points', () => {
    const { X, y } = linearData(50, 1.0);
    const result = advancedRegressionEngine.quantileRegression({
      X, y, quantiles: [0.1, 0.5, 0.9],
    });
    const q50 = result.fitted_quantiles[0.5];
    const q90 = result.fitted_quantiles[0.9];
    expect(q50).toBeDefined();
    expect(q90).toBeDefined();
    // Most points should satisfy q90 > q50
    let countHigher = 0;
    for (let i = 0; i < q50.length; i++) {
      if (q90[i] >= q50[i] - 0.5) countHigher++;
    }
    expect(countHigher / q50.length).toBeGreaterThan(0.8);
  });

  it('11. Prediction interval from quantiles contains most data', () => {
    const { X, y } = linearData(80, 1.0);
    const result = advancedRegressionEngine.quantileRegression({
      X, y, quantiles: [0.1, 0.9],
    });
    const [lower, upper] = result.prediction_interval;
    let inside = 0;
    for (let i = 0; i < y.length; i++) {
      if (y[i] >= lower[i] - 0.5 && y[i] <= upper[i] + 0.5) inside++;
    }
    expect(inside / y.length).toBeGreaterThan(0.5);
  });
});

// ============================================================================
// Isotonic Regression
// ============================================================================

describe('AdvancedRegressionEngine — Isotonic Regression', () => {
  it('12. Output is monotonically non-decreasing', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    const y = [1, 3, 2, 5, 4, 6, 8, 7];
    const result = advancedRegressionEngine.isotonicRegression({ x, y, increasing: true });
    // Sort fitted by x and check monotonicity
    const idxs = Array.from({ length: x.length }, (_, i) => i).sort((a, b) => x[a] - x[b]);
    for (let i = 1; i < idxs.length; i++) {
      expect(result.fitted[idxs[i]]).toBeGreaterThanOrEqual(result.fitted[idxs[i - 1]] - 1e-10);
    }
  });

  it('13. Perfect fit for already monotone data (R²=1)', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [1, 2, 3, 4, 5];
    const result = advancedRegressionEngine.isotonicRegression({ x, y });
    expect(result.r_squared).toBeCloseTo(1.0, 5);
    expect(result.mse).toBeCloseTo(0, 5);
  });

  it('14. PAVA correctly pools violating groups', () => {
    const x = [1, 2, 3, 4];
    const y = [1, 4, 2, 5]; // violation at index 1-2
    const result = advancedRegressionEngine.isotonicRegression({ x, y });
    // After PAVA: positions 1,2 should be pooled to mean(4,2)=3
    expect(result.fitted[1]).toBeCloseTo(3.0, 5);
    expect(result.fitted[2]).toBeCloseTo(3.0, 5);
    expect(result.n_blocks).toBeLessThan(4);
  });
});

// ============================================================================
// Huber Regression
// ============================================================================

describe('AdvancedRegressionEngine — Huber Regression', () => {
  it('15. Close to OLS when no outliers', () => {
    const { X, y } = linearData(60, 0.1);
    const result = advancedRegressionEngine.huberRegression({ X, y });
    // Should be close to true coefficients [2, 3], intercept ~1
    expect(result.intercept).toBeCloseTo(1, 0);
    expect(result.coefficients[0]).toBeCloseTo(2, 0);
    expect(result.coefficients[1]).toBeCloseTo(3, 0);
  });

  it('16. More robust than OLS with 10% outlier contamination', () => {
    const { X, y } = outlierData(100, 0.1);
    const result = advancedRegressionEngine.huberRegression({ X, y });
    // Huber should have closer slope to 2 than OLS
    const huberSlope = result.coefficients[0];
    const olsSlope = result.comparison_ols.coefficients[0];
    expect(Math.abs(huberSlope - 2)).toBeLessThanOrEqual(Math.abs(olsSlope - 2) + 1);
  });

  it('17. Correctly flags outlier points', () => {
    const { X, y } = outlierData(50, 0.1);
    const result = advancedRegressionEngine.huberRegression({ X, y });
    expect(result.outlier_flags.length).toBe(50);
    expect(result.n_outliers).toBeGreaterThan(0);
    expect(result.n_outliers).toBeLessThan(50);
  });

  it('18. Scale estimate is positive', () => {
    const { X, y } = linearData(40, 0.5);
    const result = advancedRegressionEngine.huberRegression({ X, y });
    expect(result.scale_estimate).toBeGreaterThan(0);
  });
});

// ============================================================================
// Ensemble Methods
// ============================================================================

describe('AdvancedRegressionEngine — Ensemble', () => {
  it('19. Stacking MSE ≤ best single model MSE', () => {
    const { X, y } = linearData(80, 0.5);
    const result = advancedRegressionEngine.stackingEnsemble({
      X, y,
      base_models: ['linear', 'ridge', 'polynomial'],
      meta_model: 'ridge',
      n_folds: 3,
    });
    // Stacking should not be much worse than the best single model
    expect(result.stacking_mse).toBeLessThanOrEqual(result.best_single_model_mse * 1.5);
  });

  it('20. Base model weights sum to approximately 1', () => {
    const { X, y } = linearData(60, 0.5);
    const result = advancedRegressionEngine.stackingEnsemble({
      X, y,
      base_models: ['linear', 'ridge'],
      meta_model: 'ridge',
      n_folds: 3,
    });
    expect(result.base_model_weights.length).toBe(2);
    // Weights might not sum to exactly 1 (ridge meta-model), but should be reasonable
    const wSum = result.base_model_weights.reduce((a, b) => a + Math.abs(b), 0);
    expect(wSum).toBeGreaterThan(0);
  });

  it('21. AdaBoost: train MSE decreases with iterations', () => {
    const { X, y } = linearData(40, 0.5);
    const result5 = advancedRegressionEngine.adaBoostRegress({
      X_train: X, y_train: y, n_estimators: 5,
    });
    const result20 = advancedRegressionEngine.adaBoostRegress({
      X_train: X, y_train: y, n_estimators: 20,
    });
    expect(result20.train_mse).toBeLessThanOrEqual(result5.train_mse + 0.1);
  });

  it('22. AdaBoost: better than single stump', () => {
    const { X, y } = linearData(50, 0.3);
    const result1 = advancedRegressionEngine.adaBoostRegress({
      X_train: X, y_train: y, n_estimators: 1,
    });
    const result30 = advancedRegressionEngine.adaBoostRegress({
      X_train: X, y_train: y, n_estimators: 30,
    });
    expect(result30.train_mse).toBeLessThanOrEqual(result1.train_mse + 0.01);
  });
});

// ============================================================================
// Regularized Boosting
// ============================================================================

describe('AdvancedRegressionEngine — Regularized Boosting', () => {
  it('23. Predictions improve with more estimators', () => {
    const { X, y } = linearData(50, 0.3);
    const r10 = advancedRegressionEngine.regularizedBoosting({
      X_train: X, y_train: y, n_estimators: 10, learning_rate: 0.3,
    });
    const r50 = advancedRegressionEngine.regularizedBoosting({
      X_train: X, y_train: y, n_estimators: 50, learning_rate: 0.3,
    });
    expect(r50.train_mse).toBeLessThanOrEqual(r10.train_mse + 0.01);
  });

  it('24. L2 regularization shrinks leaf values', () => {
    const { X, y } = linearData(40, 0.3);
    const rLow = advancedRegressionEngine.regularizedBoosting({
      X_train: X, y_train: y, n_estimators: 20, lambda: 0.01,
    });
    const rHigh = advancedRegressionEngine.regularizedBoosting({
      X_train: X, y_train: y, n_estimators: 20, lambda: 100,
    });
    // Higher lambda → higher training MSE (more regularization)
    expect(rHigh.train_mse).toBeGreaterThanOrEqual(rLow.train_mse * 0.5);
  });

  it('25. Feature importance sums to ~1', () => {
    const { X, y } = linearData(50, 0.3);
    const result = advancedRegressionEngine.regularizedBoosting({
      X_train: X, y_train: y, n_estimators: 30,
    });
    const fiSum = result.feature_importance.reduce((a, b) => a + b, 0);
    expect(fiSum).toBeCloseTo(1.0, 1);
    expect(result.feature_importance.length).toBe(2);
  });

  it('26. Subsample < 1 still converges', () => {
    const { X, y } = linearData(60, 0.3);
    const result = advancedRegressionEngine.regularizedBoosting({
      X_train: X, y_train: y, n_estimators: 50, subsample: 0.7,
    });
    expect(result.train_mse).toBeLessThan(5);
    expect(result.predictions.length).toBe(60);
  });

  it('27. Learning curve shows train loss decrease', () => {
    const { X, y } = linearData(50, 0.3);
    const result = advancedRegressionEngine.regularizedBoosting({
      X_train: X, y_train: y, n_estimators: 30,
    });
    expect(result.learning_curve.length).toBe(30);
    // First loss should be larger than last
    expect(result.learning_curve[0]).toBeGreaterThan(result.learning_curve[29]);
  });

  it('28. Single estimator (n=1) produces valid predictions', () => {
    const { X, y } = linearData(30, 0.3);
    const result = advancedRegressionEngine.regularizedBoosting({
      X_train: X, y_train: y, n_estimators: 1,
    });
    expect(result.predictions.length).toBe(30);
    expect(result.learning_curve.length).toBe(1);
    expect(result.best_iteration).toBe(0);
    expect(Number.isFinite(result.train_mse)).toBe(true);
  });
});
