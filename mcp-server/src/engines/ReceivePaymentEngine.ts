/**
 * ReceivePaymentEngine — customer cash-application for the PRISM ERP (galaxy:business, slot:hotel).
 *
 * QuickBooks-parity: the "Receive Payment" function (apply a customer payment against open invoices).
 * QB-PARITY Phase-2 engine #4 of the A/R revenue cycle
 * (Estimate → SalesOrder → CreditMemo → ReceivePayment → Statement → Dunning, roadmap task #18).
 *
 * Producer / PRISM synergy:
 *   - Shop-ops A/R cycle: an invoice is BORN from an accepted estimate (EstimateEngine.toSalesOrder →
 *     BillingEngine invoice → GeneralLedgerEngine.recordInvoice DR1200/CR4000[/CR2100]). A customer
 *     payment then arrives and THIS engine applies it across those open invoices, relieving AR and
 *     parking any over-payment as a customer credit. The applied lines feed
 *     GeneralLedgerEngine.recordPayment (DR1000 Cash / CR1200 AR).
 *   - Networking-platform order/payment flow (business/PRISM-NETWORKING-PLATFORM-PLAN.md): the same
 *     cash-application math settles a buyer's payment against the marketplace order invoices — the
 *     platform is just a second producer of the {payment, openInvoices} pair this engine consumes.
 *
 * Financial-invariant compliance (business/GSD.md §2.1, [[feedback_hotel_financial_invariant_gate]]):
 *   - account numbers / policy IMPORTED from data/cash-application-accounts.ts, never inlined.
 *   - half-even (banker's) rounding to the cent — REUSES roundCentsHalfEven (shared money util) from the shared money util src/data/money.ts.
 *   - Σapplied + unappliedCredit === payment.amount EXACTLY (reconciled BOTH ways; THROWS otherwise).
 *   - per-invoice amountApplied ≤ that invoice's open balance (over-apply THROWS — never silently caps).
 *   - non-finite / NaN / negative amounts THROW (never silently coerce to 0).
 *   - the RETURNED GL lines balance: Σdebits === Σcredits (DR Cash == CR AR + CR Customer Credits).
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wire receive_payment_apply / receive_payment_gl_lines in main post golf-merge. Wiring + golf-merging
// the stale worktree businessDispatcher.ts would CLOBBER ~438 main actions (regression). Tracked in
// business/QUICKBOOKS-PARITY-PLAN.md §Status.
import { z } from "zod";
import { roundCentsHalfEven } from "../data/money.js";
import {
  CASH_ACCOUNT,
  ACCOUNTS_RECEIVABLE_ACCOUNT,
  CUSTOMER_CREDITS_ACCOUNT,
  MONEY_RECONCILE_TOLERANCE,
} from "../data/cash-application-accounts.js";

// ============================================================================
// SCHEMAS
// ============================================================================

const PaymentSchema = z.object({
  paymentId: z.string().min(1),
  customerId: z.string().min(1),
  amount: z.number().finite().positive(), // a receipt of $0 or negative is not a payment
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  method: z.enum(["check", "ach", "card", "wire", "cash", "other"]).default("other"),
});
export type PaymentInput = z.input<typeof PaymentSchema>;

const OpenInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
  balance: z.number().finite().positive(), // a fully-paid (0) or credit (<0) invoice is not "open"
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invoice date must be YYYY-MM-DD"),
});
export type OpenInvoiceInput = z.infer<typeof OpenInvoiceSchema>;

const AllocationSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().finite().nonnegative(), // explicit per-invoice amount; 0 = leave untouched
});
export type AllocationInput = z.infer<typeof AllocationSchema>;

const OptsSchema = z.object({
  strategy: z.enum(["oldest-first", "specified"]).default("oldest-first"),
  allocations: z.array(AllocationSchema).optional(),
});
export type ApplyOptsInput = z.input<typeof OptsSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface AppliedLine {
  invoiceId: string;
  amountApplied: number; // rounded to the cent (half-even)
  newBalance: number;    // invoice balance after this application, rounded to the cent
}

/** A single double-entry GL line the cash-application would post. */
export interface GlLine {
  account: string;     // GL account number
  accountName: string;
  debit: number;       // ≥ 0
  credit: number;      // ≥ 0
  description: string;
}

