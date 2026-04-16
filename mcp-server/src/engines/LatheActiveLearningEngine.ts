/**
 * LatheActiveLearningEngine — LATHE-ACTIVE-LEARNING-MS0
 * ======================================================
 * Data-efficient learning with intelligent sampling for CNC lathe parameter optimization.
 *
 * Implements complete active learning algorithms:
 *   1. Query Strategies — Uncertainty, margin, entropy, query-by-committee
 *   2. Batch Active Learning — Core-set, diverse batch, gradient-based
 *   3. Pool-Based Sampling — Efficient candidate scoring, budget management
 *   4. Information-Theoretic — Expected model change, BALD, information gain
 *   5. Manufacturing Applications — Experiment selection, failure mode discovery
 *   6. Human-in-the-Loop — Operator feedback, expert query, confidence calibration
 *
 * Key Insight:
 *   Active learning achieves same accuracy with 10x fewer labeled samples by
 *   strategically selecting the most informative data points for annotation.
 *   In manufacturing, this means fewer expensive machining experiments while
 *   still learning optimal parameters.
 *
 * References:
 *   - Settles (2009) "Active Learning Literature Survey" — canonical reference
 *   - Gal et al. (2017) "Deep Bayesian Active Learning with Image Data" — BALD
 *   - Sener & Savarese (2018) "Active Learning for CNNs: A Core-Set Approach"
 *   - Wei et al. (2015) "Submodularity in Data Subset Selection" — batch diversity
 *   - Kirsch et al. (2019) "BatchBALD: Efficient and Diverse Batch Acquisition"
 *   - Manufacturing: Zhang et al. (2021) "Active Learning for Process Optimization"
 *
 * @module engines/LatheActiveLearningEngine
 * @milestone LATHE-ACTIVE-LEARNING-MS0
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// TYPES — Data Structures for Active Learning
// ============================================================================

/** Training data point for lathe parameters */
export interface LatheDataPoint {
  id: string;
  timestamp: string;

  // Input features (what we observe before experiment)
  material_iso: ISOGroup;
  hardness_hrc: number;
  diameter_mm: number;
  length_mm: number;
  l_d_ratio: number;
  operation: LatheOperation;
  tool_nose_radius_mm: number;
  tool_lead_angle_deg: number;
  insert_grade: string;
  machine_power_kw: number;
  rigidity_factor: number;  // 0-1

  // Target outputs (what we measure after experiment)
  cutting_speed_m_min?: number;
  feed_mm_rev?: number;
  depth_of_cut_mm?: number;
  surface_finish_ra?: number;
  tool_life_min?: number;
  cycle_time_sec?: number;
  power_consumption_kw?: number;

  // Quality labels
  quality_class?: QualityClass;  // 0=reject, 1=acceptable, 2=good, 3=excellent
  is_labeled: boolean;
  label_confidence?: number;
  labeled_by?: "expert" | "operator" | "model" | "physics";
}

/** Lathe operations */
export type LatheOperation =
  | "roughing"
  | "finishing"
  | "threading"
  | "grooving"
  | "parting"
  | "facing"
  | "boring"
  | "drilling";

/** Quality classification */
export type QualityClass = 0 | 1 | 2 | 3;

/** Query strategy types */
export type QueryStrategy =
  | "uncertainty_sampling"
  | "margin_sampling"
  | "entropy_sampling"
  | "query_by_committee"
  | "expected_model_change"
  | "expected_error_reduction"
  | "bald"              // Bayesian Active Learning by Disagreement
  | "core_set"          // Geometric diversity
  | "batch_bald"        // Batch version of BALD
  | "hybrid";           // Uncertainty + Diversity

/** Model prediction with uncertainty */
export interface PredictionWithUncertainty {
  point_id: string;
  prediction: number;
  uncertainty: number;
  confidence: number;
  variance: number;
  probabilities?: number[];  // For classification
  entropy?: number;
}

/** Committee member (ensemble model) */
export interface CommitteeMember {
  id: string;
  model_type: "linear" | "ridge" | "knn" | "decision_tree" | "neural";
  weights: number[];
  bias: number;
  regularization?: number;
}

/** Feature encoding result */
export interface EncodedFeatures {
  vector: number[];
  feature_names: string[];
  dimension: number;
}

/** Active learning query result */
export interface QueryResult {
  selected_ids: string[];
  scores: number[];
  strategy_used: QueryStrategy;
  reasoning: string[];
  expected_information_gain: number;
  estimated_model_improvement: number;
}

/** Batch selection result */
export interface BatchSelectionResult {
  selected_ids: string[];
  batch_diversity: number;
  batch_uncertainty: number;
  individual_scores: Map<string, number>;
  selection_order: string[];
  greedy_gain_per_sample: number[];
}

/** Sample budget */
export interface SampleBudget {
  total_budget: number;
  spent: number;
  remaining: number;
  cost_per_sample: number;  // Machining time + material cost
  experiments_completed: number;
  experiments_planned: number;
}

/** Experiment suggestion */
export interface ExperimentSuggestion {
  id: string;
  parameters: Partial<LatheDataPoint>;
  expected_information_gain: number;
  exploration_score: number;  // How novel is this region?
  exploitation_score: number; // How much does model need this?
  priority: "critical" | "high" | "medium" | "low";
  reasoning: string;
  estimated_cost: number;
  estimated_time_min: number;
}

/** Operator feedback */
export interface OperatorFeedback {
  experiment_id: string;
  operator_id: string;
  timestamp: string;
  actual_quality: QualityClass;
  actual_tool_life_min?: number;
  actual_surface_ra?: number;
  observations: string[];
  anomalies_noted: string[];
  confidence: number;
  suggested_adjustments?: {
    parameter: string;
    current: number;
    suggested: number;
    reason: string;
  }[];
}

/** Human-in-the-loop query */
export interface ExpertQuery {
  query_id: string;
  query_type: "label" | "validate" | "suggest" | "explain";
  data_point_id: string;
  question: string;
  options?: string[];
  importance: number;
  deadline?: string;
}

/** Label quality assessment */
export interface LabelQualityAssessment {
  point_id: string;
  label_quality: number;  // 0-1
  consistency_score: number;
  inter_annotator_agreement?: number;
  suspected_errors: string[];
  recommendation: "accept" | "review" | "reject";
}

/** Model update result */
export interface ModelUpdateResult {
  samples_added: number;
  previous_error: number;
  new_error: number;
  improvement: number;
  feature_importance_change: Map<string, number>;
  convergence_status: "converging" | "diverging" | "stable";
  samples_until_convergence?: number;
}

/** Information-theoretic metrics */
export interface InformationMetrics {
  mutual_information: number;
  conditional_entropy: number;
  expected_posterior_entropy: number;
  information_gain: number;
  bald_score: number;  // H[y|x,D] - E[H[y|x,w,D]]
}

// ============================================================================
// CONSTANTS — Active Learning Configuration
// ============================================================================

/** Default configuration */
const DEFAULT_CONFIG = {
  // Uncertainty sampling
  uncertainty_threshold: 0.3,
  confidence_threshold: 0.7,

  // Committee
  committee_size: 5,
  disagreement_threshold: 0.2,

  // Batch selection
  default_batch_size: 10,
  diversity_weight: 0.5,
  uncertainty_weight: 0.5,

  // Core-set
  coreset_delta: 0.1,  // Approximation factor

  // Budget
  default_budget: 50,
  cost_per_experiment: 100,  // USD
  time_per_experiment_min: 30,

  // Learning rate for incremental updates
  learning_rate: 0.01,
  regularization: 0.001,

  // Convergence
  convergence_threshold: 0.01,
  min_samples_for_convergence: 20,
};

/** Feature normalization bounds */
const FEATURE_BOUNDS = {
  hardness_hrc: { min: 15, max: 70 },
  diameter_mm: { min: 5, max: 500 },
  length_mm: { min: 10, max: 1000 },
  l_d_ratio: { min: 0.5, max: 20 },
  tool_nose_radius_mm: { min: 0.2, max: 2.4 },
  tool_lead_angle_deg: { min: -10, max: 95 },
  machine_power_kw: { min: 5, max: 75 },
  rigidity_factor: { min: 0, max: 1 },
  cutting_speed_m_min: { min: 20, max: 500 },
  feed_mm_rev: { min: 0.05, max: 1.5 },
  depth_of_cut_mm: { min: 0.1, max: 15 },
};

/** ISO group one-hot encoding */
const ISO_GROUP_ENCODING: Record<ISOGroup, number[]> = {
  P: [1, 0, 0, 0, 0, 0],
  M: [0, 1, 0, 0, 0, 0],
  K: [0, 0, 1, 0, 0, 0],
  N: [0, 0, 0, 1, 0, 0],
  S: [0, 0, 0, 0, 1, 0],
  H: [0, 0, 0, 0, 0, 1],
};

