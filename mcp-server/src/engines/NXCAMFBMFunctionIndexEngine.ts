/**
 * NXCAMFBMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM41
 *
 * NX CAM Feature-Based Machining (FBM) catalog: 12 operations across 5 categories.
 *   feature_recognition : auto_feature_recognition, hole_feature_recognition, pocket_feature_recognition
 *   manual_feature      : manual_feature_create, feature_painting
 *   machining_knowledge : machining_knowledge_rule, machining_knowledge_library
 *   process_template    : template_auto_3d, template_hole_making, template_library_mgmt
 *   feature_group       : feature_group_operation, feature_cad_sync
 *
 * Helpers (real classification/selection logic — not stubs):
 *   - recommendByFeature(intent) → routing
 *   - classifyPocketDepth(depth, width) → shallow/normal/deep/extreme by d/w ratio
 *   - selectSmallestFitTool(feature_min_radius, tools) → smallest tool whose radius ≤ feature_min_radius
 *   - matchKnowledgeRule(feature_type, material, rules) → highest-priority applicable MKE rule
 *   - featureGroupEfficiency(feature_count, tool_count) → batching economics classification
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
    path.resolve(__dirname, "../../data/cam-functions/nxcam/fbm.json"),
    path.resolve(__dirname, "../data/cam-functions/nxcam/fbm.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      _catalog = JSON.parse(fs.readFileSync(p, "utf8"));
      return _catalog;
    }
  }
  throw new Error("NXCAMFBMFunctionIndexEngine: fbm.json not found");
}

export type NXFBMIntent =
  | "auto_recognize"
  | "hole_only_recognize"
  | "pocket_only_recognize"
  | "manual_feature"
  | "paint_faces"
  | "edit_mke_rule"
  | "mke_library"
  | "auto_3d_machining"
  | "hole_making"
  | "template_library"
  | "feature_group_batch"
  | "cad_sync";

export interface PocketDepthClass {
  classification: "shallow" | "normal" | "deep" | "extreme";
  depth_to_width_ratio: number;
  depth_mm: number;
  width_mm: number;
  recommendation: string;
}

export interface Tool {
  tool_id: string;
  tool_diameter_mm: number;
}

export interface SmallestFitResult {
  selected_tool_id: string;
  selected_tool_diameter_mm: number;
  selected_tool_radius_mm: number;
  feature_min_radius_mm: number;
  candidates_considered: number;
  reason: string;
}

export interface MKERule {
  rule_id: string;
  priority: number;
  feature_type: string;
  material_filter?: string | null;
  min_depth_mm?: number;
  max_depth_mm?: number;
  min_diameter_mm?: number;
  max_diameter_mm?: number;
  applied_template: string;
  enabled?: boolean;
}

export interface MKEMatchResult {
  matched: boolean;
  rule_id?: string;
  applied_template?: string;
  priority?: number;
  candidates_considered: number;
  reason: string;
}

export interface GroupEfficiencyResult {
  classification: "wasteful" | "sparse" | "efficient" | "highly_efficient";
  ratio: number;
  feature_count: number;
  tool_count: number;
  recommendation: string;
}

export class NXCAMFBMFunctionIndexEngine {
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
    if (!op) return { error: `Unknown NX FBM operation: ${operation_id}` };
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
  static recommendByFeature(intent: NXFBMIntent | string): { primary: string; alternative: string[]; reason: string } {
    const map: Record<string, { primary: string; alternative: string[]; reason: string }> = {
      auto_recognize: { primary: "auto_feature_recognition", alternative: ["hole_feature_recognition", "pocket_feature_recognition"], reason: "Whole-body auto recognition; downstream AUTO_3D template chain." },
      hole_only_recognize: { primary: "hole_feature_recognition", alternative: ["auto_feature_recognition"], reason: "Hole-only recognizer with sub-classification (counterbore, countersink, threaded, tapered)." },
      pocket_only_recognize: { primary: "pocket_feature_recognition", alternative: ["auto_feature_recognition"], reason: "Pocket-only recognizer including open-side and through pockets." },
      manual_feature: { primary: "manual_feature_create", alternative: ["feature_painting"], reason: "Hand-created feature when auto missed it or custom template is required." },
      paint_faces: { primary: "feature_painting", alternative: ["manual_feature_create"], reason: "Brush-select faces onto existing feature to repair mis-classification." },
      edit_mke_rule: { primary: "machining_knowledge_rule", alternative: ["machining_knowledge_library"], reason: "Edit a single MKE rule: match + action + constraints + priority." },
      mke_library: { primary: "machining_knowledge_library", alternative: [], reason: "Library-level MKE management (scope, inheritance, validation state)." },
      auto_3d_machining: { primary: "template_auto_3d", alternative: ["template_hole_making"], reason: "AUTO_3D chain: rough → rest mill → zlevel finish → surface finish with smallest-fit tool selection." },
      hole_making: { primary: "template_hole_making", alternative: ["template_auto_3d"], reason: "HOLE_MAKING chain: spot → drill → (ream/cbore/csink/tap) per classified hole function." },
      template_library: { primary: "template_library_mgmt", alternative: [], reason: "Template library namespace, version tag, validation-before-production gate." },
      feature_group_batch: { primary: "feature_group_operation", alternative: ["feature_cad_sync"], reason: "Group features for batched machining to amortize tool changes." },
      cad_sync: { primary: "feature_cad_sync", alternative: [], reason: "Keep FBM features synchronized with source CAD (synchronous / parametric / snapshot)." },
    };
    return map[String(intent)] ?? {
      primary: "auto_feature_recognition",
      alternative: ["template_auto_3d"],
      reason: `Unknown intent '${intent}' — defaulting to whole-body auto feature recognition.`,
    };
  }

  /**
   * classifyPocketDepth — classify pocket by depth-to-width ratio.
   *
   *   shallow:  d/w ≤ 0.5     (floor-dominated: face mill + minimal depth passes)
   *   normal:   0.5 < d/w ≤ 2 (canonical pocket)
   *   deep:     2 < d/w ≤ 4   (rigidity at risk; step-down needed)
   *   extreme:  d/w > 4       (plunge / helical / peck territory)
   */
  static classifyPocketDepth(depth_mm: number, width_mm: number): PocketDepthClass | { error: string } {
    if (!Number.isFinite(depth_mm) || depth_mm <= 0) {
      return { error: "depth_mm must be a positive finite number" };
    }
    if (!Number.isFinite(width_mm) || width_mm <= 0) {
      return { error: "width_mm must be a positive finite number" };
    }
    const r = depth_mm / width_mm;
    let classification: PocketDepthClass["classification"];
    let rec: string;
    if (r <= 0.5) {
      classification = "shallow";
      rec = "Shallow pocket (d/w ≤ 0.5). Face-mill approach; one or two full-depth passes are safe.";
    } else if (r <= 2) {
      classification = "normal";
      rec = "Normal pocket (0.5 < d/w ≤ 2). Standard cavity-mill stepdowns at 0.5×D to 1×D.";
    } else if (r <= 4) {
      classification = "deep";
      rec = "Deep pocket (2 < d/w ≤ 4). Reduce stepover; consider trochoidal or rest machining with longer-flute tool.";
    } else {
      classification = "extreme";
      rec = "Extreme-depth pocket (d/w > 4). Plunge or helical-entry + peck is typically required; flood / TSC coolant mandatory.";
    }
    return {
      classification,
      depth_to_width_ratio: r,
      depth_mm,
      width_mm,
      recommendation: rec,
    };
  }

  /**
   * selectSmallestFitTool — AUTO_3D's canonical tool-picking rule.
   *
   * Among the available tools, pick the one with the SMALLEST diameter whose
   * radius is still ≤ feature_min_radius_mm. If no tool fits, report the tool
   * closest (but exceeding) the feature's min radius so the operator can see
   * the shortfall.
   */
  static selectSmallestFitTool(feature_min_radius_mm: number, tools: Tool[]): SmallestFitResult | { error: string } {
    if (!Number.isFinite(feature_min_radius_mm) || feature_min_radius_mm <= 0) {
      return { error: "feature_min_radius_mm must be a positive finite number" };
    }
    if (!Array.isArray(tools) || tools.length === 0) {
      return { error: "tools must be a non-empty array" };
    }
    for (const t of tools) {
      if (!t || typeof t.tool_id !== "string" || !Number.isFinite(t.tool_diameter_mm) || t.tool_diameter_mm <= 0) {
        return { error: `invalid tool entry: ${JSON.stringify(t)}` };
      }
    }
    const fits = tools.filter((t) => t.tool_diameter_mm / 2 <= feature_min_radius_mm);
    if (fits.length === 0) {
      const closest = [...tools].sort((a, b) => a.tool_diameter_mm - b.tool_diameter_mm)[0];
      return {
        selected_tool_id: closest.tool_id,
        selected_tool_diameter_mm: closest.tool_diameter_mm,
        selected_tool_radius_mm: closest.tool_diameter_mm / 2,
        feature_min_radius_mm,
        candidates_considered: tools.length,
        reason: `No tool fits corner radius ${feature_min_radius_mm}mm; closest tool exceeds it — corners will be under-cut.`,
      };
    }
    const chosen = fits.reduce((best, t) => (t.tool_diameter_mm < best.tool_diameter_mm ? t : best));
    return {
      selected_tool_id: chosen.tool_id,
      selected_tool_diameter_mm: chosen.tool_diameter_mm,
      selected_tool_radius_mm: chosen.tool_diameter_mm / 2,
      feature_min_radius_mm,
      candidates_considered: tools.length,
      reason: "smallest_fit: smallest tool whose radius ≤ feature_min_radius.",
    };
  }

  /**
   * matchKnowledgeRule — applies MKE rule dispatch logic.
   *
   * Semantics:
   *   1. Skip rules with enabled === false.
   *   2. feature_type must match exactly OR rule's feature_type === 'any'.
   *   3. material_filter: exact match (case-insensitive) OR null/undefined (wildcard).
   *   4. dimensional envelope: min/max inclusive when provided.
   *   5. Among matches, lowest priority wins (ascending order per NX conventions).
   */
  static matchKnowledgeRule(
    feature_type: string,
    material: string,
    rules: MKERule[],
    options?: { depth_mm?: number; diameter_mm?: number },
  ): MKEMatchResult | { error: string } {
    if (typeof feature_type !== "string" || feature_type.length === 0) {
      return { error: "feature_type must be a non-empty string" };
    }
    if (typeof material !== "string" || material.length === 0) {
      return { error: "material must be a non-empty string" };
    }
    if (!Array.isArray(rules)) {
      return { error: "rules must be an array" };
    }
    const depth = options?.depth_mm;
    const dia = options?.diameter_mm;
    const mat = material.toLowerCase();
    const matches: MKERule[] = [];
    for (const rule of rules) {
      if (!rule || rule.enabled === false) continue;
      if (rule.feature_type !== "any" && rule.feature_type !== feature_type) continue;
      if (rule.material_filter != null && rule.material_filter.toLowerCase() !== mat) continue;
      if (rule.min_depth_mm != null && depth != null && depth < rule.min_depth_mm) continue;
      if (rule.max_depth_mm != null && depth != null && depth > rule.max_depth_mm) continue;
      if (rule.min_diameter_mm != null && dia != null && dia < rule.min_diameter_mm) continue;
      if (rule.max_diameter_mm != null && dia != null && dia > rule.max_diameter_mm) continue;
      matches.push(rule);
    }
    if (matches.length === 0) {
      return {
        matched: false,
        candidates_considered: rules.length,
        reason: `No enabled MKE rule matched feature_type=${feature_type}, material=${material}.`,
      };
    }
    const winner = matches.reduce((best, r) => (r.priority < best.priority ? r : best));
    return {
      matched: true,
      rule_id: winner.rule_id,
      applied_template: winner.applied_template,
      priority: winner.priority,
      candidates_considered: rules.length,
      reason: `Ascending-priority winner among ${matches.length} matches.`,
    };
  }

  /**
   * featureGroupEfficiency — classify batching economics by feature-to-tool ratio.
   *
   *   ratio < 1        → wasteful (more tool changes than features — the anti-pattern)
   *   1 ≤ ratio < 3    → sparse (some amortization)
   *   3 ≤ ratio < 6    → efficient (canonical FBM target)
   *   ratio ≥ 6        → highly_efficient (may risk tool wear between features)
   */
  static featureGroupEfficiency(feature_count: number, tool_count: number): GroupEfficiencyResult | { error: string } {
    if (!Number.isInteger(feature_count) || feature_count < 0) {
      return { error: "feature_count must be a non-negative integer" };
    }
    if (!Number.isInteger(tool_count) || tool_count <= 0) {
      return { error: "tool_count must be a positive integer" };
    }
    const r = feature_count / tool_count;
    let classification: GroupEfficiencyResult["classification"];
    let rec: string;
    if (r < 1) {
      classification = "wasteful";
      rec = "ratio < 1: more tool changes than features — batching does not amortize tool-change time.";
    } else if (r < 3) {
      classification = "sparse";
      rec = "1 ≤ ratio < 3: some amortization but under the canonical target of 3.";
    } else if (r < 6) {
      classification = "efficient";
      rec = "3 ≤ ratio < 6: canonical FBM batch efficiency — tool changes well amortized.";
    } else {
      classification = "highly_efficient";
      rec = "ratio ≥ 6: heavy tool sharing — monitor wear between features (longer single-tool sessions).";
    }
    return {
      classification,
      ratio: r,
      feature_count,
      tool_count,
      recommendation: rec,
    };
  }
}

export const nxcamFBMFunctionIndexEngine = NXCAMFBMFunctionIndexEngine;
