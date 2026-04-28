---
id: "sc2-092"
title: "Spot Drilling with Automatic Depth Calculation"
source: "web:surfcam-drilling-spot"
confidence: 88
category: "cam_strategy"
tags: ["spot-drilling", "depth-calculation", "chamfer", "g81"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.102Z
---

# Spot Drilling with Automatic Depth Calculation

SURFCAM automatically calculates spot drill depth based on the subsequent drill diameter and desired chamfer size. For a 90° spot drill creating a 0.5mm chamfer on a 10mm hole, the depth is 5.5mm (half the drill diameter plus chamfer). Set the spot drill to output G81 (simple drilling cycle) with no peck. For angled surfaces, enable the 'Surface normal' option to tilt the drill axis perpendicular to the surface for accurate spotting.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:surfcam-drilling-spot
**Operations:** drilling

## Related
- [[bobcad-cam-tips-bc-108|Spot Drilling with Automatic Depth from Hole Diameter]]
- [[solidcam-cam-tips-sc-141|Spot and Center Drilling — Precise Start Points for Deep Holes]]
- [[bobcad-cam-tips-bc-016|Chamfer Milling with Depth and Width Control]]
- [[bobcad-cam-tips-bc-133|BobCAD V36 Multiaxis Deburring Toolpath Strategy]]
- [[camworks-cam-tips-cw-098|Center Drilling — Short Rigid Pilot for Deep Holes]]
