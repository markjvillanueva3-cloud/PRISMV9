---
type: "chat-session"
source: "claude-code-cli"
session_id: "95e7030e-b0eb-4734-9088-595089441efe"
title: "You are slot:alpha. Build a unified router-table that covers ALL identified tool"
date: "2026-05-25"
first_ts: "2026-05-25T02:44:23.638Z"
last_ts: "2026-05-25T02:49:35.635Z"
cwd: "H:\\prism"
messages: 37
user_msgs: 14
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/95e7030e-b0eb-4734-9088-595089441efe/subagents/agent-a46c7648c2a7b7dcb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# You are slot:alpha. Build a unified router-table that covers ALL identified tool

> **claude-code-cli** | 2026-05-25 | 37 msgs (14 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/95e7030e-b0eb-4734-9088-595089441efe/subagents/agent-a46c7648c2a7b7dcb.jsonl`

## Transcript

### User | 2026-05-25T02:44:23.638Z

You are slot:alpha. Build a unified router-table that covers ALL identified tool-surface candidates with a single lookup.

## Task
Create `H:/prism/scripts/lib/token-savings-router-table.mjs` — a pure data-table mapping every known tool-surface ID to a suggested coverage path:
- `{ kind: "rtk-wrap", base: "git" }` — wrap with RTK
- `{ kind: "mcp-route", to: "prism_xxx:action" }` — route via MCP dispatcher
- `{ kind: "ollama-offload", skill: "/ollama-summarize" }` — local LLM offload
- `{ kind: "skill", name: "/master-index" }` — use a slash command
- `{ kind: "advisory", reason: "..." }` — no auto-action, surface a tip

## How
1. Read the candidate list from `H:/prism/state/shared/dashboards/token-savings-top-roi-candidates.json` (produced by Agent 1) IF it exists. If not, use a synthetic 20-entry sample for the table seed (your decision).
2. For each entry, classify into one of the 5 kinds above using ID-pattern heuristics:
   - `hook.*` → `advisory` (hooks are themselves advisory)
   - `action.*` matching dispatcher prefix → `mcp-route`
   - `skill.*` matching `/ollama-*` → `ollama-offload`
   - `cmd.*`/`slash.*` → `skill`
   - `rtk.*` → `rtk-wrap`
   - rest → `advisory`
3. Emit a Map keyed by node ID.

## Exports
- `const ROUTER_TABLE` (the Map literal, frozen)
- `function lookupRoute(nodeId) → entry | null`
- `function buildRouterTableFromCandidates(rankedCandidates) → Map` (the builder used at module load)

## Tests
Create `H:/prism/scripts/lib/__tests__/token-savings-router-table.test.mjs` with ≥7 cases:
- lookupRoute: known hook → advisory, known action → mcp-route, known skill → skill, unknown → null
- buildRouterTableFromCandidates: empty → empty, sample input → correct categorization
- Frozen table: cannot mutate

## DO NOT
- Don't commit. Parent batch-commits.
- Don't depend on the audit JSON existing at module-load — load lazily.

## Return
File paths + test count. Under 80 words.

### Assistant | 2026-05-25T02:44:31.502Z

I'll build the router-table module and its tests.

### Assistant | 2026-05-25T02:44:32.634Z

[tool_use: Bash]

### User | 2026-05-25T02:44:53.658Z

[tool_result] /usr/bin/ls: cannot access 'H:/prism/state/shared/dashboards/token-savings-top-roi-candidates.json': No such file or directory
detector-bandit-tune.test.mjs  12.7K
rtk-fraction-tune.test.mjs  8.6K
system-viz-find-cache.test.mjs  14.9K

### Assistant | 2026-05-25T02:44:56.310Z

Noted, I'll use Glob for file discovery going forward. The candidates JSON doesn't exist yet, so I'll seed with synthetic 20-entry sample.

### Assistant | 2026-05-25T02:45:30.908Z

[tool_use: Write]

### User | 2026-05-25T02:45:40.309Z

[tool_result] File created successfully at: H:/prism/scripts/lib/token-savings-router-table.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T02:45:42.866Z

I'll address the section dividers (the linter flagged them as commented-out code blocks) and write the tests next.

### Assistant | 2026-05-25T02:45:47.096Z

[tool_use: Edit]

### User | 2026-05-25T02:45:57.013Z

[tool_result] The file H:/prism/scripts/lib/token-savings-router-table.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T02:45:59.593Z

Noted, will rely on default constant since env validation isn't core to this module.

### Assistant | 2026-05-25T02:46:02.665Z

[tool_use: Edit]

### User | 2026-05-25T02:46:21.050Z

[tool_result] The file H:/prism/scripts/lib/token-savings-router-table.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T02:46:24.362Z

The env-var was already removed. Now I'll remove the remaining section-divider comment blocks (the linter flagged these as "large commented-out code blocks") and the `CANDIDATE_JSON` reference (now `DEFAULT_CANDIDATE_JSON`).

### Assistant | 2026-05-25T02:46:25.772Z

[tool_use: Edit]

### User | 2026-05-25T02:46:34.703Z

[tool_result] The file H:/prism/scripts/lib/token-savings-router-table.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T02:46:38.423Z

[tool_use: Edit]

### User | 2026-05-25T02:46:45.994Z

[tool_result] The file H:/prism/scripts/lib/token-savings-router-table.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T02:46:50.331Z

[tool_use: Edit]

### User | 2026-05-25T02:47:01.147Z

[tool_result] The file H:/prism/scripts/lib/token-savings-router-table.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T02:47:06.625Z

[tool_use: Edit]

### User | 2026-05-25T02:47:14.390Z

[tool_result] The file H:/prism/scripts/lib/token-savings-router-table.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T02:47:17.366Z

The advisory is mistaken — `DEFAULT_CANDIDATE_JSON` IS defined at the top of the module (replaced `CANDIDATE_JSON` earlier). Let me verify and continue removing the remaining divider comments.

### Assistant | 2026-05-25T02:47:18.428Z

[tool_use: Grep]

### User | 2026-05-25T02:47:23.241Z

[tool_result] 19:const DEFAULT_CANDIDATE_JSON =
131:function loadCandidatesFromDisk(path = DEFAULT_CANDIDATE_JSON) {

### Assistant | 2026-05-25T02:47:25.541Z

Confirmed defined. Continuing to clean up remaining divider comments.

### Assistant | 2026-05-25T02:47:27.547Z

[tool_use: Edit]

### User | 2026-05-25T02:47:45.136Z

[tool_result] The file H:/prism/scripts/lib/token-savings-router-table.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T02:47:49.625Z

[tool_use: Edit]

### User | 2026-05-25T02:48:04.914Z

[tool_result] The file H:/prism/scripts/lib/token-savings-router-table.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T02:48:08.899Z

Noted. Final divider removal then I'll write the tests.

### Assistant | 2026-05-25T02:48:11.051Z

[tool_use: Edit]

### User | 2026-05-25T02:48:37.772Z

[tool_result] The file H:/prism/scripts/lib/token-savings-router-table.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T02:48:40.904Z

Now the test file. Note: the task spec says `H:/prism/scripts/lib/__tests__/token-savings-router-table.test.mjs` but the existing convention in `scripts/lib/__tests__/` shows tests live there.

### Assistant | 2026-05-25T02:49:18.989Z

[tool_use: Write]

### User | 2026-05-25T02:49:35.282Z

[tool_result] File created successfully at: H:/prism/scripts/lib/__tests__/token-savings-router-table.test.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T02:49:35.635Z

You've hit your session limit · resets 1am (America/Chicago)
