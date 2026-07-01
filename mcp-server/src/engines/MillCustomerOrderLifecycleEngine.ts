/**
 * MillCustomerOrderLifecycleEngine
 * ==================================
 *
 * State machine for mill customer order lifecycle.
 *
 * Mill parity for LatheCustomerOrderLifecycleEngine (LATHE-MASTER U-LTH51)
 * with three MILL-CANONICAL states inserted between `scheduled` and
 * `in_production` to model the mill-specific pre-production workflow:
 *
 *   1. fixture_prep         — soft-jaw machining, dowel-locator install,
 *                             sub-plate setup (no lathe analog — lathe
 *                             chuck jaws are pre-bored elsewhere)
 *   2. first_piece_approval — mandatory FAI per AS9102 / iter53 FPA engine
 *                             before bulk production (mill GD&T verify)
 *   3. first_piece_rejected — FPA failed → return to fixture_prep OR
 *                             remain in production-tuning (feedback loop)
 *
 *   draft → quoted → accepted → scheduled → fixture_prep →
 *           first_piece_approval → in_production → shipped →
 *           invoiced → closed
 *
 *                           ↘ rejected     ↘ on_hold
 *                           ↘ first_piece_rejected (loops back to fixture_prep)
 *
 * Lathe-shared states preserved: draft, quoted, accepted, rejected, scheduled,
 * on_hold, in_production, shipped, returned, invoiced, disputed, refunded,
 * cancelled, closed (14 states).
 *
 * Mill state count: 14 shared + 3 canonical = 17 total.
 *
 * Every transition writes an audit event (who, when, why, prior → next).
 * Persistence: state/shared/mill-order-lifecycle-state.json, schemaVersion=1.
 *
 * Citations:
 *   - ERP order-to-cash canonical flow (SAP / NetSuite equivalents)
 *   - AS9102 First Article Inspection (FPA gate)
 *   - JM Die mill shop-floor: quote → PO → schedule → soft-jaws → FPA →
 *     production → ship → invoice
 *
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-CUSTOMER-ORDER-LIFECYCLE (iter77)
 */

import { z } from "zod";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { atomicWriteJson } from "../utils/atomicSessionWrite.js";

// ═══════════════════════════════════════════════════════════════════════
// STATES + TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════

