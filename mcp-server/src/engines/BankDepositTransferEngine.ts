/**
 * BankDepositTransferEngine — bank deposits + funds transfers for the PRISM ERP
 * (galaxy:business, slot:hotel).
 *
 * QuickBooks-parity: the "Make Deposits" + "Transfer Funds" function set (QB-PARITY Phase-3
 * banking engine #5, the A/P + banking cycle). Two pure, GL-data-emitting operations:
 *
 *   - recordDeposit  — QuickBooks "Make Deposits": sweep a batch of undeposited receipts into
 *     the bank as ONE deposit slip. DR 1000 Cash (Σreceipts) / CR 1499 Undeposited Funds
 *     (Σreceipts). The receipts being grouped were each previously parked in 1499 Undeposited
 *     Funds at cash-application time (ReceivePaymentEngine's DR1000 leg is, in the
 *     two-step QB flow, a DR1499 → later swept here). total === Σreceipts.
 *   - recordTransfer — QuickBooks "Transfer Funds": move money between two bank/asset accounts.
 *     DR toAccount (amount) / CR fromAccount (amount). A self-transfer (from === to) is a no-op
 *     error and THROWS.
 *
 * PRISM synergy — this engine serves BOTH:
 *  - the QuickBooks A/P + banking cycle (QUICKBOOKS-PARITY-PLAN.md): the producer is the daily
 *    cash desk — receipts applied by `ReceivePaymentEngine` accumulate in Undeposited Funds, and a
 *    bank run groups them into a single deposit whose GL lines post via `GeneralLedgerEngine`; a
 *    treasury sweep between operating/savings accounts produces the transfer.
 *  - the manufacturing networking platform (business/PRISM-NETWORKING-PLATFORM-PLAN.md): the
 *    platform's payout flow batches buyer receipts held in escrow/clearing (an Undeposited-Funds
 *    analogue) into a settlement deposit, and moves funds between platform clearing accounts — the
 *    same deposit-grouping + transfer math backs both surfaces.
 *
 * Financial-invariant compliance (business/GSD.md §2.1, [[feedback_hotel_financial_invariant_gate]]):
 *  - account numbers IMPORTED from data/bank-accounts.ts, never inlined.
 *  - half-even (banker's) rounding to the cent — REUSES roundCentsHalfEven (shared money util) from the shared money util src/data/money.ts (DRY).
 *  - money reconciles BOTH ways: deposit total === Σreceipts === the GL debit === the GL credit.
 *  - non-finite / NaN / negative / zero receipt or transfer amounts THROW (no silent coercion).
 *  - empty receipts THROW (an empty deposit slip posts nothing — almost certainly a data error).
 *  - accounts must be known chart/extension numbers (unknown number THROWS — no phantom posting).
 *  - the RETURNED GL lines balance: Σdebits === Σcredits (asserted before return on every path).
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wire bank_deposit_record / bank_transfer_record in main post golf-merge. Wiring + golf-merging the
// stale worktree businessDispatcher.ts would CLOBBER ~438 main actions (regression). Tracked in
// business/QUICKBOOKS-PARITY-PLAN.md §Status.
import { z } from "zod";
import { roundCentsHalfEven } from "../data/money.js";
import {
  CASH_ACCOUNT,
  UNDEPOSITED_FUNDS_ACCOUNT,
  MONEY_RECONCILE_TOLERANCE,
  isKnownAccount,
  accountName,
} from "../data/bank-accounts.js";

// ============================================================================
// SCHEMAS
// ============================================================================

const ReceiptSchema = z.object({
  refId: z.string().min(1), // the receipt/payment id being deposited (audit trail)
  amount: z.number().finite().positive(), // a $0 or negative receipt cannot be deposited
});
export type ReceiptInput = z.infer<typeof ReceiptSchema>;

const DepositSchema = z.object({
  depositId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  receipts: z.array(ReceiptSchema).min(1, "a deposit must group at least one receipt"),
  // The bank/asset account the deposit lands in. Defaults to 1000 Cash; any value must be a known
  // chart/extension account (validated in recordDeposit — Zod default fields use z.input on the param).
  toAccount: z.string().min(1).default(CASH_ACCOUNT.number),
});
export type DepositInput = z.input<typeof DepositSchema>;

const TransferSchema = z.object({
  transferId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  fromAccount: z.string().min(1),
  toAccount: z.string().min(1),
  amount: z.number().finite().positive(), // a $0 or negative transfer moves nothing
});
export type TransferInput = z.infer<typeof TransferSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

/** A single double-entry GL line the deposit/transfer would post (debit XOR credit is positive). */
export interface GlLine {
  account: string;     // GL account number
  accountName: string;
  debit: number;       // ≥ 0
  credit: number;      // ≥ 0
  description: string;
}

