/**
 * ESPRITKBMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM52
 *
 * Catalog: 7 Knowledge-Based-Machining ops / 48 params / 7 categories.
 *
 * Categories: feature_recognition, strategy_template, macro_library,
 *             probing, stock_management, tool_optimization, multi_task.
 *
 * Methods:
 *   getIndex(), getSummary(), listOperations(), getOperation(id),
 *   getOperationsByCategory(cat), findParameter(name, limit),
 *   recommendByFeature(intent),
 *   selectScanDepth(part_complexity_score): surface/topology/deep
 *   probeToleranceForIT(it_grade): map ISO 286 IT → wcs/feature tolerance
 *   estimateConsolidationSavings(tool_count, diameter_tol_pct, max_per_tool)
 */

import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let _catalog: any | null = null;

function dataPath(): string {
  const candidates = [
    path.resolve(__dirname, "../../data/cam-functions/esprit/knowledge-based-machining.json"),
    path.resolve(__dirname, "../data/cam-functions/esprit/knowledge-based-machining.json"),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  throw new Error("ESPRITKBMFunctionIndexEngine: knowledge-based-machining.json not found");
}

function loadCatalog(): any {
  if (_catalog) return _catalog;
  _catalog = JSON.parse(fs.readFileSync(dataPath(), "utf8"));
  return _catalog;
}

export type ESPRITKBMIntent =
  | "auto_recognize_features"
  | "apply_template_to_features"
  | "save_template_from_chain"
  | "macro_chain_recipe"
  | "probe_inspection"
  | "track_stock_model"
  | "optimize_tool_list";

export interface ESPRITKBMRecommendation {
  primary: string;
  reason: string;
  alternatives: string[];
}

export class ESPRITKBMFunctionIndexEngine {
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

  static recommendByFeature(intent: ESPRITKBMIntent | string): ESPRITKBMRecommendation {
    const map: Record<string, { primary: string; reason: string; alts: string[] }> = {
      auto_recognize_features: { primary: "kbm_recognize_features", reason: "Auto-classify holes/pockets/slots/threads.", alts: [] },
      apply_template_to_features: { primary: "kbm_apply_strategy", reason: "Bind feature group to saved strategy template.", alts: [] },
      save_template_from_chain: { primary: "kbm_save_template", reason: "Capture current op chain as parameterized template.", alts: [] },
      macro_chain_recipe: { primary: "kbm_macro_chain", reason: "Composable multi-step macro with fail policy.", alts: [] },
      probe_inspection: { primary: "kbm_probe_inspection", reason: "Auto-generate WCS + feature inspection routine.", alts: [] },
      track_stock_model: { primary: "kbm_stock_track", reason: "Voxel-tracked stock model across operations.", alts: [] },
      optimize_tool_list: { primary: "kbm_tool_optimize", reason: "Reduce magazine count via consolidation merge rules.", alts: [] },
    };
    const hit = map[intent];
    if (hit) return { primary: hit.primary, reason: hit.reason, alternatives: hit.alts };
    return { primary: "kbm_recognize_features", reason: `Unknown intent='${intent}', defaulting to feature recognition.`, alternatives: [] };
  }

  /**
   * selectScanDepth — pick scan_depth by part complexity score (0-10):
   *   ≤3 simple prismatic: surface (fastest)
   *   4-6 mixed prismatic + freeform: topology (default)
   *   ≥7 heavy freeform / cast: deep (slow but accurate)
   */
  static selectScanDepth(part_complexity_score: number): {
    scan_depth: "surface" | "topology" | "deep";
    rationale: string;
    score: number;
  } {
    if (typeof part_complexity_score !== "number" || !Number.isFinite(part_complexity_score) || part_complexity_score < 0 || part_complexity_score > 10) {
      return { scan_depth: "topology", rationale: "Invalid score — defaulting to topology.", score: 0 };
    }
    if (part_complexity_score <= 3) {
      return { scan_depth: "surface", rationale: `Score=${part_complexity_score} ≤ 3 → surface (fastest, prismatic-friendly).`, score: part_complexity_score };
    }
    if (part_complexity_score < 7) {
      return { scan_depth: "topology", rationale: `Score=${part_complexity_score} → topology (mixed prismatic + freeform).`, score: part_complexity_score };
    }
    return { scan_depth: "deep", rationale: `Score=${part_complexity_score} ≥ 7 → deep (heavy freeform / cast geometry).`, score: part_complexity_score };
  }

  /**
   * probeToleranceForIT — map ISO 286 IT grade to suggested probe tolerance.
   *  Rule of thumb: probe must be ~1/4 of feature tolerance (gauge R&R discipline).
   *  IT 6 (≈0.013mm @ 50mm) → probe 0.005mm WCS / 0.01mm feature
   *  IT 8 (≈0.039mm @ 50mm) → probe 0.010mm WCS / 0.02mm feature
   *  IT10 (≈0.100mm @ 50mm) → probe 0.025mm WCS / 0.05mm feature
   *  IT12 (≈0.250mm @ 50mm) → probe 0.050mm WCS / 0.10mm feature
   */
  static probeToleranceForIT(it_grade: number): {
    wcs_tolerance_mm: number;
    feature_tolerance_mm: number;
    rationale: string;
    it_grade: number;
  } {
    if (typeof it_grade !== "number" || !Number.isInteger(it_grade) || it_grade < 5 || it_grade > 16) {
      return { wcs_tolerance_mm: 0.025, feature_tolerance_mm: 0.05, rationale: "Invalid IT grade — defaulting to IT10.", it_grade: 0 };
    }
    if (it_grade <= 6) {
      return { wcs_tolerance_mm: 0.005, feature_tolerance_mm: 0.01, rationale: `IT${it_grade} precision → 0.005/0.010mm probe tolerance.`, it_grade };
    }
    if (it_grade <= 8) {
      return { wcs_tolerance_mm: 0.010, feature_tolerance_mm: 0.02, rationale: `IT${it_grade} → 0.010/0.020mm probe tolerance.`, it_grade };
    }
    if (it_grade <= 10) {
      return { wcs_tolerance_mm: 0.025, feature_tolerance_mm: 0.05, rationale: `IT${it_grade} → 0.025/0.050mm probe tolerance.`, it_grade };
    }
    return { wcs_tolerance_mm: 0.050, feature_tolerance_mm: 0.10, rationale: `IT${it_grade} loose → 0.050/0.100mm probe tolerance.`, it_grade };
  }

  /**
   * estimateConsolidationSavings — predict magazine reduction from
   * tool consolidation by diameter tolerance + max-per-tool cap.
   *
   * Heuristic: assume tools cluster uniformly across diameter range.
   * Effective consolidation per tool = min(max_per_tool, 1 + tol_pct/2).
   * Final tool count ≈ original / consolidation_per_tool.
   */
  static estimateConsolidationSavings(
    tool_count: number,
    diameter_tolerance_pct: number,
    max_consolidation_per_tool: number,
  ): {
    original_tool_count: number;
    estimated_consolidated_count: number;
    estimated_savings_count: number;
    consolidation_per_tool: number;
    rationale: string;
  } {
    if (
      typeof tool_count !== "number" || !Number.isInteger(tool_count) || tool_count < 1 ||
      typeof diameter_tolerance_pct !== "number" || !Number.isFinite(diameter_tolerance_pct) || diameter_tolerance_pct < 0 || diameter_tolerance_pct > 10 ||
      typeof max_consolidation_per_tool !== "number" || !Number.isInteger(max_consolidation_per_tool) || max_consolidation_per_tool < 1
    ) {
      return {
        original_tool_count: tool_count > 0 ? tool_count : 0,
        estimated_consolidated_count: tool_count > 0 ? tool_count : 0,
        estimated_savings_count: 0,
        consolidation_per_tool: 1,
        rationale: "Invalid input — no consolidation applied.",
      };
    }
    const consolidation = Math.min(max_consolidation_per_tool, 1 + diameter_tolerance_pct / 2);
    const consolidated = Math.max(1, Math.ceil(tool_count / consolidation));
    return {
      original_tool_count: tool_count,
      estimated_consolidated_count: consolidated,
      estimated_savings_count: tool_count - consolidated,
      consolidation_per_tool: Math.round(consolidation * 100) / 100,
      rationale: `${tool_count} tools / ${consolidation.toFixed(2)} consolidation → ${consolidated} after merge.`,
    };
  }
}

export const espritKBMFunctionIndexEngine = ESPRITKBMFunctionIndexEngine;
