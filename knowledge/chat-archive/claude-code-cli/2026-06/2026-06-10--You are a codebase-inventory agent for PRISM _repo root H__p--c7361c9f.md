---
type: "chat-session"
source: "claude-code-cli"
session_id: "c7361c9f-19ce-451b-9659-df77324c2fa1"
title: "You are a codebase-inventory agent for PRISM (repo root H:/prism). Map the COMPL"
date: "2026-06-10"
first_ts: "2026-06-10T14:58:14.193Z"
last_ts: "2026-06-10T15:02:17.614Z"
cwd: "H:\\prism\\state\\shared\\specs"
messages: 50
user_msgs: 21
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_aab93b95-c57/agent-a69d165544159c0a4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# You are a codebase-inventory agent for PRISM (repo root H:/prism). Map the COMPL

> **claude-code-cli** | 2026-06-10 | 50 msgs (21 user / 29 assistant) | cwd: H:\prism\state\shared\specs
> Raw: `H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_aab93b95-c57/agent-a69d165544159c0a4.jsonl`

## Transcript

### User | 2026-06-10T14:58:14.193Z

You are a codebase-inventory agent for PRISM (repo root H:/prism). Map the COMPLETE current Ollama integration surface = the blast radius of any future migration to a vLLM serving layer. Use Grep/Glob/Read.

Find and catalog:
1. Every consumer of the Ollama HTTP API: search for "11434", "/api/generate", "/api/chat", "/api/embeddings", "/api/embed", "/api/tags", "/api/ps" across scripts/, .claude/hooks/, mcp-server/src/.
2. The canonical offload pieces named in CLAUDE.md: OllamaHookBridgeEngine, scripts/ask-ollama.mjs, scripts/lib/ollama-verified-offload.mjs, ollama-prism-bridge.mjs, the /ollama-* skills, aiSystemRouterEngine.
3. Which Ollama models PRISM references (grep for "gpt-oss", "qwen2.5-coder", "nomic-embed", ":120b", ":32b", ":20b", VLMs like qwen3-vl/qwen2.5vl/llama3.2-vision/moondream).
4. How model selection/routing works (any host-aware model picker, keep_alive usage).
5. The brand-new GPU-VRAM admission guard just shipped: .claude/hooks/gpu-vram-admission-guard.mjs + scripts/lib/gpu-vram-guard.mjs (note it as an existing safety surface the plan must integrate with).

Return a STRUCTURED plain-text inventory grouped by category. For each item: relative path -> one-line role -> which Ollama API/feature it depends on -> migration note (does it need the OpenAI-compatible vLLM API? embeddings? model auto-swap? VLM?). Be concrete with real file paths you verified (cite path:line where useful). Flag any Ollama-ONLY feature PRISM relies on that vLLM may NOT provide (auto model-swap/keep_alive eviction, GGUF pulls, VLM serving, multi-model-on-one-endpoint).

### Assistant | 2026-06-10T14:58:26.468Z

I'll map the complete Ollama integration surface. Let me start with parallel searches across the key directories and API patterns.

### Assistant | 2026-06-10T14:58:27.399Z

[tool_use: Grep]

### Assistant | 2026-06-10T14:58:28.828Z

[tool_use: Grep]

### User | 2026-06-10T14:58:31.865Z

[tool_result] Found 254 files
_vllm-extract.mjs
H:\prism\scripts\lib\gpu-vram-guard.test.mjs
H:\prism\scripts\lib\gpu-vram-guard.mjs
H:\prism\scripts\embed-wiki-into-tribal-index.mjs
_extract-features.mjs
H:\prism\scripts\embed-cited-tips-into-tribal-index.mjs
H:\prism\scripts\embed-knowledge-store-into-tribal-index.mjs
H:\prism\scripts\embed-engines-into-tribal-index.mjs
H:\prism\scripts\ask-ollama.mjs
H:\pris
... [+14757 chars truncated]

### User | 2026-06-10T14:58:32.933Z

[tool_result] Found 241 files
_vllm-extract.mjs
H:\prism\scripts\lib\gpu-vram-guard.test.mjs
H:\prism\scripts\lib\gpu-vram-guard.mjs
H:\prism\.claude\hooks\gpu-vram-admission-guard.mjs
H:\prism\scripts\embed-wiki-into-tribal-index.mjs
_extract-features.mjs
H:\prism\scripts\embed-knowledge-store-into-tribal-index.mjs
H:\prism\scripts\embed-engines-into-tribal-index.mjs
H:\prism\scripts\ask-ollama.mjs
H:\prism\sc
... [+13553 chars truncated]

