---
name: reference-u-oe-docker-compose-2026-05-18
description: U-OE-DOCKER-COMPOSE shipped 2026-05-18 echo — Layer-2b ollama-bridge Docker deployment topology
aliases: reference_u_oe_docker_compose_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.239Z
---


# U-OE-DOCKER-COMPOSE — ollama-bridge deployment topology (2026-05-18 echo)

Shipped 2026-05-18 by claude-00a9c6dc slot echo. The last non-deferred [[reference_ollama_expand_ms0|OLLAMA-EXPAND-MS0]] unit — answers the Docker half of the operator question *"can we hook Ollama up to the PRISM MCP server like Claude Code? same with Docker?"*. L1 (U-OE01 ask-ollama), L2 (U-OE-BRIDGE-L2 charlie), L2b ([[reference_u_oe_bridge_l2b_2026_05_18|U-OE-BRIDGE-L2B]] foxtrot, commits 2518aa3514+90103705e8) already shipped today; this is the reproducible Docker topology that runs them together. Only L3 remains and it is **deferred** (needs a local model larger than the installed 3B — tool-call accuracy scales with model size).

**Files:** `docker-compose.ollama-bridge.yml` (additive override, mirrors `docker-compose.ollama-preload.yml` convention) + `scripts/__tests__/ollama-bridge-compose.test.mjs` (8/8 node:test).

**The class fix — two base-compose facts (verified in mcp-server/src/index.ts) made the L2b bridge unreachable on the compose network:**
1. base `prism-server` sets no `TRANSPORT` → MCP runs **stdio** (`index.ts:1053` `process.env.TRANSPORT || "stdio"`); `runHTTP()`/`app.post("/mcp")` never executes — the L2b `mcp_call` route is absent.
2. even in HTTP mode the server binds `127.0.0.1` unless `PRISM_BIND_HOST=0.0.0.0` (`index.ts:1023-1024`) — a sibling container can't reach it.

The override flips BOTH on prism-server (additive list-env merge — base `NODE_ENV`/`DATABASE_URL` survive, Compose merges `environment` per-key) and adds a profile-gated (`profiles:["bridge"]`) one-shot (`restart:"no"`) `ollama-bridge` service: `image: node:22-alpine`, repo `:ro`-mounted at `/prism`, env `OLLAMA_URL=http://ollama:11434` + `PRISM_MCP_URL=http://prism-server:3000/mcp` (port 3000 = base prism-server internal `PORT` default, NOT the bare-bridge default 3100), depends_on both healthy.

**Bridge MCP-enable mechanism (gotcha):** `TOOL_NAMES` in `ollama-prism-bridge.mjs:273` ALWAYS includes `mcp_call` — there is NO `--enable-mcp` flag (flags are only `--model/--max-calls/--timeout/--json/--trace`). The bridge just needs `PRISM_MCP_URL` reachable.

**Per-file 2-reviewer gate:** both PASS, no P0. Fixed in-session: P1 model-prerequisite header line (R12 — `qwen2.5-coder:3b` must pre-exist in the ollama volume; `up` doesn't pull it) + P1 base-env-survival test assertion (NODE_ENV/DATABASE_URL — the list-merge regression the file's WHY header most fears) + P3 relaxed brittle `index.ts:1053/:1023` line-number source-arm pins → behavioral-token match + documented `.git/.env` read-exposure (accepted: local single-user, read_excerpt is repo-wide BY DESIGN) + `/health` healthcheck coupling note.

**Test design:** docker arm (`docker compose -f base -f override --profile bridge config --format json` merge validation — `--profile bridge` load-bearing or the gated service is absent) skip-LOUD if docker absent; docker-independent SOURCE arm always-on (pins `:ro`, profile gate, `restart:"no"`, pinned image, no top-level networks-fork). Lesson: a compose override's real test is `docker compose config` (native YAML parse+merge+validate) — no js-yaml dep needed.

Sister: [[reference_u_bridge_wire_mastercam_2026_05_18]] (prior echo CAM unit, superseded as the pick when operator redirected to ollama/obsidian upgrades). Blueprint: `state/shared/specs/OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md` (reconciled this session — §Layer 2b + §Queued-units were stale READY/QUEUED vs top-block SHIPPED).
