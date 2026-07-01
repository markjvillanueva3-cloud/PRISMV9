---
name: tribal-esp-118
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["probing", "surface-verification", "3d-surface", "deviation"]
confidence: 87
source: "web:esprit-probing"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-118.md
promoted_at: 2026-06-09T22:31:16.239Z
---

# Surface Verification Probing for Complex Geometry

After finishing complex 3D surfaces, program ESPRIT's surface verification probing to check the machined surface against the CAD model. Probe a grid of points across the surface and compare to nominal positions. ESPRIT generates the probing toolpath automatically from the CAD surface, with probe approach vectors normal to the surface. Output results in DMIS format for quality documentation or as a deviation color map for visual analysis.

**Category:** quality
**Confidence:** 87
**Source:** web:esprit-probing
**Operations:** probing

## Related
- [[edgecam-cam-tips-ec-112|Surface Verification After Finishing]]
- [[bobcad-cam-tips-bc-081|Machine Simulation PRO with Full Kinematic Model]]
- [[camworks-cam-tips-cw-115|Setup Probing — Automatic Work Coordinate Establishment]]
- [[camworks-cam-tips-cw-116|Tool Measurement Probing — Verify Tool Length and Diameter On-Machine]]
- [[camworks-cam-tips-cw-117|In-Process Inspection — Verify Critical Dimensions Mid-Program]]
