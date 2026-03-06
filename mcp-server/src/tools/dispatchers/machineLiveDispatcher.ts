/**
 * PRISM MCP Server - Machine Live Dispatcher
 *
 * Routes 40 machine connectivity, adaptive control, predictive maintenance,
 * and Industry 4.0 actions. Extracted from intelligenceDispatcher (SYS-MS1-U01).
 *
 * Sub-engines:
 *   machineConnectivity    (16 actions) — Real-time machine connection & monitoring
 *   adaptiveControl        (10 actions) — Adaptive feed/speed/thermal control
 *   predictiveMaintenance  (10 actions) — Predictive maintenance analysis
 *   l3Industry (inline)    (4 actions)  — Industry 4.0 (tool crib, digital twin, energy)
 *
 * @milestone SYS-MS1-U01
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { formatByLevel, type ResponseLevel } from "../../types/ResponseLevel.js";

// Lazy engine cache
let _machineConnectivity: any, _adaptiveControl: any, _predictiveMaintenance: any;

async function getMachineLiveEngine(name: string): Promise<any> {
  switch (name) {
    case "machineConnectivity": return _machineConnectivity ??= (await import("../../engines/MachineConnectivityEngine.js")).machineConnectivity;
    case "adaptiveControl":    return _adaptiveControl ??= (await import("../../engines/AdaptiveControlEngine.js")).adaptiveControl;
    case "predictiveMaintenance": return _predictiveMaintenance ??= (await import("../../engines/PredictiveMaintenanceEngine.js")).predictiveMaintenance;
    default: throw new Error(`Unknown machine-live engine: ${name}`);
  }
}

// ============================================================================
// ACTION ARRAYS
// ============================================================================

const MACHINE_ACTIONS = [
  "machine_register", "machine_unregister", "machine_list",
  "machine_connect", "machine_disconnect", "machine_live_status",
  "machine_all_status", "machine_ingest", "chatter_detect_live",
  "tool_wear_start", "tool_wear_update", "tool_wear_status",
  "thermal_update", "thermal_status", "alert_acknowledge", "alert_history",
] as const;

const ADAPTIVE_ACTIONS = [
  "adaptive_chipload", "adaptive_chatter", "adaptive_wear", "adaptive_thermal",
  "adaptive_override", "adaptive_status", "adaptive_config", "adaptive_log",
  "adaptive_history", "adaptive_get",
] as const;

const MAINT_ACTIONS = [
  "maint_analyze", "maint_trend", "maint_predict", "maint_schedule",
  "maint_models", "maint_thresholds", "maint_alerts", "maint_status",
  "maint_history", "maint_get",
] as const;

const L3_INDUSTRY_ACTIONS = [
  "tool_crib_status", "digital_twin_state",
  "predictive_maintenance_alert", "energy_report",
] as const;

const ACTIONS = [
  ...MACHINE_ACTIONS,
  ...ADAPTIVE_ACTIONS,
  ...MAINT_ACTIONS,
  ...L3_INDUSTRY_ACTIONS,
] as const;

// ============================================================================
// INDUSTRY 4.0 INLINE HANDLER
// ============================================================================

/** L3 Industry Action.
 * @param action - action string
 * @param params - params for the operation
 * @returns any
 */
export function l3IndustryAction(action: string, params: Record<string, any>): any {
  switch (action) {
    case "tool_crib_status": {
      const tools = params.tools || [];
      return {
        total_tools: tools.length || 150,
        available: Math.round((tools.length || 150) * 0.72),
        checked_out: Math.round((tools.length || 150) * 0.22),
        in_regrind: Math.round((tools.length || 150) * 0.06),
        low_stock_alerts: params.low_stock_alerts || 3,
        next_order_due: params.next_order || "2026-03-05",
      };
    }
    case "digital_twin_state": {
      return {
        machine_id: params.machine_id || "M001",
        state: params.state || "running",
        spindle_rpm: params.spindle_rpm || 8000,
        feed_rate_mm_min: params.feed_rate || 2400,
        spindle_load_pct: params.spindle_load || 45,
        temperature_C: params.temperature || 28.5,
        vibration_mm_s: params.vibration || 0.8,
        last_sync: new Date().toISOString(),
        health_score: params.health_score || 0.92,
      };
    }
    case "predictive_maintenance_alert": {
      return {
        machine_id: params.machine_id || "M001",
        alerts: [
          { component: "spindle_bearing", risk_pct: params.bearing_risk || 15, action: "monitor", next_check: "2026-03-10" },
          { component: "ballscrew_x", risk_pct: params.ballscrew_risk || 8, action: "none", next_check: "2026-04-01" },
        ],
        overall_health: params.health || "good",
        mtbf_hours: params.mtbf || 4200,
      };
    }
    case "energy_report": {
      const kwh = params.kwh_consumed || 1250;
      const parts = params.parts_produced || 500;
      return {
        period: params.period || "weekly",
        kwh_consumed: kwh,
        parts_produced: parts,
        kwh_per_part: Math.round((kwh / Math.max(parts, 1)) * 100) / 100,
        cost_usd: Math.round(kwh * (params.rate_per_kwh || 0.12) * 100) / 100,
        idle_pct: params.idle_pct || 18,
        recommendation: (params.idle_pct || 18) > 25 ? "High idle time — review scheduling" : "Energy usage within normal range",
      };
    }
    default:
      return { error: `Unknown L3 industry action: ${action}` };
  }
}

// ============================================================================
// KEY VALUE EXTRACTOR (for slim responses)
// ============================================================================

