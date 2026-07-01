---
type: "chat-session"
source: "claude-code-cli"
session_id: "c0f06dee-d6f2-4070-8e01-4732115adb48"
title: "Review the file H:/prism/mcp-server/src/schemas/memoryOntologySchema.ts END-TO-E"
date: "2026-05-16"
first_ts: "2026-05-16T02:03:05.925Z"
last_ts: "2026-05-16T02:03:34.043Z"
cwd: "H:\\prism\\mcp-server"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/c0f06dee-d6f2-4070-8e01-4732115adb48/subagents/agent-a69294dea45bd7acc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# Review the file H:/prism/mcp-server/src/schemas/memoryOntologySchema.ts END-TO-E

> **claude-code-cli** | 2026-05-16 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/c0f06dee-d6f2-4070-8e01-4732115adb48/subagents/agent-a69294dea45bd7acc.jsonl`

## Transcript

### User | 2026-05-16T02:03:05.925Z

Review the file H:/prism/mcp-server/src/schemas/memoryOntologySchema.ts END-TO-END (read the entire file, do not split into sections).

Context: This is OBSIDIAN-INTELLIGENCE-MS3 unit D2 (U-ONTOLOGY-LAYER). It's the Zod ontology schema sister-file to H:/prism/mcp-server/src/schemas/memoryProvenanceSchema.ts (D1, already shipped). Both files together tag every entry in knowledge/memories/ + knowledge/wiki/ with provenance (who/when) + ontology (kind/state/visibility).

Unit-spec exit conditions (must be satisfied by this schema file + companion engine in next file):
1. New MemoryOntologyEngine validates frontmatter ontology fields
2. Zod enum schemas for kind | state | visibility
3. Memory mirror rejects writes with missing/invalid ontology
4. Backfill applied where heuristically derivable
5. Test: 6 fixture writes (3 valid, 3 invalid) → 3 accept + 3 reject

The schema contract for this file:
- Named-export Zod constants
- .describe() on every field
- snake_case enum values
- .strict() top-level
- Hand-rolled YAML serialization (no YAML lib dep)
- Hostile-payload safety on extractOntologyFromFrontmatter (mirror the D1 lesson — D1 originally had a greedy slice(firstBrace, lastBrace+1) that was exploitable; the fix uses EXACTLY 2-space indent matching to prevent leaking from a foreign nested block)

Your weighted focus, Arm A (content-specialist code-analyzer):
- Zod v4 conventions per H:/.claude/rules/schemas.md (no z.any(), named exports, .describe() coverage)
- Enum value snake_case discipline
- .strict() top-level discipline (this is load-bearing — without it, hostile YAML keys silently survive)
- Schema-versioning correctness (MEMORY_ONTOLOGY_SCHEMA_VERSION presence + default usage)
- Karpathy R12 fail-loud — does the schema fail loudly on every invariant violation?
- Type inference correctness (the exported `MemoryOntology` type)
- Internal helper purity (yamlScalar, no I/O)

Flag every P0 (correctness) and P1 (load-bearing safety / regression risk) finding with 
... [+370 chars truncated]

### Assistant | 2026-05-16T02:03:12.652Z

I'll review the schema file end-to-end against the D1 sibling and the unit-spec contract.

### Assistant | 2026-05-16T02:03:12.900Z

[tool_use: Read]

### User | 2026-05-16T02:03:14.198Z

[tool_result] 1	/**
2	 * memoryOntologySchema.ts — Zod ontology schema for memory + wiki frontmatter.
3	 *
4	 * OBSIDIAN-INTELLIGENCE-MS3 / U-ONTOLOGY-LAYER (D2).
5	 *
6	 * Sister to memoryProvenanceSchema (D1). Where provenance answers "who wrote
7	 * this and when", ontology answers "what KIND of statement is this, is it
8	 * still current, and who's allowed to see it?". The Sentra Company-Brain
9	 * pattern 
... [+15807 chars truncated]

### Assistant | 2026-05-16T02:03:34.043Z

## VERDICT: PASS

### P0 findings
None.

### P1 findings
None blocking. Two near-misses worth tracking as P2.

### P2 advisory
1. **L374 regex `(^|\n)ontology\s*:.*?(?=\n[A-Za-z][A-Za-z0-9_]*\s*:|\n*$)` in `mergeIntoExistingFrontmatter` is fragile.** Lookahead `\n[A-Za-z]...:` only terminates on a TOP-LEVEL key — if a hostile/foreign block writes `ontology:` followed by indented children AND no subsequent top-level key, the regex eats to EOF. The `\n*$` alternation rescues it, but a nested indented `tags:` under a sibling block can be partially consumed. Sister D1 likely has the same pattern — if D1 passed scrutiny, retain for consistency. Suggest adding a unit test with a foreign trailing block to lock current behavior.
2. **L154-163 `String(v)` coerces `confidence` (number) through `yamlScalar`** — works correctly since numerics match `/^[\w.\-+/:T]+$/`, but emits unquoted `0.5` which round-trips correctly via `Number(obj.confidence)` at L257. Fine, but worth a fixture test for `confidence: 0` and `confidence: 1.0` round-trip.
3. **L296 `^deprecated[_-]` heuristic** — filename `deprecated_legacy_thing.md` correctly classifies, but `reference_deprecated_x.md` would NOT match the `^` anchor and falls through to `current`. Likely intentional (only the `[deprecated]` tag in body catches it via the first alternation), but document the asymmetry.

### Summary
Schema is clean, conventions-compliant, and faithful to the D1 sibling. All Zod v4 rules satisfied: named exports, `.describe()` on every field, snake_case enum values (`fact`/`interpretation`/`current`/`deprecated`/`draft`/`public`/`internal`/`confidential`), `.strict()` top-level at L119, no `z.any()`. `MEMORY_ONTOLOGY_SCHEMA_VERSION = "1.0.0"` present at L36 with `.default()` usage at L96. Type inference `MemoryOntology` exported at L124. Hostile-payload safety mirrors D1: exact `^ {2}` indent match at L233 + `^ {4}-` tag indent at L217 prevent leakage from foreign nested blocks. Inline JSON tags array rejected 
... [+353 chars truncated]
