---
name: tribal-cat-139
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "surface", "spiral", "rotational", "sweeping"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-139.md
promoted_at: 2026-06-09T22:31:16.063Z
---

# Spiral Surface Machining for Circular Part Geometries

For rotationally symmetric parts (turbine disks, lens molds, round covers), CATIA Surface Machining's Spiral strategy produces superior surface finish over raster/zigzag. Enable Spiral mode in the Sweeping operation and set the spiral center to the part's rotational axis. The tool follows a continuous Archimedean spiral from center to periphery (or vice versa), eliminating step-over marks at direction changes. Set the spiral pitch equal to the desired stepover. For non-circular but roughly round geometries, use 'Morphed Spiral' which deforms the spiral to follow the boundary contour.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:catia-docs
**Operations:** finishing

## Related
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-013|Sweeping Operation Stepover Linked to Scallop Height]]
- [[catia-cam-tips-cat-017|Spiral Machining for Circular Cavity and Dome Features]]
- [[catia-cam-tips-cat-025|Multi-Axis Sweeping Lead/Lag Angle for Surface Quality]]
- [[catia-cam-tips-cat-137|Isoparametric vs Isocrest Surface Machining Path Strategy]]
