/**
 * CapacityPlanningEngine — R26-MS4: Capacity Forecasting & Demand Matching
 *
 * Actions:
 *   cap_forecast — forecast capacity needs based on order pipeline and historical trends
 *   cap_demand   — match incoming demand against available capacity
 *   cap_overtime  — plan overtime and shift extensions to meet capacity gaps
 *   cap_report   — generate capacity utilization reports
 *
 * Depends on: R1 registries, R24 (workforce), R26-MS1/MS2/MS3
 */

// ─── Data Types ───────────────────────────────────────────────────────────────

interface CapacityResource {
  resource_id: string;
  resource_name: string;
  resource_type: "machine" | "work_center" | "labor";
  standard_hours_per_week: number;
  max_hours_per_week: number;      // including overtime
  current_utilization_pct: number;
  planned_maintenance_hrs: number;  // weekly
  efficiency_factor: number;        // 0-1
  cost_per_hour: number;
  overtime_multiplier: number;      // e.g. 1.5x
}

interface DemandForecast {
  period: string;              // "2025-W06", "2025-W07", etc.
  resource_id: string;
  required_hours: number;
  confidence_pct: number;      // forecast confidence
  source: "confirmed_orders" | "forecast" | "pipeline";
}

interface HistoricalCapacity {
  period: string;
  resource_id: string;
  planned_hours: number;
  actual_hours: number;
  overtime_hours: number;
  utilization_pct: number;
  output_units: number;
}

// ─── Static Data ──────────────────────────────────────────────────────────────

const CAPACITY_RESOURCES: CapacityResource[] = [
  { resource_id: "CAP-MILL", resource_name: "CNC Milling Center", resource_type: "work_center", standard_hours_per_week: 160, max_hours_per_week: 200, current_utilization_pct: 75, planned_maintenance_hrs: 8, efficiency_factor: 0.83, cost_per_hour: 95, overtime_multiplier: 1.5 },
  { resource_id: "CAP-MILL5", resource_name: "5-Axis Milling", resource_type: "machine", standard_hours_per_week: 80, max_hours_per_week: 100, current_utilization_pct: 40, planned_maintenance_hrs: 4, efficiency_factor: 0.80, cost_per_hour: 165, overtime_multiplier: 1.5 },
  { resource_id: "CAP-TURN", resource_name: "CNC Turning Center", resource_type: "work_center", standard_hours_per_week: 160, max_hours_per_week: 200, current_utilization_pct: 72, planned_maintenance_hrs: 6, efficiency_factor: 0.86, cost_per_hour: 78, overtime_multiplier: 1.5 },
  { resource_id: "CAP-SWISS", resource_name: "Swiss Turning", resource_type: "machine", standard_hours_per_week: 100, max_hours_per_week: 120, current_utilization_pct: 30, planned_maintenance_hrs: 4, efficiency_factor: 0.90, cost_per_hour: 95, overtime_multiplier: 1.5 },
  { resource_id: "CAP-GRIND", resource_name: "Precision Grinding", resource_type: "machine", standard_hours_per_week: 80, max_hours_per_week: 96, current_utilization_pct: 25, planned_maintenance_hrs: 4, efficiency_factor: 0.78, cost_per_hour: 120, overtime_multiplier: 1.5 },
  { resource_id: "CAP-INSP", resource_name: "Inspection/CMM", resource_type: "work_center", standard_hours_per_week: 40, max_hours_per_week: 50, current_utilization_pct: 85, planned_maintenance_hrs: 2, efficiency_factor: 0.95, cost_per_hour: 60, overtime_multiplier: 1.5 },
  { resource_id: "CAP-OPS", resource_name: "Machine Operators", resource_type: "labor", standard_hours_per_week: 400, max_hours_per_week: 480, current_utilization_pct: 68, planned_maintenance_hrs: 0, efficiency_factor: 0.85, cost_per_hour: 45, overtime_multiplier: 1.5 },
  { resource_id: "CAP-INSP-OPS", resource_name: "Inspection Operators", resource_type: "labor", standard_hours_per_week: 80, max_hours_per_week: 100, current_utilization_pct: 82, planned_maintenance_hrs: 0, efficiency_factor: 0.90, cost_per_hour: 50, overtime_multiplier: 1.5 },
];

