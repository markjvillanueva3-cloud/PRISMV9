// @ts-nocheck
/**
 * PRISM MCP Server — Stratified Calibration Engine
 *
 * The ultimate calibration engine: stratifies learning across ALL variability
 * dimensions and uses hierarchical Bayesian fallback when data is sparse.
 *
 * Maintains a 6-level hierarchy of calibration contexts:
 *   Level 0: Global (all machines, all materials) — weakest prior
 *   Level 1: Machine — per-machine bias
 *   Level 2: Machine × Material
 *   Level 3: Machine × Material × Operation
 *   Level 4: Machine × Material × Operation × ToolFamily
 *   Level 5: Machine × Material × Operation × ToolFamily × Axis
 *
 * When data exists at the deepest level, use it.  When sparse, fall back
 * through the hierarchy with Bayesian shrinkage toward the parent estimate.
 *
 * References:
 *   - Gelman et al. (2013) — Bayesian Data Analysis, hierarchical models
 *   - Efron & Morris (1975) — Stein's paradox / shrinkage estimators
 *   - Box (1954) — ANOVA decomposition of variance
 *   - Fisher (1925) — F-distribution for interaction analysis
 *   - Rosenthal (1946) — Thermal growth model for machine tools
 *   - Merchant (1945) — Cutting force / deflection models
 *   - Park & Miller (1988) — Minimal standard PRNG (MINSTD)
 *
 * @module StratifiedCalibrationEngine
 */

// ============================================================================
// INTERFACES
// ============================================================================

/** Measurement types supported by the stratified calibration system */
export type MeasurementType = "dimension" | "surface_finish" | "force" | "tool_life" | "temperature";

/** Operation types for Level 3 stratification */
export type OperationType = "milling" | "turning" | "drilling" | "grinding" | "boring";

/** Tool family types for Level 4 stratification */
export type ToolFamilyType = "endmill" | "insert" | "drill" | "reamer" | "tap";

/** Axis types for Level 5 stratification */
export type AxisType = "X" | "Y" | "Z" | "diameter" | "length";

/** Confidence level for bias estimates */
export type ConfidenceLevel = "high" | "medium" | "low" | "prior_only" | "baseline_only";

/** Level names in the hierarchy */
export const LEVEL_NAMES: Record<number, string> = {
  0: "Global",
  1: "Machine",
  2: "Machine×Material",
  3: "Machine×Material×Operation",
  4: "Machine×Material×Operation×ToolFamily",
  5: "Machine×Material×Operation×ToolFamily×Axis",
};

/** A single stored measurement record */
export interface StoredMeasurement {
  measured: number;
  predicted: number;
  residual: number;
  timestamp: number;
  toolWearState?: number;
  shopTemp_C?: number;
  coolantAge_days?: number;
}

/** A context node in the stratified store */
export interface ContextEntry {
  measurements: StoredMeasurement[];
  bias: number;
  rmse: number;
  lastCalibrated: number | null;
}

/** Internal stratified store */
export interface StratifiedStore {
  contexts: Map<string, ContextEntry>;
}

/** Input for recordStratified */
export interface RecordStratifiedInput {
  machineId: string;
  material?: string;
  operation?: OperationType;
  toolFamily?: ToolFamilyType;
  axis?: AxisType;
  measurementType: MeasurementType;
  measured: number;
  predicted?: number;
  unit: string;
  toolWearState?: number;
  shopTemp_C?: number;
  coolantAge_days?: number;
  timestamp?: number;
}

/** Output of recordStratified */
export interface RecordStratifiedResult {
  id: string;
  residual: number;
  contextKey: string;
  level: number;
  measurementsAtThisLevel: number;
  bias: number;
  rmse: number;
}

/** Input for getStratifiedBias */
export interface GetStratifiedBiasInput {
  machineId: string;
  material?: string;
  operation?: OperationType;
  toolFamily?: ToolFamilyType;
  axis?: AxisType;
  measurementType: MeasurementType;
}

/** A single entry in the fallback chain */
export interface FallbackEntry {
  level: number;
  n: number;
  bias: number;
}

/** Output of getStratifiedBias */
export interface GetStratifiedBiasResult {
  bias: number;
  stdDev: number;
  confidence: ConfidenceLevel;
  level: number;
  levelName: string;
  nMeasurements: number;
  fallbackChain: FallbackEntry[];
  shrinkageApplied: boolean;
}

/** Input for calibrateStratified */
export interface CalibrateStratifiedInput {
  machineId: string;
  material?: string;
  operation?: OperationType;
  toolFamily?: ToolFamilyType;
  axis?: AxisType;
  measurementType?: MeasurementType;
  minSamples?: number;
}

/** A single calibration entry */
export interface CalibrationEntry {
  contextKey: string;
  level: number;
  type: string;
  beforeBias: number;
  afterBias: number;
  nSamples: number;
  shrinkage: number;
}

/** Output of calibrateStratified */
export interface CalibrateStratifiedResult {
  calibrations: CalibrationEntry[];
  totalCalibrated: number;
  message: string;
}

/** Input for getContextTree */
export interface GetContextTreeInput {
  machineId: string;
}

/** A node in the context tree */
export interface ContextNode {
  key: string;
  level: number;
  children: ContextNode[];
  nMeasurements: number;
  bias: number;
  types: string[];
}

/** Output of getContextTree */
export interface GetContextTreeResult {
  tree: ContextNode[];
  totalContexts: number;
  deepestLevel: number;
  totalMeasurements: number;
}

/** Input for environmentalAdjust */
export interface EnvironmentalAdjustInput {
  shopTemp_C?: number;
  referenceTemp_C?: number;
  coolantAge_days?: number;
  machineRuntime_hours?: number;
  workpieceLength_mm?: number;
  thermalExpCoeff?: number;
  measurementType?: MeasurementType;
}

/** A single adjustment breakdown entry */
export interface AdjustmentBreakdown {
  source: string;
  value: number;
}

/** Output of environmentalAdjust */
export interface EnvironmentalAdjustResult {
  thermalCorrection_mm: number;
  coolantFactor: number;
  warmupFactor: number;
  totalAdjustment: number;
  adjustmentBreakdown: AdjustmentBreakdown[];
}

/** Input for toolWearBiasModel */
export interface ToolWearBiasModelInput {
  measurements: { measured: number; predicted: number; toolWearState: number }[];
}

