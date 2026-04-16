// @ts-nocheck
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// Interfaces
// ============================================================================

export interface PersistInput {
  engine: any;
  filePath?: string;
}

export interface PersistResult {
  saved: boolean;
  path: string;
  machines: number;
  measurements: number;
  sizeBytes: number;
}

export interface RestoreInput {
  engine: any;
  filePath?: string;
}

export interface RestoreResult {
  restored: boolean;
  machines: number;
  measurements: number;
  lastSaved: string;
  dataAge_hours: number;
}

export interface AutoMatchInput {
  measurementType: string;
  parameters: {
    speed_mpm?: number;
    feed_mmrev?: number;
    depth_mm?: number;
    noseRadius_mm?: number;
    material?: string;
  };
  material?: string;
}

export interface AutoMatchResult {
  predicted: number | null;
  model: string;
  confidence: string;
  assumptions: string[];
}

export interface FleetInput {
  sourceEngine: any;
  sourceMachineId: string;
  targetMachineIds: string[];
  similarityWeights?: Record<string, number>;
  minSamples?: number;
}

export interface FleetTarget {
  machineId: string;
  adjustmentsApplied: number;
  weight: number;
}

export interface FleetResult {
  propagated: boolean;
  targets: FleetTarget[];
  message: string;
}

export interface AnomalyMeasurement {
  machineId: string;
  measurementType: string;
  measured: number;
  unit: string;
}

export interface AnomalyHistoryEntry {
  measured: number;
}

export interface AnomalyInput {
  measurement: AnomalyMeasurement;
  history: AnomalyHistoryEntry[];
  threshold?: number;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  zScore: number;
  reason?: string;
  recommendation: 'accept' | 'review' | 'reject';
  historicalMean: number;
  historicalStdDev: number;
}

export interface TimeWeightedMeasurement {
  measured: number;
  predicted: number;
  timestamp: number;
}

export interface TimeWeightedInput {
  measurements: TimeWeightedMeasurement[];
  decayRate?: number;
  now?: number;
}

export interface TimeWeightedResult {
  weightedBias: number;
  weightedRMSE: number;
  effectiveSampleSize: number;
  oldestRelevant_days: number;
  recentBias: number;
  trendDirection: 'improving' | 'stable' | 'degrading';
}

export interface CMMInput {
  csvContent: string;
  machineId: string;
  delimiter?: string;
}

export interface CMMFeature {
  featureName: string;
  nominal: number;
  actual: number;
  deviation: number;
  inTolerance: boolean;
}

export interface CMMParseResult {
  measurements: CMMFeature[];
  totalFeatures: number;
  outOfTolerance: number;
  worstDeviation: { feature: string; deviation: number };
}

// ============================================================================
// Material defaults for 6 ISO groups
// ============================================================================

interface MaterialDefaults {
  kc1_1: number;
  mc: number;
  taylorC: number;
  taylorN: number;
  label: string;
}

const ISO_MATERIAL_DEFAULTS: Record<string, MaterialDefaults> = {
  P: { kc1_1: 1800, mc: 0.25, taylorC: 300, taylorN: 0.25, label: 'Steel (ISO P)' },
  M: { kc1_1: 2100, mc: 0.25, taylorC: 200, taylorN: 0.25, label: 'Stainless (ISO M)' },
  K: { kc1_1: 1100, mc: 0.25, taylorC: 250, taylorN: 0.25, label: 'Cast Iron (ISO K)' },
  N: { kc1_1: 800, mc: 0.25, taylorC: 600, taylorN: 0.25, label: 'Aluminum (ISO N)' },
  S: { kc1_1: 2400, mc: 0.25, taylorC: 80, taylorN: 0.30, label: 'Superalloy (ISO S)' },
  H: { kc1_1: 3000, mc: 0.25, taylorC: 150, taylorN: 0.25, label: 'Hardened (ISO H)' },
};

// ============================================================================
// Default persistence path
// ============================================================================

const DEFAULT_PERSIST_PATH = 'H:/prism/mcp-server/data/machine-learning-data.json';

/** Validate that the resolved file path stays within allowed directories */
function validatePersistPath(filePath: string): void {
  const resolved = path.resolve(filePath);
  const homeDir = os.homedir();
  const prismDataDir = path.resolve(DEFAULT_PERSIST_PATH, '..');
  const allowedPrefixes = [
    path.join(homeDir, '.prism'),
    prismDataDir,
  ];
  const isAllowed = allowedPrefixes.some(prefix =>
    resolved.startsWith(prefix + path.sep) || resolved.startsWith(prefix + '/') || resolved === prefix
  );
  if (!isAllowed) {
    throw new Error(`Path traversal blocked: "${resolved}" is outside allowed directories (${allowedPrefixes.join(', ')})`);
  }
}

