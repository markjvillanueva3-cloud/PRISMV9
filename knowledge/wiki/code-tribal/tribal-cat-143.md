---
name: tribal-cat-143
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "surface", "check-surfaces", "gouge-avoidance", "mold"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-143.md
promoted_at: 2026-06-09T22:31:16.063Z
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
