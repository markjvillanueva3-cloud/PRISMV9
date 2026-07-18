/**
 * BillPaymentCheckRunEngine tests — QuickBooks "Pay Bills" / check-run parity (A/P mirror of
 * ReceivePaymentEngine). REAL hand-computed reference values; covers happy path, due-date-first
 * across vendors, specified allocations, over-pay/over-disburse throws, per-vendor check
 * aggregation, GL balance, and adversarial (NaN / Infinity / negative / empty) inputs.
 */
import { describe, it, expect } from "vitest";
import {
  BillPaymentCheckRunEngine,
  billPaymentCheckRunEngine,
} from "../engines/BillPaymentCheckRunEngine.js";
import {
  ACCOUNTS_PAYABLE_ACCOUNT,
  CASH_ACCOUNT,
} from "../data/bill-payment-accounts.js";

const RUN = { runId: "RUN-001", paymentDate: "2026-05-29", method: "check" as const };

describe("BillPaymentCheckRunEngine.payBills — happy path", () => {
  it("pays a single bill in full (no cash limit)", () => {
    const res = BillPaymentCheckRunEngine.payBills(RUN, [
      { billId: "B1", vendorId: "V1", balance: 1234.56, dueDate: "2026-05-01" },
    ]);
    expect(res.totalPaid).toBeCloseTo(1234.56, 2);
    expect(res.payments).toHaveLength(1);
    expect(res.payments[0].amountPaid).toBeCloseTo(1234.56, 2);
    expect(res.payments[0].newBalance).toBeCloseTo(0, 2);
    expect(res.unusedFunds).toBeCloseTo(0, 2);
    // one check for V1
    expect(res.checks).toHaveLength(1);
    expect(res.checks[0].vendorId).toBe("V1");
    expect(res.checks[0].amount).toBeCloseTo(1234.56, 2);
    expect(res.checks[0].billIds).toEqual(["B1"]);
    expect(res.checks[0].checkNo).toBe("CHK-RUN-001-1");
  });

  it("partial-pays the boundary bill under a cash limit (due-date-first)", () => {
    // Two bills, $500 + $300 = $800 owed; cash limit $650. Oldest-due (B1, $500) paid full,
    // remaining $150 partials B2 ($300 → 150 paid, 150 left). unused = 0.
    const res = BillPaymentCheckRunEngine.payBills(RUN, [
      { billId: "B1", vendorId: "V1", balance: 500, dueDate: "2026-04-01" },
      { billId: "B2", vendorId: "V1", balance: 300, dueDate: "2026-05-01" },
    ], { cashLimit: 650 });
    expect(res.totalPaid).toBeCloseTo(650, 2);
    expect(res.unusedFunds).toBeCloseTo(0, 2);
    const b1 = res.payments.find((p) => p.billId === "B1")!;
    const b2 = res.payments.find((p) => p.billId === "B2")!;
    expect(b1.amountPaid).toBeCloseTo(500, 2);
    expect(b1.newBalance).toBeCloseTo(0, 2);
    expect(b2.amountPaid).toBeCloseTo(150, 2);
    expect(b2.newBalance).toBeCloseTo(150, 2);
    // both bills are V1 → single aggregated check
    expect(res.checks).toHaveLength(1);
    expect(res.checks[0].amount).toBeCloseTo(650, 2);
    expect(res.checks[0].billIds).toEqual(["B1", "B2"]);
  });

  it("reports unusedFunds when the cash limit exceeds total owed", () => {
    // $200 owed, $500 limit → pay 200, unused 300.
    const res = BillPaymentCheckRunEngine.payBills(RUN, [
      { billId: "B1", vendorId: "V1", balance: 200, dueDate: "2026-05-01" },
    ], { cashLimit: 500 });
    expect(res.totalPaid).toBeCloseTo(200, 2);
    expect(res.unusedFunds).toBeCloseTo(300, 2);
    // reconciles both ways
    expect(res.totalPaid + res.unusedFunds).toBeCloseTo(500, 2);
  });
});

