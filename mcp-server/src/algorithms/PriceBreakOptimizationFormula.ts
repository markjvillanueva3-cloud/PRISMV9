/**
 * PriceBreakOptimizationFormula — quantity-discount-aware EOQ (Hadley-Whitin 1963).
 * (hotel iter14, 2026-05-24, U-PRICE-BREAK-EOQ).
 *
 * Closes G11-extended: vendors quote tiered prices (e.g. 1-99 @ $10, 100-499
 * @ $9, 500+ @ $8) but the basic Wilson EOQ ignores this. Hadley-Whitin
 * algorithm: for each tier, compute EOQ_i = sqrt(2·D·S / H_i) where
 * H_i = price_i × holding_rate. If EOQ_i falls inside its tier's quantity
 * range, that's a candidate. Otherwise the candidate is the nearest tier
 * boundary. Final pick = the candidate with minimum TC =
 * (D/Q)·S + (Q/2)·H + D·price.
 *
 * Hotel-soul:
 *   - **R12 fail-loud** — bad inputs throw with descriptive errors
 *   - **deterministic** — no PRNG, no clock
 *   - **monotonic-tier verification** — tiers MUST have non-decreasing
 *     min_qty and non-increasing price (a vendor that gets MORE expensive
 *     at higher volume is invalid input — throw, never silently sort)
 *
 * Reference: Hadley & Whitin "Analysis of Inventory Systems" (Prentice-Hall
 * 1963), §3-4. Also: Silver/Pyke/Peterson §5.6 (All-Units Quantity Discounts).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PriceTier {
  min_qty: number;             // inclusive lower bound (units)
  price_per_unit: number;      // $/unit at this tier
}

export interface PriceBreakAnalysisRow {
  tier_index: number;
  min_qty: number;
  price_per_unit: number;
  candidate_qty: number;       // EOQ_i clipped to tier
  candidate_qty_source: "eoq_in_tier" | "tier_min_floor";
  total_cost: number;          // (D/Q)·S + (Q/2)·H + D·price
  ordering_cost: number;
  holding_cost_annual: number;
  purchase_cost_annual: number;
}

export interface PriceBreakOptimization {
  optimal_qty: number;
  optimal_tier_index: number;
  optimal_price_per_unit: number;
  optimal_total_cost: number;
  candidates: PriceBreakAnalysisRow[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const WILSON_FACTOR = 2;
const MIN_TIERS = 1;

// ─── Helpers ────────────────────────────────────────────────────────────────

function assertPositive(x: number, label: string): void {
  if (!Number.isFinite(x)) throw new Error(`${label}: must be finite (got ${x})`);
  if (x <= 0) throw new Error(`${label}: must be > 0 (got ${x})`);
}

function assertNonNegative(x: number, label: string): void {
  if (!Number.isFinite(x)) throw new Error(`${label}: must be finite (got ${x})`);
  if (x < 0) throw new Error(`${label}: must be >= 0 (got ${x})`);
}

function validateTiers(tiers: PriceTier[]): void {
  if (!Array.isArray(tiers)) throw new Error("tiers: must be an array");
  if (tiers.length < MIN_TIERS) throw new Error(`tiers: at least ${MIN_TIERS} tier required`);
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    assertNonNegative(t.min_qty, `tiers[${i}].min_qty`);
    assertPositive(t.price_per_unit, `tiers[${i}].price_per_unit`);
    if (!Number.isInteger(t.min_qty)) throw new Error(`tiers[${i}].min_qty: must be integer`);
  }
  if (tiers[0].min_qty !== 0 && tiers[0].min_qty !== 1) {
    throw new Error(`tiers[0].min_qty: first tier must start at 0 or 1 (got ${tiers[0].min_qty})`);
  }
  // Verify monotonic: min_qty strictly ascending, price strictly non-increasing
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].min_qty <= tiers[i - 1].min_qty) {
      throw new Error(`tiers[${i}].min_qty (${tiers[i].min_qty}) must exceed tiers[${i - 1}].min_qty (${tiers[i - 1].min_qty}) — strict ascending required`);
    }
    if (tiers[i].price_per_unit > tiers[i - 1].price_per_unit) {
      throw new Error(`tiers[${i}].price_per_unit (${tiers[i].price_per_unit}) > tiers[${i - 1}].price_per_unit (${tiers[i - 1].price_per_unit}) — discounts must be non-increasing with quantity`);
    }
  }
}

function tierUpperBound(tiers: PriceTier[], i: number): number {
  // Upper bound of tier i is one less than min_qty of tier i+1, or +Infinity if last
  return i + 1 < tiers.length ? tiers[i + 1].min_qty - 1 : Number.POSITIVE_INFINITY;
}

// ─── Main optimizer ────────────────────────────────────────────────────────

/**
 * Hadley-Whitin all-units quantity-discount optimization.
 *
 * @param annualDemand D — units/year (> 0)
 * @param orderCost S — fixed $/order (> 0)
 * @param holdingRate i — annual holding rate as fraction of unit price
 *                       (e.g. 0.20 = 20% of price per unit per year)
 * @param tiers — ordered list of price tiers (validated for monotonicity)
 */
