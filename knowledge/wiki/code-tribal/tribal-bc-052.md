---
name: tribal-bc-052
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["cut-off", "parting", "feed-reduction", "part-catcher"]
confidence: 88
source: "web:bobcad-cutoff"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-052.md
promoted_at: 2026-06-09T22:31:15.944Z
---

# Cut-Off with Feed Reduction and Part Catcher Support

BobCAD cut-off (parting) automatically reduces feed rate as the tool approaches center to prevent premature slug breakage. Set feed reduction zone to the last 3-5mm, reduce to 50-60% of initial rate. For bar work, program 0.5mm remaining diameter for part catcher support. Enable maximum coolant pressure for chip flushing from the narrow groove. BobCAD handles part catcher activation (M-code output) at the programmable breakoff point.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:bobcad-cutoff
**Operations:** parting

## Related
- [[surfcam-cam-tips-sc2-054|Cut-Off with Controlled Feed Rate Reduction at Center]]
- [[camworks-cam-tips-cw-070|Cut-Off Operation — Part Separation with Chip Control]]
- [[sprutcam-cam-tips-spr-176|Grooving and Cut-Off Chip Control]]
- [[cimatron-cam-tips-cim-069|Core/Cavity Parting Surface Generation]]
- [[cimatron-cam-tips-cim-169|Facing with Wiper Inserts for Plate Flatness]]
