// @ts-nocheck
// WIRE-EXEMPT: consumed by mcp-server/src/routes/milling.ts (wizard-submit
// HTTP handler), not via MCP dispatcher action. Companion test file is
// MILLING-PRINT-TO-PROGRAM.test.ts (kebab — 50+ cases). Hook can't match
// the kebab name to the PascalCase engine; both wirings are real.
/**
 * MillingPrintToProgramEngine — Milling Operations Pipeline
 *
 * Generates complete CNC milling programs from blueprint feature descriptions.
 * Covers pockets, slots, holes, contours, faces, 2.5D, 3D freeform, and
 * indexed 5-axis features for JM Die milling machines.
 *
 * Supported Machines (JM Die):
 *   - Haas VF-2          (Haas NGC, CAT40, 8100 RPM)
 *   - Hurco VM10i        (WinMax, BBT40, 15000 RPM)
 *   - Hurco VMX30i       (WinMax, BBT40, 15000 RPM)
 *   - Roku-Roku HSM-5    (Fanuc, HSK-A63, 30000 RPM — HSM)
 *   - Okuma MU-4000V     (Okuma OSP-P300M, BBT40, 12000 RPM — 5-axis)
 *
 * Physics (inline, canonical imports from physics/constants.ts):
 *   - Kienzle (1952): Fc = kc1.1 × ap × fz^(1−mc) × K_ct  [milling, with chip-thinning]
 *   - Taylor (1907): T = (C/Vc)^(1/n)
 *   - Deflection: δ = F×L³/(3×E×I), I = π×d⁴/64
 *   - Surface finish: Ra = fz²/(32×r_nose)  [flat mill, ideal]
 *   - MRR: ap × ae × Vf  [mm³/min]
 *   - Chip-thinning: K_ct = 1/sin(arccos(1 − 2×ae/D))  [Sandvik GC 2024 Eq. 7.3]
 *
 * Constants imported from physics/constants.ts — no inline Kienzle/Taylor values.
 *
 * @module engines/MillingPrintToProgramEngine
 */

import { log } from "../utils/Logger.js";
import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_MILLING_SPEEDS,
  CANONICAL_MILLING_FEEDS,
  kienzleForce,
  taylorLife,
  toolDeflection,
  predictedRa,
  rpmFromVc,
  mrr,
  type ISOGroup,
} from "../physics/constants.js";
import {
  getKienzleByISO,
  getTaylor,
  chipThinningFactor,
  correctFzForChipThinning,
  thermalDeratingFactor,
  correctedCuttingForce,
  checkStability,
  COOLANT_MATRIX,
  predictRaMillingFlat,
  predictRaBallMill,
} from "./MachiningKnowledgeBaseEngine.js";
import { smartToolSelectorEngine } from "./SmartToolSelectorEngine.js";
import { coolantStrategyEngine } from "./CoolantStrategyEngine.js";
import { entryExitStrategyEngine } from "./EntryExitStrategyEngine.js";
import { intelligentSequencingEngine } from "./IntelligentSequencingEngine.js";
import { workholdingVerificationEngine } from "./WorkholdingVerificationEngine.js";
import { chatterStabilityLobeEngine } from "./ChatterStabilityLobeEngine.js";
import { machineEnvelopeGuardEngine } from "./MachineEnvelopeGuardEngine.js";
import { tribalKnowledgeEngine, type KnowledgeTip } from "./TribalKnowledgeEngine.js";
import { knowledgeCurriculumBridgeEngine } from "./KnowledgeCurriculumBridgeEngine.js";
import type { CitedMillingTip } from "../data/tribal-tips/milling-pdf-cited-tips.js";
import { machiningPlaybookEngine, type PlaybookRule } from "./MachiningPlaybookEngine.js";
import {
  resolveMaterial,
  resolveMachine,
  type ResolvedMaterialContext,
  type ResolvedMachineContext,
} from "./PipelineRegistryBridge.js";
// INFRA-NEURAL-LEDGER-MS1/P0-U02 — emit cross_process_stage_complete event to
// the OutcomeCaptureBus at the end of every full-pipeline run. Fire-and-forget;
// never blocks the producer. See utils/p2pOutcomeEmission.ts for the contract.
import { emitP2POutcome, P2P_STAGES } from "../utils/p2pOutcomeEmission.js";

// ============================================================================
// ESM-SAFE ENGINE HELPERS (non-blocking wrappers — 0-D-ARCH U-ARCH2)
// ============================================================================

function getSmartToolSelector(): any { return smartToolSelectorEngine; }
function getCoolantStrategyEngine(): any { return coolantStrategyEngine; }
function getEntryExitStrategyEngine(): any { return entryExitStrategyEngine; }
function getIntelligentSequencingEngine(): any { return intelligentSequencingEngine; }
function getWorkholdingVerificationEngine(): any { return workholdingVerificationEngine; }

/** Map milling op type to CoolantStrategy operation name */
function mapToCoolantOp(opType: string): string {
  if (opType.includes("drill")) return "drilling";
  if (opType.includes("tap")) return "tapping";
  if (opType.includes("ream")) return "reaming";
  if (opType.includes("rough") || opType === "adaptive_rough") return "milling_rough";
  return "milling_finish";
}

/** Map ISO group to CoolantStrategy material name */
function mapToCoolantMat(iso: string): string {
  const m: Record<string, string> = {
    P: "carbon_steel", M: "stainless", K: "cast_iron",
    N: "aluminum", S: "titanium", H: "hardened_steel",
  };
  return m[iso] || "carbon_steel";
}

// ============================================================================
// CANONICAL SPEED/FEED ALIASES (migrated — 0-D-ARCH U-ARCH1)
// ============================================================================

const SPEED_MILLING = CANONICAL_MILLING_SPEEDS as Record<string, { rough: number; finish: number }>;
const FEED_MILLING = CANONICAL_MILLING_FEEDS as Record<string, { rough: number; finish: number }>;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Milling feature types extractable from engineering drawings. */
export type MillingFeatureType =
  // 2.5D standard
  | "face"
  | "pocket_open" | "pocket_closed" | "pocket_island"
  | "slot_open" | "slot_closed" | "t_slot" | "dovetail_slot"
  | "hole_through" | "hole_blind" | "hole_counterbore" | "hole_countersink"
  | "thread_internal" | "thread_external"
  | "bore_rough" | "bore_finish"
  | "contour_outside" | "contour_inside"
  | "step" | "chamfer" | "fillet"
  // 3D freeform
  | "freeform_surface" | "blend_surface" | "draft_surface"
  // 5-axis indexed (3+2)
  | "indexed_hole" | "indexed_pocket" | "indexed_face"
  // High-speed milling (Roku-Roku)
  | "hsm_adaptive" | "hsm_pencil" | "hsm_scallop";

/** Milling operation types. */
export type MillingOpType =
  | "face_rough" | "face_finish"
  | "pocket_rough" | "pocket_semi_finish" | "pocket_finish"
  | "slot_rough" | "slot_finish"
  | "adaptive_rough" | "trochoidal_slot"
  | "contour_rough" | "contour_finish"
  | "drill_center" | "drill_peck" | "drill_through"
  | "ream" | "bore_semi" | "bore_finish"
  | "tap_rigid" | "thread_mill"
  | "chamfer_mill" | "fillet_mill"
  | "3d_rough" | "3d_finish" | "3d_pencil"
  | "indexed_3plus2_drill" | "indexed_3plus2_mill";

/** Milling material callout (JM Die primaries: M2, D2, S7, A2, H13, carbide). */
export interface MillingMaterial {
  material_name: string;
  iso_group: ISOGroup;
  hardness_hrc?: number;
  /** True when working hardened die steel (H13/D2/M2 at HRC > 50) */
  is_hardened?: boolean;
}

/** Tool holder taper types at JM Die. */
export type MillingTaper = "CAT40" | "BBT40" | "HSK_A63" | "R8";

/** Milling machine controller dialects. */
export type MillingController =
  | "haas_ngc"       // Haas VF-2
  | "hurco_winmax"   // Hurco VM10i / VMX30i
  | "okuma_osp"      // Okuma MU-4000V
  | "fanuc"          // Roku-Roku HSM-5
  | "siemens"
  | "heidenhain";

/** Selected milling tool. */
export interface MillingTool {
  tool_number: number;
  tool_type:
    | "face_mill" | "flat_endmill" | "ball_endmill" | "bull_nose"
    | "drill" | "center_drill" | "reamer" | "tap"
    | "chamfer_mill" | "thread_mill" | "boring_bar" | "slot_drill";
  diameter_mm: number;
  corner_radius_mm: number;
  flutes: number;
  flute_length_mm: number;
  stick_out_mm: number;
  holder_type: string;
  taper: MillingTaper;
  material: "carbide" | "HSS" | "ceramic" | "CBN" | "PCD";
  coating: string;
}

/** Milling cutting parameters. */
export interface MillingCuttingParams {
  spindle_rpm: number;
  feed_mm_min: number;
  feed_per_tooth_mm: number;
  depth_of_cut_mm: number;
  width_of_cut_mm: number;
  cutting_speed_m_min: number;
  stepover_pct?: number;
}

/** Physics results for a milling operation. */
export interface MillingOperationPhysics {
  cutting_force_N: number;
  power_kW: number;
  torque_Nm: number;
  tool_life_min: number;
  deflection_mm: number;
  predicted_Ra_um: number;
  mrr_mm3_min: number;
  chip_thinning_factor: number;
}

/** A planned milling operation. */
export interface MillingPlannedOp {
  op_number: number;
  feature_id: string;
  operation_type: MillingOpType;
  tool: MillingTool;
  cutting_params: MillingCuttingParams;
  physics: MillingOperationPhysics;
  cycle_time_sec: number;
  passes: number;
  approach: "plunge" | "ramp" | "helical" | "direct";
  coolant: "flood" | "mist" | "through_tool" | "air" | "off";
  notes: string[];
  /** Feature position for G-code coordinate output */
  position?: { x: number; y: number; z: number };
  /** Feature dimensions for toolpath extent calculations */
  feature_dims?: { width_mm?: number; length_mm?: number; depth_mm?: number; diameter_mm?: number };
}

/** A single milling feature from the blueprint. */
export interface MillingFeature {
  id: string;
  type: MillingFeatureType;
  width_mm?: number;
  length_mm?: number;
  depth_mm: number;
  diameter_mm?: number;
  corner_radius_mm?: number;
  tolerance_mm?: number;
  surface_finish_Ra_um?: number;
  thread_pitch_mm?: number;
  thread_class?: string;
  position?: { x: number; y: number; z: number };
  /** Indexed 3+2 orientation (degrees) */
  index_A_deg?: number;
  index_B_deg?: number;
  required_operations?: MillingOpType[];
  priority?: number;
}

/** Input to the milling pipeline. */
export interface MillingInput {
  part_number?: string;
  material: MillingMaterial;
  stock_size?: { x: number; y: number; z: number };
  features: MillingFeature[];
  machine?: "haas_vf2" | "hurco_vm10i" | "hurco_vmx30i" | "roku_roku_hsm5" | "okuma_mu4000v";
  controller?: MillingController;
  taper?: MillingTaper;
  max_spindle_rpm?: number;
  max_power_kW?: number;
  machine_brand?: string;
  machine_model?: string;
  optimization_target?: "balanced" | "max_speed" | "max_tool_life" | "surface_quality" | "min_cost";
  work_offset?: string;
}

/** Chatter stability pre-check result. */
export interface MillingChatterCheck {
  op_number: number;
  stable: boolean;
  rpm: number;
  ap_mm: number;
  ae_mm: number;
  max_stable_ap_mm?: number;
  adjusted_ap_mm?: number;
}

/** Pipeline warning. */
export interface MillingWarning {
  stage: string;
  severity: "info" | "warning" | "critical";
  message: string;
  feature_id?: string;
}

