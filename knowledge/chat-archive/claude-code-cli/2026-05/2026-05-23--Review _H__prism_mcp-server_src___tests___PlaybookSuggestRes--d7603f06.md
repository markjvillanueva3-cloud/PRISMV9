---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7603f06-4cc6-4907-a4b9-a863ca8a3aca"
title: "Review `H:/prism/mcp-server/src/__tests__/PlaybookSuggestResolutionDispatcherWir"
date: "2026-05-23"
first_ts: "2026-05-23T02:47:59.227Z"
last_ts: "2026-05-23T02:50:00.293Z"
cwd: "H:\\prism\\mcp-server"
messages: 26
user_msgs: 10
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/d7603f06-4cc6-4907-a4b9-a863ca8a3aca/subagents/agent-ae59f05300d0d6177.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Review `H:/prism/mcp-server/src/__tests__/PlaybookSuggestResolutionDispatcherWir

> **claude-code-cli** | 2026-05-23 | 26 msgs (10 user / 16 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/d7603f06-4cc6-4907-a4b9-a863ca8a3aca/subagents/agent-ae59f05300d0d6177.jsonl`

## Transcript

### User | 2026-05-23T02:47:59.227Z

Review `H:/prism/mcp-server/src/__tests__/PlaybookSuggestResolutionDispatcherWiring.test.ts` end-to-end. This is the round-trip wiring proof for two new actions in `prism_shop_practice` dispatcher: `playbook_suggest_resolutions` (batch) and `playbook_suggest_resolution` (single-pair). All 13 tests pass via `vitest run`.

The dispatcher under test is `H:/prism/mcp-server/src/tools/dispatchers/shopPracticeDispatcher.ts`. The two actions are wired across 5 surfaces: ACTIONS tuple, ACTION_HANDLERS map, ACTION_SHOP_PRACTICE_SCHEMAS, schema definitions in `H:/prism/mcp-server/src/schemas/shopPracticeActionSchemas.ts`, and z.enum registration.

The test uses the captured-server-tool harness pattern from sibling `PlaybookRulesDispatcherWiring.test.ts` — a mock MCP server captures the `server.tool(name, desc, schema, handler)` registration and re-runs the captured `z.enum(ACTIONS)` schema on every invoke (so an action absent from the enum throws).

**Focus (P0/P1):**

P0:
1. **Wiring proof is real**: enum-validation runs BEFORE handler dispatch (the "MockMCPServer-bypass trap" docs warn about). Verify `schema.action.parse(action)` is called in `invoke()`.
2. **No `toBeDefined()` weak assertions** — verify the file uses concrete `expect(typeof X).toBe("string")` or `expect(X).toBe(<value>)` patterns.
3. **R12 fail-loud surfacing test** — verify the test confirms the engine's `warning` field propagates through the dispatcher's JSON serialization with both stale rule ids named.
4. **Input validation coverage** — verify rejection tests for: missing required fields, invalid parameter enum, oversized ruleIdA (>256 chars), empty ruleIdA.
5. **All 5 parameter enum values tested** — feedrate, spindle_speed, depth_of_cut, width_of_cut, coolant.

P1:
6. Both flat-payload AND nested `{conflict:{...}}` shapes are tested.
7. Batch action's `{success, report}` shape and single action's `{success, proposal}` shape are both verified.
8. byDecision buckets sum to conflictCount invariant is te
... [+461 chars truncated]

### Assistant | 2026-05-23T02:48:14.763Z

I'll review the wiring test file end-to-end, focusing on the P0/P1 criteria.

### Assistant | 2026-05-23T02:48:14.869Z

[tool_use: Read]

### User | 2026-05-23T02:48:23.645Z

