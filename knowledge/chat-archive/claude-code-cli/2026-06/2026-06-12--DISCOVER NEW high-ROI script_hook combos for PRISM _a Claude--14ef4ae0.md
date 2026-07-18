---
type: "chat-session"
source: "claude-code-cli"
session_id: "14ef4ae0-3848-4f77-a942-662ceeccf00d"
title: "DISCOVER NEW high-ROI script+hook combos for PRISM (a Claude-Code manufacturing "
date: "2026-06-12"
first_ts: "2026-06-12T14:32:40.392Z"
last_ts: "2026-06-12T14:41:54.613Z"
cwd: "H:\\prism-slot-papa"
messages: 20
user_msgs: 9
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism-slot-papa/14ef4ae0-3848-4f77-a942-662ceeccf00d/subagents/workflows/wf_04e4f627-12e/agent-ab6fc7fc5cc86689a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:05"
---

# DISCOVER NEW high-ROI script+hook combos for PRISM (a Claude-Code manufacturing 

> **claude-code-cli** | 2026-06-12 | 20 msgs (9 user / 11 assistant) | cwd: H:\prism-slot-papa
> Raw: `H:/.claude/projects/H--prism-slot-papa/14ef4ae0-3848-4f77-a942-662ceeccf00d/subagents/workflows/wf_04e4f627-12e/agent-ab6fc7fc5cc86689a.jsonl`

## Transcript

### User | 2026-06-12T14:32:40.392Z

DISCOVER NEW high-ROI script+hook combos for PRISM (a Claude-Code manufacturing platform) focused on: token savings, context retention, learning from mistakes, system intelligence, slash-command/dev-pipeline efficiency. Do NOT repeat the 2026-06-11 efficiency queue (ollama-route-auto, tribal-embed-index, scrutiny-escape-hatch, resolveExecutor, grep-cache, model-routing) or the 2026-05-18 findings (sidecar, autostart-coalesce, viz-first auto-invoke, obsidian-precheck). Survey the actual hook surface: 'ls H:/prism/.claude/hooks/*.mjs | wc -l' and 'grep -c hooks H:/prism/.claude/settings.json'. Look for: (a) hooks that fire thousands of times but provide low value (noise to cut), (b) expensive operations repeated without caching, (c) read-chains that a smarter inject could short-circuit, (d) learning loops that capture but never re-surface. For each NEW combo output: [name | trigger | what it saves | est tokens/session | LOC estimate | wiring]. Rank by ROI = impact/effort. Aim for 5-8 genuinely new, file-cited ideas.

### Assistant | 2026-06-12T14:32:46.941Z

I'll survey the actual hook surface before generating recommendations.

### Assistant | 2026-06-12T14:32:47.943Z

[tool_use: Bash]

### Assistant | 2026-06-12T14:32:48.240Z

[tool_use: Bash]

### User | 2026-06-12T14:33:48.716Z

[tool_result] 212

### User | 2026-06-12T14:33:49.037Z

[tool_result] 780

### Assistant | 2026-06-12T14:33:52.672Z

780 hooks, 212 hook references. Let me now look at the actual wired hooks, their fire frequencies, and identify expensive repeated operations.

### Assistant | 2026-06-12T14:33:56.823Z

[tool_use: Bash]

### Assistant | 2026-06-12T14:34:00.218Z

[tool_use: Bash]

### User | 2026-06-12T14:34:39.047Z

[tool_result] Total wired: 186
By phase: {"UserPromptSubmit":23,"PreToolUse":38,"PostToolUse":54,"Stop":37,"SessionStart":33,"SubagentStart":1}

### User | 2026-06-12T14:36:25.488Z

[tool_result] PostToolUse          agent-pid-tracker.mjs                                   Agent
PostToolUse          anti-regression-auto-sweep.mjs                          Bash
PostToolUse          auto-bug-hunt-after-build.mjs                           Bash
PostToolUse          auto-lint-post-edit.mjs                                 Edit|Write|MultiEdit
PostToolUse          c-to-h-mirror.mjs                 
... [+13728 chars truncated]

### Assistant | 2026-06-12T14:36:30.107Z

[tool_use: Bash]

### Assistant | 2026-06-12T14:36:31.673Z

[tool_use: Bash]

### User | 2026-06-12T14:39:12.499Z

[tool_result] === .claude/hooks/wiki-precheck-inject.mjs ===
679 .claude/hooks/wiki-precheck-inject.mjs
#!/usr/bin/env node
// tier: T4
/**
 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
 *
 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
 * already in knowledge/wiki/index.md, inject the top-3 matching entries as
 * additionalContext so Claude doesn't re-derive what the wiki alr
... [+6802 chars truncated]

### User | 2026-06-12T14:40:43.678Z

[tool_result] Exit code 255

### Assistant | 2026-06-12T14:40:48.153Z

[tool_use: Bash]

### Assistant | 2026-06-12T14:40:49.774Z

[tool_use: Bash]

### User | 2026-06-12T14:41:44.059Z

[tool_result] === .claude/hooks/session-consolidate-graph.mjs ===
279 .claude/hooks/session-consolidate-graph.mjs
#!/usr/bin/env node
// tier: T4
/**
 * session-consolidate-graph.mjs — SessionEnd / Stop hook
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P1-U02.
 *
 * Maintains the deliverable counter at
 * `mcp-server/data/state/consolidation-counter.json` and POSTs
 * `prism_memory:record_session_end` to the running MCP. Th
... [+3242 chars truncated]

### User | 2026-06-12T14:41:53.612Z

[tool_result] === .claude/hooks/prompt-context-inject.mjs ===
147 .claude/hooks/prompt-context-inject.mjs
#!/usr/bin/env node
// tier: T4
/**
 * prompt-context-inject.mjs — UserPromptSubmit hook (PRISM-STAB-MS0/U-C2).
 *
 * Reads the pre-aggregated bundle written by the context-bundle daemon
 * (prism-awareness-bundle.mjs --daemon) and emits ONE compact injection
 * block per prompt. Replaces the per-prompt for
... [+4079 chars truncated]

### Assistant | 2026-06-12T14:41:54.613Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
