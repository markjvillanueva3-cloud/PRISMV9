/**
 * CreditMemoEngine — customer credit memos for the PRISM ERP (galaxy:business, slot:hotel).
 *
 * QuickBooks-parity: the "Credit Memo" function set (QB-PARITY-MS0 Phase-2 #3, the A/R revenue
 * cycle: Estimate → Sales Order → Invoice → **Credit Memo** → Receive Payment → Statement → Dunning).
 * A credit memo is a NEGATIVE-revenue document: it reverses revenue (and the tax that rode it) and
 * reduces what the customer owes. It is BORN from a customer return/RMA or a post-invoice price
 * adjustment.
 *
 * PRISM synergy — this engine serves BOTH:
 *  - the QuickBooks A/R cycle (QUICKBOOKS-PARITY-PLAN.md): a return/RMA or price-adjustment producer
 *    creates the memo, which applies against an open invoice's balance (`ReceivePaymentEngine` /
 *    `BillingEngine` consume the application) and posts the contra-GL via `GeneralLedgerEngine`.
 *  - the manufacturing networking platform (business/PRISM-NETWORKING-PLATFORM-PLAN.md): the
 *    platform's order/payment flow issues credits for cancelled/returned platform orders — the same
 *    memo math (apply-to-invoice + remaining-credit tracking) backs both surfaces.
 *
 * Producer: a customer return/RMA or a price-adjustment event → `create()`. The taxable base reuses
 * the same line math as `EstimateEngine` (Σ extension), and the tax line is computed by
 * `SalesUseTaxEngine.calcSalesTax` (imported rates) — never re-derived, never an inlined rate.
 *
 * Financial-invariant compliance (business/GSD.md §2, [[feedback_hotel_financial_invariant_gate]]):
 *  - half-even (banker's) rounding to the cent — REUSES roundCentsHalfEven (shared money util) from the shared money util src/data/money.ts (DRY).
 *  - rates/accounts are IMPORTED (sales-tax-rates.ts / credit-memo-policy.ts), never inlined.
 *  - money reconciles both ways: total == subtotal + tax; unapplied == total − Σapplied (≥ 0).
 *  - over-apply THROWS on BOTH ceilings: applied ≤ creditMemo.total AND applied ≤ invoiceBalance.
 *  - non-finite / NaN / negative qty or price THROW (no silent coercion).
 *  - the RETURNED GL effect balances Σdebits == Σcredits:
 *      DR 4000 Sales Revenue (contra) + DR 2100 Tax Payable / CR 1200 AR (== total).
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wire credit_memo_create / credit_memo_apply / credit_memo_remaining in main post golf-merge.
import { z } from "zod";
import { SalesUseTaxEngine } from "./SalesUseTaxEngine.js";
import { roundCentsHalfEven } from "../data/money.js";
import {
  CREDIT_MEMO_ACCOUNTS,
  CREDIT_MEMO_POLICY_SCHEMA_VERSION,
  isValidCreditMemoReason,
  type CreditMemoReason,
} from "../data/credit-memo-policy.js";

const LineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().finite().positive(),
  unitPrice: z.number().finite().nonnegative(),
  taxable: z.boolean().optional().default(true),
});
const CreditMemoInputSchema = z.object({
  creditMemoId: z.string().optional(),
  customerId: z.string().min(1),
  reason: z.string().min(1), // validated against CREDIT_MEMO_REASONS below (audit trail)
  lines: z.array(LineSchema).min(1),
  taxJurisdiction: z.string().optional(),
});
export type CreditMemoInput = z.input<typeof CreditMemoInputSchema>;

export interface CreditMemoLineResult {
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  /** quantity * unitPrice, half-even rounded to the cent. */
  extension: number;
}

/** A single application of credit against an invoice (audit trail for partial applications). */
export interface CreditApplication {
  invoiceId: string;
  /** the credit amount consumed by THIS application (≥ 0). */
  amount: number;
  /** the invoice balance AFTER this application. */
  invoiceBalanceAfter: number;
}

