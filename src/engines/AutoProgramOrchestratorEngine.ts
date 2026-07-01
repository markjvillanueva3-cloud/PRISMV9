/**
 * AutoProgramOrchestratorEngine — Fusion 360 One-Button CNC Programming
 *
 * 10-stage pipeline that chains 20+ existing PRISM engines to transform
 * a 3D model into a verified CNC program with physics-backed parameters.
 *
 * Pipeline:
 *   S1: Model Intake — connect to Fusion 360, read geometry + status
 *   S2: Feature Recognition — classify holes, pockets, bosses, faces from B-Rep
 *   S3: DFM Analysis — design-for-manufacturability checks + warnings
 *   S4: Process Planning — operation sequencing (dependency-aware, thermal-relaxation)
 *   S5: Tool Selection — physics-scored tool recommendations per feature
 *   S6: Strategy Selection — optimal toolpath strategy per operation
 *   S7: Speed/Feed Optimization — Kienzle/Taylor S/F with per-block variability
 *   S8: CAM Creation — create setups, operations, assign tools in Fusion 360
 *   S9: Verification — safety checks, machine limit validation
 *   S10: Output Package — post-process G-code, setup sheet, cost estimate
 *
 * Physics (from physics/constants.ts):
 *   - Kienzle: Fc = kc1.1 × ap × fz^(1−mc)
 *   - Taylor: T = (C/Vc)^(1/n)
 *   - Deflection: δ = FL³/3EI
 *   - Surface: Ra ≈ fz²/(32×r_nose)
 *
 * @module engines/AutoProgramOrchestratorEngine
 */
import { log } from "../utils/Logger.js";
import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  CANONICAL_TURNING_SPEEDS,
  kienzleForce,
  taylorLife,
  type ISOGroup,
} from "../physics/constants.js";
import type {
  OrchestratorInput as SFOInput,
  OrchestratorResult as SFOResult,
} from "./SpeedFeedOrchestratorEngine.js";
import type {
  VerifyCuttingForces,
  WorkholdingConfig,
  VerificationReport,
} from "./WorkholdingVerificationEngine.js";
import type {
  ClampForceInput,
  ClampForceResult,
  WorkholdingType as WFEType,
} from "./WorkholdingForceEngine.js";

// ── Types ──────────────────────────────────────────────────────────

export type AutoProgramStage =
  | "model_intake"
  | "feature_recognition"
  | "dfm_analysis"
  | "process_planning"
  | "tool_selection"
  | "strategy_selection"
  | "speed_feed_optimization"
  | "cam_creation"
  | "verification"
  | "output_package";

export type WorkholdingType =
  | "vise" | "fixture" | "vacuum" | "magnetic" | "collet" | "chuck"
  | "tombstone" | "soft_jaws" | "pallet" | "angle_plate" | "v_block"
  | "step_clamp" | "toe_clamp" | "4th_axis" | "custom";

/** CNC machine type — determines available operations and kinematics. */
export type MachineType =
  | "vmc_3axis"           // Vertical machining center, 3-axis (X/Y/Z)
  | "hmc_4axis"           // Horizontal machining center with B-axis indexing
  | "five_axis_3plus2"    // 5-axis positional (index + lock)
  | "five_axis_simultaneous" // 5-axis continuous (full NURBS interpolation)
  | "lathe"               // 2-axis turning center (X/Z, optional C)
  | "mill_turn"           // Mill-turn with live tooling (sub-spindle, B-axis)
  | "wire_edm";           // Wire EDM (U/V + X/Y, taper capable)

/**
 * 5-axis kinematic model — determines rotary axis arrangement, limits,
 * and singularity zones. Ref: Bohez (2002) "5-axis milling machine tool
 * kinematic chain design and analysis", Intl J of Adv Mfg Tech 19(1).
 */
export type KinematicModel =
  | "trunnion_table"   // A/C table rotation (Okuma MU, DMG MORI DMU monoBLOCK)
  | "swivel_head"      // A/C head tilt (Hermle C-series, some DMG)
  | "fork_head"        // B/C head (Heidenhain-controlled, some Hermle)
  | "mixed";           // A/B head + C table (rare, custom)

export const STAGE_ORDER: AutoProgramStage[] = [
  "model_intake",
  "feature_recognition",
  "dfm_analysis",
  "process_planning",
  "tool_selection",
  "strategy_selection",
  "speed_feed_optimization",
  "cam_creation",
  "verification",
  "output_package",
];

export interface AutoProgramInput {
  /** Material name or ISO group (e.g., "6061-T6" or "N") */
  material: string;
  /** ISO group override (P/M/K/N/S/H) */
  iso_group?: ISOGroup;
  /** Machine identifier from MachineRegistry */
  machine?: string;
  /** Max spindle RPM (fallback if no machine specified) */
  max_rpm?: number;
  /** Max spindle power kW (fallback) */
  max_power_kw?: number;
  /** Target surface finish Ra µm (default: 1.6) */
  target_ra_um?: number;
  /** Production mode: optimize for cycle time vs tool life vs quality */
  optimize_for?: "time" | "quality" | "tool_life";
  /** Batch size (affects tool life optimization) */
  batch_size?: number;
  /** CPS post-processor file path (for G-code output) */
  post_processor_path?: string;
  /** Program number (e.g., "O1001") */
  program_name?: string;
  /** Output folder for G-code */
  output_folder?: string;
  /** Output units: mm or inch */
  output_units?: "mm" | "inch";
  /** Resume from this stage if a previous run checkpointed */
  resume_from_stage?: AutoProgramStage;
  /** Fusion 360 bridge URL (default: http://127.0.0.1:18360) */
  fusion_url?: string;
  /** Skip stages (e.g., skip dfm_analysis for quick runs) */
  skip_stages?: AutoProgramStage[];
  /** CNC machine type (default: "vmc_3axis") — determines operation routing and kinematics */
  machine_type?: MachineType;
  /** Inject features directly (bypasses S2 feature recognition). For testing and API use. */
  inject_features?: RecognizedFeature[];
  /** 5-axis kinematic model (auto-detected from machine registry if omitted) */
  kinematic_model?: KinematicModel;
  /** Workholding type (default: "vise") — affects S7 feed limits and S9 clamping verification */
  workholding_type?: WorkholdingType;
  /** Workholding stiffness override (auto-detected from type if omitted) */
  workholding_stiffness?: "low" | "medium" | "high";
  /** Clamping force in kN (auto-estimated from workholding type if omitted) */
  clamping_force_kN?: number;
}

export interface RecognizedFeature {
  type: string;
  dimensions: Record<string, number>;
  position?: { x: number; y: number; z: number };
  /** Surface normal vector — used for 5-axis work plane computation. */
  normal?: { x: number; y: number; z: number };
  confidence: number;
  face_indices: number[];
}

export interface ToolRecommendation {
  tool_id?: string;
  tool_type: string;
  diameter_mm: number;
  flute_count: number;
  flute_length_mm: number;
  overall_length_mm: number;
  corner_radius_mm: number;
  coating?: string;
  score: number;
  rationale: string;
}

export interface PlannedOperation {
  sequence: number;
  feature_index: number;
  operation_type: string;
  tool: ToolRecommendation;
  strategy: string;
  speed_rpm: number;
  feed_mm_min: number;
  doc_mm: number;
  woc_mm: number;
  estimated_time_min: number;
  /** Physics from SpeedFeedOrchestratorEngine (full Kienzle w/ K_gamma, K_kappa, K_wear, K_vc, K_coolant) */
  cutting_force_N?: number;
  power_kw?: number;
  torque_Nm?: number;
  tool_life_min?: number;
  surface_finish_Ra_um?: number;
  deflection_um?: number;
  mrr_cm3_min?: number;
  /** Orchestrator confidence 0–1 (weighted aggregate across 8 resolvers) */
  confidence?: number;
  /** Lathe spindle mode: G96 (CSS) or G97 (constant RPM). Present for turning ops only. */
  spindle_mode?: SpindleMode;
  /** G96 CSS surface speed in m/min (present when spindle_mode="G96") */
  css_surface_speed_m_min?: number;
  /** G50 max RPM clamp for CSS mode (present when spindle_mode="G96") */
  max_rpm_clamp?: number;
  /** Fixed RPM for G97 mode (present when spindle_mode="G97") */
  fixed_rpm?: number;
  /** Wire EDM: wire travel speed in m/min */
  wire_speed_m_min?: number;
  /** Wire EDM: wire tension in Newtons */
  wire_tension_N?: number;
  /** Wire EDM: flushing pressure in bar */
  flushing_pressure_bar?: number;
  /** Wire EDM: UV offset for taper cuts (mm) */
  uv_offset_mm?: number;
  /** Mill-turn: channel assignment (C1=main, C2=sub, Cm=milling) */
  channel_id?: string;
  /** Mill-turn: spindle assignment (main/sub/milling) */
  spindle_id?: string;
  /** Lathe G96: calculated RPM at OD before clamp */
  calculated_rpm_at_od?: number;
  /** Wire EDM: pass type in multi-cut sequence (rough → trim → skim) */
  edm_pass_type?: "rough" | "trim" | "skim";
  /** Wire EDM: 0-based index within multi-cut sequence for this feature */
  edm_pass_index?: number;
  /** Setup index for multi-setup programs (0=Op1, 1=Op2, ...) */
  setup_index?: number;
  /** Mill-turn: sync M-code to execute BEFORE this operation (channel handshake) */
  sync_before?: string;
  /** Mill-turn: sync M-code to execute AFTER this operation (channel handshake) */
  sync_after?: string;
  /** Turning: approach pattern type for this operation */
  approach_type?: "rapid_xy" | "feed_angle" | "plunge" | "thread_start" | "none";
  /** Turning: retract pattern type after cut completes */
  retract_type?: "rapid_45deg" | "rapid_x" | "rapid_z" | "spring_pass" | "peck_retract" | "none";
  /** Multi-pass roughing: number of passes to reach full depth */
  pass_count?: number;
  /** Multi-pass roughing: depth per individual pass (mm) */
  depth_per_pass_mm?: number;
}

export interface StageResult {
  stage: AutoProgramStage;
  stage_index: number;
  success: boolean;
  duration_ms: number;
  data: Record<string, unknown>;
  warnings: string[];
  errors: string[];
  engines_used: string[];
}

export interface AutoProgramResult {
  success: boolean;
  pipeline_id: string;
  total_duration_ms: number;
  stages_completed: number;
  stages_total: number;
  stage_results: StageResult[];
  /** Final output — only present if all stages succeed */
  output?: {
    features_found: number;
    operations_planned: number;
    tools_selected: number;
    dfm_issues: number;
    dfm_score: number;
    program_name: string;
    gcode_file?: string;
    gcode_lines?: number;
    setup_sheet?: string;
    estimated_cycle_time_min: number;
    estimated_cost_per_part?: number;
    confidence: number;
  };
  /** Stage that failed (if any) */
  failed_stage?: AutoProgramStage;
  error?: string;
}

// ── Engine ──────────────────────────────────────────────────────────

/**
 * Lazy imports prevent circular dependency issues and reduce startup cost.
 * Each stage loads only the engines it needs.
 */
async function loadBridge() {
  const m = await import("./Fusion360LiveBridgeEngine.js");
  return m.Fusion360LiveBridgeEngine;
}

async function loadFeatureRecognition() {
  const m = await import("./FeatureRecognitionEngine.js");
  return m.FeatureRecognitionEngine;
}

async function loadDFMPipeline() {
  const m = await import("./DFMPipelineEngine.js");
  return m.dfmPipelineEngine;
}

async function loadOperationSequencer() {
  const m = await import("./OperationSequencerEngine.js");
  return m.OperationSequencerEngine;
}

async function loadToolSelector() {
  const m = await import("./SmartToolSelectorEngine.js");
  return m.smartToolSelectorEngine;
}

async function loadStrategySelector() {
  const m = await import("./OptimalStrategySelectionEngine.js");
  return m.OptimalStrategySelectionEngine;
}

async function loadSpeedFeedOrchestrator() {
  const m = await import("./SpeedFeedOrchestratorEngine.js");
  return m.SpeedFeedOrchestratorEngine;
}

async function loadSetupSheet() {
  const m = await import("./SetupSheetEngine.js");
  return m.setupSheetEngine;
}

/** Resolve ISO group from material name. */
function resolveIsoGroup(material: string, override?: ISOGroup): ISOGroup {
  if (override) return override;
  const m = material.toLowerCase();
  // Common material patterns → ISO group
  if (/aluminum|aluminium|6061|7075|2024/.test(m)) return "N";
  if (/stainless|304|316|17-4|inox/.test(m)) return "M";
  if (/steel|4140|4340|1018|1045|8620/.test(m)) return "P";
  if (/cast.?iron|gray.?iron|ductile/.test(m)) return "K";
  if (/titanium|ti-6|ti6al4v/.test(m)) return "S";
  if (/inconel|hastelloy|waspaloy|rene/.test(m)) return "S";
  if (/hardened|hrc.?[4-6]/.test(m)) return "H";
  return "P"; // default to steel
}

/** Default workholding stiffness per type. */
const WORKHOLDING_STIFFNESS: Record<WorkholdingType, "low" | "medium" | "high"> = {
  vise: "high", fixture: "high", vacuum: "low", magnetic: "low",
  collet: "medium", chuck: "high", tombstone: "high", soft_jaws: "high",
  pallet: "high", angle_plate: "medium", v_block: "medium",
  step_clamp: "medium", toe_clamp: "medium", "4th_axis": "medium", custom: "medium",
};

/** Default clamping force estimates per type (kN). Synced with SpeedFeedOrchestratorEngine WORKHOLDING_DB for shared types. */
const WORKHOLDING_DEFAULT_FORCE_KN: Record<WorkholdingType, number> = {
  vise: 30, fixture: 50, vacuum: 5, magnetic: 8,
  collet: 20, chuck: 40, tombstone: 50, soft_jaws: 30,
  pallet: 50, angle_plate: 30, v_block: 15,
  step_clamp: 20, toe_clamp: 15, "4th_axis": 40, custom: 25,
};

/** Map extended workholding types to SpeedFeedOrchestratorEngine's accepted types. */
const WORKHOLDING_TO_SFO: Record<WorkholdingType, SFOInput["workholding_type"]> = {
  vise: "vise", fixture: "fixture", vacuum: "vacuum", magnetic: "magnetic",
  collet: "collet", chuck: "chuck", tombstone: "tombstone", soft_jaws: "vise",
  pallet: "fixture", angle_plate: "fixture", v_block: "fixture",
  step_clamp: "fixture", toe_clamp: "fixture", "4th_axis": "chuck", custom: "fixture",
};

/**
 * Map AutoProgram workholding types → WorkholdingVerificationEngine types.
 * Ref: Nee et al. "Advanced Fixture Design" (2004), Hoffman 5th ed.
 */
const WORKHOLDING_TO_VERIFY: Record<WorkholdingType, WorkholdingConfig["type"]> = {
  vise: "vise", fixture: "fixture_plate", vacuum: "vacuum", magnetic: "magnetic",
  collet: "collet", chuck: "3_jaw_chuck", tombstone: "fixture_plate", soft_jaws: "vise",
  pallet: "fixture_plate", angle_plate: "fixture_plate", v_block: "fixture_plate",
  step_clamp: "fixture_plate", toe_clamp: "fixture_plate", "4th_axis": "3_jaw_chuck", custom: "fixture_plate",
};

/**
 * Map AutoProgram workholding types → WorkholdingForceEngine types.
 * Ref: Carr Lane workholding guide, SME Ch.8
 */
const WORKHOLDING_TO_FORCE: Record<WorkholdingType, WFEType> = {
  vise: "vise", fixture: "fixture_plate", vacuum: "vacuum", magnetic: "magnetic",
  collet: "chuck_3jaw", chuck: "chuck_3jaw", tombstone: "fixture_plate", soft_jaws: "vise",
  pallet: "fixture_plate", angle_plate: "fixture_plate", v_block: "fixture_plate",
  step_clamp: "fixture_plate", toe_clamp: "fixture_plate", "4th_axis": "chuck_3jaw", custom: "fixture_plate",
};

/**
 * Allowed milling/turning/EDM operations per machine type.
 * Operations not in the list for a given machine type are filtered out in S4.
 */
const MACHINE_ALLOWED_OPS: Record<MachineType, Set<string>> = {
  vmc_3axis: new Set([
    "face_mill", "adaptive_clear", "pocket_2d", "contour_2d", "drill_peck",
    "bore", "ream", "tap", "chamfer", "slot", "engrave", "trochoidal",
  ]),
  hmc_4axis: new Set([
    "face_mill", "adaptive_clear", "pocket_2d", "contour_2d", "drill_peck",
    "bore", "ream", "tap", "chamfer", "slot", "engrave", "trochoidal",
    "indexed_4axis",
  ]),
  five_axis_3plus2: new Set([
    "face_mill", "adaptive_clear", "pocket_2d", "contour_2d", "drill_peck",
    "bore", "ream", "tap", "chamfer", "slot", "engrave", "trochoidal",
    "indexed_5axis", "swarf", "multiaxis_contour",
  ]),
  five_axis_simultaneous: new Set([
    "face_mill", "adaptive_clear", "pocket_2d", "contour_2d", "drill_peck",
    "bore", "ream", "tap", "chamfer", "slot", "engrave", "trochoidal",
    "indexed_5axis", "swarf", "multiaxis_contour", "flow_cut", "blade_machining",
    "impeller", "port_machining",
  ]),
  lathe: new Set([
    "turning_rough", "turning_finish", "turning_groove", "turning_thread",
    "turning_part_off", "turning_bore", "turning_face", "turning_drill",
  ]),
  mill_turn: new Set([
    "face_mill", "adaptive_clear", "pocket_2d", "contour_2d", "drill_peck",
    "bore", "ream", "tap", "chamfer", "trochoidal",
    "turning_rough", "turning_finish", "turning_groove", "turning_thread",
    "turning_part_off", "turning_bore", "turning_face", "turning_drill",
    "live_tool_mill", "sub_spindle_transfer",
  ]),
  wire_edm: new Set([
    "wire_profile", "wire_no_core", "wire_4axis_taper", "wire_open_pocket",
  ]),
};

/** Default machine RPM/power limits by machine type when not specified */
const MACHINE_DEFAULTS: Record<MachineType, { max_rpm: number; max_power_kw: number }> = {
  vmc_3axis: { max_rpm: 10000, max_power_kw: 15 },
  hmc_4axis: { max_rpm: 12000, max_power_kw: 22 },
  five_axis_3plus2: { max_rpm: 12000, max_power_kw: 18 },
  five_axis_simultaneous: { max_rpm: 15000, max_power_kw: 25 },
  lathe: { max_rpm: 4000, max_power_kw: 22 },
  mill_turn: { max_rpm: 6000, max_power_kw: 22 },
  wire_edm: { max_rpm: 0, max_power_kw: 0 },
};

/**
 * Rotary axis travel limits per kinematic model (degrees).
 * Ref: Bohez (2002), machine-specific data from Okuma/DMG/Hermle catalogs.
 * singularity_zone_deg: when primary tilt axis is within this angle of 0°,
 * C-axis velocity → ∞ for trunnion/swivel, causing tracking errors.
 */
const KINEMATIC_LIMITS: Record<KinematicModel, {
  primary: { axis: string; min_deg: number; max_deg: number };
  secondary: { axis: string; min_deg: number; max_deg: number };
  singularity_zone_deg: number;
}> = {
  trunnion_table: {
    primary:   { axis: "A", min_deg: -120, max_deg: 30 },
    secondary: { axis: "C", min_deg: -360, max_deg: 360 },
    singularity_zone_deg: 5,
  },
  swivel_head: {
    primary:   { axis: "A", min_deg: -110, max_deg: 110 },
    secondary: { axis: "C", min_deg: -360, max_deg: 360 },
    singularity_zone_deg: 5,
  },
  fork_head: {
    primary:   { axis: "B", min_deg: -110, max_deg: 110 },
    secondary: { axis: "C", min_deg: -360, max_deg: 360 },
    singularity_zone_deg: 5,
  },
  mixed: {
    primary:   { axis: "A", min_deg: -90, max_deg: 90 },
    secondary: { axis: "B", min_deg: -90, max_deg: 90 },
    singularity_zone_deg: 3,
  },
};

/**
 * 5-axis feature-to-operation mapping.
 * Each feature type maps to a preferred operation for simultaneous 5-axis and
 * a fallback for 3+2 (indexed) mode. This governs S4 routing when machType
 * starts with "five_axis_".
 * Ref: Fang & Luo (2019) "Tool orientation optimization for 5-axis NC machining",
 * Intl J of Mach Tools & Mfg 135.
 */
const FIVE_AXIS_FEATURE_MAP: Record<string, {
  simultaneous: string;
  indexed: string;
}> = {
  undercut:             { simultaneous: "swarf",             indexed: "indexed_5axis" },
  freeform_surface:     { simultaneous: "flow_cut",          indexed: "multiaxis_contour" },
  blade:                { simultaneous: "blade_machining",   indexed: "indexed_5axis" },
  impeller_vane:        { simultaneous: "impeller",          indexed: "indexed_5axis" },
  port_entry:           { simultaneous: "port_machining",    indexed: "indexed_5axis" },
  compound_angle_pocket:{ simultaneous: "indexed_5axis",     indexed: "indexed_5axis" },
  deep_cavity:          { simultaneous: "flow_cut",          indexed: "indexed_5axis" },
  sculptured_surface:   { simultaneous: "flow_cut",          indexed: "multiaxis_contour" },
};

