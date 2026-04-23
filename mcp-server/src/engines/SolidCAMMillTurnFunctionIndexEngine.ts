/**
 * SolidCAMMillTurnFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM37 (mill-turn)
 *
 * Catalog: 12 SolidCAM mill-turn operations across 7 categories.
 *   live_tooling : mt_live_mill_face, mt_live_mill_radial
 *   c_axis       : mt_c_axis_drilling, mt_c_axis_polar_milling
 *   y_axis       : mt_y_axis_milling
 *   sub_spindle  : mt_sub_spindle_pickup, mt_sub_spindle_part_off
 *   multi_channel: mt_balanced_turning, mt_multi_channel_sync
 *   swiss_type   : mt_swiss_type_turning
 *   specialty    : mt_thread_chasing_sync, mt_bar_feeder_advance
 *
 * Physics + planning helpers:
 *   - validateSubSpindleSync(rpm_main, rpm_sub, tol_rpm) → safe-to-engage check
 *   - polarFeedAtRadius(linear_feed, radius_mm, min_radius_mm) → feedrate clamp near center
 *   - validateWaitBarriers(main_count, sub_count) → deadlock detection
 *   - recommendByFeature(feature) → operation routing
 */

import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let _catalog: any | null = null;

function loadCatalog(): any {
  if (_catalog) return _catalog;
  const candidates = [
    path.resolve(__dirname, "../../data/cam-functions/solidcam/millturn.json"),
    path.resolve(__dirname, "../data/cam-functions/solidcam/millturn.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      _catalog = JSON.parse(fs.readFileSync(p, "utf8"));
      return _catalog;
    }
  }
  throw new Error(
    "SolidCAMMillTurnFunctionIndexEngine: millturn.json not found in candidate paths",
  );
}

export type MillTurnFeature =
  | "polar_face_pocket"
  | "cross_drilled_hole"
  | "off_center_keyway"
  | "bolt_circle_face"
  | "polar_slot_arc"
  | "second_op_on_back"
  | "long_shaft_balanced"
  | "main_sub_parallel"
  | "swiss_long_part"
  | "synced_thread_pickup"
  | "bar_feed_cycle";

export interface SyncCheckResult {
  delta_rpm: number;
  within_tolerance: boolean;
  recommendation: string;
  rpm_main: number;
  rpm_sub: number;
  tolerance_rpm: number;
}

export interface PolarFeedResult {
  feed_at_radius_mm_per_min: number;
  is_clamped: boolean;
  clamp_reason: string | null;
  effective_radius_mm: number;
}

export interface WaitBarrierResult {
  is_balanced: boolean;
  deadlock_risk: "none" | "low" | "high";
  recommendation: string;
  main_count: number;
  sub_count: number;
}

export class SolidCAMMillTurnFunctionIndexEngine {
  static getIndex(): any {
    return loadCatalog();
  }

  static getSummary(): any {
    const c = loadCatalog();
    const ops = Object.values(c.operations) as any[];
    const total_parameters = ops.reduce((a, o) => a + o.parameter_count, 0);
    return {
      schemaVersion: c.schemaVersion,
      system_id: c.system_id,
      section_key: c.section_key,
      version: c.version,
      total_operations: ops.length,
      total_parameters,
      categories: c.categories,
      training_topics_count: c.training_topics.length,
    };
  }

  static listOperations(): Array<{ operation_id: string; category: string; parameter_count: number; display_name: string }> {
    const c = loadCatalog();
    return Object.entries(c.operations).map(([id, op]: any) => ({
      operation_id: id,
      category: op.category,
      parameter_count: op.parameter_count,
      display_name: op.display_name,
    }));
  }

  static getOperation(operation_id: string): any {
    const c = loadCatalog();
    const op = c.operations[operation_id];
    if (!op) return { error: `Unknown mill-turn operation: ${operation_id}` };
    return { operation_id, ...op };
  }

  static getOperationsByCategory(category: string): Array<any> {
    const c = loadCatalog();
    const target = String(category).toLowerCase();
    return Object.entries(c.operations)
      .filter(([_id, op]: any) => op.category.toLowerCase() === target)
      .map(([id, op]: any) => ({
        operation_id: id,
        category: op.category,
        parameter_count: op.parameter_count,
        display_name: op.display_name,
      }));
  }

