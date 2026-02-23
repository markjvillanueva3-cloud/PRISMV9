/**
 * CostModelingEngine — R22-MS3
 *
 * Activity-based costing, dynamic cost breakdown, cost comparison,
 * and what-if analysis for manufacturing operations.
 *
 * Actions:
 *   cost_estimate   — Estimate total manufacturing cost for a part
 *   cost_breakdown  — Detailed cost breakdown by category
 *   cost_compare    — Compare cost scenarios (materials, methods, volumes)
 *   cost_whatif     — What-if analysis for parameter changes
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CostEstimateInput {
  part_id?: string;
  material: string;
  weight_kg: number;
  operations: {
    operation: string;
    machine_type?: string;
    cycle_time_minutes: number;
    setup_time_minutes?: number;
    tool_cost_per_part?: number;
  }[];
  batch_size?: number;
  material_cost_per_kg?: number;
  machine_rate_per_hour?: number;
  labor_rate_per_hour?: number;
  overhead_pct?: number;
  scrap_rate_pct?: number;
}

interface BreakdownInput {
  part_id?: string;
  material: string;
  weight_kg: number;
  material_cost_per_kg: number;
  operations: {
    operation: string;
    machine_type?: string;
    cycle_time_minutes: number;
    setup_time_minutes?: number;
    tool_changes?: number;
    coolant_liters?: number;
  }[];
  batch_size?: number;
  inspection_time_minutes?: number;
  packaging_cost?: number;
}

interface CompareInput {
  scenarios: {
    name: string;
    material: string;
    weight_kg: number;
    material_cost_per_kg: number;
    operations: {
      operation: string;
      cycle_time_minutes: number;
      setup_time_minutes?: number;
    }[];
    batch_size?: number;
    scrap_rate_pct?: number;
  }[];
  machine_rate_per_hour?: number;
  labor_rate_per_hour?: number;
}

interface WhatIfInput {
  baseline: {
    material_cost_per_kg: number;
    weight_kg: number;
    cycle_time_minutes: number;
    setup_time_minutes: number;
    batch_size: number;
    machine_rate_per_hour: number;
    labor_rate_per_hour: number;
    scrap_rate_pct: number;
    tool_cost_per_part: number;
  };
  changes: {
    parameter: string;
    values: number[];
  }[];
}

// ---------------------------------------------------------------------------
// Reference data — machine rates, material costs
// ---------------------------------------------------------------------------

const MACHINE_RATES: Record<string, number> = {
  cnc_3axis: 85,
  cnc_5axis: 135,
  cnc_lathe: 75,
  cnc_grinder: 95,
  cnc_edm: 110,
  manual_mill: 55,
  manual_lathe: 50,
  heat_treat: 40,
  surface_treat: 60,
  inspection: 65,
  default: 80,
};

const MATERIAL_COSTS: Record<string, number> = {
  "steel_4140": 2.80,
  "steel_4340": 3.40,
  "steel_1045": 1.90,
  "stainless_304": 5.20,
  "stainless_316": 6.50,
  "aluminum_6061": 5.80,
  "aluminum_7075": 8.20,
  "titanium_6al4v": 48.00,
  "inconel_718": 55.00,
  "brass_360": 7.50,
  "copper_110": 9.80,
  "cast_iron": 1.50,
  "default": 5.00,
};

const LABOR_RATE_DEFAULT = 45; // USD/hour
const OVERHEAD_PCT_DEFAULT = 30;
const SCRAP_RATE_DEFAULT = 3;
const TOOL_COST_DEFAULT = 2.50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMaterialCost(material: string): number {
  const key = material.toLowerCase().replace(/[\s-]+/g, "_");
  return MATERIAL_COSTS[key] ?? MATERIAL_COSTS.default;
}

function getMachineRate(machineType: string): number {
  const key = machineType.toLowerCase().replace(/[\s-]+/g, "_");
  return MACHINE_RATES[key] ?? MACHINE_RATES.default;
}

// ---------------------------------------------------------------------------
// cost_estimate — Total manufacturing cost
// ---------------------------------------------------------------------------

function estimateCost(input: CostEstimateInput) {
  const {
    part_id = "PART-001",
    material,
    weight_kg,
    operations,
    batch_size = 1,
    material_cost_per_kg,
    machine_rate_per_hour,
    labor_rate_per_hour = LABOR_RATE_DEFAULT,
    overhead_pct = OVERHEAD_PCT_DEFAULT,
    scrap_rate_pct = SCRAP_RATE_DEFAULT,
  } = input;

  const matCost = material_cost_per_kg ?? getMaterialCost(material);
  const scrapFactor = 1 + scrap_rate_pct / 100;

  // Material cost (including buy-to-fly ratio ~1.3 for typical machining)
  const buyToFly = 1.3;
  const rawMaterialCost = weight_kg * buyToFly * matCost * scrapFactor;

  // Operation costs
  let totalCycleMinutes = 0;
  let totalSetupMinutes = 0;
  let totalToolCost = 0;

  const opCosts = operations.map((op) => {
    const rate = machine_rate_per_hour ?? getMachineRate(op.machine_type ?? "default");
    const setup = op.setup_time_minutes ?? 15;
    const cycleCost = (op.cycle_time_minutes / 60) * rate;
    const setupCostPerPart = (setup / 60) * rate / batch_size;
    const toolCost = op.tool_cost_per_part ?? TOOL_COST_DEFAULT;

    totalCycleMinutes += op.cycle_time_minutes;
    totalSetupMinutes += setup;
    totalToolCost += toolCost;

    return {
      operation: op.operation,
      cycle_cost: Math.round(cycleCost * 100) / 100,
      setup_cost_per_part: Math.round(setupCostPerPart * 100) / 100,
      tool_cost: toolCost,
      subtotal: Math.round((cycleCost + setupCostPerPart + toolCost) * 100) / 100,
    };
  });

  const machiningCost = opCosts.reduce((s, op) => s + op.subtotal, 0);
  const laborCost = (totalCycleMinutes / 60) * labor_rate_per_hour;
  const directCost = rawMaterialCost + machiningCost + laborCost;
  const overheadCost = directCost * (overhead_pct / 100);
  const totalCost = directCost + overheadCost;

  // Cost per unit and per kg
  const costPerKg = weight_kg > 0 ? totalCost / weight_kg : 0;

  return {
    part_id,
    material,
    weight_kg,
    batch_size,
    cost_summary: {
      material_cost: Math.round(rawMaterialCost * 100) / 100,
      machining_cost: Math.round(machiningCost * 100) / 100,
      labor_cost: Math.round(laborCost * 100) / 100,
      overhead_cost: Math.round(overheadCost * 100) / 100,
      total_cost_per_part: Math.round(totalCost * 100) / 100,
      cost_per_kg: Math.round(costPerKg * 100) / 100,
    },
    operations: opCosts,
    parameters: {
      material_cost_per_kg: matCost,
      buy_to_fly_ratio: buyToFly,
      scrap_rate_pct,
      overhead_pct,
      labor_rate_per_hour,
      total_cycle_minutes: totalCycleMinutes,
      total_setup_minutes: totalSetupMinutes,
    },
    batch_economics: batch_size > 1 ? {
      total_batch_cost: Math.round(totalCost * batch_size * 100) / 100,
      setup_amortization_per_part: Math.round((totalSetupMinutes / 60 * (machine_rate_per_hour ?? 80)) / batch_size * 100) / 100,
    } : undefined,
  };
}

// ---------------------------------------------------------------------------
// cost_breakdown — Detailed breakdown by category
// ---------------------------------------------------------------------------

function breakdownCost(input: BreakdownInput) {
  const {
    part_id = "PART-001",
    material,
    weight_kg,
    material_cost_per_kg,
    operations,
    batch_size = 1,
    inspection_time_minutes = 10,
    packaging_cost = 1.50,
  } = input;

  const buyToFly = 1.3;
  const rawMat = weight_kg * buyToFly * material_cost_per_kg;

  // Machining breakdown
  const machiningDetails = operations.map((op) => {
    const rate = getMachineRate(op.machine_type ?? "default");
    const setupMin = op.setup_time_minutes ?? 15;
    const machineCost = (op.cycle_time_minutes / 60) * rate;
    const setupCost = (setupMin / 60) * rate / batch_size;
    const toolChangeCost = (op.tool_changes ?? 0) * 3.50;
    const coolantCost = (op.coolant_liters ?? 0.1) * 3.20;

    return {
      operation: op.operation,
      machine_cost: Math.round(machineCost * 100) / 100,
      setup_cost: Math.round(setupCost * 100) / 100,
      tool_change_cost: Math.round(toolChangeCost * 100) / 100,
      coolant_cost: Math.round(coolantCost * 100) / 100,
      subtotal: Math.round((machineCost + setupCost + toolChangeCost + coolantCost) * 100) / 100,
    };
  });

  const totalMachining = machiningDetails.reduce((s, d) => s + d.subtotal, 0);

  // Quality costs
  const inspectionCost = (inspection_time_minutes / 60) * getMachineRate("inspection");

  // Indirect costs
  const energyCost = operations.reduce((s, op) => s + op.cycle_time_minutes * 0.05, 0);
  const facilityCost = operations.reduce((s, op) => s + op.cycle_time_minutes * 0.03, 0);

  const totalDirect = rawMat + totalMachining + inspectionCost + packaging_cost;
  const totalIndirect = energyCost + facilityCost;
  const totalCost = totalDirect + totalIndirect;

  // Category percentages
  const categories = {
    material: { cost: Math.round(rawMat * 100) / 100, pct: Math.round((rawMat / totalCost) * 1000) / 10 },
    machining: { cost: Math.round(totalMachining * 100) / 100, pct: Math.round((totalMachining / totalCost) * 1000) / 10 },
    quality: { cost: Math.round(inspectionCost * 100) / 100, pct: Math.round((inspectionCost / totalCost) * 1000) / 10 },
    packaging: { cost: packaging_cost, pct: Math.round((packaging_cost / totalCost) * 1000) / 10 },
    energy: { cost: Math.round(energyCost * 100) / 100, pct: Math.round((energyCost / totalCost) * 1000) / 10 },
    facility: { cost: Math.round(facilityCost * 100) / 100, pct: Math.round((facilityCost / totalCost) * 1000) / 10 },
  };

  return {
    part_id,
    material,
    total_cost: Math.round(totalCost * 100) / 100,
    direct_cost: Math.round(totalDirect * 100) / 100,
    indirect_cost: Math.round(totalIndirect * 100) / 100,
    categories,
    machining_details: machiningDetails,
    cost_drivers: [
      ...Object.entries(categories)
        .sort(([, a], [, b]) => b.cost - a.cost)
        .slice(0, 3)
        .map(([cat, data]) => `${cat}: $${data.cost} (${data.pct}%)`)
    ],
  };
}

// ---------------------------------------------------------------------------
// cost_compare — Multi-scenario comparison
// ---------------------------------------------------------------------------

function compareCosts(input: CompareInput) {
  const {
    scenarios,
    machine_rate_per_hour = 80,
    labor_rate_per_hour = LABOR_RATE_DEFAULT,
  } = input;

  const results = scenarios.map((sc) => {
    const matCost = sc.weight_kg * 1.3 * sc.material_cost_per_kg * (1 + (sc.scrap_rate_pct ?? 3) / 100);
    const batchSize = sc.batch_size ?? 1;

    let machCost = 0;
    let totalCycle = 0;
    for (const op of sc.operations) {
      const setup = op.setup_time_minutes ?? 15;
      machCost += (op.cycle_time_minutes / 60) * machine_rate_per_hour + (setup / 60 * machine_rate_per_hour / batchSize);
      totalCycle += op.cycle_time_minutes;
    }

    const laborCost = (totalCycle / 60) * labor_rate_per_hour;
    const overhead = (matCost + machCost + laborCost) * 0.30;
    const total = matCost + machCost + laborCost + overhead;

    return {
      name: sc.name,
      material: sc.material,
      batch_size: batchSize,
      material_cost: Math.round(matCost * 100) / 100,
      machining_cost: Math.round(machCost * 100) / 100,
      labor_cost: Math.round(laborCost * 100) / 100,
      overhead_cost: Math.round(overhead * 100) / 100,
      total_cost: Math.round(total * 100) / 100,
      cycle_time_minutes: totalCycle,
    };
  });

  // Sort by total cost
  const sorted = [...results].sort((a, b) => a.total_cost - b.total_cost);
  const cheapest = sorted[0];
  const mostExpensive = sorted[sorted.length - 1];
  const savingsRange = mostExpensive && cheapest
    ? Math.round((mostExpensive.total_cost - cheapest.total_cost) * 100) / 100
    : 0;

  return {
    total_scenarios: scenarios.length,
    comparison: results,
    ranking: sorted.map((r, i) => ({ rank: i + 1, name: r.name, total_cost: r.total_cost })),
    best_option: cheapest?.name ?? null,
    worst_option: mostExpensive?.name ?? null,
    savings_potential: savingsRange,
    savings_pct: mostExpensive && mostExpensive.total_cost > 0
      ? Math.round((savingsRange / mostExpensive.total_cost) * 1000) / 10
      : 0,
  };
}

// ---------------------------------------------------------------------------
// cost_whatif — What-if analysis
// ---------------------------------------------------------------------------

function whatIfAnalysis(input: WhatIfInput) {
  const { baseline, changes } = input;

  // Calculate baseline cost
  function calcCost(params: typeof baseline) {
    const matCost = params.weight_kg * 1.3 * params.material_cost_per_kg * (1 + params.scrap_rate_pct / 100);
    const cycleCost = (params.cycle_time_minutes / 60) * params.machine_rate_per_hour;
    const setupCost = (params.setup_time_minutes / 60) * params.machine_rate_per_hour / params.batch_size;
    const laborCost = (params.cycle_time_minutes / 60) * params.labor_rate_per_hour;
    const toolCost = params.tool_cost_per_part;
    const direct = matCost + cycleCost + setupCost + laborCost + toolCost;
    const overhead = direct * 0.30;
    return Math.round((direct + overhead) * 100) / 100;
  }

  const baselineCost = calcCost(baseline);

  const analyses = changes.map((change) => {
    const paramKey = change.parameter as keyof typeof baseline;
    const originalValue = baseline[paramKey];

    const results = change.values.map((newValue) => {
      const modified = { ...baseline, [paramKey]: newValue };
      const newCost = calcCost(modified);
      const delta = Math.round((newCost - baselineCost) * 100) / 100;
      const deltaPct = baselineCost > 0 ? Math.round((delta / baselineCost) * 1000) / 10 : 0;

      return {
        value: newValue,
        cost: newCost,
        delta,
        delta_pct: `${deltaPct > 0 ? "+" : ""}${deltaPct}%`,
      };
    });

    // Sensitivity: cost change per unit parameter change
    const sensitivity = results.length >= 2
      ? Math.round(Math.abs(results[results.length - 1].cost - results[0].cost) /
          Math.abs(change.values[change.values.length - 1] - change.values[0]) * 100) / 100
      : 0;

    return {
      parameter: change.parameter,
      original_value: originalValue,
      results,
      sensitivity_cost_per_unit: sensitivity,
    };
  });

  // Rank by sensitivity
  const ranked = [...analyses].sort((a, b) => b.sensitivity_cost_per_unit - a.sensitivity_cost_per_unit);

  return {
    baseline_cost: baselineCost,
    baseline_parameters: baseline,
    analyses,
    sensitivity_ranking: ranked.map((a, i) => ({
      rank: i + 1,
      parameter: a.parameter,
      sensitivity: a.sensitivity_cost_per_unit,
    })),
    most_sensitive: ranked[0]?.parameter ?? null,
    recommendations: [
      ranked[0] ? `Most cost-sensitive parameter: ${ranked[0].parameter} ($${ranked[0].sensitivity_cost_per_unit}/unit change)` : null,
      ...analyses
        .filter((a) => a.results.some((r) => r.delta < -1))
        .map((a) => {
          const best = a.results.reduce((min, r) => r.cost < min.cost ? r : min, a.results[0]);
          return `Changing ${a.parameter} to ${best.value} saves $${Math.abs(best.delta)} (${best.delta_pct})`;
        }),
    ].filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function executeCostModelingAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case "cost_estimate":
      return estimateCost(params as unknown as CostEstimateInput);
    case "cost_breakdown":
      return breakdownCost(params as unknown as BreakdownInput);
    case "cost_compare":
      return compareCosts(params as unknown as CompareInput);
    case "cost_whatif":
      return whatIfAnalysis(params as unknown as WhatIfInput);
    default:
      throw new Error(`CostModelingEngine: unknown action "${action}"`);
  }
}
