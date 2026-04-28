---
id: "sc2-089"
title: "Rapid Planning Optimizes Traverse Paths"
source: "web:surfcam-rapid-planning"
confidence: 87
category: "optimization"
tags: ["rapid-planning", "traverse", "clearance-envelope", "multi-pocket"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.099Z
---

# Rapid Planning Optimizes Traverse Paths

SURFCAM rapid planning optimizes the order and path of rapid traverse moves between cutting regions. Instead of retracting to a fixed high plane for every traverse, the system calculates a clearance envelope above the in-process stock and routes rapids just above this envelope. For multi-pocket parts, this can save 30-60 seconds per pocket compared to fixed-height rapids. Enable 'Intelligent rapids' and set the clearance offset to 5mm above stock.

**Category:** optimization
**Confidence:** 87
**Source:** web:surfcam-rapid-planning
**Operations:** roughing, drilling

## Related
- [[edgecam-cam-tips-ec-094|Rapid Planning Optimizes Non-Cutting Moves]]
- [[esprit-cam-tips-esp-105|Rapid Planning with Machine Axis Awareness]]
- [[topsolid-cam-tips-ts-106|Rapid Planning Uses Shortest Safe Traverse Paths]]
- [[worknc-cam-tips-wnc-102|Rapid Planning Uses Shortest Collision-Free Paths]]
- [[surfcam-cam-tips-sc2-087|Linking Optimization Minimizes Non-Cutting Time]]
