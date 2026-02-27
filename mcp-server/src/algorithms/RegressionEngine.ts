/**
 * Regression Engine — Multi-Variable Polynomial Regression
 *
 * Least squares regression for manufacturing empirical models.
 * Supports linear, polynomial (up to degree 4), and multi-variable regression.
 * Includes R², adjusted R², residual analysis, and prediction intervals.
 *
 * Manufacturing uses: empirical Taylor tool life fitting, surface roughness
 * models, power consumption curves, thermal drift characterization.
 *
 * References:
 * - Draper, N.R. & Smith, H. (1998). "Applied Regression Analysis", 3rd ed.
 * - Montgomery, D.C. et al. (2012). "Introduction to Linear Regression Analysis"
 *
 * @module algorithms/RegressionEngine
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface RegressionEngineInput {
  /** Independent variables: rows = observations, cols = features. */
  X: number[][];
  /** Dependent variable values. */
  y: number[];
  /** Polynomial degree (applied to each feature). Default 1. */
  degree?: number;
  /** New X values for prediction. */
  X_predict?: number[][];
  /** Confidence level for prediction interval. Default 0.95. */
  confidence_level?: number;
}

export interface RegressionPrediction {
  x: number[];
  y_hat: number;
  lower: number;
  upper: number;
}

export interface RegressionEngineOutput extends WithWarnings {
  coefficients: number[];
  intercept: number;
  r_squared: number;
  adjusted_r_squared: number;
  rmse: number;
  predictions: RegressionPrediction[];
  fitted_values: number[];
  residuals: number[];
  feature_names: string[];
  calculation_method: string;
}

export class RegressionEngine implements Algorithm<RegressionEngineInput, RegressionEngineOutput> {

  validate(input: RegressionEngineInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.X?.length || input.X.length < 2) issues.push({ field: "X", message: "At least 2 observations required", severity: "error" });
    if (!input.y?.length) issues.push({ field: "y", message: "Required", severity: "error" });
    if (input.X?.length !== input.y?.length) issues.push({ field: "y", message: "Must match X rows", severity: "error" });
    if ((input.degree ?? 1) < 1 || (input.degree ?? 1) > 4) issues.push({ field: "degree", message: "Must be 1-4", severity: "error" });
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: RegressionEngineInput): RegressionEngineOutput {
    const warnings: string[] = [];
    const { X, y } = input;
    const degree = input.degree ?? 1;
    const confLevel = input.confidence_level ?? 0.95;
    const n = X.length;
    const nFeatures = X[0].length;

    // Expand polynomial features
    const expandPoly = (row: number[]): number[] => {
      const expanded: number[] = [];
      for (let f = 0; f < nFeatures; f++) {
        for (let d = 1; d <= degree; d++) {
          expanded.push(row[f] ** d);
        }
      }
      return expanded;
    };

    const Xpoly = X.map(expandPoly);
    const p = Xpoly[0].length; // number of polynomial features

    // Build feature names
    const featureNames: string[] = [];
    for (let f = 0; f < nFeatures; f++) {
      for (let d = 1; d <= degree; d++) {
        featureNames.push(d === 1 ? `x${f}` : `x${f}^${d}`);
      }
    }

    // Add intercept column (prepend 1s)
    const XA = Xpoly.map(row => [1, ...row]);
    const m = p + 1; // total columns including intercept

    // Normal equation: β = (X'X)^(-1) X'y
    const XtX = Array.from({ length: m }, (_, i) =>
      Array.from({ length: m }, (_, j) =>
        XA.reduce((s, row) => s + row[i] * row[j], 0)));

    const Xty = Array.from({ length: m }, (_, i) =>
      XA.reduce((s, row, r) => s + row[i] * y[r], 0));

    // Solve via Gauss-Jordan
    const aug = XtX.map((row, i) => [...row, Xty[i]]);
    for (let col = 0; col < m; col++) {
      let maxRow = col;
      for (let row = col + 1; row < m; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
      }
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
      const pivot = aug[col][col];
      if (Math.abs(pivot) < 1e-12) { warnings.push("Near-singular matrix — results may be unreliable"); continue; }
      for (let j = 0; j <= m; j++) aug[col][j] /= pivot;
      for (let row = 0; row < m; row++) {
        if (row === col) continue;
        const factor = aug[row][col];
        for (let j = 0; j <= m; j++) aug[row][j] -= factor * aug[col][j];
      }
    }

    const beta = aug.map(row => row[m]);
    const intercept = beta[0];
    const coefficients = beta.slice(1);

    // Fitted values and residuals
    const fitted = XA.map(row => row.reduce((s, v, i) => s + v * beta[i], 0));
    const residuals = y.map((yi, i) => yi - fitted[i]);

    // R² and adjusted R²
    const yMean = y.reduce((s, v) => s + v, 0) / n;
    const ssTot = y.reduce((s, v) => s + (v - yMean) ** 2, 0);
    const ssRes = residuals.reduce((s, r) => s + r * r, 0);
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    const adjRSquared = n > m ? 1 - (1 - rSquared) * (n - 1) / (n - m) : rSquared;
    const rmse = Math.sqrt(ssRes / Math.max(1, n - m));

    // z for CI
    const z = confLevel >= 0.99 ? 2.576 : confLevel >= 0.95 ? 1.96 : 1.645;

    // Predictions
    const predictions: RegressionPrediction[] = [];
    if (input.X_predict) {
      for (const xNew of input.X_predict) {
        const xPoly = [1, ...expandPoly(xNew)];
        const yHat = xPoly.reduce((s, v, i) => s + v * beta[i], 0);
        const se = rmse * z; // simplified prediction interval
        predictions.push({ x: xNew, y_hat: yHat, lower: yHat - se, upper: yHat + se });
      }
    }

    return {
      coefficients, intercept, r_squared: rSquared, adjusted_r_squared: adjRSquared,
      rmse, predictions, fitted_values: fitted, residuals, feature_names: featureNames,
      warnings,
      calculation_method: `OLS polynomial regression (degree=${degree}, ${nFeatures} features, n=${n})`,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "regression-engine",
      name: "Regression Engine (OLS Polynomial)",
      description: "Multi-variable polynomial least squares regression with R² and prediction intervals",
      formula: "β = (X'X)^(-1) X'y; R² = 1 - SS_res/SS_tot",
      reference: "Draper & Smith (1998); Montgomery et al. (2012)",
      safety_class: "informational",
      domain: "numerical",
      inputs: { X: "Feature matrix", y: "Response vector", degree: "Polynomial degree" },
      outputs: { coefficients: "β values", r_squared: "Goodness of fit", predictions: "New point predictions" },
    };
  }
}
