/**
 * BankReconciliationEngine.test.ts — statement-vs-book bank reconciliation (QB "Reconcile" parity).
 *
 * Reference values are HAND-COMPUTED from the textbook two-column bank-rec identity:
 *     adjustedBank = bankStatementBalance + Σ(deposits in transit) − Σ(outstanding checks)
 *     adjustedBook = bookBalance          + Σ(unrecorded interest)  − Σ(unrecorded fees)
 *     difference   = adjustedBank − adjustedBook
 *     reconciled   = |difference| ≤ 0.01
 * No toBeDefined() stubs — every assertion pins a concrete arithmetic result.
 */
import { describe, it, expect } from "vitest";
import { BankReconciliationEngine } from "../engines/BankReconciliationEngine.js";
import {
  CASH_ACCOUNT,
  BANK_FEE_EXPENSE_ACCOUNT,
  INTEREST_INCOME_ACCOUNT,
} from "../data/bank-reconciliation-accounts.js";
import { CHART_OF_ACCOUNTS } from "../engines/GeneralLedgerEngine.js";

const ASOF = "2026-05-31";

describe("BankReconciliationEngine — account-collision guard vs canonical chart", () => {
  const byId = new Map(CHART_OF_ACCOUNTS.map((a) => [a.id, a]));

  it("CASH_ACCOUNT (1000) resolves to the canonical Cash asset with the exact chart name", () => {
    const a = byId.get(CASH_ACCOUNT.number);
    expect(a?.name).toBe(CASH_ACCOUNT.name); // "Cash" — name must match the chart string exactly
    expect(a?.type).toBe("asset");
    expect(a?.normal_balance).toBe("debit");
  });

  it("BANK_FEE_EXPENSE_ACCOUNT (5500) is the operating-expense line with the exact chart name", () => {
    const a = byId.get(BANK_FEE_EXPENSE_ACCOUNT.number);
    // The P1 drift was name:"Operating Expense" (singular) vs chart "Operating Expenses" (plural).
    expect(a?.name).toBe(BANK_FEE_EXPENSE_ACCOUNT.name);
    expect(a?.name).toBe("Operating Expenses");
    expect(a?.type).toBe("expense");
    expect(a?.normal_balance).toBe("debit");
  });

  it("INTEREST_INCOME_ACCOUNT (4900) does NOT collide with an occupied operating-revenue account", () => {
    // The P0 collision: 4100 is ALREADY "Service Revenue" (operating). Interest is non-operating
    // income and must NOT reuse an occupied account, or it overstates operating revenue.
    expect(INTEREST_INCOME_ACCOUNT.number).not.toBe("4100");
    expect(INTEREST_INCOME_ACCOUNT.number).not.toBe("4000");
    // 4100 stays Service Revenue (the interest account never relabels it).
    expect(byId.get("4100")?.name).toBe("Service Revenue");
    // The interest account number must be genuinely free in MAIN's chart (additive chart extension).
    expect(byId.has(INTEREST_INCOME_ACCOUNT.number)).toBe(false);
    // And it sits in the 4xxx revenue band as designed.
    expect(INTEREST_INCOME_ACCOUNT.number.startsWith("4")).toBe(true);
    expect(INTEREST_INCOME_ACCOUNT.name).toBe("Interest Income");
  });
});

