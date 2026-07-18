---
name: tribal-gc-144
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "mtm", "collision-zones", "turret", "safety"]
confidence: 86
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-144.md
promoted_at: 2026-06-09T22:31:16.349Z
---

# MTM collision zone definitions prevent crashes between turrets and chucks

GibbsCAM MTM requires explicit collision zone definitions for each movable component: turret body, tool holders, chucks, tailstock, steady rest, and sub-spindle barrel. Define these as simplified solid bodies (cylinders, boxes) in the Machine Setup dialog. During simulation, the system checks all zone pairs for interference at every interpolation step. Pay special attention to the clearance between the upper turret and the sub-spindle barrel — this is the most common crash zone on twin-turret lathes. Set a 3-5 mm safety margin on all collision zones to account for fixture and tooling dimensional variations.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-041|MTM Sync Manager visually coordinates multi-channel simultaneous operations]]
- [[gibbscam-cam-tips-gc-042|Swiss-type programming requires guide bushing offset for Z-axis accuracy]]
- [[gibbscam-cam-tips-gc-043|Multi-spindle machines benefit from balanced operation time per spindle station]]
- [[gibbscam-cam-tips-gc-044|Multi-turret synchronization allows simultaneous cutting on opposite sides]]
- [[gibbscam-cam-tips-gc-045|B-axis milling on MTM machines enables 5-axis capability from a lathe platform]]
