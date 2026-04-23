/**
 * PowerMillFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM46
 *
 * Unified index aggregating all PowerMill section catalogs:
 *   - Roughing       (U-CAM43) → roughing.json    12 ops, 189 params
 *   - Finishing      (U-CAM44) → finishing.json   12 ops, 180 params
 *   - 5-axis & Robot (U-CAM45) → 5axis-robot.json 12 ops, 187 params
 *
 *   Total: 3 sections, 36 operations, 556 parameters.
 *
 * Methods:
 *   - getManifest(): full manifest including expected totals
 *   - getSectionList(): sorted section keys
 *   - getSectionStats(section_key): per-section ops/params/categories
 *   - getAllOperations(): flat list across all sections
 *   - findOperation(operation_id): cross-section operation lookup
 *   - findParameterAcrossSections(parameter_name, limit): parameter search across sections
 *   - getCategoryUniverse(): every category across every section, deduplicated
 *   - recommendForFeature(feature, hint): route to (section, operation_id)
 *   - validateConsistency(): check declared totals vs actual sums + duplicate-id detection
 */

import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let _manifest: any | null = null;
const _sectionCache: Record<string, any> = {};

function dataDir(): string {
  const candidates = [
    path.resolve(__dirname, "../../data/cam-functions/powermill"),
    path.resolve(__dirname, "../data/cam-functions/powermill"),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error("PowerMillFunctionIndexEngine: data/cam-functions/powermill not found");
}

function loadManifest(): any {
  if (_manifest) return _manifest;
  const p = path.join(dataDir(), "function-index.json");
  if (!fs.existsSync(p)) {
    throw new Error(`PowerMillFunctionIndexEngine: function-index.json missing at ${p}`);
  }
  _manifest = JSON.parse(fs.readFileSync(p, "utf8"));
  return _manifest;
}

function loadSection(section_key: string): any | null {
  if (_sectionCache[section_key]) return _sectionCache[section_key];
  const m = loadManifest();
  const section = m.sections?.[section_key];
  if (!section) return null;
  const p = path.join(dataDir(), section.file);
  if (!fs.existsSync(p)) return null;
  _sectionCache[section_key] = JSON.parse(fs.readFileSync(p, "utf8"));
  return _sectionCache[section_key];
}

export interface PMOperationRef {
  section_key: string;
  operation_id: string;
  category: string;
  parameter_count: number;
  display_name: string;
}

export interface PMConsistencyReport {
  is_consistent: boolean;
  manifest_section_count: number;
  actual_section_count: number;
  manifest_total_operations: number;
  actual_total_operations: number;
  manifest_total_parameters: number;
  actual_total_parameters: number;
  duplicate_operation_ids: Array<{ operation_id: string; sections: string[] }>;
  missing_files: string[];
}

export interface PMFeatureRecommendation {
  section_key: string | null;
  operation_id: string | null;
  reason: string;
  alternatives: Array<{ section_key: string; operation_id: string }>;
}

export class PowerMillFunctionIndexEngine {
  static getManifest(): any {
    return loadManifest();
  }

  static getSectionList(): string[] {
    const m = loadManifest();
    return Object.keys(m.sections).sort();
  }

  static getSectionStats(section_key: string): any {
    const m = loadManifest();
    const s = m.sections?.[section_key];
    if (!s) return { error: `Unknown section: ${section_key}` };
    return { section_key, ...s };
  }

  static getAllOperations(): PMOperationRef[] {
    const m = loadManifest();
    const out: PMOperationRef[] = [];
    for (const section_key of Object.keys(m.sections)) {
      const sec = loadSection(section_key);
      if (!sec) continue;
      for (const [op_id, op] of Object.entries(sec.operations || {}) as any) {
        out.push({
          section_key,
          operation_id: op_id,
          category: op.category ?? "unknown",
          parameter_count: op.parameter_count ?? 0,
          display_name: op.display_name ?? op_id,
        });
      }
    }
    return out;
  }

  static findOperation(operation_id: string): { found: boolean; matches: PMOperationRef[] } {
    const all = this.getAllOperations();
    const matches = all.filter((o) => o.operation_id === operation_id);
    return { found: matches.length > 0, matches };
  }

  static findParameterAcrossSections(
    parameter_name: string,
    limit = 50,
  ): Array<{ section_key: string; operation_id: string; group: string; parameter: string }> {
    const needle = String(parameter_name).toLowerCase();
    const out: Array<{ section_key: string; operation_id: string; group: string; parameter: string }> = [];
    const m = loadManifest();
    for (const section_key of Object.keys(m.sections)) {
      const sec = loadSection(section_key);
      if (!sec) continue;
      for (const [op_id, op] of Object.entries(sec.operations || {}) as any) {
        for (const [grp, params] of Object.entries(op.parameters || {}) as any) {
          for (const pName of Object.keys(params)) {
            if (pName.toLowerCase().includes(needle)) {
              out.push({ section_key, operation_id: op_id, group: grp, parameter: pName });
              if (out.length >= limit) return out;
            }
          }
        }
      }
    }
    return out;
  }

  static getCategoryUniverse(): Array<{ category: string; sections: string[]; operation_count: number }> {
    const m = loadManifest();
    const map = new Map<string, { sections: Set<string>; ops: number }>();
    for (const section_key of Object.keys(m.sections)) {
      const sec = loadSection(section_key);
      if (!sec) continue;
      for (const op of Object.values(sec.operations || {}) as any) {
        const cat = op.category ?? "unknown";
        const e = map.get(cat) ?? { sections: new Set<string>(), ops: 0 };
        e.sections.add(section_key);
        e.ops += 1;
        map.set(cat, e);
      }
    }
    return Array.from(map.entries())
      .map(([category, v]) => ({
        category,
        sections: Array.from(v.sections).sort(),
        operation_count: v.ops,
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }

  /**
   * recommendForFeature — high-level routing across the entire PowerMill
   * function space. Maps a generic intent to (section_key, operation_id).
   *
   * Rules are pure data — manifest stays a thin file-list. First-match wins;
   * remaining matches become alternatives.
   */
  static recommendForFeature(feature: string, hint?: string): PMFeatureRecommendation {
    const f = String(feature).toLowerCase();
    const h = String(hint ?? "").toLowerCase();

    const rules: Array<{ pred: () => boolean; section: string; op: string; reason: string }> = [
      // Roughing intents — by feature shape
      { pred: () => f.includes("vortex") || f.includes("adaptive_rough") || f.includes("hsm_rough") || f.includes("trochoidal_rough"), section: "roughing", op: "vortex_clearance", reason: "Vortex adaptive roughing — constant engagement, deep DOC." },
      { pred: () => f.includes("cavity_rough") || f.includes("general_rough") || f.includes("model_clear"), section: "roughing", op: "model_area_clearance", reason: "Workhorse Model Area Clearance for cavity roughing." },
      { pred: () => f.includes("offset_rough") || f.includes("smooth_rough"), section: "roughing", op: "offset_area_clearance", reason: "Offset Area Clearance — smoother chip load than raster." },
      { pred: () => f.includes("waterline_rough") || f.includes("slice_rough"), section: "roughing", op: "slice_area_clearance", reason: "Z-constant slice clearance for vertical-wall pre-finish." },
      { pred: () => f.includes("plunge_rough") || f.includes("axial_plunge"), section: "roughing", op: "plunge_roughing", reason: "Pure axial plunging when radial cutting is unstable." },
      { pred: () => f.includes("rest_rough") || f.includes("residue_rough"), section: "roughing", op: "rest_roughing", reason: "Rest roughing driven by stock model." },
      { pred: () => f.includes("stock_model"), section: "roughing", op: "stock_model_management", reason: "Stock model management for rest cascade bookkeeping." },
      { pred: () => f.includes("pre_pierce") || f.includes("chip_release_hole"), section: "roughing", op: "drill_for_clearance", reason: "Drill helper for pre-pierce / chip-release." },
      // Finishing intents
      { pred: () => f.includes("steep_shallow") || f.includes("mixed_finish"), section: "finishing", op: "steep_and_shallow", reason: "Steep & Shallow for mixed steep/shallow geometry." },
      { pred: () => f.includes("constant_z_finish") || f.includes("waterline_finish"), section: "finishing", op: "constant_z", reason: "Constant Z waterline for steep walls." },
      { pred: () => f.includes("optimised_constant_z") || f.includes("adaptive_waterline"), section: "finishing", op: "optimised_constant_z", reason: "Optimised Constant Z — adaptive stepdown." },
      { pred: () => f.includes("3d_offset") || f.includes("uniform_cusp"), section: "finishing", op: "offset_3d", reason: "3D Offset for uniform cusp height across surface angles." },
      { pred: () => f.includes("rest_finish_constant_z"), section: "finishing", op: "constant_z_rest", reason: "Constant Z Rest after a bigger tool's pass." },
      { pred: () => f.includes("rest_finish_3d_offset"), section: "finishing", op: "offset_3d_rest", reason: "3D Offset Rest for tight shallow corner residue." },
      { pred: () => f.includes("raster_finish") || f.includes("flat_finish"), section: "finishing", op: "raster_finish", reason: "Raster lace finish — fastest cycle on flat tops." },
      { pred: () => f.includes("radial_finish") || f.includes("dish_bottom"), section: "finishing", op: "radial_finish", reason: "Radial finish for round bosses, dish bottoms, sphere caps." },
      { pred: () => f.includes("spiral_finish") || f.includes("round_pocket_finish"), section: "finishing", op: "spiral_finish", reason: "Continuous spiral on round pockets/bosses — no retracts." },
      { pred: () => f.includes("pattern_finish") || f.includes("user_directed_path"), section: "finishing", op: "pattern_finish", reason: "User-defined wireframe pattern drives the toolpath." },
      { pred: () => f.includes("pencil_finish") || f.includes("internal_corner_cleanup"), section: "finishing", op: "pencil_finish", reason: "Pencil trace along internal sharp edges." },
      { pred: () => f.includes("corner_finish") || f.includes("multi_pass_corner"), section: "finishing", op: "corner_finishing", reason: "Multi-pass corner clear-up driven by reference tool." },
      // 5-axis intents
      { pred: () => f.includes("ruled_swarf") || f.includes("flank_swarf"), section: "5axis_robot", op: "swarf_simul5", reason: "Swarf machining on ruled drive surface." },
      { pred: () => f.includes("impeller") || f.includes("blisk") || f.includes("blade_simul5"), section: "5axis_robot", op: "blade_simul5", reason: "Multi-stage impeller / blisk blade chain." },
      { pred: () => f.includes("port_intake") || f.includes("port_exhaust") || f.includes("cylinder_head_port"), section: "5axis_robot", op: "port_simul5", reason: "Centerline-driven port machining." },
      { pred: () => f.includes("3plus2") || f.includes("3+2") || f.includes("indexed"), section: "5axis_robot", op: "index_3plus2", reason: "3+2 positional indexed machining." },
      { pred: () => f.includes("projection_5axis") || f.includes("project_pattern"), section: "5axis_robot", op: "projection_5axis", reason: "Project 2D pattern onto 3D surface with tilt." },
      { pred: () => f.includes("curve_5axis") || f.includes("engrave_curve"), section: "5axis_robot", op: "curve_5axis", reason: "5-axis curve machining (engrave / deburr / edge break)." },
      { pred: () => f.includes("wireframe_swarf"), section: "5axis_robot", op: "wireframe_swarf", reason: "Wireframe-driven swarf machining." },
      { pred: () => f.includes("tool_axis_overlay") || f.includes("axis_strategy"), section: "5axis_robot", op: "tool_axis_strategy", reason: "Standalone tool-axis policy overlay." },
      // Robot intents
      { pred: () => f.includes("robot_config") || f.includes("robot_setup"), section: "5axis_robot", op: "robot_config", reason: "Robot kinematic chain configuration." },
      { pred: () => f.includes("robot_reach") || f.includes("robot_validate"), section: "5axis_robot", op: "robot_reach", reason: "Robot reach + singularity pre-flight." },
      { pred: () => f.includes("robot_trim") || f.includes("composite_trim"), section: "5axis_robot", op: "robot_trim", reason: "Robot trim machining on composites." },
      { pred: () => f.includes("robot_post") || f.includes("vendor_dialect"), section: "5axis_robot", op: "robot_post", reason: "Robot vendor-native post (RAPID/KRL/TPP/INFORM)." },
      // Hint-driven fallback
      { pred: () => h === "roughing" || h === "rough", section: "roughing", op: "model_area_clearance", reason: "Hint='roughing' — defaulting to MAC." },
      { pred: () => h === "finishing" || h === "finish", section: "finishing", op: "steep_and_shallow", reason: "Hint='finishing' — defaulting to Steep & Shallow." },
      { pred: () => h === "5axis" || h === "5-axis" || h === "simul5", section: "5axis_robot", op: "swarf_simul5", reason: "Hint='5-axis' — defaulting to swarf." },
      { pred: () => h === "robot", section: "5axis_robot", op: "robot_reach", reason: "Hint='robot' — defaulting to reach validation." },
    ];

    let primary: { section: string; op: string; reason: string } | null = null;
    const alternatives: Array<{ section_key: string; operation_id: string }> = [];
    for (const r of rules) {
      try {
        if (!r.pred()) continue;
      } catch { continue; }
      if (!primary) primary = r;
      else alternatives.push({ section_key: r.section, operation_id: r.op });
    }

    if (!primary) {
      return {
        section_key: null,
        operation_id: null,
        reason: `No routing rule matched feature='${feature}' hint='${hint ?? ""}'. Inspect getAllOperations() to pick manually.`,
        alternatives: [],
      };
    }
    return {
      section_key: primary.section,
      operation_id: primary.op,
      reason: primary.reason,
      alternatives,
    };
  }

  /**
   * validateConsistency — verifies the manifest's expected_totals match the
   * sum across actual loaded sections, and detects duplicate operation_ids
   * across different sections.
   */
  static validateConsistency(): PMConsistencyReport {
    const m = loadManifest();
    const sectionKeys = Object.keys(m.sections);
    const id_to_sections = new Map<string, string[]>();
    let actualOps = 0;
    let actualParams = 0;
    const missing: string[] = [];

    for (const section_key of sectionKeys) {
      const sec = loadSection(section_key);
      if (!sec) {
        missing.push(m.sections[section_key].file);
        continue;
      }
      for (const [op_id, op] of Object.entries(sec.operations || {}) as any) {
        actualOps += 1;
        actualParams += op.parameter_count ?? 0;
        const arr = id_to_sections.get(op_id) ?? [];
        arr.push(section_key);
        id_to_sections.set(op_id, arr);
      }
    }

    const duplicates: Array<{ operation_id: string; sections: string[] }> = [];
    for (const [op_id, sections] of id_to_sections.entries()) {
      if (sections.length > 1) duplicates.push({ operation_id: op_id, sections });
    }

    const expected = m.expected_totals ?? {};
    const is_consistent =
      sectionKeys.length === (expected.sections ?? sectionKeys.length) &&
      actualOps === (expected.operations ?? actualOps) &&
      actualParams === (expected.parameters ?? actualParams) &&
      duplicates.length === 0 &&
      missing.length === 0;

    return {
      is_consistent,
      manifest_section_count: expected.sections ?? sectionKeys.length,
      actual_section_count: sectionKeys.length,
      manifest_total_operations: expected.operations ?? actualOps,
      actual_total_operations: actualOps,
      manifest_total_parameters: expected.parameters ?? actualParams,
      actual_total_parameters: actualParams,
      duplicate_operation_ids: duplicates,
      missing_files: missing,
    };
  }
}

export const powerMillFunctionIndexEngine = PowerMillFunctionIndexEngine;
