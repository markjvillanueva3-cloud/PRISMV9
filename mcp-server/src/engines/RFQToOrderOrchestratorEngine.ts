/**
 * RFQToOrderOrchestratorEngine (G9) — RFQ → quote-draft → admin-gate → send → order.
 *
 * State machine that stitches the existing CustomerPortalEngine + QuoteAutopilotEngine
 * + AIProposalApprovalQueueEngine + OrderManagerEngine into a single orchestrated flow:
 *
 *   rfq_received → quote_drafted → admin_review → sent_to_customer →
 *     customer_accepted → order_created
 *   (alt) admin_review → rejected | edited (admin edits then approves)
 *   (alt) sent_to_customer → customer_rejected | expired
 *
 * The quote-draft step submits through G5 admin queue — admin sees the AI's
 * draft + can edit before customer-send.
 *
 * Hotel-soul invariants: PII-free (customer_id only), R12, Object.frozen,
 * financial-invariant aware (quote totals in bigint cents to-the-cent).
 *
 * @module RFQToOrderOrchestratorEngine
 * @milestone HOTEL/U-RFQ-TO-ORDER (2026-05-26, slot:hotel iter8 /goal Phase 3)
 */

import { aiProposalApprovalQueueEngine } from "./AIProposalApprovalQueueEngine.js";

export type RfqOrderStatus =
  | "rfq_received"
  | "quote_drafted"        // AI drafted, awaiting admin
  | "admin_approved"       // admin OK'd the draft, ready to send
  | "sent_to_customer"     // shipped to customer for acceptance
  | "customer_accepted"    // customer accepted, ready for order creation
  | "order_created"        // OrderManagerEngine record opened
  | "customer_rejected"
  | "admin_rejected"
  | "expired";

export interface RfqIntake {
  rfq_id: string;
  customer_id: string;
  /** ISO-8601 — drives expiry. */
  received_at: string;
  /** Description (PII-free spec text). */
  description: string;
  /** Required-by date (ISO-8601). */
  required_by: string;
}

export interface QuoteDraft {
  line_items: ReadonlyArray<{
    description: string;
    qty: number;
    unit_price_cents: bigint;
  }>;
  /** Total in cents — must equal sum(qty × unit_price_cents). */
  total_cents: bigint;
  /** Promised lead-time days. */
  lead_time_days: number;
  /** Quote-validity window (days). */
  valid_for_days: number;
}

/**
 * Inbox/triage status -- the ESTIMATOR-WORKFLOW vocabulary the RFQInbox page works in
 * (who is reviewing an RFQ + a coarse pipeline state), DISTINCT from the FSM `status` above.
 * The FSM `status` is the canonical order-lifecycle state with strict transition guards; this
 * `inbox_status` is an orthogonal triage facet the front desk uses to assign + track work, and
 * setting it NEVER touches the FSM. (U-HOTEL-RFQ-ASSIGN, gap #2 of HOTEL-ERP-FRONTEND-WIRING-SPEC.)
 */
export type RfqInboxStatus = "received" | "reviewing" | "quoted" | "won" | "lost";

const ALLOWED_INBOX_STATUSES = new Set<RfqInboxStatus>([
  "received", "reviewing", "quoted", "won", "lost",
]);

export interface OrchestratorRecord {
  id: string;
  rfq: RfqIntake;
  status: RfqOrderStatus;
  draft?: QuoteDraft;
  /** AIProposal id for admin review (G5). */
  ai_proposal_id?: string;
  /** Customer-facing quote id once admin approves. */
  quote_id?: string;
  /** Order id once customer accepts. */
  order_id?: string;
  /** Estimator assigned to triage this RFQ (RFQInbox page). Orthogonal to the order FSM. */
  assignee_id?: string;
  /** Display name of the assigned estimator (denormalized for the inbox list view). */
  assignee_name?: string;
  /** Triage state for the inbox view (received/reviewing/quoted/won/lost). NOT the FSM `status`. */
  inbox_status?: RfqInboxStatus;
  status_history: ReadonlyArray<{
    at: string;
    from: RfqOrderStatus;
    to: RfqOrderStatus;
    by_actor: string;
    note?: string;
  }>;
}

