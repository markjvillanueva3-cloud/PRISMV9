---
id: "mc-153"
title: "Part-off operations on Swiss machines require controlled feed reduction to prevent burrs"
source: "web:community"
confidence: 85
category: "cam_strategy"
tags: ["mastercam", "swiss", "part-off", "cutoff", "pip", "burr-reduction"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.229Z
---

# Part-off operations on Swiss machines require controlled feed reduction to prevent burrs

The cutoff (part-off) operation on Swiss machines separates the finished part from the bar stock. In Mastercam, program the cutoff with progressively reduced feed rate as the tool approaches center — start at normal feed (0.02–0.05 mm/rev) and reduce to 50% feed for the final 1 mm of diameter. This prevents the pip (center nub) that forms when the tool breaks through and reduces burr formation. Set spindle speed to 60–70% of turning speed during cutoff to reduce vibration from the narrow cutoff blade. For parts requiring zero pip, program a sub-spindle pickup before final cutoff so the part is supported on both ends, or face the pip on the sub-spindle after cutoff. Cutoff blade width directly affects material waste — use the thinnest blade the machine rigidity allows (typically 1.0–1.5 mm for Swiss).

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community
**Operations:** turning, swiss

## Related
- [[mastercam-cam-tips-mc-149|Sub-spindle synchronization in Mastercam enables back-side machining after part-off]]
- [[mastercam-cam-tips-mc-148|Guide bushing proximity in Swiss machining limits unsupported material length for rigidity]]
- [[mastercam-cam-tips-mc-150|Gang tooling layout in Swiss machining requires careful clearance planning for simultaneous cuts]]
- [[mastercam-cam-tips-mc-151|B-axis milling on Swiss machines enables off-axis holes and flats without re-chucking]]
- [[mastercam-cam-tips-mc-152|Bar feeder programming in Mastercam automates stock advance and remnant handling]]
