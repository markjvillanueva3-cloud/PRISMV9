---
name: reference_post_ship_blackwell-vllm-plan-u-vllm-phase0-poc-kit
description: Auto-distilled learnings from shipping BLACKWELL-VLLM-PLAN/U-VLLM-PHASE0-POC-KIT (commit 4a5ba7f59). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.766Z
aliases: reference_post_ship_blackwell-vllm-plan-u-vllm-phase0-poc-kit
---


# BLACKWELL-VLLM-PLAN/U-VLLM-PHASE0-POC-KIT

[MAIN] [BLACKWELL-VLLM-PLAN]/U-VLLM-PHASE0-POC-KIT (slot:golf): Phase-0 POC kit for the vLLM incorporation plan. Materializes blueprint TIER-0.3: docker-compose.local-llm.yml (vLLM :8020 OpenAI API, served-model-name local-vllm matching existing vllm-hook-bridge.mjs, profile-gated opt-in, restart:no, nvidia GPU reservation, 80B fp8 default + env override for small smoke model) + scripts/vllm-poc/benchmark.mjs (OpenAI-compat throughput A/B harness vLLM vs Ollama @concurrency=26, 6/6 unit tests) + VLLM-POC-RUNBOOK (smoke-plumbing -> 80B fp8 footprint -> throughput A/B, NO-GO gates each). Reversible, no consumer code, nothing permanent. Host verified: docker 29.4.3 + nvidia runtime + WSL2.

**Shipped:** 2026-06-10T10:40:34-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[blackwell-vllm-plan-u-vllm-phase0-poc-kit]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._