---
id: "ts-019"
title: "Waterline Roughing for Steep Wall Regions"
source: "web:topsolid-waterline"
confidence: 90
category: "cam_strategy"
tags: ["waterline", "contour", "steep-walls", "z-level"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.401Z
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
