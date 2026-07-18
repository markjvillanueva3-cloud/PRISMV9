---
name: tribal-gc-048
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "mtm", "y-axis", "off-center", "milling-on-lathe"]
confidence: 86
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-048.md
promoted_at: 2026-06-09T22:31:16.324Z
---

# Y-axis milling on lathes enables off-center features without re-fixturing

Y-axis capability on MTM machines allows milling features that are offset from the spindle centerline. In GibbsCAM, Y-axis operations are programmed using the standard milling environment with the Y-axis mapped to the lathe's Y-axis travel. This enables off-center pockets, slots, and contours in a single setup. Set the Y-axis zero reference point and define operations in the XY-plane of the milling coordinate system. For deep Y-axis features, check that the tool reach plus holder length clears the chuck jaws at the extreme Y-axis position.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-041|MTM Sync Manager visually coordinates multi-channel simultaneous operations]]
- [[gibbscam-cam-tips-gc-042|Swiss-type programming requires guide bushing offset for Z-axis accuracy]]
- [[gibbscam-cam-tips-gc-043|Multi-spindle machines benefit from balanced operation time per spindle station]]
- [[gibbscam-cam-tips-gc-044|Multi-turret synchronization allows simultaneous cutting on opposite sides]]
- [[gibbscam-cam-tips-gc-045|B-axis milling on MTM machines enables 5-axis capability from a lathe platform]]
