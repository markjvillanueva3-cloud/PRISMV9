---
id: "ec-005"
title: "Waveform Multi-Level with Progressive Depth Control"
source: "web:edgecam-waveform"
confidence: 88
category: "cam_strategy"
tags: ["waveform", "multi-level", "deep-pocket", "step-down"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.253Z
---

# Waveform Multi-Level with Progressive Depth Control

For deep pockets, Waveform supports variable axial step-downs per Z-level. Use aggressive depths (1.5-2x diameter) in upper levels with good chip evacuation and reduce to 0.5-1x diameter near the pocket floor. Enable progressive depth to automatically taper the step-down based on pocket aspect ratio. Combine with helical entry at each new level to avoid plunging — helical diameter should be 80-110% of tool diameter with 2-4 degree ramp angle.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:edgecam-waveform
**Operations:** roughing, pocketing

## Related
- [[bobcad-cam-tips-bc-004|Multi-Level Adaptive Roughing with Automatic Step-Down]]
- [[esprit-cam-tips-esp-005|ProfitMilling Multi-Level Roughing with Variable Depths]]
- [[surfcam-cam-tips-sc2-005|TrueMill Multi-Level Roughing with Automatic Step-Down]]
- [[edgecam-cam-tips-ec-124|Waveform Plunge Strategy for Deep Pockets]]
- [[edgecam-cam-tips-ec-001|Waveform Roughing Maintains Constant Tool Engagement]]
