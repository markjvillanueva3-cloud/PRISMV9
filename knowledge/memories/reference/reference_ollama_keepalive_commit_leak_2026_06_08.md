---
name: reference_ollama_keepalive_commit_leak_2026_06_08
description: The recurring CRITICAL-MEMORY-PRESSURE gate on DESKTOP-N7MI1VB was OLLAMA_KEEP_ALIVE=-1 pinning 4+ large models (~70GB host commit) forever — NOT WSL. Fixed to bounded 30m + maxLoaded 4.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.239Z
aliases: reference_ollama_keepalive_commit_leak_2026_06_08
---


# Ollama keep-alive commit leak (golf, 2026-06-08)

The Stop-hook PRESSURE GATE hit **commit 96-98% (of 227GB)** every turn and blocked session-end. First-pass fix (`wsl --shutdown`) helped but the pressure RECURRED each turn. Root cause was misattributed to WSL.

**True root cause (measured via Private/commit bytes, not WorkingSet):**
- Top commit consumer was **`llama-server` × 4 = 69.5 GB private bytes** (Ollama model servers), NOT WSL (15.7 GB).
- `OLLAMA_KEEP_ALIVE = -1` (User env) + `05-soft-config-tweaks.ps1` blackwell tier (`keepAlive='-1', maxLoaded='6'`) pinned up to 6 LARGE models FOREVER: qwen2.5-coder:32b(37GB) + gpt-oss:20b(13GB) + qwen3-vl:8b(8GB) + nomic-embed. `/api/ps` showed `expires_at: 2318` (= pinned).
- A pinned model's **host private bytes count against the COMMIT limit (RAM+pagefile)**, not just VRAM. The `-1` decision (`U-FR-OLLAMA-KEEP-ALIVE-1H`, 2026-05-17) was made on the **16GB RTX 4080** box where pinning one 7B = 4.4GB idle VRAM — cheap. On the **96GB Blackwell** with maxLoaded=6 large models it's ~70GB of host commit pinned forever → gate trips. Stale-for-hardware.

**Immediate relief:** unload via `curl /api/generate -d '{"model":"X","keep_alive":0,"prompt":""}'` per pinned model → freed ~67GB, commit 96.8% → 69%.

**Durable fixes applied (R7 override of the stale `-1` decision, with reasoning in-comment):**
1. `scripts/system-health/05-soft-config-tweaks.ps1` blackwell tier: `keepAlive '-1' → '30m'`, `maxLoaded '6' → '4'`.
2. User env `OLLAMA_KEEP_ALIVE=30m`, `OLLAMA_MAX_LOADED_MODELS=4`.
3. `scripts/fleet-reaper-sweep.mjs` `DEFAULT_OLLAMA_KEEP_ALIVE "-1" → "30m"` (the reaper's own prewarm) — override knob `PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE` preserved.

**Caveat (R12):** the RUNNING ollama daemon keeps its LAUNCH-TIME `-1` default for new loads until the daemon restarts (`PRISM Ollama Serve` task manages it). The env + script fixes are durable-on-restart; per-request `keep_alive:0` unloads handle the live session. Did NOT force a disruptive mid-fleet Ollama restart at 82% (non-critical).

**Diagnosis order for golf at recurring commit-pressure on this box:**
1. `Get-Process llama-server | Measure PrivateMemorySize64` — Ollama models are usually the #1 commit hog.
2. `curl /api/ps` — check for `expires_at` far-future (= pinned forever).
3. Unload idle large models (`keep_alive:0`) for immediate relief.
4. THEN check WSL (`wsl --shutdown`) and page-file/commit-limit.

[[reference_wsl_commit_pressure_relief_2026_06_08]] · [[feedback_golf_owns_reaper]] · [[reference_blackwell_gpu_synergy_golf_2026_06_04]]