function machineLiveExtractKeyValues(action: string, result: any): Record<string, any> {
  if (!result || typeof result !== "object") return { value: result };
  switch (action) {
    // Machine connectivity
    case "machine_register":
      return { id: result.id, name: result.name, protocol: result.protocol };
    case "machine_list":
      return { total: result.total };
    case "machine_live_status":
      return { id: result.machine?.id, state: result.current?.state, connected: result.connected };
    case "machine_all_status":
      return { count: result.machines?.length };
    case "chatter_detect_live":
      return { detected: result.chatter_detected, severity: result.severity, rpm: result.current_rpm };
    case "tool_wear_status":
    case "tool_wear_update":
      return { tool: result.tool_id, remaining: result.predicted_remaining_life_min, rate: result.wear_rate };
    case "thermal_status":
    case "thermal_update":
      return { drift_mm: result.estimated_z_drift_mm, stable: result.compensation_active };
    // Adaptive control
    case "adaptive_chipload":
      return { target: result.target_chipload_mm, actual: result.actual_chipload_mm, override: result.feed_override_pct };
    case "adaptive_chatter":
      return { chatter: result.is_chatter, rpm: result.recommended_rpm, freq: result.dominant_frequency_hz };
    case "adaptive_wear":
      return { wear: result.estimated_wear_pct, life: result.remaining_life_min, replace: result.should_replace };
    case "adaptive_thermal":
      return { drift_z: result.z_drift_um, compensated: result.compensation_applied };
    case "adaptive_override":
      return { channel: result.override?.channel, value: result.override?.value_pct, status: result.status };
    case "adaptive_status":
      return { active: result.active, sessions: result.total_sessions ?? result.sessions };
    case "adaptive_config":
      return { status: result.status, updated: result.updated_keys };
    case "adaptive_log":
      return { total: result.total };
    case "adaptive_history":
      return { sessions: result.total_sessions, overrides: result.total_overrides };
    case "adaptive_get":
      return { id: result.query_id ?? result.id };
    // Predictive maintenance
    case "maint_analyze":
      return { machine: result.machine_id, categories: result.analyzed_categories, alerts: result.alerts_generated };
    case "maint_trend":
      return { machine: result.machine_id, category: result.category, direction: result.trend?.direction, severity: result.severity, current: result.current_value };
    case "maint_predict":
      return { id: result.prediction_id, category: result.category, severity: result.severity, remaining_hours: result.remaining_life_hours, confidence: result.confidence_pct };
    case "maint_schedule":
      return { machines: result.total_machines, critical: result.summary?.critical, warning: result.summary?.warning, urgent: result.urgent?.length };
    case "maint_models":
      return { total: result.total };
    case "maint_thresholds":
      return { category: result.category, warning: result.warning, critical: result.critical };
    case "maint_alerts":
      return { total: result.total };
    case "maint_status":
      return { machine: result.machine_id, health: result.overall_health, severity: result.overall_severity, alerts: result.active_alerts?.length };
    case "maint_history":
      return { total: result.total, by_severity: result.by_severity };
    case "maint_get":
      return { id: result.prediction_id, category: result.category, severity: result.severity, remaining: result.remaining_life_hours };
    // L3 Industry
    case "tool_crib_status":
      return { total: result.total_tools, available: result.available, alerts: result.low_stock_alerts };
    case "digital_twin_state":
      return { machine: result.machine_id, state: result.state, health: result.health_score };
    case "predictive_maintenance_alert":
      return { machine: result.machine_id, health: result.overall_health, alerts: result.alerts?.length };
    case "energy_report":
      return { kwh: result.kwh_consumed, per_part: result.kwh_per_part, cost: result.cost_usd };
    default:
      return result;
  }
}

// ============================================================================
// REGISTRATION
// ============================================================================

/** Registers machine live dispatcher.
 * @param server - MCP server instance
 */
export function registerMachineLiveDispatcher(server: any): void {
  server.tool(
    "prism_machine_live",
    "Machine live monitoring & control: real-time connectivity, adaptive feed/speed/thermal control, predictive maintenance, Industry 4.0 (tool crib, digital twin, energy). Use 'action' param.",
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({ action, params: rawParams = {} }: { action: string; params?: Record<string, any> }) => {
      log.info(`[prism_machine_live] Action: ${action}`);

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
          target: { type: "machine_live" as const, id: action, data: params },
          metadata: { dispatcher: "machineLiveDispatcher", action, params },
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
        let result: any;
        if (L3_INDUSTRY_ACTIONS.includes(action as any)) {
          result = l3IndustryAction(action, params);
        } else if (MACHINE_ACTIONS.includes(action as any)) {
          result = await (await getMachineLiveEngine("machineConnectivity"))(action, params);
        } else if (ADAPTIVE_ACTIONS.includes(action as any)) {
          result = await (await getMachineLiveEngine("adaptiveControl"))(action, params);
        } else {
          result = await (await getMachineLiveEngine("predictiveMaintenance"))(action, params);
        }

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
            (r: any) => machineLiveExtractKeyValues(action, r)
          );
          return { content: [{ type: "text" as const, text: JSON.stringify(formatted) }] };
        }

        // Context-pressure-aware slimming
        const pressure = getCurrentPressurePct();
        if (pressure > 50) {
          const keyValues = machineLiveExtractKeyValues(action, result);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(slimResponse(
              { action, ...result, _keyValues: keyValues },
              getSlimLevel(pressure)
            )) }],
          };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify({ action, ...result }) }] };
      } catch (err: any) {
        log.error(`[prism_machine_live] ${action} failed: ${err.message}`);
        return dispatcherError(err, action, "prism_machine_live");
      }
    }
  );
}
