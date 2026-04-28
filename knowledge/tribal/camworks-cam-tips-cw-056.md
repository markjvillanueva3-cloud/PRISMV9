---
id: "cw-056"
title: "Design Change Propagation — Handle Feature Addition and Removal"
source: "web:camworks-docs"
confidence: 88
category: "cam_strategy"
tags: ["camworks", "solidworks", "design-change", "afr", "propagation"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.674Z
---

# Design Change Propagation — Handle Feature Addition and Removal

When SOLIDWORKS features are added or removed, re-run AFR to detect new features or remove orphaned ones. CAMWorks does not automatically add operations for new features — it preserves existing operations and flags geometry changes. After adding features to the design, run AFR incrementally (it will find new features without disturbing existing ones), then Generate Operation Plan for the new features only. Deleted design features cause orphaned CAM operations that must be manually cleaned up.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** milling

## Related
- [[camworks-cam-tips-cw-055|Associative Machining — Automatic Toolpath Update on Design Changes]]
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[camworks-cam-tips-cw-002|Custom Feature Templates — Teach AFR to Recognize Shop-Specific Geometry]]
- [[camworks-cam-tips-cw-004|Multi-Axis Feature Recognition — Detect Features Across Index Angles]]
- [[camworks-cam-tips-cw-005|Turned Feature Recognition — Automatic Detection of Lathe Geometry]]
