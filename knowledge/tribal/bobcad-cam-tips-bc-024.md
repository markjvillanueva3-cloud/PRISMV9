---
id: "bc-024"
title: "Scallop Machining with Constant Cusp Height"
source: "web:bobcad-scallop"
confidence: 91
category: "cam_strategy"
tags: ["scallop", "cusp-height", "constant-cusp", "v36-advanced"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.463Z
---

# Scallop Machining with Constant Cusp Height

BobCAD scallop machining maintains constant cusp height rather than constant stepover. On convex surfaces the stepover widens, on concave it tightens, producing visually uniform surface quality. Target cusp height: 0.003-0.010mm for molds, 0.03-0.05mm for semi-finish. V36 Advanced Surface Quality dialog adds arc-fit and point distribution controls. Set stepover based on cusp height and define overlap percentages between passes for consistent coverage.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:bobcad-scallop
**Operations:** finishing, 3d_milling

## Related
- [[surfcam-cam-tips-sc2-026|Scallop-Based Stepover for Constant Cusp Height]]
- [[camworks-cam-tips-cw-039|Scallop Finishing — Constant Cusp Height Across Variable Curvature]]
- [[cimatron-cam-tips-cim-026|Surface Quality Optimization via Scallop Control]]
- [[edgecam-cam-tips-ec-019|3D Finish with Raster and Scallop Control]]
- [[esprit-cam-tips-esp-014|Scallop-Based Finishing Maintains Constant Cusp Height]]
