---
id: "sc2-064"
title: "Collision Detection for Tool Assembly and Fixtures"
source: "web:surfcam-collision"
confidence: 90
category: "setup"
tags: ["collision-detection", "fixtures", "tool-assembly", "near-miss"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.080Z
---

# Collision Detection for Tool Assembly and Fixtures

SURFCAM collision detection checks the entire tool assembly (cutter, holder, arbor, spindle nose) against the stock, fixtures, clamps, and machine table at every toolpath point. Import fixture models as STL or solid files and assign them as collision objects. Set the near-miss threshold to 2mm to receive warnings before actual collisions. For 5-axis operations, collision detection must include the machine head and trunnion/table to catch axis-limit and interference issues.

**Category:** setup
**Confidence:** 90
**Source:** web:surfcam-collision
**Operations:** verification

## Related
- [[bobcad-cam-tips-bc-082|Collision Detection for Tool Assembly and Fixtures]]
- [[edgecam-cam-tips-ec-064|Fixture Modeling for Collision Detection]]
- [[gibbscam-cam-tips-gc-198|GibbsCAM simulation fixture and clamp modeling catches collisions before first article]]
- [[nx-cam-tips-ext-nx-097|Collision Detection with Time-Based Analysis]]
- [[controller-knowledge-tips-ctrl-121|Index/Traub virtual machine for collision-free multi-spindle setup]]
