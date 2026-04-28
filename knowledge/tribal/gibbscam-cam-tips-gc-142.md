---
id: "gc-142"
title: "MTM spindle speed matching during part transfer prevents torsional damage"
source: "web:gibbscam-docs"
confidence: 87
category: "cam_strategy"
tags: ["gibbscam", "mtm", "spindle-sync", "part-transfer", "speed-matching"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.943Z
---

# MTM spindle speed matching during part transfer prevents torsional damage

During sub-spindle pickup (part transfer), both spindles must rotate at the same RPM before the sub-spindle clamp engages. In GibbsCAM MTM, program a spindle-sync block before the transfer: main spindle ramps to transfer speed (typically 200-500 RPM), sub-spindle matches, then clamp engages. If speeds differ at clamp engagement, torsional shock can damage the part surface, mark the grip zone, or worst case, shear thin features. After clamp confirmation, the main spindle chuck opens and the sub-spindle retracts with the part. Include a dwell (G4 P0.5) after clamp engagement for pressure stabilization.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-041|MTM Sync Manager visually coordinates multi-channel simultaneous operations]]
- [[gibbscam-cam-tips-gc-042|Swiss-type programming requires guide bushing offset for Z-axis accuracy]]
- [[gibbscam-cam-tips-gc-043|Multi-spindle machines benefit from balanced operation time per spindle station]]
- [[gibbscam-cam-tips-gc-044|Multi-turret synchronization allows simultaneous cutting on opposite sides]]
- [[gibbscam-cam-tips-gc-045|B-axis milling on MTM machines enables 5-axis capability from a lathe platform]]
