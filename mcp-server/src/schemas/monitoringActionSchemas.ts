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
};
