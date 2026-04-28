---
id: "cim-061"
title: "5-Axis Approach/Retract for Surface Quality"
source: "web:cimatron-docs"
confidence: 0.85
category: "cam_strategy"
tags: ["approach-retract", "tangential", "links", "surface-quality"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.030Z
---

# 5-Axis Approach/Retract for Surface Quality

Configure 5-axis approach/retract moves: tangential arc approach (radius = 2× tool radius), normal retract at 30-45° from surface. Cimatron 'Extended Link' creates smooth connections between passes without rapid retracts. Enable 'Tool Axis Interpolation' during links to prevent sudden rotary axis snaps. Critical for visible mold surfaces where tool entry/exit marks must be minimized.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:cimatron-docs
**Operations:** multi_axis

## Related
- [[sprutcam-cam-tips-spr-078|Multi-Axis Approach/Retract for Surface Quality]]
- [[tebis-cam-tips-teb-063|5-Axis Approach/Retract for Smooth Surface Transitions]]
- [[mastercam-cam-tips-mc-213|Lead-in and lead-out geometry should be material-specific to balance tool life and surface quality]]
- [[sprutcam-cam-tips-spr-023|Approach/Retract Strategy for Clean Entry/Exit]]
- [[cimatron-cam-tips-cim-020|Lead/Link Strategy for Smooth Tool Entry]]
