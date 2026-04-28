---
id: "bc-108"
title: "Spot Drilling with Automatic Depth from Hole Diameter"
source: "web:bobcad-spot-drill"
confidence: 88
category: "cam_strategy"
tags: ["spot-drilling", "auto-depth", "chamfer", "feature-recognition"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.540Z
---

# Spot Drilling with Automatic Depth from Hole Diameter

BobCAD automatically calculates spot drill depth based on subsequent drill diameter and desired chamfer size. For 90° spot drill creating 0.5mm chamfer on 10mm hole: depth = 5.5mm. Output G81 with no peck. For angled surfaces, enable surface normal option. BobCAD's feature recognition identifies all holes requiring spot drilling and creates the spot drill operation automatically with correct depths per hole diameter.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:bobcad-spot-drill
**Operations:** drilling

## Related
- [[surfcam-cam-tips-sc2-092|Spot Drilling with Automatic Depth Calculation]]
- [[solidcam-cam-tips-sc-141|Spot and Center Drilling — Precise Start Points for Deep Holes]]
- [[bobcad-cam-tips-bc-016|Chamfer Milling with Depth and Width Control]]
- [[bobcad-cam-tips-bc-133|BobCAD V36 Multiaxis Deburring Toolpath Strategy]]
- [[camworks-cam-tips-cw-098|Center Drilling — Short Rigid Pilot for Deep Holes]]
