/**
 * prism_monitoring — Monitoring & Observability Dispatcher
 *
 * 18 actions across 2 engines:
 *   Grafana Bridge (9): grafana_push_metrics, grafana_query,
 *     grafana_query_range, grafana_create_dashboard,
 *     grafana_manufacturing_dashboard, grafana_export_simulation,
 *     grafana_export_spc, grafana_export_tool_life,
 *     grafana_configure_alerts
 *   Metrics Engine (9): metric_define, metric_increment, metric_gauge,
 *     metric_observe, metric_get_counter, metric_get_gauge,
 *     metric_get_histogram, metric_export, metric_reset
 *
 * @milestone MON-MS0 + OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-METRICS
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_MONITORING_SCHEMAS } from "../../schemas/monitoringActionSchemas.js";

// Lazy engine cache
let _grafanaBridge: any;
let _metrics: any;

async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "grafanaBridge":
      return _grafanaBridge ??= (
        await import("../../engines/GrafanaBridgeEngine.js")
      ).grafanaBridgeEngine;
    case "metrics":
      return _metrics ??= (
        await import("../../engines/MetricsEngine.js")
      ).metricsEngine;
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
  // ── Metrics Engine (9) — OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-METRICS
  "metric_define",
  "metric_increment",
  "metric_gauge",
  "metric_observe",
  "metric_get_counter",
  "metric_get_gauge",
  "metric_get_histogram",
  "metric_export",
  "metric_reset",
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

          // ── Metrics Engine ──
          case "metric_define": {
            const engine = await getEngine("metrics");
            const def = {
              name: params.name,
              type: params.type,
              description: params.description,
              labels: params.labels ?? [],
              unit: params.unit,
            };
            engine.define(def);
            result = { success: true, defined: def };
            break;
          }
          case "metric_increment": {
            const engine = await getEngine("metrics");
            const value = engine.increment(params.name, params.value ?? 1, params.labels);
            result = { success: true, name: params.name, value, labels: params.labels };
            break;
          }
          case "metric_gauge": {
            const engine = await getEngine("metrics");
            engine.gauge(params.name, params.value, params.labels);
            result = { success: true, name: params.name, value: params.value, labels: params.labels };
            break;
          }
          case "metric_observe": {
            const engine = await getEngine("metrics");
            engine.observe(params.name, params.value, params.labels);
            result = { success: true, name: params.name, value: params.value, labels: params.labels };
            break;
          }
          case "metric_get_counter": {
            const engine = await getEngine("metrics");
            const value = engine.getCounter(params.name, params.labels);
            result = { success: true, name: params.name, value, labels: params.labels };
            break;
          }
          case "metric_get_gauge": {
            const engine = await getEngine("metrics");
            const value = engine.getGauge(params.name, params.labels);
            result = { success: true, name: params.name, value, labels: params.labels };
            break;
          }
          case "metric_get_histogram": {
            const engine = await getEngine("metrics");
            const histogram = engine.getHistogram(params.name, params.labels, params.buckets);
            result = { success: true, histogram };
            break;
          }
          case "metric_export": {
            const engine = await getEngine("metrics");
            result = { success: true, snapshot: engine.export() };
            break;
          }
          case "metric_reset": {
            const engine = await getEngine("metrics");
            engine.reset();
            result = { success: true, reset: true };
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
