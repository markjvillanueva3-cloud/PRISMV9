---
type: "chat-session"
source: "claude-code-cli"
session_id: "928a8226-c5d3-489a-a7f0-3c0167726623"
title: "CANONICAL Ollama offload infra (REUSE, do NOT build new): - scripts/ask-ollama.m"
date: "2026-06-09"
first_ts: "2026-06-09T16:21:26.231Z"
last_ts: "2026-06-09T16:23:38.691Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/workflows/wf_9167d994-7ea/agent-ae2751e0a40d1b5fa.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# CANONICAL Ollama offload infra (REUSE, do NOT build new): - scripts/ask-ollama.m

> **claude-code-cli** | 2026-06-09 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/workflows/wf_9167d994-7ea/agent-ae2751e0a40d1b5fa.jsonl`

## Transcript

### User | 2026-06-09T16:21:26.231Z

CANONICAL Ollama offload infra (REUSE, do NOT build new):
- scripts/ask-ollama.mjs -- CLI: summarize|explain|triage|ask|viz modes (--json); routes a heavy input to LOCAL Ollama, only the compact answer returns. Host = Blackwell RTX PRO 6000 96GB; default model qwen2.5-coder:32b (the 3b/7b/14b coders were RETIRED -- never name them), gpt-oss:120b/20b for synthesis. Cold-load ~2min, keep_alive 10m.
- mcp-server/src/engines/OllamaHookBridgeEngine.ts -- hook-side offload bridge.
- aiSystemRouterEngine.route(task) -- routes a task Claude vs Ollama vs dispatcher.
- scripts/lib/host-aware-synthesis-model.mjs + the ollama cost-router -- model selection.
- /ollama-* skills.
Doctrine (CLAUDE.md R5 + feedback_ollama_token_routing): route summarize / explain / classify / lint / docstring / diff-summary / error-triage to local Ollama; reserve Claude for deep reasoning + safety. Fleet offload take-rate is ~0.4-13.8% vs a 30% target -- real headroom. Sierra already shipped the FLEET-WIDE offload audit (U-OLLAMA-AUDIT); this audit is QUOTING-GALAXY-SPECIFIC application only -- do not re-do the fleet audit.

PRISM quoting galaxy (slot charlie owns backend AND frontend). Engines live FLAT at mcp-server/src/engines/ (Cost*/Quote*/Quoting*/Estimat*/Pricing*/Freight*/Import* -- ~78 files), NOT under quoting/ (that subdir is just the sentinel + brain docs). Quoting scripts: scripts/generate-quoting-knowledge.mjs, scripts/compile-quoting-knowledge.mjs, scripts/index-quoting-data-files.mjs, scripts/generate-quoting-awareness.mjs (+ siblings). Frontend: mcp-server/web/src/pages/Quote*.tsx. Dispatchers: prism_business (quote_* actions) + prism_quoting. Soul refuses: inline-margin-constants, softening-reconciliation-thresholds, emitting-quote-without-margin-floor-gate.

YOUR SLICE: Scan the quoting KNOWLEDGE/DATA/AWARENESS generator + compiler scripts (scripts/*quoting*.mjs: generate-quoting-knowledge, compile-quoting-knowledge, index-quoting-data-files, generate-quoting-awareness, + any sibl
... [+773 chars truncated]

### Assistant | 2026-06-09T16:21:38.637Z

I'll scan the quoting generator/compiler scripts for mechanical text operations that could route to local Ollama. Let me start by locating all the relevant scripts.

### Assistant | 2026-06-09T16:21:38.895Z

[tool_use: Glob]

### Assistant | 2026-06-09T16:21:38.901Z

[tool_use: Glob]

### User | 2026-06-09T16:22:05.083Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-09T16:22:05.397Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-09T16:22:10.335Z

Ripgrep timed out on the broad glob. Let me use the Bash tool with a more targeted approach.

### Assistant | 2026-06-09T16:22:13.452Z

[tool_use: Bash]

### User | 2026-06-09T16:23:35.644Z

[tool_result] compile-quoting-knowledge.mjs*
compile-quoting-knowledge.test.mjs
generate-quoting-awareness.mjs*
generate-quoting-awareness.test.mjs
generate-quoting-pipeline-features.mjs*
index-quoting-data-files.mjs*
index-quoting-data-files.test.mjs
install-quoting-pipeline-cron.ps1
install-quoting-pipeline-cron.test.mjs
quoting-alert-banner.mjs*
quoting-alert-banner.test.mjs
quoting-baseline-bootstrap.balanc
... [+1326 chars truncated]

### Assistant | 2026-06-09T16:23:38.691Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
