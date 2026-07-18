---
name: tribal-cat-047
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "stock-aware", "in-process", "roughing", "optimization"]
confidence: 87
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-047.md
promoted_at: 2026-06-09T22:31:16.041Z
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
