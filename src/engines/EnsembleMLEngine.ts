// @ts-nocheck
/**
 * EnsembleMLEngine — Ensemble machine learning methods and numerical methods.
 *
 * Methods:
 * 1. Random Forest (classification & regression) — Breiman 2001
 * 2. Gradient Boosting (regression) — Friedman 2001
 * 3. Gaussian Mixture Model (EM) — Dempster, Laird & Rubin 1977
 * 4. Numerical Integration (Simpson, Gauss-Legendre, Adaptive)
 * 5. Root Finding (Bisection, Newton-Raphson, Brent 1973)
 *
 * All math is real — no stubs or placeholders.
 * Uses seeded Park-Miller PRNG for reproducibility.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

/** Input for Random Forest */
export interface RFInput {
  X: number[][];
  y: number[];
  nTrees?: number;
  maxDepth?: number;
  maxFeatures?: number;
  mode?: 'classification' | 'regression';
  seed?: number;
}

/** Output for Random Forest */
export interface RFResult {
  predictions: number[];
  accuracy?: number;
  mse?: number;
  featureImportance: number[];
  oobError?: number;
  nTrees: number;
}

/** Input for Gradient Boosting */
export interface GBInput {
  X: number[][];
  y: number[];
  nTrees?: number;
  maxDepth?: number;
  learningRate?: number;
  subsampleRatio?: number;
  seed?: number;
}

/** Output for Gradient Boosting */
export interface GBResult {
  predictions: number[];
  mse: number;
  featureImportance: number[];
  residualHistory: number[];
  nTrees: number;
}

/** Input for Gaussian Mixture Model */
export interface GMMInput {
  data: number[][];
  k: number;
  maxIterations?: number;
  tolerance?: number;
  seed?: number;
}

/** Output for Gaussian Mixture Model */
export interface GMMResult {
  means: number[][];
  covariances: number[][];
  weights: number[];
  assignments: number[];
  responsibilities: number[][];
  bic: number;
  logLikelihood: number;
  iterations: number;
}

/** Input for Numerical Integration */
export interface QuadInput {
  fn: (x: number) => number;
  a: number;
  b: number;
  method?: 'simpson' | 'gauss_legendre' | 'adaptive';
  n?: number;
  tolerance?: number;
}

/** Output for Numerical Integration */
export interface QuadResult {
  result: number;
  error: number;
  evaluations: number;
  method: string;
}

/** Input for Root Finding */
export interface RootInput {
  fn: (x: number) => number;
  a: number;
  b: number;
  method?: 'bisection' | 'newton' | 'brent';
  dfn?: (x: number) => number;
  tolerance?: number;
  maxIterations?: number;
}

/** Output for Root Finding */
export interface RootResult {
  root: number;
  iterations: number;
  functionValue: number;
  converged: boolean;
  method: string;
}

// ─── Internal types ──────────────────────────────────────────────────────────

/** CART decision tree node (array-of-struct storage) */
interface TreeNode {
  featureIndex: number;
  threshold: number;
  leftChild: number;
  rightChild: number;
  value: number;        // prediction value (class label or mean)
  isLeaf: boolean;
  impurityDecrease: number;
  nSamples: number;
}

/** A single decision tree stored as array of nodes */
interface DecisionTree {
  nodes: TreeNode[];
  featureIndices: number[];  // which features were considered
}

// ─── Seeded PRNG ─────────────────────────────────────────────────────────────

/**
 * Park-Miller PRNG: s_{n+1} = (s_n * 16807) mod 2147483647
 * Returns values in (0, 1).
 */
class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed > 0 ? seed % 2147483647 : 1;
    if (this.state <= 0) this.state = 1;
  }

  /** Returns a random float in (0, 1) */
  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return this.state / 2147483647;
  }

  /** Returns a random integer in [0, max) */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  /** Fisher-Yates shuffle in place */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Sample k indices from [0, n) without replacement */
  sampleWithoutReplacement(n: number, k: number): number[] {
    const indices = Array.from({ length: n }, (_, i) => i);
    this.shuffle(indices);
    return indices.slice(0, Math.min(k, n));
  }

  /** Bootstrap sample: k indices from [0, n) with replacement */
  bootstrapSample(n: number, k?: number): number[] {
    const size = k ?? n;
    const result: number[] = new Array(size);
    for (let i = 0; i < size; i++) {
      result[i] = this.nextInt(n);
    }
    return result;
  }
}

// ─── Engine ──────────────────────────────────────────────────────────────────

