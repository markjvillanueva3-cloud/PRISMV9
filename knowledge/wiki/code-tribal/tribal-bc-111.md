---
name: tribal-bc-111
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["boring", "fine-bore", "g76", "back-bore", "wizard"]
confidence: 88
source: "web:bobcad-boring-cycles"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-111.md
promoted_at: 2026-06-09T22:31:15.959Z
---

# Boring with Fine Bore and Back-Bore Cycles

BobCAD boring supports G85 (feed-out), G86 (spindle-stop), G76 (fine bore with orient-and-shift). For precision bores (±0.005mm), use G76: spindle orients, tool shifts 0.05mm from wall, retracts without dragging. For back-boring, program pass-through, offset to bore diameter, cut on retraction. BobCAD's boring wizard helps configure the correct cycle based on the precision requirement and controller capabilities.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:bobcad-boring-cycles
**Operations:** boring, drilling

## Related
- [[surfcam-cam-tips-sc2-095|Boring with Fine Boring and Back-Boring Cycles]]
- [[topsolid-cam-tips-ts-088|Boring Cycles for Precision Hole Finishing]]
- [[worknc-cam-tips-wnc-084|Boring Cycles for Precision Hole Finishing]]
- [[catia-cam-tips-cat-115|Boring Cycle for Precision Hole Diameter and Position]]
- [[esprit-cam-tips-esp-083|Boring Cycle for Precision Hole Finishing]]
