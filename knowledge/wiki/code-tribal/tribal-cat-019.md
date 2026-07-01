---
name: tribal-cat-019
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "between-curves", "blended", "interpolation", "surface-machining"]
confidence: 86
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-019.md
promoted_at: 2026-06-09T22:31:16.034Z
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
