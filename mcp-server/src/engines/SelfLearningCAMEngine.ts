// @ts-nocheck
/**
 * SelfLearningCAMEngine — Closed-loop learning system for CAM
 *
 * CK-MS8: Self-Learning & Digital Twin milestone. Provides five integrated
 * capabilities that turn PRISM into an ever-improving system:
 *
 *  1. cutToLearn          — Ingest actual vs predicted results, update Bayesian priors
 *  2. digitalTwinSync     — Per-machine digital twin state with Kalman filter estimation
 *  3. strategyRanking     — Empirical strategy effectiveness with confidence intervals
 *  4. anomalyRelearn      — Mahalanobis-based divergence detection + auto-recalibration
 *  5. fleetLearn          — Hierarchical Bayesian pooling across machine fleet
 *
 * Mathematics:
 *  - Bayesian conjugate-normal updating: posterior ∝ likelihood × prior
 *  - Kalman filter: x̂⁻ = F·x̂, P⁻ = F·P·Fᵀ + Q, K = P⁻·Hᵀ·(H·P⁻·Hᵀ + R)⁻¹
 *  - Mahalanobis distance: d² = (x−μ)ᵀ·Σ⁻¹·(x−μ)
 *  - Hierarchical Bayesian shrinkage: θ̂ᵢ = wᵢ·x̄ᵢ + (1−wᵢ)·μ_fleet
 *  - Online sufficient statistics: Welford's algorithm for running mean/variance
 *  - Wilson score interval for binomial proportions (strategy win rates)
 *
 * References:
 *  - Kienzle (1952) — Specific cutting force kc = kc1.1 · h^(−mc)
 *  - Taylor (1907) — Tool life V·Tⁿ = C
 *  - Kalman (1960) — Optimal linear filter for state estimation
 *  - Mahalanobis (1936) — Multivariate distance measure
 *  - Gelman et al. (2013) — Bayesian Data Analysis, hierarchical models
 *  - Welford (1962) — Online variance algorithm
 *  - Wilson (1927) — Score interval for proportions
 *
 * @module SelfLearningCAMEngine
 */

// ============================================================================
// INTERFACES — Cut-to-Learn Pipeline
// ============================================================================

/** A single machining result observation (actual vs predicted) */
export interface MachiningObservation {
  /** Unique job/part identifier */
  jobId: string;
  /** Machine identifier */
  machineId: string;
  /** ISO material group */
  materialGroup: "P" | "M" | "K" | "N" | "S" | "H";
  /** Specific material name (e.g., "316L", "Ti-6Al-4V") */
  materialName?: string;
  /** CAM strategy used */
  strategy?: string;
  /** Geometry class (pocket, contour, slot, face, 3d_surface, etc.) */
  geometryClass?: string;
  /** Cutting parameters used */
  cuttingParams: {
    speed_mpm: number;
    feed_mmtooth: number;
    axial_depth_mm: number;
    radial_depth_mm: number;
    tool_diameter_mm: number;
  };
  /** Actual measured values */
  actuals: {
    force_N?: number;
    surface_finish_Ra_um?: number;
    tool_life_min?: number;
    cycle_time_min?: number;
    dimension_error_um?: number;
    vibration_g?: number;
    temperature_C?: number;
    power_kW?: number;
  };
  /** PRISM-predicted values (before machining) */
  predicted?: {
    force_N?: number;
    surface_finish_Ra_um?: number;
    tool_life_min?: number;
    cycle_time_min?: number;
    dimension_error_um?: number;
    power_kW?: number;
  };
  /** Timestamp (epoch ms) */
  timestamp?: number;
}

/** Input for cutToLearn */
export interface CutToLearnInput {
  observations: MachiningObservation[];
  /** Update Kienzle kc1.1/mc priors (default true) */
  updateKienzle?: boolean;
  /** Update Taylor C/n priors (default true) */
  updateTaylor?: boolean;
  /** Update surface finish coefficients (default true) */
  updateFinish?: boolean;
}

/** Bayesian parameter estimate */
export interface BayesianEstimate {
  mean: number;
  stdDev: number;
  ci95: [number, number];
  nObservations: number;
  priorWeight: number;
}

/** Result of cutToLearn */
export interface CutToLearnResult {
  observationsProcessed: number;
  kienzleUpdates?: Record<string, { kc11: BayesianEstimate; mc: BayesianEstimate }>;
  taylorUpdates?: Record<string, { C: BayesianEstimate; n: BayesianEstimate }>;
  finishUpdates?: Record<string, { bias: BayesianEstimate }>;
  residualSummary: {
    force_RMSE?: number;
    finish_RMSE?: number;
    life_RMSE?: number;
    dimension_RMSE?: number;
  };
  recommendations: string[];
}

// ============================================================================
// INTERFACES — Digital Twin Synchronization
// ============================================================================

/** Sensor reading for digital twin update */
export interface SensorReading {
  machineId: string;
  timestamp: number;
  /** Sensor data (noisy) */
  sensors: {
    spindle_load_pct?: number;
    vibration_rms_g?: number;
    temperature_C?: number;
    power_kW?: number;
    axis_position_error_um?: number;
  };
  /** Current tool state */
  toolState?: {
    toolId: string;
    cuttingTime_min: number;
    materialRemoved_cm3: number;
  };
}

/** Digital twin state for a single machine */
export interface MachineTwinState {
  machineId: string;
  lastUpdated: number;
  /** Tool wear state (VB flank wear mm per tool slot) */
  toolWear: Record<string, { vb_mm: number; vb_rate_mm_min: number; confidence: number }>;
  /** Thermal drift state */
  thermalDrift: {
    x_um: number; y_um: number; z_um: number;
    temperature_C: number;
    time_constant_min: number;
  };
  /** Spindle state */
  spindle: {
    totalHours: number;
    bearingHealth: number; // 0-1 (1=new)
    runout_um: number;
  };
  /** Axis backlash */
  backlash: { x_um: number; y_um: number; z_um: number };
  /** Kalman filter internals */
  kalmanState: number[];
  kalmanCovariance: number[];
  /** S/F correction factors derived from twin */
  sfCorrections: {
    speedFactor: number;
    feedFactor: number;
    depthFactor: number;
  };
}

/** Input for digitalTwinSync */
export interface DigitalTwinSyncInput {
  machineId: string;
  readings: SensorReading[];
  /** Process noise tuning (default 0.01) */
  processNoise?: number;
  /** Measurement noise tuning (default 0.1) */
  measurementNoise?: number;
}

/** Result of digitalTwinSync */
export interface DigitalTwinSyncResult {
  machineId: string;
  twinState: MachineTwinState;
  stateChanges: { field: string; oldValue: number; newValue: number; changePercent: number }[];
  alerts: { severity: "info" | "warning" | "critical"; message: string; field: string }[];
  sfCorrections: { speedFactor: number; feedFactor: number; depthFactor: number };
  recommendations: string[];
}

// ============================================================================
// INTERFACES — Strategy Effectiveness Ranking
// ============================================================================

/** Input for strategyRanking */
export interface StrategyRankingInput {
  /** Filter by material group */
  materialGroup?: "P" | "M" | "K" | "N" | "S" | "H";
  /** Filter by geometry class */
  geometryClass?: string;
  /** Optimization target */
  optimizeFor?: "mrr" | "finish" | "tool_life" | "cost" | "balanced";
  /** Minimum observations for a strategy to be ranked */
  minObservations?: number;
}

/** A single strategy's performance record */
export interface StrategyPerformance {
  strategy: string;
  observations: number;
  /** Mean MRR relative to baseline (1.0 = baseline) */
  mrrFactor: { mean: number; ci95: [number, number] };
  /** Mean surface finish relative to baseline */
  finishFactor: { mean: number; ci95: [number, number] };
  /** Mean tool life relative to baseline */
  lifeFactor: { mean: number; ci95: [number, number] };
  /** Win rate (fraction of times this was best strategy) */
  winRate: { rate: number; ci95: [number, number] };
  /** Composite score (weighted combination) */
  compositeScore: number;
  /** Confidence level: "low" (<10 obs), "medium" (10-50), "high" (>50) */
  confidence: "low" | "medium" | "high";
}

/** Result of strategyRanking */
export interface StrategyRankingResult {
  rankings: StrategyPerformance[];
  materialGroup: string;
  geometryClass: string;
  optimizeFor: string;
  totalObservations: number;
  recommendation: string;
  recommendations: string[];
}

// ============================================================================
// INTERFACES — Anomaly-Triggered Relearning
// ============================================================================

/** Input for anomalyRelearn */
export interface AnomalyRelearnInput {
  /** Recent observations to check for anomalies */
  observations: MachiningObservation[];
  /** Mahalanobis threshold for anomaly (default 3.0 ≈ 99.7% for normal) */
  threshold?: number;
  /** Auto-trigger recalibration if anomalies detected */
  autoRecalibrate?: boolean;
}

