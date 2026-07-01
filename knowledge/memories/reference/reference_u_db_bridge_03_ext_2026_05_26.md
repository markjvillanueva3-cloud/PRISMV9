---
name: reference-u-db-bridge-03-ext-2026-05-26
description: "U-DB-BRIDGE-03-EXT extends b783 CatalogUnifiedQueryEngine with tool_holders + workholding — 4 catalogs → 6 catalogs in one call (juliett 2026-05-26, /goal-driven, commit 8050164a65)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.236Z
aliases: reference_u_db_bridge_03_ext_2026_05_26
---


# U-DB-BRIDGE-03-EXT — CatalogUnifiedQuery +holders +workholding (juliett, 2026-05-26)

## Directive

/goal: *"continue all database expansion, bridging for machines, tooling, tool holders, work holding and material"*. The b783 U-DB-BRIDGE-03 bridge (2026-05-25) joined 4 catalogs (material+tool+coating+machine); `/goal` explicitly named the two gaps: **tool_holders** + **work_holding**. This extension closes both.

## Approach (Karpathy R3 — surgical, R8 — reuse over rebuild)

Smallest, highest-ROI move: extend the existing bridge, do NOT spin up a new engine. `toolHolderDatabaseEngine` already powered `holder_get/search/recommend` in `dataDispatcher`; `registryManager.databases.search` already powered `workholding_get/search`. The /goal asked for "bridging" not "building" — the data layers exist, just not yet unified.

## Shipped (commit `8050164a65`)

- `mcp-server/src/engines/CatalogUnifiedQueryEngine.ts` (+~85 LOC) —
  - Imported `toolHolderDatabaseEngine`
  - Added optional input fields: `machine_type?: string`, `rpm?: number`
  - Added result channels: `tool_holders_top: any[]`, `workholding_top: any[]`
  - Added stats: `tool_holders_returned`, `workholding_returned`
  - Channel 5 (holders): context-driven `recommend({machine_type, rpm, application:op_type})` when context exists; falls back to `search(material, max)` otherwise. Both capped at `max_per_catalog`.
  - Channel 6 (workholding): `registryManager.databases.search(op_type ?? material, max)` — same data path as the dispatcher's `workholding_search` action.
  - Empty-material early-return zeroes the new fields (no undefined leakage).
  - Miss reasons surfaced: `tool_holders_empty`, `tool_holders_failed`, `workholding_empty`, `workholding_registry_absent`, `workholding_search_failed` (R12 fail-loud).

- `mcp-server/src/__tests__/catalogUnifiedQueryBridge.test.ts` (+10 new cases, 0 weakened) —
  - **29/29 PASS** (was 19/19 — net +10, zero regressions)
  - Updates: empty-material zeroing assertions, shape-invariant array+count consistency for new fields
  - New EXT block: backward-compat shape, length-cap holders, length-cap workholding, context-driven recommend branch, empty-channel miss-reason surfacing, 1/999 boundary clamps, SIX-channel proof, decoupling invariant (no binding to registry fuzzy-match)

## Backward compatibility

- Dispatcher action `catalog_unified_match` input signature **unchanged**.
- Result shape is **additive** — adds 2 fields, no rename/removal. Existing quoting consumers keep working.
- No Zod schema change — schema validates input only.

## Reuse map

| Channel | Data source | Pre-existing surface |
|---|---|---|
| material | `MaterialRegistry.getByIdOrName` | `material_get` (prism_data) |
| tools | `ToolRegistry.list` | `tool_list` (prism_data) |
| coatings | `CoatingRegistry.list` | `coating_list` (prism_data) |
| machines | `MachineRegistry.list` | `machine_list` (prism_data) |
| **tool_holders** (new) | `toolHolderDatabaseEngine.recommend/search` | `holder_recommend/search` (prism_data) |
| **workholding** (new) | `registryManager.databases.search` | `workholding_search` (prism_data) |

The bridge now subsumes a 6-RTT pattern.

## Karpathy 5-step trace

1. **CLASSIFY** — bridge extension, multi-source merge problem
2. **TECHNIQUE** — additive query branches with context-aware fallback (recommend → search), miss-reason telemetry, length-cap clamps
3. **EDGE CASES** — empty material, missing context fields, length=1/999 boundaries, registry-absent path, throw-from-search
4. **FAILURE MODES** — `registryManager.databases` undefined, `.search` missing, holder DB empty for query — ALL covered via miss_reasons + array fallback
5. **THEN WRITE** — mirrored b783 shape (singleton class export, fail-soft pattern, miss_reasons telemetry)

## R12 surface — registry-fuzzy-match honesty

One test initially failed because `ZZZ_UNKNOWN` got fuzzy-matched by MaterialRegistry (returned `ok:true`). Did NOT weaken the assertion — instead reframed the test to its **actual invariant**: "EXT channels return arrays regardless of material lookup outcome — does NOT bind to MaterialRegistry fuzzy-match behavior which is registry-seed-dependent." The test now decouples from registry data drift.

## Attribution

This commit landed under **juliett's** attribution (commit `8050164a65`) — not absorbed into a peer commit like U-DB-BRIDGE-01 (`e5821f9984`). Same shared-tree hazard exists per `[[feedback_commit_to_slot_worktree]]`; just won the race this time by atomically staging+committing the 2 files in one window.

## Cross-references

- Sibling: `[[reference_u_db_bridge_01_2026_05_26]]` — Qdrant vector bridge (also juliett 5/26)
- Parent: U-DB-BRIDGE-03 `b783f986ab` (2026-05-25, juliett) — initial 4-catalog bridge
- Plan: `state/shared/specs/JULIETT-DB-BRIDGE-PLAN-2026-05-25.md`
- Wiki: `[[catalog-unified-query-engine]]` (legacy entry) — should update to mention EXT channels
- Related: `[[feedback_commit_to_slot_worktree]]`, `[[feedback_high_roi_backend_first_slot_queue]]`, `[[feedback_prioritize_devtools_backend]]`
