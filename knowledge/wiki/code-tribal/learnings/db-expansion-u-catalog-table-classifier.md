# DB-EXPANSION/U-CATALOG-TABLE-CLASSIFIER — [MAIN] [DB-EXPANSION]/U-CATALOG-TABLE-CLASSIFIER: camelot-table type classifier (pre-normalizer gate) — verifiable core of catalog->cutting_data

**Commit:** `a927526c148d` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T21:44:57-05:00
**Tags:** db-expansion, u-catalog-table-classifier, auto-distilled

## Subject
[MAIN] [DB-EXPANSION]/U-CATALOG-TABLE-CLASSIFIER: camelot-table type classifier (pre-normalizer gate) — verifiable core of catalog->cutting_data

## Body
```
[MAIN] [DB-EXPANSION]/U-CATALOG-TABLE-CLASSIFIER: camelot-table type classifier (pre-normalizer gate) — verifiable core of catalog->cutting_data

Classifies camelot-extracted catalog tables -> cutting-data/geometry/index/other so the (next-unit) per-vendor normalizer only persists real speeds-feeds grids and NEVER fabricates cutting params from catalog index prose (operator never-poison bar).

Safety-first design (biased AGAINST the cutting-data false positive): (1) a category wins only with a STRONG-keyword hit (weak-only words cannot elect a verdict); (2) WORD-BOUNDARY matching (no 'ap' inside 'taper'); (3) only short label cells vote, long DESCRIPTION prose skipped; (4) wide header window clears title banners; (5) cuttingDataTables floored at conf>=0.15 + schemaVersion.

Validated on REAL camelot output: garr-recommended-sf -> 13 index, 0 cutting (correct, no false-positive); cgs-gp-speeds-feeds -> 1 cutting-data grid (correct positive). 25 node:test cases incl. 5 never-poison negatives + banner-offset + substring-trap + oversize. Per-file scrutiny: 2 reviewers FAIL(round1, 6 P0/P1) -> fix -> PASS(round2). Wired into db-toolbelt --run classify-tables.
```

## Files touched (4)
- scripts/db-toolbelt.mjs                       |   1 +
- scripts/lib/catalog-table-classifier.mjs      | 244 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/catalog-table-classifier.test.mjs | 228 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 473 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a927526c148d`
- Milestone envelope: `mcp-server/data/milestones/DB-EXPANSION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._