/** Operation one-hot encoding */
const OPERATION_ENCODING: Record<LatheOperation, number[]> = {
  roughing: [1, 0, 0, 0, 0, 0, 0, 0],
  finishing: [0, 1, 0, 0, 0, 0, 0, 0],
  threading: [0, 0, 1, 0, 0, 0, 0, 0],
  grooving: [0, 0, 0, 1, 0, 0, 0, 0],
  parting: [0, 0, 0, 0, 1, 0, 0, 0],
  facing: [0, 0, 0, 0, 0, 1, 0, 0],
  boring: [0, 0, 0, 0, 0, 0, 1, 0],
  drilling: [0, 0, 0, 0, 0, 0, 0, 1],
};

// ============================================================================
// HELPER FUNCTIONS — Mathematics & Statistics
// ============================================================================

/**
 * Normalize a value to 0-1 range.
 * @param value - Input value
 * @param min - Minimum bound
 * @param max - Maximum bound
 * @returns Normalized value clamped to [0, 1]
 */
function normalize(value: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Calculate entropy for probability distribution.
 * H(p) = -sum(p_i * log(p_i))
 * @param probs - Probability distribution (must sum to 1)
 * @returns Shannon entropy in nats
 */
function entropy(probs: number[]): number {
  return -probs.reduce((sum, p) => {
    if (p <= 0 || p >= 1) return sum;
    return sum + p * Math.log(p);
  }, 0);
}

/**
 * Calculate Euclidean distance between two vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns L2 distance
 */
function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  return Math.sqrt(a.reduce((sum, ai, i) => sum + (ai - b[i]) ** 2, 0));
}

/**
 * Calculate cosine similarity between two vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity [-1, 1]
 */
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai ** 2, 0));
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi ** 2, 0));
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

/**
 * Softmax function for converting scores to probabilities.
 * @param scores - Input scores
 * @param temperature - Temperature parameter (default 1.0)
 * @returns Probability distribution
 */
function softmax(scores: number[], temperature: number = 1.0): number[] {
  const maxScore = Math.max(...scores);
  const expScores = scores.map(s => Math.exp((s - maxScore) / temperature));
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  return expScores.map(e => e / sumExp);
}

/**
 * Sample from a discrete distribution.
 * @param probs - Probability distribution
 * @param rng - Random number [0, 1)
 * @returns Sampled index
 */
function sampleDiscrete(probs: number[], rng: number = Math.random()): number {
  let cumulative = 0;
  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i];
    if (rng < cumulative) return i;
  }
  return probs.length - 1;
}

/**
 * Kernel function for similarity computation.
 * RBF kernel: K(x, y) = exp(-gamma * ||x - y||^2)
 * @param a - First vector
 * @param b - Second vector
 * @param gamma - RBF bandwidth (default 1.0)
 * @returns Kernel value
 */
function rbfKernel(a: number[], b: number[], gamma: number = 1.0): number {
  const dist = euclideanDistance(a, b);
  return Math.exp(-gamma * dist * dist);
}

/**
 * Matrix-vector multiplication.
 * @param matrix - 2D array (rows x cols)
 * @param vector - 1D array (cols)
 * @returns Result vector (rows)
 */
function matVecMul(matrix: number[][], vector: number[]): number[] {
  return matrix.map(row =>
    row.reduce((sum, val, i) => sum + val * vector[i], 0)
  );
}

/**
 * Generate random normal variable using Box-Muller transform.
 * @param mean - Mean of distribution
 * @param std - Standard deviation
 * @returns Random sample
 */
function randomNormal(mean: number = 0, std: number = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

// ============================================================================
// FEATURE ENCODING
// ============================================================================

/**
 * Encode a data point into a feature vector.
 * @param point - Lathe data point
 * @returns Encoded feature vector with metadata
 */
function encodeDataPoint(point: LatheDataPoint): EncodedFeatures {
  const vector: number[] = [];
  const feature_names: string[] = [];

  // ISO group (one-hot, 6 features)
  const isoEncoding = ISO_GROUP_ENCODING[point.material_iso] || ISO_GROUP_ENCODING.P;
  vector.push(...isoEncoding);
  feature_names.push(...["iso_P", "iso_M", "iso_K", "iso_N", "iso_S", "iso_H"]);

  // Operation (one-hot, 8 features)
  const opEncoding = OPERATION_ENCODING[point.operation] || OPERATION_ENCODING.roughing;
  vector.push(...opEncoding);
  feature_names.push(...["op_roughing", "op_finishing", "op_threading", "op_grooving",
                         "op_parting", "op_facing", "op_boring", "op_drilling"]);

  // Continuous features (normalized)
  const continuousFeatures: [string, number, keyof typeof FEATURE_BOUNDS][] = [
    ["hardness_hrc", point.hardness_hrc, "hardness_hrc"],
    ["diameter_mm", point.diameter_mm, "diameter_mm"],
    ["length_mm", point.length_mm, "length_mm"],
    ["l_d_ratio", point.l_d_ratio, "l_d_ratio"],
    ["nose_radius", point.tool_nose_radius_mm, "tool_nose_radius_mm"],
    ["lead_angle", point.tool_lead_angle_deg, "tool_lead_angle_deg"],
    ["machine_power", point.machine_power_kw, "machine_power_kw"],
    ["rigidity", point.rigidity_factor, "rigidity_factor"],
  ];

  for (const [name, value, boundsKey] of continuousFeatures) {
    const bounds = FEATURE_BOUNDS[boundsKey];
    vector.push(normalize(value, bounds.min, bounds.max));
    feature_names.push(name);
  }

  // Material-specific physics features (derived from Kienzle constants)
  const kienzle = CANONICAL_KIENZLE[point.material_iso] || CANONICAL_KIENZLE.P;
  vector.push(normalize(kienzle.kc1_1, 700, 3200));  // Normalized specific cutting force
  vector.push(normalize(kienzle.mc, 0.14, 0.40));   // Normalized exponent
  feature_names.push("kc1_1_norm", "mc_norm");

  // Interaction features (2nd order)
  const hardnessNorm = normalize(point.hardness_hrc, FEATURE_BOUNDS.hardness_hrc.min,
                                 FEATURE_BOUNDS.hardness_hrc.max);
  const ldRatioNorm = normalize(point.l_d_ratio, FEATURE_BOUNDS.l_d_ratio.min,
                                FEATURE_BOUNDS.l_d_ratio.max);
  const rigidityNorm = point.rigidity_factor;

  vector.push(hardnessNorm * ldRatioNorm);        // Hardness-geometry interaction
  vector.push(ldRatioNorm * (1 - rigidityNorm));  // Slenderness-flexibility interaction
  feature_names.push("hardness_x_ld", "slenderness_x_flex");

  return {
    vector,
    feature_names,
    dimension: vector.length,
  };
}

/**
 * Batch encode multiple data points.
 * @param points - Array of data points
 * @returns Array of encoded features
 */
function batchEncode(points: LatheDataPoint[]): EncodedFeatures[] {
  return points.map(encodeDataPoint);
}

// ============================================================================
// COMMITTEE MODELS — For Query-by-Committee
// ============================================================================

/**
 * Create a linear model (simple weights + bias).
 * @param dimension - Input feature dimension
 * @param seed - Random seed for initialization
 * @returns Committee member
 */
function createLinearModel(dimension: number, seed: number = 0): CommitteeMember {
  // Xavier initialization: sqrt(2/n)
  const scale = Math.sqrt(2 / dimension);
  const weights = Array.from({ length: dimension }, (_, i) =>
    (Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453 % 1) * scale * 2 - scale
  );
  return {
    id: `linear_${seed}`,
    model_type: "linear",
    weights,
    bias: 0,
  };
}

/**
 * Create a ridge regression model with regularization.
 * @param dimension - Input feature dimension
 * @param regularization - L2 regularization strength
 * @param seed - Random seed
 * @returns Committee member
 */
function createRidgeModel(dimension: number, regularization: number = 0.01,
                          seed: number = 0): CommitteeMember {
  const scale = Math.sqrt(2 / dimension);
  const weights = Array.from({ length: dimension }, (_, i) =>
    (Math.sin((seed + 7) * 17.1337 + i * 91.721) * 65498.1234 % 1) * scale * 2 - scale
  );
  return {
    id: `ridge_${seed}`,
    model_type: "ridge",
    weights,
    bias: 0,
    regularization,
  };
}

/**
 * Create a decision tree stump model.
 * @param dimension - Input feature dimension
 * @param seed - Random seed
 * @returns Committee member (encoded as threshold rule)
 */
function createDecisionTree(dimension: number, seed: number = 0): CommitteeMember {
  // Select random feature and threshold
  const featureIdx = Math.floor(Math.abs(Math.sin(seed * 5.678) * 10000) % dimension);
  const threshold = Math.abs(Math.sin(seed * 9.012) * 10000) % 1;

  const weights = new Array(dimension).fill(0);
  weights[featureIdx] = 1;

  return {
    id: `tree_${seed}`,
    model_type: "decision_tree",
    weights,
    bias: -threshold,
  };
}

/**
 * Predict using a committee member.
 * @param model - Committee member
 * @param features - Encoded feature vector
 * @returns Prediction value
 */
function predict(model: CommitteeMember, features: number[]): number {
  const dotProduct = model.weights.reduce((sum, w, i) =>
    sum + w * (features[i] || 0), 0);
  return dotProduct + model.bias;
}

/**
 * Create a diverse committee of models.
 * @param dimension - Input feature dimension
 * @param size - Number of committee members
 * @returns Array of committee members
 */
function createCommittee(dimension: number, size: number = 5): CommitteeMember[] {
  const committee: CommitteeMember[] = [];

  // Mix of model types for diversity
  for (let i = 0; i < size; i++) {
    if (i % 3 === 0) {
      committee.push(createLinearModel(dimension, i));
    } else if (i % 3 === 1) {
      committee.push(createRidgeModel(dimension, 0.01 * (i + 1), i));
    } else {
      committee.push(createDecisionTree(dimension, i));
    }
  }

  return committee;
}

/**
 * Train a committee member on labeled data using gradient descent.
 * @param model - Committee member to train
 * @param X - Feature matrix (n_samples x dimension)
 * @param y - Target values
 * @param learning_rate - SGD learning rate
 * @param epochs - Number of training epochs
 * @returns Updated model
 */
function trainModel(model: CommitteeMember, X: number[][], y: number[],
                    learning_rate: number = 0.01, epochs: number = 100): CommitteeMember {
  const n = X.length;
  const d = model.weights.length;
  const weights = [...model.weights];
  let bias = model.bias;
  const lambda = model.regularization || 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    // Shuffle indices
    const indices = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    for (const idx of indices) {
      const x = X[idx];
      const target = y[idx];
      const pred = weights.reduce((sum, w, i) => sum + w * x[i], 0) + bias;
      const error = pred - target;

      // SGD update with L2 regularization
      for (let i = 0; i < d; i++) {
        weights[i] -= learning_rate * (error * x[i] + lambda * weights[i]);
      }
      bias -= learning_rate * error;
    }
  }

  return { ...model, weights, bias };
}