describe("BankReconciliationEngine.reconcile — happy path / identity", () => {
  it("clean reconcile: all cleared, difference 0, reconciled true, no GL", () => {
    // bankStmt 5000, book 5000, every txn cleared. adjBank=5000, adjBook=5000, diff=0.
    const r = BankReconciliationEngine.reconcile({
      bankStatementBalance: 5000,
      bookBalance: 5000,
      asOf: ASOF,
      transactions: [
        { id: "D1", date: "2026-05-10", amount: 1200, type: "deposit", cleared: true },
        { id: "C1", date: "2026-05-12", amount: 800, type: "check", cleared: true },
      ],
    });
    expect(r.adjustedBankBalance).toBeCloseTo(5000, 2);
    expect(r.adjustedBookBalance).toBeCloseTo(5000, 2);
    expect(r.difference).toBeCloseTo(0, 2);
    expect(r.reconciled).toBe(true);
    expect(r.outstandingChecks).toHaveLength(0);
    expect(r.depositsInTransit).toHaveLength(0);
    expect(r.unrecordedItems).toHaveLength(0);
    expect(r.adjustingGlLines).toHaveLength(0); // cleared/recorded items post nothing
  });

  it("outstanding checks reduce bank toward book (5000 − 300 = 4700)", () => {
    // One uncleared check 300. adjBank = 5000 + 0 − 300 = 4700; book 4700 → diff 0.
    const r = BankReconciliationEngine.reconcile({
      bankStatementBalance: 5000,
      bookBalance: 4700,
      asOf: ASOF,
      transactions: [{ id: "C1", date: "2026-05-29", amount: 300, type: "check", cleared: false }],
    });
    expect(r.outstandingChecks).toHaveLength(1);
    expect(r.outstandingChecks[0].id).toBe("C1");
    expect(r.totalOutstandingChecks).toBeCloseTo(300, 2);
    expect(r.totalDepositsInTransit).toBeCloseTo(0, 2);
    expect(r.adjustedBankBalance).toBeCloseTo(4700, 2);
    expect(r.adjustedBookBalance).toBeCloseTo(4700, 2);
    expect(r.difference).toBeCloseTo(0, 2);
    expect(r.reconciled).toBe(true);
    expect(r.adjustingGlLines).toHaveLength(0); // a timing item posts nothing
  });

  it("deposits in transit raise bank toward book (4000 + 500 = 4500)", () => {
    // One uncleared deposit 500. adjBank = 4000 + 500 − 0 = 4500; book 4500 → diff 0.
    const r = BankReconciliationEngine.reconcile({
      bankStatementBalance: 4000,
      bookBalance: 4500,
      asOf: ASOF,
      transactions: [{ id: "D1", date: "2026-05-30", amount: 500, type: "deposit", cleared: false }],
    });
    expect(r.depositsInTransit).toHaveLength(1);
    expect(r.depositsInTransit[0].id).toBe("D1");
    expect(r.totalDepositsInTransit).toBeCloseTo(500, 2);
    expect(r.adjustedBankBalance).toBeCloseTo(4500, 2);
    expect(r.adjustedBookBalance).toBeCloseTo(4500, 2);
    expect(r.difference).toBeCloseTo(0, 2);
    expect(r.reconciled).toBe(true);
  });

  it("unrecorded fee + interest adjust the BOOK side and post balanced GL", () => {
    // Fee 25 + interest 50 are on the statement (cleared) but NOT in books.
    // adjBank = 5025 (no timing items). adjBook = 5000 + 50 − 25 = 5025 → diff 0.
    const r = BankReconciliationEngine.reconcile({
      bankStatementBalance: 5025,
      bookBalance: 5000,
      asOf: ASOF,
      transactions: [
        { id: "F1", date: "2026-05-31", amount: 25, type: "fee", cleared: true, recordedInBooks: false },
        { id: "I1", date: "2026-05-31", amount: 50, type: "interest", cleared: true, recordedInBooks: false },
      ],
    });
    expect(r.unrecordedFees).toBeCloseTo(25, 2);
    expect(r.unrecordedInterest).toBeCloseTo(50, 2);
    expect(r.adjustedBankBalance).toBeCloseTo(5025, 2);
    expect(r.adjustedBookBalance).toBeCloseTo(5025, 2);
    expect(r.difference).toBeCloseTo(0, 2);
    expect(r.reconciled).toBe(true);

    // 2 unrecorded items → 4 GL lines (one balanced DR/CR pair each).
    expect(r.adjustingGlLines).toHaveLength(4);
    const debits = r.adjustingGlLines.reduce((s, l) => s + l.debit, 0);
    const credits = r.adjustingGlLines.reduce((s, l) => s + l.credit, 0);
    expect(debits).toBeCloseTo(75, 2);
    expect(credits).toBeCloseTo(75, 2); // Σdebits === Σcredits
    // Fee: DR 5500 Operating Expenses / CR 1000 Cash, 25 each.
    const feeDr = r.adjustingGlLines.find((l) => l.account === BANK_FEE_EXPENSE_ACCOUNT.number && l.debit > 0);
    const feeCr = r.adjustingGlLines.find((l) => l.account === CASH_ACCOUNT.number && l.credit > 0);
    expect(feeDr?.debit).toBeCloseTo(25, 2);
    expect(feeCr?.credit).toBeCloseTo(25, 2);
    // Interest: DR 1000 Cash / CR 4900 Interest Income (non-operating), 50 each.
    const intDr = r.adjustingGlLines.find((l) => l.account === CASH_ACCOUNT.number && l.debit > 0);
    const intCr = r.adjustingGlLines.find((l) => l.account === INTEREST_INCOME_ACCOUNT.number && l.credit > 0);
    expect(intDr?.debit).toBeCloseTo(50, 2);
    expect(intCr?.credit).toBeCloseTo(50, 2);
  });

  it("combined spanning case ties out (checks + deposits + fee + interest)", () => {
    // bankStmt 10000, book 9750.
    // uncleared check 500, uncleared deposit 250 → adjBank = 10000 + 250 − 500 = 9750.
    // unrecorded fee 30, unrecorded interest 30 → adjBook = 9750 + 30 − 30 = 9750. diff 0.
    const r = BankReconciliationEngine.reconcile({
      bankStatementBalance: 10000,
      bookBalance: 9750,
      asOf: ASOF,
      transactions: [
        { id: "C9", date: "2026-05-28", amount: 500, type: "check", cleared: false },
        { id: "D9", date: "2026-05-29", amount: 250, type: "deposit", cleared: false },
        { id: "F9", date: "2026-05-31", amount: 30, type: "fee", cleared: true },
        { id: "I9", date: "2026-05-31", amount: 30, type: "interest", cleared: true },
      ],
    });
    expect(r.totalOutstandingChecks).toBeCloseTo(500, 2);
    expect(r.totalDepositsInTransit).toBeCloseTo(250, 2);
    expect(r.unrecordedFees).toBeCloseTo(30, 2);
    expect(r.unrecordedInterest).toBeCloseTo(30, 2);
    expect(r.adjustedBankBalance).toBeCloseTo(9750, 2);
    expect(r.adjustedBookBalance).toBeCloseTo(9750, 2);
    expect(r.difference).toBeCloseTo(0, 2);
    expect(r.reconciled).toBe(true);
  });

  it("already-recorded fee/interest are reconciling no-ops (not unrecorded, no GL)", () => {
    // Fee already booked → adjusts neither column, posts nothing. adjBank=adjBook=3000.
    const r = BankReconciliationEngine.reconcile({
      bankStatementBalance: 3000,
      bookBalance: 3000,
      asOf: ASOF,
      transactions: [
        { id: "F1", date: "2026-05-31", amount: 12, type: "fee", cleared: true, recordedInBooks: true },
        { id: "I1", date: "2026-05-31", amount: 8, type: "interest", cleared: true, recordedInBooks: true },
      ],
    });
    expect(r.unrecordedItems).toHaveLength(0);
    expect(r.unrecordedFees).toBeCloseTo(0, 2);
    expect(r.unrecordedInterest).toBeCloseTo(0, 2);
    expect(r.adjustedBankBalance).toBeCloseTo(3000, 2);
    expect(r.adjustedBookBalance).toBeCloseTo(3000, 2);
    expect(r.difference).toBeCloseTo(0, 2);
    expect(r.reconciled).toBe(true);
    expect(r.adjustingGlLines).toHaveLength(0);
  });

  it("empty transactions: pure statement-vs-book delta is surfaced honestly", () => {
    // No txns. adjBank = 1500, adjBook = 1500 → reconciled. (Empty is valid, not an error.)
    const r = BankReconciliationEngine.reconcile({
      bankStatementBalance: 1500,
      bookBalance: 1500,
      asOf: ASOF,
      transactions: [],
    });
    expect(r.outstandingChecks).toHaveLength(0);
    expect(r.depositsInTransit).toHaveLength(0);
    expect(r.adjustedBankBalance).toBeCloseTo(1500, 2);
    expect(r.difference).toBeCloseTo(0, 2);
    expect(r.reconciled).toBe(true);
  });

  it("negative balances (overdraft) reconcile by the same identity", () => {
    // Overdrawn bank −250, book −400, uncleared deposit 150.
    // adjBank = −250 + 150 − 0 = −100. adjBook = −400 → diff = −100 + 400 = 300? No:
    // diff = adjBank − adjBook = −100 − (−400) = 300 → NOT reconciled. Honest surface.
    const r = BankReconciliationEngine.reconcile({
      bankStatementBalance: -250,
      bookBalance: -400,
      asOf: ASOF,
      transactions: [{ id: "D1", date: "2026-05-30", amount: 150, type: "deposit", cleared: false }],
    });
    expect(r.adjustedBankBalance).toBeCloseTo(-100, 2);
    expect(r.adjustedBookBalance).toBeCloseTo(-400, 2);
    expect(r.difference).toBeCloseTo(300, 2);
    expect(r.reconciled).toBe(false);
  });

  it("half-even rounding: 0.125 → 0.12 (banker's), surfaced via roundCentsHalfEven reuse", () => {
    // bankStmt 100.125 rounds half-even to 100.12 (round to even). book 100.12 → diff 0.
    const r = BankReconciliationEngine.reconcile({
      bankStatementBalance: 100.125,
      bookBalance: 100.12,
      asOf: ASOF,
      transactions: [],
    });
    expect(r.bankStatementBalance).toBeCloseTo(100.12, 2);
    expect(r.difference).toBeCloseTo(0, 2);
    expect(r.reconciled).toBe(true);
  });
});

