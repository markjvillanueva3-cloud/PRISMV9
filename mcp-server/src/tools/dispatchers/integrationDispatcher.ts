/**
 * PRISM MCP Server - Integration Dispatcher
 *
 * Routes 42 external system integration actions.
 * Extracted from intelligenceDispatcher (SYS-MS1-U02).
 *
 * Sub-engines:
 *   camIntegration          (6 actions)  — CAM software integration
 *   dncTransfer             (8 actions)  — DNC program transfer
 *   erpIntegration          (10 actions) — ERP work order / cost / quality
 *   mobileInterface         (8 actions)  — Mobile shop floor interface
 *   measurementIntegration  (10 actions) — CMM / probing / surface measurement
 *
 * @milestone SYS-MS1-U02
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { formatByLevel, type ResponseLevel } from "../../types/ResponseLevel.js";

// Lazy engine cache
let _camIntegration: any, _dncTransfer: any, _erpIntegration: any,
    _mobileInterface: any, _measurementIntegration: any;

async function getIntegrationEngine(name: string): Promise<any> {
  switch (name) {
    case "camIntegration":     return _camIntegration ??= (await import("../../engines/CAMIntegrationEngine.js")).camIntegration;
    case "dncTransfer":        return _dncTransfer ??= (await import("../../engines/DNCTransferEngine.js")).dncTransfer;
    case "erpIntegration":     return _erpIntegration ??= (await import("../../engines/ERPIntegrationEngine.js")).erpIntegration;
    case "mobileInterface":    return _mobileInterface ??= (await import("../../engines/MobileInterfaceEngine.js")).mobileInterface;
    case "measurementIntegration": return _measurementIntegration ??= (await import("../../engines/MeasurementIntegrationEngine.js")).measurementIntegration;
    default: throw new Error(`Unknown integration engine: ${name}`);
  }
}

// ============================================================================
// ACTION ARRAYS
// ============================================================================

const CAM_ACTIONS = [
  "cam_recommend", "cam_export", "cam_analyze_op",
  "cam_tool_library", "cam_tool_get", "cam_systems",
] as const;

const DNC_ACTIONS = [
  "dnc_generate", "dnc_send", "dnc_compare", "dnc_verify",
  "dnc_qr", "dnc_systems", "dnc_history", "dnc_get",
] as const;

const ERP_ACTIONS = [
  "erp_import_wo", "erp_get_plan", "erp_cost_feedback", "erp_cost_history",
  "erp_quality_import", "erp_quality_history", "erp_tool_inventory",
  "erp_tool_update", "erp_systems", "erp_wo_list",
] as const;

const MOBILE_ACTIONS = [
  "mobile_lookup", "mobile_voice", "mobile_alarm",
  "mobile_timer_start", "mobile_timer_check", "mobile_timer_reset",
  "mobile_timer_list", "mobile_cache",
] as const;

const MEASURE_ACTIONS = [
  "measure_cmm_import", "measure_cmm_history", "measure_cmm_get",
  "measure_surface", "measure_surface_history", "measure_probe_record",
  "measure_probe_drift", "measure_probe_history", "measure_bias_detect",
  "measure_summary",
] as const;

const ACTIONS = [
  ...CAM_ACTIONS,
  ...DNC_ACTIONS,
  ...ERP_ACTIONS,
  ...MOBILE_ACTIONS,
  ...MEASURE_ACTIONS,
] as const;

// ============================================================================
// KEY VALUE EXTRACTOR (for slim responses)
// ============================================================================

function integrationExtractKeyValues(action: string, result: any): Record<string, any> {
  if (!result || typeof result !== "object") return { value: result };
  switch (action) {
    // CAM
    case "cam_recommend":
      return { operation: result.operation, rpm: result.recommended?.rpm, feed: result.recommended?.feed_mmmin };
    case "cam_export":
      return { format: result.format, system: result.target_system };
    case "cam_analyze_op":
      return { match: result.match_pct, issues: result.issues?.length };
    case "cam_tool_library":
      return { total: result.total };
    case "cam_tool_get":
      return { id: result.id, type: result.type, diameter: result.diameter_mm };
    case "cam_systems":
      return { count: result.systems?.length };
    // DNC
    case "dnc_generate":
      return { program: result.program_number, rpm: result.parameters?.rpm, feed: result.parameters?.feed_mmmin };
    case "dnc_send":
    case "dnc_compare":
    case "dnc_verify":
      return { id: result.transfer_id, status: result.status, program: result.program_number };
    case "dnc_qr":
      return { bytes: result.byte_size, fits_qr: result.fits_standard_qr };
    case "dnc_systems":
      return { count: result.total };
    case "dnc_history":
      return { total: result.total };
    case "dnc_get":
      return { id: result.transfer_id, status: result.status };
    // Mobile
    case "mobile_lookup":
      return { rpm: result.rpm, feed_ipm: result.feed_ipm, status: result.display?.status_color };
    case "mobile_voice":
      return { interpreted: result.interpreted, confidence: result.confidence, rpm: result.parameters?.rpm };
    case "mobile_alarm":
      return { code: result.code, severity: result.severity, downtime_min: result.estimated_downtime_min };
    case "mobile_timer_start":
    case "mobile_timer_check":
    case "mobile_timer_reset":
      return { id: result.timer_id, state: result.state, remaining: result.remaining_min };
    case "mobile_timer_list":
      return { total: result.total };
    case "mobile_cache":
      return { entries: result.entries?.length, bytes: result.total_bytes };
    // ERP
    case "erp_import_wo":
      return { wo: result.wo_number, cycle_min: result.total_cycle_time_min, cost: result.estimated_cost?.total };
    case "erp_get_plan":
      return { wo: result.wo_number, steps: result.routing?.length, cost: result.estimated_cost?.total };
    case "erp_cost_feedback":
      return { wo: result.wo_number, variance_pct: result.variance?.total_pct };
    case "erp_cost_history":
      return { total: result.total, avg_variance: result.avg_variance_pct };
    case "erp_quality_import":
      return { wo: result.wo_number, pass: result.pass, out_of_spec: result.analysis?.out_of_spec };
    case "erp_quality_history":
      return { total: result.total, pass_rate: result.pass_rate };
    case "erp_tool_inventory":
      return { total: result.total, need_reorder: result.need_reorder };
    case "erp_tool_update":
      return { id: result.tool_id, available: result.available };
    case "erp_systems":
      return { count: result.total };
    case "erp_wo_list":
      return { total: result.total };
    // Measurement
    case "measure_cmm_import":
      return { id: result.report_id, pass: result.summary?.pass, features: result.summary?.total_features, cpk: result.summary?.cpk_estimate };
    case "measure_cmm_history":
      return { total: result.total, pass_rate: result.pass_rate };
    case "measure_cmm_get":
      return { id: result.report_id, pass: result.summary?.pass };
    case "measure_surface":
      return { id: result.measurement_id, accuracy: result.model_accuracy, ra_error: result.ra_error_pct };
    case "measure_surface_history":
      return { total: result.total, avg_ra_error: result.avg_ra_error_pct };
    case "measure_probe_record":
      return { id: result.probe_id, deviation: result.deviation };
    case "measure_probe_drift":
      return { direction: result.direction, rate: result.rate_um_per_part, action: result.action };
    case "measure_probe_history":
      return { total: result.total, machine: result.machine, feature: result.feature };
    case "measure_bias_detect":
      return { biases: result.biases?.length, machine: result.machine };
    case "measure_summary":
      return { health: result.overall_health, cmm_reports: result.cmm?.reports, probe_features: result.probing?.features_tracked };
    default:
      return result;
  }
}

// ============================================================================
// REGISTRATION
// ============================================================================

/** Registers integration dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerIntegrationDispatcher(server: any): void {
  server.tool(
    "prism_integration",
    "External system integration: CAM software, DNC transfer, ERP work orders/costing, mobile shop floor, CMM/probing measurement. Use 'action' param.",
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({ action, params: rawParams = {} }: { action: string; params?: Record<string, any> }) => {
      log.info(`[prism_integration] Action: ${action}`);

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
          target: { type: "integration" as const, id: action, data: params },
          metadata: { dispatcher: "integrationDispatcher", action, params },
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
        const result = CAM_ACTIONS.includes(action as any)
          ? await (await getIntegrationEngine("camIntegration"))(action, params)
          : DNC_ACTIONS.includes(action as any)
          ? await (await getIntegrationEngine("dncTransfer"))(action, params)
          : ERP_ACTIONS.includes(action as any)
          ? await (await getIntegrationEngine("erpIntegration"))(action, params)
          : MOBILE_ACTIONS.includes(action as any)
          ? await (await getIntegrationEngine("mobileInterface"))(action, params)
          : await (await getIntegrationEngine("measurementIntegration"))(action, params);

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
            (r: any) => integrationExtractKeyValues(action, r)
          );
          return { content: [{ type: "text" as const, text: JSON.stringify(formatted) }] };
        }

        // Context-pressure-aware slimming
        const pressure = getCurrentPressurePct();
        if (pressure > 50) {
          const keyValues = integrationExtractKeyValues(action, result);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(slimResponse(
              { action, ...result, _keyValues: keyValues },
              getSlimLevel(pressure)
            )) }],
          };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify({ action, ...result }) }] };
      } catch (err: any) {
        log.error(`[prism_integration] ${action} failed: ${err.message}`);
        return dispatcherError(err, action, "prism_integration");
      }
    }
  );
}
