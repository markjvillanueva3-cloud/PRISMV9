---
id: "bc-144"
title: "BobCAM for Rhino SubD Surface Machining Strategies"
source: "web:bobcad-docs"
confidence: 0.82
category: "cam_strategy"
tags: ["bobcam-rhino", "subd", "nurbs-conversion", "organic-shapes", "jewelry"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.569Z
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
