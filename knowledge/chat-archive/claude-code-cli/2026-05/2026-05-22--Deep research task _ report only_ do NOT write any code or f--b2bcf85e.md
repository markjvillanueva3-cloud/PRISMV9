---
type: "chat-session"
source: "claude-code-cli"
session_id: "b2bcf85e-9d6a-49ed-8071-1d2fba3122aa"
title: "Deep research task — report only, do NOT write any code or files. Use WebSearch "
date: "2026-05-22"
first_ts: "2026-05-22T19:38:46.387Z"
last_ts: "2026-05-22T19:41:02.157Z"
cwd: "H:\\prism"
messages: 24
user_msgs: 10
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/b2bcf85e-9d6a-49ed-8071-1d2fba3122aa/subagents/agent-a10bdee2931f23cf2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Deep research task — report only, do NOT write any code or files. Use WebSearch 

> **claude-code-cli** | 2026-05-22 | 24 msgs (10 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b2bcf85e-9d6a-49ed-8071-1d2fba3122aa/subagents/agent-a10bdee2931f23cf2.jsonl`

## Transcript

### User | 2026-05-22T19:38:46.387Z

Deep research task — report only, do NOT write any code or files. Use WebSearch for current (May 2026) information; the current month is May 2026 so search with that year. If you fetch specific pages, prefer the Playwright MCP tools (mcp__plugin_playwright_playwright__*) over WebFetch per project convention, but WebSearch is fine for discovery.

## Context — what this is for
PRISM is a manufacturing-intelligence platform. It runs a local-LLM offload layer to save Anthropic API tokens: tasks like code-explain, summarize, docstring generation, classify, lint, diff-summary, and error-triage are routed OFF Claude to a local model. Today that local model is **Ollama running qwen2.5-coder:7b**, but the measured offload rate is only **8%** — the target is ≥30%. So the goal is picking the best local model(s) to raise that offload rate and cut Claude token spend.

## Hardware constraints (HARD — do the VRAM math against these exact numbers)
- GPU: **NVIDIA RTX 4080 SUPER, 16 GB VRAM (16,376 MiB total)**, CUDA 13.2, driver 595.97
- System RAM: **128 GB** (so CPU/RAM offload of layers is viable, just slower)
- Currently ~12 GB of the 16 GB VRAM is consumed by two NVIDIA NIM Docker containers (llama-3.2-3b-instruct + an nv-embedqa-e5-v5 embedding model). Only ~4 GB VRAM is free with both NIMs up.
- So there are two scenarios to size models for: (A) **NIMs stay up → ~4 GB VRAM budget** for an additional model; (B) **NIMs dropped → ~14-15 GB usable VRAM** for a single larger coder model.

## Research questions — answer each concretely
1. **Latest Qwen models (as of May 2026).** What is the newest Qwen family suitable for *coding* offload work? Cover Qwen2.5-Coder and any newer release (Qwen3 / Qwen3-Coder if it exists). For each candidate give: parameter size, available GGUF quantizations, and the approximate VRAM footprint at Q4_K_M / Q5_K_M / Q8 quants. Identify which specific model+quant fits scenario A (~4 GB) and which fits scenario B (~14 GB). Include coding-benchmark numbe
... [+1548 chars truncated]

### Assistant | 2026-05-22T19:39:03.775Z

I'll research the latest local LLM options for PRISM's offload layer. Let me start with parallel searches on the key topics.

### Assistant | 2026-05-22T19:39:04.004Z

[tool_use: WebSearch]

### Assistant | 2026-05-22T19:39:04.480Z

[tool_use: WebSearch]

### Assistant | 2026-05-22T19:39:04.687Z

[tool_use: WebSearch]

### User | 2026-05-22T19:39:17.992Z

[tool_result] Web search results for query: "Qwen2.5-Coder 7B VRAM Q4_K_M Q5_K_M Q8 GGUF size"

I'll search for information about the VRAM requirements and GGUF file sizes for Qwen2.5-Coder 7B quantizations.

Links: [{"title":"Qwen/Qwen2.5-Coder-7B-Instruct-GGUF · Hugging Face","url":"https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF"},{"title":"Qwen/Qwen2.5-7B-Instruct-GGUF · Hugging Face","url":"http
... [+3470 chars truncated]

### User | 2026-05-22T19:39:19.506Z

[tool_result] Web search results for query: "Kimi K2 model size parameters MoE local run requirements 2026"

I'll search for information about the Kimi K2 model specifications and requirements.

Links: [{"title":"Kimi K2 Thinking: Run Locally Guide | Unsloth Documentation","url":"https://unsloth.ai/docs/models/tutorials/kimi-k2-thinking-how-to-run-locally"},{"title":"Kimi K2.5 Technical Paper Interpretation: Co
... [+4673 chars truncated]

### User | 2026-05-22T19:39:19.511Z

[tool_result] Web search results for query: "Qwen3-Coder model release 2026 parameter sizes GGUF quantization"

I'll search for information about the Qwen3-Coder model.

Links: [{"title":"unsloth/Qwen3-Coder-Next-GGUF · Hugging Face","url":"https://huggingface.co/unsloth/Qwen3-Coder-Next-GGUF"},{"title":"Qwen3-Coder-Next: The Complete 2026 Guide to Running Powerful AI Coding Agents Locally - DEV Community","url
... [+5047 chars truncated]

### Assistant | 2026-05-22T19:39:22.966Z

Good progress. Let me dig deeper into the smaller Qwen3 coder models for the scenario-A (4GB) budget, and benchmark numbers.

### Assistant | 2026-05-22T19:39:23.349Z

[tool_use: WebSearch]

### Assistant | 2026-05-22T19:39:23.597Z

[tool_use: WebSearch]

### Assistant | 2026-05-22T19:39:23.927Z

[tool_use: WebSearch]

### User | 2026-05-22T19:39:52.134Z

[tool_result] Web search results for query: "Qwen2.5-Coder 3B 1.5B Ollama tokens per second RTX 4080"

I'll search for information on Qwen2.5-Coder performance on RTX 4080.

Links: [{"title":"Qwen2.5 Speed Benchmark - Qwen - Read the Docs","url":"https://qwen.readthedocs.io/en/v2.5/benchmark/speed_benchmark.html"},{"title":"Local LLM Speed: RTX 3060, Qwen2 & Llama Benchmark Results - Ajit Singh","url":"https://
... [+3531 chars truncated]

### User | 2026-05-22T19:39:52.579Z

[tool_result] Web search results for query: "Qwen3-Coder-30B-A3B HumanEval Aider benchmark VRAM Q4"

I'll search for information about the Qwen3-Coder-30B-A3B model and its benchmark performance.

Links: [{"title":"Qwen/Qwen3-Coder-30B-A3B-Instruct · Hugging Face","url":"https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct"},{"title":"nm-testing/Qwen3-Coder-30B-A3B-Instruct-W4A16-awq · Hugging Face","url":"
... [+4061 chars truncated]

### User | 2026-05-22T19:39:53.104Z

[tool_result] Web search results for query: "Qwen3-Coder-1.7B OR Qwen3-Coder-4B small model Ollama coding"

I'll search for information about small Qwen3-Coder models for Ollama.

Links: [{"title":"qwen3-coder","url":"https://ollama.com/library/qwen3-coder"},{"title":"qwen3:1.7b-q4_K_M","url":"https://ollama.com/library/qwen3:1.7b-q4_K_M"},{"title":"qwen3","url":"https://ollama.com/library/qwen3"},{"title":"qwe
... [+3862 chars truncated]

### Assistant | 2026-05-22T19:39:56.475Z

I have enough on the larger models. Let me get specific benchmark numbers for the small models that fit scenario A, and confirm Ollama availability of the latest Qwen coder variants.

### Assistant | 2026-05-22T19:39:57.000Z

[tool_use: WebSearch]

### Assistant | 2026-05-22T19:39:57.213Z

[tool_use: WebSearch]

### User | 2026-05-22T19:40:14.533Z

[tool_result] Web search results for query: "Qwen3 4B coding benchmark HumanEval LiveCodeBench score"

I'll search for information about the Qwen3 4B model's coding benchmark scores.

Links: [{"title":"SWE-bench & LiveCodeBench Leaderboard (March 2026) — AI Coding Benchmarks | BenchLM.ai","url":"https://benchlm.ai/coding"},{"title":"Qwen 3.6 Plus Review: Alibaba's Frontier-Level Agentic Coding Model | MindStudi
... [+3288 chars truncated]

### User | 2026-05-22T19:40:16.811Z

[tool_result] Web search results for query: "Qwen2.5-Coder 7B 3B HumanEval MBPP benchmark scores comparison"

I'll search for information on the Qwen2.5-Coder benchmark scores.

Links: [{"title":"Technical Report Qwen2.5-Coder Technical Report Binyuan Hui* Jian Yang*","url":"https://arxiv.org/pdf/2409.12186"},{"title":"Qwen2.5-Coder] LLM specialized for code generation, completion, and mathematical reasoning ta
... [+3915 chars truncated]

### Assistant | 2026-05-22T19:40:20.755Z

I have enough to write a thorough report. Let me do one final search to confirm Ollama availability of the recommended scenario-A and scenario-B models and the qwen3-coder-next Ollama footprint.

### Assistant | 2026-05-22T19:40:21.266Z

[tool_use: WebSearch]

### User | 2026-05-22T19:40:39.757Z

[tool_result] Web search results for query: "Ollama qwen3-coder 30b qwen2.5-coder 7b available pull library 2026"

I'll search for information about these Ollama coding models.

Links: [{"title":"qwen3-coder:30b","url":"https://ollama.com/library/qwen3-coder:30b"},{"title":"qwen3-coder","url":"https://ollama.com/library/qwen3-coder"},{"title":"Nehc/Qwen3-Coder:30b","url":"https://ollama.com/Nehc/Qwen3-Coder:30b
... [+4315 chars truncated]

### Assistant | 2026-05-22T19:41:02.157Z

I have all the information needed. Here is the report.

---

# PRISM Local-LLM Offload — Model Selection Report (May 2026)

## Bottom Line
**Scenario A (NIMs up, ~4 GB free VRAM):** run **`qwen2.5-coder:3b` at Q4_K_M (~2.0 GB file, ~3–3.5 GB VRAM with KV cache)** — it leaves headroom, fully GPU-resident, and pushes 100+ tok/s on a 4080 SUPER. **Scenario B (drop one NIM, ~14 GB free):** run **`qwen3-coder:30b-a3b` (Qwen3-Coder-Flash) at Q4_K_M** — but it needs ~22 GB VRAM, so it does **not** fully fit even in scenario B; the best *fully-resident* B choice is **`qwen2.5-coder:14b` Q5_K_M (~10–11 GB)** or **`qwen2.5-coder:7b` Q8_0 (~9–10 GB)**. **NIM verdict: drop the llama-3.2-3b-instruct NIM, keep the embedding NIM.** That 3B chat NIM is redundant with a Qwen coder model that is strictly better at PRISM's code tasks; freeing its ~6–8 GB lets a 7B-Q8 or 14B coder run fully on-GPU, which is the single biggest lever for the 8%→30% offload jump.

## Q1 — Latest Qwen coding models
**Qwen3-Coder** is the current generation. Three sizes ship: `480B-A35B`, `30B-A3B` (Flash), and `Qwen3-Coder-Next` (80B-A3B, Feb 2026). All are MoE. None come in a true 1.7B/4B *Coder* variant — small sizes only exist in the general `qwen3` family.
- **Qwen3-Coder-30B-A3B (Flash):** 30.5B total / 3.3B active, 256K ctx. Q4_K_M ≈ **21.9 GB VRAM**; Q8 ≈ 33 GB. Does NOT fit 16 GB even with both NIMs dropped without CPU offload. On Ollama as `qwen3-coder:30b`.
- **Qwen3-Coder-Next (80B-A3B):** needs ~46 GB — not local-runnable here at all.
- **Qwen2.5-Coder (still excellent, dense, fully fits):** 7B at Q4_K_M **4.68 GB**, Q5_K_M **5.44 GB**, Q8_0 **8.1 GB** (file size; add ~1–2 GB KV/runtime). 3B at Q4 ≈ 2.0 GB; 1.5B at Q4 ≈ 1.0 GB; 14B at Q5_K_M ≈ 10–11 GB total.
- **Benchmarks:** Qwen2.5-Coder-7B-Instruct ≈ 61–88% HumanEval depending on eval harness (technical report claims high-80s; OpenCompass reproductions run much lower — treat as ~mid-tier). Qwen3-Coder-30B-A3B scores 20 on Artificial Analysi
... [+3429 chars truncated]
