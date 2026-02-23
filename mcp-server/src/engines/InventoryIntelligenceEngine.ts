/**
 * InventoryIntelligenceEngine — R22-MS2
 *
 * Stock tracking, reorder optimization, and demand forecasting for
 * tooling, raw materials, and consumables used in manufacturing.
 *
 * Actions:
 *   inv_status    — Current inventory status and alerts
 *   inv_forecast  — Demand forecasting based on usage history
 *   inv_reorder   — Reorder point calculation and recommendations
 *   inv_optimize  — Inventory optimization (ABC analysis, safety stock)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InventoryItem {
  item_id: string;
  name: string;
  category: string;         // tooling, raw_material, consumable, fixture
  unit: string;
  current_qty: number;
  min_qty?: number;
  max_qty?: number;
  unit_cost?: number;
  lead_time_days?: number;
  supplier?: string;
  last_reorder_date?: string;
  daily_usage_rate?: number;
}

interface StatusInput {
  items?: InventoryItem[];
  category_filter?: string;
  alert_threshold_days?: number;
}

interface ForecastInput {
  item_id: string;
  usage_history?: number[];    // daily usage values
  forecast_days: number;
  method?: string;             // moving_avg, exponential, linear
  seasonal_factor?: number;
}

interface ReorderInput {
  items: {
    item_id: string;
    current_qty: number;
    daily_usage_rate: number;
    lead_time_days: number;
    unit_cost: number;
    service_level_pct?: number;  // 90-99.9
  }[];
  order_cost?: number;           // fixed cost per order
}

interface OptimizeInput {
  items: {
    item_id: string;
    annual_usage: number;
    unit_cost: number;
    current_qty: number;
    lead_time_days?: number;
    daily_usage_rate?: number;
    demand_variability?: number;  // std dev of daily demand
  }[];
  holding_cost_pct?: number;     // % of item cost per year
  order_cost?: number;
}

// ---------------------------------------------------------------------------
// Seeded inventory data
// ---------------------------------------------------------------------------

function generateSeedInventory(): InventoryItem[] {
  return [
    { item_id: "TOOL-CARBIDE-INSERT-01", name: "Carbide Insert CNMG 120408", category: "tooling", unit: "pcs", current_qty: 45, min_qty: 20, max_qty: 200, unit_cost: 8.50, lead_time_days: 5, supplier: "Sandvik", daily_usage_rate: 4.2 },
    { item_id: "TOOL-CARBIDE-INSERT-02", name: "Carbide Insert WNMG 080408", category: "tooling", unit: "pcs", current_qty: 12, min_qty: 15, max_qty: 150, unit_cost: 9.20, lead_time_days: 5, supplier: "Sandvik", daily_usage_rate: 3.1 },
    { item_id: "TOOL-ENDMILL-01", name: "Solid Carbide Endmill 10mm 4F", category: "tooling", unit: "pcs", current_qty: 8, min_qty: 5, max_qty: 50, unit_cost: 42.00, lead_time_days: 7, supplier: "Kennametal", daily_usage_rate: 0.8 },
    { item_id: "TOOL-DRILL-01", name: "Carbide Drill 8.5mm", category: "tooling", unit: "pcs", current_qty: 22, min_qty: 10, max_qty: 100, unit_cost: 35.00, lead_time_days: 7, supplier: "Kennametal", daily_usage_rate: 1.5 },
    { item_id: "MAT-STEEL-4140", name: "AISI 4140 Round Bar 50mm", category: "raw_material", unit: "kg", current_qty: 850, min_qty: 200, max_qty: 2000, unit_cost: 2.80, lead_time_days: 14, supplier: "ThyssenKrupp", daily_usage_rate: 35 },
    { item_id: "MAT-STEEL-316L", name: "316L Stainless Round Bar 40mm", category: "raw_material", unit: "kg", current_qty: 120, min_qty: 100, max_qty: 1000, unit_cost: 6.50, lead_time_days: 21, supplier: "Outokumpu", daily_usage_rate: 12 },
    { item_id: "MAT-ALUM-7075", name: "7075-T6 Aluminum Plate 25mm", category: "raw_material", unit: "kg", current_qty: 340, min_qty: 100, max_qty: 800, unit_cost: 8.20, lead_time_days: 10, supplier: "Alcoa", daily_usage_rate: 18 },
    { item_id: "MAT-TITANIUM-64", name: "Ti-6Al-4V Round Bar 30mm", category: "raw_material", unit: "kg", current_qty: 45, min_qty: 20, max_qty: 200, unit_cost: 48.00, lead_time_days: 28, supplier: "VSMPO-AVISMA", daily_usage_rate: 2.5 },
    { item_id: "COOL-SEMI-SYN-01", name: "Semi-synthetic Coolant 5%", category: "consumable", unit: "liters", current_qty: 180, min_qty: 50, max_qty: 500, unit_cost: 3.20, lead_time_days: 3, supplier: "Castrol", daily_usage_rate: 8 },
    { item_id: "COOL-MQL-01", name: "MQL Lubricant", category: "consumable", unit: "liters", current_qty: 25, min_qty: 10, max_qty: 100, unit_cost: 12.50, lead_time_days: 5, supplier: "Fuchs", daily_usage_rate: 1.2 },
    { item_id: "FIX-VISE-01", name: "Precision Vise 6\" Jaw", category: "fixture", unit: "pcs", current_qty: 3, min_qty: 2, max_qty: 10, unit_cost: 450.00, lead_time_days: 14, supplier: "Kurt", daily_usage_rate: 0.01 },
    { item_id: "ABRASIVE-WHEEL-01", name: "Grinding Wheel 200x25 A60", category: "consumable", unit: "pcs", current_qty: 6, min_qty: 3, max_qty: 20, unit_cost: 28.00, lead_time_days: 7, supplier: "Norton", daily_usage_rate: 0.4 },
  ];
}

// ---------------------------------------------------------------------------
// inv_status — Current inventory status
// ---------------------------------------------------------------------------

function getStatus(input: StatusInput) {
  const { category_filter, alert_threshold_days = 7 } = input;
  let items = input.items ?? generateSeedInventory();

  if (category_filter) items = items.filter((i) => i.category === category_filter);

  const analyzed = items.map((item) => {
    const usage = item.daily_usage_rate ?? 0;
    const daysOfStock = usage > 0 ? item.current_qty / usage : Infinity;
    const leadTime = item.lead_time_days ?? 7;
    const belowMin = item.min_qty !== undefined && item.current_qty < item.min_qty;
    const daysUntilStockout = isFinite(daysOfStock) ? Math.round(daysOfStock * 10) / 10 : null;

    let alert: string | null = null;
    if (item.current_qty <= 0) alert = "out_of_stock";
    else if (belowMin) alert = "below_minimum";
    else if (daysOfStock <= leadTime) alert = "reorder_now";
    else if (daysOfStock <= leadTime + alert_threshold_days) alert = "reorder_soon";

    const inventoryValue = item.current_qty * (item.unit_cost ?? 0);

    return {
      item_id: item.item_id,
      name: item.name,
      category: item.category,
      current_qty: item.current_qty,
      unit: item.unit,
      days_of_stock: daysUntilStockout,
      alert,
      below_minimum: belowMin,
      inventory_value: Math.round(inventoryValue * 100) / 100,
    };
  });

  const alerts = analyzed.filter((a) => a.alert !== null);
  const totalValue = analyzed.reduce((s, a) => s + a.inventory_value, 0);

  const categorySummary: Record<string, { count: number; value: number; alerts: number }> = {};
  for (const item of analyzed) {
    if (!categorySummary[item.category])
      categorySummary[item.category] = { count: 0, value: 0, alerts: 0 };
    categorySummary[item.category].count++;
    categorySummary[item.category].value += item.inventory_value;
    if (item.alert) categorySummary[item.category].alerts++;
  }

  return {
    total_items: analyzed.length,
    total_inventory_value: Math.round(totalValue * 100) / 100,
    alerts_count: alerts.length,
    alerts_breakdown: {
      out_of_stock: alerts.filter((a) => a.alert === "out_of_stock").length,
      below_minimum: alerts.filter((a) => a.alert === "below_minimum").length,
      reorder_now: alerts.filter((a) => a.alert === "reorder_now").length,
      reorder_soon: alerts.filter((a) => a.alert === "reorder_soon").length,
    },
    category_summary: categorySummary,
    items: analyzed,
    recommendations: [
      ...alerts.filter((a) => a.alert === "out_of_stock").map((a) => `URGENT: ${a.item_id} out of stock — expedite order`),
      ...alerts.filter((a) => a.alert === "reorder_now").map((a) => `Reorder ${a.item_id} immediately — ${a.days_of_stock} days remaining`),
      ...alerts.filter((a) => a.alert === "below_minimum").map((a) => `${a.item_id} below minimum — place order`),
    ],
  };
}

// ---------------------------------------------------------------------------
// inv_forecast — Demand forecasting
// ---------------------------------------------------------------------------

function forecastDemand(input: ForecastInput) {
  const {
    item_id,
    forecast_days,
    method = "exponential",
    seasonal_factor = 1.0,
  } = input;

  // Generate or use provided usage history (last 30 days)
  const hash = item_id.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const seed = Math.abs(hash) % 1000;
  const baseUsage = 5 + (seed % 40);

  const history = input.usage_history ?? Array.from({ length: 30 }, (_, i) => {
    const noise = ((seed + i * 7) % 11 - 5) / 10;
    const trend = i * 0.02;
    return Math.max(0, Math.round((baseUsage + baseUsage * noise + trend) * 10) / 10);
  });

  // Forecasting methods
  let forecast: number[];
  const n = history.length;

  switch (method) {
    case "moving_avg": {
      const windowSize = Math.min(7, n);
      const recentAvg = history.slice(-windowSize).reduce((s, v) => s + v, 0) / windowSize;
      forecast = Array.from({ length: forecast_days }, () =>
        Math.round(recentAvg * seasonal_factor * 10) / 10
      );
      break;
    }
    case "linear": {
      // Simple linear regression
      const sumX = history.reduce((s, _, i) => s + i, 0);
      const sumY = history.reduce((s, v) => s + v, 0);
      const sumXY = history.reduce((s, v, i) => s + i * v, 0);
      const sumXX = history.reduce((s, _, i) => s + i * i, 0);
      const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
      const intercept = (sumY - slope * sumX) / n;
      forecast = Array.from({ length: forecast_days }, (_, i) =>
        Math.round(Math.max(0, (intercept + slope * (n + i)) * seasonal_factor) * 10) / 10
      );
      break;
    }
    case "exponential":
    default: {
      const alpha = 0.3;
      let smoothed = history[0];
      for (const val of history) {
        smoothed = alpha * val + (1 - alpha) * smoothed;
      }
      forecast = Array.from({ length: forecast_days }, () =>
        Math.round(smoothed * seasonal_factor * 10) / 10
      );
      break;
    }
  }

  const totalForecast = forecast.reduce((s, v) => s + v, 0);
  const avgDaily = totalForecast / forecast_days;
  const historyAvg = history.reduce((s, v) => s + v, 0) / n;
  const trendDirection = avgDaily > historyAvg * 1.05 ? "increasing" : avgDaily < historyAvg * 0.95 ? "decreasing" : "stable";

  return {
    item_id,
    method,
    seasonal_factor,
    history_days: n,
    forecast_days,
    history_summary: {
      avg_daily: Math.round(historyAvg * 10) / 10,
      min_daily: Math.round(Math.min(...history) * 10) / 10,
      max_daily: Math.round(Math.max(...history) * 10) / 10,
      std_dev: Math.round(Math.sqrt(history.reduce((s, v) => s + (v - historyAvg) ** 2, 0) / n) * 10) / 10,
    },
    forecast_summary: {
      avg_daily: Math.round(avgDaily * 10) / 10,
      total_forecast: Math.round(totalForecast * 10) / 10,
      trend: trendDirection,
    },
    daily_forecast: forecast.slice(0, Math.min(30, forecast_days)),
  };
}

// ---------------------------------------------------------------------------
// inv_reorder — Reorder point calculation
// ---------------------------------------------------------------------------

function calculateReorder(input: ReorderInput) {
  const { items, order_cost = 25 } = input;

  const analysis = items.map((item) => {
    const serviceLevel = (item.service_level_pct ?? 95) / 100;
    // Z-score approximation for service level
    const zScores: Record<number, number> = { 0.90: 1.28, 0.95: 1.65, 0.975: 1.96, 0.99: 2.33, 0.999: 3.09 };
    const z = zScores[serviceLevel] ?? 1.65;

    // Demand variability estimate (20% of average if not provided)
    const demandStdDev = item.daily_usage_rate * 0.20;

    // Reorder point = (daily usage × lead time) + safety stock
    const avgLeadDemand = item.daily_usage_rate * item.lead_time_days;
    const safetyStock = Math.ceil(z * demandStdDev * Math.sqrt(item.lead_time_days));
    const reorderPoint = Math.ceil(avgLeadDemand + safetyStock);

    // Economic Order Quantity (EOQ)
    const annualDemand = item.daily_usage_rate * 365;
    const holdingCost = item.unit_cost * 0.25; // 25% holding cost
    const eoq = Math.ceil(Math.sqrt((2 * annualDemand * order_cost) / holdingCost));

    // Days until reorder
    const daysUntilReorder = item.current_qty > reorderPoint
      ? Math.round((item.current_qty - reorderPoint) / item.daily_usage_rate * 10) / 10
      : 0;

    return {
      item_id: item.item_id,
      current_qty: item.current_qty,
      daily_usage_rate: item.daily_usage_rate,
      lead_time_days: item.lead_time_days,
      reorder_point: reorderPoint,
      safety_stock: safetyStock,
      economic_order_qty: eoq,
      needs_reorder: item.current_qty <= reorderPoint,
      days_until_reorder: daysUntilReorder,
      annual_order_cost: Math.round((annualDemand / eoq) * order_cost * 100) / 100,
      annual_holding_cost: Math.round((eoq / 2) * holdingCost * 100) / 100,
    };
  });

  const needReorder = analysis.filter((a) => a.needs_reorder);

  return {
    total_items: items.length,
    items_needing_reorder: needReorder.length,
    order_cost_per_order: order_cost,
    analysis,
    immediate_orders: needReorder.map((a) => ({
      item_id: a.item_id,
      recommended_qty: a.economic_order_qty,
      estimated_cost: Math.round(a.economic_order_qty * items.find((i) => i.item_id === a.item_id)!.unit_cost * 100) / 100,
    })),
  };
}

// ---------------------------------------------------------------------------
// inv_optimize — Inventory optimization (ABC + safety stock)
// ---------------------------------------------------------------------------

function optimizeInventory(input: OptimizeInput) {
  const { items, holding_cost_pct = 25, order_cost = 25 } = input;

  // ABC Analysis by annual value
  const withValue = items.map((item) => ({
    ...item,
    annual_value: item.annual_usage * item.unit_cost,
  }));
  const totalValue = withValue.reduce((s, i) => s + i.annual_value, 0);
  const sorted = [...withValue].sort((a, b) => b.annual_value - a.annual_value);

  let cumPct = 0;
  const abcClassified = sorted.map((item) => {
    cumPct += totalValue > 0 ? (item.annual_value / totalValue) * 100 : 0;
    let classification: string;
    if (cumPct <= 80) classification = "A";
    else if (cumPct <= 95) classification = "B";
    else classification = "C";

    // EOQ
    const holdingCostPerUnit = item.unit_cost * (holding_cost_pct / 100);
    const eoq = Math.ceil(Math.sqrt((2 * item.annual_usage * order_cost) / holdingCostPerUnit));

    // Safety stock
    const dailyUsage = item.daily_usage_rate ?? item.annual_usage / 365;
    const leadTime = item.lead_time_days ?? 7;
    const demandVar = item.demand_variability ?? dailyUsage * 0.20;
    const z = classification === "A" ? 2.33 : classification === "B" ? 1.65 : 1.28;
    const safetyStock = Math.ceil(z * demandVar * Math.sqrt(leadTime));

    // Inventory turns
    const avgInventory = (eoq / 2) + safetyStock;
    const turns = avgInventory > 0 ? Math.round((item.annual_usage / avgInventory) * 10) / 10 : 0;

    // Current vs optimal comparison
    const currentHoldingCost = item.current_qty * holdingCostPerUnit;
    const optimalHoldingCost = avgInventory * holdingCostPerUnit;
    const savingsPotential = Math.max(0, currentHoldingCost - optimalHoldingCost);

    return {
      item_id: item.item_id,
      abc_class: classification,
      annual_value: Math.round(item.annual_value * 100) / 100,
      cumulative_pct: Math.round(cumPct * 10) / 10,
      current_qty: item.current_qty,
      optimal_eoq: eoq,
      safety_stock: safetyStock,
      optimal_avg_inventory: Math.round(avgInventory),
      inventory_turns: turns,
      savings_potential: Math.round(savingsPotential * 100) / 100,
    };
  });

  const classSummary: Record<string, { count: number; value_pct: number; items: string[] }> = {
    A: { count: 0, value_pct: 0, items: [] },
    B: { count: 0, value_pct: 0, items: [] },
    C: { count: 0, value_pct: 0, items: [] },
  };
  for (const item of abcClassified) {
    classSummary[item.abc_class].count++;
    classSummary[item.abc_class].value_pct += totalValue > 0 ? (item.annual_value / totalValue) * 100 : 0;
    classSummary[item.abc_class].items.push(item.item_id);
  }
  for (const cls of Object.values(classSummary)) {
    cls.value_pct = Math.round(cls.value_pct * 10) / 10;
  }

  const totalSavings = abcClassified.reduce((s, i) => s + i.savings_potential, 0);

  return {
    total_items: items.length,
    total_annual_value: Math.round(totalValue * 100) / 100,
    holding_cost_pct,
    abc_summary: classSummary,
    total_savings_potential: Math.round(totalSavings * 100) / 100,
    items: abcClassified,
    recommendations: [
      `Class A items (${classSummary.A.count}): tight control, frequent review, high service level`,
      `Class B items (${classSummary.B.count}): moderate control, periodic review`,
      `Class C items (${classSummary.C.count}): simple controls, bulk ordering preferred`,
      ...(totalSavings > 100 ? [`Potential annual savings: $${Math.round(totalSavings)} by optimizing inventory levels`] : []),
    ],
  };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function executeInventoryIntelligenceAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case "inv_status":
      return getStatus(params as unknown as StatusInput);
    case "inv_forecast":
      return forecastDemand(params as unknown as ForecastInput);
    case "inv_reorder":
      return calculateReorder(params as unknown as ReorderInput);
    case "inv_optimize":
      return optimizeInventory(params as unknown as OptimizeInput);
    default:
      throw new Error(`InventoryIntelligenceEngine: unknown action "${action}"`);
  }
}
