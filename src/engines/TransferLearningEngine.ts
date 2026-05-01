/**
 * TransferLearningEngine — Cross-machine model transfer for cutting parameters
 *
 * Enables transferring optimized cutting parameters from a source machine to a
 * target machine using physics-informed scaling, Gaussian Process transfer,
 * material-based adaptation, and Bayesian updating with safety validation.
 *
 * Methods:
 *   - machineSimilarity: Weighted cosine similarity between machine feature vectors
 *   - scaleParameters: Physics-informed parameter scaling (power/rigidity/RPM limited)
 *   - gpTransfer: Gaussian Process model transfer with negative transfer detection
 *   - materialTransfer: Cross-material cutting data transfer via machinability index
 *   - bayesianUpdate: Conjugate Gaussian sequential updating with model evidence
 *   - validateTransfer: Safety validation against machine limits
 *
 * References:
 *   Pan & Yang (2010) "A Survey on Transfer Learning" IEEE TKDE,
 *   Rasmussen & Williams (2006) "Gaussian Processes for Machine Learning",
 *   Altintas "Manufacturing Automation" (power/torque limits),
 *   Kienzle & Victor (1957) specific cutting force model
 *
 * @module TransferLearningEngine
 */

// ─── Types ─────────────────────────────────────────────────────────

/** Standard PRISM return wrapper with generic payload. */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

/** Machine profile for similarity and scaling computations. */
export interface MachineProfile {
  name: string;
  /** Spindle power in kW */
  power_kw: number;
  /** Maximum spindle RPM */
  max_rpm: number;
  /** Static rigidity in N/μm */
  rigidity_n_per_um: number;
  /** Positioning accuracy in mm */
  accuracy_mm: number;
  /** Number of CNC axes */
  axes: number;
  /** Maximum feed rate in mm/min */
  max_feed_mmmin?: number;
  /** Maximum torque in Nm */
  max_torque_nm?: number;
  /** Spindle taper (e.g. BT40, HSK-A63) */
  taper?: string;
}

/** Cutting parameters for transfer. */
export interface CuttingParams {
  /** Cutting speed m/min */
  Vc: number;
  /** Feed per tooth mm */
  fz: number;
  /** Axial depth of cut mm */
  ap: number;
  /** Radial depth of cut mm */
  ae: number;
  /** Tool diameter mm */
  tool_diameter_mm?: number;
  /** Number of flutes */
  flute_count?: number;
}

/** Input for machineSimilarity. */
export interface MachineSimilarityInput {
  source: MachineProfile;
  target: MachineProfile;
  /** Optional custom weights; defaults to rigidity=0.3, power=0.2, accuracy=0.2, rpm=0.15, axes=0.15 */
  weights?: Partial<Record<'rigidity' | 'power' | 'accuracy' | 'rpm' | 'axes', number>>;
}

