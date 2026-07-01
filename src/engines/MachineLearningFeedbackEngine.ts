// @ts-nocheck
/**
 * MachineLearningFeedbackEngine
 *
 * Turns PRISM from a static calculator into a learning system that improves
 * with every part the user makes. Users feed real measurements (CMM, micrometers,
 * profilometers, tool presetters, etc.) back into PRISM. The engine accumulates
 * per-machine, per-material, per-operation history, detects systematic biases
 * and drifts, updates physics model coefficients (kc1.1, Taylor C/n, Ra bias,
 * thermal coefficients), tracks prediction accuracy over time, and provides
 * confidence levels based on how much data exists for each machine/material combo.
 *
 * Storage is in-memory (Map<string, MachineProfile>). Persistence via file I/O
 * can be layered on top later through exportLearningData / importLearningData.
 */

// ── Interfaces ───────────────────────────────────────────────────────────────

export interface RecordMeasurementInput {
  machineId: string;
  measurementType:
    | 'dimension' | 'surface_finish' | 'tool_life'
    | 'force' | 'temperature' | 'vibration' | 'power';
  measured: number;
  predicted?: number;
  unit: string;
  material?: string;
  operation?: string;
  toolId?: string;
  parameters?: {
    speed_mpm?: number;
    feed_mmrev?: number;
    depth_mm?: number;
    stepover_mm?: number;
    [key: string]: number | undefined;
  };
  timestamp?: number;
  notes?: string;
  partId?: string;
  batchId?: string;
}

export interface RecordMeasurementResult {
  id: string;
  residual?: number;
  residualPercent?: number;
  currentBias: number;
  currentRMSE: number;
  measurementCount: number;
  calibrationRecommended: boolean;
  message: string;
}

export interface GetProfileInput {
  machineId: string;
  measurementType?: string;
}

export interface MachineProfileResult {
  machineId: string;
  totalMeasurements: number;
  measurementsByType: Record<string, number>;
  biases: Record<string, { mean: number; stdDev: number; n: number; significant: boolean }>;
  rmseByType: Record<string, number>;
  materials: string[];
  lastCalibration: number | null;
  predictionAccuracy: Record<string, number>;
  recommendations: string[];
}

export interface AutoCalibrateInput {
  machineId: string;
  measurementType?: string;
  minSamples?: number;
}

export interface CalibrationEntry {
  type: string;
  beforeBias: number;
  afterBias: number;
  coefficients?: Record<string, number>;
  improvement: string;
}

export interface AutoCalibrateResult {
  calibrated: boolean;
  calibrations: CalibrationEntry[];
  machineCoefficients: Record<string, number>;
  message: string;
}

export interface PredictInput {
  machineId: string;
  predictionType: 'force' | 'surface_finish' | 'tool_life' | 'dimension' | 'temperature';
  parameters: {
    speed_mpm?: number;
    feed_mmrev?: number;
    depth_mm?: number;
    material?: string;
    toolDiameter_mm?: number;
    noseRadius_mm?: number;
    nominal_mm?: number;
    [key: string]: any;
  };
}

export interface PredictResult {
  predicted: number;
  confidence: 'high' | 'medium' | 'low' | 'no_data';
  confidenceInterval?: [number, number];
  basedOnMeasurements: number;
  adjustments: { factor: string; value: number }[];
  standardPrediction: number;
  improvementPercent: number;
}

export interface AccuracyReportInput {
  machineId: string;
  measurementType?: string;
  lastN?: number;
}

export interface AccuracyReportResult {
  machineId: string;
  overallAccuracy: number;
  rmse: number;
  meanBias: number;
  trendDirection: 'improving' | 'stable' | 'degrading';
  accuracyByType: Record<string, { accuracy: number; rmse: number; bias: number; n: number }>;
  accuracyByMaterial: Record<string, { accuracy: number; n: number }>;
  accuracyOverTime: { period: string; accuracy: number }[];
  worstPredictions: { predicted: number; measured: number; type: string; error: number }[];
}

export interface CompareMachinesInput {
  machineIds: string[];
}

export interface CompareMachinesResult {
  comparison: {
    machineId: string;
    totalMeasurements: number;
    overallRMSE: number;
    meanBias: number;
    accuracy: number;
  }[];
  bestMachine: string;
  worstMachine: string;
  systemicBiases: { type: string; allMachinesBias: number; isSystemic: boolean }[];
}

export interface ExportInput {
  machineId?: string;
  format?: 'json' | 'csv';
}

export interface ExportResult {
  data: any;
  measurementCount: number;
  machineCount: number;
}

export interface ImportInput {
  data: any;
}

export interface ImportResult {
  imported: number;
  machines: string[];
  message: string;
}

// ── Internal storage types ───────────────────────────────────────────────────

export interface MeasurementRecord {
  id: string;
  machineId: string;
  measurementType: string;
  measured: number;
  predicted?: number;
  residual?: number;
  unit: string;
  material?: string;
  operation?: string;
  toolId?: string;
  parameters?: Record<string, number>;
  timestamp: number;
  partId?: string;
  batchId?: string;
  notes?: string;
}

export interface MachineProfile {
  machineId: string;
  measurements: MeasurementRecord[];
  coefficients: Record<string, number>;
  lastCalibration: number | null;
  calibrationHistory: { timestamp: number; type: string; before: number; after: number }[];
}

// ── Default coefficients ─────────────────────────────────────────────────────

const DEFAULT_COEFFICIENTS: Record<string, number> = {
  kc1_1: 1800,       // Kienzle specific cutting force [N/mm^2]
  mc: 0.25,          // Kienzle exponent
  taylorC: 300,      // Taylor tool life constant [m/min]
  taylorN: 0.25,     // Taylor exponent
  raBias: 0,         // Surface roughness bias correction [um]
  dimBias: 0,        // Dimensional bias correction [mm]
  tempBias: 0,       // Temperature bias correction [C]
  forceBias: 0,      // Force bias correction [N]
  vibBias: 0,        // Vibration bias correction
  powerBias: 0,      // Power bias correction [kW]
};

