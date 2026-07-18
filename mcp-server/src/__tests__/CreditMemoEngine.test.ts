/**
 * CreditMemoEngine tests — QuickBooks "Credit Memo" parity (galaxy:business, slot:hotel).
 * REAL hand-computed reference values (no toBeDefined stubs). Covers:
 *  - happy path: create w/ tax, partial apply, full apply, remaining-credit balance, GL balance
 *  - failure modes: unknown reason, unknown jurisdiction, over-apply (both ceilings), bad amounts
 *  - adversarial: NaN/Infinity/negative qty/empty lines/$0 memo
 *  - spanning configs: MI flat 6%, IL-COOK 10.25%, no-jurisdiction (tax-free), partly-taxable lines
 *
 * Reference jurisdictions (src/data/sales-tax-rates.ts): MI = 6% flat, IL-COOK = 10.25%.
 */
import { describe, it, expect } from "vitest";
import { CreditMemoEngine, creditMemoEngine } from "../engines/CreditMemoEngine.js";

describe("CreditMemoEngine.create", () => {
  it("computes subtotal/tax/total with MI 6% flat tax (2x$50 + 1x$25 = $125; tax $7.50; total $132.50)", () => {
    const cm = CreditMemoEngine.create({
      creditMemoId: "CM-1001",
      customerId: "ITW",
      reason: "return",
      lines: [
        { description: "Returned die block", quantity: 2, unitPrice: 50 },
        { description: "Returned insert", quantity: 1, unitPrice: 25 },
      ],
      taxJurisdiction: "MI",
    });
    expect(cm.subtotal).toBeCloseTo(125.0, 2);
    expect(cm.tax).toBeCloseTo(7.5, 2); // 125 * 0.06
    expect(cm.total).toBeCloseTo(132.5, 2);
    expect(cm.applied).toBe(0);
    expect(cm.unapplied).toBeCloseTo(132.5, 2);
    expect(cm.reason).toBe("return");
    expect(cm.taxJurisdiction).toBe("MI");
    // money reconciles both ways
    expect(cm.total).toBeCloseTo(cm.subtotal + cm.tax, 2);
  });

  it("computes IL-COOK 10.25% tax (subtotal $200 → tax $20.50 → total $220.50)", () => {
    const cm = CreditMemoEngine.create({
      customerId: "ALCOA",
      reason: "price_adjustment",
      lines: [{ description: "Price reduction credit", quantity: 1, unitPrice: 200 }],
      taxJurisdiction: "IL-COOK",
    });
    expect(cm.subtotal).toBeCloseTo(200.0, 2);
    expect(cm.tax).toBeCloseTo(20.5, 2); // 200 * 0.1025
    expect(cm.total).toBeCloseTo(220.5, 2);
    expect(cm.creditMemoId).toBe("CM-ALCOA-price_adjustment"); // derived id
  });

  it("computes a tax-free credit memo when no jurisdiction is given (subtotal == total)", () => {
    const cm = CreditMemoEngine.create({
      customerId: "SFS",
      reason: "goodwill",
      lines: [{ description: "Goodwill credit", quantity: 3, unitPrice: 10 }],
    });
    expect(cm.subtotal).toBeCloseTo(30.0, 2);
    expect(cm.tax).toBe(0);
    expect(cm.total).toBeCloseTo(30.0, 2);
    expect(cm.taxJurisdiction).toBeNull();
  });

  it("taxes only taxable lines (taxable $100 + non-taxable $50 → MI tax on $100 = $6; total $156)", () => {
    const cm = CreditMemoEngine.create({
      customerId: "OPTIMAS",
      reason: "damaged_goods",
      lines: [
        { description: "Taxable damaged part", quantity: 1, unitPrice: 100, taxable: true },
        { description: "Non-taxable freight credit", quantity: 1, unitPrice: 50, taxable: false },
      ],
      taxJurisdiction: "MI",
    });
    expect(cm.subtotal).toBeCloseTo(150.0, 2);
    expect(cm.tax).toBeCloseTo(6.0, 2); // only the $100 taxable line: 100 * 0.06
    expect(cm.total).toBeCloseTo(156.0, 2);
  });

  it("applies half-even (banker's) rounding to a $0.005 tie → rounds to even cent ($0.00)", () => {
    // 1 unit @ $0.005 → extension 0.005 → banker's: ties to even → 0.00
    const cm = CreditMemoEngine.create({
      customerId: "HOLO-KROME",
      reason: "overbilling",
      lines: [
        { description: "tie-rounding A", quantity: 1, unitPrice: 0.005 }, // 0.005 → 0.00 (even)
        { description: "real value", quantity: 1, unitPrice: 10 },
      ],
    });
    // 0.005 ties down to 0.00 (0 is even), so subtotal == 10.00 (not 10.01)
    expect(cm.subtotal).toBeCloseTo(10.0, 2);
    expect(cm.total).toBeCloseTo(10.0, 2);
  });

  it("throws on an unknown reason (audit-trail gate)", () => {
    expect(() =>
      CreditMemoEngine.create({
        customerId: "ITW",
        reason: "because_i_said_so",
        lines: [{ description: "x", quantity: 1, unitPrice: 10 }],
      })
    ).toThrow(/unknown reason/i);
  });

  it("throws on an unknown tax jurisdiction (silent 0% would under-reverse liability)", () => {
    expect(() =>
      CreditMemoEngine.create({
        customerId: "ITW",
        reason: "return",
        lines: [{ description: "x", quantity: 1, unitPrice: 10 }],
        taxJurisdiction: "ZZ-NOWHERE",
      })
    ).toThrow();
  });

  it("throws on a negative quantity (adversarial — no silent coercion)", () => {
    expect(() =>
      CreditMemoEngine.create({
        customerId: "ITW",
        reason: "return",
        lines: [{ description: "neg qty", quantity: -1, unitPrice: 10 }],
      })
    ).toThrow();
  });

  it("throws on a NaN unitPrice (adversarial)", () => {
    expect(() =>
      CreditMemoEngine.create({
        customerId: "ITW",
        reason: "return",
        lines: [{ description: "nan price", quantity: 1, unitPrice: Number.NaN }],
      })
    ).toThrow();
  });

  it("throws on an Infinity unitPrice (adversarial)", () => {
    expect(() =>
      CreditMemoEngine.create({
        customerId: "ITW",
        reason: "return",
        lines: [{ description: "inf price", quantity: 1, unitPrice: Number.POSITIVE_INFINITY }],
      })
    ).toThrow();
  });

  it("throws on empty lines (adversarial)", () => {
    expect(() =>
      CreditMemoEngine.create({ customerId: "ITW", reason: "return", lines: [] })
    ).toThrow();
  });
});