/** A single receipt as recorded into a deposit (echo of the rounded grouped amount). */
export interface DepositedReceipt {
  refId: string;
  amount: number; // rounded to the cent (half-even)
}

export interface DepositResult {
  depositId: string;
  date: string;
  toAccount: string;
  receipts: DepositedReceipt[];
  /** number of receipts grouped into the deposit slip. */
  receiptCount: number;
  /** Σ receipts.amount, half-even rounded — the deposit slip total. */
  total: number;
  /**
   * The balanced double-entry the deposit posts (RETURNED as data, not posted here — keeps the
   * engine pure + testable). DR <toAccount> (total) / CR 1499 Undeposited Funds (total).
   * Σdebits === Σcredits by construction.
   */
  glLines: GlLine[];
}

export interface TransferResult {
  transferId: string;
  date: string;
  fromAccount: string;
  toAccount: string;
  /** the transferred amount, half-even rounded. */
  amount: number;
  /**
   * The balanced double-entry the transfer posts (RETURNED as data). DR <toAccount> (amount) /
   * CR <fromAccount> (amount). Σdebits === Σcredits by construction.
   */
  glLines: GlLine[];
}

// ============================================================================
// ENGINE
// ============================================================================

class BankDepositTransferEngine {
  /**
   * Group a batch of undeposited receipts into a single bank deposit (QuickBooks "Make Deposits").
   *
   * Posts (returned as data): DR <toAccount> Cash (Σreceipts) / CR 1499 Undeposited Funds (Σreceipts).
   * The deposit total equals the sum of the grouped receipts, reconciled against both GL legs.
   *
   * Invariants (all enforced, THROW on violation — fail loud, never silently coerce):
   *   - `receipts` must be a non-empty array (an empty deposit posts nothing → data error).
   *   - every receipt amount must be finite and > 0 (NaN / Infinity / 0 / negative THROW).
   *   - duplicate receipt `refId`s THROW (an ambiguous batch would double-count a single receipt).
   *   - `toAccount` (default 1000 Cash) must be a known chart/extension account (unknown THROWS).
   *   - the returned GL lines balance: Σdebits === Σcredits === total.
   *
   * @param input {depositId, date(YYYY-MM-DD), receipts[{refId, amount}], toAccount?(default 1000)}.
   * @returns {@link DepositResult} — grouped receipts, count, total, balanced GL lines.
   * @throws on empty/invalid receipts, non-finite/non-positive amounts, duplicate refIds, unknown account.
   */
  static recordDeposit(input: DepositInput): DepositResult {
    const d = DepositSchema.parse(input); // throws on empty receipts, NaN/Infinity/0/negative amount

    if (!isKnownAccount(d.toAccount)) {
      throw new Error(
        `[bank-deposit-transfer] deposit ${d.depositId}: toAccount '${d.toAccount}' is not a known chart/extension account`,
      );
    }

    // Reject duplicate receipt ids — an ambiguous batch would let one receipt be deposited twice.
    const seen = new Set<string>();
    for (const r of d.receipts) {
      if (seen.has(r.refId)) {
        throw new Error(`[bank-deposit-transfer] deposit ${d.depositId}: duplicate receipt refId '${r.refId}'`);
      }
      seen.add(r.refId);
    }

    const receipts: DepositedReceipt[] = d.receipts.map((r) => ({
      refId: r.refId,
      amount: roundCentsHalfEven(r.amount),
    }));
    const total = roundCentsHalfEven(receipts.reduce((s, r) => s + r.amount, 0));

    // A grouped total must be strictly positive — every receipt was already > 0, so this is a
    // defensive fail-loud guard against a rounding seam summing to ≤ 0.
    if (total <= 0) {
      throw new Error(`[bank-deposit-transfer] deposit ${d.depositId}: grouped total must be positive (got ${total})`);
    }

    const glLines = BankDepositTransferEngine.buildDepositGlLines(d.depositId, d.toAccount, total);

    return {
      depositId: d.depositId,
      date: d.date,
      toAccount: d.toAccount,
      receipts,
      receiptCount: receipts.length,
      total,
      glLines,
    };
  }

