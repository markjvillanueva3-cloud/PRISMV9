/**
 * LatheTransferLearningEngine — Transfer Learning for Lathe Operations
 * =====================================================================
 * Transfers knowledge across materials, operations, and machines for lathe turning.
 *
 * Core Algorithms:
 *   1. Domain Adaptation — Source/target domain alignment via MMD
 *   2. Feature Extraction — Shared representations, bottleneck features
 *   3. Knowledge Transfer — Material→Material, Operation→Operation, Machine→Machine
 *   4. Similarity Metrics — Property-based domain matching
 *   5. Transfer Strategies — Direct, fine-tuning, feature-based, instance re-weighting
 *   6. Manufacturing Applications — New material inference, machine commissioning
 *
 * Mathematical Foundation:
 *   - Maximum Mean Discrepancy (MMD): MMD²(P,Q) = E[k(x,x')] - 2E[k(x,y)] + E[k(y,y')]
 *   - Domain-Adversarial Neural Network (DANN) concept: min_θf max_θd L_task - λ·L_domain
 *   - Transfer via Taylor equation: T = (C/Vc)^(1/n), n varies by material group
 *   - Kienzle force model: Fc = kc1.1 × b × h^(1-mc)
 *
 * References:
 *   - Pan & Yang (2010) "A Survey on Transfer Learning" IEEE TKDE
 *   - Gretton et al. (2012) "A Kernel Two-Sample Test" JMLR
 *   - Ganin & Lempitsky (2015) "Domain-Adversarial Training" ICML
 *   - Taylor (1907) "On the Art of Cutting Metals" ASME
 *   - Kienzle & Victor (1957) Specific cutting force model
 *
 * @module engines/LatheTransferLearningEngine
 * @version 1.0.0
 * @milestone LATHE-TRANSFER-AI
 */

import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE, CANONICAL_MATERIAL_DB } from "../physics/constants.js";

// ============================================================================
// TYPES — DOMAIN REPRESENTATIONS
// ============================================================================

/** Atomic value wrapper for PRISM compatibility */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence: number;
  source?: string;
  warning?: string;
}

/** Material domain representation */
export interface MaterialDomain {
  /** Material identifier (e.g., "4140", "D2", "17-4PH") */
  material_id: string;
  /** ISO material group (P, M, K, N, S, H) */
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  /** Brinell hardness (HB) */
  hardness_hb: number;
  /** Specific cutting force kc1.1 [N/mm²] */
  kc1_1: number;
  /** Kienzle exponent mc */
  mc: number;
  /** Tensile strength [MPa] */
  tensile_mpa: number;
  /** Thermal conductivity [W/mK] */
  thermal_k: number;
  /** Machinability index (AISI 1212 = 1.0) */
  machinability_index: number;
  /** Chip formation characteristic */
  chip_type: "continuous" | "segmented" | "discontinuous";
  /** Work hardening coefficient */
  work_hardening: number;
}

/** Operation domain representation */
export interface OperationDomain {
  /** Operation type */
  operation_type: "roughing" | "finishing" | "threading" | "grooving" | "boring" | "facing" | "parting";
  /** Typical depth of cut range [mm] */
  doc_range: { min: number; max: number };
  /** Typical feed range [mm/rev] */
  feed_range: { min: number; max: number };
  /** Surface finish target Ra [μm] */
  target_ra?: number;
  /** MRR priority (0-1, 1 = maximum MRR) */
  mrr_priority: number;
  /** Surface finish priority (0-1, 1 = best finish) */
  finish_priority: number;
  /** Tool life priority (0-1, 1 = maximum life) */
  life_priority: number;
  /** Typical tool nose radius [mm] */
  nose_radius_mm: number;
  /** Typical insert geometry */
  insert_geometry: "positive" | "negative" | "neutral";
}

/** Machine domain representation */
export interface MachineDomain {
  /** Machine identifier */
  machine_id: string;
  /** Machine type */
  machine_type: "2_axis_cnc" | "live_tooling" | "swiss" | "vtl" | "multi_spindle";
  /** Spindle power [kW] */
  spindle_power_kw: number;
  /** Maximum RPM */
  max_rpm: number;
  /** Maximum torque [Nm] */
  max_torque_nm: number;
  /** Static rigidity [N/μm] */
  rigidity_n_per_um: number;
  /** Swing diameter [mm] */
  swing_mm: number;
  /** Max workpiece length [mm] */
  max_length_mm: number;
  /** Controller type */
  controller: string;
  /** Year of manufacture */
  year?: number;
  /** Accuracy grade [mm] */
  accuracy_mm: number;
}

/** Shop domain representation */
export interface ShopDomain {
  /** Shop identifier */
  shop_id: string;
  /** Shop name */
  shop_name: string;
  /** Primary industry */
  industry: string;
  /** Typical materials processed */
  typical_materials: string[];
  /** Typical tolerances */
  tolerance_grade: "commercial" | "precision" | "ultra_precision";
  /** Coolant systems available */
  coolant_types: ("flood" | "mist" | "high_pressure" | "cryogenic" | "dry")[];
  /** Quality certifications */
  certifications: string[];
  /** Years in business */
  experience_years: number;
}

/** Cutting parameters to transfer */
export interface LatheCuttingParams {
  /** Cutting speed [m/min] */
  Vc: number;
  /** Feed [mm/rev] */
  f: number;
  /** Depth of cut [mm] */
  ap: number;
  /** Tool nose radius [mm] */
  nose_radius?: number;
  /** Lead angle [degrees] */
  lead_angle?: number;
  /** Insert grade */
  insert_grade?: string;
  /** Coolant type */
  coolant?: string;
}

/** Transfer result containing adapted parameters */
export interface TransferResult {
  /** Transferred parameters */
  params: LatheCuttingParams;
  /** Transfer confidence [0-1] */
  confidence: number;
  /** Transfer method used */
  method: TransferMethod;
  /** Adjustments applied */
  adjustments: TransferAdjustment[];
  /** Warnings/limitations */
  warnings: string[];
  /** Reasoning chain */
  reasoning: string[];
}

export type TransferMethod =
  | "direct"
  | "fine_tuning"
  | "feature_based"
  | "instance_reweighting"
  | "domain_adaptation"
  | "hybrid";

/** Individual adjustment made during transfer */
export interface TransferAdjustment {
  /** Parameter adjusted */
  parameter: string;
  /** Original value */
  original: number;
  /** Adjusted value */
  adjusted: number;
  /** Adjustment factor */
  factor: number;
  /** Reason for adjustment */
  reason: string;
  /** Source of adjustment logic */
  source: "physics" | "empirical" | "ml_model" | "tribal_knowledge";
}

/** Domain similarity result */
export interface DomainSimilarity {
  /** Overall similarity score [0-1] */
  similarity: number;
  /** Confidence in similarity estimate */
  confidence: number;
  /** Feature-level similarities */
  feature_similarities: Record<string, number>;
  /** Risk factors */
  risks: TransferRisk[];
  /** Recommended transfer strategy */
  recommended_strategy: TransferMethod;
}

/** Risk identified in transfer */
export interface TransferRisk {
  /** Risk category */
  category: "material" | "machine" | "operation" | "process";
  /** Severity (0-1) */
  severity: number;
  /** Description */
  description: string;
  /** Mitigation suggestion */
  mitigation: string;
}

/** Feature vector for domain representation */
export interface FeatureVector {
  /** Feature name */
  name: string;
  /** Feature values (normalized to [0,1]) */
  values: number[];
  /** Feature importance weights */
  weights: number[];
  /** Domain type */
  domain_type: "material" | "operation" | "machine" | "shop";
}

/** MMD computation result */
export interface MMDResult {
  /** MMD squared value */
  mmd_squared: number;
  /** P-value from permutation test */
  p_value: number;
  /** Statistical significance */
  significant: boolean;
  /** Number of source samples */
  n_source: number;
  /** Number of target samples */
  n_target: number;
  /** Kernel bandwidth */
  bandwidth: number;
}

/** Transfer effectiveness evaluation */
export interface TransferEvaluation {
  /** Transfer was successful */
  successful: boolean;
  /** Predicted vs actual performance */
  performance_ratio: number;
  /** Error metrics */
  errors: {
    speed_error_pct: number;
    feed_error_pct: number;
    life_error_pct: number;
    surface_error_pct: number;
  };
  /** Negative transfer detected */
  negative_transfer: boolean;
  /** Recommendations for improvement */
  recommendations: string[];
}

/** Historical performance record */
export interface PerformanceRecord {
  /** Timestamp */
  timestamp: Date;
  /** Material used */
  material_id: string;
  /** Operation type */
  operation: string;
  /** Machine used */
  machine_id: string;
  /** Parameters used */
  params: LatheCuttingParams;
  /** Achieved tool life [min] */
  tool_life_min: number;
  /** Surface finish Ra [μm] */
  surface_ra_um: number;
  /** Success flag */
  success: boolean;
  /** Notes */
  notes?: string;
}

/** Fine-tuning input */
export interface FineTuneInput {
  /** Base model/parameters */
  base_params: LatheCuttingParams;
  /** Target domain data */
  target_data: PerformanceRecord[];
  /** Learning rate (0-1) */
  learning_rate: number;
  /** Number of iterations */
  iterations: number;
  /** Regularization strength */
  regularization: number;
}

/** Instance reweighting result */
export interface ReweightingResult {
  /** Instance weights */
  weights: number[];
  /** Effective sample size */
  effective_n: number;
  /** Weight distribution statistics */
  weight_stats: {
    min: number;
    max: number;
    mean: number;
    std: number;
  };
}

// ============================================================================
// MATERIAL DATABASE — ISO P/M/K/N/S/H
// ============================================================================