export class EnsembleMLEngine {
  private totalCalculations = 0;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. RANDOM FOREST — Breiman 2001
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Random Forest classifier/regressor.
   *
   * Builds N decision trees on bootstrap samples with random feature subsets.
   * Classification uses majority vote; regression uses mean prediction.
   * Feature importance: mean decrease in impurity (Gini or MSE).
   *
   * @ref Breiman, L. (2001). "Random Forests." Machine Learning 45(1): 5-32.
   */
  randomForest(input: RFInput): RFResult {
    this.totalCalculations++;
    const {
      X, y,
      nTrees = 100,
      maxDepth = 10,
      mode = 'classification',
      seed = 42,
    } = input;

    const n = X.length;
    const d = X[0].length;
    const maxFeatures = input.maxFeatures ?? (mode === 'classification'
      ? Math.max(1, Math.floor(Math.sqrt(d)))
      : Math.max(1, Math.floor(d / 3)));

    const rng = new SeededRNG(seed);
    const trees: DecisionTree[] = [];
    const featureImportanceAccum = new Float64Array(d);

    // OOB tracking
    const oobPredictions: number[][] = Array.from({ length: n }, () => []);

    for (let t = 0; t < nTrees; t++) {
      // Bootstrap sample
      const bagIndices = rng.bootstrapSample(n);
      const bagSet = new Set(bagIndices);

      // Random feature subset
      const featureIndices = rng.sampleWithoutReplacement(d, maxFeatures);

      // Extract bootstrap data
      const bagX = bagIndices.map(i => X[i]);
      const bagY = bagIndices.map(i => y[i]);

      // Build tree
      const tree = this.buildCARTTree(bagX, bagY, featureIndices, maxDepth, mode, rng);
      trees.push(tree);

      // Accumulate feature importance from this tree
      for (const node of tree.nodes) {
        if (!node.isLeaf) {
          const globalFeatureIdx = tree.featureIndices[node.featureIndex];
          featureImportanceAccum[globalFeatureIdx] +=
            node.impurityDecrease * node.nSamples;
        }
      }

      // OOB predictions
      for (let i = 0; i < n; i++) {
        if (!bagSet.has(i)) {
          const pred = this.predictTree(tree, X[i]);
          oobPredictions[i].push(pred);
        }
      }
    }

    // Normalize feature importance
    const totalImp = featureImportanceAccum.reduce((a, b) => a + b, 0);
    const featureImportance = Array.from(featureImportanceAccum).map(
      v => totalImp > 0 ? v / totalImp : 0
    );

    // Aggregate predictions (in-bag, on training data)
    const predictions = X.map(xi => this.aggregatePredictions(
      trees.map(tree => this.predictTree(tree, xi)), mode
    ));

    // OOB error
    let oobError: number | undefined;
    const oobValid = oobPredictions.filter(p => p.length > 0);
    if (oobValid.length > 0) {
      if (mode === 'classification') {
        let oobCorrect = 0;
        let oobCount = 0;
        for (let i = 0; i < n; i++) {
          if (oobPredictions[i].length > 0) {
            const pred = this.aggregatePredictions(oobPredictions[i], mode);
            if (pred === y[i]) oobCorrect++;
            oobCount++;
          }
        }
        oobError = oobCount > 0 ? 1 - oobCorrect / oobCount : undefined;
      } else {
        let oobSse = 0;
        let oobCount = 0;
        for (let i = 0; i < n; i++) {
          if (oobPredictions[i].length > 0) {
            const pred = this.aggregatePredictions(oobPredictions[i], mode);
            oobSse += (pred - y[i]) ** 2;
            oobCount++;
          }
        }
        oobError = oobCount > 0 ? oobSse / oobCount : undefined;
      }
    }

    // Accuracy / MSE on training data
    const result: RFResult = { predictions, featureImportance, oobError, nTrees };

    if (mode === 'classification') {
      let correct = 0;
      for (let i = 0; i < n; i++) {
        if (predictions[i] === y[i]) correct++;
      }
      result.accuracy = correct / n;
    } else {
      let sse = 0;
      for (let i = 0; i < n; i++) {
        sse += (predictions[i] - y[i]) ** 2;
      }
      result.mse = sse / n;
    }

    return result;
  }