/**
 * Lathe spindle mode per turning operation.
 * G96 = Constant Surface Speed (CSS): spindle RPM varies with diameter to maintain
 *   constant Vc (m/min). Used for OD/ID/face operations where diameter changes.
 *   Requires G50 S[max] clamp to prevent over-speed near center.
 * G97 = Constant RPM: fixed spindle speed. Used for threading (sync required),
 *   drilling (constant chip load), and part-off (stable exit).
 * Ref: Sandvik Coromant "Turning" handbook, Machinery's Handbook 31st ed. §23.
 */
export type SpindleMode = "G96" | "G97";

const TURNING_SPINDLE_MODE: Record<string, SpindleMode> = {
  turning_rough:    "G96",   // CSS — diameter changes during profiling
  turning_finish:   "G96",   // CSS — constant surface finish across diameters
  turning_bore:     "G96",   // CSS — ID diameter changes during boring
  turning_face:     "G96",   // CSS — diameter sweeps from OD to center
  turning_groove:   "G96",   // CSS — slight diameter variation in groove
  turning_thread:   "G97",   // Constant RPM — spindle sync required for thread pitch
  turning_drill:    "G97",   // Constant RPM — axial drilling, fixed diameter
  turning_part_off: "G97",   // Constant RPM — stable chip control at cutoff
};

/**
 * Wire EDM multi-cut pass parameters.
 * Each pass uses decreasing wire offset, speed, and tension for progressively
 * better surface finish and dimensional accuracy.
 * Ref: Mitsubishi MV2400R technology tables, AgieCharmilles CUT E 600 manual,
 * Sodick VL600QH user guide.
 *
 * Pass selection by target Ra:
 *   Ra ≥ 3.2 µm → 1 rough only
 *   Ra ≥ 1.6 µm → 1 rough + 1 trim (2 passes)
 *   Ra ≥ 0.8 µm → 1 rough + 2 trim (3 passes)
 *   Ra < 0.8 µm → 1 rough + 2 trim + 1 skim (4 passes)
 */
const EDM_MULTI_CUT_TABLE: Array<{
  pass_type: "rough" | "trim" | "skim";
  wire_offset_mm: number;
  wire_speed_m_min: number;
  wire_tension_N: number;
  flushing_pressure_bar: number;
}> = [
  { pass_type: "rough", wire_offset_mm: 0.17, wire_speed_m_min: 12, wire_tension_N: 15, flushing_pressure_bar: 6 },
  { pass_type: "trim",  wire_offset_mm: 0.10, wire_speed_m_min: 8,  wire_tension_N: 10, flushing_pressure_bar: 3 },
  { pass_type: "trim",  wire_offset_mm: 0.08, wire_speed_m_min: 5,  wire_tension_N: 8,  flushing_pressure_bar: 2 },
  { pass_type: "skim",  wire_offset_mm: 0.015, wire_speed_m_min: 3,  wire_tension_N: 5,  flushing_pressure_bar: 1 },
];

/**
 * Determine number of EDM multi-cut passes from target surface finish.
 * Ref: Mitsubishi MV2400R Operator Manual, Section 4.3 "Surface Finish vs Number of Cuts".
 *
 * Boundary semantics: targetRa is the DESIRED finish. A given pass count achieves
 * approximately that Ra. Values are inclusive lower bounds — Ra=1.6 gets 2 passes
 * (achieves ~1.6 µm), Ra=1.5 needs 3 passes (to reach below 1.6 µm).
 */
function edmPassCountForRa(targetRa: number): number {
  if (targetRa >= 3.2) return 1;  // rough only → Ra ~3.2 µm
  if (targetRa >= 1.6) return 2;  // rough + 1 trim → Ra ~1.6 µm
  if (targetRa >= 0.8) return 3;  // rough + 2 trim → Ra ~0.8 µm
  return 4;                        // rough + 2 trim + skim → Ra ~0.4 µm
}

/**
 * Turning approach/retract patterns per operation type.
 *
 * Each turning operation requires a specific approach geometry to avoid
 * collisions and a retract pattern that ensures clean chip break and
 * tool clearance. The patterns account for:
 *   - Approach clearance: distance from workpiece before engaging
 *   - Retract direction: 45° for OD (chip break), X-only for bore, etc.
 *   - Multi-pass depth splitting for deep roughing
 *
 * Ref: Sandvik Coromant "Turning" Handbook §3 "Tool Path Strategies",
 * Mitsubishi "Turning Tips" Application Guide, Kennametal Lathe Programming.
 */
const TURNING_APPROACH_RETRACT: Record<string, {
  approach: PlannedOperation["approach_type"];
  retract: PlannedOperation["retract_type"];
  /** Maximum DOC per pass (mm). Deep features split into multiple passes. */
  max_doc_per_pass_mm: number;
  /** Approach clearance distance (mm) above/beside workpiece */
  clearance_mm: number;
}> = {
  turning_rough: {
    approach: "rapid_xy",     // rapid to X+2 Z+2, then feed engage
    retract: "rapid_45deg",   // 45° retract for chip break (ISO 3685 recommended)
    max_doc_per_pass_mm: 4.0, // conservative roughing DOC limit
    clearance_mm: 2.0,
  },
  turning_finish: {
    approach: "feed_angle",   // approach at feed rate, tangential entry
    retract: "spring_pass",   // spring pass: repeat last cut at zero DOC for Ra
    max_doc_per_pass_mm: 0.5, // single light pass typical
    clearance_mm: 1.0,
  },
  turning_bore: {
    approach: "rapid_xy",     // rapid X to bore center, Z to entry
    retract: "rapid_x",      // retract X-only to clear bore wall
    max_doc_per_pass_mm: 2.0, // boring: conservative due to deflection
    clearance_mm: 2.0,
  },
  turning_face: {
    approach: "rapid_xy",     // rapid to OD+2mm, Z+1mm
    retract: "rapid_z",      // retract Z-only after face pass
    max_doc_per_pass_mm: 3.0,
    clearance_mm: 2.0,
  },
  turning_groove: {
    approach: "plunge",       // plunge radially into groove
    retract: "peck_retract",  // peck: plunge, retract, plunge deeper
    max_doc_per_pass_mm: 2.0, // groove width determines actual DOC
    clearance_mm: 1.0,
  },
  turning_thread: {
    approach: "thread_start", // position at thread start Z, compound infeed 29.5°
    retract: "rapid_x",      // rapid X retract at thread end
    max_doc_per_pass_mm: 0.3, // thread depth per pass decreases (compound infeed)
    clearance_mm: 3.0,       // extra clearance for thread lead-in
  },
  turning_part_off: {
    approach: "plunge",       // radial plunge into part
    retract: "peck_retract",  // peck cycle for deep part-off (avoid chip welding)
    max_doc_per_pass_mm: 3.0,
    clearance_mm: 1.0,
  },
  turning_drill: {
    approach: "rapid_xy",     // rapid to Z+2, X centered
    retract: "rapid_z",      // peck drill retract along Z
    max_doc_per_pass_mm: 5.0, // drill peck depth
    clearance_mm: 2.0,
  },
};

/**
 * Compute multi-pass roughing split for turning operations.
 * When total depth exceeds max_doc_per_pass, splits into multiple passes
 * with equal depth distribution.
 *
 * Returns pass_count and depth_per_pass_mm for the operation.
 * Ref: Sandvik Coromant "Number of Passes" calculation, ISO 3685 §4.2.
 */
function computeTurningPasses(
  opType: string,
  totalDepth: number,
): { pass_count: number; depth_per_pass_mm: number } {
  const pattern = TURNING_APPROACH_RETRACT[opType];
  if (!pattern) {
    return { pass_count: 1, depth_per_pass_mm: totalDepth };
  }

  const maxDoc = pattern.max_doc_per_pass_mm;
  if (totalDepth <= maxDoc) {
    return { pass_count: 1, depth_per_pass_mm: totalDepth };
  }

  // Thread: compound infeed reduces per-pass depth (29.5° infeed angle)
  // Each successive pass cuts less: d_n = d_total × sqrt(n/N) - sqrt((n-1)/N)
  // For simplicity, use equal depth split here; real post-processor handles infeed.
  const passCount = Math.ceil(totalDepth / maxDoc);
  const depthPerPass = Math.round((totalDepth / passCount) * 1000) / 1000;
  return { pass_count: passCount, depth_per_pass_mm: depthPerPass };
}

/**
 * Mill-turn channel synchronization M-codes (PRISM-defined).
 * Multi-channel CNC machines require explicit sync points so that
 * operations on different spindles/channels don't collide.
 *
 * Sync semantics: a "wait" code blocks the current channel until the
 * paired channel reaches its matching wait. This ensures handoff safety
 * (e.g., main spindle stops before sub-spindle grabs the part).
 *
 * Note: M200-M299 are PRISM planning codes, not a specific controller standard.
 * Real machines use controller-specific equivalents:
 *   Mazak: M301-M307 (varies by controller model)
 *   Siemens 840D: WAITM(channel, mark_number)
 *   Fanuc: custom M-codes per machine builder (typically M200+ range)
 * The post-processor maps these to the actual machine's sync dialect.
 *
 * Ref: Mazak Integrex programming concepts §12, DMG MORI NTX §8,
 * Siemens 840D WAITM manual — for sync SEMANTICS (not exact codes).
 */
const MILL_TURN_SYNC_CODES = {
  /** Before sub-spindle transfer: main must stop, part-off complete */
  pre_transfer:  { code: "M200", comment: "SYNC: WAIT FOR MAIN SPINDLE STOP BEFORE TRANSFER" },
  /** After sub-spindle grabs part: confirm grip before main releases */
  post_transfer: { code: "M201", comment: "SYNC: SUB-SPINDLE GRIP CONFIRMED" },
  /** C1↔Cm boundary: pause turning while live tool engages */
  milling_start: { code: "M202", comment: "SYNC: MAIN SPINDLE ORIENT FOR LIVE TOOL" },
  /** Cm→C1 return: milling done, resume turning */
  milling_end:   { code: "M203", comment: "SYNC: LIVE TOOL RETRACTED, RESUME TURNING" },
  /** End of all channels: final sync before program end */
  program_end:   { code: "M299", comment: "SYNC: ALL CHANNELS COMPLETE" },
} as const;

/**
 * 5-axis collision zone thresholds per kinematic model.
 * When the required tilt angle falls within the singularity zone, C-axis
 * velocity → ∞ for smooth interpolation, causing servo tracking errors and
 * potential tool/fixture collision. Operations within these zones need either
 * a work-plane reorientation or a switch to 3+2 (indexed) mode.
 *
 * tool_clearance_mm: minimum distance from tool tip to rotary table/trunnion
 * at max tilt. Varies by machine envelope — values here are conservative
 * defaults for mid-size 5-axis machines (500mm table class).
 *
 * Ref: Bohez (2002) §4.3 "Singularity avoidance", Siemens 840D TRAORI
 * manual §6.2, DMG MORI DMU 50 operator handbook.
 */
const FIVE_AXIS_COLLISION_ZONE = {
  /** Minimum safe distance from rotary center at max tilt (mm).
   *  Conservative for 500mm table class; production should query MachineRegistry. */
  min_table_clearance_mm: 25,
  /** Angular margin from axis limit before warning (degrees) */
  axis_limit_margin_deg: 5,
  /** Max tool stick-out before 5-axis collision risk escalates (mm).
   *  First-pass geometric filter; full deflection analysis in S7 (toolDeflection). */
  max_safe_tool_stickout_mm: 150,
} as const;

/**
 * Lathe tailstock safety parameters.
 * Tailstock is used for center support on long parts (L/D > 3).
 * Operations must maintain clearance from the tailstock face to avoid
 * tool-tailstock collision, and Z-axis travel must account for tailstock
 * presence when positioning.
 *
 * Ref: Sandvik Coromant "Turning" Handbook §1.5 "Workholding",
 * Haas Lathe Operator's Manual §6.3 "Tailstock Clearance".
 */
const LATHE_TAILSTOCK_DEFAULTS = {
  /** Minimum clearance between tool and tailstock face (mm) */
  min_clearance_mm: 10,
  /** L/D ratio threshold above which tailstock is assumed present.
   *  ISO 7960 standard = 3.0. Material-dependent: hardened steel ≈ 2.5,
   *  non-ferrous ≈ 4.0. Future: query CANONICAL_MATERIAL_DB for hardness. */
  ld_ratio_threshold: 3,
  /** Safe retract Z position relative to tailstock (mm) */
  retract_clearance_mm: 5,
} as const;

/**
 * Mill-turn interference check zones.
 * Multi-channel mill-turn operations risk collision when:
 *   1. Turning and milling ops overlap in Z without sync codes
 *   2. Sub-spindle transfer occurs without main spindle stop
 *   3. Live tooling engages while main spindle is still rotating
 *
 * Ref: Mazak Integrex e-Tower operator notes, DMG MORI NTX collision
 * avoidance §3, Siemens 840D collision monitoring (COLL_MONITOR).
 */
const MILL_TURN_INTERFERENCE = {
  /** Minimum Z gap between simultaneous channel operations (mm) */
  min_z_separation_mm: 50,
  /** Sub-spindle transfer requires both pre and post sync codes */
  transfer_requires_sync: true,
  /** Milling channel requires main spindle orientation (C-axis lock) */
  milling_requires_orient: true,
} as const;

/**
 * Cycle time estimation parameters per machine type.
 * Each parameter set includes fixed overhead times and rapid traverse rates
 * that vary by machine class. These feed into the estimateCycleTime() method.
 *
 * setup_time_min: one-time setup (fixture, workpiece, alignment).
 * tool_change_sec: per-tool ATC swap (chip-to-chip for VMC/HMC, turret index for lathe).
 * rapid_rate_mm_min: machine rapid traverse rate (G00).
 * pallet_change_sec: only for HMC with pallet changer.
 *
 * Ref: Haas CNC Machine Specifications (2024), Mazak Quick Turn specifications,
 * DMG MORI NTX data sheets, Mitsubishi MV2400R EDM specs.
 */
const CYCLE_TIME_PARAMS: Record<MachineType, {
  setup_time_min: number;
  tool_change_sec: number;
  rapid_rate_mm_min: number;
  pallet_change_sec: number;
}> = {
  vmc_3axis:              { setup_time_min: 15, tool_change_sec: 4.5, rapid_rate_mm_min: 30000, pallet_change_sec: 0 },
  hmc_4axis:              { setup_time_min: 12, tool_change_sec: 3.8, rapid_rate_mm_min: 36000, pallet_change_sec: 8 },
  five_axis_3plus2:       { setup_time_min: 20, tool_change_sec: 5.0, rapid_rate_mm_min: 30000, pallet_change_sec: 0 },
  five_axis_simultaneous: { setup_time_min: 25, tool_change_sec: 5.0, rapid_rate_mm_min: 24000, pallet_change_sec: 0 },
  lathe:                  { setup_time_min: 10, tool_change_sec: 1.5, rapid_rate_mm_min: 24000, pallet_change_sec: 0 },
  mill_turn:              { setup_time_min: 20, tool_change_sec: 3.0, rapid_rate_mm_min: 24000, pallet_change_sec: 0 },
  wire_edm:               { setup_time_min: 30, tool_change_sec: 0,   rapid_rate_mm_min: 3000,  pallet_change_sec: 0 },
};

/** Default clamp points per workholding type */
const WORKHOLDING_CLAMP_POINTS: Record<WorkholdingType, number> = {
  vise: 1, fixture: 4, vacuum: 1, magnetic: 1,
  collet: 1, chuck: 3, tombstone: 6, soft_jaws: 1,
  pallet: 4, angle_plate: 2, v_block: 2,
  step_clamp: 2, toe_clamp: 2, "4th_axis": 3, custom: 2,
};

