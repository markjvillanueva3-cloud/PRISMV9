---
id: "cat-157"
title: "CATIA Lathe Constant Surface Speed Programming Limits"
source: "web:catia-docs"
confidence: 0.89
category: "cam_strategy"
tags: ["catia", "lathe", "css", "constant-surface-speed", "rpm-limit"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.939Z
---

# CATIA Lathe Constant Surface Speed Programming Limits

When using Constant Surface Speed (CSS / G96) in CATIA Lathe Machining, always set the maximum spindle RPM limit (G50 Sxxxx) to prevent over-speed at small diameters. In CATIA, configure this in the Spindle tab of the operation: 'Max Spindle Speed' field. Calculate the limit as: RPM_max = (Vc × 1000) / (π × D_min), where D_min is the smallest diameter machined. For operations approaching center (facing, drilling), CATIA automatically switches to constant RPM at the transition diameter. Set the transition diameter to 10-15mm to avoid excessive RPM at near-zero diameters.

**Category:** cam_strategy
**Confidence:** 0.89
**Source:** web:catia-docs
**Operations:** turning

## Related
- [[catia-cam-tips-cat-039|Face Turning Constant Surface Speed for Uniform Finish]]
- [[edgecam-cam-tips-ec-041|Turning Face Cycle with Constant Surface Speed]]
- [[catia-cam-tips-cat-035|Lathe Roughing Strategy Selection Based on Material Hardness]]
- [[catia-cam-tips-cat-036|Lathe Finish Turning Nose Radius Compensation Critical]]
- [[catia-cam-tips-cat-037|Groove Turning Insert Width Must Match or Undersize Groove]]