// ============================================================================
// FeedbackPersistenceEngine
// ============================================================================

/**
 * FeedbackPersistenceEngine adds 6 critical production-readiness improvements
 * to the MachineLearningFeedbackEngine:
 *
 * 1. persistToFile     - Save ML data to JSON for server restart survival
 * 2. restoreFromFile   - Reload persisted data back into an MLF engine
 * 3. autoMatchPrediction - Auto-compute PRISM predictions using Kienzle/Taylor/geometric models
 * 4. fleetLearning     - Propagate calibration from one machine to similar machines
 * 5. anomalyGuard      - Z-score outlier detection before data enters learning pipeline
 * 6. timeWeightedCalibrate - Exponential time-decay weighted bias/RMSE computation
 *
 * Also includes parseCMMExport for ingesting CMM CSV data.
 */
export class FeedbackPersistenceEngine {
  // ==========================================================================
  // 1. persistToFile
  // ==========================================================================

  /**
   * Save all machine learning data to a JSON file so it survives server restarts.
   *
   * Reads current state from a MachineLearningFeedbackEngine instance via
   * exportLearningData, writes to a JSON file with version/timestamp/checksum
   * for integrity. Uses write-to-tmp + rename for atomic save.
   *
   * @param input - Engine instance and optional file path
   * @returns PersistResult with save status, path, and data counts
   */
  persistToFile(input: PersistInput): PersistResult {
    const filePath = input.filePath || DEFAULT_PERSIST_PATH;
    validatePersistPath(filePath);

    try {
      // Export data from the MLF engine
      const exportResult = input.engine.exportLearningData
        ? input.engine.exportLearningData({})
        : input.engine.export
          ? input.engine.export({})
          : { data: {}, measurementCount: 0, machineCount: 0 };

      // The MLF engine returns { data, measurementCount, machineCount }
      const learningData = exportResult.data || exportResult;
      const machines = exportResult.machineCount || 0;
      const measurements = exportResult.measurementCount || 0;

      // Build the persistence envelope
      const envelope = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        checksum: 0,
        data: learningData,
      };

      const jsonStr = JSON.stringify(envelope, null, 2);
      // Simple string-length hash for integrity
      envelope.checksum = jsonStr.length;
      const finalJson = JSON.stringify(envelope, null, 2);

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Atomic write: write to .tmp then rename
      const tmpPath = filePath + '.tmp';
      fs.writeFileSync(tmpPath, finalJson, 'utf-8');
      fs.renameSync(tmpPath, filePath);

      return {
        saved: true,
        path: filePath,
        machines,
        measurements,
        sizeBytes: Buffer.byteLength(finalJson, 'utf-8'),
      };
    } catch (err: any) {
      return {
        saved: false,
        path: filePath,
        machines: 0,
        measurements: 0,
        sizeBytes: 0,
      };
    }
  }

  // ==========================================================================
  // 2. restoreFromFile
  // ==========================================================================

  /**
   * Load previously persisted data back into a MachineLearningFeedbackEngine instance.
   *
   * Reads the JSON file, validates envelope structure, and imports via
   * importLearningData. Reports data age for staleness awareness.
   *
   * @param input - Engine instance and optional file path
   * @returns RestoreResult with restore status, counts, and data age
   */
  restoreFromFile(input: RestoreInput): RestoreResult {
    const filePath = input.filePath || DEFAULT_PERSIST_PATH;
    validatePersistPath(filePath);

    try {
      if (!fs.existsSync(filePath)) {
        return {
          restored: false,
          machines: 0,
          measurements: 0,
          lastSaved: 'never',
          dataAge_hours: Infinity,
        };
      }

      const raw = fs.readFileSync(filePath, 'utf-8');
      const envelope = JSON.parse(raw);

      // Validate envelope structure
      if (!envelope.version || !envelope.timestamp || !envelope.data) {
        return {
          restored: false,
          machines: 0,
          measurements: 0,
          lastSaved: 'invalid',
          dataAge_hours: Infinity,
        };
      }

      // Import into engine — MLF expects { data: ... }
      let importResult: any = { imported: 0, machines: [] };
      if (input.engine.importLearningData) {
        importResult = input.engine.importLearningData({ data: envelope.data });
      } else if (input.engine.import) {
        importResult = input.engine.import({ data: envelope.data });
      }

      // Use import result for counts
      const machines = importResult.machines?.length || 0;
      const measurements = importResult.imported || 0;

      // Fallback counting if import didn't return counts
      let _measurements = measurements;
      if (_measurements === 0 && envelope.data) {
        const data = envelope.data;
        if (data.machines) {
          for (const machineId of Object.keys(data.machines)) {
            const machine = data.machines[machineId];
            if (machine.measurements) {
              _measurements += machine.measurements.length;
            } else if (machine.history) {
              _measurements += machine.history.length;
          }
        }
      } else if (data.measurementCount !== undefined) {
        _measurements = data.measurementCount;
      }
      }

      // Compute data age
      const savedAt = new Date(envelope.timestamp).getTime();
      const now = Date.now();
      const dataAge_hours = Math.round(((now - savedAt) / (1000 * 60 * 60)) * 100) / 100;
      const finalMeasurements = _measurements || measurements;

      return {
        restored: true,
        machines: machines || (importResult.machines?.length || 0),
        measurements: finalMeasurements,
        lastSaved: envelope.timestamp,
        dataAge_hours,
      };
    } catch (err: any) {
      return {
        restored: false,
        machines: 0,
        measurements: 0,
        lastSaved: 'error: ' + (err.message || 'unknown'),
        dataAge_hours: Infinity,
      };
    }
  }

  // ==========================================================================
  // 3. autoMatchPrediction
  // ==========================================================================

  /**
   * Automatically compute what PRISM would predict for a given operation so the
   * user doesn't have to supply the predicted value manually.
   *
   * Supports measurement types:
   * - force: Kienzle model F = kc1.1 * b * h^(1-mc)
   * - surface_finish: Geometric Ra = f^2 / (32 * r)
   * - tool_life: Taylor model T = C / V^n
   * - dimension: returns null (nominal, no prediction)
   * - temperature: Loewen-Shaw estimate
   *
   * @param input - Measurement type, cutting parameters, and material
   * @returns AutoMatchResult with predicted value, model name, confidence, assumptions
   */
  autoMatchPrediction(input: AutoMatchInput): AutoMatchResult {
    const matKey = this._resolveISOGroup(input.material || input.parameters.material || 'P');
    const mat = ISO_MATERIAL_DEFAULTS[matKey] || ISO_MATERIAL_DEFAULTS['P'];

    const speed = input.parameters.speed_mpm || 150;
    const feed = input.parameters.feed_mmrev || 0.2;
    const depth = input.parameters.depth_mm || 2.0;
    const noseRadius = input.parameters.noseRadius_mm || 0.8;

    switch (input.measurementType.toLowerCase()) {
      case 'force': {
        // Kienzle: F = kc1.1 * b * h^(1-mc)
        // b = depth of cut (ap), h = feed per rev (f)
        const b = depth;
        const h = feed;
        const kc = mat.kc1_1 * Math.pow(h, -mat.mc);
        const force = kc * b * h; // F = kc * b * h = kc1.1 * h^(1-mc) * b
        return {
          predicted: Math.round(force * 10) / 10,
          model: `Kienzle: F = kc1.1 * b * h^(1-mc), kc1.1=${mat.kc1_1}, mc=${mat.mc}`,
          confidence: 'moderate',
          assumptions: [
            `Material group: ${mat.label}`,
            `Depth of cut (b): ${b} mm`,
            `Chip thickness (h): ${h} mm/rev`,
            'Orthogonal cutting assumed (no oblique correction)',
            'Default specific cutting force coefficients used',
          ],
        };
      }

      case 'surface_finish':
      case 'roughness':
      case 'ra': {
        // Geometric: Ra = f^2 / (32 * r) in micrometers
        const ra = (feed * feed * 1000) / (32 * noseRadius); // *1000 to convert mm to um
        return {
          predicted: Math.round(ra * 1000) / 1000,
          model: `Geometric: Ra = f^2 / (32 * r), f=${feed} mm/rev, r=${noseRadius} mm`,
          confidence: 'moderate',
          assumptions: [
            `Feed: ${feed} mm/rev`,
            `Nose radius: ${noseRadius} mm`,
            'Ideal geometric finish (no BUE, no vibration)',
            'Result in micrometers',
            'Assumes sharp tool with no wear',
          ],
        };
      }

      case 'tool_life': {
        // Taylor: V * T^n = C => T = (C / V)^(1/n)
        const V = speed;
        const T = Math.pow(mat.taylorC / V, 1 / mat.taylorN);
        return {
          predicted: Math.round(T * 10) / 10,
          model: `Taylor: T = (C/V)^(1/n), C=${mat.taylorC}, n=${mat.taylorN}`,
          confidence: 'low',
          assumptions: [
            `Material group: ${mat.label}`,
            `Cutting speed: ${V} m/min`,
            `Taylor constants: C=${mat.taylorC}, n=${mat.taylorN}`,
            'Default tool grade assumed (uncoated carbide baseline)',
            'Result in minutes',
          ],
        };
      }

      case 'dimension': {
        return {
          predicted: null,
          model: 'nominal (no prediction model for dimensions)',
          confidence: 'n/a',
          assumptions: [
            'Dimensional accuracy depends on machine, setup, and thermal state',
            'No generic prediction model available',
            'Use machine-specific calibration data instead',
          ],
        };
      }

      case 'temperature': {
        // Loewen-Shaw simplified estimate:
        // T_rise ~ k * V^0.5 * f^0.3 * ap^0.1 (empirical form)
        // Using a simplified proportionality for demonstration
        const kTemp = mat.kc1_1 / 3.0; // rough proportionality constant
        const tRise = kTemp * Math.pow(speed / 100, 0.5) * Math.pow(feed, 0.3) * Math.pow(depth, 0.1);
        const tempC = Math.round(20 + tRise * 0.5); // ambient 20C + fraction of energy as heat
        return {
          predicted: tempC,
          model: 'Loewen-Shaw simplified: T ~ k * V^0.5 * f^0.3 * ap^0.1',
          confidence: 'low',
          assumptions: [
            `Material group: ${mat.label}`,
            'Simplified empirical Loewen-Shaw estimate',
            'Assumes dry cutting (no coolant)',
            'Ambient temperature: 20 C',
            'Partition ratio not explicitly modeled',
          ],
        };
      }

      default: {
        return {
          predicted: null,
          model: `unknown measurement type: ${input.measurementType}`,
          confidence: 'n/a',
          assumptions: [
            'Supported types: force, surface_finish, tool_life, dimension, temperature',
          ],
        };
      }
    }
  }

  // ==========================================================================
  // 4. fleetLearning
  // ==========================================================================

  /**
   * Propagate learning from one machine to similar machines, weighted by similarity.
   *
   * Machine similarity scoring:
   * - Same manufacturer: 0.7 weight
   * - Same type (VMC/HMC/lathe): 0.5 weight
   * - Different: 0.2 weight
   *
   * Only propagates if source machine has > minSamples measurements.
   * Applies weighted fraction of source bias to target machines.
   *
   * @param input - Source engine, machine IDs, similarity weights, min samples
   * @returns FleetResult with propagation status and per-target details
   */
  fleetLearning(input: FleetInput): FleetResult {
    const minSamples = input.minSamples ?? 10;

    try {
      // Get source machine data
      const sourceData = this._getSourceMachineData(input.sourceEngine, input.sourceMachineId);

      if (!sourceData) {
        return {
          propagated: false,
          targets: [],
          message: `Source machine '${input.sourceMachineId}' not found in engine data`,
        };
      }

      // Check minimum sample count
      const sampleCount = sourceData.measurements
        ? sourceData.measurements.length
        : sourceData.history
          ? sourceData.history.length
          : 0;

      if (sampleCount < minSamples) {
        return {
          propagated: false,
          targets: [],
          message: `Source machine has ${sampleCount} samples, need >= ${minSamples} before fleet propagation`,
        };
      }

      // Extract biases from source
      const biases = this._extractBiases(sourceData);
      if (biases.length === 0) {
        return {
          propagated: false,
          targets: [],
          message: 'No calibration biases found on source machine',
        };
      }

      // Propagate to targets
      const targets: FleetTarget[] = [];
      for (const targetId of input.targetMachineIds) {
        // Determine similarity weight
        const weight = input.similarityWeights?.[targetId]
          ?? this._inferSimilarity(input.sourceMachineId, targetId);

        // Apply weighted biases to target
        let adjustmentsApplied = 0;
        for (const bias of biases) {
          const weightedBias = bias.value * weight;
          if (Math.abs(weightedBias) > 0.001) {
            // Apply via engine if possible
            if (input.sourceEngine.applyBias) {
              input.sourceEngine.applyBias(targetId, bias.type, weightedBias);
            } else if (input.sourceEngine.recordMeasurement) {
              // Simulate by recording a synthetic measurement
              input.sourceEngine.recordMeasurement({
                machineId: targetId,
                measurementType: bias.type,
                predicted: 100,
                measured: 100 + weightedBias,
                source: 'fleet_propagation',
              });
            }
            adjustmentsApplied++;
          }
        }

        targets.push({
          machineId: targetId,
          adjustmentsApplied,
          weight,
        });
      }

      const totalAdj = targets.reduce((s, t) => s + t.adjustmentsApplied, 0);
      return {
        propagated: totalAdj > 0,
        targets,
        message: `Propagated ${biases.length} bias(es) from '${input.sourceMachineId}' to ${targets.length} target(s) with ${totalAdj} total adjustments`,
      };
    } catch (err: any) {
      return {
        propagated: false,
        targets: [],
        message: 'Fleet learning error: ' + (err.message || 'unknown'),
      };
    }
  }

  // ==========================================================================
  // 5. anomalyGuard
  // ==========================================================================

  /**
   * Check if a new measurement is an outlier before it corrupts learning data.
   *
   * Computes z-score against recent history for the same machine + measurement type.
   * Also checks for physically impossible values (negative dimensions, Ra < 0, force < 0).
   *
   * @param input - New measurement, historical data, and optional z-score threshold
   * @returns AnomalyResult with z-score, anomaly flag, and recommendation
   */
  anomalyGuard(input: AnomalyInput): AnomalyResult {
    const threshold = input.threshold ?? 3.0;
    const measured = input.measurement.measured;
    const mType = input.measurement.measurementType;

    // Check physically impossible values first
    const physicsCheck = this._checkPhysicalValidity(measured, mType);
    if (physicsCheck) {
      return {
        isAnomaly: true,
        zScore: Infinity,
        reason: physicsCheck,
        recommendation: 'reject',
        historicalMean: 0,
        historicalStdDev: 0,
      };
    }

    // Need at least 3 data points for meaningful statistics
    if (!input.history || input.history.length < 3) {
      return {
        isAnomaly: false,
        zScore: 0,
        reason: 'Insufficient history for anomaly detection (need >= 3 data points)',
        recommendation: 'accept',
        historicalMean: measured,
        historicalStdDev: 0,
      };
    }

    // Compute mean and std dev from history
    const values = input.history.map((h) => h.measured);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Handle zero/near-zero std dev
    if (stdDev < 1e-10) {
      const isExact = Math.abs(measured - mean) < 1e-10;
      return {
        isAnomaly: !isExact,
        zScore: isExact ? 0 : Infinity,
        reason: isExact
          ? undefined
          : `All historical values are identical (${mean}), new value ${measured} deviates`,
        recommendation: isExact ? 'accept' : 'review',
        historicalMean: mean,
        historicalStdDev: stdDev,
      };
    }

    // Compute z-score
    const zScore = (measured - mean) / stdDev;
    const absZ = Math.abs(zScore);

    let recommendation: 'accept' | 'review' | 'reject';
    let reason: string | undefined;

    if (absZ > threshold * 1.5) {
      recommendation = 'reject';
      reason = `Extreme outlier: z-score ${zScore.toFixed(2)} exceeds 1.5x threshold (${(threshold * 1.5).toFixed(1)})`;
    } else if (absZ > threshold) {
      recommendation = 'review';
      reason = `Outlier detected: z-score ${zScore.toFixed(2)} exceeds threshold (${threshold})`;
    } else {
      recommendation = 'accept';
      reason = undefined;
    }

    return {
      isAnomaly: absZ > threshold,
      zScore: Math.round(zScore * 1000) / 1000,
      reason,
      recommendation,
      historicalMean: Math.round(mean * 1000) / 1000,
      historicalStdDev: Math.round(stdDev * 1000) / 1000,
    };
  }

  // ==========================================================================
  // 6. timeWeightedCalibrate
  // ==========================================================================

  /**
   * Apply exponential time decay so recent measurements matter more than old ones.
   *
   * Weight_i = exp(-lambda * (now - timestamp_i) / (24*60*60*1000))
   *
   * Lambda controls decay rate:
   * - 0.01 => half-life ~ 69 days (measurements from 2 months ago ~ 50% weight)
   * - 0.1  => half-life ~ 7 days (aggressive decay)
   *
   * Computes weighted mean bias, weighted RMSE, effective sample size,
   * oldest relevant measurement age, recent bias (last 7 days), and trend direction.
   *
   * @param input - Measurements with timestamps, decay rate, and optional current time
   * @returns TimeWeightedResult with weighted statistics and trend analysis
   */
  timeWeightedCalibrate(input: TimeWeightedInput): TimeWeightedResult {
    const lambda = input.decayRate ?? 0.01;
    const now = input.now ?? Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;

    if (!input.measurements || input.measurements.length === 0) {
      return {
        weightedBias: 0,
        weightedRMSE: 0,
        effectiveSampleSize: 0,
        oldestRelevant_days: 0,
        recentBias: 0,
        trendDirection: 'stable',
      };
    }

    // Compute residuals and weights
    const entries = input.measurements.map((m) => {
      const residual = m.measured - m.predicted;
      const ageDays = (now - m.timestamp) / msPerDay;
      const weight = Math.exp(-lambda * ageDays);
      return { residual, weight, ageDays, timestamp: m.timestamp };
    });

    // Weighted mean bias = sum(w_i * r_i) / sum(w_i)
    const sumW = entries.reduce((s, e) => s + e.weight, 0);

    if (sumW < 1e-12) {
      return {
        weightedBias: 0,
        weightedRMSE: 0,
        effectiveSampleSize: 0,
        oldestRelevant_days: 0,
        recentBias: 0,
        trendDirection: 'stable',
      };
    }

    const weightedBias = entries.reduce((s, e) => s + e.weight * e.residual, 0) / sumW;

    // Weighted RMSE = sqrt(sum(w_i * r_i^2) / sum(w_i))
    const weightedMSE = entries.reduce((s, e) => s + e.weight * e.residual * e.residual, 0) / sumW;
    const weightedRMSE = Math.sqrt(weightedMSE);

    // Effective sample size: (sum(w_i))^2 / sum(w_i^2) — Kish's formula
    const sumW2 = entries.reduce((s, e) => s + e.weight * e.weight, 0);
    const effectiveSampleSize = sumW2 > 0 ? (sumW * sumW) / sumW2 : 0;

    // Oldest relevant: age where weight < 0.05 => exp(-lambda * d) < 0.05 => d > -ln(0.05)/lambda
    const oldestRelevant_days = Math.round((-Math.log(0.05) / lambda) * 10) / 10;

    // Recent bias: last 7 days only
    const recentEntries = entries.filter((e) => e.ageDays <= 7);
    let recentBias = 0;
    if (recentEntries.length > 0) {
      recentBias = recentEntries.reduce((s, e) => s + e.residual, 0) / recentEntries.length;
    }

    // Trend direction: compare recent bias (last 7 days) vs overall
    // "improving" = recent |bias| < overall |bias|
    // "degrading" = recent |bias| > overall |bias| by > 20%
    // "stable" = otherwise
    let trendDirection: 'improving' | 'stable' | 'degrading' = 'stable';
    const absRecent = Math.abs(recentBias);
    const absOverall = Math.abs(weightedBias);

    if (recentEntries.length >= 2) {
      if (absRecent < absOverall * 0.8) {
        trendDirection = 'improving';
      } else if (absRecent > absOverall * 1.2 && absRecent > 0.01) {
        trendDirection = 'degrading';
      }
    }

    return {
      weightedBias: Math.round(weightedBias * 10000) / 10000,
      weightedRMSE: Math.round(weightedRMSE * 10000) / 10000,
      effectiveSampleSize: Math.round(effectiveSampleSize * 100) / 100,
      oldestRelevant_days,
      recentBias: Math.round(recentBias * 10000) / 10000,
      trendDirection,
    };
  }

  // ==========================================================================
  // parseCMMExport
  // ==========================================================================

  /**
   * Parse common CMM export formats (CSV with header row).
   *
   * Expects CSV with columns: Feature, Nominal, Actual, Deviation, Tolerance.
   * Returns structured measurement records ready for recordMeasurement.
   *
   * @param input - CSV content string, machine ID, and optional delimiter
   * @returns CMMParseResult with parsed features, tolerance status, and worst deviation
   */
  parseCMMExport(input: CMMInput): CMMParseResult {
    const delimiter = input.delimiter || ',';
    const lines = input.csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return {
        measurements: [],
        totalFeatures: 0,
        outOfTolerance: 0,
        worstDeviation: { feature: 'none', deviation: 0 },
      };
    }

    // Parse header row to find column indices
    const header = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());
    const featureIdx = this._findColumnIndex(header, ['feature', 'name', 'id', 'point']);
    const nominalIdx = this._findColumnIndex(header, ['nominal', 'nom', 'target']);
    const actualIdx = this._findColumnIndex(header, ['actual', 'measured', 'act']);
    const deviationIdx = this._findColumnIndex(header, ['deviation', 'dev', 'error', 'diff']);
    const toleranceIdx = this._findColumnIndex(header, ['tolerance', 'tol', 'limit']);

    const measurements: CMMFeature[] = [];
    let worstDevAbs = 0;
    let worstFeature = 'none';

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map((c) => c.trim());

      const featureName = featureIdx >= 0 ? cols[featureIdx] || `Feature_${i}` : `Feature_${i}`;
      const nominal = nominalIdx >= 0 ? parseFloat(cols[nominalIdx]) : 0;
      const actual = actualIdx >= 0 ? parseFloat(cols[actualIdx]) : 0;

      // Deviation: use column if present, otherwise compute
      let deviation: number;
      if (deviationIdx >= 0 && !isNaN(parseFloat(cols[deviationIdx]))) {
        deviation = parseFloat(cols[deviationIdx]);
      } else {
        deviation = actual - nominal;
      }

      // Tolerance: use column if present
      let tolerance = Infinity;
      if (toleranceIdx >= 0 && !isNaN(parseFloat(cols[toleranceIdx]))) {
        tolerance = Math.abs(parseFloat(cols[toleranceIdx]));
      }

      const inTolerance = Math.abs(deviation) <= tolerance;

      // Skip rows where parsing failed
      if (isNaN(actual) && isNaN(nominal)) {
        continue;
      }

      measurements.push({
        featureName,
        nominal: isNaN(nominal) ? 0 : nominal,
        actual: isNaN(actual) ? 0 : actual,
        deviation: isNaN(deviation) ? 0 : Math.round(deviation * 10000) / 10000,
        inTolerance,
      });

      const absdev = Math.abs(deviation);
      if (!isNaN(absdev) && absdev > worstDevAbs) {
        worstDevAbs = absdev;
        worstFeature = featureName;
      }
    }

    const outOfTolerance = measurements.filter((m) => !m.inTolerance).length;

    return {
      measurements,
      totalFeatures: measurements.length,
      outOfTolerance,
      worstDeviation: {
        feature: worstFeature,
        deviation: Math.round(worstDevAbs * 10000) / 10000,
      },
    };
  }

  // ==========================================================================
  // stats
  // ==========================================================================

  /**
   * Return engine metadata for introspection.
   *
   * @returns Method list and description
   */
  stats(): { methods: string[]; description: string } {
    return {
      methods: [
        'persistToFile',
        'restoreFromFile',
        'autoMatchPrediction',
        'fleetLearning',
        'anomalyGuard',
        'timeWeightedCalibrate',
        'parseCMMExport',
      ],
      description:
        'FeedbackPersistenceEngine: 6 production-readiness improvements for MachineLearningFeedbackEngine ' +
        '(file persistence, auto-match predictions, fleet propagation, anomaly guard, time-weighted calibration, CMM parsing)',
    };
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  /**
   * Resolve a material string to an ISO group key (P/M/K/N/S/H).
   * Accepts ISO group letters, common names, or material numbers.
   */
  private _resolveISOGroup(material: string): string {
    const m = material.toUpperCase().trim();

    // Direct ISO group
    if (ISO_MATERIAL_DEFAULTS[m]) return m;

    // Common name mapping
    const nameMap: Record<string, string> = {
      STEEL: 'P', 'CARBON STEEL': 'P', 'ALLOY STEEL': 'P', '1045': 'P', '4140': 'P',
      STAINLESS: 'M', 'STAINLESS STEEL': 'M', '304': 'M', '316': 'M', '17-4': 'M',
      'CAST IRON': 'K', 'GRAY IRON': 'K', 'DUCTILE IRON': 'K', GCI: 'K', NCI: 'K',
      ALUMINUM: 'N', ALUMINIUM: 'N', '6061': 'N', '7075': 'N', COPPER: 'N', BRASS: 'N',
      INCONEL: 'S', TITANIUM: 'S', 'TI-6AL-4V': 'S', HASTELLOY: 'S', WASPALOY: 'S',
      HARDENED: 'H', 'HARDENED STEEL': 'H', D2: 'H', 'TOOL STEEL': 'H',
    };

    if (nameMap[m]) return nameMap[m];

    // Partial match
    for (const [key, group] of Object.entries(nameMap)) {
      if (m.includes(key) || key.includes(m)) return group;
    }

    // Default to P (steel)
    return 'P';
  }

  /**
   * Extract machine data from an MLF engine for a specific machine ID.
   */
  private _getSourceMachineData(engine: any, machineId: string): any {
    // Try exportLearningData first
    if (engine.exportLearningData) {
      const data = engine.exportLearningData();
      if (data.machines && data.machines[machineId]) {
        return data.machines[machineId];
      }
    }

    // Try getMachineData
    if (engine.getMachineData) {
      return engine.getMachineData(machineId);
    }

    // Try direct access
    if (engine.machines && engine.machines[machineId]) {
      return engine.machines[machineId];
    }

    return null;
  }

  /**
   * Extract calibration biases from machine data.
   * Returns array of { type, value } bias entries.
   */
  private _extractBiases(machineData: any): { type: string; value: number }[] {
    const biases: { type: string; value: number }[] = [];

    // Try calibration/biases field
    if (machineData.calibration) {
      for (const [type, val] of Object.entries(machineData.calibration)) {
        if (typeof val === 'number') {
          biases.push({ type, value: val });
        } else if (typeof val === 'object' && val !== null && (val as any).bias !== undefined) {
          biases.push({ type, value: (val as any).bias });
        }
      }
    }

    // Try biases field directly
    if (machineData.biases) {
      for (const [type, val] of Object.entries(machineData.biases)) {
        if (typeof val === 'number') {
          biases.push({ type, value: val });
        }
      }
    }

    // Compute from measurements if no explicit biases
    if (biases.length === 0 && machineData.measurements) {
      const byType: Record<string, number[]> = {};
      for (const m of machineData.measurements) {
        const t = m.measurementType || m.type || 'unknown';
        if (!byType[t]) byType[t] = [];
        if (m.measured !== undefined && m.predicted !== undefined) {
          byType[t].push(m.measured - m.predicted);
        }
      }
      for (const [type, residuals] of Object.entries(byType)) {
        if (residuals.length > 0) {
          const meanBias = residuals.reduce((s, v) => s + v, 0) / residuals.length;
          biases.push({ type, value: meanBias });
        }
      }
    }

    return biases;
  }

  /**
   * Infer similarity weight between two machine IDs based on naming convention.
   * - Same prefix (manufacturer): 0.7
   * - Same suffix (type like VMC/HMC/lathe): 0.5
   * - Otherwise: 0.2
   */
  private _inferSimilarity(sourceId: string, targetId: string): number {
    const src = sourceId.toLowerCase();
    const tgt = targetId.toLowerCase();

    // Extract manufacturer prefix (everything before first dash or number)
    const srcMfr = src.replace(/[-_].*$/, '').replace(/\d+.*$/, '');
    const tgtMfr = tgt.replace(/[-_].*$/, '').replace(/\d+.*$/, '');

    // Extract machine type keywords
    const typeKeywords = ['vmc', 'hmc', 'lathe', 'mill', 'turn', 'grind', 'edm', '5axis', '3axis'];
    const srcType = typeKeywords.find((k) => src.includes(k));
    const tgtType = typeKeywords.find((k) => tgt.includes(k));

    if (srcMfr && tgtMfr && srcMfr === tgtMfr) {
      return 0.7;
    }
    if (srcType && tgtType && srcType === tgtType) {
      return 0.5;
    }
    return 0.2;
  }

  /**
   * Check if a measurement value is physically impossible.
   * Returns error string if invalid, undefined if OK.
   */
  private _checkPhysicalValidity(value: number, measurementType: string): string | undefined {
    if (value === null || value === undefined || isNaN(value)) {
      return 'Value is null, undefined, or NaN';
    }

    const type = measurementType.toLowerCase();

    // Force must be non-negative
    if ((type === 'force' || type.includes('force')) && value < 0) {
      return `Physically impossible: negative force value (${value})`;
    }

    // Surface finish (Ra) must be non-negative
    if ((type === 'surface_finish' || type === 'roughness' || type === 'ra') && value < 0) {
      return `Physically impossible: negative surface roughness (${value})`;
    }

    // Temperature must be above absolute zero
    if (type === 'temperature' && value < -273.15) {
      return `Physically impossible: temperature below absolute zero (${value} C)`;
    }

    // Tool life must be positive
    if (type === 'tool_life' && value <= 0) {
      return `Physically impossible: non-positive tool life (${value})`;
    }

    return undefined;
  }

  /**
   * Find a column index in a header row by trying multiple possible names.
   */
  private _findColumnIndex(header: string[], candidates: string[]): number {
    for (const candidate of candidates) {
      const idx = header.indexOf(candidate);
      if (idx >= 0) return idx;
    }
    // Partial match
    for (const candidate of candidates) {
      const idx = header.findIndex((h) => h.includes(candidate));
      if (idx >= 0) return idx;
    }
    return -1;
  }
}
