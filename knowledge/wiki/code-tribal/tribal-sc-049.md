---
name: tribal-sc-049
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "imachining", "wall-offset", "finish-allowance", "profile"]
confidence: 88
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-049.md
promoted_at: 2026-06-09T22:31:16.583Z
---

# iMachining 2D Profile Pass — Add Finish Allowance Correctly

When using iMachining 2D for roughing before a finishing profile pass, set Wall Offset to your desired stock allowance (typically 0.2-0.5mm for steel, 0.1-0.3mm for aluminum) rather than adding it in the finishing operation. The Wizard optimizes the spiral to leave uniform stock on walls; adding offset in the finish pass instead causes the iMachining spiral to over-cut, leaving inconsistent stock that the finish pass cannot correct uniformly.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:solidcam-docs
**Operations:** 2d_pocket, roughing, finishing

## Related
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-174-2|Pencil Tracing for Corner Cleanup]]
- [[solidcam-cam-tips-sc-040|iMachining 2D Moating — Break Large Pockets into Efficient Zones]]
- [[solidcam-cam-tips-sc-041|iMachining 2D Channel Width — Adapt Morphing Spiral for Narrow Slots]]
- [[solidcam-cam-tips-sc-042|iMachining 2D Stepping — Control Radial Engagement in Corners]]
