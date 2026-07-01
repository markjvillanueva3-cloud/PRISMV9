// @ts-nocheck
/**
 * PredictionFeedbackOrchestratorEngine
 *
 * Closes the feedback loop by wiring MachineLearningFeedbackEngine,
 * FeedbackPersistenceEngine, and StratifiedCalibrationEngine into a single
 * seamless pipeline.  A measurement enters via submitMeasurement() and flows
 * through anomaly guard → auto-match → record → stratified record →
 * auto-calibrate → persist.  Predictions via getLearnedPrediction() combine
 * baseline physics with hierarchical bias, environmental correction, and
 * tool-wear modelling to produce the best possible estimate.
 *
 * The orchestrator IMPORTS and DELEGATES to the three sub-engines — it never
 * duplicates their internal logic.
 *
 * Sub-engines:
 *   1. MachineLearningFeedbackEngine  — records measurements, computes bias/RMSE
 *   2. FeedbackPersistenceEngine      — disk persistence, anomaly guard, auto-match
 *   3. StratifiedCalibrationEngine    — hierarchical calibration by
 *                                       machine × material × operation × toolFamily × axis
 *
 * @module PredictionFeedbackOrchestratorEngine
 */

import { MachineLearningFeedbackEngine } from "./MachineLearningFeedbackEngine.js";
import { FeedbackPersistenceEngine } from "./FeedbackPersistenceEngine.js";
import { StratifiedCalibrationEngine } from "./StratifiedCalibrationEngine.js";

// ============================================================================
// INTERFACES
// ============================================================================

/** Input for submitMeasurement — one-stop measurement ingestion */
export interface SubmitMeasurementInput {
  machineId: string;
  measurementType: string;
  measured: number;
  unit: string;
  predicted?: number;
  material?: string;
  operation?: string;
  toolFamily?: string;
  axis?: string;
  toolWearState?: number;
  shopTemp_C?: number;
  coolantAge_days?: number;
  partId?: string;
  batchId?: string;
  notes?: string;
  parameters?: {
    speed_mpm?: number;
    feed_mmrev?: number;
    depth_mm?: number;
    noseRadius_mm?: number;
    [key: string]: number | undefined;
  };
}

/** Result of submitMeasurement */
export interface SubmitMeasurementResult {
  accepted: boolean;
  rejectReason?: string;
  residual?: number;
  bias: number;
  rmse: number;
  calibrated: boolean;
  calibrationDetails?: any;
  measurementId: string;
  confidence: string;
  message: string;
}

/** Input for getLearnedPrediction */
export interface GetLearnedPredictionInput {
  machineId: string;
  predictionType: string;
  material?: string;
  operation?: string;
  toolFamily?: string;
  axis?: string;
  parameters: {
    speed_mpm?: number;
    feed_mmrev?: number;
    depth_mm?: number;
    noseRadius_mm?: number;
    [key: string]: number | undefined;
  };
  shopTemp_C?: number;
  toolWearState?: number;
  coolantAge_days?: number;
  machineRuntime_hours?: number;
  workpieceLength_mm?: number;
}

/** Result of getLearnedPrediction */
export interface GetLearnedPredictionResult {
  prediction: number;
  baseline: number;
  learned: number;
  adjustments: { source: string; value: number }[];
  confidence: "high" | "medium" | "low" | "baseline_only";
  confidenceInterval?: [number, number];
  dataSupport: number;
  improvementVsBaseline: number;
}

/** Input for batchImportMeasurements */
export interface BatchImportInput {
  machineId: string;
  measurements: {
    measurementType: string;
    measured: number;
    predicted?: number;
    unit: string;
    material?: string;
    operation?: string;
    toolFamily?: string;
    axis?: string;
    partId?: string;
  }[];
  csvContent?: string;
}

/** Result of batchImportMeasurements */
export interface BatchImportResult {
  total: number;
  accepted: number;
  rejected: number;
  rejectionReasons: { index: number; reason: string }[];
  calibrationTriggered: boolean;
  newBias: Record<string, number>;
}

/** Input for getMachineIntelligence */
export interface MachineIntelligenceInput {
  machineId: string;
}

/** Result of getMachineIntelligence */
export interface MachineIntelligenceResult {
  machineId: string;
  totalMeasurements: number;
  measurementsByType: Record<string, number>;
  biasesByContext: { contextKey: string; level: number; bias: number; n: number }[];
  accuracy: { overall: number; byType: Record<string, number>; byMaterial: Record<string, number> };
  environmentalSensitivity: { thermal: number; coolant: number; warmup: number };
  toolWearModel?: { a: number; b: number; c: number };
  recommendations: string[];
  dataAge_days: number;
}

/** Input for compareAndLearn */
export interface CompareAndLearnInput {
  machineId: string;
  predicted: number;
  measured: number;
  measurementType: string;
  unit: string;
  material?: string;
  operation?: string;
  toolFamily?: string;
  axis?: string;
}

/** Result of compareAndLearn */
export interface CompareAndLearnResult {
  residual: number;
  residualPercent: number;
  previousBias: number;
  newBias: number;
  biasChange: number;
  predictionsImproved: boolean;
  nextPredictionWouldBe: number;
  message: string;
}

/** Input for systemLearningStatus (no params needed) */
export interface SystemLearningStatusInput {}

/** Result of systemLearningStatus */
export interface SystemLearningStatusResult {
  totalMachines: number;
  totalMeasurements: number;
  calibrationsPerformed: number;
  averageAccuracy: number;
  bestMachine: { id: string; accuracy: number };
  worstMachine: { id: string; accuracy: number };
  systemicBiases: { type: string; bias: number; allMachines: boolean }[];
  dataAge: { newest_hours: number; oldest_hours: number };
  recommendations: string[];
}