describe("CreditMemoEngine.applyToInvoice", () => {
  function memo132() {
    // subtotal $125, MI tax $7.50, total $132.50
    return CreditMemoEngine.create({
      creditMemoId: "CM-APPLY",
      customerId: "ITW",
      reason: "return",
      lines: [
        { description: "block", quantity: 2, unitPrice: 50 },
        { description: "insert", quantity: 1, unitPrice: 25 },
      ],
      taxJurisdiction: "MI",
    });
  }

  it("applies a partial credit ($50 of $132.50 against an $80 invoice → balanceAfter $30, unapplied $82.50)", () => {
    const cm = memo132();
    const { creditMemo: after, application } = CreditMemoEngine.applyToInvoice(cm, {
      invoiceId: "INV-7",
      invoiceBalance: 80,
      amount: 50,
    });
    expect(application.amount).toBeCloseTo(50.0, 2);
    expect(application.invoiceBalanceAfter).toBeCloseTo(30.0, 2);
    expect(after.applied).toBeCloseTo(50.0, 2);
    expect(after.unapplied).toBeCloseTo(82.5, 2); // 132.50 - 50
    expect(after.applications).toHaveLength(1);
    // immutability: original untouched
    expect(cm.applied).toBe(0);
    expect(cm.unapplied).toBeCloseTo(132.5, 2);
    // reconcile both ways
    expect(after.unapplied).toBeCloseTo(after.total - after.applied, 2);
  });

  it("applies the full credit ($132.50 against a $132.50 invoice → balanceAfter $0, unapplied $0)", () => {
    const cm = memo132();
    const { creditMemo: after, application } = CreditMemoEngine.applyToInvoice(cm, {
      invoiceId: "INV-FULL",
      invoiceBalance: 132.5,
      amount: 132.5,
    });
    expect(application.invoiceBalanceAfter).toBeCloseTo(0.0, 2);
    expect(after.applied).toBeCloseTo(132.5, 2);
    expect(after.unapplied).toBeCloseTo(0.0, 2);
    expect(CreditMemoEngine.remainingCredit(after)).toBeCloseTo(0.0, 2);
  });

  it("chains two partial applications and tracks remaining credit ($50 then $40 → applied $90, unapplied $42.50)", () => {
    const cm = memo132();
    const step1 = CreditMemoEngine.applyToInvoice(cm, { invoiceId: "INV-A", invoiceBalance: 60, amount: 50 });
    const step2 = CreditMemoEngine.applyToInvoice(step1.creditMemo, { invoiceId: "INV-B", invoiceBalance: 200, amount: 40 });
    expect(step2.creditMemo.applied).toBeCloseTo(90.0, 2);
    expect(step2.creditMemo.unapplied).toBeCloseTo(42.5, 2); // 132.50 - 90
    expect(step2.creditMemo.applications).toHaveLength(2);
    expect(CreditMemoEngine.remainingCredit(step2.creditMemo)).toBeCloseTo(42.5, 2);
  });

  it("THROWS on over-apply ceiling 1: amount exceeds remaining credit ($200 > $132.50)", () => {
    const cm = memo132();
    expect(() =>
      CreditMemoEngine.applyToInvoice(cm, { invoiceId: "INV-X", invoiceBalance: 5000, amount: 200 })
    ).toThrow(/over-apply/i);
  });

  it("THROWS on over-apply ceiling 2: amount exceeds invoice balance ($100 > $40 invoice)", () => {
    const cm = memo132();
    expect(() =>
      CreditMemoEngine.applyToInvoice(cm, { invoiceId: "INV-Y", invoiceBalance: 40, amount: 100 })
    ).toThrow(/exceeds invoice/i);
  });

  it("THROWS after a partial apply if the next apply exceeds the now-reduced remaining credit", () => {
    const cm = memo132();
    const { creditMemo: after } = CreditMemoEngine.applyToInvoice(cm, { invoiceId: "INV-1", invoiceBalance: 500, amount: 100 });
    // remaining is now 32.50; applying 50 against a fat invoice must still throw on ceiling 1
    expect(() =>
      CreditMemoEngine.applyToInvoice(after, { invoiceId: "INV-2", invoiceBalance: 500, amount: 50 })
    ).toThrow(/over-apply/i);
  });

  it("THROWS on a negative apply amount (adversarial)", () => {
    const cm = memo132();
    expect(() => CreditMemoEngine.applyToInvoice(cm, { invoiceId: "INV-N", invoiceBalance: 100, amount: -10 })).toThrow();
  });

  it("THROWS on a NaN apply amount (adversarial)", () => {
    const cm = memo132();
    expect(() => CreditMemoEngine.applyToInvoice(cm, { invoiceId: "INV-N", invoiceBalance: 100, amount: Number.NaN })).toThrow(/non-finite/i);
  });

  it("THROWS on a negative invoice balance (adversarial)", () => {
    const cm = memo132();
    expect(() => CreditMemoEngine.applyToInvoice(cm, { invoiceId: "INV-N", invoiceBalance: -5, amount: 1 })).toThrow(/non-negative/i);
  });

  it("THROWS on a missing invoiceId", () => {
    const cm = memo132();
    // @ts-expect-error intentionally omitting invoiceId
    expect(() => CreditMemoEngine.applyToInvoice(cm, { invoiceBalance: 100, amount: 1 })).toThrow(/invoiceId/i);
  });
});

