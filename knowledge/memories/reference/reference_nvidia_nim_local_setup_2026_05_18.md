---
name: nvidia-nim-local-setup-2026-05-18
description: How the local NVIDIA NIM (llama-3.2-3b) was brought up on the RTX 4080 box + the fixes it took
aliases: reference_nvidia_nim_local_setup_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.665Z
---


Local NVIDIA NIM stood up 2026-05-18 (slot golf, `/goal get nvidia nim working`). Container `nim-llama32-3b` serves `meta/llama-3.2-3b-instruct` on `http://127.0.0.1:8000/v1`, GPU-accelerated (RTX 4080 SUPER 16GB). Setup tree: `H:/Tools/nim/` — `compose/rtx4080.yml`, `start.ps1`, `RUNBOOK.md`. Autostart hook `.claude/hooks/nim-autostart.mjs` (SessionStart) no-ops once port 8000 answers; PRISM canonical endpoint env is `NIM_URL`.

**Fixes it took (none were "NIM broken" — all config/wiring):**
1. **Image never pulled on this box** — only the 20GB model cache existed. `docker pull nvcr.io/nim/meta/llama-3.2-3b-instruct:latest` is **daemon-side** — survives the CLI shell dying; a backgrounded `docker compose up` got reaped mid-pull.
2. **KV-cache abort → 5-restart loop** — llama-3.2-3b native context 131072 tok > KV-cache budget ~66832 tok on a 16GB GPU → vLLM `ValueError` every boot. Fix: `NIM_MAX_MODEL_LEN: 16384` in the 3b service `environment:` of `rtx4080.yml`.
3. **`NVIDIALLMCAMEngine` engine fixes** — commits `[NVIDIA-NIM]/U-NIM-ENV` + `U-NIM-DEPLOY`: (a) `resolveEndpoint()` now reads PRISM-canonical `NIM_URL` + strips a trailing `/v1` (was a latent `/v1/v1` doubling bug); (b) `DEFAULT_MODEL` → `meta/llama-3.2-3b-instruct` (was 8b → HTTP 404 `model_not_found` against the 3b deployment); (c) `DEFAULT_TIMEOUT_MS` 12s→30s — a NIM's FIRST guided-JSON request pays a one-time xgrammar grammar-compile >12s; warm ~1.5s. 41→49 tests.

**Lessons:**
- A long (>10-15 min) backgrounded Bash task in the **golf** chat gets reaped by golf's own [[reference_fleet_reaper|fleet-reaper]] (`unowned` class) — use daemon-side ops or foreground. [[feedback_golf_owns_reaper]]
- `Edit` whose `old_string` carries trailing context must reproduce it in `new_string` — dropped the `ports:` block once, container started with no published port (healthy inside, unreachable from host).
- `start.ps1` brings up ALL 4 NIM services; the 11B vision model OOMs a 16GB GPU — start only `nim-llama32-3b` via `docker compose --env-file compose/ngc.env -f compose/rtx4080.yml up -d nim-llama32-3b`.

Verified live: PRISM `NVIDIALLMCAMEngine` → NIM E2E, all 3 CAM task kinds (`strategyRecommend`/`parameterExtract`/`operationClassify`) return `success:true` with schema-valid output. Live `prism_cam:nvidia_cam_*` actions need a `dist/` rebuild + MCP-server restart to pick up the engine fixes. See [[reference_ollama_pipeline_ms0_2026_05_15]] for the sibling Ollama local-LLM path.