// ============================================================================
// AUTO-CALIBRATION THRESHOLD CONSTANTS
// ============================================================================

/** Minimum measurements before auto-calibration can trigger */
const AUTO_CAL_MIN_N = 5;

/** Confidence thresholds for data support levels */
const CONFIDENCE_HIGH = 20;
const CONFIDENCE_MEDIUM = 8;
const CONFIDENCE_LOW = 3;

// ============================================================================
// ENGINE
// ============================================================================

/**
 * PredictionFeedbackOrchestratorEngine — the closed-loop orchestrator that
 * chains measurement ingestion, anomaly detection, hierarchical calibration,
 * and learned predictions into a unified pipeline.
 *
 * Construction instantiates the three sub-engines and attempts to restore
 * any persisted learning data from disk.
 */
export class PredictionFeedbackOrchestratorEngine {
  /** MachineLearningFeedbackEngine — records measurements, computes bias/RMSE */
  private mlf: MachineLearningFeedbackEngine;

  /** FeedbackPersistenceEngine — disk I/O, anomaly guard, auto-match predictions */
  private fpe: FeedbackPersistenceEngine;

  /** StratifiedCalibrationEngine — hierarchical calibration contexts */
  private sce: StratifiedCalibrationEngine;

  /** Running count of calibrations performed in this session */
  private calibrationCount = 0;

  /** Timestamp of the most recent measurement (for data-age tracking) */
  private newestTimestamp = 0;

  /** Timestamp of the oldest measurement (for data-age tracking) */
  private oldestTimestamp = Infinity;

  constructor() {
    this.mlf = new MachineLearningFeedbackEngine();
    this.fpe = new FeedbackPersistenceEngine();
    this.sce = new StratifiedCalibrationEngine();

    // Attempt to restore persisted learning data from disk
    try {
      this.fpe.restoreFromFile({ engine: this.mlf });
    } catch {
      // No persisted data — start fresh
    }
  }

  // ==========================================================================
  // 1. submitMeasurement
  // ==========================================================================

  /**
   * One-stop measurement ingestion — user submits a measurement and the ENTIRE
   * pipeline executes:
   *
   *   Step 1: anomalyGuard       → reject outliers before they corrupt data
   *   Step 2: autoMatchPrediction → compute baseline prediction if not supplied
   *   Step 3: recordMeasurement   → store in MLF engine (per-machine history)
   *   Step 4: recordStratified    → store in SCE hierarchy (machine×material×op…)
   *   Step 5: check calibration   → auto-calibrate if |bias| > 2σ/√n AND n ≥ 5
   *   Step 6: persistToFile       → save to disk for restart survival
   *
   * @param input - Measurement data with machine, type, value, and optional context
   * @returns SubmitMeasurementResult with acceptance status, bias, RMSE, calibration info
   */
  submitMeasurement(input: SubmitMeasurementInput): SubmitMeasurementResult {
    const now = Date.now();

    // ── Step 1: Anomaly guard ──────────────────────────────────────────────
    // Build history from MLF for this machine + type
    const history = this._getHistory(input.machineId, input.measurementType);

    const anomalyCheck = this.fpe.anomalyGuard({
      measurement: {
        machineId: input.machineId,
        measurementType: input.measurementType,
        measured: input.measured,
        unit: input.unit,
      },
      history,
      threshold: 3.0,
    });

    if (anomalyCheck.recommendation === "reject") {
      return {
        accepted: false,
        rejectReason: anomalyCheck.reason || "Outlier rejected by anomaly guard",
        bias: 0,
        rmse: 0,
        calibrated: false,
        measurementId: "",
        confidence: "rejected",
        message: `Measurement rejected: ${anomalyCheck.reason}. z-score=${anomalyCheck.zScore}`,
      };
    }

    // ── Step 2: Auto-match prediction if not supplied ──────────────────────
    let predicted = input.predicted;
    let autoMatchModel = "";

    if (predicted === undefined || predicted === null) {
      const match = this.fpe.autoMatchPrediction({
        measurementType: input.measurementType,
        parameters: {
          speed_mpm: input.parameters?.speed_mpm,
          feed_mmrev: input.parameters?.feed_mmrev,
          depth_mm: input.parameters?.depth_mm,
          noseRadius_mm: input.parameters?.noseRadius_mm,
          material: input.material,
        },
        material: input.material,
      });

      if (match.predicted !== null) {
        predicted = match.predicted;
        autoMatchModel = match.model;
      } else {
        // For dimension type, use measured as predicted (zero-bias baseline)
        predicted = input.measured;
        autoMatchModel = "no model available — using measured as baseline";
      }
    }

    // ── Step 3: Record in MachineLearningFeedbackEngine ────────────────────
    const mlfResult = this.mlf.recordMeasurement({
      machineId: input.machineId,
      measurementType: input.measurementType as any,
      measured: input.measured,
      predicted,
      unit: input.unit,
      material: input.material,
      operation: input.operation,
      toolId: input.toolFamily,
      parameters: input.parameters,
      timestamp: now,
      notes: input.notes,
      partId: input.partId,
      batchId: input.batchId,
    });

    // ── Step 4: Record in StratifiedCalibrationEngine ──────────────────────
    const sceResult = this.sce.recordStratified({
      machineId: input.machineId,
      material: input.material,
      operation: input.operation as any,
      toolFamily: input.toolFamily as any,
      axis: input.axis as any,
      measurementType: input.measurementType as any,
      measured: input.measured,
      predicted,
      unit: input.unit,
      toolWearState: input.toolWearState,
      shopTemp_C: input.shopTemp_C,
      coolantAge_days: input.coolantAge_days,
      timestamp: now,
    });

    // Track timestamps for data-age reporting
    if (now > this.newestTimestamp) this.newestTimestamp = now;
    if (now < this.oldestTimestamp) this.oldestTimestamp = now;

    // ── Step 5: Check auto-calibration trigger ─────────────────────────────
    let calibrated = false;
    let calibrationDetails: any = null;

    if (mlfResult.calibrationRecommended && mlfResult.measurementCount >= AUTO_CAL_MIN_N) {
      // Also verify the statistical significance: |bias| > 2σ/√n
      const shouldCalibrate = this._shouldAutoCalibrate(
        input.machineId,
        input.measurementType,
        mlfResult.currentBias,
        mlfResult.measurementCount
      );

      if (shouldCalibrate) {
        const calResult = this.mlf.autoCalibrate({
          machineId: input.machineId,
          measurementType: input.measurementType,
          minSamples: AUTO_CAL_MIN_N,
        });

        // Also calibrate the stratified hierarchy
        const sceCalResult = this.sce.calibrateStratified({
          machineId: input.machineId,
          material: input.material,
          operation: input.operation as any,
          toolFamily: input.toolFamily as any,
          axis: input.axis as any,
          measurementType: input.measurementType as any,
          minSamples: AUTO_CAL_MIN_N,
        });

        calibrated = calResult.calibrated || sceCalResult.totalCalibrated > 0;
        calibrationDetails = {
          mlf: calResult,
          stratified: sceCalResult,
        };
        this.calibrationCount++;
      }
    }

    // ── Step 6: Persist to disk ────────────────────────────────────────────
    try {
      this.fpe.persistToFile({ engine: this.mlf });
    } catch {
      // Non-fatal — data is still in memory
    }

    // ── Build result ───────────────────────────────────────────────────────
    const residual = input.measured - predicted;
    const confidence = this._confidenceFromCount(mlfResult.measurementCount);

    return {
      accepted: true,
      residual,
      bias: mlfResult.currentBias,
      rmse: mlfResult.currentRMSE,
      calibrated,
      calibrationDetails,
      measurementId: mlfResult.id,
      confidence,
      message: this._buildSubmitMessage(
        input, residual, mlfResult, calibrated, autoMatchModel, anomalyCheck
      ),
    };
  }

