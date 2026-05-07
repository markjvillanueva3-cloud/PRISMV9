/**
 * WetRunCustomerAcceptanceEngine
 * ------------------------------------------------------------
 * Batch-level customer sign-off for wet-run pilot deliveries.
 *
 * The wet-run pilot ends with one or more batches leaving the
 * floor and landing on the customer's dock. Promotion to
 * production cannot clear until the named customer rep has
 * signed off on every batch in the pilot. Four eyes applies:
 * the customer acceptor must NOT be the same identity as the
 * PRISM submitter, and a conditional accept carries a punchlist
 * of items that must each close by a named deadline.
 *
 * States
 *   submitted            — PRISM submitted, waiting on customer
 *   accepted             — customer clean-accepted
 *   conditional          — customer accepted with open punchlist
 *   rejected             — customer rejected; promotion blocked
 *   withdrawn            — PRISM pulled the submission
 *
 * Promotion gate
 *   A pilot can only promote when EVERY submission is in
 *   accepted state and has no open punchlist items. Any
 *   rejected, withdrawn, or outstanding-punchlist submission
 *   counts as a block.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-CUSTOMER-ACCEPT
 */

// ============================================================================
// Constants
// ============================================================================

const MIN_NOTE_CHARS = 40;
const MIN_PUNCHLIST_CHARS = 30;

// ============================================================================
// Types
// ============================================================================

export type SubmissionState =
  | "submitted"
  | "accepted"
  | "conditional"
  | "rejected"
  | "withdrawn";

export interface PunchlistItem {
  id: string;
  description: string;
  due_ts: number;
  closed: boolean;
  closed_ts?: number;
  closed_by?: string;
  close_reason?: string;
}

export interface AcceptanceSubmission {
  id: string;
  pilot_id: string;
  batch_id: string;
  seq: number;
  submitted_ts: number;
  submitted_by: string;
  customer_name: string;
  customer_acceptor: string;
  state: SubmissionState;
  decided_ts?: number;
  decision_notes?: string;
  punchlist: PunchlistItem[];
  withdrawn_ts?: number;
  withdrawn_by?: string;
  withdrawn_reason?: string;
}

export interface SubmitInput {
  pilot_id: string;
  batch_id: string;
  ts: number;
  submitted_by: string;
  customer_name: string;
  customer_acceptor: string;
}

export interface DecideInput {
  submission_id: string;
  ts: number;
  decision: "accepted" | "conditional" | "rejected";
  notes: string;
  punchlist?: Array<{
    description: string;
    due_ts: number;
  }>;
}

export interface ClosePunchItemInput {
  submission_id: string;
  item_id: string;
  ts: number;
  closed_by: string;
  reason: string;
}

export interface WithdrawInput {
  submission_id: string;
  ts: number;
  withdrawn_by: string;
  reason: string;
}

export interface PromotionGate {
  pilot_id: string;
  submission_count: number;
  accepted: number;
  conditional_open: number;
  rejected: number;
  withdrawn: number;
  submitted_pending: number;
  outstanding_punch_items: number;
  ready_to_promote: boolean;
  blockers: string[];
}

export interface Snapshot {
  schemaVersion: 1;
  submissions: AcceptanceSubmission[];
  last_seq_by_pilot: Record<string, number>;
}

// ============================================================================
// Engine
// ============================================================================

export class WetRunCustomerAcceptanceEngine {
  private submissions: AcceptanceSubmission[] = [];
  private lastSeqByPilot = new Map<string, number>();
  private punchCounter = 0;

  // --------------------------------------------------------------------
  // submit — PRISM tenders a batch to the customer
  // --------------------------------------------------------------------
  submit(input: SubmitInput): AcceptanceSubmission {
    this.validateString(input.pilot_id, "pilot_id");
    this.validateString(input.batch_id, "batch_id");
    this.validateString(input.submitted_by, "submitted_by");
    this.validateString(input.customer_name, "customer_name");
    this.validateString(input.customer_acceptor, "customer_acceptor");
    this.validateTs(input.ts);

    if (input.submitted_by === input.customer_acceptor) {
      throw new Error(
        `four-eyes violation: submitter and customer_acceptor must differ`,
      );
    }

    const prev = this.submissions.find(
      (s) =>
        s.pilot_id === input.pilot_id &&
        s.batch_id === input.batch_id &&
        (s.state === "submitted" ||
          s.state === "accepted" ||
          s.state === "conditional"),
    );
    if (prev) {
      throw new Error(
        `active submission exists for pilot ${input.pilot_id} batch ${input.batch_id}: ${prev.id} (${prev.state})`,
      );
    }

    const seq = (this.lastSeqByPilot.get(input.pilot_id) ?? 0) + 1;
    const sub: AcceptanceSubmission = {
      id: `acc:${input.pilot_id}:${seq.toString().padStart(6, "0")}`,
      pilot_id: input.pilot_id,
      batch_id: input.batch_id,
      seq,
      submitted_ts: input.ts,
      submitted_by: input.submitted_by,
      customer_name: input.customer_name,
      customer_acceptor: input.customer_acceptor,
      state: "submitted",
      punchlist: [],
    };
    this.submissions.push(sub);
    this.lastSeqByPilot.set(input.pilot_id, seq);
    return this.clone(sub);
  }