describe("BillPaymentCheckRunEngine.payBills — due-date-first ordering across vendors", () => {
  it("pays oldest-due first across vendors and groups one check per vendor", () => {
    // V1/B1 due 2026-03-01 ($100), V2/B2 due 2026-04-01 ($200), V1/B3 due 2026-05-01 ($300).
    // limit $450 → pay B1 (100), B2 (200), then B3 partial (150). unused 0.
    const res = BillPaymentCheckRunEngine.payBills(RUN, [
      { billId: "B3", vendorId: "V1", balance: 300, dueDate: "2026-05-01" },
      { billId: "B1", vendorId: "V1", balance: 100, dueDate: "2026-03-01" },
      { billId: "B2", vendorId: "V2", balance: 200, dueDate: "2026-04-01" },
    ], { cashLimit: 450 });

    expect(res.totalPaid).toBeCloseTo(450, 2);
    // payment order follows due-date ascending: B1, B2, B3
    expect(res.payments.map((p) => p.billId)).toEqual(["B1", "B2", "B3"]);
    const b3 = res.payments.find((p) => p.billId === "B3")!;
    expect(b3.amountPaid).toBeCloseTo(150, 2);
    expect(b3.newBalance).toBeCloseTo(150, 2);

    // two vendor checks; V1 aggregates B1 + B3 = 100 + 150 = 250, V2 = 200.
    expect(res.checks).toHaveLength(2);
    const c1 = res.checks.find((c) => c.vendorId === "V1")!;
    const c2 = res.checks.find((c) => c.vendorId === "V2")!;
    expect(c1.amount).toBeCloseTo(250, 2);
    expect(c1.billIds).toEqual(["B1", "B3"]);
    expect(c2.amount).toBeCloseTo(200, 2);
    expect(c2.billIds).toEqual(["B2"]);
    // Σ check amounts === totalPaid
    expect(c1.amount + c2.amount).toBeCloseTo(res.totalPaid, 2);
  });

  it("pays every open bill in full when no cash limit is given", () => {
    const res = BillPaymentCheckRunEngine.payBills(RUN, [
      { billId: "B1", vendorId: "V1", balance: 100, dueDate: "2026-03-01" },
      { billId: "B2", vendorId: "V2", balance: 250, dueDate: "2026-04-01" },
    ]);
    expect(res.totalPaid).toBeCloseTo(350, 2);
    expect(res.unusedFunds).toBeCloseTo(0, 2);
    expect(res.payments.map((p) => p.newBalance)).toEqual([0, 0]);
    expect(res.checks).toHaveLength(2);
  });
});

describe("BillPaymentCheckRunEngine.payBills — specified allocations", () => {
  it("pays exact specified allocations, leaving unallocated bills untouched", () => {
    // B1 owes 1000, B2 owes 500. Specify B1→400 only. B2 untouched (no line).
    const res = BillPaymentCheckRunEngine.payBills(RUN, [
      { billId: "B1", vendorId: "V1", balance: 1000, dueDate: "2026-05-01" },
      { billId: "B2", vendorId: "V2", balance: 500, dueDate: "2026-04-01" },
    ], { strategy: "specified", allocations: [{ billId: "B1", amount: 400 }] });

    expect(res.totalPaid).toBeCloseTo(400, 2);
    expect(res.payments).toHaveLength(1);
    expect(res.payments[0].billId).toBe("B1");
    expect(res.payments[0].newBalance).toBeCloseTo(600, 2);
    // unusedFunds is 0 for specified runs (no run cash ceiling)
    expect(res.unusedFunds).toBeCloseTo(0, 2);
    expect(res.checks).toHaveLength(1);
    expect(res.checks[0].vendorId).toBe("V1");
  });

  it("drops zero allocations (bill left untouched)", () => {
    const res = BillPaymentCheckRunEngine.payBills(RUN, [
      { billId: "B1", vendorId: "V1", balance: 1000, dueDate: "2026-05-01" },
    ], { strategy: "specified", allocations: [{ billId: "B1", amount: 0 }] });
    expect(res.payments).toHaveLength(0);
    expect(res.totalPaid).toBeCloseTo(0, 2);
    expect(res.glLines).toHaveLength(0); // zero-total run emits no GL lines
    expect(res.checks).toHaveLength(0);
  });
});

describe("BillPaymentCheckRunEngine.payBills — banker's rounding", () => {
  it("applies half-even rounding to the cent on a tie", () => {
    // 2.125 sits exactly on a half-cent tie → rounds to even cent 2.12 (NOT 2.13).
    const res = BillPaymentCheckRunEngine.payBills(RUN, [
      { billId: "B1", vendorId: "V1", balance: 2.125, dueDate: "2026-05-01" },
    ], { strategy: "specified", allocations: [{ billId: "B1", amount: 2.125 }] });
    expect(res.totalPaid).toBeCloseTo(2.12, 2);
    expect(res.payments[0].amountPaid).toBeCloseTo(2.12, 2);
  });
});

