/**
 * BillPaymentCheckRunEngine — vendor bill-payment / check-run for the PRISM ERP
 * (galaxy:business, slot:hotel).
 *
 * QuickBooks-parity: the "Pay Bills" / check-run function (QB-PARITY Phase-3 A/P #2). It is the
 * A/P MIRROR of ReceivePaymentEngine: where ReceivePayment applies a customer's cash receipt
 * across open A/R invoices (DR Cash / CR AR), this engine disburses the shop's cash across open
 * A/P bills (DR Accounts Payable / CR Cash) and groups the disbursement into one check per vendor.
 *
 * Producer / PRISM synergy:
 *   - Shop-ops A/P cycle: a bill is BORN when GeneralLedgerEngine.recordPurchase posts
 *     DR<expense/asset>/CR 2000 AP (vendor bill creation — raw material, tooling, services). THIS
 *     engine is the second leg of that cycle: a vendor disbursement run selects open bills (oldest
 *     due-date-first, or an exact specified allocation), pays them down up to an optional cash
 *     limit, relieves the payable, and cuts ONE check (or ACH/wire) per vendor aggregating that
 *     vendor's paid bills. The returned GL lines feed a future GeneralLedgerEngine vendor-payment
 *     recorder (DR 2000 AP / CR 1000 Cash).
 *   - Networking-platform vendor/payout flow (business/PRISM-NETWORKING-PLATFORM-PLAN.md): the same
 *     disbursement math settles a marketplace seller payout against accrued platform obligations —
 *     the platform is just a second producer of the {disbursement-run, openBills} pair this engine
 *     consumes, with the per-vendor check aggregation becoming a per-seller payout batch.
 *
 * Financial-invariant compliance (business/GSD.md §2.1, [[feedback_hotel_financial_invariant_gate]]):
 *   - account numbers / policy IMPORTED from data/bill-payment-accounts.ts, never inlined.
 *   - half-even (banker's) rounding to the cent — REUSES roundCentsHalfEven (shared money util) from the shared money util src/data/money.ts.
 *   - per-bill amountPaid ≤ that bill's open balance (over-pay THROWS — never silently caps).
 *   - Σpaid reconciles to the run BOTH ways: Σpaid + unusedFunds === runFunds (when a cash limit is
 *     given) / Σchecks === Σpaid (always); THROWS otherwise.
 *   - one check PER VENDOR aggregating that vendor's paid bills (Σ check amounts === totalPaid).
 *   - non-finite / NaN / negative amounts THROW (never silently coerce to 0).
 *   - the RETURNED GL lines balance: Σdebits === Σcredits (DR 2000 AP == CR 1000 Cash == totalPaid).
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wire bill_payment_pay_bills / bill_payment_gl_lines in main post golf-merge. Wiring + golf-merging
// the stale worktree businessDispatcher.ts would CLOBBER ~438 main actions (regression). Tracked in
// business/QUICKBOOKS-PARITY-PLAN.md §Status.
import { z } from "zod";
import { roundCentsHalfEven } from "../data/money.js";
import {
  ACCOUNTS_PAYABLE_ACCOUNT,
  CASH_ACCOUNT,
  MONEY_RECONCILE_TOLERANCE,
} from "../data/bill-payment-accounts.js";

// ============================================================================
// SCHEMAS
// ============================================================================

const RunSchema = z.object({
  runId: z.string().min(1),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "paymentDate must be YYYY-MM-DD"),
  method: z.enum(["check", "ach", "wire"]).default("check"),
});
export type PaymentRunInput = z.input<typeof RunSchema>;

const OpenBillSchema = z.object({
  billId: z.string().min(1),
  vendorId: z.string().min(1),
  balance: z.number().finite().positive(), // a fully-paid (0) or credit (<0) bill is not "open"
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "bill dueDate must be YYYY-MM-DD"),
});
export type OpenBillInput = z.infer<typeof OpenBillSchema>;

const AllocationSchema = z.object({
  billId: z.string().min(1),
  amount: z.number().finite().nonnegative(), // explicit per-bill amount; 0 = leave untouched
});
export type AllocationInput = z.infer<typeof AllocationSchema>;

const OptsSchema = z.object({
  strategy: z.enum(["due-date-first", "specified"]).default("due-date-first"),
  /**
   * Exact per-bill amounts to disburse (strategy "specified" only). Supplying allocations under
   * "due-date-first" THROWS — that strategy pays by due-date and would silently discard them.
   */
  allocations: z.array(AllocationSchema).optional(),
  /**
   * Optional as-of horizon (YYYY-MM-DD). When given, the open set is restricted to bills DUE on/before
   * this date (applies to BOTH strategies); bills not yet due as of this date are excluded from the
   * run. Omit to consider every supplied open bill.
   */
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "asOfDate must be YYYY-MM-DD").optional(),
  /**
   * Optional cash ceiling for the run (strategy "due-date-first" only). When given, oldest-due bills
   * are paid sequentially until the limit is exhausted; the remainder is `unusedFunds`. Omit to pay
   * every open bill in full. Supplying cashLimit under "specified" THROWS — the allocations ARE the
   * run amount there, so a ceiling is meaningless and would be silently dropped.
   */
  cashLimit: z.number().finite().nonnegative().optional(),
});
export type PayBillsOptsInput = z.input<typeof OptsSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface BillPaymentLine {
  billId: string;
  vendorId: string;
  amountPaid: number; // rounded to the cent (half-even)
  newBalance: number; // bill balance after this payment, rounded to the cent
}