/** Risk factor identified in machine comparison. */
export interface RiskFactor {
  attribute: string;
  source_value: number;
  target_value: number;
  ratio: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

/** Result of machineSimilarity. */
export interface MachineSimilarityResult {
  similarity_score: number;
  transfer_confidence: number;
  risk_factors: RiskFactor[];
  feature_contributions: Record<string, number>;
}

/** Input for scaleParameters. */
export interface ScaleParametersInput {
  source_params: CuttingParams;
  source_machine: MachineProfile;
  target_machine: MachineProfile;
  /** Specific cutting force in N/mm² (default 2000 for steel) */
  kc_n_per_mm2?: number;
}

/** Result of scaleParameters. */
export interface ScaleParametersResult {
  scaled_params: CuttingParams;
  limiting_factor: 'power' | 'rigidity' | 'rpm' | 'none';
  scale_ratios: { power: number; rigidity: number; rpm: number };
  confidence: number;
}

/** A single GP training observation. */
export interface GPObservation {
  x: number[];
  y: number;
}

/** Input for gpTransfer. */
export interface GPTransferInput {
  source_data: GPObservation[];
  target_data: GPObservation[];
  /** RBF length scale (default 1.0) */
  length_scale?: number;
  /** Observation noise variance (default 0.01) */
  noise_var?: number;
  /** Prediction points */
  x_predict: number[][];
}

/** GP prediction point. */
export interface GPPrediction {
  x: number[];
  y_mean: number;
  y_std: number;
}

/** Result of gpTransfer. */
export interface GPTransferResult {
  predictions: GPPrediction[];
  transfer_gain_pct: number;
  negative_transfer: boolean;
  source_rmse: number;
  target_rmse: number;
}

/** Material entry for cross-material transfer. */
export interface MaterialEntry {
  name: string;
  /** Brinell hardness */
  hardness_hb: number;
  /** Machinability index (AISI 1212 = 1.0) */
  machinability_index: number;
  /** Specific cutting force N/mm² */
  kc1_1: number;
  /** Yield strength MPa */
  sigma_y: number;
  /** Thermal conductivity W/mK */
  thermal_conductivity?: number;
}

/** Input for materialTransfer. */
export interface MaterialTransferInput {
  source_material: string;
  target_material: string;
  source_speed_mmin: number;
  source_tool_life_min?: number;
  /** Custom material DB override */
  custom_materials?: MaterialEntry[];
}

/** Result of materialTransfer. */
export interface MaterialTransferResult {
  scaled_speed: number;
  scaled_life: number;
  similarity_score: number;
  hardness_ratio: number;
  mi_ratio: number;
  source_material: MaterialEntry;
  target_material: MaterialEntry;
}

/** Input for bayesianUpdate. */
export interface BayesianUpdateInput {
  /** Prior mean */
  prior_mean: number;
  /** Prior standard deviation */
  prior_std: number;
  /** Observed data points */
  observations: number[];
  /** Known measurement noise std (default: estimated from data) */
  noise_std?: number;
}

/** Result of bayesianUpdate. */
export interface BayesianUpdateResult {
  posterior_mean: number;
  posterior_std: number;
  credible_interval_95: [number, number];
  convergence_metric: number;
  log_evidence: number;
  update_steps: Array<{ step: number; mean: number; std: number }>;
}

/** Input for validateTransfer. */
export interface ValidateTransferInput {
  scaled_params: CuttingParams;
  target_machine: MachineProfile;
  /** Specific cutting force N/mm² */
  kc_n_per_mm2?: number;
  /** Tool diameter mm (for deflection check) */
  tool_diameter_mm?: number;
  /** Tool stickout mm */
  tool_stickout_mm?: number;
  /** Deflection limit mm (default 0.05) */
  deflection_limit_mm?: number;
}

/** A single safety check result. */
export interface SafetyCheck {
  parameter: string;
  value: number;
  limit: number;
  unit: string;
  passed: boolean;
  margin_pct: number;
}

/** Result of validateTransfer. */
export interface ValidateTransferResult {
  safe: boolean;
  checks: SafetyCheck[];
  adjustments_needed: string[];
  overall_margin_pct: number;
}

// ─── Internal Material Database ────────────────────────────────────

const MATERIAL_DB: MaterialEntry[] = [
  {
    name: 'AISI 1045', hardness_hb: 200, machinability_index: 0.55,
    kc1_1: 2100, sigma_y: 530, thermal_conductivity: 49.8,
  },
  {
    name: 'AISI 1212', hardness_hb: 160, machinability_index: 1.00,
    kc1_1: 1700, sigma_y: 340, thermal_conductivity: 51.9,
  },
  {
    name: 'AISI 4140', hardness_hb: 235, machinability_index: 0.45,
    kc1_1: 2200, sigma_y: 655, thermal_conductivity: 42.7,
  },
  {
    name: 'AISI 304', hardness_hb: 190, machinability_index: 0.36,
    kc1_1: 2500, sigma_y: 215, thermal_conductivity: 16.2,
  },
  {
    name: 'AISI 316', hardness_hb: 217, machinability_index: 0.32,
    kc1_1: 2600, sigma_y: 205, thermal_conductivity: 16.3,
  },
  {
    name: 'Ti-6Al-4V', hardness_hb: 334, machinability_index: 0.22,
    kc1_1: 1800, sigma_y: 880, thermal_conductivity: 6.7,
  },
  {
    name: 'Inconel 718', hardness_hb: 360, machinability_index: 0.12,
    kc1_1: 3000, sigma_y: 1035, thermal_conductivity: 11.4,
  },
  {
    name: 'Al 6061-T6', hardness_hb: 95, machinability_index: 1.80,
    kc1_1: 800, sigma_y: 276, thermal_conductivity: 167,
  },
  {
    name: 'Al 7075-T6', hardness_hb: 150, machinability_index: 1.40,
    kc1_1: 900, sigma_y: 503, thermal_conductivity: 130,
  },
  {
    name: 'C360 Brass', hardness_hb: 120, machinability_index: 2.00,
    kc1_1: 700, sigma_y: 310, thermal_conductivity: 115,
  },
  {
    name: 'Gray Cast Iron', hardness_hb: 220, machinability_index: 0.65,
    kc1_1: 1200, sigma_y: 250, thermal_conductivity: 46,
  },
  {
    name: 'Ductile Iron', hardness_hb: 250, machinability_index: 0.50,
    kc1_1: 1500, sigma_y: 400, thermal_conductivity: 36,
  },
];

// ─── Engine ────────────────────────────────────────────────────────

/**
 * TransferLearningEngine — Cross-machine model transfer for cutting parameters.
 *
 * Provides physics-informed methods for adapting optimized cutting data from
 * one machine/material context to another, with Gaussian Process transfer,
 * Bayesian updating, and comprehensive safety validation.
 *
 * @example
 * ```ts
 * const result = transferLearningEngine.machineSimilarity({
 *   source: { name: 'DMG MORI DMU 50', power_kw: 25, max_rpm: 20000, rigidity_n_per_um: 30, accuracy_mm: 0.005, axes: 5 },
 *   target: { name: 'Haas VF-2', power_kw: 22, max_rpm: 8100, rigidity_n_per_um: 20, accuracy_mm: 0.01, axes: 3 },
 * });
 * ```
 */
export class TransferLearningEngine {

  // ─── 1. Machine Similarity ─────────────────────────────────────