  // --------------------------------------------------------------------
  // decide — customer renders verdict
  // --------------------------------------------------------------------
  decide(input: DecideInput): AcceptanceSubmission {
    const s = this.mustGet(input.submission_id);
    this.validateTs(input.ts);
    if (s.state !== "submitted") {
      throw new Error(
        `cannot decide on submission in state ${s.state}: ${s.id}`,
      );
    }
    if (input.ts < s.submitted_ts) {
      throw new Error(
        `decision ts ${input.ts} precedes submitted ts ${s.submitted_ts}`,
      );
    }
    if (
      typeof input.notes !== "string" ||
      input.notes.trim().length < MIN_NOTE_CHARS
    ) {
      throw new Error(
        `decision notes must be at least ${MIN_NOTE_CHARS} characters`,
      );
    }

    if (input.decision === "conditional") {
      if (!input.punchlist || input.punchlist.length === 0) {
        throw new Error(`conditional accept requires at least one punch item`);
      }
      const seenDesc = new Set<string>();
      for (const p of input.punchlist) {
        if (
          typeof p.description !== "string" ||
          p.description.trim().length < MIN_PUNCHLIST_CHARS
        ) {
          throw new Error(
            `punch description must be at least ${MIN_PUNCHLIST_CHARS} characters`,
          );
        }
        const norm = p.description.trim().toLowerCase();
        if (seenDesc.has(norm)) {
          throw new Error(`duplicate punch description: ${p.description}`);
        }
        seenDesc.add(norm);
        if (!Number.isFinite(p.due_ts) || p.due_ts <= input.ts) {
          throw new Error(
            `punch due_ts must be strictly after decision ts: decision=${input.ts} due=${p.due_ts}`,
          );
        }
      }
    } else if (input.punchlist && input.punchlist.length > 0) {
      throw new Error(
        `only conditional decision may carry a punchlist (decision=${input.decision})`,
      );
    }

    s.state = input.decision;
    s.decided_ts = input.ts;
    s.decision_notes = input.notes.trim();
    if (input.decision === "conditional" && input.punchlist) {
      s.punchlist = input.punchlist.map((p) => ({
        id: this.nextPunchId(s.id),
        description: p.description.trim(),
        due_ts: p.due_ts,
        closed: false,
      }));
    }
    return this.clone(s);
  }

  // --------------------------------------------------------------------
  // closePunchlistItem — ticking off a conditional-accept item
  // --------------------------------------------------------------------
  closePunchlistItem(input: ClosePunchItemInput): AcceptanceSubmission {
    const s = this.mustGet(input.submission_id);
    this.validateString(input.closed_by, "closed_by");
    this.validateTs(input.ts);
    if (s.state !== "conditional") {
      throw new Error(
        `cannot close punch items on submission in state ${s.state}: ${s.id}`,
      );
    }
    if (
      typeof input.reason !== "string" ||
      input.reason.trim().length < MIN_PUNCHLIST_CHARS
    ) {
      throw new Error(
        `close reason must be at least ${MIN_PUNCHLIST_CHARS} characters`,
      );
    }
    const item = s.punchlist.find((p) => p.id === input.item_id);
    if (!item) throw new Error(`punch item not found: ${input.item_id}`);
    if (item.closed) throw new Error(`punch item already closed: ${item.id}`);
    item.closed = true;
    item.closed_ts = input.ts;
    item.closed_by = input.closed_by;
    item.close_reason = input.reason.trim();

    if (s.punchlist.every((p) => p.closed)) {
      s.state = "accepted";
    }
    return this.clone(s);
  }

