/**
 * SalesOrderEngine — sales orders for the PRISM ERP (galaxy:business, slot:hotel).
 *
 * QuickBooks-parity: the "Sales Order" function set (formalize an ACCEPTED estimate into a
 * commitment-to-ship, then track fulfillment line-by-line: ordered / shipped / backordered, with a
 * status FSM open → partial → fulfilled and a cancel path). QB-PARITY-MS0 Phase-2 engine #2 — the
 * middle of the QB A/R sales workflow:
 *   Estimate(accepted) → SalesOrder(this) → Invoice → Payment.
 *
 * Producer: an ACCEPTED EstimateEngine estimate. `EstimateEngine.toSalesOrder(estimate)` (Phase-2 #1)
 * emits the soDraft shape this engine consumes — { fromEstimateId, customerId, lines[{description,
 * quantity, unitPrice, extension}], subtotal, discountAmount, tax, total }. This engine REUSES that
 * output shape verbatim (it does not re-price the lines — pricing/discount/tax are the estimate's
 * settled numbers); it only reconciles them and layers fulfillment tracking on top.
 *
 * PRISM synergy (business/PRISM-NETWORKING-PLATFORM-PLAN.md): the shop-ops producer is the QUOTING
 * galaxy / `quote_to_ship` pipeline → an accepted quote becomes an EstimateEngine estimate → an
 * accepted estimate becomes a sales order HERE. This engine serves BOTH (a) the QuickBooks A/R cycle
 * (the SO is the booked-but-not-yet-invoiced backlog) AND (b) the networking-platform order/payment
 * flow (a marketplace buyer's accepted order is the same SO object, fulfilled as the maker ships).
 *
 * GL effect (deliberately none here): a sales order is a COMMITMENT, not money movement — like the
 * estimate it posts nothing to the GL (no DR/CR). Revenue (DR1200 AR / CR4000 Rev / CR2100 Tax) and
 * COGS/WIP relief are recognized downstream at INVOICE time (GeneralLedgerEngine.recordInvoice /
 * recordWipToCogs), driven off the *shipped* quantities this engine tracks. The booked totals returned
 * here (subtotal/discount/tax/total) are the future-invoice basis, not a current GL posting.
 *
 * Financial-invariant compliance (business/GSD.md §2, refuse-on-violation / fail-loud):
 *  - line extensions reconcile against the draft (Σ rounded extension == draft subtotal) and the
 *    booked total reconciles (subtotal − discount + tax == total); a mismatch THROWS (a malformed
 *    estimate handoff is caught here, not silently shipped).
 *  - half-even (banker's) rounding to the cent — REUSED from SalesUseTaxEngine (roundCentsHalfEven),
 *    never re-implemented.
 *  - shipped ≤ ordered per line (over-ship THROWS — no silent clamp; over-shipping is a physical
 *    inventory error, not a roundable money quantity).
 *  - backorder = ordered − shipped, always ≥ 0 (both-ways reconciliation: ordered == shipped + backorder).
 *  - non-finite / negative qty THROW (Zod .finite().nonnegative() — no silent coercion).
 *  - status moves only along the policy FSM (sales-order-policy.ts) — an illegal transition THROWS.
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wire sales_order_create_from_estimate / sales_order_record_fulfillment / sales_order_backorder_report
// in main post golf-merge. Wiring + golf-merging the stale worktree businessDispatcher.ts here would
// CLOBBER ~438 main actions. See business/QUICKBOOKS-PARITY-PLAN.md.
import { z } from "zod";
import { roundCentsHalfEven } from "../data/money.js";
import {
  isValidSalesOrderTransition,
  SALES_ORDER_POLICY_SCHEMA_VERSION,
  type SalesOrderStatus,
} from "../data/sales-order-policy.js";

/**
 * The line shape produced by EstimateEngine.toSalesOrder() (EstimateLineResult). We re-validate the
 * settled estimate numbers — quantity > 0, unitPrice ≥ 0, extension a finite cent value — so a
 * corrupted handoff fails loud at the boundary instead of polluting fulfillment math downstream.
 */
const DraftLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().finite().positive(),
  unitPrice: z.number().finite().nonnegative(),
  extension: z.number().finite().nonnegative(),
});

/** The soDraft shape — exactly EstimateEngine.toSalesOrder()'s return. */
const SalesOrderDraftSchema = z.object({
  fromEstimateId: z.string().min(1),
  customerId: z.string().min(1),
  lines: z.array(DraftLineSchema).min(1),
  subtotal: z.number().finite().nonnegative(),
  discountAmount: z.number().finite().nonnegative(),
  tax: z.number().finite().nonnegative(),
  total: z.number().finite().nonnegative(),
  // optional explicit id; otherwise derived from the source estimate id
  salesOrderId: z.string().min(1).optional(),
});
export type SalesOrderDraft = z.input<typeof SalesOrderDraftSchema>;

/** A single fulfillment instruction: identify the line (by index OR exact description) + qty shipped. */
const FulfillmentSchema = z
  .object({
    lineIndex: z.number().int().nonnegative().optional(),
    description: z.string().min(1).optional(),
    qtyShipped: z.number().finite().positive(),
  })
  .refine((f) => f.lineIndex !== undefined || f.description !== undefined, {
    message: "fulfillment must identify a line by lineIndex or description",
  });
export type FulfillmentInput = z.input<typeof FulfillmentSchema>;

export interface SalesOrderLine {
  description: string;
  unitPrice: number;
  extension: number;
  ordered: number;
  shipped: number;
  backordered: number; // == ordered − shipped, kept ≥ 0
}

export interface SalesOrder {
  salesOrderId: string;
  fromEstimateId: string;
  customerId: string;
  status: SalesOrderStatus;
  lines: SalesOrderLine[];
  subtotal: number;
  discountAmount: number;
  tax: number;
  total: number;
  policySchemaVersion: string;
}

export interface BackorderReportLine {
  lineIndex: number;
  description: string;
  ordered: number;
  shipped: number;
  backordered: number;
}
export interface BackorderReport {
  salesOrderId: string;
  status: SalesOrderStatus;
  lines: BackorderReportLine[];
  totalOrdered: number;
  totalShipped: number;
  totalBackordered: number;
  fullyShipped: boolean;
}

/** Recompute the order-wide status from per-line shipped/ordered (open / partial / fulfilled). */
function deriveStatusFromLines(lines: SalesOrderLine[]): Extract<SalesOrderStatus, "open" | "partial" | "fulfilled"> {
  const totalOrdered = lines.reduce((s, l) => s + l.ordered, 0);
  const totalShipped = lines.reduce((s, l) => s + l.shipped, 0);
  if (totalShipped <= 0) return "open";
  if (totalShipped >= totalOrdered) return "fulfilled";
  return "partial";
}

