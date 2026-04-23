/**
 * cadUniversalRegistrySchema — Zod schemas for UniversalCADFileRegistryEngine
 * (U-CADC01 / CAD-COMPLETE-MS0 PHASE-0 "Universal CAD File Registry").
 *
 * Unifies the four existing CAD registry subsystems behind a single
 * queryable surface:
 *   - CADFileIndexerEngine              (U-CINF01)  path-keyed master index
 *   - CADContentAddressableStoreEngine  (U-FS-01)   content-hashed CAS
 *   - CADFileClassifierEngine           (U-CINF02)  format → category/strategy
 *   - CADRevisionDetectorEngine         (U-FS-03)   filename → revision tag
 *
 * schemaVersion: 1 — bump on breaking field change.
 *
 * @module schemas/cadUniversalRegistrySchema
 */

import { z } from "zod";
import {
  CAD_FORMATS,
  MACHINE_CATEGORIES,
  COMPLEXITY_HINTS,
} from "./cadFileIndexSchema.js";
import {
  CLASSIFICATION_CATEGORIES,
  TEST_STRATEGIES,
} from "./cadFileClassificationSchema.js";
import { REVISION_SCHEMES } from "./cadRevisionSchema.js";
import { TENANT_VISIBILITY } from "./cadFileRegistrySchema.js";

// ── UnifiedRecord: one row combining all four subsystems ─────────────────────

export const UnifiedClassificationSchema = z
  .object({
    category: z.enum(CLASSIFICATION_CATEGORIES),
    testStrategy: z.enum(TEST_STRATEGIES),
    handler: z.string().min(1).optional(),
  })
  .strict();

export const UnifiedRevisionSchema = z
  .object({
    drawingNumber: z.string().min(1),
    revision: z.string(),
    scheme: z.enum(REVISION_SCHEMES),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export const UnifiedContentSchema = z
  .object({
    contentHash: z
      .string()
      .regex(/^[0-9a-f]{64}$/, "contentHash must be 64-char lowercase hex"),
    visibility: z.enum(TENANT_VISIBILITY),
    tags: z.array(z.string()),
    sizeBytes: z.number().int().nonnegative(),
  })
  .strict();

export const UnifiedRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    fileId: z.string().length(64),
    absolutePath: z.string().min(1),
    filename: z.string().min(1),
    format: z.enum(CAD_FORMATS),
    sizeBytes: z.number().int().nonnegative(),
    customer: z.string().min(1),
    machineCategory: z.enum(MACHINE_CATEGORIES),
    complexityHint: z.enum(COMPLEXITY_HINTS),
    lastModified: z.string().min(1),
    classification: UnifiedClassificationSchema,
    revision: UnifiedRevisionSchema,
    /** Populated only when the path has been ingested into the CAS. */
    content: UnifiedContentSchema.nullable(),
  })
  .strict();

export type UnifiedRecord = z.infer<typeof UnifiedRecordSchema>;

// ── Universal query filter ───────────────────────────────────────────────────

export const UniversalQuerySchema = z
  .object({
    format: z.enum(CAD_FORMATS).optional(),
    category: z.enum(CLASSIFICATION_CATEGORIES).optional(),
    customer: z.string().min(1).optional(),
    machineCategory: z.enum(MACHINE_CATEGORIES).optional(),
    revisionScheme: z.enum(REVISION_SCHEMES).optional(),
    /** True = only CAS-ingested content, false = only path-only, omitted = both. */
    hasContent: z.boolean().optional(),
    /** Cap result size (defensive — full scan is O(F)). */
    limit: z.number().int().positive().max(100_000).optional(),
  })
  .strict()
  .default({});

export type UniversalQuery = z.infer<typeof UniversalQuerySchema>;

// ── Combined statistics across the four subsystems ──────────────────────────

export const RegistryStatsSchema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: z.string().min(1),
    indexer: z
      .object({
        totalFiles: z.number().int().nonnegative(),
        byFormat: z.record(z.string(), z.number().int().nonnegative()),
        byCustomer: z.record(z.string(), z.number().int().nonnegative()),
        byMachineCategory: z.record(z.string(), z.number().int().nonnegative()),
      })
      .strict(),
    classifier: z
      .object({
        totalClassified: z.number().int().nonnegative(),
        byCategory: z.record(z.string(), z.number().int().nonnegative()),
        byTestStrategy: z.record(z.string(), z.number().int().nonnegative()),
      })
      .strict(),
    cas: z
      .object({
        totalEntries: z.number().int().nonnegative(),
        totalPaths: z.number().int().nonnegative(),
        duplicateContentCount: z.number().int().nonnegative(),
      })
      .strict(),
    revisions: z
      .object({
        families: z.number().int().nonnegative(),
        revisionedFiles: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export type RegistryStats = z.infer<typeof RegistryStatsSchema>;

// ── Revision family — one drawing number with all observed revs ─────────────

export const RevisionFamilySchema = z
  .object({
    drawingNumber: z.string().min(1),
    count: z.number().int().positive(),
    latestRevision: z.string().optional(),
    latestConfidence: z.number().min(0).max(1).optional(),
    members: z
      .array(
        z
          .object({
            fileId: z.string().length(64),
            absolutePath: z.string().min(1),
            revision: z.string(),
            confidence: z.number().min(0).max(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type RevisionFamily = z.infer<typeof RevisionFamilySchema>;
