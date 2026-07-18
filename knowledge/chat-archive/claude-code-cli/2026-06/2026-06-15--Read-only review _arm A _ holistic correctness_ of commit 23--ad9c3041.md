---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Read-only review (arm A — holistic correctness) of commit 23e4499e9d on H:/prism"
date: "2026-06-15"
first_ts: "2026-06-15T15:04:58.607Z"
last_ts: "2026-06-15T15:08:26.924Z"
cwd: "H:\\prism"
messages: 43
user_msgs: 17
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a82e0313d8116308d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Read-only review (arm A — holistic correctness) of commit 23e4499e9d on H:/prism

> **claude-code-cli** | 2026-06-15 | 43 msgs (17 user / 26 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a82e0313d8116308d.jsonl`

## Transcript

### User | 2026-06-15T15:04:58.607Z

Read-only review (arm A — holistic correctness) of commit 23e4499e9d on H:/prism (PROMPT-ROUTE-MAP-MS0/U-PROMPT-ROUTE). Diff: `git -C H:/prism show 23e4499e9d`.

Files:
1. scripts/extract-operator-prompts.mjs — streaming extractor over all 613 session transcripts (~7.8GB). Pulls genuine human prompts (string-content user turns, not tool_results/hook blocks), classifies via classifyRoutingClass (from feature-routing-graph.mjs), dedups, writes operator-prompt-corpus.jsonl + operator-prompt-route-map.json.
2. scripts/extract-operator-prompts.test.mjs — 14 tests.
3. .claude/hooks/prompt-route-inject.mjs — UserPromptSubmit hook, WIRED in settings.json (C:+H:). On every substantive prompt: classify via classifyRoutingClass, inject the order-of-operations from TASK_CLASS_POLICY + the historical frequency rank from operator-prompt-route-map.json.
4. .claude/hooks/prompt-route-inject.test.mjs — 10 tests.
5. state/shared/operator-prompt-route-map.json — the generated digest (4870 distinct prompts; build 39.7%, learn 18.9%, ...).

Run: `cd H:/prism && node --test scripts/extract-operator-prompts.test.mjs .claude/hooks/prompt-route-inject.test.mjs` (expect 24/24). Live-smoke: `echo '{"prompt":"build a new engine and wire it"}' | node .claude/hooks/prompt-route-inject.mjs` (expect a ROUTE block naming class build #1).

CRITICAL (hot path — fires on EVERY prompt fleet-wide): verify the hook is (a) FAST — pure classify, no per-prompt cag/model/substrate router calls or heavy reads; (b) FAIL-SOFT — any fault emits {continue:true}, never breaks a prompt; (c) BUDGET-aware — compact output + throttled (PRISM_PROMPT_ROUTE_THROTTLE_MS) so /loop bursts don't repeat; (d) the dynamic import of feature-routing-graph uses pathToFileURL (Windows-safe). Also: is the extractor genuinely cap-safe (streams, never readFileSync a 7.8GB-class transcript whole)? Does it correctly distinguish human prompts from tool_results?

Grade PASS or FAIL with P0/P1/P2 citing file:line. Concise.

### Assistant | 2026-06-15T15:05:02.350Z

I'll review commit 23e4499e9d. Let me start by reading the diff and the files end to end.

### Assistant | 2026-06-15T15:05:03.353Z

[tool_use: Bash]

### Assistant | 2026-06-15T15:05:03.787Z

[tool_use: Read]

### Assistant | 2026-06-15T15:05:04.220Z

[tool_use: Read]

### User | 2026-06-15T15:05:06.905Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/extract-operator-prompts.mjs
3	//
4	// PROMPT-ROUTE-MAP-MS0 / U-PROMPT-EXTRACT (slot:alpha 2026-06-15). Operator
5	// directive: "read through every single session we've ever had. read ALL my
6	// prompts and commands. update the graph to account for every single prompt and
7	// command I've ever made so we map out a direct route to complete my future
8	// prompt
... [+9491 chars truncated]

### User | 2026-06-15T15:05:06.907Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// prompt-route-inject.mjs -- UserPromptSubmit
4	//
5	// PROMPT-ROUTE-MAP-MS0 / U-PROMPT-ROUTE-INJECT (slot:alpha 2026-06-15). Operator
6	// directive: "my future prompts should auto trigger you to look at the graph to
7	// see the order of operation you should take to complete the task effectively and
8	// perfect the first time." This is U3: on EVERY substan
... [+5847 chars truncated]

### User | 2026-06-15T15:05:08.861Z

[tool_result] commit 23e4499e9db664c5d9a628b2fd7ae71524714ac4
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 15 10:04:30 2026 -0500

    [MAIN-FORCE] [PROMPT-ROUTE-MAP-MS0]/U-PROMPT-ROUTE (slot:alpha): mine ALL 613 sessions -> per-prompt route auto-trigger. Streamed every transcript (7.8GB, 16301 raw -> 4870 distinct human prompts+commands), classified via classifyRoutingClass: buil
... [+885 chars truncated]

### Assistant | 2026-06-15T15:05:12.476Z

Now let me read the test files and the dependency (feature-routing-graph.mjs) to verify the contracts the hook and extractor depend on.

### Assistant | 2026-06-15T15:05:12.969Z

[tool_use: Read]

### Assistant | 2026-06-15T15:05:13.909Z

[tool_use: Read]

### Assistant | 2026-06-15T15:05:13.969Z

[tool_use: Read]

### User | 2026-06-15T15:05:16.080Z

[tool_result] 1	// prompt-route-inject.test.mjs
2	// Tests for U-PROMPT-ROUTE-INJECT pure functions. Real reference-value asserts (R9).
3	import { test } from "node:test";
4	import assert from "node:assert/strict";
5	import { humanCore, rankFor, renderRouteBlock } from "./prompt-route-inject.mjs";
6	
7	const POLICY = {
8	  substrateLadder: ["master-graph", "obsidian", "claude"],
9	  modelTier: "opus",
10	  comm
... [+3004 chars truncated]

### User | 2026-06-15T15:05:17.280Z

[tool_result] 1	// scripts/extract-operator-prompts.test.mjs
2	// Tests for U-PROMPT-EXTRACT pure functions. Real reference-value asserts (R9):
3	// each pins the exact extraction/classification/aggregation behaviour.
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	import { extractPrompt, parsePromptText, normalizePrompt, buildRouteMap } from "./extract-operator-prompts.mjs";
7	
... [+4809 chars truncated]

### User | 2026-06-15T15:05:17.330Z

[tool_result] 1	// scripts/lib/feature-routing-graph.mjs
2	//
3	// FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH (slot:alpha 2026-06-15) -- the
4	// UNIFIED feature-routing decision graph. Operator directive: "build a graph for
5	// you to follow on the most token efficient way to do every tool call and every
6	// task we've ever done" + auto-invoke commands without typing them.
7	//
8	// THE GAP THIS FILLS (veri
... [+15780 chars truncated]

### Assistant | 2026-06-15T15:05:20.628Z

Now let me verify the wiring in settings.json, check the generated map's shape matches what `rankFor` expects, and run the tests plus the live smoke.

### Assistant | 2026-06-15T15:05:22.992Z

[tool_use: Bash]

### Assistant | 2026-06-15T15:05:23.497Z

[tool_use: Bash]

### User | 2026-06-15T15:05:27.532Z

[tool_result] ---H settings---
1545:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/prompt-route-inject.mjs",
---C settings---
1545:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/prompt-route-inject.mjs",

### User | 2026-06-15T15:05:27.863Z

[tool_result] {
  "schemaVersion": 1,
  "generatedNote": "U-PROMPT-EXTRACT. Genuine human prompts+commands across ALL session transcripts, deduped, classified by feature-routing-graph.classifyRoutingClass. Route per class = TASK_CLASS_POLICY.",
  "transcripts": 613,
  "rawPromptsSeen": 16301,
  "distinctPrompts": 4870,
  "total": 4870,
  "classes": [
    {
      "taskClass": "build",
      "count": 1932,
      
... [+800 chars truncated]

### Assistant | 2026-06-15T15:05:31.054Z

The map shape matches `rankFor` (`map.classes[].taskClass/count/pct` + `map.total`). Now let me check the wiring context (event type + ordering), confirm `.gitignore` entries, run the tests, and the live smoke.

### Assistant | 2026-06-15T15:05:32.001Z

[tool_use: Bash]

### Assistant | 2026-06-15T15:05:32.901Z

[tool_use: Bash]

### User | 2026-06-15T15:05:50.558Z

[tool_result]             "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/psn-prompt-checklist-inject.mjs",
            "timeout": 2000
          },
          {
            "type": "command",
            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/mcp-broadcast-reconnect-inject.mjs",
            "timeout": 3000
          },
          {
            "type": "command",
 
... [+600 chars truncated]

### User | 2026-06-15T15:05:50.576Z

[tool_result] commit 23e4499e9db664c5d9a628b2fd7ae71524714ac4
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 15 10:04:30 2026 -0500

    [MAIN-FORCE] [PROMPT-ROUTE-MAP-MS0]/U-PROMPT-ROUTE (slot:alpha): mine ALL 613 sessions -> per-prompt route auto-trigger. Streamed every transcript (7.8GB, 16301 raw -> 4870 distinct human prompts+commands), classified via classifyRoutingClass: buil
... [+973 chars truncated]

### Assistant | 2026-06-15T15:05:53.881Z

Confirmed: hook wired under UserPromptSubmit (event `hookSpecificOutput.hookEventName: "UserPromptSubmit"` matches), timeout 3000ms, and the large regenerable corpus jsonl is gitignored while the digest is committed. Now run the tests and live smoke.

### Assistant | 2026-06-15T15:05:55.308Z

[tool_use: Bash]

### Assistant | 2026-06-15T15:05:55.917Z

[tool_use: Bash]

### User | 2026-06-15T15:06:08.819Z

[tool_result]   ...
# Subtest: buildRouteMap: empty input -> total 0, classes still present
ok 23 - buildRouteMap: empty input -> total 0, classes still present
  ---
  duration_ms: 0.0897
  ...
# Subtest: buildRouteMap: caps examples per class
ok 24 - buildRouteMap: caps examples per class
  ---
  duration_ms: 0.1711
  ...
1..24
# tests 24
# suites 0
# pass 24
# fail 0
# cancelled 0
# skipped 0
# todo 0
# dura
... [+15 chars truncated]

### User | 2026-06-15T15:06:25.766Z

[tool_result] {"continue":true}

### Assistant | 2026-06-15T15:06:28.830Z

The live smoke returned `{"continue":true}` (no route block) instead of the expected ROUTE block. This is the throttle suppressing it from a prior run. Let me verify by clearing the throttle state and checking the fail-soft paths.

### Assistant | 2026-06-15T15:06:30.473Z

[tool_use: Bash]

### User | 2026-06-15T15:06:42.454Z

[tool_result] {"route:build":1781535697686}---
{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"## ROUTE -- task class: build -- your #1 most-common task type (1932x, 39.7% of history)\nDo it in THIS order (cheapest rung first; Claude is last):\n  1. substrates: dedup-check -> master-graph -> wiki -> obsidian -> claude\n  2. model: opus for design+novel code; sonnet for known mecha
... [+302 chars truncated]

### Assistant | 2026-06-15T15:06:46.858Z

The route block emits correctly once the throttle is cleared (confirming the earlier `{"continue:true}` was the legitimate throttle behavior, not a fault). The throttle is keyed per task-class with a 5-min window — exactly the budget-aware design the prompt asked for. Let me verify the remaining critical claims: extractor cap-safety (streaming), the dynamic-import pathToFileURL, and check for any edge case in the extractor's tool_result detection and the throttle's fail-open.

### Assistant | 2026-06-15T15:06:50.600Z

[tool_use: Bash]

### User | 2026-06-15T15:06:58.187Z

[tool_result] === fail-soft: malformed stdin ===
{"continue":true}

=== fail-soft: empty stdin ===
{"continue":true}

=== disabled ===
{"continue":true}

=== trivial prompt (below MIN_PROMPT_CHARS) ===
{"continue":true}

=== bad PRISM_ROOT (import fault) ===
{"continue":true}

### Assistant | 2026-06-15T15:07:03.228Z

All fail-soft paths emit `{"continue":true}` and never break the prompt, including the dynamic-import fault path (bad PRISM_ROOT). Note the bad-PRISM_ROOT case: the throttle file from the prior successful build run would still be present, but the import fault returns before the throttle is even consulted — so it's a genuine import-fault fail-open, not throttle masking. Let me confirm the extractor's streaming/cap-safety and verify there is no `readFileSync` of a transcript, plus confirm the `extractPrompt` tool_result discrimination is sound against real transcript shapes.

### Assistant | 2026-06-15T15:07:09.142Z

[tool_use: Bash]

### User | 2026-06-15T15:07:47.054Z

[tool_result] === readFileSync usage in extractor (expect none on transcripts) ===
12:// by line (NEVER readFileSync a whole transcript -- they exceed V8's 512MiB string
27:import readline from "node:readline";
141:  try { stream = fs.createReadStream(filePath, { encoding: "utf8" }); } catch { return; }
142:  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

=== verify a real transcr
... [+223 chars truncated]

### Assistant | 2026-06-15T15:07:54.331Z

This confirms the critical design points against live data:

- **Cap-safe streaming**: extractor reads transcripts exclusively via `fs.createReadStream` + `readline` (line 141-142). The only `readFileSync` references are the comment (line 12) and the hook's small JSON files (map/throttle, not transcripts).
- **tool_result discrimination is empirically correct**: in a real 4000-line sample, 94 user turns carried array content (tool_results) vs 2 string content (genuine human turns). The `typeof c !== "string"` guard at `extract-operator-prompts.mjs:50` correctly rejects all 94 array-content tool_results, keeping only the 2 string-content human prompts. This is the exact distinction the prompt asked me to verify.

Let me do one final check on a potential edge case I noticed — the hook's `humanCore` for a tool-result-shaped prompt (array content can't reach the hook since `payload.prompt` is a string from UserPromptSubmit, but I'll confirm the `<command-args>`-empty path and the throttle directory-creation race), and the extractor's `extractPrompt` on the array-content path that the hook never sees.

### Assistant | 2026-06-15T15:07:59.636Z

[tool_use: Bash]

### User | 2026-06-15T15:08:03.028Z

[tool_result] === hook: command-args path live ===
## ROUTE -- task class: fix -- your #3 most-common task type (521x, 10.7% of history)

=== throttle file after that run ===
{"route:build":1781535999635,"route:fix":1781536081747}
=== prompt with no classifier signal (confidence 0 path) ===
{"continue":true}

### Assistant | 2026-06-15T15:08:26.924Z

All paths verified. The `<command-args>` directive correctly routes to class `fix` (the args "fix the broken regression test" classify correctly, not the command ceremony), the throttle persists per-class, and a no-signal prompt ("the quick brown fox") falls back to `build` with confidence 0 — wait, let me confirm that last case: it returned `{"continue":true}`. The classifier returns `build`/confidence 0 for no-signal, and the hook gates on `confidence <= 0` at line 109, so it stays silent. Correct.

I have everything needed. Final assessment.

---

VERDICT: PASS

summary: Commit 23e4499e9d (PROMPT-ROUTE-MAP-MS0/U-PROMPT-ROUTE) is clean and well-engineered. The hot-path hook is fast (pure classify, lazy single import, two small JSON reads), fail-soft on every fault path (malformed/empty stdin, import fault, disabled, trivial, no-signal — all emit `{"continue":true}`), budget-aware (per-class 5-min throttle + `MIN_PROMPT_CHARS` gate + compact output), and Windows-safe (`pathToFileURL` for the dynamic import). The extractor is genuinely cap-safe (streaming `createReadStream`+`readline` only, zero `readFileSync` of transcripts) and correctly distinguishes human prompts from tool_results, verified empirically on a live transcript (2 string-content human turns vs 94 array-content tool_results rejected). 24/24 tests pass, live smoke produces the expected build-class ROUTE block, and the hook is wired under UserPromptSubmit in both C: and H: settings.json.

findings:
  - [P2] `H:/prism/.claude/hooks/prompt-route-inject.mjs:108` — the hook re-runs the pure `classifyRoutingClass` per prompt, but the dependency `feature-routing-graph.mjs:184-203` re-builds `scores` over all 12 classes via `Object.entries` + `text.includes` on every call. This is microsecond-cheap and not a real hot-path concern, but if the signal table ever grows large, consider memoizing the compiled phrase list at module load. Deferrable; no action needed now.
  - [P2] `H:/prism/scripts/extract-operator-pr
... [+2020 chars truncated]
