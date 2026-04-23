/**
 * NXCAMMillingFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM39
 *
 * Catalog: 13 NX CAM milling operations across 6 categories.
 *   fixed_axis_3plus2 : face_milling, planar_mill, cavity_mill, zlevel_profile, fixed_contour
 *   variable_axis     : variable_contour, variable_streamline, swarf_drive
 *   adaptive          : adaptive_milling
 *   sequential        : sequential_mill
 *   prismatic_finish  : planar_profile, surface_contour
 *   feature_based     : auto_3d_fbm
 *
 * Helpers:
 *   - recommendByFeature(feature) → routing
 *   - estimateScallopHeight(stepover, tool_dia) → h ≈ s²/(8R) ball-end approx
 *   - adaptiveEngagementCheck(radial_pct, axial_doc_dia) → safe/caution/critical
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
    path.resolve(__dirname, "../../data/cam-functions/nxcam/milling.json"),
    path.resolve(__dirname, "../data/cam-functions/nxcam/milling.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      _catalog = JSON.parse(fs.readFileSync(p, "utf8"));
      return _catalog;
    }
  }
  throw new Error("NXCAMMillingFunctionIndexEngine: milling.json not found");
}

export type NXMillingFeature =
  | "face_top_surface"
  | "rectangular_pocket"
  | "freeform_cavity"
  | "steep_wall_finish"
  | "shallow_surface_finish"
  | "impeller_blade"
  | "ruled_swarf_wall"
  | "freeform_streamline"
  | "high_efficiency_rough"
  | "operator_guided"
  | "profile_finish_2d"
  | "automatic_feature_machining";

export interface ScallopResult {
  scallop_height_mm: number;
  formula: string;
  stepover_mm: number;
  tool_radius_mm: number;
}

export interface AdaptiveResult {
  classification: "safe" | "caution" | "critical";
  radial_engagement_pct: number;
  axial_doc_to_dia_ratio: number;
  recommendation: string;
}

export class NXCAMMillingFunctionIndexEngine {
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
    if (!op) return { error: `Unknown NX milling operation: ${operation_id}` };
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
   * recommendByFeature — feature → (primary, alternative, reason).
   */
  static recommendByFeature(feature: NXMillingFeature | string): { primary: string; alternative: string[]; reason: string } {
    const map: Record<string, { primary: string; alternative: string[]; reason: string }> = {
      face_top_surface: { primary: "face_milling", alternative: ["planar_mill"], reason: "FACE_MILLING template for flat top facing." },
      rectangular_pocket: { primary: "planar_mill", alternative: ["cavity_mill", "adaptive_milling"], reason: "PLANAR_MILL with follow_part for prismatic pockets." },
      freeform_cavity: { primary: "cavity_mill", alternative: ["adaptive_milling"], reason: "CAVITY_MILL for surface-driven cavity roughing." },
      steep_wall_finish: { primary: "zlevel_profile", alternative: ["fixed_contour"], reason: "ZLEVEL_PROFILE waterline for steep walls (≥65°)." },
      shallow_surface_finish: { primary: "fixed_contour", alternative: ["surface_contour"], reason: "FIXED_CONTOUR area-milling for shallow 3D surfaces." },
      impeller_blade: { primary: "variable_contour", alternative: ["swarf_drive", "variable_streamline"], reason: "VARIABLE_CONTOUR for impeller blade simultaneous 5-axis." },
      ruled_swarf_wall: { primary: "swarf_drive", alternative: ["variable_contour"], reason: "SWARF_DRIVE flank-cut on ruled drive surface." },
      freeform_streamline: { primary: "variable_streamline", alternative: ["variable_contour"], reason: "VARIABLE_STREAMLINE follows surface flow lines." },
      high_efficiency_rough: { primary: "adaptive_milling", alternative: ["cavity_mill"], reason: "ADAPTIVE_MILLING constant-engagement for HSM roughing." },
      operator_guided: { primary: "sequential_mill", alternative: [], reason: "SEQUENTIAL_MILL for hand-built toolpaths step by step." },
      profile_finish_2d: { primary: "planar_profile", alternative: [], reason: "PLANAR_PROFILE for boundary-driven 2D finishing." },
      automatic_feature_machining: { primary: "auto_3d_fbm", alternative: [], reason: "AUTO_3D feature recognition + template-driven machining." },
    };
    return map[String(feature)] ?? {
      primary: "cavity_mill",
      alternative: ["fixed_contour"],
      reason: `Unknown feature '${feature}' — defaulting to CAVITY_MILL roughing.`,
    };
  }

  /**
   * estimateScallopHeight — ball-end mill scallop approximation.
   *
   *   h ≈ s² / (8 R)
   *
   * Where s = stepover, R = tool radius. Valid for s << 2R (small-step regime).
   * Underestimates near s ≈ 2R (where exact h = R - sqrt(R² - (s/2)²)).
   */
  static estimateScallopHeight(stepover_mm: number, tool_diameter_mm: number): ScallopResult | { error: string } {
    if (!Number.isFinite(stepover_mm) || stepover_mm <= 0) {
      return { error: "stepover_mm must be a positive finite number" };
    }
    if (!Number.isFinite(tool_diameter_mm) || tool_diameter_mm <= 0) {
      return { error: "tool_diameter_mm must be a positive finite number" };
    }
    if (stepover_mm >= tool_diameter_mm) {
      return { error: "stepover_mm must be less than tool_diameter_mm (otherwise scallop is unbounded)" };
    }
    const R = tool_diameter_mm / 2;
    const h = (stepover_mm * stepover_mm) / (8 * R);
    return {
      scallop_height_mm: h,
      formula: "h ≈ s² / (8R)  [small-step ball-end approximation]",
      stepover_mm,
      tool_radius_mm: R,
    };
  }

  /**
   * adaptiveEngagementCheck — classify HSM trochoidal parameters into
   * safe/caution/critical zones for adaptive milling.
   *
   *   safe:     radial ≤ 12% AND axial_doc/D ≤ 1.5
   *   caution:  radial ≤ 20% OR  axial_doc/D ≤ 2.0
   *   critical: outside above
   */
  static adaptiveEngagementCheck(radial_engagement_pct: number, axial_doc_to_dia_ratio: number): AdaptiveResult | { error: string } {
    if (!Number.isFinite(radial_engagement_pct) || radial_engagement_pct <= 0 || radial_engagement_pct > 100) {
      return { error: "radial_engagement_pct must be in (0, 100]" };
    }
    if (!Number.isFinite(axial_doc_to_dia_ratio) || axial_doc_to_dia_ratio <= 0) {
      return { error: "axial_doc_to_dia_ratio must be a positive finite number" };
    }
    let classification: AdaptiveResult["classification"];
    let rec: string;
    if (radial_engagement_pct <= 12 && axial_doc_to_dia_ratio <= 1.5) {
      classification = "safe";
      rec = "Within HSM canonical envelope (≤12% radial, ≤1.5×D axial). Run with confidence.";
    } else if (radial_engagement_pct <= 20 && axial_doc_to_dia_ratio <= 2.0) {
      classification = "caution";
      rec = "Outside canonical HSM but still recoverable; verify rigidity, reduce feed if chatter appears.";
    } else {
      classification = "critical";
      rec = "Engagement exceeds adaptive-milling design envelope; expect tool overload, breakage, or chatter.";
    }
    return {
      classification,
      radial_engagement_pct,
      axial_doc_to_dia_ratio,
      recommendation: rec,
    };
  }
}

export const nxcamMillingFunctionIndexEngine = NXCAMMillingFunctionIndexEngine;
