/**
 * PRISM MCP Server — Quote-to-Order Bridge Engine
 *
 * ERP ↔ quoting bridge. Turns a {@link QuoteEstimatorEngine} estimate into an
 * {@link OrderManagerEngine} order (plus per-operation work orders), deriving
 * the order due-date from the quote's lead time and priority from its rush
 * flag.
 *
 * Closes the gap where the only quote→order path was lathe-specific
 * (`LatheJobSchedulingEngine.jobFromQuote`). This engine is process-agnostic:
 * it bridges any quote — mill, turn, sheet-metal, additive — into the generic
 * ERP order lifecycle.
 *
 * U-BRIDGE-ERP-QUOTE (BRIDGE-DEEP).
 *
 * @module QuoteToOrderBridgeEngine
 */

import {
  quoteEstimatorEngine,
  type QuoteEstimateInput,
  type QuoteEstimateResult,
} from "./QuoteEstimatorEngine.js";
import {
  orderManagerEngine,
  type Order,
  type WorkOrder,
} from "./OrderManagerEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** A work-order operation supplied to the bridge (used when bridging a bare
 *  quote result, which carries no operations). */
export interface BridgeOperationSpec {
  /** Operation label, e.g. "rough", "finish", "drill". */
  name: string;
  /** Machine assigned to the operation; falls back to the bridge default. */
  machine?: string;
  /** Per-part cycle time in minutes. */
  cycle_time_min?: number;
  /** One-time setup time in minutes. */
  setup_time_min?: number;
}

/** Options common to both bridge entry points. */
export interface QuoteToOrderOptions {
  /** Customer name — REQUIRED. A quote estimate does not carry a customer. */
  customer: string;
  /** Override part number; otherwise taken from the quote/input. */
  part_number?: string;
  /** Override order priority (1=highest..5); otherwise derived from rush. */
  priority?: number;
  /** Override due date (ISO `YYYY-MM-DD`); otherwise derived from lead time. */
  due_date?: string;
  /** Extra notes appended after the auto-generated quote trace note. */
  notes?: string;
  /** Create per-operation work orders. Default `true`. */
  create_work_orders?: boolean;
  /** Transition the new order draft→confirmed (an accepted quote). Default `false`. */
  confirm?: boolean;
}

/** Options for {@link QuoteToOrderBridgeEngine.createOrderFromQuote} — a bare
 *  {@link QuoteEstimateResult} lacks material and operations, so the caller
 *  supplies them here. */
export interface QuoteToOrderFromResultOptions extends QuoteToOrderOptions {
  /** Workpiece material (the quote result does not carry it). */
  material?: string;
  /** Default machine for work orders whose op spec omits one. */
  machine?: string;
  /** Operations to fan out into work orders (the result carries none). */
  operations?: BridgeOperationSpec[];
}

/** Trace metadata describing how the order was derived from the quote. */
export interface QuoteToOrderBridgeMeta {
  quote_id: string;
  customer: string;
  /** Due date used (override or lead-time-derived). */
  derived_due_date: string;
  /** Priority used (override or rush-derived). */
  derived_priority: number;
  /** Whether the quote was a rush quote. */
  rush: boolean;
  work_order_count: number;
  /** Sum of all work-order estimated times, minutes. */
  total_estimated_minutes: number;
  quote_unit_price: number;
  quote_total_price: number;
}

/** Result of bridging a quote into an order. */
export interface BridgeResult {
  order: Order;
  work_orders: WorkOrder[];
  bridge: QuoteToOrderBridgeMeta;
}

/** Result of {@link QuoteToOrderBridgeEngine.estimateAndCreateOrder} — also
 *  carries the freshly-computed quote. */
export interface EstimateAndOrderResult extends BridgeResult {
  quote: QuoteEstimateResult;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Milliseconds in one day — used only for lead-time → due-date arithmetic. */
const MS_PER_DAY = 86_400_000;

// ============================================================================
// ENGINE
// ============================================================================

// Exported as a singleton to match the two engines it composes —
// QuoteEstimatorEngine + OrderManagerEngine both `export const ...Engine`.
// Repo engine-convention docs conflict on static-class vs singleton; per
// CLAUDE.md R7 + R11 the singleton idiom (more recent, more tested) wins.
class QuoteToOrderBridgeEngine {
  /**
   * Run a fresh quote estimate, then create an ERP order (and per-operation
   * work orders) from it.
   *
   * Work orders inherit the single `input.machine_type` — `QuoteEstimateInput`
   * has no per-operation machine field. For per-operation machine routing, use
   * {@link createOrderFromQuote} with explicit `operations[].machine`.
   *
   * @param input - Quote estimate input (forwarded to `QuoteEstimatorEngine`).
   * @param opts  - Bridge options; `customer` is required.
   * @returns The computed quote, created order, work orders, and trace meta.
   */
  estimateAndCreateOrder(
    input: QuoteEstimateInput,
    opts: QuoteToOrderOptions,
  ): EstimateAndOrderResult {
    this.requireCustomer(opts);
    const quote = quoteEstimatorEngine.estimate(input);
    const partNumber =
      opts.part_number ?? input.part_number ?? input.part_name ?? quote.part_name;
    const operations: BridgeOperationSpec[] = (input.operations ?? []).map((op) => ({
      name: op.name,
      cycle_time_min: op.cycle_time_min,
      setup_time_min: op.setup_time_min,
    }));
    const result = this.bridge(quote, opts, {
      partNumber,
      material: input.material,
      operations,
      defaultMachine: input.machine_type ?? "unassigned",
      rush: input.rush === true,
    });
    return { quote, ...result };
  }

