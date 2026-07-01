---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Independent second-pass review of an additive edit to a LIVE every-prompt PRISM "
date: "2026-06-16"
first_ts: "2026-06-16T20:16:37.445Z"
last_ts: "2026-06-16T20:20:40.717Z"
cwd: "H:\\prism"
messages: 38
user_msgs: 13
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a1b3cb30782eaf24c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Independent second-pass review of an additive edit to a LIVE every-prompt PRISM 

> **claude-code-cli** | 2026-06-16 | 38 msgs (13 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a1b3cb30782eaf24c.jsonl`

## Transcript

### User | 2026-06-16T20:16:37.445Z

Independent second-pass review of an additive edit to a LIVE every-prompt PRISM hook (high blast radius across a 26-chat fleet). Grade PASS or FAIL with P0/P1/P2 + file:line.

FILE: H:\prism\.claude\hooks\prompt-route-inject.mjs (read the whole file).

CHANGE (U-LOOP-CRON-POLICY): a new pure exported `renderLoopCronLine(loopCron)` and an optional 5th param `showLoopCron=true` on `renderRouteBlock`, gated in main() by `process.env.PRISM_LOOP_CRON_INJECT !== "0"`. The line surfaces per-class /loop + cron escalation guidance from `policy.loopCron`, only when worthwhile.

This file was already reviewed + PASSED earlier this session for the U-SLASH-PLANS wiring (renderClassCommandsLine + classPlan 4th param). Focus on whether the NEW loopCron change is safe ON TOP of that:
1. BACKWARD COMPAT: the existing 3-arg and 4-arg renderRouteBlock callers (the test + any other) must be unaffected. With showLoopCron defaulting true, a policy WITHOUT a loopCron field must still produce no extra line (renderLoopCronLine(undefined) -> null). Confirm.
2. Every code path still emits VALID JSON on the every-prompt path; the change cannot introduce a throw (renderLoopCronLine must be total over null/undefined/partial input).
3. ASCII-only injected text (the rendered line uses the doctrine strings from policy.loopCron; confirm those are ASCII -- no em-dash). PS 5.1 decoding concern.
4. The knob PRISM_LOOP_CRON_INJECT=0 must fully suppress the line; confirm the env read is in main() (not impure inside the pure render fn).
5. Ordering/coupling: the loopCron line is appended after the class-commands line and before the footer -- confirm no interaction with the throttle, the humanCore gate, or the slash-plan read.
6. Convention conformance with the surrounding pure-fn + JSDoc style.

Observed: 21/21 tests pass; E2E shows a 'build' prompt renders 'loop/cron: LOOP yes -- ...' and a 'locate' (one-shot) prompt renders NO loop/cron line; knob-off suppresses it. Hunt for the regression/silent-breaka
... [+33 chars truncated]

### Assistant | 2026-06-16T20:16:43.144Z

I'll review the file end-to-end, focusing on the new loopCron change on top of the already-passed U-SLASH-PLANS wiring.

### Assistant | 2026-06-16T20:16:43.254Z

[tool_use: Read]

### User | 2026-06-16T20:16:43.990Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\prompt-route-inject.mjs' was already read 13s ago in this session and is unchanged (mtime 1781640734890). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-16T20:16:46.796Z

The file is already in my context from 13s ago. Let me work from that content and verify the specific claims with targeted searches rather than re-reading.

### Assistant | 2026-06-16T20:16:48.545Z

[tool_use: Grep]

### User | 2026-06-16T20:17:02.109Z

[tool_result] 75:export function renderClassCommandsLine(taskClass, classPlan, policyCommands = [], maxCmds = 6) {
76:  if (!Array.isArray(classPlan) || classPlan.length === 0) return null;
80:  for (const c of classPlan) {                    // already sorted by confidence desc
87:  return `  +${classPlan.length} ${taskClass}-class commands -- more: ${more} | full when/how: node scripts/build-slash-command-pla
... [+885 chars truncated]

### Assistant | 2026-06-16T20:17:04.946Z

Let me read the full body of `renderLoopCronLine`, `renderRouteBlock`, and the relevant `main()` section to verify totality, ordering, and ASCII content.

### Assistant | 2026-06-16T20:17:05.715Z

[tool_use: Read]

### User | 2026-06-16T20:17:09.859Z

[tool_result] 88	}
89	
90	/**
91	 * Pure: a compact loop/cron escalation line for this class (U-LOOP-CRON-POLICY).
92	 * Shown ONLY when a /loop or a recurring cron is actually worthwhile (the policy
93	 * value starts with "yes"), so one-shot classes (locate/plan/recall/quote/physics/
94	 * review) stay silent. Returns null otherwise. Directly serves the operator's
95	 * "harnessed loops/crons to keep looping 
... [+3173 chars truncated]

### Assistant | 2026-06-16T20:17:14.303Z

I have the full file content from the earlier read plus the targeted views. Let me verify the surrounding `main()` plumbing (emit path, how the block flows to JSON output) and that `policy.loopCron` exists in the policy source, since the rendered strings come from there.

### Assistant | 2026-06-16T20:17:14.963Z

[tool_use: Read]

### User | 2026-06-16T20:17:23.798Z

[tool_result] 157	    const m = await import(pathToFileURL(path.join(PRISM, "scripts/lib/feature-routing-graph.mjs")).href);
158	    classifyRoutingClass = m.classifyRoutingClass;
159	    TASK_CLASS_POLICY = m.TASK_CLASS_POLICY;
160	  } catch { return emit(null); }
161	
162	  const { taskClass, confidence } = classifyRoutingClass(core);
163	  if (!taskClass || confidence <= 0) return emit(null);   // no signal 
... [+731 chars truncated]

### Assistant | 2026-06-16T20:17:31.255Z

Now let me check the `emit` helper and the policy source for `loopCron` field shape and ASCII content (the rendered strings come from `policy.loopCron`).

### Assistant | 2026-06-16T20:17:31.617Z

[tool_use: Read]

### User | 2026-06-16T20:17:40.334Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// prompt-route-inject.mjs -- UserPromptSubmit
4	//
5	// PROMPT-ROUTE-MAP-MS0 / U-PROMPT-ROUTE-INJECT (slot:alpha 2026-06-15). Operator
6	// directive: "my future prompts should auto trigger you to look at the graph to
7	// see the order of operation you should take to complete the task effectively and
8	// perfect the first time." This is U3: on EVERY substan
... [+3768 chars truncated]

### Assistant | 2026-06-16T20:17:43.733Z

Now I have the complete picture of the hook file. Let me verify the policy source (`feature-routing-graph.mjs`) to confirm `loopCron` field shape and ASCII content, since the rendered line interpolates `policy.loopCron.loop` and `.cron` directly.

### Assistant | 2026-06-16T20:17:44.887Z

[tool_use: Grep]

### User | 2026-06-16T20:17:51.743Z

[tool_result] 38-    antipattern: "Grep/Glob before hitting the master-index (route-before-grep)",
39:    loopCron: { loop: "no -- one-shot lookup", cron: "no" },
40-  },
--
48-    antipattern: "building before /dedup (DuplicationGuard) or shipping a stub/partial",
49:    loopCron: { loop: "yes -- multi-unit roadmap pass: one unit/iter, eval-gate=tests+per-file scrutiny per unit (R15)", cron: "no -- attended bu
... [+2166 chars truncated]

### Assistant | 2026-06-16T20:17:55.447Z

I now have everything needed to verify all six points. The `loopCron` field is present on all policy entries, and the strings are the source of the rendered text. Let me confirm those doctrine strings are ASCII-only (the concern is em-dashes — they use `--` which is ASCII). Let me scan for any non-ASCII byte in those loopCron lines specifically.

### Assistant | 2026-06-16T20:17:56.868Z

[tool_use: Bash]

### User | 2026-06-16T20:18:10.325Z

[tool_result] ALL-ASCII: no non-ASCII bytes in any loopCron line

### Assistant | 2026-06-16T20:18:13.782Z

Also confirm the rendered line in the hook itself (`renderLoopCronLine` literal text) and the JSDoc are ASCII-only, and there are no other `renderRouteBlock` callers beyond main() and the test.

### Assistant | 2026-06-16T20:18:16.317Z

[tool_use: Bash]

### User | 2026-06-16T20:18:37.798Z

[tool_result] === non-ASCII bytes in the hook (lines 88-130) ===
ALL-ASCII in render fns + JSDoc
=== all renderRouteBlock call sites repo-wide ===
.claude/hooks/prompt-route-inject.mjs:109:export function renderRouteBlock(taskClass, policy, rank, classPlan, showLoopCron = true) {
.claude/hooks/prompt-route-inject.mjs:170:  const block = renderRouteBlock(taskClass, TASK_CLASS_POLICY[taskClass], rankFor(map, task
... [+2412 chars truncated]

### Assistant | 2026-06-16T20:18:41.527Z

All call sites confirmed. Let me verify the test's `POLICY` fixture (used by the 3-arg/4-arg backward-compat tests) has NO `loopCron` field, which is the crux of the backward-compat claim (a policy without loopCron + showLoopCron default-true must produce no extra line).

### Assistant | 2026-06-16T20:18:42.748Z

[tool_use: Read]

### User | 2026-06-16T20:18:47.027Z

[tool_result] 40	});
41	
42	// ---- rankFor ---------------------------------------------------------------
43	test("rankFor: returns rank/count/pct for a present class", () => {
44	  assert.deepEqual(rankFor(MAP, "build"), { rank: 1, count: 40, pct: 40, total: 100 });
45	  assert.deepEqual(rankFor(MAP, "fix"), { rank: 3, count: 11, pct: 11, total: 100 });
46	});
47	test("rankFor: absent class or null map -> nu
... [+5310 chars truncated]

### Assistant | 2026-06-16T20:18:49.447Z

Let me see the `POLICY` test fixture definition (top of the test file) to confirm it has no `loopCron` field, and check the live-policy completeness invariant at line 134+.

### Assistant | 2026-06-16T20:18:50.690Z

[tool_use: Read]

### User | 2026-06-16T20:18:52.189Z

[tool_result] 1	// prompt-route-inject.test.mjs
2	// Tests for U-PROMPT-ROUTE-INJECT pure functions. Real reference-value asserts (R9).
3	import { test } from "node:test";
4	import assert from "node:assert/strict";
5	import { humanCore, rankFor, renderRouteBlock, renderClassCommandsLine, renderLoopCronLine } from "./prompt-route-inject.mjs";
6	import { TASK_CLASS_POLICY, taskClasses } from "../../scripts/lib/fe
... [+1472 chars truncated]

### Assistant | 2026-06-16T20:18:55.318Z

I now have full verification of every claim. Let me also confirm the live-policy completeness invariant test (line 134+) to ensure the live `TASK_CLASS_POLICY` is exercised, and that the test file actually runs the loopCron assertions against live data.

### Assistant | 2026-06-16T20:18:56.062Z

[tool_use: Read]

### User | 2026-06-16T20:18:59.705Z

[tool_result] 134	// ---- live TASK_CLASS_POLICY completeness invariant -------------------------
135	test("TASK_CLASS_POLICY: every class carries a loopCron {loop, cron} (U-LOOP-CRON-POLICY coverage)", () => {
136	  const classes = taskClasses();
137	  assert.ok(classes.length >= 12);
138	  for (const cls of classes) {
139	    const lc = TASK_CLASS_POLICY[cls].loopCron;
140	    assert.ok(lc && typeof lc.loop =
... [+190 chars truncated]

### Assistant | 2026-06-16T20:19:03.220Z

I have verified every point end-to-end. Final verification: confirm the tests actually pass on the current code (the observed 21/21 claim).

### Assistant | 2026-06-16T20:19:11.388Z

[tool_use: Bash]

### User | 2026-06-16T20:20:20.125Z

[tool_result] # tests 21
# suites 0
# pass 21
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 586.3105

### Assistant | 2026-06-16T20:20:40.717Z

All 21 tests pass. I have verified every reviewed point against the actual code.

VERDICT: PASS

summary: The U-LOOP-CRON-POLICY change (new pure `renderLoopCronLine` + optional 5th `showLoopCron=true` param) is a clean, additive, backward-compatible edit on top of the U-SLASH-PLANS wiring. The render fn is total over null/undefined/partial input, the line is fully gated and suppressible, all injected text is ASCII, and the knob read is correctly placed in `main()` (impurity-free render fn). All 21 tests pass on the live code.

findings: none

Audit trail of what I verified:

1. BACKWARD COMPAT — VERIFIED. `renderLoopCronLine(undefined)` and `(null)` both hit the `if (!loopCron) return null` guard at `H:\prism\.claude\hooks\prompt-route-inject.mjs:98`. In `renderRouteBlock` (`:124-126`), even with `showLoopCron` defaulting `true`, a policy with no `loopCron` field calls `renderLoopCronLine(undefined)` → `null` → `if (lcLine)` is false → no line pushed. The test `POLICY` fixture (`prompt-route-inject.test.mjs:8-14`) has NO `loopCron` field, and the 3-arg/4-arg backward-compat tests (`:55,64,69,72,101,103`) plus the explicit `:131` assert (`no loopCron field` → no `loop/cron`) confirm prior callers are unaffected. All other `renderRouteBlock` call sites repo-wide are only `main()` (`:170`) and the test file — confirmed via grep.

2. VALID JSON / NO THROW — VERIFIED. `renderLoopCronLine` is total: the `!loopCron` guard catches null/undefined; `loopCron.loop || ""` and `loopCron.cron || ""` (`:99-100`) coerce missing/non-string fields safely before the `/^yes/i` test; `parts.join` is always defined. No path throws. `emit()` (`:43-46`) always stringifies a valid object, and `main()` is wrapped in `.catch()` (`:175`) that prints `{continue:true}`.

3. ASCII-ONLY — VERIFIED. The render-fn region (`:88-130`) and JSDoc have zero non-ASCII bytes (grep `[^\x00-\x7F]` returned none). The doctrine strings sourced from `policy.loopCron` in `scripts/lib/feature-routing-graph.mjs:3
... [+1633 chars truncated]
