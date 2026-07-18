---
name: tribal-cat-101
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "cusp", "flat-endmill", "ruled-surface", "surface-quality"]
confidence: 88
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-101.md
promoted_at: 2026-06-09T22:31:16.053Z
---

# Cusp Height Control on Ruled and Flat Surfaces with Flat End Mills

On flat and ruled (developable) surfaces, use flat end mills instead of ball-nose tools to achieve zero cusp height in CATIA surface machining. Orient the flat end mill perpendicular to the surface normal for full contact. For near-flat surfaces (< 5 degrees from horizontal), a flat end mill with 50-60% stepover produces a smoother surface than a ball nose at any stepover. In CATIA, select 'Flat End Mill' in the tool definition and set the surface quality mode to 'Chord Deviation' rather than 'Scallop Height'.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:catia-docs
**Operations:** finishing

## Related
- [[catia-cam-tips-cat-015|Contour-Driven Parallel Mode for Ruled Surface Finishing]]
- [[catia-cam-tips-cat-100|Scallop Height Calculation Drives Stepover Selection]]
- [[catia-cam-tips-cat-102|Machining Tolerance vs Surface Tolerance Distinction]]
- [[catia-cam-tips-cat-103|Point Distribution Density on High-Curvature Regions]]
- [[catia-cam-tips-cat-104|Arc Output Mode for Smoother Machine Motion]]
