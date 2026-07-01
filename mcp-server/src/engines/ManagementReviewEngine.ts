/**
 * ManagementReviewEngine — ISO 9001:2015 §9.3 management review records.
 *
 * §9.3.2 mandates the QMS top-mgmt review at planned intervals covers 10 inputs:
 *   (a) status of prior review action items
 *   (b) external/internal context changes (§4.1)
 *   (c) QMS performance + effectiveness info — customer-sat, objectives, process
 *       performance + conformity, nonconformities + corrective actions, monitoring/
 *       measurement results, audit results, supplier performance
 *   (d) resource adequacy
 *   (e) risk + opportunity actions effectiveness (§6.1)
 *   (f) improvement opportunities
 *
 * §9.3.3 mandates outputs cover at least:
 *   (a) improvement opportunities decisions
 *   (b) QMS-change needs
 *   (c) resource needs
 *
 * Engine surface: schedule the review meeting, capture inputs/outputs/action items,
 * audit-trail every state transition, R12 fail-loud on incomplete records.
 *
 * Hotel-soul invariants: R12 fail-loud, PII-free (employee_id only), Object.frozen.
 *
 * @module ManagementReviewEngine
 * @milestone HOTEL/U-MANAGEMENT-REVIEW (2026-05-25, slot:hotel iter14)
 */

export type ReviewStatus = "scheduled" | "convened" | "completed" | "cancelled";
export type ActionItemStatus = "open" | "in_progress" | "completed" | "deferred";

export interface ReviewActionItem {
  id: string;
  review_id: string;
  description: string;
  owner_employee_id: string;
  due_date: string; // YYYY-MM-DD
  status: ActionItemStatus;
  closed_at: string | null;
  closure_evidence?: string;
}

/** §9.3.2 inputs — must be present (not all populated, but recorded if discussed). */
export interface ReviewInputs {
  prior_action_status_summary?: string;          // (a)
  context_changes_summary?: string;              // (b)
  customer_satisfaction_summary?: string;        // (c) - customer sat
  objective_attainment_summary?: string;         // (c) - quality objectives
  process_performance_summary?: string;          // (c) - process + conformity
  nonconformity_summary?: string;                // (c) - NCs + corrective actions
  monitoring_results_summary?: string;           // (c) - monitoring/measurement
  audit_results_summary?: string;                // (c) - internal + external audits
  supplier_performance_summary?: string;         // (c) - external providers
  resource_adequacy_summary?: string;            // (d)
  risk_opportunity_summary?: string;             // (e)
  improvement_opportunities_summary?: string;    // (f)
}

/** §9.3.3 outputs — at least one of each category required to close-out the review. */
export interface ReviewOutputs {
  improvement_decisions: ReadonlyArray<string>;  // (a)
  qms_change_needs: ReadonlyArray<string>;       // (b)
  resource_needs: ReadonlyArray<string>;         // (c)
}

export interface ManagementReview {
  id: string;
  scheduled_for: string; // YYYY-MM-DD
  convened_at: string | null;
  completed_at: string | null;
  status: ReviewStatus;
  attendees_employee_ids: ReadonlyArray<string>;
  chair_employee_id: string;
  meeting_minutes_ref?: string;
  inputs: ReviewInputs;
  outputs: ReviewOutputs;
  action_items: ReadonlyArray<ReviewActionItem>;
}

class ManagementReviewEngine {
  private reviews: Map<string, ManagementReview> = new Map();
  private actionItems: Map<string, ReviewActionItem> = new Map();
  private nextReviewId = 1;
  private nextActionId = 1;