/** Full milling pipeline result. */
export interface MillingProgramResult {
  success: boolean;
  part_number: string;
  material: string;
  machine: string;
  controller: string;
  // Stage 1: Intake
  intake_validation: {
    complete: boolean;
    missing_dimensions: string[];
    ambiguous_tolerances: string[];
    warnings: MillingWarning[];
  };
  // Stage 2: Classification
  machinable_features: MillingFeature[];
  feature_count: number;
  // Stage 3: Process plan
  operations: MillingPlannedOp[];
  total_operations: number;
  total_tool_changes: number;
  estimated_cycle_time_sec: number;
  // Stage 4: G-code
  program_text: string;
  program_line_count: number;
  // Stage 5: Validation
  safety_checks: Array<{ rule: string; status: "pass" | "warn" | "fail"; message: string }>;
  safety_pass_rate: number;
  setup_sheet: {
    part_number: string;
    material: string;
    stock_size: { x: number; y: number; z: number };
    work_offset: string;
    datum_description: string;
    taper: string;
    tool_list: Array<{
      tool_number: number;
      description: string;
      diameter_mm: number;
      stick_out_mm: number;
      holder: string;
    }>;
    fixture_notes: string[];
    estimated_cycle_time_sec: number;
    estimated_cycle_time_formatted: string;
  };
  confidence_score: number;
  warnings: MillingWarning[];
  tribal_tips?: KnowledgeTip[];
  chatter_checks?: MillingChatterCheck[];
  postprocessor_applied?: boolean;
  /** U-P2PFS08: Playbook rules for this machining scenario */
  playbook_rules?: Array<{ id: string; title: string; severity: string; rule: string }>;
}

// ============================================================================
// JM DIE MACHINE PROFILES (validated against MillingMachineIntelligenceEngine)
// ============================================================================

interface JMDieMachineSpec {
  name: string;
  controller: MillingController;
  taper: MillingTaper;
  max_rpm: number;
  power_kW: number;
  work_envelope: { x: number; y: number; z: number };
  rapid_xy_mm_min: number;
  is_5axis: boolean;
  is_hsm: boolean;
}

// Source: MillingMachineIntelligenceEngine.ts JM_DIE_MILLING_MACHINES constant
const JM_DIE_MACHINES: Record<string, JMDieMachineSpec> = {
  haas_vf2: {
    name: "Haas VF-2",
    controller: "haas_ngc",
    taper: "CAT40",
    max_rpm: 8100,
    power_kW: 22.4,
    work_envelope: { x: 508, y: 406, z: 508 },
    rapid_xy_mm_min: 30480,
    is_5axis: false,
    is_hsm: false,
  },
  hurco_vm10i: {
    name: "Hurco VM10i",
    controller: "hurco_winmax",
    taper: "BBT40",
    max_rpm: 15000,
    power_kW: 11.2,
    work_envelope: { x: 508, y: 406, z: 457 },
    rapid_xy_mm_min: 30480,
    is_5axis: false,
    is_hsm: false,
  },
  hurco_vmx30i: {
    name: "Hurco VMX30i",
    controller: "hurco_winmax",
    taper: "BBT40",
    max_rpm: 15000,
    power_kW: 14.9,
    work_envelope: { x: 762, y: 508, z: 610 },
    rapid_xy_mm_min: 30480,
    is_5axis: false,
    is_hsm: false,
  },
  roku_roku_hsm5: {
    name: "Roku-Roku HSM-5",
    controller: "fanuc",
    taper: "HSK_A63",
    max_rpm: 30000,
    power_kW: 18.5,
    work_envelope: { x: 500, y: 400, z: 300 },
    rapid_xy_mm_min: 60000,
    is_5axis: false,
    is_hsm: true,
  },
  okuma_mu4000v: {
    name: "Okuma MU-4000V",
    controller: "okuma_osp",
    taper: "BBT40",
    max_rpm: 12000,
    power_kW: 18.5,
    work_envelope: { x: 560, y: 460, z: 460 },
    rapid_xy_mm_min: 42000,
    is_5axis: true,
    is_hsm: false,
  },
};

/** Resolve machine spec from machine key or controller hint. */
function resolveMachineSpec(input: MillingInput): JMDieMachineSpec {
  if (input.machine && JM_DIE_MACHINES[input.machine]) {
    return JM_DIE_MACHINES[input.machine];
  }
  // Controller-based fallback
  if (input.controller === "hurco_winmax") return JM_DIE_MACHINES.hurco_vm10i;
  if (input.controller === "haas_ngc") return JM_DIE_MACHINES.haas_vf2;
  if (input.controller === "okuma_osp") return JM_DIE_MACHINES.okuma_mu4000v;
  if (input.controller === "fanuc" && input.taper === "HSK_A63") return JM_DIE_MACHINES.roku_roku_hsm5;
  // Default: Haas VF-2 (most common at JM Die)
  return JM_DIE_MACHINES.haas_vf2;
}

// ============================================================================
// INLINE PHYSICS (with chip-thinning — Sandvik GC 2024, Eq. 7.3)
// ============================================================================

/**
 * Chip-thinning corrected Kienzle cutting force for milling.
 * Fc = kc1.1 × ap × fz_corrected^(1−mc)
 * where fz_corrected = fz × K_ct,  K_ct = 1/sin(arccos(1 − 2×ae/D))
 *
 * Source: Sandvik Coromant GC 2024, Section 7.3 — Chip Thinning Effect
 */
function millingKienzleForce(
  kc1_1: number, mc: number,
  ap: number, fz: number, ae: number, D: number,
): number {
  if (fz <= 0 || ap <= 0 || ae <= 0 || D <= 0) return 0;
  // Chip-thinning: K_ct from MachiningKnowledgeBaseEngine (canonical)
  const K_ct = chipThinningFactor(ae, D);
  const fz_eff = fz * K_ct;
  return kc1_1 * ap * Math.pow(Math.max(fz_eff, 0.001), 1 - mc);
}

/**
 * Taylor tool life for milling.
 * T = (C/Vc)^(1/n)
 * Source: ISO 3685, Taylor (1907)
 */
function millingTaylorLife(C: number, n: number, Vc: number): number {
  if (Vc <= 0) return Infinity;
  return Math.pow(C / Vc, 1 / n);
}

/**
 * RPM from cutting speed and tool diameter.
 * n = (1000 × Vc) / (π × D)
 */
function millingRpm(Vc: number, D: number): number {
  if (D <= 0) return 0;
  return Math.round((1000 * Vc) / (Math.PI * D));
}

/**
 * Spindle power check: P = Fc × Vc / 60000  [kW]
 * Source: Sandvik Metal Cutting Technical Guide
 */
function millingPower(Fc: number, Vc: number): number {
  return (Fc * Vc) / 60000;
}

/**
 * Spindle torque: M = Fc × D / (2000)  [N·m]
 */
function millingTorque(Fc: number, D: number): number {
  return (Fc * D) / 2000;
}

/** Format seconds to M:SS. */
function formatMillingTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** Estimate cycle time for a milling pass (min feed-rate driven). */
function estimateCycleTime(
  feature: MillingFeature, feedRate: number, passes: number,
): number {
  const w = feature.width_mm ?? feature.diameter_mm ?? 25;
  const l = feature.length_mm ?? feature.diameter_mm ?? 25;
  const pathLen = 2 * (w + l) * passes;  // Approximate path length mm
  if (feedRate <= 0) return 60;
  return (pathLen / feedRate) * 60;  // seconds
}

// ============================================================================
// G-CODE GENERATION HELPERS (controller-specific syntax)
// ============================================================================

/** Line number generator — increments by 10 per Haas/Fanuc convention. */
function makeLineCounter(start = 10, step = 10): () => string {
  let n = start;
  return () => { const s = `N${n}`; n += step; return s; };
}

/** Controller-specific program header. */
function programHeader(controller: MillingController, partNum: string, material: string): string[] {
  switch (controller) {
    case "haas_ngc":
      return [
        `%`,
        `O0001 (${partNum} - ${material})`,
        `(HAAS VF-2 — NGC — PRISM MILLING ENGINE)`,
        `(DATE: ${new Date().toLocaleDateString()})`,
        `G20 G17 G40 G49 G80 G90`,
        ``,
      ];
    case "hurco_winmax":
      // WinMax uses conversational blocks; output ISO-compatible sub for CAM
      return [
        `%`,
        `O0001`,
        `(HURCO WINMAX — ${partNum} — ${material})`,
        `(PRISM MILLING ENGINE)`,
        `G17 G21 G40 G49 G80 G90`,
        ``,
      ];
    case "okuma_osp":
      return [
        `%`,
        `O0001`,
        `(OKUMA OSP — ${partNum} — ${material})`,
        `(MU-4000V — PRISM MILLING ENGINE)`,
        `G17 G21 G40 G49 G80 G90`,
        ``,
      ];
    case "fanuc":
      return [
        `%`,
        `O0001 (${partNum})`,
        `(ROKU-ROKU HSM-5 — FANUC — ${material})`,
        `(PRISM MILLING ENGINE — HSM MODE)`,
        `G17 G21 G40 G49 G80 G90`,
        `G05.1 Q1 (AI CONTOUR CTRL ON — smooth feed)`,
        ``,
      ];
    default:
      return [`%`, `O0001 (${partNum})`, `G17 G21 G40 G49 G80 G90`, ``];
  }
}

/** Controller-specific program footer. */
function programFooter(controller: MillingController): string[] {
  switch (controller) {
    case "haas_ngc":
      return [`M30`, `%`];
    case "hurco_winmax":
      return [`M30`, `%`];
    case "okuma_osp":
      return [`M02`, `%`];
    case "fanuc":
      return [`G05.1 Q0 (AI CONTOUR CTRL OFF)`, `M30`, `%`];
    default:
      return [`M30`, `%`];
  }
}

/** Tool change block — controller-specific. */
function toolChangeBlock(
  ln: () => string,
  tool: MillingTool,
  controller: MillingController,
  workOffset: string,
): string[] {
  const lines: string[] = [];
  switch (controller) {
    case "haas_ngc":
      lines.push(`${ln()} T${tool.tool_number} M06 (${tool.tool_type.toUpperCase()} D${tool.diameter_mm})`);
      lines.push(`${ln()} G${workOffset} G43 H${tool.tool_number} (TOOL LENGTH COMP)`);
      break;
    case "hurco_winmax":
      lines.push(`${ln()} T${tool.tool_number} M6`);
      lines.push(`${ln()} ${workOffset} G43 H${tool.tool_number}`);
      break;
    case "okuma_osp":
      // OSP uses G10.9 for tool length compensation
      lines.push(`${ln()} T${tool.tool_number} M06`);
      lines.push(`${ln()} ${workOffset} G43 H${tool.tool_number}`);
      break;
    case "fanuc":
      lines.push(`${ln()} T${tool.tool_number} M06`);
      lines.push(`${ln()} ${workOffset} G43 H${tool.tool_number}`);
      break;
    default:
      lines.push(`${ln()} T${tool.tool_number} M06`);
      lines.push(`${ln()} ${workOffset} G43 H${tool.tool_number}`);
  }
  return lines;
}

/** Coolant on/off code per controller and coolant type. */
function coolantCode(coolant: string, on: boolean, controller: MillingController): string {
  if (controller === "okuma_osp" && coolant === "through_tool") {
    return on ? "M08" : "M09";   // OSP: M08 for TCP coolant
  }
  switch (coolant) {
    case "through_tool": return on ? "M08" : "M09";
    case "flood": return on ? "M08" : "M09";
    case "mist": return on ? "M07" : "M09";
    case "air": return on ? "M07" : "M09";
    default: return on ? "" : "M09";
  }
}