/** Output of toolWearBiasModel */
export interface ToolWearBiasModelResult {
  model: { a: number; b: number; c: number };
  biasAtFresh: number;
  biasAtMidLife: number;
  biasAtEndOfLife: number;
  rSquared: number;
  predictBias: (wearState: number) => number;
  optimalChangePoint: number;
}

/** Input for interactionAnalysis */
export interface InteractionAnalysisInput {
  measurements: { machineId: string; material: string; operation: string; residual: number }[];
}

/** A significant interaction */
export interface SignificantInteraction {
  factors: string[];
  fStatistic: number;
  pValue: number;
  effectSize: number;
  interpretation: string;
}

/** A main effect entry */
export interface MainEffect {
  factor: string;
  levels: string[];
  fStatistic: number;
  pValue: number;
}

/** Output of interactionAnalysis */
export interface InteractionAnalysisResult {
  significantInteractions: SignificantInteraction[];
  mainEffects: MainEffect[];
  recommendations: string[];
}

/** Input for predictionWithFullContext */
export interface PredictionWithFullContextInput {
  machineId: string;
  material?: string;
  operation?: OperationType;
  toolFamily?: ToolFamilyType;
  axis?: AxisType;
  predictionType: string;
  baselinePrediction: number;
  shopTemp_C?: number;
  coolantAge_days?: number;
  machineRuntime_hours?: number;
  toolWearState?: number;
  workpieceLength_mm?: number;
}

/** Output of predictionWithFullContext */
export interface PredictionWithFullContextResult {
  finalPrediction: number;
  baselinePrediction: number;
  totalAdjustment: number;
  adjustmentBreakdown: AdjustmentBreakdown[];
  confidence: ConfidenceLevel;
  confidenceInterval?: [number, number];
  dataSupport: { level: number; nMeasurements: number };
  improvementVsBaseline: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Seeded PRNG — Park-Miller MINSTD for reproducible random numbers.
 * x_{n+1} = (a * x_n) mod m, a = 16807, m = 2^31 - 1
 */
class SeededRNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }
  /** Returns a number in (0, 1) */
  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return this.state / 2147483647;
  }
}

/** Standard normal CDF via Abramowitz & Stegun rational approximation (7.1.26) */
function normalCDF(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return 0.5 * (1 + sign * y);
}

/**
 * Approximate p-value from F-statistic using the Wilson-Hilferty normal
 * approximation to the chi-squared distribution.
 * P(F > f | df1, df2) ≈ 1 - Φ(z) where z transforms via chi-squared approx.
 */
function fTestPValue(fStat: number, df1: number, df2: number): number {
  if (df1 <= 0 || df2 <= 0 || fStat <= 0) return 1;
  // Use the Paulson approximation: transform F to approx normal
  const x = fStat;
  const a = df1;
  const b = df2;
  // Wilson-Hilferty: chi2/df ≈ (1 - 2/(9*df) + z*sqrt(2/(9*df)))^3
  // For F = (chi2_1/df1) / (chi2_2/df2), use log-normal approximation
  const logF = Math.log(x);
  const mu = (1 / (b - 2)) > 0 ? Math.log(b / (b - 2)) : 0;
  const v1 = 2 / (a - 2) > 0 ? 2 * (a + b - 2) / (a * (b - 2) * (b - 2) * (b - 4)) : 1;
  const sigma = Math.sqrt(Math.max(v1, 0.001));
  if (b <= 4) {
    // Fallback for small df2: use crude Beta incomplete approximation
    const z = (Math.pow(fStat * df1 / df2, 1 / 3) - (1 - 2 / (9 * df2))) /
              Math.sqrt(2 / (9 * df2) + 2 / (9 * df1) * Math.pow(fStat * df1 / df2, 2 / 3));
    return 1 - normalCDF(z);
  }
  const z = (logF - mu) / sigma;
  return 1 - normalCDF(z);
}

/**
 * Build the context key at a given level.
 * Level 0: "＊/＊/＊/＊/＊"
 * Level 5: "machineId/material/operation/toolFamily/axis"
 */
function buildContextKey(
  level: number,
  machineId?: string,
  material?: string,
  operation?: string,
  toolFamily?: string,
  axis?: string
): string {
  const parts = [
    level >= 1 && machineId ? machineId : "*",
    level >= 2 && material ? material : "*",
    level >= 3 && operation ? operation : "*",
    level >= 4 && toolFamily ? toolFamily : "*",
    level >= 5 && axis ? axis : "*",
  ];
  return parts.join("/");
}

/**
 * Determine the deepest level with data from the provided context fields.
 * E.g. if machineId + material + operation are provided → max possible level = 3
 */
function maxPossibleLevel(
  machineId?: string,
  material?: string,
  operation?: string,
  toolFamily?: string,
  axis?: string
): number {
  if (axis && toolFamily && operation && material && machineId) return 5;
  if (toolFamily && operation && material && machineId) return 4;
  if (operation && material && machineId) return 3;
  if (material && machineId) return 2;
  if (machineId) return 1;
  return 0;
}

/**
 * Compute the running mean and variance of an array (Welford's online algorithm).
 */
function meanAndStd(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 };
  let m = 0, s = 0;
  for (let i = 0; i < values.length; i++) {
    const delta = values[i] - m;
    m += delta / (i + 1);
    s += delta * (values[i] - m);
  }
  const variance = values.length > 1 ? s / (values.length - 1) : 0;
  return { mean: m, std: Math.sqrt(variance) };
}

/**
 * Compute RMSE from an array of residuals.
 */
