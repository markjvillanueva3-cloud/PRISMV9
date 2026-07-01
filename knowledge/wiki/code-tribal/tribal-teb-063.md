---
name: tribal-teb-063
category: code-tribal
subdomain: multi_axis
domain: tribal-knowledge
tags: ["approach-retract", "tangential", "links", "smooth"]
confidence: 85
source: "web:tebis-docs"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-063.md
promoted_at: 2026-06-09T22:31:16.720Z
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
