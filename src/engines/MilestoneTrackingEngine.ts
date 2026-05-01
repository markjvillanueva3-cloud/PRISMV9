/**
 * MilestoneTrackingEngine — 14-Stage Order Milestone Tracking
 * =============================================================
 *
 * Provides customer-facing order tracking through 14 milestones from quote_sent
 * to delivered. Auto-advances milestones based on JobLifecycleEngine status changes.
 *
 * Milestones:
 *   0: quote_sent → 1: quote_accepted → 2: order_confirmed → 3: design_review →
 *   4: material_ordered → 5: material_received → 6: programming → 7: setup →
 *   8: first_article → 9: production → 10: quality_inspection → 11: finishing →
 *   12: packing_shipping → 13: delivered
 *
 * Features:
 * - Template-based milestone creation for new orders
 * - Auto-advance from JobLifecycle status transitions
 * - Manual advance/skip for non-standard workflows
 * - Event emission for notification triggers
 * - ETA estimation based on historical averages
 *
 * @version 1.0.0 — Session 6-9 U-PORTAL1
 * @see JobLifecycleEngine — 13-state job lifecycle
 * @see QuoteRevisionEngine — quote share tokens (portal foundation)
 */

import * as crypto from "crypto";
import { log } from "../utils/Logger.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MilestoneKey =
  | "quote_sent" | "quote_accepted" | "order_confirmed" | "design_review"
  | "material_ordered" | "material_received" | "programming" | "setup"
  | "first_article" | "production" | "quality_inspection" | "finishing"
  | "packing_shipping" | "delivered";

export type MilestoneStatus = "pending" | "active" | "completed" | "skipped";

export interface Milestone {
  id: string;
  job_id: string;
  quote_id?: string;
  customer_id?: string;
  milestone_key: MilestoneKey;
  milestone_idx: number;
  label: string;
  status: MilestoneStatus;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MilestoneTimeline {
  job_id: string;
  quote_id?: string;
  customer_id?: string;
  milestones: Milestone[];
  current_milestone: MilestoneKey | null;
  current_idx: number;
  total_milestones: number;
  completed_count: number;
  progress_pct: number;
  estimated_delivery?: string;
  created_at: string;
  updated_at: string;
}

export interface MilestoneEvent {
  type: "milestone.advanced" | "milestone.skipped" | "milestone.created";
  job_id: string;
  milestone_key: MilestoneKey;
  milestone_idx: number;
  previous_status: MilestoneStatus;
  new_status: MilestoneStatus;
  timestamp: string;
}

// ─── Template ─────────────────────────────────────────────────────────────────

const MILESTONE_TEMPLATE: Array<{ key: MilestoneKey; label: string }> = [
  { key: "quote_sent",          label: "Quote Sent" },
  { key: "quote_accepted",      label: "Quote Accepted" },
  { key: "order_confirmed",     label: "Order Confirmed" },
  { key: "design_review",       label: "Design Review" },
  { key: "material_ordered",    label: "Material Ordered" },
  { key: "material_received",   label: "Material Received" },
  { key: "programming",         label: "Programming" },
  { key: "setup",               label: "Machine Setup" },
  { key: "first_article",       label: "First Article Inspection" },
  { key: "production",          label: "Production Run" },
  { key: "quality_inspection",  label: "Quality Inspection" },
  { key: "finishing",           label: "Finishing & Secondary Ops" },
  { key: "packing_shipping",    label: "Packing & Shipping" },
  { key: "delivered",           label: "Delivered" },
];

/**
 * Map JobLifecycleEngine statuses → milestone keys for auto-advance.
 * When job transitions to a lifecycle status, the corresponding milestone auto-completes
 * and the next one becomes active.
 */
const JOB_STATUS_TO_MILESTONE: Record<string, MilestoneKey> = {
  ordered:     "order_confirmed",
  scheduled:   "programming",
  in_progress: "setup",
  qc_pending:  "quality_inspection",
  qc_passed:   "quality_inspection",
  finishing:   "finishing",
  complete:    "packing_shipping",
  shipped:     "delivered",
};

// ─── Historical Averages (days per milestone, for ETA estimation) ────────────

const AVG_DAYS_PER_MILESTONE: Record<MilestoneKey, number> = {
  quote_sent:         0,    // instant
  quote_accepted:     2,    // 2 days avg customer response
  order_confirmed:    1,    // 1 day processing
  design_review:      2,    // 2 days engineering review
  material_ordered:   1,    // 1 day PO creation
  material_received:  5,    // 5 days lead time
  programming:        3,    // 3 days CAM programming
  setup:              1,    // 1 day machine setup
  first_article:      1,    // 1 day FAI
  production:         5,    // 5 days (varies by qty)
  quality_inspection: 2,    // 2 days final QC
  finishing:          3,    // 3 days secondary ops
  packing_shipping:   1,    // 1 day pack + ship
  delivered:          2,    // 2 days transit
};

// ─── Engine ───────────────────────────────────────────────────────────────────

export class MilestoneTrackingEngine {
  private timelines = new Map<string, Milestone[]>();  // job_id → milestones
  private eventLog: MilestoneEvent[] = [];

