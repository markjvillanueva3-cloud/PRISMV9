/**
 * PostProcessorPipelineEngine — Universal Post Processor Pipeline Orchestrator
 *
 * Chains 35+ optimization stages across 7 phases to produce mathematically
 * optimized G-code for any machine, controller, and CAM software.
 *
 * Pipeline Phases:
 *   P0: Input Normalization + Smart Defaults
 *   P1: Physics Foundation (per operation)
 *   P2: Block-by-Block Optimization (per G-code line)
 *   P3: Motion Optimization
 *   P4: Stochastic Verification
 *   P5: Safety + Knowledge
 *   P6: Output Generation
 *
 * Each stage is independently enable/disable-able. Stages that lack required
 * input data are gracefully skipped with a warning.
 *
 * @module PostProcessorPipelineEngine
 */

import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";
import {
  CANONICAL_KIENZLE, type ISOGroup,
  CANONICAL_TAYLOR,
  kienzleForce, taylorLife, toolDeflection, predictedRa,
  cuttingPower, spindleTorque, rpmFromVc,
} from "../physics/constants.js";

// ─── Type Definitions ────────────────────────────────────────────────

export type { ISOGroup };

export type ControllerFamily =
  | "fanuc" | "siemens" | "heidenhain" | "haas" | "mazak" | "okuma"
  | "brother" | "doosan" | "hurco" | "mitsubishi" | "fagor";

export type ToolType =
  | "flat_endmill" | "ball_endmill" | "bull_nose" | "face_mill"
  | "drill" | "tap" | "reamer" | "chamfer" | "boring_bar"
  | "insert_mill" | "thread_mill" | "slot_drill";

export type MoveType = "G0" | "G1" | "G2" | "G3" | "drill_cycle" | "tap_cycle" | "probe";

export type OptimizationTarget = "balanced" | "max_speed" | "max_tool_life" | "min_cost" | "surface_quality";

export type BlockClassification =
  | "rapid" | "air_cut" | "light" | "nominal" | "heavy" | "corner" | "slotting" | "plunge" | "ramp";

export type StageStatus = "pass" | "warn" | "fail" | "skipped";

/** A single toolpath block — the universal internal representation */
export interface ToolpathBlock {
  id: number;
  move_type: MoveType;
  x?: number; y?: number; z?: number;
  a?: number; b?: number; c?: number;
  i?: number; j?: number; k?: number; r?: number;
  feed_mm_min?: number;
  spindle_rpm?: number;
  tool_number?: number;
  // Engagement data (filled by Phase 2)
  engagement?: {
    ae_mm: number;
    ap_mm: number;
    theta_deg: number;
    d_eff_mm: number;
    chip_thinning_factor: number;
    classification: BlockClassification;
  };
  // Force data (filled by Phase 1/2)
  forces?: {
    Fc_N: number;
    Ff_N: number;
    Fp_N: number;
    resultant_N: number;
    power_kW: number;
    torque_Nm: number;
  };
  // Thermal data (filled by Phase 2)
  thermal?: {
    T_tool_C: number;
    T_chip_C: number;
    cumulative_heat_J: number;
  };
  // Wear data (filled by Phase 2)
  wear?: {
    VB_mm: number;
    VB_rate_mm_per_min: number;
    remaining_life_pct: number;
  };
  // Confidence intervals (filled by Phase 4)
  confidence?: {
    force_ci_95: [number, number];
    feed_ci_95: [number, number];
    Ra_ci_95?: [number, number];
  };
  // Optimization data (filled during pipeline)
  optimization?: {
    original_feed: number;
    optimized_feed: number;
    original_rpm: number;
    optimized_rpm: number;
    reasons: string[];
  };
  // Thread quality data (filled by Stage 1.5b thread milling physics)
  thread_quality?: {
    predicted_class: string;
    deflection_mm: number;
    within_tolerance: boolean;
    recommendations: string[];
  };
}

/** Resolved machine context from 910-machine catalog */
export interface MachineContext {
  id: string;
  name: string;
  brand: string;
  controller: ControllerFamily;
  controller_version?: string;
  max_rpm: number;
  max_power_kW: number;
  max_torque_Nm?: number;
  rapid_rate_mm_min: { x: number; y: number; z: number };
  accel_mm_s2?: { x: number; y: number; z: number };
  jerk_mm_s3?: { x: number; y: number; z: number };
  work_volume: { x: number; y: number; z: number };
  spindle_taper?: string;
  atc_type?: "side_mount" | "umbrella" | "turret" | "magazine" | "chain";
  atc_capacity?: number;
  tool_change_time_s?: number;
  axes: number; // 3, 4, or 5
  kinematics?: "table_table" | "head_head" | "head_table" | "table_head";
  coolant_types?: ("flood" | "mist" | "tsc" | "mql" | "cryo")[];
  tsc_pressure_bar?: number;
  resolution_confidence: number; // 0-1, how well matched
}