  static findParameter(parameter_name: string, limit = 20): Array<{ operation_id: string; group: string; parameter: string }> {
    const c = loadCatalog();
    const needle = String(parameter_name).toLowerCase();
    const out: Array<{ operation_id: string; group: string; parameter: string }> = [];
    for (const [opId, op] of Object.entries(c.operations) as any) {
      for (const [grp, params] of Object.entries(op.parameters) as any) {
        for (const pName of Object.keys(params)) {
          if (pName.toLowerCase().includes(needle)) {
            out.push({ operation_id: opId, group: grp, parameter: pName });
            if (out.length >= limit) return out;
          }
        }
      }
    }
    return out;
  }

  static getCategoryBreakdown(): Array<{ category: string; operations: string[]; total_parameters: number }> {
    const c = loadCatalog();
    const map = new Map<string, { ops: string[]; params: number }>();
    for (const [id, op] of Object.entries(c.operations) as any) {
      const e = map.get(op.category) ?? { ops: [], params: 0 };
      e.ops.push(id);
      e.params += op.parameter_count;
      map.set(op.category, e);
    }
    return Array.from(map.entries()).map(([category, v]) => ({
      category,
      operations: v.ops,
      total_parameters: v.params,
    }));
  }

  static getTrainingTopics(): any[] {
    return loadCatalog().training_topics;
  }

  /**
   * recommendByFeature — deterministic routing from a feature/intent to an op.
   */
  static recommendByFeature(feature: MillTurnFeature | string): { primary: string; alternative: string[]; reason: string } {
    const map: Record<string, { primary: string; alternative: string[]; reason: string }> = {
      polar_face_pocket: {
        primary: "mt_c_axis_polar_milling",
        alternative: ["mt_y_axis_milling"],
        reason: "Polar interpolation handles face pockets with C+X coordination",
      },
      cross_drilled_hole: {
        primary: "mt_live_mill_radial",
        alternative: ["mt_c_axis_drilling"],
        reason: "Live tool with C-axis indexing for radial cross holes",
      },
      off_center_keyway: {
        primary: "mt_y_axis_milling",
        alternative: ["mt_c_axis_polar_milling"],
        reason: "True Y-axis preferred for off-center features needing tight tolerance",
      },
      bolt_circle_face: {
        primary: "mt_c_axis_drilling",
        alternative: ["mt_live_mill_face"],
        reason: "C-axis index then drill — fastest pattern for face bolt circles",
      },
      polar_slot_arc: {
        primary: "mt_c_axis_polar_milling",
        alternative: [],
        reason: "Polar G12.1 milling for arc-based slots on the face",
      },
      second_op_on_back: {
        primary: "mt_sub_spindle_pickup",
        alternative: ["mt_sub_spindle_part_off"],
        reason: "Sub-spindle pickup hands off part for back-side machining",
      },
      long_shaft_balanced: {
        primary: "mt_balanced_turning",
        alternative: ["mt_multi_channel_sync"],
        reason: "Two opposing tools cancel deflection on long shafts",
      },
      main_sub_parallel: {
        primary: "mt_multi_channel_sync",
        alternative: ["mt_balanced_turning"],
        reason: "Multi-channel sync runs main + sub programs in parallel via wait codes",
      },
      swiss_long_part: {
        primary: "mt_swiss_type_turning",
        alternative: [],
        reason: "Sliding headstock with guide bushing for long, slender parts",
      },
      synced_thread_pickup: {
        primary: "mt_thread_chasing_sync",
        alternative: ["mt_sub_spindle_pickup"],
        reason: "Phase-synchronized sub pickup keeps thread starts aligned across ops",
      },
      bar_feed_cycle: {
        primary: "mt_bar_feeder_advance",
        alternative: [],
        reason: "Bar feeder advance + part-stop for continuous bar work",
      },
    };
    return map[String(feature)] ?? {
      primary: "mt_live_mill_face",
      alternative: ["mt_c_axis_drilling"],
      reason: `Unknown feature '${feature}' — defaulting to live-tool face milling`,
    };
  }

