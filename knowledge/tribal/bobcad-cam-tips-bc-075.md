---
id: "bc-075"
title: "True-Shape Nesting for Maximum Sheet Yield"
source: "web:bobcad-nesting"
confidence: 90
category: "cam_strategy"
tags: ["nesting", "true-shape", "sheet-yield", "material-utilization"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.516Z
---

# True-Shape Nesting for Maximum Sheet Yield

BobCAD's Nesting module uses true-shape nesting (not rectangular bounding box) to maximize sheet yield. Parts are rotated and positioned to fit the actual profile contours together, achieving 15-25% better material utilization than rectangular nesting. The engine runs up to 102 trial configurations to find the optimal layout. Set the minimum part gap to the kerf width plus 1mm for laser/plasma or the wire kerf plus 0.5mm for wire EDM.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:bobcad-nesting
**Operations:** nesting

## Related
- [[bobcad-cam-tips-bc-175|BobCAD Nesting Module for Sheet Metal Cutting Optimization]]
- [[bobcad-cam-tips-bc-176|BobCAD True-Shape Nesting vs Rectangular Nesting]]
- [[mastercam-cam-tips-mc-237|Remnant management system tracks partial sheets for maximum material utilization across jobs]]
- [[bobcad-cam-tips-bc-177|BobCAD Nesting with Common-Line Cutting]]
- [[bobcad-cam-tips-bc-178|BobCAD Nesting Tab and Micro-Joint Placement for Sheet Parts]]
