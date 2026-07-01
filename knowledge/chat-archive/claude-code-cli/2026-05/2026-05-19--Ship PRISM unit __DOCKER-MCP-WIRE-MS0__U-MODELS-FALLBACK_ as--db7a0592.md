---
type: "chat-session"
source: "claude-code-cli"
session_id: "db7a0592-d0c4-4ab7-be50-a016b8101712"
title: "Ship PRISM unit `[DOCKER-MCP-WIRE-MS0]/U-MODELS-FALLBACK` as a single, clean, sc"
date: "2026-05-19"
first_ts: "2026-05-19T16:12:24.654Z"
last_ts: "2026-05-19T16:17:51.291Z"
cwd: "H:\\PRISM"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/db7a0592-d0c4-4ab7-be50-a016b8101712/subagents/agent-a1ee1339ec335478e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Ship PRISM unit `[DOCKER-MCP-WIRE-MS0]/U-MODELS-FALLBACK` as a single, clean, sc

> **claude-code-cli** | 2026-05-19 | 21 msgs (8 user / 13 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/db7a0592-d0c4-4ab7-be50-a016b8101712/subagents/agent-a1ee1339ec335478e.jsonl`

## Transcript

### User | 2026-05-19T16:12:24.654Z

Ship PRISM unit `[DOCKER-MCP-WIRE-MS0]/U-MODELS-FALLBACK` as a single, clean, scrutiny-gated commit. You are operating as slot juliett (claude-db7a0592), branch `cad-fusion-live-ms0`, in the shared tree `H:/PRISM`. Do NOT switch branches or worktrees.

## CONTEXT (read before writing — R8)

PRISM is a manufacturing-intelligence platform. `scripts/ask-ollama.mjs` is the canonical "active local-LLM callable" (per memory `reference_ollama_expand_ms0`). It calls Ollama at `http://127.0.0.1:11434/api/generate`. The user is on Docker Business and has Docker Models installed with `gemma3:3.88B-Q4_K_M` resident. Goal: when Ollama daemon is unreachable (ECONNREFUSED / AbortError timeout / HTTP 503 / 502), fall back to `docker model run` so PRISM offload doesn't completely die during Ollama wedges.

The Ollama call lives at `scripts/ask-ollama.mjs:348` in the exported `callOllama(model, prompt, opts)` function. Read it BEFORE editing. The function signature returns `{ok, text, evalCount}` or `{ok:false, error}` and never throws.

## SCOPE (tight — do NOT expand)

1. Add NEW exported `callDockerModel(model, prompt, opts)` — same return shape `{ok, text, evalCount, source: "docker-models"}` or `{ok:false, error}`. Implementation: `execFile` (NOT exec — argv injection-safe) on `docker model run --prompt <prompt> <model>`. Inject `execFileImpl` for testability (default = `node:child_process.execFile` promisified). Inject `timeoutMs` (default same as Ollama's `DEFAULT_TIMEOUT_MS`).
2. Add NEW exported `mapOllamaToDockerModel(ollamaModelName)` — pure deterministic mapper. Default map: `qwen2.5-coder:3b → gemma3`, `qwen2.5-coder:7b → gemma3`, `nomic-embed-text → null` (embeddings not in Docker Models). Override via env `PRISM_DOCKER_MODEL_MAP` (JSON object). Unknown → null. Pure function, no I/O.
3. Add NEW exported `callLocalModel(model, prompt, opts)` — wrapper that tries `callOllama` first; if error matches daemon-unreachable patterns (`/ECONNREFUSED/`, `/AbortError/`, `/timed ou
... [+3842 chars truncated]

### Assistant | 2026-05-19T16:12:39.015Z

I'll start by reading the existing `ask-ollama.mjs` to understand the current `callOllama` shape and conventions.

### Assistant | 2026-05-19T16:12:39.226Z

[tool_use: Read]

### User | 2026-05-19T16:13:07.072Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+22453 chars truncated]

### Assistant | 2026-05-19T16:13:17.743Z

Understood — I have the file content. Now let me check the existing test file conventions and the test directory structure.

### Assistant | 2026-05-19T16:13:18.750Z

[tool_use: Bash]

### User | 2026-05-19T16:14:08.382Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
/usr/bin/ls: cannot access 'H:/PRISM/scripts/ask-ollama*.test.mjs': No such file or directory

### Assistant | 2026-05-19T16:14:10.702Z

[tool_use: Glob]

### User | 2026-05-19T16:14:38.904Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-19T16:14:44.595Z

[tool_use: Bash]

### User | 2026-05-19T16:15:24.335Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
21:37 ask-ollama.mjs  193.0K

### Assistant | 2026-05-19T16:15:27.216Z

No existing test file. Let me look at an existing test in `scripts/__tests__` to match conventions.

### Assistant | 2026-05-19T16:15:28.027Z

[tool_use: Bash]

### User | 2026-05-19T16:16:38.771Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
21:37 ask-ollama.test.mjs  193.0K
20:20 build-awareness-health.test.mjs  193.0K
19:33 build-dispatcher-capacity.test.mjs  193.0K
18:09 build-system-viz-livediff.test.mjs  193.0K
18:41 build-wiring-domain-dict.test.mjs  193.0K
13:35 claude-md-byte-target.test.mjs  193.0K
20:03 claude-md-drift.test.mjs  193.0K
18:33 coord-db
... [+69 chars truncated]

### Assistant | 2026-05-19T16:16:42.063Z

There's already an `ask-ollama.test.mjs` in `__tests__`. The task says create `scripts/ask-ollama-fallback.test.mjs` — let me check the existing one's convention first.

### Assistant | 2026-05-19T16:16:42.423Z

[tool_use: Read]

### User | 2026-05-19T16:17:07.895Z

[tool_result] 1	/**
2	 * ask-ollama.test.mjs — unit + integration tests for scripts/ask-ollama.mjs
3	 * (OLLAMA-EXPAND-MS0/U-OE01). Run: node --test scripts/__tests__/ask-ollama.test.mjs
4	 *
5	 * Strategy: every pure helper is asserted against real expected values
6	 * (no toBeDefined() stubs). The impure shell (loadGraph, callOllama,
7	 * runRequest) is exercised with injected deps; readFileCapped runs agains
... [+2904 chars truncated]

### Assistant | 2026-05-19T16:17:21.744Z

I have enough context. The task explicitly says create `scripts/ask-ollama-fallback.test.mjs` (not in `__tests__`). I'll follow the task instruction precisely but the import path must point to `./ask-ollama.mjs` since the file lives in `scripts/`.

Now let me classify the problem (Karpathy step 1) before writing:
- **Search**: error pattern matching → regex set
- **Async**: subprocess execFile, fetch
- **Edge cases**: empty stdout, non-zero exit, timeout, stderr-only, malformed env JSON, unmappable model
- **Failure modes**: docker CLI missing (ENOENT), argv injection (use execFile not exec), JSON.parse throwing on env var
- **Injection safety**: `execFile` with array args — prompt cannot break out

Let me add the three helpers to `ask-ollama.mjs`. I'll insert them after `callOllama` (ends at line 382).

### Assistant | 2026-05-19T16:17:24.307Z

[tool_use: Edit]

### User | 2026-05-19T16:17:50.423Z

[tool_result] The file H:/PRISM/scripts/ask-ollama.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-19T16:17:51.291Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
