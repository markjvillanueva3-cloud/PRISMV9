/**
 * cadFileClassificationSchema — Zod schemas for CADFileClassifierEngine (U-CINF02)
 *
 * Classification tags per CAD file, feeding per-type regression test strategies.
 *
 * schemaVersion: 1 — must increment when any field is added/removed.
 *
 * @module schemas/cadFileClassificationSchema
 */

import { z } from "zod";
import { CAD_FORMATS, CADFileEntrySchema } from "./cadFileIndexSchema.js";

// ── Classification categories ─────────────────────────────────────────────────

export const CLASSIFICATION_CATEGORIES = [
  "part",      // .sldprt, .ipt, .FCStd, .f3d, .f3z (single body/assembly-capable native)
  "assembly",  // .sldasm, .iam
  "drawing",   // .slddrw, .idw
  "cam",       // .mcx-8, .MCX, .mcam, .hmc
  "neutral",   // .step, .stp, .iges, .igs, .stl (kernel-neutral exchange)
  "kernel",    // .x_t, .x_b (Parasolid kernel exchange; kernel-native single body)
  "unknown",
] as const;

export type ClassificationCategory = (typeof CLASSIFICATION_CATEGORIES)[number];

// ── Per-type regression test strategy ─────────────────────────────────────────

export const TEST_STRATEGIES = [
  "open_part",         // bridge.open → extract feature tree → export STEP
  "open_assembly",     // bridge.open → walk component tree → export STEP per component
  "open_drawing",      // bridge.open → extract views → export PDF + annotations
  "open_cam",          // bridge.open → walk operation tree → extract toolpaths
  "import_neutral",    // OCCT/STEP reader → dimensional signature only
  "import_kernel",     // Parasolid reader → dimensional signature only
  "skip",              // unknown format — skipped from regression
] as const;

export type TestStrategy = (typeof TEST_STRATEGIES)[number];

// ── Per-file classification result ────────────────────────────────────────────

export const CADFileClassificationSchema = z.object({
  fileId: z.string().length(64).describe("SHA-256 fileId from master-index"),
  format: z.enum(CAD_FORMATS).describe("Extension as recorded in master-index"),
  category: z.enum(CLASSIFICATION_CATEGORIES).describe("Part/assembly/drawing/CAM/neutral/kernel/unknown"),
  testStrategy: z.enum(TEST_STRATEGIES).describe("Downstream regression test strategy tag"),
  /** Bridge or parser that handles this category+format. Undefined for 'skip'. */
  handler: z.string().min(1).optional().describe("Bridge/parser target"),
});

export type CADFileClassification = z.infer<typeof CADFileClassificationSchema>;

// ── Classification roll-up ────────────────────────────────────────────────────

export const ClassificationSummarySchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().min(1).describe("ISO-8601 timestamp of classification run"),
  totalFiles: z.number().int().nonnegative(),
  byCategory: z.record(z.string(), z.number().int().nonnegative())
    .describe("Histogram: category → count"),
  byStrategy: z.record(z.string(), z.number().int().nonnegative())
    .describe("Histogram: testStrategy → count"),
  classifications: z.array(CADFileClassificationSchema),
});

export type ClassificationSummary = z.infer<typeof ClassificationSummarySchema>;

// ── Classifier options ────────────────────────────────────────────────────────

export const ClassifyOptionsSchema = z.object({
  /** Emit full per-file list (default true). If false, only aggregates. */
  includeClassifications: z.boolean().optional().describe("Include per-file list"),
});

export type ClassifyOptions = z.infer<typeof ClassifyOptionsSchema>;

// Re-export for co-location
export { CADFileEntrySchema };
