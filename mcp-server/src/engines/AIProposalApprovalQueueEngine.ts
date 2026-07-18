/**
 * AIProposalApprovalQueueEngine — generic admin-approval queue for AI outputs.
 *
 * Every AI subsystem in the substrate (summary writer, auto-scheduler,
 * auto-delegator, quote autopilot, etc.) submits proposals here for admin
 * sign-off BEFORE the proposal takes effect. This is the operator's "AI
 * features throughout with admin approval" requirement materialized.
 *
 * Proposal lifecycle:
 *   submitted → under_review → approved   (admin sign-off → publish)
 *             → under_review → rejected   (admin rejects → log + close)
 *             → under_review → edited     (admin edits payload → approved)
 *             → submitted → expired       (no review past TTL → auto-close)
 *             → submitted → withdrawn     (submitter pulls before review)
 *
 * Composes (R8 read-before-write):
 *   - ApprovalWorkflowEngine: this engine layers a domain-specific queue ON
 *     TOP of the generic ApprovalWorkflow — proposals get an
 *     `approval_workflow_id` link when they need multi-step routing.
 *   - AIDecisionExplanationEngine: every proposal carries an `explanation_ref`
 *     that admin can drill into for the AI's reasoning trace.
 *   - ManagerRegistryEngine: only admins (or rank ≥ admin_min_rank, default
 *     `admin`) may approve/reject; SoD enforced (submitter ≠ approver).
 *
 * Hotel-soul invariants: PII-free, Object.frozen, R12 fail-loud,
 * fail-CLOSED — a proposal cannot be marked `approved` without (a) an active
 * admin-rank approver AND (b) an explicit non-empty rationale field.
 * No auto-approval, no silent overrides.
 *
 * @module AIProposalApprovalQueueEngine
 * @milestone HOTEL/U-AI-PROPOSAL-APPROVAL-QUEUE (2026-05-26, slot:hotel iter6 /goal Phase 1 P0)
 */

import { managerRegistryEngine, type Rank } from "./ManagerRegistryEngine.js";

export type ProposalStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "edited_and_approved"
  | "expired"
  | "withdrawn";

export type ProposalKind =
  | "ai_summary" // narrative summary (daily/weekly/monthly)
  | "auto_schedule" // job-schedule diff proposal
  | "auto_delegation" // task-handoff proposal
  | "auto_quote" // AI-drafted quote
  | "auto_remediation" // AI-suggested fix for a problem
  | "auto_extraction" // extracted facts pending review
  | "auto_recommendation"; // generic AI rec

export interface AIProposal {
  id: string;
  kind: ProposalKind;
  submitter_subsystem: string; // engine class name or subsystem id
  submitted_at: string;
  /** ISO-8601 timestamp; after this, proposal auto-expires unless reviewed. */
  expires_at: string;
  /** The AI-generated payload (summary text, schedule diff, etc.). */
  payload: Readonly<Record<string, unknown>>;
  /** Reference to the AIDecisionExplanationEngine record for the reasoning trace. */
  explanation_ref: string;
  /** Optional link to an ApprovalWorkflowEngine multi-step chain. */
  approval_workflow_id?: string;
  /** Affected dept code(s) — drives routing to the right dept manager + admin. */
  affected_departments: ReadonlyArray<string>;
  status: ProposalStatus;
  reviewed_at?: string;
  reviewer_employee_id?: string;
  decision_rationale?: string;
  /** When status=edited_and_approved, the admin's edited payload. */
  edited_payload?: Readonly<Record<string, unknown>>;
  audit_trail: ReadonlyArray<ProposalAudit>;
}

export interface ProposalAudit {
  at: string;
  by_employee_id: string;
  operation:
    | "submit"
    | "begin_review"
    | "approve"
    | "reject"
    | "edit_and_approve"
    | "expire"
    | "withdraw";
  note?: string;
}

