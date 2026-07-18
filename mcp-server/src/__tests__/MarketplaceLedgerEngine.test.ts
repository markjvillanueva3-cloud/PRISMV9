/**
 * MarketplaceLedgerEngine.test.ts — real-value verification of the marketplace financial spine
 * (galaxy:business, slot:hotel). Asserts CONCRETE reference money values (not toBeDefined stubs): a
 * test here FAILS the instant the escrow/commission/payout/split logic changes.
 *
 * Coverage map (>=12 cases):
 *  happy path        — escrow deposit balanced; payout 1000 @ 7% → 70.00 + 930.00 reconciled both ways;
 *                      default-rate payout; split invoice balanced; escrowBalance after deposit/payout.
 *  spanning configs  — 3 amount/take-rate combos (1000@7%, 333.33@7%, 2500@12%).
 *  failure modes     — take rate out of [MIN,MAX] throws; payout exceeding held escrow throws;
 *                      zero/negative/NaN/Infinity amounts throw; split parties not summing to total throws.
 *  adversarial       — NaN/Infinity grosses; oversize/over-release escrow; half-even tie (x.xx5 → even).
 *  invariant         — EVERY returned lines[] asserts Σdebit === Σcredit.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MarketplaceLedgerEngine, type MarketplaceGlLine } from "../engines/MarketplaceLedgerEngine.js";
import {
  DEFAULT_TAKE_RATE,
  MIN_TAKE_RATE,
  MAX_TAKE_RATE,
  ESCROW_LIABILITY_ACCOUNT,
  COMMISSION_REVENUE_ACCOUNT,
  CASH_ACCOUNT,
  ACCOUNTS_PAYABLE_ACCOUNT,
} from "../data/marketplace-policy.js";

const DATE = "2026-05-30";

/** Helper: Σdebit / Σcredit over a returned line set (the universal balance invariant under test). */
function totals(lines: MarketplaceGlLine[]): { dr: number; cr: number } {
  return lines.reduce(
    (acc, l) => ({ dr: acc.dr + l.debit, cr: acc.cr + l.credit }),
    { dr: 0, cr: 0 },
  );
}

/** Assert a line set is a balanced double entry to the cent (the invariant every method must hold). */
function expectBalanced(lines: MarketplaceGlLine[]): void {
  const { dr, cr } = totals(lines);
  expect(Math.round(dr * 100)).toBe(Math.round(cr * 100));
}

describe("MarketplaceLedgerEngine — escrow deposit", () => {
  beforeEach(() => MarketplaceLedgerEngine.__resetForTests());

  it("records a balanced DR Cash / CR Escrow deposit with the exact amount", () => {
    const r = MarketplaceLedgerEngine.recordEscrowDeposit({
      orderId: "ord-1",
      buyerId: "buyer-1",
      amountUsd: 1500,
      date: DATE,
    });
    expect(r.amount).toBe(1500);
    expect(r.orderId).toBe("ord-1");
    expect(r.buyerId).toBe("buyer-1");
    expect(r.lines).toHaveLength(2);

    const cash = r.lines.find((l) => l.account_id === CASH_ACCOUNT.number)!;
    const escrow = r.lines.find((l) => l.account_id === ESCROW_LIABILITY_ACCOUNT.number)!;
    expect(cash.debit).toBe(1500);
    expect(cash.credit).toBe(0);
    expect(escrow.credit).toBe(1500);
    expect(escrow.debit).toBe(0);
    expectBalanced(r.lines);
  });

  it("accumulates escrowBalance across multiple deposits for the same order", () => {
    MarketplaceLedgerEngine.recordEscrowDeposit({ orderId: "ord-2", buyerId: "b", amountUsd: 1000, date: DATE });
    MarketplaceLedgerEngine.recordEscrowDeposit({ orderId: "ord-2", buyerId: "b", amountUsd: 250.5, date: DATE });
    expect(MarketplaceLedgerEngine.escrowBalance("ord-2")).toBe(1250.5);
  });

  it("escrowBalance is 0 for an order with no activity", () => {
    expect(MarketplaceLedgerEngine.escrowBalance("never-seen")).toBe(0);
  });

  it("throws on a zero, negative, NaN, or Infinity deposit amount", () => {
    expect(() => MarketplaceLedgerEngine.recordEscrowDeposit({ orderId: "o", buyerId: "b", amountUsd: 0, date: DATE })).toThrow();
    expect(() => MarketplaceLedgerEngine.recordEscrowDeposit({ orderId: "o", buyerId: "b", amountUsd: -5, date: DATE })).toThrow();
    expect(() => MarketplaceLedgerEngine.recordEscrowDeposit({ orderId: "o", buyerId: "b", amountUsd: NaN, date: DATE })).toThrow();
    expect(() => MarketplaceLedgerEngine.recordEscrowDeposit({ orderId: "o", buyerId: "b", amountUsd: Infinity, date: DATE })).toThrow();
  });

  it("throws on a bad date or empty ids", () => {
    expect(() => MarketplaceLedgerEngine.recordEscrowDeposit({ orderId: "o", buyerId: "b", amountUsd: 10, date: "05/30/2026" })).toThrow();
    expect(() => MarketplaceLedgerEngine.recordEscrowDeposit({ orderId: "", buyerId: "b", amountUsd: 10, date: DATE })).toThrow();
    expect(() => MarketplaceLedgerEngine.escrowBalance("")).toThrow();
  });
});

