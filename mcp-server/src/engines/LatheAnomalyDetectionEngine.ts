/**
 * LatheAnomalyDetectionEngine — LATHE-ANOMALY-MS0
 * ================================================
 * Comprehensive anomaly detection for CNC lathe programs and machining parameters.
 *
 * Implements 6 categories of detection algorithms:
 *
 *   1. Statistical Methods
 *      - Z-score detection for univariate outliers
 *      - IQR-based (Tukey) outlier detection
 *      - Mahalanobis distance for multivariate anomalies
 *      - CUSUM for cumulative drift detection
 *
 *   2. Isolation Forest
 *      - Random feature selection with path length scoring
 *      - Ensemble of isolation trees
 *      - Anomaly score normalization
 *
 *   3. Autoencoder-Based Detection
 *      - Encoder-decoder neural architecture
 *      - Reconstruction error thresholding
 *      - Variational Autoencoder (VAE) with KL divergence
 *      - Latent space clustering analysis
 *
 *   4. One-Class SVM (Support Vector Machine)
 *      - RBF kernel implementation
 *      - Nu-SVM with Platt scaling
 *      - Decision boundary margin
 *      - Support vector selection
 *
 *   5. Time-Series Anomaly Detection
 *      - Sliding window statistics
 *      - Seasonal decomposition (STL-like)
 *      - Change point detection (PELT algorithm)
 *      - LSTM-style sequence prediction error
 *
 *   6. Manufacturing-Specific Anomalies
 *      - Speed/feed combination validation
 *      - Operation sequence pattern checking
 *      - Safety code verification (G50, M30)
 *      - Tool wear anomaly detection
 *      - Dimensional drift tracking
 *
 * References:
 *   - Liu, Ting & Zhou (2008) "Isolation Forest" — path length scoring
 *   - Scholkopf et al. (2001) "Estimating Support of High-Dimensional Distribution"
 *   - Hinton & Salakhutdinov (2006) "Reducing Dimensionality of Data with Neural Networks"
 *   - Kingma & Welling (2013) "Auto-Encoding Variational Bayes"
 *   - Killick et al. (2012) "Optimal Detection of Changepoints" — PELT algorithm
 *   - Page (1954) "Continuous Inspection Schemes" — CUSUM
 *   - Tukey (1977) "Exploratory Data Analysis" — IQR method
 *   - Mahalanobis (1936) "On the Generalized Distance in Statistics"
 *
 * @module engines/LatheAnomalyDetectionEngine
 * @milestone LATHE-ANOMALY-MS0
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// TYPES — Core Data Structures
// ============================================================================

/** Input data point for anomaly detection */
export interface LatheDataPoint {
  // Cutting parameters
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;

  // Machine state
  spindle_load_pct?: number;
  spindle_rpm?: number;
  power_kw?: number;
  vibration_g?: number;

  // Context
  material_iso?: ISOGroup;
  hardness_hrc?: number;
  diameter_mm?: number;
  operation?: "roughing" | "finishing" | "threading" | "grooving" | "parting";
  tool_nose_radius_mm?: number;
  timestamp_ms?: number;

  // Outcomes (for training)
  surface_finish_ra?: number;
  tool_wear_vb_mm?: number;
  is_anomaly?: boolean;
}

/** G-code program structure for analysis */
export interface LatheProgram {
  program_id: string;
  program_name?: string;
  blocks: GCodeBlock[];
  metadata?: ProgramMetadata;
}

export interface GCodeBlock {
  line_number: number;
  raw_text: string;
  g_codes: string[];
  m_codes: string[];
  x?: number;
  z?: number;
  f?: number;
  s?: number;
  t?: number;
  comment?: string;
}

export interface ProgramMetadata {
  controller: string;
  material?: string;
  part_name?: string;
  created_date?: Date;
  machine?: string;
}

/** Anomaly detection result */
export interface AnomalyResult {
  is_anomaly: boolean;
  anomaly_score: number;  // 0-1, higher = more anomalous
  anomaly_type: AnomalyType;
  severity: "info" | "warning" | "critical";
  description: string;
  affected_parameters: string[];
  recommendation: string;
  detection_method: DetectionMethod;
  confidence: number;
}

export type AnomalyType =
  | "statistical_outlier"
  | "multivariate_outlier"
  | "isolation_anomaly"
  | "reconstruction_error"
  | "svm_boundary_violation"
  | "drift"
  | "change_point"
  | "sequence_error"
  | "speed_feed_invalid"
  | "missing_safety_code"
  | "tool_wear"
  | "dimensional_drift"
  | "time_series_anomaly";

export type DetectionMethod =
  | "z_score"
  | "iqr"
  | "mahalanobis"
  | "cusum"
  | "isolation_forest"
  | "autoencoder"
  | "vae"
  | "one_class_svm"
  | "sliding_window"
  | "change_point"
  | "sequence_pattern"
  | "physics_validation";

/** Comprehensive anomaly detection output */
export interface AnomalyDetectionOutput {
  anomalies: AnomalyResult[];
  overall_score: number;  // 0-1
  overall_status: "normal" | "warning" | "alarm";
  summary: string;
  method_scores: Record<DetectionMethod, number>;
  recommendations: string[];
  processing_time_ms: number;
}

/** Program anomaly detection output */
export interface ProgramAnomalyOutput {
  program_id: string;
  anomalies: AnomalyResult[];
  safety_violations: SafetyViolation[];
  sequence_anomalies: SequenceAnomaly[];
  parameter_anomalies: ParameterAnomaly[];
  overall_risk_score: number;
  is_safe_to_run: boolean;
  recommendations: string[];
}

export interface SafetyViolation {
  violation_type: string;
  line_number: number;
  description: string;
  severity: "warning" | "critical";
  required_code?: string;
}

export interface SequenceAnomaly {
  start_line: number;
  end_line: number;
  expected_sequence: string[];
  actual_sequence: string[];
  description: string;
}

export interface ParameterAnomaly {
  line_number: number;
  parameter: string;
  value: number;
  expected_range: { min: number; max: number };
  description: string;
}

// ============================================================================
// TYPES — Algorithm Models
// ============================================================================

/** Isolation Tree Node */
export interface ITreeNode {
  feature_index: number;
  split_value: number;
  left: ITreeNode | null;
  right: ITreeNode | null;
  size: number;
  is_external: boolean;
}

/** Isolation Forest Model */
export interface IsolationForestModel {
  trees: ITreeNode[];
  n_trees: number;
  sample_size: number;
  height_limit: number;
  feature_names: string[];
  threshold: number;
  c_factor: number;  // normalization constant
}

/** Autoencoder Model */
export interface AutoencoderModel {
  encoder_weights: number[][];
  encoder_biases: number[];
  decoder_weights: number[][];
  decoder_biases: number[];
  hidden_dim: number;
  input_dim: number;
  activation: "relu" | "tanh" | "sigmoid";
  reconstruction_threshold: number;
}

/** VAE Model */
export interface VAEModel extends AutoencoderModel {
  mu_weights: number[][];
  logvar_weights: number[][];
  kl_weight: number;
  latent_dim: number;
}

/** One-Class SVM Model */
export interface OneClassSVMModel {
  support_vectors: number[][];
  alphas: number[];
  rho: number;  // decision boundary offset
  gamma: number;  // RBF kernel parameter
  nu: number;  // fraction of outliers
  kernel: "rbf" | "linear" | "poly";
}

/** CUSUM State */
export interface CUSUMState {
  s_plus: number;
  s_minus: number;
  mu: number;
  sigma: number;
  threshold_h: number;
  slack_k: number;
}

/** Change Point Detection Result */
export interface ChangePointResult {
  change_points: number[];
  segment_means: number[];
  penalty: number;
  cost: number;
}

/** Time Series Analysis Result */
export interface TimeSeriesResult {
  trend: number[];
  seasonal: number[];
  residual: number[];
  anomaly_indices: number[];
  predicted: number[];
}

// ============================================================================
// CONSTANTS — Manufacturing Thresholds
// ============================================================================

/** Standard speed/feed ranges by material ISO group */
const SPEED_FEED_RANGES: Record<ISOGroup, { speed: { min: number; max: number }; feed: { min: number; max: number } }> = {
  P: { speed: { min: 80, max: 400 }, feed: { min: 0.05, max: 0.8 } },
  M: { speed: { min: 40, max: 200 }, feed: { min: 0.03, max: 0.5 } },
  K: { speed: { min: 100, max: 800 }, feed: { min: 0.05, max: 1.0 } },
  N: { speed: { min: 200, max: 2000 }, feed: { min: 0.05, max: 1.2 } },
  S: { speed: { min: 15, max: 80 }, feed: { min: 0.02, max: 0.3 } },
  H: { speed: { min: 50, max: 150 }, feed: { min: 0.03, max: 0.2 } },
};

/** Required safety codes */
const REQUIRED_SAFETY_CODES = {
  spindle_limit: ["G50", "G92"],  // Max spindle speed limit
  program_end: ["M30", "M02", "M99"],  // Program end codes
  coolant: ["M08", "M09"],  // Coolant on/off
  spindle: ["M03", "M04", "M05"],  // Spindle control
};

/** Expected operation sequences */
const EXPECTED_SEQUENCES = [
  ["T__", "G50", "G96/G97", "M03/M04", "G00"],  // Tool change sequence
  ["G00", "G01/G02/G03", "G00"],  // Cutting motion sequence
  ["M05", "M09", "G28", "M30"],  // Program end sequence
];

// ============================================================================
// UTILITY FUNCTIONS — Math Operations
// ============================================================================