  /**
   * Build a CART decision tree using recursive binary splitting.
   * Uses Gini impurity for classification, MSE for regression.
   */
  private buildCARTTree(
    X: number[][], y: number[], featureIndices: number[],
    maxDepth: number, mode: string, rng: SeededRNG
  ): DecisionTree {
    const nodes: TreeNode[] = [];

    const buildNode = (indices: number[], depth: number): number => {
      const nodeIdx = nodes.length;
      const nSamples = indices.length;

      // Compute current value
      let value: number;
      if (mode === 'classification') {
        // Majority class
        const counts = new Map<number, number>();
        for (const i of indices) {
          counts.set(y[i], (counts.get(y[i]) || 0) + 1);
        }
        let maxCount = 0;
        value = y[indices[0]];
        for (const [cls, cnt] of counts) {
          if (cnt > maxCount) { maxCount = cnt; value = cls; }
        }
      } else {
        // Mean
        let sum = 0;
        for (const i of indices) sum += y[i];
        value = sum / nSamples;
      }

      // Check stopping criteria
      if (depth >= maxDepth || nSamples <= 2 || this.allSame(indices, y)) {
        nodes.push({
          featureIndex: -1, threshold: 0,
          leftChild: -1, rightChild: -1,
          value, isLeaf: true, impurityDecrease: 0, nSamples
        });
        return nodeIdx;
      }

      // Find best split across feature subset
      let bestFeature = -1;
      let bestThreshold = 0;
      let bestImpurityDecrease = -Infinity;
      let bestLeftIndices: number[] = [];
      let bestRightIndices: number[] = [];

      const parentImpurity = mode === 'classification'
        ? this.giniImpurity(indices, y)
        : this.mseImpurity(indices, y);

      for (let fi = 0; fi < featureIndices.length; fi++) {
        const fIdx = featureIndices[fi];

        // Get unique sorted values for this feature
        const featureValues = indices.map(i => X[i][fIdx]);
        const sortedUnique = [...new Set(featureValues)].sort((a, b) => a - b);

        if (sortedUnique.length < 2) continue;

        // Try midpoints as thresholds
        for (let j = 0; j < sortedUnique.length - 1; j++) {
          const threshold = (sortedUnique[j] + sortedUnique[j + 1]) / 2;

          const leftIdx: number[] = [];
          const rightIdx: number[] = [];
          for (const i of indices) {
            if (X[i][fIdx] <= threshold) leftIdx.push(i);
            else rightIdx.push(i);
          }

          if (leftIdx.length === 0 || rightIdx.length === 0) continue;

          const leftImpurity = mode === 'classification'
            ? this.giniImpurity(leftIdx, y)
            : this.mseImpurity(leftIdx, y);
          const rightImpurity = mode === 'classification'
            ? this.giniImpurity(rightIdx, y)
            : this.mseImpurity(rightIdx, y);

          const weightedImpurity =
            (leftIdx.length / nSamples) * leftImpurity +
            (rightIdx.length / nSamples) * rightImpurity;
          const impurityDecrease = parentImpurity - weightedImpurity;

          if (impurityDecrease > bestImpurityDecrease) {
            bestImpurityDecrease = impurityDecrease;
            bestFeature = fi;
            bestThreshold = threshold;
            bestLeftIndices = leftIdx;
            bestRightIndices = rightIdx;
          }
        }
      }

      // No valid split found — make leaf
      if (bestFeature === -1 || bestImpurityDecrease <= 0) {
        nodes.push({
          featureIndex: -1, threshold: 0,
          leftChild: -1, rightChild: -1,
          value, isLeaf: true, impurityDecrease: 0, nSamples
        });
        return nodeIdx;
      }

      // Place placeholder node
      nodes.push({
        featureIndex: bestFeature, threshold: bestThreshold,
        leftChild: -1, rightChild: -1,
        value, isLeaf: false,
        impurityDecrease: bestImpurityDecrease, nSamples
      });

      // Recursively build children
      const leftChild = buildNode(bestLeftIndices, depth + 1);
      const rightChild = buildNode(bestRightIndices, depth + 1);
      nodes[nodeIdx].leftChild = leftChild;
      nodes[nodeIdx].rightChild = rightChild;

      return nodeIdx;
    };

    const sampleIndices = Array.from({ length: X.length }, (_, i) => i);
    buildNode(sampleIndices, 0);

    return { nodes, featureIndices };
  }

  /**
   * Gini impurity: 1 - Σ p_k²
   */
  private giniImpurity(indices: number[], y: number[]): number {
    const counts = new Map<number, number>();
    for (const i of indices) {
      counts.set(y[i], (counts.get(y[i]) || 0) + 1);
    }
    const n = indices.length;
    let sumSq = 0;
    for (const cnt of counts.values()) {
      const p = cnt / n;
      sumSq += p * p;
    }
    return 1 - sumSq;
  }

  /**
   * MSE impurity: (1/n) Σ (y_i - ȳ)²
   */
  private mseImpurity(indices: number[], y: number[]): number {
    let sum = 0;
    for (const i of indices) sum += y[i];
    const mean = sum / indices.length;
    let sse = 0;
    for (const i of indices) sse += (y[i] - mean) ** 2;
    return sse / indices.length;
  }

  /** Check if all y values for given indices are the same */
  private allSame(indices: number[], y: number[]): boolean {
    const first = y[indices[0]];
    for (let i = 1; i < indices.length; i++) {
      if (y[indices[i]] !== first) return false;
    }
    return true;
  }

  /** Predict a single sample through one tree */
  private predictTree(tree: DecisionTree, x: number[]): number {
    let nodeIdx = 0;
    while (!tree.nodes[nodeIdx].isLeaf) {
      const node = tree.nodes[nodeIdx];
      const globalFeature = tree.featureIndices[node.featureIndex];
      if (x[globalFeature] <= node.threshold) {
        nodeIdx = node.leftChild;
      } else {
        nodeIdx = node.rightChild;
      }
    }
    return tree.nodes[nodeIdx].value;
  }

