---
name: tribal-cat-152
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "lathe", "grooving", "plunge", "multi-pass"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-152.md
promoted_at: 2026-06-09T22:31:16.066Z
---

# CATIA Lathe Grooving with Multi-Pass Plunge Strategy

In CATIA Lathe Machining, the Grooving operation supports multi-pass plunge cutting for wide grooves. Define the groove profile geometry (rectangular, V-shaped, or custom profile), then set 'Number of Plunges' based on groove width / tool width ratio. CATIA distributes plunges evenly and adds a finish pass along the groove bottom and walls. For groove widths less than 2x the tool width, use single-plunge with side-wall finish passes. Set the dwell time at the bottom of each plunge (0.5-1 revolution) to achieve clean groove bottom finish and stable chip breaking.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:catia-docs
**Operations:** turning

## Related
- [[catia-cam-tips-cat-005|Groove Machining With Controlled Plunge and Retract]]
- [[catia-cam-tips-cat-035|Lathe Roughing Strategy Selection Based on Material Hardness]]
- [[catia-cam-tips-cat-036|Lathe Finish Turning Nose Radius Compensation Critical]]
- [[catia-cam-tips-cat-037|Groove Turning Insert Width Must Match or Undersize Groove]]
- [[catia-cam-tips-cat-038|Thread Turning Infeed Strategy Affects Thread Quality]]
