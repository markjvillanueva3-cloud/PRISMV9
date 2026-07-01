---
type: "chat-session"
source: "claude-code-cli"
session_id: "f593aee3-12cf-4e8a-a566-8411386cc606"
title: "LENS 1 — LOCAL OLLAMA INVENTORY + EXISTING PRISM OLLAMA SURFACES (reuse-don't-re"
date: "2026-06-09"
first_ts: "2026-06-09T16:09:47.885Z"
last_ts: "2026-06-09T16:14:25.697Z"
cwd: "H:\\prism"
messages: 46
user_msgs: 20
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism/f593aee3-12cf-4e8a-a566-8411386cc606/subagents/workflows/wf_28042811-3c4/agent-ae5cc367f6a2169e8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# LENS 1 — LOCAL OLLAMA INVENTORY + EXISTING PRISM OLLAMA SURFACES (reuse-don't-re

> **claude-code-cli** | 2026-06-09 | 46 msgs (20 user / 26 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/f593aee3-12cf-4e8a-a566-8411386cc606/subagents/workflows/wf_28042811-3c4/agent-ae5cc367f6a2169e8.jsonl`

## Transcript

### User | 2026-06-09T16:09:47.885Z

LENS 1 — LOCAL OLLAMA INVENTORY + EXISTING PRISM OLLAMA SURFACES (reuse-don't-rebuild).

Goal: catalog (a) which Ollama models are actually available on this machine (96GB Blackwell) and their sizes/strengths, and (b) every existing PRISM Ollama integration surface delta could REUSE instead of building new.

Do this:
1. Probe live models: `node H:/prism/scripts/ask-ollama.mjs` (read its --help/modes) and try `ollama list` via Bash (if Ollama is down, note it — the scope is "how we CAN use", a dead service doesn't block planning). Cross-check the wiki: `knowledge/wiki/reference/local-llm-routing---ollama-models-loaded-on-this-machine.md`.
2. Catalog existing surfaces (read heads, don't dump): `scripts/ask-ollama.mjs` (modes viz/summarize/explain/triage/ask), `mcp-server/src/engines/OllamaHookBridgeEngine.ts`, the `/ollama-*` skills, `ollama-pipeline-injector.mjs`, `ollama-prism-bridge.mjs`, `route-to-obsidian` skill, the `model-router` skill, and `knowledge/memories/project/project_my_hooks_ollama_integration.md`. Also the offload dashboard `scripts/ollama-offload-dashboard.mjs`.
3. Report, as dense markdown: a MODEL TABLE (name · size · best-for) and a SURFACE TABLE (surface · what it does · how delta invokes it · reusable y/n). Flag the current fleet offload rate if visible (~6% per token-state). Be specific with file paths + model tags. Do NOT invent model names — report only what you verify; mark anything unverified.

### Assistant | 2026-06-09T16:10:08.945Z

I'll catalog the local Ollama inventory and existing PRISM Ollama surfaces. Let me start by probing the live service and reading the key surfaces in parallel.

### Assistant | 2026-06-09T16:10:09.427Z

[tool_use: Bash]

### Assistant | 2026-06-09T16:10:10.811Z

[tool_use: Bash]

### Assistant | 2026-06-09T16:10:11.827Z

[tool_use: Bash]

### Assistant | 2026-06-09T16:10:12.241Z

[tool_use: Read]

### User | 2026-06-09T16:10:54.765Z

[tool_result] /usr/bin/bash: line 1: ollama: command not found
---EXIT:127---

### User | 2026-06-09T16:11:02.366Z

[tool_result] [ask-ollama] unknown flag: --help

ask-ollama — local Ollama query service (offloads token-heavy work)

  node scripts/ask-ollama.mjs viz <query>        search the system-viz graph
  node scripts/ask-ollama.mjs viz <query> --synth   ...plus an Ollama answer
  node scripts/ask-ollama.mjs summarize <file>   digest a large file
  node scripts/ask-ollama.mjs explain <file>     explain code
  node scri
... [+204 chars truncated]

### User | 2026-06-09T16:11:10.421Z

[tool_result] {"models":[{"name":"qwen2.5-coder:1.5b","model":"qwen2.5-coder:1.5b","modified_at":"2026-06-08T21:55:43.1142413-05:00","size":986062089,"digest":"d7372fd828518a4d38b1eb196c673c31a85f2ed302b3d1e406c4c2d1b64a0668","details":{"parent_model":"","format":"gguf","family":"qwen2","families":["qwen2"],"parameter_size":"1.5B","quantization_level":"Q4_K_M","context_length":32768,"embedding_length":1536},"ca
... [+3612 chars truncated]

### User | 2026-06-09T16:11:11.973Z

[tool_result] 1	---
2	title: "Local LLM routing — Ollama models loaded on this machine"
3	name: local-llm-routing---ollama-models-loaded-on-this-machine
4	kind: reference
5	status: promoted
6	category: reference
7	domain: knowledge-vault
8	promoted_from: knowledge/memories/reference/reference_local_llm_routing.md
9	promoted_at: 2026-06-06T04:55:54.744Z
10	source_refs: 4
11	---
12	
13	# Local LLM routing — Ollam
... [+2919 chars truncated]

### Assistant | 2026-06-09T16:11:22.624Z

Service is live. Let me get the full model list (the tags output was truncated) and read the existing surfaces in parallel.

### Assistant | 2026-06-09T16:11:25.048Z

[tool_use: Bash]

### Assistant | 2026-06-09T16:11:26.051Z

[tool_use: Bash]

### Assistant | 2026-06-09T16:11:26.681Z

[tool_use: Read]

### User | 2026-06-09T16:11:39.715Z

[tool_result] qwen2.5-coder:1.5b	0.99GB	completion,tools,insert	ctx=32768
gpt-oss:120b	65.37GB	completion,tools,thinking	ctx=131072
qwen2.5-coder:32b	19.85GB	completion,tools,insert	ctx=32768
gpt-oss:20b	13.79GB	completion,tools,thinking	ctx=131072
qwen3-vl:8b-instruct	6.14GB	vision,completion,tools	ctx=262144
qwen3-vl:8b	6.14GB	vision,completion,tools,thinking	ctx=262144
qwen2.5vl:7b	5.97GB	vision,completion	c
... [+164 chars truncated]

### User | 2026-06-09T16:11:52.361Z

[tool_result] === Ollama Offload Dashboard ===
Schema:       2.0.0
Last update:  2026-06-09T16:11:24.700Z
Last reset:   2026-06-08T19:17:32.464Z

Totals (since reset):
  offloaded:               7
  kept on Claude:          96
  estimated tokens saved:  16076
  suggestions (silent):    19
  suggestions (injected):  7

Last 24h activity:
  events:        129
  offloads:      7
  keeps:         96  (77 correctly 
... [+968 chars truncated]

### User | 2026-06-09T16:11:58.395Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+4067 chars truncated]

### Assistant | 2026-06-09T16:12:02.933Z

The model list is fully verified now, and I can see the offload rate. Let me read the host-aware model resolver and the remaining surfaces in parallel.

### Assistant | 2026-06-09T16:12:03.435Z

[tool_use: Read]

### Assistant | 2026-06-09T16:12:04.365Z

[tool_use: Read]

### Assistant | 2026-06-09T16:12:04.733Z

[tool_use: Read]

### User | 2026-06-09T16:12:09.054Z

[tool_result] 1	// tier: T4
2	// BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-MODEL-RESOLVE — host-aware default model
3	// for local synthesis scripts (galaxy roll-ups, system-viz roost summaries,
4	// Obsidian memory consolidation, ask-ollama heavy modes).
5	//
6	// PROBLEM the work order names: every synthesis script hardcodes
7	// `qwen2.5-coder:7b` (or `:3b`). On the 96GB RTX PRO 6000 Blackwell that
8	// throttl
... [+5022 chars truncated]

### User | 2026-06-09T16:12:09.120Z

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
... [+2345 chars truncated]

### User | 2026-06-09T16:12:09.333Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * ollama-pipeline-injector.mjs — UserPromptSubmit hook
5	 *
6	 * Fires when the user invokes /forge, /forge-audit, /rgs, /scrutinize, /dedup,
7	 * /precompact, /handoff or any pipeline that historically did NOT route work
8	 * to Ollama even though the local models were loaded and idle.
9	 *
10	 * Injects an additionalContext block listing CONCRETE Olla
... [+3775 chars truncated]

### Assistant | 2026-06-09T16:12:17.771Z

Now let me read the remaining surfaces in parallel: the cost-router (key routing policy), the prism-bridge L2 agent, the /ollama-* and route-to-obsidian/model-router skills, and the project memory.

### Assistant | 2026-06-09T16:12:19.746Z

[tool_use: Read]

### Assistant | 2026-06-09T16:12:19.751Z

[tool_use: Read]

### Assistant | 2026-06-09T16:12:20.071Z

[tool_use: Read]

### User | 2026-06-09T16:12:27.172Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ollama-prism-bridge.mjs — Ollama → PRISM agentic harness (OLLAMA-EXPAND-MS0/U-OE-BRIDGE-L2)
4	 *
5	 * Layer 2 of the OLLAMA→PRISM-MCP bridge ladder (Layer 1 = ask-ollama.mjs).
6	 *
7	 * Ollama is a model server, NOT an MCP client — it cannot "connect to MCP".
8	 * This script is the missing harness: it acts as the agent loop. It advertises
9	 * a curated, READ-ONLY
... [+3248 chars truncated]

### User | 2026-06-09T16:12:27.178Z

[tool_result] 1	---
2	name: my-hooks-ollama-integration
3	description: Per-hook decision matrix for Ollama routing — which of the 5 hooks shipped this session benefit from local-LLM offload and which are already lean.
4	type: project
5	originSessionId: 2a125756-5751-4129-a9cc-b48330e2b9d8
6	---
7	# Ollama integration matrix for shipped hooks
8	
9	User asked: "make sure all hooks we've made are active and feedin
... [+2946 chars truncated]

### User | 2026-06-09T16:12:27.191Z

[tool_result] 1	// tier: T4
2	// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
3	//
4	// Replaces hardcoded "first-of-preference-list" model selection with a
5	// category → tier → model decision. Smaller / faster models for trivial
6	// tasks (classify, format-convert, prism-inventory); larger / more
7	// capable models for complex codegen / multi-step reasoning.
8	//
9	// C
... [+12705 chars truncated]

### Assistant | 2026-06-09T16:12:32.537Z

I have the core picture. Let me check the `/ollama-*`, `route-to-obsidian`, and `model-router` skills, plus the OllamaHookBridgeEngine model overrides, in parallel.

### Assistant | 2026-06-09T16:12:34.726Z

[tool_use: Bash]

### Assistant | 2026-06-09T16:12:36.043Z

[tool_use: Read]

### Assistant | 2026-06-09T16:12:36.486Z

[tool_use: Read]

### Assistant | 2026-06-09T16:12:36.962Z

[tool_use: Read]

### User | 2026-06-09T16:12:41.403Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### User | 2026-06-09T16:12:43.853Z

[tool_result] 80	// Blackwell — the 7b speed-tier no longer exists).
81	//
82	// BLACKWELL-MODEL-INTEGRATION-MS0 P2 (2026-06-06): gpt-oss:20b is now PULLED (live
83	// /api/tags confirms it), so the speed-critical hooks (grep_index, mcp_route, general)
84	// move to it — the fast MoE tier (~3B active, sub-second) for the cheap classify/route/
85	// general work that doesn't need the 32b's depth. The latency-tol
... [+3517 chars truncated]

### User | 2026-06-09T16:12:44.045Z

[tool_result] 1	---
2	name: route-to-obsidian
3	description: Summarize an Obsidian wiki entry via local Ollama (qwen2.5-coder) instead of reading it into Claude context. Use for any `knowledge/wiki/**/*.md` Read >500 lines — the wiki-read-offload-advisory PreToolUse hook surfaces this skill automatically. Saves ~3-10K tokens per call.
4	model: haiku
5	effort: XS
6	allowed-tools: Bash
7	triggers:
8	  keyword: "w
... [+1696 chars truncated]

### User | 2026-06-09T16:12:50.480Z

[tool_result] activate-local.md
ask-local.md
local-ask.md
local-health.md
ollama-architecture-plan.md
ollama-boilerplate.md
ollama-bridge.md
ollama-classify.md
ollama-diff-summary.md
ollama-docstring.md
ollama-error-triage.md
ollama-explain.md
ollama-extract.md
ollama-route-check.md
ollama-summarize.md
ollama-test-stub.md
route-to-obsidian.md
---
activate-local.md
ollama-boilerplate.md
ollama-classify.md
ollama
... [+135 chars truncated]

### Assistant | 2026-06-09T16:12:57.375Z

`model-router` is a skill name in the registry but has no command file at that path — it maps to the cost-router lib I already read. Let me check the `model-router`/`ask-local`/`local-ask` skill heads and the offloadable-patterns categories to round out the surface catalog.

### Assistant | 2026-06-09T16:12:59.490Z

[tool_use: Bash]

### Assistant | 2026-06-09T16:13:00.504Z

[tool_use: Bash]

### User | 2026-06-09T16:13:18.981Z

[tool_result] 84:const OFFLOADABLE_PATTERNS = [
88:  { pattern: /\b(list|show|enumerate)\s+.*(engines?|dispatchers?|hooks?|skills?|actions?)\b/i, category: "prism_inventory", savings: 0.85 },
89:  { pattern: /\bwhat\s+(actions?|methods?|fields?)\s+.*(in|on|of|does)\s+\w+(dispatcher|engine|registry|schema)/i, category: "prism_introspect", savings: 0.85 },
90:  { pattern: /\b(summarize|recap|what.*happened in)\s+
... [+4247 chars truncated]

### User | 2026-06-09T16:13:24.988Z

[tool_result] ---ASK-LOCAL HEAD---
---
name: ask-local
description: Offload token-heavy work to a LOCAL Ollama model so it never enters the Claude context window. Use BEFORE reading a large file, searching the system-viz graph, explaining unfamiliar code, or triaging a build/error dump — the heavy input is processed in a subprocess and only a compact answer returns. Drastically cuts Claude token spend.
version:
... [+496 chars truncated]

### Assistant | 2026-06-09T16:14:25.697Z

I have everything verified. The `model-router` skill name has no command file (it resolves to the cost-router lib). I have the full model inventory, all surfaces, and the live offload rate. Compiling the report.

---

# LENS 1 — Local Ollama Inventory + Existing PRISM Ollama Surfaces

**Service: LIVE** at `http://127.0.0.1:11434` (`ollama` not on PATH, but the daemon answers `/api/tags`; install at `H:\Tools\ollama\` per wiki). All models below verified via live `/api/tags` 2026-06-09.

## MODEL TABLE (verified — 10 installed)

| Model tag | Size | Capabilities | Ctx | Best-for |
|-----------|------|--------------|-----|----------|
| `gpt-oss:120b` | 65.37 GB | completion, tools, **thinking** | 131072 | **Top synthesis/reasoning brain** — 120B MoE, ~134 tok/s, Apache-2.0. Galaxy roll-ups, system-viz roost digests, Obsidian consolidation, deep multi-step reasoning. The `best`-tier `search_synthesis` ceiling on this Blackwell. |
| `qwen2.5-coder:32b` | 19.85 GB | completion, tools, insert | 32768 | **Held fast-coder + default floor.** code_explain, pattern_match, validation, docstring, ask-ollama heavy modes, prism-bridge tool-calling. The `DEFAULT_MODEL` everywhere. |
| `gpt-oss:20b` | 13.79 GB | completion, tools, **thinking** | 131072 | **Speed tier** — 20B MoE (~3B active), ~185 tok/s (fastest in the bench). grep_index/mcp_route/general hook routing, fast classify/route. |
| `qwen3-vl:8b-instruct` | 6.14 GB | **vision**, completion, tools | 262144 | Vision OCR (instruct, no CoT). Blueprint/print dimension extraction (xray ensemble). |
| `qwen3-vl:8b` | 6.14 GB | **vision**, completion, tools, **thinking** | 262144 | Vision + reasoning variant of above. |
| `qwen2.5vl:7b` | 5.97 GB | **vision**, completion | 128000 | Vision OCR — the model the xray VLM-ensemble leading-dot/truncation fixes were built against. |
| `llama3.2-vision:11b` | 7.82 GB | **vision**, completion | 131072 | Larger vision family for ensemble diversity (≥2-agree consensus OCR). |
| `moondream:1
... [+7243 chars truncated]
