/**
 * ActualCostEngine — Roll up actual costs (labor + material + tooling + machine + overhead)
 * vs estimates. Provides variance analysis, job profitability, and cost center tracking.
 * Bridges TimeClockEngine, ToolUsageEngine, and JobCostingEngine data.
 */

import { timeClockEngine } from "./TimeClockEngine.js";
import { toolUsageEngine } from "./ToolUsageEngine.js";
import { resolveMaterial } from "../physics/constants.js";

export interface ActualCostRecord {
  job_id: string;
  recorded_at: string;
  labor: { hours: number; cost: number; by_employee: { employee_id: string; name: string; hours: number; cost: number }[] };
  material: { cost: number; scrap_cost: number; scrap_pct: number };
  tooling: { cost: number; tools_used: number; broken: number };
  machine: { hours: number; cost: number; rate_per_hour: number };
  overhead: { cost: number; rate_pct: number };
  total_cost: number;
}

export interface CostVariance {
  job_id: string;
  category: string;
  estimated: number;
  actual: number;
  variance: number;
  variance_pct: number;
  status: "under" | "on_budget" | "over";
}

export interface JobProfitability {
  job_id: string;
  revenue: number; // from invoice
  estimated_cost: number;
  actual_cost: number;
  estimated_margin: number;
  actual_margin: number;
  estimated_margin_pct: number;
  actual_margin_pct: number;
  cost_variance: number;
  variance_pct: number;
  categories: CostVariance[];
  status: "profitable" | "break_even" | "loss";
}

export interface CostCenterSummary {
  cost_center: string;
  period: string;
  jobs: number;
  labor_cost: number;
  material_cost: number;
  tooling_cost: number;
  machine_cost: number;
  overhead_cost: number;
  total_cost: number;
  revenue: number;
  profit: number;
  margin_pct: number;
}

export interface ActualCostInput {
  job_id: string;
  material_cost?: number;
  scrap_cost?: number;
  machine_hours?: number;
  machine_rate_per_hour?: number;
  overhead_rate_pct?: number;
}

class ActualCostEngine {
  private materialCosts: Map<string, { cost: number; scrap_cost: number }> = new Map();
  private machineCosts: Map<string, { hours: number; rate: number }> = new Map();
  private overheadRates: Map<string, number> = new Map();
  private estimates: Map<string, Record<string, number>> = new Map();
  private revenues: Map<string, number> = new Map();
  // U-BIZREG1: Track material type per job for registry-based validation
  private materialTypes: Map<string, string> = new Map();

  /** Record material cost for a job. */
  recordMaterialCost(jobId: string, cost: number, scrapCost: number = 0, materialType?: string): void {
    this.materialCosts.set(jobId, { cost, scrap_cost: scrapCost });
    if (materialType) this.materialTypes.set(jobId, materialType);
  }

  /** Record machine time for a job. */
  recordMachineTime(jobId: string, hours: number, ratePerHour: number = 85): void {
    this.machineCosts.set(jobId, { hours, rate: ratePerHour });
  }

  /** Set overhead rate for a job. */
  setOverheadRate(jobId: string, ratePct: number): void {
    this.overheadRates.set(jobId, ratePct);
  }

  /** Record estimated costs for variance comparison. */
  recordEstimate(jobId: string, estimates: Record<string, number>): void {
    this.estimates.set(jobId, estimates);
  }

  /** Record revenue (from invoice) for profitability. */
  recordRevenue(jobId: string, revenue: number): void {
    this.revenues.set(jobId, revenue);
  }

  /** Calculate full actual cost for a job. */
  calculate(input: ActualCostInput): ActualCostRecord {
    const jobId = input.job_id;

    // Labor from TimeClockEngine
    const laborData = timeClockEngine.jobLaborCost(jobId);

    // Tooling from ToolUsageEngine
    const toolData = toolUsageEngine.jobToolCost(jobId);

    // Material (recorded or from input)
    const mat = this.materialCosts.get(jobId) ?? {
      cost: input.material_cost ?? 0,
      scrap_cost: input.scrap_cost ?? 0,
    };
    if (input.material_cost != null) mat.cost = input.material_cost;
    if (input.scrap_cost != null) mat.scrap_cost = input.scrap_cost;

    // Machine
    const machData = this.machineCosts.get(jobId) ?? {
      hours: input.machine_hours ?? 0,
      rate: input.machine_rate_per_hour ?? 85,
    };
    if (input.machine_hours != null) machData.hours = input.machine_hours;
    if (input.machine_rate_per_hour != null) machData.rate = input.machine_rate_per_hour;
    const machineCost = machData.hours * machData.rate;

    // Overhead
    const overheadPct = this.overheadRates.get(jobId) ?? input.overhead_rate_pct ?? 15;
    const directCost = laborData.total_cost + mat.cost + toolData.total_tool_cost + machineCost;
    const overheadCost = directCost * overheadPct / 100;

    const totalCost = directCost + overheadCost;
    const scrapPct = mat.cost > 0 ? (mat.scrap_cost / mat.cost) * 100 : 0;

    return {
      job_id: jobId,
      recorded_at: new Date().toISOString(),
      labor: {
        hours: laborData.total_hours,
        cost: round2(laborData.total_cost),
        by_employee: laborData.by_employee,
      },
      material: {
        cost: round2(mat.cost),
        scrap_cost: round2(mat.scrap_cost),
        scrap_pct: round2(scrapPct),
      },
      tooling: {
        cost: round2(toolData.total_tool_cost),
        tools_used: toolData.tools_used.length,
        broken: toolData.broken_tools,
      },
      machine: {
        hours: round2(machData.hours),
        cost: round2(machineCost),
        rate_per_hour: machData.rate,
      },
      overhead: {
        cost: round2(overheadCost),
        rate_pct: overheadPct,
      },
      total_cost: round2(totalCost),
    };
  }

