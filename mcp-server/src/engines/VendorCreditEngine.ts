/**
 * VendorCreditEngine — vendor credits (Accounts-Payable side) for the PRISM ERP
 * (galaxy:business, slot:hotel).
 *
 * QuickBooks-parity: the "Vendor Credit" function set (QB-PARITY Phase-3 A/P engine #1). This is the
 * A/P MIRROR of `CreditMemoEngine` (A/R): where a credit memo is a NEGATIVE-revenue document born from
 * a customer return, a vendor credit is a NEGATIVE-expense document born from a return-to-vendor, a
 * vendor refund, or vendor overbilling. It reduces what the SHOP owes the vendor and reverses the
 * inventory/expense + use-tax the original purchase landed.
 *
 * Producer / PRISM synergy — this engine serves BOTH:
 *  - the QuickBooks A/P cycle (QUICKBOOKS-PARITY-PLAN.md): a return-to-vendor / vendor-refund /
 *    overbilling event creates the vendor credit (mirror of `recordPurchase` which posts the bill
 *    DR <expense/asset> / CR 2000 AP). The credit applies against an open vendor BILL's balance —
 *    the A/P analogue of `ReceivePaymentEngine`'s cash-application against open invoices — and its
 *    issuance GL (returned as data) REVERSES the original purchase.
 *  - the manufacturing networking platform (business/PRISM-NETWORKING-PLATFORM-PLAN.md): the
 *    platform's vendor/payout flow issues credits to a supplier for cancelled/returned platform
 *    orders or a clawed-back payout — the same vendor-credit math (apply-to-bill + remaining-credit
 *    tracking + balanced reversal GL) backs both surfaces.
 *
 * Financial-invariant compliance (business/GSD.md §2, [[feedback_hotel_financial_invariant_gate]]):
 *  - half-even (banker's) rounding to the cent — REUSES roundCentsHalfEven (shared money util) from the shared money util src/data/money.ts (DRY).
 *  - accounts/policy are IMPORTED (vendor-credit-policy.ts), never inlined.
 *  - money reconciles both ways: total == subtotal + tax; unapplied == total − Σapplied (≥ 0).
 *  - over-apply THROWS on BOTH ceilings: applied ≤ vendorCredit.unapplied AND applied ≤ billBalance.
 *  - non-finite / NaN / negative qty or price THROW (no silent coercion).
 *  - the RETURNED GL effect balances Σdebits == Σcredits (asserted before return), reversing the
 *    original purchase: DR 2000 Accounts Payable (total) / CR <category-mapped reversal account>
 *    (subtotal) [+ CR 2100 Tax Payable (tax)]. The reversal account is the SAME one recordPurchase
 *    debited for the purchase category (materials→1320, tools/consumables→5600, equipment→1500,
 *    services/other→5500); a hardcoded 1320 would balance but mis-post a non-materials reversal.
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wire vendor_credit_create / vendor_credit_apply / vendor_credit_remaining / vendor_credit_gl_lines
// in main post golf-merge. Wiring + golf-merging the stale worktree businessDispatcher.ts would
// CLOBBER ~438 main actions (regression). Tracked in business/QUICKBOOKS-PARITY-PLAN.md §Status.
import { z } from "zod";
import { SalesUseTaxEngine } from "./SalesUseTaxEngine.js";
import { roundCentsHalfEven } from "../data/money.js";
import {
  VENDOR_CREDIT_ACCOUNTS,
  VENDOR_CREDIT_POLICY_SCHEMA_VERSION,
  MONEY_RECONCILE_TOLERANCE,
  isValidVendorCreditReason,
  isValidVendorCreditCategory,
  reversalAccountForCategory,
  type VendorCreditReason,
  type VendorCreditCategory,
} from "../data/vendor-credit-policy.js";

// ============================================================================
// SCHEMAS
// ============================================================================

const LineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().finite().positive(),
  unitPrice: z.number().finite().nonnegative(),
  taxable: z.boolean().optional().default(true),
});

const VendorCreditInputSchema = z.object({
  vendorCreditId: z.string().optional(),
  vendorId: z.string().min(1),
  reason: z.string().min(1), // validated against VENDOR_CREDIT_REASONS below (audit trail)
  lines: z.array(LineSchema).min(1),
  taxJurisdiction: z.string().optional(),
  /**
   * The category of the ORIGINAL purchase this credit reverses — determines which account the
   * reversal credit lands on (mirrors recordPurchase). Defaults to "materials" (1320 Raw Materials)
   * for the common return-to-vendor-of-stock case, so callers that omit it reverse raw materials
   * exactly as before. Validated against VENDOR_CREDIT_CATEGORIES below (fail-loud on a typo).
   */
  category: z.string().optional(),
});
export type VendorCreditInput = z.input<typeof VendorCreditInputSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface VendorCreditLineResult {
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  /** quantity * unitPrice, half-even rounded to the cent. */
  extension: number;
}

