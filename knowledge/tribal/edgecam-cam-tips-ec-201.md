---
id: "ec-201"
title: "Gear Deburring Cycles After Hobbing/Skiving"
source: "web:edgecam-docs"
confidence: 0.8
category: "cam_strategy"
tags: ["gear-deburring", "chamfer", "hobbing", "automation"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.423Z
---

# Gear Deburring Cycles After Hobbing/Skiving

Program automated deburring after gear hobbing or skiving using Edgecam's chamfer/deburr cycle. Define a deburring tool (typically pointed or radius-tipped) and program it to trace both faces of each tooth at the gear end-faces. Use the gear data (tooth spacing = 360°/Z) to program C-axis indexed deburring passes. Set deburr depth to 0.1-0.3mm and chamfer angle to 30-45°. For high-volume production, use a deburring wheel synchronized to the gear rotation instead of single-tooth deburring.

**Category:** cam_strategy
**Confidence:** 0.8
**Source:** web:edgecam-docs
**Operations:** turning, milling

## Related
- [[mastercam-cam-tips-mc-250|Mastercam 2025 Deburr toolpath automates edge-break and chamfer operations from solid model edges]]
- [[bobcad-cam-tips-bc-016|Chamfer Milling with Depth and Width Control]]
- [[bobcad-cam-tips-bc-108|Spot Drilling with Automatic Depth from Hole Diameter]]
- [[bobcad-cam-tips-bc-133|BobCAD V36 Multiaxis Deburring Toolpath Strategy]]
- [[camworks-cam-tips-cw-098|Center Drilling — Short Rigid Pilot for Deep Holes]]