/** A detected anomaly */
export interface DetectedAnomaly {
  jobId: string;
  machineId: string;
  mahalanobisDistance: number;
  deviatingFields: { field: string; actual: number; expected: number; zScore: number }[];
  probableCause: "tool_breakage" | "machine_degradation" | "material_batch" | "fixturing" | "unknown";
  severity: "minor" | "moderate" | "severe";
}

/** Result of anomalyRelearn */
export interface AnomalyRelearnResult {
  observationsChecked: number;
  anomaliesDetected: DetectedAnomaly[];
  recalibrated: boolean;
  modelsAffected: string[];
  newThresholds?: Record<string, number>;
  recommendations: string[];
}

// ============================================================================
// INTERFACES — Fleet Learning
// ============================================================================

/** Input for fleetLearn */
export interface FleetLearnInput {
  /** All machines to include in fleet learning */
  machineIds?: string[];
  /** New machine to bootstrap (gets fleet priors) */
  newMachineId?: string;
  /** Shrinkage strength (0=no pooling, 1=full pooling; default auto) */
  shrinkage?: number;
}

/** Fleet-level parameter estimate */
export interface FleetEstimate {
  fleetMean: number;
  fleetStdDev: number;
  machineEstimates: Record<string, { raw: number; shrunk: number; weight: number; nObs: number }>;
  betweenMachineVariance: number;
  withinMachineVariance: number;
}

/** Result of fleetLearn */
export interface FleetLearnResult {
  machineCount: number;
  totalObservations: number;
  kienzleFleet?: Record<string, FleetEstimate>;
  taylorFleet?: Record<string, FleetEstimate>;
  finishFleet?: Record<string, FleetEstimate>;
  newMachineBootstrap?: {
    machineId: string;
    priors: Record<string, { mean: number; stdDev: number; source: string }>;
  };
  recommendations: string[];
}

// ============================================================================
// INTERNAL STATE
// ============================================================================

/** Online sufficient statistics (Welford) */
interface OnlineStats {
  n: number;
  mean: number;
  m2: number;
}

/** Bayesian parameter state (conjugate normal) */
interface BayesParam {
  mu: number;       // posterior mean
  sigma2: number;   // posterior variance
  n: number;        // observation count
  sumX: number;     // sufficient stat: sum of observations
  sumX2: number;    // sufficient stat: sum of squares
}

/** Per-material Bayesian priors for physics models */
interface MaterialPriors {
  kc11: BayesParam;
  mc: BayesParam;
  taylorC: BayesParam;
  taylorN: BayesParam;
  finishBias: BayesParam;
}

/** Strategy observation record */
interface StrategyRecord {
  strategy: string;
  materialGroup: string;
  geometryClass: string;
  mrrFactor: number;
  finishFactor: number;
  lifeFactor: number;
  timestamp: number;
}

/** Kalman state for digital twin (6-state: wearRate, thermalX, thermalY, thermalZ, spindleHealth, backlashDrift) */
const TWIN_STATE_DIM = 6;

// ============================================================================
// DEFAULT PRIORS (from literature / Kienzle 1952, Taylor 1907)
// ============================================================================

const DEFAULT_KIENZLE: Record<string, { kc11: number; mc: number }> = {
  P: { kc11: 1780, mc: 0.25 },
  M: { kc11: 2100, mc: 0.25 },
  K: { kc11: 1100, mc: 0.25 },
  N: { kc11: 700, mc: 0.25 },
  S: { kc11: 2800, mc: 0.25 },
  H: { kc11: 3500, mc: 0.28 },
};

const DEFAULT_TAYLOR: Record<string, { C: number; n: number }> = {
  P: { C: 350, n: 0.25 },
  M: { C: 200, n: 0.22 },
  K: { C: 500, n: 0.28 },
  N: { C: 800, n: 0.35 },
  S: { C: 120, n: 0.18 },
  H: { C: 100, n: 0.15 },
};

const DEFAULT_PRIOR_STDDEV = 0.15; // 15% uncertainty for initial priors

// ============================================================================
// HELPER: Math utilities
// ============================================================================

/** Normal PDF */
function normalPdf(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

/** Normal CDF (Abramowitz & Stegun rational approx) */
function normalCdf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return 0.5 * (1 + sign * y);
}

/** Normal quantile (Beasley-Springer-Moro rational approx) */
function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (Math.abs(p - 0.5) < 1e-12) return 0;
  const a = [
    -3.969683028665376e1, 2.209460984245205e2,
    -2.759285104469687e2, 1.383577518672690e2,
    -3.066479806614716e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2,
    -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1,
    -2.400758277161838e0, -2.549732539343734e0,
    4.374664141464968e0, 2.938163982698783e0,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1,
    2.445134137142996e0, 3.754408661907416e0,
  ];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

/** Wilson score interval for proportion p with n trials */
function wilsonCI(successes: number, trials: number, z: number = 1.96): [number, number] {
  if (trials === 0) return [0, 1];
  const p = successes / trials;
  const denom = 1 + z * z / trials;
  const centre = p + z * z / (2 * trials);
  const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * trials)) / trials);
  return [Math.max(0, (centre - margin) / denom), Math.min(1, (centre + margin) / denom)];
}

/** Welford online stats update */
function welfordUpdate(stats: OnlineStats, x: number): OnlineStats {
  const n = stats.n + 1;
  const delta = x - stats.mean;
  const mean = stats.mean + delta / n;
  const m2 = stats.m2 + delta * (x - mean);
  return { n, mean, m2 };
}

function welfordVariance(stats: OnlineStats): number {
  return stats.n < 2 ? 0 : stats.m2 / (stats.n - 1);
}

/** Compute RMSE from arrays */
function rmse(actual: number[], predicted: number[]): number {
  if (actual.length === 0) return 0;
  const n = Math.min(actual.length, predicted.length);
  let sumSq = 0;
  for (let i = 0; i < n; i++) sumSq += (actual[i] - predicted[i]) ** 2;
  return Math.sqrt(sumSq / n);
}

/** Make a Bayesian parameter with initial prior */
function makeBayesParam(mu: number, relStdDev: number): BayesParam {
  return { mu, sigma2: (mu * relStdDev) ** 2, n: 0, sumX: 0, sumX2: 0 };
}

/** Conjugate-normal Bayesian update: prior N(μ₀,σ₀²) + data N(x̄,σ²/n) → posterior */
function bayesianUpdate(prior: BayesParam, observations: number[], measNoise: number): BayesParam {
  if (observations.length === 0) return { ...prior };
  const n = observations.length;
  const xBar = observations.reduce((a, b) => a + b, 0) / n;
  const measVar = measNoise * measNoise;

  // Precision-weighted combination
  const priorPrec = 1 / Math.max(prior.sigma2, 1e-20);
  const dataPrec = n / Math.max(measVar, 1e-20);
  const postPrec = priorPrec + dataPrec;
  const postMu = (priorPrec * prior.mu + dataPrec * xBar) / postPrec;
  const postSigma2 = 1 / postPrec;

  return {
    mu: postMu,
    sigma2: postSigma2,
    n: prior.n + n,
    sumX: prior.sumX + observations.reduce((a, b) => a + b, 0),
    sumX2: prior.sumX2 + observations.reduce((a, b) => a + b * b, 0),
  };
}

/** Mahalanobis distance for a vector given mean and diagonal covariance */
function mahalanobisDistance(x: number[], mu: number[], diagCov: number[]): number {
  let d2 = 0;
  for (let i = 0; i < x.length; i++) {
    const diff = x[i] - mu[i];
    d2 += (diff * diff) / Math.max(diagCov[i], 1e-20);
  }
  return Math.sqrt(d2);
}

/** Simple matrix operations for Kalman (diagonal-only for efficiency) */
function diagKalmanPredict(
  state: number[], cov: number[], processNoise: number[]
): { state: number[]; cov: number[] } {
  // x⁻ = F·x (F=I for random walk model)
  const predState = [...state];
  // P⁻ = F·P·Fᵀ + Q = P + Q (F=I)
  const predCov = cov.map((c, i) => c + processNoise[i]);
  return { state: predState, cov: predCov };
}

