/**
 * ESPRITLatheMillTurnFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM50
 *
 * Catalog: 9 lathe / mill-turn / Swiss operations / 85 parameters / 8 categories.
 *
 * Categories: turn_roughing, turn_finishing, grooving_parting, threading,
 *             drilling_axial, millturn_live, swiss_type, synchronization.
 *
 * Methods:
 *   getIndex(): full catalog
 *   getSummary(): summary stats
 *   listOperations(): light op list
 *   getOperation(operation_id): one op or {error}
 *   getOperationsByCategory(category): filter (case-insensitive)
 *   findParameter(parameter_name, limit): full-text search
 *   recommendByFeature(intent): map intent → operation_id
 *   selectThreadingInfeed(pitch_mm, material_iso): radial / modified / alternating
 *   selectMillturnAxis(machine_has_y, feature_off_axis): polar vs Y vs C-index
 *   estimateChannelSync(channel_count): worst-case stall + barrier vs wait_any policy
 */

import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let _catalog: any | null = null;

function dataPath(): string {
  const candidates = [
    path.resolve(__dirname, "../../data/cam-functions/esprit/lathe-millturn.json"),
    path.resolve(__dirname, "../data/cam-functions/esprit/lathe-millturn.json"),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  throw new Error("ESPRITLatheMillTurnFunctionIndexEngine: lathe-millturn.json not found");
}

function loadCatalog(): any {
  if (_catalog) return _catalog;
  _catalog = JSON.parse(fs.readFileSync(dataPath(), "utf8"));
  return _catalog;
}

export type ESPRITLatheIntent =
  | "turn_od_rough"
  | "turn_od_finish"
  | "groove_or_part"
  | "thread_single_point"
  | "drill_centerline"
  | "millturn_radial_milling"
  | "millturn_y_axis_pocket"
  | "swiss_part_handoff"
  | "channel_sync";

export interface ESPRITLatheRecommendation {
  primary: string;
  reason: string;
  alternatives: string[];
}

export class ESPRITLatheMillTurnFunctionIndexEngine {
  static getIndex(): any {
    return loadCatalog();
  }

  static getSummary(): any {
    const c = loadCatalog();
    let totalParams = 0;
    for (const op of Object.values(c.operations) as any) totalParams += op.parameter_count ?? 0;
    return {
      system_id: c.system_id,
      section_key: c.section_key,
      total_operations: Object.keys(c.operations).length,
      total_parameters: totalParams,
      categories: c.categories,
      training_topics_count: (c.training_topics ?? []).length,
    };
  }

  static listOperations(): Array<{ operation_id: string; category: string; parameter_count: number; display_name: string }> {
    const c = loadCatalog();
    return Object.entries(c.operations).map(([id, op]: [string, any]) => ({
      operation_id: id,
      category: op.category,
      parameter_count: op.parameter_count,
      display_name: op.display_name,
    }));
  }

  static getOperation(operation_id: string): any {
    const c = loadCatalog();
    const op = c.operations[operation_id];
    if (!op) return { error: `Unknown operation_id: ${operation_id}` };
    return { operation_id, ...op };
  }

  static getOperationsByCategory(category: string): Array<{ operation_id: string; parameter_count: number; display_name: string }> {
    const target = String(category).toLowerCase();
    const c = loadCatalog();
    const out: Array<{ operation_id: string; parameter_count: number; display_name: string }> = [];
    for (const [id, op] of Object.entries(c.operations) as any) {
      if ((op.category ?? "").toLowerCase() === target) {
        out.push({ operation_id: id, parameter_count: op.parameter_count, display_name: op.display_name });
      }
    }
    return out;
  }

  static findParameter(
    parameter_name: string,
    limit = 50,
  ): Array<{ operation_id: string; group: string; parameter: string }> {
    const needle = String(parameter_name).toLowerCase();
    const c = loadCatalog();
    const out: Array<{ operation_id: string; group: string; parameter: string }> = [];
    for (const [id, op] of Object.entries(c.operations) as any) {
      for (const [grp, params] of Object.entries(op.parameters || {}) as any) {
        for (const pName of Object.keys(params)) {
          if (pName.toLowerCase().includes(needle)) {
            out.push({ operation_id: id, group: grp, parameter: pName });
            if (out.length >= limit) return out;
          }
        }
      }
    }
    return out;
  }

  static recommendByFeature(intent: ESPRITLatheIntent | string): ESPRITLatheRecommendation {
    const map: Record<string, { primary: string; reason: string; alts: string[] }> = {
      turn_od_rough: { primary: "turn_rough_od", reason: "OD roughing G71-style multi-pass.", alts: [] },
      turn_od_finish: { primary: "turn_finish_od", reason: "Single-pass profile finish G70.", alts: [] },
      groove_or_part: { primary: "groove_part_off", reason: "Plunge grooving / parting cycle.", alts: [] },
      thread_single_point: { primary: "thread_single_point", reason: "Single-point threading G76 with multi-pass infeed.", alts: [] },
      drill_centerline: { primary: "drill_axial", reason: "Axial drilling on lathe (stationary or live tool).", alts: [] },
      millturn_radial_milling: { primary: "millturn_radial_milling", reason: "C-axis indexed radial milling on lathe turret.", alts: ["millturn_y_axis_pocket"] },
      millturn_y_axis_pocket: { primary: "millturn_y_axis_pocket", reason: "True Y-axis pocketing — better surface than polar.", alts: ["millturn_radial_milling"] },
      swiss_part_handoff: { primary: "swiss_main_sub_handoff", reason: "Main↔sub spindle synchronized handoff.", alts: [] },
      channel_sync: { primary: "channel_synchronization", reason: "Multi-channel barrier / wait-any synchronization.", alts: [] },
    };
    const hit = map[intent];
    if (hit) return { primary: hit.primary, reason: hit.reason, alternatives: hit.alts };
    return { primary: "turn_rough_od", reason: `Unknown intent='${intent}', defaulting to OD roughing.`, alternatives: [] };
  }

  /**
   * selectThreadingInfeed — pick infeed mode by pitch + material:
   *  - Pitch < 1mm → radial (small enough to manage flank wear).
   *  - Hardened steel / superalloy → modified_flank (controlled chip).
   *  - Pitch ≥ 2mm → alternating_flank (balanced wear at coarse pitch).
   *  - Default → modified_flank (safe default for ≥1mm).
   */
  static selectThreadingInfeed(pitch_mm: number, material_iso: "P" | "M" | "K" | "N" | "S" | "H"): {
    infeed_mode: "radial" | "modified_flank" | "alternating_flank";
    rationale: string;
    pitch_mm: number;
  } {
    if (typeof pitch_mm !== "number" || !Number.isFinite(pitch_mm) || pitch_mm <= 0) {
      return { infeed_mode: "modified_flank", rationale: "Invalid pitch — defaulting to modified_flank.", pitch_mm: 0 };
    }
    if (pitch_mm < 1) {
      return { infeed_mode: "radial", rationale: `Fine pitch (${pitch_mm}mm < 1) → radial keeps flank wear symmetric.`, pitch_mm };
    }
    if (material_iso === "S" || material_iso === "H") {
      return { infeed_mode: "modified_flank", rationale: `Tough material ISO-${material_iso} → modified_flank for chip control.`, pitch_mm };
    }
    if (pitch_mm >= 2) {
      return { infeed_mode: "alternating_flank", rationale: `Coarse pitch (${pitch_mm}mm ≥ 2) → alternating balances flank wear.`, pitch_mm };
    }
    return { infeed_mode: "modified_flank", rationale: `Standard pitch (${pitch_mm}mm) → modified_flank safe default.`, pitch_mm };
  }

  /**
   * selectMillturnAxis — pick mill-turn motion mode:
   *  - True Y available + off-axis feature → millturn_y_axis_pocket.
   *  - No Y, off-axis → millturn_radial_milling with polar interpolation.
   *  - On-axis (centerline-radial) → millturn_radial_milling without polar.
   */
  static selectMillturnAxis(machine_has_y: boolean, feature_off_axis: boolean): {
    operation_id: string;
    use_polar: boolean;
    rationale: string;
  } {
    if (machine_has_y && feature_off_axis) {
      return { operation_id: "millturn_y_axis_pocket", use_polar: false, rationale: "True Y-axis available + off-axis feature → use Y." };
    }
    if (!machine_has_y && feature_off_axis) {
      return { operation_id: "millturn_radial_milling", use_polar: true, rationale: "No Y-axis + off-axis feature → polar interpolation G12.1." };
    }
    return { operation_id: "millturn_radial_milling", use_polar: false, rationale: "Centerline / radial feature → C-axis indexed milling without polar." };
  }

  /**
   * estimateChannelSync — predict worst-case stall + recommend sync policy:
   *  - 2 channels: wait_all is fine (low contention).
   *  - 3 channels: barrier preferred for cycle-time critical handoffs.
   *  - 4+ channels: wait_any with explicit dependency edges to avoid quadratic stall.
   */
  static estimateChannelSync(channel_count: number, avg_op_seconds: number): {
    sync_strategy: "wait_all" | "barrier" | "wait_any";
    estimated_stall_seconds: number;
    rationale: string;
  } {
    if (typeof channel_count !== "number" || !Number.isInteger(channel_count) || channel_count < 1) {
      return { sync_strategy: "wait_all", estimated_stall_seconds: 0, rationale: "Invalid channel_count — defaulting to wait_all." };
    }
    if (typeof avg_op_seconds !== "number" || !Number.isFinite(avg_op_seconds) || avg_op_seconds <= 0) {
      return { sync_strategy: "wait_all", estimated_stall_seconds: 0, rationale: "Invalid avg_op_seconds — defaulting to wait_all." };
    }
    // Worst-case stall ≈ (channel_count - 1) × avg_op_seconds × 0.3 (30% variability bound)
    const stall = Math.round((channel_count - 1) * avg_op_seconds * 0.3 * 100) / 100;
    if (channel_count <= 2) {
      return { sync_strategy: "wait_all", estimated_stall_seconds: stall, rationale: "≤2 channels → wait_all is simplest." };
    }
    if (channel_count === 3) {
      return { sync_strategy: "barrier", estimated_stall_seconds: stall, rationale: "3 channels → barrier semantics for critical handoffs." };
    }
    return { sync_strategy: "wait_any", estimated_stall_seconds: stall, rationale: `${channel_count} channels → wait_any with explicit deps to avoid quadratic stall.` };
  }
}

export const espritLatheMillTurnFunctionIndexEngine = ESPRITLatheMillTurnFunctionIndexEngine;