  /**
   * validateSubSpindleSync — confirms main and sub spindles are within RPM
   * tolerance for safe pickup or threading hand-off.
   */
  static validateSubSpindleSync(
    rpm_main: number,
    rpm_sub: number,
    tolerance_rpm: number,
  ): SyncCheckResult | { error: string } {
    if (!Number.isFinite(rpm_main) || rpm_main < 0) {
      return { error: "rpm_main must be a non-negative finite number" };
    }
    if (!Number.isFinite(rpm_sub) || rpm_sub < 0) {
      return { error: "rpm_sub must be a non-negative finite number" };
    }
    if (!Number.isFinite(tolerance_rpm) || tolerance_rpm < 0) {
      return { error: "tolerance_rpm must be a non-negative finite number" };
    }
    const delta = Math.abs(rpm_main - rpm_sub);
    const within = delta <= tolerance_rpm;
    let rec: string;
    if (within && delta === 0) rec = "Perfect sync — safe to engage chuck.";
    else if (within) rec = `Within tolerance (Δ=${delta.toFixed(1)} ≤ ${tolerance_rpm}) — safe to engage.`;
    else rec = `Out of sync by ${delta.toFixed(1)} RPM (>${tolerance_rpm}) — DO NOT engage; resync first.`;
    return {
      delta_rpm: delta,
      within_tolerance: within,
      recommendation: rec,
      rpm_main,
      rpm_sub,
      tolerance_rpm,
    };
  }

  /**
   * polarFeedAtRadius — clamps feedrate near the polar center to keep surface
   * speed bounded. At radius < min_radius_mm, the feed is reduced
   * proportionally (feed * radius / min_radius) to prevent infinite angular
   * velocity in G12.1 / polar interpolation.
   */
  static polarFeedAtRadius(
    linear_feed_mm_per_min: number,
    radius_mm: number,
    min_radius_mm: number,
  ): PolarFeedResult | { error: string } {
    if (!Number.isFinite(linear_feed_mm_per_min) || linear_feed_mm_per_min <= 0) {
      return { error: "linear_feed_mm_per_min must be a positive finite number" };
    }
    if (!Number.isFinite(radius_mm) || radius_mm < 0) {
      return { error: "radius_mm must be a non-negative finite number" };
    }
    if (!Number.isFinite(min_radius_mm) || min_radius_mm <= 0) {
      return { error: "min_radius_mm must be a positive finite number" };
    }
    if (radius_mm >= min_radius_mm) {
      return {
        feed_at_radius_mm_per_min: linear_feed_mm_per_min,
        is_clamped: false,
        clamp_reason: null,
        effective_radius_mm: radius_mm,
      };
    }
    const eff = Math.max(radius_mm, 0);
    const clamped_feed = linear_feed_mm_per_min * (eff / min_radius_mm);
    return {
      feed_at_radius_mm_per_min: clamped_feed,
      is_clamped: true,
      clamp_reason: `radius ${radius_mm}mm < min_radius ${min_radius_mm}mm — feed scaled to prevent angular runaway`,
      effective_radius_mm: eff,
    };
  }

  /**
   * validateWaitBarriers — checks that main and sub channels declare matching
   * counts of wait codes. Mismatched counts cause deadlocks where one channel
   * waits forever on a code its partner never emits.
   */
  static validateWaitBarriers(main_count: number, sub_count: number): WaitBarrierResult | { error: string } {
    if (!Number.isInteger(main_count) || main_count < 0) {
      return { error: "main_count must be a non-negative integer" };
    }
    if (!Number.isInteger(sub_count) || sub_count < 0) {
      return { error: "sub_count must be a non-negative integer" };
    }
    if (main_count === sub_count) {
      return {
        is_balanced: true,
        deadlock_risk: "none",
        recommendation: `Balanced (${main_count} barriers each) — no deadlock risk from count mismatch.`,
        main_count,
        sub_count,
      };
    }
    const diff = Math.abs(main_count - sub_count);
    const risk: "low" | "high" = diff === 1 ? "low" : "high";
    return {
      is_balanced: false,
      deadlock_risk: risk,
      recommendation: `Unbalanced: main=${main_count}, sub=${sub_count}. ${risk === "high" ? "HIGH RISK" : "Low risk"} of deadlock — review wait codes pairwise.`,
      main_count,
      sub_count,
    };
  }
}

export const solidCAMMillTurnFunctionIndexEngine = SolidCAMMillTurnFunctionIndexEngine;
