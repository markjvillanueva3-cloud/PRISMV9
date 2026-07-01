/**
 * sales-order-policy.ts — sales-order fulfillment policy for the PRISM ERP (galaxy:business).
 *
 * Imported by SalesOrderEngine — the fulfillment status state-machine is SHOP POLICY, not engine
 * logic; per business/CLAUDE.md §8.7 (anti-pattern: inlining customer/shop terms) it lives here so a
 * policy change is one edit, not a code hunt. Sister file to estimate-policy.ts (which owns the
 * upstream Estimate FSM) — together they encode the QB sales workflow:
 *   Estimate(draft→sent→accepted→converted) → SalesOrder(open→partial→fulfilled) → Invoice → Payment.
 *
 * Not statutory — these are JM Die / shop-configurable conventions, distinct from the IRS/DOR tables
 * in sales-tax-rates.ts / depreciation-tables.ts / form-1099-thresholds.ts.
 */

export const SALES_ORDER_POLICY_SCHEMA_VERSION = "1.0.0";

export const SALES_ORDER_STATUSES = ["open", "partial", "fulfilled", "cancelled"] as const;
export type SalesOrderStatus = (typeof SALES_ORDER_STATUSES)[number];

/**
 * Valid status transitions (a finite-state machine). A sales order can only move along these edges;
 * any other transition THROWS (fail-loud — never silently accept e.g. re-opening a fulfilled order).
 *
 * Flow:
 *  - open      → an order with zero shipments. Can begin shipping (→partial), complete in one shot
 *                (→fulfilled, e.g. a single fully-shipped line), or be cancelled (→cancelled).
 *  - partial   → at least one unit shipped but the order is not yet complete. Continues shipping
 *                (self-edge omitted: a same-status move is a no-op, validated separately), completes
 *                (→fulfilled), or is cancelled with goods already out the door (→cancelled, flagged).
 *  - fulfilled → every ordered unit shipped. TERMINAL — does not re-open or cancel (the goods shipped;
 *                a return is a separate credit-memo flow, not a status reversal here).
 *  - cancelled → TERMINAL absorbing state. A cancel after partial shipment is allowed (the engine
 *                flags the already-shipped qty), but a cancelled order cannot resume shipping.
 */
export const SALES_ORDER_STATUS_TRANSITIONS: Readonly<Record<SalesOrderStatus, readonly SalesOrderStatus[]>> = Object.freeze({
  open: ["partial", "fulfilled", "cancelled"],
  partial: ["fulfilled", "cancelled"],
  fulfilled: [],
  cancelled: [],
});

export function isValidSalesOrderTransition(from: SalesOrderStatus, to: SalesOrderStatus): boolean {
  return SALES_ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