  // ==========================================================================
  // 2. getLearnedPrediction
  // ==========================================================================

  /**
   * Make a prediction using ALL learned data — the ultimate predictor that
   * combines baseline physics with every calibration source PRISM has:
   *
   *   Step 1: autoMatchPrediction     → baseline physics prediction
   *   Step 2: getStratifiedBias       → hierarchical bias with Bayesian fallback
   *   Step 3: environmentalAdjust     → thermal + coolant + warmup corrections
   *   Step 4: toolWearBiasModel       → wear-state dependent bias (if data exists)
   *   Step 5: Combine additively:     finalPrediction = baseline + stratifiedBias
   *                                                   + thermalCorrection + wearBias
   *   Step 6: Confidence interval     → from historical residual distribution
   *
   * @param input - Machine, prediction type, cutting parameters, and environmental context
   * @returns GetLearnedPredictionResult with prediction, adjustments breakdown, confidence
   */
  getLearnedPrediction(input: GetLearnedPredictionInput): GetLearnedPredictionResult {
    const adjustments: { source: string; value: number }[] = [];

    // ── Step 1: Baseline physics prediction ────────────────────────────────
    const autoMatch = this.fpe.autoMatchPrediction({
      measurementType: input.predictionType,
      parameters: {
        speed_mpm: input.parameters.speed_mpm,
        feed_mmrev: input.parameters.feed_mmrev,
        depth_mm: input.parameters.depth_mm,
        noseRadius_mm: input.parameters.noseRadius_mm,
        material: input.material,
      },
      material: input.material,
    });

    const baseline = autoMatch.predicted ?? 0;
    adjustments.push({ source: `baseline (${autoMatch.model})`, value: baseline });

    // ── Step 2: Stratified hierarchical bias ───────────────────────────────
    let stratifiedBias = 0;
    let dataSupport = 0;
    let sceConfidence: string = "baseline_only";

    try {
      const biasResult = this.sce.getStratifiedBias({
        machineId: input.machineId,
        material: input.material,
        operation: input.operation as any,
        toolFamily: input.toolFamily as any,
        axis: input.axis as any,
        measurementType: input.predictionType as any,
      });

      stratifiedBias = biasResult.bias;
      dataSupport = biasResult.nMeasurements;
      sceConfidence = biasResult.confidence;

      if (Math.abs(stratifiedBias) > 1e-8) {
        adjustments.push({
          source: `stratified bias (L${biasResult.level}: ${biasResult.levelName})`,
          value: stratifiedBias,
        });
      }
    } catch {
      // No stratified data — baseline only
    }

    // ── Step 3: Environmental adjustments ──────────────────────────────────
    let thermalCorrection = 0;

    if (
      input.shopTemp_C !== undefined ||
      input.coolantAge_days !== undefined ||
      input.machineRuntime_hours !== undefined
    ) {
      try {
        const envResult = this.sce.environmentalAdjust({
          shopTemp_C: input.shopTemp_C,
          coolantAge_days: input.coolantAge_days,
          machineRuntime_hours: input.machineRuntime_hours,
          workpieceLength_mm: input.workpieceLength_mm,
          measurementType: input.predictionType as any,
        });

        thermalCorrection = envResult.totalAdjustment;

        if (Math.abs(thermalCorrection) > 1e-8) {
          for (const adj of envResult.adjustmentBreakdown) {
            adjustments.push({ source: adj.source, value: adj.value });
          }
        }
      } catch {
        // Environmental model unavailable
      }
    }

    // ── Step 4: Tool wear bias model ───────────────────────────────────────
    let wearBias = 0;

    if (input.toolWearState !== undefined) {
      try {
        const wearHistory = this._getWearHistory(input.machineId, input.predictionType);

        if (wearHistory.length >= 3) {
          const wearResult = this.sce.toolWearBiasModel({ measurements: wearHistory });

          if (wearResult.rSquared > 0.3) {
            wearBias = wearResult.predictBias(input.toolWearState);
            adjustments.push({
              source: `tool wear model (state=${input.toolWearState}, R²=${wearResult.rSquared.toFixed(2)})`,
              value: wearBias,
            });
          }
        }
      } catch {
        // Wear model not available
      }
    }

    // ── Step 5: Combine additively ─────────────────────────────────────────
    const learned = stratifiedBias + thermalCorrection + wearBias;
    const prediction = baseline + learned;

    // ── Step 6: Confidence interval ────────────────────────────────────────
    const confidence = this._mapConfidence(sceConfidence, dataSupport);
    let confidenceInterval: [number, number] | undefined;

    if (dataSupport >= CONFIDENCE_LOW) {
      const residualStd = this._getResidualStdDev(input.machineId, input.predictionType);
      const zMultiplier = confidence === "high" ? 1.96 : confidence === "medium" ? 2.0 : 2.5;
      const halfWidth = residualStd * zMultiplier;
      confidenceInterval = [
        Math.round((prediction - halfWidth) * 10000) / 10000,
        Math.round((prediction + halfWidth) * 10000) / 10000,
      ];
    }

    // Improvement vs baseline: how much closer to actual (by RMSE) learned is
    const improvementVsBaseline =
      baseline !== 0 && Math.abs(learned) > 1e-8
        ? Math.round((Math.abs(learned) / Math.abs(baseline)) * 10000) / 100
        : 0;

    return {
      prediction: Math.round(prediction * 10000) / 10000,
      baseline: Math.round(baseline * 10000) / 10000,
      learned: Math.round(learned * 10000) / 10000,
      adjustments,
      confidence,
      confidenceInterval,
      dataSupport,
      improvementVsBaseline,
    };
  }

