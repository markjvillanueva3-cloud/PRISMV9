---
name: qdrant-down-created-leftover-2026-06-08
description: "prism-qdrant silently down as a \"Created\" renamed-leftover container → semantic vector search (PSN) degraded with no fleet alert; fix = docker start by real name"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.136Z
aliases: reference_qdrant_down_created_leftover_2026_06_08
---


2026-06-08 (slot golf, synergy /loop iter 8). Found during a local-stack health sweep (the goal names ollama/docker/qdrant): **Qdrant was DOWN** — `:6333/healthz` REFUSED and `prism-qdrant` was absent from `docker ps`. `docker ps -a` revealed the container had been **renamed to `fe30e81bd0ed_prism-qdrant`** (Docker prefixes the container ID when a `docker run --name prism-qdrant` collides with an existing container of that name) and was stuck in **"Created"** state (never started). So `docker start prism-qdrant` fails ("No such container") — you must start it by the **real renamed name**: `docker start fe30e81bd0ed_prism-qdrant`. Came up clean (healthz 200), and the data was intact (the volume persists independent of the container): collections `prism_engines` (3866 pts, green), `prism_skills` (241), `prism_formulas` (32) — exact match to the pre-down counts, zero data loss.

**Impact:** while down, the CAG-router `qdrant://prism_engines+skills+formulas` semantic-vector-search path and any `embeddings_search` over Qdrant return nothing — a silent degradation of a named goal surface + a PSN substrate.

**[[feedback_golf_owns_reaper|Fleet-hygiene]] GAP (golf's lane, not yet built):** nothing alerts on a downed named Docker service. `fleet-task-health-watch.mjs` audits *scheduled tasks*; the [[reference_fleet_reaper|fleet-reaper]] coordinator *probes* Docker but doesn't *alert/restart* a downed app container. `DOCKER_RUNTIME_STATE.json` records state but isn't gated to a Stop/SessionStart nudge. **Next unit (golf):** a docker-service-health guard that (a) detects a named prism-* container that is absent/Created/Exited, (b) surfaces it (Stop/SessionStart advisory), and (c) optionally `docker start`s it (NEVER auto-restart the Docker daemon itself — same rule as the [[reference_fleet_reaper|fleet-reaper]] Tier-2). Canonical bring-up: `node mcp-server/scripts/ollama-docker-launcher.mjs --services=qdrant --skip-pull`.

Related: the local stack this session — MCP :3100 flapped (ECONNREFUSED, auto-reconnected pid 63992 → 404=up), Ollama healthy (10 models, Blackwell roster correct: gpt-oss:120b/20b, qwen2.5-coder:32b/1.5b, qwen3-vl, nomic-embed-text), Docker postgres/grafana/prometheus up.
