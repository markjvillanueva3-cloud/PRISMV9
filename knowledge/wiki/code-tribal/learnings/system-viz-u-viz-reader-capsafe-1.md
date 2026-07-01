# SYSTEM-VIZ/U-VIZ-READER-CAPSAFE-1 — [MAIN] [SYSTEM-VIZ]/U-VIZ-READER-CAPSAFE-1 (slot:sierra): 2 of 9 cap-unsafe graph READERS fixed (the regen-pipeline ones). generate-milestone-envelope-atomic + generate-executive-briefing read system-graph via JSON.parse(readFileSync utf8) -> threw Invalid-string-length at >512MiB; milestone-envelope caught it (graph-parse-failed) + wrote a 0.00MB EMPTY augmentation every regen. Migrated both to readGraphStreaming (off-heap, cap-safe). LIVE: milestone-envelope now reads the 660MB graph (envelopes scanned 752, was graph-parse-failed early-abort); steady-state emits 0 (milestones already in graph -> proves full read). Remaining 7 readers (leverage-ranked-wiring-queue, master-index-search-lib, namespace-churn-ranker, regen-wiki-from-viz head-slice, seed-ghost-nodes, system-viz-node-dispatch, system-viz-type-backfill) = documented sweep (core search-lib needs careful fresh-ctx + retest). Corrects my earlier false 'all merged-graph I/O cap-safe' over-claim.

**Commit:** `d03d8687a760` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T03:27:18-05:00
**Tags:** system-viz, u-viz-reader-capsafe-1, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ]/U-VIZ-READER-CAPSAFE-1 (slot:sierra): 2 of 9 cap-unsafe graph READERS fixed (the regen-pipeline ones). generate-milestone-envelope-atomic + generate-executive-briefing read system-graph via JSON.parse(readFileSync utf8) -> threw Invalid-string-length at >512MiB; milestone-envelope caught it (graph-parse-failed) + wrote a 0.00MB EMPTY augmentation every regen. Migrated both to readGraphStreaming (off-heap, cap-safe). LIVE: milestone-envelope now reads the 660MB graph (envelopes scanned 752, was graph-parse-failed early-abort); steady-state emits 0 (milestones already in graph -> proves full read). Remaining 7 readers (leverage-ranked-wiring-queue, master-index-search-lib, namespace-churn-ranker, regen-wiki-from-viz head-slice, seed-ghost-nodes, system-viz-node-dispatch, system-viz-type-backfill) = documented sweep (core search-lib needs careful fresh-ctx + retest). Corrects my earlier false 'all merged-graph I/O cap-safe' over-claim.

## Body
```
[MAIN] [SYSTEM-VIZ]/U-VIZ-READER-CAPSAFE-1 (slot:sierra): 2 of 9 cap-unsafe graph READERS fixed (the regen-pipeline ones). generate-milestone-envelope-atomic + generate-executive-briefing read system-graph via JSON.parse(readFileSync utf8) -> threw Invalid-string-length at >512MiB; milestone-envelope caught it (graph-parse-failed) + wrote a 0.00MB EMPTY augmentation every regen. Migrated both to readGraphStreaming (off-heap, cap-safe). LIVE: milestone-envelope now reads the 660MB graph (envelopes scanned 752, was graph-parse-failed early-abort); steady-state emits 0 (milestones already in graph -> proves full read). Remaining 7 readers (leverage-ranked-wiring-queue, master-index-search-lib, namespace-churn-ranker, regen-wiki-from-viz head-slice, seed-ghost-nodes, system-viz-node-dispatch, system-viz-type-backfill) = documented sweep (core search-lib needs careful fresh-ctx + retest). Corrects my earlier false 'all merged-graph I/O cap-safe' over-claim.
```

## Files touched (3)
- scripts/generate-executive-briefing.mjs        | 4 ++--
- scripts/generate-milestone-envelope-atomic.mjs | 3 ++-
- 2 files changed, 4 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d03d8687a760`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._