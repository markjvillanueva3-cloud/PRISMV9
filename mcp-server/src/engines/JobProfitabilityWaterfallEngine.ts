/**
 * PRISM MCP Server — Job Profitability Waterfall Engine
 *
 * Per-job profit waterfall decomposition, multi-job comparison,
 * and sensitivity / what-if analysis for shop floor decision support.
 *
 * @module JobProfitabilityWaterfallEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface JobInput {
  revenue: number;
  material_cost: number;
  tool_cost: number;
  labor_hours: number;
  labor_rate_per_hour: number;
  machine_hours: number;
  machine_rate_per_hour: number;
  setup_time_hours: number;
  scrap_count: number;
  scrap_cost_per_unit: number;
  rework_count?: number;
  rework_cost_per_unit?: number;
  overhead_pct?: number;
  secondary_ops_cost?: number;
}

/**
 * Alternative input for pipeline use when dollar amounts are already computed
 * (e.g., from ActualCostEngine). Avoids needing hours/rates decomposition.
 */
export interface JobAmountInput {
  revenue: number;
  material: number;
  tooling: number;
  labor: number;
  machine: number;
  setup: number;
  scrap?: number;
  rework?: number;
  overhead?: number;
  secondary_ops?: number;
}

export interface WaterfallStep {
  category: string;
  amount: number;
  cumulative: number;
  pct_of_revenue: number;
}

export interface CostBreakdown {
  material: number;
  tooling: number;
  labor: number;
  machine: number;
  setup: number;
  scrap: number;
  rework: number;
  overhead: number;
  secondary_ops: number;
  total: number;
}

export interface JobAnalysisResult {
  revenue: number;
  costs: CostBreakdown;
  profit: number;
  margin_pct: number;
  waterfall: WaterfallStep[];
  top_cost_driver: string;
  recommendations: string[];
}

export interface JobComparisonInput {
  jobs: Array<{ name: string } & JobInput>;
}

export interface JobComparisonResult {
  per_job: Array<{ name: string; revenue: number; profit: number; margin_pct: number; top_cost_driver: string }>;
  best_performer: { name: string; margin_pct: number };
  worst_performer: { name: string; margin_pct: number };
  common_cost_drivers: string[];
  aggregate: { total_revenue: number; total_profit: number; avg_margin_pct: number };
}

export interface SensitivityScenario {
  name: string;
  changes: Partial<JobInput>;
}

export interface SensitivityResult {
  baseline: { profit: number; margin_pct: number };
  scenarios: Array<{
    name: string;
    profit: number;
    margin_pct: number;
    profit_delta: number;
    margin_delta_pct: number;
  }>;
  breakeven_points: Array<{ parameter: string; breakeven_value: number; current_value: number; headroom_pct: number }>;
}

// ============================================================================
// HELPERS
// ============================================================================

function computeCosts(input: JobInput): CostBreakdown {
  const material = input.material_cost;
  const tooling = input.tool_cost;
  const labor = input.labor_hours * input.labor_rate_per_hour;
  const machine = input.machine_hours * input.machine_rate_per_hour;
  const setup = input.setup_time_hours * input.labor_rate_per_hour;
  const scrap = input.scrap_count * input.scrap_cost_per_unit;
  const rework = (input.rework_count ?? 0) * (input.rework_cost_per_unit ?? 0);
  const secondary_ops = input.secondary_ops_cost ?? 0;

  const subtotal = material + tooling + labor + machine + setup + scrap + rework + secondary_ops;
  const overhead_pct = input.overhead_pct ?? 0;
  const overhead = subtotal * (overhead_pct / 100);
  const total = subtotal + overhead;

  return { material, tooling, labor, machine, setup, scrap, rework, overhead, secondary_ops, total };
}