/** A single application of vendor credit against a bill (audit trail for partial applications). */
export interface VendorCreditApplication {
  billId: string;
  /** the credit amount consumed by THIS application (> 0). */
  amount: number;
  /** the bill balance AFTER this application (≥ 0). */
  billBalanceAfter: number;
}

/** One side of a balanced GL posting (debit XOR credit is positive). */
export interface GLLine {
  account: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface VendorCredit {
  vendorCreditId: string;
  vendorId: string;
  reason: VendorCreditReason;
  /** The category of the original purchase this credit reverses (drives the reversal-credit account). */
  category: VendorCreditCategory;
  /** The GL account the reversal credit targets — resolved from `category` at create() time. */
  reversalAccount: { number: string; name: string };
  lines: VendorCreditLineResult[];
  subtotal: number;
  taxJurisdiction: string | null;
  tax: number;
  total: number;
  /** applications recorded against bills (immutable history — never mutated in place). */
  applications: VendorCreditApplication[];
  /** total credit consumed so far == Σ applications.amount. */
  applied: number;
  /** credit still available to apply == total − applied (≥ 0). */
  unapplied: number;
  policySchemaVersion: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class VendorCreditEngine {
  /**
   * Build a new vendor credit (zero credit applied) with a reconciled subtotal/tax/total.
   *
   * The taxable base reuses the same line math as the A/R side (Σ extension over taxable lines), and
   * the tax line is computed by `SalesUseTaxEngine.calcSalesTax` (imported rates) whenever a
   * jurisdiction is given — never re-derived, never an inlined rate. Tax is computed even at a $0
   * taxable base so a typo'd jurisdiction THROWS (a silent 0% would under-reverse the purchase's
   * accrued use-tax liability).
   *
   * @param input vendorCreditId? + vendorId + reason + lines[] + optional taxJurisdiction + optional
   *        category (the original purchase category, defaults to "materials" → 1320 Raw Materials).
   * @returns the vendor credit with `total == subtotal + tax`, `applied == 0`, `unapplied == total`,
   *          and `reversalAccount` resolved from `category`.
   * @throws on an empty/invalid reason, an unknown category, an unknown tax jurisdiction, negative/NaN
   *         qty or unitPrice, or a non-positive total.
   */
  static create(input: VendorCreditInput): VendorCredit {
    const c = VendorCreditInputSchema.parse(input); // throws on negative/NaN qty or price, empty lines/vendor

    if (!isValidVendorCreditReason(c.reason)) {
      // A reasonless vendor credit is a silent A/P-reversal hole — fail loud (audit trail).
      throw new Error(
        `[vendor-credit] unknown reason "${c.reason}" — must be one of the recognized VENDOR_CREDIT_REASONS ` +
          `(return_to_vendor/vendor_refund/overbilling/damaged_goods/price_adjustment)`
      );
    }

    // Resolve which account the reversal credit must target — the SAME account recordPurchase debited
    // for this category. Default "materials" (→ 1320) for the common RTV-of-stock case. A typo'd
    // category is failed loud, not silently fallen back to 5500: a wrong reversal account is a balanced
    // BUT mis-posted entry (the silent-misstatement class the financial-invariant gate exists to stop).
    const category = (c.category ?? "materials") as VendorCreditCategory;
    if (!isValidVendorCreditCategory(category)) {
      throw new Error(
        `[vendor-credit] unknown category "${c.category}" — must be one of the recognized ` +
          `VENDOR_CREDIT_CATEGORIES (materials/tools/consumables/equipment/services/other); the reversal ` +
          `credit must land on the same account recordPurchase debited`
      );
    }
    const reversalAccount = reversalAccountForCategory(category);

    const lines: VendorCreditLineResult[] = c.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxable: l.taxable,
      extension: roundCentsHalfEven(l.quantity * l.unitPrice),
    }));
    const subtotal = roundCentsHalfEven(lines.reduce((s, l) => s + l.extension, 0));

    const taxableBase = roundCentsHalfEven(
      lines.filter((l) => l.taxable).reduce((s, l) => s + l.extension, 0)
    );
    let tax = 0;
    if (c.taxJurisdiction) {
      tax = SalesUseTaxEngine.calcSalesTax({
        amount: taxableBase,
        jurisdiction: c.taxJurisdiction,
        reference: c.vendorCreditId,
      }).tax;
    }

    const total = roundCentsHalfEven(subtotal + tax);
    if (total <= 0) {
      // A vendor credit with no positive value cannot reverse anything — almost certainly a data error.
      throw new Error(
        `[vendor-credit] vendor credit total must be positive (got ${total}) — a $0/negative credit reverses nothing`
      );
    }

