---
type: "chat-session"
source: "claude-code-cli"
session_id: "a61bbf34-4093-44f3-a8af-e68d61dc41a9"
title: "Review H:\\prism\\scripts\\system-viz-node-dispatch.mjs end-to-end. CONTEXT: New 23"
date: "2026-05-17"
first_ts: "2026-05-17T04:42:42.978Z"
last_ts: "2026-05-17T04:44:33.873Z"
cwd: "H:\\prism"
messages: 14
user_msgs: 5
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-a767d258e453c436e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Review H:\prism\scripts\system-viz-node-dispatch.mjs end-to-end. CONTEXT: New 23

> **claude-code-cli** | 2026-05-17 | 14 msgs (5 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-a767d258e453c436e.jsonl`

## Transcript

### User | 2026-05-17T04:42:42.978Z

Review H:\prism\scripts\system-viz-node-dispatch.mjs end-to-end.

CONTEXT: New 230-LOC script for SYSTEM-VIZ-BRAIN-MS0 / U-P2-NODE-CLICK-DISPATCH (BACKEND SLICE). Pure resolver `routeNode(node) → {dispatcher, action, args, confidence, reason}` that maps a system-viz graph node id to a dispatcher action route. Frontend hookup (binding click events on the /system-viz canvas) is intentionally deferred — mcp-server/web/ is peer-claim contention.

Resolution rules in precedence order:
1. wiki_entry action node (`wiki.architecture.actions_<dispatcher>_<action>`) → DIRECT route confidence 1.0
2. dispatcher_router node (`formula.adjusted.<name>dispatcher`) → prism_session:dispatcher_map_compact
3. unit node (`ghost.ms.<slug>.u-<id>`, kind=planned-unit|priority-unit|bridge-unit|misc-task) → prism_dev:roadmap_tool_plan_query with unit_id
4. milestone node (`ghost.ms.<slug>`, kind=milestone) → prism_dev:roadmap_tool_plan_query with milestone_id
5. engine node (kind=engine) → prism_session:engine_dependents with engine label
6. fallback → prism_session:master_index_query with label as query

41/41 tests PASS including real-data E2E against the live 145K-node system-graph.

REVIEW TARGETS (P0/P1 only):

1. **ID-parser precedence + correctness** — `parseActionWikiId` uses `wiki\.architecture\.actions_([^_]+)_(.+)`. The first capture group is `[^_]+` so it stops at the first underscore. Action wiki IDs like `wiki.architecture.actions_calc_gcode-envelope` split into dispatcher=`calc`, action=`gcode-envelope`. But what about edge cases where the dispatcher name itself contains a hyphen or where the wiki id has nested underscores? Check: `wiki.architecture.actions_adaptivecontrol_acal` → adaptivecontrol/acal. `wiki.architecture.actions_cam_cam-hypermill-inhost-frame-to-envelope` → cam/cam-hypermill-inhost-frame-to-envelope (kebab → snake later). Is the first-underscore split robust to all live action ids?

2. **canonicalizeAction kebab→snake** — `raw.replace(/-/g, "_").toLowerCase()`
... [+2544 chars truncated]

### Assistant | 2026-05-17T04:42:49.288Z

I'll review the script end-to-end against the live system.

### Assistant | 2026-05-17T04:42:49.479Z

[tool_use: Read]

### User | 2026-05-17T04:42:50.524Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/system-viz-node-dispatch.mjs
3	//
4	// SYSTEM-VIZ-BRAIN-MS0 / U-P2-NODE-CLICK-DISPATCH (backend slice)
5	//
6	// Pure resolver: system-viz node id → dispatcher action route.
7	//
8	// The frontend hookup (binding click events on the /system-viz canvas to
9	// invoke this resolver + the resulting dispatcher action) is intentionally
10	// scoped out — `mcp-server/w
... [+11437 chars truncated]

### Assistant | 2026-05-17T04:42:53.190Z

Now let me verify the live action wiki id shapes and assess the parsing edge cases.

### Assistant | 2026-05-17T04:42:55.881Z

[tool_use: Bash]

### User | 2026-05-17T04:43:08.859Z

[tool_result] <--- Last few GCs --->

[44108:0000022BB8A91000]     1199 ms: Mark-Compact (reduce) 3.4 (6.0) -> 3.3 (5.0) MB, pooled: 0 MB, 3.76 / 0.00 ms  (average mu = 0.997, current mu = 0.997) last resort; GC in old space requested
[44108:0000022BB8A91000]     1200 ms: Mark-Compact (reduce) 3.3 (5.0) -> 3.3 (5.0) MB, pooled: 0 MB, 1.61 / 0.00 ms  (average mu = 0.996, current mu = 0.007) last resort; GC in
... [+883 chars truncated]

### Assistant | 2026-05-17T04:43:11.526Z

Heap OOM on parsing the 145K-node graph directly. Let me use a streaming approach.

### Assistant | 2026-05-17T04:43:15.591Z

[tool_use: Bash]

### User | 2026-05-17T04:43:32.409Z

[tool_result] total: 9242
{"id":"wiki.architecture.actions_adaptivecontrol_acal","label":"adaptiveControl:`acal`"}
{"id":"wiki.architecture.actions_adaptivecontrol_adachat","label":"adaptiveControl:`adaChat`"}
{"id":"wiki.architecture.actions_adaptivecontrol_adachip","label":"adaptiveControl:`adaChip`"}
{"id":"wiki.architecture.actions_adaptivecontrol_adaover","label":"adaptiveControl:`adaOver`"}
{"id":"wiki.ar
... [+1330 chars truncated]

### Assistant | 2026-05-17T04:43:37.224Z

Critical evidence collected. The label preserves camelCase (`adaptiveControl`); the id lowercases it (`adaptivecontrol`). Let me check dispatcher names with hyphens and dispatcher router shapes.

### Assistant | 2026-05-17T04:43:44.417Z

[tool_use: Bash]

### User | 2026-05-17T04:44:07.167Z

[tool_result] unique dispatcher tokens: 88
adaptivecontrol agent aireasoning algorithm atcs auth automation autonomous autopilot bridge business cad cadautomation cadregression calc cam camfunction cncops compliance context cpl data dev diagnosis document edm export feasibility fiveaxis formingcasting generator grinding gsd guard holepattern hook inbox industry infra intake
--- dispatcher routers ---
{"id":"for
... [+2108 chars truncated]

### Assistant | 2026-05-17T04:44:33.873Z

Sufficient evidence. Final assessment.

## Code Quality Analysis Report — `scripts/system-viz-node-dispatch.mjs`

### Verdict: **FAIL** (2 P0, 2 P1)

### P0 Findings

**P0-1 — `parseActionWikiId` loses dispatcher camelCase identity (lossy contract).** Live data confirms the loss is systematic: id `wiki.architecture.actions_adaptivecontrol_acal` but label `adaptiveControl:\`acal\``. Across 9,242 action nodes the id ALWAYS lowercases the dispatcher token (88 unique tokens, all flattened). The resolver emits `dispatcher: "adaptivecontrol"` which is NOT a valid MCP dispatcher name — real ones are camelCase (`adaptiveControl`, `aiReasoning`, `camFunction`, `cadAutomation`, `turningProgram`, `formingCasting`). Downstream `prism_session:dispatcher_map_compact({dispatcher:"adaptivecontrol"})` will MISS. Fix: parse `node.label` (preserves case + already has the canonical form `dispatcher:\`action\``) and only fall back to id when label is absent. Lines 95–101.

**P0-2 — `canonicalizeAction` corrupts known-canonical action names from labels.** The `actions/<…>` ledger uses snake_case canonical names (label shows `adaptive_chatter_analyze`), but the id stores kebab (`adaptive-chatter-analyze`). `raw.replace(/-/g,"_").toLowerCase()` happens to work for these — BUT for actions like `acal`/`adaChat`/`adaChip`/`adaOver`/`adaTherm` the id lowercases (`adachat`) and the label preserves (`adaChat`). The resolver emits `action:"adachat"` while the dispatcher's `z.enum` contract expects `adaChat`. Sampled 15 nodes: 5/15 have camelCase action names that this resolver mangles. Same fix as P0-1: prefer `node.label` parsing.

### P1 Findings

**P1-1 — Fallback confidence 0.50 is too high for unknown shapes.** Per review target #4, an unknown `wiki_entry` with `kind:"wiki-leaf"` falls to master_index_query at 0.5 — but the right answer for many shapes is "don't act." Recommend ≤0.30 for fallback so a click-handler can gate UI on `confidence ≥ 0.5`.

**P1-2 — Schema-drift defense is silent.*
... [+1543 chars truncated]
