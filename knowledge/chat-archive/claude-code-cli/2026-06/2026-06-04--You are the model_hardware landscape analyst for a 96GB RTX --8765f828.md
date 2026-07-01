---
type: "chat-session"
source: "claude-code-cli"
session_id: "8765f828-890b-45ba-8af4-4bbf24e81b0b"
title: "You are the model+hardware landscape analyst for a 96GB RTX PRO 6000 Blackwell. "
date: "2026-06-04"
first_ts: "2026-06-04T02:27:35.847Z"
last_ts: "2026-06-04T02:31:39.695Z"
cwd: "H:\\PRISM"
messages: 21
user_msgs: 9
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_f2d44328-ff9/agent-a7de8bca6fa7f45f8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# You are the model+hardware landscape analyst for a 96GB RTX PRO 6000 Blackwell. 

> **claude-code-cli** | 2026-06-04 | 21 msgs (9 user / 12 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_f2d44328-ff9/agent-a7de8bca6fa7f45f8.jsonl`

## Transcript

### User | 2026-06-04T02:27:35.847Z

You are the model+hardware landscape analyst for a 96GB RTX PRO 6000 Blackwell. 
== HARDWARE GROUND TRUTH (DESKTOP-N7MI1VB, verified live this session) ==
- GPU: NVIDIA RTX PRO 6000 Blackwell Workstation Edition — 96GB VRAM (97887 MiB). Currently only ~11GB used, ~85GB FREE, GPU util 1%, 30C, 20W of 600W. MASSIVELY underutilized.
- CPU: AMD Ryzen 7 7800X3D (8-core). RAM: 127GB total (~98GB free).
- Ollama models dir: H:/Tools/ollama/models. Ollama server reachable at http://127.0.0.1:11434.

== 11 MODELS ALREADY INSTALLED (ollama, sorted by size) ==
- qwen2.5-coder:32b (19.9GB) completion/tools/insert
- qwen2.5-coder:14b (9.0GB) completion/tools/insert
- deepseek-r1:14b (9.0GB) completion/THINKING
- llama3.2-vision:11b (7.8GB) vision/completion
- qwen3-vl:8b-instruct (6.1GB) vision/completion/tools
- qwen3-vl:8b (6.1GB) vision/completion/tools/THINKING
- qwen2.5vl:7b (6.0GB) vision/completion
- qwen2.5-coder:7b (4.7GB) completion/tools/insert
- qwen2.5-coder:3b (1.9GB) completion/tools/insert
- moondream:1.8b (1.7GB) completion/vision
- nomic-embed-text:latest (0.3GB) embedding

== CURRENT OLLAMA CONFIG (env vars, live) ==
OLLAMA_FLASH_ATTENTION=1 (good) · OLLAMA_NUM_PARALLEL=4 · OLLAMA_MAX_LOADED_MODELS=4 · OLLAMA_KEEP_ALIVE=-1 (infinite) · OLLAMA_KV_CACHE_TYPE=UNSET · OLLAMA_GPU_OVERHEAD=UNSET.
These are conservative settings tuned for a 16GB card (the machine was an RTX 4080 SUPER until a 2026-06-03 BLACKWELL-GPU-SWAP).

== THE CORE PROBLEM ==
1. Offload rate is only 11.2% (354 offloaded vs 2810 kept on Claude); CLAUDE.md target is >=30%.
2. ~18 PRISM hooks HARDCODE qwen2.5-coder:7b — the entire local-inference fleet is a 7B monoculture, leaving 85GB of a $10K workstation GPU idle.
3. The hook ollama-route-pretooluse.mjs fired 4606 times and offloaded 0 (dead routing path).
4. Only ollama-prewarm-on-pipeline.mjs has a richer phase->model table (32b/14b/deepseek-r1:14b/7b).

== PRISM CONTEXT ==
PRISM is a manufacturing-intelligence platform (print-to-program for m
... [+2316 chars truncated]

### Assistant | 2026-06-04T02:27:44.363Z

I'll research current model options and do the VRAM math. Let me kick off parallel searches and verify the live hardware state.

### Assistant | 2026-06-04T02:27:46.297Z

[tool_use: Bash]

### Assistant | 2026-06-04T02:27:47.527Z

[tool_use: WebSearch]

### Assistant | 2026-06-04T02:27:47.666Z

[tool_use: WebSearch]

### User | 2026-06-04T02:28:01.538Z

[tool_result] {"models":[{"name":"qwen3-vl:8b-instruct","model":"qwen3-vl:8b-instruct","modified_at":"2026-05-31T19:43:25.3857854-05:00","size":6140415975,"digest":"0533d74300e4f9bc367d675d4e64ffd073d50ff16a2b4096c---VERSION---
{"version":"0.30.3"}

### User | 2026-06-04T02:28:29.962Z

[tool_result] Web search results for query: "Ollama RTX PRO 6000 Blackwell sm_120 CUDA support version 2026"

I'll search for information about Ollama's CUDA support for the RTX PRO 6000 Blackwell GPU.

Links: [{"title":"Hardware support - Ollama","url":"https://docs.ollama.com/gpu"},{"title":"Upgrading to Blackwell GPU: PyTorch Compatibility, CUDA Support, and Real-ESRGAN Benchmark | by Allen Kuo (kwyshell) | 
... [+4438 chars truncated]

### User | 2026-06-04T02:28:33.504Z

[tool_result] Web search results for query: "best Ollama coding model 2026 qwen3-coder devstral codestral VRAM Q4_K_M comparison"

I'll search for information about the best Ollama coding models in 2026.

Links: [{"title":"Best Ollama Models: 12 Models Ranked for Coding, RAG & Agents (2026) | Morph","url":"https://www.morphllm.com/best-ollama-models"},{"title":"Best Ollama Models for Coding in 2026 — We Tested 
... [+6721 chars truncated]

### Assistant | 2026-06-04T02:28:39.002Z

Key finding already: the installed Ollama is **0.30.3** (newer than the 0.13.5 benchmark build, so Blackwell sm_120 is supported), GPU is being used live. Also a critical Blackwell insight: at 1.8 TB/s GDDR7, Q4 quantization gives almost no speedup over BF16 — meaning on this card we should prefer **higher-precision quants** (Q6/Q8/fp16) for quality since VRAM is abundant. Let me research the remaining roles.

### Assistant | 2026-06-04T02:28:40.418Z

[tool_use: WebSearch]

### Assistant | 2026-06-04T02:28:41.823Z

[tool_use: WebSearch]

### Assistant | 2026-06-04T02:28:41.920Z

[tool_use: WebSearch]

### User | 2026-06-04T02:29:18.449Z

[tool_result] Web search results for query: "best embedding model Ollama 2026 bge-m3 qwen3-embedding embeddinggemma mxbai-embed-large vs nomic-embed-text MTEB"

I'll search for information about the best embedding models for Ollama in 2026.

Links: [{"title":"Ollama Embedding Models: Benchmarks, VRAM, and Which to Use | Morph","url":"https://www.morphllm.com/ollama-embedding-models"},{"title":"13 Best Embedding
... [+8903 chars truncated]

### User | 2026-06-04T02:29:21.018Z

[tool_result] Web search results for query: "llama3.3:70b qwen3:32b deepseek-r1 32b 70b reasoning Ollama VRAM Q4_K_M 2026 benchmark"

I'll search for information about these models and their VRAM requirements and benchmarks.

Links: [{"title":"Ollama VRAM Requirements: Complete 2026 Guide to GPU Memory for Local LLMs | LocalLLM.in","url":"https://localllm.in/blog/ollama-vram-requirements-for-local-llms"},{"titl
... [+9540 chars truncated]

### User | 2026-06-04T02:29:37.759Z

[tool_result] Web search results for query: "best open vision OCR model 2026 qwen3-vl 32b minicpm-v got-ocr engineering blueprint technical drawing Ollama VRAM"

I'll search for information about the best open vision OCR models in 2026 for engineering blueprints and technical drawings.

Links: [{"title":"Multimodal AI: The Best Open-Source Vision Language Models in 2026","url":"https://www.bentoml.com/blog/mult
... [+14253 chars truncated]

### Assistant | 2026-06-04T02:29:40.866Z

I have enough to do the full analysis. Let me get one more current data point on Qwen3-Coder MoE variants and exact Ollama tag sizes, plus verify the live GPU/parallel KV behavior.

### Assistant | 2026-06-04T02:29:41.818Z

[tool_use: WebSearch]

### Assistant | 2026-06-04T02:29:42.815Z

[tool_use: WebSearch]

### User | 2026-06-04T02:30:15.615Z

[tool_result] Web search results for query: "qwen3-coder:30b ollama size GB MoE 30b-a3b vs qwen2.5-coder:32b benchmark 2026"

I'll search for information about these Qwen coding models.

Links: [{"title":"qwen3-coder:30b","url":"https://ollama.com/library/qwen3-coder:30b"},{"title":"qwen3:30b-a3b","url":"https://ollama.com/library/qwen3:30b-a3b"},{"title":"qwen3-coder:30b-a3b-q4_K_M","url":"https://ollama.com/l
... [+7235 chars truncated]

### User | 2026-06-04T02:30:17.542Z

[tool_result] Web search results for query: "Ollama OLLAMA_KV_CACHE_TYPE q8_0 f16 flash attention VRAM savings 2026 OLLAMA_NUM_PARALLEL context"

I'll search for information about Ollama's KV cache type settings and VRAM optimization.

Links: [{"title":"Bringing K/V Context Quantisation to Ollama | smcleod.net","url":"https://smcleod.net/2024/12/bringing-k/v-context-quantisation-to-ollama/"},{"title":"Optimizin
... [+9691 chars truncated]

### Assistant | 2026-06-04T02:31:39.695Z

I have all the research I need. Here is the report.

---

# Optimal Model Roster — RTX PRO 6000 Blackwell (96GB) for PRISM

## Executive summary

The card has **~85GB free of 96GB**. The installed fleet is a 7B monoculture using ~11GB. The single biggest structural finding from the research changes the whole quantization strategy: **on Blackwell's 1.8 TB/s GDDR7, Q4 quantization is ~6% *slower* than BF16** because the memory-bandwidth savings no longer outweigh the dequant compute cost ([databasemart benchmark](https://www.databasemart.com/blog/ollama-gpu-benchmark-pro6000)). With 85GB free, **stop optimizing for VRAM scarcity and start optimizing for quality** — run the larger/denser models at **Q6_K / Q8_0**, keep many models resident simultaneously, and run `OLLAMA_KV_CACHE_TYPE=f16` (not q8_0) because we have the VRAM and f16 KV is highest fidelity for K-sensitive coder/reasoner work.

Ollama is **0.30.3** (verified live), well past the 0.13.5 build confirmed working on this card — **sm_120 / CUDA 12.8+ is already supported**, GPU is live (util seen). No upgrade blocker.

---

## VRAM math: how much fits at once

Q4_K_M ≈ 0.6 GB/B params; Q6_K ≈ 0.8 GB/B; Q8_0 ≈ 1.0 GB/B; +context KV. KV at f16 ≈ ~1 GB per 32K tokens (coder-class), and **KV scales with `NUM_PARALLEL × num_ctx`** — that is the real budget driver, not weights, once you go parallel.

With 96GB (reserve ~6GB for desktop/driver/overhead → ~90GB usable), you can keep a **strong coder + reasoner + vision + embedder all warm** AND still hold a second coder and OCR specialist, with generous parallel KV headroom.

### Recommended resident roster (fits 90GB with room to spare)

| Role | Model | Quant | Weights | Resident rationale |
|------|-------|-------|---------|--------------------|
| Primary coder (chat/agentic) | **qwen3-coder:30b** (30B-A3B MoE) *(acquire)* | Q8_0 | ~32 GB | Beats qwen2.5-coder:32b on benchmarks; 256K ctx; agentic/tool-trained. Q8 erases the 1-2% Q4 coding hit. |
| Autocomplete / F
... [+10399 chars truncated]
