---
name: tribal-bc-029
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["waterline", "roughing", "z-level", "mold-work", "over-machine"]
confidence: 89
source: "web:bobcad-waterline"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-029.md
promoted_at: 2026-06-09T22:31:15.938Z
---

# Waterline Roughing for Cavity and Core Work

BobCAD waterline roughing (Z-level constant) is the workhorse for mold cavity and core roughing. Set Z-step to 0.5-1.0xD for carbide end mills. Use variable Z-stepping in steep regions to reduce rest material for finishing. Leave 0.3-0.5mm radial and 0.2mm floor stock. Enable 'Plunge smoothing' for smooth Z-transitions. For V36+, the Over Machine option compensates for tool deflection in hard metals by adding a slight extra stock removal on deep passes.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:bobcad-waterline
**Operations:** roughing, 3d_milling

## Related
- [[camworks-cam-tips-cw-033|Z-Level Roughing — Waterline Strategy for 3D Cavity Stock Removal]]
- [[surfcam-cam-tips-sc2-031|Waterline Roughing with Multi-Level Z-Step Control]]
- [[bobcad-cam-tips-bc-021|Z-Level Finishing for Steep Walls Over 30 Degrees]]
- [[catia-cam-tips-cat-049|Waterline Roughing Optimal for Complex 3D Cavity Shapes]]
- [[edgecam-cam-tips-ec-024|Z-Level Finishing for Steep Walls]]