export interface ReceivePaymentResult {
  paymentId: string;
  customerId: string;
  date: string;
  method: string;
  paymentAmount: number;              // echo of the rounded receipt
  applied: AppliedLine[];             // per-invoice application (only non-zero applications)
  totalApplied: number;               // Σ applied.amountApplied
  unappliedCredit: number;            // remainder parked as a customer credit (≥ 0)
  fullyApplied: boolean;              // true iff unappliedCredit === 0
  strategy: "oldest-first" | "specified";
  /**
   * The balanced double-entry the receipt posts (RETURNED as data, not posted here — keeps the
   * engine pure + testable). DR 1000 Cash / CR 1200 AR (Σapplied) [+ CR 2150 Customer Credits
   * (unappliedCredit)]. Σdebits === Σcredits by construction.
   */
  glLines: GlLine[];
}

// ============================================================================
// ENGINE
// ============================================================================

class ReceivePaymentEngine {
  /**
   * Apply a customer payment across their open invoices (QuickBooks "Receive Payment").
   *
   * Strategies:
   *   - "oldest-first" (default): sort open invoices by invoice date ascending and fill sequentially
   *     until the payment is exhausted. A short payment leaves later invoices untouched and partials
   *     the oldest unfilled one; an over-payment leaves an `unappliedCredit`.
   *   - "specified": apply exactly the caller's `opts.allocations` (each ≤ that invoice's balance);
   *     any payment not allocated becomes `unappliedCredit`.
   *
   * Invariants (all enforced, THROW on violation — fail loud, never silently coerce):
   *   - payment.amount, every invoice balance and every allocation must be finite (NaN/Infinity THROW).
   *   - amount > 0, balances > 0; negative inputs THROW.
   *   - per-invoice amountApplied ≤ that invoice's open balance (over-apply THROWS).
   *   - Σ(amountApplied) ≤ payment.amount (over-allocate THROWS).
   *   - Σapplied + unappliedCredit === payment.amount EXACTLY, checked from BOTH sides.
   *   - the returned GL lines balance: Σdebits === Σcredits.
   *
   * @param payment    {paymentId, customerId, amount, date(YYYY-MM-DD), method}.
   * @param openInvoices array of {invoiceId, balance, date(YYYY-MM-DD)} — the customer's open A/R.
   * @param opts       {strategy, allocations?}. Defaults to oldest-first.
   * @returns {@link ReceivePaymentResult} — applied lines, unappliedCredit, fullyApplied, GL lines.
   */
  static applyPayment(
    payment: PaymentInput,
    openInvoices: OpenInvoiceInput[],
    opts: ApplyOptsInput = {},
  ): ReceivePaymentResult {
    const p = PaymentSchema.parse(payment);
    const o = OptsSchema.parse(opts);

    if (!Array.isArray(openInvoices)) {
      throw new Error(`[receive-payment] openInvoices must be an array (payment ${p.paymentId})`);
    }
    const invoices = openInvoices.map((inv) => OpenInvoiceSchema.parse(inv));

    // Guard against duplicate invoice ids — an ambiguous open set would let a single
    // balance be relieved twice. Surface it loudly rather than apply non-deterministically.
    const seen = new Set<string>();
    for (const inv of invoices) {
      if (seen.has(inv.invoiceId)) {
        throw new Error(`[receive-payment] duplicate invoiceId '${inv.invoiceId}' in open invoices (payment ${p.paymentId})`);
      }
      seen.add(inv.invoiceId);
    }

    const paymentAmount = roundCentsHalfEven(p.amount);

    // Working balance map (rounded basis) keyed by invoiceId.
    const balanceById = new Map<string, number>();
    for (const inv of invoices) balanceById.set(inv.invoiceId, roundCentsHalfEven(inv.balance));

    const applied: AppliedLine[] =
      o.strategy === "specified"
        ? ReceivePaymentEngine.applySpecified(p.paymentId, paymentAmount, balanceById, o.allocations)
        : ReceivePaymentEngine.applyOldestFirst(paymentAmount, invoices, balanceById);

    // ----- Reconciliation (both ways, exact to the cent) ---------------------
    const totalApplied = roundCentsHalfEven(applied.reduce((s, a) => s + a.amountApplied, 0));

    // Forward: Σapplied must never exceed the payment.
    if (totalApplied - paymentAmount > MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `[receive-payment] over-applied: Σapplied ${totalApplied.toFixed(2)} exceeds payment ` +
          `${paymentAmount.toFixed(2)} (payment ${p.paymentId})`,
      );
    }

