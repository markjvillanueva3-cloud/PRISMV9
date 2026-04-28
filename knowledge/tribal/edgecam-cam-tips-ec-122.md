---
id: "ec-122"
title: "Waveform Micro-Lift Between Passes Reduces Recutting"
source: "web:edgecam-forum"
confidence: 0.85
category: "cam_strategy"
tags: ["waveform", "micro-lift", "retract", "recutting"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.361Z
---

# Waveform Micro-Lift Between Passes Reduces Recutting

Enable the micro-lift option in Waveform roughing to add a small retract (0.05-0.2mm) between lateral passes. This breaks the chip and prevents the tool from dragging across previously cut surfaces during repositioning moves. Set the micro-lift height based on material: 0.05mm for aluminum, 0.1mm for steel, 0.2mm for superalloys. The micro-lift adds negligible cycle time (typically <1%) but significantly reduces flank wear from recutting.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:edgecam-forum
**Operations:** roughing

## Related
- [[edgecam-cam-tips-ec-001|Waveform Roughing Maintains Constant Tool Engagement]]
- [[edgecam-cam-tips-ec-002|Waveform Trochoidal Mode for Narrow Slots]]
- [[edgecam-cam-tips-ec-003|Waveform Chip Thinning Automatically Increases Feed]]
- [[edgecam-cam-tips-ec-004|Waveform Corner Strategies Prevent Load Spikes]]
- [[edgecam-cam-tips-ec-005|Waveform Multi-Level with Progressive Depth Control]]
