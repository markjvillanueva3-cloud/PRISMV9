/**
 * ProductCostEngine — standard costing, BOM rollup, labor/overhead allocation
 * Phase R31-MS1: Cost Accounting & Financial Intelligence
 *
 * Actions:
 *   cost_standard  — standard cost definition and maintenance
 *   cost_bom       — BOM cost rollup with material, labor, overhead
 *   cost_labor     — labor cost allocation by work center and operation
 *   cost_overhead  — overhead rate calculation and allocation
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface CostStandard {
  part_number: string;
  description: string;
  material_cost: number;
  labor_cost: number;
  overhead_cost: number;
  total_std_cost: number;
  effective_date: string;
  revision: number;
}

interface BOMCostItem {
  parent_part: string;
  component_part: string;
  description: string;
  qty_per: number;
  unit_cost: number;
  extended_cost: number;
  level: number;
  make_buy: 'make' | 'buy';
}

interface LaborRate {
  work_center: string;
  operation: string;
  rate_per_hour: number;
  std_hours: number;
  setup_hours: number;
  crew_size: number;
}

interface OverheadPool {
  pool_name: string;
  budget_amount: number;
  actual_amount: number;
  allocation_base: string;
  rate: number;
}

// ── Sample Data ────────────────────────────────────────────────────────────

const COST_STANDARDS: CostStandard[] = [
  { part_number: 'PMP-BODY-100', description: 'Pump Body Casting', material_cost: 45.00, labor_cost: 28.50, overhead_cost: 22.80, total_std_cost: 96.30, effective_date: '2025-01-01', revision: 3 },
  { part_number: 'PMP-IMPELLER-200', description: 'Pump Impeller', material_cost: 32.00, labor_cost: 18.75, overhead_cost: 15.00, total_std_cost: 65.75, effective_date: '2025-01-01', revision: 2 },
  { part_number: 'PMP-SHAFT-300', description: 'Pump Drive Shaft', material_cost: 18.50, labor_cost: 12.00, overhead_cost: 9.60, total_std_cost: 40.10, effective_date: '2025-01-01', revision: 4 },
  { part_number: 'PMP-SEAL-400', description: 'Mechanical Seal Assembly', material_cost: 55.00, labor_cost: 8.25, overhead_cost: 6.60, total_std_cost: 69.85, effective_date: '2025-01-01', revision: 1 },
  { part_number: 'PMP-ASSY-001', description: 'Complete Pump Assembly', material_cost: 150.50, labor_cost: 67.50, overhead_cost: 54.00, total_std_cost: 272.00, effective_date: '2025-01-01', revision: 5 },
  { part_number: 'VLV-BODY-100', description: 'Valve Body Forging', material_cost: 38.00, labor_cost: 22.00, overhead_cost: 17.60, total_std_cost: 77.60, effective_date: '2025-01-01', revision: 2 },
];

const BOM_COSTS: BOMCostItem[] = [
  { parent_part: 'PMP-ASSY-001', component_part: 'PMP-BODY-100', description: 'Pump Body', qty_per: 1, unit_cost: 96.30, extended_cost: 96.30, level: 1, make_buy: 'make' },
  { parent_part: 'PMP-ASSY-001', component_part: 'PMP-IMPELLER-200', description: 'Impeller', qty_per: 1, unit_cost: 65.75, extended_cost: 65.75, level: 1, make_buy: 'make' },
  { parent_part: 'PMP-ASSY-001', component_part: 'PMP-SHAFT-300', description: 'Drive Shaft', qty_per: 1, unit_cost: 40.10, extended_cost: 40.10, level: 1, make_buy: 'make' },
  { parent_part: 'PMP-ASSY-001', component_part: 'PMP-SEAL-400', description: 'Mech Seal', qty_per: 1, unit_cost: 69.85, extended_cost: 69.85, level: 1, make_buy: 'buy' },
  { parent_part: 'PMP-ASSY-001', component_part: 'HDW-BOLT-M10', description: 'M10 Bolts', qty_per: 8, unit_cost: 0.45, extended_cost: 3.60, level: 1, make_buy: 'buy' },
  { parent_part: 'PMP-ASSY-001', component_part: 'HDW-GASKET-50', description: 'Gasket 50mm', qty_per: 2, unit_cost: 2.80, extended_cost: 5.60, level: 1, make_buy: 'buy' },
  { parent_part: 'PMP-BODY-100', component_part: 'RAW-CAST-AL356', description: 'AL356 Casting Blank', qty_per: 1, unit_cost: 28.00, extended_cost: 28.00, level: 2, make_buy: 'buy' },
  { parent_part: 'PMP-BODY-100', component_part: 'RAW-INSERT-BRZ', description: 'Bronze Insert', qty_per: 2, unit_cost: 8.50, extended_cost: 17.00, level: 2, make_buy: 'buy' },
];

const LABOR_RATES: LaborRate[] = [
  { work_center: 'WC-LATHE', operation: 'Turning', rate_per_hour: 45.00, std_hours: 0.50, setup_hours: 0.25, crew_size: 1 },
  { work_center: 'WC-MILL', operation: 'Milling', rate_per_hour: 52.00, std_hours: 0.75, setup_hours: 0.30, crew_size: 1 },
  { work_center: 'WC-GRIND', operation: 'Grinding', rate_per_hour: 48.00, std_hours: 0.35, setup_hours: 0.15, crew_size: 1 },
  { work_center: 'WC-ASSY', operation: 'Assembly', rate_per_hour: 38.00, std_hours: 1.25, setup_hours: 0.10, crew_size: 2 },
  { work_center: 'WC-TEST', operation: 'Testing', rate_per_hour: 42.00, std_hours: 0.40, setup_hours: 0.05, crew_size: 1 },
  { work_center: 'WC-PAINT', operation: 'Finishing', rate_per_hour: 35.00, std_hours: 0.30, setup_hours: 0.20, crew_size: 1 },
];

const OVERHEAD_POOLS: OverheadPool[] = [
  { pool_name: 'Machine Overhead', budget_amount: 480000, actual_amount: 495000, allocation_base: 'Machine Hours', rate: 32.00 },
  { pool_name: 'Facility Overhead', budget_amount: 360000, actual_amount: 352000, allocation_base: 'Direct Labor Hours', rate: 18.00 },
  { pool_name: 'Quality Overhead', budget_amount: 120000, actual_amount: 128000, allocation_base: 'Units Produced', rate: 4.50 },
  { pool_name: 'Material Handling', budget_amount: 95000, actual_amount: 91000, allocation_base: 'Material Cost', rate: 0.08 },
];

// ── Action Implementations ─────────────────────────────────────────────────

function costStandard(params: Record<string, unknown>): unknown {
  const partNumber = params.part_number as string | undefined;

  let standards = COST_STANDARDS;
  if (partNumber) standards = standards.filter(s => s.part_number === partNumber);

  const results = standards.map(s => ({
    ...s,
    cost_breakdown: {
      material_pct: Math.round(s.material_cost / s.total_std_cost * 1000) / 10,
      labor_pct: Math.round(s.labor_cost / s.total_std_cost * 1000) / 10,
      overhead_pct: Math.round(s.overhead_cost / s.total_std_cost * 1000) / 10,
    },
  }));

  const totalMaterial = standards.reduce((s, c) => s + c.material_cost, 0);
  const totalLabor = standards.reduce((s, c) => s + c.labor_cost, 0);
  const totalOverhead = standards.reduce((s, c) => s + c.overhead_cost, 0);

  return {
    total_parts: results.length,
    standards: results,
    summary: {
      avg_material_cost: Math.round(totalMaterial / Math.max(results.length, 1) * 100) / 100,
      avg_labor_cost: Math.round(totalLabor / Math.max(results.length, 1) * 100) / 100,
      avg_overhead_cost: Math.round(totalOverhead / Math.max(results.length, 1) * 100) / 100,
      avg_total_cost: Math.round((totalMaterial + totalLabor + totalOverhead) / Math.max(results.length, 1) * 100) / 100,
    },
  };
}

function costBOM(params: Record<string, unknown>): unknown {
  const parentPart = params.parent_part as string || 'PMP-ASSY-001';
  const level = params.level as number | undefined;

  let items = BOM_COSTS.filter(b => b.parent_part === parentPart);
  if (level !== undefined) items = BOM_COSTS.filter(b => b.level === level);

  const totalMaterial = items.filter(i => i.make_buy === 'buy').reduce((s, i) => s + i.extended_cost, 0);
  const totalMake = items.filter(i => i.make_buy === 'make').reduce((s, i) => s + i.extended_cost, 0);
  const totalCost = items.reduce((s, i) => s + i.extended_cost, 0);

  return {
    parent_part: parentPart,
    total_components: items.length,
    bom_items: items,
    rollup: {
      total_material_cost: Math.round(totalCost * 100) / 100,
      make_cost: Math.round(totalMake * 100) / 100,
      buy_cost: Math.round(totalMaterial * 100) / 100,
      make_pct: Math.round(totalMake / Math.max(totalCost, 0.01) * 1000) / 10,
      buy_pct: Math.round(totalMaterial / Math.max(totalCost, 0.01) * 1000) / 10,
      max_level: Math.max(...items.map(i => i.level)),
    },
  };
}

function costLabor(params: Record<string, unknown>): unknown {
  const workCenter = params.work_center as string | undefined;

  let rates = LABOR_RATES;
  if (workCenter) rates = rates.filter(r => r.work_center === workCenter);

  const results = rates.map(r => {
    const runCost = r.rate_per_hour * r.std_hours * r.crew_size;
    const setupCost = r.rate_per_hour * r.setup_hours;
    return {
      ...r,
      run_cost: Math.round(runCost * 100) / 100,
      setup_cost: Math.round(setupCost * 100) / 100,
      total_cost: Math.round((runCost + setupCost) * 100) / 100,
      effective_rate: Math.round(r.rate_per_hour * r.crew_size * 100) / 100,
    };
  });

  const totalRunCost = results.reduce((s, r) => s + r.run_cost, 0);
  const totalSetupCost = results.reduce((s, r) => s + r.setup_cost, 0);
  const totalHours = rates.reduce((s, r) => s + r.std_hours + r.setup_hours, 0);

  return {
    total_operations: results.length,
    labor_details: results,
    summary: {
      total_run_cost: Math.round(totalRunCost * 100) / 100,
      total_setup_cost: Math.round(totalSetupCost * 100) / 100,
      total_labor_cost: Math.round((totalRunCost + totalSetupCost) * 100) / 100,
      total_hours: Math.round(totalHours * 100) / 100,
      avg_rate: Math.round(rates.reduce((s, r) => s + r.rate_per_hour, 0) / Math.max(rates.length, 1) * 100) / 100,
    },
  };
}

function costOverhead(params: Record<string, unknown>): unknown {
  const poolName = params.pool_name as string | undefined;

  let pools = OVERHEAD_POOLS;
  if (poolName) pools = pools.filter(p => p.pool_name.toLowerCase().includes((poolName as string).toLowerCase()));

  const results = pools.map(p => {
    const variance = p.actual_amount - p.budget_amount;
    const variancePct = Math.round(variance / p.budget_amount * 1000) / 10;
    return {
      ...p,
      variance,
      variance_pct: variancePct,
      status: Math.abs(variancePct) <= 5 ? 'on_budget' : variance > 0 ? 'over_budget' : 'under_budget',
    };
  });

  const totalBudget = pools.reduce((s, p) => s + p.budget_amount, 0);
  const totalActual = pools.reduce((s, p) => s + p.actual_amount, 0);

  return {
    total_pools: results.length,
    overhead_pools: results,
    summary: {
      total_budget: totalBudget,
      total_actual: totalActual,
      total_variance: totalActual - totalBudget,
      variance_pct: Math.round((totalActual - totalBudget) / totalBudget * 1000) / 10,
      over_budget_pools: results.filter(r => r.status === 'over_budget').length,
      on_budget_pools: results.filter(r => r.status === 'on_budget').length,
    },
  };
}

// ── Public Dispatcher ──────────────────────────────────────────────────────

export function executeProductCostAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case 'cost_standard':  return costStandard(params);
    case 'cost_bom':       return costBOM(params);
    case 'cost_labor':     return costLabor(params);
    case 'cost_overhead':  return costOverhead(params);
    default:
      return { error: `Unknown ProductCost action: ${action}` };
  }
}
