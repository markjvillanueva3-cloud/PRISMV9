---
id: "sc2-013"
title: "Facing Operations with Overlap and Bidirectional Cutting"
source: "web:surfcam-2axis-facing"
confidence: 89
category: "cam_strategy"
tags: ["facing", "overlap", "bidirectional", "surface-finish"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.042Z
---

# Facing Operations with Overlap and Bidirectional Cutting

SURFCAM facing uses a zigzag (bidirectional) pattern with configurable overlap percentage. Set overlap to 5-10% of tool diameter to prevent ridges between passes. For large face mills (50mm+), use unidirectional climb milling at 70% stepover for better surface finish. Set the facing boundary 5mm beyond the stock edge to ensure full cleanup. Enable 'Extend passes' to prevent scallop marks at the stock boundary edges.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:surfcam-2axis-facing
**Operations:** facing

## Related
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[edgecam-cam-tips-ec-013|Face Milling with Optimized Cutter Overlap]]
- [[gibbscam-cam-tips-gc-057|Face turning with spiral path eliminates the center dwell mark]]
- [[bobcad-cam-tips-bc-013|Facing with Minimize Retracts for Continuous Cutting]]
- [[bobcad-cam-tips-bc-047|Face Turning with CSS and Max RPM Control]]
