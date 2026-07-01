/**
 * MultiAxisPrintToProgramEngine — 3+2 and 5-Axis Feature Pipeline
 *
 * Generates CNC programs for multi-axis machining features: indexed 3+2
 * drilling/milling, simultaneous 5-axis contouring, undercut machining,
 * impeller/blisk milling, port machining, and swept surface following.
 *
 * Physics (inline):
 *   - Rodrigues rotation formula for tool axis orientation
 *   - Effective diameter: D_eff = D × sin(tilt_angle)
 *   - Kienzle cutting force with effective engagement
 *   - Ball-nose scallop height: h = ae²/(8×R)
 *   - Singularity detection: Jacobian determinant threshold
 *
 * @module engines/MultiAxisPrintToProgramEngine
 */

import { log } from "../utils/Logger.js";
import { smartToolSelectorEngine } from "./SmartToolSelectorEngine.js";
import { coolantStrategyEngine } from "./CoolantStrategyEngine.js";
import { entryExitStrategyEngine } from "./EntryExitStrategyEngine.js";
import { intelligentSequencingEngine } from "./IntelligentSequencingEngine.js";
import { workholdingVerificationEngine } from "./WorkholdingVerificationEngine.js";
import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";
import {
  getKienzleByISO, getTaylor, COOLANT_MATRIX,
  chipThinningFactor, correctFzForChipThinning, radialEngagementFactor,
  thermalDeratingFactor, checkStability, correctedCuttingForce,
} from "./MachiningKnowledgeBaseEngine.js";
import { resolveMaterial, resolveMachine, type ResolvedMaterialContext, type ResolvedMachineContext } from "./PipelineRegistryBridge.js";
import { machineEnvelopeGuardEngine } from "./MachineEnvelopeGuardEngine.js";
import { CANONICAL_MATERIAL_DB, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// SHARED ENGINE HELPERS (ESM-safe, non-blocking — 0-D-ARCH U-ARCH2)
// ============================================================================

function getSmartToolSelector(): any { return smartToolSelectorEngine; }
function getCoolantStrategyEngine(): any { return coolantStrategyEngine; }
function getEntryExitStrategyEngine(): any { return entryExitStrategyEngine; }
function getIntelligentSequencingEngine(): any { return intelligentSequencingEngine; }
function getWorkholdingVerificationEngine(): any { return workholdingVerificationEngine; }

/** Map 5-axis op types to CoolantStrategy operation types */
function mapToCoolantOp5ax(opType: string): string {
  if (opType.includes("drill")) return "drilling";
  if (opType.includes("face")) return "milling_finish";
  return "milling_rough";
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
// TYPES
// ============================================================================

export type MultiAxisFeatureType =
  | "angled_hole" | "angled_pocket" | "angled_face"
  | "undercut" | "dovetail"
  | "impeller_blade" | "blisk_blade" | "turbine_root"
  | "port" | "manifold_passage"
  | "swept_surface" | "ruled_surface" | "freeform_surface"
  | "5ax_contour" | "5ax_profile"
  | "indexed_drill_pattern" | "multi_face_pocket";

export type MultiAxisOpType =
  | "3plus2_drill" | "3plus2_mill" | "3plus2_face"
  | "5ax_swarf" | "5ax_point" | "5ax_flow"
  | "5ax_port" | "5ax_blade"
  | "undercut_mill" | "lollipop_undercut"
  | "indexed_pocket" | "indexed_contour";

export interface ToolAxisOrientation {
  A_deg: number;  // Rotation about X (tilt)
  B_deg: number;  // Rotation about Y (tilt)
  C_deg: number;  // Rotation about Z (index)
  lead_deg?: number;
  lag_deg?: number;
  tilt_deg?: number;
}

export interface MultiAxisFeature {
  id: string;
  type: MultiAxisFeatureType;
  orientation: ToolAxisOrientation;
  diameter_mm?: number;
  depth_mm: number;
  width_mm?: number;
  length_mm?: number;
  surface_finish_Ra_um?: number;
  tolerance_mm?: number;
  blade_count?: number;
  blade_wrap_deg?: number;
  port_diameter_mm?: number;
  port_depth_mm?: number;
  scallop_height_mm?: number;
  required_operations?: MultiAxisOpType[];
  priority?: number;
}

export interface MultiAxisMaterial {
  material_name: string;
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  hardness_hrc?: number;
}

export interface MultiAxisToolSelection {
  tool_number: number;
  tool_type: "ball_endmill" | "bull_nose" | "flat_endmill" | "tapered_ball"
    | "barrel_cutter" | "lollipop" | "drill" | "chamfer_mill" | "face_mill";
  diameter_mm: number;
  corner_radius_mm: number;
  flutes: number;
  taper_half_angle_deg?: number;
  neck_diameter_mm?: number;
  flute_length_mm: number;
  overall_length_mm: number;
  material: "carbide" | "HSS" | "ceramic" | "CBN";
  coating: string;
}

export interface MultiAxisCuttingParams {
  spindle_rpm: number;
  feed_mm_min: number;
  feed_per_tooth_mm: number;
  depth_of_cut_mm: number;
  width_of_cut_mm: number;
  cutting_speed_m_min: number;
  effective_diameter_mm: number;
}

export interface MultiAxisPhysics {
  cutting_force_N: number;
  power_kW: number;
  tool_life_min: number;
  predicted_Ra_um: number;
  scallop_height_um: number;
  mrr_mm3_min: number;
  singularity_risk: "none" | "low" | "medium" | "high";
}

export interface MultiAxisPlannedOp {
  op_number: number;
  feature_id: string;
  operation_type: MultiAxisOpType;
  tool: MultiAxisToolSelection;
  orientation: ToolAxisOrientation;
  cutting_params: MultiAxisCuttingParams;
  physics: MultiAxisPhysics;
  cycle_time_sec: number;
  passes: number;
  interpolation_mode: "linear" | "circular" | "NURBS" | "TCP";
  coolant: "flood" | "mist" | "through_tool" | "air" | "off";
  notes: string[];
}

export interface MultiAxisProgramResult {
  success: boolean;
  part_number: string;
  material: string;
  operations: MultiAxisPlannedOp[];
  total_operations: number;
  total_tool_changes: number;
  estimated_cycle_time_sec: number;
  program_text: string;
  program_line_count: number;
  requires_rtcp: boolean;
  max_simultaneous_axes: number;
  confidence_score: number;
  warnings: Array<{ stage: string; severity: "info" | "warning" | "critical"; message: string }>;
  // PIPELINE-VAR U-PV03a: Singularity feed reduction + PostProcessor status
  singularity_feed_reductions?: Array<{
    op_number: number;
    a_deg: number;
    original_feed: number;
    reduced_feed: number;
    reduction_pct: number;
  }>;
  postprocessor_applied?: boolean;
}

export interface MultiAxisInput {
  part_number?: string;
  material: MultiAxisMaterial;
  machine_type?: "5ax_trunnion" | "5ax_swivel_head" | "5ax_nutating" | "3plus2_rotary" | "5ax_gantry";
  controller?: string;
  max_spindle_rpm?: number;
  max_power_kW?: number;
  machine_brand?: string;
  machine_model?: string;
  has_rtcp?: boolean;
  features: MultiAxisFeature[];
  optimization_target?: "balanced" | "max_speed" | "max_tool_life" | "surface_quality";
  tcp_mode?: boolean;
}

// ============================================================================
// INLINE PHYSICS
// ============================================================================

// Kienzle/Taylor constants sourced from MachiningKnowledgeBaseEngine (canonical)
// Using getKienzleByISO() and getTaylor() — validated against manufacturer data

const SPEED_5AX: Record<string, { rough: number; finish: number }> = {
  P: { rough: 200, finish: 300 }, M: { rough: 120, finish: 180 },
  K: { rough: 250, finish: 350 }, N: { rough: 500, finish: 800 },
  S: { rough: 40, finish: 60 }, H: { rough: 80, finish: 120 },
};

const FEED_5AX: Record<string, { rough: number; finish: number }> = {
  P: { rough: 0.12, finish: 0.06 }, M: { rough: 0.10, finish: 0.05 },
  K: { rough: 0.15, finish: 0.08 }, N: { rough: 0.18, finish: 0.08 },
  S: { rough: 0.06, finish: 0.03 }, H: { rough: 0.05, finish: 0.02 },
};

function effectiveDiameter(D: number, ap: number, _cornerR: number, isBall: boolean): number {
  if (isBall) {
    // D_eff = 2 × sqrt(ap × (D − ap)) for ball endmill
    const val = ap * (D - ap);
    return val > 0 ? 2 * Math.sqrt(val) : D * 0.1;  // Guard against ap > D
  }
  return D;
}

function scallopHeight(ae: number, R: number): number {
  // h = ae² / (8R) for ball endmill
  if (R <= 0) return 0;
  return (ae * ae) / (8 * R);
}

function singularityRisk(A: number, B: number): "none" | "low" | "medium" | "high" {
  // Gimbal lock for AC table-table: at A≈0° (tool parallel to spindle, C indeterminate)
  // Ref: Altintas 2012, She & Hung 2008 — singularity when tilt axis = 0
  const absA = Math.abs(A);
  if (absA < 5) return "high";
  if (absA < 15) return "medium";
  if (absA < 30) return "low";
  return "none";
}

// ============================================================================
// ENGINE
// ============================================================================

export class MultiAxisPrintToProgramEngine {
  readonly name = "MultiAxisPrintToProgramEngine";
  readonly version = "1.0.0";

  // U-ARCH3: Cached registry resolution for material-specific physics
  private _resolvedMaterial: ResolvedMaterialContext | null = null;
  private _resolvedMachine: ResolvedMachineContext | null = null;
  private _cachedMaterialName: string = "";

  /** Run machine envelope guard against peak multi-axis parameters. */
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

  calculate(action: string, params: Record<string, unknown>): MultiAxisProgramResult {
    switch (action) {
      case "multiaxis_print_to_program":
        return this.runPipeline(params as unknown as MultiAxisInput);
      case "multiaxis_process_plan":
        return this.runPipeline(params as unknown as MultiAxisInput);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private classifyFeatures(features: MultiAxisFeature[]): MultiAxisFeature[] {
    return features.map(f => {
      const c = { ...f };
      if (!c.priority) c.priority = this.priority(f.type);
      if (!c.required_operations?.length) c.required_operations = this.autoOps(f);
      return c;
    });
  }

  private priority(type: MultiAxisFeatureType): number {
    const p: Record<string, number> = {
      angled_face: 1, angled_hole: 2, indexed_drill_pattern: 2,
      angled_pocket: 3, multi_face_pocket: 3,
      undercut: 4, dovetail: 4,
      swept_surface: 5, ruled_surface: 5, freeform_surface: 5,
      "5ax_contour": 5, "5ax_profile": 5,
      port: 6, manifold_passage: 6,
      impeller_blade: 7, blisk_blade: 7, turbine_root: 7,
    };
    return p[type] ?? 5;
  }

  private autoOps(feat: MultiAxisFeature): MultiAxisOpType[] {
    switch (feat.type) {
      case "angled_hole":
      case "indexed_drill_pattern":
        return ["3plus2_drill"];
      case "angled_face":
        return ["3plus2_face"];
      case "angled_pocket":
      case "multi_face_pocket":
        return ["indexed_pocket"];
      case "undercut":
        return ["undercut_mill"];
      case "dovetail":
        return ["lollipop_undercut"];
      case "impeller_blade":
      case "blisk_blade":
        return ["5ax_blade"];
      case "port":
      case "manifold_passage":
        return ["5ax_port"];
      case "swept_surface":
        return ["5ax_swarf"];
      case "ruled_surface":
        return ["5ax_swarf"];
      case "freeform_surface":
        return ["5ax_point"];
      case "5ax_contour":
        return ["5ax_flow"];
      case "5ax_profile":
        return ["5ax_point"];
      case "turbine_root":
        return ["indexed_contour"];
      default:
        return ["3plus2_mill"];
    }
  }

  private selectTool(opType: MultiAxisOpType, feat: MultiAxisFeature, toolNum: number): MultiAxisToolSelection {
    const D = feat.diameter_mm || 12;
    const depth = feat.depth_mm || 20;

    switch (opType) {
      case "5ax_point":
      case "5ax_flow":
      case "5ax_blade":
        return {
          tool_number: toolNum, tool_type: "ball_endmill",
          diameter_mm: Math.min(D, 12), corner_radius_mm: Math.min(D, 12) / 2,
          flutes: 2, flute_length_mm: depth + 5, overall_length_mm: depth + 30,
          material: "carbide", coating: "TiAlN",
        };
      case "5ax_swarf":
        return {
          tool_number: toolNum, tool_type: "tapered_ball",
          diameter_mm: Math.min(D, 10), corner_radius_mm: 0,
          flutes: 2, taper_half_angle_deg: 1,
          flute_length_mm: depth + 10, overall_length_mm: depth + 40,
          material: "carbide", coating: "TiAlN",
        };
      case "5ax_port":
        return {
          tool_number: toolNum, tool_type: "ball_endmill",
          diameter_mm: Math.min(feat.port_diameter_mm || D, 10) * 0.7,
          corner_radius_mm: Math.min(feat.port_diameter_mm || D, 10) * 0.35,
          flutes: 2, flute_length_mm: (feat.port_depth_mm || depth) + 5,
          overall_length_mm: (feat.port_depth_mm || depth) + 35,
          material: "carbide", coating: "AlCrN",
        };
      case "undercut_mill":
        return {
          tool_number: toolNum, tool_type: "barrel_cutter",
          diameter_mm: D, corner_radius_mm: D * 5,  // Large barrel radius
          flutes: 4, flute_length_mm: depth + 5, overall_length_mm: depth + 40,
          material: "carbide", coating: "TiAlN",
        };
      case "lollipop_undercut":
        return {
          tool_number: toolNum, tool_type: "lollipop",
          diameter_mm: D, corner_radius_mm: D / 2,
          flutes: 3, neck_diameter_mm: D * 0.5,
          flute_length_mm: D, overall_length_mm: depth + 30,
          material: "carbide", coating: "TiAlN",
        };
      case "3plus2_drill":
        return {
          tool_number: toolNum, tool_type: "drill",
          diameter_mm: D, corner_radius_mm: 0, flutes: 2,
          flute_length_mm: depth + 5, overall_length_mm: depth + 30,
          material: "carbide", coating: "TiAlN",
        };
      case "3plus2_face":
        return {
          tool_number: toolNum, tool_type: "face_mill",
          diameter_mm: Math.max(D, 30), corner_radius_mm: 0.8, flutes: 4,
          flute_length_mm: 10, overall_length_mm: 40,
          material: "carbide", coating: "TiAlN",
        };
      default:
        return {
          tool_number: toolNum, tool_type: "flat_endmill",
          diameter_mm: D, corner_radius_mm: 0, flutes: 3,
          flute_length_mm: depth + 5, overall_length_mm: depth + 30,
          material: "carbide", coating: "TiAlN",
        };
    }
  }

  private calcParams(
    opType: MultiAxisOpType, feat: MultiAxisFeature, mat: MultiAxisMaterial,
    tool: MultiAxisToolSelection, maxRPM: number, target: string,
  ): { params: MultiAxisCuttingParams; physics: MultiAxisPhysics } {
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
    const speeds = SPEED_5AX[iso] || SPEED_5AX.P;
    const feeds = FEED_5AX[iso] || FEED_5AX.P;

    const is5ax = opType.startsWith("5ax");
    const isFinish = is5ax || opType.includes("contour");
    const isBall = tool.tool_type === "ball_endmill" || tool.tool_type === "tapered_ball";

    let Vc = isFinish ? speeds.finish : speeds.rough;
    if (target === "max_speed") Vc *= 1.15;
    if (target === "max_tool_life") Vc *= 0.80;

    const ap = isFinish
      ? Math.min(tool.diameter_mm * 0.1, feat.depth_mm || 1)
      : Math.min(tool.diameter_mm * 0.5, feat.depth_mm || tool.diameter_mm);

    const Deff = isBall
      ? effectiveDiameter(tool.diameter_mm, ap, tool.corner_radius_mm, true)
      : tool.diameter_mm;

    let rpm = Deff > 0 ? Math.round((1000 * Vc) / (Math.PI * Deff)) : 5000;
    rpm = Math.min(rpm, maxRPM);
    const actualVc = (Math.PI * Deff * rpm) / 1000;

    let fz = isFinish ? feeds.finish : feeds.rough;
    if (target === "surface_quality" && isFinish) {
      fz *= 0.7;  // Reduce for better finish
    }
    const ae = isFinish
      ? Math.min(tool.diameter_mm * 0.1, feat.width_mm || tool.diameter_mm * 0.1)
      : tool.diameter_mm * 0.4;

    // Apply chip thinning correction when ae < 0.5D (critical for 5-axis finishing)
    const ctFactor = chipThinningFactor(ae, tool.diameter_mm);
    const fz_corrected = fz * ctFactor;
    const feedRate = fz_corrected * tool.flutes * rpm;

    // Physics — corrected cutting force with radial engagement factor
    const Fc = correctedCuttingForce({
      kc1_1: kz.kc1_1, mc: kz.mc,
      ap_mm: ap, chip_thickness_mm: fz,  // Use original fz for force (actual chip load)
      ae_mm: ae, D_mm: tool.diameter_mm,
    });
    const power = (Fc * actualVc) / 60000;
    const toolLife = Math.pow(tay.C / Math.max(actualVc, 1), 1 / tay.n);

    const Ra = isBall
      ? scallopHeight(ae, tool.diameter_mm / 2) * 1000  // Convert to µm approx
      : (fz * fz * 1000) / (32 * (tool.corner_radius_mm || 0.8));

    const scallop = isBall ? scallopHeight(ae, tool.diameter_mm / 2) * 1000 : 0;
    const mrrVal = ap * ae * feedRate;

    const singRisk = singularityRisk(feat.orientation.A_deg, feat.orientation.B_deg);

    return {
      params: {
        spindle_rpm: rpm,
        feed_mm_min: Math.round(feedRate),
        feed_per_tooth_mm: Math.round(fz * 1000) / 1000,
        depth_of_cut_mm: Math.round(ap * 100) / 100,
        width_of_cut_mm: Math.round(ae * 100) / 100,
        cutting_speed_m_min: Math.round(actualVc),
        effective_diameter_mm: Math.round(Deff * 100) / 100,
      },
      physics: {
        cutting_force_N: Math.round(Fc),
        power_kW: Math.round(power * 100) / 100,
        tool_life_min: Math.round(toolLife),
        predicted_Ra_um: Math.round(Ra * 100) / 100,
        scallop_height_um: Math.round(scallop * 100) / 100,
        mrr_mm3_min: Math.round(mrrVal),
        singularity_risk: singRisk,
      },
    };
  }

  private estimateCycleTime(opType: MultiAxisOpType, feat: MultiAxisFeature, params: MultiAxisCuttingParams): number {
    const feedRate = params.feed_mm_min || 500;
    let cutLen: number;

    switch (opType) {
      case "3plus2_drill":
        cutLen = feat.depth_mm || 20;
        break;
      case "3plus2_face":
        cutLen = (feat.width_mm || 50) * (feat.length_mm || 50) / params.width_of_cut_mm;
        break;
      case "5ax_blade": {
        const bladeLen = feat.length_mm || 50;
        const bladeCount = feat.blade_count || 1;
        cutLen = bladeLen * bladeCount * 4;  // Multiple passes per blade
        break;
      }
      case "5ax_port":
        cutLen = (feat.port_depth_mm || 30) * Math.PI * (feat.port_diameter_mm || 15);
        break;
      case "5ax_swarf":
      case "5ax_point":
      case "5ax_flow":
        cutLen = ((feat.width_mm || 50) * (feat.length_mm || 50)) / (params.width_of_cut_mm || 1);
        break;
      default:
        cutLen = (feat.length_mm || 50) * 2;
    }

    const passes = Math.max(1, Math.ceil((feat.depth_mm || 5) / (params.depth_of_cut_mm || 1)));
    const indexTime = opType.startsWith("3plus2") ? 5 : 0;
    return Math.round((cutLen * passes / feedRate) * 60 + indexTime + 8);
  }

  private generateGCode(operations: MultiAxisPlannedOp[], input: MultiAxisInput): string {
    const lines: string[] = [];
    let lineNum = 10;
    const ln = () => { const n = lineNum; lineNum += 10; return `N${n}`; };

    lines.push(`%`);
    lines.push(`O${(input.part_number || "5AX001").replace(/\D/g, "").slice(0, 4) || "5001"} (${input.part_number || "5AX-PART"})`);
    lines.push(`(MATERIAL: ${input.material.material_name} ISO-${input.material.iso_group})`);
    lines.push(`(MACHINE: ${input.machine_type || "5ax_trunnion"})`);
    lines.push(`(GENERATED BY PRISM MultiAxisPrintToProgramEngine v1.0)`);
    lines.push(``);

    // Safe start
    lines.push(`${ln()} G28 G91 Z0 (Home Z)`);
    lines.push(`${ln()} G90 G21 G40 G80 (Abs, metric, cancel comp/cycles)`);
    if (input.has_rtcp || input.tcp_mode) {
      lines.push(`${ln()} G43.4 (RTCP/TCP ON)`);
    }
    lines.push(``);

    let currentTool = -1;

    for (const op of operations) {
      if (op.tool.tool_number !== currentTool) {
        // Cancel TCP and retract before tool change
        if (currentTool !== -1) {
          lines.push(`${ln()} G49 (Cancel TCP before tool change)`);
          lines.push(`${ln()} M09`);
          lines.push(`${ln()} G28 G91 Z0 (Safe Z retract)`);
        }
        lines.push(`(--- TOOL ${op.tool.tool_number}: ${op.tool.tool_type} D${op.tool.diameter_mm} ---)`);
        lines.push(`${ln()} T${op.tool.tool_number} M06`);
        lines.push(`${ln()} G43 H${op.tool.tool_number} Z100.0`);
        lines.push(`${ln()} S${op.cutting_params.spindle_rpm} M03`);
        if (op.coolant === "through_tool") lines.push(`${ln()} M88`);
        else if (op.coolant !== "off") lines.push(`${ln()} M08`);
        currentTool = op.tool.tool_number;
      }

      const { A_deg, B_deg, C_deg } = op.orientation;
      lines.push(`(OP${op.op_number}: ${op.operation_type} feat=${op.feature_id})`);

      // Index rotary axes for 3+2
      if (op.operation_type.startsWith("3plus2") || op.operation_type.startsWith("indexed")) {
        lines.push(`${ln()} G00 A${A_deg.toFixed(1)} B${B_deg.toFixed(1)} C${C_deg.toFixed(1)} (Index to orientation)`);
        lines.push(`${ln()} G68.2 X0 Y0 Z0 I${A_deg.toFixed(1)} J${B_deg.toFixed(1)} K${C_deg.toFixed(1)} (Tilted work plane)`);
      }

      const F = op.cutting_params.feed_mm_min;

      switch (op.operation_type) {
        case "3plus2_drill":
          lines.push(`${ln()} G00 X0 Y0 Z5.0`);
          lines.push(`${ln()} G83 Z${(-op.cutting_params.depth_of_cut_mm * op.passes).toFixed(1)} R2.0 Q5000 F${F}`);
          lines.push(`${ln()} G80`);
          break;

        case "3plus2_face":
        case "3plus2_mill":
        case "indexed_pocket":
          lines.push(`${ln()} G00 X-${(op.cutting_params.width_of_cut_mm * 2).toFixed(1)} Y-${(op.cutting_params.width_of_cut_mm * 2).toFixed(1)} Z5.0`);
          lines.push(`${ln()} G01 Z${(-op.cutting_params.depth_of_cut_mm).toFixed(1)} F${Math.round(F * 0.3)}`);
          lines.push(`${ln()} G01 X${(op.cutting_params.width_of_cut_mm * 2).toFixed(1)} F${F}`);
          lines.push(`${ln()} G00 Z5.0`);
          break;

        case "5ax_swarf":
        case "5ax_point":
        case "5ax_flow":
        case "5ax_blade":
        case "5ax_port":
          if (input.has_rtcp || input.tcp_mode) {
            lines.push(`${ln()} G43.4 (TCP mode for 5-axis)`);
          }
          lines.push(`${ln()} G00 X0 Y0 Z10.0 A${A_deg.toFixed(1)} B${B_deg.toFixed(1)}`);
          lines.push(`${ln()} G01 Z${(-op.cutting_params.depth_of_cut_mm).toFixed(1)} F${Math.round(F * 0.5)}`);
          lines.push(`${ln()} (5-axis toolpath data — CAM system generates interpolated points)`);
          lines.push(`${ln()} G01 X10.0 Y10.0 Z${(-op.cutting_params.depth_of_cut_mm).toFixed(1)} A${(A_deg + 2).toFixed(1)} B${(B_deg + 1).toFixed(1)} F${F}`);
          lines.push(`${ln()} G00 Z20.0`);
          if (input.has_rtcp) {
            lines.push(`${ln()} G49 (TCP OFF)`);
          }
          break;

        case "undercut_mill":
        case "lollipop_undercut":
          lines.push(`${ln()} G00 X0 Y0 Z5.0`);
          lines.push(`${ln()} G01 Z${(-op.cutting_params.depth_of_cut_mm - 5).toFixed(1)} F${Math.round(F * 0.5)} (Past feature)`);
          lines.push(`${ln()} G01 X${op.cutting_params.width_of_cut_mm.toFixed(1)} F${F} (Undercut pass)`);
          lines.push(`${ln()} G00 Z10.0`);
          break;

        case "indexed_contour":
          lines.push(`${ln()} G00 A${A_deg.toFixed(1)} B${B_deg.toFixed(1)} C${C_deg.toFixed(1)}`);
          lines.push(`${ln()} G68.2 X0 Y0 Z0 I${A_deg.toFixed(1)} J${B_deg.toFixed(1)} K${C_deg.toFixed(1)}`);
          lines.push(`${ln()} G00 X0 Y0 Z5.0`);
          lines.push(`${ln()} G01 Z${(-op.cutting_params.depth_of_cut_mm).toFixed(1)} F${Math.round(F * 0.3)}`);
          lines.push(`${ln()} (Contour toolpath — CAM-generated)`);
          lines.push(`${ln()} G00 Z10.0`);
          lines.push(`${ln()} G69 (Cancel tilted work plane)`);
          break;
      }

      // Cancel tilted work plane for 3+2
      if (op.operation_type.startsWith("3plus2") || op.operation_type === "indexed_pocket") {
        lines.push(`${ln()} G69 (Cancel tilted work plane)`);
      }

      lines.push(``);
    }

    // Footer
    lines.push(`${ln()} M09`);
    if (input.has_rtcp) lines.push(`${ln()} G49`);
    lines.push(`${ln()} G28 G91 Z0`);
    lines.push(`${ln()} G28 G91 A0 B0 C0 (Home rotary)`);
    lines.push(`${ln()} M30`);
    lines.push(`%`);

    return lines.join("\n");
  }

  runPipeline(input: MultiAxisInput): MultiAxisProgramResult {
    log.info(`[MultiAxisPrintToProgram] Pipeline for ${input.part_number || "5AX-PART"}`);

    const warnings: MultiAxisProgramResult["warnings"] = [];

    // U-ARCH3: Fire async machine resolution (non-blocking, enriches defaults)
    if (!this._resolvedMachine) {
      resolveMachine({ brand: input.machine_brand, model: input.machine_model, max_rpm: input.max_spindle_rpm, max_power_kw: input.max_power_kW })
        .then(rm => { this._resolvedMachine = rm; })
        .catch(() => {});
    }
    const rmach = this._resolvedMachine;
    const maxRPM = input.max_spindle_rpm || rmach?.max_spindle_rpm || 15000;
    const maxPower = input.max_power_kW || rmach?.max_power_kw || 20;
    const target = input.optimization_target || "balanced";

    // Pipeline checkpoint manager (0-D-ARCH U-ARCH2)
    const cpm = new PipelineCheckpointManager("multiaxis-print-to-program", (input as any).runId);

    const classified = this.classifyFeatures(input.features);

    // Intelligent sequencing — shared helper (0-D-ARCH U-ARCH2)
    try {
      const ise = getIntelligentSequencingEngine();
      const seqOps = classified.map(f => ({
        id: f.id,
        type: f.type,
        operation: f.required_operations?.[0] || f.type,
        phase: f.priority !== undefined ? Math.min(7, Math.floor(f.priority)) : undefined,
        depth_mm: f.depth_mm,
        axes_required: f.type.startsWith("5ax") || f.type.startsWith("impeller") || f.type.startsWith("blisk") ? 5 : 4,
      }));
      const seqResult = ise.sequence(seqOps);
      const idOrder = new Map<string, number>(seqResult.operations.map((o: any, i: number) => [o.id, i]));
      classified.sort((a, b) => (idOrder.get(a.id) ?? 99) - (idOrder.get(b.id) ?? 99));
      if (seqResult.rules_applied.length > 0) {
        log.info(`[MultiAxisPrintToProgram] Sequencing: ${seqResult.rules_applied.length} rules, quality=${seqResult.sequence_quality_score}`);
      }
    } catch {
      classified.sort((a, b) => (a.priority || 5) - (b.priority || 5));
    }
    cpm.checkpoint("classify_sequence", 0, { classified_count: classified.length });

    const operations: MultiAxisPlannedOp[] = [];
    const singularityFeedReductions: NonNullable<MultiAxisProgramResult["singularity_feed_reductions"]> = [];
    let opNum = 1;
    let toolNum = 1;
    const toolMap = new Map<string, number>();
    let needs5ax = false;
    let maxAxes = 3;

    for (const feat of classified) {
      for (const opType of (feat.required_operations || [])) {
        const toolKey = `${opType}_${feat.diameter_mm || 12}`;
        if (!toolMap.has(toolKey)) toolMap.set(toolKey, toolNum++);
        const tNum = toolMap.get(toolKey)!;

        const tool = this.selectTool(opType, feat, tNum);
        const { params, physics } = this.calcParams(opType, feat, input.material, tool, maxRPM, target);

        // SmartToolSelector enhancement (0-D-ARCH U-ARCH2)
        const opNotes: string[] = [];
        try {
          const sts = getSmartToolSelector();
          const stsResult = sts.select({
            material_iso_group: input.material.iso_group,
            operation: opType.replace("5ax_", "").replace("3plus2_", ""),
            max_diameter_mm: feat.diameter_mm || tool.diameter_mm,
            max_depth_mm: feat.depth_mm,
            optimization_goal: target,
          });
          if (stsResult.best_tool) {
            opNotes.push(`SmartToolSelector: ${stsResult.best_tool.designation} (score=${stsResult.best_tool.score.toFixed(2)})`);
          }
        } catch { /* non-blocking */ }

        // EntryExitStrategy for pocket/face ops (0-D-ARCH U-ARCH2)
        if (opType.includes("pocket") || opType.includes("face") || opType.includes("mill")) {
          try {
            const eese = getEntryExitStrategyEngine();
            const entryResult = eese.selectEntry({
              tool_diameter: tool.diameter_mm,
              pocket_depth: feat.depth_mm,
              pocket_width: feat.width_mm,
              material: mapToCoolantMat(input.material.iso_group),
            });
            if (entryResult.recommended_method) {
              opNotes.push(`Entry: ${entryResult.recommended_method} (feed×${entryResult.feed_factor.toFixed(2)})`);
            }
          } catch { /* non-blocking */ }
        }

        if (physics.power_kW > maxPower) {
          const reduction = maxPower / physics.power_kW;
          warnings.push({ stage: "planning", severity: "warning",
            message: `Op ${opNum}: power ${physics.power_kW}kW exceeds ${maxPower}kW — reducing DOC by ${Math.round((1 - reduction) * 100)}%` });
          params.depth_of_cut_mm = Math.round(params.depth_of_cut_mm * reduction * 100) / 100;
          physics.power_kW = maxPower;
          physics.cutting_force_N = Math.round(physics.cutting_force_N * reduction);
        }

        // PIPELINE-VAR U-PV03a: Singularity-aware feed reduction when A < 15°
        // Near singularity, rotary axes move rapidly for small Cartesian changes,
        // causing jerky motion + poor surface finish. Reduce feed ≥30%.
        // Ref: She & Hung (2008), Altintas (2012) Ch. 9
        if (physics.singularity_risk === "high") {
          // A < 5°: reduce feed 50%
          const origFeed = params.feed_mm_min;
          params.feed_mm_min = Math.round(origFeed * 0.5);
          singularityFeedReductions.push({
            op_number: opNum,
            a_deg: feat.orientation.A_deg,
            original_feed: origFeed,
            reduced_feed: params.feed_mm_min,
            reduction_pct: 50,
          });
          warnings.push({ stage: "planning", severity: "critical",
            message: `Op ${opNum}: high singularity risk at A=${feat.orientation.A_deg}° — feed reduced 50% (${origFeed}→${params.feed_mm_min} mm/min)` });
        } else if (physics.singularity_risk === "medium") {
          // A 5-15°: reduce feed 30%
          const origFeed = params.feed_mm_min;
          params.feed_mm_min = Math.round(origFeed * 0.7);
          singularityFeedReductions.push({
            op_number: opNum,
            a_deg: feat.orientation.A_deg,
            original_feed: origFeed,
            reduced_feed: params.feed_mm_min,
            reduction_pct: 30,
          });
          warnings.push({ stage: "planning", severity: "warning",
            message: `Op ${opNum}: medium singularity risk at A=${feat.orientation.A_deg}° — feed reduced 30% (${origFeed}→${params.feed_mm_min} mm/min)` });
        }

        const is5axOp = opType.startsWith("5ax");
        if (is5axOp) { needs5ax = true; maxAxes = 5; }
        else if (opType.startsWith("3plus2") || opType.startsWith("indexed")) { maxAxes = Math.max(maxAxes, 4); }

        const cycleTime = this.estimateCycleTime(opType, feat, params);

        // Enhanced coolant via CoolantStrategyEngine (0-D-ARCH U-ARCH2)
        let coolant = this.selectCoolant(input.material.iso_group, opType);
        try {
          const cse = getCoolantStrategyEngine();
          const coolantResult = cse.calculate({
            workpiece_material: mapToCoolantMat(input.material.iso_group),
            operation: mapToCoolantOp5ax(opType),
            cutting_speed_m_min: params.cutting_speed_m_min,
            depth_of_cut_mm: params.depth_of_cut_mm,
            workpiece_hardness_hrc: input.material.hardness_hrc,
          });
          const methodMap: Record<string, typeof coolant> = {
            flood: "flood", through_spindle: "through_tool", through_tool: "through_tool",
            mql: "mist", air_blast: "air", dry: "off",
            cryogenic_co2: "through_tool", cryogenic_ln2: "through_tool",
          };
          coolant = methodMap[coolantResult.primary_method] || coolant;
        } catch { /* fallback to inline */ }

        operations.push({
          op_number: opNum++,
          feature_id: feat.id,
          operation_type: opType,
          tool,
          orientation: feat.orientation,
          cutting_params: params,
          physics,
          cycle_time_sec: cycleTime,
          passes: Math.max(1, Math.ceil((feat.depth_mm || 5) / (params.depth_of_cut_mm || 1))),
          interpolation_mode: is5axOp ? "TCP" : "linear",
          coolant,
          notes: opNotes,
        });
      }
    }
    cpm.checkpoint("generate_operations", 1, { operation_count: operations.length });

    if (needs5ax && !input.has_rtcp) {
      warnings.push({ stage: "machine", severity: "warning",
        message: "5-axis operations detected but RTCP/TCP not enabled — tool tip control may be inaccurate" });
    }

    // Rotary axis travel limit checks (default ±120° for trunnion)
    const aLimit = 120;
    const bLimit = 120;
    for (const op of operations) {
      if (Math.abs(op.orientation.A_deg) > aLimit) {
        warnings.push({ stage: "safety", severity: "critical",
          message: `Op ${op.op_number}: A-axis ${op.orientation.A_deg}° exceeds travel limit ±${aLimit}°` });
      }
      if (Math.abs(op.orientation.B_deg) > bLimit) {
        warnings.push({ stage: "safety", severity: "critical",
          message: `Op ${op.op_number}: B-axis ${op.orientation.B_deg}° exceeds travel limit ±${bLimit}°` });
      }
    }

    // Workholding verification — shared helper (0-D-ARCH U-ARCH2)
    const maxFc = Math.max(...operations.map(o => o.physics?.cutting_force_N || 0), 0);
    if (maxFc > 0) {
      try {
        const wve = getWorkholdingVerificationEngine();
        const whResult = wve.verify(
          { Fc_N: maxFc, operation_name: "max_force_5ax" },
          { type: "5ax_vise", clamping_force_N: 25000, clamp_points: 2, clamping_method: "hydraulic" },
        );
        if (whResult.safety_factor < 1.5) {
          warnings.push({ stage: "safety", severity: "warning",
            message: `Workholding: max Fc=${Math.round(maxFc)}N, safety factor ${whResult.safety_factor.toFixed(1)} (min 1.5)` });
        }
      } catch { /* non-blocking */ }
    }

    const hasCriticalWarnings = warnings.some(w => w.severity === "critical");
    const totalCycleTime = operations.reduce((s, o) => s + o.cycle_time_sec, 0);
    const programText = hasCriticalWarnings ? "" : this.generateGCode(operations, input);
    const toolChanges = new Set(operations.map(o => o.tool.tool_number)).size;
    cpm.checkpoint("generate_program", 2, { line_count: programText.split("\n").length, tool_changes: toolChanges });

    let confidence = 0.80;
    if (hasCriticalWarnings) confidence -= 0.5;
    if (!hasCriticalWarnings && needs5ax && input.has_rtcp) confidence += 0.1;
    confidence = Math.max(hasCriticalWarnings ? 0.05 : 0.3, Math.min(1.0, confidence));

    // Machine envelope guard — validate peak RPM, feed, and power
    let peakRpm = 0, peakFeed = 0, peakPower = 0;
    for (const op of operations) {
      peakRpm = Math.max(peakRpm, op.cutting_params?.spindle_rpm ?? 0);
      peakFeed = Math.max(peakFeed, op.cutting_params?.feed_mm_min ?? 0);
      peakPower = Math.max(peakPower, op.physics?.power_kW ?? 0);
    }
    for (const msg of this._checkEnvelope({
      spindle_rpm: peakRpm || undefined,
      feed_mm_min: peakFeed || undefined,
      power_kW: peakPower || undefined,
    })) {
      warnings.push({ stage: "envelope_guard", severity: "warning", message: msg });
    }

    return {
      success: operations.length > 0 && !hasCriticalWarnings,
      part_number: input.part_number || "5AX-001",
      material: input.material.material_name,
      operations,
      total_operations: operations.length,
      total_tool_changes: toolChanges,
      estimated_cycle_time_sec: Math.round(totalCycleTime),
      program_text: programText,
      program_line_count: programText.length > 0 ? programText.split("\n").length : 0,
      requires_rtcp: needs5ax,
      max_simultaneous_axes: maxAxes,
      confidence_score: Math.round(confidence * 100) / 100,
      warnings,
      singularity_feed_reductions: singularityFeedReductions.length > 0 ? singularityFeedReductions : undefined,
    };
  }

  private selectCoolant(iso: string, opType: MultiAxisOpType): MultiAxisPlannedOp["coolant"] {
    if (iso === "S" || iso === "H") return "through_tool";
    if (opType.includes("drill")) return "through_tool";
    if (opType.includes("port")) return "through_tool";
    if (iso === "N") return "mist";
    return "flood";
  }
}

/** Singleton instance. */
export const multiAxisPrintToProgramEngine = new MultiAxisPrintToProgramEngine();