export interface SystemVizRoost {
  engine_name: string;
  layer: number;
  node_type: "hub" | "sink" | "source" | "orphan" | "ghost" | "normal";
  psn_legs: ReadonlyArray<number>;
  edges_out: ReadonlyArray<string>;
  edges_in: ReadonlyArray<string>;
}

const ALLOWED_STATUSES = new Set<RfqOrderStatus>([
  "rfq_received", "quote_drafted", "admin_approved", "sent_to_customer",
  "customer_accepted", "order_created", "customer_rejected", "admin_rejected",
  "expired",
]);

class RFQToOrderOrchestratorEngine {
  private records: Map<string, OrchestratorRecord> = new Map();
  private nextId = 1;
  private nextQuoteId = 1;
  private nextOrderId = 1;

  /** Operator records an inbound RFQ from a customer. */
  receiveRfq(args: {
    rfq: RfqIntake;
    received_by_subsystem: string;
  }): OrchestratorRecord {
    this.validateRfq(args.rfq);
    if (!args.received_by_subsystem) {
      throw new Error(
        "RFQToOrderOrchestratorEngine.receiveRfq: received_by_subsystem required",
      );
    }
    const id = `RFQORD-${String(this.nextId++).padStart(6, "0")}`;
    const now = new Date().toISOString();
    const rec: OrchestratorRecord = Object.freeze({
      id,
      rfq: Object.freeze({ ...args.rfq }),
      status: "rfq_received" as const,
      status_history: Object.freeze([
        Object.freeze({
          at: now,
          from: "rfq_received" as RfqOrderStatus,
          to: "rfq_received" as RfqOrderStatus,
          by_actor: args.received_by_subsystem,
          note: "RFQ ingested",
        }),
      ]),
    });
    this.records.set(id, rec);
    return rec;
  }

  /**
   * AI quote-autopilot drafts a quote — record the draft + submit to G5 admin
   * queue for sign-off. status: rfq_received → quote_drafted
   */
  draftQuote(args: {
    record_id: string;
    draft: QuoteDraft;
    explanation_ref: string;
    submitter_subsystem: string;
  }): OrchestratorRecord {
    const r = this.requireRec(args.record_id);
    if (r.status !== "rfq_received") {
      throw new Error(
        `RFQToOrderOrchestratorEngine.draftQuote: status must be 'rfq_received' (got '${r.status}')`,
      );
    }
    this.validateDraft(args.draft);
    if (!args.explanation_ref) {
      throw new Error(
        "RFQToOrderOrchestratorEngine.draftQuote: explanation_ref required (Hotel AI invariant)",
      );
    }
    const proposal = aiProposalApprovalQueueEngine.submit({
      kind: "auto_quote",
      submitter_subsystem: args.submitter_subsystem,
      payload: {
        rfq_id: r.rfq.rfq_id,
        customer_id: r.rfq.customer_id,
        line_items: args.draft.line_items,
        total_cents: args.draft.total_cents.toString(), // bigint → string for JSON safety
        lead_time_days: args.draft.lead_time_days,
        valid_for_days: args.draft.valid_for_days,
      },
      explanation_ref: args.explanation_ref,
      affected_departments: ["sales"],
      ttl_minutes: 720,
    });
    return this.transition(r, "quote_drafted", args.submitter_subsystem, {
      draft: Object.freeze({
        ...args.draft,
        line_items: Object.freeze(args.draft.line_items.map((li) => Object.freeze({ ...li }))),
      }),
      ai_proposal_id: proposal.id,
    }, `quote drafted via AI, G5 proposal=${proposal.id}`);
  }

  /**
   * Admin approved the quote-draft via the G5 queue — orchestrator records
   * the customer-facing quote id, status: quote_drafted → admin_approved
   */
  markAdminApproved(args: {
    record_id: string;
    by_admin_employee_id: string;
  }): OrchestratorRecord {
    const r = this.requireRec(args.record_id);
    if (r.status !== "quote_drafted") {
      throw new Error(
        `RFQToOrderOrchestratorEngine.markAdminApproved: status must be 'quote_drafted' (got '${r.status}')`,
      );
    }
    if (!args.by_admin_employee_id) {
      throw new Error(
        "RFQToOrderOrchestratorEngine.markAdminApproved: by_admin_employee_id required",
      );
    }
    const quoteId = `Q-${String(this.nextQuoteId++).padStart(6, "0")}`;
    return this.transition(r, "admin_approved", args.by_admin_employee_id, {
      quote_id: quoteId,
    }, `admin approved, quote_id=${quoteId}`);
  }

