# BLACKWELL-VLLM-PLAN/U-VLLM-PHASE0-POC-KIT — [MAIN] [BLACKWELL-VLLM-PLAN]/U-VLLM-PHASE0-POC-KIT (slot:golf): Phase-0 POC kit for the vLLM incorporation plan. Materializes blueprint TIER-0.3: docker-compose.local-llm.yml (vLLM :8020 OpenAI API, served-model-name local-vllm matching existing vllm-hook-bridge.mjs, profile-gated opt-in, restart:no, nvidia GPU reservation, 80B fp8 default + env override for small smoke model) + scripts/vllm-poc/benchmark.mjs (OpenAI-compat throughput A/B harness vLLM vs Ollama @concurrency=26, 6/6 unit tests) + VLLM-POC-RUNBOOK (smoke-plumbing -> 80B fp8 footprint -> throughput A/B, NO-GO gates each). Reversible, no consumer code, nothing permanent. Host verified: docker 29.4.3 + nvidia runtime + WSL2.

**Commit:** `4a5ba7f59d8b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T10:40:34-05:00
**Tags:** blackwell-vllm-plan, u-vllm-phase0-poc-kit, auto-distilled

## Subject
[MAIN] [BLACKWELL-VLLM-PLAN]/U-VLLM-PHASE0-POC-KIT (slot:golf): Phase-0 POC kit for the vLLM incorporation plan. Materializes blueprint TIER-0.3: docker-compose.local-llm.yml (vLLM :8020 OpenAI API, served-model-name local-vllm matching existing vllm-hook-bridge.mjs, profile-gated opt-in, restart:no, nvidia GPU reservation, 80B fp8 default + env override for small smoke model) + scripts/vllm-poc/benchmark.mjs (OpenAI-compat throughput A/B harness vLLM vs Ollama @concurrency=26, 6/6 unit tests) + VLLM-POC-RUNBOOK (smoke-plumbing -> 80B fp8 footprint -> throughput A/B, NO-GO gates each). Reversible, no consumer code, nothing permanent. Host verified: docker 29.4.3 + nvidia runtime + WSL2.

## Body
```
[MAIN] [BLACKWELL-VLLM-PLAN]/U-VLLM-PHASE0-POC-KIT (slot:golf): Phase-0 POC kit for the vLLM incorporation plan. Materializes blueprint TIER-0.3: docker-compose.local-llm.yml (vLLM :8020 OpenAI API, served-model-name local-vllm matching existing vllm-hook-bridge.mjs, profile-gated opt-in, restart:no, nvidia GPU reservation, 80B fp8 default + env override for small smoke model) + scripts/vllm-poc/benchmark.mjs (OpenAI-compat throughput A/B harness vLLM vs Ollama @concurrency=26, 6/6 unit tests) + VLLM-POC-RUNBOOK (smoke-plumbing -> 80B fp8 footprint -> throughput A/B, NO-GO gates each). Reversible, no consumer code, nothing permanent. Host verified: docker 29.4.3 + nvidia runtime + WSL2.
```

## Files touched (5)
- docker-compose.local-llm.yml                      |  54 +++++++++++++++++++++++++++++
- scripts/vllm-poc/benchmark.mjs                    | 152 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/vllm-poc/benchmark.test.mjs               |  61 ++++++++++++++++++++++++++++++++
- state/shared/specs/VLLM-POC-RUNBOOK-2026-06-10.md |  93 +++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 360 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4a5ba7f59d8b`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-VLLM-PLAN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._