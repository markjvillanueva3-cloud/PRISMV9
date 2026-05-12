/**
 * hookCreationGuardSchema — HOOK-SYNERGY-MS0 / U-HOOK-CREATION-GATE  (H5)
 *
 * Zod schemas + types for {@link ../engines/HookCreationGuardEngine.HookCreationGuardEngine}.
 *
 * Mirrors {@link ../engines/DuplicationGuardEngine.CheckBeforeCreatingInput}'s contract but
 * adds the two dimensions the generic guard can't see for hooks:
 *   - **event** — which Claude Code hook event the proposed hook will fire on
 *     (PreToolUse, PostToolUse, Stop, …);
 *   - **matcher** — the tool-name matcher pattern (`^Bash$`, `^(Edit|Write)$`, …).
 *
 * The (event, matcher) tuple is the *signature* of a hook — two hooks with the same
 * signature compete on the same trigger and are a duplication-risk class the existing
 * name-only guards (`ai-duplication-guard`, `duplication-hard-block`) miss.
 *
 * Schema version: 1.
 *
 * @module schemas/hookCreationGuardSchema
 */

import { z } from "zod";

export const HOOK_CREATION_GUARD_SCHEMA_VERSION = 1 as const;

/** A single dimension on which the proposed hook overlaps with an existing one. */
export const HookCreationMatchReasonSchema = z.enum([
  "exact-name",            // basename without extension is identical
  "fuzzy-name",            // normalized-name Levenshtein ratio ≥ 0.7
  "description-overlap",   // ≥ 2 shared content-word tokens (≥4 chars) with existing hook description
  "signature-match",       // same (event, matcher) tuple as an existing hook
]);
export type HookCreationMatchReason = z.infer<typeof HookCreationMatchReasonSchema>;

/** One existing hook that overlaps with the proposed one. */
export const HookCreationMatchSchema = z.object({
  /** Repo-relative path of the existing hook (forward-slashed). */
  file: z.string(),
  /** Basename without extension. */
  id: z.string(),
  /** Events the existing hook is wired to (empty array ⇒ on-disk only, not wired). */
  events: z.array(z.string()),
  /** Composite similarity score across the four dimensions, 0..1. */
  score: z.number().min(0).max(1),
  /** Which dimensions matched. */
  reasons: z.array(HookCreationMatchReasonSchema).min(1),
  /** Free-form detail one-liner: `fuzzy-name@0.83`, `signature-match:PreToolUse|^Bash$`, … */
  detail: z.string(),
});
export type HookCreationMatch = z.infer<typeof HookCreationMatchSchema>;

/** What the caller asked us to check. */
export const HookCreationCheckInputSchema = z.object({
  /** Filename, basename, or full path of the hook being proposed. */
  proposedName: z.string().min(1),
  /** First JSDoc line of the proposed hook (or any free-form description). May be empty. */
  description: z.string().default(""),
  /** Hook event the proposed hook will fire on, if known. */
  event: z.string().optional(),
  /** Tool-name matcher pattern (for PreToolUse/PostToolUse events), if known. */
  matcher: z.string().optional(),
  /** Repo-relative target path, if available (used for exact-path collision). */
  proposedPath: z.string().optional(),
});
export type HookCreationCheckInput = z.infer<typeof HookCreationCheckInputSchema>;

/** Aggregate recommendation. Mirrors DuplicationGuardEngine's recommendation enum. */
export const HookCreationRecommendationSchema = z.enum(["skip", "extend", "rename", "proceed"]);
export type HookCreationRecommendation = z.infer<typeof HookCreationRecommendationSchema>;

/** Final verdict the engine returns. */
export const HookCreationCheckResultSchema = z.object({
  schemaVersion: z.literal(HOOK_CREATION_GUARD_SCHEMA_VERSION),
  /** Mirror of DuplicationGuardEngine's `shouldProceed` flag — false on any blocking match. */
  shouldProceed: z.boolean(),
  /** `skip` (exact match) → `extend` (high-confidence overlap) → `rename` (close name) → `proceed`. */
  recommendation: HookCreationRecommendationSchema,
  /** Short reason string suitable for a log line / block message. */
  reason: z.string(),
  /** Every match found, sorted by score descending. May be empty when `shouldProceed` is true. */
  matches: z.array(HookCreationMatchSchema),
  /** The highest-scoring match (if any). Provided for ergonomics; equal to matches[0] when present. */
  topMatch: HookCreationMatchSchema.optional(),
});
export type HookCreationCheckResult = z.infer<typeof HookCreationCheckResultSchema>;
