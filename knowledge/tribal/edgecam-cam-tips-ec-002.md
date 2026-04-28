---
id: "ec-002"
title: "Waveform Trochoidal Mode for Narrow Slots"
source: "web:edgecam-waveform"
confidence: 90
category: "cam_strategy"
tags: ["waveform", "trochoidal", "slotting", "engagement"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.250Z
---

# Waveform Trochoidal Mode for Narrow Slots

When slot width is less than 2x tool diameter, Waveform automatically switches to trochoidal arcing to avoid full-width engagement. The tool follows circular arcs that maintain the target radial engagement (typically 8-15% of cutter diameter). Set the trochoidal stepover to match your target engagement and increase axial depth to full flute length for maximum MRR. This approach is 2-3x faster than conventional slotting with reduced tool wear.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:edgecam-waveform
**Operations:** slotting, roughing

## Related
- [[worknc-cam-tips-wnc-155|Waveform Roughing — Constant Engagement Angle for Maximum MRR]]
- [[edgecam-cam-tips-ec-003|Waveform Chip Thinning Automatically Increases Feed]]
- [[edgecam-cam-tips-ec-004|Waveform Corner Strategies Prevent Load Spikes]]
- [[edgecam-cam-tips-ec-121|Waveform Roughing Morphing Zone Control]]
- [[bobcad-cam-tips-bc-007|Trochoidal Slotting for Full-Width Channel Cuts]]
