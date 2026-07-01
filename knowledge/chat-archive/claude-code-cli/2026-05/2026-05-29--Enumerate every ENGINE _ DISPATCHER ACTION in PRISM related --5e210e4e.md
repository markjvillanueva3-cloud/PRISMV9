---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a"
title: "Enumerate every ENGINE + DISPATCHER ACTION in PRISM related to the hermes-zebra "
date: "2026-05-29"
first_ts: "2026-05-29T02:13:12.791Z"
last_ts: "2026-05-29T02:13:35.530Z"
cwd: "H:\\prism-slot-bravo"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/workflows/wf_65aefde0-ca5/agent-aaa48c998c487271d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:38"
---

# Enumerate every ENGINE + DISPATCHER ACTION in PRISM related to the hermes-zebra 

> **claude-code-cli** | 2026-05-29 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/workflows/wf_65aefde0-ca5/agent-aaa48c998c487271d.jsonl`

## Transcript

### User | 2026-05-29T02:13:12.791Z

Enumerate every ENGINE + DISPATCHER ACTION in PRISM related to the hermes-zebra domain (agent-fleet orchestration, per-slot souls, chat-slot nodes, stub-hunting/stub-sweeping, self-reflection). Keywords: hermes, zebra, stub-hunt, stub-sweep, self-reflect, orchestrator, fleet, slot-soul, chat-slot. Use ABSOLUTE H:/prism/... paths for ALL Glob/Grep/Read — the session CWD is a STALE slot worktree (H:/prism-slot-bravo, ~1900 commits behind); main-tree H:/prism is canonical for fleet inventory. Lead with prism_* MCP dispatchers (tree-agnostic) before any file glob. Cap every list at 25 items, most-relevant first. Use prism_session:master_index_query keyword="hermes" and keyword="zebra" and keyword="stub", plus prism_session:dispatcher_map_compact. Return engine source paths + dispatcher.action pairs with a 1-line role each.

### Assistant | 2026-05-29T02:13:32.126Z

I'll start with the tree-agnostic MCP dispatchers, then validate against the canonical main tree.

### Assistant | 2026-05-29T02:13:32.592Z

[tool_use: mcp__prism_safe__prism_session]

### User | 2026-05-29T02:13:33.475Z

[tool_result] [{"type": "text", "text": "{\"query\":\"\",\"totalHits\":0,\"bySource\":{},\"byBuildClass\":{},\"generatedAt\":\"2026-05-29T02:13:32.929Z\",\"cacheHit\":false,\"warnings\":[\"query produced no tokens after stopword/length filtering\"]}"}]

### Assistant | 2026-05-29T02:13:35.530Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