describe("BillPaymentCheckRunEngine.payBills — GL balance invariant", () => {
  it("returns a balanced DR 2000 AP / CR 1000 Cash entry", () => {
    const res = BillPaymentCheckRunEngine.payBills(RUN, [
      { billId: "B1", vendorId: "V1", balance: 777.77, dueDate: "2026-05-01" },
      { billId: "B2", vendorId: "V2", balance: 222.23, dueDate: "2026-05-01" },
    ]);
    expect(res.glLines).toHaveLength(2);
    const dr = res.glLines.find((l) => l.account === ACCOUNTS_PAYABLE_ACCOUNT.number)!;
    const cr = res.glLines.find((l) => l.account === CASH_ACCOUNT.number)!;
    expect(dr.debit).toBeCloseTo(1000, 2);
    expect(dr.credit).toBe(0);
    expect(cr.credit).toBeCloseTo(1000, 2);
    expect(cr.debit).toBe(0);
    // Σdebits === Σcredits === totalPaid
    const debits = res.glLines.reduce((s, l) => s + l.debit, 0);
    const credits = res.glLines.reduce((s, l) => s + l.credit, 0);
    expect(debits).toBeCloseTo(credits, 2);
    expect(debits).toBeCloseTo(res.totalPaid, 2);
  });

  it("assigns a sequential checkNo only for the check method, not ach/wire", () => {
    const ach = BillPaymentCheckRunEngine.payBills(
      { ...RUN, method: "ach" },
      [{ billId: "B1", vendorId: "V1", balance: 100, dueDate: "2026-05-01" }],
    );
    expect(ach.method).toBe("ach");
    // ach/wire payouts carry no paper check number — the field is absent from the object
    expect(Object.prototype.hasOwnProperty.call(ach.checks[0], "checkNo")).toBe(false);

    // a 2-vendor check run gets sequential numbers CHK-<run>-1, CHK-<run>-2
    const chk = BillPaymentCheckRunEngine.payBills(RUN, [
      { billId: "B1", vendorId: "V1", balance: 100, dueDate: "2026-03-01" },
      { billId: "B2", vendorId: "V2", balance: 200, dueDate: "2026-04-01" },
    ]);
    expect(chk.checks.map((c) => c.checkNo)).toEqual(["CHK-RUN-001-1", "CHK-RUN-001-2"]);
  });
});

describe("BillPaymentCheckRunEngine.payBills — failure modes (THROW, fail loud)", () => {
  it("throws on over-pay in a specified allocation (amount > balance)", () => {
    expect(() =>
      BillPaymentCheckRunEngine.payBills(RUN, [
        { billId: "B1", vendorId: "V1", balance: 100, dueDate: "2026-05-01" },
      ], { strategy: "specified", allocations: [{ billId: "B1", amount: 150 }] }),
    ).toThrow(/over-pay/i);
  });

  it("throws when an allocation targets a bill not in the open set", () => {
    expect(() =>
      BillPaymentCheckRunEngine.payBills(RUN, [
        { billId: "B1", vendorId: "V1", balance: 100, dueDate: "2026-05-01" },
      ], { strategy: "specified", allocations: [{ billId: "B-NOPE", amount: 50 }] }),
    ).toThrow(/not in the open bill set/i);
  });

  it("throws on duplicate billId in the open set", () => {
    expect(() =>
      BillPaymentCheckRunEngine.payBills(RUN, [
        { billId: "B1", vendorId: "V1", balance: 100, dueDate: "2026-05-01" },
        { billId: "B1", vendorId: "V1", balance: 200, dueDate: "2026-05-02" },
      ]),
    ).toThrow(/duplicate billId/i);
  });

  it("throws on duplicate allocation target", () => {
    expect(() =>
      BillPaymentCheckRunEngine.payBills(RUN, [
        { billId: "B1", vendorId: "V1", balance: 1000, dueDate: "2026-05-01" },
      ], {
        strategy: "specified",
        allocations: [{ billId: "B1", amount: 100 }, { billId: "B1", amount: 200 }],
      }),
    ).toThrow(/duplicate allocation/i);
  });

  it("throws when specified strategy is given an empty allocations list", () => {
    expect(() =>
      BillPaymentCheckRunEngine.payBills(RUN, [
        { billId: "B1", vendorId: "V1", balance: 100, dueDate: "2026-05-01" },
      ], { strategy: "specified", allocations: [] }),
    ).toThrow(/non-empty/i);
  });
});