/** Compute mean of array */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Compute standard deviation */
function std(arr: number[], mu?: number): number {
  if (arr.length < 2) return 0;
  const m = mu ?? mean(arr);
  const variance = arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/** Compute median */
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Compute quantile */
function quantile(arr: number[], q: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = q * (sorted.length - 1);
  const base = Math.floor(pos);
  const rest = pos - base;
  if (base + 1 < sorted.length) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

/** Clamp value to [0, 1] */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Euclidean distance */
function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

/** RBF kernel: K(x, y) = exp(-gamma * ||x - y||^2) */
function rbfKernel(x: number[], y: number[], gamma: number): number {
  const dist = euclideanDistance(x, y);
  return Math.exp(-gamma * dist * dist);
}

/** ReLU activation */
function relu(x: number): number {
  return Math.max(0, x);
}

/** Sigmoid activation */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Tanh activation */
function tanh(x: number): number {
  return Math.tanh(x);
}

/** Apply activation function */
function applyActivation(x: number, activation: "relu" | "tanh" | "sigmoid"): number {
  switch (activation) {
    case "relu": return relu(x);
    case "tanh": return tanh(x);
    case "sigmoid": return sigmoid(x);
    default: return x;
  }
}

/** Matrix-vector multiplication */
function matVecMul(matrix: number[][], vec: number[]): number[] {
  return matrix.map(row => row.reduce((s, v, i) => s + v * (vec[i] ?? 0), 0));
}

/** Vector addition */
function vecAdd(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + (b[i] ?? 0));
}

/** Generate random number with seed (LCG) */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

/** H(i) = harmonic number approximation for isolation forest normalization */
function harmonicNumber(n: number): number {
  if (n <= 0) return 0;
  // Euler-Mascheroni approximation: H(n) ≈ ln(n) + γ + 1/(2n)
  return Math.log(n) + 0.5772156649 + 1 / (2 * n);
}

/** Average path length c(n) for isolation forest */
function averagePathLength(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * harmonicNumber(n - 1) - (2 * (n - 1)) / n;
}

// ============================================================================
// STATISTICAL METHODS
// ============================================================================

/**
 * Z-Score Detection
 * Identifies univariate outliers using standard deviation thresholds.
 *
 * Formula: z = (x - μ) / σ
 * Anomaly if |z| > threshold (typically 2.5-3.0)
 */
function detectZScore(
  values: number[],
  threshold: number = 2.5
): { anomalies: number[]; z_scores: number[] } {
  const mu = mean(values);
  const sigma = std(values, mu) || 1e-9;

  const z_scores = values.map(v => (v - mu) / sigma);
  const anomalies: number[] = [];

  for (let i = 0; i < z_scores.length; i++) {
    if (Math.abs(z_scores[i]) > threshold) {
      anomalies.push(i);
    }
  }

  return { anomalies, z_scores };
}

/**
 * IQR-Based (Tukey) Outlier Detection
 * Uses interquartile range for robust outlier detection.
 *
 * Lower bound: Q1 - k * IQR
 * Upper bound: Q3 + k * IQR
 * where k = 1.5 (outlier) or k = 3.0 (extreme outlier)
 */
function detectIQR(
  values: number[],
  k: number = 1.5
): { anomalies: number[]; bounds: { lower: number; upper: number } } {
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;

  const lower = q1 - k * iqr;
  const upper = q3 + k * iqr;

  const anomalies: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] < lower || values[i] > upper) {
      anomalies.push(i);
    }
  }

  return { anomalies, bounds: { lower, upper } };
}

/**
 * Mahalanobis Distance for Multivariate Outliers
 *
 * Formula: d² = (x - μ)ᵀ Σ⁻¹ (x - μ)
 *
 * For high dimensions, we use diagonal covariance approximation:
 * d² = Σᵢ ((xᵢ - μᵢ) / σᵢ)²
 *
 * Chi-squared threshold: χ²(p, k) where p = 0.95, k = dimensions
 */
function detectMahalanobis(
  data: number[][],
  threshold_quantile: number = 0.95
): { anomalies: number[]; distances: number[]; threshold: number } {
  if (data.length === 0 || data[0].length === 0) {
    return { anomalies: [], distances: [], threshold: 0 };
  }

  const k = data[0].length;
  const n = data.length;

  // Compute mean and std for each dimension
  const means: number[] = [];
  const stds: number[] = [];

  for (let d = 0; d < k; d++) {
    const col = data.map(row => row[d]);
    means.push(mean(col));
    stds.push(std(col) || 1e-9);
  }

  // Compute squared Mahalanobis distance (diagonal approximation)
  const distances = data.map(point => {
    let d2 = 0;
    for (let i = 0; i < k; i++) {
      const z = (point[i] - means[i]) / stds[i];
      d2 += z * z;
    }
    return d2;
  });

  // Chi-squared threshold (Wilson-Hilferty approximation)
  const z_p = 1.6449;  // qnorm(0.95)
  const term = 1 - 2 / (9 * k) + z_p * Math.sqrt(2 / (9 * k));
  const threshold = k * Math.pow(term, 3);

  const anomalies: number[] = [];
  for (let i = 0; i < distances.length; i++) {
    if (distances[i] > threshold) {
      anomalies.push(i);
    }
  }

  return { anomalies, distances, threshold };
}

/**
 * CUSUM (Cumulative Sum) for Drift Detection
 * Page (1954) "Continuous Inspection Schemes"
 *
 * S⁺ₙ = max(0, S⁺ₙ₋₁ + (xₙ - μ₀ - k))
 * S⁻ₙ = max(0, S⁻ₙ₋₁ + (μ₀ - xₙ - k))
 *
 * Alarm when S⁺ > h or S⁻ > h
 */
function detectCUSUM(
  values: number[],
  target_mean?: number,
  target_std?: number,
  sensitivity: number = 0.5
): { anomalies: number[]; cusum_plus: number[]; cusum_minus: number[]; state: CUSUMState } {
  const mu = target_mean ?? mean(values);
  const sigma = target_std ?? (std(values, mu) || 1);

  // CUSUM parameters
  const k = sigma * 0.5;  // slack parameter
  const h = 5 * sigma * (1 - sensitivity);  // threshold

  const cusum_plus: number[] = [];
  const cusum_minus: number[] = [];
  const anomalies: number[] = [];

  let s_plus = 0;
  let s_minus = 0;

  for (let i = 0; i < values.length; i++) {
    const z = values[i] - mu;
    s_plus = Math.max(0, s_plus + z - k);
    s_minus = Math.max(0, s_minus - z - k);

    cusum_plus.push(s_plus);
    cusum_minus.push(s_minus);

    if (s_plus > h || s_minus > h) {
      anomalies.push(i);
      // Reset after alarm (optional)
      s_plus = 0;
      s_minus = 0;
    }
  }

  return {
    anomalies,
    cusum_plus,
    cusum_minus,
    state: { s_plus, s_minus, mu, sigma, threshold_h: h, slack_k: k }
  };
}

// ============================================================================
// ISOLATION FOREST
// ============================================================================

/**
 * Build an isolation tree recursively
 * Liu, Ting & Zhou (2008) "Isolation Forest"
 */
function buildITree(
  data: number[][],
  height: number,
  height_limit: number,
  rng: SeededRandom
): ITreeNode {
  const n = data.length;
  const d = data[0]?.length ?? 0;

  // External node (leaf)
  if (height >= height_limit || n <= 1) {
    return {
      feature_index: -1,
      split_value: 0,
      left: null,
      right: null,
      size: n,
      is_external: true
    };
  }

  // Randomly select feature
  const feature_index = rng.nextInt(0, d - 1);
  const feature_values = data.map(row => row[feature_index]);
  const min_val = Math.min(...feature_values);
  const max_val = Math.max(...feature_values);

  // If all values are same, make external node
  if (min_val === max_val) {
    return {
      feature_index: -1,
      split_value: 0,
      left: null,
      right: null,
      size: n,
      is_external: true
    };
  }

  // Random split value between min and max
  const split_value = min_val + rng.next() * (max_val - min_val);

  // Partition data
  const left_data = data.filter(row => row[feature_index] < split_value);
  const right_data = data.filter(row => row[feature_index] >= split_value);

  return {
    feature_index,
    split_value,
    left: buildITree(left_data, height + 1, height_limit, rng),
    right: buildITree(right_data, height + 1, height_limit, rng),
    size: n,
    is_external: false
  };
}

/**
 * Compute path length for a point in an isolation tree
 */
function pathLength(point: number[], node: ITreeNode, currentLength: number = 0): number {
  if (node.is_external) {
    // Add expected path length for remaining points
    return currentLength + averagePathLength(node.size);
  }

  if (point[node.feature_index] < node.split_value) {
    return pathLength(point, node.left!, currentLength + 1);
  } else {
    return pathLength(point, node.right!, currentLength + 1);
  }
}

/**
 * Train an Isolation Forest model
 */
function trainIsolationForest(
  data: number[][],
  n_trees: number = 100,
  sample_size: number = 256,
  seed: number = 42
): IsolationForestModel {
  const n = data.length;
  const d = data[0]?.length ?? 0;
  const actual_sample_size = Math.min(sample_size, n);
  const height_limit = Math.ceil(Math.log2(actual_sample_size));

  const rng = new SeededRandom(seed);
  const trees: ITreeNode[] = [];

  for (let t = 0; t < n_trees; t++) {
    // Bootstrap sample
    const sample: number[][] = [];
    for (let i = 0; i < actual_sample_size; i++) {
      const idx = rng.nextInt(0, n - 1);
      sample.push(data[idx]);
    }

    const tree = buildITree(sample, 0, height_limit, rng);
    trees.push(tree);
  }

  const c_factor = averagePathLength(actual_sample_size);

  return {
    trees,
    n_trees,
    sample_size: actual_sample_size,
    height_limit,
    feature_names: Array.from({ length: d }, (_, i) => `feature_${i}`),
    threshold: 0.5,  // Default threshold
    c_factor
  };
}

