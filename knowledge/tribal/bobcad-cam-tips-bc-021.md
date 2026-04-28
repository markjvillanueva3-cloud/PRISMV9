---
id: "bc-021"
title: "Z-Level Finishing for Steep Walls Over 30 Degrees"
source: "web:bobcad-zlevel"
confidence: 92
category: "cam_strategy"
tags: ["z-level", "waterline", "steep-walls", "scallop-height", "smooth-connect"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.460Z
---

# Z-Level Finishing for Steep Walls Over 30 Degrees

BobCAD Z-level (waterline) finishing produces the best surface finish on steep walls (>30° from horizontal). Set Z-step based on target scallop height using the built-in calculator. For a 10mm ball nose targeting 0.005mm scallop, Z-step is approximately 0.45mm. Enable 'Smooth connect' between levels to eliminate witness marks at Z-transitions. Use climb milling for hardened steel. BobCAD V36+ supports variable Z-step that adds intermediate levels in regions of high curvature.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:bobcad-zlevel
**Operations:** finishing, 3d_milling

## Related
- [[surfcam-cam-tips-sc2-023|Z-Level Finishing for Steep Walls Over 30°]]
- [[edgecam-cam-tips-ec-024|Z-Level Finishing for Steep Walls]]
- [[topsolid-cam-tips-ts-019|Waterline Roughing for Steep Wall Regions]]
- [[bobcad-cam-tips-bc-029|Waterline Roughing for Cavity and Core Work]]
- [[camworks-cam-tips-cw-033|Z-Level Roughing — Waterline Strategy for 3D Cavity Stock Removal]]