const DEMAND_FORECASTS: DemandForecast[] = [
  // Week 6 (current)
  { period: "2025-W06", resource_id: "CAP-MILL", required_hours: 130, confidence_pct: 95, source: "confirmed_orders" },
  { period: "2025-W06", resource_id: "CAP-TURN", required_hours: 120, confidence_pct: 95, source: "confirmed_orders" },
  { period: "2025-W06", resource_id: "CAP-INSP", required_hours: 38, confidence_pct: 95, source: "confirmed_orders" },
  { period: "2025-W06", resource_id: "CAP-SWISS", required_hours: 30, confidence_pct: 95, source: "confirmed_orders" },
  { period: "2025-W06", resource_id: "CAP-GRIND", required_hours: 20, confidence_pct: 95, source: "confirmed_orders" },
  { period: "2025-W06", resource_id: "CAP-OPS", required_hours: 290, confidence_pct: 95, source: "confirmed_orders" },
  { period: "2025-W06", resource_id: "CAP-INSP-OPS", required_hours: 68, confidence_pct: 95, source: "confirmed_orders" },
  // Week 7
  { period: "2025-W07", resource_id: "CAP-MILL", required_hours: 145, confidence_pct: 85, source: "confirmed_orders" },
  { period: "2025-W07", resource_id: "CAP-TURN", required_hours: 140, confidence_pct: 85, source: "confirmed_orders" },
  { period: "2025-W07", resource_id: "CAP-MILL5", required_hours: 55, confidence_pct: 85, source: "confirmed_orders" },
  { period: "2025-W07", resource_id: "CAP-INSP", required_hours: 42, confidence_pct: 85, source: "confirmed_orders" },
  { period: "2025-W07", resource_id: "CAP-OPS", required_hours: 320, confidence_pct: 85, source: "confirmed_orders" },
  { period: "2025-W07", resource_id: "CAP-INSP-OPS", required_hours: 72, confidence_pct: 85, source: "confirmed_orders" },
  // Week 8 (pipeline)
  { period: "2025-W08", resource_id: "CAP-MILL", required_hours: 155, confidence_pct: 70, source: "pipeline" },
  { period: "2025-W08", resource_id: "CAP-TURN", required_hours: 110, confidence_pct: 70, source: "pipeline" },
  { period: "2025-W08", resource_id: "CAP-MILL5", required_hours: 60, confidence_pct: 70, source: "pipeline" },
  { period: "2025-W08", resource_id: "CAP-GRIND", required_hours: 35, confidence_pct: 70, source: "pipeline" },
  { period: "2025-W08", resource_id: "CAP-INSP", required_hours: 45, confidence_pct: 70, source: "pipeline" },
  { period: "2025-W08", resource_id: "CAP-OPS", required_hours: 340, confidence_pct: 70, source: "pipeline" },
  // Week 9 (forecast)
  { period: "2025-W09", resource_id: "CAP-MILL", required_hours: 135, confidence_pct: 55, source: "forecast" },
  { period: "2025-W09", resource_id: "CAP-TURN", required_hours: 125, confidence_pct: 55, source: "forecast" },
  { period: "2025-W09", resource_id: "CAP-OPS", required_hours: 310, confidence_pct: 55, source: "forecast" },
];

const HISTORICAL_CAPACITY: HistoricalCapacity[] = [
  { period: "2025-W03", resource_id: "CAP-MILL", planned_hours: 160, actual_hours: 148, overtime_hours: 12, utilization_pct: 80, output_units: 320 },
  { period: "2025-W04", resource_id: "CAP-MILL", planned_hours: 160, actual_hours: 155, overtime_hours: 20, utilization_pct: 85, output_units: 345 },
  { period: "2025-W05", resource_id: "CAP-MILL", planned_hours: 160, actual_hours: 142, overtime_hours: 8, utilization_pct: 78, output_units: 310 },
  { period: "2025-W03", resource_id: "CAP-TURN", planned_hours: 160, actual_hours: 138, overtime_hours: 10, utilization_pct: 75, output_units: 280 },
  { period: "2025-W04", resource_id: "CAP-TURN", planned_hours: 160, actual_hours: 145, overtime_hours: 15, utilization_pct: 78, output_units: 295 },
  { period: "2025-W05", resource_id: "CAP-TURN", planned_hours: 160, actual_hours: 135, overtime_hours: 5, utilization_pct: 72, output_units: 270 },
  { period: "2025-W03", resource_id: "CAP-INSP", planned_hours: 40, actual_hours: 36, overtime_hours: 4, utilization_pct: 82, output_units: 450 },
  { period: "2025-W04", resource_id: "CAP-INSP", planned_hours: 40, actual_hours: 38, overtime_hours: 6, utilization_pct: 88, output_units: 480 },
  { period: "2025-W05", resource_id: "CAP-INSP", planned_hours: 40, actual_hours: 35, overtime_hours: 3, utilization_pct: 80, output_units: 420 },
];