  // ==========================================================================
  // 3. batchImportMeasurements
  // ==========================================================================

  /**
   * Import multiple measurements at once — from CMM export, spreadsheet, or
   * programmatic batch.  Each measurement passes through anomalyGuard before
   * being recorded.  Calibration runs ONCE at the end (not per-measurement)
   * to avoid redundant computation.
   *
   * If csvContent is provided, it is parsed via FeedbackPersistenceEngine's
   * parseCMMExport and converted to measurement records.
   *
   * @param input - Machine ID, measurement array (or CSV), optional parameters
   * @returns BatchImportResult with accept/reject counts, calibration status, new biases
   */
  batchImportMeasurements(input: BatchImportInput): BatchImportResult {
    let measurements = input.measurements || [];

    // ── Parse CSV if provided ──────────────────────────────────────────────
    if (input.csvContent) {
      const parsed = this.fpe.parseCMMExport({
        csvContent: input.csvContent,
        machineId: input.machineId,
      });

      const csvMeasurements = parsed.measurements.map((f) => ({
        measurementType: "dimension" as string,
        measured: f.actual,
        predicted: f.nominal,
        unit: "mm",
        material: undefined,
        operation: undefined,
        toolFamily: undefined,
        axis: undefined,
        partId: undefined,
      }));

      measurements = [...measurements, ...csvMeasurements];
    }

    const total = measurements.length;
    let accepted = 0;
    let rejected = 0;
    const rejectionReasons: { index: number; reason: string }[] = [];

    // ── Process each measurement sequentially ──────────────────────────────
    for (let i = 0; i < measurements.length; i++) {
      const m = measurements[i];

      // Anomaly guard
      const history = this._getHistory(input.machineId, m.measurementType);
      const anomaly = this.fpe.anomalyGuard({
        measurement: {
          machineId: input.machineId,
          measurementType: m.measurementType,
          measured: m.measured,
          unit: m.unit,
        },
        history,
        threshold: 3.0,
      });

      if (anomaly.recommendation === "reject") {
        rejected++;
        rejectionReasons.push({
          index: i,
          reason: anomaly.reason || "Outlier detected",
        });
        continue;
      }

      // Determine predicted value
      let predicted = m.predicted;
      if (predicted === undefined || predicted === null) {
        const match = this.fpe.autoMatchPrediction({
          measurementType: m.measurementType,
          parameters: { material: m.material },
          material: m.material,
        });
        predicted = match.predicted ?? m.measured;
      }

      // Record in MLF
      this.mlf.recordMeasurement({
        machineId: input.machineId,
        measurementType: m.measurementType as any,
        measured: m.measured,
        predicted,
        unit: m.unit,
        material: m.material,
        operation: m.operation,
        toolId: m.toolFamily,
        partId: m.partId,
      });

      // Record in SCE
      this.sce.recordStratified({
        machineId: input.machineId,
        material: m.material,
        operation: m.operation as any,
        toolFamily: m.toolFamily as any,
        axis: m.axis as any,
        measurementType: m.measurementType as any,
        measured: m.measured,
        predicted,
        unit: m.unit,
      });

      accepted++;
    }

    // ── Calibrate once at the end ──────────────────────────────────────────
    let calibrationTriggered = false;
    const newBias: Record<string, number> = {};

    if (accepted >= AUTO_CAL_MIN_N) {
      try {
        const calResult = this.mlf.autoCalibrate({
          machineId: input.machineId,
          minSamples: AUTO_CAL_MIN_N,
        });

        calibrationTriggered = calResult.calibrated;
        if (calResult.calibrated) {
          this.calibrationCount++;
          for (const c of calResult.calibrations) {
            newBias[c.type] = c.afterBias;
          }
        }
      } catch {
        // Calibration failed — non-fatal
      }
    }

    // Persist accumulated data
    try {
      this.fpe.persistToFile({ engine: this.mlf });
    } catch {
      // Non-fatal
    }

    return {
      total,
      accepted,
      rejected,
      rejectionReasons,
      calibrationTriggered,
      newBias,
    };
  }

