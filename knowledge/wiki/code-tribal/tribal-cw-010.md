---
name: tribal-cw-010
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "afr", "grooves", "turning", "undercuts"]
confidence: 87
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-010.md
promoted_at: 2026-06-09T22:31:15.989Z
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
