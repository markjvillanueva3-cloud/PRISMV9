---
name: tribal-teb-031
category: code-tribal
subdomain: finishing
domain: tribal-knowledge
tags: ["z-constant", "steep-wall", "cusp-height", "contour"]
confidence: 93
source: "web:tebis-docs"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-031.md
promoted_at: 2026-05-26T16:07:20.627Z
---

# Z-Constant Finishing Produces Best Results on Steep Walls

Tebis Z-constant finishing generates horizontal contour passes at fixed Z increments. Best for surfaces steeper than 30° from horizontal. Set Z step based on desired cusp height: step = 2 * sqrt(2*R*h - h²) where R is ball radius and h is cusp height. For 0.005mm cusp with R10mm ball: step = 0.63mm. Enable automatic slope detection to switch to 3D-equidistant on shallow areas. The transition angle is typically set at 30-45°.

**Category:** finishing
**Confidence:** 93
**Source:** web:tebis-docs
**Operations:** finishing

## Related
- [[gibbscam-cam-tips-gc-011|Z-level finishing excels on steep walls with constant scallop height]]
- [[mastercam-cam-tips-mc-130|Taper barrel cutters combine wall finishing and floor blending in a single tool]]
- [[mastercam-cam-tips-mc-281|Constant-Z finishing with adaptive stepdown produces best surface finish on steep mold cavity walls]]
- [[bobcad-cam-tips-bc-024|Scallop Machining with Constant Cusp Height]]
- [[cimatron-cam-tips-cim-003|Z-Level Finishing with Constant Cusp Height]]