  /**
   * Quantify similarity between two machines using weighted cosine similarity
   * on normalized feature vectors.
   *
   * Feature weights (default): rigidity 0.3, power 0.2, accuracy 0.2, rpm 0.15, axes 0.15.
   * Cosine similarity: cos(θ) = (A·B) / (‖A‖·‖B‖).
   * Transfer confidence derived from similarity with risk-factor penalties.
   *
   * @param input - Source and target machine profiles with optional weight overrides
   * @returns Similarity score [0,1], transfer confidence, risk factors
   */
  machineSimilarity(input: MachineSimilarityInput): AtomicValue<MachineSimilarityResult> {
    const defaultWeights = { rigidity: 0.3, power: 0.2, accuracy: 0.2, rpm: 0.15, axes: 0.15 };
    const w = { ...defaultWeights, ...input.weights };
    const wSum = w.rigidity + w.power + w.accuracy + w.rpm + w.axes;

    // Normalize weights
    const nw = {
      rigidity: w.rigidity / wSum,
      power: w.power / wSum,
      accuracy: w.accuracy / wSum,
      rpm: w.rpm / wSum,
      axes: w.axes / wSum,
    };

    const s = input.source;
    const t = input.target;

    // Build weighted feature vectors (normalize each attribute to [0,1]-ish via ratio)
    // Use reference maxima for normalization
    const refMax = {
      rigidity: Math.max(s.rigidity_n_per_um, t.rigidity_n_per_um, 1),
      power: Math.max(s.power_kw, t.power_kw, 1),
      accuracy: Math.max(s.accuracy_mm, t.accuracy_mm, 0.001),
      rpm: Math.max(s.max_rpm, t.max_rpm, 1),
      axes: Math.max(s.axes, t.axes, 1),
    };

    const vecS = [
      nw.rigidity * (s.rigidity_n_per_um / refMax.rigidity),
      nw.power * (s.power_kw / refMax.power),
      nw.accuracy * (1 - s.accuracy_mm / refMax.accuracy), // invert: lower is better
      nw.rpm * (s.max_rpm / refMax.rpm),
      nw.axes * (s.axes / refMax.axes),
    ];

    const vecT = [
      nw.rigidity * (t.rigidity_n_per_um / refMax.rigidity),
      nw.power * (t.power_kw / refMax.power),
      nw.accuracy * (1 - t.accuracy_mm / refMax.accuracy),
      nw.rpm * (t.max_rpm / refMax.rpm),
      nw.axes * (t.axes / refMax.axes),
    ];

    const dot = vecS.reduce((acc, v, i) => acc + v * vecT[i], 0);
    const magS = Math.sqrt(vecS.reduce((acc, v) => acc + v * v, 0));
    const magT = Math.sqrt(vecT.reduce((acc, v) => acc + v * v, 0));
    const similarity = magS > 0 && magT > 0 ? dot / (magS * magT) : 0;

    // Risk factors
    const riskFactors: RiskFactor[] = [];
    const contributions: Record<string, number> = {};

    const attrs: Array<{ key: string; sv: number; tv: number; weight: number; invert?: boolean }> = [
      { key: 'rigidity', sv: s.rigidity_n_per_um, tv: t.rigidity_n_per_um, weight: nw.rigidity },
      { key: 'power', sv: s.power_kw, tv: t.power_kw, weight: nw.power },
      { key: 'accuracy', sv: s.accuracy_mm, tv: t.accuracy_mm, weight: nw.accuracy, invert: true },
      { key: 'rpm', sv: s.max_rpm, tv: t.max_rpm, weight: nw.rpm },
      { key: 'axes', sv: s.axes, tv: t.axes, weight: nw.axes },
    ];

    for (const a of attrs) {
      const ratio = a.sv > 0 ? a.tv / a.sv : 0;
      contributions[a.key] = a.weight * Math.min(ratio, 1 / (ratio || 1));

      // Identify risks where target is significantly weaker
      const effectiveRatio = a.invert ? a.sv / (a.tv || 0.001) : ratio;
      if (effectiveRatio < 0.5) {
        riskFactors.push({
          attribute: a.key,
          source_value: a.sv,
          target_value: a.tv,
          ratio: effectiveRatio,
          severity: effectiveRatio < 0.25 ? 'high' : 'medium',
          description: `Target ${a.key} is ` +
            `${(effectiveRatio * 100).toFixed(0)}% of source — significant gap`,
        });
      } else if (effectiveRatio < 0.75) {
        riskFactors.push({
          attribute: a.key,
          source_value: a.sv,
          target_value: a.tv,
          ratio: effectiveRatio,
          severity: 'low',
          description: `Target ${a.key} is ` +
            `${(effectiveRatio * 100).toFixed(0)}% of source — moderate gap`,
        });
      }
    }

    // Transfer confidence: similarity penalized by high-severity risks
    const highRisks = riskFactors.filter(r => r.severity === 'high').length;
    const medRisks = riskFactors.filter(r => r.severity === 'medium').length;
    const penalty = highRisks * 0.2 + medRisks * 0.1;
    const transferConfidence = Math.max(0, Math.min(1, similarity - penalty));

    return {
      value: {
        similarity_score: parseFloat(similarity.toFixed(6)),
        transfer_confidence: parseFloat(transferConfidence.toFixed(4)),
        risk_factors: riskFactors,
        feature_contributions: contributions,
      },
      unit: 'dimensionless',
      formula: 'cos(θ) = (A·B)/(‖A‖·‖B‖), weighted feature vectors',
      confidence: transferConfidence,
    };
  }

