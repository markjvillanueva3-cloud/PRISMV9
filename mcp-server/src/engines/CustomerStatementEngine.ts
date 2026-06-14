/**
 * CustomerStatementEngine — QuickBooks "Customer Statement" parity for the PRISM ERP
 * (galaxy:business, slot:hotel). QB-PARITY Phase-2 #5.
 *
 * Producer of a customer's invoice/payment/credit history over a period: given an opening balance
 * and a list of transactions, it emits a running-balance statement (open-item OR balance-forward),
 * a closing balance, and a 4-bucket A/R aging schedule. This is a READ-MODEL — it posts NOTHING to
 * the GL (the invoices/payments it summarizes were already posted by BillingEngine →
 * GeneralLedgerEngine.recordInvoice / recordPayment). It can RETURN the GL control-account view the
 * statement reconciles against (DR/CR on 1200 Accounts Receivable) as data, for audit reconciliation.
 *
 * PRISM synergy (business/PRISM-NETWORKING-PLATFORM-PLAN.md + QUICKBOOKS-PARITY-PLAN.md): the
 * statement is fed by the SAME A/R event stream from BOTH surfaces —
 *   1. the QuickBooks A/R cycle: EstimateEngine.toSalesOrder → BillingEngine invoice (DR1200 AR) →
 *      ReceivePaymentEngine payment (CR1200 AR) → CreditMemoEngine credit (CR1200 AR), and
 *   2. the networking-platform order/payment flow: a platform order → invoice → buyer payment.
 * Both producers emit {type:'invoice'|'payment'|'credit', date, amount, refId} rows; this engine is
 * the single statement renderer for both, so a customer sees one unified A/R position.
 *
 * Financial-invariant compliance (business/GSD.md §2.1, [[feedback_hotel_financial_invariant_gate]]):
 *  - aging boundaries + the A/R account number are IMPORTED from ar-statement-policy.ts, never inlined.
 *  - half-even (banker's) rounding to the cent — REUSES roundCentsHalfEven (shared money util) from the shared money util src/data/money.ts.
 *  - closingBalance reconciles BOTH ways: opening + Σinvoices − Σpayments − Σcredits, AND the running
 *    line balance must land on the same cent (THROW on drift — statement integrity).
 *  - aging buckets MUST sum to the closing balance (THROW — A/R aging integrity).
 *  - non-finite / NaN amounts, negative magnitudes, unknown txn types THROW (never silently coerce).
 *  - a negative closing (customer credit balance) IS allowed — that is a real A/R credit position.
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wire customer_statement_generate (and the open-item/balance-forward variants) in main post golf-merge.
// Wiring the stale worktree businessDispatcher.ts here would clobber ~438 main actions (regression).
import { z } from "zod";
import { roundCentsHalfEven } from "../data/money.js";
import {
  AR_AGING_BUCKET_DAYS,
  ACCOUNTS_RECEIVABLE_ACCOUNT,
  AR_STATEMENT_POLICY_SCHEMA_VERSION,
  type StatementMode,
} from "../data/ar-statement-policy.js";

/** A single A/R transaction row from either producer (QB cycle or networking platform). */
const StatementTxnSchema = z.object({
  type: z.enum(["invoice", "payment", "credit"]),
  /** ISO date YYYY-MM-DD; lexicographic compare is chronological for this format. */
  date: z.string().min(10),
  /** POSITIVE magnitude — sign is implied by `type` (invoice +, payment −, credit −). Negative throws. */
  amount: z.number().finite(),
  /** invoice/payment/credit-memo id for the audit trail + open-item application. */
  refId: z.string().min(1),
});
export type StatementTxn = z.input<typeof StatementTxnSchema>;

const GenerateInputSchema = z.object({
  customerId: z.string().min(1),
  periodStart: z.string().min(10),
  periodEnd: z.string().min(10),
  openingBalance: z.number().finite(),
  transactions: z.array(StatementTxnSchema),
});
export type GenerateInput = z.input<typeof GenerateInputSchema>;

