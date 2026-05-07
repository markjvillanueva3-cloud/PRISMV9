/**
 * PowerMillRoughingFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM43
 *
 * PowerMill 2024 Roughing Strategies catalog: 12 operations across 5 categories.
 *   model_area_clearance : model_area_clearance, offset_area_clearance, profile_area_clearance, slice_area_clearance
 *   vortex               : vortex_clearance
 *   plunge               : plunge_roughing, plunge_mill_pocket
 *   adaptive             : adaptive_clearance_boundary, raster_area_clearance
 *   rest_and_helpers     : rest_roughing, stock_model_management, drill_for_clearance
 *
 * Helpers (real classification/selection logic):
 *   - recommendByFeature(intent) → routing
 *   - vortexEngagementCheck(radial_pct, doc_to_dia) → safe/caution/critical zones (Vortex envelope: ≤12% radial, ≤2.5×D axial)
 *   - restMachiningWorthwhile(prev_dia, current_dia) → boolean + ratio + recommendation (rule: current ≤ 0.5×prev)
 *   - plungeStrategyValidate(slot_width, tool_dia, plunge_feed_pct) → feasibility + issues
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
    path.resolve(__dirname, "../../data/cam-functions/powermill/roughing.json"),
    path.resolve(__dirname, "../data/cam-functions/powermill/roughing.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      _catalog = JSON.parse(fs.readFileSync(p, "utf8"));
      return _catalog;
    }
  }
  throw new Error("PowerMillRoughingFunctionIndexEngine: roughing.json not found");
}

export type PMRoughingIntent =
  | "general_cavity_rough"
  | "smooth_offset_fill"
  | "profile_only_rough"
  | "waterline_pre_finish"
  | "high_efficiency_adaptive"
  | "deep_cavity_unstable"
  | "narrow_pocket_plunge"
  | "selective_adaptive_region"
  | "raster_lace_fill"
  | "rest_clearance_after_big_tool"
  | "stock_model_setup"
  | "pre_pierce_or_chip_release";

export interface VortexEngagementResult {
  classification: "safe" | "caution" | "critical";
  radial_engagement_pct: number;
  axial_doc_to_dia_ratio: number;
  recommendation: string;
}

export interface RestWorthwhileResult {
  worthwhile: boolean;
  diameter_ratio: number;
  previous_tool_diameter_mm: number;
  current_tool_diameter_mm: number;
  recommendation: string;
}

export interface PlungeValidationResult {
  is_valid: boolean;
  issues: string[];
  slot_width_to_tool_ratio: number;
  plunge_feed_pct: number;
}

export class PowerMillRoughingFunctionIndexEngine {
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
    if (!op) return { error: `Unknown PowerMill roughing operation: ${operation_id}` };
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
  static recommendByFeature(intent: PMRoughingIntent | string): { primary: string; alternative: string[]; reason: string } {
    const map: Record<string, { primary: string; alternative: string[]; reason: string }> = {
      general_cavity_rough: { primary: "model_area_clearance", alternative: ["offset_area_clearance", "raster_area_clearance"], reason: "Workhorse cavity clearance (MAC) with offset/raster fill." },
      smooth_offset_fill: { primary: "offset_area_clearance", alternative: ["model_area_clearance"], reason: "Offset-only fill for constant chip load on steel." },
      profile_only_rough: { primary: "profile_area_clearance", alternative: ["model_area_clearance"], reason: "Profile-only — pair with another op for the fill." },
      waterline_pre_finish: { primary: "slice_area_clearance", alternative: [], reason: "Z-constant slice for vertical-wall pre-finish." },
      high_efficiency_adaptive: { primary: "vortex_clearance", alternative: ["adaptive_clearance_boundary"], reason: "Vortex adaptive — constant engagement, deep DOC, full flute." },
      deep_cavity_unstable: { primary: "plunge_roughing", alternative: ["plunge_mill_pocket"], reason: "Pure axial plunging when radial cutting is unstable." },
      narrow_pocket_plunge: { primary: "plunge_mill_pocket", alternative: ["plunge_roughing"], reason: "Stepped plunge across closed pockets too narrow for milling." },
      selective_adaptive_region: { primary: "adaptive_clearance_boundary", alternative: ["vortex_clearance"], reason: "Vortex-style adaptive constrained to a boundary region." },
      raster_lace_fill: { primary: "raster_area_clearance", alternative: ["offset_area_clearance"], reason: "Lace/zigzag fill — fastest cycle when straight motion dominates." },
      rest_clearance_after_big_tool: { primary: "rest_roughing", alternative: ["model_area_clearance"], reason: "Rough-clear only the residue from a previous larger tool." },
      stock_model_setup: { primary: "stock_model_management", alternative: [], reason: "Maintain live stock model — bookkeeping for rest machining." },
      pre_pierce_or_chip_release: { primary: "drill_for_clearance", alternative: [], reason: "Centerline drilling for pre-pierce or chip-release hole." },
    };
    return map[String(intent)] ?? {
      primary: "model_area_clearance",
      alternative: ["vortex_clearance"],
      reason: `Unknown intent '${intent}' — defaulting to Model Area Clearance (MAC).`,
    };
  }

  /**
   * vortexEngagementCheck — classify Vortex (PowerMill adaptive) parameters
   * against the canonical envelope.
   *
   *   safe:     radial ≤ 12% AND axial_doc/D ≤ 2.5
   *   caution:  radial ≤ 18% OR  axial_doc/D ≤ 3.0  (still recoverable)
   *   critical: outside above (Vortex was not designed for that envelope)
   *
   * Note: Vortex's signature is HIGHER axial DOC than NX/Mastercam adaptive
   * (canonical 2.5×D vs ~1.5×D), enabled by tighter radial engagement.
   */
  static vortexEngagementCheck(radial_engagement_pct: number, axial_doc_to_dia_ratio: number): VortexEngagementResult | { error: string } {
    if (!Number.isFinite(radial_engagement_pct) || radial_engagement_pct <= 0 || radial_engagement_pct > 100) {
      return { error: "radial_engagement_pct must be in (0, 100]" };
    }
    if (!Number.isFinite(axial_doc_to_dia_ratio) || axial_doc_to_dia_ratio <= 0) {
      return { error: "axial_doc_to_dia_ratio must be a positive finite number" };
    }
    let classification: VortexEngagementResult["classification"];
    let rec: string;
    if (radial_engagement_pct <= 12 && axial_doc_to_dia_ratio <= 2.5) {
      classification = "safe";
      rec = "Within Vortex canonical envelope (≤12% radial, ≤2.5×D axial). Run with confidence.";
    } else if (radial_engagement_pct <= 18 && axial_doc_to_dia_ratio <= 3.0) {
      classification = "caution";
      rec = "Outside Vortex canonical envelope but recoverable; verify rigidity, may need feed reduction.";
    } else {
      classification = "critical";
      rec = "Engagement exceeds Vortex design envelope; expect tool overload, breakage, or chatter.";
    }
    return {
      classification,
      radial_engagement_pct,
      axial_doc_to_dia_ratio,
      recommendation: rec,
    };
  }

  /**
   * restMachiningWorthwhile — rule of thumb for rest machining cascade:
   * a rest tool is only worth running if its diameter ≤ 0.5× the previous
   * tool's diameter. Otherwise the residue it can hit is too small to
   * justify the extra cycle time and tool change.
   */
  static restMachiningWorthwhile(previous_tool_diameter_mm: number, current_tool_diameter_mm: number): RestWorthwhileResult | { error: string } {
    if (!Number.isFinite(previous_tool_diameter_mm) || previous_tool_diameter_mm <= 0) {
      return { error: "previous_tool_diameter_mm must be a positive finite number" };
    }
    if (!Number.isFinite(current_tool_diameter_mm) || current_tool_diameter_mm <= 0) {
      return { error: "current_tool_diameter_mm must be a positive finite number" };
    }
    const ratio = current_tool_diameter_mm / previous_tool_diameter_mm;
    const worthwhile = ratio <= 0.5;
    const rec = worthwhile
      ? `Rest machining worthwhile: current tool is ${(ratio * 100).toFixed(1)}% of previous tool (≤50% rule satisfied).`
      : `Rest machining likely not worthwhile: current tool is ${(ratio * 100).toFixed(1)}% of previous tool (above 50% threshold) — too little residue to justify cycle time.`;
    return {
      worthwhile,
      diameter_ratio: ratio,
      previous_tool_diameter_mm,
      current_tool_diameter_mm,
      recommendation: rec,
    };
  }

  /**
   * plungeStrategyValidate — checks plunge-roughing feasibility:
   *   1. slot_width ≥ tool_diameter (else tool will not fit)
   *   2. slot_width ≤ 1.5×tool_diameter (else conventional milling is faster)
   *   3. plunge_feed_pct must be in [20, 50]% of cut feed (slower → safer; higher = breakage risk)
   */
  static plungeStrategyValidate(
    slot_width_mm: number,
    tool_diameter_mm: number,
    plunge_feed_pct: number,
  ): PlungeValidationResult | { error: string } {
    if (!Number.isFinite(slot_width_mm) || slot_width_mm <= 0) {
      return { error: "slot_width_mm must be a positive finite number" };
    }
    if (!Number.isFinite(tool_diameter_mm) || tool_diameter_mm <= 0) {
      return { error: "tool_diameter_mm must be a positive finite number" };
    }
    if (!Number.isFinite(plunge_feed_pct) || plunge_feed_pct <= 0 || plunge_feed_pct > 100) {
      return { error: "plunge_feed_pct must be in (0, 100]" };
    }
    const ratio = slot_width_mm / tool_diameter_mm;
    const issues: string[] = [];
    if (ratio < 1.0) {
      issues.push(`slot_width (${slot_width_mm}mm) < tool_diameter (${tool_diameter_mm}mm) — tool does not fit`);
    }
    if (ratio > 1.5) {
      issues.push(`slot_width/tool_dia = ${ratio.toFixed(2)} > 1.5 — conventional milling will be faster`);
    }
    if (plunge_feed_pct < 20) {
      issues.push(`plunge_feed_pct ${plunge_feed_pct}% < 20% — unnecessarily slow`);
    }
    if (plunge_feed_pct > 50) {
      issues.push(`plunge_feed_pct ${plunge_feed_pct}% > 50% — breakage risk on plunge`);
    }
    return {
      is_valid: issues.length === 0,
      issues,
      slot_width_to_tool_ratio: ratio,
      plunge_feed_pct,
    };
  }
}

export const powerMillRoughingFunctionIndexEngine = PowerMillRoughingFunctionIndexEngine;
