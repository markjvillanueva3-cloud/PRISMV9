/**
 * estimate-policy.ts — estimate/quote policy for the PRISM ERP (galaxy:business).
 *
 * Imported by EstimateEngine — the default validity window and the status state-machine are SHOP
 * POLICY, not engine logic; per business/CLAUDE.md §8.7 (anti-pattern: inlining customer/shop terms)
 * they live here so a policy change is one edit, not a code hunt. A shop with a 14-day quote validity
 * overrides DEFAULT_ESTIMATE_VALIDITY_DAYS per-estimate or by changing this constant.
 *
 * Not statutory — these are JM Die / shop-configurable conventions, distinct from the IRS/DOR tables
 * in sales-tax-rates.ts / depreciation-tables.ts / form-1099-thresholds.ts.
 */

export const ESTIMATE_POLICY_SCHEMA_VERSION = "1.0.0";

/** Default days an estimate stays valid from its issue date (shop-configurable). */
export const DEFAULT_ESTIMATE_VALIDITY_DAYS = 30;

export const DISCOUNT_TYPES = ["percent", "fixed"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const ESTIMATE_STATUSES = ["draft", "sent", "accepted", "rejected", "expired", "converted"] as const;
export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number];

/**
 * Valid status transitions (a finite-state machine). An estimate can only move along these edges;
 * any other transition THROWS (fail-loud — never silently accept e.g. converting a rejected estimate).
 * draft → sent → accepted → converted (to a sales order); reject/expire are terminal absorbing states.
 */
export const ESTIMATE_STATUS_TRANSITIONS: Readonly<Record<EstimateStatus, readonly EstimateStatus[]>> = Object.freeze({
  draft: ["sent", "accepted", "rejected", "expired"], // accepted-from-draft allowed (verbal accept before formal send)
  sent: ["accepted", "rejected", "expired"],
  accepted: ["converted"], // accepted is committed — it does NOT auto-expire (consistent with EstimateEngine.isExpired immunity)
  rejected: [],
  expired: [],
  converted: [],
});

export function isValidEstimateTransition(from: EstimateStatus, to: EstimateStatus): boolean {
  return ESTIMATE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