const MATERIAL_DB: MaterialDomain[] = [
  // ISO P — Steel
  {
    material_id: "1018",
    iso_group: "P",
    hardness_hb: 126,
    kc1_1: 1700,
    mc: 0.25,
    tensile_mpa: 440,
    thermal_k: 51.9,
    machinability_index: 0.78,
    chip_type: "continuous",
    work_hardening: 0.15,
  },
  {
    material_id: "1045",
    iso_group: "P",
    hardness_hb: 200,
    kc1_1: 2100,
    mc: 0.25,
    tensile_mpa: 565,
    thermal_k: 49.8,
    machinability_index: 0.55,
    chip_type: "continuous",
    work_hardening: 0.18,
  },
  {
    material_id: "4140",
    iso_group: "P",
    hardness_hb: 235,
    kc1_1: 2200,
    mc: 0.26,
    tensile_mpa: 655,
    thermal_k: 42.7,
    machinability_index: 0.45,
    chip_type: "continuous",
    work_hardening: 0.20,
  },
  {
    material_id: "4340",
    iso_group: "P",
    hardness_hb: 280,
    kc1_1: 2400,
    mc: 0.26,
    tensile_mpa: 745,
    thermal_k: 44.5,
    machinability_index: 0.40,
    chip_type: "continuous",
    work_hardening: 0.22,
  },
  {
    material_id: "8620",
    iso_group: "P",
    hardness_hb: 180,
    kc1_1: 1900,
    mc: 0.25,
    tensile_mpa: 530,
    thermal_k: 46.6,
    machinability_index: 0.60,
    chip_type: "continuous",
    work_hardening: 0.16,
  },
  // ISO M — Stainless Steel
  {
    material_id: "304",
    iso_group: "M",
    hardness_hb: 190,
    kc1_1: 2500,
    mc: 0.28,
    tensile_mpa: 515,
    thermal_k: 16.2,
    machinability_index: 0.36,
    chip_type: "continuous",
    work_hardening: 0.45,
  },
  {
    material_id: "316",
    iso_group: "M",
    hardness_hb: 217,
    kc1_1: 2600,
    mc: 0.28,
    tensile_mpa: 485,
    thermal_k: 16.3,
    machinability_index: 0.32,
    chip_type: "continuous",
    work_hardening: 0.48,
  },
  {
    material_id: "17-4PH",
    iso_group: "M",
    hardness_hb: 340,
    kc1_1: 2800,
    mc: 0.30,
    tensile_mpa: 1070,
    thermal_k: 18.4,
    machinability_index: 0.28,
    chip_type: "continuous",
    work_hardening: 0.35,
  },
  {
    material_id: "410",
    iso_group: "M",
    hardness_hb: 220,
    kc1_1: 2400,
    mc: 0.27,
    tensile_mpa: 480,
    thermal_k: 24.9,
    machinability_index: 0.42,
    chip_type: "continuous",
    work_hardening: 0.30,
  },
  // ISO K — Cast Iron
  {
    material_id: "gray_iron",
    iso_group: "K",
    hardness_hb: 220,
    kc1_1: 1200,
    mc: 0.22,
    tensile_mpa: 250,
    thermal_k: 46,
    machinability_index: 0.65,
    chip_type: "discontinuous",
    work_hardening: 0.05,
  },
  {
    material_id: "ductile_iron",
    iso_group: "K",
    hardness_hb: 250,
    kc1_1: 1500,
    mc: 0.24,
    tensile_mpa: 400,
    thermal_k: 36,
    machinability_index: 0.50,
    chip_type: "segmented",
    work_hardening: 0.10,
  },
  // ISO N — Non-ferrous
  {
    material_id: "6061-T6",
    iso_group: "N",
    hardness_hb: 95,
    kc1_1: 800,
    mc: 0.20,
    tensile_mpa: 310,
    thermal_k: 167,
    machinability_index: 1.80,
    chip_type: "continuous",
    work_hardening: 0.08,
  },
  {
    material_id: "7075-T6",
    iso_group: "N",
    hardness_hb: 150,
    kc1_1: 900,
    mc: 0.21,
    tensile_mpa: 572,
    thermal_k: 130,
    machinability_index: 1.40,
    chip_type: "continuous",
    work_hardening: 0.10,
  },
  {
    material_id: "C360_brass",
    iso_group: "N",
    hardness_hb: 120,
    kc1_1: 700,
    mc: 0.18,
    tensile_mpa: 340,
    thermal_k: 115,
    machinability_index: 2.00,
    chip_type: "discontinuous",
    work_hardening: 0.05,
  },
  // ISO S — Heat Resistant Alloys
  {
    material_id: "inconel_718",
    iso_group: "S",
    hardness_hb: 360,
    kc1_1: 3000,
    mc: 0.32,
    tensile_mpa: 1035,
    thermal_k: 11.4,
    machinability_index: 0.12,
    chip_type: "segmented",
    work_hardening: 0.55,
  },
  {
    material_id: "Ti-6Al-4V",
    iso_group: "S",
    hardness_hb: 334,
    kc1_1: 1800,
    mc: 0.30,
    tensile_mpa: 880,
    thermal_k: 6.7,
    machinability_index: 0.22,
    chip_type: "segmented",
    work_hardening: 0.40,
  },
  {
    material_id: "waspaloy",
    iso_group: "S",
    hardness_hb: 380,
    kc1_1: 3200,
    mc: 0.33,
    tensile_mpa: 1280,
    thermal_k: 10.7,
    machinability_index: 0.10,
    chip_type: "segmented",
    work_hardening: 0.58,
  },
  // ISO H — Hardened Steel
  {
    material_id: "D2_hardened",
    iso_group: "H",
    hardness_hb: 550,
    kc1_1: 3500,
    mc: 0.35,
    tensile_mpa: 1900,
    thermal_k: 20.0,
    machinability_index: 0.15,
    chip_type: "segmented",
    work_hardening: 0.10,
  },
  {
    material_id: "M2_hardened",
    iso_group: "H",
    hardness_hb: 610,
    kc1_1: 3800,
    mc: 0.36,
    tensile_mpa: 2200,
    thermal_k: 24.2,
    machinability_index: 0.12,
    chip_type: "segmented",
    work_hardening: 0.08,
  },
  {
    material_id: "S7_hardened",
    iso_group: "H",
    hardness_hb: 520,
    kc1_1: 3300,
    mc: 0.34,
    tensile_mpa: 1750,
    thermal_k: 27.0,
    machinability_index: 0.18,
    chip_type: "segmented",
    work_hardening: 0.12,
  },
];

// ============================================================================
// OPERATION TEMPLATES
// ============================================================================

const OPERATION_TEMPLATES: OperationDomain[] = [
  {
    operation_type: "roughing",
    doc_range: { min: 1.0, max: 5.0 },
    feed_range: { min: 0.2, max: 0.5 },
    mrr_priority: 0.9,
    finish_priority: 0.2,
    life_priority: 0.6,
    nose_radius_mm: 0.8,
    insert_geometry: "negative",
  },
  {
    operation_type: "finishing",
    doc_range: { min: 0.1, max: 0.5 },
    feed_range: { min: 0.05, max: 0.15 },
    target_ra: 1.6,
    mrr_priority: 0.2,
    finish_priority: 0.9,
    life_priority: 0.5,
    nose_radius_mm: 0.4,
    insert_geometry: "positive",
  },
  {
    operation_type: "threading",
    doc_range: { min: 0.1, max: 0.3 },
    feed_range: { min: 0.0, max: 0.0 }, // thread pitch determines feed
    mrr_priority: 0.3,
    finish_priority: 0.7,
    life_priority: 0.7,
    nose_radius_mm: 0.0, // pointed insert
    insert_geometry: "neutral",
  },
  {
    operation_type: "grooving",
    doc_range: { min: 0.5, max: 3.0 },
    feed_range: { min: 0.05, max: 0.15 },
    mrr_priority: 0.5,
    finish_priority: 0.6,
    life_priority: 0.7,
    nose_radius_mm: 0.2,
    insert_geometry: "neutral",
  },
  {
    operation_type: "boring",
    doc_range: { min: 0.2, max: 2.0 },
    feed_range: { min: 0.08, max: 0.25 },
    target_ra: 3.2,
    mrr_priority: 0.5,
    finish_priority: 0.7,
    life_priority: 0.6,
    nose_radius_mm: 0.4,
    insert_geometry: "positive",
  },
  {
    operation_type: "facing",
    doc_range: { min: 0.5, max: 3.0 },
    feed_range: { min: 0.15, max: 0.35 },
    mrr_priority: 0.7,
    finish_priority: 0.5,
    life_priority: 0.6,
    nose_radius_mm: 0.8,
    insert_geometry: "negative",
  },
  {
    operation_type: "parting",
    doc_range: { min: 0.0, max: 0.0 }, // width determines doc
    feed_range: { min: 0.05, max: 0.12 },
    mrr_priority: 0.6,
    finish_priority: 0.4,
    life_priority: 0.8,
    nose_radius_mm: 0.2,
    insert_geometry: "neutral",
  },
];

// ============================================================================
// CONSTANTS
// ============================================================================

/** Taylor exponent defaults by ISO group */
const TAYLOR_N: Record<string, number> = {
  P: 0.25,
  M: 0.20,
  K: 0.30,
  N: 0.35,
  S: 0.15,
  H: 0.12,
};

/** Typical cutting speed ranges by ISO group [m/min] */
const SPEED_RANGES: Record<string, { min: number; max: number; typical: number }> = {
  P: { min: 150, max: 350, typical: 250 },
  M: { min: 80, max: 200, typical: 140 },
  K: { min: 120, max: 400, typical: 250 },
  N: { min: 300, max: 1000, typical: 600 },
  S: { min: 20, max: 80, typical: 45 },
  H: { min: 50, max: 150, typical: 80 },
};

/** RBF kernel bandwidth for MMD */
const DEFAULT_MMD_BANDWIDTH = 1.0;

/** Minimum similarity for direct transfer */
const DIRECT_TRANSFER_THRESHOLD = 0.85;

/** Minimum similarity for fine-tuning */
const FINETUNE_THRESHOLD = 0.60;

/** Negative transfer detection threshold */
const NEGATIVE_TRANSFER_THRESHOLD = -0.05;

// ============================================================================
// LATHE TRANSFER LEARNING ENGINE
// ============================================================================

export class LatheTransferLearningEngine {
  private materialDb: MaterialDomain[] = [...MATERIAL_DB];
  private operationTemplates: OperationDomain[] = [...OPERATION_TEMPLATES];
  private performanceHistory: PerformanceRecord[] = [];

  constructor() {
    log.info("[LatheTransferLearning] Engine initialized with transfer learning capabilities");
  }

  // ==========================================================================
  // MAIN TRANSFER METHOD
  // ==========================================================================