export class SalesOrderEngine {
  /**
   * Create a sales order from an accepted-estimate handoff (EstimateEngine.toSalesOrder() output).
   * Re-validates the settled estimate numbers and the reconciliation invariants; sets every line's
   * ordered = quantity, shipped = 0, backordered = ordered; status = "open".
   * @param soDraft the toSalesOrder() shape (fromEstimateId, customerId, lines, subtotal, discountAmount, tax, total)
   * @returns a fresh SalesOrder with fulfillment tracking initialized
   * @throws if any number is non-finite/negative, if Σ line extension ≠ subtotal, or if subtotal − discount + tax ≠ total
   */
  static createFromEstimate(soDraft: SalesOrderDraft): SalesOrder {
    const d = SalesOrderDraftSchema.parse(soDraft); // throws on negative/non-finite/empty-lines

    // Invariant 1: line extensions reconcile to the draft subtotal (catch a corrupted handoff).
    const summedExtensions = roundCentsHalfEven(d.lines.reduce((s, l) => s + l.extension, 0));
    if (summedExtensions !== roundCentsHalfEven(d.subtotal)) {
      throw new Error(
        `[sales-order] line extensions ${summedExtensions} do not reconcile with draft subtotal ${d.subtotal} (estimate ${d.fromEstimateId})`,
      );
    }
    // Invariant 2: the booked total reconciles both ways (subtotal − discount + tax == total).
    const reconciledTotal = roundCentsHalfEven(d.subtotal - d.discountAmount + d.tax);
    if (reconciledTotal !== roundCentsHalfEven(d.total)) {
      throw new Error(
        `[sales-order] subtotal ${d.subtotal} − discount ${d.discountAmount} + tax ${d.tax} = ${reconciledTotal} does not equal draft total ${d.total} (estimate ${d.fromEstimateId})`,
      );
    }
    // Invariant 3: discount cannot exceed subtotal (a clamp upstream that drifted would surface here).
    if (d.discountAmount > d.subtotal) {
      throw new Error(`[sales-order] discount ${d.discountAmount} exceeds subtotal ${d.subtotal} (estimate ${d.fromEstimateId})`);
    }

    const lines: SalesOrderLine[] = d.lines.map((l) => ({
      description: l.description,
      unitPrice: l.unitPrice,
      extension: roundCentsHalfEven(l.extension),
      ordered: l.quantity,
      shipped: 0,
      backordered: l.quantity, // ordered − 0
    }));

    return {
      salesOrderId: d.salesOrderId ?? `SO-${d.fromEstimateId}`,
      fromEstimateId: d.fromEstimateId,
      customerId: d.customerId,
      status: "open",
      lines,
      subtotal: roundCentsHalfEven(d.subtotal),
      discountAmount: roundCentsHalfEven(d.discountAmount),
      tax: roundCentsHalfEven(d.tax),
      total: roundCentsHalfEven(d.total),
      policySchemaVersion: SALES_ORDER_POLICY_SCHEMA_VERSION,
    };
  }

  /**
   * Record a shipment against one line. Increments that line's shipped, recomputes backordered, and
   * advances the order status along the FSM (open→partial→fulfilled). Returns a NEW order (pure — the
   * input is not mutated). Over-shipping THROWS; fulfilling a cancelled/fulfilled order THROWS.
   * @param order the current sales order
   * @param fulfillment { lineIndex | description, qtyShipped }
   * @returns a new SalesOrder reflecting the shipment
   * @throws on unknown line, ambiguous description, qty ≤ 0 / non-finite, over-ship, or a terminal-status order
   */
  static recordFulfillment(order: SalesOrder, fulfillment: FulfillmentInput): SalesOrder {
    const f = FulfillmentSchema.parse(fulfillment); // throws on qty ≤ 0 / non-finite / no identifier

    if (order.status === "cancelled" || order.status === "fulfilled") {
      throw new Error(
        `[sales-order] cannot record fulfillment on a "${order.status}" order ${order.salesOrderId} (terminal status)`,
      );
    }

    // Resolve the target line by index OR exact description (description must be unambiguous).
    let idx: number;
    if (f.lineIndex !== undefined) {
      if (f.lineIndex >= order.lines.length) {
        throw new Error(`[sales-order] lineIndex ${f.lineIndex} out of range (order ${order.salesOrderId} has ${order.lines.length} line(s))`);
      }
      idx = f.lineIndex;
    } else {
      const matches = order.lines.reduce<number[]>((acc, l, i) => (l.description === f.description ? [...acc, i] : acc), []);
      if (matches.length === 0) {
        throw new Error(`[sales-order] no line matches description "${f.description}" (order ${order.salesOrderId})`);
      }
      if (matches.length > 1) {
        throw new Error(`[sales-order] description "${f.description}" matches ${matches.length} lines — use lineIndex (order ${order.salesOrderId})`);
      }
      idx = matches[0];
    }

    const target = order.lines[idx];
    const newShipped = target.shipped + f.qtyShipped;
    // Invariant: shipped ≤ ordered. Over-ship is a physical error — THROW, never clamp.
    if (newShipped > target.ordered) {
      throw new Error(
        `[sales-order] over-ship on line ${idx} "${target.description}": shipping ${f.qtyShipped} on top of ${target.shipped} exceeds ordered ${target.ordered} (order ${order.salesOrderId})`,
      );
    }

    const lines: SalesOrderLine[] = order.lines.map((l, i) =>
      i === idx ? { ...l, shipped: newShipped, backordered: l.ordered - newShipped } : { ...l },
    );

    const nextStatus = deriveStatusFromLines(lines);
    // Advance status along the FSM only when it actually changes (a same-status move is a valid no-op).
    if (nextStatus !== order.status && !isValidSalesOrderTransition(order.status, nextStatus)) {
      throw new Error(`[sales-order] illegal status transition ${order.status} → ${nextStatus} (order ${order.salesOrderId})`);
    }

    return { ...order, status: nextStatus, lines };
  }

