/**
 * InventoryReorderPointFormula — EOQ + Safety Stock + Reorder Point
 * (hotel iter13, 2026-05-24, U-INVENTORY-ROP-FORMULA).
 *
 * Four pure surfaces for any ERP/MRP/inventory-policy work:
 *
 *   1. economicOrderQuantity(annualDemand, orderCost, holdingCost)
 *      Wilson 1934 EOQ:   Q* = sqrt( 2·D·S / H )
 *
 *   2. safetyStock(stdDevDemand, leadTimeDays, serviceLevel)
 *      Brown 1959 safety-stock under normally-distributed demand:
 *          SS = z(serviceLevel) · σ_d · sqrt(LT)
 *      z(0.95)=1.6449, z(0.975)=1.9600, z(0.99)=2.3263 (canonical).
 *
 *   3. reorderPoint(avgDailyDemand, leadTimeDays, safetyStock)
 *      ROP = d̄ · LT + SS
 *
 *   4. totalInventoryCost(annualDemand, orderCost, holdingCost, orderQuantity)
 *      TC(Q) = (D/Q)·S + (Q/2)·H + (D·purchase_price omitted — pure model)
 *      Minimized at Q = EOQ; useful for sensitivity analysis at non-optimal Q.
 *
 * Hotel-soul:
 *   - **R12 fail-loud** on every bad input (NaN / negative / zero where invalid)
 *   - **deterministic** — no PRNG, no clock, no I/O
 *   - **named constants** for service-level z-table + Wilson's 2-factor
 *
 * Reference: Silver/Pyke/Peterson "Inventory Management and Production
 * Planning and Scheduling" 3e (Wiley 1998), Ch. 5 (Wilson EOQ) and Ch. 7
 * (Safety Stock / Reorder Point). z-table values from NIST/Sematech handbook.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReorderPolicy {
  eoq: number;
  safety_stock: number;
  reorder_point: number;
  avg_daily_demand: number;
  service_level: number;
  z_score: number;
  std_dev_demand: number;
  lead_time_days: number;
  expected_orders_per_year: number;
  expected_days_between_orders: number;
}

// ─── Constants (named — z-table for common service levels) ──────────────────

const WILSON_FACTOR = 2;
const DAYS_PER_YEAR = 365;
const CANONICAL_Z_TABLE: ReadonlyArray<{ service_level: number; z: number }> = [
  { service_level: 0.50, z: 0.0000 },
  { service_level: 0.80, z: 0.8416 },
  { service_level: 0.85, z: 1.0364 },
  { service_level: 0.90, z: 1.2816 },
  { service_level: 0.95, z: 1.6449 },
  { service_level: 0.975, z: 1.9600 },
  { service_level: 0.99, z: 2.3263 },
  { service_level: 0.995, z: 2.5758 },
  { service_level: 0.999, z: 3.0902 },
];
const MIN_SERVICE_LEVEL = 0.50;
const MAX_SERVICE_LEVEL = 0.999;

// ─── Helpers ────────────────────────────────────────────────────────────────

function assertPositive(x: number, label: string): void {
  if (!Number.isFinite(x)) throw new Error(`${label}: must be finite (got ${x})`);
  if (x <= 0) throw new Error(`${label}: must be > 0 (got ${x})`);
}

function assertNonNegative(x: number, label: string): void {
  if (!Number.isFinite(x)) throw new Error(`${label}: must be finite (got ${x})`);
  if (x < 0) throw new Error(`${label}: must be >= 0 (got ${x})`);
}

function assertServiceLevel(sl: number): void {
  if (!Number.isFinite(sl)) throw new Error(`service_level: must be finite (got ${sl})`);
  if (sl < MIN_SERVICE_LEVEL || sl > MAX_SERVICE_LEVEL) {
    throw new Error(`service_level: must be in [${MIN_SERVICE_LEVEL}, ${MAX_SERVICE_LEVEL}] (got ${sl})`);
  }
}

/**
 * Look up z-score from canonical table with linear interpolation between
 * neighboring rows. Defensible for ERP use; not a full normal-quantile fn.
 */
function zScoreFromServiceLevel(sl: number): number {
  assertServiceLevel(sl);
  // Exact-match short-circuit
  for (const row of CANONICAL_Z_TABLE) {
    if (Math.abs(row.service_level - sl) < 1e-9) return row.z;
  }
  // Linear interpolation between bracketing rows
  for (let i = 0; i < CANONICAL_Z_TABLE.length - 1; i++) {
    const lo = CANONICAL_Z_TABLE[i];
    const hi = CANONICAL_Z_TABLE[i + 1];
    if (sl >= lo.service_level && sl <= hi.service_level) {
      const t = (sl - lo.service_level) / (hi.service_level - lo.service_level);
      return lo.z + t * (hi.z - lo.z);
    }
  }
  // Bounds-check passed but no bracketing pair → unreachable
  throw new Error(`zScoreFromServiceLevel: no bracket for ${sl}`);
}

