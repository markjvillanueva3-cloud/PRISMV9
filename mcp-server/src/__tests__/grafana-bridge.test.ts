/**
 * GrafanaBridgeEngine — Unit Tests
 *
 * Tests for: metric formatting, push metrics, Prometheus queries,
 *            dashboard creation, manufacturing dashboard, simulation/SPC/tool-life
 *            metric export, alert rule configuration.
 *
 * @milestone MON-MS0
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  GrafanaBridgeEngine,
  type MetricSample,
  type DashboardPanel,
  type AlertRule,
} from "../engines/GrafanaBridgeEngine.js";

let engine: GrafanaBridgeEngine;

beforeEach(() => {
  engine = new GrafanaBridgeEngine();
});

// ============================================================================
// Configuration
// ============================================================================

describe("GrafanaBridgeEngine — Configuration", () => {
  it("returns default config", () => {
    const cfg = engine.getConfig();
    expect(cfg.grafana_url).toBe("http://localhost:3000");
    expect(cfg.prometheus_url).toBe("http://localhost:9090");
    expect(cfg.pushgateway_url).toBe("http://localhost:9091");
    expect(cfg.default_job).toBe("prism");
  });

  it("overrides config partially", () => {
    engine.configure({ grafana_url: "http://grafana:3000" });
    const cfg = engine.getConfig();
    expect(cfg.grafana_url).toBe("http://grafana:3000");
    expect(cfg.prometheus_url).toBe("http://localhost:9090");
  });
});

// ============================================================================
// Metric Formatting
// ============================================================================

describe("GrafanaBridgeEngine — Metric Formatting", () => {
  it("formats a simple metric without labels", () => {
    const line = engine.formatMetric({ name: "spindle_load_percent", value: 75.5 });
    expect(line).toBe("prism_spindle_load_percent 75.5");
  });

  it("formats metric with labels", () => {
    const line = engine.formatMetric({
      name: "spindle_load_percent",
      labels: { machine: "DMG-1", program: "O1234" },
      value: 82.3,
    });
    expect(line).toBe('prism_spindle_load_percent{machine="DMG-1",program="O1234"} 82.3');
  });

  it("formats metric with timestamp", () => {
    const line = engine.formatMetric({
      name: "feed_rate_mmpm",
      labels: { axis: "X" },
      value: 500,
      timestamp: 1710000000000,
    });
    expect(line).toBe('prism_feed_rate_mmpm{axis="X"} 500 1710000000000');
  });

  it("escapes label values with quotes and backslashes", () => {
    const line = engine.formatMetric({
      name: "tool_wear_vb_mm",
      labels: { desc: 'tool "A" \\ special' },
      value: 0.15,
    });
    expect(line).toContain('desc="tool \\"A\\" \\\\ special"');
  });

  it("sanitizes invalid metric name characters", () => {
    const line = engine.formatMetric({ name: "my-metric.test", value: 1 });
    expect(line).toMatch(/^prism_my_metric_test /);
  });

  it("does not double-prefix prism_ names", () => {
    const line = engine.formatMetric({ name: "prism_cpk", value: 1.45 });
    expect(line).toBe("prism_cpk 1.45");
    expect(line).not.toContain("prism_prism_");
  });

  it("generates full exposition text with HELP and TYPE", () => {
    const metrics: MetricSample[] = [
      { name: "spindle_load_percent", labels: { machine: "M1" }, value: 60 },
      { name: "spindle_load_percent", labels: { machine: "M2" }, value: 80 },
      { name: "feed_rate_mmpm", labels: { axis: "X" }, value: 1200 },
    ];
    const text = engine.formatExposition(metrics);

    expect(text).toContain("# HELP prism_spindle_load_percent");
    expect(text).toContain("# TYPE prism_spindle_load_percent gauge");
    expect(text).toContain('prism_spindle_load_percent{machine="M1"} 60');
    expect(text).toContain('prism_spindle_load_percent{machine="M2"} 80');
    expect(text).toContain("# HELP prism_feed_rate_mmpm");
    expect(text).toContain("# TYPE prism_feed_rate_mmpm gauge");
    // HELP/TYPE only once per metric name
    const helpCount = (text.match(/# HELP prism_spindle_load_percent/g) || []).length;
    expect(helpCount).toBe(1);
  });
});

// ============================================================================
// Push Metrics
// ============================================================================

describe("GrafanaBridgeEngine — pushMetrics", () => {
  it("returns exposition text and URL for valid metrics", () => {
    const result = engine.pushMetrics({
      metrics: [
        { name: "spindle_load_percent", labels: { machine: "HAAS-VF2" }, value: 72 },
        { name: "feed_rate_mmpm", labels: { machine: "HAAS-VF2" }, value: 800 },
      ],
      job: "cnc_monitoring",
    });

    expect(result.success).toBe(true);
    expect(result.metrics_pushed).toBe(2);
    expect(result.pushgateway_url).toContain("/metrics/job/cnc_monitoring");
    expect(result.exposition_text).toContain("prism_spindle_load_percent");
    expect(result.errors).toHaveLength(0);
  });

  it("rejects empty metrics array", () => {
    const result = engine.pushMetrics({ metrics: [] });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("No metrics");
  });

  it("filters out invalid metrics and reports errors", () => {
    const result = engine.pushMetrics({
      metrics: [
        { name: "", value: 1 },
        { name: "valid", value: 42 },
        { name: "bad_val", value: NaN },
      ],
    });
    expect(result.metrics_pushed).toBe(1);
    expect(result.errors.length).toBe(2);
  });

  it("appends instance to pushgateway URL", () => {
    const result = engine.pushMetrics({
      metrics: [{ name: "cpk", value: 1.5 }],
      instance: "cell-3",
    });
    expect(result.pushgateway_url).toContain("/instance/cell-3");
  });
});

// ============================================================================
// Prometheus Queries
// ============================================================================

describe("GrafanaBridgeEngine — queryPrometheus", () => {
  it("constructs instant query URL", () => {
    const result = engine.queryPrometheus({
      query: 'prism_spindle_load_percent{machine="M1"}',
    });
    expect(result.status).toBe("success");
    expect(result.result_type).toBe("vector");
    expect(result.request_url).toContain("/api/v1/query");
    expect(result.request_url).toContain("query=prism_spindle_load_percent");
  });

  it("includes time parameter", () => {
    const result = engine.queryPrometheus({
      query: "prism_cpk",
      time: "2026-03-16T00:00:00Z",
    });
    expect(result.request_url).toContain("time=2026-03-16");
  });

  it("returns error for empty query", () => {
    const result = engine.queryPrometheus({ query: "" });
    expect(result.status).toBe("error");
  });
});

describe("GrafanaBridgeEngine — queryRange", () => {
  it("constructs range query URL with all parameters", () => {
    const result = engine.queryRange({
      query: "rate(prism_alarm_count[5m])",
      start: "2026-03-15T00:00:00Z",
      end: "2026-03-16T00:00:00Z",
      step: "1m",
    });
    expect(result.status).toBe("success");
    expect(result.result_type).toBe("matrix");
    expect(result.request_url).toContain("/api/v1/query_range");
    expect(result.request_url).toContain("step=1m");
  });

  it("returns error for missing parameters", () => {
    const result = engine.queryRange({
      query: "prism_cpk",
      start: "",
      end: "now",
      step: "1m",
    });
    expect(result.status).toBe("error");
  });
});

// ============================================================================
// Dashboard Creation
// ============================================================================

describe("GrafanaBridgeEngine — createDashboard", () => {
  it("creates dashboard JSON with panels", () => {
    const panels: DashboardPanel[] = [
      { title: "Spindle Load", type: "timeseries", query: "prism_spindle_load_percent", unit: "percent" },
      { title: "OEE", type: "gauge", query: "prism_oee_percent", unit: "percent" },
    ];
    const result = engine.createDashboard({ title: "Test Dashboard", panels });

    expect(result.success).toBe(true);
    expect(result.panel_count).toBe(2);
    expect(result.dashboard_uid).toMatch(/^prism-/);
    expect(result.dashboard_url).toContain("/d/prism-");
    expect(result.json.dashboard.title).toBe("Test Dashboard");
    expect(result.json.dashboard.panels).toHaveLength(2);
    expect(result.json.dashboard.panels[0].type).toBe("timeseries");
    expect(result.json.dashboard.panels[1].type).toBe("gauge");
  });

  it("rejects empty title", () => {
    const result = engine.createDashboard({
      title: "",
      panels: [{ title: "P", type: "stat", query: "x" }],
    });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("title");
  });

  it("rejects empty panels", () => {
    const result = engine.createDashboard({ title: "No Panels", panels: [] });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("panel");
  });

  it("applies tags and refresh settings", () => {
    const result = engine.createDashboard({
      title: "Tagged",
      panels: [{ title: "X", type: "stat", query: "x" }],
      tags: ["custom", "test"],
      refresh: "30s",
      time_from: "now-6h",
    });
    expect(result.json.dashboard.tags).toEqual(["custom", "test"]);
    expect(result.json.dashboard.refresh).toBe("30s");
    expect(result.json.dashboard.time.from).toBe("now-6h");
  });

  it("sets panel-specific options by type", () => {
    const result = engine.createDashboard({
      title: "Types",
      panels: [
        { title: "Gauge", type: "gauge", query: "x" },
        { title: "Stat", type: "stat", query: "x" },
        { title: "Bar", type: "barchart", query: "x" },
      ],
    });
    const panels = result.json.dashboard.panels;
    expect(panels[0].options.showThresholdMarkers).toBe(true);
    expect(panels[1].options.colorMode).toBe("value");
    expect(panels[2].options.orientation).toBe("auto");
  });

  it("includes thresholds in panel fieldConfig", () => {
    const result = engine.createDashboard({
      title: "Thresh",
      panels: [{
        title: "Load",
        type: "timeseries",
        query: "prism_spindle_load_percent",
        thresholds: [
          { value: 70, color: "yellow" },
          { value: 90, color: "red" },
        ],
      }],
    });
    const steps = result.json.dashboard.panels[0].fieldConfig.defaults.thresholds.steps;
    expect(steps).toHaveLength(3); // null/green + 2 custom
    expect(steps[1].value).toBe(70);
    expect(steps[2].color).toBe("red");
  });
});

// ============================================================================
// Manufacturing Dashboard (pre-built)
// ============================================================================

describe("GrafanaBridgeEngine — getManufacturingDashboard", () => {
  it("returns a complete manufacturing dashboard", () => {
    const result = engine.getManufacturingDashboard();
    expect(result.success).toBe(true);
    expect(result.panel_count).toBeGreaterThanOrEqual(10);
    expect(result.dashboard_url).toContain("prism-cnc-manufacturing-monitor");
    expect(result.json.dashboard.tags).toContain("shop-floor");
  });

  it("includes all key manufacturing panels", () => {
    const result = engine.getManufacturingDashboard();
    const titles = result.json.dashboard.panels.map((p: any) => p.title);
    expect(titles).toContain("Spindle Load");
    expect(titles).toContain("Feed Rate vs Programmed");
    expect(titles).toContain("Tool Wear Progression");
    expect(titles).toContain("Cpk Trend");
    expect(titles).toContain("Cutting Force / Temperature");
    expect(titles).toContain("Cycle Time Distribution");
    expect(titles).toContain("Alarm Frequency");
    expect(titles).toContain("OEE");
    expect(titles).toContain("Tool Life Remaining");
  });

  it("filters by machine when provided", () => {
    const result = engine.getManufacturingDashboard("HAAS-VF2");
    const spindlePanel = result.json.dashboard.panels.find(
      (p: any) => p.title === "Spindle Load"
    );
    expect(spindlePanel.targets[0].expr).toContain('machine="HAAS-VF2"');
    expect(result.json.dashboard.title).toContain("HAAS-VF2");
  });
});

// ============================================================================
// Export: Simulation Metrics
// ============================================================================

describe("GrafanaBridgeEngine — exportMetricsFromSimulation", () => {
  it("extracts block-level metrics from simulation result", () => {
    const result = engine.exportMetricsFromSimulation({
      simulationResult: {
        blocks: [
          { spindle_load: 65, feed_rate: 800, cutting_force: 1200, temperature: 350, power_kw: 4.5, mrr: 12.3 },
          { spindle_load: 78, feed_rate: 600, cutting_force: 1500, temperature: 420, power_kw: 5.8, mrr: 9.1 },
        ],
        cycle_time_sec: 240,
        max_spindle_load: 78,
        tool_wear_vb: 0.12,
      },
      machine: "DMG-MORI",
      program: "O5000",
    });

    expect(result.source).toBe("CNCSimulationPipeline");
    expect(result.metric_count).toBeGreaterThan(10);

    // Check block-level metrics
    const spindleMetrics = result.metrics.filter((m) => m.name === "spindle_load_percent");
    expect(spindleMetrics.length).toBeGreaterThanOrEqual(2);
    expect(spindleMetrics[0].labels?.machine).toBe("DMG-MORI");

    // Check summary metrics
    const cycleTime = result.metrics.find((m) => m.name === "cycle_time_seconds");
    expect(cycleTime).toBeDefined();
    expect(cycleTime!.value).toBe(240);

    // Exposition text is valid
    expect(result.exposition_text).toContain("# HELP");
    expect(result.exposition_text).toContain("# TYPE");
  });

  it("handles empty simulation result", () => {
    const result = engine.exportMetricsFromSimulation({ simulationResult: {} });
    expect(result.metric_count).toBe(0);
    expect(result.metrics).toHaveLength(0);
  });
});

// ============================================================================
// Export: SPC Metrics
// ============================================================================

describe("GrafanaBridgeEngine — exportMetricsFromSPC", () => {
  it("extracts Cpk, mean, std_dev, control limits", () => {
    const result = engine.exportMetricsFromSPC({
      spcResult: {
        cpk: 1.45,
        cp: 1.52,
        mean: 25.001,
        std_dev: 0.003,
        ucl: 25.010,
        lcl: 24.992,
        out_of_control_count: 2,
        r_bar: 0.008,
      },
      operation: "bore_finish",
      characteristic: "diameter_25mm",
    });

    expect(result.source).toBe("StatisticalProcessMonitoring");
    expect(result.metric_count).toBeGreaterThanOrEqual(7);

    const cpk = result.metrics.find((m) => m.name === "cpk" && !m.labels?.index);
    expect(cpk).toBeDefined();
    expect(cpk!.value).toBe(1.45);
    expect(cpk!.labels?.operation).toBe("bore_finish");
    expect(cpk!.labels?.characteristic).toBe("diameter_25mm");

    const ucl = result.metrics.find((m) => m.name === "spc_control_limit" && m.labels?.bound === "upper");
    expect(ucl).toBeDefined();
    expect(ucl!.value).toBe(25.010);
  });

  it("exports individual measurements when present", () => {
    const result = engine.exportMetricsFromSPC({
      spcResult: { measurements: [25.001, 24.999, 25.003, 25.002, 24.998] },
    });
    const meas = result.metrics.filter((m) => m.name === "spc_measurement");
    expect(meas).toHaveLength(5);
    expect(meas[0].labels?.sample).toBe("1");
  });
});

// ============================================================================
// Export: Tool Life Metrics
// ============================================================================

describe("GrafanaBridgeEngine — exportMetricsFromToolLife", () => {
  it("extracts tool life prediction metrics", () => {
    const result = engine.exportMetricsFromToolLife({
      toolLifeResult: {
        life_remaining_pct: 35,
        flank_wear_vb: 0.18,
        crater_wear_kt: 0.05,
        taylor_life_min: 42,
        taylor_life_parts: 120,
        cutting_speed: 180,
        reliability: 0.92,
        cost_per_part: 0.85,
      },
      tool_id: "T01-EM-10",
      material: "Ti-6Al-4V",
    });

    expect(result.source).toBe("ToolLifePrediction");
    expect(result.metric_count).toBe(8);

    const lifeRemaining = result.metrics.find((m) => m.name === "tool_life_remaining_percent");
    expect(lifeRemaining).toBeDefined();
    expect(lifeRemaining!.value).toBe(35);
    expect(lifeRemaining!.labels?.tool_id).toBe("T01-EM-10");
    expect(lifeRemaining!.labels?.material).toBe("Ti-6Al-4V");

    const cost = result.metrics.find((m) => m.name === "tool_cost_per_part");
    expect(cost).toBeDefined();
    expect(cost!.value).toBe(0.85);
  });

  it("handles empty tool life result", () => {
    const result = engine.exportMetricsFromToolLife({ toolLifeResult: {} });
    expect(result.metric_count).toBe(0);
  });
});

// ============================================================================
// Alert Rules
// ============================================================================

describe("GrafanaBridgeEngine — configureAlerts", () => {
  it("creates alert rules with proper structure", () => {
    const rules: AlertRule[] = [
      {
        name: "Spindle Overload",
        condition: "prism_spindle_load_percent",
        threshold: 90,
        comparison: "gt",
        duration: "1m",
        severity: "critical",
        summary: "Spindle exceeds 90%",
      },
      {
        name: "Cpk Low",
        condition: "prism_cpk",
        threshold: 1.33,
        comparison: "lt",
        duration: "10m",
        severity: "warning",
        summary: "Cpk below 1.33",
      },
    ];

    const result = engine.configureAlerts({ rules });
    expect(result.success).toBe(true);
    expect(result.rules_created).toBe(2);
    expect(result.alert_rules[0].name).toBe("Spindle Overload");
    expect(result.alert_rules[0].uid).toMatch(/^prism-/);
    expect(result.alert_rules[0].condition).toContain("gt 90");
    expect(result.alert_rules[1].condition).toContain("lt 1.33");
  });

  it("rejects empty rules", () => {
    const result = engine.configureAlerts({ rules: [] });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("No alert rules");
  });

  it("skips invalid rules and reports errors", () => {
    const result = engine.configureAlerts({
      rules: [
        { name: "", condition: "x", threshold: 1, comparison: "gt", duration: "1m", severity: "warning", summary: "test" },
        { name: "Valid", condition: "prism_cpk", threshold: 1, comparison: "lt", duration: "5m", severity: "info", summary: "ok" },
      ],
    });
    expect(result.rules_created).toBe(1);
    expect(result.errors.length).toBe(1);
  });
});

describe("GrafanaBridgeEngine — getDefaultAlertRules", () => {
  it("returns a set of manufacturing alert rules", () => {
    const rules = engine.getDefaultAlertRules();
    expect(rules.length).toBeGreaterThanOrEqual(5);

    const names = rules.map((r) => r.name);
    expect(names).toContain("Spindle Overload");
    expect(names).toContain("Tool Life Expiring");
    expect(names).toContain("Cpk Below Threshold");
    expect(names).toContain("Cutting Temperature Limit");
    expect(names).toContain("Excessive Cutting Force");
  });

  it("all default rules have valid structure", () => {
    const rules = engine.getDefaultAlertRules();
    for (const rule of rules) {
      expect(rule.name).toBeTruthy();
      expect(rule.condition).toBeTruthy();
      expect(typeof rule.threshold).toBe("number");
      expect(["gt", "lt", "gte", "lte", "eq"]).toContain(rule.comparison);
      expect(["critical", "warning", "info"]).toContain(rule.severity);
      expect(rule.summary.length).toBeGreaterThan(10);
    }
  });

  it("default rules can be fed into configureAlerts", () => {
    const rules = engine.getDefaultAlertRules();
    const result = engine.configureAlerts({ rules });
    expect(result.success).toBe(true);
    expect(result.rules_created).toBe(rules.length);
  });
});

// ============================================================================
// Metric Registry
// ============================================================================

describe("GrafanaBridgeEngine — listMetrics", () => {
  it("returns all registered metric definitions", () => {
    const metrics = engine.listMetrics();
    expect(metrics.length).toBeGreaterThanOrEqual(10);

    const names = metrics.map((m) => m.name);
    expect(names).toContain("spindle_load_percent");
    expect(names).toContain("feed_rate_mmpm");
    expect(names).toContain("tool_wear_vb_mm");
    expect(names).toContain("cutting_force_n");
    expect(names).toContain("cpk");
    expect(names).toContain("cycle_time_seconds");
    expect(names).toContain("oee_percent");
    expect(names).toContain("tool_life_remaining_percent");

    for (const m of metrics) {
      expect(m.full_name).toMatch(/^prism_/);
      expect(m.help.length).toBeGreaterThan(5);
    }
  });
});
