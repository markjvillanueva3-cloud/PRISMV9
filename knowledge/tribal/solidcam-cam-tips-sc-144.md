---
id: "sc-144"
title: "Custom Drill Cycles — Machine-Specific Canned Cycles via Post Processor"
source: "web:solidcam-docs"
confidence: 86
category: "cam_strategy"
tags: ["solidcam", "custom-drill-cycle", "canned-cycle", "post-processor", "machine-specific"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.774Z
---

# Custom Drill Cycles — Machine-Specific Canned Cycles via Post Processor

SolidCAM supports custom drill cycles that map to machine-specific canned cycles beyond standard G81/G83/G73. Define custom cycles in the post processor for: tapping with rigid/floating holders (G84/G74), fine boring with oriented spindle retract (G76), and back boring (G87). Each custom cycle specifies the G-code, required parameters (feed, depth, dwell, shift), and retract behavior. For Mazak, Okuma, or DMG machines with proprietary deep-hole cycles, create a custom drill cycle that outputs the manufacturer's specific cycle format. Test custom cycles with single-block execution on the first part to verify parameter mapping between SolidCAM and the controller.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:solidcam-docs
**Operations:** drilling, post_processing

## Related
- [[solidcam-cam-tips-sc-174-2|Pencil Tracing for Corner Cleanup]]
- [[solidcam-cam-tips-sc-040|iMachining 2D Moating — Break Large Pockets into Efficient Zones]]
- [[solidcam-cam-tips-sc-041|iMachining 2D Channel Width — Adapt Morphing Spiral for Narrow Slots]]
- [[solidcam-cam-tips-sc-042|iMachining 2D Stepping — Control Radial Engagement in Corners]]
- [[solidcam-cam-tips-sc-043|iMachining 2D Entry Rate — Slow First Spiral for Brittle Tools]]