/** Resolved tool context from 46,590-tool catalog */
export interface ToolContext {
  id: string;
  catalog_id?: string;
  manufacturer?: string;
  type: ToolType;
  diameter_mm: number;
  flute_count: number;
  flute_length_mm?: number;
  overall_length_mm?: number;
  corner_radius_mm?: number;
  helix_angle_deg?: number;
  material: "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd";
  coating?: string;
  grade?: string;
  kc1_1?: number; // specific cutting force
  mc?: number;    // Kienzle exponent
  max_Vc_m_min?: number;
  max_rpm?: number;
  stiffness_N_per_mm?: number;
  runout_TIR_mm?: number;
  rake_angle_deg?: number;       // gamma (axial rake for end mills)
  lead_angle_deg?: number;       // kappa (KAPR per ISO 3002)
  edge_radius_um?: number;       // edge honing radius in µm
  wear_VB_mm?: number;           // current flank wear (0 = fresh)
  resolution_confidence: number;
}

/** Resolved holder context from 1,164-holder catalog */
export interface HolderContext {
  id: string;
  type: string;
  taper: string;
  gauge_length_mm: number;
  stiffness_N_per_mm?: number;
  max_rpm?: number;
  balance_grade?: string;
  clamping_type?: "shrink_fit" | "hydraulic" | "collet" | "side_lock" | "weldon" | "milling_chuck";
  resolution_confidence: number;
}

/** Resolved material context from 2,957-material DB */
export interface MaterialContext {
  id: string;
  name: string;
  iso_group: ISOGroup;
  uts_MPa?: number;
  hardness_HB?: number;
  hardness_HRC?: number;
  thermal_conductivity_W_mK?: number;
  specific_heat_J_kgK?: number;
  density_kg_m3?: number;
  elastic_modulus_GPa?: number;
  // Johnson-Cook constitutive model params
  jc_A?: number; jc_B?: number; jc_n?: number; jc_C?: number; jc_m?: number;
  // Kienzle cutting force params
  kc1_1?: number;
  mc?: number;
  // Zerilli-Armstrong params
  za_C0?: number; za_C1?: number; za_C3?: number; za_C4?: number; za_C5?: number;
  resolution_confidence: number;
}

/** Coolant context */
export interface CoolantContext {
  type: "flood" | "mist" | "tsc" | "mql" | "cryo" | "dry";
  pressure_bar?: number;
  flow_rate_l_min?: number;
  concentration_pct?: number;
  nozzle_count?: number;
}

/** Operation definition — one per tool section */
export interface OperationDef {
  id: number;
  name?: string;
  type: string; // facing, profiling, pocketing, drilling, etc.
  tool_number: number;
  tool?: ToolContext;
  holder?: HolderContext;
  ae_mm?: number;
  ap_mm?: number;
  tolerance_mm?: number;
  surface_finish_Ra?: number;
  coolant?: CoolantContext;
  blocks: ToolpathBlock[];
}

/** Stage configuration — enable/disable individual stages */
export interface StageConfig {
  // Phase 0
  feature_selection?: boolean;
  calibration?: boolean;
  // Phase 1
  speed_feed?: boolean;
  constitutive?: boolean;
  stability_lobes?: boolean;
  spindle_harmonics?: boolean;
  tool_deflection?: boolean;
  chip_morphology?: boolean;
  coolant_strategy?: boolean;
  fixture_check?: boolean;
  capability_forecast?: boolean;
  // Phase 2
  line_by_line_adaptive?: boolean;
  engagement_analysis?: boolean;
  chip_thinning?: boolean;
  adaptive_feed?: boolean;
  corner_detection?: boolean;
  plunge_detection?: boolean;
  wear_progression?: boolean;
  thermal_tracking?: boolean;
  coupled_thermal_wear?: boolean;
  deflection_limit?: boolean;
  thread_milling_physics?: boolean;
  // Phase 3
  stability_rewrite?: boolean;
  toolpath_smoothing?: boolean;
  motion_dynamics?: boolean;
  look_ahead?: boolean;
  multi_axis?: boolean;
  controller_features?: boolean;
  machine_error_