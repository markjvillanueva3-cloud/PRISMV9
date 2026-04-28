---
id: "bc-100"
title: "Cusp Height Variation with Surface Slope"
source: "web:bobcad-cusp-slope"
confidence: 89
category: "surface_quality"
tags: ["cusp-variation", "slope-angle", "constant-cusp", "hybrid"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.535Z
---

# Cusp Height Variation with Surface Slope

On sloped surfaces, effective cusp height changes with slope angle even at constant stepover. Z-level passes produce smaller cusps on steep walls; planar passes are optimal on flats. BobCAD's cusp-height-based stepping automatically adjusts spacing to maintain constant cusp regardless of slope. Enable this for all finishing where visual consistency matters. The steep/shallow hybrid strategy applies the optimal toolpath type to each region based on the slope threshold.

**Category:** surface_quality
**Confidence:** 89
**Source:** web:bobcad-cusp-slope
**Operations:** finishing, 3d_milling

## Related
- [[surfcam-cam-tips-sc2-082|Cusp Height Varies with Surface Slope Angle]]
- [[bobcad-cam-tips-bc-024|Scallop Machining with Constant Cusp Height]]
- [[camworks-cam-tips-cw-039|Scallop Finishing — Constant Cusp Height Across Variable Curvature]]
- [[camworks-cam-tips-cw-044|Constant Cusp Machining — Adaptive Step-Over for Uniform Ra]]
- [[gibbscam-cam-tips-gc-015|Scallop height strategy maintains constant cusp height across varying slopes]]
