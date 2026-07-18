---
name: reference_canonical_host_facts_2026_06_09
description: "Verified DESKTOP-N7MI1VB host specs + 10-model Ollama roster (how/when) single-source-of-truth; PC specs NOT drifted but the qwen2.5-coder:7b offload default is uninstalled (real drift)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.505Z
aliases: reference_canonical_host_facts_2026_06_09
---


**Canonical host facts (slot:papa, verified live 2026-06-09):** full doc `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md`. CPU **AMD Ryzen 9 9950X3D** 16c/**32t**; GPU **RTX PRO 6000 Blackwell 96GB VRAM** (97887 MiB, driver 596.59); **127GB physical RAM** (the **227GB is the COMMIT limit = RAM+pagefile, NOT RAM** — the memory-pressure gate reports commit-charge; 65.7GB physical free at 96% commit). These MATCH [[feedback_build_for_blackwell_hardware]] (accurate/current) -> **PC specs are NOT significantly drifted.**

**Ollama roster (10 models, how/when):** `gpt-oss:120b` (65.4GB, fits the 96GB VRAM — deepest LOCAL reasoning/synthesis, underused Blackwell unlock); `gpt-oss:20b` (mid reasoning); `qwen2.5-coder:32b` (heavy code) + `qwen2.5-coder:1.5b` (trivial code); 5 VLMs `qwen3-vl:8b-instruct`/`qwen3-vl:8b`/`qwen2.5vl:7b`/`llama3.2-vision:11b`/`moondream:1.8b` (multi-VLM ensemble OCR — >=2-agree corroborated); `nomic-embed-text` (768-d embeddings).

**REAL drift (route, not papa-solo):** the fleet-documented offload default **`qwen2.5-coder:7b` is NOT installed** (global CLAUDE.md + `/ollama-*` skills + `OllamaHookBridgeEngine` + [[feedback_ollama_token_routing]]); actual = 32b heavy / 1.5b trivial. `gpt-oss:120b` + the 5-VLM ensemble under-documented. -> alpha (token-economy) + papa (hooks/OllamaHookBridgeEngine) + india/xray (AI/OCR). The "update everything for new PC specs" premise is largely already-satisfied; the actionable item is the **Ollama-routing doctrine**, not specs. R12: corrected my own U-SIDECAR-FRESHNESS-RAMGATE commit-msg "227GB RAM" misread.