// ============================================================================
// QUERY STRATEGIES — Core Active Learning Algorithms
// ============================================================================

/**
 * Uncertainty Sampling — Select samples where model is least confident.
 * For regression: high prediction variance
 * For classification: low max probability
 *
 * Reference: Lewis & Gale (1994) "A sequential algorithm for training text classifiers"
 *
 * @param predictions - Model predictions with uncertainty
 * @returns Uncertainty scores (higher = more uncertain)
 */
function uncertaintySampling(predictions: PredictionWithUncertainty[]): Map<string, number> {
  const scores = new Map<string, number>();

  for (const pred of predictions) {
    // Uncertainty = 1 - confidence (inverted for selection)
    // Normalize variance to [0, 1] range
    const uncertaintyScore = 1 - pred.confidence + pred.variance / (1 + pred.variance);
    scores.set(pred.point_id, uncertaintyScore);
  }

  return scores;
}

/**
 * Margin Sampling — Select samples with smallest margin between top predictions.
 * Margin = P(y1|x) - P(y2|x) for top two classes
 *
 * Reference: Scheffer et al. (2001) "Active Hidden Markov Models"
 *
 * @param predictions - Model predictions with probabilities
 * @returns Margin scores (higher = smaller margin = more informative)
 */
function marginSampling(predictions: PredictionWithUncertainty[]): Map<string, number> {
  const scores = new Map<string, number>();

  for (const pred of predictions) {
    if (pred.probabilities && pred.probabilities.length >= 2) {
      // Sort probabilities descending
      const sorted = [...pred.probabilities].sort((a, b) => b - a);
      const margin = sorted[0] - sorted[1];
      // Invert margin: smaller margin = more informative
      scores.set(pred.point_id, 1 - margin);
    } else {
      // Fallback to uncertainty
      scores.set(pred.point_id, 1 - pred.confidence);
    }
  }

  return scores;
}

/**
 * Entropy Sampling — Select samples with maximum prediction entropy.
 * H(y|x) = -sum(P(y|x) * log(P(y|x)))
 *
 * Reference: Shannon (1948), applied to active learning by Settles (2009)
 *
 * @param predictions - Model predictions with probabilities
 * @returns Entropy scores (higher = more uncertain)
 */
function entropySampling(predictions: PredictionWithUncertainty[]): Map<string, number> {
  const scores = new Map<string, number>();

  for (const pred of predictions) {
    if (pred.entropy !== undefined) {
      scores.set(pred.point_id, pred.entropy);
    } else if (pred.probabilities && pred.probabilities.length > 0) {
      scores.set(pred.point_id, entropy(pred.probabilities));
    } else {
      // Estimate entropy from confidence
      const p = pred.confidence;
      const binaryEntropy = p > 0 && p < 1 ? -p * Math.log(p) - (1 - p) * Math.log(1 - p) : 0;
      scores.set(pred.point_id, binaryEntropy);
    }
  }

  return scores;
}

/**
 * Query-by-Committee — Select samples where committee disagrees most.
 * Disagreement measured by vote entropy or KL divergence.
 *
 * Reference: Seung et al. (1992) "Query by Committee"
 *
 * @param pool - Unlabeled data pool
 * @param committee - Ensemble of models
 * @returns QBC scores (higher = more disagreement)
 */
function queryByCommittee(
  pool: LatheDataPoint[],
  committee: CommitteeMember[]
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const point of pool) {
    const features = encodeDataPoint(point).vector;

    // Get predictions from all committee members
    const predictions = committee.map(model => predict(model, features));

    // Calculate disagreement as variance of predictions
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const variance = predictions.reduce((sum, p) =>
      sum + (p - mean) ** 2, 0) / predictions.length;

    // Also calculate vote entropy for classification
    // Bin predictions into 4 quality classes
    const bins = [0, 0, 0, 0];
    for (const p of predictions) {
      const classIdx = Math.min(3, Math.max(0, Math.floor(p * 4)));
      bins[classIdx]++;
    }
    const probs = bins.map(b => b / predictions.length);
    const voteEntropy = entropy(probs);

    // Combined score: variance + vote entropy
    scores.set(point.id, variance + voteEntropy);
  }

  return scores;
}

/**
 * Expected Model Change — Select samples that would most change the model.
 * Approximated by gradient magnitude.
 *
 * Reference: Settles et al. (2008) "An Analysis of Active Learning Strategies"
 *
 * @param pool - Unlabeled data pool
 * @param model - Current model
 * @param learning_rate - Learning rate for gradient estimation
 * @returns EMC scores
 */
function expectedModelChange(
  pool: LatheDataPoint[],
  model: CommitteeMember,
  learning_rate: number = 0.01
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const point of pool) {
    const features = encodeDataPoint(point).vector;
    const pred = predict(model, features);

    // Estimate gradient magnitude for all possible labels
    // For regression: gradient proportional to feature magnitude and prediction uncertainty
    let maxGradientNorm = 0;

    // Simulate different possible labels
    for (const label of [0, 0.25, 0.5, 0.75, 1]) {
      const error = pred - label;
      const gradientNorm = Math.sqrt(features.reduce((sum, f) =>
        sum + (error * f * learning_rate) ** 2, 0));
      maxGradientNorm = Math.max(maxGradientNorm, gradientNorm);
    }

    scores.set(point.id, maxGradientNorm);
  }

  return scores;
}

/**
 * BALD — Bayesian Active Learning by Disagreement.
 * Selects points that maximize mutual information between predictions and parameters.
 * I(y; w | x, D) = H[y | x, D] - E_w[H[y | x, w, D]]
 *
 * Reference: Gal et al. (2017) "Deep Bayesian Active Learning with Image Data"
 *
 * @param pool - Unlabeled data pool
 * @param committee - Ensemble approximating posterior
 * @returns BALD scores
 */
function baldScoring(
  pool: LatheDataPoint[],
  committee: CommitteeMember[]
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const point of pool) {
    const features = encodeDataPoint(point).vector;

    // Get predictions from all committee members (MC samples from posterior)
    const predictions = committee.map(model => predict(model, features));

    // Convert to probabilities (sigmoid for binary, softmax for multi-class)
    const probsPerModel = predictions.map(p => {
      const sigmoid = 1 / (1 + Math.exp(-p));
      return [1 - sigmoid, sigmoid];  // Binary probabilities
    });

    // Mean prediction across models (approximates p(y|x,D))
    const meanProbs = [0, 0];
    for (const probs of probsPerModel) {
      meanProbs[0] += probs[0] / committee.length;
      meanProbs[1] += probs[1] / committee.length;
    }

    // H[y | x, D] - entropy of mean prediction
    const predEntropy = entropy(meanProbs);

    // E_w[H[y | x, w, D]] - expected entropy of individual predictions
    const expectedEntropy = probsPerModel.reduce((sum, probs) =>
      sum + entropy(probs), 0) / committee.length;

    // BALD score = mutual information
    const baldScore = predEntropy - expectedEntropy;
    scores.set(point.id, baldScore);
  }

  return scores;
}

/**
 * Information Gain scoring using expected error reduction.
 * Estimates how much each sample would reduce model uncertainty.
 *
 * Reference: Roy & McCallum (2001) "Toward Optimal Active Learning"
 *
 * @param pool - Unlabeled data pool
 * @param labeled - Currently labeled data
 * @param model - Current model
 * @returns Information gain scores
 */
