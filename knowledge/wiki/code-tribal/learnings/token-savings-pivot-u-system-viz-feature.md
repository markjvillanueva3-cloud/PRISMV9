# TOKEN-SAVINGS-PIVOT/U-SYSTEM-VIZ-FEATURE — [MAIN] [TOKEN-SAVINGS-PIVOT]/U-SYSTEM-VIZ-FEATURE (slot:alpha iter7): /system-viz roost for telemetry sidecar

**Commit:** `cd7738d0d184` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T18:50:45-05:00
**Tags:** token-savings-pivot, u-system-viz-feature, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-SYSTEM-VIZ-FEATURE (slot:alpha iter7): /system-viz roost for telemetry sidecar

## Body
```
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-SYSTEM-VIZ-FEATURE (slot:alpha iter7): /system-viz roost for telemetry sidecar

Closes follow-up #1 from iter-5 memory — registers TOKEN-SAVINGS-PIVOT
as a discoverable system-viz roost so it appears in /system-viz +
/master-index queries.

New files:
- scripts/generate-token-savings-pivot-features.mjs (pure generator,
  reads state/shared/mcp-route-suggest-stats.json, emits roost +
  per-classifier + per-tool children)
- scripts/generate-token-savings-pivot-features.test.mjs (7 tests:
  empty sidecar, full sidecar, dedupe, fail-soft on bad shape,
  sort order, Set existingNodeIds — 7/7 PASS)

Wiring:
- scripts/regen-viz.mjs FAST[] adds the generator after
  generate-misc-tasks-features.mjs (canonical neighbor)
- scripts/merge-augmentations.mjs: new loadOptional() entry, new
  versions.tokenSavingsPivot stamp, new splice block mirroring the
  miscTasks/priorityQueue/bridgeSynergy pattern (existingIds + edge
  dedup + G.meta.tokenSavingsPivot)

Output node layout:
  ghost.token_savings_pivot      L8 ghost-roost (under ghost.planned_features)
  ├ tsp.classifier.isBroadGrep   L9 tsp-classifier (1 fire)
  ├ tsp.classifier.isVerboseBash L9 tsp-classifier (N fires)
  ├ ... 7 more classifiers
  ├ tsp.tool.Bash                L9 tsp-tool (N fires)
  └ ... 8 more tools

Smoke from live sidecar (13 fires): roost + 5 classifier children +
6 tool children = 12 nodes total.

Generator output (token-savings-pivot-augmentation.json) is gitignored
per the existing system-viz/*-augmentation.json convention — it's a
deterministic artifact regenerated from the sidecar on every
regen-viz run.
```

## Files touched (5)
- scripts/generate-token-savings-pivot-features.mjs  | 176 +++++++++++++++++++++
- .../generate-token-savings-pivot-features.test.mjs |  93 +++++++++++
- scripts/merge-augmentations.mjs                    |  32 ++++
- scripts/regen-viz.mjs                              |   1 +
- 4 files changed, 302 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cd7738d0d184`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._