---
id: "bc-038"
title: "Impeller and Blade Machining with Hub-to-Tip Strategy"
source: "web:bobcad-impeller"
confidence: 88
category: "cam_strategy"
tags: ["impeller", "blade", "hub-to-tip", "plunge-roughing"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.473Z
---

# Impeller and Blade Machining with Hub-to-Tip Strategy

BobCAD's multiaxis module handles impeller machining with hub-to-tip strategies that follow blade surfaces while avoiding collisions with adjacent blades. Tool axis is controlled relative to blade surface normal with configurable lead/lag and side-tilt. For roughing between blades, use plunge roughing to minimize lateral forces on thin blades. Set blade extension check for splitter blade interference detection. Use 5-axis simultaneous for full blade surface coverage.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:bobcad-impeller
**Operations:** 5_axis, impeller

## Related
- [[cimatron-cam-tips-cim-190|Impeller and Blade Module]]
- [[surfcam-cam-tips-sc2-040|Blade and Impeller Machining with Hub-to-Tip Strategy]]
- [[camworks-cam-tips-cw-051|Blade and Impeller Machining — Dedicated 5-Axis Strategies]]
- [[catia-cam-tips-cat-029|Impeller Blade Machining Requires Split Roughing and Finishing]]
- [[edgecam-cam-tips-ec-030|5-Axis Blade and Impeller Machining]]
