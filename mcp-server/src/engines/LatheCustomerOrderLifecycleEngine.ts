/**
 * LatheCustomerOrderLifecycleEngine — U-LTH51 (LATHE-MASTER P5 ERP)
 *
 * State machine for customer order lifecycle:
 *
 *   draft → quoted → accepted → scheduled → in_production → shipped → invoiced → closed
 *                           ↘ rejected           ↘ on_hold
 *
 * Valid transitions (enforced — invalid transitions throw):
 *   draft       → quoted | cancelled
 *   quoted      → accepted | rejected | cancelled
 *   accepted    → scheduled | cancelled
 *   scheduled   → in_production | on_hold | cancelled
 *   in_production → shipped | on_hold | cancelled
 *   on_hold     → scheduled | in_production | cancelled
 *   shipped     → invoiced | returned
 *   invoiced    → closed | disputed
 *   disputed    → invoiced | closed
 *   returned    → refunded | closed
 *   rejected    → closed
 *   cancelled   → closed
 *   closed      → (terminal)
 *
 * Every transition writes an audit event (who, when, why, prior → next).
 * Persistence: state/shared/lathe-order-lifecycle-state.json, schemaVersion=1.
 *
 * Citations:
 *   - ERP order-to-cash canonical flow (SAP / NetSuite equivalents)
 *   - JM Die shop-floor ops: quote → PO → scheduled → traveler → ship → invoice
 *
 * @milestone LATHE-MASTER U-LTH51
 * @version 1.0.0
 */

import { z } from "zod";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { atomicWriteJson } from "../utils/atomicSessionWrite.js";

// ============================================================================
// STATES + TRANSITIONS
// ============================================================================

export const ORDER_STATES = [
  "draft",
  "quoted",
  "accepted",
  "rejected",
  "scheduled",
  "on_hold",
  "in_production",
  "shipped",
  "returned",
  "invoiced",
  "disputed",
  "refunded",
  "cancelled",
  "closed",
] as const;
export type OrderState = (typeof ORDER_STATES)[number];

const TRANSITIONS: Record<OrderState, OrderState[]> = {
  draft: ["quoted", "cancelled"],
  quoted: ["accepted", "rejected", "cancelled"],
  accepted: ["scheduled", "cancelled"],
  rejected: ["closed"],
  scheduled: ["in_production", "on_hold", "cancelled"],
  on_hold: ["scheduled", "in_production", "cancelled"],
  in_production: ["shipped", "on_hold", "cancelled"],
  shipped: ["invoiced", "returned"],
  returned: ["refunded", "closed"],
  invoiced: ["closed", "disputed"],
  disputed: ["invoiced", "closed"],
  refunded: ["closed"],
  cancelled: ["closed"],
  closed: [], // terminal
};

// ============================================================================
// SCHEMAS
// ============================================================================

export const CreateOrderInputSchema = z.object({
  order_id: z.string().min(1),
  customer: z.string().min(1),
  part_number: z.string().min(1),
  quantity: z.number().int().positive(),
  quote_id: z.string().optional(),
  job_id: z.string().optional(),
  priority: z.number().int().min(0).max(100).default(50),
  notes: z.string().optional(),
});
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