  /**
   * Transfer knowledge from source to target domain.
   *
   * Automatically selects the best transfer strategy based on domain similarity:
   *   - similarity > 0.85: Direct transfer
   *   - similarity > 0.60: Fine-tuning
   *   - similarity > 0.40: Feature-based transfer
   *   - similarity <= 0.40: Instance reweighting
   *
   * @param source - Source domain parameters and context
   * @param target - Target domain description
   * @returns Transferred parameters with confidence and reasoning
   */
  transferKnowledge(
    source: {
      params: LatheCuttingParams;
      material: MaterialDomain;
      operation: OperationDomain;
      machine: MachineDomain;
      performance?: PerformanceRecord[];
    },
    target: {
      material: MaterialDomain;
      operation?: OperationDomain;
      machine?: MachineDomain;
    }
  ): AtomicValue<TransferResult> {
    const startTime = Date.now();
    const reasoning: string[] = [];
    const adjustments: TransferAdjustment[] = [];
    const warnings: string[] = [];

    reasoning.push(`Transfer learning initiated: ${source.material.material_id} → ${target.material.material_id}`);

    // Step 1: Compute domain similarities
    const materialSim = this.computeMaterialSimilarity(source.material, target.material);
    const operationSim = target.operation
      ? this.computeOperationSimilarity(source.operation, target.operation)
      : 1.0;
    const machineSim = target.machine
      ? this.computeMachineSimilarity(source.machine, target.machine)
      : 1.0;

    // Weighted overall similarity
    const overallSim = 0.5 * materialSim + 0.3 * operationSim + 0.2 * machineSim;
    reasoning.push(
      `Domain similarities: material=${materialSim.toFixed(3)}, ` +
      `operation=${operationSim.toFixed(3)}, machine=${machineSim.toFixed(3)}`
    );
    reasoning.push(`Overall similarity: ${overallSim.toFixed(3)}`);

    // Step 2: Select transfer strategy
    let method: TransferMethod;
    if (overallSim >= DIRECT_TRANSFER_THRESHOLD) {
      method = "direct";
      reasoning.push("Strategy: Direct transfer (high similarity)");
    } else if (overallSim >= FINETUNE_THRESHOLD) {
      method = "fine_tuning";
      reasoning.push("Strategy: Fine-tuning (moderate similarity)");
    } else if (overallSim >= 0.40) {
      method = "feature_based";
      reasoning.push("Strategy: Feature-based transfer (low similarity)");
    } else {
      method = "instance_reweighting";
      reasoning.push("Strategy: Instance reweighting (very low similarity)");
      warnings.push("Low domain similarity — transferred parameters may require validation");
    }

    // Step 3: Apply transfer based on strategy
    let transferredParams = { ...source.params };
    let confidence = overallSim;

    // Material-based speed scaling
    const speedAdj = this.scaleCuttingSpeed(source.material, target.material, source.params.Vc);
    if (speedAdj.factor !== 1.0) {
      adjustments.push({
        parameter: "Vc",
        original: source.params.Vc,
        adjusted: speedAdj.adjusted,
        factor: speedAdj.factor,
        reason: speedAdj.reason,
        source: "physics",
      });
      transferredParams.Vc = speedAdj.adjusted;
    }

    // Feed scaling based on specific cutting force ratio
    const feedAdj = this.scaleFeed(source.material, target.material, source.params.f);
    if (feedAdj.factor !== 1.0) {
      adjustments.push({
        parameter: "f",
        original: source.params.f,
        adjusted: feedAdj.adjusted,
        factor: feedAdj.factor,
        reason: feedAdj.reason,
        source: "physics",
      });
      transferredParams.f = feedAdj.adjusted;
    }

    // Depth of cut scaling based on machinability
    const docAdj = this.scaleDepthOfCut(source.material, target.material, source.params.ap);
    if (docAdj.factor !== 1.0) {
      adjustments.push({
        parameter: "ap",
        original: source.params.ap,
        adjusted: docAdj.adjusted,
        factor: docAdj.factor,
        reason: docAdj.reason,
        source: "physics",
      });
      transferredParams.ap = docAdj.adjusted;
    }

    // Machine capability adjustments
    if (target.machine) {
      const machineAdj = this.applyMachineConstraints(
        transferredParams,
        source.machine,
        target.machine
      );
      adjustments.push(...machineAdj.adjustments);
      transferredParams = machineAdj.params;
      warnings.push(...machineAdj.warnings);
      confidence *= machineAdj.confidenceFactor;
    }

    // Operation-specific adjustments
    if (target.operation && target.operation.operation_type !== source.operation.operation_type) {
      const opAdj = this.applyOperationAdjustments(
        transferredParams,
        source.operation,
        target.operation
      );
      adjustments.push(...opAdj.adjustments);
      transferredParams = opAdj.params;
      reasoning.push(
        `Operation change: ${source.operation.operation_type} → ${target.operation.operation_type}`
      );
    }

    // Fine-tuning with historical data if available
    if (method === "fine_tuning" && source.performance && source.performance.length > 0) {
      const fineTuned = this.fineTuneParams({
        base_params: transferredParams,
        target_data: source.performance.filter(
          (r) => this.computeMaterialSimilarity(
            this.getMaterial(r.material_id),
            target.material
          ) > 0.5
        ),
        learning_rate: 0.1,
        iterations: 5,
        regularization: 0.01,
      });
      if (fineTuned.improved) {
        transferredParams = fineTuned.params;
        confidence = Math.min(confidence + 0.05, 0.95);
        reasoning.push("Fine-tuning applied from historical data");
      }
    }

    // Feature-based adaptation for low similarity
    if (method === "feature_based" || method === "instance_reweighting") {
      const adapted = this.adaptFeatures(
        this.extractFeatures(source.material, source.operation, source.machine),
        target.material,
        target.operation,
        target.machine
      );
      // Apply feature-based corrections
      const featureCorr = 1.0 - adapted.feature_distance * 0.1;
      confidence *= Math.max(0.5, featureCorr);
      reasoning.push(`Feature adaptation applied (distance=${adapted.feature_distance.toFixed(3)})`);
    }

    // Final validation
    const validatedParams = this.validateParams(transferredParams, target.material);
    if (validatedParams.clamped) {
      warnings.push("Parameters clamped to safe ranges for target material");
      transferredParams = validatedParams.params;
      confidence *= 0.9;
    }

    const elapsed = Date.now() - startTime;
    reasoning.push(`Transfer completed in ${elapsed}ms`);

    return {
      value: {
        params: transferredParams,
        confidence,
        method,
        adjustments,
        warnings,
        reasoning,
      },
      unit: "mixed",
      formula: "Transfer via MMD alignment + physics scaling",
      confidence,
      source: "LatheTransferLearningEngine",
    };
  }

  // ==========================================================================
  // SIMILARITY COMPUTATION
  // ==========================================================================

  /**
   * Compute similarity between two domains using weighted feature comparison.
   *
   * @param domain1 - First domain
   * @param domain2 - Second domain
   * @returns Overall similarity and breakdown
   */
  computeSimilarity(
    domain1: MaterialDomain | OperationDomain | MachineDomain,
    domain2: MaterialDomain | OperationDomain | MachineDomain
  ): AtomicValue<DomainSimilarity> {
    // Detect domain type and delegate
    if ("iso_group" in domain1 && "iso_group" in domain2) {
      return this.computeMaterialSimilarityDetailed(
        domain1 as MaterialDomain,
        domain2 as MaterialDomain
      );
    } else if ("operation_type" in domain1 && "operation_type" in domain2) {
      return this.computeOperationSimilarityDetailed(
        domain1 as OperationDomain,
        domain2 as OperationDomain
      );
    } else if ("spindle_power_kw" in domain1 && "spindle_power_kw" in domain2) {
      return this.computeMachineSimilarityDetailed(
        domain1 as MachineDomain,
        domain2 as MachineDomain
      );
    }

    return {
      value: {
        similarity: 0,
        confidence: 0,
        feature_similarities: {},
        risks: [{ category: "process", severity: 1, description: "Incompatible domain types", mitigation: "Ensure matching domain types" }],
        recommended_strategy: "instance_reweighting",
      },
      unit: "dimensionless",
      confidence: 0,
    };
  }

  /**
   * Compute material similarity using weighted feature comparison.
   *
   * Features compared:
   *   - ISO group match (0 or 1)
   *   - Hardness ratio (normalized)
   *   - Thermal conductivity ratio
   *   - Machinability index ratio
   *   - Specific cutting force ratio
   *   - Work hardening similarity
   *
   * @returns Similarity score [0-1]
   */
  private computeMaterialSimilarity(m1: MaterialDomain, m2: MaterialDomain): number {
    const weights = {
      iso_group: 0.30,
      hardness: 0.20,
      thermal: 0.15,
      machinability: 0.20,
      kc: 0.10,
      work_hardening: 0.05,
    };

    // ISO group match
    const isoMatch = m1.iso_group === m2.iso_group ? 1.0 : 0.3;

    // Hardness similarity (ratio, capped at 1)
    const hbRatio = Math.min(m1.hardness_hb, m2.hardness_hb) / Math.max(m1.hardness_hb, m2.hardness_hb);

    // Thermal conductivity similarity
    const kRatio = Math.min(m1.thermal_k, m2.thermal_k) / Math.max(m1.thermal_k, m2.thermal_k);

    // Machinability index similarity
    const miRatio = Math.min(m1.machinability_index, m2.machinability_index) /
                    Math.max(m1.machinability_index, m2.machinability_index);

    // Specific cutting force similarity
    const kcRatio = Math.min(m1.kc1_1, m2.kc1_1) / Math.max(m1.kc1_1, m2.kc1_1);

    // Work hardening similarity
    const whDiff = Math.abs(m1.work_hardening - m2.work_hardening);
    const whSim = 1 - whDiff / 0.5; // Normalize assuming max diff of 0.5

    return (
      weights.iso_group * isoMatch +
      weights.hardness * hbRatio +
      weights.thermal * kRatio +
      weights.machinability * miRatio +
      weights.kc * kcRatio +
      weights.work_hardening * Math.max(0, whSim)
    );
  }

  /**
   * Compute detailed material similarity with feature breakdown.
   */
  private computeMaterialSimilarityDetailed(
    m1: MaterialDomain,
    m2: MaterialDomain
  ): AtomicValue<DomainSimilarity> {
    const similarity = this.computeMaterialSimilarity(m1, m2);
    const risks: TransferRisk[] = [];

    // Identify specific risks
    if (m1.iso_group !== m2.iso_group) {
      risks.push({
        category: "material",
        severity: 0.7,
        description: `Cross-ISO transfer: ${m1.iso_group} → ${m2.iso_group}`,
        mitigation: "Use conservative parameters and validate with test cut",
      });
    }

    const hbRatio = m2.hardness_hb / m1.hardness_hb;
    if (hbRatio > 1.3) {
      risks.push({
        category: "material",
        severity: 0.6,
        description: `Target material ${(hbRatio * 100 - 100).toFixed(0)}% harder`,
        mitigation: "Reduce cutting speed and increase feed stability",
      });
    }

    if (m2.work_hardening > m1.work_hardening + 0.15) {
      risks.push({
        category: "material",
        severity: 0.5,
        description: "Higher work hardening tendency",
        mitigation: "Use sharp tools and maintain consistent DOC to avoid rubbing",
      });
    }

    // Determine recommended strategy
    let recommended: TransferMethod;
    if (similarity >= DIRECT_TRANSFER_THRESHOLD) {
      recommended = "direct";
    } else if (similarity >= FINETUNE_THRESHOLD) {
      recommended = "fine_tuning";
    } else if (similarity >= 0.4) {
      recommended = "feature_based";
    } else {
      recommended = "instance_reweighting";
    }

    return {
      value: {
        similarity,
        confidence: Math.min(0.95, 0.5 + similarity * 0.5),
        feature_similarities: {
          iso_group: m1.iso_group === m2.iso_group ? 1.0 : 0.3,
          hardness: Math.min(m1.hardness_hb, m2.hardness_hb) / Math.max(m1.hardness_hb, m2.hardness_hb),
          thermal_k: Math.min(m1.thermal_k, m2.thermal_k) / Math.max(m1.thermal_k, m2.thermal_k),
          machinability: Math.min(m1.machinability_index, m2.machinability_index) /
                        Math.max(m1.machinability_index, m2.machinability_index),
          kc1_1: Math.min(m1.kc1_1, m2.kc1_1) / Math.max(m1.kc1_1, m2.kc1_1),
        },
        risks,
        recommended_strategy: recommended,
      },
      unit: "dimensionless",
      formula: "Weighted cosine similarity + risk analysis",
      confidence: Math.min(0.95, 0.5 + similarity * 0.5),
    };
  }

  /**
   * Compute operation similarity.
   */
  private computeOperationSimilarity(o1: OperationDomain, o2: OperationDomain): number {
    // Same operation type = high similarity
    if (o1.operation_type === o2.operation_type) {
      return 1.0;
    }

    // Similar operation types
    const similarities: Record<string, Record<string, number>> = {
      roughing: { finishing: 0.5, facing: 0.7, boring: 0.6 },
      finishing: { roughing: 0.5, boring: 0.7, facing: 0.6 },
      threading: { grooving: 0.4 },
      grooving: { parting: 0.6, threading: 0.4 },
      boring: { roughing: 0.6, finishing: 0.7 },
      facing: { roughing: 0.7, finishing: 0.6 },
      parting: { grooving: 0.6 },
    };

    const sim = similarities[o1.operation_type]?.[o2.operation_type];
    if (sim !== undefined) {
      return sim;
    }

    // Priority-based similarity for other combinations
    const prioritySim = 1 - (
      Math.abs(o1.mrr_priority - o2.mrr_priority) * 0.3 +
      Math.abs(o1.finish_priority - o2.finish_priority) * 0.4 +
      Math.abs(o1.life_priority - o2.life_priority) * 0.3
    );

    return Math.max(0.2, prioritySim);
  }