  // ==========================================================================
  // 4. getMachineIntelligence
  // ==========================================================================

  /**
   * Complete intelligence report for a machine — everything PRISM has learned
   * from accumulated measurements, calibrations, and environmental observations.
   *
   * Combines data from:
   *   - MachineLearningFeedbackEngine.getMachineProfile()
   *   - MachineLearningFeedbackEngine.getAccuracyReport()
   *   - StratifiedCalibrationEngine.getContextTree()
   *   - StratifiedCalibrationEngine.toolWearBiasModel() (if wear data exists)
   *   - StratifiedCalibrationEngine.environmentalAdjust() (sensitivity probing)
   *
   * @param input - Machine ID
   * @returns MachineIntelligenceResult with full learning profile and recommendations
   */
  getMachineIntelligence(input: MachineIntelligenceInput): MachineIntelligenceResult {
    const { machineId } = input;

    // ── MLF profile ────────────────────────────────────────────────────────
    let totalMeasurements = 0;
    let measurementsByType: Record<string, number> = {};
    let recommendations: string[] = [];
    let accuracyOverall = 0;
    let accuracyByType: Record<string, number> = {};
    let accuracyByMaterial: Record<string, number> = {};

    try {
      const profile = this.mlf.getMachineProfile({ machineId });
      totalMeasurements = profile.totalMeasurements;
      measurementsByType = profile.measurementsByType;
      recommendations = [...profile.recommendations];
    } catch {
      // Machine not found in MLF
    }

    // ── Accuracy report ────────────────────────────────────────────────────
    try {
      const accuracy = this.mlf.getAccuracyReport({ machineId });
      accuracyOverall = accuracy.overallAccuracy;
      for (const [type, data] of Object.entries(accuracy.accuracyByType)) {
        accuracyByType[type] = data.accuracy;
      }
      for (const [mat, data] of Object.entries(accuracy.accuracyByMaterial)) {
        accuracyByMaterial[mat] = data.accuracy;
      }
    } catch {
      // No accuracy data yet
    }

    // ── Stratified context tree ────────────────────────────────────────────
    const biasesByContext: { contextKey: string; level: number; bias: number; n: number }[] = [];

    try {
      const tree = this.sce.getContextTree({ machineId });
      this._flattenTree(tree.tree, biasesByContext);
    } catch {
      // No stratified data
    }

    // ── Environmental sensitivity probing ──────────────────────────────────
    let thermalSensitivity = 0;
    let coolantSensitivity = 0;
    let warmupSensitivity = 0;

    try {
      // Probe thermal: compare 20°C vs 25°C
      const env20 = this.sce.environmentalAdjust({ shopTemp_C: 20, workpieceLength_mm: 200 });
      const env25 = this.sce.environmentalAdjust({ shopTemp_C: 25, workpieceLength_mm: 200 });
      thermalSensitivity = Math.abs(env25.thermalCorrection_mm - env20.thermalCorrection_mm);

      // Probe coolant: fresh vs 30-day-old
      const envFresh = this.sce.environmentalAdjust({ coolantAge_days: 0 });
      const envOld = this.sce.environmentalAdjust({ coolantAge_days: 30 });
      coolantSensitivity = Math.abs(envOld.coolantFactor - envFresh.coolantFactor);

      // Probe warmup: cold vs 2-hour runtime
      const envCold = this.sce.environmentalAdjust({ machineRuntime_hours: 0 });
      const envWarm = this.sce.environmentalAdjust({ machineRuntime_hours: 2 });
      warmupSensitivity = Math.abs(envWarm.warmupFactor - envCold.warmupFactor);
    } catch {
      // Environmental models not available for this context
    }

    // ── Tool wear model ────────────────────────────────────────────────────
    let toolWearModel: { a: number; b: number; c: number } | undefined;

    try {
      // Attempt to build a wear model from all measurement types
      for (const type of Object.keys(measurementsByType)) {
        const wearHistory = this._getWearHistory(machineId, type);
        if (wearHistory.length >= 3) {
          const wearResult = this.sce.toolWearBiasModel({ measurements: wearHistory });
          if (wearResult.rSquared > 0.3) {
            toolWearModel = wearResult.model;
            break;
          }
        }
      }
    } catch {
      // No wear model available
    }

    // ── Data age ───────────────────────────────────────────────────────────
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    const dataAge_days =
      this.newestTimestamp > 0
        ? Math.round(((now - this.newestTimestamp) / msPerDay) * 100) / 100
        : -1;

    // ── Additional recommendations ─────────────────────────────────────────
    if (totalMeasurements < AUTO_CAL_MIN_N) {
      recommendations.push(
        `Need at least ${AUTO_CAL_MIN_N} measurements for auto-calibration — currently have ${totalMeasurements}`
      );
    }
    if (thermalSensitivity > 0.005) {
      recommendations.push(
        "Machine shows thermal sensitivity — include shopTemp_C in measurements for better predictions"
      );
    }
    if (Object.keys(measurementsByType).length < 2) {
      recommendations.push(
        "Submit diverse measurement types (dimension, force, surface_finish) for comprehensive learning"
      );
    }
    if (biasesByContext.length === 0 && totalMeasurements > 0) {
      recommendations.push(
        "Include material and operation context in measurements for stratified calibration"
      );
    }

    return {
      machineId,
      totalMeasurements,
      measurementsByType,
      biasesByContext,
      accuracy: {
        overall: accuracyOverall,
        byType: accuracyByType,
        byMaterial: accuracyByMaterial,
      },
      environmentalSensitivity: {
        thermal: Math.round(thermalSensitivity * 100000) / 100000,
        coolant: Math.round(coolantSensitivity * 10000) / 10000,
        warmup: Math.round(warmupSensitivity * 10000) / 10000,
      },
      toolWearModel,
      recommendations,
      dataAge_days,
    };
  }