describe("BillPaymentCheckRunEngine.payBills — adversarial inputs", () => {
  it("throws on a NaN bill balance", () => {
    expect(() =>
      BillPaymentCheckRunEngine.payBills(RUN, [
        { billId: "B1", vendorId: "V1", balance: NaN, dueDate: "2026-05-01" },
      ]),
    ).toThrow();
  });

  it("throws on an Infinity cash limit", () => {
    expect(() =>
      BillPaymentCheckRunEngine.payBills(RUN, [
        { billId: "B1", vendorId: "V1", balance: 100, dueDate: "2026-05-01" },
      ], { cashLimit: Number.POSITIVE_INFINITY }),
    ).toThrow();
  });

  it("throws on a negative bill balance", () => {
    expect(() =>
      BillPaymentCheckRunEngine.payBills(RUN, [
        { billId: "B1", vendorId: "V1", balance: -50, dueDate: "2026-05-01" },
      ]),
    ).toThrow();
  });

  it("throws on an empty open-bills array", () => {
    expect(() => BillPaymentCheckRunEngine.payBills(RUN, [])).toThrow(/no open bills/i);
  });

  it("throws on a NaN specified allocation amount", () => {
    expect(() =>
      BillPaymentCheckRunEngine.payBills(RUN, [
        { billId: "B1", vendorId: "V1", balance: 100, dueDate: "2026-05-01" },
      ], { strategy: "specified", allocations: [{ billId: "B1", amount: NaN }] }),
    ).toThrow();
  });

  it("throws when cashLimit is supplied under the specified strategy (mis-matched guardrail)", () => {
    // cashLimit is a due-date-first ceiling; under "specified" it would be silently dropped — a
    // treasurer who caps the run at $100 must NOT get a full $1000 disbursement. Fail loud instead.
    expect(() =>
      BillPaymentCheckRunEngine.payBills(RUN, [
        { billId: "B1", vendorId: "V1", balance: 1000, dueDate: "2026-05-01" },
      ], { strategy: "specified", allocations: [{ billId: "B1", amount: 1000 }], cashLimit: 100 }),
    ).toThrow(/cashLimit is a due-date-first cash ceiling/i);
  });

  it("throws when allocations are supplied under the due-date-first strategy", () => {
    // allocations are a "specified"-only payment set; under due-date-first they would be silently
    // discarded and the full $1000 paid instead of the requested $400. Fail loud.
    expect(() =>
      BillPaymentCheckRunEngine.payBills(RUN, [
        { billId: "B1", vendorId: "V1", balance: 1000, dueDate: "2026-05-01" },
      ], { allocations: [{ billId: "B1", amount: 400 }] }),
    ).toThrow(/allocations are honored only under strategy "specified"/i);
  });
});

describe("BillPaymentCheckRunEngine.payBills — asOfDate horizon", () => {
  it("restricts the open set to bills due on/before asOfDate (both strategies)", () => {
    // B1 due 2026-03-01, B2 due 2026-06-01. asOfDate 2026-04-01 excludes B2 from the run.
    const res = BillPaymentCheckRunEngine.payBills(RUN, [
      { billId: "B1", vendorId: "V1", balance: 100, dueDate: "2026-03-01" },
      { billId: "B2", vendorId: "V2", balance: 250, dueDate: "2026-06-01" },
    ], { asOfDate: "2026-04-01" });
    expect(res.payments.map((p) => p.billId)).toEqual(["B1"]);
    expect(res.totalPaid).toBeCloseTo(100, 2);
    // B2 (not yet due) is excluded — no payment, no check
    expect(res.checks).toHaveLength(1);
    expect(res.checks[0].vendorId).toBe("V1");
  });

  it("includes a bill due exactly on asOfDate (boundary is inclusive)", () => {
    const res = BillPaymentCheckRunEngine.payBills(RUN, [
      { billId: "B1", vendorId: "V1", balance: 100, dueDate: "2026-04-01" },
    ], { asOfDate: "2026-04-01" });
    expect(res.payments.map((p) => p.billId)).toEqual(["B1"]);
    expect(res.totalPaid).toBeCloseTo(100, 2);
  });

  it("throws when the as-of horizon excludes every bill", () => {
    expect(() =>
      BillPaymentCheckRunEngine.payBills(RUN, [
        { billId: "B1", vendorId: "V1", balance: 100, dueDate: "2026-06-01" },
      ], { asOfDate: "2026-04-01" }),
    ).toThrow(/no open bills are due on\/before asOfDate/i);
  });

  it("throws on a malformed asOfDate (schema validation)", () => {
    expect(() =>
      BillPaymentCheckRunEngine.payBills(RUN, [
        { billId: "B1", vendorId: "V1", balance: 100, dueDate: "2026-05-01" },
      ], { asOfDate: "2026/04/01" }),
    ).toThrow();
  });

  it("the camelCase alias runs the same payBills logic as the class", () => {
    const viaAlias = billPaymentCheckRunEngine.payBills(RUN, [
      { billId: "B1", vendorId: "V1", balance: 321.5, dueDate: "2026-05-01" },
    ]);
    expect(viaAlias.totalPaid).toBeCloseTo(321.5, 2);
    expect(viaAlias.checks[0].amount).toBeCloseTo(321.5, 2);
    expect(viaAlias.glLines.find((l) => l.account === ACCOUNTS_PAYABLE_ACCOUNT.number)!.debit)
      .toBeCloseTo(321.5, 2);
  });
});