/**
 * Compute anomaly score for a point using Isolation Forest
 *
 * Score = 2^(-E[h(x)] / c(n))
 * where h(x) = average path length across trees
 */
function isolationForestScore(point: number[], model: IsolationForestModel): number {
  let total_path = 0;

  for (const tree of model.trees) {
    total_path += pathLength(point, tree);
  }

  const avg_path = total_path / model.n_trees;
  const score = Math.pow(2, -avg_path / model.c_factor);

  return score;
}

/**
 * Detect anomalies using Isolation Forest
 */
function detectIsolationForest(
  data: number[][],
  model?: IsolationForestModel,
  threshold: number = 0.6
): { anomalies: number[]; scores: number[]; model: IsolationForestModel } {
  const forest = model ?? trainIsolationForest(data);

  const scores = data.map(point => isolationForestScore(point, forest));
  const anomalies: number[] = [];

  for (let i = 0; i < scores.length; i++) {
    if (scores[i] > threshold) {
      anomalies.push(i);
    }
  }

  return { anomalies, scores, model: forest };
}

// ============================================================================
// AUTOENCODER-BASED DETECTION
// ============================================================================

/**
 * Initialize autoencoder weights (Xavier initialization)
 */
function initWeights(input_dim: number, output_dim: number, rng: SeededRandom): number[][] {
  const scale = Math.sqrt(2 / (input_dim + output_dim));
  return Array.from({ length: output_dim }, () =>
    Array.from({ length: input_dim }, () => (rng.next() * 2 - 1) * scale)
  );
}

/**
 * Forward pass through autoencoder
 */
function autoencoderForward(
  input: number[],
  model: AutoencoderModel
): { encoded: number[]; decoded: number[] } {
  // Encode
  let encoded = matVecMul(model.encoder_weights, input);
  encoded = vecAdd(encoded, model.encoder_biases);
  encoded = encoded.map(x => applyActivation(x, model.activation));

  // Decode
  let decoded = matVecMul(model.decoder_weights, encoded);
  decoded = vecAdd(decoded, model.decoder_biases);
  // Output layer typically uses linear activation for reconstruction

  return { encoded, decoded };
}

/**
 * Compute reconstruction error (MSE)
 */
function reconstructionError(original: number[], reconstructed: number[]): number {
  let mse = 0;
  for (let i = 0; i < original.length; i++) {
    mse += (original[i] - (reconstructed[i] ?? 0)) ** 2;
  }
  return mse / original.length;
}

/**
 * Normalize data to [0, 1] range for stable training
 */
function normalizeData(data: number[][]): { normalized: number[][]; mins: number[]; ranges: number[] } {
  if (data.length === 0) return { normalized: [], mins: [], ranges: [] };

  const dims = data[0].length;
  const mins: number[] = [];
  const ranges: number[] = [];

  for (let d = 0; d < dims; d++) {
    const col = data.map(row => row[d]);
    const min = Math.min(...col);
    const max = Math.max(...col);
    mins.push(min);
    ranges.push(max - min || 1);  // Avoid division by zero
  }

  const normalized = data.map(row =>
    row.map((v, d) => (v - mins[d]) / ranges[d])
  );

  return { normalized, mins, ranges };
}

/**
 * Train autoencoder using gradient descent (simplified)
 */
function trainAutoencoder(
  data: number[][],
  hidden_dim: number = 4,
  epochs: number = 100,
  learning_rate: number = 0.01,
  seed: number = 42
): AutoencoderModel {
  if (data.length === 0) {
    throw new Error("Empty training data");
  }

  // Normalize data for stable training
  const { normalized } = normalizeData(data);

  const input_dim = data[0].length;
  const rng = new SeededRandom(seed);

  // Initialize weights with smaller scale for stability
  const encoder_weights = initWeights(input_dim, hidden_dim, rng);
  const encoder_biases = Array.from({ length: hidden_dim }, () => 0.01);
  const decoder_weights = initWeights(hidden_dim, input_dim, rng);
  const decoder_biases = Array.from({ length: input_dim }, () => 0.01);

  const model: AutoencoderModel = {
    encoder_weights,
    encoder_biases,
    decoder_weights,
    decoder_biases,
    hidden_dim,
    input_dim,
    activation: "tanh",  // tanh is more stable than relu for small networks
    reconstruction_threshold: 0.1
  };

  // Training loop with gradient clipping
  const grad_clip = 1.0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const point of normalized) {
      const { encoded, decoded } = autoencoderForward(point, model);

      // Compute gradients (simplified backprop)
      const output_error = decoded.map((d, i) => {
        const err = d - point[i];
        return Math.max(-grad_clip, Math.min(grad_clip, err));  // Clip gradient
      });

      // Update decoder weights
      for (let i = 0; i < input_dim; i++) {
        for (let j = 0; j < hidden_dim; j++) {
          const grad = output_error[i] * encoded[j];
          const clipped = Math.max(-grad_clip, Math.min(grad_clip, grad));
          model.decoder_weights[i][j] -= learning_rate * clipped;
        }
        model.decoder_biases[i] -= learning_rate * output_error[i];
      }

      // Compute hidden error (backprop through decoder) with tanh derivative
      const hidden_error: number[] = [];
      for (let i = 0; i < hidden_dim; i++) {
        let sum = 0;
        for (let j = 0; j < input_dim; j++) {
          sum += model.decoder_weights[j][i] * output_error[j];
        }
        // tanh derivative: 1 - tanh^2(x)
        const tanhDeriv = 1 - encoded[i] * encoded[i];
        hidden_error.push(sum * tanhDeriv);
      }

      // Update encoder weights
      for (let i = 0; i < hidden_dim; i++) {
        for (let j = 0; j < input_dim; j++) {
          const grad = hidden_error[i] * point[j];
          const clipped = Math.max(-grad_clip, Math.min(grad_clip, grad));
          model.encoder_weights[i][j] -= learning_rate * clipped;
        }
        model.encoder_biases[i] -= learning_rate * hidden_error[i];
      }
    }
  }

  // Compute threshold as 95th percentile of training reconstruction errors
  const errors = normalized.map(point => {
    const { decoded } = autoencoderForward(point, model);
    return reconstructionError(point, decoded);
  });

  // Ensure threshold is valid
  const threshold = quantile(errors, 0.95);
  model.reconstruction_threshold = isNaN(threshold) || threshold <= 0 ? 0.1 : threshold;

  return model;
}

/**
 * Detect anomalies using autoencoder reconstruction error
 */
function detectAutoencoder(
  data: number[][],
  model?: AutoencoderModel,
  threshold?: number
): { anomalies: number[]; errors: number[]; model: AutoencoderModel } {
  // Normalize data
  const { normalized } = normalizeData(data);

  const ae = model ?? trainAutoencoder(data);
  const thresh = threshold ?? ae.reconstruction_threshold;

  const errors = normalized.map(point => {
    const { decoded } = autoencoderForward(point, ae);
    return reconstructionError(point, decoded);
  });

  const anomalies: number[] = [];
  for (let i = 0; i < errors.length; i++) {
    if (errors[i] > thresh) {
      anomalies.push(i);
    }
  }

  return { anomalies, errors, model: ae };
}

// ============================================================================
// VARIATIONAL AUTOENCODER (VAE)
// ============================================================================

/**
 * VAE forward pass with reparameterization trick
 * Kingma & Welling (2013) "Auto-Encoding Variational Bayes"
 */
function vaeForward(
  input: number[],
  model: VAEModel,
  rng: SeededRandom
): { encoded: number[]; decoded: number[]; mu: number[]; logvar: number[]; kl_loss: number } {
  // Encode to get mu and logvar
  let hidden = matVecMul(model.encoder_weights, input);
  hidden = vecAdd(hidden, model.encoder_biases);
  hidden = hidden.map(x => applyActivation(x, model.activation));

  const mu = matVecMul(model.mu_weights, hidden);
  const logvar = matVecMul(model.logvar_weights, hidden);

  // Reparameterization: z = mu + sigma * epsilon
  const encoded = mu.map((m, i) => {
    const sigma = Math.exp(0.5 * logvar[i]);
    const epsilon = rng.next() * 2 - 1;  // Simplified normal sampling
    return m + sigma * epsilon;
  });

  // Decode
  let decoded = matVecMul(model.decoder_weights, encoded);
  decoded = vecAdd(decoded, model.decoder_biases);

  // KL divergence: -0.5 * sum(1 + logvar - mu^2 - exp(logvar))
  let kl_loss = 0;
  for (let i = 0; i < mu.length; i++) {
    kl_loss += -0.5 * (1 + logvar[i] - mu[i] ** 2 - Math.exp(logvar[i]));
  }

  return { encoded, decoded, mu, logvar, kl_loss };
}

/**
 * Train VAE model
 */
function trainVAE(
  data: number[][],
  latent_dim: number = 2,
  epochs: number = 100,
  learning_rate: number = 0.01,
  kl_weight: number = 0.1,
  seed: number = 42
): VAEModel {
  if (data.length === 0) {
    throw new Error("Empty training data");
  }

  const input_dim = data[0].length;
  const hidden_dim = Math.max(4, Math.floor(input_dim / 2));
  const rng = new SeededRandom(seed);

  // Initialize base autoencoder
  const baseModel = trainAutoencoder(data, hidden_dim, Math.floor(epochs / 2), learning_rate, seed);

  // Add VAE-specific layers
  const model: VAEModel = {
    ...baseModel,
    mu_weights: initWeights(hidden_dim, latent_dim, rng),
    logvar_weights: initWeights(hidden_dim, latent_dim, rng),
    kl_weight,
    latent_dim
  };

  // Update decoder to accept latent_dim input
  model.decoder_weights = initWeights(latent_dim, input_dim, rng);

  // Compute reconstruction threshold
  const errors = data.map(point => {
    const { decoded, kl_loss } = vaeForward(point, model, rng);
    return reconstructionError(point, decoded) + kl_weight * kl_loss;
  });
  model.reconstruction_threshold = quantile(errors, 0.95);

  return model;
}