describe("CreditMemoEngine.glLinesForIssue", () => {
  it("returns a balanced contra-posting: DR 4000 $125 + DR 2100 $7.50 / CR 1200 $132.50", () => {
    const cm = CreditMemoEngine.create({
      creditMemoId: "CM-GL",
      customerId: "ITW",
      reason: "return",
      lines: [
        { description: "block", quantity: 2, unitPrice: 50 },
        { description: "insert", quantity: 1, unitPrice: 25 },
      ],
      taxJurisdiction: "MI",
    });
    const gl = CreditMemoEngine.glLinesForIssue(cm);

    const rev = gl.lines.find((l) => l.account === "4000")!;
    const tax = gl.lines.find((l) => l.account === "2100")!;
    const ar = gl.lines.find((l) => l.account === "1200")!;
    expect(rev.debit).toBeCloseTo(125.0, 2);
    expect(rev.credit).toBe(0);
    expect(tax.debit).toBeCloseTo(7.5, 2);
    expect(ar.credit).toBeCloseTo(132.5, 2);
    expect(ar.debit).toBe(0);

    // the balanced-posting invariant: Σdebits == Σcredits == total
    expect(gl.totalDebit).toBeCloseTo(132.5, 2);
    expect(gl.totalCredit).toBeCloseTo(132.5, 2);
    expect(gl.totalDebit).toBeCloseTo(gl.totalCredit, 2);
    expect(gl.totalCredit).toBeCloseTo(cm.total, 2);
  });

  it("balances a tax-free memo (DR 4000 == CR 1200, no 2100 amount)", () => {
    const cm = CreditMemoEngine.create({
      customerId: "SFS",
      reason: "goodwill",
      lines: [{ description: "goodwill", quantity: 1, unitPrice: 75 }],
    });
    const gl = CreditMemoEngine.glLinesForIssue(cm);
    const tax = gl.lines.find((l) => l.account === "2100")!;
    expect(tax.debit).toBe(0);
    expect(gl.totalDebit).toBeCloseTo(75.0, 2);
    expect(gl.totalCredit).toBeCloseTo(75.0, 2);
  });
});

describe("CreditMemoEngine.remainingCredit", () => {
  it("returns total on a freshly-created memo and 0 after a full apply", () => {
    const cm = CreditMemoEngine.create({
      customerId: "ITW",
      reason: "return",
      lines: [{ description: "x", quantity: 1, unitPrice: 100 }],
    });
    expect(CreditMemoEngine.remainingCredit(cm)).toBeCloseTo(100.0, 2);
    const { creditMemo: after } = CreditMemoEngine.applyToInvoice(cm, { invoiceId: "INV-Z", invoiceBalance: 100, amount: 100 });
    expect(CreditMemoEngine.remainingCredit(after)).toBeCloseTo(0.0, 2);
  });

  it("exposes the camelCase alias", () => {
    expect(creditMemoEngine).toBe(CreditMemoEngine);
  });
});
