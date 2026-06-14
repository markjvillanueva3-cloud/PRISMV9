/**
 * Monitoring Dispatcher Action Schemas
 * ======================================
 * Per-action Zod schemas for all prism_monitoring actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/monitoringActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const optStr = z.string().optional();
const optNum = z.number().optional();
const optObj = z.record(z.string(), z.any()).optional();

const metricSample = z.object({
  name: z.string().min(1),
  labels: z.record(z.string(), z.string()).optional(),
  value: z.number(),
  timestamp: z.number().optional(),
  type: z.enum(["gauge", "counter", "histogram", "summary"]).optional(),
  help: z.string().optional(),
});

const dashboardPanel = z.object({
  title: z.string().min(1),
  type: z.enum(["timeseries", "gauge", "stat", "barchart", "histogram", "table", "heatmap"]),
  query: z.string().min(1),
  unit: optStr,
  description: optStr,
  thresholds: z.array(z.object({ value: z.number(), color: z.string() })).optional(),
  grid_pos: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }).optional(),
});

const alertRule = z.object({
  name: z.string().min(1),
  condition: z.string().min(1),
  threshold: z.number(),
  comparison: z.enum(["gt", "lt", "gte", "lte", "eq"]),
  duration: z.string().default("5m"),
  severity: z.enum(["critical", "warning", "info"]),
  summary: z.string().min(1),
  annotations: z.record(z.string(), z.string()).optional(),
  labels: z.record(z.string(), z.string()).optional(),
});

// ============================================================================
// GRAFANA BRIDGE (9 actions)
// ============================================================================

const grafana_push_metrics = z.object({
  metrics: z.array(metricSample).min(1),
  job: optStr,
  instance: optStr,
  config: optObj,
}).passthrough();

const grafana_query = z.object({
  query: z.string().min(1),
  time: optStr,
  timeout: optStr,
  config: optObj,
}).passthrough();

const grafana_query_range = z.object({
  query: z.string().min(1),
  start: z.string().min(1),
  end: z.string().min(1),
  step: z.string().min(1),
  timeout: optStr,
  config: optObj,
}).passthrough();

const grafana_create_dashboard = z.object({
  title: z.string().min(1),
  panels: z.array(dashboardPanel).min(1),
  folder_uid: optStr,
  tags: z.array(z.string()).optional(),
  refresh: optStr,
  time_from: optStr,
  time_to: optStr,
  config: optObj,
}).passthrough();

const grafana_manufacturing_dashboard = z.object({
  machine: optStr,
}).passthrough();

const grafana_export_simulation = z.object({
  simulationResult: z.record(z.string(), z.any()),
  machine: optStr,
  program: optStr,
}).passthrough();

const grafana_export_spc = z.object({
  spcResult: z.record(z.string(), z.any()),
  operation: optStr,
  characteristic: optStr,
}).passthrough();

const grafana_export_tool_life = z.object({
  toolLifeResult: z.record(z.string(), z.any()),
  tool_id: optStr,
  material: optStr,
}).passthrough();

const grafana_configure_alerts = z.object({
  rules: z.array(alertRule).min(1),
  folder_uid: optStr,
  evaluation_interval: optStr,
  config: optObj,
}).passthrough();

// ============================================================================
// METRICS ENGINE (9 actions) — application metrics: counters, gauges, histograms
// MetricsEngine wired by OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-METRICS (iter 12)
// ============================================================================

const metricName = z.string().min(1).describe("Metric name (alphanumeric, dot/underscore allowed)");
const metricLabels = z.record(z.string(), z.string()).optional().describe("Optional label set for high-cardinality grouping");
const metricType = z.enum(["counter", "gauge", "histogram", "timer"]);

const metric_define = z.object({
  name: metricName,
  type: metricType.describe("Metric type — counter/gauge/histogram/timer"),
  description: z.string().min(1).describe("Human-readable description"),
  labels: z.array(z.string()).default([]).describe("Permitted label keys (for documentation only)"),
  unit: z.string().optional().describe("Unit of measure (seconds, bytes, etc.)"),
}).passthrough();

const metric_increment = z.object({
  name: metricName,
  value: z.number().default(1).describe("Increment delta (must be >0 by convention; negative allowed but unusual)"),
  labels: metricLabels,
}).passthrough();

const metric_gauge = z.object({
  name: metricName,
  value: z.number().describe("Gauge absolute value"),
  labels: metricLabels,
}).passthrough();

const metric_observe = z.object({
  name: metricName,
  value: z.number().describe("Sample value to observe into the histogram"),
  labels: metricLabels,
}).passthrough();

const metric_get_counter = z.object({
  name: metricName,
  labels: metricLabels,
}).passthrough();

const metric_get_gauge = z.object({
  name: metricName,
  labels: metricLabels,
}).passthrough();

const metric_get_histogram = z.object({
  name: metricName,
  labels: metricLabels,
  buckets: z.array(z.number()).optional().describe("Custom histogram bucket boundaries (defaults to Prometheus-standard set)"),
}).passthrough();

const metric_export = z.object({}).passthrough().describe("Export all metrics as a Prometheus-compatible snapshot (no params)");

const metric_reset = z.object({}).passthrough().describe("Clear ALL metrics state (counters/gauges/histograms/labels) — destructive, no params");

// ============================================================================
// PAGERDUTY ALERTS (9 actions) — incident alerting / RACI / escalation / runbook
// PagerDutyAlertsEngine wired by WIRE-UNWIRED loop (U-PD-WIRE, 2026-05-17 foxtrot)
// Engine origin: LATHE-PROD-READY-MS0/U-LPR-OBS3 (PHASE-10 Observability + SLO)
// ============================================================================

const pdAlertSeverity = z.enum(["critical", "error", "warning", "info"]);
const pdAlertStatus = z.enum(["triggered", "acknowledged", "resolved"]);

const pdRaci = z.object({
  responsible: z.array(z.string()).describe("Who does the work"),
  accountable: z.string().describe("Who is ultimately accountable"),
  consulted: z.array(z.string()).describe("Who should be asked for input"),
  informed: z.array(z.string()).describe("Who should be notified"),
});

const pdCondition = z.object({
  metric: z.string().min(1).describe("Metric identifier"),
  operator: z.enum(["gt", "lt", "eq", "ne", "gte", "lte"]).describe("Comparison operator"),
  threshold: z.number().describe("Threshold value the metric is compared against"),
  duration: z.number().optional().describe("Required sustained duration in seconds"),
  labels: z.record(z.string(), z.string()).optional().describe("Label-set filter"),
});

const pdAlertRule = z.object({
  id: z.string().min(1).describe("Stable rule identifier"),
  name: z.string().min(1).describe("Human-readable rule name"),
  description: z.string().describe("Rule purpose / what it catches"),
  condition: pdCondition.describe("Trigger condition (metric/operator/threshold)"),
  severity: pdAlertSeverity.describe("Alert severity tier"),
  routingKey: z.string().describe("PagerDuty routing key for this rule"),
  escalationPolicy: z.string().optional().describe("Escalation policy id (defaults to engine default)"),
  runbookUrl: z.string().optional().describe("URL to runbook for responders"),
  raci: pdRaci.describe("RACI assignment for this alert"),
  tags: z.array(z.string()).describe("Searchable tag set"),
  enabled: z.boolean().describe("Whether rule fires (false = disabled, retained for audit)"),
  suppressDuplicatesFor: z.number().optional().describe("Dedup window in seconds"),
  maintenanceWindows: z.array(z.string()).optional().describe("Window IDs to skip during"),
});

const pd_register_rule = z.object({
  rule: pdAlertRule.describe("AlertRule payload to register"),
}).passthrough();

const pd_register_standard_rules = z.object({}).passthrough().describe(
  "Bulk-register the 6 PRISM-canonical rules (lora-autorollback, tenant-isolation-breach, sim-false-negative, mtconnect-stream-loss, program-gen-slo-breach, safety-score-critical). Idempotent — already-registered rules are skipped. No params.",
);

const pd_trigger_alert = z.object({
  ruleId: z.string().min(1).describe("Rule id to trigger (must be previously registered)"),
  summary: z.string().min(1).describe("Short human-readable description of the incident"),
  source: z.string().min(1).describe("Where the alert originated (hostname, engine name, pipeline id)"),
  component: z.string().optional().describe("Sub-system inside the source"),
  group: z.string().optional().describe("Grouping label (often a fleet/cluster name)"),
  customDetails: z.record(z.string(), z.any()).optional().describe("Free-form payload for the alert"),
  links: z.array(z.object({
    href: z.string().min(1).describe("Link target URL"),
    text: z.string().min(1).describe("Display text for the link"),
  })).optional().describe("Additional links to surface on the incident"),
}).passthrough();

const pd_acknowledge_alert = z.object({
  dedupKey: z.string().min(1).describe("Dedup key of the alert to acknowledge"),
  acknowledgedBy: z.string().min(1).describe("Identifier of the human/agent acknowledging"),
}).passthrough();

const pd_resolve_alert = z.object({
  dedupKey: z.string().min(1).describe("Dedup key of the alert to resolve"),
  resolvedBy: z.string().min(1).describe("Identifier of the human/agent resolving"),
}).passthrough();

const pd_list_active_alerts = z.object({
  status: pdAlertStatus.optional().describe("Restrict to alerts with this status"),
  severity: pdAlertSeverity.optional().describe("Restrict to alerts with this severity"),
  ruleId: z.string().optional().describe("Restrict to alerts produced by this rule"),
}).passthrough();

const pd_get_stats = z.object({}).passthrough().describe(
  "Snapshot of aggregate alert stats (total/active/acknowledged/resolved counts, per-severity, per-rule, mean ack/resolve times, suppressed count). No params.",
);

const pd_build_event_payload = z.object({
  dedupKey: z.string().min(1).describe("Dedup key of the alert whose payload is being built"),
  eventAction: z.enum(["trigger", "acknowledge", "resolve"]).describe("PagerDuty event action this payload represents"),
}).passthrough();

const pd_get_runbook = z.object({
  ruleId: z.string().min(1).describe("Rule id whose runbook URL is being requested"),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const ACTION_MONITORING_SCHEMAS: ActionSchemaMap = {
  grafana_push_metrics,
  grafana_query,
  grafana_query_range,
  grafana_create_dashboard,
  grafana_manufacturing_dashboard,
  grafana_export_simulation,
  grafana_export_spc,
  grafana_export_tool_life,
  grafana_configure_alerts,
  metric_define,
  metric_increment,
  metric_gauge,
  metric_observe,
  metric_get_counter,
  metric_get_gauge,
  metric_get_histogram,
  metric_export,
  metric_reset,
  // ── PagerDuty Alerts (9) — U-PD-WIRE
  pd_register_rule,
  pd_register_standard_rules,
  pd_trigger_alert,
  pd_acknowledge_alert,
  pd_resolve_alert,
  pd_list_active_alerts,
  pd_get_stats,
  pd_build_event_payload,
  pd_get_runbook,
};
