/**
 * GrafanaBridgeEngine — Comprehensive Tests
 *
 * Tests all public methods: configuration, metric formatting, push,
 * query, dashboard creation, manufacturing dashboard, simulation/SPC/tool-life
 * export, alert configuration, default alerts, and metric listing.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GrafanaBridgeEngine,
  type MetricSample,
  type PushMetricsInput,
  type DashboardPanel,
  type AlertRule,
} from "../engines/GrafanaBridgeEngine";

describe("GrafanaBridgeEngine", () => {
  let engine: GrafanaBridgeEngine;

  beforeEach(() => {
    engine = new GrafanaBridgeEngine();
  });

  // ==========================================================================
  // Configuration
  // ==========================================================================

  describe("configure / getConfig", () => {
    it("should return default config", () => {
      const cfg = engine.getConfig();
      expect(cfg.grafana_url).toBe("http://localhost:3000");
      expect(cfg.prometheus_url).toBe("http://localhost:9090");
      expect(cfg.pushgateway_url).toBe("http://localhost:9091");
      expect(cfg.default_job).toBe("prism");
    });

    it("should merge partial config", () => {
      const result = engine.configure({ grafana_url: "http://grafana:3000", grafana_api_key: "key123" });
      expect(result.grafana_url).toBe("http://grafana:3000");
      expect(result.grafana_api_key).toBe("key123");
      // unchanged fields preserved
      expect(result.prometheus_url).toBe("http://localhost:9090");
      // subsequent getConfig reflects change
      expect(engine.getConfig().grafana_api_key).toBe("key123");
    });
  });

  // ==========================================================================
  // Metric Formatting
  // ==========================================================================

  describe("formatMetric", () => {
    it("should format a basic metric with prefix", () => {
      const line = engine.formatMetric({ name: "spindle_load_percent", value: 75.3 });
      expect(line).toBe("prism_spindle_load_percent 75.3");
    });

    it("should not double-prefix if name already has prism_", () => {
      const line = engine.formatMetric({ name: "prism_feed_rate_mmpm", value: 1200 });
      expect(line).toBe("prism_feed_rate_mmpm 1200");
    });

    it("should format labels correctly", () => {
      const line = engine.formatMetric({
        name: "cutting_force_n",
        labels: { machine: "DMG-1", component: "Fc" },
        value: 3200,
      });
      expect(line).toBe('prism_cutting_force_n{machine="DMG-1",component="Fc"} 3200');
    });

    it("should append timestamp when provided", () => {
      const line = engine.formatMetric({ name: "cpk", value: 1.45, timestamp: 1700000000000 });
      expect(line).toBe("prism_cpk 1.45 1700000000000");
    });

    it("should sanitize metric name (replace invalid chars)", () => {
      const line = engine.formatMetric({ name: "my-metric.test", value: 1 });
      expect(line).toBe("prism_my_metric_test 1");
    });

    it("should escape special characters in label values", () => {
      const line = engine.formatMetric({
        name: "test",
        labels: { desc: 'line1\nline"2\\end' },
        value: 42,
      });
      expect(line).toContain('desc="line1\\nline\\"2\\\\end"');
    });
  });

  describe("formatExposition", () => {
    it("should produce HELP, TYPE, and metric lines", () => {
      const text = engine.formatExposition([
        { name: "spindle_load_percent", value: 80 },
      ]);
      expect(text).toContain("# HELP prism_spindle_load_percent");
      expect(text).toContain("# TYPE prism_spindle_load_percent gauge");
      expect(text).toContain("prism_spindle_load_percent 80");
    });

    it("should emit HELP/TYPE only once for repeated metric names", () => {
      const text = engine.formatExposition([
        { name: "cpk", labels: { char: "diameter" }, value: 1.5 },
        { name: "cpk", labels: { char: "length" }, value: 1.8 },
      ]);
      const helpCount = (text.match(/# HELP prism_cpk/g) || []).length;
      expect(helpCount).toBe(1);
      // both data lines present
      expect(text).toContain('char="diameter"');
      expect(text).toContain('char="length"');
    });

    it("should use custom help/type from MetricSample when provided", () => {
      const text = engine.formatExposition([
        { name: "custom_thing", value: 99, type: "counter", help: "My custom counter" },
      ]);
      expect(text).toContain("# HELP prism_custom_thing My custom counter");
      expect(text).toContain("# TYPE prism_custom_thing counter");
    });
  });

  // ==========================================================================
  // Push Metrics
  // ==========================================================================

  describe("pushMetrics", () => {
    it("should push valid metrics and return exposition text", () => {
      const result = engine.pushMetrics({
        metrics: [
          { name: "spindle_load_percent", value: 85 },
          { name: "feed_rate_mmpm", value: 1500, labels: { machine: "M1" } },
        ],
        job: "cnc_monitor",
      });
      expect(result.success).toBe(true);
      expect(result.metrics_pushed).toBe(2);
      expect(result.exposition_text).toContain("prism_spindle_load_percent 85");
      expect(result.pushgateway_url).toContain("/metrics/job/cnc_monitor");
    });

    it("should include instance in pushgateway URL when provided", () => {
      const result = engine.pushMetrics({
        metrics: [{ name: "cpk", value: 1.33 }],
        instance: "machine-A",
      });
      expect(result.pushgateway_url).toContain("/instance/machine-A");
    });

    it("should fail when no metrics provided", () => {
      const result = engine.pushMetrics({ metrics: [] });
      expect(result.success).toBe(false);
      expect(result.metrics_pushed).toBe(0);
      expect(result.errors).toContain("No metrics provided");
    });

    it("should skip invalid metrics and report errors", () => {
      const result = engine.pushMetrics({
        metrics: [
          { name: "", value: 1 },                     // missing name
          { name: "ok_metric", value: NaN },           // NaN value
          { name: "ok_metric", value: Infinity },      // Infinity value
          { name: "valid", value: 42 },                // valid
        ],
      });
      expect(result.success).toBe(true);
      expect(result.metrics_pushed).toBe(1);
      expect(result.errors.length).toBe(3);
    });

    it("should use config override for pushgateway URL", () => {
      const result = engine.pushMetrics({
        metrics: [{ name: "test", value: 1 }],
        config: { pushgateway_url: "http://custom:9091" },
      });
      expect(result.pushgateway_url).toContain("http://custom:9091");
    });
  });

  // ==========================================================================
  // Query Prometheus
  // ==========================================================================

  describe("queryPrometheus", () => {
    it("should build correct request URL with query params", () => {
      const result = engine.queryPrometheus({
        query: 'prism_spindle_load_percent{machine="DMG-1"}',
        time: "2026-03-16T00:00:00Z",
        timeout: "30s",
      });
      expect(result.status).toBe("success");
      expect(result.result_type).toBe("vector");
      expect(result.request_url).toContain("/api/v1/query?");
      expect(result.request_url).toContain("query=prism_spindle_load_percent");
      expect(result.request_url).toContain("time=2026-03-16");
      expect(result.request_url).toContain("timeout=30s");
    });

    it("should return error for empty query", () => {
      const result = engine.queryPrometheus({ query: "" });
      expect(result.status).toBe("error");
      expect(result.request_url).toBe("");
    });

    it("should use config override for prometheus URL", () => {
      const result = engine.queryPrometheus({
        query: "up",
        config: { prometheus_url: "http://prom:9090" },
      });
      expect(result.request_url).toContain("http://prom:9090");
    });
  });

  describe("queryRange", () => {
    it("should build correct range query URL", () => {
      const result = engine.queryRange({
        query: "prism_feed_rate_mmpm",
        start: "2026-03-15T00:00:00Z",
        end: "2026-03-16T00:00:00Z",
        step: "1m",
      });
      expect(result.status).toBe("success");
      expect(result.result_type).toBe("matrix");
      expect(result.request_url).toContain("/api/v1/query_range?");
      expect(result.request_url).toContain("step=1m");
    });

    it("should return error for missing required fields", () => {
      const result = engine.queryRange({
        query: "test",
        start: "",
        end: "2026-03-16T00:00:00Z",
        step: "1m",
      });
      expect(result.status).toBe("error");
      expect(result.request_url).toBe("");
    });

    it("should include timeout in URL when provided", () => {
      const result = engine.queryRange({
        query: "test",
        start: "1",
        end: "2",
        step: "15s",
        timeout: "60s",
      });
      expect(result.request_url).toContain("timeout=60s");
    });
  });

  // ==========================================================================
  // Create Dashboard
  // ==========================================================================

  describe("createDashboard", () => {
    it("should create a dashboard with panels", () => {
      const result = engine.createDashboard({
        title: "My CNC Dashboard",
        panels: [
          { title: "Load", type: "gauge", query: "prism_spindle_load_percent", unit: "percent" },
          { title: "Feed", type: "timeseries", query: "prism_feed_rate_mmpm" },
        ],
        tags: ["test"],
        refresh: "5s",
      });
      expect(result.success).toBe(true);
      expect(result.panel_count).toBe(2);
      expect(result.dashboard_uid).toMatch(/^prism-/);
      expect(result.dashboard_url).toContain("/d/prism-");
      expect(result.dashboard_url).toContain("my-cnc-dashboard");
      expect(result.json.dashboard.panels).toHaveLength(2);
      expect(result.json.dashboard.refresh).toBe("5s");
      expect(result.json.dashboard.tags).toContain("test");
    });

    it("should fail without title", () => {
      const result = engine.createDashboard({ title: "", panels: [{ title: "X", type: "stat", query: "q" }] });
      expect(result.success).toBe(false);
      expect(result.errors).toContain("Dashboard title is required");
    });

    it("should fail without panels", () => {
      const result = engine.createDashboard({ title: "Test", panels: [] });
      expect(result.success).toBe(false);
      expect(result.errors).toContain("At least one panel is required");
    });

    it("should apply default tags and time range", () => {
      const result = engine.createDashboard({
        title: "Defaults Test",
        panels: [{ title: "P", type: "timeseries", query: "q" }],
      });
      expect(result.json.dashboard.tags).toEqual(["prism", "manufacturing"]);
      expect(result.json.dashboard.time.from).toBe("now-1h");
      expect(result.json.dashboard.time.to).toBe("now");
    });

    it("should build proper Grafana panel JSON with type-specific options", () => {
      const result = engine.createDashboard({
        title: "Panel Types",
        panels: [
          { title: "G", type: "gauge", query: "q1", thresholds: [{ value: 50, color: "red" }] },
          { title: "S", type: "stat", query: "q2" },
          { title: "T", type: "timeseries", query: "q3" },
          { title: "B", type: "barchart", query: "q4" },
        ],
      });
      const panels = result.json.dashboard.panels;
      // gauge options
      expect(panels[0].options.showThresholdMarkers).toBe(true);
      // stat options
      expect(panels[1].options.colorMode).toBe("value");
      // timeseries options
      expect(panels[2].options.tooltip.mode).toBe("multi");
      // barchart options
      expect(panels[3].options.orientation).toBe("auto");
      // thresholds
      expect(panels[0].fieldConfig.defaults.thresholds.steps).toHaveLength(2); // null + 50
    });
  });

  // ==========================================================================
  // Manufacturing Dashboard
  // ==========================================================================

  describe("getManufacturingDashboard", () => {
    it("should create a full manufacturing dashboard with 11 panels", () => {
      const result = engine.getManufacturingDashboard();
      expect(result.success).toBe(true);
      expect(result.panel_count).toBe(11);
      expect(result.json.dashboard.title).toBe("PRISM CNC Manufacturing Monitor");
      expect(result.json.dashboard.tags).toContain("shop-floor");
      expect(result.json.dashboard.refresh).toBe("5s");
    });

    it("should filter by machine when provided", () => {
      const result = engine.getManufacturingDashboard("DMU-50");
      expect(result.json.dashboard.title).toContain("DMU-50");
      // queries should include machine filter
      const panelQueries = result.json.dashboard.panels.map((p: any) => p.targets[0].expr);
      expect(panelQueries[0]).toContain('{machine="DMU-50"}');
    });
  });

  // ==========================================================================
  // Export Simulation Metrics
  // ==========================================================================

  describe("exportMetricsFromSimulation", () => {
    it("should extract block-level metrics from simulation result", () => {
      const result = engine.exportMetricsFromSimulation({
        simulationResult: {
          blocks: [
            { spindle_load: 70, feed_rate: 1200, cutting_force: 2500, temperature: 350, power_kw: 8.5, mrr: 12.3 },
            { spindle_load: 85, feed_rate: 1100 },
          ],
          cycle_time_sec: 120,
          total_force_n: 3000,
          max_spindle_load: 85,
          tool_wear_vb: 0.15,
        },
        machine: "DMG-1",
        program: "O1001",
      });
      expect(result.source).toBe("CNCSimulationPipeline");
      // Block 1: 6 metrics, Block 2: 2 metrics, Summary: 4 metrics = 12 total
      expect(result.metric_count).toBe(12);
      expect(result.exposition_text).toContain("prism_spindle_load_percent");
      expect(result.exposition_text).toContain("prism_cutting_force_n");
      // Labels should include machine and program
      expect(result.exposition_text).toContain('machine="DMG-1"');
      expect(result.exposition_text).toContain('program="O1001"');
    });

    it("should handle empty simulation result gracefully", () => {
      const result = engine.exportMetricsFromSimulation({ simulationResult: {} });
      expect(result.metric_count).toBe(0);
      expect(result.source).toBe("CNCSimulationPipeline");
    });
  });

  // ==========================================================================
  // Export SPC Metrics
  // ==========================================================================

  describe("exportMetricsFromSPC", () => {
    it("should extract SPC metrics including Cpk, control limits, measurements", () => {
      const result = engine.exportMetricsFromSPC({
        spcResult: {
          cpk: 1.45,
          cp: 1.6,
          mean: 25.002,
          std_dev: 0.003,
          out_of_control_count: 2,
          r_bar: 0.008,
          ucl: 25.011,
          lcl: 24.993,
          measurements: [25.001, 25.003, 24.999],
        },
        operation: "bore_finish",
        characteristic: "diameter_25H7",
      });
      expect(result.source).toBe("StatisticalProcessMonitoring");
      // cpk + cp + mean + std + ooc + rbar + ucl + lcl + 3 measurements = 11
      expect(result.metric_count).toBe(11);
      expect(result.exposition_text).toContain("prism_cpk");
      expect(result.exposition_text).toContain('operation="bore_finish"');
      expect(result.exposition_text).toContain("prism_spc_control_limit");
    });

    it("should handle minimal SPC result", () => {
      const result = engine.exportMetricsFromSPC({ spcResult: { cpk: 1.2 } });
      expect(result.metric_count).toBe(1);
    });
  });

  // ==========================================================================
  // Export Tool Life Metrics
  // ==========================================================================

  describe("exportMetricsFromToolLife", () => {
    it("should extract tool life metrics", () => {
      const result = engine.exportMetricsFromToolLife({
        toolLifeResult: {
          life_remaining_pct: 35,
          flank_wear_vb: 0.18,
          crater_wear_kt: 0.05,
          taylor_life_min: 45,
          taylor_life_parts: 120,
          cutting_speed: 200,
          reliability: 0.92,
          cost_per_part: 0.85,
        },
        tool_id: "T01",
        material: "Ti-6Al-4V",
      });
      expect(result.source).toBe("ToolLifePrediction");
      expect(result.metric_count).toBe(8);
      expect(result.exposition_text).toContain('tool_id="T01"');
      expect(result.exposition_text).toContain('material="Ti-6Al-4V"');
      expect(result.exposition_text).toContain("prism_tool_life_remaining_percent");
      expect(result.exposition_text).toContain("prism_tool_cost_per_part");
    });

    it("should handle empty tool life result", () => {
      const result = engine.exportMetricsFromToolLife({ toolLifeResult: {} });
      expect(result.metric_count).toBe(0);
    });
  });

  // ==========================================================================
  // Alert Configuration
  // ==========================================================================

  describe("configureAlerts", () => {
    it("should create alert rules with correct structure", () => {
      const result = engine.configureAlerts({
        rules: [
          {
            name: "Spindle Overload",
            condition: "prism_spindle_load_percent",
            threshold: 90,
            comparison: "gt",
            duration: "1m",
            severity: "critical",
            summary: "Spindle overloaded",
          },
          {
            name: "Low Cpk",
            condition: "prism_cpk",
            threshold: 1.33,
            comparison: "lt",
            duration: "10m",
            severity: "warning",
            summary: "Cpk below target",
            labels: { team: "quality" },
            annotations: { runbook: "https://docs/cpk" },
          },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.rules_created).toBe(2);
      expect(result.alert_rules[0].name).toBe("Spindle Overload");
      expect(result.alert_rules[0].uid).toMatch(/^prism-/);
      expect(result.alert_rules[0].condition).toContain("gt 90");
      expect(result.alert_rules[1].condition).toContain("lt 1.33");
    });

    it("should fail when no rules provided", () => {
      const result = engine.configureAlerts({ rules: [] });
      expect(result.success).toBe(false);
      expect(result.errors).toContain("No alert rules provided");
    });

    it("should skip invalid rules and report errors", () => {
      const result = engine.configureAlerts({
        rules: [
          { name: "", condition: "q", threshold: 1, comparison: "gt", duration: "1m", severity: "warning", summary: "s" },
          { name: "Valid", condition: "prism_cpk", threshold: 1, comparison: "lt", duration: "5m", severity: "info", summary: "ok" },
        ],
      });
      expect(result.rules_created).toBe(1);
      expect(result.errors.length).toBe(1);
    });
  });

  // ==========================================================================
  // Default Alert Rules
  // ==========================================================================

  describe("getDefaultAlertRules", () => {
    it("should return 8 manufacturing alert rules", () => {
      const rules = engine.getDefaultAlertRules();
      expect(rules).toHaveLength(8);
      // Check coverage of key categories
      const categories = rules.map((r) => r.labels?.category);
      expect(categories).toContain("machine_protection");
      expect(categories).toContain("tool_management");
      expect(categories).toContain("quality");
      expect(categories).toContain("vibration");
    });

    it("should produce valid alert config when fed back into configureAlerts", () => {
      const rules = engine.getDefaultAlertRules();
      const result = engine.configureAlerts({ rules });
      expect(result.success).toBe(true);
      expect(result.rules_created).toBe(8);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ==========================================================================
  // List Metrics
  // ==========================================================================

  describe("listMetrics", () => {
    it("should return all registered metrics with full names", () => {
      const metrics = engine.listMetrics();
      expect(metrics.length).toBeGreaterThanOrEqual(15);
      const names = metrics.map((m) => m.name);
      expect(names).toContain("spindle_load_percent");
      expect(names).toContain("oee_percent");
      expect(names).toContain("mrr_cm3pm");
      // full_name should have prefix
      const spindleMetric = metrics.find((m) => m.name === "spindle_load_percent");
      expect(spindleMetric?.full_name).toBe("prism_spindle_load_percent");
      expect(spindleMetric?.type).toBe("gauge");
    });
  });

  // ==========================================================================
  // Error Handling / Edge Cases
  // ==========================================================================

  describe("error handling", () => {
    it("should handle null/undefined in queryPrometheus gracefully", () => {
      const result = engine.queryPrometheus({ query: undefined as any });
      expect(result.status).toBe("error");
    });

    it("should handle queryRange with all missing fields", () => {
      const result = engine.queryRange({ query: "", start: "", end: "", step: "" });
      expect(result.status).toBe("error");
      expect(result.result_type).toBe("matrix");
    });

    it("should generate deterministic UIDs from the same seed", () => {
      const d1 = engine.createDashboard({ title: "Stable", panels: [{ title: "P", type: "stat", query: "q" }] });
      const d2 = engine.createDashboard({ title: "Stable", panels: [{ title: "P", type: "stat", query: "q" }] });
      expect(d1.dashboard_uid).toBe(d2.dashboard_uid);
    });

    it("should handle simulation with blocks missing optional fields", () => {
      const result = engine.exportMetricsFromSimulation({
        simulationResult: {
          blocks: [{ spindle_load: 50 }, { feed_rate: 800 }],
        },
      });
      // Block 1: only spindle_load (1), Block 2: only feed_rate (1) = 2
      expect(result.metric_count).toBe(2);
    });
  });
});
