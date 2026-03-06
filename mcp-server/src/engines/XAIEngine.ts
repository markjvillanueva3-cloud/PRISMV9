/**
 * PRISM MCP Server -- Explainable AI Engine
 *
 * Model-agnostic explanation methods:
 * - LIME: Local Interpretable Model-agnostic Explanations
 *   (perturbation-based, weighted linear regression)
 * - Kernel SHAP: Shapley Additive Explanations approximation
 * - Gradient saliency, Integrated Gradients, SmoothGrad
 * - Permutation feature importance
 *
 * Based on MIT 6.867, Ribeiro et al. (LIME), Lundberg & Lee (SHAP).
 * Ported from PRISM_XAI_COMPLETE.js (monolith R2.3.1).
 *
 * @module XAIEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureExplanation {
  feature: number;
  importance: number;
  absImportance: number;
}

export interface LIMEResult {
  explanation: FeatureExplanation[];
  allCoefficients: number[];
  originalPrediction: number;
  numSamples: number;
}

export interface SHAPResult {
  shapValues: number[];
  expectedValue: number;
  instancePrediction: number;
  sumCheck: number;
}

export interface PermutationImportanceResult {
  importances: Array<{ feature: number; importance: number; std: number }>;
  baselineScore: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class XAIEngineImpl {

  // --------------------------------------------------------------------------
  // LIME
  // --------------------------------------------------------------------------

  /**
   * Explain a prediction using LIME.
   * Perturbs the input, fits a local weighted linear model, returns top features.
   */
  limeExplain(
    predictFn: (x: number[]) => number,
    instance: number[],
    numSamples: number = 1000,
    numFeatures: number = 10
  ): LIMEResult {
    const dim = instance.length;
    const originalPred = predictFn(instance);

    const samples: number[][] = [];
    const labels: number[] = [];
    const weights: number[] = [];

    for (let i = 0; i < numSamples; i++) {
      const perturbed = instance.map((v) => {
        if (Math.random() < 0.5) {
          return v + (Math.random() - 0.5) * Math.abs(v) * 0.5;
        }
        return v;
      });
      samples.push(perturbed);
      labels.push(predictFn(perturbed));

      let dist = 0;
      for (let j = 0; j < dim; j++) {
        dist += (instance[j] - perturbed[j]) * (instance[j] - perturbed[j]);
      }
      weights.push(Math.exp(-dist / 2));
    }

    const coefficients = this._weightedLinearRegression(samples, labels, weights);

    const explanation = coefficients
      .map((c, i) => ({ feature: i, importance: c, absImportance: Math.abs(c) }))
      .sort((a, b) => b.absImportance - a.absImportance)
      .slice(0, numFeatures);

    return { explanation, allCoefficients: coefficients, originalPrediction: originalPred, numSamples };
  }

  // --------------------------------------------------------------------------
  // KERNEL SHAP
  // --------------------------------------------------------------------------

  /**
   * Compute SHAP values using Kernel SHAP approximation.
   */
  shapExplain(
    predictFn: (x: number[]) => number,
    instance: number[],
    background: number[][],
    numSamples: number = 2000
  ): SHAPResult {
    const dim = instance.length;

    const expectedValue = background.reduce((sum, bg) => sum + predictFn(bg), 0) / background.length;

    const coalitions: number[][] = [];
    const predictions: number[] = [];
    const kernelWeights: number[] = [];

    // Always include empty and full coalitions
    coalitions.push(new Array(dim).fill(0));
    coalitions.push(new Array(dim).fill(1));

    for (let i = 0; i < numSamples - 2; i++) {
      coalitions.push(Array.from({ length: dim }, () => Math.random() < 0.5 ? 1 : 0));
    }

    for (const coalition of coalitions) {
      const numOnes = coalition.reduce((a, b) => a + b, 0);
      kernelWeights.push(this._shapleyKernelWeight(dim, numOnes));

      let pred = 0;
      const numBg = Math.min(10, background.length);
      for (let b = 0; b < numBg; b++) {
        const bg = background[Math.floor(Math.random() * background.length)];
        const masked = instance.map((v, j) => coalition[j] ? v : bg[j]);
        pred += predictFn(masked);
      }
      predictions.push(pred / numBg);
    }

    const shapValues = this._fitShapValues(coalitions, predictions, kernelWeights, dim);
    const instancePrediction = predictFn(instance);

    return {
      shapValues,
      expectedValue,
      instancePrediction,
      sumCheck: shapValues.reduce((a, b) => a + b, 0) + expectedValue,
    };
  }

  // --------------------------------------------------------------------------
  // GRADIENT-BASED EXPLANATIONS
  // --------------------------------------------------------------------------

  /** Gradient saliency: |∂f/∂x| */
  saliency(gradFn: (x: number[]) => number[], input: number[]): number[] {
    return gradFn(input).map(g => Math.abs(g));
  }

  /**
   * Integrated Gradients: ∫₀¹ ∂f/∂x(baseline + α·(input-baseline)) dα · (input-baseline)
   */
  integratedGradients(
    gradFn: (x: number[]) => number[],
    input: number[],
    baseline?: number[],
    steps: number = 50
  ): number[] {
    const bl = baseline ?? new Array(input.length).fill(0);
    const ig = new Array(input.length).fill(0);

    for (let i = 0; i <= steps; i++) {
      const alpha = i / steps;
      const interpolated = input.map((v, j) => bl[j] + alpha * (v - bl[j]));
      const grads = gradFn(interpolated);

      const weight = (i === 0 || i === steps) ? 0.5 : 1;
      for (let j = 0; j < input.length; j++) {
        ig[j] += weight * grads[j] / steps;
      }
    }

    return ig.map((g, j) => g * (input[j] - bl[j]));
  }

  /**
   * SmoothGrad: average |gradients| over noisy copies of input.
   */
  smoothGrad(
    gradFn: (x: number[]) => number[],
    input: number[],
    numSamples: number = 50,
    noise: number = 0.1
  ): number[] {
    const sg = new Array(input.length).fill(0);

    for (let i = 0; i < numSamples; i++) {
      const noisy = input.map(v => v + noise * this._randn());
      const grads = gradFn(noisy);
      for (let j = 0; j < input.length; j++) {
        sg[j] += Math.abs(grads[j]) / numSamples;
      }
    }

    return sg;
  }

  // --------------------------------------------------------------------------
  // PERMUTATION IMPORTANCE
  // --------------------------------------------------------------------------

  /**
   * Model-agnostic permutation feature importance.
   * Shuffles each feature column and measures prediction degradation.
   */
  permutationImportance(
    predictFn: (x: number[]) => number,
    X: number[][],
    y: number[],
    numRepeats: number = 5
  ): PermutationImportanceResult {
    const n = X.length;
    const dim = X[0].length;

    // Baseline MSE
    let baselineMSE = 0;
    for (let i = 0; i < n; i++) {
      const err = predictFn(X[i]) - y[i];
      baselineMSE += err * err;
    }
    baselineMSE /= n;

    const importances: Array<{ feature: number; importance: number; std: number }> = [];

    for (let f = 0; f < dim; f++) {
      const scores: number[] = [];

      for (let r = 0; r < numRepeats; r++) {
        // Fisher-Yates shuffle of feature f
        const permuted = X.map(row => [...row]);
        for (let i = n - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = permuted[i][f];
          permuted[i][f] = permuted[j][f];
          permuted[j][f] = tmp;
        }

        let mse = 0;
        for (let i = 0; i < n; i++) {
          const err = predictFn(permuted[i]) - y[i];
          mse += err * err;
        }
        mse /= n;
        scores.push(mse - baselineMSE);
      }

      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((s, v) => s + (v - mean) * (v - mean), 0) / scores.length;
      importances.push({ feature: f, importance: mean, std: Math.sqrt(variance) });
    }

    importances.sort((a, b) => b.importance - a.importance);
    return { importances, baselineScore: baselineMSE };
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  _weightedLinearRegression(X: number[][], y: number[], weights: number[]): number[] {
    const n = X.length;
    const d = X[0].length;
    const db = d + 1;

    const Xb = X.map(row => [1, ...row]);

    const XtWX: number[][] = Array.from({ length: db }, () => new Array(db).fill(0));
    const XtWy = new Array(db).fill(0);

    for (let i = 0; i < n; i++) {
      const w = weights[i];
      for (let j = 0; j < db; j++) {
        XtWy[j] += w * Xb[i][j] * y[i];
        for (let k = 0; k < db; k++) {
          XtWX[j][k] += w * Xb[i][j] * Xb[i][k];
        }
      }
    }

    // Regularization
    for (let j = 0; j < db; j++) XtWX[j][j] += 0.001;

    const coeffs = this._solveLinear(XtWX, XtWy);
    return coeffs.slice(1); // Remove bias
  }

  _solveLinear(A: number[][], b: number[]): number[] {
    const n = A.length;
    const aug = A.map((row, i) => [...row, b[i]]);

    // Gaussian elimination with partial pivoting
    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
      }
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

      if (Math.abs(aug[col][col]) < 1e-10) continue;

      for (let row = col + 1; row < n; row++) {
        const factor = aug[row][col] / aug[col][col];
        for (let j = col; j <= n; j++) aug[row][j] -= factor * aug[col][j];
      }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = aug[i][n];
      for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j];
      x[i] /= aug[i][i] || 1;
    }
    return x;
  }

  _shapleyKernelWeight(M: number, s: number): number {
    if (s === 0 || s === M) return 1e6;
    const binom = this._binomial(M, s);
    return (M - 1) / (binom * s * (M - s));
  }

  _binomial(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    let result = 1;
    for (let i = 0; i < k; i++) result = result * (n - i) / (i + 1);
    return result;
  }

  _fitShapValues(coalitions: number[][], predictions: number[], weights: number[], dim: number): number[] {
    const n = coalitions.length;
    const XtWX: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
    const XtWy = new Array(dim).fill(0);

    for (let i = 0; i < n; i++) {
      const w = weights[i];
      const z = coalitions[i];
      const y = predictions[i];
      for (let j = 0; j < dim; j++) {
        XtWy[j] += w * z[j] * y;
        for (let k = 0; k < dim; k++) {
          XtWX[j][k] += w * z[j] * z[k];
        }
      }
    }

    for (let j = 0; j < dim; j++) XtWX[j][j] += 0.001;
    return this._solveLinear(XtWX, XtWy);
  }

  _randn(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
  }
}

export const xaiEngine = new XAIEngineImpl();
