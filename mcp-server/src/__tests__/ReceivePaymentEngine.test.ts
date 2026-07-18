/**
 * ReceivePaymentEngine.test.ts — QuickBooks "Receive Payment" cash-application parity.
 *
 * Reference values are hand-computed (NOT toBeDefined() stubs). Each test encodes WHY the behaviour
 * matters: a payment must reconcile to the penny against the open A/R it relieves, over-apply must
 * fail loud, and the returned GL must balance.
 */
import { describe, it, expect } from "vitest";
import { ReceivePaymentEngine } from "../engines/ReceivePaymentEngine.js";
import {
  CASH_ACCOUNT,
  ACCOUNTS_RECEIVABLE_ACCOUNT,
  CUSTOMER_CREDITS_ACCOUNT,
} from "../data/cash-application-accounts.js";

const PAY = (over: Record<string, unknown> = {}) => ({
  paymentId: "PMT-1",
  customerId: "CUST-1",
  amount: 500,
  date: "2026-03-01",
  method: "check" as const,
  ...over,
});

describe("ReceivePaymentEngine.applyPayment — happy path", () => {
  it("full single-invoice payment relieves the balance to zero, no unapplied credit", () => {
    const r = ReceivePaymentEngine.applyPayment(PAY({ amount: 500 }), [
      { invoiceId: "INV-1", balance: 500, date: "2026-01-15" },
    ]);
    expect(r.applied).toHaveLength(1);
    expect(r.applied[0].invoiceId).toBe("INV-1");
    expect(r.applied[0].amountApplied).toBeCloseTo(500, 2);
    expect(r.applied[0].newBalance).toBeCloseTo(0, 2);
    expect(r.totalApplied).toBeCloseTo(500, 2);
    expect(r.unappliedCredit).toBeCloseTo(0, 2);
    expect(r.fullyApplied).toBe(true);
  });

  it("partial payment leaves a remaining balance on the oldest invoice, no credit", () => {
    const r = ReceivePaymentEngine.applyPayment(PAY({ amount: 300 }), [
      { invoiceId: "INV-1", balance: 500, date: "2026-01-15" },
    ]);
    expect(r.applied[0].amountApplied).toBeCloseTo(300, 2);
    expect(r.applied[0].newBalance).toBeCloseTo(200, 2);
    expect(r.totalApplied).toBeCloseTo(300, 2);
    expect(r.unappliedCredit).toBeCloseTo(0, 2);
    expect(r.fullyApplied).toBe(true); // nothing left over from the payment
  });

  it("overpayment fully relieves the invoice and parks the remainder as a customer credit", () => {
    const r = ReceivePaymentEngine.applyPayment(PAY({ amount: 600 }), [
      { invoiceId: "INV-1", balance: 500, date: "2026-01-15" },
    ]);
    expect(r.applied[0].amountApplied).toBeCloseTo(500, 2);
    expect(r.applied[0].newBalance).toBeCloseTo(0, 2);
    expect(r.totalApplied).toBeCloseTo(500, 2);
    expect(r.unappliedCredit).toBeCloseTo(100, 2);
    expect(r.fullyApplied).toBe(false);
  });

  it("oldest-first fills invoices sequentially by date; last one partials with the remainder", () => {
    // payment 700 vs 300/300/300 (oldest→newest): fill 300, 300, then 100 on the third → 200 left.
    const r = ReceivePaymentEngine.applyPayment(PAY({ amount: 700 }), [
      { invoiceId: "INV-MAR", balance: 300, date: "2026-03-01" },
      { invoiceId: "INV-JAN", balance: 300, date: "2026-01-01" },
      { invoiceId: "INV-FEB", balance: 300, date: "2026-02-01" },
    ]);
    expect(r.applied.map((a) => a.invoiceId)).toEqual(["INV-JAN", "INV-FEB", "INV-MAR"]);
    expect(r.applied[0].amountApplied).toBeCloseTo(300, 2);
    expect(r.applied[0].newBalance).toBeCloseTo(0, 2);
    expect(r.applied[1].amountApplied).toBeCloseTo(300, 2);
    expect(r.applied[1].newBalance).toBeCloseTo(0, 2);
    expect(r.applied[2].amountApplied).toBeCloseTo(100, 2);
    expect(r.applied[2].newBalance).toBeCloseTo(200, 2);
    expect(r.totalApplied).toBeCloseTo(700, 2);
    expect(r.unappliedCredit).toBeCloseTo(0, 2);
  });

  it("specified strategy applies exactly the caller's allocations across multiple invoices", () => {
    const r = ReceivePaymentEngine.applyPayment(PAY({ amount: 500 }), [
      { invoiceId: "INV-A", balance: 300, date: "2026-01-01" },
      { invoiceId: "INV-B", balance: 400, date: "2026-02-01" },
    ], { strategy: "specified", allocations: [
      { invoiceId: "INV-A", amount: 200 },
      { invoiceId: "INV-B", amount: 300 },
    ] });
    expect(r.strategy).toBe("specified");
    const a = r.applied.find((x) => x.invoiceId === "INV-A")!;
    const b = r.applied.find((x) => x.invoiceId === "INV-B")!;
    expect(a.amountApplied).toBeCloseTo(200, 2);
    expect(a.newBalance).toBeCloseTo(100, 2);
    expect(b.amountApplied).toBeCloseTo(300, 2);
    expect(b.newBalance).toBeCloseTo(100, 2);
    expect(r.totalApplied).toBeCloseTo(500, 2);
    expect(r.unappliedCredit).toBeCloseTo(0, 2);
  });

  it("specified strategy with under-allocation leaves the remainder as unapplied credit", () => {
    const r = ReceivePaymentEngine.applyPayment(PAY({ amount: 500 }), [
      { invoiceId: "INV-A", balance: 300, date: "2026-01-01" },
      { invoiceId: "INV-B", balance: 400, date: "2026-02-01" },
    ], { strategy: "specified", allocations: [{ invoiceId: "INV-A", amount: 200 }] });
    expect(r.applied).toHaveLength(1);
    expect(r.applied[0].invoiceId).toBe("INV-A");
    expect(r.applied[0].amountApplied).toBeCloseTo(200, 2);
    expect(r.totalApplied).toBeCloseTo(200, 2);
    expect(r.unappliedCredit).toBeCloseTo(300, 2);
    expect(r.fullyApplied).toBe(false);
  });
});

