---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/wompu/.claude/projects/h--prism/memory/MEMORY.md
source_filename: MEMORY.md
content_hash: 88c0fc664547480b171cfc078dceaf058b581c633e8c438c70e9ae2d38c1c53c
mirror_ts: 2026-05-05T22:24:06.683Z
mirror_engine: ObsidianMemorySyncEngine
---
# PRISM Project Memory
## Last synced: 2026-05-05T11:02:34

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
- 95 dispatchers, 6981 actions, 3072 engine files
- 14 registries, 29,569 entries, 61 skills, 48 scripts, 17 algorithms
- 59 hooks (registry) / 112 hooks (source), 40 cadence functions
- 0 tsc errors, 3217/3217 tests pass, 5.1MB build, Omega = 1

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

## Memory pointers
- [Lathe milestones audit (2026-05-05)](feedback_lathe_audit_2026_05_05.md) — Don't re-audit "continue lathe work"; no leftover work. Full drift map in handoff.

## Recent Commits
```
24b932f2d [MAIN] [CAD-COMPLETE-MS0]/U-CADC-PRINT-INT01: blueprint→6CAD E2E integration test (real JM-Die fixtures)
8a69a0cdf [MAIN] [CAD-COMPLETE-MS0]/U-CADC-PRINT-PHASE3: blueprint→6CAD orchestrator + HyperMill CAM bridge
814970df2 [MAIN] [CAD-COMPLETE-MS0]/U-CADC-PRINT-PHASE2: hyperCAD-S analysis bridge + SW/Esprit Live runners + 6-CAD orchestrator
90b15b333 [MAIN] [CAD-COMPLETE-MS0]/U-CADC-PRINT-ORCHESTRATOR: end-to-end OCR-to-all-CADs orchestrator + 'esprit' literal
44d8084d4 [MAIN] [CAD-COMPLETE-MS0]/U-CADC-PRINT-BRIDGES-FIX2: dedicated EspritCodeGeneratorEngine.test.ts (26 tests, satisfies stop-on-untested-engine hook)
```