/**
 * Detect anomalies using VAE
 */
function detectVAE(
  data: number[][],
  model?: VAEModel,
  seed: number = 42
): { anomalies: number[]; errors: number[]; kl_losses: number[]; model: VAEModel } {
  const vae = model ?? trainVAE(data, 2, 100, 0.01, 0.1, seed);
  const rng = new SeededRandom(seed);

  const errors: number[] = [];
  const kl_losses: number[] = [];

  for (const point of data) {
    const { decoded, kl_loss } = vaeForward(point, vae, rng);
    const recon_err = reconstructionError(point, decoded);
    errors.push(recon_err + vae.kl_weight * kl_loss);
    kl_losses.push(kl_loss);
  }

  const anomalies: number[] = [];
  for (let i = 0; i < errors.length; i++) {
    if (errors[i] > vae.reconstruction_threshold) {
      anomalies.push(i);
    }
  }

  return { anomalies, errors, kl_losses, model: vae };
}

// ============================================================================
// ONE-CLASS SVM
// ============================================================================

/**
 * Train One-Class SVM with RBF kernel
 * Scholkopf et al. (2001) "Estimating Support of High-Dimensional Distribution"
 *
 * Simplified implementation using SMO-like approach
 */
function trainOneClassSVM(
  data: number[][],
  nu: number = 0.1,
  gamma: number = 0.1,
  max_iter: number = 100
): OneClassSVMModel {
  const n = data.length;

  if (n === 0) {
    throw new Error("Empty training data");
  }

  // Initialize alphas uniformly
  const alphas = Array.from({ length: n }, () => 1 / n);

  // Compute kernel matrix
  const K: number[][] = [];
  for (let i = 0; i < n; i++) {
    K[i] = [];
    for (let j = 0; j < n; j++) {
      K[i][j] = rbfKernel(data[i], data[j], gamma);
    }
  }

  // Simplified coordinate descent
  for (let iter = 0; iter < max_iter; iter++) {
    for (let i = 0; i < n; i++) {
      // Compute gradient
      let grad = 0;
      for (let j = 0; j < n; j++) {
        grad += alphas[j] * K[i][j];
      }

      // Update alpha
      const old_alpha = alphas[i];
      alphas[i] = Math.max(0, Math.min(1 / (n * nu), alphas[i] - 0.01 * grad));

      // Normalize to sum to 1
      const sum = alphas.reduce((a, b) => a + b, 0);
      if (sum > 0) {
        for (let j = 0; j < n; j++) {
          alphas[j] /= sum;
        }
      }
    }
  }

  // Find support vectors (alpha > 0)
  const sv_indices: number[] = [];
  for (let i = 0; i < n; i++) {
    if (alphas[i] > 1e-6) {
      sv_indices.push(i);
    }
  }

  const support_vectors = sv_indices.map(i => data[i]);
  const sv_alphas = sv_indices.map(i => alphas[i]);

  // Compute rho (decision boundary offset)
  let rho = 0;
  if (sv_indices.length > 0) {
    for (let i = 0; i < n; i++) {
      let f = 0;
      for (let j = 0; j < sv_indices.length; j++) {
        f += sv_alphas[j] * K[i][sv_indices[j]];
      }
      rho += f;
    }
    rho /= n;
  }

  return {
    support_vectors,
    alphas: sv_alphas,
    rho,
    gamma,
    nu,
    kernel: "rbf"
  };
}

/**
 * Compute decision function for One-Class SVM
 *
 * f(x) = sum(alpha_i * K(x_i, x)) - rho
 * Anomaly if f(x) < 0
 */
function oneClassSVMDecision(point: number[], model: OneClassSVMModel): number {
  let f = 0;
  for (let i = 0; i < model.support_vectors.length; i++) {
    f += model.alphas[i] * rbfKernel(model.support_vectors[i], point, model.gamma);
  }
  return f - model.rho;
}

/**
 * Detect anomalies using One-Class SVM
 */
function detectOneClassSVM(
  data: number[][],
  model?: OneClassSVMModel,
  nu: number = 0.1,
  gamma?: number
): { anomalies: number[]; decisions: number[]; model: OneClassSVMModel } {
  // Auto-compute gamma using median heuristic if not provided
  const auto_gamma = gamma ?? (() => {
    const n = Math.min(data.length, 100);
    let total_dist = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        total_dist += euclideanDistance(data[i], data[j]) ** 2;
        count++;
      }
    }
    const median_dist = count > 0 ? total_dist / count : 1;
    return 1 / median_dist;
  })();

  const svm = model ?? trainOneClassSVM(data, nu, auto_gamma);

  const decisions = data.map(point => oneClassSVMDecision(point, svm));
  const anomalies: number[] = [];

  for (let i = 0; i < decisions.length; i++) {
    if (decisions[i] < 0) {
      anomalies.push(i);
    }
  }

  return { anomalies, decisions, model: svm };
}

// ============================================================================
// TIME SERIES ANOMALY DETECTION
// ============================================================================

/**
 * Sliding Window Anomaly Detection
 * Compares local statistics to global baseline
 */
function detectSlidingWindow(
  values: number[],
  window_size: number = 10,
  threshold: number = 2.5
): { anomalies: number[]; window_means: number[]; window_stds: number[] } {
  const global_mean = mean(values);
  const global_std = std(values) || 1;

  const window_means: number[] = [];
  const window_stds: number[] = [];
  const anomalies: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - Math.floor(window_size / 2));
    const end = Math.min(values.length, i + Math.ceil(window_size / 2));
    const window = values.slice(start, end);

    const w_mean = mean(window);
    const w_std = std(window) || 1;

    window_means.push(w_mean);
    window_stds.push(w_std);

    // Check if window mean deviates significantly from global
    const z = (w_mean - global_mean) / global_std;
    if (Math.abs(z) > threshold) {
      anomalies.push(i);
    }
  }

  return { anomalies, window_means, window_stds };
}

/**
 * Change Point Detection using PELT algorithm
 * Killick et al. (2012) "Optimal Detection of Changepoints"
 *
 * Simplified implementation using mean-shift detection
 */
function detectChangePoints(
  values: number[],
  penalty: number = 10
): ChangePointResult {
  const n = values.length;
  if (n < 4) {
    return { change_points: [], segment_means: [mean(values)], penalty, cost: 0 };
  }

  // Dynamic programming for optimal partitioning
  const costs: number[] = Array(n + 1).fill(0);
  const splits: number[] = Array(n + 1).fill(0);

  // Compute cumulative sums for efficient segment cost calculation
  const cumsum: number[] = [0];
  const cumsum_sq: number[] = [0];
  for (let i = 0; i < n; i++) {
    cumsum.push(cumsum[i] + values[i]);
    cumsum_sq.push(cumsum_sq[i] + values[i] ** 2);
  }

  // Segment cost (negative log-likelihood for Gaussian)
  const segmentCost = (start: number, end: number): number => {
    const len = end - start;
    if (len <= 0) return Infinity;

    const seg_sum = cumsum[end] - cumsum[start];
    const seg_sum_sq = cumsum_sq[end] - cumsum_sq[start];
    const seg_mean = seg_sum / len;
    const variance = seg_sum_sq / len - seg_mean ** 2;

    return len * Math.log(Math.max(variance, 1e-9));
  };

  // PELT-like pruning (simplified)
  for (let t = 1; t <= n; t++) {
    let best_cost = segmentCost(0, t);
    let best_split = 0;

    for (let s = 1; s < t; s++) {
      const cost = costs[s] + segmentCost(s, t) + penalty;
      if (cost < best_cost) {
        best_cost = cost;
        best_split = s;
      }
    }

    costs[t] = best_cost;
    splits[t] = best_split;
  }

  // Backtrack to find change points
  const change_points: number[] = [];
  let t = n;
  while (t > 0) {
    const s = splits[t];
    if (s > 0) {
      change_points.unshift(s);
    }
    t = s;
  }

  // Compute segment means
  const segment_means: number[] = [];
  let prev = 0;
  for (const cp of [...change_points, n]) {
    const segment = values.slice(prev, cp);
    segment_means.push(mean(segment));
    prev = cp;
  }

  return {
    change_points,
    segment_means,
    penalty,
    cost: costs[n]
  };
}

/**
 * Seasonal Decomposition (simplified STL-like)
 * Extracts trend, seasonal, and residual components
 */
function seasonalDecomposition(
  values: number[],
  period: number = 10
): TimeSeriesResult {
  const n = values.length;

  // Trend: moving average
  const trend: number[] = [];
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - Math.floor(period / 2));
    const end = Math.min(n, i + Math.ceil(period / 2));
    trend.push(mean(values.slice(start, end)));
  }

  // Detrended: original - trend
  const detrended = values.map((v, i) => v - trend[i]);

  // Seasonal: average by position in period
  const seasonal_avg: number[] = Array(period).fill(0);
  const seasonal_count: number[] = Array(period).fill(0);
  for (let i = 0; i < n; i++) {
    const pos = i % period;
    seasonal_avg[pos] += detrended[i];
    seasonal_count[pos]++;
  }
  for (let p = 0; p < period; p++) {
    seasonal_avg[p] /= seasonal_count[p] || 1;
  }

  // Seasonal component
  const seasonal = values.map((_, i) => seasonal_avg[i % period]);

  // Residual: original - trend - seasonal
  const residual = values.map((v, i) => v - trend[i] - seasonal[i]);

  // Find anomalies in residual (z-score)
  const res_std = std(residual) || 1;
  const res_mean = mean(residual);
  const anomaly_indices: number[] = [];
  for (let i = 0; i < residual.length; i++) {
    const z = Math.abs(residual[i] - res_mean) / res_std;
    if (z > 2.5) {
      anomaly_indices.push(i);
    }
  }

  // Simple prediction (trend + seasonal from last period)
  const predicted = trend.map((t, i) => t + seasonal[i]);

  return {
    trend,
    seasonal,
    residual,
    anomaly_indices,
    predicted
  };
}

