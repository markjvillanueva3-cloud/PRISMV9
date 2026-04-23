/**
 * cadDrawingNumberSchema — U-FS-06 (PHASE-47)
 *
 * Models parsed + canonicalized drawing numbers and the part-family
 * hierarchy: family → config → drawing → revision.
 *
 * schemaVersion: 1.
 *
 * @module schemas/cadDrawingNumberSchema
 */

import { z } from "zod";

// ── Parsed drawing number ───────────────────────────────────────────────────

export const ParsedDrawingNumberSchema = z
  .object({
    /** Raw input as provided. */
    raw: z.string().min(1),
    /** Canonical uppercase, normalized separators, zero-padded numeric runs. */
    canonical: z.string().min(1),
    /** Optional prefix (customer code / family tag). */
    prefix: z.string().optional(),
    /** Numeric body (if any). */
    numericBody: z.string().optional(),
    /** Config / dash suffix (e.g. "-01", "-BASE"). */
    configSuffix: z.string().optional(),
    /** Part family key — prefix + first numeric block (left half). */
    familyKey: z.string().min(1),
  })
  .strict();

export type ParsedDrawingNumber = z.infer<typeof ParsedDrawingNumberSchema>;

// ── Part family node ────────────────────────────────────────────────────────

export const PartFamilyNodeSchema = z
  .object({
    familyKey: z.string().min(1),
    configs: z.array(z.string()).default([]),
    drawings: z.array(z.string()).default([]),
  })
  .strict();

export type PartFamilyNode = z.infer<typeof PartFamilyNodeSchema>;

// ── Fuzzy lookup result ─────────────────────────────────────────────────────

export const FuzzyMatchSchema = z
  .object({
    canonical: z.string().min(1),
    distance: z.number().int().nonnegative(),
    /** Score = 1 - distance/maxLen (normalized in [0,1]). */
    score: z.number().min(0).max(1),
  })
  .strict();

export type FuzzyMatch = z.infer<typeof FuzzyMatchSchema>;
