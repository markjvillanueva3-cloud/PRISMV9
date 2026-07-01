---
name: tribal-sc2-081
category: code-tribal
subdomain: surface_quality
domain: tribal-knowledge
tags: ["scallop-height", "cusp", "stepover", "ball-nose", "surface-finish"]
confidence: 91
source: "web:surfcam-scallop"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-081.md
promoted_at: 2026-05-26T16:07:20.567Z
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