const GenerateOptsSchema = z.object({
  mode: z.enum(["open-item", "balance-forward"]).default("open-item"),
  /** statement "as of" date for aging; defaults to periodEnd. ISO YYYY-MM-DD. */
  asOf: z.string().min(10).optional(),
});
export type GenerateOpts = z.input<typeof GenerateOptsSchema>;

/** A rendered statement line (running balance after this txn is applied). */
export interface StatementLine {
  date: string;
  type: "invoice" | "payment" | "credit";
  refId: string;
  /** signed delta applied to the balance: invoice +, payment −, credit −. */
  charge: number;
  /** running customer balance after this line (banker's-rounded to the cent). */
  balance: number;
}

export interface AgingBuckets {
  /** open invoice charges aged ≤ current-boundary days as of asOf. */
  current: number;
  /** open invoice charges aged > current and ≤ d30-boundary. */
  d30: number;
  /** open invoice charges aged > d30 and ≤ d60-boundary. */
  d60: number;
  /** open invoice charges aged > d60-boundary. */
  d90plus: number;
}

export interface CustomerStatement {
  customerId: string;
  periodStart: string;
  periodEnd: string;
  asOf: string;
  mode: StatementMode;
  openingBalance: number;
  lines: StatementLine[];
  closingBalance: number;
  aging: AgingBuckets;
  /** counts of in-window txns by type (out-of-window rows are excluded). */
  activity: { invoices: number; payments: number; credits: number; excludedOutOfWindow: number };
  /** GL control-account view the statement reconciles against (data only — NOT posted here). */
  glReconciliation: {
    account: string;
    accountName: string;
    debits: number; // Σ invoices in window (AR debits)
    credits: number; // Σ payments + credits in window (AR credits)
    netActivity: number; // debits − credits
  };
  policySchemaVersion: string;
  caveat: string;
}

/** cents tolerance for reconciliation (< half a cent — defends against fp residue, not real drift). */
const RECON_EPS = 0.005;

