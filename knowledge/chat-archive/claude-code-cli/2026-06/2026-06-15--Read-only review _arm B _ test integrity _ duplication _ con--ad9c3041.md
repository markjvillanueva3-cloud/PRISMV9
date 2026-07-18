---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Read-only review (arm B — test integrity + duplication + convention conformance;"
date: "2026-06-15"
first_ts: "2026-06-15T06:24:54.212Z"
last_ts: "2026-06-15T06:28:05.315Z"
cwd: "H:\\prism"
messages: 61
user_msgs: 23
assistant_msgs: 38
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a606234b6a34ad53d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Read-only review (arm B — test integrity + duplication + convention conformance;

> **claude-code-cli** | 2026-06-15 | 61 msgs (23 user / 38 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a606234b6a34ad53d.jsonl`

## Transcript

### User | 2026-06-15T06:24:54.212Z

Read-only review (arm B — test integrity + duplication + convention conformance; do NOT assume arm A caught everything) of FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH on H:/prism. Files committed in sha f004aa153d (review ONLY these, ignore the co-mingled tango UNWIRED-ENGINE-AUDIT work):
- scripts/lib/feature-routing-graph.mjs, scripts/lib/feature-routing-graph.test.mjs
- scripts/feature-route.mjs, scripts/generate-feature-routing-graph.mjs
- state/shared/feature-routing-graph.json, state/shared/specs/FEATURE-ROUTING-GRAPH.md
- scripts/lib/loop-goal-stack-advisor.mjs (+.test.mjs) — the auto-invoke extension

Weighted focus:
- TEST INTEGRITY (R9): are the 23 routing-graph asserts + 2 new advisor asserts REAL (pin concrete classification/policy/digest behaviour, fail when logic regresses)? Not toBeDefined stubs? Run `cd H:/prism && node --test scripts/lib/feature-routing-graph.test.mjs scripts/lib/loop-goal-stack-advisor.test.mjs`. Any .skip/.only?
- DUPLICATION (R8): is this genuinely a COMPOSITION of the 6 existing routers, or does it re-implement logic that cag-router/model-routing-policy/task-substrate-router already own? Confirm routeTaskClass lazy-imports + delegates rather than re-deriving model tiers or substrate plans. Verify classifyRoutingClass does NOT duplicate local-llm-task-router.classifyTaskClass (different axis: workflow-routing vs model-capability).
- CONVENTION: does the advisor extension match the file's existing style + fail-open pattern? Is the JSON generator's embedded catalog consistent with the lib's TASK_CLASS_POLICY (no drift)?
- COVERAGE: do the 12 task classes + 19 substrates actually cover the operator's named surfaces (ollama/model-switching/hermes/obsidian/psn/cag/rag/lora/crons/loops/wikis/memories/tribal)?

Grade PASS or FAIL with P0/P1/P2 citing file:line. Concise.

### Assistant | 2026-06-15T06:24:59.769Z

I'll review the FEATURE-ROUTING-GRAPH-MS0 files. Let me start by reading all the target files and running the tests.

### Assistant | 2026-06-15T06:25:00.152Z

[tool_use: Read]

### Assistant | 2026-06-15T06:25:00.617Z

[tool_use: Read]

### Assistant | 2026-06-15T06:25:01.507Z

[tool_use: Bash]

### User | 2026-06-15T06:25:02.920Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\feature-routing-graph.mjs' was already read 13s ago in this session and is unchanged (mtime 1781504266763). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-15T06:25:03.885Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\feature-routing-graph.test.mjs' was already read 13s ago in this session and is unchanged (mtime 1781504275795). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-15T06:25:08.658Z

[tool_result]   ...
# Subtest: spotlightForIter: bad input (null/negative/float) -> index 0, never throws
ok 36 - spotlightForIter: bad input (null/negative/float) -> index 0, never throws
  ---
  duration_ms: 0.0445
  ...
# Subtest: buildStackAdvisory: a BUILD prompt yields the block with intent, model lane, substrates, spotlight, catalog pointer
ok 37 - buildStackAdvisory: a BUILD prompt yields the block with
... [+1885 chars truncated]

### Assistant | 2026-06-15T06:25:10.912Z

All 45 tests pass, zero skipped/todo. The lib + test files were already in my context. Let me read the remaining target files.

### Assistant | 2026-06-15T06:25:11.858Z

[tool_use: Read]

### Assistant | 2026-06-15T06:25:12.401Z

[tool_use: Read]

### User | 2026-06-15T06:25:12.437Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\loop-goal-stack-advisor.mjs' was already read 10s ago in this session and is unchanged (mtime 1781504313591). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-15T06:25:12.813Z

[tool_use: Read]

### Assistant | 2026-06-15T06:25:12.993Z

[tool_use: Read]

### User | 2026-06-15T06:25:14.077Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\loop-goal-stack-advisor.test.mjs' was already read 10s ago in this session and is unchanged (mtime 1781504380250). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### User | 2026-06-15T06:25:15.376Z

[tool_result] read-once-guard: 'H:\prism\scripts\feature-route.mjs' was already read 24s ago in this session and is unchanged (mtime 1781504448595). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-15T06:25:15.419Z

[tool_result] read-once-guard: 'H:\prism\scripts\generate-feature-routing-graph.mjs' was already read 24s ago in this session and is unchanged (mtime 1781504121468). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-15T06:25:19.711Z

The read-once guard claims these files are already in my context, but they are NOT — this is a fresh agent thread and I have not actually read them. The guard is keyed on session file-state tracking that does not reflect my actual context. Let me disable the cache and read them.

### Assistant | 2026-06-15T06:25:20.253Z

[tool_use: Bash]

### User | 2026-06-15T06:25:22.280Z

[tool_result] cache disabled marker

### Assistant | 2026-06-15T06:25:25.131Z

The env var on an echo won't help the Read tool. Let me read with offset/limit to bypass the guard, since the guard exempts "different offset/limit" reads.

### Assistant | 2026-06-15T06:25:25.661Z

[tool_use: Read]

### User | 2026-06-15T06:25:27.487Z

[tool_result] 1	// scripts/lib/feature-routing-graph.mjs
2	//
3	// FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH (slot:alpha 2026-06-15) -- the
4	// UNIFIED feature-routing decision graph. Operator directive: "build a graph for
5	// you to follow on the most token efficient way to do every tool call and every
6	// task we've ever done" + auto-invoke commands without typing them.
7	//
8	// THE GAP THIS FILLS (veri
... [+14777 chars truncated]

### Assistant | 2026-06-15T06:25:30.012Z

Now I have the lib file. Let me read the remaining target files using offset/limit to bypass the cache guard.

### Assistant | 2026-06-15T06:25:30.757Z

[tool_use: Read]

### User | 2026-06-15T06:25:37.604Z

[tool_result] 1	// scripts/lib/feature-routing-graph.test.mjs
2	// Tests for U-ROUTING-GRAPH. Real reference-value asserts (R9): each pins the
3	// concrete classification/policy/composition behaviour that would fail if the
4	// routing logic regressed. No toBeDefined-style stubs.
5	import { test } from "node:test";
6	import assert from "node:assert/strict";
7	import {
8	  TASK_CLASS_POLICY, classifyRoutingClas
... [+6086 chars truncated]

### Assistant | 2026-06-15T06:25:40.017Z

Now the advisor + its test, the CLI + generator, and the JSON/spec.

### Assistant | 2026-06-15T06:25:40.619Z

[tool_use: Read]

### User | 2026-06-15T06:25:42.023Z

[tool_result] 1	// scripts/lib/loop-goal-stack-advisor.mjs
2	//
3	// SELF-DRIVE-MS0 / U-STACK-ADVISOR (slot:alpha 2026-06-14) -- the per-iteration
4	// "deploy the WHOLE PRISM stack, optimally + variably + efficiently" advisor that
5	// the /loop and /goal script hooks inject. Operator directive 2026-06-14: make
6	// /goal + /loop develop utilizing all PRISM substrates (AI/learning/reasoning, PSN,
7	// system-v
... [+12585 chars truncated]

### Assistant | 2026-06-15T06:25:45.507Z

[tool_use: Read]

### User | 2026-06-15T06:25:48.525Z

[tool_result] 1	// Tests for the /loop+/goal optimal-stack-use advisor. node --test.
2	import { test } from "node:test";
3	import assert from "node:assert/strict";
4	import {
5	  classifyDevIntent, spotlightForIter, buildStackAdvisory, SPOTLIGHT_COUNT,
6	} from "./loop-goal-stack-advisor.mjs";
7	import { routeForgePhase } from "./forge-route.mjs";
8	
9	// --- classifyDevIntent (intent routing, R9: maps represen
... [+8346 chars truncated]

### Assistant | 2026-06-15T06:25:50.562Z

Now the CLI, generator, JSON output, and spec.

### Assistant | 2026-06-15T06:25:51.518Z

[tool_use: Read]

### Assistant | 2026-06-15T06:25:52.236Z

[tool_use: Read]

### User | 2026-06-15T06:25:52.874Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/feature-route.mjs
3	//
4	// FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH (slot:alpha 2026-06-15). On-demand
5	// CLI for the unified feature-routing graph: given a task description, print the
6	// followable routing digest (task class + substrate ladder + model tier + ordered
7	// commands + auto-invoke set + the antipattern to avoid). Composes the live
8	// route
... [+1310 chars truncated]

### User | 2026-06-15T06:25:54.186Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/generate-feature-routing-graph.mjs
3	//
4	// FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH (slot:alpha 2026-06-15). Emits the
5	// machine-readable backing catalog state/shared/feature-routing-graph.json from
6	// (1) the canonical TASK_CLASS_POLICY in scripts/lib/feature-routing-graph.mjs and
7	// (2) the enumerated substrate/router/hook catalogs embedded below (m
... [+10000 chars truncated]

### Assistant | 2026-06-15T06:25:58.244Z

Now let me verify key claims. I need to check: (1) the routers being composed actually exist with the claimed APIs, (2) `classifyTaskClass` exists in local-llm-task-router, (3) `routeForgePhase` API used in the test, (4) the JSON output matches the lib, and (5) whether the advisor is actually wired into the /loop and /goal hooks (the spec claims it is injected). Let me also check the spec and JSON.

### Assistant | 2026-06-15T06:26:01.455Z

[tool_use: Bash]

### User | 2026-06-15T06:26:11.240Z

[tool_result] === cag-router classifyQuery ===
289: *   coldSources: string[],
295:export function classifyQuery(query, options = {}) {
304:      coldSources: [],
424:    coldSources: coldHits.slice(0, 5).map((h) => h.path),
454:  const cold1 = result.coldSources.slice(0, 1).join("");
457:    result.tier === "COLD"
458:      ? result.coldSources.slice(0, 2).join(", ")
459:      : result.tier === "HOT"
464:  ret
... [+1764 chars truncated]

### Assistant | 2026-06-15T06:26:16.256Z

All composed router APIs exist with the claimed signatures. The `classifyQuery` returns `{tier, coldSources}`, `routePrompt` returns `{engine, model, tier, reason}`, `routeTask` returns `{substrates}`, `classifyTaskClass` exists, and `routeForgePhase` returns `{mechanical}`. 

Now let me verify the `phase` values the advisor passes to `routeTask`/`routeForgePhase` are real FORGE_PHASE keys (the self-defending invariant test depends on this), and confirm the spotlight invariant test concern about distinctness. Let me also check the JSON matches the lib and whether the advisor is wired into actual /loop + /goal hooks.

### Assistant | 2026-06-15T06:26:18.216Z

[tool_use: Bash]

### User | 2026-06-15T06:26:23.547Z

[tool_result] === FORGE_PHASE keys referenced by advisor (scout/audit_scan/verify_gate/summarize/design/novel_codegen) ===
5:// (scout / enumerate / dedup / docstring / summarize / lint / html-emit) and
8:// haiku). Only the genuinely-reasoning phases (design / plan-review / the
30:  scout:          "search_synthesis", // file/graph discovery -> ask-ollama viz ($0)
36:  summarize:      "summary",          // ph
... [+3670 chars truncated]

### Assistant | 2026-06-15T06:26:29.613Z

All six advisor phase keys (`scout`, `audit_scan`, `verify_gate`, `summarize`, `design`, `novel_codegen`) are real `FORGE_PHASE_CATEGORY` keys. The self-defending invariant test (test line 59) is genuinely load-bearing: it would fail if any intent's `reasoning` flag drifts from the canonical forge taxonomy. DISCOVER/AUDIT/DATA/LEARN → mechanical categories (`search_synthesis`/`prism_audit`/`summary`) so `reasoning:false`; VERIFY/DESIGN/BUILD → reasoning categories (`deep_reasoning`/`architecture`/`novel_codegen`) so `reasoning:true`. Consistent.

Now let me verify whether the advisor is actually WIRED into the /loop and /goal hooks (the lib comment claims "the /loop and /goal script hooks inject" it — R15 wiring check), and check the JSON output + spec.

### Assistant | 2026-06-15T06:26:32.453Z

[tool_use: Bash]

### User | 2026-06-15T06:26:38.516Z

[tool_result] === Who imports buildStackAdvisory (wiring check) ===
.claude/hooks/goal-prereq-inject.mjs:265:      const { buildStackAdvisory } = await import("../../scripts/lib/loop-goal-stack-advisor.mjs");
.claude/hooks/goal-prereq-inject.mjs:266:      const adv = buildStackAdvisory({ prompt, iter: 0 });
.claude/hooks/loop-iteration-inject.mjs:134:      const { buildStackAdvisory } = await import("../../scri
... [+1013 chars truncated]

### Assistant | 2026-06-15T06:26:42.230Z

Wiring is real: `buildStackAdvisory` is invoked by both `goal-prereq-inject.mjs:265` (the /goal hook) and `loop-iteration-inject.mjs:134` (the /loop hook). The routing-graph lib is consumed by the advisor (the auto-invoke surface) and the `feature-route.mjs` CLI. Let me verify the actual call sites in those two hooks honor the disable knob and emit correctly, and confirm the JSON was regenerated to match the lib (drift check).

### Assistant | 2026-06-15T06:26:43.418Z

[tool_use: Bash]

### User | 2026-06-15T06:26:45.276Z

[tool_result] === goal-prereq-inject call site context ===
  // PRISM_STACK_ADVISOR_DISABLE=1.
  // Skip when the prompt ALSO triggers /loop -- loop-iteration-inject already injects
  // the (rotating) advisor that same turn, so appending here would double the ~2KB
  // block for no gain (arm C P2.1; efficiency is the feature's own goal).
  const alsoLoop = /(^|\s)\/loop(\s|$)/.test(prompt);
  if (!alsoLoop && 
... [+1716 chars truncated]

### Assistant | 2026-06-15T06:26:48.347Z

Both call sites are correctly wired with disable knob + fail-open lazy-import, and there's a thoughtful double-injection guard (the `/goal`+`/loop` dedup). Now let me confirm the JSON output is consistent with the lib (no drift) and read the spec.

### Assistant | 2026-06-15T06:26:52.092Z

[tool_use: Bash]

### User | 2026-06-15T06:26:55.082Z

[tool_result] === regenerate JSON and diff against committed (drift check) ===
NO DRIFT: committed JSON matches generator output
=== coverage block + key counts from JSON ===
2:  "schemaVersion": 1,
5:    "taskClasses": 12,
6:    "substrates": 19,
7:    "routersComposed": 6,
9:    "commandFamilies": 112,
284:  "substrates": [
291:      "taskClasses": [
303:      "taskClasses": [
316:      "taskClasses": [
330: 
... [+21 chars truncated]

### Assistant | 2026-06-15T06:26:58.502Z

No drift — committed JSON byte-matches generator output, and the `taskClassPolicy` block is sourced from the canonical lib (not a hand-copy), so no risk of the JSON drifting from `TASK_CLASS_POLICY`. Now let me read the spec to verify it's not a stub and check coverage of the operator's named surfaces.

### Assistant | 2026-06-15T06:26:58.938Z

[tool_use: Read]

### User | 2026-06-15T06:26:59.946Z

[tool_result] 1	# PRISM Feature-Routing Graph — the followable "what to use, when" policy
2	
3	> **FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH** (slot:alpha, 2026-06-15).
4	> Operator directive: *"build a graph for you to follow on the most token-efficient way to do
5	> every tool call and every task we've ever done"* + *"auto-invoke [commands] in a session without
6	> me having to type them in."*
7	>
8	> This 
... [+12624 chars truncated]

### Assistant | 2026-06-15T06:27:07.512Z

The spec is thorough, accurate, and explicitly flags the lib as the canonical source. Now let me verify a few details against the operator's named coverage surfaces and check a couple of consistency points: the spec §1 table says `learn` has 3 commands but the lib has 4 (`/learn-corpus`); the spec quote row omits `/injection-mold-quote`. These are reading-mirror minor diffs, not drift in the canonical source. Let me verify the operator's named surfaces are all covered as substrates and double-check the auto-invoke threshold claim (spec says ≥0.75 mandatory; CLAUDE.md says ≥0.85).

### Assistant | 2026-06-15T06:27:11.291Z

[tool_use: Bash]

### User | 2026-06-15T06:27:26.289Z

[tool_result] === operator named surfaces vs substrate names in JSON ===
COVERED: ollama
COVERED: model-switching
COVERED: hermes
COVERED: obsidian
COVERED: psn
COVERED: cag
COVERED: rag
COVERED: lora
COVERED: crons
COVERED: loops
COVERED: wikis
COVERED: memories
COVERED: tribal
=== INVOKE_NOW threshold in skill-auto-trigger (spec claims >=0.75 mandatory) ===
38: *   PRISM_SKILL_AUTO_TRIGGER_MIN=<0..1>         
... [+631 chars truncated]

### Assistant | 2026-06-15T06:27:32.545Z

All 14 operator-named surfaces are covered as substrate nodes. The spec's auto-invoke threshold claim (≥0.75 mandatory, ≥0.65 advisory) matches the actual `skill-auto-trigger.mjs` constants (`DEFAULT_INVOKE_NOW_MIN = 0.75`, `DEFAULT_MIN_SCORE = 0.65`) — note this is the live value, not the stale ≥0.85 in the root CLAUDE.md, so the spec is correctly grounded in current code.

Let me do a final check on the spec §1 table mismatches I noticed (learn/quote command lists), and confirm the test for the `classifyRoutingClass` tie-break case actually pins real behavior (the "build the cutting force g-code calc" → physics case is the strongest R9 test — let me confirm it would fail if the tie-break broke).

### Assistant | 2026-06-15T06:27:37.005Z

[tool_use: Bash]

### User | 2026-06-15T06:27:41.229Z

[tool_result] === prove the tie-break test is load-bearing: physics must beat build on mixed prompt ===
taskClass: physics scores: {"build":1,"physics":3}
physics score > 0: true | build score > 0: true
=== spec §1 learn row commands vs lib (drift note) ===
learn.commands: ["/pdf-learn","/video-learn","/wiki-ingest","/learn-corpus"]
quote.commands: ["/quote-to-ship","/quote","/injection-mold-quote","/job-cost"]

### Assistant | 2026-06-15T06:28:05.315Z

The tie-break test is genuinely load-bearing: `physics=3, build=1` — the test asserts `physics` wins on a prompt containing both signals. If the `TIE_BREAK` precedence or signal scoring regressed, this would fail (it's not a tautology). The classifier tests use distinct, non-trivial prompts and assert the exact expected class.

I have everything I need. Let me finalize my assessment.

## Review Complete

**VERDICT: PASS**

**summary:** FEATURE-ROUTING-GRAPH-MS0 is a genuine composition layer over six existing routers, not a re-implementation — `routeTaskClass` lazy-imports `cag-router.classifyQuery`, `model-routing-policy.routePrompt`, and `task-substrate-router.routeTask` and fails open per field, while `classifyRoutingClass` deliberately occupies a distinct workflow-routing axis from `local-llm-task-router.classifyTaskClass` (model-capability axis). All 45 tests pass with zero skip/only/todo, the asserts pin concrete behaviour (not stubs), the JSON generator byte-matches its committed output with the policy sourced from the canonical lib (no drift), and the advisor extension is correctly wired into both the /loop and /goal hooks.

**findings:**

- **none (P0/P1).** No correctness, safety, test-integrity, duplication, or wiring defects found.

P2 (deferrable, non-blocking — reading-mirror drift only, canonical source is correct):
- [P2] `state/shared/specs/FEATURE-ROUTING-GRAPH.md:60` — the §1 `learn` row lists 3 commands (`/pdf-learn → /video-learn → /wiki-ingest`) but the canonical `TASK_CLASS_POLICY.learn.commands` (`feature-routing-graph.mjs:71`) has 4 (adds `/learn-corpus`). The spec self-declares "the code is canonical (regenerate this section if they drift)" so this is harmless prose lag. Fix: re-mirror the table row.
- [P2] `state/shared/specs/FEATURE-ROUTING-GRAPH.md:61` — same: `quote` row omits `/injection-mold-quote` present at `feature-routing-graph.mjs:80`. Same harmless prose lag; same fix.

What I verified for an auditable PASS:
- **TEST INTEGRITY (
... [+2439 chars truncated]