describe("ReceivePaymentEngine.applyPayment — failure modes (fail loud)", () => {
  it("over-allocate (Σallocations > payment) THROWS", () => {
    expect(() =>
      ReceivePaymentEngine.applyPayment(PAY({ amount: 100 }), [
        { invoiceId: "INV-A", balance: 300, date: "2026-01-01" },
      ], { strategy: "specified", allocations: [{ invoiceId: "INV-A", amount: 200 }] }),
    ).toThrow(/over-allocate/);
  });

  it("per-invoice over-apply (allocation > invoice balance) THROWS", () => {
    expect(() =>
      ReceivePaymentEngine.applyPayment(PAY({ amount: 500 }), [
        { invoiceId: "INV-A", balance: 300, date: "2026-01-01" },
      ], { strategy: "specified", allocations: [{ invoiceId: "INV-A", amount: 400 }] }),
    ).toThrow(/over-apply/);
  });

  it("specified allocation against an unknown invoice THROWS", () => {
    expect(() =>
      ReceivePaymentEngine.applyPayment(PAY({ amount: 100 }), [
        { invoiceId: "INV-A", balance: 300, date: "2026-01-01" },
      ], { strategy: "specified", allocations: [{ invoiceId: "INV-GHOST", amount: 50 }] }),
    ).toThrow(/not in the open invoice set/);
  });

  it("specified strategy with no allocations THROWS (boundary)", () => {
    expect(() =>
      ReceivePaymentEngine.applyPayment(PAY({ amount: 100 }), [
        { invoiceId: "INV-A", balance: 300, date: "2026-01-01" },
      ], { strategy: "specified" }),
    ).toThrow(/requires a non-empty opts.allocations/);
  });

  it("duplicate open-invoice ids THROW (ambiguous open set)", () => {
    expect(() =>
      ReceivePaymentEngine.applyPayment(PAY({ amount: 100 }), [
        { invoiceId: "INV-A", balance: 300, date: "2026-01-01" },
        { invoiceId: "INV-A", balance: 200, date: "2026-02-01" },
      ]),
    ).toThrow(/duplicate invoiceId/);
  });

  it("duplicate allocation targets THROW (joint over-relief guard)", () => {
    expect(() =>
      ReceivePaymentEngine.applyPayment(PAY({ amount: 500 }), [
        { invoiceId: "INV-A", balance: 300, date: "2026-01-01" },
      ], { strategy: "specified", allocations: [
        { invoiceId: "INV-A", amount: 200 },
        { invoiceId: "INV-A", amount: 100 },
      ] }),
    ).toThrow(/duplicate allocation/);
  });
});

