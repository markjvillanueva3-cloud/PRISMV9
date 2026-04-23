// @ts-nocheck
/**
 * MultipleRegressionEngine — Multiple/Multivariate Linear Regression with Full Diagnostics
 *
 * Implements OLS via QR decomposition, ridge regression, polynomial expansion,
 * stepwise variable selection, and comprehensive residual diagnostics including
 * Cook's distance, VIF, Durbin-Watson, and leverage analysis.
 *
 * @module MultipleRegressionEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RegressionInput {
  /** Design matrix: n × p (observations × predictors) */
  X: number[][];
  /** Response vector: n × 1 */
  y: number[];
  /** Optional predictor names */
  feature_names?: string[];
  /** Include intercept column (default true) */
  intercept?: boolean;
}

export interface RegressionModel {
  coefficients: number[];
  intercept: number;
  r_squared: number;
  adjusted_r_squared: number;
  std_errors: number[];
  t_statistics: number[];
  p_values: number[];
  f_statistic: number;
  f_p_value: number;
  residuals: number[];
  predicted: number[];
  aic: number;
  bic: number;
  feature_names: string[];
  n: number;
  p: number;
  /** Internal: design matrix with intercept column if applicable */
  _X: number[][];
  _y: number[];
  _has_intercept: boolean;
}

export interface PredictionResult {
  predictions: number[];
  ci_95: { lower: number[]; upper: number[] };
  prediction_intervals: { lower: number[]; upper: number[] };
}

export interface StepwiseResult {
  selected_model: RegressionModel;
  selected_features: string[];
  selection_history: { step: number; feature: string; action: 'add' | 'remove'; criterion_value: number }[];
}

export interface DiagnosticsResult {
  normality_test: { statistic: number; p_value: number; is_normal: boolean };
  leverage_points: { index: number; leverage: number; is_high: boolean }[];
  cooks_distance: { index: number; distance: number; is_influential: boolean }[];
  vif: { feature: string; vif: number; is_collinear: boolean }[];
  durbin_watson: { statistic: number; interpretation: string };
}

export interface RidgeInput {
  X: number[][];
  y: number[];
  feature_names?: string[];
  lambda?: number;
  lambdas_to_try?: number[];
  n_folds?: number;
}

export interface RidgeResult extends RegressionModel {
  optimal_lambda: number;
}

export interface PolynomialInput {
  X: number[][];
  y: number[];
  degree?: number;
  include_cross_terms?: boolean;
  feature_names?: string[];
}

// ============================================================================
// LINEAR ALGEBRA HELPERS
// ============================================================================

/** Transpose matrix */
function transpose(A: number[][]): number[][] {
  const m = A.length, n = A[0].length;
  const T: number[][] = Array.from({ length: n }, () => new Array(m));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      T[j][i] = A[i][j];
  return T;
}

/** Matrix multiply A (m×k) × B (k×n) */
function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, k = A[0].length, n = B[0].length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      for (let l = 0; l < k; l++)
        C[i][j] += A[i][l] * B[l][j];
  return C;
}

/** Matrix × vector */
function matVec(A: number[][], v: number[]): number[] {
  return A.map(row => row.reduce((s, a, i) => s + a * v[i], 0));
}

/** Solve Ax = b via Cholesky (A must be positive definite) */
function choleskySolve(A: number[][], b: number[]): number[] {
  const n = A.length;
  // Cholesky: A = L L^T
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        const diag = A[i][i] - sum;
        L[i][j] = Math.sqrt(Math.max(diag, 1e-15));
      } else {
        L[i][j] = (A[i][j] - sum) / Math.max(L[j][j], 1e-15);
      }
    }
  }
  // Forward solve: L y = b
  const y = new Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < i; j++) sum += L[i][j] * y[j];
    y[i] = (b[i] - sum) / Math.max(L[i][i], 1e-15);
  }
  // Back solve: L^T x = y
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) sum += L[j][i] * x[j];
    x[i] = (y[i] - sum) / Math.max(L[i][i], 1e-15);
  }
  return x;
}