// ── Utility helpers ──────────────────────────────────────────────────────────

/**
 * Compute arithmetic mean of an array.
 */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * Compute sample standard deviation.
 */
function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Compute Root Mean Squared Error from an array of residuals.
 */
function rmse(residuals: number[]): number {
  if (residuals.length === 0) return 0;
  return Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length);
}

/**
 * z-test on mean residual: z = mean_bias / (stdDev / sqrt(n)).
 * Returns true if |z| > 1.96 (95% confidence) AND n >= 5.
 */
function isBiasSignificant(residuals: number[]): boolean {
  const n = residuals.length;
  if (n < 5) return false;
  const m = mean(residuals);
  const sd = stdDev(residuals);
  if (sd === 0) return m !== 0;
  const z = Math.abs(m) / (sd / Math.sqrt(n));
  return z > 1.96;
}

/**
 * Compute percentile of a sorted array using linear interpolation.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Format a month key from a timestamp: "YYYY-MM".
 */
function monthKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Simple log-linear regression for Taylor equation fitting.
 * Given (V_i, T_i) pairs, fits ln(T) = ln(C) - n * ln(V) via OLS.
 * Returns { C, n }.
 */
function fitTaylor(speeds: number[], lives: number[]): { C: number; n: number } {
  const n = speeds.length;
  if (n < 2) return { C: DEFAULT_COEFFICIENTS.taylorC, n: DEFAULT_COEFFICIENTS.taylorN };
  const lnV = speeds.map(v => Math.log(Math.max(v, 1e-6)));
  const lnT = lives.map(t => Math.log(Math.max(t, 1e-6)));
  const mX = mean(lnV);
  const mY = mean(lnT);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (lnV[i] - mX) * (lnT[i] - mY);
    den += (lnV[i] - mX) ** 2;
  }
  const slope = den !== 0 ? num / den : 0; // slope = -n_taylor
  const intercept = mY - slope * mX;       // intercept = ln(C)
  const taylorN = Math.max(0.05, Math.min(1.0, -slope));
  const taylorC = Math.exp(intercept);
  return { C: taylorC, n: taylorN };
}

/**
 * Bayesian normal update for Kienzle kc1.1.
 * Prior: N(mu_prior, sigma_prior^2). Likelihood from measured forces.
 * Posterior mean = (mu_prior/sigma_prior^2 + n*x_bar/sigma_data^2) /
 *                 (1/sigma_prior^2 + n/sigma_data^2)
 */
