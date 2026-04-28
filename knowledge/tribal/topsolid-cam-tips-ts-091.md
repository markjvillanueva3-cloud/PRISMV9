---
id: "ts-091"
title: "Scallop Control Sets Maximum Cusp Height"
source: "web:topsolid-scallop-ctrl"
confidence: 93
category: "cam_strategy"
tags: ["scallop", "cusp-height", "surface-roughness", "quality"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.456Z
---

# Scallop Control Sets Maximum Cusp Height

TopSolid's scallop control allows you to specify the maximum allowable cusp height (scallop) left by the finishing pass, and the system automatically calculates the required stepover at each point on the surface. For mold-quality surfaces (Ra 0.4-0.8), target a scallop height of 0.002-0.005 mm. For general machined surfaces (Ra 1.6-3.2), 0.01-0.02 mm is acceptable. Remember that actual surface roughness is typically 2-3x the theoretical scallop height due to tool deflection and vibration.

**Category:** cam_strategy
**Confidence:** 93
**Source:** web:topsolid-scallop-ctrl
**Operations:** finishing

## Related
- [[cimatron-cam-tips-cim-026|Surface Quality Optimization via Scallop Control]]
- [[worknc-cam-tips-wnc-088|Scallop Control Sets Maximum Cusp Height]]
- [[bobcad-cam-tips-bc-024|Scallop Machining with Constant Cusp Height]]
- [[edgecam-cam-tips-ec-019|3D Finish with Raster and Scallop Control]]
- [[esprit-cam-tips-esp-014|Scallop-Based Finishing Maintains Constant Cusp Height]]
