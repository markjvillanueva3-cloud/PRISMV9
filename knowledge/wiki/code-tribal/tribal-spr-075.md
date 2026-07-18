---
name: tribal-spr-075
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["3-plus-2", "indexed", "multi-face", "rigidity"]
confidence: 0
source: "web:sprutcam-docs"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-075.md
promoted_at: 2026-06-09T22:31:16.635Z
---

# 3+2 Axis Positioning for Multi-Face Machining

3+2 axis (positional 5-axis) locks the rotary axes at a fixed angle for each operation. In SprutCAM, define the indexed angle for each face. Use 3+2 when simultaneous 5-axis isn't needed — it's simpler to program, more rigid (locked axes), and most machines can achieve higher accuracy in locked position. Create separate operations for each index angle with appropriate WCS offsets.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:sprutcam-docs
**Operations:** multi_axis

## Related
- [[cimatron-cam-tips-cim-054|3+2 Axis Indexed Machining for Multi-Face Parts]]
- [[fusion360-cam-tips-ext-f360-135|3+2 Indexed Multi-Face Machining Setup]]
- [[mastercam-cam-tips-mc-071|3+2 positioning uses indexed tilts instead of simultaneous 5-axis for rigidity]]
- [[tebis-cam-tips-teb-060|3+2 Axis Indexed Machining for Multi-Face Parts]]
- [[edgecam-cam-tips-ec-027|Indexed 3+2 Machining for Multi-Face Parts]]
