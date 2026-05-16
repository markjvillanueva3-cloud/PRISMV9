/**
 * memoryProvenanceSchema.ts — Zod schema for memory + wiki provenance frontmatter.
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / U-PROVENANCE-LAYER (D1).
 *
 * Every entry in knowledge/memories/ and knowledge/wiki/ is mirrored from
 * the user's auto-memory dir OR written directly by an agent. Without a
 * provenance trail we can't:
 *   - weight recall freshness (older + recently-touched-by-same-agent = stale)
 *   - audit "who wrote this when" for incident postmortems
 *   - link a memory to its parent thread (e.g. lessons spawned by mistakes)
 *
 * This schema captures the minimum-viable provenance. memory-mirror-to-vault.mjs
 * injects it on every write; backfill-memory-provenance.mjs reconstructs it
 * for legacy memos from filename prefix + mtime + git log heuristics.
 *
 * Zod v4 conventions per H:/.claude/rules/schemas.md:
 *   - z.string()/z.number()/z.enum() only — never z.any()
 *   - named-export constants
 *   - .describe() on every field (drives MCP tool descriptions)
 *   - snake_case enum values matching dispatcher action conventions
 *
 * @module schemas/memoryProvenanceSchema
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/D1
 */

import { z } from "zod";

export const MEMORY_PROVENANCE_SCHEMA_VERSION = "1.0.0";

// Per harness convention, agent ids are "claude-<8hex>" (stable session id
// derived from the Claude session UUID's leading 8 chars). Subagent dispatches
// may produce agent ids like "agent-<8hex>" or "codex-<8hex>". Allow alpha
// prefix + 8 hex; reject everything else so spurious values fail loudly.
export const AgentIdSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[A-Za-z][A-Za-z0-9_-]*-[0-9a-f]{8}$/, {
    message: "agent must look like '<family>-<8hex>' (e.g. 'claude-c0f06dee')",
  })
  .describe("Stable agent identifier ('claude-<8hex>' or 'agent-<8hex>').");

// The Claude session uuid; same as the Chat Isolation block shows. Allow the
// 36-char canonical form OR the abbreviated 8-hex form (some hooks only see
// the abbreviated form via stable-session-id.mjs).
export const SessionIdSchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[0-9a-f]{8}(?:-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$/i, {
    message: "sessionId must be 8-hex or full UUID",
  })
  .describe("Claude session UUID or abbreviated 8-hex form.");

// Which tool/event produced this write. Restricted to the harness Write/Edit
// surface plus 'backfill' (one-shot script) and 'manual' (operator edit
// before mirroring landed). NEVER includes wildcards — a future event must
// be added explicitly so legacy schemas stay tight.
export const WriteEventSchema = z
  .enum(["Write", "Edit", "MultiEdit", "backfill", "manual"])
  .describe(
    "Which write surface produced this entry. Write/Edit/MultiEdit are harness tool events; backfill = the one-shot script; manual = direct operator edit before mirror caught up.",
  );

// Parent memory link — when a memory was spawned by another (e.g. a 'lesson'
// captured from a 'mistake'). Stored as the file basename to keep the link
// portable across vault relocations (avoid absolute paths).
export const ParentMemorySchema = z
  .string()
  .min(3)
  .max(200)
  .regex(/^[\w.-]+\.md$/i, {
    message:
      "parentMemory must be a markdown filename (basename only, no slashes)",
  })
  .describe("Filename of the parent memory this entry was spawned from.");

// Optional vault category — kept loose because categorize() in the mirror
// hook may produce additional names over time, but the canonical set is
// frozen so the schema fails loudly on a typo.
export const VaultCategorySchema = z
  .enum([
    "feedback",
    "project",
    "reference",
    "user",
    "lessons",
    "decisions",
    "mistakes",
    "patterns",
    "inbox",
    "uncategorized",
    "_index",
  ])
  .describe("Vault category (matches subdirectory under knowledge/memories/).");

// ───────────────────────────────────────────────────────────────────
// Top-level provenance object.
// ───────────────────────────────────────────────────────────────────

export const MemoryProvenanceSchema = z
  .object({
    schemaVersion: z
      .string()
      .default(MEMORY_PROVENANCE_SCHEMA_VERSION)
      .describe("Schema version of this provenance block."),
    agent: AgentIdSchema,
    sessionId: SessionIdSchema,
    writeEvent: WriteEventSchema,
    writtenAt: z
      .string()
      .min(20)
      .max(40)
      .regex(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/,
        { message: "writtenAt must be a complete ISO 8601 timestamp" },
      )
      .refine((s) => !Number.isNaN(Date.parse(s)), {
        message: "writtenAt must parse as a valid date",
      })
      .describe("ISO 8601 timestamp the entry was written (full form, not just prefix)."),
    parentMemory: ParentMemorySchema.nullable()
      .optional()
      .describe("Optional parent memory filename for spawn-from-X links."),
    category: VaultCategorySchema.optional().describe(
      "Optional vault subdir name; derived from filename prefix when absent.",
    ),
    sourceTool: z
      .string()
      .max(64)
      .optional()
      .describe(
        "Optional originating tool name (e.g. 'memory-mirror-to-vault' or a hook name).",
      ),
    machine: z
      .string()
      .max(128)
      .optional()
      .describe("Hostname of the machine that produced the write."),
  })
  .strict()
  .describe(
    "Provenance frontmatter for memory + wiki entries. See OBSIDIAN-INTELLIGENCE-MS3/D1.",
  );