export interface QueueStats {
  total: number;
  by_status: Readonly<Partial<Record<ProposalStatus, number>>>;
  by_kind: Readonly<Partial<Record<ProposalKind, number>>>;
  oldest_pending_age_minutes: number | null;
  approval_rate_pct: number | null; // approved / (approved + rejected + edited)
}

const ALLOWED_STATUSES = new Set<ProposalStatus>([
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "edited_and_approved",
  "expired",
  "withdrawn",
]);

const ALLOWED_KINDS = new Set<ProposalKind>([
  "ai_summary",
  "auto_schedule",
  "auto_delegation",
  "auto_quote",
  "auto_remediation",
  "auto_extraction",
  "auto_recommendation",
]);

class AIProposalApprovalQueueEngine {
  private proposals: Map<string, AIProposal> = new Map();
  private nextId = 1;
  /** Minimum rank required to approve; defaults to `admin` per operator directive 2026-05-26. */
  private adminMinRank: Rank = "admin";

  /**
   * Override the approval-floor rank. Use cautiously — defaults to `admin`
   * per the operator's "admin approval" requirement; lowering this opens
   * AI proposals to lower-rank approvers.
   */
  setAdminMinRank(rank: Rank): void {
    this.adminMinRank = rank;
  }

  getAdminMinRank(): Rank {
    return this.adminMinRank;
  }