    const unappliedCredit = roundCentsHalfEven(paymentAmount - totalApplied);
    if (unappliedCredit < -MONEY_RECONCILE_TOLERANCE) {
      // unreachable given the check above, but a defensive fail-loud guard against a rounding seam.
      throw new Error(`[receive-payment] negative unapplied credit ${unappliedCredit} (payment ${p.paymentId})`);
    }

    // Reverse: applied + unapplied must reconstruct the payment EXACTLY.
    const reconstructed = roundCentsHalfEven(totalApplied + unappliedCredit);
    if (Math.abs(reconstructed - paymentAmount) > MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `[receive-payment] reconciliation failed: applied ${totalApplied.toFixed(2)} + unapplied ` +
          `${unappliedCredit.toFixed(2)} = ${reconstructed.toFixed(2)} != payment ${paymentAmount.toFixed(2)} ` +
          `(payment ${p.paymentId})`,
      );
    }

    const glLines = ReceivePaymentEngine.buildGlLines(p.paymentId, paymentAmount, totalApplied, unappliedCredit);

    return {
      paymentId: p.paymentId,
      customerId: p.customerId,
      date: p.date,
      method: p.method,
      paymentAmount,
      applied,
      totalApplied,
      unappliedCredit,
      fullyApplied: unappliedCredit === 0,
      strategy: o.strategy,
      glLines,
    };
  }

  // --------------------------------------------------------------------------
  // STRATEGIES
  // --------------------------------------------------------------------------

  /**
   * Oldest-first sequential fill: sort by invoice date ascending (ties broken by invoiceId for a
   * deterministic order) and consume the payment invoice-by-invoice. The last partially-filled
   * invoice gets the remainder; remaining payment after all invoices is the caller's unapplied credit.
   */
  private static applyOldestFirst(
    paymentAmount: number,
    invoices: OpenInvoiceInput[],
    balanceById: Map<string, number>,
  ): AppliedLine[] {
    const ordered = [...invoices].sort((a, b) =>
      a.date === b.date ? a.invoiceId.localeCompare(b.invoiceId) : a.date.localeCompare(b.date),
    );

    const applied: AppliedLine[] = [];
    let remaining = paymentAmount;

    for (const inv of ordered) {
      if (remaining <= 0) break;
      const balance = balanceById.get(inv.invoiceId)!;
      const amountApplied = roundCentsHalfEven(Math.min(remaining, balance));
      if (amountApplied <= 0) continue;
      const newBalance = roundCentsHalfEven(balance - amountApplied);
      applied.push({ invoiceId: inv.invoiceId, amountApplied, newBalance });
      remaining = roundCentsHalfEven(remaining - amountApplied);
    }
    return applied;
  }

  /**
   * Specified allocation: apply exactly the caller's per-invoice amounts. Each allocation invoice
   * must exist in the open set and its amount must not exceed the invoice's balance (over-apply
   * THROWS). Σ allocations must not exceed the payment (over-allocate THROWS). Zero allocations are
   * dropped (an invoice left untouched does not emit an applied line).
   */
  private static applySpecified(
    paymentId: string,
    paymentAmount: number,
    balanceById: Map<string, number>,
    allocations: AllocationInput[] | undefined,
  ): AppliedLine[] {
    if (!allocations || allocations.length === 0) {
      throw new Error(`[receive-payment] strategy "specified" requires a non-empty opts.allocations (payment ${paymentId})`);
    }

    // Reject duplicate allocation targets — two allocations against one invoice would let the
    // per-invoice ≤ balance guard pass individually while jointly over-relieving the balance.
    const allocSeen = new Set<string>();
    let allocTotal = 0;
    const applied: AppliedLine[] = [];

    for (const alloc of allocations) {
      if (allocSeen.has(alloc.invoiceId)) {
        throw new Error(`[receive-payment] duplicate allocation for invoice '${alloc.invoiceId}' (payment ${paymentId})`);
      }
      allocSeen.add(alloc.invoiceId);

      if (!balanceById.has(alloc.invoiceId)) {
        throw new Error(
          `[receive-payment] allocation targets invoice '${alloc.invoiceId}' which is not in the open invoice set (payment ${paymentId})`,
        );
      }
      const balance = balanceById.get(alloc.invoiceId)!;
      const amountApplied = roundCentsHalfEven(alloc.amount);

      if (amountApplied > balance + MONEY_RECONCILE_TOLERANCE) {
        throw new Error(
          `[receive-payment] over-apply: allocation ${amountApplied.toFixed(2)} exceeds invoice ` +
            `'${alloc.invoiceId}' balance ${balance.toFixed(2)} (payment ${paymentId})`,
        );
      }

      allocTotal = roundCentsHalfEven(allocTotal + amountApplied);
      if (amountApplied <= 0) continue; // a zero allocation leaves the invoice untouched
      applied.push({
        invoiceId: alloc.invoiceId,
        amountApplied,
        newBalance: roundCentsHalfEven(balance - amountApplied),
      });
    }

    if (allocTotal > paymentAmount + MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `[receive-payment] over-allocate: Σallocations ${allocTotal.toFixed(2)} exceeds payment ` +
          `${paymentAmount.toFixed(2)} (payment ${paymentId})`,
      );
    }
    return applied;
  }

  // --------------------------------------------------------------------------
  // GL
  // --------------------------------------------------------------------------

  /**
   * Build the balanced double-entry for the receipt (returned as data):
   *   DR 1000 Cash                       (paymentAmount)
   *   CR 1200 Accounts Receivable        (totalApplied)        — omitted if 0
   *   CR 2150 Customer Credits (Unapplied)(unappliedCredit)    — omitted if 0
   * Σdebits === Σcredits by construction (paymentAmount === totalApplied + unappliedCredit, already
   * reconciled). Re-validated here as a defence-in-depth balance check before returning.
   */
  private static buildGlLines(
    paymentId: string,
    paymentAmount: number,
    totalApplied: number,
    unappliedCredit: number,
  ): GlLine[] {
    const lines: GlLine[] = [
      {
        account: CASH_ACCOUNT.number,
        accountName: CASH_ACCOUNT.name,
        debit: paymentAmount,
        credit: 0,
        description: `Payment ${paymentId} received`,
      },
    ];
    if (totalApplied > 0) {
      lines.push({
        account: ACCOUNTS_RECEIVABLE_ACCOUNT.number,
        accountName: ACCOUNTS_RECEIVABLE_ACCOUNT.name,
        debit: 0,
        credit: totalApplied,
        description: `Payment ${paymentId} applied to A/R`,
      });
    }
    if (unappliedCredit > 0) {
      lines.push({
        account: CUSTOMER_CREDITS_ACCOUNT.number,
        accountName: CUSTOMER_CREDITS_ACCOUNT.name,
        debit: 0,
        credit: unappliedCredit,
        description: `Payment ${paymentId} unapplied — customer credit`,
      });
    }

    const debitTotal = roundCentsHalfEven(lines.reduce((s, l) => s + l.debit, 0));
    const creditTotal = roundCentsHalfEven(lines.reduce((s, l) => s + l.credit, 0));
    if (Math.abs(debitTotal - creditTotal) > MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `[receive-payment] GL entry unbalanced: Σdebits ${debitTotal.toFixed(2)} != Σcredits ` +
          `${creditTotal.toFixed(2)} (payment ${paymentId})`,
      );
    }
    return lines;
  }
}

export const receivePaymentEngine = ReceivePaymentEngine;
export { ReceivePaymentEngine };
