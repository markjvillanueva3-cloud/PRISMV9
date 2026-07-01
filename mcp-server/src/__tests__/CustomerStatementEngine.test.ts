/**
 * CustomerStatementEngine.test.ts — QB customer-statement parity (galaxy:business, slot:hotel).
 * Reference values are HAND-COMPUTED (see inline arithmetic), not toBeDefined() stubs.
 */
import { describe, it, expect } from "vitest";
import { CustomerStatementEngine } from "../engines/CustomerStatementEngine.js";
import { AR_AGING_BUCKET_DAYS } from "../data/ar-statement-policy.js";

describe("CustomerStatementEngine.generate — happy paths", () => {
  it("open-item: opening 0 + 2 invoices − 1 payment → closing 1200, aged current", () => {
    // opening 0; INV-1 $1000 @03-01, INV-2 $500 @03-15, PAY-1 $300 @03-20; asOf 03-31.
    // closing = 0 + 1500 − 300 = 1200.00
    // FIFO: $300 → oldest INV-1 (03-01) → INV-1 rem 700, INV-2 rem 500.
    // ages vs 03-31: INV-1 = 30d (≤30 → current), INV-2 = 16d (current). current = 1200.
    const s = CustomerStatementEngine.generate(
      {
        customerId: "CUST-100",
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
        openingBalance: 0,
        transactions: [
          { type: "invoice", date: "2026-03-01", amount: 1000, refId: "INV-1" },
          { type: "invoice", date: "2026-03-15", amount: 500, refId: "INV-2" },
          { type: "payment", date: "2026-03-20", amount: 300, refId: "PAY-1" },
        ],
      },
      { mode: "open-item", asOf: "2026-03-31" }
    );
    expect(s.openingBalance).toBeCloseTo(0, 2);
    expect(s.closingBalance).toBeCloseTo(1200, 2);
    expect(s.lines).toHaveLength(3);
    // running: 1000 → 1500 → 1200 (invoices sort before payment on different dates anyway)
    expect(s.lines[0].balance).toBeCloseTo(1000, 2);
    expect(s.lines[1].balance).toBeCloseTo(1500, 2);
    expect(s.lines[2].balance).toBeCloseTo(1200, 2);
    expect(s.lines[2].charge).toBeCloseTo(-300, 2); // payment is a negative charge
    expect(s.aging.current).toBeCloseTo(1200, 2);
    expect(s.aging.d30).toBeCloseTo(0, 2);
    expect(s.aging.d60).toBeCloseTo(0, 2);
    expect(s.aging.d90plus).toBeCloseTo(0, 2);
    expect(s.activity).toMatchObject({ invoices: 2, payments: 1, credits: 0, excludedOutOfWindow: 0 });
    expect(s.glReconciliation.account).toBe("1200");
    expect(s.glReconciliation.debits).toBeCloseTo(1500, 2); // Σ invoices
    expect(s.glReconciliation.credits).toBeCloseTo(300, 2); // Σ payments+credits
    expect(s.glReconciliation.netActivity).toBeCloseTo(1200, 2);
  });

  it("balance-forward: opening 500 + 1 invoice − 1 credit → closing 700", () => {
    // opening 500; INV-A $400 @04-10, CR-A $200 @04-12; asOf 04-30.
    // closing = 500 + 400 − 0(payments) − 200(credit) = 700.00
    const s = CustomerStatementEngine.generate(
      {
        customerId: "CUST-200",
        periodStart: "2026-04-01",
        periodEnd: "2026-04-30",
        openingBalance: 500,
        transactions: [
          { type: "invoice", date: "2026-04-10", amount: 400, refId: "INV-A" },
          { type: "credit", date: "2026-04-12", amount: 200, refId: "CR-A" },
        ],
      },
      { mode: "balance-forward" }
    );
    expect(s.mode).toBe("balance-forward");
    expect(s.openingBalance).toBeCloseTo(500, 2);
    expect(s.closingBalance).toBeCloseTo(700, 2);
    // asOf defaults to periodEnd (04-30). FIFO $200 credit → opening (oldest) → opening rem 300,
    // INV-A rem 400. opening ages d90plus (∞). INV-A age = 20d → current.
    // buckets: current 400, d90plus 300 → sum 700 ✓
    expect(s.aging.current).toBeCloseTo(400, 2);
    expect(s.aging.d90plus).toBeCloseTo(300, 2);
    expect(s.asOf).toBe("2026-04-30");
    expect(s.activity).toMatchObject({ invoices: 1, payments: 0, credits: 1 });
  });

  it("aging buckets sum to closing across all four buckets", () => {
    // opening 0; 4 invoices straddling the bucket boundaries, asOf 2026-06-30. No payments.
    // boundaries: ≤30 current, ≤60 d30, ≤90 d60, >90 d90plus.
    //  INV-CUR @06-15 (15d)  → current $100
    //  INV-30  @05-15 (46d)  → d30     $200
    //  INV-60  @04-15 (76d)  → d60     $300
    //  INV-90  @02-15 (135d) → d90plus $400
    // closing = 1000; buckets 100/200/300/400 sum 1000 ✓
    const s = CustomerStatementEngine.generate(
      {
        customerId: "CUST-300",
        periodStart: "2026-01-01",
        periodEnd: "2026-06-30",
        openingBalance: 0,
        transactions: [
          { type: "invoice", date: "2026-06-15", amount: 100, refId: "INV-CUR" },
          { type: "invoice", date: "2026-05-15", amount: 200, refId: "INV-30" },
          { type: "invoice", date: "2026-04-15", amount: 300, refId: "INV-60" },
          { type: "invoice", date: "2026-02-15", amount: 400, refId: "INV-90" },
        ],
      },
      { asOf: "2026-06-30" }
    );
    expect(s.closingBalance).toBeCloseTo(1000, 2);
    expect(s.aging.current).toBeCloseTo(100, 2);
    expect(s.aging.d30).toBeCloseTo(200, 2);
    expect(s.aging.d60).toBeCloseTo(300, 2);
    expect(s.aging.d90plus).toBeCloseTo(400, 2);
    const sum = s.aging.current + s.aging.d30 + s.aging.d60 + s.aging.d90plus;
    expect(sum).toBeCloseTo(s.closingBalance, 2);
  });

  it("exact bucket-boundary ages land in the lower bucket (inclusive upper edge)", () => {
    // asOf 2026-04-30. INV @ exactly 30d (03-31) → current. INV @ exactly 60d (03-01) → d30.
    const s = CustomerStatementEngine.generate(
      {
        customerId: "CUST-310",
        periodStart: "2026-01-01",
        periodEnd: "2026-04-30",
        openingBalance: 0,
        transactions: [
          { type: "invoice", date: "2026-03-31", amount: 50, refId: "EDGE-30" }, // 30 days exactly
          { type: "invoice", date: "2026-03-01", amount: 70, refId: "EDGE-60" }, // 60 days exactly
        ],
      },
      { asOf: "2026-04-30" }
    );
    expect(AR_AGING_BUCKET_DAYS.current).toBe(30); // policy boundary, imported not inlined
    expect(s.aging.current).toBeCloseTo(50, 2); // 30d → current (≤30 inclusive)
    expect(s.aging.d30).toBeCloseTo(70, 2); // 60d → d30 (≤60 inclusive)
  });
});

