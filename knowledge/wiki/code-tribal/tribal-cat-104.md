---
name: tribal-cat-104
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "arc-output", "nurbs", "smooth-motion", "surface-quality"]
confidence: 88
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-104.md
promoted_at: 2026-06-09T22:31:16.054Z
---

# Arc Output Mode for Smoother Machine Motion

Enable arc output in CATIA post-processor settings to convert sequences of linear segments into G2/G3 circular arcs where the tool path is nearly circular. This produces smoother machine axis motion, reduces program size, and improves surface finish on curved features. CATIA detects near-circular sequences based on the arc fitting tolerance (set to 50% of machining tolerance). For NURBS-capable controllers (Siemens 840D, Heidenhain TNC), output NURBS splines (G6.2) instead of arcs for even smoother motion on complex curves.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:catia-docs
**Operations:** finishing

## Related
- [[catia-cam-tips-cat-093|Arc Fitting Reduces NC Program Size and Improves Motion Quality]]
- [[catia-cam-tips-cat-100|Scallop Height Calculation Drives Stepover Selection]]
- [[catia-cam-tips-cat-101|Cusp Height Control on Ruled and Flat Surfaces with Flat End Mills]]
- [[catia-cam-tips-cat-102|Machining Tolerance vs Surface Tolerance Distinction]]
- [[catia-cam-tips-cat-103|Point Distribution Density on High-Curvature Regions]]
