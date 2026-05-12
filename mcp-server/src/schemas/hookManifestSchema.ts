/**
 * hookManifestSchema — HOOK-MANIFEST-DAG-MS26 / P0-U01
 *
 * Zod schema + types for the static hook manifest produced by
 * {@link ../engines/HookManifestEngine.HookManifestEngine}. The manifest is a
 * single JSON catalog of every hook *file* on disk (`.claude/hooks/*.mjs` +
 * `mcp-server/src/hooks/*.ts`) joined against every hook *wiring* declared in
 * the `hooks` block of the active `settings.json` files. It is the canonical
 * input for HookDAGValidatorEngine (P0-U02), hook-coverage tooling, and the
 * `prism_hook:manifest` dispatcher action.
 *
 * Why a static manifest (vs. the live `hookEngine.listHooks()`): `hookEngine`
 * tracks the *registered* hooks of the running MCP server; this manifest tracks
 * the *Claude Code* hook surface (the `.mjs` files the harness fires on
 * SessionStart / PreToolUse / Stop / …), which `hookEngine` knows nothing
 * about. They are complementary, not redundant.
 *
 * Schema version: 1 (no migration needed yet — additive changes only until a
 * breaking change forces a bump, at which point a migration goes in
 * `src/migrations/`).
 *
 * @module schemas/hookManifestSchema
 */

import { z } from "zod";

export const HOOK_MANIFEST_SCHEMA_VERSION = 1 as const;

/**
 * Claude Code hook event types. Kept permissive (the manifest stores whatever
 * key appears in settings.json), but this enum documents the known set as of
 * 2026-05 and is used for ordering / display.
 */
export const KNOWN_HOOK_EVENTS = [
  "SessionStart",
  "SessionEnd",
  "PreCompact",
  "Stop",
  "SubagentStart",
  "SubagentStop",
  "PreToolUse",
  "PostToolUse",
  "UserPromptSubmit",
  "Notification",
] as const;
export type KnownHookEvent = (typeof KNOWN_HOOK_EVENTS)[number];

/** Where a hook file lives — determines lifecycle owner and language. */
export const HookKindSchema = z.enum(["claude-mjs", "mcp-ts", "other"]);
export type HookKind = z.infer<typeof HookKindSchema>;

/** One wiring of a hook file into a single (event, matcher) slot of a settings file. */
export const HookWiringSchema = z.object({
  /** Event type (one of {@link KNOWN_HOOK_EVENTS}, but stored as-is). */
  event: z.string(),
  /** Tool matcher for PreToolUse/PostToolUse ("Bash", "Edit|Write", "*", …); "" for matcher-less events. */
  matcher: z.string().default(""),
  /** Per-hook timeout in ms, if declared. */
  timeoutMs: z.number().int().nonnegative().optional(),
  /** `false` ⇒ a hard-block hook (a non-zero exit blocks the tool/turn). `undefined` ⇒ harness default. */
  continueOnError: z.boolean().optional(),
  /** Extra CLI args appended after the script path (e.g. `--pre`, `--post`). */
  args: z.string().optional(),
  /** Which settings file declared this wiring (absolute path). */
  source: z.string(),
  /** Order index of this wiring within its event array (chain position). */
  order: z.number().int().nonnegative(),
});
export type HookWiring = z.infer<typeof HookWiringSchema>;

/** One hook file plus the union of its wirings. */
export const HookEntrySchema = z.object({
  /** Display id — the filename without extension (may collide across dirs; `file` is the unique key). */
  id: z.string(),
  /** Path relative to the repo root, forward-slashed (unique within a manifest). */
  file: z.string(),
  kind: HookKindSchema,
  sizeBytes: z.number().int().nonnegative(),
  lineCount: z.number().int().nonnegative(),
  /** First JSDoc/comment line of the file, trimmed; "" if none found. */
  description: z.string(),
  /** Best-effort static list of exported symbol names ("default" for a default export). */
  exports: z.array(z.string()),
  /** True ⇔ referenced by ≥1 wiring in some settings file. */
  wired: z.boolean(),
  /** True ⇔ any wiring has `continueOnError === false` (a hard-block hook). */
  hardBlock: z.boolean(),
  /** Distinct event types this file is wired to (sorted, deduped). */
  events: z.array(z.string()),
  /** Every wiring of this file, in (source, event, order) order. */
  wirings: z.array(HookWiringSchema),
});
export type HookEntry = z.infer<typeof HookEntrySchema>;

/** A settings.json command that points at a script not present in any scanned hook dir. */
export const DanglingRefSchema = z.object({
  /** Script path as written in settings (best-effort relative-to-repo-root). */
  ref: z.string(),
  event: z.string(),
  matcher: z.string().default(""),
  source: z.string(),
});
export type DanglingRef = z.infer<typeof DanglingRefSchema>;

export const HookManifestStatsSchema = z.object({
  totalHooks: z.number().int().nonnegative(),
  /** Count by {@link HookKind}. */
  byKind: z.record(z.string(), z.number().int().nonnegative()),
  /** Count of *wired files* per event type (a file wired to N matchers of one event counts once). */
  byEvent: z.record(z.string(), z.number().int().nonnegative()),
  /** Files referenced by ≥1 wiring. */
  wired: z.number().int().nonnegative(),
  /** Files present on disk but not referenced by any wiring. */
  orphaned: z.number().int().nonnegative(),
  /** Files with ≥1 hard-block wiring. */
  hardBlock: z.number().int().nonnegative(),
  /** Settings refs pointing at a non-existent script. */
  danglingRefs: z.number().int().nonnegative(),
  /** Sum of `lineCount` across all scanned files. */
  totalLines: z.number().int().nonnegative(),
  /** Distinct event types observed in settings. */
  eventTypes: z.array(z.string()),
});
export type HookManifestStats = z.infer<typeof HookManifestStatsSchema>;

export const HookManifestSchema = z.object({
  schemaVersion: z.literal(HOOK_MANIFEST_SCHEMA_VERSION),
  /** ISO timestamp of generation. */
  generatedAt: z.string(),
  /** Absolute repo root the relative paths are anchored to. */
  repoRoot: z.string(),
  /** Hook directories scanned (absolute paths). */
  hookDirs: z.array(z.string()),
  /** Settings files parsed (absolute paths; only existing ones). */
  settingsFiles: z.array(z.string()),
  /** Every hook file, sorted by `file`. */
  hooks: z.array(HookEntrySchema),
  /** event → ordered list of `file`s wired to it (duplicates ⇒ multiple matchers; order = chain order within the first source). */
  events: z.record(z.string(), z.array(z.string())),
  danglingRefs: z.array(DanglingRefSchema),
  stats: HookManifestStatsSchema,
});
export type HookManifest = z.infer<typeof HookManifestSchema>;