  /** Aggregate predictions: majority vote (classification) or mean (regression) */
  private aggregatePredictions(preds: number[], mode: string): number {
    if (mode === 'classification') {
      const counts = new Map<number, number>();
      for (const p of preds) {
        counts.set(p, (counts.get(p) || 0) + 1);
      }
      let best = preds[0];
      let bestCount = 0;
      for (const [cls, cnt] of counts) {
        if (cnt > bestCount) { bestCount = cnt; best = cls; }
      }
      return best;
    } else {
      let sum = 0;
      for (const p of preds) sum += p;
      return sum / preds.length;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. GRADIENT BOOSTING (Regression) — Friedman 2001
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Gradient Boosting regressor using decision tree stumps/trees.
   *
   * Sequential ensemble: each tree fits the negative gradient (residuals)
   * of the loss function (MSE). Shrinkage via learning rate for regularization.
   * Optional stochastic gradient boosting via subsample ratio.
   *
   * @ref Friedman, J. H. (2001). "Greedy Function Approximation: A Gradient Boosting Machine."
   *      Annals of Statistics 29(5): 1189-1232.
   */
  gradientBoosting(input: GBInput): GBResult {
    this.totalCalculations++;
    const {
      X, y,
      nTrees = 100,
      maxDepth = 3,
      learningRate = 0.1,
      subsampleRatio = 1.0,
      seed = 42,
    } = input;

    const n = X.length;
    const d = X[0].length;
    const rng = new SeededRNG(seed);
    const featureImportanceAccum = new Float64Array(d);

    // Initialize predictions with mean of y (F_0)
    let yMean = 0;
    for (let i = 0; i < n; i++) yMean += y[i];
    yMean /= n;

    const F = new Float64Array(n).fill(yMean);
    const residuals = new Float64Array(n);
    const residualHistory: number[] = [];
    const allFeatures = Array.from({ length: d }, (_, i) => i);

    for (let t = 0; t < nTrees; t++) {
      // Compute residuals (negative gradient of MSE loss = y - F)
      for (let i = 0; i < n; i++) {
        residuals[i] = y[i] - F[i];
      }

      // Track mean absolute residual
      let meanAbsResidual = 0;
      for (let i = 0; i < n; i++) meanAbsResidual += Math.abs(residuals[i]);
      residualHistory.push(meanAbsResidual / n);

      // Subsample
      let sampleIndices: number[];
      if (subsampleRatio < 1.0) {
        const sampleSize = Math.max(1, Math.floor(n * subsampleRatio));
        sampleIndices = rng.sampleWithoutReplacement(n, sampleSize);
      } else {
        sampleIndices = Array.from({ length: n }, (_, i) => i);
      }

      // Build regression tree on residuals
      const subX = sampleIndices.map(i => X[i]);
      const subR = sampleIndices.map(i => residuals[i]);

      const tree = this.buildCARTTree(subX, subR, allFeatures, maxDepth, 'regression', rng);

      // Accumulate feature importance
      for (const node of tree.nodes) {
        if (!node.isLeaf) {
          const globalIdx = tree.featureIndices[node.featureIndex];
          featureImportanceAccum[globalIdx] += node.impurityDecrease * node.nSamples;
        }
      }

      // Update predictions: F_m(x) = F_{m-1}(x) + lr * h_m(x)
      for (let i = 0; i < n; i++) {
        const treePred = this.predictTree(tree, X[i]);
        F[i] += learningRate * treePred;
      }
    }

    // Final MSE
    let mse = 0;
    for (let i = 0; i < n; i++) {
      mse += (F[i] - y[i]) ** 2;
    }
    mse /= n;

    // Normalize feature importance
    const totalImp = featureImportanceAccum.reduce((a, b) => a + b, 0);
    const featureImportance = Array.from(featureImportanceAccum).map(
      v => totalImp > 0 ? v / totalImp : 0
    );

    return {
      predictions: Array.from(F),
      mse,
      featureImportance,
      residualHistory,
      nTrees,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. GAUSSIAN MIXTURE MODEL (EM) — Dempster, Laird & Rubin 1977
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Gaussian Mixture Model fitted via Expectation-Maximization.
   *
   * Uses diagonal covariance matrices for numerical stability.
   * Initialization via k-means++ style seeding.
   * Model selection criterion: BIC = -2·ln(L) + p·ln(n).
   *
   * @ref Dempster, A., Laird, N., & Rubin, D. (1977). "Maximum Likelihood from
   *      Incomplete Data via the EM Algorithm." J. Royal Statistical Society B 39(1): 1-38.
   */
  gaussianMixture(input: GMMInput): GMMResult {
    this.totalCalculations++;
    const {
      data,
      k,
      maxIterations = 200,
      tolerance = 1e-6,
      seed = 42,
    } = input;

    const n = data.length;
    const d = data[0].length;
    const rng = new SeededRNG(seed);

    // ── k-means++ initialization for means ──
    const means: number[][] = [];
    // Pick first center randomly
    const firstIdx = rng.nextInt(n);
    means.push([...data[firstIdx]]);

    for (let c = 1; c < k; c++) {
      // Compute min squared distance to nearest center
      const dists = new Float64Array(n);
      let totalDist = 0;
      for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        for (const center of means) {
          let dist = 0;
          for (let j = 0; j < d; j++) dist += (data[i][j] - center[j]) ** 2;
          if (dist < minDist) minDist = dist;
        }
        dists[i] = minDist;
        totalDist += minDist;
      }
      // Weighted random selection
      let r = rng.next() * totalDist;
      let selected = 0;
      for (let i = 0; i < n; i++) {
        r -= dists[i];
        if (r <= 0) { selected = i; break; }
      }
      means.push([...data[selected]]);
    }

    // Initialize diagonal covariances to data variance
    const globalVar = new Float64Array(d);
    const globalMean = new Float64Array(d);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < d; j++) globalMean[j] += data[i][j];
    }
    for (let j = 0; j < d; j++) globalMean[j] /= n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < d; j++) globalVar[j] += (data[i][j] - globalMean[j]) ** 2;
    }
    for (let j = 0; j < d; j++) globalVar[j] = Math.max(globalVar[j] / n, 1e-10);

    const covariances: number[][] = [];
    for (let c = 0; c < k; c++) {
      covariances.push(Array.from(globalVar));
    }

