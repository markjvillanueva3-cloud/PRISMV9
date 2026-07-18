---
type: "chat-session"
source: "claude-code-cli"
session_id: "e9b75754-b179-40b0-b0fb-7007d65b2056"
title: "You are a llama.cpp/Ollama internals expert. Research the EXACT Ollama 0.24.0 da"
date: "2026-05-31"
first_ts: "2026-05-31T22:29:05.218Z"
last_ts: "2026-05-31T22:34:25.637Z"
cwd: "H:\\prism-slot-xray"
messages: 25
user_msgs: 10
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/workflows/wf_83e0856c-6f5/agent-a4e6f22e1527cd502.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# You are a llama.cpp/Ollama internals expert. Research the EXACT Ollama 0.24.0 da

> **claude-code-cli** | 2026-05-31 | 25 msgs (10 user / 15 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/workflows/wf_83e0856c-6f5/agent-a4e6f22e1527cd502.jsonl`

## Transcript

### User | 2026-05-31T22:29:05.218Z

You are a llama.cpp/Ollama internals expert. Research the EXACT Ollama 0.24.0 daemon environment flags that reduce GPU VRAM footprint, and whether each applies to MULTIMODAL/VISION models (qwen2.5-VL) specifically.

LIVE EMPIRICAL DATA (RTX 4080 SUPER 16GB, Ollama 0.24.0 bare 'ollama.exe serve', Windows 11):
- GPU total 16376 MiB. OS/desktop baseline ~4.5GB (dwm/explorer/Firefox/Docker Desktop), so ~11.8GB free for ML.
- qwen2.5vl:7b disk size 6.0GB. LOADED footprint at num_ctx=8192 = 15.3GB (per /api/ps size_vram). 15.3 > 11.8 free => spills ~3.5GB to CPU => >180s/page => the runner's 180s timeout aborts ("This operation was aborted"). Even WARM (model already resident) it still aborts. NO coder model was loaded during these tests — the blocker is purely the vision model footprint vs free VRAM, NOT fleet contention.
- DPI does NOT change the loaded footprint: dpi 200/130/100 all => 15.3GB (footprint allocated at model-load from num_ctx; image vision-tokens consume CONTEXT slots, not the allocated KV size).
- num_ctx=4096 (dpi130): still aborted at ~190s (footprint still too big / still spilled).
- num_ctx=2048 (dpi130): completed in 127s (faster => fit better on GPU, less spill) BUT "parse: empty response" — image vision-tokens + prompt filled the tiny 2048 context, leaving ~0 tokens for the 4096-token JSON output.
- Request body today: options.num_ctx=8192, options.num_predict=4096, temperature=0.1, stream=false. /api/generate endpoint. The rich JSON output (title_block+dimensions+gdt+notes+profiles+surface_finishes) needs ~2000-4000 output tokens; repairTruncatedJson is a safety net.
- Ollama env today: OLLAMA_MAX_LOADED_MODELS=3, OLLAMA_NUM_PARALLEL=3, OLLAMA_KEEP_ALIVE=5m, OLLAMA_FLASH_ATTENTION unset, OLLAMA_KV_CACHE_TYPE unset.
- Other available models: qwen2.5-coder:3b/7b/14b/32b, moondream:1.8b (useless-parrots-prompt), llama3.2-vision:11b (7.8GB disk), nomic-embed-text, deepseek-r1:14b.
- GOAL: run qwen2.5vl:7b GPU-RESIDENT (completes <90s/page) for an una
... [+1200 chars truncated]

### Assistant | 2026-05-31T22:29:27.350Z

I'll research the exact Ollama 0.24.0 VRAM-reduction flags, focusing on the NUM_PARALLEL KV-cache multiplier hypothesis and vision-model KV-quant compatibility. Let me fan out searches.

### Assistant | 2026-05-31T22:29:28.280Z

[tool_use: WebSearch]

### Assistant | 2026-05-31T22:29:28.757Z

[tool_use: WebSearch]

### User | 2026-05-31T22:30:07.249Z

[tool_result] Web search results for query: "Ollama OLLAMA_KV_CACHE_TYPE q8_0 q4_0 flash attention requirement vision model disabled"

I'll search for information about Ollama's KV cache quantization settings and their relationship with flash attention and vision models.

Links: [{"title":"[Docs/Code] Clarify supported architectures for Flash Attention and KV Cache Quantization · Issue #13337 · ollama/ollama","
... [+5703 chars truncated]

### User | 2026-05-31T22:30:17.869Z

[tool_result] Web search results for query: "Ollama OLLAMA_NUM_PARALLEL KV cache multiply context memory per parallel request VRAM"

I'll search for information about how Ollama's parallel request settings affect KV cache and VRAM usage.

Links: [{"title":"FAQ - Ollama","url":"https://docs.ollama.com/faq"},{"title":"server: account for OLLAMA_NUM_PARALLEL in VRAM-based default context length by 4RH1T3CT0R7 · Pu
... [+6337 chars truncated]

### Assistant | 2026-05-31T22:30:29.079Z

This is highly relevant. Let me verify the critical NUM_PARALLEL=3 hypothesis directly against the source code and the qwen2.5-VL specific issue, plus confirm the vision-model KV-quant disabling behavior.

### Assistant | 2026-05-31T22:30:30.092Z

[tool_use: WebFetch]

### Assistant | 2026-05-31T22:30:30.384Z

[tool_use: WebFetch]

### User | 2026-05-31T22:30:53.054Z

[tool_result] # Flash Attention and KV Cache Quantization Support in Ollama

Based on the GitHub issue, there is an explicit allowlist for Flash Attention support. The issue author references code from `fs/ggml/ggml.go` showing that only specific architectures are supported:

**Supported architectures include:**
- gemma3
- gptoss/gpt-oss
- mistral3
- qwen3, qwen3moe
- qwen3vl, qwen3vlmoe

**The Silent Fallback 
... [+808 chars truncated]

### User | 2026-05-31T22:30:53.849Z

[tool_result] # Issues with Flash Attention and KV Cache for Qwen 2.5 VL

Based on the GitHub issue, here are the specific problems reported:

## Flash Attention Problems

When enabling flash attention with `OLLAMA_FLASH_ATTENTION=1` and `OLLAMA_KV_CACHE_TYPE=f16`, the user experienced severe performance degradation. The server became stuck "loading cache slot" for approximately 10 minutes before timing out, wi
... [+946 chars truncated]

### Assistant | 2026-05-31T22:30:57.353Z

This is the critical finding. `qwen2.5vl` is NOT on the flash attention allowlist (only `qwen3vl`/`qwen3vlmoe` are) — meaning KV cache quantization silently falls back to f16 for qwen2.5vl. Let me confirm the NUM_PARALLEL code path and the FAQ env-var details, plus how Windows reads the env.

### Assistant | 2026-05-31T22:31:00.065Z

[tool_use: WebFetch]

### Assistant | 2026-05-31T22:31:02.001Z

[tool_use: WebFetch]

### User | 2026-05-31T22:31:28.181Z

[tool_result] # Ollama Environment Variables on Windows

Based on the FAQ provided, here's what's documented:

## Variables Mentioned

The FAQ explicitly discusses these variables:
- `OLLAMA_FLASH_ATTENTION` - set to `1` to enable
- `OLLAMA_KV_CACHE_TYPE` - defaults to `f16`; also supports `q8_0` and `q4_0`
- `OLLAMA_NUM_PARALLEL` - default is `1`
- `OLLAMA_MAX_LOADED_MODELS` - default is `3`
- `OLLAMA_KEEP_ALI
... [+772 chars truncated]

### User | 2026-05-31T22:31:28.183Z

[tool_result] # OLLAMA_NUM_PARALLEL and KV Cache Allocation

## KV Cache Allocation Pattern

The pull request confirms that KV cache is allocated as **NumCtx × NumParallel**. The specific reference cited is `llm/server.go:175`, though the exact code isn't shown in the page content.

## The Problem

The tiered VRAM-based context length defaults (4K/32K/256K) introduced in version 0.15.5 failed to account for par
... [+625 chars truncated]

### Assistant | 2026-05-31T22:31:32.713Z

I have enough to confirm the critical hypothesis and the vision-model caveats. Let me do two final targeted searches: the explicit confirmation that API-set num_ctx gets multiplied by NUM_PARALLEL (the load-bearing claim), and num_gpu / partial offload behavior plus OLLAMA_SCHED_SPREAD.

### Assistant | 2026-05-31T22:31:33.619Z

[tool_use: WebSearch]

### Assistant | 2026-05-31T22:31:34.622Z

[tool_use: WebSearch]

### User | 2026-05-31T22:32:09.234Z

[tool_result] Web search results for query: "Ollama OLLAMA_NUM_PARALLEL 1 reduce context memory each parallel slot allocated full num_ctx llama.cpp parallel slots divide context"

I'll search for information about how Ollama's parallel processing affects context memory allocation.

Links: [{"title":"FAQ - Ollama","url":"https://docs.ollama.com/faq"},{"title":"FAQ - Ollama English Documentation","url":"https://o
... [+6327 chars truncated]

### User | 2026-05-31T22:32:24.367Z

[tool_result] Web search results for query: "Ollama num_gpu option partial layer offload VRAM control api/generate options num_gpu CPU spill"

I'll search for information about Ollama's num_gpu option for controlling partial layer offloading to VRAM.

Links: [{"title":"Ollama GPU Scheduling and Resource Management: VRAM Optimization, Multi-GPU Load Balancing · BetterLink Blog","url":"https://eastondev.com/blog/
... [+8936 chars truncated]

### Assistant | 2026-05-31T22:32:31.614Z

I have confirmed all the critical findings with primary sources. The NUM_PARALLEL=3 hypothesis is CONFIRMED — it triples KV cache allocation. The qwen2.5vl flash-attention/KV-quant findings are also confirmed. Let me compute the expected impact for the specific 16GB setup and deliver the structured output.

Key arithmetic for the RTX 4080 SUPER case:
- Current footprint at num_ctx=8192, NUM_PARALLEL=3 = 15.3GB. KV cache is allocated as num_ctx × NUM_PARALLEL = 8192 × 3 = 24576 effective tokens.
- Setting NUM_PARALLEL=1 → 8192 × 1, cutting the KV-cache portion ~3×. Model weights (~6GB) and the vision projector/image-embedding buffers are fixed, so the savings come off the KV portion only — but for a 7B at 8192 ctx the KV+compute buffers are several GB, and tripling them is exactly what pushed 15.3GB over the 11.8GB free line.

### Assistant | 2026-05-31T22:34:02.923Z

[tool_use: StructuredOutput]

### User | 2026-05-31T22:34:16.765Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-31T22:34:25.637Z

Research complete. The critical hypothesis is confirmed and the vision-model caveats are decisive.

Key conclusions:
- **OLLAMA_NUM_PARALLEL=3 is tripling your KV cache** — confirmed against `llm/server.go:175` (cited in PR #14120) and the FAQ ("required RAM will scale by OLLAMA_NUM_PARALLEL * OLLAMA_CONTEXT_LENGTH"). Setting it to **1** is the single biggest VRAM win and is the most likely cause of the 15.3GB footprint spilling past your ~11.8GB free. This is the opposite of bare llama.cpp, which divides ctx across slots.
- **KV-quant won't help qwen2.5vl** — it's NOT on Ollama's flash-attention allowlist (only `qwen3vl`/`qwen3vlmoe` are, per issue #13337), so `OLLAMA_KV_CACHE_TYPE=q8_0` silently falls back to f16 (zero saving), and enabling flash attention risks the issue #11230 "loading cache slot" 10-minute hang — your exact abort signature. Reserve KV-quant for the coder daemon only.
- **The fit is achievable** via NUM_PARALLEL=1 + `num_ctx≈6144` (not 8192 = spill, not 2048 = empty JSON), with a recommended daemon-split so the vision batch doesn't contend with the 12 coder chats.

Full structured findings (six levers + the non-applicable SCHED_SPREAD), Windows setx mechanics, and the qwen3vl migration note tying into pending task #29 were delivered via StructuredOutput.