  // ─── 2. Scale Parameters ───────────────────────────────────────

  /**
   * Physics-informed parameter scaling from source to target machine.
   *
   * Applies three independent scaling limits:
   *   - Power: P = kc·ap·ae·Vc·fz·z·n / (60×10⁶) ≤ P_max → scale by power ratio
   *   - Rigidity: Force ∝ kc·ap·fz → scale depth/feed by rigidity ratio
   *   - RPM: n = 1000·Vc/(π·D) ≤ n_max → cap Vc to RPM limit
   *
   * The most restrictive limit governs the final scaled parameters.
   *
   * @param input - Source parameters + source/target machine profiles
   * @returns Scaled parameters with limiting factor and confidence
   */
  scaleParameters(input: ScaleParametersInput): AtomicValue<ScaleParametersResult> {
    const { source_params: sp, source_machine: sm, target_machine: tm } = input;
    const kc = input.kc_n_per_mm2 ?? 2000;

    // Power ratio scaling
    const powerRatio = tm.power_kw / sm.power_kw;

    // Rigidity ratio scaling
    const rigidityRatio = tm.rigidity_n_per_um / sm.rigidity_n_per_um;

    // RPM-limited Vc
    const toolD = sp.tool_diameter_mm ?? 10;
    const maxVcByRpm = (Math.PI * toolD * tm.max_rpm) / 1000;
    const rpmRatio = maxVcByRpm / sp.Vc;

    // Determine limiting factor
    const ratios = { power: powerRatio, rigidity: rigidityRatio, rpm: rpmRatio };
    let limitingFactor: 'power' | 'rigidity' | 'rpm' | 'none' = 'none';
    let limitingRatio = 1.0;

    if (powerRatio < 1 || rigidityRatio < 1 || rpmRatio < 1) {
      const minKey = (Object.keys(ratios) as Array<'power' | 'rigidity' | 'rpm'>)
        .reduce((a, b) => ratios[a] < ratios[b] ? a : b);
      limitingFactor = minKey;
      limitingRatio = Math.min(ratios[minKey], 1.0);
    }

    // Scale parameters based on limiting factor
    let scaledVc = sp.Vc;
    let scaledFz = sp.fz;
    let scaledAp = sp.ap;
    let scaledAe = sp.ae;

    if (limitingFactor === 'power') {
      // Reduce MRR by power ratio: scale Vc first, then ap if needed
      // MRR ∝ Vc·ap·ae·fz, Power ∝ kc·MRR
      const mrrScale = powerRatio;
      // Distribute reduction: 50% Vc, 25% ap, 25% fz
      scaledVc = sp.Vc * Math.pow(mrrScale, 0.5);
      scaledAp = sp.ap * Math.pow(mrrScale, 0.25);
      scaledFz = sp.fz * Math.pow(mrrScale, 0.25);
    } else if (limitingFactor === 'rigidity') {
      // Reduce cutting force: F ∝ kc·ap·fz → scale ap and fz
      const forceScale = rigidityRatio;
      scaledAp = sp.ap * Math.pow(forceScale, 0.6);
      scaledFz = sp.fz * Math.pow(forceScale, 0.4);
    } else if (limitingFactor === 'rpm') {
      // Cap Vc to max achievable
      scaledVc = Math.min(sp.Vc, maxVcByRpm);
    }

    // Also cap Vc by RPM regardless
    scaledVc = Math.min(scaledVc, maxVcByRpm);

    // Cap feed rate if target has max_feed limit
    if (tm.max_feed_mmmin) {
      const n = (1000 * scaledVc) / (Math.PI * toolD);
      const z = sp.flute_count ?? 4;
      const feedRate = scaledFz * z * n;
      if (feedRate > tm.max_feed_mmmin) {
        scaledFz = tm.max_feed_mmmin / (z * n);
      }
    }

    const confidence = limitingFactor === 'none' ? 0.95 :
      limitingRatio > 0.8 ? 0.85 :
      limitingRatio > 0.5 ? 0.7 : 0.5;

    return {
      value: {
        scaled_params: {
          Vc: parseFloat(scaledVc.toFixed(2)),
          fz: parseFloat(scaledFz.toFixed(4)),
          ap: parseFloat(scaledAp.toFixed(3)),
          ae: parseFloat(scaledAe.toFixed(3)),
          tool_diameter_mm: sp.tool_diameter_mm,
          flute_count: sp.flute_count,
        },
        limiting_factor: limitingFactor,
        scale_ratios: {
          power: parseFloat(powerRatio.toFixed(4)),
          rigidity: parseFloat(rigidityRatio.toFixed(4)),
          rpm: parseFloat(rpmRatio.toFixed(4)),
        },
        confidence,
      },
      unit: 'mixed (m/min, mm, mm/tooth)',
      formula: 'P=kc·ap·ae·Vc·fz·z·n/(60e6); F∝kc·ap·fz; n=1000Vc/(πD)',
      confidence,
    };
  }

