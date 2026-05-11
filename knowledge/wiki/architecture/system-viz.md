---
type: architecture
created: 2026-05-08
tags: [visualization, dev-tools, system-map, neural-network, three-js, observability]
related: [build-state, dispatcher-digest, engine-digest]
---

# System Viz — PRISM Live System Map

## Summary

Interactive 3D visualization of the entire PRISM platform as a 10-layer neural network. Every layer from user personas down to filesystem is rendered as concentric rings with live edge connections. **Generated from live codebase state** — not a static diagram.

## Layers (top → bottom)

| Layer | Contents | Source |
|-------|----------|--------|
| L0 Personas | Operator / Programmer / Quoter / Boss / Admin | hardcoded |
| L1 Frontend | mcp-server/web (144 pages → 14 functional clusters), cqask/ui (pending), mcp-cadquery (pending), CLI, Mobile | live `webPages` scan |
| L2 Transport | MCP / REST / gRPC / GraphQL / WS / Auth / Rate / Telemetry | hardcoded |
| L3 AI Hierarchy | Tier-1 Claude · Tier-2 FullSystemAICoordinator · 7 Tier-3 specialists · 4 Ollama models | hardcoded |
| L4 Dispatchers | All 97 individual `*Dispatcher.ts` files, color-coded by category | live filesystem scan |
| L5 Engine Domains | 24 wired domain clusters + top 16 unwired domains | `BUILD_STATE.json` |
| L6 Cores | algorithms / schemas / physics constants / formulas / tests / hooks / scripts / skills | live counts |
| L7 Registries | All 26 registry files + 4 catalog summaries | live filesystem scan |
| L8 State / Wiki | wiki sub-categories + memory types + state subdirs + JM Die corpus | live filesystem scan |
| L9 Filesystem | Top-level `H:/prism/*` directories | live filesystem scan |

## Why it matters

- Single-pane-of-glass for the entire 3,173-engine / 97-dispatcher / 7,302-action codebase
- Shows what's built vs what's unwired vs what's drift in real time
- Click any node → opens in VS Code (`vscode://file/...`)
- Search any node → highlights it across the whole system
- Multi-chat claims overlay → see files locked by peer Claude/Codex/Gemini sessions
- Replaces grep-driven discovery for newcomers and refactor planning

## Files

- Generator: `H:/prism/scripts/generate-system-viz.mjs`
- Query adapter: `H:/prism/scripts/system-viz-query.mjs`
- Viewer: `H:/prism/state/shared/system-viz/system-viz.html` (Three.js + ESM imports from CDN)
- Server: `H:/prism/state/shared/system-viz/_server.cjs` (Node http, port 8765)
- Output: `H:/prism/state/shared/system-viz/system-graph.json` (174 KB, 334 nodes, 627 edges)

## Endpoints

`GET /` · `GET /system-graph.json` · `POST /regenerate` · `GET /file-claims`

## How to launch

`/system-viz` slash command — handles regenerate + server + browser open.

## Integration with rgs / forge / roadmap planning

`state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md` is the authoritative rule set:
- **Before proposing new milestones** — read `system-graph.json`, filter unwired engines, propose work that wires them
- **Before creating new engines** — search the graph for existing similar nodes (replaces `duplicationGuardEngine` proximity search with structural one)
- **Before proposing new frontend pages** — check pending-merge nodes; merge `cqask` / `mcp-cadquery` first
- **Before scheduling** — check `/file-claims` to avoid stepping on peer chats
- **For envelope-vs-reality reconciliation** — drift nodes flash red

## Auto-refresh

Generated on demand via `/system-viz` or `POST /regenerate`. The server adds `cache-control: no-store` so reload always shows fresh data. Recommended cron: every 30 min while developing.

## Authored

Generator + viewer built 2026-05-08 in session `claude-0413eca6` (CAD-FUSION-LIVE-MS0 worktree).
