---
name: tribal-wnc-102
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["rapid-planning", "collision-free", "traverse", "gantry"]
confidence: 89
source: "web:worknc-rapid"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-102.md
promoted_at: 2026-06-09T22:31:16.813Z
---

# Rapid Planning Uses Shortest Collision-Free Paths

WorkNC's rapid movement planner calculates shortest collision-free traverse paths between operations. The planner considers current stock shape, fixtures, and machine structure. Enable 'Optimized rapids' to route moves around obstacles instead of always retracting to safe plane. Especially effective on large gantry machines where retracting to safe Z adds significant travel time.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:worknc-rapid
**Operations:** general

## Related
- [[topsolid-cam-tips-ts-106|Rapid Planning Uses Shortest Safe Traverse Paths]]
- [[edgecam-cam-tips-ec-094|Rapid Planning Optimizes Non-Cutting Moves]]
- [[esprit-cam-tips-esp-105|Rapid Planning with Machine Axis Awareness]]
- [[surfcam-cam-tips-sc2-089|Rapid Planning Optimizes Traverse Paths]]
- [[surfcam-cam-tips-sc2-087|Linking Optimization Minimizes Non-Cutting Time]]
