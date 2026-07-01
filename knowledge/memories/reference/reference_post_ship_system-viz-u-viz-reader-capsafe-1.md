---
name: reference_post_ship_system-viz-u-viz-reader-capsafe-1
description: Auto-distilled learnings from shipping SYSTEM-VIZ/U-VIZ-READER-CAPSAFE-1 (commit d03d8687a). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.069Z
aliases: reference_post_ship_system-viz-u-viz-reader-capsafe-1
---


# SYSTEM-VIZ/U-VIZ-READER-CAPSAFE-1

[MAIN] [SYSTEM-VIZ]/U-VIZ-READER-CAPSAFE-1 (slot:sierra): 2 of 9 cap-unsafe graph READERS fixed (the regen-pipeline ones). generate-milestone-envelope-atomic + generate-executive-briefing read system-graph via JSON.parse(readFileSync utf8) -> threw Invalid-string-length at >512MiB; milestone-envelope caught it (graph-parse-failed) + wrote a 0.00MB EMPTY augmentation every regen. Migrated both to readGraphStreaming (off-heap, cap-safe). LIVE: milestone-envelope now reads the 660MB graph (envelopes scanned 752, was graph-parse-failed early-abort); steady-state emits 0 (milestones already in graph -> proves full read). Remaining 7 readers (leverage-ranked-wiring-queue, master-index-search-lib, namespace-churn-ranker, regen-wiki-from-viz head-slice, seed-ghost-nodes, system-viz-node-dispatch, system-viz-type-backfill) = documented sweep (core search-lib needs careful fresh-ctx + retest). Corrects my earlier false 'all merged-graph I/O cap-safe' over-claim.

**Shipped:** 2026-06-10T03:27:18-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[system-viz-u-viz-reader-capsafe-1]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._