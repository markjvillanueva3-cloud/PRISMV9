/**
 * WetRunSupplierPassThroughEngine
 * ------------------------------------------------------------
 * Tracks outsourced operations ("pass-through" ops) during a
 * wet-run pilot. These are the pieces that leave the shop for a
 * plating house, heat-treater, coater, or anodizer and must
 * come back with matching traveler + CoC before they rejoin
 * the pilot stream.
 *
 * Chain of custody
 *   The shipper and receiver MUST be different identities
 *   (four-eyes) so a single user cannot fabricate a round-trip.
 *   Traveler doc id is captured at ship; CoC doc id is required
 *   at receive. Rejections from the supplier are tracked
 *   separately and force a rework or re-issue decision.
 *
 * States
 *   in_transit_out    — shipped from PRISM, awaiting supplier dock-in
 *   at_supplier       — supplier confirmed receipt
 *   in_transit_back   — supplier shipped back
 *   received          — PRISM dock-in with CoC
 *   rejected_returned — supplier rejected and returned unprocessed
 *
 * Overdue detection
 *   A pass-through is "overdue" when now_ts exceeds
 *   expected_return_ts + grace_hours and state is anything
 *   other than received | rejected_returned.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-PASSTHROUGH
 */

// ============================================================================
// Constants
// ============================================================================

const MIN_NOTE_CHARS = 30;
const HOUR_MS = 60 * 60 * 1000;

// ============================================================================
// Types
// ============================================================================

export type PassThroughProcess =
  | "heat_treat"
  | "plating"
  | "anodize"
  | "coating"
  | "passivation"
  | "magnetic_particle_inspection"
  | "other";

export type PassThroughState =
  | "in_transit_out"
  | "at_supplier"
  | "in_transit_back"
  | "received"
  | "rejected_returned";

export interface PassThroughOp {
  id: string;
  pilot_id: string;
  batch_id: string;
  seq: number;
  process: PassThroughProcess;
  supplier_name: string;
  supplier_po: string;
  ship_ts: number;
  shipped_by: string;
  traveler_doc_id: string;
  expected_return_ts: number;
  quantity: number;
  state: PassThroughState;
  supplier_received_ts?: number;
  supplier_return_ts?: number;
  prism_received_ts?: number;
  received_by?: string;
  coc_doc_id?: string;
  receive_notes?: string;
  reject_ts?: number;
  reject_notes?: string;
  grace_hours: number;
}

export interface ShipInput {
  pilot_id: string;
  batch_id: string;
  ts: number;
  shipped_by: string;
  process: PassThroughProcess;
  supplier_name: string;
  supplier_po: string;
  traveler_doc_id: string;
  expected_return_ts: number;
  quantity: number;
  grace_hours?: number;
}

export interface MarkAtSupplierInput {
  op_id: string;
  ts: number;
}

export interface MarkInTransitBackInput {
  op_id: string;
  ts: number;
}

export interface ReceiveInput {
  op_id: string;
  ts: number;
  received_by: string;
  coc_doc_id: string;
  notes: string;
}

export interface RejectInput {
  op_id: string;
  ts: number;
  notes: string;
}

export interface OverdueReport {
  op_id: string;
  pilot_id: string;
  batch_id: string;
  supplier_name: string;
  state: PassThroughState;
  expected_return_ts: number;
  hours_overdue: number;
}

export interface Snapshot {
  schemaVersion: 1;
  ops: PassThroughOp[];
  last_seq_by_pilot: Record<string, number>;
}

// ============================================================================
// Engine
// ============================================================================

export class WetRunSupplierPassThroughEngine {
  private ops: PassThroughOp[] = [];
  private lastSeqByPilot = new Map<string, number>();

