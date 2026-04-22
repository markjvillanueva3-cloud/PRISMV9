# PRISM Project Memory
## Last synced: 2026-04-16T21:53:53

## Primary Roadmap
**File:** `C:\Users\wompu\.claude\plans\sleepy-chasing-prism.md`
**Title:** PRISM App — Comprehensive Layered Roadmap (v2 — Execution Protocol)
**NOTE:** This is the ONLY roadmap to follow. Ignore old phase docs (R15, etc.) in `data/docs/roadmap/`.

## Current Position
MCAT-MS0 — Machine Catalog Convergence for Calculator + Shop Profiles

## Omega Target
User explicitly wants **Omega = 1.0** for ALL future milestones. Not 0.75 — full 1.0.

## Working Mode
- YOLO mode: autonomous execution, auto-commit after each unit
- Commit format: LAYER-PHASE-UNIT: title — summary
- Security: use execFileNoThrow, never shell injection patterns
- Maximum token efficiency: parallelize independent work, minimize back-and-forth
- **ALWAYS BUILD, NEVER SKIP** — gap analyses must build every identified engine. See feedback_always_build.md. Enforced by Stop hook always-build-guard.mjs + registry state/shared/PENDING_GAP_ENGINES.json.

## Key Counts (frozen in BASELINE_INVENTORY.json)
- 82 dispatchers, 2720 actions, 1455 engine files
- 14 registries, 29,569 entries, 61 skills, 48 scripts, 17 algorithms
- 59 hooks (registry) / 112 hooks (source), 40 cadence functions
- 0 tsc errors, 1255/1255 tests pass, 62MB build, Omega = 1

## Architecture
- MCP server: H:\prism\mcp-server\
- Build: npm run build (tsc noEmit + esbuild), heap 16GB
- Build fast: npm run build:fast (esbuild only, skip tsc)
- Tests: npx vitest run
- Web app: mcp-server/web/ (8 pages, thin client)
- State: mcp-server/data/state/ (HEALTH_CHECK_REPORT.json, BASELINE_INVENTORY.json)
- State (legacy): state/ (CURRENT_STATE.json, SESSION_MEMORY.json)

## Key Files
- Roadmap: sleepy-chasing-prism.md (the ONLY source of truth)
- Position: state/CURRENT_POSITION.md
- Health: mcp-server/data/state/HEALTH_CHECK_REPORT.json
- Baseline: mcp-server/data/state/BASELINE_INVENTORY.json
- Schema: mcp-server/src/schemas/roadmapSchema.ts

## Recent Commits
```
4a50be47 HANDOFF/pp-road-map: cross-PC session handoff for PP dispatcher parity work
df4534ef PP-S0-MS0/U-S0-09: wire PostProcessorKnowledgeEngine — full PP parity (137/137)
143e7155 PP-S0-MS0/U-S0-08: wire 22 unwired PP engines into ppDispatcher — +166 actions
0921645e PP-MASTER/v1.2: mode-specific alignment expansion — 208 line additions
f69d4d57 MS-P0.5-COORD/U-P0.5-COORD-07: WEDMArchiveBackfillEngine — warm-start substrate from historical programs
```
