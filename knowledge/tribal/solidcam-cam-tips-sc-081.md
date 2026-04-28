---
id: "sc-081"
title: "Grooving — Peck Cycle with Chip Breaking for Deep Grooves"
source: "web:solidcam-docs"
confidence: 88
category: "cam_strategy"
tags: ["solidcam", "turning", "grooving", "pecking", "chip-breaking"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.726Z
---

# Grooving — Peck Cycle with Chip Breaking for Deep Grooves

For grooves deeper than 3x insert width, enable SolidCAM's pecking grooving cycle with chip-breaking retract. Set the peck depth to 0.5-1.0x insert width and the chip-breaking retract to 0.1-0.2mm. Without pecking, deep groove cuts trap chips between the tool flanks and groove walls, causing built-up edge and unpredictable breakout. The retract distance should be just enough to break the chip without fully disengaging — full retract wastes cycle time and causes re-cutting of the hardened surface.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:solidcam-docs
**Operations:** grooving

## Related
- [[edgecam-cam-tips-ec-038|Grooving Cycles with Peck and Chip Management]]
- [[sprutcam-cam-tips-spr-009|Turning Groove Cycle with Chip Breaking]]
- [[solidcam-cam-tips-sc-078|Turning Roughing — Use Wiper Insert Geometry for Better Surface Direct from Rough]]
- [[solidcam-cam-tips-sc-079|Turning Finishing — Constant Surface Speed Transition Zone]]
- [[solidcam-cam-tips-sc-080|Threading — Multi-Start Thread Entry Synchronization]]