describe("MarketplaceLedgerEngine — payout (take-rate commission split)", () => {
  beforeEach(() => {
    MarketplaceLedgerEngine.__resetForTests();
    // fund escrow generously so payout-amount tests are not gated by the escrow guard.
    MarketplaceLedgerEngine.recordEscrowDeposit({ orderId: "po", buyerId: "b", amountUsd: 100000, date: DATE });
  });

  it("splits gross 1000 @ 7% into commission 70.00 + payout 930.00, reconciled both ways", () => {
    const r = MarketplaceLedgerEngine.recordPayout({ orderId: "po", supplierId: "sup-1", grossUsd: 1000, takeRatePct: 0.07, date: DATE });
    expect(r.gross).toBe(1000);
    expect(r.commission).toBe(70);
    expect(r.payout).toBe(930);
    expect(r.takeRatePct).toBe(0.07);
    // both-ways reconciliation, asserted at the value level
    expect(r.commission + r.payout).toBe(1000);
    expect(r.gross - r.payout).toBe(70);

    const escrowLeg = r.lines.find((l) => l.account_id === ESCROW_LIABILITY_ACCOUNT.number)!;
    const commLeg = r.lines.find((l) => l.account_id === COMMISSION_REVENUE_ACCOUNT.number)!;
    const apLeg = r.lines.find((l) => l.account_id === ACCOUNTS_PAYABLE_ACCOUNT.number)!;
    expect(escrowLeg.debit).toBe(1000);
    expect(commLeg.credit).toBe(70);
    expect(apLeg.credit).toBe(930);
    expectBalanced(r.lines);
  });

  it("applies DEFAULT_TAKE_RATE (7%) when takeRatePct is omitted", () => {
    const r = MarketplaceLedgerEngine.recordPayout({ orderId: "po", supplierId: "sup-1", grossUsd: 200, date: DATE });
    expect(r.takeRatePct).toBe(DEFAULT_TAKE_RATE);
    expect(r.commission).toBe(14); // 200 * 0.07
    expect(r.payout).toBe(186);
    expectBalanced(r.lines);
  });

  it("fractional-cent gross 333.33 @ 7% still reconciles and balances", () => {
    // 333.33 * 0.07 = 23.3331 → half-even → 23.33; payout = 333.33 - 23.33 = 310.00
    const r = MarketplaceLedgerEngine.recordPayout({ orderId: "po", supplierId: "s", grossUsd: 333.33, takeRatePct: 0.07, date: DATE });
    expect(r.commission).toBe(23.33);
    expect(r.payout).toBe(310);
    expect(r.commission + r.payout).toBe(333.33);
    expectBalanced(r.lines);
  });

  it("spanning config: gross 2500 @ 12% → commission 300.00 + payout 2200.00", () => {
    const r = MarketplaceLedgerEngine.recordPayout({ orderId: "po", supplierId: "s", grossUsd: 2500, takeRatePct: 0.12, date: DATE });
    expect(r.commission).toBe(300);
    expect(r.payout).toBe(2200);
    expect(r.commission + r.payout).toBe(2500);
    expectBalanced(r.lines);
  });

  it("half-even tie: a commission landing on x.xx5 rounds to EVEN", () => {
    // gross 0.50 @ MIN_TAKE_RATE 0.03 = 0.015 → abs cents 1.5 → tie → even floor 1 → 0.01? No:
    // choose a clean tie at the cent: gross 10.00 @ 0.025 is below MIN; use gross 0.50 @ 0.05 = 0.025 → 2.5 cents tie → even → 0.02
    const r = MarketplaceLedgerEngine.recordPayout({ orderId: "po", supplierId: "s", grossUsd: 0.5, takeRatePct: 0.05, date: DATE });
    // 0.5 * 0.05 = 0.025 → 2.5 cents → half-even → 2 (even) → 0.02
    expect(r.commission).toBe(0.02);
    expect(r.payout).toBe(0.48);
    expect(r.commission + r.payout).toBe(0.5);
    expectBalanced(r.lines);

    // a 3.5-cent tie rounds UP to even (4): gross 0.70 @ 0.05 = 0.035 → 3.5 cents → even → 0.04
    const r2 = MarketplaceLedgerEngine.recordPayout({ orderId: "po", supplierId: "s", grossUsd: 0.7, takeRatePct: 0.05, date: DATE });
    expect(r2.commission).toBe(0.04);
    expect(r2.payout).toBe(0.66);
    expectBalanced(r2.lines);
  });

  it("throws when the take rate is below MIN_TAKE_RATE or above MAX_TAKE_RATE", () => {
    expect(() =>
      MarketplaceLedgerEngine.recordPayout({ orderId: "po", supplierId: "s", grossUsd: 100, takeRatePct: MIN_TAKE_RATE - 0.001, date: DATE }),
    ).toThrow(/out of allowed band/);
    expect(() =>
      MarketplaceLedgerEngine.recordPayout({ orderId: "po", supplierId: "s", grossUsd: 100, takeRatePct: MAX_TAKE_RATE + 0.01, date: DATE }),
    ).toThrow(/out of allowed band/);
    // a fat-fingered 2.5 (250%) must SEE the error, never silently clamp
    expect(() =>
      MarketplaceLedgerEngine.recordPayout({ orderId: "po", supplierId: "s", grossUsd: 100, takeRatePct: 2.5, date: DATE }),
    ).toThrow();
  });

  it("throws when payout gross exceeds held escrow (escrow cannot go negative)", () => {
    MarketplaceLedgerEngine.__resetForTests();
    MarketplaceLedgerEngine.recordEscrowDeposit({ orderId: "tight", buyerId: "b", amountUsd: 500, date: DATE });
    expect(() =>
      MarketplaceLedgerEngine.recordPayout({ orderId: "tight", supplierId: "s", grossUsd: 600, takeRatePct: 0.07, date: DATE }),
    ).toThrow(/exceeds escrow held/);
    // an order with NO escrow at all also throws
    expect(() =>
      MarketplaceLedgerEngine.recordPayout({ orderId: "no-escrow", supplierId: "s", grossUsd: 1, takeRatePct: 0.07, date: DATE }),
    ).toThrow(/exceeds escrow held/);
  });

  it("decrements escrowBalance by the released gross", () => {
    MarketplaceLedgerEngine.__resetForTests();
    MarketplaceLedgerEngine.recordEscrowDeposit({ orderId: "dec", buyerId: "b", amountUsd: 1000, date: DATE });
    MarketplaceLedgerEngine.recordPayout({ orderId: "dec", supplierId: "s", grossUsd: 400, takeRatePct: 0.07, date: DATE });
    expect(MarketplaceLedgerEngine.escrowBalance("dec")).toBe(600);
  });

  it("throws on a NaN / Infinity / zero / negative gross", () => {
    expect(() => MarketplaceLedgerEngine.recordPayout({ orderId: "po", supplierId: "s", grossUsd: NaN, date: DATE })).toThrow();
    expect(() => MarketplaceLedgerEngine.recordPayout({ orderId: "po", supplierId: "s", grossUsd: Infinity, date: DATE })).toThrow();
    expect(() => MarketplaceLedgerEngine.recordPayout({ orderId: "po", supplierId: "s", grossUsd: 0, date: DATE })).toThrow();
    expect(() => MarketplaceLedgerEngine.recordPayout({ orderId: "po", supplierId: "s", grossUsd: -10, date: DATE })).toThrow();
  });
});

