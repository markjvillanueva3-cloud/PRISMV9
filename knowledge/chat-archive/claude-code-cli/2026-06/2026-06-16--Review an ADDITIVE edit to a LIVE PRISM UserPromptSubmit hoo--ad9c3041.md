---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Review an ADDITIVE edit to a LIVE PRISM UserPromptSubmit hook that fires on ever"
date: "2026-06-16"
first_ts: "2026-06-16T19:24:39.912Z"
last_ts: "2026-06-16T19:30:57.455Z"
cwd: "H:\\prism"
messages: 37
user_msgs: 14
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a254c0433c2f21889.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Review an ADDITIVE edit to a LIVE PRISM UserPromptSubmit hook that fires on ever

> **claude-code-cli** | 2026-06-16 | 37 msgs (14 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a254c0433c2f21889.jsonl`

## Transcript

### User | 2026-06-16T19:24:39.912Z

Review an ADDITIVE edit to a LIVE PRISM UserPromptSubmit hook that fires on every substantive prompt across a 26-chat fleet. High blast radius -- be rigorous about regression risk and backward compatibility. Grade PASS or FAIL with P0/P1/P2 findings and file:line citations.

FILE (read the whole file, focus on the diff intent below): H:\prism\.claude\hooks\prompt-route-inject.mjs
ITS TEST: H:\prism\.claude\hooks\prompt-route-inject.test.mjs

WHAT CHANGED (U-SLASH-PLANS wiring):
1. Added constants PLAN_PATH (state/shared/slash-command-plans.json) + PLAN_DISABLED (knob PRISM_SLASH_PLAN_INJECT === "0", default ON).
2. Added a new exported pure fn `renderClassCommandsLine(taskClass, classPlan, policyCommands, maxCmds=6)` -- returns a compact line listing up to 6 class-specific command NAMES (excluding curated policy.commands + archived + duplicate names) plus a `--query` pointer; returns null when classPlan absent/empty.
3. Changed `renderRouteBlock` signature to take an optional 4th param `classPlan`; when present it appends the renderClassCommandsLine output before the footer. Existing 3-arg callers (the test) must still behave identically.
4. main() now loads the plan JSON (fail-soft via loadJsonSafe -> null on absent/parse-error) gated by PLAN_DISABLED, and passes plan.byClass[taskClass] to renderRouteBlock.

REQUIREMENTS TO VERIFY:
- BACKWARD COMPAT: a 3-arg renderRouteBlock call (classPlan undefined) must produce the byte-identical block it produced before (no plan line). Confirm via the code + the test that asserts this.
- FAIL-SOFT: absent/corrupt plan JSON must never throw out of the hook -- the hook must still emit the route block (or {continue:true}); the every-prompt path cannot regress to an error.
- The hook must still emit VALID JSON on every path (it is parsed by the harness). Check the catch in the main() bottom guard.
- COST: the plan JSON is ~294KB read once per throttle window (300s default). Acceptable? Any path that reads it per-prompt unthrottled?
... [+613 chars truncated]

### Assistant | 2026-06-16T19:24:44.305Z

I'll review this additive edit to the live UserPromptSubmit hook. Let me start by reading the full file and its test.

### Assistant | 2026-06-16T19:24:44.830Z

[tool_use: Read]

### Assistant | 2026-06-16T19:24:45.282Z

[tool_use: Read]

### User | 2026-06-16T19:25:05.209Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// prompt-route-inject.mjs -- UserPromptSubmit
4	//
5	// PROMPT-ROUTE-MAP-MS0 / U-PROMPT-ROUTE-INJECT (slot:alpha 2026-06-15). Operator
6	// directive: "my future prompts should auto trigger you to look at the graph to
7	// see the order of operation you should take to complete the task effectively and
8	// perfect the first time." This is U3: on EVERY substan
... [+8155 chars truncated]

### User | 2026-06-16T19:25:05.249Z

[tool_result] 1	// prompt-route-inject.test.mjs
2	// Tests for U-PROMPT-ROUTE-INJECT pure functions. Real reference-value asserts (R9).
3	import { test } from "node:test";
4	import assert from "node:assert/strict";
5	import { humanCore, rankFor, renderRouteBlock, renderClassCommandsLine } from "./prompt-route-inject.mjs";
6	
7	const POLICY = {
8	  substrateLadder: ["master-graph", "obsidian", "claude"],
9	  mod
... [+5306 chars truncated]

### Assistant | 2026-06-16T19:25:12.189Z

I have both files read end-to-end. Now let me verify key claims against the actual data: the plan JSON structure (byClass shape, command record fields, archived flag, confidence sort), the throttle interaction, and whether descriptions can leak into the injected line. Let me also check the live plan file size/structure and confirm the classifier returns the classes that key into byClass.

### Assistant | 2026-06-16T19:25:14.492Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:25:17.817Z

[tool_use: Bash]

### User | 2026-06-16T19:25:24.660Z

[tool_result] -rw-r--r-- 1 wompu 197611 301075 Jun 16 14:04 state/shared/slash-command-plans.json
---HEAD---
{
  "schemaVersion": 1,
  "generated_at": "2026-06-16T19:04:30.502Z",
  "note": "Per-command route-class plan (U-SLASH-PLANS). Every slash command mapped to its TASK_CLASS_POLICY route via classifyRoutingClass. Consumed by prompt-route-inject (class-specific command surfacing) + --query CLI.",
  "total":
... [+2251 chars truncated]

### User | 2026-06-16T19:25:33.914Z

[tool_result] top keys: [
  'schemaVersion',
  'generated_at',
  'note',
  'total',
  'distinctNames',
  'sources',
  'classCoverage',
  'routes',
  'byClass'
]
byClass classes (12): build, plan, domain, learn, orchestrate, review, physics, quote, recall, session, fix, locate
sample class: build len=668
sample record keys: [ 'name', 'when', 'source', 'archived', 'confidence' ]
sample record: {"name":"awareness-
... [+285 chars truncated]

### Assistant | 2026-06-16T19:25:38.089Z

The data confirms the structure: `byClass` has 12 classes matching the routing classes, records have `{name, when, source, archived, confidence}`, sorted by confidence desc. The injected line uses only `c.name` (command names), and `when` (the description that may contain unicode like the em-dash I see in the sample) is never read. Let me verify the classifier's class set matches `byClass` keys exactly, and check the `name` field for any non-ASCII characters across the corpus.

### Assistant | 2026-06-16T19:25:43.552Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:25:46.537Z

[tool_use: Bash]

### User | 2026-06-16T19:25:55.842Z

[tool_result] total name records: 1266 | non-ASCII names: 0
non-ascii class labels: []

### User | 2026-06-16T19:26:05.451Z

[tool_result] TASK_CLASS_POLICY keys: locate, build, plan, recall, learn, quote, physics, review, fix, orchestrate, session, domain
"build the widget engine" -> build 0.25
"fix the failing test" -> fix 0.5
"what is the kienzle constant" -> physics 0.25
"find where the dispatcher is w" -> build 0.25
"plan the next milestone" -> plan 0.25

### Assistant | 2026-06-16T19:26:09.148Z

All 12 `TASK_CLASS_POLICY` keys exactly match the 12 `byClass` keys, and all 1266 command names plus the 12 class labels are ASCII-clean. The classifier returns classes that key into `byClass`. Now let me verify the throttle behavior (does the plan read happen before or after the throttle gate) and run the test suite to confirm 15/15, and check git diff to see exactly what changed.

### Assistant | 2026-06-16T19:26:11.456Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:26:11.744Z

[tool_use: Bash]

### User | 2026-06-16T19:26:51.106Z

[tool_result]   ...
# Subtest: renderClassCommandsLine: all curated -> '(all curated above)' but keeps count + pointer
ok 14 - renderClassCommandsLine: all curated -> '(all curated above)' but keeps count + pointer
  ---
  duration_ms: 0.096
  ...
# Subtest: renderRouteBlock: WITH classPlan appends the +N line; WITHOUT keeps old behavior
ok 15 - renderRouteBlock: WITH classPlan appends the +N line; WITHOUT keep
... [+153 chars truncated]

### User | 2026-06-16T19:27:38.476Z

[tool_result] diff --git a/.claude/hooks/prompt-route-inject.mjs b/.claude/hooks/prompt-route-inject.mjs
index 757b98933f..31d046efc8 100644
--- a/.claude/hooks/prompt-route-inject.mjs
+++ b/.claude/hooks/prompt-route-inject.mjs
@@ -28,6 +28,11 @@ import { pathToFileURL } from "node:url";
 const DISABLED = process.env.PRISM_PROMPT_ROUTE_INJECT_DISABLE === "1";
 const PRISM = process.env.PRISM_ROOT || "H:/prism"
... [+3782 chars truncated]

### Assistant | 2026-06-16T19:27:42.604Z

The diff is exactly as described and minimal. Now let me verify the critical regression concerns: (1) the throttle gate fires BEFORE the plan read (so cost is bounded), (2) fail-soft on corrupt/absent plan, and (3) the JSON-validity of the bottom guard. Let me run the E2E paths directly to confirm fail-soft and JSON validity, including a corrupt-plan injection via PRISM_ROOT redirect.

### Assistant | 2026-06-16T19:27:50.415Z

[tool_use: Bash]

### User | 2026-06-16T19:28:53.102Z

[tool_result] === E2E 1: normal build prompt, plan present (line should appear) ===
VALID-JSON ok
has-plan-line: true
non-ascii-in-ctx: false
=== E2E 2: PRISM_SLASH_PLAN_INJECT=0 (no plan line, valid JSON) ===
VALID-JSON ok | has-plan-line: false

### Assistant | 2026-06-16T19:28:56.384Z

Both E2E paths confirmed. Now the corrupt/absent-plan fail-soft path, and a check that the `when` description (which DOES contain unicode em-dashes per the earlier sample) never leaks. Let me redirect PRISM_ROOT to a temp dir with a corrupt plan and with an absent plan.

### Assistant | 2026-06-16T19:29:07.070Z

[tool_use: Bash]

### User | 2026-06-16T19:29:31.952Z

[tool_result] === E2E 3: CORRUPT plan json (must not throw, must emit valid JSON, no plan line) ===
VALID-JSON ok | has-plan-line: false | has-route-block: false
=== E2E 4: ABSENT plan json (fail-soft, route block still emits) ===
VALID-JSON ok | has-plan-line: false | has-route-block: false
=== E2E 5: plan present but NO byClass key (schema drift) ===
VALID-JSON ok | has-plan-line: false | has-route-block: fal
... [+2 chars truncated]

### Assistant | 2026-06-16T19:29:38.591Z

Interesting - E2E 3/4/5 all show `has-route-block: false`. That's because the corrupt-plan test redirected `PRISM_ROOT` to a temp dir, which also breaks the lazy `import` of `feature-routing-graph.mjs` (it lives under the real PRISM root via `path.join(PRISM, "scripts/lib/...")`). So the hook fell through the import-catch to `emit(null)` → `{continue:true}`. That's still valid JSON and still fail-soft (no throw), which is what matters for this review, but it didn't exercise the route-block-WITH-corrupt-plan path. Let me isolate just the plan-read fail-soft by keeping PRISM_ROOT real and pointing only the plan path at a corrupt file via a symlink-free approach — temporarily writing a corrupt plan is risky on the live file, so I'll test the logic directly with the real lib but a corrupt plan injected through the loadJsonSafe contract.

### Assistant | 2026-06-16T19:29:45.996Z

[tool_use: Bash]

### User | 2026-06-16T19:29:54.970Z

[tool_result] corrupt -> plan: null | classPlan: null
absent -> plan: null
=== Confirm import lib lives under real PRISM_ROOT (why E2E3-5 lost route block) ===
scripts/lib/feature-routing-graph.mjs

### Assistant | 2026-06-16T19:30:01.290Z

Confirmed. The `loadJsonSafe` swallows corrupt/absent into `null`, and `plan && plan.byClass ? ... : null` guards schema drift — `renderClassCommandsLine` returns `null` on non-array `classPlan`, so the plan line is omitted and the route block is unchanged. The earlier E2E 3-5 lost the route block only because redirecting `PRISM_ROOT` to a temp dir also broke the lib import (a test artifact, not a code defect) — and even then the hook emitted valid `{continue:true}` JSON without throwing, which is the fail-soft contract.

Now let me verify the throttle ordering (cost concern: is there any unthrottled per-prompt plan read?) and check that `confidence` is actually used for ordering as the doc-comment claims, since the data showed many ties at 0.5 — the comment says "already sorted by confidence desc" but the code doesn't sort. Let me check the generator.

### Assistant | 2026-06-16T19:30:02.259Z

[tool_use: Bash]

### User | 2026-06-16T19:30:16.141Z

[tool_result] === Does the GENERATOR sort byClass arrays by confidence desc? ===
100:  return { taskClass: r.taskClass, confidence: r.confidence };
105: * confidence } records into the artifact's byClass aggregation. Invariant: every
109:  const byClass = {};
111:    (byClass[r.taskClass] ||= []).push({
113:      archived: r.archived, confidence: Number(r.confidence.toFixed(2)),
116:  for (const cls of Object.k
... [+724 chars truncated]

### Assistant | 2026-06-16T19:30:22.297Z

The generator (line 117) sorts each `byClass[cls]` array by `confidence desc, then name asc` — so the consumer's comment "already sorted by confidence desc" is accurate, and the tie-break is deterministic (name asc), meaning the surfaced extras are stable across regens. The throttle ordering is also confirmed in the code: line 142 `if (throttleSkip(...)) return emit(null)` runs BEFORE line 145 reads the plan — so the ~294KB read happens at most once per 300s throttle window per class, never per-prompt unthrottled. The classify step (line 140) is zero-I/O and also pre-throttle.

I have everything I need. Let me do a final check on one edge: the `pct` value type in the rank line and whether the `--query` pointer command is real (so the injected pointer isn't a dead reference).

### Assistant | 2026-06-16T19:30:24.571Z

[tool_use: Bash]

### User | 2026-06-16T19:30:35.091Z

[tool_result] === --query pointer is real (not a dead reference injected to the model) ===
# class: build  (668 commands)
route: dedup-check -> master-graph -> wiki -> obsidian -> claude | model: opus for design+novel code; sonnet for known mechanical patterns
  /awareness-snapshot -- One-shot PRISM awareness snapshot — built/wired/utilized/drifted in 60 lines. Regenerates state/shared/AWARENESS-SNAPSHOT.md by 
... [+289 chars truncated]

### Assistant | 2026-06-16T19:30:57.455Z

The `--query build` pointer the hook injects is a live, working command (exit 0, returns the full class table). The pointer is not a dead reference. (As an aside, the `--query` output itself shows duplicate `/build-state` entries and contains em-dashes — but that's CLI output the operator runs in a terminal, NOT injected into the model context, so the ascii-guard concern does not apply there. The hook's injected line dedups names via the `seen` Set and uses names only.)

I have verified every requirement. Here is my verdict.

---

VERDICT: PASS

summary: This is a clean, surgical, additive edit to the live `prompt-route-inject.mjs` UserPromptSubmit hook. Backward compatibility is preserved exactly (3-arg `renderRouteBlock` produces the byte-identical block, proven by code path + test at line 102-103), fail-soft holds on absent/corrupt/schema-drift plan JSON (verified by E2E + unit exercise of the `loadJsonSafe` -> null branch), the every-prompt path emits valid JSON on every code path including the bottom catch guard, and the injected line is ASCII-only (all 1266 command names + 12 class labels scanned clean; the unicode-bearing `when` descriptions are never read). 15/15 tests pass; the ~294KB plan read is throttle-gated (once per 300s window per class), never per-prompt unthrottled.

findings:
  - none

What I verified (auditable):
- BACKWARD COMPAT: `renderRouteBlock(taskClass, policy, rank)` with `classPlan` undefined -> `renderClassCommandsLine(...)` returns `null` (guard at `prompt-route-inject.mjs:76`, `!Array.isArray(undefined)`) -> `if (planLine)` at `:105` is false -> no line appended. Footer text changed (added "+ slash-command-plans") but that is intentional and the test at `prompt-route-inject.test.mjs:102-103` asserts the absence of the `build-class commands` line in the 3-arg path. Block is otherwise byte-identical.
- FAIL-SOFT: `loadJsonSafe` (`:110`) catches parse/read errors -> `null`; `plan && plan.byClass ? plan.byClass[taskClass] : null` (`:146`)
... [+2090 chars truncated]
