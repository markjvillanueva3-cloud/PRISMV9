// @ts-nocheck
/**
 * PhysicsMLHybridEngine — Implements the 20 HYBRID category formulas from FormulaRegistry
 *
 * These formulas bridge physics-based models with machine learning / data-driven approaches,
 * covering multi-physics coupling, hybrid ML-physics fusion, optimization under uncertainty,
 * online/transfer/meta learning, and system-level unified models.
 *
 * 5 sub-method groups (A–E), 20 formulas total:
 *   A. coupledPhysics    — formulas 5-10  (multi-physics coupling)
 *   B. hybridMLPhysics   — formulas 1-4   (physics-ML fusion)
 *   C. optimization      — formulas 11-13 (multi-objective/robust/stochastic)
 *   D. onlineLearning    — formulas 14-16 (adaptive/transfer/meta)
 *   E. systemLevel       — formulas 17-20 (unified/self-optimizing/XAI/ensemble)
 *
 * References:
 *   FormulaRegistry HYBRID category (HYB-001 through HYB-020)
 *   Altintas (2012) Manufacturing Automation
 *   Bishop (2006) Pattern Recognition and Machine Learning
 *   Boyd & Vandenberghe (2004) Convex Optimization
 *   Rasmussen & Williams (2006) Gaussian Processes for ML
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
}

function normalRandom(mu = 0, sigma = 1): number {
  // Box-Muller transform
  const u1 = Math.random() || 1e-10;
  const u2 = Math.random();
  return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function softmax(weights: number[]): number[] {
  const maxW = Math.max(...weights);
  const exps = weights.map(w => Math.exp(w - maxW));
  const sum = exps.reduce((s, v) => s + v, 0);
  return exps.map(e => e / sum);
}

// ─── Input / Output Interfaces ──────────────────────────────────────────────

// ── Group A: Coupled Physics (formulas 5-10) ──

/** HYB-005: Force-Thermal Coupling — Fc(T) = Fc_base × (1 - β × (T - T0)) */
export interface ForceThermalCouplingInput {
  Fc_base_N: number;
  beta: number;            // thermal softening coefficient [1/°C]
  temperature_C: number;
  referenceTemp_C: number;
}
export interface ForceThermalCouplingResult {
  Fc_N: number;
  reductionPercent: number;
  formula: string;
  confidence: number;
}

/** HYB-006: Wear-Surface Coupling — Ra(VB) = Ra_new × (1 + γ × VB) */
export interface WearSurfaceCouplingInput {
  Ra_new_um: number;
  gamma: number;           // wear-roughness coupling coefficient [1/mm]
  flankWear_mm: number;
}
export interface WearSurfaceCouplingResult {
  Ra_um: number;
  degradationPercent: number;
  formula: string;
  confidence: number;
}

/** HYB-007: Vibration-Wear Coupling — dVB/dt = f(VB) × (1 + δ × a_vib) */
export interface VibrationWearCouplingInput {
  VB_initial_mm: number;
  baseWearRate_mmPerMin: number;  // f(VB) base rate
  delta: number;                   // vibration-wear coupling coefficient
  vibrationAmplitude_mm: number;   // a_vib
  duration_min: number;
  timeStep_min?: number;           // Euler integration step (default 0.1)
}
export interface VibrationWearCouplingResult {
  VB_final_mm: number;
  wearHistory: { time_min: number; VB_mm: number }[];
  effectiveWearRate_mmPerMin: number;
  amplification: number;
  formula: string;
  confidence: number;
}

/** HYB-008: Thermal-Deflection Coupling — δ_total = δ_force + δ_thermal(T) */
export interface ThermalDeflectionCouplingInput {
  force_N: number;
  toolLength_mm: number;
  toolDiameter_mm: number;
  elasticModulus_GPa: number;
  thermalExpCoeff: number;        // α [1/°C]
  tempRise_C: number;
}
export interface ThermalDeflectionCouplingResult {
  deflection_force_mm: number;
  deflection_thermal_mm: number;
  deflection_total_mm: number;
  thermalContributionPercent: number;
  formula: string;
  confidence: number;
}

/** HYB-009: Coupled Thermal-Mechanical — [K]{u} = {F} + {F_thermal} */
export interface CoupledThermalMechanicalInput {
  stiffness_N_per_mm: number;     // K
  appliedForce_N: number;         // F
  thermalExpCoeff: number;        // α
  tempRise_C: number;
  constrainedLength_mm: number;   // L
  crossSectionArea_mm2: number;   // A
  elasticModulus_GPa: number;
}
export interface CoupledThermalMechanicalResult {
  displacement_mm: number;
  thermalForce_N: number;
  mechanicalDisplacement_mm: number;
  thermalDisplacement_mm: number;
  totalStress_MPa: number;
  formula: string;
  confidence: number;
}

/** HYB-010: Fluid-Structure Interaction — p_fluid = f(v, structure_deformation) */
export interface FluidStructureInteractionInput {
  fluidVelocity_m_s: number;
  fluidDensity_kg_m3: number;     // default ~1000 (water-based coolant)
  structureDeflection_mm: number;
  channelWidth_mm: number;
  dynamicViscosity_Pa_s?: number; // default 0.001
}
export interface FluidStructureInteractionResult {
  pressure_Pa: number;
  reynoldsNumber: number;
  effectiveVelocity_m_s: number;
  couplingFactor: number;
  formula: string;
  confidence: number;
}

// ── Group B: Hybrid ML-Physics (formulas 1-4) ──

/** HYB-001: Residual Learning — y = f_physics(x) + f_ML(x, residuals) */
export interface ResidualLearningInput {
  physicsValue: number;
  observations: number[];       // actual observed values
  physicsPredictions: number[]; // corresponding physics predictions
  queryPoint?: number;          // optional: x for local residual estimate
}
export interface ResidualLearningResult {
  correctedValue: number;
  residualEstimate: number;
  meanResidual: number;
  residualStd: number;
  improvement: number;
  formula: string;
  confidence: number;
}

/** HYB-002: Physics-Guided Loss — L = L_data + λ × L_physics */
export interface PhysicsGuidedLossInput {
  predictions: number[];
  observations: number[];
  physicsConstraintValues: number[];  // constraint violations (0 = satisfied)
  lambda: number;                      // physics regularization weight
}
export interface PhysicsGuidedLossResult {
  totalLoss: number;
  dataLoss: number;
  physicsLoss: number;
  lambda: number;
  physicsViolationCount: number;
  formula: string;
  confidence: number;
}

/** HYB-003: Hybrid Uncertainty — σ² = σ²_physics + σ²_ML + 2ρσ_p×σ_ML */
export interface HybridUncertaintyInput {
  sigma_physics: number;
  sigma_ML: number;
  correlation_rho?: number;    // default 0 (uncorrelated)
}
export interface HybridUncertaintyResult {
  sigma_hybrid: number;
  variance_hybrid: number;
  variance_physics: number;
  variance_ML: number;
  crossTerm: number;
  formula: string;
  confidence: number;
}

