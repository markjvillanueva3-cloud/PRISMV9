---
id: "bc-098"
title: "Tolerance Control for Surface Accuracy vs File Size"
source: "web:bobcad-tolerance"
confidence: 90
category: "surface_quality"
tags: ["tolerance", "chordal-deviation", "file-size", "look-ahead"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.533Z
---

# Tolerance Control for Surface Accuracy vs File Size

BobCAD surface tolerance (chordal deviation) controls toolpath-to-surface approximation. Tighter tolerance (0.001mm) = more accurate but larger NC files. For mold finishing use 0.005mm, general machining 0.01-0.02mm. V36 Advanced Surface Quality dialog provides arc fit and point distribution settings. Very tight tolerances may cause controller slowdown due to block processing limits — ensure your controller's look-ahead buffer can handle the point density.

**Category:** surface_quality
**Confidence:** 90
**Source:** web:bobcad-tolerance
**Operations:** finishing

## Related
- [[fusion360-cam-tips-ext-f360-105|Smoothing Tolerance for Controller Look-Ahead]]
- [[surfcam-cam-tips-sc2-080|Tolerance Settings Control Surface Accuracy and File Size]]
- [[bobcad-cam-tips-bc-203|BobCAD Dimensional Uncertainty Budget for Critical Features]]
- [[camworks-cam-tips-cw-061|Tolerance-Based Machining — Read PMI for Automatic Strategy Selection]]
- [[camworks-cam-tips-cw-102|Reaming — Slow Speed Precision Finishing for Tight-Tolerance Holes]]
