# PRISM Project Memory
## Last synced: 2026-04-27T12:04:20

## Primary Roadmap
**File:** `C:\Users\Mark Villanueva\.claude\plans\sleepy-chasing-prism.md`
**Title:** PRISM App — Comprehensive Layered Roadmap (v2 — Execution Protocol)
**NOTE:** This is the ONLY roadmap to follow. Ignore old phase docs (R15, etc.) in `data/docs/roadmap/`.

## Current Position
unknown

## Omega Target
User explicitly wants **Omega = 1.0** for ALL future milestones. Not 0.75 — full 1.0.

## Working Mode
- YOLO mode: autonomous execution, auto-commit after each unit
- Commit format: LAYER-PHASE-UNIT: title — summary
- Security: use execFileNoThrow, never shell injection patterns
- Maximum token efficiency: parallelize independent work, minimize back-and-forth
- **ALWAYS BUILD, NEVER SKIP** — gap analyses must build every identified engine. See feedback_always_build.md. Enforced by Stop hook always-build-guard.mjs + registry state/shared/PENDING_GAP_ENGINES.json.

## Key Counts (frozen in BASELINE_INVENTORY.json)
- 95 dispatchers, 6465 actions, 3014 engine files
- 14 registries, 29,569 entries, 61 skills, 48 scripts, 17 algorithms
- 59 hooks (registry) / 112 hooks (source), 40 cadence functions
- 0 tsc errors, 3028/3028 tests pass, 5.1MB build, Omega = 1

## Architecture
- MCP server: H:\prism\mcp-server\
- Build: npm run build (tsc noEmit + esbuild), heap 16GB
- Build fast: npm run build:fast (esbuild only, skip tsc)
- Tests: npx vitest run
- Web app: mcp-server/web/ (8 pages, thin client)
- State: mcp-server/data/state/ (HEALTH_CHECK_REPORT.json, BASELINE_INVENTORY.json)
- State (legacy): state/ (CURRENT_STATE.json, SESSION_MEMORY.json)

## Notable Decisions
- [P6-U03 awareness hook dedup](project_p6u03_awareness_dedup.md) — kept 3 canonical + 4 distinct-role; deprecated 10 overlapping hooks; wire script ships the settings.json half.

## Key Files
- Roadmap: sleepy-chasing-prism.md (the ONLY source of truth)
- Position: state/CURRENT_POSITION.md
- Health: mcp-server/data/state/HEALTH_CHECK_REPORT.json
- Baseline: mcp-server/data/state/BASELINE_INVENTORY.json
- Schema: mcp-server/src/schemas/roadmapSchema.ts

## Recent Commits
```
8bb974fea CAM-EXHAUST-MS0/U-CAM-FIDX-19: AlphacamFunctionIndexEngine + 10 dispatcher actions
d8df3d6bd [MAIN] HOOK-SCHEMA-FIX-2: path-frequency-tracker {message:} → hookSpecificOutput
6d1c8c9f6 CAM-EXHAUST-MS0/U-CAM-FIDX-18: SprutCAMFunctionIndexEngine + 10 dispatcher actions
f06937fbc CAM-EXHAUST-MS0/U-CAM-FIDX-17: CimatronFunctionIndexEngine + 10 dispatcher actions
b3768a072 [MAIN] HOOK-AUDIT-MS0: bulk schema audit + 9 helper async fixes + 2 schema fixes
```
