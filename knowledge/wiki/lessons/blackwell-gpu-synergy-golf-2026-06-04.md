---
title: Blackwell GPU synergy — golf hygiene pass (2026-06-04)
type: lessons
slot: golf
date: 2026-06-04
tags: [gpu, blackwell, ollama, fleet-reaper, regression, mcp]
related:
  - "[[blackwell-gpu-swap-u-blackwell-host-preset]]"
  - "[[ollama-blackwell-gpu-consolidation-2026-06-03]]"
  - "[[fleet-reaper-home]]"
---

# Blackwell GPU synergy — golf hygiene pass (2026-06-04)

Host `DESKTOP-N7MI1VB` is now an **RTX PRO 6000 Blackwell Workstation Edition
96GB** (driver 596.59, CUDA 13.2, sm_120 / compute-cap 12.0, 600W) — was a
16GB RTX 4080 SUPER. Most Blackwell scaffolding already shipped (host-preset
`blackwell`, `host-class.mjs` `home_blackwell` profile, `ollama-cost-router`,
host-aware-synthesis-model, ollama v0.30.3 GPU consolidation). This golf pass
closed the remaining **stale-4080 + latent-clobber** loose ends.

## Two latent landmines fixed (would have downgraded the Blackwell box)

1. **`scripts/system-health/05-soft-config-tweaks.ps1`** hardcoded 16GB-era
   Ollama caps (`KEEP_ALIVE=30s`, `NUM_PARALLEL=1`, `MAX_LOADED_MODELS=2`).
   Running it on the 96GB box silently clobbered the Blackwell tuning back to
   4080/work-era values. **Fix:** GPU-VRAM-aware tiering via `nvidia-smi`
   (blackwell ≥48GB → -1 / 4 / 6 / f16; home ≥14GB → 10m / 2 / 2; work →
   30s / 1 / 2). Fail-soft to `work` when nvidia-smi is absent. Ollama restart
   is now **opt-in** (`-RestartOllama`) so it never evicts the fleet's warm
   models by surprise.
2. **`/fleet-reaper-home` skill** always wrote the `home` (4080/16GB) preset
   keyed by hostname — re-running it on the Blackwell box would overwrite the
   `blackwell` preset and downgrade prewarm 32b→7b + GPU floor 24GB→2GB.
   **Fix:** Step 1 now auto-detects VRAM (`execFileSync nvidia-smi`, no shell
   injection surface) and writes `blackwell` (≥48GB) or `home`. Prose/table
   made tier-aware (caught by ARM-B: the load-bearing automation was updated
   but the explanatory body still taught the home-only story).

## 4080→Blackwell doc/config sweep

`docker-compose.yml` (ollama service: KV `q8_0`→`f16`, NUM_PARALLEL 4,
MAX_LOADED 6 — native ollama is the active runtime, container is CI/portable
fallback), `docker-compose.ollama-preload.yml`, `docker/ollama-gpu/README.md`
(32b now fully GPU-resident, was a CPU-spill compromise on 16GB),
`startup-golf.md` (added blackwell tier row), `train-lora.md` (blackwell
timing), `COMMANDS_DIGEST.md`. Live `OLLAMA_NUM_PARALLEL` User env aligned
2→4 (drift vs the consolidation memory's documented 4; the CPU-contention fix
was `KEEP_ALIVE`+affinity-throttle, NOT NUM_PARALLEL — verified before change).

**Intentionally NOT touched** (false-positives / historical): Taylor `C` /
`kc1.1` material constants = 4080, tool part numbers (`F4080`, `HSK63AER4080`),
obsidian-plugin websocket close-codes, archived roadmaps (CLAUDE.md says
ignore), and historical memories/wiki entries that document the transition.

## MCP-server GPU status (the "if possible" stretch)

The MCP server's **hot embedding/RAG/memory path already runs on the GPU** —
`memoryDispatcher` routes `embed_text` / `pairwiseCosine` / `EmbeddingFilterEngine`
through `OllamaEmbedderEngine` (nomic-embed-text, GPU-resident), with graceful
Jaccard fallback. `LocalEmbeddingEngine` (Xenova MiniLM int8, CPU) is the
explicit no-daemon fallback. Blackwell already sped this up (full residency +
NUM_PARALLEL=4, no NIM 16GB contention). **Follow-up (scoped, not rushed):**
migrate the CPU fallback embedder to an onnxruntime CUDA EP — low ROI (primary
is already GPU) + native-dep + production-server rebuild/restart on a diverged
branch, so it belongs in its own unit with tests, not a live golf edit.

## Doctrine reinforced

- After ANY GPU swap, hunt for hardcoded VRAM-class assumptions in *setup/PC-opt
  scripts*, not just runtime config — they're the silent clobbers.
- Verify the real thing: nomic-embed `size_vram>0` in `/api/ps`, not "ollama runs".
- R8: the live `NUM_PARALLEL=2` looked like drift — confirmed via the CPU-contention
  memory that it was NOT a deliberate fix before changing it.