  /**
   * Bridge an already-computed quote estimate into an ERP order (and work
   * orders). Generic counterpart to `LatheJobSchedulingEngine.jobFromQuote`.
   *
   * A bare {@link QuoteEstimateResult} has no material or operations, so those
   * come from `opts`. Rush is inferred from the quote's pricing adjustments.
   *
   * @param quote - A `QuoteEstimatorEngine.estimate()` result.
   * @param opts  - Bridge options; `customer` is required.
   * @returns The created order, work orders, and trace meta.
   */
  createOrderFromQuote(
    quote: QuoteEstimateResult,
    opts: QuoteToOrderFromResultOptions,
  ): BridgeResult {
    this.requireCustomer(opts);
    return this.bridge(quote, opts, {
      partNumber: opts.part_number ?? quote.part_name,
      material: opts.material,
      operations: opts.operations ?? [],
      defaultMachine: opts.machine ?? "unassigned",
      rush: quote.pricing.adjustments.rush_premium_pct != null,
    });
  }

  // ── internals ─────────────────────────────────────────────────────────────

  /** Reject a bridge call that omits the customer (required by `OrderSpec`). */
  private requireCustomer(opts: { customer?: unknown }): void {
    if (
      typeof opts.customer !== "string" ||
      opts.customer.trim() === ""
    ) {
      throw new Error(
        "QuoteToOrderBridge: 'customer' is required — a quote estimate does " +
          "not carry a customer name.",
      );
    }
  }

  /** Shared mapping: quote + context → order + work orders + trace meta. */
  private bridge(
    quote: QuoteEstimateResult,
    opts: QuoteToOrderOptions,
    ctx: {
      partNumber: string;
      material?: string;
      operations: BridgeOperationSpec[];
      defaultMachine: string;
      rush: boolean;
    },
  ): BridgeResult {
    const leadDays = ctx.rush
      ? quote.lead_time.total_rush_days
      : quote.lead_time.total_standard_days;
    const derivedDueDate = opts.due_date ?? isoDatePlusDays(leadDays);
    const derivedPriority = opts.priority ?? (ctx.rush ? 1 : 3);

    const traceNote =
      `Bridged from quote ${quote.quote_id} — unit $${round2(quote.pricing.unit_price)}, ` +
      `total $${round2(quote.pricing.total_price)}, ${quote.confidence_score}% confidence`;
    const notes = opts.notes ? `${traceNote}; ${opts.notes}` : traceNote;

    let order = orderManagerEngine.createOrder({
      customer: opts.customer,
      partNumber: ctx.partNumber,
      quantity: quote.quantity,
      dueDate: derivedDueDate,
      priority: derivedPriority,
      notes,
      material: ctx.material,
    });

    if (opts.confirm === true) {
      // An accepted quote → a confirmed order (not left in draft).
      order = orderManagerEngine.updateOrderStatus(order.id, "confirmed");
    }

    const workOrders: WorkOrder[] = [];
    let totalEstMinutes = 0;
    if (opts.create_work_orders !== false) {
      for (const op of ctx.operations) {
        const cycle = op.cycle_time_min ?? 0;
        const setup = op.setup_time_min ?? 0;
        // Total machine time = per-part cycle × order quantity + one-time setup.
        const estMinutes = round2(cycle * quote.quantity + setup);
        totalEstMinutes += estMinutes;
        workOrders.push(
          orderManagerEngine.createWorkOrder({
            orderId: order.id,
            machine: op.machine ?? ctx.defaultMachine,
            operation: op.name,
            quantity: quote.quantity,
            estimatedTime: estMinutes,
          }),
        );
      }
    }

    return {
      order,
      work_orders: workOrders,
      bridge: {
        quote_id: quote.quote_id,
        customer: opts.customer,
        derived_due_date: derivedDueDate,
        derived_priority: derivedPriority,
        rush: ctx.rush,
        work_order_count: workOrders.length,
        total_estimated_minutes: round2(totalEstMinutes),
        quote_unit_price: quote.pricing.unit_price,
        quote_total_price: quote.pricing.total_price,
      },
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Today + `days` (clamped ≥0, rounded up) as an ISO `YYYY-MM-DD` date. */
function isoDatePlusDays(days: number): string {
  const d = new Date(Date.now() + Math.max(0, Math.ceil(days)) * MS_PER_DAY);
  return d.toISOString().slice(0, 10);
}

export const quoteToOrderBridgeEngine = new QuoteToOrderBridgeEngine();
