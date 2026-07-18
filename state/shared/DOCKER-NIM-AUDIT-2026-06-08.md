# Docker + NVIDIA NIM — Blackwell Alignment Audit (report-only)

> **Generated 2026-06-08 (slot:alpha, session db273e77)** — operator scope: "audit only, don't start the daemon." Live state: Docker Desktop daemon **DOWN** (npipe unreachable); native Ollama v0.30.3 + the RTX PRO 6000 Blackwell 96GB are the active runtime. NIM_RUNTIME_STATE.json = `blocked` (consistent with Docker down).

## Verdict
The Docker + NIM surface is **correctly aligned to the Blackwell card** — GPU passthrough is hardware-agnostic (`--gpus all` / `count: all`), no 16GB-era cap survives, and the main compose ollama service was already Blackwell-retuned (2026-06-04). **No P0.** Findings are P2 doc-drift + one P2 model-sizing opportunity that only matters once the operator actually provisions NIM.

## What's already correct (checked, no action)
- **`docker-compose.gpu.yml`** — generic NVIDIA passthrough (`driver: nvidia, count: all, capabilities: [gpu]`). Hardware-agnostic; correct for sm_120. No GPU pin, no VRAM cap.
- **`docker-compose.yml` ollama service** — fully Blackwell-tuned (KEEP_ALIVE=-1, KV_CACHE_TYPE=f16, NUM_PARALLEL=4, MAX_LOADED_MODELS=6, CONTEXT_LENGTH=16384). Comment correctly flags native ollama as the ACTIVE runtime, container as CI/portable fallback.
- **`nim-docker-launcher.mjs`** — R12 fail-loud, idempotent, `--gpus all` (NIM is GPU-only), `--shm-size 16GB` (host-RAM shared mem, fine on 127GiB), NGC-key + docker-up hard-gated, non-destructive. Image map `nvcr.io/nim/<vendor>/<name>:latest` — `:latest` tag correctly picks up Blackwell-capable NIM images.
- **settings.json env** — NIM_URL :8000, NIM_EMBED_URL :8010, VLLM_URL :8020, LOCAL_LLM_BACKEND=auto, NIM_FALLBACK_TO_OLLAMA=1 — 3-backend router (NIM→vLLM→Ollama) correctly falls through to the live native Ollama when NIM is absent.

## P2 — findings (no live break; operator-discretion)
1. **NIM default model is tiny for a 96GB card.** `nim-docker-launcher.mjs` DEFAULT_MODEL = `meta/llama-3.1-8b-instruct` (~16GB). On the Blackwell, a 70B-class NIM (e.g. `meta/llama-3.3-70b-instruct`) fits with headroom and would be the real leverage — but ONLY relevant once the operator provisions NIM (needs NGC key + Docker up + a 20-40GB pull). Mirror the cost-router's best-tier sizing when activating.
2. **Stale "7b workhorse" comment** in `docker-compose.yml:185` — 7b was retired this fleet (32b is the floor). Env VALUES are correct; only the comment names a deleted model. Cosmetic.
3. **NIM never provisioned** — `isNimAvailable()` has always returned false (server never stood up), so the 3-backend router silently uses Ollama. Working as designed (fail-soft), but the NIM lane is dormant until operator runs the launcher with an NGC key. Not a defect; a dormant capability.

## To activate NIM later (operator, when migration done)
1. Start Docker Desktop.
2. Set `NGC_API_KEY` (NVIDIA NGC catalog key).
3. `node mcp-server/scripts/nim-docker-launcher.mjs --model=meta/llama-3.3-70b-instruct` (pick a Blackwell-sized model, not the 8B default).
4. Router auto-detects NIM at :8000 and promotes it ahead of Ollama.

No code changes applied (audit-only per operator scope).
