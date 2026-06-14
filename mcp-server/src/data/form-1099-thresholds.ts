/**
 * form-1099-thresholds.ts — canonical Form 1099-NEC reporting rules for the PRISM ERP (galaxy:business).
 *
 * Imported by Form1099NECEngine — NEVER inline a 1099 threshold, reportability rule, or box number in
 * engine code (financial-invariant / anti-pattern #1: these are statutory IRS values; a stale/typo'd
 * inlined threshold = under- or over-reporting = real penalty exposure under IRC §6721/§6722). Single
 * source of truth.
 *
 * Sources:
 *  - IRS Instructions for Forms 1099-MISC and 1099-NEC (Box 1 nonemployee compensation ≥ threshold).
 *  - IRS General Instructions for Certain Information Returns (corporation exemption + its exceptions).
 *  - Treas. Reg. §1.6041-1(a)(1)(iv) — payments by payment card / third-party network are reported by
 *    the payment settlement entity on Form 1099-K, NOT by the payer on 1099-NEC/MISC (payer excludes).
 *
 * ⚠ The NEC reporting threshold is TAX-YEAR-KEYED and it CHANGED: $600 through TY2025, then raised to
 * $2,000 for payments made after 2025-12-31 (TY2026+), indexed for inflation thereafter, by the 2025
 * budget law (H.R.1, "One Big Beautiful Bill Act", §70433). The TY2026 figure + future indexing MUST be
 * reconciled against the final IRS instructions / Rev. Proc. before filing — encoded here so a single
 * canonical update propagates, never guessed inline. getNecThreshold() THROWS on an unknown tax year.
 */

export const FORM_1099_THRESHOLDS_SCHEMA_VERSION = "1.0.0";

/** Box 1 (nonemployee compensation) reporting threshold in whole dollars, by tax year. */
export const NEC_REPORTING_THRESHOLD_BY_YEAR: Readonly<Record<number, number>> = Object.freeze({
  2023: 600,
  2024: 600,
  2025: 600,
  2026: 2000, // H.R.1 (2025) §70433 — raised from $600, indexed thereafter. VERIFY final IRS figure before filing.
});

/**
 * Backup withholding rate (IRC §3406) — 24% since TCJA (2018+). The engine consumes a pre-computed
 * withheld amount (box 4); this constant is the canonical rate for any upstream withholding calc.
 */
export const BACKUP_WITHHOLDING_RATE = 0.24;

/**
 * Payee entity types and whether 1099-NEC is generally required.
 * Corporations (C/S) are EXEMPT from 1099-NEC EXCEPT for attorney legal-services fees (see
 * CORP_EXCEPTION_CATEGORIES). LLCs taxed as corporations are treated as corporations.
 */
export const NEC_REPORTABLE_ENTITY_TYPES: ReadonlySet<string> = new Set([
  "individual",
  "sole_proprietor",
  "partnership",
  "llc_partnership",
  "llc_single_member", // disregarded → reportable
  "estate",
  "trust",
]);

export const NEC_EXEMPT_ENTITY_TYPES: ReadonlySet<string> = new Set([
  "c_corporation",
  "s_corporation",
  "llc_c_corp",
  "llc_s_corp",
  "tax_exempt_org", // 501(c) — generally exempt
  "government",
]);

/**
 * Payment categories that OVERRIDE the corporation exemption — still reportable on 1099-NEC box 1 even
 * if the payee is a corporation. For NEC specifically this is attorney fees for legal services.
 * (Medical/health-care payments are a 1099-MISC box 6 concern, NOT NEC — out of scope for this engine.)
 */
export const CORP_EXCEPTION_CATEGORIES: ReadonlySet<string> = new Set([
  "attorney_legal_services",
]);

/**
 * Payment methods the payer EXCLUDES from 1099-NEC because a payment settlement entity reports them on
 * 1099-K (Reg. §1.6041-1(a)(1)(iv)). Reporting them on 1099-NEC too would double-report the payee.
 */
export const NEC_EXCLUDED_PAYMENT_METHODS: ReadonlySet<string> = new Set([
  "credit_card",
  "debit_card", // industry/QuickBooks convention: debit settles through the same merchant-acquirer/PSE rails as credit → 1099-K, not a distinct reg citation
  "third_party_network", // PayPal, Venmo-business, etc.
  "gift_card",
]);

/** Methods the payer DOES report (cash/check/ACH/wire). Anything not excluded is reportable. */
export const NEC_REPORTABLE_PAYMENT_METHODS: ReadonlySet<string> = new Set([
  "cash",
  "check",
  "ach",
  "wire",
  "eft",
  "other",
]);

/** Form 1099-NEC box numbers (IRS 2024+ layout). */
export const FORM_1099_NEC_BOXES = Object.freeze({
  NONEMPLOYEE_COMPENSATION: 1,
  PAYER_DIRECT_SALES: 2, // $5,000+ consumer-products direct sales indicator (checkbox)
  FEDERAL_TAX_WITHHELD: 4, // backup withholding
});

/** Return the box-1 reporting threshold for a tax year. Throws on a year with no canonical figure. */
export function getNecThreshold(taxYear: number): number {
  if (!Number.isInteger(taxYear)) {
    throw new Error(`[1099-NEC] taxYear must be an integer, got ${taxYear}`);
  }
  const t = NEC_REPORTING_THRESHOLD_BY_YEAR[taxYear];
  if (t === undefined) {
    throw new Error(
      `[1099-NEC] no canonical box-1 threshold for tax year ${taxYear}. ` +
        `Known: ${Object.keys(NEC_REPORTING_THRESHOLD_BY_YEAR).join(", ")}. ` +
        `Add the year to NEC_REPORTING_THRESHOLD_BY_YEAR after confirming the IRS figure — do NOT guess.`
    );
  }
  return t;
}
