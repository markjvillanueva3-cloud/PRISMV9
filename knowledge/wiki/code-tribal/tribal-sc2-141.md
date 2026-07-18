---
name: tribal-sc2-141
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["3-plus-2", "positional-5-axis", "undercut", "indexed", "wcs"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-141.md
promoted_at: 2026-06-09T22:31:16.690Z
---

# SURFCAM 3+2 Axis Positioning for Undercut Access

SURFCAM 3+2 axis (positional 5-axis) locks the rotary axes at a fixed orientation while the machine cuts with 3-axis motion. This accesses undercuts and angled faces without continuous 5-axis motion, simplifying programming and improving surface finish due to the machine's rigidity at locked positions. Define multiple work coordinate systems (WCS) for each indexed position. Verify that the rotary axis positions are within the machine's travel limits — common mistake is programming a B-axis angle beyond the physical range.

**Category:** cam_strategy
**Confidence:** 0.9
**Source:** web:surfcam-docs
**Operations:** 3_axis, 5_axis

## Related
- [[cimatron-cam-tips-cim-054|3+2 Axis Indexed Machining for Multi-Face Parts]]
- [[fusion360-cam-tips-ext-f360-135|3+2 Indexed Multi-Face Machining Setup]]
- [[mastercam-cam-tips-mc-053|3+2 Automatic Roughing outperforms OptiRough on steep-walled prismatic parts]]
- [[mastercam-cam-tips-mc-071|3+2 positioning uses indexed tilts instead of simultaneous 5-axis for rigidity]]
- [[sprutcam-cam-tips-spr-075|3+2 Axis Positioning for Multi-Face Machining]]
