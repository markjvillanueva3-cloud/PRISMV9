/**
 * PurchaseOrderLifecycleEngine — PO FSM + line-item tracking + change-order trail.
 *
 * Closes the upstream half of the AP cycle: PO drafting → vendor acknowledgement →
 * receipts (via iter34 ShippingReceivingLog) → invoice match (via iter34
 * threeWayMatch) → payment release → close.
 *
 * State machine (8 states, explicit allowed-transitions):
 *
 *   draft ─submit→ submitted ─ack→ acknowledged ─receive(partial)→ partially_received
 *     │                                            │                       │
 *     │                                            └─receive(full)→ received
 *     │                                                                    │
 *     │                                                                    ├─invoice→ invoiced ─pay→ paid ─close→ closed
 *     │                                                                    │
 *     └─cancel→ cancelled (terminal, only from draft|submitted|acknowledged)
 *
 * Bridges:
 *   - ShippingReceivingLogEngine (iter34) — receipts cite po_number; receive() updates state
 *   - VendorPerformanceTrackerEngine (iter29) — on-time-delivery component derives from
 *     PO ack_date vs submit_date AND received_date vs promise_date
 *   - ExecutiveSummaryEngine (iter31) — open-PO count by state surfaces as workload signal
 *
 * Hotel-soul: cents-resolution unit_price_cents (integer), PII-free (vendor_id +
 * employee_id only), Object.frozen, R12 fail-loud, change-order trail required for
 * any post-acknowledgement line edit (silent clobber prohibited).
 *
 * @module PurchaseOrderLifecycleEngine
 * @milestone HOTEL/U-PO-LIFECYCLE (2026-05-26, slot:hotel iter35 /yolo)
 */

export type POState =
  | "draft"
  | "submitted"
  | "acknowledged"
  | "partially_received"
  | "received"
  | "invoiced"
  | "paid"
  | "closed"
  | "cancelled";

export type Uom = "ea" | "lb" | "kg" | "ft" | "m" | "in" | "mm" | "hr";

export interface POLineInput {
  line_id: string;
  part_number: string;
  qty_ordered: number;
  unit_price_cents: number;     // integer cents — never fractional pennies
  uom: Uom;
  promise_date: string;         // YYYY-MM-DD
}

export interface POLine extends POLineInput {
  qty_received: number;         // running tally, ≤ qty_ordered (over-receipt rejected upstream)
  qty_invoiced: number;
  qty_paid: number;
  line_extension_cents: number; // qty_ordered × unit_price_cents (integer)
}

export interface PurchaseOrderInput {
  po_number: string;
  vendor_id: string;
  buyer_employee_id: string;
  approver_employee_id: string; // must differ from buyer (segregation of duties)
  po_date: string;              // YYYY-MM-DD
  currency: "USD" | "EUR" | "GBP" | "CAD" | "MXN";
  lines: ReadonlyArray<POLineInput>;
}

export interface PurchaseOrder {
  po_number: string;
  vendor_id: string;
  buyer_employee_id: string;
  approver_employee_id: string;
  po_date: string;
  currency: PurchaseOrderInput["currency"];
  lines: ReadonlyArray<POLine>;
  state: POState;
  state_history: ReadonlyArray<{
    from: POState | null;
    to: POState;
    at: string;
    by_employee_id: string;
    reason?: string;
  }>;
  change_orders: ReadonlyArray<{
    change_id: string;
    at: string;
    by_employee_id: string;
    reason: string;
    field: string;
    old_value: string;
    new_value: string;
  }>;
  total_extension_cents: number;
  generated_at: string;
}

/** Explicit allowed transitions — anything not listed is rejected with R12 error. */
const ALLOWED_TRANSITIONS: Readonly<Record<POState, ReadonlyArray<POState>>> = Object.freeze({
  draft:              Object.freeze(["submitted", "cancelled"] as POState[]),
  submitted:          Object.freeze(["acknowledged", "cancelled"] as POState[]),
  acknowledged:       Object.freeze(["partially_received", "received", "cancelled"] as POState[]),
  partially_received: Object.freeze(["partially_received", "received"] as POState[]),  // self-loop for additional partial
  received:           Object.freeze(["invoiced"] as POState[]),
  invoiced:           Object.freeze(["paid"] as POState[]),
  paid:               Object.freeze(["closed"] as POState[]),
  closed:             Object.freeze([] as POState[]),                                 // terminal
  cancelled:          Object.freeze([] as POState[]),                                 // terminal
});

const UOMS: ReadonlyArray<Uom> = ["ea", "lb", "kg", "ft", "m", "in", "mm", "hr"];
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "MXN"] as const;

