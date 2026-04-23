/**
 * PowerMillFinishingFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM44
 *
 * PowerMill 2024 Finishing Strategies catalog: 12 operations across 5 categories.
 *   steep_shallow         : steep_and_shallow, optimised_constant_z
 *   constant_z            : constant_z, constant_z_rest
 *   offset_3d             : offset_3d, offset_3d_rest
 *   raster_radial_spiral  : raster_finish, radial_finish, spiral_finish
 *   pattern_corner        : pattern_finish, pencil_finish, corner_finishing
 *
 * Helpers (real classification/selection logic):
 *   - recommendByFeature(intent) → routing
 *   - classifySurfaceSteepShallow(surface_angle_deg, threshold_deg, overlap_deg) → steep/transition/shallow
 *   - stepoverForCuspTarget(target_cusp_mm, tool_diameter_mm) → INVERSE of scallop equation: s = sqrt(8·R·h)
 *   - pencilTraceFeasibility(internal_corner_radius_mm, tool_radius_mm) → boolean valid + clearance + reason
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
    path.resolve(__dirname, "../../data/cam-functions/powermill/finishing.json"),
    path.resolve(__dirname, "../data/cam-functions/powermill/finishing.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      _catalog = JSON.parse(fs.readFileSync(p, "utf8"));
      return _catalog;
    }
  }
  throw new Error("PowerMillFinishingFunctionIndexEngine: finishing.json not found");
}

export type PMFinishingIntent =
  | "mixed_steep_shallow"
  | "adaptive_waterline"
  | "steep_wall_waterline"
  | "rest_after_waterline"
  | "uniform_cusp_3d_offset"
  | "rest_after_3d_offset"
  | "fast_flat_finish"
  | "round_pocket_finish"
  | "round_boss_continuous"
  | "user_directed_path"
  | "internal_corner_cleanup"
  | "multi_pass_corner_residue";

export interface SteepShallowClass {
  classification: "steep" | "transition" | "shallow";
  surface_angle_deg: number;
  threshold_angle_deg: number;
  overlap_band_lower_deg: number;
  overlap_band_upper_deg: number;
  recommendation: string;
}

export interface CuspStepoverResult {
  required_stepover_mm: number;
  formula: string;
  target_cusp_mm: number;
  tool_radius_mm: number;
}

export interface PencilFeasibilityResult {
  is_feasible: boolean;
  internal_corner_radius_mm: number;
  tool_radius_mm: number;
  clearance_mm: number;
  reason: string;
}

export class PowerMillFinishingFunctionIndexEngine {
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
    if (!op) return { error: `Unknown PowerMill finishing operation: ${operation_id}` };
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
   * recommendByFeature — 12 intents → (primary, alternative, reason).
   */
  static recommendByFeature(intent: PMFinishingIntent | string): { primary: string; alternative: string[]; reason: string } {
    const map: Record<string, { primary: string; alternative: string[]; reason: string }> = {
      mixed_steep_shallow: { primary: "steep_and_shallow", alternative: ["optimised_constant_z"], reason: "Single-shot finish for mixed steep/shallow geometry." },
      adaptive_waterline: { primary: "optimised_constant_z", alternative: ["constant_z"], reason: "Adaptive-stepdown waterline for mixed slope angles." },
      steep_wall_waterline: { primary: "constant_z", alternative: ["optimised_constant_z"], reason: "Classic constant-Z waterline for steep walls (≥30°)." },
      rest_after_waterline: { primary: "constant_z_rest", alternative: [], reason: "Rest constant-Z to clean up corners after a bigger tool's pass." },
      uniform_cusp_3d_offset: { primary: "offset_3d", alternative: ["radial_finish", "spiral_finish"], reason: "3D offset for uniform cusp height across all surface angles." },
      rest_after_3d_offset: { primary: "offset_3d_rest", alternative: [], reason: "3D offset rest catches residue in tight shallow corners." },
      fast_flat_finish: { primary: "raster_finish", alternative: ["offset_3d"], reason: "Raster lace finish — fastest cycle on near-flat tops." },
      round_pocket_finish: { primary: "spiral_finish", alternative: ["radial_finish"], reason: "Continuous spiral on round pockets — no retracts." },
      round_boss_continuous: { primary: "spiral_finish", alternative: ["radial_finish"], reason: "Spiral finish on round bosses/hubs — eliminates lifts." },
      user_directed_path: { primary: "pattern_finish", alternative: [], reason: "User-defined wireframe pattern drives the toolpath." },
      internal_corner_cleanup: { primary: "pencil_finish", alternative: ["corner_finishing"], reason: "Pencil trace along internal sharp edges." },
      multi_pass_corner_residue: { primary: "corner_finishing", alternative: ["pencil_finish"], reason: "Multi-pass corner clear-up driven by reference tool diameter." },
    };
    return map[String(intent)] ?? {
      primary: "steep_and_shallow",
      alternative: ["optimised_constant_z"],
      reason: `Unknown intent '${intent}' — defaulting to Steep & Shallow finishing.`,
    };
  }

  /**
   * classifySurfaceSteepShallow — classify a single surface angle into
   * steep / transition / shallow zones around a threshold (canonical 30°).
   *
   * The transition band of width ±overlap_deg/2 around the threshold avoids
   * a hard split that would create a visible witness line. Surfaces inside
   * the transition band get BOTH the steep and shallow strategy in
   * Steep & Shallow's overlap zone.
   */
  static classifySurfaceSteepShallow(
    surface_angle_deg: number,
    threshold_deg: number,
    overlap_deg = 0,
  ): SteepShallowClass | { error: string } {
    if (!Number.isFinite(surface_angle_deg) || surface_angle_deg < 0 || surface_angle_deg > 90) {
      return { error: "surface_angle_deg must be in [0, 90]" };
    }
    if (!Number.isFinite(threshold_deg) || threshold_deg < 1 || threshold_deg >= 90) {
      return { error: "threshold_deg must be in [1, 90)" };
    }
    if (!Number.isFinite(overlap_deg) || overlap_deg < 0 || overlap_deg > 20) {
      return { error: "overlap_deg must be in [0, 20]" };
    }
    const lower = threshold_deg - overlap_deg / 2;
    const upper = threshold_deg + overlap_deg / 2;
    let classification: SteepShallowClass["classification"];
    let rec: string;
    if (surface_angle_deg < lower) {
      classification = "shallow";
      rec = `Surface ${surface_angle_deg}° < ${lower}° → shallow zone; route to 3D offset / raster.`;
    } else if (surface_angle_deg > upper) {
      classification = "steep";
      rec = `Surface ${surface_angle_deg}° > ${upper}° → steep zone; route to constant Z / waterline.`;
    } else {
      classification = "transition";
      rec = `Surface ${surface_angle_deg}° in transition band [${lower}°, ${upper}°] → both steep AND shallow strategies overlap here.`;
    }
    return {
      classification,
      surface_angle_deg,
      threshold_angle_deg: threshold_deg,
      overlap_band_lower_deg: lower,
      overlap_band_upper_deg: upper,
      recommendation: rec,
    };
  }

  /**
   * stepoverForCuspTarget — invert the ball-end cusp equation to solve for
   * the stepover needed to achieve a given cusp height target.
   *
   *   cusp ≈ s² / (8R)    →    s = sqrt(8 · R · cusp)
   *
   * Useful for finishing planning: "I want Ra ≈ 0.8 μm with this 6mm ball
   * mill, what stepover do I need?" — convert Ra to cusp via Ra ≈ cusp/4
   * (rule of thumb), then call this.
   */
  static stepoverForCuspTarget(
    target_cusp_mm: number,
    tool_diameter_mm: number,
  ): CuspStepoverResult | { error: string } {
    if (!Number.isFinite(target_cusp_mm) || target_cusp_mm <= 0) {
      return { error: "target_cusp_mm must be a positive finite number" };
    }
    if (!Number.isFinite(tool_diameter_mm) || tool_diameter_mm <= 0) {
      return { error: "tool_diameter_mm must be a positive finite number" };
    }
    const R = tool_diameter_mm / 2;
    const s = Math.sqrt(8 * R * target_cusp_mm);
    return {
      required_stepover_mm: s,
      formula: "s = sqrt(8 · R · cusp)   [inverse of cusp ≈ s²/(8R) for ball-end mill]",
      target_cusp_mm,
      tool_radius_mm: R,
    };
  }

  /**
   * pencilTraceFeasibility — pencil trace requires the tool radius to be
   * ≤ the smallest internal corner radius to be traced. Otherwise the tool
   * cannot fit into the corner and the trace will leave a gap (or worse,
   * gouge the wall as it tries to enter).
   */
  static pencilTraceFeasibility(
    internal_corner_radius_mm: number,
    tool_radius_mm: number,
  ): PencilFeasibilityResult | { error: string } {
    if (!Number.isFinite(internal_corner_radius_mm) || internal_corner_radius_mm <= 0) {
      return { error: "internal_corner_radius_mm must be a positive finite number" };
    }
    if (!Number.isFinite(tool_radius_mm) || tool_radius_mm <= 0) {
      return { error: "tool_radius_mm must be a positive finite number" };
    }
    const clearance = internal_corner_radius_mm - tool_radius_mm;
    const is_feasible = clearance >= 0;
    const reason = is_feasible
      ? `Tool radius ${tool_radius_mm}mm ≤ internal corner ${internal_corner_radius_mm}mm — pencil trace will reach the corner with ${clearance.toFixed(3)}mm clearance.`
      : `Tool radius ${tool_radius_mm}mm > internal corner ${internal_corner_radius_mm}mm — tool cannot fit (deficit ${(-clearance).toFixed(3)}mm). Use a smaller ball mill.`;
    return {
      is_feasible,
      internal_corner_radius_mm,
      tool_radius_mm,
      clearance_mm: clearance,
      reason,
    };
  }
}

export const powerMillFinishingFunctionIndexEngine = PowerMillFinishingFunctionIndexEngine;