[tool_result] 1	/**
2	 * PlaybookSuggestResolutionDispatcherWiring.test.ts
3	 *
4	 * U-PB-SUGGEST-RESOLUTION — round-trip wiring proof for the two new
5	 * `prism_shop_practice` actions: `playbook_suggest_resolutions` (batch) and
6	 * `playbook_suggest_resolution` (single-pair). This invokes the dispatcher
7	 * end-to-end (z.enum validation + handler dispatch + engine call + JSON
8	 * response shape), proving t
... [+11393 chars truncated]

### Assistant | 2026-05-23T02:48:25.235Z

Now let me check the dispatcher and schema files to verify the wiring surfaces.

### Assistant | 2026-05-23T02:48:25.572Z

[tool_use: Read]

### User | 2026-05-23T02:48:31.787Z

[tool_result] 1	/**
2	 * Shop Practice Dispatcher — CC-MS6 Integration
3	 *
4	 * MCP tool bridging the Python CC-MS6 Machining Practice Knowledge Base
5	 * (practice_aggregate, trouble_tree, material_tips) to PRISM dispatchers.
6	 *
7	 * Actions:
8	 *   Practice KB:
9	 *     - practice_ingest:    Ingest SHOP extraction results into practice DB
10	 *     - practice_search:    Search practices by query/category/m
... [+4814 chars truncated]

### Assistant | 2026-05-23T02:48:34.114Z

[tool_use: Read]

### User | 2026-05-23T02:48:48.848Z

[tool_result] 120	  "playbook_antipatterns",
121	  "playbook_lookup",
122	  "playbook_add_rule",
123	  "tribal_search",
124	  "tribal_add",
125	  "tribal_get",
126	  "tribal_list",
127	  "tribal_categories",
128	  "tribal_enrich",
129	  "tribal_enrich_check",
130	  "tribal_enrich_tips_only",
131	  "tribal_enrich_playbook_only",
132	  "tribal_enrich_controller_only",
133	  "playbook_rules_query",
134	  "playbook
... [+5801 chars truncated]

### Assistant | 2026-05-23T02:48:50.274Z

Let me read the handler section for the two new actions and check the schemas.

### Assistant | 2026-05-23T02:48:50.925Z

[tool_use: Grep]

### User | 2026-05-23T02:48:58.873Z

[tool_result] 151:  "playbook_suggest_resolutions",
152:  "playbook_suggest_resolution",
1264:        `playbook_suggest_resolution requires conflict.{ruleIdA, ruleIdB, parameter}. ` +
1352:  playbook_suggest_resolutions: handlePlaybookSuggestResolutions,
1353:  playbook_suggest_resolution: handlePlaybookSuggestResolution,

### Assistant | 2026-05-23T02:49:01.188Z

[tool_use: Read]

### User | 2026-05-23T02:49:08.912Z

[tool_result] 1200	 * is explicitly encoded.
1201	 */
1202	async function handlePlaybookQuantitative(params: Record<string, any>): Promise<any> {
1203	  const guidance = machiningPlaybookEngine.quantitativeGuidance(params as Parameters<typeof machiningPlaybookEngine.quantitativeGuidance>[0]);
1204	  return { success: true, guidance };
1205	}
1206	
1207	/**
1208	 * Playbook-corpus integrity audit: scans every ru
... [+8774 chars truncated]

### Assistant | 2026-05-23T02:49:10.609Z

Now let me check the schema file:

### Assistant | 2026-05-23T02:49:11.261Z

[tool_use: Grep]

### User | 2026-05-23T02:49:19.044Z

[tool_result] 399:const playbook_suggest_resolutions = z.object({}).passthrough();
446:const playbook_suggest_resolution = z
513:  playbook_suggest_resolutions,
514:  playbook_suggest_resolution,

### Assistant | 2026-05-23T02:49:20.725Z

[tool_use: Read]

### User | 2026-05-23T02:49:27.005Z

[tool_result] 399	const playbook_suggest_resolutions = z.object({}).passthrough();
400	
401	// Single-pair resolution proposal. Strict per H:/.claude/rules/schemas.md
402	// ("never z.any()") — surface required fields in the MCP tool catalog so
403	// operators see what the handler actually requires (Reviewer B P1-2, iter9).
404	// CONFLICT_PARAMETER and DIRECTIVE_DIRECTION are mirrored from
405	// MachiningPla
... [+4284 chars truncated]

### Assistant | 2026-05-23T02:49:28.460Z

Now let me verify the MachiningPlaybookEngine methods exist and check test behavior:

### Assistant | 2026-05-23T02:49:29.051Z

[tool_use: Grep]

### User | 2026-05-23T02:49:37.728Z

[tool_result] 5111:  suggestResolution(conflict: PlaybookConflict | RankedConflict): ResolutionProposal {
5118:   * Batch variant of `suggestResolution()` over a conflict set. Accepts the
5129:  suggestResolutions(input?: PlaybookConflictReport | RankedConflictReport): ResolutionReport {
5157:  /** Shared core for suggestResolution() + suggestResolutions(). */

