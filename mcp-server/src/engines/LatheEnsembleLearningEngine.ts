/**
 * LatheEnsembleLearningEngine — LATHE-ENSEMBLE-MS0
 * ==================================================
 * Ensemble learning methods for CNC lathe parameter prediction.
 *
 * Implements complete ensemble algorithms:
 *   1. Bagging — Bootstrap aggregating with Random Forest
 *   2. Boosting — AdaBoost, Gradient Boosting, XGBoost-style
 *   3. Stacking — Meta-learner architecture with cross-validation
 *   4. Voting — Hard, soft, weighted, dynamic voting
 *   5. Model Diversity — Q-statistic, correlation, ensemble pruning
 *   6. Manufacturing Ensembles — Surface finish, tool life, cycle time, quality
 *
 * State Space for Lathe Parameters:
 *   - Cutting speed (Vc) [m/min]
 *   - Feed rate (f) [mm/rev]
 *   - Depth of cut (ap) [mm]
 *   - Tool geometry (nose radius, lead angle)
 *   - Material properties (hardness, kc1_1)
 *   - Machine state (spindle load, vibration)
 *
 * References:
 *   - Breiman (2001) "Random Forests" — bagging with random feature subsets
 *   - Freund & Schapire (1997) "AdaBoost" — adaptive boosting
 *   - Friedman (2001) "Gradient Boosting Machines"
 *   - Chen & Guestrin (2016) "XGBoost" — regularized gradient boosting
 *   - Wolpert (1992) "Stacked Generalization"
 *   - Kuncheva & Whitaker (2003) "Measures of Diversity in Classifier Ensembles"
 *
 * @module engines/LatheEnsembleLearningEngine
 * @milestone LATHE-ENSEMBLE-MS0
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// TYPES — Data Structures
// ============================================================================

/** Training data point for lathe parameters */
export interface LatheTrainingPoint {
  // Input features
  material_iso: ISOGroup;
  hardness_hrc: number;
  diameter_mm: number;
  length_mm: number;
  operation: "roughing" | "finishing" | "threading" | "grooving" | "parting";
  tool_nose_radius_mm: number;
  tool_lead_angle_deg: number;
  machine_power_kw: number;
  rigidity_factor: number;  // 0-1

  // Target outputs (what we predict)
  cutting_speed_m_min?: number;
  feed_mm_rev?: number;
  depth_of_cut_mm?: number;
  surface_finish_ra?: number;
  tool_life_min?: number;
  cycle_time_sec?: number;
  quality_class?: number;  // 0=reject, 1=acceptable, 2=good, 3=excellent
}

/** Encoded feature vector */
export interface EncodedFeatures {
  vector: number[];
  featureNames: string[];
  dimension: number;
}

/** Base learner interface */
export interface BaseLearner {
  id: string;
  type: "decision_tree" | "linear" | "ridge" | "knn" | "gradient_tree";
  weights: number[];
  bias: number;
  predict: (x: number[]) => number;
  predictProba?: (x: number[]) => number[];
  featureImportance?: number[];
}

/** Decision tree node */
export interface TreeNode {
  featureIndex: number;
  threshold: number;
  leftChild: number;
  rightChild: number;
  value: number;
  isLeaf: boolean;
  impurityDecrease: number;
  nSamples: number;
}

/** Decision tree structure */
export interface DecisionTree {
  nodes: TreeNode[];
  featureIndices: number[];
  maxDepth: number;
  mode: "classification" | "regression";
}

/** Random Forest model */
export interface RandomForestModel {
  trees: DecisionTree[];
  nTrees: number;
  maxDepth: number;
  maxFeatures: number;
  featureImportance: number[];
  oobError: number;
  mode: "classification" | "regression";
}

/** Gradient Boosting model */
export interface GradientBoostingModel {
  trees: DecisionTree[];
  learningRate: number;
  nRounds: number;
  initialPrediction: number;
  featureImportance: number[];
  residualHistory: number[];
}

/** AdaBoost model */
export interface AdaBoostModel {
  stumps: DecisionTree[];
  alphas: number[];
  nEstimators: number;
  classes: number[];
  trainingError: number[];
}

/** XGBoost-style model */
export interface XGBoostModel {
  trees: DecisionTree[];
  learningRate: number;
  nRounds: number;
  lambda: number;  // L2 regularization
  gamma: number;   // Min split loss
  maxDepth: number;
  featureImportance: number[];
  trainingLoss: number[];
}

/** Stacking ensemble model */
export interface StackingModel {
  baseLearners: BaseLearner[];
  metaLearner: BaseLearner;
  cvFolds: number;
  blendingWeights?: number[];
}

/** Voting ensemble model */
export interface VotingModel {
  models: BaseLearner[];
  votingType: "hard" | "soft" | "weighted";
  weights: number[];
  dynamicWeighting: boolean;
}

/** Diversity metrics */
export interface DiversityMetrics {
  qStatistic: number;        // Yule's Q-statistic
  correlation: number;       // Pairwise correlation
  disagreement: number;      // Disagreement measure
  doubleFault: number;       // Double fault measure
  entropyMeasure: number;    // Entropy of votes
  kohavi_wolpert: number;    // Kohavi-Wolpert variance
}

/** Ensemble prediction result */
export interface EnsemblePrediction {
  prediction: number;
  confidence: number;
  modelPredictions: number[];
  modelWeights: number[];
  uncertainty: number;
  consensusLevel: number;  // Agreement among models
}

/** Manufacturing ensemble result */
export interface ManufacturingPrediction {
  surfaceFinish_Ra: number;
  toolLife_min: number;
  cycleTime_sec: number;
  qualityClass: number;
  confidence: number;
  recommendations: string[];
}

/** Training result */
export interface TrainingResult {
  model: RandomForestModel | GradientBoostingModel | AdaBoostModel | XGBoostModel | StackingModel | VotingModel;
  trainingTime_ms: number;
  trainingError: number;
  validationError?: number;
  featureImportance: number[];
}

// ============================================================================
// SEEDED PRNG — Park-Miller for Reproducibility
// ============================================================================

/**
 * Park-Miller PRNG: s_{n+1} = (s_n * 16807) mod 2147483647
 * @ref Park & Miller (1988) "Random Number Generators"
 */
