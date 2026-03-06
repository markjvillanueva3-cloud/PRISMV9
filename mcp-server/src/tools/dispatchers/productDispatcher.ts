/**
 * PRISM MCP Server - Product Dispatcher
 *
 * Routes 40 product actions to ProductEngine sub-engines.
 * Extracted from intelligenceDispatcher (SYS-MS1-U00).
 *
 * Sub-engines:
 *   productSFC  (10 actions) — Surface Finish Calculator
 *   productPPG  (10 actions) — Post Processor Generator
 *   productShop (10 actions) — Shop Manager
 *   productACNC (10 actions) — Adaptive CNC
 *
 * @milestone SYS-MS1-U00
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { formatByLevel, type ResponseLevel } from "../../types/ResponseLevel.js";

// Lazy engine cache
let _productSFC: any, _productPPG: any, _productShop: any, _productACNC: any;

async function getProductEngine(name: string): Promise<any> {
  switch (name) {
    case "productSFC":  return _productSFC ??= (await import("../../engines/ProductEngine.js")).productSFC;
    case "productPPG":  return _productPPG ??= (await import("../../engines/ProductEngine.js")).productPPG;
    case "productShop": return _productShop ??= (await import("../../engines/ProductEngine.js")).productShop;
    case "productACNC": return _productACNC ??= (await import("../../engines/ProductEngine.js")).productACNC;
    default: throw new Error(`Unknown product engine: ${name}`);
  }
}

// ============================================================================
// ACTION ARRAYS
// ============================================================================

const SFC_ACTIONS = [
  "sfc_calculate", "sfc_compare", "sfc_optimize", "sfc_quick",
  "sfc_materials", "sfc_tools", "sfc_formulas", "sfc_safety",
  "sfc_history", "sfc_get",
] as const;

const PPG_ACTIONS = [
  "ppg_validate", "ppg_translate", "ppg_templates", "ppg_generate",
  "ppg_controllers", "ppg_compare", "ppg_syntax", "ppg_batch",
  "ppg_history", "ppg_get",
] as const;

const SHOP_ACTIONS = [
  "shop_job", "shop_cost", "shop_quote", "shop_schedule",
  "shop_dashboard", "shop_report", "shop_compare", "shop_materials",
  "shop_history", "shop_get",
] as const;

const ACNC_ACTIONS = [
  "acnc_program", "acnc_feature", "acnc_simulate", "acnc_output",
  "acnc_tools", "acnc_strategy", "acnc_validate", "acnc_batch",
  "acnc_history", "acnc_get",
] as const;

const ACTIONS = [
  ...SFC_ACTIONS,
  ...PPG_ACTIONS,
  ...SHOP_ACTIONS,
  ...ACNC_ACTIONS,
] as const;

// ============================================================================
// KEY VALUE EXTRACTOR (for slim responses)
// ============================================================================

function productExtractKeyValues(action: string, result: any): Record<string, any> {
  if (!result || typeof result !== "object") return { value: result };
  switch (action) {
    // SFC
    case "sfc_calculate":
      return { vc: result.cutting_speed_m_min, rpm: result.spindle_rpm, fz: result.feed_per_tooth_mm, power: result.power_kW, tool_life: result.tool_life_min, safety: result.safety_status };
    case "sfc_compare":
      return { approaches: result.approaches?.length, recommended: result.recommended };
    case "sfc_optimize":
      return { objective: result.objective, improvement: result.improvement_pct };
    case "sfc_quick":
      return { vc: result.result?.cutting_speed_m_min, rpm: result.result?.spindle_rpm };
    case "sfc_materials":
      return { count: result.materials?.length };
    case "sfc_tools":
      return { count: result.tools?.length };
    case "sfc_formulas":
      return { count: result.formulas?.length };
    case "sfc_safety":
      return { score: result.score, status: result.status };
    case "sfc_history":
      return { entries: result.history?.length };
    case "sfc_get":
      return { product: result.product, version: result.version };
    // PPG
    case "ppg_validate":
      return { valid: result.valid, score: result.score, errors: result.errors?.length, warnings: result.warnings?.length };
    case "ppg_translate":
      return { source: result.original_controller, target: result.target_controller, changes: result.changes_made?.length };
    case "ppg_templates":
      return { total: result.total };
    case "ppg_generate":
      return { controller: result.controller, operation: result.operation, line_count: result.line_count };
    case "ppg_controllers":
      return { total: result.total };
    case "ppg_compare":
      return { operation: result.operation, controllers_compared: result.controllers_compared };
    case "ppg_syntax":
      return { controller: result.controller, family: result.controller_family };
    case "ppg_batch":
      return { source: result.source_controller, targets: result.total_targets };
    case "ppg_history":
      return { entries: result.history?.length };
    case "ppg_get":
      return { product: result.product, version: result.version };
    // Shop Manager
    case "shop_job":
      return { material: result.material, operations: result.operations?.length, cycle_time_min: result.total_cycle_time_min };
    case "shop_cost":
      return { cost_per_part: result.cost_per_part, price_per_part: result.price_per_part, batch_size: result.batch_size };
    case "shop_quote":
      return { quote_number: result.quote_number, unit_price: result.pricing?.unit_price, quantity: result.pricing?.quantity };
    case "shop_schedule":
      return { makespan_min: result.metrics?.total_makespan_min, avg_utilization: result.metrics?.average_utilization_pct, jobs_on_time: result.metrics?.jobs_on_time, bottlenecks: result.bottlenecks?.length };
    case "shop_dashboard":
      return { total_machines: result.summary?.total_machines, utilization: result.summary?.average_utilization_pct };
    case "shop_report":
      return { cost_per_part: result.cost_summary?.cost_per_part, co2_kg: result.sustainability?.co2_kg_per_part };
    case "shop_compare":
      return { results: result.results?.length, recommendation: result.recommendation };
    case "shop_materials":
      return { total: result.total };
    case "shop_history":
      return { entries: result.history?.length };
    case "shop_get":
      return { product: result.product, version: result.version };
    // ACNC
    case "acnc_program":
      return { feature: result.feature?.feature, controller: result.gcode?.controller, safety: result.safety_score, ready: result.ready_to_run };
    case "acnc_feature":
      return { feature: result.feature, operations: result.operations?.length };
    case "acnc_simulate":
      return { safety: result.safety_status, cycle_time: result.estimated_cycle_time_min };
    case "acnc_output":
      return { controller: result.controller, operations: result.operations_count };
    case "acnc_tools":
      return { tool: result.tool_type, coating: result.coating };
    case "acnc_strategy":
      return { strategy: result.strategy, confidence: result.confidence };
    case "acnc_validate":
      return { valid: result.valid, score: result.score };
    case "acnc_batch":
      return { batch_size: result.batch_size, all_ready: result.all_ready };
    case "acnc_history":
      return { entries: result.history?.length };
    case "acnc_get":
      return { product: result.product, version: result.version };
    default:
      return result;
  }
}

// ============================================================================
// REGISTRATION
// ============================================================================

/** Registers product dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerProductDispatcher(server: any): void {
  server.tool(
    "prism_product",
    "Product tools: SFC (surface finish calc), PPG (post processor generator), Shop Manager (job costing/quoting), ACNC (adaptive CNC programming). Use 'action' param.",
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({ action, params: rawParams = {} }: { action: string; params?: Record<string, any> }) => {
      log.info(`[prism_product] Action: ${action}`);

      const params: Record<string, any> = { ...rawParams };

      try {
        // Normalize params
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          Object.assign(params, normalizeParams(rawParams));
        } catch { /* normalizer not available */ }

        // Pre-hooks
        const hookCtx = {
          operation: action,
          target: { type: "product" as const, id: action, data: params },
          metadata: { dispatcher: "productDispatcher", action, params },
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx as any);
        if (preResult.blocked) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action,
            }) }],
          };
        }

        // Route to engine
        const result = SFC_ACTIONS.includes(action as any)
          ? await (await getProductEngine("productSFC"))(action, params)
          : PPG_ACTIONS.includes(action as any)
          ? await (await getProductEngine("productPPG"))(action, params)
          : SHOP_ACTIONS.includes(action as any)
          ? await (await getProductEngine("productShop"))(action, params)
          : await (await getProductEngine("productACNC"))(action, params);

        // Post-hooks
        await hookExecutor.execute("post-calculation", {
          ...hookCtx,
          target: { ...hookCtx.target, data: { ...params, result } },
        } as any);

        // Response formatting
        if (params.response_level) {
          const formatted = formatByLevel(
            result,
            params.response_level as ResponseLevel,
            (r: any) => productExtractKeyValues(action, r)
          );
          return { content: [{ type: "text" as const, text: JSON.stringify(formatted) }] };
        }

        // Context-pressure-aware slimming
        const pressure = getCurrentPressurePct();
        if (pressure > 50) {
          const keyValues = productExtractKeyValues(action, result);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(slimResponse(
              { action, ...result, _keyValues: keyValues },
              getSlimLevel(pressure)
            )) }],
          };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify({ action, ...result }) }] };
      } catch (err: any) {
        log.error(`[prism_product] ${action} failed: ${err.message}`);
        return dispatcherError(err, action, "prism_product");
      }
    }
  );
}
