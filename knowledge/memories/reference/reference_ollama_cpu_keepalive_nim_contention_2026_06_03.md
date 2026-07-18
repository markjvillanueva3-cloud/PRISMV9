---
name: ollama-cpu-keepalive-nim-contention-2026-06-03
description: Why local Ollama was pegging the CPU (KEEP_ALIVE=0 reload churn + NIM owns the whole 16GB GPU) and the fixes applied
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.676Z
aliases: reference_ollama_cpu_keepalive_nim_contention_2026_06_03
---


2026-06-03 (slot golf). Operator: "make sure ollama isnt killing my cpu." Diagnosis + fixes:

**Root causes (two, compounding):**
1. **`OLLAMA_KEEP_ALIVE=0`** (persisted USER env) forced a full model UNLOAD after every request. Under heavy fleet offload (179 active /loop sessions), every call cold-reloaded the 5.3GB `qwen2.5-coder:7b` → constant CPU-bound load churn. This CONTRADICTS the fleet's own design — the [[reference_fleet_reaper|fleet-reaper]] home preset prewarms 7b with **10m keep-alive** ("16GB VRAM has headroom for 7B resident"). KEEP_ALIVE=0 was an erroneous override that broke the intended warm-resident design.
2. **NIM owns the entire GPU.** `nim-llama32-3b` (vLLM, default gpu-memory-utilization 0.9) holds **~15.9GB of the 16GB** RTX 4080 SUPER → ollama's 7b can't fit → loads with `size_vram:0` (100% CPU) → ~50% CPU (≈8 cores) during inference. Confirms the documented [[reference_nim_gpu_capacity_ceiling_2026_05_22]] ceiling.

**Fixes applied:**
- `OLLAMA_KEEP_ALIVE` 0 → `10m` (User env) — kills the reload churn, restores intended warm-resident design.
- Reaped an orphaned `ollama runner` (parent serve dead after a serve restart, still pinning 472MB + a model on port 56697).
- Throttled ollama serve + runners to **lower-half-core affinity + BelowNormal priority** — bounds CPU and makes ollama YIELD to foreground. Runners do NOT inherit the parent serve's affinity/priority on respawn (observed 3x in 10 [[feedback_golf_owns_reaper|fleet-hygiene]] ticks → unthrottled ~50% CPU until re-applied). DURABLE FIX: `scripts/ollama-cpu-throttle.ps1` + **scheduled task `PRISM Ollama CPU Throttle`** (every 1 min, current-user/LIMITED, idempotent fail-soft) re-pins any fresh runner within 60s. Disable: `schtasks /Change /TN "PRISM Ollama CPU Throttle" /DISABLE`. Knob: `PRISM_OLLAMA_THROTTLE_CORES`.

**Dead ends (offline-blocked):**
- `NIM_GPU_MEMORY_UTILIZATION: "0.5"` in `H:/Tools/nim/compose/rtx4080.yml` is **IGNORED** by image `llama-3.2-3b-instruct:latest` — verified it still filled to 15.9GB at steady-state healthy. Reverted (left a documenting note in the yml).
- `qwen2.5-coder:3b` (would fit alongside NIM) is **not pulled** and machine is **offline** (registry.ollama.ai → http 000) — can't pull.
- `OLLAMA_NUM_THREAD=1` (User env) is a **no-op** — not a real ollama env var; explains why a prior CPU-cap attempt never worked.

**To get BOTH on GPU (when online):** `ollama pull qwen2.5-coder:3b` (~2GB) and route fleet offload to it (fleet model is set via `PRISM_FLEET_REAPER_OLLAMA_PREWARM_MODEL`), OR find a working NIM `NIM_MODEL_PROFILE` with a smaller KV pool. Related: [[reference_nvidia_nim_local_setup_2026_05_18]] · [[reference_local_llm_routing]].
