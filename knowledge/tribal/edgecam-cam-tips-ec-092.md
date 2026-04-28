---
id: "ec-092"
title: "Linking Strategy Reduces Non-Cutting Travel"
source: "web:edgecam-optimization"
confidence: 88
category: "cam_strategy"
tags: ["linking", "retract", "non-cutting", "cycle-time"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.323Z
---

# Linking Strategy Reduces Non-Cutting Travel

Edgecam's linking controls tool movement between passes. Options: retract to clearance plane (safe but slow), stock clearance retract (moderate), smooth arc transitions (fast with collision check), and direct traverse (fastest but risky). For roughing, use stock clearance retracts. For finishing, use smooth arc transitions with collision checking. Optimized linking typically saves 10-25% of total cycle time compared to default clearance-plane retracts.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:edgecam-optimization
**Operations:** roughing, 3d_finishing

## Related
- [[esprit-cam-tips-esp-104|Linking Strategy Optimization Reduces Non-Cutting Time]]
- [[gibbscam-cam-tips-gc-099|Linking optimization reduces non-cutting travel between operations]]
- [[topsolid-cam-tips-ts-104|Linking Optimization Minimizes Non-Cutting Moves]]
- [[worknc-cam-tips-wnc-100|Linking Optimization Minimizes Non-Cutting Time]]
- [[bobcad-cam-tips-bc-136|BobCAD V37 Stock-Aware Toolpath Linking and Rapid Moves]]
