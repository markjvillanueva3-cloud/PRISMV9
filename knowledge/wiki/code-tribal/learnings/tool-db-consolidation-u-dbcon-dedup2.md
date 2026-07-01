# TOOL-DB-CONSOLIDATION/U-DBCON-DEDUP2 — [MAIN] [MAIN-FORCE] [TOOL-DB-CONSOLIDATION]/U-DBCON-DEDUP2 (slot:romeo): extend REDUNDANT_EXTRACTED to 20 verified twins (143,207 -> 118,409 distinct)

**Commit:** `002cbb88cbc2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T20:15:03-05:00
**Tags:** tool-db-consolidation, u-dbcon-dedup2, auto-distilled

## Subject
[MAIN] [MAIN-FORCE] [TOOL-DB-CONSOLIDATION]/U-DBCON-DEDUP2 (slot:romeo): extend REDUNDANT_EXTRACTED to 20 verified twins (143,207 -> 118,409 distinct)

## Body
```
[MAIN] [MAIN-FORCE] [TOOL-DB-CONSOLIDATION]/U-DBCON-DEDUP2 (slot:romeo): extend REDUNDANT_EXTRACTED to 20 verified twins (143,207 -> 118,409 distinct)

PROBLEM (completes U-DBCON-DEDUP): U-DBCON-DEDUP removed 3 obvious twins
(osg/guhring/sandvik). A principled sweep found 17 MORE *-extracted.json files
that are 100%-redundant with a .ts-getter cache already loaded as standard tools
(additional-tools / indexable-tools / kennametal-turning / ampc caches
re-extracted as standalone corpus files): yg1, iscar(+turning), accupro, flash,
kennametal(turning/holemaking/milling/threading), korloy(+rotating/turning),
camfix, ampc, rapidkut, ma-ford, unknown_solid. Loading them double-counted
24,798 identical tools on top of the original 17,389 = 42,187 total dups.

DETECTION (scripts/analyze-corpus-redundancy.mjs, new): each corpus file's
part-number keys are compared to the union of the 13 loaded cache files, AND the
matched twins are geometry-cross-checked (same cutting diameter) so a part-number
STRING collision across vendors is NOT mistaken for a twin (e.g. tungaloy-turning
= 89.1% partial -> correctly KEPT; its unique tools survive). A field-richness
sample confirmed the cache copy is equal-or-richer (adds shank/manufacturer +
getters compute per-ISO cutting_data), so the getter wins and the twin is skipped
with no data loss. All 13 backing getters verified invoked in _loadStandardTools.

VERIFY:
- unified total_tools 143,207 -> 118,409 (npx tsx scripts/verify-unified-corpus-total.ts);
  corpus filesProcessed 48->31, toolsNormalized 49,789->24,991 (exactly -24,798).
- excludedRedundant = 20 files, excludedRedundantDeclared = 42,187 (pinned by guard test).
- 93/93 across CatalogCorpusLoaderEngine + calc-actions + sfc-catalog-id-resolve +
  cam-corpus-export-wire + CamToolExportFullCatalog + CamToolTreesGenerate +
  ToolCatalogCoverage. build:fast exit 0.
- Tests repointed off now-excluded vendors to genuinely corpus-only ones
  (Seco/Widia/Big Daishowa) -- intent preserved, not weakened (R9).
```

## Files touched (6)
- mcp-server/scripts/analyze-corpus-redundancy.mjs           | 124 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/CatalogCorpusLoaderEngine.test.ts | 111 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-------------------------------------------
- mcp-server/src/__tests__/calc-actions.test.ts              |  15 ++++++++-------
- mcp-server/src/__tests__/sfc-catalog-id-resolve.test.ts    |  18 ++++++++++--------
- mcp-server/src/engines/CatalogCorpusLoaderEngine.ts        |  44 +++++++++++++++++++++++++++++++++----------
- 5 files changed, 243 insertions(+), 69 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 002cbb88cbc2`
- Milestone envelope: `mcp-server/data/milestones/TOOL-DB-CONSOLIDATION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._