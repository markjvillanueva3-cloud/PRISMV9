# SYSTEM-VIZ/U-VIZ-POSTMERGE-CAPSAFE — [MAIN] [SYSTEM-VIZ]/U-VIZ-POSTMERGE-CAPSAFE (slot:sierra): 4 post-merge stages (repair-graph-engine-classification, dedup-graph-nodes, reparent-viz-categories, add-parent-contains-edges) wrote the graph via fs.writeFileSync(GRAPH, JSON.stringify(G)) -> threw RangeError 'Invalid string length' once the graph crossed V8's 512MiB cap. THE root cause of golf's >630MB regen failure + the regen failed=5 (4 of 5). Migrated all 4 to writeGraphStreamingAtomic (per-element + atomic cap-safe writer; reads were already cap-safe via readGraphStreaming). LIVE-VALIDATED: all 4 exit 0 on the 660MB graph (repair was RangeError), integrity preserved 335,159 nodes/685,850 edges. Completes the system-viz pipeline green end-to-end at >512MiB.

**Commit:** `80f8059cb1c2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T02:54:05-05:00
**Tags:** system-viz, u-viz-postmerge-capsafe, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ]/U-VIZ-POSTMERGE-CAPSAFE (slot:sierra): 4 post-merge stages (repair-graph-engine-classification, dedup-graph-nodes, reparent-viz-categories, add-parent-contains-edges) wrote the graph via fs.writeFileSync(GRAPH, JSON.stringify(G)) -> threw RangeError 'Invalid string length' once the graph crossed V8's 512MiB cap. THE root cause of golf's >630MB regen failure + the regen failed=5 (4 of 5). Migrated all 4 to writeGraphStreamingAtomic (per-element + atomic cap-safe writer; reads were already cap-safe via readGraphStreaming). LIVE-VALIDATED: all 4 exit 0 on the 660MB graph (repair was RangeError), integrity preserved 335,159 nodes/685,850 edges. Completes the system-viz pipeline green end-to-end at >512MiB.

## Body
```
[MAIN] [SYSTEM-VIZ]/U-VIZ-POSTMERGE-CAPSAFE (slot:sierra): 4 post-merge stages (repair-graph-engine-classification, dedup-graph-nodes, reparent-viz-categories, add-parent-contains-edges) wrote the graph via fs.writeFileSync(GRAPH, JSON.stringify(G)) -> threw RangeError 'Invalid string length' once the graph crossed V8's 512MiB cap. THE root cause of golf's >630MB regen failure + the regen failed=5 (4 of 5). Migrated all 4 to writeGraphStreamingAtomic (per-element + atomic cap-safe writer; reads were already cap-safe via readGraphStreaming). LIVE-VALIDATED: all 4 exit 0 on the 660MB graph (repair was RangeError), integrity preserved 335,159 nodes/685,850 edges. Completes the system-viz pipeline green end-to-end at >512MiB.
```

## Files touched (5)
- scripts/add-parent-contains-edges.mjs          | Bin 3740 -> 4004 bytes
- scripts/dedup-graph-nodes.mjs                  |   4 ++--
- scripts/repair-graph-engine-classification.mjs |   4 ++--
- scripts/reparent-viz-categories.mjs            |   4 ++--
- 4 files changed, 6 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 80f8059cb1c2`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._