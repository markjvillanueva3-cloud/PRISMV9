/**
 * SolidCAMTurningFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM37 (turning)
 *
 * Catalog: 13 SolidCAM turning operations across 6 categories.
 *   roughing    : turn_rough_external, turn_rough_internal, turn_rough_face
 *   finishing   : turn_finish_external, turn_finish_internal, turn_finish_face
 *   grooving    : turn_groove_external, turn_groove_face, turn_part_off
 *   threading   : turn_thread_external, turn_thread_internal
 *   drilling    : turn_drill_axial
 *   specialty   : turn_profile_recursive (G71-style)
 *
 * Physics helpers:
 *   - calculateCSS(diameter_mm, css_m_per_min, max_rpm) → constant-surface-speed RPM
 *   - boringBarLDRatio(overhang, diameter)              → vibration risk classification
 *   - threadPassSchedule(depth, first_doc, min_doc)     → constant chip-area pass plan
 *   - recommendByFeature(feature)                       → operation routing
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
    path.resolve(__dirname, "../../data/cam-functions/solidcam/turning.json"),
    path.resolve(__dirname, "../data/cam-functions/solidcam/turning.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      _catalog = JSON.parse(fs.readFileSync(p, "utf8"));
      return _catalog;
    }
  }
  throw new Error(
    "SolidCAMTurningFunctionIndexEngine: turning.json not found in candidate paths",
  );
}

export type TurningFeature =
  | "od_cylinder_rough"
  | "od_taper_rough"
  | "id_bore_rough"
  | "face_stock_rough"
  | "od_finish"
  | "id_finish"
  | "face_finish"
  | "od_groove"
  | "face_groove"
  | "part_off"
  | "od_thread"
  | "id_thread"
  | "axial_hole_on_center"
  | "near_net_forging";

export interface CSSResult {
  rpm_at_diameter: number;
  capped_at_max: boolean;
  surface_speed_actual_m_per_min: number;
  diameter_mm: number;
  css_m_per_min: number;
  max_rpm: number;
}

export interface BoringBarResult {
  ld_ratio: number;
  classification: "safe" | "caution" | "warning" | "critical";
  recommended_doc_factor: number;
  recommendation: string;
}

export interface ThreadPassPlan {
  pass_count: number;
  passes: Array<{ pass_index: number; doc_mm: number; cumulative_depth_mm: number }>;
  spring_passes: number;
  total_depth_mm: number;
}

export class SolidCAMTurningFunctionIndexEngine {
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
    if (!op) return { error: `Unknown turning operation: ${operation_id}` };
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
   * recommendByFeature — deterministic routing from a turning feature to the
   * best-fit SolidCAM operation. Returns { primary, alternative, reason }.
   */
  static recommendByFeature(feature: TurningFeature | string): { primary: string; alternative: string[]; reason: string } {
    const map: Record<string, { primary: string; alternative: string[]; reason: string }> = {
      od_cylinder_rough: {
        primary: "turn_rough_external",
        alternative: ["turn_profile_recursive"],
        reason: "Cylindrical OD roughing — straight DOC steps remove stock fastest on prismatic stock",
      },
      od_taper_rough: {
        primary: "turn_rough_external",
        alternative: ["turn_profile_recursive"],
        reason: "External taper benefits from constant-DOC contour-following",
      },
      id_bore_rough: {
        primary: "turn_rough_internal",
        alternative: ["turn_finish_internal"],
        reason: "Internal roughing with boring bar L/D awareness",
      },
      face_stock_rough: {
        primary: "turn_rough_face",
        alternative: ["turn_rough_external"],
        reason: "Face roughing in radial steps with X-axis dominant motion",
      },
      od_finish: {
        primary: "turn_finish_external",
        alternative: ["turn_profile_recursive"],
        reason: "OD finishing with corner feed reduction and nose-radius compensation",
      },
      id_finish: {
        primary: "turn_finish_internal",
        alternative: [],
        reason: "Bore finishing pass; flags resonance risk on long boring bars",
      },
      face_finish: {
        primary: "turn_finish_face",
        alternative: ["turn_rough_face"],
        reason: "Single-pass face finish with optional nose-radius compensation",
      },
      od_groove: {
        primary: "turn_groove_external",
        alternative: ["turn_part_off"],
        reason: "OD grooving with peck/plunge strategies and dwell at depth",
      },
      face_groove: {
        primary: "turn_groove_face",
        alternative: [],
        reason: "Face grooving with radial stepping for wider grooves",
      },
      part_off: {
        primary: "turn_part_off",
        alternative: ["turn_groove_external"],
        reason: "Cut-off with feed reduction at break and optional sub-spindle catch",
      },
      od_thread: {
        primary: "turn_thread_external",
        alternative: [],
        reason: "External single-point threading G76, modified-flank infeed default",
      },
      id_thread: {
        primary: "turn_thread_internal",
        alternative: [],
        reason: "Internal threading with boring-bar deflection awareness",
      },
      axial_hole_on_center: {
        primary: "turn_drill_axial",
        alternative: [],
        reason: "On-center axial drilling with peck cycles for chip evacuation",
      },
      near_net_forging: {
        primary: "turn_profile_recursive",
        alternative: ["turn_rough_external"],
        reason: "Stock-following recursive roughing minimizes air time on near-net forgings",
      },
    };
    return map[String(feature)] ?? {
      primary: "turn_rough_external",
      alternative: ["turn_finish_external"],
      reason: `Unknown feature '${feature}' — defaulting to general OD rough turning`,
    };
  }

  /**
   * calculateCSS — constant-surface-speed RPM at a given diameter,
   * clamped to spindle_max_rpm. Returns RPM and the actual surface speed achieved.
   *
   * RPM = (vc * 1000) / (π * D_mm)
   *
   * If RPM exceeds max, the result is capped and surface_speed_actual reflects
   * the achievable speed at that RPM.
   */
  static calculateCSS(diameter_mm: number, css_m_per_min: number, max_rpm: number): CSSResult | { error: string } {
    if (!Number.isFinite(diameter_mm) || diameter_mm <= 0) {
      return { error: "diameter_mm must be a positive finite number" };
    }
    if (!Number.isFinite(css_m_per_min) || css_m_per_min <= 0) {
      return { error: "css_m_per_min must be a positive finite number" };
    }
    if (!Number.isFinite(max_rpm) || max_rpm <= 0) {
      return { error: "max_rpm must be a positive finite number" };
    }
    const ideal_rpm = (css_m_per_min * 1000) / (Math.PI * diameter_mm);
    const capped = ideal_rpm > max_rpm;
    const rpm = capped ? max_rpm : ideal_rpm;
    const actual_surface = (Math.PI * diameter_mm * rpm) / 1000;
    return {
      rpm_at_diameter: rpm,
      capped_at_max: capped,
      surface_speed_actual_m_per_min: actual_surface,
      diameter_mm,
      css_m_per_min,
      max_rpm,
    };
  }

  /**
   * boringBarLDRatio — classify boring bar L/D and recommend a DOC reduction
   * factor to keep deflection in check. Standard guidance:
   *
   *   L/D ≤ 4   safe       (×1.0 DOC)
   *   L/D ≤ 6   caution    (×0.75 DOC)
   *   L/D ≤ 8   warning    (×0.5 DOC)
   *   L/D > 8   critical   (×0.25 DOC, recommend damped bar)
   */
  static boringBarLDRatio(overhang_mm: number, bar_diameter_mm: number): BoringBarResult | { error: string } {
    if (!Number.isFinite(overhang_mm) || overhang_mm <= 0) {
      return { error: "overhang_mm must be a positive finite number" };
    }
    if (!Number.isFinite(bar_diameter_mm) || bar_diameter_mm <= 0) {
      return { error: "bar_diameter_mm must be a positive finite number" };
    }
    const ld = overhang_mm / bar_diameter_mm;
    let classification: BoringBarResult["classification"];
    let factor: number;
    let rec: string;
    if (ld <= 4) { classification = "safe"; factor = 1.0; rec = "Steel bar acceptable; full DOC permitted."; }
    else if (ld <= 6) { classification = "caution"; factor = 0.75; rec = "Reduce DOC ~25%; consider carbide bar."; }
    else if (ld <= 8) { classification = "warning"; factor = 0.5; rec = "Reduce DOC ~50%; carbide or damped bar strongly recommended."; }
    else { classification = "critical"; factor = 0.25; rec = "Damped/anti-vibration bar required; reduce DOC to 25% and feed to 50%."; }
    return {
      ld_ratio: ld,
      classification,
      recommended_doc_factor: factor,
      recommendation: rec,
    };
  }

  /**
   * threadPassSchedule — generate a constant-chip-area infeed schedule.
   *
   * Sandvik canonical formula: doc_n = first_doc * sqrt(1/n)
   *
   * Pass count grows until cumulative depth ≥ total depth-of-thread, with
   * a min_doc floor that clamps the smallest cut.
   */
  static threadPassSchedule(
    depth_of_thread_mm: number,
    first_pass_doc_mm: number,
    min_doc_mm: number,
    spring_passes = 1,
  ): ThreadPassPlan | { error: string } {
    if (!Number.isFinite(depth_of_thread_mm) || depth_of_thread_mm <= 0) {
      return { error: "depth_of_thread_mm must be a positive finite number" };
    }
    if (!Number.isFinite(first_pass_doc_mm) || first_pass_doc_mm <= 0) {
      return { error: "first_pass_doc_mm must be a positive finite number" };
    }
    if (!Number.isFinite(min_doc_mm) || min_doc_mm <= 0) {
      return { error: "min_doc_mm must be a positive finite number" };
    }
    if (first_pass_doc_mm >= depth_of_thread_mm) {
      return { error: "first_pass_doc_mm must be less than depth_of_thread_mm" };
    }
    if (!Number.isFinite(spring_passes) || spring_passes < 0 || spring_passes > 10) {
      return { error: "spring_passes must be 0..10" };
    }
    const passes: ThreadPassPlan["passes"] = [];
    let cumulative = 0;
    let n = 1;
    while (cumulative < depth_of_thread_mm && n < 200) {
      let doc = first_pass_doc_mm * Math.sqrt(1 / n);
      if (doc < min_doc_mm) doc = min_doc_mm;
      if (cumulative + doc > depth_of_thread_mm) {
        doc = depth_of_thread_mm - cumulative;
      }
      cumulative += doc;
      passes.push({
        pass_index: n,
        doc_mm: doc,
        cumulative_depth_mm: cumulative,
      });
      n++;
    }
    return {
      pass_count: passes.length,
      passes,
      spring_passes,
      total_depth_mm: cumulative,
    };
  }
}

export const solidCAMTurningFunctionIndexEngine = SolidCAMTurningFunctionIndexEngine;
