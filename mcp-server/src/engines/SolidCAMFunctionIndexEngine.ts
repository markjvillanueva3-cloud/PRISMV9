/**
 * SolidCAMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM38
 *
 * Unified index aggregating all SolidCAM section catalogs:
 *   - 2.5D operations          (U-CAM33)  → 2.5d-operations.json    12 ops, 209 params
 *   - 3D HSS/HSR               (U-CAM35)  → 3d-hss-hsr.json         13 ops, 325 params
 *   - 5-axis                   (U-CAM36)  → 5-axis.json             12 ops, 300 params
 *   - iMachining               (separate) → imachining.json          4 ops, 129 params
 *   - Turning                  (U-CAM37)  → turning.json            13 ops, 232 params
 *   - Mill-turn                (U-CAM37)  → millturn.json           12 ops, 188 params
 *
 *   Total: 6 sections, 66 operations, 1,383 parameters.
 *
 * Methods:
 *   - getManifest(): full manifest including expected totals
 *   - getSectionStats(section_key): per-section ops/params/categories
 *   - getAllOperations(): flat list across all sections
 *   - findOperation(operation_id): cross-section operation lookup
 *   - findParameterAcrossSections(parameter_name): parameter search across sections
 *   - recommendForFeature(feature, hint): route to (section, operation_id)
 *   - validateConsistency(): check declared totals vs actual sums + duplicate-id detection
 *   - getCategoryUniverse(): every category across every section, deduplicated
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
    path.resolve(__dirname, "../../data/cam-functions/solidcam"),
    path.resolve(__dirname, "../data/cam-functions/solidcam"),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error("SolidCAMFunctionIndexEngine: data/cam-functions/solidcam not found");
}

function loadManifest(): any {
  if (_manifest) return _manifest;
  const p = path.join(dataDir(), "function-index.json");
  if (!fs.existsSync(p)) {
    throw new Error(`SolidCAMFunctionIndexEngine: function-index.json missing at ${p}`);
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

export interface OperationRef {
  section_key: string;
  operation_id: string;
  category: string;
  parameter_count: number;
  display_name: string;
}

export interface ConsistencyReport {
  is_consistent: boolean;
  manifest_section_count: number;
  actual_section_count: number;
  manifest_total_operations: number;
  actual_total_operations: number;
  manifest_total_parameters: number;
  actual_total_parameters: number;
  duplicate_operation_ids: Array<{ operation_id: string; sections: string[] }>;
  missing_files: string[];

  /** CAM-EXHAUST-MS0/U-CAM56: section-level category coverage. */
  sections_missing_categories: string[];
  /** Per-op categories not declared in their catalog's top-level categories[]. */
  orphan_categories: Array<{ section_key: string; operation_id: string; category: string }>;
  /** Sections where manifest's categories[] != catalog top-level categories[]. */
  manifest_catalog_category_mismatches: Array<{ section_key: string; in_manifest_only: string[]; in_catalog_only: string[] }>;
}

export interface FeatureRecommendation {
  section_key: string | null;
  operation_id: string | null;
  reason: string;
  alternatives: Array<{ section_key: string; operation_id: string }>;
}

export class SolidCAMFunctionIndexEngine {
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