describe("MarketplaceLedgerEngine — split invoice", () => {
  beforeEach(() => MarketplaceLedgerEngine.__resetForTests());

  it("apportions a total across parties into a balanced DR A/R / CR per-party entry", () => {
    const r = MarketplaceLedgerEngine.recordSplitInvoice({
      orderId: "split-1",
      parties: [
        { partyId: "p1", amountUsd: 600 },
        { partyId: "p2", amountUsd: 400 },
      ],
      totalUsd: 1000,
      date: DATE,
    });
    expect(r.total).toBe(1000);
    expect(r.parties).toEqual([
      { partyId: "p1", amount: 600 },
      { partyId: "p2", amount: 400 },
    ]);
    // 1 A/R debit + 2 party credits
    expect(r.lines).toHaveLength(3);
    const arLeg = r.lines.find((l) => l.account_id === "1200")!;
    expect(arLeg.debit).toBe(1000);
    const creditSum = r.lines.filter((l) => l.credit > 0).reduce((s, l) => s + l.credit, 0);
    expect(creditSum).toBe(1000);
    expectBalanced(r.lines);
  });

  it("spanning config: 3-way split of 333.33 reconciles to the cent", () => {
    const r = MarketplaceLedgerEngine.recordSplitInvoice({
      orderId: "split-2",
      parties: [
        { partyId: "a", amountUsd: 111.11 },
        { partyId: "b", amountUsd: 111.11 },
        { partyId: "c", amountUsd: 111.11 },
      ],
      totalUsd: 333.33,
      date: DATE,
    });
    expect(r.total).toBe(333.33);
    expect(r.lines).toHaveLength(4); // 1 A/R + 3 parties
    expectBalanced(r.lines);
  });

  it("throws when party amounts do not sum to the stated total", () => {
    expect(() =>
      MarketplaceLedgerEngine.recordSplitInvoice({
        orderId: "bad",
        parties: [
          { partyId: "p1", amountUsd: 600 },
          { partyId: "p2", amountUsd: 300 }, // sums to 900, not 1000
        ],
        totalUsd: 1000,
        date: DATE,
      }),
    ).toThrow(/must reconcile to its total/);
  });

  it("throws on fewer than two parties or a non-positive party/total amount", () => {
    expect(() =>
      MarketplaceLedgerEngine.recordSplitInvoice({ orderId: "x", parties: [{ partyId: "p1", amountUsd: 100 }], totalUsd: 100, date: DATE }),
    ).toThrow();
    expect(() =>
      MarketplaceLedgerEngine.recordSplitInvoice({
        orderId: "x",
        parties: [
          { partyId: "p1", amountUsd: 100 },
          { partyId: "p2", amountUsd: -50 },
        ],
        totalUsd: 50,
        date: DATE,
      }),
    ).toThrow();
    expect(() =>
      MarketplaceLedgerEngine.recordSplitInvoice({
        orderId: "x",
        parties: [
          { partyId: "p1", amountUsd: 100 },
          { partyId: "p2", amountUsd: NaN },
        ],
        totalUsd: 100,
        date: DATE,
      }),
    ).toThrow();
  });
});

describe("MarketplaceLedgerEngine — end-to-end escrow lifecycle invariant", () => {
  beforeEach(() => MarketplaceLedgerEngine.__resetForTests());

  it("deposit → payout drains escrow to a non-negative balance and every entry balances", () => {
    const dep = MarketplaceLedgerEngine.recordEscrowDeposit({ orderId: "e2e", buyerId: "b", amountUsd: 1000, date: DATE });
    expectBalanced(dep.lines);
    expect(MarketplaceLedgerEngine.escrowBalance("e2e")).toBe(1000);

    const pay = MarketplaceLedgerEngine.recordPayout({ orderId: "e2e", supplierId: "s", grossUsd: 1000, takeRatePct: 0.07, date: DATE });
    expectBalanced(pay.lines);
    expect(pay.commission + pay.payout).toBe(1000);
    expect(MarketplaceLedgerEngine.escrowBalance("e2e")).toBe(0);

    // a further release is now impossible — escrow is empty.
    expect(() =>
      MarketplaceLedgerEngine.recordPayout({ orderId: "e2e", supplierId: "s", grossUsd: 0.01, takeRatePct: 0.07, date: DATE }),
    ).toThrow(/exceeds escrow held/);
  });
});