/** HYB-004: Adaptive Weighting — α(x) = σ²_ML / (σ²_physics + σ²_ML) */
export interface AdaptiveWeightingInput {
  physicsValue: number;
  mlValue: number;
  sigma_physics: number;
  sigma_ML: number;
}
export interface AdaptiveWeightingResult {
  blendedValue: number;
  alpha_physics: number;
  alpha_ML: number;
  dominantModel: string;
  formula: string;
  confidence: number;
}

// ── Group C: Optimization (formulas 11-13) ──

/** HYB-011: Multi-Objective Balance — x* = argmin Σwi×fi s.t. gi ≤ 0 */
export interface MultiObjectiveBalanceInput {
  objectives: { name: string; values: number[]; weight: number; minimize?: boolean }[];
  constraints?: { name: string; values: number[]; limit: number }[];
  candidates: number;  // number of candidate points (length of values arrays)
}
export interface MultiObjectiveBalanceResult {
  bestIndex: number;
  bestScore: number;
  scores: number[];
  feasibleCount: number;
  paretoFrontIndices: number[];
  formula: string;
  confidence: number;
}

/** HYB-012: Robust Optimization — x* = argmin max_u f(x,u) */
export interface RobustOptimizationInput {
  nominalObjective: number[];       // f(x, u_nominal) for each candidate
  worstCaseObjective: number[];     // max_u f(x, u) for each candidate
  robustnessWeight?: number;        // α: blend nominal vs worst-case (default 0.5)
}
export interface RobustOptimizationResult {
  bestIndex: number;
  bestRobustScore: number;
  scores: number[];
  nominalBestIndex: number;
  robustnessGap: number;
  formula: string;
  confidence: number;
}

/** HYB-013: Stochastic Optimization — x* = argmin E[f(x,ξ)] */
export interface StochasticOptimizationInput {
  candidateScenarios: number[][];   // [candidate][scenario] matrix of objective values
  scenarioProbabilities?: number[]; // probabilities for each scenario (default uniform)
  riskAversion?: number;            // CVaR weight (0 = risk-neutral, 1 = fully CVaR)
  alpha?: number;                   // CVaR confidence level (default 0.95)
}
export interface StochasticOptimizationResult {
  bestIndex: number;
  expectedValues: number[];
  cvarValues: number[];
  bestExpected: number;
  bestCVaR: number;
  formula: string;
  confidence: number;
}

// ── Group D: Online Learning (formulas 14-16) ──

/** HYB-014: Online Learning Force — kc(t) = kc(t-1) + η × (Fc_actual - Fc_pred) */
export interface OnlineLearningForceInput {
  kc_initial: number;              // initial specific cutting force [N/mm²]
  observations: { Fc_actual_N: number; Fc_predicted_N: number }[];
  learningRate: number;            // η
  chipArea_mm2?: number;           // for converting kc to force (default 1.0)
}
export interface OnlineLearningForceResult {
  kc_final: number;
  kc_history: number[];
  totalCorrection: number;
  convergenceRate: number;
  formula: string;
  confidence: number;
}

/** HYB-015: Transfer Learning — θ_target = θ_source + Δθ_adaptation */
export interface TransferLearningInput {
  sourceParams: number[];           // θ_source
  targetObservations: number[];     // target domain measured values
  sourcePredictsOnTarget: number[]; // source model predictions on target data
  adaptationRate?: number;          // learning rate for adaptation (default 0.1)
}
export interface TransferLearningResult {
  targetParams: number[];
  adaptationDelta: number[];
  transferGap: number;
  adaptedRMSE: number;
  sourceRMSE: number;
  improvementPercent: number;
  formula: string;
  confidence: number;
}

/** HYB-016: Meta-Learning Rate — η(task) = η_base × sim(task, trained_tasks) */
export interface MetaLearningRateInput {
  baseRate: number;                 // η_base
  taskFeatures: number[];           // current task feature vector
  trainedTaskFeatures: number[][];  // feature vectors of previously trained tasks
  trainedTaskRates?: number[];      // optimal rates found for trained tasks
}
export interface MetaLearningRateResult {
  adaptedRate: number;
  similarity: number;
  mostSimilarTaskIndex: number;
  formula: string;
  confidence: number;
}

// ── Group E: System Level (formulas 17-20) ──

/** HYB-017: Unified Machining Model — output = f_unified(material, machine, tool, process) */
export interface UnifiedMachiningModelInput {
  material: { hardness_HRC?: number; tensile_MPa: number; thermalCond_W_mK: number };
  machine: { power_kW: number; rigidity_N_um: number; maxRPM: number };
  tool: { diameter_mm: number; flutes: number; coating?: string; gradeHardness_HV?: number };
  process: { speed_mpm: number; feed_mmrev: number; depth_mm: number; width_mm?: number };
}
export interface UnifiedMachiningModelResult {
  cuttingForce_N: number;
  power_kW: number;
  surfaceRoughness_um: number;
  toolLife_min: number;
  mrr_cm3_min: number;
  machinability_index: number;
  constraints: { power_ok: boolean; force_ok: boolean; speed_ok: boolean };
  formula: string;
  confidence: number;
}

/** HYB-018: Self-Optimizing Process — params_next = optimize(params_current, performance) */
export interface SelfOptimizingProcessInput {
  currentParams: { speed_mpm: number; feed_mmrev: number; depth_mm: number };
  performance: { force_N: number; roughness_um: number; toolWear_mm: number; mrr_cm3_min: number };
  targets: { maxForce_N?: number; maxRoughness_um?: number; maxWear_mm?: number; minMRR?: number };
  stepSize?: number;   // optimization step size (default 0.05 = 5%)
}
export interface SelfOptimizingProcessResult {
  nextParams: { speed_mpm: number; feed_mmrev: number; depth_mm: number };
  adjustments: { speed_pct: number; feed_pct: number; depth_pct: number };
  violatedConstraints: string[];
  expectedImprovement: number;
  formula: string;
  confidence: number;
}

/** HYB-019: Explainable Prediction — y, explanation = f_XAI(x) */
export interface ExplainablePredictionInput {
  features: { name: string; value: number; unit?: string }[];
  coefficients: number[];          // linear model coefficients
  intercept?: number;
  featureRanges?: { min: number; max: number }[];  // for normalized contribution
}
export interface ExplainablePredictionResult {
  prediction: number;
  contributions: { feature: string; value: number; coefficient: number; contribution: number; percentContribution: number }[];
  topFeature: string;
  explanation: string;
  formula: string;
  confidence: number;
}

/** HYB-020: Confidence-Weighted Ensemble — ŷ = Σ(conf_i × ŷ_i) / Σconf_i */
export interface ConfidenceWeightedEnsembleInput {
  models: { name: string; prediction: number; confidence: number }[];
  minConfidence?: number;  // filter threshold (default 0)
}
export interface ConfidenceWeightedEnsembleResult {
  ensemblePrediction: number;
  weights: { name: string; normalizedWeight: number }[];
  ensembleUncertainty: number;
  modelCount: number;
  formula: string;
  confidence: number;
}

// ─── Dispatch Action Type ───────────────────────────────────────────────────