  static getAllOperations(): OperationRef[] {
    const m = loadManifest();
    const out: OperationRef[] = [];
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

  static findOperation(operation_id: string): { found: boolean; matches: OperationRef[] } {
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
   * recommendForFeature — high-level routing across the entire SolidCAM
   * function space. Maps a generic intent to (section_key, operation_id).
   *
   * Routing rules are pure data — kept inline so the manifest stays a thin
   * file-list. If a hint hits more than one section, the first match wins
   * and the others become alternatives.
   */
  static recommendForFeature(feature: string, hint?: string): FeatureRecommendation {
    const f = String(feature).toLowerCase();
    const h = String(hint ?? "").toLowerCase();

    // Routing table: (predicate over feature/hint) → (section, op, reason)
    const rules: Array<{ pred: () => boolean; section: string; op: string; reason: string }> = [
      // Turning intents
      { pred: () => f.includes("od_thread") || f.includes("external_thread"), section: "turning", op: "turn_thread_external", reason: "External threading routed to turning section." },
      { pred: () => f.includes("id_thread") || f.includes("internal_thread"), section: "turning", op: "turn_thread_internal", reason: "Internal threading routed to turning section." },
      { pred: () => f.includes("part_off") || f.includes("cut_off"), section: "turning", op: "turn_part_off", reason: "Cut-off / part-off routed to turning section." },
      { pred: () => f.includes("od_groove") || f.includes("groove_external"), section: "turning", op: "turn_groove_external", reason: "External grooving routed to turning section." },
      { pred: () => f.includes("rough_external") || f.includes("od_rough"), section: "turning", op: "turn_rough_external", reason: "External rough turning." },
      // Mill-turn
      { pred: () => f.includes("sub_spindle") || f.includes("pickup"), section: "millturn", op: "mt_sub_spindle_pickup", reason: "Sub-spindle pickup routed to mill-turn section." },
      { pred: () => f.includes("balanced_turning") || f.includes("two_turret"), section: "millturn", op: "mt_balanced_turning", reason: "Balanced turning (multi-channel) routed to mill-turn." },
      { pred: () => f.includes("swiss") || f.includes("sliding_headstock"), section: "millturn", op: "mt_swiss_type_turning", reason: "Swiss-type sliding headstock routed to mill-turn." },
      { pred: () => f.includes("c_axis") || f.includes("polar"), section: "millturn", op: "mt_c_axis_polar_milling", reason: "C-axis polar milling." },
      { pred: () => f.includes("y_axis"), section: "millturn", op: "mt_y_axis_milling", reason: "True Y-axis milling." },
      // 5-axis
      { pred: () => f.includes("impeller") || f.includes("blisk") || f.includes("multiblade"), section: "5-axis", op: "5x_multiblade", reason: "Impeller/blisk routed to 5-axis multiblade." },
      { pred: () => f.includes("port") || f.includes("intake_port") || f.includes("exhaust_port"), section: "5-axis", op: "5x_port", reason: "Port machining routed to 5-axis port cycle." },
      { pred: () => f.includes("undercut") || f.includes("t_slot"), section: "5-axis", op: "5x_undercut", reason: "Undercut routed to 5-axis undercut cycle." },
      { pred: () => f.includes("ruled_wall") || f.includes("swarf"), section: "5-axis", op: "5x_swarf", reason: "Ruled wall / swarf routed to 5-axis swarf." },
      { pred: () => f.includes("indexed") || f.includes("3plus2") || f.includes("3+2"), section: "5-axis", op: "5x_indexed_3plus2", reason: "3+2 positional routed to 5-axis indexed." },
      // iMachining
      { pred: () => h.includes("imachining") || f.includes("imachining"), section: "imachining", op: "imachining_2d", reason: "iMachining-tagged feature routed to iMachining catalog." },
    ];

    // Find first matching rule, then collect remaining matches as alternatives
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
        reason: `No routing rule matched feature='${feature}' hint='${hint ?? ""}'. Try inspecting getAllOperations() and pick manually.`,
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
  static validateConsistency(): ConsistencyReport {
    const m = loadManifest();
    const sectionKeys = Object.keys(m.sections);
    const id_to_sections = new Map<string, string[]>();
    let actualOps = 0;
    let actualParams = 0;
    const missing: string[] = [];
    const sections_missing_categories: string[] = [];
    const orphan_categories: Array<{ section_key: string; operation_id: string; category: string }> = [];
    const manifest_catalog_category_mismatches: Array<{ section_key: string; in_manifest_only: string[]; in_catalog_only: string[] }> = [];

    for (const section_key of sectionKeys) {
      const sec = loadSection(section_key);
      if (!sec) {
        missing.push(m.sections[section_key].file);
        continue;
      }
      const catalogCats: string[] = Array.isArray(sec.categories) ? sec.categories : [];
      const catalogCatSet = new Set(catalogCats);
      if (catalogCats.length === 0) sections_missing_categories.push(section_key);

      const manifestCats: string[] = Array.isArray(m.sections[section_key].categories)
        ? m.sections[section_key].categories
        : [];
      const manifestSet = new Set(manifestCats);
      const inManifestOnly = manifestCats.filter((c) => !catalogCatSet.has(c));
      const inCatalogOnly = catalogCats.filter((c) => !manifestSet.has(c));
      if (inManifestOnly.length > 0 || inCatalogOnly.length > 0) {
        manifest_catalog_category_mismatches.push({
          section_key,
          in_manifest_only: inManifestOnly,
          in_catalog_only: inCatalogOnly,
        });
      }

      for (const [op_id, op] of Object.entries(sec.operations || {}) as Array<[string, { parameter_count?: number; category?: string }]>) {
        actualOps += 1;
        actualParams += op.parameter_count ?? 0;
        const arr = id_to_sections.get(op_id) ?? [];
        arr.push(section_key);
        id_to_sections.set(op_id, arr);
        if (op.category && catalogCats.length > 0 && !catalogCatSet.has(op.category)) {
          orphan_categories.push({ section_key, operation_id: op_id, category: op.category });
        }
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
      missing.length === 0 &&
      sections_missing_categories.length === 0 &&
      orphan_categories.length === 0 &&
      manifest_catalog_category_mismatches.length === 0;

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
      sections_missing_categories,
      orphan_categories,
      manifest_catalog_category_mismatches,
    };
  }
}

export const solidCAMFunctionIndexEngine = SolidCAMFunctionIndexEngine;
