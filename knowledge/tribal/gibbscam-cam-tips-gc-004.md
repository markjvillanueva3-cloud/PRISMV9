---
id: "gc-004"
title: "Drill tile supports spot-drill-tap sequences with automatic depth linking"
source: "web:gibbscam-docs"
confidence: 88
category: "cam_strategy"
tags: ["gibbscam", "drilling", "2.5d", "drill-tile", "tap", "peck"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.835Z
---

# Drill tile supports spot-drill-tap sequences with automatic depth linking

GibbsCAM's drill tile allows stacking multiple operations (spot drill, pilot, through-drill, chamfer, tap) on a single hole group. Define the sequence once and the system auto-calculates depth transitions between tools. Set the 'Peck Increment' for deep holes (L/D > 3) and use 'Chip Break' mode for short-chipping materials. For blind holes, set the 'Depth Offset' to account for the drill point angle—typically 0.3×D for a 118° point.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-001|Use Solid Face Selection for profiling to avoid manual geometry creation]]
- [[gibbscam-cam-tips-gc-002|Set pocket corner radius larger than cutter radius for smoother engagement]]
- [[gibbscam-cam-tips-gc-003|Facing operations benefit from climb milling with 65-75% stepover]]
- [[gibbscam-cam-tips-gc-005|Thread milling uses helical interpolation for precision internal threads]]
- [[gibbscam-cam-tips-gc-006|Contour operations require lead-in/lead-out arcs to avoid witness marks]]
