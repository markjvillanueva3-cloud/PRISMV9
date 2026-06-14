/**
 * BankReconciliationEngine — statement-vs-book bank reconciliation for the PRISM ERP
 * (galaxy:business, slot:hotel).
 *
 * QuickBooks-parity: the "Reconcile" wizard (QB-PARITY Phase-3 banking engine #3, the A/P + banking
 * cycle: VendorCredit / BillPayment / **BankReconciliation** / BankFeedImport / BankDepositTransfer).
 * This is the *classic* statement-vs-book reconciliation: given the bank statement's ending balance,
 * the company's book (GL Cash) balance, and the period's transactions tagged cleared/uncleared, it
 * computes the textbook bank-rec identity and reports whether the books tie out to the bank — and if
 * not, surfaces the exact residual (NEVER forces reconciled=true).
 *
 * The bank-rec identity (AICPA / GAAP textbook form, two-column reconciliation):
 *
 *     adjustedBank = bankStatementBalance + Σ(deposits in transit) − Σ(outstanding checks)
 *     adjustedBook = bookBalance          + Σ(interest earned)     − Σ(bank fees)
 *     reconciled   = |adjustedBank − adjustedBook| ≤ RECONCILE_TOLERANCE_DOLLARS  (one cent)
 *
 * where uncleared deposits are "deposits in transit", uncleared checks are "outstanding checks", and
 * the fees/interest on the statement that the books have NOT yet recorded are the "unrecorded items".
 * Both columns are walked to the SAME adjusted figure when reconciled; the difference is the residual.
 *
 * DEDUP finding (duplicationGuard discipline): a DIFFERENT reconciler exists —
 * `AccountingHardeningEngine.bankReconciliation()` (action `acct_bank_reconcile`) is a *transaction-
 * matching* reconciler (3-pass exact/fuzzy/reference matching of bank txns ↔ GL entries). It takes a
 * different contract ({bank_transactions, gl_entries, ...}), inlines its tolerance, uses half-up
 * Math.round rounding (not half-even), and has no NaN/Infinity guard, no fees/interest adjusting-entry
 * handling, and returns no balanced GL lines. This engine is the COMPLEMENTARY statement-vs-book wizard
 * the QB-PARITY-PLAN explicitly lists as the net-new 🔴 BankReconciliationEngine — distinct method,
 * distinct input shape, half-even + fail-loud + returns balanced adjusting GL lines. Not a duplicate.
 *
 * Producer / PRISM synergy:
 *   - Shop-ops banking cycle: at period close the bookkeeper opens the bank statement, marks which
 *     checks/deposits cleared, and reconciles GL Cash (1000) to it. THIS engine is that wizard. The
 *     unrecorded fees/interest it surfaces become adjusting journal entries
 *     (DR 5500 Operating Expenses / CR 1000 Cash for fees; DR 1000 Cash / CR 4900 Interest Income for
 *     interest) — RETURNED here as balanced data, posted by the caller via GeneralLedgerEngine.
 *     (4900 is the non-operating income account; it does NOT reuse 4100 Service Revenue. Account
 *     numbers/names are the source of truth in data/bank-reconciliation-accounts.ts, never inlined.)
 *   - Networking-platform payout flow (business/PRISM-NETWORKING-PLATFORM-PLAN.md): the platform's
 *     escrow/payout bank account is reconciled by the SAME identity — marketplace payouts are just a
 *     second producer of the {statement, book, transactions} triple this engine consumes.
 *
 * Financial-invariant compliance (business/GSD.md §2.1, [[feedback_hotel_financial_invariant_gate]]):
 *   - account numbers / tolerances IMPORTED from data/bank-reconciliation-accounts.ts, never inlined.
 *   - half-even (banker's) rounding to the cent — REUSES roundCentsHalfEven (shared money util) from the shared money util src/data/money.ts.
 *   - the identity reconciles BOTH ways (adjustedBank computed from the bank side, adjustedBook from
 *     the book side; their residual is the reported difference — surfaced, never swallowed).
 *   - `reconciled` is set HONESTLY from the residual (|difference| ≤ one cent). A real difference →
 *     reconciled:false + difference reported (fail loud, never coerced true).
 *   - non-finite / NaN / Infinity balances or amounts THROW (never silently coerce to 0).
 *   - the RETURNED adjusting GL lines balance: Σdebits === Σcredits (asserted before return).
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wire bank_reconcile / bank_reconcile_gl_lines in main post golf-merge. Wiring + golf-merging the
// stale worktree businessDispatcher.ts would CLOBBER ~438 main actions (regression). NOTE: do NOT
// collide with the existing `acct_bank_reconcile` (AccountingHardeningEngine txn-matcher) — register
// under a distinct action name. Tracked in business/QUICKBOOKS-PARITY-PLAN.md §Status.
import { z } from "zod";
import { roundCentsHalfEven } from "../data/money.js";
import {
  CASH_ACCOUNT,
  BANK_FEE_EXPENSE_ACCOUNT,
  INTEREST_INCOME_ACCOUNT,
  RECONCILE_TOLERANCE_DOLLARS,
  MONEY_RECONCILE_TOLERANCE,
  BANK_RECONCILIATION_SCHEMA_VERSION,
} from "../data/bank-reconciliation-accounts.js";

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * A single transaction in the reconciliation period.
 *   - deposit  : money INTO the account (cleared → on the statement; uncleared → deposit in transit).
 *   - check    : money OUT (cleared → on the statement; uncleared → outstanding check).
 *   - fee      : a bank service charge — money OUT the bank initiated. Always on the statement, so it
 *                is `cleared` from the bank's view; the question is whether the BOOKS recorded it.
 *   - interest : interest the bank credited — money IN the bank initiated. Same: always on statement.
 *
 * `amount` is the MAGNITUDE (always positive); the `type` carries the direction. A negative or zero
 * amount is rejected — direction belongs to `type`, not to the sign of `amount`.
 *
 * `cleared` means the item appears on the bank statement (it has posted at the bank). For deposits and
 * checks, an uncleared item is a timing difference (in transit / outstanding). For fees and interest,
 * `cleared` is the bank's view; `recordedInBooks` (default false) says whether the company's books
 * already captured it — an unrecorded fee/interest is what becomes an adjusting journal entry.
 */
const TransactionSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  amount: z.number().finite().positive(), // magnitude only; direction is in `type`
  type: z.enum(["deposit", "check", "fee", "interest"]),
  cleared: z.boolean(),
  /** whether the company's books already recorded this fee/interest (default: not yet). */
  recordedInBooks: z.boolean().optional().default(false),
});
export type TransactionInput = z.input<typeof TransactionSchema>;

const ReconcileInputSchema = z.object({
  bankStatementBalance: z.number().finite(), // bank's ending balance — may be any sign (overdraft ok)
  bookBalance: z.number().finite(),          // company GL Cash balance — may be any sign
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "asOf must be YYYY-MM-DD"),
  transactions: z.array(TransactionSchema),
});
export type ReconcileInput = z.input<typeof ReconcileInputSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

/** A transaction echoed into a classification bucket (rounded magnitude). */
export interface ReconcileItem {
  id: string;
  date: string;
  amount: number; // half-even rounded magnitude
  type: "deposit" | "check" | "fee" | "interest";
}

/** A single double-entry GL line for an adjusting entry the reconciliation surfaces. */
export interface GlLine {
  account: string;
  accountName: string;
  debit: number;  // ≥ 0
  credit: number; // ≥ 0
  description: string;
}

export interface BankReconciliationResult {
  asOf: string;
  bankStatementBalance: number;           // echo of the rounded statement balance
  bookBalance: number;                    // echo of the rounded book balance
  /** uncleared checks (money out not yet posted at the bank) — reduce bank toward book. */
  outstandingChecks: ReconcileItem[];
  /** uncleared deposits (money in not yet posted at the bank) — increase bank toward book. */
  depositsInTransit: ReconcileItem[];
  /** fees/interest on the statement the books have NOT recorded — adjust the BOOK side. */
  unrecordedItems: ReconcileItem[];
  totalOutstandingChecks: number;         // Σ magnitudes
  totalDepositsInTransit: number;         // Σ magnitudes
  unrecordedFees: number;                 // Σ unrecorded fee magnitudes
  unrecordedInterest: number;             // Σ unrecorded interest magnitudes
  /** bankStatementBalance + Σ deposits in transit − Σ outstanding checks. */
  adjustedBankBalance: number;
  /** bookBalance + Σ unrecorded interest − Σ unrecorded fees. */
  adjustedBookBalance: number;
  /** adjustedBankBalance − adjustedBookBalance, half-even rounded. Surfaced, never swallowed. */
  difference: number;
  /** HONEST: |difference| ≤ one cent. NEVER forced true on a real residual. */
  reconciled: boolean;
  /**
   * The balanced adjusting journal entries the books still need (RETURNED as data — engine stays pure).
   *   fee:      DR 5500 Operating Expenses / CR 1000 Cash         (per unrecorded fee)
   *   interest: DR 1000 Cash              / CR 4900 Interest Income (per unrecorded interest)
   * Σdebits === Σcredits across all lines, asserted before return. Empty when nothing is unrecorded.
   */
  adjustingGlLines: GlLine[];
  schemaVersion: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class BankReconciliationEngine {
  /**
   * Reconcile a bank statement against the company books (QuickBooks "Reconcile").
   *
   * Classifies the period's transactions:
   *   - uncleared `check`    → outstanding check   (subtract from bank side)
   *   - uncleared `deposit`  → deposit in transit  (add to bank side)
   *   - `fee`/`interest` not yet `recordedInBooks` → unrecorded item (adjust book side)
   *   - cleared deposits/checks and already-recorded fees/interest are reconciling no-ops (both
   *     statement and books already reflect them) — they neither move a column nor post an entry.
   *
   * Then walks the textbook identity from BOTH sides and reports the residual:
   *     adjustedBank = bankStatementBalance + Σ(deposits in transit) − Σ(outstanding checks)
   *     adjustedBook = bookBalance          + Σ(unrecorded interest)  − Σ(unrecorded fees)
   *     difference   = adjustedBank − adjustedBook        (surfaced, never swallowed)
   *     reconciled   = |difference| ≤ one cent            (set HONESTLY — never forced)
   *
   * Invariants (all enforced; THROW on violation — fail loud, never silently coerce):
   *   - bankStatementBalance, bookBalance, and every transaction amount must be finite (NaN/±Infinity
   *     THROW via the zod `.finite()` guards).
   *   - each transaction amount is a positive magnitude (direction lives in `type`); ≤ 0 THROWS.
   *   - duplicate transaction ids THROW (an ambiguous set would double-count a timing item).
   *   - `reconciled` is computed from the residual — the engine NEVER sets it true on a real difference.
   *   - the returned adjusting GL lines balance: Σdebits === Σcredits.
   *
   * @param input {bankStatementBalance, bookBalance, asOf(YYYY-MM-DD), transactions[]}.
   * @returns {@link BankReconciliationResult} — classified buckets, adjusted balances, honest
   *          difference + reconciled flag, and balanced adjusting GL lines.
   */
  static reconcile(input: ReconcileInput): BankReconciliationResult {
    const i = ReconcileInputSchema.parse(input); // THROWS on NaN/Infinity balances, ≤0 amounts, bad dates

    // Guard against duplicate transaction ids — an ambiguous set could classify (and thus count) one
    // timing item twice. Surface it loudly rather than reconcile non-deterministically.
    const seen = new Set<string>();
    for (const t of i.transactions) {
      if (seen.has(t.id)) {
        throw new Error(`[bank-rec] duplicate transaction id '${t.id}' (asOf ${i.asOf})`);
      }
      seen.add(t.id);
    }

    const bankStatementBalance = roundCentsHalfEven(i.bankStatementBalance);
    const bookBalance = roundCentsHalfEven(i.bookBalance);

    const outstandingChecks: ReconcileItem[] = [];
    const depositsInTransit: ReconcileItem[] = [];
    const unrecordedItems: ReconcileItem[] = [];

    for (const t of i.transactions) {
      const amount = roundCentsHalfEven(t.amount);
      const item: ReconcileItem = { id: t.id, date: t.date, amount, type: t.type };
      switch (t.type) {
        case "check":
          if (!t.cleared) outstandingChecks.push(item); // uncleared check = outstanding
          break;
        case "deposit":
          if (!t.cleared) depositsInTransit.push(item); // uncleared deposit = in transit
          break;
        case "fee":
        case "interest":
          // A fee/interest on the statement that the books have NOT captured is an unrecorded item.
          if (!t.recordedInBooks) unrecordedItems.push(item);
          break;
      }
    }

    const totalOutstandingChecks = roundCentsHalfEven(
      outstandingChecks.reduce((s, c) => s + c.amount, 0),
    );
    const totalDepositsInTransit = roundCentsHalfEven(
      depositsInTransit.reduce((s, d) => s + d.amount, 0),
    );
    const unrecordedFees = roundCentsHalfEven(
      unrecordedItems.filter((u) => u.type === "fee").reduce((s, u) => s + u.amount, 0),
    );
    const unrecordedInterest = roundCentsHalfEven(
      unrecordedItems.filter((u) => u.type === "interest").reduce((s, u) => s + u.amount, 0),
    );

    // ----- The identity, walked from BOTH sides ------------------------------
    // Bank side: start at the statement, ADD deposits still in transit, SUBTRACT checks still out.
    const adjustedBankBalance = roundCentsHalfEven(
      bankStatementBalance + totalDepositsInTransit - totalOutstandingChecks,
    );
    // Book side: start at the books, ADD interest not yet booked, SUBTRACT fees not yet booked.
    const adjustedBookBalance = roundCentsHalfEven(
      bookBalance + unrecordedInterest - unrecordedFees,
    );

    // The residual — the honesty gate. Surfaced as `difference`; NEVER swallowed.
    const difference = roundCentsHalfEven(adjustedBankBalance - adjustedBookBalance);
    const reconciled = Math.abs(difference) <= RECONCILE_TOLERANCE_DOLLARS;

    const adjustingGlLines = BankReconciliationEngine.buildAdjustingGlLines(
      i.asOf,
      unrecordedItems,
    );

    return {
      asOf: i.asOf,
      bankStatementBalance,
      bookBalance,
      outstandingChecks,
      depositsInTransit,
      unrecordedItems,
      totalOutstandingChecks,
      totalDepositsInTransit,
      unrecordedFees,
      unrecordedInterest,
      adjustedBankBalance,
      adjustedBookBalance,
      difference,
      reconciled,
      adjustingGlLines,
      schemaVersion: BANK_RECONCILIATION_SCHEMA_VERSION,
    };
  }

  // --------------------------------------------------------------------------
  // GL
  // --------------------------------------------------------------------------

  /**
   * Build the balanced adjusting journal entries the books still need for the UNRECORDED statement
   * items (returned as data — the engine never posts):
   *   fee:      DR 5500 Operating Expenses (amount) / CR 1000 Cash            (amount)
   *   interest: DR 1000 Cash             (amount)    / CR 4900 Interest Income (amount)
   * Each unrecorded item emits one balanced DR/CR pair, so Σdebits === Σcredits across the set by
   * construction. Re-validated here as defence-in-depth before returning. Cleared/already-recorded
   * items and pure timing items (outstanding checks / deposits in transit) post NOTHING — the books
   * already reflect them or will when they clear.
   */
  private static buildAdjustingGlLines(asOf: string, unrecordedItems: ReconcileItem[]): GlLine[] {
    const lines: GlLine[] = [];

    for (const u of unrecordedItems) {
      if (u.type === "fee") {
        // Fee: cash leaves the bank → expense it and relieve book cash.
        lines.push(
          {
            account: BANK_FEE_EXPENSE_ACCOUNT.number,
            accountName: BANK_FEE_EXPENSE_ACCOUNT.name,
            debit: u.amount,
            credit: 0,
            description: `Bank fee ${u.id} (${asOf}) — record unrecorded service charge`,
          },
          {
            account: CASH_ACCOUNT.number,
            accountName: CASH_ACCOUNT.name,
            debit: 0,
            credit: u.amount,
            description: `Bank fee ${u.id} (${asOf}) — reduce book cash`,
          },
        );
      } else if (u.type === "interest") {
        // Interest: cash arrives in the bank → recognize income and increase book cash.
        lines.push(
          {
            account: CASH_ACCOUNT.number,
            accountName: CASH_ACCOUNT.name,
            debit: u.amount,
            credit: 0,
            description: `Interest ${u.id} (${asOf}) — increase book cash`,
          },
          {
            account: INTEREST_INCOME_ACCOUNT.number,
            accountName: INTEREST_INCOME_ACCOUNT.name,
            debit: 0,
            credit: u.amount,
            description: `Interest ${u.id} (${asOf}) — recognize interest income`,
          },
        );
      }
    }

    const debitTotal = roundCentsHalfEven(lines.reduce((s, l) => s + l.debit, 0));
    const creditTotal = roundCentsHalfEven(lines.reduce((s, l) => s + l.credit, 0));
    if (Math.abs(debitTotal - creditTotal) > MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `[bank-rec] adjusting GL entry unbalanced: Σdebits ${debitTotal.toFixed(2)} != Σcredits ` +
          `${creditTotal.toFixed(2)} (asOf ${asOf})`,
      );
    }
    return lines;
  }
}

export const bankReconciliationEngine = BankReconciliationEngine;
export { BankReconciliationEngine };
