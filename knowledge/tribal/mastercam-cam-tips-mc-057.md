---
id: "mc-057"
title: "Flowline finishing follows UV surface direction for best finish on shaped parts"
source: "web:mastercam-docs"
confidence: 84
category: "cam_strategy"
tags: ["mastercam", "flowline", "uv-direction", "nurbs", "aerodynamic", "turbine"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.151Z
---

# Flowline finishing follows UV surface direction for best finish on shaped parts

Flowline drives the tool along the natural UV flow of NURBS surfaces, producing toolpaths that follow the part's design intent. This gives the best finish quality on aerodynamic, turbine blade, and boat hull surfaces where machining marks aligned with flow improve both aesthetics and function. Select drive and cross-curve chains that match the primary and secondary surface directions. Flowline requires clean surface topology — poorly trimmed or patched surfaces cause erratic tool motion.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:mastercam-docs
**Operations:** finishing, 3d_finishing

## Related
- [[mastercam-cam-tips-mc-245|Flowline machining follows the natural UV direction of surfaces for optimal cutter contact]]
- [[mastercam-cam-tips-mc-066|Flow 5-axis is the primary toolpath for impeller and turbine blade channels]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[bobcad-cam-tips-bc-022|Flowline Finishing Follows Surface UV Direction]]
