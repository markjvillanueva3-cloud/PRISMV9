---
name: tribal-bc-099
category: code-tribal
subdomain: surface_quality
domain: tribal-knowledge
tags: ["scallop-height", "cusp", "calculator", "variable-stepover"]
confidence: 90
source: "web:bobcad-scallop"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-099.md
promoted_at: 2026-05-26T16:07:19.797Z
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