describe("ReceivePaymentEngine.applyPayment — adversarial inputs", () => {
  it("NaN payment amount THROWS (never silently coerced)", () => {
    expect(() =>
      ReceivePaymentEngine.applyPayment(PAY({ amount: Number.NaN }), [
        { invoiceId: "INV-A", balance: 300, date: "2026-01-01" },
      ]),
    ).toThrow();
  });

  it("Infinity payment amount THROWS", () => {
    expect(() =>
      ReceivePaymentEngine.applyPayment(PAY({ amount: Number.POSITIVE_INFINITY }), [
        { invoiceId: "INV-A", balance: 300, date: "2026-01-01" },
      ]),
    ).toThrow();
  });

  it("negative payment amount THROWS", () => {
    expect(() =>
      ReceivePaymentEngine.applyPayment(PAY({ amount: -100 }), [
        { invoiceId: "INV-A", balance: 300, date: "2026-01-01" },
      ]),
    ).toThrow();
  });

  it("empty open-invoice list → entire payment becomes unapplied credit", () => {
    const r = ReceivePaymentEngine.applyPayment(PAY({ amount: 250 }), []);
    expect(r.applied).toHaveLength(0);
    expect(r.totalApplied).toBeCloseTo(0, 2);
    expect(r.unappliedCredit).toBeCloseTo(250, 2);
    expect(r.fullyApplied).toBe(false);
  });

  it("negative invoice balance THROWS (a credit invoice is not 'open')", () => {
    expect(() =>
      ReceivePaymentEngine.applyPayment(PAY({ amount: 100 }), [
        { invoiceId: "INV-A", balance: -300, date: "2026-01-01" },
      ]),
    ).toThrow();
  });
});

