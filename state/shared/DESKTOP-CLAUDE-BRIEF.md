# PRISM Desktop Claude Brief — Updated 2026-04-13
## Token-efficient context for parallel development.

## What Is PRISM
CNC manufacturing intelligence MCP server. **1,536 engines, 82 dispatchers, 4,668 actions.**
Takes a drawing/part → produces physics-optimized CNC program with per-block variable S/F.
- Backend: TypeScript MCP server at C:/PRISM/mcp-server/
- Frontend: React/Vite web app at C:/PRISM/mcp-server/web/src/ (**128 pages**, extensively converged)
- MCP: Connected to Desktop Claude (localhost:3000)

## Current System State (April 2026)
| Asset | Count |
|-------|-------|
| Engines | 1,536 |
| Dispatchers | 82 |
| Actions | 4,668 |
| Materials | 6,372 |
| Tools | 95,608 |
| Machines | 910 |
| Hooks | 109 |
| Web Pages | 128 |
| Tests | 1,255 |
| Algorithms | 156 |

## Frontend Status (MAJOR PROGRESS)
The frontend has undergone extensive development in Claude Code:
- **128 pages** built and wired
- **Live provider convergence** across most operating-system surfaces
- **Workflow continuity chains** tested: Customers → Quote → Release → Jobs → Shop Floor → Capture Ops → Messages
- **DFM integration**: Quick/full analysis, tolerance stack-up, cost impact

### Live-Backed Surfaces (converged with backend)
- Shell bootstrap, search, pins/recents, saved views
- Jobs desk with traveler/dispatch
- Scheduling with provider-backed studies
- Shop Floor Clock with hot-job propagation
- Program Release with DFM/simulation gates
- Inventory operations (receiving, checkout, documents)
- Messages with thread/workspace hydration
- Parts Library with revision lineage
- Learning progression (mounted course routes)
- Commerce (billing status)

### Staged Surfaces (fixture-backed, awaiting backend)
- Mailbox mutations, read-state, realtime fanout
- Deep custody events in inventory
- Cross-shop learning propagation
- Authority propagation for hot jobs

## Key Files for Frontend Work
```
Web app:          C:/PRISM/mcp-server/web/src/
Pages:            web/src/pages/ (128 pages)
Operating System: web/src/features/operating-system/
Providers:        liveProvider.ts, fixtureProvider.ts, contracts.ts
API clients:      web/src/api/
Tests:            web/src/__tests__/
```

## Coordination Files
- `C:/PRISM/state/shared/backend-status.md` — CLI Claude writes
- `C:/PRISM/state/shared/frontend-status.md` — Frontend status (616 lines)
- `C:/PRISM/state/shared/SYSTEM-CAPABILITIES.md` — This file

## Domain Boundaries
- **CLI Claude domain**: src/engines/, src/tools/dispatchers/, backend logic
- **Desktop Claude domain**: web/src/, src/routes/, frontend, visualization

## MCP Tools Available
```
prism_calc:         1,103 actions (physics, optimization, geometry)
prism_cam:          701 actions (toolpath, post-processing)
prism_business:     350 actions (quote, cost, OEE, scheduling)
prism_data:         159 actions (registry access)
prism_dev:          140 actions (workflow, automation)
prism_knowledge:    98 actions (unified query)
prism_machine_setup: 81 actions (machine, quality, fixturing)
prism_machine_live: 70 actions (monitoring, OPC-UA)
prism_edm:          69 actions (EDM, laser, waterjet)
prism_cad:          66 actions (geometry operations)
```

## Index Files (read BEFORE searching)
- `data/docs/MASTER_INDEX_COMPACT.md` — Quick system map
- `data/docs/ENGINE_DIGEST.md` — All 1,536 engines
- `data/docs/DISPATCHER_DIGEST.md` — All 82 dispatchers
- `data/docs/CODE_SYSTEM_INDEX.json` — Shortcodes

## One Rule
Don't modify files in `src/engines/` or `src/tools/dispatchers/` — that's CLI Claude's domain.
Your domain: `web/src/`, `src/routes/`, frontend components, CSS, visualization.