class PurchaseOrderLifecycleEngine {
  /** Create a fresh PO in draft state. */
  createPO(input: PurchaseOrderInput): PurchaseOrder {
    this.validateCreateInput(input);
    const lines = input.lines.map((l) => this.materializeLine(l));
    const totalExt = lines.reduce((a, l) => a + l.line_extension_cents, 0);
    return Object.freeze({
      po_number: input.po_number,
      vendor_id: input.vendor_id,
      buyer_employee_id: input.buyer_employee_id,
      approver_employee_id: input.approver_employee_id,
      po_date: input.po_date,
      currency: input.currency,
      lines: Object.freeze(lines.map((l) => Object.freeze(l))),
      state: "draft" as POState,
      state_history: Object.freeze([
        Object.freeze({
          from: null,
          to: "draft" as POState,
          at: new Date().toISOString(),
          by_employee_id: input.buyer_employee_id,
        }),
      ]),
      change_orders: Object.freeze([]),
      total_extension_cents: totalExt,
      generated_at: new Date().toISOString(),
    });
  }

  /** Transition PO to a new state if and only if the transition is in ALLOWED_TRANSITIONS. */
  transition(
    po: PurchaseOrder,
    to: POState,
    by_employee_id: string,
    reason?: string,
  ): PurchaseOrder {
    if (!by_employee_id || typeof by_employee_id !== "string") {
      throw new Error("PurchaseOrderLifecycleEngine: by_employee_id must be non-empty string");
    }
    const allowed = ALLOWED_TRANSITIONS[po.state];
    if (!allowed || !allowed.includes(to)) {
      throw new Error(
        `PurchaseOrderLifecycleEngine: invalid transition ${po.state} → ${to} (allowed from ${po.state}: ${allowed.join(", ") || "none — terminal state"})`,
      );
    }
    // Segregation of duties on submit: approver must differ from buyer.
    if (to === "submitted" && po.approver_employee_id === po.buyer_employee_id) {
      throw new Error(
        "PurchaseOrderLifecycleEngine: approver_employee_id must differ from buyer_employee_id (segregation of duties)",
      );
    }
    return Object.freeze({
      ...po,
      lines: po.lines,                  // already frozen
      state: to,
      state_history: Object.freeze([
        ...po.state_history,
        Object.freeze({
          from: po.state,
          to,
          at: new Date().toISOString(),
          by_employee_id,
          ...(reason ? { reason } : {}),
        }),
      ]),
      change_orders: po.change_orders,
      generated_at: new Date().toISOString(),
    });
  }

  /**
   * Record a receipt against a PO line — updates qty_received and may auto-advance
   * state to partially_received or received. Over-receipt rejected (use a change
   * order to expand qty_ordered if vendor mis-pick must be accepted).
   */
  recordReceipt(
    po: PurchaseOrder,
    line_id: string,
    qty: number,
    by_employee_id: string,
  ): PurchaseOrder {
    if (po.state !== "acknowledged" && po.state !== "partially_received") {
      throw new Error(
        `PurchaseOrderLifecycleEngine: cannot record receipt against PO in state ${po.state}`,
      );
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error("PurchaseOrderLifecycleEngine: receipt qty must be > 0");
    }

    let touchedLine = false;
    const newLines = po.lines.map((l) => {
      if (l.line_id !== line_id) return l;
      touchedLine = true;
      const newReceived = l.qty_received + qty;
      if (newReceived > l.qty_ordered) {
        throw new Error(
          `PurchaseOrderLifecycleEngine: over-receipt on line ${line_id} (received ${newReceived} > ordered ${l.qty_ordered}); file change order first`,
        );
      }
      return Object.freeze({ ...l, qty_received: newReceived });
    });
    if (!touchedLine) {
      throw new Error(`PurchaseOrderLifecycleEngine: line_id ${line_id} not found on PO ${po.po_number}`);
    }

    // Derive new state from line tallies.
    const allFull = newLines.every((l) => l.qty_received >= l.qty_ordered);
    const anyPartial = newLines.some((l) => l.qty_received > 0);
    const nextState: POState =
      allFull ? "received"
      : anyPartial ? "partially_received"
      : po.state;

    const stateChanged = nextState !== po.state;
    return Object.freeze({
      ...po,
      lines: Object.freeze(newLines),
      state: nextState,
      state_history: stateChanged
        ? Object.freeze([
            ...po.state_history,
            Object.freeze({
              from: po.state,
              to: nextState,
              at: new Date().toISOString(),
              by_employee_id,
              reason: `receipt qty=${qty} on line ${line_id}`,
            }),
          ])
        : po.state_history,
      change_orders: po.change_orders,
      generated_at: new Date().toISOString(),
    });
  }

