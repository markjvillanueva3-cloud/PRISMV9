---
name: tribal-ec-122
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["waveform", "micro-lift", "retract", "recutting"]
confidence: 0
source: "web:edgecam-forum"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-122.md
promoted_at: 2026-06-09T22:31:16.189Z
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
