---
name: tribal-cw-071
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "turning", "c-axis", "live-tooling", "mill-turn"]
confidence: 88
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-071.md
promoted_at: 2026-06-09T22:31:16.002Z
---

# C-Axis Milling on Lathe — Off-Center Features with Live Tooling

CAMWorks supports C-axis milling for off-center features on lathes with live tooling. Lock the spindle (C-axis mode) and use driven tools for cross-drilling, keyway milling, flat milling, and hex milling. Define the C-axis work coordinate system carefully — the angular origin must match the machine's C-axis home position. For multiple features at different angular positions, optimize the C-axis rotation sequence to minimize indexing time between features.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** mill_turn

## Related
- [[camworks-cam-tips-cw-005|Turned Feature Recognition — Automatic Detection of Lathe Geometry]]
- [[camworks-cam-tips-cw-072|Y-Axis Operations — Off-Centerline Milling for Complex Mill-Turn Parts]]
- [[bobcad-cam-tips-bc-146|BobCAD Mill-Turn C-Axis Milling for Off-Center Features]]
- [[fusion360-cam-tips-ext-f360-078|Live Tooling Coordinate System and Speed Limits]]
- [[solidcam-cam-tips-sc-084|Mill-Turn Live Tooling — RPM vs. CSS Decision for Milling on Lathe]]
