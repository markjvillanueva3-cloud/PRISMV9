# CORPUS-CUTTING-CORPUS/U-CORPUS-ACCOUNT — [MAIN-FORCE] [CORPUS-CUTTING-CORPUS]/U-CORPUS-ACCOUNT (slot:romeo): account ALL 118,409 tools + 1,164 holders x 14 materials x toolpaths

**Commit:** `e36c307b5f55` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T22:07:20-05:00
**Tags:** corpus-cutting-corpus, u-corpus-account, auto-distilled

## Subject
[MAIN-FORCE] [CORPUS-CUTTING-CORPUS]/U-CORPUS-ACCOUNT (slot:romeo): account ALL 118,409 tools + 1,164 holders x 14 materials x toolpaths

## Body
```
[MAIN-FORCE] [CORPUS-CUTTING-CORPUS]/U-CORPUS-ACCOUNT (slot:romeo): account ALL 118,409 tools + 1,164 holders x 14 materials x toolpaths

Operator: "run continuous loops until all tools and tool holders in our
databases are accounted for, for all materials with cutting parameters for
different tool paths in each material."

Deterministic harness (generate-corpus-cutting-corpus.ts) runs the shared JM
condition matrix over the WHOLE unified ToolCatalogEngine corpus:
  - 118,409 / 118,409 tools accounted (100%); 1,164 holders -> 119,573 total
  - 7,151,954 cutting presets (P/M/K/N/S/H), JM inch view, vc=SFM feed=IPM
  - 17,720 dia=0 tools enumerated (ACCOUNTED-NO-GEOMETRY); 356 grade-gated
  - ISO gated by each tool's vendor-declared iso_groups (all materials rated),
    else substrate coating heuristic -- fixes N/S/H undercoverage

New: corpus-tool-adapter (corpus->matrix shape, +14 tests), conditionMatrix
isoAllow param + deterministic memo (backward-compatible), ToolCatalogEngine
.getAllHolders() union accessor. The ~1.2GB by-group CSVs are gitignored
(deterministically regenerable); ledger + samples + holders committed.

Also restores the all-conditions JM Fusion crib (committed CSV was a stale
2437-line roughing-only twin against the 719-line all-conditions generator;
regenerated to 4924 rows -> oracle test jm-tool-condition-matrix.test.ts green).

Tests: 24 matrix+adapter, 29 ToolCatalogEngine/export, tsc 0 errors.
```

## Files touched (69)
- .gitignore                                                                                               |     5 +
- mcp-server/scripts/analyze-corpus-cam-coverage.ts                                                        |    67 +
- mcp-server/scripts/generate-corpus-cutting-corpus.ts                                                     |   210 +
- mcp-server/scripts/lib/corpus-tool-adapter.test.ts                                                       |   106 +
- mcp-server/scripts/lib/corpus-tool-adapter.ts                                                            |   132 +
- mcp-server/scripts/lib/jm-tool-condition-matrix.ts                                                       |   530 +++
- mcp-server/scripts/probe-corpus-tool-shape.ts                                                            |    25 +
- mcp-server/src/engines/ToolCatalogEngine.ts                                                              |    58 +
- state/shared/corpus-cutting-data/ACCOUNTED-NO-GEOMETRY.csv                                               | 17721 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/corpus-cutting-data/COVERAGE-LEDGER.json                                                    |    48 +
_(+59 more)_

## Lessons surfaced in commit body
- til all tools and tool holders in our

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e36c307b5f55`
- Milestone envelope: `mcp-server/data/milestones/CORPUS-CUTTING-CORPUS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._