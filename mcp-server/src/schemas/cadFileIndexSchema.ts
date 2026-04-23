/**
 * cadFileIndexSchema — Zod schemas for CADFileIndexerEngine (U-CINF01)
 *
 * Defines the master index and per-file metadata shapes written to
 * data/state/cad-file-index/master-index.json.
 *
 * schemaVersion: 1 — must increment when any field is added/removed.
 *
 * @module schemas/cadFileIndexSchema
 */

import { z } from "zod";

// ── Supported CAD/CAM file extensions ────────────────────────────────────────

export const CAD_FORMATS = [
  ".sldprt",
  ".sldasm",
  ".slddrw",
  ".ipt",
  ".iam",
  ".idw",
  ".FCStd",
  ".f3d",
  ".f3z",
  ".mcx-8",
  ".MCX",
  ".mcam",
  ".hmc",
  ".step",
  ".stp",
  ".iges",
  ".igs",
  ".stl",
  ".x_t",
  ".x_b",
  // U-CADC01 R13-TE-02: add missing extensions for universal coverage
  ".dwg",
  ".dxf",
  ".3dm",
  ".sat",
  ".prt",
] as const;

export type CADFormat = (typeof CAD_FORMATS)[number];

// ── Machine category ──────────────────────────────────────────────────────────

export const MACHINE_CATEGORIES = [
  "lathe",
  "mill",
  "wire_edm",
  "sinker_edm",
  "hurco",
  "hypermill",
  "unknown",
] as const;

export type MachineCategory = (typeof MACHINE_CATEGORIES)[number];

// ── Complexity hint ───────────────────────────────────────────────────────────

export const COMPLEXITY_HINTS = [
  "simple",    // < 50 KB
  "moderate",  // 50 KB – 500 KB
  "complex",   // 500 KB – 5 MB
  "large",     // > 5 MB
] as const;

export type ComplexityHint = (typeof COMPLEXITY_HINTS)[number];

// ── Per-file entry ────────────────────────────────────────────────────────────

export const CADFileEntrySchema = z.object({
  /** SHA-256 hex digest of the absolute path (stable, path-based ID) */
  fileId: z.string().length(64),
  absolutePath: z.string().min(1),
  format: z.enum(CAD_FORMATS),
  sizeBytes: z.number().int().nonnegative(),
  customer: z.string().min(1),
  machineCategory: z.enum(MACHINE_CATEGORIES),
  complexityHint: z.enum(COMPLEXITY_HINTS),
  lastModified: z.string().datetime({ offset: true }).or(z.string().min(1)),
});

export type CADFileEntry = z.infer<typeof CADFileEntrySchema>;

// ── Index diff ────────────────────────────────────────────────────────────────

export const IndexDiffSchema = z.object({
  added: z.number().int().nonnegative(),
  deleted: z.number().int().nonnegative(),
  unchanged: z.number().int().nonnegative(),
  addedIds: z.array(z.string()),
  deletedIds: z.array(z.string()),
});

export type IndexDiff = z.infer<typeof IndexDiffSchema>;

// ── Master index ──────────────────────────────────────────────────────────────

export const MasterIndexSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().min(1),
  rootPaths: z.array(z.string()),
  totalFiles: z.number().int().nonnegative(),
  byFormat: z.record(z.string(), z.number().int().nonnegative()),
  byMachineCategory: z.record(z.string(), z.number().int().nonnegative()),
  byCustomer: z.record(z.string(), z.number().int().nonnegative()),
  lastDiff: IndexDiffSchema.optional(),
  files: z.array(CADFileEntrySchema),
});

export type MasterIndex = z.infer<typeof MasterIndexSchema>;

// ── Indexer options ───────────────────────────────────────────────────────────

export const IndexOptionsSchema = z.object({
  /** Root paths to scan. Defaults to JM Die folders. */
  rootPaths: z.array(z.string()).optional(),
  /** Output path for master-index.json */
  outputPath: z.string().optional(),
  /** Max directory recursion depth (default: 20) */
  maxDepth: z.number().int().positive().optional(),
  /** Batch write interval — flush every N files (default: 500) */
  batchSize: z.number().int().positive().optional(),
});

export type IndexOptions = z.infer<typeof IndexOptionsSchema>;