  // --------------------------------------------------------------------
  // ship — PRISM dispatches a batch to a supplier
  // --------------------------------------------------------------------
  ship(input: ShipInput): PassThroughOp {
    this.validateString(input.pilot_id, "pilot_id");
    this.validateString(input.batch_id, "batch_id");
    this.validateString(input.shipped_by, "shipped_by");
    this.validateString(input.supplier_name, "supplier_name");
    this.validateString(input.supplier_po, "supplier_po");
    this.validateString(input.traveler_doc_id, "traveler_doc_id");
    this.validateProcess(input.process);
    this.validateTs(input.ts);
    this.validateTs(input.expected_return_ts);
    this.validatePositiveInt(input.quantity, "quantity");
    if (input.expected_return_ts <= input.ts) {
      throw new Error(
        `expected_return_ts must be after ship ts: ship=${input.ts} expected=${input.expected_return_ts}`,
      );
    }
    const grace = input.grace_hours ?? 24;
    if (!Number.isFinite(grace) || grace < 0) {
      throw new Error(`grace_hours must be a non-negative finite number`);
    }

    const seq = (this.lastSeqByPilot.get(input.pilot_id) ?? 0) + 1;
    const op: PassThroughOp = {
      id: `pt:${input.pilot_id}:${seq.toString().padStart(6, "0")}`,
      pilot_id: input.pilot_id,
      batch_id: input.batch_id,
      seq,
      process: input.process,
      supplier_name: input.supplier_name.trim(),
      supplier_po: input.supplier_po.trim(),
      ship_ts: input.ts,
      shipped_by: input.shipped_by.trim(),
      traveler_doc_id: input.traveler_doc_id.trim(),
      expected_return_ts: input.expected_return_ts,
      quantity: input.quantity,
      state: "in_transit_out",
      grace_hours: grace,
    };
    this.ops.push(op);
    this.lastSeqByPilot.set(input.pilot_id, seq);
    return { ...op };
  }

  // --------------------------------------------------------------------
  // markAtSupplier — supplier confirmed dock-in
  // --------------------------------------------------------------------
  markAtSupplier(input: MarkAtSupplierInput): PassThroughOp {
    const op = this.mustGet(input.op_id);
    this.validateTs(input.ts);
    if (op.state !== "in_transit_out") {
      throw new Error(
        `cannot mark at_supplier from state ${op.state}: ${op.id}`,
      );
    }
    if (input.ts < op.ship_ts) {
      throw new Error(
        `at_supplier ts ${input.ts} precedes ship ts ${op.ship_ts}`,
      );
    }
    op.state = "at_supplier";
    op.supplier_received_ts = input.ts;
    return { ...op };
  }

  // --------------------------------------------------------------------
  // markInTransitBack — supplier shipped processed parts back
  // --------------------------------------------------------------------
  markInTransitBack(input: MarkInTransitBackInput): PassThroughOp {
    const op = this.mustGet(input.op_id);
    this.validateTs(input.ts);
    if (op.state !== "at_supplier") {
      throw new Error(
        `cannot mark in_transit_back from state ${op.state}: ${op.id}`,
      );
    }
    const prev = op.supplier_received_ts ?? op.ship_ts;
    if (input.ts < prev) {
      throw new Error(
        `in_transit_back ts ${input.ts} precedes prior ts ${prev}`,
      );
    }
    op.state = "in_transit_back";
    op.supplier_return_ts = input.ts;
    return { ...op };
  }

  // --------------------------------------------------------------------
  // receive — PRISM dock-in; four-eyes + CoC required
  // --------------------------------------------------------------------
  receive(input: ReceiveInput): PassThroughOp {
    const op = this.mustGet(input.op_id);
    this.validateTs(input.ts);
    this.validateString(input.received_by, "received_by");
    this.validateString(input.coc_doc_id, "coc_doc_id");
    if (op.state !== "in_transit_back") {
      throw new Error(
        `cannot receive from state ${op.state}: ${op.id}`,
      );
    }
    if (input.received_by.trim() === op.shipped_by) {
      throw new Error(
        `four-eyes violation: receiver must differ from shipper (${op.shipped_by})`,
      );
    }
    if (
      typeof input.notes !== "string" ||
      input.notes.trim().length < MIN_NOTE_CHARS
    ) {
      throw new Error(`receive notes must be at least ${MIN_NOTE_CHARS} characters`);
    }
    const prev = op.supplier_return_ts ?? op.ship_ts;
    if (input.ts < prev) {
      throw new Error(
        `receive ts ${input.ts} precedes prior ts ${prev}`,
      );
    }
    op.state = "received";
    op.prism_received_ts = input.ts;
    op.received_by = input.received_by.trim();
    op.coc_doc_id = input.coc_doc_id.trim();
    op.receive_notes = input.notes.trim();
    return { ...op };
  }

