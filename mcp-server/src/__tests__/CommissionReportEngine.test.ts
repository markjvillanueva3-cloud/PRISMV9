/**
 * Tests for CommissionReportEngine — per-salesperson tiered sales commission.
 * Real reference-value assertions (R9): exact $ for each tier, boundary inclusivity,
 * revenue-weighted aggregation, the to-the-cent reconciliation invariant, and the
 * fail-loud exclusion of un-tierable / garbage deals. Variability: all 3 tier
 * transitions + both margin-source paths (cost and explicit margin) exercised.
 */
import { describe, it, expect } from "vitest";
import {
  CommissionReportEngine,
  commissionReportEngine,
  rateForMargin,
  DEFAULT_COMMISSION_TIERS,
} from "../engines/CommissionReportEngine.js";

const eng = new CommissionReportEngine();

describe("rateForMargin — margin% → commission rate% (default tiers 0:2, 20:4, 35:6, 50:8)", () => {
  it("picks the highest tier whose threshold the margin meets", () => {
    expect(rateForMargin(10)).toBe(2);   // ≥0, <20
    expect(rateForMargin(25)).toBe(4);   // ≥20, <35
    expect(rateForMargin(40)).toBe(6);   // ≥35, <50
    expect(rateForMargin(60)).toBe(8);   // ≥50
  });
  it("is inclusive at each boundary", () => {
    expect(rateForMargin(20)).toBe(4);
    expect(rateForMargin(35)).toBe(6);
    expect(rateForMargin(50)).toBe(8);
  });
  it("returns 0 below the lowest threshold and on non-finite input (defensive)", () => {
    expect(rateForMargin(-5)).toBe(0);          // negative margin → no tier
    expect(rateForMargin(NaN)).toBe(0);
    expect(rateForMargin(Infinity)).toBe(0);    // non-finite margin → no commission (guard rejects it)
  });
  it("DEFAULT_COMMISSION_TIERS is frozen + ascending", () => {
    expect(Object.isFrozen(DEFAULT_COMMISSION_TIERS)).toBe(true);
    expect(DEFAULT_COMMISSION_TIERS.map((t) => t.min_margin_pct)).toEqual([0, 20, 35, 50]);
  });
});

describe("report — single-deal tier math (exact $)", () => {
  it("low tier: rev 1000 / cost 900 → 10% margin → 2% → $20", () => {
    const r = eng.report([{ salesperson: "Ana", revenue: 1000, cost: 900 }]);
    expect(r.entries).toHaveLength(1);
    const e = r.entries[0];
    expect(e.margin_pct).toBe(10);
    expect(e.commission_rate_pct).toBe(2);
    expect(e.commission_amount).toBe(20);
    expect(e.deals_closed).toBe(1);
    expect(r.reconciled).toBe(true);
  });
  it("mid tier: rev 1000 / cost 700 → 30% → 4% → $40", () => {
    const e = eng.report([{ salesperson: "Ben", revenue: 1000, cost: 700 }]).entries[0];
    expect(e.margin_pct).toBe(30);
    expect(e.commission_amount).toBe(40);
  });
  it("high tier: rev 1000 / cost 400 → 60% → 8% → $80", () => {
    const e = eng.report([{ salesperson: "Cy", revenue: 1000, cost: 400 }]).entries[0];
    expect(e.margin_pct).toBe(60);
    expect(e.commission_amount).toBe(80);
  });
  it("explicit margin path (no cost): rev 1000 / margin 300 → 30% → 4% → $40", () => {
    const e = eng.report([{ salesperson: "Di", revenue: 1000, margin: 300 }]).entries[0];
    expect(e.margin_pct).toBe(30);
    expect(e.commission_amount).toBe(40);
  });
});

describe("report — aggregation + revenue-weighted margin", () => {
  it("sums revenue/commission per rep, weights margin by revenue, sorts by commission desc", () => {
    const r = eng.report([
      { salesperson: "A", revenue: 1000, cost: 900 },  // 10% → 2% → 20
      { salesperson: "A", revenue: 2000, cost: 1000 }, // 50% → 8% → 160
      { salesperson: "B", revenue: 500, cost: 250 },   // 50% → 8% → 40
    ]);
    expect(r.entries.map((e) => e.salesperson)).toEqual(["A", "B"]); // A(180) before B(40)
    const a = r.entries[0];
    expect(a.revenue).toBe(3000);
    expect(a.commission_amount).toBe(180);
    expect(a.margin_pct).toBe(36.7);              // (100+1000)/3000 = 36.666→36.7
    expect(a.commission_rate_pct).toBe(6);        // 180/3000 = 6.00
    expect(a.deals_closed).toBe(2);
    expect(r.total_revenue).toBe(3500);
    expect(r.total_commission).toBe(220);
    expect(r.reconciled).toBe(true);
  });
});

describe("report — failure modes + adversarial (fail-loud exclusion, never fabricated)", () => {
  it("excludes non-positive / non-finite revenue and indeterminate-margin deals, counts them", () => {
    const r = eng.report([
      { salesperson: "X", revenue: 0, cost: 0 },          // non-positive
      { salesperson: "X", revenue: -100, cost: 0 },       // negative
      { salesperson: "X", revenue: NaN, cost: 0 },        // NaN
      { salesperson: "X", revenue: Infinity, cost: 0 },   // Infinity
      { salesperson: "X", revenue: 1000 },                // no cost AND no margin → indeterminate
      { salesperson: "Y", revenue: 1000, cost: 600 },     // valid: 40% → 6% → 60
    ]);
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].salesperson).toBe("Y");
    expect(r.entries[0].commission_amount).toBe(60);
    expect(r.deals_total).toBe(6);
    expect(r.deals_excluded).toBe(5);
    expect(r.excluded_reasons).toHaveLength(5);
    expect(r.reconciled).toBe(true);
  });
  it("excludes a deal with a missing/blank salesperson", () => {
    const r = eng.report([{ salesperson: "  ", revenue: 1000, cost: 500 } as any]);
    expect(r.entries).toHaveLength(0);
    expect(r.deals_excluded).toBe(1);
  });
  it("empty deals → zeroed report, reconciled true, no crash", () => {
    const r = eng.report([]);
    expect(r.entries).toEqual([]);
    expect(r.total_commission).toBe(0);
    expect(r.total_revenue).toBe(0);
    expect(r.deals_total).toBe(0);
    expect(r.reconciled).toBe(true);
  });
  it("non-array input → safe empty report", () => {
    const r = eng.report(null as any);
    expect(r.entries).toEqual([]);
    expect(r.deals_total).toBe(0);
  });
});

describe("report — invariants + overrides", () => {
  it("reconciles to the cent across many small commissions (rounding-drift guard)", () => {
    const deals = Array.from({ length: 7 }, (_, i) => ({ salesperson: "Rep", revenue: 333.33, margin: 333.33, deal_id: `d${i}` }));
    const r = eng.report(deals); // 100% margin → 8% → 26.6664 each
    expect(r.reconciled).toBe(true);
    expect(r.entries[0].commission_amount).toBe(r.total_commission);
  });
  it("custom tiers override the default table", () => {
    const r = eng.report([{ salesperson: "Z", revenue: 1000, cost: 0 }], {
      tiers: [{ min_margin_pct: 0, rate_pct: 10 }], // flat 10%
    });
    expect(r.entries[0].commission_amount).toBe(100); // 100% margin, flat 10%
    expect(r.tiers).toEqual([{ min_margin_pct: 0, rate_pct: 10 }]);
  });
  it("exports a shared singleton", () => {
    expect(commissionReportEngine).toBeInstanceOf(CommissionReportEngine);
  });
});
