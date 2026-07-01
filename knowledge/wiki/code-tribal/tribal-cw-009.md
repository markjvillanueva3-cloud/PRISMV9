---
name: tribal-cw-009
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "afr", "boss", "stock-definition"]
confidence: 85
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-009.md
promoted_at: 2026-06-09T22:31:15.989Z
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