  // --------------------------------------------------------------------
  // reject — supplier rejected; parts returned unprocessed
  // --------------------------------------------------------------------
  reject(input: RejectInput): PassThroughOp {
    const op = this.mustGet(input.op_id);
    this.validateTs(input.ts);
    if (op.state === "received" || op.state === "rejected_returned") {
      throw new Error(
        `cannot reject from terminal state ${op.state}: ${op.id}`,
      );
    }
    if (
      typeof input.notes !== "string" ||
      input.notes.trim().length < MIN_NOTE_CHARS
    ) {
      throw new Error(`reject notes must be at least ${MIN_NOTE_CHARS} characters`);
    }
    if (input.ts < op.ship_ts) {
      throw new Error(
        `reject ts ${input.ts} precedes ship ts ${op.ship_ts}`,
      );
    }
    op.state = "rejected_returned";
    op.reject_ts = input.ts;
    op.reject_notes = input.notes.trim();
    return { ...op };
  }

  // --------------------------------------------------------------------
  // overdueAt — which ops are past expected_return_ts + grace?
  // --------------------------------------------------------------------
  overdueAt(nowTs: number): OverdueReport[] {
    this.validateTs(nowTs);
    const out: OverdueReport[] = [];
    for (const op of this.ops) {
      if (op.state === "received" || op.state === "rejected_returned") continue;
      const deadline = op.expected_return_ts + op.grace_hours * HOUR_MS;
      if (nowTs > deadline) {
        out.push({
          op_id: op.id,
          pilot_id: op.pilot_id,
          batch_id: op.batch_id,
          supplier_name: op.supplier_name,
          state: op.state,
          expected_return_ts: op.expected_return_ts,
          hours_overdue: (nowTs - deadline) / HOUR_MS,
        });
      }
    }
    return out.sort((a, b) => b.hours_overdue - a.hours_overdue);
  }

  // --------------------------------------------------------------------
  // openCountForPilot — how many ops are still out/back
  // --------------------------------------------------------------------
  openCountForPilot(pilotId: string): number {
    this.validateString(pilotId, "pilot_id");
    return this.ops.filter(
      (o) =>
        o.pilot_id === pilotId &&
        o.state !== "received" &&
        o.state !== "rejected_returned",
    ).length;
  }

  // --------------------------------------------------------------------
  // Readers
  // --------------------------------------------------------------------
  getOp(id: string): PassThroughOp | undefined {
    const op = this.ops.find((x) => x.id === id);
    return op ? { ...op } : undefined;
  }

  listForPilot(pilotId: string): PassThroughOp[] {
    return this.ops
      .filter((o) => o.pilot_id === pilotId)
      .map((o) => ({ ...o }));
  }

  snapshot(): Snapshot {
    const seq: Record<string, number> = {};
    for (const [k, v] of this.lastSeqByPilot) seq[k] = v;
    return {
      schemaVersion: 1,
      ops: this.ops.map((o) => ({ ...o })),
      last_seq_by_pilot: seq,
    };
  }

  // --------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------
  private mustGet(id: string): PassThroughOp {
    const op = this.ops.find((x) => x.id === id);
    if (!op) throw new Error(`pass-through op not found: ${id}`);
    return op;
  }

  private validateString(v: string, label: string): void {
    if (typeof v !== "string" || v.trim().length === 0) {
      throw new Error(`${label} must be a non-empty string`);
    }
  }

  private validateProcess(p: PassThroughProcess): void {
    const allowed: PassThroughProcess[] = [
      "heat_treat",
      "plating",
      "anodize",
      "coating",
      "passivation",
      "magnetic_particle_inspection",
      "other",
    ];
    if (!allowed.includes(p)) {
      throw new Error(`invalid pass-through process: ${p}`);
    }
  }

  private validateTs(ts: number): void {
    if (!Number.isFinite(ts)) throw new Error(`ts must be finite`);
  }

  private validatePositiveInt(v: number, label: string): void {
    if (!Number.isInteger(v) || v < 1) {
      throw new Error(`${label} must be a positive integer`);
    }
  }
}

// ============================================================================
// Singleton
// ============================================================================

export const wetRunSupplierPassThroughEngine =
  new WetRunSupplierPassThroughEngine();
