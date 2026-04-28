---
id: "ec-112"
title: "Surface Verification After Finishing"
source: "web:edgecam-probing"
confidence: 87
category: "quality"
tags: ["surface-verification", "probing", "dmis", "deviation"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.353Z
---

# Surface Verification After Finishing

After finishing complex 3D surfaces, program surface verification probing to check the machined surface against the CAD model. Probe a grid of points across the surface and compare to nominal. Edgecam generates probing toolpaths from the CAD surface with approach vectors normal to the surface. Output results in DMIS format for quality documentation or as a deviation map for visual analysis.

**Category:** quality
**Confidence:** 87
**Source:** web:edgecam-probing
**Operations:** probing

## Related
- [[esprit-cam-tips-esp-118|Surface Verification Probing for Complex Geometry]]
- [[bobcad-cam-tips-bc-081|Machine Simulation PRO with Full Kinematic Model]]
- [[camworks-cam-tips-cw-115|Setup Probing — Automatic Work Coordinate Establishment]]
- [[camworks-cam-tips-cw-116|Tool Measurement Probing — Verify Tool Length and Diameter On-Machine]]
- [[camworks-cam-tips-cw-117|In-Process Inspection — Verify Critical Dimensions Mid-Program]]