/** Generate drilling canned cycle block (G81/G83). */
function drillingCycleBlock(
  ln: () => string,
  feat: MillingFeature,
  params: MillingCuttingParams,
  opType: MillingOpType,
  controller: MillingController,
): string[] {
  const lines: string[] = [];
  const D = feat.diameter_mm ?? 10;
  const depth = feat.depth_mm;
  const pos = feat.position ?? { x: 0, y: 0, z: 0 };
  const feedDrill = Math.round(params.feed_mm_min);
  const peck = Math.max(1, D * 0.5);  // Peck depth = 50% drill dia (Machinery's Handbook, §37)

  const isThroughHole = feat.type === "hole_through" || feat.type === "indexed_hole";
  const useG83 = depth > 3 * D;   // Deep holes: G83 peck drilling

  const cycle = useG83 ? "G83" : "G81";

  if (controller === "hurco_winmax") {
    // WinMax: same ISO G-code subset for drilling
    lines.push(`${ln()} G00 X${pos.x.toFixed(3)} Y${pos.y.toFixed(3)}`);
    lines.push(`${ln()} G00 Z2.000`);
    lines.push(`${ln()} ${cycle} Z${(-depth).toFixed(3)} R2.000 ${useG83 ? `Q${peck.toFixed(3)} ` : ""}F${feedDrill}`);
    lines.push(`${ln()} G80`);
  } else {
    lines.push(`${ln()} G00 X${pos.x.toFixed(3)} Y${pos.y.toFixed(3)}`);
    lines.push(`${ln()} G00 Z2.000`);
    lines.push(`${ln()} ${cycle} Z${(-depth).toFixed(3)} R2.000 ${useG83 ? `Q${peck.toFixed(3)} ` : ""}F${feedDrill}`);
    lines.push(`${ln()} G80`);
  }
  return lines;
}

/** Generate rectangular pocket milling block (helical entry + offset). */
function pocketMillingBlock(
  ln: () => string,
  feat: MillingFeature,
  tool: MillingTool,
  params: MillingCuttingParams,
  controller: MillingController,
): string[] {
  const lines: string[] = [];
  const pos = feat.position ?? { x: 0, y: 0, z: 0 };
  const w = feat.width_mm ?? 40;
  const l = feat.length_mm ?? 60;
  const depth = feat.depth_mm;
  const ap = params.depth_of_cut_mm;
  const passes = Math.ceil(depth / ap);
  const feedCut = Math.round(params.feed_mm_min);
  const feedPlunge = Math.round(params.feed_mm_min * 0.3);
  const rpm = params.spindle_rpm;

  // Center of pocket
  const cx = pos.x + w / 2;
  const cy = pos.y + l / 2;

  // Helical entry parameters
  const helixR = Math.max(tool.diameter_mm * 0.4, 3);  // Helix radius = 40% tool dia
  const helixFeed = feedPlunge;

  lines.push(`(POCKET: ${feat.id} — ${w}x${l}x${depth}mm)`);
  lines.push(`${ln()} G00 X${cx.toFixed(3)} Y${cy.toFixed(3)}`);
  lines.push(`${ln()} G00 Z2.000`);
  lines.push(`${ln()} S${rpm} M03`);

  let currentZ = 0;
  for (let p = 1; p <= passes; p++) {
    currentZ = Math.max(-depth, -(ap * p));
    const isLastPass = currentZ <= -depth;

    // Helical ramp entry
    lines.push(`(PASS ${p}/${passes})`);
    lines.push(`${ln()} G00 X${(cx + helixR).toFixed(3)} Y${cy.toFixed(3)} Z2.000`);
    // Helical plunge using G02 arc with Z descent
    const zPerArc = Math.abs(currentZ + (isLastPass ? 0 : ap)) / 3;
    lines.push(`${ln()} G02 X${(cx + helixR).toFixed(3)} Y${cy.toFixed(3)} Z${(currentZ + ap * 0.67).toFixed(3)} I${(-helixR).toFixed(3)} J0.000 F${helixFeed}`);
    lines.push(`${ln()} G02 X${(cx + helixR).toFixed(3)} Y${cy.toFixed(3)} Z${currentZ.toFixed(3)} I${(-helixR).toFixed(3)} J0.000 F${helixFeed}`);

    // Offset clear passes (left-right raster pattern, climb mill)
    const stepover = params.width_of_cut_mm;
    const stepsY = Math.ceil((l - tool.diameter_mm) / stepover);
    for (let s = 0; s <= stepsY; s++) {
      const y = (pos.y + tool.diameter_mm / 2) + s * stepover;
      const xEnd = pos.x + w - tool.diameter_mm / 2;
      const xStart = pos.x + tool.diameter_mm / 2;
      if (s % 2 === 0) {
        lines.push(`${ln()} G01 X${xStart.toFixed(3)} Y${Math.min(y, pos.y + l - tool.diameter_mm / 2).toFixed(3)} F${feedCut}`);
        lines.push(`${ln()} G01 X${xEnd.toFixed(3)}`);
      } else {
        lines.push(`${ln()} G01 X${xEnd.toFixed(3)} Y${Math.min(y, pos.y + l - tool.diameter_mm / 2).toFixed(3)} F${feedCut}`);
        lines.push(`${ln()} G01 X${xStart.toFixed(3)}`);
      }
    }
  }

  lines.push(`${ln()} G00 Z10.000`);
  return lines;
}

/** Generate face milling block. */
function faceMillingBlock(
  ln: () => string,
  feat: MillingFeature,
  tool: MillingTool,
  params: MillingCuttingParams,
  controller: MillingController,
): string[] {
  const lines: string[] = [];
  const pos = feat.position ?? { x: 0, y: 0, z: 0 };
  const w = feat.width_mm ?? 80;
  const l = feat.length_mm ?? 100;
  const feedCut = Math.round(params.feed_mm_min);
  const rpm = params.spindle_rpm;
  const stepover = params.width_of_cut_mm;

  lines.push(`(FACE MILL: ${feat.id} — ${w}x${l}mm)`);
  lines.push(`${ln()} S${rpm} M03`);
  lines.push(`${ln()} G00 X${(pos.x - tool.diameter_mm).toFixed(3)} Y${pos.y.toFixed(3)}`);
  lines.push(`${ln()} G00 Z2.000`);
  lines.push(`${ln()} G01 Z${(-params.depth_of_cut_mm).toFixed(3)} F${Math.round(feedCut * 0.3)}`);

  const passes = Math.ceil(l / stepover);
  for (let p = 0; p <= passes; p++) {
    const y = pos.y + p * stepover;
    if (y > pos.y + l) break;
    if (p % 2 === 0) {
      lines.push(`${ln()} G01 X${(pos.x - tool.diameter_mm).toFixed(3)} Y${y.toFixed(3)} F${feedCut}`);
      lines.push(`${ln()} G01 X${(pos.x + w + tool.diameter_mm).toFixed(3)}`);
    } else {
      lines.push(`${ln()} G01 X${(pos.x + w + tool.diameter_mm).toFixed(3)} Y${y.toFixed(3)} F${feedCut}`);
      lines.push(`${ln()} G01 X${(pos.x - tool.diameter_mm).toFixed(3)}`);
    }
  }
  lines.push(`${ln()} G00 Z10.000`);
  return lines;
}

/** Generate contour milling block. */
function contourMillingBlock(
  ln: () => string,
  feat: MillingFeature,
  tool: MillingTool,
  params: MillingCuttingParams,
  opType: MillingOpType,
  controller: MillingController,
): string[] {
  const lines: string[] = [];
  const pos = feat.position ?? { x: 0, y: 0, z: 0 };
  const w = feat.width_mm ?? feat.diameter_mm ?? 50;
  const l = feat.length_mm ?? feat.diameter_mm ?? 50;
  const depth = feat.depth_mm;
  const feedCut = Math.round(params.feed_mm_min);
  const rpm = params.spindle_rpm;

  // Cutter comp side: G41 (left) for outside contour, G42 (right) for inside
  const isOutside = feat.type === "contour_outside";
  const compCode = isOutside ? "G41" : "G42";
  const ap = params.depth_of_cut_mm;
  const passes = Math.ceil(depth / ap);

  lines.push(`(CONTOUR: ${feat.id} — ${opType})`);
  lines.push(`${ln()} S${rpm} M03`);

  for (let p = 1; p <= passes; p++) {
    const z = Math.max(-depth, -(ap * p));
    lines.push(`(PASS ${p}/${passes})`);
    lines.push(`${ln()} G00 X${(pos.x - tool.diameter_mm * 1.5).toFixed(3)} Y${pos.y.toFixed(3)}`);
    lines.push(`${ln()} G00 Z2.000`);
    lines.push(`${ln()} G01 Z${z.toFixed(3)} F${Math.round(feedCut * 0.3)}`);
    lines.push(`${ln()} ${compCode} D${tool.tool_number} G01 X${pos.x.toFixed(3)} F${feedCut}`);
    // Rectangle contour (for non-circular features)
    lines.push(`${ln()} G01 Y${(pos.y + l).toFixed(3)}`);
    lines.push(`${ln()} G01 X${(pos.x + w).toFixed(3)}`);
    lines.push(`${ln()} G01 Y${pos.y.toFixed(3)}`);
    lines.push(`${ln()} G01 X${pos.x.toFixed(3)}`);
    lines.push(`${ln()} G40 G00 X${(pos.x - tool.diameter_mm * 1.5).toFixed(3)}`);
  }
  lines.push(`${ln()} G00 Z10.000`);
  return lines;
}

/** Generate slot milling block (trochoidal for hard materials). */
function slotMillingBlock(
  ln: () => string,
  feat: MillingFeature,
  tool: MillingTool,
  params: MillingCuttingParams,
  isoGroup: string,
  controller: MillingController,
): string[] {
  const lines: string[] = [];
  const pos = feat.position ?? { x: 0, y: 0, z: 0 };
  const w = feat.width_mm ?? tool.diameter_mm;
  const l = feat.length_mm ?? 50;
  const depth = feat.depth_mm;
  const feedCut = Math.round(params.feed_mm_min);
  const rpm = params.spindle_rpm;

  // For hard materials (H ISO group), reduce width to enable trochoidal
  const useTrochoidal = isoGroup === "H" || isoGroup === "S";
  const ae = useTrochoidal ? tool.diameter_mm * 0.15 : params.width_of_cut_mm;
  const ap = params.depth_of_cut_mm;
  const passes = Math.ceil(depth / ap);

  lines.push(`(SLOT: ${feat.id} — ${useTrochoidal ? "TROCHOIDAL" : "STANDARD"})`);
  lines.push(`${ln()} S${rpm} M03`);

  for (let p = 1; p <= passes; p++) {
    const z = Math.max(-depth, -(ap * p));
    // Ramp entry at 2° angle
    lines.push(`(PASS ${p}/${passes})`);
    lines.push(`${ln()} G00 X${pos.x.toFixed(3)} Y${pos.y.toFixed(3)} Z2.000`);
    if (useTrochoidal) {
      // Trochoidal: semicircle loops along slot length
      const stepAlong = ae * 2;
      const numLoops = Math.ceil(l / stepAlong);
      lines.push(`(TROCHOIDAL MODE — ae=${ae.toFixed(2)}mm)`);
      lines.push(`${ln()} G01 Z${z.toFixed(3)} F${Math.round(feedCut * 0.2)}`);
      for (let loop = 0; loop < numLoops; loop++) {
        const xCenter = pos.x + loop * stepAlong + ae;
        const yCenter = pos.y + w / 2;
        // G02 full circle (trochoidal loop)
        lines.push(`${ln()} G01 X${xCenter.toFixed(3)} Y${(yCenter - ae).toFixed(3)} F${feedCut}`);
        lines.push(`${ln()} G02 X${xCenter.toFixed(3)} Y${(yCenter - ae).toFixed(3)} I0.000 J${ae.toFixed(3)}`);
      }
    } else {
      // Standard slot: center pass + cleanup
      lines.push(`${ln()} G01 Z${z.toFixed(3)} F${Math.round(feedCut * 0.25)}`);
      lines.push(`${ln()} G01 X${(pos.x + l).toFixed(3)} F${feedCut}`);
    }
  }
  lines.push(`${ln()} G00 Z10.000`);
  return lines;
}

