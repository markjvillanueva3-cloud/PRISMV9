---
id: "spr-052"
title: "Live Tool Milling on Lathes"
source: "web:sprutcam-docs"
confidence: 0.85
category: "cam_strategy"
tags: ["live-tool", "milling", "lathe", "c-axis"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.919Z
---

# Live Tool Milling on Lathes

SprutCAM programs live tool milling operations on turning centers. Define the live tool in the turret with its orientation (axial, radial, or angled). Program C-axis positioning for feature location. Set feeds and speeds based on the live tool spindle RPM (typically limited to 3000-6000 RPM). For heavy cuts, engage the C-axis lock (C-axis brake) to prevent spindle creep under cutting forces.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:sprutcam-docs
**Operations:** turning

## Related
- [[controller-knowledge-tips-ctrl-028|Mazak turning center C-axis and milling M-codes]]
- [[bobcad-cam-tips-bc-169|BobCAD Swiss-Type Cross-Drilling and Cross-Milling]]
- [[mastercam-cam-tips-mc-083|C-axis milling on lathes requires accurate spindle orient and live tool offset]]
- [[sprutcam-cam-tips-spr-046|Cross-Drilling on Swiss-Type Lathes]]
- [[edgecam-cam-tips-ec-045|C-Axis Milling for Flats and Hexes on Turned Parts]]
