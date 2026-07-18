---
name: tribal-bc-144
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["bobcam-rhino", "subd", "nurbs-conversion", "organic-shapes", "jewelry"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-144.md
promoted_at: 2026-06-09T22:31:15.967Z
---

# BobCAM for Rhino SubD Surface Machining Strategies

Rhino 7/8's SubD surfaces can be machined directly in BobCAM by converting to NURBS first (ExtractRenderMesh is NOT needed). Use Rhino's ToNurbs command to convert SubD to NURBS while preserving the smooth surface quality. BobCAM then machines the NURBS conversion. For organic shapes created with SubD (character models, ergonomic handles, jewelry), set the SubD display density to 3+ before converting to ensure sufficient surface quality. Check for surface discontinuities at the SubD-to-NURBS conversion boundaries — add tangency constraints in the SubD model if machining reveals visible seam lines.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:bobcad-docs
**Operations:** finishing, 3_axis

## Related
- [[bobcad-cam-tips-bc-140|BobCAM for Rhino NURBS-Native Surface Machining]]
- [[bobcad-cam-tips-bc-142|BobCAM for Rhino Grasshopper Integration for Parametric CAM]]
- [[bobcad-cam-tips-bc-022|Flowline Finishing Follows Surface UV Direction]]
- [[fusion360-cam-tips-ext-f360-177|Programming Organic Generative Shapes with Adaptive Clearing]]
- [[fusion360-cam-tips-f360-009|Morphed Spiral for Organic Freeform Surfaces]]
