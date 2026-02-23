/**
 * ReportingEngine — R21-MS4
 *
 * Multi-engine report aggregation: generate structured reports by pulling
 * data from predictive-maintenance, asset-health, shop-floor analytics, and
 * other engines. Supports summary, trend analysis, and export formatting.
 *
 * Actions:
 *   rpt_generate  — Generate a structured multi-section report
 *   rpt_summary   — Quick executive summary across engines
 *   rpt_trend     — Trend analysis over time periods
 *   rpt_export    — Format report data for export (JSON, CSV, markdown)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportSection {
  title: string;
  engine: string;
  action: string;
  status: "ok" | "warning" | "critical" | "unavailable";
  metrics: Record<string, unknown>;
  highlights: string[];
}

interface GenerateInput {
  report_type?: string;       // maintenance, production, quality, executive, custom
  machine_ids?: string[];
  time_range?: string;        // last_shift, last_day, last_week, last_month
  sections?: string[];        // engine names to include
  include_recommendations?: boolean;
}

interface SummaryInput {
  scope?: string;             // plant, cell, machine
  machine_ids?: string[];
  time_range?: string;
}

interface TrendInput {
  metric: string;             // oee, utilization, health_score, wear_rate, failure_risk
  machine_ids?: string[];
  periods: number;            // number of periods
  period_type?: string;       // shift, day, week, month
}

interface ExportInput {
  report_data: Record<string, unknown>;
  format: string;             // json, csv, markdown, html
  title?: string;
}

// ---------------------------------------------------------------------------
// Simulated data sources (in production these would call other engines)
// ---------------------------------------------------------------------------

function generateMachineSnapshot(machineId: string) {
  // Deterministic pseudo-random from machine ID
  const hash = machineId.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const seed = Math.abs(hash) % 1000;

  const healthScore = 55 + (seed % 40);                  // 55-94
  const oee = 0.45 + (seed % 45) / 100;                  // 0.45-0.89
  const utilization = 0.40 + (seed % 50) / 100;          // 0.40-0.89
  const wearPct = 10 + (seed % 70);                      // 10-79%
  const failureRisk = (seed % 60) / 100;                 // 0.00-0.59
  const mtbf_hours = 200 + (seed % 800);                 // 200-999
  const mttr_hours = 0.5 + (seed % 40) / 10;             // 0.5-4.4

  return {
    machine_id: machineId,
    health_score: healthScore,
    health_rating: healthScore >= 80 ? "good" : healthScore >= 60 ? "fair" : "poor",
    oee: Math.round(oee * 1000) / 1000,
    utilization: Math.round(utilization * 1000) / 1000,
    tool_wear_pct: wearPct,
    failure_risk: Math.round(failureRisk * 1000) / 1000,
    mtbf_hours,
    mttr_hours: Math.round(mttr_hours * 10) / 10,
    last_maintenance: "2026-02-15T08:00:00Z",
    next_scheduled: "2026-03-01T08:00:00Z",
  };
}

function generateTrendPoint(baseLine: number, period: number, noise: number) {
  // Slight degradation over time + noise
  const drift = -0.002 * period;
  const jitter = ((period * 7 + 13) % 17 - 8) / 100 * noise;
  return Math.max(0, Math.min(1, baseLine + drift + jitter));
}

// ---------------------------------------------------------------------------
// Report type definitions
// ---------------------------------------------------------------------------

const REPORT_TYPES: Record<string, { title: string; sections: string[] }> = {
  maintenance: {
    title: "Maintenance Intelligence Report",
    sections: ["predictive_maintenance", "asset_health", "tool_wear"],
  },
  production: {
    title: "Production Performance Report",
    sections: ["shop_floor_oee", "utilization", "bottleneck", "capacity"],
  },
  quality: {
    title: "Quality & Process Report",
    sections: ["quality_metrics", "process_drift", "measurement_feedback"],
  },
  executive: {
    title: "Executive Summary Report",
    sections: ["fleet_overview", "key_metrics", "action_items"],
  },
  custom: {
    title: "Custom Report",
    sections: [],
  },
};

// ---------------------------------------------------------------------------
// rpt_generate — Multi-section report
// ---------------------------------------------------------------------------

function generateReport(input: GenerateInput) {
  const {
    report_type = "executive",
    machine_ids = ["machine_1", "machine_2", "machine_3"],
    time_range = "last_shift",
    include_recommendations = true,
  } = input;

  const reportDef = REPORT_TYPES[report_type] ?? REPORT_TYPES.executive;

  // Build machine snapshots
  const snapshots = machine_ids.map(generateMachineSnapshot);

  // Build sections based on report type
  const sections: ReportSection[] = [];
  const allRecommendations: string[] = [];

  // Fleet overview section
  if (reportDef.sections.includes("fleet_overview") || reportDef.sections.includes("asset_health")) {
    const avgHealth = snapshots.reduce((s, m) => s + m.health_score, 0) / snapshots.length;
    const criticalMachines = snapshots.filter((m) => m.health_score < 60);
    const status = criticalMachines.length > 0 ? "warning" : avgHealth >= 75 ? "ok" : "warning";

    sections.push({
      title: "Fleet Health Overview",
      engine: "AssetHealthEngine",
      action: "ah_score",
      status,
      metrics: {
        total_machines: snapshots.length,
        avg_health_score: Math.round(avgHealth * 10) / 10,
        critical_count: criticalMachines.length,
        machines: snapshots.map((m) => ({
          id: m.machine_id,
          score: m.health_score,
          rating: m.health_rating,
        })),
      },
      highlights: [
        `Fleet average health: ${Math.round(avgHealth)}%`,
        criticalMachines.length > 0
          ? `${criticalMachines.length} machine(s) in critical condition`
          : "All machines within acceptable health range",
      ],
    });

    if (criticalMachines.length > 0)
      allRecommendations.push(`Schedule maintenance for ${criticalMachines.map((m) => m.machine_id).join(", ")}`);
  }

  // Predictive maintenance section
  if (reportDef.sections.includes("predictive_maintenance") || reportDef.sections.includes("tool_wear")) {
    const highWear = snapshots.filter((m) => m.tool_wear_pct > 60);
    const highRisk = snapshots.filter((m) => m.failure_risk > 0.40);
    const status = highRisk.length > 0 ? "critical" : highWear.length > 0 ? "warning" : "ok";

    sections.push({
      title: "Predictive Maintenance Status",
      engine: "PredictiveMaintenanceEngine",
      action: "pm_predict_wear",
      status,
      metrics: {
        high_wear_machines: highWear.length,
        high_risk_machines: highRisk.length,
        avg_tool_wear_pct: Math.round(snapshots.reduce((s, m) => s + m.tool_wear_pct, 0) / snapshots.length),
        avg_failure_risk: Math.round(snapshots.reduce((s, m) => s + m.failure_risk, 0) / snapshots.length * 1000) / 1000,
        details: snapshots.map((m) => ({
          id: m.machine_id,
          wear_pct: m.tool_wear_pct,
          failure_risk: m.failure_risk,
          next_scheduled: m.next_scheduled,
        })),
      },
      highlights: [
        `Average tool wear: ${Math.round(snapshots.reduce((s, m) => s + m.tool_wear_pct, 0) / snapshots.length)}%`,
        highRisk.length > 0
          ? `${highRisk.length} machine(s) with elevated failure risk (>40%)`
          : "All failure risks within normal range",
      ],
    });

    if (highWear.length > 0)
      allRecommendations.push(`Tool replacement needed for ${highWear.map((m) => m.machine_id).join(", ")} (wear >60%)`);
    if (highRisk.length > 0)
      allRecommendations.push(`Immediate inspection for ${highRisk.map((m) => m.machine_id).join(", ")} (failure risk >40%)`);
  }

  // OEE / production section
  if (reportDef.sections.includes("shop_floor_oee") || reportDef.sections.includes("key_metrics")) {
    const avgOEE = snapshots.reduce((s, m) => s + m.oee, 0) / snapshots.length;
    const lowOEE = snapshots.filter((m) => m.oee < 0.55);
    const status = lowOEE.length > 0 ? "warning" : avgOEE >= 0.70 ? "ok" : "warning";

    sections.push({
      title: "OEE Performance",
      engine: "ShopFloorAnalyticsEngine",
      action: "sf_oee",
      status,
      metrics: {
        fleet_avg_oee: Math.round(avgOEE * 1000) / 1000,
        fleet_avg_oee_pct: `${(avgOEE * 100).toFixed(1)}%`,
        low_oee_count: lowOEE.length,
        machines: snapshots.map((m) => ({ id: m.machine_id, oee: m.oee })),
      },
      highlights: [
        `Fleet average OEE: ${(avgOEE * 100).toFixed(1)}%`,
        lowOEE.length > 0
          ? `${lowOEE.length} machine(s) below 55% OEE`
          : "All machines above acceptable OEE threshold",
      ],
    });

    if (lowOEE.length > 0)
      allRecommendations.push(`Investigate low OEE at ${lowOEE.map((m) => m.machine_id).join(", ")}`);
  }

  // Utilization section
  if (reportDef.sections.includes("utilization")) {
    const avgUtil = snapshots.reduce((s, m) => s + m.utilization, 0) / snapshots.length;

    sections.push({
      title: "Machine Utilization",
      engine: "ShopFloorAnalyticsEngine",
      action: "sf_utilization",
      status: avgUtil >= 0.65 ? "ok" : "warning",
      metrics: {
        fleet_avg_utilization: Math.round(avgUtil * 1000) / 1000,
        fleet_avg_utilization_pct: `${(avgUtil * 100).toFixed(1)}%`,
        machines: snapshots.map((m) => ({ id: m.machine_id, utilization: m.utilization })),
      },
      highlights: [
        `Fleet average utilization: ${(avgUtil * 100).toFixed(1)}%`,
      ],
    });
  }

  // Reliability section
  if (reportDef.sections.includes("key_metrics") || reportDef.sections.includes("fleet_overview")) {
    const avgMTBF = snapshots.reduce((s, m) => s + m.mtbf_hours, 0) / snapshots.length;
    const avgMTTR = snapshots.reduce((s, m) => s + m.mttr_hours, 0) / snapshots.length;
    const availability = avgMTBF / (avgMTBF + avgMTTR);

    sections.push({
      title: "Reliability Metrics",
      engine: "PredictiveMaintenanceEngine",
      action: "pm_failure_risk",
      status: availability >= 0.95 ? "ok" : "warning",
      metrics: {
        avg_mtbf_hours: Math.round(avgMTBF),
        avg_mttr_hours: Math.round(avgMTTR * 10) / 10,
        inherent_availability: Math.round(availability * 10000) / 10000,
      },
      highlights: [
        `Average MTBF: ${Math.round(avgMTBF)} hours`,
        `Average MTTR: ${Math.round(avgMTTR * 10) / 10} hours`,
        `Inherent availability: ${(availability * 100).toFixed(1)}%`,
      ],
    });
  }

  // Action items section
  if (reportDef.sections.includes("action_items") && include_recommendations) {
    sections.push({
      title: "Action Items & Recommendations",
      engine: "ReportingEngine",
      action: "rpt_generate",
      status: allRecommendations.length > 3 ? "warning" : "ok",
      metrics: {
        total_items: allRecommendations.length,
        items: allRecommendations,
      },
      highlights: allRecommendations.length > 0
        ? allRecommendations.slice(0, 3)
        : ["No immediate action items"],
    });
  }

  // Overall status
  const sectionStatuses = sections.map((s) => s.status);
  let overallStatus: "ok" | "warning" | "critical" = "ok";
  if (sectionStatuses.includes("critical")) overallStatus = "critical";
  else if (sectionStatuses.includes("warning")) overallStatus = "warning";

  return {
    report_type,
    title: reportDef.title,
    generated_at: new Date().toISOString(),
    time_range,
    machine_count: machine_ids.length,
    overall_status: overallStatus,
    total_sections: sections.length,
    sections,
    recommendations: include_recommendations ? allRecommendations : undefined,
  };
}

// ---------------------------------------------------------------------------
// rpt_summary — Quick executive summary
// ---------------------------------------------------------------------------

function generateSummary(input: SummaryInput) {
  const {
    scope = "plant",
    machine_ids = ["machine_1", "machine_2", "machine_3", "machine_4", "machine_5"],
    time_range = "last_shift",
  } = input;

  const snapshots = machine_ids.map(generateMachineSnapshot);

  const avgHealth = snapshots.reduce((s, m) => s + m.health_score, 0) / snapshots.length;
  const avgOEE = snapshots.reduce((s, m) => s + m.oee, 0) / snapshots.length;
  const avgUtil = snapshots.reduce((s, m) => s + m.utilization, 0) / snapshots.length;
  const avgWear = snapshots.reduce((s, m) => s + m.tool_wear_pct, 0) / snapshots.length;
  const avgRisk = snapshots.reduce((s, m) => s + m.failure_risk, 0) / snapshots.length;

  const critical = snapshots.filter((m) => m.health_score < 60 || m.failure_risk > 0.40);
  const warnings = snapshots.filter((m) => (m.health_score >= 60 && m.health_score < 75) || m.tool_wear_pct > 60);

  let status: string;
  if (critical.length > 0) status = "attention_required";
  else if (warnings.length > 0) status = "monitor";
  else status = "healthy";

  return {
    scope,
    time_range,
    generated_at: new Date().toISOString(),
    total_machines: snapshots.length,
    status,
    kpis: {
      avg_health_score: Math.round(avgHealth * 10) / 10,
      avg_oee: Math.round(avgOEE * 1000) / 1000,
      avg_oee_pct: `${(avgOEE * 100).toFixed(1)}%`,
      avg_utilization: Math.round(avgUtil * 1000) / 1000,
      avg_tool_wear_pct: Math.round(avgWear),
      avg_failure_risk: Math.round(avgRisk * 1000) / 1000,
    },
    alerts: {
      critical_count: critical.length,
      warning_count: warnings.length,
      critical_machines: critical.map((m) => m.machine_id),
      warning_machines: warnings.map((m) => m.machine_id),
    },
    top_3_priorities: [
      ...(critical.length > 0
        ? [`Immediate attention: ${critical[0].machine_id} (health=${critical[0].health_score}, risk=${critical[0].failure_risk})`]
        : []),
      ...(warnings.length > 0
        ? [`Monitor: ${warnings.slice(0, 2).map((m) => m.machine_id).join(", ")} — elevated wear/risk`]
        : []),
      avgOEE < 0.65 ? `Fleet OEE below target (${(avgOEE * 100).toFixed(1)}% vs 65% target)` : null,
      avgUtil < 0.60 ? `Low fleet utilization (${(avgUtil * 100).toFixed(1)}%) — load balancing opportunity` : null,
    ].filter(Boolean).slice(0, 3),
  };
}

// ---------------------------------------------------------------------------
// rpt_trend — Trend analysis
// ---------------------------------------------------------------------------

function analyzeTrend(input: TrendInput) {
  const {
    metric,
    machine_ids = ["machine_1"],
    periods,
    period_type = "day",
  } = input;

  // Baseline per metric
  const baselineMap: Record<string, number> = {
    oee: 0.72,
    utilization: 0.68,
    health_score: 0.82,
    wear_rate: 0.35,
    failure_risk: 0.15,
  };

  const baseline = baselineMap[metric] ?? 0.50;
  const noise = metric === "failure_risk" ? 0.8 : 0.5;

  const machinesTrends = machine_ids.map((mid) => {
    const hash = mid.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
    const offset = (Math.abs(hash) % 20 - 10) / 100;

    const points = Array.from({ length: periods }, (_, i) => {
      const value = generateTrendPoint(baseline + offset, i, noise);
      return {
        period: i + 1,
        value: Math.round(value * 10000) / 10000,
      };
    });

    // Linear regression for trend direction
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.period, 0);
    const sumY = points.reduce((s, p) => s + p.value, 0);
    const sumXY = points.reduce((s, p) => s + p.period * p.value, 0);
    const sumXX = points.reduce((s, p) => s + p.period * p.period, 0);
    const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
    const intercept = (sumY - slope * sumX) / n;

    const last = points[points.length - 1]?.value ?? 0;
    const first = points[0]?.value ?? 0;
    const changeAbsolute = Math.round((last - first) * 10000) / 10000;
    const changePct = first !== 0 ? Math.round((changeAbsolute / first) * 10000) / 100 : 0;

    let direction: string;
    if (Math.abs(slope) < 0.001) direction = "stable";
    else if (slope > 0) direction = metric === "failure_risk" || metric === "wear_rate" ? "degrading" : "improving";
    else direction = metric === "failure_risk" || metric === "wear_rate" ? "improving" : "degrading";

    // Forecast next 3 periods
    const forecast = Array.from({ length: 3 }, (_, i) => ({
      period: n + i + 1,
      predicted_value: Math.round(Math.max(0, Math.min(1, intercept + slope * (n + i + 1))) * 10000) / 10000,
    }));

    return {
      machine_id: mid,
      direction,
      slope: Math.round(slope * 100000) / 100000,
      change_absolute: changeAbsolute,
      change_pct: `${changePct}%`,
      current_value: last,
      data_points: points,
      forecast,
    };
  });

  // Fleet-level aggregation
  const avgCurrent = machinesTrends.reduce((s, m) => s + m.current_value, 0) / machinesTrends.length;
  const avgSlope = machinesTrends.reduce((s, m) => s + m.slope, 0) / machinesTrends.length;
  let fleetDirection: string;
  if (Math.abs(avgSlope) < 0.001) fleetDirection = "stable";
  else if (avgSlope > 0) fleetDirection = metric === "failure_risk" || metric === "wear_rate" ? "degrading" : "improving";
  else fleetDirection = metric === "failure_risk" || metric === "wear_rate" ? "improving" : "degrading";

  const degrading = machinesTrends.filter((m) => m.direction === "degrading");

  return {
    metric,
    period_type,
    total_periods: periods,
    total_machines: machine_ids.length,
    fleet_summary: {
      direction: fleetDirection,
      avg_current_value: Math.round(avgCurrent * 10000) / 10000,
      avg_slope: Math.round(avgSlope * 100000) / 100000,
      degrading_count: degrading.length,
      degrading_machines: degrading.map((m) => m.machine_id),
    },
    machines: machinesTrends,
  };
}

// ---------------------------------------------------------------------------
// rpt_export — Format report data for export
// ---------------------------------------------------------------------------

function exportReport(input: ExportInput) {
  const { report_data, format, title = "PRISM Report" } = input;

  switch (format) {
    case "json": {
      const jsonStr = JSON.stringify(report_data, null, 2);
      return {
        format: "json",
        title,
        content: jsonStr,
        size_bytes: jsonStr.length,
        mime_type: "application/json",
      };
    }

    case "csv": {
      // Flatten top-level data into CSV rows
      const rows: string[][] = [];
      const flattenObj = (obj: Record<string, unknown>, prefix = ""): Record<string, string> => {
        const result: Record<string, string> = {};
        for (const [key, val] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (val !== null && typeof val === "object" && !Array.isArray(val)) {
            Object.assign(result, flattenObj(val as Record<string, unknown>, fullKey));
          } else {
            result[fullKey] = String(val ?? "");
          }
        }
        return result;
      };

      const flat = flattenObj(report_data);
      const headers = Object.keys(flat);
      rows.push(headers);
      rows.push(headers.map((h) => flat[h]));

      const csvContent = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

      return {
        format: "csv",
        title,
        content: csvContent,
        rows: rows.length,
        columns: headers.length,
        mime_type: "text/csv",
      };
    }

    case "markdown": {
      const lines: string[] = [];
      lines.push(`# ${title}`);
      lines.push(`_Generated: ${new Date().toISOString()}_`);
      lines.push("");

      const renderSection = (obj: Record<string, unknown>, depth: number) => {
        for (const [key, val] of Object.entries(obj)) {
          if (val !== null && typeof val === "object" && !Array.isArray(val)) {
            lines.push(`${"#".repeat(Math.min(depth + 2, 6))} ${key}`);
            renderSection(val as Record<string, unknown>, depth + 1);
          } else if (Array.isArray(val)) {
            lines.push(`**${key}:**`);
            val.forEach((item) => {
              lines.push(`- ${typeof item === "object" ? JSON.stringify(item) : String(item)}`);
            });
            lines.push("");
          } else {
            lines.push(`- **${key}:** ${String(val ?? "N/A")}`);
          }
        }
      };

      renderSection(report_data, 0);
      const mdContent = lines.join("\n");

      return {
        format: "markdown",
        title,
        content: mdContent,
        size_bytes: mdContent.length,
        mime_type: "text/markdown",
      };
    }

    case "html": {
      const htmlLines: string[] = [];
      htmlLines.push(`<!DOCTYPE html><html><head><title>${title}</title>`);
      htmlLines.push("<style>body{font-family:Arial,sans-serif;margin:2em}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f5f5f5}.ok{color:green}.warning{color:orange}.critical{color:red}</style>");
      htmlLines.push(`</head><body><h1>${title}</h1>`);
      htmlLines.push(`<p><em>Generated: ${new Date().toISOString()}</em></p>`);
      htmlLines.push(`<pre>${JSON.stringify(report_data, null, 2).replace(/</g, "&lt;")}</pre>`);
      htmlLines.push("</body></html>");
      const htmlContent = htmlLines.join("\n");

      return {
        format: "html",
        title,
        content: htmlContent,
        size_bytes: htmlContent.length,
        mime_type: "text/html",
      };
    }

    default:
      return {
        format,
        error: `Unsupported format "${format}". Supported: json, csv, markdown, html`,
      };
  }
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function executeReportingAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case "rpt_generate":
      return generateReport(params as unknown as GenerateInput);
    case "rpt_summary":
      return generateSummary(params as unknown as SummaryInput);
    case "rpt_trend":
      return analyzeTrend(params as unknown as TrendInput);
    case "rpt_export":
      return exportReport(params as unknown as ExportInput);
    default:
      throw new Error(`ReportingEngine: unknown action "${action}"`);
  }
}
