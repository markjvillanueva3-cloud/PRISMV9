---
name: tribal-sc2-026
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["scallop", "cusp-height", "constant-cusp", "surface-quality"]
confidence: 91
source: "web:surfcam-3axis-scallop"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-026.md
promoted_at: 2026-05-26T16:07:20.510Z
---

# Scallop-Based Stepover for Constant Cusp Height

SURFCAM scallop machining uses a constant cusp height rather than constant stepover distance. On convex surfaces the stepover increases (wider spacing), on concave surfaces it decreases (tighter spacing). This produces visually uniform surface quality across varying curvature. Target cusp height for mold finishing is typically 0.003-0.010mm. For semi-finish passes, use 0.03-0.05mm cusp height. The computation time is longer than constant-stepover but the quality improvement is significant.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:surfcam-3axis-scallop
**Operations:** finishing, 3d_milling

## Related
- [[bobcad-cam-tips-bc-024|Scallop Machining with Constant Cusp Height]]
- [[esprit-cam-tips-esp-014|Scallop-Based Finishing Maintains Constant Cusp Height]]
- [[topsolid-cam-tips-ts-023|Scallop-Height Finishing Ensures Uniform Surface Quality]]
- [[camworks-cam-tips-cw-039|Scallop Finishing — Constant Cusp Height Across Variable Curvature]]
- [[camworks-cam-tips-cw-111|Scallop Height Control — Calculate Step-Over for Target Ra]]
