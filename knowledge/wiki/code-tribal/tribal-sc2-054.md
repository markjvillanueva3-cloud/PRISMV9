---
name: tribal-sc2-054
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["cut-off", "parting", "feed-reduction", "part-catcher", "bar-work"]
confidence: 88
source: "web:surfcam-lathe-cutoff"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-054.md
promoted_at: 2026-06-09T22:31:16.672Z
---

# Cut-Off with Controlled Feed Rate Reduction at Center

SURFCAM cut-off (parting) programming automatically reduces feed rate as the tool approaches the part center to prevent the slug from breaking free prematurely and damaging the surface. Set the feed reduction zone to the last 3-5mm of the cut and reduce feed to 50-60% of the initial rate. For bar work, program a 0.5mm remaining diameter for the part catcher to support, then the final cut. Enable coolant flood at maximum pressure to flush chips from the narrow groove.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:surfcam-lathe-cutoff
**Operations:** parting

## Related
- [[bobcad-cam-tips-bc-052|Cut-Off with Feed Reduction and Part Catcher Support]]
- [[camworks-cam-tips-cw-070|Cut-Off Operation — Part Separation with Chip Control]]
- [[sprutcam-cam-tips-spr-176|Grooving and Cut-Off Chip Control]]
- [[cimatron-cam-tips-cim-069|Core/Cavity Parting Surface Generation]]
- [[cimatron-cam-tips-cim-169|Facing with Wiper Inserts for Plate Flatness]]
