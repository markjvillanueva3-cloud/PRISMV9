# TOOL-LIBRARIES/U-CORPUS-DEDUP — [MAIN-FORCE] [TOOL-LIBRARIES]/U-CORPUS-DEDUP (slot:romeo): record-level dedup + load richer Jun-12 sources -- fixes 22K duplicate tools

**Commit:** `d47fa53d0957` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T09:30:36-05:00
**Tags:** tool-libraries, u-corpus-dedup, auto-distilled

## Subject
[MAIN-FORCE] [TOOL-LIBRARIES]/U-CORPUS-DEDUP (slot:romeo): record-level dedup + load richer Jun-12 sources -- fixes 22K duplicate tools

## Body
```
[MAIN-FORCE] [TOOL-LIBRARIES]/U-CORPUS-DEDUP (slot:romeo): record-level dedup + load richer Jun-12 sources -- fixes 22K duplicate tools

Iter 11 -- a real correctness fix found while closing the insert-source gap.

DISCOVERY GAP: the loader matched -tools.json/-extracted.json but MISSED the richer Jun-12
normalized *-turning/*-rotating/*-milling.json (e.g. kennametal-turning.json carries 806 real
ic_mm inserts the sparse -extracted lacked). INCLUDE_RE now matches them.

DOUBLE-COUNT BUG: brand-specific files + aggregate files (indexable-tools/additional-tools/
hsm-advisor) overlap heavily -- the same tool (brand|catalog-number) was emitted MULTIPLE times.
The shipped libraries carried ~22K duplicate tools per format. A first attempt at FILE-level
'prefer non-extracted' dedup was WRONG (verified: ampc-tools.json parses to 0 records;
kennametal rich+extracted are COMPLEMENTARY, 0 id-overlap) -> replaced with RECORD-level dedup
(key brand|id, keep the geometry-complete copy). Conflicts audited: the 557 brand|id collisions
are overwhelmingly null-vs-rich for the SAME tool (resolved correctly) -- a real value-conflict
is rare and brand-separated.

RESULT (live): 97,764 -> 72,406 unique records (31,139 true duplicates dropped); emitted tools
61,246 -> 38,774 unique PER FORMAT; inserts 145 -> 1,459 (10x, real ISO ic). All 4 formats
validate, full cron cycle exit 0, deduped libraries re-placed into the seats.

Tests: normalizer 28/28 (+dedup: true-dup collapse / complementary kept / prefer-complete).
```

## Files touched (7)
- scripts/lib/brand-tool-catalog.mjs                          |  27 +++++++-
- scripts/lib/brand-tool-catalog.test.mjs                     |  26 +++++++
- state/shared/tool-libraries/fusion/MANIFEST.json            | 126 +++++++++++++++++-----------------
- state/shared/tool-libraries/hypermill/MANIFEST.json         | 126 +++++++++++++++++-----------------
- state/shared/tool-libraries/mastercam-inserts/MANIFEST.json |  23 +++++--
- state/shared/tool-libraries/mastercam/MANIFEST.json         | 126 +++++++++++++++++-----------------
- 6 files changed, 256 insertions(+), 198 deletions(-)

## Lessons surfaced in commit body
- WRONG (verified: ampc-tools.json parses to 0 records;

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d47fa53d0957`
- Milestone envelope: `mcp-server/data/milestones/TOOL-LIBRARIES.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._