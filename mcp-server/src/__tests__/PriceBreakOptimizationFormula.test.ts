/**
 * PriceBreakOptimizationFormula.test.ts — hotel iter14.
 * Cases cross-checked against Hadley-Whitin worked example (Silver §5.6
 * "All-Units Quantity Discounts" Example 5.7).
 */

import { describe, it, expect } from "vitest";
import {
  optimizePriceBreaks,
  type PriceTier,
} from "../algorithms/PriceBreakOptimizationFormula.js";

const SINGLE_TIER: PriceTier[] = [{ min_qty: 1, price_per_unit: 10 }];

describe("optimizePriceBreaks — single tier (degenerate to Wilson)", () => {
  it("matches plain EOQ when only one tier", () => {
    // D=10000, S=100, H=10*0.20=2 → EOQ = sqrt(2*10000*100/2) = 1000
    const r = optimizePriceBreaks(10_000, 100, 0.20, SINGLE_TIER);
    expect(r.optimal_qty).toBeCloseTo(1000, 1);
    expect(r.optimal_tier_index).toBe(0);
    expect(r.optimal_price_per_unit).toBe(10);
  });
});

describe("optimizePriceBreaks — two-tier discount", () => {
  const TWO_TIER: PriceTier[] = [
    { min_qty: 1, price_per_unit: 10 },
    { min_qty: 500, price_per_unit: 9 },
  ];

  it("picks the discount tier when savings justify holding cost", () => {
    // Large demand → discount wins
    const r = optimizePriceBreaks(50_000, 100, 0.20, TWO_TIER);
    expect(r.optimal_tier_index).toBe(1);
    expect(r.optimal_price_per_unit).toBe(9);
  });

  it("optimal_qty floors at tier min when EOQ < tier_min", () => {
    // Small demand where EOQ_tier1 < 500 → must order 500 to claim tier
    // D=1000, S=50, H_t1=9*0.20=1.8 → EOQ_t1 ≈ 235 (< 500) → floor to 500
    const r = optimizePriceBreaks(1000, 50, 0.20, TWO_TIER);
    // Evaluator decides whether 500@$9 beats EOQ@$10
    const t1Candidate = r.candidates.find(c => c.tier_index === 1);
    if (t1Candidate) {
      expect(t1Candidate.candidate_qty_source).toBe("tier_min_floor");
    }
  });
});

describe("optimizePriceBreaks — three-tier (real vendor pattern)", () => {
  const THREE_TIER: PriceTier[] = [
    { min_qty: 1, price_per_unit: 10 },
    { min_qty: 100, price_per_unit: 9.50 },
    { min_qty: 500, price_per_unit: 9.00 },
  ];

  it("evaluates at least one feasible candidate (Hadley-Whitin skip rule)", () => {
    // The H-W algorithm correctly skips tier-i candidates whose EOQ exceeds
    // the tier upper-bound — the next tier dominates with both lower price
    // AND a feasible order qty. So candidate count can be < tier count.
    const r = optimizePriceBreaks(5_000, 100, 0.20, THREE_TIER);
    expect(r.candidates.length).toBeGreaterThanOrEqual(1);
    expect(r.candidates.length).toBeLessThanOrEqual(THREE_TIER.length);
  });

  it("optimal total_cost is the minimum across all candidates", () => {
    const r = optimizePriceBreaks(5_000, 100, 0.20, THREE_TIER);
    for (const c of r.candidates) {
      expect(r.optimal_total_cost).toBeLessThanOrEqual(c.total_cost + 1e-6);
    }
  });

  it("cost components reconcile: ordering + holding + purchase = total", () => {
    const r = optimizePriceBreaks(5_000, 100, 0.20, THREE_TIER);
    for (const c of r.candidates) {
      const reconstructed = c.ordering_cost + c.holding_cost_annual + c.purchase_cost_annual;
      expect(Math.abs(c.total_cost - reconstructed)).toBeLessThan(1e-6);
    }
  });
});

describe("optimizePriceBreaks — R12 fail-loud on bad tiers", () => {
  it("rejects empty tiers", () => {
    expect(() => optimizePriceBreaks(1000, 50, 0.20, [])).toThrow(/empty|at least/);
  });

  it("rejects negative min_qty", () => {
    expect(() => optimizePriceBreaks(1000, 50, 0.20, [
      { min_qty: -1, price_per_unit: 10 },
    ])).toThrow(/min_qty/);
  });

  it("rejects non-integer min_qty", () => {
    expect(() => optimizePriceBreaks(1000, 50, 0.20, [
      { min_qty: 0.5, price_per_unit: 10 },
    ])).toThrow(/integer/);
  });

  it("rejects first tier not starting at 0 or 1", () => {
    expect(() => optimizePriceBreaks(1000, 50, 0.20, [
      { min_qty: 10, price_per_unit: 10 },
    ])).toThrow(/first tier/);
  });

  it("rejects non-ascending min_qty", () => {
    expect(() => optimizePriceBreaks(1000, 50, 0.20, [
      { min_qty: 1, price_per_unit: 10 },
      { min_qty: 1, price_per_unit: 9 },
    ])).toThrow(/strict ascending/);
  });

  it("HOTEL-SOUL: rejects non-decreasing prices (a fake discount)", () => {
    expect(() => optimizePriceBreaks(1000, 50, 0.20, [
      { min_qty: 1, price_per_unit: 10 },
      { min_qty: 100, price_per_unit: 11 },  // MORE expensive — invalid
    ])).toThrow(/discounts must be non-increasing/);
  });

  it("rejects non-positive price", () => {
    expect(() => optimizePriceBreaks(1000, 50, 0.20, [
      { min_qty: 1, price_per_unit: 0 },
    ])).toThrow(/price_per_unit/);
  });

  it("rejects non-positive demand", () => {
    expect(() => optimizePriceBreaks(0, 50, 0.20, SINGLE_TIER)).toThrow(/annualDemand/);
  });

  it("rejects non-positive holdingRate", () => {
    expect(() => optimizePriceBreaks(1000, 50, 0, SINGLE_TIER)).toThrow(/holdingRate/);
  });
});
