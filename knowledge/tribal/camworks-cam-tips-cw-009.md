---
id: "cw-009"
title: "Boss Recognition — Ensure Proper Stock Definition for Protruding Features"
source: "web:camworks-docs"
confidence: 85
category: "cam_strategy"
tags: ["camworks", "afr", "boss", "stock-definition"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.636Z
---

# Boss Recognition — Ensure Proper Stock Definition for Protruding Features

AFR identifies boss features (protruding cylinders, rectangles) that require peripheral milling. Correct boss recognition depends on proper stock definition — if the stock model is not correctly specified, AFR may treat a boss as a pocket or vice versa. Always define the stock shape (rectangular, cylindrical, or STL) before running AFR to ensure feature classification matches the actual machining scenario.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:camworks-docs
**Operations:** milling, contouring

## Related
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[camworks-cam-tips-cw-002|Custom Feature Templates — Teach AFR to Recognize Shop-Specific Geometry]]
- [[camworks-cam-tips-cw-004|Multi-Axis Feature Recognition — Detect Features Across Index Angles]]
- [[camworks-cam-tips-cw-005|Turned Feature Recognition — Automatic Detection of Lathe Geometry]]
- [[camworks-cam-tips-cw-006|Hole Pattern Recognition — Group Identical Holes for Batch Operations]]
