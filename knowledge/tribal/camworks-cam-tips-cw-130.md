---
id: "cw-130"
title: "VoluMill Stock Awareness — Rest Material Tracking Between Passes"
source: "web:camworks-docs"
confidence: 91
category: "cam_strategy"
tags: ["camworks", "volumill", "stock-tracking", "rest-material", "cycle-time"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.746Z
---

# VoluMill Stock Awareness — Rest Material Tracking Between Passes

VoluMill tracks the in-process stock shape between roughing passes to avoid air cutting. In CAMWorks, enable 'Use Previous Operation Stock' to pass the updated stock model from the prior VoluMill operation. This is essential for multi-level roughing where different Z-levels have different remaining material. Without stock awareness, subsequent passes waste 20-40% of cycle time cutting air. For parts with complex 3D stock shapes (castings, forgings), import the actual stock model rather than using a bounding box.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:camworks-docs
**Operations:** milling, roughing

## Related
- [[camworks-cam-tips-cw-030|VoluMill Air Cut Reduction — Minimize Non-Cutting Travel Time]]
- [[camworks-cam-tips-cw-136|VoluMill Retract Optimization — Minimum Lift Between Passes]]
- [[camworks-cam-tips-cw-023|VoluMill High-Efficiency Roughing — Constant Engagement for Maximum MRR]]
- [[camworks-cam-tips-cw-024|VoluMill Morphing Toolpath — Smooth Transitions Between Geometric Zones]]
- [[camworks-cam-tips-cw-025|VoluMill Multi-Level Roughing — Full-Depth Helical Entry for Maximum Efficiency]]
