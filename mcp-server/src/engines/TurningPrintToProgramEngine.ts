/**
 * TurningPrintToProgramEngine — Lathe Operations Pipeline
 *
 * Generates complete CNC turning programs from part feature descriptions.
 * Covers OD/ID profiling, facing, grooving, threading, boring, parting,
 * taper turning, and multi-pass roughing cycles.
 *
 * Physics (inline, no imports):
 *   - Kienzle (1952): Fc = kc1.1 × ap × f^(1−mc)  [turning: ap=DOC radial, f=feed/rev]
 *   - Taylor (1907): T = (C/Vc)^(1/n)
 *   - Surface finish: Ra = f² / (32 × r_nose)
 *   - Power: P = Fc × Vc / (60000)  [kW]
 *   - MRR: ap × f × Vc × 1000 / π  [mm³/min, approximate]
 *
 * Self-contained — no imports from other engines.
 *
 * @module engines/TurningPrintToProgramEngine
 */

import { log } from "../utils/Logger.js";
import { workholdingVerificationEngine } from "./WorkholdingVerificationEngine.js";
import { smartToolSelectorEngine } from "./SmartToolSelectorEngine.js";
import { coolantStrategyEngine } from "./CoolantStrategyEngine.js";
import { entryExitStrategyEngine } from "./EntryExitStrategyEngine.js";
import { intelligentSequencingEngine } from "./IntelligentSequencingEngine.js";
import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";
import {
  getKienzleByISO, getTaylor, getSpeed, lookupKienzleMaterial,
  predictRaTurning, COOLANT_MATRIX, PECK_RULES,
  OPERATION_SEQUENCE_RULES, SAFE_START_BLOCKS,
  THREADING_INFEED, calcTapDrill,
  thermalDeratingFactor, rakeAngleCorrectionFactor, correctedCuttingForce,
  availablePower,
} from "./MachiningKnowledgeBaseEngine.js";
import {
  CANONICAL_TURNING_SPEEDS,
  CANONICAL_TURNING_FEEDS,
  CANONICAL_MATERIAL_DB,
  getToolModulus,
  getCTEByISO,
  type ISOGroup,
} from "../physics/constants.js";
import { resolveMaterial, resolveMachine, type ResolvedMaterialContext, type ResolvedMachineContext } from "./PipelineRegistryBridge.js";
import { machineEnvelopeGuardEngine } from "./MachineEnvelopeGuardEngine.js";
import { boringBarDeflectionEngine } from "./BoringBarDeflectionEngine.js";
import { partDeflectionEngine } from "./PartDeflectionEngine.js";
import { chuckJawForceEngine } from "./ChuckJawForceEngine.js";
import { lathePartClassifierEngine } from "./LathePartClassifierEngine.js";
import { latheCollisionZoneEngine } from "./LatheCollisionZoneEngine.js";
import { gilbertEconomicSpeedEngine } from "./GilbertEconomicSpeedEngine.js";
// LATHE-OKUMA-POST: route the print->program emit through the VERIFIED Okuma OSP master
// post when the target controller is Okuma. JM Die's lathe fleet is 100% Okuma OSP; the
// inline generateGCode below emits Fanuc-dialect canned cycles (G71/G72/G76) that ALARM or
// mis-cycle on an OSP control (on OSP, G71 is THREADING, not roughing). This post emits the
// correct OSP dialect (G85 LAP roughing, G71 single-line threading, explicit grooving).
import {
  okumaB250LatheMasterPostEngine,
  type TurningOperation as OkumaTurningOp,
  type OkumaLathePostConfig,
  type OkumaLatheMachineId,
} from "./OkumaB250LatheMasterPostEngine.js";
import {
  getMachinePostCapabilityProfile,
  type MachinePostCapabilityProfile,
} from "../data/machine-post-capability-profile.js";
// INFRA-NEURAL-LEDGER-MS1/P0-U02 — emit cross_process_stage_complete event to
// the OutcomeCaptureBus at the end of every pipeline run. Fire-and-forget;
// never blocks the producer. See utils/p2pOutcomeEmission.ts for the contract.
import { emitP2POutcome, P2P_STAGES } from "../utils/p2pOutcomeEmission.js";

// ============================================================================
// SHARED ENGINE HELPERS (ESM-safe, non-blocking — 0-D-ARCH U-ARCH2)
// ============================================================================

function getSmartToolSelector(): any { return smartToolSelectorEngine; }
function getCoolantStrategyEngine(): any { return coolantStrategyEngine; }
function getEntryExitStrategyEngine(): any { return entryExitStrategyEngine; }
function getIntelligentSequencingEngine(): any { return intelligentSequencingEngine; }

/** Map turning op types to CoolantStrategy operation types */
function mapToCoolantOp(opType: string): string {
  if (opType.includes("rough")) return "turning_rough";
  if (opType.includes("finish")) return "turning_finish";
  if (opType.includes("drill") || opType === "center_drill") return "drilling";
  if (opType.includes("bore")) return "boring";
  if (opType.includes("thread")) return "tapping";
  if (opType.includes("groove") || opType === "part_off") return "turning_rough";
  // Live tooling ops map to milling
  if (opType.startsWith("live_")) return "milling_rough";
  return "turning_rough";
}

/** Map ISO group to CoolantStrategy material name */
function mapToCoolantMaterial(iso: string): string {
  const m: Record<string, string> = {
    P: "carbon_steel", M: "stainless", K: "cast_iron",
    N: "aluminum", S: "titanium", H: "hardened_steel",
  };
  return m[iso] || "carbon_steel";
}

// -- Live-tooling input sanitizers (U-W3) ------------------------------------
// The live-tooling G-code handlers (whistle_notch | od_pocket_mill | cross_drill
// | cross_tap | keyway | flat_mill | hex_mill) were TYPED but never exercised by
// the closed-loop test, so their numeric inputs were never validated. The legacy
// `feat?.x || default` idiom catches falsy 0/NaN but NOT Infinity -- so an
// Infinity pocket_depth produced an UNBOUNDED pass loop (`Math.ceil(Infinity/step)`)
// and Infinity/NaN dimensions leaked `X-Infinity` / `C NaN` into emitted G-code
// (a CNC hazard). These clamp non-finite garbage to a safe value before it can
// reach a coordinate or a loop bound. Monotonically safe (only replaces unusable
// input); preserves the existing 0-or-missing -> default behavior.

