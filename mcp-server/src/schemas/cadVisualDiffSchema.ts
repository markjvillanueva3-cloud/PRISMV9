/**
 * cadVisualDiffSchema — U-FS-05 (PHASE-47)
 *
 * Models a diff report between two CAD revisions combining:
 *   1. Feature-tree diff (added/removed/modified features)
 *   2. Parameter diff (numeric/string deltas per feature)
 *   3. Perceptual-hash screenshot diff (PHASH64 hamming distance)
 *
 * schemaVersion: 1.
 *
 * @module schemas/cadVisualDiffSchema
 */

import { z } from "zod";

// ── Feature change kinds ────────────────────────────────────────────────────

export const FEATURE_CHANGE_KINDS = [
  "added",
  "removed",
  "modified",
  "moved",       // same id, position or order changed
  "unchanged",
] as const;

export type FeatureChangeKind = (typeof FEATURE_CHANGE_KINDS)[number];

// ── FeatureSnapshot = a single item in the feature tree ─────────────────────

export const FeatureSnapshotSchema = z
  .object({
    id: z.string().min(1),
    featureType: z.string().min(1),
    /** Parameters as {key: number|string|boolean}. */
    parameters: z.record(
      z.string(),
      z.union([z.number(), z.string(), z.boolean()]),
    ),
    /** Order in the tree (0-based). */
    order: z.number().int().nonnegative(),
  })
  .strict();

export type FeatureSnapshot = z.infer<typeof FeatureSnapshotSchema>;

// ── Parameter-level diff entry ──────────────────────────────────────────────

export const ParameterDeltaSchema = z
  .object({
    key: z.string().min(1),
    before: z.union([z.number(), z.string(), z.boolean(), z.null()]),
    after: z.union([z.number(), z.string(), z.boolean(), z.null()]),
    /** Absolute delta for numeric values; undefined otherwise. */
    numericDelta: z.number().optional(),
    /** Percent change for numeric values (signed); undefined otherwise. */
    percentDelta: z.number().optional(),
  })
  .strict();

export type ParameterDelta = z.infer<typeof ParameterDeltaSchema>;

// ── Feature-level diff entry ────────────────────────────────────────────────

export const FeatureDiffSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(FEATURE_CHANGE_KINDS),
    before: FeatureSnapshotSchema.optional(),
    after: FeatureSnapshotSchema.optional(),
    parameterDeltas: z.array(ParameterDeltaSchema).default([]),
    /** Order in tree changed: beforeOrder → afterOrder. */
    orderBefore: z.number().int().nonnegative().optional(),
    orderAfter: z.number().int().nonnegative().optional(),
  })
  .strict();

export type FeatureDiff = z.infer<typeof FeatureDiffSchema>;

// ── Perceptual hash comparison ──────────────────────────────────────────────

export const PerceptualHashCompareSchema = z
  .object({
    /** Left image perceptual hash (hex, arbitrary length, must match). */
    hashA: z.string().min(4),
    /** Right image perceptual hash. */
    hashB: z.string().min(4),
    /** Hamming distance (bit-level count of differing bits). */
    hammingDistance: z.number().int().nonnegative(),
    /** Normalized similarity 0–1 (1=identical). */
    similarity: z.number().min(0).max(1),
    /** Interpretation bucket. */
    verdict: z.enum([
      "identical",         // similarity ≥ 0.98
      "near_identical",    // 0.90 ≤ similarity < 0.98
      "substantial",       // 0.70 ≤ similarity < 0.90
      "different",         // similarity < 0.70
    ]),
  })
  .strict();

export type PerceptualHashCompare = z.infer<typeof PerceptualHashCompareSchema>;

// ── Full diff report ────────────────────────────────────────────────────────

export const VisualDiffReportSchema = z
  .object({
    schemaVersion: z.literal(1),
    drawingNumber: z.string().min(1),
    beforeRevision: z.string().min(1),
    afterRevision: z.string().min(1),
    generatedAt: z.string().min(1),
    featureDiffs: z.array(FeatureDiffSchema),
    perceptual: PerceptualHashCompareSchema.optional(),
    summary: z
      .object({
        added: z.number().int().nonnegative(),
        removed: z.number().int().nonnegative(),
        modified: z.number().int().nonnegative(),
        moved: z.number().int().nonnegative(),
        unchanged: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export type VisualDiffReport = z.infer<typeof VisualDiffReportSchema>;
