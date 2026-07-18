import { describe, it, expect } from "vitest";
import { SalesUseTaxEngine } from "../engines/SalesUseTaxEngine.js";

// roundCentsHalfEven tests moved to money.test.ts (the rounder was hoisted to src/data/money.ts).

describe("SalesUseTaxEngine.calcSalesTax — reference values across 3 jurisdictions", () => {
  it("MI 6% flat: $1000 → $60.00 tax, credits Sales Tax Payable", () => {
    const r = SalesUseTaxEngine.calcSalesTax({ amount: 1000, jurisdiction: "MI", reference: "INV-1" });
    expect(r.tax).toBe(60);
    expect(r.rate).toBe(0.06);
    expect(r.jurisdiction).toBe("MI");
    expect(r.glLiabilityCredit).toEqual({ account: "2200", accountName: "Sales Tax Payable", amount: 60 });
    expect(r.isUseTax).toBe(false);
    expect(r.reference).toBe("INV-1");
  });
  it("IN 7% flat: $1000 → $70.00", () => {
    expect(SalesUseTaxEngine.calcSalesTax({ amount: 1000, jurisdiction: "IN" }).tax).toBe(70);
  });
  it("IL-COOK 10.25% combined: $1000 → $102.50", () => {
    expect(SalesUseTaxEngine.calcSalesTax({ amount: 1000, jurisdiction: "il-cook" }).tax).toBe(102.5); // case-insensitive
  });
  it("zero taxable → zero tax", () => {
    expect(SalesUseTaxEngine.calcSalesTax({ amount: 0, jurisdiction: "MI" }).tax).toBe(0);
  });
  it("negative taxable (credit-memo reversal) → negative tax", () => {
    expect(SalesUseTaxEngine.calcSalesTax({ amount: -1000, jurisdiction: "MI" }).tax).toBe(-60);
  });
  it("exempt sale with reason → zero tax, reason recorded", () => {
    const r = SalesUseTaxEngine.calcSalesTax({ amount: 1000, jurisdiction: "MI", exempt: true, exemptReason: "resale cert #MI-12345" });
    expect(r.tax).toBe(0);
    expect(r.exempt).toBe(true);
    expect(r.exemptReason).toBe("resale cert #MI-12345");
  });
});

describe("SalesUseTaxEngine — failure modes + adversarial inputs", () => {
  it("throws on UNKNOWN jurisdiction (silent 0% = under-collection liability)", () => {
    expect(() => SalesUseTaxEngine.calcSalesTax({ amount: 1000, jurisdiction: "CA" })).toThrow(/unknown jurisdiction/i);
  });
  it("throws on exempt without a reason (audit-trail requirement)", () => {
    expect(() => SalesUseTaxEngine.calcSalesTax({ amount: 1000, jurisdiction: "MI", exempt: true })).toThrow(/exemptReason/);
  });
  it("throws on NaN amount", () => {
    expect(() => SalesUseTaxEngine.calcSalesTax({ amount: NaN, jurisdiction: "MI" })).toThrow();
  });
  it("throws on Infinity amount", () => {
    expect(() => SalesUseTaxEngine.calcSalesTax({ amount: Infinity, jurisdiction: "MI" })).toThrow();
  });
  it("throws on empty jurisdiction", () => {
    expect(() => SalesUseTaxEngine.calcSalesTax({ amount: 1000, jurisdiction: "" })).toThrow();
  });
});

describe("SalesUseTaxEngine.accrueUseTax", () => {
  it("self-assesses use tax with the same calc, flagged isUseTax", () => {
    const r = SalesUseTaxEngine.accrueUseTax({ amount: 500, jurisdiction: "MI" });
    expect(r.tax).toBe(30); // 500 * 6%
    expect(r.isUseTax).toBe(true);
  });
});

describe("SalesUseTaxEngine.liabilityForPeriod (QB 'Pay Sales Tax')", () => {
  it("aggregates collected tax by jurisdiction + total", () => {
    const r = SalesUseTaxEngine.liabilityForPeriod(
      [
        { jurisdiction: "MI", tax: 60 },
        { jurisdiction: "MI", tax: 12.5 },
        { jurisdiction: "IN", tax: 70 },
      ],
      { periodLabel: "2026-Q1" }
    );
    expect(r.totalTax).toBe(142.5);
    expect(r.byJurisdiction.MI).toEqual({ tax: 72.5, count: 2 });
    expect(r.byJurisdiction.IN).toEqual({ tax: 70, count: 1 });
    expect(r.transactionCount).toBe(3);
    expect(r.periodLabel).toBe("2026-Q1");
  });
  it("empty period → zero liability", () => {
    expect(SalesUseTaxEngine.liabilityForPeriod([]).totalTax).toBe(0);
  });
  it("throws on a non-array", () => {
    // @ts-expect-error adversarial
    expect(() => SalesUseTaxEngine.liabilityForPeriod(null)).toThrow();
  });
  it("throws on a transaction with non-finite tax", () => {
    expect(() => SalesUseTaxEngine.liabilityForPeriod([{ jurisdiction: "MI", tax: NaN }])).toThrow();
  });
});
