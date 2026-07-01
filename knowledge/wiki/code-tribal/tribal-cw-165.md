---
name: tribal-cw-165
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "swiss-type", "guide-bushing", "bar-feeder", "sliding-headstock"]
confidence: 90
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-165.md
promoted_at: 2026-05-26T16:07:20.003Z
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
