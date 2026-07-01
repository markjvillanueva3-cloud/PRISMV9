---
type: "chat-session"
source: "claude-code-cli"
session_id: "f09b33aa-5b39-4133-a868-6c905866dd7c"
title: "Per-file scrutiny — test review. REVIEW TARGET: `H:/prism/mcp-server/src/__tests"
date: "2026-05-19"
first_ts: "2026-05-19T16:29:35.600Z"
last_ts: "2026-05-19T16:31:04.733Z"
cwd: "H:\\prism\\mcp-server"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/f09b33aa-5b39-4133-a868-6c905866dd7c/subagents/agent-a9fd0eb0dcb378d2d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# Per-file scrutiny — test review. REVIEW TARGET: `H:/prism/mcp-server/src/__tests

> **claude-code-cli** | 2026-05-19 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/f09b33aa-5b39-4133-a868-6c905866dd7c/subagents/agent-a9fd0eb0dcb378d2d.jsonl`

## Transcript

### User | 2026-05-19T16:29:35.600Z

Per-file scrutiny — test review.

REVIEW TARGET: `H:/prism/mcp-server/src/__tests__/wire-tool-call-batch-optimize.test.ts` (whole file, 11 cases).

UNIT UNDER TEST: U-WIRE-TOOL-CALL-BATCH-OPTIMIZE — wires `ToolCallBatchOptimizerEngine` (`mcp-server/src/engines/ToolCallBatchOptimizerEngine.ts`) to the `prism_dev:tool_call_batch_optimize` dispatcher action. The engine has 4 methods: `plan(calls)` (dependency-aware batch planner), `analyze(calls)` (redundancy/parallelization detector), `estimateCost(calls)` (token cost sum from a TOOL_COSTS table), `summary(calls)` (compact digest).

The test passed 11/11 on vitest. But passing != correct — verify intent.

CHECK:
1. Wiring source-grep gates: do they ACTUALLY pin the wiring (action in enum, case block, lazy import, op-switch with 4 ops, R12 non-array guard)? Would these tests FAIL if someone reverted the wiring? (fail-on-revert quality)
2. Engine-behavior tests: real-value assertions, NOT `toBeDefined()` stubs?
3. The `plan()` dependency test asserts the Edit batch comes AFTER the Read /a.ts batch — is this assertion actually meaningful, or could it pass trivially? Verify the SAMPLE fixture genuinely exercises the dependency + write-conflict logic.
4. The `analyze()` redundancy test — does it prove the redundant Read /a.ts (idx 2, same params as idx 0) is detected? Per the foxtrot R12 lesson [[reference_u_tdp08_paired_band_rc_2026_05_19]]: a detection test must prove the target fired (`redundant >= 1`) AND ideally that the suggestion text names it.
5. `estimateCost()` test pins exact values (500+200+300) from the engine's TOOL_COSTS table — is the table reference accurate? (Read the engine's TOOL_COSTS const: Read=500, Grep=200, Glob=100, Edit=300, Write=300, Bash=400, WebFetch=1000, WebSearch=800, Agent=2000; unknown→300.)
6. Anti-regression test (engine import path stability) — does it pin the named exports + method names the dispatcher case depends on?
7. Missing coverage: is there a test for the op-discriminator's `
... [+317 chars truncated]

### Assistant | 2026-05-19T16:29:45.767Z

I'll review the test file against the wiring + engine behavior criteria.

### Assistant | 2026-05-19T16:29:45.989Z

[tool_use: Read]

### Assistant | 2026-05-19T16:29:46.470Z

[tool_use: Read]

### Assistant | 2026-05-19T16:29:46.959Z

[tool_use: Grep]

### User | 2026-05-19T16:29:51.430Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\ToolCallBatchOptimizerEngine.ts' was already read 23m ago in this session and is unchanged (mtime 1772919642000). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### User | 2026-05-19T16:30:03.829Z

[tool_result] Found 1 file
src\tools\dispatchers\devDispatcher.ts

### User | 2026-05-19T16:30:09.717Z

