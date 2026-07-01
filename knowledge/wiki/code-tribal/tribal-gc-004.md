---
name: tribal-gc-004
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "drilling", "2.5d", "drill-tile", "tap", "peck"]
confidence: 88
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-004.md
promoted_at: 2026-06-09T22:31:16.312Z
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
