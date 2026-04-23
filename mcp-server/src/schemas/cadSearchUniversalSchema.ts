/**
 * cadSearchUniversalSchema — U-FS-08 (PHASE-47)
 *
 * Indexes CAD entities for unified search across 5 modalities:
 *   - Full-text (name, description, tags)
 *   - Semantic (embedding cosine similarity)
 *   - Visual (perceptual-hash Hamming neighbor)
 *   - Spec (material, finish, dimensions)
 *   - Tolerance range (min/max on any numeric spec)
 *
 * schemaVersion: 1.
 *
 * @module schemas/cadSearchUniversalSchema
 */

import { z } from "zod";

// ── Spec attributes a document can carry ────────────────────────────────────

export const SearchSpecSchema = z
  .object({
    material: z.string().optional(),
    finish: z.string().optional(),
    customer: z.string().optional(),
    /** Arbitrary numeric specs (e.g. "depth_mm": 12.5). */
    numericSpecs: z.record(z.string(), z.number()).default({}),
    /** Arbitrary string tags (searchable by exact equality). */
    tags: z.array(z.string()).default([]),
  })
  .strict();

export type SearchSpec = z.infer<typeof SearchSpecSchema>;

// ── Indexed CAD entity ──────────────────────────────────────────────────────

export const SearchDocumentSchema = z
  .object({
    id: z.string().min(1),
    canonicalName: z.string().min(1),
    description: z.string().default(""),
    /** Semantic embedding (optional; dimension must match engine config). */
    embedding: z.array(z.number()).optional(),
    /** Perceptual hash hex (optional). */
    perceptualHash: z
      .string()
      .regex(/^[0-9a-f]+$/)
      .optional(),
    spec: SearchSpecSchema.default({ numericSpecs: {}, tags: [] }),
  })
  .strict();

export type SearchDocument = z.infer<typeof SearchDocumentSchema>;

// ── Query + result ──────────────────────────────────────────────────────────

export const SearchModes = [
  "full_text",
  "semantic",
  "visual",
  "spec",
  "tolerance",
  "natural_language",
  "unified",
] as const;

export type SearchMode = (typeof SearchModes)[number];

export const ToleranceRangeSchema = z
  .object({
    key: z.string().min(1),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .strict();

export type ToleranceRange = z.infer<typeof ToleranceRangeSchema>;

export const SearchQuerySchema = z
  .object({
    mode: z.enum(SearchModes).default("unified"),
    text: z.string().optional(),
    embedding: z.array(z.number()).optional(),
    perceptualHash: z
      .string()
      .regex(/^[0-9a-f]+$/)
      .optional(),
    specFilter: SearchSpecSchema.partial().optional(),
    toleranceRanges: z.array(ToleranceRangeSchema).default([]),
    naturalLanguage: z.string().optional(),
    limit: z.number().int().positive().max(500).default(25),
  })
  .strict();

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const SearchResultSchema = z
  .object({
    id: z.string().min(1),
    canonicalName: z.string().min(1),
    /** Unified score in [0,1] (higher is better). */
    score: z.number().min(0).max(1),
    /** Per-mode subscores (only populated for modalities that ran). */
    subscores: z
      .object({
        full_text: z.number().min(0).max(1).optional(),
        semantic: z.number().min(0).max(1).optional(),
        visual: z.number().min(0).max(1).optional(),
        spec: z.number().min(0).max(1).optional(),
        tolerance: z.number().min(0).max(1).optional(),
      })
      .strict()
      .default({}),
  })
  .strict();

export type SearchResult = z.infer<typeof SearchResultSchema>;
