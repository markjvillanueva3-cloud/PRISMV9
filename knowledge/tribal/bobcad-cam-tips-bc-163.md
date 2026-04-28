---
id: "bc-163"
title: "BobCAD Barrel Cutter Speed Calculation at Contact Point"
source: "web:bobcad-docs"
confidence: 0.86
category: "speeds_feeds"
tags: ["barrel-cutter", "effective-diameter", "contact-point", "g93", "surface-speed"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.584Z
---

# BobCAD Barrel Cutter Speed Calculation at Contact Point

With barrel cutters, the effective cutting diameter varies based on which part of the barrel profile contacts the surface. BobCAD calculates the effective diameter at the contact point for speed computation. At the barrel's equator, effective diameter approaches the nominal tool diameter. Near the tip, it equals the tip radius. Near the shank, it approaches the shank diameter. Set RPM based on the average effective diameter across the toolpath, or use inverse-time feed (G93) to let the CNC control compensate automatically. Monitor actual surface speed — too low causes rubbing, too high causes premature wear.

**Category:** speeds_feeds
**Confidence:** 0.86
**Source:** web:bobcad-docs
**Operations:** finishing, 5_axis

## Related
- [[surfcam-cam-tips-sc2-154|Barrel Cutter Speed and Feed Adjustment for Effective Diameter]]
- [[fusion360-cam-tips-ext-f360-142|General Barrel Cutter for Complex Freeform Surfaces]]
- [[surfcam-cam-tips-sc2-152|Barrel Cutter Contact Point Calculation in SURFCAM]]
- [[bobcad-cam-tips-bc-161|BobCAD Barrel Cutter Support for Large-Step-Over Finishing]]
- [[bobcad-cam-tips-bc-162|BobCAD Barrel Cutter 5-Axis Tilt Control for Wall Surfaces]]
