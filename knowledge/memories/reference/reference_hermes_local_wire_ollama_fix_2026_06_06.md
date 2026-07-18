---
name: reference_hermes_local_wire_ollama_fix_2026_06_06
description: Hermes desktop app "typed a message, nothing happened" — root-caused (Anthropic 400) + fixed by wiring to local Ollama, after unwedging a multi-layer Ollama break
metadata:
  type: reference
---

Operator reported Hermes app "typed a message, nothing happened" (2026-06-06, slot:bravo). Systematic-debug found a STACK of causes:

1. **Hermes LLM provider 400 (the direct symptom):** Hermes was `provider=anthropic, model=claude-opus-4-8`; the Anthropic account returns HTTP 400 "Third-party apps now draw from your extra usage, not your plan limits" → non-retryable → silent fail. (agent.log conversation_loop.)
2. **Ollama (the intended local fallback) was fully broken:** (a) instance contention — desktop-app autostart + `PRISM Ollama Serve` task + a wedged `ollama serve` all fighting :11434 (server.log flooded with `bind: Only one usage of each socket address`); (b) **5 orphaned `llama-server.exe` GPU runners** jamming the runner layer; (c) ollama **0.30.3 hung at `common_params_fit_impl: getting device memory data`** (the new memory-fit step) for models >~8GB on the **RTX PRO 6000 Blackwell** — runner cycled `loading model`↔`not responding` forever; (d) client-timeout disconnects ABORT in-progress loads (`client connection closed before llama-server finished loading, aborting load`).

**Fix applied:** killed all ollama + 5 orphaned llama-server runners → clean single serve; **updated ollama 0.30.3 → 0.30.6** (its own downloaded per-user installer at `%LOCALAPPDATA%/Ollama/updates_v2/<hash>/OllamaSetup.exe`, /VERYSILENT); disabled `PRISM Ollama CPU Throttle` task (only needed under NIM-GPU contention, which wasn't present — GPU was 94GB free); wired Hermes config model-block → `qwen3-vl:8b-instruct / openai / http://127.0.0.1:11434/v1` (via `wire-hermes-local-backend.mjs patchModelBlock`, backup `config.yaml.bak-1780724161415`); appended `OPENAI_API_KEY=ollama-local` to Hermes `.env` (Ollama ignores the value; the openai client needs non-empty); pinned the model warm (`keep_alive:-1`); restarted Hermes.

**Confirmed:** Hermes startup logged `Cached context length qwen3-vl:8b-instruct@http://127.0.0.1:11434/v1 -> 262144 tokens` (reaches Ollama, no auth error); model warm at 114-181 tok/s on GPU. Hermes↔PRISM MCP was ALREADY configured (`mcp_servers.prism → http://127.0.0.1:3100/mcp`, :3100 healthy).

**Lessons:** large-model cold-load from the H: drive + fleet `/api/tags` polling is slow → KEEP the chat model pinned warm (keep_alive=-1) so Hermes never cold-loads; small (≤8GB) models load reliably, 13-32GB are fragile. **Durability gap:** the warm-pin is lost on any ollama restart — a prewarm task should target `qwen3-vl:8b-instruct`. **Latent:** dual ollama launchers (desktop app + `PRISM Ollama Serve` task) can re-trigger the bind-loop. Wiki [[hermes-local-ollama-wire]].
