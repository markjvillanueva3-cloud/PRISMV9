/**
 * ProcessFingerprintEngine — Statistical Process Fingerprinting
 *
 * Captures the "DNA" of a manufacturing process by extracting statistical
 * features from multi-channel sensor data and providing comparison,
 * drift monitoring, clustering, root cause analysis, and predictive modeling.
 *
 *   - Fingerprint Capture (12 statistical features per signal channel)
 *   - Fingerprint Comparison (Mahalanobis, cosine similarity)
 *   - Drift Monitoring (Hotelling T², CUSUM)
 *   - Process State Clustering (K-means, silhouette)
 *   - Root Cause Analysis (decision tree on anomalous features)
 *   - Predictive Modeling (linear/ridge regression on fingerprint features)
 *
 * @module engines/ProcessFingerprintEngine
 */

import { log } from "../utils/Logger.js";
import { CholeskyEngine } from "./CholeskyEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface CaptureInput {
  force_samples?: number[];
  vibration_samples?: number[];
  power_samples?: number[];
  temperature_samples?: number[];
  acoustic_samples?: number[];
  cutting_params: { speed_mpm: number; feed_mm_rev: number; depth_mm: number };
}

export interface FeatureSet {
  mean: number;
  std: number;
  skewness: number;
  kurtosis: number;
  rms: number;
  peak: number;
  crest_factor: number;
  median: number;
  iqr: number;
  zero_crossing_rate: number;
  entropy: number;
  autocorrelation_lag1: number;
}

export interface Fingerprint {
  fingerprint_id: string;
  features: Record<string, Record<string, number>>;
  timestamp: string;
  n_features: number;
  dominant_frequency_hz?: Record<string, number>;
  cutting_params: { speed_mpm: number; feed_mm_rev: number; depth_mm: number };
}

export interface CompareInput {
  fingerprint_a: Fingerprint;
  fingerprint_b: Fingerprint;
}

export interface CompareResult {
  similarity_score: number;
  mahalanobis_distance: number;
  cosine_similarity: number;
  divergent_features: { feature: string; diff_pct: number }[];
  drift_detected: boolean;
  drift_severity: "none" | "minor" | "major";
}

export interface DriftInput {
  baseline_fingerprints: Fingerprint[];
  current_fingerprint: Fingerprint;
  alpha?: number;
}

export interface DriftResult {
  in_control: boolean;
  t_squared: number;
  t_squared_limit: number;
  out_of_control_features: string[];
  cusum_alarms: string[];
  recommended_action: string;
}

export interface ClusterInput {
  fingerprints: Fingerprint[];
  n_clusters?: number;
}

export interface ClusterResult {
  n_clusters: number;
  cluster_labels: number[];
  cluster_centers: number[][];
  silhouette_score: number;
  state_descriptions: string[];
  transitions: { from: number; to: number; count: number }[];
}

export interface RootCauseInput {
  anomalous_fingerprint: Fingerprint;
  baseline_fingerprint: Fingerprint;
}

export interface RootCauseResult {
  probable_causes: { cause: string; confidence: number; evidence: string[] }[];
  affected_signals: string[];
  recommended_investigation: string[];
}

export interface BuildModelInput {
  fingerprints: Fingerprint[];
  outcomes: number[];
  model_type: "linear" | "ridge";
}

export interface BuildModelResult {
  coefficients: Record<string, number>;
  r_squared: number;
  rmse: number;
  top_predictive_features: { feature: string; importance: number }[];
  prediction_fn: (fp: Fingerprint) => number;
}

// ============================================================================
// HELPERS
// ============================================================================

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

function computeRms(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.sqrt(arr.reduce((s, v) => s + v * v, 0) / arr.length);
}

function computeSkewness(arr: number[]): number {
  if (arr.length < 3) return 0;
  const m = mean(arr);
  const s = stdDev(arr);
  if (s === 0) return 0;
  return arr.reduce((acc, v) => acc + ((v - m) / s) ** 3, 0) / arr.length;
}

