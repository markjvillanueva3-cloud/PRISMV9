---
type: "chat-session"
source: "claude-code-cli"
session_id: "adb7bc4d-c3c2-4e4b-9cda-e80ca4b6b4c8"
title: "Per-file scrutiny review of `H:/prism/mcp-server/src/__tests__/monolithUnifiedQu"
date: "2026-05-27"
first_ts: "2026-05-27T14:29:49.592Z"
last_ts: "2026-05-27T14:31:26.681Z"
cwd: "H:\\prism\\mcp-server"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/adb7bc4d-c3c2-4e4b-9cda-e80ca4b6b4c8/subagents/agent-ac0bd1f2029ad23e1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Per-file scrutiny review of `H:/prism/mcp-server/src/__tests__/monolithUnifiedQu

> **claude-code-cli** | 2026-05-27 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/adb7bc4d-c3c2-4e4b-9cda-e80ca4b6b4c8/subagents/agent-ac0bd1f2029ad23e1.jsonl`

## Transcript

### User | 2026-05-27T14:29:49.592Z

Per-file scrutiny review of `H:/prism/mcp-server/src/__tests__/monolithUnifiedQueryDispatch.test.ts`.

Context: This is the round-trip test for the new `prism_intelligence:monolith_query` dispatcher action (JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-UNIFIED-QUERY, slot juliett, 2026-05-27). The action routes across 12 standalone Monolith*Engine ports via a `subject` enum: controllers, machine_specs, stock_positions, roughing_configs, macro_schema, fusion_posts, mfr_catalog, gateway, zeni, consolidated, final, major_mfrs. The wiring closes BUILD_STATE's "Monolith (9)" unwired gap.

Read the whole file. Verify per PRISM conventions in H:/.claude/rules/tests.md:
- vitest describe/it/expect
- Real assertions against real behavior (no `.toBeDefined()` placeholders — gate enforces this)
- Edge cases (zero, negative, extreme)
- ≥10 cases per engine being tested (we have 20)
- toBeCloseTo for floats (no floats in this file — ints + strings only)
- Group by method/subject in nested describe blocks
- No network calls / no real mocks of SUT

Also check:
- Are the schema-contract tests testing real Zod behavior or just presence?
- Do the per-subject round-trip tests prove the dispatcher actually routes to the right engine (engine-wire proof, not synthesis)?
- Are there missing edge cases worth adding (empty-string id, whitespace-only query, missing params)?
- Any unused imports / dead lines / floating promises / sequential awaits-in-loop?

Return a single PASS/FAIL verdict with P0/P1/P2 findings. Be terse — under 300 words.

