---
id: "cw-010"
title: "Groove Detection in Turning — Automatic Width and Depth Classification"
source: "web:camworks-docs"
confidence: 87
category: "cam_strategy"
tags: ["camworks", "afr", "grooves", "turning", "undercuts"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.637Z
---

# Groove Detection in Turning — Automatic Width and Depth Classification

For turning features, AFR automatically detects OD, ID, and face grooves, classifying them by width and depth ratio. Grooves wider than 3x tool width are treated as recesses requiring multiple passes, while narrow grooves use single-plunge cycles. Verify groove detection on parts with undercuts — AFR may merge an undercut with an adjacent groove, producing an incorrect feature boundary.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:camworks-docs
**Operations:** turning, grooving

## Related
- [[camworks-cam-tips-cw-005|Turned Feature Recognition — Automatic Detection of Lathe Geometry]]
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[camworks-cam-tips-cw-002|Custom Feature Templates — Teach AFR to Recognize Shop-Specific Geometry]]
- [[camworks-cam-tips-cw-004|Multi-Axis Feature Recognition — Detect Features Across Index Angles]]
- [[camworks-cam-tips-cw-006|Hole Pattern Recognition — Group Identical Holes for Batch Operations]]
