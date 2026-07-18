---
type: "chat-session"
source: "claude-code-cli"
session_id: "72879035-e0ca-4192-9498-ed9720495151"
title: "Review a surgical, fleet-wide Ollama change-set in the PRISM repo at H:/prism (m"
date: "2026-06-11"
first_ts: "2026-06-11T14:33:37.347Z"
last_ts: "2026-06-11T14:33:45.071Z"
cwd: "H:\\prism-slot-india"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism-slot-india/72879035-e0ca-4192-9498-ed9720495151/subagents/agent-a96d6991ef9018134.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Review a surgical, fleet-wide Ollama change-set in the PRISM repo at H:/prism (m

> **claude-code-cli** | 2026-06-11 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/72879035-e0ca-4192-9498-ed9720495151/subagents/agent-a96d6991ef9018134.jsonl`

## Transcript

### User | 2026-06-11T14:33:37.347Z

Review a surgical, fleet-wide Ollama change-set in the PRISM repo at H:/prism (main tree). These implement P0-3 (Sonnet/Claude fallback when Ollama fails) and P1-6 (Windows IPv6 fix) from H:/prism/state/shared/specs/OLLAMA-FLEET-AUDIT-2026-06-11.md. Read each file END-TO-END and grade PASS/FAIL with P0/P1/P2 findings.

CHANGED FILES (all UNCOMMITTED on branch cad-fusion-live-ms0):
1. H:/prism/scripts/ask-ollama.mjs — NEW exported function `buildFallbackSignal({mode,target,error,json})` inserted just before `runRequest`; wired at the TWO generation-failure return sites (ask-mode ~line 898 and file-mode ~line 927: `if (!gen.ok) return { exitCode: 3, output: buildFallbackSignal(...) }`). The graph-load failure sites (viz/rerank, `if (!loaded.ok)`) were deliberately LEFT UNTOUCHED (different cause — graph unreadable, not Ollama down). NOTE: a separate already-committed change made KEEP_ALIVE read process.env.OLLAMA_KEEP_ALIVE||"30m" — not under review here.
2. H:/prism/mcp-server/src/engines/OllamaHookBridgeEngine.ts — DEFAULT_CONFIG.baseUrl changed from "http://localhost:11434" to `process.env.OLLAMA_URL || "http://127.0.0.1:11434"`.
3. H:/prism/scripts/__tests__/ask-ollama.test.mjs — enhanced the ask-down test + added a --json fallback test.
4. H:/prism/mcp-server/src/__tests__/OllamaHookBridgeEngine.test.ts — updated the default-baseUrl assertion.

VERIFY SPECIFICALLY:
- buildFallbackSignal: are all referenced vars (mode, target, error, json) in scope at BOTH call sites? Is the JSON output valid JSON in --json mode? Is exitCode still 3 (failure preserved for scripts that branch on it)? Is it ASCII-only (no em-dash/arrows — the repo has an ASCII guard on code files)?
- Did changing the output break any OTHER caller that parses ask-ollama stdout expecting the old `[ask-ollama] <error>` format? Grep the repo for consumers of ask-ollama output.
- OllamaHookBridgeEngine: is `process.env.OLLAMA_URL || "http://127.0.0.1:11434"` type-safe (string)? Any OTHER test or caller a
... [+423 chars truncated]

### Assistant | 2026-06-11T14:33:42.193Z

I'll review this Ollama change-set thoroughly. Let me start by reading all changed files end-to-end and verifying the specific concerns raised.

### Assistant | 2026-06-11T14:33:42.515Z

[tool_use: Read]

### User | 2026-06-11T14:33:44.049Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+47712 chars truncated]

### Assistant | 2026-06-11T14:33:45.071Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
