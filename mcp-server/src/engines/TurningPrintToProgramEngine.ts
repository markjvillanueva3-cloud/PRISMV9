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
  type ISOGroup,
} from "../physics/constants.js";
import { resolveMaterial, resolveMachine, type ResolvedMaterialContext, type ResolvedMachineContext } from "./PipelineRegistryBridge.js";
import { machineEnvelopeGuardEngine } from "./MachineEnvelopeGuardEngine.js";
import { boringBarDeflectionEngine } from "./BoringBarDeflectionEngine.js";
import { chatterStabilityLobeEngine } from "./ChatterStabilityLobeEngine.js";
import { latheCollisionZoneEngine } from "./LatheCollisionZoneEngine.js";
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
  | "keyway" | "flat_mill" | "hex_mill";

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
  controller?: "fanuc" | "haas" | "mazak" | "okuma" | "siemens" | "dmg_mori" | "citizen" | "star";
  dual_spindle_cutoff?: boolean;  // Sub-spindle grips part during cutoff
  dual_spindle_sync_rpm?: number; // If set, both spindles run at this RPM
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
        tool_life_min: Math.round(toolLife),
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
              const nStr = `N${lineNum}`;
              lineNum += 10;

              if (pt.type === "arc_cw") {
                const arcAddr = pt.R !== undefined ? ` R${pt.R.toFixed(3)}` : `${pt.I !== undefined ? ` I${pt.I.toFixed(3)}` : ""}${pt.K !== undefined ? ` K${pt.K.toFixed(3)}` : ""}`;
                lines.push(`${nStr} G02 X${pt.X.toFixed(3)} Z${pt.Z.toFixed(3)}${arcAddr}${feedStr}`);
              } else if (pt.type === "arc_ccw") {
                const arcAddr = pt.R !== undefined ? ` R${pt.R.toFixed(3)}` : `${pt.I !== undefined ? ` I${pt.I.toFixed(3)}` : ""}${pt.K !== undefined ? ` K${pt.K.toFixed(3)}` : ""}`;
                lines.push(`${nStr} G03 X${pt.X.toFixed(3)} Z${pt.Z.toFixed(3)}${arcAddr}${feedStr}`);
              } else if (i === 0) {
                // First linear: Z approach to profile start
                lines.push(`${nStr} G01 Z${pt.Z.toFixed(3)}${feedStr || ` F${f}`}`);
              } else {
                lines.push(`${nStr} G01 X${pt.X.toFixed(3)} Z${pt.Z.toFixed(3)}${feedStr}`);
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
              const nStr = `N${lineNum}`;
              lineNum += 10;

              if (pt.type === "arc_cw") {
                const arcAddr = pt.R !== undefined ? ` R${pt.R.toFixed(3)}` : `${pt.I !== undefined ? ` I${pt.I.toFixed(3)}` : ""}${pt.K !== undefined ? ` K${pt.K.toFixed(3)}` : ""}`;
                lines.push(`${nStr} G02 X${pt.X.toFixed(3)} Z${pt.Z.toFixed(3)}${arcAddr}${feedStr}`);
              } else if (pt.type === "arc_ccw") {
                const arcAddr = pt.R !== undefined ? ` R${pt.R.toFixed(3)}` : `${pt.I !== undefined ? ` I${pt.I.toFixed(3)}` : ""}${pt.K !== undefined ? ` K${pt.K.toFixed(3)}` : ""}`;
                lines.push(`${nStr} G03 X${pt.X.toFixed(3)} Z${pt.Z.toFixed(3)}${arcAddr}${feedStr}`);
              } else if (i === 0) {
                lines.push(`${nStr} G01 Z${pt.Z.toFixed(3)}${feedStr || ` F${f}`}`);
              } else {
                lines.push(`${nStr} G01 X${pt.X.toFixed(3)} Z${pt.Z.toFixed(3)}${feedStr}`);
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
          const grooveZ = -(feat?.position_z_mm || 20);
          const grooveW = feat?.groove_width_mm || feat?.width_mm || 3;
          lines.push(`${ln()} G00 X${((feat?.od_mm || input.bar_stock_od_mm) + 2).toFixed(1)} Z${grooveZ.toFixed(1)}`);
          lines.push(`${ln()} G75 R1.0`);
          // G75 Q = Z-axis peck step (µm on Fanuc). Use groove_width/3 for chip clearing, max 2mm
          const zPeck = Math.min(2, grooveW / 3); // mm — peck step for chip evacuation
          lines.push(`${ln()} G75 X${grooveD.toFixed(1)} Z${(grooveZ - grooveW).toFixed(1)} P${Math.round(ap * 1000)} Q${Math.round(zPeck * 1000)} F${(f * 0.5).toFixed(3)}`);
          lines.push(`${ln()} G00 X${((feat?.od_mm || input.bar_stock_od_mm) + 5).toFixed(1)}`);
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
          const angle = feat?.notch_angle_deg || 10;
          const depth = feat?.notch_depth_mm || 3.175; // 0.125"
          const width = feat?.notch_width_mm || 10;
          const zPos = feat?.position_z_mm || 20;
          const cPos = feat?.c_axis_position_deg || 0;
          const toolD = feat?.live_tool_diameter_mm || 12.7; // 0.5" end mill
          const liveRPM = Math.min(Math.round((1000 * 80) / (Math.PI * toolD)), 6000);
          const liveFeed = Math.round(liveRPM * 0.05 * 3); // fz × flutes × RPM

          lines.push(`(--- LIVE TOOL: Whistle Notch ${angle}° ---)`);
          lines.push(`${ln()} M05 (Stop main spindle)`);
          lines.push(`${ln()} M19 (Orient spindle — C-axis lock)`);
          lines.push(`${ln()} G00 C${cPos.toFixed(1)} (Index C-axis to notch position)`);
          lines.push(`${ln()} G97 S${liveRPM} M133 (Live tool ON, ${liveRPM} RPM)`);
          lines.push(`${ln()} M08`);
          // Position above notch
          lines.push(`${ln()} G00 X${((feat?.od_mm || input.bar_stock_od_mm) + 5).toFixed(1)} Z${(-zPos).toFixed(1)}`);
          // Plunge to depth at angle
          const plungeX = (feat?.od_mm || input.bar_stock_od_mm) - depth * 2;
          lines.push(`${ln()} G01 X${plungeX.toFixed(3)} F${Math.round(liveFeed * 0.3)} (Plunge to notch depth)`);
          // Cut notch at angle
          const dZ = width * Math.tan(angle * Math.PI / 180);
          lines.push(`${ln()} G01 Z${(-zPos - width).toFixed(3)} X${(plungeX + dZ * 2).toFixed(3)} F${liveFeed} (Angled notch ${angle}°)`);
          // Retract
          lines.push(`${ln()} G00 X${((feat?.od_mm || input.bar_stock_od_mm) + 10).toFixed(1)}`);
          lines.push(`${ln()} M135 (Live tool OFF)`);
          lines.push(`${ln()} M03 (Main spindle restart)`);
          break;
        }
        case "live_od_pocket": {
          const feat = input.features.find(ff => ff.id === op.feature_id);
          const pocketW = feat?.pocket_width_mm || 31.75;  // 1.25"
          const pocketD = feat?.pocket_depth_mm || 3.175;  // 0.125"
          const zPos = feat?.position_z_mm || 30;
          const cPos = feat?.c_axis_position_deg || 0;
          const toolD = feat?.live_tool_diameter_mm || 12.7;
          const liveRPM = Math.min(Math.round((1000 * 80) / (Math.PI * toolD)), 6000);
          const liveFeed = Math.round(liveRPM * 0.04 * 3);
          const partOD = feat?.od_mm || input.bar_stock_od_mm;
          const pocketBottom = partOD - pocketD * 2;

          lines.push(`(--- LIVE TOOL: OD Pocket Mill ${pocketW.toFixed(1)}mm × ${pocketD.toFixed(3)}mm deep ---)`);
          lines.push(`${ln()} M05 (Stop main spindle)`);
          lines.push(`${ln()} M19 (Orient spindle)`);
          lines.push(`${ln()} G00 C${cPos.toFixed(1)} (C-axis position)`);
          lines.push(`${ln()} G97 S${liveRPM} M133 (Live tool ON)`);
          lines.push(`${ln()} M08`);
          // Position above pocket start
          lines.push(`${ln()} G00 X${(partOD + 5).toFixed(1)} Z${(-zPos).toFixed(1)}`);
          // Stepdown passes (0.5mm per pass for tool steel)
          const stepDown = 0.5;
          const passes = Math.ceil(pocketD / stepDown);
          for (let p = 1; p <= passes; p++) {
            const currentDepth = Math.min(p * stepDown, pocketD);
            const currentX = partOD - currentDepth * 2;
            lines.push(`${ln()} G01 X${currentX.toFixed(3)} F${Math.round(liveFeed * 0.3)} (Pocket pass ${p}/${passes}, depth=${currentDepth.toFixed(2)}mm)`);
            lines.push(`${ln()} G01 Z${(-zPos - pocketW).toFixed(3)} F${liveFeed} (Cut pocket length)`);
            lines.push(`${ln()} G00 X${(partOD + 2).toFixed(1)} (Retract)`);
            lines.push(`${ln()} G00 Z${(-zPos).toFixed(1)} (Return to start)`);
          }
          lines.push(`${ln()} G00 X${(partOD + 10).toFixed(1)}`);
          lines.push(`${ln()} M135 (Live tool OFF)`);
          lines.push(`${ln()} M03 (Main spindle restart)`);
          break;
        }
        case "live_cross_drill": {
          const feat = input.features.find(ff => ff.id === op.feature_id);
          const holeD = feat?.cross_hole_diameter_mm || feat?.diameter_mm || 6.35;
          const zPos = feat?.position_z_mm || 20;
          const cPos = feat?.c_axis_position_deg || 0;
          const partOD = feat?.od_mm || input.bar_stock_od_mm;
          const liveRPM = Math.min(Math.round((1000 * 60) / (Math.PI * holeD)), 4000);
          const liveFeed = 0.05 * liveRPM; // 0.05 mm/rev

          lines.push(`(--- LIVE TOOL: Cross Drill Ø${holeD.toFixed(1)}mm ---)`);
          lines.push(`${ln()} M05 (Stop main spindle)`);
          lines.push(`${ln()} M19 (Orient spindle)`);
          lines.push(`${ln()} G00 C${cPos.toFixed(1)}`);
          lines.push(`${ln()} G97 S${liveRPM} M133 (Live drill ON)`);
          lines.push(`${ln()} M08`);
          lines.push(`${ln()} G00 X${(partOD + 5).toFixed(1)} Z${(-zPos).toFixed(1)}`);
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
          lines.push(`${ln()} (Feature: ${feat?.type || op.operation_type}, pos Z=${feat?.position_z_mm || 0}mm)`);
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
              max_diameter_mm: feat.live_tool_diameter_mm || 12,
              max_depth_mm: feat.depth_mm || feat.pocket_depth_mm || 10,
              optimization_goal: input.optimization_target || "balanced",
            });
            if (liveResult.best_tool) {
              opNotes.push(`SmartToolSelector: ${liveResult.best_tool.designation} (score=${liveResult.best_tool.score.toFixed(2)})`);
            }
          } catch { /* non-blocking */ }
          try {
            const eese = getEntryExitStrategyEngine();
            const entryResult = eese.selectEntry({
              tool_diameter: feat.live_tool_diameter_mm || 12,
              pocket_depth: feat.pocket_depth_mm || feat.depth_mm || 5,
              pocket_width: feat.pocket_width_mm,
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

    // PIPELINE-VAR U-PV02: Boring bar deflection check for boring operations with L/D > 4
    // Ref: Sandvik Coromant turning guide — boring bar rigidity vs L/D ratio
    const boringBarChecks: NonNullable<TurningProgramResult["boring_bar_checks"]> = [];
    try {
      for (const op of operations) {
        if (op.operation_type !== "id_rough" && op.operation_type !== "id_finish" &&
            op.operation_type !== "bore_rough" && op.operation_type !== "bore_finish") continue;

        // Estimate bar diameter from min bore (bar ≈ 70% of min bore) or default 12mm
        const barDia = (op.tool.min_bore_mm ? op.tool.min_bore_mm * 0.7 : 12);
        const overhang = input.part_length_mm * 1.2; // boring bar extends ~1.2× part length
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
      log.debug?.(`BoringBarDeflection: check skipped — ${e?.message}`);
    }

    // PIPELINE-VAR U-PV02: Chatter stability check for turning operations
    const chatterChecksTurning: NonNullable<TurningProgramResult["chatter_checks"]> = [];
    try {
      for (const op of operations) {
        if (op.operation_type === "center_drill" || op.operation_type === "part_off") continue;

        const toolDia = op.tool.min_bore_mm ? op.tool.min_bore_mm * 0.7 : 10;
        const sldResult = chatterStabilityLobeEngine.compute({
          tool: {
            diameter_mm: toolDia,
            flute_count: 1, // turning: single point
            overhang_mm: 40, // typical tool holder overhang
            material: "carbide",
          },
          workpiece: {
            iso_group: input.material.iso_group as any,
          },
          machine: {
            max_rpm: input.max_spindle_rpm || 4000,
          },
          cutting: {
            radial_immersion_ratio: 1, // turning: full engagement
            up_milling: false,
          },
        });

        if (sldResult?.value?.stable_pockets) {
          const rpm = op.cutting_params.spindle_rpm;
          const ap = op.cutting_params.depth_of_cut_mm;
          let isStable = false;

          for (const pocket of sldResult.value.stable_pockets) {
            if (rpm >= pocket.rpm_range[0] && rpm <= pocket.rpm_range[1] && ap <= pocket.max_ap_mm) {
              isStable = true;
              break;
            }
          }

          chatterChecksTurning.push({ op_number: op.op_number, stable: isStable, rpm, ap_mm: ap });

          if (!isStable) {
            op.notes.push(`Chatter risk: ${rpm} RPM / ${ap.toFixed(2)}mm DOC may be unstable — verify with tap test or reduce DOC`);
          }
        }
      }
    } catch (e: any) {
      log.debug?.(`ChatterStabilityLobe (turning): pre-check skipped — ${e?.message}`);
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
          tool_stickout_mm: (o.tool as any).stickout_mm ?? 40,
          holder_protrusion_mm: 30,
          diameter_mm: o.tool.min_bore_mm ?? ((o.cutting_params.depth_of_cut_mm * 2) || 20),
          blade_width_mm: o.operation_type === "part_off" ? 3 : (o.operation_type.includes("groove") ? 4 : undefined),
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
      log.debug?.(`LatheCollisionZone: check skipped — ${e?.message}`);
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
    const programText = this.generateGCode(operations, input);
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
      setup_notes: setupNotes,
      confidence_score: Math.round(confidence * 100) / 100,
      warnings,
      boring_bar_checks: boringBarChecks.length > 0 ? boringBarChecks : undefined,
      chatter_checks: chatterChecksTurning.length > 0 ? chatterChecksTurning : undefined,
      collision_checks: collisionChecks,
      safe_retract_x_mm: safeRetractX,
      safe_retract_z_mm: safeRetractZ,
      g71_type: g71Type,
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
      case "thread_single_point": return "G76";
      case "drill": return "G83";
      default: return undefined;
    }
  }
}

/** Singleton instance. */
export const turningPrintToProgramEngine = new TurningPrintToProgramEngine();