  /** Variance analysis: estimated vs actual per category. */
  varianceAnalysis(jobId: string): CostVariance[] {
    const actual = this.calculate({ job_id: jobId });
    const est = this.estimates.get(jobId) ?? {};

    const categories: { name: string; est: number; act: number }[] = [
      { name: "labor", est: est.labor ?? 0, act: actual.labor.cost },
      { name: "material", est: est.material ?? 0, act: actual.material.cost },
      { name: "tooling", est: est.tooling ?? 0, act: actual.tooling.cost },
      { name: "machine", est: est.machine ?? 0, act: actual.machine.cost },
      { name: "overhead", est: est.overhead ?? 0, act: actual.overhead.cost },
      { name: "total", est: Object.values(est).reduce((s, v) => s + v, 0), act: actual.total_cost },
    ];

    return categories.map((c) => {
      const variance = c.act - c.est;
      const variancePct = c.est > 0 ? (variance / c.est) * 100 : 0;
      return {
        job_id: jobId,
        category: c.name,
        estimated: round2(c.est),
        actual: round2(c.act),
        variance: round2(variance),
        variance_pct: round2(variancePct),
        status: Math.abs(variancePct) <= 5 ? "on_budget" : variance > 0 ? "over" : "under",
      };
    });
  }

  /** Job profitability analysis. */
  profitability(jobId: string): JobProfitability {
    const actual = this.calculate({ job_id: jobId });
    const est = this.estimates.get(jobId) ?? {};
    const revenue = this.revenues.get(jobId) ?? 0;

    const estimatedCost = Object.values(est).reduce((s, v) => s + v, 0);
    const estimatedMargin = revenue - estimatedCost;
    const actualMargin = revenue - actual.total_cost;
    const costVariance = actual.total_cost - estimatedCost;

    const categories = this.varianceAnalysis(jobId);

    return {
      job_id: jobId,
      revenue: round2(revenue),
      estimated_cost: round2(estimatedCost),
      actual_cost: round2(actual.total_cost),
      estimated_margin: round2(estimatedMargin),
      actual_margin: round2(actualMargin),
      estimated_margin_pct: revenue > 0 ? round2((estimatedMargin / revenue) * 100) : 0,
      actual_margin_pct: revenue > 0 ? round2((actualMargin / revenue) * 100) : 0,
      cost_variance: round2(costVariance),
      variance_pct: estimatedCost > 0 ? round2((costVariance / estimatedCost) * 100) : 0,
      categories,
      status: actualMargin > 0 ? "profitable" : actualMargin === 0 ? "break_even" : "loss",
    };
  }

  /** Forecast to complete — predict final cost if job continues at current rate. */
  forecastToComplete(jobId: string, pctComplete: number): {
    job_id: string;
    pct_complete: number;
    actual_to_date: number;
    forecast_remaining: number;
    forecast_total: number;
    estimated_total: number;
    forecast_variance: number;
    forecast_status: string;
  } {
    const actual = this.calculate({ job_id: jobId });
    const est = this.estimates.get(jobId) ?? {};
    const estimatedTotal = Object.values(est).reduce((s, v) => s + v, 0);
    const pct = Math.max(Math.min(pctComplete, 100), 1) / 100;

    const forecastTotal = actual.total_cost / pct;
    const forecastRemaining = forecastTotal - actual.total_cost;
    const forecastVariance = forecastTotal - estimatedTotal;

    return {
      job_id: jobId,
      pct_complete: pctComplete,
      actual_to_date: round2(actual.total_cost),
      forecast_remaining: round2(forecastRemaining),
      forecast_total: round2(forecastTotal),
      estimated_total: round2(estimatedTotal),
      forecast_variance: round2(forecastVariance),
      forecast_status: forecastVariance > estimatedTotal * 0.15 ? 'CRITICAL — over 15% projected overrun' :
        forecastVariance > estimatedTotal * 0.05 ? 'WARNING — over 5% projected overrun' :
        forecastVariance < -estimatedTotal * 0.10 ? 'UNDER — running below estimate' : 'ON TRACK',
    };
  }

