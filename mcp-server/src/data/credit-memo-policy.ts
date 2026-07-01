/**
 * credit-memo-policy.ts — constants & policy for the QuickBooks-parity Credit Memo engine
 * (galaxy:business, slot:hotel). Single source of truth for the GL accounts a credit memo
 * touches and the application-policy knobs — so CreditMemoEngine never inlines an account
 * number or a policy rate (financial-invariant gate, business/GSD.md §2).
 *
 * A QB Credit Memo is a NEGATIVE-revenue document born from a customer return/RMA or a
 * price adjustment. Its GL reversal (per the QB-PARITY-PLAN.md chart of accounts) is:
 *   DR 4000 Sales Revenue   (contra / return — revenue reversed)
 *   DR 2100 Tax Payable     (the sales-tax liability is reversed too)
 *   CR 1200 Accounts Receivable (the customer owes less / gets a credit)
 *
 * NOTE: the chart here intentionally uses 2100 "Tax Payable" for the tax-reversal leg, per the
 * CreditMemoEngine spec + the PRISM canonical chart (1000 Cash, 1200 AR, 1300 WIP, 1320 Raw,
 * 2000 AP, 2100 Tax Payable, 2200 Accrued Payroll, 3000 Equity, 4000 Sales Rev, 5000 COGS).
 * SalesUseTaxEngine's sale-side liability account ("2200 Sales Tax Payable") is a separate
 * sub-ledger label; the credit memo reverses against the canonical 2100 Tax-Payable account
 * named by this module so the contra-document balances against the same chart the GL posts to.
 */

export const CREDIT_MEMO_POLICY_SCHEMA_VERSION = "1.0.0";

/** Canonical GL accounts a credit memo posts against (PRISM chart of accounts). */
export const CREDIT_MEMO_ACCOUNTS = Object.freeze({
  /** Revenue is reversed (contra) when goods are returned / a price is reduced. */
  SALES_REVENUE: Object.freeze({ number: "4000", name: "Sales Revenue", type: "revenue" as const }),
  /** The sales-tax liability collected on the original sale is reversed. */
  TAX_PAYABLE: Object.freeze({ number: "2100", name: "Tax Payable", type: "liability" as const }),
  /** Accounts Receivable is credited — the customer's balance is reduced by the credit. */
  ACCOUNTS_RECEIVABLE: Object.freeze({ number: "1200", name: "Accounts Receivable", type: "asset" as const }),
});

/**
 * Allowed reasons for a credit memo (QB "reason" field). A reason is MANDATORY (audit trail):
 * a creditless reason is a hole through which revenue can be silently reversed.
 */
export const CREDIT_MEMO_REASONS = Object.freeze([
  "return",            // customer returned goods (RMA)
  "price_adjustment",  // negotiated price reduction after invoicing
  "damaged_goods",     // goods arrived damaged
  "overbilling",       // original invoice over-charged
  "goodwill",          // discretionary customer-relations credit
] as const);

export type CreditMemoReason = (typeof CREDIT_MEMO_REASONS)[number];

/** Is `reason` a recognized credit-memo reason? */
export function isValidCreditMemoReason(reason: string): reason is CreditMemoReason {
  return (CREDIT_MEMO_REASONS as readonly string[]).includes(reason);
}