  /** Admin rejected the quote-draft. status: quote_drafted → admin_rejected */
  markAdminRejected(args: {
    record_id: string;
    by_admin_employee_id: string;
    reason: string;
  }): OrchestratorRecord {
    const r = this.requireRec(args.record_id);
    if (r.status !== "quote_drafted") {
      throw new Error(
        `RFQToOrderOrchestratorEngine.markAdminRejected: status must be 'quote_drafted' (got '${r.status}')`,
      );
    }
    if (!args.reason || args.reason.trim().length === 0) {
      throw new Error("RFQToOrderOrchestratorEngine.markAdminRejected: reason required");
    }
    return this.transition(r, "admin_rejected", args.by_admin_employee_id, {}, args.reason);
  }

  /** Quote sent to customer. status: admin_approved → sent_to_customer */
  markSentToCustomer(args: {
    record_id: string;
    by_subsystem: string;
  }): OrchestratorRecord {
    const r = this.requireRec(args.record_id);
    if (r.status !== "admin_approved") {
      throw new Error(
        `RFQToOrderOrchestratorEngine.markSentToCustomer: status must be 'admin_approved' (got '${r.status}')`,
      );
    }
    return this.transition(r, "sent_to_customer", args.by_subsystem, {}, "quote dispatched to customer");
  }

  /** Customer accepted → orchestrator creates the order. */
  markCustomerAccepted(args: {
    record_id: string;
    by_subsystem: string;
  }): OrchestratorRecord {
    const r = this.requireRec(args.record_id);
    if (r.status !== "sent_to_customer") {
      throw new Error(
        `RFQToOrderOrchestratorEngine.markCustomerAccepted: status must be 'sent_to_customer' (got '${r.status}')`,
      );
    }
    const acceptedR = this.transition(r, "customer_accepted", args.by_subsystem, {}, "customer accepted");
    const orderId = `ORD-${String(this.nextOrderId++).padStart(6, "0")}`;
    return this.transition(acceptedR, "order_created", args.by_subsystem, { order_id: orderId }, `order_id=${orderId}`);
  }

  markCustomerRejected(args: {
    record_id: string;
    reason: string;
  }): OrchestratorRecord {
    const r = this.requireRec(args.record_id);
    if (r.status !== "sent_to_customer") {
      throw new Error(
        `RFQToOrderOrchestratorEngine.markCustomerRejected: status must be 'sent_to_customer' (got '${r.status}')`,
      );
    }
    if (!args.reason || args.reason.trim().length === 0) {
      throw new Error("RFQToOrderOrchestratorEngine.markCustomerRejected: reason required");
    }
    return this.transition(r, "customer_rejected", "customer", {}, args.reason);
  }

  /** Sweep RFQ records past their required_by date that haven't reached order_created. */
  expireOverdue(args: { now_iso?: string }): ReadonlyArray<string> {
    const now = args.now_iso !== undefined ? Date.parse(args.now_iso) : Date.now();
    if (!Number.isFinite(now)) {
      throw new Error(
        `RFQToOrderOrchestratorEngine.expireOverdue: invalid now_iso '${args.now_iso}'`,
      );
    }
    const expired: string[] = [];
    for (const r of this.records.values()) {
      if (
        r.status === "order_created" ||
        r.status === "expired" ||
        r.status === "admin_rejected" ||
        r.status === "customer_rejected"
      ) continue;
      const reqByMs = Date.parse(r.rfq.required_by);
      if (!Number.isFinite(reqByMs) || now < reqByMs) continue;
      this.transition(r, "expired", "system", {}, "required_by date passed without order_created");
      expired.push(r.id);
    }
    return Object.freeze(expired);
  }

  getRecord(record_id: string): OrchestratorRecord {
    return Object.freeze({ ...this.requireRec(record_id) });
  }

