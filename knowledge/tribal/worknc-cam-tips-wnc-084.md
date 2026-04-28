---
id: "wnc-084"
title: "Boring Cycles for Precision Hole Finishing"
source: "web:worknc-boring"
confidence: 89
category: "cam_strategy"
tags: ["boring", "precision", "g76", "fine-bore"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.686Z
---

# Boring Cycles for Precision Hole Finishing

WorkNC supports boring cycle variants: G85 (feed-in/feed-out), G86 (feed-in/rapid-out with spindle stop), and G76 (fine boring with orient-and-shift retract). For precision bores (H7 tolerance), use G76 with 0.05-0.1 mm shift to prevent drag marks. Set boring bar to single-point contact and ensure orient angle positions insert away from finished surface during retract.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:worknc-boring
**Operations:** drilling, boring

## Related
- [[surfcam-cam-tips-sc2-095|Boring with Fine Boring and Back-Boring Cycles]]
- [[topsolid-cam-tips-ts-088|Boring Cycles for Precision Hole Finishing]]
- [[bobcad-cam-tips-bc-111|Boring with Fine Bore and Back-Bore Cycles]]
- [[catia-cam-tips-cat-115|Boring Cycle for Precision Hole Diameter and Position]]
- [[esprit-cam-tips-esp-083|Boring Cycle for Precision Hole Finishing]]
