/**
 * BankDepositTransferEngine.test.ts — QuickBooks "Make Deposits" + "Transfer Funds" parity tests
 * for the PRISM ERP banking cycle (galaxy:business, slot:hotel).
 *
 * Coverage:
 *   - happy path: deposit grouping (3 receipts → balanced DR1000/CR1499); transfer (balanced DR/CR).
 *   - reconciliation: total === Σreceipts === Σdebits === Σcredits (both ways).
 *   - failure modes: empty receipts, NaN amount, negative amount, zero amount, unknown account,
 *     duplicate refIds, same-account transfer.
 *   - adversarial: Infinity, sub-half-cent, banker's-rounding ties.
 *   - spanning configs: default vs explicit toAccount, single-receipt deposit, transfer between
 *     several account pairs, large batch.
 *
 * Reference values are hand-computed (see inline arithmetic comments), NOT toBeDefined() stubs.
 */
import { describe, it, expect } from "vitest";
import { BankDepositTransferEngine } from "../engines/BankDepositTransferEngine.js";
import { roundCentsHalfEven } from "../data/money.js";

const sumDebits = (lines: { debit: number }[]) => roundCentsHalfEven(lines.reduce((s, l) => s + l.debit, 0));
const sumCredits = (lines: { credit: number }[]) => roundCentsHalfEven(lines.reduce((s, l) => s + l.credit, 0));

describe("BankDepositTransferEngine.recordDeposit — happy path + reconciliation", () => {
  it("groups 3 undeposited receipts into one balanced deposit (DR 1000 Cash / CR 1499 Undeposited)", () => {
    // 100.25 + 250.50 + 49.25 = 400.00
    const res = BankDepositTransferEngine.recordDeposit({
      depositId: "DEP-001",
      date: "2026-05-29",
      receipts: [
        { refId: "RCPT-A", amount: 100.25 },
        { refId: "RCPT-B", amount: 250.5 },
        { refId: "RCPT-C", amount: 49.25 },
      ],
    });

    expect(res.receiptCount).toBe(3);
    expect(res.total).toBeCloseTo(400.0, 2);
    expect(res.toAccount).toBe("1000"); // default Cash

    // GL: DR 1000 Cash 400.00 / CR 1499 Undeposited Funds 400.00
    expect(res.glLines).toHaveLength(2);
    const cash = res.glLines.find((l) => l.account === "1000")!;
    const undep = res.glLines.find((l) => l.account === "1499")!;
    expect(cash.debit).toBeCloseTo(400.0, 2);
    expect(cash.credit).toBe(0);
    expect(cash.accountName).toBe("Cash");
    expect(undep.credit).toBeCloseTo(400.0, 2);
    expect(undep.debit).toBe(0);
    expect(undep.accountName).toBe("Undeposited Funds");

    // Reconciles both ways: total === Σreceipts === Σdebits === Σcredits.
    expect(sumDebits(res.glLines)).toBeCloseTo(res.total, 2);
    expect(sumCredits(res.glLines)).toBeCloseTo(res.total, 2);
    expect(sumDebits(res.glLines)).toBeCloseTo(sumCredits(res.glLines), 2);
  });

  it("deposits a single receipt into an explicit non-default toAccount (toAccount drives the DR leg; CR leg stays 1499)", () => {
    // The engine must honor an explicit KNOWN toAccount; we use 1320 Raw Materials to prove the
    // toAccount drives the DR leg while the CR leg is always 1499 Undeposited Funds.
    const res = BankDepositTransferEngine.recordDeposit({
      depositId: "DEP-002",
      date: "2026-05-29",
      receipts: [{ refId: "RCPT-ONLY", amount: 1234.56 }],
      toAccount: "1320",
    });
    expect(res.total).toBeCloseTo(1234.56, 2);
    const dr = res.glLines.find((l) => l.debit > 0)!;
    const cr = res.glLines.find((l) => l.credit > 0)!;
    expect(dr.account).toBe("1320");
    expect(dr.accountName).toBe("Raw Materials");
    expect(cr.account).toBe("1499"); // always Undeposited Funds
    expect(dr.debit).toBeCloseTo(1234.56, 2);
    expect(cr.credit).toBeCloseTo(1234.56, 2);
  });

  it("groups a large batch and reconciles to the cent", () => {
    // 12 receipts of 33.33 each = 399.96
    const receipts = Array.from({ length: 12 }, (_, i) => ({ refId: `R${i}`, amount: 33.33 }));
    const res = BankDepositTransferEngine.recordDeposit({ depositId: "DEP-BIG", date: "2026-05-29", receipts });
    expect(res.receiptCount).toBe(12);
    expect(res.total).toBeCloseTo(399.96, 2); // 33.33 * 12
    expect(sumDebits(res.glLines)).toBeCloseTo(sumCredits(res.glLines), 2);
    expect(sumDebits(res.glLines)).toBeCloseTo(399.96, 2);
  });

  it("applies banker's (half-even) rounding to receipt amounts", () => {
    // 1.005 → 1.00 (100.5 → floor 100 even → 100 → 1.00); 2.675 → 2.68 (267.5 → floor 267 odd → 268)
    // total = 1.00 + 2.68 = 3.68
    const res = BankDepositTransferEngine.recordDeposit({
      depositId: "DEP-RND",
      date: "2026-05-29",
      receipts: [
        { refId: "RND-A", amount: 1.005 },
        { refId: "RND-B", amount: 2.675 },
      ],
    });
    expect(res.receipts[0].amount).toBeCloseTo(1.0, 2);
    expect(res.receipts[1].amount).toBeCloseTo(2.68, 2);
    expect(res.total).toBeCloseTo(3.68, 2);
    expect(sumDebits(res.glLines)).toBeCloseTo(3.68, 2);
  });
});

