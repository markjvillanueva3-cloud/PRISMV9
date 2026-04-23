/**
 * HypermillExtendedFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM48
 *
 * Unified index aggregating 7 modern flat-schema hyperMILL catalogs:
 *   - 2D Operations        (8 ops, 91 params)
 *   - 3D Operations        (6 ops, 61 params)
 *   - Tool Database        (6 ops, 48 params)
 *   - Stock & Fixture      (7 ops, 42 params)
 *   - VIRTUAL Machining    (6 ops, 34 params)
 *   - AUTOMATION Center    (6 ops, 33 params)
 *   - Post Processor       (6 ops, 32 params)
 *
 *   Total: 7 sections, 45 operations, 341 parameters.
 *
 * Distinct from HyperMillFunctionIndexEngine which aggregates the legacy
 * module/menu/dialog catalogs (5axis/maxx/turning) and the v2.0 drilling catalog.
 *
 * Methods:
 *   - getManifest(): full manifest including totals
 *   - getSectionList(): sorted section keys
 *   - getSectionStats(section_key): per-section ops/params
 *   - getAllOperations(): flat list across all sections
 *   - findOperation(operation_id): cross-section operation lookup
 *   - findParameterAcrossSections(parameter_name, limit): parameter search
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
    path.resolve(__dirname, "../../data/cam-functions/hypermill"),
    path.resolve(__dirname, "../data/cam-functions/hypermill"),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error("HypermillExtendedFunctionIndexEngine: data/cam-functions/hypermill not found");
}

function loadManifest(): any {
  if (_manifest) return _manifest;
  const p = path.join(dataDir(), "function-index.json");
  if (!fs.existsSync(p)) {
    throw new Error(`HypermillExtendedFunctionIndexEngine: function-index.json missing at ${p}`);
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

export interface HMOperationRef {
  section_key: string;
  operation_id: string;
  category: string;
  parameter_count: number;
  display_name: string;
}

export interface HMConsistencyReport {
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

export interface HMFeatureRecommendation {
  section_key: string | null;
  operation_id: string | null;
  reason: string;
  alternatives: Array<{ section_key: string; operation_id: string }>;
}

export class HypermillExtendedFunctionIndexEngine {
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

  static getAllOperations(): HMOperationRef[] {
    const m = loadManifest();
    const out: HMOperationRef[] = [];
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

  static findOperation(operation_id: string): { found: boolean; matches: HMOperationRef[] } {
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
   * recommendForFeature — high-level routing across the 7 flat-schema sections.
   * Maps a generic intent to (section_key, operation_id). First-match wins;
   * remaining matches become alternatives.
   */
  static recommendForFeature(feature: string, hint?: string): HMFeatureRecommendation {
    const f = String(feature).toLowerCase();
    const h = String(hint ?? "").toLowerCase();

    const rules: Array<{ pred: () => boolean; section: string; op: string; reason: string }> = [
      // 2D ops
      { pred: () => f.includes("pocket_2d") || f.includes("2.5d_pocket") || f.includes("contour_pocket"), section: "2d_operations", op: "pocket_contour", reason: "2.5D contour pocket — primary 2D pocket strategy." },
      { pred: () => f.includes("face_mill") || f.includes("face_top"), section: "2d_operations", op: "face_milling", reason: "Face milling for top-surface preparation." },
      { pred: () => f.includes("chamfer_2d") || f.includes("edge_break"), section: "2d_operations", op: "chamfer", reason: "Chamfer / edge-break operation." },
      { pred: () => f.includes("engrave") || f.includes("text_marking"), section: "2d_operations", op: "engrave_text", reason: "Engraving / text marking on flat or stepped face." },
      // 3D ops
      { pred: () => f.includes("3d_zlevel_rough") || f.includes("cavity_zlevel"), section: "3d_operations", op: "rough_3d_zlevel", reason: "Z-level cavity roughing." },
      { pred: () => f.includes("adaptive_3d") || f.includes("hsc_rough"), section: "3d_operations", op: "rough_3d_adaptive", reason: "Adaptive HSC roughing — constant engagement." },
      { pred: () => f.includes("steep_finish") || f.includes("waterline_finish"), section: "3d_operations", op: "finish_3d_zlevel", reason: "Z-level waterline finish for ≥30° walls." },
      { pred: () => f.includes("shallow_finish") || f.includes("offset_finish"), section: "3d_operations", op: "finish_3d_offset", reason: "3D offset for <30° shallow surfaces." },
      { pred: () => f.includes("pencil_3d") || f.includes("internal_corner"), section: "3d_operations", op: "finish_3d_pencil", reason: "Pencil trace for internal sharp corners." },
      { pred: () => f.includes("rest_3d") || f.includes("residue_finish"), section: "3d_operations", op: "rest_3d", reason: "3D rest machining driven by stock model." },
      // Tool DB
      { pred: () => f.includes("define_tool") || f.includes("create_tool"), section: "tool_database", op: "tool_define_milling", reason: "Define a milling tool record." },
      { pred: () => f.includes("tool_assembly") || f.includes("holder_assembly"), section: "tool_database", op: "tool_assembly_build", reason: "Build tool/holder/adapter assembly." },
      { pred: () => f.includes("presetter") || f.includes("zoller") || f.includes("tool_measure"), section: "tool_database", op: "tool_measure_presetter", reason: "Import presetter measurement." },
      { pred: () => f.includes("tool_wear") || f.includes("tool_life_track"), section: "tool_database", op: "tool_wear_track", reason: "Track tool wear and remaining life." },
      { pred: () => f.includes("tool_export") || f.includes("iso13399"), section: "tool_database", op: "tool_library_export", reason: "Export tool library (ISO 13399 / TDM)." },
      { pred: () => f.includes("tool_import"), section: "tool_database", op: "tool_library_import", reason: "Import tool library." },
      // Stock & fixture
      { pred: () => f.includes("box_stock") || f.includes("rect_stock"), section: "stock_fixture", op: "stock_box", reason: "Box stock for prismatic parts." },
      { pred: () => f.includes("bar_stock") || f.includes("cylinder_stock"), section: "stock_fixture", op: "stock_cylinder", reason: "Cylindrical bar stock." },
      { pred: () => f.includes("cast_stock") || f.includes("near_net"), section: "stock_fixture", op: "stock_cast_step", reason: "Cast/forged STEP stock import." },
      { pred: () => f.includes("vise") || f.includes("vice_fixture"), section: "stock_fixture", op: "fixture_vise", reason: "Vise fixture definition." },
      { pred: () => f.includes("chuck_fixture") || f.includes("3jaw") || f.includes("collet_chuck"), section: "stock_fixture", op: "fixture_chuck", reason: "Chuck fixture for lathe / mill-turn." },
      { pred: () => f.includes("stock_residue") || f.includes("voxel_track"), section: "stock_fixture", op: "stock_track_residue", reason: "Volumetric stock-residue tracking." },
      { pred: () => f.includes("reclamp") || f.includes("flip_part"), section: "stock_fixture", op: "clamp_strategy_macro", reason: "Reclamp / part-flip macro." },
      // VIRTUAL Machining
      { pred: () => f.includes("kinematic_setup") || f.includes("machine_kinematic"), section: "virtual_machining", op: "vm_machine_kinematic_setup", reason: "Define machine kinematic chain." },
      { pred: () => f.includes("collision_full") || f.includes("full_collision"), section: "virtual_machining", op: "vm_collision_full", reason: "Full-machine collision check." },
      { pred: () => f.includes("collision_quick") || f.includes("tool_stock_collision"), section: "virtual_machining", op: "vm_collision_quick", reason: "Quick tool-stock collision check." },
      { pred: () => f.includes("link_optim") || f.includes("rapid_optim"), section: "virtual_machining", op: "vm_optimize_link", reason: "Optimize linking / air cuts." },
      { pred: () => f.includes("dynamic_feed") || f.includes("look_ahead"), section: "virtual_machining", op: "vm_optimize_dynamics", reason: "Dynamic feed optimization." },
      { pred: () => f.includes("verify_part") || f.includes("post_sim_compare"), section: "virtual_machining", op: "vm_verify_part", reason: "Part verification (post-sim compare)." },
      // AUTOMATION Center
      { pred: () => f.includes("recognize_holes") || f.includes("hole_features"), section: "automation_center", op: "ac_recognize_holes", reason: "Hole feature recognition." },
      { pred: () => f.includes("recognize_pocket") || f.includes("pocket_features"), section: "automation_center", op: "ac_recognize_pockets", reason: "Pocket / slot / boss recognition." },
      { pred: () => f.includes("apply_macro") || f.includes("apply_template"), section: "automation_center", op: "ac_macro_apply", reason: "Apply job template to feature group." },
      { pred: () => f.includes("save_macro") || f.includes("save_template"), section: "automation_center", op: "ac_macro_save", reason: "Save operation chain as macro." },
      { pred: () => f.includes("batch_process") || f.includes("overnight_batch"), section: "automation_center", op: "ac_batch_process", reason: "Batch process multiple parts." },
      { pred: () => f.includes("knowledge_capture") || f.includes("learn_from_runs"), section: "automation_center", op: "ac_knowledge_capture", reason: "Knowledge capture from production runs." },
      // Post processor
      { pred: () => f.includes("define_post"), section: "post_processor", op: "post_define", reason: "Define post processor binding." },
      { pred: () => f.includes("heidenhain"), section: "post_processor", op: "post_dialect_heidenhain", reason: "Heidenhain dialect settings." },
      { pred: () => f.includes("fanuc_dialect") || f.includes("fanuc_post"), section: "post_processor", op: "post_dialect_fanuc", reason: "Fanuc dialect settings." },
      { pred: () => f.includes("generate_program") || f.includes("emit_gcode"), section: "post_processor", op: "post_generate_program", reason: "Generate NC program." },
      { pred: () => f.includes("split_setups") || f.includes("split_program"), section: "post_processor", op: "post_split_setups", reason: "Split program by setup / pallet." },
      { pred: () => f.includes("backplot") || f.includes("verify_post"), section: "post_processor", op: "post_verify_simulate", reason: "Backplot posted G-code." },
      // Hint-driven fallbacks
      { pred: () => h === "2d", section: "2d_operations", op: "pocket_contour", reason: "Hint='2d' — defaulting to contour pocket." },
      { pred: () => h === "3d", section: "3d_operations", op: "rough_3d_adaptive", reason: "Hint='3d' — defaulting to adaptive rough." },
      { pred: () => h === "tool", section: "tool_database", op: "tool_define_milling", reason: "Hint='tool' — defaulting to milling tool definition." },
      { pred: () => h === "fixture" || h === "stock", section: "stock_fixture", op: "stock_box", reason: "Hint='fixture/stock' — defaulting to box stock." },
      { pred: () => h === "verify" || h === "simulate", section: "virtual_machining", op: "vm_collision_full", reason: "Hint='verify/simulate' — defaulting to full collision." },
      { pred: () => h === "automate" || h === "macro", section: "automation_center", op: "ac_macro_apply", reason: "Hint='automate/macro' — defaulting to macro apply." },
      { pred: () => h === "post", section: "post_processor", op: "post_generate_program", reason: "Hint='post' — defaulting to program generation." },
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
   * validateConsistency — verifies the manifest's `totals` match actual sums
   * across loaded sections, and detects duplicate operation_ids across sections.
   */
  static validateConsistency(): HMConsistencyReport {
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
        // Compute actual parameter count from nested structure
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

export const hypermillExtendedFunctionIndexEngine = HypermillExtendedFunctionIndexEngine;
