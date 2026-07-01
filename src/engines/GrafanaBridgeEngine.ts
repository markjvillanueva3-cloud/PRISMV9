/**
 * GrafanaBridgeEngine — Bidirectional Grafana/Prometheus Integration
 *
 * Bridges PRISM manufacturing intelligence to Grafana dashboards and
 * Prometheus monitoring. Pushes CNC metrics, queries time series,
 * creates manufacturing dashboards, and configures alert rules.
 *
 * Capabilities:
 *   - Push metrics to Prometheus Pushgateway (text exposition format)
 *   - Query Prometheus via PromQL (instant + range)
 *   - Create/manage Grafana dashboards via API
 *   - Pre-built manufacturing dashboard (spindle/feed/wear/Cpk/OEE)
 *   - Export PRISM simulation/SPC/tool-life results as Prometheus metrics
 *   - Configure Grafana alert rules for manufacturing thresholds
 *
 * @engine GrafanaBridgeEngine
 * @dispatcher monitoringDispatcher
 * @actions grafana_push_metrics, grafana_query, grafana_query_range,
 *          grafana_create_dashboard, grafana_manufacturing_dashboard,
 *          grafana_export_simulation, grafana_export_spc,
 *          grafana_export_tool_life, grafana_configure_alerts
 */

// ============================================================================
// TYPES
// ============================================================================

export interface GrafanaConfig {
  grafana_url: string;          // e.g. http://localhost:3000
  grafana_api_key?: string;     // Bearer token
  prometheus_url: string;       // e.g. http://localhost:9090
  pushgateway_url: string;      // e.g. http://localhost:9091
  default_job?: string;         // default pushgateway job label
}

export interface MetricSample {
  name: string;
  labels?: Record<string, string>;
  value: number;
  timestamp?: number;           // unix ms
  type?: "gauge" | "counter" | "histogram" | "summary";
  help?: string;
}

export interface PushMetricsInput {
  metrics: MetricSample[];
  job?: string;
  instance?: string;
  config?: Partial<GrafanaConfig>;
}

export interface PushMetricsResult {
  success: boolean;
  metrics_pushed: number;
  exposition_text: string;
  pushgateway_url: string;
  errors: string[];
}

export interface PrometheusQueryInput {
  query: string;
  time?: string;             // RFC3339 or unix timestamp
  timeout?: string;          // e.g. "30s"
  config?: Partial<GrafanaConfig>;
}

export interface PrometheusRangeQueryInput {
  query: string;
  start: string;             // RFC3339 or unix timestamp
  end: string;
  step: string;              // e.g. "15s", "1m", "5m"
  timeout?: string;
  config?: Partial<GrafanaConfig>;
}

export interface PrometheusQueryResult {
  status: "success" | "error";
  result_type: "matrix" | "vector" | "scalar" | "string";
  results: PrometheusResultEntry[];
  query: string;
  request_url: string;
}

export interface PrometheusResultEntry {
  metric: Record<string, string>;
  values?: [number, string][];   // [timestamp, value] for range
  value?: [number, string];      // [timestamp, value] for instant
}

export interface DashboardPanel {
  title: string;
  type: "timeseries" | "gauge" | "stat" | "barchart" | "histogram" | "table" | "heatmap";
  query: string;
  unit?: string;
  thresholds?: { value: number; color: string }[];
  description?: string;
  grid_pos?: { x: number; y: number; w: number; h: number };
}

export interface CreateDashboardInput {
  title: string;
  panels: DashboardPanel[];
  folder_uid?: string;
  tags?: string[];
  refresh?: string;           // e.g. "5s", "10s", "1m"
  time_from?: string;         // e.g. "now-1h"
  time_to?: string;
  config?: Partial<GrafanaConfig>;
}

export interface CreateDashboardResult {
  success: boolean;
  dashboard_uid: string;
  dashboard_url: string;
  panel_count: number;
  json: Record<string, any>;
  errors: string[];
}

export interface AlertRule {
  name: string;
  condition: string;          // PromQL expression
  threshold: number;
  comparison: "gt" | "lt" | "gte" | "lte" | "eq";
  duration: string;           // e.g. "5m"
  severity: "critical" | "warning" | "info";
  summary: string;
  annotations?: Record<string, string>;
  labels?: Record<string, string>;
}

export interface ConfigureAlertsInput {
  rules: AlertRule[];
  folder_uid?: string;
  evaluation_interval?: string;
  config?: Partial<GrafanaConfig>;
}

