---
id: "cat-019"
title: "Between-Curves Machining for Blended Surface Regions"
source: "web:catia-docs"
confidence: 86
category: "cam_strategy"
tags: ["catia", "between-curves", "blended", "interpolation", "surface-machining"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.815Z
---

# Between-Curves Machining for Blended Surface Regions

In CATIA Contour-Driven machining, the Between Contours mode interpolates tool paths between two guide curves, making it ideal for blended regions, fillets between surfaces, and transition zones. The interpolation follows the surface normal, so the resulting paths conform to complex curvature better than simple offset patterns. Define the two boundary curves carefully — if they have different parameterization lengths, the interpolation may bunch up. Equalize arc lengths of both curves for uniform pass spacing.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:catia-docs
**Operations:** contour_driven

## Related
- [[catia-cam-tips-cat-013|Sweeping Operation Stepover Linked to Scallop Height]]
- [[catia-cam-tips-cat-014|ZLevel Machining Optimal for Steep Walls Over 60 Degrees]]
- [[catia-cam-tips-cat-015|Contour-Driven Parallel Mode for Ruled Surface Finishing]]
- [[catia-cam-tips-cat-016|Isoparametric Machining Aligns Tool Path to UV Flow]]
- [[catia-cam-tips-cat-017|Spiral Machining for Circular Cavity and Dome Features]]