// ─── Action Handlers ──────────────────────────────────────────────────────────

function handleCapForecast(params: Record<string, unknown>): unknown {
  const resourceId = params.resource_id as string | undefined;
  const weeks = (params.weeks_ahead as number) || 4;

  const resources = resourceId
    ? CAPACITY_RESOURCES.filter(r => r.resource_id === resourceId)
    : CAPACITY_RESOURCES;

  const forecasts = resources.map(resource => {
    const demands = DEMAND_FORECASTS.filter(d => d.resource_id === resource.resource_id);
    const history = HISTORICAL_CAPACITY.filter(h => h.resource_id === resource.resource_id);

    const effectiveCapacity = (resource.standard_hours_per_week - resource.planned_maintenance_hrs) * resource.efficiency_factor;
    const maxCapacity = (resource.max_hours_per_week - resource.planned_maintenance_hrs) * resource.efficiency_factor;

    // Historical trend
    const avgHistoricalUtil = history.length > 0
      ? Math.round(history.reduce((s, h) => s + h.utilization_pct, 0) / history.length)
      : resource.current_utilization_pct;
    const trend = history.length >= 2
      ? (history[history.length - 1].utilization_pct > history[0].utilization_pct ? "increasing" : "decreasing")
      : "stable";

    const weeklyForecasts = demands.map(d => {
      const utilizationPct = effectiveCapacity > 0 ? Math.round(d.required_hours / effectiveCapacity * 100) : 0;
      const gap = d.required_hours - effectiveCapacity;
      const needsOvertime = gap > 0;
      const overtimeHours = needsOvertime ? Math.min(gap, maxCapacity - effectiveCapacity) : 0;
      const shortfall = gap > (maxCapacity - effectiveCapacity) ? gap - (maxCapacity - effectiveCapacity) : 0;

      return {
        period: d.period,
        required_hours: d.required_hours,
        available_hours: Math.round(effectiveCapacity * 10) / 10,
        utilization_pct: utilizationPct,
        gap_hours: Math.round(gap * 10) / 10,
        overtime_needed: Math.round(overtimeHours * 10) / 10,
        shortfall_hours: Math.round(shortfall * 10) / 10,
        confidence_pct: d.confidence_pct,
        status: shortfall > 0 ? "OVER_CAPACITY" : needsOvertime ? "OVERTIME_NEEDED" : utilizationPct > 80 ? "HIGH_LOAD" : "OK",
      };
    });

    return {
      resource_id: resource.resource_id,
      resource_name: resource.resource_name,
      resource_type: resource.resource_type,
      standard_capacity_hrs: Math.round(effectiveCapacity * 10) / 10,
      max_capacity_hrs: Math.round(maxCapacity * 10) / 10,
      historical_avg_util_pct: avgHistoricalUtil,
      trend,
      weekly_forecasts: weeklyForecasts,
    };
  });

  const overCapacity = forecasts.flatMap(f => f.weekly_forecasts).filter(w => w.status === "OVER_CAPACITY");
  const overtimeNeeded = forecasts.flatMap(f => f.weekly_forecasts).filter(w => w.status === "OVERTIME_NEEDED");

  return {
    action: "cap_forecast",
    weeks_ahead: weeks,
    total_resources: forecasts.length,
    forecasts,
    summary: {
      periods_over_capacity: overCapacity.length,
      periods_overtime_needed: overtimeNeeded.length,
      total_overtime_hrs: Math.round(forecasts.flatMap(f => f.weekly_forecasts).reduce((s, w) => s + w.overtime_needed, 0) * 10) / 10,
      total_shortfall_hrs: Math.round(overCapacity.reduce((s, w) => s + w.shortfall_hours, 0) * 10) / 10,
      most_constrained: forecasts.reduce((best, f) => {
        const maxUtil = Math.max(...f.weekly_forecasts.map(w => w.utilization_pct), 0);
        return maxUtil > (best.util || 0) ? { name: f.resource_name, util: maxUtil } : best;
      }, { name: "none", util: 0 }).name,
    },
  };
}

