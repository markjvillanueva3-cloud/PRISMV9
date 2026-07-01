/**
 * QuoteEngine.test.ts — hotel slot (iter7 / U-QUOTE-WIRE).
 *
 * Tests the markup/discount/lead-time logic of QuoteEngine (214 LOC), which
 * pairs with QuoteEstimatorEngine. Verifies concrete behavior of generate(),
 * quantityBreaks(), and marginAnalysis().
 */

import { describe, it, expect } from "vitest";
import { quoteEngine } from "../engines/QuoteEngine.js";
import type { QuoteInput } from "../engines/QuoteEngine.js";

const BASE_INPUT: QuoteInput = {
  customer_name: "JM Die Co",
  part_name: "DIE-A001",
  quantity: 10,
  cost_per_part: 25.00,
  setup_cost: 150,
  material_cost_per_part: 5.00,
  cycle_time_min: 8,
  num_setups: 1,
  complexity: "moderate",
  urgency: "standard",
};

const VALID_DAYS = 30;

describe("QuoteEngine — generate envelope", () => {
  it("generate returns quote_number matching Q-YYYYMM-#### pattern", () => {
    const q = quoteEngine.generate(BASE_INPUT);
    expect(q.quote_number).toMatch(/^Q-\d{6}-\d{4}$/);
  });

  it("generate round-trips customer + part_name + quantity from input", () => {
    const q = quoteEngine.generate({ ...BASE_INPUT, quantity: 50, customer_name: "ALCOA", part_name: "AL-X" });
    expect(q.customer).toBe("ALCOA");
    expect(q.part_name).toBe("AL-X");
    expect(q.quantity).toBe(50);
  });

  it("valid_days is exactly 30", () => {
    const q = quoteEngine.generate(BASE_INPUT);
    expect(q.valid_days).toBe(VALID_DAYS);
  });

  it("line_items has exactly 2 rows: machined part + setup charge", () => {
    const q = quoteEngine.generate(BASE_INPUT);
    expect(q.line_items.length).toBe(2);
    expect(q.line_items[1].description).toBe("Setup charge");
  });
});

describe("QuoteEngine — markup / margin (slot-soul invariant)", () => {
  it("unit_price > cost_per_part (markup is positive)", () => {
    const q = quoteEngine.generate(BASE_INPUT);
    expect(q.unit_price).toBeGreaterThan(BASE_INPUT.cost_per_part);
  });

  it("margin_pct = (unit_price - cost) / unit_price (reconciles both ways)", () => {
    const q = quoteEngine.generate(BASE_INPUT);
    const expected = Math.round(((q.unit_price - BASE_INPUT.cost_per_part) / q.unit_price) * 10000) / 100;
    expect(q.margin_pct).toBeCloseTo(expected, 2);
  });

  it("extreme complexity yields higher unit_price than simple complexity", () => {
    const simple = quoteEngine.generate({ ...BASE_INPUT, complexity: "simple" });
    const extreme = quoteEngine.generate({ ...BASE_INPUT, complexity: "extreme" });
    expect(extreme.unit_price).toBeGreaterThan(simple.unit_price);
  });

  it("emergency urgency yields higher unit_price than standard urgency", () => {
    const std = quoteEngine.generate({ ...BASE_INPUT, urgency: "standard" });
    const em = quoteEngine.generate({ ...BASE_INPUT, urgency: "emergency" });
    expect(em.unit_price).toBeGreaterThan(std.unit_price);
  });

  it("repeat_order=true yields lower unit_price than first-time order", () => {
    const first = quoteEngine.generate({ ...BASE_INPUT, repeat_order: false });
    const repeat = quoteEngine.generate({ ...BASE_INPUT, repeat_order: true });
    expect(repeat.unit_price).toBeLessThan(first.unit_price);
  });
});

describe("QuoteEngine — lead time + urgency", () => {
  it("emergency lead_time_days < standard lead_time_days", () => {
    const std = quoteEngine.generate({ ...BASE_INPUT, urgency: "standard" });
    const em = quoteEngine.generate({ ...BASE_INPUT, urgency: "emergency" });
    expect(em.lead_time_days).toBeLessThan(std.lead_time_days);
  });

  it("lead_time_days is a positive integer", () => {
    const q = quoteEngine.generate(BASE_INPUT);
    expect(q.lead_time_days).toBeGreaterThan(0);
    expect(Number.isInteger(q.lead_time_days)).toBe(true);
  });
});

describe("QuoteEngine — quantityBreaks", () => {
  it("quantityBreaks returns one row per requested quantity", () => {
    const breaks = quoteEngine.quantityBreaks(BASE_INPUT, [1, 25, 100]);
    expect(breaks.length).toBe(3);
    expect(breaks[0].quantity).toBe(1);
    expect(breaks[1].quantity).toBe(25);
    expect(breaks[2].quantity).toBe(100);
  });

  it("higher quantity yields non-negative savings_pct vs base quote", () => {
    const breaks = quoteEngine.quantityBreaks({ ...BASE_INPUT, quantity: 10 }, [100]);
    expect(breaks[0].savings_pct).toBeGreaterThanOrEqual(0);
  });
});

describe("QuoteEngine — marginAnalysis", () => {
  it("marginAnalysis returns 6 markup scenarios at 20/30/40/50/60/80%", () => {
    const m = quoteEngine.marginAnalysis(BASE_INPUT);
    expect(m.scenarios.length).toBe(6);
    expect(m.scenarios.map(s => s.markup_pct)).toEqual([20, 30, 40, 50, 60, 80]);
  });

  it("marginAnalysis.quoted_price matches generate().unit_price for the same input", () => {
    const g = quoteEngine.generate(BASE_INPUT);
    const m = quoteEngine.marginAnalysis(BASE_INPUT);
    expect(m.quoted_price).toBe(g.unit_price);
  });

  it("breakeven_quantity is at least 1 when setup_cost > 0", () => {
    const m = quoteEngine.marginAnalysis({ ...BASE_INPUT, setup_cost: 150 });
    expect(m.breakeven_quantity).toBeGreaterThanOrEqual(1);
  });
});
