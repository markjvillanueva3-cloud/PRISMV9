# PRISM Project Memory
## Last synced: 2026-04-18T22:35:33

## Primary Roadmap
**File:** `C:\Users\wompu\.claude\plans\sleepy-chasing-prism.md`
**Title:** PRISM App — Comprehensive Layered Roadmap (v2 — Execution Protocol)
**NOTE:** This is the ONLY roadmap to follow. Ignore old phase docs (R15, etc.) in `data/docs/roadmap/`.

## Current Position
LATHE-PROD-READY-MS0 — Lathe Production Ready — Print-to-Program Pipeline with JM Die Validation

## Omega Target
User explicitly wants **Omega = 1.0** for ALL future milestones. Not 0.75 — full 1.0.

## Working Mode
- YOLO mode: autonomous execution, auto-commit after each unit
- Commit format: LAYER-PHASE-UNIT: title — summary
- Security: use execFileNoThrow, never shell injection patterns
- Maximum token efficiency: parallelize independent work, minimize back-and-forth
- **ALWAYS BUILD, NEVER SKIP** — gap analyses must build every identified engine. See feedback_always_build.md. Enforced by Stop hook always-build-guard.mjs + registry state/shared/PENDING_GAP_ENGINES.json.

## Key Counts (frozen in BASELINE_INVENTORY.json)
- 90 dispatchers, 5377 actions, 2493 engine files
- 14 registries, 29,569 entries, 61 skills, 48 scripts, 17 algorithms
- 59 hooks (registry) / 112 hooks (source), 40 cadence functions
- 0 tsc errors, 2343/2343 tests pass, 5.1MB build, Omega = 1

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
ec14a7a20 P2P-FULLSTACK-MS0/U-P2PFS21: Gate ERP routes on safety envelope
b5e5f8583 CAM-PARITY-AGI-MS0/U-CAMP-PP03: Mitsubishi MV1200R Wire EDM Master Post
a5c136be5 USSH-T5T6: Register Tier 5 Validation + Tier 6 Stop Hooks
4faeb6ab2 P2P-FULLSTACK-MS0/U-P2PFS20: Safety envelope gate for WEDMPrintToProgramEngine
5f6062cd3 LATHE-PROD-READY-MS0/U-LPR-SEC02: EncryptionAtRestEngine with AES-256-GCM
```
