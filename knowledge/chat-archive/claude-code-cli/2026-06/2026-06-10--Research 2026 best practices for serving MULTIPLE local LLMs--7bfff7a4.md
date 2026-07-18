---
type: "chat-session"
source: "claude-code-cli"
session_id: "7bfff7a4-521b-41bc-9719-fe5a0f593d86"
title: "Research 2026 best practices for serving MULTIPLE local LLMs concurrently on one"
date: "2026-06-10"
first_ts: "2026-06-10T15:03:55.069Z"
last_ts: "2026-06-10T15:06:21.451Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/workflows/wf_d6fc4216-b84/agent-afc3a671aa42f2c8a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Research 2026 best practices for serving MULTIPLE local LLMs concurrently on one

> **claude-code-cli** | 2026-06-10 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/workflows/wf_d6fc4216-b84/agent-afc3a671aa42f2c8a.jsonl`

## Transcript

### User | 2026-06-10T15:03:55.069Z

Research 2026 best practices for serving MULTIPLE local LLMs concurrently on one 96GB GPU (Ollama vs vLLM vs TGI): model co-residency, KV-cache sizing, num_ctx/num_predict tuning, throughput, and multi-model consensus ('octopus') orchestration. Target hardware: RTX PRO 6000 Blackwell 96GB VRAM + Ryzen 9950X3D 32T + 136GB RAM + NVMe. Single-GPU large-VRAM box. Local LLMs via Ollama (qwen2.5-coder:32b heavy, gpt-oss:120b deep ~64GB, gpt-oss:20b mid, :1.5b trivial).

Return <=350 words of CONCRETE, CITED findings (URLs/paper names). Lead with the 2-3 highest-leverage actionable techniques. The current month is June 2026 -- prefer recent sources. End with a 'Sources:' list.

### Assistant | 2026-06-10T15:04:08.638Z

I'll research this directly. Given the query names Ollama/vLLM/TGI (non-Anthropic providers), I'll skip the Claude-specific skill and focus on current serving best practices.

### Assistant | 2026-06-10T15:04:09.143Z

[tool_use: WebSearch]

### Assistant | 2026-06-10T15:04:09.649Z

[tool_use: WebSearch]

### User | 2026-06-10T15:04:52.295Z

[tool_result] Web search results for query: "vLLM vs Ollama multiple models single GPU 96GB concurrent serving 2026 KV cache"

I'll search for information on serving multiple models concurrently on a single GPU with vLLM and Ollama.

Links: [{"title":"Ollama vs vLLM: Local vs Production LLM Inference Compared (2026) | Spheron Blog","url":"https://www.spheron.network/blog/ollama-vs-vllm/"},{"title":"Ollama vs vL
... [+11409 chars truncated]

### User | 2026-06-10T15:04:53.481Z

[tool_result] Web search results for query: "vLLM gpu-memory-utilization multiple models one GPU sleep mode 2025 2026"

I'll search for information about that query.

Links: [{"title":"Zero-Reload Model Switching with vLLM Sleep Mode | vLLM Blog","url":"https://blog.vllm.ai/2025/10/26/sleep-mode.html"},{"title":"Zero-Reload Model Switching with vLLM Sleep Mode | vLLM Blog","url":"https://vllm-project.github.io/
... [+6632 chars truncated]

### Assistant | 2026-06-10T15:05:03.795Z

I have strong material. Let me get one more targeted source on Ollama concurrency tuning and multi-model consensus orchestration.

### Assistant | 2026-06-10T15:05:04.644Z

[tool_use: WebSearch]

### User | 2026-06-10T15:05:47.326Z

[tool_result] Web search results for query: "Ollama OLLAMA_MAX_LOADED_MODELS OLLAMA_NUM_PARALLEL concurrent models VRAM tuning 2025"

I'll search for information about Ollama's concurrency settings and VRAM tuning.

Links: [{"title":"FAQ - Ollama","url":"https://docs.ollama.com/faq"},{"title":"How Ollama Handles Parallel Requests - Rost Glukhov | Personal site and technical blog","url":"https://www.glukhov.org/
... [+7571 chars truncated]

### Assistant | 2026-06-10T15:06:21.451Z

**Highest-leverage techniques (do these first):**

1. **vLLM Sleep Mode for octopus model-switching** — The 2025-10 vLLM feature directly solves multi-model co-residency. Keeps CUDA context/graphs/kernels warm while releasing VRAM; wake is **18–200× faster than reload** (~0.1–0.8s small, 3–6s large). Level 1 offloads weights to your 136GB RAM (you have ample); Level 2 discards to NVMe. For a consensus loop cycling 32b↔120b↔20b on one 96GB card, this beats Ollama's cold reloads. KV cache is dropped on sleep, so first post-wake request re-prefills. (vLLM blog, Oct 2025)

2. **Set `gpu_memory_utilization` to 0.70–0.80, NOT 0.90, when co-resident** — The dominant multi-model failure is over-provisioning KV cache. 0.90 leaves no headroom for multiple model states/context-switch overhead; 0.70–0.80 is the stability sweet spot. With FP8 (`--quantization fp8`) you halve weights at minimal quality cost — relevant since gpt-oss:120b ~64GB leaves little room for a co-resident 32b. (Lyceum; Andrejus blog 2026-04)

3. **For Ollama specifically, tune three env vars to fit, not to over-subscribe** — `OLLAMA_MAX_LOADED_MODELS` (default 3×GPUs) caps resident distinct models; **a model must fit *entirely* in VRAM to co-load**. `OLLAMA_NUM_PARALLEL` (default 1, auto 4) multiplies KV cache by parallelism × context — raise only with headroom. Set `OLLAMA_FLASH_ATTENTION=1`, tune `OLLAMA_KEEP_ALIVE` to your octopus cadence to avoid LRU evict-reload churn. Known limit: `NUM_PARALLEL` batches within one instance, it does NOT spawn duplicate instances. (Ollama FAQ; Glukhov 2025-05)

**Engine choice:** Ollama has *lower per-model baseline overhead* (weights + ~256MB vs vLLM's pre-allocated KV blocks) and on-demand loading — better for the octopus pattern of intermittent, genuinely-distinct models. vLLM wins ~8–9× aggregate throughput only under high *concurrent* load (at batch=1 they're within 2–10%). For a single-box consensus orchestrator, keep Ollama for simplicity OR adopt vLLM+Sleep Mod
... [+557 chars truncated]
