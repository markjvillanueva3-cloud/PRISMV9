---
name: tribal-bc-140
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["bobcam-rhino", "nurbs", "surface-machining", "analytical", "freeform"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-140.md
promoted_at: 2026-06-09T22:31:15.966Z
---

# BobCAM for Rhino NURBS-Native Surface Machining

BobCAM for Rhino machines directly on Rhino's native NURBS surfaces without tessellation, producing smoother toolpaths than STL-based systems. The cutter contact point is computed analytically on the NURBS surface, maintaining surface accuracy to the model's native precision. For freeform surfaces (car body panels, mold cavities), this produces measurably better surface finish than mesh-based toolpaths. Set the toolpath tolerance to 0.001-0.005mm for NURBS machining — tighter than the 0.01mm typical for tessellated surfaces. Rhino's surface analysis tools (zulu, curvature) help identify problem areas before machining.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:bobcad-docs
**Operations:** finishing, 3_axis, 5_axis

## Related
- [[tebis-cam-tips-teb-043|Isoparametric Finishing Follows UV Direction of NURBS Surfaces]]
- [[catia-cam-tips-cat-021|Offset Surface Strategy for Constant Stock on Freeform Parts]]
- [[bobcad-cam-tips-bc-142|BobCAM for Rhino Grasshopper Integration for Parametric CAM]]
- [[bobcad-cam-tips-bc-144|BobCAM for Rhino SubD Surface Machining Strategies]]
- [[bobcad-cam-tips-bc-135|BobCAD V36 High-Speed Machining Output Optimization]]
