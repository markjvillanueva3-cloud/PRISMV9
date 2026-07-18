---
name: tribal-esp-133
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["swiss-type", "c-axis", "live-tooling", "polar-interpolation", "milling"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-133.md
promoted_at: 2026-06-09T22:31:16.243Z
---

# Swiss-Type C-Axis Milling on Main and Sub Spindle

ESPRIT programs C-axis milling on Swiss-type lathes by orienting the spindle (C-axis lock or interpolation) while the live tooling spindle provides cutting rotation. For cross-flats and keyways, use C-axis positioning with Y-axis offset for off-center features. For hexagonal profiles, use C-axis interpolation (G12.1/polar interpolation on Fanuc) — ESPRIT automatically converts XY milling paths to C-Z polar coordinates. On machines with both main and sub-spindle C-axis, program hex features before cutoff on the main side and cross-holes after pickup on the sub side.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:esprit-docs
**Operations:** milling, turning_finishing

## Related
- [[surfcam-cam-tips-sc2-157|SURFCAM Swiss-Type Live Tooling Cross-Drilling]]
- [[edgecam-cam-tips-ec-045|C-Axis Milling for Flats and Hexes on Turned Parts]]
- [[bobcad-cam-tips-bc-169|BobCAD Swiss-Type Cross-Drilling and Cross-Milling]]
- [[esprit-cam-tips-esp-042|Swiss B-Axis Milling for Complex Angled Features]]
- [[esprit-cam-tips-esp-048|Y-Axis Milling on Swiss for Off-Center Features]]
