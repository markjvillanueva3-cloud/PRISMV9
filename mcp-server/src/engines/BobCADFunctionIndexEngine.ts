/**
 * BobCADFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM55
 *
 * Catalog: 9 ops / 88 parameters / 8 categories.
 *
 * Categories: mill_2_axis, mill_3_axis, mill_dynamic, mill_4_5_axis,
 *             lathe_2_axis, lathe_mill_turn, wire_edm_2axis, wire_edm_4axis.
 *
 * Methods:
 *   getIndex(), getSummary(), listOperations(), getOperation(id),
 *   getOperationsByCategory(cat), findParameter(name, limit),
 *   recommendByFeature(intent),
 *   tierForOperation(operation_id): which BobCAD tier (Standard/Pro/Premium) is required
 *   dynamicMotionEnvelope(): canonical Dynamic Motion adaptive bounds (12% radial, 2×D axial)
 *   wedmLeadStrategy(visibility): perpendicular vs arc lead-in selection
 */

import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let _catalog: any | null = null;

function dataPath(): string {
  const candidates = [
    path.resolve(__dirname, "../../data/cam-functions/bobcad/mill-lathe-wedm.json"),
    path.resolve(__dirname, "../data/cam-functions/bobcad/mill-lathe-wedm.json"),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  throw new Error("BobCADFunctionIndexEngine: mill-lathe-wedm.json not found");
}

function loadCatalog(): any {
  if (_catalog) return _catalog;
  _catalog = JSON.parse(fs.readFileSync(dataPath(), "utf8"));
  return _catalog;
}

export type BobCADIntent =
  | "pocket_2axis"
  | "dynamic_rough"
  | "finish_3d_surface"
  | "five_axis_swarf"
  | "lathe_rough"
  | "lathe_thread"
  | "live_tooling"
  | "wedm_profile"
  | "wedm_taper";

export type BobCADTier = "Mill Standard" | "Mill Pro" | "Mill Premium" | "Lathe Standard" | "Lathe Pro" | "WEDM Standard" | "WEDM Pro";

export interface BobCADRecommendation {
  primary: string;
  reason: string;
  alternatives: string[];
  required_tier: BobCADTier;
}

export class BobCADFunctionIndexEngine {
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
      version: c.version,
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

  /**
   * tierForOperation — which BobCAD purchase tier is required for an operation.
   * BobCAD intentionally gates capabilities by tier (Standard < Pro < Premium).
   */
  static tierForOperation(operation_id: string): { operation_id: string; required_tier: BobCADTier; rationale: string } {
    const tierMap: Record<string, { tier: BobCADTier; reason: string }> = {
      mill_pocket_2axis: { tier: "Mill Standard", reason: "2-axis pocket is part of Standard tier." },
      mill_dynamic_pocket: { tier: "Mill Pro", reason: "Dynamic Motion adaptive clearing requires Pro." },
      mill_3axis_finish: { tier: "Mill Pro", reason: "3-axis surface finishing requires Pro." },
      mill_4_5axis_simul: { tier: "Mill Premium", reason: "Simultaneous 4/5-axis requires Premium." },
      lathe_rough_2axis: { tier: "Lathe Standard", reason: "2-axis turning is part of Standard tier." },
      lathe_thread_g76: { tier: "Lathe Pro", reason: "G76 multi-pass threading requires Pro." },
      mill_turn_live_tooling: { tier: "Lathe Pro", reason: "Live-tooling C/Y axis requires Lathe Pro." },
      wedm_2axis_cut: { tier: "WEDM Standard", reason: "2-axis profile cut is part of Standard." },
      wedm_4axis_taper: { tier: "WEDM Pro", reason: "4-axis taper / U-V cut requires Pro." },
    };
    const hit = tierMap[operation_id];
    if (!hit) {
      return { operation_id, required_tier: "Mill Standard", rationale: `Unknown operation_id '${operation_id}', defaulting to Mill Standard.` };
    }
    return { operation_id, required_tier: hit.tier, rationale: hit.reason };
  }

  static recommendByFeature(intent: BobCADIntent | string): BobCADRecommendation {
    const map: Record<string, { primary: string; reason: string; alts: string[] }> = {
      pocket_2axis: { primary: "mill_pocket_2axis", reason: "2-axis pocket (contour / zigzag / spiral).", alts: ["mill_dynamic_pocket"] },
      dynamic_rough: { primary: "mill_dynamic_pocket", reason: "BobCAD Dynamic Motion adaptive roughing.", alts: [] },
      finish_3d_surface: { primary: "mill_3axis_finish", reason: "3-axis surface finish (Z-level / planar / pencil).", alts: [] },
      five_axis_swarf: { primary: "mill_4_5axis_simul", reason: "5-axis simultaneous swarf / multi-surface.", alts: [] },
      lathe_rough: { primary: "lathe_rough_2axis", reason: "Lathe OD/ID/face roughing.", alts: [] },
      lathe_thread: { primary: "lathe_thread_g76", reason: "Lathe G76 single-point threading.", alts: [] },
      live_tooling: { primary: "mill_turn_live_tooling", reason: "Live-tooling C-axis or Y-axis features.", alts: [] },
      wedm_profile: { primary: "wedm_2axis_cut", reason: "Wire EDM 2-axis straight wire profile cut.", alts: [] },
      wedm_taper: { primary: "wedm_4axis_taper", reason: "Wire EDM 4-axis taper / U-V cut.", alts: [] },
    };
    const hit = map[intent];
    if (!hit) {
      return { primary: "mill_pocket_2axis", reason: `Unknown intent='${intent}', defaulting to 2-axis pocket.`, alternatives: [], required_tier: "Mill Standard" };
    }
    const tier = this.tierForOperation(hit.primary);
    return { primary: hit.primary, reason: hit.reason, alternatives: hit.alts, required_tier: tier.required_tier };
  }

  /**
   * dynamicMotionEnvelope — BobCAD Dynamic Motion canonical adaptive bounds.
   * Slightly more aggressive than VoluMill 10%/2×D — defaults to 12%/2×D.
   * Citation: BobCAD-CAM v36 Dynamic Motion Reference (Mill Pro).
   */
  static dynamicMotionEnvelope(): {
    max_radial_engagement_pct: number;
    max_axial_doc_to_dia: number;
    smooth_arcs_required: boolean;
    citation: string;
  } {
    return {
      max_radial_engagement_pct: 12,
      max_axial_doc_to_dia: 2,
      smooth_arcs_required: true,
      citation: "BobCAD-CAM v36 Dynamic Motion canonical envelope",
    };
  }

  /**
   * wedmLeadStrategy — pick perpendicular vs arc lead-in per surface visibility.
   *   visibility="cosmetic" → arc (no witness mark)
   *   visibility="visible"   → arc (no witness mark)
   *   visibility="hidden"    → perpendicular (fastest pierce)
   *   visibility="trim"      → perpendicular (trim die — speed matters)
   */
  static wedmLeadStrategy(visibility: "cosmetic" | "visible" | "hidden" | "trim" | string): {
    lead_in_mode: "arc" | "perpendicular" | "tangent";
    rationale: string;
  } {
    const v = String(visibility).toLowerCase();
    if (v === "cosmetic" || v === "visible") {
      return { lead_in_mode: "arc", rationale: `'${v}' surface — arc lead leaves no witness mark.` };
    }
    if (v === "hidden" || v === "trim") {
      return { lead_in_mode: "perpendicular", rationale: `'${v}' surface — perpendicular is fastest pierce.` };
    }
    return { lead_in_mode: "tangent", rationale: `Unknown visibility '${visibility}', defaulting to tangent lead.` };
  }
}

export const bobCADFunctionIndexEngine = BobCADFunctionIndexEngine;
