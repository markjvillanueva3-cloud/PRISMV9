---
name: tribal-sc-081
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "turning", "grooving", "pecking", "chip-breaking"]
confidence: 88
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-081.md
promoted_at: 2026-06-09T22:31:16.589Z
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
