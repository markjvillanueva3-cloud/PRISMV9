---
name: reference-u-monolith-workholding-loader-2026-05-26
description: "U-DB-MONOLITH-WORKHOLDING-LOADER ports PRISM_WORKHOLDING_DATABASE.js (v8.89 monolith) into typed engine + wires it into CatalogUnifiedQuery — 12 fixture types + 5 products now reachable through catalog_unified_match.workholding_top (juliett 2026-05-26, absorbed into peer commit 5fed67945e)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.238Z
aliases: reference_u_monolith_workholding_loader_2026_05_26
---


# U-DB-MONOLITH-WORKHOLDING-LOADER — monolith → typed engine + bridge wire (juliett, 2026-05-26)

## Directive

User 2026-05-26: *"make sure databases from monolith extraction, extracted and extracted module folders in the prism folder are taken into account for database expansion"*.

## Gap closed

`extracted/workholding/PRISM_WORKHOLDING_DATABASE.js` was referenced by NAME in `WorkholdingIntelligenceEngine.ts` (line 457) catalog manifest — but no live engine actually loaded the data. `CatalogUnifiedQueryEngine.workholding_top` (U-DB-BRIDGE-03-EXT) was routing through `registryManager.databases.search()` which is a *file-catalog index*, not a workholding-product catalog. The bridge was returning empty for real queries.

## Shipped (absorbed into `5fed67945e` — quebec U-INSTALL-BATCH-FRONTEND)

1. **`mcp-server/src/engines/MonolithWorkholdingDatabaseEngine.ts`** (NEW, ~245 LOC)
   - TS-typed port of the monolith's `fixtureTypes` (12) + `products` (5) tables.
   - Canonical PRISM port pattern mirroring `ToolHolderDatabaseEngine.ts`.
   - Public API: `listFixtureTypes/listProducts/getFixtureType/getProduct/search/listByCategory/listByManufacturer/stats`.
   - All fail-soft: null/[] on bad input, never throws. Non-string search → []; invalid limit → []; unknown id → null.
   - **Physics intentionally NOT ported** (calculateRigidity / calculateMaxCuttingForce already live in `WorkholdingEngine.ts` 47.7K + `WorkholdingForceEngine.ts`). This engine is data-only per R7 (surface conflicts, don't blend).

2. **`mcp-server/src/__tests__/monolithWorkholdingDatabase.test.ts`** (NEW, ~210 LOC)
   - **31/31 PASS**
   - 11 data-integrity (counts 12+5=17, sentinel IDs, specific monolith values preserved like `kurt_dl640.clampingForce=40000`)
   - 3 get* surface (null on unknown/empty)
   - 9 search (case-insensitive, empty/whitespace, **R12 non-string adversarial**: 123/null/undefined, limit cap, invalid limit, no-match)
   - 5 category+manufacturer filters
   - 2 immutability (returned arrays don't mutate the store)
   - **1 R8 anti-regression** — `toe_clamps is NOT a fixture type (it's a clampingMethod value of fixture_plate)` — pins the boundary so future contributors don't confuse the source.

3. **`mcp-server/src/engines/CatalogUnifiedQueryEngine.ts`** — workholding_top channel rewired:
   - **PRIMARY**: `monolithWorkholdingDatabaseEngine.search(whQuery, max)` → returns rich typed records
   - **FALLBACK**: `registryManager.databases.search` (preserves backward-compat)
   - **4 miss_reasons** cover full failure space: `workholding_monolith_failed`, `workholding_search_failed`, `workholding_registry_absent`, `workholding_empty`

## R8 corollary — counting honestly

Initial test asserted 13 fixture types; the monolith actually has 12. `toe_clamps` is a clampingMethod VALUE of `fixture_plate`, not its own type. Per CLAUDE.md "never weaken assertion to make it pass" — fixed the test to 12 (correct count) AND added the anti-regression case rather than removing the assertion.

## REGRESSION — 2nd absorption this session

Same class as U-DB-BRIDGE-01 (`e5821f9984` absorbed into quebec U-B1). My `git add` + `git commit` raced peer chats; the lock-contention window let quebec absorb my 3 files into their `U-INSTALL-BATCH-FRONTEND` commit (`5fed67945e`). 2 of 4 commits absorbed in this 2-loop session = 50% absorption rate.

**Verify shipped:**
```bash
git -C H:/prism show 5fed67945e --stat | grep MonolithWorkholding
git -C H:/prism log -- mcp-server/src/engines/MonolithWorkholdingDatabaseEngine.ts
cd H:/prism/mcp-server && npx vitest run src/__tests__/monolithWorkholdingDatabase.test.ts
```

**Root cause:** slot-bridge hooks (`worktree-commit-route`, `git-add-lane-guard`, `main-tree-write-block`) remain disabled per `5828080636` (`feedback_slot_bridge_hooks_disabled`). Forward fix would be a per-slot guard that arms only when slot worktree exists, preserving the absorption protection.

## /goal status

User's 2026-05-26 directive named:
- ✅ **machines** — bridged via `catalog_unified_match.machines_top` (b783 + EXT)
- ✅ **tooling** — bridged via `tools_top` (b783)
- ✅ **tool holders** — bridged via `tool_holders_top` (EXT this session, `8050164a65`)
- ✅ **work holding** — bridged via `workholding_top` + MONOLITH-LOADER (this commit) — now returns RICH data, not empty
- ✅ **material** — anchor (b783)
- ✅ **"databases from monolith extraction"** — `PRISM_WORKHOLDING_DATABASE` now LIVE-loaded, not just name-referenced.

## Next monolith loaders queued

Same hand-port pattern for the remaining `extracted/` folders:
- `PRISM_FIXTURE_DATABASE.js` (12.8K, extracted/workholding/)
- `PRISM_CUTTING_TOOL_DATABASE_V2.js` (54.4K, extracted/tools/)
- `PRISM_TOOL_TYPES_COMPLETE.js` (6.3K, extracted/tools/) — smallest, fastest
- `PRISM_MACHINE_3D_MODEL_DATABASE_V3.js` (71.2K, extracted/machines/)
- `materials_v9_complete/` — BLOCKED per b783 R12 (1/7 ISO groups, corpus regen needed)
- `extracted_modules/` (separate folder, larger scan needed)

## Cross-references

- Commit: `5fed67945e` (absorbed — same class as `e5821f9984`)
- Plan: `state/shared/specs/JULIETT-DB-BRIDGE-PLAN-2026-05-25.md`
- Sibling memories: `[[reference_u_db_bridge_01_2026_05_26]]`, `[[reference_u_db_bridge_03_ext_2026_05_26]]`
- Related: `[[feedback_commit_to_slot_worktree]]`, `[[feedback_slot_bridge_hooks_disabled]]`, `[[feedback_ai_training_first_before_revenue]]`
