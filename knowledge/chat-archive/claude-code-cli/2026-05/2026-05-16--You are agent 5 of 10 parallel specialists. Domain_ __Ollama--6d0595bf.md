---
type: "chat-session"
source: "claude-code-cli"
session_id: "6d0595bf-26fa-4329-b16e-462ca941e240"
title: "You are agent 5 of 10 parallel specialists. Domain: **Ollama routing, local LLM "
date: "2026-05-16"
first_ts: "2026-05-16T02:58:10.333Z"
last_ts: "2026-05-16T02:59:40.277Z"
cwd: "H:\\prism\\mcp-server"
messages: 20
user_msgs: 9
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/6d0595bf-26fa-4329-b16e-462ca941e240/subagents/agent-a6bee560bb80aa358.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# You are agent 5 of 10 parallel specialists. Domain: **Ollama routing, local LLM 

> **claude-code-cli** | 2026-05-16 | 20 msgs (9 user / 11 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/6d0595bf-26fa-4329-b16e-462ca941e240/subagents/agent-a6bee560bb80aa358.jsonl`

## Transcript

### User | 2026-05-16T02:58:10.333Z

You are agent 5 of 10 parallel specialists. Domain: **Ollama routing, local LLM cascade, multi-chat queue sharing**.

CONTEXT: PRISM has 5 Ollama models loaded, 1 warm in VRAM. `ollama-task-offloader.mjs` routes code-explain/summarize/classify/lint to local qwen2.5-coder:7b. `ollama-unified-semantic-router.mjs` dispatches 214 hook calls. `OllamaHookBridgeEngine` exists. `ollama-pipeline-injector` (UserPromptSubmit) injects model recommendations for /forge-audit, /rgs etc. CLAUDE.md "Recent regressions" mentions ollama-pipeline-MS0 with 9% offload rate (target 30%). Across 10 chats, all sharing one Ollama instance — queue contention is real.

YOUR TASK:
1. `node H:/prism/scripts/system-viz-query.mjs find ollama` + `find offload` + `find local-ai`.
2. Read `H:/prism/.claude/hooks/ollama-task-offloader.mjs` + `ollama-unified-semantic-router.mjs` headers.
3. Read `H:/prism/mcp-server/data/state/ollama-offload-stats.json` if present (offload telemetry).
4. Check `ollama-routing-hint.json` if present.

DELIVERABLE (under 500 words):
- **Offload rate assessment**: what's the actual offload rate? Why is it below the 30% target? What categories are NOT being routed to local Ollama that COULD be?
- **Multi-chat Ollama queue**: 10 chats hitting one Ollama instance simultaneously — what's the queue depth? Is there a fair-share policy or first-come-first-serve? Does any chat starve?
- **Fleet-reaper coordination**: per CLAUDE.md, FLEET-REAPER-MS1 added a GPU/Ollama coordinator that writes routing hints. Is it actually firing? Is the threshold-delta clamp working?
- **Auto-invocation opportunities** (≤3): where SHOULD Ollama route that it currently doesn't? Specific hooks that could move from Claude → Ollama for explain/classify/summarize work.

Report in under 500 words.

### Assistant | 2026-05-16T02:58:19.212Z

I'll investigate Ollama routing, offload telemetry, and multi-chat queue behavior.

### Assistant | 2026-05-16T02:58:20.235Z

[tool_use: Bash]

### Assistant | 2026-05-16T02:58:20.725Z

[tool_use: Bash]

### Assistant | 2026-05-16T02:58:21.887Z

[tool_use: Bash]

### Assistant | 2026-05-16T02:58:22.213Z

[tool_use: Read]

### User | 2026-05-16T02:58:26.913Z

[tool_result] Found 30 node(s) matching "ollama":
  L3/ollama  ai.ollama.qwen               Ollama: qwen2.5-coder
  L3/ollama  ai.ollama.llama              Ollama: llama3.2
  L3/ollama  ai.ollama.embed              Ollama: embeddings
  L3/ollama  ai.ollama.reflect            Ollama: reflection
  L9/worktrees  wt.prism-iooms1              prism-iooms1
  L9/worktrees  wt.archived.intel-ollama-obsidian-ms0.parked 
... [+2495 chars truncated]

### User | 2026-05-16T02:58:34.140Z

[tool_result] Found 30 node(s) matching "offload":
  L3/ollama  ai.ollama.qwen               Ollama: qwen2.5-coder
  L3/ollama  ai.ollama.llama              Ollama: llama3.2
  L10/architecture  vault.wiki.architecture.actions.local.offload-classify offload-classify
  L10/architecture  vault.wiki.architecture.actions.local.offloader offloader
  L10/architecture  vault.wiki.architecture.actions.ml.offload-decide 
... [+2263 chars truncated]

### User | 2026-05-16T02:58:41.296Z

[tool_result] Found 0 node(s) matching "local-ai":

### User | 2026-05-16T02:58:43.077Z

[tool_result] 1	{
2	  "schemaVersion": "2.0.0",
3	  "lastUpdated": "2026-05-16T02:58:17.473Z",
4	  "lastReset": "2026-04-28T00:11:42.432Z",
5	  "offloaded": 7,
6	  "keptOnClaude": 87,
7	  "estimatedTokensSaved": 1061,
8	  "silentSuggestions": 24,
9	  "injectedSuggestions": 1,
10	  "byCategory": {
11	    "cache-hit": 2,
12	    "summary": 4,
13	    "explanation": 1
14	  },
15	  "byHook": {
16	    "ollama-task-off
... [+32582 chars truncated]

### Assistant | 2026-05-16T02:58:47.435Z

Acknowledged the hook hint. I already have the raw bytes I needed (offload counters + event log + fleet-reaper hint events). Continuing the investigation with the remaining files.

### Assistant | 2026-05-16T02:58:48.463Z

[tool_use: Read]

### Assistant | 2026-05-16T02:58:49.484Z

[tool_use: Read]

### User | 2026-05-16T02:58:49.591Z

[tool_result] 1	// tier: T4
2	// NOTE: no shebang. The hook runs via explicit `node X.mjs` in the harness's
3	// UserPromptSubmit chain — never chmod+x. vite's SSR transform does not strip
4	// a line-1 `#!` and injects its preamble above, stranding the `#!` mid-file
5	// and breaking vitest's import of this file. Removing it is the cleanest fix.
6	/**
7	 * ollama-task-offloader.mjs — UserPromptSubmit hook
8	 *
... [+8075 chars truncated]

### User | 2026-05-16T02:58:50.824Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * ollama-unified-semantic-router.mjs — UserPromptSubmit hook
5	 *
6	 * UNIFIED OLLAMA ROUTING LAYER
7	 *
8	 * Instead of 48 separate hooks each doing pattern matching:
9	 * 1. Collect ALL semantic signals in one pass
10	 * 2. Make ONE Ollama call with full context
11	 * 3. Return structured recommendations for all domains
12	 *
13	 * Replaces: *-inject.
... [+3608 chars truncated]

### Assistant | 2026-05-16T02:58:50.991Z

[tool_use: Bash]

### Assistant | 2026-05-16T02:58:53.681Z

[tool_use: Bash]

### User | 2026-05-16T02:58:56.996Z

[tool_result] {
  "schemaVersion": 1,
  "mode": "auto",
  "thresholdDelta": 0,
  "validUntil": "2026-05-16T03:03:38.401Z",
  "writtenAt": "2026-05-16T02:58:38.401Z",
  "writtenBy": "fleet-reaper-sweep",
  "reason": "commit 87.7% · gpuFree 9009MB · 0 alive slot(s) · qwen2.5-coder:7b already loaded · below pressure floor — no action"
}

### User | 2026-05-16T02:59:06.741Z

[tool_result] {"models":[]}---TAGS---
models: 5
  qwen2.5-coder:14b 9GB
  deepseek-r1:14b 9GB
  nomic-embed-text:latest 0GB
  qwen2.5-coder:32b 20GB
  qwen2.5-coder:7b 5GB

### Assistant | 2026-05-16T02:59:40.277Z

Acknowledged the doctrine reminder. I'm reporting findings on existing surfaces, not teaching a new workflow. Task tracker not needed for a single-agent diagnostic. Here's the report:

---

## Agent 5 Report: Ollama Routing / Local LLM Cascade

### 1. Offload rate assessment — **7.4%** (worse than CLAUDE.md's stale "9%" claim)

Live counters (`ollama-offload-stats.json`, since 2026-04-28 reset):
- `offloaded: 7` · `keptOnClaude: 87` · ratio **7.4%** (target 30%)
- `estimatedTokensSaved: 1061` total over ~3 weeks
- Per-hook: `ollama-task-offloader` fired 97x, only 5 offloads. `ollama-engine-api-extractor` is the only healthy producer (2/2 fired = offloaded).

**Root cause (visible in events 38-900):** ~80% of recent prompts are `/checkin-<slot> /loop /goal` orchestration. The `KEEP_ON_CLAUDE` list at line 102 of `ollama-task-offloader.mjs` correctly labels these `orchestration` and keeps them on Claude — that's CORRECT routing, but it tanks the visible ratio. The ratio metric is mis-framed: it counts orchestration prompts as denominator misses.

**Categories NOT routed that COULD be:** Many `category: "unknown"` events (lines 80, 103, 110, etc.) are genuine summarize/explain ("how many more units of obsidian intelligence do we have?", "do we have a good design idea"). These fall through both pattern lists with no match — silently `keep`. The PRISM-specific patterns (lines 76-80) only fire on inventory verbs.

### 2. Multi-chat Ollama queue — **no fair-share, no queue depth tracking**

Live state: `/api/ps` returns `{"models":[]}` (no VRAM-resident model right now), `/api/tags` shows all 5 models on disk. The router has **no queue manager** — every chat hits `127.0.0.1:11434` directly via TIMEOUT_MS=4000ms. Ollama serializes internally (single GPU context); with 10 chats issuing concurrent `/api/generate`, requests FIFO behind whatever's loading. **No chat starves deterministically**, but cold-load on a different model evicts the warm one, causing cascade latency for 
... [+2032 chars truncated]
