/**
 * LatheBusinessDashboardEngine — Unified Business Dashboard
 *
 * U-LTH58: Executive dashboard aggregating all business metrics
 * Uses DashboardEngine + MetricsAggregatorEngine + KPIDashboardEngine patterns
 *
 * @module engines/LatheBusinessDashboardEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardWidget {
  widget_id: string;
  title: string;
  type: "kpi" | "chart" | "table" | "alert" | "gauge";
  category: "production" | "quality" | "financial" | "delivery" | "inventory";
  data: unknown;
  status: "good" | "warning" | "critical" | "neutral";
  last_updated: string;
}

export interface KPICard {
  name: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
  change_pct: number;
  target?: number;
  status: "above_target" | "on_target" | "below_target";
}

export interface ExecutiveSummary {
  period: string;
  generated_at: string;
  overall_health_score: number;
  health_status: "excellent" | "good" | "fair" | "poor" | "critical";
  kpis: {
    production: KPICard[];
    quality: KPICard[];
    financial: KPICard[];
    delivery: KPICard[];
  };
  alerts: Array<{
    severity: "critical" | "warning" | "info";
    category: string;
    message: string;
  }>;
  recommendations: string[];
}

export interface TrendData {
  metric: string;
  periods: Array<{
    period: string;
    value: number;
  }>;
  average: number;
  min: number;
  max: number;
  trend_direction: "improving" | "stable" | "declining";
}

export interface ComparisonReport {
  period_1: string;
  period_2: string;
  metrics: Array<{
    name: string;
    period_1_value: number;
    period_2_value: number;
    change: number;
    change_pct: number;
    status: "improved" | "unchanged" | "declined";
  }>;
}

export interface DashboardConfig {
  refresh_interval_sec: number;
  widgets_enabled: string[];
  alert_thresholds: {
    oee_warning: number;
    oee_critical: number;
    otd_warning: number;
    otd_critical: number;
    margin_warning: number;
    margin_critical: number;
  };
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: DashboardConfig = {
  refresh_interval_sec: 300,
  widgets_enabled: ["production", "quality", "financial", "delivery", "inventory"],
  alert_thresholds: {
    oee_warning: 75,
    oee_critical: 60,
    otd_warning: 90,
    otd_critical: 80,
    margin_warning: 20,
    margin_critical: 10,
  },
};

// ============================================================================
// ENGINE
// ============================================================================

class LatheBusinessDashboardEngine {
  private config: DashboardConfig = { ...DEFAULT_CONFIG };
  private widgets: Map<string, DashboardWidget> = new Map();
  private metricsHistory: Map<string, Array<{ timestamp: string; value: number }>> = new Map();

  // --------------------------------------------------------------------------
  // Dashboard Generation
  // --------------------------------------------------------------------------

  generateExecutiveSummary(metrics: {
    oee?: number;
    utilization?: number;
    jobs_completed?: number;
    fpy?: number;
    cpk_avg?: number;
    defect_ppm?: number;
    revenue?: number;
    margin_pct?: number;
    otd_pct?: number;
    avg_delay_days?: number;
    inventory_turns?: number;
    stockout_count?: number;
  }): ExecutiveSummary {
    const now = new Date();
    const alerts: ExecutiveSummary["alerts"] = [];
    const recommendations: string[] = [];

    const productionKPIs: KPICard[] = [];
    const qualityKPIs: KPICard[] = [];
    const financialKPIs: KPICard[] = [];
    const deliveryKPIs: KPICard[] = [];

    if (metrics.oee !== undefined) {
      const status = this.getThresholdStatus(metrics.oee, 85, this.config.alert_thresholds.oee_warning);
      productionKPIs.push({
        name: "OEE",
        value: metrics.oee,
        unit: "%",
        trend: this.getTrend("oee", metrics.oee),
        change_pct: this.getChangePct("oee", metrics.oee),
        target: 85,
        status,
      });

      if (metrics.oee < this.config.alert_thresholds.oee_critical) {
        alerts.push({
          severity: "critical",
          category: "Production",
          message: `OEE at ${metrics.oee}% - below critical threshold`,
        });
        recommendations.push("Investigate downtime causes and implement quick wins");
      }
    }

    if (metrics.utilization !== undefined) {
      productionKPIs.push({
        name: "Utilization",
        value: metrics.utilization,
        unit: "%",
        trend: this.getTrend("utilization", metrics.utilization),
        change_pct: this.getChangePct("utilization", metrics.utilization),
        target: 80,
        status: this.getThresholdStatus(metrics.utilization, 80, 70),
      });
    }

    if (metrics.jobs_completed !== undefined) {
      productionKPIs.push({
        name: "Jobs Completed",
        value: metrics.jobs_completed,
        unit: "jobs",
        trend: this.getTrend("jobs_completed", metrics.jobs_completed),
        change_pct: this.getChangePct("jobs_completed", metrics.jobs_completed),
        status: "on_target",
      });
    }

    if (metrics.fpy !== undefined) {
      const status = this.getThresholdStatus(metrics.fpy, 98, 95);
      qualityKPIs.push({
        name: "First Pass Yield",
        value: metrics.fpy,
        unit: "%",
        trend: this.getTrend("fpy", metrics.fpy),
        change_pct: this.getChangePct("fpy", metrics.fpy),
        target: 98,
        status,
      });
    }

    if (metrics.cpk_avg !== undefined) {
      qualityKPIs.push({
        name: "Avg Cpk",
        value: metrics.cpk_avg,
        unit: "",
        trend: this.getTrend("cpk_avg", metrics.cpk_avg),
        change_pct: this.getChangePct("cpk_avg", metrics.cpk_avg),
        target: 1.33,
        status: this.getThresholdStatus(metrics.cpk_avg, 1.33, 1.0),
      });
    }

    if (metrics.defect_ppm !== undefined) {
      const status = metrics.defect_ppm <= 100 ? "above_target" :
        metrics.defect_ppm <= 500 ? "on_target" : "below_target";
      qualityKPIs.push({
        name: "Defect Rate",
        value: metrics.defect_ppm,
        unit: "PPM",
        trend: this.getTrend("defect_ppm", metrics.defect_ppm),
        change_pct: this.getChangePct("defect_ppm", metrics.defect_ppm),
        target: 100,
        status,
      });

      if (metrics.defect_ppm > 1000) {
        alerts.push({
          severity: "warning",
          category: "Quality",
          message: `Defect rate at ${metrics.defect_ppm} PPM - review process controls`,
        });
      }
    }

    if (metrics.revenue !== undefined) {
      financialKPIs.push({
        name: "Revenue",
        value: metrics.revenue,
        unit: "$",
        trend: this.getTrend("revenue", metrics.revenue),
        change_pct: this.getChangePct("revenue", metrics.revenue),
        status: "on_target",
      });
    }

    if (metrics.margin_pct !== undefined) {
      const status = this.getThresholdStatus(
        metrics.margin_pct,
        30,
        this.config.alert_thresholds.margin_warning
      );
      financialKPIs.push({
        name: "Gross Margin",
        value: metrics.margin_pct,
        unit: "%",
        trend: this.getTrend("margin_pct", metrics.margin_pct),
        change_pct: this.getChangePct("margin_pct", metrics.margin_pct),
        target: 30,
        status,
      });

      if (metrics.margin_pct < this.config.alert_thresholds.margin_critical) {
        alerts.push({
          severity: "critical",
          category: "Financial",
          message: `Margin at ${metrics.margin_pct}% - profitability at risk`,
        });
        recommendations.push("Review pricing and cost structure immediately");
      }
    }

    if (metrics.otd_pct !== undefined) {
      const status = this.getThresholdStatus(
        metrics.otd_pct,
        95,
        this.config.alert_thresholds.otd_warning
      );
      deliveryKPIs.push({
        name: "On-Time Delivery",
        value: metrics.otd_pct,
        unit: "%",
        trend: this.getTrend("otd_pct", metrics.otd_pct),
        change_pct: this.getChangePct("otd_pct", metrics.otd_pct),
        target: 95,
        status,
      });

      if (metrics.otd_pct < this.config.alert_thresholds.otd_critical) {
        alerts.push({
          severity: "warning",
          category: "Delivery",
          message: `OTD at ${metrics.otd_pct}% - customer satisfaction at risk`,
        });
        recommendations.push("Review scheduling and capacity allocation");
      }
    }

    if (metrics.avg_delay_days !== undefined) {
      deliveryKPIs.push({
        name: "Avg Delay",
        value: metrics.avg_delay_days,
        unit: "days",
        trend: this.getTrend("avg_delay_days", metrics.avg_delay_days),
        change_pct: this.getChangePct("avg_delay_days", metrics.avg_delay_days),
        target: 0,
        status: metrics.avg_delay_days <= 1 ? "on_target" : "below_target",
      });
    }

    const healthScore = this.calculateHealthScore(metrics);
    const healthStatus = this.getHealthStatus(healthScore);

    if (recommendations.length === 0 && healthScore >= 80) {
      recommendations.push("Continue current operational practices");
      recommendations.push("Focus on continuous improvement initiatives");
    }

    return {
      period: "Current Period",
      generated_at: now.toISOString(),
      overall_health_score: healthScore,
      health_status: healthStatus,
      kpis: {
        production: productionKPIs,
        quality: qualityKPIs,
        financial: financialKPIs,
        delivery: deliveryKPIs,
      },
      alerts: alerts.sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2 };
        return order[a.severity] - order[b.severity];
      }),
      recommendations,
    };
  }

  // --------------------------------------------------------------------------
  // Widget Management
  // --------------------------------------------------------------------------

  createWidget(params: Omit<DashboardWidget, "widget_id" | "last_updated">): DashboardWidget {
    const widgetId = `WGT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const widget: DashboardWidget = {
      ...params,
      widget_id: widgetId,
      last_updated: new Date().toISOString(),
    };

    this.widgets.set(widgetId, widget);
    return widget;
  }

  updateWidget(widgetId: string, data: unknown, status?: DashboardWidget["status"]): DashboardWidget | null {
    const widget = this.widgets.get(widgetId);
    if (!widget) return null;

    widget.data = data;
    if (status) widget.status = status;
    widget.last_updated = new Date().toISOString();

    this.widgets.set(widgetId, widget);
    return widget;
  }

  getWidget(widgetId: string): DashboardWidget | null {
    return this.widgets.get(widgetId) || null;
  }

  getWidgetsByCategory(category: DashboardWidget["category"]): DashboardWidget[] {
    return Array.from(this.widgets.values()).filter((w) => w.category === category);
  }

  getAllWidgets(): DashboardWidget[] {
    return Array.from(this.widgets.values());
  }

  // --------------------------------------------------------------------------
  // Trend Analysis
  // --------------------------------------------------------------------------

  recordMetric(metricName: string, value: number): void {
    const history = this.metricsHistory.get(metricName) || [];
    history.push({
      timestamp: new Date().toISOString(),
      value,
    });

    if (history.length > 100) {
      history.shift();
    }

    this.metricsHistory.set(metricName, history);
  }

  getTrendData(metricName: string, periods: number = 12): TrendData | null {
    const history = this.metricsHistory.get(metricName);
    if (!history || history.length === 0) return null;

    const recentHistory = history.slice(-periods);
    const values = recentHistory.map((h) => h.value);

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    let trendDirection: TrendData["trend_direction"] = "stable";
    if (values.length >= 3) {
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (secondAvg > firstAvg * 1.05) trendDirection = "improving";
      else if (secondAvg < firstAvg * 0.95) trendDirection = "declining";
    }

    return {
      metric: metricName,
      periods: recentHistory.map((h, i) => ({
        period: `P${i + 1}`,
        value: h.value,
      })),
      average: Math.round(avg * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      trend_direction: trendDirection,
    };
  }

  // --------------------------------------------------------------------------
  // Comparison Reports
  // --------------------------------------------------------------------------

  generateComparisonReport(
    period1Metrics: Record<string, number>,
    period2Metrics: Record<string, number>,
    period1Label: string,
    period2Label: string
  ): ComparisonReport {
    const allMetrics = new Set([...Object.keys(period1Metrics), ...Object.keys(period2Metrics)]);
    const metrics: ComparisonReport["metrics"] = [];

    for (const name of allMetrics) {
      const val1 = period1Metrics[name] || 0;
      const val2 = period2Metrics[name] || 0;
      const change = val2 - val1;
      const changePct = val1 !== 0 ? (change / val1) * 100 : 0;

      let status: ComparisonReport["metrics"][0]["status"] = "unchanged";
      if (Math.abs(changePct) > 5) {
        const isLowerBetter = name.toLowerCase().includes("delay") ||
          name.toLowerCase().includes("defect") ||
          name.toLowerCase().includes("cost");
        if (isLowerBetter) {
          status = change < 0 ? "improved" : "declined";
        } else {
          status = change > 0 ? "improved" : "declined";
        }
      }

      metrics.push({
        name,
        period_1_value: val1,
        period_2_value: val2,
        change: Math.round(change * 100) / 100,
        change_pct: Math.round(changePct * 10) / 10,
        status,
      });
    }

    return {
      period_1: period1Label,
      period_2: period2Label,
      metrics: metrics.sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct)),
    };
  }

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  updateConfig(updates: Partial<DashboardConfig>): DashboardConfig {
    this.config = { ...this.config, ...updates };
    return this.config;
  }

  getConfig(): DashboardConfig {
    return { ...this.config };
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private calculateHealthScore(metrics: Record<string, number | undefined>): number {
    const scores: number[] = [];

    if (metrics.oee !== undefined) {
      scores.push(Math.min(100, (metrics.oee / 85) * 100));
    }
    if (metrics.fpy !== undefined) {
      scores.push(Math.min(100, (metrics.fpy / 98) * 100));
    }
    if (metrics.margin_pct !== undefined) {
      scores.push(Math.min(100, (metrics.margin_pct / 30) * 100));
    }
    if (metrics.otd_pct !== undefined) {
      scores.push(Math.min(100, (metrics.otd_pct / 95) * 100));
    }

    if (scores.length === 0) return 75;

    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  private getHealthStatus(score: number): ExecutiveSummary["health_status"] {
    if (score >= 90) return "excellent";
    if (score >= 80) return "good";
    if (score >= 70) return "fair";
    if (score >= 60) return "poor";
    return "critical";
  }

  private getThresholdStatus(
    value: number,
    target: number,
    warning: number
  ): KPICard["status"] {
    if (value >= target) return "above_target";
    if (value >= warning) return "on_target";
    return "below_target";
  }

  private getTrend(metric: string, currentValue: number): KPICard["trend"] {
    const history = this.metricsHistory.get(metric);
    if (!history || history.length < 2) {
      this.recordMetric(metric, currentValue);
      return "stable";
    }

    const previousValue = history[history.length - 1].value;
    this.recordMetric(metric, currentValue);

    if (currentValue > previousValue * 1.02) return "up";
    if (currentValue < previousValue * 0.98) return "down";
    return "stable";
  }

  private getChangePct(metric: string, currentValue: number): number {
    const history = this.metricsHistory.get(metric);
    if (!history || history.length < 2) return 0;

    const previousValue = history[history.length - 2]?.value || currentValue;
    if (previousValue === 0) return 0;

    return Math.round(((currentValue - previousValue) / previousValue) * 1000) / 10;
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  clearAll(): void {
    this.widgets.clear();
    this.metricsHistory.clear();
    this.config = { ...DEFAULT_CONFIG };
  }
}

export const latheBusinessDashboardEngine = new LatheBusinessDashboardEngine();
