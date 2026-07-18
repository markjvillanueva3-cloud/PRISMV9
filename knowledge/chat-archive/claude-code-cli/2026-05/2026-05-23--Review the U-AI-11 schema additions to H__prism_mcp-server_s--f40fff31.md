---
type: "chat-session"
source: "claude-code-cli"
session_id: "f40fff31-cb37-49ea-9b03-5d4d750b18f3"
title: "Review the U-AI-11 schema additions to H:\\prism\\mcp-server\\src\\schemas\\cadAction"
date: "2026-05-23"
first_ts: "2026-05-23T04:28:30.341Z"
last_ts: "2026-05-23T04:30:05.598Z"
cwd: "H:\\prism\\mcp-server"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-a651c269fdb10a263.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# Review the U-AI-11 schema additions to H:\prism\mcp-server\src\schemas\cadAction

> **claude-code-cli** | 2026-05-23 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-a651c269fdb10a263.jsonl`

## Transcript

### User | 2026-05-23T04:28:30.341Z

Review the U-AI-11 schema additions to H:\prism\mcp-server\src\schemas\cadActionSchemas.ts (added after the cad_preview_apply_all schema at line ~1738, before the `// Geometry` marker):

1. `cad_consensus_score` schema (predictions array of CADPrediction)
2. `cad_consensus_pick` schema (predictions + optional dissentThreshold)
3. `cad_consensus_parameter_clusters` schema (predictions only)

VERIFY against:
- H:\.claude\rules\schemas.md (no z.any, .describe() on every field, snake_case enum values)
- The sibling cad_preview_apply / cad_preview_apply_all schemas at lines 1689-1738 (U-AI-07, which my schemas mirror)
- The engine contract in H:\prism\mcp-server\src\engines\CADConsensusEngine.ts (CADPrediction interface, CADWorldDiff shape, optional projectedState)

SCHEMA CONTRACT CHECKS:
- Every field has `.describe()` (PRISM rule)
- No `z.any()` used (uses z.unknown() in entities array — acceptable since CADEntity is structurally validated by the engine, but flag if z.array(z.unknown()) bypasses too much)
- Enum values for `entityKind` + `units` are snake_case / match the engine's CADEntityKind + CADUnits types
- `.min(1)` + `.max(100)` enforced on predictions array (matches dispatcher cap)
- `dissentThreshold` is `.number().finite().min(0).max(1).optional()` — matches engine's validation `[0,1]` range
- Required fields are non-optional, optional fields explicitly `.optional()`
- The CADWorldDiff inline schema (addedEntities/removedEntities/parametersChanged arrays + 3 booleans) matches the engine's CADWorldDiff interface exactly
- The CADWorldState projectedState schema matches CADWorldState shape (docId/entities/parameters/selection/units/opCount)

INTEGRATION HAZARDS:
- Does the schema enum for `units` match: engine accepts only "mm" | "in" — confirmed?
- For `parameters: z.record(z.string(), z.number())` — does this catch NaN/Infinity? (zod number is permissive by default; engine filters them)
- DRY violation: the same CADPrediction shape is repeated 3 times (one 
... [+225 chars truncated]

### Assistant | 2026-05-23T04:29:13.985Z

I'll review the U-AI-11 schema additions against the contracts.

### Assistant | 2026-05-23T04:29:14.277Z

[tool_use: Read]

### User | 2026-05-23T04:29:31.081Z

[tool_result] 1680	    .object({
1681	      confirm: z
1682	        .literal("RESET_ALL_TRANSACTIONS")
1683	        .describe(
1684	          "REQUIRED literal 'RESET_ALL_TRANSACTIONS' — fleet-destructive; drops every tracked transaction and releases every doc lock, including peer chats' in-flight work. Test / hygiene only.",
1685	        ),
1686	    })
1687	    .describe("DESTRUCTIVE: drop every transaction + 
... [+10791 chars truncated]

### Assistant | 2026-05-23T04:30:05.598Z

# Code Review — U-AI-11 CADConsensusEngine Schemas

## Verdict: PASS with P1 + P2 + P3 findings

Reviewed: `H:\prism\mcp-server\src\schemas\cadActionSchemas.ts` lines 1739-1842 against `H:\.claude\rules\schemas.md`, sibling U-AI-07 schemas (1689-1738), and the engine contract for `CADConsensusEngine`.

---

## Findings

### P0 (schema breaks the action): **None**
All three schemas parse, action enum alignment looks correct, dispatcher cap `.max(100)` enforced, `.min(1)` guards empty arrays.

### P1 (contract gap vs engine)

**P1-1 — Missing `.describe()` on nested fields in `cad_consensus_pick` + `cad_consensus_parameter_clusters` (lines 1779-1798, 1817-1835).**
The schemas rule states: *"Include `.describe()` for every field (MCP tool descriptions)."* In the FIRST schema (`cad_consensus_score`, 1745-1766), every nested field has `.describe()`. The 2nd and 3rd schemas DROP every field-level `.describe()` inside the prediction object (only the outer `predictions` array has one). MCP clients calling `cad_consensus_pick` won't see descriptions for `id`, `diff.addedEntities`, `projectedState.docId`, etc. This is a literal rule violation, not a style nit.

**Fix:** Extract the `predictionItemSchema` as a local const at line 1739 and reuse across all three schemas — solves P1-1 + P2-1 simultaneously.

**P1-2 — `id` uniqueness invariant not enforced at schema layer (lines 1745, 1779, 1817).**
The describe text says *"must be unique within the prediction set"* but Zod doesn't enforce this — the engine's `_validate()` does (CADConsensusEngine.ts). Schema-side enforcement via `.refine(arr => new Set(arr.map(p => p.id)).size === arr.length, "ids must be unique")` would catch duplicate-id payloads at the MCP boundary and match the U-AI-07 pattern of schema-rejecting incoherent input (sibling `cad_capability_negotiate_or_throw` line 1867 cites this exact pattern: *"schema-reject at the MCP boundary so callers get a clear error rather than silent…"*).

### P2 (style / DRY)

**P2-
... [+2358 chars truncated]
