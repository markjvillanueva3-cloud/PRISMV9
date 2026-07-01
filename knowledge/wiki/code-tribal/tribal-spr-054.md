---
name: tribal-spr-054
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["steady-rest", "long-shaft", "deflection", "support"]
confidence: 0
source: "web:sprutcam-docs"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-054.md
promoted_at: 2026-06-09T22:31:16.631Z
---

# Steady Rest Programming for Long Shafts

For long shafts (L/D > 6), program steady rest engagement in SprutCAM. Machine the steady rest contact diameter first, then engage the rest before machining other features. Insert M-code for steady rest open/close (typically M10/M11). Set cutting forces direction to push the part INTO the steady rest jaws, not away. Verify clearance between turret tools and the steady rest body in simulation.

**Category:** cam_strategy
**Confidence:** 0.84
**Source:** web:sprutcam-docs
**Operations:** turning

## Related
- [[sprutcam-cam-tips-spr-178|Steady Rest for Long Shaft Support]]
- [[mastercam-cam-tips-mc-266|Mastercam Simulator steady-rest and tailstock collision zones prevent crashes during mill-turn verification]]
- [[bobcad-cam-tips-bc-011|2D Profiling with Cutter Compensation and Spring Passes]]
- [[bobcad-cam-tips-bc-167|BobCAD Swiss-Type Lathe Programming with Guide Bushing]]
- [[bobcad-cam-tips-bc-203|BobCAD Dimensional Uncertainty Budget for Critical Features]]
