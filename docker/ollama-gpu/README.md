# Ollama GPU — containerized, GPU-resident, model-preloaded

REAPER-PERMFIX-MS1 / U-D1+U-D2. Turns the host's idle RTX 4080 SUPER
(~15 GB free VRAM, observed ~16–27 % utilization) into a persistent local
inference engine so PRISM's Ollama offload path (`/ollama-*` skills,
`ollama-task-offloader.mjs`, `ollama-auto-router.mjs`) gets a sub-100 ms
first token instead of a 30–90 s cold load.

## What was already in place (U-D1)

The base stack already containerizes Ollama correctly:

- `docker-compose.yml` → service `ollama` (`ollama/ollama:latest`, port
  11434, `restart: unless-stopped`, persistent volume
  `./data/docker-volumes/ollama:/root/.ollama`, healthcheck).
- `docker-compose.gpu.yml` → NVIDIA GPU passthrough override
  (`deploy.resources.reservations.devices: [{driver: nvidia, count: all,
  capabilities: [gpu]}]`).

So GPU passthrough + persistence are **done**. The gap U-D2 closes is
*residency* and *preload*.

## What U-D2 adds

`docker-compose.ollama-preload.yml` (repo root, additive override — it does
**not** modify the shared `docker-compose.yml`):

1. **`OLLAMA_KEEP_ALIVE` 30m → 24h.** The base 30 m means a model evicts
   from VRAM between work bursts; every fresh burst re-pays the cold-load
   tax. 24 h keeps the model resident across a full day of /loop + hook
   offload traffic.
2. **`ollama-model-preload`** — a one-shot init service. Waits for the
   ollama daemon to be `service_healthy`, pulls the model set, exits 0.
   `restart: "no"` so it never re-pulls on a daemon bounce.

## Bring-up

Requires Docker Desktop running + the NVIDIA Container Toolkit installed.

```bash
cd H:/prism
docker compose \
  -f docker-compose.yml \
  -f docker-compose.gpu.yml \
  -f docker-compose.ollama-preload.yml \
  up -d ollama ollama-model-preload
```

First run downloads the model set (~25 GB by default) into the persistent
volume — expected and one-time. Watch the preload finish:

```bash
docker logs -f prism-ollama-preload      # exits 0 when models are warm
```

Verify residency:

```bash
curl http://127.0.0.1:11434/api/ps        # models currently in VRAM
node H:/prism/scripts/probe-cache-daemon.mjs --once   # GPU + Ollama snapshot
node H:/prism/scripts/probe-cache-daemon.mjs --status
```

## Model set

Override `PRELOAD_MODELS` (space-separated) at bring-up to change the warmed
set without editing the compose file:

```bash
PRELOAD_MODELS="qwen2.5-coder:14b" docker compose \
  -f docker-compose.yml -f docker-compose.gpu.yml -f docker-compose.ollama-preload.yml \
  up -d ollama-model-preload
```

| Model | Pull size | VRAM (q4_K_M) | Role |
|-------|-----------|----------------|------|
| `qwen2.5-coder:7b`  | ~4.7 GB | ~5 GB  | Offload workhorse — code explain/summarize/classify/lint (CLAUDE.md AI routing) |
| `qwen2.5-coder:14b` | ~9 GB   | ~10 GB | Pure-GPU-resident sweet spot for the 16 GB card |
| `qwen2.5-coder:32b` | ~20 GB  | ~18 GB | Heaviest; exceeds 16 GB → partial CPU offload. Use only if you accept the spill |

**Default (`qwen2.5-coder:7b qwen2.5-coder:32b`)** follows the
REAPER-PERMFIX plan. If you want a *fully* GPU-resident heavy model with no
CPU spill on the 16 GB card, set `PRELOAD_MODELS="qwen2.5-coder:7b
qwen2.5-coder:14b"` instead.

## Teardown / reversal

```bash
docker compose -f docker-compose.yml -f docker-compose.ollama-preload.yml down ollama ollama-model-preload
```

The override is drop-in: omit `-f docker-compose.ollama-preload.yml` from
the `up` command and you are back to the base 30 m keep-alive with no
preload service. The persistent volume (pulled models) survives either way.

## Why this matters for the fleet

PRISM runs up to 13 concurrent chats. Every chat that routes a
summarize/classify/lint task to a *cold* Ollama waits 30–90 s; with a
GPU-resident model that drops to <100 ms. The REAPER-PERMFIX plan's
Ollama-offload-rate target is ≥30 % (was 22.2 %) — cold-load latency is a
direct disincentive against the offloader ever choosing Ollama. Killing the
cold load removes that disincentive and converts otherwise-idle VRAM into
Claude-CLI context savings.

See also: `state/shared/specs/REAPER-PERMFIX-PLAN.md` (U-D1/D2),
`scripts/probe-cache-daemon.mjs` (U-C3 — the GPU/Ollama/Docker probe cache).