export type MemoryProvenance = z.infer<typeof MemoryProvenanceSchema>;

// ───────────────────────────────────────────────────────────────────
// Frontmatter (de)serialization helpers — keep YAML emission narrow so we
// don't pull in a YAML lib for 8 fields. Hooks running in CommonJS-ish
// portable node prefer zero-dep helpers.
// ───────────────────────────────────────────────────────────────────

/**
 * Format a provenance object as YAML frontmatter (including the `---` fences).
 * Order of keys is stable so diffs stay clean.
 */
export function formatProvenanceFrontmatter(prov: MemoryProvenance): string {
  // Validate before emitting so a bug in the caller is caught early.
  const parsed = MemoryProvenanceSchema.parse(prov);
  const lines: string[] = ["---", "provenance:"];
  const KEY_ORDER: Array<keyof MemoryProvenance> = [
    "schemaVersion",
    "agent",
    "sessionId",
    "writeEvent",
    "writtenAt",
    "category",
    "parentMemory",
    "sourceTool",
    "machine",
  ];
  for (const k of KEY_ORDER) {
    const v = parsed[k];
    if (v === undefined || v === null) continue;
    lines.push(`  ${k}: ${yamlScalar(String(v))}`);
  }
  lines.push("---");
  return lines.join("\n") + "\n";
}

/**
 * Quote a scalar if it contains YAML-special characters; otherwise emit bare.
 * Keeps the YAML readable for the common case (hex ids, ISO timestamps,
 * single-word enums) while still being safe for paths containing `:` or `#`.
 */
function yamlScalar(s: string): string {
  if (/^[\w.\-+/:T]+$/.test(s)) return s;
  return JSON.stringify(s);
}

/**
 * Parse a YAML frontmatter block (`--- ... ---`) at the START of a markdown
 * document into a provenance object. Returns null when no block is present
 * or when the block does not contain a `provenance:` key. Throws when the
 * block IS present but fails schema validation (loud failure for malformed
 * provenance — Karpathy R12).
 *
 * Hand-rolled YAML extraction — narrow & deterministic. Does NOT support
 * nested objects/arrays beyond the flat `provenance: { key: value }` form
 * this schema produces.
 */
export function extractProvenanceFromFrontmatter(
  content: string,
): MemoryProvenance | null {
  if (typeof content !== "string") return null;
  // Must start with `---` line (allow leading BOM but nothing else)
  const trimmed = content.replace(/^﻿/, "");
  if (!/^---\s*\n/.test(trimmed)) return null;
  const endIdx = trimmed.indexOf("\n---", 4);
  if (endIdx === -1) return null;
  const block = trimmed.slice(4, endIdx);
  if (!/^\s*provenance:/m.test(block)) return null;
  const obj: Record<string, unknown> = {};
  for (const rawLine of block.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    // Match EXACTLY 2 spaces (the indent formatProvenanceFrontmatter emits).
    // Tightening from `\s{2,}` prevents a hostile memo with `      agent: X`
    // under a foreign block from leaking into our flat key map.
    const m = line.match(/^ {2}([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*?)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val: string = m[2];
    // strip surrounding quotes (single or double)
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    obj[key] = val;
  }
  // Empty value for parentMemory means "no parent" — drop instead of failing
  // the regex-validator.
  if (obj.parentMemory === "" || obj.parentMemory === undefined) {
    delete obj.parentMemory;
  }
  if (obj.category === "" || obj.category === undefined) delete obj.category;
  if (obj.sourceTool === "" || obj.sourceTool === undefined)
    delete obj.sourceTool;
  if (obj.machine === "" || obj.machine === undefined) delete obj.machine;
  return MemoryProvenanceSchema.parse(obj);
}

/**
 * Build a provenance object from a hook input (the JSON the harness pipes
 * to PostToolUse on stdin). All inputs are optional — missing fields are
 * filled from defaults where possible, leaving the schema validation to
 * fail loudly when something REQUIRED (agent, sessionId, writeEvent) is
 * absent.
 */
export function buildProvenanceFromHookInput(args: {
  agent?: string | null;
  sessionId?: string | null;
  writeEvent?: string | null;
  writtenAt?: string | null;
  parentMemory?: string | null;
  category?: string | null;
  sourceTool?: string | null;
  machine?: string | null;
}): MemoryProvenance {
  const raw = {
    schemaVersion: MEMORY_PROVENANCE_SCHEMA_VERSION,
    agent: args.agent ?? "",
    sessionId: args.sessionId ?? "",
    writeEvent: args.writeEvent ?? "",
    writtenAt: args.writtenAt ?? new Date().toISOString(),
    parentMemory: args.parentMemory ?? undefined,
    category: args.category ?? undefined,
    sourceTool: args.sourceTool ?? undefined,
    machine: args.machine ?? undefined,
  };
  // Strip empty-string optionals so the schema sees `undefined`, not "".
  if (raw.parentMemory === "") raw.parentMemory = undefined;
  if (raw.category === "") raw.category = undefined;
  if (raw.sourceTool === "") raw.sourceTool = undefined;
  if (raw.machine === "") raw.machine = undefined;
  return MemoryProvenanceSchema.parse(raw);
}
