/**
 * NXCAMTurningFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM40
 *
 * Catalog: 12 NX CAM turning operations across 6 categories.
 *   rough       : rough_turn_od, rough_bore_id, rough_face
 *   finish      : finish_turn_od, finish_bore_id, finish_face
 *   groove      : groove_od
 *   thread      : thread_od, thread_id
 *   drill_bore  : centerline_drill, manual_bore
 *   teach       : teach_mode
 *
 * Helpers:
 *   - recommendByFeature(feature) → operation routing
 *   - noseRadiusForSurfaceFinish(feed, target_Ra): invert Ra ≈ f²/(8R) → R = f²/(8·Ra)
 *   - taylorToolLife(V, n, C): Taylor extended V·T^n = C, solve for T (min)
 *   - teachModeValidate(points, allow_feed, allow_rapid): validate taught-point sequence
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
    path.resolve(__dirname, "../../data/cam-functions/nxcam/turning.json"),
    path.resolve(__dirname, "../data/cam-functions/nxcam/turning.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      _catalog = JSON.parse(fs.readFileSync(p, "utf8"));
      return _catalog;
    }
  }
  throw new Error("NXCAMTurningFunctionIndexEngine: turning.json not found");
}

export type NXTurningFeature =
  | "od_rough"
  | "id_rough"
  | "face_rough"
  | "od_finish"
  | "id_finish"
  | "face_finish"
  | "od_groove"
  | "od_thread"
  | "id_thread"
  | "axial_drill"
  | "manual_bore"
  | "teach_mode_part";

export interface NoseRadiusResult {
  required_nose_radius_mm: number;
  formula: string;
  feed_per_rev_mm: number;
  target_Ra_um: number;
  target_Ra_mm: number;
}

export interface TaylorResult {
  tool_life_minutes: number;
  formula: string;
  cutting_velocity_m_per_min: number;
  taylor_exponent_n: number;
  taylor_constant_C: number;
}

export interface TeachValidationResult {
  is_valid: boolean;
  issues: string[];
  point_count: number;
  segment_count: number;
}

export class NXCAMTurningFunctionIndexEngine {
  static getIndex(): any { return loadCatalog(); }

  static getSummary(): any {
    const c = loadCatalog();
    const ops = Object.values(c.operations) as any[];
    return {
      schemaVersion: c.schemaVersion,
      system_id: c.system_id,
      section_key: c.section_key,
      version: c.version,
      total_operations: ops.length,
      total_parameters: ops.reduce((a, o) => a + o.parameter_count, 0),
      categories: c.categories,
      training_topics_count: c.training_topics.length,
    };
  }

  static listOperations() {
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
    if (!op) return { error: `Unknown NX turning operation: ${operation_id}` };
    return { operation_id, ...op };
  }

  static getOperationsByCategory(category: string) {
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

  static findParameter(parameter_name: string, limit = 20) {
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

  static getCategoryBreakdown() {
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

  static getTrainingTopics(): any[] { return loadCatalog().training_topics; }

  /**
   * recommendByFeature — 12 features → (primary, alternative, reason).
   */
  static recommendByFeature(feature: NXTurningFeature | string): { primary: string; alternative: string[]; reason: string } {
    const map: Record<string, { primary: string; alternative: string[]; reason: string }> = {
      od_rough: { primary: "rough_turn_od", alternative: [], reason: "OD roughing — linear_zig_zag default." },
      id_rough: { primary: "rough_bore_id", alternative: [], reason: "ID roughing with L/D deflection tracking." },
      face_rough: { primary: "rough_face", alternative: ["rough_turn_od"], reason: "Face roughing with radial stepping." },
      od_finish: { primary: "finish_turn_od", alternative: [], reason: "OD finishing with nose-radius comp + corner feed reduction." },
      id_finish: { primary: "finish_bore_id", alternative: [], reason: "ID finishing with deflection awareness." },
      face_finish: { primary: "finish_face", alternative: [], reason: "Face finishing single-pass." },
      od_groove: { primary: "groove_od", alternative: [], reason: "OD grooving with plunge or ramp modes." },
      od_thread: { primary: "thread_od", alternative: [], reason: "External single-point threading." },
      id_thread: { primary: "thread_id", alternative: [], reason: "Internal threading with boring-bar deflection." },
      axial_drill: { primary: "centerline_drill", alternative: [], reason: "Centerline drilling with peck cycles." },
      manual_bore: { primary: "manual_bore", alternative: ["finish_bore_id"], reason: "Manual single-pass boring for precise control." },
      teach_mode_part: { primary: "teach_mode", alternative: [], reason: "Teach-mode for unusual or one-off paths." },
    };
    return map[String(feature)] ?? {
      primary: "rough_turn_od",
      alternative: ["finish_turn_od"],
      reason: `Unknown feature '${feature}' — defaulting to OD roughing.`,
    };
  }

  /**
   * noseRadiusForSurfaceFinish — invert Ra ≈ f²/(8R) to solve for required R
   * given a feed and a target Ra. Returns the minimum nose radius (mm) that
   * theoretically produces the target surface roughness.
   *
   * Inputs: feed in mm/rev, target_Ra in micrometers (μm — standard spec units).
   * Conversion: Ra_mm = Ra_um / 1000.  R = f² / (8 · Ra_mm)
   */
  static noseRadiusForSurfaceFinish(
    feed_per_rev_mm: number,
    target_Ra_um: number,
  ): NoseRadiusResult | { error: string } {
    if (!Number.isFinite(feed_per_rev_mm) || feed_per_rev_mm <= 0) {
      return { error: "feed_per_rev_mm must be a positive finite number" };
    }
    if (!Number.isFinite(target_Ra_um) || target_Ra_um <= 0) {
      return { error: "target_Ra_um must be a positive finite number" };
    }
    const Ra_mm = target_Ra_um / 1000;
    const R = (feed_per_rev_mm * feed_per_rev_mm) / (8 * Ra_mm);
    return {
      required_nose_radius_mm: R,
      formula: "R = f² / (8 · Ra)   [invert Ra ≈ f²/(8R) on ISO 4287 basis]",
      feed_per_rev_mm,
      target_Ra_um,
      target_Ra_mm: Ra_mm,
    };
  }

  /**
   * taylorToolLife — Taylor's classic tool-life equation solved for T:
   *
   *   V · T^n = C    →    T = (C / V)^(1/n)
   *
   * V: cutting velocity (m/min), n: Taylor exponent (0.1 for carbide-steel
   * baseline), C: Taylor constant (m/min at T = 1 min). Returns T in minutes.
   */
  static taylorToolLife(V_m_per_min: number, n: number, C: number): TaylorResult | { error: string } {
    if (!Number.isFinite(V_m_per_min) || V_m_per_min <= 0) {
      return { error: "V_m_per_min must be a positive finite number" };
    }
    if (!Number.isFinite(n) || n <= 0 || n >= 1) {
      return { error: "n (Taylor exponent) must be in (0, 1) — typical 0.1..0.5" };
    }
    if (!Number.isFinite(C) || C <= 0) {
      return { error: "C (Taylor constant) must be a positive finite number" };
    }
    const T = Math.pow(C / V_m_per_min, 1 / n);
    return {
      tool_life_minutes: T,
      formula: "T = (C / V)^(1/n)   [V · T^n = C]",
      cutting_velocity_m_per_min: V_m_per_min,
      taylor_exponent_n: n,
      taylor_constant_C: C,
    };
  }

  /**
   * teachModeValidate — verifies a teach-mode point sequence has enough
   * points and a valid motion-type combination. A teach sequence needs at
   * least 2 points (start + end) and at least one allowed motion type
   * (feed or rapid) between points.
   */
  static teachModeValidate(
    point_count: number,
    allow_feed_between: boolean,
    allow_rapid_between: boolean,
  ): TeachValidationResult | { error: string } {
    if (!Number.isInteger(point_count) || point_count < 0) {
      return { error: "point_count must be a non-negative integer" };
    }
    if (typeof allow_feed_between !== "boolean") {
      return { error: "allow_feed_between must be a boolean" };
    }
    if (typeof allow_rapid_between !== "boolean") {
      return { error: "allow_rapid_between must be a boolean" };
    }
    const issues: string[] = [];
    if (point_count < 2) issues.push("Need at least 2 points (start + end)");
    if (!allow_feed_between && !allow_rapid_between) {
      issues.push("At least one motion type (feed or rapid) must be allowed between points");
    }
    return {
      is_valid: issues.length === 0,
      issues,
      point_count,
      segment_count: Math.max(0, point_count - 1),
    };
  }
}

export const nxcamTurningFunctionIndexEngine = NXCAMTurningFunctionIndexEngine;