  scheduleReview(args: {
    scheduled_for: string;
    chair_employee_id: string;
    attendees_employee_ids: string[];
  }): ManagementReview {
    if (!args.chair_employee_id) {
      throw new Error("ManagementReviewEngine.scheduleReview: chair_employee_id required");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.scheduled_for)) {
      throw new Error("ManagementReviewEngine.scheduleReview: scheduled_for must be ISO YYYY-MM-DD");
    }
    if (!Array.isArray(args.attendees_employee_ids) || args.attendees_employee_ids.length < 2) {
      throw new Error(
        "ManagementReviewEngine.scheduleReview: ≥2 attendees required (top-mgmt review is not a solo activity)",
      );
    }
    const id = `MR-${String(this.nextReviewId++).padStart(6, "0")}`;
    const review: ManagementReview = Object.freeze({
      id,
      scheduled_for: args.scheduled_for,
      convened_at: null,
      completed_at: null,
      status: "scheduled" as const,
      attendees_employee_ids: Object.freeze([...args.attendees_employee_ids]),
      chair_employee_id: args.chair_employee_id,
      inputs: Object.freeze({}),
      outputs: Object.freeze({
        improvement_decisions: Object.freeze([]),
        qms_change_needs: Object.freeze([]),
        resource_needs: Object.freeze([]),
      }),
      action_items: Object.freeze([]),
    });
    this.reviews.set(id, review);
    return review;
  }

  convene(args: { review_id: string }): ManagementReview {
    const r = this.requireReview(args.review_id);
    if (r.status !== "scheduled") {
      throw new Error(`ManagementReviewEngine.convene: review must be 'scheduled' (got '${r.status}')`);
    }
    const updated: ManagementReview = Object.freeze({
      ...r,
      status: "convened" as const,
      convened_at: new Date().toISOString(),
    });
    this.reviews.set(r.id, updated);
    return updated;
  }

  /** Record §9.3.2 input summaries (any subset; can be called multiple times to accumulate). */
  recordInputs(args: { review_id: string; inputs: Partial<ReviewInputs> }): ManagementReview {
    const r = this.requireReview(args.review_id);
    if (r.status === "completed" || r.status === "cancelled") {
      throw new Error(`ManagementReviewEngine.recordInputs: review must be open (got '${r.status}')`);
    }
    const merged: ReviewInputs = Object.freeze({ ...r.inputs, ...args.inputs });
    const updated: ManagementReview = Object.freeze({ ...r, inputs: merged });
    this.reviews.set(r.id, updated);
    return updated;
  }

  /** Record §9.3.3 outputs decision (append to the category). */
  recordOutput(args: {
    review_id: string;
    category: "improvement_decisions" | "qms_change_needs" | "resource_needs";
    decision: string;
  }): ManagementReview {
    const r = this.requireReview(args.review_id);
    if (r.status === "completed" || r.status === "cancelled") {
      throw new Error(`ManagementReviewEngine.recordOutput: review must be open (got '${r.status}')`);
    }
    if (!args.decision || args.decision.trim().length < 5) {
      throw new Error("ManagementReviewEngine.recordOutput: decision (≥5 chars) required");
    }
    const newOutputs: ReviewOutputs = Object.freeze({
      improvement_decisions: Object.freeze(
        args.category === "improvement_decisions"
          ? [...r.outputs.improvement_decisions, args.decision]
          : [...r.outputs.improvement_decisions],
      ),
      qms_change_needs: Object.freeze(
        args.category === "qms_change_needs"
          ? [...r.outputs.qms_change_needs, args.decision]
          : [...r.outputs.qms_change_needs],
      ),
      resource_needs: Object.freeze(
        args.category === "resource_needs"
          ? [...r.outputs.resource_needs, args.decision]
          : [...r.outputs.resource_needs],
      ),
    });
    const updated: ManagementReview = Object.freeze({ ...r, outputs: newOutputs });
    this.reviews.set(r.id, updated);
    return updated;
  }

  addActionItem(args: {
    review_id: string;
    description: string;
    owner_employee_id: string;
    due_date: string;
  }): ReviewActionItem {
    const r = this.requireReview(args.review_id);
    if (r.status === "completed" || r.status === "cancelled") {
      throw new Error(`ManagementReviewEngine.addActionItem: review must be open`);
    }
    if (!args.owner_employee_id || args.description.trim().length < 5) {
      throw new Error(
        "ManagementReviewEngine.addActionItem: owner_employee_id + description (≥5 chars) required",
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.due_date)) {
      throw new Error("ManagementReviewEngine.addActionItem: due_date must be ISO YYYY-MM-DD");
    }
    const id = `MRA-${String(this.nextActionId++).padStart(6, "0")}`;
    const item: ReviewActionItem = Object.freeze({
      id,
      review_id: r.id,
      description: args.description,
      owner_employee_id: args.owner_employee_id,
      due_date: args.due_date,
      status: "open" as const,
      closed_at: null,
    });
    this.actionItems.set(id, item);
    const updated: ManagementReview = Object.freeze({
      ...r,
      action_items: Object.freeze([...r.action_items, item]),
    });
    this.reviews.set(r.id, updated);
    return item;
  }

  updateActionItem(args: {
    action_id: string;
    status: ActionItemStatus;
    closure_evidence?: string;
  }): ReviewActionItem {
    const a = this.actionItems.get(args.action_id);
    if (!a) throw new Error(`ManagementReviewEngine.updateActionItem: unknown action_id "${args.action_id}"`);
    const isClosure = args.status === "completed";
    if (isClosure && !args.closure_evidence) {
      throw new Error(
        "ManagementReviewEngine.updateActionItem: closure_evidence required when status='completed'",
      );
    }
    const updated: ReviewActionItem = Object.freeze({
      ...a,
      status: args.status,
      closed_at: isClosure ? new Date().toISOString() : a.closed_at,
      ...(args.closure_evidence !== undefined && { closure_evidence: args.closure_evidence }),
    });
    this.actionItems.set(a.id, updated);
    // Sync the review's nested action_items
    const review = this.reviews.get(a.review_id);
    if (review) {
      const newItems = review.action_items.map((ai) => (ai.id === a.id ? updated : ai));
      this.reviews.set(review.id, Object.freeze({ ...review, action_items: Object.freeze(newItems) }));
    }
    return updated;
  }

  /**
   * Close-out the review. §9.3.3 mandates at least one decision in each output category.
   * R12 fail-loud — refuses to close if any output category is empty.
   */
  completeReview(args: { review_id: string; meeting_minutes_ref?: string }): ManagementReview {
    const r = this.requireReview(args.review_id);
    if (r.status !== "convened") {
      throw new Error(`ManagementReviewEngine.completeReview: review must be 'convened' (got '${r.status}')`);
    }
    if (r.outputs.improvement_decisions.length === 0) {
      throw new Error(
        "ManagementReviewEngine.completeReview: §9.3.3(a) requires ≥1 improvement_decisions",
      );
    }
    if (r.outputs.qms_change_needs.length === 0) {
      throw new Error(
        "ManagementReviewEngine.completeReview: §9.3.3(b) requires ≥1 qms_change_needs",
      );
    }
    if (r.outputs.resource_needs.length === 0) {
      throw new Error(
        "ManagementReviewEngine.completeReview: §9.3.3(c) requires ≥1 resource_needs",
      );
    }
    const updated: ManagementReview = Object.freeze({
      ...r,
      status: "completed" as const,
      completed_at: new Date().toISOString(),
      ...(args.meeting_minutes_ref !== undefined && { meeting_minutes_ref: args.meeting_minutes_ref }),
    });
    this.reviews.set(r.id, updated);
    return updated;
  }

  getReview(id: string): ManagementReview | null {
    const r = this.reviews.get(id);
    return r ? Object.freeze({ ...r }) : null;
  }

  listOverdueActionItems(args?: { as_of?: string }): ReadonlyArray<ReviewActionItem> {
    const asOf = args?.as_of ?? new Date().toISOString().slice(0, 10);
    return Object.freeze(
      [...this.actionItems.values()]
        .filter((a) => a.status !== "completed" && a.due_date < asOf)
        .map((a) => Object.freeze({ ...a })),
    );
  }

  /**
   * §9.3.2(a) prior-review summary: how many action items from the last review remain open.
   * Used as input to the *next* review per ISO mandate.
   */
  priorReviewActionStatus(review_id: string): {
    review_id: string;
    total_actions: number;
    completed: number;
    open: number;
    in_progress: number;
    deferred: number;
    overdue: number;
  } {
    const r = this.requireReview(review_id);
    const today = new Date().toISOString().slice(0, 10);
    let completed = 0, open = 0, in_progress = 0, deferred = 0, overdue = 0;
    for (const a of r.action_items) {
      if (a.status === "completed") completed++;
      else if (a.status === "open") open++;
      else if (a.status === "in_progress") in_progress++;
      else if (a.status === "deferred") deferred++;
      if (a.status !== "completed" && a.due_date < today) overdue++;
    }
    return Object.freeze({
      review_id: r.id,
      total_actions: r.action_items.length,
      completed,
      open,
      in_progress,
      deferred,
      overdue,
    });
  }

  reset(): void {
    this.reviews.clear();
    this.actionItems.clear();
    this.nextReviewId = 1;
    this.nextActionId = 1;
  }

  private requireReview(id: string): ManagementReview {
    const r = this.reviews.get(id);
    if (!r) throw new Error(`ManagementReviewEngine: unknown review_id "${id}"`);
    return r;
  }
}

export const managementReviewEngine = new ManagementReviewEngine();