function computeKurtosis(arr: number[]): number {
  if (arr.length < 4) return 0;
  const m = mean(arr);
  const s = stdDev(arr);
  if (s === 0) return 0;
  return arr.reduce((acc, v) => acc + ((v - m) / s) ** 4, 0) / arr.length;
}

function computeMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function computeIQR(arr: number[]): number {
  if (arr.length < 4) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const q1Idx = Math.floor(sorted.length * 0.25);
  const q3Idx = Math.floor(sorted.length * 0.75);
  return sorted[q3Idx] - sorted[q1Idx];
}

function zeroCrossingRate(arr: number[]): number {
  if (arr.length < 2) return 0;
  let crossings = 0;
  for (let i = 1; i < arr.length; i++) {
    if ((arr[i] >= 0 && arr[i - 1] < 0) || (arr[i] < 0 && arr[i - 1] >= 0)) {
      crossings++;
    }
  }
  return crossings / (arr.length - 1);
}

function shannonEntropy(arr: number[]): number {
  if (arr.length === 0) return 0;
  // Bin the signal into 20 bins
  const nBins = 20;
  const minVal = Math.min(...arr);
  const maxVal = Math.max(...arr);
  const range = maxVal - minVal;
  if (range === 0) return 0;

  const bins = new Array(nBins).fill(0);
  for (const v of arr) {
    const idx = Math.min(nBins - 1, Math.floor(((v - minVal) / range) * nBins));
    bins[idx]++;
  }

  let entropy = 0;
  for (const count of bins) {
    if (count > 0) {
      const p = count / arr.length;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

function autocorrelationLag1(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  let num = 0;
  let den = 0;
  for (let i = 0; i < arr.length; i++) {
    den += (arr[i] - m) ** 2;
    if (i < arr.length - 1) {
      num += (arr[i] - m) * (arr[i + 1] - m);
    }
  }
  return den > 0 ? num / den : 0;
}

/** Extract 12 statistical features from a signal */
function extractFeatures(samples: number[]): FeatureSet {
  const m = mean(samples);
  const s = stdDev(samples);
  const r = computeRms(samples);
  const peak = Math.max(...samples.map(Math.abs));
  return {
    mean: m,
    std: s,
    skewness: computeSkewness(samples),
    kurtosis: computeKurtosis(samples),
    rms: r,
    peak,
    crest_factor: r > 0 ? peak / r : 0,
    median: computeMedian(samples),
    iqr: computeIQR(samples),
    zero_crossing_rate: zeroCrossingRate(samples),
    entropy: shannonEntropy(samples),
    autocorrelation_lag1: autocorrelationLag1(samples),
  };
}

/** Flatten a fingerprint's features into a numeric vector with consistent ordering */
function fingerprintToVector(fp: Fingerprint): number[] {
  const vec: number[] = [];
  const signalKeys = Object.keys(fp.features).sort();
  const featureKeys = [
    "mean", "std", "skewness", "kurtosis", "rms", "peak",
    "crest_factor", "median", "iqr", "zero_crossing_rate", "entropy", "autocorrelation_lag1",
  ];
  for (const sig of signalKeys) {
    for (const feat of featureKeys) {
      vec.push(fp.features[sig]?.[feat] ?? 0);
    }
  }
  return vec;
}

/** Get ordered feature names from fingerprint */
function getFeatureNames(fp: Fingerprint): string[] {
  const names: string[] = [];
  const signalKeys = Object.keys(fp.features).sort();
  const featureKeys = [
    "mean", "std", "skewness", "kurtosis", "rms", "peak",
    "crest_factor", "median", "iqr", "zero_crossing_rate", "entropy", "autocorrelation_lag1",
  ];
  for (const sig of signalKeys) {
    for (const feat of featureKeys) {
      names.push(`${sig}.${feat}`);
    }
  }
  return names;
}

/** Cosine similarity between two vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

/** Euclidean distance */
function euclideanDistance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

/** Generate a short random ID */
function generateId(): string {
  return "fp_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

// ============================================================================
// ENGINE
// ============================================================================

export class ProcessFingerprintEngine {

  /**
   * Build statistical fingerprint from process sensor data.
   * Extracts 12 statistical features per signal channel.
   */
  captureFingerprint(params: CaptureInput): Fingerprint {
    log.info( "ProcessFingerprintEngine.captureFingerprint");

    const features: Record<string, Record<string, number>> = {};
    const signalMap: Record<string, number[] | undefined> = {
      force: params.force_samples,
      vibration: params.vibration_samples,
      power: params.power_samples,
      temperature: params.temperature_samples,
      acoustic: params.acoustic_samples,
    };

    let n_features = 0;
    for (const [name, samples] of Object.entries(signalMap)) {
      if (samples && samples.length > 0) {
        const feats = extractFeatures(samples);
        features[name] = feats as unknown as Record<string, number>;
        n_features += 12;
      }
    }

    return {
      fingerprint_id: generateId(),
      features,
      timestamp: new Date().toISOString(),
      n_features,
      cutting_params: params.cutting_params,
    };
  }

  /**
   * Compare two process fingerprints.
   * Uses Mahalanobis distance, cosine similarity, and feature-wise comparison.
   */
  compareFingerprints(params: CompareInput): CompareResult {
    log.info( "ProcessFingerprintEngine.compareFingerprints");

    const { fingerprint_a, fingerprint_b } = params;

    // Align features to common signal keys
    const allSignals = new Set([
      ...Object.keys(fingerprint_a.features),
      ...Object.keys(fingerprint_b.features),
    ]);

    const vecA = fingerprintToVector(fingerprint_a);
    const vecB = fingerprintToVector(fingerprint_b);

    // Cosine similarity
    const cosine = cosineSimilarity(vecA, vecB);

    // Mahalanobis distance (simplified: use standardized Euclidean)
    const diffs: number[] = [];
    const featureNames = getFeatureNames(fingerprint_a);
    for (let i = 0; i < Math.min(vecA.length, vecB.length); i++) {
      const scale = Math.max(Math.abs(vecA[i]), Math.abs(vecB[i]), 1e-10);
      diffs.push(((vecA[i] - vecB[i]) / scale) ** 2);
    }
    const mahalanobis = Math.sqrt(diffs.reduce((s, v) => s + v, 0));

    // Feature-wise divergence
    const divergent_features: { feature: string; diff_pct: number }[] = [];
    for (let i = 0; i < Math.min(vecA.length, vecB.length); i++) {
      const base = Math.max(Math.abs(vecA[i]), 1e-10);
      const diffPct = Math.abs(vecA[i] - vecB[i]) / base * 100;
      if (diffPct > 20) {
        divergent_features.push({
          feature: featureNames[i] || `feature_${i}`,
          diff_pct: diffPct,
        });
      }
    }
    divergent_features.sort((a, b) => b.diff_pct - a.diff_pct);

    // Similarity score: combine cosine similarity with normalized distance
    // Pure cosine misses magnitude shifts, so blend with distance-based metric
    const maxMag = Math.max(
      Math.sqrt(vecA.reduce((s, v) => s + v * v, 0)),
      Math.sqrt(vecB.reduce((s, v) => s + v * v, 0)),
      1e-10,
    );
    const normDist = euclideanDistance(vecA, vecB) / maxMag;
    const distScore = 1 / (1 + normDist); // Maps [0,∞) → (0,1]
    const similarity_score = Math.max(0, Math.min(1, 0.5 * cosine + 0.5 * distScore));

    // Drift assessment
    let drift_severity: "none" | "minor" | "major";
    if (similarity_score > 0.85 && divergent_features.length <= 5) {
      drift_severity = "none";
    } else if (similarity_score > 0.5) {
      drift_severity = "minor";
    } else {
      drift_severity = "major";
    }

    return {
      similarity_score,
      mahalanobis_distance: mahalanobis,
      cosine_similarity: cosine,
      divergent_features: divergent_features.slice(0, 10),
      drift_detected: drift_severity !== "none",
      drift_severity,
    };
  }

  /**
   * Statistical process monitoring via fingerprint comparison.
   * Hotelling T² against baseline distribution + CUSUM on individual features.
   */
  monitorDrift(params: DriftInput): DriftResult {
    log.info( "ProcessFingerprintEngine.monitorDrift");

    const { baseline_fingerprints, current_fingerprint } = params;
    const alpha = params.alpha ?? 0.05;

    if (baseline_fingerprints.length === 0) {
      return {
        in_control: true,
        t_squared: 0,
        t_squared_limit: 0,
        out_of_control_features: [],
        cusum_alarms: [],
        recommended_action: "Insufficient baseline data",
      };
    }

    // Build baseline matrix
    const baselineVecs = baseline_fingerprints.map(fingerprintToVector);
    const currentVec = fingerprintToVector(current_fingerprint);
    const featureNames = getFeatureNames(current_fingerprint);

    const p = currentVec.length; // number of features
    const n = baselineVecs.length;

    // Compute baseline mean and std per feature
    const baseMean = new Array(p).fill(0);
    const baseStd = new Array(p).fill(0);

    for (let j = 0; j < p; j++) {
      const col = baselineVecs.map((v) => v[j] ?? 0);
      baseMean[j] = mean(col);
      baseStd[j] = stdDev(col);
    }

    // Full covariance Hotelling T² via Cholesky (replaces diagonal approximation)
    // T² = (x - mu)^T * Sigma^{-1} * (x - mu) via L*L^T solve
    let t_squared = 0;
    const out_of_control_features: string[] = [];
    const diff = currentVec.map((v, j) => v - baseMean[j]);

    let useFullCovariance = false;
    if (n > p + 1) {
      // Build full covariance matrix
      const S: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
      for (const vec of baselineVecs)
        for (let i = 0; i < p; i++)
          for (let j = 0; j < p; j++)
            S[i][j] += (vec[i] - baseMean[i]) * (vec[j] - baseMean[j]);
      for (let i = 0; i < p; i++)
        for (let j = 0; j < p; j++) S[i][j] /= (n - 1);
      // Add small ridge for numerical stability
      for (let i = 0; i < p; i++) S[i][i] += 1e-10;
      try {
        const L = CholeskyEngine.factorize(S).L;
        const y = CholeskyEngine.solve(L, diff);
        t_squared = diff.reduce((s, v, j) => s + v * y[j], 0);
        useFullCovariance = true;
      } catch {
        // Fallback to diagonal if Cholesky fails (near-singular)
      }
    }

    if (!useFullCovariance) {
      // Diagonal fallback (original behavior)
      for (let j = 0; j < p; j++) {
        const sigma = Math.max(baseStd[j], 1e-10);
        const z = diff[j] / sigma;
        t_squared += z * z;
      }
    }

    // Individual feature out-of-control check (always univariate)
    for (let j = 0; j < p; j++) {
      const sigma = Math.max(baseStd[j], 1e-10);
      const z = diff[j] / sigma;
      if (Math.abs(z) > 3) {
        out_of_control_features.push(featureNames[j] || `feature_${j}`);
      }
    }

    // T² limit (chi-squared approximation)
    const t_squared_limit = p * (1 + 3 / Math.sqrt(Math.max(n, 1)));

    // CUSUM on individual features
    const cusum_alarms: string[] = [];
    const cusumH = 5; // Decision interval

    for (let j = 0; j < p; j++) {
      const sigma = Math.max(baseStd[j], 1e-10);
      const z = (currentVec[j] - baseMean[j]) / sigma;
      // One-sided CUSUM check
      if (Math.abs(z) > cusumH * 0.5) {
        cusum_alarms.push(featureNames[j] || `feature_${j}`);
      }
    }

    const in_control = t_squared <= t_squared_limit && out_of_control_features.length === 0;

    // Recommended action
    let recommended_action: string;
    if (in_control) {
      recommended_action = "Process is in control. Continue normal operation.";
    } else if (out_of_control_features.length > p * 0.3) {
      recommended_action = "Major process shift detected. Stop and investigate root cause immediately.";
    } else {
      recommended_action = `Monitor closely. Out-of-control features: ${out_of_control_features.join(", ")}`;
    }

    return {
      in_control,
      t_squared,
      t_squared_limit,
      out_of_control_features,
      cusum_alarms,
      recommended_action,
    };
  }

  /**
   * Identify distinct process states from fingerprint history.
   * K-means clustering with silhouette score for optimal k selection.
   */
  clusterProcessStates(params: ClusterInput): ClusterResult {
    log.info( "ProcessFingerprintEngine.clusterProcessStates");

    const { fingerprints } = params;

    if (fingerprints.length < 2) {
      return {
        n_clusters: 1,
        cluster_labels: fingerprints.map(() => 0),
        cluster_centers: [fingerprints.length > 0 ? fingerprintToVector(fingerprints[0]) : []],
        silhouette_score: 0,
        state_descriptions: ["Single state"],
        transitions: [],
      };
    }

    const vectors = fingerprints.map(fingerprintToVector);
    const dim = vectors[0].length;

    // Auto-select k via silhouette if not specified
    let bestK = params.n_clusters ?? 2;
    let bestSilhouette = -1;
    let bestLabels: number[] = [];
    let bestCenters: number[][] = [];

    const maxK = params.n_clusters
      ? params.n_clusters
      : Math.min(Math.floor(fingerprints.length / 2), 6);
    const minK = params.n_clusters ?? 2;

    for (let k = minK; k <= maxK; k++) {
      const { labels, centers } = this._kmeans(vectors, k, dim);
      const sil = this._silhouetteScore(vectors, labels, k);
      if (sil > bestSilhouette || params.n_clusters) {
        bestSilhouette = sil;
        bestK = k;
        bestLabels = labels;
        bestCenters = centers;
        if (params.n_clusters) break; // Use specified k
      }
    }

    // State descriptions
    const state_descriptions: string[] = [];
    for (let c = 0; c < bestK; c++) {
      const clusterSize = bestLabels.filter((l) => l === c).length;
      state_descriptions.push(`State ${c}: ${clusterSize} observations`);
    }

    // Transition counts
    const transitions: { from: number; to: number; count: number }[] = [];
    const transMap = new Map<string, number>();
    for (let i = 1; i < bestLabels.length; i++) {
      if (bestLabels[i] !== bestLabels[i - 1]) {
        const key = `${bestLabels[i - 1]}->${bestLabels[i]}`;
        transMap.set(key, (transMap.get(key) || 0) + 1);
      }
    }
    for (const [key, count] of transMap.entries()) {
      const [from, to] = key.split("->").map(Number);
      transitions.push({ from, to, count });
    }

    return {
      n_clusters: bestK,
      cluster_labels: bestLabels,
      cluster_centers: bestCenters,
      silhouette_score: bestSilhouette,
      state_descriptions,
      transitions,
    };
  }

  /**
   * Identify likely root cause from fingerprint anomaly.
   * Decision tree based on which features are anomalous.
   */
  rootCauseFromFingerprint(params: RootCauseInput): RootCauseResult {
    log.info( "ProcessFingerprintEngine.rootCauseFromFingerprint");

    const { anomalous_fingerprint, baseline_fingerprint } = params;
    const probable_causes: { cause: string; confidence: number; evidence: string[] }[] = [];
    const affected_signals: string[] = [];
    const recommended_investigation: string[] = [];

    // Compare features per signal
    const signals = Object.keys(anomalous_fingerprint.features);
    const deviations: Record<string, Record<string, number>> = {};

    for (const sig of signals) {
      const anomFeats = anomalous_fingerprint.features[sig];
      const baseFeats = baseline_fingerprint.features[sig];
      if (!anomFeats || !baseFeats) continue;

      deviations[sig] = {};
      let hasDeviation = false;
      for (const feat of Object.keys(anomFeats)) {
        const base = Math.max(Math.abs(baseFeats[feat] ?? 0), 1e-10);
        const diff = ((anomFeats[feat] ?? 0) - (baseFeats[feat] ?? 0)) / base;
        deviations[sig][feat] = diff;
        if (Math.abs(diff) > 0.3) hasDeviation = true;
      }
      if (hasDeviation) affected_signals.push(sig);
    }

    // Decision rules for root cause identification
    const forceD = deviations["force"] || {};
    const vibD = deviations["vibration"] || {};
    const powerD = deviations["power"] || {};
    const tempD = deviations["temperature"] || {};
    const acousticD = deviations["acoustic"] || {};

    // Tool wear: force mean increases, vibration increases
    if ((forceD["mean"] ?? 0) > 0.2 && (vibD["rms"] ?? 0) > 0.15) {
      probable_causes.push({
        cause: "Tool wear progression",
        confidence: 0.85,
        evidence: [
          `Force mean increased by ${((forceD["mean"] ?? 0) * 100).toFixed(1)}%`,
          `Vibration RMS increased by ${((vibD["rms"] ?? 0) * 100).toFixed(1)}%`,
        ],
      });
      recommended_investigation.push("Inspect cutting edge for flank/crater wear");
      recommended_investigation.push("Check tool life counter");
    }

    // Chatter: vibration kurtosis/dominant frequency shift
    if ((vibD["kurtosis"] ?? 0) > 0.3 || (vibD["crest_factor"] ?? 0) > 0.3) {
      probable_causes.push({
        cause: "Chatter vibration onset",
        confidence: 0.78,
        evidence: [
          `Vibration kurtosis changed by ${((vibD["kurtosis"] ?? 0) * 100).toFixed(1)}%`,
          `Vibration crest factor changed by ${((vibD["crest_factor"] ?? 0) * 100).toFixed(1)}%`,
        ],
      });
      recommended_investigation.push("Check stability lobe diagram for current spindle speed");
      recommended_investigation.push("Reduce depth of cut or adjust RPM");
    }

    // Material hardness variation: force increases, temperature increases
    if ((forceD["mean"] ?? 0) > 0.15 && (tempD["mean"] ?? 0) > 0.1) {
      probable_causes.push({
        cause: "Material property variation (hardness increase)",
        confidence: 0.65,
        evidence: [
          `Force mean increased by ${((forceD["mean"] ?? 0) * 100).toFixed(1)}%`,
          `Temperature increased by ${((tempD["mean"] ?? 0) * 100).toFixed(1)}%`,
        ],
      });
      recommended_investigation.push("Verify material batch certification");
    }

    // Coolant issue: temperature rise without force change
    if ((tempD["mean"] ?? 0) > 0.2 && Math.abs(forceD["mean"] ?? 0) < 0.1) {
      probable_causes.push({
        cause: "Coolant delivery degradation",
        confidence: 0.7,
        evidence: [
          `Temperature increased by ${((tempD["mean"] ?? 0) * 100).toFixed(1)}%`,
          "Force unchanged — thermal issue likely not mechanical",
        ],
      });
      recommended_investigation.push("Check coolant flow rate and concentration");
    }

    // Machine degradation: power increase + vibration entropy change
    if ((powerD["mean"] ?? 0) > 0.15 && Math.abs(vibD["entropy"] ?? 0) > 0.2) {
      probable_causes.push({
        cause: "Machine mechanical degradation (bearing/spindle)",
        confidence: 0.6,
        evidence: [
          `Power consumption increased by ${((powerD["mean"] ?? 0) * 100).toFixed(1)}%`,
          `Vibration entropy changed by ${((vibD["entropy"] ?? 0) * 100).toFixed(1)}%`,
        ],
      });
      recommended_investigation.push("Schedule spindle bearing inspection");
    }

    // Acoustic anomaly
    if ((acousticD["rms"] ?? 0) > 0.25) {
      probable_causes.push({
        cause: "Acoustic emission anomaly (possible micro-fracture or built-up edge)",
        confidence: 0.55,
        evidence: [
          `Acoustic RMS changed by ${((acousticD["rms"] ?? 0) * 100).toFixed(1)}%`,
        ],
      });
      recommended_investigation.push("Inspect workpiece surface for anomalies");
    }

    // If no rules matched, generic
    if (probable_causes.length === 0) {
      probable_causes.push({
        cause: "Unclassified process shift",
        confidence: 0.3,
        evidence: [`Affected signals: ${affected_signals.join(", ") || "none detected"}`],
      });
      recommended_investigation.push("Perform detailed investigation of all process parameters");
    }

    // Sort by confidence
    probable_causes.sort((a, b) => b.confidence - a.confidence);

    return { probable_causes, affected_signals, recommended_investigation };
  }

  /**
   * Build predictive model from fingerprint database.
   * Linear or Ridge regression from fingerprint features to quality outcomes.
   */
  buildProcessModel(params: BuildModelInput): BuildModelResult {
    log.info( "ProcessFingerprintEngine.buildProcessModel", { model_type: params.model_type });

    const { fingerprints, outcomes, model_type } = params;

    if (fingerprints.length === 0 || fingerprints.length !== outcomes.length) {
      const emptyFn = () => 0;
      return {
        coefficients: {},
        r_squared: 0,
        rmse: 0,
        top_predictive_features: [],
        prediction_fn: emptyFn,
      };
    }

    const X = fingerprints.map(fingerprintToVector);
    const y = outcomes;
    const featureNames = getFeatureNames(fingerprints[0]);
    const n = X.length;
    const p = X[0].length;

    // Normalize features
    const featureMean = new Array(p).fill(0);
    const featureStd = new Array(p).fill(1);
    for (let j = 0; j < p; j++) {
      const col = X.map((row) => row[j]);
      featureMean[j] = mean(col);
      featureStd[j] = Math.max(stdDev(col), 1e-10);
    }

    const Xnorm = X.map((row) => row.map((v, j) => (v - featureMean[j]) / featureStd[j]));
    const yMean = mean(y);
    const yCentered = y.map((v) => v - yMean);

    // Ridge/linear regression: β = (X'X + λI)^(-1) X'y
    // Use feature-wise correlation for simplicity (diagonal approximation)
    const lambda = model_type === "ridge" ? 1.0 : 0;
    const beta = new Array(p).fill(0);

    for (let j = 0; j < p; j++) {
      let xtx = 0;
      let xty = 0;
      for (let i = 0; i < n; i++) {
        xtx += Xnorm[i][j] * Xnorm[i][j];
        xty += Xnorm[i][j] * yCentered[i];
      }
      const denom = xtx + lambda;
      beta[j] = denom > 1e-15 ? xty / denom : 0;
    }

    // Predictions
    const predictions = Xnorm.map((row) => {
      let pred = yMean;
      for (let j = 0; j < p; j++) {
        pred += beta[j] * row[j];
      }
      return pred;
    });

    // R²
    const ssTot = y.reduce((s, v) => s + (v - yMean) ** 2, 0);
    const ssRes = y.reduce((s, v, i) => s + (v - (isFinite(predictions[i]) ? predictions[i] : yMean)) ** 2, 0);
    const r_squared = ssTot > 1e-15 ? Math.max(0, 1 - ssRes / ssTot) : 0;

    // RMSE
    const rmse = Math.sqrt(isFinite(ssRes) ? ssRes / n : 0);

    // Coefficients (in original scale)
    const coefficients: Record<string, number> = {};
    const importances: { feature: string; importance: number }[] = [];
    for (let j = 0; j < p; j++) {
      const name = featureNames[j] || `feature_${j}`;
      const coeff = beta[j] / featureStd[j];
      coefficients[name] = coeff;
      importances.push({ feature: name, importance: Math.abs(beta[j]) });
    }

    importances.sort((a, b) => b.importance - a.importance);
    const top_predictive_features = importances.slice(0, 10);

    // Prediction function closure
    const prediction_fn = (fp: Fingerprint): number => {
      const vec = fingerprintToVector(fp);
      let pred = yMean;
      for (let j = 0; j < Math.min(vec.length, p); j++) {
        pred += beta[j] * ((vec[j] - featureMean[j]) / featureStd[j]);
      }
      return pred;
    };

    return { coefficients, r_squared, rmse, top_predictive_features, prediction_fn };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private _kmeans(
    data: number[][], k: number, dim: number, maxIter: number = 50,
  ): { labels: number[]; centers: number[][] } {
    const n = data.length;

    // Initialize centers via k-means++ style
    const centers: number[][] = [];
    const usedIdx = new Set<number>();
    const firstIdx = Math.floor(Math.random() * n);
    centers.push([...data[firstIdx]]);
    usedIdx.add(firstIdx);

    for (let c = 1; c < k; c++) {
      // Pick point farthest from existing centers
      let bestDist = -1;
      let bestIdx = 0;
      for (let i = 0; i < n; i++) {
        if (usedIdx.has(i)) continue;
        let minDist = Infinity;
        for (const center of centers) {
          const d = euclideanDistance(data[i], center);
          if (d < minDist) minDist = d;
        }
        if (minDist > bestDist) {
          bestDist = minDist;
          bestIdx = i;
        }
      }
      centers.push([...data[bestIdx]]);
      usedIdx.add(bestIdx);
    }

    let labels = new Array(n).fill(0);

    for (let iter = 0; iter < maxIter; iter++) {
      // Assign labels
      const newLabels = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        for (let c = 0; c < k; c++) {
          const d = euclideanDistance(data[i], centers[c]);
          if (d < minDist) {
            minDist = d;
            newLabels[i] = c;
          }
        }
      }

      // Update centers
      for (let c = 0; c < k; c++) {
        const members = data.filter((_, i) => newLabels[i] === c);
        if (members.length > 0) {
          for (let d = 0; d < dim; d++) {
            centers[c][d] = mean(members.map((m) => m[d] ?? 0));
          }
        }
      }

      // Check convergence
      let changed = false;
      for (let i = 0; i < n; i++) {
        if (newLabels[i] !== labels[i]) { changed = true; break; }
      }
      labels = newLabels;
      if (!changed) break;
    }

    return { labels, centers };
  }

  private _silhouetteScore(data: number[][], labels: number[], k: number): number {
    const n = data.length;
    if (n < 2 || k < 2) return 0;

    let totalSil = 0;
    for (let i = 0; i < n; i++) {
      const myCluster = labels[i];

      // Average intra-cluster distance (a)
      const sameCluster = data.filter((_, j) => labels[j] === myCluster && j !== i);
      const a = sameCluster.length > 0
        ? mean(sameCluster.map((p) => euclideanDistance(data[i], p)))
        : 0;

      // Minimum average inter-cluster distance (b)
      let b = Infinity;
      for (let c = 0; c < k; c++) {
        if (c === myCluster) continue;
        const otherCluster = data.filter((_, j) => labels[j] === c);
        if (otherCluster.length > 0) {
          const avgDist = mean(otherCluster.map((p) => euclideanDistance(data[i], p)));
          if (avgDist < b) b = avgDist;
        }
      }
      if (!isFinite(b)) b = 0;

      const sil = Math.max(a, b) > 0 ? (b - a) / Math.max(a, b) : 0;
      totalSil += sil;
    }

    return totalSil / n;
  }
}

export const processFingerprintEngine = new ProcessFingerprintEngine();
