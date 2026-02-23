/**
 * PRISM Manufacturing Intelligence - Measurement Feedback Engine
 * R17-MS1: Closed-Loop Manufacturing Feedback
 *
 * Ingests actual measurement data (CMM, profilometer, dynamometer) and compares
 * against R15/R16 predicted values. Computes model correction factors for
 * continuous improvement of physics predictions.
 *
 * Architecture:
 *   MeasurementStore:  In-memory store of measurement records by job/part/feature
 *   ErrorComputer:     Predicted vs actual comparison with statistical analysis
 *   CorrectionBuilder: Derives multiplicative/additive correction factors
 *
 * Actions:
 *   mfb_record   — Record a measurement (actual value + predicted value + context)
 *   mfb_compare  — Compare predicted vs actual for a job/feature
 *   mfb_error_stats — Statistical analysis of prediction errors across measurements
 *   mfb_correction  — Compute correction factors for physics model parameters
 *
 * @version 1.0.0  R17-MS1
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

interface MeasurementRecord {
  id: string;
  job_id: string;
  part_id: string;
  feature: string;           // e.g., "bore_diameter", "surface_Ra", "flatness"
  measurement_type: MeasurementType;
  predicted_value: number;
  actual_value: number;
  unit: string;
  tolerance_upper?: number;
  tolerance_lower?: number;
  material: string;
  operation: string;
  cutting_speed_mpm?: number;
  feed_mmrev?: number;
  depth_mm?: number;
  tool_diameter_mm?: number;
  timestamp: number;
  source: string;            // "cmm", "profilometer", "dynamometer", "manual"
  metadata?: Record<string, unknown>;
}

type MeasurementType =
  | "dimension"      // Length/diameter/position (mm)
  | "surface_finish" // Ra, Rz, Rt (um)
  | "force"          // Cutting force (N)
  | "temperature"    // Cutting temperature (C)
  | "vibration"      // Displacement (um)
  | "roundness"      // Form error (um)
  | "flatness"       // Form error (um)
  | "position";      // GD&T position (mm)

interface ErrorStatistics {
  count: number;
  mean_error: number;
  mean_abs_error: number;
  std_error: number;
  bias: number;             // Systematic offset (mean of signed errors)
  rmse: number;
  max_error: number;
  min_error: number;
  mean_pct_error: number;
  correlation: number;      // Pearson r between predicted and actual
  within_tolerance_pct: number;
}

interface CorrectionFactor {
  parameter: string;
  type: "multiplicative" | "additive";
  value: number;
  confidence: number;       // 0-1 based on sample size
  n_samples: number;
  applicable_range: { min: number; max: number };
}

// ============================================================================
// IN-MEMORY MEASUREMENT STORE
// ============================================================================

const MAX_RECORDS = 10_000;
const measurementStore: MeasurementRecord[] = [];

function generateId(): string {
  return `mfb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Record a measurement — stores predicted vs actual with full context.
 */
function recordMeasurement(params: Record<string, unknown>): unknown {
  const record: MeasurementRecord = {
    id: generateId(),
    job_id: String(params.job_id ?? "unknown"),
    part_id: String(params.part_id ?? "unknown"),
    feature: String(params.feature ?? "unknown"),
    measurement_type: (params.measurement_type as MeasurementType) ?? "dimension",
    predicted_value: Number(params.predicted_value ?? 0),
    actual_value: Number(params.actual_value ?? 0),
    unit: String(params.unit ?? "mm"),
    tolerance_upper: params.tolerance_upper != null ? Number(params.tolerance_upper) : undefined,
    tolerance_lower: params.tolerance_lower != null ? Number(params.tolerance_lower) : undefined,
    material: String(params.material ?? "steel"),
    operation: String(params.operation ?? "turning"),
    cutting_speed_mpm: params.cutting_speed_mpm != null ? Number(params.cutting_speed_mpm) : undefined,
    feed_mmrev: params.feed_mmrev != null ? Number(params.feed_mmrev) : undefined,
    depth_mm: params.depth_mm != null ? Number(params.depth_mm) : undefined,
    tool_diameter_mm: params.tool_diameter_mm != null ? Number(params.tool_diameter_mm) : undefined,
    timestamp: Date.now(),
    source: String(params.source ?? "manual"),
    metadata: (params.metadata as Record<string, unknown>) ?? undefined,
  };

  // Enforce store size limit
  if (measurementStore.length >= MAX_RECORDS) {
    measurementStore.shift(); // Remove oldest
  }
  measurementStore.push(record);

  const error = record.actual_value - record.predicted_value;
  const pctError = record.predicted_value !== 0
    ? (error / Math.abs(record.predicted_value)) * 100
    : 0;

  const withinTolerance = record.tolerance_upper != null && record.tolerance_lower != null
    ? record.actual_value >= record.tolerance_lower && record.actual_value <= record.tolerance_upper
    : null;

  return {
    id: record.id,
    job_id: record.job_id,
    feature: record.feature,
    predicted: record.predicted_value,
    actual: record.actual_value,
    error,
    pct_error: Math.round(pctError * 100) / 100,
    within_tolerance: withinTolerance,
    store_size: measurementStore.length,
    safety: { score: 1.0, flags: [] },
  };
}