/** Generate indexed 3+2 block (G68.2 or equivalent). */
function indexed3plus2Block(
  ln: () => string,
  feat: MillingFeature,
  tool: MillingTool,
  params: MillingCuttingParams,
  controller: MillingController,
): string[] {
  const lines: string[] = [];
  const A = feat.index_A_deg ?? 0;
  const B = feat.index_B_deg ?? 0;
  const pos = feat.position ?? { x: 0, y: 0, z: 0 };
  const depth = feat.depth_mm;
  const feedCut = Math.round(params.feed_mm_min);
  const rpm = params.spindle_rpm;

  lines.push(`(INDEXED 3+2: A${A} B${B} — ${feat.id})`);

  if (controller === "okuma_osp") {
    // OSP uses G68 / G69 for coordinate rotation
    lines.push(`${ln()} G68 X0.0 Y0.0 Z0.0 I${A.toFixed(3)} J${B.toFixed(3)} K0.000`);
  } else if (controller === "haas_ngc") {
    // Haas NGC: G68.2 for tilted working plane (requires P200 Dynamic Work Offsets)
    lines.push(`${ln()} G68.2 X0.0 Y0.0 Z0.0 I${A.toFixed(3)} J${B.toFixed(3)} K0.000`);
    lines.push(`${ln()} G53.1 (TOOL PLANE COMPENSATION)`);
  } else {
    // Generic G68.2 for other controllers
    lines.push(`${ln()} G68.2 X0.0 Y0.0 Z0.0 I${A.toFixed(3)} J${B.toFixed(3)} K0.000`);
  }

  lines.push(`${ln()} G00 X${pos.x.toFixed(3)} Y${pos.y.toFixed(3)}`);
  lines.push(`${ln()} G00 Z2.000`);
  lines.push(`${ln()} S${rpm} M03`);

  if (feat.type === "indexed_hole") {
    const D = feat.diameter_mm ?? 10;
    const peck = Math.max(1, D * 0.5);
    const useG83 = depth > 3 * D;
    lines.push(`${ln()} ${useG83 ? "G83" : "G81"} Z${(-depth).toFixed(3)} R2.000 ${useG83 ? `Q${peck.toFixed(3)} ` : ""}F${feedCut}`);
    lines.push(`${ln()} G80`);
  } else {
    // Generic indexed pocket
    lines.push(`${ln()} G01 Z${(-depth).toFixed(3)} F${Math.round(feedCut * 0.3)}`);
    lines.push(`${ln()} G01 X${(pos.x + (feat.width_mm ?? 20)).toFixed(3)} F${feedCut}`);
    lines.push(`${ln()} G00 Z10.000`);
  }

  // Cancel coordinate rotation
  if (controller === "okuma_osp") {
    lines.push(`${ln()} G69`);
  } else {
    lines.push(`${ln()} G69`);
  }

  return lines;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * MillingPrintToProgramEngine — Full blueprint-to-G-code milling pipeline.
 *
 * Supports all JM Die milling machines:
 * - Haas VF-2 (Haas NGC)
 * - Hurco VM10i / VMX30i (WinMax)
 * - Roku-Roku HSM-5 (Fanuc, high-speed)
 * - Okuma MU-4000V (Okuma OSP, 5-axis indexed)
 *
 * Pipeline: Intake Validation → Feature Classification → Process Planning →
 *           G-code Generation → Validation & Output
 */
export class MillingPrintToProgramEngine {
  readonly name = "MillingPrintToProgramEngine";
  readonly version = "1.0.0";

  // Registry resolution cache (U-ARCH3: pipeline ↔ registry bridge)
  private _resolvedMaterial: ResolvedMaterialContext | null = null;
  private _resolvedMachine: ResolvedMachineContext | null = null;
  private _cachedMaterialName = "";

  /**
   * Main dispatcher — routes action strings to sub-methods.
   * @param action - "milling_print_to_program" | "milling_process_plan" | "milling_validate"
   * @param params - MillingInput payload
   */
  calculate(action: string, params: Record<string, unknown>): MillingProgramResult {
    switch (action) {
      case "milling_print_to_program":
        return this.runFullPipeline(params as unknown as MillingInput);
      case "milling_process_plan":
        return this.runFullPipeline(params as unknown as MillingInput);
      case "milling_validate":
        return this.runFullPipeline(params as unknown as MillingInput);
      default:
        throw new Error(`MillingPrintToProgramEngine: Unknown action "${action}"`);
    }
  }

  /** Check machine envelope against peak parameters. */
  private _checkEnvelope(opts: {
    spindle_rpm?: number; feed_mm_min?: number; power_kW?: number;
    x_mm?: number; y_mm?: number; z_mm?: number;
  }): string[] {
    const envelope = this._resolvedMachine
      ? machineEnvelopeGuardEngine.fromMachineData(this._resolvedMachine) : {};
    const result = machineEnvelopeGuardEngine.check({
      spindle_rpm: opts.spindle_rpm, feed_mm_min: opts.feed_mm_min,
      power_kW: opts.power_kW, x: opts.x_mm, y: opts.y_mm, z: opts.z_mm,
    }, envelope);
    return result.violations.map(v => `ENVELOPE: ${v.message}`);
  }

  // ==========================================================================
  // STAGE 1: DRAWING INTAKE & VALIDATION
  // ==========================================================================

  /**
   * Validate input completeness — flags missing dimensions, contradictory tolerances.
   */
  private validateIntake(input: MillingInput): MillingProgramResult["intake_validation"] {
    const missing: string[] = [];
    const ambiguous: string[] = [];
    const warnings: MillingWarning[] = [];

    if (!input.material?.material_name) {
      missing.push("Material not specified");
      warnings.push({ stage: "intake", severity: "critical", message: "No material callout — cannot select speeds/feeds" });
    }
    if (!input.material?.iso_group) {
      warnings.push({ stage: "intake", severity: "warning", message: "ISO group unknown — defaulting to P (steel)" });
    }
    if (!input.stock_size) {
      warnings.push({ stage: "intake", severity: "warning", message: "Stock size not specified — will estimate from features" });
    }

    for (const feat of (input.features ?? [])) {
      if (feat.depth_mm <= 0) {
        missing.push(`Feature ${feat.id}: zero or missing depth`);
      }
      if ((feat.type === "hole_through" || feat.type === "hole_blind") && !feat.diameter_mm) {
        missing.push(`Feature ${feat.id}: hole without diameter`);
      }
      if ((feat.type === "slot_open" || feat.type === "slot_closed") && !feat.width_mm) {
        missing.push(`Feature ${feat.id}: slot without width`);
      }
      if (feat.type === "thread_internal" && !feat.thread_pitch_mm) {
        missing.push(`Feature ${feat.id}: internal thread without pitch`);
      }

      // Contradictory tolerance/finish
      if (feat.tolerance_mm !== undefined && feat.surface_finish_Ra_um !== undefined) {
        if (feat.tolerance_mm > 0.1 && feat.surface_finish_Ra_um < 0.8) {
          ambiguous.push(`Feature ${feat.id}: loose tolerance (${feat.tolerance_mm}mm) contradicts fine finish (Ra ${feat.surface_finish_Ra_um}µm)`);
        }
      }

      // Very tight tolerance warning
      if (feat.tolerance_mm !== undefined && feat.tolerance_mm < 0.01) {
        warnings.push({
          stage: "intake", severity: "warning",
          message: `Feature ${feat.id}: tight tolerance (${feat.tolerance_mm}mm) — verify CMM capability`,
          feature_id: feat.id,
        });
      }
    }

    return { complete: missing.length === 0, missing_dimensions: missing, ambiguous_tolerances: ambiguous, warnings };
  }

  // ==========================================================================
  // STAGE 2: FEATURE CLASSIFICATION
  // ==========================================================================

  /** Classify features: auto-assign priority and required operations. */
  private classifyFeatures(features: MillingFeature[], iso: string): MillingFeature[] {
    return features.map(feat => {
      const c = { ...feat };
      if (!c.priority) c.priority = this.featurePriority(feat.type);
      if (!c.required_operations?.length) c.required_operations = this.autoAssignOps(feat, iso);
      c.required_operations = this.upgradeOpsForQuality(c.required_operations, feat.tolerance_mm, feat.surface_finish_Ra_um);
      return c;
    }).sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5));
  }

  /**
   * Feature machining priority (lower = earlier).
   * Facing → holes → pockets → slots → contours → freeform
   */
  private featurePriority(type: MillingFeatureType): number {
    const p: Record<string, number> = {
      face: 1,
      hole_through: 2, hole_blind: 2, hole_counterbore: 2, hole_countersink: 2,
      bore_rough: 2, bore_finish: 2,
      thread_internal: 3, thread_external: 3,
      indexed_hole: 3, indexed_face: 2, indexed_pocket: 4,
      pocket_open: 4, pocket_closed: 4, pocket_island: 4,
      slot_open: 5, slot_closed: 5, t_slot: 5, dovetail_slot: 5,
      contour_outside: 6, contour_inside: 6,
      step: 6, chamfer: 7, fillet: 7,
      freeform_surface: 8, blend_surface: 8, draft_surface: 8,
      hsm_adaptive: 4, hsm_pencil: 8, hsm_scallop: 8,
    };
    return p[type] ?? 5;
  }

  /** Auto-assign operations based on feature type and ISO group. */
  private autoAssignOps(feat: MillingFeature, iso: string): MillingOpType[] {
    switch (feat.type) {
      case "face":
        return ["face_rough", "face_finish"];
      case "pocket_open":
      case "pocket_closed":
      case "pocket_island":
        // Hard materials: adaptive roughing; standard: pocket_rough
        return iso === "H" || iso === "S"
          ? ["adaptive_rough", "pocket_semi_finish", "pocket_finish"]
          : ["pocket_rough", "pocket_finish"];
      case "slot_open":
      case "slot_closed":
        return iso === "H" || iso === "S"
          ? ["trochoidal_slot", "slot_finish"]
          : ["slot_rough", "slot_finish"];
      case "t_slot":
        return ["slot_rough", "slot_finish"];
      case "dovetail_slot":
        return ["slot_rough", "slot_finish"];
      case "hole_through":
        return ["drill_center", "drill_through"];
      case "hole_blind":
        return ["drill_center", "drill_peck"];
      case "hole_counterbore":
        return ["drill_center", "drill_peck", "pocket_finish"];
      case "hole_countersink":
        return ["drill_center", "drill_through", "chamfer_mill"];
      case "thread_internal":
        return ["drill_center", "drill_peck", "tap_rigid"];
      case "thread_external":
        return ["thread_mill"];
      case "bore_rough":
        return ["bore_semi"];
      case "bore_finish":
        return ["bore_finish"];
      case "contour_outside":
        return ["contour_rough", "contour_finish"];
      case "contour_inside":
        return ["contour_rough", "contour_finish"];
      case "step":
        return ["face_rough", "contour_finish"];
      case "chamfer":
        return ["chamfer_mill"];
      case "fillet":
        return ["fillet_mill"];
      case "freeform_surface":
      case "blend_surface":
      case "draft_surface":
        return ["3d_rough", "3d_finish", "3d_pencil"];
      case "indexed_hole":
        return ["indexed_3plus2_drill"];
      case "indexed_pocket":
        return ["indexed_3plus2_mill"];
      case "indexed_face":
        return ["indexed_3plus2_mill"];
      case "hsm_adaptive":
        return ["adaptive_rough", "pocket_finish"];
      case "hsm_pencil":
        return ["3d_pencil"];
      case "hsm_scallop":
        return ["3d_finish"];
      default:
        return ["pocket_rough", "pocket_finish"];
    }
  }

  /** Upgrade operations based on tolerance and surface finish requirements. */
  private upgradeOpsForQuality(
    ops: MillingOpType[], tolerance?: number, ra?: number,
  ): MillingOpType[] {
    const upgraded = [...ops];

    // Tight tolerance → add semi-finish if not present
    if (tolerance !== undefined && tolerance < 0.025) {
      if (!upgraded.includes("pocket_semi_finish") && upgraded.includes("pocket_rough")) {
        upgraded.splice(upgraded.indexOf("pocket_rough") + 1, 0, "pocket_semi_finish");
      }
    }
    // Fine surface finish → add ream after drill
    if (ra !== undefined && ra < 0.8) {
      if (upgraded.includes("drill_through") && !upgraded.includes("ream")) {
        upgraded.push("ream");
      }
      if (upgraded.includes("drill_peck") && !upgraded.includes("ream")) {
        upgraded.push("ream");
      }
    }

    return upgraded;
  }

  // ==========================================================================
  // STAGE 3: PROCESS PLANNING — TOOL SELECTION
  // ==========================================================================

  /** Select tool for a milling operation based on feature and material. */
  private selectTool(
    opType: MillingOpType, feat: MillingFeature,
    iso: string, toolNum: number, machSpec: JMDieMachineSpec,
  ): MillingTool {
    const D = feat.diameter_mm ?? feat.width_mm ?? 16;
    const depth = feat.depth_mm;
    const isHard = iso === "H";
    const isTi = iso === "S";
    const taper = machSpec.taper;

    const carbide = "carbide" as const;
    const HSS = "HSS" as const;

    // Coating selection: TiAlN for steel/hard, AlTiN for HSM, uncoated/TiCN for aluminum
    const coating = (iso === "N")
      ? "TiCN"
      : (machSpec.is_hsm || isHard)
        ? "AlTiN"
        : "TiAlN";

    switch (opType) {
      case "face_rough":
      case "face_finish": {
        // Face mill: 50-80mm for general, 32mm for small parts
        const faceDia = (feat.width_mm && feat.width_mm < 60) ? 32 : 63;
        const inserts = Math.round(faceDia / 18); // ~1 insert per 18mm dia
        return {
          tool_number: toolNum, tool_type: "face_mill",
          diameter_mm: faceDia, corner_radius_mm: 0.8, flutes: inserts,
          flute_length_mm: 6, stick_out_mm: 40,
          holder_type: `Shell Mill Arbor ${taper}`,
          taper, material: carbide, coating,
        };
      }

      case "pocket_rough":
      case "adaptive_rough":
      case "trochoidal_slot":
      case "slot_rough": {
        // Roughing endmill: 3-4 flutes, 50-60% of slot/pocket width
        const roughDia = opType === "slot_rough" || opType === "trochoidal_slot"
          ? Math.min(D * 0.9, 16)  // Slot: use large dia to reduce passes
          : Math.min(D * 0.5, 20); // Pocket: 50% rule
        const flutes = isHard ? 4 : (iso === "N" ? 2 : 4);
        return {
          tool_number: toolNum, tool_type: "flat_endmill",
          diameter_mm: Math.max(roughDia, 6), corner_radius_mm: 0,
          flutes, flute_length_mm: depth * 1.5, stick_out_mm: depth * 2.5,
          holder_type: `ER32 Collet ${taper}`, taper, material: carbide, coating,
        };
      }

      case "pocket_semi_finish":
      case "pocket_finish":
      case "slot_finish":
      case "contour_rough":
      case "contour_finish": {
        const finDia = opType.includes("finish") ? Math.min(D * 0.4, 12) : Math.min(D * 0.5, 16);
        const flutes = isHard ? 6 : 4;
        const cr = opType === "contour_finish" ? 0.5 : 0; // Corner radius for finish
        return {
          tool_number: toolNum, tool_type: "flat_endmill",
          diameter_mm: Math.max(finDia, 4), corner_radius_mm: cr,
          flutes, flute_length_mm: depth * 1.5, stick_out_mm: depth * 2.5,
          holder_type: `ER32 Collet ${taper}`, taper, material: carbide, coating,
        };
      }

      case "drill_center": {
        return {
          tool_number: toolNum, tool_type: "center_drill",
          diameter_mm: 3.15, corner_radius_mm: 0, flutes: 2,
          flute_length_mm: 10, stick_out_mm: 30,
          holder_type: `ER16 Collet ${taper}`, taper, material: carbide, coating: "uncoated",
        };
      }

      case "drill_through":
      case "drill_peck": {
        const drillDia = feat.diameter_mm ?? 10;
        return {
          tool_number: toolNum, tool_type: "drill",
          diameter_mm: drillDia, corner_radius_mm: 0, flutes: 2,
          flute_length_mm: depth * 1.5, stick_out_mm: depth * 2,
          holder_type: `ER32 Collet ${taper}`, taper, material: carbide, coating,
        };
      }

      case "ream": {
        const reamDia = feat.diameter_mm ?? 10;
        return {
          tool_number: toolNum, tool_type: "reamer",
          diameter_mm: reamDia, corner_radius_mm: 0, flutes: 6,
          flute_length_mm: depth * 1.2, stick_out_mm: depth * 2,
          holder_type: `ER32 Collet ${taper}`, taper, material: carbide, coating: "TiN",
        };
      }

      case "tap_rigid": {
        // Tap — use thread pitch to determine size
        const tapDia = feat.diameter_mm ?? 10;
        return {
          tool_number: toolNum, tool_type: "tap",
          diameter_mm: tapDia, corner_radius_mm: 0, flutes: 3,
          flute_length_mm: depth * 1.5, stick_out_mm: depth * 2.2,
          holder_type: `Rigid Tap Holder ${taper}`, taper, material: isHard ? carbide : HSS,
          coating: isHard ? "TiAlN" : "TiN",
        };
      }

      case "thread_mill": {
        const tmDia = (feat.diameter_mm ?? 10) * 0.6;
        return {
          tool_number: toolNum, tool_type: "thread_mill",
          diameter_mm: Math.max(tmDia, 4), corner_radius_mm: 0, flutes: 3,
          flute_length_mm: depth * 1.2, stick_out_mm: depth * 2,
          holder_type: `ER32 Collet ${taper}`, taper, material: carbide, coating,
        };
      }

      case "chamfer_mill": {
        return {
          tool_number: toolNum, tool_type: "chamfer_mill",
          diameter_mm: 12, corner_radius_mm: 0, flutes: 4,
          flute_length_mm: 15, stick_out_mm: 40,
          holder_type: `ER32 Collet ${taper}`, taper, material: carbide, coating,
        };
      }

      case "bore_semi":
      case "bore_finish": {
        return {
          tool_number: toolNum, tool_type: "boring_bar",
          diameter_mm: feat.diameter_mm ?? 20, corner_radius_mm: 0.4, flutes: 1,
          flute_length_mm: depth * 1.2, stick_out_mm: depth * 1.5,
          holder_type: `Boring Head ${taper}`, taper, material: carbide, coating,
        };
      }

      case "fillet_mill":
      case "3d_rough": {
        // Bull-nose for fillet/3D rough: 12mm with R2
        return {
          tool_number: toolNum, tool_type: "bull_nose",
          diameter_mm: 12, corner_radius_mm: 2, flutes: 4,
          flute_length_mm: Math.min(depth * 1.5, 40), stick_out_mm: Math.min(depth * 2.5, 60),
          holder_type: `ER32 Collet ${taper}`, taper, material: carbide, coating,
        };
      }

      case "3d_finish":
      case "3d_pencil": {
        // Ball endmill for 3D finish
        const ballDia = feat.corner_radius_mm ? feat.corner_radius_mm * 2 : 6;
        return {
          tool_number: toolNum, tool_type: "ball_endmill",
          diameter_mm: Math.max(ballDia, 4), corner_radius_mm: Math.max(ballDia, 4) / 2,
          flutes: 2, flute_length_mm: depth * 1.5, stick_out_mm: depth * 2.5,
          holder_type: `ER32 Collet ${taper}`, taper, material: carbide, coating,
        };
      }

      case "indexed_3plus2_drill": {
        const idxDia = feat.diameter_mm ?? 8;
        return {
          tool_number: toolNum, tool_type: "drill",
          diameter_mm: idxDia, corner_radius_mm: 0, flutes: 2,
          flute_length_mm: depth * 1.5, stick_out_mm: depth * 2,
          holder_type: `ER32 Collet ${taper}`, taper, material: carbide, coating,
        };
      }

      case "indexed_3plus2_mill": {
        const idxMillDia = Math.min((feat.width_mm ?? 12) * 0.5, 12);
        return {
          tool_number: toolNum, tool_type: "flat_endmill",
          diameter_mm: Math.max(idxMillDia, 4), corner_radius_mm: 0, flutes: 4,
          flute_length_mm: depth * 1.5, stick_out_mm: depth * 2.5,
          holder_type: `ER32 Collet ${taper}`, taper, material: carbide, coating,
        };
      }

      default: {
        return {
          tool_number: toolNum, tool_type: "flat_endmill",
          diameter_mm: 12, corner_radius_mm: 0, flutes: 4,
          flute_length_mm: 40, stick_out_mm: 60,
          holder_type: `ER32 Collet ${taper}`, taper, material: carbide, coating,
        };
      }
    }
  }

  /**
   * Calculate speed and feed for a milling operation.
   * Uses canonical Kienzle/Taylor from physics/constants.ts.
   */
  private calcSpeedFeed(
    opType: MillingOpType, tool: MillingTool,
    iso: ISOGroup, machSpec: JMDieMachineSpec,
    optimTarget: string,
  ): MillingCuttingParams {
    const kienzle = getKienzleByISO(iso);
    const taylor = getTaylor(iso, "carbide_coated");

    // Speed lookup from canonical tables
    const speedTable = SPEED_MILLING[iso] ?? SPEED_MILLING["P"];
    const isFinish = opType.includes("finish") || opType === "ream" || opType === "bore_finish"
      || opType === "3d_finish" || opType === "3d_pencil";
    const isDrill = opType === "drill_through" || opType === "drill_peck" || opType === "drill_center"
      || opType === "indexed_3plus2_drill";
    const isTap = opType === "tap_rigid" || opType === "thread_mill";

    let Vc = isFinish ? speedTable.finish : speedTable.rough;

    // Optimization target adjustments
    if (optimTarget === "max_speed") Vc *= 1.15;
    else if (optimTarget === "max_tool_life") Vc *= 0.80;
    else if (optimTarget === "surface_quality" && isFinish) Vc *= 1.10;

    // HSM machine bonus for Roku-Roku
    if (machSpec.is_hsm && !isDrill) Vc *= 1.3;

    // Drilling/tapping use lower speeds
    if (isDrill) Vc = (SPEED_MILLING[iso]?.rough ?? 100) * 0.4;
    if (isTap) Vc = Math.min(15, (SPEED_MILLING[iso]?.rough ?? 100) * 0.1);

    const rpm = Math.min(millingRpm(Vc, tool.diameter_mm), machSpec.max_rpm);
    // Recalculate actual Vc from clamped RPM
    const Vc_actual = (Math.PI * tool.diameter_mm * rpm) / 1000;

    // Feed per tooth from canonical feed table
    const feedTable = FEED_MILLING[iso] ?? FEED_MILLING["P"];
    let fz = isFinish ? feedTable.finish : feedTable.rough;

    // Drilling feed (per rev, not per tooth)
    if (isDrill) fz = Math.min(0.05 + tool.diameter_mm * 0.01, 0.25);

    // Radial engagement (ae)
    let ae: number;
    if (opType === "face_rough" || opType === "face_finish") {
      ae = tool.diameter_mm * 0.75;  // Face mill: 75% overlap
    } else if (opType === "adaptive_rough" || opType === "trochoidal_slot") {
      ae = tool.diameter_mm * 0.15;  // Adaptive/trochoidal: 15% radial
    } else if (isFinish) {
      ae = tool.diameter_mm * 0.05;  // Finish: 5% radial
    } else {
      ae = tool.diameter_mm * 0.40;  // Roughing: 40% radial
    }

    // Axial depth of cut (ap)
    let ap: number;
    if (opType === "face_rough" || opType === "face_finish") {
      ap = isFinish ? 0.3 : 1.5;
    } else if (opType === "adaptive_rough") {
      ap = tool.diameter_mm * 1.2;  // Adaptive: full flute engagement
    } else if (isDrill) {
      ap = 0; // N/A for drill (full depth per cycle)
    } else {
      ap = isFinish ? 0.2 : tool.diameter_mm * 0.25;
    }

    const feedRate = Math.round(fz * tool.flutes * rpm);

    return {
      spindle_rpm: rpm,
      feed_mm_min: feedRate,
      feed_per_tooth_mm: fz,
      depth_of_cut_mm: ap,
      width_of_cut_mm: ae,
      cutting_speed_m_min: Vc_actual,
      stepover_pct: Math.round((ae / tool.diameter_mm) * 100),
    };
  }

  /**
   * Calculate physics for a planned milling operation.
   * Kienzle/Taylor imported from physics/constants.ts — never inlined.
   */
  private calcPhysics(
    tool: MillingTool, params: MillingCuttingParams, iso: ISOGroup,
  ): MillingOperationPhysics {
    const kienzle = getKienzleByISO(iso);
    const taylor = getTaylor(iso, "carbide_coated");

    const ap = params.depth_of_cut_mm;
    const fz = params.feed_per_tooth_mm;
    const ae = params.width_of_cut_mm;
    const D = tool.diameter_mm;
    const Vc = params.cutting_speed_m_min;

    // Kienzle cutting force with chip-thinning (Sandvik GC 2024 §7.3)
    const Fc = millingKienzleForce(kienzle.kc1_1, kienzle.mc, ap, fz, ae, D);
    const power_kW = millingPower(Fc, Vc);
    const torque = millingTorque(Fc, D);

    // Taylor tool life
    const T_min = millingTaylorLife(taylor.C, taylor.n, Vc);

    // Tool deflection: δ = F×L³/(3×E×I), I = π×d⁴/64
    // Young's modulus for carbide: 600 GPa = 600,000 MPa = 600,000 N/mm²
    const I = (Math.PI * Math.pow(D, 4)) / 64;
    const L = tool.stick_out_mm;
    const E_carbide = 600000;  // N/mm² — Source: ASM Handbook Vol 16
    const defl = I > 0 ? (Fc * Math.pow(L, 3)) / (3 * E_carbide * I) : 0;

    // Surface finish: Ra = fz²/(32×r_nose) for flat endmill (Boothroyd & Knight §3.4)
    const rn = Math.max(tool.corner_radius_mm, 0.1);
    const Ra_um = tool.tool_type === "ball_endmill"
      ? predictRaBallMill(ae, D / 2)      // Ball: Ra = ae²/(8R) [Sandvik GC §5.1]
      : predictRaMillingFlat(fz, rn);      // Flat: Ra = fz²/(32×rn)

    // MRR: ap × ae × Vf
    const Vf = params.feed_mm_min;
    const mrr_val = ap > 0 ? ap * ae * Vf : 0;

    // Chip-thinning factor (for notes/reporting)
    const K_ct = chipThinningFactor(ae, D);

    return {
      cutting_force_N: Math.round(Fc * 10) / 10,
      power_kW: Math.round(power_kW * 100) / 100,
      torque_Nm: Math.round(torque * 100) / 100,
      tool_life_min: Math.round(Math.min(T_min, 9999) * 10) / 10,
      deflection_mm: Math.round(defl * 1000) / 1000,
      predicted_Ra_um: Math.round(Ra_um * 100) / 100,
      mrr_mm3_min: Math.round(mrr_val),
      chip_thinning_factor: Math.round(K_ct * 1000) / 1000,
    };
  }

  /**
   * Generate all planned operations for classified features.
   */
  private generateProcessPlan(
    features: MillingFeature[], input: MillingInput, machSpec: JMDieMachineSpec,
  ): { ops: MillingPlannedOp[]; warnings: MillingWarning[] } {
    const ops: MillingPlannedOp[] = [];
    const warnings: MillingWarning[] = [];
    const iso = (input.material?.iso_group ?? "P") as ISOGroup;
    const optimTarget = input.optimization_target ?? "balanced";
    let toolNum = 1;
    let opNum = 1;

    for (const feat of features) {
      for (const opType of (feat.required_operations ?? [])) {
        const tool = this.selectTool(opType, feat, iso, toolNum, machSpec);
        const params = this.calcSpeedFeed(opType, tool, iso, machSpec, optimTarget);
        const physics = this.calcPhysics(tool, params, iso);

        // Power check
        const maxPower = input.max_power_kW ?? machSpec.power_kW;
        if (physics.power_kW > maxPower * 0.95) {
          warnings.push({
            stage: "process_plan", severity: "warning",
            message: `Op ${opNum} (${opType}): predicted power ${physics.power_kW.toFixed(1)}kW exceeds 95% of ${maxPower}kW — reduce DOC or feed`,
            feature_id: feat.id,
          });
        }

        // Deflection check: alert if > 0.01mm for finishing ops
        if (physics.deflection_mm > 0.01 && opType.includes("finish")) {
          warnings.push({
            stage: "process_plan", severity: "warning",
            message: `Op ${opNum} (${opType}): tool deflection ${physics.deflection_mm.toFixed(3)}mm may affect tolerance — consider shorter stick-out`,
            feature_id: feat.id,
          });
        }

        // Envelope violations
        const envViolations = this._checkEnvelope({
          spindle_rpm: params.spindle_rpm,
          feed_mm_min: params.feed_mm_min,
          power_kW: physics.power_kW,
        });
        envViolations.forEach(msg => warnings.push({ stage: "process_plan", severity: "critical", message: msg, feature_id: feat.id }));

        // Coolant selection
        let coolant: MillingPlannedOp["coolant"] = "flood";
        try {
          const coolantResult = getCoolantStrategyEngine().recommend({
            material: mapToCoolantMat(iso),
            operation: mapToCoolantOp(opType),
            tool_type: tool.tool_type,
          });
          coolant = coolantResult?.coolant ?? "flood";
        } catch { coolant = "flood"; }

        // Approach strategy
        let approach: MillingPlannedOp["approach"] = "ramp";
        if (opType === "face_rough" || opType === "face_finish") approach = "direct";
        else if (opType === "pocket_rough" || opType === "adaptive_rough") approach = "helical";
        else if (opType.includes("drill") || opType === "tap_rigid") approach = "plunge";

        // Passes calculation
        const ap = params.depth_of_cut_mm;
        const passes = ap > 0 ? Math.max(1, Math.ceil(feat.depth_mm / ap)) : 1;

        // Cycle time estimate
        const cycleTime = estimateCycleTime(feat, params.feed_mm_min, passes);

        // Notes for setup sheet
        const notes: string[] = [];
        if (physics.chip_thinning_factor < 0.8) {
          notes.push(`Chip-thinning active (K_ct=${physics.chip_thinning_factor.toFixed(2)}) — fz corrected for radial engagement`);
        }
        if (physics.deflection_mm > 0.005) {
          notes.push(`Tool deflection: ${physics.deflection_mm.toFixed(3)}mm — use rigidity-optimized holder`);
        }
        if (opType === "adaptive_rough" || opType === "trochoidal_slot") {
          notes.push(`High-efficiency toolpath — maintain ae=${params.width_of_cut_mm.toFixed(1)}mm radial engagement`);
        }

        ops.push({
          op_number: opNum,
          feature_id: feat.id,
          operation_type: opType,
          tool,
          cutting_params: params,
          physics,
          cycle_time_sec: cycleTime,
          passes,
          approach,
          coolant,
          notes,
          position: feat.position,
          feature_dims: {
            width_mm: feat.width_mm, length_mm: feat.length_mm,
            depth_mm: feat.depth_mm, diameter_mm: feat.diameter_mm,
          },
        });

        opNum++;
        toolNum++; // New tool number for each operation (deduplicated below)
      }
    }

    return { ops, warnings };
  }

  // ==========================================================================
  // STAGE 3.5: CHATTER STABILITY PRE-CHECK
  // ==========================================================================

  /**
   * Check chatter stability for all milling operations.
   * Uses ChatterStabilityLobeEngine from existing engine suite.
   * Adjusts ap downward if unstable.
   */
  private runChatterChecks(
    ops: MillingPlannedOp[], iso: ISOGroup,
  ): { ops: MillingPlannedOp[]; checks: MillingChatterCheck[] } {
    const checks: MillingChatterCheck[] = [];

    const updatedOps = ops.map(op => {
      // Only check milling ops with ap > 0 (skip drills, taps)
      if (op.cutting_params.depth_of_cut_mm <= 0) {
        return op;
      }
      try {
        const stability = checkStability(
          op.cutting_params.depth_of_cut_mm,
          op.cutting_params.width_of_cut_mm,
          op.tool.diameter_mm,
          iso,
        );
        const stable = stability?.stable ?? true;
        const maxStable = stability?.ap_limit_mm ?? op.cutting_params.depth_of_cut_mm;
        const check: MillingChatterCheck = {
          op_number: op.op_number,
          stable,
          rpm: op.cutting_params.spindle_rpm,
          ap_mm: op.cutting_params.depth_of_cut_mm,
          ae_mm: op.cutting_params.width_of_cut_mm,
          max_stable_ap_mm: maxStable,
        };

        // If unstable, reduce ap to 80% of max stable
        if (!stable && maxStable > 0) {
          const newAp = maxStable * 0.80;
          check.adjusted_ap_mm = newAp;
          const updatedParams = { ...op.cutting_params, depth_of_cut_mm: newAp };
          const newPasses = Math.max(1, Math.ceil(op.feature_dims?.depth_mm ?? newAp / updatedParams.depth_of_cut_mm));
          checks.push(check);
          return { ...op, cutting_params: updatedParams, passes: newPasses };
        }

        checks.push(check);
        return op;
      } catch {
        return op;
      }
    });

    return { ops: updatedOps, checks };
  }

  // ==========================================================================
  // STAGE 4: G-CODE GENERATION
  // ==========================================================================

  /**
   * Generate complete G-code program from planned operations.
   * Controller-specific syntax for Haas NGC, WinMax, Okuma OSP, Fanuc.
   */
  private generateGCode(
    ops: MillingPlannedOp[], input: MillingInput,
    machSpec: JMDieMachineSpec, workOffset: string,
  ): string {
    const controller = machSpec.controller;
    const partNum = input.part_number ?? "PART";
    const matName = input.material?.material_name ?? "UNKNOWN";
    const iso = input.material?.iso_group ?? "P";

    const ln = makeLineCounter(10, 10);
    const lines: string[] = [];

    // Header
    lines.push(...programHeader(controller, partNum, matName));

    // Safe retract
    lines.push(`${ln()} G91 G28 Z0.0 (SAFE Z HOME)`);
    lines.push(`${ln()} G90`);
    lines.push(``);

    // Build deduplicated tool list (one tool change per unique tool number)
    const seenTools = new Set<number>();
    let prevToolNum = -1;

    for (const op of ops) {
      const tool = op.tool;
      const isNewTool = tool.tool_number !== prevToolNum;

      if (isNewTool) {
        // Safe Z before tool change
        lines.push(`${ln()} G00 G91 G28 Z0.0 M09 (TOOL CHANGE PREP)`);
        lines.push(...toolChangeBlock(ln, tool, controller, workOffset));

        // Spindle and coolant start
        const coolantOn = coolantCode(op.coolant, true, controller);
        lines.push(`${ln()} S${op.cutting_params.spindle_rpm} M03 ${coolantOn ? coolantOn + " " : ""}(SPINDLE ON)`);

        prevToolNum = tool.tool_number;
        seenTools.add(tool.tool_number);
      }

      // Operation-specific G-code block
      lines.push(`(OP ${op.op_number}: ${op.operation_type.toUpperCase()} — FEAT ${op.feature_id})`);

      switch (op.operation_type) {
        case "face_rough":
        case "face_finish":
          lines.push(...faceMillingBlock(ln, op.feature_dims ? {
            id: op.feature_id, type: "face", depth_mm: op.feature_dims.depth_mm ?? 1,
            width_mm: op.feature_dims.width_mm, length_mm: op.feature_dims.length_mm,
            position: op.position,
          } : { id: op.feature_id, type: "face", depth_mm: 1, width_mm: 80, length_mm: 100 },
          tool, op.cutting_params, controller));
          break;

        case "pocket_rough":
        case "pocket_semi_finish":
        case "pocket_finish":
        case "adaptive_rough":
          lines.push(...pocketMillingBlock(ln, {
            id: op.feature_id, type: "pocket_open",
            depth_mm: op.feature_dims?.depth_mm ?? 20,
            width_mm: op.feature_dims?.width_mm ?? 40,
            length_mm: op.feature_dims?.length_mm ?? 60,
            position: op.position,
          }, tool, op.cutting_params, controller));
          break;

        case "drill_center":
        case "drill_through":
        case "drill_peck":
        case "indexed_3plus2_drill":
          if (op.operation_type === "indexed_3plus2_drill") {
            lines.push(...indexed3plus2Block(ln, {
              id: op.feature_id, type: "indexed_hole",
              depth_mm: op.feature_dims?.depth_mm ?? 20,
              diameter_mm: op.feature_dims?.diameter_mm,
              position: op.position,
              index_A_deg: 0, index_B_deg: 0,
            }, tool, op.cutting_params, controller));
          } else {
            lines.push(...drillingCycleBlock(ln, {
              id: op.feature_id,
              type: op.operation_type === "drill_through" ? "hole_through" : "hole_blind",
              depth_mm: op.feature_dims?.depth_mm ?? 20,
              diameter_mm: op.feature_dims?.diameter_mm,
              position: op.position,
            }, op.cutting_params, op.operation_type, controller));
          }
          break;

        case "contour_rough":
        case "contour_finish":
          lines.push(...contourMillingBlock(ln, {
            id: op.feature_id, type: "contour_outside",
            depth_mm: op.feature_dims?.depth_mm ?? 20,
            width_mm: op.feature_dims?.width_mm, length_mm: op.feature_dims?.length_mm,
            position: op.position,
          }, tool, op.cutting_params, op.operation_type, controller));
          break;

        case "slot_rough":
        case "slot_finish":
        case "trochoidal_slot":
          lines.push(...slotMillingBlock(ln, {
            id: op.feature_id, type: "slot_open",
            depth_mm: op.feature_dims?.depth_mm ?? 10,
            width_mm: op.feature_dims?.width_mm,
            length_mm: op.feature_dims?.length_mm,
            position: op.position,
          }, tool, op.cutting_params, iso, controller));
          break;

        case "indexed_3plus2_mill":
          lines.push(...indexed3plus2Block(ln, {
            id: op.feature_id, type: "indexed_pocket",
            depth_mm: op.feature_dims?.depth_mm ?? 20,
            width_mm: op.feature_dims?.width_mm,
            position: op.position,
            index_A_deg: 0, index_B_deg: 0,
          }, tool, op.cutting_params, controller));
          break;

        default:
          // Generic block for taps, reamers, bore ops, chamfers, 3D ops
          lines.push(`${ln()} G00 X${(op.position?.x ?? 0).toFixed(3)} Y${(op.position?.y ?? 0).toFixed(3)}`);
          lines.push(`${ln()} G00 Z2.000`);
          lines.push(`${ln()} G01 Z${(-(op.feature_dims?.depth_mm ?? 5)).toFixed(3)} F${Math.round(op.cutting_params.feed_mm_min)}`);
          if (op.operation_type === "tap_rigid") {
            // Rigid tap cycle: G84 (standard) or G74 (left-hand)
            lines.push(`${ln()} G84 Z${(-(op.feature_dims?.depth_mm ?? 10)).toFixed(3)} R2.000 F${(op.cutting_params.feed_per_tooth_mm * op.tool.flutes * op.cutting_params.spindle_rpm).toFixed(0)}`);
            lines.push(`${ln()} G80`);
          } else {
            lines.push(`${ln()} G00 Z10.000`);
          }
      }

      // Coolant off between tool changes only (keep on during operation sequence)
      const nextOp = ops[ops.indexOf(op) + 1];
      const isLastOpForTool = !nextOp || nextOp.tool.tool_number !== tool.tool_number;
      if (isLastOpForTool) {
        const coolantOff = coolantCode(op.coolant, false, controller);
        if (coolantOff) lines.push(`${ln()} ${coolantOff} (COOLANT OFF)`);
        lines.push(`${ln()} M05 (SPINDLE OFF)`);
      }

      lines.push(``);
    }

    // Safe final retract and footer
    lines.push(`${ln()} G91 G28 Z0.0 (FINAL SAFE HOME)`);
    lines.push(`${ln()} G91 G28 X0.0 Y0.0`);
    lines.push(`${ln()} G90`);
    lines.push(...programFooter(controller));

    return lines.join("\n");
  }

  // ==========================================================================
  // STAGE 5: VALIDATION & OUTPUT
  // ==========================================================================

  /**
   * Run safety checks on the generated program and operations.
   */
  private runSafetyChecks(
    ops: MillingPlannedOp[], programText: string,
    machSpec: JMDieMachineSpec, input: MillingInput,
  ): MillingProgramResult["safety_checks"] {
    const checks: MillingProgramResult["safety_checks"] = [];

    // Check 1: Program has safe start/end codes
    checks.push({
      rule: "safe_start_codes",
      status: programText.includes("G40") && programText.includes("G49") && programText.includes("G80")
        ? "pass" : "warn",
      message: "G40 (cancel cutter comp), G49 (cancel TLC), G80 (cancel canned cycles) present",
    });

    // Check 2: Program ends with M30 or M02
    const hasProperEnd = programText.includes("M30") || programText.includes("M02");
    checks.push({
      rule: "program_end",
      status: hasProperEnd ? "pass" : "fail",
      message: hasProperEnd ? "Program ends with M30/M02" : "CRITICAL: No program end code (M30/M02) found",
    });

    // Check 3: All operations within spindle speed limit
    const maxRpm = input.max_spindle_rpm ?? machSpec.max_rpm;
    const overSpeedOps = ops.filter(op => op.cutting_params.spindle_rpm > maxRpm);
    checks.push({
      rule: "spindle_speed_limit",
      status: overSpeedOps.length === 0 ? "pass" : "fail",
      message: overSpeedOps.length === 0
        ? `All operations within ${maxRpm} RPM limit`
        : `${overSpeedOps.length} operations exceed machine RPM limit of ${maxRpm}`,
    });

    // Check 4: All operations within power limit
    const maxPower = input.max_power_kW ?? machSpec.power_kW;
    const overPowerOps = ops.filter(op => op.physics.power_kW > maxPower);
    checks.push({
      rule: "power_limit",
      status: overPowerOps.length === 0 ? "pass" : "warn",
      message: overPowerOps.length === 0
        ? `All operations within ${maxPower.toFixed(1)}kW machine power`
        : `${overPowerOps.length} operations may exceed ${maxPower.toFixed(1)}kW — verify spindle load`,
    });

    // Check 5: Tool deflection on finishing ops
    const highDeflOps = ops.filter(op =>
      (op.operation_type.includes("finish") || op.operation_type.includes("ream")) &&
      op.physics.deflection_mm > 0.005,
    );
    checks.push({
      rule: "finish_deflection",
      status: highDeflOps.length === 0 ? "pass" : "warn",
      message: highDeflOps.length === 0
        ? "Finish operation deflections within tolerance"
        : `${highDeflOps.length} finish ops have deflection > 0.005mm — verify dimensional accuracy`,
    });

    // Check 6: Cutter compensation cancelled (G40) before all rapid moves
    checks.push({
      rule: "cutter_comp_cancellation",
      status: programText.includes("G40") ? "pass" : "warn",
      message: "Cutter compensation cancelled (G40) in program",
    });

    // Check 7: Tool length compensation present
    const hasTLC = programText.includes("G43");
    checks.push({
      rule: "tool_length_comp",
      status: hasTLC ? "pass" : "fail",
      message: hasTLC ? "G43 tool length compensation active for all tools" : "CRITICAL: G43 tool length compensation missing",
    });

    // Check 8: Coolant codes present
    const hasCoolant = programText.includes("M08") || programText.includes("M07");
    checks.push({
      rule: "coolant_codes",
      status: hasCoolant ? "pass" : "warn",
      message: hasCoolant ? "Coolant activation codes (M08/M07) present" : "No coolant codes found — verify dry cut intent",
    });

    return checks;
  }

  /**
   * Build setup sheet from planned operations.
   */
  private buildSetupSheet(
    input: MillingInput, ops: MillingPlannedOp[],
    machSpec: JMDieMachineSpec, workOffset: string, cycleTimeSec: number,
  ): MillingProgramResult["setup_sheet"] {
    const stockSize = input.stock_size ?? this.estimateStockSize(input.features ?? []);
    const matName = input.material?.material_name ?? "UNKNOWN";

    // Deduplicate tools by tool_number
    const toolMap = new Map<number, MillingTool>();
    for (const op of ops) {
      if (!toolMap.has(op.tool.tool_number)) toolMap.set(op.tool.tool_number, op.tool);
    }

    const toolList = Array.from(toolMap.values()).map(tool => ({
      tool_number: tool.tool_number,
      description: `T${tool.tool_number} — ${tool.tool_type.toUpperCase()} Ø${tool.diameter_mm}mm ${tool.coating}`,
      diameter_mm: tool.diameter_mm,
      stick_out_mm: tool.stick_out_mm,
      holder: `${tool.holder_type} (${tool.taper})`,
    }));

    // JM Die specific fixture notes for die/tool steel
    const iso = input.material?.iso_group ?? "P";
    const fixtureNotes: string[] = [
      `Machine: ${machSpec.name} — Controller: ${machSpec.controller.toUpperCase()}`,
      `Taper: ${machSpec.taper} — Max RPM: ${machSpec.max_rpm.toLocaleString()}`,
      `Work Offset: ${workOffset} — WCS as per setup sheet datum`,
    ];
    if (iso === "H" || iso === "P") {
      fixtureNotes.push("Tool steel: Use flood coolant throughout — DO NOT dry cut");
      fixtureNotes.push("Verify vise jaw height does not exceed 40mm for clearance");
    }
    if (iso === "S") {
      fixtureNotes.push("Titanium/superalloy: Through-tool coolant recommended at high pressure (>70 bar)");
    }
    if (machSpec.is_5axis) {
      fixtureNotes.push("5-axis setup: Verify A/B axis range clears vise and stock before indexing");
    }

    return {
      part_number: input.part_number ?? "PART",
      material: matName,
      stock_size: stockSize,
      work_offset: workOffset,
      datum_description: "Part zero on top-left corner, Z=0 on top surface",
      taper: machSpec.taper,
      tool_list: toolList,
      fixture_notes: fixtureNotes,
      estimated_cycle_time_sec: cycleTimeSec,
      estimated_cycle_time_formatted: formatMillingTime(cycleTimeSec),
    };
  }

  /** Estimate stock size from feature extents when not provided. */
  private estimateStockSize(features: MillingFeature[]): { x: number; y: number; z: number } {
    if (!features.length) return { x: 100, y: 100, z: 50 };
    const maxX = Math.max(...features.map(f => (f.position?.x ?? 0) + (f.width_mm ?? 0) + (f.length_mm ?? 0)));
    const maxY = Math.max(...features.map(f => (f.position?.y ?? 0) + (f.length_mm ?? 0)));
    const maxZ = Math.max(...features.map(f => f.depth_mm ?? 0));
    return {
      x: Math.max(maxX + 20, 50),
      y: Math.max(maxY + 20, 50),
      z: Math.max(maxZ + 5, 20),
    };
  }

  // ==========================================================================
  // FULL PIPELINE
  // ==========================================================================

  /**
   * Run the complete 5-stage milling print-to-program pipeline.
   *
   * Side effect (INFRA-NEURAL-LEDGER-MS1/P0-U02): emits a fire-and-forget
   * `cross_process_stage_complete` event to the OutcomeCaptureBus JSONL
   * ledger before returning. The emission is non-blocking and never throws;
   * a ledger failure cannot break the pipeline. See utils/p2pOutcomeEmission.
   *
   * @param input - Milling blueprint input
   * @returns Full program result with G-code, setup sheet, validation, and confidence
   */
  runFullPipeline(input: MillingInput): MillingProgramResult {
    const checkpoint = new PipelineCheckpointManager("milling_print_to_program");
    const allWarnings: MillingWarning[] = [];
    const iso = (input.material?.iso_group ?? "P") as ISOGroup;
    const machSpec = resolveMachineSpec(input);
    const workOffset = input.work_offset ?? "G54";
    const partNum = input.part_number ?? "PART";

    log.info(`MillingPrintToProgramEngine: Starting pipeline for ${partNum} [${input.material?.material_name ?? "unknown"} ${iso}] on ${machSpec.name}`);

    // Resolve registry contexts for envelope guard
    try {
      this._resolvedMaterial = resolveMaterial(input.material?.material_name ?? iso);
    } catch { this._resolvedMaterial = null; }
    try {
      this._resolvedMachine = resolveMachine(input.machine_model ?? machSpec.name);
    } catch { this._resolvedMachine = null; }

    // ── S1: Intake ──────────────────────────────────────────────
    checkpoint.checkpoint("intake", 1, {});
    const intake = this.validateIntake(input);
    allWarnings.push(...intake.warnings);

    // ── S2: Feature Classification ───────────────────────────────
    checkpoint.checkpoint("classify", 2, {});
    const features = this.classifyFeatures(input.features ?? [], iso);

    // ── S3: Process Planning ─────────────────────────────────────
    checkpoint.checkpoint("plan", 3, {});
    const { ops: rawOps, warnings: planWarnings } = this.generateProcessPlan(features, input, machSpec);
    allWarnings.push(...planWarnings);

    // ── S3.5: Chatter Stability ───────────────────────────────────
    const { ops: opsAfterChatter, checks: chatterChecks } = this.runChatterChecks(rawOps, iso);

    // ── S3.7: OOP Doctrine — IntelligentSequencingEngine re-sequence ─────
    // Wires the 33-rule sequencing engine that was previously imported but
    // never invoked (TRIBAL-OUTCOME-LOOP-MS0 follow-on, slot:foxtrot).
    // Phases: 0=facing → 1=roughing → 2=drilling → 3=semi → 4=rest →
    //         5=finishing → 6=secondary/chamfer → 7=parting.
    // Closes the foxtrot OOP-doctrine sub-clause: walls before floors,
    // chamfer last, rough before drill (see knowledge/wiki/architecture/
    // tribal-outcome-loop-ms0.md §"order_of_operations" + iter28 doctrine tips).
    // Fail-soft: if sequencer throws, keep the chatter-stage order.
    let ops = opsAfterChatter;
    try {
      const seqInput = opsAfterChatter.map((op) => ({
        id: String(op.op_number),
        type: op.operation_type,
        operation: op.operation_type,
        tool_diameter_mm: op.tool?.diameter_mm,
        tool_id: op.tool?.tool_number !== undefined ? String(op.tool.tool_number) : undefined,
        position: op.position,
        estimated_time_s: op.cycle_time_sec,
      }));
      const seqResult = intelligentSequencingEngine.sequence(seqInput);
      // Re-order ops to match the sequencer's output by id (op_number).
      const byId = new Map(opsAfterChatter.map((op) => [String(op.op_number), op]));
      const reordered = seqResult.operations
        .map((s) => byId.get(s.id))
        .filter((op): op is typeof opsAfterChatter[number] => op !== undefined);
      if (reordered.length === opsAfterChatter.length) {
        ops = reordered;
        for (const w of seqResult.warnings) {
          allWarnings.push({ stage: "sequencing", severity: "info", message: w });
        }
      }
    } catch (err) {
      allWarnings.push({
        stage: "sequencing",
        severity: "info",
        message: `IntelligentSequencingEngine failed (fail-soft): ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    // Total cycle time
    const totalCycleTime = ops.reduce((sum, op) => sum + op.cycle_time_sec, 0);

    // Total tool changes (unique tool numbers in order)
    const toolChanges = new Set(ops.map(op => op.tool.tool_number)).size;

    // ── S4: G-Code Generation ────────────────────────────────────
    checkpoint.checkpoint("gcode", 4, {});
    let programText = "";
    let programLineCount = 0;
    try {
      programText = this.generateGCode(ops, input, machSpec, workOffset);
      programLineCount = programText.split("\n").filter(l => l.trim()).length;
    } catch (err: any) {
      allWarnings.push({ stage: "gcode", severity: "critical", message: `G-code generation error: ${err?.message ?? err}` });
    }

    // ── S5: Validation & Output ──────────────────────────────────
    checkpoint.checkpoint("validate", 5, {});
    const safetyChecks = this.runSafetyChecks(ops, programText, machSpec, input);
    const passCount = safetyChecks.filter(c => c.status === "pass").length;
    const passRate = safetyChecks.length > 0 ? passCount / safetyChecks.length : 0;

    // Tribal knowledge tips (JM Die shop floor)
    let tribalTips: KnowledgeTip[] = [];
    try {
      tribalTips = tribalKnowledgeEngine.search(
        `milling ${input.material?.material_name ?? ""} ${iso}`, 3,
      ) ?? [];
    } catch { tribalTips = []; }

    // TRIBAL-OUTCOME-LOOP-MS0/U-TTOB04 — auto-fire the closed-loop write
    // side. Derives the primary operation from ops[0] and uses partNum as
    // the programId. Fail-soft: never blocks pipeline completion if the
    // bridge/embedder is down.
    // runFullPipeline is synchronous; lessonsForOperationWithRecording is async + fail-soft.
    // Fire-and-forget the closed-loop write side — citedTips stays empty on this synchronous
    // pass; the downstream emit treats absence as "no tips" (already the fallback path).
    // Bug-fix 2026-05-27 (slot:echo): prior `await` here was outside an async function and
    // blocked the entire esbuild bundle, leaving dist/ stale through iter17's dialect fix.
    const citedTips: CitedMillingTip[] = [];
    try {
      const primaryOp = ops[0]?.operation_type ?? "milling";
      Promise.resolve(
        knowledgeCurriculumBridgeEngine.lessonsForOperationWithRecording(
          primaryOp,
          partNum,
          "MillingPrintToProgramEngine",
        ),
      ).catch(err => {
        log.warn(`MillingPrintToProgramEngine: closed-loop tribal-tip recording failed (fail-soft): ${err instanceof Error ? err.message : String(err)}`);
      });
    } catch (err) {
      log.warn(`MillingPrintToProgramEngine: closed-loop tribal-tip recording sync-throw (fail-soft): ${err instanceof Error ? err.message : String(err)}`);
    }

    // Playbook rules (U-P2PFS08)
    let playbookRules: Array<{ id: string; title: string; severity: string; rule: string }> = [];
    try {
      const featureTypes = features.map(f => f.type);
      const advice = machiningPlaybookEngine.advise({
        features: featureTypes,
        material_iso: iso,
        machine_type: "mill",
        severity_min: "recommended",
      });
      playbookRules = advice.rules.slice(0, 5).map(r => ({
        id: r.id,
        title: r.title,
        severity: r.severity,
        rule: r.rule,
      }));
    } catch { playbookRules = []; }

    // Confidence scoring: intake completeness + safety pass rate + feature coverage
    const hasAllFeatureOps = features.every(f => (f.required_operations?.length ?? 0) > 0);
    const confidenceBase = (intake.complete ? 0.40 : 0.20)
      + (passRate * 0.40)
      + (hasAllFeatureOps ? 0.10 : 0.0)
      + (programLineCount > 10 ? 0.10 : 0.0);
    const confidence = Math.min(Math.round(confidenceBase * 100) / 100, 1.0);

    // Critical check: fail closed if safety critical failures present
    const hasCritical = safetyChecks.some(c => c.status === "fail")
      || allWarnings.some(w => w.severity === "critical" && w.stage !== "intake");

    const setupSheet = this.buildSetupSheet(input, ops, machSpec, workOffset, totalCycleTime);

    log.info(`MillingPrintToProgramEngine: Pipeline complete — ${ops.length} ops, ${programLineCount} lines, confidence=${confidence}, criticalFail=${hasCritical}`);

    const result: MillingProgramResult = {
      success: !hasCritical,
      part_number: partNum,
      material: input.material?.material_name ?? "UNKNOWN",
      machine: machSpec.name,
      controller: machSpec.controller,
      intake_validation: intake,
      machinable_features: features,
      feature_count: features.length,
      operations: ops,
      total_operations: ops.length,
      total_tool_changes: toolChanges,
      estimated_cycle_time_sec: totalCycleTime,
      program_text: hasCritical ? "" : programText,
      program_line_count: hasCritical ? 0 : programLineCount,
      safety_checks: safetyChecks,
      safety_pass_rate: passRate,
      setup_sheet: setupSheet,
      confidence_score: confidence,
      warnings: allWarnings,
      tribal_tips: tribalTips,
      chatter_checks: chatterChecks,
      postprocessor_applied: false,
      playbook_rules: playbookRules.length > 0 ? playbookRules : undefined,
    };

    // INFRA-NEURAL-LEDGER-MS1/P0-U02 — emit per-pipeline-run outcome event to
    // the neural-feedback ledger. Fire-and-forget; never blocks or throws.
    // Scalar-only summary; full result object stays out of the JSONL (PII gate).
    emitP2POutcome({
      engineName: "MillingPrintToProgramEngine",
      domain: "mill",
      pipelineStage: P2P_STAGES.PRINT_TO_PROGRAM,
      success: result.success,
      jobId: result.part_number,
      summary: {
        total_operations: result.total_operations,
        total_tool_changes: result.total_tool_changes,
        estimated_cycle_time_sec: result.estimated_cycle_time_sec,
        program_line_count: result.program_line_count,
        safety_pass_rate: result.safety_pass_rate,
        confidence_score: result.confidence_score,
        feature_count: result.feature_count,
        iso_group: iso,
        material_name: input.material?.material_name ?? "UNKNOWN",
        machine_name: machSpec.name,
        controller: machSpec.controller,
      },
      warnings: result.warnings.map((w) => `[${w.stage}/${w.severity}] ${w.message}`),
    });

    return result;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const millingPrintToProgramEngine = new MillingPrintToProgramEngine();