function informationGain(
  pool: LatheDataPoint[],
  labeled: LatheDataPoint[],
  model: CommitteeMember
): Map<string, number> {
  const scores = new Map<string, number>();

  // Encode all labeled points
  const labeledFeatures = labeled.map(p => encodeDataPoint(p).vector);
  const labeledTargets = labeled.map(p => p.quality_class || 0);

  // Current model error
  let currentError = 0;
  for (let i = 0; i < labeled.length; i++) {
    const pred = predict(model, labeledFeatures[i]);
    currentError += (pred - labeledTargets[i] / 3) ** 2;  // Normalize to [0,1]
  }
  currentError /= labeled.length || 1;

  for (const point of pool) {
    const features = encodeDataPoint(point).vector;
    const pred = predict(model, features);

    // Simulate adding this point with different labels
    let expectedErrorReduction = 0;

    for (const label of [0, 1, 2, 3]) {
      // Estimate probability of this label given prediction
      const labelProb = Math.exp(-((pred - label / 3) ** 2)) /
                       (Math.exp(0) + Math.exp(-1/9) + Math.exp(-4/9) + Math.exp(-1));

      // Estimate error after adding this sample (simplified)
      const newError = currentError * labeled.length / (labeled.length + 1) +
                      ((pred - label / 3) ** 2) / (labeled.length + 1);

      expectedErrorReduction += labelProb * (currentError - newError);
    }

    scores.set(point.id, expectedErrorReduction);
  }

  return scores;
}

// ============================================================================
// BATCH SELECTION — Diverse Batch Active Learning
// ============================================================================

/**
 * Core-Set Selection — Select points that best cover the feature space.
 * Greedy algorithm minimizing maximum distance to nearest selected point.
 *
 * Reference: Sener & Savarese (2018) "Active Learning for CNNs: A Core-Set Approach"
 *
 * @param pool - Unlabeled data pool
 * @param selected - Already selected/labeled points
 * @param batchSize - Number of points to select
 * @returns Selected point IDs in order
 */
function coreSetSelection(
  pool: LatheDataPoint[],
  selected: LatheDataPoint[],
  batchSize: number
): string[] {
  if (pool.length === 0) return [];

  // Encode all points
  const poolEncoded = pool.map(p => ({
    id: p.id,
    features: encodeDataPoint(p).vector,
  }));
  const selectedEncoded = selected.map(p => ({
    id: p.id,
    features: encodeDataPoint(p).vector,
  }));

  const result: string[] = [];
  const selectedFeatures = [...selectedEncoded];

  // Greedy core-set: pick point farthest from current set
  for (let i = 0; i < batchSize && poolEncoded.length > result.length; i++) {
    let maxMinDist = -1;
    let bestIdx = -1;

    for (let j = 0; j < poolEncoded.length; j++) {
      if (result.includes(poolEncoded[j].id)) continue;

      // Distance to nearest selected point
      let minDist = Infinity;
      for (const sel of selectedFeatures) {
        const dist = euclideanDistance(poolEncoded[j].features, sel.features);
        minDist = Math.min(minDist, dist);
      }

      if (minDist > maxMinDist) {
        maxMinDist = minDist;
        bestIdx = j;
      }
    }

    if (bestIdx >= 0) {
      result.push(poolEncoded[bestIdx].id);
      selectedFeatures.push(poolEncoded[bestIdx]);
    }
  }

  return result;
}

/**
 * Diverse Batch Selection — Balance uncertainty and diversity.
 * Uses submodular optimization for near-optimal batch.
 *
 * Reference: Wei et al. (2015) "Submodularity in Data Subset Selection"
 *
 * @param pool - Unlabeled data pool
 * @param uncertaintyScores - Per-sample uncertainty scores
 * @param batchSize - Number of points to select
 * @param diversityWeight - Weight for diversity vs uncertainty (0-1)
 * @returns Batch selection result
 */
function diverseBatchSelection(
  pool: LatheDataPoint[],
  uncertaintyScores: Map<string, number>,
  batchSize: number,
  diversityWeight: number = 0.5
): BatchSelectionResult {
  if (pool.length === 0) {
    return {
      selected_ids: [],
      batch_diversity: 0,
      batch_uncertainty: 0,
      individual_scores: new Map(),
      selection_order: [],
      greedy_gain_per_sample: [],
    };
  }

  // Encode all points
  const encoded = pool.map(p => ({
    id: p.id,
    features: encodeDataPoint(p).vector,
    uncertainty: uncertaintyScores.get(p.id) || 0,
  }));

  const selected: typeof encoded = [];
  const selectionOrder: string[] = [];
  const greedyGains: number[] = [];

  // Greedy submodular optimization
  for (let i = 0; i < batchSize && encoded.length > selected.length; i++) {
    let bestGain = -Infinity;
    let bestIdx = -1;

    for (let j = 0; j < encoded.length; j++) {
      const candidate = encoded[j];
      if (selected.some(s => s.id === candidate.id)) continue;

      // Uncertainty component
      const uncertaintyGain = candidate.uncertainty;

      // Diversity component: minimum distance to already selected
      let diversityGain = 0;
      if (selected.length === 0) {
        // First point: use max distance from center
        const center = encoded.reduce((c, p) => {
          c.forEach((_, k) => c[k] += p.features[k] / encoded.length);
          return c;
        }, new Array(encoded[0].features.length).fill(0));
        diversityGain = euclideanDistance(candidate.features, center);
      } else {
        // Min distance to selected set
        let minDist = Infinity;
        for (const sel of selected) {
          minDist = Math.min(minDist, euclideanDistance(candidate.features, sel.features));
        }
        diversityGain = minDist;
      }

      // Combined score
      const gain = (1 - diversityWeight) * uncertaintyGain +
                   diversityWeight * diversityGain;

      if (gain > bestGain) {
        bestGain = gain;
        bestIdx = j;
      }
    }

    if (bestIdx >= 0) {
      selected.push(encoded[bestIdx]);
      selectionOrder.push(encoded[bestIdx].id);
      greedyGains.push(bestGain);
    }
  }

  // Calculate batch metrics
  const batchUncertainty = selected.reduce((sum, s) =>
    sum + s.uncertainty, 0) / (selected.length || 1);

  let batchDiversity = 0;
  if (selected.length > 1) {
    let totalDist = 0;
    let count = 0;
    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        totalDist += euclideanDistance(selected[i].features, selected[j].features);
        count++;
      }
    }
    batchDiversity = totalDist / count;
  }

  const individualScores = new Map<string, number>();
  for (const s of selected) {
    individualScores.set(s.id, s.uncertainty);
  }

  return {
    selected_ids: selectionOrder,
    batch_diversity: batchDiversity,
    batch_uncertainty: batchUncertainty,
    individual_scores: individualScores,
    selection_order: selectionOrder,
    greedy_gain_per_sample: greedyGains,
  };
}

/**
 * BatchBALD — Efficient batch acquisition with joint mutual information.
 * Avoids redundant samples by considering joint information.
 *
 * Reference: Kirsch et al. (2019) "BatchBALD: Efficient and Diverse Batch Acquisition"
 *
 * @param pool - Unlabeled data pool
 * @param committee - Ensemble models
 * @param batchSize - Number of points to select
 * @returns Batch selection result
 */
function batchBald(
  pool: LatheDataPoint[],
  committee: CommitteeMember[],
  batchSize: number
): BatchSelectionResult {
  // Get individual BALD scores
  const baldScores = baldScoring(pool, committee);

  // Greedy selection with redundancy penalty
  const encoded = pool.map(p => ({
    id: p.id,
    features: encodeDataPoint(p).vector,
    baldScore: baldScores.get(p.id) || 0,
  }));

  const selected: typeof encoded = [];
  const selectionOrder: string[] = [];
  const greedyGains: number[] = [];

  for (let i = 0; i < batchSize && encoded.length > selected.length; i++) {
    let bestJointGain = -Infinity;
    let bestIdx = -1;

    for (let j = 0; j < encoded.length; j++) {
      const candidate = encoded[j];
      if (selected.some(s => s.id === candidate.id)) continue;

      // Start with individual BALD score
      let jointGain = candidate.baldScore;

      // Subtract redundancy with already selected points
      // Approximated by similarity-weighted BALD scores
      for (const sel of selected) {
        const similarity = rbfKernel(candidate.features, sel.features, 0.5);
        jointGain -= similarity * sel.baldScore * 0.5;  // Redundancy penalty
      }

      if (jointGain > bestJointGain) {
        bestJointGain = jointGain;
        bestIdx = j;
      }
    }

    if (bestIdx >= 0) {
      selected.push(encoded[bestIdx]);
      selectionOrder.push(encoded[bestIdx].id);
      greedyGains.push(bestJointGain);
    }
  }

  // Calculate batch metrics
  const batchUncertainty = selected.reduce((sum, s) =>
    sum + s.baldScore, 0) / (selected.length || 1);

  let batchDiversity = 0;
  if (selected.length > 1) {
    let totalDist = 0;
    let count = 0;
    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        totalDist += euclideanDistance(selected[i].features, selected[j].features);
        count++;
      }
    }
    batchDiversity = totalDist / count;
  }

  return {
    selected_ids: selectionOrder,
    batch_diversity: batchDiversity,
    batch_uncertainty: batchUncertainty,
    individual_scores: baldScores,
    selection_order: selectionOrder,
    greedy_gain_per_sample: greedyGains,
  };
}