/**
 * Compare predicted vs actual for a specific job/feature/type.
 * Returns all matching measurements with error analysis.
 */
function comparePredictedVsActual(params: Record<string, unknown>): unknown {
  const jobId = params.job_id ? String(params.job_id) : undefined;
  const feature = params.feature ? String(params.feature) : undefined;
  const measType = params.measurement_type as MeasurementType | undefined;
  const material = params.material ? String(params.material) : undefined;
  const operation = params.operation ? String(params.operation) : undefined;

  // Filter records
  let filtered = measurementStore.filter(r => {
    if (jobId && r.job_id !== jobId) return false;
    if (feature && r.feature !== feature) return false;
    if (measType && r.measurement_type !== measType) return false;
    if (material && r.material !== material) return false;
    if (operation && r.operation !== operation) return false;
    return true;
  });

  if (filtered.length === 0) {
    return {
      count: 0,
      message: "No matching measurements found",
      filter: { job_id: jobId, feature, measurement_type: measType, material, operation },
    };
  }

  // Compute per-record errors
  const comparisons = filtered.map(r => {
    const error = r.actual_value - r.predicted_value;
    const pctError = r.predicted_value !== 0
      ? (error / Math.abs(r.predicted_value)) * 100
      : 0;
    return {
      id: r.id,
      feature: r.feature,
      predicted: r.predicted_value,
      actual: r.actual_value,
      error: Math.round(error * 1000) / 1000,
      pct_error: Math.round(pctError * 100) / 100,
      unit: r.unit,
      source: r.source,
      timestamp: r.timestamp,
    };
  });

  // Aggregate stats
  const errors = filtered.map(r => r.actual_value - r.predicted_value);
  const stats = computeErrorStats(filtered);

  return {
    count: filtered.length,
    comparisons: comparisons.slice(-50), // Last 50 for brevity
    statistics: stats,
    filter: { job_id: jobId, feature, measurement_type: measType, material, operation },
  };
}

/**
 * Statistical analysis of prediction errors — aggregated across matching measurements.
 */
function errorStatistics(params: Record<string, unknown>): unknown {
  const measType = params.measurement_type as MeasurementType | undefined;
  const material = params.material ? String(params.material) : undefined;
  const operation = params.operation ? String(params.operation) : undefined;
  const feature = params.feature ? String(params.feature) : undefined;
  const minSamples = Number(params.min_samples ?? 5);

  // Filter records
  let filtered = measurementStore.filter(r => {
    if (measType && r.measurement_type !== measType) return false;
    if (material && r.material !== material) return false;
    if (operation && r.operation !== operation) return false;
    if (feature && r.feature !== feature) return false;
    return true;
  });

  if (filtered.length < minSamples) {
    return {
      sufficient_data: false,
      count: filtered.length,
      required: minSamples,
      message: `Need at least ${minSamples} measurements, have ${filtered.length}`,
    };
  }

  const stats = computeErrorStats(filtered);

  // Breakdown by measurement type
  const byType: Record<string, ErrorStatistics> = {};
  const types = [...new Set(filtered.map(r => r.measurement_type))];
  for (const t of types) {
    const subset = filtered.filter(r => r.measurement_type === t);
    if (subset.length >= 3) {
      byType[t] = computeErrorStats(subset);
    }
  }

  // Breakdown by material
  const byMaterial: Record<string, ErrorStatistics> = {};
  const materials = [...new Set(filtered.map(r => r.material))];
  for (const m of materials) {
    const subset = filtered.filter(r => r.material === m);
    if (subset.length >= 3) {
      byMaterial[m] = computeErrorStats(subset);
    }
  }

  return {
    sufficient_data: true,
    overall: stats,
    by_measurement_type: byType,
    by_material: byMaterial,
    filter: { measurement_type: measType, material, operation, feature },
    recommendation: deriveRecommendation(stats),
  };
}