/** Finite-or-fallback for a value that may legitimately be 0 (e.g. a C-axis angle). */
function finiteOr(v: number | undefined, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/** Finite-AND-positive-or-fallback for a dimension that must be > 0 (depth/width/dia). */
function finitePos(v: number | undefined, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : fallback;
}

/**
 * Fanuc corner-rounding/chamfer suffix for a profile block.
 * Returns ",R<v.vvv>" for a corner radius, ",C<v.vvv>" for a corner chamfer, or "" if neither.
 * corner_R takes precedence when both are set (they are mutually exclusive on a Fanuc corner).
 * A non-finite or non-positive value yields "" (never emit ",R0.000"/a NaN token). Fanuc-dialect
 * only -- the caller is the inline emitter that is fail-closed for Okuma targets.
 */
function cornerSuffix(corner_R?: number, corner_C?: number): string {
  if (typeof corner_R === "number" && Number.isFinite(corner_R) && corner_R > 0) return `,R${corner_R.toFixed(3)}`;
  if (typeof corner_C === "number" && Number.isFinite(corner_C) && corner_C > 0) return `,C${corner_C.toFixed(3)}`;
  return "";
}

/** Hard cap on the thermal-growth diameter offset (mm). A runaway operator delta_T must never drive an
 *  unbounded cut; clamping fails SAFE (under-compensates -> slightly oversize -> re-cuttable, never scrap).
 *  Matches the 0.050 mm adjustment cap used by the offset-compensation manager. */
const THERMAL_MAX_OFFSET_MM = 0.05;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type TurningFeatureType =
  | "od_straight" | "od_taper" | "od_contour" | "od_shoulder"
  | "id_bore" | "id_contour" | "id_taper"
  | "face" | "face_groove"
  | "groove_od" | "groove_id" | "groove_face" | "groove_cutoff"
  | "thread_od" | "thread_id" | "thread_pipe"
  | "drill_center" | "drill_through" | "drill_blind"
  | "part_off"
  // Live tooling features (C-axis / Y-axis milling on lathe)
  | "whistle_notch" | "od_pocket_mill" | "cross_drill" | "cross_tap"
  | "keyway" | "flat_mill" | "hex_mill"
  // Knurling (forming operation -- the turning spine does not natively emit a knurl cycle; see knurl advisory)
  | "knurl";

export type TurningOpType =
  | "od_rough" | "od_finish" | "od_thread"
  | "id_rough" | "id_finish" | "id_thread"
  | "face_rough" | "face_finish"
  | "groove" | "groove_finish"
  | "drill" | "bore_rough" | "bore_finish"
  | "thread_single_point" | "thread_insert"
  | "part_off" | "center_drill" | "taper"
  // Live tooling operations
  | "live_whistle_notch" | "live_od_pocket" | "live_cross_drill"
  | "live_cross_tap" | "live_keyway" | "live_flat_mill";

export interface TurningFeature {
  id: string;
  type: TurningFeatureType;
  od_mm?: number;
  id_mm?: number;
  length_mm: number;
  depth_mm?: number;
  width_mm?: number;
  taper_angle_deg?: number;
  thread_pitch_mm?: number;
  thread_class?: string;
  thread_starts?: number;
  /** Explicit single-flank thread depth (mm). When omitted, the emit defaults to ~0.61*pitch (ISO
   *  60-deg metric thread-depth factor). Restores the per-feature override the thread emit already
   *  reads (toOkumaOperations: `finitePos(feat?.thread_depth_mm, pitch*0.61)`); the field was missing
   *  from this interface (latent tsc TS2551, behaviour was always the 0.61*pitch fallback). */
  thread_depth_mm?: number;
  tolerance_mm?: number;
  surface_finish_Ra_um?: number;
  groove_width_mm?: number;
  groove_depth_mm?: number;
  diameter_mm?: number;
  position_z_mm?: number;
  required_operations?: TurningOpType[];
  priority?: number;
  // Live tooling parameters
  notch_angle_deg?: number;        // Whistle notch angle (5-20°)
  notch_depth_mm?: number;         // Depth of whistle notch into OD
  notch_width_mm?: number;         // Width of notch along Z
  pocket_width_mm?: number;        // OD pocket width (Z direction)
  pocket_depth_mm?: number;        // OD pocket depth into OD (radial)
  pocket_length_mm?: number;       // OD pocket arc length (C direction)
  c_axis_position_deg?: number;    // Angular position on C-axis (0-360)
  live_tool_diameter_mm?: number;  // End mill diameter for live ops
  cross_hole_diameter_mm?: number; // Cross-drilled hole diameter
  /** Multi-point profile for G71/G70 contour — array of {X (dia), Z (axial), radius?, type?} */
  profile_points?: Array<{
    X: number;  // diameter mm
    Z: number;  // axial position mm (negative = toward chuck)
    type?: "rapid" | "linear" | "arc_cw" | "arc_ccw";
    R?: number; // arc radius mm
    I?: number; // arc center offset X
    K?: number; // arc center offset Z
    feed?: number; // per-segment feed override mm/rev
    corner_R?: number; // Fanuc corner rounding radius (mm), appended as ",R<v>" to the block ending here
    corner_C?: number; // Fanuc corner chamfer leg (mm), appended as ",C<v>" to the block ending here
  }>;
}

export interface TurningMaterial {
  material_name: string;
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  hardness_hrc?: number;
}

export interface TurningInsert {
  tool_number: number;
  insert_type: "CNMG" | "DNMG" | "WNMG" | "VNMG" | "TNMG" | "CCMT" | "DCMT" | "VCMT" | "TCMT"
    | "groove_insert" | "thread_insert" | "cutoff" | "boring_bar" | "drill";
  nose_radius_mm: number;
  approach_angle_deg: number;
  holder_style: string;
  material: "carbide" | "cermet" | "ceramic" | "CBN" | "PCD";
  coating: string;
  min_bore_mm?: number;
}

export interface TurningCuttingParams {
  spindle_rpm: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  cutting_speed_m_min: number;
}

export interface TurningOperationPhysics {
  cutting_force_N: number;
  power_kW: number;
  torque_Nm: number;
  tool_life_min: number;
  predicted_Ra_um: number;
  mrr_mm3_min: number;
}

export interface TurningPlannedOp {
  op_number: number;
  feature_id: string;
  operation_type: TurningOpType;
  tool: TurningInsert;
  cutting_params: TurningCuttingParams;
  physics: TurningOperationPhysics;
  cycle_time_sec: number;
  passes: number;
  canned_cycle?: string;
  /** LATHE-OKUMA-POST / stickout auto-compensation: radial inward shift (mm) the emitter applies to
   *  the commanded diameter at the unsupported end to counter residual tool/stock deflection (0 = none). */
  deflection_compensation_x_mm?: number;
  coolant: "flood" | "mist" | "off" | "high_pressure";
  notes: string[];
}

export interface TurningProgramResult {
  success: boolean;
  part_number: string;
  material: string;
  bar_stock_od_mm: number;
  part_length_mm: number;
  operations: TurningPlannedOp[];
  total_operations: number;
  total_tool_changes: number;
  estimated_cycle_time_sec: number;
  program_text: string;
  program_line_count: number;
  setup_notes: string[];
  confidence_score: number;
  warnings: Array<{ stage: string; severity: "info" | "warning" | "critical"; message: string }>;
  // PIPELINE-VAR U-PV02: Boring bar deflection + chatter pre-checks
  boring_bar_checks?: Array<{
    op_number: number;
    ld_ratio: number;
    deflection_mm: number;
    within_tolerance: boolean;
  }>;
  chatter_checks?: Array<{
    op_number: number;
    stable: boolean;
    rpm: number;
    ap_mm: number;
  }>;
  postprocessor_applied?: boolean;
  // LATHE-MS0: Collision zone checks
  collision_checks?: Array<{
    check_type: string;
    passed: boolean;
    clearance_mm: number;
    description: string;
    severity: "info" | "warning" | "critical";
  }>;
  safe_retract_x_mm?: number;
  safe_retract_z_mm?: number;
  g71_type?: "I" | "II";
  // PIPELINE-VAR: Part-family classification (LathePartClassifierEngine 15-family taxonomy).
  // Advisory -- identifies the turned-part family from geometry + feature signatures and the
  // family-appropriate workholding + roughing cycle. Never overrides an explicit chuck choice
  // or a safety verdict; the wizard/FE renders it so the program reflects part-family awareness.
  part_family?: {
    family: string;
    confidence: number;
    recommended_workholding: string;
    recommended_roughing_cycle: string;
    recommended_sequence: string[];
    reasoning: string;
  };
  // LATHE-OKUMA-POST / task#4: the machine's post capability profile (prism_novel + controller/
  // vendor dims), attached for Okuma-targeted programs so the wizard surfaces what the post does
  // for THIS machine. Composes with ExtendedMachineProfile (kinematics/spindle) via physicalProfileRef.
  machine_post_profile?: MachinePostCapabilityProfile;
  // LATHE mill-turn / Swiss capability assessment (advisory): which secondary capabilities (live
  // tooling / C-axis / sub-spindle / Swiss) the part needs beyond plain turning, whether the
  // resolved machine provides them, and the live-tool emit-fidelity limit. Present only when a
  // secondary capability is required (see detectSecondaryMachiningRequirements). Never blocks emit.
  secondary_machining?: SecondaryMachiningAssessment;
}

export interface TurningInput {
  part_number?: string;
  material: TurningMaterial;
  bar_stock_od_mm: number;
  finished_od_mm?: number;
  part_length_mm: number;
  chuck_type?: "3_jaw" | "collet" | "4_jaw" | "face_plate";
  max_spindle_rpm?: number;
  max_power_kW?: number;
  machine_brand?: string;
  machine_model?: string;
  features: TurningFeature[];
  optimization_target?: "balanced" | "max_speed" | "max_tool_life" | "min_cost" | "surface_quality";
  tailstock?: boolean;
  sub_spindle?: boolean;
  /** Tool gauge-length / stickout from the holder face, mm. Drives boring-bar + OD deflection
   *  compensation. When unset, the engine uses a conservative geometry-derived overhang (never shorter). */
  tool_stickout_mm?: number;
  /** Unsupported workpiece length from the chuck face to the free end, mm. When unset, derived from
   *  part_length_mm (conservative). With tailstock=true the part is modelled simply-supported. */
  stock_overhang_mm?: number;
  /** Workpiece thermal-growth compensation (default OFF -- OPERATOR-GATED runtime emit). When true AND an
   *  explicit thermal_delta_t_c (measured/estimated temp rise above ambient, degC) is provided, the
   *  commanded finish diameter is cut smaller by the diametral thermal growth dD = alpha(ISO) * D * dT
   *  (bounded by THERMAL_MAX_OFFSET_MM) so the part lands on nominal once it cools. A missing/invalid
   *  delta_T yields zero offset (never fabricated). X (diameter) only for now; Z-length growth is a follow-up. */
  enable_thermal_growth_comp?: boolean;
  thermal_delta_t_c?: number;
  controller?: "fanuc" | "haas" | "mazak" | "okuma" | "siemens" | "dmg_mori" | "citizen" | "star";
  dual_spindle_cutoff?: boolean;  // Sub-spindle grips part during cutoff
  dual_spindle_sync_rpm?: number; // If set, both spindles run at this RPM
  /**
   * Cost-economic parameters for the Gilbert minimum-cost cutting-speed cap (see economicVcCap).
   * Optional -- when omitted the engine uses ECONOMIC_DEFAULTS (generic JM-shop mirror). The
   * closed-loop COST leg passes the canonical lathe-jm-cost-rates values so corpus validation uses
   * real JM rates. NOT cutting physics -- kc1.1/Taylor stay canonical in physics/constants.ts.
   */
  economics?: EconomicMachiningParams;
}

/**
 * Minimum viable cutting parameters for the stickout-compensation lever. PROCESS floors (a feasible
 * light finishing pass), NOT physics constants -- below them a turning cut stops cutting cleanly
 * (rubbing), so reducing the lever further does not help and the residual deflection is compensated
 * geometrically (taper) instead. ap = radial DOC mm, fr = feed mm/rev.
 */
const STICKOUT_AP_MIN_MM = 0.1;
const STICKOUT_FR_MIN_MM = 0.05;
/** Safety clamp: a compensating taper beyond this means the overhang is too long for the cut -- the
 *  SETUP is wrong (flag loud), not something a taper should silently paper over. */
const STICKOUT_MAX_TAPER_DEG = 2.0;

export interface StickoutCompensationPlanInput {
  /** baseline (planned) radial depth of cut, mm */
  ap0_mm: number;
  /** baseline (planned) feed, mm/rev */
  fr0_mm: number;
  /** deflection tolerance budget, mm (caller passes e.g. min(featTol,0.05)/2) */
  tol_mm: number;
  /** Kienzle mc exponent for the feed lever (deflection scales as fr^(1-mc)); from canonical getKienzleByISO */
  mc: number;
  /** axial length over which a compensating taper would be applied, mm */
  cut_length_mm: number;
  /**
   * Deflection oracle: delta(ap, fr) in mm, computed by the caller via the canonical deflection
   * engine (boring-bar or part). The plan is Vc-AGNOSTIC BY CONSTRUCTION -- cutting speed is not a
   * parameter here, so the lever can NEVER reduce Vc for a deflection violation (the oscar
   * deflection-Vc-lever regression, reference_oscar_sfc_deflection_vc_lever_2026_06_23).
   */
  deflAt: (ap_mm: number, fr_mm: number) => number;
}

export interface StickoutCompensationPlan {
  ap_mm: number;
  fr_mm: number;
  deflection0_mm: number;
  residual_deflection_mm: number;
  /** radial inward shift to apply at the unsupported end to counter residual deflection (0 = none) */
  compensation_x_mm: number;
  taper_angle_deg: number;
  lever: "none" | "ap" | "ap+fr" | "taper";
  /** true when the residual taper exceeds STICKOUT_MAX_TAPER_DEG -- setup is unsafe, surface loud */
  setup_flag: boolean;
  notes: string[];
}

/**
 * Pure stickout/overhang auto-compensation planner. Brings predicted deflection within tolerance by
 * reducing the LEVER the cutting force actually depends on -- depth of cut FIRST (deflection ~linear
 * in ap), then feed (deflection scales as fr^(1-mc), the oscar fix exponent) -- each floored at a
 * viable minimum, and NEVER cutting speed. Whatever deflection REMAINS after the floored levers is
 * compensated GEOMETRICALLY with an opposing taper of angle atan(residual/L). Monotonic-safe: it can
 * ONLY reduce material removal / cut less, never increase aggression. Pure + exported for testing.
 */
export function stickoutCompensationPlan(input: StickoutCompensationPlanInput): StickoutCompensationPlan {
  const { ap0_mm, fr0_mm, tol_mm, mc, cut_length_mm, deflAt } = input;
  const notes: string[] = [];
  const d0 = deflAt(ap0_mm, fr0_mm);
  const safe = (lever: StickoutCompensationPlan["lever"], extra?: Partial<StickoutCompensationPlan>): StickoutCompensationPlan => ({
    ap_mm: ap0_mm, fr_mm: fr0_mm, deflection0_mm: Number.isFinite(d0) ? d0 : 0,
    residual_deflection_mm: Number.isFinite(d0) ? d0 : 0, compensation_x_mm: 0, taper_angle_deg: 0,
    lever, setup_flag: false, notes, ...extra,
  });

  // Degenerate oracle / inputs -> no compensation (fail-safe, never crash, never fabricate).
  if (!Number.isFinite(d0) || d0 <= 0 || !(tol_mm > 0) || !(ap0_mm > 0) || !(fr0_mm > 0)) return safe("none");
  if (d0 <= tol_mm) return safe("none");

  // LEVER 1 -- depth of cut (deflection ~linear in ap, since Kienzle Fc ~ kc*ap*fr^(1-mc)).
  const ap1 = Math.max(ap0_mm * (tol_mm / d0), STICKOUT_AP_MIN_MM);
  const d1 = deflAt(ap1, fr0_mm);
  if (d1 <= tol_mm) {
    notes.push(`stickout: reduced ap ${ap0_mm.toFixed(3)}->${ap1.toFixed(3)}mm (deflection ${(d0 * 1000).toFixed(0)}->${(d1 * 1000).toFixed(0)}um within tol ${(tol_mm * 1000).toFixed(0)}um); Vc unchanged`);
    return { ap_mm: ap1, fr_mm: fr0_mm, deflection0_mm: d0, residual_deflection_mm: d1, compensation_x_mm: 0, taper_angle_deg: 0, lever: "ap", setup_flag: false, notes };
  }

  // LEVER 2 -- feed (deflection scales as fr^(1-mc); to cut delta by r, scale fr by r^(1/(1-mc))).
  const exp = 1 / Math.max(1e-6, 1 - mc);
  const fr1 = Math.max(fr0_mm * Math.pow(tol_mm / d1, exp), STICKOUT_FR_MIN_MM);
  const d2 = deflAt(ap1, fr1);
  if (d2 <= tol_mm) {
    notes.push(`stickout: reduced ap ${ap0_mm.toFixed(3)}->${ap1.toFixed(3)}mm + feed ${fr0_mm.toFixed(3)}->${fr1.toFixed(3)}mm/rev (deflection ${(d0 * 1000).toFixed(0)}->${(d2 * 1000).toFixed(0)}um within tol); Vc unchanged`);
    return { ap_mm: ap1, fr_mm: fr1, deflection0_mm: d0, residual_deflection_mm: d2, compensation_x_mm: 0, taper_angle_deg: 0, lever: "ap+fr", setup_flag: false, notes };
  }

  // RESIDUAL -> compensating taper. At floored ap/fr the part/tool still deflects ~d2; cut an opposing
  // taper so the deflected tool produces the nominal dimension. comp is RADIAL; the emitter applies
  // 2*comp to the commanded diameter at the unsupported end (cut LESS -> counters the deflect-away error).
  const residual = d2;
  const L = Math.max(cut_length_mm, 1e-6);
  const taperDeg = (Math.atan(residual / L) * 180) / Math.PI;
  const setupFlag = taperDeg > STICKOUT_MAX_TAPER_DEG;
  notes.push(`stickout: ap/feed floored (ap ${ap1.toFixed(3)}mm, feed ${fr1.toFixed(3)}mm/rev); residual deflection ${(residual * 1000).toFixed(0)}um compensated by a ${taperDeg.toFixed(3)}deg opposing taper; Vc unchanged`);
  if (setupFlag) notes.push(`stickout SETUP WARNING: compensating taper ${taperDeg.toFixed(2)}deg exceeds ${STICKOUT_MAX_TAPER_DEG}deg -- overhang too long for this cut; shorten stickout / add support (setup review required)`);
  return { ap_mm: ap1, fr_mm: fr1, deflection0_mm: d0, residual_deflection_mm: residual, compensation_x_mm: residual, taper_angle_deg: taperDeg, lever: "taper", setup_flag: setupFlag, notes };
}

/**
 * Derive a 1..9999 Okuma program number from a part number's trailing digits. Okuma OSP program
 * numbers are O####; an unparseable/empty part number falls back to 1. Only the trailing run of up
 * to 4 digits is used (e.g. "P-99999" -> 9999), so two distinct parts sharing the last 4 digits can
 * collide -- the O-number is a convenience label here, not a unique key. Pure + exported for testing.
 * @param partNumber free-text part number (e.g. "ACME-2041" -> 2041, "shaft" -> 1)
 * @returns a program number in [1, 9999]
 */
export function deriveProgramNumber(partNumber: string | undefined): number {
  if (!partNumber) return 1;
  const m = String(partNumber).match(/(\d{1,4})\s*$/);
  if (!m) return 1;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 1 && n <= 9999 ? n : 1;
}

/**
 * Map a free-text machine model to a canonical OkumaLatheMachineId for the master-post header.
 * Returns undefined when no JM Okuma identity matches -> the post defaults to LB250II-M (back-compat).
 * Identities sourced from OKUMA_LATHE_MACHINES (jm-fleet-sim-map LTH-01..07). Pure + exported for testing.
 * @param model the TurningInput.machine_model free text (e.g. "Okuma GENOS L300-M")
 * @returns a canonical OkumaLatheMachineId, or undefined to use the post default
 */
export function mapOkumaMachineId(model: string | undefined): OkumaLatheMachineId | undefined {
  if (!model) return undefined;
  const s = String(model).toLowerCase();
  if (/multus/.test(s)) return "MULTUS-B250II";
  if (/genos.*l300/.test(s)) return "GENOS-L300-M";
  if (/genos.*l200/.test(s)) return "GENOS-L200E-M";
  if (/genos.*l400/.test(s)) return "GENOS-L400II-E";
  if (/crown.*l1060|\bl1060\b/.test(s)) return "CROWN-L1060";
  if (/\blnc\s*8\b/.test(s)) return "LNC8";
  if (/lb\s*3000/.test(s)) return "LB3000";
  if (/lb\s*250/.test(s)) return "LB250II-M";
  return undefined;
}

/**
 * Boring-bar unsupported overhang (mm) for the deflection pre-check. Governed by the REACH to the
 * bore bottom (the op's feature depth), NOT the whole part length: a blind bore needs far less
 * stickout. CAPPED at part length so it never exceeds the legacy part_length-based model -- this only
 * RELIEVES false positives (closed-loop finding U-W2J). The 1.2 factor accounts for holder-to-face gap
 * + clearance. Pure + exported for direct unit testing.
 * @param feat         the bore op's TurningFeature (or undefined if not found)
 * @param partLengthMm the part length (conservative fallback when feature depth is unknown)
 * @returns overhang in mm
 */
export function boringBarOverhangMm(
  feat: { depth_mm?: number; length_mm?: number } | undefined,
  partLengthMm: number,
): number {
  const boreDepth = (feat?.depth_mm && feat.depth_mm > 0) ? feat.depth_mm
    : (feat?.length_mm && feat.length_mm > 0) ? feat.length_mm
    : partLengthMm;
  return Math.min(boreDepth, partLengthMm) * 1.2;
}

/**
 * Grooving/parting blade stickout (mm) for the collision overhang check. Governed by the REACH the
 * blade must make: a PARTING blade must reach the part CENTER (~part radius); a GROOVING blade must
 * reach the groove BOTTOM (~full groove depth). A flat 40mm default falsely inflated the
 * extension/blade-width overhang ratio (closed-loop finding U-W2J/L). CAPPED at the fallback so the
 * ratio can only DROP -- relief-only, never-soften. Uses the TRUE geometry (part radius / full groove
 * depth), so it never UNDER-states the real reach; when the groove depth is unknown it stays at the
 * conservative fallback (no relief). Pure + exported for direct unit testing.
 * @param opType        the planned op's operation_type
 * @param partOdMm      part / bar OD (parting reaches part_od/2)
 * @param grooveDepthMm full radial groove depth (grooving reaches the groove bottom); undefined -> no relief
 * @param fallbackMm    the prior flat default (e.g. 40) -- the cap + the unknown-geometry fallback
 * @returns stickout in mm
 */
export function groovePartStickoutMm(
  opType: string,
  partOdMm: number,
  grooveDepthMm: number | undefined,
  fallbackMm: number,
): number {
  const CLEARANCE_MM = 3; // blade base + over-travel past the cutting point
  if (opType === "part_off") {
    const reach = (partOdMm > 0 ? partOdMm / 2 : fallbackMm) + CLEARANCE_MM;
    return Math.min(reach, fallbackMm);
  }
  if (opType.includes("groove")) {
    const reach = (grooveDepthMm && grooveDepthMm > 0) ? grooveDepthMm + CLEARANCE_MM : fallbackMm;
    return Math.min(reach, fallbackMm);
  }
  return fallbackMm; // non-groove/part tools unchanged
}

/**
 * The REQUIRED parting blade width (mm) for a given bar OD -- the smallest STANDARD blade (3/4/5/6mm)
 * that keeps the overhang ratio (stickout/width) within `maxRatio`. Replaces the collision check's flat
 * 3mm assumption: a 3mm blade genuinely cannot part a large bar, so the program must SPECIFY the wider
 * blade an operator must fit (recorded in setup_notes). This is NOT softening-by-assumption -- it
 * completes the program spec + verifies feasibility. CAPPED at 6mm (widest standard), so a bar that
 * needs >6mm (ratio still > maxRatio at 6mm) STILL flags downstream = never-soften. Pure + exported.
 * @param barOdMm  bar / part OD (parting reaches the center)
 * @param maxRatio max overhang ratio (default 6, per LatheCollisionZoneEngine MAX_PARTING_OVERHANG_RATIO)
 * @returns required blade width in mm (one of 3/4/5/6)
 */
export function requiredPartingBladeMm(barOdMm: number, maxRatio = 6): number {
  const STD = [3, 4, 5, 6]; // standard parting/grooving blade widths (Sandvik N151 / Iscar SGTH families)
  const stickout = groovePartStickoutMm("part_off", barOdMm, undefined, 40); // same reach model (consistency)
  const need = stickout / maxRatio;
  for (const w of STD) if (w >= need) return w;
  return STD[STD.length - 1]; // cap at 6mm; a bigger need still exceeds maxRatio at 6mm -> still flags
}

// ============================================================================
// MILL-TURN / SWISS SECONDARY-MACHINING CAPABILITY DETECTOR (U-LW-MT-01)
// ----------------------------------------------------------------------------
// Operator directive 2026-06-29: cover ALL lathe capabilities incl. mill-turn and Swiss processes.
// A pure-turning program is INCOMPLETE for a part that needs live tooling (cross-holes, flats,
// keyways, hex), a sub-spindle (back-side / dual-spindle cutoff), or a Swiss sliding-headstock
// (long slender small-OD work). The OSP post DOES emit a C-axis live-tool cycle (c_mill ->
// generateCAxisMilling), but mapOkumaOpType collapses every live_* op into one generic c_mill, and
// no Swiss/guide-bushing path exists. This detector makes the wizard AWARE of and HONEST about that
// (R12): it surfaces each required secondary capability, whether the resolved machine advertises it,
// and the live-tool emit-fidelity limit -- as WARNING-severity advisories that never block emission.
// ============================================================================

/** A machining capability beyond plain (single-spindle, fixed-headstock) turning. */
export type SecondaryCapability =
  | "live_tooling"
  | "c_axis"
  | "sub_spindle"
  | "swiss_guide_bushing";

export interface SecondaryCapabilityDriver {
  feature_id: string;
  feature_type: string;
  capability: SecondaryCapability;
}

export interface SecondaryMachiningAssessment {
  /** Distinct secondary capabilities the part requires. */
  required: SecondaryCapability[];
  /** Per-feature reason each capability is required. */
  drivers: SecondaryCapabilityDriver[];
  /** Whether the resolved machine profile advertises each REQUIRED capability. `"unknown"` when the
   *  profile does not enumerate it (verified-jm data may omit an option) -- never a fabricated "no". */
  machine_supports: Partial<Record<SecondaryCapability, boolean | "unknown">>;
  /** Operator-facing advisories; each becomes a `warning`-severity pipeline warning. */
  advisories: string[];
  /** True when ANY secondary (non-turning) capability is required. */
  needs_secondary: boolean;
  /** Slenderness-driven Swiss / sliding-headstock recommendation. */
  swiss_recommended: boolean;
  /** Part L/D used for the Swiss recommendation (0 when geometry is unknown). */
  length_to_diameter: number;
}

// Feature types that require live tooling + C-axis indexing (off-axis / radial milling on a lathe).
const LIVE_TOOL_FEATURE_TYPES = new Set<string>([
  "whistle_notch", "od_pocket_mill", "cross_drill", "cross_tap", "keyway", "flat_mill", "hex_mill",
]);

// Slenderness regime where a fixed-headstock lathe needs a steady rest and a Swiss sliding-headstock
// (guide bushing) becomes the production answer for small-OD precision work. Rule of thumb (Machinery's
// Handbook turning practice / Swiss-type application guides): the deflection cascade already treats
// L/D>6 as deflection-prone for the cut; beyond ~10 on small bar exceeds comfortable steady-rest
// territory and Swiss excels at long, slender, small-diameter parts. Advisory threshold (not a
// physics constant): only RAISES awareness, never alters emitted geometry.
const SWISS_RECOMMEND_LD = 10;
const SWISS_MAX_BAR_OD_MM = 32; // Swiss / sliding-headstock bar-capacity class (~ up to 1.25")

/**
 * Detect the secondary (non-plain-turning) capabilities a turned part requires, cross-check them
 * against the resolved machine's post capability profile, and emit honest advisories. Pure + exported
 * for direct unit testing; never throws (degenerate input -> empty assessment).
 * @param input the turning input (features + stock geometry + machine + spindle flags)
 * @returns a SecondaryMachiningAssessment (advisory; callers push `advisories` as `warning`s)
 */
export function detectSecondaryMachiningRequirements(input: {
  features?: Array<{
    id?: string; type?: string;
    c_axis_position_deg?: number; live_tool_diameter_mm?: number; cross_hole_diameter_mm?: number;
  }>;
  bar_stock_od_mm?: number;
  part_length_mm?: number;
  sub_spindle?: boolean;
  dual_spindle_cutoff?: boolean;
  machine_model?: string;
  machine_brand?: string;
}): SecondaryMachiningAssessment {
  const drivers: SecondaryCapabilityDriver[] = [];
  const requiredSet = new Set<SecondaryCapability>();
  const add = (feature_id: string, feature_type: string, capability: SecondaryCapability) => {
    drivers.push({ feature_id, feature_type, capability });
    requiredSet.add(capability);
  };

  const feats = Array.isArray(input.features) ? input.features : [];
  for (const f of feats) {
    const ftype = String(f?.type ?? "");
    const fid = String(f?.id ?? ftype ?? "?");
    const isLiveType = LIVE_TOOL_FEATURE_TYPES.has(ftype);
    const hasLiveSignal =
      (typeof f?.c_axis_position_deg === "number" && Number.isFinite(f.c_axis_position_deg)) ||
      (typeof f?.live_tool_diameter_mm === "number" && f.live_tool_diameter_mm > 0) ||
      (typeof f?.cross_hole_diameter_mm === "number" && f.cross_hole_diameter_mm > 0);
    if (isLiveType || hasLiveSignal) {
      add(fid, ftype, "live_tooling");
      add(fid, ftype, "c_axis");
    }
  }

  if (input.sub_spindle === true || input.dual_spindle_cutoff === true) {
    add("(machine)", input.dual_spindle_cutoff ? "dual_spindle_cutoff" : "sub_spindle", "sub_spindle");
  }

  // Swiss / sliding-headstock recommendation from slenderness (small-OD long parts).
  const od = typeof input.bar_stock_od_mm === "number" && input.bar_stock_od_mm > 0 ? input.bar_stock_od_mm : 0;
  const len = typeof input.part_length_mm === "number" && input.part_length_mm > 0 ? input.part_length_mm : 0;
  const ld = od > 0 && len > 0 ? len / od : 0;
  const swiss_recommended = ld >= SWISS_RECOMMEND_LD && od > 0 && od <= SWISS_MAX_BAR_OD_MM;
  if (swiss_recommended) requiredSet.add("swiss_guide_bushing");

  const required = [...requiredSet];

  // Resolve machine support from the post capability profile (advisory; absence => "unknown").
  const machineId = mapOkumaMachineId(input.machine_model) ?? input.machine_model ?? input.machine_brand;
  const profile = getMachinePostCapabilityProfile(machineId);
  const advText = (profile?.advancedFeatures?.value ?? []).map((x) => String(x).toLowerCase()).join(" | ");
  const supports = (needle: string): boolean | "unknown" =>
    profile ? (advText.includes(needle) ? true : "unknown") : "unknown";

  const machine_supports: Partial<Record<SecondaryCapability, boolean | "unknown">> = {};
  if (requiredSet.has("live_tooling")) machine_supports.live_tooling = supports("live tooling");
  if (requiredSet.has("c_axis")) {
    machine_supports.c_axis = advText.includes("c-axis") ? true
      : (machine_supports.live_tooling === true ? true : supports("c-axis"));
  }
  if (requiredSet.has("sub_spindle")) machine_supports.sub_spindle = supports("sub-spindle");
  if (requiredSet.has("swiss_guide_bushing")) {
    // No JM Okuma fleet profile is Swiss-type; only assert true if a profile explicitly says so.
    machine_supports.swiss_guide_bushing = advText.includes("swiss") || advText.includes("guide bushing");
  }

  const advisories: string[] = [];
  const liveFeatures = [...new Set(
    drivers.filter((d) => d.capability === "live_tooling").map((d) => `${d.feature_id}:${d.feature_type}`),
  )];
  if (requiredSet.has("live_tooling")) {
    const sup = machine_supports.live_tooling;
    const support = sup === true
      ? "the machine profile advertises live tooling"
      : `machine "${machineId ?? "unknown"}" does not advertise live tooling -- verify it is equipped or plan a second (milling) setup`;
    advisories.push(`Live-tool / C-axis features [${liveFeatures.join(", ")}] require live tooling + C-axis indexing; ${support}.`);
    advisories.push("Live-tool features emit as a generic OSP C-axis cycle (M76 home / M203 live tool / G01 feed); per-feature cycles (drill peck, keyway slotting, hex/flat indexing, bolt-circle) are a roadmap item -- verify the emitted cycle matches the feature intent.");
  }
  if (requiredSet.has("sub_spindle")) {
    const sup = machine_supports.sub_spindle;
    const support = sup === true
      ? "the machine profile advertises a sub-spindle"
      : `machine "${machineId ?? "unknown"}" does not advertise a sub-spindle -- verify it is equipped`;
    advisories.push(`Back-side / dual-spindle work requires a sub-spindle transfer; ${support}. Confirm the no-drop transfer sequence + spindle sync.`);
  }
  if (swiss_recommended) {
    advisories.push(`Part L/D=${ld.toFixed(1)} at OD ${od}mm is Swiss / sliding-headstock class; this pipeline emits fixed-headstock turning -- verify a steady rest, sub-spindle support, or a Swiss-type machine. Guide-bushing / sliding-headstock programming is not yet generated.`);
  }

  return {
    required,
    drivers,
    machine_supports,
    advisories,
    needs_secondary: required.length > 0,
    swiss_recommended,
    length_to_diameter: Math.round(ld * 100) / 100,
  };
}

/**
 * Cost-economic parameters for the Gilbert minimum-cost cutting-speed cap.
 * These are COST-ECONOMIC inputs, NOT cutting physics -- kc1.1/Taylor stay canonical in
 * physics/constants.ts (consumed here via getTaylor / CANONICAL_MATERIAL_DB). The canonical JM-shop
 * values live in scripts/lib/lathe-jm-cost-rates.mjs (the closed-loop COST leg); the COMPILED engine
 * cannot import that script lib, so callers pass these via TurningInput.economics and ECONOMIC_DEFAULTS
 * mirrors the JM rates as a generic in-engine fallback.
 */
export interface EconomicMachiningParams {
  /** Loaded machine + operator rate ($/hr). */
  machine_rate_per_hr: number;
  /** Tool-change (turret index + re-approach) time, seconds. */
  tool_change_time_sec: number;
  /** Cost per cutting edge ($) = insert_list/edges + holder amortization. */
  tool_cost_per_edge_usd: number;
}

/**
 * Generic in-engine economic defaults -- a MIRROR of the canonical JM rates in
 * scripts/lib/lathe-jm-cost-rates.mjs (machine $85/hr Gardner "Top Shops" loaded CNC-lathe rate;
 * CNMG rough insert $12 / 4 edges + $0.5 holder amort = $3.50/edge; turret index ~8 s, Sandvik /
 * Kennametal application data 5-15 s). Used ONLY when a caller supplies no TurningInput.economics.
 * Real shops pass actuals; the closed-loop COST leg passes the lathe-jm-cost-rates values explicitly
 * so corpus validation uses real JM rates (single canonical source; this is the fallback mirror).
 */
export const ECONOMIC_DEFAULTS: EconomicMachiningParams = Object.freeze({
  machine_rate_per_hr: 85,
  tool_change_time_sec: 8,
  tool_cost_per_edge_usd: 3.5,
});

/**
 * Gilbert (1950) minimum-cost cutting-speed CAP for a turning op (m/min), or null when the economic
 * optimum is not computable (degenerate Taylor / cost input -> caller keeps the table speed).
 *
 * Returns max(Vc_min_cost, floorVc): the cost-minimizing velocity, never floored below floorVc. The
 * CALLER applies it as Vc = min(tableVc, cap), so Vc is only ever LOWERED toward the optimum, never
 * raised (safe direction -- a lower Vc reduces spindle load and lengthens tool life; finish/safety
 * are preserved). Delegates the formula to the canonical gilbertEconomicSpeedEngine -- no reinvention.
 *
 * Economics of machining: total (machine + tool) cost per part is convex in Vc with its minimum at
 * Vc_min_cost; for Vc > Vc_min_cost, lowering Vc strictly reduces total cost. The optimum self-adjusts
 * with the tool/machine cost ratio (Gilbert 1950; Boothroyd & Knight), so a cheap-insert /
 * expensive-machine part keeps an aggressive optimum (no over-conservative slowdown) while a
 * tool-cost-dominated part is slowed -- the exact fix for the closed-loop's ~74%-of-parts
 * uneconomically-short-tool-life finding. Pure + exported for direct unit testing (mirrors the
 * boringBarOverhangMm / groovePartStickoutMm convention).
 *
 * @param taylorC Taylor constant C at 1-min life (m/min) -- from getTaylor / CANONICAL_MATERIAL_DB (canonical)
 * @param taylorN Taylor exponent n (0<n<1) -- canonical source
 * @param econ    economic cost parameters (machine rate, tool-change time, cost/edge)
 * @param floorVc minimum cap (m/min); the cap is never below this valid cutting speed (0 = true optimum allowed)
 * @returns cap velocity (m/min), or null when not computable
 */
export function economicVcCap(
  taylorC: number,
  taylorN: number,
  econ: EconomicMachiningParams,
  floorVc: number,
): number | null {
  if (!Number.isFinite(taylorC) || taylorC <= 0) return null;
  if (!Number.isFinite(taylorN) || taylorN <= 0 || taylorN >= 1) return null;
  if (!econ || !Number.isFinite(econ.machine_rate_per_hr) || econ.machine_rate_per_hr <= 0) return null;
  if (!Number.isFinite(econ.tool_change_time_sec) || econ.tool_change_time_sec < 0) return null;
  if (!Number.isFinite(econ.tool_cost_per_edge_usd) || econ.tool_cost_per_edge_usd < 0) return null;
  try {
    const g = gilbertEconomicSpeedEngine.compute({
      K_T: taylorC,
      n: taylorN,
      machining_cost_per_sec_usd: econ.machine_rate_per_hr / 3600,
      tool_change_time_sec: econ.tool_change_time_sec,
      tool_cost_per_edge_usd: econ.tool_cost_per_edge_usd,
    });
    const v = g.Vc_min_cost;
    if (!Number.isFinite(v) || v <= 0) return null;
    const floor = Number.isFinite(floorVc) && floorVc > 0 ? floorVc : 0;
    return Math.max(v, floor);
  } catch {
    return null; // degenerate Taylor / cost input -> no cap (keep table speed)
  }
}

// ============================================================================
// INLINE PHYSICS
// ============================================================================

// Kienzle and Taylor constants sourced from MachiningKnowledgeBaseEngine
// (validated against Sandvik GC 2023, Kennametal 2018, ISCAR 2023)
// Speed/feed ranges from canonical physics/constants.ts — 0-D-ARCH U-ARCH1 migration

const TURNING_SPEEDS = CANONICAL_TURNING_SPEEDS as Record<string, { rough: number; finish: number }>;
const TURNING_FEEDS = CANONICAL_TURNING_FEEDS as Record<string, { rough: number; finish: number }>;

function kienzleForceTurning(kc1_1: number, mc: number, ap: number, f: number, approachAngleDeg?: number): number {
  if (f <= 0 || ap <= 0) return 0;
  // K_kappa correction: chip thickness h = f × sin(κr) for non-90° approach angles
  // Sandvik Metal Cutting Technical Guide, Table 4.2
  // Most turning inserts: κr = 93-95° → K_kappa ≈ 0.996-0.998 (small effect)
  // For 45° face turning: K_kappa = sin(45°) = 0.707 (30% force reduction)
  const kappa = approachAngleDeg ?? 95; // Default 95° (standard OD turning)
  const K_kappa = Math.sin((kappa * Math.PI) / 180);
  return kc1_1 * ap * Math.pow(f * K_kappa, 1 - mc);
}

function taylorLifeTurning(C: number, n: number, Vc: number): number {
  if (Vc <= 0) return Infinity;
  return Math.pow(C / Vc, 1 / n);
}

function turningRa(f: number, rn: number): number {
  if (rn <= 0) return 99;
  return (f * f * 1000) / (32 * rn);
}

function rpmFromDiam(Vc: number, D: number): number {
  if (D <= 0) return 0;
  return Math.round((1000 * Vc) / (Math.PI * D));
}

/** Cantilever tool-point tip stiffness [N/m] for a round bar/shank: k = 3EI/L^3, I = pi*d^4/64.
 *  d, L in mm; E in Pa. Feeds the turning regenerative-chatter limiting-depth estimate below. */
export function cantileverTipStiffnessNm(dia_mm: number, overhang_mm: number, E_Pa: number): number {
  const dM = dia_mm / 1000;
  const lM = Math.max(overhang_mm / 1000, 1e-4);
  const I_m4 = (Math.PI * Math.pow(dM, 4)) / 64;
  return (3 * E_Pa * I_m4) / Math.pow(lM, 3);
}

/** Tlusty single-DOF turning regenerative-chatter limiting depth of cut [mm] -- the conservative,
 *  RPM-independent between-lobe minimum stable width: b_lim = 2*zeta*k / Kc. With k in N/m and Kc
 *  (specific cutting force) in N/mm^2, b_lim[mm] = 2*zeta*k / (Kc*1000). A stiffer tool-point (larger
 *  k) tolerates a deeper cut before regenerative chatter onset; a slender boring bar (small k) chatters
 *  at a shallow DOC. Returns Infinity on degenerate input (-> never flags; fail-safe for an advisory).
 *  Ref: Tlusty & Polacek (1963); Altintas, Manufacturing Automation 2e (2012) zero-order stability limit. */
export function turningChatterLimitMm(stiffness_N_per_m: number, zeta: number, kc_N_mm2: number): number {
  if (!(stiffness_N_per_m > 0) || !(zeta > 0) || !(kc_N_mm2 > 0)) return Infinity;
  return (2 * zeta * stiffness_N_per_m) / (kc_N_mm2 * 1000);
}

function formatTimeTurning(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Generate stepped G97 RPM commands that emulate G96 CSS behavior.
 *
 * USE CASE: Dual-spindle cutoff on machines where G96 is blocked during
 * synchronized spindle operation (e.g., Okuma Multus with G199 active).
 *
 * Instead of G96 S{Vc} which dynamically adjusts RPM, we pre-calculate
 * the correct RPM at discrete diameter points and output explicit G97 S{rpm}
 * commands at each step. Both spindles follow the same explicit RPM —
 * no conflict with synchronization.
 *
 * The blade moves from OD toward center. As diameter decreases, RPM must
 * increase to maintain constant surface speed: RPM = (1000 × Vc) / (π × D)
 *
 * Safety:
 *   - G50 Smax still clamps maximum RPM
 *   - G99 (feed/rev) MUST be active — chip load stays constant as RPM changes
 *   - Feed reduction in last 20% of travel (blade rigidity decreases near center)
 *   - Explicit both-spindle RPM command for sync safety
 *
 * @param od_mm         Part outer diameter (start of cut)
 * @param Vc_m_min      Target cutting speed (m/min)
 * @param maxRPM        Spindle speed clamp
 * @param feed_mm_rev   Feed per revolution for cutoff
 * @param steps         Number of diameter steps (5-10 typical)
 * @param controller    Controller type for syntax differences
 * @param cutoffZ       Z position of cutoff
 */
function generateSteppedCSSCutoff(params: {
  od_mm: number;
  Vc_m_min: number;
  maxRPM: number;
  feed_mm_rev: number;
  steps: number;
  controller: string;
  cutoffZ_mm: number;
  lineNumFn: () => string;
}): string[] {
  const { od_mm, Vc_m_min, maxRPM, feed_mm_rev, steps, controller, cutoffZ_mm, lineNumFn: ln } = params;
  const lines: string[] = [];

  // Calculate diameter steps from OD to center
  const stepSize = od_mm / (steps * 2); // Diameter steps (radius movement × 2)
  const isOkuma = controller === "okuma";
  const syncOn = isOkuma ? "G199" : "M205";   // Sync spindle ON
  const syncOff = isOkuma ? "G198" : "M206";   // Sync spindle OFF

  lines.push(`(=== DUAL-SPINDLE CUTOFF WITH STEPPED CSS EMULATION ===)`);
  lines.push(`(Target Vc: ${Vc_m_min} m/min | OD: ${od_mm}mm | Smax: ${maxRPM} RPM)`);
  lines.push(`(G96 blocked in sync mode — using pre-calculated G97 RPM steps)`);
  lines.push(``);
  lines.push(`${ln()} ${syncOn} (Synchronize spindles — both at same RPM)`);
  lines.push(`${ln()} G99 (Feed per rev — CRITICAL: maintains chip load as RPM changes)`);

  // Calculate RPM at starting diameter
  const startRPM = Math.min(Math.round((1000 * Vc_m_min) / (Math.PI * od_mm)), maxRPM);
  lines.push(`${ln()} G97 S${startRPM} M03 (RPM at D=${od_mm.toFixed(1)}mm)`);
  if (isOkuma) {
    lines.push(`${ln()} M143 (Sub-spindle forward — same direction as main)`);
  }
  lines.push(`${ln()} G00 X${(od_mm + 2).toFixed(1)} Z${cutoffZ_mm.toFixed(1)} (Rapid to cutoff position)`);
  lines.push(`${ln()} M08 (Coolant ON — aimed at blade tip)`);

  // Generate stepped cuts from OD to center
  let currentD = od_mm;
  const totalSteps = steps;
  const feedReductionPoint = od_mm * 0.2; // Reduce feed in last 20% of diameter

  for (let i = 0; i < totalSteps; i++) {
    const nextD = Math.max(currentD - stepSize * 2, -1.0); // -1.0 = past center
    const isLastStep = i === totalSteps - 1 || nextD <= 0;
    const targetD = isLastStep ? -1.0 : nextD; // Past center on last step

    // Calculate RPM for midpoint of this segment
    const midD = Math.max((currentD + Math.max(nextD, 2)) / 2, 2);
    const rpm = Math.min(Math.round((1000 * Vc_m_min) / (Math.PI * midD)), maxRPM);

    // Feed adjustment: reduce near center (blade loses rigidity)
    const inReductionZone = currentD <= feedReductionPoint;
    const segFeed = inReductionZone
      ? Math.round(feed_mm_rev * 0.6 * 1000) / 1000  // 60% feed near center
      : feed_mm_rev;

    const rpmNote = rpm >= maxRPM ? " (CLAMPED at Smax)" : "";
    const feedNote = inReductionZone ? " (reduced — blade rigidity)" : "";

    lines.push(`${ln()} G97 S${rpm} (Vc=${Vc_m_min} at D=${midD.toFixed(1)}mm = ${rpm} RPM${rpmNote})`);
    lines.push(`${ln()} G01 X${targetD.toFixed(1)} F${segFeed}${feedNote}`);

    if (isLastStep) break;
    currentD = nextD;
  }

  lines.push(`${ln()} G00 X${(od_mm + 10).toFixed(1)} (Rapid retract — part drops)`);
  lines.push(`${ln()} M09 (Coolant OFF)`);
  if (isOkuma) {
    lines.push(`${ln()} M145 (Sub-spindle STOP)`);
  }
  lines.push(`${ln()} ${syncOff} (Disengage spindle sync)`);
  lines.push(`(=== END DUAL-SPINDLE CUTOFF ===)`);

  return lines;
}

// ============================================================================
// ENGINE
// ============================================================================

export class TurningPrintToProgramEngine {
  readonly name = "TurningPrintToProgramEngine";
  readonly version = "1.0.0";

  // U-ARCH3: Cached registry resolution for material-specific physics
  private _resolvedMaterial: ResolvedMaterialContext | null = null;
  private _resolvedMachine: ResolvedMachineContext | null = null;
  private _cachedMaterialName: string = "";
  // Per-pipeline economic cost params for the Gilbert minimum-cost Vc cap (set in runPipeline from
  // input.economics; null -> calculateCuttingParams falls back to ECONOMIC_DEFAULTS).
  private _economics: EconomicMachiningParams | null = null;

  /** Run machine envelope guard against peak turning parameters. */
  private _checkEnvelope(opts: {
    spindle_rpm?: number; feed_mm_min?: number; power_kW?: number;
    x_mm?: number; z_mm?: number;
  }): string[] {
    const envelope = this._resolvedMachine
      ? machineEnvelopeGuardEngine.fromMachineData(this._resolvedMachine) : {};
    const result = machineEnvelopeGuardEngine.check({
      spindle_rpm: opts.spindle_rpm, feed_mm_min: opts.feed_mm_min,
      power_kW: opts.power_kW, x: opts.x_mm, z: opts.z_mm,
    }, envelope);
    return result.violations.map(v => `ENVELOPE: ${v.message}`);
  }

  calculate(action: string, params: Record<string, unknown>): TurningProgramResult {
    switch (action) {
      case "turning_print_to_program":
        return this.runPipeline(params as unknown as TurningInput);
      case "turning_process_plan":
        return this.runPipeline(params as unknown as TurningInput);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  // --------------------------------------------------------------------------
  // FEATURE CLASSIFICATION
  // --------------------------------------------------------------------------

  private classifyFeatures(features: TurningFeature[]): TurningFeature[] {
    return features.map(f => {
      const classified = { ...f };
      if (!classified.priority) {
        classified.priority = this.featurePriority(f.type);
      }
      if (!classified.required_operations || classified.required_operations.length === 0) {
        classified.required_operations = this.autoAssignOps(f);
      }
      // Upgrade for tight tolerances
      if (f.tolerance_mm !== undefined && f.tolerance_mm < 0.03 && classified.required_operations) {
        const ops = classified.required_operations;
        if (ops.includes("od_rough") && !ops.includes("od_finish")) {
          ops.push("od_finish");
        }
        if (ops.includes("id_rough") && !ops.includes("id_finish")) {
          ops.push("id_finish");
        }
      }
      return classified;
    });
  }

  private featurePriority(type: TurningFeatureType): number {
    const p: Record<string, number> = {
      face: 1, face_groove: 2,
      drill_center: 3, drill_through: 3, drill_blind: 3,
      od_straight: 4, od_taper: 4, od_contour: 4, od_shoulder: 4,
      id_bore: 5, id_contour: 5, id_taper: 5,
      groove_od: 6, groove_id: 6, groove_face: 6,
      thread_od: 7, thread_id: 7, thread_pipe: 7,
      // Live tooling after all turning ops, before cutoff
      whistle_notch: 7.5, od_pocket_mill: 7.5, cross_drill: 7.5,
      cross_tap: 7.5, keyway: 7.5, flat_mill: 7.5, hex_mill: 7.5,
      groove_cutoff: 8, part_off: 9,
    };
    return p[type] ?? 5;
  }

  private autoAssignOps(feat: TurningFeature): TurningOpType[] {
    switch (feat.type) {
      case "face": return ["face_rough", "face_finish"];
      case "face_groove": return ["groove"];
      case "od_straight":
      case "od_shoulder":
        return feat.surface_finish_Ra_um && feat.surface_finish_Ra_um < 1.6
          ? ["od_rough", "od_finish"]
          : ["od_rough", "od_finish"];
      case "od_taper": return ["od_rough", "taper", "od_finish"];
      case "od_contour": return ["od_rough", "od_finish"];
      case "id_bore":
        return feat.depth_mm && feat.depth_mm > 30
          ? ["center_drill", "drill", "bore_rough", "bore_finish"]
          : ["drill", "bore_rough", "bore_finish"];
      case "id_contour": return ["drill", "id_rough", "id_finish"];
      case "id_taper": return ["drill", "id_rough", "id_finish"];
      case "groove_od":
      case "groove_id":
        return feat.surface_finish_Ra_um && feat.surface_finish_Ra_um < 3.2
          ? ["groove", "groove_finish"]
          : ["groove"];
      case "groove_cutoff": return ["groove"];
      case "thread_od": return ["od_rough", "od_finish", "thread_single_point"];
      case "thread_id": return ["drill", "id_rough", "thread_single_point"];
      case "thread_pipe": return ["od_rough", "thread_single_point"];
      case "drill_center": return ["center_drill"];
      case "drill_through":
      case "drill_blind":
        return ["center_drill", "drill"];
      case "part_off": return ["part_off"];
      // Live tooling features
      case "whistle_notch": return ["live_whistle_notch"];
      case "od_pocket_mill": return ["live_od_pocket"];
      case "cross_drill": return ["live_cross_drill"];
      case "cross_tap": return ["live_cross_drill", "live_cross_tap"];
      case "keyway": return ["live_keyway"];
      case "flat_mill": return ["live_flat_mill"];
      case "hex_mill": return ["live_flat_mill"];
      default: return ["od_rough", "od_finish"];
    }
  }

  // --------------------------------------------------------------------------
  // TOOL SELECTION
  // --------------------------------------------------------------------------

  private selectInsert(opType: TurningOpType, feat: TurningFeature, toolNum: number): TurningInsert {
    const noseR = opType.includes("finish") ? 0.4 : 0.8;

    switch (opType) {
      case "od_rough":
      case "face_rough":
        return { tool_number: toolNum, insert_type: "CNMG", nose_radius_mm: 0.8, approach_angle_deg: 95,
          holder_style: "DCLNR", material: "carbide", coating: "TiAlN" };
      case "od_finish":
      case "face_finish":
        return { tool_number: toolNum, insert_type: "DNMG", nose_radius_mm: 0.4, approach_angle_deg: 93,
          holder_style: "DDJNR", material: "carbide", coating: "TiAlN" };
      case "id_rough":
      case "bore_rough":
        return { tool_number: toolNum, insert_type: "boring_bar", nose_radius_mm: 0.4, approach_angle_deg: 95,
          holder_style: "S-SCLCR", material: "carbide", coating: "TiCN",
          min_bore_mm: Math.max(10, (feat.id_mm || 20) * 0.6) };
      case "id_finish":
      case "bore_finish":
        return { tool_number: toolNum, insert_type: "boring_bar", nose_radius_mm: 0.2, approach_angle_deg: 93,
          holder_style: "S-SDQCR", material: "carbide", coating: "TiAlN",
          min_bore_mm: Math.max(8, (feat.id_mm || 20) * 0.6) };
      case "groove":
      case "groove_finish":
        return { tool_number: toolNum, insert_type: "groove_insert", nose_radius_mm: 0.2,
          approach_angle_deg: 0, holder_style: "GFVR", material: "carbide", coating: "TiN" };
      case "thread_single_point":
      case "thread_insert":
      case "od_thread":
      case "id_thread":
        return { tool_number: toolNum, insert_type: "thread_insert", nose_radius_mm: 0.1,
          approach_angle_deg: 60, holder_style: "SER", material: "carbide", coating: "TiN" };
      case "part_off":
        return { tool_number: toolNum, insert_type: "cutoff", nose_radius_mm: 0.1,
          approach_angle_deg: 0, holder_style: "GFKR", material: "carbide", coating: "TiAlN" };
      case "drill":
        return { tool_number: toolNum, insert_type: "drill", nose_radius_mm: 0,
          approach_angle_deg: 118, holder_style: "MT2", material: "carbide", coating: "TiAlN" };
      case "center_drill":
        return { tool_number: toolNum, insert_type: "drill", nose_radius_mm: 0,
          approach_angle_deg: 60, holder_style: "ER32", material: "carbide", coating: "TiN" };
      case "taper":
        return { tool_number: toolNum, insert_type: "VNMG", nose_radius_mm: noseR,
          approach_angle_deg: 35, holder_style: "SVJBR", material: "carbide", coating: "TiAlN" };
      // Live tooling
      case "live_whistle_notch":
      case "live_od_pocket":
      case "live_keyway":
      case "live_flat_mill":
        return { tool_number: toolNum, insert_type: "drill" as any, nose_radius_mm: 0,
          approach_angle_deg: 0, holder_style: "ER32-LIVE", material: "carbide", coating: "TiAlN" };
      case "live_cross_drill":
        return { tool_number: toolNum, insert_type: "drill", nose_radius_mm: 0,
          approach_angle_deg: 140, holder_style: "ER32-LIVE", material: "carbide", coating: "TiAlN" };
      case "live_cross_tap":
        return { tool_number: toolNum, insert_type: "drill" as any, nose_radius_mm: 0,
          approach_angle_deg: 0, holder_style: "ER32-LIVE", material: "HSS" as any, coating: "TiN" };
      default:
        return { tool_number: toolNum, insert_type: "CNMG", nose_radius_mm: 0.8,
          approach_angle_deg: 95, holder_style: "DCLNR", material: "carbide", coating: "TiAlN" };
    }
  }

  // --------------------------------------------------------------------------
  // CUTTING PARAMETERS + PHYSICS
  // --------------------------------------------------------------------------

  private calculateCuttingParams(
    opType: TurningOpType,
    feat: TurningFeature,
    mat: TurningMaterial,
    tool: TurningInsert,
    maxRPM: number,
    target: string,
  ): { params: TurningCuttingParams; physics: TurningOperationPhysics } {
    const iso = mat.iso_group || "P";

    // U-ARCH3: Material-specific physics from CANONICAL_MATERIAL_DB (13 materials, sync)
    // + async MaterialRegistry (2.9K) cache. Sync guarantees first-call accuracy.
    const matKey = mat.material_name?.toLowerCase().replace(/[^a-z0-9]/g, "_") ?? "";
    const matNameLower = mat.material_name?.toLowerCase() ?? "";
    const canonicalMat = CANONICAL_MATERIAL_DB[matKey]
      ?? Object.values(CANONICAL_MATERIAL_DB).find(m =>
        // ISO group must match to prevent cross-group false positives (e.g., "carbon fiber" → Carbon Steel)
        m.iso_group === iso && (
          m.name.toLowerCase().includes(matNameLower)
          || matNameLower.includes(m.name.toLowerCase().split(" ")[0])
        )
      );

    // Async registry enrichment for future calls (non-blocking, populates cache)
    // Invalidate cache when material changes between calls on the same singleton
    const currentMatName = mat.material_name ?? "";
    if (!this._resolvedMaterial || this._cachedMaterialName !== currentMatName) {
      this._cachedMaterialName = currentMatName;
      this._resolvedMaterial = null;
      resolveMaterial({ material_name: mat.material_name, iso_group: iso as ISOGroup })
        .then(rm => { this._resolvedMaterial = rm; })
        .catch(() => { /* fallback to canonical — handled below */ });
    }

    // Priority: cached registry > sync canonical DB > MachKB defaults
    const rm = this._resolvedMaterial;
    const kz = rm ? { kc1_1: rm.kc1_1, mc: rm.mc }
      : canonicalMat ? { kc1_1: canonicalMat.kc1_1, mc: canonicalMat.mc }
      : getKienzleByISO(iso);
    const tay = rm ? { C: rm.taylor_C, n: rm.taylor_n }
      : canonicalMat ? { C: canonicalMat.taylor_C, n: canonicalMat.taylor_n }
      : getTaylor(iso);
    const speeds = TURNING_SPEEDS[iso] || TURNING_SPEEDS.P;
    const feeds = TURNING_FEEDS[iso] || TURNING_FEEDS.P;

    const isFinish = opType.includes("finish");
    const isGroove = opType.includes("groove") || opType === "part_off";
    const isThread = opType.includes("thread");
    const isDrill = opType === "drill" || opType === "center_drill";

    // Cutting speed selection
    let Vc: number;
    if (isDrill) {
      Vc = speeds.rough * 0.6;
    } else if (isThread) {
      Vc = speeds.rough * 0.5;
    } else if (isGroove) {
      Vc = speeds.rough * 0.7;
    } else if (isFinish) {
      Vc = speeds.finish;
    } else {
      Vc = speeds.rough;
    }

    // Target adjustments
    if (target === "max_speed") Vc *= 1.15;
    else if (target === "max_tool_life") Vc *= 0.80;
    else if (target === "surface_quality") Vc *= 1.05;

    // Economic cutting-speed cap (Gilbert 1950 minimum-cost velocity) -- IMPLEMENTS the previously
    // no-op optimization_target "min_cost". Vc is only LOWERED toward the cost optimum, never raised
    // (safe direction: lower Vc -> lower spindle power, longer life). Applies ONLY under "min_cost",
    // and only to ROUGH material-removal turning (incl. face/bore); SKIPPED for thread/groove/part-off/
    // drill (Vc operation-constrained) and FINISH (Vc chosen for surface integrity / BUE avoidance, not
    // tool economy -- and finishing is low-MRR, a negligible tool-cost share).
    //
    // SCOPE (R12, closed-loop validated 2026-06-27, dashboards/lathe-vc-economy-validate.json): NOT a
    // default-on cap. The closed-loop showed the canonical rough table speed is already within ~5% of
    // the Gilbert optimum (P: rough 220 vs optimum ~209 m/min), so default-capping is cost-neutral
    // (-0.05% over 15 real JM parts) and slightly RAISES cost on machine-dominated parts -- the
    // cost-aware insight (aggressive Vc is correct when tooling is a small cost share). So balanced /
    // other targets keep the canonical table speeds unchanged; only callers that explicitly request
    // "min_cost" (incl. the closed-loop runner) opt into the cost-optimal rough Vc.
    const econCapEligible = target === "min_cost" && !isThread && !isGroove && !isDrill && !isFinish;
    if (econCapEligible) {
      const econ = this._economics ?? ECONOMIC_DEFAULTS;
      const cap = economicVcCap(tay.C, tay.n, econ, 0); // floor 0: the true Gilbert minimum-cost optimum
      if (cap !== null) Vc = Math.min(Vc, cap);
    }

    // Work diameter for RPM
    const workD = feat.od_mm || feat.id_mm || feat.diameter_mm || 50;
    let rpm = rpmFromDiam(Vc, workD);
    rpm = Math.min(rpm, maxRPM);
    // Recalculate actual Vc
    const actualVc = (Math.PI * workD * rpm) / 1000;

    // Feed per revolution
    let f: number;
    if (isDrill) {
      f = feeds.rough * 0.5;
    } else if (isThread) {
      f = feat.thread_pitch_mm || 1.5;
    } else if (isGroove) {
      f = feeds.rough * 0.4;
    } else if (isFinish) {
      f = feeds.finish;
      if (target === "surface_quality") f *= 0.7;
    } else {
      f = feeds.rough;
    }

    // Depth of cut
    let ap: number;
    if (isDrill) {
      ap = (feat.diameter_mm || 10) / 2;
    } else if (isGroove) {
      ap = feat.groove_width_mm || feat.width_mm || 3;
    } else if (isThread) {
      ap = (feat.thread_pitch_mm || 1.5) * 0.6136;  // Thread depth = 0.6136 × pitch
    } else if (isFinish) {
      ap = 0.3;
    } else {
      ap = Math.min(3.0, (feat.depth_mm || 3));
    }

    // Physics — corrected with rake angle + approach angle (Sandvik Metal Cutting Guide)
    const rakeAngle = isFinish ? 8 : 6;  // Finish inserts have more positive rake
    const approachAngle = tool.approach_angle_deg || 95; // Standard OD turning = 95°
    // Effective chip thickness: h_eff = f × sin(κr) for approach angle correction
    const sinKappa = Math.sin((approachAngle * Math.PI) / 180);
    const chipThickness = isThread ? ap * 0.3 : f * sinKappa;
    const Fc = correctedCuttingForce({
      kc1_1: kz.kc1_1, mc: kz.mc,
      ap_mm: ap,
      chip_thickness_mm: chipThickness,
      rake_angle_deg: rakeAngle,
    });
    const power = (Fc * actualVc) / 60000;
    const torque = (Fc * workD / 2) / 1000;
    const toolLife = taylorLifeTurning(tay.C, tay.n, actualVc);
    // THERMAL DERATE (gap-to-100 factor 3/4): a long CONTINUOUS cut heats the cutting edge, so the tool
    // wears faster than the room-temperature Taylor life predicts. thermalDeratingFactor(iso, t_sec)
    // returns [0.70, 1.0] (exactly 1.0 for cuts <= 10s, more aggressive for thermally-sensitive ISO-S).
    // It scales the PREDICTED tool life DOWN -- the conservative / safe direction (earlier tool change,
    // never a longer claimed life). NEVER-SOFTEN: it touches ONLY tool_life_min, NOT cutting force /
    // power / torque / Ra / any safety verdict. Continuous single-pass cut time = cutLength / feedRate;
    // short ops (groove/part-off/thread/drill) self-exclude via the <=10s -> 1.0 guard.
    // NaN-safe (mirrors estimateCycleTime's `|| 50` idiom): a malformed length must self-heal to the
    // fallback rather than poison tool_life_min via NaN. `??` alone would let NaN through.
    const featAxialLen = Number.isFinite(feat.length_mm) ? (feat.length_mm as number)
      : Number.isFinite(feat.depth_mm) ? (feat.depth_mm as number) : 25;
    const cutLenMm = opType.includes("face") ? Math.max(workD / 2, 1) : featAxialLen;
    const feedRateMmMin = f * (rpm > 0 ? rpm : 1); // mm/rev * rev/min
    const cutTimeSec = feedRateMmMin > 0 ? (cutLenMm / feedRateMmMin) * 60 : 0;
    const thermalFactor = thermalDeratingFactor(iso, cutTimeSec);
    const toolLifeThermal = toolLife * thermalFactor;
    const Ra = predictRaTurning(isThread ? 0.1 : f, tool.nose_radius_mm || 0.4);
    const mrrVal = ap * f * actualVc * 1000;  // MRR = ap × f × Vc × 1000 [mm³/min]

    return {
      params: {
        spindle_rpm: rpm,
        feed_mm_rev: Math.round(f * 1000) / 1000,
        depth_of_cut_mm: Math.round(ap * 100) / 100,
        cutting_speed_m_min: Math.round(actualVc),
      },
      physics: {
        cutting_force_N: Math.round(Fc),
        power_kW: Math.round(power * 100) / 100,
        torque_Nm: Math.round(torque * 10) / 10,
        tool_life_min: Math.round(toolLifeThermal),
        predicted_Ra_um: Math.round(Ra * 100) / 100,
        mrr_mm3_min: Math.round(mrrVal),
      },
    };
  }

  // --------------------------------------------------------------------------
  // CYCLE TIME ESTIMATION
  // --------------------------------------------------------------------------

  private estimateCycleTime(opType: TurningOpType, feat: TurningFeature, params: TurningCuttingParams): number {
    const feedRate = params.feed_mm_rev * params.spindle_rpm; // mm/min
    if (feedRate <= 0) return 10;

    let cutLength: number;
    switch (opType) {
      case "face_rough":
      case "face_finish":
        cutLength = (feat.od_mm || 50) / 2;
        break;
      case "od_rough":
      case "od_finish":
      case "taper":
        cutLength = feat.length_mm || 50;
        break;
      case "id_rough":
      case "id_finish":
      case "bore_rough":
      case "bore_finish":
        cutLength = feat.depth_mm || feat.length_mm || 30;
        break;
      case "groove":
      case "groove_finish":
        cutLength = feat.groove_depth_mm || feat.depth_mm || 5;
        break;
      case "thread_single_point":
      case "thread_insert":
      case "od_thread":
      case "id_thread": {
        const threadLen = feat.length_mm || 20;
        const pitch = feat.thread_pitch_mm || 1.5;
        const threadPasses = Math.ceil(pitch * 0.6136 / 0.15); // ~0.15mm per pass
        cutLength = threadLen * threadPasses;
        break;
      }
      case "drill":
      case "center_drill":
        cutLength = feat.depth_mm || feat.length_mm || 20;
        break;
      case "part_off":
        cutLength = (feat.od_mm || 50) / 2;
        break;
      default:
        cutLength = feat.length_mm || 50;
    }

    // Multi-pass for roughing
    let passes = 1;
    if (opType.includes("rough") && feat.depth_mm) {
      passes = Math.max(1, Math.ceil(feat.depth_mm / params.depth_of_cut_mm));
    }

    const cutTime = (cutLength * passes) / feedRate * 60; // seconds
    const toolChangeTime = 5; // seconds for turret index
    const rapidTime = 2; // approach/retract

    return Math.round(cutTime + toolChangeTime + rapidTime);
  }

  // --------------------------------------------------------------------------
  // G-CODE GENERATION
  // --------------------------------------------------------------------------

  /**
   * Stickout/overhang auto-compensation (UNIT 1). For a deflection-prone op (boring bar L/D>4, or a
   * slender OD cut on stock L/D>6) it reduces depth-of-cut THEN feed (NEVER cutting speed) to bring the
   * predicted deflection within the tolerance budget, and compensates any residual with an opposing
   * taper. MUTATES params in place (ap/fr only) and returns the radial compensation + operator notes.
   * Uses the SAME canonical deflection engines + conservative full-Fc bound as the advisory checks, so
   * the active adjustment can never diverge from the warning. Never throws (fail-safe -> no change).
   */
  private applyStickoutCompensation(
    opType: TurningOpType,
    feat: TurningFeature | undefined,
    tool: TurningInsert,
    input: TurningInput,
    params: TurningCuttingParams,
    physics: TurningOperationPhysics,
  ): { compensation_x_mm: number; setup_flag: boolean; notes: string[] } {
    const none = { compensation_x_mm: 0, setup_flag: false, notes: [] as string[] };
    try {
      const isBoring = opType === "id_rough" || opType === "id_finish" || opType === "bore_rough" || opType === "bore_finish";
      const isOD = opType === "od_rough" || opType === "od_finish";
      if (!isBoring && !isOD) return none;

      const ap0 = params.depth_of_cut_mm;
      const fr0 = params.feed_mm_rev;
      const mc = getKienzleByISO(input.material.iso_group)?.mc ?? 0.25;
      const tol = Math.min(finitePos(feat?.tolerance_mm, 0.05), 0.05) / 2; // half the +/- tolerance budget
      if (!(ap0 > 0) || !(fr0 > 0) || !(tol > 0)) return none;

      let deflAt: (ap: number, fr: number) => number;
      let cutLen: number;

      if (isBoring) {
        const barDia = tool.min_bore_mm ? tool.min_bore_mm * 0.7 : 12;
        const overhang = boringBarOverhangMm(feat, input.part_length_mm);
        if (!(barDia > 0) || overhang / barDia <= 4) return none; // not deflection-prone
        cutLen = overhang;
        deflAt = (ap, fr) => boringBarDeflectionEngine.calculate({
          bar_diameter_mm: barDia, overhang_mm: overhang,
          depth_of_cut_mm: ap, feed_per_rev_mm: fr, bar_material: "carbide",
        })?.static_deflection?.value ?? 0;
      } else {
        const wpD = input.bar_stock_od_mm;
        const wpL = finitePos(input.stock_overhang_mm, input.part_length_mm);
        if (!(wpD > 0) || !(wpL > 0) || wpL / wpD <= 6) return none; // only slender stock deflects meaningfully
        const Fc0 = physics.cutting_force_N;
        if (!(Fc0 > 0)) return none;
        const iso = input.material.iso_group;
        const wpMat: "steel" | "aluminum" | "titanium" = iso === "N" ? "aluminum" : iso === "S" ? "titanium" : "steel";
        cutLen = finitePos(feat?.length_mm, wpL);
        deflAt = (ap, fr) => {
          // Conservative full-Fc bending bound (matches the advisory check). Fc scales ~linear in ap
          // and as fr^(1-mc) (Kienzle), so reducing the lever reduces the bending force the part sees.
          const fcScaled = Fc0 * (ap / ap0) * Math.pow(fr / fr0, 1 - mc);
          return partDeflectionEngine.calculate({
            cross_section: "round", diameter_mm: wpD, wall_thickness_mm: wpD,
            wall_height_mm: wpL, wall_length_mm: wpL,
            support_type: input.tailstock ? "simply_supported" : "cantilever",
            cutting_force_n: fcScaled, material: wpMat, tolerance_mm: tol,
          })?.max_deflection?.value ?? 0;
        };
      }

      const plan = stickoutCompensationPlan({ ap0_mm: ap0, fr0_mm: fr0, tol_mm: tol, mc, cut_length_mm: cutLen, deflAt });
      if (plan.lever === "none") return none;
      // MUTATE only ap/fr (the emitted params). Vc / spindle_rpm are deliberately UNTOUCHED.
      params.depth_of_cut_mm = plan.ap_mm;
      params.feed_mm_rev = plan.fr_mm;
      return { compensation_x_mm: plan.compensation_x_mm, setup_flag: plan.setup_flag, notes: plan.notes };
    } catch (e: any) {
      log.warn?.(`[TurningPrintToProgram] stickout compensation skipped -- ${e?.message}`);
      return none;
    }
  }

  /**
   * Map the planned turning operations to the OkumaB250 master-post operation contract.
   * Lathe geometry: X = diameter, Z = axial (negative toward the chuck); bar OD = stock.
   * Geometry is resolved from the source TurningFeature (looked up by feature_id). Tool
   * orientation is derived per op family (rear-turret JM Okuma convention). One OkumaTurningOp
   * per planned op; a missing feature falls back to bar-stock geometry so nothing is silently
   * dropped (the post itself fail-loud-skips any non-finite field and reports skipped_operations).
   */
  private toOkumaOperations(operations: TurningPlannedOp[], input: TurningInput): OkumaTurningOp[] {
    const featById = new Map(input.features.map((f) => [f.id, f] as const));
    const barOd = finitePos(input.bar_stock_od_mm, 50);
    const isoGroup = input.material.iso_group;
    const out: OkumaTurningOp[] = [];

    for (const op of operations) {
      const feat = featById.get(op.feature_id);
      const cp = op.cutting_params;
      const t = op.tool;
      const z0 = finiteOr(feat?.position_z_mm, 0);
      const len = finitePos(feat?.length_mm, 0);
      const zEnd = z0 - len;
      const featOd = finitePos(feat?.od_mm ?? feat?.diameter_mm, finitePos(input.finished_od_mm, barOd));
      const featId = finitePos(feat?.id_mm, 0);
      let ot = this.mapOkumaOpType(op.operation_type);
      // INTERNAL threading guard: the planner maps thread_id -> thread_single_point too, but the OSP
      // G71 cycle (generateThreadingCycle) uses EXTERNAL geometry (cut inward from the major). Emitting
      // it for an internal thread would drive the wrong direction (scrap/crash). Re-route an internal
      // thread to a finish bore (the pilot was already drilled + rough-bored) -- never a wrong thread;
      // runPipeline surfaces a loud "internal threading not auto-emitted" warning so it is not silent.
      if (ot === "thread" && feat?.type === "thread_id") ot = "id_finish";
      const coolant: "flood" | "off" = op.coolant === "off" ? "off" : "flood";

      // Per-family X/Z spans (X = diameter). Default = an OD-turning span (bar OD to feature OD).
      let start_x = barOd, end_x = featOd, start_z = z0, end_z = zEnd;
      switch (ot) {
        case "od_rough":
        case "od_finish":
          start_x = barOd; end_x = featOd; start_z = z0; end_z = zEnd; break;
        case "id_rough":
        case "id_finish": {
          // Boring opens a drilled pilot OUT to the final ID: start at the pilot (smaller),
          // end at the final bore diameter. A real pilot diameter is not carried on the feature,
          // so approximate it at 70% of the final ID (floored at 2mm) and GUARANTEE start < end
          // so the bore span is never degenerate (a zero-width bore would remove no material).
          const finalId = finitePos(featId || featOd, 10);
          const pilot = Math.min(Math.max(2, finalId * 0.7), finalId - 0.5);
          start_x = pilot; end_x = finalId; start_z = z0; end_z = zEnd; break;
        }
        case "face":
          start_x = barOd; end_x = 0; start_z = z0; end_z = z0; break;
        case "thread": {
          const pitch = finitePos(feat?.thread_pitch_mm, 1.5);
          start_x = featOd; end_x = featOd - 2 * (pitch * 0.61); start_z = z0; end_z = zEnd; break;
        }
        case "groove": {
          const gDepth = finitePos(feat?.groove_depth_mm, finitePos(feat?.depth_mm, 2));
          start_x = featOd; end_x = featOd - 2 * gDepth; start_z = z0; end_z = z0; break;
        }
        case "part_off":
          start_x = barOd; end_x = 0; start_z = z0; end_z = z0; break;
        case "drill":
          start_x = 0; end_x = 0; start_z = 0; end_z = -(finitePos(feat?.depth_mm, len) || 10); break;
        case "c_mill":
          start_x = featOd; end_x = featOd; start_z = z0; end_z = zEnd; break;
      }

      // Stickout auto-compensation (UNIT 1): shift the commanded diameter inward by 2x the radial
      // residual deflection at the unsupported end, so the deflected tool/part produces the nominal
      // size. Applies to the same OD/ID ops the deflection loop targeted (comp is 0 for others).
      const defComp = finiteOr(op.deflection_compensation_x_mm, 0);
      if (defComp > 0) end_x = end_x - 2 * defComp;

      // Thermal-growth compensation (UNIT #11, default OFF -- OPERATOR-GATED). A hot workpiece is oversize
      // by its diametral growth dD = alpha(ISO) * D * dT; cutting to (D - dD) while hot lands on nominal
      // once the part cools to ambient. Fires ONLY when the operator enables it AND supplies an explicit
      // thermal_delta_t_c (never fabricated); bounded by THERMAL_MAX_OFFSET_MM so a runaway dT cannot scrap
      // the part (clamp fails SAFE = under-compensate = slightly oversize = re-cuttable). X (diameter) only.
      const dT = input.thermal_delta_t_c;
      if (input.enable_thermal_growth_comp === true && typeof dT === "number" && Number.isFinite(dT) && dT > 0 && end_x > 0) {
        const growth = getCTEByISO(isoGroup) * end_x * dT; // diametral thermal growth, mm
        const dD = Math.min(growth, THERMAL_MAX_OFFSET_MM); // bounded -- never over-cut past the cap
        end_x = end_x - dD;                                  // cut smaller when hot -> shrinks to nominal
      }

      const okOp: OkumaTurningOp = {
        operation_type: ot,
        tool_number: t.tool_number,
        tool_orientation: this.okumaToolOrientation(ot),
        insert_radius_mm: finiteOr(t.nose_radius_mm, 0.4),
        tool_description: t.insert_type,
        material_iso: isoGroup as OkumaTurningOp["material_iso"],
        spindle_rpm: cp.spindle_rpm,
        css_m_min: cp.cutting_speed_m_min,
        css_max_rpm: input.max_spindle_rpm,
        feed_mm_rev: cp.feed_mm_rev,
        depth_of_cut_mm: cp.depth_of_cut_mm,
        start_x, start_z, end_x, end_z,
        coolant,
      };
      if (ot === "thread") {
        const pitch = finitePos(feat?.thread_pitch_mm, 1.5);
        okOp.thread_pitch_mm = pitch;
        okOp.thread_depth_mm = finitePos(feat?.thread_depth_mm, pitch * 0.61);
        okOp.thread_passes = Math.max(1, op.passes || 5);
      }
      if (ot === "groove") {
        okOp.groove_width_mm = finitePos(feat?.groove_width_mm ?? feat?.width_mm, 3);
      }
      out.push(okOp);
    }
    return out;
  }

  /** Map the internal TurningOpType to the OkumaB250 post's operation_type enum. */
  private mapOkumaOpType(t: TurningOpType): OkumaTurningOp["operation_type"] {
    const s = String(t);
    if (s === "od_finish") return "od_finish";
    if (s === "id_rough" || s === "bore_rough") return "id_rough";
    if (s === "id_finish" || s === "bore_finish") return "id_finish";
    if (s.startsWith("face")) return "face";
    // Threading: route the single-point thread op types the planner actually produces (thread_od ->
    // thread_single_point, etc.) to the verified OSP G71 cycle. WITHOUT this they fell through to the
    // od_rough default and a thread feature emitted a ROUGHING pass -- the part was never threaded
    // (U-LW-THREAD-ROUTE). generateThreadingCycle is EXTERNAL geometry (minorDia = start_x - depth*2);
    // an INTERNAL thread (thread_id, also planned as thread_single_point) is re-routed to a finish
    // bore in toOkumaOperations + flagged, never emitted as a wrong/crash external thread.
    if (s === "thread" || s === "thread_single_point" || s === "thread_insert" || s === "od_thread") return "thread";
    // G23: a tight-tolerance groove feature plans ["groove","groove_finish"] (autoAssignOps), but
    // groove_finish fell through to the od_rough default -> the FINISH pass emitted G85 roughing on a
    // groove. Route it to the groove cycle (same geometry case + emit). The echo-side single-finish-
    // plunge refinement (vs the roughing multi-plunge) is a separate post-side gap.
    if (s === "groove" || s === "groove_finish") return "groove";
    if (s === "part_off") return "part_off";
    if (s === "drill" || s === "center_drill") return "drill";
    if (s.startsWith("live_") || s === "c_mill") return "c_mill";
    // od_rough + any unmapped op falls to the safest turning default; the op still emits and the
    // post fail-loud-skips a non-finite field rather than silently producing a wrong cycle.
    return "od_rough";
  }

  /**
   * Derive the ISO tool orientation (1-9) for the master post. Rear-turret JM Okuma convention:
   * internal work (ID/bore/drill) approaches from the front (8), external work (OD/face/thread/
   * groove/part-off) from the rear (3). The post uses orientation for the tool comment + nose-comp side.
   */
  private okumaToolOrientation(ot: OkumaTurningOp["operation_type"]): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 {
    switch (ot) {
      case "id_rough":
      case "id_finish":
      case "bore":
      case "drill":
        return 8;
      default:
        return 3;
    }
  }

  /**
   * Emit the program through the VERIFIED Okuma OSP master post. Returns the joined G-code plus the
   * post's skipped-op count + warnings, or null if the mapping cannot run (caller then falls back to
   * the generic Fanuc emitter -- never worse than the prior behaviour). Never throws.
   */
  private emitViaOkumaPost(
    operations: TurningPlannedOp[],
    input: TurningInput,
    safeRpm?: number,
  ): { text: string; skipped: number; warnings: string[] } | null {
    try {
      const okumaOps = this.toOkumaOperations(operations, input);
      if (okumaOps.length === 0) return null;
      const config: Partial<OkumaLathePostConfig> = {
        program_number: deriveProgramNumber(input.part_number),
        program_comment: input.part_number || "PRISM LATHE",
        machine_id: mapOkumaMachineId(input.machine_model),
        units: "metric",
        work_offset: 54,
        use_css: true,
        // U-LW-01: clamp the G50 spindle cap to the centrifugal-safe RPM when it is tighter than the
        // machine max (fail-closed; monotonic -- only ever LOWERS the cap, never raises it).
        css_max_rpm: Math.min(finitePos(input.max_spindle_rpm, 3500), safeRpm && safeRpm > 0 ? safeRpm : Infinity),
        sub_spindle_enabled: !!input.sub_spindle,
      };
      const out = okumaB250LatheMasterPostEngine.generateProgram(okumaOps, config);
      return {
        text: (out.gcode || []).join("\n"),
        skipped: out.skipped_operations ?? 0,
        warnings: out.warnings ?? [],
      };
    } catch (e: any) {
      log.warn?.(`[TurningPrintToProgram] Okuma post emit failed -- ${e?.message}`);
      return null;
    }
  }

  private generateGCode(operations: TurningPlannedOp[], input: TurningInput): string {
    const lines: string[] = [];
    let lineNum = 10;
    const ln = () => { const n = lineNum; lineNum += 10; return `N${n}`; };

    // Header
    lines.push(`%`);
    lines.push(`O${(input.part_number || "0001").replace(/\D/g, "").slice(0, 4) || "0001"} (${input.part_number || "PART-001"})`);
    lines.push(`(MATERIAL: ${input.material.material_name} ISO-${input.material.iso_group})`);
    lines.push(`(STOCK: OD${input.bar_stock_od_mm}mm x L${input.part_length_mm}mm)`);
    lines.push(`(GENERATED BY PRISM TurningPrintToProgramEngine v1.0)`);
    lines.push(``);

    // Safe start
    lines.push(`${ln()} G28 U0 W0 (Home)`);
    lines.push(`${ln()} G50 S${input.max_spindle_rpm || 4000} (Max RPM clamp)`);
    lines.push(`${ln()} G21 G40 G97 (Metric, cancel comp, direct RPM)`);
    lines.push(``);

    let currentTool = -1;

    for (const op of operations) {
      // Tool change
      if (op.tool.tool_number !== currentTool) {
        lines.push(`(--- TOOL ${op.tool.tool_number}: ${op.tool.insert_type} ${op.tool.holder_style} ---)`);
        lines.push(`${ln()} T${String(op.tool.tool_number).padStart(2, "0")}${String(op.tool.tool_number).padStart(2, "0")} (${op.tool.insert_type} R${op.tool.nose_radius_mm})`);
        lines.push(`${ln()} G96 S${op.cutting_params.cutting_speed_m_min} M03 (CSS ${op.cutting_params.cutting_speed_m_min} m/min)`);

        // Coolant
        if (op.coolant === "flood") lines.push(`${ln()} M08 (Coolant ON)`);
        else if (op.coolant === "high_pressure") lines.push(`${ln()} M88 (High-pressure coolant)`);

        currentTool = op.tool.tool_number;
      }

      const f = op.cutting_params.feed_mm_rev;
      const ap = op.cutting_params.depth_of_cut_mm;

      lines.push(`(OP${op.op_number}: ${op.operation_type} - Feature ${op.feature_id})`);

      switch (op.operation_type) {
        case "face_rough": {
          // G72 facing cycle — multi-pass with physics-driven DOC
          const faceStartX = input.bar_stock_od_mm / 2 + 2;
          const faceStock = op.cutting_params.depth_of_cut_mm * (op.passes || 3); // Total facing stock
          const faceDOC = op.cutting_params.depth_of_cut_mm || 1.5;
          lines.push(`${ln()} G00 X${faceStartX.toFixed(1)} Z2.0`);
          // G72 W(DOC) R(retract) — Fanuc facing canned cycle
          lines.push(`${ln()} G72 W${faceDOC.toFixed(2)} R1.0`);
          lines.push(`${ln()} G72 P${lineNum + 1} Q${lineNum + 3} U0.2 W0.05 F${f}`);
          // Profile definition (P to Q blocks)
          lines.push(`${ln()} G00 Z${(-faceStock).toFixed(2)}`);
          lines.push(`${ln()} G01 X${faceStartX.toFixed(1)} F${f}`);
          lines.push(`${ln()} X-1.0 (Face to center — past centerline for clean finish)`);
          lines.push(`${ln()} G00 Z2.0`);
          break;
        }
        case "face_finish": {
          // G70 finishing pass references the same P/Q profile from roughing
          const faceFinStartX = input.bar_stock_od_mm / 2 + 2;
          lines.push(`${ln()} G00 X${faceFinStartX.toFixed(1)} Z1.0`);
          lines.push(`${ln()} G01 Z0.0 F${(f * 0.5).toFixed(3)} (Finish face — reduced feed for Ra)`);
          lines.push(`${ln()} G01 X-1.0 F${(f * 0.5).toFixed(3)}`);
          lines.push(`${ln()} G00 Z2.0`);
          lines.push(`${ln()} G28 U0 W0`);
          break;
        }
        case "od_rough": {
          const feat = input.features.find(ff => ff.id === op.feature_id);
          const targetOD = feat?.od_mm || (input.finished_od_mm || input.bar_stock_od_mm - 4);
          const startZ = -(feat?.length_mm || input.part_length_mm);
          const isID = op.operation_type.startsWith("id_") || op.operation_type.startsWith("bore_");
          const profilePts = feat?.profile_points;

          // Rapid to start position above stock
          lines.push(`${ln()} G00 X${(input.bar_stock_od_mm + 2).toFixed(1)} Z2.0`);

          // G71 line 1: U=DOC, R=retract
          lines.push(`${ln()} G71 U${ap.toFixed(1)} R1.0 (Rough DOC=${ap}mm)`);

          // Pre-calculate P and Q block numbers
          // P = next line after G71 line 2
          // Q = P + (profile_points_count + 1) * 10 (for each segment + departure)
          const pNum = lineNum + 10; // Will be the number AFTER the G71 P/Q line
          const numProfileLines = profilePts ? profilePts.length + 1 : 2; // +1 for Q departure
          const qNum = pNum + numProfileLines * 10;

          const finishStock = isID ? -0.3 : 0.5;
          lines.push(`${ln()} G71 P${pNum} Q${qNum} U${finishStock.toFixed(1)} W0.1 F${f}`);

          // ── Profile definition (P..Q) with TNC + arcs ──
          if (profilePts && profilePts.length > 0) {
            const tnc = isID ? "G41" : "G42";
            const firstPt = profilePts[0];

            // P block: TNC ON + rapid to first profile X position
            lineNum = pNum; // Force lineNum to P
            lines.push(`N${pNum} ${tnc} G00 X${firstPt.X.toFixed(3)} (P — TNC ON)`);
            lineNum += 10;

            // Each profile point gets its own sequential N-number
            for (let i = 0; i < profilePts.length; i++) {
              const pt = profilePts[i];
              const feedStr = pt.feed ? ` F${pt.feed.toFixed(3)}` : "";
              // U-LW-GC-CORNER: Fanuc corner rounding (,R<v>) / chamfer (,C<v>) appended to the block
              // terminating at this profile corner (corner_R wins if both set). Fanuc-inline path only
              // (fail-closed for Okuma); OSP corner syntax differs -- never emit ",R"/",C" to an Okuma post.
              const cornerStr = cornerSuffix(pt.corner_R, pt.corner_C);
              const nStr = `N${lineNum}`;
              lineNum += 10;

              if (pt.type === "arc_cw") {
                const arcAddr = pt.R !== undefined ? ` R${pt.R.toFixed(3)}` : `${pt.I !== undefined ? ` I${pt.I.toFixed(3)}` : ""}${pt.K !== undefined ? ` K${pt.K.toFixed(3)}` : ""}`;
                lines.push(`${nStr} G02 X${pt.X.toFixed(3)} Z${pt.Z.toFixed(3)}${arcAddr}${cornerStr}${feedStr}`);
              } else if (pt.type === "arc_ccw") {
                const arcAddr = pt.R !== undefined ? ` R${pt.R.toFixed(3)}` : `${pt.I !== undefined ? ` I${pt.I.toFixed(3)}` : ""}${pt.K !== undefined ? ` K${pt.K.toFixed(3)}` : ""}`;
                lines.push(`${nStr} G03 X${pt.X.toFixed(3)} Z${pt.Z.toFixed(3)}${arcAddr}${cornerStr}${feedStr}`);
              } else if (i === 0) {
                // First linear: Z approach to profile start
                lines.push(`${nStr} G01 Z${pt.Z.toFixed(3)}${cornerStr}${feedStr || ` F${f}`}`);
              } else {
                lines.push(`${nStr} G01 X${pt.X.toFixed(3)} Z${pt.Z.toFixed(3)}${cornerStr}${feedStr}`);
              }
            }

            // Q block: TNC OFF departure — must travel ≥ 2× nose radius
            lines.push(`N${qNum} G40 G00 X${(input.bar_stock_od_mm + 2).toFixed(1)} (Q — TNC OFF)`);
            lineNum = qNum + 10;
          } else {
            // Fallback: simple 2-point profile
            lineNum = pNum;
            lines.push(`N${pNum} G00 X${targetOD.toFixed(1)}`);
            lineNum += 10;
            lines.push(`N${lineNum} G01 Z${startZ.toFixed(1)} F${f}`);
            lines.push(`N${qNum} G00 X${(input.bar_stock_od_mm + 2).toFixed(1)}`);
            lineNum = qNum + 10;
          }

          // Store P/Q for G70 finish reference
          (op as any)._pBlock = pNum;
          (op as any)._qBlock = qNum;

          lines.push(`${ln()} G00 X${(input.bar_stock_od_mm + 5).toFixed(1)} Z2.0`);
          break;
        }
        case "od_finish": {
          const roughOp = operations.find(o => o.feature_id === op.feature_id && o.operation_type === "od_rough");
          const pBlock = (roughOp as any)?._pBlock;
          const qBlock = (roughOp as any)?._qBlock;

          if (pBlock && qBlock) {
            lines.push(`${ln()} G00 X${(input.bar_stock_od_mm + 2).toFixed(1)} Z2.0`);
            lines.push(`${ln()} G70 P${pBlock} Q${qBlock} (Finish — retraces rough profile)`);
            lines.push(`${ln()} G00 X${(input.bar_stock_od_mm + 5).toFixed(1)} Z2.0`);
          } else {
            // No roughing op found — generate standalone finish pass
            const feat = input.features.find(ff => ff.id === op.feature_id);
            const targetOD = feat?.od_mm || (input.finished_od_mm || input.bar_stock_od_mm - 4);
            lines.push(`${ln()} G00 X${(targetOD + 1).toFixed(1)} Z2.0`);
            lines.push(`${ln()} G01 Z${(-(feat?.length_mm || input.part_length_mm)).toFixed(1)} F${f} (Single finish pass)`);
            lines.push(`${ln()} G00 X${(input.bar_stock_od_mm + 5).toFixed(1)} Z2.0`);
          }
          break;
        }
        case "id_rough":
        case "bore_rough": {
          const feat = input.features.find(ff => ff.id === op.feature_id);
          const boreD = feat?.id_mm || 20;
          const depth = feat?.depth_mm || 30;
          const profilePtsID = feat?.profile_points;

          // Rapid to start position below bore OD
          lines.push(`${ln()} G00 X${(boreD - 2).toFixed(1)} Z2.0`);
          lines.push(`${ln()} G71 U${ap.toFixed(1)} R1.0`);

          // P/Q calculation
          const pNumID = lineNum + 10;
          const numIDLines = profilePtsID ? profilePtsID.length + 1 : 2;
          const qNumID = pNumID + numIDLines * 10;

          lines.push(`${ln()} G71 P${pNumID} Q${qNumID} U-0.3 W0.1 F${f}`);

          if (profilePtsID && profilePtsID.length > 0) {
            // Full ID profile with G41 TNC and arcs
            const firstPtID = profilePtsID[0];
            lineNum = pNumID;
            lines.push(`N${pNumID} G41 G00 X${firstPtID.X.toFixed(3)} (P — ID TNC ON)`);
            lineNum += 10;

            for (let i = 0; i < profilePtsID.length; i++) {
              const pt = profilePtsID[i];
              const feedStr = pt.feed ? ` F${pt.feed.toFixed(3)}` : "";
              // U-LW-GC-CORNER: same Fanuc corner rounding/chamfer as the OD path (clone-don't-fork).
              const cornerStr = cornerSuffix(pt.corner_R, pt.corner_C);
              const nStr = `N${lineNum}`;
              lineNum += 10;

              if (pt.type === "arc_cw") {
                const arcAddr = pt.R !== undefined ? ` R${pt.R.toFixed(3)}` : `${pt.I !== undefined ? ` I${pt.I.toFixed(3)}` : ""}${pt.K !== undefined ? ` K${pt.K.toFixed(3)}` : ""}`;
                lines.push(`${nStr} G02 X${pt.X.toFixed(3)} Z${pt.Z.toFixed(3)}${arcAddr}${cornerStr}${feedStr}`);
              } else if (pt.type === "arc_ccw") {
                const arcAddr = pt.R !== undefined ? ` R${pt.R.toFixed(3)}` : `${pt.I !== undefined ? ` I${pt.I.toFixed(3)}` : ""}${pt.K !== undefined ? ` K${pt.K.toFixed(3)}` : ""}`;
                lines.push(`${nStr} G03 X${pt.X.toFixed(3)} Z${pt.Z.toFixed(3)}${arcAddr}${cornerStr}${feedStr}`);
              } else if (i === 0) {
                lines.push(`${nStr} G01 Z${pt.Z.toFixed(3)}${cornerStr}${feedStr || ` F${f}`}`);
              } else {
                lines.push(`${nStr} G01 X${pt.X.toFixed(3)} Z${pt.Z.toFixed(3)}${cornerStr}${feedStr}`);
              }
            }

            lines.push(`N${qNumID} G40 G00 X${(boreD - 5).toFixed(1)} (Q — ID TNC OFF)`);
            lineNum = qNumID + 10;
          } else {
            // Fallback simple bore profile
            lineNum = pNumID;
            lines.push(`N${pNumID} G00 X${boreD.toFixed(1)}`);
            lineNum += 10;
            lines.push(`N${lineNum} G01 Z${(-depth).toFixed(1)} F${f}`);
            lines.push(`N${qNumID} G00 X${(boreD - 5).toFixed(1)}`);
            lineNum = qNumID + 10;
          }

          (op as any)._pBlock = pNumID;
          (op as any)._qBlock = qNumID;
          lines.push(`${ln()} G00 X${(boreD - 5).toFixed(1)} Z2.0`);
          break;
        }
        case "id_finish":
        case "bore_finish": {
          const roughOpID = operations.find(o => o.feature_id === op.feature_id && (o.operation_type === "bore_rough" || o.operation_type === "id_rough"));
          const pBlockID = (roughOpID as any)?._pBlock;
          const qBlockID = (roughOpID as any)?._qBlock;

          if (pBlockID && qBlockID) {
            lines.push(`${ln()} G70 P${pBlockID} Q${qBlockID} (ID Finish — retraces bore profile)`);
          } else {
            lines.push(`${ln()} G70 P${lineNum - 60} Q${lineNum - 30} (Bore finish cycle)`);
          }
          lines.push(`${ln()} G28 U0 W0`);
          break;
        }
        case "groove":
        case "groove_finish": {
          const feat = input.features.find(ff => ff.id === op.feature_id);
          const grooveD = (feat?.od_mm || input.bar_stock_od_mm) - (feat?.groove_depth_mm || feat?.depth_mm || 3) * 2;
          // U-LW-GC-GROOVE: position_z_mm is a SIGNED Z coordinate (negative = into the part from the
          // Z0 face) -- same convention as the canonical toOkumaOperations path (z0 = finiteOr(position_z_mm,0))
          // and the OD z_start/z_end fields. The prior `-(position_z_mm || 20)` negated it, flipping a
          // signed -20 to +20 (groove commanded off the front of the part, into air). Use the signed
          // value directly, default -20 (a groove 20mm into the part).
          const grooveZ = finiteOr(feat?.position_z_mm, -20);
          const grooveW = feat?.groove_width_mm || feat?.width_mm || 3;
          lines.push(`${ln()} G00 X${((feat?.od_mm || input.bar_stock_od_mm) + 2).toFixed(1)} Z${grooveZ.toFixed(1)}`);
          lines.push(`${ln()} G75 R1.0`);
          // G75 Q = Z-axis peck step (µm on Fanuc). Use groove_width/3 for chip clearing, max 2mm
          const zPeck = Math.min(2, grooveW / 3); // mm — peck step for chip evacuation
          lines.push(`${ln()} G75 X${grooveD.toFixed(1)} Z${(grooveZ - grooveW).toFixed(1)} P${Math.round(ap * 1000)} Q${Math.round(zPeck * 1000)} F${(f * 0.5).toFixed(3)}`);
          // U-LW-GC-GROOVE: G04 dwell at groove bottom -- lets the insert clean up the bottom for
          // surface finish + chip clearance before retract (Peter Smid Ch.19). P-word is milliseconds.
          lines.push(`${ln()} G04 P200 (Dwell at groove bottom for finish)`);
          lines.push(`${ln()} G00 X${((feat?.od_mm || input.bar_stock_od_mm) + 5).toFixed(1)}`);
          // NOTE (#6): the JM Okuma fleet does NOT use G75/G76 for grooving. OSP grooving is G1 plunge
          // + G4 dwell (emitted by OkumaB250LatheMasterPostEngine); this inline G75 path is Fanuc-only
          // and fail-closed for Okuma. The roadmap "align grooving to G76" was WRONG (R12): in the JM
          // corpus G76 = threading (983 files), G75 = 0 files. Do NOT convert grooving to G76.
          break;
        }
        case "thread_single_point":
        case "od_thread":
        case "id_thread": {
          const feat = input.features.find(ff => ff.id === op.feature_id);
          const threadD = feat?.od_mm || 20;
          const pitch = feat?.thread_pitch_mm || 1.5;
          const threadDepth = pitch * 0.6136;
          const threadLen = feat?.length_mm || 20;
          const starts = feat?.thread_starts || 1;
          const minorD = threadD - threadDepth * 2;
          const lead = pitch * starts; // Multi-start: lead = pitch × starts (Machinery's Handbook Ch.31)
          lines.push(`${ln()} G00 X${(threadD + 2).toFixed(1)} Z5.0`);
          lines.push(`${ln()} G97 S${Math.round(op.cutting_params.spindle_rpm)} M03`);
          // Generate one G76 pair per start, offset by 360/starts degrees
          for (let s = 0; s < starts; s++) {
            const angleOffset = (360 / starts) * s;
            if (starts > 1) {
              lines.push(`${ln()} (--- Thread start ${s + 1}/${starts}, Q-angle ${angleOffset.toFixed(0)}deg ---)`);
              // Q parameter = start angle in 0.001 degree increments on Fanuc/Haas
              lines.push(`${ln()} G76 P0${Math.round(threadDepth * 100)}060 Q${Math.round(angleOffset * 1000)} R0.05`);
            } else {
              lines.push(`${ln()} G76 P0${Math.round(threadDepth * 100)}060 Q${Math.round(threadDepth * 100 / 8)}0 R0.05`);
            }
            lines.push(`${ln()} G76 X${minorD.toFixed(3)} Z${(-threadLen).toFixed(1)} P${Math.round(threadDepth * 1000)} Q${Math.round(threadDepth * 100)} F${lead.toFixed(3)} (Start ${s + 1}/${starts}, lead ${lead}mm)`);
            if (starts > 1 && s < starts - 1) {
              // Return to start position for next thread start
              lines.push(`${ln()} G00 X${(threadD + 2).toFixed(1)} Z5.0`);
            }
          }
          lines.push(`${ln()} G96 S${op.cutting_params.cutting_speed_m_min} (Return to CSS)`);
          break;
        }
        case "drill":
        case "center_drill": {
          const feat = input.features.find(ff => ff.id === op.feature_id);
          const drillDepth = feat?.depth_mm || 20;
          const peck = Math.min(5, drillDepth / 3);
          lines.push(`${ln()} G00 X0 Z3.0 (Drill on centerline)`);
          lines.push(`${ln()} G97 S${op.cutting_params.spindle_rpm} M03`);
          if (op.operation_type === "center_drill") {
            lines.push(`${ln()} G01 Z${(-3).toFixed(1)} F${(f * 0.3).toFixed(3)} (Center drill)`);
          } else {
            lines.push(`${ln()} G83 Z${(-drillDepth).toFixed(1)} Q${(peck * 1000).toFixed(0)} F${f.toFixed(3)} (Peck drill)`);
          }
          lines.push(`${ln()} G80`);
          lines.push(`${ln()} G00 Z5.0`);
          lines.push(`${ln()} G96 S${op.cutting_params.cutting_speed_m_min}`);
          break;
        }
        case "part_off": {
          const partOffD = input.features.find(ff => ff.id === op.feature_id)?.od_mm || input.bar_stock_od_mm;
          const partOffZ = -(input.part_length_mm + 1);

          if (input.dual_spindle_cutoff && input.sub_spindle) {
            // ── DUAL-SPINDLE CUTOFF: Stepped G97 CSS emulation ──
            // G96 is blocked when both spindles are synchronized (e.g., Okuma G199).
            // We pre-calculate RPM at discrete diameter steps to maintain constant
            // surface speed without G96. Both spindles follow explicit G97 commands.
            const cutoffVc = op.cutting_params.cutting_speed_m_min * 0.65; // 35% reduction for parting
            const steppedLines = generateSteppedCSSCutoff({
              od_mm: partOffD,
              Vc_m_min: cutoffVc,
              maxRPM: input.max_spindle_rpm || 4000,
              feed_mm_rev: f * 0.3,
              steps: Math.max(5, Math.min(12, Math.ceil(partOffD / 10))), // ~1 step per 10mm diameter
              controller: input.controller || "fanuc",
              cutoffZ_mm: partOffZ,
              lineNumFn: ln,
            });
            for (const sl of steppedLines) {
              lines.push(sl);
            }
          } else {
            // ── STANDARD SINGLE-SPINDLE CUTOFF ──
            lines.push(`${ln()} G00 X${(partOffD + 2).toFixed(1)} Z${partOffZ.toFixed(1)}`);
            // Entry feed ramp: 50% feed for first 2mm to prevent shock
            lines.push(`${ln()} G01 X${(partOffD - 2).toFixed(1)} F${(f * 0.15).toFixed(3)} (Entry — reduced feed)`);
            // Full feed through body
            lines.push(`${ln()} G01 X${Math.max(partOffD * 0.2, 5).toFixed(1)} F${(f * 0.3).toFixed(3)} (Part off — full feed)`);
            // Reduced feed approaching center (blade flexes)
            lines.push(`${ln()} G01 X-1.0 F${(f * 0.18).toFixed(3)} (Approaching center — reduced feed)`);
            lines.push(`${ln()} G00 X${(partOffD + 10).toFixed(1)}`);
          }
          break;
        }
        case "taper": {
          const feat = input.features.find(ff => ff.id === op.feature_id);
          const angle = feat?.taper_angle_deg || 5;
          const taperLen = feat?.length_mm || 20;
          const startD = feat?.od_mm || 30;
          const endD = startD - 2 * taperLen * Math.tan(angle * Math.PI / 180);
          lines.push(`${ln()} G00 X${(startD + 1).toFixed(1)} Z2.0`);
          lines.push(`${ln()} G01 X${startD.toFixed(1)} Z0.0 F${f}`);
          lines.push(`${ln()} G01 X${endD.toFixed(1)} Z${(-taperLen).toFixed(1)} F${f} (Taper ${angle}°)`);
          lines.push(`${ln()} G00 X${(startD + 5).toFixed(1)} Z5.0`);
          break;
        }
        // ── LIVE TOOLING OPERATIONS ──
        case "live_whistle_notch": {
          const feat = input.features.find(ff => ff.id === op.feature_id);
          const angle = finitePos(feat?.notch_angle_deg, 10);
          const depth = finitePos(feat?.notch_depth_mm, 3.175); // 0.125"
          const width = finitePos(feat?.notch_width_mm, 10);
          const zPos = finiteOr(feat?.position_z_mm, -20); // signed Z (negative = into part); finitePos wrongly rejected a signed -Z
          const cPos = finiteOr(feat?.c_axis_position_deg, 0);
          const toolD = finitePos(feat?.live_tool_diameter_mm, 12.7); // 0.5" end mill
          const liveRPM = Math.min(Math.round((1000 * 80) / (Math.PI * toolD)), 6000);
          const liveFeed = Math.round(liveRPM * 0.05 * 3); // fz × flutes × RPM

          lines.push(`(--- LIVE TOOL: Whistle Notch ${angle}° ---)`);
          lines.push(`${ln()} M05 (Stop main spindle)`);
          lines.push(`${ln()} M19 (Orient spindle — C-axis lock)`);
          lines.push(`${ln()} G00 C${cPos.toFixed(1)} (Index C-axis to notch position)`);
          lines.push(`${ln()} G97 S${liveRPM} M133 (Live tool ON, ${liveRPM} RPM)`);
          lines.push(`${ln()} M08`);
          // Position above notch
          lines.push(`${ln()} G00 X${((feat?.od_mm || input.bar_stock_od_mm) + 5).toFixed(1)} Z${zPos.toFixed(1)}`);
          // Plunge to depth at angle
          const plungeX = (feat?.od_mm || input.bar_stock_od_mm) - depth * 2;
          lines.push(`${ln()} G01 X${plungeX.toFixed(3)} F${Math.round(liveFeed * 0.3)} (Plunge to notch depth)`);
          // Cut notch at angle
          const dZ = width * Math.tan(angle * Math.PI / 180);
          lines.push(`${ln()} G01 Z${(zPos - width).toFixed(3)} X${(plungeX + dZ * 2).toFixed(3)} F${liveFeed} (Angled notch ${angle}°)`);
          // Retract
          lines.push(`${ln()} G00 X${((feat?.od_mm || input.bar_stock_od_mm) + 10).toFixed(1)}`);
          lines.push(`${ln()} M135 (Live tool OFF)`);
          lines.push(`${ln()} M03 (Main spindle restart)`);
          break;
        }
        case "live_od_pocket": {
          const feat = input.features.find(ff => ff.id === op.feature_id);
          const pocketW = finitePos(feat?.pocket_width_mm, 31.75);  // 1.25"
          const pocketD = finitePos(feat?.pocket_depth_mm, 3.175);  // 0.125"
          const zPos = finiteOr(feat?.position_z_mm, -30); // signed Z (negative = into part)
          const cPos = finiteOr(feat?.c_axis_position_deg, 0);
          const toolD = finitePos(feat?.live_tool_diameter_mm, 12.7);
          const liveRPM = Math.min(Math.round((1000 * 80) / (Math.PI * toolD)), 6000);
          const liveFeed = Math.round(liveRPM * 0.04 * 3);
          const partOD = finitePos(feat?.od_mm, input.bar_stock_od_mm);
          const pocketBottom = partOD - pocketD * 2;

          lines.push(`(--- LIVE TOOL: OD Pocket Mill ${pocketW.toFixed(1)}mm × ${pocketD.toFixed(3)}mm deep ---)`);
          lines.push(`${ln()} M05 (Stop main spindle)`);
          lines.push(`${ln()} M19 (Orient spindle)`);
          lines.push(`${ln()} G00 C${cPos.toFixed(1)} (C-axis position)`);
          lines.push(`${ln()} G97 S${liveRPM} M133 (Live tool ON)`);
          lines.push(`${ln()} M08`);
          // Position above pocket start
          lines.push(`${ln()} G00 X${(partOD + 5).toFixed(1)} Z${zPos.toFixed(1)}`);
          // Stepdown passes (0.5mm per pass for tool steel). Cap at 200 so a
          // sanitizer-missed pocketD can never spin an unbounded G-code loop (U-W3).
          const stepDown = 0.5;
          const passes = Math.min(Math.ceil(pocketD / stepDown), 200);
          for (let p = 1; p <= passes; p++) {
            const currentDepth = Math.min(p * stepDown, pocketD);
            const currentX = partOD - currentDepth * 2;
            lines.push(`${ln()} G01 X${currentX.toFixed(3)} F${Math.round(liveFeed * 0.3)} (Pocket pass ${p}/${passes}, depth=${currentDepth.toFixed(2)}mm)`);
            lines.push(`${ln()} G01 Z${(zPos - pocketW).toFixed(3)} F${liveFeed} (Cut pocket length)`);
            lines.push(`${ln()} G00 X${(partOD + 2).toFixed(1)} (Retract)`);
            lines.push(`${ln()} G00 Z${zPos.toFixed(1)} (Return to start)`);
          }
          lines.push(`${ln()} G00 X${(partOD + 10).toFixed(1)}`);
          lines.push(`${ln()} M135 (Live tool OFF)`);
          lines.push(`${ln()} M03 (Main spindle restart)`);
          break;
        }
        case "live_cross_drill": {
          const feat = input.features.find(ff => ff.id === op.feature_id);
          const holeD = finitePos(feat?.cross_hole_diameter_mm, finitePos(feat?.diameter_mm, 6.35));
          const zPos = finiteOr(feat?.position_z_mm, -20); // signed Z (negative = into part); finitePos wrongly rejected a signed -Z
          const cPos = finiteOr(feat?.c_axis_position_deg, 0);
          const partOD = finitePos(feat?.od_mm, input.bar_stock_od_mm);
          const liveRPM = Math.min(Math.round((1000 * 60) / (Math.PI * holeD)), 4000);
          const liveFeed = 0.05 * liveRPM; // 0.05 mm/rev

          lines.push(`(--- LIVE TOOL: Cross Drill Ø${holeD.toFixed(1)}mm ---)`);
          lines.push(`${ln()} M05 (Stop main spindle)`);
          lines.push(`${ln()} M19 (Orient spindle)`);
          lines.push(`${ln()} G00 C${cPos.toFixed(1)}`);
          lines.push(`${ln()} G97 S${liveRPM} M133 (Live drill ON)`);
          lines.push(`${ln()} M08`);
          lines.push(`${ln()} G00 X${(partOD + 5).toFixed(1)} Z${zPos.toFixed(1)}`);
          // Peck drill through OD into center
          const drillDepth = partOD / 2 + 2; // Through to center + clearance
          lines.push(`${ln()} G83 X${(partOD - drillDepth * 2).toFixed(1)} R${(partOD / 2 + 2).toFixed(1)} Q${(holeD * 2000).toFixed(0)} F${Math.round(liveFeed)} (Cross peck drill)`);
          lines.push(`${ln()} G80`);
          lines.push(`${ln()} G00 X${(partOD + 10).toFixed(1)}`);
          lines.push(`${ln()} M135 (Live tool OFF)`);
          lines.push(`${ln()} M03 (Main spindle restart)`);
          break;
        }
        case "live_cross_tap":
        case "live_keyway":
        case "live_flat_mill": {
          const feat = input.features.find(ff => ff.id === op.feature_id);
          lines.push(`(--- LIVE TOOL: ${op.operation_type} ---)`);
          lines.push(`${ln()} M05 (Stop main spindle)`);
          lines.push(`${ln()} M19 (Orient spindle)`);
          lines.push(`${ln()} (Live tooling operation — CAM-generated toolpath recommended)`);
          lines.push(`${ln()} (Feature: ${feat?.type || op.operation_type}, pos Z=${finiteOr(feat?.position_z_mm, 0)}mm)`);
          lines.push(`${ln()} M03 (Main spindle restart)`);
          break;
        }
        default: {
          lines.push(`(${op.operation_type} — manual programming required)`);
        }
      }

      lines.push(``);
    }

    // Footer
    lines.push(`${ln()} M09 (Coolant OFF)`);
    lines.push(`${ln()} G28 U0 W0 (Home)`);
    lines.push(`${ln()} M30 (Program end)`);
    lines.push(`%`);

    return lines.join("\n");
  }

  // --------------------------------------------------------------------------
  // COOLANT SELECTION
  // --------------------------------------------------------------------------

  private selectCoolant(iso: string, opType: TurningOpType): TurningPlannedOp["coolant"] {
    if (iso === "S" || iso === "H") return "high_pressure";
    if (opType === "drill" || opType === "center_drill") return "flood";
    if (opType.includes("thread")) return "flood";
    if (iso === "N") return "mist";
    if (opType === "part_off") return "flood";
    return "flood";
  }

  // --------------------------------------------------------------------------
  // MAIN PIPELINE
  // --------------------------------------------------------------------------

  runPipeline(input: TurningInput): TurningProgramResult {
    log.info(`[TurningPrintToProgram] Pipeline for ${input.part_number || "PART"}`);

    const warnings: TurningProgramResult["warnings"] = [];

    // U-ARCH3: Fire async machine resolution (non-blocking, enriches defaults)
    if (!this._resolvedMachine) {
      resolveMachine({ brand: input.machine_brand, model: input.machine_model, max_rpm: input.max_spindle_rpm, max_power_kw: input.max_power_kW })
        .then(rm => { this._resolvedMachine = rm; })
        .catch(() => {});
    }
    const rmach = this._resolvedMachine;
    const maxRPM = input.max_spindle_rpm || rmach?.max_spindle_rpm || 4000;
    const maxPower = input.max_power_kW || rmach?.max_power_kw || 11;
    const target = input.optimization_target || "balanced";
    // Resolve economic cost params for the Gilbert minimum-cost Vc cap (per-pipeline; see economicVcCap).
    this._economics = input.economics ?? null;

    // Validate
    if (!input.material?.iso_group) {
      warnings.push({ stage: "intake", severity: "warning", message: "No ISO group — defaulting to P (steel)" });
    }
    if (input.bar_stock_od_mm <= 0) {
      warnings.push({ stage: "intake", severity: "critical", message: "Bar stock OD must be positive" });
    }
    if (input.finished_od_mm && input.finished_od_mm >= input.bar_stock_od_mm) {
      warnings.push({ stage: "intake", severity: "critical", message: `Finished OD (${input.finished_od_mm}mm) must be smaller than bar stock OD (${input.bar_stock_od_mm}mm)` });
    }
    // L/D ratio chatter risk
    const ld_ratio = input.part_length_mm / input.bar_stock_od_mm;
    if (ld_ratio > 4 && !input.tailstock) {
      warnings.push({ stage: "safety", severity: "warning", message: `L/D ratio ${ld_ratio.toFixed(1)} > 4 — tailstock support recommended to prevent chatter` });
    }
    if (ld_ratio > 8) {
      warnings.push({ stage: "safety", severity: "critical", message: `L/D ratio ${ld_ratio.toFixed(1)} > 8 — steady rest or follow rest required` });
    }
    // Chuck jaw clearance + drill depth checks
    for (const f of input.features) {
      if (f.type === "part_off" || f.type === "groove_cutoff") continue;
      if (f.od_mm && f.od_mm > input.bar_stock_od_mm) {
        warnings.push({ stage: "safety", severity: "critical", message: `Feature ${f.id}: OD ${f.od_mm}mm exceeds bar stock ${input.bar_stock_od_mm}mm` });
      }
      // Drill L/D ratio checks for ALL hole features
      if ((f.type === "drill_through" || f.type === "drill_blind" || f.type === "id_bore") && f.depth_mm && f.diameter_mm) {
        const drillLD = f.depth_mm / f.diameter_mm;
        if (drillLD > 10) {
          warnings.push({ stage: "safety", severity: "critical", message: `Feature ${f.id}: drill L/D=${drillLD.toFixed(1)} > 10 — gun drill or special tooling required` });
        } else if (drillLD > 5) {
          warnings.push({ stage: "safety", severity: "warning", message: `Feature ${f.id}: drill L/D=${drillLD.toFixed(1)} > 5 — deep hole peck cycle (G83) required, through-tool coolant recommended` });
        } else if (drillLD > 3) {
          warnings.push({ stage: "safety", severity: "info", message: `Feature ${f.id}: drill L/D=${drillLD.toFixed(1)} > 3 — peck drilling recommended` });
        }
      }
      // Also check drill_through using depth_mm or length_mm
      if (f.type === "drill_through" && (f.depth_mm || f.length_mm)) {
        const drillDepth = f.depth_mm || f.length_mm;
        const drillDia = f.diameter_mm || 10;
        const drillLD = drillDepth / drillDia;
        if (drillLD > 5 && !f.diameter_mm) {
          // Already caught above if diameter_mm exists; this catches length_mm fallback
          warnings.push({ stage: "safety", severity: "warning", message: `Feature ${f.id}: deep drill L/D=${drillLD.toFixed(1)} — peck cycle + through-tool coolant` });
        }
      }
    }

    // Pipeline checkpoint manager (0-D-ARCH U-ARCH2)
    const cpm = new PipelineCheckpointManager("turning-print-to-program", (input as any).runId);
    cpm.checkpoint("validate_intake", 0, { feature_count: input.features.length, warnings: warnings.length });

    // Classify features
    const classified = this.classifyFeatures(input.features);

    // Intelligent sequencing — shared helper (0-D-ARCH U-ARCH2)
    // Falls back to simple priority sort if engine unavailable
    try {
      const ise = getIntelligentSequencingEngine();
      const seqOps = classified.map(f => ({
        id: f.id,
        type: f.type,
        operation: f.required_operations?.[0] || f.type,
        phase: f.priority !== undefined ? Math.min(7, Math.floor(f.priority)) : undefined,
        depth_mm: f.depth_mm || f.length_mm,
        is_datum: f.type === "face",
        spindle: "main" as const,
      }));
      const seqResult = ise.sequence(seqOps);
      // Reorder classified to match sequenced order
      const idOrder = new Map<string, number>(seqResult.operations.map((o: any, i: number) => [o.id, i]));
      classified.sort((a, b) => (idOrder.get(a.id) ?? 99) - (idOrder.get(b.id) ?? 99));
      if (seqResult.rules_applied.length > 0) {
        log.info(`[TurningPrintToProgram] Sequencing: ${seqResult.rules_applied.length} rules, ${seqResult.tool_changes} tool changes, quality=${seqResult.sequence_quality_score}`);
      }
    } catch {
      // Fallback: simple priority sort
      classified.sort((a, b) => (a.priority || 5) - (b.priority || 5));
    }
    cpm.checkpoint("classify_sequence", 1, { classified_count: classified.length });

    // Generate operations
    const operations: TurningPlannedOp[] = [];
    let opNum = 1;
    let toolNum = 1;
    const toolMap = new Map<string, number>();

    for (const feat of classified) {
      for (const opType of (feat.required_operations || [])) {
        // Deduplicate tools by type
        const toolKey = `${opType}`;
        if (!toolMap.has(toolKey)) {
          toolMap.set(toolKey, toolNum++);
        }
        const tNum = toolMap.get(toolKey)!;

        const tool = this.selectInsert(opType, feat, tNum);
        const { params, physics } = this.calculateCuttingParams(opType, feat, input.material, tool, maxRPM, target);

        // Power check
        if (physics.power_kW > maxPower) {
          warnings.push({ stage: "planning", severity: "warning",
            message: `Op ${opNum} (${opType}): power ${physics.power_kW}kW exceeds machine limit ${maxPower}kW — reducing DOC` });
          params.depth_of_cut_mm *= maxPower / physics.power_kW;
          physics.power_kW = maxPower;
        }

        // PIPELINE-VAR: stickout/overhang auto-compensation (UNIT 1) -- actively CLOSE the deflection
        // loop. Reduce ap then feed (never Vc) to bring predicted deflection within tolerance; any
        // residual is compensated by an opposing taper (deflection_compensation_x_mm). Runs AFTER the
        // power check so it composes on the already-power-limited ap (both levers only ever reduce).
        const stickout = this.applyStickoutCompensation(opType, feat, tool, input, params, physics);
        for (const n of stickout.notes) {
          warnings.push({ stage: "physics", severity: stickout.setup_flag ? "warning" : "info", message: `Op ${opNum}: ${n}` });
        }

        const cycleTime = this.estimateCycleTime(opType, feat, params);

        // Multi-pass count
        let passes = 1;
        if (opType.includes("rough") && feat.depth_mm) {
          passes = Math.max(1, Math.ceil(feat.depth_mm / params.depth_of_cut_mm));
        }

        // Enhanced coolant selection via CoolantStrategyEngine (0-D-ARCH U-ARCH2)
        let coolant = this.selectCoolant(input.material.iso_group, opType);
        try {
          const cse = getCoolantStrategyEngine();
          const coolantResult = cse.calculate({
            workpiece_material: mapToCoolantMaterial(input.material.iso_group),
            operation: mapToCoolantOp(opType),
            cutting_speed_m_min: params.cutting_speed_m_min,
            depth_of_cut_mm: params.depth_of_cut_mm,
            hole_depth_mm: feat.depth_mm,
            hole_diameter_mm: feat.diameter_mm,
            workpiece_hardness_hrc: input.material.hardness_hrc,
          });
          // Map CoolantStrategy method to turning coolant enum
          const methodMap: Record<string, typeof coolant> = {
            flood: "flood", through_spindle: "high_pressure", through_tool: "high_pressure",
            mql: "mist", air_blast: "mist", dry: "off",
            cryogenic_co2: "high_pressure", cryogenic_ln2: "high_pressure",
          };
          coolant = methodMap[coolantResult.primary_method] || coolant;
        } catch {
          // Fallback to inline selectCoolant — already assigned above
        }

        // SmartToolSelector + EntryExitStrategy for live tooling ops (0-D-ARCH U-ARCH2)
        const opNotes: string[] = [];
        if (opType.startsWith("live_")) {
          try {
            const sts = getSmartToolSelector();
            const liveResult = sts.select({
              material_iso_group: input.material.iso_group,
              operation: opType.replace("live_", ""),
              max_diameter_mm: finitePos(feat.live_tool_diameter_mm, 12),
              max_depth_mm: finitePos(feat.depth_mm, finitePos(feat.pocket_depth_mm, 10)),
              optimization_goal: input.optimization_target || "balanced",
            });
            if (liveResult.best_tool) {
              opNotes.push(`SmartToolSelector: ${liveResult.best_tool.designation} (score=${liveResult.best_tool.score.toFixed(2)})`);
            }
          } catch { /* non-blocking */ }
          try {
            const eese = getEntryExitStrategyEngine();
            const entryResult = eese.selectEntry({
              tool_diameter: finitePos(feat.live_tool_diameter_mm, 12),
              pocket_depth: finitePos(feat.pocket_depth_mm, finitePos(feat.depth_mm, 5)),
              pocket_width: Number.isFinite(feat.pocket_width_mm as number) ? feat.pocket_width_mm : undefined,
              material: mapToCoolantMaterial(input.material.iso_group),
            });
            if (entryResult.recommended_method) {
              opNotes.push(`Entry: ${entryResult.recommended_method} (feed factor ${entryResult.feed_factor.toFixed(2)})`);
            }
          } catch { /* non-blocking */ }
        }

        operations.push({
          op_number: opNum++,
          feature_id: feat.id,
          operation_type: opType,
          tool,
          cutting_params: params,
          physics,
          cycle_time_sec: cycleTime,
          passes,
          canned_cycle: this.cannedCycleFor(opType),
          coolant,
          notes: opNotes,
          deflection_compensation_x_mm: stickout.compensation_x_mm || undefined,
        });
      }
    }
    cpm.checkpoint("generate_operations", 2, { operation_count: operations.length });

    // Workholding verification — shared helper (0-D-ARCH U-ARCH2)
    const maxFc = Math.max(...operations.map(o => o.physics?.cutting_force_N || 0), 0);
    if (maxFc > 0) {
      try {
        const defaultClamp = 20000; // 20 kN typical 3-jaw hydraulic
        const whResult = workholdingVerificationEngine.verify(
          { Fc_N: maxFc, operation_name: "max_force_op" },
          { type: "3_jaw_chuck", clamping_force_N: defaultClamp, clamp_points: 3, clamping_method: "hydraulic" },
        );
        if (whResult.verdict === "CRITICAL" || whResult.safety_factor < 1.5) {
          warnings.push({
            stage: "safety", severity: "warning",
            message: `Workholding: max cutting force ${Math.round(maxFc)}N vs clamping ${defaultClamp}N — safety factor ${whResult.safety_factor.toFixed(1)} (min 1.5)`,
          });
        }
        log.info(`[TurningPrintToProgram] Workholding verified: Fc=${Math.round(maxFc)}N, SF=${whResult.safety_factor.toFixed(1)}`);
      } catch {
        // Workholding engine not available — non-blocking
      }
    }

    // PIPELINE-VAR: Chuck-jaw grip-loss / overspeed check. The workholding force factor was only the
    // static 20kN-vs-Fc verify above (ignored input.chuck_type AND centrifugal grip-loss). chuckJawForceEngine
    // models the REAL required grip incl. CENTRIFUGAL grip-loss at RPM (jaws thrown outward -> reduced grip ->
    // part ejection, a high-RPM hazard the static check misses) using sourced per-chuck friction coeffs.
    // ADDITIVE advisory (never relaxes the static verdict) + conservative -> never-soften.
    // U-LW-01: capture the centrifugal-safe RPM here so the emit can CLAMP the G50 spindle cap to it
    // (close the loop -- the advisory below only WARNED; the value now actuates the emitted G50).
    let centrifugalSafeRpm: number | undefined;
    try {
      const cjD = input.bar_stock_od_mm;
      const cjL = input.part_length_mm;
      const cjFc = Math.max(...operations.map((o) => o.physics?.cutting_force_N || 0), 0);
      const cjRpm = Math.max(...operations.map((o) => o.cutting_params?.spindle_rpm || 0), 0);
      if (cjD > 0 && cjL > 0 && cjFc > 0 && cjRpm > 0) {
        // Workpiece density kg/m^3: source the REAL value from the canonical material DB by name;
        // else a fallback that is superalloy-aware so a dense Ni-superalloy (Inconel ~8190) is NEVER
        // under-estimated as Ti (~4500) -- under-estimating mass under-estimates centrifugal force and
        // could SUPPRESS a valid overspeed warning (physics-review P1). ISO-S splits Ti vs Ni by name.
        const iso = input.material.iso_group;
        const matNameD = input.material.material_name ?? "";
        const matKeyD = matNameD.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const isNiSuperalloy = /inconel|hastelloy|nimonic|waspaloy|rene|monel|nickel|718|625/i.test(matNameD);
        const rho = CANONICAL_MATERIAL_DB[matKeyD]?.density_kg_m3
          ?? (iso === "N" ? 2700 : iso === "S" ? (isNiSuperalloy ? 8200 : 4500) : 7850);
        const cjMass = Math.PI * Math.pow(cjD / 2 / 1000, 2) * (cjL / 1000) * rho; // solid round bar, kg
        // input.chuck_type -> ChuckJawForceEngine ChuckType (the engine picks the sourced friction per type).
        const ct = input.chuck_type === "collet" ? "collet"
          : input.chuck_type === "4_jaw" ? "4_jaw_independent"
          : "3_jaw_power"; // 3_jaw / face_plate / unspecified -> power chuck (JM default)
        const nJaws = input.chuck_type === "4_jaw" ? 4 : input.chuck_type === "collet" ? 1 : 3;
        const cj = chuckJawForceEngine.calculate({
          chuck_type: ct, jaw_type: "hard", num_jaws: nJaws,
          workpiece_mass_kg: cjMass, workpiece_od_mm: cjD, workpiece_length_mm: cjL,
          gripping_diameter_mm: cjD, gripping_length_mm: Math.min(cjL, 30), // typical chuck jaw axial contact
          spindle_rpm: cjRpm, max_spindle_rpm: input.max_spindle_rpm || cjRpm,
          // Standard turning force ratios (Sandvik Coromant tech guide / Boothroyd & Knight): radial Fr~0.4Fc,
          // axial Fa~0.5Fc. Realistic (not over-conservative) so the engine's ISO-10218 SF gate is meaningful.
          cutting_force_tangential_N: cjFc,
          cutting_force_radial_N: cjFc * 0.4,
          cutting_force_axial_N: cjFc * 0.5,
        });
        // U-LW-01 ACTUATE: capture the centrifugal-safe RPM (the speed where grip == cutting force)
        // whenever the physics computes it -- the emit clamps G50 to it so the program can never command
        // a speed where centrifugal grip-loss ejects the part (fail-closed; the machine + G96 CSS then
        // auto-reduce Vc at small diameters). Captured unconditionally, not only when the warning fires.
        if (cj.max_safe_rpm > 0) centrifugalSafeRpm = cj.max_safe_rpm;
        // Flag the MEANINGFUL hazards only: operating above the speed where centrifugal grip-loss
        // consumes the safety margin (rpm > max_safe_rpm) OR high grip-loss (>30%, the engine's own
        // counterbalance threshold). NOT cj.is_safe -- that requires SF>=2.5 AFTER centrifugal loss,
        // so it is ~always false at any production RPM and would alarm-fatigue every cut.
        if ((cj.max_safe_rpm > 0 && cjRpm > cj.max_safe_rpm) || cj.grip_loss_at_rpm_pct > 30) {
          warnings.push({
            stage: "safety", severity: "warning",
            message: `Chuck-jaw (${input.chuck_type || "3-jaw"}): centrifugal grip-loss ${cj.grip_loss_at_rpm_pct}% at ${cjRpm}rpm (max-safe ${cj.max_safe_rpm}rpm), required grip ${Math.round(cj.required_gripping_force_N)}N -- verify clamp force, reduce RPM, or add a closed-end work stop`,
          });
        }
      }
    } catch (e: any) {
      // G31 FAIL-LOUD: a silently-skipped chuck-jaw centrifugal check is an un-surfaced SAFETY gate
      // (chuck overspeed / part ejection). Surface it so the operator verifies clamp force + RPM.
      warnings.push({
        stage: "safety", severity: "warning",
        message: `Chuck-jaw centrifugal grip-loss check SKIPPED (${e?.message ?? "error"}) -- verify chuck clamp force + max RPM manually before running.`,
      });
      log.debug?.(`ChuckJawForce: grip-loss check skipped -- ${e?.message}`);
    }

    // PIPELINE-VAR U-PV02: Boring bar deflection check for boring operations with L/D > 4
    // Ref: Sandvik Coromant turning guide — boring bar rigidity vs L/D ratio
    const boringBarChecks: NonNullable<TurningProgramResult["boring_bar_checks"]> = [];
    try {
      for (const op of operations) {
        if (op.operation_type !== "id_rough" && op.operation_type !== "id_finish" &&
            op.operation_type !== "bore_rough" && op.operation_type !== "bore_finish") continue;

        // Estimate bar diameter from min bore (bar ~= 70% of min bore) or default 12mm
        const barDia = (op.tool.min_bore_mm ? op.tool.min_bore_mm * 0.7 : 12);
        // Boring-bar overhang is governed by REACH TO THE BORE BOTTOM, not the whole part length
        // (closed-loop finding U-W2J). Pure helper boringBarOverhangMm() -- unit-tested separately.
        const feat = input.features.find((ff) => ff.id === op.feature_id);
        const overhang = boringBarOverhangMm(feat, input.part_length_mm);
        const ldRatio = overhang / barDia;

        if (ldRatio > 4) {
          const bbResult = boringBarDeflectionEngine.calculate({
            bar_diameter_mm: barDia,
            overhang_mm: overhang,
            depth_of_cut_mm: op.cutting_params.depth_of_cut_mm,
            feed_per_rev_mm: op.cutting_params.feed_mm_rev,
            bar_material: "carbide",
          });

          const defl = bbResult?.static_deflection?.value ?? 0;
          const tol = 0.05; // default ±0.05mm for boring
          const withinTol = defl < tol / 2;

          boringBarChecks.push({
            op_number: op.op_number,
            ld_ratio: Math.round(ldRatio * 10) / 10,
            deflection_mm: Math.round(defl * 1000) / 1000,
            within_tolerance: withinTol,
          });

          if (!withinTol) {
            warnings.push({
              stage: "physics", severity: "warning",
              message: `Op ${op.op_number} boring bar L/D=${ldRatio.toFixed(1)}: predicted deflection ${(defl * 1000).toFixed(1)}µm exceeds tolerance budget ${(tol * 500).toFixed(0)}µm — consider carbide bar, dampened bar, or reduced DOC`,
            });
          } else if (ldRatio > 6) {
            op.notes.push(`Boring bar L/D=${ldRatio.toFixed(1)} — high overhang, deflection ${(defl * 1000).toFixed(1)}µm within tolerance`);
          }
        }
      }
    } catch (e: any) {
      // G31 FAIL-LOUD: a silently-skipped boring-bar deflection check leaves bored features unverified.
      warnings.push({
        stage: "physics", severity: "warning",
        message: `Boring-bar deflection check SKIPPED (${e?.message ?? "error"}) -- verify L/D + deflection manually for bored features.`,
      });
      log.debug?.(`BoringBarDeflection: check skipped — ${e?.message}`);
    }

    // PIPELINE-VAR U-PV02 + factor 5/14: Chatter stability check for TURNING operations.
    // FIX (R12): the prior implementation applied chatterStabilityLobeEngine's MILLING stability-lobe
    // model (flute_count / radial_immersion / up_milling) to turning, which false-flagged most turning
    // ops as "unstable". Turning regenerative chatter follows the Tlusty single-DOF orthogonal-cut limit
    // b_lim = 2*zeta*k/Kc -- computed inline (turningChatterLimitMm) from a cantilever tool-point stiffness
    // (cantileverTipStiffnessNm, k = 3EI/L^3) using the tool diameter + overhang + CANONICAL carbide
    // modulus (getToolModulus -- never inlined). NOTE: RegenerativeChatterPredictor was NOT used here --
    // its between-lobe critical_depth is in METRES not mm (missing the m->mm *1000 the lobe-peak path
    // applies), so its is_stable is ~always false; that shared-engine bug is flagged for a separate fix.
    // ADVISORY ONLY (a note on the op + a chatter_checks record) -- never a veto, so an imperfect
    // estimate can only mis-word a note, never gate emission or relax a safety verdict (never-soften).
    const chatterChecksTurning: NonNullable<TurningProgramResult["chatter_checks"]> = [];
    try {
      const E_TOOL_PA = getToolModulus("carbide") * 1e6;          // canonical carbide modulus MPa (N/mm^2) -> Pa
      const ZETA_TOOL = 0.035;                                    // modal damping ratio, carbide tooling (Altintas MMD: 0.01-0.10 typical)
      const kc = getKienzleByISO(input.material.iso_group)?.kc1_1; // canonical kc1.1 (N/mm^2)
      for (const op of operations) {
        if (op.operation_type === "center_drill" || op.operation_type === "part_off") continue;

        // Boring bars (the dominant turning-chatter case) are slender (small dia, long reach -> low k);
        // stout OD/face shanks are stiff (~20mm standard square shank, short overhang). Using a too-small
        // OD diameter is what made the prior milling model false-flag stiff turning ops -- so differentiate.
        const isBoringOp = !!op.tool.min_bore_mm || op.operation_type.includes("bore") || op.operation_type.startsWith("id_");
        const dMm = isBoringOp ? (op.tool.min_bore_mm ? op.tool.min_bore_mm * 0.8 : 12) : 20; // boring bar dia vs standard OD shank
        const lMm = Math.max((op.tool as any).stickout_mm ?? (isBoringOp ? dMm * 4 : 30), 1); // boring bars run ~4x dia overhang

        const ap = op.cutting_params.depth_of_cut_mm;
        const rpm = op.cutting_params.spindle_rpm;
        if (typeof kc !== "number" || !(kc > 0) || !(ap > 0)) continue;       // no data -> skip (honest, no fabricated verdict)

        const kNm = cantileverTipStiffnessNm(dMm, lMm, E_TOOL_PA);
        const bLimMm = turningChatterLimitMm(kNm, ZETA_TOOL, kc);
        if (!Number.isFinite(bLimMm)) continue;                               // degenerate FRF -> no verdict
        const stable = ap <= bLimMm;

        chatterChecksTurning.push({ op_number: op.op_number, stable, rpm, ap_mm: ap });
        if (!stable) {
          op.notes.push(`Chatter risk (turning regenerative): DOC ${ap.toFixed(2)}mm exceeds the stable limit ${bLimMm.toFixed(2)}mm (tool d=${dMm.toFixed(0)}mm, overhang=${lMm.toFixed(0)}mm) -- reduce DOC, shorten overhang, or add damping`);
        }
      }
    } catch (e: any) {
      // G31 FAIL-LOUD: surface a skipped chatter pre-check (a swallowed programming error here would
      // otherwise hide the stability advisory entirely).
      warnings.push({
        stage: "physics", severity: "warning",
        message: `Turning chatter pre-check SKIPPED (${e?.message ?? "error"}) -- verify DOC vs the stability limit manually.`,
      });
      log.debug?.(`TurningChatter: pre-check skipped -- ${e?.message}`);
    }

    // PIPELINE-VAR: Workpiece (part) deflection -- a slender bar held in the chuck deflects under the
    // radial cutting load, pushing the cut OD off-tolerance (a previously-unwired physics factor: only
    // an L/D>4 advisory existed). delta = F*L^3/(k*E*I), I = pi*D^4/64 (round bar); k = 3 cantilever
    // (chuck only) / 48 simply-supported (tailstock). Advisory + ADDITIVE (mirrors the boring-bar
    // check) -- it only ADDS a warning, never relaxes a safety verdict (never-soften).
    try {
      const wpD = input.bar_stock_od_mm;
      const wpL = input.part_length_mm;
      const wpLD = wpD > 0 ? wpL / wpD : 0;
      const maxWpFc = Math.max(...operations.map((o) => o.physics?.cutting_force_N || 0), 0);
      // Only slender parts (L/D > 6) are deflection-prone; the deflection-vs-tolerance test then decides.
      if (wpD > 0 && wpL > 0 && wpLD > 6 && maxWpFc > 0) {
        // Tightest feature tolerance drives the deflection budget (default +/-0.05mm).
        const wpTol = Math.min(
          ...input.features.map((f) => (typeof f.tolerance_mm === "number" && f.tolerance_mm > 0 ? f.tolerance_mm : 0.05)),
          0.05,
        );
        // ISO group -> PartDeflectionEngine material category (its E_VALUES pick the modulus).
        const iso = input.material.iso_group;
        const wpMat: "steel" | "aluminum" | "titanium" = iso === "N" ? "aluminum" : iso === "S" ? "titanium" : "steel";
        const pd = partDeflectionEngine.calculate({
          cross_section: "round",
          diameter_mm: wpD,
          wall_thickness_mm: wpD,     // unused in round mode (I derives from diameter); satisfies the required field
          wall_height_mm: wpL,        // cantilever overhang = unsupported length
          wall_length_mm: wpL,
          support_type: input.tailstock ? "simply_supported" : "cantilever",
          cutting_force_n: maxWpFc,   // full Kienzle Fc as a conservative bending-force bound (over-estimates -> safe direction)
          material: wpMat,
          tolerance_mm: wpTol,
        });
        const wpDefl = pd?.max_deflection?.value ?? 0;
        if (wpDefl > wpTol) {
          warnings.push({
            stage: "physics", severity: "warning",
            message: `Workpiece L/D=${wpLD.toFixed(1)} (${wpD}mm x ${wpL}mm, ${input.tailstock ? "chuck+tailstock" : "chuck only"}) deflects ${(wpDefl * 1000).toFixed(0)}um under ${Math.round(maxWpFc)}N -- exceeds tolerance ${(wpTol * 1000).toFixed(0)}um; add tailstock/steady-rest, reduce DOC, or take spring passes`,
          });
        }
      }
    } catch (e: any) {
      // G31 FAIL-LOUD: surface a skipped workpiece-deflection check (slender parts deflect off-tolerance).
      warnings.push({
        stage: "physics", severity: "warning",
        message: `Workpiece deflection check SKIPPED (${e?.message ?? "error"}) -- verify slender-part (L/D) deflection manually.`,
      });
      log.debug?.(`PartDeflection (workpiece): check skipped -- ${e?.message}`);
    }

    // PIPELINE-VAR: Part-family classification -- wires the built-but-orphaned LathePartClassifierEngine
    // (15-family turned-part taxonomy: shaft/flange/disc/sleeve/bushing/.../tube_hollow) into the Kienzle
    // wizard. It infers the family from the part's geometry + feature signatures and the family-appropriate
    // workholding + roughing cycle (e.g. disc -> G72 facing, forging -> G73 pattern-repeat). ADVISORY +
    // ADDITIVE: it records the family on the result + surfaces a recommendation; it NEVER overrides an
    // explicit chuck choice or relaxes a safety verdict (never-soften).
    let partFamily: TurningProgramResult["part_family"];
    try {
      if (input.bar_stock_od_mm > 0 && input.part_length_mm > 0) {
        const opTypes = operations.map((o) => o.operation_type);
        // Bore/ID ops cover both `bore_*` (OD-side boring) AND `id_*` (id_rough/id_finish/id_bore/...).
        const boringOps = operations.filter((o) => o.operation_type.includes("bore") || o.operation_type.startsWith("id_"));
        // The part's REAL bored ID from the linked feature (the largest bore = the thinnest wall =
        // the controlling thin-wall/sleeve case). If a boring op has no resolvable feature ID, fall
        // back to the boring-tool min-bore capability ONLY so that bore-PRESENCE still registers.
        const featBoreIds = boringOps
          .map((o) => input.features.find((f) => f.id === o.feature_id)?.id_mm)
          .filter((v): v is number => typeof v === "number" && v > 0);
        const boreId = featBoreIds.length > 0
          ? Math.max(...featBoreIds)
          : (boringOps.length > 0
              ? Math.min(...boringOps.map((o) => (typeof o.tool.min_bore_mm === "number" ? o.tool.min_bore_mm : Infinity)))
              : Infinity);
        // Tightest feature tolerance (mm) drives the bushing / precision-bore branch.
        const tightestTol = Math.min(
          ...input.features.map((f) => (typeof f.tolerance_mm === "number" && f.tolerance_mm > 0 ? f.tolerance_mm : Infinity)),
          Infinity,
        );
        const cls = lathePartClassifierEngine.classify({
          length_mm: input.part_length_mm,
          max_od_mm: input.bar_stock_od_mm,
          bore_id_mm: Number.isFinite(boreId) ? boreId : undefined,
          stock_form: "bar", // JM lathe corpus is overwhelmingly bar-fed; forging/casting blanks would come from the print, not today's wizard
          has_threads: opTypes.some((t) => t.includes("thread")),
          has_grooves: opTypes.some((t) => t.includes("groove")),
          has_keyway: opTypes.some((t) => t.includes("keyway")),
          tightest_tolerance_mm: Number.isFinite(tightestTol) ? tightestTol : undefined,
          features: opTypes, // op-type tokens feed the classifier's feature-keyword matcher
        });
        partFamily = {
          family: cls.family,
          confidence: cls.confidence,
          recommended_workholding: cls.workholding_default,
          recommended_roughing_cycle: cls.roughing_cycle,
          recommended_sequence: cls.sequence_template,
          reasoning: cls.workholding_justification,
        };
        warnings.push({
          stage: "intake", severity: "info",
          message: `Part family: ${cls.family} (confidence ${Math.round(cls.confidence * 100)}%) -- family default ${cls.workholding_default} workholding + ${cls.roughing_cycle} roughing. Recommended op sequence: ${cls.sequence_template.join(" -> ")}. ${cls.workholding_justification}`,
        });
        // Actionable mismatch: an explicit chuck choice that conflicts with the family's concentricity need.
        if (input.chuck_type && cls.workholding_default === "collet" && input.chuck_type !== "collet") {
          warnings.push({
            stage: "safety", severity: "warning",
            message: `Part family ${cls.family} recommends a collet (${cls.workholding_justification}) but chuck_type=${input.chuck_type} was specified -- verify concentricity / clamp distortion before run`,
          });
        }
        // Roughing-strategy gap: compare the family's recommended cycle against the cycles the wizard's
        // PLAN actually emits (generateGCode: face_rough -> G72 facing; od/id/bore_rough -> G71 stock
        // removal; the generator emits NO G73). Advisory only -- it never rewrites the emitted G-code,
        // it flags when a face-dominant part is being axially G71-roughed (G72 would cut faster) and
        // honestly surfaces the missing-G73 gap for near-net blanks (R12).
        const emittedRoughCycles = new Set<string>(
          operations
            .filter((o) => o.operation_type.includes("rough"))
            .map((o) => (o.operation_type.includes("face") ? "G72" : "G71")),
        );
        const recommendedCycles = cls.roughing_cycle.split("_"); // "G71_G72" -> ["G71","G72"]
        if (emittedRoughCycles.size > 0 && recommendedCycles.includes("G72") && !emittedRoughCycles.has("G72")) {
          warnings.push({
            stage: "optimization", severity: "warning",
            message: `Roughing strategy: family ${cls.family} roughs most efficiently with the G72 facing cycle, but the planned operations emit only G71 (axial OD roughing). If this part is face-dominant, plan facing ops so the generator emits G72 -- it cuts roughing time on short/flat parts.`,
          });
        }
        if (recommendedCycles.includes("G73") && !emittedRoughCycles.has("G73")) {
          warnings.push({
            stage: "optimization", severity: "warning",
            message: `Roughing strategy: family ${cls.family} (near-net forging/casting blank) roughs most efficiently with the G73 pattern-repeat cycle, which this wizard does not yet emit -- it falls back to G71, which air-cuts the near-net stock. Use G73 for production volume.`,
          });
        }
      }
    } catch (e: any) {
      log.debug?.(`PartFamily classify: skipped -- ${e?.message}`);
    }

    // LATHE-MS0: Collision zone checks
    let collisionChecks: TurningProgramResult["collision_checks"];
    let safeRetractX: number | undefined;
    let safeRetractZ: number | undefined;
    try {
      // Build turret config from planned operations
      const toolProtrusions = operations.map(o => (o.tool as any).stickout_mm ?? 40);
      const collisionResult = latheCollisionZoneEngine.checkAll({
        turret: {
          station_count: Math.max(new Set(operations.map(o => o.tool.tool_number)).size, 8),
          turret_radius_mm: 150, // typical turret radius
          tool_protrusions_mm: toolProtrusions,
        },
        workpiece: {
          part_od_mm: input.bar_stock_od_mm,
          part_length_mm: input.part_length_mm,
          bar_stock_od_mm: input.bar_stock_od_mm,
          chuck_jaw_protrusion_mm: 15,
        },
        machine: {
          max_swing_diameter_mm: (rmach as any)?.max_swing_mm ?? 400,
          tailstock_engaged: input.tailstock ?? false,
          tailstock_z_mm: input.tailstock ? input.part_length_mm + 5 : undefined,
        },
        tools: operations.map((o, i) => ({
          station: o.tool.tool_number,
          tool_type: (o.operation_type.includes("bore") ? "boring" :
            o.operation_type.includes("groove") ? "grooving" :
            o.operation_type === "part_off" ? "parting" :
            o.operation_type.includes("thread") ? "threading" :
            o.operation_type.includes("drill") ? "drill" :
            o.operation_type.startsWith("live_") ? "live_mill" : "turning") as any,
          // Stickout from REAL geometry (parting reaches part center, grooving the groove bottom),
          // capped at the prior 40mm default so the overhang ratio can only drop (U-W2L; never-soften).
          tool_stickout_mm: (o.tool as any).stickout_mm ?? groovePartStickoutMm(
            o.operation_type,
            input.bar_stock_od_mm,
            o.operation_type.includes("groove")
              ? (input.features.find((ff) => ff.id === o.feature_id)?.groove_depth_mm
                 ?? input.features.find((ff) => ff.id === o.feature_id)?.depth_mm)
              : undefined,
            40),
          holder_protrusion_mm: 30,
          diameter_mm: o.tool.min_bore_mm ?? ((o.cutting_params.depth_of_cut_mm * 2) || 20),
          // Parting blade width = the REQUIRED standard blade for this bar (NOT a flat 3mm that a large
          // bar can't use). The program records this requirement in setup_notes (U-W2N); capped at 6mm
          // so a genuinely-oversized bar still flags. Grooving stays 4mm (shallow groove -> low ratio).
          blade_width_mm: o.operation_type === "part_off" ? requiredPartingBladeMm(input.bar_stock_od_mm) : (o.operation_type.includes("groove") ? 4 : undefined),
          edge_radius_mm: o.tool.nose_radius_mm ?? 0.02,
          approach_angle_deg: 95,
          bar_diameter_mm: o.operation_type.includes("bore") ? ((o.tool.min_bore_mm ?? 20) * 0.7) : undefined,
          bar_material: o.operation_type.includes("bore") ? "carbide" as const : undefined,
          bore_depth_mm: o.operation_type.includes("bore") ? (o.cutting_params.depth_of_cut_mm * 3) || 30 : undefined,
        })),
      });

      collisionChecks = collisionResult.checks;
      safeRetractX = collisionResult.safe_retract_x_mm;
      safeRetractZ = collisionResult.safe_retract_z_mm;

      // Add collision warnings to main warnings array
      for (const check of collisionResult.checks) {
        if (!check.passed) {
          warnings.push({ stage: "collision", severity: check.severity, message: check.description });
        }
      }
      if (collisionResult.critical_errors.length > 0) {
        // G18 FAIL-CLOSED: critical_errors is a SEPARATE channel from .checks; a critical_error not
        // also surfaced as a failed check was only logged, never blocking emission (fail-OPEN -- a
        // crash/scrap collision could auto-certify as ready). Push each as a CRITICAL warning so
        // canEmitProgram suppresses the program (mirrors the per-check path above + U-LW-02 fail-closed).
        for (const err of collisionResult.critical_errors) {
          warnings.push({
            stage: "collision", severity: "critical",
            message: `Collision critical: ${typeof err === "string" ? err : JSON.stringify(err)} -- emission blocked; verify the toolpath before running.`,
          });
        }
        log.warn(`[TurningPrintToProgram] ${collisionResult.critical_errors.length} collision issues detected`);
      }

      // Minimum chip thickness check for each operation (U09)
      for (const op of operations) {
        const feed = op.cutting_params.feed_mm_rev;
        const edgeRadius = op.tool.nose_radius_mm ?? 0.02;
        const approachAngle = 95; // standard OD turning
        if (feed > 0) {
          const chipCheck = latheCollisionZoneEngine.checkMinChipThickness(feed, approachAngle, edgeRadius);
          if (!chipCheck.cutting) {
            warnings.push({ stage: "physics", severity: "warning", message: `Op ${op.op_number}: ${chipCheck.recommendation}` });
          }
        }
      }

      cpm.checkpoint("collision_check", 2.5, { checks: collisionResult.checks.length, safe: collisionResult.safe });
    } catch (e: any) {
      // U-LW-02 FAIL-CLOSED: a collision check that CRASHES leaves the program collision-UNVERIFIED.
      // The prior silent log.debug let an unverified program emit (fail-OPEN -- a real-machine hazard:
      // a turret/holder/chuck crash goes un-prevented). Push a CRITICAL warning so canEmitProgram
      // suppresses emission -- a shop-floor program that could NOT be collision-verified must never
      // auto-certify as ready. On valid input checkAll does not throw (proven by the lathe regression
      // suite), so an exception here is genuinely anomalous and blocking is the safe response.
      warnings.push({
        stage: "collision", severity: "critical",
        message: `Collision verification FAILED to run (${e?.message ?? "unknown error"}) -- program is NOT collision-checked; emission blocked. Fix the collision-check input or verify the toolpath manually before running.`,
      });
      log.warn?.(`[TurningPrintToProgram] collision check threw -- failing CLOSED (no emit): ${e?.message}`);
    }

    // LATHE-MS0 U13: G71 Type detection for OD/ID rough profiles
    let g71Type: "I" | "II" | undefined;
    try {
      // Build profile from OD contour features
      const profileFeatures = input.features.filter(f =>
        f.type === "od_contour" || f.type === "od_straight" || f.type === "od_taper" || f.type === "od_shoulder"
      );
      if (profileFeatures.length >= 2) {
        const profilePoints = profileFeatures.map(f => ({
          x: f.od_mm ?? input.bar_stock_od_mm,
          z: f.position_z_mm ?? 0,
        }));
        const g71Result = latheCollisionZoneEngine.detectG71Type(profilePoints);
        g71Type = g71Result.type;
        if (g71Result.type === "II") {
          warnings.push({
            stage: "safety",
            severity: "critical",
            message: `G71 Type II REQUIRED: ${g71Result.recommendation}`,
          });
        }
      }
    } catch (e: any) {
      log.debug?.(`G71 type detection skipped — ${e?.message}`);
    }

    const totalCycleTime = operations.reduce((s, o) => s + o.cycle_time_sec, 0);
    // LATHE-OKUMA-POST: JM Die's lathe fleet is 100% Okuma OSP. The inline generateGCode emits
    // Fanuc-dialect canned cycles (G71/G72/G76) that ALARM/mis-cycle on an OSP control (G71 is
    // THREADING on OSP, not roughing). Route through the VERIFIED OkumaB250 master post when the
    // target controller is Okuma; fall back to the generic emitter only if the mapping cannot run.
    const wantsOkuma = input.controller === "okuma"
      || (!input.controller && (/okuma/i.test(input.machine_brand ?? "")
          || mapOkumaMachineId(input.machine_model) !== undefined));
    let programText: string;
    let okumaPostApplied = false;
    if (wantsOkuma) {
      const okumaEmit = this.emitViaOkumaPost(operations, input, centrifugalSafeRpm);
      if (okumaEmit && okumaEmit.text.trim().length > 0) {
        programText = okumaEmit.text;
        okumaPostApplied = true;
        // U-LW-01: surface when the G50 cap was tightened below the machine max by centrifugal physics.
        if (centrifugalSafeRpm !== undefined && centrifugalSafeRpm < finitePos(input.max_spindle_rpm, 3500)) {
          warnings.push({
            stage: "safety", severity: "info",
            message: `G50 spindle clamp set to centrifugal-safe ${centrifugalSafeRpm} rpm (below machine max ${finitePos(input.max_spindle_rpm, 3500)} rpm) -- prevents grip-loss part ejection; G96 CSS auto-reduces Vc at small diameters`,
          });
        }
        for (const w of okumaEmit.warnings) {
          warnings.push({ stage: "post_processor", severity: "warning", message: `Okuma post: ${w}` });
        }
        if (okumaEmit.skipped > 0) {
          warnings.push({
            stage: "post_processor", severity: "critical",
            message: `Okuma post DROPPED ${okumaEmit.skipped} operation(s) on a non-finite field -- program is DEGRADED, do not run`,
          });
        }
      } else {
        // G02 FAIL-CLOSED: on the 100%-Okuma JM fleet a Fanuc-dialect fallback program ALARMS/mis-cycles
        // on the OSP control (G71 = THREADING on OSP, not roughing; G72/G75/G76 undefined). The prior
        // behaviour shipped that Fanuc program with only a `warning` (fail-OPEN -- a wrong-dialect program
        // could auto-certify as ready). When the VERIFIED Okuma post cannot run for an Okuma-TARGET
        // program, BLOCK emission (critical) -- never auto-ship a Fanuc program to an OSP machine; the
        // operator fixes the operation input or programs manually. (The non-Okuma `else` below still
        // legitimately uses the Fanuc emitter for an actual Fanuc/Haas control.)
        warnings.push({
          stage: "post_processor", severity: "critical",
          message: "Okuma post mapping FAILED for an Okuma-target program -- emission BLOCKED. A Fanuc-dialect fallback would alarm/mis-cycle on the OSP control; fix the operation input or program the part manually.",
        });
        programText = "(ERROR: Okuma post mapping failed -- no OSP program emitted; Fanuc fallback suppressed)";
      }
    } else {
      // Non-Okuma target (actual Fanuc/Haas control): the generic Fanuc-dialect emitter is correct here.
      programText = this.generateGCode(operations, input);
    }
    const toolChanges = new Set(operations.map(o => o.tool.tool_number)).size;
    cpm.checkpoint("generate_program", 3, { line_count: programText.split("\n").length, tool_changes: toolChanges });

    // Confidence
    let confidence = 0.85;
    if (warnings.some(w => w.severity === "critical")) confidence -= 0.2;
    if (operations.length > 10) confidence -= 0.05;
    if (input.tailstock) confidence += 0.05;
    confidence = Math.max(0.3, Math.min(1.0, confidence));
    const hasCriticalWarnings = warnings.some(w => w.severity === "critical");
    const canEmitProgram = !hasCriticalWarnings && operations.length > 0;
    const emittedProgramText = canEmitProgram ? programText : "";
    const emittedProgramLineCount = canEmitProgram ? programText.split("\n").length : 0;

    const setupNotes: string[] = [
      `Chuck: ${input.chuck_type || "3-jaw"} chuck`,
      `Stock: ${input.bar_stock_od_mm}mm OD × ${input.part_length_mm}mm`,
      `${toolChanges} tools required`,
      `Estimated cycle time: ${formatTimeTurning(totalCycleTime)}`,
    ];
    if (input.tailstock) setupNotes.push("Tailstock support required");
    if (input.sub_spindle) setupNotes.push("Sub-spindle transfer configured");
    // U-W2N: the program SPECIFIES the parting blade an operator must fit (so the collision check is not
    // assuming one) -- the smallest standard blade that keeps the overhang within the 6:1 limit.
    if (operations.some((o) => o.operation_type === "part_off")) {
      const w = requiredPartingBladeMm(input.bar_stock_od_mm);
      setupNotes.push(`Parting: fit a >=${w}mm wide blade for bar OD ${input.bar_stock_od_mm.toFixed(1)}mm (overhang ratio limit 6:1)`);
    }

    // Machine envelope guard — validate peak RPM, feed, and power across turning ops
    let peakRpm = 0, peakPower = 0;
    for (const op of operations) {
      peakRpm = Math.max(peakRpm, op.cutting_params?.spindle_rpm ?? 0);
      peakPower = Math.max(peakPower, op.physics?.power_kW ?? 0);
    }
    for (const msg of this._checkEnvelope({
      spindle_rpm: peakRpm || undefined,
      power_kW: peakPower || undefined,
      x_mm: input.bar_stock_od_mm,
      z_mm: input.part_length_mm,
    })) {
      warnings.push({ stage: "envelope_guard", severity: "warning", message: msg });
    }

    // Mill-turn / Swiss secondary-machining capability assessment (U-LW-MT-01). Surfaces required
    // live-tooling / C-axis / sub-spindle / Swiss capability, machine fit, and the live-tool emit
    // fidelity limit as WARNING-severity advisories. Additive: never alters the emitted G-code and
    // never blocks emission (a `critical` warning would suppress the program -- this is advisory).
    const secondaryMachining = detectSecondaryMachiningRequirements(input);
    for (const msg of secondaryMachining.advisories) {
      warnings.push({ stage: "secondary_machining", severity: "warning", message: msg });
    }

    // Internal single-point threading is NOT auto-emitted as a G71 cycle (the OSP cycle is external
    // geometry; an internal thread is re-routed to a finish bore in toOkumaOperations). Surface it so
    // the missing thread is never silent -- the operator taps or single-point programs it manually.
    if (Array.isArray(input.features) && input.features.some((f) => f?.type === "thread_id")) {
      warnings.push({
        stage: "threading",
        severity: "warning",
        message: "Internal single-point threading (thread_id) is not auto-emitted as a G71 cycle (external-only); the bore is finished but the thread must be tapped or single-point programmed manually -- verify.",
      });
    }

    const result: TurningProgramResult = {
      success: canEmitProgram,
      part_number: input.part_number || "TURN-001",
      material: input.material.material_name,
      bar_stock_od_mm: input.bar_stock_od_mm,
      part_length_mm: input.part_length_mm,
      operations,
      total_operations: operations.length,
      total_tool_changes: toolChanges,
      estimated_cycle_time_sec: Math.round(totalCycleTime),
      program_text: emittedProgramText,
      program_line_count: emittedProgramLineCount,
      postprocessor_applied: okumaPostApplied,
      setup_notes: setupNotes,
      confidence_score: Math.round(confidence * 100) / 100,
      warnings,
      boring_bar_checks: boringBarChecks.length > 0 ? boringBarChecks : undefined,
      chatter_checks: chatterChecksTurning.length > 0 ? chatterChecksTurning : undefined,
      collision_checks: collisionChecks,
      safe_retract_x_mm: safeRetractX,
      safe_retract_z_mm: safeRetractZ,
      g71_type: g71Type,
      part_family: partFamily,
      machine_post_profile: okumaPostApplied
        ? getMachinePostCapabilityProfile(mapOkumaMachineId(input.machine_model) ?? input.machine_model ?? input.machine_brand)
        : undefined,
      secondary_machining: secondaryMachining.needs_secondary ? secondaryMachining : undefined,
    };

    // INFRA-NEURAL-LEDGER-MS1/P0-U02 — emit per-pipeline-run outcome event to
    // the neural-feedback ledger. Fire-and-forget; never blocks or throws.
    emitP2POutcome({
      engineName: "TurningPrintToProgramEngine",
      domain: "lathe",
      pipelineStage: P2P_STAGES.PRINT_TO_PROGRAM,
      success: result.success,
      jobId: result.part_number,
      summary: {
        total_operations: result.total_operations,
        total_tool_changes: result.total_tool_changes,
        estimated_cycle_time_sec: result.estimated_cycle_time_sec,
        program_line_count: result.program_line_count,
        confidence_score: result.confidence_score,
        bar_stock_od_mm: result.bar_stock_od_mm,
        part_length_mm: result.part_length_mm,
        material_name: result.material,
        g71_type: result.g71_type ?? "none",
      },
      warnings: result.warnings.map((w) => `[${w.stage}/${w.severity}] ${w.message}`),
    });

    return result;
  }

  private cannedCycleFor(opType: TurningOpType): string | undefined {
    switch (opType) {
      case "od_rough": return "G71";
      case "od_finish": return "G70";
      case "id_rough": return "G71";
      case "id_finish": return "G70";
      case "face_rough": return "G72";
      case "face_finish": return "G70";
      case "groove": return "G75";
      case "thread_single_point": return "G71"; // G40: Okuma OSP threading is G71 (NOT Fanuc G76) -- match the emitted dialect
      case "drill": return "G83";
      default: return undefined;
    }
  }
}

/** Singleton instance. */
export const turningPrintToProgramEngine = new TurningPrintToProgramEngine();