export class AutoProgramOrchestratorEngine {
  /**
   * Execute the full AutoProgram pipeline.
   * Each stage is checkpointed — if a failure occurs, resume from the last
   * successful stage on the next call.
   */
  static async run(input: AutoProgramInput): Promise<AutoProgramResult> {
    const startTime = Date.now();
    const runId = `ap-${Date.now()}`;
    const checkpoints = new PipelineCheckpointManager("auto-program", runId);
    const stageResults: StageResult[] = [];
    const skipSet = new Set(input.skip_stages ?? []);

    // Determine resume point
    let startIndex = 0;
    if (input.resume_from_stage) {
      startIndex = STAGE_ORDER.indexOf(input.resume_from_stage);
      if (startIndex < 0) startIndex = 0;
    }

    // Pipeline context — accumulated across stages
    const ctx: Record<string, unknown> = {
      material: input.material,
      iso_group: resolveIsoGroup(input.material, input.iso_group),
      machine: input.machine,
      machine_type: input.machine_type ?? "vmc_3axis",
      max_rpm: input.max_rpm ?? MACHINE_DEFAULTS[input.machine_type ?? "vmc_3axis"].max_rpm,
      max_power_kw: input.max_power_kw ?? MACHINE_DEFAULTS[input.machine_type ?? "vmc_3axis"].max_power_kw,
      target_ra_um: input.target_ra_um ?? 1.6,
      optimize_for: input.optimize_for ?? "quality",
      batch_size: input.batch_size ?? 1,
      fusion_url: input.fusion_url ?? "http://127.0.0.1:18360",
      workholding_type: input.workholding_type ?? "vise",
      workholding_stiffness: input.workholding_stiffness ?? WORKHOLDING_STIFFNESS[input.workholding_type ?? "vise"],
      clamping_force_kN: input.clamping_force_kN ?? WORKHOLDING_DEFAULT_FORCE_KN[input.workholding_type ?? "vise"],
      kinematic_model: input.kinematic_model,
      // Feature injection — bypasses S2, feeds directly into S4
      ...(input.inject_features ? { features: input.inject_features } : {}),
    };

    const stageHandlers: Record<AutoProgramStage, () => Promise<StageResult>> = {
      model_intake: () => this.stageModelIntake(ctx),
      feature_recognition: () => this.stageFeatureRecognition(ctx),
      dfm_analysis: () => this.stageDfmAnalysis(ctx),
      process_planning: () => this.stageProcessPlanning(ctx),
      tool_selection: () => this.stageToolSelection(ctx),
      strategy_selection: () => this.stageStrategySelection(ctx),
      speed_feed_optimization: () => this.stageSpeedFeedOptimization(ctx),
      cam_creation: () => this.stageCamCreation(ctx, input),
      verification: () => this.stageVerification(ctx),
      output_package: () => this.stageOutputPackage(ctx, input),
    };

    for (let i = startIndex; i < STAGE_ORDER.length; i++) {
      const stage = STAGE_ORDER[i];

      if (skipSet.has(stage)) {
        stageResults.push({
          stage,
          stage_index: i,
          success: true,
          duration_ms: 0,
          data: { skipped: true },
          warnings: [],
          errors: [],
          engines_used: [],
        });
        continue;
      }

      try {
        const result = await stageHandlers[stage]();
        // Output validation — flag suspicious physics values
        this.validateStageOutput(result, ctx);
        stageResults.push(result);
        checkpoints.checkpoint(stage, i, result.data, result.duration_ms);

        if (!result.success) {
          return {
            success: false,
            pipeline_id: runId,
            total_duration_ms: Date.now() - startTime,
            stages_completed: i,
            stages_total: STAGE_ORDER.length,
            stage_results: stageResults,
            failed_stage: stage,
            error: result.errors.join("; "),
          };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        stageResults.push({
          stage,
          stage_index: i,
          success: false,
          duration_ms: 0,
          data: {},
          warnings: [],
          errors: [msg],
          engines_used: [],
        });
        return {
          success: false,
          pipeline_id: runId,
          total_duration_ms: Date.now() - startTime,
          stages_completed: i,
          stages_total: STAGE_ORDER.length,
          stage_results: stageResults,
          failed_stage: stage,
          error: msg,
        };
      }
    }

    // Build final output summary
    const features = (ctx.features as RecognizedFeature[]) ?? [];
    const operations = (ctx.planned_operations as PlannedOperation[]) ?? [];
    const dfmIssues = (ctx.dfm_issues as unknown[]) ?? [];
    const dfmScore = (ctx.dfm_score as number) ?? 100;
    const gcodeFile = ctx.gcode_file as string | undefined;
    const gcodeLines = ctx.gcode_lines as number | undefined;
    const setupSheet = ctx.setup_sheet as string | undefined;
    const machType = (ctx.machine_type as MachineType | undefined) ?? "vmc_3axis";
    const cycleEstimate = this.estimateCycleTime(operations, machType);

    return {
      success: true,
      pipeline_id: runId,
      total_duration_ms: Date.now() - startTime,
      stages_completed: STAGE_ORDER.length,
      stages_total: STAGE_ORDER.length,
      stage_results: stageResults,
      output: {
        features_found: features.length,
        operations_planned: operations.length,
        tools_selected: new Set(operations.map(op => op.tool.diameter_mm)).size,
        dfm_issues: dfmIssues.length,
        dfm_score: dfmScore,
        program_name: input.program_name ?? "O1001",
        gcode_file: gcodeFile,
        gcode_lines: gcodeLines,
        setup_sheet: setupSheet,
        estimated_cycle_time_min: cycleEstimate.total_cycle_time_min,
        confidence: this.computeConfidence(stageResults),
      },
    };
  }

  // ── Output Validation ─────────────────────────────────────────────

  /**
   * Post-stage sanity checks on physics values in context.
   * Adds warnings to the stage result for suspicious values — never blocks.
   */
  private static validateStageOutput(
    result: StageResult,
    ctx: Record<string, unknown>,
  ): void {
    const ops = ctx.planned_operations as PlannedOperation[] | undefined;
    if (!ops) return;

    for (const op of ops) {
      if (op.speed_rpm !== undefined) {
        if (op.speed_rpm < 50 || op.speed_rpm > 60000) {
          result.warnings.push(`RPM ${op.speed_rpm} outside safe range [50..60000] for seq ${op.sequence}`);
        }
      }
      if (op.feed_mm_min !== undefined) {
        if (op.feed_mm_min < 1 || op.feed_mm_min > 50000) {
          result.warnings.push(`Feed ${op.feed_mm_min} mm/min outside range [1..50000] for seq ${op.sequence}`);
        }
      }
      if (op.doc_mm !== undefined && op.doc_mm < 0) {
        result.warnings.push(`Negative DOC ${op.doc_mm} mm for seq ${op.sequence}`);
      }
      if (op.woc_mm !== undefined && op.woc_mm < 0) {
        result.warnings.push(`Negative WOC ${op.woc_mm} mm for seq ${op.sequence}`);
      }
      if (op.estimated_time_min !== undefined && op.estimated_time_min > 480) {
        result.warnings.push(`Cycle time ${op.estimated_time_min} min (>8h) for seq ${op.sequence} — verify`);
      }
    }
  }

  // ── S1: Model Intake ──────────────────────────────────────────────

  private static async stageModelIntake(
    ctx: Record<string, unknown>,
  ): Promise<StageResult> {
    const t0 = Date.now();
    const warnings: string[] = [];
    const engines: string[] = ["Fusion360LiveBridgeEngine"];

    try {
      const BridgeClass = await loadBridge();
      const bridge = new BridgeClass(ctx.fusion_url as string);

      const connected = await bridge.isConnected();
      if (!connected) {
        return {
          stage: "model_intake",
          stage_index: 0,
          success: false,
          duration_ms: Date.now() - t0,
          data: {},
          warnings: [],
          errors: ["Fusion 360 not connected. Start the PRISM add-in."],
          engines_used: engines,
        };
      }

      const status = await bridge.getStatus();
      if (!status.document) {
        return {
          stage: "model_intake",
          stage_index: 0,
          success: false,
          duration_ms: Date.now() - t0,
          data: {},
          warnings: [],
          errors: ["No document open in Fusion 360."],
          engines_used: engines,
        };
      }

      const geometry = await bridge.getGeometryDetail();
      ctx.bridge = bridge;
      ctx.status = status;
      ctx.geometry = geometry;
      ctx.face_count = geometry.faces?.length ?? 0;
      ctx.body_count = geometry.body_count ?? 0;

      if ((ctx.face_count as number) === 0) {
        warnings.push("Model has 0 faces — may be empty or suppressed.");
      }

      return {
        stage: "model_intake",
        stage_index: 0,
        success: true,
        duration_ms: Date.now() - t0,
        data: {
          document: status.document,
          body_count: ctx.body_count,
          face_count: ctx.face_count,
          grouped_by_type: geometry.grouped_by_type,
        },
        warnings,
        errors: [],
        engines_used: engines,
      };
    } catch (err: unknown) {
      return {
        stage: "model_intake",
        stage_index: 0,
        success: false,
        duration_ms: Date.now() - t0,
        data: {},
        warnings: [],
        errors: [err instanceof Error ? err.message : String(err)],
        engines_used: engines,
      };
    }
  }

  // ── S2: Feature Recognition ───────────────────────────────────────

  private static async stageFeatureRecognition(
    ctx: Record<string, unknown>,
  ): Promise<StageResult> {
    const t0 = Date.now();
    const engines: string[] = ["Fusion360LiveBridgeEngine", "FeatureRecognitionEngine"];
    const warnings: string[] = [];

    try {
      const bridge = ctx.bridge as InstanceType<Awaited<ReturnType<typeof loadBridge>>>;
      const candidates = await bridge.getFeatureCandidates();

      const features: RecognizedFeature[] = (candidates.candidates ?? []).map((f: any) => ({
        type: f.type ?? "unknown",
        dimensions: f.dimensions ?? {},
        position: f.position,
        confidence: f.confidence ?? 0.5,
        face_indices: f.face_indices ?? f.faces ?? [],
      }));

      ctx.features = features;
      ctx.complexity_score = 0;

      if (features.length === 0) {
        warnings.push("No machinable features detected. Model may need manual feature mapping.");
      }

      return {
        stage: "feature_recognition",
        stage_index: 1,
        success: true,
        duration_ms: Date.now() - t0,
        data: {
          feature_count: features.length,
          feature_types: features.map(f => f.type),
          complexity_score: ctx.complexity_score,
        },
        warnings,
        errors: [],
        engines_used: engines,
      };
    } catch (err: unknown) {
      return {
        stage: "feature_recognition",
        stage_index: 1,
        success: false,
        duration_ms: Date.now() - t0,
        data: {},
        warnings: [],
        errors: [err instanceof Error ? err.message : String(err)],
        engines_used: engines,
      };
    }
  }

  // ── S3: DFM Analysis ──────────────────────────────────────────────

  private static async stageDfmAnalysis(
    ctx: Record<string, unknown>,
  ): Promise<StageResult> {
    const t0 = Date.now();
    const engines: string[] = ["DFMPipelineEngine"];
    const warnings: string[] = [];

    try {
      const dfmEngine = await loadDFMPipeline();
      const features = (ctx.features as RecognizedFeature[]) ?? [];
      const isoGroup = ctx.iso_group as string;

      const dfmFeatures = features.map((f, idx) => ({
        id: `f-${idx}`,
        type: f.type,
        count: 1,
        dimensions: {
          width_mm: f.dimensions.width_mm ?? f.dimensions.diameter_mm ?? 10,
          depth_mm: f.dimensions.depth_mm ?? 10,
          diameter_mm: f.dimensions.diameter_mm,
        },
        corner_radius_mm: f.dimensions.corner_radius_mm ?? 0,
        wall_thickness_mm: f.dimensions.wall_thickness_mm ?? 5,
        tolerance_mm: 0.05,
      }));

      const dfmResult = await dfmEngine.analyze({
        features: dfmFeatures,
        material: ctx.material as string,
        iso_group: isoGroup as "P" | "M" | "K" | "N" | "S" | "H",
      });

      ctx.dfm_issues = dfmResult.issues ?? [];
      ctx.dfm_score = dfmResult.overall_score ?? 100;

      const criticalIssues = (dfmResult.issues ?? []).filter(
        (i: any) => i.severity === "critical",
      );
      if (criticalIssues.length > 0) {
        warnings.push(
          `${criticalIssues.length} critical DFM issue(s) — review before machining.`,
        );
      }

      return {
        stage: "dfm_analysis",
        stage_index: 2,
        success: true,
        duration_ms: Date.now() - t0,
        data: {
          score: ctx.dfm_score,
          issue_count: (ctx.dfm_issues as unknown[]).length,
          critical_count: criticalIssues.length,
        },
        warnings,
        errors: [],
        engines_used: engines,
      };
    } catch (err: unknown) {
      // DFM failure is non-fatal — warn but continue
      ctx.dfm_issues = [];
      ctx.dfm_score = 50;
      return {
        stage: "dfm_analysis",
        stage_index: 2,
        success: true,
        duration_ms: Date.now() - t0,
        data: { score: 50, fallback: true },
        warnings: [`DFM analysis failed: ${err instanceof Error ? err.message : String(err)}. Continuing with default score.`],
        errors: [],
        engines_used: engines,
      };
    }
  }

  // ── S4: Process Planning ──────────────────────────────────────────

  private static async stageProcessPlanning(
    ctx: Record<string, unknown>,
  ): Promise<StageResult> {
    const t0 = Date.now();
    const engines: string[] = ["OperationSequencerEngine"];

    try {
      const features = (ctx.features as RecognizedFeature[]) ?? [];
      const machType = (ctx.machine_type as MachineType | undefined) ?? "vmc_3axis";
      const allowedOps = MACHINE_ALLOWED_OPS[machType];

      // Map features to operations
      const allOperations = features.map((f, i) => ({
        id: `op-${i + 1}`,
        type: this.featureToOperationType(f.type),
        feature_index: i,
        feature_type: f.type,
        depth_mm: f.dimensions.depth_mm ?? 10,
        diameter_mm: f.dimensions.diameter_mm,
        area_mm2: f.dimensions.area_mm2,
      }));

      // Filter operations by machine capability
      const filtered = allOperations.filter(op => allowedOps.has(op.type));
      const skippedCount = allOperations.length - filtered.length;
      const operations = filtered;

      // Sort: roughing first, then semi-finish, then finish, drills last
      const typeOrder: Record<string, number> = {
        face_mill: 1, turning_rough: 1, turning_face: 1,
        adaptive_clear: 2, turning_finish: 2,
        pocket_2d: 3, turning_groove: 3,
        contour_2d: 4, turning_bore: 4,
        drill_peck: 5, turning_drill: 5,
        bore: 6, turning_thread: 6,
        chamfer: 7, turning_part_off: 8,
        sub_spindle_transfer: 9, // must follow part_off, precede sub-spindle ops
      };

      operations.sort(
        (a, b) => (typeOrder[a.type] ?? 10) - (typeOrder[b.type] ?? 10),
      );

      const whType = (ctx.workholding_type as WorkholdingType | undefined) ?? "vise";
      const planWarnings: string[] = [];

      // ── Pallet / tombstone multi-face assignment ──
      // Tombstone: 4 faces (0°, 90°, 180°, 270°). Pallet: 2 faces (top, bottom).
      // Assign each feature to a face based on its position vector.
      let face_count = 1;
      if (whType === "tombstone" || whType === "pallet") {
        face_count = whType === "tombstone" ? 4 : 2;
        for (const op of operations) {
          const feat = features[op.feature_index];
          if (feat?.position) {
            // Tombstone faces: atan2(x, y) → 4 quadrants
            // Pallet faces: z > 0 = top, z <= 0 = bottom
            if (whType === "tombstone") {
              const angle = Math.atan2(feat.position.x, feat.position.y) * (180 / Math.PI);
              const normalized = ((angle % 360) + 360) % 360;
              (op as Record<string, unknown>).setup_face = Math.floor(normalized / 90) % 4;
            } else {
              (op as Record<string, unknown>).setup_face = feat.position.z > 0 ? 0 : 1;
            }
          } else {
            (op as Record<string, unknown>).setup_face = 0;
          }
        }
        // Re-sort: group by face, then by type within each face
        operations.sort((a, b) => {
          const faceA = ((a as Record<string, unknown>).setup_face as number) ?? 0;
          const faceB = ((b as Record<string, unknown>).setup_face as number) ?? 0;
          if (faceA !== faceB) return faceA - faceB;
          return (typeOrder[a.type] ?? 10) - (typeOrder[b.type] ?? 10);
        });
        planWarnings.push(
          `${whType}: ${face_count} faces detected, operations grouped by face.`,
        );
      }

      // ── 4th-axis indexing auto-detection ──
      // When workholding is 4th_axis, compute A-axis angle per feature from
      // its Y/Z position: A = atan2(z, y). Round to nearest 5° for indexing.
      let unique_angles = 0;
      if (whType === "4th_axis") {
        const angleSet = new Set<number>();
        for (const op of operations) {
          const feat = features[op.feature_index];
          if (feat?.position && (feat.position.y !== 0 || feat.position.z !== 0)) {
            const rawDeg = Math.atan2(feat.position.z, feat.position.y) * (180 / Math.PI);
            // Round to nearest 5° for practical indexing
            const indexAngle = Math.round(rawDeg / 5) * 5;
            (op as Record<string, unknown>).a_axis_deg = indexAngle;
            angleSet.add(indexAngle);
          } else {
            (op as Record<string, unknown>).a_axis_deg = 0;
            angleSet.add(0);
          }
        }
        unique_angles = angleSet.size;
        // Re-sort: group by A-axis angle, then by type
        operations.sort((a, b) => {
          const angleA = ((a as Record<string, unknown>).a_axis_deg as number) ?? 0;
          const angleB = ((b as Record<string, unknown>).a_axis_deg as number) ?? 0;
          if (angleA !== angleB) return angleA - angleB;
          return (typeOrder[a.type] ?? 10) - (typeOrder[b.type] ?? 10);
        });
        planWarnings.push(
          `4th-axis: ${unique_angles} unique index angle(s) detected.`,
        );
      }

      // ── 5-axis work plane computation ──
      // For 5-axis machines, compute tilted work planes from feature normal vectors.
      // 3+2: round angles to nearest 5° for indexed positioning (G68.2 / CYCLE800).
      // Simultaneous: preserve exact angles for continuous tool orientation (G43.4/G43.5 TCPC).
      // Ref: Bohez (2002), Fang & Luo (2019), ISO 841 axis nomenclature.
      let work_plane_count = 0;
      const singularity_warnings: string[] = [];

      if (machType === "five_axis_3plus2" || machType === "five_axis_simultaneous") {
        const kinModel: KinematicModel = (ctx.kinematic_model as KinematicModel | undefined) ?? "trunnion_table";
        const limits = KINEMATIC_LIMITS[kinModel];
        const isSimultaneous = machType === "five_axis_simultaneous";
        const planeSet = new Set<string>();

        for (const op of operations) {
          const feat = features[op.feature_index];
          const n = feat?.normal;
          if (n && (n.x !== 0 || n.y !== 0 || Math.abs(n.z) < 0.9999)) {
            // Compute tilt from Z-axis: A = acos(nz), C = atan2(ny, nx)
            const mag = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
            const nz = mag > 0 ? n.z / mag : 1;
            const ny = mag > 0 ? n.y / mag : 0;
            const nx = mag > 0 ? n.x / mag : 0;
            let A_deg = Math.acos(Math.max(-1, Math.min(1, nz))) * (180 / Math.PI);
            let C_deg = Math.atan2(ny, nx) * (180 / Math.PI);

            // For 3+2: round to 5° increments for indexing
            if (!isSimultaneous) {
              A_deg = Math.round(A_deg / 5) * 5;
              C_deg = Math.round(C_deg / 5) * 5;
            }

            // Clamp to kinematic limits
            A_deg = Math.max(limits.primary.min_deg, Math.min(limits.primary.max_deg, A_deg));
            C_deg = Math.max(limits.secondary.min_deg, Math.min(limits.secondary.max_deg, C_deg));

            // Singularity detection: near A=0° the C-axis velocity → ∞
            if (Math.abs(A_deg) < limits.singularity_zone_deg) {
              singularity_warnings.push(
                `Feature ${op.feature_index} (${feat.type}): A=${A_deg.toFixed(1)}° near singularity zone (±${limits.singularity_zone_deg}°). C-axis may exhibit tracking errors on ${kinModel}.`,
              );
            }

            (op as Record<string, unknown>).work_plane_a_deg = A_deg;
            (op as Record<string, unknown>).work_plane_c_deg = C_deg;
            (op as Record<string, unknown>).kinematic_model = kinModel;

            // Remap 5-axis-specific features to the correct operation
            const fiveAxisMap = FIVE_AXIS_FEATURE_MAP[feat.type];
            if (fiveAxisMap) {
              op.type = isSimultaneous ? fiveAxisMap.simultaneous : fiveAxisMap.indexed;
            }

            planeSet.add(`${A_deg.toFixed(1)}_${C_deg.toFixed(1)}`);
          } else {
            // Feature aligned to Z — no tilt needed (A=0, C=0)
            (op as Record<string, unknown>).work_plane_a_deg = 0;
            (op as Record<string, unknown>).work_plane_c_deg = 0;
          }
        }

        work_plane_count = planeSet.size;

        // Re-sort: group by work plane (A then C), then by type within each plane
        operations.sort((a, b) => {
          const aA = ((a as Record<string, unknown>).work_plane_a_deg as number) ?? 0;
          const bA = ((b as Record<string, unknown>).work_plane_a_deg as number) ?? 0;
          if (aA !== bA) return aA - bA;
          const aC = ((a as Record<string, unknown>).work_plane_c_deg as number) ?? 0;
          const bC = ((b as Record<string, unknown>).work_plane_c_deg as number) ?? 0;
          if (aC !== bC) return aC - bC;
          return (typeOrder[a.type] ?? 10) - (typeOrder[b.type] ?? 10);
        });

        if (singularity_warnings.length > 0) {
          planWarnings.push(...singularity_warnings);
        }
        planWarnings.push(
          `5-axis (${kinModel}): ${work_plane_count} unique work plane(s), mode=${isSimultaneous ? "simultaneous" : "3+2 indexed"}.`,
        );
      }

      // ── Lathe / mill-turn: G96/G97 spindle mode assignment ──
      // For turning operations, assign spindle control mode:
      //   G96 (CSS) = constant surface speed, RPM varies with workpiece diameter
      //   G97 = constant RPM, used for threading/drilling/part-off
      // CSS requires: surface speed (m/min) + max RPM clamp (G50 S[max])
      // Ref: Sandvik Coromant Turning handbook, ISO 3002-1 cutting geometry.
      let turning_op_count = 0;
      let g96_count = 0;
      let g97_count = 0;

      if (machType === "lathe" || machType === "mill_turn") {
        const isoGroup = (ctx.iso_group as ISOGroup | undefined) ?? "P";
        const maxRpm = (ctx.max_rpm as number | undefined) ?? MACHINE_DEFAULTS[machType].max_rpm;
        const canonVc = CANONICAL_TURNING_SPEEDS[isoGroup];

        for (const op of operations) {
          const spindleMode = TURNING_SPINDLE_MODE[op.type];
          if (!spindleMode) continue; // milling ops on mill-turn — no spindle mode override

          turning_op_count++;
          (op as Record<string, unknown>).spindle_mode = spindleMode;

          if (spindleMode === "G96") {
            // CSS: assign surface speed and RPM clamp
            const isFinish = op.type === "turning_finish";
            const cssVc = isFinish ? canonVc.finish : canonVc.rough;
            (op as Record<string, unknown>).css_surface_speed_m_min = cssVc;
            // G50 clamp: 90% of max RPM per ISO 11373 spindle centrifugal stress derating
            (op as Record<string, unknown>).max_rpm_clamp = Math.round(maxRpm * 0.9);
            // CSS RPM = rpmFromVc(Vc, D) per ISO 3002-1: n = 1000 × Vc / (π × D)
            const wpDia = op.diameter_mm ?? 50; // fallback 50mm OD
            const calcRpm = Math.round((1000 * cssVc) / (Math.PI * wpDia));
            (op as Record<string, unknown>).calculated_rpm_at_od = Math.min(calcRpm, maxRpm);
            g96_count++;
          } else {
            // G97: fixed RPM — compute from surface speed at workpiece diameter
            const wpDia = op.diameter_mm ?? 50;
            // Threading: ~50% Vc to reduce flank wear at thread pitch engagement
            // (Sandvik Coromant Threading Handbook, Ch. 3 "Speed Recommendations")
            const cssVc = op.type === "turning_thread"
              ? canonVc.finish * 0.5
              : canonVc.rough;
            const fixedRpm = Math.min(
              Math.round((1000 * cssVc) / (Math.PI * wpDia)),
              maxRpm,
            );
            (op as Record<string, unknown>).fixed_rpm = fixedRpm;
            g97_count++;
          }
        }

        if (turning_op_count > 0) {
          planWarnings.push(
            `Lathe spindle: ${g96_count} G96 (CSS) + ${g97_count} G97 (constant RPM) operation(s).`,
          );
        }

        // Default lathe workholding to chuck if user specified vise
        if (whType === "vise" && machType === "lathe") {
          ctx.workholding_type = "chuck";
          planWarnings.push("Workholding auto-switched: vise → chuck (lathe).");
        }

        // ── Turning approach/retract patterns + multi-pass roughing ──
        // Assign approach/retract geometry and compute multi-pass splitting
        // for each turning operation. Deep roughing is split into multiple
        // equal-depth passes when total depth exceeds the per-operation limit.
        let multiPassOps = 0;
        for (const op of operations) {
          if (!op.type.startsWith("turning_")) continue;
          const pattern = TURNING_APPROACH_RETRACT[op.type];
          if (pattern) {
            (op as Record<string, unknown>).approach_type = pattern.approach;
            (op as Record<string, unknown>).retract_type = pattern.retract;

            // Multi-pass: split deep features
            const totalDepth = op.depth_mm ?? 5;
            const passes = computeTurningPasses(op.type, totalDepth);
            (op as Record<string, unknown>).pass_count = passes.pass_count;
            (op as Record<string, unknown>).depth_per_pass_mm = passes.depth_per_pass_mm;

            if (passes.pass_count > 1) multiPassOps++;
          }
        }
        if (multiPassOps > 0) {
          planWarnings.push(`Turning multi-pass: ${multiPassOps} operation(s) split into multiple passes.`);
        }
      }

      // ── Mill-turn: channel assignment ──
      // Mill-turn machines have 2+ channels:
      //   Channel 1 (C1): main spindle — turning operations + axial drilling
      //   Channel 2 (C2): sub-spindle — back-work turning after part-off transfer
      //   Channel 3 (Cm): milling spindle / live tooling — milling ops with B-axis
      // sub_spindle_transfer marks the handoff point between C1 and C2.
      // Ref: Mazak Integrex programming guide, DMG MORI NLX/NTX multi-channel manual.
      let channel_count = 1;
      let sub_spindle_ops = 0;
      let live_tool_ops = 0;

      if (machType === "mill_turn") {
        let pastTransfer = false;

        for (const op of operations) {
          if (op.type === "sub_spindle_transfer") {
            pastTransfer = true;
            (op as Record<string, unknown>).channel_id = "C1";
            (op as Record<string, unknown>).spindle_id = "main";
            continue;
          }

          if (pastTransfer && op.type.startsWith("turning_")) {
            // Post-transfer turning → sub-spindle (C2)
            (op as Record<string, unknown>).channel_id = "C2";
            (op as Record<string, unknown>).spindle_id = "sub";
            sub_spindle_ops++;
          } else if (op.type === "live_tool_mill" || (!op.type.startsWith("turning_") && !op.type.startsWith("wire_"))) {
            // Milling operations → milling channel (Cm) with live tooling
            (op as Record<string, unknown>).channel_id = "Cm";
            (op as Record<string, unknown>).spindle_id = "milling";
            live_tool_ops++;
          } else {
            // Turning operations pre-transfer → main spindle (C1)
            (op as Record<string, unknown>).channel_id = "C1";
            (op as Record<string, unknown>).spindle_id = "main";
          }
        }

        channel_count = 1 + (sub_spindle_ops > 0 ? 1 : 0) + (live_tool_ops > 0 ? 1 : 0);

        // ── Channel synchronization: insert sync M-codes at boundaries ──
        // Sync points ensure safe handoffs between channels:
        //   1. Before sub_spindle_transfer: main must finish + orient
        //   2. After sub_spindle_transfer: sub confirms grip
        //   3. C1↔Cm transitions: orient spindle for live tool
        // Ref: Mazak Integrex §12, DMG MORI NTX §8.
        if (channel_count > 1) {
          let prevChannel: string | undefined;

          for (let oi = 0; oi < operations.length; oi++) {
            const op = operations[oi];
            const ch = (op as Record<string, unknown>).channel_id as string | undefined;

            // Sub-spindle transfer: sync before and after
            if (op.type === "sub_spindle_transfer") {
              (op as Record<string, unknown>).sync_before = MILL_TURN_SYNC_CODES.pre_transfer.code;
              (op as Record<string, unknown>).sync_after = MILL_TURN_SYNC_CODES.post_transfer.code;
            }
            // Channel transition: C1→Cm (milling start)
            else if (prevChannel === "C1" && ch === "Cm") {
              (op as Record<string, unknown>).sync_before = MILL_TURN_SYNC_CODES.milling_start.code;
            }
            // Channel transition: Cm→C1 (milling end, resume turning)
            else if (prevChannel === "Cm" && ch === "C1") {
              (op as Record<string, unknown>).sync_before = MILL_TURN_SYNC_CODES.milling_end.code;
            }
            // Channel transition: C1→C2 (not via transfer — direct handoff)
            else if (prevChannel === "C1" && ch === "C2" && op.type !== "sub_spindle_transfer") {
              (op as Record<string, unknown>).sync_before = MILL_TURN_SYNC_CODES.pre_transfer.code;
            }

            prevChannel = ch;
          }

          // Last operation in program: end sync
          const lastOp = operations[operations.length - 1];
          if (lastOp && channel_count > 1) {
            (lastOp as Record<string, unknown>).sync_after = MILL_TURN_SYNC_CODES.program_end.code;
          }

          planWarnings.push(
            `Mill-turn: ${channel_count} channels (C1=${operations.filter(o => (o as Record<string, unknown>).channel_id === "C1").length} main, ` +
            `${sub_spindle_ops > 0 ? `C2=${sub_spindle_ops} sub-spindle, ` : ""}` +
            `${live_tool_ops > 0 ? `Cm=${live_tool_ops} live-tool` : ""}).`.replace(/, \)/, ")"),
          );

          // Count sync points for stage data
          const syncCount = operations.filter(o =>
            (o as Record<string, unknown>).sync_before != null ||
            (o as Record<string, unknown>).sync_after != null,
          ).length;
          planWarnings.push(`Mill-turn sync: ${syncCount} synchronization point(s) inserted.`);
        }
      }

      // ── Wire EDM: taper angle + UV offset assignment ──
      // Wire EDM uses X/Y for lower guide and U/V for upper guide offset (taper).
      // wire_profile: straight cut (0° taper, U=V=0)
      // wire_4axis_taper: angled cut (user taper angle, UV computed from thickness + angle)
      // wire_no_core: slug-less cut (no start hole needed, tabbed approach)
      // wire_open_pocket: open pocket roughing with wire
      // Ref: Mitsubishi MV/FA series programming manual, AgieCharmilles CUT E series.
      let wire_edm_op_count = 0;
      const WIRE_DEFAULTS = { wire_diameter_mm: 0.25, taper_angle_deg: 0 };

      if (machType === "wire_edm") {
        for (const op of operations) {
          if (!op.type.startsWith("wire_")) continue;
          wire_edm_op_count++;

          const thickness = op.depth_mm ?? 25; // workpiece thickness mm
          (op as Record<string, unknown>).wire_diameter_mm = WIRE_DEFAULTS.wire_diameter_mm;
          (op as Record<string, unknown>).workpiece_thickness_mm = thickness;

          if (op.type === "wire_4axis_taper") {
            // Taper UV offset: accounts for wire centerline + wire radius contribution
            // UV = (t/2) × tan(θ) + 2 × r_wire × tan(θ/2)
            // Ref: Mitsubishi MV/FA series programming manual, AgieCharmilles CUT E series
            const angle = (op as Record<string, unknown>).taper_angle_deg as number ?? 3; // default 3°
            const angleRad = angle * Math.PI / 180;
            const wireRadius = WIRE_DEFAULTS.wire_diameter_mm / 2;
            const uvOffset = (thickness / 2) * Math.tan(angleRad) + 2 * wireRadius * Math.tan(angleRad / 2);
            (op as Record<string, unknown>).taper_angle_deg = angle;
            (op as Record<string, unknown>).uv_offset_mm = Math.round(uvOffset * 1000) / 1000;
            (op as Record<string, unknown>).upper_guide_z = thickness;
            (op as Record<string, unknown>).lower_guide_z = 0;
          } else {
            // Straight cut: no taper
            (op as Record<string, unknown>).taper_angle_deg = 0;
            (op as Record<string, unknown>).uv_offset_mm = 0;
          }

          if (op.type === "wire_no_core") {
            (op as Record<string, unknown>).slug_less = true;
          }
        }

        if (wire_edm_op_count > 0) {
          const taperOps = operations.filter(o => (o as Record<string, unknown>).taper_angle_deg as number > 0).length;
          planWarnings.push(
            `Wire EDM: ${wire_edm_op_count} operation(s), ${taperOps} with taper (UV offset).`,
          );
        }
      }

      // ── Multi-setup detection ──
      // Milling: features with z-normal < 0 need a second setup (part flip).
      // Mill-turn: features after sub_spindle_transfer get setup_index=1.
      // Lathe: single-setup only (chuck holds once).
      // Wire EDM: single-setup only (workpiece clamped in flat orientation).
      let setup_count = 1;

      if (machType !== "lathe" && machType !== "wire_edm") {
        const hasBottomFeatures = features.some(f =>
          f.normal != null && f.normal.z < -0.5,
        );

        if (hasBottomFeatures && machType !== "mill_turn") {
          // Milling multi-setup: Op1 = top (z-normal ≥ 0), Op2 = bottom (z-normal < 0)
          setup_count = 2;
          for (const op of operations) {
            const feat = features[op.feature_index];
            if (feat?.normal != null && feat.normal.z < -0.5) {
              (op as Record<string, unknown>).setup_index = 1;
            } else {
              (op as Record<string, unknown>).setup_index = 0;
            }
          }
          // Re-sort: group by setup, then by existing order within each setup
          operations.sort((a, b) => {
            const sA = ((a as Record<string, unknown>).setup_index as number) ?? 0;
            const sB = ((b as Record<string, unknown>).setup_index as number) ?? 0;
            if (sA !== sB) return sA - sB;
            return (typeOrder[a.type] ?? 10) - (typeOrder[b.type] ?? 10);
          });
          planWarnings.push(
            `Multi-setup: Op1 (top) = ${operations.filter(o => ((o as Record<string, unknown>).setup_index ?? 0) === 0).length} ops, ` +
            `Op2 (flip) = ${operations.filter(o => (o as Record<string, unknown>).setup_index === 1).length} ops.`,
          );
        } else if (machType === "mill_turn") {
          // Mill-turn: setup_index tracks main (0) vs sub-spindle (1) vs milling (2)
          for (const op of operations) {
            const ch = (op as Record<string, unknown>).channel_id as string | undefined;
            if (ch === "C2") {
              (op as Record<string, unknown>).setup_index = 1;
            } else if (ch === "Cm") {
              (op as Record<string, unknown>).setup_index = 2;
            } else {
              (op as Record<string, unknown>).setup_index = 0;
            }
          }
          const setups = new Set(operations.map(o => (o as Record<string, unknown>).setup_index as number));
          setup_count = setups.size;
        } else {
          // Single setup — tag all ops as setup_index=0
          for (const op of operations) {
            (op as Record<string, unknown>).setup_index = 0;
          }
        }
      } else {
        for (const op of operations) {
          (op as Record<string, unknown>).setup_index = 0;
        }
      }

      ctx.operation_plan = operations;
      ctx.setup_count = setup_count;

      if (skippedCount > 0) {
        planWarnings.push(
          `${skippedCount} operation(s) filtered — not supported by ${machType}.`,
        );
      }

      return {
        stage: "process_planning",
        stage_index: 3,
        success: true,
        duration_ms: Date.now() - t0,
        data: {
          operation_count: operations.length,
          operations_filtered: skippedCount,
          operation_sequence: operations.map(o => o.type),
          machine_type: machType,
          workholding_mode: whType === "tombstone" || whType === "pallet"
            ? "multi_face" : whType === "4th_axis" ? "rotary_index" : "standard",
          face_count: face_count > 1 ? face_count : undefined,
          unique_angles: unique_angles > 0 ? unique_angles : undefined,
          work_plane_count: work_plane_count > 0 ? work_plane_count : undefined,
          kinematic_model: (machType === "five_axis_3plus2" || machType === "five_axis_simultaneous")
            ? ((ctx.kinematic_model as KinematicModel | undefined) ?? "trunnion_table") : undefined,
          singularity_warnings: singularity_warnings.length > 0 ? singularity_warnings.length : undefined,
          turning_op_count: turning_op_count > 0 ? turning_op_count : undefined,
          multi_pass_ops: (() => {
            const mp = operations.filter(o =>
              ((o as Record<string, unknown>).pass_count as number ?? 1) > 1,
            ).length;
            return mp > 0 ? mp : undefined;
          })(),
          g96_count: g96_count > 0 ? g96_count : undefined,
          g97_count: g97_count > 0 ? g97_count : undefined,
          channel_count: channel_count > 1 ? channel_count : undefined,
          sub_spindle_ops: sub_spindle_ops > 0 ? sub_spindle_ops : undefined,
          live_tool_ops: live_tool_ops > 0 ? live_tool_ops : undefined,
          wire_edm_op_count: wire_edm_op_count > 0 ? wire_edm_op_count : undefined,
          setup_count: setup_count > 1 ? setup_count : undefined,
          sync_point_count: (() => {
            const sc = operations.filter(o =>
              (o as Record<string, unknown>).sync_before != null ||
              (o as Record<string, unknown>).sync_after != null,
            ).length;
            return sc > 0 ? sc : undefined;
          })(),
        },
        warnings: planWarnings,
        errors: [],
        engines_used: engines,
      };
    } catch (err: unknown) {
      return {
        stage: "process_planning",
        stage_index: 3,
        success: false,
        duration_ms: Date.now() - t0,
        data: {},
        warnings: [],
        errors: [err instanceof Error ? err.message : String(err)],
        engines_used: engines,
      };
    }
  }

