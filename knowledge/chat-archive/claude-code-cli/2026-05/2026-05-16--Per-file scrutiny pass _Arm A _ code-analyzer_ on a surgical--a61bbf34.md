---
type: "chat-session"
source: "claude-code-cli"
session_id: "a61bbf34-4093-44f3-a8af-e68d61dc41a9"
title: "Per-file scrutiny pass (Arm A — code-analyzer) on a surgical classifier fix to P"
date: "2026-05-16"
first_ts: "2026-05-16T02:27:14.639Z"
last_ts: "2026-05-16T02:31:05.352Z"
cwd: "H:\\prism"
messages: 36
user_msgs: 13
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-a485a167140d51443.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Per-file scrutiny pass (Arm A — code-analyzer) on a surgical classifier fix to P

> **claude-code-cli** | 2026-05-16 | 36 msgs (13 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-a485a167140d51443.jsonl`

## Transcript

### User | 2026-05-16T02:27:14.639Z

Per-file scrutiny pass (Arm A — code-analyzer) on a surgical classifier fix to PRISM's Ollama task-offloader hook.

CONTEXT:
- The offloader is `H:\prism\.claude\hooks\ollama-task-offloader.mjs` (UserPromptSubmit hook). Telemetry showed 76 of 84 events labeled `category="unknown" decision=keep`. The routing decisions were correct (those prompts should stay on Claude), but the category label was useless for dashboards. Root cause: `KEEP_ON_CLAUDE` was a flat `RegExp[]` returning category="complex" for any match and falling through to "unknown" for the most common case (PRISM orchestration prompts like /checkin, /loop, /goal, "fix this", "continue", "sync", "close out").
- Fix: converted KEEP_ON_CLAUDE to `{pattern, category}[]` and added explicit patterns for: orchestration (PRISM slash commands), safety_physics, multi_file, git_ops, deep_reasoning, operator_directive. Added `export { classifyPrompt }` so the test file can import the pure classifier without spawning the hook process.
- Tests: `H:\prism\.claude\hooks\__tests__\ollama-task-offloader-classify.test.mjs` — 28 node:test cases (vitest harness is broken on this repo per `[[reference_fleet_reaper_ms1]]`). All 28 pass. Runtime smoke-tested with 2 stdin payloads — both correct.
- Single-file consumer of KEEP_ON_CLAUDE (verified with Grep). No external dependents.

WEIGHTING (Arm A is the specialist arm):
- Integration with the offload pipeline: does the `{pattern, category}` shape integrate cleanly with the existing recordOllamaEvent + dashboard aggregation logic?
- Telemetry shape: do the new category labels (orchestration / operator_directive / deep_reasoning / safety_physics / multi_file / git_ops) collide with any existing dashboard / dashboard script / aggregation key?
- Regex correctness: are the new patterns precise, or do they have catastrophic-backtracking risk / unintended over-match? Look hard at the long orchestration alternation.
- Order-sensitivity: KEEP_ON_CLAUDE is iterated in order — does the o
... [+1328 chars truncated]

### Assistant | 2026-05-16T02:27:20.634Z

I'll perform a thorough Arm A code-analyzer review on this surgical classifier fix.

### Assistant | 2026-05-16T02:27:20.994Z

[tool_use: Read]

### User | 2026-05-16T02:27:22.165Z

[tool_result] 1	// tier: T4
2	// NOTE: no shebang. The hook runs via explicit `node X.mjs` in the harness's
3	// UserPromptSubmit chain — never chmod+x. vite's SSR transform does not strip
4	// a line-1 `#!` and injects its preamble above, stranding the `#!` mid-file
5	// and breaking vitest's import of this file. Removing it is the cleanest fix.
6	/**
7	 * ollama-task-offloader.mjs — UserPromptSubmit hook
8	 *
... [+20721 chars truncated]

### Assistant | 2026-05-16T02:27:26.277Z

I'll continue the review, noting the conventions reminder. The file in question is a `.mjs` Node script (not a shell script), so the bash-specific conventions don't apply — Node hooks have their own conventions (stdin via fd 0, JSON-on-stdout, exit-code semantics). Continuing the read.

### Assistant | 2026-05-16T02:27:26.777Z

[tool_use: Read]

### User | 2026-05-16T02:27:27.719Z

[tool_result] 1	// node:test coverage for ollama-task-offloader classifyPrompt().
2	// vitest harness is broken on this repo (pre-existing vite-transform bug);
3	// node --test is the working alternative. Run:
4	//   node --test .claude/hooks/__tests__/ollama-task-offloader-classify.test.mjs
5	//
6	// Scope: U-OFFLOADER-CAT-FIX (2026-05-16, slot echo). Validates that
7	// orchestration / operator_directive / de
... [+8608 chars truncated]

### Assistant | 2026-05-16T02:27:30.385Z

Acknowledged. Now reading the consumer libraries to verify integration.

### Assistant | 2026-05-16T02:27:30.698Z

[tool_use: Read]

### User | 2026-05-16T02:27:31.481Z

[tool_result] 1	// tier: T4
2	/**
3	 * ollama-stats.mjs — shared stats writer for all Ollama-bridge hooks.
4	 *
5	 * Before this module existed, only ollama-task-offloader wrote to
6	 * `mcp-server/data/state/ollama-offload-stats.json`, so the offload-rate
7	 * dashboard reported a single hook's view (~7%) and missed savings from
8	 * ollama-context-aggregator, ollama-obsidian-rag, ollama-engine-api-extractor,

... [+6696 chars truncated]

### Assistant | 2026-05-16T02:27:33.457Z

Acknowledged. Now checking the dashboard aggregator.

### Assistant | 2026-05-16T02:27:34.457Z

[tool_use: Bash]

### User | 2026-05-16T02:27:38.442Z

[tool_result] EXISTS

### Assistant | 2026-05-16T02:27:40.900Z

[tool_use: Read]

### User | 2026-05-16T02:27:42.157Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ollama-offload-dashboard.mjs — print last-24h Ollama offload stats
4	 *
5	 * INTEL-OLLAMA-OBSIDIAN-MS0/P0-U03.
6	 *
7	 * Reads mcp-server/data/state/ollama-offload-stats.json (schemaVersion 2.0.0)
8	 * and prints:
9	 *   1. Top-line totals (since last reset)
10	 *   2. Per-hook fire counts (which hooks are doing the routing)
11	 *   3. Last 24h activity from the ro
... [+8328 chars truncated]

### Assistant | 2026-05-16T02:27:45.820Z

Good. Now let me verify a few things: the existing byCategory keys in the live stats file, and inspect the regex hot spots and the order-sensitivity case for "fix the kienzle calculation".

### Assistant | 2026-05-16T02:27:48.837Z

[tool_use: Bash]

### User | 2026-05-16T02:27:53.690Z

[tool_result] byCategory keys: [ 'cache-hit', 'summary', 'explanation' ]
byHook keys: [
  'ollama-task-offloader',
  'ollama-engine-api-extractor',
  'fleet-reaper-coordinator'
]
events count: 106
event-level category set: [
  'fleet-reaper-prewarm',
  'fleet-reaper-hint',
  'unknown',
  'summary',
  'complex',
  'orchestration',
  'explanation'
]

### Assistant | 2026-05-16T02:27:56.796Z

Task list noted; not creating new ones — this scrutiny is part of #20. Now let me probe the key risk axes (regex correctness, order-sensitivity, hostile patterns).

### Assistant | 2026-05-16T02:28:10.823Z

[tool_use: Bash]

### User | 2026-05-16T02:28:14.212Z

[tool_result] Exit code 1
ERR Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'h:'
    at throwIfUnsupportedURLScheme (node:internal/modules/esm/load:217:11)
    at defaultLoad (node:internal/modules/esm/load:109:3)
    at ModuleLoader.load (node:internal/mod
... [+458 chars truncated]

### Assistant | 2026-05-16T02:28:22.747Z

[tool_use: Bash]

### User | 2026-05-16T02:28:28.260Z

[tool_result] {"p":"fix the kienzle calculation","offloadable":false,"category":"safety_physics","savings":0,"ms":2,"note":"should hit safety_physics keep (no offload signal)"}
{"p":"explain the kienzle calculation","offloadable":true,"category":"explanation","savings":0.9,"ms":0,"note":"should offload as explanation (offload runs first)"}
{"p":"summarize the safety-critical change","offloadable":true,"category
... [+1953 chars truncated]

### Assistant | 2026-05-16T02:28:30.934Z

Several important findings surface. Now let me probe a few more specific risk axes before writing the report.

### Assistant | 2026-05-16T02:28:46.559Z

[tool_use: Bash]

### User | 2026-05-16T02:28:54.068Z

[tool_result] {"p":"summarize the safety-critical change","offloadable":true,"category":"git_summary","savings":0.88,"note":"mislabeled as git_summary (regex too broad?)"}
{"p":"the /goal is ambitious","offloadable":false,"category":"orchestration","savings":0,"note":"/goal substring inside sentence"}
{"p":"/forge-anything","offloadable":false,"category":"orchestration","savings":0,"note":"unsafe — matches bare
... [+2066 chars truncated]

### Assistant | 2026-05-16T02:28:57.544Z

Critical findings located. Let me also check one last hostile-payload concern: catastrophic backtracking on the long orchestration alternation, and inspect the import-side-effect risk.

### Assistant | 2026-05-16T02:29:02.483Z

[tool_use: Bash]

### User | 2026-05-16T02:29:07.661Z

[tool_result] len=10008 ms=1
len=35001 ms=2
len=5011 ms=0
len=100000 ms=1
len=90009 ms=1

### Assistant | 2026-05-16T02:29:10.304Z

No ReDoS risk — V8's regex engine handles the alternations linearly. Now the import-side-effect check.

### Assistant | 2026-05-16T02:29:14.273Z

[tool_use: Bash]

### User | 2026-05-16T02:29:25.224Z

[tool_result] import_ms=18
exports: [ 'classifyPrompt', 'loadRoutingHint' ]
classifyPrompt is fn: true
loadRoutingHint is fn: true

### Assistant | 2026-05-16T02:29:28.287Z

Excellent. Import is side-effect-free (the `invokedAsCli` guard works). Now let me also probe the `prompt.length < 20` filter interaction with the test cases to check for inconsistency.

### Assistant | 2026-05-16T02:29:32.534Z

[tool_use: Bash]

### User | 2026-05-16T02:29:38.286Z

[tool_result] 27 continue where you left off
29 sync the h and c drive please
28 /goal complete the milestone
42 /checkin-alpha continue where you left off
37 is there a way to do this differently

### Assistant | 2026-05-16T02:31:05.352Z

Acknowledged. All test prompts ≥20 chars, so the runtime length filter doesn't shadow the unit tests. I have everything needed for the verdict.

---

# Arm A Code-Analyzer Scrutiny Verdict — Offloader Classifier Fix

## VERDICT: **FAIL** (1 P0 + 3 P1 + 2 P2)

The fix is **directionally correct** and the surgical refactor (`{pattern, category}[]`) is sound. Integration with `recordOllamaEvent`, the dashboard aggregator, and the rate-limit cache is clean. But there are **three concrete mislabeling bugs** and **one regression-hiding test tautology** that need to land before this ships.

---

## P0 — Critical mislabeling: `summarize` regex captures non-git summaries as `git_summary`

**File:** `H:\prism\.claude\hooks\ollama-task-offloader.mjs:78`

```js
{ pattern: /\b(summarize|recap|what.*happened in)\s+.*(git\s+log|commits?|changes?|session|handoff)\b/i, category: "git_summary", savings: 0.88 },
```

`changes?` is a load-bearing token in PRISM prompts and means many different things: "summarize the safety-critical change" routes to `git_summary` (verified live):

```
{"p":"summarize the safety-critical change","offloadable":true,"category":"git_summary","savings":0.88}
```

This is the **same class of bug as the original `unknown` collapse** — a regex that's too generic claims downstream traffic that doesn't belong to it. Worse, this one fires BEFORE the generic `summarize` pattern at line 85 (which is `category: "summary"`), so every "summarize the X change" prompt mislabels to `git_summary` regardless of whether it touches git. Dashboards will under-count `summary` and over-count `git_summary`. The `byCategory` aggregator in `ollama-stats.mjs:142` is keyed by string, so once this lands, the historical telemetry is poisoned per-category.

**Concrete fix:** require the `git\s+log` / `commits?` / `session` / `handoff` tokens to be the actual target. Drop the bare `changes?` from the alternation, OR demand a git-noun within 5 words:

```js
{ pattern: /\b(summarize|recap
... [+12370 chars truncated]
