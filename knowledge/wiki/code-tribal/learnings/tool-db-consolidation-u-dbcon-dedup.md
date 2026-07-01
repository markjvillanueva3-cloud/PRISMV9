# TOOL-DB-CONSOLIDATION/U-DBCON-DEDUP — [MAIN] [MAIN-FORCE] [TOOL-DB-CONSOLIDATION]/U-DBCON-DEDUP (slot:romeo): drop 17,389 redundant corpus duplicates (160,596 -> 143,207 distinct)

**Commit:** `9656d24b1421` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T14:45:20-05:00
**Tags:** tool-db-consolidation, u-dbcon-dedup, auto-distilled

## Subject
[MAIN] [MAIN-FORCE] [TOOL-DB-CONSOLIDATION]/U-DBCON-DEDUP (slot:romeo): drop 17,389 redundant corpus duplicates (160,596 -> 143,207 distinct)

## Body
```
[MAIN] [MAIN-FORCE] [TOOL-DB-CONSOLIDATION]/U-DBCON-DEDUP (slot:romeo): drop 17,389 redundant corpus duplicates (160,596 -> 143,207 distinct)

PROBLEM (G1 follow-up): the unified ToolCatalogEngine corpus (160,596) was
inflated by exact duplicates. Three *-extracted.json files (osg/guhring/sandvik)
are 100%-redundant data-twins of their RICHER .ts-getter caches (osg-tools.json
etc.): verified identical row count + 100% edp/part-number overlap + identical
present-geometry. The getter copy additionally computes per-ISO cutting_data.
The two pipelines assign different synthetic ids to the same physical tool, so
addTools id-dedup missed them -> 17,389 double-counted (osg 11,550 + guhring
3,421 + sandvik 2,418).

FIX: documented REDUNDANT_EXTRACTED Set of those 3 filenames, filtered out in
load(); the richer getter copy wins. The exclusion is SURFACED in the result
(excludedRedundant + excludedRedundantDeclared), never silent, with the integrity
invariant sum(perFile.read) + excludedRedundantDeclared === declaredTotal.

A general natural-key dedup was tried and REVERTED: divergent geometry defaulting
between the pipelines made a geometry key under-catch and a coarse key over-merge
length/flute variants. The exact file exclusion is the verified-safe fix;
ToolCatalogEngine.ts is net-zero. The broader additional-tools<->corpus overlap
(Accupro/Flash/YG-1) is a documented LARGER follow-up unit, not touched here.

VERIFY:
- unified total_tools 160,596 -> 143,207; corpus filesProcessed 51->48,
  toolsNormalized 67,178->49,789 (exactly -17,389).
- CatalogCorpusLoaderEngine.test.ts 17/17 (new exclusion guard pins the 3
  filenames + excludedRedundantDeclared===17,389 + perFile-absence).
- ToolCatalogCoverage + Adaptive 39/39 (no regression). build:fast exit 0.
- Per-file scrutiny: 2 reviewers PASS 0 P0/P1 (P2 search-cap hardened to 50k).
```

## Files touched (3)
- mcp-server/src/__tests__/CatalogCorpusLoaderEngine.test.ts | 51 +++++++++++++++++++++++++++++++++++++++++++--------
- mcp-server/src/engines/CatalogCorpusLoaderEngine.ts        | 32 +++++++++++++++++++++++++++++++-
- 2 files changed, 74 insertions(+), 9 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9656d24b1421`
- Milestone envelope: `mcp-server/data/milestones/TOOL-DB-CONSOLIDATION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._