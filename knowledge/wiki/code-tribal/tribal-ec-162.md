---
name: tribal-ec-162
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["deep-drilling", "cross-hole", "drill-wander", "feed-reduction"]
confidence: 0
source: "web:edgecam-forum"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-162.md
promoted_at: 2026-06-09T22:31:16.199Z
---

# Cross-Hole Drilling Strategy to Prevent Drill Wander

When deep drilling intersects a cross-hole, the drill tip encounters interrupted cutting that causes deflection. In Edgecam, program a 50% feed reduction starting 2mm before the cross-hole intersection and continuing until 2mm past. Use a user-defined event in the drilling cycle to insert the feed override at the calculated Z-depth. For critical holes, program a bore cycle after drilling to correct any deflection-induced runout at the intersection.

**Category:** cam_strategy
**Confidence:** 0.81
**Source:** web:edgecam-forum
**Operations:** drilling

## Related
- [[edgecam-cam-tips-ec-161|High-Pressure Coolant Deep Drilling Without Pecking]]
- [[fusion360-cam-tips-ext-f360-151|Pilot Hole Strategy for Deep Holes]]
- [[fusion360-cam-tips-ext-f360-152|Through-Spindle Coolant for Deep Hole Drilling]]
- [[fusion360-cam-tips-ext-f360-154|Cross-Hole Drilling Strategy to Prevent Drill Deflection]]
- [[mastercam-cam-tips-mc-151|B-axis milling on Swiss machines enables off-axis holes and flats without re-chucking]]
