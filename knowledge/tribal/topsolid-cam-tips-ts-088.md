---
id: "ts-088"
title: "Boring Cycles for Precision Hole Finishing"
source: "web:topsolid-boring-cycle"
confidence: 90
category: "cam_strategy"
tags: ["boring", "precision", "g76", "fine-bore"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.453Z
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
