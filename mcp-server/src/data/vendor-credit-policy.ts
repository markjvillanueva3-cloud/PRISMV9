/**
 * vendor-credit-policy.ts — constants & policy for the QuickBooks-parity Vendor Credit engine
 * (galaxy:business, slot:hotel). Single source of truth for the GL accounts a vendor credit
 * touches and the reason allowlist — so VendorCreditEngine never inlines an account number or a
 * policy value (financial-invariant gate, business/GSD.md §2, [[feedback_hotel_financial_invariant_gate]]).
 *
 * A QB Vendor Credit is the A/P MIRROR of the A/R Credit Memo: a NEGATIVE-expense document born
 * from a return-to-vendor, a vendor refund, or vendor overbilling. Where the A/R credit memo
 * reverses revenue against AR, the vendor credit REVERSES the original PURCHASE — it unwinds
 * `GeneralLedgerEngine.recordPurchase` (DR <expense/asset> / CR 2000 Accounts Payable):
 *   DR 2000 Accounts Payable      (the shop owes the vendor less / has a credit with them)
 *   CR <category-mapped acct>     (the inventory/expense the purchase originally landed is reversed)
 *   CR 2100 Tax Payable           (the input use-tax debited on the purchase is reversed too, if any)
 *
 * REVERSAL-ACCOUNT NOTE — the credit leg MUST target the SAME account `recordPurchase` debited, or
 * the books balance but the wrong account is (un)credited: a silent misstatement the balanced-GL
 * assertion cannot catch. `recordPurchase` routes the original debit by purchase `category`
 * (PURCHASE_CATEGORY_TO_ACCOUNT in GeneralLedgerEngine): materials→1320, tools/consumables→5600,
 * equipment→1500, services/other→5500 (unknown → 5500). The vendor credit therefore carries the
 * purchase `category` and resolves the reversal credit through the SAME map
 * (PURCHASE_CATEGORY_TO_REVERSAL_ACCOUNT below), defaulting to materials (1320) for the common
 * return-to-vendor-of-stock case so legacy callers that omit a category reverse raw materials exactly
 * as before.
 *
 * SIGN NOTE — the tax leg is the deliberate inverse of the A/R CreditMemoEngine tax leg. On the A/R
 * side a credit memo DEBITS 2100 Tax Payable (the SALES-tax liability the shop collected is reversed —
 * reducing a credit balance is a debit). On the A/P side the original purchase DEBITED 2100 Tax
 * Payable (input use-tax is recoverable, so recordPurchase debits 2100 — see GeneralLedgerEngine
 * recordPurchase, the "input tax recoverable" leg). The vendor credit therefore CREDITS 2100 to
 * reverse that debit: the credit here is the exact contra of the purchase's debit (NOT the reversal of
 * an accrued credit balance), and it is the balancing leg against the AP debit (see glLinesForIssue).
 * Both engines name 2100 from constants so the contra-documents balance against the canonical chart
 * the GL posts to.
 *
 * Chart alignment with GeneralLedgerEngine.ts (1000 Cash, 1200 AR, 1300 WIP, 1310 Finished Goods,
 * 1320 Raw Materials, 1500 Equipment, 1600 Accum Deprec, 2000 Accounts Payable, 2100 Tax Payable,
 * 2200 Accrued Payroll, 3000 Owner Equity, 4000 Sales Rev, 5000 COGS, 5100 Materials Exp,
 * 5500 Operating Exp, 5600 Tools/Consumables). All accounts below are existing chart members —
 * no chart extension is required by this engine.
 */

export const VENDOR_CREDIT_POLICY_SCHEMA_VERSION = "1.0.0";

/**
 * Canonical GL accounts a vendor credit posts against (PRISM chart of accounts — all existing).
 * The reversal-credit account is whichever of RAW_MATERIALS / TOOLS_CONSUMABLES / EQUIPMENT /
 * OPERATING_EXPENSES the original purchase debited (resolved by purchase category — see
 * PURCHASE_CATEGORY_TO_REVERSAL_ACCOUNT). Account numbers + names mirror GeneralLedgerEngine's chart.
 */
export const VENDOR_CREDIT_ACCOUNTS = Object.freeze({
  /** Accounts Payable is DEBITED — the shop owes the vendor less (the credit reduces the payable). */
  ACCOUNTS_PAYABLE: Object.freeze({ number: "2000", name: "Accounts Payable", type: "liability" as const }),
  /**
   * The reversal-credit target for a RAW-MATERIALS purchase (recordPurchase category "materials" →
   * 1320). The default reversal account: a return-to-vendor of purchased stock reverses 1320.
   */
  RAW_MATERIALS: Object.freeze({ number: "1320", name: "Raw Materials Inventory", type: "asset" as const }),
  /** The reversal-credit target for a TOOLS/CONSUMABLES purchase (recordPurchase categories → 5600). */
  TOOLS_CONSUMABLES: Object.freeze({ number: "5600", name: "Tools & Consumables Expense", type: "expense" as const }),
  /** The reversal-credit target for an EQUIPMENT (capital) purchase (recordPurchase category → 1500). */
  EQUIPMENT: Object.freeze({ number: "1500", name: "Equipment", type: "asset" as const }),
  /** The reversal-credit target for a SERVICES/OTHER purchase + the unknown-category fallback (→ 5500). */
  OPERATING_EXPENSES: Object.freeze({ number: "5500", name: "Operating Expenses", type: "expense" as const }),
  /** The use-tax debit recorded on the original purchase is reversed (CREDITED) if tax applied. */
  TAX_PAYABLE: Object.freeze({ number: "2100", name: "Tax Payable", type: "liability" as const }),
});