  // ==========================================================================
  // 5. compareAndLearn
  // ==========================================================================

  /**
   * Compare PRISM's prediction to an actual measurement and learn from the
   * difference.  The user says: "I predicted X, I measured Y" — the system
   * records the pair, updates bias, and reports how future predictions improve.
   *
   * Flow:
   *   1. Get current bias for this machine + type (before recording)
   *   2. Record the measurement pair via the full pipeline
   *   3. Get updated bias (after recording)
   *   4. Compute what the next prediction would be with the new calibration
   *
   * @param input - Predicted vs measured pair with context
   * @returns CompareAndLearnResult with residual, bias change, and next prediction
   */
  compareAndLearn(input: CompareAndLearnInput): CompareAndLearnResult {
    const { machineId, predicted, measured, measurementType, unit } = input;

    // ── Step 1: Get previous bias ──────────────────────────────────────────
    let previousBias = 0;
    try {
      const biasResult = this.sce.getStratifiedBias({
        machineId,
        material: input.material,
        operation: input.operation as any,
        toolFamily: input.toolFamily as any,
        axis: input.axis as any,
        measurementType: measurementType as any,
      });
      previousBias = biasResult.bias;
    } catch {
      // No prior data
    }

    // ── Step 2: Record via full pipeline ───────────────────────────────────
    const submitResult = this.submitMeasurement({
      machineId,
      measurementType,
      measured,
      predicted,
      unit,
      material: input.material,
      operation: input.operation,
      toolFamily: input.toolFamily,
      axis: input.axis,
    });

    // ── Step 3: Get updated bias ───────────────────────────────────────────
    let newBias = submitResult.bias;
    try {
      const biasResult = this.sce.getStratifiedBias({
        machineId,
        material: input.material,
        operation: input.operation as any,
        toolFamily: input.toolFamily as any,
        axis: input.axis as any,
        measurementType: measurementType as any,
      });
      newBias = biasResult.bias;
    } catch {
      // Use MLF bias from submit result
    }

    // ── Step 4: Compute next prediction ────────────────────────────────────
    const residual = measured - predicted;
    const residualPercent =
      predicted !== 0 ? Math.round((residual / Math.abs(predicted)) * 10000) / 100 : 0;

    const biasChange = newBias - previousBias;
    const nextPredictionWouldBe = predicted + newBias;
    const predictionsImproved = Math.abs(newBias) < Math.abs(previousBias) || submitResult.calibrated;

    // ── Build human-readable message ───────────────────────────────────────
    const direction = residual > 0 ? "over" : "under";
    const absResidual = Math.abs(residual);

    let message =
      `Recorded: predicted=${predicted}, measured=${measured}, ` +
      `residual=${residual > 0 ? "+" : ""}${residual.toFixed(4)} ${unit} ` +
      `(${direction} by ${absResidual.toFixed(4)}). `;

    if (submitResult.calibrated) {
      message += `Auto-calibration triggered. `;
    }

    message +=
      `Bias shifted from ${previousBias.toFixed(4)} to ${newBias.toFixed(4)}. ` +
      `Next prediction for identical conditions would be ${nextPredictionWouldBe.toFixed(4)} ${unit}.`;

    return {
      residual: Math.round(residual * 10000) / 10000,
      residualPercent,
      previousBias: Math.round(previousBias * 10000) / 10000,
      newBias: Math.round(newBias * 10000) / 10000,
      biasChange: Math.round(biasChange * 10000) / 10000,
      predictionsImproved,
      nextPredictionWouldBe: Math.round(nextPredictionWouldBe * 10000) / 10000,
      message,
    };
  }

  // ==========================================================================
  // 6. systemLearningStatus
  // ==========================================================================

