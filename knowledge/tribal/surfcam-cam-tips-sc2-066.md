---
id: "sc2-066"
title: "Gouge Check with Tolerance Band for Surface Quality"
source: "web:surfcam-gouge-check"
confidence: 88
category: "setup"
tags: ["gouge-check", "tolerance-band", "surface-deviation", "quality"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.082Z
---

# Gouge Check with Tolerance Band for Surface Quality

SURFCAM gouge checking compares the toolpath-generated surface against the design surface within a tolerance band. Set the tolerance to ±0.005mm for precision mold work and ±0.02mm for general machining. Points where the tool cuts deeper than the negative tolerance are gouges (too deep). Points where the tool leaves material beyond the positive tolerance indicate insufficient cleanup (too shallow). Both conditions are flagged with distinct colors in the verification display.

**Category:** setup
**Confidence:** 88
**Source:** web:surfcam-gouge-check
**Operations:** verification, finishing

## Related
- [[bobcad-cam-tips-bc-084|Gouge Check with Deviation Color Map]]
- [[bobcad-cam-tips-bc-012|Pocket Milling with Gouge Check for Neighboring Walls]]
- [[bobcad-cam-tips-bc-162|BobCAD Barrel Cutter 5-Axis Tilt Control for Wall Surfaces]]
- [[cimatron-cam-tips-cim-010|Tool Assembly Collision Checking]]
- [[cimatron-cam-tips-cim-093|Collision Checking with Complete Tool Assembly]]