function handleCapDemand(params: Record<string, unknown>): unknown {
  const period = params.period as string | undefined;

  const periods = period
    ? [period]
    : [...new Set(DEMAND_FORECASTS.map(d => d.period))].sort();

  const demandMatch = periods.map(p => {
    const demands = DEMAND_FORECASTS.filter(d => d.period === p);

    const matches = demands.map(d => {
      const resource = CAPACITY_RESOURCES.find(r => r.resource_id === d.resource_id);
      if (!resource) return null;

      const effectiveCapacity = (resource.standard_hours_per_week - resource.planned_maintenance_hrs) * resource.efficiency_factor;
      const utilizationPct = effectiveCapacity > 0 ? Math.round(d.required_hours / effectiveCapacity * 100) : 0;
      const surplus = effectiveCapacity - d.required_hours;

      return {
        resource_id: d.resource_id,
        resource_name: resource.resource_name,
        required_hours: d.required_hours,
        available_hours: Math.round(effectiveCapacity * 10) / 10,
        surplus_hours: Math.round(surplus * 10) / 10,
        utilization_pct: utilizationPct,
        confidence: d.confidence_pct,
        match_status: surplus >= 0 ? "MATCHED" : "DEFICIT",
      };
    }).filter(Boolean);

    const totalRequired = matches.reduce((s, m) => s + m!.required_hours, 0);
    const totalAvailable = matches.reduce((s, m) => s + m!.available_hours, 0);
    const deficits = matches.filter(m => m!.match_status === "DEFICIT");

    return {
      period: p,
      resource_matches: matches,
      period_summary: {
        total_required_hrs: totalRequired,
        total_available_hrs: Math.round(totalAvailable * 10) / 10,
        overall_utilization_pct: totalAvailable > 0 ? Math.round(totalRequired / totalAvailable * 100) : 0,
        deficit_count: deficits.length,
        resources_matched: matches.length - deficits.length,
      },
    };
  });

  return {
    action: "cap_demand",
    total_periods: demandMatch.length,
    demand_matching: demandMatch,
    summary: {
      periods_with_deficit: demandMatch.filter(d => d.period_summary.deficit_count > 0).length,
      total_deficit_resources: demandMatch.reduce((s, d) => s + d.period_summary.deficit_count, 0),
      avg_utilization_pct: demandMatch.length > 0 ? Math.round(demandMatch.reduce((s, d) => s + d.period_summary.overall_utilization_pct, 0) / demandMatch.length) : 0,
    },
  };
}

function handleCapOvertime(params: Record<string, unknown>): unknown {
  const maxOvertimePct = (params.max_overtime_pct as number) || 25;
  const budgetLimit = (params.budget_limit as number) || 15000;

  const resources = CAPACITY_RESOURCES;
  const plans: Array<{
    resource_id: string; resource_name: string; standard_hrs: number;
    max_overtime_hrs: number; recommended_overtime_hrs: number;
    overtime_cost: number; periods_needing_overtime: string[];
  }> = [];

  for (const resource of resources) {
    const effectiveCapacity = (resource.standard_hours_per_week - resource.planned_maintenance_hrs) * resource.efficiency_factor;
    const maxOvertimeHrs = (resource.max_hours_per_week - resource.standard_hours_per_week) * resource.efficiency_factor;
    const demands = DEMAND_FORECASTS.filter(d => d.resource_id === resource.resource_id);

    let totalOvertimeNeeded = 0;
    const periodsNeeding: string[] = [];

    for (const d of demands) {
      const gap = d.required_hours - effectiveCapacity;
      if (gap > 0) {
        totalOvertimeNeeded += Math.min(gap, maxOvertimeHrs);
        periodsNeeding.push(d.period);
      }
    }

    const recommendedOT = Math.min(totalOvertimeNeeded, maxOvertimeHrs * demands.length);
    const otCost = Math.round(recommendedOT * resource.cost_per_hour * resource.overtime_multiplier);

    if (recommendedOT > 0) {
      plans.push({
        resource_id: resource.resource_id,
        resource_name: resource.resource_name,
        standard_hrs: Math.round(effectiveCapacity * 10) / 10,
        max_overtime_hrs: Math.round(maxOvertimeHrs * 10) / 10,
        recommended_overtime_hrs: Math.round(recommendedOT * 10) / 10,
        overtime_cost: otCost,
        periods_needing_overtime: periodsNeeding,
      });
    }
  }

  const totalCost = plans.reduce((s, p) => s + p.overtime_cost, 0);
  const withinBudget = totalCost <= budgetLimit;

  return {
    action: "cap_overtime",
    max_overtime_pct: maxOvertimePct,
    budget_limit: budgetLimit,
    total_resources_needing_overtime: plans.length,
    overtime_plans: plans,
    summary: {
      total_overtime_hrs: Math.round(plans.reduce((s, p) => s + p.recommended_overtime_hrs, 0) * 10) / 10,
      total_overtime_cost: totalCost,
      within_budget: withinBudget,
      budget_remaining: budgetLimit - totalCost,
      resources_needing_overtime: plans.map(p => p.resource_name),
    },
  };
}

