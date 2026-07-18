# REAPER-PERMFIX-MS1/U-D2 — [MAIN] [REAPER-PERMFIX-MS1]/U-D2: Ollama GPU residency + model preload

**Commit:** `9f1fce14ed81` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T14:48:37-05:00
**Tags:** reaper-permfix-ms1, u-d2, auto-distilled

## Subject
[MAIN] [REAPER-PERMFIX-MS1]/U-D2: Ollama GPU residency + model preload

## Body
```
[MAIN] [REAPER-PERMFIX-MS1]/U-D2: Ollama GPU residency + model preload

REAPER-PERMFIX-PLAN U-D1/D2. U-D1 (containerize Ollama with --gpus all
+ persistent volume) was ALREADY done — docker-compose.yml has the
ollama service + docker-compose.gpu.yml adds NVIDIA passthrough. This
ships the U-D2 gap: residency + preload.

docker-compose.ollama-preload.yml — additive override (does NOT touch
the shared docker-compose.yml, so no peer-collision):
  1. OLLAMA_KEEP_ALIVE 30m to 24h. The base 30m evicts the model from
     VRAM between work bursts; every burst re-pays the 30-90s cold load.
     24h keeps it resident across a full day of /loop + hook offload.
  2. ollama-model-preload — one-shot init service: waits for the daemon
     healthcheck, pulls PRELOAD_MODELS, exits 0. restart:no so it
     never re-pulls on a daemon bounce.

Validated: the merged 3-file compose (base + gpu + ollama-preload)
passes "docker compose config" with exit 0 — clean merge; the only
warnings are the base file pre-existing obsolete version key.

docker/ollama-gpu/README.md — bring-up, model-set table (7b workhorse /
14b pure-GPU-resident sweet spot / 32b with CPU spill), PRELOAD_MODELS
override, teardown/reversal, and the fleet rationale (cold-load latency
is the direct disincentive against the offloader ever picking Ollama —
the 22.2-percent-vs-30-percent gap).

Why no live bring-up: Docker daemon is down on the host (confirmed via
probe-cache-daemon --status: stackAvailable false). The compose is
infra-as-code — static config validation is the available verification;
live bring-up is an operator step documented in the README.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- docker-compose.ollama-preload.yml |  66 +++++++++++++++++++++++
- docker/ollama-gpu/README.md       | 107 ++++++++++++++++++++++++++++++++++++++
- 2 files changed, 173 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9f1fce14ed81`
- Milestone envelope: `mcp-server/data/milestones/REAPER-PERMFIX-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._