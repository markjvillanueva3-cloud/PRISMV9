/**
 * CADRevisionPromotionWorkflowEngine — U-FS-04 (PHASE-47)
 *
 * State machine for CAD revision promotion lifecycle.
 *
 * Legal transitions:
 *   draft       → in_review       (submitForReview)
 *   draft       → rejected        (reject)
 *   in_review   → released        (release, requires ≥2 approvals from DISTINCT
 *                                  approvers; when released, any prior released
 *                                  rev for the same drawing becomes superseded
 *                                  and loses its current-pointer)
 *   in_review   → draft           (revoke)
 *   in_review   → rejected        (reject)
 *   released    → superseded      (auto, on newer release)
 *   released    → obsolete        (decommission)
 *
 * Immutability: released records cannot re-enter draft/in_review (except via
 * rollback, which creates a new draft revision seeded from the released one).
 *
 * @module engines/CADRevisionPromotionWorkflowEngine
 */

import {
  PromotionRecordSchema,
  type PromotionRecord,
  type PromotionState,
  type ApprovalRecord,
  type TransitionEvent,
} from "../schemas/cadRevisionPromotionSchema.js";

const MIN_APPROVERS = 2;

function nowIso(clock?: () => string): string {
  return (clock ?? (() => new Date().toISOString()))();
}

function keyOf(drawingNumber: string, revision: string): string {
  return `${drawingNumber}::${revision}`;
}

export interface PromotionWorkflowClock {
  now(): string;
}

export class CADRevisionPromotionWorkflowEngine {
  private records = new Map<string, PromotionRecord>();
  private clock: PromotionWorkflowClock;

  constructor(clock?: PromotionWorkflowClock) {
    this.clock = clock ?? { now: () => new Date().toISOString() };
  }

  // ── Read accessors ─────────────────────────────────────────────────────────

  get recordCount(): number {
    return this.records.size;
  }

  getRecord(drawingNumber: string, revision: string): PromotionRecord | undefined {
    return this.records.get(keyOf(drawingNumber, revision));
  }

  listByDrawing(drawingNumber: string): PromotionRecord[] {
    return [...this.records.values()].filter(
      (r) => r.drawingNumber === drawingNumber,
    );
  }

  getCurrent(drawingNumber: string): PromotionRecord | undefined {
    return [...this.records.values()].find(
      (r) => r.drawingNumber === drawingNumber && r.isCurrent,
    );
  }

  // ── Create (draft) ─────────────────────────────────────────────────────────

  createDraft(
    drawingNumber: string,
    revision: string,
    actorId: string,
  ): PromotionRecord {
    const k = keyOf(drawingNumber, revision);
    if (this.records.has(k)) {
      throw new Error(`Revision ${k} already exists`);
    }
    const ts = this.clock.now();
    const rec: PromotionRecord = {
      drawingNumber,
      revision,
      state: "draft",
      approvals: [],
      history: [
        {
          from: "draft",
          to: "draft",
          actorId,
          timestamp: ts,
          reason: "created",
        },
      ],
      isCurrent: false,
      createdAt: ts,
      updatedAt: ts,
    };
    const parsed = PromotionRecordSchema.parse(rec);
    this.records.set(k, parsed);
    return parsed;
  }

  // ── Transitions ────────────────────────────────────────────────────────────

  submitForReview(
    drawingNumber: string,
    revision: string,
    actorId: string,
    reason?: string,
  ): PromotionRecord {
    const rec = this.mustGet(drawingNumber, revision);
    this.assertTransition(rec.state, "in_review");
    const next = this.patchTransition(rec, "in_review", actorId, reason);
    return this.store(next);
  }

  revokeToDraft(
    drawingNumber: string,
    revision: string,
    actorId: string,
    reason?: string,
  ): PromotionRecord {
    const rec = this.mustGet(drawingNumber, revision);
    this.assertTransition(rec.state, "draft");
    // Clear approvals when revoked
    const withCleared: PromotionRecord = { ...rec, approvals: [] };
    const next = this.patchTransition(withCleared, "draft", actorId, reason);
    return this.store(next);
  }

  reject(
    drawingNumber: string,
    revision: string,
    actorId: string,
    reason?: string,
  ): PromotionRecord {
    const rec = this.mustGet(drawingNumber, revision);
    this.assertTransition(rec.state, "rejected");
    const next = this.patchTransition(rec, "rejected", actorId, reason);
    return this.store(next);
  }

  /** Record a single approval during in_review. */
  addApproval(
    drawingNumber: string,
    revision: string,
    approval: Omit<ApprovalRecord, "timestamp"> & { timestamp?: string },
  ): PromotionRecord {
    const rec = this.mustGet(drawingNumber, revision);
    if (rec.state !== "in_review") {
      throw new Error(
        `Cannot add approval in state ${rec.state}; must be in_review`,
      );
    }
    if (rec.approvals.some((a) => a.approverId === approval.approverId)) {
      throw new Error(`Approver ${approval.approverId} already signed`);
    }
    const ts = approval.timestamp ?? this.clock.now();
    const nextApprovals: ApprovalRecord[] = [
      ...rec.approvals,
      { ...approval, timestamp: ts },
    ];
    const next: PromotionRecord = {
      ...rec,
      approvals: nextApprovals,
      updatedAt: ts,
    };
    return this.store(next);
  }