/** One side of a balanced GL posting (debit XOR credit is positive). */
export interface GLLine {
  account: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface CreditMemo {
  creditMemoId: string;
  customerId: string;
  reason: CreditMemoReason;
  lines: CreditMemoLineResult[];
  subtotal: number;
  taxJurisdiction: string | null;
  tax: number;
  total: number;
  /** applications recorded against invoices (immutable history — never mutated in place). */
  applications: CreditApplication[];
  /** total credit consumed so far == Σ applications.amount. */
  applied: number;
  /** credit still available to apply == total − applied (≥ 0). */
  unapplied: number;
  policySchemaVersion: string;
}

export class CreditMemoEngine {
  /**
   * Build a new credit memo (zero credit applied) with a reconciled subtotal/tax/total.
   *
   * @param input creditMemoId? + customerId + reason + lines[] + optional taxJurisdiction.
   * @returns the credit memo with `total == subtotal + tax`, `applied == 0`, `unapplied == total`.
   * @throws on an empty/invalid reason, an unknown tax jurisdiction, negative/NaN qty or unitPrice.
   */
  static create(input: CreditMemoInput): CreditMemo {
    const c = CreditMemoInputSchema.parse(input); // throws on negative/NaN qty or price, empty lines/customer

    if (!isValidCreditMemoReason(c.reason)) {
      // A reasonless credit memo is a silent revenue-reversal hole — fail loud (audit trail).
      throw new Error(
        `[credit-memo] unknown reason "${c.reason}" — must be one of the recognized CREDIT_MEMO_REASONS (return/price_adjustment/damaged_goods/overbilling/goodwill)`
      );
    }

    const lines: CreditMemoLineResult[] = c.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxable: l.taxable,
      extension: roundCentsHalfEven(l.quantity * l.unitPrice),
    }));
    const subtotal = roundCentsHalfEven(lines.reduce((s, l) => s + l.extension, 0));

    // Tax applies to the taxable portion of the subtotal. Compute via SalesUseTaxEngine whenever a
    // jurisdiction is given — even at a $0 taxable base — so a typo'd jurisdiction THROWS (a silent
    // 0% tax-reversal would under-reverse the original sale's liability).
    const taxableBase = roundCentsHalfEven(lines.filter((l) => l.taxable).reduce((s, l) => s + l.extension, 0));
    let tax = 0;
    if (c.taxJurisdiction) {
      tax = SalesUseTaxEngine.calcSalesTax({
        amount: taxableBase,
        jurisdiction: c.taxJurisdiction,
        reference: c.creditMemoId,
      }).tax;
    }

    const total = roundCentsHalfEven(subtotal + tax);
    if (total <= 0) {
      // A credit memo with no positive value cannot reverse anything — almost certainly a data error.
      throw new Error(`[credit-memo] credit memo total must be positive (got ${total}) — a $0/negative memo reverses nothing`);
    }

    return {
      creditMemoId: c.creditMemoId ?? `CM-${c.customerId}-${c.reason}`,
      customerId: c.customerId,
      reason: c.reason,
      lines,
      subtotal,
      taxJurisdiction: c.taxJurisdiction ?? null,
      tax,
      total,
      applications: [],
      applied: 0,
      unapplied: total,
      policySchemaVersion: CREDIT_MEMO_POLICY_SCHEMA_VERSION,
    };
  }

  /**
   * Apply some of a credit memo's available credit against an open invoice's balance, reducing the
   * invoice balance. Returns a NEW credit-memo object (immutable) with the application appended and
   * `applied`/`unapplied` re-reconciled — never mutates the input.
   *
   * Over-apply THROWS on BOTH ceilings (fail loud, no silent clamping):
   *   - `amount` must not exceed the credit memo's REMAINING (unapplied) credit, and
   *   - `amount` must not exceed the invoice's current balance.
   *
   * @param creditMemo the credit memo to draw credit from.
   * @param appl invoiceId + the invoice's current `invoiceBalance` + the `amount` of credit to apply.
   * @returns `{ creditMemo: <updated>, application }` — updated memo + the recorded application.
   * @throws on a non-finite/negative amount or balance, or an over-apply on either ceiling.
   */
  static applyToInvoice(
    creditMemo: CreditMemo,
    appl: { invoiceId: string; invoiceBalance: number; amount: number }
  ): { creditMemo: CreditMemo; application: CreditApplication } {
    if (!appl || typeof appl.invoiceId !== "string" || appl.invoiceId.length === 0) {
      throw new Error("[credit-memo] applyToInvoice: invoiceId is required");
    }
    if (!Number.isFinite(appl.amount)) throw new Error(`[credit-memo] applyToInvoice: non-finite amount ${appl.amount}`);
    if (!Number.isFinite(appl.invoiceBalance)) throw new Error(`[credit-memo] applyToInvoice: non-finite invoiceBalance ${appl.invoiceBalance}`);
    if (appl.amount <= 0) throw new Error(`[credit-memo] applyToInvoice: amount must be positive (got ${appl.amount})`);
    if (appl.invoiceBalance < 0) throw new Error(`[credit-memo] applyToInvoice: invoiceBalance must be non-negative (got ${appl.invoiceBalance})`);

    const amount = roundCentsHalfEven(appl.amount);
    const invoiceBalance = roundCentsHalfEven(appl.invoiceBalance);
    const remaining = creditMemo.unapplied;
    const EPS = 1e-9; // cent-level tolerance so an exact full apply (amount == remaining) is allowed

    // Ceiling 1: cannot apply more credit than the memo has left.
    if (amount - remaining > EPS) {
      throw new Error(
        `[credit-memo] over-apply: amount ${amount} exceeds remaining credit ${remaining} on credit memo ${creditMemo.creditMemoId}`
      );
    }
    // Ceiling 2: cannot credit an invoice more than it owes (would create a phantom negative balance).
    if (amount - invoiceBalance > EPS) {
      throw new Error(
        `[credit-memo] over-apply: amount ${amount} exceeds invoice ${appl.invoiceId} balance ${invoiceBalance}`
      );
    }

    const invoiceBalanceAfter = roundCentsHalfEven(invoiceBalance - amount);
    const application: CreditApplication = { invoiceId: appl.invoiceId, amount, invoiceBalanceAfter };

    const applications = [...creditMemo.applications, application];
    const applied = roundCentsHalfEven(creditMemo.applied + amount);
    const unapplied = roundCentsHalfEven(creditMemo.total - applied);
    if (unapplied < -EPS) {
      // Defensive: the two ceilings above make this unreachable, but never let the invariant slip silently.
      throw new Error(`[credit-memo] invariant violation: unapplied ${unapplied} < 0 after applying ${amount}`);
    }

    return {
      creditMemo: { ...creditMemo, applications, applied, unapplied: Math.max(0, unapplied) },
      application,
    };
  }

  /** The credit still available to apply on a memo (== total − Σ applied, ≥ 0). */
  static remainingCredit(creditMemo: CreditMemo): number {
    if (!creditMemo || !Number.isFinite(creditMemo.unapplied)) {
      throw new Error("[credit-memo] remainingCredit: invalid credit memo");
    }
    return creditMemo.unapplied;
  }

  /**
   * The GL effect a credit memo posts when issued (RETURNED as data — the engine stays pure; the caller
   * hands these lines to `GeneralLedgerEngine.createJournalEntry`). Reverses the original sale:
   *   DR 4000 Sales Revenue (contra) + DR 2100 Tax Payable / CR 1200 Accounts Receivable.
   * Σdebits == Σcredits == creditMemo.total (the balanced-posting invariant).
   *
   * @param creditMemo the credit memo whose issuance to post.
   * @returns balanced GL lines + the verified debit/credit totals.
   * @throws if the lines fail to balance (defensive — should never happen for a well-formed memo).
   */
  static glLinesForIssue(creditMemo: CreditMemo): { lines: GLLine[]; totalDebit: number; totalCredit: number } {
    const { SALES_REVENUE, TAX_PAYABLE, ACCOUNTS_RECEIVABLE } = CREDIT_MEMO_ACCOUNTS;
    const revenueReversal = roundCentsHalfEven(creditMemo.subtotal);
    const taxReversal = roundCentsHalfEven(creditMemo.tax);
    const arCredit = roundCentsHalfEven(creditMemo.total);

    const lines: GLLine[] = [
      { account: SALES_REVENUE.number, accountName: SALES_REVENUE.name, debit: revenueReversal, credit: 0 },
      { account: TAX_PAYABLE.number, accountName: TAX_PAYABLE.name, debit: taxReversal, credit: 0 },
      { account: ACCOUNTS_RECEIVABLE.number, accountName: ACCOUNTS_RECEIVABLE.name, debit: 0, credit: arCredit },
    ];

    const totalDebit = roundCentsHalfEven(lines.reduce((s, l) => s + l.debit, 0));
    const totalCredit = roundCentsHalfEven(lines.reduce((s, l) => s + l.credit, 0));
    if (Math.abs(totalDebit - totalCredit) > 1e-9) {
      throw new Error(`[credit-memo] GL posting does not balance: Σdebits ${totalDebit} != Σcredits ${totalCredit} (credit memo ${creditMemo.creditMemoId})`);
    }
    return { lines, totalDebit, totalCredit };
  }
}

export const creditMemoEngine = CreditMemoEngine;
