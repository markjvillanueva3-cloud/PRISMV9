# CATALOG-APP-WIRING-MS0/U-CATALOG-CORPUS-LOADER-SCRUTINY-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CATALOG-CORPUS-LOADER-SCRUTINY-FIX (slot:romeo): close 3-of-3 scrutiny findings on the catalog-corpus keystone

**Commit:** `a44345e90f55` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T11:22:45-05:00
**Tags:** catalog-app-wiring-ms0, u-catalog-corpus-loader-scrutiny-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CATALOG-CORPUS-LOADER-SCRUTINY-FIX (slot:romeo): close 3-of-3 scrutiny findings on the catalog-corpus keystone

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CATALOG-CORPUS-LOADER-SCRUTINY-FIX (slot:romeo): close 3-of-3 scrutiny findings on the catalog-corpus keystone

Forward-only follow-up to aca389cc97 (peer commits stacked on top; rewriting would disrupt committed peer work).

Fix 1 (P0, scope contamination): aca389cc97 absorbed 3 enum-only actions from the shared tree — gwizard_compare / sfc_tri_compare / sfc_baseline_compare — with ZERO case handlers (404 on call). Not romeo's work (OSCAR-SFC-3WAY-MS0). Removed from calcDispatcher z.enum.

Fix 2 (P1, silent-wrong stat): corpusStats() read stats().total but the method returns total_tools -> runtimeLoaded hard-wired 0 even after a full load. Now reads total_tools + regression-guard test (rises by exactly the fed count; fails if reverted).

39/39 tests green. Reviewers B+C PASS round 2; A's obsidian-absorption note resolved by this clean 3-file forward commit.
```

## Files touched (5)
- mcp-server/src/__tests__/CatalogCorpusLoaderEngine.test.ts |   15 +-
- mcp-server/src/engines/CatalogCorpusLoaderEngine.ts        |    7 +-
- mcp-server/src/tools/dispatchers/calcDispatcher.ts         |    6 -
- state/shared/.wiki-tribal-cross-ref-audit.json             | 6428 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 6447 insertions(+), 9 deletions(-)

## Lessons surfaced in commit body
- wrong stat): corpusStats() read stats().total but the method returns total_tools -> runtimeLoaded hard-wired 0 even after a full load. Now reads total_tools + regression-guard test (rises by exactly the fed count; fails if reverted).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a44345e90f55`
- Milestone envelope: `mcp-server/data/milestones/CATALOG-APP-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._