[tool_result] 1	/**
2	 * WIRE-UNWIRED-MS0/U-WIRE-TOOL-CALL-BATCH-OPTIMIZE (slot foxtrot, 2026-05-19)
3	 *
4	 * Wiring-gate test for the `tool_call_batch_optimize` dispatcher action over
5	 * the ToolCallBatchOptimizerEngine. Verifies:
6	 *
7	 *   1. Action is registered in the devDispatcher z.enum (source-grep).
8	 *   2. Case block exists with the canonical lazy-import pattern (source-grep).
9	 *   3. All 4 op
... [+7470 chars truncated]

### Assistant | 2026-05-19T16:30:14.882Z

Let me check the dispatcher wiring directly.

### Assistant | 2026-05-19T16:30:14.885Z

[tool_use: Grep]

### Assistant | 2026-05-19T16:30:17.178Z

[tool_use: Grep]

### User | 2026-05-19T16:30:33.171Z

[tool_result] 6116-                result = { success: true };
6117-                break;
6118-              }
6119-              case "stats":  result = toolCallDeduplicatorEngine.stats(); break;
6120-              case "reset":  toolCallDeduplicatorEngine.reset(); result = { success: true }; break;
6121-              default:       result = { error: `unknown tool_call_dedup op: ${String(op)}` };
6122-       
... [+1859 chars truncated]

### User | 2026-05-19T16:30:40.032Z

[tool_result] No matches found

### Assistant | 2026-05-19T16:30:41.204Z

Now let me check the enum registration.

### Assistant | 2026-05-19T16:30:41.574Z

[tool_use: Grep]

### User | 2026-05-19T16:30:54.554Z

[tool_result] 525-// _analyze (parallelization observability) — this is the FORWARD-LOOKING
526-// planner: given N planned calls, return the dependency-respecting batch plan
527-// that minimizes total rounds. Singleton (toolCallBatchOptimizerEngine).
528:"tool_call_batch_optimize",
529-// WIRE-UNWIRED-MS0/U-WIRE-TOOL-CALL-HISTOGRAM: ToolCallHistogramEngine surfaces
530-// (op-discriminator over 6 methods reco
... [+2694 chars truncated]

### Assistant | 2026-05-19T16:31:04.733Z

**REVIEW: wire-tool-call-batch-optimize.test.ts**

**Grade: PASS (11/11)**

**Strengths:**
1. **Wiring source-grep gates (tests 1-3)** — All load-bearing: enum literal check (`"tool_call_batch_optimize"`), case-block existence, lazy import path, op-switch over 4 ops, Array.isArray guard. These tests WILL FAIL if someone reverts the wiring. ✓

2. **Real-data oracle (tests 4-8)** — SAMPLE fixture genuinely exercises dependency logic: Edit(idx=3) depends on Read(/a.ts, idx=0); test asserts Edit batch comes AFTER Read batch. Redundant Read(idx=2, /a.ts) is caught. summary() contains actual call count. ✓

3. **Cost table accuracy** — Test pins exact Read=500, Grep=200, Edit=300 sum = 1000. Unknown tool → 300 default. Matches engine TOOL_COSTS. ✓

4. **Fail-safe coverage** — Empty plan returns zeros, not throw. Unknown op returns `{error}`. ✓

5. **Anti-regression (test 9)** — Pinned export names + method names (plan/analyze/estimateCost/summary). ✓

**Gaps (P2 not blockers):**
1. **Missing default-op test** — The dispatcher case block has a `default` (line 6146) that returns `{error: "unknown tool_call_batch_optimize op"}`, but the test doesn't verify it. A test invoking the dispatcher with an invalid op would prove the wiring's error path. This is dispatcher-level, not engine-level, so a wiring-gate suite can defer it, but it's an uncovered branch. (P2)

2. **No negative-case dispatcher invocation** — Tests call the singleton directly; no MCP roundtrip through devDispatcher. The lazy import itself is only proven by source-grep. A one-line integration test (`await devDispatcher.dispatch({action:"tool_call_batch_optimize", params:{op:"plan", calls:[...]}})`) would close the loop. (P2)

3. **estimateCost() test is too light** — Line 130 checks only 3 tools; doesn't verify ALL tools in the TOOL_COSTS table are modeled. (P2)

**Verdict:** The 11 tests correctly prove wiring (grep gates + real-data oracle). All 4 ops are called; redundancy + dependency are exercised; error pa
... [+179 chars truncated]
