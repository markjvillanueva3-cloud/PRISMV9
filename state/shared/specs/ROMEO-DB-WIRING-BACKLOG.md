# DB → All-Consumers Wiring Backlog (slot:romeo, YOLO loop)

**Operator directive (2026-06-06):** *run in loops + /yolo until all databases are accounted
for to all possible wirings; use obsidian + PSN + /system-viz + master graph to hunt every
node each database can wire to.*

Companion to `ROMEO-TOOL-DB-COVERAGE-MATRIX.md` (the app-export view). This is the **internal
node-wiring view**: which engines/dispatchers consume each database, and the unwired gaps.

---

## SHIPPED this loop

| Unit | Engine → wire | Validation |
|---|---|---|
| U-ROMEO-CNC-OFFSET-WIRE | `CNCToolOffsetPersistenceEngine.sync` → `prism_data:cnc_tool_offset_sync` | 8/8 round-trip (dataDispatcher 143→144) |

## NEXT wiring candidates (unwired DB-adjacent engines — graph + BUILD_STATE confirmed)

| Engine | Public method | Dedup status | Proposed home | Notes |
|---|---|---|---|---|
| `ToolLifeGnnEngine` | `predict(graph, conditions)` | ✅ non-dup (no `tool_life_gnn` action) | `prism_calc` (tool-life) or `prism_ai` | 2-arg: needs AssemblyGraph + CuttingConditions test fixture; MILL-AGI Phase 0.3 |
| `ToolDatabaseDeepLearningEngine` | `selectOptimalTool` / `buildToolAssembly` / `synchronizeToolData` / `validateToolSetup` / `predictToolLife` | ⚠ **DEDUP FIRST** — `tool_assembly_build` + `tool_recommend` already in dataDispatcher; only `synchronizeToolData` + `validateToolSetup` look unique | `prism_data` (sync/validate) | wire ONLY the unique methods; do NOT duplicate existing actions |

## Graph-hunt method (PSN / system-viz / master graph)

The database nodes live at graph layer **L7 `datacat.*`** (e.g. `datacat.tool_catalog`). Hunt
each DB's consumer candidates with:
```
node scripts/system-viz-query.mjs find "<db noun>"     # candidate nodes (slow ~30s)
node scripts/system-viz-query.mjs node-card <id>        # cheap read (~200 tok) — docs/wiki/mem pointers
```
Tracked pending wiring ghosts already in the graph (work these too):
- `ghost.priority.u-db17` — Tool catalog unification + search index
- `ghost.priority.u-kar42-45` — Tooling Knowledge Wiring
- `ghost.priority.promote-res-ms14-287-tooldb` — 287 tooldb/db tool-catalog import
- `ghost.ms.db-exp-ms0` — Machine Database Expansion (5000+ machines)
- `ghost.ms.db-exp-ms2` — Tool Holder Database (10000+ holders)
- `ghost.priority.p3-u02` — Tool & Machine Database Pages (frontend)

## Databases in scope (the "all databases" set)

1. **Tooling** (153,394 mfr / 149,973 tool-spec, `datacat.tool_catalog`) — wired to calc/cam/data tool_catalog_*; CAM-app generators shipped.
2. **Inserts** (kennametal_turning 11,868 + indexable 11,542 + 8 vendor monoliths) — within tool catalogs.
3. **Holders** (4,216; `ToolHolderDatabaseEngine`/Catalog/Registry) — dataDispatcher tool_holder_* wired; CAM-app holder exports shipped.
4. **Machines** (11 handbooks + ShopConfig 21 + cimco 86; `datacat.machine`) — dataDispatcher machine_* + machine_config_* wired; HSMAdvisor machines.xml live.
5. **Vendor catalog DB** (482 vendors, `vendor-catalog-db`) — dataDispatcher database_* / catalog_* wired.

## Loop continuation
- iter1: cnc-offset wire SHIPPED. iters 2-3: ToolLifeGnnEngine + ToolDatabaseDeepLearningEngine
  (unique methods only, dedup-gated). Then sweep the `ghost.priority` wiring units above.
- Each wire = enum + lazy-import case + real round-trip test through the dispatcher + commit (R15).
