---
name: reference_oscar_sfc_juliett_database_bridge_2026_05_29
description: SFC↔juliett(database-expansion) PSN edge — SFC's DB-class stores (32 tool catalogs→41K aggregation, 5 vendor baseline DBs, outcome JSONL, variability cache) follow juliett's persistence discipline (atomic-write·schemaVersion·migration); declared oscar-side, reciprocal back-link pending juliett (discoverable via this memory).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.708Z
aliases: reference_oscar_sfc_juliett_database_bridge_2026_05_29
---


# SFC ↔ juliett (database-expansion) PSN edge (2026-05-29, slot:oscar)

Operator directive: "wire to juliett galaxy for the databases." Wired the SFC↔database PSN edge from oscar's side.

## The edge (bidirectional, data)
Juliett's galaxy = `mcp-server/src/engines/database-expansion/` (galaxy:database-expansion — Qdrant/AgentDB/SQLite-WAL/JSONL/state-JSON persistence; ~18 engines; prism_memory primary; **atomic-write + schemaVersion + migration N-1 discipline**; juliett "realigned soul off speed-feed" 2026-05-29, so its back-link to oscar needs an explicit add).

SFC owns DB-class assets that fall under juliett's persistence discipline:
- **32 `*-extracted.json` tool catalogs** → 41K-tool union via `PRISMToolCatalogAggregatorEngine`.
- **5 vendor baseline DBs** (Sandvik/Kennametal/CNCCookbook/Titans/HSMAdvisor) via `SpeedFeedBaselineComparatorEngine`.
- **Machine power-curve data** (1066 machines / 9255 points, HSMAdvisor machine export).
- **`sfc_outcome_*` feedback JSONL** (closed-loop) + **`sfc-variability-cache`/ledger** (the at-scale sweep store).
- Live vendor files at `C:/.../AppData/Roaming/{HSMAdvisor,GWizard.*}` (round-trip, `.bak-*` discipline).

Direction: SFC **produces** these stores (they must follow juliett's atomic-write + schemaVersion + migration rules) AND **consumes** juliett's DB-expansion work (juliett grows the catalog/baseline coverage SFC diffs against — e.g. the 84.6% structural ceiling is a catalog-completeness gap juliett can close).

## Wiring done (oscar-side)
- Galaxy CLAUDE.md "## Related galaxies (PSN edges)" — added the `database-expansion (juliett)` row.
- Galaxy MEMORY.md "## Cross-galaxy bridges" — added the juliett DB bridge.
- **Reciprocal back-link PENDING juliett** — the symmetric `oscar/speed-feed` data-consumer back-link in juliett's galaxy CLAUDE.md/MEMORY.md is not yet added (juliett realigned its soul off speed-feed so it isn't auto-present). The edge is fleet-discoverable via THIS memory (auto-fed to Obsidian on Stop → juliett surfaces it via memory-search). No live chat-bus post helper was available cross-slot from the worktree (R12 — not claiming one was sent).

## Discipline note (carry into SFC DB work)
Any new SFC data store (catalog, baseline, outcome JSONL, cache) MUST follow juliett's discipline: atomic write (tmp+rename), `schemaVersion` field, migration path (N-1 compat). Don't hand-roll persistence — coordinate with juliett. See [[reference_oscar_sfc_vendor_parity_state]] · [[reference_oscar_sfc_baseline_coverage_ceiling]] · [[reference_oscar_sfc_domain_map_2026_05_27]].