  /**
   * AI subsystem submits a proposal for admin sign-off.
   * Payload is opaque (subsystem-specific); explanation_ref is the drill-down.
   */
  submit(args: {
    kind: ProposalKind;
    submitter_subsystem: string;
    payload: Record<string, unknown>;
    explanation_ref: string;
    affected_departments: string[];
    ttl_minutes: number;
    approval_workflow_id?: string;
  }): AIProposal {
    if (!ALLOWED_KINDS.has(args.kind)) {
      throw new Error(
        `AIProposalApprovalQueueEngine.submit: invalid kind '${args.kind}'`,
      );
    }
    if (!args.submitter_subsystem) {
      throw new Error(
        "AIProposalApprovalQueueEngine.submit: submitter_subsystem required",
      );
    }
    if (!args.payload || typeof args.payload !== "object") {
      throw new Error(
        "AIProposalApprovalQueueEngine.submit: payload must be a non-null object",
      );
    }
    if (!args.explanation_ref) {
      throw new Error(
        "AIProposalApprovalQueueEngine.submit: explanation_ref required (AI-output without an explainability handle cannot be queued — Hotel AI invariant)",
      );
    }
    if (!Array.isArray(args.affected_departments) || args.affected_departments.length === 0) {
      throw new Error(
        "AIProposalApprovalQueueEngine.submit: affected_departments must be a non-empty array",
      );
    }
    if (
      !Number.isFinite(args.ttl_minutes) ||
      args.ttl_minutes <= 0 ||
      args.ttl_minutes > 10080 // 7 days max
    ) {
      throw new Error(
        "AIProposalApprovalQueueEngine.submit: ttl_minutes must be > 0 and ≤ 10080 (7 days)",
      );
    }
    const id = `AIPROP-${String(this.nextId++).padStart(6, "0")}`;
    const now = new Date();
    const submittedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + args.ttl_minutes * 60_000).toISOString();
    const proposal: AIProposal = Object.freeze({
      id,
      kind: args.kind,
      submitter_subsystem: args.submitter_subsystem,
      submitted_at: submittedAt,
      expires_at: expiresAt,
      payload: Object.freeze({ ...args.payload }),
      explanation_ref: args.explanation_ref,
      affected_departments: Object.freeze([...args.affected_departments]),
      status: "submitted" as const,
      ...(args.approval_workflow_id !== undefined && {
        approval_workflow_id: args.approval_workflow_id,
      }),
      audit_trail: Object.freeze([
        Object.freeze({
          at: submittedAt,
          by_employee_id: args.submitter_subsystem,
          operation: "submit" as const,
        }),
      ]),
    });
    this.proposals.set(id, proposal);
    return proposal;
  }

  /** Admin opens a proposal for review (transitions submitted → under_review). */
  beginReview(args: {
    proposal_id: string;
    reviewer_employee_id: string;
  }): AIProposal {
    const p = this.requireProposal(args.proposal_id);
    if (p.status !== "submitted") {
      throw new Error(
        `AIProposalApprovalQueueEngine.beginReview: proposal must be 'submitted' (got '${p.status}')`,
      );
    }
    this.requireAdminAuthority(args.reviewer_employee_id);
    return this.appendAudit(p, args.reviewer_employee_id, "begin_review", undefined, {
      status: "under_review",
    });
  }

  /**
   * Approve the proposal as-is. Fail-CLOSED: requires rationale + admin auth.
   * On approval, the proposal is final — downstream subsystems consume it.
   */
  approve(args: {
    proposal_id: string;
    reviewer_employee_id: string;
    rationale: string;
  }): AIProposal {
    const p = this.requireProposal(args.proposal_id);
    if (p.status !== "under_review") {
      throw new Error(
        `AIProposalApprovalQueueEngine.approve: proposal must be 'under_review' (got '${p.status}'). Call beginReview first.`,
      );
    }
    if (!args.rationale || args.rationale.trim().length === 0) {
      throw new Error(
        "AIProposalApprovalQueueEngine.approve: non-empty rationale required (admin cannot silent-approve AI proposals — Hotel AI invariant)",
      );
    }
    this.requireAdminAuthority(args.reviewer_employee_id);
    if (args.reviewer_employee_id === p.submitter_subsystem) {
      throw new Error(
        "AIProposalApprovalQueueEngine.approve: submitter cannot self-approve (SoD)",
      );
    }
    const now = new Date().toISOString();
    return this.appendAudit(p, args.reviewer_employee_id, "approve", args.rationale, {
      status: "approved",
      reviewed_at: now,
      reviewer_employee_id: args.reviewer_employee_id,
      decision_rationale: args.rationale,
    });
  }

  reject(args: {
    proposal_id: string;
    reviewer_employee_id: string;
    rationale: string;
  }): AIProposal {
    const p = this.requireProposal(args.proposal_id);
    if (p.status !== "under_review") {
      throw new Error(
        `AIProposalApprovalQueueEngine.reject: proposal must be 'under_review' (got '${p.status}')`,
      );
    }
    if (!args.rationale || args.rationale.trim().length === 0) {
      throw new Error(
        "AIProposalApprovalQueueEngine.reject: non-empty rationale required",
      );
    }
    this.requireAdminAuthority(args.reviewer_employee_id);
    const now = new Date().toISOString();
    return this.appendAudit(p, args.reviewer_employee_id, "reject", args.rationale, {
      status: "rejected",
      reviewed_at: now,
      reviewer_employee_id: args.reviewer_employee_id,
      decision_rationale: args.rationale,
    });
  }

  /**
   * Admin edits the AI's payload before approving. Stores BOTH the original
   * AI payload (immutable) AND the edited_payload — the diff is the human
   * correction signal, used downstream for fine-tuning.
   */
  editAndApprove(args: {
    proposal_id: string;
    reviewer_employee_id: string;
    edited_payload: Record<string, unknown>;
    rationale: string;
  }): AIProposal {
    const p = this.requireProposal(args.proposal_id);
    if (p.status !== "under_review") {
      throw new Error(
        `AIProposalApprovalQueueEngine.editAndApprove: proposal must be 'under_review' (got '${p.status}')`,
      );
    }
    if (!args.edited_payload || typeof args.edited_payload !== "object") {
      throw new Error(
        "AIProposalApprovalQueueEngine.editAndApprove: edited_payload must be a non-null object",
      );
    }
    if (!args.rationale || args.rationale.trim().length === 0) {
      throw new Error(
        "AIProposalApprovalQueueEngine.editAndApprove: rationale required",
      );
    }
    this.requireAdminAuthority(args.reviewer_employee_id);
    if (args.reviewer_employee_id === p.submitter_subsystem) {
      throw new Error(
        "AIProposalApprovalQueueEngine.editAndApprove: submitter cannot self-approve (SoD)",
      );
    }
    const now = new Date().toISOString();
    return this.appendAudit(p, args.reviewer_employee_id, "edit_and_approve", args.rationale, {
      status: "edited_and_approved",
      reviewed_at: now,
      reviewer_employee_id: args.reviewer_employee_id,
      decision_rationale: args.rationale,
      edited_payload: Object.freeze({ ...args.edited_payload }),
    });
  }

  /** Submitter pulls a proposal before review (only allowed in 'submitted' state). */
  withdraw(args: {
    proposal_id: string;
    by_subsystem: string;
    reason?: string;
  }): AIProposal {
    const p = this.requireProposal(args.proposal_id);
    if (p.status !== "submitted") {
      throw new Error(
        `AIProposalApprovalQueueEngine.withdraw: proposal must be 'submitted' (got '${p.status}'); cannot withdraw after review begins`,
      );
    }
    if (args.by_subsystem !== p.submitter_subsystem) {
      throw new Error(
        `AIProposalApprovalQueueEngine.withdraw: only the original submitter '${p.submitter_subsystem}' can withdraw`,
      );
    }
    return this.appendAudit(p, args.by_subsystem, "withdraw", args.reason, {
      status: "withdrawn",
    });
  }

  /**
   * Sweep expired proposals (status=submitted past TTL). Should be called by
   * a scheduled job. Returns the list of just-expired proposal ids.
   */
  expireOverdue(args: { now_iso?: string }): ReadonlyArray<string> {
    const now =
      args.now_iso !== undefined ? Date.parse(args.now_iso) : Date.now();
    if (!Number.isFinite(now)) {
      throw new Error(
        `AIProposalApprovalQueueEngine.expireOverdue: invalid now_iso '${args.now_iso}'`,
      );
    }
    const expired: string[] = [];
    for (const p of this.proposals.values()) {
      if (p.status !== "submitted") continue;
      const exp = Date.parse(p.expires_at);
      if (!Number.isFinite(exp) || now < exp) continue;
      this.appendAudit(p, "system", "expire", `TTL exceeded`, {
        status: "expired",
      });
      expired.push(p.id);
    }
    return Object.freeze(expired);
  }

  /** Queue listing with filters. Pending = submitted + under_review. */
  listQueue(args: {
    status?: ProposalStatus;
    kind?: ProposalKind;
    submitter_subsystem?: string;
    department_code?: string;
    only_pending?: boolean;
  } = {}): ReadonlyArray<AIProposal> {
    if (args.status !== undefined && !ALLOWED_STATUSES.has(args.status)) {
      throw new Error(
        `AIProposalApprovalQueueEngine.listQueue: invalid status filter '${args.status}'`,
      );
    }
    if (args.kind !== undefined && !ALLOWED_KINDS.has(args.kind)) {
      throw new Error(
        `AIProposalApprovalQueueEngine.listQueue: invalid kind filter '${args.kind}'`,
      );
    }
    const out: AIProposal[] = [];
    for (const p of this.proposals.values()) {
      if (args.status && p.status !== args.status) continue;
      if (args.only_pending && p.status !== "submitted" && p.status !== "under_review") continue;
      if (args.kind && p.kind !== args.kind) continue;
      if (args.submitter_subsystem && p.submitter_subsystem !== args.submitter_subsystem) continue;
      if (
        args.department_code &&
        !p.affected_departments.includes(args.department_code)
      )
        continue;
      out.push(Object.freeze({ ...p }));
    }
    // Sort: oldest submission first (FIFO queue)
    out.sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
    return Object.freeze(out);
  }

  getProposal(proposal_id: string): AIProposal {
    return Object.freeze({ ...this.requireProposal(proposal_id) });
  }

  /** Operational stats for the admin queue dashboard. */
  stats(args: { now_iso?: string } = {}): QueueStats {
    const now =
      args.now_iso !== undefined ? Date.parse(args.now_iso) : Date.now();
    if (!Number.isFinite(now)) {
      throw new Error(
        `AIProposalApprovalQueueEngine.stats: invalid now_iso '${args.now_iso}'`,
      );
    }
    const byStatus: Partial<Record<ProposalStatus, number>> = {};
    const byKind: Partial<Record<ProposalKind, number>> = {};
    let total = 0;
    let oldestPendingMs = -Infinity;
    let approvedCount = 0;
    let rejectedCount = 0;
    let editedCount = 0;
    for (const p of this.proposals.values()) {
      total++;
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
      byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
      if (p.status === "submitted" || p.status === "under_review") {
        const sub = Date.parse(p.submitted_at);
        if (Number.isFinite(sub)) {
          const age = now - sub;
          if (age > oldestPendingMs) oldestPendingMs = age;
        }
      }
      if (p.status === "approved") approvedCount++;
      else if (p.status === "rejected") rejectedCount++;
      else if (p.status === "edited_and_approved") editedCount++;
    }
    const decided = approvedCount + rejectedCount + editedCount;
    return Object.freeze({
      total,
      by_status: Object.freeze(byStatus),
      by_kind: Object.freeze(byKind),
      oldest_pending_age_minutes:
        oldestPendingMs === -Infinity ? null : Math.round(oldestPendingMs / 60_000),
      approval_rate_pct:
        decided === 0
          ? null
          : Math.round((100 * (approvedCount + editedCount)) / decided),
    });
  }

  // ─── helpers ───────────────────────────────────────────────────────────

  private requireProposal(id: string): AIProposal {
    const p = this.proposals.get(id);
    if (!p) {
      throw new Error(
        `AIProposalApprovalQueueEngine: unknown proposal_id '${id}'`,
      );
    }
    return p;
  }

  /**
   * Fail-CLOSED auth: reviewer must (a) be registered in ManagerRegistryEngine,
   * (b) be active, (c) have rank ≥ adminMinRank. ANY missing condition
   * throws — the queue does not silently approve.
   */
  private requireAdminAuthority(reviewer_employee_id: string): void {
    if (!reviewer_employee_id) {
      throw new Error(
        "AIProposalApprovalQueueEngine: reviewer_employee_id required",
      );
    }
    const reviewer = managerRegistryEngine.getEmployee(reviewer_employee_id);
    if (!reviewer.active) {
      throw new Error(
        `AIProposalApprovalQueueEngine: reviewer '${reviewer_employee_id}' is inactive`,
      );
    }
    const reviewerIdx = managerRegistryEngine.rankIndex(reviewer.rank);
    const minIdx = managerRegistryEngine.rankIndex(this.adminMinRank);
    if (reviewerIdx < minIdx) {
      throw new Error(
        `AIProposalApprovalQueueEngine: reviewer rank '${reviewer.rank}' (idx ${reviewerIdx}) below adminMinRank '${this.adminMinRank}' (idx ${minIdx})`,
      );
    }
  }

  private appendAudit(
    p: AIProposal,
    by_employee_id: string,
    operation: ProposalAudit["operation"],
    note: string | undefined,
    patch: Partial<AIProposal>,
  ): AIProposal {
    const now = new Date().toISOString();
    const audit: ProposalAudit = Object.freeze({
      at: now,
      by_employee_id,
      operation,
      ...(note !== undefined && { note }),
    });
    const updated: AIProposal = Object.freeze({
      ...p,
      ...patch,
      audit_trail: Object.freeze([...p.audit_trail, audit]),
    });
    this.proposals.set(p.id, updated);
    return updated;
  }

  reset(): void {
    this.proposals.clear();
    this.nextId = 1;
    this.adminMinRank = "admin";
  }
}

export const aiProposalApprovalQueueEngine = new AIProposalApprovalQueueEngine();
