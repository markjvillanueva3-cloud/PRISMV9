---
name: tribal-cat-039
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "lathe", "facing", "css", "constant-surface-speed", "turning"]
confidence: 92
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-039.md
promoted_at: 2026-05-26T16:07:20.041Z
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
