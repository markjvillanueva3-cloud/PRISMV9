---
id: "bc-172"
title: "BobCAD Swiss-Type Overlapping Operations for Cycle Reduction"
source: "web:bobcad-docs"
confidence: 0.86
category: "cam_strategy"
tags: ["swiss-type", "overlapping", "synchronization", "cycle-time", "bottleneck"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.591Z
---

# BobCAD Swiss-Type Overlapping Operations for Cycle Reduction

BobCAD's synchronization manager enables overlapping main and sub-spindle operations on Swiss-type machines. While the main spindle machines the next part, the sub-spindle simultaneously back-works the previous part. Set sync points to prevent conflicts: the part-off operation must complete before the sub-spindle starts. After transfer, overlap up to 3-4 sub-spindle operations with main-spindle operations. BobCAD calculates the bottleneck channel — the one that takes longer determines cycle time. Optimize the bottleneck channel first. A well-overlapped Swiss program reduces cycle time by 30-50% compared to sequential execution.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:bobcad-docs
**Operations:** turning

## Related
- [[esprit-cam-tips-esp-041|Swiss-Type Multi-Spindle Synchronization Reduces Cycle Time]]
- [[esprit-cam-tips-esp-046|Overlapping Operations in Multi-Channel Programming]]
- [[bobcad-cam-tips-bc-168|BobCAD Swiss-Type Gang Tooling Layout Optimization]]
- [[bobcad-cam-tips-bc-171|BobCAD Swiss-Type Thread Whirling for Medical Screws]]
- [[camworks-cam-tips-cw-166|Swiss-Type Simultaneous Operations — Overlapped Milling and Turning]]