describe("BankDepositTransferEngine.recordDeposit — failure & adversarial modes", () => {
  it("throws on empty receipts (an empty deposit slip posts nothing)", () => {
    expect(() =>
      BankDepositTransferEngine.recordDeposit({ depositId: "DEP-EMPTY", date: "2026-05-29", receipts: [] }),
    ).toThrow();
  });

  it("throws on a NaN receipt amount (never silently coerce)", () => {
    expect(() =>
      BankDepositTransferEngine.recordDeposit({
        depositId: "DEP-NAN",
        date: "2026-05-29",
        receipts: [{ refId: "R1", amount: Number.NaN }],
      }),
    ).toThrow();
  });

  it("throws on an Infinity receipt amount (adversarial non-finite)", () => {
    expect(() =>
      BankDepositTransferEngine.recordDeposit({
        depositId: "DEP-INF",
        date: "2026-05-29",
        receipts: [{ refId: "R1", amount: Number.POSITIVE_INFINITY }],
      }),
    ).toThrow();
  });

  it("throws on a negative receipt amount", () => {
    expect(() =>
      BankDepositTransferEngine.recordDeposit({
        depositId: "DEP-NEG",
        date: "2026-05-29",
        receipts: [
          { refId: "R1", amount: 100 },
          { refId: "R2", amount: -50 },
        ],
      }),
    ).toThrow();
  });

  it("throws on a zero receipt amount (a $0 receipt cannot be deposited)", () => {
    expect(() =>
      BankDepositTransferEngine.recordDeposit({
        depositId: "DEP-ZERO",
        date: "2026-05-29",
        receipts: [{ refId: "R1", amount: 0 }],
      }),
    ).toThrow();
  });

  it("throws on duplicate receipt refIds (ambiguous batch would double-count)", () => {
    expect(() =>
      BankDepositTransferEngine.recordDeposit({
        depositId: "DEP-DUP",
        date: "2026-05-29",
        receipts: [
          { refId: "DUP", amount: 100 },
          { refId: "DUP", amount: 200 },
        ],
      }),
    ).toThrow(/duplicate receipt refId/);
  });

  it("throws on an unknown toAccount (no phantom posting)", () => {
    expect(() =>
      BankDepositTransferEngine.recordDeposit({
        depositId: "DEP-BAD-ACCT",
        date: "2026-05-29",
        receipts: [{ refId: "R1", amount: 100 }],
        toAccount: "9999",
      }),
    ).toThrow(/not a known chart\/extension account/);
  });
});

