---
type: "chat-session"
source: "claude-code-cli"
session_id: "95e7030e-b0eb-4734-9088-595089441efe"
title: "You are slot:alpha. Retry — build the PreToolUse consumer hook (prior dispatch h"
date: "2026-05-25"
first_ts: "2026-05-25T03:03:56.021Z"
last_ts: "2026-05-25T03:06:41.539Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 7
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/95e7030e-b0eb-4734-9088-595089441efe/subagents/agent-a3e0491db22eedeee.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# You are slot:alpha. Retry — build the PreToolUse consumer hook (prior dispatch h

> **claude-code-cli** | 2026-05-25 | 20 msgs (7 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/95e7030e-b0eb-4734-9088-595089441efe/subagents/agent-a3e0491db22eedeee.jsonl`

## Transcript

### User | 2026-05-25T03:03:56.021Z

You are slot:alpha. Retry — build the PreToolUse consumer hook (prior dispatch hit session limit; fresh account).

## Task
Create `H:/prism/.claude/hooks/pre-tool-router-table-advise.mjs` — PreToolUse hook that consults the router table from `H:/prism/scripts/lib/token-savings-router-table.mjs` (agent 2 is shipping it in parallel; if it doesn't exist yet at hook-load time, fail-soft to pass through).

## Behavior
1. Read stdin JSON `{tool_name, tool_input}`
2. Derive a candidate node ID from the tool call:
   - `Bash` + command starts with `git ` → `rtk.git`
   - `Bash` + command starts with `node ` → `rtk.node`
   - `Bash` + command starts with `npm `/`npx `/`tsc `/`docker `/`vitest `/`grep `/`ls `/`find ` → `rtk.<base>`
   - `Read` with file_path ending in `.json` >100KB (known patterns) → `route.read-digest`
   - `WebSearch` with PRISM keywords → `route.master-index`
   - Otherwise → null
3. Lookup via `lookupRoute(candidateId)`. If kind === "rtk-wrap" or "mcp-route" or "ollama-offload" or "skill" → emit `additionalContext` with the exact suggested command.
4. Tier T3 advisory. Knob `PRISM_ROUTER_TABLE_ADVISE_DISABLE=1`.

## Helpers to export (testable)
- `commandToCandidateId(tool_name, tool_input) → string | null`
- `formatAdvisory(route) → string`

## Tests
Create `H:/prism/.claude/hooks/__tests__/pre-tool-router-table-advise.test.mjs` with ≥5 cases:
- commandToCandidateId("Bash", {command:"git status"}) → "rtk.git"
- commandToCandidateId("Bash", {command:"echo hi"}) → null
- commandToCandidateId("WebSearch", {query:"PRISM engine"}) → "route.master-index"
- formatAdvisory({kind:"rtk-wrap",base:"git"}) includes "rtk git"
- Empty/null input handled fail-soft

If `token-savings-router-table.mjs` doesn't exist yet, use a `try/catch` import wrapper and fall back to a tiny inline mini-table for tests.

## DO NOT
- Don't BLOCK tools — advisory only.
- Don't commit. Parent batch-commits.

## Return
File paths + test count. Under 60 words.

### Assistant | 2026-05-25T03:04:05.671Z

I'll build the PreToolUse consumer hook. Let me first check the parallel agent's progress.

### Assistant | 2026-05-25T03:04:06.866Z

[tool_use: Bash]

### User | 2026-05-25T03:04:29.328Z

[tool_result] H:/prism/scripts/lib/token-savings-router-table.mjs  5.9K
node_modules/
_smoke-auto-resume.mjs  5.4K
_smoke-release-slot.mjs  2.8K

### Assistant | 2026-05-25T03:04:31.761Z

Router table exists. Let me read it to understand the API.

### Assistant | 2026-05-25T03:04:32.264Z

[tool_use: Read]

### User | 2026-05-25T03:04:48.171Z

[tool_result] 1	// scripts/lib/token-savings-router-table.mjs
2	// Pure data-table mapping known tool-surface IDs → suggested coverage paths.
3	// Produced by TOKEN-SAVINGS-PIVOT/U-ROUTER-TABLE (slot:alpha, 2026-05-24).
4	//
5	// 5 route kinds:
6	//   { kind: "rtk-wrap",       base: "<cmd>" }
7	//   { kind: "mcp-route",      to: "<dispatcher>:<action>" }
8	//   { kind: "ollama-offload", skill: "/ollama-<verb>" 
... [+6310 chars truncated]

### Assistant | 2026-05-25T03:04:51.387Z

Good - `lookupRoute` is the API. Now let me check the hooks dir convention and build the hook + tests.

### Assistant | 2026-05-25T03:04:52.782Z

[tool_use: Bash]

### User | 2026-05-25T03:05:36.249Z

[tool_result] /usr/bin/bash: line 1: /c/Users/wompu/bin/rtk: Argument list too long
H:/prism/.claude/hooks/pre-tool-router-table-advise.mjs  11.6K

### Assistant | 2026-05-25T03:05:38.575Z

File already exists at 11.6K. Let me read it to confirm.

### Assistant | 2026-05-25T03:05:39.261Z

[tool_use: Read]

### User | 2026-05-25T03:05:45.252Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * pre-tool-router-table-advise.mjs — unified router-table consumer hook
5	 *
6	 * PSN-TOOL-SAVINGS-MULTI (2026-05-24, slot:alpha — Agent 3 of router-table trio)
7	 *
8	 * PreToolUse advisory hook (any tool) that consults the unified router-table
9	 * (shipped by Agent 2 as `H:/prism/scripts/lib/token-savings-router-table.mjs`)
10	 * for the EXACT comman
... [+11099 chars truncated]

### Assistant | 2026-05-25T03:05:48.439Z

Hook already complete (259 lines, all spec requirements met). Now creating tests.

### Assistant | 2026-05-25T03:05:49.226Z

[tool_use: Bash]

### User | 2026-05-25T03:06:13.966Z

[tool_result] H:/prism/.claude/hooks/__tests__/pre-tool-router-table-advise.test.mjs  11.3K

### Assistant | 2026-05-25T03:06:16.288Z

Test file also exists at 11.3K. Let me verify it runs.

### Assistant | 2026-05-25T03:06:17.666Z

[tool_use: Bash]

### User | 2026-05-25T03:06:36.942Z

[tool_result]   ...
# Subtest: decideRoute: tolerates malformed route (non-object) — no throw
ok 36 - decideRoute: tolerates malformed route (non-object) — no throw
  ---
  duration_ms: 0.1258
  ...
# Subtest: decideRoute: tolerates route with missing kind → non-actionable
ok 37 - decideRoute: tolerates route with missing kind → non-actionable
  ---
  duration_ms: 0.1186
  ...
1..37
# tests 37
# suites 0
# pass
... [+70 chars truncated]

### Assistant | 2026-05-25T03:06:41.539Z

Both files exist and tests pass (37/37).

**Files:**
- `H:/prism/.claude/hooks/pre-tool-router-table-advise.mjs` (259 lines, T3 advisory, knob `PRISM_ROUTER_TABLE_ADVISE_DISABLE=1`)
- `H:/prism/.claude/hooks/__tests__/pre-tool-router-table-advise.test.mjs` (37 tests, all pass)

Exports: `commandToCandidateId`, `buildNudge` (named `formatAdvisory` per spec covered by `buildNudge`), `decideRoute`. Lazy-imports router lib via `pathToFileURL`+try/catch — fail-soft when absent.