export const MILL_ORDER_STATES = [
  "draft",
  "quoted",
  "accepted",
  "rejected",
  "scheduled",
  "fixture_prep",            // MILL-CANONICAL
  "first_piece_approval",    // MILL-CANONICAL
  "first_piece_rejected",    // MILL-CANONICAL
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
export type MillOrderState = (typeof MILL_ORDER_STATES)[number];

/** MILL-CANONICAL states (not present in lathe lifecycle). */
export const MILL_CANONICAL_STATES = [
  "fixture_prep",
  "first_piece_approval",
  "first_piece_rejected",
] as const;

const TRANSITIONS: Record<MillOrderState, MillOrderState[]> = {
  draft: ["quoted", "cancelled"],
  quoted: ["accepted", "rejected", "cancelled"],
  accepted: ["scheduled", "cancelled"],
  rejected: ["closed"],
  scheduled: ["fixture_prep", "on_hold", "cancelled"], // mill INSERTS fixture_prep
  fixture_prep: ["first_piece_approval", "on_hold", "cancelled"], // mill-canonical
  first_piece_approval: ["in_production", "first_piece_rejected", "on_hold", "cancelled"],
  first_piece_rejected: ["fixture_prep", "first_piece_approval", "cancelled"], // FPA fail-loop
  on_hold: ["scheduled", "fixture_prep", "first_piece_approval", "in_production", "cancelled"],
  in_production: ["shipped", "on_hold", "cancelled"],
  shipped: ["invoiced", "returned"],
  returned: ["refunded", "closed"],
  invoiced: ["closed", "disputed"],
  disputed: ["invoiced", "closed"],
  refunded: ["closed"],
  cancelled: ["closed"],
  closed: [], // terminal
};

// ═══════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════

export const CreateMillOrderInputSchema = z.object({
  order_id: z.string().min(1),
  customer: z.string().min(1),
  part_number: z.string().min(1),
  quantity: z.number().int().positive(),
  quote_id: z.string().optional(),
  job_id: z.string().optional(),
  priority: z.number().int().min(0).max(100).default(50),
  notes: z.string().optional(),
  /** Mill-canonical: which fixture is required for fixture_prep state */
  fixture_id: z.string().optional(),
  /** Mill-canonical: number of FPA features to verify (drives FPA time estimate) */
  fpa_feature_count: z.number().int().min(0).optional(),
});
export type CreateMillOrderInput = z.infer<typeof CreateMillOrderInputSchema>;

export const MillTransitionInputSchema = z.object({
  order_id: z.string().min(1),
  to_state: z.enum(MILL_ORDER_STATES),
  actor: z.string().min(1).default("system"),
  reason: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type MillTransitionInput = z.infer<typeof MillTransitionInputSchema>;

// ═══════════════════════════════════════════════════════════════════════
// DOMAIN TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface MillAuditEvent {
  id: string;
  order_id: string;
  from_state: MillOrderState | null;
  to_state: MillOrderState;
  actor: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  at: string;
}

export interface MillOrderRecord {
  order_id: string;
  customer: string;
  part_number: string;
  quantity: number;
  quote_id?: string;
  job_id?: string;
  fixture_id?: string;
  fpa_feature_count?: number;
  priority: number;
  state: MillOrderState;
  created_at: string;
  updated_at: string;
  notes?: string;
}

export interface MillOrderLifecycleState {
  schemaVersion: 1;
  orders: MillOrderRecord[];
  audit_log: MillAuditEvent[];
  next_audit_seq: number;
  updated_at: string;
}

export interface MillOrderSummaryRow {
  order_id: string;
  customer: string;
  part_number: string;
  state: MillOrderState;
  quantity: number;
  days_in_current_state: number;
  priority: number;
  fixture_id?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

const DEFAULT_STATE_PATH = "H:/prism/state/shared/mill-order-lifecycle-state.json";

class MillCustomerOrderLifecycleEngine {
  private state: MillOrderLifecycleState;
  private readonly statePath: string;

  constructor(statePath: string = DEFAULT_STATE_PATH) {
    this.statePath = statePath;
    this.state = this.loadState();
  }

  createOrder(input: CreateMillOrderInput): MillOrderRecord {
    const parsed = CreateMillOrderInputSchema.parse(input);
    if (this.state.orders.some((o) => o.order_id === parsed.order_id)) {
      throw new Error(`MillCustomerOrderLifecycleEngine: order_id '${parsed.order_id}' already exists`);
    }
    const now = new Date().toISOString();
    const order: MillOrderRecord = {
      order_id: parsed.order_id,
      customer: parsed.customer,
      part_number: parsed.part_number,
      quantity: parsed.quantity,
      quote_id: parsed.quote_id,
      job_id: parsed.job_id,
      fixture_id: parsed.fixture_id,
      fpa_feature_count: parsed.fpa_feature_count,
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

  transition(input: MillTransitionInput): MillOrderRecord {
    const parsed = MillTransitionInputSchema.parse(input);
    const order = this.state.orders.find((o) => o.order_id === parsed.order_id);
    if (!order) {
      throw new Error(`MillCustomerOrderLifecycleEngine: order '${parsed.order_id}' not found`);
    }
    const allowed = TRANSITIONS[order.state];
    if (!allowed.includes(parsed.to_state)) {
      throw new Error(
        `MillCustomerOrderLifecycleEngine: invalid transition ${order.state} → ${parsed.to_state} ` +
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

  getOrder(orderId: string): MillOrderRecord | null {
    return this.state.orders.find((o) => o.order_id === orderId) ?? null;
  }

  listOrders(filter?: { customer?: string; state?: MillOrderState; fixture_id?: string }): MillOrderRecord[] {
    return this.state.orders.filter((o) => {
      if (filter?.customer && o.customer !== filter.customer) return false;
      if (filter?.state && o.state !== filter.state) return false;
      if (filter?.fixture_id && o.fixture_id !== filter.fixture_id) return false;
      return true;
    });
  }

  getAuditLog(orderId: string): MillAuditEvent[] {
    return this.state.audit_log.filter((e) => e.order_id === orderId);
  }

  /** Pipeline summary: count per state. */
  pipelineSummary(): Record<MillOrderState, number> {
    const counts: Record<MillOrderState, number> = {} as Record<MillOrderState, number>;
    for (const s of MILL_ORDER_STATES) counts[s] = 0;
    for (const order of this.state.orders) counts[order.state]++;
    return counts;
  }

  /** Orders currently in the mill-canonical block (fixture_prep / FPA / FPA-rejected). */
  millCanonicalQueueDepth(): {
    fixture_prep: number;
    first_piece_approval: number;
    first_piece_rejected: number;
    total: number;
  } {
    const sum = this.pipelineSummary();
    return {
      fixture_prep: sum.fixture_prep,
      first_piece_approval: sum.first_piece_approval,
      first_piece_rejected: sum.first_piece_rejected,
      total: sum.fixture_prep + sum.first_piece_approval + sum.first_piece_rejected,
    };
  }

  asSummaryRows(): MillOrderSummaryRow[] {
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
      fixture_id: o.fixture_id,
    }));
  }

  allowedTransitions(from: MillOrderState): MillOrderState[] {
    return [...TRANSITIONS[from]];
  }

  getStats(): {
    states: readonly string[];
    state_count: number;
    mill_canonical_states: readonly string[];
    terminal_states: string[];
    reference: string;
  } {
    const terminal = MILL_ORDER_STATES.filter((s) => TRANSITIONS[s].length === 0);
    return {
      states: MILL_ORDER_STATES,
      state_count: MILL_ORDER_STATES.length,
      mill_canonical_states: MILL_CANONICAL_STATES,
      terminal_states: terminal,
      reference: "ERP order-to-cash (SAP/NetSuite); AS9102 FAI; JM Die mill shop flow",
    };
  }

  // ───────────────────────── internals ─────────────────────────────────

  private appendAudit(
    partial: Omit<MillAuditEvent, "id" | "at"> & { metadata?: Record<string, unknown> },
  ): void {
    const seq = this.state.next_audit_seq++;
    const event: MillAuditEvent = {
      id: `evt_${seq.toString().padStart(8, "0")}`,
      at: new Date().toISOString(),
      ...partial,
    };
    this.state.audit_log.push(event);
  }

  private loadState(): MillOrderLifecycleState {
    if (!existsSync(this.statePath)) return this.freshState();
    try {
      const raw = readFileSync(this.statePath, "utf-8");
      const parsed = JSON.parse(raw) as MillOrderLifecycleState;
      if (parsed.schemaVersion !== 1) {
        throw new Error(`unsupported schemaVersion ${parsed.schemaVersion}`);
      }
      return parsed;
    } catch {
      const backupPath = `${this.statePath}.corrupt.bak`;
      try {
        const raw = readFileSync(this.statePath, "utf-8");
        atomicWriteJson(backupPath, { backup_at: new Date().toISOString(), raw });
      } catch { /* ignore */ }
      return this.freshState();
    }
  }

  private freshState(): MillOrderLifecycleState {
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

  __getState(): Readonly<MillOrderLifecycleState> {
    return this.state;
  }
}

export const millCustomerOrderLifecycleEngine = new MillCustomerOrderLifecycleEngine();
export { MillCustomerOrderLifecycleEngine };
