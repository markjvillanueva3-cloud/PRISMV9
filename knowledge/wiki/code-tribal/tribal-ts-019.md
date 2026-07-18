---
name: tribal-ts-019
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["waterline", "contour", "steep-walls", "z-level"]
confidence: 90
source: "web:topsolid-waterline"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-019.md
promoted_at: 2026-05-26T16:07:20.692Z
---

# Waterline Roughing for Steep Wall Regions

TopSolid's waterline (contour) roughing generates Z-level contour passes that follow the part geometry at each depth increment. This is most effective for steep walls (>60° from horizontal) where Z-level passes produce excellent wall quality. Combine waterline roughing for steep zones with planar roughing for flat zones by setting the steep/shallow angle threshold. Use an overlap of 10-15% between the two strategies to prevent ridges at the transition.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-waterline
**Operations:** roughing, 3d_roughing

## Related
- [[bobcad-cam-tips-bc-021|Z-Level Finishing for Steep Walls Over 30 Degrees]]
- [[edgecam-cam-tips-ec-024|Z-Level Finishing for Steep Walls]]
- [[surfcam-cam-tips-sc2-023|Z-Level Finishing for Steep Walls Over 30°]]
- [[bobcad-cam-tips-bc-029|Waterline Roughing for Cavity and Core Work]]
- [[camworks-cam-tips-cw-033|Z-Level Roughing — Waterline Strategy for 3D Cavity Stock Removal]]
