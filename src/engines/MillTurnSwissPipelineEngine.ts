/**
 * MillTurnSwissPipelineEngine — Mill-Turn & Swiss-Type CNC Pipeline
 *
 * Comprehensive pipeline for multi-tasking turning centers:
 * 1. Live Tooling Operations: cross-drilling, face milling, C/Y-axis machining
 * 2. Sub-Spindle Transfer: part handoff, sync timing, grip force, back-working
 * 3. Multi-Channel Programming: channel sync, Gantt optimization, collision zones
 * 4. Bar Feeder Integration: remnant tracking, part count, collet/bushing selection
 * 5. Swiss-Type Machining: guide bushing deflection, B-axis, gang slide, micro-ops
 *
 * Physics: Vc_eff = pi*D_eff*n/1000 (live tool offset), F_grip > F_cut (sub-spindle),
 *          delta = F*L^3/(3*E*I) with L = bushing overhang (Swiss deflection),
 *          multi-channel timeline critical-path optimization
 *
 * References: Altintas (2012), Sandvik Coromant, Citizen/Star Swiss guides,
 *             DMG MORI NTX/NLX programming manuals, Index/Traub multi-channel docs
 *
 * @module engines/MillTurnSwissPipelineEngine
 * @version 1.0.0 — CK-MS6
 */

import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  taylorLife,
  type ISOGroup,
} from "../physics/constants.js";
import { log } from "../utils/Logger.js";
import { smartToolSelectorEngine } from "./SmartToolSelectorEngine.js";
import { coolantStrategyEngine } from "./CoolantStrategyEngine.js";
import { entryExitStrategyEngine } from "./EntryExitStrategyEngine.js";
import { workholdingVerificationEngine } from "./WorkholdingVerificationEngine.js";
import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";
import { resolveMaterial, resolveMachine, type ResolvedMaterialContext, type ResolvedMachineContext } from "./PipelineRegistryBridge.js";
import { machineEnvelopeGuardEngine } from "./MachineEnvelopeGuardEngine.js";

// ============================================================================
// SHARED ENGINE HELPERS (ESM-safe, non-blocking — 0-D-ARCH U-ARCH2)
// ============================================================================

function getSmartToolSelector(): any { return smartToolSelectorEngine; }
function getCoolantStrategyEngine(): any { return coolantStrategyEngine; }
function getEntryExitStrategyEngine(): any { return entryExitStrategyEngine; }
function getWorkholdingVerificationEngine(): any { return workholdingVerificationEngine; }

/** Map ISO to CoolantStrategy material */
function mtCoolantMat(iso: string): string {
  const m: Record<string, string> = {
    P: "carbon_steel", M: "stainless", K: "cast_iron",
    N: "aluminum", S: "titanium", H: "hardened_steel",
  };
  return m[iso] || "carbon_steel";
}

// ─── Types ─────────────────────────────────────────────────────────

/** ISO material group — alias for canonical ISOGroup from physics/constants.ts */
export type ISOGroupMT = ISOGroup;

/** Live tooling operation type. */
export type LiveToolOp =
  | "cross_drill"
  | "face_mill"
  | "c_axis_contour"
  | "y_axis_mill"
  | "cross_tap"
  | "keyway_mill"
  | "off_center_drill"
  | "polygon_turn";

/** Sub-spindle transfer mode. */
export type TransferMode =
  | "synchronized"    // both spindles rotate at same RPM
  | "stop_transfer"   // main stops, sub grips, then cut-off
  | "speed_match";    // sub ramps to match main before grip

/** Channel synchronization code style. */
export type SyncCodeStyle =
  | "fanuc_wait_m"     // M200/M201 wait codes
  | "siemens_waitm"    // WAITM(n,1,2) multi-channel
  | "mazak_smooth"     // Mazak Smooth !L / !R channel
  | "index_cline"      // Index C-line GETIME / WTIME
  | "citizen_cincom"   // Citizen Cincom $1/$2 channel
  | "generic";

/** Swiss machine configuration. */
export type SwissConfig =
  | "citizen_cincom"
  | "star_sr"
  | "tsugami_b_axis"
  | "tornos_deco"
  | "citizen_miyano"   // non-guide-bushing Miyano
  | "generic_swiss";

/** Bar stock material shape. */
export type BarShape = "round" | "hex" | "square";

// ─── Input Interfaces ──────────────────────────────────────────────

/** Live Tooling Operations input. */
export interface LiveToolInput {
  operation: LiveToolOp;
  tool_diameter_mm: number;
  spindle_speed_rpm?: number;
  cutting_speed_m_min?: number;
  feed_mm_rev?: number;
  feed_mm_tooth?: number;
  num_flutes?: number;
  depth_of_cut_mm: number;
  width_of_cut_mm?: number;
  workpiece_diameter_mm: number;
  offset_from_centerline_mm?: number;
  iso_group?: ISOGroupMT;
  /** Material name for per-material physics lookup from 2.9K registry (optional, falls back to ISO group). */
  material_name?: string;
  live_spindle_power_kW?: number;
  c_axis_resolution_deg?: number;
  y_axis_travel_mm?: number;
  hole_depth_mm?: number;
  interpolation_type?: "linear" | "circular" | "helical";
}

/** Sub-Spindle Transfer input. */
export interface SubSpindleTransferInput {
  transfer_mode: TransferMode;
  workpiece_diameter_mm: number;
  workpiece_length_mm: number;
  workpiece_material_density_kg_m3?: number;
  main_spindle_rpm: number;
  sub_spindle_grip_diameter_mm?: number;
  sub_spindle_grip_length_mm?: number;
  cut_off_tool_width_mm?: number;
  cut_off_feed_mm_rev?: number;
  cutting_force_tangential_N?: number;
  cutting_force_axial_N?: number;
  collet_friction_coeff?: number;
  sub_spindle_max_rpm?: number;
  acceleration_time_s?: number;
  overlap_mm?: number;
  back_work_operations?: BackWorkOp[];
  iso_group?: ISOGroupMT;
  /** Material name for per-material physics lookup from 2.9K registry (optional). */
  material_name?: string;
}

/** Back-working operation after sub-spindle transfer. */
export interface BackWorkOp {
  type: "face" | "drill" | "bore" | "tap" | "chamfer" | "turn_od" | "turn_id";
  depth_mm: number;
  diameter_mm?: number;
  feed_mm_rev?: number;
  cutting_speed_m_min?: number;
}

/** Multi-Channel Programming input. */
export interface MultiChannelInput {
  channels: ChannelDef[];
  sync_style: SyncCodeStyle;
  machine_turrets?: number;
  collision_zones?: CollisionZone[];
  optimize_overlap?: boolean;
  max_simultaneous_cuts?: number;
}

/** Single channel definition. */
export interface ChannelDef {
  channel_id: number;
  spindle: "main" | "sub";
  turret?: number;
  operations: ChannelOp[];
}

/** Single operation within a channel. */
export interface ChannelOp {
  op_id: string;
  type: string;
  duration_s: number;
  requires_spindle_lock?: boolean;
  z_start_mm?: number;
  z_end_mm?: number;
  x_range_mm?: [number, number];
  depends_on?: string[];
  can_overlap_with?: string[];
}

/** Collision zone between turrets. */
export interface CollisionZone {
  turret_a: number;
  turret_b: number;
  z_overlap_start_mm: number;
  z_overlap_end_mm: number;
  min_clearance_mm?: number;
}

/** Bar Feeder Integration input. */
export interface BarFeederInput {
  bar_diameter_mm: number;
  bar_length_mm: number;
  bar_shape?: BarShape;
  part_length_mm: number;
  cut_off_width_mm?: number;
  facing_allowance_mm?: number;
  grip_length_mm?: number;
  collet_type?: "standard" | "emergency" | "long_nose" | "carbide_lined";
  guide_bushing?: boolean;
  guide_bushing_bore_mm?: number;
  remnant_min_length_mm?: number;
  bar_end_waste_mm?: number;
  feed_time_s?: number;
  spindle_orient_time_s?: number;
  bar_material_density_kg_m3?: number;
}

/** Swiss-Type Machining input. */
export interface SwissMachiningInput {
  machine_config: SwissConfig;
  guide_bushing: boolean;
  bushing_bore_mm: number;
  workpiece_diameter_mm: number;
  overhang_from_bushing_mm: number;
  operation: "turn" | "drill" | "thread" | "mill" | "micro_drill" | "polygon";
  tool_diameter_mm?: number;
  cutting_force_N?: number;
  depth_of_cut_mm?: number;
  feed_mm_rev?: number;
  cutting_speed_m_min?: number;
  workpiece_modulus_GPa?: number;
  l_over_d_ratio?: number;
  b_axis_angle_deg?: number;
  gang_slide?: boolean;
  num_gang_positions?: number;
  thread_pitch_mm?: number;
  hole_depth_mm?: number;
  iso_group?: ISOGroupMT;
  /** Material name for per-material physics lookup from 2.9K registry (optional). */
  material_name?: string;
}

// ─── Result Interfaces ─────────────────────────────────────────────

/** Live tool calculation result. */
export interface LiveToolResult {
  effective_diameter_mm: number;
  effective_cutting_speed_m_min: number;
  recommended_rpm: number;
  feed_mm_rev: number;
  feed_mm_min: number;
  tangential_force_N: number;
  power_kW: number;
  power_utilization_pct: number;
  torque_Nm: number;
  interpolation_type: string;
  is_safe: boolean;
  recommendations: string[];
  warnings: string[];
}

/** Sub-spindle transfer result. */
export interface SubSpindleTransferResult {
  grip_force_required_N: number;
  grip_force_safety_factor: number;
  collet_pressure_bar: number;
  sync_time_s: number;
  cut_off_time_s: number;
  cut_off_force_N: number;
  total_transfer_time_s: number;
  back_work_cycle_time_s: number;
  is_grip_safe: boolean;
  transfer_sequence: string[];
  recommendations: string[];
  warnings: string[];
}

/** Multi-channel programming result. */
export interface MultiChannelResult {
  total_cycle_time_s: number;
  channel_timelines: ChannelTimeline[];
  sync_points: SyncPoint[];
  overlap_savings_s: number;
  overlap_savings_pct: number;
  collision_checks: CollisionCheck[];
  gantt_chart: GanttBar[];
  sync_codes: string[];
  is_safe: boolean;
  recommendations: string[];
}

/** Timeline for a single channel. */
export interface ChannelTimeline {
  channel_id: number;
  total_time_s: number;
  operations: ScheduledOp[];
}

/** Scheduled operation with start/end times. */
export interface ScheduledOp {
  op_id: string;
  start_s: number;
  end_s: number;
  waiting_s: number;
}

