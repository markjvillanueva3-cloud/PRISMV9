---
id: "cat-144"
title: "Swarf Cutting Strategy for Ruled Surface 5-Axis Machining"
source: "web:catia-docs"
confidence: 0.88
category: "cam_strategy"
tags: ["catia", "multi-axis", "swarf", "flank-milling", "ruled-surface"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.926Z
---

# Swarf Cutting Strategy for Ruled Surface 5-Axis Machining

CATIA Multi-Axis Surface Machining supports 'Swarf Cutting' (flank milling) where the tool's cylindrical side cuts a ruled surface in a single pass. In the Multi-Axis Sweeping operation, set Tool Axis Mode to 'Swarf'. CATIA aligns the cutter flank tangent to the ruled surface at every point along the drive curve. Requirements: the surface must be truly ruled (developable), and the cutter length must exceed the surface height. For quasi-ruled surfaces (within 0.01mm of ruled), enable 'Swarf Correction' to add small axis adjustments that maintain surface contact. Typical applications: blisk blade flanks, impeller vane sides.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:catia-docs
**Operations:** 5axis_finishing

## Related
- [[esprit-cam-tips-esp-183|FreeForm 5-Axis Swarf Cutting for Ruled Surfaces]]
- [[gibbscam-cam-tips-gc-031|Swarf milling uses the side of the cutter for ruled surface finishing]]
- [[mastercam-cam-tips-mc-064|Swarf cutting uses the tool's side to machine ruled surfaces in one pass]]
- [[catia-cam-tips-cat-015|Contour-Driven Parallel Mode for Ruled Surface Finishing]]
- [[catia-cam-tips-cat-025|Multi-Axis Sweeping Lead/Lag Angle for Surface Quality]]
