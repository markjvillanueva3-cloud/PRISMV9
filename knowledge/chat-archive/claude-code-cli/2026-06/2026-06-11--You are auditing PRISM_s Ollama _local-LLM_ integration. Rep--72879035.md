---
type: "chat-session"
source: "claude-code-cli"
session_id: "72879035-e0ca-4192-9498-ed9720495151"
title: "You are auditing PRISM's Ollama (local-LLM) integration. Repo root H:/prism. Use"
date: "2026-06-11"
first_ts: "2026-06-11T13:31:04.918Z"
last_ts: "2026-06-11T13:36:05.123Z"
cwd: "H:\\prism-slot-india"
messages: 49
user_msgs: 22
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism-slot-india/72879035-e0ca-4192-9498-ed9720495151/subagents/workflows/wf_97271491-e35/agent-aeed15d795b9d2007.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# You are auditing PRISM's Ollama (local-LLM) integration. Repo root H:/prism. Use

> **claude-code-cli** | 2026-06-11 | 49 msgs (22 user / 27 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/72879035-e0ca-4192-9498-ed9720495151/subagents/workflows/wf_97271491-e35/agent-aeed15d795b9d2007.jsonl`

## Transcript

### User | 2026-06-11T13:31:04.918Z

You are auditing PRISM's Ollama (local-LLM) integration. Repo root H:/prism. Use Glob/Grep/Read; route nothing to subagents. Report file:line citations for every claim (PRISM honesty rule). Be concrete + exhaustive within your slice. Do NOT fix anything -- audit only.

LIVE FACTS (verified 2026-06-11, do not re-derive):
- Ollama server HEALTHY: http://127.0.0.1:11434 returns 200 in 1.7ms. NOT down.
- 12 models installed: deepseek-r1:32b, qwen3-coder:30b, qwen2.5-coder:1.5b, gpt-oss:120b(65GB), qwen2.5-coder:32b(20GB), gpt-oss:20b(14GB), qwen3-vl:8b(-instruct), qwen2.5vl:7b, moondream:1.8b, llama3.2-vision:11b, nomic-embed-text. (retired tags :3b/:7b/:14b/deepseek-r1:14b per 2026-06-04 Blackwell migration).
- Live env: OLLAMA_MAX_LOADED_MODELS=4, OLLAMA_NUM_PARALLEL=4, OLLAMA_FLASH_ATTENTION=1, OLLAMA_KEEP_ALIVE=30m, OLLAMA_KV_CACHE_TYPE=f16, OLLAMA_CONTEXT_LENGTH=65536, OLLAMA_GPU_OVERHEAD=2147483648, OLLAMA_MODELS=H:/Tools/ollama/models, PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1, PRISM_OLLAMA_ROUTE_AUTO=1, NIM_FALLBACK_TO_OLLAMA=1.
- Host: RTX PRO 6000 Blackwell 96GB VRAM + Ryzen 9950X3D 32T + ~136GB RAM. The gap is UTILIZATION not capacity.
- Offload health: RAW 9.1% (71/778) but raw is expected; ADJUSTED 23.4% (18/77 offloadable, last 24h) -- BELOW the >=30% target.
- KEY GAP found: telemetry shows 'large-read-digest-advisory fired=671 offload=0 keep=0 suggest=671' -- 671 large-read tasks were SUGGESTED for Ollama but ZERO auto-offloaded (suggest-only, never wired to auto-execute).
- scripts/ask-ollama.mjs DEFAULT_TIMEOUT_MS=180000 (180s) -- a 57KB summarize timed out, so big inputs exceed this.
- Known files: scripts/ask-ollama.mjs, scripts/lib/cag-router.mjs, .claude/hooks/ollama-task-offloader.mjs, OllamaCapabilityProbeEngine, OllamaHookBridgeEngine, /ollama-* skills, ollama-offload-dashboard.mjs.
- Canonical host facts: state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md. Memories: reference_ollama_fanout_ratelimit_fix_2026_06_09, reference_ollama_rewriter_failure_re
... [+696 chars truncated]

### Assistant | 2026-06-11T13:31:07.614Z

I'll systematically trace the Ollama routing and fallback architecture. Let me start with broad discovery in parallel.

### Assistant | 2026-06-11T13:31:08.076Z

[tool_use: Glob]

### Assistant | 2026-06-11T13:31:09.182Z

[tool_use: Glob]

### Assistant | 2026-06-11T13:31:09.360Z

[tool_use: Glob]

### User | 2026-06-11T13:31:09.817Z

[tool_result] .claude\hooks\__tests__\autonomous-loop-defer.test.mjs
scripts\adapt-router-thresholds.mjs
scripts\apply-hook-fast-lane.mjs
scripts\async-hook-runner.mjs
scripts\audit-edit-hooks.mjs
scripts\audit-roadmap-drift.mjs
scripts\audit-round-aggregate.mjs
scripts\audit-untracked-refs.mjs
scripts\audit-wiki-coverage.mjs
scripts\audit-worktrees.mjs
scripts\auto-close-shipped-envelopes.mjs
scripts\auto-rese
... [+3100 chars truncated]

### User | 2026-06-11T13:31:10.025Z

[tool_result] .claude\hooks\__tests__\autonomous-loop-defer.test.mjs
.claude\hooks\lib\__pycache__\enforce-post-compact-consolidated.cpython-314.pyc
.claude\hooks\lib\_generate_hooks.py
.claude\hooks\lib\test-guidelines-injector.mjs.corrupt.zlib
.claude\hooks\lib\test-quality-gate-stop.mjs.corrupt.zlib
.claude\hooks\AGI_INFRA_PHASE_A_WIRING.md
.claude\hooks\HOOK_DIGEST.md
.claude\hooks\README.md
.claude\hooks\_
... [+5324 chars truncated]

### User | 2026-06-11T13:31:10.207Z

[tool_result] scripts\adapt-router-thresholds.mjs
scripts\apply-hook-fast-lane.mjs
scripts\async-hook-runner.mjs
scripts\audit-edit-hooks.mjs
scripts\audit-roadmap-drift.mjs
scripts\audit-round-aggregate.mjs
scripts\audit-untracked-refs.mjs
scripts\audit-wiki-coverage.mjs
scripts\audit-worktrees.mjs
scripts\auto-close-shipped-envelopes.mjs
scripts\auto-research-weekly-digest.mjs
scripts\backfill-schema-version.
... [+3065 chars truncated]

### Assistant | 2026-06-11T13:31:12.805Z

Now let me read the core files directly.

### Assistant | 2026-06-11T13:31:13.773Z

[tool_use: Read]

### Assistant | 2026-06-11T13:31:13.877Z

[tool_use: Read]

### User | 2026-06-11T13:31:15.487Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+45715 chars truncated]

### User | 2026-06-11T13:31:15.670Z

[tool_result] 1	// tier: T4
2	// NOTE: no shebang. The hook runs via explicit `node X.mjs` in the harness's
3	// UserPromptSubmit chain — never chmod+x. vite's SSR transform does not strip
4	// a line-1 `#!` and injects its preamble above, stranding the `#!` mid-file
5	// and breaking vitest's import of this file. Removing it is the cleanest fix.
6	/**
7	 * ollama-task-offloader.mjs — UserPromptSubmit hook
8	 *
... [+32363 chars truncated]

### Assistant | 2026-06-11T13:31:19.452Z

Now let me read the remaining critical files in parallel.

### Assistant | 2026-06-11T13:31:20.070Z

[tool_use: Read]

### Assistant | 2026-06-11T13:31:21.038Z

[tool_use: Read]

### Assistant | 2026-06-11T13:31:21.489Z

[tool_use: Read]

### User | 2026-06-11T13:31:21.776Z

[tool_result] 1	// scripts/lib/cag-router.mjs
2	//
3	// CAG-Router — Classify a query as COLD (cache-augmented), HOT (retrieval-augmented),
4	// or HYBRID (both layers). Implements the Cache-Augmented Generation pattern
5	// (akshay_pachaar X tweet 2056714042455343160, 2026-05-19; foundational paper
6	// Chan et al. 2024 "Don't Do RAG: When Cache-Augmented Generation is All You Need").
7	//
8	// PURPOSE
9	// PR
... [+24660 chars truncated]

### User | 2026-06-11T13:31:22.712Z

[tool_result] 1	// tier: T4
2	// BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-MODEL-RESOLVE — host-aware default model
3	// for local synthesis scripts (galaxy roll-ups, system-viz roost summaries,
4	// Obsidian memory consolidation, ask-ollama heavy modes).
5	//
6	// PROBLEM the work order names: every synthesis script hardcodes
7	// `qwen2.5-coder:7b` (or `:3b`). On the 96GB RTX PRO 6000 Blackwell that
8	// throttl
... [+5022 chars truncated]

### User | 2026-06-11T13:31:23.030Z

[tool_result] 1	// tier: T4
2	// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
3	//
4	// Replaces hardcoded "first-of-preference-list" model selection with a
5	// category → tier → model decision. Smaller / faster models for trivial
6	// tasks (classify, format-convert, prism-inventory); larger / more
7	// capable models for complex codegen / multi-step reasoning.
8	//
9	// C
... [+18764 chars truncated]

### Assistant | 2026-06-11T13:31:29.788Z

Now let me read the remaining critical files — the OllamaCapabilityProbeEngine, OllamaHookBridgeEngine, and the posttool-ollama-offload-nudge hook, plus check for any Sonnet/Claude fallback wiring.

### Assistant | 2026-06-11T13:31:30.774Z

[tool_use: Glob]

### Assistant | 2026-06-11T13:31:31.309Z

[tool_use: Glob]

### Assistant | 2026-06-11T13:31:31.780Z

[tool_use: Glob]

### User | 2026-06-11T13:31:32.034Z

[tool_result] mcp-server\src\__tests__\ErrorExplainerOllamaEscalation.test.ts
mcp-server\src\__tests__\LatheLoRAOllamaDeployerEngine.test.ts
mcp-server\src\__tests__\MultiModelConsensusOllamaResolve.test.ts
mcp-server\src\__tests__\OllamaCAMIntegrationEngine.test.ts
mcp-server\src\__tests__\OllamaCapabilityProbeEngine.test.ts
mcp-server\src\__tests__\OllamaClientEngineHost.test.ts
mcp-server\src\__tests__\Ollam
... [+1070 chars truncated]

### User | 2026-06-11T13:31:33.274Z

[tool_result] .claude\hooks\posttool-ollama-offload-nudge.mjs

### User | 2026-06-11T13:31:38.565Z

[tool_result] .claude\hooks\ollama-route-pretooluse.mjs

### Assistant | 2026-06-11T13:31:41.434Z

Now let me read the key engine files and the two hook files in parallel.

### Assistant | 2026-06-11T13:31:41.928Z

[tool_use: Read]

### Assistant | 2026-06-11T13:31:42.418Z

[tool_use: Read]

### Assistant | 2026-06-11T13:31:42.946Z

[tool_use: Read]

### Assistant | 2026-06-11T13:31:42.950Z

[tool_use: Read]

### User | 2026-06-11T13:31:44.036Z

[tool_result] 1	/**
2	 * OllamaCapabilityProbeEngine — BLACKWELL-AI-MS0 / U-CAP-PROBE (keystone)
3	 *
4	 * The single RUNTIME AUTHORITY for "what can this host actually run right now."
5	 *
6	 * `ModelRoutingEngine` is a deliberately PURE scorer — its header states it does
7	 * NO network I/O and requires the caller to supply a `RoutingContext`
8	 * (`hardware` + `backendUp`). Nothing detected those from the li
... [+24401 chars truncated]

### User | 2026-06-11T13:31:45.204Z

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
... [+17090 chars truncated]

### User | 2026-06-11T13:31:50.101Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * posttool-ollama-offload-nudge.mjs — PostToolUse hook
5	 *
6	 * TOKEN-SAVINGS-PIVOT/U-PSN-OLLAMA-POSTREAD (iter15-#2, 2026-05-23, slot:alpha)
7	 *
8	 * Gap-fill #2 of the 5-fill PSN goal. After a Read of a large file
9	 * (CLAUDE.md, ENGINE_DIGEST, MEMORY.md, large engine, etc.), suggest
10	 * routing the next summarize/explain pass through Ollama
11	 
... [+3059 chars truncated]

### User | 2026-06-11T13:31:50.146Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * ollama-route-pretooluse.mjs — PreToolUse:Read — route trivial bulk reads at the local LLM.
5	 *
6	 * U-HKA04 of HOOKS-AUTOMATION-V2-MS0. Tool-level complement to the prompt-level
7	 * offloaders (ollama-auto-router.mjs / ollama-task-offloader.mjs) and to
8	 * mcp-server/src/engines/OllamaHookBridgeEngine.ts.
9	 *
10	 * WHY: a 50 KB .log / .jsonl / gen
... [+26575 chars truncated]

### Assistant | 2026-06-11T13:31:54.086Z

Now let me check for any Claude/Sonnet fallback wiring in the codebase, and read the OllamaTaskOffloaderEngine and the NIM_FALLBACK_TO_OLLAMA env var usage.

### Assistant | 2026-06-11T13:31:56.072Z

[tool_use: Grep]

### Assistant | 2026-06-11T13:31:56.750Z

[tool_use: Grep]

### User | 2026-06-11T13:32:01.892Z

[tool_result] .claude\hooks\ai-system-router-inject.mjs:28:  engine_creation: { system: "opus", fallback: "sonnet" },
.claude\hooks\ai-system-router-inject.mjs:29:  code_review: { system: "haiku", fallback: "sonnet" },
.claude\hooks\ai-system-router-inject.mjs:30:  ml_inference: { system: "ollama", model: "codellama", fallback: "claude" },
.claude\hooks\cog-bridge-context-auto-compact.mjs:16: *           absent
... [+2225 chars truncated]

### User | 2026-06-11T13:32:03.811Z

[tool_result] .claude\settings.json:12:    "NIM_FALLBACK_TO_OLLAMA": "1",
knowledge\wiki\reference\local-llm-routing---ollama-models-loaded-on-this-machine.md:31:**NIM/VLLM fallback:** env vars `NIM_URL=http://127.0.0.1:8000/v1`, `VLLM_URL=http://127.0.0.1:8020/v1`, `LOCAL_LLM_BACKEND=auto`, `NIM_FALLBACK_TO_OLLAMA=1`. Auto-started by `nim-autostart.mjs` SessionStart hook.
state\shared\DOCKER-NIM-AUDIT-2026-06-
... [+519 chars truncated]

### User | 2026-06-11T13:34:40.264Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   The user is running a READ-ONLY security/architecture audit of PRISM's Ollama (local-LLM) integration, specifically the **ROUTING + FALLBACK ARCHITECTURE** slice. The task is:
   - Trace the end-to-end offload flow: what classifier decides a task goes to Ollama, how ask-ollama picks a model (OllamaCapabilityProbeEngine or hardcoded?), what happens on Ollama failure/timeout/unreachable
   - CRITICAL: Find whether ANY Sonnet/Claude fallback exists today when Ollama is down, and where it would wire in
   - Map the actual call graph with file:line citations
   - Flag every silent-skip-on-failure path (failures that silently return nothing or fall to Claude without telemetry)
   - Repo root: H:/prism-slot-india. READ-ONLY — no modifications allowed.

   Live facts pre-verified (do not re-derive):
   - Ollama healthy at http://127.0.0.1:11434
   - 12 models installed: deepseek-r1:32b, qwen3-coder:30b, qwen2.5-coder:1.5b, gpt-oss:120b, qwen2.5-coder:32b, gpt-oss:20b, qwen3-vl:8b, qwen2.5vl:7b, moondream:1.8b, llama3.2-vision:11b, nomic-embed-text
   - Live env: PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1, PRISM_OLLAMA_ROUTE_AUTO=1, NIM_FALLBACK_TO_OLLAMA=1
   - KEY GAP: telemetry shows `large-read-digest-advisory fired=671, offload=0, keep=0, suggest=671` — 671 large-read tasks SUGGESTED but ZERO auto-offloaded
   - DEFAULT_TIMEOUT_MS=180000 (180s) — a 57KB summarize still timed out
   - Operator wants "Sonnet agents as the FALLBACK if Ollama fails"

2. Key Technical Concepts:
   - Ollama local-LLM offload architecture (UserPromptSubmit hook → ask-ollama.mjs)
   - Fallback chain: Ollama → Docker Models (only daemon-down patterns); no Sonnet fallback exists
   - Model selection: `resolveSynthesisModel` → `routeModelForTask` (tier-based: cheap/balanced/strong/best)
   - `OllamaCapabilityProbeEn
... [+13255 chars truncated]

### Assistant | 2026-06-11T13:34:47.526Z

[tool_use: Read]

### Assistant | 2026-06-11T13:34:48.126Z

[tool_use: Read]

### User | 2026-06-11T13:34:48.893Z

[tool_result] 488	
489	// ── Docker Models fallback (DOCKER-MCP-WIRE-MS0/U-MODELS-FALLBACK) ──────────
490	// When the Ollama daemon is wedged/down, route the same prompt to Docker
491	// Models (`docker model run`) so PRISM's local-LLM offload degrades instead
492	// of failing hard. Opt-in via callLocalModel; callOllama itself is untouched.
493	
494	/** Ollama error substrings that mean "daemon down" — the on
... [+1187 chars truncated]

### User | 2026-06-11T13:34:49.539Z

[tool_result] 488	  // zero double-counting.
489	  const hintFlippedOutcome = !!(hint && classification.savings < CONFIDENCE_THRESHOLD);
490	
491	  const ollama = await isOllamaAvailable();
492	  if (!ollama.available) {
493	    // OLLAMA-DEV-01: record the would-be-offloaded event so dashboards
494	    // show the lost-opportunity volume.
495	    recordOllamaEvent({
496	      hook: HOOK_NAME, decision: "sugges
... [+1093 chars truncated]

### Assistant | 2026-06-11T13:34:53.572Z

All evidence is confirmed. Proceeding to the final StructuredOutput call.

### Assistant | 2026-06-11T13:36:04.604Z

[tool_use: StructuredOutput]

### User | 2026-06-11T13:36:05.123Z

[tool_result] Structured output provided successfully
