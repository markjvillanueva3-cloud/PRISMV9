---
id: "gc-044"
title: "Multi-turret synchronization allows simultaneous cutting on opposite sides"
source: "web:gibbscam-docs"
confidence: 87
category: "cam_strategy"
tags: ["gibbscam", "mtm", "multi-turret", "synchronized", "balanced-cutting"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.866Z
---

# Multi-turret synchronization allows simultaneous cutting on opposite sides

GibbsCAM MTM supports synchronized multi-turret operations where upper and lower turrets cut simultaneously. When using balanced cutting (two tools cutting on opposite sides of the part), the cutting forces partially cancel, allowing higher feed rates and reducing part deflection. Set sync points to ensure both turrets engage and disengage at the same time. For through-boring from opposite sides, sync the Z-axis meeting point to within 0.02mm to prevent a step at the junction. GibbsCAM outputs the appropriate sync codes (M-codes) for each machine's control.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-041|MTM Sync Manager visually coordinates multi-channel simultaneous operations]]
- [[gibbscam-cam-tips-gc-042|Swiss-type programming requires guide bushing offset for Z-axis accuracy]]
- [[gibbscam-cam-tips-gc-043|Multi-spindle machines benefit from balanced operation time per spindle station]]
- [[gibbscam-cam-tips-gc-045|B-axis milling on MTM machines enables 5-axis capability from a lathe platform]]
- [[gibbscam-cam-tips-gc-046|Sub-spindle transfer requires precise sync and clamp force control]]
