# CATALOG-APP-WIRING-MS0/U-CAM-CORPUS-FEED-U3-U6 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CAM-CORPUS-FEED-U3-U6 (slot:romeo): wire the 62.7K corpus into all 4 CAM app exporters (Fusion/Mastercam/hyperMILL/Inventor) + fix the search() 20-cap that hid it

**Commit:** `7c182b38b2da` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T11:37:55-05:00
**Tags:** catalog-app-wiring-ms0, u-cam-corpus-feed-u3-u6, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CAM-CORPUS-FEED-U3-U6 (slot:romeo): wire the 62.7K corpus into all 4 CAM app exporters (Fusion/Mastercam/hyperMILL/Inventor) + fix the search() 20-cap that hid it

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CAM-CORPUS-FEED-U3-U6 (slot:romeo): wire the 62.7K corpus into all 4 CAM app exporters (Fusion/Mastercam/hyperMILL/Inventor) + fix the search() 20-cap that hid it

Adds CatalogCorpusLoaderEngine.ensureLoaded() — idempotent, fail-soft, once-per-process lazy feed. Every CAM export case (fusion_export_tool_library, mastercam_tool_export, hypermill_tool_export, inventor_tool_export) now calls ensureLoaded() before querying the catalog, so exports always see the full 62.7K corpus without a manual tool_catalog_load_corpus call.

REAL BUG fixed (R12, caught by the round-trip test): toolCatalogEngine.search() defaults max_results to 20. fusion_export_tool_library called search() without max_results, so even with the corpus loaded the export silently capped at 20 tools. Now passes limit (or 100k ceiling) THROUGH to search. Full export went 20 -> corpus-scale (>1000).

Tests: ensureLoaded idempotency (16/16 engine) + 3/3 dispatcher round-trip proving a previously-dormant vendor (Accupro, 0 refs before U1) now exports + full-catalog returns >1000 not 20. 43/43 green.
```

## Files touched (5)
- mcp-server/src/__tests__/CatalogCorpusLoaderEngine.test.ts |    17 +
- mcp-server/src/__tests__/cam-corpus-export-wire.test.ts    |    72 +
- mcp-server/src/engines/CatalogCorpusLoaderEngine.ts        |    33 +
- mcp-server/src/tools/dispatchers/camDispatcher.ts          | 41186 +++++++++++++++++++++++++++++++++++----------------------------------
- 4 files changed, 20725 insertions(+), 20583 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7c182b38b2da`
- Milestone envelope: `mcp-server/data/milestones/CATALOG-APP-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._