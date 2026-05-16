/**
 * PRISM MCP Server - Integration Dispatcher
 *
 * Routes 55 external system integration actions.
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
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_INTEGRATION_SCHEMAS } from "../../schemas/integrationActionSchemas.js";
import { formatByLevel, type ResponseLevel } from "../../types/ResponseLevel.js";

/** Hook context shape varies by dispatcher — named alias avoids bare `as any` */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HookContext = any;

/** Action string is validated by Zod enum but `.includes()` needs wider type */
type ActionString = string;

// Lazy engine cache
let _camIntegration: any, _dncTransfer: any, _erpIntegration: any,
    _mobileInterface: any, _measurementIntegration: any, _e2Connector: any,
    _multiErp: any;

async function getIntegrationEngine(name: string): Promise<any> {
  switch (name) {
    case "camIntegration":     return _camIntegration ??= (await import("../../engines/CAMIntegrationEngine.js")).camIntegration;
    case "dncTransfer":        return _dncTransfer ??= (await import("../../engines/DNCTransferEngine.js")).dncTransfer;
    case "erpIntegration":     return _erpIntegration ??= (await import("../../engines/ERPIntegrationEngine.js")).erpIntegration;
    case "mobileInterface":    return _mobileInterface ??= (await import("../../engines/MobileInterfaceEngine.js")).mobileInterface;
    case "measurementIntegration": return _measurementIntegration ??= (await import("../../engines/MeasurementIntegrationEngine.js")).measurementIntegration;
    case "e2Connector":           return _e2Connector ??= (await import("../../engines/E2ShopConnectorEngine.js")).e2ShopConnectorEngine;
    case "multiErp":              return _multiErp ??= (await import("../../engines/MultiERPConnectorEngine.js")).multiERPConnectorEngine;
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

const E2_ACTIONS = [
  "e2_connect", "e2_import_wo", "e2_import_batch", "e2_export_plan",
  "e2_sync_inventory", "e2_get_time_tracking", "e2_get_job_status",
] as const;

const MULTI_ERP_ACTIONS = [
  "multi_erp_connect", "multi_erp_import_wo", "multi_erp_export_plan",
  "multi_erp_sync_inventory", "multi_erp_status", "multi_erp_list_systems",
] as const;

const ACTIONS = [
  ...CAM_ACTIONS,
  ...DNC_ACTIONS,
  ...ERP_ACTIONS,
  ...MOBILE_ACTIONS,
  ...MEASURE_ACTIONS,
  ...E2_ACTIONS,
  ...MULTI_ERP_ACTIONS,
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
    // E2 Shop System
    case "e2_connect":
      return { connected: result.connected, version: result.version, latency_ms: result.latency_ms };
    case "e2_import_wo":
      return { wo: result.work_order?.id, material: result.work_order?.material, steps: result.work_order?.routing?.length, warnings: result.warnings?.length };
    case "e2_import_batch":
      return { imported: result.imported, total: result.total_found, warnings: result.warnings?.length };
    case "e2_export_plan":
      return { success: result.success, steps_updated: result.steps_updated };
    case "e2_sync_inventory":
      return { total: result.total, below_reorder: result.below_reorder };
    case "e2_get_time_tracking":
      return { entries: result.entries?.length, total_hours: result.total_hours };
    case "e2_get_job_status":
      return { wo: result.work_order_no, status: result.status, progress_pct: result.progress_pct };
    // Multi-ERP (SQ4-0-ERP)
    case "multi_erp_connect":
      return { connected: result.connected, system: result.system, latency_ms: result.latency_ms };
    case "multi_erp_import_wo":
      return { count: result.work_orders?.length, total: result.total_available, system: result.source_system, warnings: result.warnings?.length };
    case "multi_erp_export_plan":
      return { success: result.success, updated: result.updated_steps, system: result.source_system };
    case "multi_erp_sync_inventory":
      return { total: result.total, system: result.source_system };
    case "multi_erp_status":
      return { registered: result.registered_count, systems: result.systems?.map((s: any) => s.alias) };
    case "multi_erp_list_systems":
      return { count: result.length };
    default:
      return result;
  }
}

// ============================================================================
// E2 SHOP SYSTEM ROUTING (Session 5-5)
// ============================================================================

async function routeE2Action(action: string, params: Record<string, any>): Promise<any> {
  const engine = await getIntegrationEngine("e2Connector");
  const config = {
    base_url: params.base_url ?? params.e2_url ?? "",
    api_key: params.api_key ?? params.e2_key ?? "",
    timeout_ms: params.timeout_ms,
    company_id: params.company_id,
  };

  switch (action) {
    case "e2_connect":
      return engine.connect(config);
    case "e2_import_wo":
      return engine.importWorkOrder(config, params.work_order_no ?? params.wo);
    case "e2_import_batch":
      return engine.importBatch(config, { status: params.status, from_date: params.from_date, to_date: params.to_date, limit: params.limit });
    case "e2_export_plan":
      return engine.exportPlan(config, { work_order_no: params.work_order_no ?? params.wo, optimized_steps: params.steps ?? params.optimized_steps ?? [] });
    case "e2_sync_inventory":
      return engine.syncInventory(config);
    case "e2_get_time_tracking":
      return engine.getTimeTracking(config, { work_order_no: params.work_order_no ?? params.wo, from_date: params.from_date, to_date: params.to_date });
    case "e2_get_job_status":
      return engine.getJobStatus(config, params.work_order_no ?? params.wo);
    default:
      throw new Error(`Unknown E2 action: ${action}`);
  }
}

// ============================================================================
// MULTI-ERP ROUTING (SQ4-0-ERP)
// ============================================================================

async function routeMultiErpAction(action: string, params: Record<string, any>): Promise<any> {
  const engine = await getIntegrationEngine("multiErp");
  const config = params.config ?? {
    system: params.system ?? params.erp_system,
    base_url: params.base_url ?? params.url,
    api_key: params.api_key ?? params.key,
    username: params.username,
    password: params.password,
    timeout_ms: params.timeout_ms,
    company_id: params.company_id,
    csv_source: params.csv_source ?? params.csv_data,
    csv_mapping: params.csv_mapping,
  };

  switch (action) {
    case "multi_erp_connect":
      return engine.connect({ alias: params.alias, config });
    case "multi_erp_import_wo":
      return engine.importWorkOrder({
        alias: params.alias, config,
        wo_id: params.wo_id ?? params.work_order_no ?? params.wo,
        filter: params.filter ?? { status: params.status, date_from: params.date_from, date_to: params.date_to, limit: params.limit },
      });
    case "multi_erp_export_plan":
      return engine.exportPlan({ alias: params.alias, config, plan: params.plan });
    case "multi_erp_sync_inventory":
      return engine.syncInventory({ alias: params.alias, config });
    case "multi_erp_status":
      return engine.status();
    case "multi_erp_list_systems":
      return engine.listSystems();
    default:
      throw new Error(`Unknown multi-ERP action: ${action}`);
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
    "External system integration: CAM software, DNC transfer, ERP work orders/costing, multi-ERP connector (E2/Epicor/ProShop/CSV), mobile shop floor, CMM/probing measurement. 55 actions. Use 'action' param.",
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
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx as HookContext);
        if (preResult.blocked) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action,
            }) }],
          };
        }

        // SYS-MS6: Validate params against per-action Zod schema
        const validation = validateActionParams(action, params, ACTION_INTEGRATION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_integration"
          );
        }

        // Route to engine
        const result = CAM_ACTIONS.includes(action as ActionString as typeof CAM_ACTIONS[number])
          ? await (await getIntegrationEngine("camIntegration"))(action, params)
          : DNC_ACTIONS.includes(action as ActionString as typeof DNC_ACTIONS[number])
          ? await (await getIntegrationEngine("dncTransfer"))(action, params)
          : E2_ACTIONS.includes(action as ActionString as typeof E2_ACTIONS[number])
          ? await routeE2Action(action, params)
          : MULTI_ERP_ACTIONS.includes(action as ActionString as typeof MULTI_ERP_ACTIONS[number])
          ? await routeMultiErpAction(action, params)
          : ERP_ACTIONS.includes(action as ActionString as typeof ERP_ACTIONS[number])
          ? await (await getIntegrationEngine("erpIntegration"))(action, params)
          : MOBILE_ACTIONS.includes(action as ActionString as typeof MOBILE_ACTIONS[number])
          ? await (await getIntegrationEngine("mobileInterface"))(action, params)
          : await (await getIntegrationEngine("measurementIntegration"))(action, params);

        // Post-hooks
        await hookExecutor.execute("post-calculation", {
          ...hookCtx,
          target: { ...hookCtx.target, data: { ...params, result } },
        } as HookContext);

        // Response formatting
        if (params.response_level) {
          const formatted = formatByLevel(
            result,
            params.response_level as ResponseLevel,
            (r: any) => integrationExtractKeyValues(action, r)
          );
          return { content: [{ type: "text" as const, text: JSON.stringify(formatted) }] };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify({ action, ...result }) }] };
      } catch (err: any) {
        log.error(`[prism_integration] ${action} failed: ${err.message}`);
        return dispatcherError(err, action, "prism_integration");
      }
    }
  );
}
