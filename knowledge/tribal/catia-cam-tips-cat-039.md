---
id: "cat-039"
title: "Face Turning Constant Surface Speed for Uniform Finish"
source: "web:catia-docs"
confidence: 92
category: "cam_strategy"
tags: ["catia", "lathe", "facing", "css", "constant-surface-speed", "turning"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.831Z
---

# Face Turning Constant Surface Speed for Uniform Finish

In CATIA Face Turning, enable Constant Surface Speed (CSS / G96) mode to maintain uniform cutting velocity as the tool moves toward the center. Without CSS, the spindle RPM stays fixed and surface speed drops toward the center, degrading surface finish and increasing built-up edge risk. Set a maximum RPM limit (G50) to prevent the spindle from exceeding its rated speed when the tool is near the center axis.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:catia-docs
**Operations:** face_turning

## Related
- [[catia-cam-tips-cat-157|CATIA Lathe Constant Surface Speed Programming Limits]]
- [[camworks-cam-tips-cw-067|Facing — Optimize Feed Direction and Constant Surface Speed]]
- [[catia-cam-tips-cat-035|Lathe Roughing Strategy Selection Based on Material Hardness]]
- [[catia-cam-tips-cat-036|Lathe Finish Turning Nose Radius Compensation Critical]]
- [[catia-cam-tips-cat-037|Groove Turning Insert Width Must Match or Undersize Groove]]
