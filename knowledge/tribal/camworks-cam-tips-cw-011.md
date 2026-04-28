---
id: "cw-011"
title: "Step Recognition — Detect Shoulder and Step Features for Face Milling"
source: "web:camworks-docs"
confidence: 85
category: "cam_strategy"
tags: ["camworks", "afr", "steps", "shoulders", "face-milling"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.638Z
---

# Step Recognition — Detect Shoulder and Step Features for Face Milling

AFR identifies step features (90-degree shoulders) as distinct machinable features. Steps are assigned face milling or shoulder milling operations depending on the step height-to-width ratio. For steps taller than 2x cutter diameter, CAMWorks generates multi-pass roughing automatically. Ensure the step top face is selected as the reference plane during IFR if AFR misses a shallow step (< 0.5mm) on a large part.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:camworks-docs
**Operations:** milling, face_milling

## Related
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[camworks-cam-tips-cw-002|Custom Feature Templates — Teach AFR to Recognize Shop-Specific Geometry]]
- [[camworks-cam-tips-cw-004|Multi-Axis Feature Recognition — Detect Features Across Index Angles]]
- [[camworks-cam-tips-cw-005|Turned Feature Recognition — Automatic Detection of Lathe Geometry]]
- [[camworks-cam-tips-cw-006|Hole Pattern Recognition — Group Identical Holes for Batch Operations]]