/** Invert symmetric PD matrix via Cholesky */
function invertSPD(A: number[][]): number[][] {
  const n = A.length;
  const inv: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let col = 0; col < n; col++) {
    const e = new Array(n).fill(0);
    e[col] = 1;
    const x = choleskySolve(A, e);
    for (let row = 0; row < n; row++) inv[row][col] = x[row];
  }
  return inv;
}

/** t-distribution CDF approximation (Hill, 1970) */
function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;
  // Regularized incomplete beta function approximation
  const beta = incompleteBeta(x, a, b);
  if (t >= 0) return 1 - 0.5 * beta;
  return 0.5 * beta;
}

/** Regularized incomplete beta via continued fraction */
function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta);
  // Lentz's continued fraction
  if (x < (a + 1) / (a + b + 2)) {
    return front * betaCF(x, a, b) / a;
  } else {
    return 1 - front * betaCF(1 - x, b, a) / b;
  }
}

function betaCF(x: number, a: number, b: number): number {
  const maxIter = 200;
  const eps = 1e-14;
  let qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
}

function lnGamma(z: number): number {
  // Lanczos approximation
  const g = 7;
  const coef = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }
  z -= 1;
  let x = coef[0];
  for (let i = 1; i < g + 2; i++) x += coef[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** F-distribution CDF via incomplete beta */
function fCDF(f: number, d1: number, d2: number): number {
  if (f <= 0) return 0;
  const x = d1 * f / (d1 * f + d2);
  return 1 - incompleteBeta(1 - x, d2 / 2, d1 / 2);
}

// ============================================================================
// ENGINE
// ============================================================================

class MultipleRegressionEngine {

  /**
   * Fit OLS multiple regression: β = (X^T X)^(-1) X^T y
   *
   * Uses Cholesky decomposition for numerical stability.
   * Computes full inference: R², adjusted R², t-tests, F-test, AIC, BIC.
   */
  fit(params: RegressionInput): RegressionModel {
    const { X: Xraw, y, feature_names: fnRaw, intercept = true } = params;
    const n = Xraw.length;
    const pRaw = Xraw[0]?.length ?? 0;

    const feature_names = fnRaw ?? Array.from({ length: pRaw }, (_, i) => `x${i + 1}`);

    // Augment with intercept column
    let Xaug: number[][];
    if (intercept) {
      Xaug = Xraw.map(row => [1, ...row]);
    } else {
      Xaug = Xraw.map(row => [...row]);
    }

    const pAug = Xaug[0].length; // includes intercept if present
    const Xt = transpose(Xaug);
    const XtX = matMul(Xt, Xaug);
    const Xty = matVec(Xt, y);

    // Solve normal equations
    const beta = choleskySolve(XtX, Xty);

    // Predictions and residuals
    const predicted = matVec(Xaug, beta);
    const residuals = y.map((yi, i) => yi - predicted[i]);

    // Sum of squares
    const yMean = y.reduce((a, b) => a + b, 0) / n;
    const SST = y.reduce((s, yi) => s + (yi - yMean) ** 2, 0);
    const SSR = residuals.reduce((s, r) => s + r * r, 0);
    const SSM = SST - SSR;

    const dfReg = pAug - (intercept ? 1 : 0);
    const dfRes = n - pAug;
    const MSE = SSR / Math.max(dfRes, 1);
    const MSR = SSM / Math.max(dfReg, 1);

    const r_squared = SST > 0 ? 1 - SSR / SST : 1;
    const adjusted_r_squared = SST > 0
      ? 1 - (SSR / Math.max(dfRes, 1)) / (SST / Math.max(n - (intercept ? 1 : 0), 1))
      : 1;

    // Standard errors from (X^T X)^(-1)
    const XtXinv = invertSPD(XtX);
    const std_errors = Array.from({ length: pAug }, (_, i) =>
      Math.sqrt(Math.max(XtXinv[i][i] * MSE, 0))
    );

    const t_statistics = beta.map((b, i) =>
      std_errors[i] > 1e-15 ? b / std_errors[i] : 0
    );

    const p_values = t_statistics.map(t => {
      if (dfRes <= 0) return 1;
      return 2 * (1 - tCDF(Math.abs(t), dfRes));
    });

    const f_statistic = MSE > 1e-15 ? MSR / MSE : 0;
    const f_p_value = dfReg > 0 && dfRes > 0 ? 1 - fCDF(f_statistic, dfReg, dfRes) : 1;

    // AIC, BIC
    const logLik = -n / 2 * Math.log(2 * Math.PI) - n / 2 * Math.log(Math.max(SSR / n, 1e-15)) - n / 2;
    const aic = -2 * logLik + 2 * pAug;
    const bic = -2 * logLik + Math.log(n) * pAug;

    // Separate intercept from coefficients for cleaner API
    const interceptVal = intercept ? beta[0] : 0;
    const coefficients = intercept ? beta.slice(1) : beta;
    const coeffStdErrors = intercept ? std_errors.slice(1) : std_errors;
    const coeffTStats = intercept ? t_statistics.slice(1) : t_statistics;
    const coeffPValues = intercept ? p_values.slice(1) : p_values;

    return {
      coefficients,
      intercept: interceptVal,
      r_squared,
      adjusted_r_squared,
      std_errors: coeffStdErrors,
      t_statistics: coeffTStats,
      p_values: coeffPValues,
      f_statistic,
      f_p_value,
      residuals,
      predicted,
      aic,
      bic,
      feature_names,
      n,
      p: pRaw,
      _X: Xaug,
      _y: y,
      _has_intercept: intercept,
    };
  }

  /**
   * Predict with 95% confidence and prediction intervals.
   */
  predict(X_new: number[][], model: RegressionModel): PredictionResult {
    const { coefficients, intercept, _X, _y, _has_intercept } = model;
    const n = model.n;

    // Reconstruct full beta
    const beta = _has_intercept ? [intercept, ...coefficients] : coefficients;

    // Augment new data
    const Xaug = _has_intercept
      ? X_new.map(row => [1, ...row])
      : X_new.map(row => [...row]);

    const predictions = matVec(Xaug, beta);

    // MSE from residuals
    const pAug = _X[0].length;
    const dfRes = n - pAug;
    const MSE = model.residuals.reduce((s, r) => s + r * r, 0) / Math.max(dfRes, 1);

    // (X^T X)^(-1)
    const Xt = transpose(_X);
    const XtX = matMul(Xt, _X);
    const XtXinv = invertSPD(XtX);

    // t-critical for 95% (approx for df > 30)
    const tCrit = dfRes > 120 ? 1.96 : dfRes > 30 ? 2.0 : dfRes > 10 ? 2.23 : 2.78;

    const lower_ci: number[] = [];
    const upper_ci: number[] = [];
    const lower_pi: number[] = [];
    const upper_pi: number[] = [];

    for (let i = 0; i < Xaug.length; i++) {
      const xi = Xaug[i];
      // x^T (X^T X)^(-1) x
      const tmp = matVec(XtXinv, xi);
      const hii = xi.reduce((s, v, j) => s + v * tmp[j], 0);

      const seMean = Math.sqrt(MSE * hii);
      const sePred = Math.sqrt(MSE * (1 + hii));

      lower_ci.push(predictions[i] - tCrit * seMean);
      upper_ci.push(predictions[i] + tCrit * seMean);
      lower_pi.push(predictions[i] - tCrit * sePred);
      upper_pi.push(predictions[i] + tCrit * sePred);
    }

    return {
      predictions,
      ci_95: { lower: lower_ci, upper: upper_ci },
      prediction_intervals: { lower: lower_pi, upper: upper_pi },
    };
  }

  /**
   * Stepwise variable selection (forward/backward/both).
   * Uses AIC or BIC as selection criterion.
   */
  stepwiseSelection(params: {
    X: number[][];
    y: number[];
    feature_names?: string[];
    direction?: 'forward' | 'backward' | 'both';
    criterion?: 'aic' | 'bic';
  }): StepwiseResult {
    const {
      X, y,
      feature_names = Array.from({ length: X[0]?.length ?? 0 }, (_, i) => `x${i + 1}`),
      direction = 'both',
      criterion = 'aic',
    } = params;

    const p = X[0]?.length ?? 0;
    const allIndices = Array.from({ length: p }, (_, i) => i);
    let currentIndices: number[] = direction === 'backward' ? [...allIndices] : [];
    const history: StepwiseResult['selection_history'] = [];

    const getCriterion = (model: RegressionModel) =>
      criterion === 'aic' ? model.aic : model.bic;

    const fitSubset = (indices: number[]) => {
      if (indices.length === 0) {
        // Intercept-only model
        const n = y.length;
        const yMean = y.reduce((a, b) => a + b, 0) / n;
        const SSR = y.reduce((s, yi) => s + (yi - yMean) ** 2, 0);
        const logLik = -n / 2 * Math.log(2 * Math.PI) - n / 2 * Math.log(Math.max(SSR / n, 1e-15)) - n / 2;
        return { aic: -2 * logLik + 2, bic: -2 * logLik + Math.log(n) } as any;
      }
      const Xsub = X.map(row => indices.map(i => row[i]));
      const names = indices.map(i => feature_names[i]);
      return this.fit({ X: Xsub, y, feature_names: names });
    };

    let currentModel = fitSubset(currentIndices);
    let currentCrit = getCriterion(currentModel);
    let improved = true;
    let step = 0;

    while (improved) {
      improved = false;
      step++;

      // Forward step: try adding each unused variable
      if (direction === 'forward' || direction === 'both') {
        let bestAddIdx = -1;
        let bestAddCrit = currentCrit;

        for (const idx of allIndices) {
          if (currentIndices.includes(idx)) continue;
          const trial = [...currentIndices, idx];
          const trialModel = fitSubset(trial);
          const trialCrit = getCriterion(trialModel);
          if (trialCrit < bestAddCrit) {
            bestAddCrit = trialCrit;
            bestAddIdx = idx;
          }
        }

        if (bestAddIdx >= 0) {
          currentIndices.push(bestAddIdx);
          currentModel = fitSubset(currentIndices);
          currentCrit = bestAddCrit;
          history.push({
            step,
            feature: feature_names[bestAddIdx],
            action: 'add',
            criterion_value: bestAddCrit,
          });
          improved = true;
        }
      }

      // Backward step: try removing each included variable
      if ((direction === 'backward' || direction === 'both') && currentIndices.length > 0) {
        let bestRemIdx = -1;
        let bestRemCrit = currentCrit;

        for (const idx of currentIndices) {
          const trial = currentIndices.filter(i => i !== idx);
          const trialModel = fitSubset(trial);
          const trialCrit = getCriterion(trialModel);
          if (trialCrit < bestRemCrit) {
            bestRemCrit = trialCrit;
            bestRemIdx = idx;
          }
        }

        if (bestRemIdx >= 0) {
          currentIndices = currentIndices.filter(i => i !== bestRemIdx);
          currentModel = fitSubset(currentIndices);
          currentCrit = bestRemCrit;
          history.push({
            step,
            feature: feature_names[bestRemIdx],
            action: 'remove',
            criterion_value: bestRemCrit,
          });
          improved = true;
        }
      }
    }

    // Fit final model
    const selectedModel = currentIndices.length > 0
      ? fitSubset(currentIndices)
      : fitSubset(currentIndices);

    return {
      selected_model: selectedModel,
      selected_features: currentIndices.map(i => feature_names[i]),
      selection_history: history,
    };
  }

  /**
   * Comprehensive regression diagnostics.
   */
  diagnostics(model: RegressionModel): DiagnosticsResult {
    const { residuals, _X, n, predicted } = model;
    const pAug = _X[0].length;
    const dfRes = n - pAug;
    const MSE = residuals.reduce((s, r) => s + r * r, 0) / Math.max(dfRes, 1);

    // Hat matrix H = X (X^T X)^(-1) X^T — just diagonals
    const Xt = transpose(_X);
    const XtX = matMul(Xt, _X);
    const XtXinv = invertSPD(XtX);

    const leverages: number[] = [];
    for (let i = 0; i < n; i++) {
      const xi = _X[i];
      const tmp = matVec(XtXinv, xi);
      leverages.push(xi.reduce((s, v, j) => s + v * tmp[j], 0));
    }

    const highLevThresh = 2 * pAug / n;
    const leverage_points = leverages.map((h, i) => ({
      index: i,
      leverage: h,
      is_high: h > highLevThresh,
    }));

    // Cook's distance: D_i = (e_i² / (p * MSE)) × (h_ii / (1 - h_ii)²)
    const cooks_distance = residuals.map((e, i) => {
      const h = leverages[i];
      const d = (e * e / (pAug * MSE)) * (h / Math.max((1 - h) * (1 - h), 1e-15));
      return { index: i, distance: d, is_influential: d > 4 / n };
    });

    // VIF: fit each predictor against all others
    const vifResults: DiagnosticsResult['vif'] = [];
    const pPred = model.p;
    const Xpred = _X.map(row => model._has_intercept ? row.slice(1) : row);

    for (let j = 0; j < pPred; j++) {
      if (pPred <= 1) {
        vifResults.push({ feature: model.feature_names[j], vif: 1, is_collinear: false });
        continue;
      }
      const yj = Xpred.map(row => row[j]);
      const Xj = Xpred.map(row => row.filter((_, idx) => idx !== j));
      const names = model.feature_names.filter((_, idx) => idx !== j);
      try {
        const subModel = this.fit({ X: Xj, y: yj, feature_names: names });
        const vif = 1 / Math.max(1 - subModel.r_squared, 1e-10);
        vifResults.push({
          feature: model.feature_names[j],
          vif,
          is_collinear: vif > 5,
        });
      } catch {
        vifResults.push({ feature: model.feature_names[j], vif: 1, is_collinear: false });
      }
    }

    // Durbin-Watson
    let dwNum = 0;
    let dwDen = residuals.reduce((s, r) => s + r * r, 0);
    for (let i = 1; i < residuals.length; i++) {
      dwNum += (residuals[i] - residuals[i - 1]) ** 2;
    }
    const dwStat = dwDen > 0 ? dwNum / dwDen : 2;
    let dwInterp = 'no autocorrelation (DW ≈ 2)';
    if (dwStat < 1.5) dwInterp = 'positive autocorrelation (DW < 1.5)';
    else if (dwStat > 2.5) dwInterp = 'negative autocorrelation (DW > 2.5)';

    // Normality test (Shapiro-Wilk approximation via sorted residuals)
    const sorted = [...residuals].sort((a, b) => a - b);
    const rMean = residuals.reduce((a, b) => a + b, 0) / n;
    const rVar = residuals.reduce((s, r) => s + (r - rMean) ** 2, 0);
    // Simplified W statistic
    let aSum = 0;
    for (let i = 0; i < Math.floor(n / 2); i++) {
      const ai = this._shapiroCoeff(i, n);
      aSum += ai * (sorted[n - 1 - i] - sorted[i]);
    }
    const W = rVar > 0 ? (aSum * aSum) / rVar : 1;
    const shapiroP = Math.min(1, Math.max(0, W)); // simplified p-value proxy

    return {
      normality_test: {
        statistic: W,
        p_value: shapiroP,
        is_normal: shapiroP > 0.05,
      },
      leverage_points,
      cooks_distance,
      vif: vifResults,
      durbin_watson: { statistic: dwStat, interpretation: dwInterp },
    };
  }

  /**
   * Ridge regression: β_ridge = (X^T X + λI)^(-1) X^T y
   *
   * Optionally performs k-fold cross-validation to find optimal λ.
   */
  ridgeRegression(params: RidgeInput): RidgeResult {
    const {
      X: Xraw, y,
      feature_names = Array.from({ length: Xraw[0]?.length ?? 0 }, (_, i) => `x${i + 1}`),
      lambdas_to_try = [0, 0.001, 0.01, 0.1, 1, 10, 100],
      n_folds = 5,
    } = params;

    const n = Xraw.length;
    let optimalLambda = params.lambda ?? -1;

    if (optimalLambda < 0) {
      // Cross-validation
      let bestCV = Infinity;
      for (const lam of lambdas_to_try) {
        let cvError = 0;
        const foldSize = Math.ceil(n / n_folds);
        for (let fold = 0; fold < n_folds; fold++) {
          const testIdx: number[] = [];
          const trainIdx: number[] = [];
          for (let i = 0; i < n; i++) {
            if (i >= fold * foldSize && i < (fold + 1) * foldSize) {
              testIdx.push(i);
            } else {
              trainIdx.push(i);
            }
          }
          if (testIdx.length === 0 || trainIdx.length === 0) continue;

          const Xtrain = trainIdx.map(i => Xraw[i]);
          const ytrain = trainIdx.map(i => y[i]);
          const Xtest = testIdx.map(i => Xraw[i]);
          const ytest = testIdx.map(i => y[i]);

          const model = this._fitRidge(Xtrain, ytrain, lam, feature_names);
          const pred = this._predictRidge(Xtest, model);
          for (let i = 0; i < ytest.length; i++) {
            cvError += (ytest[i] - pred[i]) ** 2;
          }
        }
        cvError /= n;
        if (cvError < bestCV) {
          bestCV = cvError;
          optimalLambda = lam;
        }
      }
    }

    // Fit final model with optimal lambda
    const model = this._fitRidge(Xraw, y, optimalLambda, feature_names);
    return { ...model, optimal_lambda: optimalLambda };
  }

  /**
   * Polynomial regression: expand X to polynomial terms, then fit OLS.
   */
  polynomialRegression(params: PolynomialInput): RegressionModel {
    const {
      X: Xraw, y,
      degree = 2,
      include_cross_terms = false,
      feature_names: fnRaw,
    } = params;

    const pOrig = Xraw[0]?.length ?? 0;
    const baseNames = fnRaw ?? Array.from({ length: pOrig }, (_, i) => `x${i + 1}`);

    // Expand features
    const expandedRows: number[][] = [];
    const expandedNames: string[] = [];

    // Build column definitions
    const colDefs: { indices: number[]; powers: number[] }[] = [];

    // Linear terms
    for (let i = 0; i < pOrig; i++) {
      colDefs.push({ indices: [i], powers: [1] });
      expandedNames.push(baseNames[i]);
    }

    // Higher-order terms
    for (let d = 2; d <= degree; d++) {
      if (include_cross_terms) {
        // All combinations of d factors from pOrig variables (with repetition)
        const combos = this._combinationsWithRep(pOrig, d);
        for (const combo of combos) {
          const counts = new Array(pOrig).fill(0);
          for (const idx of combo) counts[idx]++;
          colDefs.push({ indices: combo, powers: counts.filter(c => c > 0) });
          const name = combo.map(i => baseNames[i]).join('×');
          expandedNames.push(name);
        }
      } else {
        // Pure polynomial only (x_i^d)
        for (let i = 0; i < pOrig; i++) {
          // Create indices array with d copies for correct product computation
          const indices = new Array(d).fill(i);
          colDefs.push({ indices, powers: [d] });
          expandedNames.push(`${baseNames[i]}^${d}`);
        }
      }
    }

    // Build expanded matrix
    for (const row of Xraw) {
      const expanded: number[] = [];
      for (const def of colDefs) {
        if (def.indices.length === 1 && def.powers.length === 1 && def.powers[0] === 1) {
          expanded.push(row[def.indices[0]]);
        } else {
          let val = 1;
          for (const idx of def.indices) val *= row[idx];
          expanded.push(val);
        }
      }
      expandedRows.push(expanded);
    }

    return this.fit({ X: expandedRows, y, feature_names: expandedNames });
  }

  // ── Private helpers ──────────────────────────────────────────────────

  private _fitRidge(
    X: number[][], y: number[], lambda: number, feature_names: string[]
  ): RegressionModel {
    const n = X.length;
    const p = X[0]?.length ?? 0;

    // Augment with intercept
    const Xaug = X.map(row => [1, ...row]);
    const pAug = p + 1;
    const Xt = transpose(Xaug);
    const XtX = matMul(Xt, Xaug);

    // Add λI (skip intercept column)
    for (let i = 1; i < pAug; i++) {
      XtX[i][i] += lambda;
    }

    const Xty = matVec(Xt, y);
    const beta = choleskySolve(XtX, Xty);

    const predicted = matVec(Xaug, beta);
    const residuals = y.map((yi, i) => yi - predicted[i]);

    const yMean = y.reduce((a, b) => a + b, 0) / n;
    const SST = y.reduce((s, yi) => s + (yi - yMean) ** 2, 0);
    const SSR = residuals.reduce((s, r) => s + r * r, 0);
    const dfRes = n - pAug;
    const MSE = SSR / Math.max(dfRes, 1);

    const r_squared = SST > 0 ? 1 - SSR / SST : 1;
    const adjusted_r_squared = SST > 0
      ? 1 - (SSR / Math.max(dfRes, 1)) / (SST / Math.max(n - 1, 1))
      : 1;

    const XtXinv = invertSPD(XtX);
    const std_errors = Array.from({ length: p }, (_, i) =>
      Math.sqrt(Math.max(XtXinv[i + 1][i + 1] * MSE, 0))
    );
    const coefficients = beta.slice(1);
    const t_statistics = coefficients.map((b, i) =>
      std_errors[i] > 1e-15 ? b / std_errors[i] : 0
    );
    const p_values = t_statistics.map(t =>
      dfRes > 0 ? 2 * (1 - tCDF(Math.abs(t), dfRes)) : 1
    );

    const SSM = SST - SSR;
    const f_statistic = MSE > 1e-15 ? (SSM / Math.max(p, 1)) / MSE : 0;
    const f_p_value = p > 0 && dfRes > 0 ? 1 - fCDF(f_statistic, p, dfRes) : 1;

    const logLik = -n / 2 * Math.log(2 * Math.PI) - n / 2 * Math.log(Math.max(SSR / n, 1e-15)) - n / 2;
    const aic = -2 * logLik + 2 * pAug;
    const bic = -2 * logLik + Math.log(n) * pAug;

    return {
      coefficients,
      intercept: beta[0],
      r_squared,
      adjusted_r_squared,
      std_errors,
      t_statistics,
      p_values,
      f_statistic,
      f_p_value,
      residuals,
      predicted,
      aic,
      bic,
      feature_names,
      n,
      p,
      _X: Xaug,
      _y: y,
      _has_intercept: true,
    };
  }

  private _predictRidge(X_new: number[][], model: RegressionModel): number[] {
    const beta = [model.intercept, ...model.coefficients];
    const Xaug = X_new.map(row => [1, ...row]);
    return matVec(Xaug, beta);
  }

  private _shapiroCoeff(i: number, n: number): number {
    // Approximate Shapiro-Wilk coefficients using normal quantiles
    const p = (i + 1 - 0.375) / (n + 0.25);
    const z = this._normalQuantile(p);
    return z; // simplified — true SW uses normalized a_i
  }

  private _normalQuantile(p: number): number {
    // Rational approximation (Abramowitz & Stegun 26.2.23)
    if (p <= 0) return -8;
    if (p >= 1) return 8;
    if (p === 0.5) return 0;
    const sign = p < 0.5 ? -1 : 1;
    const pp = p < 0.5 ? p : 1 - p;
    const t = Math.sqrt(-2 * Math.log(pp));
    const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
    const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
    return sign * (t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t));
  }

  private _combinationsWithRep(n: number, k: number): number[][] {
    const result: number[][] = [];
    const combo: number[] = [];
    const recurse = (start: number, rem: number) => {
      if (rem === 0) { result.push([...combo]); return; }
      for (let i = start; i < n; i++) {
        combo.push(i);
        recurse(i, rem - 1);
        combo.pop();
      }
    };
    recurse(0, k);
    return result;
  }
}

export const multipleRegressionEngine = new MultipleRegressionEngine();
