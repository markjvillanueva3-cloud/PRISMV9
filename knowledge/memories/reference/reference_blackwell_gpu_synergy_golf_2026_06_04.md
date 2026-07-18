---
name: blackwell-gpu-synergy-golf-2026-06-04
description: "Golf Blackwell-synergy pass — fixed 2 latent 16GB-era clobber landmines (soft-config-tweaks.ps1 + /fleet-reaper-home), swept 4080→Blackwell across docker/skills, aligned NUM_PARALLEL 2→4, confirmed MCP hot RAG path already GPU."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.478Z
aliases: reference_blackwell_gpu_synergy_golf_2026_06_04
---


2026-06-04 (slot golf). Host `DESKTOP-N7MI1VB` = RTX PRO 6000 Blackwell 96GB (driver 596.59, CUDA 13.2, sm_120). Blackwell scaffolding mostly shipped already (host-preset=blackwell, host-class home_blackwell, ollama v0.30.3 GPU consolidation, host-aware-synthesis-model). This pass closed the remaining stale-4080 + latent-clobber loose ends.

**2 landmines fixed (would silently DOWNGRADE the 96GB box to 16GB-era caps):**
1. `scripts/system-health/05-soft-config-tweaks.ps1` hardcoded KEEP_ALIVE=30s/NUM_PARALLEL=1/MAX_LOADED=2 → made GPU-VRAM-aware (blackwell≥48GB: -1/4/6/f16, home≥14GB: 10m/2/2, work: 30s/1/2; fail-soft to work; restart now opt-in `-RestartOllama`).
2. `/fleet-reaper-home` always wrote the `home`/4080 preset → now auto-detects VRAM (execFileSync nvidia-smi) and writes `blackwell` vs `home`; prose+table made tier-aware.

**4080→Blackwell sweep:** docker-compose.yml (KV q8_0→f16, NUM_PARALLEL=4, MAX_LOADED=6; native ollama is active runtime, container=CI fallback), docker-compose.ollama-preload.yml, docker/ollama-gpu/README.md, startup-golf.md, train-lora.md, COMMANDS_DIGEST.md. Live `OLLAMA_NUM_PARALLEL` User env 2→4 (drift; CPU-contention fix was KEEP_ALIVE+affinity-throttle NOT NUM_PARALLEL — verified per [[reference_ollama_cpu_keepalive_nim_contention_2026_06_03]] before changing).

**NOT touched (false-positive/historical):** Taylor C / kc1.1 = 4080 constants, tool part nums (F4080, HSK63AER4080), obsidian plugin close-codes, archived roadmaps, transition-documenting memories/wiki.

**MCP-server GPU ("if possible" stretch):** hot embed/RAG path ALREADY GPU — `memoryDispatcher` routes embed_text/pairwiseCosine/EmbeddingFilter through `OllamaEmbedderEngine` (nomic-embed-text, GPU-resident, Jaccard fallback). `LocalEmbeddingEngine` (Xenova MiniLM CPU) is the no-daemon fallback. Deeper fallback→onnxruntime-CUDA-EP = scoped follow-up (low ROI, native dep, needs production rebuild/restart — not a live golf edit).

**Reapers/monitors verified active:** PRISM [[reference_fleet_reaper|Fleet Reaper]] + [[reference_fleet_memory_monitor_2026_05_16|Fleet Memory Monitor]] + Ollama Serve + Zulu Orchestrator all Ready/Running LastResult=0. Sweep: gpuFree 85GB, below pressure floor, no-action. Zebra + Zombie-Reaper-v2 intentionally Disabled (superseded).

**Lesson:** after a GPU swap, hunt hardcoded VRAM-class assumptions in setup/PC-opt scripts (not just runtime config) — those are the silent clobbers. [[blackwell-gpu-swap-u-blackwell-host-preset]] · [[ollama-blackwell-gpu-consolidation-2026-06-03]].
