/**
 * QuoteEstimatorEngine.test.ts — hotel slot (ACP-MS6 P0-U01/U02 verification, iter6).
 *
 * Validates the canonical hotel-domain quote-generation chain. This engine
 * (1027 LOC) backs the entire ACP-MS6 P0 close-out — without tests the
 * close-out claim is fragile.
 */

import { describe, it, expect } from "vitest";
import { quoteEstimatorEngine } from "../engines/QuoteEstimatorEngine.js";
import type { QuoteEstimateInput } from "../engines/QuoteEstimatorEngine.js";

// Test-fixture base — minimal valid input
const BASE_INPUT: QuoteEstimateInput = {
  part_name: "TEST-PART-A",
  quantity: 10,
  material: "aluminum_6061",
  complexity: "medium",
};

const TARGET_MARGIN = 35;
const MARGIN_TOLERANCE_PP = 5;
const CONFIDENCE_MIN = 10;
const CONFIDENCE_MAX = 100;
const MIN_PRICE_BREAKS = 5;

describe("QuoteEstimatorEngine — quote envelope (id / dates / quantity)", () => {
  it("estimate returns quote_id matching QE<YY>-##### pattern", () => {
    const q = quoteEstimatorEngine.estimate(BASE_INPUT);
    expect(q.quote_id).toMatch(/^QE\d{2}-\d{5}$/);
  });

  it("estimate round-trips quantity=25 and part_name='TEST-B'", () => {
    const q = quoteEstimatorEngine.estimate({ ...BASE_INPUT, quantity: 25, part_name: "TEST-B" });
    expect(q.quantity).toBe(25);
    expect(q.part_name).toBe("TEST-B");
  });

  it("default part_name is 'Custom Part' when not provided", () => {
    const q = quoteEstimatorEngine.estimate({ quantity: 1, material: "aluminum_6061", complexity: "simple" });
    expect(q.part_name).toBe("Custom Part");
  });

  it("date equals today (ISO yyyy-mm-dd) and valid_until is later than date", () => {
    const q = quoteEstimatorEngine.estimate(BASE_INPUT);
    const today = new Date().toISOString().slice(0, 10);
    expect(q.date).toBe(today);
    expect(q.valid_until > q.date).toBe(true);
  });
});

describe("QuoteEstimatorEngine — cost reconcile (slot-soul invariant)", () => {
  it("costs.total_cost_per_part is positive for any valid input", () => {
    const q = quoteEstimatorEngine.estimate(BASE_INPUT);
    expect(q.costs.total_cost_per_part > 0).toBe(true);
  });

  it("pricing.unit_price >= costs.total_cost_per_part (non-negative margin)", () => {
    const q = quoteEstimatorEngine.estimate(BASE_INPUT);
    expect(q.pricing.unit_price).toBeGreaterThanOrEqual(q.costs.total_cost_per_part);
  });

  it("pricing.margin_pct lands within ±5pp of target_margin_pct when provided", () => {
    const q = quoteEstimatorEngine.estimate({ ...BASE_INPUT, target_margin_pct: TARGET_MARGIN });
    expect(q.pricing.margin_pct).toBeGreaterThanOrEqual(TARGET_MARGIN - MARGIN_TOLERANCE_PP);
    expect(q.pricing.margin_pct).toBeLessThanOrEqual(TARGET_MARGIN + MARGIN_TOLERANCE_PP);
  });

  it("confidence_score is clamped to [10, 100]", () => {
    const q = quoteEstimatorEngine.estimate(BASE_INPUT);
    expect(q.confidence_score).toBeGreaterThanOrEqual(CONFIDENCE_MIN);
    expect(q.confidence_score).toBeLessThanOrEqual(CONFIDENCE_MAX);
  });
});

describe("QuoteEstimatorEngine — complexity / material / rush effects", () => {
  it("very_complex parts cost more per part than simple parts (monotone complexity)", () => {
    const simple = quoteEstimatorEngine.estimate({ ...BASE_INPUT, complexity: "simple" });
    const veryComplex = quoteEstimatorEngine.estimate({ ...BASE_INPUT, complexity: "very_complex" });
    expect(veryComplex.costs.total_cost_per_part).toBeGreaterThan(simple.costs.total_cost_per_part);
  });

  it("titanium parts cost more per part than aluminum parts (material differentiation)", () => {
    const al = quoteEstimatorEngine.estimate({ ...BASE_INPUT, material: "aluminum_6061" });
    const ti = quoteEstimatorEngine.estimate({ ...BASE_INPUT, material: "titanium_gr5" });
    expect(ti.costs.total_cost_per_part).toBeGreaterThan(al.costs.total_cost_per_part);
  });

  it("rush=true populates pricing.adjustments.rush_premium_pct (positive non-null)", () => {
    const q = quoteEstimatorEngine.estimate({ ...BASE_INPUT, rush: true, rush_tier: "3day" });
    expect(q.pricing.adjustments.rush_premium_pct === null).toBe(false);
    expect(q.pricing.adjustments.rush_premium_pct ?? 0).toBeGreaterThan(0);
  });

  it("rush=false (default) leaves rush_premium_pct null", () => {
    const q = quoteEstimatorEngine.estimate(BASE_INPUT);
    expect(q.pricing.adjustments.rush_premium_pct).toBeNull();
  });
});

describe("QuoteEstimatorEngine — price_breaks volume curve", () => {
  it("price_breaks excludes the input quantity (no duplicate row)", () => {
    const q = quoteEstimatorEngine.estimate({ ...BASE_INPUT, quantity: 100 });
    const breakQtys = q.price_breaks.map(b => b.qty);
    expect(breakQtys.includes(100)).toBe(false);
  });

  it("price_breaks contains at least 5 alternate quantities", () => {
    const q = quoteEstimatorEngine.estimate({ ...BASE_INPUT, quantity: 10 });
    expect(q.price_breaks.length).toBeGreaterThanOrEqual(MIN_PRICE_BREAKS);
  });

  it("price_breaks: unit_price at qty=1000 <= unit_price at qty=1 (volume discount monotone)", () => {
    const q = quoteEstimatorEngine.estimate({ ...BASE_INPUT, quantity: 10 });
    const qty1 = q.price_breaks.find(b => b.qty === 1);
    const qty1000 = q.price_breaks.find(b => b.qty === 1000);
    expect(qty1?.qty).toBe(1);
    expect(qty1000?.qty).toBe(1000);
    expect(qty1000!.unit_price).toBeLessThanOrEqual(qty1!.unit_price);
  });
});
