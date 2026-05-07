/**
 * cadRevisionPromotionSchema — U-FS-04 (PHASE-47)
 *
 * State machine for CAD revision lifecycle:
 *   draft → in_review → released | rejected
 *   released → superseded (immutable; NEW revision replaces)
 *   released → obsolete (decommissioned)
 *
 * Requires 2 distinct approvers to promote from in_review → released.
 * Released revisions are immutable; any further change must be a new revision.
 *
 * schemaVersion: 1.
 *
 * @module schemas/cadRevisionPromotionSchema
 */

import { z } from "zod";

// ── States in the workflow ──────────────────────────────────────────────────

export const PROMOTION_STATES = [
  "draft",
  "in_review",
  "released",
  "rejected",
  "superseded",
  "obsolete",
] as const;

export type PromotionState = (typeof PROMOTION_STATES)[number];

// ── Approval record (one per signer) ─────────────────────────────────────────

export const ApprovalRecordSchema = z
  .object({
    /** Approver identity (username / employee id). */
    approverId: z.string().min(1),
    /** Approver role — "engineer", "qa", "manufacturing", "customer". */
    role: z.enum(["engineer", "qa", "manufacturing", "customer"]),
    /** ISO timestamp when approval was recorded. */
    timestamp: z.string().min(1),
    /** Optional comment from the approver. */
    comment: z.string().optional(),
  })
  .strict();

export type ApprovalRecord = z.infer<typeof ApprovalRecordSchema>;

// ── State transition entry ──────────────────────────────────────────────────

export const TransitionEventSchema = z
  .object({
    from: z.enum(PROMOTION_STATES),
    to: z.enum(PROMOTION_STATES),
    actorId: z.string().min(1),
    timestamp: z.string().min(1),
    reason: z.string().optional(),
  })
  .strict();

export type TransitionEvent = z.infer<typeof TransitionEventSchema>;

// ── Promotion record per (drawingNumber, revision) ───────────────────────────

export const PromotionRecordSchema = z
  .object({
    drawingNumber: z.string().min(1),
    revision: z.string().min(1),
    state: z.enum(PROMOTION_STATES),
    /** Approvals accumulated during in_review. */
    approvals: z.array(ApprovalRecordSchema).default([]),
    /** Full transition history (append-only). */
    history: z.array(TransitionEventSchema).default([]),
    /** Who holds the "current" pointer for this drawing number? */
    isCurrent: z.boolean().default(false),
    /** If superseded, the revision that replaced it. */
    supersededBy: z.string().optional(),
    /** ISO timestamp when the record was created. */
    createdAt: z.string().min(1),
    /** ISO timestamp when the record was last modified. */
    updatedAt: z.string().min(1),
  })
  .strict();

export type PromotionRecord = z.infer<typeof PromotionRecordSchema>;