describe("BankDepositTransferEngine.recordTransfer — happy path + reconciliation", () => {
  it("posts a balanced transfer (DR toAccount / CR fromAccount)", () => {
    // Sweep 500.00 from 1499 Undeposited Funds into 1000 Cash.
    const res = BankDepositTransferEngine.recordTransfer({
      transferId: "XFER-001",
      date: "2026-05-29",
      fromAccount: "1499",
      toAccount: "1000",
      amount: 500.0,
    });
    expect(res.amount).toBeCloseTo(500.0, 2);
    expect(res.glLines).toHaveLength(2);

    const dr = res.glLines.find((l) => l.debit > 0)!;
    const cr = res.glLines.find((l) => l.credit > 0)!;
    expect(dr.account).toBe("1000"); // toAccount debited
    expect(dr.debit).toBeCloseTo(500.0, 2);
    expect(cr.account).toBe("1499"); // fromAccount credited
    expect(cr.credit).toBeCloseTo(500.0, 2);
    expect(dr.accountName).toBe("Cash");
    expect(cr.accountName).toBe("Undeposited Funds");

    // Balanced both ways.
    expect(sumDebits(res.glLines)).toBeCloseTo(sumCredits(res.glLines), 2);
    expect(sumDebits(res.glLines)).toBeCloseTo(res.amount, 2);
  });

  it("transfers between several known account pairs (spanning configs) and stays balanced", () => {
    const pairs: Array<[string, string, number]> = [
      ["1000", "1500", 2500.0], // cash → equipment purchase funding
      ["3000", "1000", 10000.0], // owner equity contribution → cash
      ["1320", "1300", 750.55], // raw materials → WIP move
    ];
    for (const [from, to, amount] of pairs) {
      const res = BankDepositTransferEngine.recordTransfer({
        transferId: `XFER-${from}-${to}`,
        date: "2026-05-29",
        fromAccount: from,
        toAccount: to,
        amount,
      });
      expect(res.amount).toBeCloseTo(amount, 2);
      const dr = res.glLines.find((l) => l.debit > 0)!;
      const cr = res.glLines.find((l) => l.credit > 0)!;
      expect(dr.account).toBe(to);
      expect(cr.account).toBe(from);
      expect(sumDebits(res.glLines)).toBeCloseTo(sumCredits(res.glLines), 2);
    }
  });

  it("applies banker's rounding to a transfer amount (2.675 → 2.68)", () => {
    const res = BankDepositTransferEngine.recordTransfer({
      transferId: "XFER-RND",
      date: "2026-05-29",
      fromAccount: "1000",
      toAccount: "1499",
      amount: 2.675,
    });
    expect(res.amount).toBeCloseTo(2.68, 2);
    expect(sumDebits(res.glLines)).toBeCloseTo(2.68, 2);
  });
});

describe("BankDepositTransferEngine.recordTransfer — failure & adversarial modes", () => {
  it("throws on a same-account transfer (self-transfer is a no-op error)", () => {
    expect(() =>
      BankDepositTransferEngine.recordTransfer({
        transferId: "XFER-SELF",
        date: "2026-05-29",
        fromAccount: "1000",
        toAccount: "1000",
        amount: 100,
      }),
    ).toThrow(/self-transfer is a no-op error/);
  });

  it("throws on a NaN transfer amount (adversarial non-finite)", () => {
    expect(() =>
      BankDepositTransferEngine.recordTransfer({
        transferId: "XFER-NAN",
        date: "2026-05-29",
        fromAccount: "1000",
        toAccount: "1499",
        amount: Number.NaN,
      }),
    ).toThrow();
  });

  it("throws on a negative transfer amount", () => {
    expect(() =>
      BankDepositTransferEngine.recordTransfer({
        transferId: "XFER-NEG",
        date: "2026-05-29",
        fromAccount: "1000",
        toAccount: "1499",
        amount: -100,
      }),
    ).toThrow();
  });

  it("throws on a zero transfer amount (moves nothing)", () => {
    expect(() =>
      BankDepositTransferEngine.recordTransfer({
        transferId: "XFER-ZERO",
        date: "2026-05-29",
        fromAccount: "1000",
        toAccount: "1499",
        amount: 0,
      }),
    ).toThrow();
  });

  it("throws on an unknown fromAccount", () => {
    expect(() =>
      BankDepositTransferEngine.recordTransfer({
        transferId: "XFER-BAD-FROM",
        date: "2026-05-29",
        fromAccount: "8888",
        toAccount: "1000",
        amount: 100,
      }),
    ).toThrow(/fromAccount '8888' is not a known/);
  });

  it("throws on an unknown toAccount", () => {
    expect(() =>
      BankDepositTransferEngine.recordTransfer({
        transferId: "XFER-BAD-TO",
        date: "2026-05-29",
        fromAccount: "1000",
        toAccount: "7777",
        amount: 100,
      }),
    ).toThrow(/toAccount '7777' is not a known/);
  });
});
