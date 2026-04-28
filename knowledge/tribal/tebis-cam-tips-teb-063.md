---
id: "teb-063"
title: "5-Axis Approach/Retract for Smooth Surface Transitions"
source: "web:tebis-docs"
confidence: 85
category: "multi_axis"
tags: ["approach-retract", "tangential", "links", "smooth"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.269Z
---

# 5-Axis Approach/Retract for Smooth Surface Transitions

Configure approach and retract moves for 5-axis operations: use tangential arc approach (radius = 2× tool radius), normal retract at 30-45° from surface. Tebis 'Extended Link' creates smooth connections between adjacent passes without rapid retract cycles. Enable 'Tool Axis Interpolation' during links to prevent sudden rotary axis snaps that leave surface marks.

**Category:** multi_axis
**Confidence:** 85
**Source:** web:tebis-docs
**Operations:** multi_axis

## Related
- [[cimatron-cam-tips-cim-061|5-Axis Approach/Retract for Surface Quality]]
- [[sprutcam-cam-tips-spr-078|Multi-Axis Approach/Retract for Surface Quality]]
- [[mastercam-cam-tips-mc-213|Lead-in and lead-out geometry should be material-specific to balance tool life and surface quality]]
- [[sprutcam-cam-tips-spr-023|Approach/Retract Strategy for Clean Entry/Exit]]
- [[cimatron-cam-tips-cim-020|Lead/Link Strategy for Smooth Tool Entry]]