  /** Release from in_review → released; requires ≥2 distinct approvers. */
  release(
    drawingNumber: string,
    revision: string,
    actorId: string,
    reason?: string,
  ): PromotionRecord {
    const rec = this.mustGet(drawingNumber, revision);
    this.assertTransition(rec.state, "released");
    if (rec.approvals.length < MIN_APPROVERS) {
      throw new Error(
        `Release requires ${MIN_APPROVERS} approvers; got ${rec.approvals.length}`,
      );
    }
    const distinct = new Set(rec.approvals.map((a) => a.approverId)).size;
    if (distinct < MIN_APPROVERS) {
      throw new Error(
        `Release requires ${MIN_APPROVERS} DISTINCT approvers; got ${distinct}`,
      );
    }
    // Supersede prior current
    const priorCurrent = this.getCurrent(drawingNumber);
    if (priorCurrent && priorCurrent.revision !== revision) {
      const ts = this.clock.now();
      const superseded: PromotionRecord = {
        ...priorCurrent,
        state: "superseded",
        isCurrent: false,
        supersededBy: revision,
        updatedAt: ts,
        history: [
          ...priorCurrent.history,
          {
            from: priorCurrent.state,
            to: "superseded",
            actorId,
            timestamp: ts,
            reason: `superseded by ${revision}`,
          },
        ],
      };
      this.store(superseded);
    }
    // Promote this one
    const promoted: PromotionRecord = {
      ...this.patchTransition(rec, "released", actorId, reason),
      isCurrent: true,
    };
    return this.store(promoted);
  }

  /** Decommission released → obsolete. */
  decommission(
    drawingNumber: string,
    revision: string,
    actorId: string,
    reason?: string,
  ): PromotionRecord {
    const rec = this.mustGet(drawingNumber, revision);
    this.assertTransition(rec.state, "obsolete");
    const next: PromotionRecord = {
      ...this.patchTransition(rec, "obsolete", actorId, reason),
      isCurrent: false,
    };
    return this.store(next);
  }

  /**
   * Rollback: create a new draft revision seeded from a prior released one.
   * Released revisions are immutable — this produces a NEW record, it does
   * not mutate the released one.
   */
  rollback(
    drawingNumber: string,
    fromRevision: string,
    newRevision: string,
    actorId: string,
    reason?: string,
  ): PromotionRecord {
    const src = this.mustGet(drawingNumber, fromRevision);
    if (src.state !== "released" && src.state !== "superseded") {
      throw new Error(
        `Can only rollback from released/superseded revisions; source is ${src.state}`,
      );
    }
    const draft = this.createDraft(drawingNumber, newRevision, actorId);
    const ts = this.clock.now();
    const seeded: PromotionRecord = {
      ...draft,
      history: [
        ...draft.history,
        {
          from: "draft",
          to: "draft",
          actorId,
          timestamp: ts,
          reason: `rollback from ${fromRevision}${reason ? `: ${reason}` : ""}`,
        },
      ],
      updatedAt: ts,
    };
    return this.store(seeded);
  }

  // ── Transition guard ───────────────────────────────────────────────────────

  private assertTransition(from: PromotionState, to: PromotionState): void {
    const legal: Record<PromotionState, PromotionState[]> = {
      draft: ["in_review", "rejected"],
      in_review: ["released", "draft", "rejected"],
      released: ["superseded", "obsolete"],
      rejected: [], // terminal
      superseded: ["obsolete"],
      obsolete: [], // terminal
    };
    if (!legal[from].includes(to)) {
      throw new Error(`Illegal transition ${from} → ${to}`);
    }
  }

  private mustGet(drawingNumber: string, revision: string): PromotionRecord {
    const rec = this.getRecord(drawingNumber, revision);
    if (!rec) {
      throw new Error(`No record for ${drawingNumber}::${revision}`);
    }
    return rec;
  }

  private patchTransition(
    rec: PromotionRecord,
    to: PromotionState,
    actorId: string,
    reason?: string,
  ): PromotionRecord {
    const ts = this.clock.now();
    const ev: TransitionEvent = {
      from: rec.state,
      to,
      actorId,
      timestamp: ts,
      ...(reason ? { reason } : {}),
    };
    return {
      ...rec,
      state: to,
      history: [...rec.history, ev],
      updatedAt: ts,
    };
  }

  private store(rec: PromotionRecord): PromotionRecord {
    const parsed = PromotionRecordSchema.parse(rec);
    this.records.set(keyOf(parsed.drawingNumber, parsed.revision), parsed);
    return parsed;
  }
}

export const cadRevisionPromotionWorkflowEngine =
  new CADRevisionPromotionWorkflowEngine();