/** Synchronization point between channels. */
export interface SyncPoint {
  after_op: string;
  wait_channels: number[];
  sync_code: string;
  idle_time_s: number;
}

/** Collision check result. */
export interface CollisionCheck {
  turret_a: number;
  turret_b: number;
  ops_a: string;
  ops_b: string;
  z_overlap: boolean;
  time_overlap: boolean;
  collision_risk: boolean;
  clearance_mm: number;
}

/** Gantt chart bar for visualization. */
export interface GanttBar {
  channel_id: number;
  op_id: string;
  start_s: number;
  end_s: number;
  type: "cutting" | "idle" | "sync_wait";
}

/** Bar feeder calculation result. */
export interface BarFeederResult {
  parts_per_bar: number;
  total_material_per_part_mm: number;
  remnant_length_mm: number;
  remnant_usable: boolean;
  bar_utilization_pct: number;
  collet_recommendation: string;
  guide_bushing_bore_mm: number;
  feed_cycle_time_s: number;
  total_bar_weight_kg: number;
  part_weight_kg: number;
  recommendations: string[];
  warnings: string[];
}

/** Swiss machining calculation result. */
export interface SwissMachiningResult {
  deflection_um: number;
  deflection_conventional_um: number;
  deflection_reduction_pct: number;
  effective_stiffness_N_mm: number;
  max_safe_force_N: number;
  recommended_feed_mm_rev: number;
  recommended_speed_m_min: number;
  recommended_rpm: number;
  tool_approach: string;
  slide_recommendation: string;
  l_over_d_ratio: number;
  is_safe: boolean;
  recommendations: string[];
  warnings: string[];
}

// ─── Program Assembly Interfaces ──────────────────────────────────

/** Controller type for G-code formatting. */
export type MillTurnController = "fanuc" | "mazak" | "siemens" | "index" | "citizen";

/** A turning operation for program assembly. */
export interface TurningOperation {
  type: "od_rough" | "od_finish" | "id_rough" | "id_finish" | "face" | "groove" | "thread" | "cut_off" | "chamfer";
  tool_number: number;
  offset_number: number;
  tool_label?: string;
  start_x_mm: number;
  end_x_mm: number;
  start_z_mm: number;
  end_z_mm: number;
  depth_of_cut_mm?: number;
  feed_mm_rev: number;
  cutting_speed_m_min: number;
  max_rpm?: number;
  css?: boolean;
  channel?: number;
  coolant?: "flood" | "mist" | "high_pressure" | "off";
}

/** A live-tool (milling) operation for program assembly. */
export interface LiveToolOperation {
  type: "cross_drill" | "face_mill" | "c_axis_contour" | "y_axis_mill" | "cross_tap" | "keyway_mill" | "polygon_turn";
  tool_number: number;
  offset_number: number;
  tool_label?: string;
  tool_diameter_mm: number;
  c_positions_deg?: number[];
  y_position_mm?: number;
  z_start_mm: number;
  z_end_mm?: number;
  depth_mm: number;
  width_mm?: number;
  spindle_rpm: number;
  feed_mm_min: number;
  polar_interpolation?: boolean;
  channel?: number;
  coolant?: "flood" | "mist" | "high_pressure" | "off";
}

/** A sub-spindle operation for program assembly. */
export interface SubSpindleOperation {
  type: "face" | "drill" | "bore" | "tap" | "chamfer" | "turn_od" | "turn_id" | "thread";
  tool_number: number;
  offset_number: number;
  tool_label?: string;
  start_x_mm?: number;
  end_x_mm?: number;
  start_z_mm: number;
  end_z_mm: number;
  depth_of_cut_mm?: number;
  feed_mm_rev: number;
  cutting_speed_m_min: number;
  max_rpm?: number;
  coolant?: "flood" | "mist" | "high_pressure" | "off";
}

/** Transfer configuration for sub-spindle handoff. */
export interface TransferConfig {
  mode: TransferMode;
  overlap_mm?: number;
  cut_off_tool_number?: number;
  cut_off_tool_width_mm?: number;
  cut_off_feed_mm_rev?: number;
  part_off_x_mm?: number;
  sync_rpm?: number;
}

/** Bar feeder configuration for program assembly. */
export interface BarFeederConfig {
  enabled: boolean;
  bar_diameter_mm?: number;
  bar_pull_code?: string;
  next_part_m_code?: string;
  feed_stop_position_mm?: number;
}

/** Full program assembly input. */
export interface ProgramAssemblyInput {
  turning_ops: TurningOperation[];
  live_tool_ops: LiveToolOperation[];
  sub_spindle_ops?: SubSpindleOperation[];
  transfer?: TransferConfig;
  bar_feeder?: BarFeederConfig;
  controller: MillTurnController;
  material: { name: string; iso_group: string };
  stock_od_mm: number;
  part_length_mm: number;
  program_number?: number;
  program_comment?: string;
  machine_brand?: string;
  machine_model?: string;
}

/** Program assembly output. */
export interface ProgramAssemblyResult {
  program_text: string;
  channels: number;
  sync_points: number;
  cycle_time_est_min: number;
  line_count: number;
  warnings: string[];
  // PIPELINE-VAR U-PV03b: Taylor tool life per operation + PostProcessor status
  tool_life_estimates?: Array<{
    tool_number: number;
    cutting_speed_m_min: number;
    tool_life_min: number;
    parts_per_tool: number;
  }>;
  postprocessor_applied?: boolean;
}

// ─── Dispatch wrapper ──────────────────────────────────────────────

/** Union dispatch input for calculate(). */
export interface MillTurnSwissInput {
  action:
    | "live_tool_calc"
    | "sub_spindle_transfer"
    | "multi_channel_program"
    | "bar_feeder_calc"
    | "swiss_machining"
    | "mill_turn_assemble_program";
  params: LiveToolInput | SubSpindleTransferInput | MultiChannelInput | BarFeederInput | SwissMachiningInput | ProgramAssemblyInput;
}

// ─── Constants ─────────────────────────────────────────────────────

/** Kienzle kc1.1 and mc by ISO group — canonical source (physics/constants.ts)
 * Migration: 0-D-ARCH U-ARCH1 — fixed mc divergence: K 0.25→0.28, S 0.22→0.28, H 0.20→0.30 */
const KIENZLE_ISO: Record<ISOGroupMT, { kc1_1: number; mc: number }> = CANONICAL_KIENZLE;

/** Young's modulus (GPa) by common workpiece material */
const MODULUS_GPa: Record<string, number> = {
  steel: 210,
  stainless: 200,
  aluminum: 70,
  titanium: 114,
  brass: 100,
  copper: 117,
  inconel: 205,
};

/** Material density (kg/m^3) defaults */
const DENSITY_KG_M3: Record<ISOGroupMT, number> = {
  P: 7850,   // steel
  M: 7900,   // stainless
  K: 7200,   // cast iron
  N: 2700,   // aluminum
  S: 8200,   // superalloy
  H: 7850,   // hardened steel
};

/** Typical live spindle specs by operation */
const LIVE_TOOL_DEFAULTS: Record<LiveToolOp, {
  max_rpm: number; power_kW: number; interp: string;
}> = {
  cross_drill:     { max_rpm: 6000,  power_kW: 5.5,  interp: "linear" },
  face_mill:       { max_rpm: 4000,  power_kW: 7.5,  interp: "linear" },
  c_axis_contour:  { max_rpm: 3000,  power_kW: 5.5,  interp: "circular" },
  y_axis_mill:     { max_rpm: 6000,  power_kW: 7.5,  interp: "linear" },
  cross_tap:       { max_rpm: 2000,  power_kW: 3.0,  interp: "linear" },
  keyway_mill:     { max_rpm: 4000,  power_kW: 5.5,  interp: "linear" },
  off_center_drill:{ max_rpm: 6000,  power_kW: 5.5,  interp: "linear" },
  polygon_turn:    { max_rpm: 8000,  power_kW: 7.5,  interp: "circular" },
};

/** Swiss machine capabilities */
const SWISS_CONFIGS: Record<SwissConfig, {
  has_b_axis: boolean; gang_positions: number; turret_positions: number;
  max_bar_mm: number; guide_bushing_standard: boolean; channels: number;
}> = {
  citizen_cincom:  { has_b_axis: true,  gang_positions: 8,  turret_positions: 12, max_bar_mm: 32, guide_bushing_standard: true,  channels: 2 },
  star_sr:         { has_b_axis: true,  gang_positions: 8,  turret_positions: 10, max_bar_mm: 38, guide_bushing_standard: true,  channels: 2 },
  tsugami_b_axis:  { has_b_axis: true,  gang_positions: 10, turret_positions: 12, max_bar_mm: 32, guide_bushing_standard: true,  channels: 2 },
  tornos_deco:     { has_b_axis: true,  gang_positions: 12, turret_positions: 10, max_bar_mm: 32, guide_bushing_standard: true,  channels: 3 },
  citizen_miyano:  { has_b_axis: false, gang_positions: 0,  turret_positions: 24, max_bar_mm: 51, guide_bushing_standard: false, channels: 2 },
  generic_swiss:   { has_b_axis: false, gang_positions: 6,  turret_positions: 8,  max_bar_mm: 25, guide_bushing_standard: true,  channels: 1 },
};

/** Collet selection guidelines */
const COLLET_BORE_TOLERANCE_MM = 0.013; // typical 5C collet bore tolerance
const GUIDE_BUSHING_CLEARANCE_MM = 0.005; // bushing-to-bar clearance

// ─── Engine ────────────────────────────────────────────────────────

/**
 * MillTurnSwissPipelineEngine — Unified pipeline for mill-turn and Swiss-type CNC machining.
 *
 * Dispatches to 5 sub-methods via calculate():
 * - live_tool_calc: Live tooling speed/feed with centerline offset correction
 * - sub_spindle_transfer: Part handoff grip force and synchronization
 * - multi_channel_program: Multi-channel timeline optimization
 * - bar_feeder_calc: Bar stock management and part count
 * - swiss_machining: Swiss-type guide bushing deflection and recommendations
 */
export class MillTurnSwissPipelineEngine {

  /** Cached material context from PipelineRegistryBridge (2.9K materials). */
  private _resolvedMaterial: ResolvedMaterialContext | null = null;
  /** Cached machine context from PipelineRegistryBridge (910 machines). */
  private _resolvedMachine: ResolvedMachineContext | null = null;

