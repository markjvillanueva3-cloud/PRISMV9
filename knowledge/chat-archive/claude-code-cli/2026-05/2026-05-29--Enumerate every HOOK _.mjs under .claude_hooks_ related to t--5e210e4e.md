---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a"
title: "Enumerate every HOOK (.mjs under .claude/hooks) related to the hermes-zebra doma"
date: "2026-05-29"
first_ts: "2026-05-29T02:13:12.830Z"
last_ts: "2026-05-29T02:13:44.885Z"
cwd: "H:\\prism-slot-bravo"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/workflows/wf_65aefde0-ca5/agent-a377b26879cf81aaf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:38"
---

# Enumerate every HOOK (.mjs under .claude/hooks) related to the hermes-zebra doma

> **claude-code-cli** | 2026-05-29 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/workflows/wf_65aefde0-ca5/agent-a377b26879cf81aaf.jsonl`

## Transcript

### User | 2026-05-29T02:13:12.830Z

Enumerate every HOOK (.mjs under .claude/hooks) related to the hermes-zebra domain. Keywords: hermes, zebra, stub-hunt, stub-sweep, self-reflect, orchestrator, fleet, slot-soul, chat-slot. Use ABSOLUTE H:/prism/... paths for ALL Glob/Grep/Read — the session CWD is a STALE slot worktree (H:/prism-slot-bravo, ~1900 commits behind); main-tree H:/prism is canonical for fleet inventory. Lead with prism_* MCP dispatchers (tree-agnostic) before any file glob. Cap every list at 25 items, most-relevant first. Glob H:/prism/.claude/hooks/*.mjs and grep their headers for the keywords; classify each by event (PreToolUse / UserPromptSubmit / SessionStart / Stop / SubagentStart) and 1-line purpose. Prioritize: slot-context-bundle-inject, slot-soul-inject, comprehensive-build-enforce, stop_on_unwired_assets, and any zebra-*/hermes-*/stub-* hooks.

### Assistant | 2026-05-29T02:13:32.971Z

I'll start with tree-agnostic MCP dispatchers, then glob the canonical main-tree hooks directory.

### Assistant | 2026-05-29T02:13:34.937Z

[tool_use: mcp__prism_safe__prism_session]

### Assistant | 2026-05-29T02:13:35.097Z

[tool_use: Glob]

### User | 2026-05-29T02:13:42.027Z

[tool_result] [{"type": "text", "text": "{\"query\":\"hermes zebra stub-hunt self-reflect orchestrator fleet slot-soul chat-slot hook\",\"totalHits\":20,\"hits\":[{\"source\":\"engine\",\"id\":\"HookOrchestratorEngine\",\"label\":\"HookOrchestratorEngine\",\"path\":\"src/engines/HookOrchestratorEngine.ts\",\"confidence\":0.08888888888888889,\"utilization\":0,\"buildClass\":\"unknown\"},{\"source\":\"engine\",\"
... [+4496 chars truncated]

### User | 2026-05-29T02:13:42.704Z

[tool_result] H:/prism/.claude/hooks\agent-boundary-guard.mjs
H:/prism/.claude/hooks\agent-pid-tracker.mjs
H:/prism/.claude/hooks\agent-registry-load.mjs
H:/prism/.claude/hooks\agent-rules-inject.mjs
H:/prism/.claude/hooks\agent-util-log.mjs
H:/prism/.claude/hooks\agent-vs-direct.mjs
H:/prism/.claude/hooks\agent-worktree-stale-unlock.mjs
H:/prism/.claude/hooks\aggressive-killer-stop.mjs
H:/prism/.claude/hooks\a
... [+4754 chars truncated]

### Assistant | 2026-05-29T02:13:44.885Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
