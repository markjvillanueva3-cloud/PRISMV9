---
name: tribal-ec-019
category: code-tribal
subdomain: surface_finish
domain: tribal-knowledge
tags: ["3d-finishing", "raster", "scallop", "cusp-height"]
confidence: 89
source: "web:edgecam-milling"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-019.md
promoted_at: 2026-06-09T22:31:16.165Z
---

# 3D Finish with Raster and Scallop Control

For 3D finishing in Edgecam, choose between raster (parallel lines) and scallop (constant cusp height) strategies based on surface geometry. Raster is faster for gently curved surfaces; scallop produces more uniform finish on varying curvature. Set the target scallop height: 0.005-0.01mm for semi-finish, 0.001-0.003mm for final finish. Use a ball-nose cutter and enable bi-directional cutting for roughing passes, uni-directional climb for finishing.

**Category:** surface_finish
**Confidence:** 89
**Source:** web:edgecam-milling
**Operations:** 3d_finishing

## Related
- [[mastercam-cam-tips-mc-054|Scallop toolpath produces uniform cusp height across varying surface curvature]]
- [[bobcad-cam-tips-bc-024|Scallop Machining with Constant Cusp Height]]
- [[cimatron-cam-tips-cim-026|Surface Quality Optimization via Scallop Control]]
- [[esprit-cam-tips-esp-014|Scallop-Based Finishing Maintains Constant Cusp Height]]
- [[surfcam-cam-tips-sc2-026|Scallop-Based Stepover for Constant Cusp Height]]
