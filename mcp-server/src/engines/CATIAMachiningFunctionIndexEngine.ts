/**
 * CATIAMachiningFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM47
 *
 * CATIA V6 R2024 Machining catalog: 12 operations across 5 categories.
 *   prismatic_2_5d      : pocketing_2_5d, profile_contouring, facing_2_5d
 *   drilling_holemaking : hole_drilling, hole_tapping
 *   surface_3axis       : sweeping, contour_driven, isoparametric_machining
 *   advanced_5axis      : multi_axis_sweeping, multi_axis_contour
 *   delmia_integration  : delmia_simulate, delmia_clash_check
 *
 * Helpers (real classification/selection logic):
 *   - recommendByFeature(intent) → routing
 *   - classifyToleranceGrade(IT_grade) → IT range → finishing-strategy class (pocket OK / surface needed / multi-axis required)
 *   - selectMachiningPlan(complexity_score) → 0–10 score → recommended workbench (PMG/SMG/AMG)
 *   - delmiaSimulationCoverage(toolpath_length_mm, sample_step_mm) → sample-point count + memory estimate
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
    path.resolve(__dirname, "../../data/cam-functions/catia/machining.json"),
    path.resolve(__dirname, "../data/cam-functions/catia/machining.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      _catalog = JSON.parse(fs.readFileSync(p, "utf8"));
      return _catalog;
    }
  }
  throw new Error("CATIAMachiningFunctionIndexEngine: machining.json not found");
}

export type CATIAMachiningIntent =
  | "pocket_2_5d"
  | "profile_2d"
  | "face_top_surface"
  | "drill_holes"
  | "tap_holes"
  | "sweep_3axis_surface"
  | "contour_3axis_surface"
  | "isoparametric_uv_finish"
  | "sweep_5axis_surface"
  | "contour_5axis_surface"
  | "delmia_full_simulation"
  | "delmia_quick_clash";

export type IToleranceClass = "loose_pocket_ok" | "tight_surface_needed" | "multi_axis_required";

export interface ToleranceClassification {
  classification: IToleranceClass;
  IT_grade: number;
  approx_tolerance_um: number;
  recommended_workbench: "prismatic" | "surface" | "advanced";
  reason: string;
}

export interface MachiningPlanResult {
  workbench: "prismatic" | "surface" | "advanced";
  complexity_score: number;
  reason: string;
}

export interface DelmiaCoverageResult {
  sample_point_count: number;
  toolpath_length_mm: number;
  sample_step_mm: number;
  estimated_memory_mb: number;
  recommendation: string;
}

export class CATIAMachiningFunctionIndexEngine {
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
    if (!op) return { error: `Unknown CATIA machining operation: ${operation_id}` };
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
  static recommendByFeature(intent: CATIAMachiningIntent | string): { primary: string; alternative: string[]; reason: string } {
    const map: Record<string, { primary: string; alternative: string[]; reason: string }> = {
      pocket_2_5d: { primary: "pocketing_2_5d", alternative: [], reason: "2.5D pocket clearance with offset/zigzag/contour-spiral fill." },
      profile_2d: { primary: "profile_contouring", alternative: [], reason: "Profile-only milling along closed/open boundary curve." },
      face_top_surface: { primary: "facing_2_5d", alternative: [], reason: "Face-mill top surface to a target Z." },
      drill_holes: { primary: "hole_drilling", alternative: [], reason: "Canned-cycle drilling/reaming/boring (G81/G82/G83/G73/G85/G86)." },
      tap_holes: { primary: "hole_tapping", alternative: ["hole_drilling"], reason: "Rigid/floating/roll-form tapping (G84)." },
      sweep_3axis_surface: { primary: "sweeping", alternative: ["contour_driven", "isoparametric_machining"], reason: "3-axis surface sweep along surface flow lines." },
      contour_3axis_surface: { primary: "contour_driven", alternative: ["sweeping"], reason: "3-axis surface machining driven by user contours." },
      isoparametric_uv_finish: { primary: "isoparametric_machining", alternative: ["sweeping"], reason: "Surface finishing along natural UV isoparametric lines." },
      sweep_5axis_surface: { primary: "multi_axis_sweeping", alternative: ["multi_axis_contour"], reason: "5-axis surface sweep with continuous tool-axis tilt." },
      contour_5axis_surface: { primary: "multi_axis_contour", alternative: ["multi_axis_sweeping"], reason: "5-axis contour-driven machining (blades, turbo housings)." },
      delmia_full_simulation: { primary: "delmia_simulate", alternative: ["delmia_clash_check"], reason: "Full DELMIA simulation: stock removal, cycle time, machine envelope, fixture clash." },
      delmia_quick_clash: { primary: "delmia_clash_check", alternative: ["delmia_simulate"], reason: "Static or swept-volume clash check — narrower scope, faster." },
    };
    return map[String(intent)] ?? {
      primary: "pocketing_2_5d",
      alternative: ["sweeping"],
      reason: `Unknown intent '${intent}' — defaulting to 2.5D pocketing.`,
    };
  }

  /**
   * classifyToleranceGrade — map ISO 286 IT grade to a CATIA-workbench
   * recommendation. Three classes:
   *
   *   loose_pocket_ok     : IT grade ≥ 11 (≥ ~110 μm at 25mm) → prismatic OK
   *   tight_surface_needed: IT grade 7-10 (~14-84 μm at 25mm) → surface workbench
   *   multi_axis_required : IT grade ≤ 6 (≤ ~13 μm at 25mm) → advanced multi-axis
   *
   * Tolerance estimate uses the simplified formula tol(μm) ≈ 10^((IT - 1) / 5) × 16
   * which approximates ISO 286 IT values for nominal 25mm (close enough for routing
   * decisions; for actual fits use prism_data:iso286 lookups).
   */
  static classifyToleranceGrade(IT_grade: number): ToleranceClassification | { error: string } {
    if (!Number.isInteger(IT_grade) || IT_grade < 1 || IT_grade > 18) {
      return { error: "IT_grade must be an integer in [1, 18] per ISO 286" };
    }
    // Simplified IT → tolerance approximation; values at nominal 25mm
    const approx_tol_um = Math.round(Math.pow(10, (IT_grade - 1) / 5) * 16);
    let classification: IToleranceClass;
    let workbench: ToleranceClassification["recommended_workbench"];
    let reason: string;
    if (IT_grade >= 11) {
      classification = "loose_pocket_ok";
      workbench = "prismatic";
      reason = `IT${IT_grade} (~${approx_tol_um}μm) is loose enough for prismatic 2.5D pocket / profile.`;
    } else if (IT_grade >= 7) {
      classification = "tight_surface_needed";
      workbench = "surface";
      reason = `IT${IT_grade} (~${approx_tol_um}μm) requires CATIA Surface Machining (sweep / contour / isoparametric).`;
    } else {
      classification = "multi_axis_required";
      workbench = "advanced";
      reason = `IT${IT_grade} (~${approx_tol_um}μm) is precision-grade — requires Advanced Machining 5-axis to control tool axis.`;
    }
    return {
      classification,
      IT_grade,
      approx_tolerance_um: approx_tol_um,
      recommended_workbench: workbench,
      reason,
    };
  }

  /**
   * selectMachiningPlan — quick decision tree based on a 0-10 complexity
   * score (where 0=pure prismatic block, 10=impeller/blisk):
   *
   *   score ≤ 3 : prismatic   (PMG)
   *   score ≤ 6 : surface     (SMG)
   *   score >  6: advanced    (AMG)
   */
  static selectMachiningPlan(complexity_score: number): MachiningPlanResult | { error: string } {
    if (!Number.isFinite(complexity_score) || complexity_score < 0 || complexity_score > 10) {
      return { error: "complexity_score must be in [0, 10]" };
    }
    let workbench: MachiningPlanResult["workbench"];
    let reason: string;
    if (complexity_score <= 3) {
      workbench = "prismatic";
      reason = `Score ${complexity_score} ≤ 3 — prismatic block-like geometry; CATIA Prismatic Machining is sufficient.`;
    } else if (complexity_score <= 6) {
      workbench = "surface";
      reason = `Score ${complexity_score} in (3, 6] — freeform surfaces present; CATIA Surface Machining 3-axis.`;
    } else {
      workbench = "advanced";
      reason = `Score ${complexity_score} > 6 — undercuts / blades / impellers; CATIA Advanced Machining 5-axis required.`;
    }
    return { workbench, complexity_score, reason };
  }

  /**
   * delmiaSimulationCoverage — estimate how many sample points DELMIA will
   * place along a toolpath at a given step density, plus a rough memory
   * estimate. Each sample point ≈ 256 bytes (joint angles + TCP frame +
   * timestamp + collision-tag).
   */
  static delmiaSimulationCoverage(
    toolpath_length_mm: number,
    sample_step_mm: number,
  ): DelmiaCoverageResult | { error: string } {
    if (!Number.isFinite(toolpath_length_mm) || toolpath_length_mm <= 0) {
      return { error: "toolpath_length_mm must be a positive finite number" };
    }
    if (!Number.isFinite(sample_step_mm) || sample_step_mm <= 0) {
      return { error: "sample_step_mm must be a positive finite number" };
    }
    if (sample_step_mm > toolpath_length_mm) {
      return { error: "sample_step_mm must not exceed toolpath_length_mm" };
    }
    const sample_count = Math.ceil(toolpath_length_mm / sample_step_mm) + 1;
    const bytes_per_sample = 256;
    const memory_mb = (sample_count * bytes_per_sample) / (1024 * 1024);
    let rec: string;
    if (sample_count > 1_000_000) {
      rec = `Very dense sampling (${sample_count.toLocaleString()} pts) — increase sample_step_mm or split into multiple ops.`;
    } else if (sample_count > 100_000) {
      rec = `Dense sampling (${sample_count.toLocaleString()} pts) — workable but slow; consider voxel stock model.`;
    } else if (sample_count >= 1_000) {
      rec = `Standard sampling (${sample_count.toLocaleString()} pts) — appropriate for full simulation.`;
    } else {
      rec = `Sparse sampling (${sample_count.toLocaleString()} pts) — may miss collisions; tighten sample_step_mm.`;
    }
    return {
      sample_point_count: sample_count,
      toolpath_length_mm,
      sample_step_mm,
      estimated_memory_mb: memory_mb,
      recommendation: rec,
    };
  }
}

export const catiaMachiningFunctionIndexEngine = CATIAMachiningFunctionIndexEngine;
