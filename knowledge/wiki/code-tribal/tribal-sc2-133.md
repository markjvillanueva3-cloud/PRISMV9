---
name: tribal-sc2-133
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["2d-contour", "prismatic", "traditional", "arc-output", "simple-parts"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-133.md
promoted_at: 2026-06-09T22:31:16.688Z
---

# Traditional SURFCAM 2D Contour Still Superior for Simple Prismatic Parts

For simple prismatic parts with 2D features (pockets, slots, stepped profiles), SURFCAM Traditional's 2D contour operations calculate faster and produce cleaner G-code than the 3D-engine equivalents in SURFCAM 2023. The 2D contour engine uses direct offset calculations rather than tessellated surface intersections, resulting in exact arcs and lines without faceting. Use Traditional-style 2D operations for parts with tolerances >0.01mm and no complex freeform surfaces.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:surfcam-docs
**Operations:** contouring, pocketing

## Related
- [[fusion360-cam-tips-ext-f360-068|2D Contour Linking with Lead-In Arc for Clean Entry]]
- [[bobcad-cam-tips-bc-070|Feature Recognition for Automated Operation Suggestion]]
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[catia-cam-tips-cat-003|Profile Contouring Compensation Mode Selection]]
