---
id: "cat-143"
title: "Surface Machining Multi-Surface Part Management with Check Surfaces"
source: "web:catia-docs"
confidence: 0.89
category: "cam_strategy"
tags: ["catia", "surface", "check-surfaces", "gouge-avoidance", "mold"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.925Z
---

# Surface Machining Multi-Surface Part Management with Check Surfaces

In CATIA Surface Machining, define 'Check Surfaces' (also called gouge-check or collision-check surfaces) for adjacent surfaces the tool must not violate. Unlike 'Part' surfaces which the tool machines, Check Surfaces create avoidance zones — the tool path retracts or modifies trajectory to maintain clearance. Set 'Check Distance' to 0.1-0.5mm for finish operations. For complex mold cores with multiple shut-off surfaces, define each shut-off as a Check Surface with 0mm distance (exact tangency). CATIA trims the tool path at the intersection of machining and check surface boundaries.

**Category:** cam_strategy
**Confidence:** 0.89
**Source:** web:catia-docs
**Operations:** finishing

## Related
- [[catia-cam-tips-cat-046|Core Roughing for Tall Thin Features Requires Outside-In Strategy]]
- [[catia-cam-tips-cat-137|Isoparametric vs Isocrest Surface Machining Path Strategy]]
- [[catia-cam-tips-cat-138|Surface Machining Pencil Tracing for Fillet Cleanup]]
- [[catia-cam-tips-cat-139|Spiral Surface Machining for Circular Part Geometries]]
- [[catia-cam-tips-cat-140|Surface Machining Guide Curve Strategy for Flow-Shaped Parts]]