// ============================================================================
// MANUFACTURING APPLICATIONS — Domain-Specific Active Learning
// ============================================================================

/**
 * Identify critical experiments at boundary conditions.
 * Manufacturing parameters often have non-linear boundaries where
 * small changes lead to failure.
 *
 * @param pool - Unlabeled data pool
 * @param labeled - Labeled data (with outcomes)
 * @returns Critical boundary experiments
 */
function identifyBoundaryExperiments(
  pool: LatheDataPoint[],
  labeled: LatheDataPoint[]
): ExperimentSuggestion[] {
  const suggestions: ExperimentSuggestion[] = [];

  // Find success/failure boundaries in parameter space
  const successes = labeled.filter(p =>
    p.is_labeled && p.quality_class !== undefined && p.quality_class >= 2);
  const failures = labeled.filter(p =>
    p.is_labeled && p.quality_class !== undefined && p.quality_class <= 1);

  if (successes.length === 0 || failures.length === 0) {
    // No boundary to explore yet
    return suggestions;
  }

  // Find pool points near the decision boundary
  for (const point of pool) {
    const features = encodeDataPoint(point).vector;

    // Distance to nearest success
    let minSuccessDist = Infinity;
    for (const success of successes) {
      const dist = euclideanDistance(features, encodeDataPoint(success).vector);
      minSuccessDist = Math.min(minSuccessDist, dist);
    }

    // Distance to nearest failure
    let minFailureDist = Infinity;
    for (const failure of failures) {
      const dist = euclideanDistance(features, encodeDataPoint(failure).vector);
      minFailureDist = Math.min(minFailureDist, dist);
    }

    // Points near the boundary (similar distance to both)
    const boundaryProximity = 1 - Math.abs(minSuccessDist - minFailureDist) /
                              (minSuccessDist + minFailureDist + 0.01);

    if (boundaryProximity > 0.7) {
      suggestions.push({
        id: `boundary_${point.id}`,
        parameters: {
          material_iso: point.material_iso,
          operation: point.operation,
          hardness_hrc: point.hardness_hrc,
          diameter_mm: point.diameter_mm,
        },
        expected_information_gain: boundaryProximity,
        exploration_score: Math.min(minSuccessDist, minFailureDist),
        exploitation_score: boundaryProximity,
        priority: boundaryProximity > 0.9 ? "critical" : "high",
        reasoning: `Point near success/failure boundary (proximity: ${(boundaryProximity * 100).toFixed(1)}%). ` +
                  `Distance to nearest success: ${minSuccessDist.toFixed(2)}, failure: ${minFailureDist.toFixed(2)}`,
        estimated_cost: DEFAULT_CONFIG.cost_per_experiment,
        estimated_time_min: DEFAULT_CONFIG.time_per_experiment_min,
      });
    }
  }

  // Sort by priority and information gain
  return suggestions.sort((a, b) => b.expected_information_gain - a.expected_information_gain);
}

/**
 * Identify potential failure modes that need exploration.
 * Focus on extreme parameter combinations that might reveal failure.
 *
 * @param pool - Unlabeled data pool
 * @param labeled - Labeled data
 * @returns Failure mode exploration experiments
 */
function identifyFailureModes(
  pool: LatheDataPoint[],
  labeled: LatheDataPoint[]
): ExperimentSuggestion[] {
  const suggestions: ExperimentSuggestion[] = [];

  // Identify extreme regions not yet explored
  const labeledFeatures = labeled.map(p => encodeDataPoint(p).vector);
  const featureDim = labeledFeatures[0]?.length || 0;

  // Find feature ranges covered by labeled data
  const ranges: { min: number; max: number }[] = [];
  for (let i = 0; i < featureDim; i++) {
    const values = labeledFeatures.map(f => f[i]);
    ranges.push({
      min: Math.min(...values),
      max: Math.max(...values),
    });
  }

  for (const point of pool) {
    const features = encodeDataPoint(point).vector;

    // Check if point is in unexplored extreme region
    let extremeScore = 0;
    const extremeReasons: string[] = [];

    for (let i = 0; i < features.length; i++) {
      const value = features[i];
      const range = ranges[i];
      if (!range) continue;

      // Check if value is outside labeled range
      if (value < range.min) {
        const delta = (range.min - value) / (range.max - range.min + 0.01);
        extremeScore += delta;
        extremeReasons.push(`Feature ${i} below explored range`);
      } else if (value > range.max) {
        const delta = (value - range.max) / (range.max - range.min + 0.01);
        extremeScore += delta;
        extremeReasons.push(`Feature ${i} above explored range`);
      }
    }

    if (extremeScore > 0.5) {
      suggestions.push({
        id: `extreme_${point.id}`,
        parameters: {
          material_iso: point.material_iso,
          operation: point.operation,
          hardness_hrc: point.hardness_hrc,
          diameter_mm: point.diameter_mm,
          l_d_ratio: point.l_d_ratio,
        },
        expected_information_gain: extremeScore,
        exploration_score: extremeScore,
        exploitation_score: 0.2,  // Low exploitation since exploring unknown
        priority: extremeScore > 1.5 ? "high" : "medium",
        reasoning: `Extreme parameter region: ${extremeReasons.slice(0, 3).join("; ")}. ` +
                  `Potential failure mode discovery.`,
        estimated_cost: DEFAULT_CONFIG.cost_per_experiment * 1.5,  // Higher risk
        estimated_time_min: DEFAULT_CONFIG.time_per_experiment_min,
      });
    }
  }

  return suggestions.sort((a, b) => b.exploration_score - a.exploration_score);
}

/**
 * Generate physics-informed experiment suggestions.
 * Uses manufacturing physics to identify informative parameter combinations.
 *
 * @param budget - Available experiment budget
 * @param constraints - Manufacturing constraints
 * @returns Suggested experiments
 */
function suggestPhysicsInformedExperiments(
  budget: SampleBudget,
  constraints: {
    materials: ISOGroup[];
    operations: LatheOperation[];
    hardness_range: [number, number];
    diameter_range: [number, number];
  }
): ExperimentSuggestion[] {
  const suggestions: ExperimentSuggestion[] = [];
  const nExperiments = Math.min(budget.remaining, 20);

  // Generate Latin Hypercube sampling for parameter space
  // This ensures good coverage with minimal experiments
  const samples = latinHypercubeSampling(nExperiments, 4);  // 4 key parameters

  for (let i = 0; i < nExperiments; i++) {
    const sample = samples[i];

    // Map LHS samples to actual parameters
    const material = constraints.materials[Math.floor(sample[0] * constraints.materials.length)];
    const operation = constraints.operations[Math.floor(sample[1] * constraints.operations.length)];
    const hardness = constraints.hardness_range[0] +
                    sample[2] * (constraints.hardness_range[1] - constraints.hardness_range[0]);
    const diameter = constraints.diameter_range[0] +
                    sample[3] * (constraints.diameter_range[1] - constraints.diameter_range[0]);

    // Calculate physics-based information value
    const kienzle = CANONICAL_KIENZLE[material];
    const physicsComplexity = kienzle.kc1_1 / 2000 +  // Higher cutting force = more complex
                             (hardness - 30) / 40 +    // Harder = more challenging
                             (diameter > 50 ? 0.2 : 0);  // Large parts add complexity

    suggestions.push({
      id: `lhs_${i}`,
      parameters: {
        material_iso: material,
        operation,
        hardness_hrc: hardness,
        diameter_mm: diameter,
      },
      expected_information_gain: physicsComplexity,
      exploration_score: 0.8,  // LHS ensures good coverage
      exploitation_score: 0.5,
      priority: physicsComplexity > 1.5 ? "high" : "medium",
      reasoning: `Latin Hypercube sample ${i + 1}/${nExperiments}. ` +
                `Material ${material} (kc1.1=${kienzle.kc1_1}), ` +
                `${hardness.toFixed(0)} HRC, ${diameter.toFixed(1)}mm diameter.`,
      estimated_cost: DEFAULT_CONFIG.cost_per_experiment,
      estimated_time_min: DEFAULT_CONFIG.time_per_experiment_min,
    });
  }

  return suggestions;
}

/**
 * Latin Hypercube Sampling for efficient parameter space exploration.
 * @param n - Number of samples
 * @param d - Number of dimensions
 * @returns n x d matrix of samples in [0, 1]^d
 */
function latinHypercubeSampling(n: number, d: number): number[][] {
  const samples: number[][] = [];

  // Create stratified samples for each dimension
  const permutations: number[][] = [];
  for (let j = 0; j < d; j++) {
    const perm = Array.from({ length: n }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = n - 1; i > 0; i--) {
      const k = Math.floor(Math.random() * (i + 1));
      [perm[i], perm[k]] = [perm[k], perm[i]];
    }
    permutations.push(perm);
  }

  // Generate samples
  for (let i = 0; i < n; i++) {
    const sample: number[] = [];
    for (let j = 0; j < d; j++) {
      // Random point within stratum
      sample.push((permutations[j][i] + Math.random()) / n);
    }
    samples.push(sample);
  }

  return samples;
}