  /**
   * Compute detailed operation similarity.
   */
  private computeOperationSimilarityDetailed(
    o1: OperationDomain,
    o2: OperationDomain
  ): AtomicValue<DomainSimilarity> {
    const similarity = this.computeOperationSimilarity(o1, o2);
    const risks: TransferRisk[] = [];

    if (o1.operation_type !== o2.operation_type) {
      risks.push({
        category: "operation",
        severity: 1 - similarity,
        description: `Operation change: ${o1.operation_type} → ${o2.operation_type}`,
        mitigation: "Verify DOC and feed ranges match target operation requirements",
      });
    }

    if (Math.abs(o1.mrr_priority - o2.mrr_priority) > 0.3) {
      risks.push({
        category: "operation",
        severity: 0.4,
        description: "Different productivity priorities",
        mitigation: "Adjust parameters to match target operation goals",
      });
    }

    return {
      value: {
        similarity,
        confidence: 0.8,
        feature_similarities: {
          type_match: o1.operation_type === o2.operation_type ? 1.0 : 0.0,
          mrr_priority: 1 - Math.abs(o1.mrr_priority - o2.mrr_priority),
          finish_priority: 1 - Math.abs(o1.finish_priority - o2.finish_priority),
          life_priority: 1 - Math.abs(o1.life_priority - o2.life_priority),
        },
        risks,
        recommended_strategy: similarity >= 0.7 ? "direct" : "feature_based",
      },
      unit: "dimensionless",
      confidence: 0.8,
    };
  }

  /**
   * Compute machine similarity.
   */
  private computeMachineSimilarity(m1: MachineDomain, m2: MachineDomain): number {
    const weights = {
      type: 0.25,
      power: 0.20,
      rpm: 0.15,
      torque: 0.15,
      rigidity: 0.15,
      accuracy: 0.10,
    };

    // Type match
    const typeMatch = m1.machine_type === m2.machine_type ? 1.0 : 0.5;

    // Power ratio (target / source, capped)
    const powerRatio = Math.min(m2.spindle_power_kw / m1.spindle_power_kw, 1.0);

    // RPM ratio
    const rpmRatio = Math.min(m2.max_rpm / m1.max_rpm, 1.0);

    // Torque ratio
    const torqueRatio = Math.min(m2.max_torque_nm / m1.max_torque_nm, 1.0);

    // Rigidity ratio
    const rigidityRatio = Math.min(m2.rigidity_n_per_um / m1.rigidity_n_per_um, 1.0);

    // Accuracy similarity (lower is better)
    const accRatio = Math.min(m1.accuracy_mm / m2.accuracy_mm, 1.0);

    return (
      weights.type * typeMatch +
      weights.power * powerRatio +
      weights.rpm * rpmRatio +
      weights.torque * torqueRatio +
      weights.rigidity * rigidityRatio +
      weights.accuracy * accRatio
    );
  }

  /**
   * Compute detailed machine similarity.
   */
  private computeMachineSimilarityDetailed(
    m1: MachineDomain,
    m2: MachineDomain
  ): AtomicValue<DomainSimilarity> {
    const similarity = this.computeMachineSimilarity(m1, m2);
    const risks: TransferRisk[] = [];

    // Power limitation
    if (m2.spindle_power_kw < m1.spindle_power_kw * 0.8) {
      risks.push({
        category: "machine",
        severity: 0.6,
        description: `Target power ${((1 - m2.spindle_power_kw / m1.spindle_power_kw) * 100).toFixed(0)}% lower`,
        mitigation: "Reduce MRR proportionally or accept longer cycle time",
      });
    }

    // RPM limitation
    if (m2.max_rpm < m1.max_rpm * 0.7) {
      risks.push({
        category: "machine",
        severity: 0.5,
        description: `Target RPM ${((1 - m2.max_rpm / m1.max_rpm) * 100).toFixed(0)}% lower`,
        mitigation: "May limit achievable cutting speed for small diameters",
      });
    }

    // Rigidity
    if (m2.rigidity_n_per_um < m1.rigidity_n_per_um * 0.7) {
      risks.push({
        category: "machine",
        severity: 0.7,
        description: `Target rigidity ${((1 - m2.rigidity_n_per_um / m1.rigidity_n_per_um) * 100).toFixed(0)}% lower`,
        mitigation: "Reduce depth of cut to avoid chatter",
      });
    }

    return {
      value: {
        similarity,
        confidence: 0.85,
        feature_similarities: {
          type: m1.machine_type === m2.machine_type ? 1.0 : 0.5,
          power: Math.min(m2.spindle_power_kw / m1.spindle_power_kw, 1.0),
          rpm: Math.min(m2.max_rpm / m1.max_rpm, 1.0),
          torque: Math.min(m2.max_torque_nm / m1.max_torque_nm, 1.0),
          rigidity: Math.min(m2.rigidity_n_per_um / m1.rigidity_n_per_um, 1.0),
        },
        risks,
        recommended_strategy: similarity >= 0.8 ? "direct" : "fine_tuning",
      },
      unit: "dimensionless",
      confidence: 0.85,
    };
  }

  // ==========================================================================
  // FEATURE EXTRACTION & ADAPTATION
  // ==========================================================================

  /**
   * Extract feature vector from domain combination.
   *
   * Creates a normalized feature representation for transfer learning,
   * extracting domain-invariant features that generalize across contexts.
   */
  private extractFeatures(
    material: MaterialDomain,
    operation: OperationDomain,
    machine: MachineDomain
  ): FeatureVector {
    const values: number[] = [];
    const weights: number[] = [];

    // Material features (normalized to [0,1])
    values.push(this.normalizeIsoGroup(material.iso_group));
    weights.push(0.15);

    values.push(material.hardness_hb / 700); // Normalize to max HB
    weights.push(0.10);

    values.push(Math.min(material.kc1_1 / 4000, 1)); // Normalize to max kc
    weights.push(0.12);

    values.push(Math.min(material.thermal_k / 200, 1)); // Normalize
    weights.push(0.08);

    values.push(material.machinability_index / 2.5); // Normalize
    weights.push(0.10);

    values.push(material.work_hardening); // Already 0-1
    weights.push(0.05);

    // Operation features
    values.push(operation.mrr_priority);
    weights.push(0.08);

    values.push(operation.finish_priority);
    weights.push(0.08);

    values.push(operation.life_priority);
    weights.push(0.06);

    // Machine features (normalized)
    values.push(Math.min(machine.spindle_power_kw / 50, 1));
    weights.push(0.06);

    values.push(Math.min(machine.max_rpm / 8000, 1));
    weights.push(0.04);

    values.push(Math.min(machine.rigidity_n_per_um / 50, 1));
    weights.push(0.08);

    return {
      name: `${material.material_id}_${operation.operation_type}_${machine.machine_id}`,
      values,
      weights,
      domain_type: "material", // Primary domain
    };
  }

  /**
   * Adapt features from source to target domain.
   *
   * Uses distribution matching to transform source features
   * toward target domain characteristics.
   */
  adaptFeatures(
    sourceFeatures: FeatureVector,
    targetMaterial: MaterialDomain,
    targetOperation?: OperationDomain,
    targetMachine?: MachineDomain
  ): { adapted: FeatureVector; feature_distance: number } {
    const targetValues: number[] = [];

    // Build target feature vector
    targetValues.push(this.normalizeIsoGroup(targetMaterial.iso_group));
    targetValues.push(targetMaterial.hardness_hb / 700);
    targetValues.push(Math.min(targetMaterial.kc1_1 / 4000, 1));
    targetValues.push(Math.min(targetMaterial.thermal_k / 200, 1));
    targetValues.push(targetMaterial.machinability_index / 2.5);
    targetValues.push(targetMaterial.work_hardening);

    if (targetOperation) {
      targetValues.push(targetOperation.mrr_priority);
      targetValues.push(targetOperation.finish_priority);
      targetValues.push(targetOperation.life_priority);
    } else {
      // Use source values for operation
      targetValues.push(sourceFeatures.values[6], sourceFeatures.values[7], sourceFeatures.values[8]);
    }

    if (targetMachine) {
      targetValues.push(Math.min(targetMachine.spindle_power_kw / 50, 1));
      targetValues.push(Math.min(targetMachine.max_rpm / 8000, 1));
      targetValues.push(Math.min(targetMachine.rigidity_n_per_um / 50, 1));
    } else {
      // Use source values for machine
      targetValues.push(sourceFeatures.values[9], sourceFeatures.values[10], sourceFeatures.values[11]);
    }

    // Compute weighted Euclidean distance
    let distance = 0;
    const adapted: number[] = [];
    for (let i = 0; i < sourceFeatures.values.length; i++) {
      const d = sourceFeatures.values[i] - targetValues[i];
      distance += sourceFeatures.weights[i] * d * d;
      // Adapt: move 70% toward target
      adapted.push(sourceFeatures.values[i] * 0.3 + targetValues[i] * 0.7);
    }
    distance = Math.sqrt(distance);

    return {
      adapted: {
        ...sourceFeatures,
        values: adapted,
        name: `adapted_${sourceFeatures.name}`,
      },
      feature_distance: distance,
    };
  }

  /**
   * Normalize ISO group to numeric value.
   */
  private normalizeIsoGroup(group: string): number {
    const mapping: Record<string, number> = {
      P: 0.2,
      M: 0.35,
      K: 0.5,
      N: 0.65,
      S: 0.8,
      H: 0.95,
    };
    return mapping[group] ?? 0.5;
  }

  // ==========================================================================
  // MAXIMUM MEAN DISCREPANCY (MMD)
  // ==========================================================================

