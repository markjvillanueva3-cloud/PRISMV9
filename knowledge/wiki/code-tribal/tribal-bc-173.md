---
name: tribal-bc-173
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["swiss-type", "polygon-machining", "hex", "square", "speed-ratio"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-173.md
promoted_at: 2026-06-09T22:31:15.974Z
---

# BobCAD Swiss-Type Polygon Machining for Hex and Square Profiles

BobCAD programs polygon machining on Swiss-type machines to create hex, square, and other polygonal cross-sections using synchronized rotation between the part spindle and a polygon cutting unit. For a hexagon: use a 3-insert cutter at a 3:2 spindle-to-cutter speed ratio. Define polygon parameters in BobCAD: number of flats, flat width (across-flats dimension), length of polygonal section, and angular orientation. The post generates synchronized spindle commands. Verify the speed ratio produces exact integer flats — non-integer ratios create irregular polygons. Maximum polygon size is limited by the cutter diameter and machine power.

**Category:** cam_strategy
**Confidence:** 0.83
**Source:** web:bobcad-docs
**Operations:** turning

## Related
- [[surfcam-cam-tips-sc2-159|SURFCAM Swiss-Type Polygon Turning for Hex and Square Features]]
- [[camworks-cam-tips-cw-171|Swiss-Type Polygon Machining — Flats and Hex on Round Stock]]
- [[topsolid-cam-tips-ts-173|TopSolid Swiss-Type Polygon Machining — Hex and Square Profiles]]
- [[sprutcam-cam-tips-spr-042|Polygon Turning for Hex and Square Profiles]]
- [[bobcad-cam-tips-bc-167|BobCAD Swiss-Type Lathe Programming with Guide Bushing]]
