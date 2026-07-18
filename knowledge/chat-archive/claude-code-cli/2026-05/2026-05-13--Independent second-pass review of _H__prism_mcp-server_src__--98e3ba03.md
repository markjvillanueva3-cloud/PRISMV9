---
type: "chat-session"
source: "claude-code-cli"
session_id: "98e3ba03-ca2e-4d3d-a28e-97d2ff251513"
title: "Independent second-pass review of `H:/prism/mcp-server/src/__tests__/InventoryHo"
date: "2026-05-13"
first_ts: "2026-05-13T13:47:18.067Z"
last_ts: "2026-05-13T13:50:07.736Z"
cwd: "H:\\prism"
messages: 26
user_msgs: 10
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/98e3ba03-ca2e-4d3d-a28e-97d2ff251513/subagents/agent-a292002bfdec37fd5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Independent second-pass review of `H:/prism/mcp-server/src/__tests__/InventoryHo

> **claude-code-cli** | 2026-05-13 | 26 msgs (10 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/98e3ba03-ca2e-4d3d-a28e-97d2ff251513/subagents/agent-a292002bfdec37fd5.jsonl`

## Transcript

### User | 2026-05-13T13:47:18.067Z

Independent second-pass review of `H:/prism/mcp-server/src/__tests__/InventoryHookDefinitions.test.ts` (ACP-MS0/P0-U02 test file). Assume the test-review-agent caught the obvious gaps; your job is to find what they'd MISS.

The SUT is `H:/prism/scripts/inventory-hook-definitions.mjs`. The sibling pattern is `H:/prism/mcp-server/src/__tests__/InventorySlashCommandsByWorkflow.test.ts` (P0-U01).

The test file just ran and reports `57 tests passed`. Investigate:

1. **Test-vs-intent gap** — for each `it()` block, ask: "if the SUT's implementation changed in a way that broke the documented behaviour but kept the test happy, would the test catch it?" Specifically:
   - `mapEventToStage` tests: every event hits its own stage — but does any test verify that *all* events of one kind (e.g. all 8 known events) hit *distinct* stages, or could a regression collapse 2 events into the same stage undetected?
   - `classifyHook` precedence tests: 3 precedence pairs covered (Pre>Post, Stop>SessionStart, PreCompact>PostToolUse). Are there missed precedence pairs that matter? E.g., subagent-lifecycle vs session-bootstrap, infrastructure vs anything?
   - `extractPlannedHooks` "object-form entries" — does the test cover the **exact production data shape** from `SCENARIO-TEST-MS0.json` (`{name, file, built_in}`) or just a subset?