  // ── S5: Tool Selection ────────────────────────────────────────────

  private static async stageToolSelection(
    ctx: Record<string, unknown>,
  ): Promise<StageResult> {
    const t0 = Date.now();
    const engines: string[] = ["SmartToolSelectorEngine"];
    const warnings: string[] = [];

    try {
      const operations = (ctx.operation_plan as Array<{
        id: string;
        type: string;
        feature_index: number;
        depth_mm: number;
        diameter_mm?: number;
      }>) ?? [];
      const isoGroup = ctx.iso_group as ISOGroup;

      const kc = CANONICAL_KIENZLE[isoGroup];

      const toolRecommendations: ToolRecommendation[] = operations.map(op => {
        const isTurning = op.type.startsWith("turning_");
        const isWireEdm = op.type.startsWith("wire_");

        // ── Wire EDM: wire selection (no rotating tool) ──
        if (isWireEdm) {
          const wireDia = 0.25; // brass wire default (mm)
          return {
            tool_type: this.operationToToolType(op.type),
            diameter_mm: wireDia,
            flute_count: 0, // wire has no flutes
            flute_length_mm: 0,
            overall_length_mm: 0,
            corner_radius_mm: wireDia / 2,
            score: 90,
            rationale: `D${wireDia}mm brass wire for ${op.type}`,
          };
        }

        // ── Turning: insert selection ──
        if (isTurning) {
          const noseR = op.type === "turning_finish" ? 0.4
            : op.type === "turning_thread" ? 0 // threading has no nose radius
            : op.type === "turning_groove" || op.type === "turning_part_off" ? 0.2
            : 0.8; // roughing default
          const insertSize = op.type === "turning_groove" || op.type === "turning_part_off" ? 4 : 12;
          return {
            tool_type: this.operationToToolType(op.type),
            diameter_mm: insertSize,
            flute_count: 1, // single-point per ISO 11374
            flute_length_mm: insertSize * 2,
            overall_length_mm: 150,
            corner_radius_mm: noseR,
            score: 85,
            rationale: `${this.operationToToolType(op.type)} r=${noseR}mm for ${op.type}`,
          };
        }

        // ── Milling: physics-based tool sizing ──
        // Diameter ≈ 2× pocket width or feature diameter
        let diameter = 10; // default
        if (op.diameter_mm) {
          diameter = op.type === "drill_peck" ? op.diameter_mm : Math.max(6, Math.round(op.diameter_mm * 0.6));
        }
        if (op.type === "face_mill") diameter = 50;
        if (op.type === "adaptive_clear") diameter = Math.max(10, diameter);

        const flutes = isoGroup === "N" ? 3 : isoGroup === "S" || isoGroup === "H" ? 4 : 3;
        const fluteLength = diameter * 3;
        const oal = diameter * 6;
        const cornerR = op.type === "chamfer" ? 0 : (diameter <= 6 ? 0 : 0.5);

        // Deflection check: δ = FL³/(3EI), I = πd⁴/64
        const overhang_mm = fluteLength + 10;
        const I_mm4 = Math.PI * Math.pow(diameter, 4) / 64;
        const E_mpa = 600000; // carbide
        const est_force = kc.kc1_1 * 1.0 * Math.pow(0.1, 1 - kc.mc); // approximate
        const deflection_um = (est_force * Math.pow(overhang_mm, 3)) / (3 * E_mpa * I_mm4) * 1000;

        if (deflection_um > 50) {
          warnings.push(`Tool D${diameter} overhang ${overhang_mm}mm: deflection ${deflection_um.toFixed(0)}µm exceeds 50µm limit.`);
        }

        return {
          tool_type: this.operationToToolType(op.type),
          diameter_mm: diameter,
          flute_count: flutes,
          flute_length_mm: fluteLength,
          overall_length_mm: oal,
          corner_radius_mm: cornerR,
          score: Math.max(10, 100 - deflection_um),
          rationale: `D${diameter} ${flutes}FL for ${op.type}, δ=${deflection_um.toFixed(1)}µm`,
        };
      });

      ctx.tool_recommendations = toolRecommendations;

      return {
        stage: "tool_selection",
        stage_index: 4,
        success: true,
        duration_ms: Date.now() - t0,
        data: {
          tools_selected: toolRecommendations.length,
          unique_diameters: [...new Set(toolRecommendations.map(t => t.diameter_mm))],
        },
        warnings,
        errors: [],
        engines_used: engines,
      };
    } catch (err: unknown) {
      return {
        stage: "tool_selection",
        stage_index: 4,
        success: false,
        duration_ms: Date.now() - t0,
        data: {},
        warnings: [],
        errors: [err instanceof Error ? err.message : String(err)],
        engines_used: engines,
      };
    }
  }

  // ── S6: Strategy Selection ────────────────────────────────────────

  private static async stageStrategySelection(
    ctx: Record<string, unknown>,
  ): Promise<StageResult> {
    const t0 = Date.now();
    const engines: string[] = ["OptimalStrategySelectionEngine"];

    try {
      const operations = (ctx.operation_plan as Array<{
        id: string;
        type: string;
        feature_type: string;
      }>) ?? [];

      // Map operation type → Fusion 360 strategy
      const strategies = operations.map(op => ({
        operation_id: op.id,
        strategy: this.selectStrategy(op.type, op.feature_type),
      }));

      ctx.strategies = strategies;

      return {
        stage: "strategy_selection",
        stage_index: 5,
        success: true,
        duration_ms: Date.now() - t0,
        data: {
          strategies: strategies.map(s => s.strategy),
        },
        warnings: [],
        errors: [],
        engines_used: engines,
      };
    } catch (err: unknown) {
      return {
        stage: "strategy_selection",
        stage_index: 5,
        success: false,
        duration_ms: Date.now() - t0,
        data: {},
        warnings: [],
        errors: [err instanceof Error ? err.message : String(err)],
        engines_used: engines,
      };
    }
  }

  // ── S7: Speed/Feed Optimization ───────────────────────────────────