  /**
   * Compute Maximum Mean Discrepancy between two sample distributions.
   *
   * MMD²(P,Q) = E[k(x,x')] - 2E[k(x,y)] + E[k(y,y')]
   *
   * Uses RBF kernel: k(x,y) = exp(-||x-y||² / (2σ²))
   *
   * @param source - Source domain samples (each sample is a feature vector)
   * @param target - Target domain samples
   * @param bandwidth - RBF kernel bandwidth (default: median heuristic)
   * @returns MMD result with significance test
   */
  computeMMD(
    source: number[][],
    target: number[][],
    bandwidth?: number
  ): AtomicValue<MMDResult> {
    const nS = source.length;
    const nT = target.length;

    if (nS === 0 || nT === 0) {
      return {
        value: {
          mmd_squared: 0,
          p_value: 1,
          significant: false,
          n_source: nS,
          n_target: nT,
          bandwidth: 0,
        },
        unit: "dimensionless",
        confidence: 0,
        warning: "Empty sample sets",
      };
    }

    // Use median heuristic for bandwidth if not provided
    const sigma = bandwidth ?? this.medianHeuristic([...source, ...target]);

    // RBF kernel
    const rbf = (a: number[], b: number[]): number => {
      let sq = 0;
      for (let i = 0; i < a.length; i++) {
        const d = a[i] - (b[i] ?? 0);
        sq += d * d;
      }
      return Math.exp(-sq / (2 * sigma * sigma));
    };

    // Compute E[k(x,x')]
    let kSS = 0;
    for (let i = 0; i < nS; i++) {
      for (let j = i + 1; j < nS; j++) {
        kSS += 2 * rbf(source[i], source[j]);
      }
    }
    kSS /= nS * (nS - 1) || 1;

    // Compute E[k(y,y')]
    let kTT = 0;
    for (let i = 0; i < nT; i++) {
      for (let j = i + 1; j < nT; j++) {
        kTT += 2 * rbf(target[i], target[j]);
      }
    }
    kTT /= nT * (nT - 1) || 1;

    // Compute E[k(x,y)]
    let kST = 0;
    for (let i = 0; i < nS; i++) {
      for (let j = 0; j < nT; j++) {
        kST += rbf(source[i], target[j]);
      }
    }
    kST /= nS * nT || 1;

    const mmdSq = Math.max(0, kSS + kTT - 2 * kST);

    // Simple permutation test for significance (5 permutations for speed)
    const combined = [...source, ...target];
    let nullCount = 0;
    const nPerm = 50;
    for (let p = 0; p < nPerm; p++) {
      // Fisher-Yates shuffle
      const shuffled = [...combined];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const permSource = shuffled.slice(0, nS);
      const permTarget = shuffled.slice(nS);

      // Compute MMD for permutation
      let pKSS = 0, pKTT = 0, pKST = 0;
      for (let i = 0; i < nS; i++) {
        for (let j = i + 1; j < nS; j++) {
          pKSS += 2 * rbf(permSource[i], permSource[j]);
        }
      }
      pKSS /= nS * (nS - 1) || 1;
      for (let i = 0; i < nT; i++) {
        for (let j = i + 1; j < nT; j++) {
          pKTT += 2 * rbf(permTarget[i], permTarget[j]);
        }
      }
      pKTT /= nT * (nT - 1) || 1;
      for (let i = 0; i < nS; i++) {
        for (let j = 0; j < nT; j++) {
          pKST += rbf(permSource[i], permTarget[j]);
        }
      }
      pKST /= nS * nT || 1;
      const permMmdSq = Math.max(0, pKSS + pKTT - 2 * pKST);
      if (permMmdSq >= mmdSq) nullCount++;
    }
    const pValue = (nullCount + 1) / (nPerm + 1);

    return {
      value: {
        mmd_squared: parseFloat(mmdSq.toFixed(8)),
        p_value: parseFloat(pValue.toFixed(4)),
        significant: pValue < 0.05,
        n_source: nS,
        n_target: nT,
        bandwidth: parseFloat(sigma.toFixed(4)),
      },
      unit: "dimensionless",
      formula: "MMD²(P,Q) = E[k(x,x')] - 2E[k(x,y)] + E[k(y,y')]",
      confidence: 1 - pValue,
    };
  }

  /**
   * Median heuristic for RBF kernel bandwidth.
   */
  private medianHeuristic(samples: number[][]): number {
    const distances: number[] = [];
    for (let i = 0; i < samples.length; i++) {
      for (let j = i + 1; j < samples.length; j++) {
        let sq = 0;
        for (let k = 0; k < samples[i].length; k++) {
          const d = samples[i][k] - samples[j][k];
          sq += d * d;
        }
        distances.push(Math.sqrt(sq));
      }
    }
    if (distances.length === 0) return 1.0;
    distances.sort((a, b) => a - b);
    const median = distances[Math.floor(distances.length / 2)];
    return Math.max(median, 0.1); // Avoid zero bandwidth
  }

  // ==========================================================================
  // FINE-TUNING
  // ==========================================================================

  /**
   * Fine-tune transferred parameters using target domain data.
   *
   * Uses gradient descent on the error between predicted and actual outcomes,
   * with L2 regularization to prevent overfitting to limited target data.
   *
   * @param input - Base parameters and target data
   * @returns Fine-tuned parameters
   */
  fineTune(
    input: FineTuneInput
  ): AtomicValue<{ params: LatheCuttingParams; improvement: number }> {
    const result = this.fineTuneParams(input);
    return {
      value: {
        params: result.params,
        improvement: result.improved ? 0.1 : 0,
      },
      unit: "mixed",
      formula: "Gradient descent with L2 regularization",
      confidence: result.improved ? 0.8 : 0.6,
    };
  }

  /**
   * Internal fine-tuning implementation.
   */
  private fineTuneParams(input: FineTuneInput): {
    params: LatheCuttingParams;
    improved: boolean;
  } {
    if (input.target_data.length === 0) {
      return { params: input.base_params, improved: false };
    }

    let { Vc, f, ap } = input.base_params;
    const lr = input.learning_rate;
    const lambda = input.regularization;

    // Compute target statistics
    const successRecords = input.target_data.filter((r) => r.success);
    if (successRecords.length === 0) {
      return { params: input.base_params, improved: false };
    }

    const avgVc = successRecords.reduce((s, r) => s + r.params.Vc, 0) / successRecords.length;
    const avgF = successRecords.reduce((s, r) => s + r.params.f, 0) / successRecords.length;
    const avgAp = successRecords.reduce((s, r) => s + r.params.ap, 0) / successRecords.length;

    // Gradient descent iterations
    for (let i = 0; i < input.iterations; i++) {
      const gradVc = 2 * (Vc - avgVc) + lambda * 2 * Vc;
      const gradF = 2 * (f - avgF) + lambda * 2 * f;
      const gradAp = 2 * (ap - avgAp) + lambda * 2 * ap;

      Vc = Vc - lr * gradVc;
      f = f - lr * gradF;
      ap = ap - lr * gradAp;
    }

    // Validate improvements
    const baseError = Math.sqrt(
      Math.pow((input.base_params.Vc - avgVc) / avgVc, 2) +
      Math.pow((input.base_params.f - avgF) / avgF, 2) +
      Math.pow((input.base_params.ap - avgAp) / avgAp, 2)
    );
    const newError = Math.sqrt(
      Math.pow((Vc - avgVc) / avgVc, 2) +
      Math.pow((f - avgF) / avgF, 2) +
      Math.pow((ap - avgAp) / avgAp, 2)
    );

    const improved = newError < baseError;

    return {
      params: {
        ...input.base_params,
        Vc: parseFloat(Vc.toFixed(1)),
        f: parseFloat(f.toFixed(3)),
        ap: parseFloat(ap.toFixed(2)),
      },
      improved,
    };
  }

  // ==========================================================================
  // TRANSFER EVALUATION
  // ==========================================================================

  /**
   * Evaluate transfer effectiveness by comparing predicted vs actual results.
   *
   * @param source - Source domain configuration
   * @param target - Target domain with actual outcomes
   * @returns Evaluation metrics
   */
  evaluateTransfer(
    source: { params: LatheCuttingParams; material: MaterialDomain },
    target: {
      params: LatheCuttingParams;
      material: MaterialDomain;
      actual: {
        tool_life_min: number;
        surface_ra_um: number;
        success: boolean;
      };
    }
  ): AtomicValue<TransferEvaluation> {
    // Compute errors
    const speedError = Math.abs(source.params.Vc - target.params.Vc) / source.params.Vc;
    const feedError = Math.abs(source.params.f - target.params.f) / source.params.f;

    // Estimate expected tool life from Taylor equation
    const n = TAYLOR_N[source.material.iso_group] ?? 0.25;
    const speedRatio = target.params.Vc / source.params.Vc;
    const expectedLifeRatio = Math.pow(speedRatio, -1 / n);

    // Assume baseline 45 min life for source
    const expectedLife = 45 * expectedLifeRatio;
    const lifeError = Math.abs(expectedLife - target.actual.tool_life_min) / expectedLife;

    // Surface finish error (assume Ra ∝ f² / r)
    const feedRatio = target.params.f / source.params.f;
    const raRatio = feedRatio * feedRatio;
    const expectedRa = 3.2 * raRatio; // Baseline 3.2 μm
    const surfaceError = Math.abs(expectedRa - target.actual.surface_ra_um) / expectedRa;

    // Overall performance ratio
    const performanceRatio = 1 - (speedError + feedError + lifeError + surfaceError) / 4;

    // Negative transfer detection
    const negativeTransfer = performanceRatio < NEGATIVE_TRANSFER_THRESHOLD || !target.actual.success;

    // Generate recommendations
    const recommendations: string[] = [];
    if (speedError > 0.2) {
      recommendations.push("Cutting speed deviation significant — consider recalibrating speed scaling");
    }
    if (feedError > 0.2) {
      recommendations.push("Feed rate mismatch — verify chip load compatibility");
    }
    if (lifeError > 0.3) {
      recommendations.push("Tool life prediction error high — update Taylor model for target material");
    }
    if (surfaceError > 0.3) {
      recommendations.push("Surface finish model needs calibration — check nose radius effect");
    }
    if (negativeTransfer) {
      recommendations.push("Negative transfer detected — use feature-based method or collect more target data");
    }

    return {
      value: {
        successful: target.actual.success && performanceRatio > 0.7,
        performance_ratio: parseFloat(performanceRatio.toFixed(4)),
        errors: {
          speed_error_pct: parseFloat((speedError * 100).toFixed(1)),
          feed_error_pct: parseFloat((feedError * 100).toFixed(1)),
          life_error_pct: parseFloat((lifeError * 100).toFixed(1)),
          surface_error_pct: parseFloat((surfaceError * 100).toFixed(1)),
        },
        negative_transfer: negativeTransfer,
        recommendations,
      },
      unit: "mixed",
      formula: "Error metrics + Taylor life model + Ra prediction",
      confidence: target.actual.success ? 0.85 : 0.5,
    };
  }

  // ==========================================================================
  // INSTANCE REWEIGHTING
  // ==========================================================================

  /**
   * Compute instance weights for transfer via importance weighting.
   *
   * Assigns higher weights to source instances that are more similar
   * to the target distribution, based on density ratio estimation.
   *
   * @param sourceFeatures - Feature vectors from source domain
   * @param targetFeatures - Feature vectors from target domain
   * @returns Instance weights for source samples
   */
  computeInstanceWeights(
    sourceFeatures: number[][],
    targetFeatures: number[][]
  ): AtomicValue<ReweightingResult> {
    const n = sourceFeatures.length;
    if (n === 0 || targetFeatures.length === 0) {
      return {
        value: {
          weights: [],
          effective_n: 0,
          weight_stats: { min: 0, max: 0, mean: 0, std: 0 },
        },
        unit: "dimensionless",
        confidence: 0,
      };
    }

    // Compute target centroid
    const dim = targetFeatures[0].length;
    const centroid = new Array(dim).fill(0);
    for (const feat of targetFeatures) {
      for (let i = 0; i < dim; i++) {
        centroid[i] += feat[i];
      }
    }
    for (let i = 0; i < dim; i++) {
      centroid[i] /= targetFeatures.length;
    }

    // Compute target variance
    let variance = 0;
    for (const feat of targetFeatures) {
      let sq = 0;
      for (let i = 0; i < dim; i++) {
        const d = feat[i] - centroid[i];
        sq += d * d;
      }
      variance += sq;
    }
    variance = Math.sqrt(variance / targetFeatures.length) || 1;

    // Weight each source instance by similarity to target centroid
    const weights: number[] = [];
    for (const feat of sourceFeatures) {
      let dist = 0;
      for (let i = 0; i < dim; i++) {
        const d = feat[i] - centroid[i];
        dist += d * d;
      }
      dist = Math.sqrt(dist);
      // Gaussian weighting
      const w = Math.exp(-dist / (2 * variance));
      weights.push(w);
    }

    // Normalize weights
    const sumW = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < weights.length; i++) {
      weights[i] /= sumW / n; // Normalize to have mean = 1
    }

