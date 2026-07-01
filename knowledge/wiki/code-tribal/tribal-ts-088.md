---
name: tribal-ts-088
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["boring", "precision", "g76", "fine-bore"]
confidence: 90
source: "web:topsolid-boring-cycle"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-088.md
promoted_at: 2026-05-26T16:07:21.033Z
---

# Boring Cycles for Precision Hole Finishing

TopSolid supports multiple boring cycle variants: G85 (feed-in/feed-out), G86 (feed-in/rapid-out with spindle stop), G76 (fine boring with orient-and-shift retract). For precision bores (H7 tolerance), use G76 fine boring with a 0.05-0.1 mm shift to prevent drag marks on retract. Set the boring bar to single-point contact and ensure the orient angle positions the insert away from the finished surface during retract.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-boring-cycle
**Operations:** drilling, boring

## Related
- [[surfcam-cam-tips-sc2-095|Boring with Fine Boring and Back-Boring Cycles]]
- [[worknc-cam-tips-wnc-084|Boring Cycles for Precision Hole Finishing]]
- [[bobcad-cam-tips-bc-111|Boring with Fine Bore and Back-Bore Cycles]]
- [[catia-cam-tips-cat-115|Boring Cycle for Precision Hole Diameter and Position]]
- [[esprit-cam-tips-esp-083|Boring Cycle for Precision Hole Finishing]]
