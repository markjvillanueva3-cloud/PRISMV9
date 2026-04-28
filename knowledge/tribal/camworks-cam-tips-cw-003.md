---
id: "cw-003"
title: "Interactive Feature Definition — Manual Override for Complex Shapes"
source: "web:camworks-docs"
confidence: 88
category: "cam_strategy"
tags: ["camworks", "ifr", "manual-features", "complex-geometry"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.631Z
---

# Interactive Feature Definition — Manual Override for Complex Shapes

For features AFR cannot detect (blended surfaces, freeform pockets, multi-level cavities), use Interactive Feature Recognition (IFR). Select the bottom face and bounding faces to define the machinable volume. IFR is especially important for cast or forged parts where the stock shape differs significantly from the final part — AFR assumes prismatic stock and may miss features that only exist relative to a cast blank.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** milling, 3d_roughing

## Related
- [[camworks-cam-tips-cw-002|Custom Feature Templates — Teach AFR to Recognize Shop-Specific Geometry]]
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[camworks-cam-tips-cw-004|Multi-Axis Feature Recognition — Detect Features Across Index Angles]]
- [[camworks-cam-tips-cw-005|Turned Feature Recognition — Automatic Detection of Lathe Geometry]]
- [[camworks-cam-tips-cw-006|Hole Pattern Recognition — Group Identical Holes for Batch Operations]]