### Assistant | 2026-05-23T02:49:38.939Z

Perfect. Now let me run the actual test to see what the 13 test results are:

### Assistant | 2026-05-23T02:49:39.518Z

[tool_use: Grep]

### User | 2026-05-23T02:49:48.215Z

[tool_result] 56:  it("both new actions are in the registered z.enum(ACTIONS)", () => {
64:  it("an action NOT in the enum is rejected (proves the gate is live)", () => {
71:  it("playbook_suggest_resolutions returns a structurally-valid ResolutionReport", async () => {
92:  it("playbook_suggest_resolutions ignores caller-supplied params (batch takes no input)", async () => {
102:  it("playbook_suggest_resoluti
... [+910 chars truncated]

### Assistant | 2026-05-23T02:50:00.293Z

Excellent. Now I have the full context. Let me analyze this against the P0/P1 checklist:

## Analysis

**P0 — Wiring Proof is Real:**
- Line 39: `schema.action.parse(action)` is called BEFORE handler dispatch in `invoke()`. This enforces z.enum validation. ✓
- Lines 56-62: Enum validation test confirms both actions parse successfully. ✓
- Lines 64-68: Negative test proves the gate is live (typo rejected). ✓

**P0 — No Weak Assertions:**
- Line 60: `expect(h.schema.action.parse(a)).toBe(a)` — concrete value match ✓
- Line 75: `expect(r.success).toBe(true)` — concrete boolean ✓
- Lines 76-84: `expect(typeof ...)` patterns used throughout (lines 76, 77, 80, 81, 82, 84, 106, 189) instead of `toBeDefined()` ✓
- No `toBeDefined()` weak assertions found. ✓

**P0 — R12 Fail-Loud Warning Test:**
- Lines 169-196: Test confirms `warning` field surfaces BOTH stale rule ids:
  - Line 189: `expect(typeof r.proposal.warning).toBe("string")`
  - Line 190: `expect(r.proposal.warning).toContain("Neither rule found in corpus")`
  - Lines 191-192: Both rule ids named explicitly in the warning ✓
- Lines 194-195: Rationale honesty check (NOT lying with "human judgment required") ✓

**P0 — Input Validation Coverage:**
- Lines 102-110: Missing required fields test — error field named with field names (line 107-109) ✓
- Lines 112-132: Invalid parameter enum rejection (both schema + handler layer covered) ✓
- Lines 134-150: Oversized ruleIdA (>256 chars) rejection ✓
- Lines 152-166: Empty ruleIdA rejection ✓

**P0 — All 5 Parameter Enum Values Tested:**
- Lines 218-230: Explicit loop over all 5 values: `["feedrate", "spindle_speed", "depth_of_cut", "width_of_cut", "coolant"]` ✓

**P1 — Both Flat and Nested Shapes Tested:**
- Lines 198-216: Test uses both:
  - Line 200-204: Flat payload (ruleIdA at top level)
  - Line 205-211: Nested `{conflict:{...}}` payload ✓

**P1 — Response Shapes Verified:**
- Lines 71-90: Batch action returns `{success, report}` with invariant check (line 87): `byDecis
... [+1278 chars truncated]