function buildWaterfall(revenue: number, costs: CostBreakdown): WaterfallStep[] {
  const categories: Array<{ category: string; amount: number }> = [
    { category: "Revenue", amount: revenue },
    { category: "Material", amount: -costs.material },
    { category: "Tooling", amount: -costs.tooling },
    { category: "Labor", amount: -costs.labor },
    { category: "Machine", amount: -costs.machine },
    { category: "Setup", amount: -costs.setup },
    { category: "Scrap", amount: -costs.scrap },
    { category: "Rework", amount: -costs.rework },
    { category: "Overhead", amount: -costs.overhead },
    { category: "Secondary Ops", amount: -costs.secondary_ops },
  ];

  const steps: WaterfallStep[] = [];
  let cumulative = 0;
  for (const c of categories) {
    if (c.category === "Revenue" || c.amount !== 0) {
      cumulative += c.amount;
      steps.push({
        category: c.category,
        amount: c.amount,
        cumulative: round2(cumulative),
        pct_of_revenue: revenue > 0 ? round2((Math.abs(c.amount) / revenue) * 100) : 0,
      });
    }
  }

  // Final profit step
  steps.push({
    category: "Profit",
    amount: round2(revenue - costs.total),
    cumulative: round2(revenue - costs.total),
    pct_of_revenue: revenue > 0 ? round2(((revenue - costs.total) / revenue) * 100) : 0,
  });

  return steps;
}

