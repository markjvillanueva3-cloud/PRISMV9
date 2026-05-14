/**
 * Hook State File Zod Schemas (CPP-MS4-U-CPP32)
 * ===============================================
 *
 * Zod schemas for the 4 hook-produced state file families that compaction
 * pipeline readers (compact-restore.mjs, compaction-survival.mjs,
 * post-compact-enhanced.mjs) consume on every session boot.
 *
 * Before U-CPP32, these readers used bare `JSON.parse()` with swallowed
 * `catch {}` handlers — malformed state files went unnoticed, producing
 * silent cascade failures downstream. Readers now call `safeParseX(raw)`
 * which returns `{ ok: true, data }` on success and `{ ok: false, error }`
 * on failure, enabling fail-loud logging at the boundary.
 *
 * Schemas are deliberately permissive on extra fields (passthrough) so
 * non-breaking additions in hook writers don't require synchronized
 * schema bumps. Required fields are the invariants downstream code needs.
 *
 * @milestone CPP-MS4-U-CPP32
 */

import { z } from "zod";

// ============================================================================
// SHARED SUB-SCHEMAS
// ============================================================================

const IsoDateString = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "must be ISO date string" });

const SchemaVersionString = z.string().regex(/^\d+\.\d+\.\d+$/, { message: "semver required" });
const SchemaVersionNumber = z.number().int().positive();

// ============================================================================
// 1. SESSION_ARTIFACTS.json
// ============================================================================

/**
 * Produced by: post-compact-enhanced.mjs
 * Consumed by: compact-restore.mjs (Feature Cascade block)
 *
 * Shape (seed + live):
 *   { schemaVersion, event, timestamp, system_counts, recent_additions, feature_cascade }
 */
export const SessionArtifactsSchema = z
  .object({
    schemaVersion: SchemaVersionString,
    event: z.enum(["seed", "post_compact", "session_end", "manual"]),
    timestamp: IsoDateString,
    system_counts: z
      .object({
        engines: z.number().int().nonnegative(),
        dispatchers: z.number().int().nonnegative(),
        tests: z.number().int().nonnegative(),
      })
      .passthrough(),
    recent_additions: z
      .object({
        new_engines: z.array(z.string()).default([]),
        new_hooks: z.array(z.string()).default([]),
        new_skills: z.array(z.string()).default([]),
        new_dispatchers: z.array(z.string()).default([]),
      })
      .passthrough(),
    feature_cascade: z
      .object({
        engines_available: z.number().int().nonnegative().optional(),
        dispatchers_available: z.number().int().nonnegative().optional(),
        note: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type SessionArtifacts = z.infer<typeof SessionArtifactsSchema>;

// ============================================================================
// 2. post-compact-log.json
// ============================================================================

/**
 * Produced by: post-compact-enhanced.mjs (appends on every SessionStart:compact)
 * Consumed by: post-compact consolidation + integrity checks.
 */
export const PostCompactEventSchema = z
  .object({
    timestamp: IsoDateString,
    session_id: z.string().min(1).optional(),
    family: z.enum(["claude", "codex", "other"]).optional(),
    machine: z.string().min(1).optional(),
    instance: z.string().min(1).optional(),
    call_number: z.number().int().nonnegative().optional(),
    pressure_pct: z.number().min(0).max(100).optional(),
    survival_bytes: z.number().int().nonnegative().optional(),
    handoff_present: z.boolean().optional(),
    artifacts_ok: z.boolean().optional(),
  })
  .passthrough();

export const PostCompactLogSchema = z
  .object({
    schemaVersion: SchemaVersionString,
    events: z.array(PostCompactEventSchema),
  })
  .passthrough();

export type PostCompactEvent = z.infer<typeof PostCompactEventSchema>;
export type PostCompactLog = z.infer<typeof PostCompactLogSchema>;

// ============================================================================
// 3. HANDOFF-*.md (parsed header + sections)
// ============================================================================

/**
 * HANDOFF files are markdown but structured. This schema validates the
 * minimal metadata that compact-restore.mjs needs to route correctly
 * (family/machine/instance from CPP-MS3-U-CPP21 per-terminal addressability).
 *
 * Parsing (caller's responsibility): extract from `# HANDOFF: <name>` header
 * and `Family: X | Machine: Y | Session: Z` line, plus the RESUME/STATE sections.
 */
export const HandoffMetadataSchema = z
  .object({
    title: z.string().min(1),
    updated_at: IsoDateString.optional(),
    family: z.enum(["claude", "codex", "other"]).optional(),
    machine: z.string().min(1).optional(),
    session: z.string().min(1).optional(),
    state: z.string().optional(),       // body of ## STATE
    resume: z.string().optional(),      // body of ## RESUME
    context: z.string().optional(),     // body of ## CONTEXT
  })
  .passthrough();

export type HandoffMetadata = z.infer<typeof HandoffMetadataSchema>;

// ============================================================================
// 4. .compaction-survival-<instance>.md (parsed header)
// ============================================================================

/**
 * Compaction-survival markdown with a frontmatter-like header. The Zod
 * schema validates the fields compact-restore.mjs parses into the survival
 * block (position, progress, SVI state, handoff snippet).
 */
export const CompactionSurvivalMetadataSchema = z
  .object({
    generated: IsoDateString,
    instance: z.string().min(1).optional(),
    position: z.string().optional(),
    roadmap_progress: z.string().optional(),
    svi_state: z.string().optional(),
    session_summary: z.string().optional(),
  })
  .passthrough();

export type CompactionSurvivalMetadata = z.infer<typeof CompactionSurvivalMetadataSchema>;

// ============================================================================
// SAFE-PARSE WRAPPERS (fail-loud but non-throwing)
// ============================================================================

/**
 * Uniform result shape: readers pattern-match on `.ok` and get either `data`
 * or a formatted `error` string. No exceptions cross this boundary.
 */
export type SafeParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function formatZodError(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
    .join("; ");
}

export function safeParseSessionArtifacts(raw: unknown): SafeParseResult<SessionArtifacts> {
  const result = SessionArtifactsSchema.safeParse(raw);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, error: formatZodError(result.error) };
}

export function safeParsePostCompactLog(raw: unknown): SafeParseResult<PostCompactLog> {
  const result = PostCompactLogSchema.safeParse(raw);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, error: formatZodError(result.error) };
}

export function safeParseHandoffMetadata(raw: unknown): SafeParseResult<HandoffMetadata> {
  const result = HandoffMetadataSchema.safeParse(raw);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, error: formatZodError(result.error) };
}

export function safeParseCompactionSurvivalMetadata(raw: unknown): SafeParseResult<CompactionSurvivalMetadata> {
  const result = CompactionSurvivalMetadataSchema.safeParse(raw);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, error: formatZodError(result.error) };
}

/**
 * Convenience: safely parse raw JSON text. Returns a structured error for
 * either JSON malformation OR schema violation, so callers can log both
 * categories uniformly.
 */
export function safeParseJsonWith<T>(
  text: string,
  parser: (raw: unknown) => SafeParseResult<T>,
): SafeParseResult<T> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `malformed JSON: ${(e as Error).message}` };
  }
  return parser(raw);
}

// Re-export the numeric schemaVersion helper for state-file schemas
// (COMPACTION_SURVIVAL.json etc. carry integer schemaVersion per U-CPP31).
export { SchemaVersionNumber };