    // Compute statistics
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const meanW = weights.reduce((a, b) => a + b, 0) / n;
    const varW = weights.reduce((a, w) => a + (w - meanW) ** 2, 0) / n;
    const stdW = Math.sqrt(varW);

    // Effective sample size: N_eff = (sum(w))² / sum(w²)
    const sumW2 = weights.reduce((a, w) => a + w * w, 0);
    const effectiveN = (sumW * sumW) / sumW2;

    return {
      value: {
        weights: weights.map((w) => parseFloat(w.toFixed(4))),
        effective_n: parseFloat(effectiveN.toFixed(1)),
        weight_stats: {
          min: parseFloat(minW.toFixed(4)),
          max: parseFloat(maxW.toFixed(4)),
          mean: parseFloat(meanW.toFixed(4)),
          std: parseFloat(stdW.toFixed(4)),
        },
      },
      unit: "dimensionless",
      formula: "Gaussian kernel density ratio estimation",
      confidence: effectiveN / n > 0.3 ? 0.8 : 0.5,
    };
  }

  // ==========================================================================
  // PARAMETER SCALING HELPERS
  // ==========================================================================

  /**
   * Scale cutting speed from source to target material.
   *
   * Uses machinability index ratio with adjustments for hardness and thermal.
   *
   * Vc_target ≈ Vc_source × (MI_target / MI_source)^0.5 × (HB_source / HB_target)^0.3
   */
  private scaleCuttingSpeed(
    source: MaterialDomain,
    target: MaterialDomain,
    sourceVc: number
  ): { adjusted: number; factor: number; reason: string } {
    const miRatio = target.machinability_index / source.machinability_index;
    const hbRatio = source.hardness_hb / target.hardness_hb;

    // Base scaling from machinability
    let factor = Math.pow(miRatio, 0.5);

    // Hardness adjustment
    factor *= Math.pow(hbRatio, 0.3);

    // Thermal conductivity adjustment (low k = reduce speed)
    if (target.thermal_k < source.thermal_k * 0.5) {
      factor *= 0.85;
    }

    // Work hardening adjustment
    if (target.work_hardening > source.work_hardening + 0.2) {
      factor *= 0.9;
    }

    // Clamp factor to reasonable range
    factor = Math.max(0.3, Math.min(factor, 2.0));

    const adjusted = parseFloat((sourceVc * factor).toFixed(1));

    let reason = `MI ratio ${miRatio.toFixed(2)}, HB ratio ${hbRatio.toFixed(2)}`;
    if (factor < 0.8) {
      reason += " — reduced for harder/tougher material";
    } else if (factor > 1.2) {
      reason += " — increased for more machinable material";
    }

    return { adjusted, factor, reason };
  }

  /**
   * Scale feed rate based on specific cutting force ratio.
   *
   * Higher kc means more force per chip area — may need to reduce feed.
   */
  private scaleFeed(
    source: MaterialDomain,
    target: MaterialDomain,
    sourceF: number
  ): { adjusted: number; factor: number; reason: string } {
    const kcRatio = source.kc1_1 / target.kc1_1;

    // Higher kc in target = reduce feed to maintain similar force
    let factor = Math.pow(kcRatio, 0.4);

    // Work hardening adjustment — reduce feed if target work hardens more
    if (target.work_hardening > source.work_hardening + 0.15) {
      factor *= 0.9;
    }

    // Chip type adjustment
    if (source.chip_type === "continuous" && target.chip_type === "segmented") {
      factor *= 0.95; // Slight reduction for segmented chips
    }

    factor = Math.max(0.5, Math.min(factor, 1.5));

    const adjusted = parseFloat((sourceF * factor).toFixed(3));

    return {
      adjusted,
      factor,
      reason: `kc ratio ${(1 / kcRatio).toFixed(2)} (target ${target.kc1_1} vs source ${source.kc1_1})`,
    };
  }

  /**
   * Scale depth of cut based on machinability and rigidity requirements.
   */
  private scaleDepthOfCut(
    source: MaterialDomain,
    target: MaterialDomain,
    sourceAp: number
  ): { adjusted: number; factor: number; reason: string } {
    const miRatio = target.machinability_index / source.machinability_index;

    // Lower machinability = reduce DOC
    let factor = Math.pow(miRatio, 0.3);

    // Hardness penalty for hardened materials
    if (target.iso_group === "H" && source.iso_group !== "H") {
      factor *= 0.6;
    }

    // Heat resistant alloys need lighter cuts
    if (target.iso_group === "S" && source.iso_group !== "S") {
      factor *= 0.5;
    }

    factor = Math.max(0.3, Math.min(factor, 1.3));

    const adjusted = parseFloat((sourceAp * factor).toFixed(2));

    return {
      adjusted,
      factor,
      reason: `Machinability adjustment (target ${target.iso_group}, source ${source.iso_group})`,
    };
  }

  /**
   * Apply machine capability constraints to parameters.
   */
  private applyMachineConstraints(
    params: LatheCuttingParams,
    source: MachineDomain,
    target: MachineDomain
  ): {
    params: LatheCuttingParams;
    adjustments: TransferAdjustment[];
    warnings: string[];
    confidenceFactor: number;
  } {
    const adjustments: TransferAdjustment[] = [];
    const warnings: string[] = [];
    let confidenceFactor = 1.0;
    let { Vc, f, ap } = params;

    // Power constraint
    // P = Fc × Vc / 60000 where Fc ∝ kc × f × ap
    const powerRatio = target.spindle_power_kw / source.spindle_power_kw;
    if (powerRatio < 0.9) {
      const reduction = Math.pow(powerRatio, 0.5);
      const newVc = Vc * reduction;
      adjustments.push({
        parameter: "Vc",
        original: Vc,
        adjusted: parseFloat(newVc.toFixed(1)),
        factor: reduction,
        reason: `Power limited: target ${target.spindle_power_kw}kW vs source ${source.spindle_power_kw}kW`,
        source: "physics",
      });
      Vc = newVc;
      confidenceFactor *= 0.95;
    }

    // RPM constraint — Vc = π × D × n / 1000
    // For typical workpiece diameter of 50mm
    const typicalDiam = 50; // mm
    const requiredRpm = (1000 * Vc) / (Math.PI * typicalDiam);
    if (requiredRpm > target.max_rpm) {
      const maxVc = (Math.PI * typicalDiam * target.max_rpm) / 1000;
      adjustments.push({
        parameter: "Vc",
        original: Vc,
        adjusted: parseFloat(maxVc.toFixed(1)),
        factor: maxVc / Vc,
        reason: `RPM limited: ${target.max_rpm} max`,
        source: "physics",
      });
      Vc = maxVc;
      confidenceFactor *= 0.9;
      warnings.push("Cutting speed limited by machine RPM capability");
    }

    // Rigidity constraint — affects DOC
    const rigidityRatio = target.rigidity_n_per_um / source.rigidity_n_per_um;
    if (rigidityRatio < 0.8) {
      const docReduction = Math.pow(rigidityRatio, 0.6);
      const newAp = ap * docReduction;
      adjustments.push({
        parameter: "ap",
        original: ap,
        adjusted: parseFloat(newAp.toFixed(2)),
        factor: docReduction,
        reason: `Rigidity limited: target ${target.rigidity_n_per_um} N/μm vs source ${source.rigidity_n_per_um} N/μm`,
        source: "physics",
      });
      ap = newAp;
      confidenceFactor *= 0.9;
      warnings.push("Depth of cut reduced due to lower machine rigidity");
    }

    // Torque constraint for low-speed heavy cuts
    if (requiredRpm < 500) {
      const torqueRatio = target.max_torque_nm / source.max_torque_nm;
      if (torqueRatio < 0.9) {
        const feedReduction = Math.pow(torqueRatio, 0.4);
        const newF = f * feedReduction;
        adjustments.push({
          parameter: "f",
          original: f,
          adjusted: parseFloat(newF.toFixed(3)),
          factor: feedReduction,
          reason: `Torque limited at low RPM: target ${target.max_torque_nm} Nm`,
          source: "physics",
        });
        f = newF;
        confidenceFactor *= 0.95;
      }
    }

    return {
      params: { ...params, Vc, f, ap },
      adjustments,
      warnings,
      confidenceFactor,
    };
  }

  /**
   * Apply operation-specific parameter adjustments.
   */
  private applyOperationAdjustments(
    params: LatheCuttingParams,
    source: OperationDomain,
    target: OperationDomain
  ): {
    params: LatheCuttingParams;
    adjustments: TransferAdjustment[];
  } {
    const adjustments: TransferAdjustment[] = [];
    let { Vc, f, ap } = params;

    // Roughing → Finishing: reduce DOC, reduce feed, adjust speed
    if (source.operation_type === "roughing" && target.operation_type === "finishing") {
      const docFactor = 0.15;
      const feedFactor = 0.4;
      const vcFactor = 1.1;

      adjustments.push({
        parameter: "ap",
        original: ap,
        adjusted: parseFloat((ap * docFactor).toFixed(2)),
        factor: docFactor,
        reason: "Finishing requires light DOC for surface quality",
        source: "tribal_knowledge",
      });
      adjustments.push({
        parameter: "f",
        original: f,
        adjusted: parseFloat((f * feedFactor).toFixed(3)),
        factor: feedFactor,
        reason: "Ra ∝ f² — reduce feed for better finish",
        source: "physics",
      });
      adjustments.push({
        parameter: "Vc",
        original: Vc,
        adjusted: parseFloat((Vc * vcFactor).toFixed(1)),
        factor: vcFactor,
        reason: "Higher speed improves finish in light cuts",
        source: "empirical",
      });

      ap *= docFactor;
      f *= feedFactor;
      Vc *= vcFactor;
    }

    // Finishing → Roughing: opposite adjustments
    if (source.operation_type === "finishing" && target.operation_type === "roughing") {
      const docFactor = 5.0;
      const feedFactor = 2.5;
      const vcFactor = 0.85;

      adjustments.push({
        parameter: "ap",
        original: ap,
        adjusted: parseFloat(Math.min(ap * docFactor, 4.0).toFixed(2)),
        factor: docFactor,
        reason: "Roughing maximizes MRR",
        source: "tribal_knowledge",
      });
      adjustments.push({
        parameter: "f",
        original: f,
        adjusted: parseFloat(Math.min(f * feedFactor, 0.4).toFixed(3)),
        factor: feedFactor,
        reason: "Higher feed for productivity",
        source: "empirical",
      });
      adjustments.push({
        parameter: "Vc",
        original: Vc,
        adjusted: parseFloat((Vc * vcFactor).toFixed(1)),
        factor: vcFactor,
        reason: "Slightly lower speed for tool life in heavy cuts",
        source: "empirical",
      });

      ap = Math.min(ap * docFactor, 4.0);
      f = Math.min(f * feedFactor, 0.4);
      Vc *= vcFactor;
    }

    // Boring adjustment — reduced engagement
    if (target.operation_type === "boring") {
      if (source.operation_type !== "boring") {
        const docFactor = 0.6;
        adjustments.push({
          parameter: "ap",
          original: ap,
          adjusted: parseFloat((ap * docFactor).toFixed(2)),
          factor: docFactor,
          reason: "Boring bar less rigid — reduce DOC",
          source: "tribal_knowledge",
        });
        ap *= docFactor;
      }
    }

    // Grooving/Parting — chip evacuation concerns
    if (target.operation_type === "grooving" || target.operation_type === "parting") {
      if (source.operation_type !== "grooving" && source.operation_type !== "parting") {
        const feedFactor = 0.5;
        const vcFactor = 0.8;
        adjustments.push({
          parameter: "f",
          original: f,
          adjusted: parseFloat((f * feedFactor).toFixed(3)),
          factor: feedFactor,
          reason: "Reduced feed for chip evacuation",
          source: "tribal_knowledge",
        });
        adjustments.push({
          parameter: "Vc",
          original: Vc,
          adjusted: parseFloat((Vc * vcFactor).toFixed(1)),
          factor: vcFactor,
          reason: "Lower speed for interrupted cut",
          source: "empirical",
        });
        f *= feedFactor;
        Vc *= vcFactor;
      }
    }

    return {
      params: { ...params, Vc, f, ap },
      adjustments,
    };
  }

  /**
   * Validate parameters against material limits.
   */
  private validateParams(
    params: LatheCuttingParams,
    material: MaterialDomain
  ): { params: LatheCuttingParams; clamped: boolean } {
    const range = SPEED_RANGES[material.iso_group] ?? SPEED_RANGES["P"];
    let clamped = false;
    let { Vc, f, ap } = params;

    // Speed clamping
    if (Vc < range.min * 0.5) {
      Vc = range.min * 0.5;
      clamped = true;
    } else if (Vc > range.max * 1.2) {
      Vc = range.max * 1.2;
      clamped = true;
    }

    // Feed clamping (general limits)
    if (f < 0.02) {
      f = 0.02;
      clamped = true;
    } else if (f > 0.6) {
      f = 0.6;
      clamped = true;
    }

    // DOC clamping
    if (ap < 0.05) {
      ap = 0.05;
      clamped = true;
    } else if (ap > 8.0) {
      ap = 8.0;
      clamped = true;
    }

    return {
      params: {
        ...params,
        Vc: parseFloat(Vc.toFixed(1)),
        f: parseFloat(f.toFixed(3)),
        ap: parseFloat(ap.toFixed(2)),
      },
      clamped,
    };
  }

  // ==========================================================================
  // MATERIAL LOOKUP
  // ==========================================================================

  /**
   * Get material by ID from database.
   */
  getMaterial(materialId: string): MaterialDomain {
    const found = this.materialDb.find(
      (m) => m.material_id.toLowerCase() === materialId.toLowerCase()
    );
    if (!found) {
      // Return default steel if not found
      return this.materialDb[0];
    }
    return found;
  }

  /**
   * Get operation template by type.
   */
  getOperation(operationType: string): OperationDomain {
    const found = this.operationTemplates.find(
      (o) => o.operation_type === operationType
    );
    if (!found) {
      return this.operationTemplates[0]; // Default to roughing
    }
    return found;
  }

  /**
   * List all available materials.
   */
  listMaterials(): MaterialDomain[] {
    return [...this.materialDb];
  }

  /**
   * Add custom material to database.
   */
  addMaterial(material: MaterialDomain): void {
    const existing = this.materialDb.findIndex(
      (m) => m.material_id === material.material_id
    );
    if (existing >= 0) {
      this.materialDb[existing] = material;
    } else {
      this.materialDb.push(material);
    }
    log.info(`[LatheTransferLearning] Material ${material.material_id} added to database`);
  }

  // ==========================================================================
  // SHOP-TO-SHOP TRANSFER
  // ==========================================================================

  /**
   * Transfer best practices from source shop to target shop.
   *
   * Considers shop capabilities, experience, and typical workload
   * to adapt recommendations appropriately.
   */
  transferShopKnowledge(
    source: {
      shop: ShopDomain;
      practices: PerformanceRecord[];
    },
    target: ShopDomain
  ): AtomicValue<{
    transferred_practices: PerformanceRecord[];
    adaptation_notes: string[];
    confidence: number;
  }> {
    const adaptationNotes: string[] = [];
    const transferred: PerformanceRecord[] = [];

    // Filter practices by material compatibility
    const targetMaterials = new Set(target.typical_materials.map((m) => m.toLowerCase()));
    const compatiblePractices = source.practices.filter((p) => {
      const mat = p.material_id.toLowerCase();
      // Exact match or same ISO group
      if (targetMaterials.has(mat)) return true;
      const sourceMat = this.getMaterial(p.material_id);
      for (const tm of target.typical_materials) {
        const targetMat = this.getMaterial(tm);
        if (sourceMat.iso_group === targetMat.iso_group) return true;
      }
      return false;
    });

    // Adapt for tolerance capability
    const toleranceScale = this.toleranceScaleFactor(source.shop.tolerance_grade, target.tolerance_grade);
    if (toleranceScale !== 1.0) {
      adaptationNotes.push(
        `Tolerance adjustment (${source.shop.tolerance_grade} → ${target.tolerance_grade}): ×${toleranceScale.toFixed(2)}`
      );
    }

    // Adapt for coolant systems
    const sourceHasHP = source.shop.coolant_types.includes("high_pressure");
    const targetHasHP = target.coolant_types.includes("high_pressure");
    if (sourceHasHP && !targetHasHP) {
      adaptationNotes.push("High-pressure coolant unavailable — reduce speeds for superalloys by 15%");
    }

    // Experience factor
    const experienceRatio = Math.min(target.experience_years / source.shop.experience_years, 1.5);
    if (experienceRatio < 0.5) {
      adaptationNotes.push("Less experienced shop — recommend conservative parameters with wider safety margins");
    }

    // Transfer practices with adaptations
    for (const practice of compatiblePractices) {
      const adapted: PerformanceRecord = {
        ...practice,
        timestamp: new Date(),
        notes: `Transferred from ${source.shop.shop_name}`,
      };

      // Apply tolerance-based feed adjustment
      if (toleranceScale !== 1.0) {
        adapted.params = {
          ...adapted.params,
          f: adapted.params.f * toleranceScale,
        };
      }

      // Apply coolant adjustment
      const matDomain = this.getMaterial(practice.material_id);
      if (sourceHasHP && !targetHasHP && (matDomain.iso_group === "S" || matDomain.iso_group === "H")) {
        adapted.params = {
          ...adapted.params,
          Vc: adapted.params.Vc * 0.85,
        };
      }

      transferred.push(adapted);
    }

    const confidence = (compatiblePractices.length / source.practices.length) * experienceRatio;

    return {
      value: {
        transferred_practices: transferred,
        adaptation_notes: adaptationNotes,
        confidence: parseFloat(Math.min(confidence, 0.95).toFixed(3)),
      },
      unit: "mixed",
      formula: "Shop capability matching + material compatibility filter",
      confidence: Math.min(confidence, 0.95),
    };
  }

  /**
   * Scale factor for tolerance grade differences.
   */
  private toleranceScaleFactor(source: string, target: string): number {
    const grades: Record<string, number> = {
      commercial: 1.0,
      precision: 0.8,
      ultra_precision: 0.5,
    };
    const sourceVal = grades[source] ?? 1.0;
    const targetVal = grades[target] ?? 1.0;
    return targetVal / sourceVal;
  }

  // ==========================================================================
  // LEGACY PROGRAM MODERNIZATION
  // ==========================================================================

  /**
   * Modernize parameters from legacy programs for new machines/tools.
   *
   * Legacy programs often use conservative parameters due to older
   * tool technology. This method updates them for modern inserts.
   */
  modernizeLegacyParams(
    legacy: {
      params: LatheCuttingParams;
      year: number;
      tool_tech: "HSS" | "carbide_uncoated" | "carbide_coated" | "ceramic" | "CBN";
    },
    modern: {
      tool_tech: "carbide_coated" | "ceramic" | "CBN" | "PCD";
      machine_year?: number;
    }
  ): AtomicValue<{
    params: LatheCuttingParams;
    improvements: string[];
    speedup_factor: number;
  }> {
    const improvements: string[] = [];
    let { Vc, f, ap } = legacy.params;

    // Tool technology upgrade factors
    const techFactors: Record<string, Record<string, number>> = {
      HSS: {
        carbide_coated: 3.0,
        ceramic: 5.0,
        CBN: 4.0,
        PCD: 4.5,
      },
      carbide_uncoated: {
        carbide_coated: 1.4,
        ceramic: 2.5,
        CBN: 2.0,
        PCD: 2.2,
      },
      carbide_coated: {
        ceramic: 1.8,
        CBN: 1.5,
        PCD: 1.6,
        carbide_coated: 1.0,
      },
      ceramic: {
        CBN: 0.9,
        PCD: 0.95,
        ceramic: 1.0,
        carbide_coated: 0.55,
      },
      CBN: {
        PCD: 1.0,
        CBN: 1.0,
        carbide_coated: 0.65,
        ceramic: 1.1,
      },
    };

    const speedFactor = techFactors[legacy.tool_tech]?.[modern.tool_tech] ?? 1.0;
    if (speedFactor > 1.0) {
      const newVc = Vc * speedFactor;
      improvements.push(
        `Speed increased ${speedFactor.toFixed(1)}× from ${legacy.tool_tech} → ${modern.tool_tech}`
      );
      Vc = newVc;
    }

    // Program age factor (conservative old programs)
    const age = new Date().getFullYear() - legacy.year;
    if (age > 10) {
      const ageFactor = 1 + Math.min(age - 10, 20) * 0.02; // Up to 40% increase
      improvements.push(`Feed increased ${((ageFactor - 1) * 100).toFixed(0)}% from ${age}-year-old parameters`);
      f *= ageFactor;
    }

    // Modern coating allows higher DOC
    if (modern.tool_tech === "carbide_coated" && legacy.tool_tech === "carbide_uncoated") {
      ap *= 1.2;
      improvements.push("DOC increased 20% with coated insert");
    }

    // Modern machine capabilities (assumed if newer)
    if (modern.machine_year && modern.machine_year > legacy.year + 10) {
      Vc *= 1.1;
      improvements.push("Speed increased 10% for modern machine rigidity");
    }

    const speedupFactor = (Vc * f * ap) / (legacy.params.Vc * legacy.params.f * legacy.params.ap);

    return {
      value: {
        params: {
          ...legacy.params,
          Vc: parseFloat(Vc.toFixed(1)),
          f: parseFloat(f.toFixed(3)),
          ap: parseFloat(ap.toFixed(2)),
        },
        improvements,
        speedup_factor: parseFloat(speedupFactor.toFixed(2)),
      },
      unit: "mixed",
      formula: "Tool technology scaling + age factor + machine capability",
      confidence: 0.8,
    };
  }

  // ==========================================================================
  // NEW MATERIAL PARAMETER INFERENCE
  // ==========================================================================

  /**
   * Infer cutting parameters for a new material based on similar known materials.
   *
   * Uses weighted averaging from the k-nearest materials in the database.
   */
  inferNewMaterialParams(
    newMaterial: {
      name: string;
      iso_group: "P" | "M" | "K" | "N" | "S" | "H";
      hardness_hb: number;
      tensile_mpa?: number;
      thermal_k?: number;
    },
    operation: OperationDomain,
    k: number = 3
  ): AtomicValue<{
    params: LatheCuttingParams;
    similar_materials: Array<{ material_id: string; similarity: number; params: LatheCuttingParams }>;
    confidence: number;
  }> {
    // Find k most similar materials
    const similarities: Array<{ mat: MaterialDomain; sim: number }> = [];

    for (const mat of this.materialDb) {
      // Same ISO group strongly preferred
      let sim = mat.iso_group === newMaterial.iso_group ? 0.3 : 0.0;

      // Hardness similarity
      const hbRatio = Math.min(mat.hardness_hb, newMaterial.hardness_hb) /
                      Math.max(mat.hardness_hb, newMaterial.hardness_hb);
      sim += 0.3 * hbRatio;

      // Tensile strength similarity
      if (newMaterial.tensile_mpa) {
        const tsRatio = Math.min(mat.tensile_mpa, newMaterial.tensile_mpa) /
                        Math.max(mat.tensile_mpa, newMaterial.tensile_mpa);
        sim += 0.2 * tsRatio;
      } else {
        sim += 0.1; // Neutral if not provided
      }

      // Thermal conductivity similarity
      if (newMaterial.thermal_k) {
        const kRatio = Math.min(mat.thermal_k, newMaterial.thermal_k) /
                       Math.max(mat.thermal_k, newMaterial.thermal_k);
        sim += 0.2 * kRatio;
      } else {
        sim += 0.1;
      }

      similarities.push({ mat, sim });
    }

    // Sort by similarity and take top k
    similarities.sort((a, b) => b.sim - a.sim);
    const topK = similarities.slice(0, k);

    // Weighted average of parameters
    const range = SPEED_RANGES[newMaterial.iso_group];
    let totalWeight = 0;
    let weightedVc = 0;
    let weightedF = 0;
    let weightedAp = 0;

    const similarMaterials: Array<{ material_id: string; similarity: number; params: LatheCuttingParams }> = [];

    for (const { mat, sim } of topK) {
      // Base parameters for similar material
      const baseVc = range.typical;
      const miRatio = mat.machinability_index;
      const matVc = baseVc * Math.pow(miRatio, 0.5);

      // Operation-based feed/DOC
      const matF = (operation.feed_range.min + operation.feed_range.max) / 2;
      const matAp = (operation.doc_range.min + operation.doc_range.max) / 2;

      const params: LatheCuttingParams = {
        Vc: parseFloat(matVc.toFixed(1)),
        f: parseFloat(matF.toFixed(3)),
        ap: parseFloat(matAp.toFixed(2)),
      };

      similarMaterials.push({
        material_id: mat.material_id,
        similarity: parseFloat(sim.toFixed(3)),
        params,
      });

      weightedVc += sim * matVc;
      weightedF += sim * matF;
      weightedAp += sim * matAp;
      totalWeight += sim;
    }

    const avgVc = weightedVc / totalWeight;
    const avgF = weightedF / totalWeight;
    const avgAp = weightedAp / totalWeight;

    // Confidence based on similarity of top matches
    const avgSim = topK.reduce((s, t) => s + t.sim, 0) / k;
    const confidence = Math.min(avgSim * 1.2, 0.9);

    return {
      value: {
        params: {
          Vc: parseFloat(avgVc.toFixed(1)),
          f: parseFloat(avgF.toFixed(3)),
          ap: parseFloat(avgAp.toFixed(2)),
        },
        similar_materials: similarMaterials,
        confidence: parseFloat(confidence.toFixed(3)),
      },
      unit: "mixed",
      formula: `Weighted k-NN (k=${k}) with material property similarity`,
      confidence,
    };
  }

  // ==========================================================================
  // NEW MACHINE COMMISSIONING
  // ==========================================================================

  /**
   * Generate recommended parameters for commissioning a new machine.
   *
   * Uses transfer from similar machines with appropriate safety margins.
   */
  commissionNewMachine(
    newMachine: MachineDomain,
    referenceMachines: MachineDomain[],
    testMaterial: MaterialDomain,
    operation: OperationDomain
  ): AtomicValue<{
    recommended_params: LatheCuttingParams;
    test_sequence: Array<{
      step: number;
      params: LatheCuttingParams;
      purpose: string;
    }>;
    validation_criteria: string[];
  }> {
    // Find most similar reference machine
    let bestRef: MachineDomain | null = null;
    let bestSim = 0;

    for (const ref of referenceMachines) {
      const sim = this.computeMachineSimilarity(ref, newMachine);
      if (sim > bestSim) {
        bestSim = sim;
        bestRef = ref;
      }
    }

    if (!bestRef) {
      // No reference — use conservative defaults
      const range = SPEED_RANGES[testMaterial.iso_group];
      return {
        value: {
          recommended_params: {
            Vc: range.min,
            f: operation.feed_range.min,
            ap: operation.doc_range.min,
          },
          test_sequence: [],
          validation_criteria: ["No reference machine available — use manufacturer recommendations"],
        },
        unit: "mixed",
        confidence: 0.3,
      };
    }

    // Transfer from reference with commissioning margins
    const range = SPEED_RANGES[testMaterial.iso_group];
    const baseVc = range.typical * testMaterial.machinability_index;
    const baseF = (operation.feed_range.min + operation.feed_range.max) / 2;
    const baseAp = (operation.doc_range.min + operation.doc_range.max) / 2;

    // Apply machine capability scaling
    const powerScale = Math.min(newMachine.spindle_power_kw / bestRef.spindle_power_kw, 1.0);
    const rigidityScale = Math.min(newMachine.rigidity_n_per_um / bestRef.rigidity_n_per_um, 1.0);

    const scaledVc = baseVc * Math.pow(powerScale, 0.5);
    const scaledAp = baseAp * Math.pow(rigidityScale, 0.6);

    // Commissioning test sequence (ramp up)
    const testSequence = [
      {
        step: 1,
        params: { Vc: scaledVc * 0.5, f: baseF * 0.5, ap: scaledAp * 0.3 },
        purpose: "Initial light cut — verify spindle, axes, coolant",
      },
      {
        step: 2,
        params: { Vc: scaledVc * 0.7, f: baseF * 0.7, ap: scaledAp * 0.5 },
        purpose: "Medium load — check for vibration, thermal stability",
      },
      {
        step: 3,
        params: { Vc: scaledVc * 0.85, f: baseF * 0.85, ap: scaledAp * 0.75 },
        purpose: "Near-production — verify power consumption, surface finish",
      },
      {
        step: 4,
        params: { Vc: scaledVc, f: baseF, ap: scaledAp },
        purpose: "Production parameters — full validation",
      },
    ];

    const validationCriteria = [
      "Spindle runs smoothly at all speeds — no unusual noise",
      "Axis movements are smooth with no backlash in reversals",
      "Coolant delivery adequate — no dry spots on tool",
      "Surface finish meets target Ra specification",
      "Tool wear is consistent with expected rate",
      "No thermal drift over 30-minute continuous cutting",
      "Chip evacuation efficient — no bird-nesting",
      "Power consumption within machine rating",
    ];

    return {
      value: {
        recommended_params: {
          Vc: parseFloat(scaledVc.toFixed(1)),
          f: parseFloat(baseF.toFixed(3)),
          ap: parseFloat(scaledAp.toFixed(2)),
        },
        test_sequence: testSequence.map((t) => ({
          ...t,
          params: {
            Vc: parseFloat(t.params.Vc.toFixed(1)),
            f: parseFloat(t.params.f.toFixed(3)),
            ap: parseFloat(t.params.ap.toFixed(2)),
          },
        })),
        validation_criteria: validationCriteria,
      },
      unit: "mixed",
      formula: "Reference machine transfer with commissioning ramp-up",
      confidence: bestSim * 0.9,
    };
  }

  // ==========================================================================
  // CROSS-CUSTOMER KNOWLEDGE SHARING
  // ==========================================================================

  /**
   * Share knowledge from one customer's successful programs to another.
   *
   * Anonymizes proprietary details while preserving useful parameter ranges.
   */
  shareCustomerKnowledge(
    sourceCustomer: {
      id: string;
      programs: PerformanceRecord[];
      allow_sharing: boolean;
    },
    targetCustomer: {
      id: string;
      materials_of_interest: string[];
      operations_of_interest: string[];
    }
  ): AtomicValue<{
    shared_insights: Array<{
      material: string;
      operation: string;
      param_ranges: {
        Vc: { min: number; max: number; recommended: number };
        f: { min: number; max: number; recommended: number };
        ap: { min: number; max: number; recommended: number };
      };
      success_rate: number;
      sample_size: number;
    }>;
    privacy_applied: boolean;
  }> {
    if (!sourceCustomer.allow_sharing) {
      return {
        value: {
          shared_insights: [],
          privacy_applied: true,
        },
        unit: "mixed",
        confidence: 0,
        warning: "Source customer has not enabled knowledge sharing",
      };
    }

    // Filter for relevant materials and operations
    const relevant = sourceCustomer.programs.filter(
      (p) =>
        targetCustomer.materials_of_interest.some(
          (m) => m.toLowerCase() === p.material_id.toLowerCase() ||
                 this.getMaterial(m).iso_group === this.getMaterial(p.material_id).iso_group
        ) &&
        targetCustomer.operations_of_interest.some(
          (o) => o.toLowerCase() === p.operation.toLowerCase()
        )
    );

    // Group by material + operation
    const groups = new Map<string, PerformanceRecord[]>();
    for (const record of relevant) {
      const key = `${record.material_id}_${record.operation}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    }

    // Generate anonymized insights
    const sharedInsights: Array<{
      material: string;
      operation: string;
      param_ranges: {
        Vc: { min: number; max: number; recommended: number };
        f: { min: number; max: number; recommended: number };
        ap: { min: number; max: number; recommended: number };
      };
      success_rate: number;
      sample_size: number;
    }> = [];

    for (const [key, records] of Array.from(groups.entries())) {
      if (records.length < 3) continue; // Require minimum sample for anonymization

      const [material, operation] = key.split("_");
      const successRecords = records.filter((r) => r.success);

      const vcValues = successRecords.map((r) => r.params.Vc);
      const fValues = successRecords.map((r) => r.params.f);
      const apValues = successRecords.map((r) => r.params.ap);

      if (vcValues.length === 0) continue;

      const insight = {
        material,
        operation,
        param_ranges: {
          Vc: {
            min: Math.min(...vcValues),
            max: Math.max(...vcValues),
            recommended: vcValues.reduce((a, b) => a + b, 0) / vcValues.length,
          },
          f: {
            min: Math.min(...fValues),
            max: Math.max(...fValues),
            recommended: fValues.reduce((a, b) => a + b, 0) / fValues.length,
          },
          ap: {
            min: Math.min(...apValues),
            max: Math.max(...apValues),
            recommended: apValues.reduce((a, b) => a + b, 0) / apValues.length,
          },
        },
        success_rate: successRecords.length / records.length,
        sample_size: records.length,
      };

      // Round values to obscure exact proprietary parameters
      insight.param_ranges.Vc.min = Math.round(insight.param_ranges.Vc.min / 5) * 5;
      insight.param_ranges.Vc.max = Math.round(insight.param_ranges.Vc.max / 5) * 5;
      insight.param_ranges.Vc.recommended = Math.round(insight.param_ranges.Vc.recommended / 5) * 5;

      sharedInsights.push(insight);
    }

    return {
      value: {
        shared_insights: sharedInsights,
        privacy_applied: true,
      },
      unit: "mixed",
      formula: "Aggregated statistics with k-anonymization (k≥3)",
      confidence: sharedInsights.length > 0 ? 0.8 : 0.3,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheTransferLearningEngine = new LatheTransferLearningEngine();
