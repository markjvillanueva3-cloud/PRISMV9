---
id: "cw-104"
title: "Drill Pattern Optimization — Minimize Rapid Travel Between Holes"
source: "web:camworks-docs"
confidence: 87
category: "cam_strategy"
tags: ["camworks", "drilling", "pattern", "optimization", "sequence"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.724Z
---

# Drill Pattern Optimization — Minimize Rapid Travel Between Holes

CAMWorks optimizes the drilling sequence across hole patterns to minimize total rapid travel distance. For large plates with hundreds of holes, the nearest-neighbor sequencing can save 5-15% cycle time compared to sequential hole numbering. Enable drill pattern sorting and verify the resulting sequence does not cause excessive Z-retract moves. For different-depth holes, consider sorting by depth first (shallow → deep) to use the same drill with increasing depth stops.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:camworks-docs
**Operations:** drilling

## Related
- [[camworks-cam-tips-cw-006|Hole Pattern Recognition — Group Identical Holes for Batch Operations]]
- [[camworks-cam-tips-cw-040|Pattern Machining — Raster/Zigzag for Flat and Gently Curved Surfaces]]
- [[camworks-cam-tips-cw-069|Turning Drill Operations — Center, Peck, and Deep Hole on Lathe]]
- [[camworks-cam-tips-cw-077|Wire Threading Strategy — Automatic Re-Threading for Multi-Opening Parts]]
- [[camworks-cam-tips-cw-087|Canned Cycle Output — Map Operations to Controller Drill Cycles]]
