---
id: "cw-007"
title: "Pocket Recognition Depth Control — Verify Multi-Level Pocket Detection"
source: "web:camworks-docs"
confidence: 87
category: "cam_strategy"
tags: ["camworks", "afr", "pockets", "multi-level", "depth"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.634Z
---

# Pocket Recognition Depth Control — Verify Multi-Level Pocket Detection

AFR detects open and closed pockets including multi-level pockets with islands. However, for pockets with more than 3 depth levels, verify that each level was captured as a separate feature or as sub-features. Complex multi-level pockets may need IFR correction — select each level floor face individually to ensure the roughing operation respects all intermediate levels rather than plunging to final depth.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:camworks-docs
**Operations:** 2d_pocket, roughing

## Related
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[camworks-cam-tips-cw-002|Custom Feature Templates — Teach AFR to Recognize Shop-Specific Geometry]]
- [[camworks-cam-tips-cw-004|Multi-Axis Feature Recognition — Detect Features Across Index Angles]]
- [[camworks-cam-tips-cw-005|Turned Feature Recognition — Automatic Detection of Lathe Geometry]]
- [[camworks-cam-tips-cw-006|Hole Pattern Recognition — Group Identical Holes for Batch Operations]]
