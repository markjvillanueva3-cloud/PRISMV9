---
name: docker-mcp-wire-ms0
description: DOCKER-MCP-WIRE-MS0 — Docker MCP Toolkit + Docker Models integration and its system-viz/AI/NN synergy; where the docker tooling lives
aliases: reference_docker_mcp_wire_ms0_2026_05_19
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.555Z
---


# DOCKER-MCP-WIRE-MS0 (2026-05-19, slot juliett)

Integrates the local Docker MCP Toolkit (v0.40.4) + Docker Models into PRISM
and synergizes it into the intelligence backbone. Three units shipped:

- **U-MODELS-FALLBACK** (`8edfebbfe1`) — `scripts/ask-ollama.mjs` gains
  `callLocalModel()`: Ollama with a `docker model run` fallback on daemon-down.
  `callOllama` unmodified (back-compat). `PRISM_DOCKER_MODEL_MAP` env override.
- **U-DOCKER-MCP-READER** (`c43a7820ee`) — `scripts/docker-mcp.mjs`: read-only
  Docker MCP reader. Modes `status|version|clients|catalog`. Exported pure
  parsers `stripAnsi`/`parseCatalogLs`/`parseClientLs`. execFile argv-safe,
  only invokes read-only `docker mcp` subcommands.
- **U-DOCKER-SYNERGY-VIZ** (`f0467f2362`) — `scripts/generate-docker-mcp-features.mjs`
  emits a `ghost.docker_mcp` roost into `system-graph.json`; registered in
  `regen-viz.mjs` FAST[] + `merge-augmentations.mjs` splice.

**Synergy insight (the load-bearing one):** `system-graph.json` is the shared
substrate — the AI router (`master_index_query`) and the NN-graph GraphSAGE GNN
both read it. So one system-viz augmentation surfaces Docker MCP to three
intelligence layers with zero extra wiring. `recommendAIFeatures` was
deliberately NOT wired — Docker MCP is infra, not a PRISM AI engine; wiring it
there would mislabel it (R12).

**Operator-blocked** (not autonomously buildable): Docker Scout enrollment +
Hub publishing need `docker login` + a Docker Hub org slug; the upstream MCP
git/time/fetch server wiring mutates the live `.mcp.json` (operator action).

Full detail: [[docker-mcp-wire-ms0]] wiki entry
(`knowledge/wiki/architecture/docker-mcp-wire-ms0.md`). Sibling: [[ollama-expand-ms0]].