  /**
   * Append a change order (audit trail). Required for any post-acknowledgement
   * edit to qty/price/uom. Engine never lets you mutate a posted PO silently —
   * either go through this method or fail loud.
   */
  appendChangeOrder(
    po: PurchaseOrder,
    change: Readonly<{
      change_id: string;
      by_employee_id: string;
      reason: string;
      field: string;
      old_value: string;
      new_value: string;
    }>,
  ): PurchaseOrder {
    if (po.state === "draft") {
      throw new Error(
        "PurchaseOrderLifecycleEngine: change orders are unnecessary in draft state — edit the PO directly before submit",
      );
    }
    if (!change.change_id || !change.by_employee_id || !change.reason || !change.field) {
      throw new Error("PurchaseOrderLifecycleEngine: change order requires change_id, by_employee_id, reason, field");
    }
    return Object.freeze({
      ...po,
      lines: po.lines,
      change_orders: Object.freeze([
        ...po.change_orders,
        Object.freeze({
          change_id: change.change_id,
          at: new Date().toISOString(),
          by_employee_id: change.by_employee_id,
          reason: change.reason,
          field: change.field,
          old_value: change.old_value,
          new_value: change.new_value,
        }),
      ]),
      generated_at: new Date().toISOString(),
    });
  }

  /** Status summary for dashboards / executive rollups. */
  getStatus(po: PurchaseOrder): Readonly<{
    po_number: string;
    state: POState;
    line_count: number;
    pct_received: number;
    days_open: number;
    total_extension_cents: number;
    cancellable: boolean;
    receivable: boolean;
  }> {
    const totOrdered = po.lines.reduce((a, l) => a + l.qty_ordered, 0);
    const totReceived = po.lines.reduce((a, l) => a + l.qty_received, 0);
    const pct = totOrdered > 0 ? totReceived / totOrdered : 0;
    const days = Math.max(0, Math.floor((Date.now() - Date.parse(`${po.po_date}T00:00:00Z`)) / (24 * 3600 * 1000)));
    return Object.freeze({
      po_number: po.po_number,
      state: po.state,
      line_count: po.lines.length,
      pct_received: pct,
      days_open: days,
      total_extension_cents: po.total_extension_cents,
      cancellable: ALLOWED_TRANSITIONS[po.state].includes("cancelled"),
      receivable: po.state === "acknowledged" || po.state === "partially_received",
    });
  }

  // ─── R12 validation ─────────────────────────────────────────────────────

  private validateCreateInput(input: PurchaseOrderInput): void {
    if (!input || typeof input !== "object") {
      throw new Error("PurchaseOrderLifecycleEngine: input must be an object");
    }
    for (const f of ["po_number", "vendor_id", "buyer_employee_id", "approver_employee_id"] as const) {
      if (!input[f] || typeof input[f] !== "string") {
        throw new Error(`PurchaseOrderLifecycleEngine: ${f} must be non-empty string`);
      }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.po_date)) {
      throw new Error("PurchaseOrderLifecycleEngine: po_date must be ISO YYYY-MM-DD");
    }
    if (!CURRENCIES.includes(input.currency)) {
      throw new Error(`PurchaseOrderLifecycleEngine: currency must be one of ${CURRENCIES.join("|")}`);
    }
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      throw new Error("PurchaseOrderLifecycleEngine: lines must be non-empty array");
    }
    for (const l of input.lines) {
      this.validateLineInput(l);
    }
  }

  private validateLineInput(l: POLineInput): void {
    if (!l || typeof l !== "object") {
      throw new Error("PurchaseOrderLifecycleEngine: line must be an object");
    }
    if (!l.line_id || !l.part_number) {
      throw new Error("PurchaseOrderLifecycleEngine: line.line_id and line.part_number required");
    }
    if (!Number.isFinite(l.qty_ordered) || l.qty_ordered <= 0) {
      throw new Error(`PurchaseOrderLifecycleEngine: line.qty_ordered must be > 0 (got ${l.qty_ordered})`);
    }
    if (!Number.isInteger(l.unit_price_cents) || l.unit_price_cents < 0) {
      throw new Error(
        `PurchaseOrderLifecycleEngine: line.unit_price_cents must be non-negative integer (got ${l.unit_price_cents})`,
      );
    }
    if (!UOMS.includes(l.uom)) {
      throw new Error(`PurchaseOrderLifecycleEngine: line.uom must be one of ${UOMS.join("|")}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(l.promise_date)) {
      throw new Error("PurchaseOrderLifecycleEngine: line.promise_date must be ISO YYYY-MM-DD");
    }
  }

  private materializeLine(l: POLineInput): POLine {
    return {
      ...l,
      qty_received: 0,
      qty_invoiced: 0,
      qty_paid: 0,
      line_extension_cents: Math.round(l.qty_ordered * l.unit_price_cents),
    };
  }
}

export const purchaseOrderLifecycleEngine = new PurchaseOrderLifecycleEngine();