/** One check (or ACH/wire) cut for a vendor, aggregating that vendor's paid bills in this run. */
export interface VendorCheck {
  vendorId: string;
  amount: number;       // Σ amountPaid for this vendor's bills (half-even)
  billIds: string[];    // the bills this check covers (in payment order)
  checkNo?: string;     // assigned for method "check" only — sequential within the run
}

/** A single double-entry GL line the disbursement run would post. */
export interface GlLine {
  account: string;     // GL account number
  accountName: string;
  debit: number;       // ≥ 0
  credit: number;      // ≥ 0
  description: string;
}

export interface PayBillsResult {
  runId: string;
  paymentDate: string;
  method: "check" | "ach" | "wire";
  strategy: "due-date-first" | "specified";
  payments: BillPaymentLine[];      // per-bill disbursement (only non-zero payments)
  totalPaid: number;                // Σ payments.amountPaid
  /**
   * Run cash not disbursed. With a `cashLimit`, this is `cashLimit − totalPaid` (≥ 0). With no
   * cash limit it is always 0 (every selected bill is paid). For "specified" runs it is 0 (the
   * caller's allocations ARE the run amount).
   */
  unusedFunds: number;
  checks: VendorCheck[];            // one per vendor — aggregates that vendor's paid bills
  /**
   * The balanced double-entry the run posts (RETURNED as data, not posted here — keeps the engine
   * pure + testable). DR 2000 Accounts Payable (totalPaid) / CR 1000 Cash (totalPaid). Σdebits ===
   * Σcredits by construction.
   */
  glLines: GlLine[];
}

// ============================================================================
// ENGINE
// ============================================================================

