/**
 * memoryOntologySchema.ts — Zod ontology schema for memory + wiki frontmatter.
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / U-ONTOLOGY-LAYER (D2).
 *
 * Sister to memoryProvenanceSchema (D1). Where provenance answers "who wrote
 * this and when", ontology answers "what KIND of statement is this, is it
 * still current, and who's allowed to see it?". The Sentra Company-Brain
 * pattern (Ashwin Gopinath) — without explicit type tagging, recall conflates
 * a deprecated decision with a current fact and a private incident note with
 * a public reference, all because they all look like "notes in a vault".
 *
 *   kind         — fact (verifiable claim about the system) vs interpretation
 *                  (subjective lesson / hypothesis / recommendation)
 *   state        — current (load-bearing today) vs deprecated (kept for audit
 *                  but should NOT be acted on) vs draft (work-in-progress)
 *   visibility   — public (safe to surface in user-facing output) vs
 *                  internal (fleet-only) vs confidential (operator-only;
 *                  e.g. incident postmortems with customer identifiers)
 *
 * Validator (MemoryOntologyEngine, D2) rejects writes with missing/invalid
 * ontology unless `PRISM_ONTOLOGY_WARN_ONLY=1` for grace-period soft-launch.
 *
 * Zod v4 conventions per H:/.claude/rules/schemas.md:
 *   - z.string()/z.enum() only — never z.any()
 *   - named-export constants
 *   - .describe() on every field (drives MCP tool descriptions)
 *   - snake_case enum values matching dispatcher action conventions
 *
 * @module schemas/memoryOntologySchema
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/D2
 */

import { z } from "zod";

export const MEMORY_ONTOLOGY_SCHEMA_VERSION = "1.0.0";

// ───────────────────────────────────────────────────────────────────
// Enum fields. Frozen sets — adding a value is an intentional schema
// version bump, NEVER a silent extension (legacy memos with unknown
// values must FAIL LOUDLY so we notice the drift instead of silently
// accepting a typo as a new bucket — Karpathy R12).
// ───────────────────────────────────────────────────────────────────

export const OntologyKindSchema = z
  .enum(["fact", "interpretation"])
  .describe(
    "Statement kind. fact=verifiable claim about the system or world; interpretation=subjective lesson, hypothesis, or recommendation.",
  );

export const OntologyStateSchema = z
  .enum(["current", "deprecated", "draft"])
  .describe(
    "Lifecycle state. current=load-bearing today; deprecated=kept for audit but must NOT be acted on (recall should down-weight); draft=work-in-progress, not authoritative yet.",
  );

export const OntologyVisibilitySchema = z
  .enum(["public", "internal", "confidential"])
  .describe(
    "Sharing scope. public=safe to surface in user-facing output; internal=fleet-only (default); confidential=operator-only (incident postmortems, customer identifiers, secrets context).",
  );

// Optional confidence — for interpretation-kind memos. Pure metadata; the
// engine does NOT enforce confidence ≥ 0 ≤ 1 differently per kind, but
// fact-kind memos with explicit low confidence are a smell worth flagging.
export const OntologyConfidenceSchema = z
  .number()
  .min(0)
  .max(1)
  .describe(
    "Optional confidence for interpretation-kind memos (0..1). Fact-kind memos with confidence < 0.5 are a smell — verify before persisting.",
  );

// Optional supersedes link — when a `current` memo replaces a `deprecated`
// one, point at the predecessor by basename so audit can chain them.
// Mirrors ParentMemorySchema from provenance — keep the regex identical so
// vault renames don't break either link.
export const OntologySupersedesSchema = z
  .string()
  .min(3)
  .max(200)
  .regex(/^[\w.-]+\.md$/i, {
    message: "supersedes must be a markdown filename (basename only, no slashes)",
  })
  .describe("Filename of the predecessor memo this entry replaces.");

// ───────────────────────────────────────────────────────────────────
// Top-level ontology object. Required: kind + state + visibility.
// Optional: confidence, supersedes, tags.
// ───────────────────────────────────────────────────────────────────

