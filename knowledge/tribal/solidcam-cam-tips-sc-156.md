---
id: "sc-156"
title: "Swiss-Type Pinch Turning — Reduce Deflection on Slender Parts"
source: "web:solidcam-forum"
confidence: 79
category: "cam_strategy"
tags: ["solidcam", "swiss-type", "pinch-turning", "deflection", "slender-parts"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.784Z
---

# Swiss-Type Pinch Turning — Reduce Deflection on Slender Parts

For Swiss-type parts with L/D ratio exceeding 4:1, use pinch turning (simultaneous front and back tool engagement) to counteract cutting forces and minimize deflection. In SolidCAM, program two synchronized turning operations: the primary roughing cut on the main tool post and a support tool on the opposing gang slide applying light pressure (0.02-0.05mm depth). Set the support tool 180 degrees opposite the cutting tool. The Synchronization Manager ensures both tools engage and retract simultaneously. This technique holds diameter tolerance within ±0.005mm on shafts up to 8:1 L/D ratio.

**Category:** cam_strategy
**Confidence:** 79
**Source:** web:solidcam-forum
**Operations:** turning, swiss

## Related
- [[solidcam-cam-tips-sc-153-2|Kienzle Force Verification for iMachining]]
- [[solidcam-cam-tips-sc-164-2|BMA for Multi-Material Tool Life]]
- [[solidcam-cam-tips-sc-170-2|iMachining Material Level Calibration]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
