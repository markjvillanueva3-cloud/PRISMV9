---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Read-only review (arm B — test integrity + injection-budget + convention; do NOT"
date: "2026-06-15"
first_ts: "2026-06-15T15:05:09.176Z"
last_ts: "2026-06-15T15:09:13.852Z"
cwd: "H:\\prism"
messages: 46
user_msgs: 18
assistant_msgs: 28
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a94b97a771c29531e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Read-only review (arm B — test integrity + injection-budget + convention; do NOT

> **claude-code-cli** | 2026-06-15 | 46 msgs (18 user / 28 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a94b97a771c29531e.jsonl`

## Transcript

### User | 2026-06-15T15:05:09.176Z

Read-only review (arm B — test integrity + injection-budget + convention; do NOT assume arm A caught everything) of commit 23e4499e9d on H:/prism (PROMPT-ROUTE-MAP-MS0). Diff: `git -C H:/prism show 23e4499e9d`.

Files: scripts/extract-operator-prompts.mjs (+.test.mjs, 14 tests), .claude/hooks/prompt-route-inject.mjs (+.test.mjs, 10 tests), state/shared/operator-prompt-route-map.json.

Weighted focus:
- TEST INTEGRITY (R9): are the 24 asserts REAL reference-value checks (pin exact extraction/classification/render behaviour, fail on regression)? Not toBeDefined stubs? Run `cd H:/prism && node --test scripts/extract-operator-prompts.test.mjs .claude/hooks/prompt-route-inject.test.mjs`. Any .skip/.only? Do they cover the failure modes: array-content tool_result -> null, system-reminder strip, empty/null, dedup-normalization, zero-count class?
- INJECTION BUDGET: this hook fires on EVERY UserPromptSubmit fleet-wide (the FLEET-INJECTION-BUDGET-AUDIT floor is ~3.2KB/turn/slot across ~60 injectors). Is the injected block compact (count the lines/bytes)? Is the MIN_PROMPT_CHARS skip + per-class throttle enough to avoid spamming on /loop iterations + trivial prompts? Could it inject on ceremony-only slash commands (noise)?
- CONVENTION: does the hook match the existing UserPromptSubmit injector pattern (tier header, emit shape {hookSpecificOutput:{hookEventName,additionalContext}}, knob naming PRISM_*_DISABLE)? Is the settings.json wiring correct (verify with: `node -e 'const j=require(\"C:/Users/wompu/.claude/settings.json\");console.log(j.hooks.UserPromptSubmit[0].hooks.filter(h=>/prompt-route-inject/.test(h.command)).length)'` -> expect 1)?
- Does the extractor's buildRouteMap correctly attach TASK_CLASS_POLICY routes + sort by frequency without drift?

Grade PASS or FAIL with P0/P1/P2 citing file:line. Concise.

### Assistant | 2026-06-15T15:05:13.639Z

I'll review commit 23e4499e9d focusing on test integrity, injection budget, and convention conformance.

### Assistant | 2026-06-15T15:05:14.585Z

[tool_use: Bash]

### Assistant | 2026-06-15T15:05:15.309Z

[tool_use: Bash]

### User | 2026-06-15T15:05:18.142Z

[tool_result] commit 23e4499e9db664c5d9a628b2fd7ae71524714ac4
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 15 10:04:30 2026 -0500

    [MAIN-FORCE] [PROMPT-ROUTE-MAP-MS0]/U-PROMPT-ROUTE (slot:alpha): mine ALL 613 sessions -> per-prompt route auto-trigger. Streamed every transcript (7.8GB, 16301 raw -> 4870 distinct human prompts+commands), classified via classifyRoutingClass: buil
... [+885 chars truncated]

### User | 2026-06-15T15:05:21.513Z

[tool_result]   ...
# Subtest: parse: empty / pure-ceremony -> null
ok 19 - parse: empty / pure-ceremony -> null
  ---
  duration_ms: 0.2036
  ...
# Subtest: normalize: collapses ws + lowercases + drops volatile ids
ok 20 - normalize: collapses ws + lowercases + drops volatile ids
  ---
  duration_ms: 0.366
  ...
# Subtest: normalize: two prompts differing only by an id normalize equal (dedup)
ok 21 - normalize
... [+692 chars truncated]

### Assistant | 2026-06-15T15:05:24.546Z

All 24 tests pass, no skips. Now let me read all the changed files end to end.

### Assistant | 2026-06-15T15:05:25.019Z

[tool_use: Read]

### Assistant | 2026-06-15T15:05:25.201Z

[tool_use: Read]

### User | 2026-06-15T15:05:26.385Z

[tool_result] read-once-guard: 'H:\prism\scripts\extract-operator-prompts.mjs' was already read 21s ago in this session and is unchanged (mtime 1781535357695). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-15T15:05:26.387Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\prompt-route-inject.mjs' was already read 21s ago in this session and is unchanged (mtime 1781535681298). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-15T15:05:29.270Z

The read-once-guard claims I've read these, but I have not in this session. Let me read them via the diff and with cache disabled.

### Assistant | 2026-06-15T15:05:30.110Z

[tool_use: Bash]

### User | 2026-06-15T15:05:38.430Z

[tool_result] #!/usr/bin/env node
// scripts/extract-operator-prompts.mjs
//
// PROMPT-ROUTE-MAP-MS0 / U-PROMPT-EXTRACT (slot:alpha 2026-06-15). Operator
// directive: "read through every single session we've ever had. read ALL my
// prompts and commands. update the graph to account for every single prompt and
// command I've ever made so we map out a direct route to complete my future
// prompts." This is U1: 
... [+8782 chars truncated]

### Assistant | 2026-06-15T15:05:43.529Z

[tool_use: Bash]

### User | 2026-06-15T15:05:52.313Z

[tool_result]      1	#!/usr/bin/env node
     2	// tier: T2
     3	// prompt-route-inject.mjs -- UserPromptSubmit
     4	//
     5	// PROMPT-ROUTE-MAP-MS0 / U-PROMPT-ROUTE-INJECT (slot:alpha 2026-06-15). Operator
     6	// directive: "my future prompts should auto trigger you to look at the graph to
     7	// see the order of operation you should take to complete the task effectively and
     8	// perfect the f
... [+6307 chars truncated]

### Assistant | 2026-06-15T15:05:54.827Z

Now let me read both test files and the dependency (feature-routing-graph.mjs) to verify the classifier contract the tests pin against.

### Assistant | 2026-06-15T15:05:55.842Z

[tool_use: Bash]

### Assistant | 2026-06-15T15:05:56.389Z

[tool_use: Bash]

### User | 2026-06-15T15:06:09.067Z

[tool_result]      1	// scripts/extract-operator-prompts.test.mjs
     2	// Tests for U-PROMPT-EXTRACT pure functions. Real reference-value asserts (R9):
     3	// each pins the exact extraction/classification/aggregation behaviour.
     4	import { test } from "node:test";
     5	import assert from "node:assert/strict";
     6	import { extractPrompt, parsePromptText, normalizePrompt, buildRouteMap } from "./ext
... [+5198 chars truncated]

### User | 2026-06-15T15:06:25.330Z

[tool_result]      1	// prompt-route-inject.test.mjs
     2	// Tests for U-PROMPT-ROUTE-INJECT pure functions. Real reference-value asserts (R9).
     3	import { test } from "node:test";
     4	import assert from "node:assert/strict";
     5	import { humanCore, rankFor, renderRouteBlock } from "./prompt-route-inject.mjs";
     6	
     7	const POLICY = {
     8	  substrateLadder: ["master-graph", "obsidian", "cl
... [+3289 chars truncated]

### Assistant | 2026-06-15T15:06:28.367Z

Now let me verify the dependency `feature-routing-graph.mjs` exists and exports what's used (classifyRoutingClass, TASK_CLASS_POLICY, taskClasses), and verify the settings.json wiring.

### Assistant | 2026-06-15T15:06:29.731Z

[tool_use: Bash]

### Assistant | 2026-06-15T15:06:31.931Z

[tool_use: Bash]

### User | 2026-06-15T15:06:35.491Z

[tool_result]      1	// scripts/lib/feature-routing-graph.mjs
     2	//
     3	// FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH (slot:alpha 2026-06-15) -- the
     4	// UNIFIED feature-routing decision graph. Operator directive: "build a graph for
     5	// you to follow on the most token efficient way to do every tool call and every
     6	// task we've ever done" + auto-invoke commands without typing them.
    
... [+7250 chars truncated]

### User | 2026-06-15T15:06:45.123Z

[tool_result] Cprompt-route-inject-count: 1
Hprompt-route-inject-count: 1

### Assistant | 2026-06-15T15:06:49.570Z

Settings wiring is correct (exactly 1 in both C: and H:). Let me verify the remaining classes in the policy table, the `taskClasses` and `classifyRoutingClass` exports, and check the route map JSON for drift and the rendered block byte size.

### Assistant | 2026-06-15T15:06:49.571Z

[tool_use: Bash]

### User | 2026-06-15T15:06:56.381Z

[tool_result]   },
  session: {
    trigger: "checkin / handoff / startup / compact / resume / reorient",
    substrateLadder: ["atcs", "obsidian-handoff", "claude"],
    modelTier: "free/mechanical",
    commands: ["/checkin-<slot>", "/handoff", "/precompact", "/startup-<slot>"],
    hooks: ["scrutinize-before-stop", "enforce-handoff-topic", "stop-close-own-bg-tasks"],
    autoInvoke: ["/checkin-<slot>"],
    
... [+7056 chars truncated]

### Assistant | 2026-06-15T15:06:59.978Z

[tool_use: Bash]

### Assistant | 2026-06-15T15:07:02.581Z

[tool_use: Bash]

### User | 2026-06-15T15:07:17.872Z

[tool_result] 277:export function taskClasses() {

### User | 2026-06-15T15:07:42.722Z

[tool_result] ## ROUTE -- task class: build -- your #1 most-common task type (1932x, 39.7% of history)
Do it in THIS order (cheapest rung first; Claude is last):
  1. substrates: dedup-check -> master-graph -> wiki -> obsidian -> claude
  2. model: opus for design+novel code; sonnet for known mechanical patterns
  3. commands: /dedup -> /forge-triple -> /wire-unwired -> /scrutinize
  4. auto-fire now: /dedup
AV
... [+204 chars truncated]

### Assistant | 2026-06-15T15:07:46.591Z

The injected block is 8 lines / 580 bytes — compact. Let me verify `taskClasses()` returns exactly the 12 classes, check the route map JSON for drift (sort + route attachment), and confirm the throttle/MIN_PROMPT_CHARS skip behaviour against ceremony slash-commands.

### Assistant | 2026-06-15T15:07:52.142Z

[tool_use: Bash]

### User | 2026-06-15T15:07:57.190Z

[tool_result] /** Pure: the list of all task-class names (for generators / coverage checks). */
export function taskClasses() {
  return Object.keys(TASK_CLASS_POLICY);
}
=== taskClasses count + map drift check ===
taskClasses n: 12 -> locate,build,plan,recall,learn,quote,physics,review,fix,orchestrate,session,domain
POLICY keys n: 12
map.classes n: 12 total: 4870 distinct: 4870
sorted desc by count: true
every
... [+103 chars truncated]

### Assistant | 2026-06-15T15:08:01.818Z

The route map matches policy exactly, sorts correctly, no drift, and the commit-message figures (build 39.7%, learn 18.9%, fix 10.7%, total 4870) are verified against the actual JSON. Now let me check the ceremony-slash-command concern: does a `/checkin-alpha` with no args inject noise, and does a `/loop` ceremony command get throttled? I'll trace the `humanCore` + classify path on representative inputs.

### Assistant | 2026-06-15T15:08:06.718Z

[tool_use: Bash]

### User | 2026-06-15T15:08:14.442Z

[tool_result] "<command-name>/loop</command-name> <comm" -> SKIP (core="10m" len=3)
"<command-name>/checkin-alpha</command-na" -> core="/checkin-alpha" -> INJECT[session conf=0.25]
"<command-name>/handoff</command-name>" -> SKIP (core="/handoff" len=8)
"<command-name>/goal</command-name> <comm" -> core="finish the route map milestone" -> SILENT(conf0)
"ok" -> SKIP (core="ok" len=2)
"try again" -> SKIP (core="tr
... [+125 chars truncated]

### Assistant | 2026-06-15T15:08:21.156Z

This confirms the skip/throttle behaviour. Key observations:

- `/loop 10m` → SKIP (core "10m" < 12 chars). Good — loop bursts don't spam.
- `/handoff` (no args) → SKIP (8 chars). Good.
- `ok` / `try again` / `yes do it` → SKIP. Good.
- `/checkin-alpha` (no args) → INJECTS the `session` block at conf 0.25. This is the one ceremony case that injects. The `humanCore` returns the literal `/checkin-alpha` string (the `<command-name>` tag without args), and `classifyRoutingClass` matches "checkin" → session. But it's throttled per-class (300s), so repeated checkins won't repeat. Minor noise, not a P0/P1.

Let me verify the `humanCore` divergence from the extractor's `parsePromptText` — the extractor strips `<command-name>` tags (so `/checkin-alpha` would yield empty), but the hook's `humanCore` does NOT strip `<command-name>`, leaving the raw command string. Let me confirm this is the intended/consistent behaviour and check `.gitignore` additions and that the corpus output path is gitignored.

### Assistant | 2026-06-15T15:08:24.193Z

[tool_use: Bash]

### User | 2026-06-15T15:08:36.288Z

[tool_result]     [MAIN-FORCE] [PROMPT-ROUTE-MAP-MS0]/U-PROMPT-ROUTE (slot:alpha): mine ALL 613 sessions -> per-prompt route auto-trigger. Streamed every transcript (7.8GB, 16301 raw -> 4870 distinct human prompts+commands), classified via classifyRoutingClass: build 39.7% / learn 18.9% / fix 10.7% / orchestrate 8.7% / session 7% (top cmds /goal 303, /loop 100, /checkin*). operator-prompt-route-map.json = frequ
... [+995 chars truncated]

### Assistant | 2026-06-15T15:08:42.202Z

I have what I need. The `.gitignore` correctly excludes the regenerable raw corpus jsonl while committing the digest. The `humanCore` vs `parsePromptText` divergence is benign: the extractor (offline mining) splits out commands cleanly, while the hook's `humanCore` keeps the command string for live classification — both feed the same classifier and the throttle bounds the noise. Let me do a final check on the throttle directory creation order (a potential bug: `mkdirSync` is called after `writeFileSync` would need the dir) and confirm no `.skip`/`.only`.

### Assistant | 2026-06-15T15:08:45.482Z

[tool_use: Bash]

### User | 2026-06-15T15:08:51.645Z

[tool_result] no skip/only/todo found
=== throttle mkdir-before-write order check (lines 85-88) ===
first-call throttle write OK, exists: true

### Assistant | 2026-06-15T15:09:13.852Z

In `prompt-route-inject.mjs` the `mkdirSync` (line 86) correctly precedes the `writeFileSync` (line 87), so the throttle file write succeeds on first call. No `.skip`/`.only`/`.todo`. My review is complete.

---

VERDICT: PASS

summary: PROMPT-ROUTE-MAP-MS0 (commit 23e4499e9d) is a clean, well-tested addition. All 24 tests pass with zero skips and are genuine reference-value asserts that pin exact extraction/classification/render behaviour. The injected block is compact (8 lines / 580 bytes), correctly skips trivial prompts (`<12` chars) and zero-confidence classes, and is per-class throttled so `/loop` bursts cannot spam. settings.json wiring is exactly 1 entry in both C: and H:. The route-map JSON matches `TASK_CLASS_POLICY` with no drift and the commit-message frequency figures are verified against the actual data.

findings:
  - none (P0/P1)
  - [P2] `H:/prism/.claude/hooks/prompt-route-inject.mjs:48` -- `humanCore` does NOT strip `<command-name>` tags the way the extractor's `parsePromptText` (`H:/prism/scripts/extract-operator-prompts.mjs:75`) does, so a no-arg ceremony command like `<command-name>/checkin-alpha</command-name>` survives as the literal string `/checkin-alpha` and injects a `session` route block (verified: conf 0.25). This is the one ceremony case that injects noise; the 300s per-class throttle bounds it to once per class per 5 min, so impact is minor. -- if tightening: have `humanCore` return empty (skip) when the only content is a bare `<command-name>` with no `<command-args>`, mirroring the extractor.

Verified (auditable PASS):
- TEST INTEGRITY: ran both files together -> 24 pass / 0 fail / 0 skipped; asserts pin exact values (`text`/`command`/`args` extraction, array-content tool_result -> null at test:14-17, system-reminder strip at test:41-44, local-command-stdout-only -> null at test:45-47, empty/null/non-string -> null at test:48-52, dedup id-normalization equality at test:55-66, zero-count class still present + rank phrase omitted at t
... [+1910 chars truncated]
