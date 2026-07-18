---
type: "chat-session"
source: "claude-code-cli"
session_id: "de04081e-6889-4962-be91-a88a11910e43"
title: "T8 in 5-agent fan-out. ~250-350 words. Read-only. AXIS: **MCP dispatcher route-s"
date: "2026-05-17"
first_ts: "2026-05-17T05:42:11.296Z"
last_ts: "2026-05-17T05:42:13.505Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-a96c74409fa52b4cc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# T8 in 5-agent fan-out. ~250-350 words. Read-only. AXIS: **MCP dispatcher route-s

> **claude-code-cli** | 2026-05-17 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-a96c74409fa52b4cc.jsonl`

## Transcript

### User | 2026-05-17T05:42:11.296Z

T8 in 5-agent fan-out. ~250-350 words. Read-only.

AXIS: **MCP dispatcher route-suggest coverage** (the very hook that just injected "Route first: prefer prism_session:dispatcher_map_compact, prism_session:action_search, and prism_session:tool_route_best before broad shell exploration")

Per the auto-inject: 3 dispatcher actions exist for route-discovery. Is the discovery layer complete? Are these actions wired? Do they cover the surfaces chats actually need?

PROTOCOL:
1. `Bash grep -n "tool_route_best\|action_search\|dispatcher_map_compact" H:/prism/mcp-server/src/tools/dispatchers/sessionDispatcher.ts 2>&1 | head -10`
2. `Bash grep -n "tool_route_best\|action_search\|dispatcher_map_compact" H:/prism/mcp-server/src/schemas/sessionActionSchemas.ts 2>&1 | head -10`
3. Identify which user/agent surfaces SHOULD invoke these (skill auto-suggest? Stop hook? UserPromptSubmit?)

Return:
```
## T8 — Route-suggest actions wired state
- tool_route_best: handler exists yes/no | schema yes/no | called from N hooks
- action_search: same
- dispatcher_map_compact: same

## T8 — Coverage gap
- which chat-entry surfaces SHOULD invoke but don't
- e.g. mcp-route-suggest.mjs already classified but may not call these specific actions

## T8 — Unit proposal
- name: U-MCP-ROUTE-SUGGEST-COVERAGE
- owner-slot: <bravo|delta>
- cost: <S|M>
```

### Assistant | 2026-05-17T05:42:13.505Z

You've hit your limit · resets 3:50am (America/Chicago)
