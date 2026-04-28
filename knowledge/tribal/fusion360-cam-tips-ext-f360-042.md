---
id: "f360-042"
title: "Rest Machining Adaptive with Tight Tolerance Overlap"
source: "web:autodesk-community"
confidence: 85
category: "cam_strategy"
tags: ["fusion360", "adaptive-clearing", "rest-machining", "overlap", "semi-finishing"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.657Z
---

# Rest Machining Adaptive with Tight Tolerance Overlap

When running rest machining Adaptive passes after a larger tool, set the Rest Material Adjustment to -0.1mm to ensure the smaller tool slightly overlaps previously cleared areas. Without this negative offset, thin slivers of uncut material can remain at tool-diameter transition zones, causing unexpected tool loading on finishing passes. Verify the overlap in stock simulation before posting.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:autodesk-community
**Operations:** 3d_adaptive, 2d_adaptive

## Related
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
- [[fusion360-cam-tips-ext-f360-041|Multi-Depth Adaptive with Progressive Stepdown]]
- [[fusion360-cam-tips-ext-f360-043|Separate Radial and Axial Stock-to-Leave for Adaptive]]
- [[fusion360-cam-tips-ext-f360-044|Control Entry Position to Avoid Thin Walls]]
- [[fusion360-cam-tips-ext-f360-045|Chip Load vs DOC Relationship in Adaptive Clearing]]
