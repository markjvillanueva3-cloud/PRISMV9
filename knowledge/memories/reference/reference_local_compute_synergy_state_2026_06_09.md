---
name: reference_local_compute_synergy_state_2026_06_09
description: "Validated local-compute synergy state — Ollama roster correct for Blackwell hw (gpt-oss:120b best-tier), cost-router resolves all categories to installed models; gap is utilization not roster; Docker+Qdrant DOWN degrades PSN vector leg."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.199Z
aliases: reference_local_compute_synergy_state_2026_06_09
---


Golf synergy-loop (2026-06-09, session c7361c9f) validated the local-compute leg of the "synergize everything" goal. Builds on [[reference_blackwell_ollama_utilization_optimize_2026_06_03]].

**Hardware (DESKTOP-N7MI1VB, live-measured):** NVIDIA RTX PRO 6000 Blackwell — **96GB VRAM** (97887 MiB), 2.6GB used, **GPU 5% idle**, driver 596.59 · AMD Ryzen 9 9950X3D 32-thread · **136GB RAM** (83GB free).

**Ollama roster (10 models, `/api/tags`) — CORRECT for the hardware:**
- `gpt-oss:120b` (65.4GB, MXFP4) — best-tier synthesis, fits 96GB VRAM = frontier local brain
- `gpt-oss:20b` (13.8GB) — strong tier, ~185 tok/s (fastest in bench)
- `qwen2.5-coder:32b` (19.9GB) — held best CODER; `qwen2.5-coder:1.5b` (1.0GB) — cheap tier
- vision ensemble: qwen3-vl:8b(+instruct), qwen2.5vl:7b, llama3.2-vision:11b, moondream:1.8b
- `nomic-embed-text` (embed)

**Validation evidence:**
- `ollama-cost-router.mjs routeModelForTask({category, available, hardware:'home_blackwell'})` resolves ALL 8 categories to INSTALLED models — `ALL_RESOLVE_INSTALLED:true`. cheap→1.5b, search_synthesis→gpt-oss:120b, code/reasoning/docstring/summarize→gpt-oss:20b. (Note param keys: `available` not `installed`, `hardware` not `hostClass`.)
- `scripts/no-retired-llm-refs.test.mjs` PASS 3/3 — repo scan clean, no live `qwen2.5-coder:7b`/`deepseek-r1:14b` refs (those were DELETED from host per BLACKWELL-MODEL-UPGRADE; gpt-oss replaced r1:14b reasoning).

**THE GAP is utilization, not roster:** GPU 5% idle, ollama-offload 9% (target 30%), route-savings take-rate 0.4%. Models are pulled + wired correctly; the fleet barely uses them.

**Down services (Docker daemon not running):** `docker ps` → npipe connect fail; `qdrant :6333` → unreachable; postgres/prometheus/prism-server also Docker-hosted. **Qdrant down degrades the PSN vector-memory leg** (semantic recall falls back to keyword/dense sidecar). Docker autostart is operator-disabled (`PRISM_LOCAL_COMPUTE_AUTOSTART=0`) and fleet doctrine never auto-restarts the Docker daemon — surface to operator/papa, don't force-start. Revive: `node mcp-server/scripts/ollama-docker-launcher.mjs` or `/qdrant-revive`.

**Owners:** ollama leg = golf (validated/done) · local-compute health (Docker/qdrant) = papa (backend) · PSN/orchestration wiring = bravo.

## NVIDIA NIM — do NOT run alongside Ollama (verified 2026-06-09 golf)
4 NIM containers exist (`nvcr.io/nim/meta/llama-3.2-3b`, `llama-3.1-8b`, `nvidia/nv-embedqa-e5`, `llama-3.2-11b-vision`) launched via `mcp-server/scripts/nim-docker-launcher.mjs`. **Stopping them is the correct steady state:**
- `local-llm-bridge.mjs:98` cascade is **NIM-FIRST** (`if (await isNimAvailable()) return "nim"`) → with NIM up, ALL local-LLM offload routes to NIM's **8B** instead of Ollama's gpt-oss:120b/20b / qwen2.5-coder:32b = **a downgrade**.
- NIM llama-3.1-8b / 3.2-3b are **strictly dominated** by the Ollama roster; the NIM embed (nv-embedqa-e5) has **no consumer** (PRISM embeds via nomic-embed + ONNX 384-d).
- Running all 3 (+vision crash-loops on VRAM: "Free GPUs: None") **saturated the 96GB GPU to 274MB free**, starving Ollama's warm coder.
- Verdict: **0 NIM needed.** Images cached → `docker start nim-*` is one command away IF a NIM-only capability is ever required (and only after pulling a model ≥ Ollama's best + freeing VRAM). Don't auto-start them.

## Live Ollama serve env (2026-06-09, drifted from the 2026-06-03 handoff record)
`OLLAMA_NUM_PARALLEL=4` (handoff said 2) · `MAX_LOADED_MODELS=4` (said 6) · `KEEP_ALIVE=30m` (said -1) · `FLASH_ATTENTION=1` · `KV_CACHE_TYPE=f16` · `GPU_OVERHEAD=2GB` · `CONTEXT_LENGTH=16384` · `OLLAMA_MODELS=H:/Tools/ollama/models`. Current values are reasonable (KEEP_ALIVE=30m releases VRAM vs -1 holding 37.5GB forever). Refinement opportunities (marginal, NOT applied — would need a serve restart that interrupts the fleet): raise CONTEXT_LENGTH 16K→32-64K (gpt-oss:120b supports 128K, 96GB has room); pull qwen3:32b/qwen3-coder:30b (cost-router `best` tier already auto-promotes them). The real gap stays **utilization** (offload 5-9% vs 30% target), not config.
