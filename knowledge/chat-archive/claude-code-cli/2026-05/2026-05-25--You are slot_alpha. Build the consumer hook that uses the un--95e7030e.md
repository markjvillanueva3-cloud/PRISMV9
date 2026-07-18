---
type: "chat-session"
source: "claude-code-cli"
session_id: "95e7030e-b0eb-4734-9088-595089441efe"
title: "You are slot:alpha. Build the consumer hook that uses the unified router-table t"
date: "2026-05-25"
first_ts: "2026-05-25T02:44:23.911Z"
last_ts: "2026-05-25T02:49:36.881Z"
cwd: "H:\\prism"
messages: 33
user_msgs: 13
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/95e7030e-b0eb-4734-9088-595089441efe/subagents/agent-a87ea68d26cca7651.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# You are slot:alpha. Build the consumer hook that uses the unified router-table t

> **claude-code-cli** | 2026-05-25 | 33 msgs (13 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/95e7030e-b0eb-4734-9088-595089441efe/subagents/agent-a87ea68d26cca7651.jsonl`

## Transcript

### User | 2026-05-25T02:44:23.911Z

You are slot:alpha. Build the consumer hook that uses the unified router-table to advise on tool surfaces.

## Task
Create `H:/prism/.claude/hooks/pre-tool-router-table-advise.mjs` — a PreToolUse hook (any tool) that:
1. Identifies the target node ID from the tool_input
2. Looks up the route via `lookupRoute()` from `H:/prism/scripts/lib/token-savings-router-table.mjs` (already shipped by Agent 2)
3. If a route exists AND it's a non-advisory kind (rtk-wrap / mcp-route / ollama-offload / skill), emits an `additionalContext` nudge with the EXACT command to use

## Node ID derivation
- Bash command `git log` → likely route candidate `rtk.git`
- Bash command `node script.mjs` → `rtk.node`
- Read on huge known file → `route.read-digest`
- WebSearch with PRISM keywords → `route.master-index`

Use a simple heuristic mapper `commandToCandidateId(tool_name, tool_input) → string | null`.

## Tier
T3 (advisory).

## Knob
`PRISM_ROUTER_TABLE_ADVISE_DISABLE=1`.

## Tests
Create `__tests__/pre-tool-router-table-advise.test.mjs` with ≥5 cases:
- commandToCandidateId returns correct ID for each tool_name
- Hook emits nudge when route exists
- Hook passes (continue:true) when no route
- Fail-soft on malformed input

## DO NOT
- DO NOT block tools. Advisory only.
- Don't commit. Parent batch-commits.

## Return
File paths + test count. Under 80 words.

### Assistant | 2026-05-25T02:44:33.724Z

I'll build the consumer hook for router-table advisories.

### Assistant | 2026-05-25T02:44:34.415Z

[tool_use: Bash]

### User | 2026-05-25T02:44:55.726Z

[tool_result] H:/prism/.claude/hooks/:
total 5895
drwxr-xr-x 1 wompu 197611     0 May 24 21:37 .
drwxr-xr-x 1 wompu 197611     0 May 24 14:40 ..
drwxr-xr-x 1 wompu 197611     0 May 13 19:49 .deprecated

### Assistant | 2026-05-25T02:44:58.701Z

[tool_use: Bash]

### User | 2026-05-25T02:45:17.067Z

[tool_result] /usr/bin/ls: cannot access 'H:/prism/scripts/lib/token-savings-router-table.mjs': No such file or directory
/usr/bin/bash: line 1: /c/Users/wompu/bin/rtk: Argument list too long

### Assistant | 2026-05-25T02:45:19.596Z

The router-table lib doesn't exist yet (Agent 2 hasn't shipped). Let me check if there's a partial path or alternate name.

### Assistant | 2026-05-25T02:45:20.127Z

[tool_use: Glob]

### Assistant | 2026-05-25T02:45:20.458Z

[tool_use: Glob]

### User | 2026-05-25T02:45:24.081Z

[tool_result] scripts\lib\course-data-router-lib.mjs
scripts\lib\course-data-router-lib.test.mjs

### User | 2026-05-25T02:45:24.085Z

[tool_result] scripts\lib\token-savings-misc.mjs

### Assistant | 2026-05-25T02:45:27.121Z

[tool_use: Read]

### Assistant | 2026-05-25T02:45:27.384Z

[tool_use: Glob]

### User | 2026-05-25T02:45:33.787Z

[tool_result] scripts\token-savings-rank.mjs
scripts\lib\token-savings-misc.mjs
scripts\__tests__\token-savings-misc.test.mjs

### User | 2026-05-25T02:45:34.557Z

[tool_result] 1	// scripts/lib/token-savings-misc.mjs
2	// ----------------------------------
3	// Covers gaps D2 (cross-session stable-lookup cache), D3 (wiki-entry response
4	// cache), E1 (per-tool token-cost dashboard), E2 (top-cost-tools report).
5	// Pure functions; IO wrappers are minimal.
6	//
7	// D2: stable lookups (ENGINE_DIGEST, dispatcher actions) — cache with TTL.
8	// D3: wiki entry response cach
... [+1718 chars truncated]

### Assistant | 2026-05-25T02:45:38.213Z

Agent 2's `token-savings-router-table.mjs` hasn't shipped yet. I'll build my hook against the expected API (per spec) using lazy imports with graceful fallback so it works once Agent 2 ships, and is fail-soft until then.

### Assistant | 2026-05-25T02:45:38.826Z

[tool_use: Bash]

### User | 2026-05-25T02:46:34.141Z

[tool_result] _smoke-auto-resume.mjs  5.4K
_smoke-release-slot.mjs  2.8K
_smoke-slot-signature-advisory.mjs  8.1K
_smoke-wiring-audit.mjs  13.2K
action-triple-sync.test.mjs  6.4K
active-chat-priority.test.mjs  7.7K
audit-viz-first-rate-gate.test.mjs  10.7K
auto-learn-budget-guard.test.mjs  4.7K
auto-research-weekly-digest.test.mjs  4.7K
autonomous-loop-defer.test.mjs  11.5K

### Assistant | 2026-05-25T02:46:37.234Z

Let me look at an existing pre-tool hook pattern to match conventions.

### Assistant | 2026-05-25T02:46:37.506Z

[tool_use: Glob]

### User | 2026-05-25T02:46:41.446Z

[tool_result] .claude\hooks\pre-tool-p1.mjs
.claude\hooks\pre-tool-savings-multi.mjs
.claude\hooks\__tests__\pre-tool-savings-multi.test.mjs
.claude\hooks\__tests__\pre-tool-bash-rtk-enforce.test.mjs
.claude\hooks\pre-tool-bash-rtk-enforce.mjs

### Assistant | 2026-05-25T02:46:43.966Z

[tool_use: Read]

### User | 2026-05-25T02:46:49.665Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * pre-tool-savings-multi.mjs — multi-PreToolUse advisory hook
5	 *
6	 * PSN-TOOL-SAVINGS-MULTI/U-PTSM01 (2026-05-24, slot:alpha)
7	 *
8	 * Single hook, dispatches on tool_name. Covers four tool classes the prior
9	 * coverage gap missed: Grep / Glob / Write / Bash-git. Each emits a 1-line
10	 * advisory when an empirically-wasteful pattern is detected.

... [+14179 chars truncated]

### Assistant | 2026-05-25T02:46:53.242Z

Good pattern reference. Now let me check an existing test file and write the hook + tests.

### Assistant | 2026-05-25T02:46:54.172Z

[tool_use: Read]

### User | 2026-05-25T02:47:01.755Z

[tool_result] 1	import { test } from "node:test";
2	import assert from "node:assert/strict";
3	import { classifyGrep, classifyGlob, classifyWrite, classifyBashGit, classifyBashNode, classifyRead, classifyWebSearch } from "../pre-tool-savings-multi.mjs";
4	
5	// === Grep ===
6	test("classifyGrep: short pattern + broad path + content mode → nudge", () => {
7	  const r = classifyGrep({ pattern: "token", path: "", 
... [+3089 chars truncated]

### Assistant | 2026-05-25T02:47:04.348Z

Now I have the conventions. Let me write the hook and tests.

### Assistant | 2026-05-25T02:47:58.456Z

[tool_use: Write]

### User | 2026-05-25T02:48:29.941Z

[tool_result] File created successfully at: H:/prism/.claude/hooks/pre-tool-router-table-advise.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T02:48:32.732Z

Hook is created. Now writing the test file with ≥5 cases.

### Assistant | 2026-05-25T02:49:14.305Z

[tool_use: Write]

### User | 2026-05-25T02:49:36.613Z

[tool_result] File created successfully at: H:/prism/.claude/hooks/__tests__/pre-tool-router-table-advise.test.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T02:49:36.881Z

You've hit your session limit · resets 1am (America/Chicago)