export const MemoryOntologySchema = z
  .object({
    schemaVersion: z
      .string()
      .default(MEMORY_ONTOLOGY_SCHEMA_VERSION)
      .describe("Schema version of this ontology block."),
    kind: OntologyKindSchema,
    state: OntologyStateSchema,
    visibility: OntologyVisibilitySchema,
    confidence: OntologyConfidenceSchema.optional().describe(
      "Optional confidence ∈ [0,1]. Only meaningful for interpretation-kind.",
    ),
    supersedes: OntologySupersedesSchema.nullable()
      .optional()
      .describe(
        "Optional predecessor filename. When set, this memo replaces an earlier (typically deprecated) one.",
      ),
    tags: z
      .array(z.string().min(1).max(64).regex(/^[a-z][a-z0-9_-]*$/, {
        message: "tag must be kebab/snake-case starting with a letter",
      }))
      .max(20)
      .optional()
      .describe(
        "Optional free-form tags (max 20). Kept narrow so they stay queryable; recall hooks may rank on tag overlap.",
      ),
  })
  .strict()
  .describe(
    "Ontology frontmatter for memory + wiki entries. See OBSIDIAN-INTELLIGENCE-MS3/D2.",
  );

export type MemoryOntology = z.infer<typeof MemoryOntologySchema>;

// ───────────────────────────────────────────────────────────────────
// Frontmatter (de)serialization helpers — keep YAML emission narrow so
// we don't pull in a YAML lib for 7 fields (same pattern as D1).
// ───────────────────────────────────────────────────────────────────

/**
 * Format an ontology object as YAML frontmatter (including the `---` fences).
 * Key order is stable so diffs stay clean.
 *
 * If you intend to merge this with an existing frontmatter block (e.g. a
 * provenance block already present from D1), call extractOntologyFromFrontmatter
 * on the existing content first and use `mergeIntoExistingFrontmatter` —
 * emitting a second `---` block on top of an existing one produces invalid
 * YAML on most parsers.
 */
export function formatOntologyFrontmatter(ont: MemoryOntology): string {
  const parsed = MemoryOntologySchema.parse(ont);
  const lines: string[] = ["---", "ontology:"];
  // Required keys first (matches schema reading order), then optionals.
  const KEY_ORDER: Array<keyof MemoryOntology> = [
    "schemaVersion",
    "kind",
    "state",
    "visibility",
    "confidence",
    "supersedes",
    "tags",
  ];
  for (const k of KEY_ORDER) {
    const v = parsed[k];
    if (v === undefined || v === null) continue;
    if (k === "tags" && Array.isArray(v)) {
      if (v.length === 0) continue;
      lines.push(`  ${k}:`);
      for (const t of v) lines.push(`    - ${yamlScalar(t)}`);
    } else {
      lines.push(`  ${k}: ${yamlScalar(String(v))}`);
    }
  }
  lines.push("---");
  return lines.join("\n") + "\n";
}

/**
 * Bare scalar if YAML-safe; JSON-quoted otherwise. Same pattern as D1's
 * yamlScalar — keep them in sync if the safe-char set changes.
 */
function yamlScalar(s: string): string {
  if (/^[\w.\-+/:T]+$/.test(s)) return s;
  return JSON.stringify(s);
}

/**
 * Parse a YAML frontmatter block (`--- ... ---`) at the START of a markdown
 * document into an ontology object. Returns null when no block is present
 * or when the block does not contain an `ontology:` key. Throws when the
 * block IS present but fails schema validation (loud failure — Karpathy R12).
 *
 * Mirrors extractProvenanceFromFrontmatter from D1 — narrow & deterministic.
 * Supports the flat `ontology: { key: value }` form plus the indented
 * `tags:` list form. Does NOT support arbitrarily nested objects/arrays.
 */
