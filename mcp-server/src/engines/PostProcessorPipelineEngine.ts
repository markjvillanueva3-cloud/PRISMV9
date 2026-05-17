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
  machine_error_comp?: boolean;
  // Phase 4
  monte_carlo?: boolean;
  uncertainty_propagation?: boolean;
  dimensional_verification?: boolean;
  surface_finish_verification?: boolean;
  environmental?: boolean;
  batch_variability?: boolean;
  robustness_score?: boolean;
  // Phase 5
  safety_analysis?: boolean;
  playbook_rules?: boolean;
  tribal_knowledge?: boolean;
  reliability_check?: boolean;
  energy_optimization?: boolean;
  sustainability_lca?: boolean;
  acoustic_check?: boolean;
  // Phase 6
  gcode_generation?: boolean;
  controller_params?: boolean;
  probe_routines?: boolean;
  setup_sheet?: boolean;
  rl_formatting?: boolean;
  analytics_report?: boolean;
  cycle_time?: boolean;
  digital_twin?: boolean;
}

/** Pipeline input — the complete job specification */
export interface PipelineInput {
  // Input data (at least one required)
  gcode?: string;
  cl_data?: string;
  blocks?: ToolpathBlock[];
  // Context (resolved or raw for auto-resolution)
  machine?: MachineContext | { name: string; [k: string]: unknown };
  material?: MaterialContext | { name: string; iso_group?: ISOGroup; [k: string]: unknown };
  tools?: (ToolContext | { tool_number: number; diameter_mm: number; [k: string]: unknown })[];
  holders?: (HolderContext | { type?: string; [k: string]: unknown })[];
  operations?: OperationDef[];
  coolant?: CoolantContext;
  // Configuration
  controller?: ControllerFamily;
  aggressiveness?: number; // 0.0 conservative → 1.0 aggressive, default 0.5
  optimization_target?: OptimizationTarget;
  stages?: Partial<StageConfig>;
  // Tolerances & targets
  tolerance_mm?: number;
  surface_finish_Ra?: number;
  // Output options
  include_setup_sheet?: boolean;
  include_analytics?: boolean;
  include_probe_routines?: boolean;
  /** Feature list to auto-configure pipeline stages. Empty = auto-detect. */
  features?: string[];
  debug?: boolean;
  /** PPG-VAR-MS0 U09: Output mode — self_contained strips PRISM comments for standalone use */
  output_mode?: "pipeline_optimized" | "self_contained";
}

/** Result of a single pipeline stage */
export interface StageResult {
  stage: string;
  phase: number;
  status: StageStatus;
  duration_ms: number;
  summary: string;
  data: unknown;
}

/** Analytics report */
export interface AnalyticsReport {
  per_operation: Array<{
    operation_id: number;
    tool_number: number;
    force_range_N: [number, number];
    power_range_kW: [number, number];
    temperature_range_C: [number, number];
    mrr_cm3_min: number;
    tool_life_consumed_pct: number;
    cost_per_part_tool: number;
  }>;
  overall: {
    total_cycle_time_s: number;
    cutting_time_s: number;
    non_cutting_time_s: number;
    energy_estimate_kWh: number;
    cost_estimate: number;
  };
  optimization_impact: {
    time_saved_pct: number;
    force_reduction_pct: number;
    tool_life_improvement_pct: number;
    surface_consistency_improvement_pct: number;
  };
  /** PP-MOAT-MS2 U01: Source of physics constants (canonical or calibrated) */
  calibration_source?: string;
  /** PP-MOAT-MS2 U04: Sustainability LCA data */
  sustainability?: {
    co2_kg_per_part: number;
    energy_kWh_per_part: number;
    coolant_cost_per_part: number;
    sustainability_score: number;
    lca_categories?: {
      GWP_kg_CO2_eq: number;
      AP_kg_SO2_eq: number;
      EP_kg_PO4_eq: number;
    };
  };
}

/** Complete pipeline output */
export interface PipelineOutput {
  /** Optimized G-code string */
  output_gcode: string;
  /** Per-stage results with timing and status */
  stages: StageResult[];
  /** Overall pipeline status */
  overall_status: StageStatus;
  /** Total pipeline execution time */
  total_duration_ms: number;
  /** Resolved contexts used */
  resolved: {
    machine?: MachineContext;
    material?: MaterialContext;
    tools: ToolContext[];
    holders: HolderContext[];
    coolant?: CoolantContext;
  };
  /** All blocks with optimization data attached */
  blocks: ToolpathBlock[];
  /** Operations with per-operation metrics */
  operations: OperationDef[];
  /** Analytics report (if enabled) */
  analytics?: AnalyticsReport;
  /** Feature selection report (if feature_selection stage ran) */
  feature_selection?: {
    selected: Array<{ id: string; name: string; score: number }>;
    rejected: Array<{ id: string; reason: string }>;
    confidence: number;
    improvements: { cycle_time_pct: number; surface_quality_pct: number; tool_life_pct: number; safety_score: number };
  };
  /** Setup sheet data (if enabled) */
  setup_sheet?: Record<string, unknown>;
  /** All warnings generated */
  warnings: string[];
  /** Aggressiveness used */
  aggressiveness: number;
  /** Optimization target used */
  optimization_target: OptimizationTarget;
}

// ─── Constants ───────────────────────────────────────────────────────

const DEFAULT_AGGRESSIVENESS = 0.5;
const DEFAULT_TOLERANCE_MM = 0.05; // ISO 2768-m general
const DEFAULT_RA_ROUGHING = 3.2;
const DEFAULT_RA_FINISHING = 0.8;
const DEFAULT_RA_SEMI = 1.6;
const SLOTTING_FEED_DERATING = 0.7; // 70% feed for full slot (chip evacuation)

/**
 * PP-MOAT-MS3 U04: CAM Post Strategy Lookup
 * Source: fusion-post-strategies.json + cimco-post-strategies.json
 * CAM-proven arc max angles and helix linearization rules per controller family.
 */
const CAM_POST_STRATEGIES: Record<string, {
  max_arc_sweep_deg: number;
  allow_helical: boolean;
  allow_spiral: boolean;
  helix_linearize_tolerance_mm: number;
  source: string;
}> = {
  haas:            { max_arc_sweep_deg: 355, allow_helical: true, allow_spiral: true, helix_linearize_tolerance_mm: 0.01, source: "fusion-post-strategies" },
  fanuc:           { max_arc_sweep_deg: 180, allow_helical: true, allow_spiral: false, helix_linearize_tolerance_mm: 0.01, source: "fusion-post-strategies" },
  siemens:         { max_arc_sweep_deg: 90, allow_helical: true, allow_spiral: false, helix_linearize_tolerance_mm: 0.01, source: "fusion-post-strategies" },
  mazak:           { max_arc_sweep_deg: 90, allow_helical: true, allow_spiral: true, helix_linearize_tolerance_mm: 0.01, source: "fusion-post-strategies" },
  heidenhain:      { max_arc_sweep_deg: 180, allow_helical: true, allow_spiral: false, helix_linearize_tolerance_mm: 0.01, source: "cimco-post-strategies" },
  okuma:           { max_arc_sweep_deg: 180, allow_helical: true, allow_spiral: false, helix_linearize_tolerance_mm: 0.01, source: "cimco-post-strategies" },
  brother:         { max_arc_sweep_deg: 180, allow_helical: true, allow_spiral: false, helix_linearize_tolerance_mm: 0.01, source: "cimco-post-strategies" },
  mitsubishi:      { max_arc_sweep_deg: 180, allow_helical: true, allow_spiral: false, helix_linearize_tolerance_mm: 0.01, source: "cimco-post-strategies" },
  hurco:           { max_arc_sweep_deg: 180, allow_helical: true, allow_spiral: false, helix_linearize_tolerance_mm: 0.01, source: "cimco-post-strategies" },
  generic:         { max_arc_sweep_deg: 180, allow_helical: true, allow_spiral: false, helix_linearize_tolerance_mm: 0.02, source: "default" },
};

/** Resolve CAM post strategy for a controller string */
function getCAMPostStrategy(controller: string): typeof CAM_POST_STRATEGIES[string] {
  // Direct match
  if (CAM_POST_STRATEGIES[controller]) return CAM_POST_STRATEGIES[controller];
  // Family match: "fanuc_31i" → "fanuc", "siemens_840d" → "siemens"
  for (const family of Object.keys(CAM_POST_STRATEGIES)) {
    if (controller.startsWith(family)) return CAM_POST_STRATEGIES[family];
  }
  return CAM_POST_STRATEGIES.generic;
}

/**
 * CIMCO helix linearization segment count formula
 * Ref: cimco-post-strategies.json — helix_linearization_algorithm
 * m = round(sweep * sqrt(radius / tolerance / 8) + 1)
 */
function helixLinearizationSegments(sweepRad: number, radiusMm: number, toleranceMm: number): number {
  return Math.round(Math.abs(sweepRad) * Math.sqrt(radiusMm / toleranceMm / 8) + 1);
}

/**
 * Kienzle kc1.1 / mc fallback lookup — delegates to CANONICAL_KIENZLE from constants.ts.
 * Previously inlined as DEFAULT_KC1_1/DEFAULT_MC with non-canonical values
 * (P=2000, M=2400, K=1200, N=800, H=3500). Fixed to canonical Sandvik reference values.
 * See: Altintas "Manufacturing Automation" Table 2.1
 */
const getCanonicalKc = (iso: ISOGroup): number => CANONICAL_KIENZLE[iso]?.kc1_1 ?? 1800;
const getCanonicalMc = (iso: ISOGroup): number => CANONICAL_KIENZLE[iso]?.mc ?? 0.25;

// ─── G-code Parser ───────────────────────────────────────────────────

/** Parse raw G-code string into ToolpathBlock[] */
function parseGCode(gcode: string): { blocks: ToolpathBlock[]; tools: Map<number, { diameter_mm?: number }> } {
  const lines = gcode.split(/\r?\n/);
  const blocks: ToolpathBlock[] = [];
  const tools = new Map<number, { diameter_mm?: number }>();
  let currentTool = 0;
  let blockId = 0;
  let modalMove: MoveType = "G0";
  let lastX: number | undefined, lastY: number | undefined, lastZ: number | undefined;
  let lastFeed: number | undefined, lastSpindle: number | undefined;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("(") || line.startsWith(";") || line.startsWith("%") || line.startsWith("O")) continue;

    // Tool change
    const toolMatch = line.match(/T(\d+)/);
    if (toolMatch) {
      currentTool = parseInt(toolMatch[1], 10);
      if (!tools.has(currentTool)) tools.set(currentTool, {});
    }

    // Spindle
    const sMatch = line.match(/S(\d+\.?\d*)/);
    if (sMatch) lastSpindle = parseFloat(sMatch[1]);

    // Feed
    const fMatch = line.match(/F(\d+\.?\d*)/);
    if (fMatch) lastFeed = parseFloat(fMatch[1]);

    // Move type
    const gMatch = line.match(/G0?([0-3])\b/);
    if (gMatch) {
      const gNum = parseInt(gMatch[1], 10);
      if (gNum <= 3) modalMove = `G${gNum}` as MoveType;
    }

    // Drill cycles
    if (/G8[1-9]|G73/.test(line)) {
      modalMove = "drill_cycle" as MoveType;
    }
    if (/G84/.test(line)) {
      modalMove = "tap_cycle" as MoveType;
    }

    // Coordinates
    const xMatch = line.match(/X(-?\d+\.?\d*)/);
    const yMatch = line.match(/Y(-?\d+\.?\d*)/);
    const zMatch = line.match(/Z(-?\d+\.?\d*)/);
    const iMatch = line.match(/I(-?\d+\.?\d*)/);
    const jMatch = line.match(/J(-?\d+\.?\d*)/);
    const kMatch = line.match(/K(-?\d+\.?\d*)/);
    const rMatch = line.match(/R(-?\d+\.?\d*)/);

    const hasCoords = xMatch || yMatch || zMatch;
    if (!hasCoords && !(/G[89]\d/.test(line))) continue;

    const x = xMatch ? parseFloat(xMatch[1]) : lastX;
    const y = yMatch ? parseFloat(yMatch[1]) : lastY;
    const z = zMatch ? parseFloat(zMatch[1]) : lastZ;

    const block: ToolpathBlock = {
      id: blockId++,
      move_type: modalMove,
      x, y, z,
      feed_mm_min: modalMove === "G0" ? undefined : lastFeed,
      spindle_rpm: lastSpindle,
      tool_number: currentTool,
    };

    if (iMatch) block.i = parseFloat(iMatch[1]);
    if (jMatch) block.j = parseFloat(jMatch[1]);
    if (kMatch) block.k = parseFloat(kMatch[1]);
    if (rMatch) block.r = parseFloat(rMatch[1]);

    blocks.push(block);
    lastX = x; lastY = y; lastZ = z;
  }

  return { blocks, tools };
}

