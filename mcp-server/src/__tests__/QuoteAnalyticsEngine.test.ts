/**
 * QuoteAnalyticsEngine.test.ts — hotel slot (iter13 / U-QUOTE-ANALYTICS-WIRE).
 * Tests quote record + outcome lifecycle + actual-cost recording + accuracy metrics.
 */

import { describe, it, expect } from "vitest";
import { quoteAnalyticsEngine } from "../engines/QuoteAnalyticsEngine.js";
import type { QuoteRecord } from "../engines/QuoteAnalyticsEngine.js";

function uniqueId(): string {
  return `QA-${Math.random().toString(36).slice(2, 10)}`;
}

function makeRecord(overrides: Partial<QuoteRecord> = {}): QuoteRecord {
  return {
    quote_id: uniqueId(),
    part_name: "Test Part",
    customer: "JM Die",
    material: "aluminum_6061",
    complexity: "medium",
    quantity: 10,
    date_quoted: "2026-05-23",
    valid_until: "2026-06-22",
    quoted_unit_price: 100,
    quoted_total: 1000,
    quoted_margin_pct: 30,
    quoted_lead_days: 14,
    quoted_cost_breakdown: {
      material: 30, machining: 25, setup: 10, tooling: 5,
      programming: 5, inspection: 3, secondary_ops: 0, overhead: 12, total: 90,
    },
    quoted_cycle_time_min: 8,
    status: "pending",
    estimator: "EST-1",
    ...overrides,
  };
}

describe("QuoteAnalyticsEngine — recordQuote + getQuote", () => {
  it("recordQuote stores record retrievable by quote_id", () => {
    const r = makeRecord();
    quoteAnalyticsEngine.recordQuote(r);
    const got = quoteAnalyticsEngine.getQuote(r.quote_id);
    expect(got?.quote_id).toBe(r.quote_id);
    expect(got?.quoted_total).toBe(1000);
  });

  it("recordQuote sanitizes part_name (caps length at 200)", () => {
    const long = "x".repeat(500);
    const r = makeRecord({ part_name: long });
    quoteAnalyticsEngine.recordQuote(r);
    const got = quoteAnalyticsEngine.getQuote(r.quote_id);
    expect((got?.part_name || "").length).toBeLessThanOrEqual(200);
  });

  it("getQuote returns undefined for unknown id", () => {
    expect(quoteAnalyticsEngine.getQuote("QA-NEVER") === undefined).toBe(true);
  });
});

describe("QuoteAnalyticsEngine — updateOutcome lifecycle", () => {
  it("updateOutcome to 'won' sets outcome_date when not provided", () => {
    const r = makeRecord();
    quoteAnalyticsEngine.recordQuote(r);
    const updated = quoteAnalyticsEngine.updateOutcome(r.quote_id, "won");
    expect(updated.status).toBe("won");
    expect(updated.outcome_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("updateOutcome 'lost' with loss_reason='price_too_high' preserves the reason", () => {
    const r = makeRecord();
    quoteAnalyticsEngine.recordQuote(r);
    const u = quoteAnalyticsEngine.updateOutcome(r.quote_id, "lost", {
      loss_reason: "price_too_high",
      competing_price: 850,
    });
    expect(u.loss_reason).toBe("price_too_high");
    expect(u.competing_price).toBe(850);
  });

  it("updateOutcome throws on unknown quote_id", () => {
    expect(() => quoteAnalyticsEngine.updateOutcome("QA-NEVER", "won"))
      .toThrow(/not found/);
  });
});

describe("QuoteAnalyticsEngine — recordActuals + margin reconciliation", () => {
  it("recordActuals computes actual_margin_pct from quoted_total + actual costs", () => {
    const r = makeRecord({ quoted_total: 1000, quantity: 10 });
    quoteAnalyticsEngine.recordQuote(r);
    const u = quoteAnalyticsEngine.recordActuals(r.quote_id, {
      cost_breakdown: {
        material: 30, machining: 25, setup: 10, tooling: 5,
        programming: 5, inspection: 3, secondary_ops: 0, overhead: 12, total: 80,
      },
      cycle_time_min: 7.5,
      lead_days: 12,
    });
    // actual_margin = (1000 - 80*10) / 1000 * 100 = 20%
    expect(u.actual_margin_pct).toBeCloseTo(20, 1);
    expect(u.actual_cycle_time_min).toBe(7.5);
    expect(u.actual_lead_days).toBe(12);
  });

  it("recordActuals throws on unknown quote_id", () => {
    expect(() => quoteAnalyticsEngine.recordActuals("QA-NEVER", {
      cost_breakdown: { material: 0, machining: 0, setup: 0, tooling: 0, programming: 0, inspection: 0, secondary_ops: 0, overhead: 0, total: 0 },
    })).toThrow(/not found/);
  });
});

describe("QuoteAnalyticsEngine — listQuotes + filter", () => {
  it("listQuotes() returns all quotes", () => {
    const r = makeRecord();
    quoteAnalyticsEngine.recordQuote(r);
    const all = quoteAnalyticsEngine.listQuotes();
    expect(all.some(q => q.quote_id === r.quote_id)).toBe(true);
  });

  it("listQuotes('won') filters to status='won' only", () => {
    const r = makeRecord();
    quoteAnalyticsEngine.recordQuote(r);
    quoteAnalyticsEngine.updateOutcome(r.quote_id, "won");
    const won = quoteAnalyticsEngine.listQuotes("won");
    expect(won.every(q => q.status === "won")).toBe(true);
  });
});

describe("QuoteAnalyticsEngine — analytics roll-ups", () => {
  it("accuracyMetrics with no matching filter → quotes_with_actuals=0 + zero cost-accuracy", () => {
    const m = quoteAnalyticsEngine.accuracyMetrics({ material: "never-material-xyz-9999" });
    expect(m.quotes_with_actuals).toBe(0);
    expect(m.cost_accuracy.within_5pct).toBe(0);
    expect(m.cost_accuracy.within_10pct).toBe(0);
  });

  it("conversionMetrics returns object with numeric counts", () => {
    const r = makeRecord();
    quoteAnalyticsEngine.recordQuote(r);
    quoteAnalyticsEngine.updateOutcome(r.quote_id, "won");
    const c = quoteAnalyticsEngine.conversionMetrics();
    expect(typeof c.total_quotes === "number").toBe(true);
    expect(c.total_quotes).toBeGreaterThanOrEqual(1);
  });

  it("estimatorScores returns array (one entry per estimator with quotes)", () => {
    const r = makeRecord({ estimator: "EST-WIRE-TEST" });
    quoteAnalyticsEngine.recordQuote(r);
    const scores = quoteAnalyticsEngine.estimatorScores();
    expect(Array.isArray(scores)).toBe(true);
  });

  it("calibrationSuggestions returns array (possibly empty with insufficient data)", () => {
    const s = quoteAnalyticsEngine.calibrationSuggestions();
    expect(Array.isArray(s)).toBe(true);
  });
});