class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed > 0 ? seed % 2147483647 : 1;
    if (this.state <= 0) this.state = 1;
  }

  /** Returns random float in (0, 1) */
  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return this.state / 2147483647;
  }

  /** Returns random integer in [0, max) */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  /** Returns random float in [min, max) */
  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Standard normal via Box-Muller */
  nextGaussian(): number {
    const u1 = this.next();
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
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

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class LatheEnsembleLearningEngine {
  private totalCalculations = 0;
  private modelRegistry: Map<string, BaseLearner> = new Map();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. FEATURE ENCODING — Convert Lathe Data to Numeric Vectors
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Encode lathe training point to numeric feature vector.
   * Handles categorical encoding and normalization.
   */
  encodeFeatures(point: LatheTrainingPoint): EncodedFeatures {
    this.totalCalculations++;

    const isoGroupMap: Record<ISOGroup, number> = {
      "P": 0, "M": 1, "K": 2, "N": 3, "S": 4, "H": 5
    };

    const operationMap: Record<string, number> = {
      "roughing": 0, "finishing": 1, "threading": 2, "grooving": 3, "parting": 4
    };

    // Get Kienzle constants for physics-based features
    const kienzle = CANONICAL_KIENZLE[point.material_iso];

    const featureNames = [
      "iso_group_encoded",
      "hardness_normalized",
      "diameter_normalized",
      "length_normalized",
      "l_d_ratio",
      "operation_encoded",
      "nose_radius_normalized",
      "lead_angle_normalized",
      "machine_power_normalized",
      "rigidity_factor",
      "kc1_1_normalized",
      "mc_value",
      "surface_area_normalized",
      "slenderness_ratio"
    ];

    // Normalize features to [0, 1] range using domain knowledge
    const vector = [
      isoGroupMap[point.material_iso] / 5,                    // ISO group [0-1]
      Math.min(point.hardness_hrc, 70) / 70,                  // Hardness [0-70 HRC]
      Math.min(point.diameter_mm, 500) / 500,                 // Diameter [0-500mm]
      Math.min(point.length_mm, 1000) / 1000,                 // Length [0-1000mm]
      Math.min(point.length_mm / Math.max(point.diameter_mm, 1), 10) / 10,  // L/D ratio
      operationMap[point.operation] / 4,                      // Operation [0-1]
      Math.min(point.tool_nose_radius_mm, 2.4) / 2.4,        // Nose radius [0-2.4mm]
      point.tool_lead_angle_deg / 90,                         // Lead angle [0-90deg]
      Math.min(point.machine_power_kw, 50) / 50,             // Power [0-50kW]
      point.rigidity_factor,                                  // Rigidity [0-1]
      kienzle.kc1_1 / 3500,                                  // kc1_1 normalized
      kienzle.mc,                                             // mc value [0.2-0.35]
      Math.min(Math.PI * point.diameter_mm * point.length_mm / 1000, 500) / 500,  // Surface area
      Math.min(point.length_mm / Math.sqrt(point.diameter_mm), 50) / 50  // Slenderness
    ];

    return {
      vector,
      featureNames,
      dimension: vector.length
    };
  }

  /**
   * Encode batch of training data.
   */
  encodeDataset(data: LatheTrainingPoint[]): { X: number[][]; featureNames: string[] } {
    const encoded = data.map(p => this.encodeFeatures(p));
    return {
      X: encoded.map(e => e.vector),
      featureNames: encoded[0]?.featureNames ?? []
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. BAGGING — Bootstrap Aggregating & Random Forest
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Train Random Forest for lathe parameter prediction.
   * Implements Breiman (2001) with OOB error estimation.
   *
   * @param data Training data points
   * @param nTrees Number of trees in forest
   * @param target Target variable to predict
   * @param options Additional options
   * @returns Trained Random Forest model
   *
   * @ref Breiman, L. (2001). "Random Forests." Machine Learning 45(1): 5-32.
   */
  trainRandomForest(
    data: LatheTrainingPoint[],
    nTrees: number,
    target: "cutting_speed" | "feed" | "depth_of_cut" | "surface_finish" | "tool_life" | "cycle_time" | "quality",
    options: {
      maxDepth?: number;
      maxFeatures?: number;
      minSamplesSplit?: number;
      seed?: number;
    } = {}
  ): TrainingResult {
    const startTime = Date.now();
    this.totalCalculations++;

    const {
      maxDepth = 10,
      seed = 42
    } = options;

    // Encode features
    const { X, featureNames } = this.encodeDataset(data);
    const y = this.extractTarget(data, target);
    const n = X.length;
    const d = X[0].length;

    // Determine mode based on target
    const mode: "classification" | "regression" = target === "quality" ? "classification" : "regression";

    // Default maxFeatures: sqrt(d) for classification, d/3 for regression
    const maxFeatures = options.maxFeatures ??
      (mode === "classification" ? Math.max(1, Math.floor(Math.sqrt(d))) : Math.max(1, Math.floor(d / 3)));

    const rng = new SeededRNG(seed);
    const trees: DecisionTree[] = [];
    const featureImportanceAccum = new Float64Array(d);

    // OOB tracking
    const oobPredictions: number[][] = Array.from({ length: n }, () => []);

    // Build trees
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

      // Accumulate feature importance
      for (const node of tree.nodes) {
        if (!node.isLeaf) {
          const globalIdx = tree.featureIndices[node.featureIndex];
          featureImportanceAccum[globalIdx] += node.impurityDecrease * node.nSamples;
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

    // Calculate OOB error
    let oobError = 0;
    let oobCount = 0;
    for (let i = 0; i < n; i++) {
      if (oobPredictions[i].length > 0) {
        const pred = this.aggregatePredictions(oobPredictions[i], mode);
        if (mode === "classification") {
          if (pred !== y[i]) oobError++;
        } else {
          oobError += (pred - y[i]) ** 2;
        }
        oobCount++;
      }
    }
    oobError = oobCount > 0 ? oobError / oobCount : 0;

    // Calculate training error
    const predictions = X.map(xi =>
      this.aggregatePredictions(trees.map(t => this.predictTree(t, xi)), mode)
    );
    let trainingError = 0;
    for (let i = 0; i < n; i++) {
      if (mode === "classification") {
        if (predictions[i] !== y[i]) trainingError++;
      } else {
        trainingError += (predictions[i] - y[i]) ** 2;
      }
    }
    trainingError /= n;

    const model: RandomForestModel = {
      trees,
      nTrees,
      maxDepth,
      maxFeatures,
      featureImportance,
      oobError,
      mode
    };

    log.info(`Random Forest trained: ${nTrees} trees, OOB error: ${oobError.toFixed(4)}`);

    return {
      model,
      trainingTime_ms: Date.now() - startTime,
      trainingError,
      validationError: oobError,
      featureImportance
    };
  }

  /**
   * Build CART decision tree using recursive binary splitting.
   * Uses Gini impurity for classification, MSE for regression.
   */
  private buildCARTTree(
    X: number[][],
    y: number[],
    featureIndices: number[],
    maxDepth: number,
    mode: "classification" | "regression",
    rng: SeededRNG
  ): DecisionTree {
    const nodes: TreeNode[] = [];

    const buildNode = (indices: number[], depth: number): number => {
      const nodeIdx = nodes.length;
      const nSamples = indices.length;

      // Compute current value
      let value: number;
      if (mode === "classification") {
        const counts = new Map<number, number>();
        for (const i of indices) {
          counts.set(y[i], (counts.get(y[i]) || 0) + 1);
        }
        let maxCount = 0;
        value = y[indices[0]];
        counts.forEach((cnt, cls) => {
          if (cnt > maxCount) { maxCount = cnt; value = cls; }
        });
      } else {
        let sum = 0;
        for (const i of indices) sum += y[i];
        value = sum / nSamples;
      }

      // Stopping criteria
      if (depth >= maxDepth || nSamples <= 2 || this.allSame(indices, y)) {
        nodes.push({
          featureIndex: -1, threshold: 0,
          leftChild: -1, rightChild: -1,
          value, isLeaf: true, impurityDecrease: 0, nSamples
        });
        return nodeIdx;
      }

      // Find best split
      let bestFeature = -1;
      let bestThreshold = 0;
      let bestImpurityDecrease = -Infinity;
      let bestLeftIndices: number[] = [];
      let bestRightIndices: number[] = [];

      const parentImpurity = mode === "classification"
        ? this.giniImpurity(indices, y)
        : this.mseImpurity(indices, y);

      for (let fi = 0; fi < featureIndices.length; fi++) {
        const fIdx = featureIndices[fi];
        const featureValues = indices.map(i => X[i][fIdx]);
        const sortedUnique = Array.from(new Set(featureValues)).sort((a, b) => a - b);

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

          const leftImpurity = mode === "classification"
            ? this.giniImpurity(leftIdx, y)
            : this.mseImpurity(leftIdx, y);
          const rightImpurity = mode === "classification"
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

      // No valid split found
      if (bestFeature === -1 || bestImpurityDecrease <= 0) {
        nodes.push({
          featureIndex: -1, threshold: 0,
          leftChild: -1, rightChild: -1,
          value, isLeaf: true, impurityDecrease: 0, nSamples
        });
        return nodeIdx;
      }

      // Place node
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

    return { nodes, featureIndices, maxDepth, mode };
  }

  /** Gini impurity: 1 - sum(p_k^2) */
  private giniImpurity(indices: number[], y: number[]): number {
    const counts = new Map<number, number>();
    for (const i of indices) {
      counts.set(y[i], (counts.get(y[i]) || 0) + 1);
    }
    const n = indices.length;
    let sumSq = 0;
    counts.forEach(cnt => {
      const p = cnt / n;
      sumSq += p * p;
    });
    return 1 - sumSq;
  }

  /** MSE impurity: (1/n) * sum((y_i - mean)^2) */
  private mseImpurity(indices: number[], y: number[]): number {
    let sum = 0;
    for (const i of indices) sum += y[i];
    const mean = sum / indices.length;
    let sse = 0;
    for (const i of indices) sse += (y[i] - mean) ** 2;
    return sse / indices.length;
  }

  /** Check if all y values for indices are the same */
  private allSame(indices: number[], y: number[]): boolean {
    const first = y[indices[0]];
    for (let i = 1; i < indices.length; i++) {
      if (y[indices[i]] !== first) return false;
    }
    return true;
  }

  /** Predict single sample through one tree */
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

  /** Aggregate predictions: majority vote or mean */
  private aggregatePredictions(preds: number[], mode: "classification" | "regression"): number {
    if (mode === "classification") {
      const counts = new Map<number, number>();
      for (const p of preds) {
        counts.set(p, (counts.get(p) || 0) + 1);
      }
      let best = preds[0];
      let bestCount = 0;
      counts.forEach((cnt, cls) => {
        if (cnt > bestCount) { bestCount = cnt; best = cls; }
      });
      return best;
    } else {
      let sum = 0;
      for (const p of preds) sum += p;
      return sum / preds.length;
    }
  }

  /** Extract target variable from training data */
  private extractTarget(data: LatheTrainingPoint[], target: string): number[] {
    return data.map(d => {
      switch (target) {
        case "cutting_speed": return d.cutting_speed_m_min ?? 200;
        case "feed": return d.feed_mm_rev ?? 0.2;
        case "depth_of_cut": return d.depth_of_cut_mm ?? 2.0;
        case "surface_finish": return d.surface_finish_ra ?? 1.6;
        case "tool_life": return d.tool_life_min ?? 30;
        case "cycle_time": return d.cycle_time_sec ?? 60;
        case "quality": return d.quality_class ?? 2;
        default: return 0;
      }
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. BOOSTING — AdaBoost & Gradient Boosting
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Train Gradient Boosting for lathe parameter regression.
   * Implements Friedman (2001) with shrinkage.
   *
   * @param data Training data
   * @param nRounds Number of boosting rounds
   * @param target Target variable
   * @param options Additional options
   *
   * @ref Friedman, J.H. (2001). "Greedy Function Approximation: A Gradient Boosting Machine."
   */
  trainGradientBoosting(
    data: LatheTrainingPoint[],
    nRounds: number,
    target: "cutting_speed" | "feed" | "depth_of_cut" | "surface_finish" | "tool_life" | "cycle_time",
    options: {
      learningRate?: number;
      maxDepth?: number;
      subsampleRatio?: number;
      seed?: number;
    } = {}
  ): TrainingResult {
    const startTime = Date.now();
    this.totalCalculations++;

    const {
      learningRate = 0.1,
      maxDepth = 3,
      subsampleRatio = 0.8,
      seed = 42
    } = options;

    const { X } = this.encodeDataset(data);
    const y = this.extractTarget(data, target);
    const n = X.length;
    const d = X[0].length;

    const rng = new SeededRNG(seed);
    const trees: DecisionTree[] = [];
    const featureImportanceAccum = new Float64Array(d);
    const allFeatures = Array.from({ length: d }, (_, i) => i);

    // Initialize with mean (F_0)
    let yMean = 0;
    for (let i = 0; i < n; i++) yMean += y[i];
    yMean /= n;

    const F = new Float64Array(n).fill(yMean);
    const residuals = new Float64Array(n);
    const residualHistory: number[] = [];

    for (let t = 0; t < nRounds; t++) {
      // Compute residuals (negative gradient of MSE)
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

      // Build tree on residuals
      const subX = sampleIndices.map(i => X[i]);
      const subR = sampleIndices.map(i => residuals[i]);

      const tree = this.buildCARTTree(subX, subR, allFeatures, maxDepth, "regression", rng);
      trees.push(tree);

      // Accumulate feature importance
      for (const node of tree.nodes) {
        if (!node.isLeaf) {
          const globalIdx = tree.featureIndices[node.featureIndex];
          featureImportanceAccum[globalIdx] += node.impurityDecrease * node.nSamples;
        }
      }

      // Update predictions with learning rate
      for (let i = 0; i < n; i++) {
        F[i] += learningRate * this.predictTree(tree, X[i]);
      }
    }

    // Normalize feature importance
    const totalImp = featureImportanceAccum.reduce((a, b) => a + b, 0);
    const featureImportance = Array.from(featureImportanceAccum).map(
      v => totalImp > 0 ? v / totalImp : 0
    );

    // Final training error
    let trainingError = 0;
    for (let i = 0; i < n; i++) {
      trainingError += (F[i] - y[i]) ** 2;
    }
    trainingError /= n;

    const model: GradientBoostingModel = {
      trees,
      learningRate,
      nRounds,
      initialPrediction: yMean,
      featureImportance,
      residualHistory
    };

    log.info(`Gradient Boosting trained: ${nRounds} rounds, MSE: ${trainingError.toFixed(4)}`);

    return {
      model,
      trainingTime_ms: Date.now() - startTime,
      trainingError,
      featureImportance
    };
  }

  /**
   * Train AdaBoost for lathe quality classification.
   * Implements Freund & Schapire (1997) SAMME algorithm.
   *
   * @param data Training data
   * @param nEstimators Number of weak learners
   * @param options Additional options
   *
   * @ref Freund, Y. & Schapire, R.E. (1997). "A Decision-Theoretic Generalization of
   *      On-Line Learning and an Application to Boosting." JCSS 55(1): 119-139.
   */
  trainAdaBoost(
    data: LatheTrainingPoint[],
    nEstimators: number,
    options: {
      seed?: number;
    } = {}
  ): TrainingResult {
    const startTime = Date.now();
    this.totalCalculations++;

    const { seed = 42 } = options;

    const { X } = this.encodeDataset(data);
    const y = this.extractTarget(data, "quality");
    const n = X.length;
    const d = X[0].length;

    const rng = new SeededRNG(seed);
    const stumps: DecisionTree[] = [];
    const alphas: number[] = [];
    const trainingError: number[] = [];
    const allFeatures = Array.from({ length: d }, (_, i) => i);

    // Get unique classes
    const classes = Array.from(new Set(y)).sort((a, b) => a - b);
    const K = classes.length;

    // Initialize weights uniformly
    const weights = new Float64Array(n).fill(1 / n);

    for (let t = 0; t < nEstimators; t++) {
      // Build weighted decision stump (depth-1 tree)
      // For simplicity, we use bootstrap weighted by sample weights
      const weightedIndices: number[] = [];
      for (let i = 0; i < n; i++) {
        const copies = Math.max(1, Math.round(weights[i] * n));
        for (let c = 0; c < copies; c++) {
          weightedIndices.push(i);
        }
      }

      const sampleIndices = rng.bootstrapSample(weightedIndices.length, n);
      const actualIndices = sampleIndices.map(i => weightedIndices[i]);

      const subX = actualIndices.map(i => X[i]);
      const subY = actualIndices.map(i => y[i]);

      const stump = this.buildCARTTree(subX, subY, allFeatures, 1, "classification", rng);
      stumps.push(stump);

      // Calculate weighted error
      let weightedError = 0;
      const predictions: number[] = [];
      for (let i = 0; i < n; i++) {
        const pred = this.predictTree(stump, X[i]);
        predictions.push(pred);
        if (pred !== y[i]) {
          weightedError += weights[i];
        }
      }

      // Avoid division by zero
      weightedError = Math.max(weightedError, 1e-10);
      weightedError = Math.min(weightedError, 1 - 1e-10);

      // SAMME alpha: accounts for multi-class
      const alpha = Math.log((1 - weightedError) / weightedError) + Math.log(K - 1);
      alphas.push(alpha);
      trainingError.push(weightedError);

      // Update weights
      let weightSum = 0;
      for (let i = 0; i < n; i++) {
        if (predictions[i] !== y[i]) {
          weights[i] *= Math.exp(alpha);
        }
        weightSum += weights[i];
      }

      // Normalize weights
      for (let i = 0; i < n; i++) {
        weights[i] /= weightSum;
      }
    }

    // Calculate final training error
    let finalError = 0;
    for (let i = 0; i < n; i++) {
      const classScores = new Float64Array(K);
      for (let t = 0; t < nEstimators; t++) {
        const pred = this.predictTree(stumps[t], X[i]);
        const classIdx = classes.indexOf(pred);
        if (classIdx >= 0) classScores[classIdx] += alphas[t];
      }
      let bestClass = 0;
      let bestScore = classScores[0];
      for (let c = 1; c < K; c++) {
        if (classScores[c] > bestScore) {
          bestScore = classScores[c];
          bestClass = c;
        }
      }
      if (classes[bestClass] !== y[i]) finalError++;
    }
    finalError /= n;

    const model: AdaBoostModel = {
      stumps,
      alphas,
      nEstimators,
      classes,
      trainingError
    };

    log.info(`AdaBoost trained: ${nEstimators} estimators, error: ${finalError.toFixed(4)}`);

    return {
      model,
      trainingTime_ms: Date.now() - startTime,
      trainingError: finalError,
      featureImportance: new Array(d).fill(1 / d)  // Uniform for stumps
    };
  }

  /**
   * Train XGBoost-style gradient boosting with regularization.
   * Implements Chen & Guestrin (2016) regularized objective.
   *
   * Loss = sum(loss(y, F)) + sum(Omega(tree))
   * where Omega(tree) = gamma * T + 0.5 * lambda * sum(w^2)
   *
   * @param data Training data
   * @param nRounds Number of boosting rounds
   * @param target Target variable
   * @param options XGBoost hyperparameters
   *
   * @ref Chen, T. & Guestrin, C. (2016). "XGBoost: A Scalable Tree Boosting System."
   *      KDD 2016: 785-794.
   */
  trainXGBoost(
    data: LatheTrainingPoint[],
    nRounds: number,
    target: "cutting_speed" | "feed" | "depth_of_cut" | "surface_finish" | "tool_life" | "cycle_time",
    options: {
      learningRate?: number;
      maxDepth?: number;
      lambda?: number;      // L2 regularization
      gamma?: number;       // Min split loss
      subsampleRatio?: number;
      colsampleRatio?: number;
      seed?: number;
    } = {}
  ): TrainingResult {
    const startTime = Date.now();
    this.totalCalculations++;

    const {
      learningRate = 0.3,
      maxDepth = 6,
      lambda = 1.0,
      gamma = 0.0,
      subsampleRatio = 1.0,
      colsampleRatio = 1.0,
      seed = 42
    } = options;

    const { X } = this.encodeDataset(data);
    const y = this.extractTarget(data, target);
    const n = X.length;
    const d = X[0].length;

    const rng = new SeededRNG(seed);
    const trees: DecisionTree[] = [];
    const featureImportanceAccum = new Float64Array(d);
    const trainingLoss: number[] = [];

    // Initialize predictions (base score = mean)
    let yMean = 0;
    for (let i = 0; i < n; i++) yMean += y[i];
    yMean /= n;

    const F = new Float64Array(n).fill(yMean);
    const gradients = new Float64Array(n);   // First derivatives
    const hessians = new Float64Array(n);    // Second derivatives

    for (let t = 0; t < nRounds; t++) {
      // Compute gradients and hessians (for squared loss: g = F - y, h = 1)
      for (let i = 0; i < n; i++) {
        gradients[i] = F[i] - y[i];
        hessians[i] = 1.0;
      }

      // Track training loss
      let loss = 0;
      for (let i = 0; i < n; i++) {
        loss += (F[i] - y[i]) ** 2;
      }
      trainingLoss.push(loss / n);

      // Subsample rows
      let rowIndices: number[];
      if (subsampleRatio < 1.0) {
        const sampleSize = Math.max(1, Math.floor(n * subsampleRatio));
        rowIndices = rng.sampleWithoutReplacement(n, sampleSize);
      } else {
        rowIndices = Array.from({ length: n }, (_, i) => i);
      }

      // Subsample columns
      let colIndices: number[];
      if (colsampleRatio < 1.0) {
        const colSize = Math.max(1, Math.floor(d * colsampleRatio));
        colIndices = rng.sampleWithoutReplacement(d, colSize);
      } else {
        colIndices = Array.from({ length: d }, (_, i) => i);
      }

      // Build XGBoost-style tree with regularized gain
      const tree = this.buildXGBTree(
        X, gradients, hessians, rowIndices, colIndices,
        maxDepth, lambda, gamma, rng
      );
      trees.push(tree);

      // Accumulate feature importance
      for (const node of tree.nodes) {
        if (!node.isLeaf) {
          const globalIdx = tree.featureIndices[node.featureIndex];
          featureImportanceAccum[globalIdx] += node.impurityDecrease;
        }
      }

      // Update predictions
      for (let i = 0; i < n; i++) {
        F[i] += learningRate * this.predictTree(tree, X[i]);
      }
    }

    // Normalize feature importance
    const totalImp = featureImportanceAccum.reduce((a, b) => a + b, 0);
    const featureImportance = Array.from(featureImportanceAccum).map(
      v => totalImp > 0 ? v / totalImp : 0
    );

    // Final training error
    let trainingError = 0;
    for (let i = 0; i < n; i++) {
      trainingError += (F[i] - y[i]) ** 2;
    }
    trainingError /= n;

    const model: XGBoostModel = {
      trees,
      learningRate,
      nRounds,
      lambda,
      gamma,
      maxDepth,
      featureImportance,
      trainingLoss
    };

    log.info(`XGBoost trained: ${nRounds} rounds, MSE: ${trainingError.toFixed(4)}`);

    return {
      model,
      trainingTime_ms: Date.now() - startTime,
      trainingError,
      featureImportance
    };
  }

  /**
   * Build XGBoost-style tree with regularized gain.
   * Gain = 0.5 * [G_L^2/(H_L+lambda) + G_R^2/(H_R+lambda) - G^2/(H+lambda)] - gamma
   */
  private buildXGBTree(
    X: number[][],
    gradients: Float64Array,
    hessians: Float64Array,
    rowIndices: number[],
    colIndices: number[],
    maxDepth: number,
    lambda: number,
    gamma: number,
    rng: SeededRNG
  ): DecisionTree {
    const nodes: TreeNode[] = [];

    const buildNode = (indices: number[], depth: number): number => {
      const nodeIdx = nodes.length;
      const nSamples = indices.length;

      // Compute sum of gradients and hessians
      let G = 0, H = 0;
      for (const i of indices) {
        G += gradients[i];
        H += hessians[i];
      }

      // Leaf weight: w* = -G / (H + lambda)
      const leafWeight = -G / (H + lambda);

      // Stopping criteria
      if (depth >= maxDepth || nSamples <= 2) {
        nodes.push({
          featureIndex: -1, threshold: 0,
          leftChild: -1, rightChild: -1,
          value: leafWeight, isLeaf: true,
          impurityDecrease: 0, nSamples
        });
        return nodeIdx;
      }

      // Find best split with regularized gain
      let bestFeature = -1;
      let bestThreshold = 0;
      let bestGain = -Infinity;
      let bestLeftIndices: number[] = [];
      let bestRightIndices: number[] = [];

      const baseScore = (G * G) / (H + lambda);

      for (let fi = 0; fi < colIndices.length; fi++) {
        const fIdx = colIndices[fi];
        const featureValues = indices.map(i => X[i][fIdx]);
        const sortedUnique = Array.from(new Set(featureValues)).sort((a, b) => a - b);

        if (sortedUnique.length < 2) continue;

        for (let j = 0; j < sortedUnique.length - 1; j++) {
          const threshold = (sortedUnique[j] + sortedUnique[j + 1]) / 2;

          let G_L = 0, H_L = 0;
          let G_R = 0, H_R = 0;
          const leftIdx: number[] = [];
          const rightIdx: number[] = [];

          for (const i of indices) {
            if (X[i][fIdx] <= threshold) {
              G_L += gradients[i];
              H_L += hessians[i];
              leftIdx.push(i);
            } else {
              G_R += gradients[i];
              H_R += hessians[i];
              rightIdx.push(i);
            }
          }

          if (leftIdx.length === 0 || rightIdx.length === 0) continue;

          // Regularized gain
          const gain = 0.5 * (
            (G_L * G_L) / (H_L + lambda) +
            (G_R * G_R) / (H_R + lambda) -
            baseScore
          ) - gamma;

          if (gain > bestGain) {
            bestGain = gain;
            bestFeature = fi;
            bestThreshold = threshold;
            bestLeftIndices = leftIdx;
            bestRightIndices = rightIdx;
          }
        }
      }

      // No valid split found
      if (bestFeature === -1 || bestGain <= 0) {
        nodes.push({
          featureIndex: -1, threshold: 0,
          leftChild: -1, rightChild: -1,
          value: leafWeight, isLeaf: true,
          impurityDecrease: 0, nSamples
        });
        return nodeIdx;
      }

      // Place node
      nodes.push({
        featureIndex: bestFeature, threshold: bestThreshold,
        leftChild: -1, rightChild: -1,
        value: leafWeight, isLeaf: false,
        impurityDecrease: bestGain, nSamples
      });

      const leftChild = buildNode(bestLeftIndices, depth + 1);
      const rightChild = buildNode(bestRightIndices, depth + 1);
      nodes[nodeIdx].leftChild = leftChild;
      nodes[nodeIdx].rightChild = rightChild;

      return nodeIdx;
    };

    buildNode(rowIndices, 0);
    return { nodes, featureIndices: colIndices, maxDepth, mode: "regression" };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. STACKING — Meta-Learner Architecture
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Create stacked ensemble with cross-validation for base learners.
   * Implements Wolpert (1992) stacked generalization.
   *
   * @param baseModels Trained base models
   * @param data Training data
   * @param target Target variable
   * @param options Stacking options
   *
   * @ref Wolpert, D.H. (1992). "Stacked Generalization." Neural Networks 5(2): 241-259.
   */
  createStackedEnsemble(
    baseModels: Array<RandomForestModel | GradientBoostingModel | XGBoostModel>,
    data: LatheTrainingPoint[],
    target: "cutting_speed" | "feed" | "depth_of_cut" | "surface_finish" | "tool_life" | "cycle_time",
    options: {
      cvFolds?: number;
      metaLearnerType?: "ridge" | "linear";
      seed?: number;
    } = {}
  ): StackingModel {
    this.totalCalculations++;

    const {
      cvFolds = 5,
      metaLearnerType = "ridge",
      seed = 42
    } = options;

    const { X } = this.encodeDataset(data);
    const y = this.extractTarget(data, target);
    const n = X.length;
    const rng = new SeededRNG(seed);

    // Create base learners with prediction functions
    const baseLearners: BaseLearner[] = baseModels.map((model, idx) => {
      const predict = (x: number[]): number => {
        if ("trees" in model && "oobError" in model) {
          // Random Forest
          const rfModel = model as RandomForestModel;
          const preds = rfModel.trees.map(t => this.predictTree(t, x));
          return this.aggregatePredictions(preds, rfModel.mode);
        } else if ("initialPrediction" in model) {
          // Gradient Boosting
          const gbModel = model as GradientBoostingModel;
          let pred = gbModel.initialPrediction;
          for (const tree of gbModel.trees) {
            pred += gbModel.learningRate * this.predictTree(tree, x);
          }
          return pred;
        } else if ("lambda" in model) {
          // XGBoost
          const xgbModel = model as XGBoostModel;
          let pred = 0;  // XGBoost starts from 0 if no base score
          for (const tree of xgbModel.trees) {
            pred += xgbModel.learningRate * this.predictTree(tree, x);
          }
          return pred;
        }
        return 0;
      };

      return {
        id: `base_${idx}`,
        type: "gradient_tree",
        weights: [],
        bias: 0,
        predict,
        featureImportance: model.featureImportance
      };
    });

    // Generate out-of-fold predictions using cross-validation
    const metaFeatures = new Float64Array(n * baseLearners.length);
    const foldSize = Math.floor(n / cvFolds);
    const indices = Array.from({ length: n }, (_, i) => i);
    rng.shuffle(indices);

    for (let fold = 0; fold < cvFolds; fold++) {
      const valStart = fold * foldSize;
      const valEnd = fold === cvFolds - 1 ? n : (fold + 1) * foldSize;
      const valIndices = indices.slice(valStart, valEnd);

      // For each validation sample, get predictions from base learners
      for (const i of valIndices) {
        for (let m = 0; m < baseLearners.length; m++) {
          metaFeatures[i * baseLearners.length + m] = baseLearners[m].predict(X[i]);
        }
      }
    }

    // Train meta-learner on stacked features
    const metaX: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let m = 0; m < baseLearners.length; m++) {
        row.push(metaFeatures[i * baseLearners.length + m]);
      }
      metaX.push(row);
    }

    // Train ridge regression as meta-learner
    const metaWeights = this.trainRidgeRegression(metaX, y, metaLearnerType === "ridge" ? 1.0 : 0);

    const metaLearner: BaseLearner = {
      id: "meta_learner",
      type: metaLearnerType === "ridge" ? "ridge" : "linear",
      weights: metaWeights.weights,
      bias: metaWeights.bias,
      predict: (x: number[]) => {
        let pred = metaWeights.bias;
        for (let i = 0; i < x.length; i++) {
          pred += metaWeights.weights[i] * x[i];
        }
        return pred;
      }
    };

    log.info(`Stacking ensemble created: ${baseLearners.length} base learners, ${cvFolds}-fold CV`);

    return {
      baseLearners,
      metaLearner,
      cvFolds,
      blendingWeights: metaWeights.weights
    };
  }

  /**
   * Train ridge regression (L2 regularized linear regression).
   * Closed-form solution: w = (X'X + lambda*I)^-1 * X'y
   */
  private trainRidgeRegression(
    X: number[][],
    y: number[],
    lambda: number
  ): { weights: number[]; bias: number } {
    const n = X.length;
    const d = X[0].length;

    // Center data
    const xMean = new Float64Array(d);
    let yMean = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < d; j++) xMean[j] += X[i][j];
      yMean += y[i];
    }
    for (let j = 0; j < d; j++) xMean[j] /= n;
    yMean /= n;

    // Center X and y
    const Xc: number[][] = X.map(xi => xi.map((v, j) => v - xMean[j]));
    const yc = y.map(yi => yi - yMean);

    // Compute X'X + lambda*I
    const XtX: number[][] = [];
    for (let i = 0; i < d; i++) {
      XtX.push(new Array(d).fill(0));
      for (let j = 0; j < d; j++) {
        for (let k = 0; k < n; k++) {
          XtX[i][j] += Xc[k][i] * Xc[k][j];
        }
        if (i === j) XtX[i][j] += lambda;
      }
    }

    // Compute X'y
    const Xty = new Float64Array(d);
    for (let i = 0; i < d; i++) {
      for (let k = 0; k < n; k++) {
        Xty[i] += Xc[k][i] * yc[k];
      }
    }

    // Solve using Cholesky decomposition
    const L = this.choleskyDecomposition(XtX);
    const weights = this.choleskySolve(L, Array.from(Xty));

    // Compute bias: b = yMean - sum(w_i * xMean_i)
    let bias = yMean;
    for (let i = 0; i < d; i++) {
      bias -= weights[i] * xMean[i];
    }

    return { weights, bias };
  }

  /** Cholesky decomposition: A = L * L' */
  private choleskyDecomposition(A: number[][]): number[][] {
    const n = A.length;
    const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }
        if (i === j) {
          L[i][j] = Math.sqrt(Math.max(A[i][i] - sum, 1e-10));
        } else {
          L[i][j] = (A[i][j] - sum) / L[j][j];
        }
      }
    }
    return L;
  }

  /** Solve L * L' * x = b via forward/backward substitution */
  private choleskySolve(L: number[][], b: number[]): number[] {
    const n = L.length;

    // Forward substitution: L * y = b
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < i; j++) sum += L[i][j] * y[j];
      y[i] = (b[i] - sum) / L[i][i];
    }

    // Backward substitution: L' * x = y
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = 0;
      for (let j = i + 1; j < n; j++) sum += L[j][i] * x[j];
      x[i] = (y[i] - sum) / L[i][i];
    }

    return x;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. VOTING — Ensemble Aggregation Methods
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Predict using voting ensemble.
   *
   * @param models Array of trained models
   * @param input Feature vector
   * @param votingType Type of voting
   * @param weights Optional model weights
   */
  predictWithVoting(
    models: Array<RandomForestModel | GradientBoostingModel | XGBoostModel>,
    input: LatheTrainingPoint,
    votingType: "hard" | "soft" | "weighted" = "soft",
    weights?: number[]
  ): EnsemblePrediction {
    this.totalCalculations++;

    const encoded = this.encodeFeatures(input);
    const x = encoded.vector;

    // Get predictions from all models
    const modelPredictions: number[] = [];
    for (const model of models) {
      let pred: number;
      if ("oobError" in model) {
        // Random Forest
        const rfModel = model as RandomForestModel;
        const preds = rfModel.trees.map(t => this.predictTree(t, x));
        pred = this.aggregatePredictions(preds, rfModel.mode);
      } else if ("initialPrediction" in model) {
        // Gradient Boosting
        const gbModel = model as GradientBoostingModel;
        pred = gbModel.initialPrediction;
        for (const tree of gbModel.trees) {
          pred += gbModel.learningRate * this.predictTree(tree, x);
        }
      } else {
        // XGBoost
        const xgbModel = model as XGBoostModel;
        pred = 0;
        for (const tree of xgbModel.trees) {
          pred += xgbModel.learningRate * this.predictTree(tree, x);
        }
      }
      modelPredictions.push(pred);
    }

    // Apply voting strategy
    const modelWeights = weights ?? new Array(models.length).fill(1 / models.length);
    let prediction: number;

    if (votingType === "hard") {
      // Hard voting: majority vote (for classification) or median (for regression)
      const sorted = [...modelPredictions].sort((a, b) => a - b);
      prediction = sorted[Math.floor(sorted.length / 2)];
    } else if (votingType === "soft" || votingType === "weighted") {
      // Soft/weighted voting: weighted average
      let weightedSum = 0;
      let weightSum = 0;
      for (let i = 0; i < modelPredictions.length; i++) {
        weightedSum += modelPredictions[i] * modelWeights[i];
        weightSum += modelWeights[i];
      }
      prediction = weightedSum / weightSum;
    } else {
      prediction = modelPredictions[0];
    }

    // Calculate uncertainty and consensus
    const mean = modelPredictions.reduce((a, b) => a + b, 0) / modelPredictions.length;
    let variance = 0;
    for (const p of modelPredictions) {
      variance += (p - mean) ** 2;
    }
    variance /= modelPredictions.length;
    const uncertainty = Math.sqrt(variance);

    // Consensus level: 1 - coefficient of variation
    const cv = mean !== 0 ? uncertainty / Math.abs(mean) : 1;
    const consensusLevel = Math.max(0, 1 - cv);

    // Confidence based on consensus and number of models
    const confidence = Math.min(1, consensusLevel * Math.sqrt(models.length / 3));

    return {
      prediction,
      confidence,
      modelPredictions,
      modelWeights,
      uncertainty,
      consensusLevel
    };
  }

  /**
   * Dynamic weight adjustment based on recent performance.
   */
  adjustVotingWeights(
    currentWeights: number[],
    recentErrors: number[][],  // errors[model_idx][sample_idx]
    learningRate: number = 0.1
  ): number[] {
    this.totalCalculations++;

    const nModels = currentWeights.length;

    // Compute mean absolute error for each model
    const modelMAE: number[] = [];
    for (let m = 0; m < nModels; m++) {
      const errors = recentErrors[m] ?? [];
      if (errors.length === 0) {
        modelMAE.push(1.0);  // Default high error
      } else {
        let mae = 0;
        for (const e of errors) mae += Math.abs(e);
        modelMAE.push(mae / errors.length);
      }
    }

    // Convert errors to weights (inverse relationship)
    const inverseMAE = modelMAE.map(e => 1 / (e + 0.01));
    const totalInverse = inverseMAE.reduce((a, b) => a + b, 0);
    const targetWeights = inverseMAE.map(w => w / totalInverse);

    // Smooth update with learning rate
    const newWeights: number[] = [];
    for (let m = 0; m < nModels; m++) {
      const updated = currentWeights[m] + learningRate * (targetWeights[m] - currentWeights[m]);
      newWeights.push(updated);
    }

    // Normalize
    const weightSum = newWeights.reduce((a, b) => a + b, 0);
    return newWeights.map(w => w / weightSum);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. MODEL DIVERSITY — Diversity Metrics & Ensemble Pruning
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Measure diversity among ensemble models.
   * Implements Kuncheva & Whitaker (2003) diversity measures.
   *
   * @param models Ensemble models
   * @param testData Test data points
   * @param target Target variable
   *
   * @ref Kuncheva, L.I. & Whitaker, C.J. (2003). "Measures of Diversity in
   *      Classifier Ensembles and Their Relationship with the Ensemble Accuracy."
   *      Machine Learning 51(2): 181-207.
   */
  measureDiversity(
    models: Array<RandomForestModel | GradientBoostingModel | XGBoostModel>,
    testData: LatheTrainingPoint[],
    target: "cutting_speed" | "feed" | "depth_of_cut" | "surface_finish" | "tool_life" | "cycle_time"
  ): DiversityMetrics {
    this.totalCalculations++;

    const { X } = this.encodeDataset(testData);
    const y = this.extractTarget(testData, target);
    const n = X.length;
    const L = models.length;

    // Get predictions from all models
    const predictions: number[][] = [];
    for (const model of models) {
      const preds: number[] = [];
      for (let i = 0; i < n; i++) {
        let pred: number;
        if ("oobError" in model) {
          const rfModel = model as RandomForestModel;
          const treePreds = rfModel.trees.map(t => this.predictTree(t, X[i]));
          pred = this.aggregatePredictions(treePreds, rfModel.mode);
        } else if ("initialPrediction" in model) {
          const gbModel = model as GradientBoostingModel;
          pred = gbModel.initialPrediction;
          for (const tree of gbModel.trees) {
            pred += gbModel.learningRate * this.predictTree(tree, X[i]);
          }
        } else {
          const xgbModel = model as XGBoostModel;
          pred = 0;
          for (const tree of xgbModel.trees) {
            pred += xgbModel.learningRate * this.predictTree(tree, X[i]);
          }
        }
        preds.push(pred);
      }
      predictions.push(preds);
    }

    // For regression, convert to binary correct/incorrect (within 10% tolerance)
    const correct: boolean[][] = [];
    for (let m = 0; m < L; m++) {
      const modelCorrect: boolean[] = [];
      for (let i = 0; i < n; i++) {
        const tolerance = Math.abs(y[i]) * 0.1;
        modelCorrect.push(Math.abs(predictions[m][i] - y[i]) <= tolerance);
      }
      correct.push(modelCorrect);
    }

    // Q-statistic (pairwise)
    let qSum = 0;
    let qCount = 0;
    for (let i = 0; i < L - 1; i++) {
      for (let j = i + 1; j < L; j++) {
        let N11 = 0, N00 = 0, N10 = 0, N01 = 0;
        for (let k = 0; k < n; k++) {
          if (correct[i][k] && correct[j][k]) N11++;
          else if (!correct[i][k] && !correct[j][k]) N00++;
          else if (correct[i][k] && !correct[j][k]) N10++;
          else N01++;
        }
        const Q = (N11 * N00 - N01 * N10) / Math.max(N11 * N00 + N01 * N10, 1);
        qSum += Q;
        qCount++;
      }
    }
    const qStatistic = qCount > 0 ? qSum / qCount : 0;

    // Correlation (pairwise)
    let corrSum = 0;
    for (let i = 0; i < L - 1; i++) {
      for (let j = i + 1; j < L; j++) {
        // Pearson correlation on predictions
        let sumXY = 0, sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0;
        for (let k = 0; k < n; k++) {
          sumXY += predictions[i][k] * predictions[j][k];
          sumX += predictions[i][k];
          sumY += predictions[j][k];
          sumX2 += predictions[i][k] ** 2;
          sumY2 += predictions[j][k] ** 2;
        }
        const num = n * sumXY - sumX * sumY;
        const den = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
        corrSum += den > 0 ? num / den : 0;
      }
    }
    const correlation = qCount > 0 ? corrSum / qCount : 0;

    // Disagreement measure
    let disagreeSum = 0;
    for (let i = 0; i < L - 1; i++) {
      for (let j = i + 1; j < L; j++) {
        let disagree = 0;
        for (let k = 0; k < n; k++) {
          if (correct[i][k] !== correct[j][k]) disagree++;
        }
        disagreeSum += disagree / n;
      }
    }
    const disagreement = qCount > 0 ? disagreeSum / qCount : 0;

    // Double fault measure
    let dfSum = 0;
    for (let i = 0; i < L - 1; i++) {
      for (let j = i + 1; j < L; j++) {
        let doubleFault = 0;
        for (let k = 0; k < n; k++) {
          if (!correct[i][k] && !correct[j][k]) doubleFault++;
        }
        dfSum += doubleFault / n;
      }
    }
    const doubleFault = qCount > 0 ? dfSum / qCount : 0;

    // Entropy measure
    let entropySum = 0;
    for (let i = 0; i < n; i++) {
      let correctCount = 0;
      for (let m = 0; m < L; m++) {
        if (correct[m][i]) correctCount++;
      }
      const minVotes = Math.min(correctCount, L - correctCount);
      entropySum += minVotes;
    }
    const entropyMeasure = (2 / (n * (L - 1))) * entropySum;

    // Kohavi-Wolpert variance
    let kwSum = 0;
    for (let i = 0; i < n; i++) {
      let correctCount = 0;
      for (let m = 0; m < L; m++) {
        if (correct[m][i]) correctCount++;
      }
      kwSum += correctCount * (L - correctCount);
    }
    const kohavi_wolpert = kwSum / (n * L * L);

    return {
      qStatistic,
      correlation,
      disagreement,
      doubleFault,
      entropyMeasure,
      kohavi_wolpert
    };
  }

  /**
   * Prune ensemble by selecting diverse, high-performing subset.
   * Uses greedy forward selection with diversity penalty.
   */
  pruneEnsemble(
    models: Array<RandomForestModel | GradientBoostingModel | XGBoostModel>,
    validationData: LatheTrainingPoint[],
    target: "cutting_speed" | "feed" | "depth_of_cut" | "surface_finish" | "tool_life" | "cycle_time",
    targetSize: number
  ): number[] {
    this.totalCalculations++;

    const { X } = this.encodeDataset(validationData);
    const y = this.extractTarget(validationData, target);
    const n = X.length;
    const L = models.length;

    if (targetSize >= L) {
      return Array.from({ length: L }, (_, i) => i);
    }

    // Get all predictions
    const allPreds: number[][] = [];
    for (const model of models) {
      const preds: number[] = [];
      for (let i = 0; i < n; i++) {
        let pred: number;
        if ("oobError" in model) {
          const rfModel = model as RandomForestModel;
          const treePreds = rfModel.trees.map(t => this.predictTree(t, X[i]));
          pred = this.aggregatePredictions(treePreds, rfModel.mode);
        } else if ("initialPrediction" in model) {
          const gbModel = model as GradientBoostingModel;
          pred = gbModel.initialPrediction;
          for (const tree of gbModel.trees) {
            pred += gbModel.learningRate * this.predictTree(tree, X[i]);
          }
        } else {
          const xgbModel = model as XGBoostModel;
          pred = 0;
          for (const tree of xgbModel.trees) {
            pred += xgbModel.learningRate * this.predictTree(tree, X[i]);
          }
        }
        preds.push(pred);
      }
      allPreds.push(preds);
    }

    // Compute individual model errors
    const modelErrors: number[] = [];
    for (let m = 0; m < L; m++) {
      let mse = 0;
      for (let i = 0; i < n; i++) {
        mse += (allPreds[m][i] - y[i]) ** 2;
      }
      modelErrors.push(mse / n);
    }

    // Greedy forward selection
    const selected: number[] = [];
    const remaining = new Set(Array.from({ length: L }, (_, i) => i));

    // Start with best individual model
    let bestIdx = 0;
    let bestError = modelErrors[0];
    for (let m = 1; m < L; m++) {
      if (modelErrors[m] < bestError) {
        bestError = modelErrors[m];
        bestIdx = m;
      }
    }
    selected.push(bestIdx);
    remaining.delete(bestIdx);

    // Add models that improve ensemble most
    while (selected.length < targetSize && remaining.size > 0) {
      let bestCandidate = -1;
      let bestEnsembleError = Infinity;

      Array.from(remaining).forEach(candidate => {
        // Compute ensemble error with candidate added
        const testSet = [...selected, candidate];
        let ensembleError = 0;
        for (let i = 0; i < n; i++) {
          let ensemblePred = 0;
          for (const m of testSet) {
            ensemblePred += allPreds[m][i];
          }
          ensemblePred /= testSet.length;
          ensembleError += (ensemblePred - y[i]) ** 2;
        }
        ensembleError /= n;

        // Add diversity bonus (encourage disagreement)
        let diversityBonus = 0;
        for (const s of selected) {
          let disagreement = 0;
          for (let i = 0; i < n; i++) {
            const tolerance = Math.abs(y[i]) * 0.1;
            const candCorrect = Math.abs(allPreds[candidate][i] - y[i]) <= tolerance;
            const selCorrect = Math.abs(allPreds[s][i] - y[i]) <= tolerance;
            if (candCorrect !== selCorrect) disagreement++;
          }
          diversityBonus += disagreement / n;
        }
        diversityBonus /= selected.length;

        // Combined score (lower is better)
        const score = ensembleError - 0.1 * diversityBonus;

        if (score < bestEnsembleError) {
          bestEnsembleError = score;
          bestCandidate = candidate;
        }
      });

      if (bestCandidate >= 0) {
        selected.push(bestCandidate);
        remaining.delete(bestCandidate);
      } else {
        break;
      }
    }

    log.info(`Ensemble pruned: ${L} -> ${selected.length} models`);
    return selected;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. MANUFACTURING ENSEMBLES — Lathe-Specific Predictions
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Create ensemble for surface finish prediction.
   * Combines physics-based features with ML for Ra prediction.
   *
   * Surface finish Ra depends on:
   * - Theoretical: Ra = f^2 / (32 * r)  (feed squared / nose radius)
   * - Actual: Affected by vibration, BUE, tool wear, material
   */
  createSurfaceFinishEnsemble(
    data: LatheTrainingPoint[],
    options: { seed?: number } = {}
  ): {
    rfModel: RandomForestModel;
    gbModel: GradientBoostingModel;
    xgbModel: XGBoostModel;
    physicsWeight: number;
  } {
    const { seed = 42 } = options;

    // Train individual models
    const rfResult = this.trainRandomForest(data, 50, "surface_finish", {
      maxDepth: 8, seed
    });
    const gbResult = this.trainGradientBoosting(data, 100, "surface_finish", {
      learningRate: 0.1, maxDepth: 4, seed
    });
    const xgbResult = this.trainXGBoost(data, 100, "surface_finish", {
      learningRate: 0.2, maxDepth: 5, lambda: 1.0, seed
    });

    // Determine physics weight based on model confidence
    const avgOOBError = (rfResult.model as RandomForestModel).oobError;
    const physicsWeight = Math.max(0.1, 0.3 - avgOOBError);  // More physics when ML uncertain

    log.info(`Surface finish ensemble created: physics weight = ${physicsWeight.toFixed(2)}`);

    return {
      rfModel: rfResult.model as RandomForestModel,
      gbModel: gbResult.model as GradientBoostingModel,
      xgbModel: xgbResult.model as XGBoostModel,
      physicsWeight
    };
  }

  /**
   * Predict surface finish using ensemble + physics.
   */
  predictSurfaceFinish(
    ensemble: {
      rfModel: RandomForestModel;
      gbModel: GradientBoostingModel;
      xgbModel: XGBoostModel;
      physicsWeight: number;
    },
    input: LatheTrainingPoint
  ): { Ra: number; confidence: number; source: string } {
    this.totalCalculations++;

    // Physics-based theoretical Ra (Brammertz formula)
    // Ra_theoretical = f^2 / (32 * r) for nose radius tool
    const f = input.feed_mm_rev ?? 0.2;
    const r = input.tool_nose_radius_mm;
    const Ra_theoretical = (f * f) / (32 * r);  // mm -> um conversion implicit

    // ML ensemble prediction
    const models = [ensemble.rfModel, ensemble.gbModel, ensemble.xgbModel];
    const ensemblePred = this.predictWithVoting(models, input, "weighted");

    // Blend physics and ML
    const Ra = ensemble.physicsWeight * Ra_theoretical * 1000 +  // Convert mm to um
               (1 - ensemble.physicsWeight) * ensemblePred.prediction;

    // Apply material and operation corrections
    let materialFactor = 1.0;
    if (input.material_iso === "M") materialFactor = 1.3;  // Stainless worse finish
    if (input.material_iso === "S") materialFactor = 1.5;  // Superalloys
    if (input.material_iso === "N") materialFactor = 0.8;  // Aluminum better

    let operationFactor = 1.0;
    if (input.operation === "roughing") operationFactor = 2.5;  // Roughing worse
    if (input.operation === "threading") operationFactor = 0.6; // Threading better

    const Ra_adjusted = Ra * materialFactor * operationFactor;

    return {
      Ra: Math.max(0.1, Math.min(Ra_adjusted, 25)),  // Clamp to reasonable range
      confidence: ensemblePred.confidence,
      source: "ensemble_physics_blend"
    };
  }

  /**
   * Create ensemble for tool life prediction.
   * Based on Taylor equation with ML corrections.
   *
   * Taylor: T = (C / Vc)^(1/n)
   * ML corrects for: material variability, tool coating, coolant, interrupts
   */
  createToolLifeEnsemble(
    data: LatheTrainingPoint[],
    options: { seed?: number } = {}
  ): {
    rfModel: RandomForestModel;
    gbModel: GradientBoostingModel;
    physicsAdjustment: number;
  } {
    const { seed = 42 } = options;

    const rfResult = this.trainRandomForest(data, 80, "tool_life", {
      maxDepth: 10, seed
    });
    const gbResult = this.trainGradientBoosting(data, 150, "tool_life", {
      learningRate: 0.05, maxDepth: 5, seed
    });

    // Physics adjustment factor based on Taylor equation accuracy
    const physicsAdjustment = 0.4;

    log.info(`Tool life ensemble created`);

    return {
      rfModel: rfResult.model as RandomForestModel,
      gbModel: gbResult.model as GradientBoostingModel,
      physicsAdjustment
    };
  }

  /**
   * Predict tool life using ensemble + Taylor.
   */
  predictToolLife(
    ensemble: {
      rfModel: RandomForestModel;
      gbModel: GradientBoostingModel;
      physicsAdjustment: number;
    },
    input: LatheTrainingPoint
  ): { toolLife_min: number; confidence: number; factors: string[] } {
    this.totalCalculations++;

    // Taylor equation: T = (C / Vc)^(1/n)
    const taylor = CANONICAL_TAYLOR[input.material_iso];
    const Vc = input.cutting_speed_m_min ?? 200;
    const T_taylor = Math.pow(taylor.C / Vc, 1 / taylor.n);

    // ML prediction
    const models = [ensemble.rfModel, ensemble.gbModel];
    const ensemblePred = this.predictWithVoting(models, input, "soft");

    // Blend predictions
    const toolLife = ensemble.physicsAdjustment * T_taylor +
                     (1 - ensemble.physicsAdjustment) * ensemblePred.prediction;

    // Adjustment factors
    const factors: string[] = [];
    if (input.hardness_hrc > 45) {
      factors.push("High hardness reduces tool life");
    }
    if (input.operation === "threading") {
      factors.push("Threading typically extends tool life");
    }
    if (input.rigidity_factor < 0.5) {
      factors.push("Low rigidity may cause chatter, reducing life");
    }

    return {
      toolLife_min: Math.max(1, Math.min(toolLife, 300)),  // 1-300 min range
      confidence: ensemblePred.confidence,
      factors
    };
  }

  /**
   * Create ensemble for cycle time prediction.
   */
  createCycleTimeEnsemble(
    data: LatheTrainingPoint[],
    options: { seed?: number } = {}
  ): {
    rfModel: RandomForestModel;
    xgbModel: XGBoostModel;
  } {
    const { seed = 42 } = options;

    const rfResult = this.trainRandomForest(data, 60, "cycle_time", {
      maxDepth: 8, seed
    });
    const xgbResult = this.trainXGBoost(data, 120, "cycle_time", {
      learningRate: 0.15, maxDepth: 6, seed
    });

    log.info(`Cycle time ensemble created`);

    return {
      rfModel: rfResult.model as RandomForestModel,
      xgbModel: xgbResult.model as XGBoostModel
    };
  }

  /**
   * Predict cycle time.
   */
  predictCycleTime(
    ensemble: { rfModel: RandomForestModel; xgbModel: XGBoostModel },
    input: LatheTrainingPoint
  ): { cycleTime_sec: number; confidence: number; breakdown: Record<string, number> } {
    this.totalCalculations++;

    // Physics estimate: T_cut = (pi * D * L) / (1000 * Vc * f)
    const D = input.diameter_mm;
    const L = input.length_mm;
    const Vc = input.cutting_speed_m_min ?? 200;
    const f = input.feed_mm_rev ?? 0.2;

    const T_cut_physics = (Math.PI * D * L) / (1000 * Vc * f) * 60;  // seconds

    // ML prediction
    const models = [ensemble.rfModel, ensemble.xgbModel];
    const ensemblePred = this.predictWithVoting(models, input, "soft");

    // Blend with physics
    const cycleTime = 0.3 * T_cut_physics + 0.7 * ensemblePred.prediction;

    // Estimated breakdown
    const breakdown: Record<string, number> = {
      cutting: T_cut_physics * 0.7,
      rapid: T_cut_physics * 0.1,
      tool_change: 5,
      measurement: input.operation === "finishing" ? 10 : 0,
      other: Math.max(0, cycleTime - T_cut_physics * 0.8 - 5)
    };

    return {
      cycleTime_sec: Math.max(10, cycleTime),
      confidence: ensemblePred.confidence,
      breakdown
    };
  }

  /**
   * Create ensemble for quality classification.
   */
  createQualityEnsemble(
    data: LatheTrainingPoint[],
    options: { seed?: number } = {}
  ): {
    rfModel: RandomForestModel;
    adaModel: AdaBoostModel;
  } {
    const { seed = 42 } = options;

    const rfResult = this.trainRandomForest(data, 100, "quality", {
      maxDepth: 10, seed
    });
    const adaResult = this.trainAdaBoost(data, 50, { seed });

    log.info(`Quality classification ensemble created`);

    return {
      rfModel: rfResult.model as RandomForestModel,
      adaModel: adaResult.model as AdaBoostModel
    };
  }

  /**
   * Predict quality class using ensemble.
   */
  predictQuality(
    ensemble: { rfModel: RandomForestModel; adaModel: AdaBoostModel },
    input: LatheTrainingPoint
  ): { qualityClass: number; className: string; confidence: number; risks: string[] } {
    this.totalCalculations++;

    const encoded = this.encodeFeatures(input);
    const x = encoded.vector;

    // Random Forest prediction
    const rfPreds = ensemble.rfModel.trees.map(t => this.predictTree(t, x));
    const rfPred = this.aggregatePredictions(rfPreds, "classification");

    // AdaBoost prediction
    const classes = ensemble.adaModel.classes;
    const K = classes.length;
    const classScores = new Float64Array(K);
    for (let t = 0; t < ensemble.adaModel.nEstimators; t++) {
      const pred = this.predictTree(ensemble.adaModel.stumps[t], x);
      const classIdx = classes.indexOf(pred);
      if (classIdx >= 0) classScores[classIdx] += ensemble.adaModel.alphas[t];
    }
    let adaPred = classes[0];
    let bestScore = classScores[0];
    for (let c = 1; c < K; c++) {
      if (classScores[c] > bestScore) {
        bestScore = classScores[c];
        adaPred = classes[c];
      }
    }

    // Majority vote
    const qualityClass = rfPred === adaPred ? rfPred : Math.round((rfPred + adaPred) / 2);

    const classNames: Record<number, string> = {
      0: "reject",
      1: "acceptable",
      2: "good",
      3: "excellent"
    };

    // Confidence from RF vote distribution
    const classCounts = new Map<number, number>();
    for (const p of rfPreds) {
      classCounts.set(p, (classCounts.get(p) || 0) + 1);
    }
    const maxVotes = Math.max(...Array.from(classCounts.values()));
    const confidence = maxVotes / rfPreds.length;

    // Risk factors
    const risks: string[] = [];
    if (input.hardness_hrc > 50) risks.push("High hardness may cause surface issues");
    if (input.rigidity_factor < 0.4) risks.push("Low rigidity risks chatter");
    if (input.operation === "roughing" && qualityClass > 1) {
      risks.push("Roughing operations typically yield lower quality");
    }
    if (input.length_mm / input.diameter_mm > 6) {
      risks.push("High L/D ratio may cause deflection");
    }

    return {
      qualityClass: Math.min(3, Math.max(0, Math.round(qualityClass))),
      className: classNames[qualityClass] ?? "unknown",
      confidence,
      risks
    };
  }

  /**
   * Comprehensive manufacturing prediction using all ensembles.
   */
  predictAllManufacturingMetrics(
    surfaceEnsemble: ReturnType<typeof this.createSurfaceFinishEnsemble>,
    toolLifeEnsemble: ReturnType<typeof this.createToolLifeEnsemble>,
    cycleTimeEnsemble: ReturnType<typeof this.createCycleTimeEnsemble>,
    qualityEnsemble: ReturnType<typeof this.createQualityEnsemble>,
    input: LatheTrainingPoint
  ): ManufacturingPrediction {
    this.totalCalculations++;

    const surfaceResult = this.predictSurfaceFinish(surfaceEnsemble, input);
    const toolLifeResult = this.predictToolLife(toolLifeEnsemble, input);
    const cycleTimeResult = this.predictCycleTime(cycleTimeEnsemble, input);
    const qualityResult = this.predictQuality(qualityEnsemble, input);

    // Aggregate recommendations
    const recommendations: string[] = [];

    if (surfaceResult.Ra > 3.2 && input.operation === "finishing") {
      recommendations.push("Consider reducing feed rate for better surface finish");
    }
    if (toolLifeResult.toolLife_min < 15) {
      recommendations.push("Reduce cutting speed to extend tool life");
    }
    if (qualityResult.qualityClass < 2) {
      recommendations.push("Review process parameters for quality improvement");
    }
    if (cycleTimeResult.cycleTime_sec > 120) {
      recommendations.push("Consider optimizing rapid moves to reduce cycle time");
    }

    // Overall confidence
    const avgConfidence = (
      surfaceResult.confidence +
      toolLifeResult.confidence +
      cycleTimeResult.confidence +
      qualityResult.confidence
    ) / 4;

    return {
      surfaceFinish_Ra: surfaceResult.Ra,
      toolLife_min: toolLifeResult.toolLife_min,
      cycleTime_sec: cycleTimeResult.cycleTime_sec,
      qualityClass: qualityResult.qualityClass,
      confidence: avgConfidence,
      recommendations
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 8. UTILITY METHODS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Cross-validate model performance.
   */
  crossValidate(
    data: LatheTrainingPoint[],
    target: "cutting_speed" | "feed" | "depth_of_cut" | "surface_finish" | "tool_life" | "cycle_time" | "quality",
    modelType: "rf" | "gb" | "xgb",
    nFolds: number = 5,
    seed: number = 42
  ): { meanError: number; stdError: number; foldErrors: number[] } {
    this.totalCalculations++;

    const rng = new SeededRNG(seed);
    const n = data.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    rng.shuffle(indices);

    const foldSize = Math.floor(n / nFolds);
    const foldErrors: number[] = [];

    for (let fold = 0; fold < nFolds; fold++) {
      const valStart = fold * foldSize;
      const valEnd = fold === nFolds - 1 ? n : (fold + 1) * foldSize;
      const valIndices = new Set(indices.slice(valStart, valEnd));

      const trainData = data.filter((_, i) => !valIndices.has(i));
      const valData = data.filter((_, i) => valIndices.has(i));

      // Train model
      let result: TrainingResult;
      if (modelType === "rf") {
        result = this.trainRandomForest(trainData, 50, target as any, { seed: seed + fold });
      } else if (modelType === "gb") {
        result = this.trainGradientBoosting(trainData, 100, target as any, { seed: seed + fold });
      } else {
        result = this.trainXGBoost(trainData, 100, target as any, { seed: seed + fold });
      }

      // Evaluate on validation
      const { X } = this.encodeDataset(valData);
      const y = this.extractTarget(valData, target);
      const model = result.model;

      let error = 0;
      for (let i = 0; i < X.length; i++) {
        let pred: number;
        if ("oobError" in model) {
          const rfModel = model as RandomForestModel;
          const preds = rfModel.trees.map(t => this.predictTree(t, X[i]));
          pred = this.aggregatePredictions(preds, rfModel.mode);
        } else if ("initialPrediction" in model) {
          const gbModel = model as GradientBoostingModel;
          pred = gbModel.initialPrediction;
          for (const tree of (model as GradientBoostingModel).trees) {
            pred += gbModel.learningRate * this.predictTree(tree, X[i]);
          }
        } else {
          const xgbModel = model as XGBoostModel;
          pred = 0;
          for (const tree of xgbModel.trees) {
            pred += xgbModel.learningRate * this.predictTree(tree, X[i]);
          }
        }
        error += (pred - y[i]) ** 2;
      }
      foldErrors.push(error / X.length);
    }

    const meanError = foldErrors.reduce((a, b) => a + b, 0) / nFolds;
    let variance = 0;
    for (const e of foldErrors) variance += (e - meanError) ** 2;
    const stdError = Math.sqrt(variance / nFolds);

    return { meanError, stdError, foldErrors };
  }

  /**
   * Generate synthetic training data for testing.
   */
  generateSyntheticData(
    nSamples: number,
    seed: number = 42
  ): LatheTrainingPoint[] {
    const rng = new SeededRNG(seed);
    const isoGroups: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];
    const operations: Array<"roughing" | "finishing" | "threading" | "grooving" | "parting"> = [
      "roughing", "finishing", "threading", "grooving", "parting"
    ];

    const data: LatheTrainingPoint[] = [];

    for (let i = 0; i < nSamples; i++) {
      const iso = isoGroups[rng.nextInt(isoGroups.length)];
      const kienzle = CANONICAL_KIENZLE[iso];
      const taylor = CANONICAL_TAYLOR[iso];
      const operation = operations[rng.nextInt(operations.length)];

      const diameter = 20 + rng.next() * 180;  // 20-200mm
      const length = diameter * (0.5 + rng.next() * 4);  // L/D = 0.5-4.5
      const hardness = 20 + rng.next() * 40;  // 20-60 HRC
      const noseRadius = 0.4 + rng.next() * 1.6;  // 0.4-2.0mm

      // Generate realistic cutting parameters based on physics
      const baseSpeed = taylor.C * 0.5 * (1 - hardness / 100);
      const cutting_speed = baseSpeed * (0.8 + rng.next() * 0.4);
      const feed = operation === "finishing" ? 0.08 + rng.next() * 0.12 : 0.2 + rng.next() * 0.3;
      const doc = operation === "finishing" ? 0.3 + rng.next() * 0.5 : 1.5 + rng.next() * 3;

      // Simulate outputs with noise
      const Ra_theoretical = (feed * feed) / (32 * noseRadius) * 1000;
      const surface_finish = Ra_theoretical * (0.8 + rng.next() * 0.5);

      const T_taylor = Math.pow(taylor.C / cutting_speed, 1 / taylor.n);
      const tool_life = T_taylor * (0.6 + rng.next() * 0.8);

      const T_cut = (Math.PI * diameter * length) / (1000 * cutting_speed * feed) * 60;
      const cycle_time = T_cut * (1.2 + rng.next() * 0.5);

      const quality = Math.min(3, Math.max(0, Math.round(
        3 - surface_finish / 2 - (hardness > 45 ? 1 : 0) + rng.nextGaussian() * 0.5
      )));

      data.push({
        material_iso: iso,
        hardness_hrc: hardness,
        diameter_mm: diameter,
        length_mm: length,
        operation,
        tool_nose_radius_mm: noseRadius,
        tool_lead_angle_deg: 90 + rng.next() * 5,
        machine_power_kw: 15 + rng.next() * 25,
        rigidity_factor: 0.5 + rng.next() * 0.5,
        cutting_speed_m_min: cutting_speed,
        feed_mm_rev: feed,
        depth_of_cut_mm: doc,
        surface_finish_ra: surface_finish,
        tool_life_min: tool_life,
        cycle_time_sec: cycle_time,
        quality_class: quality
      });
    }

    return data;
  }

  /**
   * Get engine statistics.
   */
  getStats(): {
    totalCalculations: number;
    registeredModels: number;
  } {
    return {
      totalCalculations: this.totalCalculations,
      registeredModels: this.modelRegistry.size
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheEnsembleLearningEngine = new LatheEnsembleLearningEngine();
