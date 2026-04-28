---
id: "gc-009"
title: "Step machining with depth-first ordering minimizes tool changes"
source: "web:community"
confidence: 83
category: "cam_strategy"
tags: ["gibbscam", "step-machining", "2.5d", "depth-first", "ordering"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.838Z
---

# Step machining with depth-first ordering minimizes tool changes

For multi-level step features, use GibbsCAM's depth-first ordering to machine all levels of one pocket before moving to the next. This reduces air travel compared to level-first ordering where the tool traverses across all features at each depth. Combine with 'Machine Complete' option to ensure each feature is fully roughed before the tool moves on. For parts with 10+ identical step pockets, this ordering reduces cycle time by 8-12% through minimized rapids.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:community

## Related
- [[gibbscam-cam-tips-gc-001|Use Solid Face Selection for profiling to avoid manual geometry creation]]
- [[gibbscam-cam-tips-gc-002|Set pocket corner radius larger than cutter radius for smoother engagement]]
- [[gibbscam-cam-tips-gc-003|Facing operations benefit from climb milling with 65-75% stepover]]
- [[gibbscam-cam-tips-gc-004|Drill tile supports spot-drill-tap sequences with automatic depth linking]]
- [[gibbscam-cam-tips-gc-005|Thread milling uses helical interpolation for precision internal threads]]
