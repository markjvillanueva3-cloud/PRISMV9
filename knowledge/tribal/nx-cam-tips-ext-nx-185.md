---
id: "nx-185"
title: "NURBS Output for Flight-Critical Surfaces"
source: "web:siemens-nx-docs"
confidence: 0.87
category: "cam_strategy"
tags: ["nurbs", "g6.2", "sinumerik", "flight-critical"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.482Z
---

# NURBS Output for Flight-Critical Surfaces

0.003mm tolerance with G6.2 NURBS output on Sinumerik. Smoother than linear G01. For flight-critical: NURBS produces fewer axis reversals = better surface. Don't over-relax tolerance — it's the primary quality driver on aerodynamic surfaces.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:siemens-nx-docs
**Operations:** finishing

## Related
- [[controller-knowledge-tips-ctrl-040|Fidia C40 5-axis contouring specialization]]
- [[bobcad-cam-tips-bc-135|BobCAD V36 High-Speed Machining Output Optimization]]
- [[bobcad-cam-tips-bc-140|BobCAM for Rhino NURBS-Native Surface Machining]]
- [[catia-cam-tips-cat-104|Arc Output Mode for Smoother Machine Motion]]
- [[catia-cam-tips-cat-162|STL to NURBS Conversion for Higher Quality CATIA Machining]]
