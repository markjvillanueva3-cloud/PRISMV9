---
id: "ec-200"
title: "Skiving Cutter Speed Ratio and Synchronization Setup"
source: "web:edgecam-forum"
confidence: 0.78
category: "speeds_feeds"
tags: ["power-skiving", "speed-ratio", "synchronization", "electronic-gear"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.422Z
---

# Skiving Cutter Speed Ratio and Synchronization Setup

Configure the speed ratio between skiving cutter and workpiece in Edgecam based on the gear ratio: N_cutter/N_work = Z_work/Z_cutter where Z is number of teeth. For a 48-tooth workpiece with a 24-tooth skiving cutter, the ratio is 2:1. Set the workpiece speed first (200-500 RPM for steel gears), then calculate cutter speed. The post must output electronic gear synchronization commands (varies by controller: Fanuc Cs contour, Siemens SETMS). Verify synchronization in dry-run before cutting.

**Category:** speeds_feeds
**Confidence:** 0.78
**Source:** web:edgecam-forum
**Operations:** turning, milling

## Related
- [[controller-knowledge-tips-ctrl-044|EMAG VL/VT machines with Siemens 840D integration]]
- [[edgecam-cam-tips-ec-198|Power Skiving Programming for Internal Gears]]
- [[bobcad-cam-tips-bc-173|BobCAD Swiss-Type Polygon Machining for Hex and Square Profiles]]
- [[sprutcam-cam-tips-spr-042|Polygon Turning for Hex and Square Profiles]]
- [[sprutcam-cam-tips-spr-173|Thread Whirling Parameter Optimization]]
