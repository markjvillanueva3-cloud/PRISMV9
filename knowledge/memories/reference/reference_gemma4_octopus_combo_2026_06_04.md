---
name: reference_gemma4_octopus_combo_2026_06_04
description: "Gemma 4 31B is a strong Blackwell candidate (165 t/s, beats Qwen3.5-32B); wired install-gated into cost-router best tier. Octopus combo-local LLM consensus is ALREADY built."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.587Z
aliases: reference_gemma4_octopus_combo_2026_06_04
---


# Gemma 4 31B + hybrid/combo octopus LLMs (2026-06-04, slot:alpha, U-BW-GEMMA4)

Operator question: "look into gemma 4 31b for utilization in our system. can we run hybrid or combo llms utilizing octopus?"

## Gemma 4 31B — YES, strong candidate (live web research, post-Jan-2026-cutoff)
- Released early 2026, Apache-2.0, **Ollama-native** (`ollama run gemma4`). Family: E2B, E4B, **26B MoE (3.8B active)**, **31B Dense**.
- 31B Dense benchmarks: AIME 2026 **89.2%**, LiveCodeBench v6 80%, GPQA Diamond 85.7%, MMLU-Pro **85.2%**, #3 Arena. Beats Llama 4 and Qwen 3.5-32B on math+reasoning. **Caveat:** trails Qwen 3.6 on HumanEval by ~14pts → it's a *reasoning/synthesis* star, NOT the top pure-coder (qwen2.5-coder:32b / gpt-oss stay the coders).
- **On the RTX PRO 6000 Blackwell: ~165 tok/s with MTP** — FASTER than gpt-oss:120b (134) and ~5× the dense 70/72B (~30). ~62GB full precision; **~20GB at Q4** (+ up to 22GB KV at 262K ctx).
- **Action shipped (`28c56cd437`):** wired `gemma4:31b` into cost-router `best` tier, install-gated, ordered BELOW gpt-oss:120b (120B leads synthesis breadth) but ABOVE the dense 70/72B (gemma4 beats them on speed AND reasoning). +2 test assertions. golf asked (chat-bus) to pull + VERIFY the exact tag (`gemma4:31b` vs `:31b-it` vs the 26b MoE) — install-gated so a tag typo is harmless until corrected.

## Hybrid/combo LLMs via octopus — ALREADY BUILT (no engine change needed)
- `mcp-server/src/engines/MultiModelConsensusEngine.ts` already supports **multiple LOCAL Ollama voices**: `dualOllama` mode with `DEFAULT_OLLAMA_MODEL = "gpt-oss:120b"` + `DEFAULT_SECONDARY_OLLAMA_MODEL = "qwen2.5-coder:32b"` (two distinct local voices), alongside cloud voices (Claude/Gemini/Grok/Codex). My BLACKWELL-MODEL-UPGRADE note is already in the engine (lines 163-174).
- It resolves the **live installed set** via `ollamaClientEngine.listModels()` + falls back gracefully → the moment golf pulls `gemma4:31b` it's **auto-eligible as a 3rd local consensus voice**. No code change required for combo-local.
- 96GB headroom: gpt-oss:120b (65GB) + gemma4:31b Q4 (~20GB) co-reside (~85GB, tight) OR swap via keep-alive. A combo octopus run = gpt-oss:120b (synthesis) + gemma4:31b (reasoning) + qwen2.5-coder:32b (code), all local, diverse-family consensus, zero cloud/IP-leak.

## Net recommendation
Run a **3-model local octopus on the Blackwell**: gpt-oss:120b (synthesis breadth) + gemma4:31b (fast strong reasoning, 165 t/s) + qwen2.5-coder:32b (code). Diverse families → real consensus (not echo). 100% local (IP-safe). gemma4:31b is the highest-ROI addition: fastest strong reasoner that fits with headroom. Cloud voices stay opt-in reviewers only.

Related: [[reference_blackwell_model_retirement_2026_06_04]] · [[reference_hermes_router_u1_2026_06_04]]. Wiki: [[blackwell-token-synergy-ms0]].
