# TOOL-DB-CONSOLIDATION/U-DBCON-1 — [MAIN] [MAIN-FORCE] [TOOL-DB-CONSOLIDATION]/U-DBCON-1 (slot:romeo): record-aware catalog merge -- route 3 orphaned vendor files into CATALOG_INDEX (+4451 tools)

**Commit:** `4d0a096edcb6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T10:31:43-05:00
**Tags:** tool-db-consolidation, u-dbcon-1, auto-distilled

## Subject
[MAIN] [MAIN-FORCE] [TOOL-DB-CONSOLIDATION]/U-DBCON-1 (slot:romeo): record-aware catalog merge -- route 3 orphaned vendor files into CATALOG_INDEX (+4451 tools)

## Body
```
[MAIN] [MAIN-FORCE] [TOOL-DB-CONSOLIDATION]/U-DBCON-1 (slot:romeo): record-aware catalog merge -- route 3 orphaned vendor files into CATALOG_INDEX (+4451 tools)

Operator: 'route them into the main catalog index and all other nodes they need
to be wired to.' Fleet infra (corpus loader + canonical index are read system-wide;
CatalogCorpusLoaderEngine post-dates slot/romeo's base -> belongs on main).

ROOT-CAUSE FIX (verified delta=0 on the existing 62,727): both
CatalogCorpusLoaderEngine.readVendorFile AND regenerate-catalog-index.countRecords
read a non-array catalog via Object.values(data).find(isArray) -- ONLY the FIRST
nested array -- so multi-section insert catalogs silently undercounted. NOW
RECORD-AWARE: merge every array whose elements carry designation/part_number;
EXCLUDE non-record arrays (speed_feed_data, cutting_conditions, summary). KEEP-IN-SYNC
across the two copies (.ts engine + .mjs script, different runtimes).

GENERATOR also gained auto-discovery: regenerate-catalog-index.mjs now scans
src/data for *-extracted.json absent from the manifest and routes them in with
inferred manufacturer/type (so hand-list drift can't re-orphan a file).

ROUTED (3 orphans, recounted record-aware):
- tungaloy-tooling-extracted.json  Tungaloy holders   356
- tungaloy-turning-extracted.json  Tungaloy inserts  2973  (was 2561; +412 threading+grooving)
- widia-2022-extracted.json        Widia    inserts  1122  (was  613; +509, speed_feed_data excluded)
CATALOG_INDEX: 48->51 files, 62,727->67,178 entries (+4,451). byManufacturer
Tungaloy 6->8 files, Widia new.

VERIFIED: regression test 7/7 (scripts/__tests__/regenerate-catalog-index.test.mjs --
real orphan counts + speed_feed_data exclusion + back-compat fallback); generator
dry-run delta=+4451 with 0 drift on existing files; loader imports/compiles clean.
Additive + safe: live system gains 4,451 real tools, zero existing-record change.

Next (U-DBCON-2): route the .ts-only vendors (per-vendor dedup vs the JSON cache;
dev/prod split-brain per reference_catalog_dev_prod_split_brain_2026_06_08).
```

## Files touched (5)
- mcp-server/data/CATALOG_INDEX.json                             | 32 ++++++++++++++++++++++++++-----
- mcp-server/scripts/__tests__/regenerate-catalog-index.test.mjs | 64 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/scripts/regenerate-catalog-index.mjs                | 71 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++-----------
- mcp-server/src/engines/CatalogCorpusLoaderEngine.ts            | 22 ++++++++++++++++++---
- 4 files changed, 170 insertions(+), 19 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4d0a096edcb6`
- Milestone envelope: `mcp-server/data/milestones/TOOL-DB-CONSOLIDATION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._