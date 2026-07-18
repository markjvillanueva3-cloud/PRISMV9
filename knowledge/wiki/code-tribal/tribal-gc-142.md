---
name: tribal-gc-142
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "mtm", "spindle-sync", "part-transfer", "speed-matching"]
confidence: 87
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-142.md
promoted_at: 2026-06-09T22:31:16.349Z
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