  /**
   * Cancel a sales order. Allowed from open or partial (a partial cancel leaves the already-shipped
   * qty in place and is flagged via the returned report-style line data). Cancelling a fulfilled order
   * THROWS (terminal). Returns a NEW order at status "cancelled".
   * @param order the current sales order
   * @returns a new SalesOrder at status "cancelled"
   * @throws on an illegal transition (e.g. fulfilled → cancelled)
   */
  static cancel(order: SalesOrder): SalesOrder {
    if (!isValidSalesOrderTransition(order.status, "cancelled")) {
      throw new Error(`[sales-order] illegal status transition ${order.status} → cancelled (order ${order.salesOrderId})`);
    }
    return { ...order, status: "cancelled" };
  }

  /**
   * Explicitly move the order to a new status along the FSM (escape hatch for orchestration). Most
   * callers use recordFulfillment/cancel which advance status implicitly. Throws on an illegal edge.
   * @throws on an illegal transition
   */
  static transition(order: SalesOrder, to: SalesOrderStatus): SalesOrder {
    if (to === order.status) return { ...order }; // no-op, valid
    if (!isValidSalesOrderTransition(order.status, to)) {
      throw new Error(`[sales-order] illegal status transition ${order.status} → ${to} (order ${order.salesOrderId})`);
    }
    return { ...order, status: to };
  }

  /**
   * Backorder report: per line (ordered − shipped, ≥ 0) plus order-wide rollups. Asserts the both-ways
   * reconciliation ordered == shipped + backordered on every line (fail-loud against any drift).
   * @param order the current sales order
   * @returns a BackorderReport with per-line and total ordered/shipped/backordered + fullyShipped flag
   * @throws if any line's ordered ≠ shipped + backordered (internal-state corruption guard)
   */
  static backorderReport(order: SalesOrder): BackorderReport {
    const lines: BackorderReportLine[] = order.lines.map((l, i) => {
      const backordered = l.ordered - l.shipped;
      if (backordered < 0) {
        throw new Error(`[sales-order] line ${i} "${l.description}" shipped ${l.shipped} exceeds ordered ${l.ordered} (order ${order.salesOrderId})`);
      }
      // Both-ways reconciliation: ordered must equal shipped + backordered exactly.
      if (l.ordered !== l.shipped + backordered) {
        throw new Error(`[sales-order] line ${i} reconciliation failed: ordered ${l.ordered} ≠ shipped ${l.shipped} + backordered ${backordered} (order ${order.salesOrderId})`);
      }
      return { lineIndex: i, description: l.description, ordered: l.ordered, shipped: l.shipped, backordered };
    });
    const totalOrdered = lines.reduce((s, l) => s + l.ordered, 0);
    const totalShipped = lines.reduce((s, l) => s + l.shipped, 0);
    const totalBackordered = lines.reduce((s, l) => s + l.backordered, 0);
    return {
      salesOrderId: order.salesOrderId,
      status: order.status,
      lines,
      totalOrdered,
      totalShipped,
      totalBackordered,
      fullyShipped: totalBackordered === 0,
    };
  }
}

export const salesOrderEngine = SalesOrderEngine;