describe("CustomerStatementEngine.generate — period filtering & credit balances", () => {
  it("excludes out-of-window transactions from lines, closing, and aging", () => {
    // window 2026-05-01..05-31. One in-window invoice $100, one BEFORE, one AFTER.
    // closing = 0 + 100 = 100 (only the in-window invoice counts).
    const s = CustomerStatementEngine.generate(
      {
        customerId: "CUST-400",
        periodStart: "2026-05-01",
        periodEnd: "2026-05-31",
        openingBalance: 0,
        transactions: [
          { type: "invoice", date: "2026-04-30", amount: 999, refId: "BEFORE" },
          { type: "invoice", date: "2026-05-10", amount: 100, refId: "IN" },
          { type: "invoice", date: "2026-06-01", amount: 888, refId: "AFTER" },
        ],
      },
      { asOf: "2026-05-31" }
    );
    expect(s.lines).toHaveLength(1);
    expect(s.lines[0].refId).toBe("IN");
    expect(s.closingBalance).toBeCloseTo(100, 2);
    expect(s.activity.excludedOutOfWindow).toBe(2);
    expect(s.aging.current).toBeCloseTo(100, 2);
  });

  it("negative closing (customer credit balance) is allowed and parks in current", () => {
    // opening 0; INV $100 @07-05, PAY $250 @07-10 (overpayment). closing = 100 − 250 = −150.
    const s = CustomerStatementEngine.generate(
      {
        customerId: "CUST-500",
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
        openingBalance: 0,
        transactions: [
          { type: "invoice", date: "2026-07-05", amount: 100, refId: "INV-X" },
          { type: "payment", date: "2026-07-10", amount: 250, refId: "PAY-X" },
        ],
      },
      { asOf: "2026-07-31" }
    );
    expect(s.closingBalance).toBeCloseTo(-150, 2);
    expect(s.aging.current).toBeCloseTo(-150, 2); // credit balance → current
    expect(s.aging.d30 + s.aging.d60 + s.aging.d90plus).toBeCloseTo(0, 2);
    // still reconciles: buckets sum to closing
    const sum = s.aging.current + s.aging.d30 + s.aging.d60 + s.aging.d90plus;
    expect(sum).toBeCloseTo(s.closingBalance, 2);
  });

  it("empty transactions → closing equals opening, no lines", () => {
    const s = CustomerStatementEngine.generate(
      { customerId: "CUST-600", periodStart: "2026-08-01", periodEnd: "2026-08-31", openingBalance: 425.5, transactions: [] },
      { asOf: "2026-08-31" }
    );
    expect(s.lines).toHaveLength(0);
    expect(s.closingBalance).toBeCloseTo(425.5, 2);
    expect(s.openingBalance).toBeCloseTo(425.5, 2);
    // opening>0 with no activity ages as the oldest open item → d90plus
    expect(s.aging.d90plus).toBeCloseTo(425.5, 2);
    expect(s.aging.current).toBeCloseTo(0, 2);
  });

  it("banker's rounding: half-cent ties round to even on the running balance", () => {
    // 0.125 → 0.12 (even), tested via two invoices that each carry a half-cent.
    const s = CustomerStatementEngine.generate(
      {
        customerId: "CUST-700",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        openingBalance: 0,
        transactions: [{ type: "invoice", date: "2026-09-05", amount: 0.125, refId: "HALF" }],
      },
      { asOf: "2026-09-30" }
    );
    expect(s.closingBalance).toBeCloseTo(0.12, 5); // round-half-to-even: 0.125 → 0.12
  });
});

