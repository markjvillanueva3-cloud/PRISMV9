---
name: tribal-bc-179
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["nesting", "cutting-sequence", "heat-distortion", "rapid-travel", "thick-plate"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-179.md
promoted_at: 2026-06-09T22:31:15.976Z
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