  private static async stageSpeedFeedOptimization(
    ctx: Record<string, unknown>,
  ): Promise<StageResult> {
    const t0 = Date.now();
    const engines: string[] = ["SpeedFeedOrchestratorEngine"];
    const warnings: string[] = [];

    try {
      const isoGroup = ctx.iso_group as ISOGroup;
      const maxRpm = ctx.max_rpm as number;
      const maxPower = ctx.max_power_kw as number | undefined;
      const targetRa = ctx.target_ra_um as number;
      const materialName = ctx.material as string;
      const machineName = ctx.machine as string | undefined;
      const optimizeFor = ctx.optimize_for as "time" | "quality" | "tool_life" | undefined;
      const tools = (ctx.tool_recommendations as ToolRecommendation[]) ?? [];
      const operations = (ctx.operation_plan as Array<{
        id: string;
        type: string;
        depth_mm: number;
      }>) ?? [];

      // Map AutoProgram optimize_for → Orchestrator optimize_for
      const orchOptimize: SFOInput["optimize_for"] =
        optimizeFor === "time" ? "productivity"
        : optimizeFor === "quality" ? "surface_finish"
        : optimizeFor === "tool_life" ? "tool_life"
        : "balanced";

      // Lazy-load SpeedFeedOrchestratorEngine (8-resolver pipeline with full
      // Kienzle corrections: K_gamma, K_kappa, K_wear, K_vc, K_coolant)
      const { speedFeedOrchestratorEngine } = await import("./SpeedFeedOrchestratorEngine.js");

      const physicsLog: Array<Record<string, unknown>> = [];

      const planned: PlannedOperation[] = operations.flatMap((op, i) => {
        const tool = tools[i] ?? tools[0];

        // Wire EDM: expand each feature into multi-cut passes (rough → trim → skim)
        // Pass count determined by target surface finish.
        // Ref: Mitsubishi MV-series technology tables, Sodick VL600QH manual.
        const isWireEdm = op.type.startsWith("wire_");
        if (isWireEdm) {
          const isTaper = op.type === "wire_4axis_taper";
          const passCount = edmPassCountForRa(targetRa);
          const thickness = (op as Record<string, unknown>).workpiece_thickness_mm as number ?? 25;
          const kerf = tool.diameter_mm + 0.02; // wire kerf = wire dia + spark gap

          return EDM_MULTI_CUT_TABLE.slice(0, passCount).map((pass, pi) => {
            // Taper cuts: reduce wire speed by 30% for UV axis coordination.
            // UV guide axes have lower max traverse than XY (typically 7 m/min vs 15 m/min
            // on Mitsubishi MV2400R). Taper motion requires synchronized XY+UV interpolation;
            // wire speed must not exceed the slower axis's tracking capability.
            // Ref: Mitsubishi MV2400R spec sheet, UV axis max rapid = 7 m/min.
            const speedMult = isTaper ? 0.7 : 1.0;
            return {
              sequence: 0, // re-sequenced below
              feature_index: i,
              operation_type: op.type,
              tool,
              strategy: ((ctx.strategies as Array<{ strategy: string }>)?.[i]?.strategy) ?? op.type,
              speed_rpm: 0, // no spindle in wire EDM
              feed_mm_min: pass.wire_speed_m_min * speedMult * 1000,
              doc_mm: thickness,
              woc_mm: pi === 0 ? kerf : pass.wire_offset_mm * 2, // rough = full kerf, trims = offset
              estimated_time_min: pi === 0 ? 5 : 2, // rough slower, trims faster
              confidence: 0.7,
              wire_speed_m_min: Math.round(pass.wire_speed_m_min * speedMult * 10) / 10,
              wire_tension_N: pass.wire_tension_N,
              flushing_pressure_bar: pass.flushing_pressure_bar,
              uv_offset_mm: isTaper ? 0.05 : undefined,
              edm_pass_type: pass.pass_type,
              edm_pass_index: pi,
            } as PlannedOperation;
          });
        }

        // Map operation type → Orchestrator operation/cut_type/strategy
        const isTurning = op.type.startsWith("turning_");
        const orchOp: SFOInput["operation"] =
          isTurning ? "turning"
          : op.type === "drill_peck" || op.type === "drill" ? "drilling"
          : op.type === "bore" ? "boring"
          : op.type === "ream" ? "reaming"
          : op.type === "tap" ? "tapping"
          : "milling";

        const cutType: SFOInput["cut_type"] =
          op.type === "turning_finish" ? "finishing"
          : op.type === "turning_rough" || op.type === "turning_face" ? "roughing"
          : op.type.startsWith("finish") ? "finishing"
          : op.type === "semi_finish" ? "semi_finishing"
          : "roughing";

        const orchStrategy: SFOInput["strategy"] =
          op.type === "adaptive_clear" ? "adaptive"
          : op.type === "trochoidal" ? "trochoidal"
          : op.type === "face_mill" ? "conventional"
          : op.type === "slot" ? "slot"
          : op.type === "plunge" ? "plunge"
          : undefined;

        // Build SpeedFeedOrchestratorEngine input
        const sfoInput: SFOInput = {
          material: materialName,
          iso_group: isoGroup,
          machine_name: machineName,
          machine_max_rpm: maxRpm,
          machine_power_kw: maxPower,
          tool_diameter_mm: tool.diameter_mm,
          flutes: isTurning ? 1 : tool.flute_count, // turning inserts: 1 cutting edge
          flute_length_mm: tool.flute_length_mm,
          overall_length_mm: tool.overall_length_mm,
          corner_radius_mm: tool.corner_radius_mm,
          tool_coating: tool.coating,
          tool_material: "carbide",
          operation: orchOp,
          cut_type: cutType,
          strategy: orchStrategy,
          optimize_for: orchOptimize,
          cam_system: "Fusion360",
          workholding_type: isTurning ? "chuck" : WORKHOLDING_TO_SFO[(ctx.workholding_type as WorkholdingType | undefined) ?? "vise"],
          workholding_stiffness: ctx.workholding_stiffness as "low" | "medium" | "high" | undefined,
          clamping_force_kN: ctx.clamping_force_kN as number | undefined,
          // Turning: pass workpiece diameter for CSS RPM calculation
          ...(isTurning ? {
            workpiece_diameter_mm: (op as Record<string, unknown>).diameter_mm as number ?? 50,
            machine_type: "lathe" as const,
          } : {}),
        };

        try {
          const sfResult = speedFeedOrchestratorEngine.compute(sfoInput);
          const r = sfResult.value;

          if (sfResult.confidence < 0.3) {
            warnings.push(`Low confidence (${(sfResult.confidence * 100).toFixed(0)}%) for seq ${i + 1} (${op.type}) — verify manually`);
          }

          // Cycle time from MRR
          const estVolume = (op.depth_mm ?? 10) * 50 * 50; // mm³
          const estTime = r.mrr_cm3min > 0 ? estVolume / (r.mrr_cm3min * 1000) : 5;

          physicsLog.push({
            seq: i + 1, op: op.type,
            Fc: r.tangential_force_N, P: r.power_kw, T: r.tool_life_min,
            Ra: r.surface_finish_Ra_um, defl: r.deflection_um,
            conf: sfResult.confidence,
          });

          return {
            sequence: i + 1,
            feature_index: i,
            operation_type: op.type,
            tool,
            strategy: ((ctx.strategies as Array<{ strategy: string }>)?.[i]?.strategy) ?? "adaptive",
            speed_rpm: r.spindle_rpm,
            feed_mm_min: Math.round(r.feed_rate_mmmin),
            doc_mm: Math.round(r.axial_depth_mm * 100) / 100,
            woc_mm: Math.round(r.radial_depth_mm * 100) / 100,
            estimated_time_min: Math.round(Math.max(0.1, estTime) * 100) / 100,
            cutting_force_N: r.tangential_force_N,
            power_kw: r.power_kw,
            torque_Nm: r.torque_Nm,
            tool_life_min: r.tool_life_min,
            surface_finish_Ra_um: r.surface_finish_Ra_um,
            deflection_um: r.deflection_um,
            mrr_cm3_min: r.mrr_cm3min,
            confidence: sfResult.confidence,
            // Turning-specific: spindle mode + approach/retract from S4
            ...(isTurning ? {
              spindle_mode: (op as Record<string, unknown>).spindle_mode as SpindleMode,
              css_surface_speed_m_min: (op as Record<string, unknown>).css_surface_speed_m_min as number | undefined,
              max_rpm_clamp: (op as Record<string, unknown>).max_rpm_clamp as number | undefined,
              fixed_rpm: (op as Record<string, unknown>).fixed_rpm as number | undefined,
              approach_type: (op as Record<string, unknown>).approach_type as PlannedOperation["approach_type"],
              retract_type: (op as Record<string, unknown>).retract_type as PlannedOperation["retract_type"],
              pass_count: (op as Record<string, unknown>).pass_count as number | undefined,
              depth_per_pass_mm: (op as Record<string, unknown>).depth_per_pass_mm as number | undefined,
            } : {}),
            // Forward S4-assigned fields: channel, setup, sync
            channel_id: (op as Record<string, unknown>).channel_id as string | undefined,
            spindle_id: (op as Record<string, unknown>).spindle_id as string | undefined,
            setup_index: (op as Record<string, unknown>).setup_index as number | undefined,
            sync_before: (op as Record<string, unknown>).sync_before as string | undefined,
            sync_after: (op as Record<string, unknown>).sync_after as string | undefined,
          };
        } catch (sfErr: unknown) {
          // Fallback: simplified Kienzle [Kienzle & Victor 1957] / Taylor [Taylor 1907, ISO 3685]
          // without correction factors (K_gamma, K_kappa, K_wear, K_vc, K_coolant)
          warnings.push(`SFO fallback for seq ${i + 1}: ${sfErr instanceof Error ? sfErr.message : String(sfErr)}`);
          const kc = CANONICAL_KIENZLE[isoGroup];
          const taylor = CANONICAL_TAYLOR[isoGroup];
          const matEntry = Object.values(CANONICAL_MATERIAL_DB).find(m => m.iso_group === isoGroup);
          const D = tool.diameter_mm;
          const z = tool.flute_count;
          const Vc = ((matEntry?.vc_base_roughing ?? 150) + (matEntry?.vc_base_finishing ?? 200)) / 2;
          let rpm = Math.round((1000 * Vc) / (Math.PI * D));
          if (rpm > maxRpm) { rpm = maxRpm; }
          const actualVc = (Math.PI * D * rpm) / 1000; // actual Vc after RPM cap [m/min]
          const fzBase = isoGroup === "N" ? 0.12 : isoGroup === "S" ? 0.06 : isoGroup === "H" ? 0.05 : 0.10;
          const fz = fzBase * Math.min(1.0, D / 10);
          const Vf = Math.round(fz * z * rpm);
          const doc = op.type === "face_mill" ? 2.0 : op.type === "adaptive_clear" ? D * 1.5 : op.type === "drill_peck" ? op.depth_mm : D * 0.5;
          const woc = op.type === "face_mill" ? D * 0.65 : op.type === "adaptive_clear" ? D * 0.15 : D * 0.4;
          // Fc = kc1.1 × ap × fz^(1-mc) [Kienzle 1952]
          const Fc = kienzleForce(kc.kc1_1, kc.mc, Math.min(doc, 5), fz);
          // P = Fc × Vc / (60000 × η) [kW], η=0.85 spindle efficiency
          const power = (Fc * actualVc) / (60000 * 0.85);
          // T = (C/Vc)^(1/n) [Taylor 1907]
          const life = taylorLife(taylor.C, taylor.n, actualVc);
          // Ra ≈ fz² / (32 × r_nose) × 1000 [µm] (kinematic only, no corrections)
          const rNose = tool.corner_radius_mm > 0 ? tool.corner_radius_mm : 0.4;
          const Ra = ((fz * fz) / (32 * rNose)) * 1000;
          const mrr = doc * woc * Vf; // mm³/min
          const estVolume = (op.depth_mm ?? 10) * 50 * 50;
          const estTime = mrr > 0 ? estVolume / mrr : 5;
          return {
            sequence: i + 1, feature_index: i, operation_type: op.type, tool,
            strategy: ((ctx.strategies as Array<{ strategy: string }>)?.[i]?.strategy) ?? "adaptive",
            speed_rpm: rpm, feed_mm_min: Vf,
            doc_mm: Math.round(doc * 100) / 100, woc_mm: Math.round(woc * 100) / 100,
            estimated_time_min: Math.round(Math.max(0.1, estTime) * 100) / 100,
            cutting_force_N: Math.round(Fc * 10) / 10,
            power_kw: Math.round(power * 100) / 100,
            tool_life_min: Math.round(life * 10) / 10,
            surface_finish_Ra_um: Math.round(Ra * 100) / 100,
            mrr_cm3_min: Math.round((mrr / 1000) * 100) / 100,
            confidence: 0.5, // fallback: no corrections applied
            // Forward S4-assigned fields: channel, setup, sync, approach/retract
            channel_id: (op as Record<string, unknown>).channel_id as string | undefined,
            spindle_id: (op as Record<string, unknown>).spindle_id as string | undefined,
            setup_index: (op as Record<string, unknown>).setup_index as number | undefined,
            sync_before: (op as Record<string, unknown>).sync_before as string | undefined,
            sync_after: (op as Record<string, unknown>).sync_after as string | undefined,
            approach_type: (op as Record<string, unknown>).approach_type as PlannedOperation["approach_type"],
            retract_type: (op as Record<string, unknown>).retract_type as PlannedOperation["retract_type"],
            pass_count: (op as Record<string, unknown>).pass_count as number | undefined,
            depth_per_pass_mm: (op as Record<string, unknown>).depth_per_pass_mm as number | undefined,
          };
        }
      });

      // Re-sequence after flatMap expansion (EDM multi-cut inserts extra ops)
      for (let si = 0; si < planned.length; si++) {
        planned[si].sequence = si + 1;
      }
      ctx.planned_operations = planned;

      // Aggregate physics summary from orchestrator results
      const kc = CANONICAL_KIENZLE[isoGroup];
      const taylor = CANONICAL_TAYLOR[isoGroup];
      const avgConf = planned.reduce((s, p) => s + (p.confidence ?? 0), 0) / Math.max(planned.length, 1);

      return {
        stage: "speed_feed_optimization",
        stage_index: 6,
        success: true,
        duration_ms: Date.now() - t0,
        data: {
          operations: planned.length,
          iso_group: isoGroup,
          physics: { kc1_1: kc.kc1_1, mc: kc.mc, taylor_n: taylor.n, taylor_C: taylor.C },
          orchestrator_confidence: Math.round(avgConf * 100) / 100,
          per_operation: physicsLog,
          engine: "SpeedFeedOrchestratorEngine (8-resolver, full Kienzle corrections)",
        },
        warnings,
        errors: [],
        engines_used: engines,
      };
    } catch (err: unknown) {
      return {
        stage: "speed_feed_optimization",
        stage_index: 6,
        success: false,
        duration_ms: Date.now() - t0,
        data: {},
        warnings: [],
        errors: [err instanceof Error ? err.message : String(err)],
        engines_used: engines,
      };
    }
  }

  // ── S8: CAM Creation ──────────────────────────────────────────────

  /**
   * Map machine type to Fusion 360 CAM setup type.
   * Ref: Fusion 360 API docs — SetupTypes enum.
   */
  private static machineToSetupType(machType: MachineType): "milling" | "turning" | "mill_turn" | "cutting" {
    switch (machType) {
      case "lathe": return "turning";
      case "mill_turn": return "mill_turn";
      case "wire_edm": return "cutting"; // Fusion 360 uses "cutting" for EDM
      default: return "milling";
    }
  }

  private static async stageCamCreation(
    ctx: Record<string, unknown>,
    input: AutoProgramInput,
  ): Promise<StageResult> {
    const t0 = Date.now();
    const engines: string[] = ["Fusion360LiveBridgeEngine"];
    const warnings: string[] = [];

    try {
      const bridge = ctx.bridge as InstanceType<Awaited<ReturnType<typeof loadBridge>>>;
      const operations = (ctx.planned_operations as PlannedOperation[]) ?? [];
      const machType = (ctx.machine_type as MachineType | undefined) ?? "vmc_3axis";

      if (!bridge) {
        return {
          stage: "cam_creation",
          stage_index: 7,
          success: false,
          duration_ms: Date.now() - t0,
          data: {},
          warnings: [],
          errors: ["No Fusion 360 bridge — model_intake must run first."],
          engines_used: engines,
        };
      }

      const setupType = this.machineToSetupType(machType);
      const whType = (ctx.workholding_type as WorkholdingType | undefined) ?? "vise";
      const setupCount = (ctx.setup_count as number | undefined) ?? 1;

      // ── Stock configuration per machine type ──
      const stockConfig = machType === "lathe" || machType === "mill_turn"
        ? { mode: "cylindrical" as const, bar_diameter_mm: 80, bar_length_mm: 200 }
        : machType === "wire_edm"
          ? { mode: "fixed_size" as const, thickness_mm: 25 }
          : { mode: "relative" as const, offset_top_mm: 2, offset_sides_mm: 2, offset_bottom_mm: 0 };

      // ── Create setups (multi-setup when S4 detected feature splits) ──
      const setupNames: string[] = [];
      const SETUP_LABELS = ["Op1", "Op2", "Op3", "Op4"];
      for (let si = 0; si < setupCount; si++) {
        const suffix = setupCount > 1 ? `-${SETUP_LABELS[si] ?? `Setup${si + 1}`}` : "";
        const setupResult = await bridge.createCamSetup({
          name: `PRISM-${input.program_name ?? "AutoProgram"}${suffix}`,
          type: setupType,
          model_body_indices: [0],
          stock: stockConfig,
          ...(machType === "lathe" || machType === "mill_turn" ? {
            workholding: whType === "chuck" || whType === "collet" ? whType : "chuck",
            spindle_direction: "ccw",
          } : {}),
        });
        if (!setupResult.success) {
          warnings.push(`Setup ${si} creation warning: ${(setupResult as any).error ?? "unknown"}`);
        }
        setupNames.push(setupResult.setup_name);
      }

      // ── Create operations per machine type ──
      let opsCreated = 0;
      const channelOps: Record<string, number> = {};

      for (const op of operations) {
        const isTurning = op.operation_type.startsWith("turning_");
        const isWireEdm = op.operation_type.startsWith("wire_");
        const channelId = op.channel_id;

        // Build machine-type-specific parameters
        const baseParams: Record<string, number | string | boolean | undefined> = {};

        if (isTurning) {
          // Turning: G96/G97 spindle mode, CSS speed or fixed RPM
          baseParams.spindle_mode = op.spindle_mode;
          if (op.spindle_mode === "G96") {
            baseParams.surface_speed_m_min = op.css_surface_speed_m_min;
            baseParams.max_rpm_clamp = op.max_rpm_clamp;
          } else {
            baseParams.spindle_speed_rpm = op.fixed_rpm ?? op.speed_rpm;
          }
          baseParams.feed_per_rev_mm = op.feed_mm_min / Math.max(op.speed_rpm, 1);
          baseParams.depth_of_cut_mm = op.doc_mm;
        } else if (isWireEdm) {
          // Wire EDM: wire parameters instead of rotary cutting params
          baseParams.wire_speed_m_min = op.wire_speed_m_min;
          baseParams.wire_tension_N = op.wire_tension_N;
          baseParams.flushing_pressure_bar = op.flushing_pressure_bar;
          baseParams.wire_offset_mm = op.woc_mm; // kerf = wire dia + spark gap
          const uvOffset = op.uv_offset_mm;
          if (uvOffset && uvOffset > 0) {
            baseParams.taper_uv_offset_mm = uvOffset;
          }
        } else {
          // Milling: standard rotary parameters
          baseParams.spindle_speed_rpm = op.speed_rpm;
          baseParams.feed_cutting_mm_min = op.feed_mm_min;
          baseParams.max_stepdown_mm = op.doc_mm;
          baseParams.max_stepover_mm = op.woc_mm;
        }

        // Mill-turn: tag channel for multi-channel post
        if (channelId) {
          baseParams.channel_id = channelId;
          baseParams.spindle_id = op.spindle_id;
          channelOps[channelId] = (channelOps[channelId] ?? 0) + 1;
        }

        // Route operation to correct setup based on setup_index from S4
        const opSetupIdx = Math.min(op.setup_index ?? 0, setupNames.length - 1);
        const targetSetup = setupNames[opSetupIdx] ?? setupNames[0];

        // EDM multi-cut: tag pass type for post-processor
        if (op.edm_pass_type) {
          baseParams.edm_pass_type = op.edm_pass_type;
          baseParams.edm_pass_index = op.edm_pass_index;
        }

        const opResult = await bridge.createCamOperation({
          setup_name: targetSetup,
          operation_type: op.operation_type,
          parameters: baseParams,
        });

        if (opResult.success) {
          await bridge.assignTool({
            setup_name: targetSetup,
            operation_name: opResult.operation_name,
            tool_spec: {
              diameter_mm: op.tool.diameter_mm,
              type: op.tool.tool_type,
              flute_count: op.tool.flute_count,
              flute_length_mm: op.tool.flute_length_mm,
              overall_length_mm: op.tool.overall_length_mm,
              corner_radius_mm: op.tool.corner_radius_mm,
            },
          });
          opsCreated++;
        }
      }

      ctx.setup_name = setupNames[0];
      ctx.setup_names = setupNames;
      ctx.ops_created = opsCreated;
      ctx.setup_type = setupType;

      if (Object.keys(channelOps).length > 1) {
        warnings.push(
          `Mill-turn multi-channel: ${Object.entries(channelOps).map(([ch, n]) => `${ch}=${n}`).join(", ")} operations.`,
        );
      }

      return {
        stage: "cam_creation",
        stage_index: 7,
        success: true,
        duration_ms: Date.now() - t0,
        data: {
          setup_name: setupNames[0],
          setup_names: setupNames.length > 1 ? setupNames : undefined,
          setup_count: setupNames.length,
          setup_type: setupType,
          operations_created: opsCreated,
          operations_planned: operations.length,
          channel_ops: Object.keys(channelOps).length > 1 ? channelOps : undefined,
        },
        warnings,
        errors: [],
        engines_used: engines,
      };
    } catch (err: unknown) {
      return {
        stage: "cam_creation",
        stage_index: 7,
        success: false,
        duration_ms: Date.now() - t0,
        data: {},
        warnings: [],
        errors: [err instanceof Error ? err.message : String(err)],
        engines_used: engines,
      };
    }
  }

  // ── S9: Verification ──────────────────────────────────────────────
  //
  // Six-layer verification:
  //   1. Machine limits — RPM, power (Kienzle force → P = Fc×Vc/60000/η)
  //   2. Workholding adequacy — grip force vs cutting force per-op
  //      (WorkholdingVerificationEngine: Nee 2004, Hoffman 5th ed.)
  //   3. Clamping force requirements — required F_clamp per-op
  //      (WorkholdingForceEngine: F_clamp = F_cutting × SF / μ, Carr Lane / SME Ch.8)
  //   4. 5-axis rotary limits + singularity zone detection
  //      (KINEMATIC_LIMITS + FIVE_AXIS_COLLISION_ZONE: Bohez 2002)
  //   5. Lathe tailstock clearance validation
  //      (LATHE_TAILSTOCK_DEFAULTS: Sandvik §1.5, Haas §6.3)
  //   6. Mill-turn channel interference detection
  //      (MILL_TURN_INTERFERENCE: Mazak e-Tower, Siemens COLL_MONITOR)
  //