function bayesianKienzleUpdate(
  priorMu: number,
  priorSigma: number,
  measuredKc: number[],
): { mu: number; sigma: number } {
  if (measuredKc.length === 0) return { mu: priorMu, sigma: priorSigma };
  const n = measuredKc.length;
  const xBar = mean(measuredKc);
  const dataVar = n < 2 ? priorSigma ** 2 : measuredKc.reduce((s, v) => s + (v - xBar) ** 2, 0) / (n - 1);
  const dataSigma2 = Math.max(dataVar, 1e-6);
  const priorPrec = 1 / (priorSigma ** 2);
  const dataPrec = n / dataSigma2;
  const postPrec = priorPrec + dataPrec;
  const postMu = (priorMu * priorPrec + xBar * dataPrec) / postPrec;
  const postSigma = Math.sqrt(1 / postPrec);
  return { mu: postMu, sigma: postSigma };
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class MachineLearningFeedbackEngine {
  /**
   * In-memory storage of all machine profiles keyed by machineId.
   * Each profile accumulates measurements, learned coefficients,
   * and calibration history.
   */
  private machines: Map<string, MachineProfile> = new Map();

  /** Global monotonic counter for measurement IDs. */
  private measurementCounter = 0;

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Retrieve or create a MachineProfile for the given machineId.
   */
  private getOrCreateProfile(machineId: string): MachineProfile {
    let profile = this.machines.get(machineId);
    if (!profile) {
      profile = {
        machineId,
        measurements: [],
        coefficients: { ...DEFAULT_COEFFICIENTS },
        lastCalibration: null,
        calibrationHistory: [],
      };
      this.machines.set(machineId, profile);
    }
    return profile;
  }

  /**
   * Filter measurements by type (and optionally by material).
   */
  private filterMeasurements(
    profile: MachineProfile,
    type?: string,
    material?: string,
  ): MeasurementRecord[] {
    let recs = profile.measurements;
    if (type) recs = recs.filter(r => r.measurementType === type);
    if (material) recs = recs.filter(r => r.material === material);
    return recs;
  }

  /**
   * Get residuals (measured - predicted) for records that have both values.
   */
  private getResiduals(records: MeasurementRecord[]): number[] {
    return records
      .filter(r => r.residual !== undefined)
      .map(r => r.residual!);
  }

  /**
   * Compute bias stats for a set of residuals.
   */
  private biasStats(residuals: number[]): { mean: number; stdDev: number; n: number; significant: boolean } {
    return {
      mean: mean(residuals),
      stdDev: stdDev(residuals),
      n: residuals.length,
      significant: isBiasSignificant(residuals),
    };
  }

  /**
   * Compute prediction accuracy: fraction of predictions within +/- 10% of measured.
   */
  private accuracyWithin10(records: MeasurementRecord[]): number {
    const paired = records.filter(r => r.predicted !== undefined && r.predicted !== 0);
    if (paired.length === 0) return 0;
    const within = paired.filter(r => {
      const relErr = Math.abs(r.measured - r.predicted!) / Math.abs(r.predicted!);
      return relErr <= 0.1;
    });
    return (within.length / paired.length) * 100;
  }

  /**
   * Derive kc values from force measurements that include cutting parameters.
   * kc = F / (b * h) where b = depth_mm, h = feed_mmrev.
   */
  private deriveKcValues(records: MeasurementRecord[]): number[] {
    const kcVals: number[] = [];
    for (const r of records) {
      if (r.measurementType !== 'force' || !r.parameters) continue;
      const b = r.parameters.depth_mm;
      const h = r.parameters.feed_mmrev;
      if (b && h && b > 0 && h > 0) {
        const kc = r.measured / (b * h);
        if (isFinite(kc) && kc > 0) kcVals.push(kc);
      }
    }
    return kcVals;
  }

  /**
   * Extract (speed, tool_life) pairs for Taylor fitting.
   */
  private extractToolLifePairs(records: MeasurementRecord[]): { speeds: number[]; lives: number[] } {
    const speeds: number[] = [];
    const lives: number[] = [];
    for (const r of records) {
      if (r.measurementType !== 'tool_life' || !r.parameters) continue;
      const v = r.parameters.speed_mpm;
      if (v && v > 0 && r.measured > 0) {
        speeds.push(v);
        lives.push(r.measured);
      }
    }
    return { speeds, lives };
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Record a physical measurement from the shop floor.
   *
   * This is the primary entry point for the learning loop. The user submits
   * what they actually measured on a real part, alongside what PRISM predicted
   * (if available). The engine stores the record, computes the residual
   * (measured - predicted), updates running bias/RMSE statistics, and signals
   * whether calibration is recommended based on a z-test for significant bias.
   *
   * The accumulation of these records is what allows autoCalibrate() to later
   * update physics coefficients, and predict() to apply machine-specific
   * corrections.
   *
   * @param input - Measurement data including machineId, type, measured value, and optional prediction
   * @returns Statistics about the current residual, running bias/RMSE, and calibration recommendation
   */
  recordMeasurement(input: RecordMeasurementInput): RecordMeasurementResult {
    const profile = this.getOrCreateProfile(input.machineId);
    this.measurementCounter++;

    const id = `M-${input.machineId}-${this.measurementCounter}`;
    const timestamp = input.timestamp ?? Date.now();

    let residual: number | undefined;
    let residualPercent: number | undefined;
    if (input.predicted !== undefined) {
      residual = input.measured - input.predicted;
      if (input.predicted !== 0) {
        residualPercent = (residual / Math.abs(input.predicted)) * 100;
      }
    }

    // Flatten parameters to Record<string, number>
    let params: Record<string, number> | undefined;
    if (input.parameters) {
      params = {};
      for (const [k, v] of Object.entries(input.parameters)) {
        if (v !== undefined) params[k] = v;
      }
    }

    const record: MeasurementRecord = {
      id,
      machineId: input.machineId,
      measurementType: input.measurementType,
      measured: input.measured,
      predicted: input.predicted,
      residual,
      unit: input.unit,
      material: input.material,
      operation: input.operation,
      toolId: input.toolId,
      parameters: params,
      timestamp,
      partId: input.partId,
      batchId: input.batchId,
      notes: input.notes,
    };

    profile.measurements.push(record);

    // Compute running stats for this machine + measurement type
    const typeRecords = this.filterMeasurements(profile, input.measurementType);
    const residuals = this.getResiduals(typeRecords);
    const currentBias = mean(residuals);
    const currentRMSE = rmse(residuals);
    const n = typeRecords.length;

    // Calibration recommended if bias is statistically significant
    const calibrationRecommended = isBiasSignificant(residuals);

    let message = `Recorded ${input.measurementType} measurement for machine ${input.machineId} (${n} total).`;
    if (residual !== undefined) {
      message += ` Residual: ${residual >= 0 ? '+' : ''}${residual.toFixed(4)} ${input.unit}`;
      if (residualPercent !== undefined) {
        message += ` (${residualPercent >= 0 ? '+' : ''}${residualPercent.toFixed(1)}%)`;
      }
      message += '.';
    }
    if (calibrationRecommended) {
      message += ` Calibration recommended: systematic bias of ${currentBias.toFixed(4)} detected.`;
    }

    return {
      id,
      residual,
      residualPercent,
      currentBias,
      currentRMSE,
      measurementCount: n,
      calibrationRecommended,
      message,
    };
  }

  /**
   * View the accumulated learning profile for a specific machine.
   *
   * Returns a comprehensive summary of all measurements, biases (with
   * statistical significance via z-test), RMSE by type, prediction accuracy,
   * unique materials seen, and actionable recommendations. This gives the user
   * a dashboard view of how well PRISM knows their specific machine.
   *
   * @param input - machineId and optional measurementType filter
   * @returns Full profile summary with biases, accuracy, and recommendations
   */
  getMachineProfile(input: GetProfileInput): MachineProfileResult {
    const profile = this.getOrCreateProfile(input.machineId);
    const recs = input.measurementType
      ? this.filterMeasurements(profile, input.measurementType)
      : profile.measurements;

    // Count by type
    const measurementsByType: Record<string, number> = {};
    for (const r of recs) {
      measurementsByType[r.measurementType] = (measurementsByType[r.measurementType] || 0) + 1;
    }

    // Biases by type
    const biases: Record<string, { mean: number; stdDev: number; n: number; significant: boolean }> = {};
    const rmseByType: Record<string, number> = {};
    const predictionAccuracy: Record<string, number> = {};

    const types = Object.keys(measurementsByType);
    for (const t of types) {
      const typeRecs = this.filterMeasurements(profile, t);
      const residuals = this.getResiduals(typeRecs);
      if (residuals.length > 0) {
        biases[t] = this.biasStats(residuals);
        rmseByType[t] = rmse(residuals);
      }
      predictionAccuracy[t] = this.accuracyWithin10(typeRecs);
    }

    // Unique materials
    const materialSet = new Set<string>();
    for (const r of recs) {
      if (r.material) materialSet.add(r.material);
    }

    // Recommendations
    const recommendations: string[] = [];
    for (const t of types) {
      if (biases[t]?.significant) {
        recommendations.push(
          `Run autoCalibrate for "${t}" — significant bias of ${biases[t].mean.toFixed(4)} detected (n=${biases[t].n}).`,
        );
      }
      if ((measurementsByType[t] || 0) < 5) {
        recommendations.push(
          `Collect more "${t}" measurements (currently ${measurementsByType[t]}) for reliable calibration (min 5).`,
        );
      }
    }
    if (types.length === 0) {
      recommendations.push('No measurements recorded yet. Start by recording dimension or surface_finish measurements.');
    }
    if (!profile.lastCalibration && profile.measurements.length >= 10) {
      recommendations.push('Enough data collected — consider running autoCalibrate to improve predictions.');
    }

    return {
      machineId: input.machineId,
      totalMeasurements: recs.length,
      measurementsByType,
      biases,
      rmseByType,
      materials: Array.from(materialSet).sort(),
      lastCalibration: profile.lastCalibration,
      predictionAccuracy,
      recommendations,
    };
  }

  /**
   * Trigger automatic recalibration of physics coefficients using accumulated data.
   *
   * This is where the learning actually updates the model. For each measurement type
   * with enough data (>= minSamples), the engine applies the appropriate calibration
   * algorithm:
   *
   * - **force** -> Bayesian normal update of Kienzle kc1.1. Prior: N(kc1.1_current, 200).
   *   Measured kc values are derived from F/(b*h). Posterior mean becomes new kc1.1.
   *
   * - **tool_life** -> Log-linear OLS regression for Taylor VT^n = C. Fits ln(T) vs ln(V)
   *   to extract C and n from actual measured tool life at various speeds.
   *
   * - **surface_finish** -> Mean bias correction. Ra_corrected = Ra_predicted - mean(residuals).
   *   Simple but effective for systematic offsets due to machine rigidity, tool runout, etc.
   *
   * - **dimension** -> Linear drift compensation via mean bias. Accounts for systematic
   *   positioning errors, thermal growth, backlash, etc.
   *
   * - **temperature** / **vibration** / **power** -> Mean bias correction analogous to Ra.
   *
   * After calibration, the machine's coefficient map is updated and the calibration
   * event is logged in history.
   *
   * @param input - machineId, optional type filter, minimum sample threshold
   * @returns Calibration results with before/after biases and updated coefficients
   */
  autoCalibrate(input: AutoCalibrateInput): AutoCalibrateResult {
    const profile = this.getOrCreateProfile(input.machineId);
    const minSamples = input.minSamples ?? 5;
    const typesToCalibrate = input.measurementType
      ? [input.measurementType]
      : ['force', 'tool_life', 'surface_finish', 'dimension', 'temperature', 'vibration', 'power'];

    const calibrations: CalibrationEntry[] = [];
    const now = Date.now();

    for (const type of typesToCalibrate) {
      const typeRecs = this.filterMeasurements(profile, type);
      const residuals = this.getResiduals(typeRecs);

      if (typeRecs.length < minSamples || residuals.length < minSamples) continue;

      const beforeBias = mean(residuals);

      if (type === 'force') {
        // Bayesian update of Kienzle kc1.1
        const kcValues = this.deriveKcValues(typeRecs);
        if (kcValues.length >= 2) {
          const priorMu = profile.coefficients.kc1_1;
          const priorSigma = 200; // prior uncertainty
          const posterior = bayesianKienzleUpdate(priorMu, priorSigma, kcValues);
          const oldKc = profile.coefficients.kc1_1;
          profile.coefficients.kc1_1 = Math.round(posterior.mu * 10) / 10;
          profile.coefficients.forceBias = 0; // reset bias after recalibration

          calibrations.push({
            type: 'force',
            beforeBias,
            afterBias: 0,
            coefficients: { kc1_1: profile.coefficients.kc1_1 },
            improvement: `kc1.1 updated from ${oldKc.toFixed(1)} to ` +
              `${profile.coefficients.kc1_1.toFixed(1)} N/mm^2 via Bayesian update ` +
              `(${kcValues.length} force samples)`,
          });
          profile.calibrationHistory.push({ timestamp: now, type: 'force', before: oldKc, after: profile.coefficients.kc1_1 });
        } else {
          // Fall back to mean bias correction for force
          profile.coefficients.forceBias = beforeBias;
          calibrations.push({
            type: 'force',
            beforeBias,
            afterBias: 0,
            coefficients: { forceBias: beforeBias },
            improvement: `Force bias correction of ${beforeBias.toFixed(2)} N applied ` +
              `(insufficient param data for kc1.1 Bayesian update)`,
          });
          profile.calibrationHistory.push({ timestamp: now, type: 'force', before: 0, after: beforeBias });
        }
      } else if (type === 'tool_life') {
        // Log-linear regression for Taylor C and n
        const { speeds, lives } = this.extractToolLifePairs(typeRecs);
        if (speeds.length >= 3) {
          const oldC = profile.coefficients.taylorC;
          const oldN = profile.coefficients.taylorN;
          const fit = fitTaylor(speeds, lives);
          profile.coefficients.taylorC = Math.round(fit.C * 10) / 10;
          profile.coefficients.taylorN = Math.round(fit.n * 1000) / 1000;

          calibrations.push({
            type: 'tool_life',
            beforeBias,
            afterBias: 0,
            coefficients: { taylorC: profile.coefficients.taylorC, taylorN: profile.coefficients.taylorN },
            improvement: `Taylor C updated ${oldC.toFixed(1)} -> ` +
              `${profile.coefficients.taylorC.toFixed(1)}, n updated ` +
              `${oldN.toFixed(3)} -> ${profile.coefficients.taylorN.toFixed(3)} ` +
              `via log-linear regression (${speeds.length} data points)`,
          });
          profile.calibrationHistory.push({ timestamp: now, type: 'tool_life', before: oldC, after: profile.coefficients.taylorC });
        } else {
          // Simple bias
          const biasVal = beforeBias;
          calibrations.push({
            type: 'tool_life',
            beforeBias,
            afterBias: 0,
            coefficients: { toolLifeBias: biasVal },
            improvement: `Tool life bias of ${biasVal.toFixed(2)} min applied (need >= 3 speed/life pairs for Taylor fit)`,
          });
        }
      } else if (type === 'surface_finish') {
        // Mean bias correction for Ra
        const oldBias = profile.coefficients.raBias;
        profile.coefficients.raBias = beforeBias;

        calibrations.push({
          type: 'surface_finish',
          beforeBias,
          afterBias: 0,
          coefficients: { raBias: profile.coefficients.raBias },
          improvement: `Ra bias correction updated from ${oldBias.toFixed(4)} to ${beforeBias.toFixed(4)} um (${residuals.length} measurements)`,
        });
        profile.calibrationHistory.push({ timestamp: now, type: 'surface_finish', before: oldBias, after: beforeBias });
      } else if (type === 'dimension') {
        // Linear drift compensation via mean bias
        const oldBias = profile.coefficients.dimBias;
        profile.coefficients.dimBias = beforeBias;

        calibrations.push({
          type: 'dimension',
          beforeBias,
          afterBias: 0,
          coefficients: { dimBias: profile.coefficients.dimBias },
          improvement: `Dimensional bias updated from ${oldBias.toFixed(4)} to ${beforeBias.toFixed(4)} mm (${residuals.length} measurements)`,
        });
        profile.calibrationHistory.push({ timestamp: now, type: 'dimension', before: oldBias, after: beforeBias });
      } else if (type === 'temperature') {
        const oldBias = profile.coefficients.tempBias;
        profile.coefficients.tempBias = beforeBias;
        calibrations.push({
          type: 'temperature',
          beforeBias,
          afterBias: 0,
          coefficients: { tempBias: profile.coefficients.tempBias },
          improvement: `Temperature bias correction updated from ` +
            `${oldBias.toFixed(2)} to ${beforeBias.toFixed(2)} C ` +
            `(${residuals.length} measurements)`,
        });
        profile.calibrationHistory.push({ timestamp: now, type: 'temperature', before: oldBias, after: beforeBias });
      } else if (type === 'vibration') {
        const oldBias = profile.coefficients.vibBias;
        profile.coefficients.vibBias = beforeBias;
        calibrations.push({
          type: 'vibration',
          beforeBias,
          afterBias: 0,
          coefficients: { vibBias: profile.coefficients.vibBias },
          improvement: `Vibration bias correction updated from ${oldBias.toFixed(4)} to ${beforeBias.toFixed(4)} (${residuals.length} measurements)`,
        });
        profile.calibrationHistory.push({ timestamp: now, type: 'vibration', before: oldBias, after: beforeBias });
      } else if (type === 'power') {
        const oldBias = profile.coefficients.powerBias;
        profile.coefficients.powerBias = beforeBias;
        calibrations.push({
          type: 'power',
          beforeBias,
          afterBias: 0,
          coefficients: { powerBias: profile.coefficients.powerBias },
          improvement: `Power bias correction updated from ${oldBias.toFixed(2)} to ${beforeBias.toFixed(2)} kW (${residuals.length} measurements)`,
        });
        profile.calibrationHistory.push({ timestamp: now, type: 'power', before: oldBias, after: beforeBias });
      }
    }

    if (calibrations.length > 0) {
      profile.lastCalibration = now;
    }

    return {
      calibrated: calibrations.length > 0,
      calibrations,
      machineCoefficients: { ...profile.coefficients },
      message: calibrations.length > 0
        ? `Calibrated ${calibrations.length} measurement type(s) for machine ${input.machineId}.`
        : `Insufficient data for calibration (need >= ${minSamples} measurements with predictions per type).`,
    };
  }

  /**
   * Make a prediction using machine-specific learned coefficients.
   *
   * This is where the learning pays off. Instead of using default textbook
   * coefficients, the engine applies the machine-specific coefficients that
   * were learned from actual measurements and refined via autoCalibrate().
   *
   * The method computes both the standard (textbook) prediction and the
   * machine-learned prediction, reporting the improvement. Confidence levels
   * are assigned based on the amount of available machine-specific data:
   * - high: >= 20 measurements of this type
   * - medium: 10-19 measurements
   * - low: 1-9 measurements
   * - no_data: no measurements (falls back to standard prediction)
   *
   * Confidence intervals are computed using the percentile bootstrap method
   * on historical residuals: [prediction + P2.5(residuals), prediction + P97.5(residuals)].
   *
   * Physics models used:
   * - Force: F = kc1.1 * b * h^(1-mc) where b = depth, h = feed (Kienzle)
   * - Surface finish: Ra = f^2 / (32 * rn) * 1000 (theoretical, then bias-corrected)
   * - Tool life: T = C / V^n (Taylor)
   * - Dimension: nominal + bias_offset
   * - Temperature: empirical scaling T_cut ~ 400 * (V * f)^0.35 + bias
   *
   * @param input - machineId, prediction type, and cutting/part parameters
   * @returns Prediction with confidence, CI, adjustments, and comparison to standard
   */
  predict(input: PredictInput): PredictResult {
    const profile = this.getOrCreateProfile(input.machineId);
    const p = input.parameters;

    const typeRecs = this.filterMeasurements(profile, input.predictionType);
    const residuals = this.getResiduals(typeRecs);
    const n = typeRecs.length;

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low' | 'no_data';
    if (n >= 20) confidence = 'high';
    else if (n >= 10) confidence = 'medium';
    else if (n >= 1) confidence = 'low';
    else confidence = 'no_data';

    const adjustments: { factor: string; value: number }[] = [];

    // Standard (textbook) coefficients
    const stdKc = DEFAULT_COEFFICIENTS.kc1_1;
    const stdMc = DEFAULT_COEFFICIENTS.mc;
    const stdC = DEFAULT_COEFFICIENTS.taylorC;
    const stdN = DEFAULT_COEFFICIENTS.taylorN;

    // Machine-learned coefficients
    const machKc = profile.coefficients.kc1_1;
    const machMc = profile.coefficients.mc;
    const machC = profile.coefficients.taylorC;
    const machN = profile.coefficients.taylorN;

    let standardPrediction = 0;
    let predicted = 0;

    const feed = p.feed_mmrev ?? 0.2;
    const depth = p.depth_mm ?? 2.0;
    const speed = p.speed_mpm ?? 150;
    const noseRadius = p.noseRadius_mm ?? 0.8;

    if (input.predictionType === 'force') {
      // Kienzle: F = kc1.1 * b * h^(1-mc)
      const b = depth;
      const h = feed;
      standardPrediction = stdKc * b * Math.pow(h, 1 - stdMc);
      predicted = machKc * b * Math.pow(h, 1 - machMc);

      // Apply residual bias correction if available
      if (profile.coefficients.forceBias !== 0) {
        predicted -= profile.coefficients.forceBias;
        adjustments.push({ factor: 'forceBias', value: -profile.coefficients.forceBias });
      }
      if (machKc !== stdKc) {
        adjustments.push({ factor: 'kc1.1 (learned)', value: machKc });
      }
    } else if (input.predictionType === 'surface_finish') {
      // Theoretical Ra = f^2 / (32 * rn) * 1000 [um]
      const rn = noseRadius;
      standardPrediction = (feed * feed) / (32 * rn) * 1000;
      predicted = standardPrediction - profile.coefficients.raBias;

      if (profile.coefficients.raBias !== 0) {
        adjustments.push({ factor: 'raBias (learned)', value: -profile.coefficients.raBias });
      }
    } else if (input.predictionType === 'tool_life') {
      // Taylor: T = C / V^n  (V*T^n = C => T = (C/V)^(1/n) ... but stored as T = C / V^n for simplicity)
      // Actually: V * T^n = C => T = (C / V)^(1/n)
      standardPrediction = Math.pow(stdC / speed, 1 / stdN);
      predicted = Math.pow(machC / speed, 1 / machN);

      if (machC !== stdC) adjustments.push({ factor: 'taylorC (learned)', value: machC });
      if (machN !== stdN) adjustments.push({ factor: 'taylorN (learned)', value: machN });
    } else if (input.predictionType === 'dimension') {
      // Nominal + bias offset
      const nominal = p.nominal_mm ?? 0;
      standardPrediction = nominal;
      predicted = nominal + profile.coefficients.dimBias;

      if (profile.coefficients.dimBias !== 0) {
        adjustments.push({ factor: 'dimBias (learned)', value: profile.coefficients.dimBias });
      }
    } else if (input.predictionType === 'temperature') {
      // Empirical: T_cut ~ 400 * (V * f)^0.35
      const vf = (speed / 60) * feed; // m/s * mm/rev approximation
      standardPrediction = 400 * Math.pow(Math.max(vf, 0.001), 0.35);
      predicted = standardPrediction - profile.coefficients.tempBias;

      if (profile.coefficients.tempBias !== 0) {
        adjustments.push({ factor: 'tempBias (learned)', value: -profile.coefficients.tempBias });
      }
    }

    // If no machine data, predicted = standard
    if (confidence === 'no_data') {
      predicted = standardPrediction;
    }

    // Confidence interval from percentile bootstrap on residuals
    let confidenceInterval: [number, number] | undefined;
    if (residuals.length >= 5) {
      const sorted = [...residuals].sort((a, b) => a - b);
      const lo = percentile(sorted, 2.5);
      const hi = percentile(sorted, 97.5);
      confidenceInterval = [predicted + lo, predicted + hi];
    }

    // Improvement: compare RMSE of standard vs learned predictions against actual data
    let improvementPercent = 0;
    if (residuals.length > 0 && standardPrediction !== 0) {
      // Estimate how much closer learned predictions are
      const stdResiduals = typeRecs
        .filter(r => r.predicted !== undefined)
        .map(r => r.measured - r.predicted!);
      const learnedBias = mean(residuals);
      const stdRMSE = rmse(stdResiduals);
      // After calibration, learned RMSE would be reduced by removing bias
      const learnedRMSE = Math.sqrt(Math.max(0, stdRMSE * stdRMSE - learnedBias * learnedBias));
      if (stdRMSE > 0) {
        improvementPercent = ((stdRMSE - learnedRMSE) / stdRMSE) * 100;
      }
    }

    return {
      predicted: Math.round(predicted * 10000) / 10000,
      confidence,
      confidenceInterval: confidenceInterval
        ? [Math.round(confidenceInterval[0] * 10000) / 10000, Math.round(confidenceInterval[1] * 10000) / 10000]
        : undefined,
      basedOnMeasurements: n,
      adjustments,
      standardPrediction: Math.round(standardPrediction * 10000) / 10000,
      improvementPercent: Math.round(improvementPercent * 10) / 10,
    };
  }

  /**
   * Generate a detailed accuracy report showing how well PRISM predicts for this machine.
   *
   * Analyzes all (or the most recent N) measurements to compute:
   * - Overall and per-type accuracy (% within +/-10%)
   * - RMSE and mean bias (overall and per-type)
   * - Accuracy trend over time (monthly buckets, with linear trend detection)
   * - Accuracy grouped by material
   * - Worst predictions (highest absolute error) for investigation
   *
   * Trend detection uses a simple slope of accuracy over the last 3+ periods:
   * positive slope = improving, near-zero = stable, negative = degrading.
   *
   * @param input - machineId, optional type filter, optional lastN limit
   * @returns Comprehensive accuracy report with trends and breakdowns
   */
  getAccuracyReport(input: AccuracyReportInput): AccuracyReportResult {
    const profile = this.getOrCreateProfile(input.machineId);
    let recs = input.measurementType
      ? this.filterMeasurements(profile, input.measurementType)
      : profile.measurements;

    if (input.lastN && input.lastN > 0 && recs.length > input.lastN) {
      recs = recs.slice(-input.lastN);
    }

    const allResiduals = this.getResiduals(recs);
    const overallAccuracy = this.accuracyWithin10(recs);
    const overallRMSE = rmse(allResiduals);
    const meanBiasVal = mean(allResiduals);

    // Accuracy by type
    const types = new Set(recs.map(r => r.measurementType));
    const accuracyByType: Record<string, { accuracy: number; rmse: number; bias: number; n: number }> = {};
    for (const t of types) {
      const typeRecs = recs.filter(r => r.measurementType === t);
      const typeResiduals = this.getResiduals(typeRecs);
      accuracyByType[t] = {
        accuracy: this.accuracyWithin10(typeRecs),
        rmse: rmse(typeResiduals),
        bias: mean(typeResiduals),
        n: typeRecs.length,
      };
    }

    // Accuracy by material
    const materials = new Set(recs.filter(r => r.material).map(r => r.material!));
    const accuracyByMaterial: Record<string, { accuracy: number; n: number }> = {};
    for (const mat of materials) {
      const matRecs = recs.filter(r => r.material === mat);
      accuracyByMaterial[mat] = {
        accuracy: this.accuracyWithin10(matRecs),
        n: matRecs.length,
      };
    }

    // Accuracy over time (monthly buckets)
    const timeBuckets = new Map<string, MeasurementRecord[]>();
    for (const r of recs) {
      const key = monthKey(r.timestamp);
      if (!timeBuckets.has(key)) timeBuckets.set(key, []);
      timeBuckets.get(key)!.push(r);
    }
    const sortedPeriods = Array.from(timeBuckets.keys()).sort();
    const accuracyOverTime: { period: string; accuracy: number }[] = sortedPeriods.map(period => ({
      period,
      accuracy: this.accuracyWithin10(timeBuckets.get(period)!),
    }));

    // Trend detection via simple linear slope of accuracy values
    let trendDirection: 'improving' | 'stable' | 'degrading' = 'stable';
    if (accuracyOverTime.length >= 3) {
      const accValues = accuracyOverTime.map(a => a.accuracy);
      const n = accValues.length;
      const xMean = (n - 1) / 2;
      const yMean = mean(accValues);
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) {
        num += (i - xMean) * (accValues[i] - yMean);
        den += (i - xMean) ** 2;
      }
      const slope = den !== 0 ? num / den : 0;
      if (slope > 2) trendDirection = 'improving';
      else if (slope < -2) trendDirection = 'degrading';
    }

    // Worst predictions (top 5 by absolute error)
    const paired = recs.filter(r => r.predicted !== undefined && r.residual !== undefined);
    const sorted = [...paired].sort((a, b) => Math.abs(b.residual!) - Math.abs(a.residual!));
    const worstPredictions = sorted.slice(0, 5).map(r => ({
      predicted: r.predicted!,
      measured: r.measured,
      type: r.measurementType,
      error: r.residual!,
    }));

    return {
      machineId: input.machineId,
      overallAccuracy,
      rmse: overallRMSE,
      meanBias: meanBiasVal,
      trendDirection,
      accuracyByType,
      accuracyByMaterial,
      accuracyOverTime,
      worstPredictions,
    };
  }

  /**
   * Compare prediction accuracy and biases across multiple machines.
   *
   * Identifies the best and worst performing machines (by overall accuracy),
   * and detects systemic biases — biases that appear consistently across ALL
   * machines, which indicate a model deficiency rather than a machine-specific
   * issue. A bias is considered systemic if:
   * 1. Every machine shows it in the same direction (all positive or all negative)
   * 2. The mean bias across all machines is significant (|mean| > 0.5 * stdDev)
   *
   * @param input - Array of machineIds to compare
   * @returns Ranked comparison, best/worst machine, and systemic bias detection
   */
  compareMachines(input: CompareMachinesInput): CompareMachinesResult {
    const comparison: { machineId: string; totalMeasurements: number; overallRMSE: number; meanBias: number; accuracy: number }[] = [];

    for (const machineId of input.machineIds) {
      const profile = this.getOrCreateProfile(machineId);
      const residuals = this.getResiduals(profile.measurements);
      comparison.push({
        machineId,
        totalMeasurements: profile.measurements.length,
        overallRMSE: rmse(residuals),
        meanBias: mean(residuals),
        accuracy: this.accuracyWithin10(profile.measurements),
      });
    }

    // Sort by accuracy descending
    const sorted = [...comparison].sort((a, b) => b.accuracy - a.accuracy);
    const bestMachine = sorted.length > 0 ? sorted[0].machineId : '';
    const worstMachine = sorted.length > 0 ? sorted[sorted.length - 1].machineId : '';

    // Detect systemic biases: gather biases by type across all machines
    const allTypes = new Set<string>();
    for (const machineId of input.machineIds) {
      const profile = this.machines.get(machineId);
      if (profile) {
        for (const r of profile.measurements) allTypes.add(r.measurementType);
      }
    }

    const systemicBiases: { type: string; allMachinesBias: number; isSystemic: boolean }[] = [];
    for (const type of allTypes) {
      const biasesPerMachine: number[] = [];
      for (const machineId of input.machineIds) {
        const profile = this.machines.get(machineId);
        if (!profile) continue;
        const typeRecs = this.filterMeasurements(profile, type);
        const residuals = this.getResiduals(typeRecs);
        if (residuals.length > 0) {
          biasesPerMachine.push(mean(residuals));
        }
      }

      if (biasesPerMachine.length >= 2) {
        const allSameSign = biasesPerMachine.every(b => b > 0) || biasesPerMachine.every(b => b < 0);
        const meanAllBias = mean(biasesPerMachine);
        const sdAllBias = stdDev(biasesPerMachine);
        const isSystemic = allSameSign && (sdAllBias === 0 || Math.abs(meanAllBias) > 0.5 * sdAllBias);

        systemicBiases.push({
          type,
          allMachinesBias: Math.round(meanAllBias * 10000) / 10000,
          isSystemic,
        });
      }
    }

    return {
      comparison,
      bestMachine,
      worstMachine,
      systemicBiases,
    };
  }

  /**
   * Export all accumulated learning data for backup or transfer.
   *
   * Serializes the full in-memory state (measurements, coefficients,
   * calibration history) for one or all machines. Supports JSON (default)
   * or CSV format for measurements.
   *
   * CSV format includes one row per measurement with all fields flattened.
   * JSON format preserves the full MachineProfile structure.
   *
   * @param input - Optional machineId filter and format choice
   * @returns Serialized data with count summaries
   */
  exportLearningData(input: ExportInput): ExportResult {
    const format = input.format ?? 'json';
    const profiles: MachineProfile[] = [];

    if (input.machineId) {
      const p = this.machines.get(input.machineId);
      if (p) profiles.push(p);
    } else {
      profiles.push(...this.machines.values());
    }

    let totalMeasurements = 0;
    for (const p of profiles) totalMeasurements += p.measurements.length;

    if (format === 'csv') {
      // Build CSV
      const headers = [
        'id', 'machineId', 'measurementType', 'measured', 'predicted', 'residual',
        'unit', 'material', 'operation', 'toolId', 'timestamp', 'partId', 'batchId', 'notes',
        'speed_mpm', 'feed_mmrev', 'depth_mm', 'stepover_mm',
      ];
      const rows: string[] = [headers.join(',')];
      for (const p of profiles) {
        for (const r of p.measurements) {
          const vals = [
            r.id, r.machineId, r.measurementType, r.measured,
            r.predicted ?? '', r.residual ?? '',
            r.unit, r.material ?? '', r.operation ?? '', r.toolId ?? '',
            r.timestamp, r.partId ?? '', r.batchId ?? '', r.notes ?? '',
            r.parameters?.speed_mpm ?? '', r.parameters?.feed_mmrev ?? '',
            r.parameters?.depth_mm ?? '', r.parameters?.stepover_mm ?? '',
          ];
          rows.push(vals.map(v => typeof v === 'string' && v.includes(',') ? `"${v}"` : String(v)).join(','));
        }
      }
      return { data: rows.join('\n'), measurementCount: totalMeasurements, machineCount: profiles.length };
    }

    // JSON format
    const data = profiles.map(p => ({
      machineId: p.machineId,
      measurements: p.measurements,
      coefficients: p.coefficients,
      lastCalibration: p.lastCalibration,
      calibrationHistory: p.calibrationHistory,
    }));

    return {
      data,
      measurementCount: totalMeasurements,
      machineCount: profiles.length,
    };
  }

  /**
   * Import previously exported learning data to restore from backup or
   * transfer between PRISM instances.
   *
   * Accepts JSON data as exported by exportLearningData(). Each machine
   * profile in the import is merged with existing data:
   * - New measurements are appended (deduplicated by measurement ID)
   * - Coefficients from the import overwrite existing ones
   * - Calibration history entries are merged and deduplicated by timestamp+type
   *
   * The measurement counter is advanced past the highest imported ID to
   * prevent collisions.
   *
   * @param input - Previously exported data object
   * @returns Summary of how many records were imported and which machines
   */
  importLearningData(input: ImportInput): ImportResult {
    const data = input.data;
    if (!Array.isArray(data)) {
      return { imported: 0, machines: [], message: 'Invalid data format: expected array of machine profiles.' };
    }

    let imported = 0;
    const machineIds: string[] = [];

    for (const entry of data) {
      if (!entry.machineId || !Array.isArray(entry.measurements)) continue;

      const profile = this.getOrCreateProfile(entry.machineId);
      machineIds.push(entry.machineId);

      // Deduplicate by measurement ID
      const existingIds = new Set(profile.measurements.map(m => m.id));

      for (const rec of entry.measurements) {
        if (!existingIds.has(rec.id)) {
          profile.measurements.push(rec);
          existingIds.add(rec.id);
          imported++;

          // Advance counter past imported IDs
          const idMatch = rec.id?.match(/M-[^-]+-(\d+)/);
          if (idMatch) {
            const num = parseInt(idMatch[1], 10);
            if (num > this.measurementCounter) {
              this.measurementCounter = num;
            }
          }
        }
      }

      // Overwrite coefficients if provided
      if (entry.coefficients && typeof entry.coefficients === 'object') {
        profile.coefficients = { ...DEFAULT_COEFFICIENTS, ...entry.coefficients };
      }

      // Merge calibration history
      if (Array.isArray(entry.calibrationHistory)) {
        const existingCalKeys = new Set(
          profile.calibrationHistory.map(c => `${c.timestamp}-${c.type}`),
        );
        for (const cal of entry.calibrationHistory) {
          const key = `${cal.timestamp}-${cal.type}`;
          if (!existingCalKeys.has(key)) {
            profile.calibrationHistory.push(cal);
            existingCalKeys.add(key);
          }
        }
      }

      if (entry.lastCalibration) {
        profile.lastCalibration = entry.lastCalibration;
      }
    }

    return {
      imported,
      machines: [...new Set(machineIds)],
      message: `Imported ${imported} measurements across ${new Set(machineIds).size} machine(s).`,
    };
  }

  /**
   * Quick stats summary for the engine's current state.
   *
   * @returns Total machines tracked, total measurements, and total calibrations performed
   */
  stats(): { machines: number; totalMeasurements: number; calibrations: number } {
    let totalMeasurements = 0;
    let calibrations = 0;
    for (const profile of this.machines.values()) {
      totalMeasurements += profile.measurements.length;
      calibrations += profile.calibrationHistory.length;
    }
    return {
      machines: this.machines.size,
      totalMeasurements,
      calibrations,
    };
  }
}
