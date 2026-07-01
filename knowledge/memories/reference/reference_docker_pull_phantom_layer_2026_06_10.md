---
name: docker-pull-phantom-layer-2026-06-10
description: "docker pull <image> exits 0 with all layers 'Already exists' but the image NEVER commits (docker image inspect = No such image). Reproducible; survives a 20GB disk reclaim. Fix = restart Docker Desktop (corrupt content-store/manifest). Blocked the vLLM Phase-0 image pull."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.555Z
aliases: reference_docker_pull_phantom_layer_2026_06_10
---


# docker pull "phantom layer" anomaly: exit 0 but no image (slot:golf, 2026-06-10)

## Symptom
`docker pull vllm/vllm-openai:latest` returns **exit 0**, prints all layers as
**"Already exists"**, but emits **no final `Digest:` / `Status: Downloaded` line**, and
afterwards `docker image inspect <image>` -> **"No such image"** and `docker images` shows
nothing. The image never materializes despite a "successful" pull.

## Reproduced (this host, DESKTOP-N7MI1VB, Docker 29.4.3, WSL2)
- ~6 pull attempts: background, foreground, `--platform linux/amd64`, post-reclaim. ALL identical.
- The layer BLOBS are in the content store (so re-pull short-circuits to "Already exists"), but the
  image MANIFEST/CONFIG is not committed, so docker can't assemble the image and never re-fetches.
- **NOT disk pressure:** freed ~20GB (`docker builder prune -af` 17GB + `docker container prune -f`
  2.8GB) -> SAME anomaly. (df showed 133GB images, but reclaim did not fix it.)

## Root cause + fix
Corrupt docker content-addressable store / manifest cache for that image. Standard fix:
**restart Docker Desktop** (clears the in-memory + on-disk phantom state), then re-pull -> commits.
Golf does NOT auto-restart the docker daemon (refuse-list) -> this is an **operator action**.
Other in-bounds attempts that did NOT work: clean uninterrupted pull, `--platform`, disk reclaim.
Untried (operator/next-session): pull a specific version tag instead of `:latest` (forces a fresh
manifest), or `docker pull <image>@sha256:<digest>`.

## Impact
Blocked the vLLM Phase-0 image pull (`VLLM-POC-RUNBOOK-2026-06-10.md`). Everything else was ready
(Phase-0 kit `4a5ba7f59d`, compose validated, benchmark 6/6, fleet warned, GPU free). The pull is
the ONLY blocker.

## Apply
When `docker pull` exits 0 but `docker image inspect <image>` says "No such image", do NOT keep
re-pulling (it short-circuits forever). Reclaim space once; if that fails, restart Docker Desktop
(operator), or pull a pinned version tag. Verify with `docker image inspect`, NOT pull exit code
(exit 0 is a LIE here -- R12).

## RESOLVED 2026-06-10 (later same day)
The blocker cleared: `docker ps` shows `prism-vllm` (vllm/vllm-openai:latest) UP + HEALTHY,
serving Qwen2.5-0.5B as `local-vllm` on :8020 -- i.e. the image materialized and the compose
smoke (VLLM-POC-RUNBOOK Step 1) ran. The fix that worked was a Docker Desktop restart (operator
did it out-of-band; golf does NOT auto-restart the daemon per refuse-list). LESSON for next time:
when the operator says "restart docker to unblock X", CHECK `docker ps` FIRST -- X (vLLM) was
already running, so a restart would have DESTROYED it (+ bounced qdrant/postgres/grafana/
prometheus) for zero benefit. The phantom-layer was transient corruption, cleared by one restart.
