---
type: "chat-session"
source: "claude-code-cli"
session_id: "fc51c2d9-4fcf-4e38-82b0-3a6b100a553c"
title: "LIVE HARDWARE/STATE (2026-06-03, verified this session): - GPU: NVIDIA RTX PRO 6"
date: "2026-06-03"
first_ts: "2026-06-03T17:46:34.070Z"
last_ts: "2026-06-03T17:48:29.721Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/fc51c2d9-4fcf-4e38-82b0-3a6b100a553c/subagents/workflows/wf_197110bb-e66/agent-af5114d8bc7dd7eb4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# LIVE HARDWARE/STATE (2026-06-03, verified this session): - GPU: NVIDIA RTX PRO 6

> **claude-code-cli** | 2026-06-03 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fc51c2d9-4fcf-4e38-82b0-3a6b100a553c/subagents/workflows/wf_197110bb-e66/agent-af5114d8bc7dd7eb4.jsonl`

## Transcript

### User | 2026-06-03T17:46:34.070Z

LIVE HARDWARE/STATE (2026-06-03, verified this session):
- GPU: NVIDIA RTX PRO 6000 Blackwell, 96GB VRAM (97887 MiB), sm_120, driver 596.59. ~76GB free with a 7B resident.
- Ollama v0.30.3, GPU-accelerated (220 tok/s on qwen2.5-coder:7b), models at H:/Tools/ollama/models: qwen2.5-coder 3b/7b/14b/32b, deepseek-r1:14b, qwen2.5vl:7b, qwen3-vl:8b + 8b-instruct, llama3.2-vision:11b, moondream, nomic-embed-text. (qwen3-vl:8b is ALREADY present.)
- NVIDIA NIM: Docker up (29.4.3); nim-llama32-3b container deploying. NIM_URL=http://127.0.0.1:8000/v1, NIM_FALLBACK_TO_OLLAMA=1. NIM/vLLM can run larger models on 96GB.
- kimi2.6: NOT in the ollama library (pull returns 404). Kimi K2 is a ~1T-param MoE; investigate whether ANY kimi2.6 variant realistically fits 96GB (quantized) vs needs CPU-offload / multi-GPU / cloud API.
- It is JUNE 2026 — SEARCH THE WEB for the CURRENT kimi2.6 + qwen3.x releases, sizes, quants, ollama tags, benchmarks. Do NOT rely on training-cutoff knowledge; cite URLs.
Repo root: H:/prism. PRISM is a manufacturing-intelligence MCP platform; local LLMs offload mechanical work from Claude (summarize/classify/extract/docstring/lint/embed) AND power RAG/CAG/embeddings/octopus-consensus/tribal/wiki/memory/injection generation.
OUTPUT RULES: plain text only (NO JSON, no StructuredOutput). Concrete + cited: URLs for web claims, file:line for code claims. Explicitly flag anything that does NOT fit 96GB + its fallback. Always say WHICH model for WHICH role.

=== GROUND: kimi2.6 ===
GROUND-1 — kimi2.6 capability + local-serving research (June 2026, web-verified)

(1) WHAT "kimi2.6" IS
"kimi2.6" = Kimi K2.6, Moonshot AI's open-weight flagship, released 2026-04-20.
- Total params: 1 trillion (sparse MoE). Active params/token: 32B. 384 experts, 8 routed + 1 shared per token, 61 layers, MLA attention (64 heads), SwiGLU, 160K vocab.
- Native multimodal (text + image + video) via a MoonViT 400M vision encoder.
- Context: 256K tokens (262,144). Output up to ~98K.
- Ships na
... [+74804 chars truncated]

### Assistant | 2026-06-03T17:48:29.721Z

I'll synthesize the four ground-research blocks into the prioritized integration blueprint. All code claims below are from the GROUND/RESEARCH blocks (verified against live PRISM code this session); I cite file:line and URLs where load-bearing.

---

# PRISM LOCAL-LLM INTEGRATION BLUEPRINT — kimi2.6 + qwen3 on RTX PRO 6000 Blackwell (96GB), June 2026

## 1. MODEL-ROLE MATRIX

| Model | Quant / size | Fits 96GB? | PRISM role(s) | Serve on |
|-------|-------------|-----------|---------------|----------|
| **kimi2.6 (Kimi K2.6)** | UD-TQ1_0 ~247GB (smallest) | **BLOCKED** — 247GB min, needs 256GB+ system RAM for MoE-offload; <2 tok/s at desktop RAM | Deep-agentic orchestration (Hermes/Zulu), agentic-RAG, octopus *escalation* voice only | **CLOUD** — Moonshot API or NVIDIA NIM `moonshotai/kimi-k2.6`. Fallback: local `qwen3-coder-next` 80B-base |
| **qwen3-coder:30b-a3b** (Q8) | ~32GB | YES (resident) | **Mechanical-offload WORKHORSE**: docstring/summarize/classify/lint/diff/G-code text · HyDE-draft · RAPTOR-leaf · system-viz roost narration · GNN rich-node-text gen (Stage 1) · octopus secondary voice | Ollama |
| **qwen3-next:80b-a3b-instruct** (Q4_K_M) | ~42GB | YES (swap-in, not co-resident w/ Q8 coder) | Heavy local reasoning · octopus PRIMARY voice · long-ctx synthesis (256K) · local CAG host · injection/CLAUDE.md draft · cross-galaxy viz Q&A · RAPTOR upper-tree | vLLM (preferred) or Ollama swap-in |
| **qwen3-embedding:8b** (Q8, 768-d MRL) | ~8GB | YES (resident) | **RAG/CAG/tribal/wiki/memory dense embeddings** · GNN node features · NN trainer input (single source) | Ollama `/api/embed` |
| **dengcao/Qwen3-Reranker-4B** (Q5_K_M) | ~4GB | YES (resident) | **NEW 2nd-stage rerank** over top-100 dense candidates (PRISM has none today) | Ollama |
| **qwen3-vl:8b** (Q4, installed) / **:30b** (~20GB on-demand) | ~7GB / ~20GB | YES | Blueprint/CAD OCR · visual-coding · image-bearing viz nodes (xray/delta legs) | Ollama |
| **qwen2.5-coder:32b / 7b** (existing) | ~20GB / ~
... [+16045 chars truncated]
