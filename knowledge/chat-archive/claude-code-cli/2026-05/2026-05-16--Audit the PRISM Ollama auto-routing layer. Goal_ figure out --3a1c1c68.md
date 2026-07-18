---
type: "chat-session"
source: "claude-code-cli"
session_id: "3a1c1c68-a4cf-4705-a813-b80ec43b26fa"
title: "Audit the PRISM Ollama auto-routing layer. Goal: figure out why offload rate is "
date: "2026-05-16"
first_ts: "2026-05-16T21:14:30.428Z"
last_ts: "2026-05-16T21:16:02.720Z"
cwd: "H:\\prism"
messages: 25
user_msgs: 11
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/3a1c1c68-a4cf-4705-a813-b80ec43b26fa/subagents/agent-a27e27defb2736bf7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Audit the PRISM Ollama auto-routing layer. Goal: figure out why offload rate is 

> **claude-code-cli** | 2026-05-16 | 25 msgs (11 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3a1c1c68-a4cf-4705-a813-b80ec43b26fa/subagents/agent-a27e27defb2736bf7.jsonl`

## Transcript

### User | 2026-05-16T21:14:30.428Z

Audit the PRISM Ollama auto-routing layer. Goal: figure out why offload rate is stuck at 23% (63 offloaded / 207 kept on Claude / 135 silent-suggestions) when the healthy target is 30% — what categories are being "kept on Claude" that should route to Ollama?

Files to read:
- `H:/prism/.claude/hooks/ollama-task-offloader.mjs` (the offloader hook)
- `H:/prism/.claude/hooks/ollama-auto-router.mjs` (the router hook)
- `H:/prism/mcp-server/src/engines/OllamaHookBridgeEngine.ts` (engine — read first 200 lines)
- `H:/prism/scripts/lib/ollama-cost-routing.mjs` (the pure routing library if present, search for it)
- `H:/prism/mcp-server/data/state/ollama-offload-stats.json` (telemetry — read full)

Report:

1. **Decision tree** — what categories does the offloader recognize (summary, explain, classify, docstring, lint, diff-summary, error-triage, etc.), and what's the threshold/heuristic for each?

2. **Silent-suggestions gap** — telemetry shows 135 silent-suggestions vs 1 injected. Why are 99% of suggestions silent (not surfaced)? Is there a gate that's too conservative?

3. **`keptOnClaude` category breakdown** — for the 207 kept-on-Claude decisions, can you tell from telemetry which CATEGORY (summary vs explain vs etc.) is over-represented in the kept group? That's where the offload opportunity lives.

4. **Auto-execute vs advise** — does the current router ASK Claude to invoke Ollama, or does it SILENTLY run Ollama itself and substitute the result? The user said "Auto-route Ollama for safe classes (20-40% savings) — flip from advise to auto-execute for summarize/classify/docstring" — find what would change to flip from advise to auto-execute.

5. **Concrete recommendation** — 1-3 specific code changes (file:line) that would flip the offload rate to 30%+. Examples:
   - "lower threshold X from 0.5 → 0.35 in ollama-task-offloader.mjs:42"
   - "add `auto-execute` mode for category=summary at ollama-cost-routing.mjs:88"
   - "remove the 'must have matching MCP dispatcher act
... [+143 chars truncated]

### Assistant | 2026-05-16T21:14:35.576Z

I'll audit the PRISM Ollama auto-routing layer to identify why offload rate is stuck at 23%.

### Assistant | 2026-05-16T21:14:36.102Z

[tool_use: Read]

### Assistant | 2026-05-16T21:14:36.623Z

[tool_use: Read]

### User | 2026-05-16T21:14:37.031Z

[tool_result] File content (42499 tokens) exceeds maximum allowed tokens (25000). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### Assistant | 2026-05-16T21:14:37.674Z

[tool_use: Read]

### Assistant | 2026-05-16T21:14:37.686Z

[tool_use: Glob]

### User | 2026-05-16T21:14:40.063Z

[tool_result] No files found

### User | 2026-05-16T21:14:40.364Z

[tool_result] 1	// tier: T4
2	// NOTE: no shebang. The hook runs via explicit `node X.mjs` in the harness's
3	// UserPromptSubmit chain — never chmod+x. vite's SSR transform does not strip
4	// a line-1 `#!` and injects its preamble above, stranding the `#!` mid-file
5	// and breaking vitest's import of this file. Removing it is the cleanest fix.
6	/**
7	 * ollama-task-offloader.mjs — UserPromptSubmit hook
8	 *
... [+24826 chars truncated]

### User | 2026-05-16T21:14:40.800Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * ollama-auto-router.mjs — UserPromptSubmit hook
5	 *
6	 * AUTOMATIC Ollama routing — no manual /commands needed.
7	 * Detects task type from prompt and routes appropriate work to Ollama,
8	 * injecting results as context so Claude doesn't duplicate effort.
9	 *
10	 * Routes:
11	 * - Summarization requests → Ollama summarize
12	 * - Explanation requests
... [+6561 chars truncated]

### Assistant | 2026-05-16T21:14:46.079Z

I'll handle the large stats file efficiently using targeted reads. Let me grab the structure plus the cost-router lib and engine.

### Assistant | 2026-05-16T21:14:49.953Z

[tool_use: Read]

### Assistant | 2026-05-16T21:14:50.267Z

[tool_use: Glob]

### Assistant | 2026-05-16T21:14:50.527Z

[tool_use: Glob]

### Assistant | 2026-05-16T21:14:51.030Z

[tool_use: Read]

### User | 2026-05-16T21:14:52.054Z

[tool_result] .claude\hooks\lib\ollama-cost-router.mjs

### User | 2026-05-16T21:14:52.453Z

[tool_result] .claude\hooks\lib\ollama-stats.mjs

### User | 2026-05-16T21:14:52.497Z

[tool_result] 1	{
2	  "schemaVersion": "2.0.0",
3	  "lastUpdated": "2026-05-16T21:14:49.835Z",
4	  "lastReset": "2026-04-28T00:11:42.432Z",
5	  "offloaded": 63,
6	  "keptOnClaude": 209,
7	  "estimatedTokensSaved": 14625,
8	  "silentSuggestions": 138,
9	  "injectedSuggestions": 1,
10	  "byCategory": {
11	    "cache-hit": 2,
12	    "summary": 59,
13	    "explanation": 2
14	  },
15	  "byHook": {
16	    "ollama-tas
... [+1324 chars truncated]

### User | 2026-05-16T21:14:53.251Z

[tool_result] 1	/**
2	 * OllamaHookBridgeEngine
3	 *
4	 * Enables Claude Code hooks to call local Ollama for intelligent suggestions
5	 * without consuming API tokens. Designed for hook use cases:
6	 *
7	 * - Fast: 500ms default timeout (hooks can't block long)
8	 * - Resilient: Graceful fallback when Ollama unavailable
9	 * - Configurable: Per-hook-type model selection
10	 * - Stateless: No connection pooling 
... [+7575 chars truncated]

### Assistant | 2026-05-16T21:14:56.611Z

I have enough to draft the audit. Let me grep keep-category telemetry and the cost-router for the remaining picture.

### Assistant | 2026-05-16T21:15:01.321Z

[tool_use: Bash]

### Assistant | 2026-05-16T21:15:01.899Z

[tool_use: Read]

### User | 2026-05-16T21:15:05.826Z

[tool_result] TOTAL keep events: 202

By category:
  unknown 102
  orchestration 94
  operator_directive 5
  complex 1

Top unknown-keep prefixes:
  22 /checkin chat slot
  4 keep wiring engines
  3 /checkin-delta wire all
  2 please fix this
  2 /checkin alpha, /loop
  2 /checkin charlie, /loop
  2 /checkin echo, /loop
  2 do everything! /loop
  2 /checkin-alpha, /loop system
  2 /checkin-charlie, /loop obsidi
... [+173 chars truncated]

### User | 2026-05-16T21:15:06.817Z

[tool_result] 1	// tier: T4
2	// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
3	//
4	// Replaces hardcoded "first-of-preference-list" model selection with a
5	// category → tier → model decision. Smaller / faster models for trivial
6	// tasks (classify, format-convert, prism-inventory); larger / more
7	// capable models for complex codegen / multi-step reasoning.
8	//
9	// C
... [+4932 chars truncated]

### Assistant | 2026-05-16T21:16:02.720Z

I have enough data to deliver the full audit. Returning findings directly (no plan file needed — this is a read-only audit report, not a multi-step implementation).

---

## Code Quality Analysis Report — PRISM Ollama Auto-Routing

### Summary
- **Offload rate**: 63 / (63+209) = **23.2%** vs 30% target → ~19 keep-events away from target
- **Silent-suggestion ratio**: 138 silent / 1 injected = **99.3% suppressed**
- **Largest leak**: `category="unknown"` (102/202 keep events ≈ **50.5%**) — almost all `/checkin <slot> /loop ...` style orchestration prompts
- **Two hooks ship, neither auto-executes** — both are advise-only

---

### 1. Decision tree (offloader)
`H:/prism/.claude/hooks/ollama-task-offloader.mjs:72-90` — first-match-wins regex cascade:

| Category | Pattern signal | savings | Tier (cost-router) |
|---|---|---|---|
| prism_inventory | "list/show/enumerate engines/dispatchers/hooks…" | 0.85 | cheap |
| prism_introspect | "what actions/methods … dispatcher/engine…" | 0.85 | cheap |
| git_summary | "summarize git log / commits / handoff" | 0.88 | balanced |
| prism_audit | "check/verify/audit … inventory/orphan/wiring" | 0.82 | balanced |
| explanation | "describe this file / explain X / what does Y" | 0.85-0.90 | balanced |
| summary | "summarize / tldr / overview" + "list/show me" | 0.75-0.88 | balanced |
| search_synthesis | "search for / find files" | 0.80 | balanced |
| format_convert | "convert to / format as" | 0.92 | cheap |
| documentation | "document / docstring / jsdoc" | 0.85 | balanced |

**Gates** (all in offloader): `length<20` (skip) → `SAFETY_PRE` (line 253, hard-keep) → `OFFLOADABLE_PATTERNS` → `KEEP_ON_CLAUDE` fallback → unknown.

**Thresholds**: `CONFIDENCE_THRESHOLD=0.80` (line 55) gates offload, `INJECT_THRESHOLD=0.90` (line 56) gates context injection.

---

### 2. Silent-suggestion gap (138:1)
`H:/prism/.claude/hooks/ollama-task-offloader.mjs:441-444` — even AFTER recording `decision:offload`, anything with savings `< 0.90` is silentl
... [+5758 chars truncated]