  /** Margin erosion alerts across all tracked jobs. */
  marginAlerts(threshold_pct: number = 10): {
    alerts: { job_id: string; estimated_margin_pct: number; actual_margin_pct: number; erosion_pct: number; severity: string }[];
    jobs_at_risk: number;
    total_margin_erosion: number;
  } {
    const alerts: { job_id: string; estimated_margin_pct: number; actual_margin_pct: number; erosion_pct: number; severity: string }[] = [];

    for (const [jobId] of this.estimates) {
      const revenue = this.revenues.get(jobId);
      if (revenue == null || revenue === 0) continue;

      const prof = this.profitability(jobId);
      const erosion = prof.estimated_margin_pct - prof.actual_margin_pct;

      if (erosion > threshold_pct) {
        alerts.push({
          job_id: jobId,
          estimated_margin_pct: prof.estimated_margin_pct,
          actual_margin_pct: prof.actual_margin_pct,
          erosion_pct: round2(erosion),
          severity: prof.actual_margin_pct < 0 ? 'CRITICAL' : erosion > 20 ? 'HIGH' : 'MEDIUM',
        });
      }
    }

    return {
      alerts: alerts.sort((a, b) => b.erosion_pct - a.erosion_pct),
      jobs_at_risk: alerts.length,
      total_margin_erosion: round2(alerts.reduce((s, a) => s + a.erosion_pct, 0)),
    };
  }

  /** Cost trend — compare costs across multiple jobs. */
  costTrend(jobIds: string[]): {
    jobs: { job_id: string; total: number; labor_pct: number; material_pct: number; tooling_pct: number; margin_pct: number }[];
    avg_cost: number;
    avg_margin: number;
    cost_trend: 'increasing' | 'stable' | 'decreasing';
  } {
    const jobs = jobIds.map((id) => {
      const actual = this.calculate({ job_id: id });
      const revenue = this.revenues.get(id) ?? 0;
      const margin = revenue > 0 ? ((revenue - actual.total_cost) / revenue) * 100 : 0;
      return {
        job_id: id,
        total: round2(actual.total_cost),
        labor_pct: actual.total_cost > 0 ? round2((actual.labor.cost / actual.total_cost) * 100) : 0,
        material_pct: actual.total_cost > 0 ? round2((actual.material.cost / actual.total_cost) * 100) : 0,
        tooling_pct: actual.total_cost > 0 ? round2((actual.tooling.cost / actual.total_cost) * 100) : 0,
        margin_pct: round2(margin),
      };
    });

    const avgCost = jobs.length > 0 ? jobs.reduce((s, j) => s + j.total, 0) / jobs.length : 0;
    const avgMargin = jobs.length > 0 ? jobs.reduce((s, j) => s + j.margin_pct, 0) / jobs.length : 0;

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (jobs.length >= 3) {
      const firstHalf = jobs.slice(0, Math.floor(jobs.length / 2));
      const secondHalf = jobs.slice(Math.floor(jobs.length / 2));
      const firstAvg = firstHalf.reduce((s, j) => s + j.total, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, j) => s + j.total, 0) / secondHalf.length;
      const change = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
      trend = change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable';
    }

    return { jobs, avg_cost: round2(avgCost), avg_margin: round2(avgMargin), cost_trend: trend };
  }

  /**
   * U-BIZREG1: Validate actual material cost against MaterialRegistry baseline.
   * Flags significant deviations that might indicate pricing errors or supplier premium.
   */
  materialCostValidation(jobId: string, weightKg: number): {
    job_id: string;
    actual_cost: number;
    registry_baseline_cost: number | null;
    deviation_pct: number | null;
    material_type: string | null;
    flag: "ok" | "above_baseline" | "below_baseline" | "no_data";
  } {
    const mat = this.materialCosts.get(jobId);
    const materialType = this.materialTypes.get(jobId);
    if (!mat || !materialType || weightKg <= 0) {
      return { job_id: jobId, actual_cost: mat?.cost ?? 0, registry_baseline_cost: null, deviation_pct: null, material_type: materialType ?? null, flag: "no_data" };
    }

    // Try MarketMaterialPricingEngine for baseline
    let baselineCostKg: number | null = null;
    try {
      const mod = require("./MarketMaterialPricingEngine.js");
      const result = mod.marketMaterialPricingEngine.lookup({ material: materialType });
      baselineCostKg = result.final_price_kg;
    } catch { /* pricing engine unavailable */ }

    if (baselineCostKg == null) {
      // Fallback: use resolveMaterial for density validation only
      return { job_id: jobId, actual_cost: mat.cost, registry_baseline_cost: null, deviation_pct: null, material_type: materialType, flag: "no_data" };
    }

    const baselineCost = round2(baselineCostKg * weightKg);
    const deviation = mat.cost > 0 ? ((mat.cost - baselineCost) / baselineCost) * 100 : 0;

    return {
      job_id: jobId,
      actual_cost: round2(mat.cost),
      registry_baseline_cost: baselineCost,
      deviation_pct: round2(deviation),
      material_type: materialType,
      flag: Math.abs(deviation) <= 15 ? "ok" : deviation > 0 ? "above_baseline" : "below_baseline",
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const actualCostEngine = new ActualCostEngine();
export { ActualCostEngine };
