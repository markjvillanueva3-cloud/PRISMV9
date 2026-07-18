---
name: tribal-ec-198
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["power-skiving", "internal-gear", "mill-turn", "synchronized"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-198.md
promoted_at: 2026-06-09T22:31:16.207Z
---

# Power Skiving Programming for Internal Gears

Program power skiving for internal gears on mill-turn machines using Edgecam's synchronized spindle mode. The skiving cutter rotates at high speed (synchronous with workpiece rotation) at a cross-axis angle (typically 15-25°). Define the gear geometry: module, number of teeth, pressure angle, helix angle. Edgecam calculates the skiving cutter path from the gear data. Program multiple passes with increasing depth (0.05-0.15mm radial per pass) to manage cutting forces and tool wear.

**Category:** cam_strategy
**Confidence:** 0.8
**Source:** web:edgecam-docs
**Operations:** turning, milling

## Related
- [[bobcad-cam-tips-bc-149|BobCAD Mill-Turn Thread Chasing with Synchronized Spindle]]
- [[controller-knowledge-tips-ctrl-044|EMAG VL/VT machines with Siemens 840D integration]]
- [[edgecam-cam-tips-ec-200|Skiving Cutter Speed Ratio and Synchronization Setup]]
- [[esprit-cam-tips-esp-167|B-Axis Skiving for Internal Gear and Spline Profiles]]
- [[esprit-cam-tips-esp-191|Gear Shaping for Internal and External Gears]]
