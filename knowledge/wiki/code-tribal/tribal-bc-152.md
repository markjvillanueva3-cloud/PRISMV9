---
name: tribal-bc-152
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["mill-turn", "turret", "tool-stations", "orientation", "dual-turret"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-152.md
promoted_at: 2026-06-09T22:31:15.969Z
---

# BobCAD Mill-Turn Turret Management and Tool Station Assignment

BobCAD's mill-turn turret management assigns tools to specific turret stations with proper orientation (ID/OD/face). Define the turret configuration: number of stations (8-24), tool orientation per station (axial, radial, angular), and whether the station supports live tooling. Assign BobCAD tools to physical stations matching the turret layout. The post processor outputs the correct T-code and turret index command. For dual-turret machines, assign roughing tools to the upper turret and finishing tools to the lower for simultaneous cutting. Verify that no two operations on the same turret use adjacent stations simultaneously — the tools would collide.

**Category:** setup
**Confidence:** 0.86
**Source:** web:bobcad-docs
**Operations:** turning, milling

## Related
- [[esprit-cam-tips-esp-146|Mill-Turn Balanced Roughing with Dual Turrets]]
- [[surfcam-cam-tips-sc2-211|SURFCAM Multi-Channel Post for Mill-Turn Machines]]
- [[bobcad-cam-tips-bc-053|C-Axis Milling on Turning Centers]]
- [[bobcad-cam-tips-bc-054|Y-Axis Milling for Off-Center Features]]
- [[bobcad-cam-tips-bc-082|Collision Detection for Tool Assembly and Fixtures]]