Companion files for context:
- Engine being wired: `H:/prism/mcp-server/src/engines/MonolithControllerDatabaseEngine.ts` (has `ControllerRecord` with field `controller_id`, NOT `id`)
- Schema: `H:/prism/mcp-server/src/schemas/intelligenceActionSchemas.ts` lines 825-840 (`monolith_query` schema with `subject` enum)
- Dispatcher handler: `H:/prism/mcp-server/src/tools/dispatchers/intelligenceDispatcher.ts` lines 1270-1400 (the `if (action === "monolith_query")` bloc
... [+159 chars truncated]

### Assistant | 2026-05-27T14:30:00.104Z

I'll read the test file to verify it against PRISM scrutiny gates.

### Assistant | 2026-05-27T14:30:00.252Z

[tool_use: Read]

### User | 2026-05-27T14:30:11.915Z

[tool_result] 1	/**
2	 * monolithUnifiedQueryDispatch.test.ts —
3	 *   JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-UNIFIED-QUERY (2026-05-27, slot juliett)
4	 *
5	 * Round-trip tests for `prism_intelligence:monolith_query` — the single
6	 * dispatcher action that routes across the 12 standalone Monolith*Engine
7	 * ports loaded earlier in JULIETT-DB-BRIDGE-MS0. Closes BUILD_STATE's
8	 * "Monolith (9)" unwired gap.
9	 *
... [+14880 chars truncated]

### Assistant | 2026-05-27T14:30:18.181Z

Now I'll check the companion engine files to verify the wire-proof assertions:

### Assistant | 2026-05-27T14:30:24.025Z

[tool_use: Read]

### Assistant | 2026-05-27T14:30:24.027Z

[tool_use: Read]

### Assistant | 2026-05-27T14:30:25.728Z

[tool_use: Read]

### User | 2026-05-27T14:30:38.258Z

[tool_result] 1	/**
2	 * MonolithControllerDatabaseEngine — U-DB-MONOLITH-CONTROLLER-DATABASE
3	 *
4	 * TS-typed port of `CONTROLLER_DATABASE.json` v1.0.0 from the v8.89 monolith
5	 * extraction (`extracted/controllers/`). Carries 11 actually-shipped CNC
6	 * controller records (metadata header claims 25 — the additional 14 are
7	 * placeholders not present in the JSON; this engine pins the **real** count).
8	 
... [+1667 chars truncated]

### User | 2026-05-27T14:30:38.627Z

[tool_result] 1270	        // JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-UNIFIED-QUERY (2026-05-27, slot juliett):
1271	        // MonolithUnifiedQuery — unified routing across 12 standalone Monolith*Engine
1272	        // ports (controllers / machine_specs / stock_positions / roughing_configs /
1273	        // macro_schema / fusion_posts + 6 catalog manifests). Closes BUILD_STATE's
1274	        // "Monolith (9)" unwi
... [+8338 chars truncated]

### User | 2026-05-27T14:30:38.949Z

[tool_result] 825	const monolith_query = z.object({
826	  subject: z.enum(MONOLITH_SUBJECT_ENUM).describe("Which monolith engine to query (12 standalone ports)"),
827	  query: z.string().optional().describe("Free-text search (engine-specific match fields)"),
828	  id: z.string().optional().describe("Specific record id lookup (alternative to query)"),
829	  limit: z.number().int().min(1).max(50).optional().descr
... [+1673 chars truncated]

### Assistant | 2026-05-27T14:30:41.063Z

Now let me verify the MONOLITH_SUBJECT_ENUM definition:

### Assistant | 2026-05-27T14:30:41.478Z

[tool_use: Grep]

### User | 2026-05-27T14:30:50.943Z

[tool_result] Found 1 file
src\schemas\intelligenceActionSchemas.ts

### Assistant | 2026-05-27T14:30:53.271Z

[tool_use: Read]

### User | 2026-05-27T14:31:14.457Z

[tool_result] 800	  iso_group: z.enum(ISO_GROUPS_ENUM).optional().describe("Override ISO group (else derived from material); P/M/K/N/S/H/X"),
801	  max_per_catalog: z.number().int().min(1).max(50).optional().describe("Max items per catalog (default 5, hard cap 50)"),
802	}).passthrough().describe("Cross-catalog unified query: material + compatible tools + coatings + machine candidates in one call. Designed for 
... [+2026 chars truncated]

### Assistant | 2026-05-27T14:31:26.681Z

**VERDICT: PASS**

**Summary:**

This test file demonstrates excellent scrutiny discipline. It proves the dispatcher-to-engine wiring through three nested assertion layers:

**Strengths:**
1. **Schema validation (8 cases)** — Correctly tests Zod rejection shapes: missing subject, invalid subject, limit bounds (0, >50), non-integer limit, non-string query. Each assertion narrows to the correct `path` field (R9 intent-based testing).
2. **Envelope contract (12 subjects, 3 rounds)** — Verifies all 12 subjects route through without throwing, return the documented `{action, subject, ok, records|single}` envelope, and honor the count-vs-records invariant (no fabricated rows).
3. **Engine-wire proof (8 cases)** — Directly calls the engine methods (e.g. `listControllers()`, `emptySpec()`, `listGrades()`) and asserts dispatcher output is a *subset* of the engine output, not synthesized. This is the load-bearing proof that the wiring is real.
4. **Edge cases covered:** unknown subject (schema layer rejects), unknown id (graceful fallback to records-shape with count:0, verified), id-over-query precedence (tested explicitly), limit capping (real cap tested against engine size >3), query filtering (FANUC substring match verified). 
5. **Naming and structure:** Nested describes clearly separate contract → wire → proof layers; no unused imports; no network calls; all assertions are synchronous (no floating promises).
6. **21 test cases** — exceeds the minimum-10 requirement and covers the 12 subjects + 9 edge/precedence cases.

**Minor observations (not blocking):**
- Line 46: `as Record<string, unknown>` cast is redundant (handler already returns the shape), but harmless.
- Lines 299–302: Schema error detection uses `r.success === false || (error includes 'invalid')` — a bit loose for detecting Zod errors, but the pattern works because schema rejects are the only path that set `success=false` at this layer. Could be tighter, but not a bug.
- No floating-point tests, but the test 
... [+160 chars truncated]
