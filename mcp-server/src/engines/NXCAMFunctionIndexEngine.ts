/**
 * NXCAMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM42
 *
 * Unified index aggregating all NX CAM section catalogs:
 *   - Milling   (U-CAM39) → milling.json   13 ops, 196 params
 *   - Turning   (U-CAM40) → turning.json   12 ops, 159 params
 *   - FBM       (U-CAM41) → fbm.json       12 ops, 165 params
 *
 *   Total: 3 sections, 37 operations, 520 parameters.
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
    path.resolve(__dirname, "../../data/cam-functions/nxcam"),
    path.resolve(__dirname, "../data/cam-functions/nxcam"),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error("NXCAMFunctionIndexEngine: data/cam-functions/nxcam not found");
}

function loadManifest(): any {
  if (_manifest) return _manifest;
  const p = path.join(dataDir(), "function-index.json");
  if (!fs.existsSync(p)) {
    throw new Error(`NXCAMFunctionIndexEngine: function-index.json missing at ${p}`);
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

export interface NXOperationRef {
  section_key: string;
  operation_id: string;
  category: string;
  parameter_count: number;
  display_name: string;
}

export interface NXConsistencyReport {
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

export interface NXFeatureRecommendation {
  section_key: string | null;
  operation_id: string | null;
  reason: string;
  alternatives: Array<{ section_key: string; operation_id: string }>;
}

export class NXCAMFunctionIndexEngine {
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

  static getAllOperations(): NXOperationRef[] {
    const m = loadManifest();
    const out: NXOperationRef[] = [];
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

  static findOperation(operation_id: string): { found: boolean; matches: NXOperationRef[] } {
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
   * recommendForFeature — high-level routing across the entire NX CAM
   * function space. Maps a generic intent to (section_key, operation_id).
   *
   * Routing rules are pure data — the manifest stays a thin file-list.
   * If a hint hits more than one section, the first match wins and the
   * remainder become alternatives.
   */
  static recommendForFeature(feature: string, hint?: string): NXFeatureRecommendation {
    const f = String(feature).toLowerCase();
    const h = String(hint ?? "").toLowerCase();

    const rules: Array<{ pred: () => boolean; section: string; op: string; reason: string }> = [
      // Turning intents — explicit OD/ID/face naming routes to turning.json
      { pred: () => f.includes("od_thread") || f.includes("external_thread"), section: "turning", op: "thread_od", reason: "External threading routed to NX turning section." },
      { pred: () => f.includes("id_thread") || f.includes("internal_thread"), section: "turning", op: "thread_id", reason: "Internal threading routed to NX turning section." },
      { pred: () => f.includes("od_groove") || f.includes("groove_external"), section: "turning", op: "groove_od", reason: "External grooving routed to NX turning section." },
      { pred: () => f.includes("od_finish") || f.includes("finish_external"), section: "turning", op: "finish_turn_od", reason: "External finish turning." },
      { pred: () => f.includes("id_finish") || f.includes("finish_internal") || f.includes("bore_finish"), section: "turning", op: "finish_bore_id", reason: "Internal bore finishing." },
      { pred: () => f.includes("od_rough") || f.includes("rough_external"), section: "turning", op: "rough_turn_od", reason: "External rough turning." },
      { pred: () => f.includes("id_rough") || f.includes("rough_bore"), section: "turning", op: "rough_bore_id", reason: "Internal rough boring." },
      { pred: () => f.includes("face_finish"), section: "turning", op: "finish_face", reason: "Face finish turning." },
      { pred: () => f.includes("face_rough") || f.includes("facing_rough"), section: "turning", op: "rough_face", reason: "Face rough turning." },
      { pred: () => f.includes("centerline_drill") || f.includes("axial_drill"), section: "turning", op: "centerline_drill", reason: "Centerline drilling on a lathe." },
      { pred: () => f.includes("manual_bore"), section: "turning", op: "manual_bore", reason: "Manual single-pass boring." },
      { pred: () => f.includes("teach_mode") || f.includes("teach_path"), section: "turning", op: "teach_mode", reason: "Teach-mode taught-point turning." },
      // Milling intents — by feature shape / strategy keyword
      { pred: () => f.includes("face_top") || f.includes("face_mill") || f.includes("flat_face_mill"), section: "milling", op: "face_milling", reason: "Top-surface face milling." },
      { pred: () => f.includes("rectangular_pocket") || f.includes("planar_pocket"), section: "milling", op: "planar_mill", reason: "Planar mill for prismatic pockets." },
      { pred: () => f.includes("freeform_cavity") || f.includes("3d_cavity") || f.includes("cavity_rough"), section: "milling", op: "cavity_mill", reason: "Cavity mill for freeform cavities." },
      { pred: () => f.includes("steep_wall") || f.includes("waterline"), section: "milling", op: "zlevel_profile", reason: "Z-level waterline for steep walls." },
      { pred: () => f.includes("shallow_surface") || f.includes("3d_finish"), section: "milling", op: "fixed_contour", reason: "Fixed-contour finishing on shallow surfaces." },
      { pred: () => f.includes("impeller") || f.includes("blisk") || f.includes("blade_simul5"), section: "milling", op: "variable_contour", reason: "Variable-contour for impeller/blisk simul-5." },
      { pred: () => f.includes("ruled_swarf") || f.includes("flank_swarf"), section: "milling", op: "swarf_drive", reason: "Swarf drive on ruled wall." },
      { pred: () => f.includes("streamline") || f.includes("flow_finish"), section: "milling", op: "variable_streamline", reason: "Streamline finish following surface flow." },
      { pred: () => f.includes("hsm_rough") || f.includes("trochoidal_rough") || f.includes("adaptive_rough"), section: "milling", op: "adaptive_milling", reason: "Adaptive milling (HSM trochoidal roughing)." },
      { pred: () => f.includes("operator_guided") || f.includes("sequential_path"), section: "milling", op: "sequential_mill", reason: "Sequential mill for hand-built paths." },
      { pred: () => f.includes("profile_2d") || f.includes("planar_finish"), section: "milling", op: "planar_profile", reason: "Planar profile for boundary 2D finishing." },
      // FBM intents — feature-based machining specifics
      { pred: () => f.includes("auto_recognize") || f.includes("auto_fbm") || f.includes("recognize_features"), section: "fbm", op: "auto_feature_recognition", reason: "Whole-body auto feature recognition." },
      { pred: () => f.includes("hole_recognize") || f.includes("hole_fbm"), section: "fbm", op: "hole_feature_recognition", reason: "Hole-only recognizer routed to FBM." },
      { pred: () => f.includes("pocket_recognize") || f.includes("pocket_fbm"), section: "fbm", op: "pocket_feature_recognition", reason: "Pocket-only recognizer routed to FBM." },
      { pred: () => f.includes("paint_faces") || f.includes("face_painting"), section: "fbm", op: "feature_painting", reason: "Face-painting onto an existing FBM feature." },
      { pred: () => f.includes("manual_feature") || f.includes("user_feature"), section: "fbm", op: "manual_feature_create", reason: "Hand-created FBM feature." },
      { pred: () => f.includes("mke_rule") || f.includes("knowledge_rule"), section: "fbm", op: "machining_knowledge_rule", reason: "Single MKE rule edit." },
      { pred: () => f.includes("mke_library") || f.includes("knowledge_library"), section: "fbm", op: "machining_knowledge_library", reason: "MKE library management." },
      { pred: () => f.includes("auto_3d_template") || f.includes("template_auto3d"), section: "fbm", op: "template_auto_3d", reason: "AUTO_3D process-template chain." },
      { pred: () => f.includes("hole_making_template") || f.includes("template_holemaking"), section: "fbm", op: "template_hole_making", reason: "HOLE_MAKING process template." },
      { pred: () => f.includes("template_library"), section: "fbm", op: "template_library_mgmt", reason: "Template-library namespace management." },
      { pred: () => f.includes("feature_group") || f.includes("batch_features"), section: "fbm", op: "feature_group_operation", reason: "Batch operation across grouped features." },
      { pred: () => f.includes("cad_sync") || f.includes("feature_associativity"), section: "fbm", op: "feature_cad_sync", reason: "CAD/feature associativity sync." },
      // Hint-driven fallback
      { pred: () => h === "milling" || h === "mill", section: "milling", op: "cavity_mill", reason: "Hint='milling' — defaulting to cavity mill." },
      { pred: () => h === "turning" || h === "lathe", section: "turning", op: "rough_turn_od", reason: "Hint='turning' — defaulting to OD rough turning." },
      { pred: () => h === "fbm" || h === "feature_based", section: "fbm", op: "auto_feature_recognition", reason: "Hint='fbm' — defaulting to auto recognition." },
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
  static validateConsistency(): NXConsistencyReport {
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

export const nxcamFunctionIndexEngine = NXCAMFunctionIndexEngine;