function findTopCostDriver(costs: CostBreakdown): string {
  const entries: Array<[string, number]> = [
    ["material", costs.material],
    ["tooling", costs.tooling],
    ["labor", costs.labor],
    ["machine", costs.machine],
    ["setup", costs.setup],
    ["scrap", costs.scrap],
    ["rework", costs.rework],
    ["overhead", costs.overhead],
    ["secondary_ops", costs.secondary_ops],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function generateRecommendations(costs: CostBreakdown, revenue: number, input: JobInput): string[] {
  const recs: string[] = [];
  const margin = revenue > 0 ? ((revenue - costs.total) / revenue) * 100 : 0;

  if (margin < 0) {
    recs.push("Job is operating at a loss — review pricing or reduce costs immediately.");
  } else if (margin < 10) {
    recs.push("Thin margin (<10%) — consider renegotiating price or optimizing processes.");
  }

  if (costs.scrap > 0 && costs.scrap / costs.total > 0.05) {
    recs.push(`Scrap cost is ${round2((costs.scrap / costs.total) * 100)}% of total — investigate root causes.`);
  }

  if (costs.rework > 0 && costs.rework / costs.total > 0.03) {
    recs.push(`Rework cost is ${round2((costs.rework / costs.total) * 100)}% of total — review quality processes.`);
  }

  if (costs.setup > 0 && costs.setup / costs.total > 0.15) {
    recs.push(`Setup cost is ${round2((costs.setup / costs.total) * 100)}% of total — consider fixture improvements or batching.`);
  }

  if (costs.material / costs.total > 0.5) {
    recs.push("Material is >50% of cost — evaluate alternative materials or supplier negotiations.");
  }

  if (costs.tooling / costs.total > 0.2) {
    recs.push("Tooling cost is high (>20%) — review tool life optimization and regrind programs.");
  }

  if (input.machine_hours > input.labor_hours * 2) {
    recs.push("Machine hours significantly exceed labor — check for unattended machining opportunities.");
  }

  if (costs.overhead > 0 && costs.overhead / costs.total > 0.2) {
    recs.push("Overhead allocation is >20% — review overhead rate methodology.");
  }

  if (recs.length === 0) {
    recs.push("Healthy margin — maintain current cost structure.");
  }

  return recs;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ============================================================================
// ENGINE
// ============================================================================

export class JobProfitabilityWaterfallEngine {
  /**
   * Per-job profit waterfall decomposition.
   */
  analyzeJob(input: JobInput): JobAnalysisResult {
    const revenue = input.revenue;
    const costs = computeCosts(input);
    const profit = round2(revenue - costs.total);
    const margin_pct = revenue > 0 ? round2((profit / revenue) * 100) : 0;
    const waterfall = buildWaterfall(revenue, costs);
    const top_cost_driver = findTopCostDriver(costs);
    const recommendations = generateRecommendations(costs, revenue, input);

    return {
      revenue,
      costs: {
        material: round2(costs.material),
        tooling: round2(costs.tooling),
        labor: round2(costs.labor),
        machine: round2(costs.machine),
        setup: round2(costs.setup),
        scrap: round2(costs.scrap),
        rework: round2(costs.rework),
        overhead: round2(costs.overhead),
        secondary_ops: round2(costs.secondary_ops),
        total: round2(costs.total),
      },
      profit,
      margin_pct,
      waterfall,
      top_cost_driver,
      recommendations,
    };
  }

  /**
   * Compare profitability across multiple jobs.
   */
  compareJobs(input: JobComparisonInput): JobComparisonResult {
    const perJob = input.jobs.map((j) => {
      const result = this.analyzeJob(j);
      return {
        name: j.name,
        revenue: result.revenue,
        profit: result.profit,
        margin_pct: result.margin_pct,
        top_cost_driver: result.top_cost_driver,
      };
    });

    const sorted = [...perJob].sort((a, b) => b.margin_pct - a.margin_pct);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    // Find common cost drivers (appear in >50% of jobs)
    const driverCounts: Record<string, number> = {};
    for (const j of perJob) {
      driverCounts[j.top_cost_driver] = (driverCounts[j.top_cost_driver] ?? 0) + 1;
    }
    const threshold = perJob.length / 2;
    const common_cost_drivers = Object.entries(driverCounts)
      .filter(([, count]) => count >= threshold)
      .map(([driver]) => driver);

    const totalRevenue = perJob.reduce((s, j) => s + j.revenue, 0);
    const totalProfit = perJob.reduce((s, j) => s + j.profit, 0);

    return {
      per_job: perJob,
      best_performer: { name: best.name, margin_pct: best.margin_pct },
      worst_performer: { name: worst.name, margin_pct: worst.margin_pct },
      common_cost_drivers,
      aggregate: {
        total_revenue: round2(totalRevenue),
        total_profit: round2(totalProfit),
        avg_margin_pct: totalRevenue > 0 ? round2((totalProfit / totalRevenue) * 100) : 0,
      },
    };
  }

  /**
   * Per-job profit waterfall from pre-computed dollar amounts.
   * Use when actual costs are already calculated (e.g., from ActualCostEngine).
   * Falls through to the same waterfall/recommendation logic as analyzeJob.
   *
   * @param input - Pre-computed dollar amounts for each cost category
   * @returns Same JobAnalysisResult as analyzeJob
   */
  analyzeFromAmounts(input: JobAmountInput): JobAnalysisResult {
    const revenue = input.revenue;
    const costs: CostBreakdown = {
      material: input.material,
      tooling: input.tooling,
      labor: input.labor,
      machine: input.machine,
      setup: input.setup,
      scrap: input.scrap ?? 0,
      rework: input.rework ?? 0,
      overhead: input.overhead ?? 0,
      secondary_ops: input.secondary_ops ?? 0,
      total: 0,
    };
    costs.total = costs.material + costs.tooling + costs.labor + costs.machine
      + costs.setup + costs.scrap + costs.rework + costs.overhead + costs.secondary_ops;

    const profit = round2(revenue - costs.total);
    const margin_pct = revenue > 0 ? round2((profit / revenue) * 100) : 0;
    const waterfall = buildWaterfall(revenue, costs);
    const top_cost_driver = findTopCostDriver(costs);

    // Build a synthetic JobInput for recommendation generation
    const syntheticInput: JobInput = {
      revenue,
      material_cost: costs.material,
      tool_cost: costs.tooling,
      labor_hours: 1,
      labor_rate_per_hour: costs.labor,
      machine_hours: 1,
      machine_rate_per_hour: costs.machine,
      setup_time_hours: costs.setup > 0 ? 1 : 0,
      scrap_count: costs.scrap > 0 ? 1 : 0,
      scrap_cost_per_unit: costs.scrap,
      overhead_pct: costs.total > 0 ? (costs.overhead / (costs.total - costs.overhead)) * 100 : 0,
      secondary_ops_cost: costs.secondary_ops,
    };
    const recommendations = generateRecommendations(costs, revenue, syntheticInput);

    return {
      revenue,
      costs: {
        material: round2(costs.material),
        tooling: round2(costs.tooling),
        labor: round2(costs.labor),
        machine: round2(costs.machine),
        setup: round2(costs.setup),
        scrap: round2(costs.scrap),
        rework: round2(costs.rework),
        overhead: round2(costs.overhead),
        secondary_ops: round2(costs.secondary_ops),
        total: round2(costs.total),
      },
      profit,
      margin_pct,
      waterfall,
      top_cost_driver,
      recommendations,
    };
  }

  /**
   * What-if sensitivity analysis.
   */
  sensitivityAnalysis(input: { baseline: JobInput; scenarios: SensitivityScenario[] }): SensitivityResult {
    const baseResult = this.analyzeJob(input.baseline);

    const scenarios = input.scenarios.map((s) => {
      const merged: JobInput = { ...input.baseline, ...s.changes };
      const scenarioResult = this.analyzeJob(merged);
      return {
        name: s.name,
        profit: scenarioResult.profit,
        margin_pct: scenarioResult.margin_pct,
        profit_delta: round2(scenarioResult.profit - baseResult.profit),
        margin_delta_pct: round2(scenarioResult.margin_pct - baseResult.margin_pct),
      };
    });

    // Compute breakeven points for key parameters
    const breakeven_points: SensitivityResult["breakeven_points"] = [];
    const profit = baseResult.profit;

    // Material cost breakeven: material + delta = revenue - other costs => delta = profit
    if (input.baseline.material_cost > 0) {
      const be = input.baseline.material_cost + profit / (1 + (input.baseline.overhead_pct ?? 0) / 100);
      breakeven_points.push({
        parameter: "material_cost",
        breakeven_value: round2(be),
        current_value: input.baseline.material_cost,
        headroom_pct: input.baseline.material_cost > 0
          ? round2(((be - input.baseline.material_cost) / input.baseline.material_cost) * 100)
          : 0,
      });
    }

    // Revenue breakeven: revenue = total cost
    if (input.baseline.revenue > 0) {
      const costs = computeCosts(input.baseline);
      breakeven_points.push({
        parameter: "revenue",
        breakeven_value: round2(costs.total),
        current_value: input.baseline.revenue,
        headroom_pct: round2(((input.baseline.revenue - costs.total) / input.baseline.revenue) * 100),
      });
    }

    // Labor rate breakeven
    if (input.baseline.labor_hours > 0) {
      const costsNoLabor = computeCosts({ ...input.baseline, labor_hours: 0, setup_time_hours: 0 });
      const availableForLabor = input.baseline.revenue - costsNoLabor.total;
      const totalLaborHours = input.baseline.labor_hours + input.baseline.setup_time_hours;
      if (totalLaborHours > 0) {
        const beRate = availableForLabor / (totalLaborHours * (1 + (input.baseline.overhead_pct ?? 0) / 100));
        breakeven_points.push({
          parameter: "labor_rate_per_hour",
          breakeven_value: round2(beRate),
          current_value: input.baseline.labor_rate_per_hour,
          headroom_pct: input.baseline.labor_rate_per_hour > 0
            ? round2(((beRate - input.baseline.labor_rate_per_hour) / input.baseline.labor_rate_per_hour) * 100)
            : 0,
        });
      }
    }

    // Scrap count breakeven
    if (input.baseline.scrap_cost_per_unit > 0) {
      const costsNoScrap = computeCosts({ ...input.baseline, scrap_count: 0 });
      const availableForScrap = input.baseline.revenue - costsNoScrap.total;
      const beCount = availableForScrap / (input.baseline.scrap_cost_per_unit * (1 + (input.baseline.overhead_pct ?? 0) / 100));
      breakeven_points.push({
        parameter: "scrap_count",
        breakeven_value: round2(Math.max(0, beCount)),
        current_value: input.baseline.scrap_count,
        headroom_pct: input.baseline.scrap_count > 0
          ? round2(((beCount - input.baseline.scrap_count) / input.baseline.scrap_count) * 100)
          : 0,
      });
    }

    return {
      baseline: { profit: baseResult.profit, margin_pct: baseResult.margin_pct },
      scenarios,
      breakeven_points,
    };
  }
}

/** Singleton instance */
export const jobProfitabilityWaterfallEngine = new JobProfitabilityWaterfallEngine();
