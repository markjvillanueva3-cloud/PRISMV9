---
name: tribal-gc-139
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "mtm", "superimposed", "simultaneous", "dual-turret"]
confidence: 84
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-139.md
promoted_at: 2026-06-09T22:31:16.348Z
---

# MTM superimposed machining runs two turrets on the same spindle simultaneously

GibbsCAM supports superimposed (simultaneous) machining where two turrets work on the same part at the same time. For example, one turret rough-turns the OD while the other drills the ID. In the sync chart, overlap these operations and enable 'Superimposed' mode. Critical constraints: tools must not collide (check angular separation), combined cutting forces must not exceed spindle torque limit, and the control must support superimposed axis groups (G-code M-code coordination). Test with 50% feed rate first, then optimize. Typical cycle time savings: 20-35% for parts with independent OD and ID features.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-038|Simultaneous 5-axis tool axis control uses smooth interpolation between orientations]]
- [[gibbscam-cam-tips-gc-041|MTM Sync Manager visually coordinates multi-channel simultaneous operations]]
- [[gibbscam-cam-tips-gc-042|Swiss-type programming requires guide bushing offset for Z-axis accuracy]]
- [[gibbscam-cam-tips-gc-043|Multi-spindle machines benefit from balanced operation time per spindle station]]
- [[gibbscam-cam-tips-gc-044|Multi-turret synchronization allows simultaneous cutting on opposite sides]]