export class CustomerStatementEngine {
  /**
   * Generate a customer statement over a period.
   * @param input customerId + period window + opening balance + the A/R transaction history.
   * @param opts  mode ('open-item' | 'balance-forward') + optional aging `asOf` (defaults to periodEnd).
   * @returns the rendered statement: opening, running lines, closing, and 4-bucket aging.
   * @throws on non-finite/negative amounts, unknown txn types, an inverted period window, or any
   *         reconciliation/aging-integrity violation (fail loud — never emit a wrong statement).
   */
  static generate(input: GenerateInput, opts: GenerateOpts = {}): CustomerStatement {
    const parsed = GenerateInputSchema.parse(input); // throws on NaN/Infinity/missing/bad-type
    const o = GenerateOptsSchema.parse(opts);
    const mode = o.mode;
    const asOf = o.asOf ?? parsed.periodEnd;

    if (parsed.periodEnd < parsed.periodStart) {
      throw new Error(`[statement] inverted period window: periodEnd ${parsed.periodEnd} < periodStart ${parsed.periodStart}`);
    }
    if (asOf < parsed.periodStart) {
      throw new Error(`[statement] asOf ${asOf} precedes periodStart ${parsed.periodStart} — cannot age against a date before the window opens`);
    }

    const opening = roundCentsHalfEven(parsed.openingBalance);

    // --- in-window filter + per-row validation ----------------------------------------------
    let excludedOutOfWindow = 0;
    const inWindow: Array<{ type: StatementTxn["type"]; date: string; amount: number; refId: string }> = [];
    for (const t of parsed.transactions) {
      // amount is a MAGNITUDE: sign comes from `type`. A negative magnitude is ambiguous → throw.
      if (t.amount < 0) {
        throw new Error(`[statement] transaction ${t.refId} (${t.type}) has a negative amount ${t.amount} — provide a positive magnitude; sign is implied by type`);
      }
      if (t.date < parsed.periodStart || t.date > parsed.periodEnd) {
        excludedOutOfWindow += 1;
        continue;
      }
      inWindow.push({ type: t.type, date: t.date, amount: roundCentsHalfEven(t.amount), refId: t.refId });
    }

    // --- deterministic ordering: chronological, then a stable tiebreak by type then refId -----
    const TYPE_ORDER: Record<StatementTxn["type"], number> = { invoice: 0, credit: 1, payment: 2 };
    inWindow.sort((a, b) =>
      a.date !== b.date ? (a.date < b.date ? -1 : 1)
        : TYPE_ORDER[a.type] !== TYPE_ORDER[b.type] ? TYPE_ORDER[a.type] - TYPE_ORDER[b.type]
          : a.refId < b.refId ? -1 : a.refId > b.refId ? 1 : 0
    );

    // --- running statement lines --------------------------------------------------------------
    // balance-forward folds the opening into the first running balance the same way open-item does;
    // both modes produce identical math here. The mode differs in PRESENTATION (open-item lists each
    // open invoice individually for application; balance-forward carries a single forward balance) —
    // we expose `mode` and (for open-item) keep per-invoice refIds in the lines for downstream
    // application, while balance-forward consumers read only opening/closing + the forward roll.
    const lines: StatementLine[] = [];
    let running = opening;
    let sumInvoices = 0;
    let sumPayments = 0;
    let sumCredits = 0;
    let invoices = 0, payments = 0, credits = 0;

    for (const t of inWindow) {
      let charge: number;
      switch (t.type) {
        case "invoice":
          charge = t.amount; sumInvoices = roundCentsHalfEven(sumInvoices + t.amount); invoices += 1; break;
        case "payment":
          charge = -t.amount; sumPayments = roundCentsHalfEven(sumPayments + t.amount); payments += 1; break;
        case "credit":
          charge = -t.amount; sumCredits = roundCentsHalfEven(sumCredits + t.amount); credits += 1; break;
        default:
          // unreachable (zod-validated) but fail loud rather than silently skip an unknown row
          throw new Error(`[statement] unknown transaction type "${(t as { type: string }).type}" for ref ${t.refId}`);
      }
      running = roundCentsHalfEven(running + charge);
      lines.push({ date: t.date, type: t.type, refId: t.refId, charge, balance: running });
    }

    const closingByLines = running;
    const closingByActivity = roundCentsHalfEven(opening + sumInvoices - sumPayments - sumCredits);

    // INVARIANT 1 — closing reconciles BOTH ways (running lines vs opening+activity).
    if (Math.abs(closingByLines - closingByActivity) > RECON_EPS) {
      throw new Error(
        `[statement] closing reconciliation drift: running lines = ${closingByLines.toFixed(2)} but ` +
          `opening+Σinv−Σpay−Σcredit = ${closingByActivity.toFixed(2)} (Δ=${(closingByLines - closingByActivity).toFixed(4)})`
      );
    }
    const closingBalance = closingByActivity;

    // --- aging: bucket each OPEN invoice charge against asOf -----------------------------------
    // Payments + credits are applied FIFO against the oldest open invoices first (standard A/R
    // application), then the still-open invoice remainders are aged. This keeps Σbuckets == closing
    // (invoice-derived A/R only); a net credit balance (closing < 0) lands in `current` as a
    // negative (the customer's credit is a current liability of ours, not aged debt).
    const aging = CustomerStatementEngine.#computeAging(inWindow, opening, closingBalance, asOf);

    // INVARIANT 2 — aging buckets sum to the closing balance (A/R aging integrity).
    const bucketSum = roundCentsHalfEven(aging.current + aging.d30 + aging.d60 + aging.d90plus);
    if (Math.abs(bucketSum - closingBalance) > RECON_EPS) {
      throw new Error(
        `[statement] aging integrity violation: buckets sum to ${bucketSum.toFixed(2)} but closing balance is ` +
          `${closingBalance.toFixed(2)} (Δ=${(bucketSum - closingBalance).toFixed(4)}) — A/R aging must reconcile to the statement total`
      );
    }

    return {
      customerId: parsed.customerId,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      asOf,
      mode,
      openingBalance: opening,
      lines,
      closingBalance,
      aging,
      activity: { invoices, payments, credits, excludedOutOfWindow },
      glReconciliation: {
        account: ACCOUNTS_RECEIVABLE_ACCOUNT.number,
        accountName: ACCOUNTS_RECEIVABLE_ACCOUNT.name,
        debits: sumInvoices,
        credits: roundCentsHalfEven(sumPayments + sumCredits),
        netActivity: roundCentsHalfEven(sumInvoices - sumPayments - sumCredits),
      },
      policySchemaVersion: AR_STATEMENT_POLICY_SCHEMA_VERSION,
      caveat:
        "aging applies payments/credits FIFO against oldest open invoices; reconcile open-item application against actual cash-receipt matching before dunning",
    };
  }