  // ─── 3. Gaussian Process Transfer ──────────────────────────────

  /**
   * Gaussian Process model transfer from source to target domain.
   *
   * Fits GP on source data: μ(x*) = K(x*,X)·(K(X,X)+σ²I)⁻¹·y.
   * Uses source GP mean as prior for target GP, detecting negative transfer
   * when target-only GP outperforms the transfer GP.
   *
   * Self-contained Cholesky decomposition for matrix inversion (no external libs).
   *
   * Kernel: RBF k(x,x') = exp(-‖x-x'‖² / (2·l²))
   *
   * @param input - Source/target data, kernel hyperparameters, prediction points
   * @returns Predictions with transfer gain percentage and negative transfer flag
   */
  gpTransfer(input: GPTransferInput): AtomicValue<GPTransferResult> {
    const ls = input.length_scale ?? 1.0;
    const noiseVar = input.noise_var ?? 0.01;

    /** RBF kernel between two points */
    const rbf = (a: number[], b: number[]): number => {
      let sq = 0;
      for (let i = 0; i < a.length; i++) {
        const d = a[i] - (b[i] ?? 0);
        sq += d * d;
      }
      return Math.exp(-sq / (2 * ls * ls));
    };

    /** Build kernel matrix */
    const kernelMatrix = (X1: number[][], X2: number[][]): number[][] => {
      const n1 = X1.length;
      const n2 = X2.length;
      const K: number[][] = Array.from({ length: n1 }, () => new Array(n2).fill(0));
      for (let i = 0; i < n1; i++) {
        for (let j = 0; j < n2; j++) {
          K[i][j] = rbf(X1[i], X2[j]);
        }
      }
      return K;
    };

    /** Cholesky decomposition: A = L·L^T, returns L (lower triangular) */
    const cholesky = (A: number[][]): number[][] => {
      const n = A.length;
      const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
      for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
          let sum = 0;
          for (let k = 0; k < j; k++) {
            sum += L[i][k] * L[j][k];
          }
          if (i === j) {
            const diag = A[i][i] - sum;
            L[i][j] = Math.sqrt(Math.max(diag, 1e-10));
          } else {
            L[i][j] = (A[i][j] - sum) / (L[j][j] || 1e-10);
          }
        }
      }
      return L;
    };

