# CATALOG-APP-WIRING-MS0/U-CATALOG-CORPUS-LOADER — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CATALOG-CORPUS-LOADER (slot:romeo): keystone — feed the full 62.7K-tool vendor corpus into ToolCatalogEngine.addTools so every app exporter (Fusion/Mastercam/hyperMILL/Inventor) + SFC sees it

**Commit:** `521d5f63b4a2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T11:11:29-05:00
**Tags:** catalog-app-wiring-ms0, u-catalog-corpus-loader, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CATALOG-CORPUS-LOADER (slot:romeo): keystone — feed the full 62.7K-tool vendor corpus into ToolCatalogEngine.addTools so every app exporter (Fusion/Mastercam/hyperMILL/Inventor) + SFC sees it

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CATALOG-CORPUS-LOADER (slot:romeo): keystone — feed the full 62.7K-tool vendor corpus into ToolCatalogEngine.addTools so every app exporter (Fusion/Mastercam/hyperMILL/Inventor) + SFC sees it

CatalogCorpusLoaderEngine reads CATALOG_INDEX.json manifest + 48 vendor files, normalizes flat extracted records -> CatalogTool[], feeds addTools(). Revives ~20 dormant *-extracted.json (accupro/korloy/ma-ford/yg1/camfix/flash had 0 refs before). R12 finding: manifest (gen 2026-04-16) declares 51,336 but osg re-extracted 42->11,550 -> real corpus 62,727. Loader reads files not stale count.

Wired prism_calc:tool_catalog_load_corpus + tool_catalog_corpus_stats. Tests: 15/15 engine (real-data invariant normalized+skipped===read, no fabrication) + 3/3 dispatcher round-trip. 39/39 total green, no regression.

3-of-3 scrutiny fixes folded in: (1) removed 3 contaminating enum-only actions absorbed from shared tree (gwizard_compare/sfc_tri_compare/sfc_baseline_compare — 0 handlers, 404 on call, not romeo's work); (2) fixed corpusStats().runtimeLoaded reading stats().total (returns total_tools) -> was hard-wired 0; +regression-guard test.
```

## Files touched (6)
- mcp-server/src/__tests__/CatalogCorpusLoaderEngine.test.ts |  15 ++++++++-
- mcp-server/src/engines/CatalogCorpusLoaderEngine.ts        |   7 +++--
- mcp-server/src/tools/dispatchers/calcDispatcher.ts         |   6 ----
- scripts/obsidian-memory-sync.mjs                           |  69 +++++++++++++++++++++++++++++++++++++++--
- scripts/obsidian-memory-sync.resilience.test.mjs           | 120 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 5 files changed, 205 insertions(+), 12 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 521d5f63b4a2`
- Milestone envelope: `mcp-server/data/milestones/CATALOG-APP-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._