export const TransitionInputSchema = z.object({
  order_id: z.string().min(1),
  to_state: z.enum(ORDER_STATES),
  actor: z.string().min(1).default("system"),
  reason: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type TransitionInput = z.infer<typeof TransitionInputSchema>;

// ============================================================================
// DOMAIN TYPES
// ============================================================================

export interface AuditEvent {
  id: string;
  order_id: string;
  from_state: OrderState | null;
  to_state: OrderState;
  actor: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  at: string;
}

export interface OrderRecord {
  order_id: string;
  customer: string;
  part_number: string;
  quantity: number;
  quote_id?: string;
  job_id?: string;
  priority: number;
  state: OrderState;
  created_at: string;
  updated_at: string;
  notes?: string;
}

export interface OrderLifecycleState {
  schemaVersion: 1;
  orders: OrderRecord[];
  audit_log: AuditEvent[];
  next_audit_seq: number;
  updated_at: string;
}

export interface OrderSummaryRow {
  order_id: string;
  customer: string;
  part_number: string;
  state: OrderState;
  quantity: number;
  days_in_current_state: number;
  priority: number;
}

// ============================================================================
// ENGINE
// ============================================================================

const DEFAULT_STATE_PATH = "H:/prism/state/shared/lathe-order-lifecycle-state.json";

class LatheCustomerOrderLifecycleEngine {
  private state: OrderLifecycleState;
  private readonly statePath: string;

  constructor(statePath: string = DEFAULT_STATE_PATH) {
    this.statePath = statePath;
    this.state = this.loadState();
  }

  createOrder(input: CreateOrderInput): OrderRecord {
    const parsed = CreateOrderInputSchema.parse(input);
    if (this.state.orders.some((o) => o.order_id === parsed.order_id)) {
      throw new Error(`LatheCustomerOrderLifecycleEngine: order_id '${parsed.order_id}' already exists`);
    }
    const now = new Date().toISOString();
    const order: OrderRecord = {
      order_id: parsed.order_id,
      customer: parsed.customer,
      part_number: parsed.part_number,
      quantity: parsed.quantity,
      quote_id: parsed.quote_id,
      job_id: parsed.job_id,
      priority: parsed.priority,
      state: "draft",
      created_at: now,
      updated_at: now,
      notes: parsed.notes,
    };
    this.state.orders.push(order);
    this.appendAudit({
      order_id: order.order_id,
      from_state: null,
      to_state: "draft",
      actor: "system",
      reason: "order created",
    });
    this.persist();
    return order;
  }

  transition(input: TransitionInput): OrderRecord {
    const parsed = TransitionInputSchema.parse(input);
    const order = this.state.orders.find((o) => o.order_id === parsed.order_id);
    if (!order) {
      throw new Error(`LatheCustomerOrderLifecycleEngine: order '${parsed.order_id}' not found`);
    }
    const allowed = TRANSITIONS[order.state];
    if (!allowed.includes(parsed.to_state)) {
      throw new Error(
        `LatheCustomerOrderLifecycleEngine: invalid transition ${order.state} → ${parsed.to_state} ` +
          `(allowed: [${allowed.join(", ")}])`,
      );
    }
    const from = order.state;
    order.state = parsed.to_state;
    order.updated_at = new Date().toISOString();
    this.appendAudit({
      order_id: order.order_id,
      from_state: from,
      to_state: parsed.to_state,
      actor: parsed.actor,
      reason: parsed.reason,
      metadata: parsed.metadata,
    });
    this.persist();
    return order;
  }

  getOrder(orderId: string): OrderRecord | null {
    return this.state.orders.find((o) => o.order_id === orderId) ?? null;
  }

  listOrders(filter?: { customer?: string; state?: OrderState }): OrderRecord[] {
    return this.state.orders.filter((o) => {
      if (filter?.customer && o.customer !== filter.customer) return false;
      if (filter?.state && o.state !== filter.state) return false;
      return true;
    });
  }

  getAuditLog(orderId: string): AuditEvent[] {
    return this.state.audit_log.filter((e) => e.order_id === orderId);
  }

  /** Pipeline summary: count per state. */
  pipelineSummary(): Record<OrderState, number> {
    const counts: Record<OrderState, number> = {} as Record<OrderState, number>;
    for (const s of ORDER_STATES) counts[s] = 0;
    for (const order of this.state.orders) {
      counts[order.state]++;
    }
    return counts;
  }

  /** Rows suitable for a web UI table; computes days_in_current_state. */
  asSummaryRows(): OrderSummaryRow[] {
    const now = Date.now();
    return this.state.orders.map((o) => ({
      order_id: o.order_id,
      customer: o.customer,
      part_number: o.part_number,
      state: o.state,
      quantity: o.quantity,
      days_in_current_state: Math.max(
        0,
        Math.round((now - Date.parse(o.updated_at)) / (1000 * 60 * 60 * 24)),
      ),
      priority: o.priority,
    }));
  }

  /** Static helper: list allowed transitions from a given state. */
  allowedTransitions(from: OrderState): OrderState[] {
    return [...TRANSITIONS[from]];
  }

  // ==========================================================================
  // INTERNALS
  // ==========================================================================

  private appendAudit(
    partial: Omit<AuditEvent, "id" | "at"> & { metadata?: Record<string, unknown> },
  ): void {
    const seq = this.state.next_audit_seq++;
    const event: AuditEvent = {
      id: `evt_${seq.toString().padStart(8, "0")}`,
      at: new Date().toISOString(),
      ...partial,
    };
    this.state.audit_log.push(event);
  }

  private loadState(): OrderLifecycleState {
    if (!existsSync(this.statePath)) return this.freshState();
    try {
      const raw = readFileSync(this.statePath, "utf-8");
      const parsed = JSON.parse(raw) as OrderLifecycleState;
      if (parsed.schemaVersion !== 1) {
        throw new Error(`unsupported schemaVersion ${parsed.schemaVersion}`);
      }
      return parsed;
    } catch {
      const backupPath = `${this.statePath}.corrupt.bak`;
      try {
        const raw = readFileSync(this.statePath, "utf-8");
        atomicWriteJson(backupPath, { backup_at: new Date().toISOString(), raw });
      } catch { /* ignore backup failure */ }
      return this.freshState();
    }
  }

  private freshState(): OrderLifecycleState {
    return {
      schemaVersion: 1,
      orders: [],
      audit_log: [],
      next_audit_seq: 1,
      updated_at: new Date().toISOString(),
    };
  }

  private persist(): void {
    this.state.updated_at = new Date().toISOString();
    const dir = dirname(this.statePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    atomicWriteJson(this.statePath, this.state);
  }

  __resetForTests(): void {
    this.state = this.freshState();
    this.persist();
  }

  __getState(): Readonly<OrderLifecycleState> {
    return this.state;
  }
}

export const latheCustomerOrderLifecycleEngine = new LatheCustomerOrderLifecycleEngine();
export { LatheCustomerOrderLifecycleEngine };
