---
name: tribal-sc2-095
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["boring", "fine-bore", "g76", "back-bore", "precision"]
confidence: 88
source: "web:surfcam-drilling-bore"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-095.md
promoted_at: 2026-06-09T22:31:16.681Z
---

# Boring with Fine Boring and Back-Boring Cycles

SURFCAM boring supports G85 (feed-out bore), G86 (spindle-stop bore), and G76 (fine bore with orient-and-shift). For precision bores requiring ±0.005mm, use G76 fine boring: the spindle orients, the tool shifts away from the bore wall (0.05mm), then retracts without dragging across the finished surface. For back-boring (counterboring from the back side), program the tool to pass through the hole, offset to the bore diameter, then cut on retraction.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:surfcam-drilling-bore
**Operations:** boring, drilling

## Related
- [[bobcad-cam-tips-bc-111|Boring with Fine Bore and Back-Bore Cycles]]
- [[topsolid-cam-tips-ts-088|Boring Cycles for Precision Hole Finishing]]
- [[worknc-cam-tips-wnc-084|Boring Cycles for Precision Hole Finishing]]
- [[catia-cam-tips-cat-115|Boring Cycle for Precision Hole Diameter and Position]]
- [[esprit-cam-tips-esp-083|Boring Cycle for Precision Hole Finishing]]
