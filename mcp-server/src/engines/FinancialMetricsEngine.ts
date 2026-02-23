/**
 * FinancialMetricsEngine — gross margin, contribution margin, break-even & cost KPIs
 * Phase R31-MS4: Cost Accounting & Financial Intelligence
 *
 * Actions:
 *   fin_margin     — gross margin and contribution margin analysis
 *   fin_breakeven  — break-even analysis with volume and revenue targets
 *   fin_costunit   — cost per unit trending and benchmarking
 *   fin_dashboard  — financial KPI dashboard with period comparison
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface ProductFinancials {
  product: string;
  description: string;
  selling_price: number;
  variable_cost: number;
  fixed_cost_allocated: number;
  annual_volume: number;
  period: string;
}

interface CostTrend {
  product: string;
  periods: { period: string; material: number; labor: number; overhead: number; total: number }[];
}

// ── Sample Data ────────────────────────────────────────────────────────────

const PRODUCT_FINANCIALS: ProductFinancials[] = [
  { product: 'PMP-ASSY-001', description: 'Complete Pump Assembly', selling_price: 425.00, variable_cost: 218.00, fixed_cost_allocated: 89.12, annual_volume: 5000, period: '2025-Q1' },
  { product: 'VLV-ASSY-001', description: 'Valve Assembly', selling_price: 185.00, variable_cost: 110.13, fixed_cost_allocated: 42.50, annual_volume: 3000, period: '2025-Q1' },
  { product: 'FTG-ASSY-001', description: 'Fitting Assembly', selling_price: 85.00, variable_cost: 33.56, fixed_cost_allocated: 18.75, annual_volume: 8000, period: '2025-Q1' },
  { product: 'PMP-ASSY-001', description: 'Complete Pump Assembly', selling_price: 425.00, variable_cost: 222.50, fixed_cost_allocated: 91.00, annual_volume: 4800, period: '2024-Q4' },
  { product: 'VLV-ASSY-001', description: 'Valve Assembly', selling_price: 180.00, variable_cost: 112.00, fixed_cost_allocated: 43.00, annual_volume: 2800, period: '2024-Q4' },
  { product: 'FTG-ASSY-001', description: 'Fitting Assembly', selling_price: 82.00, variable_cost: 34.20, fixed_cost_allocated: 19.50, annual_volume: 7500, period: '2024-Q4' },
];

const COST_TRENDS: CostTrend[] = [
  {
    product: 'PMP-ASSY-001',
    periods: [
      { period: '2024-Q1', material: 155.00, labor: 70.00, overhead: 56.00, total: 281.00 },
      { period: '2024-Q2', material: 152.00, labor: 69.00, overhead: 55.20, total: 276.20 },
      { period: '2024-Q3', material: 150.00, labor: 68.50, overhead: 54.80, total: 273.30 },
      { period: '2024-Q4', material: 151.50, labor: 68.00, overhead: 54.50, total: 274.00 },
      { period: '2025-Q1', material: 150.50, labor: 67.50, overhead: 54.00, total: 272.00 },
    ],
  },
  {
    product: 'VLV-ASSY-001',
    periods: [
      { period: '2024-Q1', material: 88.00, labor: 44.00, overhead: 35.20, total: 167.20 },
      { period: '2024-Q2', material: 87.00, labor: 43.50, overhead: 34.80, total: 165.30 },
      { period: '2024-Q3', material: 86.50, labor: 43.00, overhead: 34.40, total: 163.90 },
      { period: '2024-Q4', material: 86.00, labor: 42.50, overhead: 34.00, total: 162.50 },
      { period: '2025-Q1', material: 85.00, labor: 42.00, overhead: 33.60, total: 160.60 },
    ],
  },
  {
    product: 'FTG-ASSY-001',
    periods: [
      { period: '2024-Q1', material: 30.00, labor: 20.00, overhead: 16.00, total: 66.00 },
      { period: '2024-Q2', material: 29.50, labor: 19.50, overhead: 15.60, total: 64.60 },
      { period: '2024-Q3', material: 29.00, labor: 19.00, overhead: 15.20, total: 63.20 },
      { period: '2024-Q4', material: 28.50, labor: 18.80, overhead: 15.00, total: 62.30 },
      { period: '2025-Q1', material: 28.00, labor: 18.50, overhead: 14.80, total: 61.30 },
    ],
  },
];

const FIXED_COSTS = {
  total_monthly: 175000,
  breakdown: [
    { category: 'Facility Lease', amount: 45000 },
    { category: 'Equipment Depreciation', amount: 55000 },
    { category: 'Salaried Staff', amount: 52000 },
    { category: 'Insurance & Utilities', amount: 15000 },
    { category: 'IT & Systems', amount: 8000 },
  ],
};

// ── Action Implementations ─────────────────────────────────────────────────

function finMargin(params: Record<string, unknown>): unknown {
  const product = params.product as string | undefined;
  const period = params.period as string || '2025-Q1';

  let financials = PRODUCT_FINANCIALS.filter(f => f.period === period);
  if (product) financials = financials.filter(f => f.product === product);

  const results = financials.map(f => {
    const grossProfit = f.selling_price - f.variable_cost - f.fixed_cost_allocated;
    const grossMargin = grossProfit / f.selling_price;
    const contributionMargin = f.selling_price - f.variable_cost;
    const cmRatio = contributionMargin / f.selling_price;
    const annualRevenue = f.selling_price * f.annual_volume;
    const annualProfit = grossProfit * f.annual_volume;

    return {
      product: f.product,
      description: f.description,
      period: f.period,
      selling_price: f.selling_price,
      variable_cost: f.variable_cost,
      fixed_cost: f.fixed_cost_allocated,
      gross_profit: Math.round(grossProfit * 100) / 100,
      gross_margin_pct: Math.round(grossMargin * 1000) / 10,
      contribution_margin: Math.round(contributionMargin * 100) / 100,
      cm_ratio: Math.round(cmRatio * 1000) / 10,
      annual_revenue: Math.round(annualRevenue),
      annual_profit: Math.round(annualProfit),
    };
  });

  const totalRevenue = results.reduce((s, r) => s + r.annual_revenue, 0);
  const totalProfit = results.reduce((s, r) => s + r.annual_profit, 0);

  return {
    period,
    total_products: results.length,
    margins: results,
    summary: {
      total_annual_revenue: totalRevenue,
      total_annual_profit: totalProfit,
      overall_margin: Math.round(totalProfit / Math.max(totalRevenue, 1) * 1000) / 10,
      best_margin: results.reduce((b, r) => r.gross_margin_pct > b.gross_margin_pct ? r : b, results[0]),
      worst_margin: results.reduce((w, r) => r.gross_margin_pct < w.gross_margin_pct ? r : w, results[0]),
    },
  };
}

function finBreakeven(params: Record<string, unknown>): unknown {
  const product = params.product as string | undefined;
  const period = params.period as string || '2025-Q1';

  let financials = PRODUCT_FINANCIALS.filter(f => f.period === period);
  if (product) financials = financials.filter(f => f.product === product);

  const results = financials.map(f => {
    const cm = f.selling_price - f.variable_cost;
    const breakEvenUnits = Math.ceil(f.fixed_cost_allocated * f.annual_volume / cm);
    const breakEvenRevenue = breakEvenUnits * f.selling_price;
    const marginOfSafety = f.annual_volume - breakEvenUnits;
    const marginOfSafetyPct = Math.round(marginOfSafety / f.annual_volume * 1000) / 10;

    return {
      product: f.product,
      description: f.description,
      selling_price: f.selling_price,
      variable_cost: f.variable_cost,
      contribution_margin: Math.round(cm * 100) / 100,
      fixed_costs: Math.round(f.fixed_cost_allocated * f.annual_volume),
      break_even_units: breakEvenUnits,
      break_even_revenue: Math.round(breakEvenRevenue),
      current_volume: f.annual_volume,
      margin_of_safety_units: marginOfSafety,
      margin_of_safety_pct: marginOfSafetyPct,
      status: marginOfSafetyPct > 25 ? 'healthy' : marginOfSafetyPct > 10 ? 'adequate' : 'at_risk',
    };
  });

  return {
    period,
    total_products: results.length,
    breakeven_analysis: results,
    summary: {
      all_above_breakeven: results.every(r => r.margin_of_safety_units > 0),
      at_risk_products: results.filter(r => r.status === 'at_risk').length,
      avg_margin_of_safety: Math.round(results.reduce((s, r) => s + r.margin_of_safety_pct, 0) / Math.max(results.length, 1) * 10) / 10,
    },
  };
}

function finCostUnit(params: Record<string, unknown>): unknown {
  const product = params.product as string | undefined;

  let trends = COST_TRENDS;
  if (product) trends = trends.filter(t => t.product === product);

  const results = trends.map(t => {
    const latest = t.periods[t.periods.length - 1];
    const earliest = t.periods[0];
    const totalReduction = earliest.total - latest.total;
    const reductionPct = Math.round(totalReduction / earliest.total * 1000) / 10;
    const periodsCount = t.periods.length;
    const avgReductionPerPeriod = Math.round(totalReduction / (periodsCount - 1) * 100) / 100;

    return {
      product: t.product,
      periods: t.periods,
      trend_analysis: {
        start_cost: earliest.total,
        end_cost: latest.total,
        total_reduction: Math.round(totalReduction * 100) / 100,
        reduction_pct: reductionPct,
        avg_reduction_per_period: avgReductionPerPeriod,
        trend: totalReduction > 0 ? 'improving' : totalReduction < 0 ? 'worsening' : 'stable',
      },
      latest_breakdown: {
        material_pct: Math.round(latest.material / latest.total * 1000) / 10,
        labor_pct: Math.round(latest.labor / latest.total * 1000) / 10,
        overhead_pct: Math.round(latest.overhead / latest.total * 1000) / 10,
      },
    };
  });

  return {
    total_products: results.length,
    cost_trends: results,
    summary: {
      all_improving: results.every(r => r.trend_analysis.trend === 'improving'),
      avg_reduction: Math.round(results.reduce((s, r) => s + r.trend_analysis.reduction_pct, 0) / Math.max(results.length, 1) * 10) / 10,
      best_improvement: results.reduce((b, r) => r.trend_analysis.reduction_pct > b.trend_analysis.reduction_pct ? r : b, results[0]),
    },
  };
}

function finDashboard(params: Record<string, unknown>): unknown {
  const currentPeriod = params.period as string || '2025-Q1';
  const priorPeriod = '2024-Q4';

  const current = PRODUCT_FINANCIALS.filter(f => f.period === currentPeriod);
  const prior = PRODUCT_FINANCIALS.filter(f => f.period === priorPeriod);

  const curRevenue = current.reduce((s, f) => s + f.selling_price * f.annual_volume, 0);
  const priorRevenue = prior.reduce((s, f) => s + f.selling_price * f.annual_volume, 0);
  const curCOGS = current.reduce((s, f) => s + (f.variable_cost + f.fixed_cost_allocated) * f.annual_volume, 0);
  const priorCOGS = prior.reduce((s, f) => s + (f.variable_cost + f.fixed_cost_allocated) * f.annual_volume, 0);
  const curGrossProfit = curRevenue - curCOGS;
  const priorGrossProfit = priorRevenue - priorCOGS;

  const totalUnits = current.reduce((s, f) => s + f.annual_volume, 0);
  const priorUnits = prior.reduce((s, f) => s + f.annual_volume, 0);

  return {
    period: currentPeriod,
    comparison_period: priorPeriod,
    revenue: {
      current: Math.round(curRevenue),
      prior: Math.round(priorRevenue),
      change_pct: Math.round((curRevenue - priorRevenue) / Math.max(priorRevenue, 1) * 1000) / 10,
    },
    cogs: {
      current: Math.round(curCOGS),
      prior: Math.round(priorCOGS),
      change_pct: Math.round((curCOGS - priorCOGS) / Math.max(priorCOGS, 1) * 1000) / 10,
    },
    gross_profit: {
      current: Math.round(curGrossProfit),
      prior: Math.round(priorGrossProfit),
      change_pct: Math.round((curGrossProfit - priorGrossProfit) / Math.max(Math.abs(priorGrossProfit), 1) * 1000) / 10,
    },
    margins: {
      current_gross_margin: Math.round(curGrossProfit / Math.max(curRevenue, 1) * 1000) / 10,
      prior_gross_margin: Math.round(priorGrossProfit / Math.max(priorRevenue, 1) * 1000) / 10,
    },
    volume: {
      current_units: totalUnits,
      prior_units: priorUnits,
      change_pct: Math.round((totalUnits - priorUnits) / Math.max(priorUnits, 1) * 1000) / 10,
    },
    fixed_costs: FIXED_COSTS,
    kpis: {
      revenue_per_unit: Math.round(curRevenue / Math.max(totalUnits, 1) * 100) / 100,
      cost_per_unit: Math.round(curCOGS / Math.max(totalUnits, 1) * 100) / 100,
      profit_per_unit: Math.round(curGrossProfit / Math.max(totalUnits, 1) * 100) / 100,
      fixed_cost_coverage: Math.round(curGrossProfit / (FIXED_COSTS.total_monthly * 3) * 100) / 100,
    },
  };
}

// ── Public Dispatcher ──────────────────────────────────────────────────────

export function executeFinancialMetricsAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case 'fin_margin':    return finMargin(params);
    case 'fin_breakeven': return finBreakeven(params);
    case 'fin_costunit':  return finCostUnit(params);
    case 'fin_dashboard': return finDashboard(params);
    default:
      return { error: `Unknown FinancialMetrics action: ${action}` };
  }
}