  /**
   * Move money between two bank/asset accounts (QuickBooks "Transfer Funds").
   *
   * Posts (returned as data): DR <toAccount> (amount) / CR <fromAccount> (amount).
   *
   * Invariants (all enforced, THROW on violation — fail loud):
   *   - `amount` must be finite and > 0 (NaN / Infinity / 0 / negative THROW).
   *   - `fromAccount` and `toAccount` must each be a known chart/extension account (unknown THROWS).
   *   - `fromAccount !== toAccount` — a self-transfer is a no-op error and THROWS.
   *   - the returned GL lines balance: Σdebits === Σcredits === amount.
   *
   * @param input {transferId, date(YYYY-MM-DD), fromAccount, toAccount, amount}.
   * @returns {@link TransferResult} — the rounded amount + balanced GL lines.
   * @throws on a non-finite/non-positive amount, an unknown account, or a same-account transfer.
   */
  static recordTransfer(input: TransferInput): TransferResult {
    const t = TransferSchema.parse(input); // throws on NaN/Infinity/0/negative amount, empty ids

    if (t.fromAccount === t.toAccount) {
      // A self-transfer would post DR X / CR X — a balanced but meaningless no-op that silently
      // succeeds while doing nothing. Almost always a data-entry error; fail loud.
      throw new Error(
        `[bank-deposit-transfer] transfer ${t.transferId}: fromAccount and toAccount are identical ('${t.fromAccount}') — a self-transfer is a no-op error`,
      );
    }
    if (!isKnownAccount(t.fromAccount)) {
      throw new Error(
        `[bank-deposit-transfer] transfer ${t.transferId}: fromAccount '${t.fromAccount}' is not a known chart/extension account`,
      );
    }
    if (!isKnownAccount(t.toAccount)) {
      throw new Error(
        `[bank-deposit-transfer] transfer ${t.transferId}: toAccount '${t.toAccount}' is not a known chart/extension account`,
      );
    }

    const amount = roundCentsHalfEven(t.amount);
    if (amount <= 0) {
      // Defensive: positive() already rejects ≤ 0, but a sub-half-cent amount could round to 0.
      throw new Error(`[bank-deposit-transfer] transfer ${t.transferId}: amount rounds to non-positive (got ${amount})`);
    }

    const glLines = BankDepositTransferEngine.buildTransferGlLines(t.transferId, t.fromAccount, t.toAccount, amount);

    return {
      transferId: t.transferId,
      date: t.date,
      fromAccount: t.fromAccount,
      toAccount: t.toAccount,
      amount,
      glLines,
    };
  }

  // --------------------------------------------------------------------------
  // GL
  // --------------------------------------------------------------------------

  /**
   * Build the balanced double-entry for a deposit (returned as data):
   *   DR <toAccount> (total)               — cash lands in the bank
   *   CR 1499 Undeposited Funds (total)    — relieves the holding account
   * Σdebits === Σcredits === total by construction. Re-validated here as defence-in-depth.
   */
  private static buildDepositGlLines(depositId: string, toAccount: string, total: number): GlLine[] {
    const lines: GlLine[] = [
      {
        account: toAccount,
        accountName: accountName(toAccount),
        debit: total,
        credit: 0,
        description: `Deposit ${depositId} to ${accountName(toAccount)}`,
      },
      {
        account: UNDEPOSITED_FUNDS_ACCOUNT.number,
        accountName: UNDEPOSITED_FUNDS_ACCOUNT.name,
        debit: 0,
        credit: total,
        description: `Deposit ${depositId} sweeps undeposited funds`,
      },
    ];
    BankDepositTransferEngine.assertBalanced(lines, `deposit ${depositId}`);
    return lines;
  }

  /**
   * Build the balanced double-entry for a transfer (returned as data):
   *   DR <toAccount> (amount)              — destination account increases
   *   CR <fromAccount> (amount)            — source account decreases
   * Σdebits === Σcredits === amount by construction. Re-validated here as defence-in-depth.
   */
  private static buildTransferGlLines(
    transferId: string,
    fromAccount: string,
    toAccount: string,
    amount: number,
  ): GlLine[] {
    const lines: GlLine[] = [
      {
        account: toAccount,
        accountName: accountName(toAccount),
        debit: amount,
        credit: 0,
        description: `Transfer ${transferId} into ${accountName(toAccount)}`,
      },
      {
        account: fromAccount,
        accountName: accountName(fromAccount),
        debit: 0,
        credit: amount,
        description: `Transfer ${transferId} out of ${accountName(fromAccount)}`,
      },
    ];
    BankDepositTransferEngine.assertBalanced(lines, `transfer ${transferId}`);
    return lines;
  }

  /**
   * Assert a set of GL lines balances (Σdebits === Σcredits to the cent). THROWS on violation —
   * a single fail-loud guard shared by both deposit and transfer postings.
   */
  private static assertBalanced(lines: GlLine[], context: string): void {
    const debitTotal = roundCentsHalfEven(lines.reduce((s, l) => s + l.debit, 0));
    const creditTotal = roundCentsHalfEven(lines.reduce((s, l) => s + l.credit, 0));
    if (Math.abs(debitTotal - creditTotal) > MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `[bank-deposit-transfer] GL entry unbalanced for ${context}: Σdebits ${debitTotal.toFixed(2)} != ` +
          `Σcredits ${creditTotal.toFixed(2)}`,
      );
    }
  }
}

export const bankDepositTransferEngine = BankDepositTransferEngine;
export { BankDepositTransferEngine };
