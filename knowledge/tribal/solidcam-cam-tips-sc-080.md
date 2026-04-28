---
id: "sc-080"
title: "Threading — Multi-Start Thread Entry Synchronization"
source: "web:solidcam-docs"
confidence: 87
category: "cam_strategy"
tags: ["solidcam", "turning", "threading", "multi-start", "infeed-angle"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.725Z
---

# Threading — Multi-Start Thread Entry Synchronization

For multi-start threads in SolidCAM, define each start as a separate threading operation with the correct angular offset (360 / number of starts). Use the C-axis orientation command before each thread start to position the spindle. Set the thread infeed to Modified Flank (29-30 degree infeed angle) rather than radial plunge for multi-start threads — radial infeed on large-pitch multi-start threads creates excessive chip width that causes chatter and poor thread surface finish.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:solidcam-docs
**Operations:** threading

## Related
- [[solidcam-cam-tips-sc-171-2|iMachining 2D vs 3D Strategy Selection]]
- [[solidcam-cam-tips-sc-078|Turning Roughing — Use Wiper Insert Geometry for Better Surface Direct from Rough]]
- [[solidcam-cam-tips-sc-079|Turning Finishing — Constant Surface Speed Transition Zone]]
- [[solidcam-cam-tips-sc-081|Grooving — Peck Cycle with Chip Breaking for Deep Grooves]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