// ============================================================================
// HUMAN-IN-THE-LOOP — Operator Feedback Integration
// ============================================================================

/**
 * Generate expert queries for ambiguous samples.
 * @param samples - Samples needing expert input
 * @param model_predictions - Model predictions for context
 * @returns Expert queries
 */
function generateExpertQueries(
  samples: LatheDataPoint[],
  model_predictions: Map<string, PredictionWithUncertainty>
): ExpertQuery[] {
  const queries: ExpertQuery[] = [];

  for (const sample of samples) {
    const pred = model_predictions.get(sample.id);
    if (!pred) continue;

    // High uncertainty samples need validation
    if (pred.uncertainty > DEFAULT_CONFIG.uncertainty_threshold) {
      queries.push({
        query_id: `q_${sample.id}_validate`,
        query_type: "validate",
        data_point_id: sample.id,
        question: `Model predicts quality class ${Math.round(pred.prediction * 3)} ` +
                 `(confidence: ${(pred.confidence * 100).toFixed(0)}%) for ` +
                 `${sample.material_iso} ${sample.operation} at ${sample.hardness_hrc} HRC, ` +
                 `${sample.diameter_mm}mm diameter. Is this prediction correct?`,
        options: ["Correct", "Too optimistic", "Too pessimistic", "Uncertain"],
        importance: pred.uncertainty,
      });
    }

    // Edge cases need explanation
    if (sample.l_d_ratio > 8 || sample.hardness_hrc > 55) {
      queries.push({
        query_id: `q_${sample.id}_explain`,
        query_type: "explain",
        data_point_id: sample.id,
        question: `This is an edge case: ${sample.l_d_ratio > 8 ? "high L/D ratio" : ""} ` +
                 `${sample.hardness_hrc > 55 ? "high hardness" : ""}. ` +
                 `What special considerations apply?`,
        importance: 0.9,
      });
    }
  }

  return queries.sort((a, b) => b.importance - a.importance);
}

/**
 * Process operator feedback to update model confidence.
 * @param feedback - Operator feedback
 * @param current_label - Current model prediction
 * @returns Updated label with confidence adjustment
 */
function processOperatorFeedback(
  feedback: OperatorFeedback,
  current_label: { quality_class: number; confidence: number }
): { quality_class: number; confidence: number; source: string } {
  const operator_quality = feedback.actual_quality;
  const operator_confidence = feedback.confidence;

  // Weight operator feedback by their confidence
  // Higher operator confidence = more trust in their label
  const operator_weight = 0.3 + 0.5 * operator_confidence;
  const model_weight = 1 - operator_weight;

  // Blend labels (weighted average)
  const blended_quality = model_weight * current_label.quality_class +
                         operator_weight * operator_quality;

  // Confidence increases if operator agrees, decreases if disagrees
  const agreement = 1 - Math.abs(operator_quality - current_label.quality_class) / 3;
  const new_confidence = current_label.confidence * 0.5 + 0.5 * agreement;

  return {
    quality_class: Math.round(blended_quality) as QualityClass,
    confidence: new_confidence,
    source: agreement > 0.7 ? "model_operator_agree" : "operator_override",
  };
}

/**
 * Assess quality of labels for potential re-annotation.
 * @param point - Labeled data point
 * @param all_feedback - All operator feedback for this point
 * @returns Label quality assessment
 */
function assessLabelQuality(
  point: LatheDataPoint,
  all_feedback: OperatorFeedback[]
): LabelQualityAssessment {
  const suspected_errors: string[] = [];

  // Check for inconsistent feedback
  const quality_labels = all_feedback.map(f => f.actual_quality);

  // Handle empty feedback case
  let mean_quality = 0;
  let variance = 0;
  if (quality_labels.length > 0) {
    mean_quality = quality_labels.reduce((a, b) => a + b, 0) / quality_labels.length;
    variance = quality_labels.reduce((sum, q) =>
      sum + (q - mean_quality) ** 2, 0) / quality_labels.length;
  }

  // Inter-annotator agreement (Fleiss' kappa approximation)
  // Default to 1.0 (perfect agreement) if no feedback
  const agreement = quality_labels.length > 0 ? 1 - variance / 2.25 : 1.0;  // Max variance for 4 classes = 2.25

  // Check for physics violations
  if (point.quality_class === 3 && point.l_d_ratio > 10) {
    suspected_errors.push("Excellent quality unlikely with L/D > 10");
  }
  if (point.quality_class === 3 && point.hardness_hrc > 60) {
    suspected_errors.push("Excellent quality unlikely with HRC > 60");
  }

  // Consistency with operator feedback
  let consistency = 1;
  if (all_feedback.length > 0 && point.quality_class !== undefined) {
    const feedbackDiff = all_feedback.reduce((sum, f) =>
      sum + Math.abs(f.actual_quality - point.quality_class), 0) / all_feedback.length;
    consistency = 1 - feedbackDiff / 3;
  }

  const label_quality = 0.4 * agreement + 0.4 * consistency +
                       0.2 * (1 - suspected_errors.length / 5);

  return {
    point_id: point.id,
    label_quality,
    consistency_score: consistency,
    inter_annotator_agreement: agreement,
    suspected_errors,
    recommendation: label_quality > 0.8 ? "accept" :
                   label_quality > 0.5 ? "review" : "reject",
  };
}

/**
 * Calibrate model confidence based on historical accuracy.
 * @param predictions - Recent predictions
 * @param actual_outcomes - Actual outcomes
 * @returns Calibration adjustment
 */
function calibrateConfidence(
  predictions: Array<{ prediction: number; confidence: number }>,
  actual_outcomes: number[]
): { slope: number; intercept: number; reliability_score: number } {
  if (predictions.length < 10) {
    return { slope: 1, intercept: 0, reliability_score: 0.5 };
  }

  // Bin predictions by confidence
  const bins: Map<string, { pred: number[]; actual: number[] }> = new Map();
  for (let i = 0; i < predictions.length; i++) {
    const conf = predictions[i].confidence;
    const binKey = `${Math.floor(conf * 10) / 10}`;
    if (!bins.has(binKey)) {
      bins.set(binKey, { pred: [], actual: [] });
    }
    bins.get(binKey)!.pred.push(predictions[i].prediction);
    bins.get(binKey)!.actual.push(actual_outcomes[i]);
  }

  // Calculate expected calibration error
  let ece = 0;
  let totalSamples = 0;
  bins.forEach((bin) => {
    const avgConf = bin.pred.reduce((a, b) => a + b, 0) / bin.pred.length;
    const accuracy = bin.pred.reduce((sum, pred, i) =>
      sum + (Math.abs(pred - bin.actual[i]) < 0.5 ? 1 : 0), 0) / bin.pred.length;
    ece += Math.abs(avgConf - accuracy) * bin.pred.length;
    totalSamples += bin.pred.length;
  });
  ece /= totalSamples;

  // Reliability score (1 - ECE)
  const reliability_score = 1 - ece;

  // Calculate calibration adjustment (Platt scaling approximation)
  // If model is overconfident, slope < 1
  // If model is underconfident, slope > 1
  const slope = 1 - ece;  // Simplified adjustment
  const intercept = 0;

  return { slope, intercept, reliability_score };
}

// ============================================================================
// MAIN ENGINE CLASS
// ============================================================================

/**
 * LatheActiveLearningEngine — Data-efficient learning with intelligent sampling.
 *
 * Usage:
 * ```typescript
 * const engine = new LatheActiveLearningEngine();
 *
 * // Initialize with labeled data
 * engine.initialize(labeledData);
 *
 * // Select most informative samples from pool
 * const selected = engine.selectSamples(unlabeledPool, 10);
 *
 * // Update model with new labels
 * engine.updateModel(newlyLabeledSamples);
 *
 * // Get experiment suggestions
 * const experiments = engine.suggestExperiments(budget);
 * ```
 */
export class LatheActiveLearningEngine {
  private pool: LatheDataPoint[] = [];
  private labeled: LatheDataPoint[] = [];
  private committee: CommitteeMember[] = [];
  private predictions: Map<string, PredictionWithUncertainty> = new Map();
  private budget: SampleBudget;
  private featureDimension: number = 0;
  private modelError: number = 1.0;

  constructor() {
    this.budget = {
      total_budget: DEFAULT_CONFIG.default_budget,
      spent: 0,
      remaining: DEFAULT_CONFIG.default_budget,
      cost_per_sample: DEFAULT_CONFIG.cost_per_experiment,
      experiments_completed: 0,
      experiments_planned: 0,
    };
  }

