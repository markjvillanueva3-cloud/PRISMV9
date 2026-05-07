/**
 * cadBundleReplaySchema — U-FS-15 (PHASE-47)
 *
 * Bundle replay harness types: recorded CAD operations, replay runs,
 * per-op comparison, failure classification, cross-bundle search hits.
 *
 * schemaVersion: 1.
 *
 * @module schemas/cadBundleReplaySchema
 */

import { z } from "zod";

// ── Recorded op ─────────────────────────────────────────────────────────────

export const OP_KINDS = [
  "extrude",
  "revolve",
  "sweep",
  "loft",
  "fillet",
  "chamfer",
  "shell",
  "boolean_union",
  "boolean_subtract",
  "boolean_intersect",
  "pattern_linear",
  "pattern_circular",
  "mirror",
  "draft",
  "parameter_edit",
  "feature_suppress",
  "feature_unsuppress",
  "sketch",
  "reference_external",
] as const;
export type OpKind = (typeof OP_KINDS)[number];

export const CADOperationSchema = z
  .object({
    opId: z.string().min(1),
    sequence: z.number().int().nonnegative(),
    kind: z.enum(OP_KINDS),
    params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
    /** SHA-256 of input body state expected before this op runs. */
    inputStateSha256: z.string().regex(/^[0-9a-f]{64}$/),
    /** SHA-256 of output body state observed after this op ran. */
    outputStateSha256: z.string().regex(/^[0-9a-f]{64}$/),
    durationMs: z.number().nonnegative(),
  })
  .strict();

export type CADOperation = z.infer<typeof CADOperationSchema>;

// ── Bundle ──────────────────────────────────────────────────────────────────

export const CADBundleSchema = z
  .object({
    bundleId: z.string().min(1),
    version: z.string().min(1),
    capturedAt: z.string().min(1),
    operations: z.array(CADOperationSchema).default([]),
    /** SHA-256 over the concat of op.outputStateSha256 — bundle "fingerprint". */
    bundleDigestSha256: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();

export type CADBundle = z.infer<typeof CADBundleSchema>;

// ── Replay result ───────────────────────────────────────────────────────────

export const FAILURE_CLASSES = [
  "none",
  "input_state_mismatch",
  "output_state_mismatch",
  "op_threw",
  "geometry_check_failed",
  "tolerance_violation",
  "timeout",
] as const;
export type FailureClass = (typeof FAILURE_CLASSES)[number];

export const ReplayOpOutcomeSchema = z
  .object({
    opId: z.string(),
    sequence: z.number().int().nonnegative(),
    success: z.boolean(),
    failureClass: z.enum(FAILURE_CLASSES),
    reason: z.string(),
    observedOutputSha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
    durationMs: z.number().nonnegative(),
  })
  .strict();

export type ReplayOpOutcome = z.infer<typeof ReplayOpOutcomeSchema>;

export const ReplayRunSchema = z
  .object({
    runId: z.string(),
    bundleId: z.string(),
    startedAt: z.string(),
    endedAt: z.string(),
    outcomes: z.array(ReplayOpOutcomeSchema),
    overallSuccess: z.boolean(),
    firstFailureOpId: z.string().optional(),
    totalDurationMs: z.number().nonnegative(),
  })
  .strict();

export type ReplayRun = z.infer<typeof ReplayRunSchema>;

// ── Cross-bundle comparison ─────────────────────────────────────────────────

export const OpDiffSchema = z
  .object({
    sequence: z.number().int().nonnegative(),
    left: CADOperationSchema.nullable(),
    right: CADOperationSchema.nullable(),
    diff: z.enum(["added", "removed", "modified", "reordered", "unchanged"]),
    /** Which top-level fields changed. */
    changedFields: z.array(z.string()).default([]),
  })
  .strict();

export type OpDiff = z.infer<typeof OpDiffSchema>;

export const BundleDiffSchema = z
  .object({
    leftBundleId: z.string(),
    rightBundleId: z.string(),
    diffs: z.array(OpDiffSchema),
    summary: z
      .object({
        added: z.number().int().nonnegative(),
        removed: z.number().int().nonnegative(),
        modified: z.number().int().nonnegative(),
        unchanged: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export type BundleDiff = z.infer<typeof BundleDiffSchema>;

// ── Cross-bundle search ─────────────────────────────────────────────────────

export const SearchHitSchema = z
  .object({
    bundleId: z.string(),
    opId: z.string(),
    sequence: z.number().int().nonnegative(),
    score: z.number().nonnegative(),
    reason: z.string(),
  })
  .strict();

export type SearchHit = z.infer<typeof SearchHitSchema>;

// ── Retrain queue ───────────────────────────────────────────────────────────

export const RetrainEntrySchema = z
  .object({
    entryId: z.string(),
    bundleId: z.string(),
    opId: z.string(),
    failureClass: z.enum(FAILURE_CLASSES),
    reason: z.string(),
    capturedAt: z.string(),
    priority: z.number().int().min(1).max(10).default(5),
  })
  .strict();

export type RetrainEntry = z.infer<typeof RetrainEntrySchema>;
