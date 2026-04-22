/**
 * prism_monitoring — Monitoring & Observability Dispatcher
 *
 * 9 actions across 1 engine:
 *   Grafana Bridge (9): grafana_push_metrics, grafana_query,
 *     grafana_query_range, grafana_create_dashboard,
 *     grafana_manufacturing_dashboard, grafana_export_simulation,
 *     grafana_export_spc, grafana_export_tool_life,
 *     grafana_configure_alerts
 *
 * @milestone MON-MS0
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_MONITORING_SCHEMAS } from "../../schemas/monitoringActionSchemas.js";

// Lazy engine cache
let _grafanaBridge: any;

async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "grafanaBridge":
      return _grafanaBridge ??= (
        await import("../../engines/GrafanaBridgeEngine.js")
      ).grafanaBridgeEngine;
    default:
      throw new Error(`Unknown engine: ${name}`);
  }
}

const ACTIONS = [
  "grafana_push_metrics",
  "grafana_query",
  "grafana_query_range",
  "grafana_create_dashboard",
  "grafana_manufacturing_dashboard",
  "grafana_export_simulation",
  "grafana_export_spc",
  "grafana_export_tool_life",
  "grafana_configure_alerts",
] as const;

/** Registers monitoring dispatcher.
 * @param server - MCP server instance
 * @returns void
 */
export function registerMonitoringDispatcher(server: any): void {
  server.tool(
    "prism_monitoring",
    `Monitoring & Observability dispatcher — Grafana/Prometheus integration for shop floor monitoring. Push PRISM metrics to Prometheus, query PromQL, create Grafana dashboards, export simulation/SPC/tool-life data as metrics, configure manufacturing alerts.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({
      action,
      params: rawParams = {},
    }: {
      action: typeof ACTIONS[number];
      params?: Record<string, any>;
    }) => {
      try {
        // Validate params against schema map
        const validation = validateActionParams(action, rawParams as Record<string, unknown>, ACTION_MONITORING_SCHEMAS);
        if (validation && typeof validation === "object" && "valid" in validation && !validation.valid) {
          return dispatcherError(
            (validation as any).errorMessage || "Validation failed",
            action,
            "prism_monitoring",
          );
        }

        const params = rawParams;
        let result: any;

        switch (action) {
          // ── Grafana Bridge ──
          case "grafana_push_metrics": {
            const engine = await getEngine("grafanaBridge");
            result = engine.pushMetrics(params);
            break;
          }
          case "grafana_query": {
            const engine = await getEngine("grafanaBridge");
            result = engine.queryPrometheus(params);
            break;
          }
          case "grafana_query_range": {
            const engine = await getEngine("grafanaBridge");
            result = engine.queryRange(params);
            break;
          }
          case "grafana_create_dashboard": {
            const engine = await getEngine("grafanaBridge");
            result = engine.createDashboard(params);
            break;
          }
          case "grafana_manufacturing_dashboard": {
            const engine = await getEngine("grafanaBridge");
            result = engine.getManufacturingDashboard((params as any).machine);
            break;
          }
          case "grafana_export_simulation": {
            const engine = await getEngine("grafanaBridge");
            result = engine.exportMetricsFromSimulation(params);
            break;
          }
          case "grafana_export_spc": {
            const engine = await getEngine("grafanaBridge");
            result = engine.exportMetricsFromSPC(params);
            break;
          }
          case "grafana_export_tool_life": {
            const engine = await getEngine("grafanaBridge");
            result = engine.exportMetricsFromToolLife(params);
            break;
          }
          case "grafana_configure_alerts": {
            const engine = await getEngine("grafanaBridge");
            result = engine.configureAlerts(params);
            break;
          }
          default:
            return dispatcherError(`Unknown monitoring action: ${action}`, action, "prism_monitoring");
        }

        return slimResponse(result);
      } catch (err: any) {
        log.error(`prism_monitoring/${action} failed`, err);
        return dispatcherError(err?.message ?? String(err), action, "prism_monitoring");
      }
    },
  );
}
