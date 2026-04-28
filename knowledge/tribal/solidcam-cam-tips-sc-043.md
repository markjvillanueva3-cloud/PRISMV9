---
id: "sc-043"
title: "iMachining 2D Entry Rate — Slow First Spiral for Brittle Tools"
source: "web:solidcam-docs"
confidence: 86
category: "cam_strategy"
tags: ["solidcam", "imachining", "entry-rate", "tool-protection", "brittle-tools"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.697Z
---

# iMachining 2D Entry Rate — Slow First Spiral for Brittle Tools

The Entry Rate slider controls how aggressively the morphing spiral ramps to full engagement on its first revolution. For carbide end mills in steel, the default 50% entry rate is appropriate. For ceramic or CBN inserts, reduce entry rate to 20-30% to prevent edge chipping during initial contact. For aluminum with coated carbide, increase to 70-80% to save cycle time on the non-productive entry phase.

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