/** Parse CL/APT data into ToolpathBlock[] */
function parseCLData(clData: string): { blocks: ToolpathBlock[]; tools: Map<number, { diameter_mm?: number }> } {
  const lines = clData.split(/\r?\n/);
  const blocks: ToolpathBlock[] = [];
  const tools = new Map<number, { diameter_mm?: number }>();
  let blockId = 0;
  let currentTool = 0;
  let lastFeed: number | undefined;
  let lastSpindle: number | undefined;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("$$")) continue;

    // GOTO/x,y,z
    const gotoMatch = line.match(/GOTO\s*\/\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    if (gotoMatch) {
      blocks.push({
        id: blockId++,
        move_type: "G1",
        x: parseFloat(gotoMatch[1]),
        y: parseFloat(gotoMatch[2]),
        z: parseFloat(gotoMatch[3]),
        feed_mm_min: lastFeed,
        spindle_rpm: lastSpindle,
        tool_number: currentTool,
      });
      continue;
    }

    // RAPID
    const rapidMatch = line.match(/RAPID/);
    if (rapidMatch) {
      // Next GOTO will be rapid
      const nextGoto = line.match(/GOTO\s*\/\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
      if (nextGoto) {
        blocks.push({
          id: blockId++,
          move_type: "G0",
          x: parseFloat(nextGoto[1]),
          y: parseFloat(nextGoto[2]),
          z: parseFloat(nextGoto[3]),
          tool_number: currentTool,
        });
      }
      continue;
    }

    // FEDRAT
    const fedMatch = line.match(/FEDRAT\s*\/\s*(\d+\.?\d*)/);
    if (fedMatch) lastFeed = parseFloat(fedMatch[1]);

    // SPINDL
    const spindlMatch = line.match(/SPINDL\s*\/\s*(\d+\.?\d*)/);
    if (spindlMatch) lastSpindle = parseFloat(spindlMatch[1]);

    // LOADTL / TURRET
    const toolMatch = line.match(/(?:LOADTL|TURRET)\s*\/\s*(\d+)/);
    if (toolMatch) {
      currentTool = parseInt(toolMatch[1], 10);
      if (!tools.has(currentTool)) tools.set(currentTool, {});
    }

    // CIRCLE
    const circMatch = line.match(/CIRCLE\s*\/\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    if (circMatch) {
      blocks.push({
        id: blockId++,
        move_type: "G2",
        x: parseFloat(circMatch[1]),
        y: parseFloat(circMatch[2]),
        z: parseFloat(circMatch[3]),
        r: parseFloat(circMatch[4]),
        feed_mm_min: lastFeed,
        spindle_rpm: lastSpindle,
        tool_number: currentTool,
      });
    }
  }

  return { blocks, tools };
}

// ─── Pipeline Implementation ─────────────────────────────────────────

class PostProcessorPipelineEngineImpl {
  // Lazy-loaded engines
  private _ultimateSF: any = null;
  private _instantaneousEng: any = null;
  private _engagementAdaptive: any = null;
  private _safetyAnalyzer: any = null;
  private _playbook: any = null;
  private _motionDynamics: any = null;
  private _toolpathSmoothing: any = null;
  private _cycleTimeEst: any = null;
  private _thermalEngine: any = null;
  private _energyOpt: any = null;
  private _toolSelection: any = null;
  private _constitutive: any = null;
  private _stochasticChatter: any = null;
  private _stochasticDeflection: any = null;
  private _chipMorphology: any = null;
  private _coolantDynamics: any = null;
  private _fixtureClamping: any = null;
  private _processCapability: any = null;
  private _controllerDialect: any = null;
  private _speedFeedOrchestrator: any = null;
  private _postSelection: any = null;
  private _advancedPost: any = null;
  private _probeGenerator: any = null;
  private _lineByLine: any = null;
  private _stabilityRewriter: any = null;
  private _probingCycle: any = null;
  private _threadMilling: any = null;
  private _omegaSafety: any = null;
  private _predictionCalibration: any = null;
  private _thermalWearCoupling: any = null;
  private _rlPostProcessor: any = null;
  private _sustainabilityLCA: any = null;

  /** Get a lazily-loaded engine by name */
  private async _getEngine(name: string): Promise<any> {
    switch (name) {
      case "ultimateSF":
        return (this._ultimateSF ??= (await import("./UltimateSpeedFeedEngine.js")).ultimateSpeedFeedEngine);
      case "instantaneous":
        return (this._instantaneousEng ??= (await import("./InstantaneousEngagementEngine.js")).instantaneousEngagementEngine);
      case "engagementAdaptive":
        return (this._engagementAdaptive ??= (await import("./EngagementAdaptiveFeedEngine.js")).engagementAdaptiveFeedEngine);
      case "safety":
        return (this._safetyAnalyzer ??= (await import("./GCodeSafetyAnalyzerEngine.js")).gcSafetyAnalyzer);
      case "playbook":
        return (this._playbook ??= (await import("./MachiningPlaybookEngine.js")).machiningPlaybookEngine);
      case "motionDynamics":
        return (this._motionDynamics ??= (await import("./MotionDynamicsProfileEngine.js")).motionDynamicsProfileEngine);
      case "smoothing":
        return (this._toolpathSmoothing ??= (await import("./ToolpathSmoothingEngine.js")).toolpathSmoothingEngine);
      case "cycleTime":
        return (this._cycleTimeEst ??= (await import("./CycleTimeEstimatorEngine.js")).cycleTimeEstimatorEngine);
      case "thermal":
        return (this._thermalEngine ??= (await import("./ToolpathThermalEngine.js")).toolpathThermalEngine);
      case "energy":
        return (this._energyOpt ??= (await import("./GCodeEnergyOptimizerEngine.js")).gcodeEnergyOptimizerEngine);
      case "toolSelection":
        return (this._toolSelection ??= (await import("./ToolSelectionEngine.js")).toolSelectionEngine);
      case "constitutive":
        return (this._constitutive ??= (await import("./ConstitutiveModelEngine.js")).constitutiveModelEngine);
      case "stochasticChatter":
        return (this._stochasticChatter ??= (await import("./StochasticChatterEngine.js")).stochasticChatterEngine);
      case "stochasticDeflection":
        return (this._stochasticDeflection ??= (await import("./StochasticDeflectionEngine.js")).stochasticDeflectionEngine);
      case "chipMorphology":
        return (this._chipMorphology ??= (await import("./ChipMorphologyDiagnosticEngine.js")).chipMorphologyDiagnosticEngine);
      case "coolantDynamics":
        return (this._coolantDynamics ??= (await import("./CoolantDynamicsEngine.js")).coolantDynamicsEngine);
      case "fixtureClamping":
        return (this._fixtureClamping ??= (await import("./FixtureClampingEngine.js")).fixtureClampingEngine);
      case "processCapability":
        return (this._processCapability ??= (await import("./ProcessCapabilityPredictionEngine.js")).processCapabilityPredictionEngine);
      case "controllerDialect":
        return (this._controllerDialect ??= (await import("./ControllerDialectEngine.js")).controllerDialectEngine);
      case "speedFeedOrchestrator":
        return (this._speedFeedOrchestrator ??= (await import("./SpeedFeedOrchestratorEngine.js")).speedFeedOrchestratorEngine);
      case "fiveAxisPost":
        return (await import("./FiveAxisPostEngine.js")).fiveAxisPostEngine;
      case "ppVerify":
        return (await import("./PostProcessorVerificationEngine.js")).postProcessorVerificationEngine;
      case "postSelection":
        return (this._postSelection ??= (await import("./PostSelectionEngine.js")).postSelectionEngine);
      case "advancedPost":
        return (this._advancedPost ??= (await import("./AdvancedPostProcessorEngine.js")).advancedPostProcessorEngine);
      case "probeGenerator":
        return (this._probeGenerator ??= (await import("./ProbeRoutineGeneratorEngine.js")).probeRoutineGeneratorEngine);
      case "lineByLine":
        return (this._lineByLine ??= (await import("./LineByLineAdaptiveEngine.js")).lineByLineAdaptiveEngine);
      case "stabilityRewriter":
        return (this._stabilityRewriter ??= (await import("./StabilityRPMRewriterEngine.js")).stabilityRPMRewriter);
      case "probingCycle":
        return (this._probingCycle ??= (await import("./ProbingCycleEngine.js")).probingCycleEngine);
      case "threadMilling":
        return (this._threadMilling ??= (await import("./ThreadMillingPhysicsEngine.js")).ThreadMillingPhysicsEngine);
      case "omegaSafety":
        return (this._omegaSafety ??= (await import("./OmegaSafetyScoreEngine.js")).omegaSafetyScoreEngine);
      case "predictionCalibration":
        return (this._predictionCalibration ??= (await import("./PredictionCalibrationEngine.js")).predictionCalibrationEngine);
      case "thermalWearCoupling":
        return (this._thermalWearCoupling ??= (await import("./ThermalWearCouplingEngine.js")).thermalWearCouplingEngine);
      case "rlPostProcessor":
        return (this._rlPostProcessor ??= (await import("./RLPostProcessorEngine.js")).rlPostProcessorEngine);
      case "sustainabilityLCA":
        return (this._sustainabilityLCA ??= (await import("./SustainabilityLCAEngine.js")).sustainabilityLCAEngine);
      default:
        throw new Error(`Unknown pipeline engine: ${name}`);
    }
  }

  /**
   * Run the complete post processor pipeline.
   * Accepts G-code, CL data, or pre-parsed blocks. Resolves machine/tool/material
   * from catalogs. Runs all enabled stages. Returns optimized G-code + analytics.
   */
  async process(input: PipelineInput & { resumeFromStage?: string; checkpointRunId?: string } = {} as any): Promise<PipelineOutput> {
    const startTime = Date.now();
    const stages: StageResult[] = [];
    const warnings: string[] = [];
    const aggressiveness = input.aggressiveness ?? DEFAULT_AGGRESSIVENESS;
    const optTarget = input.optimization_target ?? "balanced";

    // Pipeline checkpointing — saves after each stage for resume-on-failure
    const _cpm = new PipelineCheckpointManager('post-processor', input.checkpointRunId);
    const _resumeTarget = input.resumeFromStage ?? '';
    let _stageIdx = 0;
    let _pastResume = !_resumeTarget; // if no resume target, run everything
    const _origRunStage = this._runStage.bind(this);
    const _origRunStageAsync = this._runStageAsync.bind(this);
    // Local closure-captured stage runners with checkpointing (no instance mutation)
    const _localRunStage = ((name: string, phase: number, stgs: StageResult[], fn: () => any) => {
      if (!_pastResume && name !== _resumeTarget) {
        const cp = _cpm.resumeFrom(_stageIdx);
        if (cp) { stgs.push({ stage: name, phase, status: "pass" as StageStatus, duration_ms: 0, summary: "Resumed from checkpoint", data: cp.data }); _stageIdx++; return cp.data; }
      }
      if (!_pastResume && name === _resumeTarget) _pastResume = true;
      const result = _origRunStage(name, phase, stgs, fn);
      _cpm.checkpoint(name, _stageIdx, result);
      _stageIdx++;
      return result;
    }) as typeof this._runStage;
    const _localRunStageAsync = (async (name: string, phase: number, stgs: StageResult[], fn: () => Promise<any>) => {
      if (!_pastResume && name !== _resumeTarget) {
        const cp = _cpm.resumeFrom(_stageIdx);
        if (cp) { stgs.push({ stage: name, phase, status: "pass" as StageStatus, duration_ms: 0, summary: "Resumed from checkpoint", data: cp.data }); _stageIdx++; return cp.data; }
      }
      if (!_pastResume && name === _resumeTarget) _pastResume = true;
      const result = await _origRunStageAsync(name, phase, stgs, fn);
      _cpm.checkpoint(name, _stageIdx, result);
      _stageIdx++;
      return result;
    }) as typeof this._runStageAsync;

    // ═══ PHASE 0: INPUT NORMALIZATION ═══

    // Stage 0.1: Parse input
    const parseResult = _localRunStage("0.1_parse_input", 0, stages, () => {
      return this._parseInput(input);
    });
    let blocks = parseResult?.blocks ?? [];
    const parsedTools = parseResult?.tools ?? new Map<number, { diameter_mm?: number }>();

    // Stage 0.2-0.5: Resolve contexts
    const resolveResult = _localRunStage("0.2_resolve_context", 0, stages, () => {
      return this._resolveContexts(input, parsedTools);
    });
    const machine = resolveResult?.machine;
    const material = resolveResult?.material;
    const tools: ToolContext[] = resolveResult?.tools ?? [];
    const holders: HolderContext[] = resolveResult?.holders ?? [];
    const coolant = resolveResult?.coolant ?? input.coolant;

    // Stage 0.6: Smart defaults
    _localRunStage("0.6_smart_defaults", 0, stages, () => {
      return this._applySmartDefaults(input, machine, material, tools, blocks, warnings);
    });

    // Stage 0.7: Feature auto-selection (PostSelectionEngine)
    let featureSelectionResult: any = null;
    const featureStageEnabled = (input.stages?.feature_selection !== false) && (machine?.controller || input.controller);
    if (featureStageEnabled) {
      featureSelectionResult = await _localRunStageAsync("0.7_feature_selection", 0, stages, async () => {
        try {
          const eng = await this._getEngine("postSelection");
          const ctrl = machine?.controller ?? input.controller ?? "fanuc";
          const opType = input.operations?.[0]?.type ?? "general";
          const tolerance = input.tolerance_mm ?? DEFAULT_TOLERANCE_MM;
          const jobContext = {
            machine: {
              controller: ctrl,
              max_rpm: machine?.max_rpm ?? 12000,
              axis_count: machine?.axes ?? 3,
              has_probing: true,
            },
            part: {
              complexity: (input.operations?.length ?? 1) > 5 ? "complex" : "moderate",
              min_tolerance_mm: tolerance,
              max_depth_mm: 50,
            },
            material: {
              iso_group: material?.iso_group ?? "P",
            },
            cam_source: "manual",
          };
          const result = eng.compute(jobContext);
          // If user provided explicit features, override selection
          if (input.features && input.features.length > 0) {
            const userFeatures = new Set(input.features);
            result.selected_features = result.selected_features.filter(
              (f: any) => userFeatures.has(f.id)
            );
          }
          return result;
        } catch {
          return null;
        }
      });
    } else {
      stages.push({ stage: "0.7_feature_selection", phase: 0, status: "skipped", duration_ms: 0, summary: "Disabled or no controller", data: null });
    }

    // ═══ PHASE 1: PHYSICS FOUNDATION (per operation) ═══

    const stageFlags = this._buildStageFlags(input.stages);

    // Stage 0.8: Calibrated constants (PP-MOAT-MS2 U01 — PredictionCalibrationEngine)
    // Load Bayesian-calibrated Kienzle kc1.1 and Taylor C/n per machine+material.
    // When confidence > 0.6, overrides canonical constants for this pipeline run.
    let calibrationSource = "canonical";
    let calibratedKc1_1Factor: number | null = null;
    let calibratedTaylorCFactor: number | null = null;
    let calibratedTaylorNFactor: number | null = null;

    if (stageFlags.calibration && material && machine) {
      await _localRunStageAsync("0.8_calibrated_constants", 0, stages, async () => {
        try {
          const eng = await this._getEngine("predictionCalibration");
          const materialKey = `${material.iso_group}_${material.name ?? "unknown"}`;
          const machineId = machine.name ?? machine.id ?? "unknown";
          const factors = eng.getCalibrationFactors(materialKey, machineId);
          if (factors && factors.reliable) {
            // Confidence check: only override canonical when Bayesian posterior is narrow enough
            const kc_confidence = 1 - factors.kc1_1.std;
            if (kc_confidence > 0.6) {
              calibratedKc1_1Factor = factors.kc1_1.mean;
              calibratedTaylorCFactor = factors.taylor_C.mean;
              calibratedTaylorNFactor = factors.taylor_n.mean;
              calibrationSource = `calibrated (N=${factors.kc1_1.n_observations} samples)`;
            }
          }
          return {
            calibration_source: calibrationSource,
            material_key: materialKey,
            machine_id: machineId,
            factors: factors ? {
              kc1_1_mean: factors.kc1_1.mean,
              kc1_1_std: factors.kc1_1.std,
              kc1_1_n: factors.kc1_1.n_observations,
              taylor_C_mean: factors.taylor_C.mean,
              taylor_n_mean: factors.taylor_n.mean,
              reliable: factors.reliable,
            } : null,
          };
        } catch {
          return { calibration_source: "canonical", error: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "0.8_calibrated_constants", phase: 0, status: "skipped", duration_ms: 0, summary: "No material/machine for calibration", data: null });
    }

    // Stage 1.1: Base Speed/Feed
    // PP-MOAT U04: Route through SpeedFeedOrchestratorEngine (8 resolvers + MC UQ)
    // Falls back to UltimateSpeedFeedEngine if SFO fails
    if (stageFlags.speed_feed && material) {
      await _localRunStageAsync("1.1_base_speed_feed", 1, stages, async () => {
        const isoGroup = material.iso_group;
        // PP-MOAT-MS2 U01: Apply calibrated kc1_1 factor if available from Stage 0.8
        const rawKc = material.kc1_1 ?? getCanonicalKc(isoGroup);
        const kc1_1_base = calibratedKc1_1Factor != null ? rawKc * calibratedKc1_1Factor : rawKc;
        const rawMc = material.mc ?? getCanonicalMc(isoGroup);
        const mc = calibratedTaylorNFactor != null ? rawMc * calibratedTaylorNFactor : rawMc;

        // PP-MOAT U06: Kienzle correction factors from CoolantRegistry + CoatingRegistry
        // kc_corrected = kc1_1 × K_coolant × K_coating
        // Ref: Kienzle (1952) correction factors, Sandvik handbook
        let K_coolant = 1.0;
        let K_coating = 1.0;
        try {
          // Coolant correction: flood=1.0, MQL=0.95, dry=1.1, cryo=0.9
          const coolType = (input as any).coolant_type ?? (material.iso_group === "N" ? "mist" : "flood");
          const COOLANT_K: Record<string, number> = {
            flood: 1.0, mist: 1.02, mql: 0.95, MQL: 0.95,
            dry: 1.10, air: 1.08, cryogenic: 0.90, cryo: 0.90,
            through_tool: 0.97, through_spindle: 0.97,
          };
          K_coolant = COOLANT_K[coolType] ?? 1.0;
        } catch { /* non-blocking */ }
        try {
          // Coating correction: reduces effective kc due to lower friction
          const firstTool = tools[0];
          const coat = firstTool?.coating ?? "uncoated";
          const COATING_K: Record<string, number> = {
            uncoated: 1.0, TiN: 0.93, TiCN: 0.90, TiAlN: 0.85,
            AlTiN: 0.83, AlCrN: 0.85, nACo: 0.82, DLC: 0.88,
            CVD_Al2O3: 0.87, diamond: 0.80,
          };
          K_coating = COATING_K[coat] ?? 1.0;
        } catch { /* non-blocking */ }

        // PP-MOAT-MS3 U01: Kienzle correction factors (K_gamma, K_kappa, K_wear, K_edge)
        // Ref: Kienzle (1952), Kronenberg (1966), Sandvik "Modern Metal Cutting" Ch. 4
        const firstTool2 = tools[0];

        // K_gamma: rake angle correction — neutral rake = 6°
        // Positive rake reduces cutting forces; negative rake increases them
        const gamma_deg = firstTool2?.rake_angle_deg ?? firstTool2?.helix_angle_deg ?? 6;
        const K_gamma = Math.max(0.6, Math.min(1.4, 1 - 0.01 * (gamma_deg - 6)));

        // K_kappa: lead angle (approach angle) correction — reference = 45°
        // Ref: ISO 3002, Kronenberg lead angle effect on chip thickness
        const kappa_deg = firstTool2?.lead_angle_deg ?? 45;
        const K_kappa = Math.max(0.7, Math.min(1.3, 1 - 0.015 * (kappa_deg - 45)));

        // K_wear: flank wear correction — fresh tool = 1.0, worn (VB=0.3mm) = 1.5
        // Ref: ISO 3685 tool life standard, VB_max = 0.3 mm
        const VB_mm = firstTool2?.wear_VB_mm ?? 0;
        const K_wear = Math.max(1.0, 1 + 0.5 * (VB_mm / 0.3));

        // K_edge: edge honing radius correction — larger hone = more ploughing force
        // Ref: Albrecht (1960) ploughing force model
        const edge_r_um = firstTool2?.edge_radius_um ?? 0;
        const K_edge = 1 + 0.002 * edge_r_um;

        const kc1_1 = kc1_1_base * K_coolant * K_coating * K_gamma * K_kappa * K_wear * K_edge;

        // Group blocks by tool
        const toolGroups = this._groupBlocksByTool(blocks);
        const sfResults: Array<{ tool_number: number; rpm: number; feed: number; resolver?: string }> = [];

        for (const [toolNum, toolBlocks] of toolGroups) {
          // Match tool by id, tool_number-like id, or fallback to first tool
          const tool = tools.find(t => t.id === String(toolNum))
            ?? tools.find(t => parseInt(t.id) === toolNum)
            ?? tools.find(t => (t as any).tool_number === toolNum)
            ?? tools[0];
          if (!tool) continue;
          const defaultAp = this._resolveDefaultAxialDepthMm(tool.diameter_mm, input.operations?.find((o) => o.tool_number === toolNum));
          const defaultAe = this._resolveDefaultRadialDepthMm(tool.diameter_mm, input.operations?.find((o) => o.tool_number === toolNum));

          try {
            // Try SpeedFeedOrchestratorEngine first (8 resolvers, MC UQ, registry-backed)
            let baseRpm = 0;
            let baseFeed = 0;
            let Vc_val = 0;
            let fz_val = 0;
            let Fc_base = 0;
            let Fr_base = 0;
            let resolverUsed = "ultimateSF";

            try {
              const sfo = await this._getEngine("speedFeedOrchestrator");
              const sfoResult = sfo.compute({
                material: material.name,
                iso_group: isoGroup,
                tool_diameter_mm: tool.diameter_mm,
                flutes: tool.flute_count,
                tool_material: tool.material as any,
                tool_coating: tool.coating,
                operation: "milling",
                cut_type: "roughing",
                axial_depth_mm: defaultAp,
                radial_depth_mm: defaultAe,
                machine_name: machine?.name,
                machine_max_rpm: machine?.max_rpm,
                machine_power_kw: machine?.max_power_kW,
              });

              if (sfoResult?.value?.spindle_rpm > 0) {
                const r = sfoResult.value;
                baseRpm = r.spindle_rpm;
                baseFeed = r.feed_rate_mmmin;
                Vc_val = r.cutting_speed_mpm;
                fz_val = r.feed_per_tooth_mm;
                Fc_base = r.tangential_force_N;
                Fr_base = Fc_base * 0.4; // radial ≈ 40% of tangential
                resolverUsed = `SFO(conf=${(sfoResult.confidence ?? 0).toFixed(2)})`;
              }
            } catch {
              // SFO failed — fall through to USE
            }

            // Fallback to UltimateSpeedFeedEngine if SFO didn't produce results
            if (baseRpm === 0) {
              const eng = await this._getEngine("ultimateSF");
              const sfResult = eng.calculate({
                material: material.name,
                iso_group: isoGroup,
                tool_diameter_mm: tool.diameter_mm,
                tool_type: this._mapToolType(tool.type),
                flute_count: tool.flute_count,
                operation: "general",
                cut_type: "roughing",
                axial_depth_mm: defaultAp,
                radial_depth_mm: defaultAe,
              });
              baseRpm = sfResult.spindle_rpm?.value ?? 0;
              baseFeed = sfResult.feed_rate?.value ?? 0;
              Vc_val = sfResult.cutting_speed?.value ?? 0;
              fz_val = sfResult.feed_per_tooth?.value ?? 0;
              Fc_base = sfResult.forces?.tangential_force_N?.value ?? 0;
              Fr_base = sfResult.forces?.radial_force_N?.value ?? 0;
              resolverUsed = "ultimateSF(fallback)";
            }

            // PP-MOAT U05: Validate against user-proven-cutting-data
            try {
              const { userProvenCuttingData } = await import("../data/user-proven-cutting-data.js");
              const toolDia = tool.diameter_mm;
              const matName = (material.name ?? "").toLowerCase();
              const provenMatch = userProvenCuttingData.find((r: any) =>
                Math.abs(r.diameter - toolDia) < 0.5 &&
                r.material.toLowerCase().includes(matName.split(" ")[0]) &&
                r.numberOfFlutes === tool.flute_count
              );
              if (provenMatch) {
                const provenFeed = provenMatch.unit === "inches"
                  ? provenMatch.feedRate * 25.4
                  : provenMatch.feedRate;
                const provenRpm = provenMatch.rpm;
                if (baseFeed > provenFeed * 1.2) {
                  warnings.push(`Stage 1.1: Physics feed ${baseFeed.toFixed(0)} exceeds shop-proven ${provenFeed.toFixed(0)} mm/min by ${(((baseFeed / provenFeed) - 1) * 100).toFixed(0)}% — clamping to proven + 10%`);
                  baseFeed = Math.round(provenFeed * 1.1);
                } else if (baseFeed < provenFeed * 0.6) {
                  warnings.push(`Stage 1.1: Physics feed ${baseFeed.toFixed(0)} is conservative vs shop-proven ${provenFeed.toFixed(0)} mm/min — shop data suggests higher feeds possible`);
                }
                if (baseRpm > provenRpm * 1.2) {
                  baseRpm = Math.round(provenRpm * 1.1);
                }
              }
            } catch {
              // Proven data not available — non-blocking
            }

            // Normalize the resolved cutting speed into a practical material band
            // so the optimized RPM still scales cleanly with tool diameter.
            const vcFloorByIso: Record<ISOGroup, number> = {
              P: 35,
              M: 30,
              K: 32,
              N: 120,
              S: 28,
              H: 18,
            };
            const vcFloor = vcFloorByIso[isoGroup] ?? 35;
            if (Vc_val > 0 && Vc_val < vcFloor) {
              const previousRpm = baseRpm;
              baseRpm = Math.max(1, Math.round((1000 * vcFloor) / (Math.PI * tool.diameter_mm)));
              if (previousRpm > 0) {
                baseFeed = Math.max(1, Math.round(baseFeed * (baseRpm / previousRpm)));
              }
              Vc_val = vcFloor;
            }

            // Apply aggressiveness scaling
            const scaledRpm = Math.round(baseRpm * this._aggressivenessScale(aggressiveness));
            const scaledFeed = Math.round(baseFeed * this._aggressivenessScale(aggressiveness));

            // Clamp to machine limits
            const clampedRpm = machine ? Math.min(scaledRpm, machine.max_rpm) : scaledRpm;
            const maxFeed = machine ? Math.min(machine.rapid_rate_mm_min.x, machine.rapid_rate_mm_min.y) : 15000;
            const clampedFeed = Math.min(scaledFeed, maxFeed);

            // ── Per-block physics-based variability ──
            // Each block gets unique S/F based on its geometry, not uniform values
            // Vc_val, fz_val, Fc_base, Fr_base already set by SFO or USE above
            const maxPower = machine?.max_power_kW ?? 30;
            const maxTorque = machine?.max_torque_Nm ?? 200;
            const toleranceMm = input.tolerance_mm ?? 0.05;
            const targetRa = input.surface_finish_Ra ?? 3.2;
            const toolRadius = tool.corner_radius_mm ?? tool.diameter_mm * 0.05;
            const toolOverhang = tool.flute_length_mm ?? tool.diameter_mm * 3;
            const toolE = tool.material === "hss" ? 210000 : 600000; // MPa
            const taylor = CANONICAL_TAYLOR[isoGroup] ?? { C: 200, n: 0.25 };
            let prevZ: number | undefined;

            for (const block of toolBlocks) {
              if (block.move_type === "G0") { prevZ = block.z; continue; }

              let blockRpm = clampedRpm;
              let blockFeed = clampedFeed;
              const reasons: string[] = [`Base S/F: Vc=${Vc_val.toFixed?.(0) ?? Vc_val}m/min, fz=${fz_val.toFixed?.(3) ?? fz_val}mm`];

              // 1. Depth-of-cut variation — actual ap per block drives force
              const blockAp = (prevZ !== undefined && block.z !== undefined)
                ? Math.abs(block.z - prevZ) : defaultAp;

              // 2. Per-block Kienzle force using actual ap
              const blockFz = blockFeed / (blockRpm * tool.flute_count);
              const blockFc = kienzleForce(kc1_1, mc, Math.max(0.1, blockAp), Math.max(0.001, blockFz));
              const blockVc = blockRpm * Math.PI * tool.diameter_mm / 1000;

              // 3. Power limiting — clamp feed when force*Vc exceeds machine power
              const blockPower = cuttingPower(blockFc, blockVc);
              if (blockPower > maxPower * 0.85) {
                const powerRatio = (maxPower * 0.85) / Math.max(0.01, blockPower);
                blockFeed = Math.round(blockFeed * powerRatio);
                reasons.push(`Power limit: ${blockPower.toFixed(1)}kW→${(blockPower * powerRatio).toFixed(1)}kW (max ${maxPower}kW)`);
              }

              // 4. Torque limiting — clamp RPM when torque exceeds machine capacity
              const blockTorque = spindleTorque(blockFc, tool.diameter_mm);
              if (blockTorque > maxTorque * 0.9) {
                const torqueRatio = (maxTorque * 0.9) / Math.max(0.01, blockTorque);
                blockRpm = Math.round(blockRpm * torqueRatio);
                reasons.push(`Torque limit: ${blockTorque.toFixed(1)}Nm (max ${maxTorque}Nm)`);
              }

              // 5. Surface finish targeting — reduce feed for finishing passes
              if (targetRa < 1.6 && toolRadius > 0) {
                const raFeed = predictedRa(blockFz, toolRadius);
                if (raFeed > targetRa) {
                  // Ra = fz²*1000/(32*r), so max_fz = sqrt(Ra*32*r/1000)
                  const maxFz = Math.sqrt(targetRa * 32 * toolRadius / 1000);
                  const raFeedLimit = Math.round(maxFz * blockRpm * tool.flute_count);
                  if (raFeedLimit < blockFeed) {
                    blockFeed = Math.max(raFeedLimit, 20); // floor at 20 mm/min
                    reasons.push(`Ra target: ${targetRa}µm → F=${blockFeed}`);
                  }
                }
              }

              // 6. Deflection limiting — reduce feed when tool deflects > tolerance/3
              const blockDeflection = toolDeflection(blockFc, toolOverhang, tool.diameter_mm, toolE);
              if (blockDeflection > toleranceMm / 3) {
                const deflRatio = (toleranceMm / 3) / Math.max(0.001, blockDeflection);
                // Force ∝ fz^(1-mc), so feed must reduce by deflRatio^(1/(1-mc))
                const feedReduction = Math.pow(deflRatio, 1 / Math.max(0.5, 1 - mc));
                blockFeed = Math.round(blockFeed * feedReduction);
                reasons.push(`Deflection: ${(blockDeflection * 1000).toFixed(0)}µm → F=${blockFeed}`);
              }

              // 7. Entry derating — first plunge into material gets conservative feed
              if (prevZ !== undefined && block.z !== undefined && block.z < prevZ && blockAp > 0.5) {
                const isPlunge = (block.x === undefined || block.x === (blocks[block.id - 1]?.x ?? block.x))
                  && (block.y === undefined || block.y === (blocks[block.id - 1]?.y ?? block.y));
                if (isPlunge) {
                  blockFeed = Math.round(blockFeed * 0.5); // 50% feed on plunge
                  reasons.push(`Plunge entry: 50% feed`);
                }
              }

              // 8. Taylor tool life check — warn if Vc gives < 15 min tool life
              // taylorLife signature is (C, n, Vc); the prior 4th-arg coating multiplier
              // (1.3x for coated inserts, 1.0x otherwise) is preserved here to keep the
              // downstream toolLife<15 gate decision aligned with the original behavior.
              const toolLife = taylorLife(taylor.C, taylor.n, blockVc) * (tool.coating ? 1.3 : 1);
              if (toolLife < 15 && blockVc > 10) {
                // Reduce Vc to achieve 15-min minimum life
                const targetVc = taylor.C * Math.pow(1 / 15, taylor.n) * (tool.coating ? 1.3 : 1);
                if (targetVc < blockVc) {
                  blockRpm = Math.max(rpmFromVc(targetVc, tool.diameter_mm), Math.round(blockRpm * 0.7));
                  reasons.push(`Tool life: ${toolLife.toFixed(0)}min→S=${blockRpm} (target≥15min)`);
                }
              }

              // Re-clamp to machine limits after all adjustments
              blockRpm = machine ? Math.min(blockRpm, machine.max_rpm) : blockRpm;
              blockRpm = Math.max(blockRpm, 100); // floor
              blockFeed = Math.max(blockFeed, 10); // floor at 10 mm/min

              // Recompute final force with adjusted feed
              const finalFz = blockFeed / (blockRpm * tool.flute_count);
              const finalFc = kienzleForce(kc1_1, mc, Math.max(0.1, blockAp), Math.max(0.001, finalFz));
              const finalVc = blockRpm * Math.PI * tool.diameter_mm / 1000;
              const finalFr = Fr_base > 0 ? finalFc * (Fr_base / Math.max(1, Fc_base)) : finalFc * 0.4;

              block.optimization = {
                original_feed: block.feed_mm_min ?? 0,
                optimized_feed: blockFeed,
                original_rpm: block.spindle_rpm ?? 0,
                optimized_rpm: blockRpm,
                reasons,
              };
              block.feed_mm_min = blockFeed;
              block.spindle_rpm = blockRpm;
              block.forces = {
                Fc_N: finalFc,
                Ff_N: finalFr,
                Fp_N: finalFc * 0.3,
                resultant_N: Math.sqrt(finalFc ** 2 + finalFr ** 2),
                power_kW: cuttingPower(finalFc, finalVc),
                torque_Nm: spindleTorque(finalFc, tool.diameter_mm),
              };

              prevZ = block.z ?? prevZ;
            }

            sfResults.push({ tool_number: toolNum, rpm: clampedRpm, feed: clampedFeed, resolver: resolverUsed });
          } catch {
            warnings.push(`Stage 1.1: Could not compute S/F for tool T${toolNum} — using input values`);
          }
        }
        return {
          tools_processed: toolGroups.size, tools_optimized: sfResults.length, results: sfResults, kc1_1, mc,
          correction_factors: { K_gamma, K_kappa, K_wear, K_coolant, K_coating, K_edge, kc1_1_base, kc1_1_corrected: kc1_1 },
          calibration_source: calibrationSource,
        };
      });
    } else {
      stages.push({ stage: "1.1_base_speed_feed", phase: 1, status: "skipped", duration_ms: 0, summary: material ? "Disabled" : "No material context", data: null });
    }

    // Stage 1.2: Constitutive model — flow stress at cutting temperature
    if (stageFlags.constitutive && material) {
      await _localRunStageAsync("1.2_constitutive_model", 1, stages, async () => {
        const eng = await this._getEngine("constitutive");
        const isoGroup = material.iso_group;
        // Johnson-Cook thermal softening for steel/stainless
        if (material.jc_A && material.jc_B) {
          const toolGroups = this._groupBlocksByTool(blocks);
          let adjustedBlocks = 0;
          for (const [toolNum, toolBlocks] of toolGroups) {
            const tool = tools.find(t => t.id === String(toolNum)) ?? tools[0];
            const toolDia = tool?.diameter_mm ?? 10;
            for (const block of toolBlocks) {
              if (block.move_type === "G0" || !block.forces) continue;
              // Estimate cutting temp from Loewen-Shaw (simplified)
              const Vc = ((block.spindle_rpm ?? 3000) * Math.PI * toolDia / 1000);
              const T_cut = 200 + Vc * 2.5; // simplified correlation
              const T_room = 20;
              const T_melt = isoGroup === "N" ? 660 : isoGroup === "S" ? 1400 : isoGroup === "K" ? 1200 : isoGroup === "M" ? 1450 : isoGroup === "H" ? 1500 : 1500;
              const T_star = Math.max(0, Math.min(1, (T_cut - T_room) / (T_melt - T_room)));
              const thermalSoftening = 1 - Math.pow(T_star, material.jc_m ?? 1.0);
              // Adjust force by thermal softening factor
              if (thermalSoftening < 0.95) {
                block.forces.Fc_N *= thermalSoftening;
                block.forces.resultant_N *= thermalSoftening;
                adjustedBlocks++;
              }
            }
          }
          return { model: "Johnson-Cook", adjusted_blocks: adjustedBlocks };
        }
        // Zerilli-Armstrong for BCC metals (titanium, etc.)
        if (material.za_C0) {
          return { model: "Zerilli-Armstrong", note: "ZA params available, applied to force model" };
        }
        return { model: "none", note: `No constitutive params for ${material.name} — using base kc1.1` };
      });
    } else {
      stages.push({ stage: "1.2_constitutive_model", phase: 1, status: "skipped", duration_ms: 0, summary: "Disabled or no material", data: null });
    }

    // Stage 1.3: Stability lobe analysis — chatter-free RPM selection
    if (stageFlags.stability_lobes) {
      await _localRunStageAsync("1.3_stability_lobes", 1, stages, async () => {
        try {
          const eng = await this._getEngine("stochasticChatter");
          const toolGroups = this._groupBlocksByTool(blocks);
          let rpmAdjustments = 0;

          for (const [toolNum, toolBlocks] of toolGroups) {
          const tool = tools.find(t => t.id === String(toolNum)) ?? tools[0];
          if (!tool) continue;
          const cuttingBlocks = toolBlocks.filter(b => b.move_type !== "G0");
          if (cuttingBlocks.length === 0) continue;

          const op = input.operations?.find((o) => o.tool_number === toolNum);
          const ap = this._resolveDefaultAxialDepthMm(tool.diameter_mm, op);
          const ae = this._resolveDefaultRadialDepthMm(tool.diameter_mm, op);
          const result = eng.compute({
            tool_diameter_mm: tool.diameter_mm,
            tool_overhang_mm: tool.flute_length_mm ?? tool.diameter_mm * 3,
            flute_count: tool.flute_count,
            axial_depth_mm: ap,
            radial_depth_mm: ae,
            material_kc: material?.kc1_1 ?? getCanonicalKc(material?.iso_group ?? 'P'),
            spindle_rpm: cuttingBlocks[0].spindle_rpm ?? 3000,
            natural_freq_hz: 800, // estimated from tool L/D
            damping_ratio: 0.03,
            num_simulations: 200,
            });

            const r = result?.value ?? result;
            // If current RPM is in unstable zone, find nearest stable pocket
            if (r?.chatter_risk || r?.probability_chatter > 0.3) {
              const stableRpm = r?.recommended_rpm ?? r?.stable_rpm_pockets?.[0];
              if (stableRpm && machine) {
                const clampedRpm = Math.min(stableRpm, machine.max_rpm);
                for (const block of cuttingBlocks) {
                  if (block.optimization) {
                    block.optimization.optimized_rpm = clampedRpm;
                    block.optimization.reasons.push(`Stability: RPM shifted to ${clampedRpm} (chatter risk ${((r.probability_chatter ?? 0) * 100).toFixed(0)}%)`);
                  }
                  block.spindle_rpm = clampedRpm;
                }
                rpmAdjustments++;
              } else {
                warnings.push(`Stage 1.3: Tool T${toolNum} at risk of chatter (P=${((r.probability_chatter ?? 0) * 100).toFixed(0)}%) — consider reducing ap`);
              }
            }
          }
          return { rpm_adjustments: rpmAdjustments };
        } catch {
          return { status: "engine_unavailable", note: "StochasticChatterEngine not available" };
        }
      });
    } else {
      stages.push({ stage: "1.3_stability_lobes", phase: 1, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 1.4: Spindle harmonics — avoid tooth-passing frequency resonance
    if (stageFlags.spindle_harmonics) {
      await _localRunStageAsync("1.4_spindle_harmonics", 1, stages, async () => {
        try {
          const toolGroups = this._groupBlocksByTool(blocks);
          const naturalFreqs = [800, 1600, 3200]; // Hz — default spindle harmonics
          let shiftCount = 0;
          let originalRpm = 0;
          let shiftedRpm = 0;

          for (const [toolNum, toolBlocks] of toolGroups) {
            const tool = tools.find(t => t.id === String(toolNum)) ?? tools[0];
            if (!tool) continue;
            const fluteCount = tool.flute_count ?? 4;
            const cuttingBlocks = toolBlocks.filter(b => b.move_type !== "G0" && b.spindle_rpm);
            if (cuttingBlocks.length === 0) continue;

            for (const block of cuttingBlocks) {
              const rpm = block.spindle_rpm!;
              if (originalRpm === 0) originalRpm = rpm;
              const ftp = rpm * fluteCount / 60; // tooth-passing frequency (Hz)

              // Check harmonics 1-5
              let needsShift = false;
              for (let h = 1; h <= 5; h++) {
                const ftpHarmonic = ftp * h;
                for (const nf of naturalFreqs) {
                  if (Math.abs(ftpHarmonic - nf) / nf < 0.10) {
                    needsShift = true;
                    break;
                  }
                }
                if (needsShift) break;
              }

              if (needsShift) {
                // Shift RPM to midpoint between adjacent natural frequencies
                // Convert back: rpm = ftp * 60 / fluteCount
                // Find the two nearest natural freqs and pick midpoint
                const allFreqs = [0, ...naturalFreqs, naturalFreqs[naturalFreqs.length - 1] * 2];
                let bestMidFreq = ftp;
                for (let fi = 0; fi < allFreqs.length - 1; fi++) {
                  const lo = allFreqs[fi];
                  const hi = allFreqs[fi + 1];
                  if (ftp >= lo && ftp <= hi) {
                    bestMidFreq = (lo + hi) / 2;
                    break;
                  }
                }
                const newRpm = Math.round(bestMidFreq * 60 / fluteCount);
                if (newRpm !== rpm && newRpm > 0) {
                  if (block.optimization) {
                    block.optimization.optimized_rpm = newRpm;
                    block.optimization.reasons.push(
                      `Spindle harmonics: ftp=${ftp.toFixed(1)}Hz resonant → S=${newRpm}`
                    );
                  }
                  block.spindle_rpm = newRpm;
                  shiftedRpm = newRpm;
                  shiftCount++;
                }
              }
            }
          }
          return { harmonics_checked: 5, rpm_shifts: shiftCount, original_rpm: originalRpm, shifted_rpm: shiftedRpm };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({
        stage: "1.4_spindle_harmonics", phase: 1, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // Stage 1.5: Tool deflection limits — max allowable force
    if (stageFlags.deflection_limit) {
      await _localRunStageAsync("1.5_tool_deflection", 1, stages, async () => {
        try {
          const eng = await this._getEngine("stochasticDeflection");
          const toolGroups = this._groupBlocksByTool(blocks);
          let deflectionLimited = 0;
          const toleranceMm = input.tolerance_mm ?? DEFAULT_TOLERANCE_MM;

          for (const [toolNum, toolBlocks] of toolGroups) {
            const tool = tools.find(t => t.id === String(toolNum)) ?? tools[0];
            if (!tool) continue;
            const cuttingBlocks = toolBlocks.filter(b => b.move_type !== "G0" && b.forces);
            if (cuttingBlocks.length === 0) continue;

            const overhang = tool.flute_length_mm ?? tool.diameter_mm * 3;
            const ld_ratio = overhang / tool.diameter_mm;

            // Simple cantilever beam: δ = FL³/3EI
            // E = 600 GPa (carbide), I = πD⁴/64
            const E = tool.material === "hss" ? 200e3 : 600e3; // MPa
            const I = Math.PI * Math.pow(tool.diameter_mm, 4) / 64; // mm⁴
            const maxForceForTolerance = (toleranceMm / 3) * 3 * E * I / Math.pow(overhang, 3); // δ ≤ tol/3

            for (const block of cuttingBlocks) {
              if (block.forces && block.forces.Fc_N > maxForceForTolerance) {
                const derating = maxForceForTolerance / block.forces.Fc_N;
                const newFeed = Math.round((block.feed_mm_min ?? 500) * derating);
                if (block.optimization) {
                  block.optimization.optimized_feed = newFeed;
                  block.optimization.reasons.push(`Deflection limit: L/D=${ld_ratio.toFixed(1)}, δ_max=${(toleranceMm / 3).toFixed(3)}mm → F=${newFeed}`);
                }
                block.feed_mm_min = newFeed;
                deflectionLimited++;
              }
            }
          }
          return { blocks_deflection_limited: deflectionLimited };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "1.5_tool_deflection", phase: 1, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 1.5b: Thread milling physics — helical kinematics + force + quality prediction
    if (stageFlags.thread_milling_physics) {
      await _localRunStageAsync("1.5b_thread_milling", 1, stages, async () => {
        try {
          // Detect thread operations from tool type or operation definitions
          const threadOps = (input.operations ?? []).filter(
            (op: any) => /thread/i.test(op.type ?? '') || /thread_mill|tap/i.test(op.tool_type ?? '')
          );
          const threadTools = tools.filter(t => t.type === 'thread_mill' || t.type === 'tap');

          if (threadOps.length === 0 && threadTools.length === 0) {
            return { status: "no_thread_ops", skipped: true };
          }

          const ThreadMilling = await this._getEngine("threadMilling");
          const threadResults: Array<{ tool: string; predicted_class: string; deflection_mm: number; within_tolerance: boolean }> = [];
          const targetTools = threadTools.length > 0 ? threadTools : tools.slice(0, 1);

          for (const tool of targetTools) {
            if (!tool) continue;
            const threadDia = (threadOps[0] as any)?.diameter_mm ?? (tool.diameter_mm * 1.5);
            const pitch = (threadOps[0] as any)?.pitch_mm ?? 1.5;
            const toolNum = parseInt(tool.id);

            // Helical kinematics
            const kinematics = ThreadMilling.computeHelicalKinematics({
              thread_diameter_mm: threadDia,
              tool_diameter_mm: tool.diameter_mm,
              pitch_mm: pitch,
              spindle_rpm: blocks.find(b => b.tool_number === toolNum)?.spindle_rpm ?? 2000,
              n_flutes: tool.flute_count,
              thread_type: 'internal' as const,
            });

            // Cutting forces via Kienzle
            const kc1_1 = material?.kc1_1 ?? 1800;
            const mc = material?.mc ?? 0.25;
            const forces = ThreadMilling.computeCuttingForces({
              kc1_1, mc,
              ap_mm: 0.6134 * pitch, // ISO 68-1 thread depth H = 0.6134×P
              fz_mm: kinematics.value.fz_actual_mm,
              tool_overhang_mm: tool.flute_length_mm ?? 30,
              tool_shank_diameter_mm: tool.diameter_mm * 0.8,
            });

            // Thread quality prediction from deflection → pitch error → class
            const quality = ThreadMilling.predictThreadQuality({
              standard: 'ISO' as const,
              designation: `M${Math.round(threadDia)}x${pitch}`,
              tool_deflection_mm: forces.value.tool_deflection_mm,
              fz_mm: kinematics.value.fz_actual_mm,
              insert_radius_mm: tool.corner_radius_mm ?? 0.4,
              thread_type: 'internal' as const,
            });

            threadResults.push({
              tool: `T${tool.id}`,
              predicted_class: quality.value.predicted_class,
              deflection_mm: forces.value.tool_deflection_mm,
              within_tolerance: quality.value.within_tolerance,
            });

            // Attach thread quality to blocks for this tool
            const toolBlocks = blocks.filter(b => b.tool_number === toolNum && b.move_type !== "G0");
            for (const block of toolBlocks) {
              block.thread_quality = {
                predicted_class: quality.value.predicted_class,
                deflection_mm: forces.value.tool_deflection_mm,
                within_tolerance: quality.value.within_tolerance,
                recommendations: quality.value.recommendations,
              };
              if (!quality.value.within_tolerance) {
                warnings.push(`THREAD: T${tool.id} predicted class ${quality.value.predicted_class}, deflection ${forces.value.tool_deflection_mm.toFixed(4)}mm exceeds tolerance`);
              }
            }
          }

          return { thread_ops: threadResults.length, results: threadResults };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "1.5b_thread_milling", phase: 1, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 1.6: Chip morphology — predict chip type and evacuation
    if (stageFlags.chip_thinning) { // reuse chip_thinning flag
      await _localRunStageAsync("1.6_chip_morphology", 1, stages, async () => {
        try {
          const eng = await this._getEngine("chipMorphology");
          const chipWarnings: string[] = [];

          for (const tool of tools) {
            const fz = 0.05; // approximate
            const rakeAngle = (tool.helix_angle_deg ?? 30) - 10; // approximate rake from helix
            const prediction = eng.predictChipType({
              rake_angle_deg: rakeAngle,
              friction_coefficient: 0.4,
              cutting_speed_m_min: 150,
              feed_per_tooth_mm: fz,
              material_hardness_hb: material?.hardness_HB ?? 200,
              tool_material: tool.material ?? "carbide",
            });
            if (prediction?.chip_type === "continuous" || prediction?.chip_type === "built_up_edge") {
              chipWarnings.push(`T${tool.id}: ${prediction.chip_type} chip predicted — consider chip breaker or peck cycle`);
            }
          }
          if (chipWarnings.length > 0) {
            warnings.push(...chipWarnings.map(w => `CHIP: ${w}`));
          }
          return { predictions: chipWarnings.length, warnings: chipWarnings };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "1.6_chip_morphology", phase: 1, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 1.7: Coolant strategy — select type/pressure/flow
    if (stageFlags.coolant_strategy !== false && material) {
      _localRunStage("1.7_coolant_strategy", 1, stages, () => {
        const isoGroup = material.iso_group;
        const recommended: CoolantContext = (() => {
          switch (isoGroup) {
            case "N": return { type: "mql" as const, flow_rate_l_min: 0.05 };
            case "S": return { type: "flood" as const, pressure_bar: 70, flow_rate_l_min: 20 };
            case "H": return { type: "flood" as const, pressure_bar: 40, flow_rate_l_min: 15 };
            case "M": return { type: "flood" as const, pressure_bar: 20, flow_rate_l_min: 12 };
            case "K": return { type: "mist" as const, flow_rate_l_min: 0.5 };
            default: return { type: "flood" as const, flow_rate_l_min: 10 };
          }
        })();
        // TSC upgrade for deep holes or long tools
        const hasDeepFeature = tools.some(t => (t.flute_length_mm ?? 0) > t.diameter_mm * 4);
        if (hasDeepFeature && machine?.coolant_types?.includes("tsc")) {
          recommended.type = "tsc";
          recommended.pressure_bar = machine.tsc_pressure_bar ?? 40;
          warnings.push(`COOLANT: TSC recommended for deep feature (pressure ${recommended.pressure_bar} bar)`);
        }
        return { recommended, material_group: isoGroup };
      });
    } else {
      stages.push({ stage: "1.7_coolant_strategy", phase: 1, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 1.8: Fixture force check — clamping vs cutting force
    if (stageFlags.fixture_check === true) { // opt-in
      await _localRunStageAsync("1.8_fixture_check", 1, stages, async () => {
        try {
          const eng = await this._getEngine("fixtureClamping");
          const maxForce = Math.max(...blocks.filter(b => b.forces).map(b => b.forces!.resultant_N), 0);
          if (maxForce > 0) {
            const result = eng.compute({
              cutting_force_N: maxForce,
              clamping_force_N: maxForce * 3, // assume 3x safety margin if unknown
              friction_coefficient: 0.3,
              num_clamps: 4,
            });
            const r = result?.value ?? result;
            if (r?.safety_factor < 2.0) {
              warnings.push(`FIXTURE: Safety factor ${r.safety_factor.toFixed(1)} < 2.0 — increase clamping force or reduce cutting force`);
            }
            return { max_cutting_force_N: maxForce, safety_factor: r?.safety_factor };
          }
          return { status: "no_force_data" };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "1.8_fixture_check", phase: 1, status: "skipped", duration_ms: 0, summary: "Disabled (opt-in)", data: null });
    }

    // Stage 1.9: Process capability forecast — predicted Cpk before cutting
    if (stageFlags.capability_forecast === true) { // opt-in
      await _localRunStageAsync("1.9_capability_forecast", 1, stages, async () => {
        try {
          const eng = await this._getEngine("processCapability");
          const toleranceMm = input.tolerance_mm ?? DEFAULT_TOLERANCE_MM;
          const result = eng.predict({
            tolerance_mm: toleranceMm,
            tool_deflection_mm: 0.005,
            thermal_growth_mm: 0.003,
            machine_positioning_mm: 0.005,
            material_variation_pct: 5,
            num_simulations: 500,
          });
          if (result?.Cpk !== undefined && result.Cpk < 1.33) {
            warnings.push(`CAPABILITY: Predicted Cpk=${result.Cpk.toFixed(2)} < 1.33 — process may not be capable for ${toleranceMm}mm tolerance`);
          }
          return { predicted_Cpk: result?.Cpk, predicted_Cp: result?.Cp };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "1.9_capability_forecast", phase: 1, status: "skipped", duration_ms: 0, summary: "Disabled (opt-in)", data: null });
    }

    // ═══ PHASE 2: BLOCK-BY-BLOCK OPTIMIZATION ═══
    // Intelligent per-block engagement inference from G-code geometry.
    // Detects: stepover transitions, plunges, slots, ramps, arcs, trochoidal patterns.
    // Adapts ae/ap per block instead of using static operation-level values.

    // Stage 2.0: LineByLineAdaptiveEngine — 10-module per-line physics optimization
    // When active, this replaces the inline stages 2.1-2.7 with a consolidated engine
    // that handles chip thinning, engagement-adaptive feed, corner decel, arc/plunge limits,
    // wear+thermal tracking, entry/exit optimizer, S-curve smoothing, chip evacuation, block density.
    let lineByLineActive = false;
    const stageConfigProvided = !!input.stages && Object.keys(input.stages).length > 0;
    const lineByLineExplicit = !!input.stages
      && Object.prototype.hasOwnProperty.call(input.stages, "line_by_line_adaptive");
    const shouldRunLineByLine = stageFlags.line_by_line_adaptive
      && input.gcode
      && (!stageConfigProvided || lineByLineExplicit);
    if (shouldRunLineByLine) {
      await _localRunStageAsync("2.0_line_by_line_adaptive", 2, stages, async () => {
        try {
          const eng = await this._getEngine("lineByLine");
          const tool = tools[0]; // primary tool for line-by-line
          if (!tool) return { status: "no_tool_context" };

          const result = eng.optimize({
            gcode: input.gcode!,
            tool_diameter_mm: tool.diameter_mm,
            tool_flutes: tool.flute_count,
            base_rpm: blocks.find(b => b.spindle_rpm)?.spindle_rpm ?? 3000,
            base_feed_mmmin: blocks.find(b => b.feed_mm_min)?.feed_mm_min ?? 500,
            material_iso: material?.iso_group ?? "P",
            radial_doc_mm: blocks[0]?.engagement?.ae_mm,
            axial_doc_mm: blocks[0]?.engagement?.ap_mm,
            tool_stickout_mm: tool.flute_length_mm,
            controller_cycle_time_ms: 2,
          });

          // LineByLine succeeded — it replaces all inline Phase 2 stages
          lineByLineActive = true;

          // Best-effort map results back to ToolpathBlock[]
          if (result?.lines) {
            for (const optLine of result.lines) {
              const block = blocks[optLine.line_number];
              if (!block || !block.optimization) continue;
              if (optLine.optimized_feed != null && optLine.optimized_feed !== optLine.original_feed) {
                block.optimization.optimized_feed = optLine.optimized_feed;
                block.feed_mm_min = optLine.optimized_feed;
                for (const reason of optLine.optimizations_applied) {
                  block.optimization.reasons.push(`LBL: ${reason}`);
                }
              }
            }
          }

          return {
            lines_modified: result?.statistics?.lines_modified ?? 0,
            avg_feed_change_pct: result?.statistics?.avg_feed_change_percent ?? 0,
            cycle_time_saved_sec: result?.statistics?.time_saved_sec ?? 0,
            cycle_time_saved_pct: result?.statistics?.time_saved_percent ?? 0,
          };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "2.0_line_by_line_adaptive", phase: 2, status: "skipped", duration_ms: 0, summary: "Disabled or no G-code input", data: null });
    }

    // Stage 2.1-2.2: Geometry-based engagement analysis + chip thinning
    // Skipped when LineByLineAdaptiveEngine is active (it handles all of Phase 2)
    if (stageFlags.engagement_analysis && !lineByLineActive) {
      await _localRunStageAsync("2.1_engagement_chip_thinning", 2, stages, async () => {
        const eng = await this._getEngine("instantaneous");
        const toolGroups = this._groupBlocksByTool(blocks);
        let blocksOptimized = 0;

        for (const [toolNum, toolBlocks] of toolGroups) {
          const tool = tools.find(t => t.id === String(toolNum)) ?? tools[0];
          if (!tool) continue;
          const D = tool.diameter_mm;
          const op = input.operations?.find((o) => o.tool_number === toolNum);
          const defaultAe = this._resolveDefaultRadialDepthMm(D, op);
          const defaultAp = this._resolveDefaultAxialDepthMm(D, op);

          const cuttingBlocks = toolBlocks.filter(b => b.move_type !== "G0");

          // ── Geometry-based per-block engagement inference ──
          for (let bi = 0; bi < cuttingBlocks.length; bi++) {
            const block = cuttingBlocks[bi];
            const prev = bi > 0 ? cuttingBlocks[bi - 1] : toolBlocks.find(b => b.move_type === "G0" && b.id < block.id);

            // Infer ap (axial depth) from Z transitions
            let ap = defaultAp;
            if (prev && block.z !== undefined && prev.z !== undefined) {
              const zDelta = Math.abs(block.z - prev.z);
              if (zDelta > 0.01) {
                // Z-only move = plunge; Z + XY move = ramp
                const xyDelta = Math.sqrt(
                  ((block.x ?? prev.x ?? 0) - (prev.x ?? 0)) ** 2 +
                  ((block.y ?? prev.y ?? 0) - (prev.y ?? 0)) ** 2
                );
                ap = xyDelta < 0.01 ? zDelta : zDelta; // actual depth increment
              }
            }

            // Infer ae (radial engagement) from XY step-over patterns
            let ae = defaultAe;
            // Detect step-over: if previous block was at same Z but different XY direction
            if (bi >= 2) {
              const pprev = cuttingBlocks[bi - 2];
              if (prev && pprev && block.z === prev.z && prev.z === pprev.z) {
                // All at same Z — look for direction change indicating step-over
                const dir1x = (prev.x ?? 0) - (pprev.x ?? 0);
                const dir1y = (prev.y ?? 0) - (pprev.y ?? 0);
                const dir2x = (block.x ?? 0) - (prev.x ?? 0);
                const dir2y = (block.y ?? 0) - (prev.y ?? 0);
                const dot = dir1x * dir2x + dir1y * dir2y;
                const mag1 = Math.sqrt(dir1x ** 2 + dir1y ** 2);
                const mag2 = Math.sqrt(dir2x ** 2 + dir2y ** 2);
                if (mag1 > 0.01 && mag2 > 0.01) {
                  const cosAngle = dot / (mag1 * mag2);
                  if (cosAngle < -0.7) {
                    // Near-reversal (>135°) = step-over pass, ae = perpendicular distance
                    const perpDist = Math.abs(dir2x * dir1y - dir2y * dir1x) / mag1;
                    if (perpDist > 0.01 && perpDist < D) ae = perpDist;
                  } else if (cosAngle < 0.3) {
                    // ~90° turn = corner transition
                    ae = Math.min(D, mag2); // engagement wraps at corners
                  }
                }
              }
            }

            // Detect slotting: ae ≈ D (full engagement)
            const isSlotting = ae >= D * 0.9;
            // Detect light pass: ae < 0.15 * D
            const isLightPass = ae < D * 0.15;
            // Detect plunge
            const isPlunge = prev && block.z !== undefined && prev.z !== undefined
              && block.z < prev.z
              && Math.abs((block.x ?? prev.x ?? 0) - (prev.x ?? 0)) < 0.01
              && Math.abs((block.y ?? prev.y ?? 0) - (prev.y ?? 0)) < 0.01;
            // Detect ramp: Z decreasing with XY motion
            const isRamp = prev && block.z !== undefined && prev.z !== undefined
              && block.z < prev.z && !isPlunge;
            // Detect arc: G2/G3
            const isArc = block.move_type === "G2" || block.move_type === "G3";

            // Classify block
            let classification: BlockClassification = "nominal";
            if (isPlunge) classification = "plunge";
            else if (isRamp) classification = "ramp";
            else if (isSlotting) classification = "slotting";
            else if (isLightPass) classification = "light";
            else if (isArc && ae < D * 0.5) classification = "light";
            else if (ae > D * 0.7) classification = "heavy";
            else if (bi >= 2) {
              const pprev = cuttingBlocks[bi - 2];
              if (prev && pprev) {
                const d1x = (prev.x ?? 0) - (pprev.x ?? 0);
                const d1y = (prev.y ?? 0) - (pprev.y ?? 0);
                const d2x = (block.x ?? 0) - (prev.x ?? 0);
                const d2y = (block.y ?? 0) - (prev.y ?? 0);
                const m1 = Math.sqrt(d1x ** 2 + d1y ** 2);
                const m2 = Math.sqrt(d2x ** 2 + d2y ** 2);
                if (m1 > 0.01 && m2 > 0.01) {
                  const cos = (d1x * d2x + d1y * d2y) / (m1 * m2);
                  if (cos < 0.5) classification = "corner"; // > 60° direction change
                }
              }
            }

            try {
              const ae_clamped = Math.max(0.01, Math.min(ae, D));
              const ap_clamped = Math.max(0.01, ap);

              const result = eng.computeOptimalSF({
                ae_mm: ae_clamped,
                ap_mm: ap_clamped,
                tool_diameter_mm: D,
                tool_type: this._mapToolTypeForEngagement(tool.type),
                flute_count: tool.flute_count,
                corner_radius_mm: tool.corner_radius_mm,
                target_Vc_m_min: (block.spindle_rpm ?? 3000) * Math.PI * D / 1000,
                target_fz_mm: (block.feed_mm_min ?? 500) / ((block.spindle_rpm ?? 3000) * tool.flute_count),
                kc1_1: tool.kc1_1 ?? getCanonicalKc(material?.iso_group ?? "P"),
                mc: tool.mc ?? getCanonicalMc(material?.iso_group ?? "P"),
              });

              // Use geometry-inferred classification, override engine's if we have better info
              const finalClassification = (classification !== "nominal")
                ? classification
                : (result.classification as BlockClassification);

              block.engagement = {
                ae_mm: ae_clamped,
                ap_mm: ap_clamped,
                theta_deg: result.engagement_angle_deg,
                d_eff_mm: result.effective_diameter_mm,
                chip_thinning_factor: result.chip_thinning_factor,
                classification: finalClassification,
              };

              // Apply chip thinning compensation
              if (result.chip_thinning_factor > 1.05 && block.optimization) {
                const newFeed = Math.round(block.feed_mm_min! * result.chip_thinning_factor);
                block.optimization.optimized_feed = newFeed;
                block.optimization.reasons.push(`Chip thinning ×${result.chip_thinning_factor.toFixed(2)} → F=${newFeed}`);
                block.feed_mm_min = newFeed;
                blocksOptimized++;
              }

              // ── Adaptive per-classification feed/speed adjustments ──
              // Each classification gets different treatment — features auto-enable/disable

              if (finalClassification === "slotting" && block.optimization) {
                // Full-width slot: reduce feed for chip evacuation, disable chip thinning
                const newFeed = Math.round(block.feed_mm_min! * SLOTTING_FEED_DERATING);
                block.optimization.optimized_feed = newFeed;
                block.optimization.reasons.push(`Slotting (ae≈D): ${SLOTTING_FEED_DERATING * 100}% feed → F=${newFeed}`);
                block.feed_mm_min = newFeed;
                blocksOptimized++;
              } else if (finalClassification === "corner" && block.optimization) {
                // Corner: reduce feed based on direction change severity
                const cornerAngle = result.engagement_angle_deg;
                // Tighter corners need more derating: 60°→1.0, 120°→0.67, 180°→0.33
                const cornerFactor = Math.max(0.3, 1 - Math.max(0, cornerAngle - 60) / 180);
                const newFeed = Math.round(block.feed_mm_min! * cornerFactor);
                block.optimization.optimized_feed = newFeed;
                block.optimization.reasons.push(`Corner ${cornerAngle.toFixed(0)}° ×${cornerFactor.toFixed(2)} → F=${newFeed}`);
                block.feed_mm_min = newFeed;
                blocksOptimized++;
              } else if (finalClassification === "plunge" && block.optimization) {
                // Plunge: 30% of nominal feed, disable chip thinning
                const plungeFactor = 0.3;
                const newFeed = Math.round(block.feed_mm_min! * plungeFactor);
                block.optimization.optimized_feed = newFeed;
                block.optimization.reasons.push(`Plunge entry: ${(plungeFactor * 100).toFixed(0)}% feed → F=${newFeed}`);
                block.feed_mm_min = newFeed;
                blocksOptimized++;
              } else if (finalClassification === "ramp" && block.optimization) {
                // Ramp entry: 50% feed, gradual engagement
                const rampFactor = 0.5;
                const newFeed = Math.round(block.feed_mm_min! * rampFactor);
                block.optimization.optimized_feed = newFeed;
                block.optimization.reasons.push(`Ramp entry: ${(rampFactor * 100).toFixed(0)}% feed → F=${newFeed}`);
                block.feed_mm_min = newFeed;
                blocksOptimized++;
              } else if (finalClassification === "light" && block.optimization) {
                // Light pass: boost feed since chip is thin (ONLY if chip thinning wasn't applied above)
                if (result.chip_thinning_factor <= 1.05) {
                  const lightBoost = Math.min(2.0, D / Math.max(0.1, ae_clamped));
                  if (lightBoost > 1.1) {
                    const newFeed = Math.round(block.feed_mm_min! * lightBoost);
                    block.optimization.optimized_feed = newFeed;
                    block.optimization.reasons.push(`Light pass (ae=${ae_clamped.toFixed(1)}mm) ×${lightBoost.toFixed(2)} → F=${newFeed}`);
                    block.feed_mm_min = newFeed;
                    blocksOptimized++;
                  }
                }
              } else if (finalClassification === "heavy" && block.optimization) {
                // Heavy engagement: reduce RPM to manage heat, reduce feed for force
                const heavyFeedFactor = 0.8;
                const heavyRpmFactor = 0.9;
                const newFeed = Math.round(block.feed_mm_min! * heavyFeedFactor);
                const newRpm = Math.round((block.spindle_rpm ?? 3000) * heavyRpmFactor);
                block.optimization.optimized_feed = newFeed;
                block.optimization.optimized_rpm = machine ? Math.min(newRpm, machine.max_rpm) : newRpm;
                block.optimization.reasons.push(`Heavy engagement (ae=${ae_clamped.toFixed(1)}mm): S=${newRpm} F=${newFeed}`);
                block.feed_mm_min = newFeed;
                block.spindle_rpm = block.optimization.optimized_rpm;
                blocksOptimized++;
              }

              // Ball end mill RPM correction
              if (result.effective_diameter_mm < tool.diameter_mm * 0.95 && block.optimization) {
                const rpmCorrection = tool.diameter_mm / result.effective_diameter_mm;
                const newRpm = Math.round(block.spindle_rpm! * rpmCorrection);
                const clampedRpm = machine ? Math.min(newRpm, machine.max_rpm) : newRpm;
                block.optimization.optimized_rpm = clampedRpm;
                block.optimization.reasons.push(`Ball D_eff=${result.effective_diameter_mm.toFixed(1)}mm → S=${clampedRpm}`);
                block.spindle_rpm = clampedRpm;
              }

              // Force update
              if (result.force_N) {
                block.forces = {
                  Fc_N: result.force_N,
                  Ff_N: result.force_N * 0.4,
                  Fp_N: result.force_N * 0.3,
                  resultant_N: result.force_N * 1.17,
                  power_kW: result.power_kW ?? 0,
                  torque_Nm: (result.force_N * tool.diameter_mm / 2) / 1000,
                };
              }
            } catch {
              // Individual block failure is non-fatal
            }
          }
        }
        return { blocks_analyzed: blocks.length, blocks_optimized: blocksOptimized };
      });
    } else {
      stages.push({ stage: "2.1_engagement_chip_thinning", phase: 2, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 2.3: Adaptive feed — constant chip load / force / MRR modes
    // Skipped when LineByLineAdaptiveEngine is active
    if (stageFlags.adaptive_feed && !lineByLineActive) {
      await _localRunStageAsync("2.3_adaptive_feed", 2, stages, async () => {
        try {
          const eng = await this._getEngine("engagementAdaptive");
          const toolGroups = this._groupBlocksByTool(blocks);
          let blocksAdapted = 0;

          for (const [toolNum, toolBlocks] of toolGroups) {
            const tool = tools.find(t => t.id === String(toolNum))
              ?? tools.find(t => parseInt(t.id) === toolNum) ?? tools[0];
            if (!tool) continue;

            const cuttingBlocks = toolBlocks.filter(b => b.move_type !== "G0" && b.engagement);
            if (cuttingBlocks.length === 0) continue;

            // Use constant chip load mode by default
            const nominalFz = (cuttingBlocks[0].feed_mm_min ?? 500) / ((cuttingBlocks[0].spindle_rpm ?? 3000) * tool.flute_count);

            for (const block of cuttingBlocks) {
              if (!block.engagement || !block.optimization) continue;
              // Skip if Stage 2.1 already applied chip thinning compensation
              if (block.engagement.chip_thinning_factor > 1.05) continue;
              const ae = block.engagement.ae_mm;
              const D = tool.diameter_mm;

              // Constant chip load: adjust feed for engagement angle (only for blocks
              // NOT already compensated by Stage 2.1 chip thinning)
              if (ae > 0 && ae < D * 0.9) {
                const engagementRatio = ae / D;
                // Use canonical formula: factor = 1 / sin(arccos(1 - 2*ae/D))
                const cosArg = 1 - 2 * engagementRatio;
                const sinVal = Math.sqrt(1 - cosArg * cosArg);
                const adaptFactor = sinVal > 0.3 ? 1 / sinVal : 1 / 0.3;

                if (Math.abs(adaptFactor - 1.0) > 0.05) {
                  const newFeed = Math.round(block.feed_mm_min! * adaptFactor);
                  block.optimization.optimized_feed = newFeed;
                  block.optimization.reasons.push(`Adaptive feed: ae/D=${engagementRatio.toFixed(2)} → ×${adaptFactor.toFixed(2)} → F=${newFeed}`);
                  block.feed_mm_min = newFeed;
                  blocksAdapted++;
                }
              }
            }
          }
          return { blocks_adapted: blocksAdapted };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "2.3_adaptive_feed", phase: 2, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 2.4: Corner detection — refined engagement spike feed reduction
    if (stageFlags.corner_detection && !lineByLineActive) {
      _localRunStage("2.4_corner_detection", 2, stages, () => {
        let cornersDetected = 0;
        for (let i = 2; i < blocks.length; i++) {
          const prev = blocks[i - 1];
          const curr = blocks[i];
          if (curr.move_type === "G0" || prev.move_type === "G0") continue;
          if (!curr.optimization) continue;

          // Detect direction change angle
          const prevPrev = blocks[i - 2];
          if (!prevPrev || prevPrev.move_type === "G0") continue;

          const dx1 = (prev.x ?? 0) - (prevPrev.x ?? 0);
          const dy1 = (prev.y ?? 0) - (prevPrev.y ?? 0);
          const dx2 = (curr.x ?? 0) - (prev.x ?? 0);
          const dy2 = (curr.y ?? 0) - (prev.y ?? 0);

          const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
          const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (len1 < 0.001 || len2 < 0.001) continue;

          const cosAngle = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);
          const angleDeg = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180 / Math.PI;

          // Sharp corners (>60° direction change) need feed reduction
          if (angleDeg > 60) {
            const cornerDerating = Math.max(0.3, 1 - (angleDeg - 60) / 180);
            const newFeed = Math.round(curr.feed_mm_min! * cornerDerating);
            curr.optimization.optimized_feed = newFeed;
            curr.optimization.reasons.push(`Corner ${angleDeg.toFixed(0)}° → ×${cornerDerating.toFixed(2)} → F=${newFeed}`);
            curr.feed_mm_min = newFeed;
            cornersDetected++;
          }
        }
        return { corners_detected: cornersDetected };
      });
    } else {
      stages.push({ stage: "2.4_corner_detection", phase: 2, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 2.5: Plunge/ramp detection — axial feed limiting
    if (stageFlags.plunge_detection && !lineByLineActive) {
      _localRunStage("2.5_plunge_ramp", 2, stages, () => {
        let plungesDetected = 0;
        let rampsDetected = 0;
        for (let i = 1; i < blocks.length; i++) {
          const prev = blocks[i - 1];
          const curr = blocks[i];
          if (curr.move_type === "G0" || !curr.optimization) continue;

          const dz = Math.abs((curr.z ?? 0) - (prev.z ?? 0));
          const dxy = Math.sqrt(
            ((curr.x ?? 0) - (prev.x ?? 0)) ** 2 +
            ((curr.y ?? 0) - (prev.y ?? 0)) ** 2
          );

          if (dz < 0.01) continue; // no Z motion

          const zRatio = dz / (dxy + dz); // 1.0 = pure plunge, 0.0 = pure XY

          if (zRatio > 0.9) {
            // Pure plunge — 50% feed reduction
            const newFeed = Math.round(curr.feed_mm_min! * 0.5);
            curr.optimization.optimized_feed = newFeed;
            curr.optimization.reasons.push(`Plunge detected (Z-ratio=${zRatio.toFixed(2)}) → F=${newFeed}`);
            curr.feed_mm_min = newFeed;
            plungesDetected++;
          } else if (zRatio > 0.3) {
            // Ramp entry — graduated reduction (70-90%)
            const rampDerating = 0.7 + (1 - zRatio) * 0.3;
            const newFeed = Math.round(curr.feed_mm_min! * rampDerating);
            curr.optimization.optimized_feed = newFeed;
            curr.optimization.reasons.push(`Ramp entry (Z-ratio=${zRatio.toFixed(2)}) → ×${rampDerating.toFixed(2)} → F=${newFeed}`);
            curr.feed_mm_min = newFeed;
            rampsDetected++;
          }
        }
        return { plunges: plungesDetected, ramps: rampsDetected };
      });
    } else {
      stages.push({ stage: "2.5_plunge_ramp", phase: 2, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 2.6: Wear progression tracking
    if (stageFlags.wear_progression && !lineByLineActive) {
      _localRunStage("2.6_wear_progression", 2, stages, () => {
        const toolGroups = this._groupBlocksByTool(blocks);
        for (const [toolNum, toolBlocks] of toolGroups) {
          const tool = tools.find(t => t.id === String(toolNum));
          let cumulativeTime_min = 0;
          const VB_limit = 0.3; // mm, roughing default

          for (const block of toolBlocks) {
            if (block.move_type === "G0" || !block.feed_mm_min) continue;

            // Estimate cutting time for this block
            const prevBlock = blocks[block.id - 1];
            const dist = prevBlock ? Math.sqrt(
              ((block.x ?? 0) - (prevBlock.x ?? 0)) ** 2 +
              ((block.y ?? 0) - (prevBlock.y ?? 0)) ** 2 +
              ((block.z ?? 0) - (prevBlock.z ?? 0)) ** 2
            ) : 0;
            const blockTime = dist > 0 && block.feed_mm_min > 0 ? dist / block.feed_mm_min : 0;
            cumulativeTime_min += blockTime;

            // Takeyama-Murata simplified: VB ∝ t^0.5 in normal wear region
            const Vc = (block.spindle_rpm ?? 3000) * Math.PI * (tool?.diameter_mm ?? 10) / 1000;
            const C_wear = 0.01 * Math.pow(Vc / 100, 1.5); // wear rate increases with speed
            const VB = C_wear * Math.sqrt(cumulativeTime_min);

            block.wear = {
              VB_mm: VB,
              VB_rate_mm_per_min: VB > 0 && cumulativeTime_min > 0 ? VB / cumulativeTime_min : 0,
              remaining_life_pct: Math.max(0, (1 - VB / VB_limit) * 100),
            };

            // Derate S/F when wear approaches limit
            if (VB > VB_limit * 0.7 && block.optimization) {
              const wearDerating = 1 - (VB - VB_limit * 0.7) / (VB_limit * 0.3) * 0.2;
              const newRpm = Math.round(block.spindle_rpm! * Math.max(0.8, wearDerating));
              block.optimization.optimized_rpm = newRpm;
              block.optimization.reasons.push(`Wear VB=${VB.toFixed(3)}mm → S derated to ${newRpm}`);
              block.spindle_rpm = newRpm;
            }
          }
        }
        return { wear_tracking: "active" };
      });
    } else {
      stages.push({ stage: "2.6_wear_progression", phase: 2, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 2.7: Thermal accumulation tracking
    if (stageFlags.thermal_tracking && !lineByLineActive) {
      _localRunStage("2.7_thermal_tracking", 2, stages, () => {
        let cumulativeHeat = 0;
        const heatDissipationRate = 50; // J/s estimated conduction+convection

        for (const block of blocks) {
          if (block.move_type === "G0" || !block.forces) continue;

          // Heat generation: Q = Fc × Vc / 60 (watts) × time
          // Resolve tool diameter from block's tool_number
          const thermalTool = tools.find(t => t.id === String(block.tool_number)) ?? tools[0];
          const thermalDia = thermalTool?.diameter_mm ?? 10;
          const Vc_m_s = ((block.spindle_rpm ?? 3000) * Math.PI * thermalDia / 1000) / 60;
          const heatGen = block.forces.Fc_N * Vc_m_s; // watts

          const prevBlock = blocks[block.id - 1];
          const dist = prevBlock ? Math.sqrt(
            ((block.x ?? 0) - (prevBlock.x ?? 0)) ** 2 +
            ((block.y ?? 0) - (prevBlock.y ?? 0)) ** 2 +
            ((block.z ?? 0) - (prevBlock.z ?? 0)) ** 2
          ) : 0;
          const blockTime_s = dist > 0 && block.feed_mm_min ? (dist / block.feed_mm_min) * 60 : 0;

          cumulativeHeat += (heatGen - heatDissipationRate) * blockTime_s;
          cumulativeHeat = Math.max(0, cumulativeHeat);

          // Estimate temperatures
          const T_tool = 20 + cumulativeHeat * 0.001; // simplified
          const T_chip = 200 + heatGen * 0.5;

          block.thermal = {
            T_tool_C: T_tool,
            T_chip_C: T_chip,
            cumulative_heat_J: cumulativeHeat,
          };

          // Derate speed when cumulative heat is high
          if (cumulativeHeat > 5000 && block.optimization) {
            const thermalDerating = Math.max(0.85, 1 - (cumulativeHeat - 5000) / 50000);
            const newRpm = Math.round(block.spindle_rpm! * thermalDerating);
            block.optimization.optimized_rpm = newRpm;
            block.optimization.reasons.push(`Thermal accumulation ${cumulativeHeat.toFixed(0)}J → S=${newRpm}`);
            block.spindle_rpm = newRpm;
          }
        }
        return { peak_heat_J: cumulativeHeat };
      });
    } else {
      stages.push({ stage: "2.7_thermal_tracking", phase: 2, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 2.7b: Coupled Thermal-Wear ODE (PP-MOAT-MS2 U02 — ThermalWearCouplingEngine)
    // Replaces simplified thermal/wear models with Usui diffusion wear + RK4 coupled ODE.
    // Per-tool trajectory: VB(t), T_tool(t), deflection(t), cumulative dimensional error.
    // Ref: Usui et al. (1978), Loewen & Shaw (1954)
    if (stageFlags.coupled_thermal_wear && !lineByLineActive) {
      await _localRunStageAsync("2.7b_coupled_thermal_wear", 2, stages, async () => {
        try {
          const twcEng = await this._getEngine("thermalWearCoupling");
          const toolGroups = this._groupBlocksByTool(blocks);
          let totalDimensionalError = 0;
          let peakTemp = 0;
          let toolsProcessed = 0;

          for (const [toolNum, toolBlocks] of toolGroups) {
            const tool = tools.find(t => t.id === String(toolNum));
            const dia = tool?.diameter_mm ?? 10;

            // Compute average cutting speed from first cutting block
            const firstCutting = toolBlocks.find(b => b.move_type !== "G0" && b.spindle_rpm);
            if (!firstCutting) continue;
            const Vc = (firstCutting.spindle_rpm ?? 3000) * Math.PI * dia / 1000;
            const F0 = firstCutting.forces?.Fc_N ?? 500;

            // Estimate total cutting time for this tool
            let totalTime = 0;
            for (let i = 1; i < toolBlocks.length; i++) {
              if (toolBlocks[i].move_type === "G0" || !toolBlocks[i].feed_mm_min) continue;
              const prev = toolBlocks[i - 1];
              const d = Math.sqrt(
                ((toolBlocks[i].x ?? 0) - (prev.x ?? 0)) ** 2 +
                ((toolBlocks[i].y ?? 0) - (prev.y ?? 0)) ** 2 +
                ((toolBlocks[i].z ?? 0) - (prev.z ?? 0)) ** 2
              );
              if (d > 0 && toolBlocks[i].feed_mm_min! > 0) totalTime += d / toolBlocks[i].feed_mm_min!;
            }
            if (totalTime <= 0) continue;

            // Feed per rev for Usui model
            const fz = firstCutting.engagement?.ae_mm ?? (firstCutting.feed_mm_min ?? 500) / (firstCutting.spindle_rpm ?? 3000);

            const result = twcEng.analyze({
              cutting_speed_m_min: Vc,
              feed_mm_rev: fz,
              depth_of_cut_mm: firstCutting.engagement?.ap_mm ?? 2,
              initial_force_N: F0,
              tool_diameter_mm: dia,
              tool_overhang_mm: (tool as any)?.overhang_mm ?? 40,
              tool_E_GPa: (tool as any)?.modulus_GPa ?? 600,
              simulation_time_min: totalTime,
              time_step_s: 1,
            });

            // Map coupled ODE trajectory onto blocks
            const trajectory = result.trajectory ?? [];
            if (trajectory.length > 0) {
              let cumulativeTime = 0;
              for (let i = 0; i < toolBlocks.length; i++) {
                const block = toolBlocks[i];
                if (block.move_type === "G0" || !block.feed_mm_min) continue;

                const prev = i > 0 ? toolBlocks[i - 1] : block;
                const d = Math.sqrt(
                  ((block.x ?? 0) - (prev.x ?? 0)) ** 2 +
                  ((block.y ?? 0) - (prev.y ?? 0)) ** 2 +
                  ((block.z ?? 0) - (prev.z ?? 0)) ** 2
                );
                if (d > 0 && block.feed_mm_min > 0) cumulativeTime += d / block.feed_mm_min;

                // Find closest trajectory point
                const tIdx = Math.min(
                  trajectory.length - 1,
                  Math.max(0, Math.round((cumulativeTime / totalTime) * (trajectory.length - 1)))
                );
                const pt = trajectory[tIdx];

                // Overwrite with coupled ODE results
                block.wear = {
                  VB_mm: pt.wear_mm,
                  VB_rate_mm_per_min: tIdx > 0 ? (pt.wear_mm - trajectory[tIdx - 1].wear_mm) / ((pt.time_min - trajectory[tIdx - 1].time_min) || 0.001) : 0,
                  remaining_life_pct: Math.max(0, (1 - pt.wear_mm / 0.3) * 100),
                };
                block.thermal = {
                  T_tool_C: pt.temp_C,
                  T_chip_C: pt.temp_C * 1.5, // chip temp ~1.5× tool interface
                  cumulative_heat_J: pt.temp_C * 10, // approximate
                };

                // Derate if wear approaching limit
                if (pt.wear_mm > 0.21 && block.optimization) {
                  const wearDerating = Math.max(0.8, 1 - (pt.wear_mm - 0.21) / (0.3 * 0.3) * 0.2);
                  const newRpm = Math.round(block.spindle_rpm! * wearDerating);
                  block.optimization.optimized_rpm = newRpm;
                  block.optimization.reasons.push(`Coupled ODE: VB=${pt.wear_mm.toFixed(3)}mm T=${pt.temp_C.toFixed(0)}°C → S=${newRpm}`);
                  block.spindle_rpm = newRpm;
                }
              }
            }

            peakTemp = Math.max(peakTemp, result.max_temp_C ?? 0);
            totalDimensionalError += result.cumulative_error_um ?? 0;
            toolsProcessed++;
          }

          return {
            method: "coupled_RK4_ODE",
            tools_processed: toolsProcessed,
            peak_temperature_C: peakTemp,
            cumulative_dimensional_error_um: totalDimensionalError,
          };
        } catch {
          return { method: "skipped", reason: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "2.7b_coupled_thermal_wear", phase: 2, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // ═══ PHASE 3: MOTION OPTIMIZATION ═══

    // Stage 3.1: Toolpath smoothing — corner rounding for smooth motion
    if (stageFlags.toolpath_smoothing) {
      await _localRunStageAsync("3.1_toolpath_smoothing", 3, stages, async () => {
        try {
          let smoothedCorners = 0;
          let maxChordError = 0;
          const minAngleDeg = 15; // direction change threshold

          for (let i = 1; i < blocks.length - 1; i++) {
            const prev = blocks[i - 1];
            const curr = blocks[i];
            const next = blocks[i + 1];

            // Only process cutting moves with XY coordinates
            if (curr.move_type === "G0" || next.move_type === "G0") continue;
            if (curr.x == null || curr.y == null) continue;
            if (prev.x == null || prev.y == null) continue;
            if (next.x == null || next.y == null) continue;

            // Compute direction vectors
            const dx1 = curr.x - prev.x;
            const dy1 = curr.y - prev.y;
            const dx2 = next.x - curr.x;
            const dy2 = next.y - curr.y;

            const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
            const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            if (len1 < 0.001 || len2 < 0.001) continue;

            // Angle between segments
            const dot = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);
            const clampedDot = Math.max(-1, Math.min(1, dot));
            const angleDeg = Math.acos(clampedDot) * (180 / Math.PI);

            if (angleDeg > minAngleDeg) {
              // Apply corner rounding: radius = min(2.0, segment_length * 0.4)
              const segLen = Math.min(len1, len2);
              const radius = Math.min(2.0, segLen * 0.4);

              // Compute chord error: e = r * (1 - cos(angle/2))
              const halfAngleRad = (angleDeg / 2) * (Math.PI / 180);
              const chordError = radius * (1 - Math.cos(halfAngleRad));
              maxChordError = Math.max(maxChordError, chordError);

              // Adjust corner point: shift toward the arc center (bisector direction)
              const bisX = (dx1 / len1 + dx2 / len2);
              const bisY = (dy1 / len1 + dy2 / len2);
              const bisLen = Math.sqrt(bisX * bisX + bisY * bisY);
              if (bisLen > 0.001) {
                const shift = chordError;
                curr.x += (bisX / bisLen) * shift;
                curr.y += (bisY / bisLen) * shift;
              }

              smoothedCorners++;
            }
          }
          return { smoothed_corners: smoothedCorners, max_chord_error: parseFloat(maxChordError.toFixed(6)) };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({
        stage: "3.1_toolpath_smoothing", phase: 3, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // Stage 3.2: Motion dynamics — achievable feed (accel/jerk/corner/servo)
    if (stageFlags.motion_dynamics) {
      await _localRunStageAsync("3.2_motion_dynamics", 3, stages, async () => {
        try {
          const eng = await this._getEngine("motionDynamics");
          let feedsClamped = 0;
          const machineAccel = machine?.accel_mm_s2?.x ?? 2000; // mm/s²

          for (let i = 1; i < blocks.length; i++) {
            const prev = blocks[i - 1];
            const curr = blocks[i];
            if (curr.move_type === "G0" || !curr.feed_mm_min) continue;

            const dist = Math.sqrt(
              ((curr.x ?? 0) - (prev.x ?? 0)) ** 2 +
              ((curr.y ?? 0) - (prev.y ?? 0)) ** 2 +
              ((curr.z ?? 0) - (prev.z ?? 0)) ** 2
            );

            if (dist < 0.001) continue;

            // Trapezoidal profile: max achievable feed for this distance
            // v_max = √(2 × a × d) when distance is too short to reach commanded feed
            const commandedFeed_mm_s = curr.feed_mm_min / 60;
            const maxAchievable_mm_s = Math.sqrt(2 * machineAccel * dist);
            const maxAchievable_mm_min = maxAchievable_mm_s * 60;

            if (maxAchievable_mm_min < curr.feed_mm_min * 0.95) {
              if (curr.optimization) {
                curr.optimization.optimized_feed = Math.round(maxAchievable_mm_min);
                curr.optimization.reasons.push(
                  `Motion: seg ${dist.toFixed(1)}mm too short for F${curr.feed_mm_min} → F${Math.round(maxAchievable_mm_min)}`
                );
              }
              curr.feed_mm_min = Math.round(maxAchievable_mm_min);
              feedsClamped++;
            }
          }
          return { feeds_clamped: feedsClamped };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({
        stage: "3.2_motion_dynamics", phase: 3, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // Stage 3.2b: CAM Post Strategy Enforcement — arc max angle per controller
    // Source: fusion-post-strategies.json + cimco-post-strategies.json (PP-MOAT-MS3 U04)
    {
      const ctrlKey = machine?.controller ?? input.controller ?? "fanuc";
      const camStrategy = getCAMPostStrategy(ctrlKey);
      const maxArcDeg = camStrategy.max_arc_sweep_deg;
      let arcsWarned = 0;
      for (const block of blocks) {
        if (block.move_type !== "G2" && block.move_type !== "G3") continue;
        // If block has arc_sweep_deg (from parser or line-by-line), enforce limit
        const sweep = (block as any).arc_sweep_deg;
        if (sweep !== undefined && Math.abs(sweep) > maxArcDeg) {
          warnings.push(`Stage 3.2b: Arc sweep ${sweep.toFixed(0)}° exceeds ${ctrlKey} limit ${maxArcDeg}° (${camStrategy.source}) — linearization recommended`);
          arcsWarned++;
        }
      }
      stages.push({
        stage: "3.2b_cam_strategy", phase: 3, status: "pass",
        duration_ms: 0,
        summary: `${ctrlKey}: max_arc=${maxArcDeg}° helical=${camStrategy.allow_helical} (${camStrategy.source})`,
        data: { controller: ctrlKey, max_arc_sweep_deg: maxArcDeg, source: camStrategy.source, arcs_warned: arcsWarned },
      });
    }

    // Stage 3.3: Look-ahead — bidirectional velocity planning
    if (stageFlags.look_ahead) {
      await _localRunStageAsync("3.3_look_ahead", 3, stages, async () => {
        try {
          const machineAccel = machine?.accel_mm_s2?.x ?? 2000; // mm/s²
          let adjustedCount = 0;
          const count = blocks.length;

          // Compute distances and max velocities per segment
          const distances: number[] = new Array(count).fill(0);
          const maxVels: number[] = new Array(count).fill(0); // mm/s
          for (let i = 1; i < count; i++) {
            const prev = blocks[i - 1];
            const curr = blocks[i];
            distances[i] = Math.sqrt(
              ((curr.x ?? 0) - (prev.x ?? 0)) ** 2 +
              ((curr.y ?? 0) - (prev.y ?? 0)) ** 2 +
              ((curr.z ?? 0) - (prev.z ?? 0)) ** 2
            );
            maxVels[i] = (curr.feed_mm_min ?? 0) / 60;
          }

          // Forward pass: limit entry velocity based on previous exit + accel + distance
          const entryVels: number[] = new Array(count).fill(0);
          entryVels[0] = 0;
          for (let i = 1; i < count; i++) {
            if (blocks[i].move_type === "G0" || distances[i] < 0.001) {
              entryVels[i] = maxVels[i];
              continue;
            }
            // v² = v0² + 2*a*d → max entry = sqrt(prevExit² + 2*a*d)
            const prevExit = entryVels[i - 1];
            const maxEntry = Math.sqrt(prevExit * prevExit + 2 * machineAccel * distances[i]);
            entryVels[i] = Math.min(maxVels[i], maxEntry);
          }

          // Backward pass: ensure deceleration is feasible
          const exitVels: number[] = new Array(count).fill(0);
          exitVels[count - 1] = 0;
          for (let i = count - 2; i >= 0; i--) {
            if (blocks[i].move_type === "G0" || distances[i + 1] < 0.001) {
              exitVels[i] = entryVels[i];
              continue;
            }
            const nextEntry = Math.min(entryVels[i + 1], exitVels[i + 1]);
            const maxExit = Math.sqrt(nextEntry * nextEntry + 2 * machineAccel * distances[i + 1]);
            exitVels[i] = Math.min(entryVels[i], maxExit);
          }

          // Apply clamped feeds
          let totalEffectiveness = 0;
          let effectivenessCount = 0;
          for (let i = 1; i < count; i++) {
            if (blocks[i].move_type === "G0" || !blocks[i].feed_mm_min) continue;
            const plannedVel = Math.min(entryVels[i], exitVels[i]);
            const plannedFeed = Math.round(plannedVel * 60);
            const originalFeed = blocks[i].feed_mm_min ?? 0;

            if (originalFeed > 0 && plannedFeed < originalFeed * 0.95) {
              if (blocks[i].optimization) {
                blocks[i].optimization!.optimized_feed = plannedFeed;
                blocks[i].optimization!.reasons.push(
                  `Look-ahead: F${originalFeed} → F${plannedFeed} (accel/decel limited)`
                );
              }
              blocks[i].feed_mm_min = plannedFeed;
              adjustedCount++;
            }

            if (originalFeed > 0) {
              totalEffectiveness += ((blocks[i].feed_mm_min ?? originalFeed) / originalFeed) * 100;
              effectivenessCount++;
            }
          }

          const avgEffectiveness = effectivenessCount > 0
            ? parseFloat((totalEffectiveness / effectivenessCount).toFixed(1))
            : 100;

          return { segments_planned: count, feeds_adjusted: adjustedCount, avg_effectiveness_pct: avgEffectiveness };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({
        stage: "3.3_look_ahead", phase: 3, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // Stage 3.4: Machine error compensation — thermal growth Z-offset
    if (stageFlags.machine_error_comp) {
      await _localRunStageAsync("3.4_machine_error_comp", 3, stages, async () => {
        try {
          const deltaT = 2.0; // °C — default warm machine temperature rise
          const cte = 12e-6; // steel CTE (1/°C)
          let offsetCount = 0;
          let maxOffset = 0;

          // Use spindle nose as reference — distance_from_spindle ≈ Z travel from Z=0
          for (const block of blocks) {
            if (block.move_type === "G0") continue;
            if (block.z == null) continue;

            const distFromSpindle = Math.abs(block.z);
            const delta = cte * deltaT * distFromSpindle; // thermal growth (mm)

            if (delta > 0.0001) { // only apply if > 0.1 µm
              block.z = block.z - delta; // compensate by shifting Z closer
              maxOffset = Math.max(maxOffset, delta);
              offsetCount++;

              if (block.optimization) {
                block.optimization.reasons.push(
                  `Thermal comp: Z offset ${(delta * 1000).toFixed(2)}µm (ΔT=${deltaT}°C)`
                );
              }
            }
          }

          return {
            z_offsets_applied: offsetCount,
            max_offset_um: parseFloat((maxOffset * 1000).toFixed(2)),
            thermal_growth_model: "linear_CTE",
          };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({
        stage: "3.4_machine_error_comp", phase: 3, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // Stage 3.4b: SLD-aware RPM rewriting — shift spindle speeds to stable pockets
    // Novel: no CAM software does post-processing SLD optimization
    if (stageFlags.stability_rewrite) {
      await _localRunStageAsync("3.4b_stability_rpm_rewrite", 3, stages, async () => {
        try {
          const rewriter = await this._getEngine("stabilityRewriter");

          // Collect SLD data from Stage 1.3 (StochasticChatterEngine result)
          const sldStage = stages.find(s => s.stage === "1.3_stability_lobes");
          const sldData = sldStage?.data as any;
          const lobes: Array<{ rpm: number; maxDoc_mm: number }> = sldData?.sld_lobes ?? sldData?.lobes ?? [];

          if (lobes.length === 0) {
            return { status: "no_sld_data", reason: "Stage 1.3 did not produce SLD lobes — skipping RPM rewrite" };
          }

          // Reconstruct G-code from blocks for rewriting
          const gcodeLines: string[] = [];
          for (const block of blocks) {
            let line = block.move_type;
            if (block.x != null) line += ` X${block.x.toFixed(3)}`;
            if (block.y != null) line += ` Y${block.y.toFixed(3)}`;
            if (block.z != null) line += ` Z${block.z.toFixed(3)}`;
            if (block.feed_mm_min != null && block.move_type !== "G0") line += ` F${block.feed_mm_min}`;
            if (block.spindle_rpm != null) line += ` S${block.spindle_rpm}`;
            gcodeLines.push(line);
          }
          const gcodeStr = gcodeLines.join("\n");

          const tool = tools[0];
          const result = rewriter.rewrite(gcodeStr, {
            lobes,
            toolFlutes: tool?.flute_count ?? 4,
            currentDoc_mm: blocks[0]?.engagement?.ap_mm ?? 3,
            rpmSearchRange: 20,
            preferHigherRPM: true,
            minRPM: machine?.max_rpm ? Math.round(machine.max_rpm * 0.05) : 200,
            maxRPM: machine?.max_rpm ?? 12000,
            feedPerTooth_mm: tool ? (blocks.find(b => b.feed_mm_min)?.feed_mm_min ?? 500) / ((blocks.find(b => b.spindle_rpm)?.spindle_rpm ?? 3000) * tool.flute_count) : undefined,
          });

          // Apply RPM changes back to blocks
          if (result?.changes) {
            for (const change of result.changes) {
              const block = blocks[change.lineNumber];
              if (block && block.optimization) {
                block.spindle_rpm = change.newRPM;
                block.optimization.optimized_rpm = change.newRPM;
                block.optimization.reasons.push(`SLD rewrite: S${change.originalRPM}→S${change.newRPM} (${change.reason})`);
                // Adjust feed proportionally to maintain chip load
                if (change.originalRPM > 0 && block.feed_mm_min) {
                  const feedRatio = change.newRPM / change.originalRPM;
                  const newFeed = Math.round(block.feed_mm_min * feedRatio);
                  block.feed_mm_min = newFeed;
                  block.optimization.optimized_feed = newFeed;
                }
              }
            }
          }

          return {
            sld_rpm_rewrites: result?.stats?.rewrittenCount ?? 0,
            avg_rpm_shift: result?.stats?.avgRPMShift ?? 0,
            chatter_risk: result?.stats?.chatterRisk ?? "unknown",
          };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({
        stage: "3.4b_stability_rpm_rewrite", phase: 3, status: "skipped",
        duration_ms: 0, summary: "Disabled", data: null,
      });
    }

    // Stage 3.5: Controller feature injection (enhanced with AdvancedPostProcessorEngine)
    if (stageFlags.controller_features && (machine?.controller || input.controller)) {
      await _localRunStageAsync("3.5_controller_features", 3, stages, async () => {
        try {
          const eng = await this._getEngine("controllerDialect");
          const ctrl = machine?.controller ?? input.controller ?? "fanuc";
          const dialect = eng.getDialect(ctrl);
          const injectedCodes: string[] = [];

          // Determine operation type for feature selection
          const opType = input.operations?.[0]?.type ?? "general";
          const isFinishing = /finish|fine|polish/i.test(opType);
          const isRoughing = /rough|hog|mrr/i.test(opType);

          const featureType = isFinishing ? "finishing"
            : isRoughing ? "roughing" : "semi_finishing";
          const codes = eng.getFeatureCodes(ctrl, featureType);
          injectedCodes.push(...codes);

          // HSM auto-injection via AdvancedPostProcessorEngine smoothing codes
          const isHSM = /hsm|high.?speed/i.test(opType);
          const tightTolerance = (input.tolerance_mm ?? 1) < 0.05;
          const featureSelected = featureSelectionResult?.selected_features?.some(
            (f: any) => f.id === "hsm_smoothing" || f.id === "corner_rounding" || f.id === "nurbs_interpolation"
          );
          let hsmInjected = false;
          let hsmSource = "dialect";

          if (isFinishing || isHSM || tightTolerance || featureSelected) {
            try {
              // Use AdvancedPostProcessorEngine for richer controller-specific HSM codes
              const advEng = await this._getEngine("advancedPost");
              const smoothingMode = isRoughing ? "rough" : isFinishing ? "finish" : "semi";
              const hsmConfig = {
                smoothing_mode: smoothingMode,
                tolerance_mm: input.tolerance_mm ?? (isFinishing ? 0.005 : 0.05),
                corner_rounding: featureSelectionResult?.selected_features?.some((f: any) => f.id === "corner_rounding") ?? tightTolerance,
                nurbs: featureSelectionResult?.selected_features?.some((f: any) => f.id === "nurbs_interpolation") ?? false,
              };
              // AdvancedPostProcessorEngine.enhance injects HSM codes into G-code
              // We extract the smoothing activation code for the controller
              const ctrlKey = ctrl.toLowerCase();
              const smoothingCodes: Record<string, Record<string, string>> = {
                fanuc: { rough: "G5.1 Q1 R5.0", semi: "G5.1 Q1 R0.01", finish: "G5.1 Q1 R0.005" },
                haas: { rough: "G187 P1 E0.05", semi: "G187 P2 E0.01", finish: "G187 P3 E0.005" },
                siemens: { rough: "CYCLE832(0.05,1)", semi: "CYCLE832(0.01,1)", finish: "CYCLE832(0.005,1)" },
                heidenhain: { rough: "M120 LA5.0", semi: "M120 LA0.01", finish: "M120 LA0.005" },
                mazak: { rough: "G5.1 Q1 R5.0", semi: "G5.1 Q1 R0.01", finish: "G5.1 Q1 R0.005" },
                okuma: { rough: "G08 P1", semi: "G08 P1", finish: "G08 P1" },
              };
              const smoothingOff: Record<string, string> = {
                fanuc: "G5.1 Q0", haas: "G187 P0", siemens: "CYCLE832()",
                heidenhain: "M120", mazak: "G5.1 Q0", okuma: "G08 P0",
              };
              const ctrlCodes = smoothingCodes[ctrlKey] ?? smoothingCodes.fanuc;
              const onCode = ctrlCodes[smoothingMode] ?? ctrlCodes.semi;
              const offCode = smoothingOff[ctrlKey] ?? smoothingOff.fanuc;

              injectedCodes.unshift(`(HSM ${smoothingMode.toUpperCase()}) ${onCode}`);
              injectedCodes.push(`(HSM_OFF) ${offCode}`);

              // Corner rounding injection
              if (hsmConfig.corner_rounding) {
                const cornerCodes: Record<string, string> = {
                  fanuc: `G62 R${hsmConfig.tolerance_mm}`,
                  haas: `G187 P3 E${hsmConfig.tolerance_mm}`,
                  siemens: `SOFT`,
                  heidenhain: `TOLERANCE ${hsmConfig.tolerance_mm}`,
                  mazak: `G62 R${hsmConfig.tolerance_mm}`,
                  okuma: `G261`,
                };
                injectedCodes.splice(1, 0, cornerCodes[ctrlKey] ?? cornerCodes.fanuc);
              }

              hsmInjected = true;
              hsmSource = "advanced_post";
            } catch {
              // Fallback to dialect-based HSM injection
              if (dialect.features.hsc_mode) {
                const hsc = dialect.features.hsc_mode;
                let hsmOnCode = hsc.on;
                if (hsc.tolerance_param && input.tolerance_mm) {
                  hsmOnCode = hsc.tolerance_param
                    .replace("{tol}", String(input.tolerance_mm))
                    .replace("{mode}", "1");
                }
                injectedCodes.unshift(hsmOnCode);
                if (hsc.off) injectedCodes.push(`(HSM_OFF) ${hsc.off}`);
                hsmInjected = true;
                hsmSource = "dialect_fallback";
              }
            }
          }

          // PPG-VAR-MS0 U06: RTCP/TCPC activation codes per controller (5-axis)
          const isMultiAxis = (machine?.axes ?? 3) >= 5 || stageFlags.multi_axis;
          const rtcpSelected = featureSelectionResult?.selected_features?.some(
            (f: any) => f.id === "rtcp" || f.id === "tcpc"
          ) || isMultiAxis;
          if (rtcpSelected) {
            const ctrlKey = ctrl.toLowerCase();
            const rtcpCodes: Record<string, { on: string; off: string }> = {
              fanuc: { on: "G43.4 H1", off: "G49" },
              haas: { on: "G234", off: "G49" },
              siemens: { on: "TRAORI", off: "TRAFOOF" },
              heidenhain: { on: "M128", off: "M129" },
              mazak: { on: "G43.4 H1", off: "G49" },
              okuma: { on: "G43.4 H1", off: "G49" },
            };
            const rtcp = rtcpCodes[ctrlKey] ?? rtcpCodes.fanuc;
            injectedCodes.unshift(`${dialect.comment_open ?? "("}RTCP ON${dialect.comment_close ?? ")"} ${rtcp.on}`);
            injectedCodes.push(`(HSM_OFF) ${rtcp.off}`);
          }

          // PPG-VAR-MS0 U06: SSV (Spindle Speed Variation) codes for chatter suppression
          const ssvSelected = featureSelectionResult?.selected_features?.some(
            (f: any) => f.id === "ssv" || f.id === "spindle_speed_variation"
          ) || stageFlags.stability_rewrite;
          if (ssvSelected) {
            const ctrlKey = ctrl.toLowerCase();
            const ssvCodes: Record<string, { on: string; off: string }> = {
              fanuc: { on: "G10.6", off: "G10.6 P0" },
              haas: { on: "G187 P3 (SSV)", off: "" },
              siemens: { on: "SETMS(3)", off: "SETMS(1)" },
              mazak: { on: "G10.6", off: "G10.6 P0" },
              okuma: { on: "G292 S10", off: "G292 S0" },
            };
            const ssv = ssvCodes[ctrlKey] ?? ssvCodes.fanuc;
            if (ssv.on) injectedCodes.unshift(`${dialect.comment_open ?? "("}SSV ON${dialect.comment_close ?? ")"} ${ssv.on}`);
            if (ssv.off) injectedCodes.push(`(HSM_OFF) ${ssv.off}`);
          }

          // Store codes for Stage 6.1 to inject into output
          (this as any)._featureInjectionCodes = injectedCodes;
          return {
            controller: dialect.display_name,
            features_injected: injectedCodes,
            operation_mode: featureType,
            rtcp_injected: rtcpSelected,
            ssv_injected: ssvSelected,
            hsm_auto_injected: hsmInjected,
            hsm_source: hsmSource,
            hsm_trigger: hsmInjected
              ? (featureSelected ? "feature_auto_selected" : isHSM ? "hsm_strategy" : tightTolerance ? "tight_tolerance" : "finishing_op")
              : null,
          };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({
        stage: "3.5_controller_features", phase: 3, status: "skipped",
        duration_ms: 0, summary: "Disabled or no controller", data: null,
      });
    }

    // ═══ PHASE 4: STOCHASTIC VERIFICATION ═══

    // Stage 4.1: Monte Carlo force distribution
    if (stageFlags.monte_carlo) {
      _localRunStage("4.1_monte_carlo", 4, stages, () => {
        const cuttingBlocks = blocks.filter(b => b.move_type !== "G0" && b.forces);
        if (cuttingBlocks.length === 0) return { status: "no_force_data" };

        const N_SAMPLES = 500;
        const materialVariation = 0.08; // ±8% kc1.1 variation
        const forceDistributions: Array<{ block_id: number; ci_95: [number, number] }> = [];

        for (const block of cuttingBlocks.slice(0, 50)) { // limit to 50 blocks for perf
          if (!block.forces) continue;
          const Fc_nom = block.forces.Fc_N;
          const samples: number[] = [];
          for (let i = 0; i < N_SAMPLES; i++) {
            // Box-Muller for normal random: Z = sqrt(-2*ln(U1)) * cos(2π*U2)
            const u1 = Math.random() || 0.001;
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            samples.push(Fc_nom * (1 + z * materialVariation));
          }
          samples.sort((a, b) => a - b);
          const ci_low = samples[Math.floor(N_SAMPLES * 0.025)];
          const ci_high = samples[Math.floor(N_SAMPLES * 0.975)];
          block.confidence = {
            force_ci_95: [ci_low, ci_high],
            feed_ci_95: [block.feed_mm_min ?? 0, block.feed_mm_min ?? 0],
          };
          forceDistributions.push({ block_id: block.id, ci_95: [ci_low, ci_high] });
        }

        return {
          blocks_simulated: forceDistributions.length,
          samples_per_block: N_SAMPLES,
          method: "Monte Carlo with Box-Muller",
        };
      });
    } else {
      stages.push({
        stage: "4.1_monte_carlo", phase: 4, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // Stage 4.2: Uncertainty propagation (force → deflection → dimension)
    if (stageFlags.uncertainty_propagation === true) {
      _localRunStage("4.2_uncertainty_propagation", 4, stages, () => {
        const blocksWithCI = blocks.filter(b => b.confidence?.force_ci_95);
        if (blocksWithCI.length === 0) return { propagated_blocks: 0, max_dim_uncertainty_um: 0, note: "no confidence data" };

        const E = 210e3; // Steel modulus MPa
        const I = 1e-8;  // Approximate tool moment of inertia m^4
        const L = 0.05;  // Overhang m
        let maxDimUncertainty = 0;

        for (const block of blocksWithCI) {
          const ci = block.confidence!.force_ci_95;
          const forceRange = ci[1] - ci[0];
          const deflectionVar = (forceRange / (3 * E * I)) * Math.pow(L, 3);
          const dimUncertaintyUm = deflectionVar * 1000;
          if (dimUncertaintyUm > maxDimUncertainty) maxDimUncertainty = dimUncertaintyUm;
        }

        return {
          propagated_blocks: blocksWithCI.length,
          max_dim_uncertainty_um: +maxDimUncertainty.toFixed(3),
        };
      });
    } else {
      stages.push({
        stage: "4.2_uncertainty_propagation", phase: 4, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // Stage 4.3: Dimensional verification (Cpk prediction)
    if (stageFlags.dimensional_verification === true) {
      _localRunStage("4.3_dimensional_verification", 4, stages, () => {
        const toleranceMm = input.tolerance_mm ?? DEFAULT_TOLERANCE_MM;

        // Find max dimensional uncertainty from 4.2 or estimate from force data
        const stage42 = stages.find(s => s.stage === "4.2_uncertainty_propagation" && s.data);
        const maxDimUncertaintyUm = (stage42?.data as any)?.max_dim_uncertainty_um ?? 0;
        const maxDimUncertaintyMm = maxDimUncertaintyUm / 1000;

        const cpk = maxDimUncertaintyMm > 0
          ? toleranceMm / (3 * maxDimUncertaintyMm)
          : 999; // No uncertainty data = assume capable

        const blocksAtRisk = maxDimUncertaintyMm > toleranceMm / 3 ? 1 : 0;
        let recommendation = "Process capable";
        if (cpk < 1.0) {
          recommendation = "CRITICAL: Cpk < 1.0 — reduce feed or increase rigidity";
          warnings.push(`DIM_VERIFY: Predicted Cpk=${cpk.toFixed(2)} < 1.0 — process not capable`);
        } else if (cpk < 1.33) {
          recommendation = "WARNING: Cpk < 1.33 — marginal capability, consider tighter control";
          warnings.push(`DIM_VERIFY: Predicted Cpk=${cpk.toFixed(2)} < 1.33 — marginal capability`);
        }

        return {
          predicted_cpk: +cpk.toFixed(2),
          blocks_at_risk: blocksAtRisk,
          recommendation,
        };
      });
    } else {
      stages.push({
        stage: "4.3_dimensional_verification", phase: 4, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // Stage 4.4: Surface finish verification (Ra prediction)
    if (stageFlags.surface_finish_verification === true) {
      _localRunStage("4.4_surface_finish_verification", 4, stages, () => {
        const targetRa = input.surface_finish_Ra ?? DEFAULT_RA_SEMI;
        const cuttingBlocks = blocks.filter(b => b.move_type !== "G0" && b.feed_mm_min && b.spindle_rpm);
        if (cuttingBlocks.length === 0) return { avg_ra_predicted: 0, max_ra: 0, blocks_exceeding_target: 0, note: "no cutting blocks" };

        let sumRa = 0;
        let maxRa = 0;
        let blocksExceeding = 0;

        for (const block of cuttingBlocks) {
          const rpm = block.spindle_rpm ?? 1000;
          const feedMmMin = block.feed_mm_min ?? 100;
          const feedPerRev = feedMmMin / rpm; // mm/rev
          // Tool nose radius: use corner_radius from tool context or default 0.4mm
          const noseRadius = 0.4; // mm, typical insert nose radius
          const raPredicted = (feedPerRev * feedPerRev) / (32 * noseRadius) * 1000; // μm

          sumRa += raPredicted;
          if (raPredicted > maxRa) maxRa = raPredicted;
          if (raPredicted > targetRa) blocksExceeding++;
        }

        const avgRa = sumRa / cuttingBlocks.length;
        if (blocksExceeding > 0) {
          warnings.push(`SURFACE: ${blocksExceeding} block(s) exceed target Ra ${targetRa}μm (max predicted: ${maxRa.toFixed(2)}μm)`);
        }

        return {
          avg_ra_predicted: +avgRa.toFixed(3),
          max_ra: +maxRa.toFixed(3),
          blocks_exceeding_target: blocksExceeding,
        };
      });
    } else {
      stages.push({
        stage: "4.4_surface_finish_verification", phase: 4, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // Stage 4.5: Environmental thermal drift model
    if (stageFlags.environmental === true) {
      _localRunStage("4.5_environmental", 4, stages, () => {
        const cte = 12e-6;       // Steel CTE (1/°C)
        const deltaT = 2.0;      // °C typical shop variation
        const machineLength = 500; // mm approximate machine length
        const thermalShiftUm = cte * deltaT * machineLength * 1000; // μm

        const toleranceMm = input.tolerance_mm ?? DEFAULT_TOLERANCE_MM;
        const toleranceUm = toleranceMm * 1000;
        const cpkImpact = toleranceUm > 0 ? thermalShiftUm / toleranceUm : 0;

        let warmUpRec = "Standard warm-up sufficient";
        if (cpkImpact > 0.3) {
          warmUpRec = "Extended warm-up recommended — thermal drift significant vs tolerance";
          warnings.push(`THERMAL: Drift ${thermalShiftUm.toFixed(1)}μm reduces Cpk by ~${(cpkImpact * 100).toFixed(0)}%`);
        }

        return {
          thermal_shift_um: +thermalShiftUm.toFixed(1),
          cpk_impact: +cpkImpact.toFixed(3),
          warm_up_recommendation: warmUpRec,
        };
      });
    } else {
      stages.push({
        stage: "4.5_environmental", phase: 4, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // Stage 4.6: Batch-to-batch material variability
    if (stageFlags.batch_variability === true) {
      _localRunStage("4.6_batch_variability", 4, stages, () => {
        const kcCv = 0.08; // 8% coefficient of variation for kc
        const cuttingBlocks = blocks.filter(b => b.move_type !== "G0" && b.forces);
        const nominalForces = cuttingBlocks.map(b => b.forces!.Fc_N);
        const meanForce = nominalForces.length > 0
          ? nominalForces.reduce((a, b) => a + b, 0) / nominalForces.length
          : 0;

        // Force range: nominal * (1 ± 2*kc_cv)
        const forceLow = meanForce * (1 - 2 * kcCv);
        const forceHigh = meanForce * (1 + 2 * kcCv);

        // Tool life CV via Taylor: if kc varies by 8%, force varies ~8%, life ~20% (amplified by Taylor exponent)
        const lifeCvPct = kcCv * 100 * 2.5; // Amplified by ~1/n factor

        const recommendedSF = lifeCvPct > 15 ? 1.3 : lifeCvPct > 10 ? 1.2 : 1.1;

        return {
          force_cv_pct: +(kcCv * 100).toFixed(1),
          life_cv_pct: +lifeCvPct.toFixed(1),
          force_range_N: [+forceLow.toFixed(0), +forceHigh.toFixed(0)],
          recommended_safety_factor: recommendedSF,
        };
      });
    } else {
      stages.push({
        stage: "4.6_batch_variability", phase: 4, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // Stage 4.7: Process robustness score
    if (stageFlags.robustness_score === true) {
      _localRunStage("4.7_robustness_score", 4, stages, () => {
        const cuttingBlocks = blocks.filter(b => b.move_type !== "G0" && b.forces);
        if (cuttingBlocks.length === 0) return { score: 100, note: "no cutting data" };

        const forces = cuttingBlocks.map(b => b.forces!.Fc_N);
        const mean = forces.reduce((a, b) => a + b, 0) / forces.length;
        const stddev = Math.sqrt(forces.reduce((a, b) => a + (b - mean) ** 2, 0) / forces.length);
        const cv = mean > 0 ? (stddev / mean) * 100 : 0; // coefficient of variation %

        // Taguchi-inspired S/N ratio: higher = more robust
        const snRatio = mean > 0 ? 10 * Math.log10(mean * mean / (stddev * stddev + 0.001)) : 0;

        // Score: 100 = perfectly robust (cv=0), 0 = highly variable (cv>50%)
        const score = Math.max(0, Math.min(100, 100 - cv * 2));

        if (score < 60) {
          warnings.push(`ROBUSTNESS: Score ${score.toFixed(0)}/100 — force CV=${cv.toFixed(1)}%. Consider tighter parameter control.`);
        }

        return {
          score: Math.round(score),
          force_cv_pct: +cv.toFixed(1),
          sn_ratio_db: +snRatio.toFixed(1),
          top_sensitivity: "feed_rate",
        };
      });
    } else {
      stages.push({
        stage: "4.7_robustness_score", phase: 4, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // ═══ PHASE 5: SAFETY + KNOWLEDGE ═══

    // Stage 5.1: G-code safety analysis
    if (stageFlags.safety_analysis) {
      await _localRunStageAsync("5.1_safety_analysis", 5, stages, async () => {
        const eng = await this._getEngine("safety");
        // Reconstruct G-code from blocks for safety analysis
        const tempGcode = this._blocksToGCode(blocks, machine?.controller ?? input.controller ?? "fanuc");
        try {
          const ctrl = (machine?.controller ?? input.controller ?? "fanuc") as string;
          const safetyConfig = {
            controller: ctrl,
            machine_envelope: machine ? {
              x_min: 0, x_max: machine.work_volume.x,
              y_min: 0, y_max: machine.work_volume.y,
              z_min: -machine.work_volume.z, z_max: 0,
              max_rpm: machine.max_rpm,
              max_feed: Math.min(machine.rapid_rate_mm_min.x, machine.rapid_rate_mm_min.y),
            } : undefined,
          };
          const result = eng.analyze(tempGcode, safetyConfig);
          const criticals = result.critical?.length ?? 0;
          const highs = result.high?.length ?? 0;
          if (criticals > 0) {
            warnings.push(`SAFETY: ${criticals} critical issue(s) found — review required`);
          }
          if (highs > 0) {
            warnings.push(`SAFETY: ${highs} high-severity issue(s)`);
          }
          return { safe: result.safe, critical: criticals, high: highs, medium: result.medium?.length ?? 0 };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "5.1_safety_analysis", phase: 5, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 5.1b: Alarm Database Cross-Reference (PP-MOAT-MS3 U05)
    // Check G-code against known controller alarm conditions
    if (stageFlags.safety_analysis) {
      await _localRunStageAsync("5.1b_alarm_check", 5, stages, async () => {
        try {
          const { AlarmRegistry } = await import("../registries/AlarmRegistry.js");
          const alarmReg = new AlarmRegistry();
          const ctrl = (machine?.controller ?? input.controller ?? "fanuc") as string;
          const alarmWarnings: Array<{ block_index: number; code: string; alarm: string; severity: string }> = [];

          // Scan blocks for known alarm-triggering conditions
          for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            // Check: RPM exceeds machine max → servo alarm territory
            if (block.spindle_rpm && machine?.max_rpm && block.spindle_rpm > machine.max_rpm) {
              alarmWarnings.push({
                block_index: i,
                code: block.spindle_rpm > machine.max_rpm * 1.2 ? "CRITICAL" : "HIGH",
                alarm: `S${block.spindle_rpm} exceeds machine max RPM ${machine.max_rpm}`,
                severity: "high",
              });
            }
            // Check: Feed exceeds rapid rate → could trigger servo following error
            if (block.feed_mm_min && machine?.rapid_rate_mm_min) {
              const maxFeed = Math.min(machine.rapid_rate_mm_min.x, machine.rapid_rate_mm_min.y);
              if (block.move_type !== "G0" && block.feed_mm_min > maxFeed) {
                alarmWarnings.push({
                  block_index: i,
                  code: "FEED_EXCEED",
                  alarm: `F${block.feed_mm_min} exceeds rapid rate ${maxFeed} mm/min`,
                  severity: "medium",
                });
              }
            }
          }

          // Query alarm DB for controller-specific known issues
          let knownAlarms = 0;
          try {
            const searchResult = await alarmReg.search({ controller: ctrl, severity: "CRITICAL", limit: 5 });
            knownAlarms = searchResult?.alarms?.length ?? searchResult?.total ?? 0;
          } catch { /* AlarmRegistry may not have data for this controller */ }

          if (alarmWarnings.length > 0) {
            warnings.push(`ALARM: ${alarmWarnings.length} potential alarm condition(s) detected for ${ctrl}`);
          }

          return {
            alarm_warnings: alarmWarnings,
            controller: ctrl,
            known_alarms_loaded: knownAlarms,
          };
        } catch {
          return { status: "alarm_registry_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "5.1b_alarm_check", phase: 5, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 5.2: Playbook rules
    if (stageFlags.playbook_rules && material) {
      await _localRunStageAsync("5.2_playbook_rules", 5, stages, async () => {
        try {
          const eng = await this._getEngine("playbook");
          const result = eng.advise({
            material_iso: material.iso_group,
            operation_type: input.operations?.[0]?.type ?? "general",
            hardness_hrc: material.hardness_HRC,
          });
          const rules = Array.isArray(result) ? result : result.rules ?? result.tips ?? [];
          if (rules.length > 0) {
            for (const rule of rules.slice(0, 5)) {
              warnings.push(`PLAYBOOK: ${rule.title ?? rule.message ?? rule}`);
            }
          }
          return { rules_fired: rules.length };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "5.2_playbook_rules", phase: 5, status: "skipped", duration_ms: 0, summary: material ? "Disabled" : "No material", data: null });
    }

    // Stage 5.3: Tribal knowledge — CAM-system-specific tips
    if (stageFlags.tribal_knowledge && material) {
      _localRunStage("5.3_tribal_knowledge", 5, stages, () => {
        const tips: string[] = [];
        const isoGroup = material.iso_group;

        // Material-based tips from tribal knowledge
        if (isoGroup === "S") {
          tips.push("TK: Superalloy — maintain constant chip load, avoid dwelling in cut");
          tips.push("TK: Use climb milling only, keep tool moving to prevent work hardening");
        }
        if (isoGroup === "M") {
          tips.push("TK: Stainless — avoid rubbing (causes work hardening), use sharp tools");
          tips.push("TK: Reduce speed 20% vs carbon steel, increase feed 10%");
        }
        if (isoGroup === "H") {
          tips.push("TK: Hardened steel — use CBN/ceramic for >45 HRC, carbide for 28-45 HRC");
        }
        if (isoGroup === "N") {
          tips.push("TK: Aluminum — high speed, sharp rake angle, watch for BUE at low speed");
        }

        // Tool-based tips
        for (const tool of tools) {
          const ld = (tool.flute_length_mm ?? tool.diameter_mm * 3) / tool.diameter_mm;
          if (ld > 5) tips.push(`TK: T${tool.id} L/D=${ld.toFixed(1)} — use light cuts, peck strategy for deep features`);
          if (tool.type === "ball_endmill") tips.push(`TK: T${tool.id} ball nose — maintain min 5° tilt for effective cutting`);
        }

        if (tips.length > 0) warnings.push(...tips);
        return { tips_applied: tips.length, material_group: isoGroup };
      });
    } else {
      stages.push({ stage: "5.3_tribal_knowledge", phase: 5, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 5.5: Energy optimization advisory
    if (stageFlags.energy_optimization) {
      _localRunStage("5.5_energy_optimization", 5, stages, () => {
        let idleSpindleBlocks = 0;
        let consecutiveRapids = 0;
        let maxConsecutiveRapids = 0;

        for (const block of blocks) {
          if (block.move_type === "G0") {
            consecutiveRapids++;
            maxConsecutiveRapids = Math.max(maxConsecutiveRapids, consecutiveRapids);
          } else {
            consecutiveRapids = 0;
          }
          // Spindle running during rapids
          if (block.move_type === "G0" && block.spindle_rpm && block.spindle_rpm > 0) {
            idleSpindleBlocks++;
          }
        }

        const recommendations: string[] = [];
        if (idleSpindleBlocks > 3) {
          recommendations.push(`ENERGY: ${idleSpindleBlocks} rapid blocks with spindle running — consider M5/M3 bracketing`);
        }
        if (maxConsecutiveRapids > 5) {
          recommendations.push(`ENERGY: ${maxConsecutiveRapids} consecutive rapids — check for unnecessary repositioning`);
        }

        if (recommendations.length > 0) warnings.push(...recommendations);
        return {
          idle_spindle_blocks: idleSpindleBlocks,
          max_consecutive_rapids: maxConsecutiveRapids,
          recommendations: recommendations.length,
        };
      });
    } else {
      stages.push({ stage: "5.5_energy_optimization", phase: 5, status: "skipped", duration_ms: 0, summary: "Disabled (opt-in)", data: null });
    }

    // Stage 5.5b: Sustainability LCA (PP-MOAT-MS2 U04 — SustainabilityLCAEngine)
    // ISO 14040 lifecycle assessment: CO2, energy, coolant cost per part.
    // Adds sustainability_score (0-100) and LCA category breakdown.
    let sustainabilityData: AnalyticsReport["sustainability"] | undefined;
    if (stageFlags.sustainability_lca) {
      await _localRunStageAsync("5.5b_sustainability_lca", 5, stages, async () => {
        try {
          const lcaEng = await this._getEngine("sustainabilityLCA");
          const cuttingBlocks = blocks.filter(b => b.move_type !== "G0" && b.feed_mm_min);
          const totalPower = cuttingBlocks
            .filter(b => b.forces)
            .reduce((sum, b) => sum + (b.forces?.power_kW ?? 0), 0);
          const avgPower = cuttingBlocks.length > 0 ? totalPower / cuttingBlocks.length : 2;

          // Estimate cutting time in hours
          let cuttingTimeSec = 0;
          for (let i = 1; i < blocks.length; i++) {
            if (blocks[i].move_type === "G0" || !blocks[i].feed_mm_min) continue;
            const prev = blocks[i - 1];
            const dist = Math.sqrt(
              ((blocks[i].x ?? 0) - (prev.x ?? 0)) ** 2 +
              ((blocks[i].y ?? 0) - (prev.y ?? 0)) ** 2 +
              ((blocks[i].z ?? 0) - (prev.z ?? 0)) ** 2
            );
            if (dist > 0 && blocks[i].feed_mm_min! > 0) cuttingTimeSec += (dist / blocks[i].feed_mm_min!) * 60;
          }
          const energyKwh = avgPower * (cuttingTimeSec / 3600);

          // Map ISO material group to LCA material type
          const matMap: Record<string, "steel" | "aluminum" | "titanium" | "copper" | "inconel"> = {
            P: "steel", M: "steel", K: "steel", N: "aluminum", S: "titanium", H: "steel",
          };
          const lcaMat = matMap[material?.iso_group ?? "P"] ?? "steel";

          // Tool changes from block analysis
          const toolChanges = new Set(blocks.map(b => b.tool_number).filter(Boolean));

          const lcaResult = lcaEng.lifecycleAssessment({
            material_kg: 5, // rough estimate — 5kg billet
            material_type: lcaMat,
            energy_kwh: energyKwh,
            coolant_liters: coolant ? 0.5 : 0,
            tool_changes: toolChanges.size,
            transport_km: 0,
            recycling_fraction: 0.7,
          });

          // Compute sustainability score (0-100, higher = greener)
          const co2 = lcaResult.impacts?.GWP_kg_CO2_eq ?? 0;
          const score = Math.max(0, Math.min(100, 100 - co2 * 10));

          sustainabilityData = {
            co2_kg_per_part: co2,
            energy_kWh_per_part: energyKwh,
            coolant_cost_per_part: coolant ? 0.15 : 0,
            sustainability_score: +score.toFixed(1),
            lca_categories: lcaResult.impacts ? {
              GWP_kg_CO2_eq: lcaResult.impacts.GWP_kg_CO2_eq,
              AP_kg_SO2_eq: lcaResult.impacts.AP_kg_SO2_eq,
              EP_kg_PO4_eq: lcaResult.impacts.EP_kg_PO4_eq,
            } : undefined,
          };

          return {
            sustainability_score: sustainabilityData.sustainability_score,
            co2_kg: sustainabilityData.co2_kg_per_part,
            energy_kwh: sustainabilityData.energy_kWh_per_part,
            lca_dominant_phase: lcaResult.dominant_phase ?? "machining",
          };
        } catch {
          return { sustainability_score: null, reason: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "5.5b_sustainability_lca", phase: 5, status: "skipped", duration_ms: 0, summary: "Disabled (opt-in)", data: null });
    }

    // Stage 5.6: Reliability check (Weibull tool reliability)
    if (stageFlags.reliability_check === true) {
      _localRunStage("5.6_reliability_check", 5, stages, () => {
        const cuttingBlocks = blocks.filter(b => b.move_type !== "G0" && b.feed_mm_min);
        if (cuttingBlocks.length === 0) return { reliability_pct: 100, note: "no cutting blocks" };

        // Cumulative cutting time estimate (blocks × assumed 1s per block if no time data)
        const cumulativeTimeSec = cuttingBlocks.length * 1.0;
        const cumulativeTimeMin = cumulativeTimeSec / 60;

        // Estimate eta (characteristic life) from Taylor tool life or default 30 min
        const eta = 30; // minutes, typical tool life
        const beta = 2.5; // Weibull shape parameter (typical for tool wear-out)

        // R(t) = exp(-(t/eta)^beta)
        const reliability = Math.exp(-Math.pow(cumulativeTimeMin / eta, beta));
        const reliabilityPct = +(reliability * 100).toFixed(1);

        // Time to 90% reliability: t = eta * (-ln(0.9))^(1/beta)
        const timeTo90 = eta * Math.pow(-Math.log(0.9), 1 / beta);

        const toolChangeRecommended = reliability < 0.85;
        if (toolChangeRecommended) {
          warnings.push(`RELIABILITY: Tool reliability ${reliabilityPct}% — tool change recommended before this program`);
        }

        return {
          reliability_pct: reliabilityPct,
          time_to_90pct_reliability: +timeTo90.toFixed(1),
          cumulative_cutting_min: +cumulativeTimeMin.toFixed(2),
          tool_change_recommended: toolChangeRecommended,
        };
      });
    } else {
      stages.push({
        stage: "5.6_reliability_check", phase: 5, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // Stage 5.7: Acoustic check (Kopac cutting noise model)
    if (stageFlags.acoustic_check === true) {
      _localRunStage("5.7_acoustic_check", 5, stages, () => {
        const cuttingBlocks = blocks.filter(b => b.move_type !== "G0" && b.spindle_rpm);
        if (cuttingBlocks.length === 0) return { noise_level_dba: 70, hearing_protection_required: false, note: "no cutting blocks" };

        let maxNoise = 0;
        const machineBackground = 70; // dBA

        for (const block of cuttingBlocks) {
          const rpm = block.spindle_rpm ?? 1000;
          const toolDia = (block as any).tool_diameter_mm ?? 10;
          const Vc = (Math.PI * toolDia * rpm) / 1000; // m/min
          const ap = (block as any).ap_mm ?? 1;
          const ae = (block as any).ae_mm ?? toolDia * 0.5;

          // Kopac simplified: L_cut = 75 + 20*log10(Vc/100) + 10*log10(ap*ae)
          const lCut = 75 + 20 * Math.log10(Math.max(Vc, 1) / 100) + 10 * Math.log10(Math.max(ap * ae, 0.01));
          // Combined noise: 10*log10(10^(L_cut/10) + 10^(background/10))
          const combined = 10 * Math.log10(Math.pow(10, lCut / 10) + Math.pow(10, machineBackground / 10));
          if (combined > maxNoise) maxNoise = combined;
        }

        const hearingProtection = maxNoise > 85;
        if (hearingProtection) {
          warnings.push(`ACOUSTIC: Estimated noise ${maxNoise.toFixed(0)} dBA > 85 dBA — hearing protection required (ISO 4869)`);
        }

        return {
          noise_level_dba: +maxNoise.toFixed(1),
          hearing_protection_required: hearingProtection,
          iso_4869_compliant: !hearingProtection,
        };
      });
    } else {
      stages.push({
        stage: "5.7_acoustic_check", phase: 5, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // ═══ PHASE 5.9: VERIFICATION (pre-output) ═══

    // Stage 5.9: 5-axis post processing (singularity + TCPC)
    if (machine?.axes === 5 || blocks.some(b => b.a !== undefined || b.b !== undefined || b.c !== undefined)) {
      await _localRunStageAsync("5.9_five_axis_post", 5, stages, async () => {
        try {
          const eng = await this._getEngine("fiveAxisPost");
          const fiveAxisBlocks = blocks.filter(b =>
            b.a !== undefined || b.b !== undefined || b.c !== undefined
          ).map(b => ({
            x: b.x ?? 0, y: b.y ?? 0, z: b.z ?? 0,
            a: b.a, b: b.b, c: b.c, feed_mm_min: b.feed_mm_min,
          }));

          if (fiveAxisBlocks.length > 0) {
            const singularity = eng.detectSingularities(fiveAxisBlocks, {
              controller: machine?.controller ?? input.controller ?? "fanuc",
              kinematics: (machine?.kinematics as any) ?? "table_table",
              rotary_axis_1: "A", rotary_axis_2: "C",
            });
            if (singularity.has_singularity) {
              warnings.push(...singularity.recommendations);
            }
            return { five_axis_blocks: fiveAxisBlocks.length, singularities: singularity.singularity_blocks.length };
          }
          return { five_axis_blocks: 0 };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "5.9_five_axis_post", phase: 5, status: "skipped", duration_ms: 0, summary: "No 5-axis moves", data: null });
    }

    // ═══ OMEGA SAFETY GATE: S(x) >= 0.70 required for G-code output ═══
    let omegaSafetyPassed = true;
    if (stageFlags.safety_analysis && material && machine && blocks.length > 0) {
      await _localRunStageAsync("5.10_omega_safety_gate", 5, stages, async () => {
        try {
          const eng = await this._getEngine("omegaSafety");
          const primaryTool = tools[0];
          const toolDia = primaryTool?.diameter_mm ?? 10;
          const flutes = primaryTool?.flute_count ?? 4;
          const rpm = blocks[0]?.spindle_rpm ?? 1000;
          const feed = blocks[0]?.feed_mm_min ?? 200;
          const repOp = {
            name: input.operations?.[0]?.type ?? "general",
            vc_mpm: Math.PI * toolDia * rpm / 1000,
            ap_mm: input.operations?.[0]?.ap_mm ?? 2,
            ae_mm: input.operations?.[0]?.ae_mm ?? toolDia * 0.5,
            fz_mm: feed / (rpm * flutes),
            tool_diameter_mm: toolDia,
            tool_stickout_mm: primaryTool?.flute_length_mm ?? toolDia * 3,
            tolerance_mm: input.operations?.[0]?.tolerance_mm ?? 0.05,
          };
          const matInput = {
            iso_group: material.iso_group ?? "P",
            sigma_y_MPa: material.uts_MPa ?? 600,
            T_melt_C: 1500,
          };
          const machInput = {
            max_power_kW: machine?.max_power_kW ?? 15,
            max_rpm: machine?.max_rpm ?? 10000,
          };
          const toolInput = {
            elastic_modulus_MPa: 600000,
            tensile_strength_MPa: 3500,
          };
          const holdInput = {
            type: "vise" as const,
            clamping_force_kN: 20,
            stiffness_N_um: 50,
          };
          const result = eng.score ? eng.evaluate(repOp, matInput, machInput, toolInput, holdInput) : null;
          if (result && !result.passed) {
            omegaSafetyPassed = false;
            warnings.push(`OMEGA GATE: S(x) = ${result.omega_safety.toFixed(3)} < 0.70 — G-code output BLOCKED`);
            for (const rec of result.recommendations.slice(0, 3)) {
              warnings.push(`  → ${rec}`);
            }
          }
          return result ?? { status: "engine_unavailable" };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "5.10_omega_safety_gate", phase: 5, status: "skipped", duration_ms: 0, summary: "Insufficient data for safety scoring", data: null });
    }

    // ═══ PHASE 6: OUTPUT GENERATION ═══

    // Stage 6.1: G-code generation using ControllerDialectEngine
    let outputGcode = "";
    if (stageFlags.gcode_generation && omegaSafetyPassed) {
      await _localRunStageAsync("6.1_gcode_generation", 6, stages, async () => {
        const controllerKey = machine?.controller ?? input.controller ?? "fanuc";
        try {
          const dialectEng = await this._getEngine("controllerDialect");
          outputGcode = this._blocksToGCodeWithDialect(blocks, dialectEng, controllerKey, input.output_mode ?? "pipeline_optimized");
        } catch {
          // Fallback to basic codegen if dialect engine unavailable
          outputGcode = this._blocksToGCode(blocks, controllerKey);
        }
        // Inject Stage 3.5 feature codes (HSM, smoothing) into output
        const featureCodes: string[] = (this as any)._featureInjectionCodes ?? [];
        if (featureCodes.length > 0) {
          const gcodeLines = outputGcode.split("\n");
          // Find insertion point after safe start block (first non-header line)
          let insertIdx = Math.min(3, gcodeLines.length);
          // HSM on-codes go near the top
          const hsmOnCodes = featureCodes.filter(c => !c.startsWith("(HSM_OFF)"));
          const hsmOffCodes = featureCodes.filter(c => c.startsWith("(HSM_OFF)")).map(c => c.replace("(HSM_OFF) ", ""));
          if (hsmOnCodes.length > 0) {
            gcodeLines.splice(insertIdx, 0, ...hsmOnCodes);
          }
          // HSM off-codes go before program end
          if (hsmOffCodes.length > 0) {
            const endIdx = gcodeLines.length - 1;
            gcodeLines.splice(endIdx, 0, ...hsmOffCodes);
          }
          outputGcode = gcodeLines.join("\n");
        }
        (this as any)._featureInjectionCodes = undefined;

        return { lines: outputGcode.split("\n").length, controller: controllerKey, dialect_used: true, features_injected: featureCodes.length };
      });
    } else {
      // If no codegen, return original or empty
      outputGcode = input.gcode ?? "";
      stages.push({ stage: "6.1_gcode_generation", phase: 6, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 6.1b: Sister tool + break detection injection (AdvancedPostProcessorEngine)
    const sisterToolSelected = featureSelectionResult?.selected_features?.some(
      (f: any) => f.id === "sister_tooling" || f.id === "tool_break_detect"
    );
    if (outputGcode && sisterToolSelected) {
      await _localRunStageAsync("6.1b_tool_management", 6, stages, async () => {
        try {
          const advEng = await this._getEngine("advancedPost");
          const ctrl = machine?.controller ?? input.controller ?? "fanuc";
          const toolMgmtConfig = {
            sister_tooling: featureSelectionResult?.selected_features?.some((f: any) => f.id === "sister_tooling") ?? false,
            max_tool_life_minutes: 30,
            auto_offset_update: true,
            wear_offset_increment: 0.005,
            break_detection: featureSelectionResult?.selected_features?.some((f: any) => f.id === "tool_break_detect") ?? false,
            break_detection_method: "probe" as const,
          };
          const result = advEng.enhance({
            gcode: outputGcode,
            controller: ctrl,
            tool_management: toolMgmtConfig,
          });
          if (result.enhanced_gcode) {
            outputGcode = result.enhanced_gcode;
          }
          return {
            sister_tooling: toolMgmtConfig.sister_tooling,
            break_detection: toolMgmtConfig.break_detection,
            enhancements: result.enhancements_applied ?? [],
            warnings: result.warnings ?? [],
          };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "6.1b_tool_management", phase: 6, status: "skipped", duration_ms: 0, summary: "No tool management features selected", data: null });
    }

    // Stage 6.1c: RL-optimized G-code formatting (PP-MOAT-MS2 U03 — RLPostProcessorEngine)
    // Q-learning selects optimal code format per move type, learns from controller feedback.
    // Q-table persists across pipeline runs via the engine's singleton state.
    if (stageFlags.rl_formatting && outputGcode) {
      await _localRunStageAsync("6.1c_rl_formatting", 6, stages, async () => {
        try {
          const rlEng = await this._getEngine("rlPostProcessor");
          const ctrl = machine?.controller ?? input.controller ?? "fanuc";
          const processor = rlEng.createProcessor(ctrl);

          // Convert blocks to ToolpathMove[] for the RL engine
          const moves = blocks
            .filter((b: ToolpathBlock) => b.x != null && b.y != null && b.z != null)
            .map((b: ToolpathBlock) => ({
              type: b.move_type === "G0" ? "rapid" as const
                : (b.move_type === "G2" || b.move_type === "G3") ? "arc" as const
                : "linear" as const,
              x: b.x ?? 0,
              y: b.y ?? 0,
              z: b.z ?? 0,
              f: b.feed_mm_min,
            }));

          if (moves.length > 0) {
            const result = rlEng.generateCode(processor, moves, { deterministic: true });
            if (result.gcode && result.gcode.length > 10) {
              outputGcode = result.gcode;
            }
            return {
              rl_active: true,
              controller: ctrl,
              line_count: result.lineCount,
              optimizations: result.optimizations,
              formats_used: result.formatsUsed,
              q_table_size: rlEng.stats(processor).qTableSize,
            };
          }
          return { rl_active: false, reason: "no_valid_moves" };
        } catch {
          return { rl_active: false, reason: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "6.1c_rl_formatting", phase: 6, status: "skipped", duration_ms: 0, summary: "Disabled (opt-in)", data: null });
    }

    // Stage 6.2: Probe routine generation via ProbeRoutineGeneratorEngine
    if (stageFlags.probe_routines === true) {
      await _localRunStageAsync("6.2_probe_routines", 6, stages, async () => {
        const ctrl = machine?.controller ?? input.controller ?? "fanuc";
        const toleranceMm = input.tolerance_mm ?? DEFAULT_TOLERANCE_MM;
        const probeFeatureSelected = featureSelectionResult?.selected_features?.some(
          (f: any) => f.id === "in_process_probing" || f.id === "auto_compensation"
        );
        const tightTolerance = toleranceMm < 0.02;
        const shouldGenerateInspection = probeFeatureSelected || tightTolerance || !!input.include_probe_routines;

        try {
          const probeEng = await this._getEngine("probeGenerator");

          // Build probe features from cutting blocks with tight tolerances
          const cuttingBlocks = blocks.filter(b => b.move_type !== "G0");
          const probeFeatures: Array<{ type: string; nominal: number; tolerance: number; axis: string }> = [];
          for (const block of cuttingBlocks.slice(0, 20)) {
            if (shouldGenerateInspection && block.z !== undefined && toleranceMm < 0.05) {
              probeFeatures.push({ type: "surface", nominal: block.z, tolerance: toleranceMm, axis: "Z" });
            }
          }
          // Deduplicate by nominal value
          const seen = new Set<string>();
          const uniqueFeatures = probeFeatures.filter(f => {
            const key = `${f.type}_${f.axis}_${f.nominal.toFixed(3)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }).slice(0, 10);

          // WCS setup probing
          const wcsResult = probeEng.generateWCSSetup({
            controller: ctrl,
            datum_features: [
              { type: "corner", x: 0, y: 0, z: 0, approach: "positive" },
              { type: "surface", axis: "Z", nominal: 0, clearance: 5 },
            ],
            work_offset: "G54",
            safe_z: 50,
            feed_rate: 500,
          });

          // In-process inspection for tight-tolerance features
          let inspectionResult = null;
          if (shouldGenerateInspection && uniqueFeatures.length > 0) {
            inspectionResult = probeEng.generatePartInspection({
              controller: ctrl,
              features: uniqueFeatures.map((f, i) => ({
                id: `F${i + 1}`,
                type: f.type,
                nominal: f.nominal,
                tolerance_plus: f.tolerance,
                tolerance_minus: -f.tolerance,
                axis: f.axis,
              })),
              measure_interval: 1,
              on_fail: "alarm",
              safe_z: 50,
              feed_rate: 300,
            });
          }

          // Combine probe G-code
          const probeGcode = [
            `(--- WCS SETUP PROBING ---)`,
            wcsResult.gcode,
            ...(inspectionResult ? [
              `(--- IN-PROCESS INSPECTION ---)`,
              inspectionResult.gcode,
            ] : []),
          ].join("\n");
          const probeGcodeLines = probeGcode
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => /^G(65|31|38)\b/.test(line));

          // Append probe routines to output G-code
          if (outputGcode) {
            const gcLines = outputGcode.split("\n");
            // Insert WCS probing near top (after safe start) and inspection near end
            const safeStartEnd = Math.min(5, gcLines.length);
            gcLines.splice(safeStartEnd, 0, `(--- WCS PROBE START ---)`, wcsResult.gcode, `(--- WCS PROBE END ---)`);
            if (inspectionResult) {
              const endIdx = gcLines.length - 1;
              gcLines.splice(endIdx, 0, `(--- INSPECTION START ---)`, inspectionResult.gcode, `(--- INSPECTION END ---)`);
            }
            outputGcode = gcLines.join("\n");
          }

          return {
            controller: ctrl,
            wcs_probe_lines: wcsResult.line_count,
            inspection_probe_lines: inspectionResult?.line_count ?? 0,
            features_measured: uniqueFeatures.length,
            probe_points_generated: uniqueFeatures.length,
            critical_dims_covered: uniqueFeatures.length,
            probe_gcode_lines: probeGcodeLines,
            estimated_time_sec: wcsResult.estimated_time_sec + (inspectionResult?.estimated_time_sec ?? 0),
          };
        } catch {
          // Fallback: use ProbingCycleEngine for dialect-correct probing
          try {
            const probeCycle = await this._getEngine("probingCycle");
            // Map machine controller to ProbeController dialect
            const ctrlStr = String(ctrl).toLowerCase();
            const probeCtrl = ctrlStr.includes("heidenhain") ? "heidenhain" as const
              : ctrlStr.includes("siemens") ? "siemens" as const
              : ctrlStr.includes("haas") ? "renishaw_haas" as const
              : "renishaw_fanuc" as const;

            const probeConfig = {
              controller: probeCtrl,
              probe_tool_number: 99,
              feed_rate: 300,
              retract_distance: 2,
              overtravel: 10,
              work_offset_to_set: "G54",
              print_result: true,
            };

            // Generate corner probe for WCS setup
            const cornerResult = probeCycle.generate(
              { operation: "corner" as const, x: 0, y: 0, z: 0, approach_z: 50 },
              probeConfig,
            );
            // Generate surface-Z probe
            const surfResult = probeCycle.generate(
              { operation: "surface_z" as const, z: 0, approach_z: 50 },
              probeConfig,
            );

            // Infer in-process probes from tight-tolerance features
            const cuttingBlocks = blocks.filter(b => b.move_type !== "G0");
            const inProcessProbes: string[] = [];
            const seenZ = new Set<string>();
            for (const block of cuttingBlocks.slice(0, 20)) {
              if (block.z != null && toleranceMm < 0.05) {
                const key = block.z.toFixed(3);
                if (seenZ.has(key)) continue;
                seenZ.add(key);
                const r = probeCycle.generate(
                  { operation: "surface_z" as const, z: block.z, approach_z: block.z + 5, tolerance_mm: toleranceMm },
                  { ...probeConfig, print_result: true },
                );
                inProcessProbes.push(r.gcode);
                if (inProcessProbes.length >= 10) break;
              }
            }

            const fallbackProbeGcode = [
              cornerResult.gcode,
              surfResult.gcode,
              ...inProcessProbes,
            ].join("\n");
            const probeGcodeLines = fallbackProbeGcode
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter((line) => /^G(65|31|38)\b/.test(line));

            return {
              controller: probeCtrl,
              corner_probe_lines: cornerResult.line_count,
              surface_probe_lines: surfResult.line_count,
              in_process_probes: inProcessProbes.length,
              probe_routines_generated: 2 + inProcessProbes.length,
              probe_points_generated: inProcessProbes.length,
              critical_dims_covered: inProcessProbes.length,
              probe_gcode_lines: probeGcodeLines,
              dialect_fallback: true,
            };
          } catch {
            return { status: "engine_unavailable", fallback: true };
          }
        }
      });
    } else {
      stages.push({
        stage: "6.2_probe_routines", phase: 6, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // Stage 6.3: Setup sheet generation
    if (stageFlags.setup_sheet === true) {
      _localRunStage("6.3_setup_sheet", 6, stages, () => {
        const toolsUsed = [...new Set(blocks.filter(b => b.tool_number).map(b => b.tool_number))];
        const safetyStage = stages.find(s => s.stage === "5.1_safety_analysis" && s.data);
        const safetyWarnings = (safetyStage?.data as any)?.critical_issues ?? 0;

        const setupSheet = {
          part_number: (input as any).part_id ?? "UNKNOWN",
          material: input.material ?? "Unknown",
          tools_used: toolsUsed,
          work_offset: "G54",
          fixture_notes: (input as any).fixture_notes ?? "See setup drawing",
          estimated_cycle_time: (stages.find(s => s.stage === "6.6_cycle_time")?.data as any)?.total_seconds ?? null,
          safety_warnings: safetyWarnings > 0 ? `${safetyWarnings} critical safety issue(s) — review before running` : "None",
        };

        return {
          setup_sheet_generated: true,
          setup_sheet: setupSheet,
        };
      });
    } else {
      stages.push({
        stage: "6.3_setup_sheet", phase: 6, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // Stage 6.4: Controller-specific parameter injection
    if (stageFlags.controller_params === true) {
      _localRunStage("6.4_controller_params", 6, stages, () => {
        const controllerKey = (machine?.controller ?? input.controller ?? "fanuc").toLowerCase();
        let initBlock = "";
        let controllerType = "generic";

        if (controllerKey.includes("fanuc")) {
          initBlock = "G10 L2 P1 X0. Y0. Z0.";
          controllerType = "fanuc";
        } else if (controllerKey.includes("siemens") || controllerKey.includes("840d") || controllerKey.includes("828d")) {
          initBlock = "CYCLE800()";
          controllerType = "siemens";
        } else {
          initBlock = "G54";
          controllerType = "generic";
        }

        // Prepend to output G-code if available
        if (outputGcode && initBlock) {
          outputGcode = initBlock + "\n" + outputGcode;
        }

        return {
          params_injected: true,
          controller_type: controllerType,
          init_block: initBlock,
        };
      });
    } else {
      stages.push({
        stage: "6.4_controller_params", phase: 6, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // Stage 6.5: Analytics report
    let analytics: AnalyticsReport | undefined;
    if (stageFlags.analytics_report || input.include_analytics) {
      _localRunStage("6.5_analytics_report", 6, stages, () => {
        analytics = this._generateAnalytics(blocks, tools, machine);
        // PP-MOAT-MS2 U01: Inject calibration source into analytics
        if (analytics) analytics.calibration_source = calibrationSource;
        // PP-MOAT-MS2 U04: Inject sustainability data into analytics
        if (analytics && sustainabilityData) analytics.sustainability = sustainabilityData;
        return analytics;
      });
    }

    // Stage 6.6: Cycle time estimate
    if (stageFlags.cycle_time) {
      _localRunStage("6.6_cycle_time", 6, stages, () => {
        return this._estimateCycleTime(blocks, machine);
      });
    }

    // Stage 6.7: Digital twin state export
    if (stageFlags.digital_twin === true) {
      _localRunStage("6.7_digital_twin", 6, stages, () => {
        // Collect all enrichment data from blocks
        const enrichedBlocks = blocks.map(b => ({
          id: b.id,
          line: (b as any).line,
          move_type: b.move_type,
          x: b.x, y: b.y, z: b.z,
          feed_mm_min: b.feed_mm_min,
          spindle_rpm: b.spindle_rpm,
          forces: b.forces ?? null,
          thermal: b.thermal ?? null,
          wear: b.wear ?? null,
          confidence: b.confidence ?? null,
        }));

        // Summarize stage results
        const stagesSummary = stages.map(s => ({
          stage: s.stage,
          status: s.status,
          duration_ms: s.duration_ms,
        }));

        // Force/thermal/wear profiles
        const cuttingBlocks = blocks.filter(b => b.move_type !== "G0");
        const forceProfile = cuttingBlocks.filter(b => b.forces).map(b => ({ id: b.id, Fc_N: b.forces!.Fc_N }));
        const thermalProfile = cuttingBlocks.filter(b => b.thermal).map(b => ({ id: b.id, temp_C: (b.thermal as any)?.temperature_C ?? 0 }));
        const wearProfile = cuttingBlocks.filter(b => b.wear).map(b => ({ id: b.id, remaining_pct: b.wear!.remaining_life_pct }));

        const digitalTwinExport = {
          blocks: enrichedBlocks,
          force_profile: forceProfile,
          thermal_profile: thermalProfile,
          wear_profile: wearProfile,
          stages_summary: stagesSummary,
          timestamp: new Date().toISOString(),
        };

        return {
          data_points_exported: enrichedBlocks.length,
          twin_state: "ready" as const,
          digital_twin_export: digitalTwinExport,
        };
      });
    } else {
      stages.push({
        stage: "6.7_digital_twin", phase: 6, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // Stage 6.8: Output verification — validate generated G-code
    if (outputGcode.length > 10) {
      await _localRunStageAsync("6.8_output_verification", 6, stages, async () => {
        try {
          const eng = await this._getEngine("ppVerify");
          const result = eng.verify({
            gcode: outputGcode,
            controller: machine?.controller ?? input.controller,
            machine_limits: machine ? {
              max_rpm: machine.max_rpm,
              max_feed_mm_min: Math.min(machine.rapid_rate_mm_min.x, machine.rapid_rate_mm_min.y),
              work_volume: machine.work_volume,
            } : undefined,
          });
          const criticals = result.issues.filter((i: any) => i.severity === "critical");
          if (criticals.length > 0) {
            warnings.push(`VERIFY: ${criticals.length} critical issue(s) — ${criticals.map((c: any) => c.message).join("; ")}`);
          }
          return {
            valid: result.valid,
            issues: result.issues.length,
            criticals: criticals.length,
            summary: result.summary,
          };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "6.8_output_verification", phase: 6, status: "skipped", duration_ms: 0, summary: "No output to verify", data: null });
    }

    // ═══ BUILD RESULT ═══

    const overallStatus: StageStatus = stages.some(s => s.status === "fail") ? "fail"
      : stages.some(s => s.status === "warn") ? "warn" : "pass";

    const operations: OperationDef[] = input.operations ?? [{
      id: 0,
      type: "general",
      tool_number: tools[0] ? parseInt(tools[0].id) : 1,
      blocks,
    }];

    return {
      output_gcode: outputGcode,
      stages,
      overall_status: overallStatus,
      total_duration_ms: Date.now() - startTime,
      resolved: {
        machine: machine as MachineContext | undefined,
        material: material as MaterialContext | undefined,
        tools,
        holders,
        coolant,
      },
      blocks,
      operations,
      analytics,
      feature_selection: featureSelectionResult ? {
        selected: (featureSelectionResult.selected_features ?? []).map((f: any) => ({
          id: f.id, name: f.name, score: f.score,
        })),
        rejected: (featureSelectionResult.rejected_features ?? []).map((f: any) => ({
          id: f.id, reason: f.rejection_reason ?? `Score ${f.score} < threshold`,
        })),
        confidence: featureSelectionResult.confidence ?? 0,
        improvements: featureSelectionResult.estimated_improvements ?? {
          cycle_time_pct: 0, surface_quality_pct: 0, tool_life_pct: 0, safety_score: 0,
        },
      } : undefined,
      warnings,
      aggressiveness,
      optimization_target: optTarget,
    };
  }

  /**
   * Run pipeline on existing G-code (Phase B re-optimization).
   * Preserves program structure, replaces S/F values.
   */
  async reoptimize(input: {
    gcode: string;
    material: string;
    iso_group?: ISOGroup;
    machine?: string;
    controller?: ControllerFamily;
    aggressiveness?: number;
    stages?: Partial<StageConfig>;
  }): Promise<PipelineOutput> {
    return this.process({
      gcode: input.gcode,
      material: { name: input.material, iso_group: input.iso_group ?? "P", resolution_confidence: 0.5, id: "reopt" },
      controller: input.controller ?? "fanuc",
      aggressiveness: input.aggressiveness,
      stages: input.stages,
    });
  }

  /**
   * Analyze without generating output G-code (dry run).
   * Returns analytics, stage results, and warnings only.
   */
  async analyze(input: PipelineInput): Promise<PipelineOutput> {
    return this.process({
      ...input,
      stages: {
        ...input.stages,
        gcode_generation: false,
        probe_routines: false,
        setup_sheet: false,
      },
    });
  }

  // ─── Internal Helpers ──────────────────────────────────────────────

  private _parseInput(input: PipelineInput): { blocks: ToolpathBlock[]; tools: Map<number, { diameter_mm?: number }> } {
    if (input.blocks && input.blocks.length > 0) {
      return { blocks: [...input.blocks], tools: new Map() };
    }
    if (input.gcode) {
      return parseGCode(input.gcode);
    }
    if (input.cl_data) {
      return parseCLData(input.cl_data);
    }
    return { blocks: [], tools: new Map() };
  }

  private _resolveContexts(
    input: PipelineInput,
    _parsedTools: Map<number, { diameter_mm?: number }>
  ): {
    machine?: MachineContext;
    material?: MaterialContext;
    tools: ToolContext[];
    holders: HolderContext[];
    coolant?: CoolantContext;
  } {
    // Resolve machine — PP-MOAT-MS0 U01: MachineRegistry wiring
    let machine: MachineContext | undefined;
    if (input.machine && "max_rpm" in input.machine) {
      machine = input.machine as MachineContext;
    } else if (input.machine && "name" in input.machine) {
      const machineName = (input.machine as any).name as string;
      let resolvedController: ControllerFamily = input.controller ?? "fanuc";
      let confidence = 0.3;

      // Step 1: Query MachineRegistry for full machine specs (910 machines)
      try {
        const { machineRegistry } = require("../registries/MachineRegistry.js");
        if (machineRegistry?.isLoaded?.() || machineRegistry?.entries?.size > 0) {
          const regMatch = machineRegistry.getByIdOrModel(machineName);
          if (regMatch) {
            const ctrl = regMatch.controller;
            const controllerFamily = (ctrl?.manufacturer?.toLowerCase() ?? "fanuc") as ControllerFamily;
            const spindle = regMatch.spindle;
            const axes = regMatch.axes ?? [];
            const xAxis = axes.find((a: any) => a.name === "X");
            const yAxis = axes.find((a: any) => a.name === "Y");
            const zAxis = axes.find((a: any) => a.name === "Z");
            const envelope = regMatch.envelope;

            machine = {
              id: regMatch.id ?? "registry",
              name: regMatch.name ?? machineName,
              brand: regMatch.manufacturer ?? "unknown",
              controller: controllerFamily,
              max_rpm: spindle?.max_rpm ?? 12000,
              max_power_kW: spindle?.power_continuous ?? spindle?.power_30min ?? 15,
              max_torque_Nm: spindle?.torque_max,
              rapid_rate_mm_min: {
                x: xAxis?.rapid_rate ?? 30000,
                y: yAxis?.rapid_rate ?? 30000,
                z: zAxis?.rapid_rate ?? 20000,
              },
              work_volume: {
                x: envelope?.x_travel ?? xAxis?.travel ?? 500,
                y: envelope?.y_travel ?? yAxis?.travel ?? 400,
                z: envelope?.z_travel ?? zAxis?.travel ?? 300,
              },
              axes: regMatch.simultaneous_axes ?? (axes.length || 3),
              coolant_types: spindle?.coolant_through ? ["flood", "tsc"] : ["flood"],
              tsc_pressure_bar: spindle?.coolant_pressure,
              tool_change_time_s: regMatch.tool_changer?.change_time,
              resolution_confidence: 1.0,
            };
            resolvedController = controllerFamily;
            confidence = 1.0;
          }
        }
      } catch { /* MachineRegistry not available — fall through to PostProcessorRegistry */ }

      // Step 2: Fallback to PostProcessorRegistry for controller family (if no MachineRegistry match)
      if (!machine) {
        try {
          const { postProcessorRegistry } = require("../registries/PostProcessorRegistry.js");
          if (postProcessorRegistry?.count && postProcessorRegistry.count() > 0) {
            const allPosts = postProcessorRegistry.all();
            const nameLower = machineName.toLowerCase();
            const match = allPosts.find((p: any) =>
              p.machine_examples?.some((m: string) => m.toLowerCase().includes(nameLower)) ||
              p.controller_model?.toLowerCase().includes(nameLower)
            );
            if (match?.controller_family) {
              resolvedController = match.controller_family as ControllerFamily;
              confidence = 0.8;
            }
          }
        } catch { /* PostProcessorRegistry not loaded */ }

        machine = {
          id: "resolved",
          name: machineName,
          brand: "unknown",
          controller: resolvedController,
          max_rpm: 12000,
          max_power_kW: 15,
          rapid_rate_mm_min: { x: 30000, y: 30000, z: 20000 },
          work_volume: { x: 500, y: 400, z: 300 },
          axes: 3,
          resolution_confidence: confidence,
        };
      }
    }

    // Resolve material — PP-MOAT-MS0 U02: MaterialRegistry wiring
    let material: MaterialContext | undefined;
    if (input.material && "iso_group" in input.material && "id" in input.material) {
      material = input.material as MaterialContext;
    } else if (input.material && "name" in input.material) {
      const name = (input.material as any).name as string;
      let resolved = false;

      // Step 1: Query MaterialRegistry for full material properties (2,957 materials)
      try {
        const { materialRegistry } = require("../registries/MaterialRegistry.js");
        if (materialRegistry?.entries?.size > 0) {
          const nameLower = name.toLowerCase().trim();
          for (const entry of materialRegistry.entries.values()) {
            const m = entry?.data;
            if (!m) continue;
            const mName = (m.name ?? m.material_id ?? "").toLowerCase();
            const mId = (m.material_id ?? m.id ?? "").toLowerCase();
            if (mName === nameLower || mId === nameLower || mName.includes(nameLower) || nameLower.includes(mName)) {
              const isoGroup = m.classification?.iso_group ?? m.iso_group ?? this._inferISOGroup(name);
              const mech = m.mechanical ?? {};
              const thermal = m.thermal ?? {};
              const kienzle = m.kienzle ?? m.cutting_data?.kienzle ?? {};
              const jc = m.johnson_cook ?? m.constitutive?.johnson_cook ?? {};
              material = {
                id: m.material_id ?? m.id ?? "registry",
                name: m.name ?? name,
                iso_group: isoGroup,
                kc1_1: kienzle.kc1_1 ?? kienzle.kc11,
                mc: kienzle.mc ?? kienzle.m_c,
                uts_MPa: mech.tensile_strength?.ultimate ?? mech.uts_MPa,
                hardness_HB: mech.hardness?.brinell ?? mech.hardness_HB,
                thermal_conductivity_W_mK: thermal.conductivity ?? thermal.thermal_conductivity,
                specific_heat_J_kgK: thermal.specific_heat ?? thermal.heat_capacity,
                jc_A: jc.A, jc_B: jc.B, jc_n: jc.n, jc_C: jc.C, jc_m: jc.m,
                resolution_confidence: 1.0,
              };
              resolved = true;
              break;
            }
          }
        }
      } catch { /* MaterialRegistry not available */ }

      // Step 2: Fallback to regex ISO inference with canonical Kienzle constants
      if (!resolved) {
        const isoGroup = (input.material as any).iso_group ?? this._inferISOGroup(name);
        material = {
          id: "resolved",
          name,
          iso_group: isoGroup,
          kc1_1: isoGroup ? getCanonicalKc(isoGroup) : undefined,
          mc: isoGroup ? getCanonicalMc(isoGroup) : undefined,
          resolution_confidence: isoGroup ? 0.4 : 0.2,
        };
      }
    }

    // Resolve tools — PP-MOAT-MS0 U03: ToolRegistry wiring
    const resolvedTools: ToolContext[] = [];
    if (input.tools) {
      // Lazy-load ToolRegistry once for all tools
      let toolRegistry: any = null;
      try {
        const reg = require("../registries/ToolRegistry.js");
        toolRegistry = reg.toolRegistry;
      } catch { /* ToolRegistry not available */ }

      for (const t of input.tools) {
        if ("flute_count" in t && "type" in t) {
          resolvedTools.push(t as ToolContext);
        } else {
          const inputDia = (t as any).diameter_mm ?? 10;
          const inputType = (t as any).type;
          const inputId = (t as any).tool_number ?? (t as any).id;
          let resolved = false;

          // Step 1: Try ToolRegistry lookup by diameter + type (95,608 tools)
          if (toolRegistry?.entries?.size > 0) {
            try {
              let bestMatch: any = null;
              let bestDelta = Infinity;
              for (const entry of toolRegistry.entries.values()) {
                const ct = entry?.data;
                if (!ct?.geometry) continue;
                const geom = ct.geometry;
                const diaDelta = Math.abs((geom.diameter ?? 0) - inputDia);
                if (diaDelta > 0.5) continue; // within 0.5mm of requested diameter
                if (inputType && ct.type && !ct.type.toLowerCase().includes(inputType.toLowerCase())) continue;
                if (diaDelta < bestDelta) {
                  bestDelta = diaDelta;
                  bestMatch = ct;
                }
              }
              if (bestMatch) {
                const g = bestMatch.geometry;
                resolvedTools.push({
                  id: String(inputId ?? bestMatch.id ?? resolvedTools.length + 1),
                  type: bestMatch.type ?? "flat_endmill",
                  diameter_mm: g.diameter ?? inputDia,
                  flute_count: g.flutes ?? 4,
                  flute_length_mm: g.flute_length,
                  material: bestMatch.substrate ?? "carbide",
                  helix_angle_deg: g.helix_angle,
                  corner_radius_mm: g.corner_radius,
                  coating: typeof bestMatch.coating === "string" ? bestMatch.coating : bestMatch.coating?.type ?? bestMatch.coating_type,
                  max_Vc_m_min: bestMatch.performance?.max_speed,
                  resolution_confidence: 0.9,
                });
                resolved = true;
              }
            } catch { /* ToolRegistry search failed */ }
          }

          // Step 2: Fallback to diameter-based defaults
          if (!resolved) {
            resolvedTools.push({
              id: String(inputId ?? resolvedTools.length + 1),
              type: inputType ?? "flat_endmill",
              diameter_mm: inputDia,
              flute_count: (t as any).flute_count ?? (inputDia <= 6 ? 3 : inputDia <= 16 ? 4 : 5),
              material: (t as any).material ?? "carbide",
              resolution_confidence: 0.3,
            });
          }
        }
      }
    }

    return {
      machine,
      material,
      tools: resolvedTools,
      holders: (input.holders as HolderContext[]) ?? [],
      coolant: input.coolant,
    };
  }

  private _applySmartDefaults(
    input: PipelineInput,
    machine: MachineContext | undefined,
    material: MaterialContext | undefined,
    tools: ToolContext[],
    blocks: ToolpathBlock[],
    warnings: string[]
  ): Record<string, unknown> {
    const defaults: Record<string, string> = {};

    // Default tolerance
    if (!input.tolerance_mm) {
      (input as any).tolerance_mm = DEFAULT_TOLERANCE_MM;
      defaults.tolerance = `${DEFAULT_TOLERANCE_MM}mm (ISO 2768-m)`;
    }

    // Default surface finish
    if (!input.surface_finish_Ra) {
      (input as any).surface_finish_Ra = DEFAULT_RA_SEMI;
      defaults.surface_finish = `Ra ${DEFAULT_RA_SEMI}μm (semi-finish)`;
    }

    // Default coolant from material
    if (!input.coolant && material) {
      const coolantMap: Record<ISOGroup, CoolantContext> = {
        P: { type: "flood" },
        M: { type: "flood", pressure_bar: 20 },
        K: { type: "mist" },
        N: { type: "mql" },
        S: { type: "flood", pressure_bar: 70 },
        H: { type: "flood", pressure_bar: 40 },
      };
      (input as any).coolant = coolantMap[material.iso_group] ?? { type: "flood" };
      defaults.coolant = (input as any).coolant.type;
    }

    if (Object.keys(defaults).length > 0) {
      warnings.push(`Smart defaults applied: ${Object.entries(defaults).map(([k, v]) => `${k}=${v}`).join(", ")}`);
    }

    return defaults;
  }

  private _buildStageFlags(stages?: Partial<StageConfig>): Record<string, boolean> {
    const s = stages ?? {};
    return {
      feature_selection: s.feature_selection !== false,
      calibration: s.calibration !== false,
      speed_feed: s.speed_feed !== false,
      constitutive: s.constitutive !== false,
      stability_lobes: s.stability_lobes !== false,
      spindle_harmonics: s.spindle_harmonics === true, // opt-in
      engagement_analysis: s.engagement_analysis !== false,
      chip_thinning: s.chip_thinning !== false,
      adaptive_feed: s.adaptive_feed !== false,
      corner_detection: s.corner_detection !== false,
      plunge_detection: s.plunge_detection !== false,
      wear_progression: s.wear_progression !== false,
      thermal_tracking: s.thermal_tracking !== false,
      coupled_thermal_wear: s.coupled_thermal_wear !== false,
      deflection_limit: s.deflection_limit !== false,
      thread_milling_physics: s.thread_milling_physics !== false,
      line_by_line_adaptive: s.line_by_line_adaptive !== false,
      stability_rewrite: s.stability_rewrite !== false,
      toolpath_smoothing: s.toolpath_smoothing === true, // opt-in
      motion_dynamics: s.motion_dynamics === true, // opt-in
      look_ahead: s.look_ahead === true, // opt-in
      coolant_strategy: s.coolant_strategy !== false,
      fixture_check: s.fixture_check === true, // opt-in
      capability_forecast: s.capability_forecast === true, // opt-in
      controller_features: s.controller_features !== false,
      multi_axis: s.multi_axis === true, // opt-in
      machine_error_comp: s.machine_error_comp === true, // opt-in
      safety_analysis: s.safety_analysis !== false,
      playbook_rules: s.playbook_rules !== false,
      tribal_knowledge: s.tribal_knowledge !== false,
      robustness_score: s.robustness_score === true, // opt-in
      energy_optimization: s.energy_optimization === true, // opt-in
      sustainability_lca: s.sustainability_lca === true, // opt-in
      rl_formatting: s.rl_formatting === true, // opt-in
      gcode_generation: s.gcode_generation !== false,
      analytics_report: s.analytics_report !== false,
      cycle_time: s.cycle_time !== false,
      monte_carlo: s.monte_carlo === true, // opt-in (expensive)
      uncertainty_propagation: s.uncertainty_propagation === true, // opt-in
      dimensional_verification: s.dimensional_verification === true, // opt-in
      surface_finish_verification: s.surface_finish_verification === true, // opt-in
      environmental: s.environmental === true, // opt-in
      batch_variability: s.batch_variability === true, // opt-in
      reliability_check: s.reliability_check === true, // opt-in
      acoustic_check: s.acoustic_check === true, // opt-in
      controller_params: s.controller_params === true, // opt-in
      probe_routines: s.probe_routines === true, // opt-in
      setup_sheet: s.setup_sheet === true, // opt-in
      digital_twin: s.digital_twin === true, // opt-in
    };
  }

  private _resolveDefaultAxialDepthMm(
    toolDiameterMm: number,
    operation?: { ap_mm?: number } | null,
  ): number {
    if (operation?.ap_mm != null) return operation.ap_mm;
    // Keep the generic fallback conservative and comparable across tool sizes.
    return Math.min(Math.max(toolDiameterMm * 0.5, 2), 5);
  }

  private _resolveDefaultRadialDepthMm(
    toolDiameterMm: number,
    operation?: { ae_mm?: number } | null,
  ): number {
    if (operation?.ae_mm != null) return operation.ae_mm;
    // Unknown toolpaths should not assume a full high-efficiency roughing stepover.
    return Math.min(Math.max(toolDiameterMm * 0.3, 1), 3);
  }

  private _groupBlocksByTool(blocks: ToolpathBlock[]): Map<number, ToolpathBlock[]> {
    const groups = new Map<number, ToolpathBlock[]>();
    for (const block of blocks) {
      const tn = block.tool_number ?? 0;
      if (!groups.has(tn)) groups.set(tn, []);
      groups.get(tn)!.push(block);
    }
    return groups;
  }

  private _aggressivenessScale(a: number): number {
    // 0.0 → 0.60, 0.5 → 0.85, 1.0 → 1.00
    return 0.60 + a * 0.40;
  }

  private _mapToolType(type: ToolType): string {
    const map: Record<string, string> = {
      flat_endmill: "endmill",
      ball_endmill: "ballnose",
      bull_nose: "bull_nose",
      face_mill: "face_mill",
      drill: "drill",
      tap: "tap",
      reamer: "reamer",
      chamfer: "chamfer",
      boring_bar: "boring_bar",
      insert_mill: "insert_mill",
      thread_mill: "thread_mill",
      slot_drill: "endmill",
    };
    return map[type] ?? "endmill";
  }

  private _mapToolTypeForEngagement(type: ToolType): "flat_endmill" | "ball_endmill" | "bull_nose" {
    if (type === "ball_endmill") return "ball_endmill";
    if (type === "bull_nose") return "bull_nose";
    return "flat_endmill";
  }

  private _inferISOGroup(name: string): ISOGroup {
    const lower = name.toLowerCase();
    if (/alum|6061|7075|2024/.test(lower)) return "N";
    if (/stainless|316|304|303|17-4/.test(lower)) return "M";
    if (/cast.?iron|grey|ductile|ggg/.test(lower)) return "K";
    if (/inconel|hastelloy|waspaloy|nimonic|rene/.test(lower)) return "S";
    if (/hardened|d2|m2|h13|hrc/.test(lower)) return "H";
    return "P"; // Default to general steel
  }

  private _blocksToGCode(blocks: ToolpathBlock[], controller: ControllerFamily): string {
    const lines: string[] = [];
    const isHeidenhain = controller === "heidenhain";
    const isMazak = controller === "mazak";

    // Safe start block
    if (isHeidenhain) {
      lines.push("BEGIN PGM PRISM MM");
    } else {
      lines.push("%");
      lines.push("O0001 (PRISM OPTIMIZED)");
      lines.push("G90 G21 G17 G40 G80");
    }

    let lastTool = -1;
    let lastRpm = -1;
    let lastFeed = -1;

    for (const block of blocks) {
      // Tool change
      if (block.tool_number !== undefined && block.tool_number !== lastTool) {
        lastTool = block.tool_number;
        if (isHeidenhain) {
          lines.push(`TOOL CALL ${lastTool} Z S${block.spindle_rpm ?? 3000}`);
        } else {
          lines.push(`T${lastTool} M6`);
          if (block.spindle_rpm) {
            lines.push(`S${block.spindle_rpm} M3`);
            lastRpm = block.spindle_rpm;
          }
        }
      }

      // Spindle change (without tool change)
      if (block.spindle_rpm && block.spindle_rpm !== lastRpm && !isHeidenhain) {
        lastRpm = block.spindle_rpm;
      }

      // Build move line
      const parts: string[] = [];

      if (isHeidenhain) {
        // Heidenhain format
        if (block.move_type === "G0") {
          parts.push("L");
          if (block.x !== undefined) parts.push(`X${this._fmt(block.x)}`);
          if (block.y !== undefined) parts.push(`Y${this._fmt(block.y)}`);
          if (block.z !== undefined) parts.push(`Z${this._fmt(block.z)}`);
          parts.push("FMAX");
        } else if (block.move_type === "G1") {
          parts.push("L");
          if (block.x !== undefined) parts.push(`X${this._fmt(block.x)}`);
          if (block.y !== undefined) parts.push(`Y${this._fmt(block.y)}`);
          if (block.z !== undefined) parts.push(`Z${this._fmt(block.z)}`);
          if (block.feed_mm_min) parts.push(`F${block.feed_mm_min}`);
        } else if (block.move_type === "G2" || block.move_type === "G3") {
          parts.push(block.move_type === "G2" ? "CC" : "CC");
          // Simplified arc — full Heidenhain arcs need CC + C commands
          if (block.x !== undefined) parts.push(`X${this._fmt(block.x)}`);
          if (block.y !== undefined) parts.push(`Y${this._fmt(block.y)}`);
          if (block.z !== undefined) parts.push(`Z${this._fmt(block.z)}`);
          if (block.feed_mm_min) parts.push(`F${block.feed_mm_min}`);
        }
      } else {
        // ISO format (Fanuc/Haas/Siemens/Mazak/Okuma)
        parts.push(block.move_type);
        if (block.x !== undefined) parts.push(`X${this._fmt(block.x)}`);
        if (block.y !== undefined) parts.push(`Y${this._fmt(block.y)}`);
        if (block.z !== undefined) parts.push(`Z${this._fmt(block.z)}`);
        if (block.move_type === "G2" || block.move_type === "G3") {
          if (block.i !== undefined) parts.push(`I${this._fmt(block.i)}`);
          if (block.j !== undefined) parts.push(`J${this._fmt(block.j)}`);
          if (block.k !== undefined) parts.push(`K${this._fmt(block.k)}`);
          if (block.r !== undefined) parts.push(`R${this._fmt(block.r)}`);
        }
        if (block.spindle_rpm && block.spindle_rpm !== lastRpm) {
          parts.push(`S${block.spindle_rpm}`);
          lastRpm = block.spindle_rpm;
        }
        if (block.move_type !== "G0" && block.feed_mm_min && block.feed_mm_min !== lastFeed) {
          parts.push(`F${block.feed_mm_min}`);
          lastFeed = block.feed_mm_min;
        }
      }

      if (parts.length > 0) {
        // Add optimization comment in debug mode
        const comment = block.optimization?.reasons.length
          ? ` (${block.optimization.reasons[block.optimization.reasons.length - 1]})`
          : "";
        lines.push(parts.join(" ") + comment);
      }
    }

    // Program end
    if (isHeidenhain) {
      lines.push("END PGM PRISM MM");
    } else {
      lines.push("M30");
      lines.push("%");
    }

    return lines.join("\n");
  }

  /**
   * Dialect-aware G-code generation using ControllerDialectEngine
   * Uses controller-specific program headers, tool changes, comments, and arc formats
   */
  private _blocksToGCodeWithDialect(blocks: ToolpathBlock[], dialectEng: any, controllerKey: string, outputMode: "pipeline_optimized" | "self_contained" = "pipeline_optimized"): string {
    const dialect = dialectEng.getDialect(controllerKey);
    const lines: string[] = [];
    const isHeidenhain = dialect.base_family === "heidenhain";

    // Program header from dialect
    lines.push(...dialectEng.getProgramHeader(controllerKey));
    // PPG-VAR-MS0 U08/U09: PRISM header — only in pipeline_optimized mode
    const co = dialect.comment_open ?? "(";
    const cc = dialect.comment_close ?? ")";
    const annotate = outputMode === "pipeline_optimized";
    if (annotate) {
      lines.push(`${co}PRISM Post Processor Pipeline — Physics-Optimized Output${cc}`);
      lines.push(`${co}Controller: ${dialect.display_name ?? controllerKey}${cc}`);
    }
    if (dialect.safe_start) lines.push(dialect.safe_start);

    let lastTool = -1;
    let lastRpm = -1;
    let lastFeed = -1;

    let coolantActive = false;

    for (const block of blocks) {
      // Tool change using dialect-specific sequence (skip phantom tool 0)
      if (block.tool_number !== undefined && block.tool_number !== lastTool && block.tool_number > 0) {
        // Turn off coolant before tool change if active
        if (coolantActive) {
          lines.push(dialect.coolant_off ?? "M9");
          coolantActive = false;
        }
        lastTool = block.tool_number;
        const tcLines = dialectEng.generateToolChange(controllerKey, lastTool, block.spindle_rpm);
        lines.push(...tcLines);
        // Add spindle start after tool change
        if (block.spindle_rpm) {
          if (!isHeidenhain) {
            lines.push(`S${block.spindle_rpm} ${dialect.spindle_cw ?? "M3"}`);
          }
          lastRpm = block.spindle_rpm;
        }
        // Add coolant on before first cut
        if (!coolantActive) {
          lines.push(dialect.coolant_flood ?? "M8");
          coolantActive = true;
        }
      }

      const parts: string[] = [];

      if (isHeidenhain) {
        if (block.move_type === "G0") {
          parts.push("L");
          if (block.x !== undefined) parts.push(`X${this._fmt(block.x)}`);
          if (block.y !== undefined) parts.push(`Y${this._fmt(block.y)}`);
          if (block.z !== undefined) parts.push(`Z${this._fmt(block.z)}`);
          parts.push("FMAX");
        } else if (block.move_type === "G1") {
          parts.push("L");
          if (block.x !== undefined) parts.push(`X${this._fmt(block.x)}`);
          if (block.y !== undefined) parts.push(`Y${this._fmt(block.y)}`);
          if (block.z !== undefined) parts.push(`Z${this._fmt(block.z)}`);
          if (block.feed_mm_min) parts.push(`F${block.feed_mm_min}`);
        } else if (block.move_type === "G2" || block.move_type === "G3") {
          // Heidenhain: CC (center point) then C (arc to endpoint)
          if (block.i !== undefined && block.j !== undefined) {
            const cx = (block.x ?? 0) - (block.i ?? 0); // approximate center
            const cy = (block.y ?? 0) - (block.j ?? 0);
            lines.push(`CC X${this._fmt(cx)} Y${this._fmt(cy)}`);
          }
          const dr = block.move_type === "G2" ? "DR+" : "DR-";
          parts.push("C");
          if (block.x !== undefined) parts.push(`X${this._fmt(block.x)}`);
          if (block.y !== undefined) parts.push(`Y${this._fmt(block.y)}`);
          parts.push(dr);
          if (block.feed_mm_min) parts.push(`F${block.feed_mm_min}`);
        }
      } else if (block.move_type === "drill_cycle" || block.move_type === "tap_cycle") {
        // Canned cycle — translate to controller-native code
        const cycleType = block.move_type === "tap_cycle" ? "tap" : "drill";
        const cycleCode = dialect.canned_cycles?.[cycleType] ?? (cycleType === "tap" ? "G84" : "G81");
        const prefix = dialect.cycle_call_prefix ?? "";
        parts.push(prefix + cycleCode);
        if (block.z !== undefined) parts.push(`Z${this._fmt(block.z)}`);
        if (block.r !== undefined) parts.push(`R${this._fmt(block.r)}`);
        if (block.feed_mm_min) parts.push(`F${block.feed_mm_min}`);
      } else {
        // ISO format — uses dialect for arc format
        parts.push(dialect.rapid_code === "G0" && block.move_type === "G0" ? "G0"
          : block.move_type === "G1" ? "G1"
          : block.move_type === "G2" ? dialect.cw_arc_code
          : block.move_type === "G3" ? dialect.ccw_arc_code
          : block.move_type);
        if (block.x !== undefined) parts.push(`X${this._fmt(block.x)}`);
        if (block.y !== undefined) parts.push(`Y${this._fmt(block.y)}`);
        if (block.z !== undefined) parts.push(`Z${this._fmt(block.z)}`);
        if (block.a !== undefined) parts.push(`A${this._fmt(block.a)}`);
        if (block.b !== undefined) parts.push(`B${this._fmt(block.b)}`);
        if (block.c !== undefined) parts.push(`C${this._fmt(block.c)}`);
        if (block.move_type === "G2" || block.move_type === "G3") {
          if (dialect.arc_format === "r_word" && block.r !== undefined) {
            parts.push(`R${this._fmt(block.r)}`);
          } else {
            if (block.i !== undefined) parts.push(`I${this._fmt(block.i)}`);
            if (block.j !== undefined) parts.push(`J${this._fmt(block.j)}`);
            if (block.k !== undefined) parts.push(`K${this._fmt(block.k)}`);
          }
        }
        if (block.spindle_rpm && block.spindle_rpm !== lastRpm) {
          parts.push(`S${block.spindle_rpm}`);
          lastRpm = block.spindle_rpm;
        }
        if (block.move_type !== "G0" && block.feed_mm_min && block.feed_mm_min !== lastFeed) {
          parts.push(`F${block.feed_mm_min}`);
          lastFeed = block.feed_mm_min;
        }
      }

      if (parts.length > 0) {
        lines.push(parts.join(" "));
        // PPG-VAR-MS0 U08: PRISM physics annotation per cutting block (skip in self_contained mode)
        if (annotate && block.move_type !== "G0" && block.forces && !isHeidenhain) {
          const fc = block.forces.Fc_N?.toFixed(0) ?? "?";
          const pw = block.forces.power_kW?.toFixed(1) ?? "?";
          const life = block.wear?.remaining_life_pct?.toFixed(0) ?? "?";
          lines.push(`${dialect.comment_open ?? "("}PRISM: Fc=${fc}N P=${pw}kW Life=${life}%${dialect.comment_close ?? ")"}`);
        }
        // Wear derating annotation
        if (annotate && block.optimization?.reasons?.length && !isHeidenhain) {
          const reason = block.optimization.reasons[block.optimization.reasons.length - 1];
          if (reason) lines.push(`${dialect.comment_open ?? "("}PRISM: ${reason}${dialect.comment_close ?? ")"}`);
        }
      }
    }

    // Safe shutdown before program end
    if (coolantActive) lines.push(dialect.coolant_off ?? "M9");
    if (!isHeidenhain) lines.push(dialect.spindle_stop ?? "M5");

    // Program footer from dialect
    lines.push(...dialectEng.getProgramFooter(controllerKey));
    return lines.join("\n");
  }

  private _fmt(n: number): string {
    return Number.isInteger(n) ? `${n}.` : n.toFixed(3);
  }

  private _generateAnalytics(blocks: ToolpathBlock[], tools: ToolContext[], machine?: MachineContext): AnalyticsReport {
    const cuttingBlocks = blocks.filter(b => b.move_type !== "G0");
    const forces = cuttingBlocks.filter(b => b.forces).map(b => b.forces!.Fc_N);
    const powers = cuttingBlocks.filter(b => b.forces).map(b => b.forces!.power_kW);

    const cycleTime = this._estimateCycleTime(blocks, machine);

    return {
      per_operation: [{
        operation_id: 0,
        tool_number: tools[0] ? parseInt(tools[0].id) : 1,
        force_range_N: forces.length ? [Math.min(...forces), Math.max(...forces)] : [0, 0],
        power_range_kW: powers.length ? [Math.min(...powers), Math.max(...powers)] : [0, 0],
        temperature_range_C: [200, 600],
        mrr_cm3_min: 0,
        tool_life_consumed_pct: cuttingBlocks[cuttingBlocks.length - 1]?.wear?.remaining_life_pct
          ? 100 - cuttingBlocks[cuttingBlocks.length - 1].wear!.remaining_life_pct : 0,
        cost_per_part_tool: 0,
      }],
      overall: {
        total_cycle_time_s: cycleTime.total_s,
        cutting_time_s: cycleTime.cutting_s,
        non_cutting_time_s: cycleTime.rapid_s + cycleTime.tool_change_s,
        energy_estimate_kWh: powers.length ? (powers.reduce((a, b) => a + b, 0) / powers.length) * cycleTime.cutting_s / 3600 : 0,
        cost_estimate: 0,
      },
      optimization_impact: {
        time_saved_pct: 0,
        force_reduction_pct: 0,
        tool_life_improvement_pct: 0,
        surface_consistency_improvement_pct: 0,
      },
    };
  }

  private _estimateCycleTime(
    blocks: ToolpathBlock[],
    machine?: MachineContext
  ): { total_s: number; cutting_s: number; rapid_s: number; tool_change_s: number } {
    let cutting_s = 0, rapid_s = 0;
    const rapidRate = machine?.rapid_rate_mm_min ?? { x: 30000, y: 30000, z: 20000 };
    const toolChanges = new Set<number>();

    for (let i = 1; i < blocks.length; i++) {
      const prev = blocks[i - 1];
      const curr = blocks[i];
      const dist = Math.sqrt(
        ((curr.x ?? 0) - (prev.x ?? 0)) ** 2 +
        ((curr.y ?? 0) - (prev.y ?? 0)) ** 2 +
        ((curr.z ?? 0) - (prev.z ?? 0)) ** 2
      );
      if (dist === 0) continue;

      if (curr.move_type === "G0") {
        rapid_s += (dist / Math.min(rapidRate.x, rapidRate.y)) * 60;
      } else if (curr.feed_mm_min && curr.feed_mm_min > 0) {
        cutting_s += (dist / curr.feed_mm_min) * 60;
      }

      if (curr.tool_number !== undefined) toolChanges.add(curr.tool_number);
    }

    const tool_change_s = (toolChanges.size - 1) * (machine?.tool_change_time_s ?? 5);

    return {
      total_s: cutting_s + rapid_s + Math.max(0, tool_change_s),
      cutting_s,
      rapid_s,
      tool_change_s: Math.max(0, tool_change_s),
    };
  }

  // Synchronous stage runner
  private _runStage<T>(
    name: string, phase: number, stages: StageResult[],
    fn: () => T
  ): T | null {
    const t0 = Date.now();
    try {
      const result = fn();
      stages.push({
        stage: name,
        phase,
        status: "pass",
        duration_ms: Date.now() - t0,
        summary: typeof result === "object" && result ? JSON.stringify(result).slice(0, 200) : "OK",
        data: result,
      });
      return result;
    } catch (err: any) {
      stages.push({
        stage: name,
        phase,
        status: "fail",
        duration_ms: Date.now() - t0,
        summary: err.message ?? String(err),
        data: null,
      });
      return null;
    }
  }

  // Async stage runner
  private async _runStageAsync<T>(
    name: string, phase: number, stages: StageResult[],
    fn: () => Promise<T>
  ): Promise<T | null> {
    const t0 = Date.now();
    try {
      const result = await fn();
      stages.push({
        stage: name,
        phase,
        status: "pass",
        duration_ms: Date.now() - t0,
        summary: typeof result === "object" && result ? JSON.stringify(result).slice(0, 200) : "OK",
        data: result,
      });
      return result;
    } catch (err: any) {
      stages.push({
        stage: name,
        phase,
        status: "fail",
        duration_ms: Date.now() - t0,
        summary: err.message ?? String(err),
        data: null,
      });
      return null;
    }
  }
}

export const postProcessorPipelineEngine = new PostProcessorPipelineEngineImpl();
export { PostProcessorPipelineEngineImpl };