2. **Brittle / flaky tests** — does any test depend on:
   - The current value of a count in production data (e.g. "≥100 hooks" — what if a peer reduces hook count below 100 for legitimate reasons?). Suggest more-stable floors.
   - The script regenerating identical output across runs (it shouldn't — `generated_at` differs).
   - File-system race conditions with peer chats writing the same path.

3. **Coverage of the script's CLI surface** — `--help`, `--self-test`, `--no-write`, `--json`. Which are tested via subprocess? Which are missed?

4. **The `as unknown as X` double-casts** — the PreToolUse hook flagged this. Are there cases where a single-cast would s
... [+1340 chars truncated]

### Assistant | 2026-05-13T13:47:23.940Z

I'll investigate this test file thoroughly as an independent second-pass reviewer.

### Assistant | 2026-05-13T13:47:24.433Z

[tool_use: Read]

### User | 2026-05-13T13:47:30.709Z

[tool_result] 1	/**
2	 * InventoryHookDefinitions.test.ts — ACP-MS0/P0-U02
3	 *
4	 * Real-behavior tests for scripts/inventory-hook-definitions.mjs.
5	 * The script ships with --self-test (78 inline cases); this file exists so
6	 * vitest runs them in CI and so the public exports get coverage outside the
7	 * CLI smoke path.
8	 *
9	 * Coverage floor enforced:
10	 *   - Happy path  ............ mapEventToStage, 
... [+24204 chars truncated]

### Assistant | 2026-05-13T13:47:38.886Z

I have the file in memory. Now reading the SUT and companion to ground the findings.

### Assistant | 2026-05-13T13:47:39.346Z

[tool_use: Read]

### User | 2026-05-13T13:47:40.988Z

[tool_result] read-once-guard: 'H:\prism\scripts\inventory-hook-definitions.mjs' was already read 33s ago in this session and is unchanged (mtime 1778679531157). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-13T13:47:46.631Z

[tool_use: Grep]

### User | 2026-05-13T13:47:47.992Z

[tool_result] 61:export const STAGES_DISPLAY_ORDER = [
73:export const STAGE_DESCRIPTIONS = {
105:export function mapEventToStage(event) {
127:export function isInfrastructureHook(hook) {
155:export function classifyHook(hook) {
200:export function buildHookRecord(registryEntry) {
238:export function extractPlannedHooks(milestoneRecords) {
314:export function mergePlannedHooks(existingRecords, plannedRecords) {
... [+151 chars truncated]

### Assistant | 2026-05-13T13:47:52.025Z

[tool_use: Read]

### User | 2026-05-13T13:47:54.415Z

[tool_result] 61	export const STAGES_DISPLAY_ORDER = [
62	  "session-bootstrap",
63	  "prompt-ingestion",
64	  "pre-action-gate",
65	  "post-action-observe",
66	  "subagent-lifecycle",
67	  "session-teardown",
68	  "context-handoff",
69	  "infrastructure",
70	  "unknown",
71	];
72	
73	export const STAGE_DESCRIPTIONS = {
74	  "session-bootstrap":   "SessionStart — context load, digest inject, env probe.",
75	  "
... [+9116 chars truncated]

### Assistant | 2026-05-13T13:47:58.512Z

Acknowledged. Continuing with the review without re-reading files in cache.

### Assistant | 2026-05-13T13:47:59.276Z

[tool_use: Read]

### User | 2026-05-13T13:48:03.454Z

[tool_result] 260	      if (!byName.has(name)) {
261	        byName.set(name, {
262	          kind: "planned",
263	          id: name,
264	          file: null,
265	          wired: false,
266	          disabled: false,
267	          description: "Planned (declared by milestone envelope; not yet on disk)",
268	          description_inferred: true,
269	          tier: null,
270	          events: [],
271	        
... [+11513 chars truncated]

### Assistant | 2026-05-13T13:48:07.316Z

Acknowledged. I have sufficient context to complete the review without further re-reads. Let me check the companion file briefly and check for fixture data.

### Assistant | 2026-05-13T13:48:08.154Z

[tool_use: Grep]

### User | 2026-05-13T13:48:11.828Z

[tool_result] Found 10 files limit: 10
mcp-server\data\milestones\ACP-MS0.json
mcp-server\data\milestones\CADCAM-DAGI-MS0.json
mcp-server\data\milestones\XPROC-NEURAL-OPTIMIZE-MS0.json
mcp-server\data\milestones\OBSIDIAN-COMPOUND-MS1.json
mcp-server\data\milestones\WORKTREE-CONSOLIDATE-MS0.json
mcp-server\data\milestones\CAM-EXHAUST-MS0.json
mcp-server\data\milestones\SCENARIO-TEST-MS0.json
mcp-server\data\mile
... [+118 chars truncated]

### Assistant | 2026-05-13T13:48:15.455Z

This is a review task, not a build task — no task updates needed. I have enough context now to deliver concrete findings.

### Assistant | 2026-05-13T13:48:16.513Z

[tool_use: Grep]

### User | 2026-05-13T13:48:17.923Z

[tool_result] 93:    "new_hooks": [
94-      {"name": "pre-commit-scenario-smoke.mjs", "file": ".claude/hooks/pre-commit-scenario-smoke.mjs", "built_in": "U-ST08"}
95-    ],
96-    "new_actions": [
97-      {"name": "prism_dev:scenario_run", "built_in": "U-ST06"},
98-      {"name": "prism_dev:scenario_report", "built_in": "U-ST07"}
99-    ],
100-    "new_skills": [
101-      {"name": "/scenario-test", "file": "
... [+565 chars truncated]

### Assistant | 2026-05-13T13:48:22.167Z

Good — confirms the production data shape. Now let me check `inferPlannedStage` test coverage and a few other items.

### Assistant | 2026-05-13T13:48:23.416Z

[tool_use: Grep]

### User | 2026-05-13T13:48:25.323Z

[tool_result] No matches found

### Assistant | 2026-05-13T13:48:29.490Z

[tool_use: Read]

### User | 2026-05-13T13:48:36.062Z

[tool_result] 537	function parseArgs(argv) {
538	  const out = { noWrite: false, json: false, help: false, selfTest: false };
539	  for (const a of argv) {
540	    if (a === "--no-write") out.noWrite = true;
541	    else if (a === "--json") out.json = true;
542	    else if (a === "--help" || a === "-h") out.help = true;
543	    else if (a === "--self-test") out.selfTest = true;
544	  }
545	  return out;
546	}
5
... [+2664 chars truncated]

### Assistant | 2026-05-13T13:50:07.736Z

Sufficient context. Now I have everything I need to deliver the independent second-pass review.

---

# Independent Second-Pass Review: `InventoryHookDefinitions.test.ts`

## Verdict: PASS (with concrete improvement findings)

The file is well-structured, the per-test intent is mostly clear, and the production data shape (`{name, file, built_in}` from `SCENARIO-TEST-MS0.json` line 94) IS exercised at lines 282-296. The file passes; the findings below are quality improvements the test-review-agent likely missed.

---

## P0 — Real correctness gaps

### P0-1. `mapEventToStage` lacks the bijection invariant that the test docstring suggests (lines 47-84)
The 8 per-event tests (lines 48-71) prove each event maps to *some* stage, but **none verifies that the 8 known events produce 7 distinct stages** (SubagentStart + SubagentStop share `subagent-lifecycle`, others should be unique). A regression that collapsed `PostToolUse → post-action-observe` into `pre-action-gate` would pass tests 48-71 individually if test 56 were wrong; more dangerously, a refactor that aliased `Stop → session-bootstrap` would still pass `it("Stop → session-teardown")` only if the assertion string is right — but **there's no cross-event sanity check** that the *set* of stages produced is `{session-bootstrap, prompt-ingestion, pre-action-gate, post-action-observe, subagent-lifecycle, session-teardown, context-handoff}` with no collisions.

**Fix**: add an assertion that `new Set([SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, SubagentStart, Stop, PreCompact].map(mapEventToStage)).size === 7`.

### P0-2. The `extractPlannedHooks` happy-path test does NOT exercise the live `SCENARIO-TEST-MS0.json` shape end-to-end (lines 277-296)
The adversarial test at line 277 covers `{name, file, built_in}`, **but** only as a synthetic fixture. The live e2e tests (lines 572-614) verify *counts*, not that the SCENARIO-TEST-MS0 record actually round-trips with `pre-commit-scenario-smoke.mjs` showing up in `p
... [+16653 chars truncated]
