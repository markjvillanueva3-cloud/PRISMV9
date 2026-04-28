---
id: "cim-054"
title: "3+2 Axis Indexed Machining for Multi-Face Parts"
source: "web:cimatron-docs"
confidence: 0.88
category: "cam_strategy"
tags: ["3-plus-2", "indexed", "multi-face", "positional"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.025Z
---

# 3+2 Axis Indexed Machining for Multi-Face Parts

3+2 axis (positional 5-axis) locks rotary axes at fixed angles per operation. In Cimatron, define the indexed orientation for each face. Use when simultaneous 5-axis isn't needed — higher rigidity (locked axes), better accuracy, simpler post-processing. Create separate operations per indexed angle with appropriate WCS offsets. Most mold work uses 3+2 rather than full simultaneous.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:cimatron-docs
**Operations:** multi_axis

## Related
- [[tebis-cam-tips-teb-060|3+2 Axis Indexed Machining for Multi-Face Parts]]
- [[fusion360-cam-tips-ext-f360-135|3+2 Indexed Multi-Face Machining Setup]]
- [[mastercam-cam-tips-mc-071|3+2 positioning uses indexed tilts instead of simultaneous 5-axis for rigidity]]
- [[sprutcam-cam-tips-spr-075|3+2 Axis Positioning for Multi-Face Machining]]
- [[mastercam-cam-tips-mc-053|3+2 Automatic Roughing outperforms OptiRough on steep-walled prismatic parts]]
