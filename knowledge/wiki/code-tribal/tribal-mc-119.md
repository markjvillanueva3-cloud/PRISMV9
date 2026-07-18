---
name: tribal-mc-119
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "wire-edm", "4-axis", "taper", "uv-axis", "draft-angle"]
confidence: 85
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-119.md
promoted_at: 2026-06-09T22:31:16.425Z
---

# 4-axis taper wire EDM requires synchronized upper/lower guide geometry

For 4-axis taper cuts in Mastercam Wire, define separate upper and lower contour profiles that the wire interpolates between. The UV axes control the upper guide offset from the XY lower guide path. Verify that both profiles have the same number of entities and matching start points — mismatched entity counts cause the wire to twist or produce incorrect taper angles. Set the taper angle per-entity when different faces require different draft angles (common in progressive die clearance). Always simulate 4-axis wire paths in solid verification to confirm the ruled surface between upper and lower profiles matches the design intent.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:mastercam-docs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[wedm-knowledge-tips-wedm-jmd-005|UV taper programs: set all H-register offsets to zero]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[esprit-cam-tips-esp-154|Wire EDM 4-Axis Taper Cutting with Independent UV Motion]]