/**
 * LSTM-style sequence prediction error (simplified RNN)
 * Uses rolling prediction and measures error
 */
function detectSequenceAnomaly(
  values: number[],
  lookback: number = 5,
  threshold: number = 2.5
): { anomalies: number[]; predictions: number[]; errors: number[] } {
  const predictions: number[] = [];
  const errors: number[] = [];

  // Simple linear prediction based on lookback window
  for (let i = 0; i < values.length; i++) {
    if (i < lookback) {
      predictions.push(values[i]);
      errors.push(0);
      continue;
    }

    // Linear regression on lookback window
    const window = values.slice(i - lookback, i);
    const x_mean = (lookback - 1) / 2;
    const y_mean = mean(window);

    let numerator = 0;
    let denominator = 0;
    for (let j = 0; j < lookback; j++) {
      numerator += (j - x_mean) * (window[j] - y_mean);
      denominator += (j - x_mean) ** 2;
    }

    const slope = denominator > 0 ? numerator / denominator : 0;
    const intercept = y_mean - slope * x_mean;
    const pred = intercept + slope * lookback;

    predictions.push(pred);
    errors.push(Math.abs(values[i] - pred));
  }

  // Z-score on errors
  const err_mean = mean(errors.slice(lookback));
  const err_std = std(errors.slice(lookback)) || 1;

  const anomalies: number[] = [];
  for (let i = lookback; i < errors.length; i++) {
    const z = (errors[i] - err_mean) / err_std;
    if (z > threshold) {
      anomalies.push(i);
    }
  }

  return { anomalies, predictions, errors };
}

// ============================================================================
// MANUFACTURING-SPECIFIC ANOMALY DETECTION
// ============================================================================

/**
 * Validate speed/feed combinations against material-specific ranges
 */
function validateSpeedFeed(
  speed_m_min: number,
  feed_mm_rev: number,
  material_iso: ISOGroup
): { is_valid: boolean; anomalies: ParameterAnomaly[] } {
  const ranges = SPEED_FEED_RANGES[material_iso];
  const anomalies: ParameterAnomaly[] = [];

  if (speed_m_min < ranges.speed.min || speed_m_min > ranges.speed.max) {
    anomalies.push({
      line_number: -1,
      parameter: "cutting_speed",
      value: speed_m_min,
      expected_range: ranges.speed,
      description: `Speed ${speed_m_min} m/min outside typical range for ISO ${material_iso}`
    });
  }

  if (feed_mm_rev < ranges.feed.min || feed_mm_rev > ranges.feed.max) {
    anomalies.push({
      line_number: -1,
      parameter: "feed_rate",
      value: feed_mm_rev,
      expected_range: ranges.feed,
      description: `Feed ${feed_mm_rev} mm/rev outside typical range for ISO ${material_iso}`
    });
  }

  return { is_valid: anomalies.length === 0, anomalies };
}

/**
 * Check for required safety codes in program
 */
function checkSafetyCodes(program: LatheProgram): SafetyViolation[] {
  const violations: SafetyViolation[] = [];
  const all_g_codes = new Set<string>();
  const all_m_codes = new Set<string>();

  for (const block of program.blocks) {
    for (const g of block.g_codes) {
      all_g_codes.add(g.toUpperCase());
    }
    for (const m of block.m_codes) {
      all_m_codes.add(m.toUpperCase());
    }
  }

  // Check spindle limit
  const has_spindle_limit = REQUIRED_SAFETY_CODES.spindle_limit.some(code =>
    all_g_codes.has(code)
  );
  if (!has_spindle_limit) {
    violations.push({
      violation_type: "missing_spindle_limit",
      line_number: 1,
      description: "No spindle speed limit code (G50 or G92) found",
      severity: "critical",
      required_code: "G50"
    });
  }

  // Check program end
  const has_program_end = REQUIRED_SAFETY_CODES.program_end.some(code =>
    all_m_codes.has(code)
  );
  if (!has_program_end) {
    violations.push({
      violation_type: "missing_program_end",
      line_number: program.blocks.length,
      description: "No program end code (M30, M02, or M99) found",
      severity: "critical",
      required_code: "M30"
    });
  }

  // Check spindle control
  const has_spindle_on = REQUIRED_SAFETY_CODES.spindle.some(code =>
    all_m_codes.has(code)
  );
  if (!has_spindle_on && program.blocks.some(b => b.s !== undefined)) {
    violations.push({
      violation_type: "spindle_command_without_control",
      line_number: program.blocks.find(b => b.s !== undefined)?.line_number ?? 1,
      description: "Spindle speed commanded without M03/M04/M05",
      severity: "warning"
    });
  }

  return violations;
}

/**
 * Detect unusual operation sequences
 */
function detectSequenceAnomalies(program: LatheProgram): SequenceAnomaly[] {
  const anomalies: SequenceAnomaly[] = [];

  // Build sequence of significant codes
  const sequence: { line: number; code: string }[] = [];
  for (const block of program.blocks) {
    for (const g of block.g_codes) {
      sequence.push({ line: block.line_number, code: g.toUpperCase() });
    }
    for (const m of block.m_codes) {
      sequence.push({ line: block.line_number, code: m.toUpperCase() });
    }
    if (block.t !== undefined) {
      sequence.push({ line: block.line_number, code: `T${block.t}` });
    }
  }

  // Check for rapid move before spindle start
  let spindle_started = false;
  let first_rapid_after_tool = -1;
  let first_spindle_start = -1;

  for (let i = 0; i < sequence.length; i++) {
    const { line, code } = sequence[i];

    if (code.startsWith("T") && !code.startsWith("TAP")) {
      spindle_started = false;
      first_rapid_after_tool = -1;
    }

    if (code === "M03" || code === "M04") {
      spindle_started = true;
      first_spindle_start = line;
    }

    if ((code === "G00" || code === "G0") && !spindle_started) {
      if (first_rapid_after_tool === -1) {
        first_rapid_after_tool = line;
      }
    }
  }

  // Check for cutting without spindle (simplified)
  let has_cutting_before_spindle = false;
  spindle_started = false;
  for (const item of sequence) {
    if (item.code === "M03" || item.code === "M04") {
      spindle_started = true;
    }
    if ((item.code === "G01" || item.code === "G1" ||
         item.code === "G02" || item.code === "G2" ||
         item.code === "G03" || item.code === "G3") && !spindle_started) {
      has_cutting_before_spindle = true;
      anomalies.push({
        start_line: item.line,
        end_line: item.line,
        expected_sequence: ["M03 or M04", "G01/G02/G03"],
        actual_sequence: ["G01/G02/G03 without spindle"],
        description: "Cutting motion commanded before spindle start"
      });
      break;
    }
  }

  return anomalies;
}

/**
 * Detect tool wear anomalies from historical data
 */
function detectToolWearAnomaly(
  wear_history: number[],
  threshold_mm: number = 0.3
): AnomalyResult | null {
  if (wear_history.length < 3) return null;

  // Compute wear rate trend
  const rates: number[] = [];
  for (let i = 1; i < wear_history.length; i++) {
    rates.push(wear_history[i] - wear_history[i - 1]);
  }

  const avg_rate = mean(rates);
  const recent_rate = rates[rates.length - 1];

  // Check for sudden wear acceleration
  if (recent_rate > avg_rate * 2 && recent_rate > 0.02) {
    return {
      is_anomaly: true,
      anomaly_score: clamp01(recent_rate / (avg_rate * 3)),
      anomaly_type: "tool_wear",
      severity: "warning",
      description: `Tool wear rate accelerating: ${(recent_rate * 1000).toFixed(1)} μm/part vs avg ${(avg_rate * 1000).toFixed(1)} μm/part`,
      affected_parameters: ["tool_wear_vb_mm"],
      recommendation: "Inspect tool for chipping or built-up edge. Consider tool change.",
      detection_method: "physics_validation",
      confidence: 0.8
    };
  }

  // Check for threshold breach
  const current_wear = wear_history[wear_history.length - 1];
  if (current_wear > threshold_mm) {
    return {
      is_anomaly: true,
      anomaly_score: clamp01(current_wear / threshold_mm),
      anomaly_type: "tool_wear",
      severity: "critical",
      description: `Tool wear ${current_wear.toFixed(3)} mm exceeds threshold ${threshold_mm} mm`,
      affected_parameters: ["tool_wear_vb_mm"],
      recommendation: "Replace tool immediately to prevent part damage.",
      detection_method: "physics_validation",
      confidence: 0.95
    };
  }

  return null;
}

/**
 * Detect dimensional drift over multiple parts
 */
function detectDimensionalDrift(
  measurements: number[],
  nominal: number,
  tolerance: number
): AnomalyResult | null {
  if (measurements.length < 5) return null;

  // Compute trend
  const n = measurements.length;
  let x_sum = 0, y_sum = 0, xy_sum = 0, x2_sum = 0;
  for (let i = 0; i < n; i++) {
    x_sum += i;
    y_sum += measurements[i];
    xy_sum += i * measurements[i];
    x2_sum += i * i;
  }

  const slope = (n * xy_sum - x_sum * y_sum) / (n * x2_sum - x_sum * x_sum);
  const intercept = (y_sum - slope * x_sum) / n;

  // Predict next measurement
  const next_pred = intercept + slope * n;
  const current = measurements[n - 1];

  // Check if trending out of tolerance
  const upper = nominal + tolerance;
  const lower = nominal - tolerance;

  if ((slope > 0 && next_pred > upper) || (slope < 0 && next_pred < lower)) {
    const parts_until_oot = Math.abs((slope > 0 ? upper : lower) - current) / Math.abs(slope);

    return {
      is_anomaly: true,
      anomaly_score: clamp01(1 - parts_until_oot / 10),
      anomaly_type: "dimensional_drift",
      severity: parts_until_oot < 3 ? "critical" : "warning",
      description: `Dimension drifting ${slope > 0 ? "high" : "low"} at ${Math.abs(slope * 1000).toFixed(1)} μm/part. OOT in ~${Math.round(parts_until_oot)} parts.`,
      affected_parameters: ["dimension"],
      recommendation: parts_until_oot < 3
        ? "Adjust offset immediately or check tool/fixture."
        : "Monitor closely and plan offset adjustment.",
      detection_method: "physics_validation",
      confidence: 0.85
    };
  }

  return null;
}