function handleCapReport(params: Record<string, unknown>): unknown {
  const reportType = (params.report_type as string) || "weekly";

  // Gather all metrics
  const forecast = handleCapForecast({}) as { forecasts: Array<{ resource_name: string; standard_capacity_hrs: number; weekly_forecasts: Array<{ utilization_pct: number; status: string }> }>; summary: Record<string, unknown> };
  const demand = handleCapDemand({}) as { summary: Record<string, unknown> };
  const overtime = handleCapOvertime({}) as { summary: Record<string, unknown> };

  // Resource utilization summary
  const resourceUtil = CAPACITY_RESOURCES.map(r => ({
    resource: r.resource_name,
    type: r.resource_type,
    utilization_pct: r.current_utilization_pct,
    status: r.current_utilization_pct >= 90 ? "CRITICAL" : r.current_utilization_pct >= 75 ? "HIGH" : r.current_utilization_pct >= 50 ? "NORMAL" : "LOW",
  }));

  // Historical trend
  const millHistory = HISTORICAL_CAPACITY.filter(h => h.resource_id === "CAP-MILL");
  const avgOTRatio = millHistory.length > 0
    ? Math.round(millHistory.reduce((s, h) => s + h.overtime_hours / h.actual_hours * 100, 0) / millHistory.length)
    : 0;

  const kpis = {
    avg_utilization_pct: Math.round(CAPACITY_RESOURCES.reduce((s, r) => s + r.current_utilization_pct, 0) / CAPACITY_RESOURCES.length),
    resources_over_80_pct: CAPACITY_RESOURCES.filter(r => r.current_utilization_pct >= 80).length,
    resources_under_50_pct: CAPACITY_RESOURCES.filter(r => r.current_utilization_pct < 50).length,
    overtime_dependency_pct: avgOTRatio,
    forecast_periods_at_risk: forecast.summary.periods_over_capacity,
    total_forecast_overtime_hrs: overtime.summary.total_overtime_hrs,
    total_forecast_overtime_cost: overtime.summary.total_overtime_cost,
  };

  const risks: string[] = [];
  if ((kpis.resources_over_80_pct as number) > 2) risks.push(`${kpis.resources_over_80_pct} resources above 80% utilization — risk of bottleneck`);
  if ((kpis.forecast_periods_at_risk as number) > 0) risks.push(`${kpis.forecast_periods_at_risk} forecast period(s) exceed maximum capacity`);
  if (avgOTRatio > 10) risks.push(`Historical overtime ratio ${avgOTRatio}% — consider adding capacity`);
  if ((kpis.resources_under_50_pct as number) > 2) risks.push(`${kpis.resources_under_50_pct} resources below 50% — potential over-investment`);

  return {
    action: "cap_report",
    report_type: reportType,
    kpis,
    resource_utilization: resourceUtil,
    risks,
    forecast_summary: forecast.summary,
    overtime_summary: overtime.summary,
    summary: {
      health_score: Math.round(
        Math.max(0, 100 - (kpis.avg_utilization_pct > 85 ? 30 : 0) -
          ((kpis.forecast_periods_at_risk as number) * 10) - (risks.length * 5))
      ),
      risk_count: risks.length,
      top_risk: risks[0] || "No significant capacity risks",
      recommendation: risks.length === 0 ? "Capacity levels healthy — maintain current plan"
        : risks.length <= 2 ? "Monitor flagged resources closely this week"
        : "Schedule capacity planning review — multiple constraints identified",
    },
  };
}

// ─── Public Dispatcher ────────────────────────────────────────────────────────

export function executeCapacityPlanningAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "cap_forecast": return handleCapForecast(params);
    case "cap_demand":   return handleCapDemand(params);
    case "cap_overtime":  return handleCapOvertime(params);
    case "cap_report":   return handleCapReport(params);
    default:
      throw new Error(`CapacityPlanningEngine: unknown action "${action}"`);
  }
}
