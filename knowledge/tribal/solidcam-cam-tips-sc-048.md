---
id: "sc-048"
title: "iMachining 2D Cut Speed Override — Reduce for Interrupted Cuts"
source: "web:solidcam-docs"
confidence: 86
category: "cam_strategy"
tags: ["solidcam", "imachining", "cut-speed", "interrupted-cuts", "override"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.700Z
---

# iMachining 2D Cut Speed Override — Reduce for Interrupted Cuts

When machining geometries with cross-holes, keyways, or interrupted surfaces, reduce the Cut Speed percentage to 70-80% of the Wizard default. Interrupted cuts create cyclic impact loading that the Wizard's engagement model doesn't fully predict. Monitor for chipping on the first part and adjust in 5% increments. The Cut Speed override is under the Technology page — it scales all feed/speed outputs proportionally without changing the toolpath geometry.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:solidcam-docs
**Operations:** 2d_pocket, roughing

## Related
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-174-2|Pencil Tracing for Corner Cleanup]]
- [[solidcam-cam-tips-sc-040|iMachining 2D Moating — Break Large Pockets into Efficient Zones]]
- [[solidcam-cam-tips-sc-041|iMachining 2D Channel Width — Adapt Morphing Spiral for Narrow Slots]]
- [[solidcam-cam-tips-sc-042|iMachining 2D Stepping — Control Radial Engagement in Corners]]