class BillPaymentCheckRunEngine {
  /**
   * Run a vendor bill-payment / check-run (QuickBooks "Pay Bills").
   *
   * Strategies:
   *   - "due-date-first" (default): sort open bills by dueDate ascending (ties → billId, then
   *     vendorId for a deterministic order) and pay oldest-due first. With `opts.cashLimit` the run
   *     stops once the limit is exhausted — a partial pays down the boundary bill and the remaining
   *     cash becomes `unusedFunds`. Without a limit, every open bill is paid in full.
   *   - "specified": pay exactly the caller's `opts.allocations` (each ≤ that bill's balance); bills
   *     not allocated are left untouched.
   *
   * Invariants (all enforced, THROW on violation — fail loud, never silently coerce):
   *   - every bill balance, every allocation, and the optional cashLimit must be finite (NaN/∞ THROW).
   *   - balances > 0; negative inputs THROW.
   *   - cross-field: cashLimit under "specified", or allocations under "due-date-first", THROW (the
   *     mis-matched guardrail would be silently discarded — fail loud instead).
   *   - per-bill amountPaid ≤ that bill's open balance (over-pay THROWS).
   *   - Σpaid + unusedFunds === run cash EXACTLY (when a cashLimit is given), checked both ways.
   *   - Σ(check amounts) === totalPaid (per-vendor aggregation reconciles to the run).
   *   - the returned GL lines balance: Σdebits === Σcredits === totalPaid.
   *   - with asOfDate, only bills due on/before it are eligible; an empty horizon THROWS.
   *
   * @param run    {runId, paymentDate(YYYY-MM-DD), method:check|ach|wire}.
   * @param openBills array of {billId, vendorId, balance, dueDate(YYYY-MM-DD)} — the open A/P set.
   * @param opts   {strategy, allocations?, cashLimit?, asOfDate?}. Defaults to due-date-first.
   *               allocations apply only to "specified"; cashLimit only to "due-date-first";
   *               asOfDate restricts the open set to bills due on/before it (both strategies).
   * @returns {@link PayBillsResult} — per-bill payments, per-vendor checks, unusedFunds, GL lines.
   */
  static payBills(
    run: PaymentRunInput,
    openBills: OpenBillInput[],
    opts: PayBillsOptsInput = {},
  ): PayBillsResult {
    const r = RunSchema.parse(run);
    const o = OptsSchema.parse(opts);

    // Cross-field fail-loud guards (R12): a guardrail accepted-but-silently-dropped is worse than no
    // guardrail at all. `cashLimit` is a due-date-first cash ceiling and `allocations` are the
    // specified-strategy payment set — supplying either with the WRONG strategy means the caller
    // believes a constraint is in force when the engine would discard it. Reject loudly instead.
    if (o.strategy === "specified" && o.cashLimit !== undefined) {
      throw new Error(
        `[bill-payment] cashLimit is a due-date-first cash ceiling and is ignored under strategy ` +
          `"specified" (the allocations ARE the run amount) — remove cashLimit or switch strategy (run ${r.runId})`,
      );
    }
    if (o.strategy !== "specified" && o.allocations !== undefined && o.allocations.length > 0) {
      throw new Error(
        `[bill-payment] allocations are honored only under strategy "specified"; strategy ` +
          `"${o.strategy}" pays by due-date and would silently drop them — set strategy:"specified" ` +
          `or remove allocations (run ${r.runId})`,
      );
    }

    if (!Array.isArray(openBills)) {
      throw new Error(`[bill-payment] openBills must be an array (run ${r.runId})`);
    }
    if (openBills.length === 0) {
      throw new Error(`[bill-payment] no open bills to pay (run ${r.runId}) — an empty run is almost certainly a data error`);
    }
    const parsedBills = openBills.map((b) => OpenBillSchema.parse(b));

    // Guard against duplicate bill ids — an ambiguous open set would let one balance be relieved
    // twice. Surface it loudly rather than disburse non-deterministically. (Run BEFORE the asOfDate
    // filter so a duplicate hidden past the horizon still fails loud.)
    const seen = new Set<string>();
    for (const b of parsedBills) {
      if (seen.has(b.billId)) {
        throw new Error(`[bill-payment] duplicate billId '${b.billId}' in open bills (run ${r.runId})`);
      }
      seen.add(b.billId);
    }

    // As-of horizon: when given, restrict the open set to bills DUE on/before asOfDate (lexicographic
    // compare is correct for the enforced YYYY-MM-DD format). Bills not yet due as of that date are
    // excluded from this run. An empty result is a data error (no bill qualifies) and fails loud,
    // mirroring the empty-open-set guard above.
    const bills = o.asOfDate === undefined
      ? parsedBills
      : parsedBills.filter((b) => b.dueDate <= o.asOfDate!);
    if (bills.length === 0) {
      throw new Error(
        `[bill-payment] no open bills are due on/before asOfDate ${o.asOfDate} (run ${r.runId}) — ` +
          `the as-of horizon excluded every bill`,
      );
    }

    // Working balance + vendor map (rounded basis) keyed by billId.
    const balanceById = new Map<string, number>();
    const vendorById = new Map<string, string>();
    for (const b of bills) {
      balanceById.set(b.billId, roundCentsHalfEven(b.balance));
      vendorById.set(b.billId, b.vendorId);
    }

    let runFunds: number | null = null; // the run's cash ceiling, if any
    let payments: BillPaymentLine[];
    if (o.strategy === "specified") {
      payments = BillPaymentCheckRunEngine.paySpecified(r.runId, balanceById, vendorById, o.allocations);
    } else {
      if (o.cashLimit !== undefined) runFunds = roundCentsHalfEven(o.cashLimit);
      payments = BillPaymentCheckRunEngine.payDueDateFirst(r.runId, bills, balanceById, vendorById, runFunds);
    }

    // ----- Reconciliation (both ways, exact to the cent) ---------------------
    const totalPaid = roundCentsHalfEven(payments.reduce((s, p) => s + p.amountPaid, 0));

    let unusedFunds = 0;
    if (runFunds !== null) {
      // Forward: Σpaid must never exceed the run's cash ceiling.
      if (totalPaid - runFunds > MONEY_RECONCILE_TOLERANCE) {
        throw new Error(
          `[bill-payment] over-disbursed: Σpaid ${totalPaid.toFixed(2)} exceeds run cash limit ` +
            `${runFunds.toFixed(2)} (run ${r.runId})`,
        );
      }
      unusedFunds = roundCentsHalfEven(runFunds - totalPaid);
      if (unusedFunds < -MONEY_RECONCILE_TOLERANCE) {
        // unreachable given the check above, but a defensive fail-loud guard against a rounding seam.
        throw new Error(`[bill-payment] negative unused funds ${unusedFunds} (run ${r.runId})`);
      }
      // Reverse: paid + unused must reconstruct the run cash EXACTLY.
      const reconstructed = roundCentsHalfEven(totalPaid + unusedFunds);
      if (Math.abs(reconstructed - runFunds) > MONEY_RECONCILE_TOLERANCE) {
        throw new Error(
          `[bill-payment] reconciliation failed: paid ${totalPaid.toFixed(2)} + unused ` +
            `${unusedFunds.toFixed(2)} = ${reconstructed.toFixed(2)} != run cash ${runFunds.toFixed(2)} ` +
            `(run ${r.runId})`,
        );
      }
    }

    const checks = BillPaymentCheckRunEngine.buildVendorChecks(r.runId, r.method, payments);

    // Per-vendor aggregation must reconcile to the run total (a misgrouped check would silently
    // misstate cash). Checked both ways.
    const checkTotal = roundCentsHalfEven(checks.reduce((s, c) => s + c.amount, 0));
    if (Math.abs(checkTotal - totalPaid) > MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `[bill-payment] check aggregation mismatch: Σchecks ${checkTotal.toFixed(2)} != totalPaid ` +
          `${totalPaid.toFixed(2)} (run ${r.runId})`,
      );
    }

