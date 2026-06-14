---
name: reference_alpha_ollama_coldload_not_contention_2026_05_29
description: "Ollama generation 'flapping'/timeout is usually COLD-LOAD latency (~57s for a 7B from H:), NOT GPU contention — fix with per-request keep_alive pin, not a daemon restart"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.019Z
aliases: reference_alpha_ollama_coldload_not_contention_2026_05_29
---


**Root-cause lesson (2026-05-29, slot:alpha):** the recurring fleet symptom
"Ollama `/api/chat` /`/api/generate` is dead / GPU contention" (the
`prompt-rewriter-ollama is silently broken` banner) is frequently MIS-diagnosed.
When B1's `--all` rollout kept failing its generation preflight, the actual
measurements were:

- **GPU was 75% FREE** — `nvidia-smi`: 4.1 / 16.4 GB used, 5% util. NOT contention.
- Daemon alive (`/api/version` ok), `/api/tags` + `/api/embeddings` worked
  (nomic is tiny + stayed pinned — which is why embeddings never flap).
- Only `nomic` resident; no generation model loaded.
- **`qwen2.5-coder:7b` cold-loads in ~57s** from `H:/Tools/ollama/models`
  (measured `load_duration`), and `OLLAMA_KEEP_ALIVE=5m` unloads it between runs.
- The 60s request/preflight timeout flapped RIGHT at the ~57s cold-load edge →
  intermittent "down".

**Diagnosis order (do this before assuming contention):**
1. `nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu` — if mostly
   free, it is NOT contention.
2. `curl /api/ps` — is a generation model resident? If only nomic, the next
   generate will cold-load.
3. Warm probe with a GENEROUS timeout: `curl -m 180 /api/generate -d
   '{"model":"...","prompt":"OK","keep_alive":"60m",...}'` and read
   `load_duration` — that is your real cold-load cost.

**Fix (no daemon restart — a restart drops nomic + breaks fleet recall for all
live loops):** send `keep_alive` (e.g. `30m`/`60m`) in the generate request to
PIN the model resident, and set the client timeout > cold-load (≥180s). The
preflight doubles as a pre-warm. Shipped this way in
`scripts/galaxy-reflection-synthesis.mjs` (`synthesizeViaOllama` +
`ollamaPreflight`). Broader fleet `/api/chat` stability wants the operator infra
lever (raise env `OLLAMA_KEEP_ALIVE`, lower `OLLAMA_NUM_PARALLEL` from 3, or
containerize) — but that is a daemon restart, operator-gated, never mid-fleet-run.

Env at diagnosis: `OLLAMA_KEEP_ALIVE=5m`, `OLLAMA_NUM_PARALLEL=3`,
`OLLAMA_MAX_LOADED_MODELS=3`, `OLLAMA_CONTEXT_LENGTH=16384`,
`OLLAMA_MODELS=H:/Tools/ollama/models`. Context: enabled the B1 34-galaxy
compounding rollout ([[reference_alpha_b1_galaxy_reflection_2026_05_29]]).
