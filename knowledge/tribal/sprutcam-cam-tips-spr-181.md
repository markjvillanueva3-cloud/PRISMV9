---
id: "spr-181"
title: "Live Tool C-Axis Lock for Heavy Cuts"
source: "web:sprutcam-docs"
confidence: 0.85
category: "cam_strategy"
tags: ["live-tool", "c-axis-lock", "heavy-cuts", "creep"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.017Z
---

# Live Tool C-Axis Lock for Heavy Cuts

For heavy live-tool milling on lathes, engage C-axis lock (brake) to prevent spindle creep under cutting forces. SprutCAM programs M-code for lock/unlock. Live tool RPM typically limited to 3000-6000. Set feeds based on live spindle RPM, not main spindle.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:sprutcam-docs
**Operations:** turning

## Related
- [[bobcad-cam-tips-bc-151|BobCAD Mill-Turn Simultaneous Milling During Turning]]
- [[bobcad-cam-tips-bc-169|BobCAD Swiss-Type Cross-Drilling and Cross-Milling]]
- [[controller-knowledge-tips-ctrl-028|Mazak turning center C-axis and milling M-codes]]
- [[mastercam-cam-tips-mc-083|C-axis milling on lathes requires accurate spindle orient and live tool offset]]
- [[sprutcam-cam-tips-spr-046|Cross-Drilling on Swiss-Type Lathes]]
