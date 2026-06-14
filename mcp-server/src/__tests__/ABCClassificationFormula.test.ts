/**
 * ABCClassificationFormula.test.ts — hotel iter14.
 * Verifies Pareto-cumulative classification, threshold overrides, ledger
 * gate, R12 fail-loud, deterministic tie-break.
 */

import { describe, it, expect } from "vitest";
import { classifyABC, type ABCItem } from "../algorithms/ABCClassificationFormula.js";

const CANONICAL_PARETO_8020 = [
  { id: "CUST-001", value: 500_000 },  // 50%
  { id: "CUST-002", value: 300_000 },  // 30%  (cum 80%)
  { id: "CUST-003", value: 100_000 },  // 10%  (cum 90%)
  { id: "CUST-004", value: 60_000 },   // 6%   (cum 96%)
  { id: "CUST-005", value: 25_000 },   // 2.5% (cum 98.5%)
  { id: "CUST-006", value: 10_000 },   // 1%   (cum 99.5%)
  { id: "CUST-007", value: 5_000 },    // 0.5% (cum 100%)
];

describe("classifyABC — canonical Pareto 80-20", () => {
  it("classifies textbook example into A/B/C correctly (Dickie 1951 before-cum rule)", () => {
    const r = classifyABC(CANONICAL_PARETO_8020);
    // CUST-001 (val 500k): prev_cum=0% < 80% → A
    expect(r.rows[0].abc_class).toBe("A");
    // CUST-002 (val 300k): prev_cum=50% < 80% → A (this item *pushes* cum to 80%)
    expect(r.rows[1].abc_class).toBe("A");
    // CUST-003 (val 100k): prev_cum=80% ≥ 80% but < 95% → B
    expect(r.rows[2].abc_class).toBe("B");
    // CUST-004 (val 60k): prev_cum=90% < 95% → B (still in B band when it joined)
    expect(r.rows[3].abc_class).toBe("B");
    // CUST-005 (val 25k): prev_cum=96% ≥ 95% → C
    expect(r.rows[4].abc_class).toBe("C");
  });

  it("counts + totals + pct_of_total reconcile", () => {
    const r = classifyABC(CANONICAL_PARETO_8020);
    expect(r.counts.A + r.counts.B + r.counts.C).toBe(7);
    expect(r.totals.A + r.totals.B + r.totals.C).toBeCloseTo(1_000_000, 2);
    const pctSum = r.pct_of_total.A + r.pct_of_total.B + r.pct_of_total.C;
    expect(Math.abs(pctSum - 1)).toBeLessThan(1e-9);
  });

  it("HOTEL-SOUL: class totals sum equals input total", () => {
    const r = classifyABC(CANONICAL_PARETO_8020);
    expect(r.ledger_balanced).toBe(true);
  });

  it("cumulative_pct is monotonically non-decreasing", () => {
    const r = classifyABC(CANONICAL_PARETO_8020);
    for (let i = 1; i < r.rows.length; i++) {
      expect(r.rows[i].cumulative_pct).toBeGreaterThanOrEqual(r.rows[i - 1].cumulative_pct);
    }
  });
});

describe("classifyABC — sort + tie-break", () => {
  it("sorts descending by value", () => {
    const r = classifyABC([
      { id: "A", value: 50 },
      { id: "B", value: 100 },
      { id: "C", value: 25 },
    ]);
    expect(r.rows.map(row => row.id)).toEqual(["B", "A", "C"]);
  });

  it("tie-break by id ASC when values equal (deterministic)", () => {
    const r = classifyABC([
      { id: "ZEBRA", value: 100 },
      { id: "ALPHA", value: 100 },
      { id: "MIKE", value: 100 },
    ]);
    expect(r.rows.map(row => row.id)).toEqual(["ALPHA", "MIKE", "ZEBRA"]);
  });
});

