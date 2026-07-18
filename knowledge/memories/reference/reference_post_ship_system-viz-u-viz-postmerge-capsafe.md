---
name: reference_post_ship_system-viz-u-viz-postmerge-capsafe
description: Auto-distilled learnings from shipping SYSTEM-VIZ/U-VIZ-POSTMERGE-CAPSAFE (commit 80f8059cb). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.068Z
aliases: reference_post_ship_system-viz-u-viz-postmerge-capsafe
---


# SYSTEM-VIZ/U-VIZ-POSTMERGE-CAPSAFE

[MAIN] [SYSTEM-VIZ]/U-VIZ-POSTMERGE-CAPSAFE (slot:sierra): 4 post-merge stages (repair-graph-engine-classification, dedup-graph-nodes, reparent-viz-categories, add-parent-contains-edges) wrote the graph via fs.writeFileSync(GRAPH, JSON.stringify(G)) -> threw RangeError 'Invalid string length' once the graph crossed V8's 512MiB cap. THE root cause of golf's >630MB regen failure + the regen failed=5 (4 of 5). Migrated all 4 to writeGraphStreamingAtomic (per-element + atomic cap-safe writer; reads were already cap-safe via readGraphStreaming). LIVE-VALIDATED: all 4 exit 0 on the 660MB graph (repair was RangeError), integrity preserved 335,159 nodes/685,850 edges. Completes the system-viz pipeline green end-to-end at >512MiB.

**Shipped:** 2026-06-10T02:54:05-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[system-viz-u-viz-postmerge-capsafe]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._