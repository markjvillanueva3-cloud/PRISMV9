---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Read-only review (arm C — silent breakage / regression / hot-path safety; do NOT"
date: "2026-06-15"
first_ts: "2026-06-15T15:05:21.551Z"
last_ts: "2026-06-15T15:09:00.972Z"
cwd: "H:\\prism"
messages: 45
user_msgs: 18
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-ace808cb2881af9f9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Read-only review (arm C — silent breakage / regression / hot-path safety; do NOT

> **claude-code-cli** | 2026-06-15 | 45 msgs (18 user / 27 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-ace808cb2881af9f9.jsonl`

## Transcript

### User | 2026-06-15T15:05:21.551Z

Read-only review (arm C — silent breakage / regression / hot-path safety; do NOT assume arms A or B caught everything) of commit 23e4499e9d on H:/prism (PROMPT-ROUTE-MAP-MS0). Diff: `git -C H:/prism show 23e4499e9d`.

Files: scripts/extract-operator-prompts.mjs, .claude/hooks/prompt-route-inject.mjs (+ both .test.mjs), state/shared/operator-prompt-route-map.json.

Hunt specifically for:
- HOT-PATH SAFETY: prompt-route-inject.mjs runs on EVERY UserPromptSubmit. (1) Can it EVER throw out of main and break a prompt submission? Trace every path: stdin read, JSON.parse, dynamic import, classifyRoutingClass, throttle file read/write, map read. Confirm each is try/caught or fail-open and the top-level main().catch emits {continue:true}. (2) Latency: the dynamic import of feature-routing-graph on EVERY prompt — is the module cached by Node's import cache across calls within a process, or re-imported (the hook is a fresh process per fire, so it imports once per fire — is feature-routing-graph cheap to load? It lazy-imports cag/model/substrate only inside routeTaskClass, which the hook does NOT call — confirm classifyRoutingClass + TASK_CLASS_POLICY load with zero heavy I/O).
- THROTTLE CORRECTNESS: the throttle file is shared across all chats (tmpdir). Could a race between two chats corrupt it or wrongly suppress? Is it fail-open?
- EXTRACTOR ROBUSTNESS: streamTranscript on a torn/huge line — readline handles line-splitting, but a single 512MB+ JSON line (a giant tool_result) — does the `line.includes('"type":"user"')` pre-filter + JSON.parse-in-try avoid OOM? Could fs.writeSync to the corpus fd fail mid-run and corrupt? Is the openSync/closeSync fd leak-safe if streamTranscript throws?
- The `await import(pathToFileURL(...).href)` — correct on Windows? Confirm.
- Any way operator-prompt-route-map.json drifts from the live TASK_CLASS_POLICY (it embeds the policy at generation time)?

Grade PASS or FAIL with P0/P1/P2 citing file:line. Concise.

### Assistant | 2026-06-15T15:05:26.247Z

I'll review commit 23e4499e9d focusing on hot-path safety, throttle correctness, extractor robustness, and the specific concerns raised.

### Assistant | 2026-06-15T15:05:27.196Z

[tool_use: Bash]

### Assistant | 2026-06-15T15:05:27.679Z

[tool_use: Read]

### Assistant | 2026-06-15T15:05:27.804Z

[tool_use: Read]

### User | 2026-06-15T15:05:28.275Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### User | 2026-06-15T15:05:28.415Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\prompt-route-inject.mjs' was already read 24s ago in this session and is unchanged (mtime 1781535681298). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-15T15:05:28.496Z

[tool_result] read-once-guard: 'H:\prism\scripts\extract-operator-prompts.mjs' was already read 24s ago in this session and is unchanged (mtime 1781535357695). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-15T15:05:31.426Z

Both files are already in my context. Let me read the test files and the generated map, plus the feature-routing-graph module that gets dynamically imported.

### Assistant | 2026-06-15T15:05:31.851Z

[tool_use: Read]

### Assistant | 2026-06-15T15:05:32.320Z

[tool_use: Read]

### User | 2026-06-15T15:05:39.153Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\prompt-route-inject.test.mjs' was already read 22s ago in this session and is unchanged (mtime 1781535620181). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-15T15:05:43.750Z

[tool_result] read-once-guard: 'H:\prism\scripts\extract-operator-prompts.test.mjs' was already read 23s ago in this session and is unchanged (mtime 1781535455868). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-15T15:05:47.199Z

The read-once guard claims these are in my context, but I have not actually seen their content yet in this conversation. Let me disable the cache to read them, plus the dynamically-imported module.

### Assistant | 2026-06-15T15:05:47.923Z

[tool_use: Bash]

### User | 2026-06-15T15:05:53.392Z

[tool_result] #!/usr/bin/env node
// tier: T2
// prompt-route-inject.mjs -- UserPromptSubmit
//
// PROMPT-ROUTE-MAP-MS0 / U-PROMPT-ROUTE-INJECT (slot:alpha 2026-06-15). Operator
// directive: "my future prompts should auto trigger you to look at the graph to
// see the order of operation you should take to complete the task effectively and
// perfect the first time." This is U3: on EVERY substantive prompt, cla
... [+5474 chars truncated]

### Assistant | 2026-06-15T15:05:55.977Z

Now let me read the extractor, the test files, the generated map, and the dynamically-imported module.

### Assistant | 2026-06-15T15:05:56.937Z

[tool_use: Bash]

### Assistant | 2026-06-15T15:05:58.786Z

[tool_use: Bash]

### User | 2026-06-15T15:06:09.224Z

[tool_result] #!/usr/bin/env node
// scripts/extract-operator-prompts.mjs
//
// PROMPT-ROUTE-MAP-MS0 / U-PROMPT-EXTRACT (slot:alpha 2026-06-15). Operator
// directive: "read through every single session we've ever had. read ALL my
// prompts and commands. update the graph to account for every single prompt and
// command I've ever made so we map out a direct route to complete my future
// prompts." This is U1: 
... [+8782 chars truncated]

### User | 2026-06-15T15:06:25.805Z

[tool_result] // scripts/lib/feature-routing-graph.mjs
//
// FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH (slot:alpha 2026-06-15) -- the
// UNIFIED feature-routing decision graph. Operator directive: "build a graph for
// you to follow on the most token efficient way to do every tool call and every
// task we've ever done" + auto-invoke commands without typing them.
//
// THE GAP THIS FILLS (verified by the rout
... [+5122 chars truncated]

### Assistant | 2026-06-15T15:06:28.939Z

Now let me verify the critical claim: that `classifyRoutingClass` and `TASK_CLASS_POLICY` are zero-I/O. Let me read the classifier function body and check what the module does at top-level (module-load side effects).

### Assistant | 2026-06-15T15:06:30.258Z

[tool_use: Bash]

### Assistant | 2026-06-15T15:06:32.715Z

[tool_use: Bash]

### User | 2026-06-15T15:06:39.145Z

[tool_result] // NOTE (R7): named classifyRoutingClass, NOT classifyTaskClass -- the latter
// already exists in local-llm-task-router.mjs on a DIFFERENT axis (model-capability
// battery, "which Ollama model"). This one is the WORKFLOW-ROUTING axis ("which
// substrate ladder + commands"). Distinct purpose, distinct name, no collision.
export function classifyRoutingClass(prompt) {
  const text = String(prompt
... [+3891 chars truncated]

### User | 2026-06-15T15:06:45.013Z

[tool_result] ---top-level-statements (non-export/non-comment first 30 lines after policy)---
30:export const TASK_CLASS_POLICY = Object.freeze({
143:const CLASS_SIGNALS = Object.freeze({
161:const TIE_BREAK = ["physics", "quote", "learn", "review", "fix", "orchestrate", "session", "recall", "domain", "plan", "locate", "build"];
168:export const TASK_CLASS_TO_FORGE_PHASE = Object.freeze({
214:export async funct
... [+38 chars truncated]

### Assistant | 2026-06-15T15:06:49.594Z

Confirmed: `feature-routing-graph.mjs` has zero top-level I/O imports (only `node:` nothing — the grep for `^import` returned nothing, meaning no static imports at all; the cag/model/substrate imports are lazy inside `routeTaskClass`). `classifyRoutingClass` and `TASK_CLASS_POLICY` are pure (string `.includes` matching + a frozen object). The hook never calls `routeTaskClass`, so no heavy lazy imports fire. 

Now let me verify the test files and the generated map, and check the Windows `pathToFileURL` behavior plus the throttle race details.

### Assistant | 2026-06-15T15:06:50.389Z

[tool_use: Bash]

### Assistant | 2026-06-15T15:06:51.628Z

[tool_use: Bash]

### User | 2026-06-15T15:06:56.494Z

[tool_result] // prompt-route-inject.test.mjs
// Tests for U-PROMPT-ROUTE-INJECT pure functions. Real reference-value asserts (R9).
import { test } from "node:test";
import assert from "node:assert/strict";
import { humanCore, rankFor, renderRouteBlock } from "./prompt-route-inject.mjs";

const POLICY = {
  substrateLadder: ["master-graph", "obsidian", "claude"],
  modelTier: "opus",
  commands: ["/dedup", "/fo
... [+2799 chars truncated]

### User | 2026-06-15T15:07:03.680Z

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
      
... [+2915 chars truncated]

### Assistant | 2026-06-15T15:07:07.534Z

I notice the map embeds the full `route` (policy) per class at generation time — this is the drift vector the prompt flagged. Let me verify the hook does NOT read `route` from the map (it reads `TASK_CLASS_POLICY` live), and check the extractor test plus whether `pathToFileURL` is correct on Windows.

### Assistant | 2026-06-15T15:07:08.062Z

[tool_use: Bash]

### Assistant | 2026-06-15T15:07:10.008Z

[tool_use: Bash]

### User | 2026-06-15T15:07:42.647Z

[tool_result] // scripts/extract-operator-prompts.test.mjs
// Tests for U-PROMPT-EXTRACT pure functions. Real reference-value asserts (R9):
// each pins the exact extraction/classification/aggregation behaviour.
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPrompt, parsePromptText, normalizePrompt, buildRouteMap } from "./extract-operator-prompts.mjs";

// ---- extra
... [+4526 chars truncated]

### User | 2026-06-15T15:07:49.762Z

[tool_result] file:///H:/prism/scripts/lib/feature-routing-graph.mjs
---run hook tests---
  ...
# Subtest: buildRouteMap: counts by class, attaches route, sorts by frequency
ok 22 - buildRouteMap: counts by class, attaches route, sorts by frequency
  ---
  duration_ms: 1.8411
  ...
# Subtest: buildRouteMap: empty input -> total 0, classes still present
ok 23 - buildRouteMap: empty input -> total 0, classes stil
... [+279 chars truncated]

### Assistant | 2026-06-15T15:07:54.880Z

All 24 tests pass. `pathToFileURL` produces a valid `file:///H:/prism/...` URL on Windows — correct. Let me verify the two remaining concerns: (1) does the hook ever READ the embedded `route` from the map (the drift vector), and (2) trace a live hook invocation end-to-end to confirm it never throws and emits valid `{continue:true}` on a malformed/edge input.

### Assistant | 2026-06-15T15:08:01.014Z

[tool_use: Bash]

### Assistant | 2026-06-15T15:08:02.295Z

[tool_use: Bash]

### User | 2026-06-15T15:08:04.322Z

[tool_result] === live: normal build prompt ===
{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"## ROUTE -- task class: build -- your #1 most-common task type (1932x, 39.7% of history)\nDo it in THIS order (cheapest rung first; Claude is last):\n  1. substrates: dedup-check -> master-graph -> wiki -> obsidian -> claude\n  2. model: opus for design+novel code; sonnet for known mech
... [+670 chars truncated]

### User | 2026-06-15T15:08:06.260Z

[tool_result] 16:// FAST + PURE: classifyRoutingClass + TASK_CLASS_POLICY are zero-I/O (no per-prompt
53:  if (!map || !Array.isArray(map.classes)) return null;
54:  const idx = map.classes.findIndex((c) => c.taskClass === taskClass);
56:  const c = map.classes[idx];
101:  let classifyRoutingClass, TASK_CLASS_POLICY;
105:    TASK_CLASS_POLICY = m.TASK_CLASS_POLICY;
112:  const map = loadJsonSafe(MAP_PATH);
113:
... [+99 chars truncated]

### Assistant | 2026-06-15T15:08:13.309Z

Confirmed the key safety properties:

- **Drift question RESOLVED**: line 113 reads `TASK_CLASS_POLICY[taskClass]` from the LIVE imported module for the rendered route — the map is only used via `rankFor` for the historical frequency rank (count/pct). So if `TASK_CLASS_POLICY` changes, the injected order-of-ops follows it live; only the embedded `route` field in the JSON would go stale, but the hook never reads it. No silent drift in what's injected.
- **Hot-path safety CONFIRMED**: every edge input (empty/malformed/non-string/missing-lib/trivial/no-signal) emits valid `{continue:true}` at exit 0. Never throws out of `main`.

Let me do the final two checks: the throttle race (concurrent writes from multiple chats) and the extractor's fd-leak/torn-line safety, plus confirm the extractor's pre-filter doesn't OOM on a giant single line.

### Assistant | 2026-06-15T15:08:19.930Z

[tool_use: Bash]

### User | 2026-06-15T15:08:29.841Z

[tool_result] final parseable: true keys: 4
exit=0

### Assistant | 2026-06-15T15:09:00.972Z

The throttle race is benign: a torn concurrent read makes `loadJsonSafe` return `null` → `st = {}` → fail-open (returns `false`, injection proceeds), and the next write resets the file. Worst case is a missed throttle (a duplicate injection) or a brief over-suppress — never a crash, never a wrong-suppress that blocks the prompt. The whole `throttleSkip` body is wrapped in try/catch with a fail-open comment.

I have traced every concern. Let me do a final confirmation on the extractor's fd-leak path (does `corpusFd` close if `streamTranscript` throws) and the torn/giant-line behavior.

The extractor's `streamTranscript` wraps the `for await` loop in try/catch (catches torn reads) with a `finally { rl.close() }`. The `main()` loop awaits each `streamTranscript` which itself never re-throws (the catch swallows). So `fs.closeSync(corpusFd)` is always reached after the loop. The one residual: if `buildRouteMap` or the final `writeFileSync` throws AFTER `closeSync`, the fd is already closed — fine. The giant-line concern: `readline` yields one line at a time; a single 512MB+ line would still be materialized as one string by readline (could hit the V8 string cap or memory), but `line.includes('"type":"user"')` runs on the already-materialized string, so the pre-filter does NOT prevent the readline buffer from holding the line. This is a real but bounded risk (offline batch tool, not the hot path).

VERDICT: PASS

summary: The hot-path hook (`prompt-route-inject.mjs`, fires every UserPromptSubmit) is fail-open on every traced path — stdin read, JSON.parse, dynamic import, classify, throttle, map read are all individually try/caught, and `main().catch` emits `{continue:true}`. I verified live: empty/malformed/non-string/missing-lib/trivial/no-signal inputs all emit valid `{continue:true}` at exit 0, never throwing out of a prompt submission. The dynamically imported `feature-routing-graph.mjs` has ZERO static/top-level I/O imports; the heavy cag/model/substrate lazy-imports 
... [+3077 chars truncated]