  /**
   * Assign an estimator to triage this RFQ (RFQInbox page). Mutates ONLY the triage facet
   * (assignee_id/assignee_name); the order FSM `status` and its transition guards are untouched.
   * Throws on an unknown record_id (mirrors the markX transition methods' fail-loud contract).
   * @param args - record_id + assignee_id (the estimator's employee/user id), optional display name.
   * @returns the updated frozen record.
   */
  assign(args: { record_id: string; assignee_id: string; assignee_name?: string }): OrchestratorRecord {
    if (!args.assignee_id) {
      throw new Error("RFQToOrderOrchestratorEngine.assign: assignee_id required");
    }
    const r = this.requireRec(args.record_id);
    // Records in the store are frozen (immutable-update pattern, like the markX transitions). Build a
    // new record with ONLY the triage facet changed -- FSM status + status_history are carried over verbatim.
    // A re-assign that omits assignee_name PRESERVES the prior name (a name-less reassign must not wipe it).
    const next: OrchestratorRecord = Object.freeze({
      ...r,
      assignee_id: args.assignee_id,
      assignee_name: args.assignee_name ?? r.assignee_name,
    });
    this.records.set(r.id, next);
    return next;
  }

  /**
   * Set the inbox/triage status (received/reviewing/quoted/won/lost) for the RFQInbox view.
   * This is the front-desk triage facet, DISTINCT from the order-lifecycle FSM `status` -- it is
   * a free-set field (no transition guard) because triage is operator-driven, not a state machine.
   * Throws on an unknown record_id or an invalid inbox_status.
   * @param args - record_id + inbox_status.
   * @returns the updated frozen record.
   */
  updateInboxStatus(args: { record_id: string; inbox_status: RfqInboxStatus }): OrchestratorRecord {
    if (!ALLOWED_INBOX_STATUSES.has(args.inbox_status)) {
      throw new Error(
        `RFQToOrderOrchestratorEngine.updateInboxStatus: invalid inbox_status '${args.inbox_status}' ` +
          `(allowed: ${[...ALLOWED_INBOX_STATUSES].join(", ")})`,
      );
    }
    const r = this.requireRec(args.record_id);
    // Immutable update -- replace the frozen record with the triage facet changed; FSM untouched.
    const next: OrchestratorRecord = Object.freeze({ ...r, inbox_status: args.inbox_status });
    this.records.set(r.id, next);
    return next;
  }

  /**
   * List records, optionally filtered. `status` filters the order FSM state; `inbox_status` filters the
   * orthogonal estimator-triage facet (the RFQInbox page filter); `assignee_id` filters by assigned
   * estimator. The two status filters are validated against their OWN vocabularies -- passing an inbox
   * value (e.g. 'reviewing') as `status` is rejected, and vice-versa, so the two never conflate.
   */
  listRecords(args: {
    customer_id?: string;
    status?: RfqOrderStatus;
    inbox_status?: RfqInboxStatus;
    assignee_id?: string;
  } = {}): ReadonlyArray<OrchestratorRecord> {
    if (args.status !== undefined && !ALLOWED_STATUSES.has(args.status)) {
      throw new Error(
        `RFQToOrderOrchestratorEngine.listRecords: invalid status filter '${args.status}'`,
      );
    }
    if (args.inbox_status !== undefined && !ALLOWED_INBOX_STATUSES.has(args.inbox_status)) {
      throw new Error(
        `RFQToOrderOrchestratorEngine.listRecords: invalid inbox_status filter '${args.inbox_status}'`,
      );
    }
    const out: OrchestratorRecord[] = [];
    for (const r of this.records.values()) {
      if (args.customer_id && r.rfq.customer_id !== args.customer_id) continue;
      if (args.status && r.status !== args.status) continue;
      if (args.inbox_status && (r.inbox_status ?? "received") !== args.inbox_status) continue;
      if (args.assignee_id && r.assignee_id !== args.assignee_id) continue;
      out.push(Object.freeze({ ...r }));
    }
    return Object.freeze(out);
  }

  systemVizRoost(): SystemVizRoost {
    return Object.freeze({
      engine_name: "RFQToOrderOrchestratorEngine",
      layer: 7,
      node_type: "hub",
      psn_legs: Object.freeze([7, 11]),
      edges_out: Object.freeze([
        "AIProposalApprovalQueueEngine",
        "OrderManagerEngine",
        "CustomerPortalEngine",
      ]),
      edges_in: Object.freeze([
        "QuoteAutopilotEngine",
        "QuoteEstimatorEngine",
        "ProspectiveCustomerEngine",
      ]),
    });
  }

