---
id: "bc-084"
title: "Gouge Check with Deviation Color Map"
source: "web:bobcad-gouge-check"
confidence: 89
category: "setup"
tags: ["gouge-check", "deviation-map", "color-map", "quality"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.522Z
---

# Gouge Check with Deviation Color Map

BobCAD gouge checking compares the toolpath-machined surface against the design surface. Red zones indicate gouges (too deep), blue zones indicate excess material (too shallow). Set tolerance to ±0.005mm for precision mold work, ±0.02mm for general machining. The deviation color map provides quantitative measurements at any point — click to see the exact deviation value. Export the color map as an image for documentation in the quality file.

**Category:** setup
**Confidence:** 89
**Source:** web:bobcad-gouge-check
**Operations:** verification, finishing

## Related
- [[surfcam-cam-tips-sc2-066|Gouge Check with Tolerance Band for Surface Quality]]
- [[gibbscam-cam-tips-gc-196|GibbsCAM CPR deviation analysis color-maps machined surface against nominal model]]
- [[bobcad-cam-tips-bc-012|Pocket Milling with Gouge Check for Neighboring Walls]]
- [[bobcad-cam-tips-bc-162|BobCAD Barrel Cutter 5-Axis Tilt Control for Wall Surfaces]]
- [[cimatron-cam-tips-cim-010|Tool Assembly Collision Checking]]