describe("ReceivePaymentEngine — invariants & GL", () => {
  it("Σapplied + unappliedCredit === payment.amount EXACTLY across config matrix", () => {
    const cases: Array<{ amount: number; invoices: Array<{ invoiceId: string; balance: number; date: string }> }> = [
      { amount: 1000, invoices: [{ invoiceId: "A", balance: 400, date: "2026-01-01" }, { invoiceId: "B", balance: 400, date: "2026-02-01" }] }, // overpay → 200 credit
      { amount: 150.55, invoices: [{ invoiceId: "A", balance: 99.99, date: "2026-01-01" }, { invoiceId: "B", balance: 99.99, date: "2026-02-01" }] }, // partial fill on B
      { amount: 0.01, invoices: [{ invoiceId: "A", balance: 0.01, date: "2026-01-01" }] }, // sub-cent boundary
    ];
    for (const c of cases) {
      const r = ReceivePaymentEngine.applyPayment(PAY({ amount: c.amount }), c.invoices);
      expect(r.totalApplied + r.unappliedCredit).toBeCloseTo(r.paymentAmount, 2);
      // and per-invoice never exceeds the original balance
      for (const a of r.applied) {
        const orig = c.invoices.find((i) => i.invoiceId === a.invoiceId)!.balance;
        expect(a.amountApplied).toBeLessThanOrEqual(orig + 1e-6);
      }
    }
  });

  it("first config-matrix case overpays: 800 applied across two invoices, 200 credit", () => {
    const r = ReceivePaymentEngine.applyPayment(PAY({ amount: 1000 }), [
      { invoiceId: "A", balance: 400, date: "2026-01-01" },
      { invoiceId: "B", balance: 400, date: "2026-02-01" },
    ]);
    expect(r.totalApplied).toBeCloseTo(800, 2);
    expect(r.unappliedCredit).toBeCloseTo(200, 2);
    expect(r.applied.map((a) => a.newBalance)).toEqual([0, 0]);
  });

  it("GL lines balance (Σdebits === Σcredits): DR Cash / CR AR / CR Customer Credits", () => {
    const r = ReceivePaymentEngine.applyPayment(PAY({ amount: 600 }), [
      { invoiceId: "INV-1", balance: 500, date: "2026-01-15" },
    ]);
    const cash = r.glLines.find((l) => l.account === CASH_ACCOUNT.number)!;
    const ar = r.glLines.find((l) => l.account === ACCOUNTS_RECEIVABLE_ACCOUNT.number)!;
    const credit = r.glLines.find((l) => l.account === CUSTOMER_CREDITS_ACCOUNT.number)!;
    expect(cash.debit).toBeCloseTo(600, 2);
    expect(ar.credit).toBeCloseTo(500, 2);
    expect(credit.credit).toBeCloseTo(100, 2);
    const debits = r.glLines.reduce((s, l) => s + l.debit, 0);
    const credits = r.glLines.reduce((s, l) => s + l.credit, 0);
    expect(debits).toBeCloseTo(credits, 2);
    expect(debits).toBeCloseTo(600, 2);
  });

  it("fully-applied payment emits exactly two GL lines (Cash debit, AR credit) and no credit line", () => {
    const r = ReceivePaymentEngine.applyPayment(PAY({ amount: 500 }), [
      { invoiceId: "INV-1", balance: 500, date: "2026-01-15" },
    ]);
    expect(r.glLines).toHaveLength(2);
    expect(r.glLines.map((l) => l.account).sort()).toEqual(
      [CASH_ACCOUNT.number, ACCOUNTS_RECEIVABLE_ACCOUNT.number].sort(),
    );
    const creditLineCount = r.glLines.filter((l) => l.account === CUSTOMER_CREDITS_ACCOUNT.number).length;
    expect(creditLineCount).toBe(0);
    const debits = r.glLines.reduce((s, l) => s + l.debit, 0);
    const credits = r.glLines.reduce((s, l) => s + l.credit, 0);
    expect(debits).toBeCloseTo(500, 2);
    expect(credits).toBeCloseTo(500, 2);
  });

  it("half-even rounding: a $0.005 seam rounds to the even cent, payment still reconciles", () => {
    // payment 0.125 → roundCentsHalfEven → 0.12 (12.5 → even 12). Reconciliation holds on the rounded basis.
    const r = ReceivePaymentEngine.applyPayment(PAY({ amount: 0.125 }), [
      { invoiceId: "INV-1", balance: 1.0, date: "2026-01-15" },
    ]);
    expect(r.paymentAmount).toBeCloseTo(0.12, 3);
    expect(r.totalApplied).toBeCloseTo(0.12, 3);
    expect(r.applied[0].newBalance).toBeCloseTo(0.88, 3);
    expect(r.totalApplied + r.unappliedCredit).toBeCloseTo(r.paymentAmount, 3);
  });
});