### Assistant | 2026-06-10T14:58:45.456Z

This is a large surface. Let me filter out the noise directories (prism-test-6d0595, tmp/, .scratch/, prism-consensus-recovery, plugins/cache) and focus on the canonical pieces. Let me read the core files in parallel.

### Assistant | 2026-06-10T14:58:45.457Z

[tool_use: Read]

### Assistant | 2026-06-10T14:58:45.463Z

[tool_use: Read]

### User | 2026-06-10T14:58:47.447Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\gpu-vram-guard.mjs' was already read 23m ago in this session and is unchanged (mtime 1781101621628). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-10T14:58:47.692Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\gpu-vram-admission-guard.mjs' was already read 23m ago in this session and is unchanged (mtime 1781101478064). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-10T14:58:59.890Z

The VRAM guards are already in my context from earlier this session. Let me read the core engine and routing files that I haven't seen yet.

### Assistant | 2026-06-10T14:59:00.853Z

[tool_use: Read]

### Assistant | 2026-06-10T14:59:00.884Z

[tool_use: Read]

### User | 2026-06-10T14:59:05.154Z

[tool_result] 1	/**
2	 * OllamaClientEngine — Thin client around the `ollama` npm package
3	 *
4	 * Phase external-infra. Wraps Ollama's local LLM runtime so PRISM callers
5	 * can request chat completions, plain-text generation, and embeddings
6	 * without importing the Ollama SDK directly. The real daemon must be
7	 * running (either via `docker compose up -d ollama` or a host install);
8	 * this engine is a 
... [+7630 chars truncated]

### User | 2026-06-10T14:59:05.197Z

[tool_result] 1	/**
2	 * AISystemRouterEngine
3	 *
4	 * Routes incoming AI work to the most appropriate execution system based on
5	 * task class. Spec from /forge Phase 0 Self-Awareness Protocol:
6	 *
7	 *   | Task                | System                       |
8	 *   |---------------------|------------------------------|
9	 *   | Physics validation  | Docker: physics-agent        |
10	 *   | Engine building 
... [+14070 chars truncated]

### Assistant | 2026-06-10T14:59:17.764Z

Now let me read the key offload/routing pieces: OllamaHookBridgeEngine, ModelRoutingEngine, ask-ollama.mjs, ollama-verified-offload.mjs, host-aware-synthesis-model.mjs, the offloader, and the embedder.

### Assistant | 2026-06-10T14:59:19.660Z

[tool_use: Read]

### Assistant | 2026-06-10T14:59:19.664Z

[tool_use: Read]

### User | 2026-06-10T14:59:21.228Z

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
... [+16619 chars truncated]

### User | 2026-06-10T14:59:21.677Z

[tool_result] 1	/**
2	 * ModelRoutingEngine — Phase 0.19 U-LLM7
3	 *
4	 * Decide which LLM backend/model should service a given request so simple
5	 * queries take the local Ollama path (free, on-prem, fast once warm) and
6	 * only queries that genuinely need frontier reasoning fall back to the paid
7	 * Claude/OpenAI APIs. Pure scoring function: the engine does NO network I/O
8	 * — callers feed it request fea
... [+34883 chars truncated]

### Assistant | 2026-06-10T14:59:27.784Z

Now let me read the offloader, the verified-offload lib, ask-ollama.mjs, host-aware-synthesis-model.mjs, the embedder, and the cost-router. These are the runtime model-pick and consumer surfaces.

### Assistant | 2026-06-10T14:59:28.307Z

[tool_use: Read]

### Assistant | 2026-06-10T14:59:29.223Z

[tool_use: Read]

### Assistant | 2026-06-10T14:59:29.314Z

[tool_use: Read]

### User | 2026-06-10T14:59:30.949Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+43420 chars truncated]

### User | 2026-06-10T14:59:31.836Z

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

### User | 2026-06-10T14:59:32.288Z

[tool_result] 1	// tier: T4
2	// BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-MODEL-RESOLVE — host-aware default model
3	// for local synthesis scripts (galaxy roll-ups, system-viz roost summaries,
4	// Obsidian memory consolidation, ask-ollama heavy modes).
5	//
6	// PROBLEM the work order names: every synthesis script hardcodes
7	// `qwen2.5-coder:7b` (or `:3b`). On the 96GB RTX PRO 6000 Blackwell that
8	// throttl
... [+5022 chars truncated]

### Assistant | 2026-06-10T14:59:43.816Z

I have the core routing picture. Now let me read the key remaining consumers: the offloader engine, the verified-offload lib, the embedder, the VLM/vision pieces, multi-model consensus, and the embedder factory. Let me also grep for VLM models and check the gpu-vram-guard since I have it cached. Let me read these in parallel.

### Assistant | 2026-06-10T14:59:44.755Z

[tool_use: Read]

### Assistant | 2026-06-10T14:59:45.751Z

[tool_use: Read]

### User | 2026-06-10T14:59:45.859Z

[tool_result] 1	/**
2	 * OllamaTaskOffloaderEngine
3	 *
4	 * Decides which tasks can be safely offloaded to local Ollama models
5	 * to save Claude API tokens. Uses task classification to route:
6	 *
7	 * OFFLOADABLE (free, fast):
8	 *   - Code explanations / summaries
9	 *   - Search result synthesis
10	 *   - File analysis summaries
11	 *   - Simple calculations
12	 *   - Format conversions
13	 *   - Document
... [+3903 chars truncated]

### Assistant | 2026-06-10T14:59:46.041Z

[tool_use: Read]

### User | 2026-06-10T14:59:46.856Z

[tool_result] 1	/**
2	 * OllamaEmbedderEngine
3	 * ====================
4	 *
5	 * OBSIDIAN-AUTOMATE-MS3/U-EMBEDDING-CONNECTIONS
6	 *
7	 * Lightweight wrapper around Ollama's `/api/embeddings` endpoint specialized
8	 * for the daily-brief use case: embed many short documents, then compute
9	 * pairwise cosine similarities and return them keyed by canonical pairKey
10	 * (alphabetical join of two paths).
11	 *
12
... [+3310 chars truncated]

### User | 2026-06-10T14:59:47.693Z

[tool_result] 1	// scripts/lib/vision-model-select.mjs
2	//
3	// U-XRAY-VISION-PROFILE — profile/VRAM-aware vision-model selection for blueprint OCR.
4	//
5	// WHY THIS EXISTS
6	//   ollama-vision-extract-lib.mjs pins DEFAULT_VISION_MODEL = "qwen3-vl:8b-instruct"
7	//   because the old RTX 4080 SUPER (16GB) could not fit a larger vision model
8	//   GPU-resident alongside the chat fleet's coder offload (qwen2.5
... [+22360 chars truncated]

### Assistant | 2026-06-10T14:59:56.362Z

I now have a thorough picture. Let me read the verified-offload lib, the multi-model consensus model resolver, the embedder factory, and the keep_alive/prewarm hook to complete the Ollama-only-feature flags. Let me also check the GPU-VRAM guard since the report needs its integration note (I'll read the specific admission-guard logic).

### Assistant | 2026-06-10T14:59:57.117Z

[tool_use: Read]

### Assistant | 2026-06-10T14:59:58.062Z

[tool_use: Read]

### User | 2026-06-10T14:59:58.793Z

[tool_result] 1	// scripts/lib/ollama-verified-offload.mjs
2	// U-VERIFIED-OFFLOAD (2026-06-09, slot:alpha): the keystone that makes Ollama
3	// AUTO-offload safe at "100% accuracy". Spec: state/shared/specs/OLLAMA-VERIFIED-OFFLOAD.md
4	//
5	// THE INSIGHT: a local LLM is NOT 100% accurate generatively. You get 100% NET
6	// accuracy only by WRAPPING the offload in code that VERIFIES the output, with a
7	// fai
... [+4251 chars truncated]

### Assistant | 2026-06-10T14:59:59.308Z

[tool_use: Grep]

### User | 2026-06-10T14:59:59.901Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * gpu-vram-admission-guard.mjs -- PreToolUse:Bash advisory guard.
5	 *
6	 * WHY (fleet-hygiene, slot golf): the single Blackwell workstation (RTX PRO
7	 * 6000, 96GB) serves the whole 26-slot fleet's local inference. Launching a
8	 * heavy model (gpt-oss:120b ~60GB) while the card is already near-full evicts a
9	 * warm resident model or spills to host 
... [+3618 chars truncated]

### User | 2026-06-10T15:00:00.718Z

[tool_result] 96:  /** Override the panel. Default ["gpt-oss:120b","gemma4:31b","qwen2.5-coder:32b"]. */
104:  ollamaModel?: string;             // default: probe-selected primary, else gpt-oss:120b (DEFAULT_OLLAMA_MODEL); deepseek-r1:14b retired 2026-06-04
247:// + gpt-oss:120b/20b (install-gated, 65GB pulled to golf; Playwright research:
250:// octopus REQUESTS the most powerful local voice; resolveOllamaMode
... [+944 chars truncated]