  private static async stageVerification(
    ctx: Record<string, unknown>,
  ): Promise<StageResult> {
    const t0 = Date.now();
    const engines: string[] = ["CAMKernelValidationEngine"];
    const warnings: string[] = [];

    try {
      const operations = (ctx.planned_operations as PlannedOperation[]) ?? [];
      const maxRpm = ctx.max_rpm as number;
      const maxPower = ctx.max_power_kw as number;
      const isoGroup = ctx.iso_group as ISOGroup;
      const whType = (ctx.workholding_type as WorkholdingType | undefined) ?? "vise";
      const clampForceKN = (ctx.clamping_force_kN as number | undefined)
        ?? WORKHOLDING_DEFAULT_FORCE_KN[whType];

      const machType = (ctx.machine_type as MachineType | undefined) ?? "vmc_3axis";

      // ── Layer 1: Machine limit checks ──
      for (const op of operations) {
        const isWireEdm = op.operation_type.startsWith("wire_");
        const isTurning = op.operation_type.startsWith("turning_");

        // Wire EDM: skip rotary cutting checks — verify EDM-specific params instead
        if (isWireEdm) {
          // Wire tension range: 2-25 N (Mitsubishi MV/FA spec)
          if (op.wire_tension_N != null && (op.wire_tension_N < 2 || op.wire_tension_N > 25)) {
            warnings.push(
              `Op ${op.sequence}: wire tension ${op.wire_tension_N}N outside safe range [2..25] N.`,
            );
          }
          // Wire speed range: 1-20 m/min (0.25mm brass wire default)
          // Note: range varies by wire diameter — 0.05mm Mo: 0.5-5, 0.3mm brass: 2-25
          if (op.wire_speed_m_min != null && (op.wire_speed_m_min < 1 || op.wire_speed_m_min > 20)) {
            warnings.push(
              `Op ${op.sequence}: wire speed ${op.wire_speed_m_min} m/min outside range [1..20].`,
            );
          }
          // Flushing pressure: 1-15 bar (Sodick/Mitsubishi standard range)
          if (op.flushing_pressure_bar != null && (op.flushing_pressure_bar < 1 || op.flushing_pressure_bar > 15)) {
            warnings.push(
              `Op ${op.sequence}: flushing pressure ${op.flushing_pressure_bar} bar outside range [1..15].`,
            );
          }
          continue; // skip rotary checks
        }

        // RPM check (milling + turning)
        if (op.speed_rpm > maxRpm) {
          warnings.push(`Op ${op.sequence}: RPM ${op.speed_rpm} exceeds machine limit ${maxRpm}.`);
        }

        // Turning G50 clamp validation: ensure calculated RPM doesn't exceed clamp
        if (isTurning && op.spindle_mode === "G96" && op.max_rpm_clamp != null) {
          const calcRpm = op.calculated_rpm_at_od;
          if (calcRpm != null && calcRpm > op.max_rpm_clamp) {
            warnings.push(
              `Op ${op.sequence}: calculated RPM ${calcRpm} exceeds G50 clamp ${op.max_rpm_clamp}.`,
            );
          }
        }

        // Power check: P = Fc × Vc / (60000 × η), η = 0.85
        // Note: S9 recalculates fz from op.feed_mm_min/(z×N) as a baseline (uncorrected)
        // check. S7's physics-corrected values (K_gamma, K_kappa, K_wear, K_vc, K_coolant)
        // may differ — S9 is intentionally conservative for machine-limit safety.
        // Guard: skip if RPM or flute_count is 0 (prevents division by zero)
        if (op.speed_rpm > 0 && op.tool.flute_count > 0) {
          const kc = CANONICAL_KIENZLE[isoGroup];
          const fz = op.feed_mm_min / (op.tool.flute_count * op.speed_rpm);
          const Fc = kienzleForce(kc.kc1_1, kc.mc, op.doc_mm, fz);
          const Vc = (Math.PI * op.tool.diameter_mm * op.speed_rpm) / 1000;
          const power_kw = (Fc * Vc) / (60000 * 0.85);

          if (power_kw > maxPower) {
            warnings.push(
              `Op ${op.sequence}: estimated ${power_kw.toFixed(1)} kW exceeds ${maxPower} kW limit.`,
            );
          }
        }
      }

      // ── Layer 2: Workholding verification (lazy-load) ──
      let verificationReport: VerificationReport | undefined;
      const opsWithForce = operations.filter(op => op.cutting_force_N != null && op.cutting_force_N > 0);

      if (opsWithForce.length > 0) {
        try {
          const { workholdingVerificationEngine } = await import("./WorkholdingVerificationEngine.js");
          engines.push("WorkholdingVerificationEngine");

          // Build cutting forces array for verifyAllOperations
          const cuttingForces: VerifyCuttingForces[] = opsWithForce.map(op => ({
            Fc_N: op.cutting_force_N!,
            Ff_N: op.cutting_force_N! * 0.4, // feed force ≈ 40% of tangential (Merchant 1945)
            Fp_N: op.cutting_force_N! * 0.25, // passive force ≈ 25% of tangential
            torque_Nm: op.torque_Nm,
            cutting_freq_Hz: (op.speed_rpm * op.tool.flute_count) / 60,
            operation_name: `Op ${op.sequence}: ${op.operation_type}`,
          }));

          // Build workholding config
          const whConfig: WorkholdingConfig = {
            type: WORKHOLDING_TO_VERIFY[whType],
            clamping_force_N: clampForceKN * 1000, // kN → N
            clamp_points: WORKHOLDING_CLAMP_POINTS[whType],
          };

          verificationReport = workholdingVerificationEngine.verifyAllOperations(
            cuttingForces, whConfig,
          );

          // Propagate verification warnings
          if (verificationReport.overall_verdict === "CRITICAL") {
            warnings.push(
              `WORKHOLDING CRITICAL: ${verificationReport.limiting_operation} — ` +
              `safety factor ${verificationReport.min_safety_factor.toFixed(2)} < 1.0. ` +
              `DO NOT PROCEED without re-fixturing.`,
            );
          } else if (verificationReport.overall_verdict === "WARNING") {
            warnings.push(
              `WORKHOLDING WARNING: ${verificationReport.limiting_operation} — ` +
              `safety factor ${verificationReport.min_safety_factor.toFixed(2)} is marginal.`,
            );
          }

          // Per-op resonance warnings
          for (const opResult of verificationReport.operations) {
            if (opResult.resonance_warning) {
              warnings.push(
                `${opResult.operation}: resonance risk — cutting freq near workholding natural freq.`,
              );
            }
          }
        } catch {
          warnings.push("Workholding verification unavailable — engine import failed.");
        }
      }

      // ── Layer 3: Clamping force requirements (lazy-load) ──
      let clampResults: Array<{ op: number; result: ClampForceResult }> = [];

      if (opsWithForce.length > 0) {
        try {
          const { workholdingForceEngine } = await import("./WorkholdingForceEngine.js");
          engines.push("WorkholdingForceEngine");

          for (const op of opsWithForce) {
            const clampInput: ClampForceInput = {
              cutting_force_n: op.cutting_force_N!,
              workholding_type: WORKHOLDING_TO_FORCE[whType],
              num_clamps: WORKHOLDING_CLAMP_POINTS[whType],
            };
            const result = workholdingForceEngine.clampForce(clampInput);
            clampResults.push({ op: op.sequence, result });

            // Check if required force exceeds available
            if (result.required_force.value > clampForceKN * 1000) {
              warnings.push(
                `Op ${op.sequence}: required clamp force ${result.required_force.value}N ` +
                `exceeds available ${clampForceKN * 1000}N (${whType}).`,
              );
            }

            // Forward engine-level warnings
            for (const w of result.warnings) {
              warnings.push(`Op ${op.sequence}: ${w}`);
            }
          }
        } catch {
          warnings.push("Clamping force calculation unavailable — engine import failed.");
        }
      }

      // ── Layer 4: 5-axis rotary limit + singularity zone check ──
      // Validates that operations requiring tilted work planes don't exceed
      // the machine's rotary axis travel limits or fall within singularity zones.
      let fiveAxisWarningCount = 0;
      const is5Axis = machType === "five_axis_3plus2" || machType === "five_axis_simultaneous";
      const kinModel = (ctx.kinematic_model as KinematicModel | undefined)
        ?? (is5Axis ? "trunnion_table" : undefined);

      if (is5Axis && kinModel) {
        const limits = KINEMATIC_LIMITS[kinModel];

        for (const op of operations) {
          // Check tool stick-out for collision risk
          if (op.tool.overall_length_mm > FIVE_AXIS_COLLISION_ZONE.max_safe_tool_stickout_mm) {
            warnings.push(
              `Op ${op.sequence}: tool L=${op.tool.overall_length_mm}mm exceeds ` +
              `5-axis safe stick-out limit ${FIVE_AXIS_COLLISION_ZONE.max_safe_tool_stickout_mm}mm — ` +
              `collision risk at tilted orientations.`,
            );
            fiveAxisWarningCount++;
          }

          // If the operation has feature normals, compute required tilt angle
          // and check against kinematic limits + singularity zone
          const featureNormal = (ctx.features as RecognizedFeature[] | undefined)
            ?.[op.feature_index]?.normal;

          if (featureNormal) {
            // Tilt angle = acos(nz) — full angle from Z-axis [0°..180°].
            // Using raw nz (not |nz|) so undercuts (nz < 0 → tilt > 90°) are
            // correctly detected against rotary axis limits. Clamp to [-1,1]
            // for numerical safety on non-unit normals.
            const tiltDeg = Math.acos(
              Math.max(-1, Math.min(1, featureNormal.z)),
            ) * (180 / Math.PI);

            // Check primary axis limit
            const primaryMax = Math.abs(limits.primary.max_deg);
            const primaryMin = Math.abs(limits.primary.min_deg);
            const maxTilt = Math.max(primaryMax, primaryMin);

            if (tiltDeg > maxTilt - FIVE_AXIS_COLLISION_ZONE.axis_limit_margin_deg) {
              warnings.push(
                `Op ${op.sequence}: required tilt ${tiltDeg.toFixed(1)}° near ` +
                `${limits.primary.axis}-axis limit ` +
                `[${limits.primary.min_deg}..${limits.primary.max_deg}]° — ` +
                `risk of axis over-travel.`,
              );
              fiveAxisWarningCount++;
            }

            // Singularity zone check (tilt near 0°)
            if (tiltDeg < limits.singularity_zone_deg && machType === "five_axis_simultaneous") {
              warnings.push(
                `Op ${op.sequence}: tilt ${tiltDeg.toFixed(1)}° within singularity zone ` +
                `(< ${limits.singularity_zone_deg}°) — C-axis velocity spikes. ` +
                `Consider 3+2 indexed mode for this feature.`,
              );
              fiveAxisWarningCount++;
            }
          }
        }
      }

      // ── Layer 5: Lathe tailstock clearance ──
      // For turning operations, check that tool paths maintain safe distance
      // from the tailstock position (estimated from part length).
      let tailstockWarningCount = 0;
      const isLathe = machType === "lathe" || machType === "mill_turn";

      if (isLathe) {
        // Estimate part length and diameter from features
        const features = (ctx.features as RecognizedFeature[] | undefined) ?? [];
        let maxPartLength = 0;
        let maxPartDiameter = 0;

        for (const feat of features) {
          const len = feat.dimensions.length_mm ?? feat.dimensions.depth_mm ?? 0;
          const dia = feat.dimensions.diameter_mm ?? 0;
          if (len > maxPartLength) maxPartLength = len;
          if (dia > maxPartDiameter) maxPartDiameter = dia;
        }

        // Tailstock assumed if L/D ratio exceeds threshold
        const ldRatio = maxPartDiameter > 0 ? maxPartLength / maxPartDiameter : 0;
        const tailstockPresent = ldRatio > LATHE_TAILSTOCK_DEFAULTS.ld_ratio_threshold;

        if (tailstockPresent) {
          // Tailstock face position ≈ part length + retract clearance
          const tailstockZ = maxPartLength + LATHE_TAILSTOCK_DEFAULTS.retract_clearance_mm;

          for (const op of operations) {
            const isTurningOp = op.operation_type.startsWith("turning_");
            if (!isTurningOp) continue;

            // Drilling/boring operations approach from Z+ direction toward tailstock
            if (op.operation_type === "turning_drill" || op.operation_type === "turning_bore") {
              // Feature depth tells us how deep the tool travels
              const feat = features[op.feature_index];
              const opDepth = feat?.dimensions.depth_mm ?? op.doc_mm;

              if (opDepth > tailstockZ - LATHE_TAILSTOCK_DEFAULTS.min_clearance_mm) {
                warnings.push(
                  `Op ${op.sequence} (${op.operation_type}): Z-depth ${opDepth.toFixed(1)}mm ` +
                  `may collide with tailstock at Z≈${tailstockZ.toFixed(0)}mm ` +
                  `(L/D=${ldRatio.toFixed(1)}, min clearance ${LATHE_TAILSTOCK_DEFAULTS.min_clearance_mm}mm).`,
                );
                tailstockWarningCount++;
              }
            }

            // Part-off with tailstock present is always a warning
            if (op.operation_type === "turning_part_off" && tailstockPresent) {
              warnings.push(
                `Op ${op.sequence}: part-off with tailstock present — ` +
                `retract tailstock before cutoff to avoid collision.`,
              );
              tailstockWarningCount++;
            }
          }
        }

        ctx.tailstock_present = tailstockPresent;
        ctx.tailstock_ld_ratio = ldRatio;
      }

      // ── Layer 6: Mill-turn channel interference ──
      // Verify that operations across different channels have proper sync codes
      // and don't have overlapping Z-axis ranges.
      let millTurnInterferenceCount = 0;

      if (machType === "mill_turn") {
        // Group operations by channel
        const byChannel: Record<string, PlannedOperation[]> = {};
        for (const op of operations) {
          const ch = op.channel_id ?? "C1";
          (byChannel[ch] ??= []).push(op);
        }
        const channelIds = Object.keys(byChannel);

        // Check 1: Sub-spindle transfer must have both pre and post sync
        if (MILL_TURN_INTERFERENCE.transfer_requires_sync) {
          for (const op of operations) {
            if (op.operation_type === "sub_spindle_transfer") {
              if (!op.sync_before) {
                warnings.push(
                  `Op ${op.sequence}: sub_spindle_transfer missing sync_before — ` +
                  `main spindle may still be rotating during transfer.`,
                );
                millTurnInterferenceCount++;
              }
              if (!op.sync_after) {
                warnings.push(
                  `Op ${op.sequence}: sub_spindle_transfer missing sync_after — ` +
                  `no grip confirmation before releasing part.`,
                );
                millTurnInterferenceCount++;
              }
            }
          }
        }

        // Check 2: Milling channel ops should have main spindle orient sync
        if (MILL_TURN_INTERFERENCE.milling_requires_orient && byChannel["Cm"]) {
          for (const op of byChannel["Cm"]) {
            if (!op.sync_before) {
              warnings.push(
                `Op ${op.sequence} (${op.operation_type}, channel Cm): milling without ` +
                `sync_before — main spindle may not be oriented for live tooling.`,
              );
              millTurnInterferenceCount++;
            }
          }
        }

        // Check 3: Multi-channel programs must end with program_end sync
        if (channelIds.length > 1) {
          const lastOp = operations[operations.length - 1];
          const hasProgramEndSync = operations.some(
            op => op.sync_after === MILL_TURN_SYNC_CODES.program_end.code,
          );
          if (!hasProgramEndSync) {
            warnings.push(
              `Multi-channel program (${channelIds.join(",")}): no M299 program_end sync — ` +
              `channels may not terminate in sync.`,
            );
            millTurnInterferenceCount++;
          }
        }

        ctx.mill_turn_interference_checks = millTurnInterferenceCount;
      }

      ctx.verification_passed = warnings.length === 0;
      ctx.workholding_report = verificationReport;
      ctx.clamp_force_results = clampResults;

      return {
        stage: "verification",
        stage_index: 8,
        success: true, // verification warnings don't block pipeline
        duration_ms: Date.now() - t0,
        data: {
          checks_passed: warnings.length === 0,
          warning_count: warnings.length,
          workholding_verdict: verificationReport?.overall_verdict ?? "NOT_CHECKED",
          min_safety_factor: verificationReport?.min_safety_factor,
          limiting_operation: verificationReport?.limiting_operation,
          ops_with_force_data: opsWithForce.length,
          ops_total: operations.length,
          five_axis_warnings: fiveAxisWarningCount > 0 ? fiveAxisWarningCount : undefined,
          tailstock_present: isLathe ? (ctx.tailstock_present ?? false) : undefined,
          tailstock_warnings: tailstockWarningCount > 0 ? tailstockWarningCount : undefined,
          mill_turn_interference: machType === "mill_turn" ? millTurnInterferenceCount : undefined,
        },
        warnings,
        errors: [],
        engines_used: engines,
      };
    } catch (err: unknown) {
      return {
        stage: "verification",
        stage_index: 8,
        success: true, // non-fatal
        duration_ms: Date.now() - t0,
        data: { fallback: true },
        warnings: [`Verification error: ${err instanceof Error ? err.message : String(err)}`],
        errors: [],
        engines_used: engines,
      };
    }
  }

  // ── S10: Output Package ───────────────────────────────────────────

  private static async stageOutputPackage(
    ctx: Record<string, unknown>,
    input: AutoProgramInput,
  ): Promise<StageResult> {
    const t0 = Date.now();
    const engines: string[] = ["Fusion360LiveBridgeEngine", "SetupSheetEngine"];
    const warnings: string[] = [];

    try {
      const bridge = ctx.bridge as InstanceType<Awaited<ReturnType<typeof loadBridge>>>;
      const operations = (ctx.planned_operations as PlannedOperation[]) ?? [];

      // Generate toolpaths
      if (bridge && (ctx.ops_created as number) > 0) {
        const tpResult = await bridge.generateToolpaths({ generate_all: true });
        if (tpResult.success && tpResult.job_id) {
          // Poll for completion (max 180s)
          const deadline = Date.now() + 180000;
          let status = "generating";
          while (status === "generating" && Date.now() < deadline) {
            await new Promise(r => setTimeout(r, 2000));
            const poll = await bridge.getToolpathStatus(tpResult.job_id);
            status = poll.status;
          }

          if (status !== "complete") {
            warnings.push(`Toolpath generation ${status}. G-code post-processing skipped.`);
          } else if (input.post_processor_path) {
            // ── SAFETY GATE (F360-REV-MS1 U-SAF03) ──────────────────
            // Mandatory safety assessment before G-code emission.
            // Cannot be bypassed — no config flag skips this gate.
            try {
              const { pipelineSafetyOrchestratorEngine } = await import("./PipelineSafetyOrchestratorEngine.js");
              for (const op of operations) {
                const toolDia = op.tool?.diameter_mm ?? 10;
                const numTeeth = op.tool?.flute_count ?? 4;
                const stickout = toolDia * 4; // conservative 4xD overhang estimate
                const vcMpm = (op.speed_rpm * Math.PI * toolDia) / 1_000_000 * 1000;
                const fzMm = op.speed_rpm > 0 ? op.feed_mm_min / (op.speed_rpm * numTeeth) : 0.1;
                const safetyResult = pipelineSafetyOrchestratorEngine.assess(
                  {
                    name: op.operation_type,
                    vc_mpm: vcMpm,
                    fz_mm: fzMm,
                    ap_mm: op.doc_mm,
                    ae_mm: op.woc_mm,
                    tool_diameter_mm: toolDia,
                    num_teeth: numTeeth,
                    tool_stickout_mm: stickout,
                  },
                  { kc1_1: (ctx.kc1_1 as number) ?? 1800, mc: (ctx.mc as number) ?? 0.25, T_melt_C: (ctx.T_melt_C as number) ?? 1450 },
                  { max_rpm: (ctx.max_rpm as number) ?? 12000, max_power_kW: (ctx.max_power_kw as number) ?? 15 },
                  { material: "carbide", tensile_strength_MPa: 3500 },
                  { grip_force_N: 20000, friction_coefficient: 0.15 },
                );
                const vetoResult = pipelineSafetyOrchestratorEngine.veto(safetyResult);
                if (vetoResult.vetoed) {
                  const vetoMsg = `SAFETY VETO on "${op.operation_type}": ${vetoResult.reasons.join("; ")}. G-code NOT emitted. Fix parameters before proceeding.`;
                  warnings.push(vetoMsg);
                  ctx.safety_vetoed = true;
                  return {
                    stage: "output_package" as AutoProgramStage,
                    stage_index: 10,
                    success: false,
                    engines_used: [...engines, "PipelineSafetyOrchestratorEngine"],
                    warnings,
                    errors: [vetoMsg],
                    data: { safety_vetoed: true },
                    duration_ms: Date.now() - t0,
                  };
                }
                if (safetyResult.risk_level === "warning" || safetyResult.risk_level === "critical" || safetyResult.risk_level === "veto") {
                  warnings.push(`[SAFETY-WARN] "${op.operation_type}": risk=${safetyResult.risk_level} — review before running. ${safetyResult.justification.join("; ")}`);
                }
              }
            } catch (e: unknown) {
              // Safety engine failed — FAIL-CLOSE: do NOT emit G-code without safety assessment
              const failMsg = `SAFETY GATE FAILED: ${e instanceof Error ? e.message : String(e)}. G-code NOT emitted (fail-close policy).`;
              warnings.push(failMsg);
              return {
                stage: "output_package" as AutoProgramStage,
                stage_index: 10,
                success: false,
                engines_used: [...engines, "PipelineSafetyOrchestratorEngine"],
                warnings,
                errors: [failMsg],
                data: { safety_gate_failed: true },
                duration_ms: Date.now() - t0,
              };
            }
            // ── END SAFETY GATE ──────────────────────────────────────

            // Post-process to G-code (only reached if safety gate passed)
            const postResult = await bridge.postProcess({
              post_processor_path: input.post_processor_path,
              program_name: input.program_name ?? "O1001",
              output_folder: input.output_folder ?? "",
              output_units: input.output_units,
            });
            ctx.gcode_file = postResult.output_file;
            ctx.gcode_lines = postResult.line_count;
          }
        }
      }

      // ── Generate machine-aware setup sheet ──
      const machType = (ctx.machine_type as MachineType | undefined) ?? "vmc_3axis";
      const MACHINE_LABELS: Record<MachineType, string> = {
        vmc_3axis: "VMC 3-Axis",
        hmc_4axis: "HMC 4-Axis",
        five_axis_3plus2: "5-Axis (3+2)",
        five_axis_simultaneous: "5-Axis Simultaneous",
        lathe: "Lathe",
        mill_turn: "Mill-Turn",
        wire_edm: "Wire EDM",
      };

      const sheetLines: string[] = [
        `SETUP SHEET — ${input.program_name ?? "O1001"}`,
        `Material: ${ctx.material} (ISO ${ctx.iso_group})`,
        `Machine: ${ctx.machine ?? MACHINE_LABELS[machType]}`,
        `Type: ${MACHINE_LABELS[machType]}`,
        "",
      ];

      const isLatheType = machType === "lathe" || machType === "mill_turn";
      const isWireEdm = machType === "wire_edm";

      if (isWireEdm) {
        // Wire EDM setup sheet: wire params instead of RPM/feed
        sheetLines.push(
          "SEQ | OPERATION           | WIRE SPD | TENSION | FLUSH | UV OFFSET",
          "----|--------------------|---------:|--------:|------:|----------:",
        );
        for (const op of operations) {
          const uv = op.uv_offset_mm;
          sheetLines.push(
            `${String(op.sequence).padStart(3)} | ${op.operation_type.padEnd(18)} | ${(op.wire_speed_m_min ?? 0).toFixed(0).padStart(5)} m/m | ${(op.wire_tension_N ?? 0).toFixed(0).padStart(4)} N | ${(op.flushing_pressure_bar ?? 0).toFixed(0).padStart(3)} bar | ${uv != null && uv > 0 ? uv.toFixed(3) + " mm" : "—"}`,
          );
        }
      } else if (isLatheType) {
        // Turning setup sheet: G96/G97, CSS speed, RPM clamp
        sheetLines.push(
          "SEQ | OPERATION       | MODE | CSS/RPM  | CLAMP | TOOL                  | DOC" +
            (machType === "mill_turn" ? "  | CH" : ""),
          "----|----------------|------|---------|------:|-----------------------|------" +
            (machType === "mill_turn" ? "|----" : ""),
        );
        for (const op of operations) {
          const mode = op.spindle_mode ?? "G97";
          const speedCol = mode === "G96"
            ? `${(op.css_surface_speed_m_min ?? 0).toFixed(0)} m/m`
            : `${op.speed_rpm} rpm`;
          const clampCol = op.max_rpm_clamp != null ? String(op.max_rpm_clamp) : "—";
          const chCol = machType === "mill_turn"
            ? ` | ${op.channel_id ?? "C1"}`
            : "";
          sheetLines.push(
            `${String(op.sequence).padStart(3)} | ${op.operation_type.padEnd(14)} | ${mode} | ${speedCol.padStart(7)} | ${clampCol.padStart(5)} | D${op.tool.diameter_mm} ${op.tool.tool_type.substring(0, 12).padEnd(12)} | ${op.doc_mm.toFixed(1).padStart(5)}${chCol}`,
          );
        }
      } else {
        // Milling setup sheet (original format)
        sheetLines.push(
          "SEQ | OPERATION       | TOOL                  | RPM   | FEED    | DOC   | WOC",
          "----|----------------|-----------------------|-------|---------|-------|------",
        );
        for (const op of operations) {
          sheetLines.push(
            `${String(op.sequence).padStart(3)} | ${op.operation_type.padEnd(14)} | D${op.tool.diameter_mm} ${op.tool.flute_count}FL ${op.tool.tool_type.substring(0, 10).padEnd(10)} | ${String(op.speed_rpm).padStart(5)} | ${String(op.feed_mm_min).padStart(7)} | ${op.doc_mm.toFixed(1).padStart(5)} | ${op.woc_mm.toFixed(1).padStart(5)}`,
          );
        }
      }

      ctx.setup_sheet = sheetLines.join("\n");
      ctx.machine_label = MACHINE_LABELS[machType];

      // Generate machine-type-specific G-code header/footer
      const programName = input.program_name ?? "O1001";
      const gcodeHeader = this.generateMachineHeader(machType, programName, operations);
      const gcodeFooter = this.generateMachineFooter(machType);
      ctx.gcode_header = gcodeHeader;
      ctx.gcode_footer = gcodeFooter;

      // Generate channel sync lines for mill-turn programs
      const syncLines = machType === "mill_turn"
        ? this.generateChannelSyncLines(operations)
        : [];
      ctx.channel_sync_lines = syncLines;

      // Generate per-operation tool change + coolant + cutting body G-code blocks
      const toolChangeBlocks: Array<{ seq: number; lines: string[] }> = [];
      const operationBodyBlocks: Array<{ seq: number; lines: string[] }> = [];
      for (let oi = 0; oi < operations.length; oi++) {
        const op = operations[oi];
        const tcLines = this.generateToolChange(machType, op, oi);
        const coolOn = this.generateCoolantOn(machType, op);
        const coolOff = this.generateCoolantOff(machType);
        const bodyLines = this.generateOperationBody(op, machType);
        const { approach_lines, retract_lines } = this.generateApproachRetract(op);

        if (tcLines.length > 0 || coolOn.length > 0) {
          toolChangeBlocks.push({
            seq: op.sequence,
            lines: [...tcLines, ...coolOn, `(OP ${op.sequence}: ${op.operation_type})`, ...coolOff],
          });
        }

        if (bodyLines.length > 0) {
          operationBodyBlocks.push({
            seq: op.sequence,
            lines: [...approach_lines, ...bodyLines, ...retract_lines],
          });
        }
      }
      ctx.tool_change_blocks = toolChangeBlocks;
      ctx.operation_body_blocks = operationBodyBlocks;

      return {
        stage: "output_package",
        stage_index: 9,
        success: true,
        duration_ms: Date.now() - t0,
        data: {
          gcode_file: ctx.gcode_file,
          gcode_lines: ctx.gcode_lines,
          has_setup_sheet: true,
          gcode_header_lines: gcodeHeader.length,
          gcode_footer_lines: gcodeFooter.length,
          machine_type: machType,
          channel_sync_points: syncLines.length > 0 ? syncLines.length : undefined,
          tool_change_blocks: toolChangeBlocks.length > 0 ? toolChangeBlocks.length : undefined,
          operation_body_blocks: operationBodyBlocks.length > 0 ? operationBodyBlocks.length : undefined,
        },
        warnings,
        errors: [],
        engines_used: engines,
      };
    } catch (err: unknown) {
      return {
        stage: "output_package",
        stage_index: 9,
        success: false,
        duration_ms: Date.now() - t0,
        data: {},
        warnings: [],
        errors: [err instanceof Error ? err.message : String(err)],
        engines_used: engines,
      };
    }
  }

