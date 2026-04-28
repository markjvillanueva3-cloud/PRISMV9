---
id: "bc-099"
title: "Scallop Height Calculator for Predictable Finish"
source: "web:bobcad-scallop"
confidence: 90
category: "surface_quality"
tags: ["scallop-height", "cusp", "calculator", "variable-stepover"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.534Z
---

# Scallop Height Calculator for Predictable Finish

BobCAD's scallop height calculator determines the stepover needed for a target cusp height. For ball-nose tools: scallop = R - sqrt(R² - (stepover/2)²). Targets: 0.002-0.005mm for polished molds, 0.005-0.01mm for textured surfaces, 0.02-0.05mm for non-appearance surfaces. V36 adds cusp-height-based stepover that varies across the part surface to maintain constant visual quality regardless of surface slope angle.

**Category:** surface_quality
**Confidence:** 90
**Source:** web:bobcad-scallop
**Operations:** finishing

## Related
- [[catia-cam-tips-cat-141|Surface Machining Scallop Height Control with Variable Stepover]]
- [[surfcam-cam-tips-sc2-081|Scallop Height Control for Predictable Surface Finish]]
- [[bobcad-cam-tips-bc-021|Z-Level Finishing for Steep Walls Over 30 Degrees]]
- [[cimatron-cam-tips-cim-101|Scallop Height Formula h = R - √(R² - (s/2)²)]]
- [[edgecam-cam-tips-ec-086|Scallop Height Calculation for Ball-Nose Cutters]]