function computeRMSE(residuals: number[]): number {
  if (residuals.length === 0) return 0;
  const ss = residuals.reduce((acc, r) => acc + r * r, 0);
  return Math.sqrt(ss / residuals.length);
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Stratified Calibration Engine — hierarchical multi-level calibration
 * with Bayesian shrinkage fallback for sparse data conditions.
 *
 * Maintains a tree of calibration contexts from global (Level 0) down to
 * per-axis (Level 5), applying shrinkage estimators when local data is
 * insufficient to form a reliable bias estimate.
 */
export class StratifiedCalibrationEngine {
  /** Internal measurement store keyed by context path */
  private store: StratifiedStore = { contexts: new Map() };

  /** Default shrinkage factor — controls pull toward parent level (0 = no shrinkage, 1 = full parent) */
  private readonly shrinkageFactor = 0.3;

  /** Default minimum samples before trusting a level without shrinkage */
  private readonly defaultMinSamples = 5;

  /** Monotonic counter for measurement IDs */
  private idCounter = 0;

  // --------------------------------------------------------------------------
  // 1. recordStratified
  // --------------------------------------------------------------------------

  /**
   * Record a measurement with full context for stratified learning.
   *
   * Stores the measurement at ALL applicable hierarchy levels (0 through the
   * deepest level the input specifies), so that parent levels accumulate data
   * from children and can serve as priors when children are sparse.
   *
   * @param input — Full measurement context including machine, material, operation, tool, axis
   * @returns Summary of recorded measurement including residual, context key, and current bias/RMSE
   */
  recordStratified(input: RecordStratifiedInput): RecordStratifiedResult {
    const ts = input.timestamp ?? Date.now();
    const predicted = input.predicted ?? 0;
    const residual = input.measured - predicted;
    const deepest = maxPossibleLevel(
      input.machineId, input.material, input.operation, input.toolFamily, input.axis
    );

    // Store at every level from 0 to deepest
    for (let lv = 0; lv <= deepest; lv++) {
      const key = buildContextKey(lv, input.machineId, input.material, input.operation, input.toolFamily, input.axis)
        + "/" + input.measurementType;
      this.ensureContext(key);
      const ctx = this.store.contexts.get(key)!;
      ctx.measurements.push({
        measured: input.measured,
        predicted,
        residual,
        timestamp: ts,
        toolWearState: input.toolWearState,
        shopTemp_C: input.shopTemp_C,
        coolantAge_days: input.coolantAge_days,
      });
      // Update running bias and RMSE
      const residuals = ctx.measurements.map(m => m.residual);
      ctx.bias = meanAndStd(residuals).mean;
      ctx.rmse = computeRMSE(residuals);
    }

    // Return info at the deepest level
    const deepKey = buildContextKey(deepest, input.machineId, input.material, input.operation, input.toolFamily, input.axis)
      + "/" + input.measurementType;
    const deepCtx = this.store.contexts.get(deepKey)!;
    this.idCounter++;

    return {
      id: `SC-${this.idCounter.toString().padStart(6, "0")}`,
      residual,
      contextKey: buildContextKey(deepest, input.machineId, input.material, input.operation, input.toolFamily, input.axis),
      level: deepest,
      measurementsAtThisLevel: deepCtx.measurements.length,
      bias: deepCtx.bias,
      rmse: deepCtx.rmse,
    };
  }

  // --------------------------------------------------------------------------
  // 2. getStratifiedBias
  // --------------------------------------------------------------------------

  /**
   * Get the best available bias estimate using hierarchical Bayesian fallback.
   *
   * Starting from the deepest specified level, checks if enough measurements
   * exist.  If not, falls back to the parent level, applying Bayesian shrinkage:
   *
   *   bias_effective = (n_local × bias_local + n_parent × k × bias_parent) / (n_local + n_parent × k)
   *
   * where k is the shrinkage factor (default 0.3).  This pulls sparse estimates
   * toward the more stable parent estimate, following Efron-Morris (1975) shrinkage
   * principles applied hierarchically.
   *
   * @param input — Context specifying the desired bias resolution
   * @returns Bias estimate with confidence, fallback chain, and shrinkage indicator
   */
  getStratifiedBias(input: GetStratifiedBiasInput): GetStratifiedBiasResult {
    const deepest = maxPossibleLevel(
      input.machineId, input.material, input.operation, input.toolFamily, input.axis
    );

    const fallbackChain: FallbackEntry[] = [];
    let bestLevel = -1;
    let bestBias = 0;
    let bestStd = 0;
    let bestN = 0;
    let shrinkageApplied = false;

    // Collect data at all levels
    for (let lv = deepest; lv >= 0; lv--) {
      const key = buildContextKey(lv, input.machineId, input.material, input.operation, input.toolFamily, input.axis)
        + "/" + input.measurementType;
      const ctx = this.store.contexts.get(key);
      const n = ctx ? ctx.measurements.length : 0;
      const bias = ctx ? ctx.bias : 0;
      fallbackChain.push({ level: lv, n, bias });

      if (bestLevel < 0 && n >= this.defaultMinSamples) {
        bestLevel = lv;
        bestBias = bias;
        bestN = n;
        const residuals = ctx!.measurements.map(m => m.residual);
        bestStd = meanAndStd(residuals).std;
      }
    }

    // If no level has enough data, use whatever is available at the highest level with any data
    if (bestLevel < 0) {
      for (let lv = deepest; lv >= 0; lv--) {
        const key = buildContextKey(lv, input.machineId, input.material, input.operation, input.toolFamily, input.axis)
          + "/" + input.measurementType;
        const ctx = this.store.contexts.get(key);
        if (ctx && ctx.measurements.length > 0) {
          bestLevel = lv;
          bestBias = ctx.bias;
          bestN = ctx.measurements.length;
          bestStd = meanAndStd(ctx.measurements.map(m => m.residual)).std;
          break;
        }
      }
    }

    // If absolutely no data anywhere
    if (bestLevel < 0) {
      return {
        bias: 0,
        stdDev: 0,
        confidence: "prior_only",
        level: 0,
        levelName: LEVEL_NAMES[0],
        nMeasurements: 0,
        fallbackChain: fallbackChain.reverse(),
        shrinkageApplied: false,
      };
    }

    // Apply Bayesian shrinkage if the best level has fewer than minSamples
    // or if the best level is not the deepest (we fell back)
    if (bestLevel < deepest) {
      // Check if there's any data at a deeper level to blend with parent
      for (let lv = deepest; lv > bestLevel; lv--) {
        const key = buildContextKey(lv, input.machineId, input.material, input.operation, input.toolFamily, input.axis)
          + "/" + input.measurementType;
        const ctx = this.store.contexts.get(key);
        if (ctx && ctx.measurements.length > 0) {
          const nLocal = ctx.measurements.length;
          const biasLocal = ctx.bias;
          const nParent = bestN;
          const biasParent = bestBias;
          const k = this.shrinkageFactor;
          // Bayesian shrinkage: weighted combination
          bestBias = (nLocal * biasLocal + nParent * k * biasParent) / (nLocal + nParent * k);
          bestN = nLocal;
          bestLevel = lv;
          shrinkageApplied = true;
          // Shrunk std: approximate as weighted combination
          const stdLocal = meanAndStd(ctx.measurements.map(m => m.residual)).std;
          bestStd = Math.sqrt(
            (nLocal * stdLocal * stdLocal + nParent * k * bestStd * bestStd) /
            (nLocal + nParent * k)
          );
          break;
        }
      }
    }

    // Determine confidence
    let confidence: ConfidenceLevel;
    if (bestN >= 20 && bestLevel === deepest) {
      confidence = "high";
    } else if (bestN >= this.defaultMinSamples) {
      confidence = "medium";
    } else if (bestN > 0) {
      confidence = "low";
    } else {
      confidence = "prior_only";
    }

    return {
      bias: bestBias,
      stdDev: bestStd,
      confidence,
      level: bestLevel,
      levelName: LEVEL_NAMES[bestLevel] ?? `Level ${bestLevel}`,
      nMeasurements: bestN,
      fallbackChain: fallbackChain.reverse(),
      shrinkageApplied,
    };
  }

  // --------------------------------------------------------------------------
  // 3. calibrateStratified
  // --------------------------------------------------------------------------

  /**
   * Run calibration at the most specific level with enough data.
   *
   * For each measurement type found at the deepest level with sufficient
   * samples, computes the Bayesian posterior using a normal-normal conjugate
   * update and applies hierarchical shrinkage toward the parent level.
   *
   * Conjugate update (normal-normal):
   *   τ_prior = 1/σ²_prior,  τ_data = n/σ²_data
   *   μ_posterior = (τ_prior × μ_prior + τ_data × x̄) / (τ_prior + τ_data)
   *   σ²_posterior = 1 / (τ_prior + τ_data)
   *
   * @param input — Context and optional minSamples threshold
   * @returns Array of calibration results with before/after bias and shrinkage info
   */
  calibrateStratified(input: CalibrateStratifiedInput): CalibrateStratifiedResult {
    const minSamples = input.minSamples ?? this.defaultMinSamples;
    const deepest = maxPossibleLevel(
      input.machineId, input.material, input.operation, input.toolFamily, input.axis
    );

    const measurementTypes: MeasurementType[] = input.measurementType
      ? [input.measurementType]
      : ["dimension", "surface_finish", "force", "tool_life", "temperature"];

    const calibrations: CalibrationEntry[] = [];

    for (const mt of measurementTypes) {
      // Find deepest level with enough data
      let calLevel = -1;
      let calKey = "";
      let calCtx: ContextEntry | undefined;

      for (let lv = deepest; lv >= 0; lv--) {
        const key = buildContextKey(lv, input.machineId, input.material, input.operation, input.toolFamily, input.axis)
          + "/" + mt;
        const ctx = this.store.contexts.get(key);
        if (ctx && ctx.measurements.length >= minSamples) {
          calLevel = lv;
          calKey = key;
          calCtx = ctx;
          break;
        }
      }

      if (calLevel < 0 || !calCtx) continue;

      const beforeBias = calCtx.bias;
      const residuals = calCtx.measurements.map(m => m.residual);
      const { mean: datasMean, std: dataStd } = meanAndStd(residuals);
      const n = residuals.length;

      // Get parent bias for shrinkage
      let parentBias = 0;
      let parentN = 0;
      let shrinkage = 0;
      if (calLevel > 0) {
        const parentKey = buildContextKey(calLevel - 1, input.machineId, input.material, input.operation, input.toolFamily, input.axis)
          + "/" + mt;
        const parentCtx = this.store.contexts.get(parentKey);
        if (parentCtx && parentCtx.measurements.length > 0) {
          parentBias = parentCtx.bias;
          parentN = parentCtx.measurements.length;
        }
      }

      // Bayesian conjugate normal-normal update
      // Prior: parent bias with large variance (weak prior)
      const priorMean = parentBias;
      const priorVariance = parentN > 0
        ? Math.max(meanAndStd(this.store.contexts.get(
            buildContextKey(calLevel - 1, input.machineId, input.material, input.operation, input.toolFamily, input.axis) + "/" + mt
          )!.measurements.map(m => m.residual)).std ** 2, 0.01)
        : 100; // Very weak prior if no parent data
      const dataVariance = Math.max(dataStd * dataStd, 0.0001);

      const tauPrior = 1 / priorVariance;
      const tauData = n / dataVariance;
      const posteriorMean = (tauPrior * priorMean + tauData * datasMean) / (tauPrior + tauData);

      // Shrinkage amount: how far posterior moved from data toward prior
      shrinkage = Math.abs(datasMean) > 1e-12
        ? Math.abs(posteriorMean - datasMean) / Math.abs(datasMean)
        : 0;

      // Update the context with calibrated bias
      calCtx.bias = posteriorMean;
      calCtx.lastCalibrated = Date.now();

      calibrations.push({
        contextKey: calKey.replace("/" + mt, ""),
        level: calLevel,
        type: mt,
        beforeBias,
        afterBias: posteriorMean,
        nSamples: n,
        shrinkage: Math.round(shrinkage * 1000) / 1000,
      });
    }

    return {
      calibrations,
      totalCalibrated: calibrations.length,
      message: calibrations.length > 0
        ? `Calibrated ${calibrations.length} context(s) with Bayesian conjugate update + hierarchical shrinkage`
        : "No contexts with sufficient data found for calibration",
    };
  }

  // --------------------------------------------------------------------------
  // 4. getContextTree
  // --------------------------------------------------------------------------

  /**
   * Visualize the full hierarchy of learned contexts for a machine.
   *
   * Builds a tree structure from Level 1 (machine) downward, showing
   * all stored contexts, their measurement counts, current bias, and
   * which measurement types have data.
   *
   * @param input — Machine ID to inspect
   * @returns Tree of context nodes with summary statistics
   */
  getContextTree(input: GetContextTreeInput): GetContextTreeResult {
    const machineId = input.machineId;
    const relevantKeys: string[] = [];

    // Collect all keys relevant to this machine
    for (const key of this.store.contexts.keys()) {
      if (key.startsWith(machineId + "/") || key.startsWith("*/")) {
        relevantKeys.push(key);
      }
    }

    // Build tree from keys
    const nodeMap = new Map<string, ContextNode>();
    let totalContexts = 0;
    let deepestLevel = 0;
    let totalMeasurements = 0;

    for (const fullKey of relevantKeys) {
      const ctx = this.store.contexts.get(fullKey)!;
      if (ctx.measurements.length === 0) continue;

      // Split key into path + measurementType
      const lastSlash = fullKey.lastIndexOf("/");
      const pathPart = fullKey.substring(0, lastSlash);
      const typePart = fullKey.substring(lastSlash + 1);
      const parts = pathPart.split("/");
      const level = parts.filter(p => p !== "*").length;

      if (!nodeMap.has(pathPart)) {
        nodeMap.set(pathPart, {
          key: pathPart,
          level,
          children: [],
          nMeasurements: 0,
          bias: 0,
          types: [],
        });
        totalContexts++;
        if (level > deepestLevel) deepestLevel = level;
      }

      const node = nodeMap.get(pathPart)!;
      node.nMeasurements += ctx.measurements.length;
      node.bias = ctx.bias;
      if (!node.types.includes(typePart)) node.types.push(typePart);
      totalMeasurements += ctx.measurements.length;
    }

    // Wire parent-child relationships
    const nodes = Array.from(nodeMap.values());
    for (const node of nodes) {
      // Find parent: same path with last non-* segment replaced by *
      const parts = node.key.split("/");
      for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i] !== "*") {
          const parentParts = [...parts];
          parentParts[i] = "*";
          const parentKey = parentParts.join("/");
          const parent = nodeMap.get(parentKey);
          if (parent && parent !== node) {
            parent.children.push(node);
          }
          break;
        }
      }
    }

    // Root nodes are those at level 1 (machine level) or level 0
    const tree = nodes.filter(n => n.level <= 1);

    return {
      tree,
      totalContexts,
      deepestLevel,
      totalMeasurements,
    };
  }

  // --------------------------------------------------------------------------
  // 5. environmentalAdjust
  // --------------------------------------------------------------------------

  /**
   * Adjust predictions based on environmental factors.
   *
   * Three correction models:
   *   1. Thermal growth: δ_thermal = α × ΔT × L (Rosenthal 1946)
   *      where α = coefficient of thermal expansion, ΔT = shop temp - reference,
   *      L = workpiece length.  Steel α ≈ 12×10⁻⁶ /°C.
   *
   *   2. Coolant degradation: factor = 1 + 0.02 × (age_days / 30)
   *      Fresh coolant provides better lubrication → better surface finish.
   *      Empirical: ~2% Ra increase per month of coolant age.
   *
   *   3. Warm-up correction: factor = 1 - 0.15 × exp(-runtime / 0.5)
   *      Machine spindle/axes reach thermal equilibrium after ~1-2 hours.
   *      Cold start: ~15% worse positional accuracy.
   *
   * @param input — Environmental conditions
   * @returns Corrections with breakdown by source
   */
  environmentalAdjust(input: EnvironmentalAdjustInput): EnvironmentalAdjustResult {
    const refTemp = input.referenceTemp_C ?? 20;
    const alpha = input.thermalExpCoeff ?? 12e-6; // steel default
    const breakdown: AdjustmentBreakdown[] = [];

    // 1. Thermal correction (mm)
    let thermalCorrection_mm = 0;
    if (input.shopTemp_C != null && input.workpieceLength_mm != null) {
      const deltaT = input.shopTemp_C - refTemp;
      thermalCorrection_mm = alpha * deltaT * input.workpieceLength_mm;
      breakdown.push({ source: "thermal_growth", value: thermalCorrection_mm });
    }

    // 2. Coolant degradation factor (multiplicative on surface finish)
    let coolantFactor = 1.0;
    if (input.coolantAge_days != null) {
      coolantFactor = 1 + 0.02 * (input.coolantAge_days / 30);
      breakdown.push({ source: "coolant_degradation", value: coolantFactor - 1 });
    }

    // 3. Warm-up correction factor
    let warmupFactor = 1.0;
    if (input.machineRuntime_hours != null) {
      // Exponential warm-up curve: worst at cold start, reaching 1.0 after ~2 hours
      warmupFactor = 1 - 0.15 * Math.exp(-input.machineRuntime_hours / 0.5);
      breakdown.push({ source: "warmup_curve", value: warmupFactor - 1 });
    }

    // Total adjustment depends on measurement type
    let totalAdjustment = thermalCorrection_mm;
    if (input.measurementType === "surface_finish") {
      // For surface finish: multiplicative factors dominate
      totalAdjustment = (coolantFactor * warmupFactor - 1); // fractional change
      breakdown.push({ source: "total_multiplicative", value: totalAdjustment });
    } else if (input.measurementType === "dimension") {
      // For dimensions: thermal is additive, warmup affects positioning
      const warmupPositionError = warmupFactor < 1 ? (1 - warmupFactor) * (input.workpieceLength_mm ?? 100) * 0.001 : 0;
      totalAdjustment = thermalCorrection_mm + warmupPositionError;
    } else {
      // General: sum all effects (thermal as dominant)
      totalAdjustment = thermalCorrection_mm;
    }

    return {
      thermalCorrection_mm,
      coolantFactor,
      warmupFactor,
      totalAdjustment,
      adjustmentBreakdown: breakdown,
    };
  }

  // --------------------------------------------------------------------------
  // 6. toolWearBiasModel
  // --------------------------------------------------------------------------

  /**
   * Model how bias changes as tool wears using a quadratic regression.
   *
   * Fresh tools tend to cut slightly undersize (sharp edge = less deflection,
   * less BUE).  Mid-life tools are near nominal.  End-of-life tools cut
   * oversize (increased deflection from worn flank, built-up edge, runout).
   *
   * Model: bias(w) = a + b×w + c×w²
   * Fitted by ordinary least-squares via the normal equations:
   *   (X^T X) β = X^T y,  where X = [1, w, w²] Vandermonde matrix
   *
   * Optimal change point: the wear state at which predicted |bias| first
   * exceeds a tolerance threshold (estimated as 2× the nominal mid-life bias).
   *
   * @param input — Array of measurements with tool wear state (0-1)
   * @returns Quadratic model coefficients, predictions at key wear states, R², change point
   */
  toolWearBiasModel(input: ToolWearBiasModelInput): ToolWearBiasModelResult {
    const data = input.measurements;
    if (data.length < 3) {
      throw new Error("At least 3 measurements required for quadratic tool wear bias model");
    }

    // Compute residuals (bias = measured - predicted)
    const n = data.length;
    const w: number[] = data.map(d => d.toolWearState);
    const y: number[] = data.map(d => d.measured - d.predicted);

    // Build Vandermonde matrix X = [1, w, w²]
    // Normal equations: (X^T X) β = X^T y
    // 3x3 system
    let s0 = n, s1 = 0, s2 = 0, s3 = 0, s4 = 0;
    let r0 = 0, r1 = 0, r2 = 0;
    for (let i = 0; i < n; i++) {
      const wi = w[i];
      const wi2 = wi * wi;
      s1 += wi;
      s2 += wi2;
      s3 += wi2 * wi;
      s4 += wi2 * wi2;
      r0 += y[i];
      r1 += wi * y[i];
      r2 += wi2 * y[i];
    }

    // Solve 3x3 via Cramer's rule
    // | s0 s1 s2 | |a|   |r0|
    // | s1 s2 s3 | |b| = |r1|
    // | s2 s3 s4 | |c|   |r2|
    const det = s0 * (s2 * s4 - s3 * s3) - s1 * (s1 * s4 - s3 * s2) + s2 * (s1 * s3 - s2 * s2);
    if (Math.abs(det) < 1e-20) {
      throw new Error("Singular matrix in quadratic fit — wear states may be degenerate");
    }

    const a = (r0 * (s2 * s4 - s3 * s3) - s1 * (r1 * s4 - s3 * r2) + s2 * (r1 * s3 - s2 * r2)) / det;
    const b = (s0 * (r1 * s4 - s3 * r2) - r0 * (s1 * s4 - s3 * s2) + s2 * (s1 * r2 - r1 * s2)) / det;
    const c = (s0 * (s2 * r2 - r1 * s3) - s1 * (s1 * r2 - r1 * s2) + r0 * (s1 * s3 - s2 * s2)) / det;

    // Predictions and R²
    const yMean = r0 / n;
    let ssTot = 0, ssRes = 0;
    for (let i = 0; i < n; i++) {
      const pred = a + b * w[i] + c * w[i] * w[i];
      ssRes += (y[i] - pred) * (y[i] - pred);
      ssTot += (y[i] - yMean) * (y[i] - yMean);
    }
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    const predictBias = (ws: number): number => a + b * ws + c * ws * ws;

    const biasAtFresh = predictBias(0);
    const biasAtMidLife = predictBias(0.5);
    const biasAtEndOfLife = predictBias(1.0);

    // Optimal change point: where |bias| exceeds tolerance
    // Tolerance heuristic: 2× the absolute bias at mid-life (or min 0.01)
    const tolerance = Math.max(Math.abs(biasAtMidLife) * 2, 0.01);
    let optimalChangePoint = 1.0;
    // Scan from mid-life outward
    for (let ws = 0.5; ws <= 1.0; ws += 0.01) {
      if (Math.abs(predictBias(ws)) > tolerance) {
        optimalChangePoint = Math.round(ws * 100) / 100;
        break;
      }
    }

    return {
      model: { a, b, c },
      biasAtFresh,
      biasAtMidLife,
      biasAtEndOfLife,
      rSquared,
      predictBias,
      optimalChangePoint,
    };
  }

  // --------------------------------------------------------------------------
  // 7. interactionAnalysis
  // --------------------------------------------------------------------------

  /**
   * Detect significant machine × material × operation interactions.
   *
   * Uses one-way and two-way ANOVA-style F-tests on residuals to identify
   * which factor combinations produce unique biases not explained by
   * individual factors alone.
   *
   * F = (SS_between / df_between) / (SS_within / df_within)
   *
   * For interactions, SS_interaction = SS_model_with_interaction - SS_main_effects.
   * Approximate p-values via normal approximation to the F distribution.
   *
   * @param input — Array of residual measurements tagged with machineId, material, operation
   * @returns Significant interactions, main effects, and actionable recommendations
   */
  interactionAnalysis(input: InteractionAnalysisInput): InteractionAnalysisResult {
    const data = input.measurements;
    if (data.length < 6) {
      throw new Error("At least 6 measurements required for interaction analysis");
    }

    const grandMean = data.reduce((s, d) => s + d.residual, 0) / data.length;
    const ssTotalVal = data.reduce((s, d) => s + (d.residual - grandMean) ** 2, 0);

    // Group by each factor
    const factors = ["machineId", "material", "operation"] as const;
    const mainEffects: MainEffect[] = [];

    /**
     * One-way ANOVA for a single factor.
     */
    const oneWayAnova = (factor: typeof factors[number]): MainEffect => {
      const groups = new Map<string, number[]>();
      for (const d of data) {
        const level = d[factor];
        if (!groups.has(level)) groups.set(level, []);
        groups.get(level)!.push(d.residual);
      }

      const levels = Array.from(groups.keys());
      const k = levels.length;
      if (k < 2) return { factor, levels, fStatistic: 0, pValue: 1 };

      let ssBetween = 0;
      let ssWithin = 0;
      for (const [, vals] of groups) {
        const gMean = vals.reduce((a, v) => a + v, 0) / vals.length;
        ssBetween += vals.length * (gMean - grandMean) ** 2;
        for (const v of vals) ssWithin += (v - gMean) ** 2;
      }

      const dfBetween = k - 1;
      const dfWithin = data.length - k;
      if (dfWithin <= 0) return { factor, levels, fStatistic: 0, pValue: 1 };

      const f = (ssBetween / dfBetween) / (ssWithin / dfWithin);
      const p = fTestPValue(f, dfBetween, dfWithin);

      return { factor, levels, fStatistic: Math.round(f * 1000) / 1000, pValue: Math.round(p * 10000) / 10000 };
    };

    for (const factor of factors) {
      mainEffects.push(oneWayAnova(factor));
    }

    // Two-way and three-way interactions
    const significantInteractions: SignificantInteraction[] = [];

    /**
     * Two-way interaction analysis.
     * Groups by combined key, compares interaction SS to main effects SS.
     */
    const twoWayInteraction = (f1: typeof factors[number], f2: typeof factors[number]): void => {
      const groups = new Map<string, number[]>();
      for (const d of data) {
        const key = `${d[f1]}|${d[f2]}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(d.residual);
      }

      // Need at least 2 cells with data and some within-cell replication
      const cells = Array.from(groups.entries()).filter(([, v]) => v.length > 0);
      if (cells.length < 4) return;

      // Compute cell means
      let ssCells = 0;
      let ssWithin = 0;
      for (const [, vals] of cells) {
        const cellMean = vals.reduce((a, v) => a + v, 0) / vals.length;
        ssCells += vals.length * (cellMean - grandMean) ** 2;
        for (const v of vals) ssWithin += (v - cellMean) ** 2;
      }

      // Main effects SS
      const ssMain1 = mainEffects.find(e => e.factor === f1)
        ? (() => {
            const g = new Map<string, number[]>();
            for (const d of data) {
              if (!g.has(d[f1])) g.set(d[f1], []);
              g.get(d[f1])!.push(d.residual);
            }
            let ss = 0;
            for (const [, vals] of g) {
              const m = vals.reduce((a, v) => a + v, 0) / vals.length;
              ss += vals.length * (m - grandMean) ** 2;
            }
            return ss;
          })()
        : 0;

      const ssMain2 = (() => {
        const g = new Map<string, number[]>();
        for (const d of data) {
          if (!g.has(d[f2])) g.set(d[f2], []);
          g.get(d[f2])!.push(d.residual);
        }
        let ss = 0;
        for (const [, vals] of g) {
          const m = vals.reduce((a, v) => a + v, 0) / vals.length;
          ss += vals.length * (m - grandMean) ** 2;
        }
        return ss;
      })();

      const ssInteraction = Math.max(ssCells - ssMain1 - ssMain2, 0);
      const nLevels1 = new Set(data.map(d => d[f1])).size;
      const nLevels2 = new Set(data.map(d => d[f2])).size;
      const dfInteraction = Math.max((nLevels1 - 1) * (nLevels2 - 1), 1);
      const dfWithin = Math.max(data.length - cells.length, 1);

      if (ssWithin <= 0) return;

      const f = (ssInteraction / dfInteraction) / (ssWithin / dfWithin);
      const p = fTestPValue(f, dfInteraction, dfWithin);
      const effectSize = ssTotalVal > 0 ? ssInteraction / ssTotalVal : 0;

      if (p < 0.1) { // Report marginal and significant interactions
        significantInteractions.push({
          factors: [f1, f2],
          fStatistic: Math.round(f * 1000) / 1000,
          pValue: Math.round(p * 10000) / 10000,
          effectSize: Math.round(effectSize * 10000) / 10000,
          interpretation: p < 0.05
            ? `Significant ${f1}×${f2} interaction (p=${p.toFixed(3)}): bias depends on the specific ${f1}-${f2} combination`
            : `Marginal ${f1}×${f2} interaction (p=${p.toFixed(3)}): possible combined effect, more data recommended`,
        });
      }
    };

    twoWayInteraction("machineId", "material");
    twoWayInteraction("machineId", "operation");
    twoWayInteraction("material", "operation");

    // Three-way interaction
    {
      const groups3 = new Map<string, number[]>();
      for (const d of data) {
        const key = `${d.machineId}|${d.material}|${d.operation}`;
        if (!groups3.has(key)) groups3.set(key, []);
        groups3.get(key)!.push(d.residual);
      }

      const cells3 = Array.from(groups3.entries()).filter(([, v]) => v.length > 0);
      if (cells3.length >= 8) {
        let ssCells3 = 0, ssWithin3 = 0;
        for (const [, vals] of cells3) {
          const cellMean = vals.reduce((a, v) => a + v, 0) / vals.length;
          ssCells3 += vals.length * (cellMean - grandMean) ** 2;
          for (const v of vals) ssWithin3 += (v - cellMean) ** 2;
        }

        // Subtract all 2-way and main effect SS
        let ssAllLower = 0;
        for (const me of mainEffects) {
          const g = new Map<string, number[]>();
          const factor = me.factor as typeof factors[number];
          for (const d of data) {
            if (!g.has(d[factor])) g.set(d[factor], []);
            g.get(d[factor])!.push(d.residual);
          }
          for (const [, vals] of g) {
            const m = vals.reduce((a, v) => a + v, 0) / vals.length;
            ssAllLower += vals.length * (m - grandMean) ** 2;
          }
        }

        const ssInteraction3 = Math.max(ssCells3 - ssAllLower, 0);
        const nM = new Set(data.map(d => d.machineId)).size;
        const nMat = new Set(data.map(d => d.material)).size;
        const nOp = new Set(data.map(d => d.operation)).size;
        const df3 = Math.max((nM - 1) * (nMat - 1) * (nOp - 1), 1);
        const dfW3 = Math.max(data.length - cells3.length, 1);

        if (ssWithin3 > 0) {
          const f3 = (ssInteraction3 / df3) / (ssWithin3 / dfW3);
          const p3 = fTestPValue(f3, df3, dfW3);
          const effectSize3 = ssTotalVal > 0 ? ssInteraction3 / ssTotalVal : 0;

          if (p3 < 0.1) {
            significantInteractions.push({
              factors: ["machineId", "material", "operation"],
              fStatistic: Math.round(f3 * 1000) / 1000,
              pValue: Math.round(p3 * 10000) / 10000,
              effectSize: Math.round(effectSize3 * 10000) / 10000,
              interpretation: p3 < 0.05
                ? `Significant 3-way interaction (p=${p3.toFixed(3)}): each machine-material-operation triple has a unique bias pattern`
                : `Marginal 3-way interaction (p=${p3.toFixed(3)}): some machine-material-operation triples may differ, more data needed`,
            });
          }
        }
      }
    }

    // Recommendations
    const recommendations: string[] = [];
    const sigMainEffects = mainEffects.filter(e => e.pValue < 0.05);
    if (sigMainEffects.length > 0) {
      recommendations.push(
        `Significant main effects found for: ${sigMainEffects.map(e => e.factor).join(", ")}. Maintain per-${sigMainEffects[0].factor} calibration at minimum.`
      );
    }
    if (significantInteractions.length > 0) {
      const deepest = significantInteractions.reduce((a, b) => a.factors.length > b.factors.length ? a : b);
      recommendations.push(
        `Interaction detected at ${deepest.factors.join("×")} level. Use stratified calibration at Level ${deepest.factors.length} or deeper.`
      );
    }
    if (significantInteractions.length === 0 && sigMainEffects.length === 0) {
      recommendations.push("No significant effects detected. A single global calibration may suffice, or more data is needed.");
    }
    if (data.length < 30) {
      recommendations.push(`Only ${data.length} measurements available. Collect ≥30 for reliable interaction analysis.`);
    }

    return { significantInteractions, mainEffects, recommendations };
  }

  // --------------------------------------------------------------------------
  // 8. predictionWithFullContext
  // --------------------------------------------------------------------------

  /**
   * Make a prediction using ALL available context — the ultimate predictor.
   *
   * Combines four correction sources:
   *   1. Stratified bias from the hierarchical store (with Bayesian fallback)
   *   2. Environmental adjustments (thermal growth, coolant, warm-up)
   *   3. Tool wear bias model (if toolWearState provided and enough history)
   *   4. Interaction effects (approximated from stored interaction data)
   *
   * Final prediction = baseline + stratified_bias + environmental_correction + wear_bias_correction
   *
   * @param input — Full prediction context
   * @returns Adjusted prediction with breakdown, confidence, and data support
   */
  predictionWithFullContext(input: PredictionWithFullContextInput): PredictionWithFullContextResult {
    const breakdown: AdjustmentBreakdown[] = [];
    let totalAdjustment = 0;

    // 1. Stratified bias
    const biasResult = this.getStratifiedBias({
      machineId: input.machineId,
      material: input.material,
      operation: input.operation,
      toolFamily: input.toolFamily,
      axis: input.axis,
      measurementType: input.predictionType as MeasurementType,
    });

    if (biasResult.nMeasurements > 0) {
      totalAdjustment += biasResult.bias;
      breakdown.push({ source: "stratified_bias", value: biasResult.bias });
    }

    // 2. Environmental adjustment
    if (input.shopTemp_C != null || input.coolantAge_days != null || input.machineRuntime_hours != null) {
      const envResult = this.environmentalAdjust({
        shopTemp_C: input.shopTemp_C,
        coolantAge_days: input.coolantAge_days,
        machineRuntime_hours: input.machineRuntime_hours,
        workpieceLength_mm: input.workpieceLength_mm,
        measurementType: input.predictionType as MeasurementType,
      });
      totalAdjustment += envResult.totalAdjustment;
      breakdown.push({ source: "environmental", value: envResult.totalAdjustment });
    }

    // 3. Tool wear bias correction
    if (input.toolWearState != null) {
      // Collect wear-tagged measurements from the store at the best available level
      const deepest = maxPossibleLevel(
        input.machineId, input.material, input.operation, input.toolFamily, input.axis
      );
      let wearMeasurements: { measured: number; predicted: number; toolWearState: number }[] = [];

      for (let lv = deepest; lv >= 0; lv--) {
        const key = buildContextKey(lv, input.machineId, input.material, input.operation, input.toolFamily, input.axis)
          + "/" + (input.predictionType as MeasurementType);
        const ctx = this.store.contexts.get(key);
        if (ctx) {
          const tagged = ctx.measurements
            .filter(m => m.toolWearState != null)
            .map(m => ({ measured: m.measured, predicted: m.predicted, toolWearState: m.toolWearState! }));
          if (tagged.length >= 3) {
            wearMeasurements = tagged;
            break;
          }
        }
      }

      if (wearMeasurements.length >= 3) {
        try {
          const wearModel = this.toolWearBiasModel({ measurements: wearMeasurements });
          const wearBias = wearModel.predictBias(input.toolWearState);
          // Subtract the average bias (already captured in stratified bias) and add wear-specific delta
          const avgWearBias = (wearModel.biasAtFresh + wearModel.biasAtMidLife + wearModel.biasAtEndOfLife) / 3;
          const wearDelta = wearBias - avgWearBias;
          totalAdjustment += wearDelta;
          breakdown.push({ source: "tool_wear_model", value: wearDelta });
        } catch {
          // Not enough data or degenerate — skip
        }
      }
    }

    // Compute final prediction
    const finalPrediction = input.baselinePrediction + totalAdjustment;

    // Confidence
    let confidence: ConfidenceLevel = biasResult.confidence;
    if (biasResult.nMeasurements === 0 && breakdown.length <= 1) {
      confidence = "baseline_only";
    }

    // Confidence interval (if we have std from bias)
    let confidenceInterval: [number, number] | undefined;
    if (biasResult.stdDev > 0 && biasResult.nMeasurements >= 3) {
      const z95 = 1.96;
      const se = biasResult.stdDev / Math.sqrt(biasResult.nMeasurements);
      confidenceInterval = [
        finalPrediction - z95 * se,
        finalPrediction + z95 * se,
      ];
    }

    // Improvement message
    let improvementVsBaseline: string;
    if (biasResult.nMeasurements >= this.defaultMinSamples) {
      const pctChange = Math.abs(totalAdjustment / (Math.abs(input.baselinePrediction) || 1)) * 100;
      improvementVsBaseline = `Adjustment of ${totalAdjustment.toFixed(4)} (${pctChange.toFixed(1)}%) based on ${biasResult.nMeasurements} measurements at Level ${biasResult.level} (${biasResult.levelName})`;
    } else if (biasResult.nMeasurements > 0) {
      improvementVsBaseline = `Sparse data (${biasResult.nMeasurements} measurements) — adjustment applied with shrinkage toward parent level`;
    } else {
      improvementVsBaseline = "No historical calibration data — returning baseline with environmental corrections only";
    }

    return {
      finalPrediction,
      baselinePrediction: input.baselinePrediction,
      totalAdjustment,
      adjustmentBreakdown: breakdown,
      confidence,
      confidenceInterval,
      dataSupport: {
        level: biasResult.level,
        nMeasurements: biasResult.nMeasurements,
      },
      improvementVsBaseline,
    };
  }

  // --------------------------------------------------------------------------
  // INTERNAL HELPERS
  // --------------------------------------------------------------------------

  /**
   * Ensure a context entry exists in the store.
   * @param key — Full context key including measurement type suffix
   */
  private ensureContext(key: string): void {
    if (!this.store.contexts.has(key)) {
      this.store.contexts.set(key, {
        measurements: [],
        bias: 0,
        rmse: 0,
        lastCalibrated: null,
      });
    }
  }

  /**
   * Clear all stored data — useful for testing.
   */
  reset(): void {
    this.store.contexts.clear();
    this.idCounter = 0;
  }

  /**
   * Get the raw store for inspection/testing.
   */
  getStore(): StratifiedStore {
    return this.store;
  }
}
