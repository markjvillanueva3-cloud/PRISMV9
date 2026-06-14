---
title: U-OE-DOCKER-COMPOSE — ollama-bridge deployment topology
node_type: architecture
milestone: OLLAMA-EXPAND-MS0
shipped: 2026-05-18
slot: echo
session: claude-00a9c6dc
---

# U-OE-DOCKER-COMPOSE — Layer-2b Docker deployment topology

The last non-deferred `OLLAMA-EXPAND-MS0` unit. Answers the Docker half of the
operator question *"can we hook Ollama up to the PRISM MCP server so it gets
access like Claude Code? same with Docker?"*.

## Ladder context

| Layer | Unit | State |
|-------|------|-------|
| L1 local query service | U-OE01 (`ask-ollama.mjs`) | shipped (charlie) |
| L2 read-only agent loop | U-OE-BRIDGE-L2 (`ollama-prism-bridge.mjs`) | shipped (charlie) |
| L2b live MCP-dispatcher tools | U-OE-BRIDGE-L2B | shipped (foxtrot, `2518aa3514`+`90103705e8`) |
| **L2b deployment topology** | **U-OE-DOCKER-COMPOSE** | **shipped (echo, this entry)** |
| L3 full agent loop | U-OE-BRIDGE-L3 | **deferred** — needs a local model > 3B |

## Why an override is required

Two base `docker-compose.yml` facts (verified in `mcp-server/src/index.ts`)
make the L2b bridge unreachable on `prism-net` without this override:

1. base `prism-server` sets no `TRANSPORT` → MCP runs **stdio**
   (`index.ts:1053`); `runHTTP()` / `app.post("/mcp")` (`index.ts:945`) never
   runs — the route the L2b `mcp_call` tool speaks is absent.
2. even in HTTP mode the server binds `127.0.0.1` unless
   `PRISM_BIND_HOST=0.0.0.0` (`index.ts:1023-1024`) — a sibling container on
   `prism-net` cannot reach it.

`docker-compose.ollama-bridge.yml` (additive override, same convention as
`docker-compose.ollama-preload.yml` — does not modify the shared compose):

- **prism-server**: adds `TRANSPORT=http` + `PRISM_BIND_HOST=0.0.0.0`. Compose
  merges list-form `environment` **per-key**, so base `NODE_ENV` /
  `DATABASE_URL` survive (asserted by the test — the most dangerous merge
  failure mode).
- **ollama-bridge** (new): `image: node:22-alpine` (pinned), profile-gated
  `profiles: ["bridge"]` (a plain `up` never starts it), one-shot
  `restart: "no"`, repo `:ro`-mounted at `/prism`, env
  `OLLAMA_URL=http://ollama:11434` +
  `PRISM_MCP_URL=http://prism-server:3000/mcp` (port **3000** = base
  prism-server internal `PORT` default — NOT the bare-bridge default 3100),
  `depends_on` both healthy.

## Gotchas

- The bridge always advertises `mcp_call` (`TOOL_NAMES`,
  `ollama-prism-bridge.mjs:273`) — there is **no `--enable-mcp` flag**; it
  only needs `PRISM_MCP_URL` reachable.
- `qwen2.5-coder:3b` must pre-exist in the `ollama` volume; the `up` line
  does NOT pull it (header states this — R12). Layer
  `docker-compose.ollama-preload.yml` or `exec ollama ollama pull`.
- Whole-repo `:ro` mount exposes `.git`/`.env`/`data/state` to the model;
  accepted (local single-user, read-only, `read_excerpt` is repo-wide BY
  DESIGN — narrowing it would cripple a code-investigation tool). Do not run
  on a multi-tenant host.

## Test

`scripts/__tests__/ollama-bridge-compose.test.mjs` (8/8 node:test). Docker arm
= `docker compose -f base -f override --profile bridge config --format json`
merge validation (`--profile bridge` load-bearing — gated service is absent
from `config` otherwise), skip-**loud** if docker absent. Docker-independent
source arm always-on (pins `:ro`, profile gate, `restart:"no"`, pinned image,
no top-level networks fork). A compose override's canonical real test is
`docker compose config` — native YAML parse+merge+validate, no js-yaml dep.

Memory: [[reference_u_oe_docker_compose_2026_05_18]]. Blueprint:
`state/shared/specs/OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md` (reconciled same
session — §Layer 2b + §Queued-units were stale).
