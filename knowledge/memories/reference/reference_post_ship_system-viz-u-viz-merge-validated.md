---
name: reference_post_ship_system-viz-u-viz-merge-validated
description: Auto-distilled learnings from shipping SYSTEM-VIZ/U-VIZ-MERGE-VALIDATED (commit 7a1f52061). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.067Z
aliases: reference_post_ship_system-viz-u-viz-merge-validated
---


# SYSTEM-VIZ/U-VIZ-MERGE-VALIDATED

[MAIN] [SYSTEM-VIZ]/U-VIZ-MERGE-VALIDATED (slot:sierra): doc-reflect golf's merge bug RESOLVED + LIVE-VALIDATED. Full regen-viz run (430.3s, driftFail=false) folded 557.9MB augmentations into a 660MB graph (>golf's 630MB failure point, >512MiB V8 cap) and SUCCEEDED (obsidian:yes, build-graph-index 335,482 nodes, sidecar rebuilt fresh). golf's 630MB exit-1 does NOT reproduce -- it was the truncation cascade closed by writeGraphStreamingAtomic (153887a519); loadOptional now cap-safe (628aaa51f5). system-viz green end-to-end at >512MiB.

**Shipped:** 2026-06-10T02:47:07-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[system-viz-u-viz-merge-validated]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._