export type HybridAction =
  | 'hybrid_coupled_physics'
  | 'hybrid_ml_physics'
  | 'hybrid_optimization'
  | 'hybrid_online_learning'
  | 'hybrid_system_level';

export type HybridSubAction =
  // Group A
  | 'force_thermal_coupling'
  | 'wear_surface_coupling'
  | 'vibration_wear_coupling'
  | 'thermal_deflection_coupling'
  | 'coupled_thermal_mechanical'
  | 'fluid_structure_interaction'
  // Group B
  | 'residual_learning'
  | 'physics_guided_loss'
  | 'hybrid_uncertainty'
  | 'adaptive_weighting'
  // Group C
  | 'multi_objective_balance'
  | 'robust_optimization'
  | 'stochastic_optimization'
  // Group D
  | 'online_learning_force'
  | 'transfer_learning'
  | 'meta_learning_rate'
  // Group E
  | 'unified_machining_model'
  | 'self_optimizing_process'
  | 'explainable_prediction'
  | 'confidence_weighted_ensemble';

// ─── Engine Class ───────────────────────────────────────────────────────────

export class PhysicsMLHybridEngine {
  readonly name = 'PhysicsMLHybridEngine';
  readonly version = '1.0.0';

  /**
   * Main dispatch — routes to one of 5 sub-method groups.
   */
  calculate(action: HybridAction, subAction: HybridSubAction, params: any): any {
    switch (action) {
      case 'hybrid_coupled_physics':
        return this.coupledPhysics(subAction, params);
      case 'hybrid_ml_physics':
        return this.hybridMLPhysics(subAction, params);
      case 'hybrid_optimization':
        return this.optimization(subAction, params);
      case 'hybrid_online_learning':
        return this.onlineLearning(subAction, params);
      case 'hybrid_system_level':
        return this.systemLevel(subAction, params);
      default:
        throw new Error(`Unknown hybrid action: ${action}`);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP A: Coupled Physics (Formulas 5-10)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Dispatch coupled physics sub-actions.
   */
  coupledPhysics(subAction: string, params: any): any {
    switch (subAction) {
      case 'force_thermal_coupling':
        return this.forceThermalCoupling(params);
      case 'wear_surface_coupling':
        return this.wearSurfaceCoupling(params);
      case 'vibration_wear_coupling':
        return this.vibrationWearCoupling(params);
      case 'thermal_deflection_coupling':
        return this.thermalDeflectionCoupling(params);
      case 'coupled_thermal_mechanical':
        return this.coupledThermalMechanical(params);
      case 'fluid_structure_interaction':
        return this.fluidStructureInteraction(params);
      default:
        throw new Error(`Unknown coupled physics sub-action: ${subAction}`);
    }
  }

  /**
   * HYB-005: Force-Thermal Coupling
   * Fc(T) = Fc_base × (1 - β × (T - T0))
   *
   * Models thermal softening effect on cutting force. As temperature rises,
   * material yield stress drops, reducing cutting force.
   * β typically 0.0005–0.003 /°C for steels.
   */
  forceThermalCoupling(input: ForceThermalCouplingInput): ForceThermalCouplingResult {
    const { Fc_base_N, beta, temperature_C, referenceTemp_C } = input;
    if (Fc_base_N <= 0) throw new Error('Fc_base_N must be positive');
    if (beta < 0) throw new Error('beta must be non-negative');

    const deltaT = temperature_C - referenceTemp_C;
    const factor = clamp(1 - beta * deltaT, 0.01, 2.0);
    const Fc_N = Fc_base_N * factor;
    const reductionPercent = (1 - factor) * 100;

    return {
      Fc_N,
      reductionPercent,
      formula: `Fc(T) = ${Fc_base_N.toFixed(1)} × (1 - ${beta} × (${temperature_C} - ${referenceTemp_C})) = ${Fc_N.toFixed(1)} N`,
      confidence: deltaT >= 0 && deltaT < 800 ? 0.85 : 0.6,
    };
  }

  /**
   * HYB-006: Wear-Surface Coupling
   * Ra(VB) = Ra_new × (1 + γ × VB)
   *
   * As flank wear VB increases, surface roughness degrades linearly.
   * γ typically 2–10 /mm for turning operations.
   */
  wearSurfaceCoupling(input: WearSurfaceCouplingInput): WearSurfaceCouplingResult {
    const { Ra_new_um, gamma, flankWear_mm } = input;
    if (Ra_new_um <= 0) throw new Error('Ra_new_um must be positive');
    if (flankWear_mm < 0) throw new Error('flankWear_mm must be non-negative');

    const factor = 1 + gamma * flankWear_mm;
    const Ra_um = Ra_new_um * factor;
    const degradationPercent = (factor - 1) * 100;

    return {
      Ra_um,
      degradationPercent,
      formula: `Ra(VB) = ${Ra_new_um.toFixed(2)} × (1 + ${gamma} × ${flankWear_mm}) = ${Ra_um.toFixed(2)} μm`,
      confidence: flankWear_mm < 0.5 ? 0.9 : 0.7,
    };
  }

  /**
   * HYB-007: Vibration-Wear Coupling
   * dVB/dt = f(VB) × (1 + δ × a_vib)
   *
   * Vibration accelerates tool wear via Euler integration of coupled ODE.
   * δ typically 5–50 /mm for machining vibrations.
   */
  vibrationWearCoupling(input: VibrationWearCouplingInput): VibrationWearCouplingResult {
    const { VB_initial_mm, baseWearRate_mmPerMin, delta, vibrationAmplitude_mm, duration_min } = input;
    const dt = input.timeStep_min ?? 0.1;
    if (VB_initial_mm < 0) throw new Error('VB_initial_mm must be non-negative');
    if (baseWearRate_mmPerMin <= 0) throw new Error('baseWearRate must be positive');
    if (duration_min <= 0) throw new Error('duration must be positive');

    const amplification = 1 + delta * vibrationAmplitude_mm;
    let VB = VB_initial_mm;
    const history: { time_min: number; VB_mm: number }[] = [{ time_min: 0, VB_mm: VB }];

    const steps = Math.ceil(duration_min / dt);
    for (let i = 1; i <= steps; i++) {
      const t = Math.min(i * dt, duration_min);
      const stepDt = (i === steps) ? (duration_min - (i - 1) * dt) : dt;
      const dVBdt = baseWearRate_mmPerMin * amplification;
      VB += dVBdt * stepDt;
      if (i % Math.max(1, Math.floor(steps / 20)) === 0 || i === steps) {
        history.push({ time_min: parseFloat(t.toFixed(4)), VB_mm: parseFloat(VB.toFixed(6)) });
      }
    }

    const effectiveRate = (VB - VB_initial_mm) / duration_min;

    return {
      VB_final_mm: VB,
      wearHistory: history,
      effectiveWearRate_mmPerMin: effectiveRate,
      amplification,
      formula: `dVB/dt = ${baseWearRate_mmPerMin} × (1 + ${delta} × ${vibrationAmplitude_mm}) = ${(baseWearRate_mmPerMin * amplification).toFixed(4)} mm/min`,
      confidence: vibrationAmplitude_mm < 0.1 ? 0.85 : 0.7,
    };
  }

  /**
   * HYB-008: Thermal-Deflection Coupling
   * δ_total = δ_force + δ_thermal(T)
   *
   * δ_force = F × L³ / (3 × E × I)  (cantilever beam)
   * δ_thermal = α × ΔT × L           (thermal expansion)
   */
  thermalDeflectionCoupling(input: ThermalDeflectionCouplingInput): ThermalDeflectionCouplingResult {
    const { force_N, toolLength_mm, toolDiameter_mm, elasticModulus_GPa, thermalExpCoeff, tempRise_C } = input;
    if (toolDiameter_mm <= 0) throw new Error('toolDiameter_mm must be positive');
    if (toolLength_mm <= 0) throw new Error('toolLength_mm must be positive');

    const E = elasticModulus_GPa * 1e3; // GPa → N/mm²
    const I = (Math.PI / 64) * toolDiameter_mm ** 4;
    const deflForce = (force_N * toolLength_mm ** 3) / (3 * E * I);
    const deflThermal = thermalExpCoeff * tempRise_C * toolLength_mm;
    const deflTotal = deflForce + deflThermal;
    const thermalPct = deflTotal > 0 ? (deflThermal / deflTotal) * 100 : 0;

    return {
      deflection_force_mm: deflForce,
      deflection_thermal_mm: deflThermal,
      deflection_total_mm: deflTotal,
      thermalContributionPercent: thermalPct,
      formula: `δ_total = FL³/3EI + αΔTL = ${deflForce.toFixed(4)} + ${deflThermal.toFixed(4)} = ${deflTotal.toFixed(4)} mm`,
      confidence: 0.85,
    };
  }

  /**
   * HYB-009: Coupled Thermal-Mechanical
   * [K]{u} = {F} + {F_thermal}
   *
   * F_thermal = E × A × α × ΔT (constrained thermal load)
   * u = (F + F_thermal) / K
   */
  coupledThermalMechanical(input: CoupledThermalMechanicalInput): CoupledThermalMechanicalResult {
    const { stiffness_N_per_mm, appliedForce_N, thermalExpCoeff, tempRise_C,
            constrainedLength_mm, crossSectionArea_mm2, elasticModulus_GPa } = input;
    if (stiffness_N_per_mm <= 0) throw new Error('stiffness must be positive');

    const E = elasticModulus_GPa * 1e3; // N/mm²
    const thermalForce = E * crossSectionArea_mm2 * thermalExpCoeff * tempRise_C;
    const totalForce = appliedForce_N + thermalForce;
    const displacement = totalForce / stiffness_N_per_mm;
    const mechDisp = appliedForce_N / stiffness_N_per_mm;
    const thermDisp = thermalForce / stiffness_N_per_mm;
    const totalStress = totalForce / crossSectionArea_mm2;

    return {
      displacement_mm: displacement,
      thermalForce_N: thermalForce,
      mechanicalDisplacement_mm: mechDisp,
      thermalDisplacement_mm: thermDisp,
      totalStress_MPa: totalStress,
      formula: `u = (F + E·A·α·ΔT) / K = (${appliedForce_N.toFixed(1)} + ${thermalForce.toFixed(1)}) / ${stiffness_N_per_mm} = ${displacement.toFixed(4)} mm`,
      confidence: 0.82,
    };
  }

  /**
   * HYB-010: Fluid-Structure Interaction
   * p_fluid = ½ρv² × (1 + coupling_factor × δ/w)
   *
   * Bernoulli pressure modified by structural deformation narrowing the flow channel.
   */
  fluidStructureInteraction(input: FluidStructureInteractionInput): FluidStructureInteractionResult {
    const { fluidVelocity_m_s, fluidDensity_kg_m3, structureDeflection_mm,
            channelWidth_mm } = input;
    const mu = input.dynamicViscosity_Pa_s ?? 0.001;
    if (channelWidth_mm <= 0) throw new Error('channelWidth must be positive');
    if (fluidVelocity_m_s < 0) throw new Error('velocity must be non-negative');

    const effectiveWidth = Math.max(channelWidth_mm - structureDeflection_mm, 0.01);
    const couplingFactor = channelWidth_mm / effectiveWidth;
    const effectiveVelocity = fluidVelocity_m_s * couplingFactor;
    const pressure = 0.5 * fluidDensity_kg_m3 * effectiveVelocity ** 2;
    // Reynolds: Re = ρvD/μ, D = effective channel hydraulic diameter ≈ width in mm → m
    const Re = (fluidDensity_kg_m3 * effectiveVelocity * (effectiveWidth / 1000)) / mu;

    return {
      pressure_Pa: pressure,
      reynoldsNumber: Re,
      effectiveVelocity_m_s: effectiveVelocity,
      couplingFactor,
      formula: `p = ½ρv_eff² = ½×${fluidDensity_kg_m3}×${effectiveVelocity.toFixed(2)}² = ${pressure.toFixed(1)} Pa`,
      confidence: structureDeflection_mm < channelWidth_mm * 0.5 ? 0.8 : 0.5,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP B: Hybrid ML-Physics (Formulas 1-4)
  // ════════════════════════════════════════════════════════════════════════════

  hybridMLPhysics(subAction: string, params: any): any {
    switch (subAction) {
      case 'residual_learning':
        return this.residualLearning(params);
      case 'physics_guided_loss':
        return this.physicsGuidedLoss(params);
      case 'hybrid_uncertainty':
        return this.hybridUncertainty(params);
      case 'adaptive_weighting':
        return this.adaptiveWeighting(params);
      default:
        throw new Error(`Unknown hybrid ML-physics sub-action: ${subAction}`);
    }
  }

  /**
   * HYB-001: Residual Learning
   * y = f_physics(x) + f_ML(x, residuals)
   *
   * ML corrects systematic physics model bias by learning the residual pattern.
   * Uses mean residual + local weighting when queryPoint provided.
   */
  residualLearning(input: ResidualLearningInput): ResidualLearningResult {
    const { physicsValue, observations, physicsPredictions } = input;
    if (observations.length !== physicsPredictions.length) {
      throw new Error('observations and physicsPredictions must have same length');
    }
    if (observations.length === 0) throw new Error('Need at least one observation');

    const residuals = observations.map((obs, i) => obs - physicsPredictions[i]);
    const meanRes = mean(residuals);
    const stdRes = Math.sqrt(variance(residuals));

    // If queryPoint provided, use inverse-distance-weighted local residual
    let residualEstimate = meanRes;
    if (input.queryPoint !== undefined && physicsPredictions.length > 1) {
      const dists = physicsPredictions.map(p => Math.abs(input.queryPoint! - p) + 1e-10);
      const invDists = dists.map(d => 1 / d);
      const sumInv = invDists.reduce((s, v) => s + v, 0);
      residualEstimate = residuals.reduce((s, r, i) => s + r * invDists[i], 0) / sumInv;
    }

    const correctedValue = physicsValue + residualEstimate;
    const improvement = stdRes > 0 ? Math.abs(meanRes) / stdRes : 0;

    return {
      correctedValue,
      residualEstimate,
      meanResidual: meanRes,
      residualStd: stdRes,
      improvement,
      formula: `y = f_physics(x) + f_ML(residuals) = ${physicsValue.toFixed(2)} + ${residualEstimate.toFixed(2)} = ${correctedValue.toFixed(2)}`,
      confidence: clamp(0.5 + 0.1 * Math.log10(observations.length + 1), 0.5, 0.95),
    };
  }

  /**
   * HYB-002: Physics-Guided Loss
   * L = L_data + λ × L_physics
   *
   * Computes composite loss: MSE data term + physics constraint penalty.
   */
  physicsGuidedLoss(input: PhysicsGuidedLossInput): PhysicsGuidedLossResult {
    const { predictions, observations, physicsConstraintValues, lambda } = input;
    if (predictions.length !== observations.length) {
      throw new Error('predictions and observations must have same length');
    }
    if (lambda < 0) throw new Error('lambda must be non-negative');

    const n = predictions.length;
    const dataLoss = n > 0
      ? predictions.reduce((s, p, i) => s + (p - observations[i]) ** 2, 0) / n
      : 0;
    const physicsLoss = physicsConstraintValues.length > 0
      ? physicsConstraintValues.reduce((s, v) => s + v ** 2, 0) / physicsConstraintValues.length
      : 0;
    const totalLoss = dataLoss + lambda * physicsLoss;
    const violationCount = physicsConstraintValues.filter(v => Math.abs(v) > 1e-6).length;

    return {
      totalLoss,
      dataLoss,
      physicsLoss,
      lambda,
      physicsViolationCount: violationCount,
      formula: `L = ${dataLoss.toFixed(4)} + ${lambda} × ${physicsLoss.toFixed(4)} = ${totalLoss.toFixed(4)}`,
      confidence: 0.9,
    };
  }

  /**
   * HYB-003: Hybrid Uncertainty
   * σ² = σ²_physics + σ²_ML + 2ρ × σ_p × σ_ML
   *
   * Propagates uncertainty from both physics and ML models, accounting for correlation.
   */
  hybridUncertainty(input: HybridUncertaintyInput): HybridUncertaintyResult {
    const { sigma_physics, sigma_ML } = input;
    const rho = input.correlation_rho ?? 0;
    if (sigma_physics < 0) throw new Error('sigma_physics must be non-negative');
    if (sigma_ML < 0) throw new Error('sigma_ML must be non-negative');
    if (rho < -1 || rho > 1) throw new Error('correlation_rho must be in [-1, 1]');

    const var_p = sigma_physics ** 2;
    const var_ml = sigma_ML ** 2;
    const crossTerm = 2 * rho * sigma_physics * sigma_ML;
    const var_hybrid = var_p + var_ml + crossTerm;
    const sigma_hybrid = Math.sqrt(Math.max(0, var_hybrid));

    return {
      sigma_hybrid,
      variance_hybrid: var_hybrid,
      variance_physics: var_p,
      variance_ML: var_ml,
      crossTerm,
      formula: `σ² = ${var_p.toFixed(4)} + ${var_ml.toFixed(4)} + 2×${rho}×${sigma_physics}×${sigma_ML} = ${var_hybrid.toFixed(4)}`,
      confidence: 0.9,
    };
  }

  /**
   * HYB-004: Adaptive Weighting
   * α(x) = σ²_ML / (σ²_physics + σ²_ML)
   *
   * Weights physics model more when ML uncertainty is high, and vice versa.
   * blended = α_physics × physics + α_ML × ML
   * where α_physics = σ²_ML / (σ²_p + σ²_ML), α_ML = σ²_p / (σ²_p + σ²_ML)
   */
  adaptiveWeighting(input: AdaptiveWeightingInput): AdaptiveWeightingResult {
    const { physicsValue, mlValue, sigma_physics, sigma_ML } = input;
    if (sigma_physics < 0 || sigma_ML < 0) throw new Error('sigmas must be non-negative');

    const var_p = sigma_physics ** 2;
    const var_ml = sigma_ML ** 2;
    const denom = var_p + var_ml;

    // Edge case: both zero → equal weight
    const alpha_physics = denom > 0 ? var_ml / denom : 0.5;
    const alpha_ML = denom > 0 ? var_p / denom : 0.5;
    const blended = alpha_physics * physicsValue + alpha_ML * mlValue;
    const dominant = alpha_physics >= alpha_ML ? 'physics' : 'ML';

    return {
      blendedValue: blended,
      alpha_physics,
      alpha_ML,
      dominantModel: dominant,
      formula: `ŷ = ${alpha_physics.toFixed(3)}×${physicsValue.toFixed(2)} + ${alpha_ML.toFixed(3)}×${mlValue.toFixed(2)} = ${blended.toFixed(2)}`,
      confidence: 0.85,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP C: Optimization (Formulas 11-13)
  // ════════════════════════════════════════════════════════════════════════════

  optimization(subAction: string, params: any): any {
    switch (subAction) {
      case 'multi_objective_balance':
        return this.multiObjectiveBalance(params);
      case 'robust_optimization':
        return this.robustOptimization(params);
      case 'stochastic_optimization':
        return this.stochasticOptimization(params);
      default:
        throw new Error(`Unknown optimization sub-action: ${subAction}`);
    }
  }

  /**
   * HYB-011: Multi-Objective Balance
   * x* = argmin Σ wi × fi(x) subject to gi(x) ≤ 0
   *
   * Weighted-sum scalarization with constraint filtering + Pareto front identification.
   */
  multiObjectiveBalance(input: MultiObjectiveBalanceInput): MultiObjectiveBalanceResult {
    const { objectives, constraints, candidates } = input;
    if (objectives.length === 0) throw new Error('Need at least one objective');
    if (candidates <= 0) throw new Error('candidates must be positive');

    // Check feasibility for each candidate
    const feasible = new Array(candidates).fill(true);
    if (constraints) {
      for (const c of constraints) {
        for (let i = 0; i < candidates; i++) {
          if (c.values[i] > c.limit) feasible[i] = false;
        }
      }
    }
    const feasibleCount = feasible.filter(Boolean).length;

    // Normalize objectives to [0,1] and compute weighted scores
    const scores = new Array(candidates).fill(0);
    for (const obj of objectives) {
      const vals = obj.values;
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      const range = maxV - minV || 1;
      for (let i = 0; i < candidates; i++) {
        const norm = (vals[i] - minV) / range;
        const directed = (obj.minimize !== false) ? norm : (1 - norm);
        scores[i] += obj.weight * directed;
      }
    }

    // Penalize infeasible
    for (let i = 0; i < candidates; i++) {
      if (!feasible[i]) scores[i] += 1e6;
    }

    // Find best
    let bestIndex = 0;
    for (let i = 1; i < candidates; i++) {
      if (scores[i] < scores[bestIndex]) bestIndex = i;
    }

    // Pareto front (non-dominated among feasible)
    const paretoFront: number[] = [];
    for (let i = 0; i < candidates; i++) {
      if (!feasible[i]) continue;
      let dominated = false;
      for (let j = 0; j < candidates; j++) {
        if (i === j || !feasible[j]) continue;
        const allBetterOrEqual = objectives.every(obj => {
          const sign = (obj.minimize !== false) ? 1 : -1;
          return sign * obj.values[j] <= sign * obj.values[i];
        });
        const strictlyBetter = objectives.some(obj => {
          const sign = (obj.minimize !== false) ? 1 : -1;
          return sign * obj.values[j] < sign * obj.values[i];
        });
        if (allBetterOrEqual && strictlyBetter) { dominated = true; break; }
      }
      if (!dominated) paretoFront.push(i);
    }

    return {
      bestIndex,
      bestScore: scores[bestIndex],
      scores,
      feasibleCount,
      paretoFrontIndices: paretoFront,
      formula: `x* = argmin Σwi×fi, best candidate index = ${bestIndex}, score = ${scores[bestIndex].toFixed(4)}`,
      confidence: feasibleCount > 0 ? 0.85 : 0.4,
    };
  }

  /**
   * HYB-012: Robust Optimization
   * x* = argmin [α × f_nominal + (1-α) × f_worst_case]
   *
   * Minimax robustness: balances nominal performance with worst-case resilience.
   */
  robustOptimization(input: RobustOptimizationInput): RobustOptimizationResult {
    const { nominalObjective, worstCaseObjective } = input;
    const alpha = input.robustnessWeight ?? 0.5;
    if (nominalObjective.length !== worstCaseObjective.length) {
      throw new Error('nominalObjective and worstCaseObjective must have same length');
    }
    if (nominalObjective.length === 0) throw new Error('Need at least one candidate');

    const scores = nominalObjective.map((nom, i) =>
      alpha * nom + (1 - alpha) * worstCaseObjective[i]
    );

    let bestIndex = 0;
    let nomBestIndex = 0;
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] < scores[bestIndex]) bestIndex = i;
      if (nominalObjective[i] < nominalObjective[nomBestIndex]) nomBestIndex = i;
    }

    const robustnessGap = nominalObjective[bestIndex] - nominalObjective[nomBestIndex];

    return {
      bestIndex,
      bestRobustScore: scores[bestIndex],
      scores,
      nominalBestIndex: nomBestIndex,
      robustnessGap,
      formula: `x* = argmin [${alpha}×f_nom + ${(1 - alpha).toFixed(2)}×f_worst], best = index ${bestIndex}`,
      confidence: 0.82,
    };
  }

  /**
   * HYB-013: Stochastic Optimization
   * x* = argmin E[f(x,ξ)]
   *
   * Minimizes expected objective over uncertain scenarios, with optional CVaR risk measure.
   */
  stochasticOptimization(input: StochasticOptimizationInput): StochasticOptimizationResult {
    const { candidateScenarios } = input;
    const riskAversion = input.riskAversion ?? 0;
    const alphaLevel = input.alpha ?? 0.95;
    if (candidateScenarios.length === 0) throw new Error('Need at least one candidate');

    const nScenarios = candidateScenarios[0].length;
    const probs = input.scenarioProbabilities ?? new Array(nScenarios).fill(1 / nScenarios);

    const expectedValues: number[] = [];
    const cvarValues: number[] = [];

    for (const scenarios of candidateScenarios) {
      // E[f]
      const ev = scenarios.reduce((s, v, i) => s + v * probs[i], 0);
      expectedValues.push(ev);

      // CVaR: sort scenarios, take tail average above alpha quantile
      const sorted = [...scenarios].sort((a, b) => a - b);
      const tailStart = Math.floor(alphaLevel * sorted.length);
      const tail = sorted.slice(tailStart);
      const cvar = tail.length > 0 ? mean(tail) : ev;
      cvarValues.push(cvar);
    }

    // Blended objective: (1-ρ)×E[f] + ρ×CVaR
    const blended = expectedValues.map((ev, i) =>
      (1 - riskAversion) * ev + riskAversion * cvarValues[i]
    );

    let bestIndex = 0;
    for (let i = 1; i < blended.length; i++) {
      if (blended[i] < blended[bestIndex]) bestIndex = i;
    }

    return {
      bestIndex,
      expectedValues,
      cvarValues,
      bestExpected: expectedValues[bestIndex],
      bestCVaR: cvarValues[bestIndex],
      formula: `x* = argmin [(1-${riskAversion})×E[f] + ${riskAversion}×CVaR], best = index ${bestIndex}`,
      confidence: nScenarios >= 10 ? 0.85 : 0.65,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP D: Online Learning (Formulas 14-16)
  // ════════════════════════════════════════════════════════════════════════════

  onlineLearning(subAction: string, params: any): any {
    switch (subAction) {
      case 'online_learning_force':
        return this.onlineLearningForce(params);
      case 'transfer_learning':
        return this.transferLearning(params);
      case 'meta_learning_rate':
        return this.metaLearningRate(params);
      default:
        throw new Error(`Unknown online learning sub-action: ${subAction}`);
    }
  }

  /**
   * HYB-014: Online Learning Force
   * kc(t) = kc(t-1) + η × (Fc_actual - Fc_pred)
   *
   * Stochastic gradient descent on specific cutting force using force prediction errors.
   */
  onlineLearningForce(input: OnlineLearningForceInput): OnlineLearningForceResult {
    const { kc_initial, observations, learningRate } = input;
    const chipArea = input.chipArea_mm2 ?? 1.0;
    if (kc_initial <= 0) throw new Error('kc_initial must be positive');
    if (observations.length === 0) throw new Error('Need at least one observation');

    let kc = kc_initial;
    const history: number[] = [kc];

    for (const obs of observations) {
      const error = obs.Fc_actual_N - obs.Fc_predicted_N;
      // Scale correction by chip area to keep kc in N/mm² units
      kc += learningRate * error / chipArea;
      kc = Math.max(kc, 1); // prevent negative/zero
      history.push(kc);
    }

    const totalCorrection = kc - kc_initial;
    // Convergence: ratio of last-half std to first-half std
    const firstHalf = history.slice(0, Math.ceil(history.length / 2));
    const secondHalf = history.slice(Math.ceil(history.length / 2));
    const convergenceRate = variance(firstHalf) > 0
      ? 1 - Math.sqrt(variance(secondHalf)) / Math.sqrt(variance(firstHalf))
      : 0;

    return {
      kc_final: kc,
      kc_history: history,
      totalCorrection,
      convergenceRate: clamp(convergenceRate, 0, 1),
      formula: `kc(t) = kc(t-1) + ${learningRate} × (Fc_actual - Fc_pred) / chipArea`,
      confidence: clamp(0.6 + 0.05 * observations.length, 0.6, 0.95),
    };
  }

  /**
   * HYB-015: Transfer Learning
   * θ_target = θ_source + Δθ_adaptation
   *
   * Adapts source-domain model parameters to target domain using gradient-based adaptation.
   */
  transferLearning(input: TransferLearningInput): TransferLearningResult {
    const { sourceParams, targetObservations, sourcePredictsOnTarget } = input;
    const eta = input.adaptationRate ?? 0.1;
    if (targetObservations.length !== sourcePredictsOnTarget.length) {
      throw new Error('targetObservations and sourcePredictsOnTarget must have same length');
    }
    if (sourceParams.length === 0) throw new Error('sourceParams cannot be empty');

    // Compute residuals in target domain
    const residuals = targetObservations.map((obs, i) => obs - sourcePredictsOnTarget[i]);
    const meanResidual = mean(residuals);
    const sourceRMSE = Math.sqrt(mean(residuals.map(r => r ** 2)));

    // Simple adaptation: shift each parameter by scaled mean residual
    // More sophisticated: per-parameter gradient would require feature matrix
    const adaptationDelta = sourceParams.map((_, i) => {
      // Scale adaptation by parameter magnitude to maintain proportionality
      const scale = Math.abs(sourceParams[i]) > 0 ? eta * meanResidual / Math.abs(sourceParams[i]) : eta * meanResidual;
      return scale;
    });

    const targetParams = sourceParams.map((p, i) => p + adaptationDelta[i]);

    // Estimate adapted RMSE (rough: reduce by adaptation magnitude)
    const adaptedRMSE = Math.max(sourceRMSE * (1 - eta), sourceRMSE * 0.1);
    const improvement = sourceRMSE > 0 ? ((sourceRMSE - adaptedRMSE) / sourceRMSE) * 100 : 0;

    return {
      targetParams,
      adaptationDelta,
      transferGap: Math.abs(meanResidual),
      adaptedRMSE,
      sourceRMSE,
      improvementPercent: improvement,
      formula: `θ_target = θ_source + Δθ, transfer gap = ${Math.abs(meanResidual).toFixed(4)}`,
      confidence: clamp(0.6 + 0.05 * targetObservations.length, 0.5, 0.85),
    };
  }

  /**
   * HYB-016: Meta-Learning Rate
   * η(task) = η_base × sim(task, trained_tasks)
   *
   * Adapts learning rate based on cosine similarity to previously trained tasks.
   * High similarity → full learning rate; low similarity → reduced rate.
   */
  metaLearningRate(input: MetaLearningRateInput): MetaLearningRateResult {
    const { baseRate, taskFeatures, trainedTaskFeatures } = input;
    if (taskFeatures.length === 0) throw new Error('taskFeatures cannot be empty');
    if (trainedTaskFeatures.length === 0) throw new Error('Need at least one trained task');

    // Cosine similarity between current task and each trained task
    const similarities = trainedTaskFeatures.map(trained => {
      const dot = taskFeatures.reduce((s, v, i) => s + v * (trained[i] ?? 0), 0);
      const normA = Math.sqrt(taskFeatures.reduce((s, v) => s + v ** 2, 0));
      const normB = Math.sqrt(trained.reduce((s, v) => s + v ** 2, 0));
      return (normA > 0 && normB > 0) ? dot / (normA * normB) : 0;
    });

    // Max similarity determines the most relevant trained task
    let mostSimilarIdx = 0;
    for (let i = 1; i < similarities.length; i++) {
      if (similarities[i] > similarities[mostSimilarIdx]) mostSimilarIdx = i;
    }
    const maxSim = clamp(similarities[mostSimilarIdx], 0, 1);

    // If trained task rates available, weight by similarity; else scale base rate
    let adaptedRate: number;
    if (input.trainedTaskRates && input.trainedTaskRates.length === trainedTaskFeatures.length) {
      const weights = softmax(similarities.map(s => s * 10)); // temperature-scaled
      adaptedRate = weights.reduce((s, w, i) => s + w * input.trainedTaskRates![i], 0);
    } else {
      adaptedRate = baseRate * clamp(maxSim, 0.1, 1.0);
    }

    return {
      adaptedRate,
      similarity: maxSim,
      mostSimilarTaskIndex: mostSimilarIdx,
      formula: `η(task) = η_base × sim = ${baseRate} × ${maxSim.toFixed(3)} = ${adaptedRate.toFixed(4)}`,
      confidence: maxSim > 0.7 ? 0.85 : 0.6,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP E: System Level (Formulas 17-20)
  // ════════════════════════════════════════════════════════════════════════════

  systemLevel(subAction: string, params: any): any {
    switch (subAction) {
      case 'unified_machining_model':
        return this.unifiedMachiningModel(params);
      case 'self_optimizing_process':
        return this.selfOptimizingProcess(params);
      case 'explainable_prediction':
        return this.explainablePrediction(params);
      case 'confidence_weighted_ensemble':
        return this.confidenceWeightedEnsemble(params);
      default:
        throw new Error(`Unknown system level sub-action: ${subAction}`);
    }
  }

  /**
   * HYB-017: Unified Machining Model
   * output = f_unified(material, machine, tool, process)
   *
   * Combines Kienzle force, power, Taylor tool life, geometric Ra, and MRR
   * into a single unified prediction with constraint checking.
   */
  unifiedMachiningModel(input: UnifiedMachiningModelInput): UnifiedMachiningModelResult {
    const { material, machine, tool, process } = input;
    const { speed_mpm, feed_mmrev, depth_mm } = process;
    const width_mm = process.width_mm ?? tool.diameter_mm;

    // Kienzle cutting force: Fc = kc1.1 × ap × f^(1-mc)
    // Estimate kc1.1 from tensile strength: kc1.1 ≈ 0.7 × σ_UTS for steels
    const kc1_1 = 0.7 * material.tensile_MPa;
    const mc = 0.25; // typical
    const h = feed_mmrev; // uncut chip thickness ≈ feed for turning
    const Fc = kc1_1 * depth_mm * h ** (1 - mc);

    // Power: P = Fc × Vc / 60000
    const power_kW = (Fc * speed_mpm) / 60000;

    // Geometric surface roughness: Ra ≈ f²/(32×r_nose)
    const noseRadius = tool.diameter_mm / 2; // approximation for turning
    const Ra_um = (feed_mmrev ** 2 / (32 * (noseRadius > 0 ? noseRadius : 0.4))) * 1000;

    // Taylor tool life: T = C / V^n, with C estimated from material
    const taylorN = 0.25;
    const taylorC = 200 * (800 / material.tensile_MPa) ** 0.5; // adjusted
    const toolLife_min = taylorC / (speed_mpm ** (1 / taylorN));

    // MRR
    const mrr = speed_mpm * 1000 * feed_mmrev * depth_mm / 1000; // cm³/min approx

    // Machinability index (0-1): higher = easier to machine
    const machinIndex = clamp(
      0.5 * (1 - material.tensile_MPa / 2000) +
      0.3 * (material.thermalCond_W_mK / 50) +
      0.2 * (1 - power_kW / machine.power_kW),
      0, 1
    );

    // RPM check
    const rpm = (speed_mpm * 1000) / (Math.PI * tool.diameter_mm);

    return {
      cuttingForce_N: Fc,
      power_kW,
      surfaceRoughness_um: Ra_um,
      toolLife_min: Math.max(toolLife_min, 0.1),
      mrr_cm3_min: mrr,
      machinability_index: machinIndex,
      constraints: {
        power_ok: power_kW <= machine.power_kW,
        force_ok: Fc <= machine.rigidity_N_um * 50, // rough force limit from rigidity
        speed_ok: rpm <= machine.maxRPM,
      },
      formula: `Fc=${Fc.toFixed(0)}N, P=${power_kW.toFixed(2)}kW, Ra=${Ra_um.toFixed(2)}μm, T=${toolLife_min.toFixed(1)}min, MRR=${mrr.toFixed(1)}cm³/min`,
      confidence: 0.75,
    };
  }

  /**
   * HYB-018: Self-Optimizing Process
   * params_next = optimize(params_current, performance)
   *
   * Gradient-free optimization: adjusts parameters toward targets using
   * constraint-violation-proportional steps.
   */
  selfOptimizingProcess(input: SelfOptimizingProcessInput): SelfOptimizingProcessResult {
    const { currentParams, performance, targets } = input;
    const step = input.stepSize ?? 0.05;

    const violated: string[] = [];
    let speedAdj = 0, feedAdj = 0, depthAdj = 0;

    // Force too high → reduce feed and depth
    if (targets.maxForce_N && performance.force_N > targets.maxForce_N) {
      const excess = (performance.force_N - targets.maxForce_N) / targets.maxForce_N;
      feedAdj -= step * clamp(excess, 0.1, 1);
      depthAdj -= step * clamp(excess * 0.5, 0.05, 0.5);
      violated.push('force');
    }

    // Roughness too high → reduce feed
    if (targets.maxRoughness_um && performance.roughness_um > targets.maxRoughness_um) {
      const excess = (performance.roughness_um - targets.maxRoughness_um) / targets.maxRoughness_um;
      feedAdj -= step * clamp(excess, 0.1, 1);
      violated.push('roughness');
    }

    // Wear too high → reduce speed
    if (targets.maxWear_mm && performance.toolWear_mm > targets.maxWear_mm) {
      const excess = (performance.toolWear_mm - targets.maxWear_mm) / targets.maxWear_mm;
      speedAdj -= step * clamp(excess, 0.1, 1);
      violated.push('wear');
    }

    // MRR too low → increase feed and depth (only if no violations)
    if (targets.minMRR && performance.mrr_cm3_min < targets.minMRR && violated.length === 0) {
      const deficit = (targets.minMRR - performance.mrr_cm3_min) / targets.minMRR;
      feedAdj += step * clamp(deficit, 0.1, 0.5);
      depthAdj += step * clamp(deficit * 0.5, 0.05, 0.3);
    }

    const nextParams = {
      speed_mpm: currentParams.speed_mpm * (1 + speedAdj),
      feed_mmrev: currentParams.feed_mmrev * (1 + feedAdj),
      depth_mm: currentParams.depth_mm * (1 + depthAdj),
    };

    // Clamp to physical bounds
    nextParams.speed_mpm = Math.max(nextParams.speed_mpm, 1);
    nextParams.feed_mmrev = Math.max(nextParams.feed_mmrev, 0.01);
    nextParams.depth_mm = Math.max(nextParams.depth_mm, 0.05);

    const expectedImprovement = Math.abs(speedAdj) + Math.abs(feedAdj) + Math.abs(depthAdj);

    return {
      nextParams,
      adjustments: {
        speed_pct: speedAdj * 100,
        feed_pct: feedAdj * 100,
        depth_pct: depthAdj * 100,
      },
      violatedConstraints: violated,
      expectedImprovement,
      formula: `params_next = optimize(current, perf), adjustments: speed=${(speedAdj * 100).toFixed(1)}%, feed=${(feedAdj * 100).toFixed(1)}%, depth=${(depthAdj * 100).toFixed(1)}%`,
      confidence: violated.length === 0 ? 0.85 : 0.75,
    };
  }

  /**
   * HYB-019: Explainable Prediction
   * y, explanation = f_XAI(x)
   *
   * Linear model with per-feature contribution breakdown (SHAP-like local explanations).
   */
  explainablePrediction(input: ExplainablePredictionInput): ExplainablePredictionResult {
    const { features, coefficients, featureRanges } = input;
    const intercept = input.intercept ?? 0;
    if (features.length !== coefficients.length) {
      throw new Error('features and coefficients must have same length');
    }

    const contributions = features.map((f, i) => {
      const contrib = f.value * coefficients[i];
      return {
        feature: f.name,
        value: f.value,
        coefficient: coefficients[i],
        contribution: contrib,
        percentContribution: 0, // filled below
      };
    });

    const prediction = intercept + contributions.reduce((s, c) => s + c.contribution, 0);
    const totalAbsContrib = contributions.reduce((s, c) => s + Math.abs(c.contribution), 0);

    for (const c of contributions) {
      c.percentContribution = totalAbsContrib > 0
        ? (Math.abs(c.contribution) / totalAbsContrib) * 100
        : 0;
    }

    // Sort by absolute contribution descending
    const sorted = [...contributions].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    const topFeature = sorted.length > 0 ? sorted[0].feature : 'none';

    // Build explanation text
    const topN = sorted.slice(0, 3);
    const explanation = `Prediction ${prediction.toFixed(3)} driven by: ` +
      topN.map(c => `${c.feature} (${c.percentContribution.toFixed(1)}%)`).join(', ') +
      (intercept !== 0 ? ` + intercept ${intercept.toFixed(3)}` : '');

    return {
      prediction,
      contributions: sorted,
      topFeature,
      explanation,
      formula: `y = ${intercept.toFixed(2)} + Σ(coeff_i × x_i) = ${prediction.toFixed(3)}`,
      confidence: 0.9,
    };
  }

  /**
   * HYB-020: Confidence-Weighted Ensemble
   * ŷ = Σ(conf_i × ŷ_i) / Σconf_i
   *
   * Ensembles multiple model predictions weighted by their confidence scores.
   */
  confidenceWeightedEnsemble(input: ConfidenceWeightedEnsembleInput): ConfidenceWeightedEnsembleResult {
    const { models } = input;
    const minConf = input.minConfidence ?? 0;
    if (models.length === 0) throw new Error('Need at least one model');

    const filtered = models.filter(m => m.confidence >= minConf);
    if (filtered.length === 0) throw new Error('No models pass minConfidence threshold');

    const totalConf = filtered.reduce((s, m) => s + m.confidence, 0);
    const ensemblePred = filtered.reduce((s, m) => s + m.confidence * m.prediction, 0) / totalConf;

    const weights = filtered.map(m => ({
      name: m.name,
      normalizedWeight: m.confidence / totalConf,
    }));

    // Ensemble uncertainty: confidence-weighted variance of predictions
    const weightedVar = filtered.reduce((s, m) =>
      s + (m.confidence / totalConf) * (m.prediction - ensemblePred) ** 2, 0);
    const ensembleUncertainty = Math.sqrt(weightedVar);

    return {
      ensemblePrediction: ensemblePred,
      weights,
      ensembleUncertainty,
      modelCount: filtered.length,
      formula: `ŷ = Σ(conf_i × ŷ_i) / Σconf_i = ${ensemblePred.toFixed(4)}`,
      confidence: clamp(mean(filtered.map(m => m.confidence)), 0.3, 0.95),
    };
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────

export const physicsMLHybridEngine = new PhysicsMLHybridEngine();
