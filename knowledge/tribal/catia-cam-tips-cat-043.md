---
id: "cat-043"
title: "Multi-Slice Roughing Maximizes Material Removal Rate"
source: "web:catia-docs"
confidence: 89
category: "cam_strategy"
tags: ["catia", "multi-slice", "roughing", "z-level", "mrr"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.834Z
---

# Multi-Slice Roughing Maximizes Material Removal Rate

CATIA Multi-Slice roughing removes material in successive horizontal layers (Z-levels), each computed as a 2D offset from the part boundary. Set the Z-step to 1-1.5x tool diameter for aggressive roughing with inserted cutters, or 0.5-0.8xD for solid carbide end mills. Enable the 'Skip Empty Levels' option to avoid air cutting on parts with stepped features. Multi-slice is the fastest roughing strategy for most prismatic and semi-prismatic parts.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:catia-docs
**Operations:** roughing

## Related
- [[catia-cam-tips-cat-048|Z-Level Roughing With Helical Entry for Hard Materials]]
- [[catia-cam-tips-cat-035|Lathe Roughing Strategy Selection Based on Material Hardness]]
- [[catia-cam-tips-cat-044|Adaptive Roughing Maintains Constant Tool Engagement]]
- [[catia-cam-tips-cat-045|Rest Material Roughing References Previous Tool Size]]
- [[catia-cam-tips-cat-047|Stock-Aware Roughing Uses In-Process Stock Model]]
