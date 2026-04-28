---
id: "bc-160"
title: "BobCAD Wire EDM Automatic Wire Threading Point Optimization"
source: "web:bobcad-docs"
confidence: 0.85
category: "cam_strategy"
tags: ["wire-edm", "awt", "threading-point", "start-hole", "retry-logic"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.582Z
---

# BobCAD Wire EDM Automatic Wire Threading Point Optimization

BobCAD optimizes automatic wire threading (AWT) points based on the start hole location and the approach geometry. Position the start hole at least 3mm from the cutting profile to allow a stable lead-in arc. For multiple cavities using the same start hole, BobCAD generates threading at the hole location and approach moves to each cavity. If the machine supports submerged AWT, set the water level in the post processor. For machines without AWT, program M00 stops at each threading point for manual threading. Include re-thread retry logic in the post: attempt threading 3 times before alarming.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:bobcad-docs
**Operations:** wire_edm

## Related
- [[mastercam-cam-tips-mc-122|Automatic wire threading sequences enable unattended wire EDM operation]]
- [[surfcam-cam-tips-sc2-168|SURFCAM Wire EDM Wire Threading and Re-Threading Sequences]]
- [[bobcad-cam-tips-bc-066|Wire Threading and Glue Stop Programming]]
- [[bobcad-cam-tips-bc-155|BobCAD Wire EDM No-Core Cutting Strategy]]
- [[camworks-cam-tips-cw-163|Wire EDM Start Hole Optimization — Minimize Pre-Drilling]]
