---
name: blackwell-ollama-utilization-optimize-2026-06-03
description: Golf session that fixed Ollama RTX utilization on the 96GB Blackwell — disabled the obsolete 16GB-era CPU throttle, resolved the dual-serve port conflict (root cause of orphan-runner VRAM leaks), warmed a 4-model tiered roster, and set KV-aware env config
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.478Z
aliases: reference_blackwell_ollama_utilization_optimize_2026_06_03
---


2026-06-03 (slot golf, solo). Operator: "get ollama and my rtx utilization optimized for the whole system" + "utilize workflow to assess which models serve our purposes best." Ran a 6-agent `blackwell-model-fit-assessment` workflow (mined code-surface/functions/memories/model-landscape, adversarially verified) then applied golf-lane infra fixes.

**Hardware (verified live):** RTX PRO 6000 Blackwell Workstation Edition, **96GB VRAM** (97887 MiB), Ryzen 9 9950X3D2 (16C/32T — CPU-upgraded from Ryzen 7 7800X3D on 2026-06-08), 127GB RAM. Was a 16GB RTX 4080 SUPER until the 2026-06-03 BLACKWELL-GPU-SWAP. Ollama **v0.30.3**, GPU-resident (sm_120/CUDA OK), models at `H:/Tools/ollama/models`.

**Starting state (the problem):** 11GB used / 1% util / 20W — a single `qwen2.5-coder:7b`, **85GB idle**. Offload rate "11%" is a CUMULATIVE-lifetime telemetry stat (months of pre-Blackwell 7B-era history) — NOT current routing; `detectHostClass()` => `home_blackwell` is live, so today's `ddf0fcac70` (cost-router balanced→strong promotion) IS deployed.

**Root causes found + FIXED (golf infra lane):**
1. **16GB-era CPU throttle was slowing model loads.** `PRISM Ollama CPU Throttle` task (BelowNormal priority + half-core affinity) was a NIM-contention band-aid from the 16GB era (see superseded [[ollama-cpu-keepalive-nim-contention-2026-06-03]]). On 96GB with no NIM running, it just slowed loads (>180s timeouts). **DISABLED** (`schtasks /Change /TN "PRISM Ollama CPU Throttle" /DISABLE`). Loads dropped to <8s (weights) once removed.
2. **Dual-serve port conflict = the orphan-runner VRAM-leak root cause.** Both the stock tray app (`Ollama.lnk` startup shortcut → `ollama app.exe`) AND the `PRISM Ollama Serve` scheduled task spawn `ollama serve`, fighting over :11434 (server.log flooded with `bind: Only one usage of each socket address`). Killing `ollama.exe` does NOT kill its `llama-server.exe` runner children → orphans hold VRAM, invisible to the surviving serve's `/api/ps` (15GB leaked observed). **FIXED:** disabled the tray startup shortcut (renamed `Ollama.lnk` → `Ollama.lnk.disabled-by-golf-2026-06-03`, reversible per never-delete-only-disable). The `PRISM Ollama Serve` task has a logon trigger, so it is now the SOLE serve on login.
3. **Serve task launched at BelowNormal priority** (task-def Settings.Priority=7). Bumped to **5 (Normal)** for durability.

**Final Blackwell env config (User scope, persisted; KV-aware per adversarial verdict):**
- `OLLAMA_NUM_PARALLEL=2` (down from 4 — f16 KV × 4 parallel bloated deepseek-r1:14b to 22GB resident, 13GB of it KV; =2 halved it to 15GB. Fleet hooks are rate-limited, rarely need 4.)
- `OLLAMA_MAX_LOADED_MODELS=6` (up from 4 — hold the tiered roster + LRU-swap utility models)
- `OLLAMA_KV_CACHE_TYPE=f16` (explicit; NOT q8_0 — verdict: q8_0 degrades high-GQA Qwen, and we have VRAM for fidelity)
- `OLLAMA_GPU_OVERHEAD=2147483648` (2GB reserve — prevents KV-spike CPU spill)
- `OLLAMA_KEEP_ALIVE=-1`, `OLLAMA_FLASH_ATTENTION=1` (kept — already correct)

**Result:** 4-model tiered roster warm, **54GB resident** (qwen2.5-coder:32b 28GB + deepseek-r1:14b 15GB + qwen3-vl:8b-instruct 8GB + nomic-embed) with ~42GB headroom. GPU went 11GB→54GB resident. **Caveat:** 32b cold-load took 220s (KV alloc); KEEP_ALIVE=-1 keeps it warm so it's a one-time cost — but investigate why 32b cold-load is 50× the 14b.

**Teed up for OTHER lanes (NOT golf — do not duplicate):**
- **alpha/india:** BLACKWELL-AI MS1 U-ROUTE-LADDER — purge the ~18 hooks hardcoding `qwen2.5-coder:7b` (route through `lib/ollama-cost-router.mjs` / `ModelRoutingEngine`). Also the cost-router "cheap" tier has ZERO installed models → add `qwen2.5-coder:3b`. And the dead `ollama-route-pretooluse.mjs` (suggest-mode default → 0 offloads by design) — flipping `PRISM_OLLAMA_ROUTE_AUTO=1` is an OPERATOR decision.
- **india:** acquire `qwen3-embedding:4b` (70.58 MTEB, single highest-ROI; needs full HNSW re-index — MS2 RAG re-embed). Optional coder/vision acquires: `qwen3-coder:30b`, `qwen3:32b`, `qwen3-vl:32b` (all fit; qwen2.5-coder:32b dense already covers big-coder, avoids the MoE GPU-util bug #10458).
- **SAFETY INVARIANT (load-bearing):** every local model `qualityTier<85` → safety_critical (force/collision/workholding/physics/S(x)) ALWAYS routes cloud, never local. Preserved.

Related: [[ollama-cpu-keepalive-nim-contention-2026-06-03]] (16GB-era, throttle now disabled) · [[reference_blackwell_token_synergy_ms0_2026_06_03]] · [[reference_blackwell_ai_upgrade_plan_2026_06_03]] · [[feedback_golf_owns_reaper]].
