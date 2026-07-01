---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Review a small classifier change in PRISM (U-CLASSIFY-RESEARCH, slot:alpha). `gi"
date: "2026-06-15"
first_ts: "2026-06-15T22:29:56.414Z"
last_ts: "2026-06-15T22:31:52.142Z"
cwd: "H:\\prism"
messages: 28
user_msgs: 11
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a2cfca887e3014527.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Review a small classifier change in PRISM (U-CLASSIFY-RESEARCH, slot:alpha). `gi

> **claude-code-cli** | 2026-06-15 | 28 msgs (11 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a2cfca887e3014527.jsonl`

## Transcript

### User | 2026-06-15T22:29:56.414Z

Review a small classifier change in PRISM (U-CLASSIFY-RESEARCH, slot:alpha). `git -C H:/prism diff scripts/lib/feature-routing-graph.mjs scripts/lib/feature-routing-graph.test.mjs`. It adds high-precision keyword signals to two existing CLASS_SIGNALS entries:
- learn += research, deep research, understand how, understand the, study the, read up on
- fix += investigate, root cause, diagnose
Plus 5 new test cases. classifyRoutingClass feeds prompt-route-inject (UserPromptSubmit, every prompt) + extract-operator-prompts.

The gap it fixes: research/understand/investigate prompts hit the conf=0 'build' fallback -> no/ wrong routing guidance. The "learn" class is 18.9% of operator history.

You are weighted toward REGRESSION + class-steal risk. Verify:
1. CLASS-STEAL: do the new signals wrongly steal prompts from OTHER classes? The author claims (live-verified) "build a tool to analyze logs" stays build and they deliberately did NOT add the dual-use "analyze" to review. Check each new signal for over-breadth: could "research"/"understand the"/"investigate"/"root cause"/"diagnose"/"study the"/"read up on" appear in a legitimate build/plan/locate/domain prompt and wrongly win via the TIE_BREAK precedence (learn=index2, fix=index4 both beat build=11)? Run classifyRoutingClass live on adversarial prompts you devise (e.g. "build a research tool", "implement diagnose mode", "create a study scheduler").
2. TIE-BREAK: "find the root cause" was locate, now fix (locate+fix tie -> fix wins). Is that acceptable, or a regression? "investigate why the build is slow" was build 0.25, now fix.
3. The 5 new test cases assert taskClass + confidence>0 (R9) -- are they correct?
4. No other consumer breaks (the per-class COUNTS in operator-prompt-route-map.json are a gen-time snapshot; the hook reads live policy -- confirm the route field isn't consumed from the stale JSON in code).

Run `node --test scripts/lib/feature-routing-graph.test.mjs` if useful. Grade PASS or FAIL with P0/P1/P2 + fil
... [+14 chars truncated]

### Assistant | 2026-06-15T22:29:59.517Z

I'll review this classifier change. Let me start by reading the diff and the relevant files.

### Assistant | 2026-06-15T22:30:00.627Z

[tool_use: Bash]

### Assistant | 2026-06-15T22:30:00.975Z

[tool_use: Read]

### User | 2026-06-15T22:30:03.502Z

[tool_result] 1	// scripts/lib/feature-routing-graph.mjs
2	//
3	// FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH (slot:alpha 2026-06-15) -- the
4	// UNIFIED feature-routing decision graph. Operator directive: "build a graph for
5	// you to follow on the most token efficient way to do every tool call and every
6	// task we've ever done" + auto-invoke commands without typing them.
7	//
8	// THE GAP THIS FILLS (veri
... [+16554 chars truncated]

### User | 2026-06-15T22:30:08.921Z

[tool_result] diff --git a/scripts/lib/feature-routing-graph.mjs b/scripts/lib/feature-routing-graph.mjs
index df8b1931e0..4bfdaaae48 100644
--- a/scripts/lib/feature-routing-graph.mjs
+++ b/scripts/lib/feature-routing-graph.mjs
@@ -143,9 +143,15 @@ export const TASK_CLASS_POLICY = Object.freeze({
 const CLASS_SIGNALS = Object.freeze({
   physics: [["speed and feed"], ["feeds and speeds"], ["speed feed"], ["fee
... [+2946 chars truncated]

### Assistant | 2026-06-15T22:30:11.104Z

Let me trace the consumers and run the classifier live on adversarial prompts.

### Assistant | 2026-06-15T22:30:12.603Z

[tool_use: Grep]

### Assistant | 2026-06-15T22:30:12.941Z

[tool_use: Grep]

### User | 2026-06-15T22:30:21.914Z

[tool_result] .claude\hooks\prompt-route-inject.mjs:9:// into one of the 12 workflow routing classes (classifyRoutingClass -- reused from
.claude\hooks\prompt-route-inject.mjs:10:// feature-routing-graph) and inject the optimal ORDER OF OPERATIONS for that class
.claude\hooks\prompt-route-inject.mjs:16:// FAST + PURE: classifyRoutingClass + TASK_CLASS_POLICY are zero-I/O (no per-prompt
.claude\hooks\prompt-rout
... [+10489 chars truncated]

### User | 2026-06-15T22:30:22.683Z

[tool_result] Found 21 files
state\session-reorientation\reorientation-claude-ad9c3041.json
knowledge\memories\reference\reference_prompt_route_and_force_use_maps_2026_06_15.md
state\shared\memory-index-sidecar.json
mcp-server\data\state\settings-baseline-2026-06-15T22-22-00-638Z.json
mcp-server\data\state\settings-baseline-2026-06-15T21-52-37-646Z.json
state\shared\defer-queue.json
mcp-server\data\state\settin
... [+768 chars truncated]

### Assistant | 2026-06-15T22:30:25.015Z

Let me check the consumers' usage of the route field and run the classifier live on adversarial prompts.

### Assistant | 2026-06-15T22:30:25.562Z

[tool_use: Read]

### User | 2026-06-15T22:30:27.033Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// prompt-route-inject.mjs -- UserPromptSubmit
4	//
5	// PROMPT-ROUTE-MAP-MS0 / U-PROMPT-ROUTE-INJECT (slot:alpha 2026-06-15). Operator
6	// directive: "my future prompts should auto trigger you to look at the graph to
7	// see the order of operation you should take to complete the task effectively and
8	// perfect the first time." This is U3: on EVERY substan
... [+6131 chars truncated]

### Assistant | 2026-06-15T22:30:31.376Z

[tool_use: Bash]

### User | 2026-06-15T22:30:38.122Z

[tool_result] learn       conf=0.25  scores={"learn":1,"build":1}  <- "build a research tool"
fix         conf=0.25  scores={"fix":1,"build":1}  <- "implement diagnose mode"
build       conf=0.25  scores={"build":1}  <- "create a study scheduler"
build       conf=0.25  scores={"build":1}  <- "build a tool to analyze logs"
fix         conf=0.50  scores={"fix":2,"locate":2}  <- "find the root cause"
fix         c
... [+1314 chars truncated]

### Assistant | 2026-06-15T22:30:42.275Z

I have the key data. The most revealing case is "create a new engine to study thermal models" -> build wins (3 vs 2) because it has TWO build signals ("create" + "new engine"). But let me probe the genuine single-build-signal collision cases more, and run the test suite.

### Assistant | 2026-06-15T22:30:43.068Z

[tool_use: Bash]

### User | 2026-06-15T22:30:46.373Z

[tool_result]   ...
# Subtest: routeTaskClass: never throws on empty prompt (fail-open whole-chain)
ok 26 - routeTaskClass: never throws on empty prompt (fail-open whole-chain)
  ---
  duration_ms: 3.3495
  ...
# Subtest: buildRoutingDigest: renders the followable lines
ok 27 - buildRoutingDigest: renders the followable lines
  ---
  duration_ms: 0.1871
  ...
# Subtest: buildRoutingDigest: safe on null / partia
... [+208 chars truncated]

### Assistant | 2026-06-15T22:30:54.008Z

[tool_use: Bash]

### User | 2026-06-15T22:30:56.509Z

[tool_result] learn      score=1 tie=[learn,build]  <- "implement research mode"
fix        score=1 tie=[fix,build]  <- "create a diagnose command"
build      score=2 tie=[build]  <- "add a research feature"
fix        score=1 tie=[fix,build]  <- "wire the diagnose hook"
fix        score=2 tie=[fix]  <- "build a root cause tracer"
build      score=2 tie=[build]  <- "write a research summarizer"
learn      score
... [+396 chars truncated]

### Assistant | 2026-06-15T22:30:59.656Z

This confirms the class-steal cases. Let me verify the historical-frequency check and the route-field staleness claim, and check the locate signal precedence one more time.

### Assistant | 2026-06-15T22:31:04.859Z

[tool_use: Bash]

### User | 2026-06-15T22:31:15.211Z

[tool_result] fix      score=2 tie=[fix,locate]  <- "find the root cause"  (was locate)
fix      score=1 tie=[fix,build]  <- "investigate why the build is slow"  (was build 0.25)
locate   score=2 tie=[locate]  <- "find the file that handles diagnose"  (locate intent w/ diagnose noise)
learn    score=2 tie=[learn,locate]  <- "search for the research corpus loader"  (locate intent w/ research noise)
locate   scor
... [+86 chars truncated]

### Assistant | 2026-06-15T22:31:17.871Z

I have everything I need. Let me confirm the staleness claim — that no code consumes the `route` field from the stale JSON.

### Assistant | 2026-06-15T22:31:19.863Z

[tool_use: Bash]

### User | 2026-06-15T22:31:27.130Z

[tool_result] .claude/hooks/prompt-route-inject.mjs:60:  const c = map.classes[idx];
---route-field consumption check (should be empty above)---

### Assistant | 2026-06-15T22:31:52.142Z

The `map.classes[idx]` access at line 60 reads only `count`/`pct`/`taskClass` for the historical rank — not the `route` field. The route block is rendered from the LIVE `TASK_CLASS_POLICY` (line 117). Staleness claim confirmed: no code consumes the stale `route` field.

Now I have full verification across all four review axes.

---

VERDICT: PASS

summary: The change adds high-precision signals to existing `learn`/`fix` classes. I traced both live consumers (`prompt-route-inject.mjs`, `extract-operator-prompts.mjs`, plus `loop-goal-stack-advisor.mjs`) and ran the classifier on 37 adversarial prompts. The new signals do NOT silently steal legitimate build/plan/locate work in any realistic case, and the only class-steals are single-signal ties that resolve to a defensible class. The output is advisory injection (order-of-operations hint), never a hard gate — so even a misclassification degrades to "slightly-off guidance," not a broken build. All 28 tests pass.

findings:
- [P2] `scripts/lib/feature-routing-graph.mjs:154,167` -- CLASS-STEAL on single-keyword build prompts. `implement research mode`, `wire the diagnose hook`, `create a diagnose command`, `build investigate dashboard`, `create research notes exporter` all tie 1-1 with `build` but lose to `learn` (idx2) / `fix` (idx4) via TIE_BREAK. A prompt that is genuinely "build a thing whose NAME contains research/diagnose/investigate" gets routed to learn/fix. Trigger requires the build verb to be the ONLY build signal AND the noun to be a research/fix keyword. Mitigant (verified live): any 2nd build signal flips it back (`create a new engine to study thermal models` -> build 3>2; `add a research feature` -> build 2). Impact is bounded: the consumer only injects a non-binding order-of-operations hint, no behavior gate. -- Fix (optional): drop bare `["research"]`/`["investigate"]`/`["diagnose"]` to require a more specific phrase, or give `build` a tie-break edge when a build verb is present. Acceptable to ship as-is 
... [+2253 chars truncated]