describe("CustomerStatementEngine.generate — failure & adversarial modes", () => {
  it("throws on a NaN amount", () => {
    expect(() =>
      CustomerStatementEngine.generate({
        customerId: "C", periodStart: "2026-01-01", periodEnd: "2026-01-31", openingBalance: 0,
        transactions: [{ type: "invoice", date: "2026-01-05", amount: Number.NaN, refId: "BAD" }],
      })
    ).toThrow();
  });

  it("throws on an Infinity opening balance", () => {
    expect(() =>
      CustomerStatementEngine.generate({
        customerId: "C", periodStart: "2026-01-01", periodEnd: "2026-01-31",
        openingBalance: Number.POSITIVE_INFINITY, transactions: [],
      })
    ).toThrow();
  });

  it("throws on an unknown transaction type", () => {
    expect(() =>
      CustomerStatementEngine.generate({
        customerId: "C", periodStart: "2026-01-01", periodEnd: "2026-01-31", openingBalance: 0,
        // @ts-expect-error — deliberately invalid type to prove the zod enum + fail-loud guard
        transactions: [{ type: "refund", date: "2026-01-05", amount: 10, refId: "R" }],
      })
    ).toThrow();
  });

  it("throws on a negative transaction amount (magnitude must be positive; sign comes from type)", () => {
    expect(() =>
      CustomerStatementEngine.generate({
        customerId: "C", periodStart: "2026-01-01", periodEnd: "2026-01-31", openingBalance: 0,
        transactions: [{ type: "payment", date: "2026-01-05", amount: -50, refId: "NEG" }],
      })
    ).toThrow(/negative amount/);
  });

  it("throws on an inverted period window (periodEnd < periodStart)", () => {
    expect(() =>
      CustomerStatementEngine.generate({
        customerId: "C", periodStart: "2026-03-31", periodEnd: "2026-03-01", openingBalance: 0, transactions: [],
      })
    ).toThrow(/inverted period/);
  });

  it("throws on an empty refId (audit-trail integrity)", () => {
    expect(() =>
      CustomerStatementEngine.generate({
        customerId: "C", periodStart: "2026-01-01", periodEnd: "2026-01-31", openingBalance: 0,
        transactions: [{ type: "invoice", date: "2026-01-05", amount: 10, refId: "" }],
      })
    ).toThrow();
  });
});