### Assistant | 2026-06-10T15:00:13.801Z

I have a comprehensive picture now. Let me do two final targeted checks: the gpu-vram-guard footprint model (to note what the guard knows), and a quick grep for the OllamaCapabilityProbeEngine and the prism_local dispatcher / local_generate (the MCP server-side route), plus the docker-launcher and prewarm. Then I'll compile the inventory.

### Assistant | 2026-06-10T15:00:15.625Z

[tool_use: Grep]

### Assistant | 2026-06-10T15:00:17.493Z

[tool_use: Grep]

### Assistant | 2026-06-10T15:00:18.903Z

[tool_use: Grep]

### User | 2026-06-10T15:00:18.929Z

[tool_result] 4:// thrash VRAM by launching a heavy local-inference model (gpt-oss:120b ~60GB)
7:// 2026-06-10: nvidia-smi reported 86.6/97.9 GB used while ollama /api/ps showed
33://   gpt-oss:120b ~= 60-65GB, qwen2.5-coder:32b ~= 20GB, gpt-oss:20b ~= 13GB.
112: * @returns {{admit:boolean, pressurePct:number, freeMb:number, estFootprintMb:number|null,
122:      admit: true, pressurePct: 0, freeMb: 0, estFootpr
... [+329 chars truncated]

### User | 2026-06-10T15:00:20.029Z

[tool_result] 274:      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
329:    ollamaUsed: boolean;
339:    let ollamaUsed = false;
351:        ollamaUsed = true;
379:      ollamaUsed,

### User | 2026-06-10T15:00:20.438Z

[tool_result] 9: * background /api/generate request to pre-load it. Returns instantly;
70:    ["-fsS", "-m", String(PROBE_TIMEOUT_SEC), `${OLLAMA_URL}/api/tags`],
79:    ["-fsS", "-m", String(PROBE_TIMEOUT_SEC), `${OLLAMA_URL}/api/ps`],
108:  // Fire a 1-token generate request, detached. The keep_alive=10m parameter
114:    keep_alive: "10m",
123:       "-d", body, `${OLLAMA_URL}/api/generate`],

### Assistant | 2026-06-10T15:02:17.614Z

I now have a complete, verified picture of the Ollama integration surface. Compiling the structured inventory.

# PRISM OLLAMA INTEGRATION SURFACE — vLLM Migration Blast Radius

Scope note: I excluded the noise trees `prism-test-6d0595/`, `tmp/prism-consensus-recovery/`, `.scratch/`, `.claude/plugins/cache/`, and `scripts/_archive/` (stale copies). The live surface is ~150 files. All paths relative to `H:/prism`.

## ARCHITECTURE SUMMARY (read this first)
- There is NO single Ollama client. The surface is bifurcated: **(A) TS engines** under `mcp-server/src/engines/` and **(B) ~80 `.mjs` scripts + hooks** that each open their own `fetch("http://127.0.0.1:11434/api/...")`. A vLLM migration must touch BOTH and there is no chokepoint to swap.
- Two competing routing brains, both pure scorers, neither does network I/O: `AISystemRouterEngine` (coarse task→backend, advisory, mostly stale-named) and `ModelRoutingEngine` (the real cost/quality/VRAM scorer with the model catalog).
- Host: single RTX PRO 6000 Blackwell 96GB, profile id `home_blackwell`. Models referenced: `gpt-oss:120b`, `gpt-oss:20b`, `gemma4:31b`, `qwen2.5-coder:32b` (held floor coder), `qwen3-coder:30b-a3b`, `qwen3-next:80b-a3b-instruct`, `qwen3-embedding:8b`, `nomic-embed-text` (embed default), and VLMs `qwen3-vl:8b-instruct` (OCR default), `qwen2.5vl:7b`, `llama3.2-vision:11b`, `moondream:1.8b` (benched). The `:3b/:7b/:14b` coders were `ollama rm`'d 2026-06-04.

---

## CATEGORY 1 — CANONICAL ENGINES (TS, mcp-server/src/engines/)

- **OllamaClientEngine.ts** -> thin client around the `ollama` npm SDK (`new Ollama({host})`); methods `generate/chat/embed/listModels`. Depends on the SDK's `client.generate/chat/embeddings/list`, NOT raw HTTP. Host default `http://127.0.0.1:11434` (env `OLLAMA_HOST`). **Migration: highest-value chokepoint to retarget IF consumers actually used it — but most don't (they hand-roll fetch). The `ollama` SDK speaks Ollama's native API, not OpenAI — to point at vLLM you must replac
... [+17834 chars truncated]
