---
name: tribal-ec-047
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["live-tooling", "mill-turn", "driven-tools", "b-axis"]
confidence: 88
source: "web:edgecam-turning"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-047.md
promoted_at: 2026-06-09T22:31:16.171Z
---

# Live Tooling Strategy for Mill-Turn Machines

Edgecam fully supports live (driven) tooling for milling, drilling, and tapping on turning centers. Key considerations: live tool spindles have lower power (0.5-3 kW) and speed (6,000-12,000 RPM) than machining centers — reduce speeds and feeds by 30-40%. Use the smallest effective tool diameter to maximize RPM. For cross-drilling, pecking is essential due to limited holder rigidity. Program B-axis positioning for angled features on upper turret machines.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:edgecam-turning
**Operations:** mill_turn

## Related
- [[mastercam-cam-tips-mc-253|Mastercam 2025 B-axis contour turning enables complex profile turning with live tooling on mill-turn]]
- [[bobcad-cam-tips-bc-055|Live Tooling Operations with Speed and Feed Optimization]]
- [[bobcad-cam-tips-bc-146|BobCAD Mill-Turn C-Axis Milling for Off-Center Features]]
- [[camworks-cam-tips-cw-071|C-Axis Milling on Lathe — Off-Center Features with Live Tooling]]
- [[fusion360-cam-tips-ext-f360-078|Live Tooling Coordinate System and Speed Limits]]
