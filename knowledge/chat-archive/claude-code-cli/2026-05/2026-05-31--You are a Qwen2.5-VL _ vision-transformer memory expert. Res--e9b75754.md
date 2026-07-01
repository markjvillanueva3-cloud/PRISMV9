---
type: "chat-session"
source: "claude-code-cli"
session_id: "e9b75754-b179-40b0-b0fb-7007d65b2056"
title: "You are a Qwen2.5-VL / vision-transformer memory expert. Research how to reduce "
date: "2026-05-31"
first_ts: "2026-05-31T22:29:05.219Z"
last_ts: "2026-05-31T22:37:19.916Z"
cwd: "H:\\prism-slot-xray"
messages: 34
user_msgs: 14
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/workflows/wf_83e0856c-6f5/agent-a806cad0750440d0b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# You are a Qwen2.5-VL / vision-transformer memory expert. Research how to reduce 

> **claude-code-cli** | 2026-05-31 | 34 msgs (14 user / 20 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/workflows/wf_83e0856c-6f5/agent-a806cad0750440d0b.jsonl`

## Transcript

### User | 2026-05-31T22:29:05.219Z

You are a Qwen2.5-VL / vision-transformer memory expert. Research how to reduce qwen2.5-VL's LOADED GPU footprint and control its vision-token count, for Ollama.

LIVE EMPIRICAL DATA (RTX 4080 SUPER 16GB, Ollama 0.24.0 bare 'ollama.exe serve', Windows 11):
- GPU total 16376 MiB. OS/desktop baseline ~4.5GB (dwm/explorer/Firefox/Docker Desktop), so ~11.8GB free for ML.
- qwen2.5vl:7b disk size 6.0GB. LOADED footprint at num_ctx=8192 = 15.3GB (per /api/ps size_vram). 15.3 > 11.8 free => spills ~3.5GB to CPU => >180s/page => the runner's 180s timeout aborts ("This operation was aborted"). Even WARM (model already resident) it still aborts. NO coder model was loaded during these tests — the blocker is purely the vision model footprint vs free VRAM, NOT fleet contention.
- DPI does NOT change the loaded footprint: dpi 200/130/100 all => 15.3GB (footprint allocated at model-load from num_ctx; image vision-tokens consume CONTEXT slots, not the allocated KV size).
- num_ctx=4096 (dpi130): still aborted at ~190s (footprint still too big / still spilled).
- num_ctx=2048 (dpi130): completed in 127s (faster => fit better on GPU, less spill) BUT "parse: empty response" — image vision-tokens + prompt filled the tiny 2048 context, leaving ~0 tokens for the 4096-token JSON output.
- Request body today: options.num_ctx=8192, options.num_predict=4096, temperature=0.1, stream=false. /api/generate endpoint. The rich JSON output (title_block+dimensions+gdt+notes+profiles+surface_finishes) needs ~2000-4000 output tokens; repairTruncatedJson is a safety net.
- Ollama env today: OLLAMA_MAX_LOADED_MODELS=3, OLLAMA_NUM_PARALLEL=3, OLLAMA_KEEP_ALIVE=5m, OLLAMA_FLASH_ATTENTION unset, OLLAMA_KV_CACHE_TYPE unset.
- Other available models: qwen2.5-coder:3b/7b/14b/32b, moondream:1.8b (useless-parrots-prompt), llama3.2-vision:11b (7.8GB disk), nomic-embed-text, deepseek-r1:14b.
- GOAL: run qwen2.5vl:7b GPU-RESIDENT (completes <90s/page) for an unattended overnight blueprint-OCR batch CONCURRENTLY wi
... [+1097 chars truncated]

### Assistant | 2026-05-31T22:29:27.398Z

I'll research how to reduce qwen2.5-VL's GPU footprint and control vision-token count for Ollama. Let me start by gathering empirical and documented data.

### Assistant | 2026-05-31T22:29:27.865Z

[tool_use: WebSearch]

### Assistant | 2026-05-31T22:29:28.283Z

[tool_use: WebSearch]

### User | 2026-05-31T22:30:09.759Z

[tool_result] Web search results for query: "qwen2.5-vl min_pixels max_pixels image tokens resize Ollama parameter"

I'll search for information about Qwen2.5-VL's min_pixels and max_pixels parameters for image token control and resizing.

Links: [{"title":"image size of qwen2.5-vl · Issue #11217 · ollama/ollama","url":"https://github.com/ollama/ollama/issues/11217"},{"title":"Qwen3-VL/README.md at main · QwenL
... [+5175 chars truncated]

### User | 2026-05-31T22:30:15.987Z

[tool_result] Web search results for query: "qwen2.5-VL Ollama VRAM memory usage num_ctx vision encoder buffer footprint"

I'll search for information about Qwen2.5-VL memory usage in Ollama.

Links: [{"title":"Ollama VRAM Requirements: Complete 2026 Guide to GPU Memory for Local LLMs | LocalLLM.in","url":"https://localllm.in/blog/ollama-vram-requirements-for-local-llms"},{"title":"How Ollama Silently Ate 65GB 
... [+6441 chars truncated]

### Assistant | 2026-05-31T22:30:19.723Z

Strong first pass. The Ollama issue #14312 has the exact empirical numbers matching the live data (15GB at 8192, 17GB at 16384). Let me dig deeper into the KV cache math, flash attention effects, and quantized tags.

### Assistant | 2026-05-31T22:30:20.685Z

[tool_use: WebSearch]

### Assistant | 2026-05-31T22:30:21.208Z

[tool_use: WebSearch]

### User | 2026-05-31T22:30:55.681Z

[tool_result] Web search results for query: "qwen2.5vl 7b ollama q4_K_M vs q8_0 tag size GGUF quantization available tags"

I'll search for information about Qwen2.5-VL 7B quantization options on Ollama.

Links: [{"title":"qwen2.5vl:7b-q4_K_M","url":"https://ollama.com/library/qwen2.5vl:7b-q4_K_M"},{"title":"qwen2.5:7b-instruct-q4_K_M","url":"https://ollama.com/library/qwen2.5:7b-instruct-q4_K_M"},{"title":"Tag
... [+3739 chars truncated]

### User | 2026-05-31T22:31:03.101Z

[tool_result] Web search results for query: "Ollama OLLAMA_FLASH_ATTENTION OLLAMA_KV_CACHE_TYPE q8_0 vision model qwen2.5vl memory savings"

I'll search for information about Ollama's flash attention and KV cache settings with vision models.

Links: [{"title":"Bringing K/V Context Quantisation to Ollama | smcleod.net","url":"https://smcleod.net/2024/12/bringing-k/v-context-quantisation-to-ollama/"},{"title":"[D
... [+5854 chars truncated]

### Assistant | 2026-05-31T22:31:08.564Z

Now I have the quant tags and the critical insight: the live data was already running q4_K_M (6.0GB disk = 5ced39dfa4ba = :7b/:latest). That means weights are NOT the lever — the ~9GB non-weight cost is. Let me verify the vision-token math and pre-resize approach, plus the smart_resize formula.

### Assistant | 2026-05-31T22:31:09.529Z

[tool_use: WebSearch]

### Assistant | 2026-05-31T22:31:11.701Z

[tool_use: WebFetch]

### User | 2026-05-31T22:31:29.266Z

[tool_result] # Ollama Memory Usage Analysis: Qwen Model Comparison

## Exact Memory Measurements

**qwen2.5vl:7b:**
- 8,192 context: ~15 GB (100% GPU)
- 16,384 context: ~17 GB (12% CPU / 88% GPU)

**qwen3-vl:8b:**
- 32,768 context: ~11 GB (100% GPU)

## Key Finding

The smaller qwen2.5vl:7b model consumes substantially more memory than the larger qwen3-vl:8b despite having fewer parameters (8.3B vs 8.8B) and i
... [+623 chars truncated]

### User | 2026-05-31T22:31:54.340Z

[tool_result] Web search results for query: "qwen2.5-vl smart_resize visual tokens formula image 1100x1400 token count patch 28 merge"

I'll search for information about the qwen2.5-vl smart_resize function and visual token calculation.

Links: [{"title":"Qwen2.5-VL: A hands on code walkthrough | Towards AI","url":"https://towardsai.net/p/machine-learning/qwen2-5-vl-a-hands-on-code-walkthrough"},{"title":"Qwen2
... [+4109 chars truncated]

### Assistant | 2026-05-31T22:31:59.242Z

Now I have the vision-token math confirmed (~1950 tokens for a 130dpi 8.5x11) and the per-context memory scaling. Let me confirm one key lever — whether num_predict reservation interacts with num_ctx, and check the qwen3-vl:8b option since it's dramatically more memory-efficient (11GB at 32k context vs 15GB at 8k).

### Assistant | 2026-05-31T22:32:00.171Z

[tool_use: WebSearch]

### Assistant | 2026-05-31T22:32:00.539Z

[tool_use: WebSearch]

### User | 2026-05-31T22:33:00.227Z

[tool_result] Web search results for query: "qwen3-vl:8b ollama blueprint OCR document quality vs qwen2.5vl accuracy vision"

I'll search for information comparing Qwen3-VL and Qwen2.5-VL for OCR and document quality tasks.

Links: [{"title":"Qwen3-VL: How to Run Guide | Unsloth Documentation","url":"https://unsloth.ai/docs/models/qwen3-vl-how-to-run-and-fine-tune"},{"title":"Vision Model Comparison","url":"htt
... [+7145 chars truncated]

### User | 2026-05-31T22:33:10.587Z

[tool_result] Web search results for query: "ollama num_ctx num_predict relationship context window output tokens reserved KV cache allocation"

I'll search for information about the relationship between Ollama's `num_ctx` and `num_predict` parameters and how they relate to context window, output tokens, and KV cache allocation.

Links: [{"title":"Ollama Performance Optimization: Complete Guide to Quantization,
... [+11184 chars truncated]

### Assistant | 2026-05-31T22:33:14.066Z

I now have all the key data points. Let me do one final verification on whether Ollama exposes any image-resize/pixel control and confirm the KV cache size formula for qwen2.5vl architecture (num_layers, num_kv_heads, head_dim) to pin down the dominant non-weight cost.

### Assistant | 2026-05-31T22:33:15.293Z

[tool_use: WebSearch]

### Assistant | 2026-05-31T22:33:15.788Z

[tool_use: WebSearch]

### User | 2026-05-31T22:33:44.333Z

[tool_result] Web search results for query: "qwen2.5-vl 7b architecture 28 layers num_key_value_heads 4 head_dim 128 hidden GQA KV cache size per token"

I'll search for information about the Qwen2.5-VL 7B architecture specifications.

Links: [{"title":"Qwen2.5-VL · Hugging Face","url":"https://huggingface.co/docs/transformers/en/model_doc/qwen2_5_vl"},{"title":"Best Practices for Rapidly Training Vision-Langua
... [+5456 chars truncated]

### User | 2026-05-31T22:34:07.941Z

[tool_result] Web search results for query: "ollama resize image before vision model pre-resize python PIL reduce tokens base64 1024px qwen"

I'll search for information about resizing images before using vision models with Ollama.

Links: [{"title":"How to Use Ollama Vision Models for Local Image Analysis - ML Journey","url":"https://mljourney.com/how-to-use-ollama-vision-models-for-local-image-analysis/"},{"t
... [+5670 chars truncated]

### Assistant | 2026-05-31T22:34:16.227Z

I now have a complete, quantitatively-grounded picture. Let me close out the bake-off harness task context (the pending task #29 maps to this research) and synthesize the findings.

Key derivations confirmed:
- qwen2.5vl:7b at q4_K_M weights ≈ 6.0GB. KV cache = 56KB/token. At 8192 ctx = 8192 × 57344 ≈ 0.47GB at f16. So weights+KV ≈ 6.5GB — yet /api/ps shows 15.3GB. **The dominant non-weight cost is NOT KV cache and NOT image DPI — it's the vision-encoder compute graph / CUDA graph reservation** (~8.5GB), which Ollama allocates at load proportional to num_ctx, and which is the known over-estimation bug (#13687, #14312).
- This explains why DPI is irrelevant (graph sized at load) and why num_ctx 8192→2048 helped (graph reservation scales with num_ctx).
- A 130dpi 8.5×11 = 1105×1430px → ~1950 vision tokens.

Let me record the findings.

### Assistant | 2026-05-31T22:34:16.283Z

[tool_use: TaskUpdate]

### User | 2026-05-31T22:34:47.835Z

[tool_result] Updated task #29 status

### Assistant | 2026-05-31T22:36:55.389Z

[tool_use: StructuredOutput]

### User | 2026-05-31T22:36:59.404Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-31T22:37:01.622Z

[tool_use: TaskUpdate]

### User | 2026-05-31T22:37:09.021Z

[tool_result] Updated task #29 status

### Assistant | 2026-05-31T22:37:19.916Z

Research complete. The structured findings are submitted. Summary of the key conclusions:

**Root cause of the 15.3GB / DPI-invariance (your question #1):** The footprint is dominated by the **vision compute/CUDA-graph buffers (~8.8GB), pre-allocated at model-LOAD sized from `num_ctx`** — NOT KV cache (only ~0.47GB at 8k for this 4-KV-head GQA arch) and NOT image DPI. The graph is reserved before any image is seen, so DPI can never change it (images fill context *slots* at request time); `num_ctx` is the only Ollama-side footprint knob. This is the documented Ollama VL over-estimation (issues #13687, #14312).

**Concrete winning combos:**
- **qwen2.5vl:7b (current):** dpi100 (pre-resize ~1140 long-edge), `num_ctx 3072-3584`, `num_predict 1280-1536` → ~11.3-12GB, fully GPU-resident, <90s. Bake via derived Modelfile.
- **qwen3-vl:8b (recommended, gated by your bake-off task #5):** `num_ctx 8192`, `num_predict 1536` → ~9-10GB resident with better OCR (DeepStack +6-14 OCRBench) and headroom for a co-resident coder model.

**Other levers:** weights are already q4_K_M (6.0GB — no smaller standard tag, don't go up to q8_0); `OLLAMA_NUM_PARALLEL=1` for the overnight VL window removes a 3x slot multiplier; `OLLAMA_FLASH_ATTENTION=1` is a safe try (A/B test for the #11230 stall); KV-cache-quant is NOT worth it (KV isn't the bottleneck, silent f16 fallback on vision models). Vision tokens for a 130dpi 8.5×11 = ~1280 (auto-downcapped) to ~1950 (if max_pixels raised); min_pixels/max_pixels are not exposed by Ollama — pre-resize with PIL instead.