  /**
   * Overview of the entire learning system across ALL machines — total
   * measurements, calibrations, accuracy rankings, systemic biases, data
   * freshness, and actionable recommendations.
   *
   * Iterates over all known machines in the MLF engine via exportLearningData,
   * aggregates accuracy reports, and identifies systemic (cross-machine) biases
   * via compareMachines.
   *
   * @param _input - No parameters needed
   * @returns SystemLearningStatusResult with system-wide learning metrics
   */
  systemLearningStatus(_input: SystemLearningStatusInput): SystemLearningStatusResult {
    // ── Export all data to discover machines ────────────────────────────────
    let machineIds: string[] = [];
    let totalMeasurements = 0;

    try {
      const exported = this.mlf.exportLearningData({});
      totalMeasurements = exported.measurementCount;

      // Extract machine IDs from export data
      if (exported.data && typeof exported.data === "object") {
        if (Array.isArray(exported.data)) {
          machineIds = exported.data.map((d: any) => d.machineId).filter(Boolean);
        } else if (exported.data.machines) {
          machineIds = Object.keys(exported.data.machines);
        }
      }
    } catch {
      // No data exported
    }

    const totalMachines = machineIds.length;

    // ── Gather per-machine accuracy ────────────────────────────────────────
    let bestMachine = { id: "none", accuracy: 0 };
    let worstMachine = { id: "none", accuracy: 100 };
    let totalAccuracy = 0;
    let accuracyCount = 0;

    for (const mid of machineIds) {
      try {
        const report = this.mlf.getAccuracyReport({ machineId: mid });
        const acc = report.overallAccuracy;
        totalAccuracy += acc;
        accuracyCount++;

        if (acc > bestMachine.accuracy) {
          bestMachine = { id: mid, accuracy: acc };
        }
        if (acc < worstMachine.accuracy) {
          worstMachine = { id: mid, accuracy: acc };
        }
      } catch {
        // Skip machines without enough data for accuracy reports
      }
    }

    const averageAccuracy = accuracyCount > 0 ? Math.round((totalAccuracy / accuracyCount) * 100) / 100 : 0;

    // ── Systemic biases (appear on ALL machines) ───────────────────────────
    const systemicBiases: { type: string; bias: number; allMachines: boolean }[] = [];

    if (machineIds.length >= 2) {
      try {
        const comparison = this.mlf.compareMachines({ machineIds });
        for (const sb of comparison.systemicBiases) {
          systemicBiases.push({
            type: sb.type,
            bias: sb.allMachinesBias,
            allMachines: sb.isSystemic,
          });
        }
      } catch {
        // Comparison not possible
      }
    }

    // ── Data age ───────────────────────────────────────────────────────────
    const now = Date.now();
    const msPerHour = 60 * 60 * 1000;
    const newest_hours =
      this.newestTimestamp > 0
        ? Math.round(((now - this.newestTimestamp) / msPerHour) * 100) / 100
        : -1;
    const oldest_hours =
      this.oldestTimestamp < Infinity
        ? Math.round(((now - this.oldestTimestamp) / msPerHour) * 100) / 100
        : -1;

    // ── Recommendations ────────────────────────────────────────────────────
    const recommendations: string[] = [];

    if (totalMachines === 0) {
      recommendations.push("No machines have learning data yet — submit measurements via submitMeasurement()");
    } else if (totalMachines === 1) {
      recommendations.push("Only 1 machine tracked — add more machines for fleet learning and systemic bias detection");
    }

    if (totalMeasurements < 20) {
      recommendations.push(
        `System has only ${totalMeasurements} measurements — need 20+ for reliable calibration`
      );
    }

    if (systemicBiases.some((sb) => sb.allMachines && Math.abs(sb.bias) > 0.01)) {
      recommendations.push(
        "Systemic bias detected across all machines — check physics model constants (kc1.1, Taylor C/n)"
      );
    }

    if (newest_hours > 168) {
      recommendations.push(
        "Newest measurement is over 7 days old — submit fresh data to maintain calibration currency"
      );
    }

    if (this.calibrationCount === 0 && totalMeasurements > AUTO_CAL_MIN_N) {
      recommendations.push(
        "No calibrations triggered yet — biases may not be significant enough, or check auto-cal threshold"
      );
    }

    return {
      totalMachines,
      totalMeasurements,
      calibrationsPerformed: this.calibrationCount,
      averageAccuracy,
      bestMachine,
      worstMachine,
      systemicBiases,
      dataAge: { newest_hours, oldest_hours },
      recommendations,
    };
  }

  // ==========================================================================
  // stats
  // ==========================================================================

