/**
 * CAMAIActionLinkerEngine — U-CAM-ENRICH-03
 * ============================================
 *
 * Populates ai_actions[] per physics-linked parameter in the CAM catalogs.
 * Maps each parameter to the Phase-5 stub engines that can act on it:
 *
 *   - cam_function_route                     (CAMFunctionRouterEngine)
 *   - cam_enrich_match_parameter            (CAMCatalogPhysicsLinkerEngine)
 *   - cam_ml_predict_baseline               (CAMBaselineRegressorEngine)
 *   - cam_ml_predict_lora                   (CAMLoRAAdapterTrainerEngine)
 *   - cam_tool_select_for_cam               (InventoryAwareToolSelectorEngine)
 *   - cam_post_invoke_from_inventory        (CAMPostInvokeOrchestratorEngine)
 *   - cam_enrich_link_single_tip            (CAMTribalTipLinkerEngine)
 *   - cam_fusion_build_operation_create     (Fusion360 outbound; one per-CAM analog)
 *
 * Each parameter gets a list of AIAction entries naming the dispatcher,
 * action, and (optional) parameter_mapping that tells Phase-5 consumer
 * engines how to bind the captured CAM param to the PRISM action input.
 *
 * Consumes U-CAM-ENRICH-01 output (CAM_PHYSICS_LINKS_INDEX.json) so we
 * only populate ai_actions on parameters that have canonical physics
 * mappings — non-physics params (tool_id, operation_name, etc.) are
 * skipped to avoid spurious action suggestions.
 *
 * Authored 2026-04-21 — CAM-EXHAUST-MS0 PHASE-0.6 U-CAM-ENRICH-03.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { CAMPhysicsLinksIndex } from "./CAMCatalogPhysicsLinkerEngine.js";

// ─── Types ──────────────────────────────────────────────────────────

export interface AIAction {
  dispatcher: string;
  action: string;
  parameter_mapping?: Record<string, string>;
  pre_conditions?: string[];
  post_actions?: string[];
}

export interface ParamAIActions {
  cam_slug: string;
  param_name: string;
  param_path: string;
  matched_formulas: string[];
  ai_actions: AIAction[];
}

export interface CAMAIActionIndex {
  schemaVersion: 1;
  generated_at: string;
  total_params: number;
  total_actions: number;
  by_cam_param: Record<string, ParamAIActions[]>;
  summary: {
    per_cam_count: Record<string, number>;
    action_usage: Record<string, number>;
  };
}

// ─── Formula → action mapping table ─────────────────────────────────

// Each canonical formula_id maps to a list of AIAction templates.
// parameter_mapping keys are the PRISM action input names; values are
// the captured CAM parameter name (runtime substitution).
const FORMULA_TO_ACTIONS: Record<string, AIAction[]> = {
  kienzle_cutting_force: [
    { dispatcher: "prism_cam", action: "cam_ml_predict_baseline",
      parameter_mapping: { "vector.features.cutting_force": "$PARAM" },
      pre_conditions: ["baseline model exists"] },
    { dispatcher: "prism_cam", action: "cam_enrich_match_parameter",
      parameter_mapping: { "param_name": "$PARAM" } },
  ],
  taylor_tool_life: [
    { dispatcher: "prism_cam", action: "cam_ml_predict_baseline",
      parameter_mapping: { "vector.features.tool_life": "$PARAM" } },
    { dispatcher: "prism_cam", action: "cam_ml_predict_lora",
      parameter_mapping: { "vector.features.tool_life": "$PARAM" },
      pre_conditions: ["lora adapter exists for target cam"] },
  ],
  tool_deflection: [
    { dispatcher: "prism_cam", action: "cam_enrich_match_parameter",
      parameter_mapping: { "param_name": "$PARAM" } },
  ],
  jaeger_temperature: [
    { dispatcher: "prism_cam", action: "cam_enrich_match_parameter",
      parameter_mapping: { "param_name": "$PARAM" } },
  ],
  material_removal_rate: [
    { dispatcher: "prism_cam", action: "cam_enrich_match_parameter",
      parameter_mapping: { "param_name": "$PARAM" } },
  ],
  surface_finish_ra: [
    { dispatcher: "prism_cam", action: "cam_enrich_match_parameter",
      parameter_mapping: { "param_name": "$PARAM" } },
    { dispatcher: "prism_cam", action: "cam_enrich_link_single_tip",
      parameter_mapping: { "tip.body": "$PARAM" } },
  ],
  spindle_power: [
    { dispatcher: "prism_cam", action: "cam_enrich_match_parameter",
      parameter_mapping: { "param_name": "$PARAM" } },
  ],
  chip_load_per_tooth: [
    { dispatcher: "prism_cam", action: "cam_ml_predict_baseline",
      parameter_mapping: { "vector.features.chip_load": "$PARAM" } },
  ],
  cutting_speed_vc: [
    { dispatcher: "prism_cam", action: "cam_ml_predict_baseline",
      parameter_mapping: { "vector.features.vc": "$PARAM" } },
    { dispatcher: "prism_cam", action: "cam_tool_select_for_cam",
      parameter_mapping: { "features[0].cutting_speed": "$PARAM" } },
  ],
  feed_rate: [
    { dispatcher: "prism_cam", action: "cam_ml_predict_baseline",
      parameter_mapping: { "vector.features.feed_rate": "$PARAM" } },
    { dispatcher: "prism_cam", action: "cam_ml_predict_lora",
      parameter_mapping: { "vector.features.feed_rate": "$PARAM" } },
  ],
  depth_of_cut_ap: [
    { dispatcher: "prism_cam", action: "cam_ml_predict_baseline",
      parameter_mapping: { "vector.features.ap": "$PARAM" } },
  ],
  width_of_cut_ae: [
    { dispatcher: "prism_cam", action: "cam_ml_predict_baseline",
      parameter_mapping: { "vector.features.ae": "$PARAM" } },
  ],
  spindle_rpm: [
    { dispatcher: "prism_cam", action: "cam_ml_predict_baseline",
      parameter_mapping: { "vector.features.spindle_rpm": "$PARAM" } },
    { dispatcher: "prism_cam", action: "cam_ml_predict_lora",
      parameter_mapping: { "vector.features.spindle_rpm": "$PARAM" } },
  ],
  chatter_stability_lobe: [
    { dispatcher: "prism_cam", action: "cam_enrich_match_parameter",
      parameter_mapping: { "param_name": "$PARAM" } },
  ],
};

// Every physics-linked param also gets the universal "route" action.
const UNIVERSAL_ACTIONS: AIAction[] = [
  { dispatcher: "prism_cam", action: "cam_function_route",
    parameter_mapping: { "intent": "$PARAM" } },
];

// ─── Engine ─────────────────────────────────────────────────────────

export class CAMAIActionLinkerEngine {
  readonly name = "CAMAIActionLinkerEngine";

  /** Read physics-links index + emit ai_actions index. */
  linkAll(
    physicsLinksPath: string = "H:/PRISM/mcp-server/data/state/CAM_PHYSICS_LINKS_INDEX.json",
    outPath: string = "H:/PRISM/mcp-server/data/state/CAM_AI_ACTIONS_INDEX.json"
  ): CAMAIActionIndex {
    const physIdx = this.safeLoadJson<CAMPhysicsLinksIndex>(physicsLinksPath);
    if (!physIdx) {
      return this.emptyIndex("physics index missing");
    }

    const byCamParam: Record<string, ParamAIActions[]> = {};
    const perCamCount: Record<string, number> = {};
    const actionUsage: Record<string, number> = {};
    let totalParams = 0;
    let totalActions = 0;

    for (const [slug, camData] of Object.entries(physIdx.cams)) {
      perCamCount[slug] = 0;
      const entries: ParamAIActions[] = [];
      for (const match of camData.matches) {
        const actions = this.actionsForFormulas(match.matched_formulas, match.param_name);
        if (actions.length === 0) continue;
        entries.push({
          cam_slug: slug,
          param_name: match.param_name,
          param_path: match.param_path,
          matched_formulas: match.matched_formulas,
          ai_actions: actions,
        });
        perCamCount[slug] += 1;
        totalParams += 1;
        for (const a of actions) {
          totalActions += 1;
          actionUsage[a.action] = (actionUsage[a.action] ?? 0) + 1;
        }
      }
      byCamParam[slug] = entries;
    }

    const index: CAMAIActionIndex = {
      schemaVersion: 1,
      generated_at: new Date().toISOString(),
      total_params: totalParams,
      total_actions: totalActions,
      by_cam_param: byCamParam,
      summary: { per_cam_count: perCamCount, action_usage: actionUsage },
    };

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(index, null, 2));
    return index;
  }

  /** Public: resolve the action set for a given formula list + param name. */
  actionsForFormulas(formulas: string[], paramName: string): AIAction[] {
    const out: AIAction[] = [];
    const seen = new Set<string>();
    let anyMatched = false;
    for (const fid of formulas) {
      const templates = FORMULA_TO_ACTIONS[fid];
      if (!templates) continue;
      anyMatched = true;
      for (const t of templates) {
        const key = `${t.dispatcher}::${t.action}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(this.substitute(t, paramName));
      }
    }
    // Universal action(s) — only if at least one formula matched
    if (anyMatched) {
      for (const u of UNIVERSAL_ACTIONS) {
        const key = `${u.dispatcher}::${u.action}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push(this.substitute(u, paramName));
        }
      }
    }
    return out;
  }

  // ─── Private ──────────────────────────────────────────────────────

  private substitute(t: AIAction, paramName: string): AIAction {
    const mapping: Record<string, string> = {};
    if (t.parameter_mapping) {
      for (const [k, v] of Object.entries(t.parameter_mapping)) {
        mapping[k] = v === "$PARAM" ? paramName : v;
      }
    }
    const result: AIAction = { dispatcher: t.dispatcher, action: t.action };
    if (Object.keys(mapping).length > 0) result.parameter_mapping = mapping;
    if (t.pre_conditions) result.pre_conditions = [...t.pre_conditions];
    if (t.post_actions) result.post_actions = [...t.post_actions];
    return result;
  }

  private safeLoadJson<T>(p: string): T | null {
    try {
      return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
    } catch {
      return null;
    }
  }

  private emptyIndex(reason: string): CAMAIActionIndex {
    return {
      schemaVersion: 1,
      generated_at: new Date().toISOString(),
      total_params: 0,
      total_actions: 0,
      by_cam_param: {},
      summary: { per_cam_count: {}, action_usage: { [`no_op_${reason}`]: 0 } },
    };
  }
}

export const camAIActionLinkerEngine = new CAMAIActionLinkerEngine();