describe("classifyABC — threshold overrides", () => {
  it("tighter A threshold (70%) shrinks Class A (before-cum rule)", () => {
    const r = classifyABC(CANONICAL_PARETO_8020, { a: 0.70, b: 0.95 });
    expect(r.thresholds.a).toBe(0.70);
    // CUST-001: prev=0% < 70% → A
    // CUST-002: prev=50% < 70% → A (pushes through 70% boundary to 80%)
    expect(r.rows[0].abc_class).toBe("A");
    expect(r.rows[1].abc_class).toBe("A");
    // CUST-003: prev=80% ≥ 70% → B
    expect(r.rows[2].abc_class).toBe("B");
  });

  it("looser A threshold (95%) expands Class A", () => {
    const r = classifyABC(CANONICAL_PARETO_8020, { a: 0.95, b: 0.99 });
    // CUST-001 prev=0%, CUST-002 prev=50%, CUST-003 prev=80%, CUST-004 prev=90% — all < 95% → A
    expect(r.rows[0].abc_class).toBe("A");
    expect(r.rows[1].abc_class).toBe("A");
    expect(r.rows[2].abc_class).toBe("A");
    expect(r.rows[3].abc_class).toBe("A");
  });
});

describe("classifyABC — edge cases", () => {
  it("single-item list: 1 item is Class A", () => {
    const r = classifyABC([{ id: "SOLE", value: 1000 }]);
    expect(r.rows.length).toBe(1);
    expect(r.rows[0].abc_class).toBe("A");
    expect(r.counts).toEqual({ A: 1, B: 0, C: 0 });
  });

  it("all-equal values: cumulative builds linearly + classes assigned by prev-cum", () => {
    const items: ABCItem[] = Array.from({ length: 10 }, (_, i) => ({ id: `X${i}`, value: 100 }));
    const r = classifyABC(items);
    // After-cum: 10%, 20%, ..., 100%
    expect(r.rows[7].cumulative_pct).toBeCloseTo(0.80, 2);
    expect(r.rows[8].cumulative_pct).toBeCloseTo(0.90, 2);
    // Before-cum classification:
    //   rows 0..7 — prev = 0%, 10%, ..., 70% all < 80% → A (8 items)
    //   row 8 — prev = 80% ≥ 80% but < 95% → B
    //   row 9 — prev = 90% < 95% → B
    expect(r.counts.A).toBe(8);
    expect(r.counts.B).toBe(2);
    expect(r.counts.C).toBe(0);
  });

  it("zero-value items: ledger-balanced + cum_pct stays 0 (degenerate)", () => {
    const r = classifyABC([
      { id: "Z1", value: 0 },
      { id: "Z2", value: 0 },
    ]);
    expect(r.total_value).toBe(0);
    expect(r.ledger_balanced).toBe(true);
    // Every item has cum_pct=0 (no value to distribute); all land in class A under
    // before-cum rule since prev_cum=0 < a_threshold for all rows
    expect(r.rows.every(row => row.cumulative_pct === 0)).toBe(true);
  });
});

describe("classifyABC — R12 fail-loud", () => {
  it("rejects empty array", () => {
    expect(() => classifyABC([])).toThrow(/empty/);
  });

  it("rejects negative value", () => {
    expect(() => classifyABC([{ id: "X", value: -1 }])).toThrow(/>= 0/);
  });

  it("rejects NaN value", () => {
    expect(() => classifyABC([{ id: "X", value: NaN }])).toThrow(/finite/);
  });

  it("rejects empty id", () => {
    expect(() => classifyABC([{ id: "", value: 100 }])).toThrow(/non-empty/);
  });

  it("rejects a_threshold >= b_threshold", () => {
    expect(() => classifyABC([{ id: "X", value: 100 }], { a: 0.95, b: 0.80 })).toThrow(/< b_threshold/);
  });

  it("rejects threshold outside (0, 1)", () => {
    expect(() => classifyABC([{ id: "X", value: 100 }], { a: 0 })).toThrow(/in \(0, 1\)/);
    expect(() => classifyABC([{ id: "X", value: 100 }], { a: 1 })).toThrow(/in \(0, 1\)/);
  });
});
