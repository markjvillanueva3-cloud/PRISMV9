---
id: "cim-017"
title: "Copper Electrode EDM Burn Compensation"
source: "web:cimatron-forum"
confidence: 0.87
category: "cam_strategy"
tags: ["copper", "electrode", "edm-wear", "compensation"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.995Z
---

# Copper Electrode EDM Burn Compensation

When designing copper electrodes in Cimatron, account for electrode wear during EDM burn. For roughing burns, add 0.1mm additional material to the electrode (undersize = spark gap + wear). For finishing burns, use 'No Wear' settings with orbiting. Create separate roughing and finishing electrode copies with different undersizes in the same electrode set.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:cimatron-forum
**Operations:** electrode_machining

## Related
- [[cimatron-cam-tips-cim-148|Copper Electrode Machining Parameters]]
- [[hypermill-cam-tips-ext-hm-134|Electrode Machining Workflow]]
- [[powermill-cam-tips-pm-122|Copper EDM Electrode Finishing]]
- [[sprutcam-cam-tips-spr-065|Copper and Brass Machining Parameters]]
- [[sprutcam-cam-tips-spr-154|Electrode Machining for EDM]]
