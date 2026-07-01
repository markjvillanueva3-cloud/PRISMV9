---
name: tribal-sc2-028
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["raster", "parallel", "cutting-angle", "bidirectional"]
confidence: 89
source: "web:surfcam-3axis-raster"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-028.md
promoted_at: 2026-06-09T22:31:16.668Z
---

# Raster (Parallel) Finishing with Angle Optimization

SURFCAM raster machining uses parallel passes at a user-specified angle. The optimal angle minimizes the number of retract/reposition moves — align the raster direction with the longest dimension of the machining region. For rectangular pockets, 0° or 90° is optimal. For irregular shapes, test 2-3 angles and compare cycle times in the toolpath statistics. Use zigzag (bidirectional) cutting for fastest cycle time, or unidirectional climb for best finish.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:surfcam-3axis-raster
**Operations:** finishing, 3d_milling

## Related
- [[bobcad-cam-tips-bc-026|Raster Finishing with Angle Optimization]]
- [[worknc-cam-tips-wnc-031|Parallel Finishing with Optimized Cut Angle]]
- [[esprit-cam-tips-esp-016|Raster Finishing with Optimized Cut Direction]]
- [[solidcam-cam-tips-sc-060|HSM Linear Finishing — Optimal Angle for Surface Quality]]
- [[topsolid-cam-tips-ts-029|Parallel Finishing with Optimized Cut Direction]]