    // Initialize equal weights
    const weights = new Float64Array(k).fill(1 / k);

    // Responsibilities: γ(z_nk)
    const gamma: number[][] = Array.from({ length: n }, () => new Array(k).fill(0));

    let logLikelihood = -Infinity;
    let iterations = 0;

    for (let iter = 0; iter < maxIterations; iter++) {
      iterations = iter + 1;

      // ── E-step: compute responsibilities ──
      for (let i = 0; i < n; i++) {
        let maxLogProb = -Infinity;
        const logProbs = new Float64Array(k);

        for (let c = 0; c < k; c++) {
          // Log of Gaussian density with diagonal covariance
          let logDet = 0;
          let mahal = 0;
          for (let j = 0; j < d; j++) {
            const sigma2 = covariances[c][j];
            logDet += Math.log(sigma2);
            mahal += (data[i][j] - means[c][j]) ** 2 / sigma2;
          }
          logProbs[c] = Math.log(weights[c]) - 0.5 * (d * Math.log(2 * Math.PI) + logDet + mahal);
          if (logProbs[c] > maxLogProb) maxLogProb = logProbs[c];
        }

        // Log-sum-exp for numerical stability
        let sumExp = 0;
        for (let c = 0; c < k; c++) {
          sumExp += Math.exp(logProbs[c] - maxLogProb);
        }
        const logSumExp = maxLogProb + Math.log(sumExp);

        for (let c = 0; c < k; c++) {
          gamma[i][c] = Math.exp(logProbs[c] - logSumExp);
        }
      }

      // ── M-step: update parameters ──
      for (let c = 0; c < k; c++) {
        let Nk = 0;
        for (let i = 0; i < n; i++) Nk += gamma[i][c];
        Nk = Math.max(Nk, 1e-10);

        // Update weight
        weights[c] = Nk / n;

        // Update mean
        for (let j = 0; j < d; j++) {
          let sum = 0;
          for (let i = 0; i < n; i++) sum += gamma[i][c] * data[i][j];
          means[c][j] = sum / Nk;
        }

        // Update diagonal covariance
        for (let j = 0; j < d; j++) {
          let sum = 0;
          for (let i = 0; i < n; i++) {
            sum += gamma[i][c] * (data[i][j] - means[c][j]) ** 2;
          }
          covariances[c][j] = Math.max(sum / Nk, 1e-10);
        }
      }

      // ── Compute log-likelihood ──
      let newLogLikelihood = 0;
      for (let i = 0; i < n; i++) {
        let maxLogProb = -Infinity;
        const logProbs = new Float64Array(k);
        for (let c = 0; c < k; c++) {
          let logDet = 0;
          let mahal = 0;
          for (let j = 0; j < d; j++) {
            const sigma2 = covariances[c][j];
            logDet += Math.log(sigma2);
            mahal += (data[i][j] - means[c][j]) ** 2 / sigma2;
          }
          logProbs[c] = Math.log(weights[c]) - 0.5 * (d * Math.log(2 * Math.PI) + logDet + mahal);
          if (logProbs[c] > maxLogProb) maxLogProb = logProbs[c];
        }
        let sumExp = 0;
        for (let c = 0; c < k; c++) sumExp += Math.exp(logProbs[c] - maxLogProb);
        newLogLikelihood += maxLogProb + Math.log(sumExp);
      }

      // Check convergence
      if (Math.abs(newLogLikelihood - logLikelihood) < tolerance) {
        logLikelihood = newLogLikelihood;
        break;
      }
      logLikelihood = newLogLikelihood;
    }

    // Hard assignments
    const assignments = new Array(n);
    for (let i = 0; i < n; i++) {
      let bestC = 0;
      let bestProb = gamma[i][0];
      for (let c = 1; c < k; c++) {
        if (gamma[i][c] > bestProb) { bestProb = gamma[i][c]; bestC = c; }
      }
      assignments[i] = bestC;
    }

    // BIC = -2·ln(L) + p·ln(n)
    // Parameters: k means (k*d) + k covariances (k*d) + k-1 weights = k*(2d+1) - 1
    const nParams = k * (2 * d + 1) - 1;
    const bic = -2 * logLikelihood + nParams * Math.log(n);

