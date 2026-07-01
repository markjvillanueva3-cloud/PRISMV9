/**
 * prism_monitoring — Monitoring & Observability Dispatcher
 *
 * 27 actions across 3 engines:
 *   Grafana Bridge (9): grafana_push_metrics, grafana_query,
 *     grafana_query_range, grafana_create_dashboard,
 *     grafana_manufacturing_dashboard, grafana_export_simulation,
 *     grafana_export_spc, grafana_export_tool_life,
 *     grafana_configure_alerts
 *   Metrics Engine (9): metric_define, metric_increment, metric_gauge,
 *     metric_observe, metric_get_counter, metric_get_gauge,
 *     metric_get_histogram, metric_export, metric_reset
 *   PagerDuty Alerts (9): pd_register_rule, pd_register_standard_rules,
 *     pd_trigger_alert, pd_acknowledge_alert, pd_resolve_alert,
 *     pd_list_active_alerts, pd_get_stats, pd_build_event_payload,
 *     pd_get_runbook
 *
 * @milestone MON-MS0 + OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-METRICS
 *           + LATHE-PROD-READY-MS0/U-LPR-OBS3 (PagerDuty wire 2026-05-17 foxtrot)
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_MONITORING_SCHEMAS } from "../../schemas/monitoringActionSchemas.js";

// Lazy engine cache
let _grafanaBridge: any;
let _metrics: any;
let _pagerDuty: any;
let _hyperMillCfg: any;
let _emergentBehavior: any;
let _prometheus: any;

async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "grafanaBridge":
      return _grafanaBridge ??= (await import("../../engines/GrafanaBridgeEngine.js")).grafanaBridgeEngine;
    case "metrics":
      return _metrics ??= (await import("../../engines/MetricsEngine.js")).metricsEngine;
    case "pagerDuty":
      return _pagerDuty ??= (await import("../../engines/PagerDutyAlertsEngine.js")).pagerDutyAlertsEngine;
    case "hyperMillCfg":
      return _hyperMillCfg ??= (await import("../../engines/HyperMillMetricCfgExtractor.js")).hyperMillMetricCfgExtractor;
    case "emergentBehavior": {
      if (!_emergentBehavior) {
        const mod = await import("../../engines/EmergentBehaviorMonitorEngine.js");
        _emergentBehavior = new mod.EmergentBehaviorMonitorEngine();
      }
      return _emergentBehavior;
    }
    case "prometheus":
      return _prometheus ??= (await import("../../engines/PrometheusMetricsEngine.js")).prometheusMetricsEngine;
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
  // ── PagerDuty Alerts (9) — U-PD-WIRE 2026-05-17 (LATHE-PROD-READY-MS0/U-LPR-OBS3)
  "pd_register_rule",
  "pd_register_standard_rules",
  "pd_trigger_alert",
  "pd_acknowledge_alert",
  "pd_resolve_alert",
  "pd_list_active_alerts",
  "pd_get_stats",
  "pd_build_event_payload",
  "pd_get_runbook",
  // ── HyperMill Metric.cfg extractor (2) — DEA-MS0/U-DEA-november-02
  "metric_cfg_extract_all",
  "metric_cfg_extract_file",
  // ── Emergent behavior monitor (2) — DEA-MS0/U-DEA-november-02
  "behavior_observe",
  "behavior_detect",
  // ── Prometheus metrics engine (3) — DEA-MS0/U-DEA-november-04
  "prometheus_register",
  "prometheus_export",
  "prometheus_stats",
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

          // ── PagerDuty Alerts ── U-PD-WIRE (LATHE-PROD-READY-MS0/U-LPR-OBS3)
          case "pd_register_rule": {
            const engine = await getEngine("pagerDuty");
            const registered = engine.registerRule(params.rule);
            result = { success: true, registered, ruleId: params.rule?.id };
            break;
          }
          case "pd_register_standard_rules": {
            const engine = await getEngine("pagerDuty");
            engine.registerStandardRules();
            const rules = engine.listRules();
            result = {
              success: true,
              standardRulesRegistered: true,
              totalRules: rules.length,
              ruleIds: rules.map((r: { id: string }) => r.id),
            };
            break;
          }
          case "pd_trigger_alert": {
            const engine = await getEngine("pagerDuty");
            const alert = engine.triggerAlert({
              ruleId: params.ruleId,
              summary: params.summary,
              source: params.source,
              component: params.component,
              group: params.group,
              customDetails: params.customDetails,
              links: params.links,
            });
            if (alert) {
              result = { success: true, alert };
            } else {
              result = {
                success: false,
                error: "alert_not_triggered",
                detail: "Rule unknown, disabled, in maintenance, or deduplicated",
                ruleId: params.ruleId,
              };
            }
            break;
          }
          case "pd_acknowledge_alert": {
            const engine = await getEngine("pagerDuty");
            // P1.1 fail-loud: engine.acknowledgeAlert is idempotent (returns
            // alert unchanged when status != 'triggered'). Check pre-state so
            // operators can distinguish "I acked it" from "it was already in
            // a non-triggered state" — silent success would corrupt SLO stats.
            const preState = engine.getAlert(params.dedupKey);
            if (!preState) {
              result = {
                success: false,
                error: "alert_not_found",
                detail: "No active alert matches dedupKey",
                dedupKey: params.dedupKey,
              };
              break;
            }
            if (preState.status !== "triggered") {
              result = {
                success: false,
                error: "alert_state_conflict",
                detail: `Alert is in '${preState.status}' state; only 'triggered' alerts can be acknowledged`,
                dedupKey: params.dedupKey,
                currentStatus: preState.status,
                alert: preState,
              };
              break;
            }
            const alert = engine.acknowledgeAlert(params.dedupKey, params.acknowledgedBy);
            result = { success: true, alert };
            break;
          }
          case "pd_resolve_alert": {
            const engine = await getEngine("pagerDuty");
            // P1.1 fail-loud: engine.resolveAlert is idempotent for already-
            // resolved alerts (returns unchanged). Distinguish "I resolved it"
            // from "it was already resolved" so resolve-metrics don't double-
            // count. 'triggered' and 'acknowledged' are both valid pre-states.
            const preState = engine.getAlert(params.dedupKey);
            if (!preState) {
              result = {
                success: false,
                error: "alert_not_found",
                detail: "No alert matches dedupKey",
                dedupKey: params.dedupKey,
              };
              break;
            }
            if (preState.status === "resolved") {
              result = {
                success: false,
                error: "alert_state_conflict",
                detail: "Alert is already resolved",
                dedupKey: params.dedupKey,
                currentStatus: preState.status,
                alert: preState,
              };
              break;
            }
            const alert = engine.resolveAlert(params.dedupKey, params.resolvedBy);
            result = { success: true, alert };
            break;
          }
          case "pd_list_active_alerts": {
            const engine = await getEngine("pagerDuty");
            const filter: { status?: string; severity?: string; ruleId?: string } = {};
            if (params.status) filter.status = params.status;
            if (params.severity) filter.severity = params.severity;
            if (params.ruleId) filter.ruleId = params.ruleId;
            const alerts = engine.listActiveAlerts(Object.keys(filter).length > 0 ? filter : undefined);
            result = { success: true, count: alerts.length, alerts };
            break;
          }
          case "pd_get_stats": {
            const engine = await getEngine("pagerDuty");
            const stats = engine.getStats();
            result = { success: true, stats };
            break;
          }
          case "pd_build_event_payload": {
            const engine = await getEngine("pagerDuty");
            const alert = engine.getAlert(params.dedupKey);
            if (!alert) {
              result = {
                success: false,
                error: "alert_not_found",
                detail: "Cannot build payload — no alert matches dedupKey",
                dedupKey: params.dedupKey,
              };
              break;
            }
            const payload = engine.buildEventPayload(alert, params.eventAction);
            result = { success: true, payload };
            break;
          }
          case "pd_get_runbook": {
            const engine = await getEngine("pagerDuty");
            const url = engine.getRunbookUrl(params.ruleId);
            if (url) {
              result = { success: true, ruleId: params.ruleId, runbookUrl: url };
            } else {
              result = {
                success: false,
                error: "runbook_not_found",
                detail: "Rule has no runbookUrl set, or rule unknown",
                ruleId: params.ruleId,
              };
            }
            break;
          }

          // ── HyperMill Metric.cfg extractor ── DEA-MS0/U-DEA-november-02
          case "metric_cfg_extract_all": {
            const engine = await getEngine("hyperMillCfg");
            result = await engine.extractAll();
            break;
          }
          case "metric_cfg_extract_file": {
            const engine = await getEngine("hyperMillCfg");
            result = await engine.extractFile(params.filePath);
            break;
          }

          // ── Emergent behavior monitor ── DEA-MS0/U-DEA-november-02
          case "behavior_observe": {
            const engine = await getEngine("emergentBehavior");
            result = engine.observeMetric(params.name, params.value, params.at);
            break;
          }
          case "behavior_detect": {
            const engine = await getEngine("emergentBehavior");
            result = engine.detect(params.name);
            break;
          }

          // ── Prometheus metrics engine ── DEA-MS0/U-DEA-november-04
          case "prometheus_register": {
            const engine = await getEngine("prometheus");
            const registered = engine.register(params.definition ?? params);
            result = { success: registered, definition: params.definition ?? params };
            break;
          }
          case "prometheus_export": {
            const engine = await getEngine("prometheus");
            result = { exposition: engine.export() };
            break;
          }
          case "prometheus_stats": {
            const engine = await getEngine("prometheus");
            result = engine.getStats();
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
