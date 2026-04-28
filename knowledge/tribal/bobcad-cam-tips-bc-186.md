---
id: "bc-186"
title: "BobART 4-Axis Rotary Engraving for Cylindrical Objects"
source: "web:bobcad-docs"
confidence: 0.86
category: "cam_strategy"
tags: ["bobart", "4-axis-rotary", "engraving", "cylindrical", "wrapping"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.602Z
---

# BobART 4-Axis Rotary Engraving for Cylindrical Objects

BobART supports 4-axis rotary engraving for rings, columns, gun barrels, and cylindrical containers. Unwrap the cylindrical surface to a flat plane, design the engraving in 2D/relief, then wrap it onto the cylinder using BobART's model wrapping. The wrapping algorithm maps XY coordinates to C-axis rotation and Z translation. Set the wrap diameter precisely — diameter errors cause feature distortion around the circumference. For tapered cylinders, use segmented wrapping with different diameters per section. BobCAD outputs 4-axis code with simultaneous X/Z/C motion for continuous rotary engraving.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:bobcad-docs
**Operations:** engraving, 4_axis

## Related
- [[bobcad-cam-tips-bc-182|BobART Vector Engraving with V-Bit Depth Control]]
- [[cimatron-cam-tips-cim-065|Rotary Axis Wrapping for Cylindrical Features]]
- [[cimatron-cam-tips-cim-163|Rotary Axis Wrapping for Round Mold Components]]
- [[hypermill-cam-tips-ext-hm-171|Rotary Axis Wrapping for 4-Axis Parts]]
- [[mastercam-cam-tips-mc-073|Rotary Advanced toolpath wraps 2D geometry around cylindrical surfaces]]
