/**
 * ESPRITMillingFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM49
 *
 * Catalog: 8 milling operations / 86 parameters / 8 categories.
 *
 * Categories: pocket_2_5d, profile_2_5d, facing_2_5d, profitmilling,
 *             roughing_3d, finishing_3d, five_axis, drilling_milling.
 *
 * Methods:
 *   getIndex(): full catalog
 *   getSummary(): { system_id, section_key, total_operations, total_parameters, categories, training_topics_count }
 *   listOperations(): [{operation_id, category, parameter_count, display_name}]
 *   getOperation(operation_id): one op or {error}
 *   getOperationsByCategory(category): filter (case-insensitive)
 *   findParameter(parameter_name, limit): full-text parameter search
 *   recommendByFeature(intent): map intent string → operation_id
 *   classifyDocStrategy(material_iso, hardness_hb): pick rough strategy by material
 *   profitmillingEnvelope(): canonical engagement bounds
 *   selectDrillCycle(L_over_D, blind, tap): map to G81/G82/G83/G73/G84
 */

import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let _catalog: any | null = null;

function dataPath(): string {
  const candidates = [
    path.resolve(__dirname, "../../data/cam-functions/esprit/milling.json"),
    path.resolve(__dirname, "../data/cam-functions/esprit/milling.json"),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  throw new Error("ESPRITMillingFunctionIndexEngine: milling.json not found");
}

function loadCatalog(): any {
  if (_catalog) return _catalog;
  _catalog = JSON.parse(fs.readFileSync(dataPath(), "utf8"));
  return _catalog;
}

export type ESPRITMillIntent =
  | "pocket_2_5d_standard"
  | "profile_contour"
  | "face_top_surface"
  | "profitmilling_adaptive"
  | "rough_3d_cavity"
  | "finish_3d_mixed"
  | "five_axis_swarf_ruled"
  | "drill_holes_canned";

export interface ESPRITMillRecommendation {
  primary: string;
  reason: string;
  alternatives: string[];
}

export class ESPRITMillingFunctionIndexEngine {
  static getIndex(): any {
    return loadCatalog();
  }

  static getSummary(): any {
    const c = loadCatalog();
    let totalParams = 0;
    for (const op of Object.values(c.operations) as any) totalParams += op.parameter_count ?? 0;
    return {
      system_id: c.system_id,
      section_key: c.section_key,
      total_operations: Object.keys(c.operations).length,
      total_parameters: totalParams,
      categories: c.categories,
      training_topics_count: (c.training_topics ?? []).length,
    };
  }

  static listOperations(): Array<{ operation_id: string; category: string; parameter_count: number; display_name: string }> {
    const c = loadCatalog();
    return Object.entries(c.operations).map(([id, op]: [string, any]) => ({
      operation_id: id,
      category: op.category,
      parameter_count: op.parameter_count,
      display_name: op.display_name,
    }));
  }

  static getOperation(operation_id: string): any {
    const c = loadCatalog();
    const op = c.operations[operation_id];
    if (!op) return { error: `Unknown operation_id: ${operation_id}` };
    return { operation_id, ...op };
  }

  static getOperationsByCategory(category: string): Array<{ operation_id: string; parameter_count: number; display_name: string }> {
    const target = String(category).toLowerCase();
    const c = loadCatalog();
    const out: Array<{ operation_id: string; parameter_count: number; display_name: string }> = [];
    for (const [id, op] of Object.entries(c.operations) as any) {
      if ((op.category ?? "").toLowerCase() === target) {
        out.push({ operation_id: id, parameter_count: op.parameter_count, display_name: op.display_name });
      }
    }
    return out;
  }

  static findParameter(
    parameter_name: string,
    limit = 50,
  ): Array<{ operation_id: string; group: string; parameter: string }> {
    const needle = String(parameter_name).toLowerCase();
    const c = loadCatalog();
    const out: Array<{ operation_id: string; group: string; parameter: string }> = [];
    for (const [id, op] of Object.entries(c.operations) as any) {
      for (const [grp, params] of Object.entries(op.parameters || {}) as any) {
        for (const pName of Object.keys(params)) {
          if (pName.toLowerCase().includes(needle)) {
            out.push({ operation_id: id, group: grp, parameter: pName });
            if (out.length >= limit) return out;
          }
        }
      }
    }
    return out;
  }

  static recommendByFeature(intent: ESPRITMillIntent | string): ESPRITMillRecommendation {
    const map: Record<string, { primary: string; reason: string; alts: string[] }> = {
      pocket_2_5d_standard: {
        primary: "pocket_2_5d",
        reason: "Standard 2.5D pocket — offset / parallel / spiral patterns.",
        alts: ["profitmilling_pocket"],
      },
      profile_contour: {
        primary: "profile_2_5d",
        reason: "2.5D profile / contour with cutter compensation.",
        alts: [],
      },
      face_top_surface: {
        primary: "facing_2_5d",
        reason: "2.5D facing for top-surface preparation.",
        alts: [],
      },
      profitmilling_adaptive: {
        primary: "profitmilling_pocket",
        reason: "ProfitMilling adaptive clearing — 5× tool life on hardened steel.",
        alts: ["pocket_2_5d", "rough_3d_zlevel"],
      },
      rough_3d_cavity: {
        primary: "rough_3d_zlevel",
        reason: "3D Z-level cavity roughing with stock awareness.",
        alts: ["profitmilling_pocket"],
      },
      finish_3d_mixed: {
        primary: "finish_3d_steep_shallow",
        reason: "Steep & Shallow auto-routes Z-level + 3D offset by surface angle.",
        alts: [],
      },
      five_axis_swarf_ruled: {
        primary: "five_axis_swarf",
        reason: "5-axis swarf on ruled drive surface — RTCP required.",
        alts: [],
      },
      drill_holes_canned: {
        primary: "drilling_canned",
        reason: "Canned drilling cycle (G81/G82/G83/G73/G84/G85).",
        alts: [],
      },
    };
    const hit = map[intent];
    if (hit) {
      return { primary: hit.primary, reason: hit.reason, alternatives: hit.alts };
    }
    return {
      primary: "pocket_2_5d",
      reason: `Unknown intent='${intent}', defaulting to standard 2.5D pocket.`,
      alternatives: [],
    };
  }

  /**
   * classifyDocStrategy — pick rough strategy by material ISO group + hardness.
   *  - Hardened (HB ≥ 40 HRC ≈ 380 HB): ProfitMilling adaptive.
   *  - General steel/Al: 3D Z-level rough is fine.
   *  - Soft Al (HB < 100): pocket_2_5d at 75% stepover.
   */
  static classifyDocStrategy(material_iso: "P" | "M" | "K" | "N" | "S" | "H", hardness_hb: number): {
    primary: string;
    rationale: string;
    suggested_radial_engagement_pct?: number;
  } {
    if (typeof hardness_hb !== "number" || !Number.isFinite(hardness_hb) || hardness_hb < 0) {
      return { primary: "pocket_2_5d", rationale: "Invalid hardness — defaulting to 2.5D pocket." };
    }
    if (material_iso === "H" || hardness_hb >= 380) {
      return {
        primary: "profitmilling_pocket",
        rationale: `Hardened (HB=${hardness_hb}) → ProfitMilling adaptive at ≤10% radial.`,
        suggested_radial_engagement_pct: 10,
      };
    }
    if (material_iso === "S") {
      return {
        primary: "profitmilling_pocket",
        rationale: `ISO-S superalloy → ProfitMilling at ≤8% radial to manage heat.`,
        suggested_radial_engagement_pct: 8,
      };
    }
    if (material_iso === "N" && hardness_hb < 100) {
      return {
        primary: "pocket_2_5d",
        rationale: `Soft aluminum (HB=${hardness_hb}) → standard 2.5D pocket at 75% stepover.`,
        suggested_radial_engagement_pct: 75,
      };
    }
    return {
      primary: "rough_3d_zlevel",
      rationale: `General ISO-${material_iso} (HB=${hardness_hb}) → 3D Z-level roughing at 50% stepover.`,
      suggested_radial_engagement_pct: 50,
    };
  }

  static profitmillingEnvelope(): {
    max_radial_engagement_pct: number;
    max_axial_doc_to_dia: number;
    smooth_corners_required: boolean;
    citation: string;
  } {
    return {
      max_radial_engagement_pct: 10,
      max_axial_doc_to_dia: 2,
      smooth_corners_required: true,
      citation: "ESPRIT TNG ProfitMilling reference, canonical envelope",
    };
  }

  static selectDrillCycle(L_over_D: number, blind: boolean, tap: boolean): {
    cycle: string;
    rationale: string;
    L_over_D: number;
  } {
    if (typeof L_over_D !== "number" || !Number.isFinite(L_over_D) || L_over_D <= 0) {
      return { cycle: "G81_drill", rationale: "Invalid L/D — defaulting to G81.", L_over_D: 0 };
    }
    if (tap) {
      return { cycle: "G84_tap", rationale: "Tap requested — G84 rigid tap.", L_over_D };
    }
    if (L_over_D > 4) {
      return { cycle: "G83_deep_peck", rationale: `L/D=${L_over_D} > 4 → G83 deep peck for chip evacuation.`, L_over_D };
    }
    if (L_over_D > 2) {
      return { cycle: "G73_high_speed_peck", rationale: `L/D=${L_over_D} > 2 → G73 high-speed peck.`, L_over_D };
    }
    if (blind) {
      return { cycle: "G82_drill_dwell", rationale: "Blind hole — G82 drill with dwell for size hold.", L_over_D };
    }
    return { cycle: "G81_drill", rationale: "Through hole, low L/D — G81 simple drill.", L_over_D };
  }
}

export const espritMillingFunctionIndexEngine = ESPRITMillingFunctionIndexEngine;