describe("CustomerStatementEngine.generate — spanning configs", () => {
  it("open-item vs balance-forward produce identical balances on the same data", () => {
    const input = {
      customerId: "CUST-800",
      periodStart: "2026-02-01",
      periodEnd: "2026-02-28",
      openingBalance: 100,
      transactions: [
        { type: "invoice" as const, date: "2026-02-05", amount: 200, refId: "I1" },
        { type: "payment" as const, date: "2026-02-20", amount: 50, refId: "P1" },
      ],
    };
    const openItem = CustomerStatementEngine.generate(input, { mode: "open-item", asOf: "2026-02-28" });
    const balFwd = CustomerStatementEngine.generate(input, { mode: "balance-forward", asOf: "2026-02-28" });
    // closing = 100 + 200 − 50 = 250 in both modes
    expect(openItem.closingBalance).toBeCloseTo(250, 2);
    expect(balFwd.closingBalance).toBeCloseTo(openItem.closingBalance, 2);
    expect(balFwd.aging).toEqual(openItem.aging);
  });

  it("asOf later than periodEnd ages invoices further into older buckets", () => {
    // INV $100 @05-01. asOf 05-31 → 30d (current). asOf 07-15 → 75d (d60).
    const base = {
      customerId: "CUST-810", periodStart: "2026-05-01", periodEnd: "2026-05-31", openingBalance: 0,
      transactions: [{ type: "invoice" as const, date: "2026-05-01", amount: 100, refId: "AGE" }],
    };
    const early = CustomerStatementEngine.generate(base, { asOf: "2026-05-31" });
    const late = CustomerStatementEngine.generate(base, { asOf: "2026-07-15" });
    expect(early.aging.current).toBeCloseTo(100, 2);
    expect(late.aging.d60).toBeCloseTo(100, 2);
    expect(late.aging.current).toBeCloseTo(0, 2);
  });

  it("multi-invoice with partial FIFO payment splits remainder across buckets", () => {
    // opening 0; INV-OLD $300 @02-01 (very old), INV-NEW $200 @06-20 (current); PAY $100 @06-25.
    // asOf 2026-06-30. closing = 500 − 100 = 400.
    // FIFO $100 → INV-OLD (oldest) → INV-OLD rem 200, INV-NEW rem 200.
    // ages vs 06-30: INV-OLD 02-01 = 149d → d90plus 200; INV-NEW 06-20 = 10d → current 200.
    const s = CustomerStatementEngine.generate(
      {
        customerId: "CUST-820",
        periodStart: "2026-01-01",
        periodEnd: "2026-06-30",
        openingBalance: 0,
        transactions: [
          { type: "invoice", date: "2026-02-01", amount: 300, refId: "INV-OLD" },
          { type: "invoice", date: "2026-06-20", amount: 200, refId: "INV-NEW" },
          { type: "payment", date: "2026-06-25", amount: 100, refId: "PAY-PART" },
        ],
      },
      { asOf: "2026-06-30" }
    );
    expect(s.closingBalance).toBeCloseTo(400, 2);
    expect(s.aging.current).toBeCloseTo(200, 2);
    expect(s.aging.d90plus).toBeCloseTo(200, 2);
    const sum = s.aging.current + s.aging.d30 + s.aging.d60 + s.aging.d90plus;
    expect(sum).toBeCloseTo(s.closingBalance, 2);
  });
});
