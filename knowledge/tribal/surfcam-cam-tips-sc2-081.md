---
id: "sc2-081"
title: "Scallop Height Control for Predictable Surface Finish"
source: "web:surfcam-scallop"
confidence: 91
category: "surface_quality"
tags: ["scallop-height", "cusp", "stepover", "ball-nose", "surface-finish"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.093Z
---

# Scallop Height Control for Predictable Surface Finish

SURFCAM scallop height (cusp height) is the residual ridge height between adjacent toolpath passes. For ball-nose tools: scallop height = R - sqrt(R² - (stepover/2)²), where R is ball radius. Target scallop heights: 0.002-0.005mm for polished molds, 0.005-0.01mm for textured surfaces, 0.02-0.05mm for non-appearance surfaces. Use the built-in scallop calculator to determine the stepover that produces the target scallop height for the selected tool.

**Category:** surface_quality
**Confidence:** 91
**Source:** web:surfcam-scallop
**Operations:** finishing

## Related
- [[edgecam-cam-tips-ec-086|Scallop Height Calculation for Ball-Nose Cutters]]
- [[edgecam-cam-tips-ec-173|Hard Milling Surface Finish Scallop Height Control]]
- [[esprit-cam-tips-esp-097|Scallop Height Control for Predictable Surface Finish]]
- [[bobcad-cam-tips-bc-099|Scallop Height Calculator for Predictable Finish]]
- [[catia-cam-tips-cat-100|Scallop Height Calculation Drives Stepover Selection]]