  /**
   * Run machine envelope guard against peak mill-turn/swiss parameters.
   * Validates spindle RPM, feed rate, power, and work volume.
   */
  private _checkEnvelope(opts: {
    spindle_rpm?: number;
    feed_mm_min?: number;
    power_kW?: number;
    x_mm?: number;
    y_mm?: number;
    z_mm?: number;
  }): string[] {
    const envelope = this._resolvedMachine
      ? machineEnvelopeGuardEngine.fromMachineData(this._resolvedMachine)
      : {};
    const result = machineEnvelopeGuardEngine.check({
      spindle_rpm: opts.spindle_rpm,
      feed_mm_min: opts.feed_mm_min,
      power_kW: opts.power_kW,
      x: opts.x_mm,
      y: opts.y_mm,
      z: opts.z_mm,
    }, envelope);
    return result.violations.map(v => `ENVELOPE: ${v.message}`);
  }

  /**
   * Fire async material resolution from the registry bridge (non-blocking).
   * Populates _resolvedMaterial cache for per-material kc1_1/mc instead of ISO-group averages.
   */
  private _fireResolveMaterial(materialName?: string, iso?: ISOGroupMT): void {
    if (this._resolvedMaterial) return; // already cached
    if (!materialName && !iso) return;
    resolveMaterial({ material_name: materialName, iso_group: iso })
      .then(rm => { this._resolvedMaterial = rm; })
      .catch(() => { /* fallback to KIENZLE_ISO — already handled at call sites */ });
  }

  /**
   * Get Kienzle kc1_1/mc: prefer per-material registry data, fall back to ISO group.
   */
  private _getKienzle(iso: ISOGroupMT): { kc1_1: number; mc: number } {
    const rm = this._resolvedMaterial;
    if (rm) return { kc1_1: rm.kc1_1, mc: rm.mc };
    return KIENZLE_ISO[iso] ?? KIENZLE_ISO.P;
  }

