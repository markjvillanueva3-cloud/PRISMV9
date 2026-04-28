---
id: "sc2-031"
title: "Waterline Roughing with Multi-Level Z-Step Control"
source: "web:surfcam-3axis-waterline"
confidence: 89
category: "cam_strategy"
tags: ["waterline", "roughing", "z-step", "mold-work", "cavity"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.056Z
---

# Waterline Roughing with Multi-Level Z-Step Control

SURFCAM waterline roughing (Z-level constant) is the workhorse for cavity and core roughing in mold work. Set Z-step to 0.5-1.0xD for carbide end mills. Use variable Z-stepping to add intermediate levels in steep regions (wall angles > 60°) to reduce rest material for the finishing pass. Enable 'Plunge smoothing' to convert sharp Z-transitions into smooth ramped connections. Leave 0.3-0.5mm radial and 0.2mm floor stock for semi-finishing.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:surfcam-3axis-waterline
**Operations:** roughing, 3d_milling

## Related
- [[bobcad-cam-tips-bc-029|Waterline Roughing for Cavity and Core Work]]
- [[gibbscam-cam-tips-gc-014|Waterline roughing with constant Z-step provides predictable load per level]]
- [[camworks-cam-tips-cw-033|Z-Level Roughing — Waterline Strategy for 3D Cavity Stock Removal]]
- [[catia-cam-tips-cat-049|Waterline Roughing Optimal for Complex 3D Cavity Shapes]]
- [[mastercam-cam-tips-mc-060|Waterline finishing is mandatory for steep walls above 60 degrees]]
