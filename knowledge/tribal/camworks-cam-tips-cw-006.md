---
id: "cw-006"
title: "Hole Pattern Recognition — Group Identical Holes for Batch Operations"
source: "web:camworks-docs"
confidence: 91
category: "cam_strategy"
tags: ["camworks", "afr", "holes", "pattern-recognition", "drilling"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.633Z
---

# Hole Pattern Recognition — Group Identical Holes for Batch Operations

AFR groups identical holes (same diameter, depth, and type) into patterns automatically. Verify pattern grouping in the feature tree — sometimes chamfered vs. non-chamfered holes get split into separate groups unnecessarily. Manually merge groups when the chamfer is handled by a separate countersink operation. Pattern recognition enables single-operation programming for dozens of identical holes, dramatically reducing toolpath count.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:camworks-docs
**Operations:** drilling

## Related
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[camworks-cam-tips-cw-002|Custom Feature Templates — Teach AFR to Recognize Shop-Specific Geometry]]
- [[camworks-cam-tips-cw-004|Multi-Axis Feature Recognition — Detect Features Across Index Angles]]
- [[camworks-cam-tips-cw-005|Turned Feature Recognition — Automatic Detection of Lathe Geometry]]
- [[camworks-cam-tips-cw-007|Pocket Recognition Depth Control — Verify Multi-Level Pocket Detection]]
