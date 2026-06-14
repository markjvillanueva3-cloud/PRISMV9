# Canonical Host Facts + Ollama Routing — DESKTOP-N7MI1VB (2026-06-09, slot:papa)

> **Single source of truth** for this host's hardware + local-LLM roster. Verified LIVE 2026-06-09 (`os.cpus/totalmem/freemem`, `nvidia-smi`, `ollama /api/tags`). Every doc/skill/CLAUDE.md that cites specs or Ollama models should reference THIS file, not re-state numbers (that is how the drift this campaign targets accumulates). Advisory; re-verify before relying if >14 days old.

## Hardware (verified live)

| Component | Value | Notes |
|-----------|-------|-------|
| CPU | **AMD Ryzen 9 9950X3D**, 16-core / **32-thread** | matches `feedback_build_for_blackwell_hardware` |
| GPU | **NVIDIA RTX PRO 6000 Blackwell Workstation**, **96 GB VRAM** (97,887 MiB), driver 596.59 | matches the Blackwell feedback; the 96 GB VRAM is the headline capability |
| RAM (physical) | **127 GB** (~128 GB installed), 65.7 GB free at probe time | the feedback's "136 GB" is ~accurate (minor) |
| Commit limit | **227 GB** (physical RAM + pagefile) | **NOT RAM** — this is the metric the memory-pressure gate reports |
| OS / host | Windows 11 (10.0.22631) / DESKTOP-N7MI1VB | sole active user of H: |

> **R12 CORRECTION (this session):** the `U-SIDECAR-FRESHNESS-RAMGATE` commit message stated "Host RAM now 227GB (was 136GB)" — that was a **misread of the commit-charge limit (227 GB = RAM+pagefile) as physical RAM**. Physical RAM is **127 GB**, and the `feedback_build_for_blackwell_hardware` memory (136 GB) is approximately accurate, NOT drifted. The 96.1% pressure was *commit-charge* pressure (218/227 GB), with 65.7 GB physical RAM still free.

> **Spec-drift verdict:** the PC specs are **NOT significantly drifted** — `feedback_build_for_blackwell_hardware` (dated today) already matches GPU + CPU + (approx) RAM. The "update everything on new PC specs" premise is largely already-satisfied; the real drift is in the **Ollama routing doctrine** below.

## Ollama local-LLM roster (10 models, verified live) — how + when to use

The 96 GB Blackwell VRAM is the unlock: a **65 GB model (`gpt-oss:120b`) fits resident**, enabling deep local reasoning that previously had to go to Claude.

| Model | Size | Use for | Replaces / note |
|-------|------|---------|-----------------|
| **gpt-oss:120b** | 65.4 GB | **Deepest local reasoning/synthesis** — galaxy-synthesis, complex multi-step summarization, cross-file distillation where Claude-grade reasoning isn't strictly required. The Blackwell headline. | NEW capability; underused |
| **gpt-oss:20b** | 13.8 GB | Mid-tier reasoning/triage/classify — faster than 120b, general explain | — |
| **qwen2.5-coder:32b** | 19.9 GB | **Heavy code** explain / review / lint / diff-summary / docstring — the strongest local coder | **REPLACES the doc'd `qwen2.5-coder:7b` (NOT installed)** |
| **qwen2.5-coder:1.5b** | 1.0 GB | Ultra-fast trivial code tasks (tiny classify, var-rename hints) — near-zero latency | — |
| **qwen3-vl:8b-instruct** | 6.1 GB | Vision OCR (instruction-tuned) — blueprint/dimension extraction | VLM ensemble member |
| **qwen2.5vl:7b** | 6.0 GB | Vision OCR — blueprint extraction | VLM ensemble member |
| **llama3.2-vision:11b** | 7.8 GB | Vision OCR (diverse family for consensus) | VLM ensemble member |
| **qwen3-vl:8b** | 6.1 GB | General vision-language | — |
| **moondream:1.8b** | 1.7 GB | Fast lightweight vision | — |
| **nomic-embed-text:latest** | 0.3 GB | **All embeddings** (memory/wiki/tribal sidecars, 768-d) | canonical embed model |

**Multi-VLM ensemble OCR** (xray's blueprint pipeline): run `qwen3-vl:8b-instruct` + `qwen2.5vl:7b` + `llama3.2-vision:11b` (diverse families) -> >=2-agree = corroborated, 1-of-N = hallucination-candidate. The 96 GB VRAM holds several VLMs resident + concurrent.

## Drift this surfaces (route to lanes — NOT a papa-solo rewrite)

1. **`qwen2.5-coder:7b` is the documented offload default fleet-wide** (global CLAUDE.md, `/ollama-*` skills, `OllamaHookBridgeEngine`, `feedback_ollama_token_routing`) **but is NOT installed.** Update the default to `qwen2.5-coder:32b` (heavy) / `1.5b` (trivial). -> **alpha (token-economy) + papa (OllamaHookBridgeEngine/hooks)**.
2. **`gpt-oss:120b` deep-reasoning + the 5-VLM ensemble are under-documented** in routing doctrine. -> alpha + india (AI) + xray (OCR).
3. Spec docs: minimal action — point spec-citing docs at THIS file; correct any pre-Blackwell GPU/RAM mentions if found.

## Campaign scope note (honest)
The operator directive (update CLAUDE.md/memories/wikis across 34 galaxies + GSD + settings + hooks + ~440 slash commands + pipelines) is a **multi-chat, fleet-wide campaign**, most of it per-galaxy = each owning slot's lane. It should be orchestrated against THIS canonical facts file, sequenced AFTER the host's commit-charge pressure is relieved, and NOT bulk-executed in a single context. Papa's direct lane: the canonical facts (this file), the Ollama-default fix in hooks/`OllamaHookBridgeEngine`, settings/scripts that cite stale models.
