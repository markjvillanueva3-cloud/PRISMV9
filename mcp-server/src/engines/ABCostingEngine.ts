/**
 * ABCostingEngine — activity-based costing, cost drivers, cost pool allocation
 * Phase R31-MS3: Cost Accounting & Financial Intelligence
 *
 * Actions:
 *   abc_activity  — activity definition and cost assignment
 *   abc_driver    — cost driver analysis and rates
 *   abc_allocate  — cost pool allocation to products
 *   abc_product   — product-level ABC cost summary
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface Activity {
  id: string;
  name: string;
  cost_pool: string;
  annual_cost: number;
  cost_driver: string;
  driver_volume: number;
  rate_per_driver: number;
}

interface CostDriver {
  id: string;
  name: string;
  unit: string;
  total_volume: number;
  products: { product: string; volume: number }[];
}

interface ProductABC {
  product: string;
  description: string;
  annual_units: number;
  activities: { activity: string; driver_qty: number; cost: number }[];
}

// ── Sample Data ────────────────────────────────────────────────────────────

const ACTIVITIES: Activity[] = [
  { id: 'ACT-01', name: 'Machine Setup', cost_pool: 'Setup', annual_cost: 180000, cost_driver: 'Setup Hours', driver_volume: 3000, rate_per_driver: 60.00 },
  { id: 'ACT-02', name: 'Material Handling', cost_pool: 'Logistics', annual_cost: 120000, cost_driver: 'Material Moves', driver_volume: 8000, rate_per_driver: 15.00 },
  { id: 'ACT-03', name: 'Quality Inspection', cost_pool: 'Quality', annual_cost: 95000, cost_driver: 'Inspection Hours', driver_volume: 2500, rate_per_driver: 38.00 },
  { id: 'ACT-04', name: 'Machine Running', cost_pool: 'Production', annual_cost: 450000, cost_driver: 'Machine Hours', driver_volume: 15000, rate_per_driver: 30.00 },
  { id: 'ACT-05', name: 'Engineering Support', cost_pool: 'Engineering', annual_cost: 200000, cost_driver: 'Engineering Hours', driver_volume: 4000, rate_per_driver: 50.00 },
  { id: 'ACT-06', name: 'Purchasing & Procurement', cost_pool: 'Procurement', annual_cost: 85000, cost_driver: 'Purchase Orders', driver_volume: 2000, rate_per_driver: 42.50 },
  { id: 'ACT-07', name: 'Shipping & Packaging', cost_pool: 'Distribution', annual_cost: 110000, cost_driver: 'Shipments', driver_volume: 3500, rate_per_driver: 31.43 },
];

const COST_DRIVERS: CostDriver[] = [
  { id: 'DRV-01', name: 'Setup Hours', unit: 'hours', total_volume: 3000, products: [
    { product: 'PMP-ASSY-001', volume: 1200 }, { product: 'VLV-ASSY-001', volume: 900 }, { product: 'FTG-ASSY-001', volume: 900 },
  ]},
  { id: 'DRV-02', name: 'Material Moves', unit: 'moves', total_volume: 8000, products: [
    { product: 'PMP-ASSY-001', volume: 3200 }, { product: 'VLV-ASSY-001', volume: 2400 }, { product: 'FTG-ASSY-001', volume: 2400 },
  ]},
  { id: 'DRV-03', name: 'Inspection Hours', unit: 'hours', total_volume: 2500, products: [
    { product: 'PMP-ASSY-001', volume: 1200 }, { product: 'VLV-ASSY-001', volume: 800 }, { product: 'FTG-ASSY-001', volume: 500 },
  ]},
  { id: 'DRV-04', name: 'Machine Hours', unit: 'hours', total_volume: 15000, products: [
    { product: 'PMP-ASSY-001', volume: 6000 }, { product: 'VLV-ASSY-001', volume: 5000 }, { product: 'FTG-ASSY-001', volume: 4000 },
  ]},
  { id: 'DRV-05', name: 'Engineering Hours', unit: 'hours', total_volume: 4000, products: [
    { product: 'PMP-ASSY-001', volume: 2000 }, { product: 'VLV-ASSY-001', volume: 1200 }, { product: 'FTG-ASSY-001', volume: 800 },
  ]},
];

const PRODUCT_ABC: ProductABC[] = [
  {
    product: 'PMP-ASSY-001', description: 'Complete Pump Assembly', annual_units: 5000,
    activities: [
      { activity: 'Machine Setup', driver_qty: 1200, cost: 72000 },
      { activity: 'Material Handling', driver_qty: 3200, cost: 48000 },
      { activity: 'Quality Inspection', driver_qty: 1200, cost: 45600 },
      { activity: 'Machine Running', driver_qty: 6000, cost: 180000 },
      { activity: 'Engineering Support', driver_qty: 2000, cost: 100000 },
    ],
  },
  {
    product: 'VLV-ASSY-001', description: 'Valve Assembly', annual_units: 3000,
    activities: [
      { activity: 'Machine Setup', driver_qty: 900, cost: 54000 },
      { activity: 'Material Handling', driver_qty: 2400, cost: 36000 },
      { activity: 'Quality Inspection', driver_qty: 800, cost: 30400 },
      { activity: 'Machine Running', driver_qty: 5000, cost: 150000 },
      { activity: 'Engineering Support', driver_qty: 1200, cost: 60000 },
    ],
  },
  {
    product: 'FTG-ASSY-001', description: 'Fitting Assembly', annual_units: 8000,
    activities: [
      { activity: 'Machine Setup', driver_qty: 900, cost: 54000 },
      { activity: 'Material Handling', driver_qty: 2400, cost: 36000 },
      { activity: 'Quality Inspection', driver_qty: 500, cost: 19000 },
      { activity: 'Machine Running', driver_qty: 4000, cost: 120000 },
      { activity: 'Engineering Support', driver_qty: 800, cost: 40000 },
    ],
  },
];

// ── Action Implementations ─────────────────────────────────────────────────

function abcActivity(params: Record<string, unknown>): unknown {
  const costPool = params.cost_pool as string | undefined;

  let activities = ACTIVITIES;
  if (costPool) activities = activities.filter(a => a.cost_pool.toLowerCase().includes((costPool as string).toLowerCase()));

  const totalCost = activities.reduce((s, a) => s + a.annual_cost, 0);

  return {
    total_activities: activities.length,
    activities: activities.map(a => ({
      ...a,
      cost_pct: Math.round(a.annual_cost / totalCost * 1000) / 10,
    })),
    summary: {
      total_annual_cost: totalCost,
      cost_pools: [...new Set(activities.map(a => a.cost_pool))].length,
      avg_activity_cost: Math.round(totalCost / Math.max(activities.length, 1)),
    },
  };
}

function abcDriver(params: Record<string, unknown>): unknown {
  const driverName = params.driver_name as string | undefined;

  let drivers = COST_DRIVERS;
  if (driverName) drivers = drivers.filter(d => d.name.toLowerCase().includes((driverName as string).toLowerCase()));

  const results = drivers.map(d => {
    const activity = ACTIVITIES.find(a => a.cost_driver === d.name);
    return {
      ...d,
      cost_per_driver: activity ? activity.rate_per_driver : 0,
      total_cost: activity ? activity.annual_cost : 0,
      product_breakdown: d.products.map(p => ({
        product: p.product,
        volume: p.volume,
        pct_of_total: Math.round(p.volume / d.total_volume * 1000) / 10,
        allocated_cost: activity ? Math.round(p.volume * activity.rate_per_driver * 100) / 100 : 0,
      })),
    };
  });

  return {
    total_drivers: results.length,
    drivers: results,
    summary: {
      total_driver_volume: drivers.reduce((s, d) => s + d.total_volume, 0),
      total_cost_allocated: results.reduce((s, r) => s + r.total_cost, 0),
    },
  };
}

function abcAllocate(params: Record<string, unknown>): unknown {
  const product = params.product as string | undefined;

  let products = PRODUCT_ABC;
  if (product) products = products.filter(p => p.product === product);

  const results = products.map(p => {
    const totalOverhead = p.activities.reduce((s, a) => s + a.cost, 0);
    const costPerUnit = Math.round(totalOverhead / p.annual_units * 100) / 100;
    return {
      product: p.product,
      description: p.description,
      annual_units: p.annual_units,
      activity_costs: p.activities,
      total_overhead: totalOverhead,
      overhead_per_unit: costPerUnit,
      top_cost_activity: p.activities.reduce((top, a) => a.cost > top.cost ? a : top, p.activities[0]),
    };
  });

  const grandTotal = results.reduce((s, r) => s + r.total_overhead, 0);

  return {
    total_products: results.length,
    allocations: results,
    summary: {
      total_overhead_allocated: grandTotal,
      avg_overhead_per_unit: Math.round(grandTotal / results.reduce((s, r) => s + r.annual_units, 0) * 100) / 100,
      highest_cost_product: results.reduce((h, r) => r.overhead_per_unit > h.overhead_per_unit ? r : h, results[0]),
    },
  };
}

function abcProduct(params: Record<string, unknown>): unknown {
  const product = params.product as string | undefined;

  let products = PRODUCT_ABC;
  if (product) products = products.filter(p => p.product === product);

  // Merge with traditional costs for complete picture
  const traditionalRates: Record<string, { material: number; labor: number }> = {
    'PMP-ASSY-001': { material: 150.50, labor: 67.50 },
    'VLV-ASSY-001': { material: 85.00, labor: 42.00 },
    'FTG-ASSY-001': { material: 28.00, labor: 18.50 },
  };

  const results = products.map(p => {
    const totalABCOverhead = p.activities.reduce((s, a) => s + a.cost, 0);
    const abcOverheadPerUnit = Math.round(totalABCOverhead / p.annual_units * 100) / 100;
    const trad = traditionalRates[p.product] || { material: 0, labor: 0 };
    const totalABCCost = trad.material + trad.labor + abcOverheadPerUnit;

    // Traditional overhead at plant-wide rate ($36/unit)
    const traditionalOverhead = 36.00;
    const traditionalTotal = trad.material + trad.labor + traditionalOverhead;

    return {
      product: p.product,
      description: p.description,
      annual_units: p.annual_units,
      abc_costing: {
        material: trad.material,
        labor: trad.labor,
        overhead: abcOverheadPerUnit,
        total: Math.round(totalABCCost * 100) / 100,
      },
      traditional_costing: {
        material: trad.material,
        labor: trad.labor,
        overhead: traditionalOverhead,
        total: Math.round(traditionalTotal * 100) / 100,
      },
      cost_difference: Math.round((totalABCCost - traditionalTotal) * 100) / 100,
      abc_vs_traditional: totalABCCost > traditionalTotal ? 'ABC higher — traditional undercosted' : 'ABC lower — traditional overcosted',
    };
  });

  return {
    total_products: results.length,
    product_costs: results,
    summary: {
      products_undercosted: results.filter(r => r.cost_difference > 0).length,
      products_overcosted: results.filter(r => r.cost_difference < 0).length,
      max_distortion: results.reduce((m, r) => Math.abs(r.cost_difference) > Math.abs(m.cost_difference) ? r : m, results[0]),
    },
  };
}

// ── Public Dispatcher ──────────────────────────────────────────────────────

export function executeABCostingAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case 'abc_activity': return abcActivity(params);
    case 'abc_driver':   return abcDriver(params);
    case 'abc_allocate': return abcAllocate(params);
    case 'abc_product':  return abcProduct(params);
    default:
      return { error: `Unknown ABCosting action: ${action}` };
  }
}
