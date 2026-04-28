---
id: "mc-206"
title: "Feed plane position controls where the tool transitions from rapid to feed rate on approach"
source: "web:mastercam-docs"
confidence: 86
category: "cam_strategy"
tags: ["mastercam", "feed-plane", "linking", "rapid-to-feed", "approach", "air-cutting"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.284Z
---

# Feed plane position controls where the tool transitions from rapid to feed rate on approach

In Mastercam linking parameters, the Feed Plane is the Z-height where the tool switches from rapid traverse to cutting feed rate during approach to each cut. Set the feed plane close to the stock surface (1–3 mm above) to minimize the distance traveled at cutting feed through air. If the feed plane is set too high (10+ mm above stock), the tool feeds slowly through empty space, adding seconds per approach that accumulate across hundreds of passes. If set too low (at or below stock surface), the tool hits material at rapid speed, risking tool breakage. For first operations on raw stock with potential height variations (castings, forgings), set the feed plane 5 mm above nominal stock height to account for material variation. For subsequent operations where the stock model is accurate, reduce to 1–2 mm.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:mastercam-docs
**Operations:** roughing, finishing

## Related
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
- [[mastercam-cam-tips-mc-113|Reduce air cutting by using stock-aware toolpaths and tight containment boundaries]]
- [[mastercam-cam-tips-mc-114|Toolpath linking parameters control retract height, lead-in, and lead-out strategy]]
- [[mastercam-cam-tips-mc-125|Open profile wire EDM cuts require extra stock and careful start/end positioning]]
- [[mastercam-cam-tips-mc-139|Micro-retract minimization in hard milling prevents re-engagement shock on brittle tools]]
