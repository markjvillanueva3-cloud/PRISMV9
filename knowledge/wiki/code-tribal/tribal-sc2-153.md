---
name: tribal-sc2-153
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["barrel-cutter", "step-over", "curvature", "scallop-height", "optimization"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-153.md
promoted_at: 2026-06-09T22:31:16.693Z
---

# SURFCAM Barrel Cutter Step-Over Optimization by Curvature

Optimize barrel cutter step-over in SURFCAM based on local surface curvature. On convex surfaces where the barrel and part curvatures oppose each other, step-over can increase because the effective contact width is larger. On concave surfaces where curvatures align, reduce step-over to maintain scallop tolerance. Use SURFCAM's scallop-height-based step-over control rather than fixed distance — the system automatically adjusts step-over based on local curvature, typically varying from 2mm to 8mm across a single surface.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:surfcam-docs
**Operations:** finishing, 5_axis

## Related
- [[surfcam-cam-tips-sc2-149|Barrel Cutter Definition in SURFCAM Tool Library]]
- [[cimatron-cam-tips-cim-101|Scallop Height Formula h = R - √(R² - (s/2)²)]]
- [[bobcad-cam-tips-bc-161|BobCAD Barrel Cutter Support for Large-Step-Over Finishing]]
- [[cimatron-cam-tips-cim-055|Barrel Cutter Strategies for Large Step-Over Finishing]]
- [[fusion360-cam-tips-ext-f360-142|General Barrel Cutter for Complex Freeform Surfaces]]
