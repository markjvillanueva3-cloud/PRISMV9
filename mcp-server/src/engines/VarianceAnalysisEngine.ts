/**
 * VarianceAnalysisEngine — purchase price, labor, overhead & summary variance analysis
 * Phase R31-MS2: Cost Accounting & Financial Intelligence
 *
 * Actions:
 *   var_ppv      — purchase price variance (material cost vs standard)
 *   var_labor    — labor rate and efficiency variance
 *   var_overhead — overhead spending and volume variance
 *   var_summary  — consolidated variance summary with drill-down
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface PPVRecord {
  po_number: string;
  part_number: string;
  description: string;
  std_price: number;
  actual_price: number;
  qty_purchased: number;
  supplier: string;
  date: string;
}

interface LaborVariance {
  work_order: string;
  work_center: string;
  operation: string;
  std_rate: number;
  actual_rate: number;
  std_hours: number;
  actual_hours: number;
  period: string;
}

interface OverheadVariance {
  pool_name: string;
  period: string;
  budget_rate: number;
  actual_rate: number;
  std_hours: number;
  actual_hours: number;
  budget_amount: number;
  actual_amount: number;
}

// ── Sample Data ────────────────────────────────────────────────────────────

const PPV_RECORDS: PPVRecord[] = [
  { po_number: 'PO-2025-101', part_number: 'RAW-CAST-AL356', description: 'AL356 Casting Blank', std_price: 28.00, actual_price: 29.50, qty_purchased: 500, supplier: 'MetalCast Inc', date: '2025-02-15' },
  { po_number: 'PO-2025-102', part_number: 'RAW-INSERT-BRZ', description: 'Bronze Insert', std_price: 8.50, actual_price: 8.20, qty_purchased: 1000, supplier: 'AlloyParts Ltd', date: '2025-02-18' },
  { po_number: 'PO-2025-103', part_number: 'PMP-SEAL-400', description: 'Mechanical Seal', std_price: 55.00, actual_price: 57.00, qty_purchased: 200, supplier: 'SealTech Corp', date: '2025-02-20' },
  { po_number: 'PO-2025-104', part_number: 'HDW-BOLT-M10', description: 'M10 Bolts', std_price: 0.45, actual_price: 0.42, qty_purchased: 5000, supplier: 'FastenerWorld', date: '2025-02-22' },
  { po_number: 'PO-2025-105', part_number: 'HDW-GASKET-50', description: 'Gasket 50mm', std_price: 2.80, actual_price: 3.10, qty_purchased: 800, supplier: 'SealTech Corp', date: '2025-03-01' },
  { po_number: 'PO-2025-106', part_number: 'RAW-STEEL-4140', description: '4140 Steel Bar', std_price: 12.00, actual_price: 11.50, qty_purchased: 300, supplier: 'SteelSupply Co', date: '2025-03-05' },
];

const LABOR_VARIANCES: LaborVariance[] = [
  { work_order: 'WO-5001', work_center: 'WC-LATHE', operation: 'Turning', std_rate: 45.00, actual_rate: 47.00, std_hours: 50.0, actual_hours: 55.0, period: '2025-03' },
  { work_order: 'WO-5002', work_center: 'WC-MILL', operation: 'Milling', std_rate: 52.00, actual_rate: 52.00, std_hours: 75.0, actual_hours: 82.0, period: '2025-03' },
  { work_order: 'WO-5003', work_center: 'WC-GRIND', operation: 'Grinding', std_rate: 48.00, actual_rate: 48.50, std_hours: 35.0, actual_hours: 33.0, period: '2025-03' },
  { work_order: 'WO-5004', work_center: 'WC-ASSY', operation: 'Assembly', std_rate: 38.00, actual_rate: 39.00, std_hours: 125.0, actual_hours: 130.0, period: '2025-03' },
  { work_order: 'WO-5005', work_center: 'WC-TEST', operation: 'Testing', std_rate: 42.00, actual_rate: 42.00, std_hours: 40.0, actual_hours: 38.0, period: '2025-03' },
];

const OVERHEAD_VARIANCES: OverheadVariance[] = [
  { pool_name: 'Machine Overhead', period: '2025-Q1', budget_rate: 32.00, actual_rate: 33.50, std_hours: 5000, actual_hours: 4800, budget_amount: 160000, actual_amount: 160800 },
  { pool_name: 'Facility Overhead', period: '2025-Q1', budget_rate: 18.00, actual_rate: 17.50, std_hours: 6000, actual_hours: 5800, budget_amount: 108000, actual_amount: 101500 },
  { pool_name: 'Quality Overhead', period: '2025-Q1', budget_rate: 4.50, actual_rate: 5.00, std_hours: 8000, actual_hours: 7500, budget_amount: 36000, actual_amount: 37500 },
];

// ── Action Implementations ─────────────────────────────────────────────────

function varPPV(params: Record<string, unknown>): unknown {
  const supplier = params.supplier as string | undefined;
  const partNumber = params.part_number as string | undefined;

  let records = PPV_RECORDS;
  if (supplier) records = records.filter(r => r.supplier.toLowerCase().includes((supplier as string).toLowerCase()));
  if (partNumber) records = records.filter(r => r.part_number === partNumber);

  const results = records.map(r => {
    const ppv = (r.actual_price - r.std_price) * r.qty_purchased;
    const ppvPerUnit = r.actual_price - r.std_price;
    return {
      ...r,
      ppv_per_unit: Math.round(ppvPerUnit * 100) / 100,
      ppv_total: Math.round(ppv * 100) / 100,
      variance_pct: Math.round(ppvPerUnit / r.std_price * 1000) / 10,
      favorable: ppv <= 0,
    };
  });

  const totalPPV = results.reduce((s, r) => s + r.ppv_total, 0);
  const favorable = results.filter(r => r.favorable);
  const unfavorable = results.filter(r => !r.favorable);

  return {
    total_records: results.length,
    ppv_details: results,
    summary: {
      total_ppv: Math.round(totalPPV * 100) / 100,
      favorable_count: favorable.length,
      favorable_amount: Math.round(favorable.reduce((s, r) => s + r.ppv_total, 0) * 100) / 100,
      unfavorable_count: unfavorable.length,
      unfavorable_amount: Math.round(unfavorable.reduce((s, r) => s + r.ppv_total, 0) * 100) / 100,
      net_status: totalPPV <= 0 ? 'favorable' : 'unfavorable',
    },
  };
}

function varLabor(params: Record<string, unknown>): unknown {
  const workCenter = params.work_center as string | undefined;
  const period = params.period as string | undefined;

  let records = LABOR_VARIANCES;
  if (workCenter) records = records.filter(r => r.work_center === workCenter);
  if (period) records = records.filter(r => r.period === period);

  const results = records.map(r => {
    const rateVariance = (r.actual_rate - r.std_rate) * r.actual_hours;
    const efficiencyVariance = (r.actual_hours - r.std_hours) * r.std_rate;
    const totalVariance = rateVariance + efficiencyVariance;
    return {
      ...r,
      rate_variance: Math.round(rateVariance * 100) / 100,
      efficiency_variance: Math.round(efficiencyVariance * 100) / 100,
      total_variance: Math.round(totalVariance * 100) / 100,
      rate_favorable: rateVariance <= 0,
      efficiency_favorable: efficiencyVariance <= 0,
    };
  });

  const totalRate = results.reduce((s, r) => s + r.rate_variance, 0);
  const totalEfficiency = results.reduce((s, r) => s + r.efficiency_variance, 0);

  return {
    total_records: results.length,
    labor_variances: results,
    summary: {
      total_rate_variance: Math.round(totalRate * 100) / 100,
      total_efficiency_variance: Math.round(totalEfficiency * 100) / 100,
      total_labor_variance: Math.round((totalRate + totalEfficiency) * 100) / 100,
      rate_status: totalRate <= 0 ? 'favorable' : 'unfavorable',
      efficiency_status: totalEfficiency <= 0 ? 'favorable' : 'unfavorable',
    },
  };
}

function varOverhead(params: Record<string, unknown>): unknown {
  const poolName = params.pool_name as string | undefined;
  const period = params.period as string | undefined;

  let records = OVERHEAD_VARIANCES;
  if (poolName) records = records.filter(r => r.pool_name.toLowerCase().includes((poolName as string).toLowerCase()));
  if (period) records = records.filter(r => r.period === period);

  const results = records.map(r => {
    const spendingVariance = (r.actual_rate - r.budget_rate) * r.actual_hours;
    const volumeVariance = (r.actual_hours - r.std_hours) * r.budget_rate;
    const totalVariance = r.actual_amount - r.budget_amount;
    return {
      pool_name: r.pool_name,
      period: r.period,
      budget: { rate: r.budget_rate, hours: r.std_hours, amount: r.budget_amount },
      actual: { rate: r.actual_rate, hours: r.actual_hours, amount: r.actual_amount },
      spending_variance: Math.round(spendingVariance * 100) / 100,
      volume_variance: Math.round(volumeVariance * 100) / 100,
      total_variance: Math.round(totalVariance * 100) / 100,
      spending_favorable: spendingVariance <= 0,
      volume_favorable: volumeVariance <= 0,
    };
  });

  const totalSpending = results.reduce((s, r) => s + r.spending_variance, 0);
  const totalVolume = results.reduce((s, r) => s + r.volume_variance, 0);
  const totalVar = results.reduce((s, r) => s + r.total_variance, 0);

  return {
    total_pools: results.length,
    overhead_variances: results,
    summary: {
      total_spending_variance: Math.round(totalSpending * 100) / 100,
      total_volume_variance: Math.round(totalVolume * 100) / 100,
      total_overhead_variance: Math.round(totalVar * 100) / 100,
      spending_status: totalSpending <= 0 ? 'favorable' : 'unfavorable',
      volume_status: totalVolume <= 0 ? 'favorable' : 'unfavorable',
    },
  };
}

function varSummary(params: Record<string, unknown>): unknown {
  const period = params.period as string || '2025-03';

  const ppv = varPPV({}) as any;
  const labor = varLabor({ period }) as any;
  const overhead = varOverhead({}) as any;

  const totalMaterial = ppv.summary.total_ppv;
  const totalLabor = labor.summary.total_labor_variance;
  const totalOverhead = overhead.summary.total_overhead_variance;
  const grandTotal = totalMaterial + totalLabor + totalOverhead;

  return {
    period,
    material_variance: {
      ppv: ppv.summary.total_ppv,
      status: ppv.summary.net_status,
      top_driver: ppv.ppv_details.reduce((w: any, r: any) => Math.abs(r.ppv_total) > Math.abs(w.ppv_total) ? r : w, ppv.ppv_details[0]),
    },
    labor_variance: {
      rate: labor.summary.total_rate_variance,
      efficiency: labor.summary.total_efficiency_variance,
      total: labor.summary.total_labor_variance,
      rate_status: labor.summary.rate_status,
      efficiency_status: labor.summary.efficiency_status,
    },
    overhead_variance: {
      spending: overhead.summary.total_spending_variance,
      volume: overhead.summary.total_volume_variance,
      total: overhead.summary.total_overhead_variance,
    },
    grand_total: {
      total_variance: Math.round(grandTotal * 100) / 100,
      material_pct: Math.round(Math.abs(totalMaterial) / Math.max(Math.abs(grandTotal), 0.01) * 1000) / 10,
      labor_pct: Math.round(Math.abs(totalLabor) / Math.max(Math.abs(grandTotal), 0.01) * 1000) / 10,
      overhead_pct: Math.round(Math.abs(totalOverhead) / Math.max(Math.abs(grandTotal), 0.01) * 1000) / 10,
      overall_status: grandTotal <= 0 ? 'favorable' : 'unfavorable',
    },
  };
}

// ── Public Dispatcher ──────────────────────────────────────────────────────

export function executeVarianceAnalysisAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case 'var_ppv':      return varPPV(params);
    case 'var_labor':    return varLabor(params);
    case 'var_overhead': return varOverhead(params);
    case 'var_summary':  return varSummary(params);
    default:
      return { error: `Unknown VarianceAnalysis action: ${action}` };
  }
}
