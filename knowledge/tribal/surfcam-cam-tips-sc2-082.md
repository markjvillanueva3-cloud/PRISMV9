---
id: "sc2-082"
title: "Cusp Height Varies with Surface Slope Angle"
source: "web:surfcam-cusp-slope"
confidence: 89
category: "surface_quality"
tags: ["cusp-height", "slope-angle", "variable-stepover", "consistency"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.094Z
---

# Cusp Height Varies with Surface Slope Angle

On sloped surfaces, the effective cusp height changes with the slope angle even at constant stepover. On steep walls (near vertical), Z-level passes produce smaller cusps than planar passes at the same stepover. On flat areas, planar passes are optimal. SURFCAM's scallop-height-based stepping automatically adjusts spacing to maintain constant cusp height regardless of surface slope. Enable this for all finishing operations where visual surface consistency matters.

**Category:** surface_quality
**Confidence:** 89
**Source:** web:surfcam-cusp-slope
**Operations:** finishing, 3d_milling

## Related
- [[powermill-cam-tips-pm-018|Stepover Calculation for Target Cusp Height]]
- [[bobcad-cam-tips-bc-024|Scallop Machining with Constant Cusp Height]]
- [[cimatron-cam-tips-cim-003|Z-Level Finishing with Constant Cusp Height]]
- [[cimatron-cam-tips-cim-026|Surface Quality Optimization via Scallop Control]]
- [[edgecam-cam-tips-ec-019|3D Finish with Raster and Scallop Control]]