export function extractOntologyFromFrontmatter(
  content: string,
): MemoryOntology | null {
  if (typeof content !== "string") return null;
  const trimmed = content.replace(/^﻿/, "");
  if (!/^---\s*\n/.test(trimmed)) return null;
  const endIdx = trimmed.indexOf("\n---", 4);
  if (endIdx === -1) return null;
  const block = trimmed.slice(4, endIdx);
  if (!/^\s*ontology:/m.test(block)) return null;

  // Use a prototype-less object so a hostile `__proto__:` YAML key becomes
  // a regular own-property (Zod's .strict() then rejects it as an unknown
  // key) rather than mutating Object.prototype.  Mirrors the E1 lesson
  // ([[feedback_scrutiny_gate_finds_hostile_payload_class]]).
  const obj: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  const lines = block.split("\n").map((l) => l.replace(/\r$/, ""));
  let inOntology = false;
  let inTags = false;
  const tags: string[] = [];

  for (const line of lines) {
    // Top-level key (no indent): enter or exit the ontology block.
    if (/^[A-Za-z][A-Za-z0-9_]*\s*:/.test(line)) {
      inOntology = /^ontology\s*:/.test(line);
      inTags = false;
      continue;
    }
    if (!inOntology) continue;

    // Tags sub-list: `    - <value>` (4 spaces, EXACTLY — same tight indent
    // discipline as D1 to avoid leaking from an unrelated nested block).
    if (inTags) {
      const tagMatch = line.match(/^ {4}-\s+(.+?)\s*$/);
      if (tagMatch) {
        let t = tagMatch[1];
        if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
          t = t.slice(1, -1);
        }
        tags.push(t);
        continue;
      }
      // First non-tag-item line ends the tags list.
      inTags = false;
    }

    // Ontology field line: EXACTLY 2 spaces (matches formatOntologyFrontmatter
    // emission). Tightening from `\s{2,}` prevents a hostile memo with
    // `      kind: fact` under a foreign block from leaking in.
    const m = line.match(/^ {2}([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*?)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val: string = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key === "tags") {
      // tags: <empty> followed by ` ` ` ` - <value> lines
      if (val.length > 0) {
        // Inline JSON-ish array form not supported in our emitter; reject loudly.
        throw new Error(
          "memoryOntologySchema: inline tags array not supported — use indented list form",
        );
      }
      inTags = true;
      continue;
    }
    // Karpathy R12 fail-loud: duplicate key in an ontology block is almost
    // always a partial-edit / merge bug — throw rather than silently last-wins.
    if (key in obj) {
      throw new Error(
        `memoryOntologySchema: duplicate key '${key}' in ontology frontmatter`,
      );
    }
    obj[key] = val;
  }
  if (tags.length > 0) obj.tags = tags;

  // Coerce confidence to number if present (YAML scalar is a string here).
  if (typeof obj.confidence === "string" && obj.confidence.length > 0) {
    const n = Number(obj.confidence);
    if (Number.isFinite(n)) obj.confidence = n;
  }

  // Empty optionals → drop (regex validators reject "").
  if (obj.supersedes === "" || obj.supersedes === undefined) delete obj.supersedes;
  if (obj.confidence === "" || obj.confidence === undefined) delete obj.confidence;

  return MemoryOntologySchema.parse(obj);
}

/**
 * Heuristic classifier — derives a best-guess ontology from a filename +
 * optional content snippet. Used by backfill (D1 sister script) when no
 * explicit ontology block exists yet.
 *
 * Rules (in order; first match wins):
 *  - filename starts with `feedback_` → kind=interpretation
 *  - filename starts with `reference_`, `project_`, `user_` → kind=fact
 *  - title or content contains `[deprecated]` / `[stale]` / "supersedes:" → state=deprecated
 *  - filename includes `draft` OR frontmatter explicitly has status=draft → state=draft
 *  - filename or path contains `private` / `confidential` / `incident` → visibility=confidential
 *  - everything else → fact / current / internal
 *
 * Pure function — no I/O. Caller supplies content (optional).
 */
export function classifyFromFilename(
  filename: string,
  content?: string,
): MemoryOntology {
  const base = filename.toLowerCase().replace(/^.*[\\/]/, "");
  const body = (content ?? "").toLowerCase();

  // kind
  let kind: MemoryOntology["kind"] = "fact";
  if (/^feedback[_-]/.test(base)) kind = "interpretation";

  // state — anchored stems only; substring matches (e.g. `draftsman_log.md`,
  // `not_deprecated.md`) MUST NOT match the lifecycle keyword. Body-side
  // matching is restricted to frontmatter-style `status: deprecated` (a loose
  // `[deprecated]` body match misclassified narrative-text memos referring to
  // an OTHER thing as deprecated).
  let state: MemoryOntology["state"] = "current";
  if (/\[deprecated\]|\[stale\]|^deprecated[_-]/.test(base) || /^status:\s*deprecated/m.test(body)) {
    state = "deprecated";
  } else if (/^draft[_-]|[_-]draft[_-]|[_-]draft\.md$|[_-]wip[_-]|^wip[_-]|[_-]wip\.md$/.test(base) || /^status:\s*draft/m.test(body)) {
    state = "draft";
  }

  // visibility — anchored stems only. `incidental_*` MUST NOT match `incident`;
  // `draftsman_*` MUST NOT match `draft`; `private-helper.md` would match
  // `private` since it's at a stem boundary, but a code-helper named "private"
  // is rare in the memory vault. Document is the canonical source of truth.
  let visibility: MemoryOntology["visibility"] = "internal";
  if (
    /(^|[_-])(private|confidential|incident|secret)([_-]|\.md$)/.test(base) ||
    /^visibility:\s*confidential/m.test(body)
  ) {
    visibility = "confidential";
  }

  return MemoryOntologySchema.parse({
    schemaVersion: MEMORY_ONTOLOGY_SCHEMA_VERSION,
    kind,
    state,
    visibility,
  });
}