describe("BankReconciliationEngine.reconcile — fail-loud / honesty", () => {
  it("a REAL difference yields reconciled=false and surfaces the exact residual (never swallowed)", () => {
    // bankStmt 5000, book 4800, only a 100 outstanding check.
    // adjBank = 5000 − 100 = 4900; adjBook = 4800 → diff = 100 → reconciled MUST be false.
    const r = BankReconciliationEngine.reconcile({
      bankStatementBalance: 5000,
      bookBalance: 4800,
      asOf: ASOF,
      transactions: [{ id: "C1", date: "2026-05-29", amount: 100, type: "check", cleared: false }],
    });
    expect(r.adjustedBankBalance).toBeCloseTo(4900, 2);
    expect(r.adjustedBookBalance).toBeCloseTo(4800, 2);
    expect(r.difference).toBeCloseTo(100, 2); // the delta is SURFACED, not zeroed
    expect(r.reconciled).toBe(false); // engine NEVER forces true on a residual
  });

  it("a sub-cent residual within tolerance still reconciles (0.004 ≤ 0.01)", () => {
    // bankStmt 100.00, book 99.996 → rounds to 100.00 → diff 0 → reconciled.
    const r = BankReconciliationEngine.reconcile({
      bankStatementBalance: 100.0,
      bookBalance: 99.996,
      asOf: ASOF,
      transactions: [],
    });
    expect(Math.abs(r.difference)).toBeLessThanOrEqual(0.01);
    expect(r.reconciled).toBe(true);
  });

  it("THROWS on a NaN bank statement balance (no silent coercion)", () => {
    expect(() =>
      BankReconciliationEngine.reconcile({
        bankStatementBalance: NaN,
        bookBalance: 1000,
        asOf: ASOF,
        transactions: [],
      }),
    ).toThrow();
  });

  it("THROWS on an Infinity book balance", () => {
    expect(() =>
      BankReconciliationEngine.reconcile({
        bankStatementBalance: 1000,
        bookBalance: Infinity,
        asOf: ASOF,
        transactions: [],
      }),
    ).toThrow();
  });

  it("THROWS on a NaN transaction amount", () => {
    expect(() =>
      BankReconciliationEngine.reconcile({
        bankStatementBalance: 1000,
        bookBalance: 1000,
        asOf: ASOF,
        transactions: [{ id: "C1", date: "2026-05-29", amount: NaN, type: "check", cleared: false }],
      }),
    ).toThrow();
  });

  it("THROWS on a non-positive transaction amount (direction belongs to type, not sign)", () => {
    expect(() =>
      BankReconciliationEngine.reconcile({
        bankStatementBalance: 1000,
        bookBalance: 1000,
        asOf: ASOF,
        transactions: [{ id: "C1", date: "2026-05-29", amount: -50, type: "check", cleared: false }],
      }),
    ).toThrow();
  });

  it("THROWS on duplicate transaction ids (ambiguous set would double-count a timing item)", () => {
    expect(() =>
      BankReconciliationEngine.reconcile({
        bankStatementBalance: 1000,
        bookBalance: 700,
        asOf: ASOF,
        transactions: [
          { id: "C1", date: "2026-05-29", amount: 300, type: "check", cleared: false },
          { id: "C1", date: "2026-05-30", amount: 300, type: "check", cleared: false },
        ],
      }),
    ).toThrow(/duplicate/i);
  });

  it("THROWS on a malformed asOf date", () => {
    expect(() =>
      BankReconciliationEngine.reconcile({
        bankStatementBalance: 1000,
        bookBalance: 1000,
        asOf: "May 31 2026",
        transactions: [],
      }),
    ).toThrow();
  });
});