  /**
   * Main dispatch method — routes to sub-calculations by action.
   * @param input - Action + params union
   * @returns Calculation result for the requested action
   */
  calculate(input: MillTurnSwissInput): LiveToolResult | SubSpindleTransferResult | MultiChannelResult | BarFeederResult | SwissMachiningResult | ProgramAssemblyResult {
    switch (input.action) {
      case "live_tool_calc":
        return this.calculateLiveTool(input.params as LiveToolInput);
      case "sub_spindle_transfer":
        return this.calculateSubSpindleTransfer(input.params as SubSpindleTransferInput);
      case "multi_channel_program":
        return this.calculateMultiChannel(input.params as MultiChannelInput);
      case "bar_feeder_calc":
        return this.calculateBarFeeder(input.params as BarFeederInput);
      case "swiss_machining":
        return this.calculateSwissMachining(input.params as SwissMachiningInput);
      case "mill_turn_assemble_program":
        return this.assembleProgram(input.params as ProgramAssemblyInput);
      default:
        throw new Error(`Unknown mill-turn action: ${(input as any).action}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 1. LIVE TOOLING OPERATIONS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Calculate live tooling parameters with centerline offset correction.
   *
   * When a rotating tool (drill/endmill) operates on a turning center,
   * the effective cutting diameter changes if the tool is offset from
   * the workpiece centerline (Y-axis offset, cross operations).
   *
   * Physics: D_eff = 2 * sqrt((D/2)^2 - offset^2) for offset < D/2
   *          Vc_eff = pi * D_eff * n / 1000
   *          Fc = kc * h * b (Kienzle)
   *
   * @param input - Live tool operation parameters
   * @returns Speed/feed/force results with safety assessment
   */
  calculateLiveTool(input: LiveToolInput): LiveToolResult {
    const {
      operation,
      tool_diameter_mm: D,
      depth_of_cut_mm: ap,
      width_of_cut_mm: ae = D * 0.5,
      workpiece_diameter_mm: Dw,
      offset_from_centerline_mm: offset = 0,
      iso_group: iso = "P",
      material_name: matName,
      live_spindle_power_kW: maxPower,
      num_flutes: z_teeth = 2,
      c_axis_resolution_deg = 0.001,
      y_axis_travel_mm = 0,
      hole_depth_mm,
      interpolation_type: interpOverride,
    } = input;

    // Fire async per-material physics resolution (U-ARCH3)
    this._fireResolveMaterial(matName, iso);

    const recs: string[] = [];
    const warnings: string[] = [];
    const defaults = LIVE_TOOL_DEFAULTS[operation];
    const machinePower = maxPower ?? defaults.power_kW;

    // ── 1. Effective diameter with centerline offset ──
    // For cross-drilling/milling offset from center, the effective
    // engagement diameter is reduced: D_eff = 2*sqrt((D/2)^2 - offset^2)
    const halfD = D / 2;
    let D_eff: number;
    if (Math.abs(offset) >= halfD) {
      warnings.push(`Offset ${offset}mm exceeds tool radius ${halfD}mm — tool misses workpiece`);
      D_eff = 0.1; // minimal to avoid div/0
    } else if (offset > 0) {
      D_eff = 2 * Math.sqrt(halfD * halfD - offset * offset);
      recs.push(`Centerline offset ${offset}mm reduces effective diameter from ${D.toFixed(2)}mm to ${D_eff.toFixed(2)}mm`);
    } else {
      D_eff = D;
    }

    // ── 2. Determine RPM from cutting speed or direct ──
    let n: number;
    if (input.spindle_speed_rpm) {
      n = input.spindle_speed_rpm;
    } else {
      const Vc = input.cutting_speed_m_min ?? this._defaultCuttingSpeed(iso, operation);
      n = (Vc * 1000) / (Math.PI * D_eff);
      n = Math.min(n, defaults.max_rpm);
    }
    n = Math.round(n);

    // Vc_eff = pi * D_eff * n / 1000
    const Vc_eff = (Math.PI * D_eff * n) / 1000;

    // ── 3. Feed calculation ──
    let fz: number;  // feed per tooth
    if (input.feed_mm_tooth) {
      fz = input.feed_mm_tooth;
    } else if (input.feed_mm_rev) {
      fz = input.feed_mm_rev / z_teeth;
    } else {
      fz = this._defaultFeedPerTooth(iso, D, operation);
    }
    const f_rev = fz * z_teeth;
    const f_min = f_rev * n;

    // ── 4. Cutting force (Kienzle for milling) ──
    // For live tool milling: h_avg = fz * sqrt(ae/D_eff) (average chip thickness)
    // U-ARCH3: per-material kc1_1/mc from registry when available, else ISO group
    const kienzle = this._getKienzle(iso);
    const h_avg = operation === "cross_drill" || operation === "cross_tap" || operation === "off_center_drill"
      ? f_rev / 2   // drilling: h = f/2
      : fz * Math.sqrt(Math.max(ae / D_eff, 0.01));
    const h_eff = Math.max(h_avg, 0.001);
    const kc = kienzle.kc1_1 * Math.pow(h_eff, -kienzle.mc);

    // Tangential force per tooth, then total
    const Fc_tooth = kc * h_eff * ap;
    // Average number of teeth in cut
    const engagement_angle = Math.acos(1 - 2 * ae / D_eff);
    const avg_teeth_in_cut = Math.max((z_teeth * engagement_angle) / (2 * Math.PI), 1);
    const Fc = Fc_tooth * avg_teeth_in_cut;

    // ── 5. Power and torque ──
    const P_kW = (Fc * Vc_eff) / 60000;
    const T_Nm = n > 0 ? (P_kW * 9549) / n : 0;
    const powerUtil = machinePower > 0 ? (P_kW / machinePower) * 100 : 0;

    // ── 6. Interpolation type selection ──
    const interp = interpOverride ?? this._selectInterpolation(operation, defaults.interp);

    // ── 7. Safety and recommendations ──
    let isSafe = true;
    if (powerUtil > 100) {
      warnings.push(`OVERLOAD: Power ${P_kW.toFixed(2)}kW exceeds live spindle capacity ${machinePower}kW`);
      isSafe = false;
    } else if (powerUtil > 85) {
      warnings.push(`High power utilization ${powerUtil.toFixed(0)}% — near live spindle limit`);
    }

    if (n > defaults.max_rpm) {
      warnings.push(`RPM ${n} exceeds typical live tool max ${defaults.max_rpm}`);
      isSafe = false;
    }

    if (operation === "c_axis_contour" && c_axis_resolution_deg > 0.01) {
      recs.push(`C-axis resolution ${c_axis_resolution_deg}deg may limit contour accuracy. Consider 0.001deg or better`);
    }

    if (operation === "y_axis_mill" && y_axis_travel_mm > 0 && ae > y_axis_travel_mm) {
      warnings.push(`Width of cut ${ae}mm exceeds Y-axis travel ${y_axis_travel_mm}mm`);
      isSafe = false;
    }

    if (operation === "cross_drill" && hole_depth_mm && hole_depth_mm > D * 5) {
      recs.push(`Cross-hole L/D = ${(hole_depth_mm / D).toFixed(1)} — consider peck drilling cycle`);
    }

    if (operation === "polygon_turn") {
      recs.push(`Polygon turning: ensure spindle-to-tool RPM ratio matches polygon side count`);
    }

    if (D_eff < D * 0.7 && offset > 0) {
      recs.push(`Large centerline offset reduces effective diameter by ${((1 - D_eff / D) * 100).toFixed(0)}% — verify chip load`);
    }

    // SmartToolSelector enrichment for live tooling (0-D-ARCH U-ARCH2)
    try {
      const sts = getSmartToolSelector();
      const stsResult = sts.select({
        material_iso_group: iso,
        operation: operation.replace("cross_", "").replace("off_center_", ""),
        max_diameter_mm: D,
        max_depth_mm: ap,
        optimization_goal: "balanced",
      });
      if (stsResult.best_tool) {
        recs.push(`SmartToolSelector: ${stsResult.best_tool.designation} (score=${stsResult.best_tool.score.toFixed(2)})`);
      }
    } catch { /* non-blocking */ }

    // CoolantStrategy enrichment (0-D-ARCH U-ARCH2)
    try {
      const cse = getCoolantStrategyEngine();
      const coolOp = operation.includes("drill") || operation.includes("tap") ? "drilling" : "milling_rough";
      const coolantResult = cse.calculate({
        workpiece_material: mtCoolantMat(iso),
        operation: coolOp,
        cutting_speed_m_min: Vc_eff,
        depth_of_cut_mm: ap,
        hole_depth_mm: hole_depth_mm,
        hole_diameter_mm: D,
      });
      recs.push(`Coolant: ${coolantResult.primary_method} (${coolantResult.fluid_type})`);
    } catch { /* non-blocking */ }

    // EntryExitStrategy for pocket/face milling on live tool (0-D-ARCH U-ARCH2)
    if (operation === "face_mill" || operation === "keyway_mill" || operation === "y_axis_mill") {
      try {
        const eese = getEntryExitStrategyEngine();
        const entryResult = eese.selectEntry({
          tool_diameter: D,
          pocket_depth: ap,
          pocket_width: ae,
          material: mtCoolantMat(iso),
        });
        recs.push(`Entry: ${entryResult.recommended_method} (feed×${entryResult.feed_factor.toFixed(2)})`);
      } catch { /* non-blocking */ }
    }

    // Machine envelope guard — validate live tool RPM, feed, and power
    warnings.push(...this._checkEnvelope({
      spindle_rpm: n,
      feed_mm_min: f_min,
      power_kW: P_kW,
    }));

    return {
      effective_diameter_mm: round4(D_eff),
      effective_cutting_speed_m_min: round4(Vc_eff),
      recommended_rpm: n,
      feed_mm_rev: round4(f_rev),
      feed_mm_min: round4(f_min),
      tangential_force_N: round4(Fc),
      power_kW: round4(P_kW),
      power_utilization_pct: round4(powerUtil),
      torque_Nm: round4(T_Nm),
      interpolation_type: interp,
      is_safe: isSafe,
      recommendations: recs,
      warnings,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. SUB-SPINDLE TRANSFER
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Calculate sub-spindle part transfer parameters.
   *
   * Models the complete transfer sequence: approach → grip → synchronize →
   * cut-off → retract → back-working operations.
   *
   * Physics:
   * - Grip force: F_grip > F_cut / mu (friction-based, safety factor 2.5)
   * - Centrifugal release: F_centrif = m * omega^2 * r_grip
   * - Cut-off force: Kienzle with groove width as chip width
   * - Sync time: acceleration + RPM match + stabilization
   *
   * @param input - Transfer parameters
   * @returns Grip force, timing, safety assessment
   */
  calculateSubSpindleTransfer(input: SubSpindleTransferInput): SubSpindleTransferResult {
    const {
      transfer_mode,
      workpiece_diameter_mm: Dw,
      workpiece_length_mm: Lw,
      main_spindle_rpm: mainRPM,
      sub_spindle_grip_diameter_mm: gripD = Dw,
      sub_spindle_grip_length_mm: gripL = Math.min(Lw * 0.3, 15),
      cut_off_tool_width_mm: cutWidth = 3.0,
      cut_off_feed_mm_rev: cutFeed = 0.05,
      cutting_force_tangential_N: Fc_ext,
      cutting_force_axial_N: Fa_ext = 0,
      collet_friction_coeff: mu = 0.25,
      sub_spindle_max_rpm: subMaxRPM = 5000,
      acceleration_time_s: accelTime = 0.8,
      overlap_mm: overlap = 2.0,
      back_work_operations: backOps = [],
      iso_group: iso = "P",
      material_name: matName,
    } = input;

    // Fire async per-material physics resolution (U-ARCH3)
    this._fireResolveMaterial(matName, iso);

    const recs: string[] = [];
    const warnings: string[] = [];
    const sequence: string[] = [];
    const density = input.workpiece_material_density_kg_m3
      ?? (this._resolvedMaterial?.density_kg_m3)
      ?? DENSITY_KG_M3[iso];

    // ── 1. Workpiece mass ──
    const volume_m3 = Math.PI * (Dw / 2000) ** 2 * (Lw / 1000);
    const mass_kg = volume_m3 * density;

    // ── 2. Centrifugal force on workpiece at grip ──
    const omega = (mainRPM * 2 * Math.PI) / 60;
    const r_grip = gripD / 2000; // meters
    const F_centrif = mass_kg * omega * omega * r_grip;

    // ── 3. Cut-off force (Kienzle) ──
    // U-ARCH3: per-material kc1_1/mc from registry when available
    const kienzle = this._getKienzle(iso);
    const h_cutoff = cutFeed; // chip thickness ≈ feed for parting
    const kc = kienzle.kc1_1 * Math.pow(Math.max(h_cutoff, 0.001), -kienzle.mc);
    const Fc_cutoff = kc * h_cutoff * cutWidth * 1.25; // 1.25x constrained chip flow factor

    // ── 4. Total forces requiring grip ──
    const Fc_max = Fc_ext ?? Fc_cutoff;
    const F_axial = Fa_ext + mass_kg * 9.81; // gravity + external axial
    const F_total = Math.sqrt(Fc_max * Fc_max + F_axial * F_axial + F_centrif * F_centrif);

    // ── 5. Required grip force: F_grip = F_total / mu * safety_factor ──
    const SAFETY_FACTOR = 2.5;
    const F_grip_required = (F_total / mu) * SAFETY_FACTOR;

    // Collet pressure (simplified: F = P * A_piston, typical bore area)
    const piston_area_cm2 = Math.PI * (gripD / 20) ** 2 * 0.3; // ~30% of grip diameter
    const pressure_bar = F_grip_required / (piston_area_cm2 * 10); // 1 bar = 10 N/cm2

    // ── 6. Synchronization timing ──
    let syncTime = 0;
    sequence.push("1. Sub-spindle approach to part");

    switch (transfer_mode) {
      case "synchronized": {
        // Both spindles rotate, sub ramps to match
        const rpmDiff = Math.abs(mainRPM - Math.min(mainRPM, subMaxRPM));
        syncTime = accelTime + rpmDiff / 2000; // ramp time
        sequence.push(`2. Sub-spindle ramps to ${mainRPM} RPM (synchronized)`);
        sequence.push("3. Sub-spindle grips with overlap");
        sequence.push("4. Cut-off tool parts workpiece");
        sequence.push("5. Both spindles continue, sub retracts");
        break;
      }
      case "stop_transfer": {
        syncTime = accelTime * 2; // decel main + grip + accel sub
        sequence.push("2. Main spindle decelerates to stop (M5)");
        sequence.push("3. Sub-spindle advances and grips part");
        sequence.push("4. Main spindle unclamps");
        sequence.push("5. Cut-off tool parts workpiece");
        sequence.push("6. Sub-spindle retracts with part");
        if (mainRPM > 2000) {
          recs.push("Stop transfer at high RPM incurs long decel time — consider synchronized mode");
        }
        break;
      }
      case "speed_match": {
        syncTime = accelTime * 1.5;
        sequence.push("2. Sub-spindle ramps to match main RPM");
        sequence.push("3. Phase synchronization (C-axis match)");
        sequence.push("4. Sub-spindle grips with overlap");
        sequence.push("5. Cut-off tool parts workpiece");
        sequence.push("6. Sub-spindle retracts");
        recs.push("Speed-match mode requires C-axis on both spindles for phase sync");
        break;
      }
    }

    // ── 7. Cut-off time ──
    const cutoff_rpm = transfer_mode === "stop_transfer" ? Math.min(mainRPM, 1500) : mainRPM;
    const cutoff_feed_mm_min = cutFeed * cutoff_rpm;
    const cutoff_distance = Dw / 2; // radial distance to center
    const cutoff_time_s = cutoff_distance / cutoff_feed_mm_min * 60;

    // ── 8. Back-working cycle time ──
    let backWorkTime = 0;
    if (backOps.length > 0) {
      sequence.push("7. Back-working operations on sub-spindle:");
      for (const op of backOps) {
        const opTime = this._estimateBackWorkTime(op, Dw, iso);
        backWorkTime += opTime;
        sequence.push(`   - ${op.type}: ${op.depth_mm}mm depth, ~${opTime.toFixed(1)}s`);
      }
    }

    // ── 9. Total transfer time ──
    const approach_time = 1.5; // typical rapid to part
    const grip_settle_time = 0.3;
    const retract_time = 1.0;
    const totalTime = approach_time + syncTime + grip_settle_time + cutoff_time_s + retract_time + backWorkTime;

    // ── 10. Safety assessment ──
    const gripSafe = F_grip_required < 50000; // 50kN typical collet limit
    if (!gripSafe) {
      warnings.push(`Required grip force ${F_grip_required.toFixed(0)}N exceeds typical collet capacity`);
    }
    if (pressure_bar > 30) {
      warnings.push(`Collet pressure ${pressure_bar.toFixed(1)} bar — verify hydraulic system capacity`);
    }
    if (overlap < 1.0) {
      warnings.push(`Overlap ${overlap}mm is minimal — risk of part drop during transfer`);
    }
    if (gripL < Dw * 0.5) {
      recs.push(`Grip length ${gripL.toFixed(1)}mm is short relative to diameter — increase for stability`);
    }
    if (mainRPM > subMaxRPM) {
      warnings.push(`Main spindle ${mainRPM} RPM exceeds sub-spindle max ${subMaxRPM} RPM — reduce for transfer`);
    }

    return {
      grip_force_required_N: round4(F_grip_required),
      grip_force_safety_factor: SAFETY_FACTOR,
      collet_pressure_bar: round4(pressure_bar),
      sync_time_s: round4(syncTime),
      cut_off_time_s: round4(cutoff_time_s),
      cut_off_force_N: round4(Fc_cutoff),
      total_transfer_time_s: round4(totalTime),
      back_work_cycle_time_s: round4(backWorkTime),
      is_grip_safe: gripSafe,
      transfer_sequence: sequence,
      recommendations: recs,
      warnings,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3. MULTI-CHANNEL PROGRAMMING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Optimize multi-channel program with synchronization and collision avoidance.
   *
   * Generates a Gantt-chart style timeline of operations across channels,
   * inserts sync/wait codes at dependency points, checks turret collision zones,
   * and maximizes overlap to minimize total cycle time.
   *
   * Algorithm:
   * 1. Topological sort of operations by dependencies
   * 2. Greedy scheduling with earliest-start-time heuristic
   * 3. Collision zone checking for overlapping operations
   * 4. Sync code generation per controller dialect
   *
   * @param input - Channel definitions, sync style, collision zones
   * @returns Optimized timeline with sync points and Gantt chart
   */
  calculateMultiChannel(input: MultiChannelInput): MultiChannelResult {
    const {
      channels,
      sync_style,
      collision_zones = [],
      optimize_overlap = true,
      max_simultaneous_cuts = 2,
    } = input;

    const recs: string[] = [];
    const syncPoints: SyncPoint[] = [];
    const collisionChecks: CollisionCheck[] = [];
    const ganttBars: GanttBar[] = [];

    // ── 1. Build dependency graph ──
    const allOps = new Map<string, { op: ChannelOp; channel_id: number; turret?: number }>();
    for (const ch of channels) {
      for (const op of ch.operations) {
        allOps.set(op.op_id, { op, channel_id: ch.channel_id, turret: ch.turret });
      }
    }

    // ── 2. Schedule operations per channel (earliest start time) ──
    const scheduled = new Map<string, { start: number; end: number; channel_id: number }>();
    const channelTimelines: ChannelTimeline[] = [];

    // First pass: sequential within each channel
    for (const ch of channels) {
      let t = 0;
      const schedOps: ScheduledOp[] = [];
      for (const op of ch.operations) {
        // Check dependencies from other channels
        let waitUntil = t;
        if (op.depends_on) {
          for (const depId of op.depends_on) {
            const dep = scheduled.get(depId);
            if (dep) {
              waitUntil = Math.max(waitUntil, dep.end);
            }
          }
        }
        const waitTime = waitUntil - t;
        const start = waitUntil;
        const end = start + op.duration_s;

        scheduled.set(op.op_id, { start, end, channel_id: ch.channel_id });
        schedOps.push({
          op_id: op.op_id,
          start_s: round4(start),
          end_s: round4(end),
          waiting_s: round4(waitTime),
        });

        // Gantt bars
        if (waitTime > 0) {
          ganttBars.push({
            channel_id: ch.channel_id,
            op_id: `wait_${op.op_id}`,
            start_s: round4(t),
            end_s: round4(start),
            type: "sync_wait",
          });
        }
        ganttBars.push({
          channel_id: ch.channel_id,
          op_id: op.op_id,
          start_s: round4(start),
          end_s: round4(end),
          type: "cutting",
        });

        // Generate sync code if waiting on other channel
        if (waitTime > 0.01 && op.depends_on) {
          for (const depId of op.depends_on) {
            const depInfo = allOps.get(depId);
            if (depInfo && depInfo.channel_id !== ch.channel_id) {
              syncPoints.push({
                after_op: depId,
                wait_channels: [ch.channel_id, depInfo.channel_id],
                sync_code: this._generateSyncCode(sync_style, depId, ch.channel_id, depInfo.channel_id),
                idle_time_s: round4(waitTime),
              });
            }
          }
        }

        t = end;
      }

      channelTimelines.push({
        channel_id: ch.channel_id,
        total_time_s: round4(t),
        operations: schedOps,
      });
    }

    // ── 3. Overlap optimization ──
    // Calculate what sequential would have been vs actual parallel
    const sequentialTotal = channelTimelines.reduce((sum, ct) => sum + ct.total_time_s, 0);
    const parallelTotal = Math.max(...channelTimelines.map(ct => ct.total_time_s));
    const overlapSavings = sequentialTotal - parallelTotal;
    const overlapPct = sequentialTotal > 0 ? (overlapSavings / sequentialTotal) * 100 : 0;

    // ── 4. Collision zone checking ──
    for (const zone of collision_zones) {
      // Find operations on each turret that occupy the collision zone
      const opsA = this._getOpsInZone(channels, zone.turret_a, zone.z_overlap_start_mm, zone.z_overlap_end_mm);
      const opsB = this._getOpsInZone(channels, zone.turret_b, zone.z_overlap_start_mm, zone.z_overlap_end_mm);

      for (const a of opsA) {
        for (const b of opsB) {
          const schedA = scheduled.get(a.op_id);
          const schedB = scheduled.get(b.op_id);
          if (!schedA || !schedB) continue;

          const timeOverlap = schedA.start < schedB.end && schedB.start < schedA.end;
          const zOverlap = true; // already filtered by zone
          const clearance = zone.min_clearance_mm ?? 5;

          collisionChecks.push({
            turret_a: zone.turret_a,
            turret_b: zone.turret_b,
            ops_a: a.op_id,
            ops_b: b.op_id,
            z_overlap: zOverlap,
            time_overlap: timeOverlap,
            collision_risk: timeOverlap && zOverlap,
            clearance_mm: clearance,
          });

          if (timeOverlap && zOverlap) {
            recs.push(
              `COLLISION RISK: ${a.op_id} (turret ${zone.turret_a}) and ${b.op_id} (turret ${zone.turret_b}) ` +
              `overlap in time and Z-zone [${zone.z_overlap_start_mm}, ${zone.z_overlap_end_mm}]mm. ` +
              `Add sync/wait code to serialize these operations.`
            );
          }
        }
      }
    }

    // ── 5. Sync code generation summary ──
    const syncCodes = this._generateSyncCodeBlock(sync_style, syncPoints, channels.length);

    // ── 6. Simultaneous cut check ──
    if (optimize_overlap) {
      const maxSimul = this._countMaxSimultaneousCuts(channelTimelines, scheduled);
      if (maxSimul > max_simultaneous_cuts) {
        recs.push(
          `Peak simultaneous cuts: ${maxSimul} exceeds limit of ${max_simultaneous_cuts}. ` +
          `Consider adding sync points to reduce concurrent load.`
        );
      }
    }

    const isSafe = collisionChecks.every(c => !c.collision_risk);
    if (overlapPct > 30) {
      recs.push(`Good overlap efficiency: ${overlapPct.toFixed(0)}% time savings from parallel operations`);
    }

    return {
      total_cycle_time_s: round4(parallelTotal),
      channel_timelines: channelTimelines,
      sync_points: syncPoints,
      overlap_savings_s: round4(overlapSavings),
      overlap_savings_pct: round4(overlapPct),
      collision_checks: collisionChecks,
      gantt_chart: ganttBars,
      sync_codes: syncCodes,
      is_safe: isSafe,
      recommendations: recs,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 4. BAR FEEDER INTEGRATION
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Calculate bar feeder parameters: parts per bar, remnant, collet selection.
   *
   * Tracks material consumption including cut-off width, facing allowance,
   * grip zone, and end waste. Recommends collet type and guide bushing bore.
   *
   * @param input - Bar and part dimensions, machine configuration
   * @returns Parts per bar, utilization, remnant analysis
   */
  calculateBarFeeder(input: BarFeederInput): BarFeederResult {
    const {
      bar_diameter_mm: Dbar,
      bar_length_mm: Lbar,
      bar_shape = "round",
      part_length_mm: Lpart,
      cut_off_width_mm: cutWidth = 3.0,
      facing_allowance_mm: faceAllow = 0.5,
      grip_length_mm: gripL = 15,
      collet_type,
      guide_bushing = false,
      guide_bushing_bore_mm: bushingBore,
      remnant_min_length_mm: remnantMin = 30,
      bar_end_waste_mm: endWaste = 20,
      feed_time_s: feedTime = 3.0,
      spindle_orient_time_s: orientTime = 1.0,
      bar_material_density_kg_m3: density = 7850,
    } = input;

    const recs: string[] = [];
    const warnings: string[] = [];

    // ── 1. Material per part ──
    const materialPerPart = Lpart + cutWidth + faceAllow;

    // ── 2. Usable bar length ──
    const usableLength = Lbar - endWaste - gripL;
    if (usableLength <= 0) {
      warnings.push("Bar too short — no usable length after grip and end waste");
      return this._emptyBarResult(recs, warnings);
    }

    // ── 3. Parts per bar ──
    const partsPerBar = Math.floor(usableLength / materialPerPart);
    if (partsPerBar <= 0) {
      warnings.push(`Part length ${materialPerPart.toFixed(1)}mm exceeds usable bar length ${usableLength.toFixed(1)}mm`);
      return this._emptyBarResult(recs, warnings);
    }

    // ── 4. Remnant ──
    const usedLength = partsPerBar * materialPerPart;
    const remnant = usableLength - usedLength;
    const remnantUsable = remnant >= remnantMin + materialPerPart;

    // ── 5. Bar utilization ──
    const utilization = (usedLength / Lbar) * 100;

    // ── 6. Collet recommendation ──
    let colletRec: string;
    if (collet_type) {
      colletRec = collet_type;
    } else if (Dbar < 10) {
      colletRec = "carbide_lined"; // precision for small bars
    } else if (Dbar > 40) {
      colletRec = "long_nose"; // extra grip for large bars
    } else {
      colletRec = "standard";
    }

    // ── 7. Guide bushing bore ──
    let bushBore: number;
    if (bushingBore) {
      bushBore = bushingBore;
    } else if (guide_bushing) {
      // Standard: bar diameter + clearance, round to nearest 0.5mm
      bushBore = Math.ceil((Dbar + GUIDE_BUSHING_CLEARANCE_MM * 2 * 1000) * 2) / 2;
      // Actually clearance is already in mm (0.005mm)
      bushBore = Math.ceil((Dbar + GUIDE_BUSHING_CLEARANCE_MM * 2) * 20) / 20;
    } else {
      bushBore = Dbar + 0.1; // collet bore with tolerance
    }

    // ── 8. Bar weight ──
    let crossSection_m2: number;
    switch (bar_shape) {
      case "round":
        crossSection_m2 = Math.PI * (Dbar / 2000) ** 2;
        break;
      case "hex":
        crossSection_m2 = (3 * Math.sqrt(3) / 2) * (Dbar / 2000) ** 2;
        break;
      case "square":
        crossSection_m2 = (Dbar / 1000) ** 2;
        break;
    }
    const barVolume_m3 = crossSection_m2 * (Lbar / 1000);
    const barWeight_kg = barVolume_m3 * density;
    const partWeight_kg = crossSection_m2 * (Lpart / 1000) * density;

    // ── 9. Feed cycle time ──
    const feedCycle = feedTime + orientTime + 0.5; // 0.5s clamp settle

    // ── 10. Recommendations ──
    if (utilization < 80) {
      recs.push(`Bar utilization ${utilization.toFixed(0)}% — consider adjusting part length or bar stock length`);
    }
    if (remnantUsable) {
      recs.push(`Remnant ${remnant.toFixed(1)}mm can yield additional parts — enable remnant re-feed`);
    }
    if (Dbar > 65) {
      warnings.push(`Bar diameter ${Dbar}mm exceeds typical bar feeder capacity (65mm). Verify feeder specs`);
    }
    if (barWeight_kg > 30) {
      recs.push(`Bar weight ${barWeight_kg.toFixed(1)}kg — ensure bar feeder lifting capacity is adequate`);
    }
    if (guide_bushing && Dbar !== Math.round(Dbar)) {
      recs.push(`Non-integer bar diameter ${Dbar}mm — verify guide bushing availability in this size`);
    }
    if (bar_shape !== "round") {
      recs.push(`${bar_shape} bar stock: ensure collet has matching profile (not round collet)`);
    }

    return {
      parts_per_bar: partsPerBar,
      total_material_per_part_mm: round4(materialPerPart),
      remnant_length_mm: round4(remnant),
      remnant_usable: remnantUsable,
      bar_utilization_pct: round4(utilization),
      collet_recommendation: colletRec,
      guide_bushing_bore_mm: round4(bushBore),
      feed_cycle_time_s: round4(feedCycle),
      total_bar_weight_kg: round4(barWeight_kg),
      part_weight_kg: round4(partWeight_kg),
      recommendations: recs,
      warnings,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 5. SWISS-TYPE MACHINING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Swiss-type machining calculations with guide bushing deflection model.
   *
   * In Swiss-type (sliding headstock) machines, the guide bushing supports
   * the workpiece close to the cutting point, dramatically reducing deflection.
   * The effective cantilever length is the overhang from the bushing, not the
   * full workpiece extension from the chuck.
   *
   * Physics:
   * - Deflection: delta = F * L^3 / (3 * E * I) where L = bushing overhang
   * - Conventional: delta_conv = F * L_total^3 / (3 * E * I)
   * - Moment of inertia: I = pi * D^4 / 64 (circular cross-section)
   * - Stiffness: k = 3 * E * I / L^3
   * - Max safe force: F_max for delta < tolerance (typically 0.01mm)
   *
   * @param input - Swiss machine config, workpiece, operation parameters
   * @returns Deflection comparison, speed/feed recommendations, tool approach
   */
  calculateSwissMachining(input: SwissMachiningInput): SwissMachiningResult {
    const {
      machine_config: config,
      guide_bushing,
      bushing_bore_mm,
      workpiece_diameter_mm: Dw,
      overhang_from_bushing_mm: L_overhang,
      operation,
      tool_diameter_mm: Dtool,
      cutting_force_N: F_ext,
      depth_of_cut_mm: ap = 0.5,
      feed_mm_rev: f = 0.08,
      cutting_speed_m_min: Vc_in,
      workpiece_modulus_GPa: E_GPa = 210,
      l_over_d_ratio: ld_override,
      b_axis_angle_deg: bAngle = 0,
      gang_slide = false,
      num_gang_positions: gangPos,
      thread_pitch_mm,
      hole_depth_mm,
      iso_group: iso = "P",
      material_name: matName,
    } = input;

    // Fire async per-material physics resolution (U-ARCH3)
    this._fireResolveMaterial(matName, iso);

    const recs: string[] = [];
    const warnings: string[] = [];
    const machConfig = SWISS_CONFIGS[config];

    // ── 1. Moment of inertia ──
    const D_m = Dw / 1000; // convert to meters
    const I_m4 = (Math.PI * Math.pow(D_m, 4)) / 64;
    const E_Pa = E_GPa * 1e9;

    // ── 2. L/D ratio ──
    const L_D = ld_override ?? L_overhang / Dw;

    // ── 3. Cutting force estimate (if not provided) ──
    // U-ARCH3: per-material kc1_1/mc from registry when available
    const kienzle = this._getKienzle(iso);
    const h = f; // chip thickness ≈ feed for turning
    const kc = kienzle.kc1_1 * Math.pow(Math.max(h, 0.001), -kienzle.mc);
    const F_calc = kc * h * ap;
    const F = F_ext ?? F_calc;

    // ── 4. Swiss deflection (guide bushing model) ──
    // delta = F * L^3 / (3 * E * I) — L is bushing overhang only
    const L_swiss_m = L_overhang / 1000;
    const delta_swiss_m = (F * Math.pow(L_swiss_m, 3)) / (3 * E_Pa * I_m4);
    const delta_swiss_um = delta_swiss_m * 1e6;

    // ── 5. Conventional deflection (full length from chuck) ──
    // Assume conventional overhang is 3-5x bushing overhang (typical)
    const L_conv_factor = guide_bushing ? 4.0 : 1.0;
    const L_conv_m = L_swiss_m * L_conv_factor;
    const delta_conv_m = (F * Math.pow(L_conv_m, 3)) / (3 * E_Pa * I_m4);
    const delta_conv_um = delta_conv_m * 1e6;

    // Deflection reduction
    const reductionPct = delta_conv_um > 0
      ? ((delta_conv_um - delta_swiss_um) / delta_conv_um) * 100
      : 0;

    // ── 6. Effective stiffness ──
    const stiffness = L_swiss_m > 0
      ? (3 * E_Pa * I_m4) / Math.pow(L_swiss_m, 3)
      : Infinity;

    // ── 7. Max safe force (for 10 um deflection tolerance) ──
    const DEFLECTION_TOL_M = 10e-6; // 10 um
    const F_max = L_swiss_m > 0
      ? (3 * E_Pa * I_m4 * DEFLECTION_TOL_M) / Math.pow(L_swiss_m, 3)
      : Infinity;

    // ── 8. Recommended cutting parameters ──
    let Vc_rec: number;
    if (Vc_in) {
      Vc_rec = Vc_in;
    } else {
      // Swiss operations typically run faster due to rigidity
      const baseVc = this._defaultCuttingSpeedTurning(iso);
      Vc_rec = guide_bushing ? baseVc * 1.15 : baseVc; // 15% boost with guide bushing
      if (operation === "micro_drill" && Dtool && Dtool < 2) {
        Vc_rec *= 0.7; // reduce for micro tools
      }
    }

    const rpm_rec = Dw > 0 ? (Vc_rec * 1000) / (Math.PI * Dw) : 0;

    // Feed recommendation based on deflection safety
    let f_rec = f;
    if (F > F_max * 0.8) {
      // Reduce feed to bring force down
      const f_ratio = Math.sqrt(F_max * 0.7 / F);
      f_rec = f * Math.min(f_ratio, 1.0);
      recs.push(`Force ${F.toFixed(0)}N near limit — feed reduced from ${f}mm/rev to ${f_rec.toFixed(3)}mm/rev`);
    }

    // ── 9. Tool approach and slide selection ──
    let toolApproach: string;
    let slideRec: string;

    if (bAngle !== 0 && machConfig.has_b_axis) {
      toolApproach = `B-axis at ${bAngle}deg — compound angle approach`;
    } else if (operation === "drill" || operation === "micro_drill") {
      toolApproach = "Z-axis aligned — direct drilling approach";
    } else if (operation === "mill" || operation === "polygon") {
      toolApproach = "Cross-slide with live tool — perpendicular approach";
    } else {
      toolApproach = "Standard radial approach from gang or turret";
    }

    if (gang_slide || machConfig.gang_positions > 0) {
      const positions = gangPos ?? machConfig.gang_positions;
      slideRec = `Gang slide (${positions} positions) — faster tool change, lower rigidity`;
      if (F > 500 && positions > 6) {
        recs.push("High cutting force with gang slide — consider turret for better rigidity");
        slideRec = `Turret (${machConfig.turret_positions} positions) — better rigidity for high-force operation`;
      }
    } else {
      slideRec = `Turret (${machConfig.turret_positions} positions)`;
    }

    // ── 10. Operation-specific checks ──
    let isSafe = true;

    if (delta_swiss_um > 10) {
      warnings.push(`Swiss deflection ${delta_swiss_um.toFixed(1)}um exceeds 10um tolerance`);
      isSafe = false;
    }

    if (L_D > 8 && guide_bushing) {
      warnings.push(`L/D = ${L_D.toFixed(1)} is high even for Swiss — consider shorter overhang or steadier`);
    } else if (L_D > 4 && !guide_bushing) {
      warnings.push(`L/D = ${L_D.toFixed(1)} without guide bushing — deflection risk, consider Swiss-type machine`);
    }

    if (operation === "micro_drill" && Dtool && Dtool < 1) {
      recs.push(`Micro-drill D=${Dtool}mm: use high-pressure coolant (70+ bar), peck cycle, pilot hole recommended`);
      if (hole_depth_mm && hole_depth_mm / Dtool > 10) {
        warnings.push(`Micro-drill L/D = ${(hole_depth_mm / Dtool).toFixed(0)} — extreme, high breakage risk`);
      }
    }

    if (operation === "thread" && thread_pitch_mm) {
      const threadLD = L_overhang / Dw;
      if (threadLD > 3) {
        recs.push(`Threading at L/D=${threadLD.toFixed(1)} — use multiple spring passes to control deflection`);
      }
      recs.push(`Thread pitch ${thread_pitch_mm}mm: synchronize spindle encoder for single-point threading`);
    }

    if (guide_bushing && Math.abs(bushing_bore_mm - Dw) > 0.1) {
      warnings.push(
        `Bushing bore ${bushing_bore_mm}mm vs bar ${Dw}mm — gap ${(bushing_bore_mm - Dw).toFixed(3)}mm. ` +
        `Optimal clearance is 0.005-0.010mm`
      );
    }

    if (bAngle !== 0 && !machConfig.has_b_axis) {
      warnings.push(`B-axis angle ${bAngle}deg requested but ${config} has no B-axis`);
      isSafe = false;
    }

    if (Dw > machConfig.max_bar_mm) {
      warnings.push(`Workpiece ${Dw}mm exceeds ${config} max bar capacity ${machConfig.max_bar_mm}mm`);
      isSafe = false;
    }

    if (guide_bushing) {
      recs.push(`Guide bushing: deflection reduced by ${reductionPct.toFixed(0)}% vs conventional (${delta_conv_um.toFixed(1)}um → ${delta_swiss_um.toFixed(1)}um)`);
    }

    // Machine envelope guard — validate spindle RPM and bar diameter
    warnings.push(...this._checkEnvelope({
      spindle_rpm: Math.round(rpm_rec),
      feed_mm_min: f_rec * Math.round(rpm_rec),
    }));

    return {
      deflection_um: round4(delta_swiss_um),
      deflection_conventional_um: round4(delta_conv_um),
      deflection_reduction_pct: round4(reductionPct),
      effective_stiffness_N_mm: round4(stiffness / 1000), // convert N/m to N/mm
      max_safe_force_N: round4(F_max),
      recommended_feed_mm_rev: round4(f_rec),
      recommended_speed_m_min: round4(Vc_rec),
      recommended_rpm: Math.round(rpm_rec),
      tool_approach: toolApproach,
      slide_recommendation: slideRec,
      l_over_d_ratio: round4(L_D),
      is_safe: isSafe,
      recommendations: recs,
      warnings,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Default cutting speed for live tool operations by ISO group.
   * @param iso - ISO material group
   * @param op - Live tool operation type
   * @returns Cutting speed in m/min
   */
  private _defaultCuttingSpeed(iso: ISOGroupMT, op: LiveToolOp): number {
    const base: Record<ISOGroupMT, number> = {
      P: 80, M: 50, K: 70, N: 200, S: 25, H: 40,
    };
    const v = base[iso];
    switch (op) {
      case "cross_drill": return v * 0.8;
      case "cross_tap": return v * 0.4;
      case "face_mill": return v * 1.0;
      case "c_axis_contour": return v * 0.9;
      case "y_axis_mill": return v * 1.0;
      case "keyway_mill": return v * 0.7;
      case "off_center_drill": return v * 0.75;
      case "polygon_turn": return v * 1.2;
      default: return v;
    }
  }

  /**
   * Default feed per tooth for milling operations.
   * @param iso - ISO material group
   * @param D - Tool diameter in mm
   * @param op - Operation type
   * @returns Feed per tooth in mm
   */
  private _defaultFeedPerTooth(iso: ISOGroupMT, D: number, op: LiveToolOp): number {
    // Base fz scales with tool diameter: small tools = lower feed
    const baseFz = D < 6 ? 0.04 : D < 12 ? 0.06 : D < 20 ? 0.08 : 0.10;
    const isoFactor: Record<ISOGroupMT, number> = {
      P: 1.0, M: 0.8, K: 1.1, N: 1.3, S: 0.5, H: 0.6,
    };
    const opFactor: Record<string, number> = {
      cross_drill: 0.8,
      cross_tap: 0.5,
      face_mill: 1.0,
      c_axis_contour: 0.7,
      y_axis_mill: 1.0,
      keyway_mill: 0.6,
      off_center_drill: 0.8,
      polygon_turn: 1.1,
    };
    return baseFz * (isoFactor[iso] ?? 1.0) * (opFactor[op] ?? 1.0);
  }

  /**
   * Default cutting speed for Swiss turning operations.
   * @param iso - ISO material group
   * @returns Cutting speed in m/min
   */
  private _defaultCuttingSpeedTurning(iso: ISOGroupMT): number {
    const base: Record<ISOGroupMT, number> = {
      P: 150, M: 100, K: 130, N: 350, S: 40, H: 60,
    };
    return base[iso];
  }

  /**
   * Select interpolation type based on operation.
   * @param op - Live tool operation
   * @param fallback - Default interpolation from config
   * @returns Interpolation type string
   */
  private _selectInterpolation(op: LiveToolOp, fallback: string): string {
    switch (op) {
      case "c_axis_contour": return "circular";
      case "polygon_turn": return "circular";
      case "cross_drill":
      case "cross_tap":
      case "off_center_drill": return "linear";
      case "keyway_mill": return "linear";
      default: return fallback;
    }
  }

  /**
   * Estimate back-working operation time.
   * @param op - Back-work operation definition
   * @param Dw - Workpiece diameter mm
   * @param iso - ISO material group
   * @returns Estimated time in seconds
   */
  private _estimateBackWorkTime(op: BackWorkOp, Dw: number, iso: ISOGroupMT): number {
    const Vc = op.cutting_speed_m_min ?? this._defaultCuttingSpeedTurning(iso);
    const f = op.feed_mm_rev ?? 0.1;
    const D = op.diameter_mm ?? Dw;
    const rpm = D > 0 ? (Vc * 1000) / (Math.PI * D) : 1000;
    const feedRate = f * rpm; // mm/min

    switch (op.type) {
      case "face":
        // Face from OD to center: distance = D/2
        return ((D / 2) / feedRate) * 60 + 1.0; // +1s tool change
      case "drill":
      case "bore":
        return (op.depth_mm / feedRate) * 60 + 1.5;
      case "tap":
        return (op.depth_mm / feedRate) * 60 * 2 + 2.0; // 2x for in+out
      case "chamfer":
        return 2.0; // quick operation
      case "turn_od":
      case "turn_id":
        return (op.depth_mm / feedRate) * 60 + 1.0;
      default:
        return 3.0;
    }
  }

  /**
   * Generate synchronization code for a specific controller dialect.
   * @param style - Controller sync code style
   * @param afterOp - Operation ID to sync after
   * @param waitCh - Waiting channel number
   * @param signalCh - Signaling channel number
   * @returns Sync code string
   */
  private _generateSyncCode(style: SyncCodeStyle, afterOp: string, waitCh: number, signalCh: number): string {
    const syncId = Math.abs(this._hashCode(afterOp)) % 900 + 100; // 3-digit sync ID
    switch (style) {
      case "fanuc_wait_m":
        return `M${200 + syncId % 100} (WAIT CH${signalCh} after ${afterOp})`;
      case "siemens_waitm":
        return `WAITM(${syncId},${waitCh},${signalCh})`;
      case "mazak_smooth":
        return `!L${waitCh} C${signalCh} ; sync after ${afterOp}`;
      case "index_cline":
        return `GETIME(${syncId}) WTIME(${syncId}) ; sync ${afterOp}`;
      case "citizen_cincom":
        return `$${waitCh} M${200 + syncId % 100} ; wait for $${signalCh}`;
      case "generic":
      default:
        return `SYNC_WAIT(${syncId}) ; CH${waitCh} waits for CH${signalCh} after ${afterOp}`;
    }
  }

  /**
   * Generate complete sync code block for program header.
   * @param style - Controller sync code style
   * @param syncPoints - All sync points
   * @param numChannels - Number of channels
   * @returns Array of code lines
   */
  private _generateSyncCodeBlock(style: SyncCodeStyle, syncPoints: SyncPoint[], numChannels: number): string[] {
    const lines: string[] = [];
    if (syncPoints.length === 0) return lines;

    switch (style) {
      case "fanuc_wait_m":
        lines.push("( MULTI-CHANNEL SYNC CODES )");
        break;
      case "siemens_waitm":
        lines.push("; Multi-channel synchronization");
        lines.push(`CHANDATA(${numChannels})`);
        break;
      case "mazak_smooth":
        lines.push("( Mazak Smooth multi-channel )");
        break;
      case "citizen_cincom":
        lines.push("( Citizen Cincom channel sync )");
        break;
      default:
        lines.push("; Sync codes");
    }

    for (const sp of syncPoints) {
      lines.push(sp.sync_code);
    }

    return lines;
  }

  /**
   * Find operations in a given collision zone for a specific turret.
   * @param channels - All channel definitions
   * @param turret - Turret number to filter
   * @param zStart - Zone start Z position
   * @param zEnd - Zone end Z position
   * @returns Matching operations
   */
  private _getOpsInZone(channels: ChannelDef[], turret: number, zStart: number, zEnd: number): ChannelOp[] {
    const result: ChannelOp[] = [];
    for (const ch of channels) {
      if (ch.turret !== turret) continue;
      for (const op of ch.operations) {
        // Check if operation Z range overlaps with zone
        if (op.z_start_mm !== undefined && op.z_end_mm !== undefined) {
          const opZmin = Math.min(op.z_start_mm, op.z_end_mm);
          const opZmax = Math.max(op.z_start_mm, op.z_end_mm);
          if (opZmin < zEnd && opZmax > zStart) {
            result.push(op);
          }
        } else {
          // No Z info — conservatively include
          result.push(op);
        }
      }
    }
    return result;
  }

  /**
   * Count maximum simultaneous cutting operations across all channels.
   * @param timelines - Channel timelines
   * @param scheduled - Scheduled operation map
   * @returns Maximum concurrent cuts at any point in time
   */
  private _countMaxSimultaneousCuts(
    timelines: ChannelTimeline[],
    scheduled: Map<string, { start: number; end: number; channel_id: number }>
  ): number {
    // Collect all start/end events
    const events: { time: number; delta: number }[] = [];
    for (const [, sched] of scheduled) {
      events.push({ time: sched.start, delta: 1 });
      events.push({ time: sched.end, delta: -1 });
    }
    events.sort((a, b) => a.time - b.time || a.delta - b.delta);

    let current = 0;
    let max = 0;
    for (const ev of events) {
      current += ev.delta;
      max = Math.max(max, current);
    }
    return max;
  }

  /**
   * Simple string hash code for generating deterministic sync IDs.
   * @param s - Input string
   * @returns Integer hash
   */
  private _hashCode(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  /**
   * Return empty bar feeder result for error cases.
   */
  private _emptyBarResult(recs: string[], warnings: string[]): BarFeederResult {
    return {
      parts_per_bar: 0,
      total_material_per_part_mm: 0,
      remnant_length_mm: 0,
      remnant_usable: false,
      bar_utilization_pct: 0,
      collet_recommendation: "N/A",
      guide_bushing_bore_mm: 0,
      feed_cycle_time_s: 0,
      total_bar_weight_kg: 0,
      part_weight_kg: 0,
      recommendations: recs,
      warnings,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // PROGRAM ASSEMBLY — Combine turning + live tool + sub-spindle ops
  // ═══════════════════════════════════════════════════════════════════

  assembleProgram(input: ProgramAssemblyInput): ProgramAssemblyResult {
    const lines: string[] = [];
    const warnings: string[] = [];
    const ctrl = input.controller;
    const progNum = input.program_number ?? 1;

    // U-ARCH3: fire per-material resolution with the material name from the program input
    this._fireResolveMaterial(input.material?.name, input.material?.iso_group as ISOGroupMT);

    // U-ARCH3: fire async machine resolution (non-blocking, enriches machine limits)
    if (!this._resolvedMachine) {
      resolveMachine({ brand: input.machine_brand, model: input.machine_model })
        .then(rm => { this._resolvedMachine = rm; })
        .catch(() => {});
    }

    // Pipeline checkpoint manager (0-D-ARCH U-ARCH2)
    const cpm = new PipelineCheckpointManager("millturn-assemble", (input as any).runId);
    cpm.checkpoint("intake", 0, {
      turning_ops: input.turning_ops.length,
      live_tool_ops: input.live_tool_ops.length,
      sub_spindle_ops: input.sub_spindle_ops?.length ?? 0,
    });

    // Program header
    lines.push(`O${String(progNum).padStart(4, "0")} (${input.program_comment || "MILL-TURN PROGRAM"})`);
    lines.push(`(MATERIAL: ${input.material.name} ISO ${input.material.iso_group})`);
    lines.push(`(STOCK: OD${input.stock_od_mm}mm L${input.part_length_mm}mm)`);
    lines.push("");

    // Safety block — controller-specific
    if (ctrl === "fanuc" || ctrl === "mazak") {
      lines.push("G28 U0 W0");
      lines.push("G50 S4000");
    } else if (ctrl === "siemens") {
      lines.push("G28 U0 W0");
      lines.push("LIMS=4000");
    } else {
      lines.push("G28 U0 W0");
    }
    lines.push("G18 G40 G80 G99");
    lines.push("");

    // Turning operations (main spindle)
    let totalCycleMin = 0;

    for (const op of input.turning_ops) {
      const ap = op.depth_of_cut_mm ?? 2.0;
      const Vc = op.cutting_speed_m_min;
      const rpm = Math.round((1000 * Vc) / (Math.PI * input.stock_od_mm));
      const feedMmMin = round4(op.feed_mm_rev * rpm);

      lines.push(`(--- ${op.type.toUpperCase()} ---)`);
      lines.push(`T${String(op.tool_number).padStart(2, "0")}${String(op.offset_number).padStart(2, "0")}${op.tool_label ? " (" + op.tool_label + ")" : ""}`);
      if (op.css) {
        lines.push(`G96 S${Math.round(Vc)} M03`);
        lines.push(`G50 S${op.max_rpm ?? Math.round(rpm * 1.3)}`);
      } else {
        lines.push(`G97 S${rpm} M03`);
      }
      lines.push(op.coolant === "off" ? "M09" : "M08");

      // Moves based on operation type
      lines.push(`G00 X${round4(op.start_x_mm)} Z${round4(op.start_z_mm)}`);
      lines.push(`G01 X${round4(op.end_x_mm)} Z${round4(op.end_z_mm)} F${round4(op.feed_mm_rev)}`);
      lines.push(`G00 X${round4(input.stock_od_mm + 5)} Z5.0`);

      // Cycle time estimate
      const cutLength = Math.abs(op.end_z_mm - op.start_z_mm);
      const radialTravel = Math.abs(op.end_x_mm - op.start_x_mm) / 2;
      const passes = ap > 0 ? Math.ceil(radialTravel / ap) : 1;
      if (feedMmMin > 0) totalCycleMin += (cutLength * passes) / feedMmMin;

      lines.push("");
    }

    // Live tooling operations (C-axis / Y-axis)
    for (const ltop of input.live_tool_ops) {
      lines.push(`(--- LIVE TOOL: ${ltop.type.toUpperCase()} ---)`);
      lines.push(`T${String(ltop.tool_number).padStart(2, "0")}${String(ltop.offset_number).padStart(2, "0")}${ltop.tool_label ? " (" + ltop.tool_label + ")" : ""}`);
      lines.push("M05"); // Stop main spindle
      lines.push("M19"); // Orient spindle
      lines.push(`G97 S${ltop.spindle_rpm} M03`);

      if (ltop.type === "cross_drill") {
        const cPos = ltop.c_positions_deg ?? [0];
        for (const c of cPos) {
          lines.push(`G00 C${round4(c)}`);
          lines.push(`G00 Z${round4(ltop.z_start_mm)}`);
          lines.push(`G83 Z${round4(ltop.z_start_mm - ltop.depth_mm)} R${round4(ltop.z_start_mm + 2)} Q${round4(Math.min(ltop.depth_mm / 3, ltop.tool_diameter_mm * 3))} F${round4(ltop.feed_mm_min)}`);
          lines.push("G80");
        }
      } else if (ltop.type === "face_mill" || ltop.type === "keyway_mill") {
        lines.push(`G00 C0.`);
        if (ltop.y_position_mm !== undefined) lines.push(`G00 Y${round4(ltop.y_position_mm)}`);
        lines.push(`G00 Z${round4(ltop.z_start_mm)}`);
        lines.push(`G01 Z${round4(ltop.z_end_mm ?? ltop.z_start_mm - ltop.depth_mm)} F${round4(ltop.feed_mm_min)}`);
      } else {
        lines.push(`G00 Z${round4(ltop.z_start_mm)}`);
        lines.push(`G01 Z${round4(ltop.z_end_mm ?? ltop.z_start_mm - ltop.depth_mm)} F${round4(ltop.feed_mm_min)}`);
      }

      if (ltop.feed_mm_min > 0) totalCycleMin += ltop.depth_mm / ltop.feed_mm_min;
      lines.push("");
    }

    // Sub-spindle operations (if any)
    let syncPoints = 0;
    if (input.sub_spindle_ops && input.sub_spindle_ops.length > 0) {
      lines.push("(--- SUB-SPINDLE OPERATIONS ---)");

      if (input.transfer) {
        lines.push("M05");
        syncPoints++;
        if (ctrl === "mazak") {
          lines.push("G14.1"); // Sub-spindle approach
        }
        lines.push("M68"); // Sub-spindle clamp
        lines.push("M24"); // Main spindle unclamp
        lines.push("(PART TRANSFERRED TO SUB-SPINDLE)");
        lines.push("");
      }

      for (const subOp of input.sub_spindle_ops) {
        const subRpm = Math.round((1000 * subOp.cutting_speed_m_min) / (Math.PI * input.stock_od_mm));
        lines.push(`T${String(subOp.tool_number).padStart(2, "0")}${String(subOp.offset_number).padStart(2, "0")}${subOp.tool_label ? " (" + subOp.tool_label + ")" : ""}`);
        lines.push(`G97 S${subRpm} M04`);
        lines.push(`G00 X${round4(subOp.start_x_mm ?? input.stock_od_mm + 2)} Z${round4(subOp.start_z_mm)}`);
        lines.push(`G01 X${round4(subOp.end_x_mm ?? input.stock_od_mm * 0.8)} Z${round4(subOp.end_z_mm)} F${round4(subOp.feed_mm_rev)}`);
        const subFeedMmMin = subOp.feed_mm_rev * subRpm;
        const subCutLen = Math.abs(subOp.end_z_mm - subOp.start_z_mm);
        if (subFeedMmMin > 0) totalCycleMin += subCutLen / subFeedMmMin;
        syncPoints++;
      }
      lines.push("");
    }

    // Program end
    lines.push("G28 U0 W0");
    lines.push("M05");
    lines.push("M09");
    lines.push("M30");
    lines.push("%");

    cpm.checkpoint("generate_program", 1, { line_count: lines.length, sync_points: syncPoints });

    // Workholding verification for sub-spindle transfer (0-D-ARCH U-ARCH2)
    if (input.sub_spindle_ops && input.sub_spindle_ops.length > 0) {
      try {
        const wve = getWorkholdingVerificationEngine();
        // Estimate max cutting force from sub-spindle ops
        // U-ARCH3: per-material kc1_1/mc from registry when available
        const maxSubFc = Math.max(...input.sub_spindle_ops.map(op => {
          const iso = input.material?.iso_group || "P";
          const kienzle = this._getKienzle(iso as ISOGroupMT);
          const f = op.feed_mm_rev || 0.15;
          const ap = op.depth_of_cut_mm ?? 1.5;
          return kienzle.kc1_1 * ap * Math.pow(f, 1 - kienzle.mc);
        }), 0);
        if (maxSubFc > 0) {
          const whResult = wve.verify(
            { Fc_N: maxSubFc, operation_name: "sub_spindle_max_force" },
            { type: "sub_spindle_collet", clamping_force_N: 15000, clamp_points: 1, clamping_method: "collet" },
          );
          if (whResult.safety_factor < 2.0) {
            warnings.push(`Sub-spindle grip: Fc=${Math.round(maxSubFc)}N, safety factor ${whResult.safety_factor.toFixed(1)} (min 2.0 for transfer)`);
          }
          log.info(`[MillTurnAssemble] Sub-spindle workholding: Fc=${Math.round(maxSubFc)}N, SF=${whResult.safety_factor.toFixed(1)}`);
        }
      } catch { /* non-blocking */ }
    }

    // Validations
    if (input.turning_ops.length === 0 && input.live_tool_ops.length === 0) {
      warnings.push("No operations defined — program contains only header/footer");
    }
    const totalTools = input.turning_ops.length + input.live_tool_ops.length + (input.sub_spindle_ops?.length ?? 0);
    if (totalTools > 12) {
      warnings.push(`${totalTools} tools used — verify turret/magazine capacity`);
    }

    const channels = input.sub_spindle_ops && input.sub_spindle_ops.length > 0 ? 2 : 1;

    // PIPELINE-VAR U-PV03b: Taylor tool life estimation per tool
    // Ref: Taylor (1907): T = (C/Vc)^(1/n), canonical from physics/constants.ts
    const toolLifeEstimates: NonNullable<ProgramAssemblyResult["tool_life_estimates"]> = [];
    try {
      const iso = (input.material?.iso_group || "P") as ISOGroup;
      const taylor = CANONICAL_TAYLOR[iso] || CANONICAL_TAYLOR.P;
      const cycleMin = totalCycleMin > 0 ? totalCycleMin : 1;

      for (const op of input.turning_ops) {
        const life = taylorLife(taylor.C, taylor.n, op.cutting_speed_m_min);
        const partsPerTool = life > 0 ? Math.floor(life / cycleMin) : 0;

        toolLifeEstimates.push({
          tool_number: op.tool_number,
          cutting_speed_m_min: op.cutting_speed_m_min,
          tool_life_min: Math.round(life * 10) / 10,
          parts_per_tool: partsPerTool,
        });

        if (life < cycleMin * 2) {
          warnings.push(
            `T${op.tool_number} (${op.type}): Taylor tool life ${life.toFixed(0)}min — may not complete 2 parts per insert at Vc=${op.cutting_speed_m_min} m/min`
          );
        }
      }
    } catch (e: any) {
      // Tool life estimation is advisory — never block assembly
    }

    cpm.checkpoint("validate_output", 2, { channels, warnings: warnings.length });

    // Machine envelope guard — collect peak RPM, feed, and XYZ across all ops
    let peakRpm = 0;
    let peakFeed = 0;
    let maxX = 0;
    let maxZ = 0;
    for (const op of input.turning_ops) {
      const opRpm = Math.round((1000 * op.cutting_speed_m_min) / (Math.PI * input.stock_od_mm));
      peakRpm = Math.max(peakRpm, opRpm);
      peakFeed = Math.max(peakFeed, op.feed_mm_rev * opRpm);
      maxX = Math.max(maxX, Math.abs(op.end_x_mm));
      maxZ = Math.max(maxZ, Math.abs(op.end_z_mm));
    }
    for (const lt of input.live_tool_ops) {
      peakRpm = Math.max(peakRpm, lt.spindle_rpm);
      peakFeed = Math.max(peakFeed, lt.feed_mm_min);
    }
    if (input.sub_spindle_ops) {
      for (const sub of input.sub_spindle_ops) {
        const subRpm = Math.round((1000 * sub.cutting_speed_m_min) / (Math.PI * input.stock_od_mm));
        peakRpm = Math.max(peakRpm, subRpm);
        peakFeed = Math.max(peakFeed, sub.feed_mm_rev * subRpm);
        maxZ = Math.max(maxZ, Math.abs(sub.end_z_mm));
      }
    }
    warnings.push(...this._checkEnvelope({
      spindle_rpm: peakRpm,
      feed_mm_min: peakFeed,
      x_mm: maxX,
      z_mm: maxZ,
    }));

    return {
      program_text: lines.join("\n"),
      channels,
      sync_points: syncPoints,
      cycle_time_est_min: round4(totalCycleMin),
      line_count: lines.length,
      warnings,
      tool_life_estimates: toolLifeEstimates.length > 0 ? toolLifeEstimates : undefined,
    };
  }
}

/** Round to 4 decimal places. */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Singleton instance. */
export const millTurnSwissPipelineEngine = new MillTurnSwissPipelineEngine();
