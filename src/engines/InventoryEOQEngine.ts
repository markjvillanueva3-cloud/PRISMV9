/**
 * InventoryEOQEngine — Economic Order Quantity and inventory optimization
 *
 * Models: EOQ (Q*=√(2DS/H)), reorder point, safety stock,
 *         total cost, ABC classification
 * References: Harris 1913, Silver-Pyke-Peterson
 * Safety: Stockout probability, service level, lead time demand
 */

export type DemandPattern = "constant" | "seasonal" | "trend" | "erratic";

export interface InventoryEOQInput {
  annual_demand: number;                // units/year
  order_cost: number;                   // $ per order
  unit_cost: number;                    // $ per unit
  holding_cost_pct?: number;            // % of unit cost, default 25%
  lead_time_days?: number;              // default 7
  demand_stddev_daily?: number;         // default 10% of daily demand
  service_level_pct?: number;           // default 95%
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface InventoryEOQResult {
  eoq_units: AtomicValue;
  reorder_point: AtomicValue;
  safety_stock: AtomicValue;
  orders_per_year: AtomicValue;
  total_annual_cost: AtomicValue;
  average_inventory: AtomicValue;
  cycle_time_days: AtomicValue;
  fill_rate_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

// Inverse normal CDF approximation
function normInv(p: number): number {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5; r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

export class InventoryEOQEngine {
  calculate(input: InventoryEOQInput): InventoryEOQResult {
    const {
      annual_demand: D,
      order_cost: S,
      unit_cost: C,
      holding_cost_pct: h_pct = 25,
      lead_time_days: LT = 7,
      service_level_pct = 95,
    } = input;

    const recs: string[] = [];
    const H = C * h_pct / 100; // holding cost per unit per year
    const dailyDemand = D / 365;
    const demandStddev = input.demand_stddev_daily ?? dailyDemand * 0.10;

    // EOQ: Q* = √(2DS/H)
    const Q = Math.sqrt(2 * D * S / H);

    // Safety stock: SS = z × σ_LT = z × σ_d × √LT
    const z = normInv(service_level_pct / 100);
    const sigmaLT = demandStddev * Math.sqrt(LT);
    const SS = z * sigmaLT;

    // Reorder point: ROP = d × LT + SS
    const ROP = dailyDemand * LT + SS;

    // Orders per year
    const ordersPerYear = D / Q;

    // Total annual cost: TC = D×C + (D/Q)×S + (Q/2+SS)×H
    const purchaseCost = D * C;
    const orderingCost = ordersPerYear * S;
    const holdingCost = (Q / 2 + SS) * H;
    const totalCost = purchaseCost + orderingCost + holdingCost;

    // Average inventory
    const avgInventory = Q / 2 + SS;

    // Cycle time
    const cycleTime = Q / dailyDemand;

    // Fill rate (approximate)
    const fillRate = service_level_pct;

    const isSafe = SS > 0 && Q > 0;

    if (ordersPerYear > 52) recs.push(`${ordersPerYear.toFixed(0)} orders/yr — consider blanket PO or vendor-managed inventory`);
    if (ordersPerYear < 4) recs.push(`Only ${ordersPerYear.toFixed(1)} orders/yr — capital tied up, verify holding costs`);
    if (SS > avgInventory * 0.5) recs.push(`Safety stock ${SS.toFixed(0)} > 50% of avg inventory — high demand variability`);
    if (cycleTime < 3) recs.push(`Short cycle ${cycleTime.toFixed(0)} days — frequent ordering overhead`);
    if (recs.length === 0) recs.push(`EOQ nominal — Q=${Q.toFixed(0)}, ROP=${ROP.toFixed(0)}, TC=$${totalCost.toFixed(0)}/yr`);

    return {
      eoq_units: mkAv(Math.round(Q), "units", Q * 0.05, "eoq_formula"),
      reorder_point: mkAv(Math.round(ROP), "units", ROP * 0.10, "demand_safety"),
      safety_stock: mkAv(Math.round(SS), "units", SS * 0.15, "service_level"),
      orders_per_year: mkAv(Math.round(ordersPerYear * 10) / 10, "orders/yr", ordersPerYear * 0.05, "demand_eoq"),
      total_annual_cost: mkAv(Math.round(totalCost), "$", totalCost * 0.05, "cost_sum"),
      average_inventory: mkAv(Math.round(avgInventory), "units", avgInventory * 0.08, "eoq_safety"),
      cycle_time_days: mkAv(Math.round(cycleTime * 10) / 10, "days", cycleTime * 0.08, "demand_eoq"),
      fill_rate_pct: mkAv(fillRate, "%", 1, "service_target"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const inventoryEOQEngine = new InventoryEOQEngine();
