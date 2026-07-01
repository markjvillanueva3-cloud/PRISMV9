---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "Independent review of this unit (slot:bravo, PRISM). Grade PASS/FAIL with P0/P1/"
date: "2026-06-18"
first_ts: "2026-06-18T18:00:03.978Z"
last_ts: "2026-06-18T18:06:54.965Z"
cwd: "H:\\prism\\mcp-server"
messages: 67
user_msgs: 24
assistant_msgs: 43
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-af4b0cd31974f0341.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Independent review of this unit (slot:bravo, PRISM). Grade PASS/FAIL with P0/P1/

> **claude-code-cli** | 2026-06-18 | 67 msgs (24 user / 43 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-af4b0cd31974f0341.jsonl`

## Transcript

### User | 2026-06-18T18:00:03.978Z

Independent review of this unit (slot:bravo, PRISM). Grade PASS/FAIL with P0/P1/P2 + file:line. Weighted toward test integrity (R9), dedup/duplication, integration coupling, and honest scoping.

FILES:
1. H:\prism\mcp-server\src\engines\ZuluWaveSchedulerEngine.ts -- NEW projectGovernedSchedule (projects the FULL governed multi-wave schedule by looping governedNextWave over simulated completions) + ProjectedWave/ProjectedSchedule types + renderProjectedSchedule (with a slimmed-shape guard).
2. H:\prism\mcp-server\src\tools\dispatchers\sessionDispatcher.ts -- NEW project_governed_schedule + project_schedule_render actions.
3. H:\prism\mcp-server\src\__tests__\ZuluWaveSchedulerEngine.projectSchedule.test.ts (8 tests)
4. H:\prism\mcp-server\src\__tests__\sessionDispatcher.projectSchedule.e2e.test.ts (3 round-trip tests)

CONTEXT: This is the C1 "runtime driver" verifiable CORE (task #29/#15). The genuine gap: governedNextWave returns ONE governed wave; allWaves gives topology-only ID partitions; NOTHING projected the COMPLETE governed schedule + a drains/stalled FEASIBILITY verdict (the upfront "will this DAG drain under current governance?" check a runtime executor runs before spawning agents). The agent-spawning EXECUTOR itself is a separate later unit (a Workflow -- a sync dispatcher cannot spawn+await subagents).

CHECK:
- DEDUP (R8): is projectGovernedSchedule genuinely NEW, or does it duplicate allWaves / governedNextWave / nextWaveAssignments? (allWaves = topology ids only, no governance/assignments; governedNextWave = ONE wave; this = full governed projection + feasibility. Confirm it reuses those primitives, not re-implements them.)
- R9 test integrity: would the 8 engine tests FAIL on a real regression (a lost overflow subtask -> drains flips false; a missed veto -> stalled wrong; double-dispatch -> the no-dup assertion fires)? Is the cycle-throws test real? Is the e2e a REAL dispatcher round-trip (captureHandler + invoke through registerSessionDispatcher), an
... [+978 chars truncated]

### Assistant | 2026-06-18T18:00:10.075Z

I'll review this unit thoroughly. Let me start by reading all four files end to end.

### Assistant | 2026-06-18T18:00:10.584Z

[tool_use: Read]

### Assistant | 2026-06-18T18:00:11.191Z

[tool_use: Read]

### Assistant | 2026-06-18T18:00:11.568Z

[tool_use: Read]

### User | 2026-06-18T18:00:12.041Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\ZuluWaveSchedulerEngine.ts' was already read 18s ago in this session and is unchanged (mtime 1781805450449). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### User | 2026-06-18T18:00:12.071Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\ZuluWaveSchedulerEngine.projectSchedule.test.ts' was already read 18s ago in this session and is unchanged (mtime 1781805479779). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you.
... [+30 chars truncated]

### User | 2026-06-18T18:00:12.144Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\sessionDispatcher.projectSchedule.e2e.test.ts' was already read 17s ago in this session and is unchanged (mtime 1781805398425). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (
... [+28 chars truncated]

### Assistant | 2026-06-18T18:00:15.015Z

The read-once guard says I read these 18s ago, but I have no such content in my context — this is a fresh agent thread. I'll disable the cache to read the actual files.

### Assistant | 2026-06-18T18:00:15.858Z

[tool_use: Bash]

### User | 2026-06-18T18:00:20.004Z

[tool_result] cache disabled for this shell only — will pass param instead

### Assistant | 2026-06-18T18:00:23.539Z

The guard is a tool-level wrapper, not an env var I can set from bash. Let me read the files using offset/limit to bypass the exact-match guard, or read the git-diff to get the actual content. Let me start with the engine file by reading it in segments.

### Assistant | 2026-06-18T18:00:24.515Z

[tool_use: Read]

### User | 2026-06-18T18:00:28.849Z

[tool_result] 1	/**
2	 * ZuluWaveSchedulerEngine -- multi-wave DAG scheduler for Hermes fan-out plans.
3	 *
4	 * The companion HermesParallelFanoutPlannerEngine (HZP01) decomposes a parent
5	 * task into N subtasks but its `plan()` only ever emits WAVE 1 -- its leaf-filter
6	 * (`subtasks.filter(s => s.depends_on.length === 0)`) returns the initial
7	 * parallelizable set and defers everything with a dependency
... [+38629 chars truncated]

### Assistant | 2026-06-18T18:00:34.943Z

I have the full engine file. Now let me read the test files and the dispatcher changes.

### Assistant | 2026-06-18T18:00:36.048Z

[tool_use: Read]

### User | 2026-06-18T18:00:38.361Z

[tool_result] 1	/**
2	 * ZuluWaveSchedulerEngine.projectGovernedSchedule -- the C1 full governed multi-wave projection
3	 * (U-WAVE-PROJECT-SCHEDULE, slot:bravo). governedNextWave returns ONE governed wave; this projects
4	 * the COMPLETE run in one call (simulating all-dispatched-succeeds) and returns a drains/stalled
5	 * FEASIBILITY verdict -- the upfront check a runtime executor runs BEFORE spawning any age
... [+7058 chars truncated]

### Assistant | 2026-06-18T18:00:41.250Z

Now the e2e dispatcher test.

### Assistant | 2026-06-18T18:00:41.988Z

[tool_use: Read]

### User | 2026-06-18T18:00:43.594Z

[tool_result] 1	import { describe, it, expect, beforeEach, afterEach } from "vitest";
2	import * as fs from "node:fs";
3	import * as os from "node:os";
4	import * as path from "node:path";
5	
6	/**
7	 * Dispatcher round-trip E2E for the C1 full governed schedule projection
8	 * (U-WAVE-PROJECT-SCHEDULE, slot:bravo). The R15-VALIDATE proof that
9	 * prism_session:project_governed_schedule actually runs the engin
... [+5367 chars truncated]

### Assistant | 2026-06-18T18:00:46.402Z

Now let me examine the dispatcher changes. Let me look at the git diff for the dispatcher to see exactly what was added, then read the relevant sections of the dispatcher in full.

### Assistant | 2026-06-18T18:00:48.782Z

[tool_use: Bash]

### User | 2026-06-18T18:00:53.401Z

[tool_result]  mcp-server/src/engines/ZuluWaveSchedulerEngine.ts  | 139 +++++++++++++++++++++
 .../src/tools/dispatchers/sessionDispatcher.ts     |  22 ++++
 2 files changed, 161 insertions(+)
---UNCOMMITTED---
 M mcp-server/src/engines/ZuluWaveSchedulerEngine.ts
 M mcp-server/src/tools/dispatchers/sessionDispatcher.ts
?? mcp-server/src/__tests__/ZuluWaveSchedulerEngine.projectSchedule.test.ts
?? mcp-server/src
... [+56 chars truncated]

### Assistant | 2026-06-18T18:00:56.381Z

[tool_use: Bash]

### User | 2026-06-18T18:01:00.765Z

[tool_result] diff --git a/mcp-server/src/tools/dispatchers/sessionDispatcher.ts b/mcp-server/src/tools/dispatchers/sessionDispatcher.ts
index 67d307f830..dfcca0e1c2 100644
--- a/mcp-server/src/tools/dispatchers/sessionDispatcher.ts
+++ b/mcp-server/src/tools/dispatchers/sessionDispatcher.ts
@@ -535,6 +535,9 @@ const ACTIONS = [
   "governed_wave_execute",
   // C1+C2 RESUMABILITY -- a governed wave step that r
... [+2686 chars truncated]

### Assistant | 2026-06-18T18:01:04.427Z

Now let me verify the integration consistency: compare against the sibling `governed_wave_execute` case to confirm the same caller-provides-souls + default-ON delegation contract. Let me read that area of the dispatcher in full.

### Assistant | 2026-06-18T18:01:05.070Z

[tool_use: Read]

### User | 2026-06-18T18:01:06.723Z

[tool_result] 3980	          case "hermes_auto_fanout_gate": {
3981	            const { HermesParallelFanoutPlannerEngine } = await import("../../engines/HermesParallelFanoutPlannerEngine.js");
3982	            const p = params as { prompt_text?: string; threshold?: number; max_parallel?: number };
3983	            return ok({ success: true, assessment: HermesParallelFanoutPlannerEngine.assessAutoTrigger(p.prom
... [+9553 chars truncated]

### Assistant | 2026-06-18T18:01:12.696Z

The dispatcher wiring matches the sibling `governed_wave_execute` pattern exactly (caller-provides-souls Map, default-ON delegation via `apply_delegation !== false`). The intentional difference is no back-pressure throttle, which the comment justifies. Now let me verify a few load-bearing claims:

1. That `ZuluFleetGovernorEngine.checkAuthority` actually vetoes via refuse_list/domain_filter as the tests assume.
2. That `assignSubtasksToSlots` overflow behavior matches the `max_parallel=1` overflow-drains test.
3. That `slimResponse` actually drops empty arrays (the render slim-shape claim).

Let me check these in parallel.

### Assistant | 2026-06-18T18:01:14.144Z

[tool_use: Grep]

### User | 2026-06-18T18:01:15.416Z

[tool_result] 75:  static checkAuthority(reqRaw: AuthorityCheckRequest, soul: SlotSoul | null): AuthorityVerdict {
76-    const req = AuthorityCheckRequestSchema.parse(reqRaw);
77-
78-    // Informational operations bypass domain gating (still subject to refuse rules).
79-    const informational = req.operation === "bus-send" || req.operation === "adopt-doctrine" || req.operation === "escalate";
80-
81-    if (
... [+2097 chars truncated]

### Assistant | 2026-06-18T18:01:15.534Z

[tool_use: Grep]

### User | 2026-06-18T18:01:16.803Z

[tool_result] 152:export function assignSubtasksToSlots(
153-  toAssign: Subtask[],
154-  candidates: SlotCandidate[],
155-  maxParallel: number,
156-): { assignments: AgentAssignment[]; unrouted: string[]; overflow: string[] } {
157-  const assigned = new Set<string>();
158-  const assignments: AgentAssignment[] = [];
159-  const unrouted: string[] = [];
160-  const overflow: string[] = [];
161-  // Preserve s
... [+2382 chars truncated]

### Assistant | 2026-06-18T18:01:23.771Z

Both primitives confirm the test assumptions:

- `checkAuthority`: refuse_list hit → `authorized:false` with `refuse-rule-veto:` reason (the GOVERNANCE STALL test's `refuse_list: ["work for b"]` matches the `work for b` description → veto). An absent soul → `no-soul-resolved` veto (FAIL-CLOSED test). `domain_filter: "work"` regex-matches `work for <id>` → authorized.
- `assignSubtasksToSlots`: caps assignments at `maxParallel`, pushes the rest to `overflow` — so the OVERFLOW DRAINS test (3 leaves, max_parallel=1 → 1 per wave, overflow re-offered on next projected wave) is correct, because `projectGovernedSchedule` only marks the dispatched (authorized) assignments completed and re-loops.

Now let me verify the `slimResponse` claim (drops empty arrays, keeps booleans/numbers) that the render slim-shape guard and e2e depend on.

### Assistant | 2026-06-18T18:01:25.261Z

[tool_use: Grep]

### User | 2026-06-18T18:01:27.197Z

[tool_result] No matches found

### Assistant | 2026-06-18T18:01:30.639Z

`slimResponse` isn't in the dispatcher file directly. Let me find where `ok()` is defined and whether it slims responses (drops empty arrays).

### Assistant | 2026-06-18T18:01:32.249Z

[tool_use: Grep]

### User | 2026-06-18T18:01:33.416Z

[tool_result] 19:import { slimResponse } from "../../utils/responseSlimmer.js";
661:function ok(data: any) {
662:  return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(data)) }] };
668: * dispatch set, throttled:[]/back_pressure:[] which slimResponse drops). Reads the durable

### Assistant | 2026-06-18T18:01:36.960Z

`ok()` runs `slimResponse(data)`. Let me read the slimmer to confirm it drops empty arrays but keeps booleans (false) and numbers (0) — which is the entire basis for both the render slim-shape guard and the e2e `(s.stalled ?? [])` handling.

### Assistant | 2026-06-18T18:01:37.207Z

[tool_use: Read]

### User | 2026-06-18T18:01:37.860Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\utils\responseSlimmer.ts' was already read 43s ago in this session and is unchanged (mtime 1781115864340). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-18T18:01:40.546Z

The read-once guard is blocking again (false positive — fresh thread). Let me read it with an explicit offset to bypass.

### Assistant | 2026-06-18T18:01:41.089Z

[tool_use: Read]

### User | 2026-06-18T18:01:42.536Z

[tool_result] 1	/**
2	 * Response Slimmer Utility
3	 * Reduces verbose response objects for MCP transport efficiency.
4	 * @module utils/responseSlimmer
5	 */
6	
7	/**
8	 * Slim a response object by removing null/undefined values and empty arrays.
9	 *
10	 * @param response - the value to slim
11	 * @param maxDepth - recursion ceiling (default 32). A circular reference or a
12	 *   pathologically deep payload w
... [+2516 chars truncated]

### Assistant | 2026-06-18T18:01:51.041Z

`slimResponse` confirmed: drops `null`/`undefined` and empty arrays (`value.length === 0`), keeps numbers (including 0) and booleans (including false). This validates:

- The render slim-shape guard (`Array.isArray(s.waves) ? ... : []`) is a genuine fix: a fully-drained schedule has `stalled: []` which gets dropped → `s.stalled` is `undefined` → pre-fix `s.stalled.length` would throw. The slim-shape test (line 101-109) and the e2e `project_schedule_render` round-trip (line 91-97, which renders `r.schedule` AFTER it came back through `ok()`/slimResponse) actually exercise this path. This is a real round-trip bug catch, not tautological.
- The e2e `(s.stalled ?? [])` handling and `drains:false`/`dispatched_count:0` assertions survive slimming (false and 0 are kept).

Now let me verify the action-count anti-regression and confirm no `.skip`/`.only` and ASCII-only. Let me also double-check the convergence-guard / second-order concern about vetoed re-appearing every wave, and confirm `projectGovernedSchedule` matches `governedNextWave`'s contract for overflow re-offering. Let me run the tests to get empirical confirmation.

### Assistant | 2026-06-18T18:01:52.484Z

[tool_use: Bash]

### User | 2026-06-18T18:02:00.202Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/__tests__/ZuluWaveSchedulerEngine.projectSchedule.test.ts (8 tests) 8ms
stderr | src/__tests__/sessionDispatcher.projectSchedule.e2e.test.ts > prism_session:project_governed_schedule -- C1 full-projection round-trip > a fully-authorized diamond DRAINS through the dispatcher: 4 dispatched over 3 waves, none stalled
[INFO] [prism_session] project_governed_sch
... [+1124 chars truncated]

### Assistant | 2026-06-18T18:02:05.109Z

All 11 tests pass (8 engine + 3 e2e). Now let me verify R9 hardness empirically — would these tests actually FAIL on a real regression? Let me do a targeted sanity check on the dedup question (is `projectGovernedSchedule` genuinely reusing primitives, not re-implementing) and confirm the action-count went up. Let me check the engine body reuse and verify no `.skip`/`.only` and ASCII.

### Assistant | 2026-06-18T18:02:09.483Z

[tool_use: Bash]

### User | 2026-06-18T18:02:15.471Z

[tool_result] === .skip/.only in new tests ===
none found
=== toBeDefined stubs ===
src/__tests__/ZuluWaveSchedulerEngine.projectSchedule.test.ts:0
src/__tests__/sessionDispatcher.projectSchedule.e2e.test.ts:0
=== non-ASCII in engine added region (lines 186-652) ===
grep: -P supports only unibyte and UTF-8 locales
ASCII-only
=== non-ASCII in new tests ===
grep: -P supports only unibyte and UTF-8 locales
ASCII-o
... [+3 chars truncated]

### Assistant | 2026-06-18T18:02:19.937Z

No `.skip`/`.only`/`.todo`, no `toBeDefined()` stubs. The grep `-P` warns about locale but the engine and tests are ASCII (the `--` em-dash-like sequences in comments are ASCII double-hyphens, consistent with the surrounding file). Let me confirm the action-count anti-regression and verify the empirical R9 hardness by mutation-testing one key assertion (would removing the convergence guard / would a double-dispatch break the no-dup assertion). Let me first confirm the action count increased, then do a quick mutation probe.

### Assistant | 2026-06-18T18:02:22.435Z

[tool_use: Bash]

### User | 2026-06-18T18:02:28.788Z

[tool_result] === HEAD action count ===
405
=== working action count ===
407
=== new actions in case statements ===
4050:          case "project_governed_schedule": {
4058:          case "project_schedule_render": {

### Assistant | 2026-06-18T18:02:35.461Z

Action count went 405 → 407 (+2, anti-regression satisfied). Both new actions are in the z.enum list (confirmed in diff) AND have case statements. Now a quick mutation probe to confirm the no-double-dispatch assertion and the drains/stalled logic are R9-hard, not tautological. I'll temporarily break `projectGovernedSchedule` (re-add already-dispatched ids by NOT merging) and confirm the happy test fails.

### Assistant | 2026-06-18T18:02:39.331Z

[tool_use: Bash]

### User | 2026-06-18T18:02:45.452Z

[tool_result] === MUTATION 1 (drains flipped on done): expect HAPPY+OVERFLOW+MINIMAL+render fail ===
     ✓ FAIL-CLOSED: an empty souls map authorizes nothing -> the whole DAG stalls (drains:false, 0 dispatched) 0ms
     × OVERFLOW DRAINS: 3 parallel leaves at max_parallel=1 fully drain over 3 single-dispatch waves (overflow re-offered, never lost) 1ms
     × MINIMAL: a single authorized subtask drains in exact
... [+298 chars truncated]

### Assistant | 2026-06-18T18:02:49.246Z

The mutation flipped `drains` and 4 tests failed (HAPPY, OVERFLOW, MINIMAL, render-distinguishes). The tests are R9-hard — they fail on a real regression. Let me run one more mutation to confirm the no-double-dispatch + stalled assertions catch the merge/governance-stall regression.

### Assistant | 2026-06-18T18:02:53.372Z

[tool_use: Bash]

### User | 2026-06-18T18:03:00.088Z

[tool_result] === MUTATION 2 (never detect zero-dispatch stall): expect GOVERNANCE STALL + FAIL-CLOSED + render-STALLED to fail ===
     ✓ GOVERNANCE STALL: a refuse_list veto mid-chain dispatches the earlier subtask, then STALLS the vetoed one + its dependents 1ms
     × FAIL-CLOSED: an empty souls map authorizes nothing -> the whole DAG stalls (drains:false, 0 dispatched) 4ms
     ✓ renderProjectedSchedule di
... [+375 chars truncated]

### Assistant | 2026-06-18T18:03:12.400Z

Interesting — MUTATION 2 only failed FAIL-CLOSED, not GOVERNANCE STALL. This is because when `if(false)` disables the early break, the convergence guard at line 624-627 still catches the not-yet-dispatched remainder and populates `stalled` correctly for the GOVERNANCE STALL case (a→dispatched, b vetoed, c blocked → the loop runs `maxIters` then the guard sets `stalled=["b","c"]`, `drains` stays false). So GOVERNANCE STALL passes via the backstop. FAIL-CLOSED fails because with 0 dispatched, `gov.done` is never true and the guard catches it — wait, it failed, meaning the mutation broke it. The point is proven: the backstop convergence guard (line 624-627) is a genuine R12 safety net that the GOVERNANCE STALL test indirectly exercises, and FAIL-CLOSED is hard against the stall-detection regression.

The tests are real and R9-hard. Let me address the final review concerns: the second-order question (vetoed re-appears every wave until stall) and confirm the engine reuses primitives rather than re-implementing. Let me trace the GOVERNANCE STALL case behavior on the vetoed re-appearance concern.

Looking at the engine code (lines 596-619): in a governance stall, `governedNextWave` is called each iteration. For the chain a→b→c with b vetoed: iter 0 dispatches `a`, iter 1 has `b` ready but vetoed (wave_assignments empty) → the `length === 0` branch fires immediately and breaks, building `stalled` from `gov.blocked` (`c`) + `gov.vetoed` (`b`). So the loop breaks on the FIRST zero-dispatch wave — the vetoed subtask does NOT re-appear in "every wave until stall"; it appears once, then the loop terminates. The second-order concern in the prompt is not actually triggered for the projection (it short-circuits on first zero-dispatch). This is correct, non-noisy behavior.

Let me do a final confirmation that the build typechecks (no TS regression from the `never` casts matching the sibling pattern).

### Assistant | 2026-06-18T18:03:14.183Z

[tool_use: Bash]

### User | 2026-06-18T18:04:24.539Z

[tool_result] === exit summary ===
 7: 00007FF721F70D95 v8::internal::ThreadIsolation::JitPageReference::Size+190789
 8: 00007FF7218EA30D BIO_ssl_shutdown+189
 9: 7FF8000000000000

### Assistant | 2026-06-18T18:04:30.788Z

The full `tsc` ran into a V8 crash (this is the heap-OOM the regression log documents for this large project — known infra, not related to these files; `--noEmit` over the whole project on this repo needs a heap bump). The targeted file grep returned no errors before the crash. Let me confirm the changed files are individually type-sound using the build's heap config, scoped narrowly.

### Assistant | 2026-06-18T18:04:33.778Z

[tool_use: Bash]

### User | 2026-06-18T18:06:25.624Z

[tool_result] === count of ALL errors (baseline drift check) ===
81

### Assistant | 2026-06-18T18:06:54.965Z

Zero TS errors mention any of the three changed source files. The 81 total errors are the pre-existing project baseline (the BUILD-QUALITY-PAPA tsc-cleanup track has been chipping away at this exact count for weeks per the CLAUDE.md commit log — e.g. `82->81`). These changed files introduce no new TS errors.

I have everything I need. Let me compile the verdict.

## Review Summary

I read all four files end-to-end, traced the reused primitives (`assignSubtasksToSlots`, `checkAuthority`, `evaluateDelegation`/`composeGatedAuthority`, `allWaves`, `mergeCompleted`, `governedNextWave`, `slimResponse`), ran the 11 tests (all pass), ran two mutation probes to confirm R9 hardness, confirmed the action-count anti-regression (405→407), and confirmed zero new TS errors.

### DEDUP (R8) — genuinely NEW, reuses primitives
`projectGovernedSchedule` (`ZuluWaveSchedulerEngine.ts:580-638`) does not re-implement scheduling. It calls `allWaves` (line 587) for the structural+cycle gate, loops `governedNextWave` (line 597), and merges via `mergeCompleted` (line 618). `allWaves` is topology-only ids; `governedNextWave` is ONE governed wave. Neither produced the complete governed projection + drains/stalled feasibility verdict. This is a real new capability composed from existing primitives — exactly the R8/R13 verifiable-core pattern.

### R9 test integrity — hard, not tautological
- Mutation 1 (flip `drains` on `gov.done`): 4 tests failed (HAPPY, OVERFLOW, MINIMAL, render-distinguishes).
- Mutation 2 (disable zero-dispatch stall detection): FAIL-CLOSED failed; GOVERNANCE STALL survived only because the line 624-627 convergence backstop catches it — itself a genuine R12 net.
- The no-double-dispatch assertion (`new Set(all).size === all.length`, test line 48) and exact wave membership (lines 44-46) are concrete reference-value asserts.
- CYCLE test is real (`projectGovernedSchedule` routes through `allWaves` which throws `/cycle/i`).
- The e2e is a REAL dispatcher round-trip: `captureHan
... [+3270 chars truncated]
