---
id: "ts-106"
title: "Rapid Planning Uses Shortest Safe Traverse Paths"
source: "web:topsolid-rapid"
confidence: 89
category: "cam_strategy"
tags: ["rapid-planning", "traverse", "collision-free", "gantry"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.467Z
---

# Rapid Planning Uses Shortest Safe Traverse Paths

TopSolid's rapid movement planner calculates the shortest collision-free path between operations, tool changes, and between cutting passes. The planner considers the current stock shape, fixtures, and machine structure. Enable 'Optimized rapids' to allow the system to route rapid moves around obstacles rather than always retracting to the safe plane. This is especially effective on gantry machines with large work envelopes where retracting to safe Z adds significant travel time.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:topsolid-rapid
**Operations:** general

## Related
- [[worknc-cam-tips-wnc-102|Rapid Planning Uses Shortest Collision-Free Paths]]
- [[edgecam-cam-tips-ec-094|Rapid Planning Optimizes Non-Cutting Moves]]
- [[esprit-cam-tips-esp-105|Rapid Planning with Machine Axis Awareness]]
- [[surfcam-cam-tips-sc2-089|Rapid Planning Optimizes Traverse Paths]]
- [[surfcam-cam-tips-sc2-087|Linking Optimization Minimizes Non-Cutting Time]]
