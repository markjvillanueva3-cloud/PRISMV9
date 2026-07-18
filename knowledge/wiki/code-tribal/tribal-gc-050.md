---
name: tribal-gc-050
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "mtm", "part-off", "pip", "feed-reduction"]
confidence: 86
source: "web:community"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-050.md
promoted_at: 2026-06-09T22:31:16.325Z
---

# Part-off tool approach angle and feed rate prevent pip formation

When programming part-off in GibbsCAM MTM, set the approach to cut from the OD toward center with the tool slightly below center height (0.1-0.2mm). Feed rate should decrease as the tool approaches the center—reduce to 50% of the initial feed for the last 2mm of travel. This prevents the 'pip' (nub) that forms when the part breaks free before the tool reaches center. For sub-spindle pickup parts, synchronize the sub-spindle grip before the part-off tool reaches the last 1mm to support the part and eliminate the pip entirely.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:community

## Related
- [[gibbscam-cam-tips-gc-046|Sub-spindle transfer requires precise sync and clamp force control]]
- [[gibbscam-cam-tips-gc-041|MTM Sync Manager visually coordinates multi-channel simultaneous operations]]
- [[gibbscam-cam-tips-gc-042|Swiss-type programming requires guide bushing offset for Z-axis accuracy]]
- [[gibbscam-cam-tips-gc-043|Multi-spindle machines benefit from balanced operation time per spindle station]]
- [[gibbscam-cam-tips-gc-044|Multi-turret synchronization allows simultaneous cutting on opposite sides]]
