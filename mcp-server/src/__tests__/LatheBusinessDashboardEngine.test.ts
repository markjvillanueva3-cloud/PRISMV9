/**
 * LatheBusinessDashboardEngine Tests
 *
 * U-LTH58: Executive dashboard aggregating all business metrics
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheBusinessDashboardEngine } from "../engines/LatheBusinessDashboardEngine.js";

describe("LatheBusinessDashboardEngine", () => {
  beforeEach(() => {
    latheBusinessDashboardEngine.clearAll();
  });

  describe("Executive Summary", () => {
    it("generates summary with all KPI categories", () => {
      const summary = latheBusinessDashboardEngine.generateExecutiveSummary({
        oee: 82,
        utilization: 78,
        jobs_completed: 45,
        fpy: 97.5,
        cpk_avg: 1.45,
        defect_ppm: 250,
        revenue: 125000,
        margin_pct: 28,
        otd_pct: 93,
        avg_delay_days: 1.2,
      });

      expect(summary.kpis.production.length).toBeGreaterThan(0);
      expect(summary.kpis.quality.length).toBeGreaterThan(0);
      expect(summary.kpis.financial.length).toBeGreaterThan(0);
      expect(summary.kpis.delivery.length).toBeGreaterThan(0);
    });

    it("calculates overall health score", () => {
      const summary = latheBusinessDashboardEngine.generateExecutiveSummary({
        oee: 85,
        fpy: 98,
        margin_pct: 30,
        otd_pct: 95,
      });

      expect(summary.overall_health_score).toBeGreaterThanOrEqual(0);
      expect(summary.overall_health_score).toBeLessThanOrEqual(100);
    });

    it("assigns health status based on score", () => {
      const excellentSummary = latheBusinessDashboardEngine.generateExecutiveSummary({
        oee: 92,
        fpy: 99,
        margin_pct: 35,
        otd_pct: 98,
      });

      expect(["excellent", "good"]).toContain(excellentSummary.health_status);
    });

    it("generates alerts for critical thresholds", () => {
      const summary = latheBusinessDashboardEngine.generateExecutiveSummary({
        oee: 55,
        margin_pct: 8,
      });

      expect(summary.alerts.length).toBeGreaterThan(0);
      expect(summary.alerts.some((a) => a.severity === "critical")).toBe(true);
    });

    it("provides recommendations based on metrics", () => {
      const summary = latheBusinessDashboardEngine.generateExecutiveSummary({
        oee: 60,
        otd_pct: 75,
      });

      expect(summary.recommendations.length).toBeGreaterThan(0);
    });

    it("includes KPI trends", () => {
      latheBusinessDashboardEngine.recordMetric("oee", 80);
      latheBusinessDashboardEngine.recordMetric("oee", 82);

      const summary = latheBusinessDashboardEngine.generateExecutiveSummary({
        oee: 85,
      });

      const oeeKpi = summary.kpis.production.find((k) => k.name === "OEE");
      expect(oeeKpi).toBeDefined();
      expect(["up", "down", "stable"]).toContain(oeeKpi!.trend);
    });
  });

  describe("Widget Management", () => {
    it("creates dashboard widget", () => {
      const widget = latheBusinessDashboardEngine.createWidget({
        title: "OEE Gauge",
        type: "gauge",
        category: "production",
        data: { value: 82, target: 85 },
        status: "warning",
      });

      expect(widget.widget_id).toMatch(/^WGT-/);
      expect(widget.last_updated).toBeDefined();
    });

    it("updates widget data", () => {
      const widget = latheBusinessDashboardEngine.createWidget({
        title: "Revenue Chart",
        type: "chart",
        category: "financial",
        data: { values: [100, 120, 110] },
        status: "good",
      });

      const updated = latheBusinessDashboardEngine.updateWidget(
        widget.widget_id,
        { values: [100, 120, 110, 130] },
        "good"
      );

      expect(updated).not.toBeNull();
      expect((updated!.data as { values: number[] }).values.length).toBe(4);
    });

    it("retrieves widgets by category", () => {
      latheBusinessDashboardEngine.createWidget({
        title: "Production KPI",
        type: "kpi",
        category: "production",
        data: {},
        status: "good",
      });

      latheBusinessDashboardEngine.createWidget({
        title: "Quality KPI",
        type: "kpi",
        category: "quality",
        data: {},
        status: "good",
      });

      const productionWidgets = latheBusinessDashboardEngine.getWidgetsByCategory("production");
      expect(productionWidgets.length).toBe(1);
      expect(productionWidgets[0].category).toBe("production");
    });

    it("retrieves all widgets", () => {
      for (let i = 0; i < 5; i++) {
        latheBusinessDashboardEngine.createWidget({
          title: `Widget ${i}`,
          type: "kpi",
          category: "production",
          data: {},
          status: "neutral",
        });
      }

      const allWidgets = latheBusinessDashboardEngine.getAllWidgets();
      expect(allWidgets.length).toBe(5);
    });
  });

  describe("Trend Analysis", () => {
    it("records metric values", () => {
      latheBusinessDashboardEngine.recordMetric("oee", 80);
      latheBusinessDashboardEngine.recordMetric("oee", 82);
      latheBusinessDashboardEngine.recordMetric("oee", 85);

      const trend = latheBusinessDashboardEngine.getTrendData("oee");

      expect(trend).not.toBeNull();
      expect(trend!.periods.length).toBe(3);
    });

    it("calculates trend statistics", () => {
      const values = [80, 82, 78, 85, 83];
      for (const v of values) {
        latheBusinessDashboardEngine.recordMetric("utilization", v);
      }

      const trend = latheBusinessDashboardEngine.getTrendData("utilization");

      expect(trend!.average).toBeCloseTo(81.6, 0);
      expect(trend!.min).toBe(78);
      expect(trend!.max).toBe(85);
    });

    it("identifies trend direction", () => {
      for (let i = 0; i < 10; i++) {
        latheBusinessDashboardEngine.recordMetric("improving_metric", 70 + i * 2);
      }

      const trend = latheBusinessDashboardEngine.getTrendData("improving_metric");

      expect(trend!.trend_direction).toBe("improving");
    });

    it("returns null for unknown metric", () => {
      const trend = latheBusinessDashboardEngine.getTrendData("unknown_metric");
      expect(trend).toBeNull();
    });

    it("limits history to 100 entries", () => {
      for (let i = 0; i < 120; i++) {
        latheBusinessDashboardEngine.recordMetric("many_values", i);
      }

      const trend = latheBusinessDashboardEngine.getTrendData("many_values", 100);

      expect(trend!.periods.length).toBeLessThanOrEqual(100);
    });
  });

  describe("Comparison Reports", () => {
    it("generates comparison between periods", () => {
      const period1 = {
        revenue: 100000,
        margin_pct: 25,
        otd_pct: 90,
      };

      const period2 = {
        revenue: 120000,
        margin_pct: 28,
        otd_pct: 93,
      };

      const report = latheBusinessDashboardEngine.generateComparisonReport(
        period1,
        period2,
        "Q1 2026",
        "Q2 2026"
      );

      expect(report.period_1).toBe("Q1 2026");
      expect(report.period_2).toBe("Q2 2026");
      expect(report.metrics.length).toBe(3);
    });

    it("calculates change percentages", () => {
      const report = latheBusinessDashboardEngine.generateComparisonReport(
        { revenue: 100000 },
        { revenue: 120000 },
        "P1",
        "P2"
      );

      const revenueMetric = report.metrics.find((m) => m.name === "revenue");
      expect(revenueMetric!.change).toBe(20000);
      expect(revenueMetric!.change_pct).toBe(20);
    });

    it("identifies improved/declined status", () => {
      const report = latheBusinessDashboardEngine.generateComparisonReport(
        { revenue: 100000, delay_days: 3 },
        { revenue: 120000, delay_days: 1 },
        "P1",
        "P2"
      );

      const revenueMetric = report.metrics.find((m) => m.name === "revenue");
      const delayMetric = report.metrics.find((m) => m.name === "delay_days");

      expect(revenueMetric!.status).toBe("improved");
      expect(delayMetric!.status).toBe("improved");
    });

    it("sorts by absolute change percentage", () => {
      const report = latheBusinessDashboardEngine.generateComparisonReport(
        { metric_a: 100, metric_b: 100, metric_c: 100 },
        { metric_a: 150, metric_b: 110, metric_c: 90 },
        "P1",
        "P2"
      );

      expect(Math.abs(report.metrics[0].change_pct)).toBeGreaterThanOrEqual(
        Math.abs(report.metrics[1].change_pct)
      );
    });
  });

  describe("Configuration", () => {
    it("returns default configuration", () => {
      const config = latheBusinessDashboardEngine.getConfig();

      expect(config.refresh_interval_sec).toBe(300);
      expect(config.alert_thresholds.oee_critical).toBe(60);
    });

    it("updates configuration", () => {
      const updated = latheBusinessDashboardEngine.updateConfig({
        refresh_interval_sec: 600,
        alert_thresholds: {
          oee_warning: 70,
          oee_critical: 55,
          otd_warning: 85,
          otd_critical: 75,
          margin_warning: 15,
          margin_critical: 8,
        },
      });

      expect(updated.refresh_interval_sec).toBe(600);
      expect(updated.alert_thresholds.oee_critical).toBe(55);
    });

    it("applies updated thresholds to alerts", () => {
      latheBusinessDashboardEngine.updateConfig({
        alert_thresholds: {
          oee_warning: 80,
          oee_critical: 70,
          otd_warning: 90,
          otd_critical: 80,
          margin_warning: 20,
          margin_critical: 10,
        },
      });

      const summary = latheBusinessDashboardEngine.generateExecutiveSummary({
        oee: 65,
      });

      expect(summary.alerts.some((a) =>
        a.message.includes("OEE") && a.severity === "critical"
      )).toBe(true);
    });
  });

  describe("KPI Status Assignment", () => {
    it("assigns above_target for exceeding values", () => {
      const summary = latheBusinessDashboardEngine.generateExecutiveSummary({
        oee: 90,
      });

      const oeeKpi = summary.kpis.production.find((k) => k.name === "OEE");
      expect(oeeKpi!.status).toBe("above_target");
    });

    it("assigns on_target for acceptable values", () => {
      const summary = latheBusinessDashboardEngine.generateExecutiveSummary({
        oee: 80,
      });

      const oeeKpi = summary.kpis.production.find((k) => k.name === "OEE");
      expect(oeeKpi!.status).toBe("on_target");
    });

    it("assigns below_target for poor values", () => {
      const summary = latheBusinessDashboardEngine.generateExecutiveSummary({
        oee: 65,
      });

      const oeeKpi = summary.kpis.production.find((k) => k.name === "OEE");
      expect(oeeKpi!.status).toBe("below_target");
    });
  });

  describe("Alert Severity", () => {
    it("sorts alerts by severity (critical first)", () => {
      const summary = latheBusinessDashboardEngine.generateExecutiveSummary({
        oee: 55,
        otd_pct: 78,
        defect_ppm: 1500,
      });

      if (summary.alerts.length > 1) {
        expect(summary.alerts[0].severity).toBe("critical");
      }
    });

    it("generates info alerts for suggestions", () => {
      const summary = latheBusinessDashboardEngine.generateExecutiveSummary({
        oee: 95,
        fpy: 99,
        margin_pct: 35,
        otd_pct: 98,
      });

      expect(summary.recommendations.length).toBeGreaterThan(0);
    });
  });
});