    const glLines = BillPaymentCheckRunEngine.buildGlLines(r.runId, totalPaid);

    return {
      runId: r.runId,
      paymentDate: r.paymentDate,
      method: r.method,
      strategy: o.strategy,
      payments,
      totalPaid,
      unusedFunds,
      checks,
      glLines,
    };
  }

  // --------------------------------------------------------------------------
  // STRATEGIES
  // --------------------------------------------------------------------------

  /**
   * Due-date-first sequential fill: sort by dueDate ascending (ties → billId, then vendorId for a
   * deterministic order) and pay bill-by-bill. With a cash ceiling (`runFunds`) the boundary bill
   * gets the remainder and later bills are left untouched; without a ceiling every bill is paid in
   * full. Per-bill amountPaid ≤ balance by construction (Math.min with the remaining cash).
   */
  private static payDueDateFirst(
    runId: string,
    bills: OpenBillInput[],
    balanceById: Map<string, number>,
    vendorById: Map<string, string>,
    runFunds: number | null,
  ): BillPaymentLine[] {
    const ordered = [...bills].sort((a, b) => {
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.billId !== b.billId) return a.billId.localeCompare(b.billId);
      return a.vendorId.localeCompare(b.vendorId);
    });

    const payments: BillPaymentLine[] = [];
    // No ceiling → an effectively-infinite budget so every bill is paid in full.
    let remaining = runFunds === null ? Number.POSITIVE_INFINITY : runFunds;

    for (const bill of ordered) {
      if (remaining <= 0) break;
      const balance = balanceById.get(bill.billId)!;
      const amountPaid = roundCentsHalfEven(Math.min(remaining, balance));
      if (amountPaid <= 0) continue;
      if (amountPaid - balance > MONEY_RECONCILE_TOLERANCE) {
        // Defensive: Math.min(remaining, balance) makes this unreachable — never let it slip silently.
        throw new Error(
          `[bill-payment] over-pay: bill '${bill.billId}' paid ${amountPaid.toFixed(2)} exceeds balance ` +
            `${balance.toFixed(2)} (run ${runId})`,
        );
      }
      const newBalance = roundCentsHalfEven(balance - amountPaid);
      payments.push({ billId: bill.billId, vendorId: vendorById.get(bill.billId)!, amountPaid, newBalance });
      if (Number.isFinite(remaining)) remaining = roundCentsHalfEven(remaining - amountPaid);
    }
    return payments;
  }

  /**
   * Specified allocation: pay exactly the caller's per-bill amounts. Each allocation bill must exist
   * in the open set and its amount must not exceed the bill's balance (over-pay THROWS). Duplicate
   * allocation targets THROW (two allocations against one bill could jointly over-relieve it). Zero
   * allocations are dropped (a bill left untouched does not emit a payment line).
   */
  private static paySpecified(
    runId: string,
    balanceById: Map<string, number>,
    vendorById: Map<string, string>,
    allocations: AllocationInput[] | undefined,
  ): BillPaymentLine[] {
    if (!allocations || allocations.length === 0) {
      throw new Error(`[bill-payment] strategy "specified" requires a non-empty opts.allocations (run ${runId})`);
    }

    const allocSeen = new Set<string>();
    const payments: BillPaymentLine[] = [];

    for (const alloc of allocations) {
      if (allocSeen.has(alloc.billId)) {
        throw new Error(`[bill-payment] duplicate allocation for bill '${alloc.billId}' (run ${runId})`);
      }
      allocSeen.add(alloc.billId);

      if (!balanceById.has(alloc.billId)) {
        throw new Error(
          `[bill-payment] allocation targets bill '${alloc.billId}' which is not in the open bill set (run ${runId})`,
        );
      }
      const balance = balanceById.get(alloc.billId)!;
      const amountPaid = roundCentsHalfEven(alloc.amount);

      if (amountPaid > balance + MONEY_RECONCILE_TOLERANCE) {
        throw new Error(
          `[bill-payment] over-pay: allocation ${amountPaid.toFixed(2)} exceeds bill ` +
            `'${alloc.billId}' balance ${balance.toFixed(2)} (run ${runId})`,
        );
      }

      if (amountPaid <= 0) continue; // a zero allocation leaves the bill untouched
      payments.push({
        billId: alloc.billId,
        vendorId: vendorById.get(alloc.billId)!,
        amountPaid,
        newBalance: roundCentsHalfEven(balance - amountPaid),
      });
    }
    return payments;
  }

  // --------------------------------------------------------------------------
  // CHECKS
  // --------------------------------------------------------------------------

  /**
   * Aggregate the per-bill payments into ONE check (or ACH/wire) per vendor. Vendors appear in the
   * order their first paid bill was processed (preserves the strategy's payment order); each
   * vendor's billIds are listed in payment order. For method "check", a sequential checkNo is
   * assigned within the run (CHK-<runId>-<n>); ACH/wire leave checkNo undefined.
   * Σ check amounts === Σ payments by construction (every payment maps to exactly one vendor check).
   */
  private static buildVendorChecks(
    runId: string,
    method: "check" | "ach" | "wire",
    payments: BillPaymentLine[],
  ): VendorCheck[] {
    const order: string[] = [];
    const byVendor = new Map<string, VendorCheck>();

    for (const p of payments) {
      let check = byVendor.get(p.vendorId);
      if (!check) {
        check = { vendorId: p.vendorId, amount: 0, billIds: [] };
        byVendor.set(p.vendorId, check);
        order.push(p.vendorId);
      }
      check.amount = roundCentsHalfEven(check.amount + p.amountPaid);
      check.billIds.push(p.billId);
    }

    const checks: VendorCheck[] = [];
    let checkSeq = 1;
    for (const vendorId of order) {
      const check = byVendor.get(vendorId)!;
      if (method === "check") check.checkNo = `CHK-${runId}-${checkSeq++}`;
      checks.push(check);
    }
    return checks;
  }

  // --------------------------------------------------------------------------
  // GL
  // --------------------------------------------------------------------------

  /**
   * Build the balanced double-entry for the disbursement run (returned as data):
   *   DR 2000 Accounts Payable  (totalPaid)
   *   CR 1000 Cash              (totalPaid)
   * Σdebits === Σcredits === totalPaid by construction. Re-validated here as defence-in-depth before
   * returning. A zero-total run (every allocation was 0) emits no lines.
   */
  private static buildGlLines(runId: string, totalPaid: number): GlLine[] {
    if (totalPaid <= 0) return [];

    const lines: GlLine[] = [
      {
        account: ACCOUNTS_PAYABLE_ACCOUNT.number,
        accountName: ACCOUNTS_PAYABLE_ACCOUNT.name,
        debit: totalPaid,
        credit: 0,
        description: `Bill-payment run ${runId} — relieve A/P`,
      },
      {
        account: CASH_ACCOUNT.number,
        accountName: CASH_ACCOUNT.name,
        debit: 0,
        credit: totalPaid,
        description: `Bill-payment run ${runId} — cash disbursed`,
      },
    ];

    const debitTotal = roundCentsHalfEven(lines.reduce((s, l) => s + l.debit, 0));
    const creditTotal = roundCentsHalfEven(lines.reduce((s, l) => s + l.credit, 0));
    if (Math.abs(debitTotal - creditTotal) > MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `[bill-payment] GL entry unbalanced: Σdebits ${debitTotal.toFixed(2)} != Σcredits ` +
          `${creditTotal.toFixed(2)} (run ${runId})`,
      );
    }
    return lines;
  }
}

export const billPaymentCheckRunEngine = BillPaymentCheckRunEngine;
export { BillPaymentCheckRunEngine };