/**
 * Compute correction factors for physics model parameters based on measurement data.
 * Uses systematic bias to derive multiplicative or additive corrections.
 */
function computeCorrection(params: Record<string, unknown>): unknown {
  const measType = params.measurement_type as MeasurementType | undefined;
  const material = params.material ? String(params.material) : undefined;
  const operation = params.operation ? String(params.operation) : undefined;
  const minSamples = Number(params.min_samples ?? 10);
  const confidenceThreshold = Number(params.confidence_threshold ?? 0.7);

  // Filter
  let filtered = measurementStore.filter(r => {
    if (measType && r.measurement_type !== measType) return false;
    if (material && r.material !== material) return false;
    if (operation && r.operation !== operation) return false;
    return true;
  });

  if (filtered.length < minSamples) {
    return {
      corrections: [],
      sufficient_data: false,
      count: filtered.length,
      required: minSamples,
    };
  }

  const corrections: CorrectionFactor[] = [];

  // 1. Overall model bias correction (multiplicative)
  const predicted = filtered.map(r => r.predicted_value);
  const actual = filtered.map(r => r.actual_value);

  const meanPredicted = predicted.reduce((s, v) => s + v, 0) / predicted.length;
  const meanActual = actual.reduce((s, v) => s + v, 0) / actual.length;

  if (meanPredicted !== 0) {
    const multFactor = meanActual / meanPredicted;
    const confidence = computeConfidence(filtered.length, predicted, actual);

    if (confidence >= confidenceThreshold) {
      corrections.push({
        parameter: mapTypeToParameter(measType ?? "dimension"),
        type: "multiplicative",
        value: Math.round(multFactor * 10000) / 10000,
        confidence: Math.round(confidence * 1000) / 1000,
        n_samples: filtered.length,
        applicable_range: {
          min: Math.min(...predicted),
          max: Math.max(...predicted),
        },
      });
    }
  }

  // 2. Additive bias correction
  const errors = filtered.map(r => r.actual_value - r.predicted_value);
  const meanError = errors.reduce((s, v) => s + v, 0) / errors.length;
  const stdError = Math.sqrt(
    errors.reduce((s, v) => s + (v - meanError) ** 2, 0) / (errors.length - 1)
  );

  // Only suggest additive correction if bias is statistically significant
  // t-test: |mean| / (std/sqrt(n)) > 2 (roughly p < 0.05)
  const tStat = Math.abs(meanError) / (stdError / Math.sqrt(errors.length));
  if (tStat > 2.0) {
    corrections.push({
      parameter: `${mapTypeToParameter(measType ?? "dimension")}_offset`,
      type: "additive",
      value: Math.round(meanError * 10000) / 10000,
      confidence: Math.min(1.0, tStat / 10),
      n_samples: filtered.length,
      applicable_range: {
        min: Math.min(...predicted),
        max: Math.max(...predicted),
      },
    });
  }

  // 3. Material-specific corrections if enough data
  if (!material) {
    const materials = [...new Set(filtered.map(r => r.material))];
    for (const mat of materials) {
      const subset = filtered.filter(r => r.material === mat);
      if (subset.length >= Math.max(5, minSamples / 2)) {
        const matPred = subset.map(r => r.predicted_value);
        const matAct = subset.map(r => r.actual_value);
        const matMeanPred = matPred.reduce((s, v) => s + v, 0) / matPred.length;
        const matMeanAct = matAct.reduce((s, v) => s + v, 0) / matAct.length;

        if (matMeanPred !== 0) {
          const matFactor = matMeanAct / matMeanPred;
          // Only if factor differs significantly from overall
          if (Math.abs(matFactor - (meanPredicted !== 0 ? meanActual / meanPredicted : 1)) > 0.05) {
            corrections.push({
              parameter: `${mapTypeToParameter(measType ?? "dimension")}_${mat}`,
              type: "multiplicative",
              value: Math.round(matFactor * 10000) / 10000,
              confidence: Math.round(computeConfidence(subset.length, matPred, matAct) * 1000) / 1000,
              n_samples: subset.length,
              applicable_range: {
                min: Math.min(...matPred),
                max: Math.max(...matPred),
              },
            });
          }
        }
      }
    }
  }

  return {
    corrections,
    sufficient_data: true,
    total_measurements: filtered.length,
    filter: { measurement_type: measType, material, operation },
    safety: {
      score: corrections.length > 0 ? 0.9 : 1.0,
      flags: corrections.some(c => Math.abs(c.value - 1.0) > 0.3 && c.type === "multiplicative")
        ? ["LARGE_CORRECTION_FACTOR"] : [],
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function computeErrorStats(records: MeasurementRecord[]): ErrorStatistics {
  const n = records.length;
  const errors = records.map(r => r.actual_value - r.predicted_value);
  const absErrors = errors.map(Math.abs);
  const pctErrors = records.map(r =>
    r.predicted_value !== 0 ? ((r.actual_value - r.predicted_value) / Math.abs(r.predicted_value)) * 100 : 0
  );

  const mean = errors.reduce((s, v) => s + v, 0) / n;
  const meanAbs = absErrors.reduce((s, v) => s + v, 0) / n;
  const variance = n > 1
    ? errors.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
    : 0;
  const std = Math.sqrt(variance);
  const rmse = Math.sqrt(errors.reduce((s, v) => s + v * v, 0) / n);

  // Pearson correlation
  const predicted = records.map(r => r.predicted_value);
  const actual = records.map(r => r.actual_value);
  const correlation = pearsonR(predicted, actual);

  // Within tolerance count
  let withinTol = 0;
  let tolCount = 0;
  for (const r of records) {
    if (r.tolerance_upper != null && r.tolerance_lower != null) {
      tolCount++;
      if (r.actual_value >= r.tolerance_lower && r.actual_value <= r.tolerance_upper) {
        withinTol++;
      }
    }
  }

  return {
    count: n,
    mean_error: round4(mean),
    mean_abs_error: round4(meanAbs),
    std_error: round4(std),
    bias: round4(mean),
    rmse: round4(rmse),
    max_error: round4(Math.max(...errors)),
    min_error: round4(Math.min(...errors)),
    mean_pct_error: round4(pctErrors.reduce((s, v) => s + v, 0) / n),
    correlation: round4(correlation),
    within_tolerance_pct: tolCount > 0 ? round4((withinTol / tolCount) * 100) : 100,
  };
}

function pearsonR(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i] - mx;
    const yi = y[i] - my;
    num += xi * yi;
    dx += xi * xi;
    dy += yi * yi;
  }
  const denom = Math.sqrt(dx * dy);
  return denom > 0 ? num / denom : 0;
}

function computeConfidence(n: number, predicted: number[], actual: number[]): number {
  // Confidence based on: sample size, correlation, and error spread
  const sizeScore = Math.min(1.0, n / 50);  // Full confidence at 50+ samples
  const r = pearsonR(predicted, actual);
  const corrScore = Math.max(0, r);           // Higher correlation = more confidence
  return Math.min(1.0, 0.4 * sizeScore + 0.6 * corrScore);
}

function mapTypeToParameter(t: MeasurementType): string {
  switch (t) {
    case "surface_finish": return "Ra_correction";
    case "force": return "Fc_correction";
    case "temperature": return "T_correction";
    case "vibration": return "vibration_correction";
    case "roundness": return "roundness_correction";
    case "flatness": return "flatness_correction";
    case "position": return "position_correction";
    default: return "dimension_correction";
  }
}

function deriveRecommendation(stats: ErrorStatistics): string {
  if (Math.abs(stats.bias) < stats.std_error * 0.5) {
    return "Model predictions are well-centered. Random variation dominates — no systematic correction needed.";
  }
  if (stats.bias > 0) {
    return `Model under-predicts by ${stats.bias.toFixed(3)} on average. Consider applying a positive additive correction or increasing relevant model coefficients.`;
  }
  return `Model over-predicts by ${Math.abs(stats.bias).toFixed(3)} on average. Consider applying a negative additive correction or decreasing relevant model coefficients.`;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// ============================================================================
// PUBLIC DISPATCHER
// ============================================================================

export function executeMeasurementFeedbackAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  log.info(`[MeasurementFeedbackEngine] action=${action}`);

  switch (action) {
    case "mfb_record":
      return recordMeasurement(params);
    case "mfb_compare":
      return comparePredictedVsActual(params);
    case "mfb_error_stats":
      return errorStatistics(params);
    case "mfb_correction":
      return computeCorrection(params);
    default:
      throw new Error(`MeasurementFeedbackEngine: unknown action '${action}'`);
  }
}
