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
  | "part_off";

export type TurningOpType =
  | "od_rough" | "od_finish" | "od_thread"
  | "id_rough" | "id_finish" | "id_thread"
  | "face_rough" | "face_finish"
  | "groove" | "groove_finish"
  | "drill" | "bore_rough" | "bore_finish"
  | "thread_single_point" | "thread_insert"
  | "part_off" | "center_drill" | "taper";

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
  features: TurningFeature[];
  optimization_target?: "balanced" | "max_speed" | "max_tool_life" | "min_cost" | "surface_quality";
  tailstock?: boolean;
  sub_spindle?: boolean;
}

// ============================================================================
// INLINE PHYSICS
// ============================================================================

interface KienzleTurning { kc1_1: number; mc: number; }

const KIENZLE_TURNING: Record<string, KienzleTurning> = {
  P: { kc1_1: 2000, mc: 0.25 },
  M: { kc1_1: 2400, mc: 0.25 },
  K: { kc1_1: 1200, mc: 0.25 },
  N: { kc1_1: 800, mc: 0.23 },
  S: { kc1_1: 2800, mc: 0.28 },
  H: { kc1_1: 3200, mc: 0.30 },
};

const TAYLOR_TURNING: Record<string, { C: number; n: number }> = {
  P: { C: 300, n: 0.25 },
  M: { C: 180, n: 0.20 },
  K: { C: 350, n: 0.28 },
  N: { C: 700, n: 0.35 },
  S: { C: 130, n: 0.18 },
  H: { C: 100, n: 0.15 },
};

const TURNING_SPEEDS: Record<string, { rough: number; finish: number }> = {
  P: { rough: 220, finish: 320 },
  M: { rough: 130, finish: 200 },
  K: { rough: 260, finish: 380 },
  N: { rough: 600, finish: 900 },
  S: { rough: 35, finish: 55 },
  H: { rough: 70, finish: 110 },
};

const TURNING_FEEDS: Record<string, { rough: number; finish: number }> = {
  P: { rough: 0.30, finish: 0.12 },
  M: { rough: 0.25, finish: 0.10 },
  K: { rough: 0.35, finish: 0.15 },
  N: { rough: 0.40, finish: 0.15 },
  S: { rough: 0.15, finish: 0.06 },
  H: { rough: 0.12, finish: 0.05 },
};

