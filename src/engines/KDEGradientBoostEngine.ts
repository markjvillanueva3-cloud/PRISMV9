// @ts-nocheck
/**
 * KDEGradientBoostEngine — Kernel Density Estimation + Gradient Boosting for PRISM
 *
 * Methods:
 *   1. Kernel Density Estimation (1D) — Parzen 1962, Rosenblatt 1956, Silverman 1986
 *   2. 2D Kernel Density Estimation — Scott 1992
 *   3. Density-Based Anomaly Detection — Breunig et al. 2000
 *   4. Gradient Boosting Regression — Friedman 2001
 *   5. Gradient Boosting Classification — Friedman 2001
 *   6. Manufacturing Defect Prediction — applied GB pipeline
 *
 * All methods use seeded PRNG (Park-Miller) for reproducibility.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface KDEInput {
  data: number[];
  bandwidth?: number;
  kernel?: 'gaussian' | 'epanechnikov' | 'triangular';
  n_eval_points?: number;
  eval_range?: [number, number];
}

export interface KDEResult {
  x_values: number[];
  density: number[];
  bandwidth: number;
  mode: number;
  cdf_values: number[];
  confidence_band_95: [number[], number[]];
}

export interface KDE2DInput {
  x: number[];
  y: number[];
  bandwidth_x?: number;
  bandwidth_y?: number;
  n_grid?: number;
}

export interface KDE2DResult {
  x_grid: number[];
  y_grid: number[];
  density_grid: number[][];
  mode_x: number;
  mode_y: number;
  contour_levels: number[];
}

export interface DensityAnomalyInput {
  training_data: number[];
  test_points: number[];
  threshold_percentile?: number;
}

export interface DensityAnomalyResult {
  anomaly_scores: number[];
  is_anomaly: boolean[];
  threshold: number;
  n_anomalies: number;
}

export interface GBRegressInput {
  X_train: number[][];
  y_train: number[];
  X_test?: number[][];
  n_estimators?: number;
  learning_rate?: number;
  max_depth?: number;
  subsample?: number;
  loss?: 'squared_error' | 'absolute_error';
  seed?: number;
}

export interface GBRegressResult {
  predictions: number[];
  train_mse: number;
  test_mse?: number;
  feature_importance: number[];
  learning_curve: { iteration: number; train_loss: number; test_loss?: number }[];
  n_estimators_actual: number;
}

export interface GBClassifyInput {
  X_train: number[][];
  y_train: number[];
  X_test?: number[][];
  n_estimators?: number;
  learning_rate?: number;
  max_depth?: number;
  seed?: number;
}

export interface GBClassifyResult {
  predictions: number[];
  probabilities: number[];
  train_accuracy: number;
  feature_importance: number[];
  learning_curve: { iteration: number; train_loss: number }[];
}

export interface ManufacturingDefectFeature {
  speed_mpm: number;
  feed_mm_rev: number;
  depth_mm: number;
  tool_wear_vb?: number;
  vibration_rms?: number;
  temperature_c?: number;
  coolant_flow?: number;
}

export interface ManufacturingDefectInput {
  features: ManufacturingDefectFeature[];
  defect_labels: number[];
  predict_features?: ManufacturingDefectFeature[];
}

export interface ManufacturingDefectResult {
  predictions: number[];
  probabilities: number[];
  feature_ranking: { feature: string; importance: number }[];
  recommended_monitoring_features: string[];
}

// ─── Seeded PRNG (Park-Miller) ───────────────────────────────────────────────

class SeededRNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }
  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }
  nextGaussian(): number {
    const u1 = this.next();
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

// ─── Decision Tree (weak learner for GB) ─────────────────────────────────────

interface TreeNode {
  feature?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  value?: number;
}

function buildTree(
  X: number[][],
  y: number[],
  indices: number[],
  depth: number,
  maxDepth: number,
  rng: SeededRNG,
  subsample: number
): TreeNode {
  if (depth >= maxDepth || indices.length <= 1) {
    const vals = indices.map(i => y[i]);
    return { value: vals.reduce((a, b) => a + b, 0) / vals.length };
  }

  // Subsample indices if needed
  let sampleIdx = indices;
  if (subsample < 1.0) {
    const n = Math.max(1, Math.floor(indices.length * subsample));
    sampleIdx = [];
    const copy = [...indices];
    for (let i = 0; i < n; i++) {
      const j = Math.floor(rng.next() * copy.length);
      sampleIdx.push(copy[j]);
      copy.splice(j, 1);
    }
  }

  const nFeatures = X[0].length;
  let bestFeature = 0;
  let bestThreshold = 0;
  let bestScore = Infinity;
  let bestLeftIdx: number[] = [];
  let bestRightIdx: number[] = [];

  for (let f = 0; f < nFeatures; f++) {
    const vals = sampleIdx.map(i => X[i][f]).sort((a, b) => a - b);
    // Try up to 10 split points
    const nSplits = Math.min(10, vals.length - 1);
    for (let s = 0; s < nSplits; s++) {
      const idx = Math.floor((s + 1) * vals.length / (nSplits + 1));
      const thr = vals[idx];
      const leftIdx = sampleIdx.filter(i => X[i][f] <= thr);
      const rightIdx = sampleIdx.filter(i => X[i][f] > thr);
      if (leftIdx.length === 0 || rightIdx.length === 0) continue;

      const leftMean = leftIdx.reduce((a, i) => a + y[i], 0) / leftIdx.length;
      const rightMean = rightIdx.reduce((a, i) => a + y[i], 0) / rightIdx.length;
      const leftSSE = leftIdx.reduce((a, i) => a + (y[i] - leftMean) ** 2, 0);
      const rightSSE = rightIdx.reduce((a, i) => a + (y[i] - rightMean) ** 2, 0);
      const score = leftSSE + rightSSE;

      if (score < bestScore) {
        bestScore = score;
        bestFeature = f;
        bestThreshold = thr;
        bestLeftIdx = leftIdx;
        bestRightIdx = rightIdx;
      }
    }
  }

  if (bestLeftIdx.length === 0 || bestRightIdx.length === 0) {
    const vals = sampleIdx.map(i => y[i]);
    return { value: vals.reduce((a, b) => a + b, 0) / vals.length };
  }

  return {
    feature: bestFeature,
    threshold: bestThreshold,
    left: buildTree(X, y, bestLeftIdx, depth + 1, maxDepth, rng, subsample),
    right: buildTree(X, y, bestRightIdx, depth + 1, maxDepth, rng, subsample),
  };
}

function predictTree(node: TreeNode, x: number[]): number {
  if (node.value !== undefined && node.left === undefined) return node.value;
  if (x[node.feature!] <= node.threshold!) {
    return predictTree(node.left!, x);
  }
  return predictTree(node.right!, x);
}

function computeFeatureImportance(trees: TreeNode[], nFeatures: number): number[] {
  const importance = new Array(nFeatures).fill(0);

  function traverse(node: TreeNode) {
    if (node.feature !== undefined && node.left && node.right) {
      importance[node.feature] += 1;
      traverse(node.left);
      traverse(node.right);
    }
  }

  for (const tree of trees) traverse(tree);

  const total = importance.reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (let i = 0; i < nFeatures; i++) importance[i] /= total;
  }
  return importance;
}

// ─── Engine ──────────────────────────────────────────────────────────────────

export class KDEGradientBoostEngine {
  /**
   * 1D Kernel Density Estimation
   * Parzen 1962, Rosenblatt 1956. Bandwidth: Silverman 1986.
   * f̂(x) = (1/nh) Σ K((x - xi)/h)
   */
  kernelDensityEstimate(params: KDEInput): KDEResult {
    const {
      data,
      kernel = 'gaussian',
      n_eval_points = 200,
    } = params;

    const n = data.length;
    if (n === 0) throw new Error('Data array must not be empty');

    // Compute stats
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance);

    // IQR
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;

    // Silverman bandwidth
    const bandwidth = params.bandwidth ?? 0.9 * Math.min(std, iqr / 1.34) * Math.pow(n, -0.2);
    const h = Math.max(bandwidth, 1e-10);

    // Eval range
    const range = params.eval_range ?? [sorted[0] - 3 * h, sorted[n - 1] + 3 * h];
    const x_values: number[] = [];
    for (let i = 0; i < n_eval_points; i++) {
      x_values.push(range[0] + (range[1] - range[0]) * i / (n_eval_points - 1));
    }

    // Kernel functions
    const kernelFn = (u: number): number => {
      switch (kernel) {
        case 'gaussian':
          return Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
        case 'epanechnikov':
          return Math.abs(u) <= 1 ? 0.75 * (1 - u * u) : 0;
        case 'triangular':
          return Math.abs(u) <= 1 ? 1 - Math.abs(u) : 0;
        default:
          return Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
      }
    };

    // Compute density
    const density: number[] = [];
    for (const x of x_values) {
      let sum = 0;
      for (const xi of data) {
        sum += kernelFn((x - xi) / h);
      }
      density.push(sum / (n * h));
    }

    // Mode
    let maxDensity = -Infinity;
    let modeIdx = 0;
    for (let i = 0; i < density.length; i++) {
      if (density[i] > maxDensity) {
        maxDensity = density[i];
        modeIdx = i;
      }
    }

    // CDF (cumulative trapezoid)
    const cdf_values: number[] = [0];
    for (let i = 1; i < x_values.length; i++) {
      const dx = x_values[i] - x_values[i - 1];
      cdf_values.push(cdf_values[i - 1] + 0.5 * (density[i] + density[i - 1]) * dx);
    }
    // Normalize CDF
    const cdfMax = cdf_values[cdf_values.length - 1];
    if (cdfMax > 0) {
      for (let i = 0; i < cdf_values.length; i++) cdf_values[i] /= cdfMax;
    }

    // 95% confidence band (pointwise)
    const lower: number[] = [];
    const upper: number[] = [];
    for (let i = 0; i < density.length; i++) {
      const se = Math.sqrt(density[i] / (n * h));
      lower.push(Math.max(0, density[i] - 1.96 * se));
      upper.push(density[i] + 1.96 * se);
    }

    return {
      x_values,
      density,
      bandwidth: h,
      mode: x_values[modeIdx],
      cdf_values,
      confidence_band_95: [lower, upper],
    };
  }

  /**
   * 2D Kernel Density Estimation
   * Scott 1992. Product Gaussian kernel on 2D grid.
   */
  kde2d(params: KDE2DInput): KDE2DResult {
    const { x, y, n_grid = 50 } = params;
    const n = x.length;
    if (n !== y.length) throw new Error('x and y must have same length');
    if (n === 0) throw new Error('Data arrays must not be empty');

    // Stats
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    const stdX = Math.sqrt(x.reduce((a, b) => a + (b - meanX) ** 2, 0) / n);
    const stdY = Math.sqrt(y.reduce((a, b) => a + (b - meanY) ** 2, 0) / n);

    const hx = params.bandwidth_x ?? 1.06 * stdX * Math.pow(n, -0.2);
    const hy = params.bandwidth_y ?? 1.06 * stdY * Math.pow(n, -0.2);
    const bx = Math.max(hx, 1e-10);
    const by = Math.max(hy, 1e-10);

    const sortedX = [...x].sort((a, b) => a - b);
    const sortedY = [...y].sort((a, b) => a - b);
    const xMin = sortedX[0] - 3 * bx;
    const xMax = sortedX[n - 1] + 3 * bx;
    const yMin = sortedY[0] - 3 * by;
    const yMax = sortedY[n - 1] + 3 * by;

    const x_grid: number[] = [];
    const y_grid: number[] = [];
    for (let i = 0; i < n_grid; i++) {
      x_grid.push(xMin + (xMax - xMin) * i / (n_grid - 1));
      y_grid.push(yMin + (yMax - yMin) * i / (n_grid - 1));
    }

    const density_grid: number[][] = [];
    let maxDensity = -Infinity;
    let modeXIdx = 0;
    let modeYIdx = 0;

    for (let i = 0; i < n_grid; i++) {
      const row: number[] = [];
      for (let j = 0; j < n_grid; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          const ux = (x_grid[i] - x[k]) / bx;
          const uy = (y_grid[j] - y[k]) / by;
          sum += Math.exp(-0.5 * (ux * ux + uy * uy)) / (2 * Math.PI);
        }
        const d = sum / (n * bx * by);
        row.push(d);
        if (d > maxDensity) {
          maxDensity = d;
          modeXIdx = i;
          modeYIdx = j;
        }
      }
      density_grid.push(row);
    }

    // Contour levels (10%, 25%, 50%, 75%, 90% of max)
    const contour_levels = [0.1, 0.25, 0.5, 0.75, 0.9].map(p => p * maxDensity);

    return {
      x_grid,
      y_grid,
      density_grid,
      mode_x: x_grid[modeXIdx],
      mode_y: y_grid[modeYIdx],
      contour_levels,
    };
  }

  /**
   * Density-Based Anomaly Detection via KDE
   * Points with density below threshold percentile are anomalies.
   */
  densityBasedAnomaly(params: DensityAnomalyInput): DensityAnomalyResult {
    const { training_data, test_points, threshold_percentile = 5 } = params;

    // Build KDE on training data
    const kdeResult = this.kernelDensityEstimate({ data: training_data });

    // Evaluate training density at each training point for threshold
    const trainDensities: number[] = [];
    const h = kdeResult.bandwidth;
    const n = training_data.length;

    const evalDensity = (point: number): number => {
      let sum = 0;
      for (const xi of training_data) {
        const u = (point - xi) / h;
        sum += Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
      }
      return sum / (n * h);
    };

    for (const xi of training_data) {
      trainDensities.push(evalDensity(xi));
    }

    // Threshold from training densities
    const sortedDensities = [...trainDensities].sort((a, b) => a - b);
    const threshIdx = Math.floor(sortedDensities.length * threshold_percentile / 100);
    const threshold = sortedDensities[Math.max(0, threshIdx)];

    // Score test points
    const anomaly_scores: number[] = [];
    const is_anomaly: boolean[] = [];
    for (const pt of test_points) {
      const d = evalDensity(pt);
      anomaly_scores.push(d);
      is_anomaly.push(d < threshold);
    }

    return {
      anomaly_scores,
      is_anomaly,
      threshold,
      n_anomalies: is_anomaly.filter(a => a).length,
    };
  }

  /**
   * Gradient Boosting Regression — Friedman 2001
   * f_0 = mean(y), f_m = f_{m-1} + η × tree_m(pseudo-residuals)
   */
  gradientBoostRegress(params: GBRegressInput): GBRegressResult {
    const {
      X_train,
      y_train,
      X_test,
      n_estimators = 100,
      learning_rate = 0.1,
      max_depth = 3,
      subsample = 1.0,
      loss = 'squared_error',
      seed = 42,
    } = params;

    const n = X_train.length;
    const nFeatures = X_train[0].length;
    const rng = new SeededRNG(seed);

    // f_0 = mean(y)
    const f0 = y_train.reduce((a, b) => a + b, 0) / n;
    const predictions = new Array(n).fill(f0);
    const testPredictions = X_test ? new Array(X_test.length).fill(f0) : undefined;

    const trees: TreeNode[] = [];
    const learning_curve: { iteration: number; train_loss: number; test_loss?: number }[] = [];
    const allIndices = Array.from({ length: n }, (_, i) => i);

    for (let m = 0; m < n_estimators; m++) {
      // Compute pseudo-residuals
      const residuals = new Array(n);
      if (loss === 'squared_error') {
        for (let i = 0; i < n; i++) residuals[i] = y_train[i] - predictions[i];
      } else {
        // absolute error: sign of residual
        for (let i = 0; i < n; i++) residuals[i] = Math.sign(y_train[i] - predictions[i]);
      }

      // Fit tree to residuals
      const tree = buildTree(X_train, residuals, allIndices, 0, max_depth, rng, subsample);
      trees.push(tree);

      // Update predictions
      for (let i = 0; i < n; i++) {
        predictions[i] += learning_rate * predictTree(tree, X_train[i]);
      }
      if (testPredictions && X_test) {
        for (let i = 0; i < X_test.length; i++) {
          testPredictions[i] += learning_rate * predictTree(tree, X_test[i]);
        }
      }

      // Record loss
      const trainLoss = predictions.reduce((a, p, i) => a + (y_train[i] - p) ** 2, 0) / n;
      const entry: { iteration: number; train_loss: number; test_loss?: number } = {
        iteration: m + 1,
        train_loss: trainLoss,
      };
      if (X_test && params.X_test) {
        // No y_test available, skip test_loss in learning curve unless we add it
      }
      learning_curve.push(entry);
    }

    const train_mse = predictions.reduce((a, p, i) => a + (y_train[i] - p) ** 2, 0) / n;
    const feature_importance = computeFeatureImportance(trees, nFeatures);

    const result: GBRegressResult = {
      predictions: testPredictions ?? predictions,
      train_mse,
      feature_importance,
      learning_curve,
      n_estimators_actual: n_estimators,
    };

    return result;
  }

  /**
   * Gradient Boosting Binary Classification — Friedman 2001
   * Log-loss with sigmoid. f_0 = log(p/(1-p)), pseudo-residuals = y - p
   */
  gradientBoostClassify(params: GBClassifyInput): GBClassifyResult {
    const {
      X_train,
      y_train,
      X_test,
      n_estimators = 100,
      learning_rate = 0.1,
      max_depth = 3,
      seed = 42,
    } = params;

    const n = X_train.length;
    const nFeatures = X_train[0].length;
    const rng = new SeededRNG(seed);

    // f_0 = log(p/(1-p)) where p = mean(y)
    const pMean = Math.max(0.01, Math.min(0.99, y_train.reduce((a, b) => a + b, 0) / n));
    const f0 = Math.log(pMean / (1 - pMean));
    const rawScores = new Array(n).fill(f0);
    const testScores = X_test ? new Array(X_test.length).fill(f0) : undefined;

    const sigmoid = (z: number) => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));

    const trees: TreeNode[] = [];
    const learning_curve: { iteration: number; train_loss: number }[] = [];
    const allIndices = Array.from({ length: n }, (_, i) => i);

    for (let m = 0; m < n_estimators; m++) {
      // Pseudo-residuals: y - p
      const residuals = new Array(n);
      for (let i = 0; i < n; i++) {
        residuals[i] = y_train[i] - sigmoid(rawScores[i]);
      }

      const tree = buildTree(X_train, residuals, allIndices, 0, max_depth, rng, 1.0);
      trees.push(tree);

      for (let i = 0; i < n; i++) {
        rawScores[i] += learning_rate * predictTree(tree, X_train[i]);
      }
      if (testScores && X_test) {
        for (let i = 0; i < X_test.length; i++) {
          testScores[i] += learning_rate * predictTree(tree, X_test[i]);
        }
      }

      // Log-loss
      let logLoss = 0;
      for (let i = 0; i < n; i++) {
        const p = sigmoid(rawScores[i]);
        logLoss -= y_train[i] * Math.log(p + 1e-15) + (1 - y_train[i]) * Math.log(1 - p + 1e-15);
      }
      learning_curve.push({ iteration: m + 1, train_loss: logLoss / n });
    }

    const finalScores = testScores ?? rawScores;
    const probabilities = finalScores.map(sigmoid);
    const predictions = probabilities.map(p => (p >= 0.5 ? 1 : 0));

    // Training accuracy
    const trainProbs = rawScores.map(sigmoid);
    const trainPreds = trainProbs.map(p => (p >= 0.5 ? 1 : 0));
    const train_accuracy = trainPreds.reduce((a, p, i) => a + (p === y_train[i] ? 1 : 0), 0) / n;

    return {
      predictions,
      probabilities,
      train_accuracy,
      feature_importance: computeFeatureImportance(trees, nFeatures),
      learning_curve,
    };
  }

  /**
   * Manufacturing Defect Prediction — applied GB classification pipeline
   * Converts manufacturing feature objects to numeric arrays, trains GB classifier.
   */
  manufacturingDefectPrediction(params: ManufacturingDefectInput): ManufacturingDefectResult {
    const { features, defect_labels, predict_features } = params;

    const featureNames = [
      'speed_mpm', 'feed_mm_rev', 'depth_mm',
      'tool_wear_vb', 'vibration_rms', 'temperature_c', 'coolant_flow',
    ];

    const toArray = (f: ManufacturingDefectFeature): number[] => [
      f.speed_mpm, f.feed_mm_rev, f.depth_mm,
      f.tool_wear_vb ?? 0, f.vibration_rms ?? 0,
      f.temperature_c ?? 0, f.coolant_flow ?? 0,
    ];

    const X_train = features.map(toArray);
    const X_test = predict_features ? predict_features.map(toArray) : undefined;

    const result = this.gradientBoostClassify({
      X_train,
      y_train: defect_labels,
      X_test,
      n_estimators: 50,
      learning_rate: 0.1,
      max_depth: 3,
      seed: 12345,
    });

    // Rank features
    const feature_ranking = featureNames
      .map((name, i) => ({ feature: name, importance: result.feature_importance[i] }))
      .sort((a, b) => b.importance - a.importance);

    // Recommend top features with non-zero importance
    const recommended = feature_ranking
      .filter(f => f.importance > 0)
      .slice(0, 3)
      .map(f => f.feature);

    return {
      predictions: result.predictions,
      probabilities: result.probabilities,
      feature_ranking,
      recommended_monitoring_features: recommended.length > 0 ? recommended : featureNames.slice(0, 3),
    };
  }
}

export const kdeGradientBoostEngine = new KDEGradientBoostEngine();