    return {
      vendorCreditId: c.vendorCreditId ?? `VC-${c.vendorId}-${c.reason}`,
      vendorId: c.vendorId,
      reason: c.reason,
      category,
      reversalAccount,
      lines,
      subtotal,
      taxJurisdiction: c.taxJurisdiction ?? null,
      tax,
      total,
      applications: [],
      applied: 0,
      unapplied: total,
      policySchemaVersion: VENDOR_CREDIT_POLICY_SCHEMA_VERSION,
    };
  }

  /**
   * Apply some of a vendor credit's available credit against an open vendor BILL's balance, reducing
   * the bill balance (the A/P analogue of applying a customer credit memo to an invoice). Returns a
   * NEW vendor-credit object (immutable) with the application appended and `applied`/`unapplied`
   * re-reconciled — never mutates the input.
   *
   * Over-apply THROWS on BOTH ceilings (fail loud, no silent clamping):
   *   - `amount` must not exceed the vendor credit's REMAINING (unapplied) credit, and
   *   - `amount` must not exceed the bill's current balance.
   *
   * @param vendorCredit the vendor credit to draw credit from.
   * @param appl billId + the bill's current `billBalance` + the `amount` of credit to apply.
   * @returns `{ vendorCredit: <updated>, application }` — updated credit + the recorded application.
   * @throws on a non-finite/negative amount or balance, a missing billId, or an over-apply on either
   *         ceiling.
   */
  static applyToBill(
    vendorCredit: VendorCredit,
    appl: { billId: string; billBalance: number; amount: number }
  ): { vendorCredit: VendorCredit; application: VendorCreditApplication } {
    if (!appl || typeof appl.billId !== "string" || appl.billId.length === 0) {
      throw new Error("[vendor-credit] applyToBill: billId is required");
    }
    if (!Number.isFinite(appl.amount)) {
      throw new Error(`[vendor-credit] applyToBill: non-finite amount ${appl.amount}`);
    }
    if (!Number.isFinite(appl.billBalance)) {
      throw new Error(`[vendor-credit] applyToBill: non-finite billBalance ${appl.billBalance}`);
    }
    if (appl.amount <= 0) {
      throw new Error(`[vendor-credit] applyToBill: amount must be positive (got ${appl.amount})`);
    }
    if (appl.billBalance < 0) {
      throw new Error(`[vendor-credit] applyToBill: billBalance must be non-negative (got ${appl.billBalance})`);
    }

    const amount = roundCentsHalfEven(appl.amount);
    const billBalance = roundCentsHalfEven(appl.billBalance);
    const remaining = vendorCredit.unapplied;

    // Ceiling 1: cannot apply more credit than the vendor credit has left.
    if (amount - remaining > MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `[vendor-credit] over-apply: amount ${amount} exceeds remaining credit ${remaining} on vendor credit ${vendorCredit.vendorCreditId}`
      );
    }
    // Ceiling 2: cannot credit a bill more than it owes (would create a phantom negative payable).
    if (amount - billBalance > MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `[vendor-credit] over-apply: amount ${amount} exceeds bill ${appl.billId} balance ${billBalance}`
      );
    }

    const billBalanceAfter = roundCentsHalfEven(billBalance - amount);
    const application: VendorCreditApplication = { billId: appl.billId, amount, billBalanceAfter };

    const applications = [...vendorCredit.applications, application];
    const applied = roundCentsHalfEven(vendorCredit.applied + amount);
    const unapplied = roundCentsHalfEven(vendorCredit.total - applied);
    if (unapplied < -MONEY_RECONCILE_TOLERANCE) {
      // Defensive: the two ceilings above make this unreachable, but never let the invariant slip silently.
      throw new Error(
        `[vendor-credit] invariant violation: unapplied ${unapplied} < 0 after applying ${amount}`
      );
    }

    // Reconcile both ways: applied + unapplied must reconstruct the total EXACTLY.
    const reconstructed = roundCentsHalfEven(applied + Math.max(0, unapplied));
    if (Math.abs(reconstructed - vendorCredit.total) > MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `[vendor-credit] reconciliation failed: applied ${applied} + unapplied ${unapplied} = ${reconstructed} ` +
          `!= total ${vendorCredit.total} (vendor credit ${vendorCredit.vendorCreditId})`
      );
    }

    return {
      vendorCredit: { ...vendorCredit, applications, applied, unapplied: Math.max(0, unapplied) },
      application,
    };
  }

  /**
   * The credit still available to apply on a vendor credit (== total − Σ applied, ≥ 0).
   *
   * RE-DERIVES from `total − applied` rather than trusting the stored `unapplied` field — a
   * hand-mutated credit whose `unapplied` was bumped upward (without a matching `applied`/`total`)
   * would otherwise report a false "remaining" with no guard on this read path. `applyToBill` keeps
   * `unapplied` honest internally, but this defends direct callers / deserialized state too.
   */
  static remainingCredit(vendorCredit: VendorCredit): number {
    if (
      !vendorCredit ||
      !Number.isFinite(vendorCredit.total) ||
      !Number.isFinite(vendorCredit.applied) ||
      !Number.isFinite(vendorCredit.unapplied)
    ) {
      throw new Error("[vendor-credit] remainingCredit: invalid vendor credit");
    }
    // Source of truth is total − Σapplied (clamped at 0), not the cached unapplied field.
    return Math.max(0, roundCentsHalfEven(vendorCredit.total - vendorCredit.applied));
  }

  /**
   * The GL effect a vendor credit posts when issued (RETURNED as data — the engine stays pure; the
   * caller hands these lines to `GeneralLedgerEngine.createJournalEntry`). REVERSES the original
   * purchase (the inverse of `recordPurchase`'s DR <category-mapped expense/asset> / CR 2000 AP):
   *   DR 2000 Accounts Payable (total)
   *   CR <reversalAccount> (subtotal)   — the SAME account recordPurchase debited for this category
   *   [+ CR 2100 Tax Payable (tax)]
   * Σdebits == Σcredits == vendorCredit.total (the balanced-posting invariant), asserted before return.
   *
   * The reversal credit targets `vendorCredit.reversalAccount` (resolved from the purchase category at
   * create() time): materials→1320, tools/consumables→5600, equipment→1500, services/other→5500. A
   * hardcoded 1320 here would balance but mis-post a non-materials reversal (e.g. a tooling RTV would
   * understate Raw Materials and leave Tools Expense overstated) — the silent-misstatement class the
   * balanced-GL assertion cannot catch.
   *
   * The tax leg is the deliberate sign-inverse of the A/R credit memo (which DEBITS 2100): the original
   * purchase DEBITED 2100 (input use-tax recoverable), so this CREDITS 2100 to reverse that debit — the
   * balancing leg against the AP debit.
   *
   * @param vendorCredit the vendor credit whose issuance to post.
   * @returns balanced GL lines + the verified debit/credit totals.
   * @throws if the lines fail to balance (defensive — should never happen for a well-formed credit).
   */
  static glLinesForIssue(vendorCredit: VendorCredit): {
    lines: GLLine[];
    totalDebit: number;
    totalCredit: number;
  } {
    if (!vendorCredit || !Number.isFinite(vendorCredit.total)) {
      throw new Error("[vendor-credit] glLinesForIssue: invalid vendor credit");
    }
    const { ACCOUNTS_PAYABLE, TAX_PAYABLE } = VENDOR_CREDIT_ACCOUNTS;
    // Reversal credit targets the SAME account recordPurchase debited for this category. Fall back to
    // the category map for a legacy/hand-built credit object that predates the reversalAccount field
    // (defensive — create() always populates it), defaulting category to "materials" (→ 1320).
    const reversalAccount =
      vendorCredit.reversalAccount ?? reversalAccountForCategory(vendorCredit.category ?? "materials");
    const apDebit = roundCentsHalfEven(vendorCredit.total);
    const expenseReversal = roundCentsHalfEven(vendorCredit.subtotal);
    const taxReversal = roundCentsHalfEven(vendorCredit.tax);

    const lines: GLLine[] = [
      { account: ACCOUNTS_PAYABLE.number, accountName: ACCOUNTS_PAYABLE.name, debit: apDebit, credit: 0 },
      { account: reversalAccount.number, accountName: reversalAccount.name, debit: 0, credit: expenseReversal },
    ];
    // Only emit the tax-reversal leg when there is tax to reverse (a $0 line is noise, not a posting).
    if (taxReversal > 0) {
      lines.push({ account: TAX_PAYABLE.number, accountName: TAX_PAYABLE.name, debit: 0, credit: taxReversal });
    }

    const totalDebit = roundCentsHalfEven(lines.reduce((s, l) => s + l.debit, 0));
    const totalCredit = roundCentsHalfEven(lines.reduce((s, l) => s + l.credit, 0));
    if (Math.abs(totalDebit - totalCredit) > MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `[vendor-credit] GL posting does not balance: Σdebits ${totalDebit} != Σcredits ${totalCredit} ` +
          `(vendor credit ${vendorCredit.vendorCreditId})`
      );
    }
    return { lines, totalDebit, totalCredit };
  }
}

export const vendorCreditEngine = VendorCreditEngine;