  // --------------------------------------------------------------------
  // withdraw — PRISM pulls the submission (e.g. NCR discovered late)
  // --------------------------------------------------------------------
  withdraw(input: WithdrawInput): AcceptanceSubmission {
    const s = this.mustGet(input.submission_id);
    this.validateString(input.withdrawn_by, "withdrawn_by");
    this.validateTs(input.ts);
    if (s.state === "withdrawn" || s.state === "rejected") {
      throw new Error(
        `cannot withdraw submission in terminal state ${s.state}`,
      );
    }
    if (
      typeof input.reason !== "string" ||
      input.reason.trim().length < MIN_NOTE_CHARS
    ) {
      throw new Error(`withdraw reason must be at least ${MIN_NOTE_CHARS} characters`);
    }
    s.state = "withdrawn";
    s.withdrawn_ts = input.ts;
    s.withdrawn_by = input.withdrawn_by;
    s.withdrawn_reason = input.reason.trim();
    return this.clone(s);
  }

  // --------------------------------------------------------------------
  // promotionGate — can this pilot ship to production?
  // --------------------------------------------------------------------
  promotionGate(pilotId: string): PromotionGate {
    this.validateString(pilotId, "pilot_id");
    const mine = this.submissions.filter((s) => s.pilot_id === pilotId);
    let accepted = 0;
    let conditionalOpen = 0;
    let rejected = 0;
    let withdrawn = 0;
    let submittedPending = 0;
    let outstandingPunch = 0;
    const blockers: string[] = [];
    for (const s of mine) {
      switch (s.state) {
        case "accepted":
          accepted += 1;
          break;
        case "conditional": {
          const open = s.punchlist.filter((p) => !p.closed).length;
          outstandingPunch += open;
          if (open > 0) {
            conditionalOpen += 1;
            blockers.push(
              `${s.id} has ${open} open punch item(s)`,
            );
          } else {
            accepted += 1;
          }
          break;
        }
        case "rejected":
          rejected += 1;
          blockers.push(`${s.id} rejected`);
          break;
        case "withdrawn":
          withdrawn += 1;
          blockers.push(`${s.id} withdrawn`);
          break;
        case "submitted":
          submittedPending += 1;
          blockers.push(`${s.id} awaiting customer decision`);
          break;
      }
    }
    const ready =
      mine.length > 0 &&
      rejected === 0 &&
      withdrawn === 0 &&
      submittedPending === 0 &&
      conditionalOpen === 0;
    return {
      pilot_id: pilotId,
      submission_count: mine.length,
      accepted,
      conditional_open: conditionalOpen,
      rejected,
      withdrawn,
      submitted_pending: submittedPending,
      outstanding_punch_items: outstandingPunch,
      ready_to_promote: ready,
      blockers,
    };
  }

  // --------------------------------------------------------------------
  // Readers
  // --------------------------------------------------------------------
  getSubmission(id: string): AcceptanceSubmission | undefined {
    const s = this.submissions.find((x) => x.id === id);
    return s ? this.clone(s) : undefined;
  }

  listForPilot(pilotId: string): AcceptanceSubmission[] {
    return this.submissions
      .filter((s) => s.pilot_id === pilotId)
      .map((s) => this.clone(s));
  }

  snapshot(): Snapshot {
    const seq: Record<string, number> = {};
    for (const [k, v] of this.lastSeqByPilot) seq[k] = v;
    return {
      schemaVersion: 1,
      submissions: this.submissions.map((s) => this.clone(s)),
      last_seq_by_pilot: seq,
    };
  }

  // --------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------
  private clone(s: AcceptanceSubmission): AcceptanceSubmission {
    return {
      ...s,
      punchlist: s.punchlist.map((p) => ({ ...p })),
    };
  }

  private mustGet(id: string): AcceptanceSubmission {
    const s = this.submissions.find((x) => x.id === id);
    if (!s) throw new Error(`acceptance submission not found: ${id}`);
    return s;
  }

  private nextPunchId(subId: string): string {
    this.punchCounter += 1;
    return `${subId}:punch:${this.punchCounter.toString().padStart(4, "0")}`;
  }

  private validateString(v: string, label: string): void {
    if (typeof v !== "string" || v.trim().length === 0) {
      throw new Error(`${label} must be a non-empty string`);
    }
  }

  private validateTs(ts: number): void {
    if (!Number.isFinite(ts)) throw new Error(`ts must be finite`);
  }
}

// ============================================================================
// Singleton
// ============================================================================

export const wetRunCustomerAcceptanceEngine =
  new WetRunCustomerAcceptanceEngine();