function diagKalmanUpdate(
  predState: number[], predCov: number[],
  measurement: number[], measNoise: number[], measMask: boolean[]
): { state: number[]; cov: number[]; innovation: number[] } {
  const state = [...predState];
  const cov = [...predCov];
  const innovation: number[] = new Array(state.length).fill(0);

  for (let i = 0; i < state.length; i++) {
    if (!measMask[i]) continue;
    // Kalman gain K = P⁻/(P⁻ + R)
    const S = predCov[i] + measNoise[i];
    const K = predCov[i] / Math.max(S, 1e-20);
    // Innovation
    innovation[i] = measurement[i] - predState[i];
    // Update
    state[i] = predState[i] + K * innovation[i];
    cov[i] = (1 - K) * predCov[i];
  }

  return { state, cov, innovation };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * SelfLearningCAMEngine — Closed-loop learning for CAM operations.
 *
 * Maintains per-material Bayesian priors, per-machine digital twin states,
 * strategy performance matrices, and fleet-level hierarchical models.
 * All state is in-memory; persistence via export/import methods.
 */
class SelfLearningCAMEngine {
  /** Per-material-group Bayesian priors */
  private materialPriors: Map<string, MaterialPriors> = new Map();

  /** Per-machine digital twin state */
  private twinStates: Map<string, MachineTwinState> = new Map();

  /** Strategy observation history */
  private strategyRecords: StrategyRecord[] = [];

  /** Per-machine residual statistics (Welford online) */
  private residualStats: Map<string, Record<string, OnlineStats>> = new Map();

  /** Observation history for fleet learning */
  private machineObservations: Map<string, MachiningObservation[]> = new Map();

  constructor() {
    // Initialize default priors for all ISO material groups
    for (const group of ["P", "M", "K", "N", "S", "H"]) {
      this.initMaterialPriors(group);
    }
  }

  /** Initialize Bayesian priors for a material group from literature defaults */
  private initMaterialPriors(group: string): MaterialPriors {
    const kz = DEFAULT_KIENZLE[group] || DEFAULT_KIENZLE.P;
    const tl = DEFAULT_TAYLOR[group] || DEFAULT_TAYLOR.P;
    const priors: MaterialPriors = {
      kc11: makeBayesParam(kz.kc11, DEFAULT_PRIOR_STDDEV),
      mc: makeBayesParam(kz.mc, DEFAULT_PRIOR_STDDEV),
      taylorC: makeBayesParam(tl.C, DEFAULT_PRIOR_STDDEV),
      taylorN: makeBayesParam(tl.n, DEFAULT_PRIOR_STDDEV),
      finishBias: makeBayesParam(0, 0.5), // bias starts at 0 with wide uncertainty
    };
    this.materialPriors.set(group, priors);
    return priors;
  }

  /** Get or create material priors */
  private getPriors(group: string): MaterialPriors {
    return this.materialPriors.get(group) || this.initMaterialPriors(group);
  }

  /** Get or create twin state for a machine */
  private getTwinState(machineId: string): MachineTwinState {
    let twin = this.twinStates.get(machineId);
    if (!twin) {
      twin = {
        machineId,
        lastUpdated: Date.now(),
        toolWear: {},
        thermalDrift: { x_um: 0, y_um: 0, z_um: 0, temperature_C: 20, time_constant_min: 45 },
        spindle: { totalHours: 0, bearingHealth: 1.0, runout_um: 2.0 },
        backlash: { x_um: 3.0, y_um: 3.0, z_um: 5.0 },
        kalmanState: new Array(TWIN_STATE_DIM).fill(0),
        kalmanCovariance: new Array(TWIN_STATE_DIM).fill(1.0),
        sfCorrections: { speedFactor: 1.0, feedFactor: 1.0, depthFactor: 1.0 },
      };
      this.twinStates.set(machineId, twin);
    }
    return twin;
  }

  /** Get or init residual stats for a machine */
  private getResidualStats(machineId: string): Record<string, OnlineStats> {
    let stats = this.residualStats.get(machineId);
    if (!stats) {
      stats = {
        force: { n: 0, mean: 0, m2: 0 },
        finish: { n: 0, mean: 0, m2: 0 },
        life: { n: 0, mean: 0, m2: 0 },
        dimension: { n: 0, mean: 0, m2: 0 },
      };
      this.residualStats.set(machineId, stats);
    }
    return stats;
  }

  // ========================================================================
  // MAIN DISPATCH
  // ========================================================================

  /**
   * Main entry point — dispatches to sub-methods based on action.
   * @param action - The action to perform
   * @param params - Action-specific parameters
   */
  calculate(action: string, params: Record<string, any>): any {
    switch (action) {
      case "cut_to_learn":
        return this.cutToLearn(params as CutToLearnInput);
      case "digital_twin_sync":
        return this.digitalTwinSync(params as DigitalTwinSyncInput);
      case "strategy_ranking":
        return this.strategyRanking(params as StrategyRankingInput);
      case "anomaly_relearn":
        return this.anomalyRelearn(params as AnomalyRelearnInput);
      case "fleet_learn":
        return this.fleetLearn(params as FleetLearnInput);
      default:
        return { error: `Unknown action: ${action}`, availableActions: [
          "cut_to_learn", "digital_twin_sync", "strategy_ranking",
          "anomaly_relearn", "fleet_learn",
        ]};
    }
  }

  // ========================================================================
  // 1. CUT-TO-LEARN PIPELINE
  // ========================================================================

  /**
   * Ingest actual machining results vs predictions.
   * Updates Bayesian priors for Kienzle kc1.1/mc, Taylor C/n, and surface
   * finish bias using conjugate-normal updating.
   *
   * Posterior ∝ Likelihood × Prior:
   *   μ_post = (μ₀/σ₀² + n·x̄/σ²) / (1/σ₀² + n/σ²)
   *   σ²_post = 1 / (1/σ₀² + n/σ²)
   *
   * For Kienzle, we invert F = kc1.1 · b · h^(1−mc) to extract kc1.1 from
   * measured force, then update the prior.
   */
  cutToLearn(input: CutToLearnInput): CutToLearnResult {
    const { observations, updateKienzle = true, updateTaylor = true, updateFinish = true } = input;
    const recommendations: string[] = [];
    const kienzleUpdates: Record<string, { kc11: BayesianEstimate; mc: BayesianEstimate }> = {};
    const taylorUpdates: Record<string, { C: BayesianEstimate; n: BayesianEstimate }> = {};
    const finishUpdates: Record<string, { bias: BayesianEstimate }> = {};

    // Collect residuals for RMSE
    const forceResiduals: number[] = [];
    const finishResiduals: number[] = [];
    const lifeResiduals: number[] = [];
    const dimResiduals: number[] = [];

    // Group by material for Bayesian updating
    const byMaterial = new Map<string, MachiningObservation[]>();
    for (const obs of observations) {
      const key = obs.materialGroup;
      if (!byMaterial.has(key)) byMaterial.set(key, []);
      byMaterial.get(key)!.push(obs);

      // Store for fleet learning
      if (!this.machineObservations.has(obs.machineId)) {
        this.machineObservations.set(obs.machineId, []);
      }
      this.machineObservations.get(obs.machineId)!.push(obs);

      // Store strategy records
      if (obs.strategy) {
        const baselineMRR = obs.cuttingParams.speed_mpm * obs.cuttingParams.feed_mmtooth *
          obs.cuttingParams.axial_depth_mm * obs.cuttingParams.radial_depth_mm;
        this.strategyRecords.push({
          strategy: obs.strategy,
          materialGroup: obs.materialGroup,
          geometryClass: obs.geometryClass || "general",
          mrrFactor: baselineMRR > 0 ? 1.0 : 1.0, // normalized later
          finishFactor: obs.actuals.surface_finish_Ra_um
            ? (obs.predicted?.surface_finish_Ra_um || obs.actuals.surface_finish_Ra_um) / Math.max(obs.actuals.surface_finish_Ra_um, 0.01)
            : 1.0,
          lifeFactor: obs.actuals.tool_life_min
            ? obs.actuals.tool_life_min / Math.max(obs.predicted?.tool_life_min || obs.actuals.tool_life_min, 0.1)
            : 1.0,
          timestamp: obs.timestamp || Date.now(),
        });
      }

      // Collect residuals
      if (obs.actuals.force_N && obs.predicted?.force_N) {
        forceResiduals.push(obs.actuals.force_N - obs.predicted.force_N);
      }
      if (obs.actuals.surface_finish_Ra_um && obs.predicted?.surface_finish_Ra_um) {
        finishResiduals.push(obs.actuals.surface_finish_Ra_um - obs.predicted.surface_finish_Ra_um);
      }
      if (obs.actuals.tool_life_min && obs.predicted?.tool_life_min) {
        lifeResiduals.push(obs.actuals.tool_life_min - obs.predicted.tool_life_min);
      }
      if (obs.actuals.dimension_error_um && obs.predicted?.dimension_error_um) {
        dimResiduals.push(obs.actuals.dimension_error_um - obs.predicted.dimension_error_um);
      }

      // Update per-machine online residual stats
      const rStats = this.getResidualStats(obs.machineId);
      if (obs.actuals.force_N && obs.predicted?.force_N) {
        rStats.force = welfordUpdate(rStats.force, obs.actuals.force_N - obs.predicted.force_N);
      }
      if (obs.actuals.surface_finish_Ra_um && obs.predicted?.surface_finish_Ra_um) {
        rStats.finish = welfordUpdate(rStats.finish,
          obs.actuals.surface_finish_Ra_um - obs.predicted.surface_finish_Ra_um);
      }
    }

    // Bayesian updates per material group
    for (const [matGroup, matObs] of byMaterial) {
      const priors = this.getPriors(matGroup);

      // --- Kienzle kc1.1 update ---
      if (updateKienzle) {
        const kc11Observations: number[] = [];
        for (const obs of matObs) {
          if (!obs.actuals.force_N) continue;
          const cp = obs.cuttingParams;
          const h = cp.feed_mmtooth; // chip thickness ≈ fz for 90° lead angle
          const b = cp.axial_depth_mm; // chip width ≈ ap for 90° lead angle
          if (h > 0 && b > 0) {
            // F = kc1.1 · b · h^(1-mc) → kc1.1 = F / (b · h^(1-mc))
            const mc = priors.mc.mu;
            const kc11_obs = obs.actuals.force_N / (b * Math.pow(h, 1 - mc));
            kc11Observations.push(kc11_obs);
          }
        }
        if (kc11Observations.length > 0) {
          const measNoise = priors.kc11.mu * 0.1; // 10% measurement noise
          priors.kc11 = bayesianUpdate(priors.kc11, kc11Observations, measNoise);
          const std = Math.sqrt(priors.kc11.sigma2);
          kienzleUpdates[matGroup] = {
            kc11: {
              mean: priors.kc11.mu,
              stdDev: std,
              ci95: [priors.kc11.mu - 1.96 * std, priors.kc11.mu + 1.96 * std],
              nObservations: priors.kc11.n,
              priorWeight: 1 / (1 + priors.kc11.n * 0.1),
            },
            mc: {
              mean: priors.mc.mu,
              stdDev: Math.sqrt(priors.mc.sigma2),
              ci95: [priors.mc.mu - 1.96 * Math.sqrt(priors.mc.sigma2),
                     priors.mc.mu + 1.96 * Math.sqrt(priors.mc.sigma2)],
              nObservations: priors.mc.n,
              priorWeight: 1 / (1 + priors.mc.n * 0.1),
            },
          };
        }
      }

      // --- Taylor C/n update ---
      if (updateTaylor) {
        const taylorCObs: number[] = [];
        const taylorNObs: number[] = [];
        // Need ≥2 observations at different speeds to update n
        const speedLifePairs: { v: number; t: number }[] = [];
        for (const obs of matObs) {
          if (!obs.actuals.tool_life_min || obs.actuals.tool_life_min <= 0) continue;
          const v = obs.cuttingParams.speed_mpm;
          if (v > 0) {
            speedLifePairs.push({ v, t: obs.actuals.tool_life_min });
            // C = V · T^n → extract C given current n estimate
            const C_obs = v * Math.pow(obs.actuals.tool_life_min, priors.taylorN.mu);
            taylorCObs.push(C_obs);
          }
        }
        if (taylorCObs.length > 0) {
          const measNoise = priors.taylorC.mu * 0.15;
          priors.taylorC = bayesianUpdate(priors.taylorC, taylorCObs, measNoise);

          // Update n if we have multiple speed-life pairs (log-linear regression)
          if (speedLifePairs.length >= 2) {
            const logV = speedLifePairs.map(p => Math.log(p.v));
            const logT = speedLifePairs.map(p => Math.log(p.t));
            // T = C/V^(1/n) → log(T) = log(C)/n - (1/n)·log(V)
            // Simple linear regression: logT = a + b·logV where b = -1/n
            const nPts = logV.length;
            const meanLogV = logV.reduce((a, b) => a + b, 0) / nPts;
            const meanLogT = logT.reduce((a, b) => a + b, 0) / nPts;
            let ssxy = 0, ssxx = 0;
            for (let i = 0; i < nPts; i++) {
              ssxy += (logV[i] - meanLogV) * (logT[i] - meanLogT);
              ssxx += (logV[i] - meanLogV) ** 2;
            }
            if (ssxx > 1e-10) {
              const slope = ssxy / ssxx; // b = -1/n
              const nEst = -1 / slope;
              if (nEst > 0.05 && nEst < 1.0) {
                taylorNObs.push(nEst);
                priors.taylorN = bayesianUpdate(priors.taylorN, taylorNObs, 0.05);
              }
            }
          }

          const cStd = Math.sqrt(priors.taylorC.sigma2);
          const nStd = Math.sqrt(priors.taylorN.sigma2);
          taylorUpdates[matGroup] = {
            C: {
              mean: priors.taylorC.mu,
              stdDev: cStd,
              ci95: [priors.taylorC.mu - 1.96 * cStd, priors.taylorC.mu + 1.96 * cStd],
              nObservations: priors.taylorC.n,
              priorWeight: 1 / (1 + priors.taylorC.n * 0.1),
            },
            n: {
              mean: priors.taylorN.mu,
              stdDev: nStd,
              ci95: [priors.taylorN.mu - 1.96 * nStd, priors.taylorN.mu + 1.96 * nStd],
              nObservations: priors.taylorN.n,
              priorWeight: 1 / (1 + priors.taylorN.n * 0.1),
            },
          };
        }
      }

      // --- Surface finish bias update ---
      if (updateFinish) {
        const biasObs: number[] = [];
        for (const obs of matObs) {
          if (obs.actuals.surface_finish_Ra_um && obs.predicted?.surface_finish_Ra_um) {
            // Bias = actual - predicted
            biasObs.push(obs.actuals.surface_finish_Ra_um - obs.predicted.surface_finish_Ra_um);
          }
        }
        if (biasObs.length > 0) {
          priors.finishBias = bayesianUpdate(priors.finishBias, biasObs, 0.2);
          const bStd = Math.sqrt(priors.finishBias.sigma2);
          finishUpdates[matGroup] = {
            bias: {
              mean: priors.finishBias.mu,
              stdDev: bStd,
              ci95: [priors.finishBias.mu - 1.96 * bStd, priors.finishBias.mu + 1.96 * bStd],
              nObservations: priors.finishBias.n,
              priorWeight: 1 / (1 + priors.finishBias.n * 0.1),
            },
          };
        }
      }
    }

    // RMSE summary
    const residualSummary: CutToLearnResult["residualSummary"] = {};
    if (forceResiduals.length > 0) {
      residualSummary.force_RMSE = Math.sqrt(forceResiduals.reduce((s, r) => s + r * r, 0) / forceResiduals.length);
    }
    if (finishResiduals.length > 0) {
      residualSummary.finish_RMSE = Math.sqrt(finishResiduals.reduce((s, r) => s + r * r, 0) / finishResiduals.length);
    }
    if (lifeResiduals.length > 0) {
      residualSummary.life_RMSE = Math.sqrt(lifeResiduals.reduce((s, r) => s + r * r, 0) / lifeResiduals.length);
    }
    if (dimResiduals.length > 0) {
      residualSummary.dimension_RMSE = Math.sqrt(dimResiduals.reduce((s, r) => s + r * r, 0) / dimResiduals.length);
    }

    // Recommendations
    if (residualSummary.force_RMSE && residualSummary.force_RMSE > 100) {
      recommendations.push(`Force prediction RMSE=${residualSummary.force_RMSE.toFixed(1)}N — consider recalibrating Kienzle coefficients`);
    }
    if (residualSummary.finish_RMSE && residualSummary.finish_RMSE > 0.5) {
      recommendations.push(`Finish prediction RMSE=${residualSummary.finish_RMSE.toFixed(2)}µm — surface model needs attention`);
    }
    for (const [matGroup, update] of Object.entries(kienzleUpdates)) {
      if (update.kc11.nObservations >= 20 && update.kc11.stdDev / update.kc11.mean < 0.05) {
        recommendations.push(`Material ${matGroup}: kc1.1 well-calibrated (CV=${(update.kc11.stdDev / update.kc11.mean * 100).toFixed(1)}%)`);
      }
    }
    if (observations.length >= 50) {
      recommendations.push("Substantial learning data accumulated — model confidence is increasing");
    }

    return {
      observationsProcessed: observations.length,
      kienzleUpdates: Object.keys(kienzleUpdates).length > 0 ? kienzleUpdates : undefined,
      taylorUpdates: Object.keys(taylorUpdates).length > 0 ? taylorUpdates : undefined,
      finishUpdates: Object.keys(finishUpdates).length > 0 ? finishUpdates : undefined,
      residualSummary,
      recommendations,
    };
  }

  // ========================================================================
  // 2. DIGITAL TWIN SYNCHRONIZATION
  // ========================================================================

  /**
   * Maintain per-machine digital twin state using Kalman filtering.
   *
   * State vector [6]:
   *   [0] Tool wear rate (mm/min)
   *   [1] Thermal drift X (µm)
   *   [2] Thermal drift Y (µm)
   *   [3] Thermal drift Z (µm)
   *   [4] Spindle health (0-1)
   *   [5] Backlash drift factor
   *
   * Kalman predict: x̂⁻ = F·x̂ₖ₋₁, P⁻ = F·P·Fᵀ + Q
   * Kalman update:  K = P⁻·Hᵀ·(H·P⁻·Hᵀ + R)⁻¹, x̂ = x̂⁻ + K·(z − H·x̂⁻)
   */
  digitalTwinSync(input: DigitalTwinSyncInput): DigitalTwinSyncResult {
    const { machineId, readings, processNoise = 0.01, measurementNoise = 0.1 } = input;
    const twin = this.getTwinState(machineId);
    const stateChanges: DigitalTwinSyncResult["stateChanges"] = [];
    const alerts: DigitalTwinSyncResult["alerts"] = [];
    const recommendations: string[] = [];

    // Save old state for change tracking
    const oldWearRate = twin.kalmanState[0];
    const oldThermalX = twin.kalmanState[1];
    const oldThermalY = twin.kalmanState[2];
    const oldThermalZ = twin.kalmanState[3];
    const oldSpindleHealth = twin.kalmanState[4] || 1.0;
    const oldBacklash = twin.kalmanState[5];

    // Process noise vector (per-state)
    const Q = [
      processNoise * 0.001,  // wear rate changes slowly
      processNoise * 1.0,    // thermal X drifts
      processNoise * 1.0,    // thermal Y drifts
      processNoise * 2.0,    // thermal Z drifts more (vertical)
      processNoise * 0.0001, // spindle degrades very slowly
      processNoise * 0.01,   // backlash drifts slowly
    ];

    // Measurement noise vector
    const R = [
      measurementNoise * 0.01,  // wear rate from spindle load proxy
      measurementNoise * 5.0,   // thermal from temperature sensor
      measurementNoise * 5.0,
      measurementNoise * 10.0,
      measurementNoise * 0.05,  // spindle health from vibration proxy
      measurementNoise * 2.0,   // backlash from position error
    ];

    // Process each reading through Kalman filter
    for (const reading of readings) {
      // Build measurement vector and mask
      const z = new Array(TWIN_STATE_DIM).fill(0);
      const mask = new Array(TWIN_STATE_DIM).fill(false);

      // Map sensor data to state observations
      if (reading.sensors.spindle_load_pct !== undefined) {
        // Higher spindle load → proxy for wear rate increase
        z[0] = reading.sensors.spindle_load_pct * 0.0001; // scale to mm/min
        mask[0] = true;
      }
      if (reading.sensors.temperature_C !== undefined) {
        // Thermal drift ~ α·ΔT·L (CTE expansion)
        const deltaT = reading.sensors.temperature_C - 20; // reference 20°C
        const alpha = 11.7e-6; // steel CTE
        const typicalLength = 500; // mm
        const drift_um = alpha * deltaT * typicalLength * 1000;
        z[1] = drift_um * 0.8; z[2] = drift_um * 0.6; z[3] = drift_um * 1.2;
        mask[1] = mask[2] = mask[3] = true;
        twin.thermalDrift.temperature_C = reading.sensors.temperature_C;
      }
      if (reading.sensors.vibration_rms_g !== undefined) {
        // Vibration inversely correlates with spindle health
        // New spindle ~0.02g, worn ~0.5g
        const health = Math.max(0, Math.min(1, 1 - (reading.sensors.vibration_rms_g - 0.02) / 0.48));
        z[4] = health;
        mask[4] = true;
      }
      if (reading.sensors.axis_position_error_um !== undefined) {
        z[5] = reading.sensors.axis_position_error_um / 10; // normalize
        mask[5] = true;
      }

      // Kalman predict
      const pred = diagKalmanPredict(twin.kalmanState, twin.kalmanCovariance, Q);

      // Kalman update
      const upd = diagKalmanUpdate(pred.state, pred.cov, z, R, mask);
      twin.kalmanState = upd.state;
      twin.kalmanCovariance = upd.cov;

      // Update tool wear if tool info provided
      if (reading.toolState) {
        const tid = reading.toolState.toolId;
        const wearRate = Math.max(0, twin.kalmanState[0]);
        const existingWear = twin.toolWear[tid];
        const currentVb = existingWear
          ? existingWear.vb_mm + wearRate * 1.0 // increment by 1 min step
          : wearRate * reading.toolState.cuttingTime_min;
        twin.toolWear[tid] = {
          vb_mm: currentVb,
          vb_rate_mm_min: wearRate,
          confidence: Math.min(0.99, 1 - Math.sqrt(twin.kalmanCovariance[0])),
        };
      }

      twin.lastUpdated = reading.timestamp || Date.now();
    }

    // Update twin derived state
    twin.thermalDrift.x_um = twin.kalmanState[1];
    twin.thermalDrift.y_um = twin.kalmanState[2];
    twin.thermalDrift.z_um = twin.kalmanState[3];
    twin.spindle.bearingHealth = Math.max(0, Math.min(1, twin.kalmanState[4] || 1));
    twin.backlash.x_um = Math.max(0, 3 + twin.kalmanState[5] * 2);
    twin.backlash.y_um = Math.max(0, 3 + twin.kalmanState[5] * 2);
    twin.backlash.z_um = Math.max(0, 5 + twin.kalmanState[5] * 3);

    // Compute S/F correction factors from twin state
    const wearFactor = 1 - Math.min(0.3, Math.max(0, twin.kalmanState[0]) * 100);
    const thermalFactor = 1 - Math.abs(twin.thermalDrift.z_um) * 0.001;
    const healthFactor = Math.max(0.7, twin.spindle.bearingHealth);

    twin.sfCorrections = {
      speedFactor: Math.max(0.5, Math.min(1.2, healthFactor * thermalFactor)),
      feedFactor: Math.max(0.5, Math.min(1.1, wearFactor)),
      depthFactor: Math.max(0.5, Math.min(1.0, wearFactor * healthFactor)),
    };

    // Track state changes
    const trackChange = (field: string, oldVal: number, newVal: number) => {
      if (Math.abs(oldVal) < 1e-12 && Math.abs(newVal) < 1e-12) return;
      const pct = Math.abs(oldVal) > 1e-10 ? ((newVal - oldVal) / Math.abs(oldVal)) * 100 : 0;
      if (Math.abs(pct) > 1 || Math.abs(newVal - oldVal) > 0.01) {
        stateChanges.push({ field, oldValue: oldVal, newValue: newVal, changePercent: pct });
      }
    };
    trackChange("wearRate", oldWearRate, twin.kalmanState[0]);
    trackChange("thermalDriftZ", oldThermalZ, twin.kalmanState[3]);
    trackChange("spindleHealth", oldSpindleHealth, twin.kalmanState[4] || 1);
    trackChange("backlashDrift", oldBacklash, twin.kalmanState[5]);

    // Generate alerts
    if (twin.spindle.bearingHealth < 0.5) {
      alerts.push({ severity: "critical", message: `Spindle bearing health at ${(twin.spindle.bearingHealth * 100).toFixed(0)}% — schedule maintenance`, field: "spindleHealth" });
    } else if (twin.spindle.bearingHealth < 0.75) {
      alerts.push({ severity: "warning", message: `Spindle bearing health declining: ${(twin.spindle.bearingHealth * 100).toFixed(0)}%`, field: "spindleHealth" });
    }
    if (Math.abs(twin.thermalDrift.z_um) > 20) {
      alerts.push({ severity: "warning", message: `Thermal drift Z=${twin.thermalDrift.z_um.toFixed(1)}µm — consider thermal compensation`, field: "thermalDriftZ" });
    }
    for (const [tid, wear] of Object.entries(twin.toolWear)) {
      if (wear.vb_mm > 0.3) {
        alerts.push({ severity: "critical", message: `Tool ${tid} VB=${wear.vb_mm.toFixed(3)}mm exceeds 0.3mm limit`, field: `toolWear.${tid}` });
      }
    }

    if (twin.sfCorrections.speedFactor < 0.9) {
      recommendations.push(`Speed correction factor ${twin.sfCorrections.speedFactor.toFixed(2)} — reduce cutting speed by ${((1 - twin.sfCorrections.speedFactor) * 100).toFixed(0)}%`);
    }
    if (readings.length > 0) {
      recommendations.push(`Twin updated with ${readings.length} sensor readings. Kalman filter converging.`);
    }

    return {
      machineId,
      twinState: twin,
      stateChanges,
      alerts,
      sfCorrections: twin.sfCorrections,
      recommendations,
    };
  }

  // ========================================================================
  // 3. STRATEGY EFFECTIVENESS RANKING
  // ========================================================================

  /**
   * Rank CAM strategies by empirical performance for a given material + geometry.
   *
   * Uses Wilson score interval for win-rate confidence bounds, and
   * online sufficient statistics for continuous metrics (MRR, finish, life).
   *
   * Composite score = w_mrr·mrrFactor + w_finish·finishFactor + w_life·lifeFactor
   * with weights depending on optimizeFor target.
   */
  strategyRanking(input: StrategyRankingInput): StrategyRankingResult {
    const {
      materialGroup, geometryClass,
      optimizeFor = "balanced", minObservations = 3,
    } = input;

    // Filter records
    let filtered = this.strategyRecords;
    if (materialGroup) filtered = filtered.filter(r => r.materialGroup === materialGroup);
    if (geometryClass) filtered = filtered.filter(r => r.geometryClass === geometryClass);

    // Group by strategy
    const byStrategy = new Map<string, StrategyRecord[]>();
    for (const rec of filtered) {
      if (!byStrategy.has(rec.strategy)) byStrategy.set(rec.strategy, []);
      byStrategy.get(rec.strategy)!.push(rec);
    }

    // Optimization weights
    const weights: Record<string, { mrr: number; finish: number; life: number }> = {
      mrr: { mrr: 0.6, finish: 0.2, life: 0.2 },
      finish: { mrr: 0.15, finish: 0.6, life: 0.25 },
      tool_life: { mrr: 0.15, finish: 0.25, life: 0.6 },
      cost: { mrr: 0.3, finish: 0.2, life: 0.5 },
      balanced: { mrr: 0.33, finish: 0.34, life: 0.33 },
    };
    const w = weights[optimizeFor] || weights.balanced;

    // Compute per-strategy stats
    const rankings: StrategyPerformance[] = [];
    const allComposites: { strategy: string; score: number }[] = [];

    for (const [strategy, records] of byStrategy) {
      if (records.length < minObservations) continue;

      // Online stats for each metric
      let mrrStats: OnlineStats = { n: 0, mean: 0, m2: 0 };
      let finStats: OnlineStats = { n: 0, mean: 0, m2: 0 };
      let lifeStats: OnlineStats = { n: 0, mean: 0, m2: 0 };

      for (const rec of records) {
        mrrStats = welfordUpdate(mrrStats, rec.mrrFactor);
        finStats = welfordUpdate(finStats, rec.finishFactor);
        lifeStats = welfordUpdate(lifeStats, rec.lifeFactor);
      }

      const n = records.length;
      const z = 1.96;
      const mrrStd = Math.sqrt(welfordVariance(mrrStats));
      const finStd = Math.sqrt(welfordVariance(finStats));
      const lifeStd = Math.sqrt(welfordVariance(lifeStats));
      const sqrtN = Math.sqrt(n);

      const composite = w.mrr * mrrStats.mean + w.finish * finStats.mean + w.life * lifeStats.mean;
      allComposites.push({ strategy, score: composite });

      rankings.push({
        strategy,
        observations: n,
        mrrFactor: {
          mean: mrrStats.mean,
          ci95: [mrrStats.mean - z * mrrStd / sqrtN, mrrStats.mean + z * mrrStd / sqrtN],
        },
        finishFactor: {
          mean: finStats.mean,
          ci95: [finStats.mean - z * finStd / sqrtN, finStats.mean + z * finStd / sqrtN],
        },
        lifeFactor: {
          mean: lifeStats.mean,
          ci95: [lifeStats.mean - z * lifeStd / sqrtN, lifeStats.mean + z * lifeStd / sqrtN],
        },
        winRate: { rate: 0, ci95: [0, 1] }, // computed below
        compositeScore: composite,
        confidence: n < 10 ? "low" : n < 50 ? "medium" : "high",
      });
    }

    // Compute win rates (how often each strategy is best)
    if (allComposites.length > 0) {
      // Determine per-record winner
      const winCounts = new Map<string, number>();
      const totalRounds = filtered.length;
      for (const strat of byStrategy.keys()) winCounts.set(strat, 0);

      // For each timestamp bucket, find best strategy
      const timestamps = [...new Set(filtered.map(r => r.timestamp))].sort();
      for (const ts of timestamps) {
        const atTs = filtered.filter(r => r.timestamp === ts);
        let bestScore = -Infinity;
        let bestStrat = "";
        for (const rec of atTs) {
          const score = w.mrr * rec.mrrFactor + w.finish * rec.finishFactor + w.life * rec.lifeFactor;
          if (score > bestScore) { bestScore = score; bestStrat = rec.strategy; }
        }
        if (bestStrat) winCounts.set(bestStrat, (winCounts.get(bestStrat) || 0) + 1);
      }

      const totalContests = timestamps.length || 1;
      for (const rank of rankings) {
        const wins = winCounts.get(rank.strategy) || 0;
        rank.winRate = {
          rate: wins / totalContests,
          ci95: wilsonCI(wins, totalContests),
        };
      }
    }

    // Sort by composite score descending
    rankings.sort((a, b) => b.compositeScore - a.compositeScore);

    const recommendations: string[] = [];
    if (rankings.length > 0) {
      recommendations.push(`Best strategy: ${rankings[0].strategy} (score=${rankings[0].compositeScore.toFixed(3)}, ${rankings[0].observations} observations)`);
      if (rankings.length > 1 && rankings[0].compositeScore - rankings[1].compositeScore < 0.05) {
        recommendations.push(`Close race with ${rankings[1].strategy} — more data needed to differentiate`);
      }
    }
    if (filtered.length < 20) {
      recommendations.push("Limited data — rankings will improve with more observations");
    }

    return {
      rankings,
      materialGroup: materialGroup || "all",
      geometryClass: geometryClass || "all",
      optimizeFor,
      totalObservations: filtered.length,
      recommendation: rankings.length > 0
        ? `Use ${rankings[0].strategy} for ${materialGroup || "general"} ${geometryClass || ""} (${rankings[0].confidence} confidence)`
        : "Insufficient data for recommendation",
      recommendations,
    };
  }

  // ========================================================================
  // 4. ANOMALY-TRIGGERED RELEARNING
  // ========================================================================

  /**
   * Detect prediction divergence using Mahalanobis distance.
   *
   * For each observation, computes d_M = sqrt((x-μ)ᵀ·Σ⁻¹·(x-μ)) where x is the
   * vector of residuals (actual-predicted) and μ,Σ are the running mean/variance
   * of residuals for that machine.
   *
   * When d_M > threshold, flags as anomaly and diagnoses probable cause based on
   * which residual components dominate.
   */
  anomalyRelearn(input: AnomalyRelearnInput): AnomalyRelearnResult {
    const { observations, threshold = 3.0, autoRecalibrate = true } = input;
    const anomalies: DetectedAnomaly[] = [];
    const modelsAffected = new Set<string>();

    for (const obs of observations) {
      const rStats = this.getResidualStats(obs.machineId);

      // Build residual vector and expected distribution
      const residuals: number[] = [];
      const means: number[] = [];
      const variances: number[] = [];
      const fields: { field: string; actual: number; expected: number }[] = [];

      if (obs.actuals.force_N && obs.predicted?.force_N) {
        const resid = obs.actuals.force_N - obs.predicted.force_N;
        residuals.push(resid);
        means.push(rStats.force.mean);
        variances.push(Math.max(welfordVariance(rStats.force), 100)); // min variance
        fields.push({ field: "force_N", actual: obs.actuals.force_N, expected: obs.predicted.force_N });
      }
      if (obs.actuals.surface_finish_Ra_um && obs.predicted?.surface_finish_Ra_um) {
        const resid = obs.actuals.surface_finish_Ra_um - obs.predicted.surface_finish_Ra_um;
        residuals.push(resid);
        means.push(rStats.finish.mean);
        variances.push(Math.max(welfordVariance(rStats.finish), 0.01));
        fields.push({ field: "surface_finish_Ra_um", actual: obs.actuals.surface_finish_Ra_um, expected: obs.predicted.surface_finish_Ra_um });
      }
      if (obs.actuals.tool_life_min && obs.predicted?.tool_life_min) {
        const resid = obs.actuals.tool_life_min - obs.predicted.tool_life_min;
        residuals.push(resid);
        means.push(rStats.life.mean);
        variances.push(Math.max(welfordVariance(rStats.life), 1));
        fields.push({ field: "tool_life_min", actual: obs.actuals.tool_life_min, expected: obs.predicted.tool_life_min });
      }
      if (obs.actuals.dimension_error_um && obs.predicted?.dimension_error_um) {
        const resid = obs.actuals.dimension_error_um - obs.predicted.dimension_error_um;
        residuals.push(resid);
        means.push(rStats.dimension.mean);
        variances.push(Math.max(welfordVariance(rStats.dimension), 1));
        fields.push({ field: "dimension_error_um", actual: obs.actuals.dimension_error_um, expected: obs.predicted.dimension_error_um });
      }

      if (residuals.length === 0) continue;

      // Compute Mahalanobis distance
      const dM = mahalanobisDistance(residuals, means, variances);

      if (dM > threshold) {
        // Diagnose probable cause
        const deviatingFields: DetectedAnomaly["deviatingFields"] = [];
        for (let i = 0; i < residuals.length; i++) {
          const zScore = (residuals[i] - means[i]) / Math.sqrt(variances[i]);
          deviatingFields.push({
            field: fields[i].field,
            actual: fields[i].actual,
            expected: fields[i].expected,
            zScore,
          });
        }

        // Diagnosis heuristics
        let cause: DetectedAnomaly["probableCause"] = "unknown";
        const forceDeviation = deviatingFields.find(f => f.field === "force_N");
        const lifeDeviation = deviatingFields.find(f => f.field === "tool_life_min");
        const dimDeviation = deviatingFields.find(f => f.field === "dimension_error_um");
        const finishDeviation = deviatingFields.find(f => f.field === "surface_finish_Ra_um");

        if (forceDeviation && Math.abs(forceDeviation.zScore) > 4 && lifeDeviation && lifeDeviation.zScore < -2) {
          cause = "tool_breakage"; // sudden force spike + short life
        } else if (dimDeviation && Math.abs(dimDeviation.zScore) > 3 && forceDeviation && Math.abs(forceDeviation.zScore) < 2) {
          cause = "machine_degradation"; // dimension error without force change → backlash/thermal
        } else if (forceDeviation && Math.abs(forceDeviation.zScore) > 2 && !lifeDeviation) {
          cause = "material_batch"; // force different but no life data → material harder/softer
        } else if (finishDeviation && Math.abs(finishDeviation.zScore) > 3) {
          cause = "fixturing"; // finish anomaly → vibration from fixturing
        }

        const severity: DetectedAnomaly["severity"] =
          dM > threshold * 2 ? "severe" : dM > threshold * 1.5 ? "moderate" : "minor";

        anomalies.push({
          jobId: obs.jobId,
          machineId: obs.machineId,
          mahalanobisDistance: dM,
          deviatingFields,
          probableCause: cause,
          severity,
        });

        // Track affected models
        for (const df of deviatingFields) {
          if (df.field === "force_N") modelsAffected.add("kienzle");
          if (df.field === "tool_life_min") modelsAffected.add("taylor");
          if (df.field === "surface_finish_Ra_um") modelsAffected.add("finish");
          if (df.field === "dimension_error_um") modelsAffected.add("dimensional");
        }
      }

      // Update running statistics regardless (for future anomaly detection)
      if (obs.actuals.force_N && obs.predicted?.force_N) {
        rStats.force = welfordUpdate(rStats.force, obs.actuals.force_N - obs.predicted.force_N);
      }
      if (obs.actuals.surface_finish_Ra_um && obs.predicted?.surface_finish_Ra_um) {
        rStats.finish = welfordUpdate(rStats.finish,
          obs.actuals.surface_finish_Ra_um - obs.predicted.surface_finish_Ra_um);
      }
      if (obs.actuals.tool_life_min && obs.predicted?.tool_life_min) {
        rStats.life = welfordUpdate(rStats.life, obs.actuals.tool_life_min - obs.predicted.tool_life_min);
      }
      if (obs.actuals.dimension_error_um && obs.predicted?.dimension_error_um) {
        rStats.dimension = welfordUpdate(rStats.dimension,
          obs.actuals.dimension_error_um - obs.predicted.dimension_error_um);
      }
    }

    // Auto-recalibrate if anomalies found
    let recalibrated = false;
    if (autoRecalibrate && anomalies.length > 0) {
      // Re-run cutToLearn with the anomalous observations to update priors
      const anomalousObs = observations.filter(o =>
        anomalies.some(a => a.jobId === o.jobId)
      );
      if (anomalousObs.length > 0) {
        this.cutToLearn({ observations: anomalousObs });
        recalibrated = true;
      }
    }

    const recommendations: string[] = [];
    if (anomalies.length === 0) {
      recommendations.push("No anomalies detected — predictions are within expected bounds");
    } else {
      const severeCount = anomalies.filter(a => a.severity === "severe").length;
      if (severeCount > 0) {
        recommendations.push(`${severeCount} severe anomalies — inspect machine and tooling immediately`);
      }
      const causes = [...new Set(anomalies.map(a => a.probableCause))];
      for (const cause of causes) {
        switch (cause) {
          case "tool_breakage":
            recommendations.push("Tool breakage suspected — check tool condition and reduce cutting parameters");
            break;
          case "machine_degradation":
            recommendations.push("Machine degradation suspected — schedule maintenance and verify backlash/alignment");
            break;
          case "material_batch":
            recommendations.push("Material batch variation detected — verify material certification and hardness");
            break;
          case "fixturing":
            recommendations.push("Fixturing issue suspected — check clamping force and workholding rigidity");
            break;
        }
      }
      if (recalibrated) {
        recommendations.push(`Models recalibrated using ${anomalies.length} anomalous observations`);
      }
    }

    return {
      observationsChecked: observations.length,
      anomaliesDetected: anomalies,
      recalibrated,
      modelsAffected: [...modelsAffected],
      recommendations,
    };
  }

  // ========================================================================
  // 5. FLEET LEARNING
  // ========================================================================

  /**
   * Pool learning across machines using hierarchical Bayesian shrinkage.
   *
   * Hierarchical model:
   *   θᵢ | μ, τ² ~ N(μ, τ²)        (machine-level prior)
   *   xᵢⱼ | θᵢ, σ² ~ N(θᵢ, σ²)    (within-machine observations)
   *   μ ~ N(μ₀, σ₀²)               (fleet-level hyperprior)
   *
   * Shrinkage estimator:
   *   θ̂ᵢ = wᵢ·x̄ᵢ + (1−wᵢ)·μ̂_fleet
   *   wᵢ = τ² / (τ² + σ²/nᵢ)
   *
   * where τ² = between-machine variance, σ² = within-machine variance.
   * This pulls machines with few observations toward the fleet mean (regularization).
   */
  fleetLearn(input: FleetLearnInput): FleetLearnResult {
    const { machineIds, newMachineId, shrinkage: shrinkageOverride } = input;

    // Collect all machine IDs to include
    const allIds = machineIds || [...this.machineObservations.keys()];
    if (allIds.length === 0) {
      return {
        machineCount: 0,
        totalObservations: 0,
        recommendations: ["No machine data available. Use cut_to_learn to ingest observations first."],
      };
    }

    let totalObs = 0;
    const recommendations: string[] = [];

    // Compute per-machine means for Kienzle kc1.1 by material group
    const kienzleFleet: Record<string, FleetEstimate> = {};
    const taylorFleet: Record<string, FleetEstimate> = {};
    const finishFleet: Record<string, FleetEstimate> = {};

    // Group observations by material
    const materialGroups = new Set<string>();
    for (const mid of allIds) {
      const obs = this.machineObservations.get(mid) || [];
      totalObs += obs.length;
      for (const o of obs) materialGroups.add(o.materialGroup);
    }

    for (const matGroup of materialGroups) {
      // Collect per-machine statistics for kc1.1
      const machineKc11: { machineId: string; observations: number[]; mean: number; n: number }[] = [];
      const machineTaylorC: { machineId: string; observations: number[]; mean: number; n: number }[] = [];
      const machineFinishBias: { machineId: string; observations: number[]; mean: number; n: number }[] = [];

      for (const mid of allIds) {
        const obs = (this.machineObservations.get(mid) || [])
          .filter(o => o.materialGroup === matGroup);
        if (obs.length === 0) continue;

        // Extract kc1.1 observations
        const priors = this.getPriors(matGroup);
        const kc11Obs: number[] = [];
        const taylorCObs: number[] = [];
        const finishBiasObs: number[] = [];

        for (const o of obs) {
          if (o.actuals.force_N && o.cuttingParams.feed_mmtooth > 0 && o.cuttingParams.axial_depth_mm > 0) {
            const h = o.cuttingParams.feed_mmtooth;
            const b = o.cuttingParams.axial_depth_mm;
            const mc = priors.mc.mu;
            kc11Obs.push(o.actuals.force_N / (b * Math.pow(h, 1 - mc)));
          }
          if (o.actuals.tool_life_min && o.actuals.tool_life_min > 0 && o.cuttingParams.speed_mpm > 0) {
            taylorCObs.push(o.cuttingParams.speed_mpm * Math.pow(o.actuals.tool_life_min, priors.taylorN.mu));
          }
          if (o.actuals.surface_finish_Ra_um && o.predicted?.surface_finish_Ra_um) {
            finishBiasObs.push(o.actuals.surface_finish_Ra_um - o.predicted.surface_finish_Ra_um);
          }
        }

        if (kc11Obs.length > 0) {
          machineKc11.push({
            machineId: mid,
            observations: kc11Obs,
            mean: kc11Obs.reduce((a, b) => a + b, 0) / kc11Obs.length,
            n: kc11Obs.length,
          });
        }
        if (taylorCObs.length > 0) {
          machineTaylorC.push({
            machineId: mid,
            observations: taylorCObs,
            mean: taylorCObs.reduce((a, b) => a + b, 0) / taylorCObs.length,
            n: taylorCObs.length,
          });
        }
        if (finishBiasObs.length > 0) {
          machineFinishBias.push({
            machineId: mid,
            observations: finishBiasObs,
            mean: finishBiasObs.reduce((a, b) => a + b, 0) / finishBiasObs.length,
            n: finishBiasObs.length,
          });
        }
      }

      // Hierarchical shrinkage for kc1.1
      if (machineKc11.length >= 2) {
        kienzleFleet[matGroup] = this.hierarchicalShrinkage(machineKc11, shrinkageOverride);
      }
      if (machineTaylorC.length >= 2) {
        taylorFleet[matGroup] = this.hierarchicalShrinkage(machineTaylorC, shrinkageOverride);
      }
      if (machineFinishBias.length >= 2) {
        finishFleet[matGroup] = this.hierarchicalShrinkage(machineFinishBias, shrinkageOverride);
      }
    }

    // Bootstrap new machine from fleet priors
    let newMachineBootstrap: FleetLearnResult["newMachineBootstrap"];
    if (newMachineId) {
      const priors: Record<string, { mean: number; stdDev: number; source: string }> = {};
      for (const matGroup of materialGroups) {
        if (kienzleFleet[matGroup]) {
          priors[`${matGroup}_kc11`] = {
            mean: kienzleFleet[matGroup].fleetMean,
            stdDev: kienzleFleet[matGroup].fleetStdDev,
            source: `fleet (${kienzleFleet[matGroup].machineEstimates ? Object.keys(kienzleFleet[matGroup].machineEstimates).length : 0} machines)`,
          };
        }
        if (taylorFleet[matGroup]) {
          priors[`${matGroup}_taylorC`] = {
            mean: taylorFleet[matGroup].fleetMean,
            stdDev: taylorFleet[matGroup].fleetStdDev,
            source: `fleet (${Object.keys(taylorFleet[matGroup].machineEstimates).length} machines)`,
          };
        }
      }

      // Initialize the new machine's priors from fleet
      for (const matGroup of materialGroups) {
        const mp = this.getPriors(matGroup);
        if (kienzleFleet[matGroup]) {
          mp.kc11.mu = kienzleFleet[matGroup].fleetMean;
          mp.kc11.sigma2 = kienzleFleet[matGroup].fleetStdDev ** 2;
        }
        if (taylorFleet[matGroup]) {
          mp.taylorC.mu = taylorFleet[matGroup].fleetMean;
          mp.taylorC.sigma2 = taylorFleet[matGroup].fleetStdDev ** 2;
        }
      }

      newMachineBootstrap = { machineId: newMachineId, priors };
      recommendations.push(`New machine ${newMachineId} bootstrapped with fleet priors from ${allIds.length} machines`);
    }

    if (allIds.length >= 3) {
      recommendations.push(`Fleet of ${allIds.length} machines — hierarchical shrinkage active, stabilizing estimates for low-data machines`);
    }
    if (totalObs > 100) {
      recommendations.push("Strong fleet data — consider using fleet priors for new machine commissioning");
    }

    return {
      machineCount: allIds.length,
      totalObservations: totalObs,
      kienzleFleet: Object.keys(kienzleFleet).length > 0 ? kienzleFleet : undefined,
      taylorFleet: Object.keys(taylorFleet).length > 0 ? taylorFleet : undefined,
      finishFleet: Object.keys(finishFleet).length > 0 ? finishFleet : undefined,
      newMachineBootstrap,
      recommendations,
    };
  }

  /**
   * Hierarchical Bayesian shrinkage estimator.
   *
   * θ̂ᵢ = wᵢ·x̄ᵢ + (1−wᵢ)·μ̂_fleet
   * wᵢ = τ² / (τ² + σ²/nᵢ)
   *
   * τ² estimated via method of moments: τ² = max(0, S²_between - σ²_pooled/n̄)
   */
  private hierarchicalShrinkage(
    machines: { machineId: string; observations: number[]; mean: number; n: number }[],
    shrinkageOverride?: number,
  ): FleetEstimate {
    const K = machines.length;
    if (K === 0) {
      return {
        fleetMean: 0, fleetStdDev: 0,
        machineEstimates: {},
        betweenMachineVariance: 0,
        withinMachineVariance: 0,
      };
    }

    // Fleet (grand) mean — weighted by observation count
    const totalN = machines.reduce((s, m) => s + m.n, 0);
    const fleetMean = machines.reduce((s, m) => s + m.mean * m.n, 0) / Math.max(totalN, 1);

    // Within-machine variance (pooled)
    let withinSS = 0;
    let withinDF = 0;
    for (const m of machines) {
      for (const x of m.observations) {
        withinSS += (x - m.mean) ** 2;
      }
      withinDF += m.n - 1;
    }
    const sigma2_within = withinDF > 0 ? withinSS / withinDF : 1;

    // Between-machine variance (method of moments)
    let betweenSS = 0;
    for (const m of machines) {
      betweenSS += m.n * (m.mean - fleetMean) ** 2;
    }
    const nBar = totalN / K;
    const tau2_raw = (betweenSS / Math.max(K - 1, 1) - sigma2_within) / Math.max(nBar, 1);
    const tau2 = Math.max(0, tau2_raw); // can't be negative

    // Shrinkage estimates
    const machineEstimates: Record<string, { raw: number; shrunk: number; weight: number; nObs: number }> = {};
    for (const m of machines) {
      const wi = shrinkageOverride !== undefined
        ? shrinkageOverride
        : tau2 / Math.max(tau2 + sigma2_within / Math.max(m.n, 1), 1e-20);
      const shrunk = wi * m.mean + (1 - wi) * fleetMean;
      machineEstimates[m.machineId] = {
        raw: m.mean,
        shrunk,
        weight: wi,
        nObs: m.n,
      };
    }

    const fleetStdDev = Math.sqrt(tau2 + sigma2_within / Math.max(totalN, 1));

    return {
      fleetMean,
      fleetStdDev,
      machineEstimates,
      betweenMachineVariance: tau2,
      withinMachineVariance: sigma2_within,
    };
  }

  // ========================================================================
  // UTILITY: Export / Import / Reset
  // ========================================================================

  /** Export all learning state for persistence */
  exportState(): {
    materialPriors: Record<string, MaterialPriors>;
    twinStates: Record<string, MachineTwinState>;
    strategyRecords: StrategyRecord[];
    residualStats: Record<string, Record<string, OnlineStats>>;
    machineObservations: Record<string, MachiningObservation[]>;
  } {
    return {
      materialPriors: Object.fromEntries(this.materialPriors),
      twinStates: Object.fromEntries(this.twinStates),
      strategyRecords: [...this.strategyRecords],
      residualStats: Object.fromEntries(
        [...this.residualStats].map(([k, v]) => [k, { ...v }])
      ),
      machineObservations: Object.fromEntries(
        [...this.machineObservations].map(([k, v]) => [k, [...v]])
      ),
    };
  }

  /** Import previously exported state */
  importState(state: ReturnType<SelfLearningCAMEngine["exportState"]>): void {
    if (state.materialPriors) {
      this.materialPriors = new Map(Object.entries(state.materialPriors));
    }
    if (state.twinStates) {
      this.twinStates = new Map(Object.entries(state.twinStates));
    }
    if (state.strategyRecords) {
      this.strategyRecords = [...state.strategyRecords];
    }
    if (state.residualStats) {
      this.residualStats = new Map(
        Object.entries(state.residualStats).map(([k, v]) => [k, { ...v } as Record<string, OnlineStats>])
      );
    }
    if (state.machineObservations) {
      this.machineObservations = new Map(
        Object.entries(state.machineObservations).map(([k, v]) => [k, [...v]])
      );
    }
  }

  /** Reset all learning state (fresh start) */
  reset(): void {
    this.materialPriors.clear();
    this.twinStates.clear();
    this.strategyRecords = [];
    this.residualStats.clear();
    this.machineObservations.clear();
    for (const group of ["P", "M", "K", "N", "S", "H"]) {
      this.initMaterialPriors(group);
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance */
export const selfLearningCAMEngine = new SelfLearningCAMEngine();
export { SelfLearningCAMEngine };