    /** Solve L·x = b via forward substitution */
    const forwardSolve = (L: number[][], b: number[]): number[] => {
      const n = b.length;
      const x = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < i; j++) sum += L[i][j] * x[j];
        x[i] = (b[i] - sum) / (L[i][i] || 1e-10);
      }
      return x;
    };

    /** Solve L^T·x = b via back substitution */
    const backSolve = (L: number[][], b: number[]): number[] => {
      const n = b.length;
      const x = new Array(n).fill(0);
      for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) sum += L[j][i] * x[j];
        x[i] = (b[i] - sum) / (L[i][i] || 1e-10);
      }
      return x;
    };

    /** Solve (K + σ²I)·α = y via Cholesky */
    const choleskySolve = (K: number[][], y: number[]): { alpha: number[]; L: number[][] } => {
      const n = K.length;
      const Kn: number[][] = K.map((row, i) => row.map((v, j) => v + (i === j ? noiseVar : 0)));
      const L = cholesky(Kn);
      const z = forwardSolve(L, y);
      const alpha = backSolve(L, z);
      return { alpha, L };
    };

    // --- Fit source GP ---
    const srcX = input.source_data.map(d => d.x);
    const srcY = input.source_data.map(d => d.y);
    const Kss = kernelMatrix(srcX, srcX);
    const { alpha: srcAlpha } = choleskySolve(Kss, srcY);

    /** Predict source GP mean at a point */
    const sourcePredict = (xStar: number[]): number => {
      let mu = 0;
      for (let i = 0; i < srcX.length; i++) {
        mu += rbf(xStar, srcX[i]) * srcAlpha[i];
      }
      return mu;
    };

    // --- Transfer: use source GP mean as prior for target ---
    const tgtX = input.target_data.map(d => d.x);
    const tgtY = input.target_data.map(d => d.y);

    // Residuals: target y minus source prior mean
    const tgtResiduals = tgtY.map((y, i) => y - sourcePredict(tgtX[i]));

    // Fit residual GP on target data
    const Ktt = kernelMatrix(tgtX, tgtX);
    const { alpha: resAlpha } = tgtX.length > 0
      ? choleskySolve(Ktt, tgtResiduals)
      : { alpha: [] as number[] };

    // Predict at x_predict: transfer = source_prior + residual_gp
    const predictions: GPPrediction[] = input.x_predict.map(xp => {
      const srcMu = sourcePredict(xp);

      // Residual GP mean
      let resMu = 0;
      for (let i = 0; i < tgtX.length; i++) {
        resMu += rbf(xp, tgtX[i]) * resAlpha[i];
      }

      // Predictive variance from target residual GP
      const kStar = tgtX.map(tx => rbf(xp, tx));
      const kStarStar = rbf(xp, xp);
      // Approximate variance: k** - k*^T (K+σ²I)^-1 k*
      let varReduction = 0;
      if (tgtX.length > 0) {
        const Ktn: number[][] = Ktt.map((row, i) => row.map((v, j) => v + (i === j ? noiseVar : 0)));
        const Ltt = cholesky(Ktn);
        const v = forwardSolve(Ltt, kStar);
        varReduction = v.reduce((s, vi) => s + vi * vi, 0);
      }
      const predVar = Math.max(kStarStar - varReduction + noiseVar, 1e-8);

      return {
        x: xp,
        y_mean: parseFloat((srcMu + resMu).toFixed(6)),
        y_std: parseFloat(Math.sqrt(predVar).toFixed(6)),
      };
    });

    // --- Evaluate transfer gain ---
    // RMSE of source-only vs transfer on target data
    let srcRmse = 0;
    let transferRmse = 0;
    for (let i = 0; i < tgtX.length; i++) {
      const srcPred = sourcePredict(tgtX[i]);
      srcRmse += (srcPred - tgtY[i]) ** 2;

      // Transfer prediction at target points
      let resMu = 0;
      for (let j = 0; j < tgtX.length; j++) {
        resMu += rbf(tgtX[i], tgtX[j]) * resAlpha[j];
      }
      transferRmse += (srcPred + resMu - tgtY[i]) ** 2;
    }
    const n = Math.max(tgtX.length, 1);
    srcRmse = Math.sqrt(srcRmse / n);
    transferRmse = Math.sqrt(transferRmse / n);

    const transferGain = srcRmse > 0 ? ((srcRmse - transferRmse) / srcRmse) * 100 : 0;
    const negativeTx = transferGain < -5; // >5% worse = negative transfer

    return {
      value: {
        predictions,
        transfer_gain_pct: parseFloat(transferGain.toFixed(2)),
        negative_transfer: negativeTx,
        source_rmse: parseFloat(srcRmse.toFixed(6)),
        target_rmse: parseFloat(transferRmse.toFixed(6)),
      },
      unit: 'mixed',
      formula: 'μ(x*)=K(x*,X)·(K+σ²I)⁻¹·y; transfer=source_prior+residual_gp',
      confidence: negativeTx ? 0.3 : Math.min(0.95, 0.5 + tgtX.length * 0.05),
    };
  }

  // ─── 4. Material Transfer ──────────────────────────────────────

  /**
   * Transfer cutting data between materials using machinability index scaling.
   *
   * Vc_target ≈ Vc_source × (MI_target / MI_source)^0.5
   * Tool life scaling via Taylor: T_target ≈ T_source × (MI_target/MI_source)^0.3 × (HB_source/HB_target)^0.4
   *
   * Built-in material DB with 12 materials (HB, MI, kc, σ_y, thermal conductivity).
   *
   * @param input - Source/target material names, source cutting speed and tool life
   * @returns Scaled speed, scaled life, similarity score, material data
   */
  materialTransfer(input: MaterialTransferInput): AtomicValue<MaterialTransferResult> {
    const db = input.custom_materials
      ? [...MATERIAL_DB, ...input.custom_materials]
      : MATERIAL_DB;

    const findMat = (name: string): MaterialEntry => {
      const found = db.find(m => m.name.toLowerCase() === name.toLowerCase());
      if (!found) {
        throw new Error(`Material '${name}' not found. Available: ${db.map(m => m.name).join(', ')}`);
      }
      return found;
    };

    const srcMat = findMat(input.source_material);
    const tgtMat = findMat(input.target_material);

    const miRatio = tgtMat.machinability_index / srcMat.machinability_index;
    const hbRatio = srcMat.hardness_hb / tgtMat.hardness_hb;

    // Speed scaling: Vc_target ≈ Vc_source × (MI_target/MI_source)^0.5
    const scaledSpeed = input.source_speed_mmin * Math.pow(miRatio, 0.5);

    // Tool life scaling via modified Taylor relationship
    const srcLife = input.source_tool_life_min ?? 45; // default 45 min reference
    const scaledLife = srcLife * Math.pow(miRatio, 0.3) * Math.pow(hbRatio, 0.4);

    // Similarity score based on kc ratio and hardness proximity
    const kcRatio = Math.min(srcMat.kc1_1, tgtMat.kc1_1) / Math.max(srcMat.kc1_1, tgtMat.kc1_1);
    const hbSim = 1 - Math.abs(srcMat.hardness_hb - tgtMat.hardness_hb) / Math.max(srcMat.hardness_hb, tgtMat.hardness_hb);
    const similarity = 0.5 * kcRatio + 0.5 * hbSim;

    return {
      value: {
        scaled_speed: parseFloat(scaledSpeed.toFixed(2)),
        scaled_life: parseFloat(scaledLife.toFixed(2)),
        similarity_score: parseFloat(similarity.toFixed(4)),
        hardness_ratio: parseFloat(hbRatio.toFixed(4)),
        mi_ratio: parseFloat(miRatio.toFixed(4)),
        source_material: srcMat,
        target_material: tgtMat,
      },
      unit: 'm/min, min',
      formula: 'Vc_t≈Vc_s×(MI_t/MI_s)^0.5; T_t≈T_s×(MI_t/MI_s)^0.3×(HB_s/HB_t)^0.4',
      confidence: Math.min(0.9, similarity + 0.1),
    };
  }

  // ─── 5. Bayesian Update ────────────────────────────────────────

  /**
   * Conjugate Gaussian sequential Bayesian updating.
   *
   * Prior: N(μ₀, σ₀²). Likelihood: N(x_i, σ_n²).
   * Posterior after observation x:
   *   μ_post = (μ₀/σ₀² + x/σ_n²) / (1/σ₀² + 1/σ_n²)
   *   σ²_post = 1 / (1/σ₀² + 1/σ_n²)
   *
   * Processes observations sequentially, tracking convergence.
   * Log marginal evidence: Σ log N(x_i; μ_prior_i, σ²_prior_i + σ²_n)
   *
   * @param input - Prior parameters, observations, optional noise std
   * @returns Posterior mean/std, 95% credible interval, convergence, log evidence
   */
  bayesianUpdate(input: BayesianUpdateInput): AtomicValue<BayesianUpdateResult> {
    const { prior_mean, prior_std, observations } = input;

    // Estimate noise std from data if not provided
    const noiseStd = input.noise_std ?? (observations.length > 1
      ? Math.sqrt(observations.reduce((s, x) => {
          const mean = observations.reduce((a, b) => a + b, 0) / observations.length;
          return s + (x - mean) ** 2;
        }, 0) / (observations.length - 1))
      : prior_std * 0.5);

    const noiseVar = noiseStd * noiseStd;
    let mu = prior_mean;
    let sigma2 = prior_std * prior_std;
    let logEvidence = 0;
    const steps: Array<{ step: number; mean: number; std: number }> = [];

    steps.push({ step: 0, mean: mu, std: Math.sqrt(sigma2) });

    for (let i = 0; i < observations.length; i++) {
      const x = observations[i];

      // Log marginal likelihood for this observation: N(x; μ, σ² + σ_n²)
      const predVar = sigma2 + noiseVar;
      logEvidence += -0.5 * Math.log(2 * Math.PI * predVar) - 0.5 * (x - mu) ** 2 / predVar;

      // Conjugate update
      const priorPrec = 1 / sigma2;
      const likePrec = 1 / noiseVar;
      const postPrec = priorPrec + likePrec;

      mu = (mu * priorPrec + x * likePrec) / postPrec;
      sigma2 = 1 / postPrec;

      steps.push({
        step: i + 1,
        mean: parseFloat(mu.toFixed(6)),
        std: parseFloat(Math.sqrt(sigma2).toFixed(6)),
      });
    }

    const postStd = Math.sqrt(sigma2);

    // Convergence metric: ratio of final posterior std to prior std
    const convergence = 1 - postStd / prior_std;

    return {
      value: {
        posterior_mean: parseFloat(mu.toFixed(6)),
        posterior_std: parseFloat(postStd.toFixed(6)),
        credible_interval_95: [
          parseFloat((mu - 1.96 * postStd).toFixed(6)),
          parseFloat((mu + 1.96 * postStd).toFixed(6)),
        ],
        convergence_metric: parseFloat(convergence.toFixed(6)),
        log_evidence: parseFloat(logEvidence.toFixed(6)),
        update_steps: steps,
      },
      unit: 'same as input',
      formula: 'μ_post=(μ₀/σ₀²+x/σ_n²)/(1/σ₀²+1/σ_n²); σ²_post=1/(1/σ₀²+1/σ_n²)',
      confidence: Math.min(0.99, 0.5 + convergence * 0.5),
    };
  }

  // ─── 6. Validate Transfer ──────────────────────────────────────

  /**
   * Safety validation of transferred cutting parameters against machine limits.
   *
   * Checks:
   *   - Power: P = kc·ap·ae·Vc/(60×10³) ≤ P_max (80% safety margin)
   *   - Torque: T = P×60/(2π·n) ≤ T_max
   *   - RPM: n = 1000·Vc/(π·D) ≤ n_max
   *   - Feed rate: Vf = fz·z·n ≤ Vf_max
   *   - Deflection: δ = F·L³/(3·E·I) ≤ δ_limit (cantilever beam model)
   *
   * @param input - Scaled parameters, target machine, optional tool geometry
   * @returns Safety assessment with individual checks and required adjustments
   */
  validateTransfer(input: ValidateTransferInput): AtomicValue<ValidateTransferResult> {
    const { scaled_params: sp, target_machine: tm } = input;
    const kc = input.kc_n_per_mm2 ?? 2000;
    const toolD = input.tool_diameter_mm ?? sp.tool_diameter_mm ?? 10;
    const stickout = input.tool_stickout_mm ?? 40;
    const deflLimit = input.deflection_limit_mm ?? 0.05;
    const z = sp.flute_count ?? 4;

    const checks: SafetyCheck[] = [];
    const adjustments: string[] = [];

    // 1. RPM check
    const n = (1000 * sp.Vc) / (Math.PI * toolD);
    const rpmMargin = ((tm.max_rpm - n) / tm.max_rpm) * 100;
    checks.push({
      parameter: 'spindle_rpm',
      value: parseFloat(n.toFixed(0)),
      limit: tm.max_rpm,
      unit: 'rpm',
      passed: n <= tm.max_rpm,
      margin_pct: parseFloat(rpmMargin.toFixed(1)),
    });
    if (n > tm.max_rpm) {
      adjustments.push(`Reduce Vc from ${sp.Vc} to ${((Math.PI * toolD * tm.max_rpm) / 1000).toFixed(1)} m/min (RPM limit)`);
    }

    // 2. Power check (80% safety factor)
    const powerRequired = (kc * sp.ap * sp.ae * sp.Vc) / (60 * 1000); // kW
    const powerLimit = tm.power_kw * 0.8;
    const powerMargin = ((powerLimit - powerRequired) / powerLimit) * 100;
    checks.push({
      parameter: 'power',
      value: parseFloat(powerRequired.toFixed(2)),
      limit: parseFloat(powerLimit.toFixed(2)),
      unit: 'kW',
      passed: powerRequired <= powerLimit,
      margin_pct: parseFloat(powerMargin.toFixed(1)),
    });
    if (powerRequired > powerLimit) {
      const mrrScale = powerLimit / powerRequired;
      adjustments.push(`Reduce MRR by ${((1 - mrrScale) * 100).toFixed(0)}% to stay within 80% power limit`);
    }

    // 3. Torque check (if torque limit known)
    if (tm.max_torque_nm) {
      const torqueRequired = n > 0 ? (powerRequired * 1000 * 60) / (2 * Math.PI * n) : 0;
      const torqueMargin = ((tm.max_torque_nm - torqueRequired) / tm.max_torque_nm) * 100;
      checks.push({
        parameter: 'torque',
        value: parseFloat(torqueRequired.toFixed(2)),
        limit: tm.max_torque_nm,
        unit: 'Nm',
        passed: torqueRequired <= tm.max_torque_nm,
        margin_pct: parseFloat(torqueMargin.toFixed(1)),
      });
      if (torqueRequired > tm.max_torque_nm) {
        adjustments.push(`Reduce depth of cut or feed — torque exceeds ${tm.max_torque_nm} Nm limit`);
      }
    }

    // 4. Feed rate check
    if (tm.max_feed_mmmin) {
      const feedRate = sp.fz * z * n;
      const feedMargin = ((tm.max_feed_mmmin - feedRate) / tm.max_feed_mmmin) * 100;
      checks.push({
        parameter: 'feed_rate',
        value: parseFloat(feedRate.toFixed(1)),
        limit: tm.max_feed_mmmin,
        unit: 'mm/min',
        passed: feedRate <= tm.max_feed_mmmin,
        margin_pct: parseFloat(feedMargin.toFixed(1)),
      });
      if (feedRate > tm.max_feed_mmmin) {
        adjustments.push(`Reduce fz from ${sp.fz} to ${(tm.max_feed_mmmin / (z * n)).toFixed(4)} mm/tooth (feed rate limit)`);
      }
    }

    // 5. Deflection check (cantilever beam: δ = F·L³/(3·E·I))
    const cuttingForce = kc * sp.ap * sp.fz; // N (simplified tangential)
    const E = 600000; // Carbide E ≈ 600 GPa = 600000 N/mm²
    const I = (Math.PI * Math.pow(toolD, 4)) / 64; // mm⁴
    const deflection = (cuttingForce * Math.pow(stickout, 3)) / (3 * E * I);
    const deflMargin = ((deflLimit - deflection) / deflLimit) * 100;
    checks.push({
      parameter: 'deflection',
      value: parseFloat(deflection.toFixed(5)),
      limit: deflLimit,
      unit: 'mm',
      passed: deflection <= deflLimit,
      margin_pct: parseFloat(deflMargin.toFixed(1)),
    });
    if (deflection > deflLimit) {
      const forceScale = (deflLimit * 3 * E * I) / (Math.pow(stickout, 3) * kc * sp.ap);
      adjustments.push(`Reduce fz to ${forceScale.toFixed(4)} mm/tooth or reduce stickout to limit deflection to ${deflLimit} mm`);
    }

    const safe = checks.every(c => c.passed);
    const margins = checks.map(c => c.margin_pct);
    const overallMargin = margins.length > 0 ? Math.min(...margins) : 100;

    return {
      value: {
        safe,
        checks,
        adjustments_needed: adjustments,
        overall_margin_pct: parseFloat(overallMargin.toFixed(1)),
      },
      unit: 'boolean + checks',
      formula: 'P=kc·ap·ae·Vc/(60e3); δ=F·L³/(3EI); n=1000Vc/(πD)',
      confidence: safe ? 0.95 : 0.5,
    };
  }
}

/** Singleton instance */
export const transferLearningEngine = new TransferLearningEngine();