export function optimizePriceBreaks(
  annualDemand: number,
  orderCost: number,
  holdingRate: number,
  tiers: PriceTier[],
): PriceBreakOptimization {
  assertPositive(annualDemand, "optimizePriceBreaks.annualDemand");
  assertPositive(orderCost, "optimizePriceBreaks.orderCost");
  assertPositive(holdingRate, "optimizePriceBreaks.holdingRate");
  validateTiers(tiers);

  const candidates: PriceBreakAnalysisRow[] = [];
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    const H = t.price_per_unit * holdingRate;
    const eoq = Math.sqrt((WILSON_FACTOR * annualDemand * orderCost) / H);
    const ub = tierUpperBound(tiers, i);
    const lb = t.min_qty;

    let candidateQty: number;
    let source: "eoq_in_tier" | "tier_min_floor";
    if (eoq >= lb && eoq <= ub) {
      candidateQty = eoq;
      source = "eoq_in_tier";
    } else if (eoq < lb) {
      // EOQ falls below tier — must order at least the tier floor to claim this price
      candidateQty = lb === 0 ? 1 : lb;  // guard against zero-qty
      source = "tier_min_floor";
    } else {
      // EOQ > upper bound → this tier is suboptimal vs the next one; skip
      continue;
    }

    const ordering = (annualDemand / candidateQty) * orderCost;
    const holdingAnnual = (candidateQty / 2) * H;
    const purchase = annualDemand * t.price_per_unit;
    const total = ordering + holdingAnnual + purchase;

    candidates.push({
      tier_index: i,
      min_qty: t.min_qty,
      price_per_unit: t.price_per_unit,
      candidate_qty: candidateQty,
      candidate_qty_source: source,
      total_cost: total,
      ordering_cost: ordering,
      holding_cost_annual: holdingAnnual,
      purchase_cost_annual: purchase,
    });
  }

  if (candidates.length === 0) {
    throw new Error("optimizePriceBreaks: no feasible tier — check tier bounds");
  }

  // Pick the candidate with minimum total cost; tie-break by lower tier_index
  // (= prefer lower committed quantity when equal cost — less inventory risk)
  let best = candidates[0];
  for (const c of candidates.slice(1)) {
    if (c.total_cost < best.total_cost ||
        (c.total_cost === best.total_cost && c.tier_index < best.tier_index)) {
      best = c;
    }
  }
  return {
    optimal_qty: best.candidate_qty,
    optimal_tier_index: best.tier_index,
    optimal_price_per_unit: best.price_per_unit,
    optimal_total_cost: best.total_cost,
    candidates,
  };
}
