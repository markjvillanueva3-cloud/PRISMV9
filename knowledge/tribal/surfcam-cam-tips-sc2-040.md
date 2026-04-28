---
id: "sc2-040"
title: "Blade and Impeller Machining with Hub-to-Tip Strategy"
source: "web:surfcam-5axis-impeller"
confidence: 89
category: "cam_strategy"
tags: ["blade", "impeller", "hub-to-tip", "collision-avoidance"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.063Z
---

# Blade and Impeller Machining with Hub-to-Tip Strategy

SURFCAM impeller machining uses specialized hub-to-tip or tip-to-hub strategies that follow the blade surface while avoiding collisions with adjacent blades. The tool axis is controlled relative to the blade surface normal with lead/lag and side-tilt angles. For roughing between blades, use a plunge roughing strategy to minimize lateral forces on thin blades. Set the blade extension check to detect interference with the splitter blade if present.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:surfcam-5axis-impeller
**Operations:** 5_axis, impeller

## Related
- [[bobcad-cam-tips-bc-038|Impeller and Blade Machining with Hub-to-Tip Strategy]]
- [[camworks-cam-tips-cw-051|Blade and Impeller Machining — Dedicated 5-Axis Strategies]]
- [[catia-cam-tips-cat-029|Impeller Blade Machining Requires Split Roughing and Finishing]]
- [[cimatron-cam-tips-cim-190|Impeller and Blade Module]]
- [[edgecam-cam-tips-ec-030|5-Axis Blade and Impeller Machining]]
