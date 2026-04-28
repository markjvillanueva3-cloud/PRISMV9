---
id: "cw-165"
title: "Swiss-Type Lathe Programming — Guide Bushing and Bar Feeder Control"
source: "web:camworks-docs"
confidence: 90
category: "cam_strategy"
tags: ["camworks", "swiss-type", "guide-bushing", "bar-feeder", "sliding-headstock"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.773Z
---

# Swiss-Type Lathe Programming — Guide Bushing and Bar Feeder Control

CAMWorks supports Swiss-type (sliding headstock) lathes where the bar feeds through a guide bushing, providing support near the cutting zone for slender parts. Program Z-axis moves as bar feed (headstock movement) rather than turret movement. The guide bushing supports the workpiece within 1-3mm of the tool, enabling L/D ratios of 10:1+ without tailstock support. Set the guide bushing clearance in CAMWorks machine definition — the post processor converts Z moves to headstock feed commands (W-axis on most Swiss machines).

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** turning

## Related
- [[solidcam-cam-tips-sc-152-2|Uncertainty Budget for iMachining vs Conventional]]
- [[topsolid-cam-tips-ts-052|Swiss-Type Machining with Sliding Headstock Control]]
- [[topsolid-cam-tips-ts-164|TopSolid Swiss-Type Lathe Programming — Complete Multi-Axis Workflow]]
- [[camworks-cam-tips-cw-166|Swiss-Type Simultaneous Operations — Overlapped Milling and Turning]]
- [[camworks-cam-tips-cw-167|Swiss-Type Sub-Spindle Operations — Back-Working and Part-Off]]