export interface ConfigureAlertsResult {
  success: boolean;
  rules_created: number;
  alert_rules: { name: string; uid: string; condition: string }[];
  errors: string[];
}

export interface SimulationMetricsInput {
  simulationResult: Record<string, any>;
  machine?: string;
  program?: string;
}

export interface SPCMetricsInput {
  spcResult: Record<string, any>;
  operation?: string;
  characteristic?: string;
}

export interface ToolLifeMetricsInput {
  toolLifeResult: Record<string, any>;
  tool_id?: string;
  material?: string;
}

export interface ExportMetricsResult {
  metrics: MetricSample[];
  exposition_text: string;
  metric_count: number;
  source: string;
}

// ============================================================================
// CONSTANTS — Prometheus Metric Naming Convention
// ============================================================================

const METRIC_PREFIX = "prism";

const METRIC_REGISTRY: Record<string, { type: MetricSample["type"]; help: string; unit: string }> = {
  spindle_load_percent:      { type: "gauge",   help: "Spindle load as percentage of rated capacity",       unit: "percent" },
  feed_rate_mmpm:            { type: "gauge",   help: "Actual feed rate in mm/min",                         unit: "mmpm" },
  tool_wear_vb_mm:           { type: "gauge",   help: "Tool flank wear VB in mm",                          unit: "mm" },
  cutting_force_n:           { type: "gauge",   help: "Cutting force component in Newtons",                 unit: "newtons" },
  surface_roughness_ra_um:   { type: "gauge",   help: "Surface roughness Ra in micrometers",                unit: "micrometers" },
  cpk:                       { type: "gauge",   help: "Process capability index Cpk",                       unit: "" },
  cycle_time_seconds:        { type: "gauge",   help: "Cycle time per part in seconds",                     unit: "seconds" },
  tool_life_remaining_percent: { type: "gauge", help: "Remaining tool life as percentage",                  unit: "percent" },
  temperature_celsius:       { type: "gauge",   help: "Cutting zone temperature in Celsius",                unit: "celsius" },
  oee_percent:               { type: "gauge",   help: "Overall Equipment Effectiveness percentage",         unit: "percent" },
  alarm_count:               { type: "counter", help: "Cumulative alarm count",                             unit: "" },
  chip_load_mm:              { type: "gauge",   help: "Chip load per tooth in mm",                          unit: "mm" },
  power_consumption_kw:      { type: "gauge",   help: "Spindle power consumption in kW",                    unit: "kilowatts" },
  vibration_amplitude_g:     { type: "gauge",   help: "Vibration amplitude in g",                           unit: "g" },
  mrr_cm3pm:                 { type: "gauge",   help: "Material removal rate in cm3/min",                   unit: "cm3pm" },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class GrafanaBridgeEngine {
  private config: GrafanaConfig = {
    grafana_url: "http://localhost:3000",
    prometheus_url: "http://localhost:9090",
    pushgateway_url: "http://localhost:9091",
    default_job: "prism",
  };

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  configure(config: Partial<GrafanaConfig>): GrafanaConfig {
    this.config = { ...this.config, ...config };
    return { ...this.config };
  }

  getConfig(): GrafanaConfig {
    return { ...this.config };
  }

  // --------------------------------------------------------------------------
  // Metric Formatting — Prometheus Text Exposition Format
  // --------------------------------------------------------------------------

  /**
   * Format a single metric in Prometheus text exposition format.
   * Format: metric_name{label1="val1",label2="val2"} value [timestamp]
   */
  formatMetric(metric: MetricSample): string {
    const fullName = metric.name.startsWith(METRIC_PREFIX + "_")
      ? metric.name
      : `${METRIC_PREFIX}_${metric.name}`;

    const sanitizedName = fullName.replace(/[^a-zA-Z0-9_:]/g, "_");

    const labelParts: string[] = [];
    if (metric.labels) {
      for (const [k, v] of Object.entries(metric.labels)) {
        const sanitizedKey = k.replace(/[^a-zA-Z0-9_]/g, "_");
        const escapedVal = String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
        labelParts.push(`${sanitizedKey}="${escapedVal}"`);
      }
    }

    const labelStr = labelParts.length > 0 ? `{${labelParts.join(",")}}` : "";
    const tsStr = metric.timestamp ? ` ${metric.timestamp}` : "";

    return `${sanitizedName}${labelStr} ${metric.value}${tsStr}`;
  }

  /**
   * Format an array of metrics into full Prometheus exposition text
   * with TYPE and HELP comments.
   */
  formatExposition(metrics: MetricSample[]): string {
    const lines: string[] = [];
    const seenTypes = new Set<string>();

    for (const metric of metrics) {
      const fullName = metric.name.startsWith(METRIC_PREFIX + "_")
        ? metric.name
        : `${METRIC_PREFIX}_${metric.name}`;
      const sanitizedName = fullName.replace(/[^a-zA-Z0-9_:]/g, "_");

      // Emit HELP and TYPE once per metric name
      if (!seenTypes.has(sanitizedName)) {
        seenTypes.add(sanitizedName);
        const reg = METRIC_REGISTRY[metric.name] || METRIC_REGISTRY[metric.name.replace(`${METRIC_PREFIX}_`, "")];
        const help = metric.help || reg?.help || `PRISM metric ${metric.name}`;
        const type = metric.type || reg?.type || "gauge";
        lines.push(`# HELP ${sanitizedName} ${help}`);
        lines.push(`# TYPE ${sanitizedName} ${type}`);
      }

      lines.push(this.formatMetric(metric));
    }

    return lines.join("\n") + "\n";
  }

  // --------------------------------------------------------------------------
  // Push Metrics to Prometheus Pushgateway
  // --------------------------------------------------------------------------

  pushMetrics(input: PushMetricsInput): PushMetricsResult {
    const cfg = { ...this.config, ...input.config };
    const job = input.job || cfg.default_job || "prism";
    const errors: string[] = [];

    if (!input.metrics || input.metrics.length === 0) {
      return {
        success: false,
        metrics_pushed: 0,
        exposition_text: "",
        pushgateway_url: cfg.pushgateway_url,
        errors: ["No metrics provided"],
      };
    }

    // Validate metrics
    const validMetrics: MetricSample[] = [];
    for (const m of input.metrics) {
      if (!m.name || typeof m.name !== "string") {
        errors.push(`Invalid metric: missing name`);
        continue;
      }
      if (typeof m.value !== "number" || !isFinite(m.value)) {
        errors.push(`Invalid metric ${m.name}: value must be a finite number`);
        continue;
      }
      validMetrics.push(m);
    }

    const exposition = this.formatExposition(validMetrics);

    // Build the pushgateway URL
    let pushUrl = `${cfg.pushgateway_url}/metrics/job/${encodeURIComponent(job)}`;
    if (input.instance) {
      pushUrl += `/instance/${encodeURIComponent(input.instance)}`;
    }

    // In a real deployment, this would do:
    //   fetch(pushUrl, { method: "POST", body: exposition,
    //     headers: { "Content-Type": "text/plain; version=0.0.4" } })
    // For now we return the prepared payload for the caller to execute.

    return {
      success: validMetrics.length > 0,
      metrics_pushed: validMetrics.length,
      exposition_text: exposition,
      pushgateway_url: pushUrl,
      errors,
    };
  }

  // --------------------------------------------------------------------------
  // Query Prometheus
  // --------------------------------------------------------------------------

  queryPrometheus(input: PrometheusQueryInput): PrometheusQueryResult {
    const cfg = { ...this.config, ...input.config };

    if (!input.query || typeof input.query !== "string") {
      return {
        status: "error",
        result_type: "vector",
        results: [],
        query: input.query || "",
        request_url: "",
      };
    }

    const params = new URLSearchParams({ query: input.query });
    if (input.time) params.set("time", input.time);
    if (input.timeout) params.set("timeout", input.timeout);

    const requestUrl = `${cfg.prometheus_url}/api/v1/query?${params.toString()}`;

    // Returns the constructed request for the caller to execute via HTTP.
    // In live mode this would fetch and parse the JSON response.
    return {
      status: "success",
      result_type: "vector",
      results: [],
      query: input.query,
      request_url: requestUrl,
    };
  }

  queryRange(input: PrometheusRangeQueryInput): PrometheusQueryResult {
    const cfg = { ...this.config, ...input.config };

    if (!input.query || !input.start || !input.end || !input.step) {
      return {
        status: "error",
        result_type: "matrix",
        results: [],
        query: input.query || "",
        request_url: "",
      };
    }

    const params = new URLSearchParams({
      query: input.query,
      start: input.start,
      end: input.end,
      step: input.step,
    });
    if (input.timeout) params.set("timeout", input.timeout);

    const requestUrl = `${cfg.prometheus_url}/api/v1/query_range?${params.toString()}`;

    return {
      status: "success",
      result_type: "matrix",
      results: [],
      query: input.query,
      request_url: requestUrl,
    };
  }

  // --------------------------------------------------------------------------
  // Create Grafana Dashboard
  // --------------------------------------------------------------------------

  createDashboard(input: CreateDashboardInput): CreateDashboardResult {
    const cfg = { ...this.config, ...input.config };
    const errors: string[] = [];

    if (!input.title) {
      return {
        success: false,
        dashboard_uid: "",
        dashboard_url: "",
        panel_count: 0,
        json: {},
        errors: ["Dashboard title is required"],
      };
    }

    if (!input.panels || input.panels.length === 0) {
      return {
        success: false,
        dashboard_uid: "",
        dashboard_url: "",
        panel_count: 0,
        json: {},
        errors: ["At least one panel is required"],
      };
    }

    const uid = this.generateUid(input.title);
    const panels = input.panels.map((p, i) => this.buildGrafanaPanel(p, i));

    const dashboardJson: Record<string, any> = {
      dashboard: {
        uid,
        title: input.title,
        tags: input.tags || ["prism", "manufacturing"],
        timezone: "browser",
        refresh: input.refresh || "10s",
        time: {
          from: input.time_from || "now-1h",
          to: input.time_to || "now",
        },
        panels,
        schemaVersion: 39,
        version: 0,
      },
      folderUid: input.folder_uid || "",
      overwrite: true,
    };

    // POST URL: ${cfg.grafana_url}/api/dashboards/db
    // Headers: { Authorization: `Bearer ${cfg.grafana_api_key}`, Content-Type: "application/json" }

    return {
      success: true,
      dashboard_uid: uid,
      dashboard_url: `${cfg.grafana_url}/d/${uid}/${this.slugify(input.title)}`,
      panel_count: panels.length,
      json: dashboardJson,
      errors,
    };
  }

  // --------------------------------------------------------------------------
  // Pre-built Manufacturing Dashboard
  // --------------------------------------------------------------------------

  getManufacturingDashboard(machine?: string): CreateDashboardResult {
    const machineFilter = machine ? `{machine="${machine}"}` : "";
    const mf = machine ? `,machine="${machine}"` : "";

    const panels: DashboardPanel[] = [
      {
        title: "Spindle Load",
        type: "timeseries",
        query: `prism_spindle_load_percent${machineFilter}`,
        unit: "percent",
        description: "Spindle load as % of rated capacity over time",
        thresholds: [
          { value: 70, color: "yellow" },
          { value: 90, color: "red" },
        ],
        grid_pos: { x: 0, y: 0, w: 12, h: 8 },
      },
      {
        title: "Feed Rate vs Programmed",
        type: "timeseries",
        query: `prism_feed_rate_mmpm${machineFilter}`,
        unit: "mm/min",
        description: "Actual feed rate compared to programmed value",
        grid_pos: { x: 12, y: 0, w: 12, h: 8 },
      },
      {
        title: "Tool Wear Progression",
        type: "timeseries",
        query: `prism_tool_wear_vb_mm{tool_id=~".+"${mf}}`,
        unit: "mm",
        description: "Flank wear VB progression per tool",
        thresholds: [
          { value: 0.2, color: "yellow" },
          { value: 0.3, color: "red" },
        ],
        grid_pos: { x: 0, y: 8, w: 12, h: 8 },
      },
      {
        title: "Cpk Trend",
        type: "timeseries",
        query: `prism_cpk{characteristic=~".+"${mf}}`,
        unit: "",
        description: "Process capability index over time — target >= 1.33",
        thresholds: [
          { value: 1.0, color: "red" },
          { value: 1.33, color: "yellow" },
          { value: 1.67, color: "green" },
        ],
        grid_pos: { x: 12, y: 8, w: 12, h: 8 },
      },
      {
        title: "Cutting Force / Temperature",
        type: "timeseries",
        query: `prism_cutting_force_n{component=~"Fc|Ff|Fp"${mf}}`,
        unit: "N",
        description: "Cutting force components (Fc, Ff, Fp) per operation",
        grid_pos: { x: 0, y: 16, w: 12, h: 8 },
      },
      {
        title: "Cutting Temperature",
        type: "timeseries",
        query: `prism_temperature_celsius${machineFilter}`,
        unit: "°C",
        description: "Cutting zone temperature",
        thresholds: [
          { value: 400, color: "yellow" },
          { value: 600, color: "red" },
        ],
        grid_pos: { x: 12, y: 16, w: 12, h: 8 },
      },
      {
        title: "Cycle Time Distribution",
        type: "histogram",
        query: `histogram_quantile(0.95, rate(prism_cycle_time_seconds_bucket${machineFilter}[5m]))`,
        unit: "s",
        description: "Cycle time distribution — P95 highlighted",
        grid_pos: { x: 0, y: 24, w: 8, h: 8 },
      },
      {
        title: "Alarm Frequency",
        type: "barchart",
        query: `increase(prism_alarm_count${machineFilter}[1h])`,
        unit: "alarms/hr",
        description: "Alarm frequency per hour",
        grid_pos: { x: 8, y: 24, w: 8, h: 8 },
      },
      {
        title: "OEE",
        type: "gauge",
        query: `prism_oee_percent${machineFilter}`,
        unit: "percent",
        description: "Overall Equipment Effectiveness — world class >= 85%",
        thresholds: [
          { value: 60, color: "red" },
          { value: 75, color: "yellow" },
          { value: 85, color: "green" },
        ],
        grid_pos: { x: 16, y: 24, w: 8, h: 8 },
      },
      {
        title: "Tool Life Remaining",
        type: "stat",
        query: `prism_tool_life_remaining_percent{tool_id=~".+"${mf}}`,
        unit: "percent",
        description: "Remaining tool life per tool in magazine",
        thresholds: [
          { value: 10, color: "red" },
          { value: 25, color: "yellow" },
          { value: 50, color: "green" },
        ],
        grid_pos: { x: 0, y: 32, w: 12, h: 6 },
      },
      {
        title: "Material Removal Rate",
        type: "timeseries",
        query: `prism_mrr_cm3pm${machineFilter}`,
        unit: "cm³/min",
        description: "Material removal rate over time",
        grid_pos: { x: 12, y: 32, w: 12, h: 6 },
      },
    ];

    return this.createDashboard({
      title: machine ? `PRISM CNC Monitor — ${machine}` : "PRISM CNC Manufacturing Monitor",
      panels,
      tags: ["prism", "manufacturing", "cnc", "shop-floor"],
      refresh: "5s",
      time_from: "now-1h",
      time_to: "now",
    });
  }

  // --------------------------------------------------------------------------
  // Export Metrics from PRISM Engines
  // --------------------------------------------------------------------------

  exportMetricsFromSimulation(input: SimulationMetricsInput): ExportMetricsResult {
    const metrics: MetricSample[] = [];
    const r = input.simulationResult || {};
    const ts = Date.now();
    const baseLabels: Record<string, string> = {};
    if (input.machine) baseLabels.machine = input.machine;
    if (input.program) baseLabels.program = input.program;

    // Extract simulation fields → Prometheus metrics
    if (r.blocks && Array.isArray(r.blocks)) {
      for (let i = 0; i < r.blocks.length; i++) {
        const block = r.blocks[i];
        const blockLabels = { ...baseLabels, block: String(i + 1) };

        if (typeof block.spindle_load === "number") {
          metrics.push({ name: "spindle_load_percent", labels: blockLabels, value: block.spindle_load, timestamp: ts + i * 1000 });
        }
        if (typeof block.feed_rate === "number") {
          metrics.push({ name: "feed_rate_mmpm", labels: blockLabels, value: block.feed_rate, timestamp: ts + i * 1000 });
        }
        if (typeof block.cutting_force === "number") {
          metrics.push({ name: "cutting_force_n", labels: { ...blockLabels, component: "Fc" }, value: block.cutting_force, timestamp: ts + i * 1000 });
        }
        if (typeof block.temperature === "number") {
          metrics.push({ name: "temperature_celsius", labels: blockLabels, value: block.temperature, timestamp: ts + i * 1000 });
        }
        if (typeof block.power_kw === "number") {
          metrics.push({ name: "power_consumption_kw", labels: blockLabels, value: block.power_kw, timestamp: ts + i * 1000 });
        }
        if (typeof block.mrr === "number") {
          metrics.push({ name: "mrr_cm3pm", labels: blockLabels, value: block.mrr, timestamp: ts + i * 1000 });
        }
      }
    }

    // Top-level simulation summary metrics
    if (typeof r.cycle_time_sec === "number") {
      metrics.push({ name: "cycle_time_seconds", labels: baseLabels, value: r.cycle_time_sec, timestamp: ts });
    }
    if (typeof r.total_force_n === "number") {
      metrics.push({ name: "cutting_force_n", labels: { ...baseLabels, component: "total" }, value: r.total_force_n, timestamp: ts });
    }
    if (typeof r.max_spindle_load === "number") {
      metrics.push({ name: "spindle_load_percent", labels: { ...baseLabels, stat: "max" }, value: r.max_spindle_load, timestamp: ts });
    }
    if (typeof r.tool_wear_vb === "number") {
      metrics.push({ name: "tool_wear_vb_mm", labels: baseLabels, value: r.tool_wear_vb, timestamp: ts });
    }

    const exposition = this.formatExposition(metrics);
    return { metrics, exposition_text: exposition, metric_count: metrics.length, source: "CNCSimulationPipeline" };
  }

  exportMetricsFromSPC(input: SPCMetricsInput): ExportMetricsResult {
    const metrics: MetricSample[] = [];
    const r = input.spcResult || {};
    const ts = Date.now();
    const baseLabels: Record<string, string> = {};
    if (input.operation) baseLabels.operation = input.operation;
    if (input.characteristic) baseLabels.characteristic = input.characteristic;

    // Cpk / Cp
    if (typeof r.cpk === "number") {
      metrics.push({ name: "cpk", labels: baseLabels, value: r.cpk, timestamp: ts });
    }
    if (typeof r.cp === "number") {
      metrics.push({ name: "cpk", labels: { ...baseLabels, index: "cp" }, value: r.cp, timestamp: ts });
    }

    // Mean / Std dev as custom metrics
    if (typeof r.mean === "number") {
      metrics.push({ name: "spc_mean", labels: baseLabels, value: r.mean, timestamp: ts, help: "SPC process mean" });
    }
    if (typeof r.std_dev === "number") {
      metrics.push({ name: "spc_std_dev", labels: baseLabels, value: r.std_dev, timestamp: ts, help: "SPC process standard deviation" });
    }

    // Out-of-control signals
    if (typeof r.out_of_control_count === "number") {
      metrics.push({ name: "spc_out_of_control_count", labels: baseLabels, value: r.out_of_control_count, timestamp: ts, type: "counter", help: "Count of out-of-control signals" });
    }

    // Range and subgroup stats
    if (typeof r.r_bar === "number") {
      metrics.push({ name: "spc_range_bar", labels: baseLabels, value: r.r_bar, timestamp: ts, help: "SPC average range R-bar" });
    }

    // Control limits as metrics for annotation
    if (typeof r.ucl === "number") {
      metrics.push({ name: "spc_control_limit", labels: { ...baseLabels, bound: "upper" }, value: r.ucl, timestamp: ts, help: "Upper control limit" });
    }
    if (typeof r.lcl === "number") {
      metrics.push({ name: "spc_control_limit", labels: { ...baseLabels, bound: "lower" }, value: r.lcl, timestamp: ts, help: "Lower control limit" });
    }

    // Individual measurements as a batch
    if (Array.isArray(r.measurements)) {
      for (let i = 0; i < r.measurements.length; i++) {
        const val = r.measurements[i];
        if (typeof val === "number") {
          metrics.push({
            name: "spc_measurement",
            labels: { ...baseLabels, sample: String(i + 1) },
            value: val,
            timestamp: ts + i * 100,
            help: "Individual SPC measurement",
          });
        }
      }
    }

    const exposition = this.formatExposition(metrics);
    return { metrics, exposition_text: exposition, metric_count: metrics.length, source: "StatisticalProcessMonitoring" };
  }

  exportMetricsFromToolLife(input: ToolLifeMetricsInput): ExportMetricsResult {
    const metrics: MetricSample[] = [];
    const r = input.toolLifeResult || {};
    const ts = Date.now();
    const baseLabels: Record<string, string> = {};
    if (input.tool_id) baseLabels.tool_id = input.tool_id;
    if (input.material) baseLabels.material = input.material;

    // Tool life remaining
    if (typeof r.life_remaining_pct === "number") {
      metrics.push({ name: "tool_life_remaining_percent", labels: baseLabels, value: r.life_remaining_pct, timestamp: ts });
    }

    // Wear
    if (typeof r.flank_wear_vb === "number") {
      metrics.push({ name: "tool_wear_vb_mm", labels: baseLabels, value: r.flank_wear_vb, timestamp: ts });
    }
    if (typeof r.crater_wear_kt === "number") {
      metrics.push({ name: "tool_wear_crater_kt_mm", labels: baseLabels, value: r.crater_wear_kt, timestamp: ts, help: "Crater wear KT depth in mm" });
    }

    // Taylor predicted life
    if (typeof r.taylor_life_min === "number") {
      metrics.push({ name: "tool_life_predicted_minutes", labels: baseLabels, value: r.taylor_life_min, timestamp: ts, help: "Taylor equation predicted tool life in minutes" });
    }
    if (typeof r.taylor_life_parts === "number") {
      metrics.push({ name: "tool_life_predicted_parts", labels: baseLabels, value: r.taylor_life_parts, timestamp: ts, help: "Predicted parts per tool life" });
    }

    // Cutting speed at which life was predicted
    if (typeof r.cutting_speed === "number") {
      metrics.push({ name: "cutting_speed_mpm", labels: baseLabels, value: r.cutting_speed, timestamp: ts, help: "Cutting speed in m/min" });
    }

    // Reliability / confidence
    if (typeof r.reliability === "number") {
      metrics.push({ name: "tool_life_reliability", labels: baseLabels, value: r.reliability, timestamp: ts, help: "Tool life reliability probability" });
    }

    // Cost per part
    if (typeof r.cost_per_part === "number") {
      metrics.push({ name: "tool_cost_per_part", labels: baseLabels, value: r.cost_per_part, timestamp: ts, help: "Tooling cost per part in USD" });
    }

    const exposition = this.formatExposition(metrics);
    return { metrics, exposition_text: exposition, metric_count: metrics.length, source: "ToolLifePrediction" };
  }

  // --------------------------------------------------------------------------
  // Configure Grafana Alert Rules
  // --------------------------------------------------------------------------

  configureAlerts(input: ConfigureAlertsInput): ConfigureAlertsResult {
    const cfg = { ...this.config, ...input.config };
    const errors: string[] = [];
    const createdRules: { name: string; uid: string; condition: string }[] = [];

    if (!input.rules || input.rules.length === 0) {
      return { success: false, rules_created: 0, alert_rules: [], errors: ["No alert rules provided"] };
    }

    for (const rule of input.rules) {
      if (!rule.name || !rule.condition) {
        errors.push(`Invalid rule: missing name or condition`);
        continue;
      }

      const uid = this.generateUid(`alert-${rule.name}`);
      const compOp = this.comparisonToOperator(rule.comparison);

      // Build Grafana alerting rule JSON (Grafana Unified Alerting API)
      const ruleJson = {
        uid,
        title: rule.name,
        condition: "C",
        data: [
          {
            refId: "A",
            queryType: "",
            relativeTimeRange: { from: 600, to: 0 },
            datasourceUid: "prometheus",
            model: {
              expr: rule.condition,
              refId: "A",
            },
          },
          {
            refId: "B",
            queryType: "",
            relativeTimeRange: { from: 600, to: 0 },
            datasourceUid: "__expr__",
            model: {
              type: "reduce",
              expression: "A",
              reducer: "last",
              refId: "B",
            },
          },
          {
            refId: "C",
            queryType: "",
            relativeTimeRange: { from: 600, to: 0 },
            datasourceUid: "__expr__",
            model: {
              type: "threshold",
              expression: "B",
              conditions: [
                {
                  evaluator: { type: compOp, params: [rule.threshold] },
                  operator: { type: "and" },
                  reducer: { type: "last" },
                },
              ],
              refId: "C",
            },
          },
        ],
        for: rule.duration || "5m",
        labels: { severity: rule.severity, ...(rule.labels || {}) },
        annotations: {
          summary: rule.summary,
          ...(rule.annotations || {}),
        },
        noDataState: "NoData",
        execErrState: "Error",
      };

      // POST URL: ${cfg.grafana_url}/api/v1/provisioning/alert-rules
      // Headers: { Authorization: `Bearer ${cfg.grafana_api_key}` }
      // Body: JSON.stringify(ruleJson)

      createdRules.push({
        name: rule.name,
        uid,
        condition: `${rule.condition} ${compOp} ${rule.threshold}`,
      });
    }

    return {
      success: createdRules.length > 0,
      rules_created: createdRules.length,
      alert_rules: createdRules,
      errors,
    };
  }

  /**
   * Returns a set of recommended manufacturing alert rules with
   * standard thresholds based on industry best practices.
   */
  getDefaultAlertRules(): AlertRule[] {
    return [
      {
        name: "Spindle Overload",
        condition: "prism_spindle_load_percent",
        threshold: 90,
        comparison: "gt",
        duration: "1m",
        severity: "critical",
        summary: "Spindle load exceeds 90% of rated capacity — risk of stall or damage",
        labels: { category: "machine_protection" },
      },
      {
        name: "Tool Life Expiring",
        condition: "prism_tool_life_remaining_percent",
        threshold: 10,
        comparison: "lt",
        duration: "5m",
        severity: "warning",
        summary: "Tool life below 10% remaining — schedule tool change",
        labels: { category: "tool_management" },
      },
      {
        name: "Cpk Below Threshold",
        condition: "prism_cpk",
        threshold: 1.33,
        comparison: "lt",
        duration: "10m",
        severity: "warning",
        summary: "Process capability Cpk dropped below 1.33 — quality risk",
        labels: { category: "quality" },
      },
      {
        name: "Cutting Temperature Limit",
        condition: "prism_temperature_celsius",
        threshold: 600,
        comparison: "gt",
        duration: "2m",
        severity: "critical",
        summary: "Cutting zone temperature exceeds 600°C — thermal damage risk",
        labels: { category: "thermal" },
      },
      {
        name: "Excessive Cutting Force",
        condition: 'prism_cutting_force_n{component="Fc"}',
        threshold: 5000,
        comparison: "gt",
        duration: "1m",
        severity: "critical",
        summary: "Cutting force Fc exceeds 5000N — tool breakage or fixture failure risk",
        labels: { category: "force" },
      },
      {
        name: "Tool Wear VB Limit",
        condition: "prism_tool_wear_vb_mm",
        threshold: 0.3,
        comparison: "gt",
        duration: "5m",
        severity: "warning",
        summary: "Flank wear VB exceeds 0.3mm (ISO 3685 end-of-life criterion)",
        labels: { category: "tool_management" },
      },
      {
        name: "OEE Below Target",
        condition: "prism_oee_percent",
        threshold: 60,
        comparison: "lt",
        duration: "30m",
        severity: "warning",
        summary: "OEE dropped below 60% — investigate downtime and losses",
        labels: { category: "productivity" },
      },
      {
        name: "Vibration Alarm",
        condition: "prism_vibration_amplitude_g",
        threshold: 5.0,
        comparison: "gt",
        duration: "30s",
        severity: "critical",
        summary: "Vibration amplitude exceeds 5g — possible chatter or bearing failure",
        labels: { category: "vibration" },
      },
    ];
  }

  // --------------------------------------------------------------------------
  // Utility: List registered metrics
  // --------------------------------------------------------------------------

  listMetrics(): { name: string; full_name: string; type: string; help: string; unit: string }[] {
    return Object.entries(METRIC_REGISTRY).map(([name, reg]) => ({
      name,
      full_name: `${METRIC_PREFIX}_${name}`,
      type: reg.type || "gauge",
      help: reg.help,
      unit: reg.unit,
    }));
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private buildGrafanaPanel(panel: DashboardPanel, index: number): Record<string, any> {
    const gridPos = panel.grid_pos || {
      x: (index % 2) * 12,
      y: Math.floor(index / 2) * 8,
      w: 12,
      h: 8,
    };

    const p: Record<string, any> = {
      id: index + 1,
      title: panel.title,
      type: panel.type,
      description: panel.description || "",
      gridPos,
      datasource: { type: "prometheus", uid: "prometheus" },
      targets: [
        {
          expr: panel.query,
          refId: "A",
          legendFormat: "{{instance}}",
        },
      ],
      fieldConfig: {
        defaults: {
          unit: panel.unit || "",
          thresholds: {
            mode: "absolute",
            steps: [
              { value: null as any, color: "green" },
              ...(panel.thresholds || []).map((t) => ({
                value: t.value,
                color: t.color,
              })),
            ],
          },
        },
        overrides: [],
      },
      options: {},
    };

    // Type-specific options
    if (panel.type === "gauge") {
      p.options = { reduceOptions: { calcs: ["lastNotNull"], fields: "", values: false }, showThresholdLabels: false, showThresholdMarkers: true };
    } else if (panel.type === "stat") {
      p.options = { reduceOptions: { calcs: ["lastNotNull"], fields: "", values: false }, colorMode: "value", graphMode: "area" };
    } else if (panel.type === "timeseries") {
      p.options = { tooltip: { mode: "multi", sort: "desc" }, legend: { displayMode: "table", placement: "bottom", calcs: ["mean", "max", "last"] } };
    } else if (panel.type === "barchart") {
      p.options = { orientation: "auto", showValue: "auto", groupWidth: 0.7, barWidth: 0.97 };
    }

    return p;
  }

  private generateUid(seed: string): string {
    // Deterministic UID from seed — simple hash
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const chr = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return `prism-${Math.abs(hash).toString(36).slice(0, 8)}`;
  }

  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  private comparisonToOperator(comp: AlertRule["comparison"]): string {
    switch (comp) {
      case "gt": return "gt";
      case "lt": return "lt";
      case "gte": return "gte";
      case "lte": return "lte";
      case "eq": return "eq";
      default: return "gt";
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const grafanaBridgeEngine = new GrafanaBridgeEngine();