  /**
   * Engine metadata for introspection and dispatcher wiring.
   *
   * @returns Method list, description, and sub-engine references
   */
  stats(): {
    methods: string[];
    description: string;
    subEngines: string[];
    calibrationCount: number;
  } {
    return {
      methods: [
        "submitMeasurement",
        "getLearnedPrediction",
        "batchImportMeasurements",
        "getMachineIntelligence",
        "compareAndLearn",
        "systemLearningStatus",
      ],
      description:
        "PredictionFeedbackOrchestratorEngine: Closed-loop orchestrator wiring " +
        "MachineLearningFeedbackEngine + FeedbackPersistenceEngine + StratifiedCalibrationEngine " +
        "into a seamless measurement → anomaly guard → record → calibrate → predict pipeline",
      subEngines: [
        "MachineLearningFeedbackEngine",
        "FeedbackPersistenceEngine",
        "StratifiedCalibrationEngine",
      ],
      calibrationCount: this.calibrationCount,
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Get measurement history for a specific machine and type from the MLF engine.
   * Returns array of { measured } entries suitable for anomalyGuard input.
   */
  private _getHistory(machineId: string, measurementType: string): { measured: number }[] {
    try {
      const profile = this.mlf.getMachineProfile({ machineId, measurementType });
      // Profile doesn't directly expose raw measurements, so we reconstruct
      // from the export data
      const exported = this.mlf.exportLearningData({ machineId });
      const data = exported.data;

      if (Array.isArray(data)) {
        return data
          .filter((d: any) => d.machineId === machineId && d.measurementType === measurementType)
          .map((d: any) => ({ measured: d.measured }));
      }

      if (data && data.machines && data.machines[machineId]) {
        const machine = data.machines[machineId];
        const measurements = machine.measurements || machine.history || [];
        return measurements
          .filter((m: any) => !measurementType || m.measurementType === measurementType || m.type === measurementType)
          .map((m: any) => ({ measured: m.measured }));
      }

      return [];
    } catch {
      return [];
    }
  }

  /**
   * Get measurements that have tool wear state data, suitable for building a
   * wear bias model.  Returns array of { measured, predicted, toolWearState }.
   */
  private _getWearHistory(
    machineId: string,
    measurementType: string
  ): { measured: number; predicted: number; toolWearState: number }[] {
    try {
      const exported = this.mlf.exportLearningData({ machineId });
      const data = exported.data;

      let measurements: any[] = [];

      if (Array.isArray(data)) {
        measurements = data.filter(
          (d: any) => d.machineId === machineId && d.measurementType === measurementType
        );
      } else if (data && data.machines && data.machines[machineId]) {
        const machine = data.machines[machineId];
        measurements = (machine.measurements || machine.history || []).filter(
          (m: any) =>
            !measurementType ||
            m.measurementType === measurementType ||
            m.type === measurementType
        );
      }

      return measurements
        .filter((m: any) => m.toolWearState !== undefined && m.predicted !== undefined)
        .map((m: any) => ({
          measured: m.measured,
          predicted: m.predicted,
          toolWearState: m.toolWearState,
        }));
    } catch {
      return [];
    }
  }

  /**
   * Check if auto-calibration should trigger based on statistical significance.
   * Trigger when: n >= MIN_N AND |bias| > 2σ/√n (bias is statistically significant).
   */
  private _shouldAutoCalibrate(
    machineId: string,
    measurementType: string,
    currentBias: number,
    n: number
  ): boolean {
    if (n < AUTO_CAL_MIN_N) return false;

    try {
      const stdDev = this._getResidualStdDev(machineId, measurementType);
      if (stdDev < 1e-10) return Math.abs(currentBias) > 1e-8;

      // Threshold: 2σ/√n — the bias must be larger than this for significance
      const threshold = (2 * stdDev) / Math.sqrt(n);
      return Math.abs(currentBias) > threshold;
    } catch {
      // If we can't compute stdDev, use a simple fallback
      return Math.abs(currentBias) > 0.001;
    }
  }

  /**
   * Compute the standard deviation of residuals for a machine + type
   * from the stratified or MLF data.
   */
  private _getResidualStdDev(machineId: string, measurementType: string): number {
    try {
      const biasResult = this.sce.getStratifiedBias({
        machineId,
        measurementType: measurementType as any,
      });
      return biasResult.stdDev || 0;
    } catch {
      // Fallback: compute from MLF accuracy report
      try {
        const report = this.mlf.getAccuracyReport({ machineId, measurementType });
        return report.rmse || 0;
      } catch {
        return 0;
      }
    }
  }

  /**
   * Map SCE confidence strings + data support count to our 4-level confidence.
   */
  private _mapConfidence(
    sceConfidence: string,
    dataSupport: number
  ): "high" | "medium" | "low" | "baseline_only" {
    if (dataSupport >= CONFIDENCE_HIGH) return "high";
    if (dataSupport >= CONFIDENCE_MEDIUM) return "medium";
    if (dataSupport >= CONFIDENCE_LOW) return "low";
    return "baseline_only";
  }

  /**
   * Convert a measurement count to a confidence label string.
   */
  private _confidenceFromCount(n: number): string {
    if (n >= CONFIDENCE_HIGH) return "high";
    if (n >= CONFIDENCE_MEDIUM) return "medium";
    if (n >= CONFIDENCE_LOW) return "low";
    return "baseline_only";
  }

  /**
   * Flatten a context tree into an array of bias entries for reporting.
   */
  private _flattenTree(
    nodes: any[],
    result: { contextKey: string; level: number; bias: number; n: number }[]
  ): void {
    if (!nodes) return;
    for (const node of nodes) {
      result.push({
        contextKey: node.key,
        level: node.level,
        bias: node.bias,
        n: node.nMeasurements,
      });
      if (node.children && node.children.length > 0) {
        this._flattenTree(node.children, result);
      }
    }
  }

  /**
   * Build a human-readable message for submitMeasurement result.
   */
  private _buildSubmitMessage(
    input: SubmitMeasurementInput,
    residual: number,
    mlfResult: any,
    calibrated: boolean,
    autoMatchModel: string,
    anomalyCheck: any
  ): string {
    const parts: string[] = [];

    parts.push(
      `Recorded ${input.measurementType} measurement for ${input.machineId}: ` +
      `measured=${input.measured}, residual=${residual > 0 ? "+" : ""}${residual.toFixed(4)} ${input.unit}`
    );

    if (autoMatchModel) {
      parts.push(`Baseline: ${autoMatchModel}`);
    }

    parts.push(
      `Bias=${mlfResult.currentBias.toFixed(4)}, RMSE=${mlfResult.currentRMSE.toFixed(4)}, ` +
      `n=${mlfResult.measurementCount}`
    );

    if (anomalyCheck.recommendation === "review") {
      parts.push(`WARNING: measurement flagged for review (z=${anomalyCheck.zScore.toFixed(2)})`);
    }

    if (calibrated) {
      parts.push("Auto-calibration triggered — coefficients updated");
    }

    return parts.join(". ") + ".";
  }
}
