/**
 * ActualCostEngine — Roll up actual costs (labor + material + tooling + machine + overhead)
 * vs estimates. Provides variance analysis, job profitability, and cost center tracking.
 * Bridges TimeClockEngine, ToolUsageEngine, and JobCostingEngine data.
 */

import { timeClockEngine } from "./TimeClockEngine.js";
import { toolUsageEngine } from "./ToolUsageEngine.js";

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

  /** Record material cost for a job. */
  recordMaterialCost(jobId: string, cost: number, scrapCost: number = 0): void {
    this.materialCosts.set(jobId, { cost, scrap_cost: scrapCost });
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
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const actualCostEngine = new ActualCostEngine();
export { ActualCostEngine };