  /**
   * Initialize the active learning engine with labeled data.
   * @param labeledData - Initial labeled training data
   * @param poolData - Unlabeled data pool (optional)
   * @param budget - Sample budget (optional)
   */
  initialize(
    labeledData: LatheDataPoint[],
    poolData?: LatheDataPoint[],
    budget?: Partial<SampleBudget>
  ): void {
    this.labeled = labeledData.filter(p => p.is_labeled);
    this.pool = poolData || [];

    if (budget) {
      this.budget = { ...this.budget, ...budget };
    }

    // Determine feature dimension from first point
    if (this.labeled.length > 0) {
      this.featureDimension = encodeDataPoint(this.labeled[0]).dimension;
    } else if (this.pool.length > 0) {
      this.featureDimension = encodeDataPoint(this.pool[0]).dimension;
    }

    // Create and train committee
    this.committee = createCommittee(this.featureDimension, DEFAULT_CONFIG.committee_size);
    this.trainCommittee();

    // Generate initial predictions for pool
    this.updatePoolPredictions();

    log.info("LatheActiveLearningEngine initialized", {
      labeled_count: this.labeled.length,
      pool_count: this.pool.length,
      feature_dimension: this.featureDimension,
      committee_size: this.committee.length,
    });
  }

  /**
   * Train the committee on current labeled data.
   */
  private trainCommittee(): void {
    if (this.labeled.length < 5) return;

    const X = this.labeled.map(p => encodeDataPoint(p).vector);
    const y = this.labeled.map(p => (p.quality_class || 0) / 3);  // Normalize to [0, 1]

    // Train each committee member with bootstrapped data
    for (let i = 0; i < this.committee.length; i++) {
      // Bootstrap sample
      const indices = Array.from({ length: X.length }, () =>
        Math.floor(Math.random() * X.length));
      const X_boot = indices.map(idx => X[idx]);
      const y_boot = indices.map(idx => y[idx]);

      this.committee[i] = trainModel(
        this.committee[i],
        X_boot,
        y_boot,
        DEFAULT_CONFIG.learning_rate,
        50
      );
    }

    // Update model error estimate
    let totalError = 0;
    for (let i = 0; i < X.length; i++) {
      const preds = this.committee.map(m => predict(m, X[i]));
      const avgPred = preds.reduce((a, b) => a + b, 0) / preds.length;
      totalError += (avgPred - y[i]) ** 2;
    }
    this.modelError = totalError / X.length;
  }

  /**
   * Update predictions for all pool samples.
   */
  private updatePoolPredictions(): void {
    this.predictions.clear();

    for (const point of this.pool) {
      const features = encodeDataPoint(point).vector;
      const preds = this.committee.map(m => predict(m, features));

      const mean = preds.reduce((a, b) => a + b, 0) / preds.length;
      const variance = preds.reduce((sum, p) =>
        sum + (p - mean) ** 2, 0) / preds.length;

      // Convert to probability distribution for classification
      const probs = softmax(preds.map(p => p * 3), 1.0);  // Scale and softmax

      this.predictions.set(point.id, {
        point_id: point.id,
        prediction: mean,
        uncertainty: Math.sqrt(variance),
        confidence: 1 / (1 + variance),
        variance,
        probabilities: probs,
        entropy: entropy(probs),
      });
    }
  }

  /**
   * Select the most informative samples from the pool.
   * Main entry point for active learning selection.
   *
   * @param pool - Unlabeled data pool (or use internal pool)
   * @param n_samples - Number of samples to select
   * @param strategy - Query strategy to use
   * @returns Query result with selected samples
   */
  selectSamples(
    pool?: LatheDataPoint[],
    n_samples: number = 10,
    strategy: QueryStrategy = "hybrid"
  ): QueryResult {
    const targetPool = pool || this.pool;
    if (targetPool.length === 0) {
      return {
        selected_ids: [],
        scores: [],
        strategy_used: strategy,
        reasoning: ["Pool is empty"],
        expected_information_gain: 0,
        estimated_model_improvement: 0,
      };
    }

    // Encode pool if new
    if (pool) {
      this.pool = pool;
      this.updatePoolPredictions();
    }

    let scores: Map<string, number>;
    const reasoning: string[] = [];

    switch (strategy) {
      case "uncertainty_sampling":
        scores = uncertaintySampling(Array.from(this.predictions.values()));
        reasoning.push("Selected samples with highest prediction uncertainty");
        break;

      case "margin_sampling":
        scores = marginSampling(Array.from(this.predictions.values()));
        reasoning.push("Selected samples with smallest margin between top predictions");
        break;

      case "entropy_sampling":
        scores = entropySampling(Array.from(this.predictions.values()));
        reasoning.push("Selected samples with highest prediction entropy");
        break;

      case "query_by_committee":
        scores = queryByCommittee(targetPool, this.committee);
        reasoning.push("Selected samples where committee disagreement is highest");
        break;

      case "expected_model_change":
        scores = expectedModelChange(targetPool, this.committee[0]);
        reasoning.push("Selected samples expected to most change the model");
        break;

      case "expected_error_reduction":
        scores = informationGain(targetPool, this.labeled, this.committee[0]);
        reasoning.push("Selected samples expected to most reduce error");
        break;

      case "bald":
        scores = baldScoring(targetPool, this.committee);
        reasoning.push("Selected samples maximizing mutual information (BALD)");
        break;

      case "core_set": {
        const selected = coreSetSelection(targetPool, this.labeled, n_samples);
        return {
          selected_ids: selected,
          scores: selected.map(() => 1.0),
          strategy_used: strategy,
          reasoning: ["Core-set: Selected points maximizing coverage of feature space"],
          expected_information_gain: selected.length * 0.1,
          estimated_model_improvement: selected.length * 0.02,
        };
      }

      case "batch_bald": {
        const result = batchBald(targetPool, this.committee, n_samples);
        return {
          selected_ids: result.selected_ids,
          scores: result.greedy_gain_per_sample,
          strategy_used: strategy,
          reasoning: [
            "BatchBALD: Selected batch maximizing joint information gain",
            `Batch diversity: ${result.batch_diversity.toFixed(3)}`,
            `Batch uncertainty: ${result.batch_uncertainty.toFixed(3)}`,
          ],
          expected_information_gain: result.batch_uncertainty * n_samples,
          estimated_model_improvement: result.batch_diversity * 0.1,
        };
      }

      case "hybrid":
      default: {
        // Combine uncertainty and diversity
        const uncertaintyScores = uncertaintySampling(Array.from(this.predictions.values()));
        const result = diverseBatchSelection(
          targetPool,
          uncertaintyScores,
          n_samples,
          DEFAULT_CONFIG.diversity_weight
        );
        return {
          selected_ids: result.selected_ids,
          scores: result.greedy_gain_per_sample,
          strategy_used: "hybrid",
          reasoning: [
            "Hybrid: Balanced uncertainty and diversity",
            `Diversity weight: ${DEFAULT_CONFIG.diversity_weight}`,
            `Batch diversity: ${result.batch_diversity.toFixed(3)}`,
            `Batch uncertainty: ${result.batch_uncertainty.toFixed(3)}`,
          ],
          expected_information_gain: result.batch_uncertainty * n_samples,
          estimated_model_improvement: result.batch_diversity * 0.05,
        };
      }
    }

    // Sort by score and select top n
    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n_samples);