/**
 * Purchase categories a vendor credit can reverse — the SAME taxonomy `recordPurchase` accepts. The
 * vendor credit carries the category of the purchase it reverses so the reversal credit lands on the
 * account `recordPurchase` originally debited (see PURCHASE_CATEGORY_TO_REVERSAL_ACCOUNT). "materials"
 * is the default (return-to-vendor of stock) so legacy callers that omit a category are unchanged.
 */
export const VENDOR_CREDIT_CATEGORIES = Object.freeze([
  "materials",    // → 1320 Raw Materials Inventory
  "tools",        // → 5600 Tools & Consumables Expense
  "consumables",  // → 5600 Tools & Consumables Expense
  "equipment",    // → 1500 Equipment (capital)
  "services",     // → 5500 Operating Expenses
  "other",        // → 5500 Operating Expenses
] as const);

export type VendorCreditCategory = (typeof VENDOR_CREDIT_CATEGORIES)[number];

/** Is `category` a recognized vendor-credit (purchase) category? */
export function isValidVendorCreditCategory(category: string): category is VendorCreditCategory {
  return (VENDOR_CREDIT_CATEGORIES as readonly string[]).includes(category);
}

/**
 * Maps a purchase category to the GL account the reversal credit must target — a faithful mirror of
 * GeneralLedgerEngine.PURCHASE_CATEGORY_TO_ACCOUNT, so a vendor credit unwinds the EXACT account the
 * purchase landed (balanced AND correctly-targeted). Values are the {number,name} pairs above (single
 * source of truth — no inlined numbers). An unknown category falls back to OPERATING_EXPENSES (5500),
 * matching recordPurchase's own `?? "5500"` fallback.
 */
export const PURCHASE_CATEGORY_TO_REVERSAL_ACCOUNT: Readonly<
  Record<VendorCreditCategory, { number: string; name: string }>
> = Object.freeze({
  materials: VENDOR_CREDIT_ACCOUNTS.RAW_MATERIALS,
  tools: VENDOR_CREDIT_ACCOUNTS.TOOLS_CONSUMABLES,
  consumables: VENDOR_CREDIT_ACCOUNTS.TOOLS_CONSUMABLES,
  equipment: VENDOR_CREDIT_ACCOUNTS.EQUIPMENT,
  services: VENDOR_CREDIT_ACCOUNTS.OPERATING_EXPENSES,
  other: VENDOR_CREDIT_ACCOUNTS.OPERATING_EXPENSES,
});

/**
 * Resolve the reversal-credit account for a purchase category. Unknown / undefined → 5500 Operating
 * Expenses (mirrors recordPurchase's fallback). Pure, total, never throws (the create()-time schema
 * already gates the category; this stays defensive for direct callers).
 */
export function reversalAccountForCategory(category: string | undefined): { number: string; name: string } {
  if (category && isValidVendorCreditCategory(category)) {
    return PURCHASE_CATEGORY_TO_REVERSAL_ACCOUNT[category];
  }
  return VENDOR_CREDIT_ACCOUNTS.OPERATING_EXPENSES;
}

/**
 * Allowed reasons for a vendor credit (QB "reason" field). A reason is MANDATORY (audit trail):
 * a reasonless vendor credit is a hole through which an A/P liability can be silently reversed.
 * Mirrors the A/R reason taxonomy, re-cast to the vendor side.
 */
export const VENDOR_CREDIT_REASONS = Object.freeze([
  "return_to_vendor",  // goods returned to the vendor (RTV)
  "vendor_refund",     // vendor issued a refund/credit (e.g. for a short shipment)
  "overbilling",       // the vendor's bill over-charged
  "damaged_goods",     // goods arrived damaged from the vendor
  "price_adjustment",  // negotiated price reduction after the bill
] as const);

export type VendorCreditReason = (typeof VENDOR_CREDIT_REASONS)[number];

/** Is `reason` a recognized vendor-credit reason? */
export function isValidVendorCreditReason(reason: string): reason is VendorCreditReason {
  return (VENDOR_CREDIT_REASONS as readonly string[]).includes(reason);
}

/** Floating-point tolerance (one tenth of a cent) for money reconciliation invariants. */
export const MONEY_RECONCILE_TOLERANCE = 0.001;