  /**
   * Create a milestone timeline for a new order.
   * Initializes all 14 milestones as pending, with the first one active.
   */
  createTimeline(input: {
    job_id: string;
    quote_id?: string;
    customer_id?: string;
    start_at_milestone?: MilestoneKey;
  }): MilestoneTimeline {
    if (this.timelines.has(input.job_id)) {
      throw new Error(`Timeline already exists for job ${input.job_id}`);
    }

    const now = new Date().toISOString();
    const startIdx = input.start_at_milestone
      ? MILESTONE_TEMPLATE.findIndex((m) => m.key === input.start_at_milestone)
      : 0;

    if (startIdx < 0) {
      throw new Error(`Invalid start_at_milestone: "${input.start_at_milestone}" is not a valid milestone key`);
    }

    const milestones: Milestone[] = MILESTONE_TEMPLATE.map((tmpl, idx) => ({
      id: crypto.randomUUID(),
      job_id: input.job_id,
      quote_id: input.quote_id,
      customer_id: input.customer_id,
      milestone_key: tmpl.key,
      milestone_idx: idx,
      label: tmpl.label,
      status: idx < startIdx ? "completed" as MilestoneStatus :
              idx === startIdx ? "active" as MilestoneStatus :
              "pending" as MilestoneStatus,
      started_at: idx === startIdx ? now : idx < startIdx ? now : undefined,
      completed_at: idx < startIdx ? now : undefined,
      notes: undefined,
      metadata: {},
      created_at: now,
      updated_at: now,
    }));

    this.timelines.set(input.job_id, milestones);
    this.emitEvent("milestone.created", input.job_id, milestones[startIdx]);
    log.info(`[MilestoneTracking] Created timeline for job ${input.job_id} (start: ${MILESTONE_TEMPLATE[startIdx].key})`);

    return this.buildTimeline(input.job_id);
  }

  /**
   * Get the current milestone timeline for a job.
   */
  getTimeline(jobId: string): MilestoneTimeline | null {
    if (!this.timelines.has(jobId)) return null;
    return this.buildTimeline(jobId);
  }

  /**
   * Advance a milestone to completed and activate the next one.
   * Can advance by key or by advancing the current active milestone.
   */
  advanceMilestone(input: {
    job_id: string;
    milestone_key?: MilestoneKey;
    notes?: string;
    advanced_by?: string;
  }): MilestoneTimeline {
    const milestones = this.timelines.get(input.job_id);
    if (!milestones) throw new Error(`No timeline for job ${input.job_id}`);

    const now = new Date().toISOString();
    let target: Milestone;

    if (input.milestone_key) {
      const found = milestones.find((m) => m.milestone_key === input.milestone_key);
      if (!found) throw new Error(`Milestone ${input.milestone_key} not found`);
      target = found;
    } else {
      // Advance the current active milestone
      const active = milestones.find((m) => m.status === "active");
      if (!active) throw new Error("No active milestone to advance");
      target = active;
    }

    if (target.status === "completed") {
      throw new Error(`Milestone ${target.milestone_key} is already completed`);
    }

    const prevStatus = target.status;
    target.status = "completed";
    target.completed_at = now;
    target.updated_at = now;
    if (input.notes) target.notes = input.notes;
    if (input.advanced_by) target.metadata.advanced_by = input.advanced_by;

    this.emitEvent("milestone.advanced", input.job_id, target, prevStatus);

    // Activate next pending milestone
    const nextIdx = target.milestone_idx + 1;
    if (nextIdx < milestones.length) {
      const next = milestones[nextIdx];
      if (next.status === "pending") {
        next.status = "active";
        next.started_at = now;
        next.updated_at = now;
      }
    }

    log.info(`[MilestoneTracking] Advanced ${target.milestone_key} for job ${input.job_id}`);
    return this.buildTimeline(input.job_id);
  }

