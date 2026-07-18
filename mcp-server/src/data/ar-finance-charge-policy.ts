/**
 * ar-finance-charge-policy.ts — A/R finance-charge + dunning SHOP POLICY for the PRISM ERP
 * (galaxy:business, slot:hotel).
 *
 * Imported by FinanceChargeDunningEngine — NEVER inline a rate, a grace window, a minimum charge,
 * or a dunning threshold in engine code (financial-invariant / anti-pattern #1: these are
 * jurisdiction- and shop-policy-specific, they change over time, and an inlined stale value is a
 * silent over/under-charge = real liability + potential usury violation). This module is the single
 * source of truth.
 *
 * ⚠ HONESTY + LEGAL: a finance/service charge on a past-due A/R balance is INTEREST and is governed
 * by state usury law and (for consumer accounts) the federal Truth-in-Lending Act / Reg Z. The
 * `monthlyRatePct` below (1.5%/mo ≈ 18%/yr) is a common B2B trade-credit rate but is NOT legal advice;
 * RECONCILE against the customer's signed terms and the governing state's usury ceiling before
 * assessing. The `annualRateCapPct` is a HARD usury guard: the engine refuses to assess an effective
 * annualized rate above this cap (the charge is capped, never silently exceeded). JM Die's standard
 * terms (Net 30 + 1.5%/mo on past-due) seed the defaults; extend per contract.
 *
 * Source: JM Die standard A/R terms 2024-2025 + QuickBooks "Finance Charge" preference parity
 * (Edit → Preferences → Finance Charge: annual interest rate, minimum finance charge, grace period,
 * "assess finance charges on overdue finance charges" — we do NOT compound finance-charge-on-
 * finance-charge by default, matching the conservative QB default). schemaVersion bumps on any
 * policy change + add a migration note. Citizens: FinanceChargeDunningEngine.
 */

export const AR_FINANCE_CHARGE_POLICY_SCHEMA_VERSION = "1.0.0";

/**
 * GL accounts a finance charge touches. A finance charge INCREASES the receivable (DR 1200 AR) and
 * is recognized as income (CR 4000 Sales Revenue) — QuickBooks posts finance charges to an income
 * account ("Finance Charge Income" maps to operating revenue in our chart). Imported so the engine
 * never hard-codes an account id.
 */
export const FINANCE_CHARGE_AR_ACCOUNT = "1200"; // Accounts Receivable (asset, debit)
export const FINANCE_CHARGE_INCOME_ACCOUNT = "4000"; // Sales Revenue (revenue, credit)

export interface DunningTier {
  /** inclusive lower bound, in whole days past due, at which this tier applies */
  minDaysOverdue: number;
  /** escalation level — strictly increasing severity across the tier list */
  level: "reminder" | "past_due" | "final_notice" | "collections";
  /** human-facing notice template; `{customer}` `{balance}` `{days}` are substituted by the engine */
  template: string;
}

/**
 * Dunning escalation ladder, ordered by ascending severity. The engine selects the HIGHEST tier
 * whose `minDaysOverdue` ≤ the account's days-overdue. A balance that is current (or within the
 * tiers' floor) yields no notice. JM Die's standard ladder: a friendly reminder at 10 days, a firm
 * past-due at 30, a final notice at 60, hand-off to collections at 90.
 */
export const DUNNING_TIERS: ReadonlyArray<DunningTier> = Object.freeze([
  {
    minDaysOverdue: 10,
    level: "reminder",
    template:
      "Dear {customer}, our records show an open balance of {balance} now {days} days past due. " +
      "This is a friendly reminder — please remit at your earliest convenience or contact A/R if already paid.",
  },
  {
    minDaysOverdue: 30,
    level: "past_due",
    template:
      "Dear {customer}, your account balance of {balance} is {days} days PAST DUE. A finance charge " +
      "applies per your terms. Please remit promptly to avoid further charges.",
  },
  {
    minDaysOverdue: 60,
    level: "final_notice",
    template:
      "FINAL NOTICE — {customer}: your balance of {balance} is {days} days past due. Remit immediately. " +
      "Accounts unpaid beyond 90 days are referred to collections and future orders are placed on credit hold.",
  },
  {
    minDaysOverdue: 90,
    level: "collections",
    template:
      "{customer}: your balance of {balance} ({days} days past due) is being referred to collections. " +
      "Your account is on credit hold. Contact A/R immediately to make arrangements.",
  },
]);

/**
 * The shop's A/R finance-charge policy. All fields are imported by the engine; none are inlined.
 */
export interface ArFinanceChargePolicy {
  /** periodic (monthly) finance-charge rate as a decimal fraction, e.g. 0.015 = 1.5%/mo */
  monthlyRatePct: number;
  /** minimum finance charge floor (USD) applied when a non-zero charge computes below it */
  minCharge: number;
  /** grace period (whole days). Balances ≤ graceDays past due incur NO finance charge */
  graceDays: number;
  /** hard usury ceiling — effective ANNUALIZED rate (decimal). The engine caps the charge so the
   *  annualized effective rate never exceeds this. e.g. 0.45 = 45%/yr (a deliberately conservative
   *  guard well above the 18%/yr standard but below most state criminal-usury ceilings). */
  annualRateCapPct: number;
  /** if false (QB-conservative default) the engine does NOT assess finance charges on prior
   *  finance charges — the caller is responsible for passing principal-only overdue balance */
  compoundOnPriorCharges: boolean;
}

export const AR_FINANCE_CHARGE_POLICY: Readonly<ArFinanceChargePolicy> = Object.freeze({
  monthlyRatePct: 0.015, // 1.5% / month ≈ 18% / year (JM Die standard trade-credit terms)
  minCharge: 5.0, // $5.00 minimum finance charge
  graceDays: 10, // 10-day grace before any finance charge accrues
  annualRateCapPct: 0.45, // 45%/yr hard usury guard (charge is capped, never silently exceeded)
  compoundOnPriorCharges: false,
});
