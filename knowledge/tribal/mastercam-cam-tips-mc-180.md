---
id: "mc-180"
title: "Rest finishing targets only areas where the semi-finish tool left excess material"
source: "web:mastercam-docs"
confidence: 86
category: "cam_strategy"
tags: ["mastercam", "rest-finishing", "stock-model", "tight-corners", "cycle-time", "threshold"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.250Z
---

# Rest finishing targets only areas where the semi-finish tool left excess material

After semi-finishing with a larger ball end mill, tight corners, fillets, and narrow channels retain excess material. Rest Finishing in Mastercam uses the semi-finish stock model to identify these areas and generates toolpath only where the smaller finishing tool can reach material the larger tool could not. Enable Rest Material on the finishing operation's Stock page and reference the semi-finish stock model. Mastercam calculates the difference between the semi-finish stock shape and the part surface, then generates finish passes only in regions where this difference exceeds the specified threshold (typically 0.01–0.05 mm). This eliminates finish passes over areas already at final dimension, reducing cycle time by 30–60% on parts with mixed open and tight geometry. The threshold value controls sensitivity — too low produces excessive toolpath in areas with minimal rest material.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:mastercam-docs
**Operations:** finishing

## Related
- [[mastercam-cam-tips-mc-049|Core Rough targets island walls specifically for reduced cycle time]]
- [[mastercam-cam-tips-mc-096|Save Stock Model at operation boundaries to speed up re-simulation]]
- [[mastercam-cam-tips-mc-113|Reduce air cutting by using stock-aware toolpaths and tight containment boundaries]]
- [[mastercam-cam-tips-mc-116|Depth-first ordering reduces tool changes; breadth-first reduces setup complexity]]
- [[mastercam-cam-tips-mc-132|Large-step finishing with barrel cutters reduces passes by 80% on open surface areas]]
