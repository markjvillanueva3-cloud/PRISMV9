# TOOL-DB-CONSOLIDATION/U-DBCON-DEDUP-FIX — [MAIN] [MAIN-FORCE] [TOOL-DB-CONSOLIDATION]/U-DBCON-DEDUP-FIX (slot:romeo): sibling test floor + stale 62.7K doc refs after dedup

**Commit:** `1b7150d30db8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T14:56:10-05:00
**Tags:** tool-db-consolidation, u-dbcon-dedup-fix, auto-distilled

## Subject
[MAIN] [MAIN-FORCE] [TOOL-DB-CONSOLIDATION]/U-DBCON-DEDUP-FIX (slot:romeo): sibling test floor + stale 62.7K doc refs after dedup

## Body
```
[MAIN] [MAIN-FORCE] [TOOL-DB-CONSOLIDATION]/U-DBCON-DEDUP-FIX (slot:romeo): sibling test floor + stale 62.7K doc refs after dedup

Follow-up to U-DBCON-DEDUP (9656d24b14), caught by 3-of-3 arm-C scrutiny (a P1
the 2 per-file reviewers missed because it lives outside the diff):

- calc-actions.test.ts: the tool_catalog_load_corpus dispatcher round-trip
  asserted toolsNormalized >= 60_000 on the SAME load() path the dedup reduced to
  49,789 -> live FAIL. Updated to >= 45_000 (mirrors CatalogCorpusLoaderEngine.test.ts;
  meaningful floor above the real deduped size, NOT weakened to pass). Title fixed.
- Stale "~62.7K" doc comments updated to the deduped reality: CatalogCorpusLoaderEngine
  header (67,178 manifest entries) + ensureLoaded() doc (~143K unified / ~49.8K corpus)
  + calcDispatcher tool_catalog_load_corpus comment (~49.8K deduped).

VERIFY: calc-actions.test.ts 24/24; build:fast exit 0. No behavior change (test
floor + doc comments only). The toolsNormalized+skipped===totalRead invariant at
calc-actions.test.ts:494 still holds (excluded twins absent from perFile).
```

## Files touched (4)
- mcp-server/src/__tests__/calc-actions.test.ts       | 7 +++++--
- mcp-server/src/engines/CatalogCorpusLoaderEngine.ts | 7 ++++---
- mcp-server/src/tools/dispatchers/calcDispatcher.ts  | 3 ++-
- 3 files changed, 11 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- till holds (excluded twins absent from perFile).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1b7150d30db8`
- Milestone envelope: `mcp-server/data/milestones/TOOL-DB-CONSOLIDATION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._