    return {
      selected_ids: sorted.map(([id]) => id),
      scores: sorted.map(([_, score]) => score),
      strategy_used: strategy,
      reasoning,
      expected_information_gain: sorted.reduce((sum, [_, s]) => sum + s, 0),
      estimated_model_improvement: sorted.length * this.modelError * 0.1,
    };
  }

  /**
   * Update the model with newly labeled samples.
   * Implements incremental learning.
   *
   * @param newSamples - Newly labeled data points
   * @returns Update result with metrics
   */
  updateModel(newSamples: LatheDataPoint[]): ModelUpdateResult {
    const previousError = this.modelError;
    const previousImportance = this.committee.length > 0
      ? [...this.committee[0].weights]
      : [];

    // Add new samples to labeled set
    const validSamples = newSamples.filter(s => s.is_labeled && s.quality_class !== undefined);
    this.labeled.push(...validSamples);

    // Remove from pool
    const newIds = new Set(validSamples.map(s => s.id));
    this.pool = this.pool.filter(p => !newIds.has(p.id));

    // Retrain committee
    this.trainCommittee();

    // Update predictions
    this.updatePoolPredictions();

    // Calculate feature importance change
    const importanceChange = new Map<string, number>();
    if (previousImportance.length > 0 && this.committee.length > 0) {
      const currentImportance = this.committee[0].weights;
      const featureNames = encodeDataPoint(validSamples[0] || this.labeled[0]).feature_names;
      for (let i = 0; i < featureNames.length; i++) {
        importanceChange.set(
          featureNames[i],
          Math.abs(currentImportance[i] - previousImportance[i])
        );
      }
    }

    // Update budget
    this.budget.spent += validSamples.length;
    this.budget.remaining = this.budget.total_budget - this.budget.spent;
    this.budget.experiments_completed += validSamples.length;

    const improvement = previousError - this.modelError;
    const convergenceStatus = improvement > DEFAULT_CONFIG.convergence_threshold
      ? "converging"
      : improvement < -DEFAULT_CONFIG.convergence_threshold
        ? "diverging"
        : "stable";

    return {
      samples_added: validSamples.length,
      previous_error: previousError,
      new_error: this.modelError,
      improvement,
      feature_importance_change: importanceChange,
      convergence_status: convergenceStatus,
      samples_until_convergence: convergenceStatus === "stable"
        ? 0
        : Math.ceil(this.modelError / Math.max(improvement, 0.01)),
    };
  }

  /**
   * Query uncertainty scores for pool samples.
   *
   * @param pool - Data pool (or use internal)
   * @returns Map of sample IDs to uncertainty scores
   */
  queryUncertainty(pool?: LatheDataPoint[]): Map<string, number> {
    if (pool) {
      this.pool = pool;
      this.updatePoolPredictions();
    }
    return uncertaintySampling(Array.from(this.predictions.values()));
  }

  /**
   * Query-by-committee scores for pool samples.
   *
   * @param pool - Data pool (or use internal)
   * @param committee - External committee (or use internal)
   * @returns Map of sample IDs to QBC scores
   */
  queryByCommittee(
    pool?: LatheDataPoint[],
    committee?: CommitteeMember[]
  ): Map<string, number> {
    const targetPool = pool || this.pool;
    const targetCommittee = committee || this.committee;
    return queryByCommittee(targetPool, targetCommittee);
  }

  /**
   * Suggest informative experiments within budget.
   *
   * @param budget - Available budget (or use internal)
   * @returns List of suggested experiments
   */
  suggestExperiments(budget?: SampleBudget): ExperimentSuggestion[] {
    const targetBudget = budget || this.budget;
    const suggestions: ExperimentSuggestion[] = [];

    // 1. Boundary experiments (highest priority)
    const boundaryExps = identifyBoundaryExperiments(this.pool, this.labeled);
    suggestions.push(...boundaryExps.slice(0, Math.ceil(targetBudget.remaining * 0.3)));

    // 2. Failure mode discovery
    const failureExps = identifyFailureModes(this.pool, this.labeled);
    suggestions.push(...failureExps.slice(0, Math.ceil(targetBudget.remaining * 0.2)));

    // 3. Physics-informed exploration
    const physicsExps = suggestPhysicsInformedExperiments(targetBudget, {
      materials: ["P", "M", "K"] as ISOGroup[],
      operations: ["roughing", "finishing"] as LatheOperation[],
      hardness_range: [20, 55],
      diameter_range: [20, 200],
    });
    suggestions.push(...physicsExps.slice(0, Math.ceil(targetBudget.remaining * 0.3)));

    // 4. Model-driven selection
    const modelSelected = this.selectSamples(
      undefined,
      Math.ceil(targetBudget.remaining * 0.2),
      "hybrid"
    );

    for (const id of modelSelected.selected_ids) {
      const point = this.pool.find(p => p.id === id);
      if (point) {
        const pred = this.predictions.get(id);
        suggestions.push({
          id: `model_${id}`,
          parameters: {
            material_iso: point.material_iso,
            operation: point.operation,
            hardness_hrc: point.hardness_hrc,
            diameter_mm: point.diameter_mm,
          },
          expected_information_gain: pred?.uncertainty || 0.5,
          exploration_score: 0.5,
          exploitation_score: pred?.uncertainty || 0.5,
          priority: pred && pred.uncertainty > 0.5 ? "high" : "medium",
          reasoning: `Model uncertainty: ${((pred?.uncertainty || 0) * 100).toFixed(1)}%`,
          estimated_cost: targetBudget.cost_per_sample,
          estimated_time_min: DEFAULT_CONFIG.time_per_experiment_min,
        });
      }
    }

    // Sort by priority and information gain
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    suggestions.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return b.expected_information_gain - a.expected_information_gain;
    });

    return suggestions.slice(0, targetBudget.remaining);
  }

  /**
   * Calculate information-theoretic metrics for a sample.
   *
   * @param pointId - Sample ID
   * @returns Information metrics
   */
  getInformationMetrics(pointId: string): InformationMetrics | null {
    const pred = this.predictions.get(pointId);
    if (!pred) return null;

    const point = this.pool.find(p => p.id === pointId);
    if (!point) return null;

    const features = encodeDataPoint(point).vector;

    // Get all committee predictions
    const committeePreds = this.committee.map(m => {
      const p = predict(m, features);
      const sigmoid = 1 / (1 + Math.exp(-p));
      return [1 - sigmoid, sigmoid];
    });

    // Mean prediction (posterior predictive)
    const meanProbs = [0, 0];
    for (const probs of committeePreds) {
      meanProbs[0] += probs[0] / this.committee.length;
      meanProbs[1] += probs[1] / this.committee.length;
    }

    // H[y|x,D] - entropy of posterior predictive
    const posteriorEntropy = entropy(meanProbs);

    // E_w[H[y|x,w,D]] - expected entropy of individual predictions
    const expectedEntropy = committeePreds.reduce((sum, probs) =>
      sum + entropy(probs), 0) / this.committee.length;

    // BALD score = mutual information
    const baldScore = posteriorEntropy - expectedEntropy;

    return {
      mutual_information: baldScore,
      conditional_entropy: expectedEntropy,
      expected_posterior_entropy: posteriorEntropy,
      information_gain: baldScore * 1.44,  // Convert nats to bits
      bald_score: baldScore,
    };
  }

  /**
   * Process operator feedback for a sample.
   *
   * @param feedback - Operator feedback
   * @returns Updated label and confidence
   */
  processOperatorFeedback(feedback: OperatorFeedback): {
    updated_label: number;
    updated_confidence: number;
    source: string;
  } {
    const point = this.labeled.find(p => p.id === feedback.experiment_id);
    if (!point || point.quality_class === undefined) {
      return {
        updated_label: feedback.actual_quality,
        updated_confidence: feedback.confidence,
        source: "operator",
      };
    }

    const result = processOperatorFeedback(feedback, {
      quality_class: point.quality_class,
      confidence: point.label_confidence || 0.5,
    });

    // Update the labeled point
    point.quality_class = result.quality_class as QualityClass;
    point.label_confidence = result.confidence;
    point.labeled_by = "operator";

    return {
      updated_label: result.quality_class,
      updated_confidence: result.confidence,
      source: result.source,
    };
  }

  /**
   * Generate expert queries for uncertain samples.
   *
   * @param n_queries - Maximum number of queries
   * @returns Expert queries
   */
  generateExpertQueries(n_queries: number = 10): ExpertQuery[] {
    // Select most uncertain samples
    const uncertainSamples = this.selectSamples(undefined, n_queries, "uncertainty_sampling");
    const samples = uncertainSamples.selected_ids
      .map(id => this.pool.find(p => p.id === id))
      .filter((p): p is LatheDataPoint => p !== undefined);

    // Generate queries and limit to requested count
    const allQueries = generateExpertQueries(samples, this.predictions);
    return allQueries.slice(0, n_queries);
  }

  /**
   * Assess label quality for all labeled samples.
   *
   * @param feedbackHistory - Historical feedback by sample ID
   * @returns Label quality assessments
   */
  assessAllLabels(
    feedbackHistory: Map<string, OperatorFeedback[]>
  ): LabelQualityAssessment[] {
    return this.labeled.map(point => {
      const feedback = feedbackHistory.get(point.id) || [];
      return assessLabelQuality(point, feedback);
    });
  }

  /**
   * Calibrate model confidence based on historical performance.
   *
   * @returns Calibration metrics
   */
  calibrateModelConfidence(): {
    slope: number;
    intercept: number;
    reliability_score: number;
    recommendation: string;
  } {
    const predictions: Array<{ prediction: number; confidence: number }> = [];
    const actuals: number[] = [];

    for (const point of this.labeled) {
      if (point.quality_class === undefined) continue;
      const pred = this.predictions.get(point.id);
      if (!pred) continue;

      predictions.push({
        prediction: pred.prediction,
        confidence: pred.confidence,
      });
      actuals.push(point.quality_class / 3);
    }

    const calibration = calibrateConfidence(predictions, actuals);

    let recommendation = "";
    if (calibration.reliability_score < 0.6) {
      recommendation = "Model poorly calibrated. Consider temperature scaling or more training data.";
    } else if (calibration.reliability_score < 0.8) {
      recommendation = "Model reasonably calibrated but could improve with more diverse samples.";
    } else {
      recommendation = "Model well calibrated. Confidence scores are reliable.";
    }

    return { ...calibration, recommendation };
  }

  /**
   * Get current budget status.
   */
  getBudget(): SampleBudget {
    return { ...this.budget };
  }

  /**
   * Get current model error estimate.
   */
  getModelError(): number {
    return this.modelError;
  }

  /**
   * Get pool size.
   */
  getPoolSize(): number {
    return this.pool.length;
  }

  /**
   * Get labeled data size.
   */
  getLabeledSize(): number {
    return this.labeled.length;
  }

  /**
   * Get committee size.
   */
  getCommitteeSize(): number {
    return this.committee.length;
  }

  /**
   * Export engine state for persistence.
   */
  exportState(): {
    labeled_ids: string[];
    pool_ids: string[];
    model_error: number;
    budget: SampleBudget;
    committee_weights: number[][];
  } {
    return {
      labeled_ids: this.labeled.map(p => p.id),
      pool_ids: this.pool.map(p => p.id),
      model_error: this.modelError,
      budget: { ...this.budget },
      committee_weights: this.committee.map(m => [...m.weights]),
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheActiveLearningEngine = new LatheActiveLearningEngine();
