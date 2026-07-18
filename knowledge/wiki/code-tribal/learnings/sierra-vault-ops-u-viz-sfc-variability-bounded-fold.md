# SIERRA-VAULT-OPS/U-VIZ-SFC-VARIABILITY-BOUNDED-FOLD — [MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VIZ-SFC-VARIABILITY-BOUNDED-FOLD (slot:sierra): surface the sfc-variability roost in /system-viz via a bounded fold (9 structural nodes; 50K raw cells aggregated-not-folded)

**Commit:** `63b150c158ab` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T10:24:27-05:00
**Tags:** sierra-vault-ops, u-viz-sfc-variability-bounded-fold, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VIZ-SFC-VARIABILITY-BOUNDED-FOLD (slot:sierra): surface the sfc-variability roost in /system-viz via a bounded fold (9 structural nodes; 50K raw cells aggregated-not-folded)

## Body
```
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VIZ-SFC-VARIABILITY-BOUNDED-FOLD (slot:sierra): surface the sfc-variability roost in /system-viz via a bounded fold (9 structural nodes; 50K raw cells aggregated-not-folded)

The sfc-variability augmentation (45MB / 50,009 nodes: 8 ghost roosts + 1 machine-type
+ 50,000 raw sfc-cell matrix cells + 100,007 edges) was DELIBERATELY never wired into
the merged graph -- folding 50K cells would ~double the 834MB fleet-critical search
graph (merge-OOM / V8 string-cap class). So the SFC-variability surface was invisible in
/system-viz + master-index.

generate-sfc-variability-summary.mjs condenses it to a BOUNDED summary
(sfc-variability-summary-augmentation.json, ~3KB): keeps the 9 STRUCTURAL nodes + their
7 inter-edges, DROPS the 50K raw cells (annotating roost.metadata.cellsAggregated=50000 --
explicit, never silent, R12). Emits the standard {newNodes,newEdges,generatedAt} shape;
merge folds it via the proven foldRoostAug (ADD-only, dedup, dangler-drop). Wired into
regen-viz FAST[] + merge-augmentations loadOptional+foldRoostAug (both-or-neither; the
dual-registration auditor stays at 0 gaps).

Tests: generate-sfc-variability-summary.test.mjs 6/6 (cell-drop, roost-annotation,
edge-pruning, no-input-mutation, empty/null, cap=N sampling).
LIVE-verified at merge level: after a regen, the merged graph contains the node
"id":"ghost.sfc-machine-types" + G.meta.sfcVariabilitySummary, and master-index surfaces
"SFC Machine Types". Generator run: kept 9 nodes / 7 edges, dropped 50000 cells.

NOTE (R12, pre-existing fleet issue, NOT this change): the regen success stamp is
currently stuck ~5h stale -- regens run the merge (graph rewrites + my fold lands) but
the POST-merge stages crash/are-interrupted before .last-successful-regen.json updates.
This affects the SCHEDULED regen too (independent of this commit). Heavy regen completion
is environmentally blocked in a busy 26-chat loop session (the documented "route heavy
graph ops away from loop sessions"). Flagged for a quiesced-fleet session.
```

## Files touched (5)
- scripts/generate-sfc-variability-summary.mjs      | 146 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/generate-sfc-variability-summary.test.mjs |  90 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/merge-augmentations.mjs                   |   2 ++
- scripts/regen-viz.mjs                             |   1 +
- 4 files changed, 239 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 63b150c158ab`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._