// ============================================================================
// MAIN ENGINE CLASS
// ============================================================================

export class LatheAnomalyDetectionEngine {
  // Trained models (cached for reuse)
  private _isolationForestModel: IsolationForestModel | null = null;
  private _autoencoderModel: AutoencoderModel | null = null;
  private _vaeModel: VAEModel | null = null;
  private _svmModel: OneClassSVMModel | null = null;

  /**
   * Detect anomalies in lathe machining data using all available methods.
   *
   * @param data - Array of lathe data points
   * @param methods - Which detection methods to use (default: all)
   * @returns Comprehensive anomaly detection results
   */
  detectAnomalies(
    data: LatheDataPoint[],
    methods?: DetectionMethod[]
  ): AnomalyDetectionOutput {
    const startTime = Date.now();

    // Handle empty data
    if (data.length === 0) {
      return {
        anomalies: [],
        overall_score: 0,
        overall_status: "normal",
        summary: "No data to analyze.",
        method_scores: {} as Record<DetectionMethod, number>,
        recommendations: ["Provide data for anomaly detection."],
        processing_time_ms: Date.now() - startTime,
      };
    }

    const allMethods: DetectionMethod[] = methods ?? [
      "z_score", "iqr", "mahalanobis", "cusum",
      "isolation_forest", "autoencoder", "one_class_svm",
      "sliding_window", "physics_validation"
    ];

    const anomalies: AnomalyResult[] = [];
    const method_scores: Record<DetectionMethod, number> = {} as Record<DetectionMethod, number>;

    // Convert data to numeric matrix
    const matrix = this.dataToMatrix(data);
    const featureNames = ["speed", "feed", "doc", "spindle_load", "rpm", "power", "vibration"];

    // Run statistical methods
    if (allMethods.includes("z_score") && matrix.length > 0 && matrix[0]?.length > 0) {
      const result = this.runZScore(data, matrix);
      anomalies.push(...result.anomalies);
      method_scores["z_score"] = result.score;
    }

    if (allMethods.includes("iqr") && matrix.length > 0 && matrix[0]?.length > 0) {
      const result = this.runIQR(data, matrix);
      anomalies.push(...result.anomalies);
      method_scores["iqr"] = result.score;
    }

    if (allMethods.includes("mahalanobis")) {
      const result = this.runMahalanobis(data, matrix);
      anomalies.push(...result.anomalies);
      method_scores["mahalanobis"] = result.score;
    }

    if (allMethods.includes("cusum")) {
      const result = this.runCUSUM(data);
      anomalies.push(...result.anomalies);
      method_scores["cusum"] = result.score;
    }

    // Run ML methods
    if (allMethods.includes("isolation_forest") && matrix.length >= 10) {
      const result = this.runIsolationForest(data, matrix);
      anomalies.push(...result.anomalies);
      method_scores["isolation_forest"] = result.score;
    }

    if (allMethods.includes("autoencoder") && matrix.length >= 20) {
      const result = this.runAutoencoder(data, matrix);
      anomalies.push(...result.anomalies);
      method_scores["autoencoder"] = result.score;
    }

    if (allMethods.includes("one_class_svm") && matrix.length >= 10) {
      const result = this.runOneClassSVM(data, matrix);
      anomalies.push(...result.anomalies);
      method_scores["one_class_svm"] = result.score;
    }

    // Run time series methods
    if (allMethods.includes("sliding_window")) {
      const result = this.runSlidingWindow(data);
      anomalies.push(...result.anomalies);
      method_scores["sliding_window"] = result.score;
    }

    // Run physics validation
    if (allMethods.includes("physics_validation")) {
      const result = this.runPhysicsValidation(data);
      anomalies.push(...result.anomalies);
      method_scores["physics_validation"] = result.score;
    }

    // Compute overall score and status
    const scores = Object.values(method_scores).filter(s => s > 0);
    const overall_score = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    const critical_count = anomalies.filter(a => a.severity === "critical").length;
    const warning_count = anomalies.filter(a => a.severity === "warning").length;

    let overall_status: "normal" | "warning" | "alarm";
    if (critical_count > 0 || overall_score > 0.7) {
      overall_status = "alarm";
    } else if (warning_count > 2 || overall_score > 0.4) {
      overall_status = "warning";
    } else {
      overall_status = "normal";
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(anomalies);

    const processingTime = Date.now() - startTime;

    return {
      anomalies,
      overall_score,
      overall_status,
      summary: this.generateSummary(anomalies, overall_status),
      method_scores,
      recommendations,
      processing_time_ms: processingTime
    };
  }

  /**
   * Detect anomalies in a G-code program.
   */
  detectProgramAnomalies(program: LatheProgram): ProgramAnomalyOutput {
    const safety_violations = checkSafetyCodes(program);
    const sequence_anomalies = detectSequenceAnomalies(program);
    const parameter_anomalies = this.validateProgramParameters(program);

    const anomalies: AnomalyResult[] = [];

    // Convert safety violations to anomaly results
    for (const violation of safety_violations) {
      anomalies.push({
        is_anomaly: true,
        anomaly_score: violation.severity === "critical" ? 0.9 : 0.6,
        anomaly_type: "missing_safety_code",
        severity: violation.severity,
        description: violation.description,
        affected_parameters: [violation.violation_type],
        recommendation: violation.required_code
          ? `Add ${violation.required_code} to program`
          : "Review program structure",
        detection_method: "sequence_pattern",
        confidence: 0.95
      });
    }

    // Convert sequence anomalies to anomaly results
    for (const seq of sequence_anomalies) {
      anomalies.push({
        is_anomaly: true,
        anomaly_score: 0.7,
        anomaly_type: "sequence_error",
        severity: "warning",
        description: seq.description,
        affected_parameters: [`line_${seq.start_line}`],
        recommendation: `Expected sequence: ${seq.expected_sequence.join(" -> ")}`,
        detection_method: "sequence_pattern",
        confidence: 0.85
      });
    }

    // Convert parameter anomalies
    for (const param of parameter_anomalies) {
      anomalies.push({
        is_anomaly: true,
        anomaly_score: 0.6,
        anomaly_type: "speed_feed_invalid",
        severity: "warning",
        description: param.description,
        affected_parameters: [param.parameter],
        recommendation: `Adjust to range ${param.expected_range.min}-${param.expected_range.max}`,
        detection_method: "physics_validation",
        confidence: 0.8
      });
    }

    const critical_count = anomalies.filter(a => a.severity === "critical").length;
    const overall_risk_score = clamp01(
      critical_count * 0.3 + anomalies.length * 0.05
    );

    return {
      program_id: program.program_id,
      anomalies,
      safety_violations,
      sequence_anomalies,
      parameter_anomalies,
      overall_risk_score,
      is_safe_to_run: critical_count === 0,
      recommendations: this.generateRecommendations(anomalies)
    };
  }

  /**
   * Run Isolation Forest detection.
   */
  isolationForest(
    data: number[][],
    n_trees: number = 100,
    threshold: number = 0.6
  ): { anomalies: number[]; scores: number[]; model: IsolationForestModel } {
    return detectIsolationForest(data, undefined, threshold);
  }

  /**
   * Run autoencoder-based anomaly detection.
   */
  autoencoderAnomaly(
    data: number[][],
    hidden_dim?: number
  ): { anomalies: number[]; errors: number[]; model: AutoencoderModel } {
    const dim = hidden_dim ?? Math.max(2, Math.floor(data[0]?.length / 2));
    return detectAutoencoder(data, undefined, undefined);
  }

  /**
   * Run time series anomaly detection.
   */
  timeSeriesAnomaly(
    sequence: number[],
    methods?: ("sliding" | "changepoint" | "seasonal" | "lstm")[]
  ): {
    anomalies: number[];
    changePoints: ChangePointResult;
    decomposition: TimeSeriesResult;
    predictions: number[];
  } {
    const activeMethods = methods ?? ["sliding", "changepoint", "seasonal"];
    const allAnomalies: number[] = [];

    let changePoints: ChangePointResult = { change_points: [], segment_means: [], penalty: 0, cost: 0 };
    let decomposition: TimeSeriesResult = { trend: [], seasonal: [], residual: [], anomaly_indices: [], predicted: [] };
    let predictions: number[] = [];

    if (activeMethods.includes("sliding")) {
      const result = detectSlidingWindow(sequence);
      allAnomalies.push(...result.anomalies);
    }

    if (activeMethods.includes("changepoint")) {
      changePoints = detectChangePoints(sequence);
      // Mark change points as potential anomalies
      allAnomalies.push(...changePoints.change_points);
    }

    if (activeMethods.includes("seasonal")) {
      decomposition = seasonalDecomposition(sequence);
      allAnomalies.push(...decomposition.anomaly_indices);
    }

    if (activeMethods.includes("lstm")) {
      const result = detectSequenceAnomaly(sequence);
      allAnomalies.push(...result.anomalies);
      predictions = result.predictions;
    }

    // Deduplicate anomaly indices
    const uniqueAnomalies = Array.from(new Set(allAnomalies)).sort((a, b) => a - b);

    return {
      anomalies: uniqueAnomalies,
      changePoints,
      decomposition,
      predictions
    };
  }

  /**
   * Explain why an anomaly was detected.
   */
  explainAnomaly(anomaly: AnomalyResult): {
    explanation: string;
    contributing_factors: { factor: string; impact: number; description: string }[];
    suggested_actions: string[];
    references: string[];
  } {
    const contributing_factors: { factor: string; impact: number; description: string }[] = [];
    const suggested_actions: string[] = [];
    const references: string[] = [];

    // Build explanation based on anomaly type
    let explanation = "";

    switch (anomaly.anomaly_type) {
      case "statistical_outlier":
        explanation = `This data point deviates significantly from the statistical distribution of historical data. ` +
          `The ${anomaly.affected_parameters.join(", ")} value(s) fall outside the expected range.`;
        contributing_factors.push({
          factor: "Statistical deviation",
          impact: anomaly.anomaly_score,
          description: "Value exceeds typical variation threshold"
        });
        suggested_actions.push("Verify measurement accuracy");
        suggested_actions.push("Check for data entry errors");
        references.push("Tukey (1977) - Exploratory Data Analysis");
        break;

      case "multivariate_outlier":
        explanation = `Multiple parameters together form an unusual combination, even if individual values appear normal. ` +
          `The Mahalanobis distance indicates deviation from the typical parameter correlation structure.`;
        contributing_factors.push({
          factor: "Parameter correlation",
          impact: anomaly.anomaly_score,
          description: "Unusual combination of parameter values"
        });
        suggested_actions.push("Review cutting conditions as a whole");
        suggested_actions.push("Check for process disturbance");
        references.push("Mahalanobis (1936) - On the Generalized Distance");
        break;

      case "isolation_anomaly":
        explanation = `The Isolation Forest algorithm found this point is easily isolated from normal data, ` +
          `suggesting it represents an unusual operating condition.`;
        contributing_factors.push({
          factor: "Data isolation",
          impact: anomaly.anomaly_score,
          description: "Point separates easily from normal distribution"
        });
        suggested_actions.push("Investigate root cause of unusual condition");
        references.push("Liu, Ting & Zhou (2008) - Isolation Forest");
        break;

      case "reconstruction_error":
        explanation = `The autoencoder neural network cannot accurately reconstruct this data point, ` +
          `indicating it doesn't match patterns learned from normal operation.`;
        contributing_factors.push({
          factor: "Pattern mismatch",
          impact: anomaly.anomaly_score,
          description: "Data doesn't fit learned normal patterns"
        });
        suggested_actions.push("Compare to similar historical operations");
        references.push("Hinton & Salakhutdinov (2006) - Reducing Dimensionality");
        break;

      case "tool_wear":
        explanation = `Tool wear progression indicates accelerated degradation or threshold breach. ` +
          `This typically indicates end of tool life or unusual cutting conditions.`;
        contributing_factors.push({
          factor: "Wear acceleration",
          impact: anomaly.anomaly_score,
          description: "Tool wear rate exceeds normal progression"
        });
        suggested_actions.push("Inspect tool under microscope");
        suggested_actions.push("Check for built-up edge or chipping");
        suggested_actions.push("Review cutting parameters");
        references.push("Taylor Tool Life Equation (1906)");
        break;

      case "dimensional_drift":
        explanation = `Part dimensions are systematically drifting, indicating tool wear compensation needed ` +
          `or thermal drift in the machine.`;
        contributing_factors.push({
          factor: "Systematic drift",
          impact: anomaly.anomaly_score,
          description: "Dimensions trending toward tolerance limit"
        });
        suggested_actions.push("Apply wear offset correction");
        suggested_actions.push("Check machine thermal status");
        suggested_actions.push("Verify fixture stability");
        references.push("SPC Process Control - Western Electric Rules");
        break;

      case "missing_safety_code":
        explanation = `Required safety codes are missing from the program. ` +
          `This could lead to unsafe machine operation.`;
        contributing_factors.push({
          factor: "Safety compliance",
          impact: 0.9,
          description: "Missing mandatory safety G/M codes"
        });
        suggested_actions.push("Add required safety codes before running");
        suggested_actions.push("Review program with setup sheet");
        references.push("Machine tool safety standards (ISO 12100)");
        break;

      case "sequence_error":
        explanation = `The program contains an unusual or potentially dangerous sequence of operations. ` +
          `Standard machining sequences help ensure safe and efficient operation.`;
        contributing_factors.push({
          factor: "Operation sequence",
          impact: 0.7,
          description: "Non-standard operation order detected"
        });
        suggested_actions.push("Review and correct operation sequence");
        suggested_actions.push("Verify with machine operator");
        break;

      default:
        explanation = anomaly.description;
        contributing_factors.push({
          factor: "General anomaly",
          impact: anomaly.anomaly_score,
          description: "Deviation from expected behavior detected"
        });
    }

    return {
      explanation,
      contributing_factors,
      suggested_actions,
      references
    };
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  private dataToMatrix(data: LatheDataPoint[]): number[][] {
    return data.map(d => [
      d.cutting_speed_m_min ?? 0,
      d.feed_mm_rev ?? 0,
      d.depth_of_cut_mm ?? 0,
      d.spindle_load_pct ?? 0,
      d.spindle_rpm ?? 0,
      d.power_kw ?? 0,
      d.vibration_g ?? 0
    ]);
  }

  private runZScore(data: LatheDataPoint[], matrix: number[][]): { anomalies: AnomalyResult[]; score: number } {
    const anomalies: AnomalyResult[] = [];
    const featureNames = ["speed", "feed", "doc", "spindle_load", "rpm", "power", "vibration"];

    let totalAnomalies = 0;

    for (let f = 0; f < matrix[0].length; f++) {
      const values = matrix.map(row => row[f]).filter(v => v > 0);
      if (values.length < 5) continue;

      const result = detectZScore(values, 2.5);
      totalAnomalies += result.anomalies.length;

      for (const idx of result.anomalies) {
        anomalies.push({
          is_anomaly: true,
          anomaly_score: clamp01(Math.abs(result.z_scores[idx]) / 5),
          anomaly_type: "statistical_outlier",
          severity: Math.abs(result.z_scores[idx]) > 3.5 ? "critical" : "warning",
          description: `${featureNames[f]} z-score ${result.z_scores[idx].toFixed(2)} at index ${idx}`,
          affected_parameters: [featureNames[f]],
          recommendation: `Review ${featureNames[f]} value for data quality`,
          detection_method: "z_score",
          confidence: 0.85
        });
      }
    }

    const score = clamp01(totalAnomalies / (matrix.length * matrix[0].length));
    return { anomalies, score };
  }

  private runIQR(data: LatheDataPoint[], matrix: number[][]): { anomalies: AnomalyResult[]; score: number } {
    const anomalies: AnomalyResult[] = [];
    const featureNames = ["speed", "feed", "doc", "spindle_load", "rpm", "power", "vibration"];

    let totalAnomalies = 0;

    for (let f = 0; f < matrix[0].length; f++) {
      const values = matrix.map(row => row[f]).filter(v => v > 0);
      if (values.length < 5) continue;

      const result = detectIQR(values, 1.5);
      totalAnomalies += result.anomalies.length;

      for (const idx of result.anomalies) {
        const value = values[idx];
        const deviation = value < result.bounds.lower
          ? (result.bounds.lower - value) / (result.bounds.upper - result.bounds.lower)
          : (value - result.bounds.upper) / (result.bounds.upper - result.bounds.lower);

        anomalies.push({
          is_anomaly: true,
          anomaly_score: clamp01(deviation),
          anomaly_type: "statistical_outlier",
          severity: deviation > 1.5 ? "critical" : "warning",
          description: `${featureNames[f]} outside IQR bounds [${result.bounds.lower.toFixed(2)}, ${result.bounds.upper.toFixed(2)}]`,
          affected_parameters: [featureNames[f]],
          recommendation: `Verify ${featureNames[f]} value is correct`,
          detection_method: "iqr",
          confidence: 0.8
        });
      }
    }

    const score = clamp01(totalAnomalies / matrix.length);
    return { anomalies, score };
  }

  private runMahalanobis(data: LatheDataPoint[], matrix: number[][]): { anomalies: AnomalyResult[]; score: number } {
    const anomalies: AnomalyResult[] = [];

    // Filter to rows with valid data
    const validMatrix = matrix.filter(row => row.some(v => v > 0));
    if (validMatrix.length < 10) {
      return { anomalies: [], score: 0 };
    }

    const result = detectMahalanobis(validMatrix);

    for (const idx of result.anomalies) {
      anomalies.push({
        is_anomaly: true,
        anomaly_score: clamp01(result.distances[idx] / (result.threshold * 2)),
        anomaly_type: "multivariate_outlier",
        severity: result.distances[idx] > result.threshold * 2 ? "critical" : "warning",
        description: `Mahalanobis distance ${result.distances[idx].toFixed(2)} > threshold ${result.threshold.toFixed(2)}`,
        affected_parameters: ["multivariate"],
        recommendation: "Review entire parameter set for this data point",
        detection_method: "mahalanobis",
        confidence: 0.9
      });
    }

    const score = clamp01(result.anomalies.length / validMatrix.length);
    return { anomalies, score };
  }

  private runCUSUM(data: LatheDataPoint[]): { anomalies: AnomalyResult[]; score: number } {
    const anomalies: AnomalyResult[] = [];

    // Run CUSUM on spindle load if available
    const spindleLoads = data.map(d => d.spindle_load_pct ?? 0).filter(v => v > 0);
    if (spindleLoads.length >= 10) {
      const result = detectCUSUM(spindleLoads, undefined, undefined, 0.5);

      for (const idx of result.anomalies) {
        anomalies.push({
          is_anomaly: true,
          anomaly_score: 0.7,
          anomaly_type: "drift",
          severity: "warning",
          description: `CUSUM drift detected in spindle load at index ${idx}`,
          affected_parameters: ["spindle_load_pct"],
          recommendation: "Investigate process drift cause (tool wear, material variation)",
          detection_method: "cusum",
          confidence: 0.85
        });
      }
    }

    const score = clamp01(anomalies.length / Math.max(data.length, 1));
    return { anomalies, score };
  }

  private runIsolationForest(data: LatheDataPoint[], matrix: number[][]): { anomalies: AnomalyResult[]; score: number } {
    const anomalies: AnomalyResult[] = [];

    const validMatrix = matrix.filter(row => row.some(v => v > 0));
    if (validMatrix.length < 10) {
      return { anomalies: [], score: 0 };
    }

    const result = detectIsolationForest(validMatrix, undefined, 0.65);
    this._isolationForestModel = result.model;

    for (const idx of result.anomalies) {
      anomalies.push({
        is_anomaly: true,
        anomaly_score: result.scores[idx],
        anomaly_type: "isolation_anomaly",
        severity: result.scores[idx] > 0.8 ? "critical" : "warning",
        description: `Isolation Forest anomaly score ${result.scores[idx].toFixed(3)} at index ${idx}`,
        affected_parameters: ["all_parameters"],
        recommendation: "This data point represents unusual operating conditions",
        detection_method: "isolation_forest",
        confidence: 0.8
      });
    }

    const avgScore = mean(result.scores);
    return { anomalies, score: avgScore };
  }

  private runAutoencoder(data: LatheDataPoint[], matrix: number[][]): { anomalies: AnomalyResult[]; score: number } {
    const anomalies: AnomalyResult[] = [];

    const validMatrix = matrix.filter(row => row.some(v => v > 0));
    if (validMatrix.length < 20) {
      return { anomalies: [], score: 0 };
    }

    try {
      const result = detectAutoencoder(validMatrix);
      this._autoencoderModel = result.model;

      for (const idx of result.anomalies) {
        anomalies.push({
          is_anomaly: true,
          anomaly_score: clamp01(result.errors[idx] / (result.model.reconstruction_threshold * 2)),
          anomaly_type: "reconstruction_error",
          severity: result.errors[idx] > result.model.reconstruction_threshold * 2 ? "critical" : "warning",
          description: `Autoencoder reconstruction error ${result.errors[idx].toFixed(4)} at index ${idx}`,
          affected_parameters: ["pattern_mismatch"],
          recommendation: "Data pattern doesn't match learned normal behavior",
          detection_method: "autoencoder",
          confidence: 0.75
        });
      }

      const avgError = mean(result.errors);
      return { anomalies, score: clamp01(avgError / result.model.reconstruction_threshold) };
    } catch (e) {
      return { anomalies: [], score: 0 };
    }
  }

  private runOneClassSVM(data: LatheDataPoint[], matrix: number[][]): { anomalies: AnomalyResult[]; score: number } {
    const anomalies: AnomalyResult[] = [];

    const validMatrix = matrix.filter(row => row.some(v => v > 0));
    if (validMatrix.length < 10) {
      return { anomalies: [], score: 0 };
    }

    try {
      const result = detectOneClassSVM(validMatrix, undefined, 0.1);
      this._svmModel = result.model;

      for (const idx of result.anomalies) {
        anomalies.push({
          is_anomaly: true,
          anomaly_score: clamp01(-result.decisions[idx]),
          anomaly_type: "svm_boundary_violation",
          severity: result.decisions[idx] < -0.5 ? "critical" : "warning",
          description: `One-Class SVM decision ${result.decisions[idx].toFixed(3)} < 0 at index ${idx}`,
          affected_parameters: ["svm_boundary"],
          recommendation: "Data point outside learned normal region",
          detection_method: "one_class_svm",
          confidence: 0.78
        });
      }

      const anomalyRate = result.anomalies.length / validMatrix.length;
      return { anomalies, score: anomalyRate };
    } catch (e) {
      return { anomalies: [], score: 0 };
    }
  }

  private runSlidingWindow(data: LatheDataPoint[]): { anomalies: AnomalyResult[]; score: number } {
    const anomalies: AnomalyResult[] = [];

    // Run on cutting speed
    const speeds = data.map(d => d.cutting_speed_m_min).filter(v => v > 0);
    if (speeds.length >= 10) {
      const result = detectSlidingWindow(speeds, 5, 2.0);

      for (const idx of result.anomalies) {
        anomalies.push({
          is_anomaly: true,
          anomaly_score: 0.6,
          anomaly_type: "time_series_anomaly",
          severity: "warning",
          description: `Sliding window anomaly in cutting speed at index ${idx}`,
          affected_parameters: ["cutting_speed_m_min"],
          recommendation: "Check for sudden process changes",
          detection_method: "sliding_window",
          confidence: 0.7
        });
      }
    }

    const score = clamp01(anomalies.length / Math.max(data.length, 1));
    return { anomalies, score };
  }

  private runPhysicsValidation(data: LatheDataPoint[]): { anomalies: AnomalyResult[]; score: number } {
    const anomalies: AnomalyResult[] = [];

    for (let i = 0; i < data.length; i++) {
      const d = data[i];

      // Validate speed/feed against material
      if (d.material_iso && d.cutting_speed_m_min > 0 && d.feed_mm_rev > 0) {
        const result = validateSpeedFeed(d.cutting_speed_m_min, d.feed_mm_rev, d.material_iso);
        for (const param of result.anomalies) {
          anomalies.push({
            is_anomaly: true,
            anomaly_score: 0.6,
            anomaly_type: "speed_feed_invalid",
            severity: "warning",
            description: param.description,
            affected_parameters: [param.parameter],
            recommendation: `Adjust to range ${param.expected_range.min}-${param.expected_range.max}`,
            detection_method: "physics_validation",
            confidence: 0.85
          });
        }
      }

      // Check power vs speed correlation
      if (d.power_kw && d.cutting_speed_m_min && d.power_kw > 0) {
        const expected_power_ratio = d.cutting_speed_m_min / 100;  // Simplified
        if (d.power_kw > expected_power_ratio * 50) {  // Very rough check
          anomalies.push({
            is_anomaly: true,
            anomaly_score: 0.5,
            anomaly_type: "statistical_outlier",
            severity: "info",
            description: `High power ${d.power_kw} kW at speed ${d.cutting_speed_m_min} m/min`,
            affected_parameters: ["power_kw", "cutting_speed_m_min"],
            recommendation: "Verify power measurement accuracy",
            detection_method: "physics_validation",
            confidence: 0.6
          });
        }
      }
    }

    const score = clamp01(anomalies.length / Math.max(data.length, 1));
    return { anomalies, score };
  }

  private validateProgramParameters(program: LatheProgram): ParameterAnomaly[] {
    const anomalies: ParameterAnomaly[] = [];

    for (const block of program.blocks) {
      // Check spindle speed
      if (block.s !== undefined) {
        if (block.s < 0) {
          anomalies.push({
            line_number: block.line_number,
            parameter: "spindle_speed",
            value: block.s,
            expected_range: { min: 0, max: 10000 },
            description: `Negative spindle speed S${block.s}`
          });
        } else if (block.s > 10000) {
          anomalies.push({
            line_number: block.line_number,
            parameter: "spindle_speed",
            value: block.s,
            expected_range: { min: 0, max: 10000 },
            description: `Extremely high spindle speed S${block.s}`
          });
        }
      }

      // Check feed rate
      if (block.f !== undefined) {
        if (block.f < 0) {
          anomalies.push({
            line_number: block.line_number,
            parameter: "feed_rate",
            value: block.f,
            expected_range: { min: 0, max: 10 },
            description: `Negative feed rate F${block.f}`
          });
        } else if (block.f > 10) {
          anomalies.push({
            line_number: block.line_number,
            parameter: "feed_rate",
            value: block.f,
            expected_range: { min: 0, max: 10 },
            description: `Very high feed rate F${block.f} mm/rev`
          });
        }
      }
    }

    return anomalies;
  }

  private generateRecommendations(anomalies: AnomalyResult[]): string[] {
    const recommendations: string[] = [];
    const types = new Set(anomalies.map(a => a.anomaly_type));

    if (types.has("tool_wear")) {
      recommendations.push("Inspect tools for wear, chipping, or built-up edge");
    }
    if (types.has("dimensional_drift")) {
      recommendations.push("Review and adjust wear offsets");
    }
    if (types.has("missing_safety_code")) {
      recommendations.push("Add required safety codes before running program");
    }
    if (types.has("speed_feed_invalid")) {
      recommendations.push("Verify cutting parameters against material recommendations");
    }
    if (types.has("drift") || types.has("change_point")) {
      recommendations.push("Investigate process drift causes (thermal, tool wear, material)");
    }
    if (types.has("isolation_anomaly") || types.has("reconstruction_error")) {
      recommendations.push("Review unusual operating conditions and verify data quality");
    }

    if (recommendations.length === 0) {
      recommendations.push("Continue normal operation with standard monitoring");
    }

    return recommendations;
  }

  private generateSummary(anomalies: AnomalyResult[], status: "normal" | "warning" | "alarm"): string {
    const critical = anomalies.filter(a => a.severity === "critical").length;
    const warnings = anomalies.filter(a => a.severity === "warning").length;
    const info = anomalies.filter(a => a.severity === "info").length;

    if (status === "normal") {
      return `All checks passed. ${info} informational items noted.`;
    } else if (status === "warning") {
      return `Attention needed: ${warnings} warning(s), ${info} info item(s). Review recommended.`;
    } else {
      return `ALARM: ${critical} critical issue(s), ${warnings} warning(s). Immediate action required.`;
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheAnomalyDetectionEngine = new LatheAnomalyDetectionEngine();