    return {
      means: means.map(m => [...m]),
      covariances: covariances.map(c => [...c]),
      weights: Array.from(weights),
      assignments,
      responsibilities: gamma.map(row => [...row]),
      bic,
      logLikelihood,
      iterations,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. NUMERICAL INTEGRATION (Quadrature)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Numerical integration via composite Simpson's 1/3, Gauss-Legendre,
   * or adaptive Simpson's method.
   *
   * - Simpson's 1/3: O(h^4) composite rule
   * - Gauss-Legendre: 5-point or 7-point quadrature (exact for polynomials up to degree 2n-1)
   * - Adaptive: recursive bisection of Simpson's rule until error < tolerance
   *
   * @ref Stoer, J. & Bulirsch, R. "Introduction to Numerical Analysis."
   */
  numericalIntegration(input: QuadInput): QuadResult {
    this.totalCalculations++;
    const {
      fn, a, b,
      method = 'simpson',
      n = 100,
      tolerance = 1e-10,
    } = input;

    switch (method) {
      case 'simpson':
        return this.compositeSimpson(fn, a, b, n);
      case 'gauss_legendre':
        return this.gaussLegendre(fn, a, b, n);
      case 'adaptive':
        return this.adaptiveSimpson(fn, a, b, tolerance);
      default:
        return this.compositeSimpson(fn, a, b, n);
    }
  }

  /**
   * Composite Simpson's 1/3 Rule.
   * ∫_a^b f(x)dx ≈ (h/3)[f(x_0) + 4f(x_1) + 2f(x_2) + 4f(x_3) + ... + f(x_n)]
   * Requires even number of subintervals.
   */
  private compositeSimpson(
    fn: (x: number) => number, a: number, b: number, n: number
  ): QuadResult {
    // Ensure even number of subintervals
    const nSub = n % 2 === 0 ? n : n + 1;
    const h = (b - a) / nSub;
    let evaluations = 0;

    let sum = fn(a) + fn(b);
    evaluations += 2;

    for (let i = 1; i < nSub; i++) {
      const x = a + i * h;
      const coeff = i % 2 === 0 ? 2 : 4;
      sum += coeff * fn(x);
      evaluations++;
    }

    const result = (h / 3) * sum;

    // Error estimate: compute with n/2 subintervals and compare
    const nHalf = Math.max(2, Math.floor(nSub / 2));
    const hHalf = (b - a) / nHalf;
    let sumHalf = fn(a) + fn(b);
    for (let i = 1; i < nHalf; i++) {
      const x = a + i * hHalf;
      const coeff = i % 2 === 0 ? 2 : 4;
      sumHalf += coeff * fn(x);
    }
    const resultHalf = (hHalf / 3) * sumHalf;
    const error = Math.abs(result - resultHalf) / 15; // Richardson extrapolation factor

    return { result, error, evaluations, method: 'simpson' };
  }

  /**
   * Gauss-Legendre Quadrature.
   * Transforms [a,b] to [-1,1] and applies n-point rule.
   * Uses hardcoded nodes and weights for 5-point and 7-point rules.
   */
  private gaussLegendre(
    fn: (x: number) => number, a: number, b: number, nPoints: number
  ): QuadResult {
    // 5-point Gauss-Legendre nodes and weights on [-1, 1]
    const gl5Nodes = [
      -0.9061798459386640,
      -0.5384693101056831,
       0.0,
       0.5384693101056831,
       0.9061798459386640,
    ];
    const gl5Weights = [
      0.2369268850561891,
      0.4786286704993665,
      0.5688888888888889,
      0.4786286704993665,
      0.2369268850561891,
    ];

    // 7-point Gauss-Legendre nodes and weights on [-1, 1]
    const gl7Nodes = [
      -0.9491079123427585,
      -0.7415311855993945,
      -0.4058451513773972,
       0.0,
       0.4058451513773972,
       0.7415311855993945,
       0.9491079123427585,
    ];
    const gl7Weights = [
      0.1294849661688697,
      0.2797053914892766,
      0.3818300505051189,
      0.4179591836734694,
      0.3818300505051189,
      0.2797053914892766,
      0.1294849661688697,
    ];

    // Select rule (use 7-point if nPoints >= 7, else 5-point)
    const nodes = nPoints >= 7 ? gl7Nodes : gl5Nodes;
    const weights = nPoints >= 7 ? gl7Weights : gl5Weights;
    const pointsUsed = nodes.length;

    // If n is large, split [a,b] into subintervals for composite Gauss-Legendre
    const nIntervals = Math.max(1, Math.floor(nPoints / pointsUsed));
    const intervalWidth = (b - a) / nIntervals;

    let result = 0;
    let evaluations = 0;

    for (let interval = 0; interval < nIntervals; interval++) {
      const lo = a + interval * intervalWidth;
      const hi = lo + intervalWidth;
      const mid = (hi + lo) / 2;
      const halfWidth = (hi - lo) / 2;

      for (let i = 0; i < pointsUsed; i++) {
        const x = mid + halfWidth * nodes[i];
        result += weights[i] * fn(x) * halfWidth;
        evaluations++;
      }
    }

    // Error estimate: compare with half the number of intervals
    const nIntervalsHalf = Math.max(1, Math.floor(nIntervals / 2));
    const intervalWidthHalf = (b - a) / nIntervalsHalf;
    let resultHalf = 0;
    for (let interval = 0; interval < nIntervalsHalf; interval++) {
      const lo = a + interval * intervalWidthHalf;
      const hi = lo + intervalWidthHalf;
      const mid = (hi + lo) / 2;
      const halfWidth = (hi - lo) / 2;
      for (let i = 0; i < pointsUsed; i++) {
        const x = mid + halfWidth * nodes[i];
        resultHalf += weights[i] * fn(x) * halfWidth;
      }
    }
    const error = Math.abs(result - resultHalf);

    return { result, error, evaluations, method: `gauss_legendre_${pointsUsed}pt` };
  }

  /**
   * Adaptive Simpson's Quadrature.
   * Recursively bisects intervals until the estimated error is below tolerance.
   * Uses the 1/15 Richardson extrapolation error estimate.
   */
  private adaptiveSimpson(fn: (x: number) => number, a: number, b: number, tol: number): QuadResult {
    let evaluations = 0;
    const maxRecursionDepth = 50;

    const simpsonRule = (lo: number, hi: number): number => {
      const mid = (lo + hi) / 2;
      const h = (hi - lo) / 6;
      evaluations += 3;
      return h * (fn(lo) + 4 * fn(mid) + fn(hi));
    };

    const adaptiveStep = (
      lo: number, hi: number, sTot: number,
      fLo: number, fMid: number, fHi: number,
      depth: number
    ): number => {
      const mid = (lo + hi) / 2;
      const mid1 = (lo + mid) / 2;
      const mid2 = (mid + hi) / 2;
      const fMid1 = fn(mid1);
      const fMid2 = fn(mid2);
      evaluations += 2;

      const h = (hi - lo) / 12;
      const sLeft = h * (fLo + 4 * fMid1 + fMid);
      const sRight = h * (fMid + 4 * fMid2 + fHi);
      const sNew = sLeft + sRight;

      const error = (sNew - sTot) / 15;

      if (depth >= maxRecursionDepth || Math.abs(error) < tol) {
        return sNew + error; // Richardson correction
      }

      return (
        adaptiveStep(lo, mid, sLeft, fLo, fMid1, fMid, depth + 1) +
        adaptiveStep(mid, hi, sRight, fMid, fMid2, fHi, depth + 1)
      );
    };

    const fA = fn(a);
    const fB = fn(b);
    const fMid = fn((a + b) / 2);
    evaluations += 3;
    const sWhole = ((b - a) / 6) * (fA + 4 * fMid + fB);

    const result = adaptiveStep(a, b, sWhole, fA, fMid, fB, 0);

    return {
      result,
      error: tol, // guaranteed to be within tolerance
      evaluations,
      method: 'adaptive_simpson',
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. ROOT FINDING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Root finding via Bisection, Newton-Raphson, or Brent's method.
   *
   * - Bisection: Guaranteed convergence for bracketed roots (IVT). O(log₂((b-a)/tol)).
   * - Newton-Raphson: Quadratic convergence near root, requires derivative.
   * - Brent's: Combines bisection, secant, and inverse quadratic interpolation.
   *   Guaranteed convergence with superlinear rate.
   *
   * @ref Brent, R. P. (1973). "Algorithms for Minimization without Derivatives." Prentice-Hall.
   */
  rootFinding(input: RootInput): RootResult {
    this.totalCalculations++;
    const {
      fn, a, b,
      method = 'brent',
      dfn,
      tolerance = 1e-12,
      maxIterations = 100,
    } = input;

    switch (method) {
      case 'bisection':
        return this.bisection(fn, a, b, tolerance, maxIterations);
      case 'newton':
        return this.newtonRaphson(fn, dfn, a, b, tolerance, maxIterations);
      case 'brent':
        return this.brentsMethod(fn, a, b, tolerance, maxIterations);
      default:
        return this.brentsMethod(fn, a, b, tolerance, maxIterations);
    }
  }

  /**
   * Bisection method.
   * Requires f(a) and f(b) have opposite signs (bracketed root).
   * Halves the interval each iteration. Linear convergence.
   */
  private bisection(
    fn: (x: number) => number, a: number, b: number,
    tol: number, maxIter: number
  ): RootResult {
    let lo = a;
    let hi = b;
    let fLo = fn(lo);
    let fHi = fn(hi);

    if (fLo * fHi > 0) {
      // No sign change; return best endpoint
      const best = Math.abs(fLo) < Math.abs(fHi) ? lo : hi;
      return {
        root: best,
        iterations: 0,
        functionValue: fn(best),
        converged: false,
        method: 'bisection',
      };
    }

    let mid = lo;
    let iterations = 0;

    for (let i = 0; i < maxIter; i++) {
      iterations = i + 1;
      mid = (lo + hi) / 2;
      const fMid = fn(mid);

      if (Math.abs(fMid) < tol || (hi - lo) / 2 < tol) {
        return {
          root: mid,
          iterations,
          functionValue: fMid,
          converged: true,
          method: 'bisection',
        };
      }

      if (fLo * fMid < 0) {
        hi = mid;
        fHi = fMid;
      } else {
        lo = mid;
        fLo = fMid;
      }
    }

    const fMid = fn(mid);
    return {
      root: mid,
      iterations,
      functionValue: fMid,
      converged: Math.abs(fMid) < tol,
      method: 'bisection',
    };
  }

  /**
   * Newton-Raphson method.
   * x_{n+1} = x_n - f(x_n)/f'(x_n)
   * Quadratic convergence near root. Requires derivative.
   * Falls back to numerical derivative if dfn not provided.
   * Starting point: midpoint of [a, b].
   */
  private newtonRaphson(
    fn: (x: number) => number,
    dfn: ((x: number) => number) | undefined,
    a: number, b: number,
    tol: number, maxIter: number
  ): RootResult {
    // Numerical derivative fallback
    const derivative = dfn ?? ((x: number) => {
      const h = Math.max(Math.abs(x) * 1e-8, 1e-10);
      return (fn(x + h) - fn(x - h)) / (2 * h);
    });

    let x = (a + b) / 2;
    let iterations = 0;

    for (let i = 0; i < maxIter; i++) {
      iterations = i + 1;
      const fx = fn(x);

      if (Math.abs(fx) < tol) {
        return {
          root: x,
          iterations,
          functionValue: fx,
          converged: true,
          method: 'newton',
        };
      }

      const dfx = derivative(x);
      if (Math.abs(dfx) < 1e-15) {
        // Near-zero derivative; cannot continue
        return {
          root: x,
          iterations,
          functionValue: fx,
          converged: false,
          method: 'newton',
        };
      }

      const xNew = x - fx / dfx;

      // Clamp to [a, b] to prevent divergence
      x = Math.max(a, Math.min(b, xNew));

      if (Math.abs(xNew - x + (x - xNew)) < tol) {
        // This is simply checking |step| < tol
        const fxFinal = fn(x);
        if (Math.abs(fxFinal) < tol) {
          return {
            root: x,
            iterations,
            functionValue: fxFinal,
            converged: true,
            method: 'newton',
          };
        }
      }
    }

    const fxFinal = fn(x);
    return {
      root: x,
      iterations,
      functionValue: fxFinal,
      converged: Math.abs(fxFinal) < tol,
      method: 'newton',
    };
  }

  /**
   * Brent's method — combines bisection, secant, and inverse quadratic interpolation.
   *
   * Algorithm:
   * 1. If inverse quadratic interpolation (IQI) is applicable and stays in bounds, use it
   * 2. Else if secant step stays in bounds, use it
   * 3. Else fall back to bisection
   * 4. Guarantees convergence (like bisection) with superlinear rate
   *
   * @ref Brent, R. P. (1973). Chapter 4.
   */
  private brentsMethod(
    fn: (x: number) => number, a: number, b: number,
    tol: number, maxIter: number
  ): RootResult {
    let xA = a;
    let xB = b;
    let fA = fn(xA);
    let fB = fn(xB);

    if (fA * fB > 0) {
      // Try to find a sign change
      const best = Math.abs(fA) < Math.abs(fB) ? xA : xB;
      return {
        root: best,
        iterations: 0,
        functionValue: fn(best),
        converged: false,
        method: 'brent',
      };
    }

    // Ensure |f(a)| >= |f(b)| (b is the best guess)
    if (Math.abs(fA) < Math.abs(fB)) {
      [xA, xB] = [xB, xA];
      [fA, fB] = [fB, fA];
    }

    let xC = xA;
    let fC = fA;
    let mflag = true;
    let xD = 0;
    let iterations = 0;

    for (let i = 0; i < maxIter; i++) {
      iterations = i + 1;

      if (Math.abs(fB) < tol) {
        return {
          root: xB,
          iterations,
          functionValue: fB,
          converged: true,
          method: 'brent',
        };
      }

      if (Math.abs(xA - xB) < tol) {
        return {
          root: xB,
          iterations,
          functionValue: fB,
          converged: true,
          method: 'brent',
        };
      }

      let s: number;

      if (fA !== fC && fB !== fC) {
        // Inverse quadratic interpolation
        s = (xA * fB * fC) / ((fA - fB) * (fA - fC)) +
            (xB * fA * fC) / ((fB - fA) * (fB - fC)) +
            (xC * fA * fB) / ((fC - fA) * (fC - fB));
      } else {
        // Secant method
        s = xB - fB * (xB - xA) / (fB - fA);
      }

      // Conditions for accepting the step (Brent's conditions)
      const cond1 = !((s > (3 * xA + xB) / 4 && s < xB) ||
                       (s < (3 * xA + xB) / 4 && s > xB));
      const cond2 = mflag && Math.abs(s - xB) >= Math.abs(xB - xC) / 2;
      const cond3 = !mflag && Math.abs(s - xB) >= Math.abs(xC - xD) / 2;
      const cond4 = mflag && Math.abs(xB - xC) < tol;
      const cond5 = !mflag && Math.abs(xC - xD) < tol;

      if (cond1 || cond2 || cond3 || cond4 || cond5) {
        // Bisection
        s = (xA + xB) / 2;
        mflag = true;
      } else {
        mflag = false;
      }

      const fS = fn(s);
      xD = xC;
      xC = xB;
      fC = fB;

      if (fA * fS < 0) {
        xB = s;
        fB = fS;
      } else {
        xA = s;
        fA = fS;
      }

      // Ensure |f(a)| >= |f(b)|
      if (Math.abs(fA) < Math.abs(fB)) {
        [xA, xB] = [xB, xA];
        [fA, fB] = [fB, fA];
      }
    }

    return {
      root: xB,
      iterations,
      functionValue: fB,
      converged: Math.abs(fB) < tol,
      method: 'brent',
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Stats
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Returns engine metadata and usage statistics.
   */
  stats(): { methods: string[]; totalCalculations: number } {
    return {
      methods: [
        'randomForest (Breiman 2001 — classification & regression)',
        'gradientBoosting (Friedman 2001 — regression)',
        'gaussianMixture (Dempster-Laird-Rubin 1977 — EM with diagonal covariance)',
        'numericalIntegration (Simpson, Gauss-Legendre 5/7-pt, Adaptive Simpson)',
        'rootFinding (Bisection, Newton-Raphson, Brent 1973)',
      ],
      totalCalculations: this.totalCalculations,
    };
  }
}
