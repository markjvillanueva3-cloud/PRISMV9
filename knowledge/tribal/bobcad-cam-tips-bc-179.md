---
id: "bc-179"
title: "BobCAD Nesting Cutting Sequence Optimization"
source: "web:bobcad-docs"
confidence: 0.87
category: "cam_strategy"
tags: ["nesting", "cutting-sequence", "heat-distortion", "rapid-travel", "thick-plate"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.597Z
---

# BobCAD Nesting Cutting Sequence Optimization

BobCAD optimizes the cutting sequence of nested parts to minimize heat distortion and rapid travel. The algorithm cuts interior features (holes, slots) before exterior profiles, and sequences exterior cuts to avoid crossing previously cut areas with the torch/laser head. Enable thermal distortion avoidance to alternate cuts across the sheet rather than cutting adjacent parts sequentially. For thick plate (>12mm), this prevents cumulative heat buildup that warps the sheet. The optimized sequence also minimizes rapid travel distance, reducing non-cutting time by 10-20%.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:bobcad-docs
**Operations:** contouring, cutting

## Related
- [[bobcad-cam-tips-bc-075|True-Shape Nesting for Maximum Sheet Yield]]
- [[bobcad-cam-tips-bc-175|BobCAD Nesting Module for Sheet Metal Cutting Optimization]]
- [[bobcad-cam-tips-bc-176|BobCAD True-Shape Nesting vs Rectangular Nesting]]
- [[bobcad-cam-tips-bc-177|BobCAD Nesting with Common-Line Cutting]]
- [[bobcad-cam-tips-bc-178|BobCAD Nesting Tab and Micro-Joint Placement for Sheet Parts]]