  // ── G-code Header/Footer per Machine Type ──────────────────────────

  /**
   * Generate machine-type-specific G-code preamble block.
   * Each machine type has unique initialization codes:
   *   - VMC/HMC: G17 (XY plane), G90 (absolute), G21 (metric), G40/G49 (cancel comp)
   *   - Lathe: G18 (XZ plane), G96/G97 (spindle mode), G50 (RPM clamp)
   *   - Mill-turn: channel declarations ($1/$2) + sync codes
   *   - Wire EDM: technology table, wire threading, flushing
   *   - 5-axis: RTCP/TCPC enable (G43.4/G43.5 or TRAORI)
   *
   * Ref: Fanuc 0i-MF/TF Operator's Manual, Siemens 840D Programming Guide,
   * Mitsubishi M80 CNC Manual, Haas NGC Programming Manual.
   */
  static generateMachineHeader(
    machType: MachineType,
    programName: string,
    ops: PlannedOperation[],
  ): string[] {
    const lines: string[] = [];
    const pgm = programName || "O1001";

    switch (machType) {
      case "vmc_3axis":
      case "hmc_4axis":
        lines.push(
          `%`, `${pgm} (PRISM AUTO-PROGRAM)`,
          `G17 G21 G40 G49 G80 G90 (INIT: XY PLANE, METRIC, CANCEL COMP)`,
          `G28 G91 Z0. (HOME Z)`,
        );
        if (machType === "hmc_4axis") {
          lines.push(`G28 B0. (HOME B-AXIS)`);
        }
        break;

      case "five_axis_3plus2":
        lines.push(
          `%`, `${pgm} (PRISM 5-AXIS 3+2)`,
          `G17 G21 G40 G49 G80 G90`,
          `G28 G91 Z0.`,
          `G43.4 H0 (RTCP ENABLE — TOOL CENTER POINT CONTROL)`,
        );
        break;

      case "five_axis_simultaneous":
        lines.push(
          `%`, `${pgm} (PRISM 5-AXIS SIMULTANEOUS)`,
          `G17 G21 G40 G49 G80 G90`,
          `G28 G91 Z0.`,
          `G43.5 H0 (RTCP ENABLE — 5-AXIS SIMULTANEOUS TCPC)`,
        );
        break;

      case "lathe": {
        const firstCssOp = ops.find(o => o.spindle_mode === "G96");
        // Derive clamp from ops, falling back to 90% of lathe default max RPM
        const clamp = firstCssOp?.max_rpm_clamp ?? Math.round(MACHINE_DEFAULTS.lathe.max_rpm * 0.9);
        lines.push(
          `%`, `${pgm} (PRISM TURNING)`,
          `G18 G21 G40 G80 G99 (INIT: XZ PLANE, METRIC, FEED/REV)`,
          `G28 U0. W0. (HOME X Z)`,
          `G50 S${clamp} (RPM CLAMP FOR CSS)`,
        );
        break;
      }

      case "mill_turn": {
        const hasSubSpindle = ops.some(o => o.channel_id === "C2");
        const hasLiveTooling = ops.some(o => o.channel_id === "Cm");
        const clamp = ops.find(o => o.spindle_mode === "G96")?.max_rpm_clamp ?? 4000;
        lines.push(
          `%`, `${pgm} (PRISM MILL-TURN)`,
          `$1 (CHANNEL 1 — MAIN SPINDLE)`,
          `G18 G21 G40 G80 G99`,
          `G28 U0. W0.`,
          `G50 S${clamp}`,
        );
        if (hasSubSpindle) {
          lines.push(
            `$2 (CHANNEL 2 — SUB-SPINDLE)`,
            `G18 G21 G40 G80 G99`,
          );
        }
        if (hasLiveTooling) {
          lines.push(
            `$3 (CHANNEL 3 — MILLING SPINDLE)`,
            `G17 G21 G40 G49 G80 G90`,
          );
        }
        break;
      }

      case "wire_edm":
        lines.push(
          `%`, `${pgm} (PRISM WIRE EDM)`,
          `G90 G92 X0. Y0. (ABS MODE, DATUM SET)`,
          `G21 (METRIC)`,
          `M50 (WIRE THREADING)`,
          `M01 (OPTIONAL STOP — VERIFY WIRE THREADED)`,
        );
        break;
    }

    return lines;
  }

  /**
   * Generate machine-type-specific G-code postamble block.
   * Ref: same controller manuals as generateMachineHeader.
   */
  static generateMachineFooter(machType: MachineType): string[] {
    switch (machType) {
      case "vmc_3axis":
      case "hmc_4axis":
        return [
          `G28 G91 Z0. (HOME Z)`,
          `M05 (SPINDLE STOP)`,
          `M09 (COOLANT OFF)`,
          `M30 (END PROGRAM)`,
          `%`,
        ];

      case "five_axis_3plus2":
      case "five_axis_simultaneous":
        return [
          `G49 (CANCEL RTCP)`,
          `G28 G91 Z0.`,
          `M05`, `M09`,
          `M30`, `%`,
        ];

      case "lathe":
        return [
          `G28 U0. W0. (HOME)`,
          `M05 (SPINDLE STOP)`,
          `M09 (COOLANT OFF)`,
          `M30`, `%`,
        ];

      case "mill_turn":
        return [
          `$1`,
          `G28 U0. W0.`,
          `M05`, `M09`,
          `$2`,
          `M05`,
          `M30`, `%`,
        ];

      case "wire_edm":
        return [
          `M51 (CUT WIRE)`,
          `M09 (FLUSHING OFF)`,
          `G28 G91 X0. Y0. (HOME)`,
          `M30`, `%`,
        ];
    }
  }

  // ── Turning Approach/Retract G-code ─────────────────────────────

  /**
   * Generate turning approach and retract G-code for a single operation.
   *
   * Approach patterns:
   *   rapid_xy: G00 X[clearance] Z[clearance] then feed engage
   *   feed_angle: G01 approach at 3° angle for smooth entry
   *   plunge: G01 X radial plunge (groove/part-off)
   *   thread_start: G00 to thread start Z, 29.5° compound infeed
   *
   * Retract patterns:
   *   rapid_45deg: G00 retract at 45° for chip break
   *   rapid_x: G00 X retract only (bore/thread)
   *   rapid_z: G00 Z retract only (face/drill)
   *   spring_pass: G01 repeat at zero DOC then retract
   *   peck_retract: G00 Z retract to clearance (groove/part-off peck cycle)
   *
   * Ref: Sandvik Coromant §3, ISO 3685 §4.2, CNC Programming Handbook (Peter Smid) §19.
   */
  static generateApproachRetract(op: PlannedOperation): {
    approach_lines: string[];
    retract_lines: string[];
  } {
    const approach: string[] = [];
    const retract: string[] = [];
    const pattern = TURNING_APPROACH_RETRACT[op.operation_type];
    if (!pattern) {
      return { approach_lines: [], retract_lines: [] };
    }
    const cl = pattern.clearance_mm;

    // Approach
    switch (op.approach_type) {
      case "rapid_xy":
        approach.push(`G00 X${cl.toFixed(1)} Z${cl.toFixed(1)} (APPROACH: RAPID TO CLEARANCE)`);
        break;
      case "feed_angle":
        approach.push(`G00 X${cl.toFixed(1)} Z${cl.toFixed(1)} (APPROACH: POSITION)`);
        approach.push(`G01 X0. Z0. F${(op.feed_mm_min * 0.5).toFixed(0)} (FEED ENGAGE AT HALF RATE)`);
        break;
      case "plunge":
        approach.push(`G00 Z0. (APPROACH: POSITION AT GROOVE/PART-OFF Z)`);
        approach.push(`G01 X-${(op.doc_mm).toFixed(2)} F${(op.feed_mm_min * 0.3).toFixed(0)} (RADIAL PLUNGE)`);
        break;
      case "thread_start":
        approach.push(`G00 Z${cl.toFixed(1)} (APPROACH: THREAD START + LEAD-IN)`);
        break;
      case "none":
        break;
    }

    // Retract
    switch (op.retract_type) {
      case "rapid_45deg":
        approach.push(`(RETRACT: 45DEG CHIP BREAK)`);
        retract.push(`G00 U${cl.toFixed(1)} W${cl.toFixed(1)} (45DEG RETRACT)`);
        break;
      case "rapid_x":
        retract.push(`G00 X${(cl + 5).toFixed(1)} (RETRACT X CLEAR)`);
        break;
      case "rapid_z":
        retract.push(`G00 Z${cl.toFixed(1)} (RETRACT Z CLEAR)`);
        break;
      case "spring_pass":
        retract.push(`(SPRING PASS: REPEAT AT ZERO DOC FOR SURFACE FINISH)`);
        retract.push(`G00 X${cl.toFixed(1)} (RETRACT AFTER SPRING PASS)`);
        break;
      case "peck_retract":
        retract.push(`G00 Z${cl.toFixed(1)} (PECK RETRACT TO CLEARANCE)`);
        break;
      case "none":
        break;
    }

    return { approach_lines: approach, retract_lines: retract };
  }

  // ── Per-Operation G-code Body ───────────────────────────────────

  /**
   * Generate the actual cutting G-code body for a single operation.
   *
   * Each operation type produces a distinct motion sequence:
   *   - Milling: G01/G02/G03 with cutter compensation (G41/G42) where needed
   *   - Turning: G71 roughing cycle, G70 finish cycle, G76 threading
   *   - Wire EDM: G-code with UV offsets and wire threading
   *   - Drilling: G81/G83 canned cycles
   *
   * Returns the G-code lines for the cutting body (between approach and retract).
   * The output uses parametric placeholders for actual coordinates (which come
   * from the CAM system in S8). This provides the structural blocks — S8 fills
   * in exact X/Y/Z values from the toolpath.
   *
   * Ref: Fanuc 0i-MF Operator's Manual §6 "Canned Cycles",
   * Fanuc 0i-TF §10 "Fixed Cycles for Turning", ISO 6983.
   */
  static generateOperationBody(
    op: PlannedOperation,
    machType: MachineType,
  ): string[] {
    const lines: string[] = [];
    const F = op.feed_mm_min;
    const S = op.speed_rpm;
    const doc = op.doc_mm;
    const woc = op.woc_mm;
    const passes = op.pass_count ?? 1;
    const dpp = op.depth_per_pass_mm ?? doc;

    switch (op.operation_type) {
      // ── Milling operations ──
      case "face_mill":
        lines.push(`(FACE MILL: WOC=${woc.toFixed(1)} DOC=${doc.toFixed(1)})`);
        lines.push(`G01 Z-${doc.toFixed(3)} F${(F * 0.5).toFixed(0)} (PLUNGE TO DEPTH)`);
        lines.push(`G01 X[FACE_END] F${F.toFixed(0)} (FACE PASS)`);
        lines.push(`G00 Z2.0 (RETRACT)`);
        break;

      case "adaptive_clear":
      case "trochoidal":
        lines.push(`(ADAPTIVE CLEAR: DOC=${doc.toFixed(1)} WOC=${woc.toFixed(1)})`);
        for (let p = 1; p <= Math.min(passes, 5); p++) {
          const depth = (p * dpp).toFixed(3);
          lines.push(`G01 Z-${depth} F${(F * 0.3).toFixed(0)} (PLUNGE PASS ${p})`);
          lines.push(`G01 X[PATH] Y[PATH] F${F.toFixed(0)} (ADAPTIVE PASS ${p})`);
        }
        if (passes > 5) lines.push(`(... ${passes - 5} more passes)`);
        lines.push(`G00 Z5.0 (RETRACT)`);
        break;

      case "pocket_2d":
        lines.push(`(POCKET 2D: DOC=${doc.toFixed(1)} WOC=${woc.toFixed(1)})`);
        lines.push(`G01 Z-${doc.toFixed(3)} F${(F * 0.3).toFixed(0)} (RAMP IN)`);
        lines.push(`G41 D[TOOL] (CUTTER COMP LEFT)`);
        lines.push(`G01 X[POCKET_PATH] Y[POCKET_PATH] F${F.toFixed(0)} (POCKET CONTOUR)`);
        lines.push(`G40 (CANCEL CUTTER COMP)`);
        lines.push(`G00 Z5.0 (RETRACT)`);
        break;

      case "contour_2d":
        lines.push(`(CONTOUR 2D: DOC=${doc.toFixed(1)})`);
        lines.push(`G01 Z-${doc.toFixed(3)} F${(F * 0.5).toFixed(0)} (PLUNGE)`);
        lines.push(`G41 D[TOOL] (CUTTER COMP LEFT)`);
        lines.push(`G01 X[CONTOUR] Y[CONTOUR] F${F.toFixed(0)} (CONTOUR PATH)`);
        lines.push(`G40 (CANCEL CUTTER COMP)`);
        lines.push(`G00 Z5.0 (RETRACT)`);
        break;

      case "drill_peck":
        lines.push(`(PECK DRILL: DEPTH=${doc.toFixed(1)} PECK=${dpp.toFixed(1)})`);
        lines.push(`G83 Z-${doc.toFixed(3)} Q${dpp.toFixed(3)} R2.0 F${F.toFixed(0)} (PECK CYCLE)`);
        lines.push(`G80 (CANCEL CYCLE)`);
        break;

      case "bore":
        lines.push(`(BORE: DEPTH=${doc.toFixed(1)})`);
        lines.push(`G85 Z-${doc.toFixed(3)} R2.0 F${F.toFixed(0)} (BORE CYCLE)`);
        lines.push(`G80 (CANCEL CYCLE)`);
        break;

      case "ream":
        lines.push(`(REAM: DEPTH=${doc.toFixed(1)})`);
        lines.push(`G85 Z-${doc.toFixed(3)} R2.0 F${F.toFixed(0)} (REAM CYCLE)`);
        lines.push(`G80 (CANCEL CYCLE)`);
        break;

      case "tap":
        lines.push(`(TAP: DEPTH=${doc.toFixed(1)})`);
        lines.push(`G84 Z-${doc.toFixed(3)} R2.0 F${F.toFixed(0)} (TAP CYCLE)`);
        lines.push(`G80 (CANCEL CYCLE)`);
        break;

      case "chamfer":
        lines.push(`(CHAMFER: DOC=${doc.toFixed(1)})`);
        lines.push(`G01 Z-${doc.toFixed(3)} F${F.toFixed(0)} (CHAMFER CUT)`);
        lines.push(`G00 Z2.0 (RETRACT)`);
        break;

      case "slot":
        lines.push(`(SLOT: DOC=${doc.toFixed(1)} WOC=${woc.toFixed(1)})`);
        lines.push(`G01 Z-${doc.toFixed(3)} F${(F * 0.3).toFixed(0)} (RAMP IN)`);
        lines.push(`G01 X[SLOT_END] F${F.toFixed(0)} (SLOT CUT)`);
        lines.push(`G00 Z5.0 (RETRACT)`);
        break;

      // ── 5-axis operations ──
      case "swarf":
        lines.push(`(SWARF 5-AXIS: DOC=${doc.toFixed(1)})`);
        lines.push(`G01 Z-${doc.toFixed(3)} A[TILT] C[ROT] F${F.toFixed(0)} (SWARF CUT)`);
        break;

      case "flow_cut":
        lines.push(`(FLOW CUT 5-AXIS: DOC=${doc.toFixed(1)})`);
        lines.push(`G01 X[PATH] Y[PATH] Z[PATH] A[TILT] C[ROT] F${F.toFixed(0)} (FLOWLINE)`);
        break;

      case "blade_machining":
        lines.push(`(BLADE 5-AXIS: DOC=${doc.toFixed(1)})`);
        lines.push(`G01 X[PATH] Y[PATH] Z[PATH] A[TILT] C[ROT] F${F.toFixed(0)} (BLADE PASS)`);
        break;

      case "impeller":
        lines.push(`(IMPELLER 5-AXIS: DOC=${doc.toFixed(1)})`);
        lines.push(`G01 X[PATH] Y[PATH] Z[PATH] A[TILT] C[ROT] F${F.toFixed(0)} (IMPELLER VANE)`);
        break;

      case "port_machining":
        lines.push(`(PORT 5-AXIS: DOC=${doc.toFixed(1)})`);
        lines.push(`G01 X[PATH] Y[PATH] Z[PATH] A[TILT] C[ROT] F${F.toFixed(0)} (PORT CUT)`);
        break;

      case "indexed_5axis":
      case "multiaxis_contour":
        lines.push(`(INDEXED 3+2: DOC=${doc.toFixed(1)})`);
        lines.push(`G68.2 X0 Y0 Z0 I[TILT] J0 K[ROT] (TILTED WORK PLANE)`);
        lines.push(`G01 Z-${doc.toFixed(3)} F${F.toFixed(0)} (CUT AT INDEXED ANGLE)`);
        lines.push(`G69 (CANCEL TILTED PLANE)`);
        break;

      // ── Turning operations ──
      case "turning_rough": {
        lines.push(`(TURNING ROUGH: ${passes} PASS${passes > 1 ? "ES" : ""}, DPP=${dpp.toFixed(2)})`);
        const spindleLine = op.spindle_mode === "G96"
          ? `G96 S${(op.css_surface_speed_m_min ?? 200).toFixed(0)} (CSS)`
          : `G97 S${S} (CONSTANT RPM)`;
        lines.push(spindleLine);
        if (op.max_rpm_clamp) lines.push(`G50 S${op.max_rpm_clamp} (RPM CLAMP)`);
        lines.push(`G71 U${dpp.toFixed(2)} R1.0 (ROUGH CYCLE: DOC=${dpp.toFixed(2)})`);
        lines.push(`G71 P[NS] Q[NF] U0.3 W0.1 F${F.toFixed(0)} (STOCK ALLOWANCE)`);
        break;
      }

      case "turning_finish": {
        lines.push(`(TURNING FINISH)`);
        const spindleLine = op.spindle_mode === "G96"
          ? `G96 S${(op.css_surface_speed_m_min ?? 250).toFixed(0)} (CSS)`
          : `G97 S${S} (CONSTANT RPM)`;
        lines.push(spindleLine);
        if (op.max_rpm_clamp) lines.push(`G50 S${op.max_rpm_clamp} (RPM CLAMP)`);
        lines.push(`G70 P[NS] Q[NF] (FINISH CYCLE — TRACE ROUGH PROFILE)`);
        break;
      }

      case "turning_bore":
        lines.push(`(TURNING BORE: ${passes} PASS${passes > 1 ? "ES" : ""}, DPP=${dpp.toFixed(2)})`);
        lines.push(`G71 U${dpp.toFixed(2)} R1.0 (BORE ROUGH CYCLE)`);
        lines.push(`G71 P[NS] Q[NF] U-0.3 W0.1 F${F.toFixed(0)} (BORE STOCK ALLOWANCE)`);
        break;

      case "turning_face":
        lines.push(`(TURNING FACE: DOC=${doc.toFixed(1)})`);
        lines.push(`G72 W${dpp.toFixed(2)} R1.0 (FACING CYCLE)`);
        lines.push(`G72 P[NS] Q[NF] U0.3 W0.1 F${F.toFixed(0)} (FACING PASS)`);
        break;

      case "turning_groove":
        lines.push(`(TURNING GROOVE: DEPTH=${doc.toFixed(1)} WIDTH=${woc.toFixed(1)})`);
        lines.push(`G75 R1.0 (GROOVING CYCLE PECK)`);
        lines.push(`G75 X[GROOVE_DIA] Z[GROOVE_Z] P${(dpp * 1000).toFixed(0)} Q${(woc * 1000).toFixed(0)} F${F.toFixed(0)}`);
        break;

      case "turning_thread":
        lines.push(`(THREAD: ${passes} PASS${passes > 1 ? "ES" : ""})`);
        lines.push(`G97 S${S} (CONSTANT RPM FOR THREADING)`);
        lines.push(`G76 P[PASSES]0060 Q${(dpp * 1000).toFixed(0)} R0.0 (THREAD CYCLE SETUP)`);
        lines.push(`G76 X[MINOR_DIA] Z[THREAD_END] P${(doc * 1000).toFixed(0)} Q${(dpp * 1000).toFixed(0)} F[PITCH] (THREAD CUT)`);
        break;

      case "turning_part_off":
        lines.push(`(PART-OFF: DEPTH=${doc.toFixed(1)})`);
        lines.push(`G97 S${S} (CONSTANT RPM)`);
        lines.push(`G01 X[PART_OFF_DIA] F${F.toFixed(0)} (PART-OFF PLUNGE)`);
        break;

      case "turning_drill":
        lines.push(`(CENTER/AXIAL DRILL: DEPTH=${doc.toFixed(1)})`);
        lines.push(`G97 S${S} (CONSTANT RPM)`);
        lines.push(`G83 Z-${doc.toFixed(3)} Q${dpp.toFixed(3)} R2.0 F${F.toFixed(0)} (PECK DRILL AXIAL)`);
        lines.push(`G80 (CANCEL CYCLE)`);
        break;

      // ── Wire EDM operations ──
      case "wire_profile":
      case "wire_no_core":
      case "wire_open_pocket": {
        const passType = op.edm_pass_type ?? "rough";
        const wireSpd = op.wire_speed_m_min ?? 8;
        const tension = op.wire_tension_N ?? 12;
        lines.push(`(WIRE EDM ${passType.toUpperCase()}: SPD=${wireSpd} T=${tension}N)`);
        if (passType === "rough") {
          lines.push(`M50 (WIRE THREAD)`);
          lines.push(`M85 (FLUSHING ON)`);
        }
        lines.push(`G01 X[PATH] Y[PATH] F${F.toFixed(0)} (WIRE ${passType.toUpperCase()} CUT)`);
        if (passType === "skim") {
          lines.push(`M09 (FLUSHING OFF)`);
          lines.push(`M51 (WIRE CUT)`);
        }
        break;
      }

      case "wire_4axis_taper": {
        const uv = op.uv_offset_mm ?? 0;
        lines.push(`(WIRE 4-AXIS TAPER: UV=${uv.toFixed(3)}mm)`);
        lines.push(`M50 (WIRE THREAD)`);
        lines.push(`G01 X[PATH] Y[PATH] U${uv.toFixed(3)} V${uv.toFixed(3)} F${F.toFixed(0)} (TAPER CUT)`);
        break;
      }

      // ── Mill-turn live tooling ──
      case "live_tool_mill":
        lines.push(`(LIVE TOOL MILLING: DOC=${doc.toFixed(1)} WOC=${woc.toFixed(1)})`);
        lines.push(`G01 Z-${doc.toFixed(3)} F${(F * 0.3).toFixed(0)} (LIVE TOOL ENGAGE)`);
        lines.push(`G01 C[PATH] Z[PATH] F${F.toFixed(0)} (C-AXIS MILLING)`);
        break;

      case "sub_spindle_transfer":
        lines.push(`(SUB-SPINDLE TRANSFER)`);
        lines.push(`M23 (SUB-SPINDLE ADVANCE)`);
        lines.push(`M68 (SUB-SPINDLE CLAMP)`);
        lines.push(`M10 (MAIN CHUCK OPEN)`);
        lines.push(`M24 (SUB-SPINDLE RETRACT WITH PART)`);
        break;

      default:
        lines.push(`(OP: ${op.operation_type} — BODY PLACEHOLDER)`);
        lines.push(`G01 X[PATH] Y[PATH] Z-${doc.toFixed(3)} F${F.toFixed(0)}`);
        break;
    }

    return lines;
  }