  /**
   * Age the closing A/R balance into 4 buckets by applying in-window payments + credits FIFO
   * (oldest-invoice-first) plus the opening balance, then bucketing the surviving invoice remainders
   * by age relative to `asOf`. Returns buckets that sum to `closingBalance`.
   */
  static #computeAging(
    inWindow: Array<{ type: StatementTxn["type"]; date: string; amount: number; refId: string }>,
    opening: number,
    closingBalance: number,
    asOf: string
  ): AgingBuckets {
    const buckets: AgingBuckets = { current: 0, d30: 0, d60: 0, d90plus: 0 };

    // A net credit / non-positive closing balance is not "aged debt" — it is a current customer
    // credit. Park the whole (possibly negative) closing in `current` so Σbuckets == closing exactly.
    if (closingBalance <= 0) {
      buckets.current = closingBalance;
      return buckets;
    }

    // Build the open-invoice queue oldest-first. The opening balance is treated as the single oldest
    // open item (dated asOf − ∞), so it ages into d90plus unless fully paid off by FIFO credits.
    type Open = { remaining: number; date: string | null }; // date=null → opening (oldest)
    const queue: Open[] = [];
    if (opening > 0) queue.push({ remaining: opening, date: null });
    const invoicesAsc = inWindow.filter((t) => t.type === "invoice").sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    for (const inv of invoicesAsc) queue.push({ remaining: inv.amount, date: inv.date });

    // FIFO-apply total payments + credits against the oldest open items.
    let toApply = inWindow.reduce((s, t) => (t.type === "payment" || t.type === "credit" ? roundCentsHalfEven(s + t.amount) : s), 0);
    for (const item of queue) {
      if (toApply <= 0) break;
      const applied = Math.min(item.remaining, toApply);
      item.remaining = roundCentsHalfEven(item.remaining - applied);
      toApply = roundCentsHalfEven(toApply - applied);
    }
    // NOTE: if an opening credit balance existed (opening<0) it was handled by the closing<=0 branch
    // when it dominated; otherwise opening>0 already seeded the queue. If credits exceed all open
    // invoices the surplus would have driven closing<=0 (handled above), so toApply is exhausted here.

    // Bucket the surviving remainders by age = asOf − itemDate (days).
    for (const item of queue) {
      if (item.remaining <= 0) continue;
      const ageDays = item.date === null
        ? Number.POSITIVE_INFINITY // opening balance is the oldest → d90plus
        : CustomerStatementEngine.#dayDiff(item.date, asOf);
      if (ageDays <= AR_AGING_BUCKET_DAYS.current) buckets.current = roundCentsHalfEven(buckets.current + item.remaining);
      else if (ageDays <= AR_AGING_BUCKET_DAYS.d30) buckets.d30 = roundCentsHalfEven(buckets.d30 + item.remaining);
      else if (ageDays <= AR_AGING_BUCKET_DAYS.d60) buckets.d60 = roundCentsHalfEven(buckets.d60 + item.remaining);
      else buckets.d90plus = roundCentsHalfEven(buckets.d90plus + item.remaining);
    }
    return buckets;
  }

  /** Whole-day difference (later − earlier) for ISO YYYY-MM-DD dates. Throws on an unparseable date. */
  static #dayDiff(earlierISO: string, laterISO: string): number {
    const a = Date.parse(`${earlierISO}T00:00:00Z`);
    const b = Date.parse(`${laterISO}T00:00:00Z`);
    if (!Number.isFinite(a)) throw new Error(`[statement] unparseable date "${earlierISO}"`);
    if (!Number.isFinite(b)) throw new Error(`[statement] unparseable date "${laterISO}"`);
    return Math.round((b - a) / 86_400_000);
  }
}

export const customerStatementEngine = CustomerStatementEngine;
