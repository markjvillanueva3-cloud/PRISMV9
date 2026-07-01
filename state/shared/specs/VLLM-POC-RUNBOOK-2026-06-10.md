---
title: vLLM Phase-0 POC Runbook
date: 2026-06-10
author: slot:golf
status: READY-TO-RUN (gated on image pull + VRAM headroom + operator Q3)
scope: POC-ONLY - no PRISM consumer code touched; nothing made permanent
parent: VLLM-INCORPORATION-PLAN-2026-06-10.md (Phase 0)
---

# vLLM Phase-0 POC Runbook

Executes Phase 0 of `VLLM-INCORPORATION-PLAN-2026-06-10.md`: prove fp8-vLLM runs on this
Blackwell card, measure the unmeasured 80B-fp8 resident footprint, and produce our own
26-slot throughput A/B vs Ollama. **No consumer code is touched. Nothing is made permanent.**

## Artifacts (this kit)
- `docker-compose.local-llm.yml` (repo root) - vLLM service, profile `vllm` (opt-in), `restart: "no"`,
  serves the OpenAI API on `:8020` with `--served-model-name local-vllm` (matches the EXISTING
  `.claude/hooks/lib/vllm-hook-bridge.mjs`: `GET /v1/models`, `POST /v1/chat/completions`).
- `scripts/vllm-poc/benchmark.mjs` - OpenAI-compatible throughput/latency harness (vLLM OR Ollama).
- `scripts/vllm-poc/benchmark.test.mjs` - 6/6 unit tests on the aggregation math.

## Host readiness (verified 2026-06-10)
- docker 29.4.3 with the **nvidia runtime registered** (GPU passthrough available). OK.
- WSL2 Ubuntu + docker-desktop running. OK.
- vLLM image: `docker pull vllm/vllm-openai:latest` (kicked; verify present before Step 1).
- vLLM has never run here (`DOCKER_RUNTIME_STATE.json` has no vllm). This is a first bring-up.

## HARD constraint before any launch (three-way VRAM, plan section 5.2)
The 80B fp8 target reserves ~43GB (`--gpu-memory-utilization 0.45`). It fits the **88GB soft
ceiling** ONLY when Ollama's large models are evicted first. Today Ollama holds qwen2.5-coder:32b
(~51GB) resident -> 43 + 51 = 94GB > 88. **Free VRAM first:** `ollama stop qwen2.5-coder:32b`
(and any other large resident model; `ollama ps` to check). The new GPU-VRAM admission guard will
also flag a heavy launch into insufficient free VRAM.

## Steps

### Step 0 - image present
```
docker images | grep vllm    # expect vllm/vllm-openai:latest
```
If absent: `docker pull vllm/vllm-openai:latest` (multi-GB; wait for it).

### Step 1 - SMOKE (prove plumbing cheaply, ~2GB VRAM, transient)
Proves GPU passthrough + the OpenAI API end-to-end with a tiny model BEFORE the 40GB 80B download.
```
VLLM_MODEL=Qwen/Qwen2.5-0.5B-Instruct VLLM_QUANT=None VLLM_MAX_LEN=8192 VLLM_GPU_UTIL=0.10 \
  docker compose -f docker-compose.local-llm.yml --profile vllm up -d
# wait for healthy, then:
curl -s http://127.0.0.1:8020/v1/models
node scripts/vllm-poc/benchmark.mjs --url http://127.0.0.1:8020/v1 --model local-vllm --concurrency 4 --requests 8 --json
docker compose -f docker-compose.local-llm.yml --profile vllm down
```
**NO-GO gate:** container fails to start / GPU not visible in the container / API returns 500 ->
vLLM-on-this-host plumbing is broken. STOP and report; do not proceed to the 80B.

### Step 2 - 80B fp8 FOOTPRINT (the #1 unmeasured unknown; plan open-question 1)
```
ollama stop qwen2.5-coder:32b            # free VRAM (repeat for any large resident model)
docker compose -f docker-compose.local-llm.yml --profile vllm up -d   # 80B fp8 defaults
# first run downloads ~40GB weights; cold load is slow (healthcheck start_period 900s)
nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader,nounits   # RECORD footprint
```
**NO-GO gate:** if fp8 Qwen3-Next does not load (arch unsupported by this vLLM tag) -> pin
`VLLM_IMAGE` to a tag that supports Qwen3-Next, or fall back to qwen3-next Q4 on Ollama (plan
Option-A still holds). If footprint + Ollama-peak + a training window cannot coexist under 88GB ->
re-open operator Q3 (permanent reservation %).

### Step 3 - THROUGHPUT A/B at the 26-slot fan-out (plan success-metrics)
```
# vLLM:
node scripts/vllm-poc/benchmark.mjs --url http://127.0.0.1:8020/v1 --model local-vllm \
  --concurrency 26 --requests 104 --json | tee state/shared/specs/vllm-bench-vllm.json
# Ollama A/B (same prompts, OpenAI-compat endpoint):
node scripts/vllm-poc/benchmark.mjs --url http://127.0.0.1:11434/v1 --model qwen2.5-coder:32b \
  --concurrency 26 --requests 104 --json | tee state/shared/specs/vllm-bench-ollama.json
```
**NO-GO gate:** if vLLM aggregate tokens/sec multiplier over Ollama is below the operator Q1 bar ->
a second serving stack is not justified; close the plan as NO-GO.

### Step 4 - record + decide
Write the measured footprint + the two tokens/sec numbers into the plan's section-9 decision
matrix. The operator answers Q1/Q3/Q6/Q7 against real numbers.

## Teardown (fully reversible)
```
docker compose -f docker-compose.local-llm.yml --profile vllm down   # stop container
docker rmi vllm/vllm-openai:latest                                    # (optional) reclaim image
# weights cache: ./.cache/huggingface  (delete to reclaim ~40GB)
```
Nothing here edits a PRISM consumer or auto-starts. Making vLLM a PERMANENT fleet service is a
separate decision (operator Q2/Q3) that adds it to the watchdog/reaper fleet and arms the
admission guard as a hard three-way referee (Q6).
