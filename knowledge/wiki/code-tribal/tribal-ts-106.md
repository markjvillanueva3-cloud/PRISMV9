---
name: tribal-ts-106
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["rapid-planning", "traverse", "collision-free", "gantry"]
confidence: 89
source: "web:topsolid-rapid"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-106.md
promoted_at: 2026-06-09T22:31:16.765Z
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
