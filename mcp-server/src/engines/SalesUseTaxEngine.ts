/**
 * SalesUseTaxEngine — sales & use tax for the PRISM ERP (galaxy:business, slot:hotel).
 *
 * QuickBooks-parity: the "Sales Tax" function set (calc tax on a taxable sale, self-assess use tax,
 * aggregate the period liability to remit, "Pay Sales Tax"). QB-PARITY-MS0 Phase-1 engine #1 — the
 * audit's #1 true pillar gap (prior coverage was only an `integration_export_payroll_tax` shim).
 *
 * PRISM synergy (QUICKBOOKS-PARITY-PLAN.md thesis): a taxable event is BORN from a shipment —
 * `ShippingReceivingLogEngine` outbound → ship-to jurisdiction → calcSalesTax → the tax rides the
 * invoice (`BillingEngine`) and credits Sales Tax Payable in the GL (`GeneralLedgerEngine`).
 *
 * Financial-invariant compliance (business/GSD.md §2.1, [[feedback_hotel_financial_invariant_gate]]):
 *  - rates are IMPORTED from sales-tax-rates.ts, never inlined.
 *  - unknown jurisdiction THROWS (a silent 0% is under-collection = real liability).
 *  - half-even (banker's) rounding to the cent; dollars reported to the cent.
 *  - tax collected is a LIABILITY (credit Sales Tax Payable) until remitted — never revenue.
 *  - non-finite / NaN amounts THROW (never silently coerce).
 */
// WIRE-EXEMPT: dispatcher wiring is BLOCKED by worktree-dispatcher divergence — the slot/hotel
// businessDispatcher.ts is a stale 441-action copy vs main's 879; wiring + golf-merging the worktree
// copy would CLOBBER ~438 main actions (regression). Wire sales_tax_calc / use_tax_accrue /
// sales_tax_liability into MAIN businessDispatcher.ts (additive: ACTIONS enum + switch cases + lazy
// import) AFTER this engine reaches main. Tracked in business/QUICKBOOKS-PARITY-PLAN.md §Status.
import { z } from "zod";
import {
  getSalesTaxRate,
  SALES_TAX_PAYABLE_ACCOUNT,
  SALES_TAX_RATES_SCHEMA_VERSION,
} from "../data/sales-tax-rates.js";
// Half-even money rounding is hoisted to the shared canonical util — SalesUseTaxEngine is now just one
// of its ~24 consumers, not the owner (it no longer defines or re-exports it).
import { roundCentsHalfEven } from "../data/money.js";

const TaxableSaleSchema = z.object({
  amount: z.number().finite(), // taxable base (negative allowed = credit-memo reversal)
  jurisdiction: z.string().min(1),
  exempt: z.boolean().optional().default(false),
  exemptReason: z.string().optional(),
  reference: z.string().optional(), // invoice/order id for the audit trail
});
export type TaxableSale = z.input<typeof TaxableSaleSchema>;

export interface SalesTaxResult {
  reference: string | null;
  jurisdiction: string;
  jurisdictionLabel: string;
  taxableAmount: number;
  rate: number;
  tax: number;
  exempt: boolean;
  exemptReason: string | null;
  rateEffectiveDate: string;
  /** GL effect: tax COLLECTED is a credit to Sales Tax Payable (a liability), never revenue. */
  glLiabilityCredit: { account: string; accountName: string; amount: number };
  isUseTax: boolean;
  ratesSchemaVersion: string;
  caveat: string;
}

export class SalesUseTaxEngine {
  /** Calculate sales tax on a taxable sale (the QB "tax on invoice" path). */
  static calcSalesTax(input: TaxableSale): SalesTaxResult {
    return this.#compute(input, false);
  }

  /** Self-assess USE tax on an untaxed purchase consumed in a jurisdiction (QB "use tax"). */
  static accrueUseTax(input: TaxableSale): SalesTaxResult {
    return this.#compute(input, true);
  }

  static #compute(input: TaxableSale, isUseTax: boolean): SalesTaxResult {
    const parsed = TaxableSaleSchema.parse(input); // throws on NaN/Infinity/missing jurisdiction
    const j = getSalesTaxRate(parsed.jurisdiction); // throws on unknown jurisdiction
    const exempt = parsed.exempt === true;
    if (exempt && !parsed.exemptReason) {
      throw new Error(`[sales-tax] exempt sale requires an exemptReason (audit trail) — ref=${parsed.reference ?? "n/a"}`);
    }
    const taxableAmount = roundCentsHalfEven(parsed.amount);
    const tax = exempt ? 0 : roundCentsHalfEven(taxableAmount * j.rate);
    return {
      reference: parsed.reference ?? null,
      jurisdiction: parsed.jurisdiction.trim().toUpperCase(),
      jurisdictionLabel: j.label,
      taxableAmount,
      rate: j.rate,
      tax,
      exempt,
      exemptReason: exempt ? (parsed.exemptReason as string) : null,
      rateEffectiveDate: j.effectiveDate,
      glLiabilityCredit: { account: SALES_TAX_PAYABLE_ACCOUNT.number, accountName: SALES_TAX_PAYABLE_ACCOUNT.name, amount: tax },
      isUseTax,
      ratesSchemaVersion: SALES_TAX_RATES_SCHEMA_VERSION,
      caveat: `rate is a snapshot (eff. ${j.effectiveDate}, ${j.source}) — reconcile against the live DOR rate for the exact ship-to before filing`,
    };
  }

  /**
   * Aggregate the tax liability to remit for a filing period (QB "Pay Sales Tax").
   * Sums collected tax per jurisdiction across the period's taxed transactions.
   */
  static liabilityForPeriod(
    transactions: Array<{ jurisdiction: string; tax: number }>,
    opts: { periodLabel?: string } = {}
  ): {
    periodLabel: string;
    byJurisdiction: Record<string, { tax: number; count: number }>;
    totalTax: number;
    transactionCount: number;
  } {
    if (!Array.isArray(transactions)) throw new Error("[sales-tax] liabilityForPeriod: transactions must be an array");
    const byJurisdiction: Record<string, { tax: number; count: number }> = {};
    let totalTax = 0;
    for (const t of transactions) {
      if (!t || typeof t.jurisdiction !== "string" || !Number.isFinite(t.tax)) {
        throw new Error(`[sales-tax] liabilityForPeriod: invalid transaction ${JSON.stringify(t)} (jurisdiction + finite tax required)`);
      }
      const key = t.jurisdiction.trim().toUpperCase();
      const bucket = (byJurisdiction[key] ||= { tax: 0, count: 0 });
      bucket.tax = roundCentsHalfEven(bucket.tax + t.tax);
      bucket.count += 1;
      totalTax = roundCentsHalfEven(totalTax + t.tax);
    }
    return { periodLabel: opts.periodLabel ?? "unspecified", byJurisdiction, totalTax, transactionCount: transactions.length };
  }
}

export const salesUseTaxEngine = SalesUseTaxEngine;