  // ─── helpers ───────────────────────────────────────────────────────────

  private validateRfq(rfq: RfqIntake): void {
    if (!rfq) throw new Error("RFQToOrderOrchestratorEngine: rfq required");
    if (!rfq.rfq_id) throw new Error("RFQToOrderOrchestratorEngine: rfq.rfq_id required");
    if (!rfq.customer_id) throw new Error("RFQToOrderOrchestratorEngine: rfq.customer_id required");
    if (!Number.isFinite(Date.parse(rfq.received_at))) {
      throw new Error(`RFQToOrderOrchestratorEngine: rfq.received_at invalid '${rfq.received_at}'`);
    }
    if (!Number.isFinite(Date.parse(rfq.required_by))) {
      throw new Error(`RFQToOrderOrchestratorEngine: rfq.required_by invalid '${rfq.required_by}'`);
    }
    if (!rfq.description || rfq.description.trim().length === 0) {
      throw new Error("RFQToOrderOrchestratorEngine: rfq.description required");
    }
  }

  private validateDraft(d: QuoteDraft): void {
    if (!d) throw new Error("RFQToOrderOrchestratorEngine: draft required");
    if (!Array.isArray(d.line_items) || d.line_items.length === 0) {
      throw new Error("RFQToOrderOrchestratorEngine: draft.line_items must be non-empty array");
    }
    if (typeof d.total_cents !== "bigint") {
      throw new Error(
        "RFQToOrderOrchestratorEngine: draft.total_cents must be a bigint (PII-safe currency invariant)",
      );
    }
    if (d.total_cents < 0n) {
      throw new Error(
        `RFQToOrderOrchestratorEngine: draft.total_cents must be non-negative (got ${d.total_cents})`,
      );
    }
    // Verify line items sum to total_cents (financial invariant)
    let sum = 0n;
    for (const li of d.line_items) {
      if (!Number.isFinite(li.qty) || li.qty <= 0) {
        throw new Error(
          `RFQToOrderOrchestratorEngine: line_item qty must be > 0 (got ${li.qty})`,
        );
      }
      if (typeof li.unit_price_cents !== "bigint" || li.unit_price_cents < 0n) {
        throw new Error(
          `RFQToOrderOrchestratorEngine: line_item.unit_price_cents must be non-negative bigint`,
        );
      }
      sum += BigInt(Math.round(li.qty)) * li.unit_price_cents;
    }
    if (sum !== d.total_cents) {
      throw new Error(
        `RFQToOrderOrchestratorEngine: draft.total_cents (${d.total_cents}) does not equal sum(qty × unit_price) (${sum}) — financial invariant`,
      );
    }
    if (!Number.isInteger(d.lead_time_days) || d.lead_time_days <= 0) {
      throw new Error(
        `RFQToOrderOrchestratorEngine: draft.lead_time_days must be positive integer (got ${d.lead_time_days})`,
      );
    }
    if (!Number.isInteger(d.valid_for_days) || d.valid_for_days <= 0) {
      throw new Error(
        `RFQToOrderOrchestratorEngine: draft.valid_for_days must be positive integer (got ${d.valid_for_days})`,
      );
    }
  }

  private requireRec(id: string): OrchestratorRecord {
    const r = this.records.get(id);
    if (!r) {
      throw new Error(`RFQToOrderOrchestratorEngine: unknown record_id '${id}'`);
    }
    return r;
  }

  private transition(
    r: OrchestratorRecord,
    to: RfqOrderStatus,
    by_actor: string,
    patch: Partial<OrchestratorRecord>,
    note: string,
  ): OrchestratorRecord {
    const now = new Date().toISOString();
    const updated: OrchestratorRecord = Object.freeze({
      ...r,
      ...patch,
      status: to,
      status_history: Object.freeze([
        ...r.status_history,
        Object.freeze({
          at: now,
          from: r.status,
          to,
          by_actor,
          note,
        }),
      ]),
    });
    this.records.set(r.id, updated);
    return updated;
  }

  reset(): void {
    this.records.clear();
    this.nextId = 1;
    this.nextQuoteId = 1;
    this.nextOrderId = 1;
  }
}

export const rfqToOrderOrchestratorEngine = new RFQToOrderOrchestratorEngine();