function kienzleForceTurning(kc1_1: number, mc: number, ap: number, f: number): number {
  if (f <= 0 || ap <= 0) return 0;
  return kc1_1 * ap * Math.pow(f, 1 - mc);
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

// ============================================================================
// ENGINE
// ============================================================================

export class TurningPrintToProgramEngine {
  readonly name = "TurningPrintToProgramEngine";
  readonly version = "1.0.0";

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
    const kz = KIENZLE_TURNING[iso] || KIENZLE_TURNING.P;
    const tay = TAYLOR_TURNING[iso] || TAYLOR_TURNING.P;
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

    // Physics
    const Fc = kienzleForceTurning(kz.kc1_1, kz.mc, ap, isThread ? ap * 0.3 : f);
    const power = (Fc * actualVc) / 60000;
    const torque = (Fc * workD / 2) / 1000;
    const toolLife = taylorLifeTurning(tay.C, tay.n, actualVc);
    const Ra = turningRa(isThread ? 0.1 : f, tool.nose_radius_mm || 0.4);
    const mrrVal = ap * f * actualVc * 1000 / Math.PI;

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
        case "face_rough":
        case "face_finish": {
          const startX = input.bar_stock_od_mm / 2 + 2;
          lines.push(`${ln()} G00 X${startX.toFixed(1)} Z1.0`);
          lines.push(`${ln()} G01 Z0.0 F${f}`);
          lines.push(`${ln()} G01 X-1.0 F${f} (Face to center)`);
          lines.push(`${ln()} G00 Z2.0`);
          lines.push(`${ln()} G28 U0 W0`);
          break;
        }
        case "od_rough": {
          const feat = input.features.find(ff => ff.id === op.feature_id);
          const targetOD = feat?.od_mm || (input.finished_od_mm || input.bar_stock_od_mm - 4);
          const startZ = -(feat?.length_mm || input.part_length_mm);
          lines.push(`${ln()} G00 X${(input.bar_stock_od_mm + 2).toFixed(1)} Z2.0`);
          lines.push(`${ln()} G71 U${ap.toFixed(1)} R1.0 (Rough cycle, DOC=${ap}mm)`);
          lines.push(`${ln()} G71 P${lineNum} Q${lineNum + 20} U0.5 W0.1 F${f}`);
          lines.push(`${ln()} G00 X${targetOD.toFixed(1)}`);
          lines.push(`${ln()} G01 Z${startZ.toFixed(1)} F${f}`);
          lineNum += 10;
          lines.push(`${ln()} G00 X${(input.bar_stock_od_mm + 5).toFixed(1)} Z2.0`);
          break;
        }
        case "od_finish": {
          const feat = input.features.find(ff => ff.id === op.feature_id);
          const targetOD = feat?.od_mm || (input.finished_od_mm || input.bar_stock_od_mm - 4);
          const startZ = -(feat?.length_mm || input.part_length_mm);
          lines.push(`${ln()} G00 X${(targetOD + 1).toFixed(1)} Z2.0`);
          lines.push(`${ln()} G70 P${lineNum - 60} Q${lineNum - 30} (Finish cycle)`);
          lines.push(`${ln()} G00 X${(input.bar_stock_od_mm + 5).toFixed(1)} Z2.0`);
          break;
        }
        case "id_rough":
        case "bore_rough": {
          const feat = input.features.find(ff => ff.id === op.feature_id);
          const boreD = feat?.id_mm || 20;
          const depth = feat?.depth_mm || 30;
          lines.push(`${ln()} G00 X${(boreD - 2).toFixed(1)} Z2.0`);
          lines.push(`${ln()} G71 U${ap.toFixed(1)} R1.0`);
          lines.push(`${ln()} G71 P${lineNum} Q${lineNum + 20} U-0.3 W0.1 F${f}`);
          lines.push(`${ln()} G00 X${boreD.toFixed(1)}`);
          lines.push(`${ln()} G01 Z${(-depth).toFixed(1)} F${f}`);
          lineNum += 10;
          lines.push(`${ln()} G00 X${(boreD - 5).toFixed(1)} Z2.0`);
          break;
        }
        case "id_finish":
        case "bore_finish": {
          lines.push(`${ln()} G70 P${lineNum - 60} Q${lineNum - 30} (Bore finish cycle)`);
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
          lines.push(`${ln()} G75 X${grooveD.toFixed(1)} Z${(grooveZ - grooveW).toFixed(1)} P${Math.round(ap * 1000)} Q${Math.round(grooveW * 1000)} F${(f * 0.5).toFixed(3)}`);
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
          lines.push(`${ln()} G00 X${(threadD + 2).toFixed(1)} Z5.0`);
          lines.push(`${ln()} G97 S${Math.round(op.cutting_params.spindle_rpm)} M03`);
          lines.push(`${ln()} G76 P0${Math.round(threadDepth * 100)}060 Q${Math.round(threadDepth * 100 / 8)}0 R0.05`);
          lines.push(`${ln()} G76 X${minorD.toFixed(3)} Z${(-threadLen).toFixed(1)} P${Math.round(threadDepth * 1000)} Q${Math.round(threadDepth * 100)} F${pitch.toFixed(3)} (${starts}-start, pitch ${pitch}mm)`);
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
          lines.push(`${ln()} G00 X${(partOffD + 2).toFixed(1)} Z${partOffZ.toFixed(1)}`);
          lines.push(`${ln()} G01 X-1.0 F${(f * 0.3).toFixed(3)} (Part off)`);
          lines.push(`${ln()} G00 X${(partOffD + 10).toFixed(1)}`);
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
    const maxRPM = input.max_spindle_rpm || 4000;
    const maxPower = input.max_power_kW || 11;
    const target = input.optimization_target || "balanced";

    // Validate
    if (!input.material?.iso_group) {
      warnings.push({ stage: "intake", severity: "warning", message: "No ISO group — defaulting to P (steel)" });
    }
    if (input.bar_stock_od_mm <= 0) {
      warnings.push({ stage: "intake", severity: "critical", message: "Bar stock OD must be positive" });
    }

    // Classify features
    const classified = this.classifyFeatures(input.features);

    // Sort by priority
    classified.sort((a, b) => (a.priority || 5) - (b.priority || 5));

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
          coolant: this.selectCoolant(input.material.iso_group, opType),
          notes: [],
        });
      }
    }

    const totalCycleTime = operations.reduce((s, o) => s + o.cycle_time_sec, 0);
    const programText = this.generateGCode(operations, input);
    const toolChanges = new Set(operations.map(o => o.tool.tool_number)).size;

    // Confidence
    let confidence = 0.85;
    if (warnings.some(w => w.severity === "critical")) confidence -= 0.2;
    if (operations.length > 10) confidence -= 0.05;
    if (input.tailstock) confidence += 0.05;
    confidence = Math.max(0.3, Math.min(1.0, confidence));

    const setupNotes: string[] = [
      `Chuck: ${input.chuck_type || "3-jaw"} chuck`,
      `Stock: ${input.bar_stock_od_mm}mm OD × ${input.part_length_mm}mm`,
      `${toolChanges} tools required`,
      `Estimated cycle time: ${formatTimeTurning(totalCycleTime)}`,
    ];
    if (input.tailstock) setupNotes.push("Tailstock support required");
    if (input.sub_spindle) setupNotes.push("Sub-spindle transfer configured");

    return {
      success: true,
      part_number: input.part_number || "TURN-001",
      material: input.material.material_name,
      bar_stock_od_mm: input.bar_stock_od_mm,
      part_length_mm: input.part_length_mm,
      operations,
      total_operations: operations.length,
      total_tool_changes: toolChanges,
      estimated_cycle_time_sec: Math.round(totalCycleTime),
      program_text: programText,
      program_line_count: programText.split("\n").length,
      setup_notes: setupNotes,
      confidence_score: Math.round(confidence * 100) / 100,
      warnings,
    };
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
