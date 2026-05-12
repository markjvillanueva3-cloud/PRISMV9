/**
 * hookDAGSchema — HOOK-MANIFEST-DAG-MS26 / P0-U02
 *
 * Zod schema + types for {@link ../engines/HookDAGValidatorEngine.HookDAGValidatorEngine}'s output.
 *
 * The validator consumes a {@link ../schemas/hookManifestSchema.HookManifest} (output of
 * {@link ../engines/HookManifestEngine.HookManifestEngine}, P0-U01) and produces, *per event*,
 * (a) the implicit hook execution DAG derived from settings-file ordering + cross-source
 * lexical order, (b) every cycle found in that DAG, and (c) a deterministic linearized
 * order when the per-event graph is a true DAG (no cycle).
 *
 * Conflicts surfaced at the engine level (not encoded in the DAG itself but worth flagging):
 *  - **mixed-block-mode**: a file is wired with `continueOnError:false` in one source and
 *    `true`/`undefined` in another → ambiguous hard-block semantics across configs;
 *  - **duplicate-wiring**: a file is wired twice under the *same* (source, event, matcher,
 *    args, timeout, continueOnError) tuple (HookManifestEngine dedupes identical wirings,
 *    so this only surfaces when the duplicate has some differing field — useful as drift
 *    signal).
 *
 * Schema version: 1. Additive-only changes until a breaking shift forces a bump (and a
 * migration in `src/migrations/`).
 *
 * @module schemas/hookDAGSchema
 */

import { z } from "zod";

export const HOOK_DAG_SCHEMA_VERSION = 1 as const;

/**
 * One directed edge in a per-event hook execution graph. The edge is implied either by
 *  - `same-source-order`: two wirings live in the same settings file; the one with the
 *    lower `order` index runs first;
 *  - `cross-source`: the two files are wired in *different* settings files; the source
 *    file paths are compared lexicographically (a stable, deterministic, file-scoped
 *    order — the harness has no documented cross-file precedence, so lex is the only
 *    reproducible choice).
 */
export const HookDAGEdgeSchema = z.object({
  /** Hook file that fires first (relative-to-repo-root, forward-slashed). */
  from: z.string(),
  /** Hook file that fires after. */
  to: z.string(),
  /** Why this edge exists. */
  reason: z.enum(["same-source-order", "cross-source"]),
  /** When `reason === "same-source-order"`, the settings file the edge came from. */
  source: z.string().optional(),
});
export type HookDAGEdge = z.infer<typeof HookDAGEdgeSchema>;

/**
 * A cycle is a closed loop of files where each step is implied by an edge in the per-event
 * graph. `files` lists the cycle nodes in traversal order; the first file is repeated as
 * the last entry so consumers can render the loop literally.
 */
export const HookDAGCycleSchema = z.object({
  /** Files on the cycle, in traversal order. The first entry is repeated as the last. */
  files: z.array(z.string()).min(3),
  /** Edges that form the cycle (length === files.length - 1). */
  edges: z.array(HookDAGEdgeSchema),
});
export type HookDAGCycle = z.infer<typeof HookDAGCycleSchema>;

/** A per-file integrity flag the validator surfaces alongside the DAG itself. */
export const HookDAGConflictSchema = z.object({
  /** The file the conflict is about. */
  file: z.string(),
  kind: z.enum(["mixed-block-mode", "duplicate-wiring"]),
  /** Settings files involved in the conflict (sorted). */
  sources: z.array(z.string()),
  /** Free-form explanation suitable for a log line. */
  detail: z.string(),
});
export type HookDAGConflict = z.infer<typeof HookDAGConflictSchema>;

/** Per-event validation result — the unit of work in `HookDAGValidatorEngine.validate()`. */
export const HookDAGEventSchema = z.object({
  /** The event name (e.g. "PreToolUse", "Stop", …). */
  event: z.string(),
  /** Hook files wired to this event (sorted, deduped). Empty ⇒ event listed nowhere. */
  nodes: z.array(z.string()),
  /** Every directed edge in the per-event graph. Deduped, sorted (`from`, `to`, `reason`). */
  edges: z.array(HookDAGEdgeSchema),
  /**
   * Deterministic topological order of `nodes`. `null` when one or more cycles exist —
   * a partial order can't be linearized.
   */
  order: z.array(z.string()).nullable(),
  /** Every cycle the validator could find. Empty when the per-event graph is acyclic. */
  cycles: z.array(HookDAGCycleSchema),
  /** Non-fatal integrity findings about wiring records contributing to this event. */
  conflicts: z.array(HookDAGConflictSchema),
});
export type HookDAGEvent = z.infer<typeof HookDAGEventSchema>;

export const HookDAGSummarySchema = z.object({
  /** Distinct events the validator inspected. */
  totalEvents: z.number().int().nonnegative(),
  /** Sum of `nodes.length` across events (a file wired to N events counts N times). */
  totalNodes: z.number().int().nonnegative(),
  /** Sum of `edges.length` across events. */
  totalEdges: z.number().int().nonnegative(),
  /** Sum of `cycles.length` across events. */
  cycleCount: z.number().int().nonnegative(),
  /** Sum of `conflicts.length` across events. */
  conflictCount: z.number().int().nonnegative(),
  /** Events with `cycles.length === 0`. */
  cleanEvents: z.number().int().nonnegative(),
  /** Events with `cycles.length > 0`. */
  dirtyEvents: z.number().int().nonnegative(),
});
export type HookDAGSummary = z.infer<typeof HookDAGSummarySchema>;

export const HookDAGValidationSchema = z.object({
  schemaVersion: z.literal(HOOK_DAG_SCHEMA_VERSION),
  generatedAt: z.string(),
  /** Mirror of the source manifest's `generatedAt`, so consumers can verify version match. */
  manifestGeneratedAt: z.string(),
  /** Mirror of the source manifest's `repoRoot`, for log/diagnostic purposes. */
  manifestRepoRoot: z.string(),
  /** Aggregate verdict: `true` iff every event has zero cycles. Conflicts do not flip `ok`. */
  ok: z.boolean(),
  /** Per-event results, sorted by event name (known events first, then alpha). */
  events: z.array(HookDAGEventSchema),
  summary: HookDAGSummarySchema,
});
export type HookDAGValidation = z.infer<typeof HookDAGValidationSchema>;
