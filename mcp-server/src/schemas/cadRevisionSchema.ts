/**
 * cadRevisionSchema — Zod schemas for CADRevisionDetectorEngine (U-FS-03)
 *
 * Models a revision token extracted from a CAD filename. Closes R14-FS-03:
 * "no unit covers Rev.A/B/C, v1/v2, -02, _R3 filename heuristics or
 * canonical revision normalization."
 *
 * schemaVersion: 1.
 *
 * @module schemas/cadRevisionSchema
 */

import { z } from "zod";

// ── Revision scheme families encountered in real shops ──────────────────────

export const REVISION_SCHEMES = [
  "alpha",       // Rev.A, RevB, REV-C, _A
  "numeric",     // v1, v2, -01, _02
  "alpha_num",   // A1, B2, R1A
  "dotted",      // 1.0, 2.1
  "iso_date",    // 2024-03-15 rev date
  "unknown",
] as const;

export type RevisionScheme = (typeof REVISION_SCHEMES)[number];

// ── Revision confidence source ──────────────────────────────────────────────

export const REVISION_CONFIDENCE_SOURCES = [
  "explicit_tag",     // "Rev.B", "_R3"
  "dash_numeric",     // "bracket-02"
  "underscore_alpha", // "bracket_A"
  "version_v",        // "v3", "V12"
  "dotted_version",   // "1.2"
  "trailing_letter",  // "bracketA" (ambiguous; low confidence)
  "iso_date",         // "2024-03-15"
  "none",
] as const;

export type RevisionConfidenceSource = (typeof REVISION_CONFIDENCE_SOURCES)[number];

// ── RevisionTag = the extracted result ──────────────────────────────────────

export const RevisionTagSchema = z
  .object({
    /** Raw filename (no directory). */
    rawFilename: z.string().min(1),
    /** Canonical drawing/part number with revision stripped. */
    drawingNumber: z.string().min(1),
    /** Canonical revision label (uppercased, no punctuation). "" if none. */
    revision: z.string().default(""),
    /** Numeric component if any (e.g. for v3 → 3; -02 → 2). */
    revisionNumber: z.number().int().nonnegative().optional(),
    /** Detected scheme. */
    scheme: z.enum(REVISION_SCHEMES),
    /** Origin of the detection — drives confidence. */
    source: z.enum(REVISION_CONFIDENCE_SOURCES),
    /** Confidence score in [0,1]. */
    confidence: z.number().min(0).max(1),
    /** File extension stripped from original (lowercase, with dot). */
    extension: z.string().default(""),
  })
  .strict();

export type RevisionTag = z.infer<typeof RevisionTagSchema>;

// ── Revision-group stats (for a given drawingNumber family) ─────────────────

export const RevisionGroupSchema = z
  .object({
    drawingNumber: z.string().min(1),
    revisions: z.array(RevisionTagSchema),
    /** Latest revision — or undefined if no confidently ranked candidate. */
    latestRevision: RevisionTagSchema.optional(),
    /** Sort order used ("alpha" | "numeric" | "mixed"). */
    sortOrder: z.enum(["alpha", "numeric", "mixed", "unknown"]),
  })
  .strict();

export type RevisionGroup = z.infer<typeof RevisionGroupSchema>;