/**
 * Merge an ontology block into existing frontmatter. If the content has NO
 * frontmatter, prepends a fresh `---` block. If the content HAS frontmatter
 * but no `ontology:` key, splices the ontology lines between the existing
 * keys and the closing `---`. If `ontology:` is ALREADY present, replaces it.
 *
 * Returns the rewritten content. BOM preservation matches D1 backfill pattern.
 */
export function mergeIntoExistingFrontmatter(
  content: string,
  ont: MemoryOntology,
): string {
  const parsed = MemoryOntologySchema.parse(ont);
  const hasBom = content.startsWith("﻿");
  const body = hasBom ? content.slice(1) : content;

  // Build the ontology lines (no fences — we splice them, not the fences).
  const ontLines: string[] = ["ontology:"];
  const KEY_ORDER: Array<keyof MemoryOntology> = [
    "schemaVersion",
    "kind",
    "state",
    "visibility",
    "confidence",
    "supersedes",
    "tags",
  ];
  for (const k of KEY_ORDER) {
    const v = parsed[k];
    if (v === undefined || v === null) continue;
    if (k === "tags" && Array.isArray(v)) {
      if (v.length === 0) continue;
      ontLines.push(`  ${k}:`);
      for (const t of v) ontLines.push(`    - ${yamlScalar(t)}`);
    } else {
      ontLines.push(`  ${k}: ${yamlScalar(String(v))}`);
    }
  }
  const ontBlock = ontLines.join("\n");

  if (!/^---\s*\n/.test(body)) {
    // No frontmatter at all → prepend a fresh one.
    const fresh = `---\n${ontBlock}\n---\n${body}`;
    return hasBom ? "﻿" + fresh : fresh;
  }

  const endIdx = body.indexOf("\n---", 4);
  if (endIdx === -1) {
    throw new Error(
      "memoryOntologySchema: unterminated frontmatter — cannot merge ontology",
    );
  }

  const existing = body.slice(4, endIdx);
  const rest = body.slice(endIdx + 4); // includes the closing `---` line minus its own \n--- prefix

  // If ontology already present, splice it out via a state-machine (mirror of
  // extractOntologyFromFrontmatter's scoping). The earlier regex-based splice
  // stopped mid-tag-list on certain orderings and silently corrupted memos
  // with orphan tag items (arm B P0-2). The state machine deterministically
  // tracks the ontology block's start + end line indices and removes that
  // exact range.
  const lines = existing.split("\n");
  let startLine = -1;
  let endLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (startLine === -1) {
      if (/^ontology\s*:/.test(ln)) {
        startLine = i;
      }
      continue;
    }
    // We're inside the ontology block. End when we hit another top-level key
    // (column-0, ASCII alpha + word chars + colon).
    if (/^[A-Za-z][A-Za-z0-9_]*\s*:/.test(ln)) {
      endLine = i - 1;
      break;
    }
  }
  let cleanedLines = lines;
  if (startLine !== -1) {
    if (endLine === -1) endLine = lines.length - 1; // ontology runs to EOB
    cleanedLines = lines.slice(0, startLine).concat(lines.slice(endLine + 1));
  }
  // Collapse runs of blank lines created by the splice (arm B P1-3).
  const cleanedExisting = cleanedLines
    .join("\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");

  const merged = `---\n${cleanedExisting}${cleanedExisting.length > 0 ? "\n" : ""}${ontBlock}\n---${rest}`;
  return hasBom ? "﻿" + merged : merged;
}
