/**
 * ESPRITFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM53
 *
 * Unified index aggregating 4 ESPRIT section catalogs:
 *   - Milling              (U-CAM49) → 8 ops, 87 params
 *   - Lathe / Mill-Turn    (U-CAM50) → 9 ops, 85 params
 *   - Wire EDM             (U-CAM51) → 8 ops, 59 params
 *   - Knowledge-Based Machining (U-CAM52) → 7 ops, 48 params
 *
 *   Total: 4 sections, 32 operations, 279 parameters.
 *
 * Methods:
 *   getManifest(): full manifest including totals
 *   getSectionList(): sorted section keys
 *   getSectionStats(section_key): per-section ops/params
 *   getAllOperations(): flat list across all sections
 *   findOperation(operation_id): cross-section operation lookup
 *   findParameterAcrossSections(parameter_name, limit): cross-section search
 *   getCategoryUniverse(): every category across every section
 *   recommendForFeature(feature, hint): route to (section, operation_id)
 *   validateConsistency(): manifest vs actual + duplicate-id detection
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
    path.resolve(__dirname, "../../data/cam-functions/esprit"),
    path.resolve(__dirname, "../data/cam-functions/esprit"),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error("ESPRITFunctionIndexEngine: data/cam-functions/esprit not found");
}

function loadManifest(): any {
  if (_manifest) return _manifest;
  const p = path.join(dataDir(), "function-index.json");
  if (!fs.existsSync(p)) {
    throw new Error(`ESPRITFunctionIndexEngine: function-index.json missing at ${p}`);
  }
  _manifest = JSON.parse(fs.readFileSync(p, "utf8"));
  return _manifest;
}

function loadSection(section_key: string): any | null {
  if (_sectionCache[section_key]) return _sectionCache[section_key];
  const m = loadManifest();
  const section = m.sections?.[section_key];
  if (!section) return null;
  const p = path.join(dataDir(), section.catalog_path);
  if (!fs.existsSync(p)) return null;
  _sectionCache[section_key] = JSON.parse(fs.readFileSync(p, "utf8"));
  return _sectionCache[section_key];
}

export interface ESPRITOperationRef {
  section_key: string;
  operation_id: string;
  category: string;
  parameter_count: number;
  display_name: string;
}

export interface ESPRITConsistencyReport {
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

export interface ESPRITFeatureRecommendation {
  section_key: string | null;
  operation_id: string | null;
  reason: string;
  alternatives: Array<{ section_key: string; operation_id: string }>;
}

export class ESPRITFunctionIndexEngine {
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

  static getAllOperations(): ESPRITOperationRef[] {
    const m = loadManifest();
    const out: ESPRITOperationRef[] = [];
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

  static findOperation(operation_id: string): { found: boolean; matches: ESPRITOperationRef[] } {
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
   * recommendForFeature — cross-section routing.
   *   First-match wins; remaining matches become alternatives.
   */
  static recommendForFeature(feature: string, hint?: string): ESPRITFeatureRecommendation {
    const f = String(feature).toLowerCase();
    const h = String(hint ?? "").toLowerCase();

    const rules: Array<{ pred: () => boolean; section: string; op: string; reason: string }> = [
      // Milling
      { pred: () => f.includes("profitmilling") || f.includes("adaptive_rough"), section: "milling", op: "profitmilling_pocket", reason: "ProfitMilling adaptive clearing." },
      { pred: () => f.includes("pocket_2_5d") || f.includes("2.5d_pocket"), section: "milling", op: "pocket_2_5d", reason: "2.5D pocket." },
      { pred: () => f.includes("profile_2d") || f.includes("contour_2d"), section: "milling", op: "profile_2_5d", reason: "2.5D profile contour." },
      { pred: () => f.includes("face_mill") || f.includes("face_top"), section: "milling", op: "facing_2_5d", reason: "2.5D facing." },
      { pred: () => f.includes("rough_3d") || f.includes("cavity_zlevel"), section: "milling", op: "rough_3d_zlevel", reason: "3D Z-level cavity roughing." },
      { pred: () => f.includes("finish_3d") || f.includes("steep_shallow"), section: "milling", op: "finish_3d_steep_shallow", reason: "Steep & Shallow finishing." },
      { pred: () => f.includes("five_axis") || f.includes("swarf") || f.includes("5axis_swarf"), section: "milling", op: "five_axis_swarf", reason: "5-axis swarf." },
      { pred: () => f.includes("drill_canned") || f.includes("canned_drill"), section: "milling", op: "drilling_canned", reason: "Canned drilling cycle." },
      // Lathe / Mill-Turn
      { pred: () => f.includes("turn_rough") || f.includes("od_rough"), section: "lathe_millturn", op: "turn_rough_od", reason: "OD roughing G71-style." },
      { pred: () => f.includes("turn_finish") || f.includes("od_finish"), section: "lathe_millturn", op: "turn_finish_od", reason: "OD finishing G70-style." },
      { pred: () => f.includes("groove") || f.includes("part_off"), section: "lathe_millturn", op: "groove_part_off", reason: "Grooving / parting." },
      { pred: () => f.includes("thread_single") || f.includes("g76"), section: "lathe_millturn", op: "thread_single_point", reason: "Single-point threading G76." },
      { pred: () => f.includes("drill_axial") || f.includes("lathe_drill"), section: "lathe_millturn", op: "drill_axial", reason: "Axial drilling on lathe." },
      { pred: () => f.includes("millturn_radial") || f.includes("polar_interp"), section: "lathe_millturn", op: "millturn_radial_milling", reason: "Mill-turn radial live-tool." },
      { pred: () => f.includes("millturn_y") || f.includes("y_axis_pocket"), section: "lathe_millturn", op: "millturn_y_axis_pocket", reason: "Mill-turn Y-axis pocketing." },
      { pred: () => f.includes("swiss") || f.includes("sub_spindle"), section: "lathe_millturn", op: "swiss_main_sub_handoff", reason: "Swiss main↔sub handoff." },
      { pred: () => f.includes("channel_sync") || f.includes("multichannel"), section: "lathe_millturn", op: "channel_synchronization", reason: "Multi-channel sync." },
      // Wire EDM
      { pred: () => f.includes("wire_2axis") || f.includes("wire_xy"), section: "wire_edm", op: "wire_2axis_cut", reason: "2-axis wire cut." },
      { pred: () => f.includes("wire_taper") || f.includes("4axis_taper") || f.includes("uv_cut"), section: "wire_edm", op: "wire_4axis_taper", reason: "4-axis taper cut." },
      { pred: () => f.includes("skim") || f.includes("skim_pass"), section: "wire_edm", op: "wire_skim_pass", reason: "Skim pass schedule." },
      { pred: () => f.includes("auto_route") || f.includes("multi_cavity"), section: "wire_edm", op: "wire_auto_route", reason: "Multi-cavity auto routing." },
      { pred: () => f.includes("punch_die") || f.includes("stamping_pair"), section: "wire_edm", op: "wire_punch_die", reason: "Punch/die pair generation." },
      { pred: () => f.includes("wire_tech") || f.includes("generator_setting"), section: "wire_edm", op: "wire_technology_select", reason: "Wire EDM technology table." },
      { pred: () => f.includes("wire_break") || f.includes("rethread"), section: "wire_edm", op: "wire_break_recovery", reason: "Wire break recovery strategy." },
      { pred: () => f.includes("corner_strategy") || f.includes("inside_corner"), section: "wire_edm", op: "wire_corner_strategy", reason: "Inside-corner strategy." },
      // KBM
      { pred: () => f.includes("recognize_features") || f.includes("auto_fbr"), section: "knowledge_based_machining", op: "kbm_recognize_features", reason: "Auto feature recognition." },
      { pred: () => f.includes("apply_template") || f.includes("strategy_template"), section: "knowledge_based_machining", op: "kbm_apply_strategy", reason: "Apply strategy template." },
      { pred: () => f.includes("save_template"), section: "knowledge_based_machining", op: "kbm_save_template", reason: "Save strategy template." },
      { pred: () => f.includes("macro_chain") || f.includes("recipe"), section: "knowledge_based_machining", op: "kbm_macro_chain", reason: "Macro chain recipe." },
      { pred: () => f.includes("probe") || f.includes("inspection"), section: "knowledge_based_machining", op: "kbm_probe_inspection", reason: "Probe inspection routine." },
      { pred: () => f.includes("stock_track") || f.includes("voxel_track"), section: "knowledge_based_machining", op: "kbm_stock_track", reason: "Stock model tracking." },
      { pred: () => f.includes("tool_optimize") || f.includes("consolidate_tools"), section: "knowledge_based_machining", op: "kbm_tool_optimize", reason: "Tool list optimization." },
      // Hint-driven fallbacks
      { pred: () => h === "mill" || h === "milling", section: "milling", op: "pocket_2_5d", reason: "Hint='mill' — defaulting to 2.5D pocket." },
      { pred: () => h === "lathe" || h === "turn" || h === "turning", section: "lathe_millturn", op: "turn_rough_od", reason: "Hint='lathe' — defaulting to OD roughing." },
      { pred: () => h === "wedm" || h === "wire_edm" || h === "wire-edm", section: "wire_edm", op: "wire_2axis_cut", reason: "Hint='wedm' — defaulting to 2-axis cut." },
      { pred: () => h === "kbm" || h === "automation", section: "knowledge_based_machining", op: "kbm_recognize_features", reason: "Hint='kbm' — defaulting to feature recognition." },
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
        reason: `No routing rule matched feature='${feature}' hint='${hint ?? ""}'.`,
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

  static validateConsistency(): ESPRITConsistencyReport {
    const m = loadManifest();
    const sectionKeys = Object.keys(m.sections);
    const id_to_sections = new Map<string, string[]>();
    let actualOps = 0;
    let actualParams = 0;
    const missing: string[] = [];

    for (const section_key of sectionKeys) {
      const sec = loadSection(section_key);
      if (!sec) {
        missing.push(m.sections[section_key].catalog_path);
        continue;
      }
      for (const [op_id, op] of Object.entries(sec.operations || {}) as any) {
        actualOps += 1;
        let opParams = 0;
        for (const tab of Object.values(op.parameters || {}) as any) {
          opParams += Object.keys(tab).length;
        }
        actualParams += opParams;
        const arr = id_to_sections.get(op_id) ?? [];
        arr.push(section_key);
        id_to_sections.set(op_id, arr);
      }
    }

    const duplicates: Array<{ operation_id: string; sections: string[] }> = [];
    for (const [op_id, sections] of id_to_sections.entries()) {
      if (sections.length > 1) duplicates.push({ operation_id: op_id, sections });
    }

    const expected = m.totals ?? {};
    const is_consistent =
      sectionKeys.length === (expected.section_count ?? sectionKeys.length) &&
      actualOps === (expected.operations_count ?? actualOps) &&
      actualParams === (expected.parameters_count ?? actualParams) &&
      duplicates.length === 0 &&
      missing.length === 0;

    return {
      is_consistent,
      manifest_section_count: expected.section_count ?? sectionKeys.length,
      actual_section_count: sectionKeys.length,
      manifest_total_operations: expected.operations_count ?? actualOps,
      actual_total_operations: actualOps,
      manifest_total_parameters: expected.parameters_count ?? actualParams,
      actual_total_parameters: actualParams,
      duplicate_operation_ids: duplicates,
      missing_files: missing,
    };
  }
}

export const espritFunctionIndexEngine = ESPRITFunctionIndexEngine;
