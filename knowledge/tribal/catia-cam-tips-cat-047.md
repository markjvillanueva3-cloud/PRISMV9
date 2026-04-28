---
id: "cat-047"
title: "Stock-Aware Roughing Uses In-Process Stock Model"
source: "web:catia-docs"
confidence: 87
category: "cam_strategy"
tags: ["catia", "stock-aware", "in-process", "roughing", "optimization"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.837Z
---

# Stock-Aware Roughing Uses In-Process Stock Model

CATIA can compute an in-process stock model after each operation and use it as the input stock for the next operation. Enable this by activating 'In-Process Model' in the Manufacturing Program. This prevents air cutting in subsequent roughing operations and allows CATIA to optimize entry/exit points based on actual remaining material. The computational cost increases with each operation in the chain, so limit the chain to 3-4 operations before resetting with a fresh stock definition.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:catia-docs
**Operations:** roughing

## Related
- [[catia-cam-tips-cat-035|Lathe Roughing Strategy Selection Based on Material Hardness]]
- [[catia-cam-tips-cat-043|Multi-Slice Roughing Maximizes Material Removal Rate]]
- [[catia-cam-tips-cat-044|Adaptive Roughing Maintains Constant Tool Engagement]]
- [[catia-cam-tips-cat-045|Rest Material Roughing References Previous Tool Size]]
- [[catia-cam-tips-cat-048|Z-Level Roughing With Helical Entry for Hard Materials]]
