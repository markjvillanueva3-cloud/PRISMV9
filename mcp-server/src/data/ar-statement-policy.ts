/**
 * ar-statement-policy.ts — A/R customer-statement policy constants (galaxy:business, slot:hotel).
 *
 * Imported by CustomerStatementEngine — NEVER inline an aging-bucket boundary or an account number
 * in engine code (financial-invariant / anti-pattern #1: aging policy is shop-configurable and
 * changes over time; a stale inlined boundary = mis-aged A/R = wrong collections + wrong allowance
 * for doubtful accounts). This module is the single source of truth for statement policy.
 *
 * QuickBooks parity: QB's customer statement uses 4 aging buckets (Current / 1-30 / 31-60 / 61-90 /
 * 90+) keyed off each open invoice's age relative to the statement "as of" date. PRISM collapses
 * QB's "Current" + "1-30" into a single `current` bucket (age ≤ 30 days) per the spec, then
 * 30<age≤60 → d30, 60<age≤90 → d60, age>90 → d90plus. Boundaries are INCLUSIVE on the upper edge
 * per the spec ("current ≤30, 30<d≤60, 60<d≤90, >90").
 *
 * Source: standard A/R aging schedule (QB Desktop/Online customer statement). schemaVersion bumps on
 * any boundary change + add a migration note. Citizens: CustomerStatementEngine.
 */

export const AR_STATEMENT_POLICY_SCHEMA_VERSION = "1.0.0";

/**
 * Aging-bucket upper-edge boundaries in days, INCLUSIVE.
 *   age ≤ current        → bucket "current"
 *   current < age ≤ d30  → bucket "d30"   (31-60 in QB terms)
 *   d30 < age ≤ d60      → bucket "d60"   (61-90 in QB terms)
 *   age > d60            → bucket "d90plus"
 * Frozen so a caller cannot mutate policy at runtime.
 */
export const AR_AGING_BUCKET_DAYS = Object.freeze({
  /** ≤ this many days old counts as "current" (collapses QB Current + 1-30). */
  current: 30,
  /** > current and ≤ this → 31-60 bucket. */
  d30: 60,
  /** > d30 and ≤ this → 61-90 bucket. Anything older falls into d90plus. */
  d60: 90,
} as const);

/** GL control account customer A/R rolls up to (the asset the statement reconciles against). */
export const ACCOUNTS_RECEIVABLE_ACCOUNT = Object.freeze({ number: "1200", name: "Accounts Receivable", type: "asset" as const });

/** Statement modes — both are QuickBooks-native customer-statement options. */
export const STATEMENT_MODES = Object.freeze(["open-item", "balance-forward"] as const);
export type StatementMode = (typeof STATEMENT_MODES)[number];
