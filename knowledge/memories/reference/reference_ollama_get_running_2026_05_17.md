---
name: ollama-get-running-2026-05-17
description: "Get ollama up and running session — daemon healthy + 3 models pulled, but qwen:7b CUDA-blocked (4GB cudaMalloc threshold under CUDA 13.2 host driver vs ollama 0.24.0 bundled CUDA)"
aliases: reference_ollama_get_running_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.677Z
---


# Ollama "get up and running" session — 2026-05-17 alpha

## What's healthy
- Ollama daemon UP (0.24.0, PID 57732, listening 127.0.0.1:11434)
- 3 models on disk: `qwen2.5-coder:7b` (4.68GB), `qwen2.5-coder:1.5b` (0.99GB, pre-existing), `nomic-embed-text` (0.27GB)
- qwen2.5-coder:1.5b WARM with 30m keep_alive — serves /api/generate in ~1.4s
- Offload-dashboard surface reads healthy: `local-compute: ✓ Ollama 3 models · 1 warm`

## What's BLOCKED
- **qwen2.5-coder:7b cudaMalloc OOM** — daemon reports `gpu memory available="14.4 GiB"` but `cudaMalloc failed` when allocating 4168 MiB (4.07 GiB) for model weights. Smaller `qwen2.5-coder:1.5b` (0.99 GiB) loads cleanly. Threshold appears ~4 GiB.
- Root cause: **CUDA 13.2 host driver (NVIDIA 595.97) vs ollama 0.24.0 bundled CUDA 12.x runtime — ABI mismatch on large allocations**. Confirmed via `nvidia-smi` (15.3 GiB free) and ollama server log showing successful GPU detection (`library=CUDA available="14.4 GiB"`) but allocation failure.
- nomic-embed-text load times out under contention from fleet hook fires (~1300 ollama-task-offloader fires + 747 [[reference_fleet_reaper|fleet-reaper]]-coordinator + 2 engine-api-extractor in last 24h).
- deepseek-r1:14b pull canceled mid-flight when restarting daemon (would also hit the 4GB threshold even if pulled).

## What was tried
1. Pulled nomic-embed-text via `/api/pull` (success)
2. Pulled qwen2.5-coder:7b via `/api/pull` (success — on disk)
3. Killed wedged Docker backend PID 59240 (722MB zombie) — separate issue
4. Restarted ollama daemon multiple times — clears stale CUDA context briefly but 7b still OOMs
5. Killed orphan ollama runner subprocess (PID 58352)
6. Set `OLLAMA_CONTEXT_LENGTH=8192` at User scope (was previously empty; ollama was using 262144 default)
7. Tried `num_gpu=0` (CPU-only) — OOMs on CPU buffer too (commit at 90.6%, only 6.5GB headroom)
8. Tried `low_vram=true, num_ctx=2048` — still cudaMalloc fails

## The 4 GiB threshold
- 0.99 GiB qwen:1.5b loads ✓
- 0.27 GiB nomic loads (when not contended) ✓
- 4.17 GiB qwen:7b cudaMalloc fails ✗

## Next levers (not done this session)
- **Update ollama** to a newer version with CUDA 13.x support (current 0.24.0 may be too old for driver 595.97 / CUDA 13.2)
- **Enable Vulkan**: `OLLAMA_VULKAN=1` env — RTX 4080 SUPER has full Vulkan compute, may sidestep CUDA bug entirely
- **Relieve commit pressure** to ~50% (currently 90.6% with 13 chats live) to give CPU-buffer headroom
- **Set `OLLAMA_HOOK_MODEL=qwen2.5-coder:1.5b`** so hooks fallback to working 1.5b until 7b unblocked

## State at session end
- 65 offloads / 779 kept (7.7%) since 2026-04-28 — chronic under-tune separate from this session
- Schema 2.0.0 dashboard reading correctly (per [[reference_dev_tools_audit_meta_scripts_2026_05_17]])
- Docker daemon STILL wedged (Qdrant/Postgres/Prometheus DOWN); restart attempted but WSL2 backend didn't come up — deferred
- Slot: alpha (force-claimed from crashed claude-23c10eea, was claude-23c10eea's alpha-work topic — preserved)

Sister entries: [[reference_ollama_pipeline_ms0_2026_05_15]] (the 9% baseline), [[reference_ollama_cost_routing]] (escalation ladder).
