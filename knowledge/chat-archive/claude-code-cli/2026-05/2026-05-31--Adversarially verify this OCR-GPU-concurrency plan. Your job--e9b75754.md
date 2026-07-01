---
type: "chat-session"
source: "claude-code-cli"
session_id: "e9b75754-b179-40b0-b0fb-7007d65b2056"
title: "Adversarially verify this OCR-GPU-concurrency plan. Your job is to REFUTE config"
date: "2026-05-31"
first_ts: "2026-05-31T22:43:48.404Z"
last_ts: "2026-05-31T22:43:56.632Z"
cwd: "H:\\prism-slot-xray"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/workflows/wf_83e0856c-6f5/agent-a8eeebb4ceccc4168.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# Adversarially verify this OCR-GPU-concurrency plan. Your job is to REFUTE config

> **claude-code-cli** | 2026-05-31 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/workflows/wf_83e0856c-6f5/agent-a8eeebb4ceccc4168.jsonl`

## Transcript

### User | 2026-05-31T22:43:48.404Z

Adversarially verify this OCR-GPU-concurrency plan. Your job is to REFUTE configs that will not work, not to rubber-stamp.

LIVE EMPIRICAL DATA (RTX 4080 SUPER 16GB, Ollama 0.24.0 bare 'ollama.exe serve', Windows 11):
- GPU total 16376 MiB. OS/desktop baseline ~4.5GB (dwm/explorer/Firefox/Docker Desktop), so ~11.8GB free for ML.
- qwen2.5vl:7b disk size 6.0GB. LOADED footprint at num_ctx=8192 = 15.3GB (per /api/ps size_vram). 15.3 > 11.8 free => spills ~3.5GB to CPU => >180s/page => the runner's 180s timeout aborts ("This operation was aborted"). Even WARM (model already resident) it still aborts. NO coder model was loaded during these tests — the blocker is purely the vision model footprint vs free VRAM, NOT fleet contention.
- DPI does NOT change the loaded footprint: dpi 200/130/100 all => 15.3GB (footprint allocated at model-load from num_ctx; image vision-tokens consume CONTEXT slots, not the allocated KV size).
- num_ctx=4096 (dpi130): still aborted at ~190s (footprint still too big / still spilled).
- num_ctx=2048 (dpi130): completed in 127s (faster => fit better on GPU, less spill) BUT "parse: empty response" — image vision-tokens + prompt filled the tiny 2048 context, leaving ~0 tokens for the 4096-token JSON output.
- Request body today: options.num_ctx=8192, options.num_predict=4096, temperature=0.1, stream=false. /api/generate endpoint. The rich JSON output (title_block+dimensions+gdt+notes+profiles+surface_finishes) needs ~2000-4000 output tokens; repairTruncatedJson is a safety net.
- Ollama env today: OLLAMA_MAX_LOADED_MODELS=3, OLLAMA_NUM_PARALLEL=3, OLLAMA_KEEP_ALIVE=5m, OLLAMA_FLASH_ATTENTION unset, OLLAMA_KV_CACHE_TYPE unset.
- Other available models: qwen2.5-coder:3b/7b/14b/32b, moondream:1.8b (useless-parrots-prompt), llama3.2-vision:11b (7.8GB disk), nomic-embed-text, deepseek-r1:14b.
- GOAL: run qwen2.5vl:7b GPU-RESIDENT (completes <90s/page) for an unattended overnight blueprint-OCR batch CONCURRENTLY with up to ~12 active Claude chats that u
... [+17839 chars truncated]

### Assistant | 2026-05-31T22:43:56.632Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