// ─── Surface 1: Economic Order Quantity (Wilson 1934) ───────────────────────

/**
 * Wilson 1934 EOQ: Q* = sqrt(2·D·S / H).
 *
 * @param annualDemand D — units demanded per year (> 0)
 * @param orderCost S — fixed cost per order, $/order (> 0)
 * @param holdingCost H — annual holding cost per unit, $/unit/year (> 0)
 * @returns optimal order quantity in units
 */
export function economicOrderQuantity(
  annualDemand: number,
  orderCost: number,
  holdingCost: number,
): number {
  assertPositive(annualDemand, "EOQ.annualDemand");
  assertPositive(orderCost, "EOQ.orderCost");
  assertPositive(holdingCost, "EOQ.holdingCost");
  return Math.sqrt((WILSON_FACTOR * annualDemand * orderCost) / holdingCost);
}

// ─── Surface 2: Safety Stock (Brown 1959 z-score model) ─────────────────────

/**
 * Safety stock under normally-distributed lead-time demand:
 *     SS = z(serviceLevel) · σ_d · sqrt(LT)
 *
 * @param stdDevDemand σ_d — std dev of daily demand (>= 0)
 * @param leadTimeDays LT — replenishment lead time in days (> 0)
 * @param serviceLevel — desired cycle service level in [0.50, 0.999]
 */
export function safetyStock(
  stdDevDemand: number,
  leadTimeDays: number,
  serviceLevel: number,
): number {
  assertNonNegative(stdDevDemand, "safetyStock.stdDevDemand");
  assertPositive(leadTimeDays, "safetyStock.leadTimeDays");
  assertServiceLevel(serviceLevel);
  const z = zScoreFromServiceLevel(serviceLevel);
  return z * stdDevDemand * Math.sqrt(leadTimeDays);
}

// ─── Surface 3: Reorder Point ───────────────────────────────────────────────

/**
 * ROP = d̄ · LT + SS.
 *
 * @param avgDailyDemand d̄ — mean daily demand (> 0)
 * @param leadTimeDays LT — replenishment lead time (> 0)
 * @param safetyStockUnits SS — pre-computed safety stock (>= 0)
 */
export function reorderPoint(
  avgDailyDemand: number,
  leadTimeDays: number,
  safetyStockUnits: number,
): number {
  assertPositive(avgDailyDemand, "reorderPoint.avgDailyDemand");
  assertPositive(leadTimeDays, "reorderPoint.leadTimeDays");
  assertNonNegative(safetyStockUnits, "reorderPoint.safetyStockUnits");
  return avgDailyDemand * leadTimeDays + safetyStockUnits;
}

// ─── Surface 4: Total Inventory Cost (sensitivity / non-optimal Q) ──────────

/**
 * TC(Q) = (D/Q)·S + (Q/2)·H. Excludes purchase cost (D·price) — that's
 * Q-invariant under the basic EOQ model and obscures the trade-off.
 *
 * @param annualDemand D
 * @param orderCost S
 * @param holdingCost H
 * @param orderQuantity Q — actual quantity (use EOQ for optimum)
 */
export function totalInventoryCost(
  annualDemand: number,
  orderCost: number,
  holdingCost: number,
  orderQuantity: number,
): number {
  assertPositive(annualDemand, "TC.annualDemand");
  assertPositive(orderCost, "TC.orderCost");
  assertPositive(holdingCost, "TC.holdingCost");
  assertPositive(orderQuantity, "TC.orderQuantity");
  const orderingCost = (annualDemand / orderQuantity) * orderCost;
  const holdingCostTotal = (orderQuantity / 2) * holdingCost;
  return orderingCost + holdingCostTotal;
}

// ─── Convenience: full reorder policy in one call ───────────────────────────

/**
 * Aggregate the four surfaces into one ReorderPolicy row, useful for ERP /
 * MRP cards. All inputs validated by the underlying surfaces.
 */
export function reorderPolicy(input: {
  annualDemand: number;
  orderCost: number;
  holdingCost: number;
  avgDailyDemand: number;
  stdDevDemand: number;
  leadTimeDays: number;
  serviceLevel: number;
}): ReorderPolicy {
  const eoq = economicOrderQuantity(input.annualDemand, input.orderCost, input.holdingCost);
  const ss = safetyStock(input.stdDevDemand, input.leadTimeDays, input.serviceLevel);
  const rop = reorderPoint(input.avgDailyDemand, input.leadTimeDays, ss);
  const ordersPerYear = input.annualDemand / eoq;
  const daysBetween = DAYS_PER_YEAR / ordersPerYear;
  return {
    eoq,
    safety_stock: ss,
    reorder_point: rop,
    avg_daily_demand: input.avgDailyDemand,
    service_level: input.serviceLevel,
    z_score: zScoreFromServiceLevel(input.serviceLevel),
    std_dev_demand: input.stdDevDemand,
    lead_time_days: input.leadTimeDays,
    expected_orders_per_year: ordersPerYear,
    expected_days_between_orders: daysBetween,
  };
}