  // ── Per-Operation Tool Change & Coolant G-code ─────────────────

  /**
   * Generate machine-type-specific tool change G-code block.
   *
   * Tool change sequences vary significantly by machine type:
   *   - VMC/HMC: T[n] M06 → G43 H[n] Z[safe] (length comp + safe Z)
   *   - 5-axis: T[n] M06 → G43.4/G43.5 H[n] (RTCP re-engage after change)
   *   - Lathe: T[turret][offset] (e.g., T0101 = turret pos 1, offset 1)
   *   - Mill-turn: per-channel tool change (turret for C1/C2, ATC for Cm)
   *   - Wire EDM: no tool change (single wire for entire program)
   *
   * Ref: Fanuc 0i-MF §5.4 "Tool Function", Haas NGC §4.3 "Tool Change",
   * Okuma OSP-P300 Tool Management, Mazak SmoothG §7 "Multi-Tasking Tool Call".
   */
  static generateToolChange(
    machType: MachineType,
    op: PlannedOperation,
    toolIndex: number,
  ): string[] {
    const lines: string[] = [];
    const tNum = toolIndex + 1; // 1-based tool number

    switch (machType) {
      case "vmc_3axis":
      case "hmc_4axis":
        lines.push(
          `G28 G91 Z0. (TOOL CHANGE SAFE Z)`,
          `T${tNum} M06 (TOOL ${tNum}: ${op.tool.tool_type} D${op.tool.diameter_mm})`,
          `G43 H${tNum} Z50. (LENGTH COMP + RAPID TO CLEARANCE)`,
        );
        break;

      case "five_axis_3plus2":
        lines.push(
          `G49 (CANCEL RTCP BEFORE TOOL CHANGE)`,
          `G28 G91 Z0.`,
          `T${tNum} M06 (TOOL ${tNum}: ${op.tool.tool_type} D${op.tool.diameter_mm})`,
          `G43.4 H${tNum} (RTCP RE-ENGAGE)`,
        );
        break;

      case "five_axis_simultaneous":
        lines.push(
          `G49 (CANCEL TCPC BEFORE TOOL CHANGE)`,
          `G28 G91 Z0.`,
          `T${tNum} M06 (TOOL ${tNum}: ${op.tool.tool_type} D${op.tool.diameter_mm})`,
          `G43.5 H${tNum} (TCPC RE-ENGAGE)`,
        );
        break;

      case "lathe": {
        // Lathe turret: T[position][offset], e.g., T0101 = pos 1, offset 1
        const turretPos = String(tNum).padStart(2, "0");
        const offsetNum = turretPos; // offset = position for simplicity
        lines.push(
          `G28 U0. (SAFE X HOME BEFORE TURRET INDEX)`,
          `T${turretPos}${offsetNum} (TURRET ${tNum}: ${op.tool.tool_type})`,
        );
        break;
      }

      case "mill_turn": {
        const ch = op.channel_id ?? "C1";
        if (ch === "Cm") {
          // Milling channel: ATC change like VMC
          lines.push(
            `G28 G91 Z0.`,
            `T${tNum} M06 (MILLING TOOL ${tNum}: ${op.tool.tool_type} D${op.tool.diameter_mm})`,
            `G43 H${tNum}`,
          );
        } else {
          // Turning channels (C1/C2): turret index
          const turretPos = String(tNum).padStart(2, "0");
          lines.push(
            `T${turretPos}${turretPos} (TURRET ${tNum}: ${op.tool.tool_type})`,
          );
        }
        break;
      }

      case "wire_edm":
        // Wire EDM: no tool change — wire is the only "tool"
        break;
    }

    return lines;
  }

  /**
   * Generate machine-type-specific coolant on/off G-code.
   *
   * Coolant types by machine:
   *   - VMC/HMC: M08 (flood), M07 (mist for finishing)
   *   - 5-axis: M08 + optional M88 (through-spindle coolant for deep cavities)
   *   - Lathe: M08 (flood) — always on during cutting
   *   - Mill-turn: M08 per channel, M88 for live tool drilling
   *   - Wire EDM: M50/M51 (wire threading/cutting) + flushing (auto-managed)
   *
   * Ref: ISO 6983 M-codes, Fanuc 0i-MF §8 "Miscellaneous Functions",
   * Sandvik Coromant Coolant Application Guide.
   */
  static generateCoolantOn(
    machType: MachineType,
    op: PlannedOperation,
  ): string[] {
    if (machType === "wire_edm") {
      // EDM flushing managed by machine controller, not by explicit M-code per op
      return [`M07 (FLUSHING ON — ${(op.flushing_pressure_bar ?? 6)} BAR)`];
    }

    const isFinish = op.operation_type.includes("finish");
    const isDrilling = op.operation_type === "drill_peck" || op.operation_type === "turning_drill";

    if (machType === "five_axis_3plus2" || machType === "five_axis_simultaneous") {
      // 5-axis: through-spindle coolant for deep drilling/boring
      if (isDrilling) {
        return [`M88 (THROUGH-SPINDLE COOLANT ON)`];
      }
      return [isFinish ? `M07 (MIST COOLANT)` : `M08 (FLOOD COOLANT)`];
    }

    // Milling and turning: flood for roughing, mist for finishing
    return [isFinish ? `M07 (MIST COOLANT)` : `M08 (FLOOD COOLANT)`];
  }

  static generateCoolantOff(machType: MachineType): string[] {
    if (machType === "wire_edm") {
      return []; // flushing managed by controller
    }
    return [`M09 (COOLANT OFF)`];
  }

  // ── Mill-Turn Channel Sync G-code ───────────────────────────────

  /**
   * Generate per-operation synchronization G-code lines for mill-turn programs.
   * Returns lines to insert before/after each operation that has sync codes.
   *
   * Sync M-codes (M200-M299) are blocking waits: the executing channel
   * pauses until the paired channel reaches its matching M-code.
   *
   * Ref: Mazak Integrex Programming Manual §12 "Multi-Tasking Synchronization",
   * Siemens 840D sl/828D Programming Manual §11.5 "WAITM".
   */
  static generateChannelSyncLines(ops: PlannedOperation[]): Array<{
    op_sequence: number;
    before_lines: string[];
    after_lines: string[];
  }> {
    const result: Array<{
      op_sequence: number;
      before_lines: string[];
      after_lines: string[];
    }> = [];

    // Build lookup for sync code → comment
    const syncComments: Record<string, string> = {};
    for (const [, v] of Object.entries(MILL_TURN_SYNC_CODES)) {
      syncComments[v.code] = v.comment;
    }

    for (const op of ops) {
      const beforeLines: string[] = [];
      const afterLines: string[] = [];

      if (op.sync_before) {
        const comment = syncComments[op.sync_before] ?? "CHANNEL SYNC";
        beforeLines.push(`${op.sync_before} (${comment})`);
      }
      if (op.sync_after) {
        const comment = syncComments[op.sync_after] ?? "CHANNEL SYNC";
        afterLines.push(`${op.sync_after} (${comment})`);
      }

      if (beforeLines.length > 0 || afterLines.length > 0) {
        result.push({
          op_sequence: op.sequence,
          before_lines: beforeLines,
          after_lines: afterLines,
        });
      }
    }

    return result;
  }

  // ── Cycle Time Estimation ──────────────────────────────────────────

  /**
   * Estimate total cycle time for a set of planned operations on a given machine.
   *
   * Cycle time components:
   *   1. Setup time (one-time): fixture, workpiece loading, alignment
   *   2. Tool change time: ATC swap per unique tool (chip-to-chip)
   *   3. Rapid traverse time: G00 moves between operations
   *   4. Cutting time: sum of each op's estimated_time_min
   *   5. Pallet change time: HMC only
   *
   * For multi-setup programs, setup_time is multiplied by number of setups.
   *
   * Ref: Boothroyd & Knight "Fundamentals of Metal Machining and Machine Tools"
   * Ch.12 "Estimation of Machining Time", SME "Tool and Manufacturing Engineers
   * Handbook" Vol.1 Ch.5.
   *
   * @returns Breakdown object with per-component times and total
   */
  static estimateCycleTime(
    operations: PlannedOperation[],
    machType: MachineType,
    numSetups?: number,
  ): {
    setup_time_min: number;
    tool_change_time_min: number;
    rapid_traverse_time_min: number;
    cutting_time_min: number;
    pallet_change_time_min: number;
    total_cycle_time_min: number;
    ops_count: number;
    unique_tools: number;
  } {
    const params = CYCLE_TIME_PARAMS[machType];
    const setups = numSetups ?? Math.max(1, ...operations.map(o => (o.setup_index ?? 0) + 1));

    // Setup time: per setup
    const setupTime = params.setup_time_min * setups;

    // Count unique tools (by tool_type + diameter)
    const toolSet = new Set(
      operations.map(o => `${o.tool.tool_type}|${o.tool.diameter_mm}`),
    );
    const uniqueTools = toolSet.size;

    // Tool change time: one change per unique tool (first tool is free — already loaded)
    const toolChanges = Math.max(0, uniqueTools - 1);
    const toolChangeTime = (toolChanges * params.tool_change_sec) / 60;

    // Rapid traverse time: estimate 100mm average rapid move between operations
    // (actual distances depend on geometry; this is a conservative estimate)
    const rapidMoves = Math.max(0, operations.length - 1);
    const avgRapidDistance = 100; // mm
    const rapidTime = (rapidMoves * avgRapidDistance) / params.rapid_rate_mm_min;

    // Cutting time: sum of per-op estimated_time_min (already computed in S7)
    const cuttingTime = operations.reduce((sum, op) => sum + op.estimated_time_min, 0);

    // Pallet change: one per setup for HMC with pallet changer
    const palletTime = (params.pallet_change_sec > 0 ? setups * params.pallet_change_sec : 0) / 60;

    const total = setupTime + toolChangeTime + rapidTime + cuttingTime + palletTime;

    return {
      setup_time_min: Math.round(setupTime * 100) / 100,
      tool_change_time_min: Math.round(toolChangeTime * 100) / 100,
      rapid_traverse_time_min: Math.round(rapidTime * 100) / 100,
      cutting_time_min: Math.round(cuttingTime * 100) / 100,
      pallet_change_time_min: Math.round(palletTime * 100) / 100,
      total_cycle_time_min: Math.round(total * 100) / 100,
      ops_count: operations.length,
      unique_tools: uniqueTools,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────

  /** Map recognized feature type to PRISM operation type. */
  private static featureToOperationType(featureType: string): string {
    const map: Record<string, string> = {
      face: "face_mill",
      planar_face: "face_mill",
      through_hole: "drill_peck",
      blind_hole: "drill_peck",
      counterbore: "drill_peck",
      countersink: "chamfer",
      tapped_hole: "drill_peck",
      pocket_rectangular: "adaptive_clear",
      pocket_circular: "adaptive_clear",
      slot_through: "slot",
      slot_blind: "slot",
      boss_circular: "contour_2d",
      boss_rectangular: "contour_2d",
      chamfer: "chamfer",
      fillet: "contour_2d",
      step: "pocket_2d",
      groove: "contour_2d",
      contour_2d: "contour_2d",
      // 5-axis feature types (default mapping — overridden by FIVE_AXIS_FEATURE_MAP in S4)
      undercut: "swarf",
      freeform_surface: "flow_cut",
      blade: "blade_machining",
      impeller_vane: "impeller",
      port_entry: "port_machining",
      compound_angle_pocket: "indexed_5axis",
      deep_cavity: "flow_cut",
      sculptured_surface: "flow_cut",
      // Turning feature types (lathe / mill-turn)
      od_profile: "turning_rough",
      od_finish: "turning_finish",
      id_bore: "turning_bore",
      face_turn: "turning_face",
      groove_od: "turning_groove",
      groove_id: "turning_groove",
      groove_face: "turning_groove",
      thread_od: "turning_thread",
      thread_id: "turning_thread",
      part_off: "turning_part_off",
      cutoff: "turning_part_off",
      center_drill_turn: "turning_drill",
      axial_hole: "turning_drill",
      // Mill-turn feature types
      sub_spindle_transfer: "sub_spindle_transfer",
      // Wire EDM feature types
      wire_profile_cut: "wire_profile",
      wire_straight_cut: "wire_profile",
      wire_taper_cut: "wire_4axis_taper",
      wire_no_core_cut: "wire_no_core",
      wire_open_pocket_cut: "wire_open_pocket",
      die_opening: "wire_profile",
      punch_profile: "wire_no_core",
      keyway_wire: "wire_profile",
    };
    return map[featureType] ?? "adaptive_clear";
  }

  /** Map operation type to cutting tool type. */
  private static operationToToolType(opType: string): string {
    const map: Record<string, string> = {
      face_mill: "face mill",
      adaptive_clear: "flat end mill",
      pocket_2d: "flat end mill",
      contour_2d: "flat end mill",
      drill_peck: "drill",
      bore: "boring bar",
      chamfer: "chamfer mill",
      slot: "flat end mill",
      // 5-axis operation → tool type mappings
      swarf: "ball end mill",
      flow_cut: "ball end mill",
      blade_machining: "tapered ball end mill",
      impeller: "ball end mill",
      port_machining: "ball end mill",
      indexed_5axis: "flat end mill",
      multiaxis_contour: "ball end mill",
      ream: "reamer",
      tap: "tap",
      engrave: "engraving cutter",
      trochoidal: "flat end mill",
      // Turning operations → insert/tool types
      turning_rough: "OD turning insert",
      turning_finish: "OD finish turning insert",
      turning_bore: "ID boring bar",
      turning_face: "OD turning insert",
      turning_groove: "grooving insert",
      turning_thread: "threading insert",
      turning_part_off: "parting blade",
      turning_drill: "drill",
      // Mill-turn live tooling
      live_tool_mill: "flat end mill",
      sub_spindle_transfer: "collet",
      // Wire EDM — wire is the "tool"
      wire_profile: "brass wire",
      wire_4axis_taper: "brass wire",
      wire_no_core: "brass wire",
      wire_open_pocket: "brass wire",
    };
    return map[opType] ?? "flat end mill";
  }

  /** Select toolpath strategy based on operation and feature. */
  private static selectStrategy(opType: string, _featureType: string): string {
    if (opType === "face_mill") return "face";
    if (opType === "adaptive_clear") return "adaptive";
    if (opType === "pocket_2d") return "pocket2d";
    if (opType === "contour_2d") return "contour2d";
    if (opType === "drill_peck") return "drill";
    if (opType === "bore") return "bore";
    if (opType === "chamfer") return "chamfer2d";
    if (opType === "slot") return "slot";
    // 5-axis strategies
    if (opType === "swarf") return "swarf_5axis";
    if (opType === "flow_cut") return "flowline_5axis";
    if (opType === "blade_machining") return "blade_5axis";
    if (opType === "impeller") return "impeller_5axis";
    if (opType === "port_machining") return "port_5axis";
    if (opType === "indexed_5axis") return "indexed_3plus2";
    if (opType === "multiaxis_contour") return "multiaxis_contour_5axis";
    // Turning strategies
    if (opType === "turning_rough") return "turning_rough";
    if (opType === "turning_finish") return "turning_finish";
    if (opType === "turning_bore") return "turning_bore";
    if (opType === "turning_face") return "turning_face";
    if (opType === "turning_groove") return "turning_groove";
    if (opType === "turning_thread") return "turning_thread";
    if (opType === "turning_part_off") return "turning_part_off";
    if (opType === "turning_drill") return "turning_drill";
    // Mill-turn
    if (opType === "live_tool_mill") return "adaptive";
    if (opType === "sub_spindle_transfer") return "sub_spindle_transfer";
    // Wire EDM strategies
    if (opType === "wire_profile") return "wire_profile";
    if (opType === "wire_4axis_taper") return "wire_4axis_taper";
    if (opType === "wire_no_core") return "wire_no_core";
    if (opType === "wire_open_pocket") return "wire_open_pocket";
    return "adaptive";
  }

  /** Compute overall confidence from stage results (0-1). */
  private static computeConfidence(stages: StageResult[]): number {
    if (stages.length === 0) return 0;
    const successful = stages.filter(s => s.success).length;
    const warningPenalty = stages.reduce((sum, s) => sum + s.warnings.length * 0.02, 0);
    return Math.max(0.1, Math.min(1.0, successful / stages.length - warningPenalty));
  }
}

export const autoProgramOrchestratorEngine = new AutoProgramOrchestratorEngine();
