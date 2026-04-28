---
id: "cat-141"
title: "Surface Machining Scallop Height Control with Variable Stepover"
source: "web:catia-docs"
confidence: 0.9
category: "cam_strategy"
tags: ["catia", "surface", "scallop-height", "variable-stepover", "curvature"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.924Z
---

# Surface Machining Scallop Height Control with Variable Stepover

Instead of using constant stepover in CATIA Surface Machining, enable 'Constant Scallop Height' mode. CATIA dynamically adjusts the stepover distance based on local surface curvature — tighter stepover in high-curvature regions, wider stepover on flat areas. This produces uniform surface quality while minimizing cycle time (20-40% reduction vs constant stepover on complex freeform surfaces). Set the scallop height target to 0.005-0.01mm for finish operations. Combine with a ball-nose end mill — scallop height calculation assumes a spherical tool tip profile.

**Category:** cam_strategy
**Confidence:** 0.9
**Source:** web:catia-docs
**Operations:** finishing

## Related
- [[catia-cam-tips-cat-103|Point Distribution Density on High-Curvature Regions]]
- [[catia-cam-tips-cat-137|Isoparametric vs Isocrest Surface Machining Path Strategy]]
- [[catia-cam-tips-cat-138|Surface Machining Pencil Tracing for Fillet Cleanup]]
- [[catia-cam-tips-cat-139|Spiral Surface Machining for Circular Part Geometries]]
- [[catia-cam-tips-cat-140|Surface Machining Guide Curve Strategy for Flow-Shaped Parts]]
