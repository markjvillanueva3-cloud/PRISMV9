---
id: "esp-105"
title: "Rapid Planning with Machine Axis Awareness"
source: "web:esprit-optimization"
confidence: 86
category: "cam_strategy"
tags: ["rapid-planning", "traverse", "simultaneous", "axis-motion"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.523Z
---

# Rapid Planning with Machine Axis Awareness

ESPRIT's rapid planning optimizes traverse moves between operations by considering machine axis travel limits and simultaneous axis motion capability. Instead of sequential Z-retract, XY-move, Z-plunge, ESPRIT can generate simultaneous 3-axis rapid moves that arc over the stock surface. Enable 'machine-aware rapid planning' to account for the machine's maximum rapid rates per axis and use compound rapids where the controller supports them (G0 with simultaneous XYZ).

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:esprit-optimization
**Operations:** all

## Related
- [[edgecam-cam-tips-ec-094|Rapid Planning Optimizes Non-Cutting Moves]]
- [[surfcam-cam-tips-sc2-089|Rapid Planning Optimizes Traverse Paths]]
- [[topsolid-cam-tips-ts-106|Rapid Planning Uses Shortest Safe Traverse Paths]]
- [[worknc-cam-tips-wnc-102|Rapid Planning Uses Shortest Collision-Free Paths]]
- [[surfcam-cam-tips-sc2-087|Linking Optimization Minimizes Non-Cutting Time]]