  /**
   * Skip a milestone (e.g., no finishing needed for this order).
   */
  skipMilestone(input: {
    job_id: string;
    milestone_key: MilestoneKey;
    reason?: string;
  }): MilestoneTimeline {
    const milestones = this.timelines.get(input.job_id);
    if (!milestones) throw new Error(`No timeline for job ${input.job_id}`);

    const target = milestones.find((m) => m.milestone_key === input.milestone_key);
    if (!target) throw new Error(`Milestone ${input.milestone_key} not found`);
    if (target.status === "completed") throw new Error(`Cannot skip completed milestone`);

    const now = new Date().toISOString();
    const prevStatus = target.status;
    const wasActive = target.status === "active";

    target.status = "skipped";
    target.updated_at = now;
    if (input.reason) target.notes = `Skipped: ${input.reason}`;

    this.emitEvent("milestone.skipped", input.job_id, target, prevStatus);

    // If the skipped milestone was active, activate the next pending
    if (wasActive) {
      for (let i = target.milestone_idx + 1; i < milestones.length; i++) {
        if (milestones[i].status === "pending") {
          milestones[i].status = "active";
          milestones[i].started_at = now;
          milestones[i].updated_at = now;
          break;
        }
      }
    }

    log.info(`[MilestoneTracking] Skipped ${input.milestone_key} for job ${input.job_id}`);
    return this.buildTimeline(input.job_id);
  }

  /**
   * Auto-advance milestones based on JobLifecycleEngine status change.
   * Called when a job transitions to a new lifecycle status.
   */
  onJobStatusChange(jobId: string, newJobStatus: string): MilestoneTimeline | null {
    const milestones = this.timelines.get(jobId);
    if (!milestones) return null;

    const targetKey = JOB_STATUS_TO_MILESTONE[newJobStatus];
    if (!targetKey) return null;

    const target = milestones.find((m) => m.milestone_key === targetKey);
    if (!target || target.status === "completed" || target.status === "skipped") return null;

    const now = new Date().toISOString();

    // Complete all milestones up to the target
    for (let i = 0; i <= target.milestone_idx; i++) {
      const m = milestones[i];
      if (m.status === "pending" || m.status === "active") {
        if (i < target.milestone_idx) {
          m.status = "completed";
          m.completed_at = now;
          m.updated_at = now;
          m.metadata.auto_advanced = true;
        } else {
          // Target milestone becomes active (it's in progress now)
          m.status = "active";
          m.started_at = m.started_at ?? now;
          m.updated_at = now;
          m.metadata.auto_advanced = true;
        }
      }
    }

    log.info(`[MilestoneTracking] Auto-advanced to ${targetKey} for job ${jobId} (status: ${newJobStatus})`);
    return this.buildTimeline(jobId);
  }

  /**
   * Get recent events for a job (for notification triggers).
   */
  getEvents(jobId?: string, limit = 50): MilestoneEvent[] {
    const events = jobId
      ? this.eventLog.filter((e) => e.job_id === jobId)
      : this.eventLog;
    return events.slice(-limit);
  }

  /**
   * Get all tracked job IDs.
   */
  listTrackedJobs(): string[] {
    return [...this.timelines.keys()];
  }

  /**
   * Delete a timeline (cleanup).
   */
  deleteTimeline(jobId: string): { deleted: boolean } {
    const existed = this.timelines.delete(jobId);
    return { deleted: existed };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private buildTimeline(jobId: string): MilestoneTimeline {
    const milestones = this.timelines.get(jobId) ?? [];
    const current = milestones.find((m) => m.status === "active");
    const completedCount = milestones.filter(
      (m) => m.status === "completed" || m.status === "skipped",
    ).length;
    const total = milestones.length;

    return {
      job_id: jobId,
      quote_id: milestones[0]?.quote_id,
      customer_id: milestones[0]?.customer_id,
      milestones,
      current_milestone: current?.milestone_key ?? null,
      current_idx: current?.milestone_idx ?? total,
      total_milestones: total,
      completed_count: completedCount,
      progress_pct: total > 0 ? Math.round((completedCount / total) * 100) : 0,
      estimated_delivery: this.estimateDelivery(milestones),
      created_at: milestones[0]?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  private estimateDelivery(milestones: Milestone[]): string | undefined {
    const remaining = milestones.filter(
      (m) => m.status === "pending" || m.status === "active",
    );
    if (remaining.length === 0) return undefined;

    let totalDays = 0;
    for (const m of remaining) {
      totalDays += AVG_DAYS_PER_MILESTONE[m.milestone_key] ?? 1;
    }

    const eta = new Date(Date.now() + totalDays * 86400000);
    return eta.toISOString().split("T")[0];
  }

  private emitEvent(
    type: MilestoneEvent["type"],
    jobId: string,
    milestone: Milestone,
    previousStatus?: MilestoneStatus,
  ): void {
    const event: MilestoneEvent = {
      type,
      job_id: jobId,
      milestone_key: milestone.milestone_key,
      milestone_idx: milestone.milestone_idx,
      previous_status: previousStatus ?? "pending",
      new_status: milestone.status,
      timestamp: new Date().toISOString(),
    };
    this.eventLog.push(event);

    // Keep event log bounded
    if (this.eventLog.length > 10000) {
      this.eventLog = this.eventLog.slice(-5000);
    }
  }
}

export const milestoneTrackingEngine = new MilestoneTrackingEngine();
