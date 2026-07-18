---
name: tribal-bc-021
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["z-level", "waterline", "steep-walls", "scallop-height", "smooth-connect"]
confidence: 92
source: "web:bobcad-zlevel"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-021.md
promoted_at: 2026-05-26T16:07:19.757Z
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
